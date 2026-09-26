/**
 * Ferrite Bead Optimizer — Chart Rendering (Plotly.js)
 *
 * Exports window.FBCharts with render functions called by optimizer.js.
 * All charts follow the Rising Edge dark/light theme design system.
 */
(function (global) {
  'use strict';

  /* ── Plotly theme helpers ──────────────────────────────────────────────── */
  function isLight() {
    return document.documentElement.dataset.theme === 'light';
  }

  function themeColors() {
    return isLight()
      ? {
          bg: 'transparent',
          paper: '#ffffff',
          gridColor: 'rgba(0,0,0,0.08)',
          fontColor: '#334155',
          subColor: '#64748b',
          border: 'rgba(0,0,0,0.1)',
        }
      : {
          bg: 'transparent',
          paper: '#0f1729',
          gridColor: 'rgba(255,255,255,0.06)',
          fontColor: '#f1f5f9',
          subColor: '#94a3b8',
          border: 'rgba(255,255,255,0.07)',
        };
  }

  function baseLayout(title, xTitle, yTitle) {
    const t = themeColors();
    return {
      title: { text: title, font: { size: 13, color: t.fontColor, family: 'system-ui' } },
      paper_bgcolor: t.bg,
      plot_bgcolor: t.paper,
      font: { family: 'system-ui, sans-serif', size: 11, color: t.fontColor },
      xaxis: {
        title: { text: xTitle, font: { size: 11 } },
        gridcolor: t.gridColor,
        linecolor: t.border,
        zerolinecolor: t.gridColor,
        tickfont: { size: 10, color: t.subColor },
      },
      yaxis: {
        title: { text: yTitle, font: { size: 11 } },
        gridcolor: t.gridColor,
        linecolor: t.border,
        zerolinecolor: t.gridColor,
        tickfont: { size: 10, color: t.subColor },
      },
      margin: { l: 55, r: 20, t: 40, b: 50 },
      legend: { font: { size: 10, color: t.fontColor }, bgcolor: 'transparent' },
      hovermode: 'x unified',
    };
  }

  const PLOTLY_CONFIG = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
  };

  /* =========================================================================
     CHART 1: Impedance vs Frequency
     Shows |Z|, R, and X components for the selected bead.
  ========================================================================= */
  function renderImpedanceChart(divId, bead, biasMa, targetFreqMHz) {
    const sweep = FBCalc.impedanceSweep(bead, biasMa, 300);
    const layout = baseLayout('', 'Frequency (MHz)', 'Impedance (Ω)');
    layout.xaxis.type = 'log';
    layout.yaxis.type = 'log';
    layout.hovermode = 'x unified';

    const traces = [
      {
        x: sweep.freqMHz,
        y: sweep.z,
        name: '|Z| total',
        mode: 'lines',
        line: { color: '#60a5fa', width: 2.5 },
        hovertemplate: '%{y:.1f} Ω<extra>|Z|</extra>',
      },
      {
        x: sweep.freqMHz,
        y: sweep.r,
        name: 'R (resistive)',
        mode: 'lines',
        line: { color: '#34d399', width: 1.5, dash: 'dot' },
        hovertemplate: '%{y:.1f} Ω<extra>R</extra>',
      },
      {
        x: sweep.freqMHz,
        y: sweep.x.map(Math.abs),
        name: '|X| (reactive)',
        mode: 'lines',
        line: { color: '#a78bfa', width: 1.5, dash: 'dash' },
        hovertemplate: '%{y:.1f} Ω<extra>|X|</extra>',
      },
    ];

    // Target frequency vertical marker
    if (targetFreqMHz) {
      layout.shapes = [
        {
          type: 'line',
          x0: targetFreqMHz,
          x1: targetFreqMHz,
          y0: 0,
          y1: 1,
          yref: 'paper',
          line: { color: '#f59e0b', width: 1.5, dash: 'dash' },
        },
      ];
      layout.annotations = [
        {
          x: Math.log10(targetFreqMHz),
          y: 0.96,
          xref: 'x',
          yref: 'paper',
          text: `${targetFreqMHz} MHz`,
          showarrow: false,
          font: { size: 10, color: '#f59e0b' },
        },
      ];
    }

    // SRF marker
    layout.shapes = layout.shapes || [];
    layout.shapes.push({
      type: 'line',
      x0: bead.srf,
      x1: bead.srf,
      y0: 0,
      y1: 1,
      yref: 'paper',
      line: { color: '#f87171', width: 1, dash: 'dot' },
    });

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 2: Insertion Loss vs Frequency
  ========================================================================= */
  function renderInsertionLossChart(divId, bead, cOutF, biasMa, topology, targetFreqMHz, targetDb) {
    const cIn = cOutF;
    const sweep = FBCalc.insertionLossSweep(bead, cOutF, biasMa, topology, cIn, 300);
    const layout = baseLayout('', 'Frequency (MHz)', 'Insertion Loss (dB)');
    layout.xaxis.type = 'log';

    const traces = [
      {
        x: sweep.freqMHz,
        y: sweep.il,
        name: `Insertion Loss (${topology}-filter)`,
        mode: 'lines',
        line: { color: '#60a5fa', width: 2.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(96,165,250,0.06)',
        hovertemplate: '%{y:.1f} dB<extra>IL</extra>',
      },
    ];

    // Target attenuation line
    if (targetDb) {
      layout.shapes = [
        {
          type: 'line',
          x0: 1,
          x1: 3000,
          y0: targetDb,
          y1: targetDb,
          line: { color: '#f59e0b', width: 1.5, dash: 'dash' },
        },
      ];
      layout.annotations = [
        {
          x: 2.4,
          y: targetDb + 1,
          xref: 'x',
          yref: 'y',
          text: `Target ${targetDb} dB`,
          showarrow: false,
          font: { size: 10, color: '#f59e0b' },
        },
      ];
    }

    // Target frequency marker
    if (targetFreqMHz) {
      layout.shapes = layout.shapes || [];
      layout.shapes.push({
        type: 'line',
        x0: targetFreqMHz,
        x1: targetFreqMHz,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#f87171', width: 1.5, dash: 'dash' },
      });
    }

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 3: DC Bias Derating
  ========================================================================= */
  function renderDeratingChart(divId, bead, targetFreqHz, supplyCurrentMa) {
    const sweep = FBCalc.deratingSweep(bead, targetFreqHz, 150);
    const layout = baseLayout('', 'DC Current (mA)', 'Impedance (Ω)');

    const traces = [
      {
        x: sweep.currentMa,
        y: sweep.z,
        name: `Z @ ${Math.round(targetFreqHz / 1e6)} MHz vs DC bias`,
        mode: 'lines',
        line: { color: '#f59e0b', width: 2.5 },
        hovertemplate: 'I=%{x:.0f} mA → Z=%{y:.1f} Ω<extra></extra>',
      },
    ];

    // Operating point
    const opZ = FBCalc.beadImpedance(bead, targetFreqHz, supplyCurrentMa).z;
    traces.push({
      x: [supplyCurrentMa],
      y: [opZ],
      name: 'Operating point',
      mode: 'markers',
      marker: { color: '#ef4444', size: 10, symbol: 'circle' },
      hovertemplate: `I=${supplyCurrentMa} mA → Z=${opZ.toFixed(1)} Ω<extra>Op point</extra>`,
    });

    // Rated current line
    layout.shapes = [
      {
        type: 'line',
        x0: bead.iRated,
        x1: bead.iRated,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#f87171', width: 1, dash: 'dot' },
      },
    ];
    layout.annotations = [
      {
        x: bead.iRated,
        y: 0.9,
        xref: 'x',
        yref: 'paper',
        text: `I<sub>rated</sub>`,
        showarrow: false,
        font: { size: 10, color: '#f87171' },
      },
    ];

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 4: Resonance Analysis — bead + cap impedance showing resonance peak
  ========================================================================= */
  function renderResonanceChart(divId, bead, cOutF, topology) {
    const nPoints = 300;
    const freqMHz = [];
    const zFilter = [];
    const fMin = 0.1e6;
    const fMax = 3e9;

    for (let i = 0; i < nPoints; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / (nPoints - 1));
      const w = 2 * Math.PI * f;
      const zb = FBCalc.beadImpedance(bead, f, 0);
      const zcOut = 1 / (w * cOutF);

      // Series-resonant response of bead+cap network
      const zSeries = Math.abs(zb.z - zcOut); // simplified series combo
      freqMHz.push(f / 1e6);
      zFilter.push(zSeries);
    }

    const frMHz = FBCalc.resonanceFrequency(bead, cOutF) / 1e6;
    const layout = baseLayout('', 'Frequency (MHz)', 'Filter Impedance (Ω)');
    layout.xaxis.type = 'log';
    layout.yaxis.type = 'log';

    const traces = [
      {
        x: freqMHz,
        y: zFilter,
        name: 'Bead+Cout impedance',
        mode: 'lines',
        line: { color: '#a78bfa', width: 2 },
        hovertemplate: '%{y:.1f} Ω<extra></extra>',
      },
    ];

    layout.shapes = [
      {
        type: 'line',
        x0: frMHz,
        x1: frMHz,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#f87171', width: 1.5, dash: 'dash' },
      },
    ];
    layout.annotations = [
      {
        x: Math.log10(frMHz),
        y: 0.92,
        xref: 'x',
        yref: 'paper',
        text: `f<sub>res</sub> = ${frMHz.toFixed(1)} MHz`,
        showarrow: false,
        font: { size: 10, color: '#f87171' },
      },
    ];

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 5: PDN Noise Model
     Simplified PDN impedance: source Z (regulator) + bead + load cap
  ========================================================================= */
  function renderPdnChart(divId, bead, cOutF, supplyCurrentMa) {
    const nPoints = 300;
    const freqMHz = [];
    const zPdn = [];
    const zSource = [];
    const zLoad = [];

    const Rsource = 0.05; // ~50 mΩ regulator output impedance

    for (let i = 0; i < nPoints; i++) {
      const f = 1e6 * Math.pow(3000, i / (nPoints - 1));
      const w = 2 * Math.PI * f;
      const zb = FBCalc.beadImpedance(bead, f, supplyCurrentMa);
      const zcOut = 1 / (w * cOutF);

      // PDN impedance seen from load = Zsource + Zbead, in parallel with Zcout
      const zIn = Rsource + zb.z;
      const zParallel = (zIn * zcOut) / (zIn + zcOut + 1e-12);

      freqMHz.push(f / 1e6);
      zPdn.push(zParallel);
      zSource.push(Rsource);
      zLoad.push(zcOut);
    }

    const layout = baseLayout('PDN Impedance Profile', 'Frequency (MHz)', 'Impedance (Ω)');
    layout.xaxis.type = 'log';
    layout.yaxis.type = 'log';

    const traces = [
      {
        x: freqMHz,
        y: zPdn,
        name: 'PDN impedance (load side)',
        mode: 'lines',
        line: { color: '#60a5fa', width: 2.5 },
        hovertemplate: '%{y:.3f} Ω<extra>PDN</extra>',
      },
      {
        x: freqMHz,
        y: zLoad,
        name: 'Cout only',
        mode: 'lines',
        line: { color: '#34d399', width: 1.5, dash: 'dot' },
        hovertemplate: '%{y:.3f} Ω<extra>Cout</extra>',
      },
    ];

    // Target impedance line (rule of thumb: Ztarget = Vdd / (2 * Imax))
    const vdd = 3.3;
    const ztarget = (vdd * 0.05) / (supplyCurrentMa * 1e-3);
    layout.shapes = [
      {
        type: 'line',
        x0: 1,
        x1: 3000,
        y0: ztarget,
        y1: ztarget,
        line: { color: '#f59e0b', width: 1, dash: 'dash' },
      },
    ];
    layout.annotations = [
      {
        x: 2.8,
        y: Math.log10(ztarget) + 0.1,
        xref: 'x',
        yref: 'y',
        text: `Z<sub>target</sub>`,
        showarrow: false,
        font: { size: 10, color: '#f59e0b' },
      },
    ];

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 6: Bode Plot — transfer function H(jω) magnitude and phase
  ========================================================================= */
  function renderBodeChart(divId, bead, cOutF, biasMa, topology) {
    const nPoints = 300;
    const freqMHz = [];
    const magDb = [];
    const phase = [];
    const cIn = cOutF;

    for (let i = 0; i < nPoints; i++) {
      const f = 1e6 * Math.pow(3000, i / (nPoints - 1));
      const w = 2 * Math.PI * f;
      const zb = FBCalc.beadImpedance(bead, f, biasMa);
      const zcOut = 1 / (w * cOutF);

      // H = Zout / (Zout + Zbead) — voltage divider
      const zTot = zb.z + zcOut;
      const h = zcOut / (zTot + 1e-12);
      magDb.push(20 * Math.log10(Math.min(h, 1)));

      // Simplified phase: arctan(X / R) of transfer function
      const ph = -Math.atan2(zb.x, zb.r) * (180 / Math.PI);
      phase.push(ph);
      freqMHz.push(f / 1e6);
    }

    const t = themeColors();
    const layout = {
      ...baseLayout('Bode Plot', 'Frequency (MHz)', ''),
      yaxis: {
        title: { text: 'Magnitude (dB)', font: { size: 11 } },
        gridcolor: t.gridColor,
        linecolor: t.border,
        tickfont: { size: 10, color: t.subColor },
      },
      yaxis2: {
        title: { text: 'Phase (°)', font: { size: 11 } },
        overlaying: 'y',
        side: 'right',
        gridcolor: 'transparent',
        tickfont: { size: 10, color: '#a78bfa' },
      },
    };
    layout.xaxis.type = 'log';

    const traces = [
      {
        x: freqMHz,
        y: magDb,
        name: '|H(jω)| (dB)',
        mode: 'lines',
        line: { color: '#60a5fa', width: 2.5 },
        hovertemplate: '%{y:.1f} dB<extra>Magnitude</extra>',
      },
      {
        x: freqMHz,
        y: phase,
        name: 'Phase (°)',
        mode: 'lines',
        yaxis: 'y2',
        line: { color: '#a78bfa', width: 1.5, dash: 'dot' },
        hovertemplate: '%{y:.1f}°<extra>Phase</extra>',
      },
    ];

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 7: Topology Comparison
     Compare L, π, T filter insertion loss on the same axes.
  ========================================================================= */
  function renderTopologyChart(divId, bead, cOutF, biasMa, targetFreqMHz, targetDb) {
    const nPoints = 300;
    const freqMHz = [];
    const ilL = [];
    const ilPi = [];
    const ilT = [];
    const cIn = cOutF;

    for (let i = 0; i < nPoints; i++) {
      const f = 1e6 * Math.pow(3000, i / (nPoints - 1));
      freqMHz.push(f / 1e6);
      ilL.push(FBCalc.insertionLoss(bead, f, cOutF, biasMa, 'L', cIn));
      ilPi.push(FBCalc.insertionLoss(bead, f, cOutF, biasMa, 'pi', cIn));
      ilT.push(FBCalc.insertionLoss(bead, f, cOutF, biasMa, 'T', cIn));
    }

    const layout = baseLayout('', 'Frequency (MHz)', 'Insertion Loss (dB)');
    layout.xaxis.type = 'log';

    const traces = [
      {
        x: freqMHz,
        y: ilL,
        name: 'L-filter',
        mode: 'lines',
        line: { color: '#60a5fa', width: 2 },
        hovertemplate: '%{y:.1f} dB<extra>L</extra>',
      },
      {
        x: freqMHz,
        y: ilPi,
        name: 'π-filter',
        mode: 'lines',
        line: { color: '#34d399', width: 2 },
        hovertemplate: '%{y:.1f} dB<extra>π</extra>',
      },
      {
        x: freqMHz,
        y: ilT,
        name: 'T-filter',
        mode: 'lines',
        line: { color: '#f59e0b', width: 2 },
        hovertemplate: '%{y:.1f} dB<extra>T</extra>',
      },
    ];

    // Target line
    if (targetDb) {
      layout.shapes = [
        {
          type: 'line',
          x0: 1,
          x1: 3000,
          y0: targetDb,
          y1: targetDb,
          line: { color: '#f87171', width: 1, dash: 'dash' },
        },
      ];
      layout.annotations = [
        {
          x: 2.4,
          y: targetDb + 1,
          xref: 'x',
          yref: 'y',
          text: `Target ${targetDb} dB`,
          showarrow: false,
          font: { size: 10, color: '#f87171' },
        },
      ];
    }

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 8: Impedance vs Temperature
     Ferrite permeability decreases with temperature — model a simplified curve.
  ========================================================================= */
  function renderTemperatureChart(divId, bead, targetFreqHz) {
    // Temperature range -40°C to +125°C
    const temps = [];
    const zArr = [];
    for (let t = -40; t <= 125; t += 5) {
      temps.push(t);
      // Simplified: ferrite NiZn shows ~10-15% reduction per 50°C above 25°C
      // and ~5% increase below 25°C
      let tempFactor;
      if (t <= 25) {
        tempFactor = 1 + (25 - t) * 0.002; // slight increase when cold
      } else {
        tempFactor = 1 - (t - 25) * 0.003; // decrease when hot
      }
      tempFactor = Math.max(0.5, tempFactor);
      const result = FBCalc.beadImpedance(bead, targetFreqHz, 0);
      zArr.push(result.z * tempFactor);
    }

    const layout = baseLayout(
      '',
      'Temperature (°C)',
      `Z @ ${Math.round(targetFreqHz / 1e6)} MHz (Ω)`
    );

    const traces = [
      {
        x: temps,
        y: zArr,
        name: 'Z vs temperature',
        mode: 'lines',
        line: { color: '#f87171', width: 2.5 },
        hovertemplate: 'T=%{x}°C → Z=%{y:.1f} Ω<extra></extra>',
        fill: 'tozeroy',
        fillcolor: 'rgba(248,113,113,0.06)',
      },
    ];

    // 25°C nominal marker
    layout.shapes = [
      {
        type: 'line',
        x0: 25,
        x1: 25,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#60a5fa', width: 1, dash: 'dot' },
      },
    ];
    layout.annotations = [
      {
        x: 25,
        y: 0.9,
        xref: 'x',
        yref: 'paper',
        text: '25°C',
        showarrow: false,
        font: { size: 10, color: '#60a5fa' },
      },
    ];

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 9: Candidate Comparison — impedance at target freq for all candidates
  ========================================================================= */
  function renderCompareChart(divId, candidates, targetFreqHz, targetDb) {
    // Take top 8 candidates max
    const top = candidates.slice(0, 8);
    const names = top.map(c => c.bead.part);
    const zVals = top.map(c => c.zAtTarget);
    const colors = top.map(c =>
      c.status === 'pass' ? '#34d399' : c.status === 'marginal' ? '#f59e0b' : '#f87171'
    );

    const layout = baseLayout('', 'Candidate', `Z @ ${Math.round(targetFreqHz / 1e6)} MHz (Ω)`);
    layout.xaxis.tickangle = -30;

    const traces = [
      {
        x: names,
        y: zVals,
        type: 'bar',
        marker: { color: colors, opacity: 0.85 },
        hovertemplate: '%{y:.1f} Ω<extra></extra>',
        name: 'Z at target freq',
      },
    ];

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     CHART 10: Insertion Loss Comparison — all topologies for top candidate
  ========================================================================= */
  function renderInsertionLossComparison(divId, candidates, cOutF, biasMa) {
    // Top 3 candidates, insertion loss sweep
    const top3 = candidates.slice(0, 3);
    const layout = baseLayout(
      'Top Candidates — Insertion Loss',
      'Frequency (MHz)',
      'Insertion Loss (dB)'
    );
    layout.xaxis.type = 'log';
    const cIn = cOutF;
    const COLORS = ['#60a5fa', '#34d399', '#f59e0b'];
    const nPoints = 200;

    const traces = top3.map((cand, idx) => {
      const sweep = FBCalc.insertionLossSweep(cand.bead, cOutF, biasMa, 'L', cIn, nPoints);
      return {
        x: sweep.freqMHz,
        y: sweep.il,
        name: cand.bead.part,
        mode: 'lines',
        line: { color: COLORS[idx], width: 2 },
        hovertemplate: `%{y:.1f} dB<extra>${cand.bead.part}</extra>`,
      };
    });

    Plotly.newPlot(divId, traces, layout, PLOTLY_CONFIG);
  }

  /* =========================================================================
     EXPORTS
  ========================================================================= */
  global.FBCharts = {
    renderImpedanceChart,
    renderInsertionLossChart,
    renderDeratingChart,
    renderResonanceChart,
    renderPdnChart,
    renderBodeChart,
    renderTopologyChart,
    renderTemperatureChart,
    renderCompareChart,
    renderInsertionLossComparison,
  };
})(window);
