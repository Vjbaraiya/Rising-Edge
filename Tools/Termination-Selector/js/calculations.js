/**
 * Termination Selector — Calculations
 * Real termination-network math: reflection coefficient, series, parallel,
 * Thevenin, AC (RC), and differential termination, plus a scheme recommender.
 * All functions are pure and exported on window.TSCalc.
 */
'use strict';

(function () {
  /* ── Reflection coefficient ──────────────────────────────────────────────
     Gamma = (Z_L - Z0) / (Z_L + Z0)
     Z_L can be any impedance encountered by the wave: a load, a source, or
     any discontinuity. An open circuit is modeled as a very large Z_L. ── */
  function reflectionCoefficient(zLoad, z0) {
    if (!isFinite(zLoad)) return 1; // open circuit -> full reflection
    if (z0 <= 0) return 0;
    return (zLoad - z0) / (zLoad + z0);
  }

  /* ── Series (source) termination ─────────────────────────────────────────
     Rs = Z0 - Rdriver (clamped to 0 if the driver is already >= Z0)      ── */
  function seriesTermination({ z0, rDriver }) {
    const rs = Math.max(0, z0 - rDriver);
    const totalSource = rs + rDriver;
    const launchVoltageFactor = z0 / (z0 + totalSource); // fraction of Vdd launched
    const gammaSource = reflectionCoefficient(totalSource, z0);
    return { rs, totalSource, launchVoltageFactor, gammaSource };
  }

  /* ── Parallel (end) termination ──────────────────────────────────────────
     Rp = Z0. Static power depends on where it's referenced (GND or VTT). ── */
  function parallelTermination({ z0, vdd, vtt }) {
    const rp = z0;
    const vRef = typeof vtt === 'number' && !isNaN(vtt) ? vtt : 0;
    const powerHighW = Math.pow(vdd - vRef, 2) / rp;
    return { rp, powerHighW, vRef };
  }

  /* ── Thevenin (split) termination ────────────────────────────────────────
     Solve simultaneously:
       R1 || R2 = Z0                       (matched AC impedance)
       R2 / (R1 + R2) * Vdd = Vbias         (correct idle bias point)
     => R2 = Z0 * Vdd / Vbias
        R1 = Z0 * Vdd / (Vdd - Vbias)                                     ── */
  function theveninTermination({ z0, vdd, vBias }) {
    const bias = Math.min(Math.max(vBias, 0.01), vdd - 0.01);
    const r2 = (z0 * vdd) / bias;
    const r1 = (z0 * vdd) / (vdd - bias);
    const rParallel = 1 / (1 / r1 + 1 / r2);
    const staticPowerW = (vdd * vdd) / (r1 + r2);
    return { r1, r2, rParallel, staticPowerW, bias };
  }

  /* ── AC (RC) termination ─────────────────────────────────────────────────
     R = Z0. Size C so that tau = R*C is a small multiple of the bit period:
     tau_target = factor * tBit  =>  C = tau_target / R                   ── */
  function acTermination({ z0, bitRateMbps, tauFactor }) {
    const factor = tauFactor || 6; // tau ~= 6x bit period by default
    const tBitSeconds = 1 / (bitRateMbps * 1e6);
    const tau = factor * tBitSeconds;
    const c = tau / z0;
    return { r: z0, cFarads: c, tauSeconds: tau, tBitSeconds };
  }

  /* ── Differential termination ────────────────────────────────────────────
     A single resistor across the pair equal to the differential impedance.
     Zdiff is typically slightly less than 2x the single-ended Z0 due to
     coupling between the two traces (odd-mode Z x 2).                    ── */
  function differentialTermination({ z0SingleEnded, couplingFactor }) {
    const k = couplingFactor || 0.9; // 1.0 = no coupling, lower = tighter coupling
    const zDiff = 2 * z0SingleEnded * k;
    return { zDiff, rDiff: zDiff };
  }

  /* ── Unit formatting helpers ─────────────────────────────────────────────── */
  function formatOhms(v) {
    if (!isFinite(v)) return '—';
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + ' kΩ';
    return v.toFixed(1) + ' Ω';
  }
  function formatFarads(v) {
    if (!isFinite(v) || v <= 0) return '—';
    if (v < 1e-9) return (v * 1e12).toFixed(1) + ' pF';
    if (v < 1e-6) return (v * 1e9).toFixed(1) + ' nF';
    return (v * 1e6).toFixed(2) + ' µF';
  }
  function formatWatts(v) {
    if (!isFinite(v)) return '—';
    if (v < 1e-3) return (v * 1e6).toFixed(0) + ' µW';
    if (v < 1) return (v * 1e3).toFixed(1) + ' mW';
    return v.toFixed(2) + ' W';
  }
  function formatGamma(v) {
    if (!isFinite(v)) return '—';
    return (v >= 0 ? '+' : '') + v.toFixed(3);
  }

  /* ── Scheme recommendation engine ────────────────────────────────────────
     Decision inputs: driverType, topology, busStandard, powerBudget,
     vttAvailable. Returns a scheme key + human-readable reason.          ── */
  function recommendScheme(params) {
    const { driverType, topology, busStandard, powerBudget, vttAvailable } = params;

    if (busStandard === 'lvds') {
      return {
        scheme: 'differential',
        label: 'Differential termination',
        reason:
          'Bus standard is a differential pair (LVDS-class) — a single resistor across the pair matched to Zₘᵢᵣᵣ is the standard solution regardless of topology.',
      };
    }

    if (busStandard === 'rs485' || topology === 'multi-drop') {
      if (vttAvailable === 'no') {
        return {
          scheme: 'thevenin',
          label: 'Thevenin termination',
          reason:
            'Multi-drop bus without a dedicated Vᵀᵀ rail — a Thevenin split-resistor network synthesizes the correct bias point from Vᴅᴅ and GND that already exist on the board.',
        };
      }
      return {
        scheme: 'parallel',
        label: 'Parallel termination',
        reason:
          'Multi-drop / shared-bus topology needs a matched load at the true electrical end(s) of the line so every tap sees a clean, unreflected edge on the first pass.',
      };
    }

    if (busStandard === 'clock' && powerBudget === 'tight') {
      return {
        scheme: 'ac',
        label: 'AC (RC) termination',
        reason:
          'Clock distribution with a tight power budget — AC termination matches the line only during edges and draws zero static current between transitions.',
      };
    }

    if (topology === 'daisy-chain') {
      return {
        scheme: 'series',
        label: 'Series termination (per stage)',
        reason:
          'Daisy-chain topology with short branch stubs — series termination at each driver stage is simple and power-efficient as long as stub lengths stay electrically short.',
      };
    }

    if (driverType === 'open-drain') {
      return {
        scheme: 'parallel',
        label: 'Parallel termination (pull-up doubles as termination)',
        reason:
          'Open-drain drivers already require a pull-up; sizing that pull-up near Z₀ lets it double as the line termination for higher-speed open-drain buses.',
      };
    }

    // Default: point-to-point, push-pull driver
    return {
      scheme: 'series',
      label: 'Series termination',
      reason:
        'Point-to-point topology with a push-pull driver — series termination gives a near-zero static power, single-reflection-free solution and is the simplest to route.',
    };
  }

  /* ── Full calculator: computes every scheme + the recommendation ────────── */
  function computeAll(inputs) {
    const z0 = inputs.z0;
    const vdd = inputs.vdd;
    const rDriver = inputs.rDriver;
    const vBias = vdd / 2;

    const series = seriesTermination({ z0, rDriver });
    const parallel = parallelTermination({ z0, vdd, vtt: vBias });
    const thevenin = theveninTermination({ z0, vdd, vBias });
    const ac = acTermination({ z0, bitRateMbps: inputs.bitRateMbps });
    const differential = differentialTermination({ z0SingleEnded: z0 });

    const gammaBefore = reflectionCoefficient(Infinity, z0); // unterminated open end
    const gammaAfterParallel = reflectionCoefficient(parallel.rp, z0);
    const gammaAfterSeriesSource = series.gammaSource;

    const rec = recommendScheme({
      driverType: inputs.driverType,
      topology: inputs.topology,
      busStandard: inputs.busStandard,
      powerBudget: inputs.powerBudget,
      vttAvailable: inputs.vttAvailable,
    });

    let staticPowerW = 0;
    if (rec.scheme === 'parallel') staticPowerW = parallel.powerHighW;
    else if (rec.scheme === 'thevenin') staticPowerW = thevenin.staticPowerW;
    else staticPowerW = 0; // series, ac, differential (idle) ~ 0 static power

    return {
      z0,
      vdd,
      rDriver,
      series,
      parallel,
      thevenin,
      ac,
      differential,
      gammaBefore,
      gammaAfterParallel,
      gammaAfterSeriesSource,
      recommendation: rec,
      staticPowerW,
    };
  }

  window.TSCalc = {
    reflectionCoefficient,
    seriesTermination,
    parallelTermination,
    theveninTermination,
    acTermination,
    differentialTermination,
    recommendScheme,
    computeAll,
    formatOhms,
    formatFarads,
    formatWatts,
    formatGamma,
  };
})();
