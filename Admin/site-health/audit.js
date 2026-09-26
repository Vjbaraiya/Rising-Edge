/**
 * Rising Edge — Client-Side Site Audit Engine
 * /Admin/site-health/audit.js
 *
 * Auto-discovers every page/CSS/JS/image file in the site via the
 * server-side /api/site-health/scan endpoint (server.js walks the same
 * directory tree express.static serves), then fetches and checks the
 * health of every one of them — no hand-maintained page list to keep
 * in sync as pages get added.
 *
 *   SiteAudit.onProgress(fn)  — called as (done, total) while running
 *   SiteAudit.onResult(fn)    — called once per item as it resolves
 *   SiteAudit.onComplete(fn)  — called with {pages, css, js, images} when done
 *   SiteAudit.run()           — starts the audit
 */

(function (global) {
  'use strict';

  /* Used only if /api/site-health/scan is unreachable (e.g. opened via
     file://, or the API is down) so the tool still shows *something*
     rather than failing outright. */
  var FALLBACK_PAGES = ['home.html', 'Admin/site-health/site-health.html'];

  /* Relative path from /Admin/site-health/ up to site root, used when
     fetching each discovered page's HTML. The scan API itself is always
     fetched from the server root ('/api/...'), independent of this.
     Can be overridden via SiteAudit._rootOverride before calling run(). */
  var DEFAULT_ROOT = '../../';

  /* ── Path helpers (browser has no Node `path` module) ─────────────────── */
  function normalizeSegments(p) {
    var segs = p.split('/');
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (s === '' || s === '.') continue;
      if (s === '..') out.pop();
      else out.push(s);
    }
    return out.join('/');
  }

  function resolveLink(currentPagePath, link) {
    if (link.charAt(0) === '/') return normalizeSegments(link.slice(1));
    var dirParts = currentPagePath.split('/');
    dirParts.pop(); // drop the filename, keep the directory
    return normalizeSegments(dirParts.concat(link.split('/')).join('/'));
  }

  function looksTemplated(link) {
    return /[{}$]/.test(link);
  }

  /* ── Page structural + link-integrity checks ──────────────────────────── */
  function assess(html, path, knownPages, knownCss, knownJs) {
    var issues = [];
    var warnings = [];

    if (!html) {
      return {
        ok: false,
        status: 'error',
        issues: ['File not reachable / fetch failed'],
        warnings: [],
        lines: 0,
      };
    }

    var lines = html.split('\n').length;

    // 0. HTML fragments / render-time templates are injected as innerHTML by a
    // renderer (e.g. certificate-renderer.js) — they intentionally have no
    // <html>/<head>/<body>, viewport, core.js or theme init. Skip the
    // full-document structural checks for them and report as healthy.
    var FRAGMENT_TEMPLATES = [
      'Certificate/templates/certificate-template.html',
      'Certificate/templates/challenge-certificate-template.html',
      'Certificate/templates/email-template.html',
    ];
    if (FRAGMENT_TEMPLATES.indexOf(path) !== -1) {
      return {
        ok: true,
        status: 'healthy',
        issues: [],
        warnings: [],
        lines: lines,
        sizeKb: Math.round((html.length / 1024) * 10) / 10,
      };
    }

    // 1. DOCTYPE
    if (!/<!DOCTYPE\s+html/i.test(html)) {
      issues.push('Missing <!DOCTYPE html>');
    }

    // 2. Closing </html>
    if (!/<\/html>/i.test(html)) {
      issues.push('Missing </html> — possible truncation');
    }

    // 3. Closing </body>
    if (!/<\/body>/i.test(html)) {
      issues.push('Missing </body> — possible truncation');
    }

    // 4. core.js reference
    var MINIMAL_NO_CORE = [
      'hello.html',
      'pages/test.html',
      'Admin/site-health/site-health.html',
      'Admin/site-health/index.html',
      'Certificate/templates/email-template.html',
      'Certificate/templates/certificate-template.html',
    ];
    if (!/core\.js/i.test(html) && MINIMAL_NO_CORE.indexOf(path) === -1) {
      warnings.push('No core.js reference');
    }

    // 5. Theme init script
    var MINIMAL_NO_THEME = [
      'hello.html',
      'pages/test.html',
      'Admin/site-health/site-health.html',
      'Certificate/templates/email-template.html',
      'Certificate/templates/certificate-template.html',
    ];
    if (
      !/localStorage\.getItem\(['"]re-theme['"]\)/i.test(html) &&
      MINIMAL_NO_THEME.indexOf(path) === -1
    ) {
      warnings.push('No theme-init inline script');
    }

    // 6. Viewport meta
    if (!/name=["']viewport["']/i.test(html)) {
      issues.push('Missing viewport meta tag');
    }

    // 7. <title> (allow attributes, e.g. <title id="page-title">)
    if (!/<title[^>]*>/i.test(html)) {
      warnings.push('No <title> tag');
    }

    // 8. Internal link integrity — cross-check every local .html/.css/.js
    // reference against the auto-discovered file lists, rather than the
    // old regex-only "suspicious path" heuristic.
    (function checkLinks() {
      var htmlHrefRe = /href=["']([^"'#?]+\.html)["']/gi;
      var cssHrefRe = /<link[^>]+href=["']([^"']+\.css)["']/gi;
      var jsSrcRe = /<script[^>]+src=["']([^"']+\.js)["']/gi;
      var m;

      function isExternal(link) {
        return /^(https?:|mailto:|tel:|#|\/\/)/.test(link);
      }

      while ((m = htmlHrefRe.exec(html)) !== null) {
        var lnk = m[1];
        if (isExternal(lnk) || looksTemplated(lnk)) continue;
        var resolved = resolveLink(path, lnk);
        if (knownPages && !knownPages.has(resolved)) {
          issues.push('Broken link → ' + lnk + ' (resolves to ' + resolved + ', not found)');
        }
      }
      while ((m = cssHrefRe.exec(html)) !== null) {
        var clnk = m[1];
        if (isExternal(clnk) || looksTemplated(clnk)) continue;
        var cresolved = resolveLink(path, clnk);
        if (knownCss && !knownCss.has(cresolved)) {
          warnings.push('Stylesheet not found → ' + clnk);
        }
      }
      while ((m = jsSrcRe.exec(html)) !== null) {
        var jlnk = m[1];
        if (isExternal(jlnk) || looksTemplated(jlnk)) continue;
        var jresolved = resolveLink(path, jlnk);
        if (knownJs && !knownJs.has(jresolved)) {
          warnings.push('Script not found → ' + jlnk);
        }
      }
    })();

    // 9. Script error markers
    if (/undefined is not a function|TypeError|ReferenceError/.test(html)) {
      warnings.push('Possible inline script error text in HTML');
    }

    // 10. Very short file (< 40 lines is likely stub or truncated)
    if (lines < 40) {
      warnings.push('Very short (' + lines + ' lines) — stub or minimal page');
    }

    // 11. Inline JS syntax check — parse every <script> block with new Function()
    (function () {
      var scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
      var sm;
      var blockIndex = 0;
      while ((sm = scriptRe.exec(html)) !== null) {
        var attrs = sm[1] || '';
        var body = sm[2] || '';
        if (/\bsrc\s*=/i.test(attrs)) continue;
        if (/\btype\s*=\s*["'][^"']*(json|template|text\/html)[^"']*["']/i.test(attrs)) continue;
        if (!body.trim()) continue;
        blockIndex++;
        try {
          new Function(body);
        } catch (e) {
          issues.push('JS syntax error in inline <script> block #' + blockIndex + ': ' + e.message);
        }
      }
    })();

    var status = 'healthy';
    if (issues.length > 0) status = 'error';
    else if (warnings.length > 0) status = 'warning';

    return {
      ok: issues.length === 0,
      status: status,
      issues: issues,
      warnings: warnings,
      lines: lines,
      sizeKb: Math.round((html.length / 1024) * 10) / 10,
    };
  }

  /* ── Asset checks (CSS / JS / images) ──────────────────────────────────── */
  function assessCss(text) {
    var issues = [];
    if (text == null) return { ok: false, status: 'error', issues: ['Unreachable'] };
    if (!text.trim()) issues.push('Empty file');
    return {
      ok: issues.length === 0,
      status: issues.length ? 'warning' : 'healthy',
      issues: issues,
      sizeKb: Math.round((text.length / 1024) * 10) / 10,
    };
  }

  function assessJs(text) {
    var issues = [];
    if (text == null) return { ok: false, status: 'error', issues: ['Unreachable'] };
    if (!text.trim()) {
      issues.push('Empty file');
    } else {
      try {
        new Function(text);
      } catch (e) {
        issues.push('JS syntax error: ' + e.message);
      }
    }
    return {
      ok: issues.length === 0,
      status: issues.length ? 'error' : 'healthy',
      issues: issues,
      sizeKb: Math.round((text.length / 1024) * 10) / 10,
    };
  }

  /* ── Public API ───────────────────────────────────────────────────────── */
  var _onResult = null;
  var _onComplete = null;
  var _onProgress = null;

  function discoverFiles() {
    return fetch('/api/site-health/scan', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.success) throw new Error('scan API returned failure');
        return {
          pages: j.pages || [],
          css: j.css || [],
          js: j.js || [],
          images: j.images || [],
        };
      })
      .catch(function () {
        return { pages: FALLBACK_PAGES.slice(), css: [], js: [], images: [] };
      });
  }

  var SiteAudit = {
    _assess: assess, // exposed for unit testing
    _resolveLink: resolveLink,
    onResult: function (fn) {
      _onResult = fn;
    },
    onComplete: function (fn) {
      _onComplete = fn;
    },
    onProgress: function (fn) {
      _onProgress = fn;
    },

    run: function () {
      var self = this;
      var ROOT = this._rootOverride !== undefined ? this._rootOverride : DEFAULT_ROOT;

      if (location.protocol === 'file:') {
        if (_onComplete) _onComplete({ pages: [], css: [], js: [], images: [] });
        console.warn('SiteAudit: fetch() requires HTTP. Serve site via http:// for live audit.');
        return;
      }

      discoverFiles().then(function (discovered) {
        var knownPages = new Set(discovered.pages);
        var knownCss = new Set(discovered.css);
        var knownJs = new Set(discovered.js);

        var total =
          discovered.pages.length +
          discovered.css.length +
          discovered.js.length +
          discovered.images.length;
        var done = 0;
        var results = { pages: [], css: [], js: [], images: [] };

        if (total === 0) {
          if (_onComplete) _onComplete(results);
          return;
        }

        function tick() {
          done++;
          if (_onProgress) _onProgress(done, total);
          if (done === total && _onComplete) _onComplete(results);
        }

        discovered.pages.forEach(function (p) {
          fetch(ROOT + p, { cache: 'no-cache' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.text();
            })
            .then(function (html) {
              var a = assess(html, p, knownPages, knownCss, knownJs);
              var result = { kind: 'page', path: p, found: true, assessment: a };
              results.pages.push(result);
              if (_onResult) _onResult(result);
              tick();
            })
            .catch(function (err) {
              var result = {
                kind: 'page',
                path: p,
                found: false,
                assessment: {
                  ok: false,
                  status: 'missing',
                  issues: ['File not found or unreachable (' + err.message + ')'],
                  warnings: [],
                  lines: 0,
                  sizeKb: 0,
                },
              };
              results.pages.push(result);
              if (_onResult) _onResult(result);
              tick();
            });
        });

        discovered.css.forEach(function (p) {
          fetch(ROOT + p, { cache: 'no-cache' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.text();
            })
            .then(function (text) {
              var a = assessCss(text);
              var result = { kind: 'css', path: p, found: true, assessment: a };
              results.css.push(result);
              if (_onResult) _onResult(result);
              tick();
            })
            .catch(function (err) {
              var result = {
                kind: 'css',
                path: p,
                found: false,
                assessment: {
                  ok: false,
                  status: 'missing',
                  issues: ['Unreachable: ' + err.message],
                },
              };
              results.css.push(result);
              if (_onResult) _onResult(result);
              tick();
            });
        });

        discovered.js.forEach(function (p) {
          fetch(ROOT + p, { cache: 'no-cache' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.text();
            })
            .then(function (text) {
              var a = assessJs(text);
              var result = { kind: 'js', path: p, found: true, assessment: a };
              results.js.push(result);
              if (_onResult) _onResult(result);
              tick();
            })
            .catch(function (err) {
              var result = {
                kind: 'js',
                path: p,
                found: false,
                assessment: {
                  ok: false,
                  status: 'missing',
                  issues: ['Unreachable: ' + err.message],
                },
              };
              results.js.push(result);
              if (_onResult) _onResult(result);
              tick();
            });
        });

        discovered.images.forEach(function (p) {
          fetch(ROOT + p, { cache: 'no-cache', method: 'HEAD' })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              var result = {
                kind: 'image',
                path: p,
                found: true,
                assessment: { ok: true, status: 'healthy', issues: [] },
              };
              results.images.push(result);
              if (_onResult) _onResult(result);
              tick();
            })
            .catch(function (err) {
              var result = {
                kind: 'image',
                path: p,
                found: false,
                assessment: {
                  ok: false,
                  status: 'missing',
                  issues: ['Unreachable: ' + err.message],
                },
              };
              results.images.push(result);
              if (_onResult) _onResult(result);
              tick();
            });
        });
      });
    },
  };

  global.SiteAudit = SiteAudit;
})(window);
