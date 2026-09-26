'use strict';
/**
 * Weekly Hardware Design Challenge (WHDC) API tests.
 * The pg module is mocked (see __mocks__/pg.js) so no real database is needed.
 *
 * Covers:
 *   GET  /api/challenges/current          (public)
 *   GET  /api/leaderboard                 (public)
 *   POST /api/challenges/:id/attempts     (auth) — start
 *   POST /api/attempts/:id/submit         (auth) — grade + points (transaction)
 *   GET  /api/me/whdc                      (auth)
 */
jest.mock('pg');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { mockQuery } = require('pg');
const { fakeUser, mockInitDB } = require('../helpers/mockDb');

let app;

function makeToken(role = 'USER', userId = 'usr-001') {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function auth() {
  return { Authorization: `Bearer ${makeToken()}` };
}

beforeAll(() => {
  mockInitDB(mockQuery);
  ({ app } = require('../../server'));
});

afterEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── Public: current challenge ───────────────────────────────────────────────
describe('GET /api/challenges/current', () => {
  test('200 — returns the live challenge with a question count', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'ch-1', title: 'Week 1', status: 'live' }] })
      .mockResolvedValueOnce({ rows: [{ n: 5 }] });

    const res = await request(app).get('/api/challenges/current');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('ch-1');
    expect(res.body.data.question_count).toBe(5);
  });

  test('200 — returns null when no challenge exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/challenges/current');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });
});

// ── Public: all-time leaderboard ────────────────────────────────────────────
describe('GET /api/leaderboard', () => {
  test('200 — returns ranked rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ full_name: 'A. Engineer', role: 'SI', score: 1200, tier: 'Silver', rank: 1 }],
    });
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].full_name).toBe('A. Engineer');
  });
});

