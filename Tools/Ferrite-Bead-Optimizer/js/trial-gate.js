/**
 * Ferrite Bead Optimizer — TRIAL GATE
 *
 * Shared by ferrite-bead-optimizer-trial.html only. Determines whether the
 * current visitor is allowed to actually execute the optimizer, and shows
 * a "register / subscribe" modal when they are not. The paid tool
 * (ferrite-bead-optimizer.html) already gates the whole page behind
 * requireAuth() + js/optimizer.js; this trial page instead renders the
 * full UI for anyone, and only gates the "Run Optimizer" action itself —
 * so visitors can see what the tool offers before being asked to convert.
 *
 * Access rule: same plan hierarchy used on Tools/tools.html.
 *   basic (free, default) < advanced < premium
 * This tool requires ADVANCED or higher.
 */
(function () {
  'use strict';

  var REQUIRED_PLAN = 'advanced';
  var PLAN_RANK = { basic: 0, advanced: 1, premium: 2 };
  var PLAN_LABEL = { basic: 'Basic', advanced: 'Advanced', premium: 'Premium' };

  function userCanAccess(userPlan) {
    var required = PLAN_RANK[REQUIRED_PLAN] || 0;
    var current = PLAN_RANK[userPlan] || 0;
    return current >= required;
  }

  /** Resolve the signed-in user's plan. Not logged in → 'basic' (and the
   * modal will offer registration instead of an upgrade link). Logged in →
   * ask the subscription API, falling back to 'basic' on any failure so a
   * broken/offline API never accidentally unlocks a paid tool. */
  function getCurrentPlan(cb) {
    var loggedIn = typeof isLoggedIn === 'function' && isLoggedIn();
    if (!loggedIn) {
      cb('basic', false);
      return;
    }
    var token = typeof reGetToken === 'function' ? reGetToken() : '';
    if (!token) {
      cb('basic', true);
      return;
    }
    fetch('/api/subscription/status', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        var plan = (d && d.success && d.subscription && d.subscription.planId) || 'basic';
        cb(plan, true);
      })
      .catch(function () {
        cb('basic', true);
      });
  }

  /* ── Modal markup (injected once, on demand) ─────────────────────────── */
  var modalEl = null;

  function buildModal() {
    var wrap = document.createElement('div');
    wrap.className = 'fb-gate-backdrop';
    wrap.id = 'fb-gate-backdrop';
    wrap.hidden = true;
    wrap.innerHTML =
      '<section class="fb-gate-panel" role="dialog" aria-modal="true" aria-labelledby="fb-gate-title">' +
      '<button class="fb-gate-close" type="button" data-gate-close aria-label="Close">×</button>' +
      '<div id="fb-gate-body"></div>' +
      '</section>';
    document.body.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) closeGate();
    });
    wrap.querySelector('[data-gate-close]').addEventListener('click', closeGate);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !wrap.hidden) closeGate();
    });

    return wrap;
  }

  function lockIconSvg() {
    return (
      '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">' +
      '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
      '</svg>'
    );
  }

  function checkSvg() {
    return (
      '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">' +
      '<polyline points="20 6 9 17 4 12"/></svg>'
    );
  }

  function redirectUrl(base) {
    return base + '?redirect=' + encodeURIComponent(window.location.href);
  }

  /** mode: 'register' (not logged in) or 'upgrade' (logged in, plan too low) */
  function renderBody(mode, currentPlan) {
    var body = modalEl.querySelector('#fb-gate-body');
    var featureList =
      '<ul class="fb-gate-features">' +
      '<li>' +
      checkSvg() +
      '<span>Automatic ferrite bead selection from the parts database</span></li>' +
      '<li>' +
      checkSvg() +
      '<span>Impedance, insertion-loss, resonance &amp; PDN charts</span></li>' +
      '<li>' +
      checkSvg() +
      '<span>Ranked candidate comparison &amp; PCB layout guidelines</span></li>' +
      '<li>' +
      checkSvg() +
      '<span>CSV / JSON export and printable reports</span></li>' +
      '</ul>';

    if (mode === 'register') {
      body.innerHTML =
        '<div class="fb-gate-icon">' +
        lockIconSvg() +
        '</div>' +
        '<span class="fb-gate-kicker">Free preview</span>' +
        '<h2 id="fb-gate-title">Create a free account to run the optimizer</h2>' +
        '<p>You can explore the full Ferrite Bead Optimizer layout, but running an analysis requires a Rising Edge account and an <strong>' +
        PLAN_LABEL[REQUIRED_PLAN] +
        '</strong> plan or higher.</p>' +
        featureList +
        '<div class="fb-gate-actions">' +
        '<a class="btn btn-primary" href="' +
        redirectUrl('../../Login-pages/register.html') +
        '">Create free account</a>' +
        '<a class="btn btn-outline" href="' +
        redirectUrl('../../subscription/plans.html') +
        '">View subscription plans</a>' +
        '</div>' +
        '<p class="fb-gate-foot">Already have an account? <a href="' +
        redirectUrl('../../Login-pages/login.html') +
        '">Log in</a></p>';
    } else {
      body.innerHTML =
        '<div class="fb-gate-icon">' +
        lockIconSvg() +
        '</div>' +
        '<span class="fb-gate-kicker">Upgrade required</span>' +
        '<h2 id="fb-gate-title">This tool needs the ' +
        PLAN_LABEL[REQUIRED_PLAN] +
        ' plan</h2>' +
        '<div class="fb-gate-plan-row">' +
        '<span>Your plan: <strong>' +
        (PLAN_LABEL[currentPlan] || 'Basic') +
        '</strong></span>' +
        '<span class="fb-gate-arrow">→</span>' +
        '<span>Required: <strong>' +
        PLAN_LABEL[REQUIRED_PLAN] +
        '</strong></span>' +
        '</div>' +
        '<p>Running the optimizer — impedance/insertion-loss modelling, bead recommendations, and layout guidelines — is part of the ' +
        PLAN_LABEL[REQUIRED_PLAN] +
        ' plan.</p>' +
        featureList +
        '<div class="fb-gate-actions">' +
        '<a class="btn btn-primary" href="' +
        redirectUrl('../../subscription/plans.html') +
        '">Upgrade to ' +
        PLAN_LABEL[REQUIRED_PLAN] +
        '</a>' +
        '<button class="btn btn-outline" type="button" data-gate-close>Maybe later</button>' +
        '</div>';
      var laterBtn = body.querySelector('[data-gate-close]');
      if (laterBtn) laterBtn.addEventListener('click', closeGate);
    }
  }

  function openGate(mode, currentPlan) {
    if (!modalEl) modalEl = buildModal();
    renderBody(mode, currentPlan);
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
    var firstFocusable = modalEl.querySelector('a.btn, button.btn');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeGate() {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.style.overflow = '';
  }

  /** Public entry point used by optimizer-trial.js before it runs anything.
   * `onAllowed` is called only when the visitor already has sufficient
   * access (e.g. a real Advanced/Premium subscriber previewing the trial
   * link) — otherwise the gate modal is shown and onAllowed is skipped. */
  function requireAccess(onAllowed) {
    getCurrentPlan(function (plan, loggedIn) {
      if (userCanAccess(plan)) {
        onAllowed();
        return;
      }
      openGate(loggedIn ? 'upgrade' : 'register', plan);
    });
  }

  window.FBTrialGate = {
    REQUIRED_PLAN: REQUIRED_PLAN,
    PLAN_LABEL: PLAN_LABEL,
    userCanAccess: userCanAccess,
    getCurrentPlan: getCurrentPlan,
    requireAccess: requireAccess,
    openGate: openGate,
    closeGate: closeGate,
  };
})();
