/**
 * Transmission Line Calculator — Main Controller
 * Bootstraps the page: tabs, geometry-aware calculator wiring, live
 * simulation sliders, decision tree, narrator widget, export/save-load,
 * print, bookmark/share, and orchestrates calls into calculations.js /
 * simulations.js / charts.js / animations.js / quiz.js.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ══════════════════════════ TABS ══════════════════════════ */
  function initTabs() {
    const tabs = document.querySelectorAll('#tlc-tabs .tab-item');
    const panels = document.querySelectorAll('.tlc-tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const key = tab.dataset.tab;
        panels.forEach(p => {
          const isMatch = p.dataset.panel === key;
          p.classList.toggle('active', isMatch);
          p.hidden = !isMatch;
        });
      });
    });
  }

  /* ══════════════════════════ GEOMETRY FIELD MAP ══════════════════════════ */
  const GEOM_FIELDS = {
    microstrip: ['W', 'T', 'H', 'er'],
    'embedded-microstrip': ['W', 'T', 'H', 'H1', 'er'],
    stripline: ['W', 'T', 'B', 'er'],
    'asymmetric-stripline': ['W', 'T', 'H1', 'H2', 'er'],
    'diff-microstrip': ['W', 'T', 'H', 'S', 'er'],
    'diff-stripline': ['W', 'T', 'B', 'S', 'er'],
    cpwg: ['W', 'T', 'H', 'G', 'er'],
  };

  const GEOM_DEFAULTS = {
    microstrip: { W: 3.0, T: 0.035, H: 1.6, er: 4.3 },
    'embedded-microstrip': { W: 2.6, T: 0.035, H: 1.2, H1: 0.15, er: 4.3 },
    stripline: { W: 0.63, T: 0.035, B: 1.6, er: 4.3 },
    'asymmetric-stripline': { W: 0.5, T: 0.035, H1: 0.3, H2: 0.9, er: 4.3 },
    'diff-microstrip': { W: 0.3, T: 0.035, H: 0.2, S: 0.2, er: 4.3 },
    'diff-stripline': { W: 0.2, T: 0.035, B: 0.6, S: 0.2, er: 4.3 },
    cpwg: { W: 0.3, T: 0.035, H: 0.6, G: 0.4, er: 4.3 },
  };

  function applyGeometryVisibility(geometry) {
    const fields = GEOM_FIELDS[geometry] || [];
    document.querySelectorAll('#tlc-calc-form [data-field]').forEach(label => {
      const f = label.getAttribute('data-field');
      label.classList.toggle('tlc-field-hidden', fields.indexOf(f) === -1);
    });
    const h1Text = $('tlc-h1-label-text');
    if (h1Text) {
      h1Text.textContent =
        geometry === 'embedded-microstrip'
          ? 'Cover dielectric H1 (mm)'
          : 'Spacing to top plane H1 (mm)';
    }
  }

  /** Field data keys (used throughout calculations.js, e.g. inputs.er) don't
   * always match their HTML element id casing (id="tlcEr", not "tlcer") —
   * this maps a data key to its actual input element id. */
  function fieldElId(key) {
    return key === 'er' ? 'tlcEr' : 'tlc' + key;
  }

  function applyGeometryDefaults(geometry) {
    const d = GEOM_DEFAULTS[geometry];
    if (!d) return;
    Object.keys(d).forEach(key => {
      const el = $(fieldElId(key));
      if (el) el.value = d[key];
    });
  }

  /* ══════════════════════════ CALCULATOR ══════════════════════════ */
  function readCalcInputs() {
    return {
      geometry: $('tlcGeometry').value,
      W: parseFloat($('tlcW').value) || 0.3,
      T: parseFloat($('tlcT').value) || 0.035,
      H: parseFloat($('tlcH').value) || 0.2,
      H1: parseFloat($('tlcH1').value) || 0.15,
      H2: parseFloat($('tlcH2').value) || 0.5,
      B: parseFloat($('tlcB').value) || 0.6,
      S: parseFloat($('tlcS').value) || 0.2,
      G: parseFloat($('tlcG').value) || 0.3,
      er: parseFloat($('tlcEr').value) || 4.3,
    };
  }

  function formulaTextFor(geometry, inputs, result) {
    const C = window.TLCCalc;
    switch (geometry) {
      case 'microstrip':
        return `<p><strong>Microstrip (Hammerstad εeff + IPC-2141 Z0):</strong></p>
          <pre>εeff = (εr+1)/2 + (εr−1)/2 × 1/√(1+12H/W)
Z0 = (87/√(εr+1.41)) × ln(5.98H / (0.8W+T))</pre>
          <p>With W=${inputs.W}mm, H=${inputs.H}mm, T=${inputs.T}mm, εr=${inputs.er}: εeff = ${C.formatEeff(result.eeff)}, Z0 = <strong>${C.formatOhms(result.z0)}</strong>.</p>`;
      case 'embedded-microstrip':
        return `<p><strong>Embedded microstrip:</strong> starts from the surface-microstrip Z0 (${C.formatOhms(result.raw.z0Surface)}) and scales it down as εeff rises from the surface value toward the bulk εr with burial depth H1.</p>
          <pre>Z0(embedded) = Z0(surface) × √(εeff,surface / εeff,embedded)</pre>
          <p>With H1=${inputs.H1}mm cover dielectric over H=${inputs.H}mm to the plane: εeff = ${C.formatEeff(result.eeff)}, Z0 = <strong>${C.formatOhms(result.z0)}</strong>.</p>`;
      case 'stripline':
        return `<p><strong>Symmetric stripline (IPC-2141):</strong></p>
          <pre>Z0 = (60/√εr) × ln(1.9B / (0.8W+T))</pre>
          <p>With W=${inputs.W}mm, total plane spacing B=${inputs.B}mm, εr=${inputs.er}: εeff = εr = ${C.formatEeff(result.eeff)}, Z0 = <strong>${C.formatOhms(result.z0)}</strong>.</p>`;
      case 'asymmetric-stripline':
        return `<p><strong>Asymmetric (offset) stripline:</strong> harmonic-mean effective spacing from the two unequal plane distances H1=${inputs.H1}mm and H2=${inputs.H2}mm (asymmetry ratio ${(result.raw.asymmetryRatio || 1).toFixed(2)}, 1.0 = symmetric).</p>
          <pre>Heff = 2·H1·H2/(H1+H2)
Z0 = (60/√εr) × ln(1.9·(2·Heff) / (0.8W+T))</pre>
          <p>Z0 = <strong>${C.formatOhms(result.z0)}</strong>.</p>`;
      case 'diff-microstrip':
        return `<p><strong>Differential microstrip:</strong> single-ended Z0 = ${C.formatOhms(result.raw.z0SingleEnded)}, coupling factor = ${result.raw.couplingFactor.toFixed(3)}.</p>
          <pre>Zdiff = 2 × Z0(single-ended) × [1 − 0.48·exp(−0.96·S/H)]</pre>
          <p>With S=${inputs.S}mm spacing on H=${inputs.H}mm dielectric: Zdiff = <strong>${C.formatOhms(result.z0)}</strong>.</p>`;
      case 'diff-stripline':
        return `<p><strong>Differential stripline:</strong> single-ended Z0 = ${C.formatOhms(result.raw.z0SingleEnded)}, coupling factor = ${result.raw.couplingFactor.toFixed(3)}.</p>
          <pre>Zdiff = 2 × Z0(single-ended) × [1 − 0.347·exp(−2.9·S/B)]</pre>
          <p>With S=${inputs.S}mm spacing on B=${inputs.B}mm total plane spacing: Zdiff = <strong>${C.formatOhms(result.z0)}</strong>.</p>`;
      case 'cpwg':
        return `<p><strong>Grounded coplanar waveguide:</strong> coplanar (side-ground) path ≈ ${C.formatOhms(result.raw.z0CpwSide)}, bottom-plane (microstrip-equivalent) path ≈ ${C.formatOhms(result.raw.z0BottomPlane)}, combined as parallel capacitive paths.</p>
          <pre>k = W / (W+2G),  K(k)/K′(k) via conformal mapping
Z0(cpw side) = 30π/√εeff,cpw / [K(k)/K′(k)]
Z0 = [Z0(cpw side) × Z0(bottom plane)] / [Z0(cpw side) + Z0(bottom plane)]</pre>
          <p>Z0 = <strong>${C.formatOhms(result.z0)}</strong>.</p>`;
      default:
        return '';
    }
  }

  function runCalculator() {
    if (typeof TLCCalc === 'undefined') return;
    const inputs = readCalcInputs();
    const geometry = inputs.geometry;
    const result = TLCCalc.computeGeometry(geometry, inputs);
    const delay = result.delay;

    $('tlc-result-label').textContent = result.isDifferential ? 'Zdiff' : 'Z0';
    $('tlc-stat-z0').textContent = TLCCalc.formatOhms(result.z0);
    $('tlc-stat-eeff').textContent = TLCCalc.formatEeff(result.eeff);
    $('tlc-stat-delay-mm').textContent = TLCCalc.formatDelayPs(delay.psPerMm) + '/mm';
    $('tlc-stat-delay-in').textContent = TLCCalc.formatDelayPs(delay.psPerInch) + '/in';
    $('tlc-stat-vf').textContent = (delay.velocityFactor * 100).toFixed(1) + '% c';

    const zFn =
      geometry === 'microstrip'
        ? TLCCalc.microstripZ0
        : geometry === 'embedded-microstrip'
          ? TLCCalc.embeddedMicrostripZ0
          : geometry === 'stripline'
            ? TLCCalc.striplineZ0
            : geometry === 'asymmetric-stripline'
              ? TLCCalc.asymmetricStriplineZ0
              : geometry === 'diff-microstrip'
                ? TLCCalc.diffMicrostripZ0
                : geometry === 'diff-stripline'
                  ? TLCCalc.diffStriplineZ0
                  : TLCCalc.cpwgZ0;
    const tol = TLCCalc.widthToleranceRange(zFn, inputs, 'W', 0.0375);
    $('tlc-stat-tol').textContent = '±' + tol.spreadPct.toFixed(1) + '%';

    $('tlc-formula-content').innerHTML = formulaTextFor(geometry, inputs, result);

    if (typeof TLCAnimations !== 'undefined') {
      TLCAnimations.renderCrossSection('tlc-crosssection', geometry, inputs);
    }
  }

  function initCalculator() {
    if (!$('tlcGeometry')) return;
    applyGeometryVisibility($('tlcGeometry').value);
    const ids = [
      'tlcGeometry',
      'tlcW',
      'tlcT',
      'tlcH',
      'tlcH1',
      'tlcH2',
      'tlcB',
      'tlcS',
      'tlcG',
      'tlcEr',
    ];
    ids.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        if (id === 'tlcGeometry') applyGeometryVisibility(el.value);
        runCalculator();
      });
    });
    runCalculator();
  }

  /* ══════════════════════════ STATIC CHARTS ══════════════════════════ */
  function initStaticCharts() {
    if (typeof TLCCharts === 'undefined') return;
    TLCCharts.drawWidthChart('tlc-chart-width', { W: 3.0, H: 1.6, T: 0.035, er: 4.3 });
    TLCCharts.drawHeightChart('tlc-chart-height', { W: 3.0, H: 1.6, T: 0.035, er: 4.3 });
    TLCCharts.drawSpacingChart('tlc-chart-spacing', { W: 0.3, H: 0.2, T: 0.035, er: 4.3, S: 0.2 });
  }

  /* ══════════════════════════ LIVE SIMULATION ══════════════════════════ */
  function runSimulation() {
    if (typeof TLCSim === 'undefined' || typeof TLCCalc === 'undefined') return;
    const W = parseFloat($('tlcSimW').value);
    const H = parseFloat($('tlcSimH').value);
    const er = parseFloat($('tlcSimEr').value);
    const T = 0.035;

    $('tlcSimWOut').textContent = W.toFixed(2);
    $('tlcSimHOut').textContent = H.toFixed(2);
    $('tlcSimErOut').textContent = er.toFixed(1);

    const base = { W, H, T, er };
    const result = TLCCalc.microstripZ0(base);
    const delay = TLCCalc.propagationDelay(result.eeff);
    const sweep = TLCSim.widthSweep(base, 0.1, 3.5);

    if (typeof TLCCharts !== 'undefined') {
      TLCCharts.drawSimChart('tlc-sim-chart', sweep, W, result.z0, 'Trace width W (mm)');
    }
    if (typeof TLCAnimations !== 'undefined') {
      TLCAnimations.renderCrossSection('tlc-sim-crosssection', 'microstrip', base);
    }

    $('tlcSimReadout').innerHTML =
      `Z0 ≈ <strong>${TLCCalc.formatOhms(result.z0)}</strong> &nbsp;|&nbsp; ` +
      `εeff ≈ <strong>${TLCCalc.formatEeff(result.eeff)}</strong> &nbsp;|&nbsp; ` +
      `Delay ≈ <strong>${delay.psPerMm.toFixed(2)} ps/mm</strong> (${delay.psPerInch.toFixed(1)} ps/in) &nbsp;|&nbsp; ` +
      `Velocity factor ≈ <strong>${(delay.velocityFactor * 100).toFixed(1)}% c</strong>`;
  }

  function initSimulation() {
    if (!$('tlcSimW')) return;
    ['tlcSimW', 'tlcSimH', 'tlcSimEr'].forEach(id => {
      $(id).addEventListener('input', runSimulation);
    });
    runSimulation();
  }

  /* ══════════════════════════ DECISION TREE ══════════════════════════ */
  const TREE = {
    start: {
      question:
        'Is the signal differential (e.g. USB, HDMI, DisplayPort, PCIe, LVDS) or single-ended?',
      options: [
        { label: 'Differential pair', next: 'diff-emi' },
        { label: 'Single-ended', next: 'se-type' },
      ],
    },
    'se-type': {
      question:
        'Is this primarily an RF / antenna-feed signal, or a general digital I/O or memory net?',
      options: [
        { label: 'RF / antenna feed / connector breakout', next: 'result-cpwg' },
        { label: 'General digital I/O / memory / logic', next: 'se-emi' },
      ],
    },
    'se-emi': {
      question:
        'How EMI-sensitive is this net, and how many stack-up layers can you budget for a shielding reference plane on both sides?',
      options: [
        {
          label: 'EMI-sensitive, and a 4+ layer stack-up with two planes is available',
          next: 'result-stripline',
        },
        {
          label: 'Standard sensitivity, or only an outer-layer / 2-layer budget',
          next: 'result-microstrip',
        },
        {
          label: 'Outer layer, but soldermask/coating will fully cover the trace',
          next: 'result-embedded-microstrip',
        },
      ],
    },
    'diff-emi': {
      question:
        'Is this differential pair EMI-sensitive enough to justify full stripline shielding, and is that stack-up available?',
      options: [
        {
          label: 'Yes — EMI-sensitive and a stripline layer pair is available',
          next: 'result-diff-stripline',
        },
        {
          label: 'No — standard outer-layer routing is fine (USB/PCIe/HDMI-class)',
          next: 'result-diff-microstrip',
        },
      ],
    },
  };

  const RESULTS = {
    'result-microstrip': {
      title: 'Microstrip (single-ended)',
      body: 'Route on an outer layer over a single reference plane. Simplest to route and probe, needs only one plane, and is the default choice for most single-ended digital I/O when EMI sensitivity is moderate.',
    },
    'result-embedded-microstrip': {
      title: 'Embedded (buried) microstrip',
      body: 'Same routing simplicity as surface microstrip, but account for the soldermask/cover dielectric raising εeff and lowering Z0 versus an uncoated trace of the same width — widen the trace slightly versus a bare-surface microstrip calculation to compensate.',
    },
    'result-stripline': {
      title: 'Symmetric stripline (single-ended)',
      body: 'Route on an inner layer centered between two reference planes. Best EMI shielding of the single-ended options, at the cost of a thicker stack-up and a slower propagation velocity (εeff = εr, no air relief).',
    },
    'result-cpwg': {
      title: 'Grounded coplanar waveguide (CPWG)',
      body: 'Add coplanar ground pours beside the trace (with a defined gap G) plus the bottom reference plane. Lets you hit a controlled impedance on a shallow stack-up — the standard choice for RF front-ends, antenna feeds, and connector breakout regions.',
    },
    'result-diff-microstrip': {
      title: 'Differential microstrip',
      body: 'Route the pair on an outer layer with spacing S set for the target Zdiff (commonly ~90 Ω for USB/PCIe-class, ~100 Ω for HDMI-class). Standard choice for most differential I/O unless EMI or layer-budget constraints push you to stripline.',
    },
    'result-diff-stripline': {
      title: 'Differential stripline',
      body: 'Route the pair on an inner layer between two planes. Better shielding for EMI-sensitive differential links at the cost of stack-up depth; remember coupling (and therefore Zdiff) falls off faster with spacing in stripline than in microstrip.',
    },
  };

  let treePath = ['start'];

  function renderTree() {
    const currentKey = treePath[treePath.length - 1];
    const breadcrumb = $('tlc-tree-breadcrumb');
    breadcrumb.innerHTML = treePath
      .map(
        (key, i) =>
          `<span>${i === 0 ? 'Start' : TREE[treePath[i - 1]]?.options.find(o => o.next === key)?.label || key}</span>`
      )
      .join('');

    const content = $('tlc-tree-content');

    if (RESULTS[currentKey]) {
      const r = RESULTS[currentKey];
      content.innerHTML = `
        <div class="tlc-tree-result">
          <h3>${r.title}</h3>
          <p>${r.body}</p>
        </div>
      `;
      return;
    }

    const node = TREE[currentKey];
    if (!node) return;
    content.innerHTML = `
      <div class="tlc-tree-question">${node.question}</div>
      <div class="tlc-tree-options">
        ${node.options.map(opt => `<button type="button" class="tlc-tree-option" data-next="${opt.next}">${opt.label}</button>`).join('')}
      </div>
    `;
    content.querySelectorAll('[data-next]').forEach(btn => {
      btn.addEventListener('click', () => {
        treePath.push(btn.getAttribute('data-next'));
        renderTree();
      });
    });
  }

  function initDecisionTree() {
    if (!$('tlc-tree-content')) return;
    renderTree();
    $('tlc-tree-restart').addEventListener('click', () => {
      treePath = ['start'];
      renderTree();
    });
  }

  /* ══════════════════════════ NARRATOR WIDGET ══════════════════════════ */
  const NARRATION_SCRIPT = [
    {
      text: 'Welcome to the Transmission Line Calculator. This lesson covers how P C B trace geometry sets characteristic impedance, and walks through microstrip, stripline, and coplanar waveguide.',
      target: '#tlc-hero',
    },
    {
      text: 'A trace becomes a transmission line once its propagation delay is a meaningful fraction of the signal rise time. Characteristic impedance, Z zero, is the square root of inductance per length over capacitance per length.',
      target: '#intro-title',
    },
    {
      text: 'Microstrip is a trace over a single reference plane, with fields partly in air and partly in dielectric. Stripline buries the trace between two planes for full shielding, at the cost of a thicker stack up.',
      target: '[data-tab="microstrip"]',
    },
    {
      text: 'Differential pairs couple two traces together. Tighter spacing lowers the differential impedance below twice the single ended value, while wide spacing approaches the fully uncoupled limit.',
      target: '[data-tab="diff-microstrip"]',
    },
    {
      text: 'Try the calculator below: pick a geometry, enter your trace width, dielectric height, and dielectric constant, and watch Z zero, effective dielectric constant, and propagation delay update live.',
      target: '#tour-calculator',
    },
    {
      text: 'The live simulation lets you drag sliders for width, height, and dielectric constant to see the impedance curve and the cross section resize in real time.',
      target: '#tour-simulation',
    },
    {
      text: 'Finally, try the interactive decision tree and the thirteen question quiz to check your understanding.',
      target: '#tour-decision-tree',
    },
  ];

  let narratorState = { idx: -1, playing: false, utterance: null };

  function populateVoices() {
    const sel = $('tlc-narrator-voice');
    if (!sel || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    sel.innerHTML = voices
      .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
      .join('');
  }

  function speak(index) {
    if (!('speechSynthesis' in window)) {
      $('tlc-narrator-text').textContent =
        'Speech synthesis is not available in this browser — narration text is shown here instead.';
      return;
    }
    if (index < 0 || index >= NARRATION_SCRIPT.length) {
      narratorState.playing = false;
      return;
    }
    narratorState.idx = index;
    const item = NARRATION_SCRIPT[index];
    $('tlc-narrator-text').textContent = item.text;

    const target = document.querySelector(item.target);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(item.text);
    const speed = parseFloat($('tlc-narrator-speed').value) || 1;
    utter.rate = speed;
    const voiceSel = $('tlc-narrator-voice');
    const voices = window.speechSynthesis.getVoices();
    if (voiceSel && voiceSel.value !== '' && voices[parseInt(voiceSel.value, 10)]) {
      utter.voice = voices[parseInt(voiceSel.value, 10)];
    }
    utter.onend = () => {
      if (narratorState.playing) speak(index + 1);
    };
    narratorState.utterance = utter;
    window.speechSynthesis.speak(utter);
  }

  function initNarrator() {
    const widget = $('tlc-narrator');
    if (!widget) return;

    if ('speechSynthesis' in window) {
      populateVoices();
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    $('tlc-play-lesson').addEventListener('click', () => {
      widget.hidden = false;
      narratorState.playing = true;
      speak(narratorState.idx < 0 ? 0 : narratorState.idx);
    });

    $('tlc-narrator-play').addEventListener('click', () => {
      narratorState.playing = true;
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        speak(narratorState.idx < 0 ? 0 : narratorState.idx);
      }
    });
    $('tlc-narrator-pause').addEventListener('click', () => {
      narratorState.playing = false;
      if ('speechSynthesis' in window) window.speechSynthesis.pause();
    });
    $('tlc-narrator-stop').addEventListener('click', () => {
      narratorState.playing = false;
      narratorState.idx = -1;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      $('tlc-narrator-text').textContent = 'Stopped. Press play to start again.';
    });
    $('tlc-narrator-replay').addEventListener('click', () => {
      narratorState.playing = true;
      speak(0);
    });
    $('tlc-narrator-close').addEventListener('click', () => {
      narratorState.playing = false;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      widget.hidden = true;
    });
  }

  /* ══════════════════════════ EXPORT / SAVE / LOAD / PRINT / SHARE ══════════════════════════ */
  function download(filename, content, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  function exportNotes() {
    const sections = document.querySelectorAll('#tlc-accordion details');
    let text = 'TRANSMISSION LINE CALCULATOR — ENGINEERING NOTES\nRising Edge Technologies\n\n';
    sections.forEach(s => {
      const summary = s.querySelector('summary')?.textContent?.trim() || '';
      const body = s.querySelector('p')?.textContent?.trim() || '';
      text += `${summary}\n${'-'.repeat(summary.length)}\n${body}\n\n`;
    });
    download('transmission-line-calculator-notes.txt', text, 'text/plain');
  }

  function saveConfig() {
    const inputs = readCalcInputs();
    download(
      'transmission-line-calculator-config.json',
      JSON.stringify({ _tool: 'transmission-line-calculator', _v: 1, inputs }, null, 2),
      'application/json'
    );
  }

  function loadConfig(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const cfg = JSON.parse(e.target.result);
        const p = cfg.inputs || cfg;
        if (p.geometry) $('tlcGeometry').value = p.geometry;
        ['W', 'T', 'H', 'H1', 'H2', 'B', 'S', 'G', 'er'].forEach(key => {
          const el = $(fieldElId(key));
          if (p[key] !== undefined && el) el.value = p[key];
        });
        applyGeometryVisibility($('tlcGeometry').value);
        runCalculator();
      } catch (err) {
        console.warn('[TransmissionLineCalculator] Failed to load config:', err.message);
      }
    };
    reader.readAsText(file);
  }

  function initExport() {
    if (!$('tlc-export-notes')) return;
    $('tlc-export-notes').addEventListener('click', exportNotes);
    $('tlc-save-config').addEventListener('click', saveConfig);
    $('tlc-load-config').addEventListener('change', e => {
      loadConfig(e.target.files[0]);
      e.target.value = '';
    });
    $('tlc-print-lesson').addEventListener('click', () => window.print());
    $('tlc-share-btn').addEventListener('click', () => {
      const url = window.location.href;
      if (navigator.share) {
        navigator
          .share({ title: 'Transmission Line Calculator — Rising Edge Technologies', url })
          .catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          $('tlc-share-btn').textContent = 'Link copied!';
          setTimeout(() => ($('tlc-share-btn').textContent = 'Share link'), 1800);
        });
      }
    });
  }

  /* ══════════════════════════ BOOKMARK ══════════════════════════ */
  const BOOKMARK_KEY = 're_bookmarks';

  function isBookmarked() {
    try {
      const list = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
      return list.includes(window.location.pathname);
    } catch (e) {
      return false;
    }
  }

  function toggleBookmark() {
    try {
      const path = window.location.pathname;
      let list = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
      if (list.includes(path)) {
        list = list.filter(p => p !== path);
      } else {
        list.push(path);
      }
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list));
      updateBookmarkButtons();
    } catch (e) {
      /* localStorage unavailable — no-op */
    }
  }

  function updateBookmarkButtons() {
    const marked = isBookmarked();
    [$('tlc-bookmark-btn'), $('tlc-bookmark-btn-2')].forEach(btn => {
      if (!btn) return;
      btn.innerHTML = marked
        ? '&#9733; Bookmarked'
        : '&#9734; Bookmark' + (btn.id === 'tlc-bookmark-btn-2' ? ' this tool' : '');
    });
  }

  function initBookmark() {
    if (!$('tlc-bookmark-btn')) return;
    $('tlc-bookmark-btn').addEventListener('click', toggleBookmark);
    $('tlc-bookmark-btn-2')?.addEventListener('click', toggleBookmark);
    updateBookmarkButtons();
  }

  /* ══════════════════════════ KEYBOARD SHORTCUTS ══════════════════════════ */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveConfig();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        if ($('help-dialog') && !$('help-dialog').hidden) return;
        e.preventDefault();
        window.print();
      }
    });
  }

  /* ══════════════════════════ INIT ══════════════════════════ */
  function init() {
    initTabs();
    if (typeof TLCAnimations !== 'undefined') TLCAnimations.init();
    initCalculator();
    initStaticCharts();
    initSimulation();
    initDecisionTree();
    if (typeof TLCQuiz !== 'undefined') TLCQuiz.init();
    initNarrator();
    initExport();
    initBookmark();
    initKeyboardShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
