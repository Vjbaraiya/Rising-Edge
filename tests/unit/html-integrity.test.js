'use strict';
/**
 * HTML Integrity — auto-discovers every .html file under the project root
 * and runs two classes of checks:
 *
 *   1. Structural completeness  (DOCTYPE, </html>, </body>, viewport, title)
 *   2. Asset reference validity (src=".js" and href=".css" point to real files)
 *
 * Runs in Node.js — no browser required.
 * Any new .html file is automatically picked up; no config changes needed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// ── Discovery ─────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'node_modules',
  'coverage',
  'playwright-report',
  'test-results',
  '.git',
  '.husky',
]);

function findHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findHtml(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const ALL_HTML = findHtml(ROOT);

/** Forward-slash relative path from project root — used for matching rules. */
function rel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

// ── Relaxed-rule sets ─────────────────────────────────────────────────────────

/**
 * Pages that may omit viewport / title — documentation, standalone email
 * templates, and legacy reference files that aren't served as user-facing pages.
 */
const RELAXED_STRUCTURE_PREFIXES = ['architecture/', 'Ref/', 'Certificate/templates/'];

/** Files that are intentionally not full HTML documents (e.g. Google verification). */
const SKIP_STRUCTURE_FILES = new Set([
  'googlea5818f8a10ca7ba5.html',
  'google5978c8950f2773d8.html',
]);

function isRelaxedStructure(r) {
  return (
    RELAXED_STRUCTURE_PREFIXES.some(p => r.startsWith(p)) ||
    SKIP_STRUCTURE_FILES.has(path.basename(r))
  );
}

/**
 * Pages whose relative JS/CSS paths may resolve differently at runtime
 * (documentation with demo CDN links, reference implementations, template
 * scaffolding with placeholder paths).
 */
const RELAXED_ASSET_PREFIXES = ['architecture/', 'Ref/', 'Template/', 'docs/'];

function isRelaxedAssets(r) {
  return RELAXED_ASSET_PREFIXES.some(p => r.startsWith(p));
}

// ── Helper ────────────────────────────────────────────────────────────────────

function readHtml(absPath) {
  return fs.readFileSync(absPath, 'utf8');
}

function resolveRef(ref, fileDir) {
  if (/^(https?:|\/\/|data:|#|javascript:|mailto:|tel:)/.test(ref)) return null; // external
  return ref.startsWith('/') ? path.join(ROOT, ref) : path.resolve(fileDir, ref);
}

// ── Suite 1: structural completeness ─────────────────────────────────────────

describe('HTML structural integrity', () => {
  test.each(ALL_HTML.map(f => [rel(f), f]))('%s', (r, absPath) => {
    const html = readHtml(absPath);
    const issues = [];

    if (!isRelaxedStructure(r)) {
      if (!/<!DOCTYPE\s+html/i.test(html)) issues.push('missing <!DOCTYPE html>');
      if (!/<\/html>/i.test(html)) issues.push('missing </html>');
      if (!/<\/body>/i.test(html)) issues.push('missing </body>');
      if (!/name=["']viewport["']/i.test(html)) issues.push('missing <meta name="viewport">');
      if (!/<title(\s[^>]*)?>/i.test(html)) issues.push('missing <title>');
    }

    expect(issues).toEqual([]);
  });
});

// ── Suite 2: asset reference integrity ───────────────────────────────────────

describe('HTML asset reference integrity', () => {
  test.each(ALL_HTML.map(f => [rel(f), f]))('%s', (r, absPath) => {
    if (isRelaxedAssets(r)) return; // skip for doc / template / reference pages

    const html = readHtml(absPath);
    const dir = path.dirname(absPath);
    const broken = [];

    function check(ref) {
      const candidate = resolveRef(ref, dir);
      if (candidate && !fs.existsSync(candidate)) broken.push(ref);
    }

    // <script src="...js">
    const scriptRe = /\bsrc=["']([^"']+\.(?:js|mjs))["']/gi;
    let m;
    while ((m = scriptRe.exec(html)) !== null) check(m[1]);

    // <link href="...css">
    const cssRe = /\bhref=["']([^"']+\.css)["']/gi;
    while ((m = cssRe.exec(html)) !== null) check(m[1]);

    expect(broken).toEqual([]);
  });
});
