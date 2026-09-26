/* ═══════════════════════════════════════════════════════════════════
   RISING EDGE — Training progress (per-user, per-lesson)
   Tracks completion so a logged-in user can resume a course where they
   left off, and sees checkmarks in the left module sidebar / module
   cards for lessons they've already finished.

   Zero per-page configuration: course_id and lesson_id are derived from
   the page's own URL (…/Trainings/<Course>/<Sub>/<lesson>.html), so the
   exact same script works on every lesson page and every course index
   page without a manifest.

   Depends on core.js globals: isLoggedIn, getAuthUser, reApiFetch.
   Include this file after core.js:
     <script src="{path-to-assets}/js/training-progress.js"></script>
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return; // signed-out visitors: no tracking

  function deriveCourseLesson() {
    // e.g. /Trainings/Circuit/DDR4/01-introduction.html
    //   -> courseId "Circuit/DDR4", lessonId "01-introduction"
    var m = window.location.pathname.match(/\/Trainings\/(.+)\/([^/]+)\.html?$/i);
    if (!m) return null;
    return { courseId: m[1], lessonId: m[2].toLowerCase() };
  }

  var ctx = deriveCourseLesson();
  if (!ctx) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function fetchProgress(courseId) {
    return reApiFetch('/api/training/progress?course=' + encodeURIComponent(courseId))
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        return d && d.success ? d.data : { lessons: {}, lastLessonId: null };
      })
      .catch(function () {
        return { lessons: {}, lastLessonId: null };
      });
  }

  function postProgress(courseId, lessonId, completed) {
    var body = { course_id: courseId, lesson_id: lessonId };
    if (typeof completed === 'boolean') body.completed = completed;
    return reApiFetch('/api/training/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(body),
    })
      .then(function (r) {
        return r.json();
      })
      .catch(function () {
        return null;
      });
  }

  function hrefLessonId(href) {
    var m = String(href || '').match(/([^/]+)\.html?(?:[?#].*)?$/i);
    return m ? m[1].toLowerCase() : null;
  }

  function markSidebarAndCards(lessons) {
    // Left module nav (present on every lesson page and course index page).
    var items = document.querySelectorAll('.content-sidebar .module-item');
    items.forEach(function (a) {
      var lid = hrefLessonId(a.getAttribute('href'));
      if (lid && lessons[lid] && lessons[lid].completed && !a.querySelector('.re-check')) {
        var chk = document.createElement('span');
        chk.className = 're-check';
        chk.setAttribute('aria-label', 'Completed');
        chk.textContent = '✓';
        a.insertBefore(chk, a.firstChild);
      }
    });
    // Bigger module cards on the course index page, if present.
    var cards = document.querySelectorAll('.module-card');
    cards.forEach(function (a) {
      var lid = hrefLessonId(a.getAttribute('href'));
      if (lid && lessons[lid] && lessons[lid].completed && !a.querySelector('.re-check-badge')) {
        var chk = document.createElement('span');
        chk.className = 're-check-badge';
        chk.setAttribute('aria-label', 'Completed');
        chk.textContent = '✓';
        a.appendChild(chk);
      }
    });
  }

  function countLinks(selector) {
    var seen = {};
    document.querySelectorAll(selector).forEach(function (a) {
      var lid = hrefLessonId(a.getAttribute('href'));
      if (lid && lid !== 'index') seen[lid] = true;
    });
    return Object.keys(seen);
  }

  /* ── Course index page: resume banner + progress bar ────────────── */
  function renderResumeBanner(progress) {
    var banner = document.getElementById('course-resume-banner');
    if (!banner) return;
    var allLessonIds = countLinks('.content-sidebar .module-item, .module-card');
    if (!allLessonIds.length) return;
    var completedCount = 0;
    allLessonIds.forEach(function (lid) {
      if (progress.lessons[lid] && progress.lessons[lid].completed) completedCount++;
    });
    var pct = Math.round((completedCount / allLessonIds.length) * 100);

    // "Continue" resumes at the exact lesson last viewed (most recent
    // last_viewed_at), regardless of whether it was marked complete.
    var resumeHref = progress.lastLessonId ? progress.lastLessonId + '.html' : null;

    var html = '';
    if (completedCount > 0) {
      html +=
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">' +
        '<span style="font-size:0.8125rem;color:var(--text-sub);font-weight:600">' +
        completedCount +
        ' of ' +
        allLessonIds.length +
        ' modules completed (' +
        pct +
        '%)</span>' +
        '</div>' +
        '<div class="re-progress-bar" style="margin-bottom:14px">' +
        '<div class="re-progress-bar-fill" style="width:' +
        pct +
        '%"></div>' +
        '</div>';
    }
    if (resumeHref) {
      html +=
        '<a class="btn btn-primary btn-lg" href="' +
        esc(resumeHref) +
        '">Continue where you left off →</a>';
    }
    if (html) banner.innerHTML = html;
  }

  // Locate the forward-navigation row on a lesson page. Two known templates:
  //  A) a wrapper with class "lesson-nav" containing the back/forward <a> pair
  //  B) an unclassed inline-styled flex <div> with the same back/forward <a>
  //     pair (no .lesson-nav class). Real nav links are always <a>; in-page
  //     quiz/demo controls ("Next question", "Reveal", "Play") are always
  //     <button>, so filtering to <a class="btn-primary" href="*.html"> is
  //     safe. If several match, the last one in document order is used.
  function findForwardNav() {
    var nav = document.querySelector('.lesson-nav');
    if (nav) return { container: nav, next: nav.querySelector('.btn-primary') };

    var links = document.querySelectorAll('a.btn-primary[href]');
    var chosen = null;
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      if (
        href &&
        !/^https?:/i.test(href) &&
        href.indexOf('mailto:') !== 0 &&
        href.indexOf('#') !== 0 &&
        /\.html?(\?|#|$)/i.test(href)
      ) {
        chosen = links[i];
      }
    }
    if (!chosen) return null;
    var container = chosen.closest('div') || chosen.parentNode;
    return { container: container, next: chosen };
  }

  /* ── Lesson page: "Mark as complete" checkbox + auto-complete on Next ── */
  function renderMarkComplete(courseId, lessonId, lessons) {
    var found = findForwardNav();
    if (!found || !found.container || document.getElementById('re-mark-complete-wrap')) return;
    var nav = found.container;

    var isComplete = !!(lessons[lessonId] && lessons[lessonId].completed);

    var wrap = document.createElement('label');
    wrap.className = 're-mark-complete';
    wrap.id = 're-mark-complete-wrap';
    wrap.innerHTML =
      '<input type="checkbox" id="re-mark-complete-cb"' +
      (isComplete ? ' checked' : '') +
      ' /><span id="re-mark-complete-label">' +
      (isComplete ? 'Completed' : 'Mark as complete') +
      '</span>';
    nav.parentNode.insertBefore(wrap, nav);

    var cb = wrap.querySelector('#re-mark-complete-cb');
    var label = wrap.querySelector('#re-mark-complete-label');
    cb.addEventListener('change', function () {
      var checked = cb.checked;
      label.textContent = checked ? 'Completed' : 'Mark as complete';
      postProgress(courseId, lessonId, checked).then(function () {
        lessons[lessonId] = lessons[lessonId] || {};
        lessons[lessonId].completed = checked;
        markSidebarAndCards(lessons);
      });
    });

    // Clicking the "Next"/"Back to Course Home" button implies the lesson
    // was finished — auto-mark complete (fire-and-forget, keepalive so it
    // survives the navigation) without blocking the click.
    var nextLink = found.next;
    if (nextLink) {
      nextLink.addEventListener('click', function () {
        if (!cb.checked) {
          cb.checked = true;
          label.textContent = 'Completed';
        }
        postProgress(courseId, lessonId, true);
      });
    }
  }

  /* ── Init ─────────────────────────────────────────────────────────── */
  fetchProgress(ctx.courseId).then(function (progress) {
    markSidebarAndCards(progress.lessons || {});

    if (ctx.lessonId === 'index') {
      renderResumeBanner(progress);
      return;
    }

    // Record a "visit" (bumps last_viewed_at for resume, doesn't touch
    // completion state) and wire up the mark-complete UI.
    postProgress(ctx.courseId, ctx.lessonId);
    renderMarkComplete(ctx.courseId, ctx.lessonId, progress.lessons || {});
  });
})();
