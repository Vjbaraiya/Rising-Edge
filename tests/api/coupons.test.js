'use strict';
/**
 * Coupon API tests:
 *   POST /api/coupons/validate
 *   GET  /api/admin/coupons
 *   POST /api/admin/coupons
 *   PATCH /api/admin/coupons/:id
 *   DELETE /api/admin/coupons/:id
 */
jest.mock('pg');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { mockQuery } = require('pg');
const { fakeUser, fakeCoupon, mockInitDB } = require('../helpers/mockDb');

let app;

function makeToken(role = 'USER', userId = 'usr-001') {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function makeAdminToken() {
  return makeToken('ADMIN');
}

beforeAll(async () => {
  mockInitDB(mockQuery);
  ({ app } = require('../../server'));
});

afterEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── Authenticate middleware helper ─────────────────────────────────────────
function authUser(override = {}) {
  // verifyAccessToken calls db.query once to validate the token
  mockQuery.mockResolvedValueOnce({ rows: [fakeUser(override)] });
}

// ── POST /api/coupons/validate ─────────────────────────────────────────────
describe('POST /api/coupons/validate', () => {
  test('200 — valid percent coupon returns discount', async () => {
    authUser();
    // SELECT coupon
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ type: 'percent', val: 20 })] });
    // SELECT coupon_usage count (per-user)
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'SAVE20', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.discount).toBeCloseTo(59.8, 1);
    expect(res.body.discountedAmount).toBeCloseTo(239.2, 1);
  });

  test('200 — valid flat coupon returns correct discount', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({
      rows: [fakeCoupon({ type: 'flat', val: 100, applies_to: 'subscriptions' })],
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'FLAT100', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.discount).toBe(100);
    expect(res.body.discountedAmount).toBe(199);
  });

  test('200:false — coupon not found', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no coupon found

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'GHOST99', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid coupon/i);
  });

  test('200:false — inactive coupon', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ active: false })] });

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'INACTIVE', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/no longer active/i);
  });

  test('200:false — expired coupon', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ expires: '2020-01-01' })] });

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'OLD50', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/expired/i);
  });

  test('200:false — usage limit reached globally', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ used: 100, limit_count: 100 })] });

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'FULL99', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/usage limit/i);
  });

  test('200:false — wrong context (tools coupon on subscription)', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ applies_to: 'tools' })] });
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'TOOL20', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/tools/i);
  });

  test('200:false — per-user limit exceeded', async () => {
    authUser();
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ per_user_limit: 1 })] });
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '1' }] }); // already used once

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ code: 'ONETIME', context: 'subscription', contextId: 'advanced', amount: 299 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/maximum number of times/i);
  });

  test('400 — missing coupon code', async () => {
    authUser();
    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ context: 'subscription', amount: 299 });

    expect(res.status).toBe(400);
  });

  test('401 — unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'TEST', context: 'subscription', amount: 299 });

    expect(res.status).toBe(401);
  });
});

// ── Admin coupon CRUD ──────────────────────────────────────────────────────
describe('POST /api/admin/coupons', () => {
  function authAdmin() {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
  }

  test('201 — admin creates coupon with applies_to and per_user_limit', async () => {
    authAdmin();
    mockQuery.mockResolvedValueOnce({
      rows: [fakeCoupon({ applies_to: 'subscriptions', per_user_limit: 2 })],
    });

    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({
        code: 'NEWSUB30',
        type: 'percent',
        val: 30,
        limit_count: 50,
        per_user_limit: 2,
        expires: '2027-12-31',
        applies_to: 'subscriptions',
        applicable_ids: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applies_to).toBe('subscriptions');
    expect(res.body.data.per_user_limit).toBe(2);
  });

  test('400 — missing required fields', async () => {
    authAdmin();
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ type: 'percent' }); // no code, no val

    expect(res.status).toBe(400);
  });

  test('403 — non-admin cannot create coupons', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'USER' })] });

    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${makeToken('USER')}`)
      .send({ code: 'HACK', type: 'percent', val: 100 });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/admin/coupons/:id', () => {
  test('200 — deactivates a coupon', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    mockQuery.mockResolvedValueOnce({ rows: [fakeCoupon({ active: false })], rowCount: 1 });

    const res = await request(app)
      .patch('/api/admin/coupons/cpn-001')
      .set('Authorization', `Bearer ${makeAdminToken()}`)
      .send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body.data.active).toBe(false);
  });
});

describe('DELETE /api/admin/coupons/:id', () => {
  test('200 — deletes coupon', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .delete('/api/admin/coupons/cpn-001')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('404 — coupon not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .delete('/api/admin/coupons/nonexistent')
      .set('Authorization', `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(404);
  });
});
