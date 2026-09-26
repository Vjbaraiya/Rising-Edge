'use strict';
const {
  PLAN_RANK,
  getPlanRank,
  userCanAccess,
  isCouponExpired,
  isCouponApplicable,
  applyCouponDiscount,
  calculateGST,
  addBillingPeriod,
} = require('../../lib/planUtils');

// ── PLAN_RANK ──────────────────────────────────────────────────────────────
describe('PLAN_RANK', () => {
  test('is frozen (immutable)', () => {
    expect(Object.isFrozen(PLAN_RANK)).toBe(true);
  });
  test('has correct rank values', () => {
    expect(PLAN_RANK.basic).toBe(0);
    expect(PLAN_RANK.advanced).toBe(1);
    expect(PLAN_RANK.premium).toBe(2);
  });
});

// ── getPlanRank ────────────────────────────────────────────────────────────
describe('getPlanRank()', () => {
  test.each([
    ['basic', 0],
    ['BASIC', 0],
    ['Basic', 0],
    ['advanced', 1],
    ['ADVANCED', 1],
    ['premium', 2],
    ['PREMIUM', 2],
    [null, 0],
    [undefined, 0],
    ['unknown', 0],
    ['', 0],
  ])('getPlanRank(%s) === %i', (input, expected) => {
    expect(getPlanRank(input)).toBe(expected);
  });
});

// ── userCanAccess ──────────────────────────────────────────────────────────
describe('userCanAccess(requiredPlan, userPlan)', () => {
  describe('basic user', () => {
    test('can access basic tools', () => expect(userCanAccess('basic', 'basic')).toBe(true));
    test('cannot access advanced tools', () =>
      expect(userCanAccess('advanced', 'basic')).toBe(false));
    test('cannot access premium tools', () =>
      expect(userCanAccess('premium', 'basic')).toBe(false));
  });

  describe('advanced user', () => {
    test('can access basic tools', () => expect(userCanAccess('basic', 'advanced')).toBe(true));
    test('can access advanced tools', () =>
      expect(userCanAccess('advanced', 'advanced')).toBe(true));
    test('cannot access premium tools', () =>
      expect(userCanAccess('premium', 'advanced')).toBe(false));
  });

  describe('premium user', () => {
    test('can access basic tools', () => expect(userCanAccess('basic', 'premium')).toBe(true));
    test('can access advanced tools', () =>
      expect(userCanAccess('advanced', 'premium')).toBe(true));
    test('can access premium tools', () => expect(userCanAccess('premium', 'premium')).toBe(true));
  });

  describe('edge cases', () => {
    test('null user plan defaults to basic', () => expect(userCanAccess('basic', null)).toBe(true));
    test('null required plan defaults to basic', () =>
      expect(userCanAccess(null, 'basic')).toBe(true));
    test('unknown plans treated as basic', () =>
      expect(userCanAccess('enterprise', 'pro')).toBe(true));
  });
});

// ── isCouponExpired ────────────────────────────────────────────────────────
describe('isCouponExpired(expires)', () => {
  test('never expired for null', () => expect(isCouponExpired(null)).toBe(false));
  test('never expired for undefined', () => expect(isCouponExpired(undefined)).toBe(false));
  test('never expired for "No expiry"', () => expect(isCouponExpired('No expiry')).toBe(false));

  test('expired for past date', () => {
    expect(isCouponExpired('2020-01-01')).toBe(true);
  });

  test('not expired for future date', () => {
    const future = new Date(Date.now() + 86400 * 1000).toISOString();
    expect(isCouponExpired(future)).toBe(false);
  });
});

