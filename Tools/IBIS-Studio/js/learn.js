/**
 * learn.js — Rising Edge IBIS-Studio
 * Learning module: IBIS concepts, structured curriculum, quizzes, narrator integration.
 *
 * Depends on: Narrator (optional)
 * Exports global: LearnModule
 */

const LearnModule = (function () {
  'use strict';

  /* ─── Curriculum ────────────────────────────────────────────────── */
  const CURRICULUM = [
    {
      id: 'intro',
      title: 'What is IBIS?',
      icon: '📘',
      duration: '5 min',
      content: `
        <h2>What is IBIS?</h2>
        <p>IBIS (I/O Buffer Information Specification) is an industry-standard behavioral modeling format
        for describing the electrical characteristics of I/O buffers on integrated circuits. It was
        developed to allow accurate signal integrity simulation without exposing proprietary transistor-level
        circuit details.</p>

        <div class="learn-callout">
          <strong>Key insight:</strong> IBIS models describe <em>what</em> a buffer does electrically
          (its I/V curves, switching behavior, parasitic capacitance), not <em>how</em> it is implemented
          in silicon. This protects IP while enabling system-level simulation.
        </div>

        <h3>Why IBIS matters</h3>
        <p>Modern PCBs operate at multi-gigahertz speeds where signal integrity is critical. Without
        accurate I/O models, simulation tools cannot predict:</p>
        <ul>
          <li>Overshoot and undershoot voltages</li>
          <li>Crosstalk between adjacent signals</li>
          <li>Simultaneous switching noise (SSN/SSO)</li>
          <li>Eye diagram opening margins</li>
        </ul>

        <h3>IBIS vs. SPICE</h3>
        <div class="learn-table-wrap">
          <table class="learn-table">
            <thead><tr><th>Aspect</th><th>IBIS</th><th>SPICE</th></tr></thead>
            <tbody>
              <tr><td>IP exposure</td><td>None (behavioral)</td><td>Full circuit</td></tr>
              <tr><td>Simulation speed</td><td>Fast</td><td>Slow</td></tr>
              <tr><td>Format</td><td>ASCII keywords</td><td>SPICE netlist</td></tr>
              <tr><td>Tool support</td><td>Universal</td><td>Wide</td></tr>
              <tr><td>Accuracy</td><td>Good for SI</td><td>Highest fidelity</td></tr>
            </tbody>
          </table>
        </div>`,
      quiz: [
        {
          q: 'What does IBIS stand for?',
          options: [
            'I/O Buffer Information Specification',
            'Integrated Bus Interface Standard',
            'Internal Buffer Interface Spec',
            'I/O Binary Interface System',
          ],
          answer: 0,
        },
        {
          q: 'IBIS models are primarily used for:',
          options: [
            'Signal integrity simulation',
            'Power supply design',
            'Clock synthesis',
            'PCB layout rules',
          ],
          answer: 0,
        },
      ],
    },
    {
      id: 'format',
      title: 'IBIS File Format',
      icon: '📄',
      duration: '8 min',
      content: `
        <h2>IBIS File Format</h2>
        <p>An IBIS file is a plain ASCII text file with the extension <code>.ibs</code>. It uses a
        keyword-based format where keywords are enclosed in square brackets: <code>[Keyword]</code>.</p>

        <h3>File structure overview</h3>
        <div class="learn-code">
[IBIS Ver]      7.0
[File Name]     my_device.ibs
[File Rev]      1.0
[Date]          2024-01-15
[Source]        Rising Edge Design Group
[Manufacturer]  Acme Semiconductor

[Component]     MY_CHIP
[Manufacturer]  Acme Semiconductor

[Package]
R_pkg    0.10m    0.08m    0.12m
L_pkg    2.50n    2.00n    3.00n
C_pkg    0.50p    0.40p    0.60p

[Pin]  signal_name    model_name
A1     DATA_0         OUT_3V3
A2     DATA_1         OUT_3V3
...

[Model]         OUT_3V3
Model_type      Output
...

[End]
        </div>

        <h3>Three-corner values</h3>
        <p>Most numerical parameters in IBIS appear as three values: <strong>typ</strong> (typical),
        <strong>min</strong> (worst-case slow/cold), and <strong>max</strong> (worst-case fast/hot).
        This allows simulators to run best/worst-case analysis automatically.</p>

        <div class="learn-callout learn-callout-info">
          Use <code>NA</code> in a corner position to indicate "not available." The simulator
          will substitute the typical value.
        </div>

        <h3>Comments</h3>
        <p>The pipe character <code>|</code> introduces a comment that extends to end of line.
        Comments can appear anywhere and are widely used for documentation.</p>

        <div class="learn-code">
| This entire line is a comment
[IBIS Ver]    7.0    | Inline comment after value
        </div>`,
      quiz: [
        {
          q: 'What character introduces a comment in IBIS?',
          options: ['|', '//', '#', ';'],
          answer: 0,
        },
        {
          q: 'What does "NA" mean in a three-corner value field?',
          options: ['Not Available', 'Negative Allowance', 'Normal Average', 'Not Applicable'],
          answer: 0,
        },
      ],
    },
    {
      id: 'models',
      title: 'Model Types',
      icon: '🔌',
      duration: '10 min',
      content: `
        <h2>IBIS Model Types</h2>
        <p>The <code>Model_type</code> keyword defines the electrical behavior class of a buffer.
        Choosing the correct type is critical — it determines which I/V tables and waveforms are required.</p>

        <div class="learn-table-wrap">
          <table class="learn-table">
            <thead><tr><th>Model Type</th><th>Description</th><th>Required Tables</th></tr></thead>
            <tbody>
              <tr><td><code>Input</code></td><td>Pure receiver — no drive capability</td><td>GND/Pwr Clamp</td></tr>
              <tr><td><code>Output</code></td><td>Pure driver — no receive path</td><td>Pullup, Pulldown, Ramp</td></tr>
              <tr><td><code>I/O</code></td><td>Bidirectional — driver + receiver</td><td>All tables</td></tr>
              <tr><td><code>3-state</code></td><td>Driver with high-impedance enable</td><td>Pullup, Pulldown, Ramp</td></tr>
              <tr><td><code>Open_drain</code></td><td>Open-drain — pulldown only</td><td>Pulldown, GND Clamp</td></tr>
              <tr><td><code>Open_source</code></td><td>Open-source — pullup only</td><td>Pullup, Pwr Clamp</td></tr>
              <tr><td><code>Input_ECL</code></td><td>ECL/differential receiver</td><td>Clamp tables</td></tr>
              <tr><td><code>Output_ECL</code></td><td>ECL/differential driver</td><td>Pullup, Pulldown</td></tr>
              <tr><td><code>Terminator</code></td><td>On-die termination resistor</td><td>Pwr/GND Clamp</td></tr>
              <tr><td><code>Series</code></td><td>Series element (resistor, switch)</td><td>Special format</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Voltage references</h3>
        <p>Each model references its I/V tables to specific voltage rails:</p>
        <ul>
          <li><strong>Pullup:</strong> voltage relative to <code>[Pullup Reference]</code> (typically Vdd)</li>
          <li><strong>Pulldown:</strong> absolute voltage (referenced to GND)</li>
          <li><strong>Power Clamp:</strong> voltage relative to <code>[Power Clamp Reference]</code></li>
          <li><strong>GND Clamp:</strong> voltage relative to <code>[GND Clamp Reference]</code></li>
        </ul>`,
      quiz: [
        {
          q: 'Which model type should be used for a standard DDR4 DQ pin?',
          options: ['I/O', 'Output', 'Input', '3-state'],
          answer: 0,
        },
        {
          q: 'Pullup I(V) values are measured relative to:',
          options: [
            'The Pullup Reference voltage (Vdd)',
            'Ground (0V)',
            'The output voltage',
            'The threshold voltage',
          ],
          answer: 0,
        },
      ],
    },
    {
      id: 'iv-tables',
      title: 'I(V) Tables',
      icon: '📊',
      duration: '12 min',
      content: `
        <h2>I(V) Curve Tables</h2>
        <p>The I(V) tables are the heart of an IBIS output model. They describe the current that
        flows through the output transistors as a function of output voltage, at three process/temperature corners.</p>

        <h3>Pulldown I(V) — NMOS model</h3>
        <p>Current through the pulldown (NMOS) transistor vs. output voltage.
        Voltage is referenced to GND (absolute).</p>
        <div class="learn-code">
[Pulldown]
| voltage     I(typ)      I(min)      I(max)
-3.300        -40.0m      -30.0m      -50.0m
 0.000          0.0         0.0         0.0
 0.600         24.0m       18.0m       30.0m
 1.000         32.0m       24.0m       40.0m
 3.300         40.0m       30.0m       50.0m
 6.600         40.0m       30.0m       50.0m
        </div>

        <h3>Pullup I(V) — PMOS model</h3>
        <p>Current through the pullup (PMOS) transistor vs. <em>voltage relative to Vdd</em>.
        Values are typically negative (current flowing into the pin).</p>
        <div class="learn-code">
[Pullup]
| voltage     I(typ)      I(min)      I(max)
-3.300        -40.0m      -30.0m      -50.0m
-1.000        -38.0m      -28.0m      -48.0m
-0.600        -30.0m      -22.0m      -38.0m
 0.000          0.0         0.0         0.0
 3.300          5.0m        3.0m        7.0m
        </div>

        <h3>Important conventions</h3>
        <div class="learn-callout learn-callout-warn">
          <strong>Sign convention:</strong> In IBIS, current flowing <em>into</em> the pin is positive.
          This is opposite to the SPICE convention where current flowing out of a node is positive.
        </div>

        <h3>Clamp tables</h3>
        <p>Power and GND clamp tables model ESD diodes and input protection structures.
        They are essential for accurate simulation of overshoot and undershoot behavior.</p>`,
      quiz: [
        {
          q: 'Pullup I(V) voltages are referenced to:',
          options: [
            'Vdd (relative)',
            'Ground (absolute)',
            'The midpoint voltage',
            'The threshold voltage',
          ],
          answer: 0,
        },
        {
          q: 'In IBIS sign convention, positive current means:',
          options: [
            'Current flowing INTO the pin',
            'Current flowing OUT of the pin',
            'Charging current only',
            'ESD current',
          ],
          answer: 0,
        },
      ],
    },
    {
      id: 'waveforms',
      title: 'Waveforms & Ramp',
      icon: '〰️',
      duration: '10 min',
      content: `
        <h2>Waveforms and Ramp Data</h2>
        <p>While I(V) tables describe DC behavior, waveform tables capture the dynamic switching
        behavior of an output buffer — the actual voltage-vs-time transitions.</p>

        <h3>Ramp data (simplified)</h3>
        <p>The <code>[Ramp]</code> section provides a simplified linear approximation of rise/fall times:</p>
        <div class="learn-code">
[Ramp]
| variable   typ       min       max
dV/dt_r      2.5/1n    2.0/1n    3.0/1n    | Rise: 2.5V in 1 ns
dV/dt_f      2.5/1n    2.0/1n    3.0/1n    | Fall: 2.5V in 1 ns
R_load       50                              | Measurement load
        </div>

        <h3>Waveform tables (accurate)</h3>
        <p>Rising and falling waveform tables provide precise, measured time-domain data captured
        at a specific fixture (load) condition:</p>
        <div class="learn-code">
[Rising Waveform]
R_fixture     50
V_fixture     3.3
| time        V(typ)    V(min)    V(max)
0.00e-9       0.000     0.000     0.000
0.20e-9       0.110     0.085     0.140
0.40e-9       0.540     0.420     0.680
0.60e-9       1.820     1.530     2.150
0.80e-9       2.780     2.450     3.050
1.00e-9       3.180     2.950     3.310
1.50e-9       3.270     3.010     3.320
        </div>

        <div class="learn-callout">
          <strong>Tip:</strong> Waveform tables give much better simulation accuracy than ramp data
          alone, especially for capturing pre-shoot, post-shoot, and non-linear switching behavior.
        </div>`,
      quiz: [
        {
          q: 'Which provides better simulation accuracy for signal integrity?',
          options: ['Waveform tables', 'Ramp data', 'They are equivalent', 'Neither — use SPICE'],
          answer: 0,
        },
        {
          q: 'What does R_fixture in a waveform table represent?',
          options: [
            'The load resistance used during measurement',
            'The package resistance',
            'The on-resistance of the driver',
            'The termination impedance',
          ],
          answer: 0,
        },
      ],
    },
    {
      id: 'simulation',
      title: 'Using IBIS in Simulation',
      icon: '🖥️',
      duration: '8 min',
      content: `
        <h2>Using IBIS Models in SI Simulation</h2>
        <p>IBIS models are consumed by signal integrity EDA tools to simulate interconnect behavior.
        The workflow involves loading driver and receiver models, defining the interconnect (transmission
        lines, vias, connectors), and running time-domain or frequency-domain analysis.</p>

        <h3>Common SI tools that use IBIS</h3>
        <ul>
          <li><strong>Ansys SIwave / HFSS</strong> — full-wave EM + IBIS co-simulation</li>
          <li><strong>Cadence Sigrity</strong> — power integrity + signal integrity</li>
          <li><strong>Mentor HyperLynx</strong> — board-level SI/EMI simulation</li>
          <li><strong>Zuken SI Expert</strong> — topology-based analysis</li>
          <li><strong>ADS (Keysight)</strong> — RF + high-speed digital</li>
        </ul>

        <h3>Typical simulation workflow</h3>
        <div class="learn-steps">
          <div class="learn-step"><span class="step-num">1</span><span>Obtain IBIS models from IC vendors</span></div>
          <div class="learn-step"><span class="step-num">2</span><span>Validate models with IBIS-Studio</span></div>
          <div class="learn-step"><span class="step-num">3</span><span>Import board layout (Gerber/ODB++/IPC-2581)</span></div>
          <div class="learn-step"><span class="step-num">4</span><span>Assign IBIS models to net drivers/receivers</span></div>
          <div class="learn-step"><span class="step-num">5</span><span>Run IBIS simulation (time-domain)</span></div>
          <div class="learn-step"><span class="step-num">6</span><span>Analyze eye diagrams, setup/hold margins</span></div>
          <div class="learn-step"><span class="step-num">7</span><span>Iterate topology until margins meet spec</span></div>
        </div>

        <h3>Corner analysis</h3>
        <p>Run with all three corners (typ/min/max) to find worst-case timing and voltage margins.
        Best practice: fast driver + slow receiver + hot temperature for setup,
        slow driver + slow receiver + cold temperature for hold.</p>`,
      quiz: [
        {
          q: 'Which corner combination typically gives worst-case setup time violations?',
          options: [
            'Fast driver + slow receiver + hot temp',
            'Slow driver + slow receiver + cold temp',
            'Typical corners',
            'Fast driver + fast receiver',
          ],
          answer: 0,
        },
      ],
    },
  ];

  // Maps the real HTML's data-topic ids (from the hand-authored
  // .ibis-learn-nav / #learn-content markup) to a stub content div id that
  // learn.js should fill in, for topics that don't already have
  // hand-written content in the HTML. Topics not listed here either have
  // full hand-written content already (what-is-ibis, history, why-ibis,
  // spice-vs-ibis, keywords) or intentionally get a "coming soon" state.
  const STUB_CONTENT = {
    advantages: {
      containerId: 'learn-advantages-content',
      html: `<p>IBIS models trade some simulation accuracy for major practical benefits over
        full SPICE netlists:</p>
        <ul>
          <li><strong>IP protection</strong> — no transistor-level circuit details are exposed.</li>
          <li><strong>Simulation speed</strong> — behavioral I/V and waveform tables simulate far
          faster than transistor-level SPICE.</li>
          <li><strong>Universal tool support</strong> — nearly every SI simulator can read the
          ASCII keyword format.</li>
          <li><strong>Vendor interoperability</strong> — a single model works across many EDA
          tools without translation.</li>
        </ul>`,
    },
    limitations: {
      containerId: 'learn-limitations-content',
      html: `<p>IBIS is not a complete substitute for SPICE in every situation:</p>
        <ul>
          <li>Behavioral tables cannot capture every nonlinear effect a full transistor model can.</li>
          <li>Accuracy depends entirely on how the model was extracted/measured by the vendor.</li>
          <li>Some advanced effects (e.g. certain power-aware or on-die termination behaviors)
          need IBIS extensions (IBIS-AMI, [External Model]) rather than the base format.</li>
        </ul>`,
    },
    'file-structure': {
      containerId: 'learn-file-structure-content',
      html: `<div class="learn-code">[IBIS Ver]      7.0
[Component]     MY_CHIP
[Package]
[Pin]  signal_name   model_name
[Model]         OUT_3V3
  [Pullup] / [Pulldown] / [Ramp]
  [Rising Waveform] / [Falling Waveform]
[End]</div>
        <p>Every file starts with header keywords, defines one or more components with pin-to-model
        mappings, then defines each referenced model's electrical tables, ending in <code>[End]</code>.</p>`,
    },
    models: {
      containerId: 'learn-models-content',
      html: CURRICULUM.find(t => t.id === 'models')?.content || '',
    },
    pins: {
      containerId: 'learn-pins-content',
      html: `<p>The <code>[Pin]</code> keyword maps each physical package pin to a signal name and
        the model that describes its electrical behavior:</p>
        <div class="learn-code">[Pin]  signal_name    model_name
A1     DATA_0         OUT_3V3
A2     DATA_1         OUT_3V3</div>
        <p>Multiple pins can share the same model if they have identical electrical behavior.</p>`,
    },
    package: {
      containerId: 'learn-package-content',
      html: `<p>The <code>[Package]</code> section provides lumped R/L/C parasitics for the
        package itself (typ/min/max), applied in series with the die's I/O model:</p>
        <div class="learn-code">[Package]
R_pkg    0.10m    0.08m    0.12m
L_pkg    2.50n    2.00n    3.00n
C_pkg    0.50p    0.40p    0.60p</div>`,
    },
    waveforms: {
      containerId: 'learn-waveforms-content',
      html: CURRICULUM.find(t => t.id === 'waveforms')?.content || '',
    },
    'iv-curves': {
      containerId: 'learn-iv-content',
      html: CURRICULUM.find(t => t.id === 'iv-tables')?.content || '',
    },
    ramp: {
      containerId: 'learn-ramp-content',
      html: `<p>The <code>[Ramp]</code> keyword gives a simplified linear rise/fall approximation
        used when full waveform tables aren't available:</p>
        <div class="learn-code">[Ramp]
dV/dt_r      2.5/1n    2.0/1n    3.0/1n
dV/dt_f      2.5/1n    2.0/1n    3.0/1n
R_load       50</div>`,
    },
    'diff-pairs': {
      containerId: 'learn-diff-content',
      html: `<p>Differential pairs use two coupled single-ended models plus a
        <code>[Diff Pin]</code> keyword linking the two pins and specifying the differential
        <code>Vdiff</code> switching threshold and <code>tdelay</code> matching tolerance.</p>`,
    },
    simulators: {
      containerId: 'learn-sim-content',
      html: CURRICULUM.find(t => t.id === 'simulation')?.content || '',
    },
    'best-practices': {
      containerId: 'learn-bp-content',
      html: `<ul>
          <li>Always validate a vendor IBIS file with a checker before use.</li>
          <li>Confirm typ/min/max corners are populated (not all <code>NA</code>).</li>
          <li>Prefer waveform tables over ramp-only models for high-speed signals.</li>
          <li>Cross-check package parasitics against the datasheet.</li>
        </ul>`,
    },
  };

  /* ─── State ──────────────────────────────────────────────────────── */
  let _rendered = false;

  /* ─── Fill in stub content divs that the HTML doesn't hand-author ──── */
  function fillStubContent() {
    Object.keys(STUB_CONTENT).forEach(topicId => {
      const { containerId, html } = STUB_CONTENT[topicId];
      const el = document.getElementById(containerId);
      if (el && !el.innerHTML.trim()) {
        el.innerHTML = html || '<p><em>Content coming soon.</em></p>';
      }
    });
  }

  /* ─── Wire the real sidebar nav + content panel switching ──────────── */
  function initTopicSwitching() {
    const navButtons = document.querySelectorAll('.learn-topic[data-topic]');
    navButtons.forEach(btn => {
      if (btn._learnWired) return;
      btn._learnWired = true;
      btn.addEventListener('click', () => showTopic(btn.dataset.topic));
    });
  }

  /* ─── Show a topic (real DOM: toggle .active on nav btn + content div) ── */
  function showTopic(id) {
    const contentEl = document.getElementById('learn-topic-' + id);
    if (!contentEl) return;

    document.querySelectorAll('.learn-topic[data-topic]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.topic === id);
    });
    document.querySelectorAll('.learn-topic-content').forEach(el => {
      el.classList.toggle('active', el.id === 'learn-topic-' + id);
    });

    // Load content into narrator so Play has something to speak.
    if (typeof Narrator !== 'undefined') {
      Narrator.loadContent(contentEl);
    }
  }

  /* ─── Quiz feedback for the hand-authored radio-group quizzes ──────
   * Used by onclick="IBISLearn.checkQuiz('q1', 'b', this)" in the HTML:
   * find the checked radio in the named group, compare against the
   * correct value, and show pass/fail in the button's sibling
   * .quiz-feedback element (id pattern "${questionName}-feedback"). */
  function checkQuiz(questionName, correctValue, buttonEl) {
    const checked = document.querySelector(`input[name="${questionName}"]:checked`);
    const fb =
      document.getElementById(`${questionName}-feedback`) ||
      buttonEl?.parentElement?.querySelector('.quiz-feedback');
    if (!fb) return;

    if (!checked) {
      fb.className = 'quiz-feedback incorrect';
      fb.textContent = 'Please select an answer first.';
      return;
    }
    if (checked.value === correctValue) {
      fb.className = 'quiz-feedback correct';
      fb.textContent = '✓ Correct!';
    } else {
      fb.className = 'quiz-feedback incorrect';
      fb.textContent = '✗ Not quite — try again.';
    }
  }

  /* ─── "What is IBIS?" concept animation: SPICE transistor level → IBIS
   * behavioral abstraction, drawn on #canvas-ibis-concept. Plain canvas
   * draw, no animation loop needed — it's a static explanatory diagram. */
  function drawIbisConceptCanvas() {
    const canvas = document.getElementById('canvas-ibis-concept');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const midX = w / 2;
    const panelW = midX - 60;

    // Panel backgrounds
    ctx.fillStyle = 'rgba(148,163,184,0.08)';
    ctx.fillRect(20, 20, panelW, h - 40);
    ctx.fillRect(midX + 20, 20, panelW, h - 40);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.strokeRect(20, 20, panelW, h - 40);
    ctx.strokeRect(midX + 20, 20, panelW, h - 40);

    // Labels
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.fillText('SPICE (transistor-level)', 30, 38);
    ctx.fillStyle = '#34d399';
    ctx.fillText('IBIS (behavioral)', midX + 30, 38);

    // Left panel: simple transistor symbols (MOSFET-like) in a chain
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    const txCount = 3;
    const txSpacing = panelW / (txCount + 1);
    for (let i = 0; i < txCount; i++) {
      const cx = 20 + txSpacing * (i + 1);
      const cy = h / 2;
      // Gate/channel rectangle
      ctx.strokeRect(cx - 10, cy - 20, 20, 40);
      // Source/drain leads
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20);
      ctx.lineTo(cx, cy - 35);
      ctx.moveTo(cx, cy + 20);
      ctx.lineTo(cx, cy + 35);
      // Gate lead
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx - 25, cy);
      ctx.stroke();
    }
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Full circuit topology, doping profiles, process details', 30, h - 28);

    // Right panel: I/V curve abstraction
    const px = midX + 45,
      py = h - 45,
      pw = panelW - 50,
      ph = h - 75;
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px, py);
    ctx.lineTo(px + pw, py);
    ctx.stroke();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = px + t * pw;
      const y = py - ph * Math.pow(t, 1.6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('I/V curve, ramp rate, timing — behavior only', midX + 30, h - 28);
    ctx.fillText('V', px + pw + 4, py + 4);
    ctx.fillText('I', px - 10, py - ph - 4);

    // Arrow connecting the two panels
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midX - 34, h / 2);
    ctx.lineTo(midX + 14, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX + 14, h / 2);
    ctx.lineTo(midX + 4, h / 2 - 6);
    ctx.lineTo(midX + 4, h / 2 + 6);
    ctx.closePath();
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
  }

  /* ─── On view enter ───────────────────────────────────────────────── */
  function onViewEnter() {
    if (!_rendered) {
      fillStubContent();
      initTopicSwitching();
      drawIbisConceptCanvas();
      if (typeof Narrator !== 'undefined') Narrator.initControls();
      _rendered = true;
    }
  }

  /* ─── Public API ─────────────────────────────────────────────────── */
  return {
    onViewEnter,
    showTopic,
    checkQuiz,
    getCurriculum: () => CURRICULUM,
  };
})();

// Alias for the HTML's onclick="IBISLearn.checkQuiz(...)" call site.
window.IBISLearn = LearnModule;
