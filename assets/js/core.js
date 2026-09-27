/* ═══════════════════════════════════════════════════════════════════
   RISING EDGE TECHNOLOGIES — Core JS
   Theme · Nav (with Trainings dropdown) · Footer · Bottom Nav
   Dynamic courses + tools from localStorage.
   No dependencies — vanilla ES5-compatible.
═══════════════════════════════════════════════════════════════════ */

/* ── AdSense site verification/loader ────────────────────────────
   Loaded unconditionally on every page, independent of the ad-slot logic
   in assets/js/ads.js. Google's AdSense site-verification crawler needs to
   find this script tag reliably; ads.js only injects it after an async
   fetch to our own /api/ads endpoint confirms no direct campaign is active
   for a given slot on a given page, which is too indirect/conditional for
   verification to depend on. window._reAdsenseLoaded stops ads.js from
   injecting a second copy of the same script later. */
window.RE_ADSENSE_CLIENT = 'ca-pub-2385317738136367';
(function () {
  // Skip in jsdom (unit tests eval this whole file via window.eval — a real
  // network fetch of an external script has no route out of that sandbox
  // and would hang the test instead of failing fast). Real browsers never
  // have "jsdom" in their user agent.
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return;
  var s = document.createElement('script');
  s.async = true;
  s.src =
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
    window.RE_ADSENSE_CLIENT;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
  window._reAdsenseLoaded = true;
})();

/* ── 0. AUTH UTILITIES (reApiFetch / reGetToken) ─────────────────── */
(function () {
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem('re_session') || '{}');
    } catch (e) {
      return {};
    }
  }
  function saveSession(s) {
    localStorage.setItem('re_session', JSON.stringify(s));
  }

  function doRefresh() {
    return fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) throw new Error(d.error || 'Session expired. Please log in again.');
        saveSession({ accessToken: d.accessToken });
        return d.accessToken;
      });
  }

  /* Public: read current access token */
  window.reGetToken = function () {
    return getSession().accessToken || '';
  };

  /* Public: fetch wrapper — auto-refreshes on 401 token-expired, redirects on failure */
  window.reApiFetch = function (url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {});
    opts.headers['Authorization'] = 'Bearer ' + reGetToken();

    return fetch(url, opts).then(function (r) {
      if (r.status !== 401) return r;
      return r
        .clone()
        .json()
        .then(function (body) {
          var msg = (body.error || '').toLowerCase();
          if (msg.indexOf('expired') === -1 && msg.indexOf('invalid token') === -1) return r;
          // Token expired — try refresh then retry once
          return doRefresh()
            .then(function (newToken) {
              opts.headers['Authorization'] = 'Bearer ' + newToken;
              return fetch(url, opts);
            })
            .catch(function (refreshErr) {
              localStorage.removeItem('re_session');
              localStorage.removeItem('re_user');
              localStorage.removeItem('re-logged-in');
              var base = window.location.pathname.split('/').slice(0, -1).join('/');
              var loginPath =
                base.indexOf('Admin') !== -1
                  ? '../Login-pages/login.html'
                  : '/Login-pages/login.html';
              window.location.href = loginPath + '?expired=1';
              return Promise.reject(refreshErr);
            });
        });
    });
  };
})();

/* ── 1. THEME SYSTEM ──────────────────────────────────────────────── */
var Theme = (function () {
  var KEY = 're-theme';
  var THEMES = ['dark', 'light', 'night'];
  function get() {
    return localStorage.getItem(KEY) || 'dark';
  }
  function set(t) {
    if (THEMES.indexOf(t) === -1) t = 'dark';
    localStorage.setItem(KEY, t);
    document.documentElement.dataset.theme = t;
    _updateToggle(t);
  }
  function next() {
    var idx = (THEMES.indexOf(get()) + 1) % THEMES.length;
    set(THEMES[idx]);
  }
  function init() {
    document.documentElement.dataset.theme = get();
  }
  function _updateToggle(t) {
    document.querySelectorAll('.g-theme-btn').forEach(function (btn) {
      btn.title = t.charAt(0).toUpperCase() + t.slice(1) + ' theme (click to cycle)';
    });
  }
  init();
  return { get: get, set: set, next: next, init: init };
})();

