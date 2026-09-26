/**
 * @jest-environment jsdom
 *
 * Unit tests for Certificate/js/certificate-renderer.js
 * Tests the pure utility functions (_esc, _fill, _fmtDate, generateCertNumber)
 * and the renderInto() DOM renderer with a provided template string.
 */
/* eslint-disable no-eval */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../../Certificate/js/certificate-renderer.js'),
  'utf8'
);

beforeAll(() => {
  window.eval(SRC);
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── _esc — HTML escaping ──────────────────────────────────────────────────────
describe('CertRenderer._esc', () => {
  const esc = s => window.CertRenderer._esc(s);

  test('escapes ampersands', () => {
    expect(esc('A & B')).toBe('A &amp; B');
  });

  test('escapes less-than signs', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes greater-than signs', () => {
    expect(esc('a > b')).toBe('a &gt; b');
  });

  test('escapes double quotes', () => {
    expect(esc('"quoted"')).toBe('&quot;quoted&quot;');
  });

  test('handles strings with multiple special characters', () => {
    expect(esc('<a href="x&y">z</a>')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;z&lt;/a&gt;');
  });

  test('returns plain strings unchanged', () => {
    expect(esc('Rising Edge Technologies')).toBe('Rising Edge Technologies');
  });
});

// ── _fill — placeholder substitution ─────────────────────────────────────────
describe('CertRenderer._fill', () => {
  const fill = (html, data) => window.CertRenderer._fill(html, data);

  test('replaces a single {{placeholder}}', () => {
    expect(fill('Hello {{name}}!', { name: 'Vijay' })).toBe('Hello Vijay!');
  });

  test('replaces multiple distinct placeholders', () => {
    const tpl = '{{courseName}} — {{candidateName}}';
    expect(fill(tpl, { courseName: 'Signal Integrity', candidateName: 'Vijay' })).toBe(
      'Signal Integrity — Vijay'
    );
  });

  test('replaces the same placeholder multiple times', () => {
    expect(fill('{{x}} and {{x}}', { x: 'foo' })).toBe('foo and foo');
  });

  test('substitutes an empty string when the key is missing from data', () => {
    expect(fill('{{missing}}', {})).toBe('');
  });

  test('HTML-escapes the substituted value', () => {
    expect(fill('{{val}}', { val: '<b>bold</b>' })).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  test('leaves non-placeholder text unchanged', () => {
    expect(fill('No placeholders here.', {})).toBe('No placeholders here.');
  });
});

// ── _fmtDate — date formatting ────────────────────────────────────────────────
describe('CertRenderer._fmtDate', () => {
  const fmt = d => window.CertRenderer._fmtDate(d);

  test('returns "" for falsy input', () => {
    expect(fmt('')).toBe('');
    expect(fmt(null)).toBe('');
    expect(fmt(undefined)).toBe('');
  });

  test('returns the original string for an invalid date', () => {
    expect(fmt('not-a-date')).toBe('not-a-date');
  });

  test('formats an ISO date string to "DD Month YYYY"', () => {
    // Use a UTC noon to avoid timezone-boundary issues
    const result = fmt('2025-06-15T12:00:00Z');
    // Expect something like "15 June 2025"
    expect(result).toMatch(/15\s+June\s+2025/);
  });

  test('formats a plain date string "YYYY-MM-DD"', () => {
    const result = fmt('2024-01-01');
    expect(result).toMatch(/January|01/);
    expect(result).toMatch(/2024/);
  });
});

// ── generateCertNumber ────────────────────────────────────────────────────────
describe('CertRenderer.generateCertNumber', () => {
  const gen = code => window.CertRenderer.generateCertNumber(code);

  test('follows the RET-{YEAR}-{CODE}-{SEQ6} pattern', () => {
    const year = new Date().getFullYear();
    expect(gen('SI')).toMatch(new RegExp(`^RET-${year}-SI-\\d{6}$`));
  });

  test('strips non-alphanumeric characters from the course code', () => {
    const result = gen('signal integrity!');
    expect(result).not.toContain(' ');
    expect(result).not.toContain('!');
  });

  test('truncates the course code to 6 characters', () => {
    const result = gen('VERYLONGCODE');
    // Code part should be at most 6 chars
    const parts = result.split('-');
    expect(parts[2].length).toBeLessThanOrEqual(6);
  });

  test('uses "RET" as the fallback code when no code is provided', () => {
    expect(gen(undefined)).toContain('-RET-');
    expect(gen('')).toContain('-RET-');
  });

  test('generates unique numbers on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => gen('SI')));
    // Extremely unlikely to collide within 50 calls
    expect(ids.size).toBeGreaterThan(45);
  });
});

// ── renderInto ────────────────────────────────────────────────────────────────
describe('CertRenderer.renderInto', () => {
  const TEMPLATE = `
    <div class="cert-doc">
      <p class="cert-name">{{candidateName}}</p>
      <p class="cert-course">{{courseName}}</p>
      <p class="cert-date">{{completionDate}}</p>
      <p class="cert-id">{{certificateNumber}}</p>
    </div>
  `;

  const DATA = {
    candidateName: 'Vijay Baraiya',
    courseName: 'Signal Integrity Academy',
    completionDate: '2025-06-15',
    certificateNumber: 'RET-2025-SI-123456',
  };

  test('resolves with the container element', async () => {
    const container = document.createElement('div');
    const result = await window.CertRenderer.renderInto(container, DATA, TEMPLATE);
    expect(result).toBe(container);
  });

  test('populates {{candidateName}} in the rendered HTML', async () => {
    const container = document.createElement('div');
    await window.CertRenderer.renderInto(container, DATA, TEMPLATE);
    expect(container.querySelector('.cert-name').textContent).toBe('Vijay Baraiya');
  });

  test('populates {{courseName}} in the rendered HTML', async () => {
    const container = document.createElement('div');
    await window.CertRenderer.renderInto(container, DATA, TEMPLATE);
    expect(container.querySelector('.cert-course').textContent).toBe('Signal Integrity Academy');
  });

  test('auto-generates certificateNumber when not provided', async () => {
    const container = document.createElement('div');
    const dataWithoutNum = { ...DATA, certificateNumber: undefined };
    await window.CertRenderer.renderInto(container, dataWithoutNum, TEMPLATE);
    const certId = container.querySelector('.cert-id').textContent;
    expect(certId).toMatch(/^RET-\d{4}-/);
  });

  test('formats completionDate into human-readable form', async () => {
    const container = document.createElement('div');
    await window.CertRenderer.renderInto(container, DATA, TEMPLATE);
    // The raw ISO date "2025-06-15" should have been formatted
    const dateText = container.querySelector('.cert-date').textContent;
    expect(dateText).not.toBe('2025-06-15');
    expect(dateText).toMatch(/2025/);
  });
});
