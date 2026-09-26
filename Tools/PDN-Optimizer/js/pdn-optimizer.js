(function () {
  'use strict';

  const LIBRARY = [
    {
      name: '330µF Polymer',
      capacitance: 330e-6,
      esr: 8e-3,
      esl: 2.5e-9,
      package: 'D-Case',
      category: 'Polymer',
      voltageRating: 6.3,
    },
    {
      name: '100µF Tantalum',
      capacitance: 100e-6,
      esr: 15e-3,
      esl: 2e-9,
      package: 'B-Case',
      category: 'Tantalum',
      voltageRating: 10,
    },
    {
      name: '47µF Polymer',
      capacitance: 47e-6,
      esr: 5e-3,
      esl: 1.8e-9,
      package: 'A-Case',
      category: 'Polymer',
      voltageRating: 6.3,
    },
    {
      name: '22µF MLCC',
      capacitance: 22e-6,
      esr: 3e-3,
      esl: 1.2e-9,
      package: '0805',
      category: 'MLCC',
      voltageRating: 6.3,
    },
    {
      name: '10µF MLCC',
      capacitance: 10e-6,
      esr: 2e-3,
      esl: 1e-9,
      package: '0805',
      category: 'MLCC',
      voltageRating: 10,
    },
    {
      name: '4.7µF MLCC',
      capacitance: 4.7e-6,
      esr: 2e-3,
      esl: 0.8e-9,
      package: '0603',
      category: 'MLCC',
      voltageRating: 10,
    },
    {
      name: '1µF MLCC',
      capacitance: 1e-6,
      esr: 5e-3,
      esl: 0.5e-9,
      package: '0402',
      category: 'MLCC',
      voltageRating: 16,
    },
    {
      name: '100nF MLCC',
      capacitance: 100e-9,
      esr: 10e-3,
      esl: 0.4e-9,
      package: '0402',
      category: 'MLCC',
      voltageRating: 25,
    },
    {
      name: '10nF MLCC',
      capacitance: 10e-9,
      esr: 20e-3,
      esl: 0.3e-9,
      package: '0201',
      category: 'MLCC',
      voltageRating: 25,
    },
    {
      name: '1nF MLCC',
      capacitance: 1e-9,
      esr: 50e-3,
      esl: 0.2e-9,
      package: '0201',
      category: 'MLCC',
      voltageRating: 50,
    },
  ];
  const COLORS = [
    '#10b981',
    '#f59e0b',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1',
    '#ef4444',
  ];
  const $ = id => document.getElementById(id);
  const num = (id, fallback = 0) => {
    const v = Number($(id).value);
    return Number.isFinite(v) ? v : fallback;
  };
  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const logspace = (a, b, n) => {
    const x = Math.log10(a),
      step = (Math.log10(b) - x) / (n - 1);
    return Array.from({ length: n }, (_, i) => 10 ** (x + i * step));
  };
  const formatFreq = f =>
    f >= 1e9
      ? (f / 1e9).toFixed(2) + ' GHz'
      : f >= 1e6
        ? (f / 1e6).toFixed(2) + ' MHz'
        : f >= 1e3
          ? (f / 1e3).toFixed(2) + ' kHz'
          : f.toFixed(1) + ' Hz';
  const formatCap = c =>
    c >= 1e-3
      ? (c * 1e3).toFixed(1) + ' mF'
      : c >= 1e-6
        ? (c * 1e6).toFixed(c >= 10e-6 ? 0 : 1) + ' µF'
        : c >= 1e-9
          ? (c * 1e9).toFixed(0) + ' nF'
          : (c * 1e12).toFixed(0) + ' pF';
  const formatOhm = z => (z < 1 ? (z * 1000).toFixed(3) + ' mΩ' : z.toFixed(3) + ' Ω');
  const debounce = (fn, ms = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  class CapacitorModel {
    constructor(data, lVia) {
      Object.assign(this, data);
      this.quantity = Math.max(1, Number(data.quantity) || 1);
      this.enabled = data.enabled !== false;
      this.lVia = lVia;
    }
    get totalInductance() {
      return this.esl + this.lVia;
    }
    get srf() {
      return 1 / (2 * Math.PI * Math.sqrt(this.capacitance * this.totalInductance));
    }
    impedanceAt(f) {
      const w = 2 * Math.PI * f;
      return {
        real: this.esr / this.quantity,
        imag: (w * this.totalInductance - 1 / (w * this.capacitance)) / this.quantity,
      };
    }
    impedanceMagnitude(freqs) {
      return freqs.map(f => {
        const z = this.impedanceAt(f);
        return Math.hypot(z.real, z.imag);
      });
    }
    toJSON() {
      return {
        name: this.name,
        capacitance: this.capacitance,
        esr: this.esr,
        esl: this.esl,
        package: this.package,
        category: this.category,
        manufacturer: this.manufacturer || '',
        quantity: this.quantity,
        enabled: this.enabled,
      };
    }
  }

  const CalculationEngine = {
    target(s) {
      return s.manualTarget ?? ((s.vdd * (s.ripple / 100)) / s.current) * (1 - s.margin / 100);
    },
    response(caps, freqs, s) {
      return freqs.map(f => {
        let yr = 0,
          yi = 0;
        for (const cap of caps) {
          if (!cap.enabled) continue;
          const z = cap.impedanceAt(f),
            d = z.real * z.real + z.imag * z.imag;
          yr += z.real / d;
          yi -= z.imag / d;
        }
        if (!yr && !yi) return Infinity;
        const d = yr * yr + yi * yi,
          zr = yr / d + s.rPlane,
          zi = -yi / d + 2 * Math.PI * f * (s.lPlane + s.lPackage);
        return Math.hypot(zr, zi);
      });
    },
    peaks(caps, freqs, z, target) {
      const out = [];
      if (caps.length < 2) return out;
      for (let i = 2; i < z.length - 2; i++) {
        if (z[i] > z[i - 1] && z[i] > z[i + 1]) {
          const lo = Math.min(
            ...z.slice(Math.max(0, i - 30), i),
            ...z.slice(i + 1, Math.min(z.length, i + 31))
          );
          if (z[i] > lo * 1.8)
            out.push({ frequency: freqs[i], impedance: z[i], breachesTarget: z[i] > target });
        }
      }
      return out.sort((a, b) => b.impedance - a.impedance).slice(0, 12);
    },
    result(caps, s, iterations = 0) {
      const frequencies = logspace(s.fStart, s.fStop, s.points),
        zTarget = this.target(s),
        zPdn = this.response(caps, frequencies, s),
        worst = Math.max(...zPdn),
        worstIndex = zPdn.indexOf(worst),
        ratio = worst / zTarget;
      return {
        selectedCapacitors: caps,
        frequencies,
        zPdn,
        zTarget,
        worst,
        worstFrequency: frequencies[worstIndex],
        meetsTarget: ratio <= 1,
        marginDb: -20 * Math.log10(ratio),
        antiResonances: this.peaks(caps, frequencies, zPdn, zTarget),
        totalCapacitors: caps.filter(c => c.enabled).reduce((n, c) => n + c.quantity, 0),
        effectiveCapacitance: caps
          .filter(c => c.enabled)
          .reduce((n, c) => n + c.capacitance * c.quantity, 0),
        iterations,
      };
    },
  };

  class Optimizer {
    constructor(spec) {
      this.spec = spec;
    }
    run() {
      const selected = [];
      let iteration = 0;
      for (iteration = 1; iteration <= this.spec.maxIterations; iteration++) {
        const result = CalculationEngine.result(selected, this.spec, iteration);
        if (result.meetsTarget) break;
        if (result.totalCapacitors >= this.spec.maxCaps) break;
        const f = Number.isFinite(result.worstFrequency) ? result.worstFrequency : this.spec.fStart;
        let best = null,
          score = Infinity;
        LIBRARY.forEach(item => {
          const cap = new CapacitorModel(item, this.spec.lVia),
            existing = selected.find(c => c.name === cap.name),
            candidate =
              Math.abs(Math.log10(cap.srf) - Math.log10(f)) + (existing?.quantity || 0) * 0.015;
          if (candidate < score) {
            score = candidate;
            best = cap;
          }
        });
        const existing = selected.find(c => c.name === best.name);
        if (existing) existing.quantity++;
        else selected.push(best);
      }
      return CalculationEngine.result(selected, this.spec, iteration);
    }
  }

  const ValidationManager = {
    spec() {
      const s = {
        vdd: num('vdd'),
        current: num('delta-i'),
        ripple: num('ripple'),
        margin: num('margin'),
        manualTarget: $('manual-target-toggle').checked ? num('manual-target') / 1000 : null,
        fStart: num('f-start'),
        fStop: num('f-stop'),
        points: Math.round(num('points')),
        lVia: num('l-via') * 1e-9,
        lPlane: num('l-plane') * 1e-9,
        rPlane: num('r-plane') * 1e-3,
        lPackage: num('l-package') * 1e-9,
        maxIterations: Math.round(num('max-iterations')),
        maxCaps: Math.round(num('max-caps')),
      };
      const errors = [];
      if (s.vdd <= 0) errors.push('Rail voltage must be greater than zero.');
      if (s.current <= 0) errors.push('Current step must be greater than zero.');
      if (s.ripple <= 0) errors.push('Ripple must be greater than zero.');
      if (s.margin < 0 || s.margin >= 100) errors.push('Design margin must be from 0% to 99%.');
      if (s.manualTarget !== null && s.manualTarget <= 0)
        errors.push('Manual target impedance must be greater than zero.');
      if (s.fStart <= 0 || s.fStop <= s.fStart)
        errors.push('Stop frequency must be greater than start frequency.');
      if (s.points < 100 || s.points > 5000)
        errors.push('Use between 100 and 5000 frequency points.');
      if ([s.lVia, s.lPlane, s.rPlane, s.lPackage].some(v => v < 0))
        errors.push('PCB parasitics cannot be negative.');
      if (s.maxCaps < 1 || s.maxIterations < 1)
        errors.push('Optimization limits must be positive.');
      return { s, errors };
    },
    cap(c) {
      const e = [];
      if (!c.name.trim()) e.push('Capacitor name is required.');
      if (!(c.capacitance > 0)) e.push('Capacitance must be greater than zero.');
      if (c.esr < 0) e.push('ESR cannot be negative.');
      if (c.esl <= 0) e.push('ESL must be greater than zero.');
      return e;
    },
  };

  const RecommendationEngine = {
    build(r, s) {
      const out = [];
      if (r.meetsTarget)
        out.push([
          'success',
          'Target met across the complete simulation band with ' +
            r.marginDb.toFixed(1) +
            ' dB worst-case margin.',
        ]);
      else
        out.push([
          'danger',
          'Target is exceeded near ' +
            formatFreq(r.worstFrequency) +
            '. The worst impedance is ' +
            formatOhm(r.worst) +
            '.',
        ]);
      if (r.zPdn[0] > r.zTarget)
        out.push([
          'warning',
          'Increase bulk capacitance or reduce VRM-to-load path impedance for the low-frequency region.',
        ]);
      if (r.zPdn[r.zPdn.length - 1] > r.zTarget)
        out.push([
          'warning',
          'Reduce mounting/package ESL and place small MLCCs closer to the load for high-frequency control.',
        ]);
      if (r.antiResonances.some(p => p.breachesTarget))
        out.push([
          'danger',
          'One or more anti-resonance peaks breach the target. Add an intermediate value or a damped capacitor branch.',
        ]);
      if (s.lVia > 1e-9)
        out.push([
          'warning',
          'Mounting inductance exceeds 1 nH. Use shorter connections and power/ground vias directly at each pad.',
        ]);
      if (new Set(r.selectedCapacitors.map(c => c.capacitance)).size < 3)
        out.push([
          '',
          'Use multiple capacitor decades to cover bulk, mid-frequency, and high-frequency energy demand.',
        ]);
      out.push([
        '',
        'Validate final selections for DC-bias derating, tolerance, temperature, and vendor impedance data.',
      ]);
      return out;
    },
  };

  const state = { mode: 'auto', manual: [], result: null, sortAsc: true };
  function showAlert(messages) {
    const el = $('pdn-alert');
    if (!messages.length) {
      el.hidden = true;
      return;
    }
    el.textContent = messages.join(' ');
    el.hidden = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function getSpec() {
    const v = ValidationManager.spec();
    showAlert(v.errors);
    return v.errors.length ? null : v.s;
  }
  function updateTarget() {
    const v = ValidationManager.spec();
    if (v.errors.length) {
      $('target-display').textContent = 'Invalid inputs';
      return;
    }
    const z = CalculationEngine.target(v.s);
    $('target-display').textContent = formatOhm(z);
    $('target-formula').textContent = $('manual-target-toggle').checked
      ? 'Manual override'
      : `(${v.s.vdd} V × ${v.s.ripple}%) / ${v.s.current} A, with ${v.s.margin}% margin`;
    renderScope(v.s, state.result);
  }
  function setMode(mode) {
    state.mode = mode;
    document
      .querySelectorAll('[data-mode]')
      .forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    $('auto-panel').hidden = mode !== 'auto';
    $('manual-panel').hidden = mode !== 'manual';
  }
  function populateLibrary() {
    $('cap-select').innerHTML = LIBRARY.map(
      (c, i) => `<option value="${i}">${esc(c.name)} · ${c.package}</option>`
    ).join('');
    $('library-table').innerHTML = LIBRARY.map(
      c =>
        `<tr><td>${esc(c.name)}</td><td>${formatCap(c.capacitance)}</td><td>${formatOhm(c.esr)}</td><td>${(c.esl * 1e9).toFixed(2)} nH</td><td>${esc(c.package)}</td><td>${c.voltageRating} V</td></tr>`
    ).join('');
  }
  function addCap(data, qty = 1) {
    const existing = state.manual.find(c => c.name === data.name && c.package === data.package);
    if (existing) existing.quantity += qty;
    else state.manual.push({ ...data, quantity: qty, enabled: true });
    liveUpdateManual();
  }
  function renderManual() {
    const count = state.manual.reduce((n, c) => n + (c.enabled ? c.quantity : 0), 0);
    $('manual-count').textContent = count + ' devices';
    $('manual-list').innerHTML = state.manual.length
      ? state.manual
          .map(
            (c, i) =>
              `<div class="pdn-cap-item"><input type="checkbox" data-cap-enable="${i}" ${c.enabled ? 'checked' : ''} aria-label="Enable ${esc(c.name)}"><div class="pdn-cap-name"><strong>${esc(c.name)}</strong><small>${formatCap(c.capacitance)} · ${esc(c.package)} · ${(c.esr * 1000).toFixed(1)} mΩ</small></div><input class="input" type="number" min="1" max="500" value="${c.quantity}" data-cap-qty="${i}" aria-label="Quantity for ${esc(c.name)}"><button class="pdn-icon-btn pdn-duplicate" data-cap-duplicate="${i}" title="Duplicate" aria-label="Duplicate ${esc(c.name)}">⧉</button><button class="pdn-icon-btn" data-cap-remove="${i}" title="Remove" aria-label="Remove ${esc(c.name)}">✕</button></div>`
          )
          .join('')
      : '<div class="pdn-empty">No capacitors added. Choose a library part, define a custom part, or load the preset.</div>';
  }
  function loadPreset() {
    state.manual = [
      { ...LIBRARY[0], quantity: 2, enabled: true },
      { ...LIBRARY[3], quantity: 6, enabled: true },
      { ...LIBRARY[5], quantity: 8, enabled: true },
      { ...LIBRARY[7], quantity: 12, enabled: true },
    ];
    renderManual();
    setMode('manual');
  }
  // Manual-mode edits (add/remove/duplicate/enable/qty) used to only
  // re-render the capacitor list — the board and oscilloscope kept
  // showing whatever was last simulated until "Simulate circuit" was
  // clicked again, so changing decoupling capacitors didn't visibly do
  // anything. This re-simulates live (silently, no validation alerts) so
  // the power-rail waveform tracks the current capacitor selection.
  function liveUpdateManual() {
    renderManual();
    if (state.mode !== 'manual') return;
    const v = ValidationManager.spec();
    if (v.errors.length) return;
    const s = v.s;
    const caps = state.manual.filter(c => c.enabled).map(c => new CapacitorModel(c, s.lVia));
    if (!caps.length) {
      renderBoard([], { example: false, vdd: s.vdd });
      renderScope(s, null);
      return;
    }
    const result = CalculationEngine.result(caps, s);
    state.result = result;
    renderResult(result, s);
  }
  function run(mode) {
    const s = getSpec();
    if (!s) return;
    let result;
    if (mode === 'auto') result = new Optimizer(s).run();
    else {
      const caps = state.manual.filter(c => c.enabled).map(c => new CapacitorModel(c, s.lVia));
      if (!caps.length) {
        showAlert(['Add and enable at least one capacitor before simulating.']);
        return;
      }
      result = CalculationEngine.result(caps, s);
    }
    state.result = result;
    showAlert([]);
    renderResult(result, s);
  }

  function chartTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    return {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: light ? '#475569' : '#94a3b8' },
      grid: light ? '#dbe2ea' : '#273244',
    };
  }
  function renderChart(r) {
    if (!window.Plotly) {
      $('impedance-chart').innerHTML =
        '<div class="pdn-empty">The interactive chart library could not be loaded. Results remain available in the table and exports.</div>';
      return;
    }
    const traces = r.selectedCapacitors
      .filter(c => c.enabled)
      .map((c, i) => ({
        x: r.frequencies,
        y: c.impedanceMagnitude(r.frequencies),
        type: 'scatter',
        mode: 'lines',
        name: c.name,
        line: { width: 1, color: COLORS[i % COLORS.length] },
        opacity: 0.5,
        hovertemplate: '%{x:.3s} Hz<br>%{y:.3e} Ω<extra>' + esc(c.name) + '</extra>',
      }));
    traces.push(
      {
        x: r.frequencies,
        y: r.zPdn,
        type: 'scatter',
        mode: 'lines',
        name: 'Combined PDN',
        line: { width: 3, color: '#10b981' },
        hovertemplate: '%{x:.3s} Hz<br>%{y:.3e} Ω<extra>Combined</extra>',
      },
      {
        x: [r.frequencies[0], r.frequencies.at(-1)],
        y: [r.zTarget, r.zTarget],
        type: 'scatter',
        mode: 'lines',
        name: 'Target ' + formatOhm(r.zTarget),
        line: { width: 2, color: '#ef4444', dash: 'dash' },
        hovertemplate: 'Target: %{y:.3e} Ω<extra></extra>',
      }
    );
    if (r.antiResonances.length)
      traces.push({
        x: r.antiResonances.map(p => p.frequency),
        y: r.antiResonances.map(p => p.impedance),
        type: 'scatter',
        mode: 'markers',
        name: 'Anti-resonance',
        marker: {
          size: 9,
          color: r.antiResonances.map(p => (p.breachesTarget ? '#ef4444' : '#f59e0b')),
          symbol: 'diamond',
        },
        hovertemplate: 'Peak %{x:.3s} Hz<br>%{y:.3e} Ω<extra></extra>',
      });
    const t = chartTheme();
    Plotly.react(
      'impedance-chart',
      traces,
      {
        ...t,
        margin: { l: 68, r: 24, t: 24, b: 62 },
        xaxis: { type: 'log', title: 'Frequency (Hz)', gridcolor: t.grid, zeroline: false },
        yaxis: { type: 'log', title: 'Impedance (Ω)', gridcolor: t.grid, zeroline: false },
        legend: { orientation: 'h', y: -0.22 },
        hovermode: 'x unified',
        dragmode: 'zoom',
      },
      { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }
    );
  }
  function renderResult(r, s) {
    const status = $('result-status');
    status.textContent = r.meetsTarget ? 'Target met' : 'Target exceeded';
    status.className = 'badge ' + (r.meetsTarget ? 'badge-green' : 'badge-orange');
    $('stat-worst').textContent = formatOhm(r.worst);
    $('stat-margin').textContent = r.marginDb.toFixed(2) + ' dB';
    $('stat-caps').textContent = String(r.totalCapacitors);
    $('stat-capacitance').textContent = formatCap(r.effectiveCapacitance);
    $('chart-summary').textContent =
      `PDN response ${r.meetsTarget ? 'meets' : 'does not meet'} the ${formatOhm(r.zTarget)} target. Worst impedance is ${formatOhm(r.worst)} at ${formatFreq(r.worstFrequency)}.`;
    renderChart(r);
    renderResultTable(r);
    renderBoard(r.selectedCapacitors, { example: false, vdd: s.vdd });
    renderScope(s, r);
    $('recommendations').innerHTML = RecommendationEngine.build(r, s)
      .map(
        ([type, text]) =>
          `<div class="pdn-rec ${type}"><span>${type === 'success' ? '✓' : type === 'danger' ? '!' : '→'}</span><span>${esc(text)}</span></div>`
      )
      .join('');
  }
  function renderResultTable(r) {
    const list = [...r.selectedCapacitors];
    if (state.sortAsc) list.sort((a, b) => a.srf - b.srf);
    $('result-table').innerHTML = list
      .map(
        c =>
          `<tr><td><strong>${esc(c.name)}</strong><br><small>${esc(c.package)}</small></td><td>${c.quantity}</td><td>${formatCap(c.capacitance)}</td><td>${formatOhm(c.esr)}</td><td>${(c.esl * 1e9).toFixed(2)} nH</td><td>${formatFreq(c.srf)}</td></tr>`
      )
      .join('');
  }

  /* ── Board layout & animated current-flow visualization ─────────────
     Clean, linear PCB layout (power supply on the left, a shared VDD /
     GND rail pair running across the board, decoupling bank in the
     middle, IC on the right) — mirrors a typical documentation-style
     board diagram rather than a schematic. Placement still follows real
     decoupling practice: smallest capacitance closest to the IC, rising
     in value moving left toward the regulator. Each capacitor's power
     lead carries two guide paths (rail→cap for charging, cap→rail for
     discharging) so a dot visibly reverses direction each cycle, synced
     to the same LED/glow charge indicator. The two rails carry their own
     continuous, opposite-direction flow (power in, ground return out),
     via native SVG <animateMotion> — no per-frame JS. */
  function icPinsMarkup(cx, topY, botY, side) {
    const n = 3,
      pinLen = 10,
      pinW = 4,
      span = botY - topY;
    let out = '';
    for (let k = 0; k < n; k++) {
      const y = topY + (span * (k + 1)) / (n + 1) - pinW / 2;
      out += `<rect x="${side === 'left' ? cx - pinLen : cx}" y="${y.toFixed(1)}" width="${pinLen}" height="${pinW}" class="pdn-ic-pin"/>`;
    }
    return out;
  }
  function boardExampleCaps() {
    const pick = [0, 2, 4, 5, 7, 9],
      qty = [2, 6, 8, 10, 14, 6];
    return pick.map((idx, i) => {
      const item = LIBRARY[idx],
        cap = new CapacitorModel(item, 0.5e-9);
      cap.quantity = qty[i];
      return cap;
    });
  }
  function supplyCapMarkup(cx, topY, botY, refDes, valueLabel) {
    const midY = (topY + botY) / 2,
      boxW = 32,
      boxH = 16;
    return `
      <line x1="${cx}" y1="${topY}" x2="${cx}" y2="${(midY - boxH / 2).toFixed(1)}" class="pdn-trace-power"/>
      <line x1="${cx}" y1="${(midY + boxH / 2).toFixed(1)}" x2="${cx}" y2="${botY}" class="pdn-trace-ground"/>
      <g transform="translate(${cx},${midY})">
        <rect x="${-boxW / 2}" y="${-boxH / 2}" width="${boxW}" height="${boxH}" rx="3" class="pdn-supply-cap-body"/>
        <text x="0" y="${-boxH / 2 - 4}" text-anchor="middle" class="pdn-cap-refdes">${esc(refDes)}</text>
        <text x="0" y="3" text-anchor="middle" class="pdn-supply-cap-label">${esc(valueLabel)}</text>
      </g>`;
  }
  function renderBoard(caps, opts = {}) {
    const el = $('pdn-board'),
      status = $('board-status');
    if (!el) return;
    if (!caps || !caps.length) {
      el.innerHTML =
        '<div class="pdn-empty">Add capacitors and run a simulation to see the board layout.</div>';
      if (status) {
        status.textContent = 'No layout yet';
        status.className = 'badge badge-gray';
      }
      return;
    }
    if (status) {
      status.textContent = opts.example ? 'Example layout' : 'Live layout';
      status.className = 'badge ' + (opts.example ? 'badge-gray' : 'badge-green');
    }
    // Smallest capacitance closest to the IC, rising in value moving left
    // toward the regulator — matches real decoupling placement practice.
    const list = [...caps].sort((a, b) => a.capacitance - b.capacitance);
    const n = list.length;

    const W = 940,
      H = 400;
    const railY1 = 150, // power (VDD)
      railY2 = 320; // ground (GND)
    const midY = (railY1 + railY2) / 2;
    const railLeftX = 40,
      icX = 860,
      icHalfW = 50,
      icTopY = railY1,
      icBotY = railY2;
    // Narrow bank spacing so up to ~10 distinct capacitor types can sit
    // side-by-side (rotated, tall/narrow bodies) without touching each
    // other or the supply components on either side.
    const bankLeftX = 420,
      bankRightX = 770;
    const railEndX = icX - icHalfW;
    const vdd = Number.isFinite(opts.vdd) ? opts.vdd : 1.0;
    const vddLabel = vdd.toFixed(2) + 'V';

    // Power-supply zone: DC jack → D1 → L1 → CIN (to ground) → U1 (buck
    // reg) → COUT (to ground) → onto the shared rail. These are fixed,
    // illustrative context components, not part of the simulated network.
    const dcX = 60,
      d1X = 115,
      l1X = 165,
      cinX = 205,
      u1X = 270,
      u1W = 76,
      u1H = 54,
      coutX = 345;

    // Cascading charge model: one current wave leaves the regulator/COUT,
    // travels the shared rail left → right, and "arrives" at each
    // capacitor in physical order — bulk caps nearest the regulator first,
    // the smallest cap nearest the IC last, which then hands current to
    // the device. All caps share one period T so the wave stays in phase
    // forever; each cap's flash is timed to when the traveling dot passes
    // its x position (kt below peaks around 77% of each cycle).
    const T = Math.max(3, Math.min(7, 3.2 + n * 0.35));
    const peak = 0.77;
    const kt = '0;0.68;0.74;0.86;1';

    // Each capacitor's own charge/discharge blink rate scales with its
    // value: the smallest capacitance (fastest to respond, nearest the IC)
    // blinks quickest, the largest bulk capacitance (nearest the
    // regulator) blinks slowest — matching real decoupling behavior. The
    // cascade wave above still sets when each cap's *first* blink fires
    // (in physical left→right order); after that each free-runs at its
    // own natural rate.
    const capMin = list[0].capacitance,
      capMax = list[n - 1].capacitance;
    const fastDur = 1.1,
      slowDur = 5.5;

    let leads = '',
      dots = '',
      markers = '';
    list.forEach((c, i) => {
      const capX = n === 1 ? bankRightX : bankRightX - (i / (n - 1)) * (bankRightX - bankLeftX);
      const color = COLORS[i % COLORS.length];
      const boxW = 30,
        boxH = 64; // rotated: tall/narrow body standing between the rails
      const refDes = 'C' + (i + 1);
      const fraction = (capX - railLeftX) / (railEndX - railLeftX);
      const capT =
        capMax > capMin
          ? fastDur +
            ((Math.log10(c.capacitance) - Math.log10(capMin)) /
              (Math.log10(capMax) - Math.log10(capMin))) *
              (slowDur - fastDur)
          : (fastDur + slowDur) / 2;
      const dur = capT.toFixed(2);
      const begin = ((fraction - peak) * T).toFixed(2);
      const chargeId = `pdn-charge-${i}`,
        dischargeId = `pdn-discharge-${i}`;
      const leadTopY = midY - boxH / 2,
        leadBotY = midY + boxH / 2;

      leads += `<path id="${chargeId}" d="M ${capX} ${railY1} L ${capX} ${leadTopY}" fill="none" opacity="0"/>`;
      leads += `<path id="${dischargeId}" d="M ${capX} ${leadTopY} L ${capX} ${railY1}" fill="none" opacity="0"/>`;
      leads += `<line x1="${capX}" y1="${railY1}" x2="${capX}" y2="${leadTopY}" class="pdn-trace-power"/>`;
      leads += `<line x1="${capX}" y1="${leadBotY}" x2="${capX}" y2="${railY2}" class="pdn-trace-ground"/>`;
      dots += `<circle r="3" class="pdn-flow-dot" fill="#fbbf24"><animateMotion dur="${dur}s" repeatCount="indefinite" begin="${begin}s"><mpath href="#${chargeId}"/></animateMotion><animate attributeName="opacity" values="1;1;0;0;1" keyTimes="${kt}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;
      dots += `<circle r="3.6" class="pdn-flow-dot" fill="${color}"><animateMotion dur="${dur}s" repeatCount="indefinite" begin="${begin}s"><mpath href="#${dischargeId}"/></animateMotion><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="${kt}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;

      markers += `
        <g class="pdn-cap-marker" transform="translate(${capX.toFixed(1)},${midY})">
          <rect class="pdn-cap-glow" x="${-boxW / 2 - 4}" y="${-boxH / 2 - 4}" width="${boxW + 8}" height="${boxH + 8}" rx="7" opacity="0">
            <animate attributeName="opacity" values="0;0;0.85;0.85;0" keyTimes="${kt}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
          </rect>
          <rect x="${-boxW / 2}" y="${-boxH / 2}" width="${boxW}" height="${boxH}" rx="4" fill="#0f1729" stroke="${color}" stroke-width="1.6"/>
          <rect x="${-boxW / 2 + 3}" y="${-boxH / 2 + 4}" width="${boxW - 6}" height="6" fill="${color}" opacity="0.55"/>
          <rect x="${-boxW / 2 + 3}" y="${boxH / 2 - 10}" width="${boxW - 6}" height="6" fill="${color}" opacity="0.55"/>
          <text x="0" y="${-boxH / 2 - 8}" text-anchor="middle" class="pdn-cap-refdes">${esc(refDes)}</text>
          <text x="0" y="4" text-anchor="middle" class="pdn-cap-label">${esc(formatCap(c.capacitance))}</text>
          <text x="0" y="${boxH / 2 + 13}" text-anchor="middle" class="pdn-cap-sub">${esc(c.package)}</text>
          <g class="pdn-qty-badge" transform="translate(${boxW / 2 + 2},${-boxH / 2 + 2})">
            <circle r="8"/>
            <text x="0" y="0.5">${c.quantity}</text>
          </g>
          <circle class="pdn-charge-led" cx="${-boxW / 2 - 2}" cy="${-boxH / 2 - 2}" r="3.2" fill="#38bdf8">
            <animate attributeName="fill" values="#38bdf8;#38bdf8;#fb923c;#fb923c;#38bdf8" keyTimes="${kt}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
            <animate attributeName="r" values="2.6;2.6;4.6;4.6;2.6" keyTimes="${kt}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
          </circle>
        </g>`;
    });

    // IC arrival: the wave reaches the device right as the last (smallest,
    // nearest-IC) capacitor finishes handing off current.
    const icFraction = 1;
    const icDur = T.toFixed(2);
    const icBegin = ((icFraction - peak) * T).toFixed(2);

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="presentation" class="pdn-board-svg">
        <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="16" class="pdn-board-pcb"/>
        <circle cx="26" cy="26" r="4" class="pdn-board-hole"/>
        <circle cx="${W - 26}" cy="26" r="4" class="pdn-board-hole"/>
        <circle cx="26" cy="${H - 22}" r="4" class="pdn-board-hole"/>
        <circle cx="${W - 26}" cy="${H - 22}" r="4" class="pdn-board-hole"/>

        <!-- Section banners -->
        <g class="pdn-board-banner">
          <rect x="34" y="18" width="300" height="22" rx="4"/>
          <text x="184" y="33" text-anchor="middle">POWER SUPPLY</text>
        </g>
        <g class="pdn-board-banner">
          <rect x="${bankLeftX - 10}" y="18" width="${icX + icHalfW - (bankLeftX - 10)}" height="22" rx="4"/>
          <text x="${(bankLeftX - 10 + icX + icHalfW) / 2}" y="33" text-anchor="middle">${esc(vddLabel)} POWER RAIL</text>
        </g>

        <!-- Shared VDD / GND rails. The power-rail dots ride one cascade
             period T, in phase with every capacitor's charge flash below,
             so current visibly moves regulator → bulk cap → ... → IC. -->
        <path id="pdn-rail-power" d="M ${railLeftX} ${railY1} L ${railEndX} ${railY1}" fill="none" opacity="0"/>
        <path id="pdn-rail-ground" d="M ${railEndX} ${railY2} L ${railLeftX} ${railY2}" fill="none" opacity="0"/>
        <line x1="${railLeftX}" y1="${railY1}" x2="${railEndX}" y2="${railY1}" class="pdn-trace-vrm"/>
        <line x1="${railLeftX}" y1="${railY2}" x2="${railEndX}" y2="${railY2}" class="pdn-trace-ground-return"/>
        <circle r="3.6" class="pdn-flow-dot" fill="#f59e0b"><animateMotion dur="${T.toFixed(2)}s" repeatCount="indefinite"><mpath href="#pdn-rail-power"/></animateMotion></circle>
        <circle r="3.6" class="pdn-flow-dot" fill="#f59e0b"><animateMotion dur="${T.toFixed(2)}s" repeatCount="indefinite" begin="${(-T / 2).toFixed(2)}s"><mpath href="#pdn-rail-power"/></animateMotion></circle>
        <circle r="3.4" class="pdn-flow-dot" fill="#38bdf8"><animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#pdn-rail-ground"/></animateMotion></circle>
        <circle r="3.4" class="pdn-flow-dot" fill="#38bdf8"><animateMotion dur="2.4s" repeatCount="indefinite" begin="-1.2s"><mpath href="#pdn-rail-ground"/></animateMotion></circle>

        <!-- Power-supply components (inline on the rail, left → right) -->
        <g transform="translate(${dcX},${railY1})">
          <rect x="-16" y="-13" width="32" height="26" rx="3" class="pdn-comp-body"/>
          <circle r="6" fill="none" stroke="#cbd5e1" stroke-width="1.4"/>
          <circle r="1.6" fill="#cbd5e1"/>
        </g>
        <text x="${dcX}" y="${railY1 + 30}" text-anchor="middle" class="pdn-comp-label">DC IN</text>

        <g transform="translate(${d1X},${railY1})">
          <rect x="-11" y="-7" width="22" height="14" rx="2" class="pdn-comp-body"/>
          <rect x="5" y="-7" width="3" height="14" fill="#cbd5e1"/>
        </g>
        <text x="${d1X}" y="${railY1 + 24}" text-anchor="middle" class="pdn-comp-label">D1</text>

        <g transform="translate(${l1X},${railY1})">
          <rect x="-15" y="-9" width="30" height="18" rx="3" class="pdn-comp-body"/>
          <path d="M -9 0 A 3 3 0 0 1 -3 0 A 3 3 0 0 1 3 0 A 3 3 0 0 1 9 0" class="pdn-comp-line" fill="none"/>
        </g>
        <text x="${l1X}" y="${railY1 + 26}" text-anchor="middle" class="pdn-comp-label">L1</text>

        ${supplyCapMarkup(cinX, railY1, railY2, 'CIN', '22µF')}

        <g class="pdn-vrm" transform="translate(${u1X},${railY1})">
          <rect x="${-u1W / 2}" y="${-u1H / 2}" width="${u1W}" height="${u1H}" rx="6"/>
          <text x="0" y="-6" text-anchor="middle" class="pdn-vrm-label">${esc(vddLabel)}</text>
          <text x="0" y="7" text-anchor="middle" class="pdn-vrm-sub">BUCK REG</text>
        </g>
        <text x="${u1X}" y="${railY1 - u1H / 2 - 8}" text-anchor="middle" class="pdn-cap-refdes" fill="#eafff2">U1</text>

        ${supplyCapMarkup(coutX, railY1, railY2, 'COUT', '47µF')}

        <!-- Decoupling bank + IC leads -->
        ${leads}
        ${dots}

        <path id="pdn-ic-vdd" d="M ${icX} ${railY1} L ${icX} ${icTopY}" fill="none" opacity="0"/>
        <path id="pdn-ic-gnd" d="M ${icX} ${icBotY} L ${icX} ${railY2}" fill="none" opacity="0"/>
        <line x1="${icX}" y1="${railY1}" x2="${icX}" y2="${icTopY}" class="pdn-trace-power"/>
        <line x1="${icX}" y1="${icBotY}" x2="${icX}" y2="${railY2}" class="pdn-trace-ground"/>
        <circle class="pdn-flow-dot" fill="#fbbf24"><animate attributeName="r" values="2;2;5;5;2" keyTimes="${kt}" dur="${icDur}s" begin="${icBegin}s" repeatCount="indefinite"/><animateMotion dur="${icDur}s" repeatCount="indefinite" begin="${icBegin}s"><mpath href="#pdn-ic-vdd"/></animateMotion></circle>
        <circle r="3.2" class="pdn-flow-dot" fill="#38bdf8"><animateMotion dur="1.1s" repeatCount="indefinite"><mpath href="#pdn-ic-gnd"/></animateMotion></circle>

        <g class="pdn-ic" transform="translate(0,0)">
          <rect x="${icX - icHalfW}" y="${icTopY}" width="${icHalfW * 2}" height="${icBotY - icTopY}" rx="8"/>
          ${icPinsMarkup(icX - icHalfW, icTopY + 18, icBotY - 18, 'left')}
          <text x="${icX}" y="${icTopY - 8}" text-anchor="middle" class="pdn-cap-refdes" fill="#eafff2">U2</text>
          <text x="${icX}" y="${midY - 6}" text-anchor="middle" class="pdn-ic-label">MCU / FPGA</text>
          <text x="${icX}" y="${midY + 12}" text-anchor="middle" class="pdn-ic-sub">VDD CORE</text>
        </g>

        ${markers}
      </svg>
      <div class="pdn-board-legend">
        <span><i class="pdn-legend-swatch pdn-legend-power"></i>Power (regulator → rail → IC); gold dot = charging, colored dot = discharging</span>
        <span><i class="pdn-legend-swatch pdn-legend-ground"></i>Ground return (IC/caps → rail → regulator), running in parallel</span>
      </div>`;
  }

  /* ── Oscilloscope view of the VDD rail ───────────────────────────────
     Draws one tile of a load-step response (sharp sag + damped ringback
     to baseline) and scrolls two copies of it left in a seamless loop —
     no per-frame JS, just a single <animateTransform>. Before a result
     exists this previews off the raw ripple/voltage inputs (neutral cyan);
     after a run it reflects the actual worst-case margin and turns
     green/red for pass/fail, matching the chart's target-impedance logic. */
  // Maps an actual noise frequency (Hz, 1 kHz..1 GHz) to a visible cycle
  // count on the illustrative scope timebase — the trace can't show a real
  // time axis at these frequencies, but a higher noise frequency should
  // still visibly ring tighter than a lower one.
  function noiseCycles(noiseFreq) {
    const f = Math.max(1e3, Math.min(1e9, noiseFreq || 1e5));
    const t = (Math.log10(f) - 3) / 6;
    return 3 + Math.max(0, Math.min(1, t)) * 13;
  }
  function scopeWaveform(tileW, midY, ampPx, points, ringCycles) {
    let d = '';
    const t0 = 0.1,
      evDur = 0.55;
    const ring = ringCycles || 4.5,
      hum = ring * 2;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      let y = midY + Math.sin(t * Math.PI * 2 * hum) * ampPx * 0.04;
      if (t >= t0 && t < t0 + evDur) {
        const tt = (t - t0) / evDur;
        y += Math.exp(-tt * 28) * ampPx * 0.9;
        y += Math.sin(tt * Math.PI * 2 * ring) * ampPx * 0.55 * Math.exp(-tt * 6.5);
      }
      const x = t * tileW;
      d += (i === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    return d.trim();
  }
  function buildTimePanel(vdd, ripplePct, effRipple, traceColor, noiseFreq) {
    const W = 720,
      H = 260,
      midY = H / 2;
    const ampPx = Math.max(6, Math.min(H * 0.26, effRipple * 5.5));
    const ringCycles = noiseCycles(noiseFreq);
    const path = scopeWaveform(W, midY, ampPx, 140, ringCycles);
    const dur = 3.2;
    const limitOffset = Math.max(8, Math.min(H * 0.32, ripplePct * 5.5));
    const vppMv = (vdd * (effRipple / 100) * 1000).toFixed(0);
    // Volts-per-pixel is fixed by where the ripple-limit lines sit, so the
    // axis stays put across preview/live states even as the trace itself
    // (drawn from effRipple) grows past it on a breach.
    const voltsPerPx = (vdd * (ripplePct / 100)) / limitOffset;

    let gridLines = '';
    for (let i = 0; i <= 12; i++) {
      const gx = (W * i) / 12;
      gridLines += `<line x1="${gx.toFixed(1)}" y1="0" x2="${gx.toFixed(1)}" y2="${H}" class="${i % 3 === 0 ? 'pdn-scope-grid-major' : 'pdn-scope-grid'}"/>`;
    }
    let yLabels = '';
    for (let j = 0; j <= 8; j++) {
      const gy = (H * j) / 8;
      gridLines += `<line x1="0" y1="${gy.toFixed(1)}" x2="${W}" y2="${gy.toFixed(1)}" class="${j % 2 === 0 ? 'pdn-scope-grid-major' : 'pdn-scope-grid'}"/>`;
      if (j % 2 === 0) {
        const volts = vdd - (gy - midY) * voltsPerPx;
        // j=0 is the top edge — push the label down into the screen;
        // j=8 is the bottom edge — pull it up into the screen.
        const offset = j === 8 ? -3 : 3;
        yLabels += `<text x="4" y="${(gy + offset).toFixed(1)}" class="pdn-scope-sub">${volts.toFixed(3)} V</text>`;
      }
    }

    return `
      <svg viewBox="0 0 ${W} ${H + 34}" class="pdn-scope-svg" role="presentation">
        <defs>
          <clipPath id="pdn-scope-clip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
        </defs>
        <rect x="0" y="0" width="${W}" height="${H}" class="pdn-scope-screen"/>
        <g>${gridLines}</g>
        <line x1="0" y1="${(midY - limitOffset).toFixed(1)}" x2="${W}" y2="${(midY - limitOffset).toFixed(1)}" class="pdn-scope-limit"/>
        <line x1="0" y1="${(midY + limitOffset).toFixed(1)}" x2="${W}" y2="${(midY + limitOffset).toFixed(1)}" class="pdn-scope-limit"/>
        <line x1="0" y1="${midY}" x2="${W}" y2="${midY}" class="pdn-scope-baseline"/>
        <g clip-path="url(#pdn-scope-clip)">
          <g>
            <path d="${path}" class="pdn-scope-trace" stroke="${traceColor}" transform="translate(0,0)"/>
            <path d="${path}" class="pdn-scope-trace" stroke="${traceColor}" transform="translate(${W},0)"/>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;${-W} 0"
              dur="${dur}s"
              repeatCount="indefinite"
            />
          </g>
        </g>
        ${yLabels}
        <text x="46" y="16" class="pdn-scope-label">CH1 · VDD (time)</text>
        <text x="${W - 10}" y="16" text-anchor="end" class="pdn-scope-label">ΔV ≈ ${vppMv} mV pp</text>
        <text x="${W - 10}" y="28" text-anchor="end" class="pdn-scope-sub">Ripple limit ${ripplePct.toFixed(1)}% · ring ≈ ${esc(formatFreq(noiseFreq || 0))}</text>
        <text x="46" y="${H + 20}" class="pdn-scope-sub">Time/div — illustrative sweep</text>
      </svg>`;
  }

  function renderScope(s, r) {
    const el = $('pdn-scope'),
      status = $('scope-status');
    if (!el) return;
    const vdd = s && Number.isFinite(s.vdd) ? s.vdd : 1.0;
    const ripplePct = s && Number.isFinite(s.ripple) ? s.ripple : 3;
    const current = s && Number.isFinite(s.current) && s.current > 0 ? s.current : 1;
    let effRipple = ripplePct,
      pass = null,
      noiseFreq;
    if (r) {
      // Physically grounded (Ohm's law): the step-load sag is the actual
      // current step times the PDN's worst-case impedance, so the trace
      // responds to both the input current and the capacitors selected
      // (which set r.worst / r.worstFrequency), not a fixed illustration.
      const vppEstimate = current * r.worst;
      effRipple = Math.min(60, Math.max(ripplePct * 0.1, (vppEstimate / vdd) * 100));
      pass = r.meetsTarget;
      noiseFreq = r.worstFrequency;
    } else {
      const targetZ = (s && CalculationEngine.target(s)) || (vdd * (ripplePct / 100)) / current;
      const vppEstimate = current * targetZ;
      effRipple = Math.min(60, Math.max(ripplePct * 0.5, (vppEstimate / vdd) * 100));
      const fStart = (s && s.fStart) || 1e4,
        fStop = (s && s.fStop) || 1e9;
      noiseFreq = Math.sqrt(fStart * fStop);
    }
    if (status) {
      status.textContent = r ? (pass ? 'Within target' : 'Breaches target') : 'Preview';
      status.className = 'badge ' + (r ? (pass ? 'badge-green' : 'badge-orange') : 'badge-gray');
    }
    const traceColor = r ? (pass ? '#4ade80' : '#f87171') : '#22d3ee';

    el.innerHTML = buildTimePanel(vdd, ripplePct, effRipple, traceColor, noiseFreq);
  }

  const StorageManager = {
    config() {
      return {
        version: 2,
        spec: ValidationManager.spec().s,
        manual: state.manual,
        mode: state.mode,
        savedAt: new Date().toISOString(),
      };
    },
    download(name, type, content) {
      const blob = new Blob([content], { type }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    save() {
      this.download(
        'pdn-configuration.json',
        'application/json',
        JSON.stringify(this.config(), null, 2)
      );
    },
    load(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const c = JSON.parse(reader.result);
          applyConfig(c);
          showAlert([]);
        } catch (e) {
          showAlert(['The selected configuration file is invalid.']);
        }
      };
      reader.readAsText(file);
    },
  };
  function applyConfig(c) {
    const s = c.spec || {};
    const values = {
      vdd: s.vdd,
      'delta-i': s.current,
      ripple: s.ripple,
      margin: s.margin,
      'f-start': s.fStart,
      'f-stop': s.fStop,
      points: s.points,
      'l-via': s.lVia * 1e9,
      'l-plane': s.lPlane * 1e9,
      'r-plane': s.rPlane * 1e3,
      'l-package': s.lPackage * 1e9,
      'max-iterations': s.maxIterations,
      'max-caps': s.maxCaps,
    };
    Object.entries(values).forEach(([id, v]) => {
      if (Number.isFinite(v)) $(id).value = v;
    });
    if (s.manualTarget) {
      $('manual-target-toggle').checked = true;
      $('manual-target').value = s.manualTarget * 1000;
      $('manual-target-wrap').hidden = false;
    }
    state.manual = Array.isArray(c.manual) ? c.manual : [];
    renderManual();
    setMode(c.mode || 'manual');
    updateTarget();
  }
  function exportCSV() {
    if (!state.result) {
      showAlert(['Run a simulation before exporting results.']);
      return;
    }
    const r = state.result,
      rows = [
        ['frequency_hz', 'impedance_ohm', 'target_ohm'],
        ...r.frequencies.map((f, i) => [f, r.zPdn[i], r.zTarget]),
      ];
    StorageManager.download(
      'pdn-response.csv',
      'text/csv',
      rows.map(row => row.join(',')).join('\n')
    );
  }
  function exportJSON() {
    if (!state.result) {
      showAlert(['Run a simulation before exporting results.']);
      return;
    }
    const r = state.result;
    StorageManager.download(
      'pdn-report.json',
      'application/json',
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          version: '2.0',
          configuration: StorageManager.config(),
          summary: {
            meetsTarget: r.meetsTarget,
            targetOhm: r.zTarget,
            worstOhm: r.worst,
            worstFrequencyHz: r.worstFrequency,
            marginDb: r.marginDb,
            totalCapacitors: r.totalCapacitors,
          },
          capacitors: r.selectedCapacitors.map(c => c.toJSON()),
          antiResonances: r.antiResonances,
          response: r.frequencies.map((f, i) => ({ frequencyHz: f, impedanceOhm: r.zPdn[i] })),
        },
        null,
        2
      )
    );
  }

  function onAction(action) {
    if (action === 'optimize') run('auto');
    if (action === 'simulate') run('manual');
    if (action === 'load-preset') loadPreset();
    if (action === 'clear') {
      state.manual = [];
      liveUpdateManual();
    }
    if (action === 'add-library') {
      const i = Number($('cap-select').value),
        qty = Math.max(1, Math.round(num('cap-qty', 1)));
      addCap(LIBRARY[i], qty);
    }
    if (action === 'add-custom') {
      const cap = {
        name: $('custom-name').value.trim(),
        capacitance: num('custom-cap'),
        esr: num('custom-esr'),
        esl: num('custom-esl'),
        package: $('custom-package').value.trim() || 'Custom',
        category: 'Custom',
        manufacturer: $('custom-maker').value.trim(),
      };
      const e = ValidationManager.cap(cap);
      if (e.length) showAlert(e);
      else {
        showAlert([]);
        addCap(cap, 1);
      }
    }
    if (action === 'sort' && state.result) {
      state.sortAsc = !state.sortAsc;
      renderResultTable(state.result);
    }
    if (action === 'export-csv') exportCSV();
    if (action === 'export-json') exportJSON();
    if (action === 'save') StorageManager.save();
    if (action === 'print') {
      if (!state.result) showAlert(['Run a simulation before printing a report.']);
      else window.print();
    }
  }
  function bind() {
    document.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) onAction(action);
      const mode = e.target.closest('[data-mode]')?.dataset.mode;
      if (mode) setMode(mode);
      const remove = e.target.closest('[data-cap-remove]');
      if (remove) {
        state.manual.splice(Number(remove.dataset.capRemove), 1);
        liveUpdateManual();
      }
      const duplicate = e.target.closest('[data-cap-duplicate]');
      if (duplicate) {
        state.manual[Number(duplicate.dataset.capDuplicate)].quantity++;
        liveUpdateManual();
      }
    });
    document.addEventListener('change', e => {
      if (e.target.id === 'manual-target-toggle') {
        $('manual-target-wrap').hidden = !e.target.checked;
        updateTarget();
      }
      if (e.target.matches('[data-cap-enable]')) {
        state.manual[Number(e.target.dataset.capEnable)].enabled = e.target.checked;
        liveUpdateManual();
      }
      if (e.target.matches('[data-cap-qty]')) {
        state.manual[Number(e.target.dataset.capQty)].quantity = Math.max(
          1,
          Math.round(Number(e.target.value) || 1)
        );
        liveUpdateManual();
      }
      if (e.target.id === 'load-file' && e.target.files[0]) StorageManager.load(e.target.files[0]);
    });
    document
      .querySelectorAll('.pdn-inputs input')
      .forEach(input => input.addEventListener('input', debounce(updateTarget, 100)));
    new MutationObserver(() => {
      if (state.result) renderChart(state.result);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener(
      'resize',
      debounce(() => {
        if (state.result && window.Plotly) Plotly.Plots.resize($('impedance-chart'));
      }, 150)
    );
  }
  function init() {
    populateLibrary();
    renderManual();
    bind();
    updateTarget();
    renderBoard(boardExampleCaps(), { example: true, vdd: num('vdd', 1) });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
