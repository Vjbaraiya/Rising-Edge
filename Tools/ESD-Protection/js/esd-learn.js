/**
 * ESD Protection Analyzer — Interactive Learning Center
 * Handles tab switching, Plotly charts, SVG animations, and interactive controls.
 */
(function () {
  'use strict';

  /* ── Plotly shared layout defaults ─────────────────────────────────────── */
  const PLY = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'rgba(11,18,33,0.85)',
    font: { family: 'Inter, system-ui, sans-serif', color: '#94a3b8', size: 11 },
    margin: { t: 24, r: 20, b: 48, l: 56 },
    xaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      tickfont: { size: 10 },
    },
    yaxis: {
      gridcolor: 'rgba(255,255,255,0.05)',
      zerolinecolor: 'rgba(255,255,255,0.1)',
      tickfont: { size: 10 },
    },
    legend: { font: { size: 10 }, bgcolor: 'transparent', orientation: 'h', y: -0.2 },
    hoverlabel: {
      bgcolor: '#1a2236',
      bordercolor: 'rgba(255,255,255,0.12)',
      font: { color: '#f1f5f9', size: 11 },
    },
  };
  const CFG = { displayModeBar: false, responsive: true };

  /* ── Track which topics have been rendered ──────────────────────────────── */
  const rendered = {};

  /* ── Topic → render function map ────────────────────────────────────────── */
  const RENDERS = {
    'clamping-voltage': renderIVCurve,
    capacitance: renderCapChart,
    'eos-esd': renderEosChart,
    'iec-waveform': renderIECChart,
  };

  /* ═══════════════════════════════════════════════════════════════════════
     TAB SWITCHING
  ═══════════════════════════════════════════════════════════════════════ */
  function initTabs() {
    document.querySelectorAll('.elc-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.elc-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.elc-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById('elc-' + btn.dataset.topic);
        if (panel) {
          panel.classList.add('active');
          if (!rendered[btn.dataset.topic]) {
            rendered[btn.dataset.topic] = true;
            const fn = RENDERS[btn.dataset.topic];
            if (fn) setTimeout(fn, 50); // allow DOM paint first
          }
        }
      });
    });
    // Kick off first tab
    rendered['fundamentals'] = true;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOPIC 1: ESD FUNDAMENTALS — Energy calculator
  ═══════════════════════════════════════════════════════════════════════ */
  function initEnergyCalc() {
    const slider = document.getElementById('elc-volt-slider');
    if (!slider) return;

    function update() {
      const V = parseFloat(slider.value);
      const C_F = 150e-12; // HBM: 150 pF
      const R = 1500; // HBM: 1500 Ω (hand/body resistance)
      const E_mJ = 0.5 * C_F * V * V * 1000;
      const I_pk = V / R;
      const discharge_ns = R * C_F * 1e9 * 5; // 5τ

      // Update slider visual fill
      const pct = ((V - 500) / (25000 - 500)) * 100;
      slider.style.background = `linear-gradient(to right, #60a5fa ${pct}%, #1a2236 ${pct}%)`;

      const vEl = document.getElementById('elc-calc-v');
      const eEl = document.getElementById('elc-calc-e');
      const iEl = document.getElementById('elc-calc-i');
      const tEl = document.getElementById('elc-calc-t');
      const riskEl = document.getElementById('elc-calc-risk');

      if (vEl) vEl.textContent = (V / 1000).toFixed(1) + ' kV';
      if (eEl) eEl.textContent = E_mJ.toFixed(2) + ' mJ';
      if (iEl) iEl.textContent = I_pk.toFixed(1) + ' A';
      if (tEl) tEl.textContent = discharge_ns.toFixed(0) + ' ns';

      if (riskEl) {
        let risk, cls;
        if (V < 2000) {
          risk = 'Low — most ICs survive (skin ESD)';
          cls = 'good';
        } else if (V < 6000) {
          risk = 'Medium — unprotected IO pins at risk';
          cls = 'warn';
        } else if (V < 15000) {
          risk = 'High — gate oxide rupture likely without TVS';
          cls = 'bad';
        } else {
          risk = 'Critical — immediate junction meltdown';
          cls = 'bad';
        }
        riskEl.textContent = '⚠ Risk level: ' + risk;
        riskEl.className = 'elc-risk-label ' + cls;
      }
    }

    slider.addEventListener('input', update);
    update();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOPIC 3: CLAMPING VOLTAGE vs BREAKDOWN — I–V curve
  ═══════════════════════════════════════════════════════════════════════ */
  function renderIVCurve() {
    const el = document.getElementById('elc-iv-chart');
    if (!el || typeof Plotly === 'undefined') return;

    // TVS parameters (PRTR5V0U2X-like)
    const VRWM = 5.0,
      VBR = 6.0,
      VC = 10.0,
      IPP = 15;

    // Build the reverse I–V characteristic
    const v = [],
      i = [];
    for (let vv = 0; vv <= VC + 0.5; vv += 0.05) {
      v.push(parseFloat(vv.toFixed(2)));
      let cur;
      if (vv <= VRWM) {
        // Blocking: tiny leakage (~1 µA)
        cur = 0.001 * Math.pow(vv / VRWM, 8);
      } else if (vv <= VBR) {
        // Knee: rising leakage
        const t = (vv - VRWM) / (VBR - VRWM);
        cur = 0.001 + t * t * 0.8;
      } else {
        // Clamping: near-vertical, Rdyn drives VC vs IPP
        const t = (vv - VBR) / (VC - VBR);
        cur = 0.8 + t * IPP;
      }
      i.push(parseFloat(cur.toFixed(4)));
    }

    const yMax = IPP * 1.15;
    const layout = {
      ...PLY,
      margin: { t: 20, r: 16, b: 48, l: 52 },
      xaxis: {
        ...PLY.xaxis,
        title: { text: 'Reverse Voltage (V)', font: { size: 10, color: '#64748b' } },
        range: [0, VC + 0.8],
      },
      yaxis: {
        ...PLY.yaxis,
        title: { text: 'Current (A)', font: { size: 10, color: '#64748b' } },
        range: [-0.3, yMax],
      },
      shapes: [
        {
          type: 'rect',
          x0: 0,
          x1: VRWM,
          y0: 0,
          y1: yMax,
          fillcolor: 'rgba(52,211,153,0.04)',
          line: { width: 0 },
          layer: 'below',
        },
        {
          type: 'line',
          x0: VRWM,
          x1: VRWM,
          y0: 0,
          y1: yMax,
          line: { color: '#34d399', width: 1, dash: 'dot' },
        },
        {
          type: 'line',
          x0: VBR,
          x1: VBR,
          y0: 0,
          y1: yMax,
          line: { color: '#fbbf24', width: 1, dash: 'dot' },
        },
        {
          type: 'line',
          x0: VC,
          x1: VC,
          y0: 0,
          y1: yMax,
          line: { color: '#f87171', width: 1, dash: 'dot' },
        },
      ],
      annotations: [
        {
          x: VRWM / 2,
          y: yMax * 0.9,
          text: 'Normal<br>operation',
          showarrow: false,
          font: { size: 9, color: '#34d399' },
        },
        {
          x: VRWM + 0.05,
          y: yMax,
          text: `V<sub>RWM</sub> = ${VRWM} V`,
          showarrow: false,
          font: { size: 9, color: '#34d399' },
          xanchor: 'left',
        },
        {
          x: VBR + 0.05,
          y: yMax * 0.87,
          text: `V<sub>BR</sub> = ${VBR} V`,
          showarrow: false,
          font: { size: 9, color: '#fbbf24' },
          xanchor: 'left',
        },
        {
          x: VC + 0.05,
          y: yMax * 0.87,
          text: `V<sub>C</sub> = ${VC} V`,
          showarrow: false,
          font: { size: 9, color: '#f87171' },
          xanchor: 'left',
        },
        {
          x: (VBR + VC) / 2,
          y: IPP * 0.45,
          text: 'Clamping<br>region',
          showarrow: false,
          font: { size: 9, color: '#60a5fa' },
        },
      ],
      height: 300,
    };

    Plotly.newPlot(
      el,
      [
        {
          x: v,
          y: i,
          mode: 'lines',
          line: { color: '#60a5fa', width: 2.5 },
          name: 'TVS I–V (PRTR5V0U2X)',
          hovertemplate: 'V = %{x:.2f} V<br>I = %{y:.3f} A<extra></extra>',
        },
      ],
      layout,
      CFG
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOPIC 4: CAPACITANCE — Eye opening vs C_LINE
  ═══════════════════════════════════════════════════════════════════════ */
  function renderCapChart() {
    const el = document.getElementById('elc-cap-chart');
    if (!el || typeof Plotly === 'undefined') return;

    // Simple RC low-pass model: eye = max(0, 1 - (f/f3dB)²)
    // f3dB = 1/(2π × 50Ω × C_pF × 1e-12)
    function eye(dataRateGbps, cPF) {
      const f3dB = 1 / (2 * Math.PI * 50 * cPF * 1e-12);
      const f = (dataRateGbps * 1e9) / 2; // Nyquist
      const atten = 1 / Math.sqrt(1 + Math.pow(f / f3dB, 2));
      return Math.max(0, atten * 100);
    }

    const cArr = [];
    for (let c = 0.05; c <= 6; c += 0.05) cArr.push(parseFloat(c.toFixed(2)));

    const ifaces = [
      { name: 'USB 3.0 SS (5 Gbps)', gbps: 5, color: '#60a5fa', maxC: 0.2, dash: 'solid' },
      { name: 'HDMI 2.0 (6 Gbps/lane)', gbps: 6, color: '#a78bfa', maxC: 0.15, dash: 'solid' },
      { name: 'USB 2.0 HS (480 Mbps)', gbps: 0.48, color: '#34d399', maxC: 1.0, dash: 'solid' },
      { name: 'GigE (1.25 Gbps)', gbps: 1.25, color: '#fbbf24', maxC: 2.5, dash: 'solid' },
      { name: 'CAN / RS-485 (10 Mbps)', gbps: 0.01, color: '#94a3b8', maxC: 50, dash: 'dot' },
    ];

    const traces = ifaces.map(ifc => ({
      x: cArr,
      y: cArr.map(c => eye(ifc.gbps, c)),
      mode: 'lines',
      name: ifc.name,
      line: { color: ifc.color, width: 2, dash: ifc.dash },
      hovertemplate: ifc.name + '<br>C = %{x:.2f} pF → Eye %{y:.0f}%<extra></extra>',
    }));

    // "Eye marginal" threshold line at 20%
    traces.push({
      x: [0, 6],
      y: [20, 20],
      mode: 'lines',
      name: 'Min eye threshold',
      line: { color: '#f87171', width: 1, dash: 'dot' },
      hoverinfo: 'none',
    });

    const layout = {
      ...PLY,
      legend: { font: { size: 9 }, bgcolor: 'transparent', orientation: 'v', y: 1, x: 1.02 },
      margin: { t: 20, r: 130, b: 48, l: 52 },
      xaxis: {
        ...PLY.xaxis,
        title: { text: 'TVS Line Capacitance C_LINE (pF)', font: { size: 10, color: '#64748b' } },
        range: [0, 6],
      },
      yaxis: {
        ...PLY.yaxis,
        title: { text: 'Signal Eye Opening (%)', font: { size: 10, color: '#64748b' } },
        range: [0, 108],
      },
      height: 300,
    };

    Plotly.newPlot(el, traces, layout, CFG);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOPIC 6: EOS vs ESD — Energy × time scatter
  ═══════════════════════════════════════════════════════════════════════ */
  function renderEosChart() {
    const el = document.getElementById('elc-eos-chart');
    if (!el || typeof Plotly === 'undefined') return;

    const layout = {
      ...PLY,
      xaxis: {
        ...PLY.xaxis,
        title: { text: 'Pulse Duration', font: { size: 10, color: '#64748b' } },
        type: 'log',
        tickvals: [1e-10, 1e-8, 1e-6, 1e-4, 1e-2, 1, 100],
        ticktext: ['0.1 ns', '10 ns', '1 µs', '100 µs', '10 ms', '1 s', '100 s'],
      },
      yaxis: {
        ...PLY.yaxis,
        title: { text: 'Peak Energy (mJ)', font: { size: 10, color: '#64748b' } },
        type: 'log',
        range: [-3, 5],
      },
      shapes: [
        {
          type: 'rect',
          x0: 1e-11,
          x1: 1e-6,
          y0: 0.001,
          y1: 100000,
          fillcolor: 'rgba(96,165,250,0.05)',
          line: { width: 0 },
          layer: 'below',
        },
        {
          type: 'rect',
          x0: 1e-6,
          x1: 10000,
          y0: 0.5,
          y1: 100000,
          fillcolor: 'rgba(251,191,36,0.05)',
          line: { width: 0 },
          layer: 'below',
        },
      ],
      annotations: [
        {
          x: -8,
          y: 0.5,
          text: '<b>ESD</b>',
          showarrow: false,
          font: { size: 14, color: '#60a5fa' },
        },
        {
          x: 1,
          y: 3.5,
          text: '<b>EOS</b>',
          showarrow: false,
          font: { size: 14, color: '#fbbf24' },
        },
      ],
      height: 300,
    };

    const traces = [
      {
        x: [100e-12, 150e-12, 500e-12, 200e-9, 60e-9],
        y: [0.001, 0.004, 0.002, 0.5, 0.01],
        mode: 'markers+text',
        marker: { color: '#60a5fa', size: 9, symbol: 'circle' },
        text: ['CDM', 'HBM', 'MM', 'IEC 61000', 'IEC L4'],
        textposition: ['top right', 'top center', 'bottom right', 'top right', 'bottom right'],
        textfont: { size: 9, color: '#60a5fa' },
        name: 'ESD events',
        hovertemplate: '%{text}<extra></extra>',
      },
      {
        x: [1e-5, 1e-4, 1e-3, 0.1, 10, 1000],
        y: [5, 50, 500, 5000, 50000, 100000],
        mode: 'lines+markers',
        line: { color: '#fbbf24', width: 2 },
        marker: { color: '#fbbf24', size: 6 },
        name: 'EOS (power fault / surge)',
        hovertemplate: 'EOS<br>t = %{x:.2e} s<br>E = %{y:.0f} mJ<extra></extra>',
      },
      {
        x: [50e-12, 150e-12, 500e-12, 10e-9, 60e-9, 200e-9, 1e-6],
        y: [0.0003, 0.001, 0.0015, 0.008, 0.05, 0.5, 2],
        mode: 'lines',
        line: { color: '#60a5fa', width: 2 },
        name: 'ESD (CDM → IEC L4)',
        hovertemplate: 'ESD<br>t = %{x:.2e} s<br>E = %{y:.4f} mJ<extra></extra>',
      },
    ];

    Plotly.newPlot(el, traces, layout, CFG);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOPIC 7: IEC 61000-4-2 WAVEFORM — interactive level selector
  ═══════════════════════════════════════════════════════════════════════ */
  let iecLevel = 4;

  const IEC_LVL = {
    1: { kv: 2, ip1: 7.5, label: 'Level 1 ±2 kV' },
    2: { kv: 4, ip1: 15, label: 'Level 2 ±4 kV' },
    3: { kv: 6, ip1: 22.5, label: 'Level 3 ±6 kV' },
    4: { kv: 8, ip1: 30, label: 'Level 4 ±8 kV' },
  };

  function renderIECChart() {
    const el = document.getElementById('elc-iec-chart');
    if (!el || typeof Plotly === 'undefined') return;
    drawIECWaveform();
  }

  function drawIECWaveform() {
    const el = document.getElementById('elc-iec-chart');
    if (!el || typeof Plotly === 'undefined') return;

    const lvl = IEC_LVL[iecLevel];
    const I1 = lvl.ip1; // fast first peak (A)
    const I2 = I1 * 0.45; // second (slower) hump

    // Build waveform: rise ~0.8 ns, fast peak, slower hump ~10–30 ns, long tail
    const t = [],
      i = [];
    for (let ns = 0; ns <= 150; ns += 0.3) {
      t.push(parseFloat(ns.toFixed(1)));
      let cur;
      if (ns < 0.8) {
        cur = I1 * (ns / 0.8);
      } else if (ns < 5) {
        cur = I1 * Math.exp(-(ns - 0.8) / 1.8);
      } else {
        // Slow hump from network discharge
        const t2 = ns - 5;
        const hump = I2 * (t2 / 12) * Math.exp(1 - t2 / 12);
        const tail = I1 * Math.exp(-(ns - 0.8) / 1.8);
        cur = Math.max(0, tail + hump);
      }
      i.push(parseFloat(Math.max(0, cur).toFixed(3)));
    }

    const yMax = I1 * 1.15;

    const layout = {
      ...PLY,
      margin: { t: 20, r: 16, b: 48, l: 56 },
      xaxis: {
        ...PLY.xaxis,
        title: { text: 'Time (ns)', font: { size: 10, color: '#64748b' } },
        range: [0, 150],
      },
      yaxis: {
        ...PLY.yaxis,
        title: { text: 'Current (A)', font: { size: 10, color: '#64748b' } },
        range: [0, yMax],
      },
      shapes: [
        {
          type: 'line',
          x0: 0.8,
          x1: 0.8,
          y0: 0,
          y1: yMax,
          line: { color: '#34d399', width: 1, dash: 'dot' },
        },
        {
          type: 'line',
          x0: 30,
          x1: 30,
          y0: 0,
          y1: yMax,
          line: { color: '#fbbf24', width: 1, dash: 'dot' },
        },
        {
          type: 'line',
          x0: 60,
          x1: 60,
          y0: 0,
          y1: yMax,
          line: { color: '#94a3b8', width: 1, dash: 'dot' },
        },
      ],
      annotations: [
        {
          x: 0.8,
          y: yMax,
          text: 'tr ≤ 1 ns',
          showarrow: false,
          font: { size: 9, color: '#34d399' },
          xanchor: 'right',
        },
        {
          x: 30,
          y: yMax,
          text: '30 ns',
          showarrow: false,
          font: { size: 9, color: '#fbbf24' },
          xanchor: 'center',
        },
        {
          x: 60,
          y: yMax,
          text: '60 ns',
          showarrow: false,
          font: { size: 9, color: '#94a3b8' },
          xanchor: 'center',
        },
        {
          x: 100,
          y: yMax * 0.7,
          text: `<b>${lvl.label}</b><br>I<sub>peak</sub> = ${I1} A`,
          showarrow: false,
          font: { size: 10, color: '#60a5fa' },
          bgcolor: 'rgba(11,18,33,0.8)',
          borderpad: 4,
        },
      ],
      height: 280,
    };

    const fn = typeof Plotly.react === 'function' ? Plotly.react : Plotly.newPlot;
    fn(
      el,
      [
        {
          x: t,
          y: i,
          mode: 'lines',
          line: { color: '#60a5fa', width: 2.5 },
          fill: 'tozeroy',
          fillcolor: 'rgba(96,165,250,0.07)',
          name: lvl.label,
          hovertemplate: 't = %{x:.1f} ns<br>I = %{y:.1f} A<extra></extra>',
        },
      ],
      layout,
      CFG
    );

    // Update stat tiles
    const peakEl = document.getElementById('elc-iec-peak');
    const kvEl = document.getElementById('elc-iec-kv');
    if (peakEl) peakEl.textContent = I1.toFixed(0) + ' A';
    if (kvEl) kvEl.textContent = '±' + lvl.kv + ' kV';
  }

  function initIECButtons() {
    document.querySelectorAll('.elc-level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.elc-level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        iecLevel = parseInt(btn.dataset.level, 10);
        drawIECWaveform();
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOPIC 8: PCB LAYOUT — Good / Bad toggle
  ═══════════════════════════════════════════════════════════════════════ */
  function initPCBToggle() {
    const goodBtn = document.getElementById('elc-pcb-good-btn');
    const badBtn = document.getElementById('elc-pcb-bad-btn');
    const goodSvg = document.getElementById('elc-pcb-good');
    const badSvg = document.getElementById('elc-pcb-bad');
    if (!goodBtn || !badBtn) return;

    goodBtn.addEventListener('click', () => {
      goodBtn.classList.add('active');
      badBtn.classList.remove('active');
      if (goodSvg) goodSvg.style.display = '';
      if (badSvg) badSvg.style.display = 'none';
    });
    badBtn.addEventListener('click', () => {
      badBtn.classList.add('active');
      goodBtn.classList.remove('active');
      if (badSvg) badSvg.style.display = '';
      if (goodSvg) goodSvg.style.display = 'none';
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOPIC 10: INTERFACE EXAMPLES — selector
  ═══════════════════════════════════════════════════════════════════════ */
  const IFACE = {
    'USB 2.0': {
      title: 'USB 2.0 High-Speed (480 Mbps)',
      maxC: '&lt; 1.0 pF per line',
      vrwm: '5.0 V',
      polarity: 'Bidirectional (D+ and D−)',
      std: 'IEC 61000-4-2 Level 4 (±8 kV contact)',
      part: 'USBLC6-2SC6 (STMicro)',
      pkg: 'SOT-363',
      note: 'Use rail-to-rail TVS array matched for D+/D−. Place within 3 mm of USB connector. Total C_LINE budget across both lines: &lt; 1 pF differential to hold 90 Ω. Ferrite bead on VBUS for surge decoupling.',
    },
    'USB 3.0': {
      title: 'USB 3.0 SuperSpeed (5 Gbps)',
      maxC: '&lt; 0.2 pF per line',
      vrwm: '3.3 V',
      polarity: 'Bidirectional (4 lines: TX+/TX−/RX+/RX−)',
      std: 'IEC 61000-4-2 Level 4',
      part: 'ESD008-P2-02VH (Nexperia)',
      pkg: 'SOT-363',
      note: 'Ultra-low capacitance is the critical parameter at 5 Gbps — even 0.3 pF causes measurable eye closure. Look for GaN-process or SiGe TVS arrays. Separate TVS array for SS lanes from USB 2.0 lines.',
    },
    'HDMI 2.0': {
      title: 'HDMI 2.0 (up to 6 Gbps/lane)',
      maxC: '&lt; 0.15 pF per line',
      vrwm: '3.3 V',
      polarity: 'Bidirectional (4 TMDS pairs)',
      std: 'IEC 61000-4-2 Level 2 (minimum)',
      part: 'ESDA14V2BL or PRTR5V0U2X',
      pkg: 'DFN / SOT-363',
      note: 'Protect all 4 TMDS differential pairs separately from DDC/CEC/HPD (low-speed). TMDS TVS must be AC-matched-pair devices. DDC/CEC/HPD can use standard 5V VRWM devices with higher capacitance.',
    },
    Ethernet: {
      title: 'Ethernet 10/100/1G (Base-T)',
      maxC: '&lt; 5 pF (after transformer)',
      vrwm: '5.0 V (AC-coupled through magnetics)',
      polarity: 'Bidirectional',
      std: 'IEC 61000-4-2 Level 4 + IEC 61000-4-5 (1 kV surge)',
      part: 'SP723AHTG (Littelfuse) + GDT primary',
      pkg: 'SOT-363 + GDT',
      note: 'Two-stage: GDT (Gas Discharge Tube) at RJ-45 for surge; secondary TVS after isolation transformer for fast ESD. 1000Base-T uses all four pairs — protect each pair. Ground the transformer shield to chassis ground.',
    },
    'RS-485': {
      title: 'RS-485 Industrial Bus',
      maxC: '&lt; 10 pF',
      vrwm: '15 V bipolar (bus swings −7 V to +12 V)',
      polarity: 'Bidirectional (bipolar ±12 V)',
      std: 'IEC 61000-4-2 L4 + IEC 61000-4-5 2 kV',
      part: 'CDSOT23-T24CAN (Bourns)',
      pkg: 'SOT-23',
      note: 'Bus common-mode voltage ranges −7 V to +12 V. TVS VRWM must be ≥ 15 V to avoid false clamping. Two-stage design essential for outdoor/industrial: TVS primary at cable entry, secondary near IC. Bus termination resistor absorbs some transient energy.',
    },
    'CAN Bus': {
      title: 'CAN Bus (Automotive / Industrial)',
      maxC: '&lt; 20 pF',
      vrwm: '24 V bipolar',
      polarity: 'Bidirectional',
      std: 'ISO 10605 (Automotive) + IEC 61000-4-2',
      part: 'SMDA24C-5 or CDSOT23-T24CAN',
      pkg: 'SOT-23 / SMB',
      note: 'Automotive ISO 10605 requires ±8 kV contact discharge resistance. Must also withstand load-dump transients (up to 58 V for 400 ms in 12 V systems). External TVS at OBD/DB-9 connector mandatory; IC internal cells are insufficient.',
    },
    GPIO: {
      title: 'GPIO / Low-speed Digital I/O',
      maxC: '&lt; 50 pF',
      vrwm: '3.3 V or 5.0 V',
      polarity: 'Unidirectional or bidirectional',
      std: 'IEC 61000-4-2 Level 2 minimum',
      part: 'ESD9B3.3ST5G (On Semi)',
      pkg: 'SC-70 / SOT-23',
      note: 'Least demanding interface — internal IC ESD cells often adequate for board-level use. Add external TVS only at connector-crossing GPIO or panel-interface signals. Unidirectional TVS preferred if signal polarity is known (lower leakage).',
    },
    'Audio Jack': {
      title: '3.5 mm Audio Jack / Headphone',
      maxC: '&lt; 100 pF',
      vrwm: '5 V',
      polarity: 'Bidirectional',
      std: 'IEC 61000-4-2 Level 2 (user-handled)',
      part: 'ESD5V3L1U-2/TR (On Semi)',
      pkg: 'SC-75',
      note: 'Audio signals are low-frequency; high C_LINE acceptable. Main risk is plug insertion/removal with charged hand. Clamping voltage must be below op-amp or DAC rail-to-rail output swing. Tip, ring, and sleeve all need protection.',
    },
  };

  function initIfaceSelector() {
    const btns = document.querySelectorAll('.elc-iface-btn');
    const detail = document.getElementById('elc-iface-detail');
    if (!detail) return;

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const d = IFACE[btn.dataset.iface];
        if (!d) return;
        detail.innerHTML = `
<h4>${d.title}</h4>
<dl class="elc-iface-rows">
  <dt>Max C<sub>LINE</sub></dt><dd>${d.maxC}</dd>
  <dt>V<sub>RWM</sub></dt><dd>${d.vrwm}</dd>
  <dt>Polarity</dt><dd>${d.polarity}</dd>
  <dt>Standard</dt><dd>${d.std}</dd>
  <dt>Rec. part</dt><dd><code>${d.part}</code></dd>
  <dt>Package</dt><dd>${d.pkg}</dd>
</dl>
<div class="elc-callout" style="margin-top:10px;margin-bottom:0">${d.note}</div>`;
      });
    });
    if (btns.length) btns[0].click();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initEnergyCalc();
    initIECButtons();
    initPCBToggle();
    initIfaceSelector();
  });
})();
