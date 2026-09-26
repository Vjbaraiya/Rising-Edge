/**
 * help.js — Rising Edge IBIS-Studio
 * Help center: searchable keyword reference, workflow guides, cheat sheets.
 *
 * Exports global: HelpCenter
 */

const HelpCenter = (function () {
  'use strict';

  /* ─── Content database ───────────────────────────────────────────── */
  const HELP_TOPICS = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      tags: ['start', 'begin', 'upload', 'open', 'load'],
      content: `
        <h3>Getting Started with IBIS-Studio</h3>
        <p>IBIS-Studio is a browser-based tool for reading, analyzing, creating, and validating IBIS models.
        No installation required — everything runs in your browser.</p>
        <h4>Step 1 — Load an IBIS file</h4>
        <p>Navigate to <strong>Read &amp; Analyze</strong> and either drag an <code>.ibs</code> file
        into the upload zone, or click the zone to browse your filesystem. You can also click
        <strong>Load Sample</strong> to try one of the built-in example files.</p>
        <h4>Step 2 — Review the analysis</h4>
        <p>After loading, the dashboard populates with: component summary, pin count, model list,
        I(V) charts, waveform plots, and quality scores.</p>
        <h4>Step 3 — Validate</h4>
        <p>Switch to <strong>Validation Center</strong> to see detailed IBIS compliance checks with
        explanations and severity ratings for any issues found.</p>
        <h4>Step 4 — Create your own model</h4>
        <p>Use <strong>Create New IBIS Model</strong> to build a model from scratch using the guided
        form, then refine it in the Monaco editor with IBIS syntax highlighting.</p>`,
    },
    {
      id: 'keywords',
      title: 'IBIS Keyword Reference',
      icon: '📖',
      tags: ['keyword', 'syntax', 'reference', 'ibis ver', 'component', 'model', 'pin', 'package'],
      content: `
        <h3>IBIS Keyword Reference</h3>
        <div class="help-keyword-grid">
          ${[
            ['[IBIS Ver]', 'Mandatory. Specifies the IBIS specification version (e.g., 7.0).'],
            ['[File Name]', 'Name of this IBIS file as distributed.'],
            ['[File Rev]', 'Revision number of this file (string).'],
            ['[Date]', 'Date this file was created or last modified.'],
            ['[Source]', 'Origin of the data (company, lab, tool).'],
            ['[Notes]', 'Free-form notes about this file.'],
            ['[Disclaimer]', 'Legal disclaimer text.'],
            ['[Copyright]', 'Copyright notice.'],
            ['[Component]', 'Starts a component block. Name follows on same line.'],
            ['[Manufacturer]', 'IC manufacturer name. Can appear at file or component level.'],
            ['[Package]', 'Package parasitic sub-block: R_pkg, L_pkg, C_pkg (typ/min/max).'],
            ['[Pin]', 'Pin list: pin number, signal name, model name, optional R/L/C_pin.'],
            [
              '[Diff Pin]',
              'Maps differential pin pairs: positive pin, negative pin, Vdiff, Tdelay.',
            ],
            ['[Model Selector]', 'Maps a model selector name to multiple model alternatives.'],
            ['[Model]', 'Starts a model block. Contains all electrical parameters.'],
            ['Model_type', 'Buffer type: Input, Output, I/O, 3-state, Open_drain, etc.'],
            ['[Voltage Range]', 'Nominal supply voltage: typ, min, max (in Volts).'],
            ['[Temperature Range]', 'Operating temperature corners: typ, min, max (°C).'],
            ['[Pullup Reference]', 'Reference voltage for Pullup I(V) table (defaults to Vdd).'],
            [
              '[Pulldown Reference]',
              'Reference voltage for Pulldown I(V) table (defaults to GND).',
            ],
            ['[Power Clamp Reference]', 'Reference for Power Clamp table.'],
            ['[GND Clamp Reference]', 'Reference for GND Clamp table.'],
            ['[C_comp]', 'Total pin capacitance: typ, min, max (Farads).'],
            ['[Pullup]', 'I(V) table for PMOS pullup transistor. V relative to Vdd.'],
            ['[Pulldown]', 'I(V) table for NMOS pulldown transistor. V absolute.'],
            ['[Power Clamp]', 'I(V) table for power-rail ESD/clamp diode.'],
            ['[GND Clamp]', 'I(V) table for ground-rail ESD/clamp diode.'],
            ['[Ramp]', 'Simplified rise/fall: dV/dt_r, dV/dt_f (in V/s), R_load.'],
            ['[Rising Waveform]', 'Time-domain rising edge data. Fixture conditions + V(t) table.'],
            [
              '[Falling Waveform]',
              'Time-domain falling edge data. Fixture conditions + V(t) table.',
            ],
            ['[End]', 'Mandatory. Marks end of file (or component/model in some usages).'],
          ]
            .map(
              ([kw, desc]) => `
            <div class="help-kw-row">
              <code class="help-kw">${kw}</code>
              <span class="help-kw-desc">${desc}</span>
            </div>`
            )
            .join('')}
        </div>`,
    },
    {
      id: 'model-types',
      title: 'Model Type Reference',
      icon: '🔌',
      tags: ['model type', 'input', 'output', 'io', '3-state', 'open drain', 'ecl', 'series'],
      content: `
        <h3>Model Type Reference</h3>
        <table class="help-table">
          <thead><tr><th>Model_type</th><th>Use case</th><th>Required sections</th></tr></thead>
          <tbody>
            <tr><td>Input</td><td>Pure receiver (no drive)</td><td>GND Clamp, Pwr Clamp</td></tr>
            <tr><td>Output</td><td>Pure driver</td><td>Pullup, Pulldown, Ramp or Waveforms</td></tr>
            <tr><td>I/O</td><td>Bidirectional</td><td>All I(V) tables + Ramp/Waveforms</td></tr>
            <tr><td>3-state</td><td>Output with OE enable</td><td>Pullup, Pulldown, Ramp</td></tr>
            <tr><td>Open_drain</td><td>Open-drain output</td><td>Pulldown, GND Clamp</td></tr>
            <tr><td>Open_source</td><td>Open-source output</td><td>Pullup, Pwr Clamp</td></tr>
            <tr><td>Open_sink</td><td>Alias for Open_drain</td><td>Pulldown</td></tr>
            <tr><td>Input_ECL</td><td>Differential/ECL receiver</td><td>Clamps</td></tr>
            <tr><td>Output_ECL</td><td>Differential/ECL driver</td><td>Pullup, Pulldown</td></tr>
            <tr><td>Terminator</td><td>On-die termination</td><td>Pwr/GND Clamp</td></tr>
            <tr><td>Series</td><td>Series element</td><td>[Series Current] or [Series MOSFET]</td></tr>
            <tr><td>Series_switch</td><td>Series switch element</td><td>[Series Current]</td></tr>
          </tbody>
        </table>`,
    },
    {
      id: 'validation-rules',
      title: 'Validation Rules',
      icon: '✓',
      tags: ['validate', 'check', 'error', 'warning', 'rule', 'quality', 'score'],
      content: `
        <h3>Validation Rules</h3>
        <p>IBIS-Studio runs 19 automated checks organized into categories:</p>
        <h4>File Header (R001–R003, R016)</h4>
        <p>Checks that mandatory file-level keywords are present and that the IBIS version is modern (≥3.2).</p>
        <h4>Component (R004)</h4>
        <p>Verifies that at least one [Component] block exists in the file.</p>
        <h4>Pins (R005, R006, R019)</h4>
        <p>Checks that pins are defined, that all pins reference models that exist, and that
        differential pin pairs reference valid pin numbers.</p>
        <h4>Models (R007–R009, R015)</h4>
        <p>Verifies model count, Model_type completeness, Voltage_range presence, and C_comp.</p>
        <h4>I(V) Tables (R010, R011, R018)</h4>
        <p>Checks that output models have Pullup/Pulldown tables, that clamp tables exist,
        and that tables have at least 2 data points each.</p>
        <h4>Waveforms (R012, R013, R017)</h4>
        <p>Validates presence of waveform and/or ramp data, and checks for monotonic time axes.</p>
        <h4>Package (R014)</h4>
        <p>Verifies that R/L/C package parasitics are defined.</p>
        <h4>Scoring</h4>
        <p>Each rule has a weight. PASS = full weight, WARN = 50%, INFO = 80%, ERROR = 0.
        The overall score is a weighted percentage.</p>`,
    },
    {
      id: 'export',
      title: 'Export & Reports',
      icon: '📤',
      tags: ['export', 'download', 'pdf', 'word', 'markdown', 'html', 'report'],
      content: `
        <h3>Export Options</h3>
        <h4>IBIS file (.ibs)</h4>
        <p>Export the model created in the Generator as a valid <code>.ibs</code> file,
        ready to distribute or import into EDA tools.</p>
        <h4>Markdown report (.md)</h4>
        <p>A structured analysis report with summary table, model list, and issues — formatted
        as Markdown for easy sharing and version control. Runs entirely in the browser.</p>
        <h4>HTML report (.html)</h4>
        <p>A self-contained HTML page with styled tables and styling. No external dependencies.
        Runs entirely in the browser.</p>
        <h4>PDF report (requires backend)</h4>
        <p>Professional PDF with charts, generated by the Python FastAPI backend using ReportLab.</p>
        <h4>Word document (requires backend)</h4>
        <p>Formatted Word document generated by the Python backend using python-docx.</p>
        <div class="help-callout">
          <strong>Backend setup:</strong> Install the Python backend (see <code>backend/requirements.txt</code>)
          and run <code>uvicorn main:app --reload</code> from the <code>backend/</code> directory.
        </div>`,
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      icon: '❓',
      tags: ['faq', 'question', 'help', 'problem', 'issue', 'error'],
      content: `
        <h3>FAQ</h3>
        <h4>Why does my file show 0 models after loading?</h4>
        <p>Check that your <code>.ibs</code> file contains a <code>[Model]</code> block. If models are
        in a separate file, the sub-file must also be loaded. IBIS-Studio parses single-file IBIS files;
        multi-file IBIS packages require backend support.</p>
        <h4>The waveform charts are empty — why?</h4>
        <p>Your IBIS file uses only <code>[Ramp]</code> data, not <code>[Rising/Falling Waveform]</code>
        tables. Many older IBIS files only include ramp data. This is valid IBIS but limits simulation
        accuracy.</p>
        <h4>What does "NA" mean in an I(V) table?</h4>
        <p><code>NA</code> means "Not Available" — the min or max value was not characterized.
        IBIS tools typically substitute the typical value. IBIS-Studio treats NA as NaN and
        omits that corner from charts.</p>
        <h4>Can I use IBIS-Studio models directly in HyperLynx / SIwave?</h4>
        <p>Yes. The <code>.ibs</code> files generated by IBIS-Studio follow the IBIS 7.0 specification
        and can be loaded by any IBIS-compliant EDA tool.</p>
        <h4>Why does the quality score penalize missing clamp tables?</h4>
        <p>Clamp tables model ESD protection diodes that conduct during overshoot/undershoot.
        Without them, simulators cannot accurately predict ringing behavior and may underestimate
        peak voltages at receivers.</p>
        <h4>How do I report a bug or request a feature?</h4>
        <p>Open an issue on the Rising Edge GitHub repository or contact the team via the
        Contact page on the Rising Edge website.</p>`,
    },
  ];

  /* -- Stub-container content, keyed by real HTML topic id -- */
  /* Keyword grid content reused from the "keywords" HELP_TOPICS entry
     (rendered into #help-keywords-az on the real "keywords-ref" topic). */
  const KEYWORDS_TOPIC = HELP_TOPICS.find(t => t.id === 'keywords');
  const KEYWORDS_AZ_HTML = KEYWORDS_TOPIC
    ? KEYWORDS_TOPIC.content.replace(
        /^[\s\S]*?<div class="help-keyword-grid">/,
        '<div class="help-keyword-grid">'
      )
    : '';

  /* FAQ list reused from the "faq" HELP_TOPICS entry, split into items
     for #help-faq-list on the real "faq" topic. */
  const FAQ_ITEMS = [
    [
      'Why does my file show 0 models after loading?',
      'Check that your <code>.ibs</code> file contains a <code>[Model]</code> block. If models are in a separate file, the sub-file must also be loaded. IBIS-Studio parses single-file IBIS files; multi-file IBIS packages require backend support.',
    ],
    [
      'The waveform charts are empty — why?',
      'Your IBIS file uses only <code>[Ramp]</code> data, not <code>[Rising/Falling Waveform]</code> tables. Many older IBIS files only include ramp data. This is valid IBIS but limits simulation accuracy.',
    ],
    [
      'What does "NA" mean in an I(V) table?',
      '<code>NA</code> means "Not Available" — the min or max value was not characterized. IBIS tools typically substitute the typical value. IBIS-Studio treats NA as NaN and omits that corner from charts.',
    ],
    [
      'Can I use IBIS-Studio models directly in HyperLynx / SIwave?',
      'Yes. The <code>.ibs</code> files generated by IBIS-Studio follow the IBIS 7.0 specification and can be loaded by any IBIS-compliant EDA tool.',
    ],
    [
      'Why does the quality score penalize missing clamp tables?',
      'Clamp tables model ESD protection diodes that conduct during overshoot/undershoot. Without them, simulators cannot accurately predict ringing behavior and may underestimate peak voltages at receivers.',
    ],
    [
      'How do I report a bug or request a feature?',
      'Open an issue on the Rising Edge GitHub repository or contact the team via the Contact page on the Rising Edge website.',
    ],
  ];

  /* Common errors list for #help-error-list on the real "errors" topic. */
  const ERROR_ITEMS = [
    [
      'Missing [IBIS Ver] keyword',
      'Every IBIS file must start with an [IBIS Ver] line. Add it as the first keyword in the file.',
    ],
    [
      'No [Component] block found',
      'At least one [Component] section is required. Confirm the block header is spelled exactly as [Component].',
    ],
    [
      'No [Model] blocks found',
      'A component must reference at least one [Model]. Check that pin model names match a defined [Model] name.',
    ],
    [
      'Pin references missing model',
      'A [Pin] row names a model that has no matching [Model] block (or is misspelled). Model names are case-sensitive.',
    ],
    [
      'Non-monotonic waveform time axis',
      'Rising/Falling Waveform tables must have strictly increasing time values. Sort or de-duplicate rows with equal or decreasing time.',
    ],
    [
      'I(V) table with fewer than 2 points',
      'Pullup/Pulldown/Clamp tables need at least two rows to be usable by a simulator.',
    ],
    [
      'Missing Model_type',
      'Every [Model] block needs a Model_type line (Input, Output, I/O, 3-state, etc.) so simulators know how to treat it.',
    ],
  ];

  const BP_CONTENT_HTML = `
    <ul class="help-steps">
      <li>Always include both typ/min/max corners for I(V) and package data — single-corner data limits worst-case simulation.</li>
      <li>Prefer Rising/Falling Waveform tables over Ramp-only data when characterization data is available; waveforms give simulators much higher fidelity.</li>
      <li>Keep model and pin names consistent and descriptive — avoid duplicate model names across components.</li>
      <li>Always populate Power Clamp and GND Clamp tables for I/O and bidirectional buffers to capture ESD/overshoot behavior.</li>
      <li>Validate before distributing — run the Validation Center and resolve all errors, and review warnings for anything that affects your use case.</li>
      <li>Document assumptions in [Notes] and [Disclaimer] sections so downstream users understand extraction conditions.</li>
    </ul>`;

  const DEBUG_CONTENT_HTML = `
    <ol class="help-steps">
      <li>Start with the <strong>Validation Center</strong> — it flags the exact rule and section that failed, with a severity level.</li>
      <li>For parser errors, check the <strong>Raw Text</strong> tab in Read &amp; Analyze to confirm keyword spelling and block structure ([Component], [Model], [Pin], [End]).</li>
      <li>If charts are empty, confirm the model actually has data in that category (Pullup/Pulldown for I(V) charts, Rising/Falling Waveform for waveform charts).</li>
      <li>For pin-to-model mismatches, cross-check the [Pin] table's model column against the exact name used in each [Model] header.</li>
      <li>If scores seem low, expand each rule category in the Validation Center results list to see the specific message per rule.</li>
    </ol>`;

  const SIM_CONTENT_HTML = `
    <p>IBIS models are simulator-agnostic — once a file passes validation it can be loaded by any IBIS-compliant tool:</p>
    <ul class="help-steps">
      <li><strong>HyperLynx</strong> — import the .ibs file directly in the IBIS model browser; verify Model Selector entries resolve correctly.</li>
      <li><strong>Cadence Sigrity / SIwave</strong> — assign models per pin from the component's pin list; confirm package parasitics are included or supplied separately.</li>
      <li><strong>Keysight ADS</strong> — use the IbisModel component and point it at the .ibs file; check that Ramp or Waveform data matches your simulation type (transient vs. eye).</li>
      <li><strong>HSPICE</strong> — IBIS is converted internally; ensure the corner (typ/min/max) selected matches your analysis intent.</li>
    </ul>
    <p>Use the Validation Center's Compat gauge as a quick sanity check before handing a file to a simulator.</p>`;

  /* ─── State ──────────────────────────────────────────────────────── */
  let _wired = false;

  /* ─── Switch topic (real markup: .help-topic-btn[data-help] + #help-ID.help-section) */
  function switchTopic(id) {
    if (!id) return;
    document.querySelectorAll('.help-topic-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.help === id);
    });
    document.querySelectorAll('.help-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === 'help-' + id);
    });
  }

  /* ─── Populate stub containers once ─────────────────────────────── */
  function populateStubs() {
    _setHtml('help-keywords-az', KEYWORDS_AZ_HTML);

    _setHtml(
      'help-error-list',
      ERROR_ITEMS.map(
        ([title, desc]) => `
        <div class="help-error-item">
          <h4>${title}</h4>
          <p>${desc}</p>
        </div>`
      ).join('')
    );

    _setHtml(
      'help-faq-list',
      FAQ_ITEMS.map(
        ([q, a]) => `
        <div class="help-faq-item">
          <h4>${q}</h4>
          <p>${a}</p>
        </div>`
      ).join('')
    );

    _setHtml('help-bp-content', BP_CONTENT_HTML);
    _setHtml('help-debug-content', DEBUG_CONTENT_HTML);
    _setHtml('help-sim-guide-content', SIM_CONTENT_HTML);
  }

  function _setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* ─── Search ─────────────────────────────────────────────────────── */
  function search(query) {
    const q = (query || '').toLowerCase().trim();
    const btns = document.querySelectorAll('.help-topic-btn');
    if (!q) {
      btns.forEach(b => (b.style.display = ''));
      return;
    }

    let firstMatch = null;
    btns.forEach(btn => {
      const id = btn.dataset.help;
      const section = document.getElementById('help-' + id);
      const haystack = (btn.textContent + ' ' + (section ? section.textContent : '')).toLowerCase();
      const match = haystack.includes(q);
      btn.style.display = match ? '' : 'none';
      if (match && !firstMatch) firstMatch = id;
    });

    if (firstMatch) switchTopic(firstMatch);
  }

  /* ─── Wiring ─────────────────────────────────────────────────────── */
  function init() {
    if (_wired) return;
    _wired = true;

    populateStubs();

    document.querySelectorAll('.help-topic-btn[data-help]').forEach(btn => {
      btn.addEventListener('click', () => switchTopic(btn.dataset.help));
    });

    // Overview "cards" also link to a topic via data-help.
    document.querySelectorAll('.help-card[data-help]').forEach(card => {
      card.addEventListener('click', () => switchTopic(card.dataset.help));
    });

    const searchInput = document.getElementById('help-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => search(searchInput.value));
    }
  }

  /* ─── On view enter ───────────────────────────────────────────────── */
  function onViewEnter() {
    init();
  }

  /* ─── Cheat sheet downloads ──────────────────────────────────────── */
  // Same download pattern as app.js's exportMarkdown()/exportHTML(): build a
  // Blob client-side and trigger it via a temporary <a download>. No PDF
  // library is loaded in this tool, so we generate a styled standalone HTML
  // file instead — genuinely printable/shareable without a backend.

  function _downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function _cheatsheetShell(title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title} — IBIS-Studio Cheat Sheet</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; }
