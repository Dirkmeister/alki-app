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
// SCOPE (Sprint 4 — GH-axis + water): the fat-loss (Sprint 2) and
// muscle-gain (Sprint 3) paths are unchanged. Sprint 4 wires the
// PUFFINESS layer: ECW/ICW now combine via the §5.2 saturating function
// `1 − ∏(1 − vᵢ)` (GH-axis peptides do NOT stack linearly) instead of
// summing additively; a single GH-axis tone scalar is exposed for the
// §5.2 ceiling (MK-677 + CJC-DAC ≈ 0.85, never 1.0+); and an
// estrogen/aromatization flag (E) is derived for the §7 water term.
// Water rides the FAST τ ≈ 1 wk constant (STATE_TAU.ECW), so a wet stack
// visibly puffs the Eidolon within the first simulated week — before any
// fat (τ ≈ 10 wk) or lean (τ ≈ 20 wk) tissue change. The skin/tan
// (Sprint 5), recovery multiplier (Sprint 6) and regression (Sprint 7)
// hooks remain present but inert until their sprint.

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

// Normalized→(kg/week) scale for ANABOLIC LBM GAIN — the Sprint-3 muscle
// anchor. This is a RATE coefficient, not a 12-wk target: §6.2 puts the
// ceiling brake `(1 − LBM/LBM_max)^k` on the GAIN RATE, so a fixed 12-wk
// target can't be guaranteed (saturation reshapes the curve per subject).
// We therefore integrate dLBM/dt = G·ΔLBM·trainMult·R·(1 − LBM/LBM_max_eff)^k
// and DERIVE G from the testosterone anchor (no invented number):
//
//   §5.6 anchor: Bhasin 1996 — untrained men, +7.9 kg FFM @ 20 wk on
//                testosterone 600 mg/wk (the figure §6.1 builds its
//                "half the gain by wk 8–10" time-course around).
//   Reference subject (the Sprint-1 verify profile): M, 180 cm, 80 kg,
//                15% BF → LBM₀ = 68.0 kg; Casey-Butt LBM_max ≈ 86.3 kg.
//   Testosterone §5.8: ΔLBM = +0.70, ceiling lift +0.40
//                → LBM_max_eff = 86.3 × 1.40 = 120.8 kg.
//   Training: untrained → trainMult = 1.5 (§6.3).
//
//   Solve the separable ODE (k = 1.5) for G so LBM(20) = 75.9 kg:
//     ∫ closed form → 2(u^−½ − u₀^−½) = (a/LBM_max_eff)·t,  u = 1 − LBM/LBM_max_eff
//     u₀ = 0.43699 (u₀^−½ = 1.5128);  u₂₀ = 0.37158 (u₂₀^−½ = 1.6405)
//     a = 2(1.6405 − 1.5128)·120.8/20 = 1.543  (a = G·ΔLBM·trainMult)
//     G = 1.543 / (0.70 × 1.5) = 1.469
//
// At wk 12 this reference case reaches +5.0 kg (≈63% of the 20-wk gain) —
// matching §6.1's "roughly half by wk 8–10." Every other anabolic scales
// off its own §5.8 ΔLBM relative to testosterone's +0.70.
export const LBM_GAIN_RESPONSE = 1.469;

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

