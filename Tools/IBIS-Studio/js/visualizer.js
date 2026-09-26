/**
 * visualizer.js — Rising Edge IBIS-Studio
 * Plotly-based chart rendering for IV curves, waveforms, and package data.
 *
 * Depends on: Plotly (CDN), IBISParser
 * Exports global: Visualizer
 */

const Visualizer = (function () {
  'use strict';

  let _parsed = null;
  let _activeModel = null;

  /* ─── Color palette aligned with Rising Edge design tokens ─────── */
  const COLORS = {
    typ: '#6366f1', // primary-400
    min: '#f59e0b', // amber
    max: '#10b981', // green
    grid: 'rgba(255,255,255,0.08)',
    paper: 'rgba(0,0,0,0)',
    font: '#a3a3b0',
    zero: 'rgba(255,255,255,0.15)',
  };

  function _isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function _layoutBase(title, xLabel, yLabel) {
    const dark = _isDark();
    return {
      title: {
        text: title,
        font: { color: dark ? '#e0e0f0' : '#1a1a2e', size: 13 },
      },
      paper_bgcolor: COLORS.paper,
      plot_bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      font: {
        color: dark ? COLORS.font : '#444',
        family: 'Inter, system-ui, sans-serif',
        size: 11,
      },
      margin: { t: 40, r: 16, b: 48, l: 56 },
      xaxis: {
        title: xLabel,
        gridcolor: dark ? COLORS.grid : 'rgba(0,0,0,0.08)',
        zerolinecolor: dark ? COLORS.zero : 'rgba(0,0,0,0.2)',
        zerolinewidth: 1,
      },
      yaxis: {
        title: yLabel,
        gridcolor: dark ? COLORS.grid : 'rgba(0,0,0,0.08)',
        zerolinecolor: dark ? COLORS.zero : 'rgba(0,0,0,0.2)',
        zerolinewidth: 1,
      },
      legend: { orientation: 'h', y: -0.18, font: { size: 10 } },
      hovermode: 'x unified',
    };
  }

  const PLOTLY_CONFIG = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'resetScale2d'],
    displaylogo: false,
    responsive: true,
  };

  /* ─── IV Curve chart ────────────────────────────────────────────── */
  function renderIV(model, containerId, tableKey, refKey, title) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const table = model[tableKey] || [];
    if (table.length === 0) {
      el.innerHTML = `<div class="chart-empty">No ${title} data</div>`;
      return;
    }

    const vRef = model[refKey]?.typ ?? 0;
    const voltages = table.map(pt => pt.v + vRef);

    const traces = [
      {
        x: voltages,
        y: table.map(p => p.typ),
        name: 'Typ',
        line: { color: COLORS.typ, width: 2 },
        type: 'scatter',
        mode: 'lines',
      },
      {
        x: voltages,
        y: table.map(p => p.min),
        name: 'Min',
        line: { color: COLORS.min, width: 1.5, dash: 'dot' },
        type: 'scatter',
        mode: 'lines',
      },
      {
        x: voltages,
        y: table.map(p => p.max),
        name: 'Max',
        line: { color: COLORS.max, width: 1.5, dash: 'dash' },
        type: 'scatter',
        mode: 'lines',
      },
    ].filter(t => t.y.some(v => !isNaN(v)));

    Plotly.newPlot(el, traces, _layoutBase(title, 'Voltage (V)', 'Current (A)'), PLOTLY_CONFIG);
  }

  /* ─── Waveform chart ─────────────────────────────────────────────── */
  function renderWaveform(waveforms, containerId, title) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!waveforms || waveforms.length === 0) {
      el.innerHTML = `<div class="chart-empty">No waveform data</div>`;
      return;
    }

    const traces = [];
    waveforms.forEach((wf, idx) => {
      const prefix = waveforms.length > 1 ? `WF${idx + 1} ` : '';
      const times = wf.points.map(p => p.t * 1e9); // ns
      traces.push({
        x: times,
        y: wf.points.map(p => p.typ),
        name: `${prefix}Typ`,
        line: { color: COLORS.typ, width: 2 },
        type: 'scatter',
        mode: 'lines',
      });
      if (wf.points.some(p => !isNaN(p.min))) {
        traces.push({
          x: times,
          y: wf.points.map(p => p.min),
          name: `${prefix}Min`,
          line: { color: COLORS.min, width: 1.5, dash: 'dot' },
          type: 'scatter',
          mode: 'lines',
        });
      }
      if (wf.points.some(p => !isNaN(p.max))) {
        traces.push({
          x: times,
          y: wf.points.map(p => p.max),
          name: `${prefix}Max`,
          line: { color: COLORS.max, width: 1.5, dash: 'dash' },
          type: 'scatter',
          mode: 'lines',
        });
      }
    });

    Plotly.newPlot(el, traces, _layoutBase(title, 'Time (ns)', 'Voltage (V)'), PLOTLY_CONFIG);
  }

  /* ─── Package parasitic bar chart ───────────────────────────────── */
  function renderPackage(comp, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const pkg = comp.package;
    if (!pkg || (!pkg.r && !pkg.l && !pkg.c)) {
      el.innerHTML = '<div class="chart-empty">No package data</div>';
      return;
    }

    const params = ['R_pkg', 'L_pkg', 'C_pkg'];
    const typVals = [pkg.r?.typ, pkg.l?.typ, pkg.c?.typ];
    const minVals = [pkg.r?.min, pkg.l?.min, pkg.c?.min];
    const maxVals = [pkg.r?.max, pkg.l?.max, pkg.c?.max];
    const units = ['Ω', 'H', 'F'];

    const traces = [
      {
        x: params,
        y: typVals.map((v, i) => _norm(v, i)),
        name: 'Typ',
        marker: { color: COLORS.typ },
        type: 'bar',
      },
      {
        x: params,
        y: minVals.map((v, i) => _norm(v, i)),
        name: 'Min',
        marker: { color: COLORS.min },
        type: 'bar',
      },
      {
        x: params,
        y: maxVals.map((v, i) => _norm(v, i)),
        name: 'Max',
        marker: { color: COLORS.max },
        type: 'bar',
      },
    ];

    const layout = {
      ..._layoutBase('Package Parasitics', '', 'Normalized Value'),
      barmode: 'group',
    };

    Plotly.newPlot(el, traces, layout, PLOTLY_CONFIG);
  }

  function _norm(v, idx) {
    if (isNaN(v) || v === null || v === undefined) return 0;
    // normalize by order of magnitude bucket: R ohms, L nH, C pF
    const scale = [1, 1e9, 1e12];
    return v * scale[idx];
  }

  /* ─── Pin model distribution pie ───────────────────────────────── */
  function renderModelDist(comp, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const modelCounts = {};
    (comp.pins || []).forEach(p => {
      modelCounts[p.modelName] = (modelCounts[p.modelName] || 0) + 1;
    });

    const labels = Object.keys(modelCounts);
    if (labels.length === 0) {
      el.innerHTML = '<div class="chart-empty">No pin data</div>';
      return;
    }

    const dark = _isDark();
    const trace = [
      {
        labels,
        values: labels.map(l => modelCounts[l]),
        type: 'pie',
        hole: 0.4,
        marker: {
          colors: ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#0ea5e9', '#a855f7', '#f97316'],
        },
        textfont: { color: dark ? '#e0e0f0' : '#1a1a2e' },
      },
    ];

    const layout = {
      ..._layoutBase('Pin Model Distribution', '', ''),
      showlegend: true,
    };

    Plotly.newPlot(el, trace, layout, PLOTLY_CONFIG);
  }

  /* ─── Summary dashboard population ──────────────────────────────── */
  function populateSummary(parsed) {
    const s = parsed.summary;
    const comp = parsed.components[0] || {};

    // File info bar
    _setEl('dash-filename', parsed.sourceFileName || parsed.fileName || '—');
    const metaBits = [];
    if (s.manufacturer) metaBits.push(s.manufacturer);
    if (s.version) metaBits.push('IBIS ' + s.version);
    if (s.date) metaBits.push(s.date);
    _setEl('dash-filemeta', metaBits.length ? metaBits.join(' · ') : '—');

    // Score pills
    _setEl('quality-score-val', IBISParser.computeQualityScore(parsed));
    _setEl('syntax-score-val', IBISParser.computeSyntaxScore(parsed));
    _setEl('sim-score-val', IBISParser.computeSimScore(parsed));

    // Summary grid cards
    _setEl('sum-version', s.version || '—');
    _setEl('sum-component', s.component);
    _setEl('sum-manufacturer', s.manufacturer || '—');
    _setEl('sum-pins', s.totalPins);
    _setEl('sum-models', s.totalModels);
    _setEl('sum-voltage', s.voltageRange);
    _setEl('sum-temp', s.tempRange);
    _setEl('sum-waveforms', s.hasWaveforms ? 'Yes' : 'No');

    // Tab content
    renderPinsTab(comp);
    renderModelsTab(comp);
    renderPackageTab(comp);
    renderChartSelectors(comp);
    renderWaveSelectors(comp);
    renderRawText(parsed);
    renderAiSummary(parsed);
  }

  function _setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '—';
  }

  /* ─── AI / engineering summary card ─────────────────────────────── */
  function renderAiSummary(parsed) {
    const el = document.getElementById('ai-summary-content');
    if (!el) return;
    const eng = IBISParser.generateEngineeringSummary(parsed);

    const issuesHtml =
      eng.issues.length === 0
        ? '<li class="no-issues">No issues detected</li>'
        : eng.issues.map(i => `<li class="issue-item">${i}</li>`).join('');

    el.innerHTML = `
      <div class="ai-summary-stats">
        <div><span class="stat-label">Quality Score</span><span class="stat-val">${eng.qualityScore}/100</span></div>
        <div><span class="stat-label">Complexity</span><span class="stat-val">${eng.complexity}</span></div>
        <div><span class="stat-label">Sim Readiness</span><span class="stat-val">${eng.simulationReadiness}</span></div>
      </div>
      <div class="ai-summary-apps"><strong>Likely application:</strong> ${eng.applications.join(', ')}</div>
      <ul class="ai-summary-issues">${issuesHtml}</ul>
    `;
  }

  /* ─── Pins tab ───────────────────────────────────────────────────── */
  function renderPinsTab(comp) {
    const tbody = document.getElementById('pins-tbody');
    const filterSel = document.getElementById('pin-filter-model');
    const searchInput = document.getElementById('pin-search');
    if (!tbody) return;

    const pins = comp.pins || [];
    const modelTypeByName = {};
    (comp.models || []).forEach(m => (modelTypeByName[m.name] = m.modelType || '—'));

    if (filterSel) {
      const names = Array.from(new Set(pins.map(p => p.modelName))).sort();
      filterSel.innerHTML =
        '<option value="">All models</option>' +
        names.map(n => `<option value="${n}">${n}</option>`).join('');
    }

    function draw() {
      const q = (searchInput?.value || '').toLowerCase().trim();
      const modelFilter = filterSel?.value || '';
      const rows = pins.filter(p => {
        if (modelFilter && p.modelName !== modelFilter) return false;
        if (!q) return true;
        return (
          String(p.number).toLowerCase().includes(q) ||
          (p.signalName || '').toLowerCase().includes(q) ||
          (p.modelName || '').toLowerCase().includes(q)
        );
      });

      tbody.innerHTML = rows.length
        ? rows
            .map(
              p => `<tr>
          <td>${p.number}</td>
          <td>${p.signalName || '—'}</td>
          <td>${p.modelName || '—'}</td>
          <td>${_fmtVal(p.rPin)}</td>
          <td>${_fmtVal(p.lPin)}</td>
          <td>${_fmtVal(p.cPin)}</td>
          <td>${modelTypeByName[p.modelName] || '—'}</td>
        </tr>`
            )
            .join('')
        : '<tr><td colspan="7" class="text-muted">No pins match</td></tr>';
    }

    draw();
    if (searchInput && !searchInput._wired) {
      searchInput._wired = true;
      searchInput.addEventListener('input', draw);
    }
    if (filterSel && !filterSel._wired) {
      filterSel._wired = true;
      filterSel.addEventListener('change', draw);
    }
  }

  function _fmtVal(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (v === 0) return '0';
    const exp = Math.floor(Math.log10(Math.abs(v)));
    return `${(v / Math.pow(10, exp)).toFixed(2)}e${exp}`;
  }

  /* ─── Models tab ─────────────────────────────────────────────────── */
  function renderModelsTab(comp) {
    const grid = document.getElementById('models-cards-grid');
    if (!grid) return;
    const models = comp.models || [];

    grid.innerHTML = models.length
      ? models
          .map(
            m => `
        <div class="card ibis-model-card">
          <h4>${m.name}</h4>
          <div class="ibis-model-meta">${m.modelType || 'Unknown'} · ${m.polarity || '—'}</div>
          <table class="ibis-model-mini-table">
            <tr><td>Voltage (typ)</td><td>${_fmtVal(m.voltageRange?.typ)} V</td></tr>
            <tr><td>C_comp (typ)</td><td>${_fmtVal(m.cComp?.typ)} F</td></tr>
            <tr><td>Pullup pts</td><td>${m.pullup.length}</td></tr>
            <tr><td>Pulldown pts</td><td>${m.pulldown.length}</td></tr>
            <tr><td>Pwr Clamp pts</td><td>${m.pwrClamp.length}</td></tr>
            <tr><td>Gnd Clamp pts</td><td>${m.gndClamp.length}</td></tr>
            <tr><td>Rising WF</td><td>${m.risingWaveforms.length}</td></tr>
            <tr><td>Falling WF</td><td>${m.fallingWaveforms.length}</td></tr>
          </table>
        </div>`
          )
          .join('')
      : '<div class="chart-empty">No models found</div>';
  }

  /* ─── Package tab ────────────────────────────────────────────────── */
  function renderPackageTab(comp) {
    const tbody = document.getElementById('package-tbody');
    const diagram = document.getElementById('package-diagram');
    const pkg = comp.package || {};

    if (tbody) {
      const rows = [
        ['R_pkg (Ω)', pkg.r],
        ['L_pkg (H)', pkg.l],
        ['C_pkg (F)', pkg.c],
      ];
      const hasAny = rows.some(([, v]) => v);
      tbody.innerHTML = hasAny
        ? rows
            .map(
              ([label, v]) =>
                `<tr><td>${label}</td><td>${_fmtVal(v?.typ)}</td><td>${_fmtVal(v?.min)}</td><td>${_fmtVal(v?.max)}</td></tr>`
            )
            .join('')
        : '<tr><td colspan="4" class="text-muted">No package data</td></tr>';
    }

    if (diagram) {
      diagram.innerHTML = `
        <svg viewBox="0 0 220 140" width="100%" height="140">
          <rect x="40" y="30" width="140" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
          <text x="110" y="75" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.7">${comp.name || 'Component'}</text>
          <line x1="10" y1="50" x2="40" y2="50" stroke="currentColor" opacity="0.5"/>
          <line x1="10" y1="90" x2="40" y2="90" stroke="currentColor" opacity="0.5"/>
          <line x1="180" y1="50" x2="210" y2="50" stroke="currentColor" opacity="0.5"/>
          <line x1="180" y1="90" x2="210" y2="90" stroke="currentColor" opacity="0.5"/>
          <text x="110" y="130" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.5">Package parasitics (R/L/C) applied per pin lead</text>
        </svg>`;
    }
  }

  /* ─── Raw text tab ───────────────────────────────────────────────── */
  function renderRawText(parsed) {
    const pre = document.getElementById('ibis-raw-display');
    if (pre) pre.textContent = parsed.raw || '';
  }

  /* ─── Render all model charts ───────────────────────────────────── */
  function renderModelCharts() {
    if (!_activeModel || !_parsed) return;
    const comp = _parsed.components[0] || {};
    renderMainChart(_activeModel, _activeChartType);
    renderWaveChart(_activeModel, _activeWaveType);
  }

  /* ─── Ramp chart (dV/dt rate bars) ──────────────────────────────── */
  function renderRamp(model, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const ramp = model.ramp || {};
    if (!ramp.dvdtR && !ramp.dvdtF) {
      el.innerHTML = '<div class="chart-empty">No ramp data</div>';
      return;
    }
    const cats = ['Rising', 'Falling'];
    const typ = [ramp.dvdtR?.typ, ramp.dvdtF?.typ];
    const min = [ramp.dvdtR?.min, ramp.dvdtF?.min];
    const max = [ramp.dvdtR?.max, ramp.dvdtF?.max];
    const traces = [
      { x: cats, y: typ, name: 'Typ', type: 'bar', marker: { color: COLORS.typ } },
      { x: cats, y: min, name: 'Min', type: 'bar', marker: { color: COLORS.min } },
      { x: cats, y: max, name: 'Max', type: 'bar', marker: { color: COLORS.max } },
    ];
    const layout = { ..._layoutBase('Ramp Rate (dV/dt)', '', 'Rate'), barmode: 'group' };
    Plotly.newPlot(el, traces, layout, PLOTLY_CONFIG);
  }

  /* ─── Charts tab: model/type selectors + main chart dispatch ───── */
  let _activeChartType = 'pullup';
  let _activeWaveType = 'rising';

  function renderMainChart(model, chartType) {
    if (!model) {
      const el = document.getElementById('ibis-chart-main');
      if (el) el.innerHTML = '<div class="chart-empty">No model selected</div>';
      return;
    }
    switch (chartType) {
      case 'pullup':
        renderIV(model, 'ibis-chart-main', 'pullup', 'pullupRef', 'Pullup I(V)');
        break;
      case 'pulldown':
        renderIV(model, 'ibis-chart-main', 'pulldown', 'pulldownRef', 'Pulldown I(V)');
        break;
      case 'pwr-clamp':
        renderIV(model, 'ibis-chart-main', 'pwrClamp', 'pwrClampRef', 'Power Clamp I(V)');
        break;
      case 'gnd-clamp':
        renderIV(model, 'ibis-chart-main', 'gndClamp', 'gndClampRef', 'GND Clamp I(V)');
        break;
      case 'ramp':
        renderRamp(model, 'ibis-chart-main');
        break;
    }
  }

  function renderWaveChart(model, waveType) {
    if (!model) {
      const el = document.getElementById('ibis-wave-chart');
      if (el) el.innerHTML = '<div class="chart-empty">No model selected</div>';
      return;
    }
    if (waveType === 'rising') {
      renderWaveform(model.risingWaveforms, 'ibis-wave-chart', 'Rising Waveform');
    } else if (waveType === 'falling') {
      renderWaveform(model.fallingWaveforms, 'ibis-wave-chart', 'Falling Waveform');
    } else {
      renderWaveform(
        [...(model.risingWaveforms || []), ...(model.fallingWaveforms || [])],
        'ibis-wave-chart',
        'Rising + Falling Waveform'
      );
    }
  }

  function renderChartSelectors(comp) {
    const sel = document.getElementById('chart-model-select');
    if (sel) {
      const models = comp.models || [];
      sel.innerHTML =
        '<option value="">Select model…</option>' +
        models.map((m, i) => `<option value="${i}">${m.name}</option>`).join('');
      if (models.length) {
        sel.value = '0';
      }
      if (!sel._wired) {
        sel._wired = true;
        sel.addEventListener('change', () => {
          const models2 = _parsed?.components[0]?.models || [];
          _activeModel = models2[parseInt(sel.value, 10)] || null;
          renderMainChart(_activeModel, _activeChartType);
        });
      }
    }

    document.querySelectorAll('.ibis-chart-type-btns [data-chart]').forEach(btn => {
      if (btn._wired) return;
      btn._wired = true;
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.ibis-chart-type-btns [data-chart]')
          .forEach(b => b.classList.toggle('active', b === btn));
        _activeChartType = btn.dataset.chart;
        renderMainChart(_activeModel, _activeChartType);
      });
    });
  }

  function renderWaveSelectors(comp) {
    const sel = document.getElementById('wave-model-select');
    if (sel) {
      const models = comp.models || [];
      sel.innerHTML =
        '<option value="">Select model…</option>' +
        models.map((m, i) => `<option value="${i}">${m.name}</option>`).join('');
      if (models.length) sel.value = '0';
      if (!sel._wired) {
        sel._wired = true;
        sel.addEventListener('change', () => {
          const models2 = _parsed?.components[0]?.models || [];
          const m = models2[parseInt(sel.value, 10)] || null;
          renderWaveChart(m, _activeWaveType);
        });
      }
    }

    document.querySelectorAll('.ibis-chart-type-btns [data-wave]').forEach(btn => {
      if (btn._wired) return;
      btn._wired = true;
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.ibis-chart-type-btns [data-wave]')
          .forEach(b => b.classList.toggle('active', b === btn));
        _activeWaveType = btn.dataset.wave;
        const waveSel = document.getElementById('wave-model-select');
        const models2 = _parsed?.components[0]?.models || [];
        const m = waveSel ? models2[parseInt(waveSel.value, 10)] || _activeModel : _activeModel;
        renderWaveChart(m, _activeWaveType);
      });
    });
  }

  /* ─── Tab switching (Pins / Models / Package / Charts / Waveforms / Raw) ─ */
  function initTabs() {
    document.querySelectorAll('.ibis-tab[data-tab]').forEach(btn => {
      if (btn._wired) return;
      btn._wired = true;
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.ibis-tab[data-tab]')
          .forEach(b => b.classList.toggle('active', b === btn));
        const target = 'tab-' + btn.dataset.tab;
        document.querySelectorAll('.ibis-tab-panel').forEach(panel => {
          panel.classList.toggle('active', panel.id === target);
        });
        if (btn.dataset.tab === 'charts') renderMainChart(_activeModel, _activeChartType);
        if (btn.dataset.tab === 'waveforms') renderWaveChart(_activeModel, _activeWaveType);
      });
    });
  }

  /* ─── Public API ─────────────────────────────────────────────────── */
  function load(parsed) {
    _parsed = parsed;
    const comp = parsed.components[0] || {};
    _activeModel = (comp.models || [])[0] || null;
    _activeChartType = 'pullup';
    _activeWaveType = 'rising';

    initTabs();
    populateSummary(parsed);
    renderModelCharts();
  }

  function onViewEnter() {
    // Re-render charts in case theme changed or container was hidden
    if (_parsed) {
      renderModelCharts();
    }
  }

  return { load, onViewEnter };
})();