/* ── 2. ASSETS ROOT (depth-aware path) ───────────────────────────── */
// Depth is derived from the <script src> attribute of core.js itself.
// Counting '../' occurrences works for both file:// and http:// without
// being misled by Windows drive letters in the pathname.
function _siteDepth() {
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var raw = scripts[i].getAttribute('src') || '';
    if (raw.indexOf('assets/js/core.js') !== -1) {
      return (raw.match(/\.\.\//g) || []).length;
    }
  }
  return 0;
}
function assetsRoot() {
  var d = _siteDepth();
  if (d === 0) return 'assets/';
  return Array(d).fill('..').join('/') + '/assets/';
}
function rootPath() {
  var d = _siteDepth();
  if (d === 0) return '';
  return Array(d).fill('..').join('/') + '/';
}

/* ── 3. DATA — COURSES (merged default + localStorage) ───────────── */
var DEFAULT_COURSES = [
  {
    id: 'si',
    title: 'Signal Integrity Academy',
    category: 'si',
    badge: 'cyan',
    modules: 18,
    status: 'published',
    description: 'Master SI from fundamentals to advanced topics.',
    href: 'Trainings/SI/',
    gradient: 'linear-gradient(135deg,#0f2040,#0e3a5c)',
    icon: '<svg width="40" height="40" fill="none" stroke="var(--cyan-400)" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    createdAt: 0,
  },
  {
    id: 'hw',
    title: 'PCB Design Mastery',
    category: 'hw',
    badge: 'blue',
    modules: 0,
    status: 'draft',
    description: 'High-density multi-layer PCB design for every board layer.',
    href: 'trainings.html',
    gradient: 'linear-gradient(135deg,#1a0a30,#2d1060)',
    icon: '<svg width="40" height="40" fill="none" stroke="var(--primary-300)" stroke-width="1.5" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>',
    createdAt: 1,
  },
  {
    id: 'fw',
    title: 'Embedded Systems & RTOS',
    category: 'fw',
    badge: 'green',
    modules: 0,
    status: 'draft',
    description: 'Bare-metal and RTOS development for industrial systems.',
    href: 'trainings.html',
    gradient: 'linear-gradient(135deg,#012010,#033a1a)',
    icon: '<svg width="40" height="40" fill="none" stroke="var(--success)" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    createdAt: 2,
  },
];

function getStoredCourses() {
  try {
    return JSON.parse(localStorage.getItem('re_courses') || '[]');
  } catch (e) {
    return [];
  }
}
function getAllCourses() {
  var stored = getStoredCourses();
  // Build a map of stored courses by id so defaults can be overridden
  var storedMap = {};
  stored.forEach(function (c) {
    storedMap[c.id] = c;
  });
  var defaultIds = {};
  var defaults = DEFAULT_COURSES.map(function (c) {
    defaultIds[c.id] = true;
    return storedMap[c.id] ? storedMap[c.id] : c;
  });
  // Append custom (non-default) stored courses
  var custom = stored.filter(function (c) {
    return !defaultIds[c.id];
  });
  return defaults.concat(custom);
}
function saveStoredCourses(arr) {
  localStorage.setItem('re_courses', JSON.stringify(arr));
}

/* ── 4. DATA — TOOLS ──────────────────────────────────────────────── */
var DEFAULT_TOOLS = [];

function getStoredTools() {
  try {
    return JSON.parse(localStorage.getItem('re_tools') || '[]');
  } catch (e) {
    return [];
  }
}
function getAllTools() {
  var stored = getStoredTools();
  var storedMap = {};
  stored.forEach(function (t) {
    storedMap[t.id] = t;
  });
  var defaultIds = {};
  var defaults = DEFAULT_TOOLS.map(function (t) {
    defaultIds[t.id] = true;
    return storedMap[t.id] ? storedMap[t.id] : t;
  });
  return defaults.concat(
    stored.filter(function (t) {
      return !defaultIds[t.id];
    })
  );
}
function saveStoredTools(arr) {
  localStorage.setItem('re_tools', JSON.stringify(arr));
}

/* ── 5. DATA — RESOURCES ──────────────────────────────────────────── */
var DEFAULT_RESOURCES = [];

function getStoredResources() {
  try {
    return JSON.parse(localStorage.getItem('re_resources') || '[]');
  } catch (e) {
    return [];
  }
}
function getAllResources() {
  var stored = getStoredResources();
  var storedMap = {};
  stored.forEach(function (r) {
    storedMap[r.id] = r;
  });
  var defaultIds = {};
  var defaults = DEFAULT_RESOURCES.map(function (r) {
    defaultIds[r.id] = true;
    return storedMap[r.id] ? storedMap[r.id] : r;
  });
  return defaults.concat(
    stored.filter(function (r) {
      return !defaultIds[r.id];
    })
  );
}
function saveStoredResources(arr) {
  localStorage.setItem('re_resources', JSON.stringify(arr));
}

/* ── 6. NAV LINKS ─────────────────────────────────────────────────── */
var NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'Trainings/trainings.html', label: 'Trainings' },
  { href: 'resources/resources.html', label: 'Resources' },
  { href: 'Tools/tools.html', label: 'Tools' },
  { href: 'Jobs/index.html', label: 'Jobs' },
  { href: 'about.html', label: 'About' },
  { href: 'contact.html', label: 'Contact' },
];

var BOTTOM_NAV = [
  {
    href: 'index.html',
    label: 'Home',
    icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  },
  {
    href: 'Trainings/trainings.html',
    label: 'Trainings',
    icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  },
  {
    href: 'Tools/tools.html',
    label: 'Tools',
    icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  },
  {
    href: 'consultancy/consultancy.html',
    label: 'Consulting',
    icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    href: 'about.html',
    label: 'About',
    icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  },
];

