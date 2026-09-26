/* ═══════════════════════════════════════════════════════════════════
   RISING EDGE — Hardware Jobs Board (demo)
   Public browse · login-gated apply · RECRUITER/ADMIN/SUPER_ADMIN post.
   Depends on core.js globals: reApiFetch, isLoggedIn, getAuthUser, rootPath.
═══════════════════════════════════════════════════════════════════ */

var JobsBoard = (function () {
  'use strict';

  var DISCIPLINES = {
    HARDWARE_DESIGN: 'Hardware Design',
    PCB_DESIGN: 'PCB Design',
    SI: 'Signal Integrity',
    PI: 'Power Integrity',
    EMC: 'EMC / EMI',
    OTHER: 'Hardware (Other)',
  };
  var EXP = {
    FRESHER: 'Fresher (0–1 y)',
    JUNIOR: 'Junior (1–3 y)',
    MID: 'Mid (3–7 y)',
    SENIOR: 'Senior (7–12 y)',
    PRINCIPAL: 'Principal (12+ y)',
  };
  var TYPES = { FULL_TIME: 'Full-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' };
  var MODES = { ONSITE: 'On-site', REMOTE: 'Remote', HYBRID: 'Hybrid' };
  var PLATFORMS = {
    LINKEDIN: 'LinkedIn',
    NAUKRI: 'Naukri',
    INDEED: 'Indeed',
    GLASSDOOR: 'Glassdoor',
    MONSTER: 'Monster (foundit)',
    COMPANY_SITE: 'Company site',
    OTHER: 'Other',
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function canPost() {
    var u = typeof getAuthUser === 'function' ? getAuthUser() : null;
    return !!(u && (u.role === 'RECRUITER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'));
  }

  function loginRedirect() {
    window.location.href =
      '../Login-pages/login.html?redirect=' + encodeURIComponent(window.location.href);
  }

  function timeAgo(iso) {
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 30) return d + ' days ago';
    return Math.floor(d / 30) + ' mo ago';
  }

  function fmtSalary(j) {
    if (j.salary_hidden || (!j.salary_min && !j.salary_max)) return '';
    function lakh(n) {
      if (n >= 100000) return (n / 100000).toFixed(n % 100000 ? 1 : 0) + 'L';
      return (n / 1000).toFixed(0) + 'k';
    }
    var cur = j.salary_currency === 'INR' || !j.salary_currency ? '₹' : j.salary_currency + ' ';
    if (j.salary_min && j.salary_max) {
      return cur + lakh(j.salary_min) + ' – ' + cur + lakh(j.salary_max);
    }
    return cur + lakh(j.salary_min || j.salary_max);
  }

  /* Minimal safe markdown: **bold**, "- " bullets (nested via 2-space
     indents — see formatDesc('indent'/'outdent')), paragraphs */
  function mdToHtml(md) {
    var lines = esc(md).split(/\r?\n/);
    var html = '';
    var openLevels = 0; // count of currently open <ul> tags

    function closeListsTo(level) {
      while (openLevels > level) {
        html += '</ul>';
        openLevels--;
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var m = ln.match(/^(\s*)[-*]\s+(.*)$/);
      if (m) {
        var indentSpaces = m[1].replace(/\t/g, '  ').length;
        // Can only open one new level at a time (like hitting "Indent" once)
        var level = Math.min(Math.floor(indentSpaces / 2) + 1, openLevels + 1);
        var bold = m[2].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        if (level > openLevels) {
          html += '<ul>';
          openLevels = level;
        } else if (level < openLevels) {
          closeListsTo(level);
        }
        html += '<li>' + bold + '</li>';
      } else {
        closeListsTo(0);
        if (/^\s*$/.test(ln)) continue;
        var bold2 = ln.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        if (/^<strong>[^<]+<\/strong>$/.test(bold2.trim())) {
          html += '<h3>' + bold2.trim().replace(/<\/?strong>/g, '') + '</h3>';
        } else {
          html += '<p>' + bold2 + '</p>';
        }
      }
    }
    closeListsTo(0);
    return html;
  }

  /* ── Job description toolbar (post/edit form) ──────────────────────
     Inserts the same **heading** / "- bullet" syntax mdToHtml() renders,
     so posters don't have to remember it by hand. Operates on the current
     selection in #jp-desc (wraps selected text, or drops in a placeholder
     when nothing's selected). */
  var descPreviewOn = false;

  function formatDesc(type) {
    var el = document.getElementById('jp-desc');
    if (!el) return;
    var start = el.selectionStart;
    var end = el.selectionEnd;
    var value = el.value;
    var selected = value.slice(start, end);
    var before = value.slice(0, start);
    var after = value.slice(end);
    var newValue,
      selStart,
      selEnd,
      text,
      block,
      prefix,
      suffix,
      beforeTrim,
      afterTrim,
      lines,
      lineStart,
      lineEnd,
      block0;

    if (type === 'bold') {
      text = selected || 'bold text';
      block = '**' + text + '**';
      newValue = before + block + after;
      selStart = before.length + 2;
      selEnd = selStart + text.length;
    } else if (type === 'heading') {
      // A heading must sit alone on its own line for mdToHtml() to render
      // it as <h3> — trim any surrounding newlines at the splice point and
      // re-add exactly one blank line on each side (idempotent, so hitting
      // the button twice doesn't pile up blank lines).
      text = (selected || 'Heading').replace(/^\*\*|\*\*$/g, '');
      beforeTrim = before.replace(/\n+$/, '');
      prefix = beforeTrim === '' ? '' : beforeTrim + '\n\n';
      afterTrim = after.replace(/^\n+/, '');
      suffix = afterTrim === '' ? '' : '\n\n' + afterTrim;
      block = '**' + text + '**';
      newValue = prefix + block + suffix;
      selStart = prefix.length + 2;
      selEnd = selStart + text.length;
    } else if (type === 'bullet') {
      if (selected && /\n/.test(selected)) {
        // Multi-line selection — prefix every non-blank line that isn't
        // already a bullet.
        lines = selected.split('\n').map(function (ln) {
          if (!ln.trim()) return ln;
          return /^\s*[-*]\s/.test(ln) ? ln : '- ' + ln.replace(/^\s+/, '');
        });
        block = lines.join('\n');
        newValue = before + block + after;
        selStart = before.length;
        selEnd = selStart + block.length;
      } else {
        text = selected || 'List item';
        beforeTrim = before.replace(/\n+$/, '');
        prefix = beforeTrim === '' ? '' : beforeTrim + '\n';
        afterTrim = after.replace(/^\n+/, '');
        suffix = afterTrim === '' ? '\n' : '\n' + afterTrim;
        block = '- ' + text;
        newValue = prefix + block + suffix;
        selStart = prefix.length + 2;
        selEnd = selStart + text.length;
      }
    } else if (type === 'indent' || type === 'outdent') {
      // Shifts every line touched by the selection (or just the current
      // line, if nothing's selected) two spaces in or out — this is what
      // creates/removes bullet nesting, since mdToHtml() reads 2 spaces
      // of leading indent as one sub-list level.
      lineStart = value.lastIndexOf('\n', start - 1) + 1;
      lineEnd = value.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = value.length;
      block0 = value.slice(lineStart, lineEnd);
      lines = block0.split('\n').map(function (ln) {
        return type === 'indent' ? '  ' + ln : ln.replace(/^ {1,2}/, '');
      });
      block = lines.join('\n');
      newValue = value.slice(0, lineStart) + block + value.slice(lineEnd);
      selStart = lineStart;
      selEnd = lineStart + block.length;
    } else {
      return;
    }

    el.value = newValue;
    el.focus();
    el.setSelectionRange(selStart, selEnd);
    if (descPreviewOn) renderDescPreview();
  }

  function renderDescPreview() {
    var ta = document.getElementById('jp-desc');
    var prev = document.getElementById('jp-desc-preview');
    if (!ta || !prev) return;
    prev.innerHTML =
      mdToHtml(ta.value || '') || '<p style="color:var(--text-muted)">Nothing to preview yet.</p>';
  }

  function toggleDescPreview() {
    var ta = document.getElementById('jp-desc');
    var prev = document.getElementById('jp-desc-preview');
    var toolbar = document.getElementById('jp-desc-toolbar-fmt');
    var btn = document.getElementById('jp-desc-preview-btn');
    if (!ta || !prev || !btn) return;
    descPreviewOn = !descPreviewOn;
    if (descPreviewOn) {
      renderDescPreview();
      ta.style.display = 'none';
      ta.required = false;
      prev.style.display = '';
      if (toolbar) toolbar.style.display = 'none';
      btn.textContent = 'Edit';
    } else {
      ta.style.display = '';
      ta.required = true;
      prev.style.display = 'none';
      if (toolbar) toolbar.style.display = '';
      btn.textContent = 'Preview';
    }
  }

  function badges(j) {
    var out = (j.disciplines || [])
      .map(function (d) {
        return '<span class="badge badge-cyan">' + esc(DISCIPLINES[d] || d) + '</span>';
      })
      .join('');
    out += '<span class="badge badge-gray">' + esc(TYPES[j.employment_type] || '') + '</span>';
    out += '<span class="badge badge-gray">' + esc(EXP[j.experience_level] || '') + '</span>';
    if (j.work_mode === 'REMOTE') out += '<span class="badge badge-green">Remote</span>';
    else if (j.work_mode === 'HYBRID') out += '<span class="badge badge-orange">Hybrid</span>';
    return out;
  }

  /* ── LISTING PAGE ─────────────────────────────────────────────── */
  var state = { page: 1 };

  function readFiltersFromURL() {
    var p = new URLSearchParams(window.location.search);
    ['q', 'discipline', 'experience', 'type', 'mode', 'sort'].forEach(function (k) {
      var el = document.getElementById('f-' + k);
      if (el && p.get(k)) el.value = p.get(k);
    });
    state.page = parseInt(p.get('page'), 10) || 1;
  }

  function filterParams() {
    var params = new URLSearchParams();
    var map = {
      q: 'q',
      discipline: 'discipline',
      experience: 'experience',
      type: 'type',
      mode: 'work_mode',
      sort: 'sort',
    };
    Object.keys(map).forEach(function (k) {
      var el = document.getElementById('f-' + k);
      if (el && el.value) params.set(map[k], el.value);
    });
    params.set('page', state.page);
    return params;
  }

  function syncURL() {
    var p = filterParams();
    p.delete('work_mode');
    var el = document.getElementById('f-mode');
    if (el && el.value) p.set('mode', el.value);
    if (state.page === 1) p.delete('page');
    var qs = p.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
  }

  function loadList() {
    var listEl = document.getElementById('jb-list');
    listEl.innerHTML = '<div class="jb-empty">Loading jobs…</div>';
    fetch('/api/jobs?' + filterParams().toString())
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) throw new Error(d.error || 'Failed');
        renderList(d);
      })
      .catch(function () {
        listEl.innerHTML =
          '<div class="jb-empty">Could not load jobs. Is the server running?<br/><span style="font-size:.78rem">(This page needs the backend — open it via <code>http://localhost:3000/Jobs/</code>, not file://)</span></div>';
      });
  }

  function renderList(d) {
    var listEl = document.getElementById('jb-list');
    var countEl = document.getElementById('jb-count');
    countEl.textContent = d.total + ' open position' + (d.total === 1 ? '' : 's');
    if (!d.data.length) {
      listEl.innerHTML =
        '<div class="jb-empty">No jobs match your filters. <br/><button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="JobsBoard.clearFilters()">Clear filters</button></div>';
      renderPager(d);
      return;
    }
    var me = typeof getAuthUser === 'function' ? getAuthUser() : null;
    var isSuperAdmin = !!(me && me.role === 'SUPER_ADMIN');
    listEl.innerHTML = d.data
      .map(function (j) {
        var sal = fmtSalary(j);
        var canManage = isSuperAdmin;
        var card =
          '<a class="jb-card" href="job.html?id=' +
          encodeURIComponent(j.id) +
          '">' +
          '<div class="jb-card-top"><div>' +
          '<div class="jb-title">' +
          esc(j.title) +
          '</div>' +
          '<div class="jb-company">' +
          esc(j.company_name) +
          (j.location ? ' · ' + esc(j.location) : '') +
          '</div></div>' +
          '<div style="text-align:right">' +
          (sal ? '<div class="jb-salary">' + sal + '/yr</div>' : '') +
          '<div class="jb-posted">' +
          timeAgo(j.created_at) +
          '</div>' +
          '</div></div>' +
          '<div class="jb-meta">' +
          badges(j) +
          '</div>' +
          '<div class="jb-skills">' +
          (j.skills || [])
            .slice(0, 6)
            .map(function (s) {
              return '<span class="jb-skill">' + esc(s) + '</span>';
            })
            .join('') +
          '</div>' +
          '<div class="jb-stats">👁 ' +
          (j.views_count || 0) +
          ' view' +
          (j.views_count === 1 ? '' : 's') +
          ' · 🧑 ' +
          (j.applications || 0) +
          ' applicant' +
          (j.applications === 1 ? '' : 's') +
          '</div>' +
          '</a>';

        var applyLabel = !isLoggedIn()
          ? 'Login to apply'
          : j.apply_mode === 'EXTERNAL'
            ? 'Apply on company site ↗'
            : 'Apply now';
        var actions =
          '<div style="display:flex;gap:8px;margin-top:-6px;padding:0 2px 2px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-primary btn-sm" style="flex:1;min-width:140px" ' +
          'onclick="event.preventDefault();JobsBoard.handleApplyClick(\'' +
          j.id +
          "','" +
          j.apply_mode +
          '\')">' +
          esc(applyLabel) +
          '</button>';
        if (canManage) {
          actions +=
            '<button type="button" class="btn btn-outline btn-sm" onclick="event.preventDefault();JobsBoard.goEditJob(\'' +
            j.id +
            '\')">Edit</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" style="color:var(--red,#ef4444)" ' +
            'onclick="event.preventDefault();JobsBoard.deleteJobFromList(\'' +
            j.id +
            '\')">Delete</button>';
        }
        actions += '</div>';
        return '<div style="display:contents">' + card + actions + '</div>';
      })
      .join('');
    renderPager(d);
  }

  function renderPager(d) {
    var pages = Math.ceil(d.total / d.per_page) || 1;
    var el = document.getElementById('jb-pager');
    if (pages <= 1) {
      el.innerHTML = '';
      return;
    }
    var html = '';
    for (var i = 1; i <= pages; i++) {
      html +=
        '<button class="btn btn-sm ' +
        (i === d.page ? 'btn-primary' : 'btn-outline') +
        '" onclick="JobsBoard.goPage(' +
        i +
        ')">' +
        i +
        '</button>';
    }
    el.innerHTML = html;
  }

  function initList() {
    readFiltersFromURL();
    if (canPost()) {
      document.getElementById('jb-post-btn').style.display = '';
      var bulkBtn = document.getElementById('jb-bulk-btn');
      if (bulkBtn) bulkBtn.style.display = '';
      var candLink = document.getElementById('jb-candidates-link');
      if (candLink) candLink.style.display = '';
    }
    var myApps = document.getElementById('jb-myapps-link');
    if (myApps && isLoggedIn()) myApps.style.display = '';
    var t = null;
    ['f-q', 'f-discipline', 'f-experience', 'f-type', 'f-mode', 'f-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === 'f-q' ? 'input' : 'change', function () {
        clearTimeout(t);
        t = setTimeout(
          function () {
            state.page = 1;
            syncURL();
            loadList();
          },
          id === 'f-q' ? 300 : 0
        );
      });
    });
    document.getElementById('f-clear').addEventListener('click', clearFilters);
    initViewToggle();
    loadList();
  }

  /* ── List / Detail view switcher (persisted, mirrors Trainings/Tools) ── */
  function applyJobsView(view) {
    if (view !== 'list' && view !== 'detail') view = 'detail';
    var listEl = document.getElementById('jb-list');
    if (listEl) {
      listEl.classList.toggle('jb-view-list', view === 'list');
      listEl.classList.toggle('jb-view-detail', view === 'detail');
    }
    document.querySelectorAll('.jb-view-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });
    try {
      localStorage.setItem('jb-view', view);
    } catch (e) {}
  }

  function initViewToggle() {
    var stored = 'detail';
    try {
      stored = localStorage.getItem('jb-view') || 'detail';
    } catch (e) {}
    document.querySelectorAll('.jb-view-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        applyJobsView(b.getAttribute('data-view'));
      });
    });
    applyJobsView(stored);
  }

  function clearFilters() {
    ['f-q', 'f-discipline', 'f-experience', 'f-type', 'f-mode', 'f-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    state.page = 1;
    syncURL();
    loadList();
  }

  function goPage(p) {
    state.page = p;
    syncURL();
    loadList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Apply directly from a listing card (index.html) — reuses the same
     currentJob/openApplyModal/applyExternal/submitApplication flow the
     detail page (job.html) uses, just seeded with a minimal job object
     instead of the full fetched detail. ── */
  function handleApplyClick(jobId, applyMode) {
    if (!isLoggedIn()) {
      loginRedirect();
      return;
    }
    currentJob = { id: jobId, apply_mode: applyMode };
    if (applyMode === 'EXTERNAL') {
      applyExternal();
    } else {
      openApplyModal();
    }
  }

  /* ── Owner/admin actions on the public listing page (index.html) ── */
  function goEditJob(id) {
    window.location.href = 'post.html?edit=' + encodeURIComponent(id);
  }

  function deleteJobFromList(id) {
    if (!confirm('Delete this position? It will be removed from the board permanently.')) return;
    reApiFetch('/api/jobs/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) {
          alert(d.error || 'Could not delete.');
          return;
        }
        loadList();
      })
      .catch(function () {
        alert('Network error — please try again.');
      });
  }

  /* ── DETAIL PAGE ──────────────────────────────────────────────── */
  var currentJob = null;

  function initDetail() {
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      window.location.replace('index.html');
      return;
    }
    fetch('/api/jobs/' + encodeURIComponent(id))
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) throw new Error(d.error);
        currentJob = d.data;
        renderDetail(d.data);
      })
      .catch(function (e) {
        document.getElementById('jd-main').innerHTML =
          '<div class="jb-empty">' +
          esc(e.message || 'Job not found.') +
          '<br/><a class="btn btn-outline btn-sm" style="margin-top:10px" href="index.html">← All jobs</a></div>';
      });
  }

  /* ── Share this job (WhatsApp / LinkedIn / Email / Instagram) ────────── */
  function jobsToast(msg) {
    var t = document.getElementById('jobs-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'jobs-toast';
      t.style.cssText =
        'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2000;' +
        'background:var(--bg-card);border:1px solid var(--border);border-radius:999px;' +
        'padding:8px 18px;font-size:0.8125rem;box-shadow:0 8px 30px rgba(0,0,0,.35);' +
        'opacity:0;transition:opacity .2s;pointer-events:none';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.style.opacity = '0';
    }, 2600);
  }

  function copyJobLink(url, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(cb, function () {
        fallbackCopyJobLink(url, cb);
      });
    } else {
      fallbackCopyJobLink(url, cb);
    }
  }
  function fallbackCopyJobLink(url, cb) {
    var ta = document.createElement('textarea');
    ta.value = url;
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

  function renderShareRow(j) {
    var wrap = document.getElementById('jd-share');
    if (!wrap) return;
    var shareUrl =
      window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(j.id);
    var shareText = j.title + ' at ' + j.company_name + ' — ' + shareUrl;
    var encUrl = encodeURIComponent(shareUrl);
    var encText = encodeURIComponent(shareText);

    wrap.innerHTML =
      '<a class="btn btn-outline btn-sm" href="https://wa.me/?text=' +
      encText +
      '" target="_blank" rel="noopener">🟢 WhatsApp</a>' +
      '<a class="btn btn-outline btn-sm" href="https://www.linkedin.com/sharing/share-offsite/?url=' +
      encUrl +
      '" target="_blank" rel="noopener">💼 LinkedIn</a>' +
      '<a class="btn btn-outline btn-sm" href="mailto:?subject=' +
      encodeURIComponent(j.title + ' at ' + j.company_name) +
      '&body=' +
      encText +
      '">✉️ Email</a>' +
      '<button type="button" class="btn btn-outline btn-sm" id="jd-share-insta">📸 Instagram</button>';

    var instaBtn = document.getElementById('jd-share-insta');
    if (instaBtn) {
      instaBtn.addEventListener('click', function () {
        copyJobLink(shareUrl, function () {
          jobsToast('Link copied — paste it in your Instagram story or bio');
          window.open('https://www.instagram.com/', '_blank', 'noopener');
        });
      });
    }
  }

  function renderDetail(j) {
    document.title = j.title + ' — ' + j.company_name + ' | Rising Edge Jobs';
    document.getElementById('jd-title').textContent = j.title;
    document.getElementById('jd-company').textContent =
      j.company_name + (j.location ? ' · ' + j.location : '');
    document.getElementById('jd-badges').innerHTML = badges(j);
    document.getElementById('jd-desc').innerHTML = mdToHtml(j.description_md);
    renderShareRow(j);

    var closed = j.status !== 'ACTIVE';
    var rows = [
      ['Posted', timeAgo(j.created_at)],
      ['Employment', TYPES[j.employment_type] || j.employment_type],
      ['Experience', EXP[j.experience_level] || j.experience_level],
      ['Work mode', MODES[j.work_mode] || j.work_mode],
      ['Location', j.location || '—'],
      ['Salary', fmtSalary(j) ? fmtSalary(j) + ' / year' : 'Not disclosed'],
      ['Views', String(j.views_count)],
      ['Applicants', String(j.applications)],
    ];
    if (j.deadline) rows.push(['Apply by', new Date(j.deadline).toLocaleDateString()]);
    document.getElementById('jd-side-rows').innerHTML = rows
      .map(function (r) {
        return (
          '<div class="jb-side-row"><span class="jb-side-label">' +
          esc(r[0]) +
          '</span><span class="jb-side-value">' +
          esc(r[1]) +
          '</span></div>'
        );
      })
      .join('');

    var btn = document.getElementById('jd-apply');
    if (closed) {
      btn.textContent = 'No longer accepting applications';
      btn.disabled = true;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    } else if (!isLoggedIn()) {
      btn.textContent = 'Login to apply';
      btn.onclick = loginRedirect;
    } else if (j.apply_mode === 'EXTERNAL') {
      btn.textContent = 'Apply on company site ↗';
      btn.onclick = applyExternal;
    } else {
      btn.textContent = 'Apply now';
      btn.onclick = openApplyModal;
    }
    document.getElementById('jd-login-hint').style.display = !closed && !isLoggedIn() ? '' : 'none';

    // Links to this job on other platforms (LinkedIn, Naukri, …)
    var links = j.platform_links || [];
    var linksWrap = document.getElementById('jd-links');
    if (links.length && linksWrap) {
      linksWrap.style.display = '';
      document.getElementById('jd-links-list').innerHTML = links
        .map(function (l) {
          var name = l.platform === 'OTHER' && l.label ? l.label : PLATFORMS[l.platform] || 'Link';
          return (
            '<a class="btn btn-outline btn-sm" style="width:100%;margin-bottom:6px" target="_blank" rel="noopener nofollow" href="' +
            esc(l.url) +
            '">' +
            esc(name) +
            ' ↗</a>'
          );
        })
        .join('');
    }

    var me = typeof getAuthUser === 'function' ? getAuthUser() : null;
    var ownerActions = document.getElementById('jd-owner-actions');
    if (ownerActions) {
      ownerActions.style.display = me && me.role === 'SUPER_ADMIN' ? 'flex' : 'none';
    }
  }

  function getCurrentJobId() {
    return currentJob ? currentJob.id : null;
  }

  function deleteJobFromDetail() {
    if (!currentJob) return;
    if (!confirm('Delete this position? It will be removed from the board permanently.')) return;
    reApiFetch('/api/jobs/' + encodeURIComponent(currentJob.id), { method: 'DELETE' })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) {
          alert(d.error || 'Could not delete.');
          return;
        }
        window.location.href = 'index.html';
      })
      .catch(function () {
        alert('Network error — please try again.');
      });
  }

  function applyExternal() {
    reApiFetch('/api/jobs/' + encodeURIComponent(currentJob.id) + '/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        var url = (d.data && d.data.apply_url) || currentJob.apply_url;
        if (url) window.open(url, '_blank', 'noopener');
      })
      .catch(function () {
        if (currentJob.apply_url) window.open(currentJob.apply_url, '_blank', 'noopener');
      });
  }

  function openApplyModal() {
    var u = getAuthUser() || {};
    document.getElementById('ap-name').textContent = u.full_name || u.fullName || '';
    document.getElementById('ap-email').textContent = u.email || '';
    document.getElementById('ap-error').style.display = 'none';
    document.getElementById('modal-apply').classList.add('open');
    document.getElementById('modal-apply').style.display = 'flex';
  }

  function closeApplyModal() {
    document.getElementById('modal-apply').classList.remove('open');
    document.getElementById('modal-apply').style.display = 'none';
  }

  function submitApplication() {
    var fileEl = document.getElementById('ap-resume-file');
    var file = fileEl && fileEl.files && fileEl.files[0];
    var note = document.getElementById('ap-note').value.trim();
    var errEl = document.getElementById('ap-error');
    errEl.style.display = 'none';
    if (!file) {
      errEl.textContent = 'Please choose a resume file (PDF, DOC or DOCX).';
      errEl.style.display = '';
      return;
    }
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      errEl.textContent = 'Resume must be a PDF, DOC or DOCX file.';
      errEl.style.display = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      errEl.textContent = 'Resume must be under 5 MB.';
      errEl.style.display = '';
      return;
    }
    var form = new FormData();
    form.append('resume', file);
    form.append('cover_note', note);
    var btn = document.getElementById('ap-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    reApiFetch('/api/jobs/' + encodeURIComponent(currentJob.id) + '/apply', {
      method: 'POST',
      body: form,
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        btn.disabled = false;
        btn.textContent = 'Submit application';
        if (!d.success) {
          errEl.textContent = d.error || 'Could not submit.';
          errEl.style.display = '';
          return;
        }
        closeApplyModal();
        // Detail page (job.html) has a single #jd-apply button to update in place.
        var applyBtn = document.getElementById('jd-apply');
        if (applyBtn) {
          applyBtn.textContent = '✓ Application submitted';
          applyBtn.disabled = true;
        }
        // Listing page (index.html) — just refresh the list; there's no
        // reliable "already applied" flag on that endpoint to update in place.
        if (typeof loadList === 'function' && document.getElementById('jb-list')) {
          loadList();
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Submit application';
        errEl.textContent = 'Network error — please try again.';
        errEl.style.display = '';
      });
  }

  /* ── POST PAGE (recruiter/admin) ──────────────────────────────── */
  function addLinkRow(platform, url) {
    var wrap = document.getElementById('jp-links');
    if (wrap.children.length >= 6) return;
    var row = document.createElement('div');
    row.className = 'jp-link-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:center';
    var opts = Object.keys(PLATFORMS)
      .map(function (k) {
        return (
          '<option value="' +
          k +
          '"' +
          (k === platform ? ' selected' : '') +
          '>' +
          PLATFORMS[k] +
          '</option>'
        );
      })
      .join('');
    row.innerHTML =
      '<select class="select jp-link-platform" style="max-width:170px">' +
      opts +
      '</select>' +
      '<input class="input jp-link-url" type="url" placeholder="https://www.linkedin.com/jobs/view/…" value="' +
      esc(url || '') +
      '" style="flex:1" />' +
      '<button type="button" class="btn btn-ghost btn-sm" title="Remove" ' +
      'onclick="this.parentNode.parentNode.removeChild(this.parentNode)">✕</button>';
    wrap.appendChild(row);
  }

  function collectLinks() {
    return Array.prototype.slice
      .call(document.querySelectorAll('#jp-links .jp-link-row'))
      .map(function (row) {
        return {
          platform: row.querySelector('.jp-link-platform').value,
          url: row.querySelector('.jp-link-url').value.trim(),
        };
      })
      .filter(function (l) {
        return l.url;
      });
  }

  var editingId = null;

  function initPost() {
    if (!isLoggedIn()) {
      loginRedirect();
      return;
    }
    if (!canPost()) {
      document.getElementById('jp-form-wrap').style.display = 'none';
      document.getElementById('jp-myjobs-wrap').style.display = 'none';
      document.getElementById('jp-denied').style.display = '';
      return;
    }
    document.getElementById('jp-apply-mode').addEventListener('change', function () {
      document.getElementById('jp-url-wrap').style.display =
        this.value === 'EXTERNAL' ? '' : 'none';
      syncNotifyRequired();
    });
    syncNotifyRequired();
    loadMyJobs();
    // Arrived via "Edit" on the public listing page (index.html) — jump
    // straight into edit mode for that job instead of showing a blank form.
    var editId = new URLSearchParams(window.location.search).get('edit');
    if (editId) startEditJob(editId);
  }

  function setEditMode(on) {
    document.getElementById('jp-heading').textContent = on ? 'Edit Job' : 'Post a Job';
    document.getElementById('jp-submit').textContent = on ? 'Save changes' : 'Publish job';
    document.getElementById('jp-cancel-edit').style.display = on ? '' : 'none';
  }

  // "Send resumes to (email)" is mandatory only for on-this-site (IN_PLATFORM)
  // jobs; for external jobs it's optional. Reflect that in the label/hint.
  function syncNotifyRequired() {
    var mode = document.getElementById('jp-apply-mode');
    var label = document.getElementById('jp-notify-label');
    var hint = document.getElementById('jp-notify-hint');
    if (!mode || !label) return;
    var inPlatform = mode.value !== 'EXTERNAL';
    label.textContent = inPlatform ? 'Send resumes to (email) *' : 'Send resumes to (email)';
    if (hint) {
      hint.textContent = inPlatform
        ? "Each application (with the candidate's resume attached) is emailed here. Required for jobs candidates apply to on this site."
        : 'Optional for external jobs — applications happen on the company site.';
    }
  }

  function startEditJob(id) {
    fetch('/api/jobs/' + encodeURIComponent(id))
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) return;
        var j = d.data;
        editingId = id;
        document.getElementById('jp-title').value = j.title || '';
        document.getElementById('jp-company').value = j.company_name || '';
        Array.prototype.slice.call(document.querySelectorAll('.jp-disc')).forEach(function (c) {
          c.checked = (j.disciplines || []).indexOf(c.value) !== -1;
        });
        document.getElementById('jp-type').value = j.employment_type;
        document.getElementById('jp-exp').value = j.experience_level;
        document.getElementById('jp-mode').value = j.work_mode;
        document.getElementById('jp-location').value = j.location || '';
        document.getElementById('jp-smin').value = j.salary_min || '';
        document.getElementById('jp-smax').value = j.salary_max || '';
        document.getElementById('jp-skills').value = (j.skills || []).join(', ');
        document.getElementById('jp-apply-mode').value = j.apply_mode;
        document.getElementById('jp-url').value = j.apply_url || '';
        document.getElementById('jp-url-wrap').style.display =
          j.apply_mode === 'EXTERNAL' ? '' : 'none';
        document.getElementById('jp-deadline').value = j.deadline
          ? String(j.deadline).slice(0, 10)
          : '';
        document.getElementById('jp-notify').value = j.notify_email || '';
        document.getElementById('jp-remove').value = j.remove_at
          ? String(j.remove_at).slice(0, 10)
          : '';
        document.getElementById('jp-desc').value = j.description_md || '';
        var linksWrap = document.getElementById('jp-links');
        linksWrap.innerHTML = '';
        (j.platform_links || []).forEach(function (l) {
          addLinkRow(l.platform, l.url);
        });
        setEditMode(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  function cancelEdit() {
    editingId = null;
    document.getElementById('jp-form').reset();
    document.getElementById('jp-url-wrap').style.display = 'none';
    document.getElementById('jp-links').innerHTML = '';
    document.getElementById('jp-error').style.display = 'none';
    document.getElementById('jp-ok').style.display = 'none';
    setEditMode(false);
  }

  function submitJob() {
    var errEl = document.getElementById('jp-error');
    var okEl = document.getElementById('jp-ok');
    errEl.style.display = 'none';
    okEl.style.display = 'none';
    var disciplines = Array.prototype.slice
      .call(document.querySelectorAll('.jp-disc:checked'))
      .map(function (c) {
        return c.value;
      });
    var body = {
      title: document.getElementById('jp-title').value,
      company_name: document.getElementById('jp-company').value,
      disciplines: disciplines,
      employment_type: document.getElementById('jp-type').value,
      experience_level: document.getElementById('jp-exp').value,
      work_mode: document.getElementById('jp-mode').value,
      location: document.getElementById('jp-location').value,
      salary_min: parseInt(document.getElementById('jp-smin').value, 10) || null,
      salary_max: parseInt(document.getElementById('jp-smax').value, 10) || null,
      skills: document
        .getElementById('jp-skills')
        .value.split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean),
      apply_mode: document.getElementById('jp-apply-mode').value,
      apply_url: document.getElementById('jp-url').value,
      platform_links: collectLinks(),
      notify_email: document.getElementById('jp-notify').value,
      deadline: document.getElementById('jp-deadline').value || null,
      remove_date: document.getElementById('jp-remove').value || null,
      description_md: document.getElementById('jp-desc').value,
    };
    if (body.apply_mode === 'IN_PLATFORM' && !String(body.notify_email || '').trim()) {
      errEl.textContent =
        'Send resumes to (email) is required for jobs candidates apply to on this site.';
      errEl.style.display = '';
      return;
    }
    var btn = document.getElementById('jp-submit');
    var wasEditing = editingId;
    btn.disabled = true;
    btn.textContent = wasEditing ? 'Saving…' : 'Publishing…';
    reApiFetch(wasEditing ? '/api/jobs/' + encodeURIComponent(wasEditing) : '/api/jobs', {
      method: wasEditing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        btn.disabled = false;
        if (!d.success) {
          btn.textContent = wasEditing ? 'Save changes' : 'Publish job';
          errEl.textContent = d.error || 'Could not save job.';
          errEl.style.display = '';
          return;
        }
        okEl.innerHTML =
          (wasEditing ? 'Changes saved! ' : 'Job published! ') +
          '<a href="job.html?id=' +
          encodeURIComponent(d.data.id) +
          '">View it →</a>';
        cancelEdit();
        okEl.style.display = '';
        loadMyJobs();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = wasEditing ? 'Save changes' : 'Publish job';
        errEl.textContent = 'Network error — please try again.';
        errEl.style.display = '';
      });
  }

  function loadMyJobs() {
    reApiFetch('/api/recruiter/jobs')
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) return;
        var tb = document.getElementById('jp-myjobs');
        if (!d.data.length) {
          tb.innerHTML =
            '<tr><td colspan="6" style="color:var(--text-muted)">No postings yet.</td></tr>';
          return;
        }
        tb.innerHTML = d.data
          .map(function (j) {
            return (
              '<tr><td><a href="job.html?id=' +
              encodeURIComponent(j.id) +
              '">' +
              esc(j.title) +
              '</a></td><td>' +
              esc(j.company_name) +
              '</td>' +
              '<td><span class="badge ' +
              (j.status === 'ACTIVE' ? 'badge-green' : 'badge-gray') +
              '">' +
              esc(j.status) +
              '</span></td>' +
              '<td>' +
              j.views_count +
              '</td>' +
              '<td>' +
              j.applications +
              '</td>' +
              '<td style="white-space:nowrap">' +
              '<button class="btn btn-outline btn-sm" onclick="JobsBoard.viewApplicants(\'' +
              j.id +
              "','" +
              esc(j.title).replace(/'/g, '&#39;') +
              '\')">Applicants</button> ' +
              '<button class="btn btn-ghost btn-sm" onclick="JobsBoard.startEditJob(\'' +
              j.id +
              '\')">Edit</button> ' +
              (j.status === 'ACTIVE'
                ? '<button class="btn btn-ghost btn-sm" onclick="JobsBoard.closeJob(\'' +
                  j.id +
                  '\')">Close</button>'
                : '<button class="btn btn-ghost btn-sm" onclick="JobsBoard.reopenJob(\'' +
                  j.id +
                  '\')">Reopen</button>') +
              ' <button class="btn btn-ghost btn-sm" style="color:var(--red,#ef4444)" ' +
              'onclick="JobsBoard.deleteJob(\'' +
              j.id +
              '\')">Delete</button>' +
              '</td></tr>'
            );
          })
          .join('');
      });
  }

  function reopenJob(id) {
    reApiFetch('/api/recruiter/jobs/' + encodeURIComponent(id) + '/reopen', { method: 'POST' })
      .then(function (r) {
        return r.json();
      })
      .then(function () {
        loadMyJobs();
      });
  }

  function deleteJob(id) {
    if (!confirm('Delete this position? It will be removed from the board permanently.')) return;
    reApiFetch('/api/jobs/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) alert(d.error || 'Could not delete.');
        loadMyJobs();
      });
  }

  function closeJob(id) {
    if (!confirm('Close this job? It will stop accepting applications.')) return;
    reApiFetch('/api/recruiter/jobs/' + encodeURIComponent(id) + '/close', { method: 'POST' })
      .then(function (r) {
        return r.json();
      })
      .then(function () {
        loadMyJobs();
      });
  }

  function viewApplicants(id, title) {
    document.getElementById('apl-title').textContent = 'Applicants — ' + title;
    var tb = document.getElementById('apl-rows');
    tb.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted)">Loading…</td></tr>';
    document.getElementById('modal-applicants').style.display = 'flex';
    reApiFetch('/api/recruiter/jobs/' + encodeURIComponent(id) + '/applications')
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) {
          tb.innerHTML = '<tr><td colspan="6">' + esc(d.error) + '</td></tr>';
          return;
        }
        if (!d.data.length) {
          tb.innerHTML =
            '<tr><td colspan="6" style="color:var(--text-muted)">No applications yet.</td></tr>';
          return;
        }
        tb.innerHTML = d.data
          .map(function (a) {
            var headline = [a.current_role, a.org].filter(Boolean).join(' @ ');
            var statusCell;
            if (a.kind === 'EXTERNAL_CLICK') {
              statusCell = '<span class="badge badge-gray">External</span>';
            } else {
              statusCell =
                '<select class="select" style="min-width:130px;font-size:.78rem" ' +
                'onchange="JobsBoard.setAppStatus(\'' +
                a.id +
                '\', this)">' +
                ['SUBMITTED', 'VIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED']
                  .map(function (s) {
                    return (
                      '<option value="' +
                      s +
                      '"' +
                      (a.status === s ? ' selected' : '') +
                      (s === 'SUBMITTED' ? ' disabled' : '') +
                      '>' +
                      s.charAt(0) +
                      s.slice(1).toLowerCase() +
                      '</option>'
                    );
                  })
                  .join('') +
                '</select>';
            }
            return (
              '<tr><td><strong>' +
              esc(a.full_name) +
              '</strong><br/><span style="color:var(--text-muted);font-size:.75rem">' +
              esc(a.email) +
              '</span></td>' +
              '<td>' +
              esc(headline || '—') +
              '</td>' +
              '<td>' +
              (a.kind === 'EXTERNAL_CLICK'
                ? '—'
                : a.resume_url
                  ? '<a class="btn btn-outline btn-sm" href="' +
                    esc(a.resume_url) +
                    '" target="_blank" rel="noopener">Resume ↗</a>'
                  : '<span style="color:var(--text-muted);font-size:.75rem">✉ Emailed</span>') +
              '</td>' +
              '<td style="max-width:220px;font-size:.78rem;color:var(--text-sub)">' +
              esc(a.cover_note || '—') +
              '</td>' +
              '<td>' +
              statusCell +
              '</td>' +
              '<td style="white-space:nowrap;font-size:.78rem">' +
              timeAgo(a.created_at) +
              '</td></tr>'
            );
          })
          .join('');
      });
  }

  function setAppStatus(appId, sel) {
    sel.disabled = true;
    reApiFetch('/api/recruiter/applications/' + encodeURIComponent(appId) + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: sel.value }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        sel.disabled = false;
        if (!d.success) alert(d.error || 'Could not update status.');
      })
      .catch(function () {
        sel.disabled = false;
        alert('Network error — please try again.');
      });
  }

  function closeApplicantsModal() {
    document.getElementById('modal-applicants').style.display = 'none';
  }

  /* ── BULK UPLOAD (recruiter/admin, Jobs/index.html) ──────────────
     Client-side parse (SheetJS) of an .xlsx/.xls/.csv file, one row per
     job, then a plain sequential loop over the same POST /api/jobs used
     by the single-job form — so server-side validation, defaults and
     ownership rules stay in exactly one place. */
  var BULK_MAX_ROWS = 200;
  var bulkRows = [];

  var BULK_ALIASES = {
    company: 'company_name',
    description: 'description_md',
    job_title: 'title',
    type: 'employment_type',
    employment: 'employment_type',
    experience: 'experience_level',
    level: 'experience_level',
    mode: 'work_mode',
    work: 'work_mode',
    apply_link: 'apply_url',
    application_url: 'apply_url',
    email: 'notify_email',
    contact_email: 'notify_email',
    remove: 'remove_date',
    removal_date: 'remove_date',
    description_markdown: 'description_md',
    job_description: 'description_md',
  };

  function normalizeHeader(h) {
    return String(h == null ? '' : h)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  function buildRowMap(raw) {
    var map = {};
    Object.keys(raw).forEach(function (k) {
      var nk = normalizeHeader(k);
      nk = BULK_ALIASES[nk] || nk;
      if (!(nk in map) || raw[k] !== '') map[nk] = raw[k];
    });
    return map;
  }

  function normalizeEnum(value, map) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return null;
    var upper = v.toUpperCase().replace(/[\s-]+/g, '_');
    if (Object.prototype.hasOwnProperty.call(map, upper)) return upper;
    var lower = v.toLowerCase();
    var found = null;
    Object.keys(map).forEach(function (k) {
      if (map[k].toLowerCase() === lower) found = k;
    });
    return found;
  }

  function toDateStr(v) {
    if (v === '' || v == null) return '';
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
    if (typeof v === 'number') {
      // Excel serial date (days since 1899-12-30)
      var d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    return String(v).trim();
  }

  function toIntOrNull(v) {
    if (v === '' || v == null) return null;
    var n = parseInt(String(v).replace(/[^0-9.-]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function parseBulkRow(raw, rowNum) {
    var m = buildRowMap(raw);
    var errors = [];

    var title = String(m.title || '').trim();
    if (!title) errors.push('title is required');
    var company_name = String(m.company_name || '').trim();
    if (!company_name) errors.push('company_name is required');
    var description_md = String(m.description_md || '').trim();
    if (!description_md) errors.push('description_md is required');
    else if (description_md.length > 10000)
      errors.push('description_md must be under 10,000 characters');

    var disciplines = [];
    String(m.disciplines || '')
      .split(/[,;/]+/)
      .forEach(function (part) {
        var code = normalizeEnum(part, DISCIPLINES);
        if (code && disciplines.indexOf(code) === -1) disciplines.push(code);
      });
    if (!disciplines.length) {
      errors.push('at least one valid discipline is required (e.g. SI, PI, HARDWARE_DESIGN)');
    }

    var employment_type = m.employment_type ? normalizeEnum(m.employment_type, TYPES) : 'FULL_TIME';
    if (!employment_type)
      errors.push('invalid employment_type — use ' + Object.keys(TYPES).join('/'));
    var experience_level = m.experience_level ? normalizeEnum(m.experience_level, EXP) : 'MID';
    if (!experience_level)
      errors.push('invalid experience_level — use ' + Object.keys(EXP).join('/'));
    var work_mode = m.work_mode ? normalizeEnum(m.work_mode, MODES) : 'ONSITE';
    if (!work_mode) errors.push('invalid work_mode — use ' + Object.keys(MODES).join('/'));

    var apply_mode = /extern/i.test(String(m.apply_mode || '')) ? 'EXTERNAL' : 'IN_PLATFORM';
    var apply_url = String(m.apply_url || '').trim();
    if (apply_mode === 'EXTERNAL' && !/^https?:\/\/.+/i.test(apply_url)) {
      errors.push('apply_url (http/https) is required when apply_mode is EXTERNAL');
    }

    var notify_email = String(m.notify_email || '').trim();
    if (notify_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notify_email)) {
      errors.push('notify_email is not a valid email address');
    }

    var deadline = toDateStr(m.deadline);
    if (deadline && isNaN(Date.parse(deadline))) errors.push('deadline is not a valid date');
    var remove_date = toDateStr(m.remove_date);
    if (remove_date && isNaN(Date.parse(remove_date)))
      errors.push('remove_date is not a valid date');

    var skills = String(m.skills || '')
      .split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
      .slice(0, 15);

    var body = {
      title: title,
      company_name: company_name,
      disciplines: disciplines,
      employment_type: employment_type || 'FULL_TIME',
      experience_level: experience_level || 'MID',
      work_mode: work_mode || 'ONSITE',
      location: String(m.location || '').trim(),
      salary_min: toIntOrNull(m.salary_min),
      salary_max: toIntOrNull(m.salary_max),
      skills: skills,
      apply_mode: apply_mode,
      apply_url: apply_url,
      platform_links: [],
      notify_email: notify_email,
      deadline: deadline || null,
      remove_date: remove_date || null,
      description_md: description_md,
      // Bulk-imported rows skip the "send resumes to (email)" requirement —
      // if omitted, the server falls back to the poster's account email.
      bulk: true,
    };

    return {
      rowNum: rowNum,
      title: title || '(untitled)',
      company_name: company_name || '—',
      body: body,
      errors: errors,
      valid: errors.length === 0,
      status: null,
    };
  }

  function openBulkModal() {
    if (!canPost()) return;
    bulkRows = [];
    var fileInput = document.getElementById('bulk-file');
    if (fileInput) fileInput.value = '';
    var errEl = document.getElementById('bulk-file-error');
    if (errEl) errEl.style.display = 'none';
    var wrap = document.getElementById('bulk-preview-wrap');
    if (wrap) wrap.style.display = 'none';
    document.getElementById('modal-bulk').style.display = 'flex';
  }

  function closeBulkModal() {
    document.getElementById('modal-bulk').style.display = 'none';
  }

  function downloadBulkTemplate() {
    if (typeof XLSX === 'undefined') {
      alert('Template generator failed to load — please refresh and try again.');
      return;
    }
    var headers = [
      'title',
      'company_name',
      'disciplines',
      'employment_type',
      'experience_level',
      'work_mode',
      'location',
      'salary_min',
      'salary_max',
      'skills',
      'apply_mode',
      'apply_url',
      'notify_email',
      'deadline',
      'remove_date',
      'description_md',
    ];
    var example = [
      'Signal Integrity Engineer',
      'Acme Hardware',
      'SI, PI',
      'FULL_TIME',
      'MID',
      'HYBRID',
      'Bangalore, India',
      1800000,
      2800000,
      'Altium, HFSS, DDR5',
      'IN_PLATFORM',
      '',
      'hiring@acme.com',
      '2026-12-31',
      '',
      '**Responsibilities**\n- Design and validate high-speed interfaces\n\n**Requirements**\n- 3-7 years experience',
    ];
    var ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(function () {
      return { wch: 22 };
    });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
    XLSX.writeFile(wb, 'rising-edge-bulk-jobs-template.xlsx');
  }

  function showBulkFileError(msg) {
    var el = document.getElementById('bulk-file-error');
    el.textContent = msg;
    el.style.display = '';
    document.getElementById('bulk-preview-wrap').style.display = 'none';
  }

  function handleBulkFile(file) {
    var errEl = document.getElementById('bulk-file-error');
    errEl.style.display = 'none';
    document.getElementById('bulk-summary').style.display = 'none';
    if (!file) return;
    if (typeof XLSX === 'undefined') {
      showBulkFileError('File reader failed to load — please refresh and try again.');
      return;
    }
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      showBulkFileError('Please choose an .xlsx, .xls, or .csv file.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type: 'array' });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!raw.length) {
          showBulkFileError('No rows found in that file.');
          return;
        }
        var truncated = raw.length > BULK_MAX_ROWS;
        var slice = raw.slice(0, BULK_MAX_ROWS);
        bulkRows = slice.map(function (r, i) {
          return parseBulkRow(r, i + 2); // +2: row 1 is the header
        });
        renderBulkPreview(truncated, raw.length);
      } catch (err) {
        showBulkFileError("Could not read that file. Make sure it's a valid Excel or CSV file.");
      }
    };
    reader.onerror = function () {
      showBulkFileError('Could not read that file.');
    };
    reader.readAsArrayBuffer(file);
  }

  function renderBulkPreview(truncated, totalCount) {
    var wrap = document.getElementById('bulk-preview-wrap');
    wrap.style.display = '';
    var validCount = bulkRows.filter(function (r) {
      return r.valid;
    }).length;
    var summaryEl = document.getElementById('bulk-preview-summary');
    summaryEl.textContent =
      bulkRows.length +
      ' row' +
      (bulkRows.length === 1 ? '' : 's') +
      ' found — ' +
      validCount +
      ' ready to publish, ' +
      (bulkRows.length - validCount) +
      ' need fixing.' +
      (truncated
        ? ' Only the first ' +
          bulkRows.length +
          ' of ' +
          totalCount +
          ' rows were loaded (limit ' +
          BULK_MAX_ROWS +
          ').'
        : '');
    var rowsEl = document.getElementById('bulk-preview-rows');
    rowsEl.innerHTML = bulkRows
      .map(function (r, i) {
        var statusHtml = r.valid
          ? '<span class="badge badge-green">Ready</span>'
          : '<span class="badge badge-red">Needs fixing</span>' +
            '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">' +
            esc(r.errors.join('; ')) +
            '</div>';
        return (
          '<tr><td>' +
          r.rowNum +
          '</td><td>' +
          esc(r.title) +
          '</td><td>' +
          esc(r.company_name) +
          '</td><td id="bulk-row-status-' +
          i +
          '">' +
          statusHtml +
          '</td></tr>'
        );
      })
      .join('');
    var btn = document.getElementById('bulk-upload-btn');
    btn.disabled = validCount === 0;
    btn.textContent = 'Publish valid jobs';
    document.getElementById('bulk-summary').style.display = 'none';
  }

  function uploadBulkJobs() {
    var idxs = [];
    bulkRows.forEach(function (r, i) {
      if (r.valid && r.status !== 'done') idxs.push(i);
    });
    if (!idxs.length) return;
    var btn = document.getElementById('bulk-upload-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading…';

    var successCount = 0;
    var failCount = 0;

    function next(pos) {
      if (pos >= idxs.length) {
        btn.textContent = 'Done';
        var sumEl = document.getElementById('bulk-summary');
        sumEl.style.display = '';
        sumEl.innerHTML =
          '<strong>' +
          successCount +
          '</strong> job' +
          (successCount === 1 ? '' : 's') +
          ' published' +
          (failCount
            ? ', <strong style="color:var(--red,#ef4444)">' + failCount + '</strong> failed'
            : '') +
          '.';
        loadList();
        return;
      }
      var i = idxs[pos];
      var row = bulkRows[i];
      var statusCell = document.getElementById('bulk-row-status-' + i);
      if (statusCell) statusCell.innerHTML = '<span class="badge badge-gray">Uploading…</span>';
      reApiFetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row.body),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          if (d.success) {
            row.status = 'done';
            successCount++;
            if (statusCell)
              statusCell.innerHTML = '<span class="badge badge-green">Published ✓</span>';
          } else {
            row.status = 'failed';
            failCount++;
            if (statusCell) {
              statusCell.innerHTML =
                '<span class="badge badge-red">Failed</span>' +
                '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">' +
                esc(d.error || 'Could not publish.') +
                '</div>';
            }
          }
        })
        .catch(function () {
          row.status = 'failed';
          failCount++;
          if (statusCell) {
            statusCell.innerHTML =
              '<span class="badge badge-red">Failed</span>' +
              '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">Network error.</div>';
          }
        })
        .then(function () {
          next(pos + 1);
        });
    }
    next(0);
  }

  /* ── MY APPLICATIONS PAGE (candidate) ─────────────────────────── */
  var APP_BADGE = {
    SUBMITTED: 'badge-gray',
    VIEWED: 'badge-blue',
    SHORTLISTED: 'badge-cyan',
    REJECTED: 'badge-red',
    HIRED: 'badge-green',
  };

  function initMyApps() {
    if (!isLoggedIn()) {
      loginRedirect();
      return;
    }
    loadMyApps();
  }

  function loadMyApps() {
    var tb = document.getElementById('ma-rows');
    reApiFetch('/api/me/job-applications')
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d.success) {
          tb.innerHTML = '<tr><td colspan="5">' + esc(d.error) + '</td></tr>';
          return;
        }
        if (!d.data.length) {
          tb.innerHTML =
            '<tr><td colspan="5" style="color:var(--text-muted)">No applications yet — ' +
            '<a href="index.html">browse open jobs</a>.</td></tr>';
          return;
        }
        tb.innerHTML = d.data
          .map(function (a) {
            var external = a.kind === 'EXTERNAL_CLICK';
            var statusHtml = external
              ? '<span class="badge badge-gray">Applied externally</span>'
              : '<span class="badge ' +
                (APP_BADGE[a.status] || 'badge-gray') +
                '">' +
                esc(a.status.charAt(0) + a.status.slice(1).toLowerCase()) +
                '</span>';
            return (
              '<tr><td><a href="job.html?id=' +
              encodeURIComponent(a.job_id) +
              '">' +
              esc(a.title) +
              '</a></td>' +
              '<td>' +
              esc(a.company_name) +
              '</td>' +
              '<td>' +
              statusHtml +
              (a.job_status !== 'ACTIVE'
                ? ' <span class="badge badge-orange">Job ' +
                  esc(a.job_status.toLowerCase()) +
                  '</span>'
                : '') +
              '</td>' +
              '<td style="white-space:nowrap;font-size:.8rem">' +
              timeAgo(a.created_at) +
              '</td>' +
              '<td>' +
              (external || a.status === 'HIRED'
                ? ''
                : '<button class="btn btn-ghost btn-sm" onclick="JobsBoard.withdrawApp(\'' +
                  a.id +
                  '\')">Withdraw</button>') +
              '</td></tr>'
            );
          })
          .join('');
      })
      .catch(function () {
        tb.innerHTML =
          '<tr><td colspan="5" style="color:var(--text-muted)">Could not load applications.</td></tr>';
      });
  }

  function withdrawApp(id) {
    if (!confirm('Withdraw this application? The recruiter will no longer see it.')) return;
    reApiFetch('/api/me/job-applications/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function (r) {
        return r.json();
      })
      .then(function () {
        loadMyApps();
      });
  }

  return {
    initList: initList,
    initDetail: initDetail,
    initPost: initPost,
    addLinkRow: addLinkRow,
    clearFilters: clearFilters,
    goPage: goPage,
    handleApplyClick: handleApplyClick,
    goEditJob: goEditJob,
    deleteJobFromList: deleteJobFromList,
    getCurrentJobId: getCurrentJobId,
    deleteJobFromDetail: deleteJobFromDetail,
    openApplyModal: openApplyModal,
    closeApplyModal: closeApplyModal,
    submitApplication: submitApplication,
    submitJob: submitJob,
    startEditJob: startEditJob,
    cancelEdit: cancelEdit,
    closeJob: closeJob,
    reopenJob: reopenJob,
    deleteJob: deleteJob,
    viewApplicants: viewApplicants,
    setAppStatus: setAppStatus,
    closeApplicantsModal: closeApplicantsModal,
    initMyApps: initMyApps,
    withdrawApp: withdrawApp,
    formatDesc: formatDesc,
    toggleDescPreview: toggleDescPreview,
    openBulkModal: openBulkModal,
    closeBulkModal: closeBulkModal,
    downloadBulkTemplate: downloadBulkTemplate,
    handleBulkFile: handleBulkFile,
    uploadBulkJobs: uploadBulkJobs,
  };
})();
