/**
 * ESD Protection Analyzer — Charts
 * Plotly-based ESD waveform and TVS capacitance visualizations.
 */
'use strict';

(function () {
  /* ── ESD Clamping Waveform (IEC 61000-4-2 model) ─────────────────────── */
  function generateIEC61000Waveform(ipp_A = 16) {
    // IEC 61000-4-2 current model: I(t) = Ip * (exp(-t/τ1) - exp(-t/τ2))
    // τ1 ≈ 60 ns, τ2 ≈ 1 ns (simplified two-exponential)
    const t_ns = [];
    const i_a = [];
    const n = 300;
    const t_max = 120; // ns

    for (let k = 0; k <= n; k++) {
      const t = (k / n) * t_max;
      t_ns.push(t);
      // Approximation: fast rise ~0.7 ns, exponential decay
      const iFast = ipp_A * Math.exp(-t / 2.5);
      const iSlow = ipp_A * 0.37 * Math.exp(-t / 60);
      const i = Math.max(0, iFast * (1 - Math.exp(-t / 0.7)) + iSlow * (1 - Math.exp(-t / 10)));
      i_a.push(parseFloat(i.toFixed(3)));
    }
    return { t_ns, i_a };
  }

  function generateClampingVoltage(i_a, vclamp_at_ipp, vrwm) {
    // Simple linear model: V rises with current above breakdown, clamps at Vc
    return i_a.map(i => {
      if (i < 0.001) return vrwm;
      const v = vrwm + (vclamp_at_ipp - vrwm) * Math.min(1, i / Math.max(...i_a));
      return parseFloat(v.toFixed(2));
    });
  }

  function drawWaveformChart(containerId, tvsPart, vrwm_v, vclamp_v, ipp_a) {
    const container = document.getElementById(containerId);
    if (!container || typeof Plotly === 'undefined') return;
    container.innerHTML = '';

    const { t_ns, i_a } = generateIEC61000Waveform(ipp_a);
    const v_v = generateClampingVoltage(i_a, vclamp_v, vrwm_v);

    const traceI = {
      x: t_ns,
      y: i_a,
      name: 'ESD Current (A)',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#f59e0b', width: 2.5 },
      yaxis: 'y',
    };

    const traceV = {
      x: t_ns,
      y: v_v,
      name: 'Clamped Voltage (V)',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#60a5fa', width: 2.5 },
      yaxis: 'y2',
    };

    const isDark = document.documentElement.dataset.theme !== 'light';
    const bgColor = 'transparent';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const fontFamily = 'var(--font-sans, system-ui, sans-serif)';

    const layout = {
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      margin: { t: 28, r: 60, b: 44, l: 54 },
      font: { family: fontFamily, size: 11, color: textColor },
      xaxis: {
        title: { text: 'Time (ns)', font: { size: 11, color: textColor } },
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        tickfont: { color: textColor },
        range: [0, 120],
      },
      yaxis: {
        title: { text: 'Current (A)', font: { size: 11, color: '#f59e0b' } },
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        tickfont: { color: '#f59e0b' },
      },
      yaxis2: {
        title: { text: 'Voltage (V)', font: { size: 11, color: '#60a5fa' } },
        overlaying: 'y',
        side: 'right',
        tickfont: { color: '#60a5fa' },
        gridcolor: 'transparent',
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.18,
        font: { size: 11, color: textColor },
        bgcolor: 'transparent',
      },
      annotations: [
        {
          x: 1,
          y: vclamp_v,
          xref: 'paper',
          yref: 'y2',
          text: `V_CLAMP = ${vclamp_v} V (${tvsPart})`,
          showarrow: false,
          font: { size: 10, color: '#60a5fa' },
          xanchor: 'right',
          yanchor: 'bottom',
        },
      ],
      showlegend: true,
    };

    const config = {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
      responsive: true,
    };

    Plotly.newPlot(container, [traceI, traceV], layout, config);
  }

  /* ── TVS Capacitance vs Data Rate Chart ──────────────────────────────── */
  const DATARATE_LIMITS = [
    { label: 'I2C 400kHz', rate: 0.0004, maxC: 50 },
    { label: 'UART 1Mbps', rate: 1, maxC: 30 },
    { label: 'SD Card 25MHz', rate: 25, maxC: 12 },
    { label: 'SPI 50MHz', rate: 50, maxC: 8 },
    { label: 'Ethernet 100Mbps', rate: 100, maxC: 5 },
    { label: 'USB 2.0 FS 12Mbps', rate: 12, maxC: 5 },
    { label: 'USB 2.0 HS 480Mbps', rate: 480, maxC: 1.0 },
    { label: 'HDMI 1.4 3.4Gbps', rate: 3400, maxC: 0.2 },
    { label: 'USB 3.0 SS 5Gbps', rate: 5000, maxC: 0.15 },
    { label: 'USB 3.1 10Gbps', rate: 10000, maxC: 0.1 },
  ];

  function drawCapacitanceChart(containerId, activeParts) {
    const container = document.getElementById(containerId);
    if (!container || typeof Plotly === 'undefined') return;
    container.innerHTML = '';

    const { TVS_DB } = window.EsdCalc;
    const isDark = document.documentElement.dataset.theme !== 'light';
    const bgColor = 'transparent';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Limit line (max C vs data rate)
    const limitX = DATARATE_LIMITS.map(d => d.rate);
    const limitY = DATARATE_LIMITS.map(d => d.maxC);

    const traces = [];

    // Limit boundary
    traces.push({
      x: limitX,
      y: limitY,
      name: 'Max C_LINE limit',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#ef4444', width: 2, dash: 'dash' },
    });

    // TVS device points
    const parts = activeParts || Object.keys(TVS_DB);
    const colors = [
      '#60a5fa',
      '#34d399',
      '#f59e0b',
      '#a78bfa',
      '#fb923c',
      '#f472b6',
      '#22d3ee',
      '#4ade80',
    ];

    parts.forEach((partKey, idx) => {
      const dev = TVS_DB[partKey];
      if (!dev) return;
      const cPf = parseFloat(dev.cline);
      if (isNaN(cPf)) return;

      // Find data rates where this TVS is suitable (C < max limit)
      const suitableRates = DATARATE_LIMITS.filter(d => cPf <= d.maxC).map(d => d.rate);

      const maxRate = suitableRates.length ? Math.max(...suitableRates) : 0;

      traces.push({
        x: [maxRate > 0 ? maxRate * 1.5 : 0.1],
        y: [cPf],
        name: partKey,
        type: 'scatter',
        mode: 'markers+text',
        marker: { color: colors[idx % colors.length], size: 10, symbol: 'circle' },
        text: [partKey],
        textposition: 'top center',
        textfont: { size: 10, color: colors[idx % colors.length] },
      });
    });

    const layout = {
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      margin: { t: 20, r: 20, b: 50, l: 60 },
      font: { family: 'var(--font-sans, system-ui)', size: 11, color: textColor },
      xaxis: {
        title: { text: 'Data Rate (Mbps)', font: { size: 11, color: textColor } },
        type: 'log',
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        tickfont: { color: textColor },
      },
      yaxis: {
        title: { text: 'C_LINE (pF)', font: { size: 11, color: textColor } },
        type: 'log',
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        tickfont: { color: textColor },
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.22,
        font: { size: 10, color: textColor },
        bgcolor: 'transparent',
      },
      showlegend: true,
    };

    const config = {
      displayModeBar: false,
      responsive: true,
    };

    Plotly.newPlot(container, traces, layout, config);
  }

  /* ── Exports ──────────────────────────────────────────────────────────── */
  window.EsdCharts = { drawWaveformChart, drawCapacitanceChart };
})();