// ── Auth: start an attempt ──────────────────────────────────────────────────
describe('POST /api/challenges/:id/attempts', () => {
  test('201 — starts a new attempt and returns questions without answer keys', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    mockQuery.mockImplementation(sql => {
      const s = String(sql);
      if (/FROM users u/.test(s)) {
        return Promise.resolve({ rows: [fakeUser()] });
      }
      if (/FROM challenges WHERE id=/.test(s)) {
        return Promise.resolve({
          rows: [{ id: 'ch-1', status: 'live', closes_at: future, time_limit_min: 20 }],
        });
      }
      if (/FROM challenge_attempts WHERE challenge_id=\$1 AND user_id/.test(s)) {
        return Promise.resolve({ rows: [] });
      }
      if (/SELECT id FROM challenge_questions/.test(s)) {
        return Promise.resolve({ rows: [{ id: 'q1' }, { id: 'q2' }] });
      }
      if (/INSERT INTO challenge_attempts/.test(s)) {
        return Promise.resolve({ rows: [{ id: 'att-1', challenge_id: 'ch-1' }] });
      }
      if (/SELECT id,type,prompt,assets,options,points FROM challenge_questions/.test(s)) {
        return Promise.resolve({
          rows: [
            { id: 'q1', type: 'mcq', prompt: 'Q1', options: ['a', 'b'], points: 10 },
            { id: 'q2', type: 'numeric', prompt: 'Q2', points: 10 },
          ],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app).post('/api/challenges/ch-1/attempts').set(auth()).send({});
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attempt.id).toBe('att-1');
    expect(res.body.data.questions).toHaveLength(2);
    expect(JSON.stringify(res.body.data.questions)).not.toMatch(/answer_key/);
  });

  test('403 — cannot start when the challenge is not live (non-practice)', async () => {
    mockQuery.mockImplementation(sql => {
      const s = String(sql);
      if (/FROM users u/.test(s)) {
        return Promise.resolve({ rows: [fakeUser()] });
      }
      if (/FROM challenges WHERE id=/.test(s)) {
        return Promise.resolve({ rows: [{ id: 'ch-1', status: 'closed' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const res = await request(app).post('/api/challenges/ch-1/attempts').set(auth()).send({});
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ── Auth: submit (transaction) ──────────────────────────────────────────────
describe('POST /api/attempts/:id/submit', () => {
  test('200 — grades, awards points and first-challenge badge', async () => {
    const attempt = {
      id: 'att-1',
      challenge_id: 'ch-1',
      user_id: 'usr-001',
      status: 'in_progress',
      started_at: new Date(Date.now() - 60000).toISOString(),
      deadline_at: new Date(Date.now() + 600000).toISOString(),
      is_practice: false,
    };
    const challenge = {
      id: 'ch-1',
      title: 'Week 1',
      difficulty: 'Intermediate',
      total_points: 100,
      time_limit_min: 20,
      opens_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    };
    const q1 = { id: 'q1', type: 'mcq', answer_key: { correct: 0 }, points: 10 };

    mockQuery.mockImplementation(sql => {
      const s = String(sql).trim();
      if (s.startsWith('BEGIN') || s.startsWith('COMMIT') || s.startsWith('ROLLBACK')) {
        return Promise.resolve({ rows: [] });
      }
      if (/FROM users u/.test(s)) {
        return Promise.resolve({ rows: [fakeUser()] });
      }
      if (/FROM challenge_attempts WHERE id=/.test(s)) {
        return Promise.resolve({ rows: [attempt] });
      }
      if (/FROM challenges WHERE id=/.test(s)) {
        return Promise.resolve({ rows: [challenge] });
      }
      if (/SELECT \* FROM challenge_questions/.test(s)) {
        return Promise.resolve({ rows: [q1] });
      }
      if (/SELECT question_id, response FROM attempt_answers/.test(s)) {
        return Promise.resolve({ rows: [{ question_id: 'q1', response: { choice: 0 } }] });
      }
      if (/FROM user_points WHERE user_id/.test(s)) {
        return Promise.resolve({
          rows: [
            { current_streak: 0, longest_streak: 0, lifetime_points: 0, challenges_played: 0 },
          ],
        });
      }
      if (/FROM badges WHERE code=/.test(s)) {
        return Promise.resolve({ rows: [{ id: 'b1' }] });
      }
      if (/INSERT INTO user_badges/.test(s)) {
        return Promise.resolve({ rows: [{ id: 'ub1' }] });
      }
      if (/INSERT INTO certificate_issues/.test(s)) {
        return Promise.resolve({ rows: [{ cert_number: 'CERT-TEST' }] });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    const res = await request(app)
      .post('/api/attempts/att-1/submit')
      .set(auth())
      .send({ answers: [{ questionId: 'q1', response: { choice: 0 } }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.correctCount).toBe(1);
    expect(res.body.data.rawScore).toBe(10);
    expect(res.body.data.pointsAwarded).toBeGreaterThan(0);
    expect(res.body.data.newBadges).toContain('first_challenge');
    // Certificates are no longer issued on submit — only the top 10 finishers
    // receive one when the challenge closes (see issueWhdcTopCertificates).
    expect(res.body.data.certNumber).toBeUndefined();
  });

  test('409 — cannot submit an already-submitted attempt', async () => {
    mockQuery.mockImplementation(sql => {
      const s = String(sql).trim();
      if (s.startsWith('BEGIN') || s.startsWith('ROLLBACK')) {
        return Promise.resolve({ rows: [] });
      }
      if (/FROM users u/.test(s)) {
        return Promise.resolve({ rows: [fakeUser()] });
      }
      if (/FROM challenge_attempts WHERE id=/.test(s)) {
        return Promise.resolve({
          rows: [{ id: 'att-1', status: 'submitted', user_id: 'usr-001' }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    const res = await request(app).post('/api/attempts/att-1/submit').set(auth()).send({});
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('422 — rejects a non-array answers payload', async () => {
    mockQuery.mockImplementation(sql => {
      if (/FROM users u/.test(String(sql))) {
        return Promise.resolve({ rows: [fakeUser()] });
      }
      return Promise.resolve({ rows: [] });
    });
    const res = await request(app)
      .post('/api/attempts/att-1/submit')
      .set(auth())
      .send({ answers: 'nope' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('401 — requires authentication', async () => {
    const res = await request(app).post('/api/attempts/att-1/submit').send({ answers: [] });
    expect(res.status).toBe(401);
  });
});

// ── Auth: my WHDC profile ───────────────────────────────────────────────────
describe('GET /api/me/whdc', () => {
  test('200 — returns points, rank, badges and attempts', async () => {
    mockQuery.mockImplementation(sql => {
      const s = String(sql);
      if (/FROM users u/.test(s)) {
        return Promise.resolve({ rows: [fakeUser()] });
      }
      if (/FROM user_points WHERE user_id/.test(s)) {
        return Promise.resolve({
          rows: [{ lifetime_points: 500, tier: 'Bronze', current_streak: 2, longest_streak: 3 }],
        });
      }
      if (/COUNT\(\*\)\+1 AS r FROM user_points/.test(s)) {
        return Promise.resolve({ rows: [{ r: 7 }] });
      }
      if (/FROM user_badges/.test(s)) {
        return Promise.resolve({ rows: [] });
      }
      if (/FROM challenge_attempts a JOIN challenges/.test(s)) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app).get('/api/me/whdc').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.points.lifetime_points).toBe(500);
    expect(res.body.data.allTimeRank).toBe(7);
  });
});
