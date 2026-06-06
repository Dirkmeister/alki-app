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
// SCOPE (Sprint 6 — recovery multiplier + thermogenics): Sprints 2–5 are
// unchanged. This sprint makes the §5.3 recovery multiplier R first-class.
// R was already applied to the anabolic LBM-gain rate (it is the §6.2
// R_multiplier term); Sprint 6 (a) combines the BPC/TB-500 contributions
// with the same saturating rule the GH-axis/water states use, so a pile of
// repair peptides can't run R past the §5.3 +0.15–0.20 combined ceiling,
// and (b) surfaces R honestly as a "gains accelerator" in meta — a number
// that ONLY changes the body when a co-stacked anabolic is present (BPC/TB
// alone move no body-composition morph). The §5.7 thermogenics (Cardarine,
// SR-9009, AICAR, SLU-PP-332, clenbuterol, T3) already flow through the
// §6.2 loop from their §5.8 vectors; Sprint 6 collects their §5.7 safety
// flags into meta.warnings (carcinogen, preclinical, β2-desensitization
// cycling caveat). T3's −0.20 LBM rides the existing catabolic loss channel
// (leaner AND flatter). Clenbuterol desensitization is disclosure-only
// (2026-05-28) — the §5.8 vector is kept; no invented attenuation depth.
//
// SCOPE (Sprint 7 — regression / "what if I stop?"): the on-phase simulate()
// above is UNCHANGED (Sprints 2–6 behave identically). This sprint adds the
// §6.5 decay pass as TWO new pure functions, leaving the on-phase integrator
// byte-for-byte intact:
//   • simulateCessation(onResult, {weeks}) — takes a completed protocol and
//     relaxes every state back toward its pre-treatment baseline using the
//     §6.5 DECAY_CONSTANTS_WEEKS τ's (the §6.2 "−decay·(S−S_baseline)" term,
//     now active because no compound is pushing). Water deflates fast (τ≈1.5),
//     muscle decays slow (τ≈16), tan fades (τ≈12), collagen slowest (τ≈24).
//     FAT is the exception: it does NOT relax linearly — for a GLP-1 protocol
//     it follows the Wilding rebound (GLP1_FAT_REBOUND: regain 2/3 of the lost
//     fat within a year); for a non-GLP-1 protocol fat regression is caloric/
//     diet-dependent and the spec gives no curve, so FM is HELD with an
//     explicit disclosure (flag-don't-fabricate, per the §5.8-precedence rule).
//   • simulateProtocol(profile, stack, {weeks, offWeeks}) — convenience that
//     runs the on-phase then the cessation phase and stitches them into ONE
//     continuous absolute-week timeline for the avatar's "ramp then decay" arc.

