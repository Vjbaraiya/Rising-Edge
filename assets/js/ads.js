/* ═══════════════════════════════════════════════════════════════════
   RISING EDGE TECHNOLOGIES — Ad slots
   Two site-wide slots, auto-injected on every page load — no per-page
   markup needed, the same way global-nav/global-footer work:
     - top-banner        : allow-listed content pages only (728×90)
     - sticky-bottom-bar  : every page except a deny-list (320×50/728×50)

   Each slot asks the server for an active direct-sold campaign first
   (GET /api/ads?slot=...). If one exists, it renders that. Otherwise it
   falls back to an AdSense unit — but ONLY if window.RE_ADSENSE_CLIENT and
   a matching entry in window.RE_ADSENSE_SLOTS have been configured (set
   these in a small inline <script> before this file loads, once an AdSense
   account exists). Until then, or if AdSense has no fill, the slot simply
   stays collapsed — it never leaves an empty gap.

   No dependencies — vanilla ES5-compatible, matches core.js conventions.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  // AdSense configuration — fallback fill used whenever no direct campaign
  // is active for a slot. `if (!window.X)` so a page-specific inline
  // <script> (set before this file loads) could still override these if
  // ever needed, but the whole site shares one publisher account normally.
  if (!window.RE_ADSENSE_CLIENT) window.RE_ADSENSE_CLIENT = 'ca-pub-2385317738136367';
  if (!window.RE_ADSENSE_SLOTS) {
    window.RE_ADSENSE_SLOTS = {
      'top-banner': '3990672279',
      'sticky-bottom-bar': '7526592601',
    };
  }

  // Pages where the top banner is allowed to appear at all.
  var ALLOW_TOP_BANNER = [
    '/Trainings/trainings.html',
    '/Tools/tools.html',
    '/resources/resources.html',
    '/Challenge/index.html',
  ];
  // Pages/areas where NO ad (including the sticky bar) should ever show.
  var DENY_ALL_ADS = [
    '/Challenge/attempt.html',
    '/Certificate/',
    '/checkout',
    '/subscription',
    '/Admin/',
  ];

  function pathMatches(list) {
    var p = window.location.pathname;
    for (var i = 0; i < list.length; i++) {
      if (p.indexOf(list[i]) !== -1) return true;
    }
    return false;
  }

  function fetchAdsForSlot(slot) {
    return fetch('/api/ads?slot=' + encodeURIComponent(slot))
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        return {
          campaign: (d && d.success && d.data) || null,
          // Fail open — a settings hiccup shouldn't silently kill AdSense fill.
          adsenseEnabled: !d || d.adsenseEnabled !== false,
        };
      })
      .catch(function () {
        return { campaign: null, adsenseEnabled: true };
      });
  }

  function reportClick(campaignId) {
    fetch('/api/ads/' + encodeURIComponent(campaignId) + '/click', { method: 'POST' }).catch(
      function () {}
    );
  }

  function renderCampaign(el, campaign) {
    el.innerHTML = '';

    var tag = document.createElement('span');
    tag.className = 're-ad-tag';
    tag.textContent = 'Sponsored';
    el.appendChild(tag);

    var a = document.createElement('a');
    a.href = campaign.targetUrl;
    a.target = '_blank';
    a.rel = 'noopener sponsored';
    a.addEventListener('click', function () {
      reportClick(campaign.id);
    });

    var img = document.createElement('img');
    img.className = 're-ad-img';
    img.src = campaign.imageUrl;
    img.alt = campaign.altText || campaign.advertiserName || 'Sponsored';
    img.loading = 'lazy';
    a.appendChild(img);
    el.appendChild(a);

    if (el.classList.contains('re-ad-slot-sticky')) {
      el.appendChild(buildCloseButton(el));
    }

    el.classList.add('re-ad-filled');
    if (el.classList.contains('re-ad-slot-sticky')) {
      document.body.classList.add('re-ad-bottom-active');
    }
  }

  function renderAdSense(el, slot) {
    var client = window.RE_ADSENSE_CLIENT;
    var slotId = window.RE_ADSENSE_SLOTS && window.RE_ADSENSE_SLOTS[slot];
    if (!client || !slotId) return; // not configured yet — stay collapsed

    el.innerHTML = '';
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', slotId);
    ins.setAttribute('data-full-width-responsive', 'true');
    el.appendChild(ins);

    if (el.classList.contains('re-ad-slot-sticky')) {
      el.appendChild(buildCloseButton(el));
    }

    if (!window._reAdsenseLoaded) {
      window._reAdsenseLoaded = true;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + client;
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense not reachable (blocked, offline) — leave collapsed
      return;
    }

    el.classList.add('re-ad-filled');
    if (el.classList.contains('re-ad-slot-sticky')) {
      document.body.classList.add('re-ad-bottom-active');
    }
  }

  function buildCloseButton(el) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 're-ad-close';
    btn.setAttribute('aria-label', 'Dismiss');
    btn.textContent = '✕';
    btn.addEventListener('click', function () {
      el.classList.remove('re-ad-filled');
      document.body.classList.remove('re-ad-bottom-active');
    });
    return btn;
  }

  function mount(el) {
    var slot = el.getAttribute('data-ad-slot');
    if (!slot) return;
    fetchAdsForSlot(slot).then(function (res) {
      if (res.campaign) {
        renderCampaign(el, res.campaign);
      } else if (res.adsenseEnabled) {
        renderAdSense(el, slot);
      }
      // else: no direct campaign and AdSense is disabled site-wide — stay
      // collapsed, same as when AdSense simply isn't configured.
    });
  }

  function buildSlotEl(slot, extraClass) {
    var el = document.createElement('div');
    el.className = 're-ad-slot' + (extraClass ? ' ' + extraClass : '');
    el.setAttribute('data-ad-slot', slot);
    return el;
  }

  function autoInject() {
    if (pathMatches(DENY_ALL_ADS)) return; // no ads at all on these pages

    // Top banner — only on allow-listed content pages, placed right after
    // the page header (falls back to the top of <body>).
    if (pathMatches(ALLOW_TOP_BANNER)) {
      var header = document.querySelector('.page-header');
      var top = buildSlotEl('top-banner', 're-ad-slot-top');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(top, header.nextSibling);
      } else {
        document.body.insertBefore(top, document.body.firstChild);
      }
      mount(top);
    }

    // Sticky bottom bar — every remaining page.
    var bar = buildSlotEl('sticky-bottom-bar', 're-ad-slot-sticky');
    document.body.appendChild(bar);
    mount(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInject);
  } else {
    autoInject();
  }
})();
