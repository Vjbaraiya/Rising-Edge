/**
 * Termination Selector — Simulations
 * Educational bounce-diagram (lattice diagram) model of a single transmission
 * line driven by a step source, used for the live slider simulation and the
 * static "unterminated vs series vs parallel" waveform chart. This is a
 * simplified lumped-reflection model, not a full SPICE/telegrapher solve —
 * it is intentionally built for teaching the reflection mechanism clearly.
 */
'use strict';

(function () {
  const PROP_VELOCITY_M_PER_S = 1.5e8; // ~stripline in FR-4

  /** One-way propagation delay in seconds for a trace of given length (mm). */
  function propDelaySeconds(lengthMm) {
    return lengthMm / 1000 / PROP_VELOCITY_M_PER_S;
  }

  /**
   * Bounce-diagram simulation of a step launched into a line of impedance z0,
   * terminated at the source by rSource and at the load by rLoad (use a very
   * large number, e.g. 1e9, for an open/unterminated end).
   *
   * Returns { tNs: number[], vReceiver: number[], vSource: number[] } sampled
   * as a stair-step (piecewise constant) waveform out to `roundTrips` bounces.
   */
  function bounceDiagram({ z0, rSource, rLoad, vdd, lengthMm, roundTrips }) {
    const td = propDelaySeconds(lengthMm); // one-way delay, seconds
    const tdNs = td * 1e9;
    const trips = roundTrips || 6;

    const gammaS = window.TSCalc.reflectionCoefficient(rSource, z0);
    const gammaL = window.TSCalc.reflectionCoefficient(rLoad, z0);

    // Initial wave launched by the source (voltage divider between Rsource and Z0)
    const rSourceFinite = isFinite(rSource) ? rSource : 1e9;
    const vInitial = vdd * (z0 / (z0 + rSourceFinite));

    // Track incident wave value bouncing back and forth; accumulate voltage
    // at receiver (x = length) and at source (x = 0) as the sum of all waves
    // that have arrived by a given time.
    const events = []; // { tNs, node: 'load'|'source', deltaV }
    let wave = vInitial;
    let tCursor = tdNs; // time the first wave arrives at the load
    events.push({ tNs: 0, node: 'source', deltaV: vInitial }); // launched wave visible at source immediately

    for (let bounce = 0; bounce < trips; bounce++) {
      // Wave arrives at load, contributes (1+gammaL)*wave to load voltage from this arrival
      const reflectedAtLoad = wave * gammaL;
      events.push({ tNs: tCursor, node: 'load', deltaV: wave + reflectedAtLoad });
      // Reflected wave now travels back to source
      wave = reflectedAtLoad;
      tCursor += tdNs;
      if (Math.abs(wave) < vdd * 1e-4) break;

      const reflectedAtSource = wave * gammaS;
      events.push({ tNs: tCursor, node: 'source', deltaV: wave + reflectedAtSource });
      wave = reflectedAtSource;
      tCursor += tdNs;
      if (Math.abs(wave) < vdd * 1e-4) break;
    }

    // Build cumulative step waveforms at both nodes
    const totalTimeNs = Math.max(tCursor + tdNs * 2, tdNs * 4, 5);
    const tNs = [];
    const vReceiver = [];
    const vSource = [];

    let accLoad = 0;
    let accSource = 0;
    const loadEvents = events.filter(e => e.node === 'load').sort((a, b) => a.tNs - b.tNs);
    const sourceEvents = events.filter(e => e.node === 'source').sort((a, b) => a.tNs - b.tNs);

    // Build a merged, sorted timeline of unique switch points
    const switchPoints = Array.from(
      new Set([0, ...loadEvents.map(e => e.tNs), ...sourceEvents.map(e => e.tNs), totalTimeNs])
    ).sort((a, b) => a - b);

    for (const t of switchPoints) {
      // apply any events at exactly this time
      loadEvents.filter(e => Math.abs(e.tNs - t) < 1e-9).forEach(e => (accLoad += e.deltaV));
      sourceEvents.filter(e => Math.abs(e.tNs - t) < 1e-9).forEach(e => (accSource += e.deltaV));
      // push a point just before (stair step) and after
      tNs.push(t);
      vReceiver.push(accLoad);
      vSource.push(accSource);
    }

    return { tNs, vReceiver, vSource, gammaS, gammaL, tdNs, vInitial };
  }

  /**
   * Convenience wrapper used by the calculator/waveform chart: builds the
   * three canonical educational scenarios (unterminated, series-terminated,
   * parallel-terminated) for a common set of line parameters.
   */
  function threeScenarioComparison({ z0, rDriver, vdd, lengthMm }) {
    const unterminated = bounceDiagram({
      z0,
      rSource: rDriver,
      rLoad: 1e9,
      vdd,
      lengthMm,
      roundTrips: 8,
    });

    const rs = Math.max(0, z0 - rDriver);
    const seriesTerm = bounceDiagram({
      z0,
      rSource: rDriver + rs,
      rLoad: 1e9,
      vdd,
      lengthMm,
      roundTrips: 6,
    });

    const parallelTerm = bounceDiagram({
      z0,
      rSource: rDriver,
      rLoad: z0,
      vdd,
      lengthMm,
      roundTrips: 6,
    });

    return { unterminated, seriesTerm, parallelTerm };
  }

  window.TSSim = {
    PROP_VELOCITY_M_PER_S,
    propDelaySeconds,
    bounceDiagram,
    threeScenarioComparison,
  };
})();
