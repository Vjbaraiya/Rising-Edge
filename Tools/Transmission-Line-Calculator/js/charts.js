/**
 * Transmission Line Calculator — Charts
 * Plotly-based visualizations: Z0 vs trace width, Z0 vs dielectric height,
 * differential Zdiff vs pair spacing, and the live slider-driven simulation
 * chart. All charts re-theme automatically from the site's dark/light mode.
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
      toImageButtonOptions: { format: 'png', filename: 'transmission-line-calculator-chart' },
    };
  }

  function targetLine(y, label, color, c) {
    return {
      type: 'line',
      x0: 0,
      x1: 1,
      xref: 'paper',
      y0: y,
      y1: y,
      line: { color, width: 1.25, dash: 'dot' },
    };
  }

  function targetAnnotation(y, label, color, c) {
    return {
      x: 1,
      y,
      xref: 'paper',
      yref: 'y',
      text: label,
      showarrow: false,
      font: { size: 10, color },
      xanchor: 'right',
      yanchor: 'bottom',
      bgcolor: c.isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)',
    };
  }

  /* ── Chart 1: Z0 vs trace width sweep (microstrip) ───────────────────── */
  function drawWidthChart(containerId, base) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined' || typeof TLCSim === 'undefined') return;
    const c = themeColors();
    const sweep = TLCSim.widthSweep(base, 0.1, 3.5);

    const trace = {
      x: sweep.xs,
      y: sweep.ys,
      type: 'scatter',
      mode: 'lines',
      name: 'Z0 (Ω)',
      line: { color: '#60a5fa', width: 2.5 },
    };

    const marker = {
      x: [base.W],
      y: [window.TLCCalc.microstripZ0(base).z0],
      type: 'scatter',
      mode: 'markers',
      name: 'Current input',
      marker: { color: '#fbbf24', size: 10, line: { color: '#fff', width: 1 } },
      showlegend: false,
    };

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: 'Trace width W (mm)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Z0 (Ω)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      shapes: [targetLine(50, '50 Ω', '#34d399', c)],
      annotations: [targetAnnotation(50, '50 Ω target', '#34d399', c)],
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.24,
        font: { size: 10, color: c.text },
      },
      showlegend: true,
    };

    Plotly.newPlot(el, [trace, marker], layout, baseConfig());
  }

  /* ── Chart 2: Z0 vs dielectric height sweep (microstrip) ─────────────── */
  function drawHeightChart(containerId, base) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined' || typeof TLCSim === 'undefined') return;
    const c = themeColors();
    const sweep = TLCSim.heightSweep(base, 0.1, 2.4);

    const trace = {
      x: sweep.xs,
      y: sweep.ys,
      type: 'scatter',
      mode: 'lines',
      name: 'Z0 (Ω)',
      line: { color: '#22d3ee', width: 2.5 },
    };

    const marker = {
      x: [base.H],
      y: [window.TLCCalc.microstripZ0(base).z0],
      type: 'scatter',
      mode: 'markers',
      name: 'Current input',
      marker: { color: '#fbbf24', size: 10, line: { color: '#fff', width: 1 } },
      showlegend: false,
    };

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: 'Dielectric height H (mm)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Z0 (Ω)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      shapes: [targetLine(50, '50 Ω', '#34d399', c)],
      annotations: [targetAnnotation(50, '50 Ω target', '#34d399', c)],
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.24,
        font: { size: 10, color: c.text },
      },
      showlegend: true,
    };

    Plotly.newPlot(el, [trace, marker], layout, baseConfig());
  }

  /* ── Chart 3: Zdiff vs pair spacing sweep (differential microstrip) ──── */
  function drawSpacingChart(containerId, base) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined' || typeof TLCSim === 'undefined') return;
    const c = themeColors();
    const sweep = TLCSim.spacingSweep(base, 0.075, 2.0);

    const trace = {
      x: sweep.xs,
      y: sweep.ys,
      type: 'scatter',
      mode: 'lines',
      name: 'Zdiff (Ω)',
      line: { color: '#a78bfa', width: 2.5 },
    };

    const currentZ = window.TLCCalc.diffMicrostripZ0(base).zdiff;
    const marker = {
      x: [base.S],
      y: [currentZ],
      type: 'scatter',
      mode: 'markers',
      name: 'Current input',
      marker: { color: '#fbbf24', size: 10, line: { color: '#fff', width: 1 } },
      showlegend: false,
    };

    const tightRegion = {
      type: 'rect',
      x0: 0.075,
      x1: 0.3,
      xref: 'x',
      y0: 0,
      y1: 1,
      yref: 'paper',
      fillcolor: c.isDark ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.12)',
      line: { width: 0 },
    };

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: 'Pair spacing S, edge-to-edge (mm)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Differential impedance Zdiff (Ω)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      shapes: [
        tightRegion,
        targetLine(90, '90 Ω', '#34d399', c),
        targetLine(100, '100 Ω', '#fbbf24', c),
      ],
      annotations: [
        targetAnnotation(90, '90 Ω (USB/PCIe-class)', '#34d399', c),
        targetAnnotation(100, '100 Ω (HDMI-class)', '#fbbf24', c),
        {
          x: 0.19,
          y: 1,
          xref: 'x',
          yref: 'paper',
          text: 'Tight coupling',
          showarrow: false,
          font: { size: 9, color: c.text },
          yanchor: 'bottom',
        },
      ],
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.24,
        font: { size: 10, color: c.text },
      },
      showlegend: true,
    };

    Plotly.newPlot(el, [trace, marker], layout, baseConfig());
  }

  /* ── Live simulation chart (slider-driven) ───────────────────────────── */
  function drawSimChart(containerId, sweep, currentX, currentY, xLabel) {
    const el = document.getElementById(containerId);
    if (!el || typeof Plotly === 'undefined') return;
    const c = themeColors();

    const trace = {
      x: sweep.xs,
      y: sweep.ys,
      name: 'Z0',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#60a5fa', width: 2.5 },
      fill: 'tozeroy',
      fillcolor: 'rgba(96,165,250,0.08)',
    };
    const marker = {
      x: [currentX],
      y: [currentY],
      type: 'scatter',
      mode: 'markers',
      marker: { color: '#fbbf24', size: 11, line: { color: '#fff', width: 1 } },
      showlegend: false,
    };

    const layout = {
      paper_bgcolor: c.bg,
      plot_bgcolor: c.bg,
      margin: { t: 20, r: 20, b: 50, l: 54 },
      font: { family: c.font, size: 11, color: c.text },
      xaxis: {
        title: { text: xLabel, font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      yaxis: {
        title: { text: 'Z0 (Ω)', font: { size: 11, color: c.text } },
        gridcolor: c.grid,
        zerolinecolor: c.grid,
        tickfont: { color: c.text },
      },
      shapes: [targetLine(50, '50 Ω', '#34d399', c)],
      showlegend: false,
    };

    Plotly.react(el, [trace, marker], layout, baseConfig());
  }

  window.TLCCharts = {
    drawWidthChart,
    drawHeightChart,
    drawSpacingChart,
    drawSimChart,
    themeColors,
  };
})();
