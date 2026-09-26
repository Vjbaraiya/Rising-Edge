/**
 * Transmission Line Calculator — Help System & Guided Tour
 * Adapted from the ESD Protection Analyzer / Termination Selector help.js
 * architecture, re-scoped to transmission-line-calculator topics and tour
 * targets.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ─────────────────────────────────────────────────────────────────────────
     HELP TOPICS
  ───────────────────────────────────────────────────────────────────────── */
  const topics = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      keywords: 'quick start beginner workflow overview lesson',
      html: `<h2>Getting Started</h2>
<p>The Transmission Line Calculator is a self-paced interactive lesson plus a live Z0/Zdiff calculator. A typical session:</p>
<ol>
  <li>Read the Concept Explorer tabs (Microstrip, Embedded Microstrip, Stripline, Asymmetric Stripline, Differential Microstrip, Differential Stripline, CPWG).</li>
  <li>Watch the two animated SVG diagrams to see how field distribution differs between geometries.</li>
  <li>Pick a geometry in the calculator and enter your trace geometry — it recalculates live, no button press required.</li>
  <li>Drag the live simulation sliders to see the impedance curve and cross-section respond to width, height, and dielectric constant.</li>
  <li>Walk the interactive decision tree for a recommended geometry with rationale.</li>
  <li>Take the quiz to check your understanding.</li>
</ol>
<div class="help-callout"><strong>Tip:</strong> Click <em>Play Lesson</em> in the hero to open the floating narrator widget, which reads the lesson aloud and auto-scrolls through the key sections.</div>`,
    },
    {
      id: 'concepts',
      title: 'Concept Explorer',
      keywords:
        'microstrip embedded stripline asymmetric differential cpwg tabs concepts geometry types',
      html: `<h2>Concept Explorer</h2>
<p>Seven tabs cover the PCB transmission-line geometries used in real designs:</p>
<table><thead><tr><th>Tab</th><th>Use when</th></tr></thead>
<tbody>
<tr><td>Microstrip</td><td>Outer-layer single-ended trace, simplest routing</td></tr>
<tr><td>Embedded Microstrip</td><td>Outer-layer trace fully covered by soldermask/cover dielectric</td></tr>
<tr><td>Stripline</td><td>Inner-layer trace needing maximum EMI shielding</td></tr>
<tr><td>Asymmetric Stripline</td><td>Inner-layer trace where the two plane spacings are unequal</td></tr>
<tr><td>Differential Microstrip</td><td>Outer-layer coupled pair (USB/PCIe/HDMI-class)</td></tr>
<tr><td>Differential Stripline</td><td>Inner-layer coupled pair needing extra shielding</td></tr>
<tr><td>CPWG</td><td>RF/antenna feed or connector breakout on a shallow stack-up</td></tr>
</tbody></table>`,
    },
    {
      id: 'calculator',
      title: 'Z0 Calculator Inputs',
      keywords: 'calculator inputs geometry width thickness height dielectric constant spacing gap',
      html: `<h2>Z0 Calculator Inputs</h2>
<table><thead><tr><th>Input</th><th>Applies to</th><th>Meaning</th></tr></thead>
<tbody>
<tr><td>Geometry</td><td>All</td><td>Selects which of the seven closed-form formulas is used.</td></tr>
<tr><td>Trace width W</td><td>All</td><td>Signal trace width.</td></tr>
<tr><td>Trace thickness T</td><td>All</td><td>Copper thickness (0.035 mm ≈ 1 oz copper).</td></tr>
<tr><td>Dielectric height H</td><td>Microstrip, embedded microstrip, differential microstrip, CPWG</td><td>Height from trace to the single reference plane.</td></tr>
<tr><td>Cover dielectric H1</td><td>Embedded microstrip</td><td>Dielectric thickness above the trace (soldermask/cover layer).</td></tr>
<tr><td>H1 / H2</td><td>Asymmetric stripline</td><td>Unequal spacings from the trace to each of the two planes.</td></tr>
<tr><td>Plane spacing B</td><td>Stripline, differential stripline</td><td>Total dielectric spacing between the two reference planes.</td></tr>
<tr><td>Pair spacing S</td><td>Differential microstrip, differential stripline</td><td>Edge-to-edge spacing between the two traces of a pair.</td></tr>
<tr><td>Gap G</td><td>CPWG</td><td>Gap between the signal trace and the adjacent coplanar ground pour.</td></tr>
<tr><td>Dielectric constant εr</td><td>All</td><td>Bulk relative permittivity of the laminate (e.g. ~4.3 for standard FR-4).</td></tr>
</tbody></table>
<div class="help-callout">Only the fields relevant to the selected geometry are shown — the form updates automatically when you change the Geometry dropdown, and recalculates on every keystroke.</div>`,
    },
    {
      id: 'results',
      title: 'Interpreting Results',
      keywords: 'Z0 Zdiff eeff propagation delay velocity factor tolerance',
      html: `<h2>Interpreting Results</h2>
<ul>
<li><strong>Z0 / Zdiff</strong> — characteristic impedance (single-ended geometries) or differential impedance (differential geometries).</li>
<li><strong>εeff</strong> — effective dielectric constant, the blend of air and bulk dielectric the wave actually experiences. Used for propagation delay, not equal to the bulk εr for microstrip-family geometries.</li>
<li><strong>Delay / mm and / in</strong> — propagation delay per unit length, tpd = √εeff / c.</li>
<li><strong>Velocity factor</strong> — propagation velocity as a percentage of the speed of light, 1/√εeff.</li>
<li><strong>Fab tolerance</strong> — estimated Z0 spread from a ±0.0375 mm (≈±1.5 mil) trace-width etch tolerance, illustrating why fabricated Z0 typically varies by roughly ±10% from the calculated nominal value.</li>
</ul>`,
    },
    {
      id: 'simulation',
      title: 'Live Simulation',
      keywords: 'simulation sliders width height dielectric constant cross section resize',
      html: `<h2>Live Simulation</h2>
<p>Three sliders (trace width, dielectric height, dielectric constant) drive a microstrip Z0 calculation in real time. The chart shows a full width sweep with your current slider position marked, and the cross-section diagram resizes proportionally so you can see the physical picture, not just the number, change.</p>
<div class="help-callout warning">The simulation always uses the microstrip formula for clarity and a fixed 0.035 mm (1 oz) copper thickness — use the full calculator above for the other six geometries.</div>`,
    },
    {
      id: 'charts',
      title: 'Charts',
      keywords: 'chart width sweep height sweep spacing sweep differential plotly zoom pan export',
      html: `<h2>Charts</h2>
<h3>Z0 vs. trace width</h3>
<p>Sweeps microstrip trace width from 0.1&ndash;3.5 mm at a fixed stack-up (H=1.6 mm, εr=4.3), with a 50 Ω reference line.</p>
<h3>Z0 vs. dielectric height</h3>
<p>Sweeps dielectric height at a fixed trace width (W=3.0 mm), showing how moving the reference plane changes Z0.</p>
<h3>Zdiff vs. pair spacing</h3>
<p>Sweeps differential microstrip pair spacing, highlighting the tight-coupling region and marking 90 Ω and 100 Ω reference lines for common differential standards.</p>
<div class="help-callout">All charts support zoom, pan, hover tooltips, and PNG export via the Plotly toolbar, and re-theme automatically when you switch dark/light mode.</div>`,
    },
    {
      id: 'decision-tree',
      title: 'Interactive Decision Tree',
      keywords: 'decision tree questions recommendation restart differential EMI stackup RF',
      html: `<h2>Interactive Decision Tree</h2>
<p>Answer each question by clicking an option. The breadcrumb above the question shows your path. Click <em>Restart</em> at any time to begin again from the first question.</p>
<p>The tree first asks whether the signal is differential, then branches through RF-vs-digital, EMI sensitivity, and stack-up layer budget to arrive at a recommended geometry with a short rationale.</p>`,
    },
    {
      id: 'quiz',
      title: 'Quiz',
      keywords: 'quiz questions score explanations restart',
      html: `<h2>Quiz</h2>
<p>Thirteen multiple-choice questions covering the physics, the formulas, and real-world geometry decisions. Each answer is locked in once selected and immediately shows whether it was correct along with an explanation. Use Previous/Next to navigate, and Restart Quiz on the final score screen to try again.</p>`,
    },
    {
      id: 'narrator',
      title: 'Lesson Narrator',
      keywords: 'narrator play lesson speech synthesis voice speed pause replay',
      html: `<h2>Lesson Narrator</h2>
<p>Click <em>Play Lesson</em> in the hero to open the floating narrator widget. It uses your browser's built-in speech synthesis (SpeechSynthesis API) to read a short script aloud while auto-scrolling to the relevant section.</p>
<ul>
<li><strong>Play / Pause / Stop / Replay</strong> — standard playback controls.</li>
<li><strong>Speed</strong> — 0.75× to 1.5× playback rate.</li>
<li><strong>Voice</strong> — populated from the voices your browser/OS provides.</li>
</ul>
<div class="help-callout warning">If your browser does not support speech synthesis, the narrator widget still shows the script text so the lesson remains usable.</div>`,
    },
    {
      id: 'reports',
      title: 'Reports & Export',
      keywords: 'export notes save load config print share bookmark',
      html: `<h2>Reports &amp; Export</h2>
<table><thead><tr><th>Button</th><th>Action</th></tr></thead>
<tbody>
<tr><td>Export Notes (TXT)</td><td>Downloads all Engineering Notes accordion sections as plain text.</td></tr>
<tr><td>Save config</td><td>Saves the current geometry and dimensions to a JSON file.</td></tr>
<tr><td>Load config</td><td>Restores previously saved calculator inputs.</td></tr>
<tr><td>Print lesson</td><td>Opens the browser print dialog with a print-optimized layout.</td></tr>
<tr><td>Share link</td><td>Uses the OS share sheet if available, otherwise copies the page URL.</td></tr>
<tr><td>Bookmark</td><td>Saves this tool to a local bookmark list (stored in your browser).</td></tr>
</tbody></table>
<h3>Keyboard shortcuts</h3>
<table><tbody>
<tr><th>Ctrl+S</th><td>Save calculator configuration</td></tr>
<tr><th>Ctrl+P</th><td>Print lesson</td></tr>
<tr><th>Esc</th><td>Close Help or end tour</td></tr>
<tr><th>F1</th><td>Open Help</td></tr>
</tbody></table>`,
    },
    {
      id: 'standards',
      title: 'Standards Reference',
      keywords: 'IPC-2141 IPC-6012 controlled impedance fabrication tolerance standards',
      html: `<h2>Standards Reference</h2>
<table><thead><tr><th>Standard</th><th>Scope</th></tr></thead>
<tbody>
<tr><td>IPC-2141 / IPC-2141A</td><td>Controlled-impedance PCB stack-up design formulas — the closed-form basis for this calculator's microstrip and stripline equations.</td></tr>
<tr><td>IPC-6012</td><td>Qualification and performance specification for rigid PCBs, including fabrication tolerance classes that determine achievable Z0 tolerance.</td></tr>
</tbody></table>`,
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      keywords: 'faq why εeff εr soldermask etch tolerance TDR field solver',
      html: `<h2>Frequently Asked Questions</h2>
<h3>Why does the calculator show εeff separately from εr?</h3>
<p>εeff is the effective dielectric constant the wave actually experiences (a blend of air and bulk dielectric for microstrip-family geometries) and is what determines propagation delay — using bulk εr directly for delay on a microstrip overstates the delay.</p>
<h3>How accurate are these closed-form formulas versus a real field solver?</h3>
<p>They are first-order engineering approximations (Hammerstad-Jensen / IPC-2141-style), accurate enough for early stack-up planning and design review, but a 2D/3D field solver (and your fab house's impedance-control service) should be used to finalize any tightly-toleranced design.</p>
<h3>Why is my calculated Z0 different from what my fab house quotes?</h3>
<p>Fab houses typically use a full field solver with your exact stack-up (including etch/trapezoidal trace shape, actual laminate εr at your frequency, and soldermask thickness) — always confirm final trace width against their impedance-control service before release.</p>`,
    },
    {
      id: 'glossary',
      title: 'Glossary',
      keywords: 'definitions Z0 Zdiff eeff propagation delay velocity factor TDR',
      html: `<h2>Glossary</h2>
<dl>
<dt>Z0 (characteristic impedance)</dt><dd>The impedance a traveling wave sees on a single-ended transmission line, set by trace geometry and dielectric.</dd>
<dt>Zdiff (differential impedance)</dt><dd>The impedance a differential-mode wave sees across a coupled pair, roughly 2× the single-ended Z0 reduced by a coupling factor.</dd>
<dt>εeff (effective dielectric constant)</dt><dd>The blended dielectric constant a wave actually experiences when fields are partly in air and partly in bulk dielectric.</dd>
<dt>Propagation delay (tpd)</dt><dd>Time for a signal to travel a unit length of trace, tpd = √εeff / c.</dd>
<dt>Velocity factor</dt><dd>Propagation velocity as a fraction of the speed of light, 1/√εeff.</dd>
<dt>TDR</dt><dd>Time-Domain Reflectometry — a measurement technique that reveals the actual fabricated impedance profile along a trace.</dd>
</dl>`,
    },
  ];

  /* ─────────────────────────────────────────────────────────────────────────
     HELP PANEL CONTROLLER
  ───────────────────────────────────────────────────────────────────────── */
  const dialog = $('help-dialog');
  const nav = $('help-nav');
  const content = $('help-content');
  const search = $('help-search');

  let active = 'getting-started';
  let lastFocus = null;

  function renderNav(filter = '') {
    const q = filter.trim().toLowerCase();
    const matches = topics.filter(t =>
      (t.title + ' ' + t.keywords + ' ' + t.html.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(q)
    );
    nav.innerHTML = matches.length
      ? matches
          .map(
            t =>
              `<button data-help-id="${t.id}" class="${t.id === active ? 'active' : ''}">${t.title}</button>`
          )
          .join('')
      : '<div class="help-no-results">No matching topics. Try a broader term.</div>';
    $('help-search-status').textContent = q
      ? `${matches.length} topic${matches.length === 1 ? '' : 's'} found`
      : '';
    if (q && matches.length && !matches.some(t => t.id === active)) showTopic(matches[0].id, false);
  }

  function showTopic(id, focus = true) {
    const t = topics.find(x => x.id === id) || topics[0];
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
    setTimeout(() => search.focus(), 0);
  }

  function closeHelp() {
    dialog.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-help-open]')) openHelp();
    const tip = e.target.closest('[data-help-topic]');
    if (tip) openHelp(tip.dataset.helpTopic);
    if (e.target.closest('[data-help-close]')) closeHelp();
    const topicBtn = e.target.closest('[data-help-id]');
    if (topicBtn) showTopic(topicBtn.dataset.helpId);
    if (e.target === dialog) closeHelp();
  });

  search.addEventListener('input', () => renderNav(search.value));

  /* ─────────────────────────────────────────────────────────────────────────
     GUIDED TOUR
  ───────────────────────────────────────────────────────────────────────── */
  const tour = [
    {
      selector: '#tlc-hero',
      title: 'Welcome to the Transmission Line Calculator',
      text: 'This guided tour covers the full workspace — concept tabs, calculator, live simulation, decision tree, and quiz. Restart it anytime from Help.',
    },
    {
      selector: '#tlc-concepts',
      title: 'Concept Explorer',
      text: 'Seven tabs walk through microstrip, embedded microstrip, stripline, asymmetric stripline, differential microstrip, differential stripline, and CPWG.',
    },
    {
      selector: '#tour-animations',
      title: 'Animated cross-section diagrams',
      text: 'Compare microstrip versus stripline field distribution, and see how differential pair coupling changes with spacing. Hover elements for details, and use Replay any time.',
    },
    {
      selector: '#tour-calculator',
      title: 'Z0 / Zdiff calculator',
      text: 'Pick a geometry and enter your trace dimensions here — Z0, εeff, and propagation delay recalculate live, and the cross-section resizes to match.',
    },
    {
      selector: '#tour-charts',
      title: 'Interactive charts',
      text: 'Three Plotly charts: Z0 vs. trace width, Z0 vs. dielectric height, and Zdiff vs. pair spacing. All support zoom, pan, hover, and PNG export.',
    },
    {
      selector: '#tour-simulation',
      title: 'Live simulation',
      text: 'Drag the sliders to see the impedance curve and the cross-section diagram respond instantly to width, height, and dielectric constant changes.',
    },
    {
      selector: '#tour-decision-tree',
      title: 'Interactive decision tree',
      text: 'Answer a few questions about your signal to get a recommended geometry with rationale.',
    },
    {
      selector: '#tour-quiz',
      title: 'Quiz',
      text: 'Thirteen scored multiple-choice questions with explanations to check your understanding.',
    },
    {
      selector: '#tour-export',
      title: 'Export and reports',
      text: 'Export engineering notes, save/load your calculator configuration, print the lesson, or share/bookmark this tool.',
    },
  ];

  let tourIndex = 0;

  function positionTour(el) {
    const pop = $('tour-popover');
    const r = el.getBoundingClientRect();
    const w = Math.min(380, window.innerWidth - 32);
    const left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left));
    const below = r.bottom + 16;
    const top = below + 250 < window.innerHeight ? below : Math.max(16, r.top - 260);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function showTourStep() {
    document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
    const step = tour[tourIndex];
    const el = document.querySelector(step.selector);
    if (!el) {
      finishTour();
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('tour-highlight');
    $('tour-progress').textContent = `Step ${tourIndex + 1} of ${tour.length}`;
    $('tour-title').textContent = step.title;
    $('tour-text').textContent = step.text;
    $('tour-prev').disabled = tourIndex === 0;
    $('tour-next').textContent = tourIndex === tour.length - 1 ? 'Finish' : 'Next';
    setTimeout(() => positionTour(el), 250);
  }

  function startTour() {
    closeHelp();
    tourIndex = 0;
    $('tour-backdrop').hidden = false;
    $('tour-popover').hidden = false;
    document.body.style.overflow = '';
    showTourStep();
  }

  function finishTour() {
    document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
    $('tour-backdrop').hidden = true;
    $('tour-popover').hidden = true;
    localStorage.setItem('tlc_help_tour_complete', '1');
  }

  $('help-start-tour').addEventListener('click', startTour);
  $('tour-next').addEventListener('click', () => {
    if (tourIndex < tour.length - 1) {
      tourIndex++;
      showTourStep();
    } else finishTour();
  });
  $('tour-prev').addEventListener('click', () => {
    if (tourIndex > 0) {
      tourIndex--;
      showTourStep();
    }
  });
  $('tour-skip').addEventListener('click', finishTour);

  window.addEventListener('resize', () => {
    if (!$('tour-popover').hidden) {
      const el = document.querySelector(tour[tourIndex].selector);
      if (el) positionTour(el);
    }
  });

  /* ─── Keyboard navigation ─────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!dialog.hidden) closeHelp();
      else if (!$('tour-popover').hidden) finishTour();
    }
    if (e.key === 'Tab' && !dialog.hidden) {
      const focusable = [...dialog.querySelectorAll('button,a[href],input,[tabindex="0"]')].filter(
        el => !el.disabled && el.offsetParent !== null
      );
      if (focusable.length) {
        const first = focusable[0],
          last = focusable[focusable.length - 1];
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
  });

  /* ─── Init ────────────────────────────────────────────────────────────── */
  renderNav();
  showTopic(active, false);
  if (!localStorage.getItem('tlc_help_tour_complete')) setTimeout(startTour, 1200);
})();