/* ── 7. HELPERS ──────────────────────────────────────────────────── */
function svg(d, s) {
  s = s || 18;
  return (
    '<svg width="' +
    s +
    '" height="' +
    s +
    '" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">' +
    d +
    '</svg>'
  );
}
function currentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}
function isActive(href) {
  return currentPage() === href || currentPage() === href.replace('.html', '');
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* ── 8. BUILD TRAININGS DROPDOWN ─────────────────────────────────── */
function buildTrainingsDropdown() {
  var courses = getAllCourses();
  var root = rootPath();
  var items =
    '<a href="' + root + 'Trainings/trainings.html" class="g-dd-item g-dd-all">All Courses</a>';
  courses.forEach(function (c) {
    var href =
      c.href.indexOf('http') === 0 || c.href.indexOf('Trainings') === 0
        ? root + c.href
        : root + c.href;
    var badge =
      c.status === 'published'
        ? ''
        : '<span style="font-size:.625rem;padding:1px 6px;border-radius:20px;background:var(--bg-muted);color:var(--text-faint);margin-left:auto;flex-shrink:0">Soon</span>';
    items +=
      '<a href="' +
      (c.status === 'published' ? href : '#') +
      '" class="g-dd-item' +
      (c.status !== 'published' ? ' g-dd-disabled' : '') +
      '">' +
      '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
      c.title +
      '</span>' +
      badge +
      '</a>';
  });
  return (
    '<div class="g-dropdown" id="g-trainings-dd">' +
    '<button class="g-nav-link g-dd-trigger' +
    (isActive('trainings.html') || isActive('Trainings/trainings.html') ? ' active' : '') +
    '" onclick="toggleDropdown(\'g-trainings-dd\')" aria-haspopup="true" aria-expanded="false">' +
    'Trainings <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="margin-left:3px;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg></button>' +
    '<div class="g-dd-menu" role="menu">' +
    items +
    '</div>' +
    '</div>'
  );
}

/* ── 9. BUILD NAV HTML ───────────────────────────────────────────── */
function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('re_user') || 'null');
  } catch (e) {
    return null;
  }
}
function isLoggedIn() {
  return localStorage.getItem('re-logged-in') === '1' && !!getAuthUser();
}
function navLogout() {
  var s = {};
  try {
    s = JSON.parse(localStorage.getItem('re_session') || '{}');
  } catch (e) {}
  var accessToken = s.accessToken || '';
  function clearAndRedirect() {
    localStorage.removeItem('re-logged-in');
    localStorage.removeItem('re_user');
    localStorage.removeItem('re_pending_email');
    localStorage.removeItem('re_session');
    window.location.href = rootPath() + 'index.html';
  }
  fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
  }).then(clearAndRedirect, clearAndRedirect);
}

/* Auth guard — call at the top of any resource/tool/training content
   page to require registration before the page can be used. Sends
   logged-out visitors to login with a `redirect` back-link so they
   land back on the page they wanted after signing in. */
// Dev mode: when running from a local file (file://) or localhost/127.0.0.1,
// skip the login redirect so pages can be opened directly on a dev machine.
// Never true on the deployed site (real hostnames won't match).
function _isDevEnvironment() {
  if (window.location.protocol === 'file:') return true;
  var h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '';
}

function requireAuth() {
  if (_isDevEnvironment()) return true;
  if (isLoggedIn()) return true;
  var dest =
    rootPath() + 'Login-pages/login.html?redirect=' + encodeURIComponent(window.location.href);
  window.location.replace(dest);
  return false;
}