h1 { color: #4f46e5; } h2 { color: #3730a3; border-bottom: 2px solid #e0e0e0; padding-bottom: 6px; margin-top: 28px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #f0f0ff; }
code { background: #f0f0f5; padding: 1px 5px; border-radius: 4px; font-size: 0.92em; }
.foot { color: #888; font-size: 12px; margin-top: 30px; }
</style>
</head>
<body>
<h1>${title}</h1>
${bodyHtml}
<p class="foot">Generated by IBIS-Studio &mdash; Rising Edge &copy; ${new Date().getFullYear()}</p>
</body></html>`;
  }

  const KEYWORD_ROWS = [
    ['[IBIS Ver]', 'Mandatory. Specifies the IBIS specification version (e.g., 7.0).'],
    ['[File Name]', 'Name of this IBIS file as distributed.'],
    ['[File Rev]', 'Revision number of this file (string).'],
    ['[Date]', 'Date this file was created or last modified.'],
    ['[Source]', 'Origin of the data (company, lab, tool).'],
    ['[Notes]', 'Free-form notes about this file.'],
    ['[Disclaimer]', 'Legal disclaimer text.'],
    ['[Copyright]', 'Copyright notice.'],
    ['[Component]', 'Starts a component block. Name follows on same line.'],
    ['[Manufacturer]', 'IC manufacturer name. Can appear at file or component level.'],
    ['[Package]', 'Package parasitic sub-block: R_pkg, L_pkg, C_pkg (typ/min/max).'],
    ['[Pin]', 'Pin list: pin number, signal name, model name, optional R/L/C_pin.'],
    ['[Diff Pin]', 'Maps differential pin pairs: positive pin, negative pin, Vdiff, Tdelay.'],
    ['[Model Selector]', 'Maps a model selector name to multiple model alternatives.'],
    ['[Model]', 'Starts a model block. Contains all electrical parameters.'],
    ['Model_type', 'Buffer type: Input, Output, I/O, 3-state, Open_drain, etc.'],
    ['[Voltage Range]', 'Nominal supply voltage: typ, min, max (in Volts).'],
    ['[Temperature Range]', 'Operating temperature corners: typ, min, max (deg C).'],
    ['[Pullup Reference]', 'Reference voltage for Pullup I(V) table (defaults to Vdd).'],
    ['[Pulldown Reference]', 'Reference voltage for Pulldown I(V) table (defaults to GND).'],
    ['[Power Clamp Reference]', 'Reference for Power Clamp table.'],
    ['[GND Clamp Reference]', 'Reference for GND Clamp table.'],
    ['[C_comp]', 'Total pin capacitance: typ, min, max (Farads).'],
    ['[Pullup]', 'I(V) table for PMOS pullup transistor. V relative to Vdd.'],
    ['[Pulldown]', 'I(V) table for NMOS pulldown transistor. V absolute.'],
    ['[Power Clamp]', 'I(V) table for power-rail ESD/clamp diode.'],
    ['[GND Clamp]', 'I(V) table for ground-rail ESD/clamp diode.'],
    ['[Ramp]', 'Simplified rise/fall: dV/dt_r, dV/dt_f (in V/s), R_load.'],
    ['[Rising Waveform]', 'Time-domain rising edge data. Fixture conditions + V(t) table.'],
    ['[Falling Waveform]', 'Time-domain falling edge data. Fixture conditions + V(t) table.'],
    ['[End]', 'Mandatory. Marks end of file (or component/model in some usages).'],
  ];

  const SYNTAX_ROWS = [
    [
      'Keyword lines start with [ ]',
      'e.g. [Component] MY_IC — keyword in brackets, value follows on the same line.',
    ],
    [
      'Comments use |',
      'Everything after a pipe character on a line is a comment and is stripped by parsers.',
    ],
    [
      'NA means not characterized',
      '"NA" in a typ/min/max column means the corner was not measured; tools treat it as missing, not zero.',
    ],
    [
      'Column order in [Pin]',
      'pin_number  signal_name  model_name  [R_pin]  [L_pin]  [C_pin] — whitespace separated.',
    ],
    ['Corner order everywhere', 'Numeric triples are always typ  min  max, in that order.'],
    [
      '[Model] must end implicitly',
      'A model block runs until the next [Model], [Component], or [End] keyword — no explicit close keyword.',
    ],
    [
      'Case-sensitive model names',
      'Pin model_name entries must match a [Model] name exactly, including case.',
    ],
    [
      'Waveform time must increase',
      '[Rising Waveform]/[Falling Waveform] tables need strictly increasing time values in column 1.',
    ],
    [
      'Sub-parameters are indented data lines',
      'Lines like "R_pkg   0.1   0.08   0.12" inside a [Package]/[Model] block are data rows, not new keywords.',
    ],
    [
      'File must start with [IBIS Ver]',
      'This is the very first required keyword; a missing or misplaced [IBIS Ver] breaks most parsers.',
    ],
  ];

  const ERROR_ROWS = [
    ['R001 — IBIS Version present', 'Error', 'File is missing the mandatory [IBIS Ver] keyword.'],
    ['R002 — File name present', 'Warning', '[File Name] keyword is missing.'],
    [
      'R003 — Manufacturer present',
      'Warning',
      '[Manufacturer] is missing at file or component level.',
    ],
    ['R004 — At least one component', 'Error', 'No [Component] block found in the file.'],
    ['R005 — Component has pins', 'Error', 'The component has no [Pin] data.'],
    [
      'R006 — All pins reference existing model',
      'Warning',
      'A [Pin] row names a model_name with no matching [Model] block.',
    ],
    ['R007 — At least one model', 'Error', 'No [Model] blocks found for the component.'],
    [
      'R008 — Model_type set for each model',
      'Warning',
      'One or more [Model] blocks is missing Model_type.',
    ],
    ['R009 — Voltage range defined', 'Warning', 'One or more models is missing [Voltage Range].'],
    [
      'R010 — Pullup/Pulldown I(V) tables present',
      'Warning',
      'Output-class models are missing Pullup/Pulldown I(V) tables.',
    ],
    [
      'R011 — Power/GND clamp tables',
      'Info',
      'No Power Clamp/GND Clamp tables found (optional for pure-output models).',
    ],
    [
      'R012 — Rising/Falling waveform tables',
      'Warning',
      'No waveform tables — simulation accuracy limited to ramp data.',
    ],
    ['R013 — Ramp data present', 'Warning', 'No [Ramp] data — required for basic SI simulation.'],
    [
      'R014 — Package parasitics defined',
      'Info',
      'No [Package] R/L/C parasitics (may be in a separate .pkg file).',
    ],
    ['R015 — C_comp defined for all models', 'Info', 'One or more models is missing [C_comp].'],
    [
      'R016 — IBIS version >= 3.2',
      'Warning',
      'File declares an IBIS version older than 3.2; consider updating.',
    ],
    [
      'R017 — Waveform time axis is monotonic',
      'Error',
      'A waveform table has a non-increasing time column.',
    ],
    [
      'R018 — Pullup/Pulldown have >= 2 points',
      'Warning',
      'An I(V) table has fewer than 2 data points, unusable by simulators.',
    ],
    [
      'R019 — Diff pins reference valid pins',
      'Warning',
      'A [Diff Pin] entry references a pin number not present in [Pin].',
    ],
  ];

  function downloadCheatsheet(type) {
    let title, bodyHtml, filename;

    if (type === 'keywords') {
      title = 'IBIS Keyword Reference';
      filename = 'ibis-keyword-cheatsheet.html';
      bodyHtml = `<table><thead><tr><th>Keyword</th><th>Description</th></tr></thead><tbody>${KEYWORD_ROWS.map(
        ([kw, desc]) => `<tr><td><code>${kw}</code></td><td>${desc}</td></tr>`
      ).join('')}</tbody></table>`;
    } else if (type === 'syntax') {
      title = 'IBIS Syntax Patterns & Gotchas';
      filename = 'ibis-syntax-cheatsheet.html';
      bodyHtml = `<table><thead><tr><th>Pattern</th><th>Notes</th></tr></thead><tbody>${SYNTAX_ROWS.map(
        ([kw, desc]) => `<tr><td>${kw}</td><td>${desc}</td></tr>`
      ).join('')}</tbody></table>`;
    } else if (type === 'errors') {
      title = 'IBIS-Studio Validation Rule Reference';
      filename = 'ibis-validation-rules-cheatsheet.html';
      bodyHtml = `<h2>19 automated checks</h2><table><thead><tr><th>Rule</th><th>Severity</th><th>Meaning</th></tr></thead><tbody>${ERROR_ROWS.map(
        ([rule, sev, desc]) => `<tr><td>${rule}</td><td>${sev}</td><td>${desc}</td></tr>`
      ).join('')}</tbody></table>`;
    } else {
      if (window.IBISApp && typeof window.IBISApp.showToast === 'function') {
        window.IBISApp.showToast('Unknown cheat sheet: ' + type, 'error');
      }
      return;
    }

    _downloadBlob(_cheatsheetShell(title, bodyHtml), 'text/html', filename);
    if (window.IBISApp && typeof window.IBISApp.showToast === 'function') {
      window.IBISApp.showToast(title + ' downloaded', 'success');
    }
  }

  /* ─── Public API ─────────────────────────────────────────────────── */
  const publicApi = {
    onViewEnter,
    showTopic: switchTopic,
    search,
    getTopics: () => HELP_TOPICS,
    downloadCheatsheet,
  };

  return publicApi;
})();

// The HTML's cheat-sheet buttons use onclick="IBISHelp.downloadCheatsheet(...)",
// but this module's global is named HelpCenter. Alias it so those calls resolve.
window.IBISHelp = HelpCenter;
