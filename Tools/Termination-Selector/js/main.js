/**
 * Termination Selector — Main Controller
 * Bootstraps the page: tabs, calculator wiring, live simulation, decision
 * tree, narrator widget, export/save-load, print, bookmark/share, and
 * orchestrates calls into calculations.js / simulations.js / charts.js /
 * animations.js / quiz.js.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ══════════════════════════ TABS ══════════════════════════ */
  function initTabs() {
    const tabs = document.querySelectorAll('#ts-tabs .tab-item');
    const panels = document.querySelectorAll('.ts-tab-panel');
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

  /* ══════════════════════════ CALCULATOR ══════════════════════════ */
  function readCalcInputs() {
    return {
      z0: parseFloat($('tsZ0').value) || 50,
      vdd: parseFloat($('tsVdd').value) || 3.3,
      rDriver: parseFloat($('tsRdriver').value) || 0,
      driverType: $('tsDriverType').value,
      topology: $('tsTopology').value,
      busStandard: $('tsBusStandard').value,
      bitRateMbps: parseFloat($('tsBitRate').value) || 100,
      vttAvailable: $('tsVttAvailable').value,
      powerBudget: $('tsPowerBudget').value,
    };
  }

  function badgeClassForScheme(scheme) {
    return (
      {
        series: 'badge badge-blue',
        parallel: 'badge badge-green',
        thevenin: 'badge badge-orange',
        ac: 'badge badge-purple',
        differential: 'badge badge-cyan',
      }[scheme] || 'badge badge-gray'
    );
  }

  function runCalculator() {
    if (typeof TSCalc === 'undefined') return;
    const inputs = readCalcInputs();
    const result = TSCalc.computeAll(inputs);

    $('ts-recommend-badge').textContent = result.recommendation.label;
    $('ts-recommend-badge').className = badgeClassForScheme(result.recommendation.scheme);
    $('ts-recommend-reason').textContent = result.recommendation.reason;

    $('ts-stat-rs').textContent = TSCalc.formatOhms(result.series.rs);
    $('ts-stat-rp').textContent = TSCalc.formatOhms(result.parallel.rp);
    $('ts-stat-thev').textContent =
      `${TSCalc.formatOhms(result.thevenin.r1)} / ${TSCalc.formatOhms(result.thevenin.r2)}`;
    $('ts-stat-cac').textContent = TSCalc.formatFarads(result.ac.cFarads);
    $('ts-stat-gamma-before').textContent = TSCalc.formatGamma(result.gammaBefore);
    $('ts-stat-gamma-after').textContent = TSCalc.formatGamma(result.gammaAfterParallel);
    $('ts-stat-power').textContent = TSCalc.formatWatts(result.staticPowerW);
    $('ts-stat-launch').textContent =
      (inputs.vdd * result.series.launchVoltageFactor).toFixed(2) + ' V';

    $('ts-formula-content').innerHTML = `
      <p><strong>Series:</strong> R_S = Z0 − R_driver = ${inputs.z0} − ${inputs.rDriver} = <strong>${TSCalc.formatOhms(result.series.rs)}</strong>. Launch voltage ≈ V_DD × Z0 / (Z0 + R_S + R_driver) = ${(inputs.vdd * result.series.launchVoltageFactor).toFixed(2)} V.</p>
      <p><strong>Parallel:</strong> R_P = Z0 = <strong>${TSCalc.formatOhms(result.parallel.rp)}</strong>. Static power at V_DD (worst case, terminated to GND) ≈ V_DD² / R_P = ${TSCalc.formatWatts(Math.pow(inputs.vdd, 2) / result.parallel.rp)}.</p>
      <p><strong>Thevenin:</strong> Solve R1‖R2 = Z0 and R2/(R1+R2)·V_DD = V_DD/2 → R1 = <strong>${TSCalc.formatOhms(result.thevenin.r1)}</strong>, R2 = <strong>${TSCalc.formatOhms(result.thevenin.r2)}</strong>. Continuous power = V_DD²/(R1+R2) = ${TSCalc.formatWatts(result.thevenin.staticPowerW)}.</p>
      <p><strong>AC (RC):</strong> R = Z0 = ${TSCalc.formatOhms(result.ac.r)}, τ target ≈ 6 × bit period → C ≈ <strong>${TSCalc.formatFarads(result.ac.cFarads)}</strong>.</p>
      <p><strong>Differential:</strong> Z_diff ≈ 2 × Z0 × coupling factor ≈ <strong>${TSCalc.formatOhms(result.differential.zDiff)}</strong>.</p>
      <pre>Γ = (Z_L − Z0) / (Z_L + Z0)
Unterminated (open, Z_L→∞): Γ = ${TSCalc.formatGamma(result.gammaBefore)}
Parallel-terminated (Z_L=Z0): Γ = ${TSCalc.formatGamma(result.gammaAfterParallel)}</pre>
      <p><strong>Worked example:</strong> With Z0 = ${inputs.z0} Ω, V_DD = ${inputs.vdd} V and R_driver = ${inputs.rDriver} Ω, the recommended scheme (${result.recommendation.label}) yields a static power of ${TSCalc.formatWatts(result.staticPowerW)} per line — verify this against your total board power budget when many lines share the same scheme.</p>
    `;

    if (typeof TSCharts !== 'undefined') {
      TSCharts.drawWaveformChart('ts-chart-waveform', {
        z0: inputs.z0,
        rDriver: inputs.rDriver,
        vdd: inputs.vdd,
        lengthMm: 200,
      });
      TSCharts.drawPowerChart('ts-chart-power', { z0: inputs.z0 });
    }
  }

  function initCalculator() {
    if (!$('tsZ0')) return;
    const ids = [
      'tsZ0',
      'tsVdd',
      'tsRdriver',
      'tsDriverType',
      'tsTopology',
      'tsBusStandard',
      'tsBitRate',
      'tsVttAvailable',
      'tsPowerBudget',
    ];
    ids.forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', runCalculator);
    });
    runCalculator();
  }

  /* ══════════════════════════ LIVE SIMULATION ══════════════════════════ */
  function runSimulation() {
    if (typeof TSSim === 'undefined' || typeof TSCalc === 'undefined') return;
    const z0 = parseFloat($('tsSimZ0').value);
    const rTerm = parseFloat($('tsSimRterm').value);
    const lengthMm = parseFloat($('tsSimLength').value);
    const type = $('tsSimType').value;
    const vdd = 3.3;
    const rDriver = 20;

    $('tsSimZ0Out').textContent = z0;
    $('tsSimRtermOut').textContent = rTerm;
    $('tsSimLengthOut').textContent = lengthMm;

    let rSource = rDriver;
    let rLoad = 1e9;
    if (type === 'series') {
      rSource = rDriver + rTerm;
      rLoad = 1e9;
    } else if (type === 'parallel') {
      rSource = rDriver;
      rLoad = rTerm;
    } else {
      rSource = rDriver;
      rLoad = 1e9;
    }

    const sim = TSSim.bounceDiagram({ z0, rSource, rLoad, vdd, lengthMm, roundTrips: 8 });

    if (typeof TSCharts !== 'undefined') {
      TSCharts.drawSimChart('ts-sim-chart', sim, { vdd });
    }

    const td = TSSim.propDelaySeconds(lengthMm) * 1e9;
    $('tsSimReadout').innerHTML =
      `One-way propagation delay ≈ <strong>${td.toFixed(2)} ns</strong> &nbsp;|&nbsp; ` +
      `Γ<sub>load</sub> = <strong>${sim.gammaL.toFixed(2)}</strong> &nbsp;|&nbsp; ` +
      `Γ<sub>source</sub> = <strong>${sim.gammaS.toFixed(2)}</strong> &nbsp;|&nbsp; ` +
      `Launch voltage ≈ <strong>${sim.vInitial.toFixed(2)} V</strong>`;
  }

  function initSimulation() {
    if (!$('tsSimZ0')) return;
    ['tsSimZ0', 'tsSimRterm', 'tsSimLength', 'tsSimType'].forEach(id => {
      $(id).addEventListener('input', runSimulation);
    });
    runSimulation();
  }

  /* ══════════════════════════ DECISION TREE ══════════════════════════ */
  const TREE = {
    start: {
      question: 'Is the signal a differential pair (LVDS, PCIe, USB SuperSpeed, HDMI/DisplayPort)?',
      options: [
        { label: 'Yes — differential pair', next: 'result-differential' },
        { label: 'No — single-ended signal', next: 'topology' },
      ],
    },
    topology: {
      question: 'What is the bus topology?',
      options: [
        { label: 'Point-to-point (1 driver, 1 receiver)', next: 'ptp-power' },
        { label: 'Multi-drop bus (shared line, several receivers)', next: 'multidrop-vtt' },
        { label: 'Daisy-chain (sequential identical loads)', next: 'result-series-daisy' },
      ],
    },
    'ptp-power': {
      question: 'Is the driver push-pull (CMOS totem-pole) and is power budget a concern?',
      options: [
        { label: 'Push-pull, power sensitive', next: 'result-series' },
        { label: 'Open-drain / open-collector', next: 'result-parallel-opendrain' },
        {
          label: 'Push-pull, power not a concern, want cleanest single edge',
          next: 'result-parallel-ptp',
        },
      ],
    },
    'multidrop-vtt': {
      question: 'Is a dedicated V_TT termination rail available on the board?',
      options: [
        { label: 'Yes — V_TT rail exists', next: 'result-parallel-vtt' },
        { label: 'No — only V_DD and GND are available', next: 'result-thevenin' },
      ],
    },
  };

  const RESULTS = {
    'result-differential': {
      title: 'Differential termination',
      body: 'Place a single resistor across the pair sized to the differential impedance Z_diff (commonly ~90–100 Ω). Verify AC-coupling capacitor interaction if the link uses AC coupling, and use ≤1% tolerance resistors for multi-gigabit links.',
    },
    'result-series': {
      title: 'Series termination',
      body: 'Place R_S = Z0 − R_driver close to the driver pin. Near-zero static power, simplest routing, ideal for power-sensitive point-to-point nets.',
    },
    'result-parallel-opendrain': {
      title: 'Parallel termination (pull-up doubles as termination)',
      body: 'Size the existing open-drain pull-up resistor near Z0 so it doubles as both the logic pull-up and the line termination for higher-speed open-drain buses.',
    },
    'result-parallel-ptp': {
      title: 'Parallel termination at the receiver',
      body: 'A single R_P ≈ Z0 at the receiver gives a clean, unreflected full-amplitude edge on the first pass. Budget the continuous static power this adds.',
    },
    'result-series-daisy': {
      title: 'Series termination at each stage',
      body: 'Use series termination at each driver stage in the chain, keeping each branch stub electrically short relative to the signal rise time.',
    },
    'result-parallel-vtt': {
      title: 'Parallel termination to V_TT',
      body: 'Terminate at the true electrical end(s) of the bus with R ≈ Z0 to the V_TT rail. For RS-485-style buses, terminate at both physical ends only — never mid-bus.',
    },
    'result-thevenin': {
      title: 'Thevenin termination',
      body: 'No V_TT rail exists — synthesize the bias point with a split resistor pair (R1 to V_DD, R2 to GND) where R1‖R2 = Z0. Budget the continuous current through R1+R2.',
    },
  };

  let treePath = ['start'];

  function renderTree() {
    const currentKey = treePath[treePath.length - 1];
    const breadcrumb = $('ts-tree-breadcrumb');
    breadcrumb.innerHTML = treePath
      .map(
        (key, i) =>
          `<span>${i === 0 ? 'Start' : TREE[treePath[i - 1]]?.options.find(o => o.next === key)?.label || key}</span>`
      )
      .join('');

    const content = $('ts-tree-content');

    if (RESULTS[currentKey]) {
      const r = RESULTS[currentKey];
      content.innerHTML = `
        <div class="ts-tree-result">
          <h3>${r.title}</h3>
          <p>${r.body}</p>
        </div>
      `;
      return;
    }

    const node = TREE[currentKey];
    if (!node) return;
    content.innerHTML = `
      <div class="ts-tree-question">${node.question}</div>
      <div class="ts-tree-options">
        ${node.options.map((opt, i) => `<button type="button" class="ts-tree-option" data-next="${opt.next}">${opt.label}</button>`).join('')}
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
    if (!$('ts-tree-content')) return;
    renderTree();
    $('ts-tree-restart').addEventListener('click', () => {
      treePath = ['start'];
      renderTree();
    });
  }

  /* ══════════════════════════ CHARTS (STATIC) ══════════════════════════ */
  function initStaticCharts() {
    if (typeof TSCharts === 'undefined') return;
    TSCharts.drawReflectionChart('ts-chart-reflection');
  }

  /* ══════════════════════════ NARRATOR WIDGET ══════════════════════════ */
  const NARRATION_SCRIPT = [
    {
      text: 'Welcome to the Termination Selector. This lesson covers why unterminated high speed lines reflect, and how series, parallel, Thevenin, A C, and differential termination each solve that problem differently.',
      target: '#ts-hero',
    },
    {
      text: 'Every P C B trace becomes a transmission line once the signal edge is fast relative to the trace length. An impedance mismatch at either end reflects part of the wave back, causing ringing.',
      target: '#intro-title',
    },
    {
      text: 'Series termination places a resistor near the driver so the source looks matched. The driver launches a half amplitude step, and the open receiver doubles it back to a full logic level.',
      target: '[data-tab="series"]',
    },
    {
      text: 'Parallel termination places a resistor at the receiver equal to the line impedance, absorbing the wave immediately with no reflection, at the cost of continuous static power.',
      target: '[data-tab="parallel"]',
    },
    {
      text: 'Thevenin termination uses two resistors to synthesize a bias voltage from V D D and ground when no dedicated V T T rail is available.',
      target: '[data-tab="thevenin"]',
    },
    {
      text: 'Try the calculator below: change the line impedance, driver type, and topology, and watch the recommended termination scheme update live.',
      target: '#tour-calculator',
    },
    {
      text: 'The live simulation lets you drag sliders for impedance, termination resistance, and trace length to see the receiver waveform respond in real time.',
      target: '#tour-simulation',
    },
    {
      text: 'Finally, try the interactive decision tree and the ten question quiz to check your understanding.',
      target: '#tour-decision-tree',
    },
  ];

  let narratorState = { idx: -1, playing: false, utterance: null };

  function populateVoices() {
    const sel = $('ts-narrator-voice');
    if (!sel || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    sel.innerHTML = voices
      .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
      .join('');
  }

  function speak(index) {
    if (!('speechSynthesis' in window)) {
      $('ts-narrator-text').textContent =
        'Speech synthesis is not available in this browser — narration text is shown here instead.';
      return;
    }
    if (index < 0 || index >= NARRATION_SCRIPT.length) {
      narratorState.playing = false;
      return;
    }
    narratorState.idx = index;
    const item = NARRATION_SCRIPT[index];
    $('ts-narrator-text').textContent = item.text;

    const target = document.querySelector(item.target);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(item.text);
    const speed = parseFloat($('ts-narrator-speed').value) || 1;
    utter.rate = speed;
    const voiceSel = $('ts-narrator-voice');
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
    const widget = $('ts-narrator');
    if (!widget) return;

    if ('speechSynthesis' in window) {
      populateVoices();
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    $('ts-play-lesson').addEventListener('click', () => {
      widget.hidden = false;
      narratorState.playing = true;
      speak(narratorState.idx < 0 ? 0 : narratorState.idx);
    });

    $('ts-narrator-play').addEventListener('click', () => {
      narratorState.playing = true;
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        speak(narratorState.idx < 0 ? 0 : narratorState.idx);
      }
    });
    $('ts-narrator-pause').addEventListener('click', () => {
      narratorState.playing = false;
      if ('speechSynthesis' in window) window.speechSynthesis.pause();
    });
    $('ts-narrator-stop').addEventListener('click', () => {
      narratorState.playing = false;
      narratorState.idx = -1;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      $('ts-narrator-text').textContent = 'Stopped. Press play to start again.';
    });
    $('ts-narrator-replay').addEventListener('click', () => {
      narratorState.playing = true;
      speak(0);
    });
    $('ts-narrator-close').addEventListener('click', () => {
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
    const sections = document.querySelectorAll('#ts-accordion details');
    let text = 'TERMINATION SELECTOR — ENGINEERING NOTES\nRising Edge Technologies\n\n';
    sections.forEach(s => {
      const summary = s.querySelector('summary')?.textContent?.trim() || '';
      const body = s.querySelector('p')?.textContent?.trim() || '';
      text += `${summary}\n${'-'.repeat(summary.length)}\n${body}\n\n`;
    });
    download('termination-selector-notes.txt', text, 'text/plain');
  }

  function saveConfig() {
    const inputs = readCalcInputs();
    download(
      'termination-selector-config.json',
      JSON.stringify({ _tool: 'termination-selector', _v: 1, inputs }, null, 2),
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
        if (p.z0) $('tsZ0').value = p.z0;
        if (p.vdd) $('tsVdd').value = p.vdd;
        if (p.rDriver !== undefined) $('tsRdriver').value = p.rDriver;
        if (p.driverType) $('tsDriverType').value = p.driverType;
        if (p.topology) $('tsTopology').value = p.topology;
        if (p.busStandard) $('tsBusStandard').value = p.busStandard;
        if (p.bitRateMbps) $('tsBitRate').value = p.bitRateMbps;
        if (p.vttAvailable) $('tsVttAvailable').value = p.vttAvailable;
        if (p.powerBudget) $('tsPowerBudget').value = p.powerBudget;
        runCalculator();
      } catch (err) {
        console.warn('[TerminationSelector] Failed to load config:', err.message);
      }
    };
    reader.readAsText(file);
  }

  function initExport() {
    if (!$('ts-export-notes')) return;
    $('ts-export-notes').addEventListener('click', exportNotes);
    $('ts-save-config').addEventListener('click', saveConfig);
    $('ts-load-config').addEventListener('change', e => {
      loadConfig(e.target.files[0]);
      e.target.value = '';
    });
    $('ts-print-lesson').addEventListener('click', () => window.print());
    $('ts-share-btn').addEventListener('click', () => {
      const url = window.location.href;
      if (navigator.share) {
        navigator
          .share({ title: 'Termination Selector — Rising Edge Technologies', url })
          .catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          $('ts-share-btn').textContent = 'Link copied!';
          setTimeout(() => ($('ts-share-btn').textContent = 'Share link'), 1800);
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
    [$('ts-bookmark-btn'), $('ts-bookmark-btn-2')].forEach(btn => {
      if (!btn) return;
      btn.innerHTML = marked
        ? '&#9733; Bookmarked'
        : '&#9734; Bookmark' + (btn.id === 'ts-bookmark-btn-2' ? ' this tool' : '');
    });
  }

  function initBookmark() {
    if (!$('ts-bookmark-btn')) return;
    $('ts-bookmark-btn').addEventListener('click', toggleBookmark);
    $('ts-bookmark-btn-2')?.addEventListener('click', toggleBookmark);
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
    if (typeof TSAnimations !== 'undefined') TSAnimations.init();
    initCalculator();
    initSimulation();
    initStaticCharts();
    initDecisionTree();
    if (typeof TSQuiz !== 'undefined') TSQuiz.init();
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
