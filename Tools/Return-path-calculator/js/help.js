/**
 * Return Path Calculator — Help System & Guided Tour
 */
(function () {
  'use strict';

  var $ = function (id) {
    return document.getElementById(id);
  };

  /* ── Help topics ─────────────────────────────────────────────────────── */
  var topics = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      keywords: 'quick start beginner workflow first run overview',
      html: `<h2>Getting Started</h2>
<p>Complete a return path analysis in about 2–3 minutes:</p>
<ol>
  <li>Set your signal type and rise time in the <strong>Signal</strong> panel. Rise time drives bandwidth, which determines how strictly return currents hug the reference plane.</li>
  <li>Fill in your trace geometry — width, length, and height above the reference plane. These control loop inductance directly.</li>
  <li>Select your reference plane type and any layer transitions or discontinuities (splits, vias, connectors).</li>
  <li>Add stitching via count and spacing if you have a layer transition.</li>
  <li>Click <strong>Calculate Return Path</strong> to see all results.</li>
  <li>Review the six KPI metrics, PCB cross-section, impedance chart, EMI risk score, and recommendations.</li>
</ol>
<div class="help-callout"><strong>Tip:</strong> Click <strong>Load example</strong> to pre-fill a typical 100 MHz clock scenario with a 4-mil microstrip above a solid ground plane — a good baseline to explore from.</div>`,
    },
    {
      id: 'signal',
      title: 'Signal Parameters',
      keywords:
        'signal type rise time bandwidth frequency clock differential single ended stripline microstrip',
      html: `<h2>Signal Parameters</h2>
<table><thead><tr><th>Parameter</th><th>Description</th><th>Typical values</th></tr></thead>
<tbody>
<tr><td>Signal type</td><td>Sets the context for recommendations. Clock signals are the most sensitive to return path quality.</td><td>Clock, Single-Ended, Differential, Power</td></tr>
<tr><td>Layer type</td><td>Microstrip sits on the surface above one reference plane. Stripline is buried between two planes. CPW adds coplanar ground guards.</td><td>Microstrip (most common), Stripline (sensitive signals)</td></tr>
<tr><td>Rise time</td><td>The 10–90% edge rate of the signal. This is the most important input — it determines bandwidth, skin depth, and how tightly return current concentrates.</td><td>100 ps – 10 ns</td></tr>
<tr><td>Switching frequency</td><td>Fundamental frequency of the signal. Used as a reference for EMI risk scoring.</td><td>1 MHz – 10 GHz</td></tr>
</tbody></table>
<div class="help-callout warning"><strong>Rise time vs clock frequency:</strong> Always use rise time, not clock frequency, to characterise signal integrity. A 100 MHz clock with a 500 ps rise time has 700 MHz bandwidth and behaves like a high-speed signal at 7× the clock rate.</div>`,
    },
    {
      id: 'geometry',
      title: 'Trace Geometry',
      keywords:
        'trace width length height copper thickness dielectric epsilon layer count microstrip loop',
      html: `<h2>Trace Geometry</h2>
<table><thead><tr><th>Parameter</th><th>Effect on return path</th></tr></thead>
<tbody>
<tr><td>Trace width</td><td>Wider traces have lower resistance and spread the return current density, reducing peak current. The 3H return path width rule (95% of current within ±3× height) is independent of trace width.</td></tr>
<tr><td>Trace length</td><td>Longer traces increase loop inductance linearly. Shorten high-speed traces wherever possible.</td></tr>
<tr><td>Height above plane</td><td>The single most important geometric parameter. Loop area = length × height. Halving height halves inductance and loop area, reducing radiated EMI by ~6 dB.</td></tr>
<tr><td>Copper thickness</td><td>Thicker copper lowers DC resistance. Relevant for voltage drop but does not significantly affect return current distribution at high frequency.</td></tr>
<tr><td>Dielectric constant εr</td><td>Affects transmission line impedance and propagation velocity, but not directly used in return path inductance calculations.</td></tr>
<tr><td>Layer count</td><td>Used to estimate via height for layer transition inductance calculations.</td></tr>
</tbody></table>
<h3>The 3H rule</h3>
<p>At high frequencies, 95% of the return current flows within a strip ±3H wide centred directly beneath the signal trace, where H is the height above the reference plane. Ensure no discontinuities exist in this zone:</p>
<p style="font-family:monospace;padding:8px;background:var(--bg-alt);border-radius:6px;">
  Return path width (95%) = 6 × H
</p>
<div class="help-callout">For a trace 4 mil above a plane, keep the reference plane clear of splits, vias, and filled areas within ±12 mil of the trace centreline.</div>`,
    },
    {
      id: 'plane',
      title: 'Reference Plane',
      keywords:
        'reference plane solid split power floating gap slot transition via connector cable stitching',
      html: `<h2>Reference Plane</h2>
<h3>Plane type</h3>
<table><thead><tr><th>Type</th><th>Return path quality</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Solid Ground</td><td>Excellent</td><td>Best choice for all high-speed signals. Return current flows directly beneath trace with minimum inductance.</td></tr>
<tr><td>Power Plane</td><td>Good (with decoupling)</td><td>Can serve as an AC return path if well-decoupled. Place 100 nF ceramic caps within 5 mm of any trace via.</td></tr>
<tr><td>Split Ground</td><td>Poor</td><td>Forces return current to detour around the gap. Increases loop area 3–5×. Major EMC risk.</td></tr>
<tr><td>No Plane / Floating</td><td>Very poor</td><td>No defined return path. Return current must find its own route — typically through long, inductance-dominated paths. Avoid entirely for signals above 1 MHz.</td></tr>
</tbody></table>
<h3>Plane transitions</h3>
<table><thead><tr><th>Transition</th><th>Risk</th><th>Mitigation</th></tr></thead>
<tbody>
<tr><td>None</td><td>Low</td><td>No action needed</td></tr>
<tr><td>Via layer transition</td><td>Medium</td><td>Add stitching vias within 2 mm of signal via on reference plane net</td></tr>
<tr><td>Connector</td><td>Medium–High</td><td>Ensure shield/ground bonded at both ends; use filtered connectors above 100 MHz</td></tr>
<tr><td>Cable</td><td>High</td><td>Bond cable shield at both ends; use common-mode chokes for long cables</td></tr>
<tr><td>Slot crossing</td><td>Critical</td><td>Re-route to avoid slot; if unavoidable, bridge with bypass capacitor under the trace</td></tr>
</tbody></table>`,
    },
    {
      id: 'results',
      title: 'KPI Metrics',
      keywords:
        'results metrics bandwidth loop inductance impedance efficiency via inductance EMI KPI',
      html: `<h2>KPI Metrics</h2>
<table><thead><tr><th>Metric</th><th>Formula</th><th>Good / bad</th></tr></thead>
<tbody>
<tr><td>Bandwidth</td><td>BW = 0.35 / t<sub>r</sub> (Bogatin rule)</td><td>Higher bandwidth = stricter return path requirements. No good/bad — it is what it is from your rise time.</td></tr>
<tr><td>Loop Inductance</td><td>L ≈ µ₀ × Area / width (wide trace) or µ₀/π × length × ln(2H/w) (narrow trace)</td><td>&lt; 5 nH good, 5–20 nH warn, &gt; 20 nH bad. Lower inductance = less ground bounce.</td></tr>
<tr><td>Loop Area</td><td>A = length × height (effective)</td><td>&lt; 50 mm² good, 50–200 mm² warn, &gt; 200 mm² bad. EMI ∝ Area × I × f².</td></tr>
<tr><td>Return Impedance</td><td>Z(f) = √(R² + (2πfL)²) at BW</td><td>&lt; 1 Ω good, 1–10 Ω warn, &gt; 10 Ω bad. High impedance causes voltage drop on the return path.</td></tr>
<tr><td>Path Efficiency</td><td>100% ÷ (plane modifier × transition modifier)</td><td>&gt; 80% good, 50–80% warn, &lt; 50% bad. Reflects how much plane type and transitions degrade the ideal path.</td></tr>
<tr><td>Via Inductance</td><td>L<sub>via</sub> ≈ 5.08 × h<sub>mm</sub> × (ln(4h/d) + 1) pH</td><td>&lt; 100 pH good, 100–500 pH warn, &gt; 500 pH bad. Excessive via inductance causes resonances and SI problems.</td></tr>
</tbody></table>
<div class="help-callout">Colour coding: <strong style="color:#34d399">Green</strong> = within spec, <strong style="color:#fbbf24">Yellow</strong> = marginal, <strong style="color:#f87171">Red</strong> = action required.</div>`,
    },
    {
      id: 'charts',
      title: 'Charts & Visualisation',
      keywords:
        'chart PCB canvas visualisation impedance frequency inductance height EMI gauge distribution',
      html: `<h2>Charts & Visualisation</h2>
<table><thead><tr><th>Chart</th><th>What it shows</th><th>How to use it</th></tr></thead>
<tbody>
<tr><td>PCB Cross-Section</td><td>Signal trace and reference plane with animated return current arrows. Arrow colour shows path quality (green / yellow / red). Arrows curve if a slot/gap is present.</td><td>Visually confirm your plane type produces a well-confined return path. Watch for red arrows indicating a problem.</td></tr>
<tr><td>Impedance vs Frequency</td><td>Return path impedance rising with frequency, compared against an ideal solid-GND reference (dashed green line). Log-log scale.</td><td>At your bandwidth frequency, your design should be close to the solid-GND reference. Large divergence means poor return path quality.</td></tr>
<tr><td>Loop Inductance vs Height</td><td>How loop inductance changes as the trace height above the plane varies from 1 to 30 mil. Your operating point is on this curve.</td><td>See how much you'd gain by moving the plane closer. Each 2× reduction in height ≈ 2× reduction in inductance.</td></tr>
<tr><td>EMI Risk Gauge</td><td>Doughnut arc showing the composite EMI risk score 0–100, colour-coded Low / Medium / High / Critical.</td><td>Use as a quick pass/fail check. Score &gt; 70 means address the recommendations before PCB layout.</td></tr>
<tr><td>Return Current Distribution</td><td>Gaussian bell curve showing how return current density is distributed laterally across the reference plane.</td><td>The spread is ±3H (height above plane). Use to check whether any discontinuity falls within the active return current zone.</td></tr>
</tbody></table>`,
    },
    {
      id: 'compare',
      title: 'Scenario Comparison',
      keywords: 'scenario comparison A B save baseline improvement inductance',
      html: `<h2>Scenario Comparison</h2>
<p>The comparison panel lets you measure the improvement from a design change:</p>
<ol>
  <li>Run a calculation for your <strong>baseline design</strong> (e.g., split ground plane).</li>
  <li>Click the <strong>Scenario B</strong> tab to save it as the reference.</li>
  <li>Change your inputs (e.g., switch to solid ground, add stitching vias).</li>
  <li>Click <strong>Calculate</strong> again. Scenario A updates to your new design.</li>
  <li>The <strong>improvement badge</strong> shows the % change in loop inductance.</li>
</ol>
<div class="help-callout">Use this workflow to justify design changes in a design review — concrete numbers (e.g., "63% inductance reduction by removing the slot crossing") are more persuasive than rules of thumb alone.</div>`,
    },
    {
      id: 'export',
      title: 'Export & Reports',
      keywords: 'export PNG CSV print save report keyboard shortcut',
      html: `<h2>Export & Reports</h2>
<table><thead><tr><th>Button</th><th>Action</th></tr></thead>
<tbody>
<tr><td>Save PNG</td><td>Downloads the PCB cross-section canvas as a PNG image. Useful for design review presentations.</td></tr>
<tr><td>Export CSV</td><td>Downloads all calculated parameters plus results as a comma-separated file (Excel-compatible).</td></tr>
<tr><td>Print</td><td>Opens the browser print dialog with print-optimised layout. Charts and recommendations are included.</td></tr>
</tbody></table>
<h3>Keyboard shortcuts</h3>
<table><tbody>
<tr><th>Ctrl + Enter</th><td>Run calculation</td></tr>
<tr><th>Ctrl + P</th><td>Print report</td></tr>
<tr><th>Esc</th><td>Close Help or end tour</td></tr>
<tr><th>F1</th><td>Open Help</td></tr>
</tbody></table>`,
    },
    {
      id: 'physics',
      title: 'Return Path Physics',
      keywords:
        'physics theory inductance loop area skin depth image current frequency path least impedance',
      html: `<h2>Return Path Physics</h2>
<h3>Why high-frequency current flows beneath the trace</h3>
<p>Total impedance in any path is Z = R + jωL. At low frequencies, ωL is negligible — current follows the lowest R path (shortest physical route). As frequency increases, ωL dominates and current redistributes to minimise total loop inductance L, which means flowing directly beneath the signal trace where signal and return magnetic fields cancel.</p>
<h3>Key formulae</h3>
<table><thead><tr><th>Quantity</th><th>Formula</th><th>Units</th></tr></thead>
<tbody>
<tr><td>Bandwidth</td><td>BW = 0.35 / t<sub>r</sub></td><td>Hz (t<sub>r</sub> in seconds)</td></tr>
<tr><td>Loop inductance (wide trace, w ≥ h)</td><td>L = µ₀ × A / w</td><td>H</td></tr>
<tr><td>Loop inductance (narrow trace, w &lt; h)</td><td>L = (µ₀/π) × len × ln(2h/w + 0.5)</td><td>H</td></tr>
<tr><td>Return path impedance</td><td>Z(f) = √(R<sub>DC</sub>² + (2πfL)²)</td><td>Ω</td></tr>
<tr><td>Via inductance</td><td>L<sub>v</sub> ≈ 5.08 × h<sub>mm</sub> × (ln(4h/d) + 1)</td><td>pH</td></tr>
<tr><td>Skin depth</td><td>δ = √(ρ / (π × f × µ₀))</td><td>m</td></tr>
<tr><td>Return current width (95%)</td><td>w<sub>ret</sub> = 6H</td><td>same as H</td></tr>
</tbody></table>
<h3>Radiated EMI model</h3>
<p>Radiated field strength from a small current loop:</p>
<p style="font-family:monospace;padding:8px;background:var(--bg-alt);border-radius:6px;">
  E ∝ A × I × f²
</p>
<p>Where A = loop area (m²), I = current (A), f = frequency (Hz). Reducing loop area by 2× cuts radiated EMI by ~6 dB. Reducing frequency by 2× cuts it by ~12 dB.</p>`,
    },
    {
      id: 'design-rules',
      title: 'PCB Design Rules',
      keywords:
        'design rules PCB layout stitching via decoupling capacitor split plane slot connector ground',
      html: `<h2>PCB Return Path Design Rules</h2>
<ol>
  <li><strong>Never route across a split plane.</strong> A split forces return current to detour, increasing loop area and EMI by 10–40 dB. Reroute the trace or bridge the split with a capacitor directly beneath the trace.</li>
  <li><strong>Maintain a continuous reference plane.</strong> Every high-speed signal needs an unbroken GND or PWR plane within 4–8 mil directly above or below it.</li>
  <li><strong>Add stitching vias at every layer transition.</strong> Place at least one stitching via within 2 mm of the signal via, on the reference plane net. Use two vias for frequencies above 500 MHz.</li>
  <li><strong>Minimise loop area.</strong> Keep the trace short. Minimise height above plane. Use stripline for very sensitive signals (plane above and below).</li>
  <li><strong>Avoid floating copper.</strong> All copper pours must be connected to GND with vias every 1/20 wavelength. Floating copper becomes an antenna.</li>
  <li><strong>Decouple power-plane references.</strong> When a signal references a power plane, place a 100 nF ceramic capacitor between PWR and GND planes within 5 mm of the trace via.</li>
  <li><strong>Minimise reference plane transitions.</strong> Each PWR→GND or GND→PWR transition needs a stitching capacitor between the planes at that location.</li>
  <li><strong>Observe the 3H clearance rule.</strong> Keep the reference plane free of discontinuities within ±3H of the trace centreline.</li>
</ol>`,
    },
    {
      id: 'glossary',
      title: 'Glossary',
      keywords:
        'glossary definitions loop inductance impedance EMI bandwidth skin depth via image current common mode',
      html: `<h2>Glossary</h2>
<dl>
<dt>Return Current</dt><dd>The current that completes the circuit for every signal. At high frequencies it flows directly beneath the signal trace on the nearest reference plane, following the path of minimum inductance.</dd>
<dt>Loop Inductance (L)</dt><dd>Inductance of the closed loop formed by signal trace and its return path. Proportional to loop area. L ≈ µ₀ × area / width for wide traces. Lower is better.</dd>
<dt>Loop Area (A)</dt><dd>Physical area enclosed by the signal and return current paths. A = length × height-above-plane for a microstrip. Radiated EMI is proportional to A × I × f².</dd>
<dt>Bandwidth (BW)</dt><dd>Highest significant frequency content of a signal. BW ≈ 0.35 / t<sub>r</sub> for a Gaussian edge. Determines how tightly return current concentrates beneath the trace.</dd>
<dt>Skin Depth (δ)</dt><dd>Depth to which AC current penetrates a conductor. δ = √(ρ/πfµ). At 100 MHz in copper, δ ≈ 6.6 µm. Current is confined to a thin skin at high frequency.</dd>
<dt>Plane Discontinuity</dt><dd>Any break in the reference plane (slot, split, gap, anti-pad, missing pour). Forces return current to detour, increasing loop area and EMI.</dd>
<dt>Stitching Via</dt><dd>A via connected to the reference plane net, placed adjacent to a signal via at a layer transition. Provides a low-inductance return path for the plane current at the transition point.</dd>
<dt>Via Inductance</dt><dd>Parasitic inductance of a PCB via. Typically 0.5–1 nH for a standard 10 mil drill, 8-layer board. Multiple stitching vias in parallel reduce this inductance proportionally.</dd>
<dt>Ground Bounce</dt><dd>Transient voltage on the ground net caused by dI/dt through the return path inductance. V = L × dI/dt. Can corrupt logic levels and increase jitter.</dd>
<dt>Common Mode</dt><dd>Current flowing in the same direction on both conductors of a pair. Common mode is the primary cause of radiated EMI and arises from imperfect return paths, plane discontinuities, and differential-to-common-mode conversion.</dd>
<dt>Image Current</dt><dd>The "mirror" of the signal current on the reference plane. Equal in magnitude, opposite in direction. Cancels the magnetic field of the signal current when the plane is close, minimising loop inductance and EMI.</dd>
<dt>EMI (Electromagnetic Interference)</dt><dd>Unwanted electromagnetic energy radiated by or conducted through PCB structures. Controlled by loop area, current amplitude, and frequency. Causes regulatory compliance failure (FCC/CE) and can corrupt nearby circuits.</dd>
</dl>`,
    },
    {
      id: 'faq',
      title: 'FAQ',
      keywords:
        'faq why high inductance slot crossing split plane power plane decouple via stitching',
      html: `<h2>Frequently Asked Questions</h2>
<h3>Why does a 100 MHz clock need a return path optimised for GHz?</h3>
<p>A 100 MHz clock with a 1 ns rise time has a bandwidth of 350 MHz — the 3rd and 5th harmonics (300 MHz and 500 MHz) carry significant energy. The 7th harmonic (700 MHz) still needs to be contained. Design the return path for the bandwidth, not the clock frequency.</p>
<h3>My board has a power plane between the signal and ground plane — is that OK?</h3>
<p>It depends. At DC and low frequencies, power planes are not ground and provide no return path. At high frequencies, the power plane can serve as an AC reference if it is well-decoupled to ground directly beneath the signal. Place a 100 nF (or lower) ceramic capacitor between the PWR and GND planes within 5 mm of any signal via that uses the power plane as a reference.</p>
<h3>How many stitching vias do I need at a layer transition?</h3>
<p>Minimum one, within 2 mm of the signal via. For frequencies above 500 MHz, use two — one on each side. For GHz-range signals, place stitching vias at intervals of ≤ λ/20 (wavelength in PCB material) along the trace. In practice, one pair of vias per 5 mm is a common rule of thumb up to 5 GHz.</p>
<h3>The tool shows High EMI risk but my scope shows a clean signal — why?</h3>
<p>A clean scope measurement confirms the signal waveform integrity but does not indicate radiated EMI performance. EMI is determined by loop area × current × frequency² — not by the signal shape. A clean signal on a board with large loops and discontinuities can still fail FCC radiated emissions testing. Use the recommendations and verify with a pre-compliance scan.</p>
<h3>What is the difference between loop inductance and via inductance?</h3>
<p>Loop inductance is the total inductance of the complete signal + return current loop, dominated by the geometry of the trace and its reference plane. Via inductance is the parasitic inductance of a single through-hole via, typically 0.5–2 nH. At layer transitions, via inductance adds in series with the loop inductance and can significantly increase the return path impedance at high frequencies.</p>
<h3>Can I use a differential pair to avoid return path issues?</h3>
<p>Differential pairs greatly reduce common-mode EMI when perfectly balanced — the two current flows cancel their magnetic fields. However, they still require a solid reference plane: (1) to maintain the differential impedance, (2) because any imbalance converts to common mode, which radiates via the return path, and (3) because even differential signals need a return for the common-mode component. Good return path practice is still essential with differential pairs.</p>`,
    },
  ];

  /* ── Help panel controller ───────────────────────────────────────────── */
  var dialog = $('rpc-help-dialog');
  var nav = $('rpc-help-nav');
  var content = $('rpc-help-content');
  var search = $('rpc-help-search');
  var active = 'getting-started';
  var lastFocus = null;

  function renderNav(filter) {
    var q = (filter || '').trim().toLowerCase();
    var matches = topics.filter(function (t) {
      return (t.title + ' ' + t.keywords + ' ' + t.html.replace(/<[^>]+>/g, ' '))
        .toLowerCase()
        .includes(q);
    });
    nav.innerHTML = matches.length
      ? matches
          .map(function (t) {
            return (
              '<button data-help-id="' +
              t.id +
              '" class="' +
              (t.id === active ? 'active' : '') +
              '">' +
              t.title +
              '</button>'
            );
          })
          .join('')
      : '<div class="help-no-results">No matching topics.</div>';
    $('rpc-help-search-status').textContent = q
      ? matches.length + ' topic' + (matches.length === 1 ? '' : 's') + ' found'
      : '';
    if (
      q &&
      matches.length &&
      !matches.some(function (t) {
        return t.id === active;
      })
    )
      showTopic(matches[0].id, false);
  }

  function showTopic(id, focus) {
    var t =
      topics.find(function (x) {
        return x.id === id;
      }) || topics[0];
    active = t.id;
    content.innerHTML = t.html;
    renderNav(search.value);
    if (focus) content.focus();
  }

  function openHelp(topic) {
    lastFocus = document.activeElement;
    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
    search.value = '';
    showTopic(topic || active, false);
    setTimeout(function () {
      search.focus();
    }, 0);
  }

  function closeHelp() {
    dialog.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-help-open]')) openHelp();
    var tip = e.target.closest('[data-help-topic]');
    if (tip) openHelp(tip.dataset.helpTopic);
    if (e.target.closest('[data-help-close]')) closeHelp();
    var topicBtn = e.target.closest('[data-help-id]');
    if (topicBtn) showTopic(topicBtn.dataset.helpId);
    if (e.target === dialog) closeHelp();
  });

  search.addEventListener('input', function () {
    renderNav(search.value);
  });

  /* ── Guided tour ─────────────────────────────────────────────────────── */
  var tour = [
    {
      selector: '.rpc-hero',
      title: 'Welcome to the Return Path Calculator',
      text: 'This guided tour covers the complete return path analysis workflow. Restart at any time from the Help panel.',
    },
    {
      selector: '[aria-label="Calculator inputs"] .rpc-card:nth-child(1)',
      title: '01 — Signal Parameters',
      text: 'Start with signal type and rise time. Rise time drives bandwidth — the key number that determines how strictly return currents hug the reference plane.',
    },
    {
      selector: '[aria-label="Calculator inputs"] .rpc-card:nth-child(2)',
      title: '02 — Trace Geometry',
      text: 'Height above plane is the most important geometric input. Halving height halves loop inductance and cuts radiated EMI by ~6 dB.',
    },
    {
      selector: '[aria-label="Calculator inputs"] .rpc-card:nth-child(3)',
      title: '03 — Reference Plane',
      text: 'Select plane type and any discontinuities. A split plane or slot crossing dramatically increases loop area and EMI risk.',
    },
    {
      selector: '.rpc-calc-btn',
      title: 'Calculate',
      text: 'Click to run all calculations: bandwidth, loop inductance, loop area, return path impedance, via inductance, and EMI risk score.',
    },
    {
      selector: '.rpc-kpi-row',
      title: 'KPI Metrics',
      text: 'Six key metrics colour-coded green / yellow / red. Focus on loop inductance and EMI risk score as your primary design targets.',
    },
    {
      selector: '.rpc-viz-card',
      title: 'PCB Cross-Section',
      text: 'Return current arrows show path quality in real time. Green = good, yellow = moderate, red = poor. Arrows curve around gaps and slots.',
    },
    {
      selector: '.rpc-recs',
      title: 'Recommendations',
      text: 'The recommendations engine gives specific, actionable guidance based on your exact inputs — not generic rules of thumb.',
    },
    {
      selector: '#rpc-compare',
      title: 'Scenario Comparison',
      text: 'Save a baseline as Scenario B, make a design change, recalculate, and see the improvement badge showing exactly how much inductance you removed.',
    },
  ];

  var tourIndex = 0;

  function positionTour(el) {
    var pop = $('rpc-tour-popover');
    var r = el.getBoundingClientRect();
    var w = Math.min(380, window.innerWidth - 32);
    var left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left));
    var below = r.bottom + 16;
    var top = below + 250 < window.innerHeight ? below : Math.max(16, r.top - 260);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.style.width = w + 'px';
  }

  function showTourStep() {
    var prev = document.querySelector('.tour-highlight');
    if (prev) prev.classList.remove('tour-highlight');
    var step = tour[tourIndex];
    var el = document.querySelector(step.selector);
    if (!el) {
      finishTour();
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('tour-highlight');
    $('rpc-tour-progress').textContent = 'Step ' + (tourIndex + 1) + ' of ' + tour.length;
    $('rpc-tour-title').textContent = step.title;
    $('rpc-tour-text').textContent = step.text;
    $('rpc-tour-prev').disabled = tourIndex === 0;
    $('rpc-tour-next').textContent = tourIndex === tour.length - 1 ? 'Finish' : 'Next';
    setTimeout(function () {
      positionTour(el);
    }, 250);
  }

  function startTour() {
    closeHelp();
    tourIndex = 0;
    $('rpc-tour-backdrop').hidden = false;
    $('rpc-tour-popover').hidden = false;
    document.body.style.overflow = '';
    showTourStep();
  }

  function finishTour() {
    var hi = document.querySelector('.tour-highlight');
    if (hi) hi.classList.remove('tour-highlight');
    $('rpc-tour-backdrop').hidden = true;
    $('rpc-tour-popover').hidden = true;
    localStorage.setItem('rpc_help_tour_complete', '1');
  }

  $('rpc-help-start-tour').addEventListener('click', startTour);
  $('rpc-tour-next').addEventListener('click', function () {
    if (tourIndex < tour.length - 1) {
      tourIndex++;
      showTourStep();
    } else finishTour();
  });
  $('rpc-tour-prev').addEventListener('click', function () {
    if (tourIndex > 0) {
      tourIndex--;
      showTourStep();
    }
  });
  $('rpc-tour-skip').addEventListener('click', finishTour);

  window.addEventListener('resize', function () {
    if (!$('rpc-tour-popover').hidden) {
      var el = document.querySelector(tour[tourIndex].selector);
      if (el) positionTour(el);
    }
  });

  /* ── Keyboard ────────────────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!dialog.hidden) closeHelp();
      else if (!$('rpc-tour-popover').hidden) finishTour();
    }
    if (e.key === 'Tab' && !dialog.hidden) {
      var focusable = Array.from(
        dialog.querySelectorAll('button,a[href],input,[tabindex="0"]')
      ).filter(function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
      if (focusable.length) {
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    if (e.key === 'F1') {
      e.preventDefault();
      openHelp();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('rpcCalcBtn2').click();
    }
  });

  /* ── Init ────────────────────────────────────────────────────────────── */
  renderNav();
  showTopic(active, false);
  if (!localStorage.getItem('rpc_help_tour_complete')) setTimeout(startTour, 1600);
})();
