/**
 * Ferrite Bead Optimizer — Recommendation Engine
 *
 * Renders recommendation cards and the comparison table.
 * Exports window.FBRecommendations.
 */
(function (global) {
  'use strict';

  /* ── Layout guidelines by application type ────────────────────────────── */
  const LAYOUT_GUIDELINES = {
    power: [
      {
        icon: '⚡',
        title: 'Place Bead Close to Source',
        body: 'The ferrite bead should be within 5–10 mm of the power source (regulator output or connector). Longer traces between source and bead increase parasitic inductance and reduce filter effectiveness at high frequencies.',
        tips: [
          'Route directly from regulator to bead with a short, wide trace',
          'Avoid via chains between regulator and bead',
          'Place bulk capacitor on load side of bead',
        ],
      },
      {
        icon: '🔋',
        title: 'Decoupling Capacitor Placement',
        body: 'Place a bulk capacitor (10–100 µF) immediately after the bead on the load side. This provides charge during fast transients when the bead limits current slew rate. Supplement with HF ceramics (100 nF) at each VDD pin.',
        tips: [
          'Bulk cap: ≥ 10 µF electrolytic or polymer, within 3 mm of bead output',
          'HF decoupling: 100 nF X5R/X7R MLCC within 1 mm of each VDD pin',
          'Do not place both on input side of bead — output decoupling is critical',
        ],
      },
      {
        icon: '↔',
        title: 'Trace Width and Current Capacity',
        body: 'Size the trace through the bead to carry the maximum expected current with a temperature rise ≤ 10°C. Ferrite beads have DC resistance that causes I²R heating.',
        tips: [
          'At 200 mA: minimum 0.3 mm trace width (1 oz copper)',
          'At 1 A: minimum 0.8 mm trace width (1 oz copper)',
          'At 3 A: minimum 2.0 mm trace width or use a 2 oz copper pour',
        ],
      },
      {
        icon: '⏚',
        title: 'Ground Plane Continuity',
        body: 'Maintain an unbroken ground plane under the filter. Split power planes can extend the return current path and create unexpected resonance.',
        tips: [
          'Never split the ground plane under a ferrite bead filter',
          'Use a solid copper pour for the ground reference',
          'Ground the bypass capacitors directly to the plane with short vias',
        ],
      },
      {
        icon: '🛡',
        title: 'Resonance Damping',
        body: 'An L-filter with an output MLCC creates an LC resonator that can amplify noise at the resonant frequency. Damp it with an electrolytic (higher ESR) in parallel with the MLCC.',
        tips: [
          'Add 10–47 µF polymer/electrolytic in parallel with the MLCC output cap',
          'For π-filters, add 1–10 Ω series resistor in series with the output MLCC',
          'Target Q < 0.5 at the resonant frequency',
        ],
      },
      {
        icon: '📐',
        title: 'Thermal Management',
        body: "At high current, the ferrite bead's RDC dissipates power as heat (P = I² × RDC). Ensure adequate copper area for heat spreading, especially in 0402/0603 packages.",
        tips: [
          '0402 at 200 mA: ≤ 4 mW typical — acceptable without special measures',
          '0603 at 500 mA: ≤ 75 mW — ensure good copper pour around pads',
          '0805 at 2 A: ≤ 320 mW — large copper pours or consider 1206 package',
        ],
      },
    ],
    signal: [
      {
        icon: '📶',
        title: 'Series Placement on Signal Line',
        body: 'Place the ferrite bead in series on the signal line between the driver and the receiver. The bead forms a low-pass filter with the input capacitance of the receiver.',
        tips: [
          'Place bead at the driver side (output of MCU/IC) for maximum EMI suppression',
          'Maintain controlled impedance routing if signal speeds > 10 MHz',
          'Use matched differential bead arrays for I2C, CAN, differential signals',
        ],
      },
      {
        icon: '📡',
        title: 'Input Capacitance Budget',
        body: 'The bead + receiver input capacitance forms an RC filter. Ensure the cutoff frequency is well above the signal bandwidth to avoid signal distortion.',
        tips: [
          'f_cutoff = 1 / (2π × Z_bead × C_input)',
          'For 1 MHz I2C: ensure f_cutoff > 5 MHz minimum',
          'For 10 MHz SPI: ensure f_cutoff > 50 MHz minimum',
        ],
      },
      {
        icon: '⚖',
        title: 'Common-Mode vs Differential Filtering',
        body: 'Common-mode ferrite beads (on both lines simultaneously) suppress common-mode EMI while preserving differential signal integrity. Use these for USB, CAN, RS-485.',
        tips: [
          'Use common-mode chokes (two coupled windings) for differential pairs',
          'Matched individual beads are a lower-cost alternative with reduced rejection',
          'Verify insertion loss in common mode vs differential mode from datasheet',
        ],
      },
    ],
    rf: [
      {
        icon: '📡',
        title: 'RF Supply Isolation',
        body: 'Ferrite beads on the RF power supply prevent RF from being conducted onto the power rail and then re-radiated or coupling to other circuits.',
        tips: [
          'Choose bead with peak impedance above the RF operating frequency',
          'Minimum Z of 300 Ω at the RF frequency for effective isolation',
          'Supplement with a capacitor to ground close to the RF IC VDD pin',
        ],
      },
      {
        icon: '🔗',
        title: 'Avoid Signal Path Ferrites Near RF',
        body: 'Never place a ferrite bead in the RF signal path — the nonlinearity of ferrite generates harmonics and intermodulation products that corrupt the RF signal.',
        tips: [
          'RF signal path: use only resistors or inductors — never ferrite beads',
          'Power supply isolation: ferrite beads are ideal',
          'For antenna impedance matching, use an air-core inductor',
        ],
      },
    ],
    audio: [
      {
        icon: '🎵',
        title: 'Audio VDD Filtering',
        body: 'Audio circuits are sensitive to power supply noise. A well-chosen ferrite bead can suppress switching regulator noise without introducing audio-band distortion.',
        tips: [
          'Choose bead with SRF > 1 MHz to avoid resonance in the audio band',
          'Verify bead is not saturating at peak audio supply current',
          'Supplement with low-ESR capacitors at the audio IC VDD pin',
        ],
      },
      {
        icon: '🔇',
        title: 'Ferrite Nonlinearity at Audio Levels',
        body: 'Ferrite materials exhibit nonlinear magnetic behaviour that can introduce harmonic distortion at audio signal levels. Never place a ferrite bead in a high-fidelity audio signal path.',
        tips: [
          'Audio signal path: use only non-magnetic components (air-core, C0G)',
          'Power filtering: ferrite beads are appropriate with correct bias point',
          'Test audible noise with a listening test at maximum signal level',
        ],
      },
    ],
    usb: [
      {
        icon: '🔌',
        title: 'USB VBUS Filtering',
        body: 'The USB VBUS rail often contains switching regulator ripple, ground noise, and ESD transients. A ferrite bead isolates the local 5V domain from upstream noise.',
        tips: [
          'Place bead between VBUS connector and local decoupling capacitors',
          'Choose bead with I_rated ≥ 3× expected device current for derating margin',
          'Use π-filter (Cin on input side) for ports with high noise environments',
        ],
      },
      {
        icon: '⚡',
        title: 'USB Power Budget',
        body: 'Voltage drop across the bead RDC reduces VBUS voltage available to the device. Budget the total Vdrop including load regulation of the upstream supply.',
        tips: [
          'USB 2.0 downstream port: VBUS range 4.75–5.25V — budget ≤ 250 mV total drop',
          'Choose bead with RDC ≤ 500 mΩ for 500 mA loads',
          'Verify voltage at device with worst-case cable drop + bead Vdrop',
        ],
      },
    ],
  };

  /* ── Render recommendation cards ──────────────────────────────────────── */
  function renderRecCards(container, candidates) {
    const top = candidates.slice(0, 6);
    container.innerHTML = top
      .map(
        (cand, i) => `
      <div class="fb-rec-card ${i === 0 ? 'fb-rec-top' : ''}" data-status="${cand.status}">
        <div class="fb-rec-rank">${i + 1}</div>
        <div class="fb-rec-part">${escHtml(cand.bead.part)}</div>
        <div class="fb-rec-mfr">${escHtml(cand.bead.mfr)} &middot; ${escHtml(cand.bead.pkg)} &middot; ${cand.status === 'pass' ? '<span class="status-chip status-pass">PASS</span>' : cand.status === 'marginal' ? '<span class="status-chip status-marginal">MARGINAL</span>' : '<span class="status-chip status-fail">FAIL</span>'}</div>
        <div class="fb-rec-params">
          <div class="fb-rec-param">
            <div class="fb-rec-param-label">Z @ target</div>
            <div class="fb-rec-param-value">${cand.zAtTarget.toFixed(0)} Ω</div>
          </div>
          <div class="fb-rec-param">
            <div class="fb-rec-param-label">Insertion loss</div>
            <div class="fb-rec-param-value">${cand.insertionLossDb.toFixed(1)} dB</div>
          </div>
          <div class="fb-rec-param">
            <div class="fb-rec-param-label">V<sub>drop</sub></div>
            <div class="fb-rec-param-value">${cand.vdropMv.toFixed(1)} mV</div>
          </div>
          <div class="fb-rec-param">
            <div class="fb-rec-param-label">Bias derate</div>
            <div class="fb-rec-param-value">&minus;${cand.deratePct}%</div>
          </div>
          <div class="fb-rec-param">
            <div class="fb-rec-param-label">SRF</div>
            <div class="fb-rec-param-value">${cand.bead.srf} MHz</div>
          </div>
          <div class="fb-rec-param">
            <div class="fb-rec-param-label">I<sub>rated</sub></div>
            <div class="fb-rec-param-value">${cand.bead.iRated} mA</div>
          </div>
        </div>
        ${
          cand.warnings.length
            ? `<div class="fb-rec-warnings">${cand.warnings
                .map(w => `<div class="fb-rec-warn-item">${escHtml(w)}</div>`)
                .join('')}</div>`
            : ''
        }
        <div class="fb-rec-rationale">${escHtml(cand.bead.notes || '')}</div>
      </div>
    `
      )
      .join('');
  }

  /* ── Render comparison table rows ─────────────────────────────────────── */
  function renderTable(tbody, candidates) {
    tbody.innerHTML = candidates
      .map(
        (cand, i) => `
      <tr data-status="${cand.status}">
        <td>${i + 1}</td>
        <td class="td-mono">${escHtml(cand.bead.part)}</td>
        <td>${escHtml(cand.bead.pkg)}</td>
        <td>${cand.bead.z100} Ω</td>
        <td>${cand.bead.iRated} mA</td>
        <td>${cand.bead.rdc} mΩ</td>
        <td>${cand.zAtTarget.toFixed(0)} Ω</td>
        <td>${cand.insertionLossDb.toFixed(1)} dB</td>
        <td>${cand.vdropMv.toFixed(1)} mV</td>
        <td>&minus;${cand.deratePct}%</td>
        <td>${cand.bead.srf} MHz</td>
        <td><span class="status-chip ${riskClass(cand.resonanceRisk)}">${cand.resonanceRisk.toUpperCase()}</span></td>
        <td><span class="status-chip ${statusClass(cand.status)}">${cand.status.toUpperCase()}</span></td>
      </tr>
    `
      )
      .join('');
  }

  /* ── Render layout guidelines ─────────────────────────────────────────── */
  function renderLayoutGuidelines(container, appType) {
    const guidelines = LAYOUT_GUIDELINES[appType] || LAYOUT_GUIDELINES.power;
    container.innerHTML = guidelines
      .map(
        g => `
      <div class="fb-guideline-card">
        <span class="fb-guideline-icon">${g.icon}</span>
        <h4>${escHtml(g.title)}</h4>
        <p>${escHtml(g.body)}</p>
        <ul>${g.tips.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>
      </div>
    `
      )
      .join('');
  }

  /* ── Filter table rows by status ──────────────────────────────────────── */
  function filterTable(tbody, filter) {
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const status = row.dataset.status;
      row.hidden = filter !== 'all' && status !== filter;
    });
  }

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  function statusClass(status) {
    return { pass: 'status-pass', marginal: 'status-marginal', fail: 'status-fail' }[status] || '';
  }

  function riskClass(risk) {
    return { low: 'status-pass', medium: 'status-marginal', high: 'status-fail' }[risk] || '';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Export ────────────────────────────────────────────────────────────── */
  global.FBRecommendations = {
    renderRecCards,
    renderTable,
    renderLayoutGuidelines,
    filterTable,
  };
})(window);
