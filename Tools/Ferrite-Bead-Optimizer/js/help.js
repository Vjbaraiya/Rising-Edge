/**
 * Ferrite Bead Optimizer — Help System & Guided Tour
 * Adapted from ESD Protection Analyzer help.js architecture.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ── Help topics ──────────────────────────────────────────────────────── */
  const topics = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      keywords: 'quick start beginner workflow first run optimizer',
      html: `<h2>Getting Started</h2>
<p>Complete a ferrite bead optimization in about 2–4 minutes:</p>
<ol>
  <li>Set your application type, target noise frequency, supply current, and voltage parameters.</li>
  <li>Either select a ferrite bead from the dropdown or click <strong>Auto-select</strong> to let the optimizer choose the best candidate.</li>
  <li>Choose a filter topology (L, π, or T) based on your attenuation requirements.</li>
  <li>Click <strong>Run Optimizer</strong> to calculate impedance, insertion loss, resonance, and PDN noise.</li>
  <li>Review the summary stats, 10 interactive charts, candidate comparison table, and layout guidelines.</li>
  <li>Export results to CSV or JSON, or print a formatted report.</li>
</ol>
<div class="help-callout"><strong>Tip:</strong> Click <strong>Auto-select</strong> first to see the tool's recommendation, then manually adjust the bead parameters to explore alternatives.</div>`,
    },
    {
      id: 'params',
      title: 'Application Parameters',
      keywords: 'application type noise frequency supply current voltage drop attenuation target',
      html: `<h2>Application Parameters</h2>
<table><thead><tr><th>Parameter</th><th>Description</th><th>Typical values</th></tr></thead>
<tbody>
<tr><td>Application type</td><td>Sets the layout guideline profile and influences the optimizer scoring.</td><td>Power rail, Signal line, RF, Audio, USB</td></tr>
<tr><td>Target noise frequency</td><td>The frequency of the primary EMI/noise you want to suppress. This is where the bead's impedance will be evaluated.</td><td>100 MHz (switching regulator), 480 MHz (USB HS)</td></tr>
<tr><td>Supply current</td><td>Maximum DC current through the bead. Used to calculate voltage drop and DC bias derating of the impedance.</td><td>50–5000 mA</td></tr>
<tr><td>Supply voltage</td><td>Operating voltage of the rail. Used for voltage drop budget calculation.</td><td>1.8V, 3.3V, 5V</td></tr>
<tr><td>Max voltage drop</td><td>Maximum allowed DC voltage drop across the bead RDC (V<sub>drop</sub> = I × R<sub>DC</sub>). Must be within load regulation budget.</td><td>20–100 mV</td></tr>
<tr><td>Target attenuation</td><td>Minimum required insertion loss at the target noise frequency. Used to score candidates.</td><td>20–40 dB</td></tr>
</tbody></table>
<div class="help-callout warning"><strong>Current budget:</strong> Always set the supply current to the maximum expected value, not the typical. Ferrite bead impedance degrades rapidly at high current — worst-case performance is what matters for compliance.</div>`,
    },
    {
      id: 'bead-select',
      title: 'Bead Selection',
      keywords: 'part number series package impedance rated current RDC SRF auto select database',
      html: `<h2>Ferrite Bead Selection</h2>
<h3>Using the database</h3>
<p>Select a part from the dropdown to auto-fill all parameters. The database includes representative beads from Murata, TDK, Wurth, Laird, and Samsung across 0402, 0603, 0805, and 1206 packages.</p>
<h3>Manual entry</h3>
<p>Enter your own bead specifications directly. All parameters come from the manufacturer datasheet:</p>
<table><thead><tr><th>Parameter</th><th>Symbol</th><th>Source in datasheet</th></tr></thead>
<tbody>
<tr><td>Impedance at 100 MHz</td><td>Z<sub>100</sub></td><td>Impedance vs frequency table/graph at 0A bias</td></tr>
<tr><td>Rated DC current</td><td>I<sub>rated</sub></td><td>DC current specification — where impedance starts to significantly degrade</td></tr>
<tr><td>DC resistance</td><td>R<sub>DC</sub></td><td>Electrical characteristics table — determines voltage drop and I²R heating</td></tr>
<tr><td>Self-resonant frequency</td><td>SRF</td><td>Impedance graph — peak of the impedance curve</td></tr>
<tr><td>Load capacitance</td><td>C<sub>out</sub></td><td>Your circuit design — capacitors on the output side of the bead</td></tr>
</tbody></table>
<h3>Auto-select</h3>
<p>Click <strong>Auto-select</strong> to have the optimizer choose the highest-scoring candidate from the database for your requirements. The selected part's parameters are pre-filled and a full analysis runs automatically.</p>`,
    },
    {
      id: 'topology',
      title: 'Filter Topology',
      keywords: 'L filter pi filter T filter topology capacitor shunt series',
      html: `<h2>Filter Topology</h2>
<table><thead><tr><th>Topology</th><th>Configuration</th><th>Best for</th><th>Trade-offs</th></tr></thead>
<tbody>
<tr><td><strong>L-filter</strong></td><td>Bead in series + capacitor to ground at output</td><td>General purpose, moderate EMI (&lt; 30 dB)</td><td>Simplest, lowest cost, resonance with output cap</td></tr>
<tr><td><strong>π-filter</strong></td><td>Capacitor at input + bead in series + capacitor at output</td><td>High EMI suppression (&gt; 40 dB), switching power supplies</td><td>Highest attenuation, sharper resonance, more BOM items</td></tr>
<tr><td><strong>T-filter</strong></td><td>Bead in series + capacitor to ground + second bead in series</td><td>High source impedance environments, extreme attenuation</td><td>Highest Vdrop, best for high source impedance, complex</td></tr>
</tbody></table>
<div class="help-callout"><strong>Resonance warning:</strong> All filter topologies create an LC resonance between the bead inductance and the capacitor. If this resonance falls near the target noise frequency, it can amplify rather than suppress noise. The Resonance Analysis chart shows where the resonant peak falls for your design.</div>
<h3>When to use each</h3>
<p><strong>L-filter:</strong> MCU power rail with a 10–47 µF bulk cap already present. The existing cap forms the filter with the bead.</p>
<p><strong>π-filter:</strong> Sensitive analog supply, DC-DC converter output, RF power supply, USB VBUS isolation.</p>
<p><strong>T-filter:</strong> Very high source impedance (long cable, weak regulator) where reflections from a single bead would be problematic.</p>`,
    },
    {
      id: 'results',
      title: 'Interpreting Results',
      keywords:
        'results stats impedance insertion loss voltage drop derating resonance status pass fail',
      html: `<h2>Interpreting Results</h2>
<h3>Summary statistics</h3>
<table><thead><tr><th>Stat</th><th>Meaning</th><th>Good / bad</th></tr></thead>
<tbody>
<tr><td>Z @ target</td><td>Bead impedance at the target noise frequency with DC bias derating applied.</td><td>Higher is better. Must exceed source impedance for useful filtering.</td></tr>
<tr><td>Insertion loss</td><td>Predicted attenuation at the target frequency in the actual circuit (not 50 Ω datasheet value).</td><td>Should exceed target attenuation. ≥ 20 dB is useful.</td></tr>
<tr><td>Voltage drop</td><td>DC voltage drop = I × R<sub>DC</sub>. Reduces headroom for the load.</td><td>Lower is better. Must be within max Vdrop budget.</td></tr>
<tr><td>Bias derating</td><td>Percentage reduction in impedance due to DC bias current at the operating point.</td><td>Lower derating = more impedance retained. &lt; 30% is good.</td></tr>
<tr><td>Resonant freq</td><td>LC resonance frequency of bead + output cap. Noise at this frequency may be amplified.</td><td>Should be well away from the target noise frequency and critical signal frequencies.</td></tr>
</tbody></table>
<h3>Status codes</h3>
<p><strong>PASS:</strong> All criteria met — voltage drop within budget, rated current not exceeded, insertion loss meets target, resonance risk low or medium.</p>
<p><strong>MARGINAL:</strong> One or more criteria are borderline — insertion loss slightly below target, moderate resonance risk, or bias derating &gt; 60%. Acceptable with engineering justification.</p>
<p><strong>FAIL:</strong> Current exceeds rated value, voltage drop exceeds budget, or insertion loss is significantly below target. Choose a different bead.</p>`,
    },
    {
      id: 'charts',
      title: 'Charts',
      keywords:
        'chart impedance insertion loss derating resonance PDN bode topology temperature comparison plotly',
      html: `<h2>Charts</h2>
<table><thead><tr><th>Chart</th><th>What it shows</th><th>How to use it</th></tr></thead>
<tbody>
<tr><td>Impedance vs Frequency</td><td>|Z|, R, and |X| components vs frequency (log scale). Shows where peak impedance occurs.</td><td>Look for high impedance at the target noise frequency. Resistive R should dominate at target freq for best energy dissipation.</td></tr>
<tr><td>Insertion Loss vs Frequency</td><td>Filter attenuation in dB vs frequency for the selected topology and load capacitance.</td><td>Compare the curve to the target attenuation line. The curve should exceed the target at the noise frequency.</td></tr>
<tr><td>DC Bias Derating</td><td>Impedance at the target frequency vs DC operating current.</td><td>Find your operating current on the x-axis to see the actual impedance at that bias point. The red dot marks the operating point.</td></tr>
<tr><td>Resonance Analysis</td><td>Bead + output cap filter impedance showing the LC resonance peak.</td><td>Check that the resonant peak is far from the target noise frequency and from critical signal frequencies.</td></tr>
<tr><td>PDN Noise Model</td><td>PDN impedance profile seen from the load, compared to the target impedance.</td><td>The PDN impedance should stay below the target impedance (yellow line) across the frequency range of interest.</td></tr>
<tr><td>Bode Plot</td><td>Transfer function |H(jω)| magnitude and phase vs frequency.</td><td>Check the magnitude slope and phase margin. A steep slope indicates aggressive filtering but higher resonance risk.</td></tr>
<tr><td>Topology Comparison</td><td>L, π, and T filter insertion loss on one chart.</td><td>Assess whether a more complex topology is needed to meet the attenuation target.</td></tr>
<tr><td>Z vs Temperature</td><td>Impedance at the target frequency across the operating temperature range.</td><td>For automotive or industrial designs, verify that impedance is adequate at the maximum operating temperature.</td></tr>
<tr><td>Candidate Z Comparison</td><td>Bar chart of all candidates' impedance at the target frequency, colour-coded by status.</td><td>Compare candidates visually. Green = pass, amber = marginal, red = fail.</td></tr>
<tr><td>Top Candidates IL</td><td>Insertion loss curves for the top 3 candidates on one chart.</td><td>Compare bandwidth and slope of attenuation for the best candidates.</td></tr>
</tbody></table>
<div class="help-callout">Charts require an internet connection to load Plotly.js from CDN. Results, recommendations, and export functions work without Plotly.</div>`,
    },
    {
      id: 'layout',
      title: 'PCB Layout Guidelines',
      keywords:
        'layout PCB placement routing trace width current thermal decoupling capacitor ground resonance',
      html: `<h2>PCB Layout Guidelines</h2>
<h3>Golden rules for ferrite bead placement</h3>
<ol>
  <li><strong>Bead close to source:</strong> Place the ferrite bead within 5–10 mm of the power source (regulator output pin or connector). Longer traces increase parasitic inductance and reduce high-frequency effectiveness.</li>
  <li><strong>Decoupling capacitors on the load side:</strong> The output capacitor is what forms the filter with the bead. Place it immediately after the bead, not before. HF decoupling (100 nF MLCC) at each VDD pin within 1 mm.</li>
  <li><strong>Solid ground plane:</strong> Never split the ground plane under a ferrite bead filter. The return current must flow directly under the bead to minimize inductance in the return path.</li>
  <li><strong>Trace sizing:</strong> Size traces for the worst-case current. The bead dissipates I²×RDC as heat — ensure adequate copper area for heat spreading, particularly for 0402/0603 packages at ≥ 300 mA.</li>
  <li><strong>Resonance damping:</strong> Add a polymer/electrolytic capacitor in parallel with the MLCC output cap to provide damping (higher ESR). This prevents resonance amplification.</li>
</ol>
<div class="help-callout warning"><strong>Critical error:</strong> Placing the decoupling capacitor on the input side of the bead provides no filtering benefit — it bypasses the noise before the bead can attenuate it. Decoupling caps must be on the output (load) side of the bead.</div>`,
    },
    {
      id: 'reports',
      title: 'Reports & Export',
      keywords: 'export CSV JSON print report save load config keyboard shortcut',
      html: `<h2>Reports & Export</h2>
<table><thead><tr><th>Button</th><th>Action</th><th>Format</th></tr></thead>
<tbody>
<tr><td>Export CSV</td><td>Downloads the candidate comparison table with all parameters.</td><td>CSV (Excel-compatible)</td></tr>
<tr><td>Export JSON</td><td>Full report including parameters, summary, all candidates, and warnings.</td><td>JSON</td></tr>
<tr><td>Save config</td><td>Saves the current input parameters for reuse in future sessions.</td><td>JSON config file</td></tr>
<tr><td>Load config</td><td>Restores previously saved analysis parameters.</td><td>JSON config file</td></tr>
<tr><td>Print report</td><td>Opens the browser print dialog with a print-optimized layout. Charts and tables are included. Navigation elements are hidden.</td><td>Browser PDF / paper</td></tr>
</tbody></table>
<h3>Keyboard shortcuts</h3>
<table><tbody>
<tr><th>Ctrl+Enter</th><td>Run optimizer</td></tr>
<tr><th>Ctrl+S</th><td>Save configuration</td></tr>
<tr><th>Ctrl+P</th><td>Print report</td></tr>
<tr><th>Esc</th><td>Close Help or end tour</td></tr>
<tr><th>F1</th><td>Open Help</td></tr>
</tbody></table>`,
    },
    {
      id: 'physics',
      title: 'Ferrite Bead Physics',
      keywords:
        'physics impedance model resistive inductive capacitive SRF lossy inductor Lorentzian',
      html: `<h2>Ferrite Bead Physics</h2>
<h3>Impedance model</h3>
<p>A ferrite bead is modelled as a lossy RLC network. The complex impedance Z(f) = R(f) + jX(f) has three regions:</p>
<ul>
  <li><strong>Low frequency (f &lt;&lt; SRF):</strong> Inductive behaviour dominates. Z rises with frequency. R is small — the bead stores rather than dissipates energy.</li>
  <li><strong>Near SRF:</strong> Resistive component R peaks. This is the ideal operating region — energy is dissipated as heat rather than reflected. The tool targets this region.</li>
  <li><strong>Above SRF:</strong> Parasitic winding capacitance dominates. Z falls with frequency. The bead becomes less effective as an EMI filter.</li>
</ul>
<h3>DC bias model</h3>
<p>The impedance derating with DC current is modelled using an empirical sigmoid function fitted to typical manufacturer curves:</p>
<p style="font-family:monospace; padding: 8px; background: var(--bg-alt); border-radius: 6px;">
  factor(I) = 1 − (1 − Z_min/Z_rated) × (I/I_rated)<sup>0.7</sup>
</p>
<p>where Z_min is the impedance at rated current (bead.deratePct × Z_rated). This matches the characteristic concave-down shape seen in manufacturer derating curves.</p>
<h3>Insertion loss calculation</h3>
<p>The tool calculates insertion loss as the voltage divider ratio between the bead impedance and the load impedance (output capacitor):</p>
<p style="font-family:monospace; padding: 8px; background: var(--bg-alt); border-radius: 6px;">
  H(jω) = Z_load / (Z_load + Z_bead)<br>
  IL (dB) = −20 × log₁₀(|H(jω)|)
</p>
<p>Note that this gives the real-circuit insertion loss, which differs significantly from the 50 Ω datasheet S21 measurement.</p>`,
    },
    {
      id: 'glossary',
      title: 'Glossary',
      keywords: 'glossary definitions impedance SRF RDC insertion loss derating resonance PDN EMI',
      html: `<h2>Glossary</h2>
<dl>
<dt>Z (Impedance)</dt><dd>Complex quantity representing opposition to AC current. Z = R + jX. For ferrite beads, |Z| at the noise frequency determines filtering effectiveness.</dd>
<dt>SRF (Self-Resonant Frequency)</dt><dd>Frequency at which the bead's inductive reactance equals its parasitic capacitive reactance. Impedance peaks at the SRF. Above SRF, the bead becomes capacitive and less effective.</dd>
<dt>R<sub>DC</sub> (DC Resistance)</dt><dd>Ohmic resistance of the bead winding at DC. Causes voltage drop (V = I × R<sub>DC</sub>) and I²R power dissipation. Specified in mΩ.</dd>
<dt>I<sub>rated</sub> (Rated current)</dt><dd>DC current at which the bead's impedance is significantly degraded (manufacturer-defined). Operating above this current is possible but with reduced filtering effectiveness.</dd>
<dt>Insertion Loss (IL)</dt><dd>Attenuation provided by the filter at a given frequency, in dB. IL = −20 log₁₀(|H(jω)|). Positive dB = attenuation.</dd>
<dt>DC Bias Derating</dt><dd>Reduction in impedance due to DC magnetic saturation of the ferrite core. Increases with current. A bead at rated current may have 30–60% less impedance than at 0 A.</dd>
<dt>Resonance</dt><dd>LC tank formed by the bead inductance and the filter capacitance. At the resonant frequency, noise may be amplified rather than attenuated. Must be damped for stable operation.</dd>
<dt>PDN (Power Distribution Network)</dt><dd>The network of power planes, traces, capacitors, and ferrite beads that distributes power from the supply to the IC. PDN impedance determines voltage stability under load transients.</dd>
<dt>EMI (Electromagnetic Interference)</dt><dd>Unwanted electromagnetic energy that can disrupt circuit operation or cause regulatory compliance failure. Ferrite beads suppress conducted EMI on power and signal lines.</dd>
<dt>L-filter / π-filter / T-filter</dt><dd>Common filter topologies using ferrite beads and capacitors. L = one bead + one cap. π = cap + bead + cap. T = bead + cap + bead.</dd>
</dl>`,
    },
    {
      id: 'faq',
      title: 'FAQ',
      keywords: 'faq why marginal fail resonance amplification current exceeds rated workaround',
      html: `<h2>Frequently Asked Questions</h2>
<h3>Why does the optimizer show MARGINAL even though the datasheet says 600 Ω at 100 MHz?</h3>
<p>The datasheet impedance is measured at 0 A DC bias. In your circuit, the DC current degrades the impedance substantially. The optimizer applies a derating model to show the real-world effective impedance at your operating current. Check the DC Bias Derating chart to see how much impedance is retained at your supply current.</p>
<h3>My target is 100 MHz, but the resonance chart shows a peak at 95 MHz — is that bad?</h3>
<p>Yes, this is potentially serious. A resonance peak near your target noise frequency means the filter could amplify that noise instead of attenuating it. Add damping: place a 10–47 µF polymer capacitor in parallel with the output MLCC. The higher ESR of the polymer cap damps the Q of the LC tank. Then re-run the optimizer with a different load capacitance.</p>
<h3>The tool says "rated current exceeded" but I need 1.5A through the bead — what do I do?</h3>
<p>Options: (1) choose a larger package (0805 or 1206 beads are rated to 3–8A), (2) use two beads in parallel (doubles the current rating, halves the impedance — trade-off for the filter response), (3) switch to a power inductor if attenuation is still adequate at lower Z.</p>
<h3>Why is the real-circuit insertion loss so much lower than the datasheet value?</h3>
<p>Datasheet S21 insertion loss is measured with 50 Ω source and 50 Ω load. In a real power circuit, the source impedance is &lt; 1 Ω (regulator output) and the load is the capacitor (also very low impedance). The transfer function H(jω) = Z_load / (Z_load + Z_bead) gives much less attenuation in this impedance environment. This is normal and expected — design to the real-circuit calculation, not the datasheet value.</p>
<h3>Which package should I choose?</h3>
<p>0402: up to ~200 mA, signal lines, constrained board space. 0603: up to ~1A, general power rails. 0805: up to ~3A, main supply rails. 1206: up to ~8A, high-current power domains. Larger packages generally have lower R<sub>DC</sub> but reduced peak impedance relative to size.</p>`,
    },
  ];

  /* ── Help panel controller ─────────────────────────────────────────────── */
  const dialog = $('help-dialog');
  const nav = $('help-nav');
  const content = $('help-content');
  const search = $('help-search');

  let active = 'getting-started';
  let lastFocus = null;

  function renderNav(filter) {
    const q = (filter || '').trim().toLowerCase();
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
      : '<div class="help-no-results">No matching topics.</div>';
    $('help-search-status').textContent = q
      ? `${matches.length} topic${matches.length === 1 ? '' : 's'} found`
      : '';
    if (q && matches.length && !matches.some(t => t.id === active)) showTopic(matches[0].id, false);
  }

  function showTopic(id, focus) {
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

  /* ── Guided tour ──────────────────────────────────────────────────────── */
  const tour = [
    {
      selector: '.fb-hero',
      title: 'Welcome to Ferrite Bead Optimizer',
      text: 'This guided tour covers the complete optimization workflow. You can restart at any time from Help.',
    },
    {
      selector: '#tour-params',
      title: '01 — Application Parameters',
      text: 'Set your target noise frequency, supply current, voltage drop budget, and required attenuation. These define what the optimizer is solving for.',
    },
    {
      selector: '#tour-bead',
      title: '02 — Bead Selection',
      text: 'Select a ferrite bead from the database or click Auto-select to let the optimizer choose. You can also enter custom specifications directly.',
    },
    {
      selector: '#tour-topology',
      title: '03 — Filter Topology',
      text: 'Choose your filter configuration. The π-filter provides the most attenuation; the L-filter is the simplest. The topology comparison chart shows the difference.',
    },
    {
      selector: '#tour-results',
      title: '04 — Optimization Summary',
      text: 'After running, this panel shows the key metrics: impedance at target frequency, insertion loss, voltage drop, and derating — plus an impedance vs frequency chart.',
    },
    {
      selector: '#tour-il-chart',
      title: 'Insertion Loss vs Frequency',
      text: 'Shows how much attenuation your filter provides across the frequency range. The amber dashed line marks your target attenuation level.',
    },
    {
      selector: '#tour-derating',
      title: 'DC Bias Derating',
      text: 'Shows how the bead impedance degrades with DC current. The red dot marks your operating point. This is often the most important chart for power rail applications.',
    },
    {
      selector: '#tour-export',
      title: 'Reports & Export',
      text: 'Export results to CSV, JSON, or print a formatted report. Save configurations for reuse. Keyboard: Ctrl+Enter to run, Ctrl+S to save config.',
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
    localStorage.setItem('fb_help_tour_complete', '1');
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

  /* ── Keyboard navigation ──────────────────────────────────────────────── */
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
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
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

  /* ── Init ─────────────────────────────────────────────────────────────── */
  renderNav();
  showTopic(active, false);
  if (!localStorage.getItem('fb_help_tour_complete')) setTimeout(startTour, 1500);
})();
