/**
 * Rising Edge Technologies — Auth Controller
 *
 * Handles: register, login, refresh, logout, verifyEmail,
 *          forgotPassword, resetPassword, changePassword, MFA
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy'); // for TOTP MFA
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const redis = require('../config/redis');
const emailService = require('../services/email.service');

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Token helpers ──────────────────────────────────────────

function generateAccessToken(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TTL_MS,
    path: '/api/auth', // scope cookie to auth routes only
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
}

// ── REGISTER ────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        emailVerifyToken,
        emailVerifyExpiry,
        role: 'USER',
        status: 'PENDING_VERIFICATION',
        subscription: {
          create: {
            plan: 'BASIC',
            status: 'ACTIVE',
            // BASIC plan never expires
          },
        },
      },
    });

    await emailService.sendVerification({ email, fullName, token: emailVerifyToken });

    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
};

// ── LOGIN ────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket?.remoteAddress;
    const ua = req.headers['user-agent'] || '';

    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    // Prevent timing attacks — hash compare even if user not found
    const hashToCompare = user?.passwordHash || '$2b$12$invalid.hash.to.prevent.timing';
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      if (user) {
        const newAttempts = (user.failedLoginAttempts || 0) + 1;
        const lockUntil =
          newAttempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000) // lock 15 min after 5 failures
            : null;

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts, lockedUntil: lockUntil },
        });

        await prisma.loginHistory.create({
          data: { userId: user.id, ipAddress: ip, userAgent: ua, success: false },
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Account lock check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Please contact support.',
      });
    }

    // MFA check (if enabled, require second factor before issuing tokens)
    if (user.mfaEnabled) {
      const mfaSessionToken = crypto.randomBytes(32).toString('hex');
      await redis.setEx(`mfa_session:${mfaSessionToken}`, 300, user.id); // 5 min window
      return res.status(200).json({
        success: true,
        requireMFA: true,
        mfaSessionToken,
      });
    }

    // Issue tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress: ip,
        deviceInfo: ua,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    // Reset failed attempts, update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, ipAddress: ip, userAgent: ua, success: true },
    });

    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        plan: user.subscription?.plan || 'BASIC',
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
};

// ── REFRESH TOKEN ────────────────────────────────────────────

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, error: 'No refresh token provided.' });
    }

    // Redis blacklist check — detects refresh token replay attacks
    const isBlacklisted = await redis.get(`bl_rt:${token}`);
    if (isBlacklisted) {
      // Potential token theft — revoke ALL tokens for the user
      const compromised = await prisma.refreshToken.findUnique({ where: { token } });
      if (compromised) {
        await prisma.refreshToken.deleteMany({ where: { userId: compromised.userId } });
        console.warn('[SECURITY] Refresh token replay detected for user', compromised.userId);
      }
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Security alert: please log in again.',
        code: 'TOKEN_REPLAY',
      });
    }

    const record = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { subscription: true } } },
    });

    if (!record || record.expiresAt < new Date()) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
        code: 'SESSION_EXPIRED',
      });
    }

    const { user } = record;

    if (user.status !== 'ACTIVE') {
      clearRefreshCookie(res);
      return res.status(403).json({ success: false, error: 'Account is no longer active.' });
    }

    // Rotate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken();

    await prisma.refreshToken.delete({ where: { token } });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'] || '',
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    // Blacklist old refresh token for 7 days
    await redis.setEx(`bl_rt:${token}`, REFRESH_TTL_SEC, '1');

    setRefreshCookie(res, newRefreshToken);

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        plan: user.subscription?.plan || 'BASIC',
      },
    });
  } catch (err) {
    console.error('[refresh]', err);
    res.status(500).json({ success: false, error: 'Could not refresh session.' });
  }
};

// ── LOGOUT ────────────────────────────────────────────────────

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
      await redis.setEx(`bl_rt:${token}`, REFRESH_TTL_SEC, '1');
    }
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[logout]', err);
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
};

// ── VERIFY EMAIL ──────────────────────────────────────────────

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Verification link is invalid or has expired.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    res.json({ success: true, message: 'Email verified. You can now log in.' });
  } catch (err) {
    console.error('[verifyEmail]', err);
    res.status(500).json({ success: false, error: 'Verification failed.' });
  }
};

// ── RESEND VERIFICATION ────────────────────────────────────────

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerified) {
      // Silent 200 — don't reveal existence
      return res.json({
        success: true,
        message: 'If your email is registered, a new link has been sent.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: token, emailVerifyExpiry: expiry },
    });

    await emailService.sendVerification({ email, fullName: user.fullName, token });

    res.json({ success: true, message: 'If your email is registered, a new link has been sent.' });
  } catch (err) {
    console.error('[resendVerification]', err);
    res.status(500).json({ success: false, error: 'Could not resend verification.' });
  }
};

// ── FORGOT PASSWORD ────────────────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 — prevent email enumeration
    const responseMsg = 'If that email is registered, a reset link has been sent.';

    if (!user) {
      return res.json({ success: true, message: responseMsg });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    await emailService.sendPasswordReset({ email, fullName: user.fullName, token });

    res.json({ success: true, message: responseMsg });
  } catch (err) {
    console.error('[forgotPassword]', err);
    res.status(500).json({ success: false, error: 'Request failed.' });
  }
};

// ── RESET PASSWORD ─────────────────────────────────────────────

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Password reset link is invalid or has expired.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    // Force re-login on all devices
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    console.error('[resetPassword]', err);
    res.status(500).json({ success: false, error: 'Password reset failed.' });
  }
};

// ── CHANGE PASSWORD (authenticated) ──────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[changePassword]', err);
    res.status(500).json({ success: false, error: 'Password change failed.' });
  }
};

// ── MFA — ENABLE ────────────────────────────────────────────────

exports.enableMFA = async (req, res) => {
  try {
    const user = req.user;
    if (user.mfaEnabled) {
      return res.status(400).json({ success: false, error: 'MFA is already enabled.' });
    }

    const secret = speakeasy.generateSecret({
      name: `Rising Edge (${user.email})`,
      issuer: 'Rising Edge Technologies',
    });

    // Store pending secret (not enabled yet — user must verify first)
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret.base32 },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scan the QR code in your authenticator app, then verify with /auth/mfa/verify',
    });
  } catch (err) {
    console.error('[enableMFA]', err);
    res.status(500).json({ success: false, error: 'Failed to set up MFA.' });
  }
};

// ── MFA — VERIFY ────────────────────────────────────────────────

exports.verifyMFA = async (req, res) => {
  try {
    const { code, mfaSessionToken } = req.body;
    const user = req.user;

    if (!user.mfaSecret) {
      return res.status(400).json({ success: false, error: 'MFA not set up.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1, // allow 30s drift
    });

    if (!verified) {
      return res.status(401).json({ success: false, error: 'Invalid MFA code.' });
    }

    // If this is a login-time MFA verification (mfaSessionToken present)
    if (mfaSessionToken) {
      const userId = await redis.get(`mfa_session:${mfaSessionToken}`);
      if (!userId || userId !== user.id) {
        return res.status(401).json({ success: false, error: 'MFA session expired.' });
      }
      await redis.del(`mfa_session:${mfaSessionToken}`);

      const accessToken = generateAccessToken(user.id, user.role);
      const refreshToken = generateRefreshToken();

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      });

      setRefreshCookie(res, refreshToken);
      return res.json({ success: true, accessToken });
    }

    // Otherwise this is an enable-MFA confirmation
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    res.json({ success: true, message: 'MFA enabled successfully.' });
  } catch (err) {
    console.error('[verifyMFA]', err);
    res.status(500).json({ success: false, error: 'MFA verification failed.' });
  }
};

// ── MFA — DISABLE ────────────────────────────────────────────────

exports.disableMFA = async (req, res) => {
  try {
    const { password } = req.body;
    const user = req.user;

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Password incorrect.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    res.json({ success: true, message: 'MFA disabled.' });
  } catch (err) {
    console.error('[disableMFA]', err);
    res.status(500).json({ success: false, error: 'Failed to disable MFA.' });
  }
};