import { deriveAll } from "./derivations.js";
import {
  TIME_CONSTANTS_WEEKS,
  CEILING_SATURATION_K,
  TRAINING_LBM_MULTIPLIER,
  SEX_MODULATION,
  ESSENTIAL_FAT_PCT,
  DECAY_CONSTANTS_WEEKS,
  GLP1_FAT_REBOUND
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

// Default horizon for the §6.5 cessation/decay pass (weeks AFTER stopping).
// 26 wk (~6 mo) is long enough to show the full arc: water gone in ~3 wk,
// most muscle decay by ~12 wk, collagen still mid-fade, GLP-1 fat ~halfway
// back. The Wilding rebound anchor itself is at 52 wk (GLP1_FAT_REBOUND).
export const DEFAULT_CESSATION_WEEKS = 26;

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
  const recoveryContribs = []; // §5.3 R multiplier — saturating combine (Sprint 6)
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
    // §5.3 R: each repair peptide contributes its recoveryMultiplier; we
    // collect and saturating-combine after the loop (see R below) so two
    // (BPC+TB) land at ~0.19 — inside §5.3's "+0.15 to +0.20 combined" —
    // and three can't sum past the body's finite repair-capacity ceiling.
    if (compound.recoveryMultiplier) recoveryContribs.push(compound.recoveryMultiplier * doseFactor);
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
  // §5.3/§6.2 R multiplier applies to LBM GAIN only. Saturating combine of
  // the repair-peptide contributions (BPC/TB-500): single ≈0.10 → R 1.10
  // (§5.3 "+0.10 to +0.15"); both ≈0.19 → R 1.19 (§5.3 "+0.15 to +0.20").
  // Empty stack → 0 → R 1 (no effect on Sprints 2–5).
  const recoveryBonus = saturatingCombine(recoveryContribs);
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

  // Week-0 baseline is the UNTOUCHED, drug-free body: pass 0/0 for the
  // vasodilator boost and androgen tone rather than the stack-wide projected
  // scalars. Seeding the baseline with the selected stack's androgenTone bled
  // the projected upper-body androgen bias (chest/shoulders/arms/back) and
  // vasodilator vascularity into the "current" eidolon, so the starting body
  // read more built than it is. Those scalars still drive every week>0 snapshot
  // (the on-protocol state) via the loop below — only the baseline is neutral.
  const baseline = snapshot(0, FM0, LBM0, W0, BF0, 0, 0, 0, 0, 0, FM0, LBM0, der, 0, 0);
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

  // §8 per-material evidence — lowest grade among the compounds actually
  // DRIVING each skin output (nonzero Tan / Coll vector). Lets the UI show
  // the tan projection at Melanotan's A-grade confidence even when a
  // C-grade Epitalon is also collagen-driving in the same stack, instead
  // of collapsing everything to the stack-wide evidenceFloor.
  const tanDrivers  = resolved.filter(r => (r.compound.vector.Tan  || 0) !== 0);
  const collDrivers = resolved.filter(r => (r.compound.vector.Coll || 0) !== 0);
  const skinEvidence = {
    tan:      tanDrivers.length  ? lowestEvidence(tanDrivers.map(r => r.compound.evidence))  : null,
    collagen: collDrivers.length ? lowestEvidence(collDrivers.map(r => r.compound.evidence)) : null
  };

  // §5.3 "gains accelerator" honest readout (Sprint 6). R only changes the
  // body when there is a co-stacked anabolic for it to multiply (sumLbmGain
  // > 0); a recovery peptide on its own raises R but produces NO visible
  // body change (lbmGainCoeff is 0). `active` makes that distinction explicit
  // so the protocol summary can say "accelerator" vs. "does nothing alone."
  const recoveryDrivers = resolved.filter(r => (r.compound.recoveryMultiplier || 0) > 0);
  const gainsAccelerator = {
    multiplier: round2(R),                 // e.g. 1.19
    bonusPct: Math.round(recoveryBonus * 100), // e.g. 19 (% faster LBM gain)
    active: recoveryDrivers.length > 0 && sumLbmGain > 0,
    drivers: recoveryDrivers.map(r => r.compound.label),
    note: recoveryDrivers.length === 0
      ? null
      : (sumLbmGain > 0
          ? "Accelerates the lean-mass gains of the co-stacked anabolic(s); it does not add muscle on its own."
          : "No anabolic in this stack to accelerate — these repair peptides produce no visible body change alone (§5.3).")
  };

  // §5.7/§5.3/§5.5 safety + honesty flags surfaced for the UI. Each
  // compound declares its own `warnings`; we collect them stack-level so a
  // protocol summary can render carcinogen / preclinical / β2-desensitization
  // / catabolic caveats next to the projection (no invented copy here —
  // every string is authored on its compound in compoundVectors.js).
  const warnings = [];
  for (const r of resolved) {
    if (Array.isArray(r.compound.warnings)) {
      for (const text of r.compound.warnings) {
        warnings.push({ key: r.key, label: r.compound.label, evidence: r.compound.evidence, text });
      }
    }
  }

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
      // §8 per-material grades for the skin layer (tan vs collagen).
      skinEvidence,
      ceilingLiftSum,
      LBM_max_effectiveKg: LBM_max_effective,
      recoveryMultiplier: R,
      // §5.3 honest "gains accelerator" readout for the protocol summary.
      gainsAccelerator,
      // §5.7/§5.5/§5.3 per-compound safety + honesty flags for the UI.
      warnings,
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

/**
 * §6.5 REGRESSION — "what happens if I stop?"
 *
 * Takes a COMPLETED on-phase result from simulate() and projects the decay
 * back toward the user's pre-treatment baseline once every compound is
 * withdrawn. This is the §6.2 integrator running with all compound drive at
 * zero, so only the "−decay·(S − S_baseline)" term is left — each state
 * relaxes toward baseline with its §6.5 time-constant. Fat is special (see
 * the GLP-1 rebound block below).
 *
 * The returned timeline's weeks are counted FROM cessation (week 0 == the
 * last on-phase week, i.e. onResult.final). Snapshots share the exact shape
 * simulate() emits, so mapToMorphs() consumes them unchanged.
 *
 * @param {object} onResult  output of simulate()
 * @param {object} [options]
 *   @param {number} options.weeks  weeks to project post-cessation (default 26)
 * @returns {{ baseline, timeline, final, derivations, meta } | null}
 */
export function simulateCessation(onResult, options = {}) {
  if (!onResult || !onResult.final || !onResult.derivations) return null;

  const der = onResult.derivations;
  const sex = onResult.meta.sex;
  const weeks = options.weeks ?? DEFAULT_CESSATION_WEEKS;
  const W0 = der.inputs.weightKg;
  const FM0 = der.composition.fatMassKg;   // pre-treatment fat (baseline)
  const LBM0 = der.composition.lbmKg;       // pre-treatment lean (baseline)
  const BF0 = der.inputs.bfFrac;
  const essentialFatKg = (ESSENTIAL_FAT_PCT[sex] / 100) * W0;

  // Did the on-phase stack include a GLP-1? Fat (FM + VAT) only rebounds
  // deterministically for GLP-1 discontinuation (§6.5, Wilding 2022).
  // Without a GLP-1, §6.5 says fat "regresses only if the user reverts to
  // caloric surplus" — diet-dependent, no curve given — so we HOLD fat and
  // disclose, rather than fabricate a rebound (§5.8-precedence rule).
  const fatRebounds = (onResult.meta.stack || []).some(s => {
    const c = getCompound(s.key);
    return c && c.class === "glp1";
  });

  // Live decay state — seeded from the on-phase FINAL snapshot (the nadir
  // for fat / peak for muscle & water).
  const start = onResult.final;
  let FM   = start.FM;
  let LBM  = start.LBM;
  let dVAT = start.dVAT || 0;
  let dECW = start.dECW || 0;
  let dICW = start.dICW || 0;
  let dColl = start.dColl || 0;
  let dTan = start.dTan || 0;
  // Drug-presence scalars (boosts) clear on a PK timescale once dosing stops.
  let vaso = start.vasodilatorBoost || 0;
  let androgen = start.androgenTone || 0;
  // §7 water 3rd term — aromatization puffiness from wet anabolics. Carried
  // stack-level in on-phase meta; during decay it fades with the cleared
  // androgen so the water morph doesn't stay artificially puffy. Surfaced
  // per-snapshot (mapState prefers state.estrogenFlag over the ctx fallback).
  let estro = onResult.meta.estrogenFlag || 0;

  // Euler relaxation toward a target with time-constant τ (weeks), step DT.
  const relax = (x, target, tau) => x + ((target - x) / tau) * DT;

  function mkSnap(week) {
    const waterAddedKg = (dECW + dICW) * WATER_RESPONSE_KG * (LBM0 / 70);
    const BW = FM + LBM + waterAddedKg;
    const BF = BW > 0 ? FM / BW : BF0;
    const s = snapshot(round2(week), FM, LBM, BW, BF, dVAT, dECW, dICW, dColl, dTan, FM0, LBM0, der, vaso, androgen);
    s.estrogenFlag = estro; // decay-phase fade, read by mapState
    return s;
  }

  const baseline = mkSnap(0);
  const timeline = [baseline];

  const steps = Math.round(weeks / DT);
  for (let i = 1; i <= steps; i++) {
    const t = i * DT;

    // Water — FAST deflate (§6.5: ECW+glycogen gone in 2–4 wk). This is the
    // first and most visible regression; the avatar "de-puffs" within weeks.
    dECW = relax(dECW, 0, DECAY_CONSTANTS_WEEKS.ecw);
    dICW = relax(dICW, 0, DECAY_CONSTANTS_WEEKS.icw);

    // Tan — t½ ≈ 2 months (τ = 12 wk).
    dTan = relax(dTan, 0, DECAY_CONSTANTS_WEEKS.tan);

    // Collagen — slowest (τ = 24 wk; ~50% of gains lost over 3–6 mo).
    dColl = relax(dColl, 0, DECAY_CONSTANTS_WEEKS.collagen);

    // LBM — slow relaxation toward baseline (§6.5: 30–50% of compound-driven
    // lean lost in 8–12 wk, τ = 16 wk). Only the GAINED portion (LBM − LBM0)
    // decays; baseline muscle is the floor. The same relaxation recovers any
    // catabolic deficit (e.g. a T3 cut) back up toward baseline.
    LBM = relax(LBM, LBM0, DECAY_CONSTANTS_WEEKS.lbm);

    // Drug-presence boosts clear quickly once dosing stops (τ_androgen ≈ 1.5
    // wk ≈ ester/active clearance). Modeling choice: the spec gives no decay
    // τ for these scalars, so we reuse the accrual/clearance constant rather
    // than invent one — they track drug PRESENCE, not a tissue state.
    vaso     = relax(vaso, 0, TIME_CONSTANTS_WEEKS.androgen);
    androgen = relax(androgen, 0, TIME_CONSTANTS_WEEKS.androgen);
    estro    = relax(estro, 0, TIME_CONSTANTS_WEEKS.androgen);

    // FAT (FM + VAT) — §6.5 rebound, NOT a linear decay.
    if (fatRebounds) {
      // GLP-1 Wilding curve: relax FM back toward the pre-treatment baseline
      // so two-thirds of the lost fat is regained by ~52 wk (τ ≈ 47.3).
      FM = relax(FM, FM0, GLP1_FAT_REBOUND.tauWeeks);
      FM = Math.max(essentialFatKg, FM);
      // VAT shares the same caloric mechanism → same rebound τ.
      dVAT = relax(dVAT, 0, GLP1_FAT_REBOUND.tauWeeks);
    }
    // else: FM and dVAT are HELD at their end-of-protocol values — non-GLP-1
    // fat regression is diet-dependent and outside the deterministic model
    // (disclosed in meta.warnings).

    const isWeekBoundary = Math.abs(t - Math.round(t)) < 1e-9;
    if (isWeekBoundary || i === steps) timeline.push(mkSnap(t));
  }

  const final = timeline[timeline.length - 1];

  // §6.5 honest disclosures — only surface a caveat for a state that actually
  // moved during the on-phase, so a fat-loss-only protocol doesn't show a
  // muscle-decay warning (and vice versa). Every string is an engine-authored
  // disclosure of a MODELING ASSUMPTION, not a fabricated magnitude.
  const warnings = [];
  if (fatRebounds) {
    warnings.push({
      kind: "fat-rebound",
      text: "Projected fat regain assumes no change to diet after stopping: about two-thirds of the lost fat is reclaimed within a year (Wilding 2022). Maintaining a calorie-controlled diet can prevent most of this rebound."
    });
  } else if (start.FM < FM0 - 1e-6) {
    warnings.push({
      kind: "fat-held",
      text: "Fat regression after stopping a non-GLP-1 protocol is diet-dependent and is not deterministically projected here (§6.5) — fat is held at its end-of-protocol level."
    });
  }
  if (start.LBM > LBM0 + 1e-6) {
    warnings.push({
      kind: "muscle-decay",
      text: "About 30–50% of compound-driven lean mass is projected lost within 8–12 weeks of stopping without proper post-cycle support or continued training (§6.5)."
    });
  }
  if ((start.dTan || 0) > 1e-6) {
    warnings.push({ kind: "tan-fade", text: "Tan fades with a half-life of roughly two months after stopping Melanotan (§6.5)." });
  }
  if ((start.dColl || 0) > 1e-6) {
    warnings.push({ kind: "collagen-fade", text: "Skin/collagen gains fade slowly — roughly 50% lost over 3–6 months without continued use (§6.5)." });
  }

  return {
    baseline,
    timeline,
    final,
    derivations: der,
    meta: {
      sex,
      phase: "cessation",
      weeks,
      fatRebounds,
      // Carried from the on-phase so mapToMorphs() renders tan/collagen at
      // their own §8 confidence and caps tan to the right Fitzpatrick type.
      fitzpatrick: onResult.meta.fitzpatrick,
      skinEvidence: onResult.meta.skinEvidence,
      LBM_max_effectiveKg: onResult.meta.LBM_max_effectiveKg,
      // Fallback for mapToMorphs ctx; per-snapshot estrogenFlag overrides it.
      estrogenFlag: onResult.meta.estrogenFlag,
      // Reference of where decay started (end-of-protocol) for UI readouts.
      from: { FM: start.FM, LBM: start.LBM, BF: start.BF },
      decayConstants: {
        ecw: DECAY_CONSTANTS_WEEKS.ecw,
        icw: DECAY_CONSTANTS_WEEKS.icw,
        tan: DECAY_CONSTANTS_WEEKS.tan,
        collagen: DECAY_CONSTANTS_WEEKS.collagen,
        lbm: DECAY_CONSTANTS_WEEKS.lbm,
        fatReboundTau: fatRebounds ? round2(GLP1_FAT_REBOUND.tauWeeks) : null
      },
      warnings,
      // Δ from end-of-protocol → end-of-decay (how much was given back).
      deltaFM_kg: round2(final.FM - start.FM),
      deltaLBM_kg: round2(final.LBM - start.LBM),
      deltaBF_pts: round2((final.BF - start.BF) * 100)
    }
  };
}

/**
 * Convenience: run the on-phase protocol then the §6.5 cessation phase as
 * ONE continuous timeline (the avatar's "ramp up, then watch it fade" arc).
 * Weeks are ABSOLUTE: 0..onWeeks is the protocol, onWeeks..onWeeks+offWeeks
 * is post-cessation. The cessation phase's own week-0 (== on-phase final) is
 * dropped to avoid a duplicate sample at the seam.
 *
 * @param {object} profile  imperial profile (same as simulate())
 * @param {Array}  stack     compound keys or { key, dose } objects
 * @param {object} [options]
 *   @param {number} options.weeks      on-phase duration (default 12)
 *   @param {number} options.offWeeks   post-cessation duration (default 26; 0 = skip)
 *   plus any simulate() options (trainingStatus, fitzpatrick, …)
 * @returns {{ baseline, timeline, final, onPhase, offPhase, derivations, meta } | null}
 */
export function simulateProtocol(profile, stack = [], options = {}) {
  const onWeeks = options.weeks ?? CALIBRATION_HORIZON_WEEKS;
  const offWeeks = options.offWeeks ?? DEFAULT_CESSATION_WEEKS;

  const onPhase = simulate(profile, stack, { ...options, weeks: onWeeks });
  if (!onPhase) return null;
  if (offWeeks <= 0) {
    return { ...onPhase, onPhase, offPhase: null, meta: { ...onPhase.meta, phase: "protocol", onWeeks, offWeeks: 0, cessationWeek: onWeeks } };
  }

  const offPhase = simulateCessation(onPhase, { weeks: offWeeks });
  // Re-index the decay timeline onto absolute weeks and drop its week-0
  // duplicate (identical to onPhase.final).
  const offShifted = offPhase.timeline.slice(1).map(s => ({ ...s, week: round2(onWeeks + s.week) }));
  const timeline = [...onPhase.timeline, ...offShifted];

  return {
    baseline: onPhase.baseline,
    timeline,
    final: timeline[timeline.length - 1],
    onPhase,
    offPhase,
    derivations: onPhase.derivations,
    meta: {
      ...offPhase.meta,
      phase: "protocol",
      onWeeks,
      offWeeks,
      cessationWeek: onWeeks,
      // Keep the on-phase peak readouts alongside the give-back deltas.
      peak: { FM: onPhase.final.FM, LBM: onPhase.final.LBM, BF: onPhase.final.BF },
      onWarnings: onPhase.meta.warnings,
      gainsAccelerator: onPhase.meta.gainsAccelerator
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
