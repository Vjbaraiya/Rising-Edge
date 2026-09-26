'use strict';
/**
 * Subscription API tests:
 *   GET  /api/subscription/status
 *   POST /api/cashfree/create-order   (with and without coupon)
 *   Admin: GET /api/admin/users       (plan comes from DB, not hardcoded)
 */
jest.mock('pg');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { mockQuery } = require('pg');
const {
  fakeUser,
  fakePlan,
  fakeCoupon,
  fakeToolSubscription,
  mockInitDB,
} = require('../helpers/mockDb');

let app;

function makeToken(role = 'USER', userId = 'usr-001') {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

beforeAll(async () => {
  mockInitDB(mockQuery);
  ({ app } = require('../../server'));
});

afterEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

function authUser(override = {}) {
  mockQuery.mockResolvedValueOnce({ rows: [fakeUser(override)] });
}

// ── GET /api/subscription/status ───────────────────────────────────────────
describe('GET /api/subscription/status', () => {
  test('200 — active subscription returns plan details', async () => {
    authUser();
    const sub = fakeToolSubscription({ plan_id: 'advanced' });
    mockQuery.mockResolvedValueOnce({ rows: [sub] }); // tool_subscriptions
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Advanced' }] }); // subscription_plans

    const res = await request(app)
      .get('/api/subscription/status')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subscription.planId).toBe('advanced');
    expect(res.body.subscription.planName).toBe('Advanced');
    expect(res.body.subscription).toHaveProperty('expiryDate');
  });

  test('200 — no subscription returns basic defaults', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no active tool_subscription

    const res = await request(app)
      .get('/api/subscription/status')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription.planId).toBe('basic');
    expect(res.body.subscription.planName).toBe('Basic');
  });

  test('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/subscription/status');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/cashfree/create-order ───────────────────────────────────────
describe('POST /api/cashfree/create-order', () => {
  const validBody = { planId: 'advanced', billingCycle: 'monthly', amount: 299 };

  test('400 — basic plan is free, rejected', async () => {
    authUser();
    const res = await request(app)
      .post('/api/cashfree/create-order')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ planId: 'basic', billingCycle: 'monthly', amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/basic plan is free/i);
  });

  test('400 — invalid billing cycle', async () => {
    authUser();
    const res = await request(app)
      .post('/api/cashfree/create-order')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ planId: 'advanced', billingCycle: 'weekly', amount: 299 });

    expect(res.status).toBe(400);
  });

  test('400 — plan not found in DB', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // plan lookup fails

    const res = await request(app)
      .post('/api/cashfree/create-order')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid plan/i);
  });

  test('400 — amount mismatch (tampered price)', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakePlan({ price_monthly: 299 })] });

    const res = await request(app)
      .post('/api/cashfree/create-order')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ planId: 'advanced', billingCycle: 'monthly', amount: 1 }); // tampered

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount mismatch/i);
  });

  test('400 — coupon not found when couponCode supplied', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakePlan({ price_monthly: 299 })] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // coupon lookup fails

    const res = await request(app)
      .post('/api/cashfree/create-order')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...validBody, couponCode: 'GHOST99' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or inactive coupon/i);
  });

  test('400 — coupon wrong context (tools coupon on subscription)', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakePlan({ price_monthly: 299 })] });
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ applies_to: 'tools' })] });

    const res = await request(app)
      .post('/api/cashfree/create-order')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...validBody, couponCode: 'TOOL20' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not valid for subscriptions/i);
  });

  test('503 — Cashfree credentials not configured', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakePlan({ price_monthly: 299 })] });
    mockQuery.mockResolvedValueOnce({
      rows: [{ full_name: 'Test', email: 't@t.com', mobile: null }],
    }); // user lookup
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT tool_payments

    // No CASHFREE_APP_ID / SECRET set → 503
    const saved = process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_APP_ID;

    const res = await request(app)
      .post('/api/cashfree/create-order')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validBody);

    process.env.CASHFREE_APP_ID = saved; // restore
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/credentials not configured/i);
  });
});

// ── Plan shown in login response ───────────────────────────────────────────
describe('Login response includes real plan (regression)', () => {
  const bcrypt = require('bcrypt');

  test('advanced user — login returns plan: advanced, not basic', async () => {
    const hash = await bcrypt.hash('Test1234!', 4);
    const user = fakeUser({ password_hash: hash, plan: 'advanced' });

    mockQuery
      .mockResolvedValueOnce({ rows: [user] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test1234!' });

    expect(res.status).toBe(200);
    expect(res.body.user.plan).toBe('advanced'); // must NOT be 'basic'
  });
});

// ── Admin users endpoint — plan from DB ────────────────────────────────────
describe('GET /api/admin/users', () => {
  test('200 — returns user list with correct plan', async () => {
    // verifyAccessToken
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    // admin users query
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'usr-001',
          full_name: 'Vijay',
          email: 'v@t.com',
          role: 'USER',
          status: 'ACTIVE',
          plan: 'advanced',
          sub_status: 'ACTIVE',
          created_at: new Date(),
        },
      ],
    });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].plan).toBe('advanced');
  });
});
