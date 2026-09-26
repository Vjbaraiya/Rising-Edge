'use strict';
/**
 * Tools API tests:
 *   GET  /api/tools            — public listing
 *   POST /api/admin/tools      — admin create
 *   PUT  /api/admin/tools/:id  — admin update
 *   DELETE /api/admin/tools/:id — admin delete
 */
jest.mock('pg');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { mockQuery } = require('pg');
const { fakeUser, mockInitDB } = require('../helpers/mockDb');

let app;

function makeToken(role = 'USER') {
  return jwt.sign({ userId: 'usr-001', role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function fakeTool(overrides = {}) {
  return {
    id: 'pdn-optimizer',
    title: 'PDN Optimizer',
    category: 'calculator',
    plan: 'advanced',
    description: 'Power delivery network optimizer',
    url: '/Tools/PDN-Optimizer/pdn-optimizer.html',
    status: 'active',
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeAll(async () => {
  mockInitDB(mockQuery);
  ({ app } = require('../../server'));
});

afterEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/tools ─────────────────────────────────────────────────────────
describe('GET /api/tools', () => {
  test('200 — returns tool list (public)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [fakeTool(), fakeTool({ id: 'esd', title: 'ESD Analyzer', plan: 'premium' })],
    });

    const res = await request(app).get('/api/tools');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty('plan');
  });

  test('200 — empty list when no tools configured', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/tools');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  test('tool rows include plan field for client-side gating', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeTool({ plan: 'advanced' })] });

    const res = await request(app).get('/api/tools');
    expect(res.body.data[0].plan).toBe('advanced');
  });
});

// ── POST /api/admin/tools ──────────────────────────────────────────────────
describe('POST /api/admin/tools', () => {
  function authAdmin() {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
  }

  test('201 — creates a new tool', async () => {
    authAdmin();
    const tool = fakeTool({ plan: 'premium' });
    mockQuery.mockResolvedValueOnce({ rows: [tool] });

    const res = await request(app)
      .post('/api/admin/tools')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({
        title: 'PDN Optimizer',
        category: 'calculator',
        plan: 'premium',
        url: '/Tools/PDN',
        status: 'active',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.plan).toBe('premium');
  });

  test('400 — missing title', async () => {
    authAdmin();
    const res = await request(app)
      .post('/api/admin/tools')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ category: 'calculator' });

    expect(res.status).toBe(400);
  });

  test('403 — non-admin cannot create tools', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'USER' })] });

    const res = await request(app)
      .post('/api/admin/tools')
      .set('Authorization', `Bearer ${makeToken('USER')}`)
      .send({ title: 'Hack Tool', category: 'calculator', plan: 'basic' });

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/admin/tools/:id ────────────────────────────────────────────
describe('PATCH /api/admin/tools/:id', () => {
  test('200 — updates tool plan to premium', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    mockQuery.mockResolvedValueOnce({ rows: [fakeTool({ plan: 'premium' })], rowCount: 1 });

    const res = await request(app)
      .patch('/api/admin/tools/pdn-optimizer')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({
        title: 'PDN Optimizer',
        category: 'calculator',
        plan: 'premium',
        url: '/Tools/PDN',
        status: 'active',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBe('premium');
  });

  test('404 — tool not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .patch('/api/admin/tools/nonexistent')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ title: 'X', category: 'calculator', plan: 'basic', url: '/', status: 'active' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/admin/tools/:id ───────────────────────────────────────────
describe('DELETE /api/admin/tools/:id', () => {
  test('200 — deletes tool', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .delete('/api/admin/tools/pdn-optimizer')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('404 — tool not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser({ role: 'ADMIN' })] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .delete('/api/admin/tools/ghost')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(404);
  });
});
