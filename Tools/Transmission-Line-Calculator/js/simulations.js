/**
 * Transmission Line Calculator — Simulations
 * Live slider-driven "what happens to Z0" model used by the interactive
 * simulation section. Sweeps trace width, dielectric height, or dielectric
 * constant across a range (holding the others fixed) so the accompanying
 * chart and cross-section diagram can show how Z0 responds in real time.
 * Reuses the pure formula functions in calculations.js — this module only
 * adds sweep-generation and the microstrip-specific "current point" reader
 * used by the live simulation panel (microstrip is used as the teaching
 * geometry for the slider simulation because it is the easiest to also
 * show as a resizing cross-section SVG).
 */
'use strict';

(function () {
  /** Generates N evenly spaced samples of a single parameter, computing
   * Z0 (or Zdiff) at each sample while holding the rest of `base` fixed. */
  function sweepParam({ geometry, base, key, min, max, steps }) {
    const n = steps || 40;
    const xs = [];
    const ys = [];
    const eeffs = [];
    for (let i = 0; i <= n; i++) {
      const val = min + ((max - min) * i) / n;
      const inputs = Object.assign({}, base, { [key]: val });
      const r = window.TLCCalc.computeGeometry(geometry, inputs);
      xs.push(val);
      ys.push(r.z0);
      eeffs.push(r.eeff);
    }
    return { xs, ys, eeffs };
  }

  /** Convenience wrapper for the three sweeps used by the static charts:
   * Z0 vs trace width, Z0 vs dielectric height, and Zdiff vs pair spacing. */
  function widthSweep(base, wMin, wMax) {
    return sweepParam({
      geometry: 'microstrip',
      base,
      key: 'W',
      min: wMin || 0.1,
      max: wMax || 3.5,
      steps: 60,
    });
  }

  function heightSweep(base, hMin, hMax) {
    return sweepParam({
      geometry: 'microstrip',
      base,
      key: 'H',
      min: hMin || 0.1,
      max: hMax || 2.4,
      steps: 60,
    });
  }

  function spacingSweep(base, sMin, sMax) {
    return sweepParam({
      geometry: 'diff-microstrip',
      base,
      key: 'S',
      min: sMin || 0.075,
      max: sMax || 2.0,
      steps: 60,
    });
  }

  /** Live simulation current-point reader — used by the slider panel. */
  function currentSimPoint({ geometry, W, H, T, er, S, B, G, H1, H2 }) {
    const inputs = { W, H, T, er, S, B, G, H1, H2 };
    return window.TLCCalc.computeGeometry(geometry, inputs);
  }

  window.TLCSim = {
    sweepParam,
    widthSweep,
    heightSweep,
    spacingSweep,
    currentSimPoint,
  };
})();
