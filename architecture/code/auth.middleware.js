/**
 * Rising Edge Technologies — Auth Middleware Suite
 *
 * verifyToken       — validates JWT, attaches req.user
 * requireRole       — RBAC: requireRole('ADMIN', 'SUPER_ADMIN')
 * requireSubscription — plan gating: requireSubscription('PREMIUM')
 * requireEnrollment — course content guard
 * auditLog          — writes action to audit_logs table
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const redis = require('../config/redis');

const prisma = new PrismaClient();

// Subscription hierarchy — higher number = more access
const PLAN_LEVEL = { BASIC: 1, ADVANCED: 2, PREMIUM: 3 };

/* ════════════════════════════════════════════════════════
   verifyToken
   Validates the access token from Authorization header OR
   httpOnly cookie. Loads user + subscription from DB.
════════════════════════════════════════════════════════ */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token =
      req.cookies?.accessToken ||
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN',
      });
    }

    // Reject tokens that were explicitly blacklisted (logged-out)
    const isBlacklisted = await redis.get(`bl:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
    }

    // Verify signature and expiry
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Access token expired',
          code: 'TOKEN_EXPIRED', // client intercepts and calls /auth/refresh
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Load fresh user state (catches mid-session suspensions)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    switch (user.status) {
      case 'SUSPENDED':
        return res
          .status(403)
          .json({ success: false, error: 'Account suspended. Contact support.' });
      case 'PENDING_VERIFICATION':
        return res.status(403).json({ success: false, error: 'Please verify your email.' });
      case 'DEACTIVATED':
        return res.status(403).json({ success: false, error: 'Account deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[verifyToken]', err);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

/* ════════════════════════════════════════════════════════
   requireRole
   Checks req.user.role is in the allowed list.

   Usage:
     router.get('/admin', verifyToken, requireRole('ADMIN', 'SUPER_ADMIN'), handler)
     router.delete('/system', verifyToken, requireRole('SUPER_ADMIN'), handler)
════════════════════════════════════════════════════════ */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied — insufficient role',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
}

/* ════════════════════════════════════════════════════════
   requireSubscription
   Ensures user's subscription meets the minimum plan level.
   Supports plan hierarchy: PREMIUM satisfies ADVANCED & BASIC.

   Usage:
     requireSubscription('ADVANCED', 'PREMIUM')  // min level 2
     requireSubscription('PREMIUM')              // level 3 only
════════════════════════════════════════════════════════ */
function requireSubscription(...requiredPlans) {
  // Minimum numeric level required (lowest of the accepted plans)
  const minLevel = Math.min(...requiredPlans.map(p => PLAN_LEVEL[p] || 99));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Admins bypass subscription restrictions
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const sub = req.user.subscription;
    const plan = sub?.plan || 'BASIC';
    const status = sub?.status || 'ACTIVE';

    // Check subscription status
    if (status === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        error: 'Your subscription has expired. Please renew to continue.',
        code: 'SUBSCRIPTION_EXPIRED',
        currentPlan: plan,
      });
    }

    if (status === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        error: 'Your subscription has been cancelled.',
        code: 'SUBSCRIPTION_CANCELLED',
      });
    }

    // Check plan level
    if ((PLAN_LEVEL[plan] || 0) < minLevel) {
      return res.status(403).json({
        success: false,
        error: 'Upgrade your subscription to access this feature.',
        code: 'UPGRADE_REQUIRED',
        currentPlan: plan,
        requiredPlans,
        upgradeUrl: '/subscription',
      });
    }

    next();
  };
}

/* ════════════════════════════════════════════════════════
   requireEnrollment
   Verifies the user is enrolled in the training specified
   by req.params.trainingId or req.params.id.
   Attaches req.enrollment for downstream handlers.
════════════════════════════════════════════════════════ */
async function requireEnrollment(req, res, next) {
  try {
    const trainingId = req.params.trainingId || req.params.id;
    const userId = req.user.id;

    if (!trainingId) {
      return res.status(400).json({ success: false, error: 'Training ID required' });
    }

    // Super admins and admins can access all content
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_trainingId: { userId, trainingId },
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'You are not enrolled in this training.',
        code: 'NOT_ENROLLED',
        enrollUrl: `/trainings/${trainingId}`,
      });
    }

    if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Your enrollment access has expired.',
        code: 'ENROLLMENT_EXPIRED',
      });
    }

    req.enrollment = enrollment;
    next();
  } catch (err) {
    next(err);
  }
}

/* ════════════════════════════════════════════════════════
   auditLog (factory)
   Middleware factory that logs admin/sensitive actions.

   Usage:
     router.delete('/users/:id',
       verifyToken,
       requireRole('SUPER_ADMIN'),
       auditLog('USER_DELETE', 'User'),
       handler
     )
════════════════════════════════════════════════════════ */
function auditLog(action, resource) {
  return async (req, res, next) => {
    // Capture original json() to intercept response
    const originalJson = res.json.bind(res);
    res.json = body => {
      // Only log successful mutations
      if (res.statusCode < 400) {
        const resourceId = req.params?.id || req.params?.userId || body?.data?.id;
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.id || null,
              action,
              resource: resource || null,
              resourceId: resourceId || null,
              newValues: req.body || null,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'] || null,
            },
          })
          .catch(err => console.error('[auditLog]', err));
      }
      return originalJson(body);
    };
    next();
  };
}

/* ════════════════════════════════════════════════════════
   optionalAuth
   Like verifyToken but doesn't fail if no token.
   Used for routes that show extra content to logged-in users.
════════════════════════════════════════════════════════ */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) return next();

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { subscription: true },
    });

    if (user && user.status === 'ACTIVE') {
      req.user = user;
    }
  } catch {
    // Silently ignore invalid token in optional auth
  }
  next();
}

module.exports = {
  verifyToken,
  requireRole,
  requireSubscription,
  requireEnrollment,
  auditLog,
  optionalAuth,
};
