/* ═══════════════════════════════════════════════════════════════════
   ARTICLES — client-side Markdown article list + reader.

   Data model:
     Articles/content/manifest.json   → JSON array of .md filenames
     Articles/content/<slug>.md       → one article, front matter + body

   Front matter is a simple `key: value` block between two `---` lines
   at the top of the file (see Articles/content/TEMPLATE.md for the
   full spec and authoring notes). This file parses that front matter,
   builds the list/filter/search view, and renders the selected
   article's Markdown body via marked.js (loaded from CDN in
   articles.html) into art-reader-body.

   No build step, no server-side directory listing required — adding
   an article is: write the .md file, add its filename to manifest.json.
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var MANIFEST_URL = 'content/manifest.json';
  var CONTENT_DIR = 'content/';

  var state = {
    articles: [], // [{ ...frontMatter, filename, bodyMarkdown }]
    activeFilter: 'all',
    searchQuery: '',
  };

  var els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheEls();
    wireStaticEvents();
    loadManifest();
  }

  function cacheEls() {
    els.grid = document.getElementById('art-grid');
    els.loading = document.getElementById('art-loading');
    els.empty = document.getElementById('art-empty');
    els.error = document.getElementById('art-error');
    els.errorText = document.getElementById('art-error-text');
    els.filterPills = document.getElementById('art-filter-pills');
    els.search = document.getElementById('art-search');
    els.listView = document.getElementById('art-list-view');
    els.readerView = document.getElementById('art-reader-view');
    els.backBtn = document.getElementById('art-back-btn');
    els.readerTitle = document.getElementById('art-reader-title');
    els.readerCategory = document.getElementById('art-reader-category');
    els.readerDate = document.getElementById('art-reader-date');
    els.readerReadtime = document.getElementById('art-reader-readtime');
    els.readerTags = document.getElementById('art-reader-tags');
    els.readerBody = document.getElementById('art-reader-body');
    els.readerAuthor = document.getElementById('art-reader-author');
    els.readerError = document.getElementById('art-reader-error');
    els.metaDescription = document.getElementById('meta-description');
    els.pageTitle = document.getElementById('page-title');
    els.breadcrumb = document.getElementById('art-breadcrumb');
  }

  function wireStaticEvents() {
    els.search.addEventListener('input', debounce(onSearchInput, 150));
    els.backBtn.addEventListener('click', function () {
      goToList(true);
    });
    window.addEventListener('popstate', routeFromUrl);
  }

  /* ── Load + parse ─────────────────────────────────────────────── */

  function loadManifest() {
    fetch(MANIFEST_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('manifest fetch failed');
        return r.json();
      })
      .then(function (filenames) {
        if (!Array.isArray(filenames) || filenames.length === 0) {
          throw new Error('empty manifest');
        }
        return Promise.all(filenames.map(loadArticle));
      })
      .then(function (loaded) {
        state.articles = loaded.filter(Boolean).sort(function (a, b) {
          return (b.date || '').localeCompare(a.date || '');
        });
        els.loading.classList.add('hidden');
        buildFilterPills();
        renderGrid();
        routeFromUrl();
      })
      .catch(function (err) {
        console.error('Articles: failed to load manifest', err);
        els.loading.classList.add('hidden');
        els.errorText.textContent =
          window.location.protocol === 'file:'
            ? "This page needs to be served over HTTP — it can't read local files when " +
              'opened directly (e.g. by double-clicking articles.html). Start the site’s ' +
              'server and open this page via http://localhost instead.'
            : "Couldn't load the article list right now. Please refresh the page.";
        els.error.classList.remove('hidden');
      });
  }

  function loadArticle(filename) {
    return fetch(CONTENT_DIR + filename)
      .then(function (r) {
        if (!r.ok) throw new Error('fetch failed: ' + filename);
        return r.text();
      })
      .then(function (raw) {
        var parsed = parseFrontMatter(raw);
        if (!parsed) {
          console.warn('Articles: no front matter found in', filename);
          return null;
        }
        parsed.meta.filename = filename;
        parsed.meta.bodyMarkdown = parsed.body;
        return parsed.meta;
      })
      .catch(function (err) {
        console.warn('Articles: skipping', filename, err);
        return null;
      });
  }

  /**
   * Parses a minimal `key: value` front-matter block delimited by
   * `---` lines at the top of a Markdown file. Not a full YAML parser
   * by design — keeps this dependency-free. See TEMPLATE.md for the
   * supported field list.
   */
  function parseFrontMatter(raw) {
    var match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw.trim() + '\n');
    if (!match) return null;
    var block = match[1];
    var body = match[2] || '';
    var meta = {};
    block.split('\n').forEach(function (line) {
      var idx = line.indexOf(':');
      if (idx === -1) return;
      var key = line.slice(0, idx).trim();
      var val = line.slice(idx + 1).trim();
      if (!key) return;
      if (key === 'tags') {
        meta.tags = val
          .split(',')
          .map(function (t) {
            return t.trim();
          })
          .filter(Boolean);
      } else {
        meta[key] = val;
      }
    });
    if (!meta.author) meta.author = 'Rising Edge Technologies';
    if (!meta.tags) meta.tags = [];
    return { meta: meta, body: body.trim() };
  }

  /* ── List view ────────────────────────────────────────────────── */

  function buildFilterPills() {
    var categories = [];
    state.articles.forEach(function (a) {
      if (a.category && categories.indexOf(a.category) === -1) {
        categories.push(a.category);
      }
    });
    categories.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.className = 'filter-pill';
      btn.type = 'button';
      btn.dataset.filter = cat;
      btn.textContent = cat;
      els.filterPills.appendChild(btn);
    });
    els.filterPills.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-pill');
      if (!btn) return;
      els.filterPills.querySelectorAll('.filter-pill').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      state.activeFilter = btn.dataset.filter;
      renderGrid();
    });
  }

  function onSearchInput() {
    state.searchQuery = els.search.value.trim().toLowerCase();
    renderGrid();
  }

  function getFilteredArticles() {
    return state.articles.filter(function (a) {
      var matchesFilter = state.activeFilter === 'all' || a.category === state.activeFilter;
      if (!matchesFilter) return false;
      if (!state.searchQuery) return true;
      var haystack = [a.title, a.summary, a.category, (a.tags || []).join(' ')]
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(state.searchQuery) !== -1;
    });
  }

  function renderGrid() {
    var filtered = getFilteredArticles();
    if (filtered.length === 0) {
      els.grid.innerHTML = '';
      els.empty.classList.remove('hidden');
      return;
    }
    els.empty.classList.add('hidden');
    els.grid.innerHTML = filtered.map(renderCard).join('');
    els.grid.querySelectorAll('[data-slug]').forEach(function (card) {
      card.addEventListener('click', function () {
        openArticle(card.dataset.slug, true);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openArticle(card.dataset.slug, true);
        }
      });
    });
  }

  function renderCard(a) {
    var tags = (a.tags || [])
      .slice(0, 3)
      .map(function (t) {
        return '<span class="art-tag">' + escapeHtml(t) + '</span>';
      })
      .join('');
    return (
      '<div class="card card-hover art-card" data-slug="' +
      escapeAttr(a.slug || '') +
      '" tabindex="0" role="button" aria-label="Open article: ' +
      escapeAttr(a.title || '') +
      '">' +
      '<div class="art-card-meta">' +
      '<span class="badge badge-blue">' +
      escapeHtml(a.category || 'General') +
      '</span>' +
      (a.readTime ? '<span>' + escapeHtml(a.readTime) + '</span>' : '') +
      '</div>' +
      '<h3>' +
      escapeHtml(a.title || 'Untitled') +
      '</h3>' +
      '<p>' +
      escapeHtml(a.summary || '') +
      '</p>' +
      (tags ? '<div class="art-card-tags">' + tags + '</div>' : '') +
      '<span class="art-card-cta">Read article →</span>' +
      '</div>'
    );
  }

  /* ── Reader view ──────────────────────────────────────────────── */

  function openArticle(slug, pushState) {
    var article = state.articles.filter(function (a) {
      return a.slug === slug;
    })[0];

    if (!article) {
      els.readerError.classList.remove('hidden');
      els.readerBody.innerHTML = '';
      els.listView.classList.add('hidden');
      els.readerView.classList.remove('hidden');
      return;
    }

    els.readerError.classList.add('hidden');
    els.readerCategory.textContent = article.category || 'General';
    els.readerDate.textContent = formatDate(article.date);
    els.readerReadtime.textContent = article.readTime ? '· ' + article.readTime : '';
    els.readerTitle.textContent = article.title || 'Untitled';
    els.readerAuthor.textContent = article.author || 'Rising Edge Technologies';
    els.readerTags.innerHTML = (article.tags || [])
      .map(function (t) {
        return '<span class="art-tag">' + escapeHtml(t) + '</span>';
      })
      .join('');

    if (window.marked) {
      els.readerBody.innerHTML = window.marked.parse(article.bodyMarkdown || '');
    } else {
      // Graceful fallback if the CDN script failed to load (offline, blocked, etc.)
      els.readerBody.textContent = article.bodyMarkdown || '';
    }

    els.metaDescription.setAttribute('content', article.summary || '');
    els.pageTitle.textContent = (article.title || 'Article') + ' | Rising Edge Technologies';
    els.breadcrumb.innerHTML =
      '<a href="../home.html">Home</a><span>/</span>' +
      '<a href="articles.html" id="art-breadcrumb-back">Articles</a><span>/</span>' +
      '<span>' +
      escapeHtml(article.title || '') +
      '</span>';
    document.getElementById('art-breadcrumb-back').addEventListener('click', function (e) {
      e.preventDefault();
      goToList(true);
    });

    els.listView.classList.add('hidden');
    els.readerView.classList.remove('hidden');
    els.readerView.scrollIntoView({ behavior: 'instant', block: 'start' });

    if (pushState) {
      var url = new URL(window.location.href);
      url.searchParams.set('article', slug);
      history.pushState({ slug: slug }, '', url);
    }
  }

  function goToList(pushState) {
    els.readerView.classList.add('hidden');
    els.listView.classList.remove('hidden');
    els.metaDescription.setAttribute(
      'content',
      'Short, plain-language articles explaining core hardware and signal-integrity concepts — Rising Edge Technologies.'
    );
    els.pageTitle.textContent = 'Articles | Rising Edge Technologies';
    els.breadcrumb.innerHTML = '<a href="../home.html">Home</a><span>/</span><span>Articles</span>';

    if (pushState) {
      var url = new URL(window.location.href);
      url.searchParams.delete('article');
      history.pushState({}, '', url);
    }
  }

  function routeFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('article');
    if (slug) {
      openArticle(slug, false);
    } else {
      goToList(false);
    }
  }

  /* ── Utilities ────────────────────────────────────────────────── */

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c;
    });
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }
})();
