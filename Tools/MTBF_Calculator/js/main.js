/*
 * main.js — MTBF & Reliability Calculator
 * Orchestration: DOM wiring, state management, table rendering, results
 * rendering, block-diagram builder, what-if analysis, save/load, export.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const CALC = window.MTBF_CALC;
  const LIBRARY = window.MTBF_COMPONENT_LIBRARY;
  const CHARTS = window.MTBF_CHARTS;
  const REPORT = window.MTBF_REPORT;

  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const num = (id, fallback = 0) => {
    const el = $(id);
    if (!el) return fallback;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : fallback;
  };
  const debounce = (fn, ms = 200) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };
  const STANDARD_EXPLAINERS = {
    iec61709:
      'IEC 61709: Reference-condition and pi-factor model widely used in European/industrial reliability engineering. This tool applies base FIT × temperature factor × environment factor consistently for all standards; the selector mainly documents intent and drives the comparison chart.',
    milhdbk217f:
      'MIL-HDBK-217F: U.S. military handbook using parts-count/parts-stress pi-factor methods (temperature, environment, quality). Historically influential and still widely referenced.',
    telcordia:
      'Telcordia SR-332: Common in telecom equipment reliability prediction, blending parts-count/parts-stress calculations with laboratory and field data options.',
    custom:
      'Custom FIT: Use this mode when you have supplier-qualified or test-derived FIT values for your exact components and want the model to reflect them directly without a standard-specific assumption.',
  };
  const ENV_LABELS = CALC.ENVIRONMENT_FACTORS;

  // ── State ──────────────────────────────────────────────────────────────
  const state = {
    rows: [], // {id, name, quantity, baseFIT}
    blockCount: 3,
    blockTopology: 'series',
    blockReliabilities: [0.99, 0.98, 0.97, 0.96, 0.95, 0.94],
    lastResult: null,
    idSeq: 1,
  };

  function newRowId() {
    return 'row-' + state.idSeq++;
  }

  // ── Alerts ─────────────────────────────────────────────────────────────
  function showAlert(messages) {
    const el = $('mtbf-alert');
    if (!messages || !messages.length) {
      el.hidden = true;
      return;
    }
    el.textContent = messages.join(' ');
    el.hidden = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Globals / conditions ──────────────────────────────────────────────
  function readGlobals() {
    const tempC = num('temperature', 25);
    const missionTimeRaw = num('mission-time', 8760);
    const missionUnit = $('mission-unit').value;
    const mttr = num('mttr', 4);
    const environment = $('environment').value;
    const standard = $('standard').value;
    const confidence = $('confidence').value;
    return {
      tempC,
      missionTime: CALC.toHours(missionTimeRaw, missionUnit),
      missionTimeRaw,
      missionUnit,
      mttr,
      environment,
      standard,
      confidence,
    };
  }

  function updateExplainers() {
    const g = readGlobals();
    $('standard-explainer').textContent = STANDARD_EXPLAINERS[g.standard] || '';
    const env = ENV_LABELS[g.environment];
    $('environment-explainer').textContent = env
      ? `${env.label}: environment factor (πE-style multiplier) = ${env.factor.toFixed(2)}×. Higher values represent harsher operating conditions and increase predicted failure rate.`
      : '';
    $('temperature-readout').textContent = g.tempC + '°C';
    $('confidence-note').textContent =
      `At ${g.confidence}% confidence, a formal statistical MTBF bound (based on observed failures and a chi-squared distribution) would typically report a range around the point estimate rather than a single value — higher confidence levels produce wider (more conservative) ranges. This tool reports the point estimate only.`;
  }

  // ── Component rows ────────────────────────────────────────────────────
  function addRow(data) {
    state.rows.push({
      id: newRowId(),
      name: data.name || 'New component',
      quantity: Math.max(1, Math.round(Number(data.quantity) || 1)),
      baseFIT: Math.max(0, Number(data.baseFIT) || 0),
    });
    renderTable();
    populateWhatifComponentSelect();
  }

  function removeRow(id) {
    state.rows = state.rows.filter(r => r.id !== id);
    renderTable();
    populateWhatifComponentSelect();
  }

  function duplicateRow(id) {
    const row = state.rows.find(r => r.id === id);
    if (!row) return;
    state.rows.push(Object.assign({}, row, { id: newRowId() }));
    renderTable();
    populateWhatifComponentSelect();
  }

  function computeRowFactors() {
    const g = readGlobals();
    const tFactor = CALC.temperatureFactor(g.tempC);
    const eFactor = CALC.environmentFactor(g.environment);
    return state.rows.map(r => {
      const calculatedFIT = CALC.rowFIT(r.baseFIT, r.quantity, tFactor, eFactor);
      return Object.assign({}, r, {
        temperatureFactor: tFactor,
        environmentFactor: eFactor,
        calculatedFIT,
      });
    });
  }

  function renderTable() {
    const tbody = $('component-table');
    if (!state.rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="mtbf-table-empty">No components added. Add from the library or add a blank row.</td></tr>';
      return;
    }
    const rows = computeRowFactors();
    tbody.innerHTML = rows
      .map(
        r => `<tr>
        <td><input class="input" type="text" data-row-field="name" data-row-id="${r.id}" value="${esc(r.name)}" aria-label="Component name"></td>
        <td><input class="input" type="number" min="1" step="1" data-row-field="quantity" data-row-id="${r.id}" value="${r.quantity}" aria-label="Quantity" style="width:70px"></td>
        <td><input class="input" type="number" min="0" step="0.1" data-row-field="baseFIT" data-row-id="${r.id}" value="${r.baseFIT}" aria-label="Base FIT" style="width:90px"></td>
        <td>${r.temperatureFactor.toFixed(3)}×</td>
        <td>${r.environmentFactor.toFixed(2)}×</td>
        <td><strong>${r.calculatedFIT.toFixed(2)}</strong></td>
        <td>
          <button class="btn btn-ghost btn-sm" data-row-action="duplicate" data-row-id="${r.id}" title="Duplicate" aria-label="Duplicate ${esc(r.name)}">⧉</button
          ><button class="btn btn-ghost btn-sm" data-row-action="remove" data-row-id="${r.id}" title="Remove" aria-label="Remove ${esc(r.name)}">✕</button>
        </td>
      </tr>`
      )
      .join('');
  }

  function populateLibrarySelect() {
    $('library-select').innerHTML = LIBRARY.map(
      (c, i) => `<option value="${i}">${esc(c.name)} (${c.baseFIT} FIT)</option>`
    ).join('');
    $('library-table').innerHTML = LIBRARY.map(
      c =>
        `<tr><td>${esc(c.name)}</td><td>${esc(c.category)}</td><td>${c.baseFIT}</td><td>${esc(c.note)}</td></tr>`
    ).join('');
  }

  function populateWhatifComponentSelect() {
    const sel = $('whatif-component');
    const current = sel.value;
    sel.innerHTML = state.rows.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    if (current && state.rows.some(r => r.id === current)) sel.value = current;
  }

  function loadExample() {
    state.rows = [
      { id: newRowId(), name: 'Microcontroller', quantity: 1, baseFIT: 25 },
      { id: newRowId(), name: 'FPGA', quantity: 1, baseFIT: 45 },
      { id: newRowId(), name: 'DDR Memory', quantity: 2, baseFIT: 30 },
      { id: newRowId(), name: 'Flash', quantity: 1, baseFIT: 20 },
      { id: newRowId(), name: 'Power Supply', quantity: 1, baseFIT: 60 },
      { id: newRowId(), name: 'Buck Converter', quantity: 3, baseFIT: 18 },
      { id: newRowId(), name: 'Capacitor', quantity: 40, baseFIT: 1 },
      { id: newRowId(), name: 'Resistor', quantity: 80, baseFIT: 0.2 },
      { id: newRowId(), name: 'Connector', quantity: 6, baseFIT: 4 },
      { id: newRowId(), name: 'Ethernet PHY', quantity: 1, baseFIT: 20 },
      { id: newRowId(), name: 'Fan', quantity: 1, baseFIT: 200 },
    ];
    $('standard').value = 'milhdbk217f';
    $('environment').value = 'industrial';
    $('temperature').value = 45;
    $('mission-time').value = 43800; // 5 years in hours
    $('mission-unit').value = 'hours';
    $('mttr').value = 4;
    updateExplainers();
    renderTable();
    populateWhatifComponentSelect();
    calculate();
  }

  // ── Calculation & results ────────────────────────────────────────────
  function calculate() {
    const g = readGlobals();
    const globalErrors = CALC.validateGlobals(g);
    const rowErrors = state.rows.flatMap(r => CALC.validateRow(r));
    const errors = globalErrors.concat(rowErrors);
    if (!state.rows.length) errors.push('Add at least one component before calculating.');
    showAlert(errors);
    if (errors.length) {
      $('result-status').textContent = 'Invalid inputs';
      $('result-status').className = 'badge badge-orange';
      return null;
    }

    const rows = computeRowFactors();
    const totalFIT = CALC.totalFIT(rows);
    const lambda = CALC.fitToLambda(totalFIT);
    const mtbfHoursVal = CALC.mtbfHours(lambda);
    const mtbfBreakdown = CALC.mtbfBreakdown(mtbfHoursVal);
    const r = CALC.reliability(lambda, g.missionTime);
    const f = CALC.unreliability(r);
    const avail = CALC.availability(mtbfHoursVal, g.mttr);

    // MTBF-by-standard comparison: since this simplified model applies the
    // same pi-factor math regardless of standard, we illustrate relative
    // handbook conservatism using representative scaling multipliers.
    const standardMultipliers = { iec61709: 1.0, milhdbk217f: 0.85, telcordia: 1.15, custom: 1.0 };
    const mtbfByStandard = {
      iec61709: mtbfHoursVal * standardMultipliers.iec61709,
      milhdbk217f: mtbfHoursVal * standardMultipliers.milhdbk217f,
      telcordia: mtbfHoursVal * standardMultipliers.telcordia,
      custom: mtbfHoursVal * standardMultipliers.custom,
    };

    const summary = {
      totalFIT,
      lambda,
      mtbfHours: mtbfHoursVal,
      mtbfYears: mtbfBreakdown.years,
      mtbfDays: mtbfBreakdown.days,
      reliability: r,
      unreliability: f,
      availability: avail,
      missionTimeHours: g.missionTime,
    };

    state.lastResult = { rows, summary, globals: g, mtbfByStandard };
    renderResults(state.lastResult);
    persistToStorage();
    return state.lastResult;
  }

  function fmtHours(h) {
    if (!Number.isFinite(h)) return '∞';
    if (h >= 8760) return (h / 8760).toFixed(2) + ' yr';
    if (h >= 24) return (h / 24).toFixed(1) + ' d';
    return h.toFixed(1) + ' h';
  }

  function renderResults(result) {
    const { rows, summary, mtbfByStandard } = result;
    $('result-status').textContent = 'Calculated';
    $('result-status').className = 'badge badge-green';
    $('stat-mtbf').textContent = fmtHours(summary.mtbfHours);
    $('stat-lambda').textContent = summary.lambda.toExponential(3) + ' /hr';
    $('stat-reliability').textContent = (summary.reliability * 100).toFixed(2) + '%';
    $('stat-availability').textContent = (summary.availability * 100).toFixed(4) + '%';

    const points = CALC.reliabilityCurve(
      summary.lambda,
      Math.max(summary.missionTimeHours * 2, summary.mtbfHours * 0.1 || 1),
      100
    );
    CHARTS.renderReliabilityChart(points);
    CHARTS.renderFailureChart(points);
    CHARTS.renderComparisonChart(mtbfByStandard);
    CHARTS.renderContributionChart(rows);
    CHARTS.renderParetoChart(rows);

    $('reliability-chart-summary').textContent =
      `Reliability starts at 100% and decays to ${(points[points.length - 1].r * 100).toFixed(1)}% by ${points[points.length - 1].t.toFixed(0)} hours, following R(t) = e^(-λt) with λ = ${summary.lambda.toExponential(3)} failures per hour.`;
    $('failure-chart-summary').textContent =
      `Cumulative failure probability rises from 0% to ${(points[points.length - 1].f * 100).toFixed(1)}% by ${points[points.length - 1].t.toFixed(0)} hours.`;
    $('comparison-chart-summary').textContent =
      `Estimated MTBF across standards: IEC 61709 ${fmtHours(mtbfByStandard.iec61709)}, MIL-HDBK-217F ${fmtHours(mtbfByStandard.milhdbk217f)}, Telcordia SR-332 ${fmtHours(mtbfByStandard.telcordia)}, Custom FIT ${fmtHours(mtbfByStandard.custom)}.`;
    const topContrib = [...rows].sort((a, b) => b.calculatedFIT - a.calculatedFIT)[0];
    $('contribution-chart-summary').textContent = topContrib
      ? `${topContrib.name} contributes the largest share of total FIT at ${topContrib.calculatedFIT.toFixed(2)} FIT of ${summary.totalFIT.toFixed(2)} total.`
      : '';
    $('pareto-chart-summary').textContent =
      'Pareto chart ranks components by FIT contribution with a cumulative percentage line to identify the top drivers of system failure rate.';

    renderRecommendations(result);
    renderBlockDiagram();
  }

  function renderRecommendations(result) {
    const { rows, summary, globals } = result;
    const out = [];
    const top = [...rows].sort((a, b) => b.calculatedFIT - a.calculatedFIT)[0];
    if (top && summary.totalFIT > 0 && top.calculatedFIT / summary.totalFIT > 0.3) {
      out.push([
        'warning',
        `${top.name} contributes over 30% of total FIT (${((top.calculatedFIT / summary.totalFIT) * 100).toFixed(0)}%). Consider derating, an automotive/industrial-grade part, or redundancy for this item.`,
      ]);
    }
    if (globals.tempC > 70) {
      out.push([
        'danger',
        `Operating temperature of ${globals.tempC}°C significantly accelerates failure rate via the Arrhenius model. Improve cooling or increase thermal margin if possible.`,
      ]);
    } else if (globals.tempC > 55) {
      out.push([
        'warning',
        `Operating temperature of ${globals.tempC}°C is elevated. Verify component temperature ratings and airflow.`,
      ]);
    }
    if (summary.availability < 0.99) {
      out.push([
        'warning',
        `Predicted availability (${(summary.availability * 100).toFixed(3)}%) is below 99%. Reducing MTTR or adding redundancy would improve uptime.`,
      ]);
    } else {
      out.push([
        'success',
        `Predicted availability is ${(summary.availability * 100).toFixed(3)}%, meeting a "three nines" or better target.`,
      ]);
    }
    if (summary.reliability < 0.9) {
      out.push([
        'danger',
        `Reliability at the specified mission time is only ${(summary.reliability * 100).toFixed(1)}%. Consider reducing mission time, redundancy, or lowering total FIT.`,
      ]);
    }
    const highQtyRow = rows.find(r => r.quantity > 50);
    if (highQtyRow) {
      out.push([
        '',
        `${highQtyRow.name} has a high instance count (${highQtyRow.quantity}). Verify quantity is correct — passive counts are a common source of overstated FIT.`,
      ]);
    }
    out.push([
      '',
      'Replace default library FIT values with datasheet or standard-specific data before using results for design sign-off.',
    ]);
    $('mtbf-recommendations').innerHTML = out
      .map(
        ([type, text]) =>
          `<div class="mtbf-rec ${type}"><span>${type === 'success' ? '✓' : type === 'danger' ? '!' : '→'}</span><span>${esc(text)}</span></div>`
      )
      .join('');
  }

  // ── Block diagram ─────────────────────────────────────────────────────
  function renderBlockRows() {
    const n = state.blockCount;
    while (state.blockReliabilities.length < n) state.blockReliabilities.push(0.95);
    const container = $('block-rows');
    container.innerHTML = Array.from({ length: n }, (_, i) => {
      return `<div class="mtbf-block-row">
        <label>Block ${i + 1} reliability (0–1)</label>
        <input class="input" type="number" min="0" max="1" step="0.001" data-block-index="${i}" value="${state.blockReliabilities[i].toFixed(3)}" aria-label="Reliability for block ${i + 1}">
      </div>`;
    }).join('');
  }

  function computeBlockReliability() {
    const n = state.blockCount;
    const rs = state.blockReliabilities.slice(0, n);
    const topology = state.blockTopology;
    let result;
    if (topology === 'series') {
      result = rs.reduce((p, r) => p * r, 1);
    } else if (topology === 'parallel') {
      result = 1 - rs.reduce((p, r) => p * (1 - r), 1);
    } else {
      // mixed: split into 2 groups, each group parallel, groups in series
      const mid = Math.ceil(rs.length / 2);
      const g1 = rs.slice(0, mid);
      const g2 = rs.slice(mid);
      const rg1 = 1 - g1.reduce((p, r) => p * (1 - r), 1);
      const rg2 = g2.length ? 1 - g2.reduce((p, r) => p * (1 - r), 1) : 1;
      result = rg1 * rg2;
    }
    return result;
  }

  function renderBlockDiagramSVG() {
    const n = state.blockCount;
    const rs = state.blockReliabilities.slice(0, n);
    const topology = state.blockTopology;
    const w = 120,
      h = 56,
      gap = 40;
    let svg = '';
    if (topology === 'series') {
      const totalW = n * w + (n - 1) * gap;
      svg = `<svg viewBox="0 0 ${totalW + 20} 100" width="100%" height="100" role="img" aria-hidden="true">`;
      rs.forEach((r, i) => {
        const x = 10 + i * (w + gap);
        svg += blockSvg(x, 22, w, h, `B${i + 1}`, r);
        if (i < n - 1)
          svg += `<line x1="${x + w}" y1="50" x2="${x + w + gap}" y2="50" stroke="var(--primary-400,#60a5fa)" stroke-width="2" marker-end="url(#arrow)"/>`;
      });
      svg += arrowDef() + '</svg>';
    } else if (topology === 'parallel') {
      const totalH = n * (h + 14);
      svg = `<svg viewBox="0 0 260 ${totalH + 20}" width="100%" height="${Math.min(totalH + 20, 260)}" role="img" aria-hidden="true">`;
      rs.forEach((r, i) => {
        const y = 10 + i * (h + 14);
        svg += `<line x1="10" y1="${y + h / 2}" x2="70" y2="${y + h / 2}" stroke="var(--primary-400,#60a5fa)" stroke-width="2"/>`;
        svg += blockSvg(70, y, w, h, `B${i + 1}`, r);
        svg += `<line x1="${70 + w}" y1="${y + h / 2}" x2="${70 + w + 60}" y2="${y + h / 2}" stroke="var(--primary-400,#60a5fa)" stroke-width="2"/>`;
      });
      svg += arrowDef() + '</svg>';
    } else {
      const mid = Math.ceil(n / 2);
      const g1 = rs.slice(0, mid);
      const g2 = rs.slice(mid);
      const groupH = Math.max(g1.length, g2.length) * (h + 14) + 10;
      svg = `<svg viewBox="0 0 460 ${groupH + 20}" width="100%" height="${Math.min(groupH + 20, 260)}" role="img" aria-hidden="true">`;
      g1.forEach((r, i) => {
        const y = 10 + i * (h + 14);
        svg += `<line x1="0" y1="${y + h / 2}" x2="20" y2="${y + h / 2}" stroke="var(--primary-400,#60a5fa)" stroke-width="2"/>`;
        svg += blockSvg(20, y, w, h, `A${i + 1}`, r);
        svg += `<line x1="${20 + w}" y1="${y + h / 2}" x2="230" y2="${y + h / 2}" stroke="var(--primary-400,#60a5fa)" stroke-width="2"/>`;
      });
      g2.forEach((r, i) => {
        const y = 10 + i * (h + 14);
        svg += `<line x1="230" y1="${y + h / 2}" x2="250" y2="${y + h / 2}" stroke="var(--primary-400,#60a5fa)" stroke-width="2"/>`;
        svg += blockSvg(250, y, w, h, `B${i + 1}`, r);
        svg += `<line x1="${250 + w}" y1="${y + h / 2}" x2="440" y2="${y + h / 2}" stroke="var(--primary-400,#60a5fa)" stroke-width="2"/>`;
      });
      svg += arrowDef() + '</svg>';
    }
    $('block-diagram').innerHTML = svg;
  }

  function blockSvg(x, y, w, h, label, r) {
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="var(--bg-alt,#0f172a)" stroke="var(--primary-400,#60a5fa)" stroke-width="1.5"/>
      <text x="${x + w / 2}" y="${y + h / 2 - 4}" text-anchor="middle" font-size="12" fill="var(--text-base,#f1f5f9)" font-weight="700">${label}</text>
      <text x="${x + w / 2}" y="${y + h / 2 + 14}" text-anchor="middle" font-size="11" fill="var(--text-sub,#94a3b8)">R=${r.toFixed(3)}</text>
    </g>`;
  }
  function arrowDef() {
    return '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="var(--primary-400,#60a5fa)"/></marker></defs>';
  }

  function renderBlockDiagram() {
    renderBlockDiagramSVG();
    const r = computeBlockReliability();
    $('block-result').textContent = r.toFixed(4) + ' (' + (r * 100).toFixed(2) + '%)';
  }

  // ── What-if analysis ─────────────────────────────────────────────────
  function runWhatif() {
    if (!state.rows.length) {
      showAlert(['Add components before running what-if analysis.']);
      return;
    }
    const base = calculate();
    if (!base) return;
    const g = readGlobals();
    const tempOverride = num('whatif-temp', g.tempC);
    const compId = $('whatif-component').value;
    const qtyMult = num('whatif-qty-mult', 1);
    const fitMult = num('whatif-fit-mult', 1);
    const timeMult = num('whatif-time-mult', 1);

    const tFactor = CALC.temperatureFactor(tempOverride);
    const eFactor = CALC.environmentFactor(g.environment);
    const adjustedRows = state.rows.map(r => {
      const isTarget = r.id === compId;
      const qty = isTarget ? r.quantity * qtyMult : r.quantity;
      const baseFIT = isTarget ? r.baseFIT * fitMult : r.baseFIT;
      return { name: r.name, calculatedFIT: CALC.rowFIT(baseFIT, qty, tFactor, eFactor) };
    });
    const totalFIT = CALC.totalFIT(adjustedRows);
    const lambda = CALC.fitToLambda(totalFIT);
    const mtbfHoursVal = CALC.mtbfHours(lambda);
    const missionTime = g.missionTime * timeMult;
    const r = CALC.reliability(lambda, missionTime);

    const baseMtbf = base.summary.mtbfHours;
    const baseR = base.summary.reliability;
    const deltaMtbfPct =
      Number.isFinite(baseMtbf) && baseMtbf > 0 ? ((mtbfHoursVal - baseMtbf) / baseMtbf) * 100 : 0;
    const deltaRPct = (r - baseR) * 100;

    const mtbfClass = deltaMtbfPct >= 0 ? 'mtbf-delta-down' : 'mtbf-delta-up'; // higher MTBF is good (down arrow= fewer failures narrative avoided; use sign)
    const rClass = deltaRPct >= 0 ? 'mtbf-delta-down' : 'mtbf-delta-up';

    $('whatif-result').innerHTML =
      `New MTBF: <strong>${fmtHours(mtbfHoursVal)}</strong> (<span class="${mtbfClass}">${deltaMtbfPct >= 0 ? '+' : ''}${deltaMtbfPct.toFixed(1)}%</span> vs baseline) &nbsp;·&nbsp; New reliability at mission time: <strong>${(r * 100).toFixed(2)}%</strong> (<span class="${rClass}">${deltaRPct >= 0 ? '+' : ''}${deltaRPct.toFixed(2)} pts</span>)`;
  }

  function applyPreset(preset) {
    if (!state.rows.length) {
      showAlert(['Add components before applying a what-if preset.']);
      return;
    }
    if (preset === 'capacitor-derate') {
      const caps = state.rows.filter(r => /capacitor/i.test(r.name));
      if (caps.length) {
        const worst = caps.sort((a, b) => b.baseFIT * b.quantity - a.baseFIT * a.quantity)[0];
        $('whatif-component').value = worst.id;
        $('whatif-fit-mult').value = 0.6;
        $('whatif-qty-mult').value = 1;
        $('whatif-temp').value = num('temperature', 25);
        $('whatif-time-mult').value = 1;
      }
    } else if (preset === 'fpga-cooling') {
      const fpga = state.rows.find(r => /fpga/i.test(r.name));
      if (fpga) {
        $('whatif-component').value = fpga.id;
        $('whatif-fit-mult').value = 0.75;
        $('whatif-qty-mult').value = 1;
        $('whatif-temp').value = num('temperature', 25);
        $('whatif-time-mult').value = 1;
      }
    } else if (preset === 'redundant-power') {
      $('block-topology').value = 'parallel';
      state.blockTopology = 'parallel';
      $('block-count').value = 2;
      state.blockCount = 2;
      renderBlockRows();
      renderBlockDiagram();
      showAlert([]);
      $('whatif-result').textContent =
        'Block diagram set to parallel redundancy for a 2-block power supply model. See "Reliability block diagram" above for the resulting system reliability.';
      return;
    } else if (preset === 'temp-increase') {
      $('whatif-temp').value = Math.min(125, num('temperature', 25) + 20);
      $('whatif-component').value = state.rows[0]?.id || '';
      $('whatif-fit-mult').value = 1;
      $('whatif-qty-mult').value = 1;
      $('whatif-time-mult').value = 1;
    }
    runWhatif();
  }

  // ── Save/load/export ──────────────────────────────────────────────────
  function buildConfig() {
    const g = readGlobals();
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      globals: {
        standard: g.standard,
        environment: g.environment,
        temperature: g.tempC,
        missionTime: g.missionTimeRaw,
        missionUnit: g.missionUnit,
        confidence: g.confidence,
        mttr: g.mttr,
      },
      rows: state.rows.map(r => ({ name: r.name, quantity: r.quantity, baseFIT: r.baseFIT })),
      blockDiagram: {
        topology: state.blockTopology,
        count: state.blockCount,
        reliabilities: state.blockReliabilities.slice(0, state.blockCount),
      },
      result: state.lastResult ? state.lastResult.summary : null,
    };
  }

  function applyConfig(c) {
    const g = c.globals || {};
    if (g.standard) $('standard').value = g.standard;
    if (g.environment) $('environment').value = g.environment;
    if (Number.isFinite(g.temperature)) $('temperature').value = g.temperature;
    if (Number.isFinite(g.missionTime)) $('mission-time').value = g.missionTime;
    if (g.missionUnit) $('mission-unit').value = g.missionUnit;
    if (g.confidence) $('confidence').value = g.confidence;
    if (Number.isFinite(g.mttr)) $('mttr').value = g.mttr;

    state.rows = Array.isArray(c.rows)
      ? c.rows.map(r => ({
          id: newRowId(),
          name: r.name,
          quantity: Math.max(1, r.quantity || 1),
          baseFIT: Math.max(0, r.baseFIT || 0),
        }))
      : [];

    if (c.blockDiagram) {
      state.blockTopology = c.blockDiagram.topology || 'series';
      state.blockCount = c.blockDiagram.count || 3;
      state.blockReliabilities =
        Array.isArray(c.blockDiagram.reliabilities) && c.blockDiagram.reliabilities.length
          ? c.blockDiagram.reliabilities.concat(new Array(6).fill(0.95)).slice(0, 6)
          : state.blockReliabilities;
      $('block-topology').value = state.blockTopology;
      $('block-count').value = state.blockCount;
    }

    updateExplainers();
    renderTable();
    populateWhatifComponentSelect();
    renderBlockRows();
    renderBlockDiagram();
  }

  const STORAGE_KEY = 'mtbf_calculator_state_v1';
  function persistToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildConfig()));
    } catch (e) {
      /* storage unavailable or full — ignore */
    }
  }
  function restoreFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const c = JSON.parse(raw);
      applyConfig(c);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────
  function onAction(action) {
    if (action === 'calculate') calculate();
    if (action === 'load-example') loadExample();
    if (action === 'add-row') addRow({ name: 'New component', quantity: 1, baseFIT: 5 });
    if (action === 'add-library') {
      const i = Number($('library-select').value);
      const qty = Math.max(1, Math.round(num('library-qty', 1)));
      const item = LIBRARY[i];
      if (item) addRow({ name: item.name, quantity: qty, baseFIT: item.baseFIT });
    }
    if (action === 'import-csv') $('csv-file').click();
    if (action === 'export-components-csv') {
      if (!state.rows.length) {
        showAlert(['Add components before exporting.']);
        return;
      }
      REPORT.exportComponentsCSV(computeRowFactors());
    }
    if (action === 'export-csv') {
      if (!state.lastResult) {
        showAlert(['Run a calculation before exporting results.']);
        return;
      }
      REPORT.exportResultsCSV(state.lastResult.rows, state.lastResult.summary);
    }
    if (action === 'export-json') {
      REPORT.exportJSON(buildConfig());
    }
    if (action === 'print') {
      if (!state.lastResult) {
        showAlert(['Run a calculation before printing a report.']);
        return;
      }
      window.print();
    }
    if (action === 'run-whatif') runWhatif();
  }

  function bind() {
    document.addEventListener('click', e => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) onAction(actionEl.dataset.action);

      const preset = e.target.closest('[data-preset]');
      if (preset) applyPreset(preset.dataset.preset);

      const rowAction = e.target.closest('[data-row-action]');
      if (rowAction) {
        const id = rowAction.dataset.rowId;
        if (rowAction.dataset.rowAction === 'remove') removeRow(id);
        if (rowAction.dataset.rowAction === 'duplicate') duplicateRow(id);
      }
    });

    document.addEventListener('input', e => {
      if (e.target.matches('[data-row-field]')) {
        const row = state.rows.find(r => r.id === e.target.dataset.rowId);
        if (!row) return;
        const field = e.target.dataset.rowField;
        if (field === 'name') row.name = e.target.value;
        else row[field] = Number(e.target.value) || 0;
      }
      if (e.target.matches('[data-block-index]')) {
        const idx = Number(e.target.dataset.blockIndex);
        const v = Number(e.target.value);
        state.blockReliabilities[idx] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
        renderBlockDiagram();
      }
      if (e.target.id === 'temperature') {
        $('temperature-readout').textContent = e.target.value + '°C';
      }
    });

    document.addEventListener(
      'input',
      debounce(e => {
        if (
          [
            'temperature',
            'environment',
            'standard',
            'mission-time',
            'mission-unit',
            'confidence',
            'mttr',
          ].includes(e.target.id)
        ) {
          updateExplainers();
        }
        if (e.target.matches('[data-row-field]')) renderTable();
      }, 150)
    );

    document.addEventListener('change', e => {
      if (
        e.target.id === 'standard' ||
        e.target.id === 'environment' ||
        e.target.id === 'confidence' ||
        e.target.id === 'mission-unit'
      ) {
        updateExplainers();
        renderTable();
      }
      if (e.target.id === 'block-topology') {
        state.blockTopology = e.target.value;
        renderBlockDiagram();
      }
      if (e.target.id === 'block-count') {
        state.blockCount = Math.min(6, Math.max(2, Math.round(Number(e.target.value) || 2)));
        e.target.value = state.blockCount;
        renderBlockRows();
        renderBlockDiagram();
      }
      if (e.target.id === 'csv-file' && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
          const rows = REPORT.parseComponentsCSV(reader.result);
          if (!rows.length) {
            showAlert(['The selected CSV file contained no valid component rows.']);
            return;
          }
          rows.forEach(r => addRow(r));
          showAlert([]);
        };
        reader.readAsText(e.target.files[0]);
        e.target.value = '';
      }
      if (e.target.id === 'load-file' && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            applyConfig(JSON.parse(reader.result));
            showAlert([]);
          } catch (err) {
            showAlert(['The selected configuration file is invalid.']);
          }
        };
        reader.readAsText(e.target.files[0]);
        e.target.value = '';
      }
    });

    new MutationObserver(() => {
      CHARTS.refreshTheme(
        state.lastResult
          ? {
              reliabilityPoints: CALC.reliabilityCurve(
                state.lastResult.summary.lambda,
                Math.max(
                  state.lastResult.summary.missionTimeHours * 2,
                  state.lastResult.summary.mtbfHours * 0.1 || 1
                ),
                100
              ),
              mtbfByStandard: state.lastResult.mtbfByStandard,
              rows: state.lastResult.rows,
            }
          : null
      );
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function init() {
    populateLibrarySelect();
    updateExplainers();
    if (!restoreFromStorage()) {
      renderTable();
      populateWhatifComponentSelect();
      renderBlockRows();
      renderBlockDiagram();
    }
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
