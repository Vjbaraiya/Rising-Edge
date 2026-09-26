/**
 * @jest-environment jsdom
 *
 * Unit tests for assets/js/core.js
 * Loads the script into jsdom global scope via window.eval() so all IIFEs and
 * var-scoped globals (Theme, getAllCourses, reGetToken, etc.) become accessible
 * as window properties.
 */
/* eslint-disable no-eval */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '../../assets/js/core.js'), 'utf8');

beforeAll(() => {
  window.eval(SRC);
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ── Theme ─────────────────────────────────────────────────────────────────────
describe('Theme', () => {
  test('get() returns "dark" when localStorage is empty', () => {
    expect(window.Theme.get()).toBe('dark');
  });

  test('set() persists value to localStorage', () => {
    window.Theme.set('light');
    expect(localStorage.getItem('re-theme')).toBe('light');
    expect(window.Theme.get()).toBe('light');
  });

  test('set() falls back to "dark" for an unknown theme name', () => {
    window.Theme.set('unicorn');
    expect(window.Theme.get()).toBe('dark');
  });

  test('next() cycles dark → light → night → dark', () => {
    localStorage.setItem('re-theme', 'dark');
    window.Theme.next();
    expect(window.Theme.get()).toBe('light');
    window.Theme.next();
    expect(window.Theme.get()).toBe('night');
    window.Theme.next();
    expect(window.Theme.get()).toBe('dark');
  });
});

// ── _siteDepth / assetsRoot / rootPath ───────────────────────────────────────
describe('_siteDepth / assetsRoot / rootPath', () => {
  let injected = null;

  afterEach(() => {
    if (injected) {
      injected.remove();
      injected = null;
    }
  });

  test('_siteDepth() returns 0 when no core.js <script> found', () => {
    expect(window._siteDepth()).toBe(0);
  });

  test('assetsRoot() returns "assets/" at depth 0', () => {
    expect(window.assetsRoot()).toBe('assets/');
  });

  test('rootPath() returns "" at depth 0', () => {
    expect(window.rootPath()).toBe('');
  });

  test('returns depth 2 when script src has two "../" prefixes', () => {
    injected = document.createElement('script');
    injected.setAttribute('src', '../../assets/js/core.js');
    document.head.appendChild(injected);
    expect(window._siteDepth()).toBe(2);
    expect(window.assetsRoot()).toBe('../../assets/');
    expect(window.rootPath()).toBe('../../');
  });
});

// ── getAllCourses ──────────────────────────────────────────────────────────────
describe('getAllCourses', () => {
  test('returns the 3 built-in default courses when localStorage is empty', () => {
    const courses = window.getAllCourses();
    expect(courses).toHaveLength(3);
    expect(courses[0].id).toBe('si');
  });

  test('overrides a default course when localStorage has the same id', () => {
    localStorage.setItem(
      're_courses',
      JSON.stringify([
        {
          id: 'si',
          title: 'Custom SI',
          category: 'si',
          badge: 'cyan',
          modules: 99,
          status: 'published',
          href: 'si.html',
          gradient: '',
          createdAt: 0,
        },
      ])
    );
    const si = window.getAllCourses().find(c => c.id === 'si');
    expect(si.title).toBe('Custom SI');
    expect(si.modules).toBe(99);
  });

  test('appends extra stored courses that are not in the default list', () => {
    localStorage.setItem(
      're_courses',
      JSON.stringify([
        {
          id: 'extra',
          title: 'Extra Course',
          category: 'custom',
          badge: 'purple',
          modules: 5,
          status: 'published',
          href: 'extra.html',
          gradient: '',
          createdAt: 100,
        },
      ])
    );
    const courses = window.getAllCourses();
    expect(courses).toHaveLength(4); // 3 defaults + 1 custom
    expect(courses[3].id).toBe('extra');
  });

  test('falls back to defaults gracefully when localStorage JSON is malformed', () => {
    localStorage.setItem('re_courses', 'not-valid-json');
    expect(window.getAllCourses()).toHaveLength(3);
  });
});

// ── getAllTools / getAllResources ──────────────────────────────────────────────
describe('getAllTools / getAllResources', () => {
  test('getAllTools() returns [] when localStorage is empty (no built-in defaults)', () => {
    expect(window.getAllTools()).toEqual([]);
  });

  test('getAllResources() returns [] when localStorage is empty', () => {
    expect(window.getAllResources()).toEqual([]);
  });

  test('getAllTools() returns stored tools', () => {
    localStorage.setItem(
      're_tools',
      JSON.stringify([{ id: 't1', title: 'PDN', category: 'calculator', url: '/pdn' }])
    );
    expect(window.getAllTools()).toHaveLength(1);
    expect(window.getAllTools()[0].id).toBe('t1');
  });

  test('saveStoredTools() persists tools to localStorage', () => {
    window.saveStoredTools([{ id: 'esd', title: 'ESD', category: 'analyzer', url: '/esd' }]);
    expect(JSON.parse(localStorage.getItem('re_tools'))[0].id).toBe('esd');
  });
});

// ── isLoggedIn / getAuthUser ──────────────────────────────────────────────────
describe('isLoggedIn / getAuthUser', () => {
  test('isLoggedIn() returns false when flag is absent', () => {
    expect(window.isLoggedIn()).toBe(false);
  });

  test('isLoggedIn() returns false when flag is set but user is missing', () => {
    localStorage.setItem('re-logged-in', '1');
    expect(window.isLoggedIn()).toBe(false);
  });

  test('isLoggedIn() returns true when flag is set and user is present', () => {
    localStorage.setItem('re-logged-in', '1');
    localStorage.setItem('re_user', JSON.stringify({ id: 'u1', email: 'a@b.com', plan: 'basic' }));
    expect(window.isLoggedIn()).toBe(true);
  });

  test('getAuthUser() returns null when nothing is stored', () => {
    expect(window.getAuthUser()).toBeNull();
  });

  test('getAuthUser() returns the parsed user object', () => {
    const user = { id: 'u1', email: 'a@b.com', role: 'USER', plan: 'advanced' };
    localStorage.setItem('re_user', JSON.stringify(user));
    expect(window.getAuthUser()).toEqual(user);
  });

  test('getAuthUser() returns null on malformed JSON', () => {
    localStorage.setItem('re_user', '{bad json}');
    expect(window.getAuthUser()).toBeNull();
  });
});

// ── renderCourseCard ──────────────────────────────────────────────────────────
describe('renderCourseCard', () => {
  const published = {
    id: 'si',
    title: 'Signal Integrity Academy',
    category: 'si',
    badge: 'cyan',
    modules: 18,
    status: 'published',
    description: 'Master SI from fundamentals.',
    href: 'Trainings/SI/',
    gradient: 'linear-gradient(135deg,#0f2040,#0e3a5c)',
    icon: '',
    createdAt: 0,
  };
  const draft = Object.assign({}, published, { status: 'draft', modules: 0 });

  test('includes title in output', () => {
    expect(window.renderCourseCard(published)).toContain('Signal Integrity Academy');
  });

  test('includes description in output', () => {
    expect(window.renderCourseCard(published)).toContain('Master SI from fundamentals.');
  });

  test('shows "Start Learning" button for published courses', () => {
    expect(window.renderCourseCard(published)).toContain('Start Learning');
  });

  test('shows "Coming Soon" disabled button for draft courses', () => {
    const html = window.renderCourseCard(draft);
    expect(html).toContain('Coming Soon');
    expect(html).not.toContain('Start Learning');
  });

  test('shows module count badge when modules > 0', () => {
    expect(window.renderCourseCard(published)).toContain('18 Modules');
  });

  test('omits module count badge when modules is 0', () => {
    expect(window.renderCourseCard(draft)).not.toContain('Modules');
  });
});

// ── renderToolCard ────────────────────────────────────────────────────────────
describe('renderToolCard', () => {
  const tool = {
    id: 'pdn',
    title: 'PDN Optimizer',
    category: 'calculator',
    description: 'Optimize power delivery networks.',
    url: '/Tools/PDN/pdn-optimizer.html',
  };

  test('includes title', () => {
    expect(window.renderToolCard(tool)).toContain('PDN Optimizer');
  });

  test('includes description', () => {
    expect(window.renderToolCard(tool)).toContain('Optimize power delivery networks.');
  });

  test('includes "Open Tool" link pointing to the correct URL', () => {
    const html = window.renderToolCard(tool);
    expect(html).toContain('Open Tool');
    expect(html).toContain('/Tools/PDN/pdn-optimizer.html');
  });

  test('uses human-readable category label "Calculator"', () => {
    expect(window.renderToolCard(tool)).toContain('Calculator');
  });
});

// ── uid ───────────────────────────────────────────────────────────────────────
describe('uid', () => {
  test('returns a non-empty string', () => {
    expect(typeof window.uid()).toBe('string');
    expect(window.uid().length).toBeGreaterThan(0);
  });

  test('generates unique values across many calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => window.uid()));
    expect(ids.size).toBe(200);
  });
});

// ── reGetToken ────────────────────────────────────────────────────────────────
describe('reGetToken', () => {
  test('returns empty string when no session is stored', () => {
    expect(window.reGetToken()).toBe('');
  });

  test('returns the accessToken from a stored session', () => {
    localStorage.setItem(
      're_session',
      JSON.stringify({ accessToken: 'tok-abc', refreshToken: 'ref-xyz' })
    );
    expect(window.reGetToken()).toBe('tok-abc');
  });
});

// ── reApiFetch ────────────────────────────────────────────────────────────────
describe('reApiFetch', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.setItem(
      're_session',
      JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    );
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('adds Authorization header with current token', async () => {
    global.fetch.mockResolvedValueOnce({ status: 200 });
    await window.reApiFetch('/api/test');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-1' }),
      })
    );
  });

  test('returns response directly for non-401 status', async () => {
    const fakeRes = { status: 200 };
    global.fetch.mockResolvedValueOnce(fakeRes);
    const result = await window.reApiFetch('/api/test');
    expect(result).toBe(fakeRes);
  });

  test('returns the 401 response as-is when the error is NOT about token expiry', async () => {
    const fakeRes = {
      status: 401,
      clone: () => ({ json: () => Promise.resolve({ error: 'Unauthorized' }) }),
    };
    global.fetch.mockResolvedValueOnce(fakeRes);
    const result = await window.reApiFetch('/api/test');
    expect(result).toBe(fakeRes);
  });

  test('retries with a new token after a successful token refresh', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 401,
        clone: () => ({ json: () => Promise.resolve({ error: 'Token expired' }) }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({ success: true, accessToken: 'access-2', refreshToken: 'refresh-2' }),
      })
      .mockResolvedValueOnce({ status: 200 });

    const result = await window.reApiFetch('/api/protected');

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ status: 200 });
    // Session is updated with new tokens
    expect(JSON.parse(localStorage.getItem('re_session')).accessToken).toBe('access-2');
  });

  test('rejects and clears session when refresh fails (no refreshToken)', async () => {
    localStorage.setItem('re_session', JSON.stringify({ accessToken: 'access-1' })); // no refreshToken
    global.fetch.mockResolvedValueOnce({
      status: 401,
      clone: () => ({ json: () => Promise.resolve({ error: 'Token expired' }) }),
    });

    // Suppress jsdom's "not implemented" navigation warning
    const origHref = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', { writable: true, value: { href: '' } });

    await expect(window.reApiFetch('/api/protected')).rejects.toThrow();

    if (origHref) Object.defineProperty(window, 'location', origHref);
  });
});
