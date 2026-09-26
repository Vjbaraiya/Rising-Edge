/**
 * Termination Selector — Animations
 * Builds the animated SVG diagrams (reflection at open vs terminated end,
 * current path comparison), small schematic icons for the concept tabs and
 * the design-review comparison, and reveal-on-scroll behaviour.
 * Motion is done with CSS animation classes (defined in
 * css/termination-selector.css) so `prefers-reduced-motion` disables it
 * globally with no extra JS branching.
 */
'use strict';

(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ── Reveal-on-scroll ─────────────────────────────────────────────────── */
  function initRevealOnScroll() {
    const targets = document.querySelectorAll('.ts-reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('ts-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ts-revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach(t => io.observe(t));
  }

  /* ── Diagram 1: reflection at open end vs terminated end ─────────────────── */
  function reflectionSvgMarkup() {
    return `
<svg viewBox="0 0 640 220" xmlns="${SVG_NS}" role="img" aria-label="Reflection animation: open end versus terminated end">
  <defs>
    <marker id="ts-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#60a5fa" />
    </marker>
  </defs>
  <!-- Row 1: open / unterminated -->
  <text x="10" y="24" font-size="12" fill="currentColor" font-weight="700">Unterminated (open end) — rings</text>
  <line x1="40" y1="50" x2="600" y2="50" stroke="currentColor" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="40" cy="50" r="6" fill="#60a5fa"><title>Driver / source</title></circle>
  <circle cx="600" cy="50" r="6" fill="none" stroke="#f87171" stroke-width="2"><title>Open receiver end — high impedance</title></circle>
  <circle id="ts-wave-dot-1" cx="40" cy="50" r="5" fill="#fbbf24" class="ts-wave-dot ts-anim-open">
    <title>Incident/reflected wavefront</title>
  </circle>

  <!-- Row 2: terminated -->
  <text x="10" y="130" font-size="12" fill="currentColor" font-weight="700">Properly terminated — one clean edge</text>
  <line x1="40" y1="156" x2="600" y2="156" stroke="currentColor" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="40" cy="156" r="6" fill="#60a5fa"><title>Driver / source</title></circle>
  <rect x="592" y="150" width="14" height="12" fill="none" stroke="#34d399" stroke-width="2"><title>Termination resistor ≈ Z0 — absorbs the wave</title></rect>
  <circle id="ts-wave-dot-2" cx="40" cy="156" r="5" fill="#34d399" class="ts-wave-dot ts-anim-terminated">
    <title>Incident wavefront — absorbed on arrival</title>
  </circle>
</svg>`;
  }

  function buildReflectionAnimation(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    function render() {
      el.innerHTML = reflectionSvgMarkup();
    }
    render();
    return { replay: render };
  }

  /* ── Diagram 2: current path — series vs parallel vs Thevenin ────────────── */
  function currentPathSvgMarkup() {
    return `
<svg viewBox="0 0 700 260" xmlns="${SVG_NS}" role="img" aria-label="Current path comparison: series, parallel, and Thevenin termination">
  <!-- SERIES -->
  <text x="10" y="20" font-size="12" font-weight="700" fill="currentColor">Series</text>
  <line x1="10" y1="45" x2="60" y2="45" stroke="currentColor" stroke-width="2"/>
  <rect x="60" y="37" width="34" height="16" fill="none" stroke="#60a5fa" stroke-width="2" class="ts-current-pulse"><title>R_S — conducts only while switching, ~0 static power</title></rect>
  <line x1="94" y1="45" x2="220" y2="45" stroke="currentColor" stroke-width="2" class="ts-current-pulse"/>
  <circle cx="230" cy="45" r="7" fill="none" stroke="#a78bfa" stroke-width="2"><title>Receiver input — high impedance</title></circle>

  <!-- PARALLEL -->
  <text x="10" y="100" font-size="12" font-weight="700" fill="currentColor">Parallel</text>
  <line x1="10" y1="125" x2="180" y2="125" stroke="currentColor" stroke-width="2"/>
  <line x1="180" y1="125" x2="180" y2="160" stroke="#34d399" stroke-width="2" class="ts-current-flow"/>
  <rect x="172" y="160" width="16" height="30" fill="none" stroke="#34d399" stroke-width="2" class="ts-current-flow"><title>R_P to V_TT — conducts continuously while the line is held at a static level</title></rect>
  <line x1="180" y1="190" x2="180" y2="205" stroke="#34d399" stroke-width="2" class="ts-current-flow"/>
  <text x="150" y="222" font-size="10" fill="currentColor">V_TT</text>
  <circle cx="180" cy="125" r="7" fill="none" stroke="#a78bfa" stroke-width="2"><title>Receiver tap — matched, no reflection</title></circle>

  <!-- THEVENIN -->
  <text x="330" y="20" font-size="12" font-weight="700" fill="currentColor">Thevenin</text>
  <line x1="330" y1="45" x2="470" y2="45" stroke="currentColor" stroke-width="2"/>
  <line x1="470" y1="45" x2="470" y2="20" stroke="#fbbf24" stroke-width="2" class="ts-current-flow"/>
  <rect x="462" y="4" width="16" height="16" fill="none" stroke="#fbbf24" stroke-width="2" class="ts-current-flow"><title>R1 to VDD — continuous bias current</title></rect>
  <text x="486" y="16" font-size="10" fill="currentColor">V_DD</text>
  <line x1="470" y1="45" x2="470" y2="90" stroke="#fbbf24" stroke-width="2" class="ts-current-flow"/>
  <rect x="462" y="90" width="16" height="16" fill="none" stroke="#fbbf24" stroke-width="2" class="ts-current-flow"><title>R2 to GND — continuous bias current</title></rect>
  <text x="486" y="102" font-size="10" fill="currentColor">GND</text>
  <circle cx="470" cy="45" r="7" fill="none" stroke="#a78bfa" stroke-width="2"><title>Receiver tap — biased at VDD·R2/(R1+R2)</title></circle>

  <text x="330" y="150" font-size="11" fill="currentColor" opacity="0.75">R1‖R2 = Z0 continuously conducts</text>
  <text x="330" y="168" font-size="11" fill="currentColor" opacity="0.75">between VDD and GND — always-on power cost</text>
</svg>`;
  }

  function buildCurrentPathAnimation(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    function render() {
      el.innerHTML = currentPathSvgMarkup();
    }
    render();
    return { replay: render };
  }

  /* ── Design review comparison diagrams ───────────────────────────────────── */
  function reviewGoodSvg() {
    return `
<svg viewBox="0 0 500 140" xmlns="${SVG_NS}" role="img" aria-label="Correct layout: termination resistor at the true trace end">
  <rect x="10" y="55" width="16" height="16" fill="#60a5fa"><title>Driver</title></rect>
  <line x1="26" y1="63" x2="430" y2="63" stroke="currentColor" stroke-width="3"/>
  <rect x="430" y="55" width="16" height="16" fill="none" stroke="#34d399" stroke-width="2"><title>Termination resistor — placed exactly at the trace end</title></rect>
  <circle cx="470" cy="63" r="7" fill="none" stroke="#a78bfa" stroke-width="2"><title>Receiver — right next to termination</title></circle>
  <line x1="446" y1="63" x2="463" y2="63" stroke="currentColor" stroke-width="3"/>
  <text x="150" y="110" font-size="11" fill="#34d399">Short stub, resistor at true electrical end</text>
</svg>`;
  }

  function reviewBadSvg() {
    return `
<svg viewBox="0 0 500 140" xmlns="${SVG_NS}" role="img" aria-label="Incorrect layout: termination resistor tapped mid-trace with a long stub">
  <rect x="10" y="55" width="16" height="16" fill="#60a5fa"><title>Driver</title></rect>
  <line x1="26" y1="63" x2="470" y2="63" stroke="currentColor" stroke-width="3"/>
  <circle cx="470" cy="63" r="7" fill="none" stroke="#f87171" stroke-width="2" stroke-dasharray="2 2"><title>Trace end still open — still reflects!</title></circle>
  <line x1="260" y1="63" x2="260" y2="105" stroke="#f87171" stroke-width="2" class="ts-current-pulse"><title>Long stub — its own reflection point</title></line>
  <rect x="252" y="105" width="16" height="16" fill="none" stroke="#f87171" stroke-width="2"><title>Termination resistor — wrong location</title></rect>
  <text x="120" y="128" font-size="11" fill="#f87171">Long stub + still-open true end = two reflection points</text>
</svg>`;
  }

  function buildReviewDiagrams(goodId, badId) {
    const good = document.getElementById(goodId);
    const bad = document.getElementById(badId);
    if (good) good.innerHTML = reviewGoodSvg();
    if (bad) bad.innerHTML = reviewBadSvg();
  }

  /* ── Small schematic icons for the concept-explorer tabs ─────────────────── */
  const CONCEPT_ICONS = {
    series: `<svg viewBox="0 0 220 120" xmlns="${SVG_NS}"><rect x="10" y="52" width="18" height="16" fill="#60a5fa"/><line x1="28" y1="60" x2="70" y2="60" stroke="currentColor" stroke-width="2"/><rect x="70" y="52" width="30" height="16" fill="none" stroke="#34d399" stroke-width="2"/><text x="72" y="46" font-size="10" fill="currentColor">R_S</text><line x1="100" y1="60" x2="190" y2="60" stroke="currentColor" stroke-width="2"/><circle cx="200" cy="60" r="8" fill="none" stroke="#a78bfa" stroke-width="2"/></svg>`,
    parallel: `<svg viewBox="0 0 220 140" xmlns="${SVG_NS}"><rect x="10" y="52" width="18" height="16" fill="#60a5fa"/><line x1="28" y1="60" x2="150" y2="60" stroke="currentColor" stroke-width="2"/><circle cx="150" cy="60" r="8" fill="none" stroke="#a78bfa" stroke-width="2"/><line x1="150" y1="60" x2="150" y2="90" stroke="currentColor" stroke-width="2"/><rect x="142" y="90" width="16" height="26" fill="none" stroke="#34d399" stroke-width="2"/><text x="160" y="105" font-size="10" fill="currentColor">R_P</text><line x1="150" y1="116" x2="150" y2="128" stroke="currentColor" stroke-width="2"/><text x="130" y="140" font-size="10" fill="currentColor">V_TT</text></svg>`,
    thevenin: `<svg viewBox="0 0 220 150" xmlns="${SVG_NS}"><rect x="10" y="60" width="18" height="16" fill="#60a5fa"/><line x1="28" y1="68" x2="150" y2="68" stroke="currentColor" stroke-width="2"/><circle cx="150" cy="68" r="8" fill="none" stroke="#a78bfa" stroke-width="2"/><line x1="150" y1="68" x2="150" y2="30" stroke="currentColor" stroke-width="2"/><rect x="142" y="14" width="16" height="16" fill="none" stroke="#fbbf24" stroke-width="2"/><text x="162" y="26" font-size="9" fill="currentColor">R1</text><text x="130" y="10" font-size="9" fill="currentColor">VDD</text><line x1="150" y1="68" x2="150" y2="108" stroke="currentColor" stroke-width="2"/><rect x="142" y="108" width="16" height="16" fill="none" stroke="#fbbf24" stroke-width="2"/><text x="162" y="120" font-size="9" fill="currentColor">R2</text><text x="130" y="142" font-size="9" fill="currentColor">GND</text></svg>`,
    ac: `<svg viewBox="0 0 220 140" xmlns="${SVG_NS}"><rect x="10" y="52" width="18" height="16" fill="#60a5fa"/><line x1="28" y1="60" x2="150" y2="60" stroke="currentColor" stroke-width="2"/><circle cx="150" cy="60" r="8" fill="none" stroke="#a78bfa" stroke-width="2"/><line x1="150" y1="60" x2="150" y2="80" stroke="currentColor" stroke-width="2"/><rect x="142" y="80" width="16" height="16" fill="none" stroke="#34d399" stroke-width="2"/><text x="162" y="92" font-size="9" fill="currentColor">R</text><line x1="150" y1="96" x2="150" y2="106" stroke="currentColor" stroke-width="2"/><line x1="140" y1="106" x2="160" y2="106" stroke="#fbbf24" stroke-width="2"/><line x1="140" y1="112" x2="160" y2="112" stroke="#fbbf24" stroke-width="2"/><text x="164" y="112" font-size="9" fill="currentColor">C</text><line x1="150" y1="112" x2="150" y2="124" stroke="currentColor" stroke-width="2"/></svg>`,
    differential: `<svg viewBox="0 0 220 140" xmlns="${SVG_NS}"><line x1="10" y1="45" x2="150" y2="45" stroke="currentColor" stroke-width="2"/><line x1="10" y1="85" x2="150" y2="85" stroke="currentColor" stroke-width="2"/><line x1="150" y1="45" x2="150" y2="85" stroke="#34d399" stroke-width="2"/><rect x="142" y="55" width="16" height="20" fill="none" stroke="#34d399" stroke-width="2"/><text x="162" y="68" font-size="9" fill="currentColor">Z_diff</text><text x="10" y="30" font-size="9" fill="currentColor">D+</text><text x="10" y="100" font-size="9" fill="currentColor">D−</text></svg>`,
  };

  function buildConceptFigures() {
    document.querySelectorAll('[data-svg-slot]').forEach(slot => {
      const key = slot.getAttribute('data-svg-slot');
      if (CONCEPT_ICONS[key]) slot.innerHTML = CONCEPT_ICONS[key];
    });
  }

  /* ── Public init ──────────────────────────────────────────────────────────── */
  function init() {
    initRevealOnScroll();
    buildConceptFigures();
    const reflectionAnim = buildReflectionAnimation('ts-svg-reflection');
    const currentPathAnim = buildCurrentPathAnimation('ts-svg-current-path');
    buildReviewDiagrams('ts-svg-review-good', 'ts-svg-review-bad');

    document.querySelectorAll('[data-replay]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-replay');
        if (target === 'ts-svg-reflection' && reflectionAnim) reflectionAnim.replay();
        if (target === 'ts-svg-current-path' && currentPathAnim) currentPathAnim.replay();
      });
    });
  }

  window.TSAnimations = {
    init,
    buildReflectionAnimation,
    buildCurrentPathAnimation,
    buildReviewDiagrams,
    buildConceptFigures,
  };
})();
