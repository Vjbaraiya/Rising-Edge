/**
 * Termination Selector — Help System & Guided Tour
 * Adapted from the ESD Protection Analyzer / Ferrite Bead Optimizer help.js
 * architecture, re-scoped to termination-selector topics and tour targets.
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
<p>The Termination Selector is a self-paced interactive lesson plus a live calculator. A typical session:</p>
<ol>
  <li>Read the Concept Explorer tabs (Series, Parallel, Thevenin, AC, Differential, Decision Guide).</li>
  <li>Watch the two animated SVG diagrams to see reflections happen visually.</li>
  <li>Enter your line and driver parameters into the calculator — it recalculates live, no button press required.</li>
  <li>Drag the live simulation sliders to see the receiver waveform respond to Z0, termination resistance, and trace length.</li>
  <li>Walk the interactive decision tree for a scheme recommendation with rationale.</li>
  <li>Take the 10-question quiz to check your understanding.</li>
</ol>
<div class="help-callout"><strong>Tip:</strong> Click <em>Play Lesson</em> in the hero to open the floating narrator widget, which reads the lesson aloud and auto-scrolls through the key sections.</div>`,
    },
    {
      id: 'concepts',
      title: 'Concept Explorer',
      keywords: 'series parallel thevenin ac rc differential tabs concepts termination types',
      html: `<h2>Concept Explorer</h2>
<p>Six tabs cover the termination strategies used in real designs:</p>
<table><thead><tr><th>Tab</th><th>Use when</th></tr></thead>
<tbody>
<tr><td>Series</td><td>Point-to-point, single receiver, power-sensitive</td></tr>
<tr><td>Parallel</td><td>Multi-drop bus, a V_TT rail is available</td></tr>
<tr><td>Thevenin</td><td>Multi-drop bus, no V_TT rail exists</td></tr>
<tr><td>AC (RC)</td><td>Matching needed but static power must be near zero</td></tr>
<tr><td>Differential</td><td>LVDS / PCIe / USB / HDMI-class differential pairs</td></tr>
<tr><td>Decision Guide</td><td>Quick-reference table before using the full decision tree</td></tr>
</tbody></table>`,
    },
    {
      id: 'calculator',
      title: 'Termination Calculator Inputs',
      keywords:
        'calculator inputs Z0 VDD driver impedance topology bus standard bit rate VTT power budget',
      html: `<h2>Termination Calculator Inputs</h2>
<table><thead><tr><th>Input</th><th>Effect</th></tr></thead>
<tbody>
<tr><td>Line impedance Z0</td><td>Baseline for every resistor calculation (Rs, Rp, R1/R2, differential R).</td></tr>
<tr><td>Supply voltage VDD</td><td>Sets launch voltage and static power calculations.</td></tr>
<tr><td>Driver output impedance</td><td>Subtracted from Z0 to size the series resistor.</td></tr>
<tr><td>Driver type</td><td>Push-pull vs. open-drain changes the recommended scheme.</td></tr>
<tr><td>Topology</td><td>Point-to-point / multi-drop / daisy-chain drives the recommendation engine.</td></tr>
<tr><td>Bus / interface standard</td><td>Presets that steer the recommendation toward known real-world practice (DDR, LVDS, RS-485, SPI, clock).</td></tr>
<tr><td>Bit rate</td><td>Used to size the AC termination capacitor's time constant.</td></tr>
<tr><td>VTT rail available?</td><td>Chooses between Parallel-to-VTT and Thevenin for multi-drop buses.</td></tr>
<tr><td>Power budget priority</td><td>Nudges the recommendation toward lower-power schemes when tight.</td></tr>
</tbody></table>
<div class="help-callout">The calculator recalculates on every keystroke — there is no "Run" button to press.</div>`,
    },
    {
      id: 'results',
      title: 'Interpreting Results',
      keywords: 'recommendation Rs Rp Thevenin AC capacitor gamma reflection power launch voltage',
      html: `<h2>Interpreting Results</h2>
<p>The results card always computes <strong>all five</strong> schemes so you can compare, plus highlights the recommended one with a colored badge.</p>
<ul>
<li><strong>R_S (series)</strong> — resistor value for series termination.</li>
<li><strong>R_P / R_TT</strong> — resistor value for parallel/end termination.</li>
<li><strong>Thevenin R1 / R2</strong> — split resistor pair values.</li>
<li><strong>AC term. C</strong> — capacitor value for RC termination, sized from your bit rate.</li>
<li><strong>Reflection Γ (before/after)</strong> — reflection coefficient for an unterminated open end vs. a matched parallel termination.</li>
<li><strong>Static power</strong> — continuous power cost of the recommended scheme.</li>
<li><strong>Launch voltage</strong> — voltage the driver actually launches onto the line under series termination.</li>
</ul>`,
    },
    {
      id: 'simulation',
      title: 'Live Reflection Simulation',
      keywords: 'simulation sliders Z0 termination resistance trace length bounce diagram lattice',
      html: `<h2>Live Reflection Simulation</h2>
<p>The simulation uses a simplified bounce (lattice) diagram model: a step is launched from the source, bounces between source and load reflection coefficients, and the cumulative voltage at the receiver is plotted as a stair-step waveform.</p>
<ul>
<li><strong>Line impedance Z0</strong> — sets the reference impedance for both reflection coefficients.</li>
<li><strong>Termination resistance</strong> — the resistor value used at the source (series) or load (parallel), depending on the selected type.</li>
<li><strong>Trace length</strong> — converts to a one-way propagation delay using a stripline-in-FR4 velocity approximation, which sets how far apart the reflections land in time.</li>
<li><strong>Termination type</strong> — None (open end, rings), Series (matched source), or Parallel (matched load).</li>
</ul>
<div class="help-callout warning">This is an educational approximation, not a full SPICE or telegrapher's-equation solver — it is built to make the reflection mechanism visible, not to replace field-solver-grade simulation.</div>`,
    },
    {
      id: 'charts',
      title: 'Charts',
      keywords: 'chart reflection coefficient waveform power dissipation plotly zoom pan export',
      html: `<h2>Charts</h2>
<h3>Reflection coefficient vs. Z_L/Z0</h3>
<p>Plots Γ = (r−1)/(r+1) across a log-scaled ratio from 0.01 to 100, with reference points at short, matched, and open conditions.</p>
<h3>Receiver waveform comparison</h3>
<p>Shows the simulated stepped receiver voltage for unterminated, series-terminated, and parallel-terminated scenarios side by side, using the same bounce-diagram model as the live simulation.</p>
<h3>Power dissipation vs. supply voltage</h3>
<p>Compares static power per terminated line across parallel, Thevenin, and series schemes as V_DD sweeps from 0.9 V to 6 V.</p>
<div class="help-callout">All charts support zoom, pan, hover tooltips, and PNG export via the Plotly toolbar, and re-theme automatically when you switch dark/light mode.</div>`,
    },
    {
      id: 'decision-tree',
      title: 'Interactive Decision Tree',
      keywords: 'decision tree questions recommendation restart differential topology multi-drop',
      html: `<h2>Interactive Decision Tree</h2>
<p>Answer each question by clicking an option. The breadcrumb above the question shows your path. Click <em>Restart</em> at any time to begin again from the first question.</p>
<p>The tree first asks whether the signal is differential, then branches through topology (point-to-point / multi-drop / daisy-chain), driver type, and V_TT rail availability to arrive at a recommended scheme with a short rationale.</p>`,
    },
    {
      id: 'quiz',
      title: 'Quiz',
      keywords: 'quiz questions score explanations restart',
      html: `<h2>Quiz</h2>
<p>Ten multiple-choice questions covering the physics, the formulas, and real-world topology decisions. Each answer is locked in once selected and immediately shows whether it was correct along with an explanation. Use Previous/Next to navigate, and Restart Quiz on the final score screen to try again.</p>`,
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
<tr><td>Save config</td><td>Saves the current calculator inputs to a JSON file.</td></tr>
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
      keywords: 'JEDEC ODT DDR TIA EIA 485 RS-485 IPC-2141 controlled impedance standards',
      html: `<h2>Standards Reference</h2>
<table><thead><tr><th>Standard</th><th>Scope</th></tr></thead>
<tbody>
<tr><td>JEDEC JESD79 (DDR3/4/5)</td><td>Defines selectable on-die termination (ODT) values and ZQ calibration procedure for memory interfaces.</td></tr>
<tr><td>TIA/EIA-485-A</td><td>Specifies 120 Ω termination at both physical ends of an RS-485 twisted-pair bus, never mid-bus.</td></tr>
<tr><td>IPC-2141 / IPC-2141A</td><td>Controlled-impedance PCB stack-up design formulas — the prerequisite for any termination calculation to be meaningful.</td></tr>
</tbody></table>`,
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      keywords: 'faq why series termination fails multi-drop resistor tolerance TDR',
      html: `<h2>Frequently Asked Questions</h2>
<h3>Why doesn't series termination work well on multi-drop buses?</h3>
<p>It relies on the doubling reflection at a single far-end receiver. Intermediate taps see only a half-amplitude step before the wave has doubled, which is often insufficient noise margin.</p>
<h3>Do I need to terminate every trace?</h3>
<p>No — only traces that are electrically long relative to the signal's rise time need termination. See the Myths section on the page for the full explanation.</p>
<h3>How precise does the termination resistor need to be?</h3>
<p>Tolerance requirements scale with data rate. Generic 5% resistors are usually fine below a few hundred Mbps; multi-gigabit differential links should use 1% or tighter.</p>
<h3>What tool would I use to verify a termination on a real board?</h3>
<p>A Time-Domain Reflectometer (TDR) directly measures the impedance profile along the trace and confirms both Z0 and the termination match.</p>`,
    },
    {
      id: 'glossary',
      title: 'Glossary',
      keywords: 'definitions Z0 gamma reflection VTT ODT Zdiff bounce diagram TDR',
      html: `<h2>Glossary</h2>
<dl>
<dt>Z0 (characteristic impedance)</dt><dd>The impedance a traveling wave sees on a transmission line, set by trace geometry and dielectric.</dd>
<dt>Γ (reflection coefficient)</dt><dd>(Z_L − Z0)/(Z_L + Z0) — fraction of the incident wave reflected at a discontinuity.</dd>
<dt>V_TT</dt><dd>A termination voltage rail, often V_DD/2, used for parallel termination without full-swing static power.</dd>
<dt>ODT</dt><dd>On-Die Termination — termination resistance integrated into the driver/receiver silicon instead of a discrete resistor.</dd>
<dt>Z_diff</dt><dd>Differential impedance of a coupled pair, typically slightly less than 2× the single-ended Z0.</dd>
<dt>Bounce / lattice diagram</dt><dd>A graphical method for tracking successive reflections between source and load over time and distance.</dd>
<dt>TDR</dt><dd>Time-Domain Reflectometry — a measurement technique that reveals impedance discontinuities along a trace.</dd>
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
      selector: '#ts-hero',
      title: 'Welcome to the Termination Selector',
      text: 'This guided tour covers the full workspace — concept tabs, calculator, live simulation, decision tree, and quiz. Restart it anytime from Help.',
    },
    {
      selector: '#ts-concepts',
      title: 'Concept Explorer',
      text: 'Six tabs walk through series, parallel, Thevenin, AC (RC), and differential termination, plus a quick decision-guide table.',
    },
    {
      selector: '#tour-animations',
      title: 'Animated reflection diagrams',
      text: 'Watch a wave ring at an open, unterminated end versus being absorbed cleanly at a properly terminated end. Hover elements for details, and use Replay any time.',
    },
    {
      selector: '#tour-calculator',
      title: 'Termination calculator',
      text: 'Enter your line impedance, driver, topology, and bus standard here — the recommendation and every resistor/capacitor value recalculate live.',
    },
    {
      selector: '#tour-charts',
      title: 'Interactive charts',
      text: 'Three Plotly charts: reflection coefficient vs. impedance ratio, a receiver waveform comparison, and a power dissipation comparison. All support zoom, pan, hover, and PNG export.',
    },
    {
      selector: '#tour-simulation',
      title: 'Live reflection simulation',
      text: 'Drag the sliders to see the bounce-diagram waveform respond instantly to impedance, termination resistance, and trace length changes.',
    },
    {
      selector: '#tour-decision-tree',
      title: 'Interactive decision tree',
      text: 'Answer a few questions about your net to get a recommended termination scheme with rationale.',
    },
    {
      selector: '#tour-quiz',
      title: 'Quiz',
      text: 'Ten scored multiple-choice questions with explanations to check your understanding.',
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
    localStorage.setItem('ts_help_tour_complete', '1');
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
  if (!localStorage.getItem('ts_help_tour_complete')) setTimeout(startTour, 1200);
})();
