/**
 * ESD Protection Analyzer — Help System & Guided Tour
 * Adapted from PDN Optimizer help.js architecture.
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
      keywords: 'quick start beginner workflow first analysis upload',
      html: `<h2>Getting Started</h2>
<p>Complete an ESD analysis in about 2–5 minutes:</p>
<ol>
  <li>Upload a schematic PDF using the drag-and-drop zone or file picker.</li>
  <li>Select your target ESD standard and severity level (default: IEC 61000-4-2 Level 4).</li>
  <li>Set the default VDD rail voltage for your design.</li>
  <li>Click <strong>Run ESD Analysis</strong> — the tool extracts text, identifies signals, and recommends protection.</li>
  <li>Review the results table, TVS device cards, and layout guidelines.</li>
  <li>Export the results to CSV or JSON for use in your design review.</li>
</ol>
<div class="help-callout"><strong>Tip:</strong> The tool works best with schematics that have embedded text layers. Scanned images or image-only PDFs will not yield meaningful results — use the Altium, KiCad, or OrCAD PDF export with text enabled.</div>`,
    },
    {
      id: 'upload',
      title: 'Upload & PDF Extraction',
      keywords: 'upload PDF drag drop text extraction pages characters schematic',
      html: `<h2>Upload & PDF Extraction</h2>
<h3>Supported files</h3>
<p>The tool accepts PDF files up to 50 MB. The PDF must contain a text layer — not a rasterized/scanned image. Most EDA tools (Altium Designer, KiCad, OrCAD Capture) can export PDFs with text layers preserved.</p>
<h3>How text extraction works</h3>
<p>The tool uses PDF.js (Mozilla) to extract text content page by page. Net names, component designators, and signal labels are parsed from the raw text. EDA-specific noise (net pointers, license headers, internal IDs) is filtered before pattern matching.</p>
<h3>Extracted text preview</h3>
<p>After extraction, a preview shows the first 3,000 characters. Download the full extracted text (.txt) to verify the content is readable before interpreting results.</p>
<div class="help-callout warning"><strong>If results are empty:</strong> The PDF likely contains a rasterized schematic. Check by opening it in Adobe Reader — if you cannot select text, the PDF has no text layer. Use the "Print to PDF" or "Export to PDF" function from your EDA tool instead.</div>`,
    },
    {
      id: 'options',
      title: 'Analysis Options',
      keywords: 'standard level IEC ISO JEDEC voltage include internal signals options settings',
      html: `<h2>Analysis Options</h2>
<table><thead><tr><th>Option</th><th>Choices</th><th>Effect</th></tr></thead>
<tbody>
<tr><td>ESD test standard</td><td>IEC 61000-4-2, ISO 10605, JEDEC JS-001, IEC 61000-4-5</td><td>Determines the recommended TVS device ratings and surge requirements shown in the results table.</td></tr>
<tr><td>Severity level</td><td>Level 2 (±2kV), Level 3 (±4kV), Level 4 (±8kV)</td><td>IEC 61000-4-2 contact discharge level. Level 4 is the most stringent and is recommended for consumer electronics with user-accessible connectors.</td></tr>
<tr><td>Default VDD rail</td><td>0.9V – 48V</td><td>Used as the working voltage baseline when a signal's rail cannot be inferred from the net name. Common values: 1.8V (low-power), 3.3V (digital IO), 5.0V (USB/legacy).</td></tr>
<tr><td>Include internal signals</td><td>No / Yes</td><td>When set to Yes, the tool also reports signals that are typically internal (QSPI, FMC, SDRAM) but may need protection if routed to external connectors or test points.</td></tr>
</tbody></table>`,
    },
    {
      id: 'results',
      title: 'Interpreting Results',
      keywords: 'results table signals TVS categories status stats pages found',
      html: `<h2>Interpreting Results</h2>
<h3>Summary statistics</h3>
<p><strong>Signals found</strong> — total unique signal groups detected. Each group may contain multiple net names sharing the same interface pattern (e.g., UART1_TX / UART2_TX).</p>
<p><strong>TVS devices</strong> — unique recommended protection devices. Multiple signals may share one TVS array.</p>
<p><strong>High-speed</strong> — signals in the high-speed category (> 10 MHz or > 100 Mbps). These require the most careful TVS selection to avoid signal integrity degradation.</p>
<h3>Signal categories</h3>
<table><thead><tr><th>Category</th><th>Examples</th><th>Priority</th></tr></thead>
<tbody>
<tr><td>Power</td><td>VBUS, 5V_USB</td><td>High — hot-plug transients</td></tr>
<tr><td>High-Speed</td><td>USB HS, Ethernet, HDMI, DCMI</td><td>High — both ESD and signal integrity</td></tr>
<tr><td>Low-Speed</td><td>UART, I2C, SPI, CAN, SWD</td><td>Medium — external connectors</td></tr>
<tr><td>Analog/RF</td><td>Audio SAI, RF antenna, S/PDIF</td><td>High — noise sensitive</td></tr>
<tr><td>User I/F</td><td>Push buttons, reset, touchscreen</td><td>High — direct human contact</td></tr>
</tbody></table>
<div class="help-callout">The tool identifies signals by net name patterns. Signals with custom or non-standard net names will not be detected. Always supplement automated analysis with a manual design review.</div>`,
    },
    {
      id: 'tvs-devices',
      title: 'TVS Device Selection',
      keywords: 'TVS diode VRWM VCLAMP cline capacitance ipp current device selection recommend',
      html: `<h2>TVS Device Selection</h2>
<h3>Key parameters</h3>
<table><thead><tr><th>Parameter</th><th>Symbol</th><th>Selection criterion</th></tr></thead>
<tbody>
<tr><td>Reverse working voltage</td><td>V<sub>RWM</sub></td><td>Must exceed the signal's maximum DC operating voltage. Too low → false triggering in normal operation.</td></tr>
<tr><td>Clamping voltage</td><td>V<sub>CLAMP</sub></td><td>Must be below the IC's V<sub>ABS MAX</sub> at the actual ESD current. Check at the peak IEC current (16 A at 8 kV), not the 1 mA test point.</td></tr>
<tr><td>Line capacitance</td><td>C<sub>LINE</sub></td><td>Must fit within the signal integrity budget. For USB 2.0 HS: &lt; 1 pF. For USB 3.x: &lt; 0.1 pF. For Ethernet: &lt; 5 pF.</td></tr>
<tr><td>Peak pulse current</td><td>I<sub>PP</sub></td><td>Must exceed the peak ESD discharge current. At IEC Level 4 (8 kV), the peak is approximately 16 A (contact discharge).</td></tr>
</tbody></table>
<h3>Common devices</h3>
<table><thead><tr><th>Part</th><th>Best for</th><th>C_LINE</th></tr></thead>
<tbody>
<tr><td>USBLC6-2SC6</td><td>USB 2.0 HS D+/D−</td><td>0.5 pF</td></tr>
<tr><td>ESD008-P2-02VH</td><td>USB 3.x, PCIe</td><td>0.08 pF</td></tr>
<tr><td>TPD4E004</td><td>HDMI TMDS</td><td>0.15 pF</td></tr>
<tr><td>ESDA6V1BC6</td><td>Ethernet, I2C, SD</td><td>3.5 pF</td></tr>
<tr><td>PESD0402</td><td>RF antenna</td><td>0.08 pF</td></tr>
<tr><td>PESD2CAN</td><td>CAN bus</td><td>5 pF</td></tr>
<tr><td>SM712</td><td>RS-485/422</td><td>50 pF</td></tr>
<tr><td>SMBJ5.0A</td><td>Power lines only</td><td>350 pF</td></tr>
</tbody></table>`,
    },
    {
      id: 'charts',
      title: 'Charts',
      keywords: 'chart waveform IEC clamping voltage current capacitance data rate plotly',
      html: `<h2>Charts</h2>
<h3>ESD Clamping Waveform</h3>
<p>Shows a model of the IEC 61000-4-2 ESD discharge current pulse (amber) and the resulting clamped voltage across the TVS device (blue) over time (0–120 ns).</p>
<ul>
  <li>The current peak occurs at approximately 1 ns (contact discharge).</li>
  <li>The clamping voltage rises rapidly with current, reaching V<sub>CLAMP</sub> at the peak.</li>
  <li>The device shown corresponds to the first TVS recommended for the analysed signals.</li>
</ul>
<h3>Capacitance vs Data Rate</h3>
<p>A log-log scatter chart showing each recommended TVS device's C<sub>LINE</sub> plotted against the maximum data rate where it is suitable. The red dashed line is the maximum capacitance budget at each data rate tier.</p>
<p>Devices plotted to the right and below the limit line are appropriate for the corresponding data rate.</p>
<div class="help-callout">Charts require an internet connection to load Plotly.js from CDN. The results table and export functions work without Plotly.</div>`,
    },
    {
      id: 'layout',
      title: 'PCB Layout Guidelines',
      keywords:
        'layout PCB placement routing connector ground return trace TVS parasitic multi-stage',
      html: `<h2>PCB Layout Guidelines</h2>
<h3>Golden rules for ESD layout</h3>
<ol>
  <li><strong>TVS first:</strong> Place the TVS as the very first component after the connector — before any trace branches or other components.</li>
  <li><strong>Short traces:</strong> The trace from the connector pin to the TVS should be &lt; 5 mm. Every mm of trace adds ~1 nH inductance, which raises the effective clamping voltage.</li>
  <li><strong>Low-inductance ground:</strong> Connect the TVS cathode to the nearest ground plane with &ge; 2 vias. The ground return path inductance is often more important than the signal path inductance.</li>
  <li><strong>No branches before TVS:</strong> Routing the signal to the IC before the TVS bypasses the protection entirely. Use the topology: Connector → TVS → IC.</li>
  <li><strong>Differential pair symmetry:</strong> Maintain geometric symmetry through TVS arrays on differential pairs to preserve common-mode rejection.</li>
</ol>
<div class="help-callout warning"><strong>Critical mistake:</strong> Placing TVS on the back of the PCB, far from the connector, is one of the most common ESD layout errors. The TVS must be on the same layer as the connector, as close as physically possible.</div>`,
    },
    {
      id: 'reports',
      title: 'Reports & Export',
      keywords: 'export CSV JSON print report save load config',
      html: `<h2>Reports & Export</h2>
<table><thead><tr><th>Button</th><th>Action</th><th>Format</th></tr></thead>
<tbody>
<tr><td>Export CSV</td><td>Downloads all detected signals with full parameter columns.</td><td>CSV (Excel-compatible)</td></tr>
<tr><td>Export JSON</td><td>Full report including signals, summary, and analysis options.</td><td>JSON</td></tr>
<tr><td>Save config</td><td>Saves the current options (standard, level, VDD) for reuse.</td><td>JSON config file</td></tr>
<tr><td>Load config</td><td>Restores previously saved analysis options.</td><td>JSON config file</td></tr>
<tr><td>Print report</td><td>Opens the browser print dialog with a print-optimized layout.</td><td>Browser PDF / paper</td></tr>
</tbody></table>
<h3>Keyboard shortcuts</h3>
<table><tbody>
<tr><th>Ctrl+Enter</th><td>Run analysis (when file is loaded)</td></tr>
<tr><th>Ctrl+S</th><td>Save configuration</td></tr>
<tr><th>Ctrl+P</th><td>Print report</td></tr>
<tr><th>Esc</th><td>Close Help or end tour</td></tr>
<tr><th>F1</th><td>Open Help</td></tr>
</tbody></table>`,
    },
    {
      id: 'standards',
      title: 'ESD Standards Reference',
      keywords: 'IEC 61000-4-2 ISO 10605 JEDEC HBM CDM standards test levels contact air',
      html: `<h2>ESD Standards Reference</h2>
<table><thead><tr><th>Standard</th><th>Model</th><th>Application</th><th>Peak voltage</th></tr></thead>
<tbody>
<tr><td>IEC 61000-4-2</td><td>Human Body (HBM, system-level)</td><td>Consumer, industrial electronics</td><td>±8 kV contact (Level 4), ±15 kV air</td></tr>
<tr><td>ISO 10605</td><td>Human Body (system-level, automotive)</td><td>Automotive ECU testing</td><td>±25 kV contact, ±25 kV air</td></tr>
<tr><td>JEDEC JS-001</td><td>Human Body Model (component-level)</td><td>Semiconductor device qualification</td><td>Up to ±8 kV</td></tr>
<tr><td>JEDEC JS-002</td><td>Charged Device Model (CDM)</td><td>Component handling / assembly</td><td>250V–1000V</td></tr>
<tr><td>IEC 61000-4-5</td><td>Surge / Lightning</td><td>AC mains, long cable runs</td><td>±2 kV line-to-line, ±4 kV line-to-earth</td></tr>
<tr><td>ISO 7637-2</td><td>Automotive transient</td><td>12V/24V vehicle power systems</td><td>Various waveforms (P1–P5)</td></tr>
</tbody></table>`,
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      keywords: 'faq why no signals found scanned PDF internal different net names',
      html: `<h2>Frequently Asked Questions</h2>
<h3>Why were no signals found?</h3>
<p>The most common reason is a scanned (rasterized) PDF with no text layer. Use the EDA tool's native PDF export — not a printer scan. Open the PDF in Adobe Reader and check if you can highlight text. If not, the PDF cannot be analysed by this tool.</p>
<h3>My nets have custom names — will they be detected?</h3>
<p>The tool matches against a database of standard EDA net naming conventions. Custom names like "GPIO_EXT_1" or "J3_PIN4" will not be matched. For best results, follow standard naming conventions in your EDA project (USB_DP, ETH_RMII_TX, CAN_H, etc.).</p>
<h3>Can I add my own signal patterns?</h3>
<p>The signal database is in <code>js/esd-calculations.js</code>. You can add entries to the <code>ESD_SIGNALS</code> array following the same structure.</p>
<h3>The tool recommended a device I can't source. What should I do?</h3>
<p>Use the recommended part as a specification: look for alternatives with the same V<sub>RWM</sub>, lower V<sub>CLAMP</sub>, and C<sub>LINE</sub> within the budget. Nexperia, Vishay, TI, Littelfuse, and ON Semi all make equivalent devices with cross-reference tables.</p>
<h3>Does the analysis cover IEC 61000-4-5 surge?</h3>
<p>Yes — signals like CAN, RS-485, and Ethernet are tagged with their surge requirements. The tool recommends devices with appropriate surge ratings. For full IEC 61000-4-5 compliance, a second-stage TVS with a GDT or MOV primary stage is typically required.</p>`,
    },
    {
      id: 'glossary',
      title: 'Glossary',
      keywords: 'definitions ESD TVS HBM CDM VRWM VCLAMP cline ipp GDT MOV TLP',
      html: `<h2>Glossary</h2>
<dl>
<dt>ESD</dt><dd>Electrostatic Discharge — rapid transfer of charge between objects at different potentials. Can damage or destroy IC gate oxides.</dd>
<dt>TVS</dt><dd>Transient Voltage Suppressor — a diode or diode array that clamps voltage spikes to a safe level within nanoseconds.</dd>
<dt>V<sub>RWM</sub></dt><dd>Reverse Working Voltage — the maximum continuous reverse voltage the TVS can sustain without conducting. Must exceed signal operating voltage.</dd>
<dt>V<sub>CLAMP</sub></dt><dd>Clamping Voltage — the voltage across the TVS at the specified peak pulse current. This is what the protected IC sees during an ESD event.</dd>
<dt>C<sub>LINE</sub></dt><dd>Line Capacitance — parasitic capacitance of the TVS device. Must be within the signal integrity budget of the interface being protected.</dd>
<dt>I<sub>PP</sub></dt><dd>Peak Pulse Current — maximum surge current the TVS can handle without damage (8×20 µs waveform for surge, IEC 61000-4-2 for ESD).</dd>
<dt>HBM</dt><dd>Human Body Model — ESD discharge model simulating a person touching the device. Characterized by ~100 pF capacitor discharged through ~1.5 kΩ resistance.</dd>
<dt>CDM</dt><dd>Charged Device Model — ESD model for charged IC packages discharging through pins during handling.</dd>
<dt>GDT</dt><dd>Gas Discharge Tube — primary surge protection device for high-energy surges (lightning). High trigger voltage (~300V), excellent surge capacity.</dd>
<dt>MOV</dt><dd>Metal Oxide Varistor — voltage-dependent resistor used as primary surge protection. High capacitance, not suitable for high-speed signals.</dd>
<dt>TLP</dt><dd>Transmission Line Pulse — characterization method for ESD devices that reveals the device's behavior at realistic ESD pulse rise times and currents.</dd>
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
      selector: '.esd-hero',
      title: 'Welcome to ESD Protection Analyzer',
      text: 'This guided tour covers the complete ESD analysis workflow. You can restart at any time from Help.',
    },
    {
      selector: '#tour-upload',
      title: '01 — Upload your schematic',
      text: 'Drag and drop a schematic PDF here, or click to browse. The tool extracts text using PDF.js and filters out EDA noise before pattern matching.',
    },
    {
      selector: '#tour-options',
      title: '02 — Configure analysis options',
      text: 'Select the ESD test standard (IEC 61000-4-2 for consumer electronics) and severity level. Level 4 (±8 kV contact) is the most stringent.',
    },
    {
      selector: '#tour-results',
      title: '03 — Analysis summary',
      text: 'After analysis, this panel shows signal counts, TVS device count, and an IEC 61000-4-2 clamping waveform for the primary recommended TVS.',
    },
    {
      selector: '#tour-tvs-chart',
      title: 'Capacitance vs Data Rate',
      text: 'This chart plots the recommended TVS devices against the capacitance budget for each data rate tier. Devices must fall below the red limit line.',
    },
    {
      selector: '#tour-export',
      title: 'Export and reports',
      text: 'Export results as CSV (for spreadsheets), JSON (for full data), or print a formatted report. Save and load configurations for repeated analysis.',
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
    localStorage.setItem('esd_help_tour_complete', '1');
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
  if (!localStorage.getItem('esd_help_tour_complete')) setTimeout(startTour, 1200);
})();
