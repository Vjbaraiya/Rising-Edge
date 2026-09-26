/**
 * validator.js — Rising Edge IBIS-Studio
 * IBIS model validation engine with scored output.
 *
 * Depends on: IBISParser
 * Exports global: Validator
 */

const Validator = (function () {
  'use strict';

  /* ─── Severity levels ──────────────────────────────────────────── */
  const SEV = { ERROR: 'error', WARN: 'warn', INFO: 'info', PASS: 'pass' };

  /* ─── Rule definitions ─────────────────────────────────────────── */
  const RULES = [
    // ── File-level
    {
      id: 'R001',
      name: 'IBIS Version present',
      category: 'File Header',
      weight: 10,
      check: p =>
        p.version ? pass('IBIS version: ' + p.version) : fail('Missing [IBIS Ver] keyword'),
    },
    {
      id: 'R002',
      name: 'File name present',
      category: 'File Header',
      weight: 3,
      check: p =>
        p.fileName ? pass('File name: ' + p.fileName) : warn('Missing [File Name] keyword'),
    },
    {
      id: 'R003',
      name: 'Manufacturer present',
      category: 'File Header',
      weight: 3,
      check: p => {
        const mfr = p.manufacturer || p.components[0]?.manufacturer;
        return mfr ? pass(mfr) : warn('Missing [Manufacturer]');
      },
    },
    {
      id: 'R004',
      name: 'At least one component',
      category: 'Component',
      weight: 15,
      check: p =>
        p.components.length > 0
          ? pass(`${p.components.length} component(s)`)
          : fail('No [Component] block found'),
    },
    {
      id: 'R005',
      name: 'Component has pins',
      category: 'Pins',
      weight: 10,
      check: p => {
        const comp = p.components[0];
        if (!comp) return fail('No component');
        return comp.pins.length > 0
          ? pass(`${comp.pins.length} pin(s)`)
          : fail('No [Pin] data in component');
      },
    },
    {
      id: 'R006',
      name: 'All pins reference existing model',
      category: 'Pins',
      weight: 8,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const modelNames = new Set(comp.models.map(m => m.name));
        const bad = comp.pins.filter(
          pin => pin.modelName !== 'NC' && !modelNames.has(pin.modelName)
        );
        return bad.length === 0
          ? pass('All pin-to-model references valid')
          : warn(
              `${bad.length} pin(s) reference missing model(s): ${bad
                .slice(0, 3)
                .map(p => p.number)
                .join(', ')}…`
            );
      },
    },
    {
      id: 'R007',
      name: 'At least one model',
      category: 'Models',
      weight: 15,
      check: p => {
        const comp = p.components[0];
        return comp?.models?.length > 0
          ? pass(`${comp.models.length} model(s)`)
          : fail('No [Model] blocks found');
      },
    },
    {
      id: 'R008',
      name: 'Model_type set for each model',
      category: 'Models',
      weight: 8,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const bad = comp.models.filter(m => !m.modelType);
        return bad.length === 0
          ? pass('All models have Model_type')
          : warn(
              `${bad.length} model(s) missing Model_type: ${bad
                .slice(0, 3)
                .map(m => m.name)
                .join(', ')}`
            );
      },
    },
    {
      id: 'R009',
      name: 'Voltage range defined',
      category: 'Models',
      weight: 5,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const missing = comp.models.filter(m => isNaN(m.voltageRange.typ));
        return missing.length === 0
          ? pass('Voltage range defined in all models')
          : warn(`${missing.length} model(s) missing Voltage_range`);
      },
    },
    {
      id: 'R010',
      name: 'Pullup/Pulldown I(V) tables present (output models)',
      category: 'I(V) Tables',
      weight: 10,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const outputs = comp.models.filter(m => /output|io|3-state|open/i.test(m.modelType));
        if (outputs.length === 0) return info('No output models found');
        const missing = outputs.filter(m => m.pullup.length === 0 && m.pulldown.length === 0);
        return missing.length === 0
          ? pass(`All ${outputs.length} output model(s) have I(V) tables`)
          : warn(`${missing.length} output model(s) missing Pullup/Pulldown tables`);
      },
    },
    {
      id: 'R011',
      name: 'Power and GND clamp tables',
      category: 'I(V) Tables',
      weight: 5,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const hasEither = comp.models.some(m => m.pwrClamp.length > 0 || m.gndClamp.length > 0);
        return hasEither
          ? pass('Clamp tables found')
          : info('No power/GND clamp tables (optional for pure output models)');
      },
    },
    {
      id: 'R012',
      name: 'Rising/Falling waveform tables',
      category: 'Waveforms',
      weight: 8,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const hasWf = comp.models.some(
          m => m.risingWaveforms.length > 0 || m.fallingWaveforms.length > 0
        );
        return hasWf
          ? pass('Waveform tables found')
          : warn('No waveform tables — simulation accuracy limited to ramp data');
      },
    },
    {
      id: 'R013',
      name: 'Ramp data present',
      category: 'Waveforms',
      weight: 5,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const hasRamp = comp.models.some(m => m.ramp.dvdtR || m.ramp.dvdtF);
        return hasRamp
          ? pass('Ramp data found')
          : warn('No [Ramp] data — required for basic SI simulation');
      },
    },
    {
      id: 'R014',
      name: 'Package parasitics defined',
      category: 'Package',
      weight: 4,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const pkg = comp.package;
        return pkg?.r || pkg?.l || pkg?.c
          ? pass('Package R/L/C found')
          : info('No [Package] parasitics (may be in separate .pkg file)');
      },
    },
    {
      id: 'R015',
      name: 'C_comp defined for all models',
      category: 'Models',
      weight: 4,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const missing = comp.models.filter(m => isNaN(m.cComp.typ));
        return missing.length === 0
          ? pass('C_comp defined in all models')
          : info(`${missing.length} model(s) missing C_comp`);
      },
    },
    {
      id: 'R016',
      name: 'IBIS version ≥ 3.2',
      category: 'File Header',
      weight: 3,
      check: p => {
        if (!p.version) return skip('No version');
        const v = parseFloat(p.version);
        return v >= 3.2
          ? pass(`IBIS ${p.version} — modern spec`)
          : warn(`IBIS ${p.version} — consider updating to 5.0+`);
      },
    },
    {
      id: 'R017',
      name: 'Waveform time axis is monotonic',
      category: 'Waveforms',
      weight: 5,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        let issues = 0;
        comp.models.forEach(m => {
          [...m.risingWaveforms, ...m.fallingWaveforms].forEach(wf => {
            for (let i = 1; i < wf.points.length; i++) {
              if (wf.points[i].t <= wf.points[i - 1].t) issues++;
            }
          });
        });
        return issues === 0
          ? pass('All waveform time axes are monotonically increasing')
          : fail(`Non-monotonic time axis detected in ${issues} location(s)`);
      },
    },
    {
      id: 'R018',
      name: 'Pullup/Pulldown have ≥ 2 data points',
      category: 'I(V) Tables',
      weight: 4,
      check: p => {
        const comp = p.components[0];
        if (!comp) return skip('No component');
        const bad = comp.models.filter(
          m =>
            (m.pullup.length > 0 && m.pullup.length < 2) ||
            (m.pulldown.length > 0 && m.pulldown.length < 2)
        );
        return bad.length === 0
          ? pass('All I(V) tables have sufficient data points')
          : warn(`${bad.length} I(V) table(s) have fewer than 2 points`);
      },
    },
    {
      id: 'R019',
      name: 'Diff pins reference valid pins',
      category: 'Pins',
      weight: 3,
      check: p => {
        const comp = p.components[0];
        if (!comp || comp.diffPins.length === 0) return skip('No diff pins');
        const pinNums = new Set(comp.pins.map(p => p.number));
        const bad = comp.diffPins.filter(dp => !pinNums.has(dp.pinPos) || !pinNums.has(dp.pinNeg));
        return bad.length === 0
          ? pass(`${comp.diffPins.length} diff pin pair(s) validated`)
          : warn(`${bad.length} diff pin pair(s) reference undefined pins`);
      },
    },
  ];

  /* ─── Helper constructors ──────────────────────────────────────── */
  function pass(msg) {
    return { status: SEV.PASS, message: msg };
  }
  function fail(msg) {
    return { status: SEV.ERROR, message: msg };
  }
  function warn(msg) {
    return { status: SEV.WARN, message: msg };
  }
  function info(msg) {
    return { status: SEV.INFO, message: msg };
  }
  function skip(msg) {
    return { status: SEV.INFO, message: 'Skipped: ' + msg };
  }

  /* ─── Run all rules ─────────────────────────────────────────────── */
  function runValidation(parsed) {
    const results = RULES.map(rule => {
      let result;
      try {
        result = rule.check(parsed);
      } catch (e) {
        result = fail('Rule threw: ' + e.message);
      }
      return {
        id: rule.id,
        name: rule.name,
        category: rule.category,
        weight: rule.weight,
        ...result,
      };
    });

    // Compute scores
    const totalWeight = RULES.reduce((s, r) => s + r.weight, 0);
    const earned = results.reduce((s, r) => {
      if (r.status === SEV.PASS) return s + r.weight;
      if (r.status === SEV.WARN) return s + r.weight * 0.5;
      if (r.status === SEV.INFO) return s + r.weight * 0.8;
      return s; // ERROR = 0
    }, 0);

    const overallScore = Math.round((earned / totalWeight) * 100);

    const syntaxScore = IBISParser.computeSyntaxScore(parsed);
    const simScore = IBISParser.computeSimScore(parsed);
    const qualScore = IBISParser.computeQualityScore(parsed);

    const counts = {
      errors: results.filter(r => r.status === SEV.ERROR).length,
      warnings: results.filter(r => r.status === SEV.WARN).length,
      info: results.filter(r => r.status === SEV.INFO).length,
      pass: results.filter(r => r.status === SEV.PASS).length,
    };

    return { results, overallScore, syntaxScore, simScore, qualScore, counts };
  }

  /* ─── Gauge SVG renderer ────────────────────────────────────────── */
  /* Real markup uses a pre-baked <path> arc per gauge (id="gauge-*") with
     stroke-dasharray="141" already set in HTML; we only need to set
     stroke-dashoffset proportional to the score, plus the numeric label
     in the sibling "gauge-*-val" element. */
  function renderGauge(arcId, score) {
    const arc = document.getElementById(arcId);
    if (arc) {
      const dash = 141;
      const offset = dash * (1 - Math.max(0, Math.min(100, score)) / 100);
      arc.style.strokeDashoffset = String(offset);
    }
    const valEl = document.getElementById(arcId + '-val');
    if (valEl) valEl.textContent = Number.isFinite(score) ? Math.round(score) : '—';
  }

  /* ─── Populate DOM ──────────────────────────────────────────────── */
  function populateResults(validation) {
    // Gauges (real markup only has syntax / quality / compat gauges)
    renderGauge('gauge-syntax', validation.syntaxScore);
    renderGauge('gauge-quality', validation.qualScore);
    renderGauge('gauge-compat', validation.simScore);

    // Reveal the scores card (hidden by default in the HTML)
    const scoresCard = document.getElementById('val-scores-card');
    if (scoresCard) scoresCard.style.display = '';

    // Summary bar (errors / warnings / pass counts)
    const summaryBar = document.getElementById('val-summary-bar');
    if (summaryBar) {
      summaryBar.innerHTML = `
        <span class="dot dot-red"></span> ${validation.counts.errors} Errors
        <span class="dot dot-yellow"></span> ${validation.counts.warnings} Warnings
        <span class="dot dot-blue"></span> ${validation.counts.info} Info
        <span class="dot dot-green"></span> ${validation.counts.pass} Passed
      `;
    }

    // Switch empty-state <-> results list visibility
    const emptyState = document.getElementById('val-empty-state');
    const resultsList = document.getElementById('val-results-list');
    if (emptyState) emptyState.style.display = 'none';
    if (resultsList) resultsList.style.display = '';

    // Group by category
    const byCategory = {};
    validation.results.forEach(r => {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    });

    // Issue list — real container id is "val-issues-list"
    const container = document.getElementById('val-issues-list');
    if (!container) return;

    const html = Object.entries(byCategory)
      .map(([cat, rules]) => {
        const items = rules
          .map(r => {
            const icon = { error: '✕', warn: '⚠', info: 'ℹ', pass: '✓' }[r.status];
            return `
          <div class="val-item val-item-${r.status}">
            <span class="val-icon">${icon}</span>
            <div class="val-detail">
              <span class="val-rule-id">${r.id}</span>
              <span class="val-rule-name">${r.name}</span>
              <span class="val-message">${r.message}</span>
            </div>
          </div>`;
          })
          .join('');

        const catScore = _categoryScore(rules);
        return `
        <div class="val-category">
          <div class="val-cat-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <span class="val-cat-name">${cat}</span>
            <span class="val-cat-score">${catScore}%</span>
            <span class="val-cat-toggle">▾</span>
          </div>
          <div class="val-cat-body">${items}</div>
        </div>`;
      })
      .join('');

    container.innerHTML = html;
  }

  function _categoryScore(rules) {
    const totalW = rules.reduce((s, r) => s + r.weight, 0);
    const earnedW = rules.reduce((s, r) => {
      if (r.status === SEV.PASS) return s + r.weight;
      if (r.status === SEV.WARN) return s + r.weight * 0.5;
      if (r.status === SEV.INFO) return s + r.weight * 0.8;
      return s;
    }, 0);
    return Math.round((earnedW / totalW) * 100);
  }

  function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ─── Public API ─────────────────────────────────────────────────── */
  function analyze(parsed) {
    const validation = runValidation(parsed);
    populateResults(validation);
    return validation;
  }

  /* ─── File-upload / drag-drop wiring ───────────────────────────── */
  let _wired = false;

  function _runOnText(text, fileName) {
    try {
      const parsed = IBISParser.parse(text);
      if (fileName) parsed.sourceFileName = fileName;
      analyze(parsed);
    } catch (e) {
      if (window.IBISApp && typeof window.IBISApp.showToast === 'function') {
        window.IBISApp.showToast('Parse error: ' + e.message, 'error');
      }
      console.error('[Validator]', e);
    }
  }

  function _runOnFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => _runOnText(e.target.result, file.name);
    reader.onerror = () => {
      if (window.IBISApp && typeof window.IBISApp.showToast === 'function') {
        window.IBISApp.showToast('Could not read file', 'error');
      }
    };
    reader.readAsText(file);
  }

  function init() {
    if (_wired) return;
    _wired = true;

    const dropZone = document.getElementById('val-drop-zone');
    const fileInput = document.getElementById('val-file-input');
    const browseBtn = document.getElementById('val-browse-btn');
    const useReaderBtn = document.getElementById('val-use-reader-btn');

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', e => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) _runOnFile(fileInput.files[0]);
        fileInput.value = '';
      });
    }

    if (dropZone) {
      dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) _runOnFile(file);
      });
      dropZone.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (fileInput) fileInput.click();
      });
    }

    if (useReaderBtn) {
      useReaderBtn.addEventListener('click', () => {
        const appState =
          window.IBISApp && typeof window.IBISApp.getState === 'function'
            ? window.IBISApp.getState()
            : null;
        const parsed = appState && appState.parsedFile;
        if (!parsed) {
          if (window.IBISApp && typeof window.IBISApp.showToast === 'function') {
            window.IBISApp.showToast('Load a file in the Reader first', 'warning');
          }
          return;
        }
        analyze(parsed);
      });
    }
  }

  function onViewEnter() {
    init();
  }

  return { analyze, runValidation, onViewEnter, init };
})();
