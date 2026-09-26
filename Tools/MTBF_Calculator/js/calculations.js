/*
 * calculations.js — MTBF & Reliability Calculator
 * Pure, documented calculation functions. No DOM access here.
 *
 * Reference standards (informational, not fully implemented handbook models):
 *  - IEC 61709: Electronic component reliability — reference conditions and
 *    stress models for failure-rate prediction.
 *  - MIL-HDBK-217F: Reliability Prediction of Electronic Equipment —
 *    part-stress and parts-count methods with pi-factors (temperature,
 *    environment, quality, etc.).
 *  - Telcordia SR-332: Reliability Prediction Procedure for Electronic
 *    Equipment, widely used in telecom.
 *
 * This tool implements a simplified, order-of-magnitude engineering model
 * inspired by the pi-factor approach common to all three standards:
 *   FIT(effective) = FIT(base) x πT (temperature) x πE (environment) x quantity
 * It is intended for design exploration and comparative analysis, not as a
 * certified handbook implementation.
 */
(function (global) {
  'use strict';

  // ── Environment factor table (πE-style multiplier) ──────────────────────
  // Values are representative multipliers reflecting increasing severity of
  // the operating environment (higher = harsher = more failures).
  const ENVIRONMENT_FACTORS = {
    ground_benign: { label: 'Ground Benign (GB)', factor: 1.0 },
    ground_fixed: { label: 'Ground Fixed (GF)', factor: 2.0 },
    ground_mobile: { label: 'Ground Mobile (GM)', factor: 4.0 },
    naval: { label: 'Naval Sheltered (NS)', factor: 5.0 },
    airborne: { label: 'Airborne Inhabited (AIC)', factor: 8.0 },
    space: { label: 'Space Flight (SF)', factor: 0.5 },
    industrial: { label: 'Industrial', factor: 3.0 },
    automotive: { label: 'Automotive', factor: 6.0 },
    medical: { label: 'Medical (controlled)', factor: 1.5 },
  };

  /**
   * Arrhenius-style temperature acceleration factor.
   * AF = exp[ (Ea / k) x (1/Tref - 1/Tuse) ]
   * where:
   *   Ea   = activation energy (eV) — using a representative 0.4 eV for a
   *          mixed electronic assembly (typical range 0.3–0.7 eV)
   *   k    = Boltzmann constant = 8.617333262e-5 eV/K
   *   Tref = reference temperature, 298.15 K (25°C)
   *   Tuse = operating temperature in Kelvin
   * A higher operating temperature increases AF (more failures expected).
   * @param {number} tempC operating temperature in °C (-40 to 125)
   * @param {number} [ea] activation energy in eV (default 0.4)
   * @returns {number} temperature acceleration multiplier (>= ~0.01, dimensionless)
   */
  function temperatureFactor(tempC, ea) {
    const Ea = ea || 0.4;
    const k = 8.617333262e-5; // eV/K
    const Tref = 298.15; // K (25 degC)
    const Tuse = tempC + 273.15;
    const af = Math.exp((Ea / k) * (1 / Tref - 1 / Tuse));
    return af;
  }

  /**
   * Look up the environment multiplier for a given environment key.
   * @param {string} key one of ENVIRONMENT_FACTORS keys
   * @returns {number} multiplier factor
   */
  function environmentFactor(key) {
    return (ENVIRONMENT_FACTORS[key] || ENVIRONMENT_FACTORS.ground_benign).factor;
  }

  /**
   * Calculated FIT for a single component row.
   * rowFIT = baseFIT x quantity x temperatureFactor x environmentFactor
   * @param {number} baseFIT base failure rate (FIT, per 1e9 hours) at reference conditions
   * @param {number} quantity number of identical instances
   * @param {number} tFactor temperature acceleration multiplier
   * @param {number} eFactor environment multiplier
   * @returns {number} effective FIT contribution of this row
   */
  function rowFIT(baseFIT, quantity, tFactor, eFactor) {
    return (
      Math.max(0, baseFIT) * Math.max(0, quantity) * Math.max(0, tFactor) * Math.max(0, eFactor)
    );
  }

  /**
   * Sum total system FIT across all component rows.
   * Total FIT = Σ(rowFIT_i)
   * @param {Array<{calculatedFIT:number}>} rows
   * @returns {number} total FIT
   */
  function totalFIT(rows) {
    return rows.reduce((sum, r) => sum + (Number(r.calculatedFIT) || 0), 0);
  }

  /**
   * Convert total FIT to failure rate lambda (failures per hour).
   * λ = FIT x 10^-9  [failures / hour]
   * @param {number} fit total FIT
   * @returns {number} lambda in failures/hour
   */
  function fitToLambda(fit) {
    return fit * 1e-9;
  }

  /**
   * Mean Time Between Failures.
   * MTBF = 1 / λ  [hours]
   * @param {number} lambda failure rate in failures/hour
   * @returns {number} MTBF in hours (Infinity if lambda is 0)
   */
  function mtbfHours(lambda) {
    if (lambda <= 0) return Infinity;
    return 1 / lambda;
  }

  // ── Unit conversions ─────────────────────────────────────────────────────
  const HOURS_PER_DAY = 24;
  const HOURS_PER_MONTH = 24 * 30.4375; // average month
  const HOURS_PER_YEAR = 24 * 365.25; // average year (leap-adjusted)

  /**
   * Convert a duration expressed in a given unit to hours.
   * @param {number} value duration value
   * @param {'hours'|'days'|'months'|'years'} unit
   * @returns {number} duration in hours
   */
  function toHours(value, unit) {
    switch (unit) {
      case 'hours':
        return value;
      case 'days':
        return value * HOURS_PER_DAY;
      case 'months':
        return value * HOURS_PER_MONTH;
      case 'years':
        return value * HOURS_PER_YEAR;
      default:
        return value;
    }
  }

  /**
   * Express an MTBF (in hours) as a breakdown of hours/days/years for display.
   * @param {number} hours
   * @returns {{hours:number, days:number, years:number}}
   */
  function mtbfBreakdown(hours) {
    if (!Number.isFinite(hours)) return { hours: Infinity, days: Infinity, years: Infinity };
    return {
      hours,
      days: hours / HOURS_PER_DAY,
      years: hours / HOURS_PER_YEAR,
    };
  }

  /**
   * Reliability function.
   * R(t) = e^(-λt)
   * Probability the system survives without failure through time t, given
   * a constant failure rate λ (exponential / "useful life" region of the
   * bathtub curve).
   * @param {number} lambda failure rate in failures/hour
   * @param {number} tHours mission time in hours
   * @returns {number} reliability, 0..1
   */
  function reliability(lambda, tHours) {
    return Math.exp(-lambda * tHours);
  }

  /**
   * Unreliability / probability of failure.
   * F(t) = 1 - R(t)
   * @param {number} rt reliability value 0..1
   * @returns {number} probability of failure 0..1
   */
  function unreliability(rt) {
    return 1 - rt;
  }

  /**
   * Steady-state (inherent) availability.
   * A = MTBF / (MTBF + MTTR)
   * @param {number} mtbf hours
   * @param {number} mttr hours (Mean Time To Repair)
   * @returns {number} availability fraction 0..1
   */
  function availability(mtbf, mttr) {
    if (!Number.isFinite(mtbf)) return 1;
    const denom = mtbf + Math.max(0, mttr);
    if (denom <= 0) return 1;
    return mtbf / denom;
  }

  /**
   * Build an array of {t, r, f} points for plotting R(t)/F(t) curves from 0
   * to a given max time, at N samples.
   * @param {number} lambda
   * @param {number} tMaxHours
   * @param {number} [points]
   * @returns {Array<{t:number, r:number, f:number}>}
   */
  function reliabilityCurve(lambda, tMaxHours, points) {
    const n = points || 100;
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = (tMaxHours * i) / n;
      const r = reliability(lambda, t);
      out.push({ t, r, f: unreliability(r) });
    }
    return out;
  }

  // ── Validation ────────────────────────────────────────────────────────────
  /**
   * Validate a single component row's raw inputs.
   * @param {{name:string, quantity:number, baseFIT:number}} row
   * @returns {string[]} array of human-readable error messages (empty = valid)
   */
  function validateRow(row) {
    const errors = [];
    if (!row.name || !String(row.name).trim()) errors.push('Component name is required.');
    if (!(Number(row.quantity) > 0))
      errors.push(`Quantity for "${row.name || 'row'}" must be greater than zero.`);
    if (!(Number(row.baseFIT) >= 0))
      errors.push(`Failure rate (FIT) for "${row.name || 'row'}" cannot be negative.`);
    return errors;
  }

  /**
   * Validate the global operating condition inputs.
   * @param {{tempC:number, missionTime:number, mttr:number}} s
   * @returns {string[]} array of error messages
   */
  function validateGlobals(s) {
    const errors = [];
    if (s.tempC < -40 || s.tempC > 125)
      errors.push('Operating temperature must be between -40°C and 125°C.');
    if (!(s.missionTime > 0)) errors.push('Mission time must be greater than zero.');
    if (s.mttr < 0) errors.push('MTTR cannot be negative.');
    return errors;
  }

  global.MTBF_CALC = {
    ENVIRONMENT_FACTORS,
    temperatureFactor,
    environmentFactor,
    rowFIT,
    totalFIT,
    fitToLambda,
    mtbfHours,
    toHours,
    mtbfBreakdown,
    reliability,
    unreliability,
    availability,
    reliabilityCurve,
    validateRow,
    validateGlobals,
    HOURS_PER_DAY,
    HOURS_PER_MONTH,
    HOURS_PER_YEAR,
  };
})(window);
