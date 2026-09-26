/*
 * charts.js — MTBF & Reliability Calculator
 * Chart.js chart builders. Lazily creates chart instances on first call and
 * updates them afterward. Reads CSS custom properties for theme-aware
 * colors so charts match the current data-theme (dark/light).
 */
(function (global) {
  'use strict';

  const instances = {};

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function theme() {
    return {
      text: cssVar('--text-sub', '#94a3b8'),
      grid: cssVar('--border', '#273244'),
      primary: cssVar('--primary-400', '#60a5fa'),
      success: cssVar('--success', '#10b981'),
      warning: cssVar('--warning', '#f59e0b'),
      danger: cssVar('--danger', '#ef4444'),
    };
  }

  const PALETTE = [
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

  function ensureCanvas(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    let canvas = container.querySelector('canvas');
    if (!canvas) {
      container.innerHTML = '';
      canvas = document.createElement('canvas');
      container.appendChild(canvas);
    }
    return canvas;
  }

  function baseOptions(t, extra) {
    return Object.assign(
      {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: { labels: { color: t.text } },
        },
        scales: {},
      },
      extra || {}
    );
  }

  /**
   * Reliability vs Time line chart.
   * @param {Array<{t:number, r:number}>} points
   */
  function renderReliabilityChart(points) {
    const canvas = ensureCanvas('reliability-chart');
    if (!canvas || !global.Chart) return;
    const t = theme();
    const data = {
      labels: points.map(p => p.t.toFixed(0)),
      datasets: [
        {
          label: 'Reliability R(t)',
          data: points.map(p => p.r),
          borderColor: t.success,
          backgroundColor: 'transparent',
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.15,
        },
      ],
    };
    const options = baseOptions(t, {
      scales: {
        x: {
          title: { display: true, text: 'Time (hours)', color: t.text },
          ticks: { color: t.text },
          grid: { color: t.grid },
        },
        y: {
          min: 0,
          max: 1,
          title: { display: true, text: 'Reliability', color: t.text },
          ticks: { color: t.text },
          grid: { color: t.grid },
        },
      },
    });
    if (instances.reliability) {
      instances.reliability.data = data;
      instances.reliability.options = options;
      instances.reliability.update();
    } else {
      instances.reliability = new Chart(canvas.getContext('2d'), { type: 'line', data, options });
    }
  }

  /**
   * Failure probability vs Time line chart.
   * @param {Array<{t:number, f:number}>} points
   */
  function renderFailureChart(points) {
    const canvas = ensureCanvas('failure-chart');
    if (!canvas || !global.Chart) return;
    const t = theme();
    const data = {
      labels: points.map(p => p.t.toFixed(0)),
      datasets: [
        {
          label: 'Failure probability F(t)',
          data: points.map(p => p.f),
          borderColor: t.danger,
          backgroundColor: 'transparent',
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.15,
        },
      ],
    };
    const options = baseOptions(t, {
      scales: {
        x: {
          title: { display: true, text: 'Time (hours)', color: t.text },
          ticks: { color: t.text },
          grid: { color: t.grid },
        },
        y: {
          min: 0,
          max: 1,
          title: { display: true, text: 'Probability of failure', color: t.text },
          ticks: { color: t.text },
          grid: { color: t.grid },
        },
      },
    });
    if (instances.failure) {
      instances.failure.data = data;
      instances.failure.options = options;
      instances.failure.update();
    } else {
      instances.failure = new Chart(canvas.getContext('2d'), { type: 'line', data, options });
    }
  }

  /**
   * MTBF comparison bar chart across the 4 standards.
   * @param {{iec61709:number, milhdbk217f:number, telcordia:number, custom:number}} mtbfByStandard hours
   */
  function renderComparisonChart(mtbfByStandard) {
    const canvas = ensureCanvas('comparison-chart');
    if (!canvas || !global.Chart) return;
    const t = theme();
    const labels = ['IEC 61709', 'MIL-HDBK-217F', 'Telcordia SR-332', 'Custom FIT'];
    const values = [
      mtbfByStandard.iec61709,
      mtbfByStandard.milhdbk217f,
      mtbfByStandard.telcordia,
      mtbfByStandard.custom,
    ].map(v => (Number.isFinite(v) ? v / 8760 : 0)); // convert to years for readability
    const data = {
      labels,
      datasets: [
        {
          label: 'MTBF (years)',
          data: values,
          backgroundColor: PALETTE.slice(0, 4),
        },
      ],
    };
    const options = baseOptions(t, {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: t.text }, grid: { color: t.grid } },
        y: {
          title: { display: true, text: 'MTBF (years)', color: t.text },
          ticks: { color: t.text },
          grid: { color: t.grid },
        },
      },
    });
    if (instances.comparison) {
      instances.comparison.data = data;
      instances.comparison.options = options;
      instances.comparison.update();
    } else {
      instances.comparison = new Chart(canvas.getContext('2d'), { type: 'bar', data, options });
    }
  }

  /**
   * Component contribution pie chart (% of total FIT).
   * @param {Array<{name:string, calculatedFIT:number}>} rows
   */
  function renderContributionChart(rows) {
    const canvas = ensureCanvas('contribution-chart');
    if (!canvas || !global.Chart) return;
    const t = theme();
    const sorted = [...rows].sort((a, b) => b.calculatedFIT - a.calculatedFIT);
    const top = sorted.slice(0, 9);
    const rest = sorted.slice(9);
    const labels = top.map(r => r.name);
    const values = top.map(r => r.calculatedFIT);
    if (rest.length) {
      labels.push('Other');
      values.push(rest.reduce((s, r) => s + r.calculatedFIT, 0));
    }
    const data = {
      labels,
      datasets: [{ data: values, backgroundColor: PALETTE.concat(['#64748b']) }],
    };
    const options = baseOptions(t, {
      plugins: { legend: { position: 'right', labels: { color: t.text } } },
    });
    if (instances.contribution) {
      instances.contribution.data = data;
      instances.contribution.options = options;
      instances.contribution.update();
    } else {
      instances.contribution = new Chart(canvas.getContext('2d'), { type: 'pie', data, options });
    }
  }

  /**
   * Pareto chart (bar of top FIT contributors + cumulative % line).
   * @param {Array<{name:string, calculatedFIT:number}>} rows
   */
  function renderParetoChart(rows) {
    const canvas = ensureCanvas('pareto-chart');
    if (!canvas || !global.Chart) return;
    const t = theme();
    const sorted = [...rows].sort((a, b) => b.calculatedFIT - a.calculatedFIT).slice(0, 10);
    const total = rows.reduce((s, r) => s + r.calculatedFIT, 0) || 1;
    let cum = 0;
    const cumPct = sorted.map(r => {
      cum += r.calculatedFIT;
      return (cum / total) * 100;
    });
    const data = {
      labels: sorted.map(r => r.name),
      datasets: [
        {
          type: 'bar',
          label: 'FIT contribution',
          data: sorted.map(r => r.calculatedFIT),
          backgroundColor: t.primary,
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line',
          label: 'Cumulative %',
          data: cumPct,
          borderColor: t.warning,
          backgroundColor: 'transparent',
          yAxisID: 'y1',
          pointRadius: 3,
          order: 1,
        },
      ],
    };
    const options = baseOptions(t, {
      scales: {
        x: { ticks: { color: t.text }, grid: { color: t.grid } },
        y: {
          position: 'left',
          title: { display: true, text: 'FIT', color: t.text },
          ticks: { color: t.text },
          grid: { color: t.grid },
        },
        y1: {
          position: 'right',
          min: 0,
          max: 100,
          title: { display: true, text: 'Cumulative %', color: t.text },
          ticks: { color: t.text },
          grid: { display: false },
        },
      },
    });
    if (instances.pareto) {
      instances.pareto.data = data;
      instances.pareto.options = options;
      instances.pareto.update();
    } else {
      instances.pareto = new Chart(canvas.getContext('2d'), { type: 'bar', data, options });
    }
  }

  /** Re-render all currently active charts (used on theme change). */
  function refreshTheme(lastState) {
    if (!lastState) return;
    if (lastState.reliabilityPoints) renderReliabilityChart(lastState.reliabilityPoints);
    if (lastState.reliabilityPoints) renderFailureChart(lastState.reliabilityPoints);
    if (lastState.mtbfByStandard) renderComparisonChart(lastState.mtbfByStandard);
    if (lastState.rows) renderContributionChart(lastState.rows);
    if (lastState.rows) renderParetoChart(lastState.rows);
  }

  global.MTBF_CHARTS = {
    renderReliabilityChart,
    renderFailureChart,
    renderComparisonChart,
    renderContributionChart,
    renderParetoChart,
    refreshTheme,
  };
})(window);
