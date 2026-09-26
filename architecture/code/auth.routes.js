/**
 * Rising Edge Technologies — Auth Routes
 * All authentication endpoints with validation + rate limiting
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authCtrl = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// ── Rate Limiters ──────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, error: 'Too many registration attempts. Try again later.' },
});

const forgotPwdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Too many reset requests. Try again in 1 hour.' },
});

// ── Validation Middleware Helper ───────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Validators ─────────────────────────────────────────────
const registerRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2–100 characters'),
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character'),
];

const loginRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

const forgotPwdRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email required').normalizeEmail(),
];

const resetPwdRules = [
  body('token').trim().notEmpty().withMessage('Reset token required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Must contain uppercase')
    .matches(/[0-9]/)
    .withMessage('Must contain a number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Must contain a special character'),
];

const changePwdRules = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Must contain uppercase')
    .matches(/[0-9]/)
    .withMessage('Must contain a number'),
];

// ── Routes ─────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerLimiter, registerRules, validate, authCtrl.register);

// POST /api/auth/login
router.post('/login', loginLimiter, loginRules, validate, authCtrl.login);

// POST /api/auth/refresh  — uses httpOnly cookie
router.post('/refresh', authCtrl.refresh);

// POST /api/auth/logout
router.post('/logout', verifyToken, authCtrl.logout);

// POST /api/auth/verify-email
router.post(
  '/verify-email',
  body('token').trim().notEmpty().withMessage('Verification token required'),
  validate,
  authCtrl.verifyEmail
);

// POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  body('email').trim().isEmail().normalizeEmail(),
  validate,
  authCtrl.resendVerification
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  forgotPwdLimiter,
  forgotPwdRules,
  validate,
  authCtrl.forgotPassword
);

// POST /api/auth/reset-password
router.post('/reset-password', resetPwdRules, validate, authCtrl.resetPassword);

// POST /api/auth/change-password  — requires auth
router.post('/change-password', verifyToken, changePwdRules, validate, authCtrl.changePassword);

// POST /api/auth/mfa/enable
router.post('/mfa/enable', verifyToken, authCtrl.enableMFA);

// POST /api/auth/mfa/verify
router.post(
  '/mfa/verify',
  verifyToken,
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code required'),
  validate,
  authCtrl.verifyMFA
);

// POST /api/auth/mfa/disable
router.post('/mfa/disable', verifyToken, authCtrl.disableMFA);

module.exports = router;
