// ═══════════════════════════════════════════════════════════
// ALKI EIDOLON ENGINE — INTEGRATOR (simulate.js)
// ═══════════════════════════════════════════════════════════
// Takes (profile, stack, options) → a week-by-week physiological state
// timeline. This is the engine's beating heart: it turns the static
// §5.8 compound vectors into a TIME-COURSE using the §6.2 dS/dt
// equation and the §6.1 three time-scales.
//
// Pure module: zero React/DOM imports. Ports to React Native untouched.
//
// ── How the §5.8 normalized vectors become physical state ────
// A §5.8 vector value V is a normalized 12-WEEK TARGET, not a rate.
// We:
//   1. Sum each state's V across the stack × dose_factor × modulation
//      (the "Σ_compounds" of §6.2). → target12  (the value AT week 12)
//   2. Convert target12 to physical units (kg for FM/LBM) via a scale
//      calibrated to the §5.1 clinical anchors (see WEIGHT_RESPONSE).
//   3. Integrate dS/dt toward an asymptote chosen so the state passes
//      through target12 exactly at the §5.8 reference horizon (12 wk),
//      with the ramp SHAPE governed by the state's τ (constants.js).
//      Protocols longer than 12 wk keep approaching the asymptote;
//      shorter protocols stop early. This honors §5.8 at its stated
//      horizon while giving a realistic exponential ramp.
//
// SCOPE (Sprint 2 — fat-loss class): FM, LBM(loss), VAT, BF, waist,
// facial fullness are wired + verified. The hooks for ceiling-lifted
// LBM GAIN (Sprint 3), GH-axis saturating water combine (Sprint 4),
// skin/tan (Sprint 5), recovery multiplier (Sprint 6) and regression
// (Sprint 7) are present but clearly marked — they stay inert for a
// pure fat-loss stack.

import { deriveAll } from "./derivations.js";
import {
  TIME_CONSTANTS_WEEKS,
  CEILING_SATURATION_K,
  TRAINING_LBM_MULTIPLIER,
  SEX_MODULATION,
  ESSENTIAL_FAT_PCT
} from "./constants.js";
import {
  COMPOUND_VECTORS,
  STATE_KEYS,
  referenceDose,
  getCompound
} from "./compoundVectors.js";

// ── Calibration constants ────────────────────────────────────
// The §5.8 "12-week projection" horizon. The integrator is calibrated
// so each state equals its summed §5.8 target at exactly this many weeks.
export const CALIBRATION_HORIZON_WEEKS = 12;

// Normalized→kg scale for the weight-changing states (FM, LBM).
// DERIVED (not invented) from the §5.1 semaglutide anchor:
//   §5.1: ΔW ≈ −0.0022 × W₀ × t_weeks  ⇒ at 12 wk, ΔW = −0.0264 × W₀
//   §5.8 semaglutide: V_FM + V_LBM = −0.40 + −0.15 = −0.55
//   WEIGHT_RESPONSE = 0.0264 / 0.55 = 0.048   (kg per |V| per kg bodyweight)
// So ΔFM_12wk(kg) = V_FM × WEIGHT_RESPONSE × W₀, same form for LBM.
// This reproduces semaglutide's published 12-wk weight loss exactly and
// scales every other fat-loss compound by its §5.8 vector relative to it.
export const WEIGHT_RESPONSE = 0.048;

// Normalized→kg scale for water compartments (ECW + ICW). §2.4: a fully
// glycogen/water-loaded trained male swings ~2.7 kg; MK-677 edema can add
// 5–10 lb. A unit-normalized water state ≈ 3 kg on a 70 kg-LBM frame.
// Mostly inert for the fat-loss class (Sprint 4 exercises this fully).
export const WATER_RESPONSE_KG = 3.0;

// Integration step (weeks). 0.25 keeps dt/τ ≤ 0.25 (τ_min = 1 wk for
// water) — comfortably stable for the relaxation ODE, smooth timeline.
const DT = 0.25;

