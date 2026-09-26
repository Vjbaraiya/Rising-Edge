/**
 * ESD Protection Analyzer — Main Controller
 * Coordinates upload, analysis pipeline, results rendering, and export.
 */
(function () {
  'use strict';

  /* ─── Element references ───────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const uploadZone = $('uploadZone');
  const fileInput = $('fileInput');
  const fileInfo = $('fileInfo');
  const fileNameEl = $('fileName');
  const fileSizeEl = $('fileSize');
  const fileRemove = $('fileRemove');
  const analyseBtn = $('analyseBtn');
  const analyseBtn2 = $('analyseBtn2');
  const analyseHint = $('analyseHint');
  const statusPanel = $('statusPanel');
  const extractedPanel = $('extractedPanel');
  const extractedPreview = $('extractedPreview');
  const resultsSection = $('resultsSection');
  const tvsSection = $('tvsSection');
  const layoutSection = $('layoutSection');
  const noResults = $('noResults');
  const resultStatus = $('result-status');

  /* ─── State ────────────────────────────────────────────────────────────── */
  let selectedFile = null;
  let rawText = '';
  let cleanText = '';
  let pageCount = 0;
  let lastSignals = [];

  /* ─── Helpers ──────────────────────────────────────────────────────────── */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function setStep(n, state) {
    const icon = $('step' + n + 'Icon');
    const label = $('step' + n + 'Label');
    if (state === 'active') {
      icon.className = 'step-icon active';
      icon.innerHTML =
        '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 8v4l2.5 2.5"/></svg>';
      label.className = 'step-label active';
    } else if (state === 'done') {
      icon.className = 'step-icon done';
      icon.innerHTML = '✓';
      label.className = 'step-label done';
    } else {
      icon.className = 'step-icon pending';
      icon.textContent = n;
      label.className = 'step-label';
    }
  }

  function resetSteps() {
    for (let i = 1; i <= 6; i++) setStep(i, 'pending');
  }

  /* ─── File handling ────────────────────────────────────────────────────── */
  function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file.');
      return;
    }
    if (file.size > 52428800) {
      alert('File exceeds 50 MB limit.');
      return;
    }
    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatSize(file.size);
    fileInfo.hidden = false;
    uploadZone.style.display = 'none';
    analyseBtn.disabled = false;
    analyseBtn2.disabled = false;
    analyseHint.textContent = 'Ready to analyse';
    analyseHint.className = 'esd-hint esd-hint-ready';
    $('exportCsv').disabled = true;
    $('exportJson').disabled = true;
    $('printReport').disabled = true;
  }

  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () {
    if (this.files.length) handleFile(this.files[0]);
  });

  fileRemove.addEventListener('click', () => {
    selectedFile = null;
    rawText = '';
    cleanText = '';
    pageCount = 0;
    lastSignals = [];
    fileInfo.hidden = true;
    uploadZone.style.display = '';
    fileInput.value = '';
    analyseBtn.disabled = true;
    analyseBtn2.disabled = true;
    analyseHint.textContent = 'Upload a schematic PDF to begin';
    analyseHint.className = 'esd-hint';
    statusPanel.hidden = true;
    extractedPanel.hidden = true;
    resultsSection.hidden = true;
    tvsSection.hidden = true;
    layoutSection.hidden = true;
    resultStatus.className = 'badge badge-gray';
    resultStatus.textContent = 'Not analysed';
    ['stat-signals', 'stat-tvs', 'stat-highspeed', 'stat-pages'].forEach(
      id => ($(id).textContent = '—')
    );
    document.getElementById('esd-waveform-chart').innerHTML =
      '<div class="esd-empty">Run an analysis to view the ESD clamping waveform and TVS characteristic curve.</div>';
    $('exportCsv').disabled = true;
    $('exportJson').disabled = true;
    $('printReport').disabled = true;
    resetSteps();
  });

  /* ─── Analysis pipeline ─────────────────────────────────────────────────── */
  async function runAnalysis() {
    if (!selectedFile) return;

    analyseBtn.disabled = true;
    analyseBtn2.disabled = true;
    analyseHint.textContent = 'Analysing…';
    analyseHint.className = 'esd-hint';
    extractedPanel.hidden = true;
    resultsSection.hidden = true;
    tvsSection.hidden = true;
    layoutSection.hidden = true;
    resetSteps();
    statusPanel.hidden = false;

    const includeInternal = $('includeInternal')?.value === 'yes';

    try {
      // Step 1 — extract
      setStep(1, 'active');
      const { text, pages } = await EsdCalc.extractTextFromPDF(selectedFile);
      rawText = text;
      pageCount = pages;
      cleanText = EsdCalc.cleanExtractedText(rawText);
      setStep(1, 'done');

      // Show extracted text panel
      extractedPreview.textContent =
        cleanText.substring(0, 3000) +
        (cleanText.length > 3000 ? '\n\n… [truncated — download full text]' : '');
      $('extractedPages').textContent = pageCount;
      $('extractedChars').textContent = cleanText.length.toLocaleString();
      $('extractedLines').textContent = cleanText.split('\n').length.toLocaleString();
      extractedPanel.hidden = false;

      // Step 2 — identify IO
      setStep(2, 'active');
      await delay(500);
      let signals = EsdCalc.identifySignals(cleanText, includeInternal);
      setStep(2, 'done');

      // Step 3 — user-facing
      setStep(3, 'active');
      await delay(400);
      const components = EsdCalc.identifyComponents(cleanText);
      signals = EsdCalc.annotateWithComponents(signals, components, cleanText);
      setStep(3, 'done');

      // Step 4 — classify
      setStep(4, 'active');
      await delay(400);
      setStep(4, 'done');

      // Step 5 — recommend TVS
      setStep(5, 'active');
      await delay(400);
      setStep(5, 'done');

      // Step 6 — layout
      setStep(6, 'active');
      await delay(300);
      setStep(6, 'done');

      lastSignals = signals;

      // ── Update stats ──
      const tvsParts = [...new Set(signals.map(s => s.part))].filter(p => p !== 'Internal ESD');
      const hsCnt = signals.filter(s => s.cat === 'high-speed').length;

      $('stat-signals').textContent = signals.length;
      $('stat-tvs').textContent = tvsParts.length;
      $('stat-highspeed').textContent = hsCnt;
      $('stat-pages').textContent = pageCount;

      if (signals.length === 0) {
        resultStatus.className = 'badge badge-yellow';
        resultStatus.textContent = 'No signals found';
        analyseHint.textContent =
          'No ESD-relevant signals detected. Verify the PDF has text layers (not a scanned image).';
        analyseHint.className = 'esd-hint esd-hint-warn';
        noResults.hidden = false;
        resultsSection.hidden = false;
        analyseBtn.disabled = false;
        analyseBtn2.disabled = false;
        return;
      }

      noResults.hidden = true;
      resultStatus.className = 'badge badge-green';
      resultStatus.textContent = `${signals.length} signals identified`;
      analyseHint.textContent = `Analysis complete — ${signals.length} signal(s) identified across ${tvsParts.length} TVS device(s)`;
      analyseHint.className = 'esd-hint esd-hint-ok';

      // ── Render results ──
      buildResultsTable(signals);
      buildTvsCards(signals);
      resultsSection.hidden = false;
      tvsSection.hidden = false;
      layoutSection.hidden = false;

      // ── Charts ──
      const firstPart = tvsParts[0];
      const dev = EsdCalc.TVS_DB[firstPart];
      if (dev && typeof EsdCharts !== 'undefined') {
        const vclamp = parseFloat(dev.vclamp) || 15;
        const vrwm = parseFloat(dev.vrwm) || 5;
        const ipp = parseFloat(dev.ipp) || 3;
        EsdCharts.drawWaveformChart('esd-waveform-chart', firstPart, vrwm, vclamp, ipp);
        EsdCharts.drawCapacitanceChart('esd-capacitance-chart', tvsParts);
      }

      // Enable exports
      $('exportCsv').disabled = false;
      $('exportJson').disabled = false;
      $('printReport').disabled = false;

      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error(err);
      analyseHint.textContent = 'Error: ' + err.message;
      analyseHint.className = 'esd-hint esd-hint-error';
    } finally {
      analyseBtn.disabled = false;
      analyseBtn2.disabled = false;
    }
  }

  analyseBtn.addEventListener('click', runAnalysis);
  analyseBtn2.addEventListener('click', runAnalysis);

  /* ─── Results table ─────────────────────────────────────────────────────── */
  function catLabel(cat) {
    return (
      {
        power: 'Power',
        'high-speed': 'High-Speed',
        'low-speed': 'Low-Speed',
        'analog-rf': 'Analog/RF',
        ui: 'User I/F',
      }[cat] || cat
    );
  }

  function buildResultsTable(signals) {
    const tbody = $('esdTableBody');
    tbody.innerHTML = '';
    signals.forEach((sig, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.category = sig.cat;
      tr.innerHTML =
        `<td>${idx + 1}</td>` +
        `<td class="td-mono">${sig.name}</td>` +
        `<td>${sig.component}</td>` +
        `<td>${sig.iface}</td>` +
        `<td><span class="cat-chip cat-${sig.cat}">${catLabel(sig.cat)}</span></td>` +
        `<td>${sig.threat}</td>` +
        `<td>${sig.prop}</td>` +
        `<td>${sig.vrwm}</td>` +
        `<td>${sig.pol}</td>` +
        `<td>${sig.rate}</td>` +
        `<td>${sig.std}</td>` +
        `<td>${sig.surge}</td>` +
        `<td><span class="part-badge">${sig.part}</span></td>`;
      tbody.appendChild(tr);
    });
  }

  /* ─── Filter chips ──────────────────────────────────────────────────────── */
  document.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => (c.className = 'chip filter-chip'));
    chip.className = 'chip chip-active filter-chip';
    const filter = chip.dataset.filter;
    document.querySelectorAll('#esdTableBody tr').forEach(row => {
      row.hidden = !(filter === 'all' || row.dataset.category === filter);
    });
  });

  /* ─── TVS Cards ─────────────────────────────────────────────────────────── */
  function buildTvsCards(signals) {
    const { TVS_DB } = window.EsdCalc;
    const tvsMap = {};
    signals.forEach(sig => {
      if (!tvsMap[sig.part]) {
        tvsMap[sig.part] = { part: sig.part, signals: [], iface: sig.iface, rate: sig.rate };
      }
      tvsMap[sig.part].signals.push(sig.name);
    });

    const grid = $('tvsGrid');
    grid.innerHTML = '';

    Object.keys(tvsMap).forEach(partKey => {
      if (partKey === 'Internal ESD') return;
      const dev = TVS_DB[partKey] || {
        mfr: 'See datasheet',
        pkg: '—',
        vrwm: '—',
        vclamp: '—',
        cline: '—',
        ipp: '—',
        badge: 'Verify parameters',
        badgeType: 'warning',
        note: '',
      };
      const entry = tvsMap[partKey];
      const badgeClass =
        dev.badgeType === 'success'
          ? 'badge badge-green'
          : dev.badgeType === 'warning'
            ? 'badge badge-yellow'
            : 'badge badge-gray';

      const card = document.createElement('div');
      card.className = 'tvs-card';
      card.innerHTML = `<div class="tvs-card-head">
          <div>
            <div class="tvs-part">${partKey}</div>
            <div class="tvs-mfr">${dev.mfr} · ${dev.pkg}</div>
          </div>
          <span class="${badgeClass}">${dev.badge}</span>
        </div>
        <div class="tvs-params">
          <div class="tvs-param"><div class="tvs-param-label">V<sub>RWM</sub></div><div class="tvs-param-value">${dev.vrwm}</div></div>
          <div class="tvs-param"><div class="tvs-param-label">V<sub>CLAMP</sub></div><div class="tvs-param-value">${dev.vclamp}</div></div>
          <div class="tvs-param"><div class="tvs-param-label">C<sub>LINE</sub></div><div class="tvs-param-value">${dev.cline}</div></div>
          <div class="tvs-param"><div class="tvs-param-label">I<sub>PP</sub></div><div class="tvs-param-value">${dev.ipp}</div></div>
        </div>
        <div class="tvs-signals"><strong>Protects:</strong> ${entry.signals.slice(0, 4).join(', ')}${entry.signals.length > 4 ? ` +${entry.signals.length - 4} more` : ''}</div>
        ${dev.note ? `<p class="tvs-note">${dev.note}</p>` : ''}`;
      grid.appendChild(card);
    });
  }

  /* ─── Extracted text download ────────────────────────────────────────────── */
  $('downloadExtractedText').addEventListener('click', () => {
    if (!cleanText) return;
    const baseName = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'schematic';
    const blob = new Blob([cleanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = baseName + '_extracted_text.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ─── Export CSV ─────────────────────────────────────────────────────────── */
  $('exportCsv').addEventListener('click', () => {
    if (!lastSignals.length) return;
    const headers = [
      '#',
      'Signal Name',
      'Component',
      'Interface',
      'Category',
      'Key Threat',
      'Critical ESD Property',
      'VWRK',
      'Polarity',
      'Data Rate',
      'Standards',
      'Surge Req',
      'Protection Part',
    ];
    const rows = lastSignals.map((s, i) =>
      [
        i + 1,
        s.name,
        s.component,
        s.iface,
        s.cat,
        s.threat,
        s.prop,
        s.vrwm,
        s.pol,
        s.rate,
        s.std,
        s.surge,
        s.part,
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esd_protection_analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ─── Export JSON ────────────────────────────────────────────────────────── */
  $('exportJson').addEventListener('click', () => {
    if (!lastSignals.length) return;
    const payload = {
      tool: 'ESD Protection Analyzer',
      version: '2.0',
      date: new Date().toISOString(),
      file: selectedFile?.name || '—',
      pages: pageCount,
      options: {
        standard: $('esdStandard')?.value,
        level: $('esdLevel')?.value,
        defaultVdd: $('defaultVdd')?.value,
      },
      signals: lastSignals,
      summary: {
        total: lastSignals.length,
        byCategory: {},
      },
    };
    lastSignals.forEach(s => {
      payload.summary.byCategory[s.cat] = (payload.summary.byCategory[s.cat] || 0) + 1;
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esd_protection_report.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ─── Save / Load config ──────────────────────────────────────────────────── */
  $('saveConfig').addEventListener('click', () => {
    const config = {
      _type: 'esd-config',
      standard: $('esdStandard')?.value,
      level: $('esdLevel')?.value,
      defaultVdd: $('defaultVdd')?.value,
      includeInternal: $('includeInternal')?.value,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esd_analysis_config.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  $('loadConfig').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const cfg = JSON.parse(e.target.result);
        if (cfg._type !== 'esd-config') throw new Error('Not a valid ESD config file.');
        if ($('esdStandard') && cfg.standard) $('esdStandard').value = cfg.standard;
        if ($('esdLevel') && cfg.level) $('esdLevel').value = cfg.level;
        if ($('defaultVdd') && cfg.defaultVdd) $('defaultVdd').value = cfg.defaultVdd;
        if ($('includeInternal') && cfg.includeInternal)
          $('includeInternal').value = cfg.includeInternal;
      } catch (err) {
        alert('Failed to load config: ' + err.message);
      }
    };
    reader.readAsText(file);
    this.value = '';
  });

  /* ─── Print ───────────────────────────────────────────────────────────────── */
  $('printReport').addEventListener('click', () => {
    if (!lastSignals.length) return;
    window.print();
  });

  /* ─── Keyboard shortcuts ─────────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (selectedFile && !analyseBtn.disabled) runAnalysis();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      $('saveConfig').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      if ($('help-dialog') && !$('help-dialog').hidden) return;
      e.preventDefault();
      if (!$('printReport').disabled) $('printReport').click();
    }
  });
})();
