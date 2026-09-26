/*
 * report.js — MTBF & Reliability Calculator
 * Export / report generation. Only CSV export, JSON config save/load, and
 * browser print are implemented — there is no PDF or Excel generation here.
 */
(function (global) {
  'use strict';

  function download(name, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Export the current component table + summary as a CSV file.
   * @param {Array<object>} rows
   * @param {object} summary
   */
  function exportComponentsCSV(rows) {
    const header = [
      'component',
      'quantity',
      'base_fit',
      'temperature_factor',
      'environment_factor',
      'calculated_fit',
    ];
    const lines = [header.join(',')];
    rows.forEach(r => {
      lines.push(
        [
          csvEscape(r.name),
          r.quantity,
          r.baseFIT,
          r.temperatureFactor.toFixed(4),
          r.environmentFactor.toFixed(4),
          r.calculatedFIT.toFixed(4),
        ].join(',')
      );
    });
    download('mtbf-components.csv', 'text/csv', lines.join('\n'));
  }

  /**
   * Export a full results CSV (summary + component breakdown).
   * @param {Array<object>} rows
   * @param {object} summary
   */
  function exportResultsCSV(rows, summary) {
    const lines = [];
    lines.push('MTBF & Reliability Calculator Report');
    lines.push('generated_at,' + new Date().toISOString());
    lines.push('');
    lines.push('metric,value');
    lines.push('total_fit,' + summary.totalFIT.toFixed(4));
    lines.push('lambda_per_hour,' + summary.lambda.toExponential(4));
    lines.push(
      'mtbf_hours,' +
        (Number.isFinite(summary.mtbfHours) ? summary.mtbfHours.toFixed(2) : 'Infinity')
    );
    lines.push(
      'mtbf_years,' +
        (Number.isFinite(summary.mtbfYears) ? summary.mtbfYears.toFixed(4) : 'Infinity')
    );
    lines.push('reliability_at_mission_time,' + summary.reliability.toFixed(6));
    lines.push('failure_probability_at_mission_time,' + summary.unreliability.toFixed(6));
    lines.push('availability,' + summary.availability.toFixed(6));
    lines.push('');
    lines.push('component,quantity,base_fit,temperature_factor,environment_factor,calculated_fit');
    rows.forEach(r => {
      lines.push(
        [
          csvEscape(r.name),
          r.quantity,
          r.baseFIT,
          r.temperatureFactor.toFixed(4),
          r.environmentFactor.toFixed(4),
          r.calculatedFIT.toFixed(4),
        ].join(',')
      );
    });
    download('mtbf-report.csv', 'text/csv', lines.join('\n'));
  }

  /**
   * Export the full configuration + results as JSON (also usable as a
   * loadable save file).
   * @param {object} config
   */
  function exportJSON(config) {
    download('mtbf-configuration.json', 'application/json', JSON.stringify(config, null, 2));
  }

  /**
   * Parse an imported CSV file of components.
   * Expected columns: component,quantity,base_fit (temperature/environment
   * factor columns are ignored on import since they are recalculated live).
   * @param {string} text raw CSV text
   * @returns {Array<{name:string, quantity:number, baseFIT:number}>}
   */
  function parseComponentsCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];
    const startIdx = /component/i.test(lines[0]) ? 1 : 0;
    const rows = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 3) continue;
      const name = cols[0].replace(/^"|"$/g, '').trim();
      const quantity = Number(cols[1]);
      const baseFIT = Number(cols[2]);
      if (!name) continue;
      rows.push({
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        baseFIT: Number.isFinite(baseFIT) && baseFIT >= 0 ? baseFIT : 0,
      });
    }
    return rows;
  }

  function csvEscape(value) {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  global.MTBF_REPORT = {
    download,
    exportComponentsCSV,
    exportResultsCSV,
    exportJSON,
    parseComponentsCSV,
  };
})(window);
