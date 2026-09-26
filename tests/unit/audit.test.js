/**
 * @jest-environment jsdom
 *
 * Unit tests for Admin/site-health/audit.js
 * Focuses on the `assess(html, path)` pure function exposed as SiteAudit._assess.
 */
/* eslint-disable no-eval */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '../../Admin/site-health/audit.js'), 'utf8');

beforeAll(() => {
  window.eval(SRC);
});

// ── Helper: build minimal valid HTML of N lines ───────────────────────────────
function minimalHtml(extraLines = 0) {
  const padding = Array.from({ length: extraLines }, (_, i) => `<!-- pad ${i} -->`).join('\n');
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test Page</title>
<script src="assets/js/core.js"></script>
<script>localStorage.getItem('re-theme')</script>
</head>
<body>
<p>Content</p>
${padding}
</body>
</html>`;
}

// ── assess() — missing required elements ─────────────────────────────────────
describe('assess() — required element checks', () => {
  const assess = (...args) => window.SiteAudit._assess(...args);

  test('returns ok:false with a clear issue when html is falsy', () => {
    const r = assess('', 'home.html');
    expect(r.ok).toBe(false);
    expect(r.issues[0]).toMatch(/not reachable/i);
  });

  test('flags missing <!DOCTYPE html>', () => {
    const html = minimalHtml(35).replace(/<!DOCTYPE html>\n/, '');
    const r = assess(html, 'home.html');
    expect(r.issues).toContain('Missing <!DOCTYPE html>');
  });

  test('flags missing </html>', () => {
    const html = minimalHtml(35).replace(/<\/html>/, '');
    const r = assess(html, 'home.html');
    expect(r.issues.some(i => /missing.*<\/html>/i.test(i))).toBe(true);
  });

  test('flags missing </body>', () => {
    const html = minimalHtml(35).replace(/<\/body>/, '');
    const r = assess(html, 'home.html');
    expect(r.issues.some(i => /missing.*<\/body>/i.test(i))).toBe(true);
  });

  test('flags missing viewport meta tag', () => {
    const html = minimalHtml(35).replace(/<meta name="viewport"[^>]+>/, '');
    const r = assess(html, 'home.html');
    expect(r.issues).toContain('Missing viewport meta tag');
  });
});

// ── assess() — warnings ───────────────────────────────────────────────────────
describe('assess() — warnings', () => {
  const assess = (...args) => window.SiteAudit._assess(...args);

  test('warns about missing core.js for non-minimal pages', () => {
    const html = minimalHtml(35).replace(/core\.js/i, 'other.js');
    const r = assess(html, 'home.html');
    expect(r.warnings.some(w => /core\.js/i.test(w))).toBe(true);
  });

  test('does NOT warn about missing core.js for known minimal pages', () => {
    const html = minimalHtml(35).replace(/core\.js/i, 'other.js');
    const r = assess(html, 'hello.html');
    expect(r.warnings.every(w => !/core\.js/i.test(w))).toBe(true);
  });

  test('warns when <title> is absent', () => {
    const html = minimalHtml(35).replace(/<title>.*?<\/title>/, '');
    const r = assess(html, 'home.html');
    expect(r.warnings.some(w => /title/i.test(w))).toBe(true);
  });

  test('warns when file is fewer than 40 lines', () => {
    // minimalHtml(0) produces < 40 lines
    const html = minimalHtml(0);
    const r = assess(html, 'home.html');
    expect(r.warnings.some(w => /short/i.test(w))).toBe(true);
  });

  test('does NOT warn about short file when there are 40+ lines', () => {
    const html = minimalHtml(35); // ~47 lines total
    const r = assess(html, 'home.html');
    expect(r.warnings.every(w => !/short/i.test(w))).toBe(true);
  });
});

// ── assess() — JS syntax checking ────────────────────────────────────────────
describe('assess() — inline JS syntax check', () => {
  const assess = (...args) => window.SiteAudit._assess(...args);

  test('flags a syntax error inside an inline <script> block', () => {
    const html = minimalHtml(35).replace(
      "<script>localStorage.getItem('re-theme')</script>",
      '<script>var x = {;</script>'
    );
    const r = assess(html, 'home.html');
    expect(r.issues.some(i => /syntax error/i.test(i))).toBe(true);
  });

  test('ignores external <script src="..."> blocks', () => {
    // External scripts already present in minimalHtml — they should not be syntax-checked
    const html = minimalHtml(35);
    const r = assess(html, 'home.html');
    expect(r.issues.every(i => !/syntax error/i.test(i))).toBe(true);
  });
});

// ── assess() — status derivation ─────────────────────────────────────────────
describe('assess() — status', () => {
  const assess = (...args) => window.SiteAudit._assess(...args);

  test('returns status "healthy" for a complete valid page', () => {
    const html = minimalHtml(35);
    const r = assess(html, 'home.html');
    expect(r.ok).toBe(true);
    expect(r.status).toBe('healthy');
    expect(r.issues).toHaveLength(0);
  });

  test('returns status "warning" when there are warnings but no issues', () => {
    // Remove title to trigger a warning, keep everything else
    const html = minimalHtml(35).replace(/<title>.*?<\/title>/, '');
    const r = assess(html, 'home.html');
    expect(r.status).toBe('warning');
    expect(r.issues).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  test('returns status "error" when there are issues', () => {
    const html = minimalHtml(35).replace(/<!DOCTYPE html>\n/, '');
    const r = assess(html, 'home.html');
    expect(r.status).toBe('error');
    expect(r.ok).toBe(false);
  });

  test('reports sizeKb and lines', () => {
    const html = minimalHtml(35);
    const r = assess(html, 'home.html');
    expect(r.lines).toBeGreaterThan(0);
    expect(r.sizeKb).toBeGreaterThan(0);
  });
});

// ── SiteAudit API surface ─────────────────────────────────────────────────────
describe('SiteAudit callback registration', () => {
  test('onResult, onComplete, onProgress accept functions without throwing', () => {
    expect(() => {
      window.SiteAudit.onResult(jest.fn());
      window.SiteAudit.onComplete(jest.fn());
      window.SiteAudit.onProgress(jest.fn());
    }).not.toThrow();
  });

  test('run() calls onComplete with empty categories immediately when protocol is file:', () => {
    // Simulate file: protocol by overriding location
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { protocol: 'file:', href: 'file:///index.html' },
    });

    const onComplete = jest.fn();
    window.SiteAudit.onComplete(onComplete);
    window.SiteAudit.run();

    expect(onComplete).toHaveBeenCalledWith({ pages: [], css: [], js: [], images: [] });

    Object.defineProperty(window, 'location', { writable: true, value: origLocation });
  });
});