// ── isCouponApplicable ─────────────────────────────────────────────────────
describe('isCouponApplicable(coupon, context, contextId)', () => {
  const activeCoupon = (overrides = {}) => ({
    active: true,
    applies_to: 'all',
    applicable_ids: null,
    ...overrides,
  });

  test('returns false for inactive coupon', () => {
    expect(isCouponApplicable({ active: false, applies_to: 'all' }, 'subscription', null)).toBe(
      false
    );
  });

  test('returns false for null coupon', () => {
    expect(isCouponApplicable(null, 'subscription', null)).toBe(false);
  });

  test('"all" applies to subscription context', () => {
    expect(
      isCouponApplicable(activeCoupon({ applies_to: 'all' }), 'subscription', 'advanced')
    ).toBe(true);
  });

  test('"all" applies to course context', () => {
    expect(isCouponApplicable(activeCoupon({ applies_to: 'all' }), 'course', 'course-1')).toBe(
      true
    );
  });

  test('"subscriptions" applies to subscription context', () => {
    expect(
      isCouponApplicable(activeCoupon({ applies_to: 'subscriptions' }), 'subscription', 'advanced')
    ).toBe(true);
  });

  test('"subscriptions" does NOT apply to course context', () => {
    expect(isCouponApplicable(activeCoupon({ applies_to: 'subscriptions' }), 'course', 'c1')).toBe(
      false
    );
  });

  test('"courses" does NOT apply to tool context', () => {
    expect(isCouponApplicable(activeCoupon({ applies_to: 'courses' }), 'tool', 't1')).toBe(false);
  });

  test('"tools" with specific IDs — matching', () => {
    const c = activeCoupon({
      applies_to: 'tools',
      applicable_ids: ['pdn-optimizer', 'si-analyzer'],
    });
    expect(isCouponApplicable(c, 'tool', 'pdn-optimizer')).toBe(true);
  });

  test('"tools" with specific IDs — non-matching', () => {
    const c = activeCoupon({ applies_to: 'tools', applicable_ids: ['pdn-optimizer'] });
    expect(isCouponApplicable(c, 'tool', 'esd-tool')).toBe(false);
  });

  test('"courses" with empty applicable_ids allows any course', () => {
    const c = activeCoupon({ applies_to: 'courses', applicable_ids: [] });
    expect(isCouponApplicable(c, 'course', 'any-course')).toBe(true);
  });

  // Context alias normalisation
  test.each([
    ['subscription', 'subscriptions'],
    ['subscriptions', 'subscriptions'],
    ['course', 'courses'],
    ['courses', 'courses'],
    ['tool', 'tools'],
    ['tools', 'tools'],
  ])('context alias "%s" maps to "%s"', (ctx, appliesTo) => {
    const c = activeCoupon({ applies_to: appliesTo });
    expect(isCouponApplicable(c, ctx, null)).toBe(true);
  });
});

// ── applyCouponDiscount ────────────────────────────────────────────────────
describe('applyCouponDiscount(baseAmount, coupon)', () => {
  test('no coupon → discount is 0, discountedAmount equals base', () => {
    expect(applyCouponDiscount(1000, null)).toEqual({ discount: 0, discountedAmount: 1000 });
  });

  test('percent coupon — 20% off ₹1000', () => {
    const c = { type: 'percent', val: 20 };
    expect(applyCouponDiscount(1000, c)).toEqual({ discount: 200, discountedAmount: 800 });
  });

  test('percent coupon — 100% off (free)', () => {
    const c = { type: 'percent', val: 100 };
    expect(applyCouponDiscount(500, c)).toEqual({ discount: 500, discountedAmount: 0 });
  });

  test('flat coupon — ₹100 off ₹299', () => {
    const c = { type: 'flat', val: 100 };
    expect(applyCouponDiscount(299, c)).toEqual({ discount: 100, discountedAmount: 199 });
  });

  test('flat coupon — discount capped at base (no negative total)', () => {
    const c = { type: 'flat', val: 9999 };
    expect(applyCouponDiscount(299, c)).toEqual({ discount: 299, discountedAmount: 0 });
  });

  test('rounding — 33.33% of ₹300 = ₹99.99 discount', () => {
    const c = { type: 'percent', val: 33.33 };
    const result = applyCouponDiscount(300, c);
    expect(result.discount).toBeCloseTo(99.99, 1);
    expect(result.discountedAmount).toBeCloseTo(200.01, 1);
  });

  test('zero base always returns discount 0', () => {
    expect(applyCouponDiscount(0, { type: 'percent', val: 50 })).toEqual({
      discount: 0,
      discountedAmount: 0,
    });
  });
});

// ── calculateGST ──────────────────────────────────────────────────────────
describe('calculateGST(amount)', () => {
  test.each([
    [100, 18],
    [299, 53.82],
    [999, 179.82],
    [2999, 539.82],
    [0, 0],
  ])('18%% GST on ₹%i = ₹%f', (amount, expected) => {
    expect(calculateGST(amount)).toBeCloseTo(expected, 2);
  });
});

// ── addBillingPeriod ───────────────────────────────────────────────────────
describe('addBillingPeriod(start, billingCycle)', () => {
  const base = new Date('2025-01-15T00:00:00.000Z');

  test('monthly adds 1 month', () => {
    const result = addBillingPeriod(base, 'monthly');
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCFullYear()).toBe(2025);
  });

  test('yearly adds 1 year', () => {
    const result = addBillingPeriod(base, 'yearly');
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0); // January
  });

  test('does not mutate the original date', () => {
    const original = new Date('2025-06-01T00:00:00.000Z');
    addBillingPeriod(original, 'monthly');
    expect(original.getUTCMonth()).toBe(5); // June, unchanged
  });
});
