'use strict';
/**
 * planUtils.js — pure, side-effect-free utility functions shared between
 * server.js and the test suite.  No DB, no HTTP, no globals.
 */

// ── Plan hierarchy ─────────────────────────────────────────────────────────
const PLAN_RANK = Object.freeze({ basic: 0, advanced: 1, premium: 2 });

/**
 * Returns the numeric rank of a plan ID (case-insensitive).
 * Unknown plans default to 0 (basic).
 */
function getPlanRank(planId) {
  return PLAN_RANK[(planId || 'basic').toLowerCase()] ?? 0;
}

/**
 * Returns true when userPlan meets or exceeds requiredPlan.
 */
function userCanAccess(requiredPlan, userPlan) {
  return getPlanRank(userPlan) >= getPlanRank(requiredPlan);
}

// ── Coupon helpers ─────────────────────────────────────────────────────────

/**
 * Returns true when the coupon's expiry date is in the past.
 * 'No expiry' / null / undefined → never expired.
 */
function isCouponExpired(expires) {
  if (!expires || expires === 'No expiry') return false;
  return new Date(expires) < new Date();
}

/**
 * Returns true when the coupon may be used in the given context.
 *
 * context   – 'subscription' | 'course' | 'tool'
 * contextId – the specific plan/course/tool ID being purchased
 */
function isCouponApplicable(coupon, context, contextId) {
  if (!coupon || !coupon.active) return false;
  if (coupon.applies_to === 'all') return true;

  const MAP = {
    subscription: 'subscriptions',
    subscriptions: 'subscriptions',
    course: 'courses',
    courses: 'courses',
    tool: 'tools',
    tools: 'tools',
  };
  const mapped = MAP[context] || context;
  if (coupon.applies_to !== mapped) return false;

  // If specific IDs are listed, contextId must be one of them
  if (coupon.applicable_ids && coupon.applicable_ids.length && contextId) {
    return coupon.applicable_ids.includes(String(contextId));
  }
  return true;
}

/**
 * Calculates the discount and discounted base amount for a coupon.
 * Returns { discount, discountedAmount } — both rounded to 2 dp.
 */
function applyCouponDiscount(baseAmount, coupon) {
  const base = parseFloat(baseAmount) || 0;
  if (!coupon) return { discount: 0, discountedAmount: base };

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round(base * (parseFloat(coupon.val) / 100) * 100) / 100;
  } else {
    // flat / fixed
    discount = Math.min(parseFloat(coupon.val) || 0, base);
  }
  const discountedAmount = Math.max(0, Math.round((base - discount) * 100) / 100);
  return { discount, discountedAmount };
}

// ── GST helper ─────────────────────────────────────────────────────────────

/** India GST @ 18 %, rounded to 2 dp. */
function calculateGST(amount) {
  return Math.round(parseFloat(amount) * 0.18 * 100) / 100;
}

// ── Expiry date ────────────────────────────────────────────────────────────

/**
 * Returns a Date object that is billingCycle ('monthly' | 'yearly') from start.
 */
function addBillingPeriod(start, billingCycle) {
  const d = new Date(start);
  if (billingCycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

module.exports = {
  PLAN_RANK,
  getPlanRank,
  userCanAccess,
  isCouponExpired,
  isCouponApplicable,
  applyCouponDiscount,
  calculateGST,
  addBillingPeriod,
};
