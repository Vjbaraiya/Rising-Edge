/**
 * Transmission Line Calculator — Calculations
 * Closed-form characteristic-impedance (Z0) approximations for the seven PCB
 * transmission-line geometries covered by this tool: microstrip, embedded
 * (buried) microstrip, symmetric stripline, asymmetric (offset) stripline,
 * differential microstrip, differential stripline, and grounded coplanar
 * waveguide (CPWG). All functions are pure and exported on window.TLCCalc.
 *
 * Formula family: Hammerstad–Jensen (microstrip effective dielectric
 * constant) combined with the IPC-2141 closed-form Z0 approximations that
 * are the industry-standard hand-calculation formulas reproduced in most
 * PCB fabricator "impedance calculator" tools (e.g. Saturn PCB Toolkit,
 * Polar Instruments application notes). These are first-order engineering
 * approximations, not full 2D/3D field solutions — always confirm final
 * geometry against your fab house's field-solver / impedance-control
 * service before release.
 *
 * All physical inputs (W, T, H, H1, H2, S, G) are in millimetres. Z0/Zdiff
 * are in ohms. Numerical sanity check baked into this file's header
 * comment: microstrip W=3.0mm, H=1.6mm, T=0.035mm, er=4.3 → Z0 ≈ 49.8 Ω,
 * matching the well-known "~3mm trace on 1.6mm FR-4 ≈ 50 Ω microstrip"
 * rule of thumb used throughout PCB design references.
 */
'use strict';

