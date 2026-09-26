'use strict';
/**
 * Helpers for configuring the pg mock within API tests.
 * Import AFTER jest.mock('pg') has been called.
 */

/**
 * Returns the pg mock's query function so tests can configure responses.
 * Usage:
 *   const { mockQuery } = require('../helpers/mockDb');
 *   mockQuery.mockResolvedValueOnce({ rows: [...], rowCount: 1 });
 */
function getMockQuery() {
  // eslint-disable-next-line node/no-missing-require
  const { mockQuery } = require('pg');
  return mockQuery;
}

/**
 * Reset the mock query to the default (empty result) between tests.
 */
function resetMockDb() {
  const { mockQuery } = require('pg');
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
}

/**
 * Configure the mock to handle the sequence of queries that initDB() issues.
 * Call this in beforeAll() for each API test file.
 */
function mockInitDB(mockQuery) {
  // initDB issues many CREATE TABLE / ALTER TABLE / INSERT queries.
  // All can safely return empty results.
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
}

/**
 * Build a fake user row matching what server.js expects from the DB.
 */
function fakeUser(overrides = {}) {
  return {
    id: 'usr-001',
    full_name: 'Test User',
    email: 'test@example.com',
    password_hash: '$2b$12$fakehashedpassword',
    role: 'USER',
    status: 'ACTIVE',
    email_verified: true,
    avatar_url: null,
    failed_login_attempts: 0,
    locked_until: null,
    mobile: null,
    plan: 'basic',
    sub_status: 'ACTIVE',
    ...overrides,
  };
}

/**
 * Build a fake subscription plan row.
 */
function fakePlan(overrides = {}) {
  return {
    id: 'advanced',
    name: 'Advanced',
    price_monthly: 299,
    price_yearly: 2999,
    mrp_monthly: 499,
    mrp_yearly: 4999,
    description: 'Advanced plan',
    features: JSON.stringify([]),
    max_courses: 5,
    badge_color: 'blue',
    is_popular: true,
    sort_order: 1,
    ...overrides,
  };
}

/**
 * Build a fake coupon row.
 */
function fakeCoupon(overrides = {}) {
  return {
    id: 'cpn-001',
    code: 'SAVE20',
    type: 'percent',
    val: 20,
    used: 0,
    limit_count: 100,
    per_user_limit: 1,
    expires: 'No expiry',
    active: true,
    applies_to: 'all',
    applicable_ids: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Build a fake tool_payment row.
 */
function fakePayment(overrides = {}) {
  return {
    id: 'pay-001',
    order_id: 'RE-1234567890-ABCDEF',
    user_id: 'usr-001',
    plan_id: 'advanced',
    billing_cycle: 'monthly',
    amount: 299,
    gst_amount: 53.82,
    discount_amount: 0,
    coupon_id: null,
    status: 'pending',
    payment_id: null,
    gateway: 'cashfree',
    invoice_number: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Build a fake tool_subscription row.
 */
function fakeToolSubscription(overrides = {}) {
  const start = new Date();
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + 1);
  return {
    id: 'sub-001',
    user_id: 'usr-001',
    plan_id: 'advanced',
    billing_cycle: 'monthly',
    status: 'active',
    start_date: start.toISOString(),
    expiry_date: expiry.toISOString(),
    auto_renew: true,
    remaining_credits: 200,
    credits_used: 0,
    transaction_id: 'txn-001',
    payment_id: 'cfpay-001',
    cashfree_order_id: 'RE-1234567890-ABCDEF',
    amount: 299,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

module.exports = {
  getMockQuery,
  resetMockDb,
  mockInitDB,
  fakeUser,
  fakePlan,
  fakeCoupon,
  fakePayment,
  fakeToolSubscription,
};
