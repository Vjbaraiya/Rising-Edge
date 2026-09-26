/**
 * Ferrite Bead Optimizer — Main Controller
 *
 * Wires together: user inputs → FBCalc.optimize() → FBCharts / FBRecommendations.
 * Also handles: bead DB population, auto-select, export, config save/load,
 * keyboard shortcuts, and filter chip interactions.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  /* ── State ──────────────────────────────────────────────────────────────── */
  let lastResult = null;
  let lastParams = null;

  /* ── Populate bead dropdown from DB ────────────────────────────────────── */
  function populateBeadDropdown() {
    const sel = $('beadPart');
    FBCalc.BEAD_DB.forEach(bead => {
      const opt = document.createElement('option');
      opt.value = bead.id;
      opt.textContent = `${bead.part} — ${bead.mfr} (${bead.pkg}, ${bead.z100} Ω, ${bead.iRated} mA)`;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      const bead = FBCalc.BEAD_DB.find(b => b.id === sel.value);
      if (bead) {
        $('beadZ100').value = bead.z100;
        $('beadIrated').value = bead.iRated;
        $('beadRdc').value = bead.rdc;
        $('beadSrf').value = bead.srf;
        $('beadPackage').value = bead.pkg;
      }
    });
  }

  /* ── Read all form inputs ───────────────────────────────────────────────── */
  function readParams() {
    const topology = document.querySelector('input[name="topology"]:checked')?.value || 'L';
    return {
      appType: $('appType').value,
      noiseFreqMHz: parseFloat($('noiseFreq').value) || 100,
      supplyCurrentMa: parseFloat($('supplyCurrentMa').value) || 200,
      supplyVoltage: parseFloat($('supplyVoltage').value) || 3.3,
      maxVdropMv: parseFloat($('maxVdropMv').value) || 50,
      targetAttenDb: parseFloat($('targetAttenDb').value) || 30,
      beadZ100: parseFloat($('beadZ100').value) || null,
      beadIrated: parseFloat($('beadIrated').value) || null,
      beadRdc: parseFloat($('beadRdc').value) || null,
      beadSrf: parseFloat($('beadSrf').value) || null,
      loadCapUf: parseFloat($('loadCapUf').value) || 10,
      topology,
      pkgFilter: $('beadPackage').value || null,
    };
  }

  /* ── Auto-select best bead ──────────────────────────────────────────────── */
  function autoSelect() {
    const params = readParams();
    const result = FBCalc.optimize(params);
    if (result.best) {
      const bead = result.best.bead;
      // Populate dropdown and fields
      $('beadPart').value = bead.id || '';
      $('beadZ100').value = bead.z100;
      $('beadIrated').value = bead.iRated;
      $('beadRdc').value = bead.rdc;
      $('beadSrf').value = bead.srf;
      $('beadPackage').value = bead.pkg;
      // Run full optimization with the selected bead
      runOptimizer();
    }
  }

  /* ── Main run ───────────────────────────────────────────────────────────── */
  function runOptimizer() {
    const params = readParams();
    lastParams = params;

    const result = FBCalc.optimize(params);
    lastResult = result;

    if (!result || !result.best) {
      showError('No suitable ferrite beads found in the database for these requirements.');
      return;
    }

    const best = result.best;
    const bead = best.bead;
    const cOut = params.loadCapUf * 1e-6;
    const cIn = cOut;
    const targetFreqHz = params.noiseFreqMHz * 1e6;

    // ── Update summary stats ─────────────────────────────────────────────
    $('stat-z').textContent = `${best.zAtTarget.toFixed(0)} Ω`;
    $('stat-il').textContent = `${best.insertionLossDb.toFixed(1)} dB`;
    $('stat-vdrop').textContent = `${best.vdropMv.toFixed(1)} mV`;
    $('stat-derate').textContent = `−${best.deratePct}%`;
    $('stat-res').textContent = `${best.resonanceFreqMHz.toFixed(0)} MHz`;

    const passEl = $('stat-pass');
    passEl.textContent = best.status.toUpperCase();
    passEl.className =
      best.status === 'pass'
        ? 'stat-pass'
        : best.status === 'marginal'
          ? 'stat-marginal'
          : 'stat-fail';

    const badge = $('result-status');
    badge.textContent =
      best.status === 'pass'
        ? `✓ ${result.summary.pass} PASS`
        : best.status === 'marginal'
          ? `⚠ MARGINAL`
          : `✗ FAIL`;
    badge.className =
      best.status === 'pass'
        ? 'badge badge-green'
        : best.status === 'marginal'
          ? 'badge badge-yellow'
          : 'badge badge-red';

    // ── Render charts ────────────────────────────────────────────────────
    FBCharts.renderImpedanceChart(
      'fb-impedance-chart',
      bead,
      params.supplyCurrentMa,
      params.noiseFreqMHz
    );
    FBCharts.renderInsertionLossChart(
      'fb-insertion-loss-chart',
      bead,
      cOut,
      params.supplyCurrentMa,
      params.topology,
      params.noiseFreqMHz,
      params.targetAttenDb
    );
    FBCharts.renderDeratingChart('fb-derating-chart', bead, targetFreqHz, params.supplyCurrentMa);
    FBCharts.renderResonanceChart('fb-resonance-chart', bead, cOut, params.topology);
    FBCharts.renderPdnChart('fb-pdn-chart', bead, cOut, params.supplyCurrentMa);
    FBCharts.renderBodeChart('fb-bode-chart', bead, cOut, params.supplyCurrentMa, params.topology);
    FBCharts.renderTopologyChart(
      'fb-topo-chart',
      bead,
      cOut,
      params.supplyCurrentMa,
      params.noiseFreqMHz,
      params.targetAttenDb
    );
    FBCharts.renderTemperatureChart('fb-temp-chart', bead, targetFreqHz);
    FBCharts.renderCompareChart(
      'fb-compare-chart',
      result.candidates,
      targetFreqHz,
      params.targetAttenDb
    );

    // ── Show comparison table ────────────────────────────────────────────
    const tbody = $('fbTableBody');
    FBRecommendations.renderTable(tbody, result.candidates);
    $('comparisonSection').hidden = false;

    // ── Show recommendation cards ────────────────────────────────────────
    FBRecommendations.renderRecCards($('fbRecGrid'), result.candidates);
    $('recsSection').hidden = false;

    // ── Show advanced charts ─────────────────────────────────────────────
    $('chartsSection').hidden = false;

    // ── Show layout guidelines ───────────────────────────────────────────
    FBRecommendations.renderLayoutGuidelines($('layoutGrid'), params.appType);
    $('layoutSection').hidden = false;

    // ── Enable export ────────────────────────────────────────────────────
    $('exportCsv').disabled = false;
    $('exportJson').disabled = false;
    $('printReport').disabled = false;

    // ── Show/hide no-results ─────────────────────────────────────────────
    $('noResults').hidden = result.candidates.length > 0;

    // ── Scroll to results ────────────────────────────────────────────────
    $('result-status').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── Filter chip interactions ───────────────────────────────────────────── */
  function initFilterChips() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('chip-active'));
        chip.classList.add('chip-active');
        if (lastResult) {
          FBRecommendations.filterTable($('fbTableBody'), chip.dataset.filter);
        }
      });
    });
  }

  /* ── Error display ──────────────────────────────────────────────────────── */
  function showError(msg) {
    $('result-status').textContent = 'Error';
    $('result-status').className = 'badge badge-red';
    $('stat-z').textContent = '—';
    $('stat-il').textContent = '—';
    $('stat-vdrop').textContent = '—';
    $('stat-derate').textContent = '—';
    $('stat-res').textContent = '—';
    $('stat-pass').textContent = '—';
    $('noResults').hidden = false;
    $('comparisonSection').hidden = false;
    console.warn('[FBOptimizer]', msg);
  }

  /* ── Export CSV ─────────────────────────────────────────────────────────── */
  function exportCsv() {
    if (!lastResult) return;
    const headers = [
      'Rank',
      'Part',
      'Manufacturer',
      'Package',
      'Z@100MHz(Ω)',
      'I_rated(mA)',
      'RDC(mΩ)',
      'SRF(MHz)',
      'Z@target(Ω)',
      'Insertion_loss(dB)',
      'Vdrop(mV)',
      'Bias_derate(%)',
      'Resonance_freq(MHz)',
      'Resonance_risk',
      'Status',
    ];
    const rows = lastResult.candidates.map((c, i) => [
      i + 1,
      c.bead.part,
      c.bead.mfr,
      c.bead.pkg,
      c.bead.z100,
      c.bead.iRated,
      c.bead.rdc,
      c.bead.srf,
      c.zAtTarget.toFixed(1),
      c.insertionLossDb.toFixed(1),
      c.vdropMv.toFixed(1),
      c.deratePct,
      c.resonanceFreqMHz.toFixed(1),
      c.resonanceRisk,
      c.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    download('ferrite-bead-optimizer.csv', csv, 'text/csv');
  }

  /* ── Export JSON ────────────────────────────────────────────────────────── */
  function exportJson() {
    if (!lastResult) return;
    const data = {
      generated: new Date().toISOString(),
      params: lastParams,
      summary: lastResult.summary,
      candidates: lastResult.candidates.map(c => ({
        part: c.bead.part,
        mfr: c.bead.mfr,
        pkg: c.bead.pkg,
        z100: c.bead.z100,
        iRated: c.bead.iRated,
        rdc: c.bead.rdc,
        srf: c.bead.srf,
        zAtTarget: parseFloat(c.zAtTarget.toFixed(2)),
        insertionLossDb: parseFloat(c.insertionLossDb.toFixed(2)),
        vdropMv: parseFloat(c.vdropMv.toFixed(2)),
        deratePct: c.deratePct,
        resonanceFreqMHz: parseFloat(c.resonanceFreqMHz.toFixed(1)),
        resonanceRisk: c.resonanceRisk,
        status: c.status,
        warnings: c.warnings,
      })),
    };
    download('ferrite-bead-optimizer.json', JSON.stringify(data, null, 2), 'application/json');
  }

  /* ── Save / Load config ─────────────────────────────────────────────────── */
  function saveConfig() {
    const params = readParams();
    download(
      'fb-optimizer-config.json',
      JSON.stringify({ _tool: 'ferrite-bead-optimizer', _v: 1, params }, null, 2),
      'application/json'
    );
  }

  function loadConfig(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const cfg = JSON.parse(e.target.result);
        const p = cfg.params || cfg;
        if (p.noiseFreqMHz) $('noiseFreq').value = p.noiseFreqMHz;
        if (p.supplyCurrentMa) $('supplyCurrentMa').value = p.supplyCurrentMa;
        if (p.supplyVoltage) $('supplyVoltage').value = p.supplyVoltage;
        if (p.maxVdropMv) $('maxVdropMv').value = p.maxVdropMv;
        if (p.targetAttenDb) $('targetAttenDb').value = p.targetAttenDb;
        if (p.loadCapUf) $('loadCapUf').value = p.loadCapUf;
        if (p.appType) $('appType').value = p.appType;
        if (p.beadZ100) $('beadZ100').value = p.beadZ100;
        if (p.beadIrated) $('beadIrated').value = p.beadIrated;
        if (p.beadRdc) $('beadRdc').value = p.beadRdc;
        if (p.beadSrf) $('beadSrf').value = p.beadSrf;
        if (p.pkgFilter) $('beadPackage').value = p.pkgFilter;
        if (p.topology) {
          const radio = document.querySelector(`input[name="topology"][value="${p.topology}"]`);
          if (radio) radio.checked = true;
        }
      } catch (err) {
        console.warn('[FBOptimizer] Failed to load config:', err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ── File download helper ───────────────────────────────────────────────── */
  function download(filename, content, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  /* ── Keyboard shortcuts ─────────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runOptimizer();
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveConfig();
    }
    if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      window.print();
    }
    if (e.key === 'F1') {
      e.preventDefault();
      document.querySelector('[data-help-open]')?.click();
    }
  });

  /* ── Init ────────────────────────────────────────────────────────────────── */
  function init() {
    populateBeadDropdown();
    initFilterChips();

    $('optimizeBtn').addEventListener('click', runOptimizer);
    $('runBtn').addEventListener('click', runOptimizer);
    $('autoSelectBtn').addEventListener('click', autoSelect);
    $('exportCsv').addEventListener('click', exportCsv);
    $('exportJson').addEventListener('click', exportJson);
    $('saveConfig').addEventListener('click', saveConfig);
    $('printReport').addEventListener('click', () => window.print());

    $('loadConfig').addEventListener('change', e => {
      loadConfig(e.target.files[0]);
      e.target.value = '';
    });

    // Run with defaults on first load (gives instant visual feedback)
    setTimeout(runOptimizer, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
