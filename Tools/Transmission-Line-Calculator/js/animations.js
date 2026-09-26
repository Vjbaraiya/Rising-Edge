/**
 * Transmission Line Calculator — Animations
 * Builds the two required animated SVG diagrams (microstrip-vs-stripline
 * field-line cross-sections, and a differential-pair coupling cross-
 * section), the seven concept-explorer tab icons, the design-review
 * comparison diagrams, reveal-on-scroll, and the general-purpose
 * proportional cross-section renderer used by both the calculator card and
 * the live slider simulation (renderCrossSection). Motion uses CSS
 * animation classes defined in css/transmission-line-calculator.css so
 * `prefers-reduced-motion` disables it globally with no extra JS branching.
 */
'use strict';

(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* ── Reveal-on-scroll ─────────────────────────────────────────────────── */
  function initRevealOnScroll() {
    const targets = document.querySelectorAll('.tlc-reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('tlc-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('tlc-revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach(t => io.observe(t));
  }

  /* ── Diagram 1: microstrip vs stripline field-line cross-sections ────── */
  function stackupSvgMarkup() {
    return `
<svg viewBox="0 0 640 300" xmlns="${SVG_NS}" role="img" aria-label="Cross-section diagrams comparing microstrip and stripline field distribution">
  <!-- MICROSTRIP -->
  <text x="10" y="20" font-size="12" font-weight="700" fill="currentColor">Microstrip — field partly in air, partly in dielectric</text>
  <rect x="20" y="90" width="600" height="14" fill="#94a3b8" fill-opacity="0.5"><title>Reference (ground) plane</title></rect>
  <rect x="20" y="46" width="600" height="44" fill="#1e293b" fill-opacity="0.55"><title>Dielectric, height H</title></rect>
  <rect x="290" y="36" width="60" height="10" fill="#fbbf24"><title>Signal trace, width W, thickness T</title></rect>
  <path class="tlc-field-line" d="M300,36 C260,10 220,20 220,46" stroke="#60a5fa" stroke-width="1.5" fill="none"><title>Fringing field — partly air, partly dielectric</title></path>
  <path class="tlc-field-line" d="M340,36 C380,10 420,20 420,46" stroke="#60a5fa" stroke-width="1.5" fill="none"/>
  <path class="tlc-field-line" d="M300,36 Q300,-6 320,-6 Q340,-6 340,36" stroke="#60a5fa" stroke-width="1.5" fill="none"/>
  <path class="tlc-field-line" d="M300,46 L300,90" stroke="#22d3ee" stroke-width="1.5" fill="none"/>
  <path class="tlc-field-line" d="M340,46 L340,90" stroke="#22d3ee" stroke-width="1.5" fill="none"/>
  <text x="560" y="70" font-size="9" fill="currentColor">H</text>
  <text x="10" y="112" font-size="9" fill="#94a3b8">One reference plane — higher EMI, easier to route</text>

  <!-- STRIPLINE -->
  <text x="10" y="150" font-size="12" font-weight="700" fill="currentColor">Stripline — field fully enclosed in one dielectric</text>
  <rect x="20" y="286" width="600" height="10" fill="#94a3b8" fill-opacity="0.5"><title>Bottom reference plane</title></rect>
  <rect x="20" y="168" width="600" height="10" fill="#94a3b8" fill-opacity="0.5"><title>Top reference plane</title></rect>
  <rect x="20" y="178" width="600" height="108" fill="#1e293b" fill-opacity="0.55"><title>Dielectric, total spacing B</title></rect>
  <rect x="290" y="226" width="60" height="10" fill="#fbbf24"><title>Signal trace, centered — width W, thickness T</title></rect>
  <path class="tlc-field-line" d="M300,226 C260,205 235,205 235,178" stroke="#60a5fa" stroke-width="1.5" fill="none"><title>Field fully contained between the two planes</title></path>
  <path class="tlc-field-line" d="M340,226 C380,205 405,205 405,178" stroke="#60a5fa" stroke-width="1.5" fill="none"/>
  <path class="tlc-field-line" d="M300,236 C260,257 235,257 235,286" stroke="#22d3ee" stroke-width="1.5" fill="none"/>
  <path class="tlc-field-line" d="M340,236 C380,257 405,257 405,286" stroke="#22d3ee" stroke-width="1.5" fill="none"/>
  <text x="560" y="235" font-size="9" fill="currentColor">B</text>
  <text x="10" y="300" font-size="9" fill="#94a3b8">Two reference planes — fully shielded, needs thicker stack-up</text>
</svg>`;
  }

  function buildStackupAnimation(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    function render() {
      el.innerHTML = stackupSvgMarkup();
    }
    render();
    return { replay: render };
  }

  /* ── Diagram 2: differential pair coupling vs spacing ─────────────────── */
  function diffPairSvgMarkup(spacingState) {
    const s = spacingState || 'medium';
    const gap = s === 'tight' ? 26 : s === 'loose' ? 110 : 60;
    const cx1 = 320 - gap / 2 - 15;
    const cx2 = 320 + gap / 2 + 15;
    const label =
      s === 'tight'
        ? 'Tight coupling — lower Zdiff, more common-mode rejection, tighter routing tolerance'
        : s === 'loose'
          ? 'Loose coupling — Zdiff approaches 2× single-ended Z0, easier routing, weaker rejection'
          : 'Moderate coupling — typical routed spacing for most differential standards';
    return `
<svg viewBox="0 0 640 260" xmlns="${SVG_NS}" role="img" aria-label="Differential pair cross-section showing coupling field lines, spacing state: ${s}">
  <rect x="20" y="150" width="600" height="14" fill="#94a3b8" fill-opacity="0.5"><title>Reference plane</title></rect>
  <rect x="20" y="70" width="600" height="80" fill="#1e293b" fill-opacity="0.55"><title>Dielectric, height H</title></rect>
  <rect x="${cx1 - 22}" y="60" width="44" height="10" fill="#60a5fa"><title>D+ trace</title></rect>
  <rect x="${cx2 - 22}" y="60" width="44" height="10" fill="#f472b6"><title>D− trace</title></rect>
  <path class="tlc-field-line" d="M${cx1 + 22},65 C${(cx1 + cx2) / 2},${s === 'tight' ? 20 : 5} ${cx2 - 22},65 ${cx2 - 22},65" stroke="#a78bfa" stroke-width="2" fill="none"><title>Differential (odd-mode) coupling field — the dominant path when traces are close</title></path>
  <path class="tlc-field-line" d="M${cx1},70 L${cx1},150" stroke="#22d3ee" stroke-width="1.5" fill="none"><title>D+ to reference plane</title></path>
  <path class="tlc-field-line" d="M${cx2},70 L${cx2},150" stroke="#22d3ee" stroke-width="1.5" fill="none"><title>D− to reference plane</title></path>
  <line x1="${cx1 + 22}" y1="40" x2="${cx2 - 22}" y2="40" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>
  <text x="${(cx1 + cx2) / 2}" y="32" font-size="10" fill="currentColor" text-anchor="middle">S</text>
  <text x="10" y="24" font-size="12" font-weight="700" fill="currentColor">Differential pair — spacing state: ${s}</text>
  <text x="10" y="185" font-size="10" fill="#94a3b8">${label}</text>
</svg>`;
  }

  function buildDiffPairAnimation(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    let state = 'medium';
    function render() {
      el.innerHTML = diffPairSvgMarkup(state);
    }
    function setState(next) {
      state = next;
      render();
    }
    render();
    return { replay: render, setState };
  }

  /* ── Design review comparison diagrams ───────────────────────────────── */
  function reviewGoodSvg() {
    return `
<svg viewBox="0 0 500 160" xmlns="${SVG_NS}" role="img" aria-label="Correct layout: trace width matched to the field-solved stackup for the target impedance">
  <rect x="20" y="120" width="460" height="12" fill="#94a3b8" fill-opacity="0.5"><title>Continuous reference plane directly beneath the trace</title></rect>
  <rect x="20" y="70" width="460" height="50" fill="#1e293b" fill-opacity="0.5"><title>Dielectric, height H</title></rect>
  <rect x="205" y="58" width="90" height="12" fill="#34d399"><title>Trace width calculated from H, T, er for the target Z0</title></rect>
  <text x="120" y="145" font-size="11" fill="#34d399">Width chosen from the actual stack-up — Z0 lands on target</text>
</svg>`;
  }

  function reviewBadSvg() {
    return `
<svg viewBox="0 0 500 160" xmlns="${SVG_NS}" role="img" aria-label="Incorrect layout: trace too narrow for the stackup, and a broken reference plane">
  <rect x="20" y="120" width="200" height="12" fill="#94a3b8" fill-opacity="0.5"><title>Reference plane — broken by a routing gap under the trace</title></rect>
  <rect x="220" y="120" width="40" height="12" fill="none" stroke="#f87171" stroke-width="1.5" stroke-dasharray="3 2"><title>Plane gap directly under the signal — no return path here</title></rect>
  <rect x="260" y="120" width="220" height="12" fill="#94a3b8" fill-opacity="0.5"/>
  <rect x="20" y="70" width="460" height="50" fill="#1e293b" fill-opacity="0.5"/>
  <rect x="225" y="62" width="30" height="12" fill="#f87171"><title>Trace far too narrow for this H/er — Z0 runs high, not at target</title></rect>
  <text x="70" y="145" font-size="11" fill="#f87171">Width copied from another board + a plane gap under the trace = wrong Z0 and a return-path discontinuity</text>
</svg>`;
  }

  function buildReviewDiagrams(goodId, badId) {
    const good = document.getElementById(goodId);
    const bad = document.getElementById(badId);
    if (good) good.innerHTML = reviewGoodSvg();
    if (bad) bad.innerHTML = reviewBadSvg();
  }

  /* ── Small schematic icons for the seven concept-explorer tabs ────────── */
  const CONCEPT_ICONS = {
    microstrip: `<svg viewBox="0 0 220 120" xmlns="${SVG_NS}"><rect x="10" y="70" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="40" width="200" height="30" fill="#1e293b" fill-opacity="0.5"/><rect x="90" y="32" width="40" height="8" fill="#60a5fa"/><path d="M95,32 C80,15 60,20 60,40" stroke="#60a5fa" stroke-width="1.5" fill="none"/><path d="M125,32 C140,15 160,20 160,40" stroke="#60a5fa" stroke-width="1.5" fill="none"/></svg>`,
    'embedded-microstrip': `<svg viewBox="0 0 220 120" xmlns="${SVG_NS}"><rect x="10" y="80" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="20" width="200" height="60" fill="#1e293b" fill-opacity="0.65"/><rect x="90" y="46" width="40" height="8" fill="#60a5fa"/><path d="M95,46 C80,32 70,30 70,20" stroke="#60a5fa" stroke-width="1.5" fill="none"/><path d="M125,46 C140,32 150,30 150,20" stroke="#60a5fa" stroke-width="1.5" fill="none"/></svg>`,
    stripline: `<svg viewBox="0 0 220 140" xmlns="${SVG_NS}"><rect x="10" y="105" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="15" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="25" width="200" height="80" fill="#1e293b" fill-opacity="0.55"/><rect x="90" y="61" width="40" height="8" fill="#60a5fa"/><path d="M95,61 C80,50 70,45 70,25" stroke="#60a5fa" stroke-width="1.5" fill="none"/><path d="M95,69 C80,80 70,85 70,105" stroke="#22d3ee" stroke-width="1.5" fill="none"/></svg>`,
    'asymmetric-stripline': `<svg viewBox="0 0 220 140" xmlns="${SVG_NS}"><rect x="10" y="105" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="15" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="25" width="200" height="80" fill="#1e293b" fill-opacity="0.55"/><rect x="90" y="40" width="40" height="8" fill="#fbbf24"/><path d="M95,40 C80,32 70,28 70,25" stroke="#fbbf24" stroke-width="1.5" fill="none"/><path d="M95,48 C80,65 70,85 70,105" stroke="#22d3ee" stroke-width="1.5" fill="none"/></svg>`,
    'diff-microstrip': `<svg viewBox="0 0 220 120" xmlns="${SVG_NS}"><rect x="10" y="70" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="40" width="200" height="30" fill="#1e293b" fill-opacity="0.5"/><rect x="75" y="32" width="30" height="8" fill="#60a5fa"/><rect x="115" y="32" width="30" height="8" fill="#f472b6"/><path d="M105,32 C110,20 115,20 115,32" stroke="#a78bfa" stroke-width="2" fill="none"/></svg>`,
    'diff-stripline': `<svg viewBox="0 0 220 140" xmlns="${SVG_NS}"><rect x="10" y="105" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="15" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="25" width="200" height="80" fill="#1e293b" fill-opacity="0.55"/><rect x="75" y="61" width="30" height="8" fill="#60a5fa"/><rect x="115" y="61" width="30" height="8" fill="#f472b6"/><path d="M105,61 C110,52 115,52 115,61" stroke="#a78bfa" stroke-width="2" fill="none"/></svg>`,
    cpwg: `<svg viewBox="0 0 220 120" xmlns="${SVG_NS}"><rect x="10" y="80" width="200" height="10" fill="#94a3b8" fill-opacity="0.5"/><rect x="10" y="50" width="200" height="30" fill="#1e293b" fill-opacity="0.5"/><rect x="20" y="42" width="40" height="8" fill="#94a3b8"/><rect x="90" y="42" width="40" height="8" fill="#60a5fa"/><rect x="160" y="42" width="40" height="8" fill="#94a3b8"/><path d="M95,42 C80,30 70,30 65,42" stroke="#60a5fa" stroke-width="1.5" fill="none"/><path d="M125,42 C140,30 150,30 155,42" stroke="#60a5fa" stroke-width="1.5" fill="none"/></svg>`,
  };

  function buildConceptFigures() {
    document.querySelectorAll('[data-svg-slot]').forEach(slot => {
      const key = slot.getAttribute('data-svg-slot');
      if (CONCEPT_ICONS[key]) slot.innerHTML = CONCEPT_ICONS[key];
    });
  }

  /* ── General-purpose proportional cross-section renderer ─────────────────
     Used by both the calculator card (updates on every input change) and
     the live slider simulation. Draws a schematic, roughly-to-scale
     cross-section for the selected geometry so learners can see the
     physical picture change as they type or drag. Not a precision CAD
     drawing — proportions are clamped for readability at extreme ratios. ── */
  function renderCrossSection(containerId, geometry, dims) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const d = dims || {};
    const W = d.W || 0.3,
      H = d.H || 0.2,
      T = d.T || 0.035,
      S = d.S || 0.2,
      G = d.G || 0.2,
      H1 = d.H1 || 0.1,
      H2 = d.H2 || 0.5,
      B = d.B || H1 + H2 || 0.6;

    const viewW = 400,
      viewH = 220;
    const maxSpan = Math.max(W + 2 * S + 2, B || H * 2, H * 2, 2.4);
    const px = Math.min(90, 300 / maxSpan);
    const cx = viewW / 2;

    function planeRect(y, label) {
      return `<rect x="10" y="${y}" width="${viewW - 20}" height="8" fill="#94a3b8" fill-opacity="0.55"><title>${label}</title></rect>`;
    }
    function dielRect(y, h, label) {
      return `<rect x="10" y="${y}" width="${viewW - 20}" height="${h}" fill="#1e293b" fill-opacity="0.5"><title>${label}</title></rect>`;
    }
    function traceRect(x, y, w, label, color) {
      return `<rect x="${x}" y="${y}" width="${w}" height="6" fill="${color || '#fbbf24'}"><title>${label}</title></rect>`;
    }

    let svg = '';
    const wPx = Math.max(6, W * px);
    const hPx = Math.max(20, H * px);

    if (geometry === 'microstrip' || geometry === 'embedded-microstrip') {
      const groundY = 40 + hPx;
      svg = `<svg viewBox="0 0 ${viewW} ${groundY + 40}" xmlns="${SVG_NS}" role="img" aria-label="Microstrip cross-section, proportional to current inputs">
        ${dielRect(40, hPx, `Dielectric H = ${H.toFixed(2)} mm`)}
        ${planeRect(groundY, 'Reference plane')}
        ${traceRect(cx - wPx / 2, 34, wPx, `Trace W = ${W.toFixed(2)} mm, T = ${T.toFixed(3)} mm`)}
        ${geometry === 'embedded-microstrip' ? `<rect x="10" y="14" width="${viewW - 20}" height="20" fill="#1e293b" fill-opacity="0.3"><title>Cover dielectric H1 = ${H1.toFixed(2)} mm</title></rect>` : ''}
        <text x="16" y="${groundY + 34}" font-size="10" fill="currentColor">W=${W.toFixed(2)}mm  H=${H.toFixed(2)}mm  εr=${(d.er || 4.3).toFixed(2)}</text>
      </svg>`;
    } else if (geometry === 'stripline') {
      const half = hPx / 2;
      svg = `<svg viewBox="0 0 ${viewW} ${hPx + 60}" xmlns="${SVG_NS}" role="img" aria-label="Symmetric stripline cross-section, proportional to current inputs">
        ${planeRect(20, 'Top reference plane')}
        ${dielRect(28, hPx, `Dielectric, total spacing B = ${B.toFixed(2)} mm`)}
        ${planeRect(28 + hPx, 'Bottom reference plane')}
        ${traceRect(cx - wPx / 2, 28 + half - 3, wPx, `Trace W = ${W.toFixed(2)} mm, centered`, '#60a5fa')}
        <text x="16" y="${hPx + 56}" font-size="10" fill="currentColor">W=${W.toFixed(2)}mm  B=${B.toFixed(2)}mm  εr=${(d.er || 4.3).toFixed(2)}</text>
      </svg>`;
    } else if (geometry === 'asymmetric-stripline') {
      const h1px = Math.max(14, H1 * px);
      const h2px = Math.max(14, H2 * px);
      svg = `<svg viewBox="0 0 ${viewW} ${h1px + h2px + 70}" xmlns="${SVG_NS}" role="img" aria-label="Asymmetric stripline cross-section, proportional to current inputs">
        ${planeRect(20, 'Top reference plane')}
        ${dielRect(28, h1px, `H1 = ${H1.toFixed(2)} mm`)}
        ${traceRect(cx - wPx / 2, 28 + h1px - 3, wPx, `Trace W = ${W.toFixed(2)} mm, offset toward the top plane`, '#fbbf24')}
        ${dielRect(28 + h1px, h2px, `H2 = ${H2.toFixed(2)} mm`)}
        ${planeRect(28 + h1px + h2px, 'Bottom reference plane')}
        <text x="16" y="${h1px + h2px + 66}" font-size="10" fill="currentColor">H1=${H1.toFixed(2)}mm  H2=${H2.toFixed(2)}mm  W=${W.toFixed(2)}mm</text>
      </svg>`;
    } else if (geometry === 'diff-microstrip') {
      const groundY = 40 + hPx;
      const sPx = Math.max(6, S * px);
      const x1 = cx - sPx / 2 - wPx;
      const x2 = cx + sPx / 2;
      svg = `<svg viewBox="0 0 ${viewW} ${groundY + 40}" xmlns="${SVG_NS}" role="img" aria-label="Differential microstrip cross-section, proportional to current inputs">
        ${dielRect(40, hPx, `Dielectric H = ${H.toFixed(2)} mm`)}
        ${planeRect(groundY, 'Reference plane')}
        ${traceRect(x1, 34, wPx, 'D+ trace', '#60a5fa')}
        ${traceRect(x2, 34, wPx, 'D− trace', '#f472b6')}
        <path class="tlc-field-line" d="M${x1 + wPx},37 C${cx},${25} ${x2},37 ${x2},37" stroke="#a78bfa" stroke-width="2" fill="none"><title>Differential coupling field</title></path>
        <text x="16" y="${groundY + 34}" font-size="10" fill="currentColor">W=${W.toFixed(2)}mm  S=${S.toFixed(2)}mm  H=${H.toFixed(2)}mm</text>
      </svg>`;
    } else if (geometry === 'diff-stripline') {
      const half = hPx / 2;
      const sPx = Math.max(6, S * px);
      const x1 = cx - sPx / 2 - wPx;
      const x2 = cx + sPx / 2;
      svg = `<svg viewBox="0 0 ${viewW} ${hPx + 60}" xmlns="${SVG_NS}" role="img" aria-label="Differential stripline cross-section, proportional to current inputs">
        ${planeRect(20, 'Top reference plane')}
        ${dielRect(28, hPx, `B = ${B.toFixed(2)} mm`)}
        ${planeRect(28 + hPx, 'Bottom reference plane')}
        ${traceRect(x1, 28 + half - 3, wPx, 'D+ trace', '#60a5fa')}
        ${traceRect(x2, 28 + half - 3, wPx, 'D− trace', '#f472b6')}
        <path class="tlc-field-line" d="M${x1 + wPx},${28 + half} C${cx},${28 + half - 12} ${x2},${28 + half} ${x2},${28 + half}" stroke="#a78bfa" stroke-width="2" fill="none"/>
        <text x="16" y="${hPx + 56}" font-size="10" fill="currentColor">W=${W.toFixed(2)}mm  S=${S.toFixed(2)}mm  B=${B.toFixed(2)}mm</text>
      </svg>`;
    } else if (geometry === 'cpwg') {
      const groundY = 40 + hPx;
      const gPx = Math.max(8, G * px);
      svg = `<svg viewBox="0 0 ${viewW} ${groundY + 40}" xmlns="${SVG_NS}" role="img" aria-label="Grounded coplanar waveguide cross-section, proportional to current inputs">
        ${dielRect(40, hPx, `Dielectric H = ${H.toFixed(2)} mm`)}
        ${planeRect(groundY, 'Bottom reference plane')}
        ${traceRect(cx - wPx / 2 - gPx - 40, 34, 40, 'Coplanar ground pour', '#94a3b8')}
        ${traceRect(cx - wPx / 2, 34, wPx, `Signal trace W = ${W.toFixed(2)} mm`, '#60a5fa')}
        ${traceRect(cx + wPx / 2 + gPx, 34, 40, 'Coplanar ground pour', '#94a3b8')}
        <text x="16" y="${groundY + 34}" font-size="10" fill="currentColor">W=${W.toFixed(2)}mm  G=${G.toFixed(2)}mm  H=${H.toFixed(2)}mm</text>
      </svg>`;
    } else {
      svg = `<svg viewBox="0 0 ${viewW} 120" xmlns="${SVG_NS}"></svg>`;
    }

    el.innerHTML = svg;
  }

  /* ── Public init ──────────────────────────────────────────────────────────── */
  function init() {
    initRevealOnScroll();
    buildConceptFigures();
    const stackupAnim = buildStackupAnimation('tlc-svg-stackup');
    const diffPairAnim = buildDiffPairAnimation('tlc-svg-diffpair');
    buildReviewDiagrams('tlc-svg-review-good', 'tlc-svg-review-bad');

    document.querySelectorAll('[data-replay]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-replay');
        if (target === 'tlc-svg-stackup' && stackupAnim) stackupAnim.replay();
        if (target === 'tlc-svg-diffpair' && diffPairAnim) diffPairAnim.replay();
      });
    });

    document.querySelectorAll('[data-diffpair-state]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (diffPairAnim) diffPairAnim.setState(btn.getAttribute('data-diffpair-state'));
        document
          .querySelectorAll('[data-diffpair-state]')
          .forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  }

  window.TLCAnimations = {
    init,
    buildStackupAnimation,
    buildDiffPairAnimation,
    buildReviewDiagrams,
    buildConceptFigures,
    renderCrossSection,
  };
})();
