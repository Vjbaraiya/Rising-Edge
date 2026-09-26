(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const topics = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      keywords: 'quick start beginner workflow first analysis',
      html: `<h2>Getting Started</h2><p>Complete a basic analysis in about 5–10 minutes.</p><ol><li>Enter rail voltage, maximum transient current, and permitted ripple.</li><li>Review the calculated design target.</li><li>Set the analysis start and stop frequencies.</li><li>Keep the default PCB parasitics for an initial study, then replace them with extracted values.</li><li>Choose <strong>Auto</strong> and run optimization, or build a capacitor bank in <strong>Manual</strong> mode.</li><li>Inspect the combined curve, target line, resonance markers, margin, and recommendations.</li><li>Export the response or save the configuration.</li></ol><div class="help-callout"><strong>Tip:</strong> Click <em>Load example</em> for a ready-made four-decade capacitor bank.</div>`,
    },
    {
      id: 'interface',
      title: 'Interface Overview',
      keywords: 'hero input panel capacitor library results charts export sections',
      html: `<h2>Interface Overview</h2><h3>Hero</h3><p>Summarizes the tool and provides shortcuts to optimize, load an example, open Help, or jump to design notes.</p><h3>Input column</h3><p>Steps 01–03 define the rail, frequency/PCB model, and capacitor network.</p><h3>Results column</h3><p>Step 04 presents compliance status, worst impedance, design margin, device count, effective capacitance, the interactive chart, capacitor matrix, and recommendations.</p><h3>Database and engineering notes</h3><p>The expandable database lists the nominal models used by Auto mode. Design notes explain placement and model limitations.</p><div class="help-diagram">Power rail → Frequency & parasitics → Capacitor bank → Complex impedance solver → Chart, warnings, and report</div>`,
    },
    {
      id: 'tutorial',
      title: 'Step-by-Step Tutorial',
      keywords: 'tutorial example 1 volt 10 amp ripple optimize',
      html: `<h2>Step-by-Step Tutorial</h2><ol><li>Use 1.0 V, 10 A, 3% ripple, and 10% margin. The design target is 2.7 mΩ.</li><li>Analyze from 10 kHz to 1 GHz using 1200 points.</li><li>Set mounting inductance to 0.5 nH. Leave other plane/package values at zero for this introductory comparison.</li><li>Run Auto optimization and inspect where the green combined curve crosses the red target.</li><li>Switch to Manual, load the preset, and simulate it.</li><li>Compare worst impedance, margin, anti-resonance peaks, and device count.</li><li>Reduce mounting inductance and simulate again to see the high-frequency effect.</li></ol><div class="help-callout warning"><strong>Engineering caution:</strong> Nominal capacitance can fall substantially under DC bias. Use effective, not nameplate, capacitance for sign-off.</div>`,
    },
    {
      id: 'inputs',
      title: 'Input Parameters',
      keywords:
        'voltage current ripple margin frequency points via plane package capacitance ESR ESL units ranges',
      html: `<h2>Input Parameters</h2><table><thead><tr><th>Field</th><th>Units / range</th><th>Meaning and example</th></tr></thead><tbody><tr><td>Rail voltage</td><td>V, &gt;0</td><td>Nominal VDD. Example: 1.0 V.</td></tr><tr><td>Max current step</td><td>A, &gt;0</td><td>Fast load change, not necessarily steady current. Example: 8 A.</td></tr><tr><td>Allowed ripple</td><td>%, 0–100</td><td>Maximum transient variation relative to VDD. 2.5% at 1 V equals 25 mV.</td></tr><tr><td>Design margin</td><td>%, 0–99</td><td>Lowers the theoretical target to reserve uncertainty.</td></tr><tr><td>Manual target</td><td>mΩ, &gt;0</td><td>Overrides the automatic calculation when a system specification already exists.</td></tr><tr><td>Start / stop</td><td>Hz, stop &gt; start</td><td>Typical start: VRM loop region. Stop: relevant edge bandwidth, often estimated from 1/(π·rise time).</td></tr><tr><td>Data points</td><td>100–5000</td><td>Log-spaced samples. 1200 balances detail and speed.</td></tr><tr><td>Via / mount L</td><td>nH, ≥0</td><td>Connection loop inductance added to every capacitor branch.</td></tr><tr><td>Plane / package L</td><td>nH, ≥0</td><td>Common series inductance added to the parallel network.</td></tr><tr><td>Plane resistance</td><td>mΩ, ≥0</td><td>Common series damping/loss.</td></tr><tr><td>C / ESR / ESL</td><td>F / Ω / H</td><td>Custom branch parameters. All except ESR must be positive.</td></tr><tr><td>Quantity</td><td>integer ≥1</td><td>Identical parallel devices; branch ESR and reactance scale by quantity.</td></tr></tbody></table>`,
    },
    {
      id: 'calculations',
      title: 'Calculations',
      keywords: 'equation target impedance complex RLC parallel srf margin ripple',
      html: `<h2>Calculations</h2><h3>Target impedance</h3><p><strong>Ztarget = (VDD × ripple fraction / ΔI) × (1 − margin fraction)</strong>.</p><h3>Capacitor branch</h3><p>Each enabled type is a series RLC branch: <strong>Z = ESR + jω(ESL + Lmount) + 1/(jωC)</strong>. Quantity divides the branch impedance.</p><h3>Parallel network</h3><p>Complex admittances are summed: <strong>Ytotal = Σ(1/Zn)</strong>, then inverted. Common plane resistance and plane/package inductance are added afterward.</p><h3>Self resonance</h3><p><strong>FSRF = 1/(2π√(LC))</strong>. The branch is capacitive below SRF and inductive above it.</p><h3>Margin</h3><p>The displayed dB margin is <strong>−20 log10(Zworst/Ztarget)</strong>. Positive values pass; negative values indicate a breach.</p>`,
    },
    {
      id: 'charts',
      title: 'Charts',
      keywords:
        'plot axes legend zoom pan hover colors target combined contribution resonance markers',
      html: `<h2>Impedance Chart</h2><ul><li><strong>X axis:</strong> logarithmic frequency in hertz.</li><li><strong>Y axis:</strong> logarithmic impedance magnitude in ohms.</li><li><strong>Green line:</strong> combined PDN response.</li><li><strong>Red dashed line:</strong> target impedance ceiling.</li><li><strong>Thin colored lines:</strong> individual capacitor-type contributions.</li><li><strong>Diamond markers:</strong> detected anti-resonance peaks.</li></ul><p>Hover for exact frequency and impedance. Drag to zoom, use the mode bar to zoom/reset, and inspect crossings with the target line. The legend can hide individual traces.</p><div class="help-callout">A valid design keeps the combined curve below the target throughout the required band—not merely at one frequency.</div>`,
    },
    {
      id: 'results',
      title: 'Results',
      keywords:
        'worst impedance margin devices effective capacitance matrix warnings score interpretation',
      html: `<h2>Interpreting Results</h2><h3>Target status</h3><p><em>Target met</em> means every simulated sample is at or below the target. It does not replace component or layout sign-off.</p><h3>Worst impedance</h3><p>The maximum combined impedance in the band. Its frequency identifies the region needing improvement.</p><h3>Margin</h3><p>Positive dB is headroom; 0 dB touches the limit; negative dB exceeds it.</p><h3>Devices and effective capacitance</h3><p>Devices is the sum of enabled quantities. Effective C is the nominal parallel sum before DC-bias, tolerance, and aging derating.</p><h3>Capacitor matrix</h3><p>Lists each selected type, quantity, nominal C/ESR/ESL, and calculated SRF including mounting inductance.</p><h3>Warnings</h3><p>Recommendations are generated from low- and high-frequency breaches, anti-resonance, inductance, and value diversity.</p>`,
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      keywords: 'increase bulk reduce ESL anti resonance damping placement advice',
      html: `<h2>Recommendations</h2><p>Advice is diagnostic rather than a vendor-part prescription.</p><ul><li><strong>Low-frequency breach:</strong> add effective bulk capacitance or improve the VRM path.</li><li><strong>High-frequency breach:</strong> reduce package/mounting ESL and improve placement.</li><li><strong>Anti-resonance breach:</strong> add an intermediate value, introduce controlled ESR, or reduce the Q of the interacting branches.</li><li><strong>High mounting inductance:</strong> shorten the loop and place power/ground vias at the pads.</li><li><strong>Low value diversity:</strong> span multiple capacitor decades rather than multiplying one value indefinitely.</li></ul>`,
    },
    {
      id: 'reports',
      title: 'Reports & Buttons',
      keywords:
        'buttons optimize calculate add duplicate remove reset save load csv json print help',
      html: `<h2>Buttons, Reports & Export</h2><table><thead><tr><th>Control</th><th>Action</th><th>Common mistake</th></tr></thead><tbody><tr><td>Run optimization</td><td>Greedily selects library values near the current worst-frequency region.</td><td>Treating the result as a purchasable BOM without derating.</td></tr><tr><td>Simulate circuit</td><td>Calculates the enabled manual bank.</td><td>Forgetting disabled rows are excluded.</td></tr><tr><td>Add / custom</td><td>Adds a library or user-defined type.</td><td>Entering µF or nH numbers where base F/H units are requested.</td></tr><tr><td>Duplicate</td><td>Increases the selected row quantity.</td><td>Expecting more identical caps to fix all high-frequency problems.</td></tr><tr><td>Remove / Clear</td><td>Deletes one or all manual entries.</td><td>Clearing before saving a configuration.</td></tr><tr><td>Export CSV</td><td>Writes frequency, impedance, and target columns.</td><td>Exporting before simulation.</td></tr><tr><td>Export JSON</td><td>Writes configuration, summary, capacitors, peaks, and response.</td><td>Confusing a report JSON with a loadable configuration file.</td></tr><tr><td>Save / Load</td><td>Downloads or imports a configuration JSON.</td><td>Editing units in the JSON without conversion.</td></tr><tr><td>Print report</td><td>Uses the browser print dialog and print layout.</td><td>Printing before results exist.</td></tr><tr><td>Help</td><td>Opens this guide.</td><td>None—asking questions is good engineering.</td></tr></tbody></table>`,
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      keywords: 'why above target capacitor values resonance more capacitors ESR placement range',
      html: `<h2>Frequently Asked Questions</h2><h3>Why is impedance above target?</h3><p>The target may be very demanding, the bank may lack coverage near the breach, or common parasitic inductance/resistance may set a floor.</p><h3>Which values should I choose?</h3><p>Cover decades: bulk for low frequencies, mid-value MLCCs for the middle band, and small low-ESL packages near the load for high frequencies.</p><h3>Why do peaks appear?</h3><p>Energy exchanges between unlike capacitances and inductances. Low loss can produce a high-Q anti-resonance.</p><h3>Why doesn't adding more always help?</h3><p>Parallel identical parts reduce branch impedance but retain a similar resonance region; shared mounting or plane inductance can dominate.</p><h3>What ESR is recommended?</h3><p>There is no universal number. Lower ESR reduces the minimum but can increase Q. Controlled loss can be useful for damping.</p><h3>How do I choose frequency range?</h3><p>Start near the source/VRM control region and stop beyond the load's meaningful transient spectrum and package/board model validity.</p>`,
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      keywords:
        'no graph invalid calculation excessive resonance target fail import export file plotly',
      html: `<h2>Troubleshooting</h2><table><thead><tr><th>Symptom</th><th>Likely cause</th><th>Action</th></tr></thead><tbody><tr><td>No graph</td><td>No result or Plotly failed to load.</td><td>Run a calculation; check network/CDN access. Table and exports still work without Plotly.</td></tr><tr><td>Invalid inputs</td><td>Zero/negative values or stop ≤ start.</td><td>Correct the message shown above the workspace.</td></tr><tr><td>Excessive peaks</td><td>High-Q interaction between values.</td><td>Add an intermediate/damped value and reduce shared inductance.</td></tr><tr><td>Target never met</td><td>Target too low, cap limit reached, or common parasitics dominate.</td><td>Review ripple/current assumptions, raise cap limit, and improve interconnect.</td></tr><tr><td>Import fails</td><td>Malformed or incompatible JSON.</td><td>Load an unmodified file created by Save configuration.</td></tr><tr><td>Export missing</td><td>No result, browser download restriction, or blocked popup.</td><td>Simulate first and allow downloads for this site.</td></tr></tbody></table>`,
    },
    {
      id: 'concepts',
      title: 'Engineering Concepts',
      keywords:
        'PDN decoupling bypass ESR ESL resonance via plane placement bulk mid high q damping',
      html: `<h2>Engineering Concepts</h2><h3>What is a PDN?</h3><p>The power distribution network is the complete path from regulator through board, package, and die to the load and back through ground.</p><h3>Why decoupling is needed</h3><p>Interconnect inductance prevents the source from responding instantly. Local capacitors supply charge during fast transients.</p><h3>ESR and damping</h3><p>ESR dissipates energy. It sets the impedance minimum near SRF and influences resonance Q.</p><h3>ESL and placement</h3><p>ESL includes the part and current loop. Smaller packages, close placement, and pad vias reduce loop area.</p><h3>Decoupling hierarchy</h3><p>Bulk capacitors support slow demand, mid-value parts bridge intermediate frequencies, and small low-ESL parts address the highest board-level frequencies.</p><h3>Common mistakes</h3><ul><li>Using nominal capacitance without bias derating.</li><li>Ignoring mounting, plane, package, and VRM impedance.</li><li>Choosing values only from a rule-of-thumb decade sequence.</li><li>Optimizing the schematic but not the physical current loop.</li></ul>`,
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      keywords: 'keyboard ctrl enter save print escape F1',
      html: `<h2>Keyboard Shortcuts</h2><table><tbody><tr><th>Ctrl + Enter</th><td>Run Auto optimization or Manual simulation, depending on the active mode.</td></tr><tr><th>Ctrl + S</th><td>Save the current configuration JSON.</td></tr><tr><th>Ctrl + P</th><td>Print the report when results exist.</td></tr><tr><th>Esc</th><td>Close Help or end the feature tour.</td></tr><tr><th>F1</th><td>Open Help.</td></tr></tbody></table>`,
    },
    {
      id: 'glossary',
      title: 'Glossary',
      keywords:
        'definitions PDN decoupling bypass ESR ESL ripple target SRF anti resonance plane return path Q damping',
      html: `<h2>Glossary</h2><dl><h3>PDN</h3><p>Power distribution network: every conductive and energy-storage element between source and load.</p><h3>Decoupling / bypass capacitor</h3><p>A local energy reservoir that provides a low-impedance path for transient current or noise.</p><h3>ESR</h3><p>Equivalent series resistance; the dissipative part of a capacitor model.</p><h3>ESL</h3><p>Equivalent series inductance; the inductive part of the component and its connection.</p><h3>Ripple voltage</h3><p>Permitted or measured variation around nominal rail voltage.</p><h3>Target impedance</h3><p>The maximum PDN impedance compatible with a specified transient current and ripple.</p><h3>SRF</h3><p>Self-resonant frequency where capacitive and inductive reactance cancel.</p><h3>Anti-resonance</h3><p>A parallel-network impedance peak caused by interacting energy-storage branches.</p><h3>Power plane / return path</h3><p>Conductive structures carrying supply and return current; their geometry controls loop inductance.</p><h3>Q factor / damping</h3><p>Q describes resonance sharpness. Damping dissipates energy and reduces peak amplitude.</p></dl>`,
    },
  ];
  const dialog = $('help-dialog'),
    nav = $('help-nav'),
    content = $('help-content'),
    search = $('help-search');
  let active = 'getting-started',
    lastFocus = null,
    tourIndex = 0;
  function renderNav(filter = '') {
    const q = filter.trim().toLowerCase(),
      matches = topics.filter(t =>
        (t.title + ' ' + t.keywords + ' ' + t.html.replace(/<[^>]+>/g, ' '))
          .toLowerCase()
          .includes(q)
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
      ? matches.length + ' topic' + (matches.length === 1 ? '' : 's') + ' found'
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
    const open = e.target.closest('[data-help-open]');
    if (open) openHelp();
    const tip = e.target.closest('[data-help-topic]');
    if (tip) openHelp(tip.dataset.helpTopic);
    if (e.target.closest('[data-help-close]')) closeHelp();
    const topic = e.target.closest('[data-help-id]');
    if (topic) showTopic(topic.dataset.helpId);
    if (e.target === dialog) closeHelp();
  });
  search.addEventListener('input', () => renderNav(search.value));

  const tour = [
    {
      selector: '.pdn-hero',
      title: 'Welcome to PDN Optimizer',
      text: 'This guided tour covers the workflow. You can restart it at any time from Help.',
    },
    {
      selector: '#tour-power',
      title: '1. Define the power rail',
      text: 'Voltage, transient current, ripple, and margin determine the impedance ceiling. Avoid using steady-state current in place of the transient step.',
    },
    {
      selector: '#tour-frequency',
      title: '2. Define bandwidth and parasitics',
      text: 'Choose a valid frequency band and include mounting, plane, and package parasitics. Shared inductance often limits high-frequency performance.',
    },
    {
      selector: '#tour-capacitors',
      title: '3. Build or optimize the bank',
      text: 'Auto mode searches the built-in library. Manual mode supports library parts, custom models, quantities, enable/disable, duplicate, and remove.',
    },
    {
      selector: '#tour-results',
      title: '4. Interpret the result',
      text: 'A pass requires the combined curve to stay below target across the entire band. Review worst impedance and dB margin.',
    },
    {
      selector: '[data-tour-chart]',
      title: 'Explore the chart',
      text: 'Hover for values, drag to zoom, and use the legend to isolate capacitor contributions. Diamonds identify anti-resonance peaks.',
    },
    {
      selector: '#tour-board',
      title: 'See it on a board',
      text: 'A shared VDD/GND rail runs from the regulator to the IC. Bulk capacitance sits nearest the regulator; the fastest, lowest-ESL capacitors sit closest to the IC. Current leaves the regulator as one wave and cascades through the bank — charging each capacitor in turn, bulk first — before finally reaching the IC.',
    },
    {
      selector: '#tour-scope',
      title: 'Watch the rail on scope',
      text: 'This CH1 trace mimics an oscilloscope view of VDD: a simulated load step sags the rail and the decoupling network rings it back, with the sag size and ring rate scaling with your input current and capacitor selection. It turns red if the ripple would breach your target.',
    },
    {
      selector: '#tour-export',
      title: 'Save and communicate',
      text: 'Export response data or a full JSON report, save/load configurations, and print a review-ready report.',
    },
  ];
  function positionTour(el) {
    const pop = $('tour-popover'),
      r = el.getBoundingClientRect(),
      w = Math.min(380, window.innerWidth - 32),
      left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left)),
      below = r.bottom + 16,
      top = below + 250 < window.innerHeight ? below : Math.max(16, r.top - 260);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function showTourStep() {
    document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
    const step = tour[tourIndex],
      el = document.querySelector(step.selector);
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
    localStorage.setItem('pdn_help_tour_complete', '1');
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
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      document
        .querySelector(
          stateMode() === 'manual' ? '[data-action="simulate"]' : '[data-action="optimize"]'
        )
        ?.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.querySelector('[data-action="save"]')?.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && dialog.hidden) {
      e.preventDefault();
      document.querySelector('[data-action="print"]')?.click();
    }
  });
  function stateMode() {
    return document.querySelector('[data-mode="manual"]')?.classList.contains('active')
      ? 'manual'
      : 'auto';
  }
  renderNav();
  showTopic(active, false);
  if (!localStorage.getItem('pdn_help_tour_complete')) setTimeout(startTour, 900);
})();