// ── State → time-constant map (§6.1) ─────────────────────────
const STATE_TAU = {
  FM:   TIME_CONSTANTS_WEEKS.fat,       // 10 wk
  LBM:  TIME_CONSTANTS_WEEKS.lbm,       // 20 wk
  VAT:  TIME_CONSTANTS_WEEKS.visceral,  // 8 wk
  ECW:  TIME_CONSTANTS_WEEKS.ecw,       // 1 wk (fast — the puffiness layer)
  ICW:  TIME_CONSTANTS_WEEKS.icw,       // 2 wk
  Coll: TIME_CONSTANTS_WEEKS.collagen,  // 12 wk
  Tan:  TIME_CONSTANTS_WEEKS.tan,       // 4 wk
  Vasc: TIME_CONSTANTS_WEEKS.androgen   // 1.5 wk (treated as a fast-ramp boost)
};

// ── Helpers ──────────────────────────────────────────────────
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// Fraction of the way to the asymptote that an exponential approach with
// time-constant τ has covered at week t. We calibrate the asymptote by
// DIVIDING the 12-wk target by rampFrac(12) so the state == target at wk 12.
function rampFrac(t, tau) { return 1 - Math.exp(-t / tau); }

// Normalize a stack entry to { key, doseFactor }.
// Accepts "semaglutide" or { key, dose } or { compoundKey, dose }.
function normalizeStackEntry(entry) {
  const key = typeof entry === "string" ? entry : (entry.key || entry.compoundKey || entry.id);
  const compound = getCompound(key);
  if (!compound) return null;
  let doseFactor = 1;
  const dose = typeof entry === "object" ? Number(entry.dose) : NaN;
  const ref = referenceDose(key);
  if (!Number.isNaN(dose) && ref) {
    doseFactor = clamp(dose / ref, 0, 1.5); // §6.2 clamp at 1.5
  }
  return { key, compound, doseFactor };
}

/**
 * Run the deterministic simulation.
 *
 * @param {object} profile  App imperial profile { sex, age, heightFt, heightIn, weight, bodyFat, adv }
 * @param {Array}  stack    Compound keys (strings) or { key, dose } objects
 * @param {object} [options]
 *   @param {number} options.weeks            Protocol duration (default 12)
 *   @param {string} options.trainingStatus   untrained|novice|intermediate|advanced|elite (default "intermediate")
 *   @param {number} options.fitzpatrick      1–6 (Sprint 5; carried through)
 * @returns {{
 *   baseline: object, timeline: object[], final: object,
 *   derivations: object, meta: object
 * } | null}
 */