// §5.2 / §6.1 — same-pathway SATURATING COMBINE: tone = 1 − ∏(1 − vᵢ).
// GH-axis peptides (and water compartments generally) do NOT add
// linearly — three GH-axis agents can't push past the body's retention
// ceiling. This combine reduces to vᵢ for a single contributor, so every
// single-compound Sprint 2/3 projection is unchanged; only multi-compound
// water/GH stacks now saturate instead of summing. Each vᵢ is clamped to
// [0,1] before the product (the §5.8 ECW/ICW/tone columns are all ≥ 0).
function saturatingCombine(contribs) {
  return 1 - contribs.reduce((p, v) => p * (1 - clamp(v, 0, 1)), 1);
}

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
  // sumV[state] = Σ_compounds V_state × dose_factor. Additive for the
  // tissue states (FM/LBM/VAT/Coll/Tan/Vasc, per §6.2). The water
  // compartments (ECW/ICW) and the GH-axis tone are the EXCEPTION: §5.2
  // mandates a saturating combine `1 − ∏(1 − vᵢ)`, collected below and
  // combined after the loop.
  const sumV = Object.fromEntries(STATE_KEYS.map(k => [k, 0]));
  // §6.2 LBM is split into two channels with different dynamics:
  //   sumLbmGain — anabolic gain (saturating-rate ODE, ceiling-braked)
  //   sumLbmLoss — catabolic / GLP-1 lean loss (relaxation, NO ceiling)
  // Both already dose-scaled; gain is sex-modulated below per §6.4.
  let sumLbmGain = 0;
  let sumLbmLoss = 0;
  let ceilingLiftSum = 0;     // §2.3 LBM_max_effective
  let recoveryBonus = 0;      // §5.3 R multiplier (Sprint 6 consumer)
  const androgenTones = [];   // §6.4 upper-body bias (drives regional morphs)
  const ghAxisTones = [];     // §5.2 GH-axis tone — saturating combine
  const ecwContribs = [];     // §5.2 water states combine saturatingly, NOT additively
  const icwContribs = [];
  const estrogenContribs = []; // §3/§7 E flag — aromatizing wet anabolics
  let fitzpatrick = options.fitzpatrick ?? null;

  const sexMod = SEX_MODULATION[sex] || SEX_MODULATION.male;
  const trainMult = TRAINING_LBM_MULTIPLIER[trainingStatus] ?? 1.0;

  for (const { compound, doseFactor } of resolved) {
    for (const k of STATE_KEYS) {
      let v = (compound.vector[k] || 0) * doseFactor;

      if (k === "LBM") {
        if (v > 0) {
          // §6.4 sex modulation of anabolic GAIN. The Neil-2018 doubling
          // is specifically a SARM result, so it applies to class "sarm"
          // only. Testosterone (class "anabolic") is neither a SARM nor a
          // "non-anabolic" stack → unmodulated (×1). GH-axis and other
          // gains are non-anabolic → halved for women.
          if (compound.class === "sarm")            v *= sexMod.sarmLbmRate;
          else if (compound.class !== "anabolic")   v *= sexMod.nonAnabolicLbmRate;
          sumLbmGain += v;
        } else {
          sumLbmLoss += v; // catabolic/GLP-1 loss — not sex-modulated (§6.4)
        }
        sumV[k] += v; // sumV.LBM keeps the net for meta/debug readouts
        continue;
      }

      // §5.2 — ECW & ICW do NOT stack linearly. Collect each compound's
      // contribution; saturatingCombine() folds them after the loop so a
      // GH-axis pile-up can't drive water past the retention ceiling.
      if (k === "ECW") { ecwContribs.push(v); continue; }
      if (k === "ICW") { icwContribs.push(v); continue; }

      sumV[k] += v;
    }
    ceilingLiftSum += (compound.ceilingLift || 0) * doseFactor;
    recoveryBonus += (compound.recoveryMultiplier || 0) * doseFactor;
    if (compound.androgenTone) androgenTones.push(compound.androgenTone * doseFactor);
    if (compound.ghAxisTone)   ghAxisTones.push(compound.ghAxisTone * doseFactor);
    // §3/§5.6 estrogen-aromatization flag (E): driven by WET ANABOLIC
    // androgens (testosterone class). GH-axis "wet" peptides already drive
    // ECW directly via their own vector, so they're excluded here to avoid
    // double-counting the §7 water terms. No §5.8 E magnitude exists to
    // pull, so the strength is the dose-normalized presence (dose_factor,
    // a spec-defined quantity) — flagged as a modeling choice, not a
    // fabricated number.
    if (compound.wet && compound.class === "anabolic") {
      estrogenContribs.push(doseFactor);
    }
  }

  // §5.2 saturating combine — water compartments + GH-axis tone + E flag.
  sumV.ECW = saturatingCombine(ecwContribs);
  sumV.ICW = saturatingCombine(icwContribs);
  // §5.2 GH-axis tone scalar (MK-677≈0.5, Ipa+CJC≈0.6, CJC-DAC≈0.7;
  // MK-677+CJC-DAC ≈ 0.85, never 1.0+). Surfaced in meta for the UI + verify.
  const ghAxisTone = saturatingCombine(ghAxisTones);
  // §3/§7 estrogen/aromatization flag (0..1) — third term of the water morph.
  const estrogenFlag = saturatingCombine(estrogenContribs);

  // §2.3 dynamically-lifted ceiling — governs the anabolic gain brake below.
  const LBM_max_effective = LBM_max * (1 + ceilingLiftSum);
  // §5.3/§6.2 R multiplier applies to LBM GAIN only (≈1 until Sprint 6 adds BPC/TB).
  const R = 1 + recoveryBonus;
  // §6.4 androgen tone — saturating combine `1 − ∏(1 − tone_i)` (not additive).
  const androgenTone = saturatingCombine(androgenTones);
  // Vasodilator boost feeds the §7 vascularity formula. Clamp [0,1].
  const vasodilatorBoost = clamp(sumV.Vasc, 0, 1);

  // ── Anabolic LBM-gain driving coefficient (kg/week, §6.2) ────
  // dLBM/dt = lbmGainCoeff × (1 − LBM/LBM_max_eff)^k. Sex modulation is
  // already folded into sumLbmGain; trainMult (§6.3) and R (§5.3) scale
  // the whole gain. The ceiling brake is applied per-step in the loop.
  const lbmGainCoeff = LBM_GAIN_RESPONSE * sumLbmGain * trainMult * R;

  // ── Convert summed targets → physical 12-week deltas ─────────
  // FM in kg; LBM-LOSS in kg (GLP-1/T3, relaxation, no ceiling — same
  // WEIGHT_RESPONSE scale as the §5.1 GLP-1 lean-loss anchor);
  // VAT/ECW/ICW/Coll/Tan stay normalized. ΔX_12 is the value each state
  // should reach at CALIBRATION_HORIZON_WEEKS.
  const target12 = {
    FM_kg:      sumV.FM   * WEIGHT_RESPONSE * W0,
    LBMloss_kg: sumLbmLoss * WEIGHT_RESPONSE * W0, // ≤ 0
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
    FM:      asymptoteDelta(target12.FM_kg,      STATE_TAU.FM),
    LBMloss: asymptoteDelta(target12.LBMloss_kg, STATE_TAU.LBM),
    VAT:  asymptoteDelta(target12.VAT,  STATE_TAU.VAT),
    ECW:  asymptoteDelta(target12.ECW,  STATE_TAU.ECW),
    ICW:  asymptoteDelta(target12.ICW,  STATE_TAU.ICW),
    Coll: asymptoteDelta(target12.Coll, STATE_TAU.Coll),
    Tan:  asymptoteDelta(target12.Tan,  STATE_TAU.Tan)
  };

  // Live state. FM is absolute kg; LBM is rebuilt each step from its two
  // channels (anabolic gain accumulator + catabolic-loss relaxation delta).
  let FM = FM0;
  let lbmGainAccum = 0; // kg of anabolic LBM accrued (saturating)
  let lbmLossDelta = 0; // kg of catabolic/GLP-1 LBM loss (≤ 0, relaxation)
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

    // LBM — two coupled channels (§6.2):
    //   • Anabolic GAIN: saturating-rate ODE braked by the (lifted)
    //     Casey-Butt ceiling (§2.3). Rate is highest at baseline and
    //     decays toward 0 as LBM approaches LBM_max_effective — this is
    //     what reproduces diminishing returns / "advanced gains far less."
    //   • Catabolic / GLP-1 LOSS: exponential relaxation toward its 12-wk
    //     target, with NO ceiling brake.
    const lbmNow = LBM0 + lbmGainAccum + lbmLossDelta;
    if (lbmGainCoeff > 0) {
      const sat = Math.pow(Math.max(0, 1 - lbmNow / LBM_max_effective), CEILING_SATURATION_K);
      lbmGainAccum += lbmGainCoeff * sat * DT;
    }
    lbmLossDelta += ((asym.LBMloss - lbmLossDelta) / STATE_TAU.LBM) * DT;
    const LBM = LBM0 + lbmGainAccum + lbmLossDelta;

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
      ghAxisTone,
      estrogenFlag,
      vasodilatorBoost,
      // Δ summary for quick UI / verification readouts.
      deltaFM_kg: final.FM - FM0,
      deltaLBM_kg: final.LBM - LBM0,
      deltaBF_pts: (final.BF - BF0) * 100
    }
  };
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