function buildNavHTML() {
  var loggedIn = isLoggedIn();
  var user = loggedIn ? getAuthUser() : null;
  var isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
  var dashHref = rootPath() + 'User/dashboard.html';
  var adminHref = rootPath() + 'Admin/index.html';

  var links = NAV_LINKS.map(function (l) {
    if (l.dropdown) return buildTrainingsDropdown();
    var cls = isActive(l.href) ? ' active' : '';
    return (
      '<a href="' + rootPath() + l.href + '" class="g-nav-link' + cls + '">' + l.label + '</a>'
    );
  }).join('');

  var mobileLinks = NAV_LINKS.map(function (l) {
    if (l.dropdown) {
      var courses = getAllCourses();
      var root = rootPath();
      var subitems =
        '<a href="' +
        root +
        'Trainings/trainings.html" class="g-mobile-link" style="padding-left:2rem;font-size:.8125rem">All Courses</a>';
      courses.forEach(function (c) {
        subitems +=
          '<a href="' +
          (c.status === 'published' ? root + c.href : '#') +
          '" class="g-mobile-link" style="padding-left:2rem;font-size:.8125rem;opacity:' +
          (c.status === 'published' ? '1' : '.45') +
          '">' +
          c.title +
          (c.status !== 'published' ? ' (Soon)' : '') +
          '</a>';
      });
      return (
        '<div style="font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-faint);padding:12px 0 4px">Trainings</div>' +
        subitems
      );
    }
    var cls = isActive(l.href) ? ' active' : '';
    return (
      '<a href="' + rootPath() + l.href + '" class="g-mobile-link' + cls + '">' + l.label + '</a>'
    );
  }).join('');

  var themeIcons =
    '<span class="g-theme-icon">' +
    '<svg class="icon-dark"  width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
    '<svg class="icon-light" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
    '<svg class="icon-night" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.5 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0zm-5.5-9V1m0 22v-2M4.22 4.22 2.8 2.8m18.38 18.38-1.42-1.42M3 12H1m22 0h-2M4.22 19.78 2.8 21.2M21.18 2.8l-1.42 1.42"/></svg>' +
    '</span>';

  /* ── auth controls ── */
  var authHTML;
  if (loggedIn && user) {
    var displayName = user.fullName || user.email || 'My Account';
    var initials =
      displayName
        .split(' ')
        .map(function (w) {
          return w[0] || '';
        })
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';
    var adminBadge = isAdmin
      ? '<span style="font-size:.625rem;font-weight:700;letter-spacing:.06em;padding:1px 6px;border-radius:20px;background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.25);margin-left:4px">' +
        (user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin') +
        '</span>'
      : '';
    var userDash = isAdmin ? adminHref : dashHref;
    authHTML =
      '' +
      '<a href="' +
      userDash +
      '" class="g-user-chip" title="Go to dashboard">' +
      '<span class="g-user-av">' +
      initials +
      '</span>' +
      '<span class="g-user-name">' +
      displayName +
      adminBadge +
      '</span>' +
      '</a>' +
      '<button class="btn btn-outline btn-sm g-login-btn" onclick="navLogout()">Log Out</button>';
  } else {
    authHTML =
      '<a href="' +
      rootPath() +
      'Login-pages/login.html" class="btn btn-primary btn-sm g-login-btn">Log In</a>';
  }

  /* ── mobile auth ── */
  var mobileAuthHTML =
    loggedIn && user
      ? '<div style="padding-top:16px;border-top:1px solid var(--border);margin-top:8px">' +
        '<a href="' +
        (isAdmin ? adminHref : dashHref) +
        '" class="g-mobile-link" style="font-weight:700">' +
        '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ' +
        (user.fullName || user.email || 'My Account') +
        (isAdmin ? ' (Admin)' : '') +
        '</a>' +
        '<button onclick="navLogout();closeMobileMenu()" class="g-mobile-link" style="background:none;border:none;cursor:pointer;width:100%;text-align:left;color:var(--danger);font-weight:600">' +
        '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Log Out' +
        '</button>' +
        '</div>'
      : '<div style="padding-top:16px;border-top:1px solid var(--border);margin-top:8px">' +
        '<a href="' +
        rootPath() +
        'Login-pages/login.html" class="btn btn-primary btn-sm" style="width:100%;justify-content:center" onclick="closeMobileMenu()">Log In</a>' +
        '</div>';

  return (
    '<header class="g-header" role="banner">' +
    '<div class="g-header-inner">' +
    '<a href="' +
    rootPath() +
    'index.html" class="g-logo" aria-label="Rising Edge home">' +
    '<img src="' +
    assetsRoot() +
    'images/RE_Logo.png" alt="Rising Edge Technologies" class="g-logo-img"/>' +
    '</a>' +
    '<nav class="g-nav-links" aria-label="Primary">' +
    links +
    '</nav>' +
    '<div class="g-nav-actions">' +
    '<button class="g-theme-btn" id="g-theme-btn" onclick="Theme.next()" aria-label="Toggle theme" title="Toggle theme">' +
    themeIcons +
    '</button>' +
    authHTML +
    '<button class="g-hamburger" id="g-hamburger" aria-expanded="false" aria-label="Open menu" onclick="toggleMobileMenu()">' +
    svg(
      '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
      20
    ) +
    '</button>' +
    '</div>' +
    '</div>' +
    '</header>' +
    '<div class="g-mobile-menu" id="g-mobile-menu" role="navigation" aria-label="Mobile menu">' +
    mobileLinks +
    mobileAuthHTML +
    '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">' +
    '<div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-faint);margin-bottom:12px">Theme</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-sm btn-outline" onclick="Theme.set(\'dark\');closeMobileMenu()">Dark</button>' +
    '<button class="btn btn-sm btn-outline" onclick="Theme.set(\'light\');closeMobileMenu()">Light</button>' +
    '<button class="btn btn-sm btn-outline" onclick="Theme.set(\'night\');closeMobileMenu()">Night</button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/* ── 10. BUILD FOOTER HTML ───────────────────────────────────────── */
function buildFooterHTML() {
  var root = rootPath();
  // Latest 4 courses for footer
  var allC = getAllCourses()
    .slice()
    .sort(function (a, b) {
      return b.createdAt - a.createdAt;
    })
    .slice(0, 4);
  var courseLinks = allC
    .map(function (c) {
      return (
        '<a href="' +
        (c.status === 'published' ? root + c.href : root + 'Trainings/trainings.html') +
        '">' +
        c.title +
        '</a>'
      );
    })
    .join('');

  return (
    '<footer class="g-footer" role="contentinfo">' +
    '<div class="container">' +
    '<div class="g-footer-grid">' +
    '<div class="g-footer-col g-footer-brand">' +
    '<a href="' +
    root +
    'index.html" class="g-logo" style="margin-bottom:12px">' +
    '<img src="' +
    assetsRoot() +
    'images/RE_Logo.png" alt="Rising Edge Technologies" class="g-logo-img"/>' +
    '</a>' +
    '<p style="font-size:.8125rem;color:var(--text-muted);line-height:1.7;max-width:240px;margin-top:8px">Engineering precision for a high-speed world.</p>' +
    '<form onsubmit="return reNewsletterSubmit(this)" style="margin-top:14px;display:flex;gap:6px;max-width:240px">' +
    '<input type="email" name="email" required placeholder="Your email" aria-label="Email for newsletter" ' +
    'style="flex:1;min-width:0;padding:8px 10px;font-size:.8125rem;background:var(--bg-muted);border:1px solid var(--border);border-radius:8px;color:var(--text-base)"/>' +
    '<button type="submit" class="btn btn-primary btn-sm">Subscribe</button>' +
    '</form>' +
    '<p class="g-newsletter-msg" style="font-size:.75rem;margin-top:6px;display:none"></p>' +
    '</div>' +
    '<div class="g-footer-col"><h4>Courses</h4><div class="g-footer-links">' +
    courseLinks +
    '</div></div>' +
    '<div class="g-footer-col"><h4>Platform</h4><div class="g-footer-links">' +
    '<a href="' +
    root +
    'User/my-learning.html">My Learning</a>' +
    '<a href="' +
    root +
    'User/certificates.html">Certificates</a>' +
    '<a href="#">Community Forum</a>' +
    '</div></div>' +
    '<div class="g-footer-col"><h4>Company</h4><div class="g-footer-links">' +
    '<a href="' +
    root +
    'about.html">About</a>' +
    '<a href="' +
    root +
    'consultancy/consultancy.html">Consultancy</a>' +
    '<a href="' +
    root +
    'Tools/tools.html">Tools</a>' +
    '<a href="' +
    root +
    'contact.html">Contact</a>' +
    '</div></div>' +
    '<div class="g-footer-col"><h4>Support</h4><div class="g-footer-links">' +
    '<a href="' +
    root +
    'contact.html">Help Center</a>' +
    '<a href="#">Terms of Service</a>' +
    '<a href="#">Privacy Policy</a>' +
    '</div></div>' +
    '</div>' +
    '<div class="g-footer-bottom">' +
    '<span class="g-footer-copy">&copy; ' +
    new Date().getFullYear() +
    ' Rising Edge Technologies. Engineering Precision in every bit and byte.</span>' +
    '<div class="g-social-btns">' +
    '<a href="https://www.instagram.com/risingedgetech/" class="g-social-btn" aria-label="Instagram">' +
    svg(
      '<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r="1"/>',
      16
    ) +
    '</a>' +
    '<a href="https://www.linkedin.com/in/rising-edge-tech/" class="g-social-btn" aria-label="LinkedIn">' +
    svg(
      '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
      16
    ) +
    '</a>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</footer>'
  );
}

/* ── 11. BUILD BOTTOM NAV ─────────────────────────────────────────── */
function buildBottomNavHTML() {
  var root = rootPath();
  var items = BOTTOM_NAV.map(function (item) {
    var cls = isActive(item.href) ? ' active' : '';
    return (
      '<a href="' +
      root +
      item.href +
      '" class="g-bn-item' +
      cls +
      '" aria-label="' +
      item.label +
      '">' +
      item.icon +
      '<span class="g-bn-label">' +
      item.label +
      '</span></a>'
    );
  }).join('');
  return '<nav class="g-bottom-nav" aria-label="Mobile bottom navigation">' + items + '</nav>';
}

/* ── 12. INJECT COMPONENTS ───────────────────────────────────────── */
function injectComponents() {
  var nav = document.getElementById('global-nav');
  if (nav) nav.innerHTML = buildNavHTML();
  var footer = document.getElementById('global-footer');
  if (footer) footer.innerHTML = buildFooterHTML();
  var bn = document.getElementById('global-bottom-nav');
  if (bn) bn.innerHTML = buildBottomNavHTML();
}

/* ── 13. DROPDOWN ────────────────────────────────────────────────── */
function toggleDropdown(id) {
  var dd = document.getElementById(id);
  if (!dd) return;
  var open = dd.classList.toggle('open');
  var trigger = dd.querySelector('.g-dd-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', String(open));
}

document.addEventListener('click', function (e) {
  // Close dropdowns when clicking outside
  if (!e.target.closest('.g-dropdown')) {
    document.querySelectorAll('.g-dropdown.open').forEach(function (d) {
      d.classList.remove('open');
    });
  }
  // Close mobile menu when clicking outside
  var menu = document.getElementById('g-mobile-menu');
  if (
    menu &&
    menu.classList.contains('open') &&
    !e.target.closest('#g-mobile-menu') &&
    !e.target.closest('#g-hamburger')
  ) {
    closeMobileMenu();
  }
});

/* ── 14. HAMBURGER / MOBILE MENU ─────────────────────────────────── */
function toggleMobileMenu() {
  var menu = document.getElementById('g-mobile-menu');
  var btn = document.getElementById('g-hamburger');
  if (!menu) return;
  var open = menu.classList.toggle('open');
  if (btn) btn.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
function closeMobileMenu() {
  var menu = document.getElementById('g-mobile-menu');
  var btn = document.getElementById('g-hamburger');
  if (menu) menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ── 15. MODULE DRAWER ───────────────────────────────────────────── */
function toggleModuleDrawer() {
  var d = document.getElementById('module-drawer');
  var t = document.getElementById('module-toggle');
  if (d) d.classList.toggle('open');
  if (t) t.classList.toggle('open');
}

/* ── 16. FILTERS ─────────────────────────────────────────────────── */
function filterCards(cat, btn) {
  if (btn) {
    var group =
      btn.closest('[data-filter-group]') || btn.closest('.filter-pills') || btn.parentElement;
    if (group)
      group.querySelectorAll('.filter-pill').forEach(function (p) {
        p.classList.remove('active');
      });
    btn.classList.add('active');
  }
  document.querySelectorAll('[data-category]').forEach(function (el) {
    el.style.display = cat === 'all' || el.dataset.category === cat ? '' : 'none';
  });
}

function initFilters() {
  document.querySelectorAll('.filter-pill[data-filter]').forEach(function (pill) {
    pill.addEventListener('click', function () {
      filterCards(pill.dataset.filter, pill);
    });
  });
  var searchInput = document.querySelector('[data-search]');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = this.value.toLowerCase().trim();
      document.querySelectorAll('[data-searchable]').forEach(function (el) {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
}

/* ── 17. RENDER HELPERS (used by trainings / tools / resources pages) */
var BADGE_MAP = { si: 'cyan', hw: 'blue', fw: 'green', emc: 'orange', custom: 'purple' };
var CATEGORY_LABEL = {
  si: 'Signal Integrity',
  hw: 'Hardware Design',
  fw: 'Firmware',
  emc: 'EMC',
  custom: 'Custom',
  calculator: 'Calculator',
  simulator: 'Simulator',
  estimator: 'Estimator',
  analyzer: 'Analyzer',
  whitepaper: 'Whitepaper',
  guide: 'Guide',
  design: 'Reference Design',
  'case-study': 'Case Study',
};
var BADGE_COLOR = {
  cyan: 'badge-cyan',
  blue: 'badge-blue',
  green: 'badge-green',
  orange: 'badge-orange',
  purple: 'badge-purple',
  gray: 'badge-gray',
};

function renderCourseCard(c, root) {
  root = root || '';
  var badgeClass = BADGE_COLOR[c.badge || 'gray'] || 'badge-gray';
  var catLabel = CATEGORY_LABEL[c.category] || c.category;
  var href = c.status === 'published' ? root + c.href : '#';
  return (
    '<div class="card training-card card-hover" data-category="' +
    c.category +
    '" data-searchable>' +
    '<div class="training-card-image" style="background:' +
    c.gradient +
    '">' +
    (c.icon || '') +
    '</div>' +
    '<div class="training-card-body">' +
    '<div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-3)">' +
    '<span class="badge ' +
    badgeClass +
    '">' +
    catLabel +
    '</span>' +
    (c.modules ? '<span class="badge badge-gray">' + c.modules + ' Modules</span>' : '') +
    (c.status !== 'published' ? '<span class="badge badge-gray">Coming Soon</span>' : '') +
    '</div>' +
    '<h3 style="font-size:var(--text-md);margin-bottom:var(--sp-2)">' +
    c.title +
    '</h3>' +
    '<p style="font-size:var(--text-sm);color:var(--text-sub);margin-bottom:var(--sp-4)">' +
    c.description +
    '</p>' +
    '<div style="display:flex;align-items:center;justify-content:space-between">' +
    (c.status === 'published'
      ? '<a href="' + href + '" class="btn btn-primary btn-sm">Start Learning</a>'
      : '<button class="btn btn-outline btn-sm" disabled>Coming Soon</button>') +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function renderToolCard(t) {
  var catLabel = CATEGORY_LABEL[t.category] || t.category;
  var iconColor =
    t.category === 'calculator'
      ? 'var(--primary-400)'
      : t.category === 'simulator'
        ? 'var(--cyan-400)'
        : t.category === 'estimator'
          ? 'var(--success)'
          : 'var(--warning)';
  var badgeClass =
    t.category === 'calculator'
      ? 'badge-blue'
      : t.category === 'simulator'
        ? 'badge-cyan'
        : t.category === 'estimator'
          ? 'badge-green'
          : 'badge-orange';
  return (
    '<div class="resource-card card card-hover" data-category="' +
    t.category +
    '" data-searchable>' +
    '<div style="display:flex;align-items:flex-start;gap:var(--sp-4)">' +
    '<div style="width:44px;height:44px;border-radius:var(--radius-md);background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
    '<svg width="20" height="20" fill="none" stroke="' +
    iconColor +
    '" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' +
    '</div>' +
    '<div style="flex:1;min-width:0">' +
    '<span class="badge ' +
    badgeClass +
    '" style="margin-bottom:var(--sp-2)">' +
    catLabel +
    '</span>' +
    '<h3 style="font-size:var(--text-sm);font-weight:var(--weight-semi);margin-bottom:var(--sp-2)">' +
    t.title +
    '</h3>' +
    '<p style="font-size:var(--text-xs);color:var(--text-sub);margin-bottom:var(--sp-4)">' +
    t.description +
    '</p>' +
    '<a href="' +
    t.url +
    '" class="btn btn-secondary btn-sm">Open Tool</a>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/* ── 18. MODAL SYSTEM ────────────────────────────────────────────── */
function openModal(id) {
  var m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(id) {
  var m = document.getElementById(id);
  if (m) {
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
}
// Close on overlay click
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

/* ── 18b. NEWSLETTER SIGNUP (footer) ─────────────────────────────── */
// eslint-disable-next-line no-unused-vars
function reNewsletterSubmit(form) {
  var input = form.querySelector('input[name="email"]');
  var msg = form.parentNode.querySelector('.g-newsletter-msg');
  var btn = form.querySelector('button');
  var email = (input.value || '').trim();
  if (!email) return false;
  btn.disabled = true;
  fetch('/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email }),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (j) {
      if (msg) {
        msg.style.display = 'block';
        msg.style.color = j.success ? 'var(--success)' : 'var(--warning)';
        msg.textContent = j.success
          ? 'Subscribed — thanks!'
          : j.error || 'Could not subscribe. Try again.';
      }
      if (j.success) input.value = '';
    })
    .catch(function () {
      if (msg) {
        msg.style.display = 'block';
        msg.style.color = 'var(--warning)';
        msg.textContent = 'Could not subscribe. Try again.';
      }
    })
    .finally(function () {
      btn.disabled = false;
    });
  return false;
}

/* ── 19. PAGE-VIEW TRACKING — removed: page views/visitors are no longer recorded. */

/* ── 20. INIT ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  injectComponents();
  initFilters();
  Theme.init();
});

/* ── 21. CONTENT SOCIAL (resources/tools) ─────────────────────────────
   The Share/Feedback bar only makes sense on
   a page we actually control, so instead of hand-wiring it onto every
   internal resource/tool page (like training-social.js requires on each
   training lesson), it's auto-injected here: match the current page's
   path against every resource's/tool's stored `url` and, on a hit, load
   content-social.js. This keeps working for any internal page an admin
   points a resource/tool at later, with no per-page script tag needed. */
/* View/visitor/like counts are no longer recorded or shown. These stay as
   no-ops so older cached catalogue pages that still call them keep working. */
window.loadContentSocialChips = function () {};
window.reRecordContentView = function () {};

(function () {
  var path = window.location.pathname;
  if (!/\/(Tools|resources)\//i.test(path)) return; // only relevant directories
  if (document.getElementById('resources-grid') || document.getElementById('tools-grid')) return; // catalogue pages themselves, not a detail page

  function normalize(u) {
    if (!u || /^https?:\/\//i.test(u)) return null; // external — can't match an in-site path
    var clean = u.replace(/^(\.\.\/)+/, '/');
    if (clean.charAt(0) !== '/') clean = '/' + clean;
    return clean.replace(/\/{2,}/g, '/');
  }

  Promise.all([
    fetch('/api/resources')
      .then(function (r) {
        return r.json();
      })
      .catch(function () {
        return null;
      }),
    fetch('/api/tools')
      .then(function (r) {
        return r.json();
      })
      .catch(function () {
        return null;
      }),
  ]).then(function (results) {
    var match = null;
    function scan(list, kind) {
      if (match || !list) return;
      list.forEach(function (item) {
        if (match) return;
        if (normalize(item.url) === path) match = { kind: kind, id: item.id, title: item.title };
      });
    }
    scan(results[0] && results[0].success && results[0].data, 'resource');
    scan(results[1] && results[1].success && results[1].data, 'tool');
    if (!match) return;
    window.RE_CONTENT_MATCH = match;
    var s = document.createElement('script');
    s.src = assetsRoot() + 'js/content-social.js';
    document.body.appendChild(s);
  });
})();

/* ── 22. AD SLOTS ──────────────────────────────────────────────────
   Loaded on every page — assets/js/ads.js decides for itself (via its
   own allow/deny lists) whether this particular page gets a top banner,
   a sticky bottom bar, both, or neither. No per-page markup or script
   tag needed, same as the content-social loader above. */
(function () {
  var s = document.createElement('script');
  s.src = assetsRoot() + 'js/ads.js';
  document.body.appendChild(s);
})();

/* ── 23. STRUCTURED DATA (JSON-LD) ─────────────────────────────────────
   Auto-generates schema.org markup from the DOM/URL every page already has,
   so search engines get BreadcrumbList (any page with a breadcrumb),
   Organization (homepage), Course (training course pages) and Article
   (resource/myth-busting pages) with zero per-page markup. JobPosting is
   injected server-side instead (see server.js) for Google-for-Jobs. */
(function () {
  var SITE = 'https://www.risingedgetech.com';

  function run() {
    try {
      var path = location.pathname.replace(/\/{2,}/g, '/');
      var head = document.head || document.getElementsByTagName('head')[0];
      if (!head) {
        return;
      }

      function abs(href) {
        try {
          return new URL(href, location.href).href;
        } catch (e) {
          return href;
        }
      }
      function meta(name) {
        var el = document.querySelector('meta[name="' + name + '"]');
        return el ? (el.getAttribute('content') || '').trim() : '';
      }
      function h1() {
        var el = document.querySelector('h1');
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
      }
      function canonical() {
        var el = document.querySelector('link[rel="canonical"]');
        return el ? el.getAttribute('href') : location.href.split('#')[0];
      }
      function hasType(t) {
        var found = false;
        document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
          if (s.textContent && s.textContent.indexOf('"' + t + '"') !== -1) {
            found = true;
          }
        });
        return found;
      }
      function emit(obj) {
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(obj).replace(/</g, '\\u003c');
        head.appendChild(s);
      }

      var ORG = { '@type': 'Organization', name: 'Rising Edge Technologies', url: SITE };

      /* BreadcrumbList — from the visible .breadcrumb nav */
      var bc = document.querySelector('.breadcrumb');
      if (bc && !hasType('BreadcrumbList')) {
        var items = [];
        bc.querySelectorAll('a').forEach(function (a) {
          var name = a.textContent.replace(/\s+/g, ' ').trim();
          if (name) {
            items.push({ name: name, url: abs(a.getAttribute('href')) });
          }
        });
        var spans = bc.querySelectorAll('span');
        var last = spans.length ? spans[spans.length - 1] : null;
        if (last) {
          var lt = last.textContent.replace(/\s+/g, ' ').trim();
          if (lt && lt !== '/') {
            items.push({ name: lt });
          }
        }
        if (items.length > 1) {
          emit({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items.map(function (it, i) {
              var li = { '@type': 'ListItem', position: i + 1, name: it.name };
              if (it.url) {
                li.item = it.url;
              }
              return li;
            }),
          });
        }
      }

      /* Organization — homepage only */
      if (
        (path === '/' || path === '/index.html' || path === '/home.html') &&
        !hasType('Organization')
      ) {
        emit({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Rising Edge Technologies',
          url: SITE,
          logo: SITE + '/assets/images/RE_Logo.png',
          description: meta('description') || undefined,
        });
      }

      /* Course — training course hub pages (…/Trainings/<course>/index.html or …/) */
      var isCourseHub =
        /\/Trainings\/.+\/(index\.html)?$/.test(path) && path !== '/Trainings/trainings.html';
      if (isCourseHub && !hasType('Course')) {
        var cname = h1() || (document.title || '').split('|')[0].trim();
        var cdesc = meta('description');
        if (cname && cdesc) {
          emit({
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: cname,
            description: cdesc,
            url: canonical(),
            provider: { '@type': 'Organization', name: ORG.name, sameAs: SITE },
          });
        }
      }

      /* Article — resource / myth-busting pages (not the catalog listing) */
      if (
        path.indexOf('/resources/') === 0 &&
        /\.html?$/.test(path) &&
        path !== '/resources/resources.html' &&
        !hasType('Article')
      ) {
        var aname = h1() || (document.title || '').split('|')[0].trim();
        var adesc = meta('description');
        if (aname) {
          emit({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: aname,
            description: adesc || undefined,
            url: canonical(),
            author: ORG,
            publisher: {
              '@type': 'Organization',
              name: ORG.name,
              logo: {
                '@type': 'ImageObject',
                url: SITE + '/assets/images/RE_Logo.png',
              },
            },
          });
        }
      }
    } catch (e) {
      /* schema is best-effort — never break the page */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

/* ── 24. COOKIE CONSENT (Google Consent Mode v2) ───────────────────────
   The server injects a Consent Mode "default: denied" bootstrap into every
   page's <head> (see server.js), so GA/AdSense storage is off until the
   visitor accepts. This banner flips consent to granted on Accept and
   remembers the choice. Call window.reOpenCookieConsent() (e.g. from a
   footer "Cookie settings" link) to let visitors change it later. */
(function () {
  var KEY = 're-consent';
  var GRANT = {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  };
  var DENY = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  };

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function save(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {}
  }
  function updateConsent(granted) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', granted ? GRANT : DENY);
    }
  }

  function removeBanner() {
    var el = document.getElementById('re-cookie-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function decide(granted) {
    save(granted ? 'granted' : 'denied');
    updateConsent(granted);
    removeBanner();
  }

  function showBanner() {
    if (document.getElementById('re-cookie-banner')) return;
    var wrap = document.createElement('div');
    wrap.id = 're-cookie-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Cookie consent');
    wrap.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;' +
      'max-width:720px;margin:0 auto;background:var(--bg-card,#0f1729);' +
      'color:var(--text-base,#e2e8f0);border:1px solid var(--border,#1f2a44);' +
      'border-radius:14px;padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.45);' +
      'font-size:.85rem;line-height:1.55;display:flex;flex-wrap:wrap;gap:12px;align-items:center';
    wrap.innerHTML =
      '<div style="flex:1;min-width:240px">We use cookies for analytics and ads to improve ' +
      'Rising Edge Technologies. You can accept or decline non-essential cookies. ' +
      '<a href="/consultancy/consultancy.html#privacy" style="color:var(--primary-400,#22d3ee);text-decoration:underline">Learn more</a>.' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" id="re-cc-decline" class="btn btn-outline btn-sm" ' +
      'style="border:1px solid var(--border,#1f2a44);background:transparent;color:var(--text-sub,#94a3b8);' +
      'padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600">Decline</button>' +
      '<button type="button" id="re-cc-accept" class="btn btn-primary btn-sm" ' +
      'style="border:none;background:var(--primary-500,#0ea5b7);color:#fff;' +
      'padding:8px 18px;border-radius:8px;cursor:pointer;font-weight:700">Accept</button>' +
      '</div>';
    (document.body || document.documentElement).appendChild(wrap);
    document.getElementById('re-cc-accept').addEventListener('click', function () {
      decide(true);
    });
    document.getElementById('re-cc-decline').addEventListener('click', function () {
      decide(false);
    });
  }

  // Let a footer link re-open the choice later.
  window.reOpenCookieConsent = function () {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    showBanner();
  };

  function init() {
    var choice = stored();
    if (choice === 'granted') {
      updateConsent(true); // re-affirm on every load (bootstrap already restored)
      return;
    }
    if (choice === 'denied') {
      return; // respected; defaults already deny
    }
    showBanner(); // no choice yet
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
