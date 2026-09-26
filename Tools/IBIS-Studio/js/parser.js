/**
 * parser.js — Rising Edge IBIS-Studio
 * Client-side IBIS file parser (pure JavaScript, no dependencies).
 * Parses .ibs files according to IBIS specification 7.0.
 *
 * Exports global: IBISParser
 */

const IBISParser = (function () {
  'use strict';

  /* ─── Unit conversion helpers ─────────────────────────────────── */
  const UNIT_MAP = {
    f: 1e-15,
    p: 1e-12,
    n: 1e-9,
    u: 1e-6,
    m: 1e-3,
    k: 1e3,
    M: 1e6,
    G: 1e9,
  };

  function parseValue(str) {
    if (str === null || str === undefined) return NaN;
    str = String(str).trim().toLowerCase();
    if (str === 'na' || str === 'n/a' || str === '') return NaN;
    const m = str.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)([fpnumkMG]?)(.*)$/i);
    if (!m) return NaN;
    const num = parseFloat(m[1]);
    const suffix = m[2];
    const mult = UNIT_MAP[suffix] || 1;
    return num * mult;
  }

  function splitCorners(str) {
    if (!str) return { typ: NaN, min: NaN, max: NaN };
    const parts = str.trim().split(/\s+/);
    return {
      typ: parseValue(parts[0]),
      min: parseValue(parts[1]),
      max: parseValue(parts[2]),
    };
  }

  /* ─── Main parser ──────────────────────────────────────────────── */
  function parse(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const result = {
      raw: text,
      version: '',
      fileName: '',
      fileRev: '',
      date: '',
      source: '',
      notes: '',
      disclaimer: '',
      copyright: '',
      manufacturer: '',
      components: [],
      _currentComponent: null,
      _currentModel: null,
      _currentWaveform: null,
      _inSection: null,
      _waveType: null,
      errors: [],
      warnings: [],
    };

    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      // Strip inline comment
      const commentIdx = raw.indexOf('|');
      const line = (commentIdx >= 0 ? raw.slice(0, commentIdx) : raw).trim();
      i++;

      if (!line) continue;

      // Keyword line
      if (line.startsWith('[')) {
        const kwMatch = line.match(/^\[([^\]]+)\](.*)/);
        if (!kwMatch) continue;
        const kw = kwMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
        const rest = kwMatch[2].trim();

        switch (kw) {
          // ── File-level keywords
          case 'ibis_ver':
            result.version = rest;
            break;
          case 'file_name':
            result.fileName = rest;
            break;
          case 'file_rev':
            result.fileRev = rest;
            break;
          case 'date':
            result.date = rest;
            break;
          case 'source':
            result.source = rest;
            break;
          case 'notes':
            result.notes = rest;
            break;
          case 'disclaimer':
            result.disclaimer = rest;
            break;
          case 'copyright':
            result.copyright = rest;
            break;

          // ── Component
          case 'component': {
            const comp = {
              name: rest,
              manufacturer: '',
              package: { r: null, l: null, c: null },
              pins: [],
              diffPins: [],
              pinMapping: [],
              modelSelectors: [],
              models: [],
              _currentModelSelector: null,
            };
            result.components.push(comp);
            result._currentComponent = comp;
            result._currentModel = null;
            result._inSection = 'component';
            break;
          }

          case 'manufacturer':
            if (result._currentComponent) {
              result._currentComponent.manufacturer = rest;
            } else {
              result.manufacturer = rest;
            }
            break;

          // ── Package
          case 'package':
            result._inSection = 'package';
            break;

          // ── Pin
          case 'pin':
            result._inSection = 'pin';
            break;

          // ── Diff Pin
          case 'diff_pin':
            result._inSection = 'diff_pin';
            break;

          // ── Model Selector
          case 'model_selector':
            result._inSection = 'model_selector';
            if (result._currentComponent) {
              const ms = { name: rest, entries: [] };
              result._currentComponent.modelSelectors.push(ms);
              result._currentComponent._currentModelSelector = ms;
            }
            break;

          // ── Model
          case 'model': {
            result._inSection = 'model';
            const model = {
              name: rest,
              modelType: '',
              polarity: '',
              enable: '',
              vinl: NaN,
              vinh: NaN,
              vmeas: NaN,
              cref: NaN,
              rref: NaN,
              vref: NaN,
              voltageRange: { typ: NaN, min: NaN, max: NaN },
              tempRange: { typ: NaN, min: NaN, max: NaN },
              pullupRef: { typ: NaN, min: NaN, max: NaN },
              pulldownRef: { typ: NaN, min: NaN, max: NaN },
              pwrClampRef: { typ: NaN, min: NaN, max: NaN },
              gndClampRef: { typ: NaN, min: NaN, max: NaN },
              cComp: { typ: NaN, min: NaN, max: NaN },
              ramp: { dvdtR: null, dvdtF: null, rload: NaN },
              pullup: [],
              pulldown: [],
              pwrClamp: [],
              gndClamp: [],
              risingWaveforms: [],
              fallingWaveforms: [],
            };
            if (result._currentComponent) {
              result._currentComponent.models.push(model);
            }
            result._currentModel = model;
            result._currentWaveform = null;
            break;
          }

          case 'model_type':
            if (result._currentModel) result._currentModel.modelType = rest;
            break;
          case 'polarity':
            if (result._currentModel) result._currentModel.polarity = rest;
            break;
          case 'enable':
            if (result._currentModel) result._currentModel.enable = rest;
            break;
          case 'vinl':
            if (result._currentModel) result._currentModel.vinl = parseValue(rest);
            break;
          case 'vinh':
            if (result._currentModel) result._currentModel.vinh = parseValue(rest);
            break;
          case 'vmeas':
            if (result._currentModel) result._currentModel.vmeas = parseValue(rest);
            break;

          // ── Voltage / Temp
          case 'voltage_range':
            if (result._currentModel) result._currentModel.voltageRange = splitCorners(rest);
            break;
          case 'temperature_range':
            if (result._currentModel) result._currentModel.tempRange = splitCorners(rest);
            break;

          // ── References
          case 'pullup_reference':
            result._inSection = 'pullup_reference';
            if (result._currentModel) result._currentModel.pullupRef = splitCorners(rest);
            break;
          case 'pulldown_reference':
            result._inSection = 'pulldown_reference';
            if (result._currentModel) result._currentModel.pulldownRef = splitCorners(rest);
            break;
          case 'power_clamp_reference':
            result._inSection = 'power_clamp_reference';
            if (result._currentModel) result._currentModel.pwrClampRef = splitCorners(rest);
            break;
          case 'gnd_clamp_reference':
            result._inSection = 'gnd_clamp_reference';
            if (result._currentModel) result._currentModel.gndClampRef = splitCorners(rest);
            break;

          // ── C_comp
          case 'c_comp':
            if (result._currentModel) result._currentModel.cComp = splitCorners(rest);
            break;

          // ── Ramp
          case 'ramp':
            result._inSection = 'ramp';
            break;

          // ── I/V Tables
          case 'pullup':
            result._inSection = 'pullup';
            break;
          case 'pulldown':
            result._inSection = 'pulldown';
            break;
          case 'power_clamp':
            result._inSection = 'power_clamp';
            break;
          case 'gnd_clamp':
            result._inSection = 'gnd_clamp';
            break;

          // ── Waveforms
          case 'rising_waveform':
          case 'falling_waveform': {
            const wf = {
              type: kw === 'rising_waveform' ? 'rising' : 'falling',
              rFixture: NaN,
              vFixture: NaN,
              vFixtureMin: NaN,
              vFixtureMax: NaN,
              lFixture: NaN,
              cFixture: NaN,
              points: [], // [{t, typ, min, max}]
            };
            if (result._currentModel) {
              if (kw === 'rising_waveform') result._currentModel.risingWaveforms.push(wf);
              else result._currentModel.fallingWaveforms.push(wf);
            }
            result._currentWaveform = wf;
            result._inSection = 'waveform';
            break;
          }

          case 'end':
            result._inSection = null;
            result._currentModel = null;
            result._currentWaveform = null;
            break;

          default:
            // Check for sub-keywords inside Model
            if (result._inSection === 'model') {
              const subMatch = line.match(/^(\w+)\s+(.*)/);
              if (subMatch) {
                const subKw = subMatch[1].toLowerCase();
                const subVal = subMatch[2].trim();
                if (subKw === 'model_type' && result._currentModel)
                  result._currentModel.modelType = subVal;
              }
            }
        }
        continue;
      }

      // ── Non-keyword lines: data rows
      if (!result._inSection) continue;

      const cols = line.split(/\s+/).filter(Boolean);
      if (cols.length === 0) continue;

      switch (result._inSection) {
        case 'package': {
          if (!result._currentComponent) break;
          const pkg = result._currentComponent.package;
          const pLine = line.toLowerCase();
          if (pLine.startsWith('r_pkg')) pkg.r = splitCorners(cols.slice(1).join(' '));
          else if (pLine.startsWith('l_pkg')) pkg.l = splitCorners(cols.slice(1).join(' '));
          else if (pLine.startsWith('c_pkg')) pkg.c = splitCorners(cols.slice(1).join(' '));
          break;
        }

        case 'pin': {
          if (!result._currentComponent) break;
          // pin#  signal_name  model_name  [r_pin]  [l_pin]  [c_pin]
          if (cols.length < 3) break;
          result._currentComponent.pins.push({
            number: cols[0],
            signalName: cols[1],
            modelName: cols[2],
            rPin: parseValue(cols[3]),
            lPin: parseValue(cols[4]),
            cPin: parseValue(cols[5]),
          });
          break;
        }

        case 'diff_pin': {
          if (!result._currentComponent) break;
          if (cols.length < 2) break;
          result._currentComponent.diffPins.push({
            pinPos: cols[0],
            pinNeg: cols[1],
            vdiff: parseValue(cols[2]),
            tdelay_typ: parseValue(cols[3]),
            tdelay_min: parseValue(cols[4]),
            tdelay_max: parseValue(cols[5]),
          });
          break;
        }

        case 'model_selector': {
          if (!result._currentComponent?._currentModelSelector) break;
          if (cols.length < 2) break;
          result._currentComponent._currentModelSelector.entries.push({
            modelName: cols[0],
            description: cols.slice(1).join(' '),
          });
          break;
        }

        case 'model': {
          // sub-keyword data lines inside a model
          const kw2 = cols[0].toLowerCase();
          if (!result._currentModel) break;
          if (kw2 === 'model_type') result._currentModel.modelType = cols[1] || '';
          else if (kw2 === 'polarity') result._currentModel.polarity = cols[1] || '';
          else if (kw2 === 'enable') result._currentModel.enable = cols[1] || '';
          else if (kw2 === 'vinl') result._currentModel.vinl = parseValue(cols[1]);
          else if (kw2 === 'vinh') result._currentModel.vinh = parseValue(cols[1]);
          else if (kw2 === 'vmeas') result._currentModel.vmeas = parseValue(cols[1]);
          else if (kw2 === 'cref') result._currentModel.cref = parseValue(cols[1]);
          else if (kw2 === 'rref') result._currentModel.rref = parseValue(cols[1]);
          else if (kw2 === 'vref') result._currentModel.vref = parseValue(cols[1]);
          break;
        }

        case 'ramp': {
          if (!result._currentModel) break;
          const rKw = cols[0].toLowerCase();
          if (rKw === 'dv/dt_r')
            result._currentModel.ramp.dvdtR = splitCorners(cols.slice(1).join(' '));
          else if (rKw === 'dv/dt_f')
            result._currentModel.ramp.dvdtF = splitCorners(cols.slice(1).join(' '));
          else if (rKw === 'r_load') result._currentModel.ramp.rload = parseValue(cols[1]);
          break;
        }

        case 'pullup':
        case 'pulldown':
        case 'power_clamp':
        case 'gnd_clamp': {
          if (!result._currentModel || cols.length < 2) break;
          const v = parseValue(cols[0]);
          if (isNaN(v)) break;
          const pt = {
            v,
            typ: parseValue(cols[1]),
            min: parseValue(cols[2]),
            max: parseValue(cols[3]),
          };
          const tableMap = {
            pullup: 'pullup',
            pulldown: 'pulldown',
            power_clamp: 'pwrClamp',
            gnd_clamp: 'gndClamp',
          };
          result._currentModel[tableMap[result._inSection]].push(pt);
          break;
        }

        case 'waveform': {
          if (!result._currentWaveform) break;
          const wKw = cols[0].toLowerCase();
          if (wKw === 'r_fixture') result._currentWaveform.rFixture = parseValue(cols[1]);
          else if (wKw === 'v_fixture') result._currentWaveform.vFixture = parseValue(cols[1]);
          else if (wKw === 'v_fixture_min')
            result._currentWaveform.vFixtureMin = parseValue(cols[1]);
          else if (wKw === 'v_fixture_max')
            result._currentWaveform.vFixtureMax = parseValue(cols[1]);
          else if (wKw === 'l_fixture') result._currentWaveform.lFixture = parseValue(cols[1]);
          else if (wKw === 'c_fixture') result._currentWaveform.cFixture = parseValue(cols[1]);
          else {
            // Time-voltage data point
            const t = parseValue(cols[0]);
            if (!isNaN(t)) {
              result._currentWaveform.points.push({
                t,
                typ: parseValue(cols[1]),
                min: parseValue(cols[2]),
                max: parseValue(cols[3]),
              });
            }
          }
          break;
        }

        default:
          break;
      }
    }

    // ── Post-processing: clean up internal state
    delete result._currentComponent;
    delete result._currentModel;
    delete result._currentWaveform;
    delete result._inSection;
    delete result._waveType;
    if (result.components.length > 0) {
      result.components.forEach(c => delete c._currentModelSelector);
    }

    // ── Derive summary stats
    result.summary = buildSummary(result);
    return result;
  }

  function buildSummary(r) {
    const comp = r.components[0] || {};
    const pins = comp.pins || [];
    const models = comp.models || [];
    const diffPins = comp.diffPins || [];

    const modelTypes = {};
    models.forEach(m => {
      modelTypes[m.modelType] = (modelTypes[m.modelType] || 0) + 1;
    });

    const hasWaveforms = models.some(
      m => m.risingWaveforms.length > 0 || m.fallingWaveforms.length > 0
    );
    const hasRamp = models.some(m => m.ramp && (m.ramp.dvdtR || m.ramp.dvdtF));

    // Voltage range from first model with data
    const firstModel = models.find(m => !isNaN(m.voltageRange.typ)) || null;
    const voltageRange = firstModel
      ? `${_fmtV(firstModel.voltageRange.typ)}V (${_fmtV(firstModel.voltageRange.min)}–${_fmtV(firstModel.voltageRange.max)}V)`
      : '—';

    const tempRange = firstModel
      ? `${firstModel.tempRange.typ}°C (${firstModel.tempRange.min}–${firstModel.tempRange.max}°C)`
      : '—';

    return {
      version: r.version,
      fileName: r.fileName || r.sourceFileName || '',
      date: r.date,
      manufacturer: comp.manufacturer || r.manufacturer,
      component: comp.name || '—',
      totalPins: pins.length,
      diffPinPairs: diffPins.length,
      totalModels: models.length,
      modelTypes,
      hasWaveforms,
      hasRamp,
      voltageRange,
      tempRange,
      package: comp.package || null,
      modelNames: models.map(m => m.name),
    };
  }

  function _fmtV(v) {
    return isNaN(v) ? '?' : v.toFixed(1);
  }

  /* ─── Engineering summary generator ──────────────────────────── */
  function generateEngineeringSummary(parsed) {
    const s = parsed.summary;
    const comp = parsed.components[0] || {};
    const models = comp.models || [];

    const hasAllIV = models.every(
      m => m.modelType === 'Input' || m.pullup.length > 0 || m.pulldown.length > 0
    );
    const hasMissingClamps = models.some(
      m => m.modelType !== 'Input' && (m.pwrClamp.length === 0 || m.gndClamp.length === 0)
    );

    const complexity = s.totalModels > 10 ? 'High' : s.totalModels > 4 ? 'Medium' : 'Low';
    const simReady = !hasMissingClamps && s.hasWaveforms ? 'High' : s.hasRamp ? 'Medium' : 'Low';

    const issues = [];
    if (!s.hasWaveforms) issues.push('No waveform tables — slew accuracy limited to ramp data');
    if (hasMissingClamps) issues.push('Some models missing power/ground clamp tables');
    if (!s.hasRamp) issues.push('No ramp data found');
    if (s.totalPins === 0) issues.push('No pins defined');

    return {
      component: s.component,
      manufacturer: s.manufacturer,
      version: s.version,
      totalPins: s.totalPins,
      totalModels: s.totalModels,
      modelTypes: s.modelTypes,
      complexity,
      simulationReadiness: simReady,
      hasWaveforms: s.hasWaveforms,
      hasRamp: s.hasRamp,
      issues,
      applications: guessApplications(s, models),
      qualityScore: computeQualityScore(parsed),
    };
  }

  function guessApplications(s, models) {
    const apps = [];
    const names = models.map(m => m.name.toLowerCase()).join(' ');
    if (/ddr|sdram|lpddr/.test(names)) apps.push('DDR Memory Interface');
    if (/pcie|serdes|lvds|cml/.test(names)) apps.push('High-Speed SerDes');
    if (/clk|clock|osc/.test(names)) apps.push('Clock Distribution');
    if (/lvttl|lvcmos|sstl/.test(names)) apps.push('Standard I/O Buffers');
    if (apps.length === 0) apps.push('General-purpose I/O Buffer');
    return apps;
  }

  function computeQualityScore(parsed) {
    let score = 0;
    const s = parsed.summary;
    const comp = parsed.components[0] || {};
    const models = comp.models || [];

    if (parsed.version) score += 10;
    if (parsed.fileName) score += 5;
    if (s.manufacturer) score += 5;
    if (s.totalPins > 0) score += 10;
    if (s.totalModels > 0) score += 10;
    if (s.hasWaveforms) score += 20;
    if (s.hasRamp) score += 10;

    // Check models have I/V tables
    const modelsWithIV = models.filter(m => m.pullup.length > 0 || m.pulldown.length > 0);
    if (modelsWithIV.length > 0) score += 15;

    // Check voltage range
    if (!isNaN(s.voltageRange)) score += 5;
    else score += 5; // string version counts too

    // Clamps
    const modelsWithClamps = models.filter(m => m.pwrClamp.length > 0 && m.gndClamp.length > 0);
    if (modelsWithClamps.length > 0) score += 10;

    return Math.min(score, 100);
  }

  /* ─── Syntax score ────────────────────────────────────────────── */
  function computeSyntaxScore(parsed) {
    let deductions = 0;
    if (!parsed.version) deductions += 20;
    if (!parsed.fileName) deductions += 5;
    if (parsed.components.length === 0) deductions += 30;
    const comp = parsed.components[0] || {};
    if (!comp.name) deductions += 10;
    if ((comp.pins || []).length === 0) deductions += 15;
    if ((comp.models || []).length === 0) deductions += 20;
    return Math.max(0, 100 - deductions);
  }

  /* ─── Simulation readiness score ─────────────────────────────── */
  function computeSimScore(parsed) {
    const comp = parsed.components[0] || {};
    const models = comp.models || [];
    let score = 40; // base

    if (models.some(m => m.risingWaveforms.length > 0)) score += 25;
    if (models.some(m => m.fallingWaveforms.length > 0)) score += 10;
    if (models.some(m => m.ramp.dvdtR || m.ramp.dvdtF)) score += 10;
    if (models.some(m => m.pullup.length > 0)) score += 5;
    if (models.some(m => m.pulldown.length > 0)) score += 5;
    if (models.some(m => m.pwrClamp.length > 0)) score += 5;

    return Math.min(score, 100);
  }

  /* ─── Public API ──────────────────────────────────────────────── */
  return {
    parse,
    parseValue,
    splitCorners,
    generateEngineeringSummary,
    computeQualityScore,
    computeSyntaxScore,
    computeSimScore,
    buildSummary,
  };
})();
