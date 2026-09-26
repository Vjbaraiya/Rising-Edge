/**
 * @jest-environment jsdom
 *
 * Unit tests for Certificate/js/certificate-api.js
 * Tests the offline mock helpers (_mockGenerate, _mockVerify, _findStored,
 * _mockRevoke, _getStored) and the search() query-string builder.
 */
/* eslint-disable no-eval */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../../Certificate/js/certificate-api.js'),
  'utf8'
);

beforeAll(() => {
  // CertAPI uses `location.protocol` at load time; jsdom's default is http:
  // so OFFLINE=false and the mock functions are exposed via _mockGenerate etc.
  window.eval(SRC);
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ── _getStored / _findStored ──────────────────────────────────────────────────
describe('_getStored / _findStored', () => {
  test('_getStored() returns [] when localStorage is empty', () => {
    expect(window.CertAPI._getStored()).toEqual([]);
  });

  test('_getStored() returns [] on malformed JSON', () => {
    localStorage.setItem('re_certificates', 'bad-json');
    expect(window.CertAPI._getStored()).toEqual([]);
  });

  test('_getStored() returns the stored certificate array', () => {
    const certs = [{ certificateId: 'RET-2025-SI-001', status: 'active' }];
    localStorage.setItem('re_certificates', JSON.stringify(certs));
    expect(window.CertAPI._getStored()).toEqual(certs);
  });

  test('_findStored() returns null when no match exists', () => {
    expect(window.CertAPI._findStored('UNKNOWN-ID')).toBeNull();
  });

  test('_findStored() finds a cert by certificateId', () => {
    const cert = {
      certificateId: 'RET-2025-SI-100',
      certificateNumber: 'RET-2025-SI-100',
      status: 'active',
    };
    localStorage.setItem('re_certificates', JSON.stringify([cert]));
    expect(window.CertAPI._findStored('RET-2025-SI-100')).toEqual(cert);
  });

  test('_findStored() finds a cert by certificateNumber when id differs', () => {
    const cert = { certificateId: 'cert-id-1', certificateNumber: 'cert-num-1', status: 'active' };
    localStorage.setItem('re_certificates', JSON.stringify([cert]));
    expect(window.CertAPI._findStored('cert-num-1')).toEqual(cert);
  });
});

// ── _mockGenerate ─────────────────────────────────────────────────────────────
describe('_mockGenerate', () => {
  const sampleData = {
    candidateName: 'Vijay Baraiya',
    email: 'vijay@example.com',
    courseName: 'Signal Integrity Academy',
    courseCode: 'SI',
    completionDate: '2025-06-15',
    duration: '24 hours',
    grade: 'Distinction',
    instructor: 'Dr. Engineer',
  };

  test('returns a resolved Promise with success:true', async () => {
    const result = await window.CertAPI._mockGenerate(sampleData);
    expect(result.success).toBe(true);
  });

  test('returned cert contains candidateName and courseName', async () => {
    const result = await window.CertAPI._mockGenerate(sampleData);
    expect(result.candidateName).toBe('Vijay Baraiya');
    expect(result.courseName).toBe('Signal Integrity Academy');
  });

  test('certificateId follows the RET-{YEAR}-{CODE}-{SEQ} pattern', async () => {
    const result = await window.CertAPI._mockGenerate(sampleData);
    expect(result.certificateId).toMatch(/^RET-\d{4}-SI-\d{6}$/);
  });

  test('cert status is "active"', async () => {
    const result = await window.CertAPI._mockGenerate(sampleData);
    expect(result.status).toBe('active');
  });

  test('stores the generated cert in localStorage', async () => {
    await window.CertAPI._mockGenerate(sampleData);
    const stored = window.CertAPI._getStored();
    expect(stored).toHaveLength(1);
    expect(stored[0].candidateName).toBe('Vijay Baraiya');
  });

  test('prepends new cert to existing stored certs', async () => {
    await window.CertAPI._mockGenerate(sampleData);
    await window.CertAPI._mockGenerate({ ...sampleData, candidateName: 'Second Person' });
    const stored = window.CertAPI._getStored();
    expect(stored).toHaveLength(2);
    expect(stored[0].candidateName).toBe('Second Person'); // newest first
  });

  test('generates unique certificateIds on successive calls', async () => {
    const r1 = await window.CertAPI._mockGenerate(sampleData);
    const r2 = await window.CertAPI._mockGenerate(sampleData);
    // Two separate calls should (overwhelmingly) produce different IDs
    // (1-in-900000 collision chance is acceptable for a test)
    expect(r1.certificateId).not.toBe(r2.certificateId);
  });
});

// ── _mockVerify ───────────────────────────────────────────────────────────────
describe('_mockVerify', () => {
  test('returns valid:false for an unknown certificate ID', async () => {
    const result = await window.CertAPI._mockVerify('NONEXISTENT');
    expect(result.valid).toBe(false);
    expect(result.status).toBe('invalid');
  });

  test('returns valid:true and the cert for an active certificate', async () => {
    const cert = {
      certificateId: 'RET-2025-SI-999999',
      certificateNumber: 'RET-2025-SI-999999',
      status: 'active',
    };
    localStorage.setItem('re_certificates', JSON.stringify([cert]));
    const result = await window.CertAPI._mockVerify('RET-2025-SI-999999');
    expect(result.valid).toBe(true);
    expect(result.certificate).toEqual(cert);
  });

  test('returns valid:false for a revoked certificate', async () => {
    const cert = {
      certificateId: 'RET-2025-SI-777777',
      certificateNumber: 'RET-2025-SI-777777',
      status: 'revoked',
    };
    localStorage.setItem('re_certificates', JSON.stringify([cert]));
    const result = await window.CertAPI._mockVerify('RET-2025-SI-777777');
    expect(result.valid).toBe(false);
  });
});

// ── _mockRevoke ───────────────────────────────────────────────────────────────
describe('_mockRevoke', () => {
  test('marks the certificate as revoked in localStorage', async () => {
    const cert = {
      certificateId: 'RET-2025-SI-888888',
      certificateNumber: 'RET-2025-SI-888888',
      status: 'active',
    };
    localStorage.setItem('re_certificates', JSON.stringify([cert]));
    await window.CertAPI._mockRevoke('RET-2025-SI-888888');
    const stored = window.CertAPI._getStored();
    expect(stored[0].status).toBe('revoked');
  });

  test('returns success:true', async () => {
    localStorage.setItem('re_certificates', JSON.stringify([]));
    const result = await window.CertAPI._mockRevoke('anything');
    expect(result.success).toBe(true);
  });
});
