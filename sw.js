/**
 * Rising Edge Technologies — Service Worker
 * Strategy:
 *   - Static assets (CSS, JS, fonts, images): Cache-first, background update
 *   - HTML pages: Network-first, fall back to cache
 *   - /api/*: Network-only (never cache live data)
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE = 're-static-' + CACHE_VERSION;
const PAGE_CACHE = 're-pages-' + CACHE_VERSION;

/* Assets to pre-cache on install */
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/assets/css/tokens.css',
  '/assets/css/themes.css',
  '/assets/css/base.css',
  '/assets/css/components.css',
  '/assets/css/layouts.css',
  '/assets/css/utilities.css',
  '/assets/css/main.css',
  '/assets/js/core.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
];

/* ── Install: pre-cache static assets ─────────────────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(function (cache) {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(function () {
        return self.skipWaiting(); // activate immediately
      })
  );
});

/* ── Activate: delete old caches ──────────────────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== STATIC_CACHE && key !== PAGE_CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim(); // take control of all open tabs
      })
  );
});

/* ── Fetch: route requests by type ───────────────────────────────── */
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  /* 1. Skip non-GET and cross-origin requests */
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  /* 2. API calls — always network, never cache */
  if (url.pathname.startsWith('/api/')) return;

  /* 3. Static assets (CSS, JS, images, fonts) — cache-first */
  if (
    url.pathname.startsWith('/assets/') ||
    (url.pathname.startsWith('/Trainings/SI/') &&
      (url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.woff2')))
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  /* 4. HTML pages — network-first, fall back to cache */
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(networkFirst(event.request, PAGE_CACHE));
    return;
  }
});

/* ── Strategies ───────────────────────────────────────────────────── */

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) {
        /* Serve from cache and refresh in background */
        fetch(request)
          .then(function (fresh) {
            if (fresh && fresh.ok) cache.put(request, fresh.clone());
          })
          .catch(function () {});
        return cached;
      }
      /* Not in cache — fetch, store, return */
      return fetch(request).then(function (response) {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      });
    });
  });
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return fetch(request)
      .then(function (response) {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(function () {
        return cache.match(request).then(function (cached) {
          return cached || caches.match('/offline.html') || caches.match('/');
        });
      });
  });
}