export function simulate(profile, stack = [], options = {}) {
  const der = deriveAll(profile);
  if (!der) return null;

  const weeks = options.weeks ?? CALIBRATION_HORIZON_WEEKS;
  const trainingStatus = options.trainingStatus || "intermediate";
  const sex = der.inputs.sex;
  const W0 = der.inputs.weightKg;
  const LBM0 = der.composition.lbmKg;
  const FM0 = der.composition.fatMassKg;
  const BF0 = der.inputs.bfFrac;
  const LBM_max = der.caseyButt.lbmMaxKg;
  const essentialFatKg = (ESSENTIAL_FAT_PCT[sex] / 100) * W0; // §"Key Findings" #5

  // Resolve the stack to known compounds.
  const resolved = (stack || []).map(normalizeStackEntry).filter(Boolean);

  // ── Aggregate the stack into per-state 12-week targets (§6.2 Σ) ──
  // sumV[state] = Σ_compounds V_state × dose_factor. Additive, per §6.2.
  // (Sprint 4 swaps ECW/ICW/GH-tone for the saturating `1−∏(1−tone_i)`
  // combine; additive is correct for a non-GH fat-loss stack.)
  const sumV = Object.fromEntries(STATE_KEYS.map(k => [k, 0]));
  let ceilingLiftSum = 0;   // §2.3 LBM_max_effective (Sprint 3 consumer)
  let recoveryBonus = 0;    // §5.3 R multiplier (Sprint 6 consumer)
  const androgenTones = []; // §6.4 upper-body bias (Sprint 3 consumer)
  let fitzpatrick = options.fitzpatrick ?? null;

  const sexMod = SEX_MODULATION[sex] || SEX_MODULATION.male;
  const trainMult = TRAINING_LBM_MULTIPLIER[trainingStatus] ?? 1.0;

  for (const { compound, doseFactor } of resolved) {
    for (const k of STATE_KEYS) {
      let v = (compound.vector[k] || 0) * doseFactor;

      // §6.4 sex modulation, applied to LBM only.
      if (k === "LBM" && v > 0) {
        // Anabolic GAIN: SARMs double for women; non-anabolic halve.
        if (compound.class === "sarm" || compound.class === "anabolic") {
          v *= sexMod.sarmLbmRate;     // ×2 for women (Sprint 3 verifies)
        } else {
          v *= sexMod.nonAnabolicLbmRate; // ×0.5 for women on GH-axis etc.
        }
      }
      sumV[k] += v;
    }
    ceilingLiftSum += (compound.ceilingLift || 0) * doseFactor;
    recoveryBonus += (compound.recoveryMultiplier || 0) * doseFactor;
    if (compound.androgenTone) androgenTones.push(compound.androgenTone * doseFactor);
  }

  // §2.3 dynamically-lifted ceiling (Sprint 3 uses for LBM gain saturation).
  const LBM_max_effective = LBM_max * (1 + ceilingLiftSum);
  // §6.2 R multiplier applies to LBM GAIN only (Sprint 6).
  const R = 1 + recoveryBonus;
  // §6.4 androgen tone — saturating combine `1 − ∏(1 − tone_i)` (not additive).
  const androgenTone = 1 - androgenTones.reduce((p, t) => p * (1 - clamp(t, 0, 1)), 1);
  // Vasodilator boost feeds the §7 vascularity formula. Clamp [0,1].
  const vasodilatorBoost = clamp(sumV.Vasc, 0, 1);

  // ── Convert summed targets → physical 12-week deltas ─────────
  // FM and LBM in kg; VAT/ECW/ICW/Coll/Tan stay normalized.
  // ΔX_12 is the value the state should reach at CALIBRATION_HORIZON_WEEKS.
  const target12 = {
    FM_kg:  sumV.FM * WEIGHT_RESPONSE * W0,
    LBM_kg: computeLbmTarget12(sumV.LBM, W0, LBM0, LBM_max_effective, trainMult, R),
    VAT:    sumV.VAT,   // normalized reduction multiplier (drives visceral morph)
    ECW:    sumV.ECW,   // normalized
    ICW:    sumV.ICW,   // normalized
    Coll:   sumV.Coll,  // normalized 0..1 accumulator
    Tan:    sumV.Tan    // normalized 0..1 accumulator (Fitzpatrick cap in mapToMorphs)
  };

  // ── Integrate the §6.2 relaxation ODE week by week ───────────
  // For each state: choose an asymptote so the state hits target12 at the
  // 12-wk horizon, then dS/dt = (asymptote − S) / τ, Euler-stepped at DT.
  function asymptoteDelta(target12Val, tau) {
    const frac = rampFrac(CALIBRATION_HORIZON_WEEKS, tau);
    return frac > 0 ? target12Val / frac : target12Val;
  }

  const asym = {
    FM:  asymptoteDelta(target12.FM_kg,  STATE_TAU.FM),
    LBM: asymptoteDelta(target12.LBM_kg, STATE_TAU.LBM),
    VAT: asymptoteDelta(target12.VAT,    STATE_TAU.VAT),
    ECW: asymptoteDelta(target12.ECW,    STATE_TAU.ECW),
    ICW: asymptoteDelta(target12.ICW,    STATE_TAU.ICW),
    Coll: asymptoteDelta(target12.Coll,  STATE_TAU.Coll),
    Tan: asymptoteDelta(target12.Tan,    STATE_TAU.Tan)
  };

  // Live state (deltas from baseline, except FM/LBM which are absolute kg).
  let FM = FM0;
  let LBM = LBM0;
  let dVAT = 0, dECW = 0, dICW = 0, dColl = 0, dTan = 0;

  const baseline = snapshot(0, FM0, LBM0, W0, BF0, 0, 0, 0, 0, 0, FM0, LBM0, der, vasodilatorBoost, androgenTone);
  const timeline = [baseline];

  const steps = Math.round(weeks / DT);
  for (let i = 1; i <= steps; i++) {
    const t = i * DT;

    // FM: relax toward FM0 + asym.FM, floored at essential fat.
    const fmTargetAbs = FM0 + asym.FM;
    FM += ((fmTargetAbs - FM) / STATE_TAU.FM) * DT;
    FM = Math.max(essentialFatKg, FM);

    // LBM: relax toward LBM0 + asym.LBM.
    // GAINS saturate against the (lifted) Casey-Butt ceiling (§2.3);
    // losses (catabolic / GLP-1 lean loss) have no upper-ceiling brake.
    const lbmTargetAbs = LBM0 + asym.LBM;
    let lbmRate = (lbmTargetAbs - LBM) / STATE_TAU.LBM;
    if (lbmRate > 0) {
      const sat = Math.pow(Math.max(0, 1 - LBM / LBM_max_effective), CEILING_SATURATION_K);
      lbmRate *= sat;
    }
    LBM += lbmRate * DT;

    // Normalized states — simple relaxation toward their asymptote.
    dVAT += ((asym.VAT - dVAT) / STATE_TAU.VAT) * DT;
    dECW += ((asym.ECW - dECW) / STATE_TAU.ECW) * DT;
    dICW += ((asym.ICW - dICW) / STATE_TAU.ICW) * DT;
    dColl += ((asym.Coll - dColl) / STATE_TAU.Coll) * DT;
    dTan += ((asym.Tan - dTan) / STATE_TAU.Tan) * DT;

    // Sample on whole-week boundaries (and the final step).
    const isWeekBoundary = Math.abs(t - Math.round(t)) < 1e-9;
    if (isWeekBoundary || i === steps) {
      const waterAddedKg = (dECW + dICW) * WATER_RESPONSE_KG * (LBM0 / 70);
      const BW = FM + LBM + waterAddedKg;
      const BF = BW > 0 ? FM / BW : BF0;
      timeline.push(
        snapshot(round2(t), FM, LBM, BW, BF, dVAT, dECW, dICW, dColl, dTan, FM0, LBM0, der, vasodilatorBoost, androgenTone)
      );
    }
  }

  const final = timeline[timeline.length - 1];

  return {
    baseline,
    timeline,
    final,
    derivations: der,
    meta: {
      sex,
      weeks,
      trainingStatus,
      fitzpatrick,
      stack: resolved.map(r => ({ key: r.key, label: r.compound.label, evidence: r.compound.evidence, doseFactor: r.doseFactor })),
      // Lowest evidence grade in the stack drives the UI confidence overlay (§8).
      evidenceFloor: lowestEvidence(resolved.map(r => r.compound.evidence)),
      ceilingLiftSum,
      LBM_max_effectiveKg: LBM_max_effective,
      recoveryMultiplier: R,
      androgenTone,
      vasodilatorBoost,
      // Δ summary for quick UI / verification readouts.
      deltaFM_kg: final.FM - FM0,
      deltaLBM_kg: final.LBM - LBM0,
      deltaBF_pts: (final.BF - BF0) * 100
    }
  };
}

