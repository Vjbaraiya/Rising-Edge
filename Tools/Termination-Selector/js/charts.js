/**
 * Termination Selector — Charts
 * Plotly-based visualizations: reflection coefficient curve, receiver
 * waveform comparison, power dissipation comparison, and the live
 * slider-driven simulation chart.
 */
'use strict';

(function () {
  function themeColors() {
    const isDark = document.documentElement.dataset.theme !== 'light';
    return {
      isDark,
      bg: 'transparent',
      grid: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
      text: isDark ? '#94a3b8' : '#64748b',
      font: 'var(--font-sans, system-ui, sans-serif)',
    };
  }

  function baseConfig() {
    return {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d'],
      responsive: true,
      toImageButtonOptions: { format: 'png', filename: 'termination-selector-chart' },
    };
  }

  /* ── Chart 1: Reflection coefficient vs ZL/Z0 ────────────────────────────── */
  function drawReflectionChart(containerId) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined') return;
    const c = themeColors();

    const ratios = [];
    const gammas = [];
    for (let i = 0; i <= 200; i++) {
      const r = Math.pow(10, -2 + (i / 200) * 4); // 0.01 .. 100, log spaced
      ratios.push(r);
      gammas.push((r - 1) / (r + 1));
    }

    const trace = {
      x: ratios,
      y: gammas,
      type: 'scatter',
      mode: 'lines',
      name: 'Γ = (Z_L/Z0 − 1) / (Z_L/Z0 + 1)',
      line: { color: '#60a5fa', width: 2.5 },
    };

    const markers = {
      x: [0.001 + 1e-6, 1, 1000],
      y: [-1, 0, 1],
      type: 'scatter',
      mode: 'markers+text',
      name: 'Reference points',
      marker: { color: ['#f87171', '#34d399', '#fbbf24'], size: 10 },
      text: ['Short (Γ=−1)', 'Matched (Γ=0)', 'Open (Γ→+1)'],
      textposition: 'top center',
      textfont: { size: 10, color: c.text },
      showlegend: false,
    };

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: 'Z_L / Z0 (log scale)', font: { size: 11, color: c.text } },
        type: 'log',
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Reflection coefficient Γ', font: { size: 11, color: c.text } },
        range: [-1.1, 1.1],
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.24,
        font: { size: 10, color: c.text },
      },
      showlegend: true,
    };

    Plotly.newPlot(el, [trace, markers], layout, baseConfig());
  }

  /* ── Chart 2: Receiver waveform comparison ───────────────────────────────── */
  function drawWaveformChart(containerId, params) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined' || typeof TSSim === 'undefined') return;
    const c = themeColors();

    const scenarios = TSSim.threeScenarioComparison({
      z0: params.z0,
      rDriver: params.rDriver,
      vdd: params.vdd,
      lengthMm: params.lengthMm || 200,
    });

    function toStep(sim) {
      return { x: sim.tNs, y: sim.vReceiver };
    }

    const un = toStep(scenarios.unterminated);
    const se = toStep(scenarios.seriesTerm);
    const pa = toStep(scenarios.parallelTerm);

    const traces = [
      {
        x: un.x,
        y: un.y,
        name: 'Unterminated',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#f87171', width: 2, shape: 'hv' },
      },
      {
        x: se.x,
        y: se.y,
        name: 'Series terminated',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#60a5fa', width: 2, shape: 'hv' },
      },
      {
        x: pa.x,
        y: pa.y,
        name: 'Parallel terminated',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#34d399', width: 2, shape: 'hv' },
      },
    ];

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: 'Time (ns)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Receiver voltage (V)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.24,
        font: { size: 10, color: c.text },
      },
      showlegend: true,
    };

    Plotly.newPlot(el, traces, layout, baseConfig());
  }

  /* ── Chart 3: Power dissipation comparison ───────────────────────────────── */
  function drawPowerChart(containerId, params) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined') return;
    const c = themeColors();

    const z0 = params.z0;
    const vddValues = [];
    const parallelPower = [];
    const theveninPower = [];
    const seriesPower = [];

    for (let v = 0.9; v <= 6; v += 0.15) {
      vddValues.push(parseFloat(v.toFixed(2)));
      const parallel = window.TSCalc.parallelTermination({ z0, vdd: v, vtt: v / 2 });
      const thevenin = window.TSCalc.theveninTermination({ z0, vdd: v, vBias: v / 2 });
      parallelPower.push(parallel.powerHighW * 1000); // mW
      theveninPower.push(thevenin.staticPowerW * 1000); // mW
      seriesPower.push(0);
    }

    const traces = [
      {
        x: vddValues,
        y: parallelPower,
        name: 'Parallel to V_TT (mW)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#34d399', width: 2.5 },
      },
      {
        x: vddValues,
        y: theveninPower,
        name: 'Thevenin split (mW)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#fbbf24', width: 2.5 },
      },
      {
        x: vddValues,
        y: seriesPower,
        name: 'Series (≈0 static, mW)',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#60a5fa', width: 2.5, dash: 'dot' },
      },
    ];

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: 'Supply voltage V_DD (V)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Static power per terminated line (mW)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.24,
        font: { size: 10, color: c.text },
      },
      showlegend: true,
    };

    Plotly.newPlot(el, traces, layout, baseConfig());
  }

  /* ── Live simulation chart (slider-driven) ───────────────────────────────── */
  function drawSimChart(containerId, sim, meta) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined') return;
    const c = themeColors();

    const trace = {
      x: sim.tNs,
      y: sim.vReceiver,
      name: 'Receiver voltage',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#60a5fa', width: 2.5, shape: 'hv' },
      fill: 'tozeroy',
      fillcolor: 'rgba(96,165,250,0.08)',
    };

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: 'Time (ns)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Receiver voltage (V)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
        range: [-0.4 * meta.vdd, 2.2 * meta.vdd],
      },
      showlegend: false,
      annotations: [
        {
          x: 1,
          y: 1,
          xref: 'paper',
          yref: 'paper',
          text: `Γ_load = ${sim.gammaL.toFixed(2)}, Γ_source = ${sim.gammaS.toFixed(2)}`,
          showarrow: false,
          font: { size: 10, color: c.text },
          xanchor: 'right',
          yanchor: 'top',
        },
      ],
    };

    Plotly.react(el, [trace], layout, baseConfig());
  }

  window.TSCharts = {
    drawReflectionChart,
    drawWaveformChart,
    drawPowerChart,
    drawSimChart,
    themeColors,
  };
})();
