/**
 * Ferrite Bead Optimizer — Physics Engine & Component Database
 *
 * All calculations are done in SI units internally.
 * Exported via window.FBCalc for use by optimizer.js and charts.js.
 */
(function (global) {
  'use strict';

  /* =========================================================================
     COMPONENT DATABASE
     Each entry represents a real or representative ferrite bead series.
     Fields:
       id        — unique key
       part      — part number / series name
       mfr       — manufacturer
       pkg       — package(s) available
       z100      — impedance at 100 MHz, no DC bias (Ω)
       iRated    — rated DC current (mA)
       rdc       — DC resistance (mΩ)
       srf       — self-resonant frequency (MHz)
       packages  — available packages
       notes     — engineering notes
       deratePct — % impedance remaining at rated current (typical)
  ========================================================================= */
  const BEAD_DB = [
    // ── Murata BLM series (0402) ─────────────────────────────────────────
    {
      id: 'blm15ag601',
      part: 'BLM15AG601',
      mfr: 'Murata',
      pkg: '0402',
      z100: 600,
      iRated: 200,
      rdc: 500,
      srf: 600,
      notes: 'General-purpose 0402, good for signal lines and low-current power rails.',
      deratePct: 30,
    },
    {
      id: 'blm15ag102',
      part: 'BLM15AG102',
      mfr: 'Murata',
      pkg: '0402',
      z100: 1000,
      iRated: 100,
      rdc: 1000,
      srf: 500,
      notes: '1 kΩ high-impedance 0402 for sensitive signal filtering.',
      deratePct: 25,
    },
    // ── Murata BLM series (0603) ─────────────────────────────────────────
    {
      id: 'blm18ag601',
      part: 'BLM18AG601',
      mfr: 'Murata',
      pkg: '0603',
      z100: 600,
      iRated: 500,
      rdc: 300,
      srf: 500,
      notes: 'Workhorse 0603 for power and signal rails up to 500 mA.',
      deratePct: 35,
    },
    {
      id: 'blm18ag221',
      part: 'BLM18AG221',
      mfr: 'Murata',
      pkg: '0603',
      z100: 220,
      iRated: 1000,
      rdc: 150,
      srf: 700,
      notes: 'Lower impedance for higher current power rails with tight voltage budget.',
      deratePct: 40,
    },
    {
      id: 'blm18pg471',
      part: 'BLM18PG471',
      mfr: 'Murata',
      pkg: '0603',
      z100: 470,
      iRated: 800,
      rdc: 200,
      srf: 550,
      notes: 'Power grade 0603 with enhanced current handling and low RDC.',
      deratePct: 38,
    },
    // ── Murata BLM series (0805) ─────────────────────────────────────────
    {
      id: 'blm21ag601',
      part: 'BLM21AG601',
      mfr: 'Murata',
      pkg: '0805',
      z100: 600,
      iRated: 3000,
      rdc: 80,
      srf: 400,
      notes: '0805 high-current bead for main power rails (3A). Low RDC for tight Vdrop.',
      deratePct: 45,
    },
    {
      id: 'blm21pg221',
      part: 'BLM21PG221',
      mfr: 'Murata',
      pkg: '0805',
      z100: 220,
      iRated: 6000,
      rdc: 30,
      srf: 350,
      notes: 'Very high current 0805 for power delivery with minimal voltage drop.',
      deratePct: 50,
    },
    // ── TDK MMZ series ───────────────────────────────────────────────────
    {
      id: 'mmz0603y601',
      part: 'MMZ0603Y601',
      mfr: 'TDK',
      pkg: '0603',
      z100: 600,
      iRated: 400,
      rdc: 350,
      srf: 520,
      notes: 'TDK 0603 standard impedance bead for general EMI suppression.',
      deratePct: 32,
    },
    {
      id: 'mmz0805y601',
      part: 'MMZ0805Y601',
      mfr: 'TDK',
      pkg: '0805',
      z100: 600,
      iRated: 2000,
      rdc: 90,
      srf: 420,
      notes: 'TDK 0805 power bead for higher current rails.',
      deratePct: 42,
    },
    // ── Wurth WE-CBF series ──────────────────────────────────────────────
    {
      id: 'we-cbf0402',
      part: 'WE-CBF 742792110',
      mfr: 'Wurth',
      pkg: '0402',
      z100: 1000,
      iRated: 150,
      rdc: 700,
      srf: 480,
      notes: 'High-impedance Wurth 0402 for sensitive analog and RF isolation.',
      deratePct: 28,
    },
    {
      id: 'we-cbf0805',
      part: 'WE-CBF 742792650',
      mfr: 'Wurth',
      pkg: '0805',
      z100: 650,
      iRated: 4000,
      rdc: 60,
      srf: 380,
      notes: 'Wurth 0805 power bead, 4A rated for high-current digital rails.',
      deratePct: 48,
    },
    // ── Samsung CIH series ───────────────────────────────────────────────
    {
      id: 'cih0805h600',
      part: 'CIH0805H600NC',
      mfr: 'Samsung',
      pkg: '0805',
      z100: 600,
      iRated: 3000,
      rdc: 85,
      srf: 410,
      notes: 'Samsung 0805 power bead, popular in consumer electronics.',
      deratePct: 44,
    },
    // ── Laird FB series ──────────────────────────────────────────────────
    {
      id: 'laird-hh1e601',
      part: 'HH1E601',
      mfr: 'Laird',
      pkg: '0603',
      z100: 600,
      iRated: 500,
      rdc: 320,
      srf: 510,
      notes: 'Laird HH series 0603 with broad frequency response.',
      deratePct: 33,
    },
    {
      id: 'laird-mi1210',
      part: 'MI1210-600',
      mfr: 'Laird',
      pkg: '1206',
      z100: 600,
      iRated: 8000,
      rdc: 22,
      srf: 280,
      notes: 'Large 1206 power bead for up to 8A. Ideal for main 5V/3.3V rails.',
      deratePct: 55,
    },
  ];

  /* =========================================================================
     FERRITE BEAD IMPEDANCE MODEL

     A ferrite bead is modelled as a series RLC network:
       - R(f)    : frequency-dependent resistive loss (increases up to SRF)
       - L(f)    : inductance (effective, decreasing above SRF)
       - Cp      : parasitic parallel capacitance (from SRF)

     Simplified model (used in industry for quick design):
       Z(f) ≈ Z100 * peak_shape(f) * bias_derating(I)

     More accurate lumped-element model used here:
       The bead is modelled as L_bead in series with R_bead, both in parallel
       with parasitic capacitance Cp.

     SRF sets the peak, Z100 sets the scale.
  ========================================================================= */

  /**
   * Calculate ferrite bead impedance magnitude at frequency f (Hz).
   * Uses a two-segment model:
   *   f < SRF  -> inductive/resistive region, impedance rising to SRF
   *   f > SRF  -> capacitive fall-off
   *
   * @param {object} bead   - bead parameters {z100, srf, rdc}
   * @param {number} fHz    - frequency in Hz
   * @param {number} biasMa - DC bias current in mA (0 = no bias)
   * @returns {object} {z, r, x} - total |Z|, resistive, reactive components (Ω)
   */
  function beadImpedance(bead, fHz, biasMa = 0) {
    const f = fHz;
    const fSrf = bead.srf * 1e6;
    const z100 = bead.z100;
    const rdc = (bead.rdc || 300) * 1e-3; // mΩ → Ω

    // Estimate peak impedance (typically 1.2–2x z100 at SRF)
    const zpeak = z100 * 1.6;

    // Resistive component R(f): rises from rdc to zpeak at SRF, then falls
    // Modelled as Lorentzian:
    //   R(f) = zpeak * (f/fSrf) / (1 + (f/fSrf - fSrf/f)^2 * Q^2)
    // where Q characterises the breadth of the peak (low Q = broad, lossy)
    const Q = 0.8; // ferrite beads are intentionally lossy (low Q)
    const u = f / fSrf;
    const r = (zpeak * u) / (1 + Math.pow((u - 1 / u) * Q, 2));

    // Reactive component X(f): inductive below SRF, capacitive above
    // L from Z100 and frequency: L ≈ Z100 / (2π * 100MHz)
    const L = z100 / (2 * Math.PI * 100e6);
    // Cp from SRF: Cp = 1 / ((2π*SRF)^2 * L)
    const Cp = 1 / (Math.pow(2 * Math.PI * fSrf, 2) * L);
    const xL = 2 * Math.PI * f * L;
    const xCp = 1 / (2 * Math.PI * f * Cp);
    // Parallel combination of jXL and -jXCp gives effective reactive part
    const xNet = (xL * xCp) / (xCp - xL + 1e-12);

    let zTotal = Math.sqrt(r * r + xNet * xNet);

    // DC bias derating: impedance degrades with current
    const derateFactor = biasDerate(bead, biasMa);
    zTotal *= derateFactor;
    const rDerated = r * derateFactor + rdc;

    return { z: zTotal, r: rDerated, x: xNet * derateFactor };
  }

  /**
   * DC bias derating factor (0–1) as a function of bias current.
   * Uses an empirical sigmoid model based on typical manufacturer curves.
   * At 0 A: factor = 1.0
   * At rated current: factor = bead.deratePct / 100
   *
   * @param {object} bead   - {iRated, deratePct}
   * @param {number} biasMa - DC current in mA
   * @returns {number} derating factor (0–1)
   */
  function biasDerate(bead, biasMa) {
    if (biasMa <= 0) return 1.0;
    const ratio = biasMa / bead.iRated; // 0 → 1 at rated current
    if (ratio >= 1) return (bead.deratePct || 30) / 100;

    // Sigmoid: factor = 1 - (1 - deratePct/100) * ratio^0.7
    const minFactor = (bead.deratePct || 30) / 100;
    return 1 - (1 - minFactor) * Math.pow(ratio, 0.7);
  }

  /**
   * Generate impedance vs frequency sweep.
   *
   * @param {object} bead   - bead parameters
   * @param {number} biasMa - DC bias current (mA)
   * @param {number} nPoints - number of frequency points
   * @returns {object} {freqMHz, z, r, x}
   */
  function impedanceSweep(bead, biasMa = 0, nPoints = 200) {
    const freqMHz = [];
    const zArr = [];
    const rArr = [];
    const xArr = [];

    // Log-spaced from 1 MHz to 3 GHz
    const fMin = 1e6;
    const fMax = 3e9;
    for (let i = 0; i < nPoints; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / (nPoints - 1));
      const result = beadImpedance(bead, f, biasMa);
      freqMHz.push(f / 1e6);
      zArr.push(result.z);
      rArr.push(result.r);
      xArr.push(result.x);
    }
    return { freqMHz, z: zArr, r: rArr, x: xArr };
  }

  /* =========================================================================
     FILTER TRANSFER FUNCTION
     H(jω) = Zload / (Zload + Zbead)

     For L-filter: Zload = 1 / (jωCout) || RL
     For π-filter: Cin in shunt at input, then bead, then Cout in shunt at output
     For T-filter: two beads in series with shunt Cmid between them
  ========================================================================= */

  /**
   * Calculate insertion loss at a single frequency.
   *
   * @param {object} bead       - bead parameters
   * @param {number} fHz        - frequency (Hz)
   * @param {number} cOutF      - output capacitance (F)
   * @param {number} biasMa     - DC bias current (mA)
   * @param {string} topology   - 'L', 'pi', 'T'
   * @param {number} cInF       - input capacitance (F, π and T only)
   * @returns {number} insertion loss in dB (positive = attenuation)
   */
  function insertionLoss(bead, fHz, cOutF, biasMa, topology, cInF) {
    const w = 2 * Math.PI * fHz;
    const zbResult = beadImpedance(bead, fHz, biasMa);
    // Complex impedance of bead: Z = R + jX (simplified to magnitude)
    const zbMag = zbResult.z;
    const zbR = zbResult.r;
    const zbX = zbResult.x;

    // Output capacitor impedance: |Zc| = 1/(ωC)
    const zcOut = 1 / (w * cOutF);

    let hin; // |H(jω)|

    if (topology === 'pi') {
      // π-filter: Cin shunt || bead series || Cout shunt
      const zcIn = 1 / (w * (cInF || cOutF));
      // Transfer function magnitude (simplified 2-port analysis)
      // |H| ≈ zcOut / sqrt((zbR + (zcOut||zcIn realpart))^2 + (zbX)^2)
      // For a full pi: |H| = (1/jwCout) / ((1/jwCin + Zbead)||(1/jwCout))
      // Simplified: attenuation ≈ zcOut*zcIn / (zbMag*(zcIn+zcOut) + zcIn*zcOut)
      const num = zcOut * zcIn;
      const den = Math.sqrt(
        Math.pow(zbR * (zcIn + zcOut), 2) +
          Math.pow(zbX * (zcIn + zcOut) - zcOut * zcIn * w * (cInF || cOutF) * zbR, 2) +
          Math.pow(zcIn * zcOut, 2)
      );
      hin = num / (Math.abs(zbMag * (zcIn + zcOut) + zcIn * zcOut) + 1e-12);
    } else if (topology === 'T') {
      // T-filter: bead1 – Cmid shunt – bead2
      const zcMid = 1 / (w * (cInF || cOutF));
      const zbSeries = 2 * zbMag; // two identical beads
      hin = zcOut / Math.sqrt(Math.pow(zbSeries, 2) + Math.pow(zcOut - zcMid + 1e-12, 2));
    } else {
      // L-filter: bead series with Cout shunt
      hin =
        zcOut / Math.sqrt(zbR * zbR + Math.pow(zbX + zcOut, 2) + zcOut * zcOut - 2 * zbX * zcOut);
      // Simplified: |H| = Zc / sqrt(Zb^2 + Zc^2 + 2*Zb*Zc*cos(angle))
      hin = zcOut / (Math.sqrt(Math.pow(zbMag, 2) + Math.pow(zcOut, 2)) + 1e-12);
    }

    // Insertion loss in dB: IL = -20 log10(|H|)
    return -20 * Math.log10(Math.min(hin, 1));
  }

  /**
   * Generate insertion loss sweep over frequency.
   */
  function insertionLossSweep(bead, cOutF, biasMa, topology, cInF, nPoints = 200) {
    const freqMHz = [];
    const ilArr = [];
    const fMin = 1e6;
    const fMax = 3e9;
    for (let i = 0; i < nPoints; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / (nPoints - 1));
      freqMHz.push(f / 1e6);
      ilArr.push(insertionLoss(bead, f, cOutF, biasMa, topology, cInF));
    }
    return { freqMHz, il: ilArr };
  }

  /* =========================================================================
     DC BIAS DERATING SWEEP
  ========================================================================= */

  /**
   * Generate DC bias derating curve: impedance at target freq vs DC current.
   */
  function deratingSweep(bead, targetFreqHz, nPoints = 100) {
    const currentMa = [];
    const zArr = [];
    const pctArr = [];

    for (let i = 0; i <= nPoints; i++) {
      const iMa = (bead.iRated * i) / nPoints;
      const result = beadImpedance(bead, targetFreqHz, iMa);
      currentMa.push(iMa);
      zArr.push(result.z);
      pctArr.push((result.z / bead.z100) * 100);
    }
    return { currentMa, z: zArr, pct: pctArr };
  }

  /* =========================================================================
     RESONANCE ANALYSIS
     Ferrite bead + output cap form an LC resonator.
     Resonant frequency: fr = 1 / (2π * sqrt(L * Cout))
     where L is the effective inductance of the bead at low frequency.
  ========================================================================= */

  /**
   * Calculate resonance frequency of bead + load cap.
   *
   * @param {object} bead  - {z100, srf}
   * @param {number} cOutF - output capacitance (F)
   * @returns {number} resonant frequency (Hz)
   */
  function resonanceFrequency(bead, cOutF) {
    const L = bead.z100 / (2 * Math.PI * 100e6);
    return 1 / (2 * Math.PI * Math.sqrt(L * cOutF));
  }

  /**
   * Resonance risk assessment.
   * @returns {string} 'low' | 'medium' | 'high'
   */
  function resonanceRisk(bead, cOutF, targetFreqHz) {
    const fr = resonanceFrequency(bead, cOutF);
    const ratio = fr / targetFreqHz;
    // If resonance is near target noise frequency, risk is high
    if (ratio > 0.3 && ratio < 3) return 'high';
    if (ratio > 0.1 && ratio < 10) return 'medium';
    return 'low';
  }

  /**
   * Voltage drop across RDC at DC current.
   * @returns {number} voltage drop (mV)
   */
  function voltageDrop(bead, currentMa) {
    return bead.rdc * 1e-3 * (currentMa * 1e-3) * 1000; // mV
  }

  /* =========================================================================
     OPTIMIZER — main selection algorithm
  ========================================================================= */

  /**
   * Run the optimizer over the component database.
   *
   * @param {object} params - user input parameters
   * @returns {object} { candidates: [...], best: {...}, summary: {...} }
   */
  function optimize(params) {
    const {
      appType,
      noiseFreqMHz,
      supplyCurrentMa,
      maxVdropMv,
      targetAttenDb,
      beadZ100,
      beadIrated,
      beadRdc,
      beadSrf,
      loadCapUf,
      topology,
      pkgFilter,
      customBead,
    } = params;

    const fTarget = noiseFreqMHz * 1e6;
    const cOut = loadCapUf * 1e-6;
    const cIn = cOut; // symmetric for π/T filters

    // Build candidate list: DB + custom bead
    let candidates = BEAD_DB.slice();
    if (customBead) {
      candidates = [customBead, ...candidates];
    } else if (beadZ100 && beadIrated && beadRdc && beadSrf) {
      // User entered manual specs — treat as a "Custom" bead at top
      candidates = [
        {
          id: 'custom',
          part: 'Custom (entered specs)',
          mfr: '—',
          pkg: pkgFilter || '0603',
          z100: beadZ100,
          iRated: beadIrated,
          rdc: beadRdc,
          srf: beadSrf,
          notes: 'User-defined bead specifications.',
          deratePct: 35,
        },
        ...candidates,
      ];
    }

    // Filter by package if specified
    if (pkgFilter) {
      candidates = candidates.filter(b => b.pkg === pkgFilter);
    }

    // Score and evaluate each candidate
    const evaluated = candidates.map(bead => {
      const zResult = beadImpedance(bead, fTarget, supplyCurrentMa);
      const vdrop = voltageDrop(bead, supplyCurrentMa);
      const il = insertionLoss(bead, fTarget, cOut, supplyCurrentMa, topology, cIn);
      const frRes = resonanceFrequency(bead, cOut);
      const resRisk = resonanceRisk(bead, cOut, fTarget);
      const derateFactor = biasDerate(bead, supplyCurrentMa);
      const deratePctActual = Math.round((1 - derateFactor) * 100);

      // Determine pass/fail
      const warnings = [];
      let status = 'pass';

      if (vdrop > maxVdropMv) {
        warnings.push(`Vdrop ${vdrop.toFixed(1)} mV exceeds budget ${maxVdropMv} mV`);
        status = 'fail';
      }
      if (supplyCurrentMa > bead.iRated) {
        warnings.push(`Supply current ${supplyCurrentMa} mA > rated ${bead.iRated} mA`);
        status = 'fail';
      }
      if (il < targetAttenDb) {
        if (il < targetAttenDb * 0.7) {
          warnings.push(`Insertion loss ${il.toFixed(1)} dB below target ${targetAttenDb} dB`);
          if (status === 'pass') status = 'marginal';
        } else {
          warnings.push(
            `Insertion loss ${il.toFixed(1)} dB slightly below target ${targetAttenDb} dB`
          );
          if (status === 'pass') status = 'marginal';
        }
      }
      if (resRisk === 'high') {
        warnings.push(
          `Resonance at ${(frRes / 1e6).toFixed(1)} MHz — potential noise amplification`
        );
        if (status === 'pass') status = 'marginal';
      }
      if (derateFactor < 0.4) {
        warnings.push(
          `Heavy bias derating: impedance reduced to ${Math.round(derateFactor * 100)}% at ${supplyCurrentMa} mA`
        );
        if (status === 'pass') status = 'marginal';
      }

      // Score (higher = better)
      let score = 0;
      if (status === 'pass') score += 100;
      if (status === 'marginal') score += 40;
      score += Math.min(il / targetAttenDb, 2) * 30; // insertion loss contribution
      score -= (vdrop / maxVdropMv) * 20; // penalise high Vdrop
      score += derateFactor * 20; // reward good derating
      if (resRisk === 'low') score += 10;
      if (resRisk === 'high') score -= 20;

      return {
        bead,
        zAtTarget: zResult.z,
        rAtTarget: zResult.r,
        insertionLossDb: il,
        vdropMv: vdrop,
        deratePct: deratePctActual,
        resonanceFreqMHz: frRes / 1e6,
        resonanceRisk: resRisk,
        status,
        warnings,
        score,
      };
    });

    // Sort by score descending
    evaluated.sort((a, b) => b.score - a.score);

    const best = evaluated[0] || null;
    const passCount = evaluated.filter(e => e.status === 'pass').length;
    const marginalCount = evaluated.filter(e => e.status === 'marginal').length;

    return {
      candidates: evaluated,
      best,
      summary: {
        total: evaluated.length,
        pass: passCount,
        marginal: marginalCount,
        fail: evaluated.length - passCount - marginalCount,
        targetFreqMHz: noiseFreqMHz,
        topology,
        cOutUf: loadCapUf,
      },
    };
  }

  /* =========================================================================
     EXPORTS
  ========================================================================= */
  const FBCalc = {
    BEAD_DB,
    beadImpedance,
    biasDerate,
    impedanceSweep,
    insertionLoss,
    insertionLossSweep,
    deratingSweep,
    resonanceFrequency,
    resonanceRisk,
    voltageDrop,
    optimize,
  };

  global.FBCalc = FBCalc;
})(window);
