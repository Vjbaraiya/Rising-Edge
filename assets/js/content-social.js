/* ═══════════════════════════════════════════════════════════════════
   RISING EDGE — Content Social Bar (Like · Share · Feedback)
   Generalized counterpart to assets/js/training-social.js for resources
   and tools. Not included by hand on any page — core.js loads this
   automatically when it detects the current page matches a resource's
   or tool's stored `url` (see core.js, "CONTENT SOCIAL" section), after
   setting window.RE_CONTENT_MATCH = { kind: 'resource'|'tool', id, title }.
   Depends on core.js globals: reApiFetch, isLoggedIn, rootPath.
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var MATCH = window.RE_CONTENT_MATCH;
  if (!MATCH || !MATCH.kind || !MATCH.id) return;
  var KIND = MATCH.kind;
  var ID = MATCH.id;
  var API_BASE = '/api/content/' + encodeURIComponent(KIND) + '/' + encodeURIComponent(ID);

  var pageUrl = window.location.origin + window.location.pathname;
  var pageTitle = MATCH.title || document.title.replace(/\s*\|.*$/, '');

  /* ── styles ───────────────────────────────────────────────────── */
  var css =
    '.cs-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 4px}' +
    '.cs-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;' +
    'border:1px solid var(--border);background:var(--bg-card);color:var(--text-base,inherit);' +
    'font:inherit;font-size:.8125rem;cursor:pointer;transition:border-color .15s}' +
    '.cs-btn:hover{border-color:var(--accent,#06b6d4)}' +
    '.cs-btn.cs-liked{color:#ef4444;border-color:#ef4444}' +
    '.cs-pop{position:absolute;z-index:1001;background:var(--bg-card);border:1px solid var(--border);' +
    'border-radius:12px;padding:8px;display:none;flex-direction:column;gap:2px;min-width:190px;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.35)}' +
    '.cs-pop.open{display:flex}' +
    '.cs-pop button,.cs-pop a{display:flex;align-items:center;gap:8px;padding:8px 10px;border:none;' +
    'background:none;color:var(--text-base,inherit);font:inherit;font-size:.8125rem;cursor:pointer;' +
    'border-radius:8px;text-decoration:none;text-align:left;width:100%}' +
    '.cs-pop button:hover,.cs-pop a:hover{background:rgba(128,128,128,.12)}' +
    '.cs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1002;display:none;' +
    'align-items:center;justify-content:center;padding:1rem}' +
    '.cs-overlay.open{display:flex}' +
    '.cs-modal{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;' +
    'padding:22px;max-width:440px;width:100%}' +
    '.cs-modal textarea{width:100%;background:transparent;border:1px solid var(--border);' +
    'border-radius:8px;color:inherit;font:inherit;font-size:.85rem;padding:10px;resize:vertical}' +
    '.cs-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:1003;' +
    'background:var(--bg-card);border:1px solid var(--border);border-radius:999px;' +
    'padding:8px 18px;font-size:.8125rem;box-shadow:0 8px 30px rgba(0,0,0,.35);' +
    'opacity:0;transition:opacity .2s;pointer-events:none}' +
    '.cs-toast.show{opacity:1}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── helpers ──────────────────────────────────────────────────── */
  function toast(msg) {
    var t = document.getElementById('cs-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cs-toast';
      t.className = 'cs-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.classList.remove('show');
    }, 2600);
  }

  function copyLink(cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pageUrl).then(cb, function () {
        fallbackCopy(cb);
      });
    } else {
      fallbackCopy(cb);
    }
  }
  function fallbackCopy(cb) {
    var ta = document.createElement('textarea');
    ta.value = pageUrl;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      /* ignore */
    }
    document.body.removeChild(ta);
    cb();
  }

  function goLogin() {
    window.location.href =
      rootPath() + 'Login-pages/login.html?redirect=' + encodeURIComponent(window.location.href);
  }

  /* ── build bar ────────────────────────────────────────────────── */
  function buildBar() {
    var bar = document.createElement('div');
    bar.className = 'cs-bar';
    bar.id = 'content-social';

    /* Like */
    var likeBtn = document.createElement('button');
    likeBtn.className = 'cs-btn';
    likeBtn.id = 'cs-like';
    likeBtn.innerHTML = '♥ Like · <span id="cs-like-count">0</span>';
    likeBtn.onclick = function () {
      if (!isLoggedIn()) {
        goLogin();
        return;
      }
      likeBtn.disabled = true;
      reApiFetch(API_BASE + '/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          likeBtn.disabled = false;
          if (!d.success) return;
          likeBtn.classList.toggle('cs-liked', d.data.liked);
          document.getElementById('cs-like-count').textContent = d.data.count;
          toast(d.data.liked ? 'Thanks for the like!' : 'Like removed');
        })
        .catch(function () {
          likeBtn.disabled = false;
        });
    };

    /* Share */
    var shareWrap = document.createElement('div');
    shareWrap.style.position = 'relative';
    var shareBtn = document.createElement('button');
    shareBtn.className = 'cs-btn';
    shareBtn.innerHTML = '↗ Share';
    var pop = document.createElement('div');
    pop.className = 'cs-pop';
    var encUrl = encodeURIComponent(pageUrl);
    var encText = encodeURIComponent(pageTitle + ' — ' + pageUrl);
    pop.innerHTML =
      '<button id="cs-copy">🔗 Copy link</button>' +
      '<a href="https://wa.me/?text=' +
      encText +
      '" target="_blank" rel="noopener">🟢 WhatsApp</a>' +
      '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' +
      encUrl +
      '" target="_blank" rel="noopener">💼 LinkedIn</a>' +
      '<button id="cs-insta">📸 Instagram</button>' +
      '<a href="mailto:?subject=' +
      encodeURIComponent(pageTitle) +
      '&body=' +
      encText +
      '">✉️ Email</a>';
    shareBtn.onclick = function (e) {
      e.stopPropagation();
      pop.classList.toggle('open');
    };
    document.addEventListener('click', function () {
      pop.classList.remove('open');
    });
    shareWrap.appendChild(shareBtn);
    shareWrap.appendChild(pop);

    /* Feedback */
    var fbBtn = document.createElement('button');
    fbBtn.className = 'cs-btn';
    fbBtn.innerHTML = '💬 Send feedback';
    fbBtn.onclick = function () {
      if (!isLoggedIn()) {
        goLogin();
        return;
      }
      document.getElementById('cs-fb-overlay').classList.add('open');
    };

    bar.appendChild(likeBtn);
    bar.appendChild(shareWrap);
    bar.appendChild(fbBtn);
    return bar;
  }

  /* ── feedback modal ───────────────────────────────────────────── */
  function buildModal() {
    var ov = document.createElement('div');
    ov.className = 'cs-overlay';
    ov.id = 'cs-fb-overlay';
    ov.innerHTML =
      '<div class="cs-modal">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<strong>Feedback — ' +
      pageTitle.replace(/</g, '&lt;') +
      '</strong>' +
      '<button class="cs-btn" id="cs-fb-close" style="padding:4px 10px">✕</button></div>' +
      '<textarea id="cs-fb-text" rows="5" maxlength="2000" ' +
      'placeholder="What did you like? What can we improve?"></textarea>' +
      '<p id="cs-fb-err" style="display:none;color:#ef4444;font-size:.8rem;margin-top:8px"></p>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">' +
      '<button class="cs-btn" id="cs-fb-send">Send feedback</button></div></div>';
    ov.addEventListener('click', function (e) {
      if (e.target === ov) ov.classList.remove('open');
    });
    document.body.appendChild(ov);

    document.getElementById('cs-fb-close').onclick = function () {
      ov.classList.remove('open');
    };
    document.getElementById('cs-fb-send').onclick = function () {
      var txt = document.getElementById('cs-fb-text').value.trim();
      var err = document.getElementById('cs-fb-err');
      err.style.display = 'none';
      if (!txt) {
        err.textContent = 'Please write something first.';
        err.style.display = '';
        return;
      }
      var btn = this;
      btn.disabled = true;
      reApiFetch(API_BASE + '/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          btn.disabled = false;
          if (!d.success) {
            err.textContent = d.error || 'Could not send feedback.';
            err.style.display = '';
            return;
          }
          document.getElementById('cs-fb-text').value = '';
          ov.classList.remove('open');
          toast('Feedback sent — thank you!');
        })
        .catch(function () {
          btn.disabled = false;
          err.textContent = 'Network error — please try again.';
          err.style.display = '';
        });
    };
  }

  /* ── init ─────────────────────────────────────────────────────── */
  function init() {
    var bar = buildBar();
    var crumb = document.querySelector('nav.breadcrumb');
    if (crumb && crumb.parentNode) {
      crumb.parentNode.insertBefore(bar, crumb.nextSibling);
    } else {
      var main = document.querySelector('main') || document.body;
      main.insertBefore(bar, main.firstChild);
    }
    buildModal();

    document.getElementById('cs-copy').onclick = function () {
      copyLink(function () {
        toast('Link copied to clipboard');
      });
    };
    document.getElementById('cs-insta').onclick = function () {
      copyLink(function () {
        toast('Link copied — paste it in your Instagram story or bio');
        window.open('https://www.instagram.com/', '_blank', 'noopener');
      });
    };

    /* load counts + my-like state */
    fetch('/api/content/' + encodeURIComponent(KIND) + '/social')
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d.success && d.data[ID]) {
          document.getElementById('cs-like-count').textContent = d.data[ID].likes || 0;
        }
      })
      .catch(function () {
        /* server offline — bar still works for share */
      });
    if (isLoggedIn()) {
      reApiFetch('/api/me/content-likes')
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          if (
            d.success &&
            d.data.some(function (l) {
              return l.kind === KIND && l.content_id === ID;
            })
          ) {
            document.getElementById('cs-like').classList.add('cs-liked');
          }
        })
        .catch(function () {
          /* ignore */
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