(function () {
  const C_LIGHT = 299792458; // speed of light, m/s

  /* ── Elliptic-integral ratio K(k)/K'(k) — Hilberg approximation ─────────
     Used by the CPWG (grounded coplanar waveguide) formula. K and K' are
     complete elliptic integrals of the first kind; this closed-form
     approximation (accurate to better than 3 significant figures across
     the full 0<k<1 range) avoids needing a numerical elliptic-integral
     routine. ── */
  function ellipticKRatio(k) {
    const kc = Math.max(1e-9, Math.min(1, k));
    const kp = Math.sqrt(1 - kc * kc);
    if (kc * kc <= 0.5) {
      const sk = Math.sqrt(kp);
      return Math.PI / Math.log((2 * (1 + sk)) / (1 - sk));
    }
    const sk = Math.sqrt(kc);
    return (1 / Math.PI) * Math.log((2 * (1 + sk)) / (1 - sk));
  }

  /* ── 1. Microstrip (surface) ──────────────────────────────────────────
     Hammerstad effective dielectric constant + IPC-2141 Z0 closed form.
     Valid range (per IPC-2141): 0.1 ≤ W/H ≤ 2.0, 1 ≤ er ≤ 15.        ── */
  function microstripZ0({ W, H, T, er }) {
    const eeff = (er + 1) / 2 + ((er - 1) / 2) * (1 / Math.sqrt(1 + (12 * H) / W));
    const z0 = (87 / Math.sqrt(er + 1.41)) * Math.log((5.98 * H) / (0.8 * W + T));
    return { z0, eeff };
  }

  /* ── 2. Embedded (buried) microstrip ──────────────────────────────────
     A surface microstrip that is fully or partially covered by dielectric
     (soldermask, or a buried inner-layer trace with prepreg above it)
     sees more of its field in dielectric and less in air, so its
     effective dielectric constant rises smoothly from the surface value
     (H1 = 0, no covering) toward the bulk er (H1 ≫ H, effectively
     surrounded on all sides). Because Z0 for a fixed physical geometry
     scales as 1/√eeff, we scale the surface Z0 by the ratio of the two
     √eeff values rather than needing a second closed-form log expression.
     H1 = dielectric thickness above the trace (soldermask / cover
     dielectric), H = dielectric height below the trace to the reference
     plane. The rate constant (2.0) is a smooth engineering interpolation,
     not a literal published coefficient — it reproduces the two known
     boundary conditions: H1→0 recovers the surface microstrip exactly,
     H1≫H recovers the fully-embedded (eeff→er) limit.               ── */
  function embeddedMicrostripZ0({ W, H, H1, T, er }) {
    const surface = microstripZ0({ W, H, T, er });
    const blend = Math.exp((-2.0 * H1) / H);
    const eeff = er - (er - surface.eeff) * blend;
    const z0 = surface.z0 * Math.sqrt(surface.eeff / eeff);
    return { z0, eeff, z0Surface: surface.z0 };
  }

  /* ── 3. Stripline (symmetric — trace centered between two planes) ──────
     IPC-2141 closed form. B = total dielectric spacing between the two
     reference planes (trace sits at B/2). Field is fully enclosed in a
     single homogeneous dielectric, so eeff = er exactly (no air term). ── */
  function striplineZ0({ W, B, T, er }) {
    const z0 = (60 / Math.sqrt(er)) * Math.log((1.9 * B) / (0.8 * W + T));
    const eeff = er;
    return { z0, eeff };
  }

  /* ── 4. Asymmetric (offset) stripline ─────────────────────────────────
     The trace sits H1 from one plane and H2 from the other (H1 ≠ H2).
     Approximation: treat the two unequal plane spacings as two parallel
     capacitive paths (image-plane method) and combine them through a
     harmonic-mean effective spacing before applying the same symmetric-
     stripline closed form. This reduces exactly to the symmetric formula
     when H1 = H2, and captures the correct qualitative trend (Z0 moves
     toward the value set by the closer plane as the offset increases). ── */
  function asymmetricStriplineZ0({ W, H1, H2, T, er }) {
    const Heff = (2 * H1 * H2) / (H1 + H2); // harmonic mean of the two spacings
    const Beff = 2 * Heff; // reduces to B = H1+H2 when H1 = H2
    const z0 = (60 / Math.sqrt(er)) * Math.log((1.9 * Beff) / (0.8 * W + T));
    const eeff = er;
    const asymmetryRatio = Math.min(H1, H2) / Math.max(H1, H2); // 1 = symmetric
    return { z0, eeff, asymmetryRatio };
  }

  /* ── 5. Differential microstrip ───────────────────────────────────────
     IPC-2141-style closed form for a tightly or loosely coupled pair.
     Zdiff = 2·Z0(single-ended) × [1 − 0.48·exp(−0.96·S/H)]. Correctly
     limits to Zdiff → 2·Z0 (uncoupled) as S/H → ∞, and to a coupled floor
     around 0.52×2·Z0 as S → 0 (tightest physically realizable coupling). ── */
  function diffMicrostripZ0({ W, H, T, er, S }) {
    const se = microstripZ0({ W, H, T, er });
    const couplingFactor = 1 - 0.48 * Math.exp((-0.96 * S) / H);
    const zdiff = 2 * se.z0 * couplingFactor;
    return { zdiff, z0SingleEnded: se.z0, eeff: se.eeff, couplingFactor };
  }

  /* ── 6. Differential stripline ────────────────────────────────────────
     Same coupled-pair structure as differential microstrip, but with the
     symmetric-stripline single-ended Z0 and a stripline-specific coupling
     decay (coupling in stripline falls off faster with spacing because
     both planes confine the fringing field). B = total plane spacing. ── */
  function diffStriplineZ0({ W, B, T, er, S }) {
    const se = striplineZ0({ W, B, T, er });
    const couplingFactor = 1 - 0.347 * Math.exp((-2.9 * S) / B);
    const zdiff = 2 * se.z0 * couplingFactor;
    return { zdiff, z0SingleEnded: se.z0, eeff: er, couplingFactor };
  }

  /* ── 7. Grounded coplanar waveguide (CPWG) ────────────────────────────
     Signal trace of width W with coplanar ground pours on either side
     (gap G) AND a solid reference plane at height H underneath — the
     configuration used for RF/connector breakout and controlled impedance
     without a deep stackup. Modeled as two parallel field paths sharing
     the same signal trace: (a) the coplanar path to the side grounds,
     using the classic conformal-mapping CPW formula with the elliptic
     integral ratio K(k)/K'(k); and (b) the vertical path to the bottom
     ground plane, approximated with the microstrip formula for the same
     W/H/T/er. Combining them as parallel capacitive paths (impedances
     combine like parallel resistors) correctly recovers the standalone
     (ungrounded) CPW result as H → ∞ and shows Z0 dropping as the bottom
     plane is brought closer — both are the expected physical trends. ── */
  function cpwgZ0({ W, G, H, T, er }) {
    const a = W;
    const b = W + 2 * G;
    const k = a / b;
    const kRatio = ellipticKRatio(k); // K(k)/K'(k)
    const eeffCpw = (er + 1) / 2; // standard CPW-on-thick-substrate approximation
    const z0Cpw = (30 * Math.PI) / Math.sqrt(eeffCpw) / kRatio;

    const ms = microstripZ0({ W, H, T, er });
    const z0 = (z0Cpw * ms.z0) / (z0Cpw + ms.z0);
    const eeff = (eeffCpw + ms.eeff) / 2;
    return { z0, eeff, z0CpwSide: z0Cpw, z0BottomPlane: ms.z0, k };
  }

  /* ── Propagation delay / velocity of propagation ─────────────────────
     tpd = √eeff / c. Reported per millimetre, per inch, and as a velocity
     factor (fraction of the speed of light).                          ── */
  function propagationDelay(eeff) {
    const vp = C_LIGHT / Math.sqrt(eeff); // m/s
    const psPerMm = (1 / vp) * 1e12 * 1e-3;
    const psPerInch = psPerMm * 25.4;
    const velocityFactor = 1 / Math.sqrt(eeff);
    return { vp, psPerMm, psPerInch, velocityFactor };
  }

  /* ── Manufacturing tolerance sensitivity ─────────────────────────────
     Perturbs trace width by ± deltaW (default ±0.0375mm ≈ ±1.5 mil, a
     typical outer-layer etch tolerance) and reports the resulting Z0
     spread — the mechanism behind the commonly quoted "±10% Z0
     tolerance" fabrication spec.                                       ── */
  function widthToleranceRange(z0Fn, inputs, wKey, deltaW) {
    const dW = typeof deltaW === 'number' ? deltaW : 0.0375;
    const base = z0Fn(inputs);
    const narrow = z0Fn(Object.assign({}, inputs, { [wKey]: Math.max(0.02, inputs[wKey] - dW) }));
    const wide = z0Fn(Object.assign({}, inputs, { [wKey]: inputs[wKey] + dW }));
    const baseZ = base.z0 !== undefined ? base.z0 : base.zdiff;
    const narrowZ = narrow.z0 !== undefined ? narrow.z0 : narrow.zdiff;
    const wideZ = wide.z0 !== undefined ? wide.z0 : wide.zdiff;
    const spreadPct = ((Math.max(narrowZ, wideZ) - Math.min(narrowZ, wideZ)) / (2 * baseZ)) * 100;
    return { base: baseZ, narrow: narrowZ, wide: wideZ, spreadPct, deltaW: dW };
  }

  /* ── Geometry dispatcher ──────────────────────────────────────────────
     Normalizes every geometry's output into a common shape so the UI
     layer (main.js) doesn't need geometry-specific branching for display. ── */
  const GEOMETRY_LABELS = {
    microstrip: 'Microstrip (single-ended)',
    'embedded-microstrip': 'Embedded microstrip (single-ended)',
    stripline: 'Symmetric stripline (single-ended)',
    'asymmetric-stripline': 'Asymmetric stripline (single-ended)',
    'diff-microstrip': 'Differential microstrip',
    'diff-stripline': 'Differential stripline',
    cpwg: 'Grounded coplanar waveguide (CPWG)',
  };

  function computeGeometry(geometry, inputs) {
    const W = inputs.W,
      T = inputs.T,
      H = inputs.H,
      er = inputs.er,
      S = inputs.S,
      G = inputs.G,
      H1 = inputs.H1,
      H2 = inputs.H2,
      B = inputs.B;

    let result;
    let isDifferential = false;
    let tolWKey = 'W';

    switch (geometry) {
      case 'microstrip':
        result = microstripZ0({ W, H, T, er });
        break;
      case 'embedded-microstrip':
        result = embeddedMicrostripZ0({ W, H, H1, T, er });
        break;
      case 'stripline':
        result = striplineZ0({ W, B, T, er });
        break;
      case 'asymmetric-stripline':
        result = asymmetricStriplineZ0({ W, H1, H2, T, er });
        break;
      case 'diff-microstrip':
        result = diffMicrostripZ0({ W, H, T, er, S });
        isDifferential = true;
        break;
      case 'diff-stripline':
        result = diffStriplineZ0({ W, B, T, er, S });
        isDifferential = true;
        break;
      case 'cpwg':
        result = cpwgZ0({ W, G, H, T, er });
        break;
      default:
        result = microstripZ0({ W, H, T, er });
    }

    const z0 = isDifferential ? result.zdiff : result.z0;
    const delay = propagationDelay(result.eeff);

    return {
      geometry,
      label: GEOMETRY_LABELS[geometry] || geometry,
      isDifferential,
      z0,
      eeff: result.eeff,
      delay,
      raw: result,
      tolWKey,
    };
  }

  /* ── Unit formatting helpers ─────────────────────────────────────────── */
  function formatOhms(v) {
    if (!isFinite(v)) return '—';
    return v.toFixed(1) + ' Ω';
  }
  function formatEeff(v) {
    if (!isFinite(v)) return '—';
    return v.toFixed(2);
  }
  function formatDelayPs(v) {
    if (!isFinite(v)) return '—';
    return v.toFixed(1) + ' ps';
  }
  function formatMm(v) {
    if (!isFinite(v)) return '—';
    return v.toFixed(3) + ' mm';
  }

  window.TLCCalc = {
    C_LIGHT,
    ellipticKRatio,
    microstripZ0,
    embeddedMicrostripZ0,
    striplineZ0,
    asymmetricStriplineZ0,
    diffMicrostripZ0,
    diffStriplineZ0,
    cpwgZ0,
    propagationDelay,
    widthToleranceRange,
    computeGeometry,
    GEOMETRY_LABELS,
    formatOhms,
    formatEeff,
    formatDelayPs,
    formatMm,
  };
})();
