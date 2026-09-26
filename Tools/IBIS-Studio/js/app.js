/**
 * app.js — Rising Edge IBIS-Studio
 * SPA router, state management, file handling, and module coordination.
 * Must be loaded last (after all other JS modules).
 */

(function () {
  'use strict';

  /* ─── App State ────────────────────────────────────────────────── */
  const state = {
    currentView: 'home',
    parsedFile: null, // IBISParser.parse() result
    fileName: '',
    theme: localStorage.getItem('re-theme') || 'dark',
  };

  /* ─── Theme ────────────────────────────────────────────────────── */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('re-theme', t);
    state.theme = t;
    const btn = document.getElementById('ibis-theme-btn');
    if (btn) btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  /* ─── Navigation ───────────────────────────────────────────────── */
  function navigateTo(viewId) {
    // Hide all views
    document.querySelectorAll('.ibis-view').forEach(v => v.classList.remove('active'));
    // Show target
    const target = document.getElementById('view-' + viewId);
    if (target) target.classList.add('active');

    // Update nav
    document.querySelectorAll('.ibis-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Update breadcrumb
    const crumbs = {
      home: 'Home',
      learn: 'Learn IBIS',
      reader: 'Read & Analyze',
      generator: 'Create New IBIS Model',
      validator: 'Validation Center',
      help: 'Help Center',
    };
    const bc = document.getElementById('ibis-breadcrumb-current');
    if (bc) bc.textContent = crumbs[viewId] || viewId;

    state.currentView = viewId;

    // Notify modules
    if (viewId === 'reader' && typeof Visualizer !== 'undefined') Visualizer.onViewEnter?.();
    if (viewId === 'validator' && typeof Validator !== 'undefined') Validator.onViewEnter?.();
    if (viewId === 'generator' && typeof Generator !== 'undefined') Generator.onViewEnter?.();
    if (viewId === 'learn' && typeof LearnModule !== 'undefined') LearnModule.onViewEnter?.();
    if (viewId === 'help' && typeof HelpCenter !== 'undefined') HelpCenter.onViewEnter?.();
  }

  /* ─── File handling ────────────────────────────────────────────── */
  function handleFileData(text, fileName) {
    state.fileName = fileName;
    try {
      const parsed = IBISParser.parse(text);
      parsed.sourceFileName = fileName;
      state.parsedFile = parsed;
      showToast(`Loaded: ${fileName}`, 'success');

      // Populate reader
      if (typeof Visualizer !== 'undefined') Visualizer.load(parsed);
      // Run validator
      if (typeof Validator !== 'undefined') Validator.analyze(parsed);

      // Reveal the dashboard and hide the upload zone — neither Visualizer
      // nor Validator toggle this visibility themselves, so a successful
      // parse would otherwise leave the upload zone showing with no
      // visible change.
      document.querySelectorAll('#view-reader .ibis-upload-zone').forEach(z => {
        z.style.display = 'none';
      });
      const dashboard = document.getElementById('ibis-dashboard');
      if (dashboard) dashboard.style.display = '';

      // Navigate to reader
      navigateTo('reader');
    } catch (err) {
      showToast('Parse error: ' + err.message, 'error');
      console.error('[IBIS Parser]', err);
    }
  }

  function handleFileInput(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => handleFileData(e.target.result, file.name);
    reader.onerror = () => showToast('Could not read file', 'error');
    reader.readAsText(file);
  }

  /* ─── Sample file loader ───────────────────────────────────────── */
  async function loadSampleFile(name) {
    showToast(`Loading sample: ${name}…`, 'info');
    try {
      const res = await fetch(`samples/${name}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      handleFileData(text, name);
    } catch (e) {
      showToast('Could not load sample file', 'error');
      console.error(e);
    }
  }

  /* ─── Drop zone ────────────────────────────────────────────────── */
  function initDropZones() {
    document.querySelectorAll('.ibis-upload-zone').forEach(zone => {
      zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFileInput(file);
      });
    });

    // Hidden file input (the real, single input#ibis-file-input in the markup)
    const fileInput = document.getElementById('ibis-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFileInput(fileInput.files[0]);
        fileInput.value = ''; // allow re-selecting the same file later
      });
    }
  }

  /* ─── Upload zone click-to-browse ─────────────────────────────── */
  function initUploadClick() {
    const fileInput = document.getElementById('ibis-file-input');
    const browseBtn = document.getElementById('ibis-browse-btn');
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', e => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    document.querySelectorAll('.ibis-upload-zone').forEach(zone => {
      zone.addEventListener('click', e => {
        // Don't double-trigger when the click came from a button inside the zone
        // (Browse File / Load Sample already have their own handlers).
        if (e.target.closest('button')) return;
        if (fileInput) fileInput.click();
      });
    });
  }

  /* ─── Toast notifications ──────────────────────────────────────── */
  function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `ibis-toast ibis-toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ─── Export handler ────────────────────────────────────────────── */
  function exportIBIS() {
    if (typeof Generator !== 'undefined') {
      Generator.exportCurrent?.();
    } else {
      showToast('Generator not loaded', 'warning');
    }
  }

  function exportReport(format) {
    if (!state.parsedFile) {
      showToast('No IBIS file loaded', 'warning');
      return;
    }
    switch (format) {
      case 'pdf':
        showToast('PDF export (backend required)', 'info');
        exportViaBackend('pdf');
        break;
      case 'word':
        showToast('Word export (backend required)', 'info');
        exportViaBackend('docx');
        break;
      case 'markdown':
        exportMarkdown();
        break;
      case 'html':
        exportHTML();
        break;
      default:
        showToast('Unknown format: ' + format, 'error');
    }
  }

  async function exportViaBackend(format) {
    try {
      const res = await fetch('/api/ibis/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ibisText: state.parsedFile.raw,
          format,
          fileName: state.fileName,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      downloadBlob(url, `ibis-report.${format}`);
    } catch (e) {
      showToast('Backend unavailable — try Markdown or HTML export', 'warning');
    }
  }

  function exportMarkdown() {
    const p = state.parsedFile;
    const s = p.summary;
    const eng = IBISParser.generateEngineeringSummary(p);
    const comp = p.components[0] || {};

    let md = `# IBIS Analysis Report\n\n`;
    md += `**Component:** ${s.component}  \n`;
    md += `**Manufacturer:** ${s.manufacturer}  \n`;
    md += `**IBIS Version:** ${s.version}  \n`;
    md += `**Date:** ${s.date}  \n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total Pins | ${s.totalPins} |\n`;
    md += `| Total Models | ${s.totalModels} |\n`;
    md += `| Voltage Range | ${s.voltageRange} |\n`;
    md += `| Has Waveforms | ${s.hasWaveforms ? 'Yes' : 'No'} |\n`;
    md += `| Has Ramp Data | ${s.hasRamp ? 'Yes' : 'No'} |\n`;
    md += `| Quality Score | ${eng.qualityScore}/100 |\n\n`;

    md += `## Models\n\n`;
    (comp.models || []).forEach(m => {
      md += `### ${m.name} (${m.modelType || 'Unknown'})\n`;
      md += `- Voltage Range: typ=${m.voltageRange?.typ?.toFixed?.(2)}V\n`;
      md += `- C_comp: typ=${_fmtSci(m.cComp?.typ)}\n`;
      md += `- Pullup points: ${m.pullup.length}\n`;
      md += `- Pulldown points: ${m.pulldown.length}\n`;
      md += `- Rising waveforms: ${m.risingWaveforms.length}\n`;
      md += `- Falling waveforms: ${m.fallingWaveforms.length}\n\n`;
    });

    if (eng.issues.length > 0) {
      md += `## Issues\n\n`;
      eng.issues.forEach(i => (md += `- ${i}\n`));
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    downloadBlob(URL.createObjectURL(blob), `${state.fileName || 'ibis'}-report.md`);
    showToast('Markdown report downloaded', 'success');
  }

  function exportHTML() {
    const p = state.parsedFile;
    const s = p.summary;
    const eng = IBISParser.generateEngineeringSummary(p);

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>IBIS Report — ${s.component}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; }
h1 { color: #4f46e5; } h2 { color: #3730a3; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
th { background: #f0f0ff; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; background: #ddd; }
.good { background: #d1fae5; color: #065f46; }
.warn { background: #fef3c7; color: #92400e; }
.bad  { background: #fee2e2; color: #991b1b; }
</style>
</head>
<body>
<h1>IBIS Analysis Report</h1>
<p><strong>Component:</strong> ${s.component} &nbsp;&nbsp; <strong>Manufacturer:</strong> ${s.manufacturer}</p>
<p><strong>IBIS Version:</strong> ${s.version} &nbsp;&nbsp; <strong>Date:</strong> ${s.date}</p>
<h2>Summary</h2>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Total Pins</td><td>${s.totalPins}</td></tr>
  <tr><td>Total Models</td><td>${s.totalModels}</td></tr>
  <tr><td>Voltage Range</td><td>${s.voltageRange}</td></tr>
  <tr><td>Waveforms</td><td>${s.hasWaveforms ? '<span class="badge good">Yes</span>' : '<span class="badge warn">No</span>'}</td></tr>
  <tr><td>Ramp Data</td><td>${s.hasRamp ? '<span class="badge good">Yes</span>' : '<span class="badge warn">No</span>'}</td></tr>
  <tr><td>Quality Score</td><td>${eng.qualityScore}/100</td></tr>
</table>
${eng.issues.length > 0 ? `<h2>Issues</h2><ul>${eng.issues.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
<p style="color:#888;font-size:12px">Generated by IBIS-Studio &mdash; Rising Edge &copy; ${new Date().getFullYear()}</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(URL.createObjectURL(blob), `${state.fileName || 'ibis'}-report.html`);
    showToast('HTML report downloaded', 'success');
  }

  function downloadBlob(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function _fmtSci(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (v === 0) return '0';
    const exp = Math.floor(Math.log10(Math.abs(v)));
    const man = (v / Math.pow(10, exp)).toFixed(2);
    return `${man}e${exp}`;
  }

  /* ─── Home canvas animation ────────────────────────────────────── */
  function initHomeCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }

    function mkParticle() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      };
    }

    function initParticles() {
      particles = Array.from({ length: 80 }, mkParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();
    window.addEventListener('resize', () => {
      resize();
      initParticles();
    });
  }

  /* ─── Expose to global scope (used from HTML onclick) ─────────── */
  window.IBISApp = {
    navigateTo,
    toggleTheme,
    showToast,
    loadSampleFile,
    exportReport,
    exportIBIS,
    getState: () => state,
  };

  /* ─── Boot sequence ─────────────────────────────────────────────── */
  function init() {
    applyTheme(state.theme);

    // Nav item clicks — covers the sidebar, hero buttons, and feature cards,
    // all of which use a plain [data-view] attribute in the markup.
    document.querySelectorAll('[data-view]').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.view));
    });

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // File drop zones
    initDropZones();
    initUploadClick();

    // Home canvas
    initHomeCanvas();

    // Sample file buttons — most carry data-sample, but the two topbar/reader
    // "Load Sample" buttons in the markup don't set the attribute, so default
    // them to the buffer sample explicitly.
    document.querySelectorAll('[data-sample]').forEach(btn => {
      btn.addEventListener('click', () => loadSampleFile(btn.dataset.sample));
    });
    ['ibis-load-sample', 'ibis-load-sample-reader'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn && !btn.dataset.sample) {
        btn.addEventListener('click', () => loadSampleFile('sample_buffer.ibs'));
      }
    });

    // Export buttons wired via data-export
    document.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', () => exportReport(btn.dataset.export));
    });

    // Dashboard action buttons (#ibis-dashboard file bar)
    const dashClearBtn = document.getElementById('dash-clear-btn');
    if (dashClearBtn) {
      dashClearBtn.addEventListener('click', () => {
        state.parsedFile = null;
        state.fileName = '';
        const dashboard = document.getElementById('ibis-dashboard');
        if (dashboard) dashboard.style.display = 'none';
        document.querySelectorAll('#view-reader .ibis-upload-zone').forEach(z => {
          z.style.display = '';
        });
        showToast('Cleared loaded file', 'info');
      });
    }

    const dashValidateBtn = document.getElementById('dash-validate-btn');
    if (dashValidateBtn) {
      dashValidateBtn.addEventListener('click', () => {
        if (!state.parsedFile) {
          showToast('No IBIS file loaded', 'warning');
          return;
        }
        navigateTo('validator');
        if (typeof Validator !== 'undefined') Validator.analyze(state.parsedFile);
      });
    }

    const dashReportBtn = document.getElementById('dash-report-btn');
    if (dashReportBtn) {
      dashReportBtn.addEventListener('click', () => exportReport('pdf'));
    }

    // "Analyze File" quick-action from home
    const analyzeBtn = document.getElementById('btn-analyze');
    if (analyzeBtn) analyzeBtn.addEventListener('click', () => navigateTo('reader'));

    // "Generate Model" quick-action from home
    const generateBtn = document.getElementById('btn-generate');
    if (generateBtn) generateBtn.addEventListener('click', () => navigateTo('generator'));

    // "Learn IBIS" quick-action from home
    const learnBtn = document.getElementById('btn-learn');
    if (learnBtn) learnBtn.addEventListener('click', () => navigateTo('learn'));

    console.log('[IBIS-Studio] App initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