// ── LBM 12-week target (kg) ──────────────────────────────────
// Sprint 2: both signs use the WEIGHT_RESPONSE × W₀ scale (matches the
// §5.1 GLP-1 lean-loss anchor). The positive-gain branch is intentionally
// provisional — SPRINT 3 replaces it with a Casey-Butt headroom model
// anchored to testosterone +7.9 kg/20 wk (§5.6), applying training (§6.3)
// and the ceiling lift (§2.3). trainMult/R are threaded now so that swap
// is local to this function.
function computeLbmTarget12(sumVLbm, W0, LBM0, LBM_max_effective, trainMult, R) {
  const base = sumVLbm * WEIGHT_RESPONSE * W0;
  if (base <= 0) return base; // catabolic / GLP-1 lean loss — no training buff
  // Provisional gain path (Sprint 3 will re-anchor): apply newbie-gains and
  // recovery multipliers; ceiling saturation is handled in the integrator.
  return base * trainMult * R;
}

// ── Snapshot builder ─────────────────────────────────────────
function snapshot(week, FM, LBM, BW, BF, dVAT, dECW, dICW, dColl, dTan, FM0, LBM0, der, vasodilatorBoost, androgenTone) {
  return {
    week,
    FM, LBM, BW, BF,
    // Normalized deltas from baseline (drive the §7 mapping layer):
    dVAT, dECW, dICW, dColl, dTan,
    vasodilatorBoost,
    androgenTone,
    // Carried baselines + derivations the mapper needs without re-deriving:
    BF0: der.inputs.bfFrac,
    LBM0,
    FM0
  };
}

function round2(x) { return Math.round(x * 100) / 100; }

function lowestEvidence(grades) {
  const order = ["A", "B", "C", "D"];
  let worst = "A";
  for (const g of grades) {
    if (order.indexOf(g) > order.indexOf(worst)) worst = g;
  }
  return grades.length ? worst : null;
}

export default simulate;
