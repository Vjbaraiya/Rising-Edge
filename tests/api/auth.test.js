'use strict';
/**
 * Auth API tests — POST /api/auth/login, /register, /refresh
 * The pg module is mocked so no real database is needed.
 */
jest.mock('pg');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { mockQuery } = require('pg');
const { fakeUser, mockInitDB } = require('../helpers/mockDb');

let app;

beforeAll(async () => {
  // initDB() will fire when server.js is required; all queries return []
  mockInitDB(mockQuery);
  ({ app } = require('../../server'));
});

afterEach(() => {
  // Reset to default empty response between tests
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── POST /api/auth/register ────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  test('201 — creates a new user', async () => {
    // No existing user, then INSERT returns the new user id
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // SELECT (email check)
      .mockResolvedValueOnce({ rows: [{ id: 'usr-new' }] }) // INSERT user
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT user_subscriptions
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE email_verified

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'New Engineer',
      email: 'new@example.com',
      password: 'SecurePass1!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('409 — duplicate email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'usr-existing' }] });

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Dupe',
      email: 'dupe@example.com',
      password: 'SecurePass1!',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('422 — missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(422);
  });

  test('422 — password too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Short',
      email: 'short@example.com',
      password: '123',
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/8 characters/i);
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('200 — valid credentials return tokens and real plan', async () => {
    const hash = await bcrypt.hash('CorrectPass1!', 4); // low rounds for speed
    const user = fakeUser({ password_hash: hash, plan: 'advanced' });

    mockQuery
      .mockResolvedValueOnce({ rows: [user] }) // SELECT user + plan
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT refresh_token
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE failed_attempts
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT login_history

    const res = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'CorrectPass1!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('accessToken');
    // The refresh token is never exposed in the JSON body — it's set as an
    // HttpOnly cookie so it isn't reachable from JS (XSS-resistant). Assert
    // it was actually issued via Set-Cookie instead.
    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.some(c => c.startsWith('re_refresh='))).toBe(true);
    expect(setCookie.some(c => /HttpOnly/i.test(c))).toBe(true);
    // Plan must come from DB, NOT hardcoded 'basic'
    expect(res.body.user.plan).toBe('advanced');
  });

  test('401 — wrong password', async () => {
    const hash = await bcrypt.hash('CorrectPass1!', 4);
    const user = fakeUser({ password_hash: hash });

    mockQuery
      .mockResolvedValueOnce({ rows: [user] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'WrongPass!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  test('401 — user not found returns same generic error', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no user

    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'whatever',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  test('403 — suspended account is rejected', async () => {
    const hash = await bcrypt.hash('pass123!A', 4);
    mockQuery.mockResolvedValueOnce({
      rows: [fakeUser({ password_hash: hash, status: 'SUSPENDED' })],
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'suspended@example.com',
      password: 'pass123!A',
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/suspended/i);
  });

  test('422 — missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  function makeToken(payload = {}) {
    return jwt.sign({ userId: 'usr-001', role: 'USER', ...payload }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });
  }

  test('200 — valid token returns user profile', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser()] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email');
  });

  test('401 — no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('401 — expired token', async () => {
    const expired = jwt.sign({ userId: 'usr-001', role: 'USER' }, process.env.JWT_SECRET, {
      expiresIn: '-1s',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });
});
