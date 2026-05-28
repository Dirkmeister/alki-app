// ═══════════════════════════════════════════════════════════
// ALKI EIDOLON ENGINE — DERIVATIONS (Layer 2)
// ═══════════════════════════════════════════════════════════
// Pure anthropometric math. Every formula is cited to a section of
// docs/EIDOLON_ENGINE_SPEC.md. No invented numbers.
//
// All functions take SI inputs (kg, cm, m) and return SI. The single
// adapter `toSIProfile()` at the bottom converts the app's imperial
// profile (lb / ft+in / BF%) into the SI shape the formulas expect.
//
// Zero React imports. Portable to React Native.

import {
  ANTHRO_DEFAULTS,
  KOURI_REFERENCE_HEIGHT_M,
  KOURI_HEIGHT_COEFF,
  CASEY_BUTT,
  NAVY_BF,
  DEURENBERG,
  BSA,
  ESSENTIAL_FAT_PCT,
  FFMI_CEILING_NATURAL,
  TBW_FRACTION_OF_LBM,
  ICW_FRACTION_OF_TBW,
  ECW_FRACTION_OF_TBW,
  VISIBLE_THRESHOLDS
} from "./constants.js";

// ── Unit conversions ─────────────────────────────────────────
export const LB_PER_KG = 2.2046226218;
export const IN_PER_CM = 0.3937007874;
export function lbToKg(lb)   { return lb / LB_PER_KG; }
export function kgToLb(kg)   { return kg * LB_PER_KG; }
export function inToCm(inch) { return inch / IN_PER_CM; }
export function cmToIn(cm)   { return cm * IN_PER_CM; }

// Internal: log base 10 (some old JS targets lacked Math.log10).
function log10(x) { return Math.log(x) / Math.LN10; }

// Internal: normalize sex strings the app uses ("male"/"female")
// against constant tables; defaults to male if anything weird arrives.
function normalizeSex(sex) {
  return sex === "female" || sex === "F" ? "female" : "male";
}

// ────────────────────────────────────────────────────────────
// §2.1 — Basic body composition
// ────────────────────────────────────────────────────────────

/**
 * Lean Body Mass (Boer 1984). Spec §2.1.
 *   Men:   LBM = 0.407·W + 0.267·h − 19.2
 *   Women: LBM = 0.252·W + 0.473·h − 48.3
 * Use rule: if a measured BF fraction is supplied, prefer
 *   LBM = W × (1 − BF) and treat Boer as cross-check.
 *
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {"male"|"female"} sex
 * @param {number} [bfFrac]  Optional measured BF as a 0..1 fraction.
 * @returns {number} kg
 */
export function leanBodyMass(weightKg, heightCm, sex, bfFrac) {
  if (typeof bfFrac === "number" && !Number.isNaN(bfFrac) && bfFrac >= 0 && bfFrac < 1) {
    return weightKg * (1 - bfFrac);
  }
  return normalizeSex(sex) === "female"
    ? 0.252 * weightKg + 0.473 * heightCm - 48.3
    : 0.407 * weightKg + 0.267 * heightCm - 19.2;
}

/**
 * James (1976) LBM alternative. Spec §2.1. Useful as cross-check;
 * not used in default pipeline.
 */
export function leanBodyMassJames(weightKg, heightCm, sex) {
  return normalizeSex(sex) === "female"
    ? 1.07 * weightKg - 148 * Math.pow(weightKg / heightCm, 2)
    : 1.10 * weightKg - 128 * Math.pow(weightKg / heightCm, 2);
}

/**
 * Hume (1966) LBM alternative. Spec §2.1.
 */
export function leanBodyMassHume(weightKg, heightCm, sex) {
  return normalizeSex(sex) === "female"
    ? 0.29569 * weightKg + 0.41813 * heightCm - 43.2933
    : 0.32810 * weightKg + 0.33929 * heightCm - 29.5336;
}

/** Fat mass in kg. Spec §2.1: FM = W − LBM. */
export function fatMass(weightKg, lbmKg) {
  return weightKg - lbmKg;
}

/** BMI. Spec §2.1: W / (h_m)². */
export function bmi(weightKg, heightCm) {
  const hM = heightCm / 100;
  return weightKg / (hM * hM);
}

/** FFMI. Spec §2.1: LBM / (h_m)². */
export function ffmi(lbmKg, heightCm) {
  const hM = heightCm / 100;
  return lbmKg / (hM * hM);
}

/**
 * Normalized FFMI (Kouri et al. 1995). Spec §2.1.
 *   nFFMI = FFMI + 6.1 × (1.8 − h_meters)
 * Natural ceiling ≈ 25 (M) / 22 (F).
 */
export function normalizedFFMI(ffmiValue, heightCm) {
  const hM = heightCm / 100;
  return ffmiValue + KOURI_HEIGHT_COEFF * (KOURI_REFERENCE_HEIGHT_M - hM);
}

/** Du Bois BSA (m²). Spec §2.1: 0.007184·W^0.425·h^0.725. */
export function bsaDuBois(weightKg, heightCm) {
  return BSA.duBois.k
    * Math.pow(weightKg, BSA.duBois.weightExp)
    * Math.pow(heightCm, BSA.duBois.heightExp);
}

/** Mosteller BSA (m²). Spec §2.1: √(W·h / 3600). */
export function bsaMosteller(weightKg, heightCm) {
  return Math.sqrt((weightKg * heightCm) / BSA.mostellerDivisor);
}

// ────────────────────────────────────────────────────────────
// §2.2 — BF estimation when not supplied
// ────────────────────────────────────────────────────────────

/**
 * Hodgdon-Beckett / U.S. Navy body-fat formula. Spec §2.2.
 *   Men (inches):   BF% = 86.010·log10(Wa − N) − 70.041·log10(h) + 36.76
 *   Women (inches): BF% = 163.205·log10(Wa + Hip − N) − 97.684·log10(h) − 78.387
 *
 * Pass circumferences in CM and we'll convert internally.
 *
 * @param {object} args
 * @param {"male"|"female"} args.sex
 * @param {number} args.heightCm
 * @param {number} args.waistCm
 * @param {number} args.neckCm
 * @param {number} [args.hipCm]   Required for women.
 * @returns {number} BF as a 0..1 fraction (or null if inputs missing).
 */
export function navyBodyFat({ sex, heightCm, waistCm, neckCm, hipCm }) {
  if (!heightCm || !waistCm || !neckCm) return null;
  const s = normalizeSex(sex);
  if (s === "female" && !hipCm) return null;

  const hIn = cmToIn(heightCm);
  const waIn = cmToIn(waistCm);
  const nIn = cmToIn(neckCm);

  let bfPct;
  if (s === "female") {
    const hipIn = cmToIn(hipCm);
    const wnh = waIn + hipIn - nIn;
    if (wnh <= 0) return null;
    bfPct = NAVY_BF.female.a * log10(wnh) - NAVY_BF.female.b * log10(hIn) + NAVY_BF.female.c;
  } else {
    const wn = waIn - nIn;
    if (wn <= 0) return null;
    bfPct = NAVY_BF.male.a * log10(wn) - NAVY_BF.male.b * log10(hIn) + NAVY_BF.male.c;
  }
  return Math.max(0, Math.min(1, bfPct / 100));
}

/**
 * Deurenberg BMI-based BF% (sanity fallback). Spec §2.2.
 *   BF% = 1.20·BMI + 0.23·age − 10.8·sex − 5.4    (sex: M=1, F=0)
 * @returns {number} fraction 0..1
 */
export function deurenbergBF({ bmi: bmiValue, age, sex }) {
  const sexFlag = normalizeSex(sex) === "female" ? 0 : 1;
  const bfPct =
    DEURENBERG.bmiCoeff * bmiValue +
    DEURENBERG.ageCoeff * age -
    DEURENBERG.sexCoeff * sexFlag -
    DEURENBERG.constant;
  return Math.max(0, Math.min(1, bfPct / 100));
}

// ────────────────────────────────────────────────────────────
// §2.3 — Casey-Butt maximum muscular potential
// ────────────────────────────────────────────────────────────

/**
 * Casey-Butt maximum LBM at 10% BF, men. Spec §2.3.
 *
 *   LBM_max(lb) = h^1.5 × (√Wr / 22.6667 + √An / 17.0100) × (BF%/224 + 1)
 *
 * UNITS: this is Casey L. Butt's published regression from
 * *Your Muscular Potential* (4th ed.). The constants 22.6667 and
 * 17.0100 are calibrated for IMPERIAL inputs — height/wrist/ankle in
 * inches, output in pounds. The first iteration of the spec doc said
 * "cm"; with cm inputs the formula returns ~1227 kg for a 5'10" male,
 * ~16× too large. We do the math in imperial internally and return
 * SI (kg) at the boundary so the rest of the engine stays metric.
 *
 * The formula targets men at 10% BF; the (BF%/224 + 1) tail scales it
 * for a different reference BF. For women, the published Casey Butt
 * sample is male-only — we apply a 0.85 scalar as a placeholder and
 * flag `female_approx: true` so the UI can show the lower confidence.
 *
 * @param {object} args
 * @param {number} args.heightCm
 * @param {number} args.wristCm
 * @param {number} args.ankleCm
 * @param {number} [args.bfPct]   Reference BF% to scale (default 10)
 * @param {"male"|"female"} args.sex
 * @returns {{lbmKg:number, female_approx:boolean}}
 */
export function caseyButtMaxLBM({ heightCm, wristCm, ankleCm, bfPct = 10, sex }) {
  const hIn  = cmToIn(heightCm);
  const wrIn = cmToIn(wristCm);
  const anIn = cmToIn(ankleCm);

  const lbmMaxLb =
    Math.pow(hIn, 1.5) *
    (Math.sqrt(wrIn) / CASEY_BUTT.wristDivisor +
     Math.sqrt(anIn) / CASEY_BUTT.ankleDivisor) *
    (bfPct / CASEY_BUTT.bfDivisor + 1);

  const lbmMaxKg = lbToKg(lbmMaxLb);

  if (normalizeSex(sex) === "female") {
    // Placeholder female scaler — flagged so UI can show the lower
    // confidence. Casey-Butt's original sample is male; the spec
    // doesn't supply a published female regression.
    return { lbmKg: lbmMaxKg * 0.85, female_approx: true };
  }
  return { lbmKg: lbmMaxKg, female_approx: false };
}

/**
 * Casey-Butt regional cold circumferences (cm). Spec §2.3 first-order:
 *   arm     ≈ 1.10 × √(LBM_max · 100 / h)   [imperial: lb, inches → inches]
 *   forearm ≈ 1.60 × Wr                      [unit-stable: linear]
 *   calf    ≈ 1.95 × An                      [unit-stable: linear]
 *
 * The arm formula is dimensional and only correct with imperial inputs
 * (lb, inches). Forearm/calf are linear and unit-stable, but we do the
 * whole block in imperial for coherence, then convert back to cm.
 *
 * These are approximations to the full Butt regressions; sufficient
 * for normalized morph driving, not as a fitness-coaching prediction.
 */
export function caseyButtRegional({ lbmMaxKg, heightCm, wristCm, ankleCm }) {
  const lbmMaxLb = kgToLb(lbmMaxKg);
  const hIn  = cmToIn(heightCm);
  const wrIn = cmToIn(wristCm);
  const anIn = cmToIn(ankleCm);

  const armIn     = CASEY_BUTT.armCoeff * Math.sqrt((lbmMaxLb * 100) / hIn);
  const forearmIn = CASEY_BUTT.forearmCoeff * wrIn;
  const calfIn    = CASEY_BUTT.calfCoeff * anIn;

  return {
    armCm:     inToCm(armIn),
    forearmCm: inToCm(forearmIn),
    calfCm:    inToCm(calfIn)
  };
}

// ────────────────────────────────────────────────────────────
// §1 — Anthropometric defaults for missing measurements
// ────────────────────────────────────────────────────────────

/**
 * Estimate wrist circumference from height when the user hasn't
 * measured it. Spec §1: Wr ≈ 0.105·h (M) / 0.097·h (F).
 */
export function defaultWristCm(heightCm, sex) {
  return ANTHRO_DEFAULTS[normalizeSex(sex)].wristRatio * heightCm;
}

/**
 * Estimate ankle circumference from height. Spec §1:
 * An ≈ 0.130·h (M) / 0.123·h (F).
 */
export function defaultAnkleCm(heightCm, sex) {
  return ANTHRO_DEFAULTS[normalizeSex(sex)].ankleRatio * heightCm;
}

/**
 * Estimate neck circumference when no measurement exists. Spec §1
 * gives the inversion-from-Navy procedure:
 *   estimated_waist = h × 0.45 × (1 + (BF − 0.15) × 2)
 *   neck = inferred such that Navy produces the given BF.
 *
 * For our purposes the simple ratio from §2.6 (h × 0.21 M / 0.195 F)
 * modulated weakly by BF is precise enough for a parametric avatar;
 * if a caller has BF and waist they can call estimatedNeckFromNavy()
 * instead for a Navy-consistent value.
 */
export function defaultNeckCm(heightCm, sex /*, bfFrac */) {
  return ANTHRO_DEFAULTS[normalizeSex(sex)].neckRatio * heightCm;
}

/**
 * Navy-inverted neck estimate (more precise when BF is known). Solves
 * the men's Navy formula for `N` given target BF and an estimated
 * waist from §1. Falls back to the simple ratio for women — the
 * female Navy formula has two unknowns (N and Hip).
 */
export function estimatedNeckFromNavy({ heightCm, bfFrac, sex }) {
  const s = normalizeSex(sex);
  if (s === "female") return defaultNeckCm(heightCm, s);

  const estWaistCm = heightCm * 0.45 * (1 + (bfFrac - 0.15) * 2);
  const hIn = cmToIn(heightCm);
  const waIn = cmToIn(estWaistCm);
  // Solve Navy:  BF% = a·log10(Wa − N) − b·log10(h) + c
  // → log10(Wa − N) = (BF% + b·log10(h) − c) / a
  // → Wa − N = 10^((BF% + b·log10(h) − c) / a)
  const bfPct = bfFrac * 100;
  const rhs = (bfPct + NAVY_BF.male.b * log10(hIn) - NAVY_BF.male.c) / NAVY_BF.male.a;
  const wnIn = Math.pow(10, rhs);
  const neckIn = waIn - wnIn;
  return neckIn > 0 ? inToCm(neckIn) : defaultNeckCm(heightCm, s);
}

// ────────────────────────────────────────────────────────────
// §2.4 — Water compartments
// ────────────────────────────────────────────────────────────

/**
 * Total body water (kg) ≈ 0.72 × LBM. Spec §2.4.
 * Returns ICW and ECW partitioning too.
 */
export function waterCompartments(lbmKg) {
  const tbw = TBW_FRACTION_OF_LBM * lbmKg;
  return {
    tbwKg: tbw,
    icwKg: tbw * ICW_FRACTION_OF_TBW,
    ecwKg: tbw * ECW_FRACTION_OF_TBW
  };
}

// ────────────────────────────────────────────────────────────
// §2.6 — Anthropometric circumference predictors (for morphs)
// ────────────────────────────────────────────────────────────

/** Waist (relaxed). Spec §2.6: h·0.445 + 80·(BF − 0.15) cm men, +5 women. */
export function predictWaistCm({ heightCm, bfFrac, sex }) {
  const base = heightCm * 0.445 + 80 * (bfFrac - 0.15);
  return normalizeSex(sex) === "female" ? base + 5 : base;
}

/** Hip ≈ h·0.52 M / h·0.56 F. Spec §2.6. */
export function predictHipCm({ heightCm, sex }) {
  return ANTHRO_DEFAULTS[normalizeSex(sex)].hipRatio * heightCm;
}

// ────────────────────────────────────────────────────────────
// §2.5 — Visible threshold lookups (for the mapping layer)
// ────────────────────────────────────────────────────────────

/**
 * Returns the sigmoid {center, slope, full} for a visible feature for
 * the given sex. Sprint 2's mapping layer reads these.
 */
export function visibleThresholds(sex) {
  return VISIBLE_THRESHOLDS[normalizeSex(sex)];
}

// ────────────────────────────────────────────────────────────
// Imperial → SI profile adapter
// ────────────────────────────────────────────────────────────

/**
 * Convert the app's imperial profile shape into the SI shape the
 * engine works in. The original profile is left untouched.
 *
 *   In:  { sex, age, heightFt, heightIn, weight (lb), bodyFat (%), adv }
 *   Out: { sex, age, heightCm, weightKg, bfFrac, adv }
 *
 * Tolerates missing fields by returning null for any value that can't
 * be computed.
 */
export function toSIProfile(profile) {
  if (!profile) return null;
  const sex = normalizeSex(profile.sex);
  const age = Number(profile.age);

  // Height — onboarding uses ft + in. Some legacy paths pass total in.
  let heightCm = null;
  const ft = parseFloat(profile.heightFt);
  const inch = parseFloat(profile.heightIn);
  if (!Number.isNaN(ft) || !Number.isNaN(inch)) {
    const totalIn = (Number.isNaN(ft) ? 0 : ft * 12) + (Number.isNaN(inch) ? 0 : inch);
    heightCm = inToCm(totalIn);
  } else if (typeof profile.heightCm === "number") {
    heightCm = profile.heightCm;
  }

  const weightLb = parseFloat(profile.weight);
  const weightKg = !Number.isNaN(weightLb) ? lbToKg(weightLb) : null;

  const bfPct = parseFloat(profile.bodyFat);
  const bfFrac = !Number.isNaN(bfPct) ? bfPct / 100 : null;

  return {
    sex,
    age: Number.isNaN(age) ? null : age,
    heightCm,
    weightKg,
    bfFrac,
    adv: profile.adv || {}
  };
}

// ────────────────────────────────────────────────────────────
// Convenience: derive everything Sprint 1 needs in one call
// ────────────────────────────────────────────────────────────

/**
 * Runs the whole Sprint-1 derivation cascade against an imperial
 * profile and returns a single object with every derived value.
 *
 * This is the function Sprint 2 will call from the integrator — it's
 * also what the verification script logs.
 *
 * Behaviour notes:
 * - If user supplied BF, LBM is W·(1−BF). Boer/James/Hume are still
 *   reported as cross-checks.
 * - Casey-Butt uses the user's wrist/ankle if present, otherwise the
 *   anthropometric defaults from §1.
 * - The function is pure: no logging, no side effects. The test
 *   script in this directory does the printing.
 */
export function deriveAll(profile) {
  const si = toSIProfile(profile);
  if (!si || !si.weightKg || !si.heightCm) return null;
  const { sex, age, heightCm, weightKg, bfFrac } = si;

  const bmiValue = bmi(weightKg, heightCm);

  // BF: prefer user-supplied. Fall back to Navy if circumferences exist,
  // else Deurenberg (BMI-based).
  let bfFinal = bfFrac;
  let bfSource = "user";
  if (bfFinal == null) {
    const navy = navyBodyFat({
      sex,
      heightCm,
      waistCm: parseFloat(si.adv?.waistCm) || null,
      neckCm:  parseFloat(si.adv?.neckCm)  || null,
      hipCm:   parseFloat(si.adv?.hipCm)   || null
    });
    if (navy != null) {
      bfFinal = navy;
      bfSource = "navy";
    } else if (age != null) {
      bfFinal = deurenbergBF({ bmi: bmiValue, age, sex });
      bfSource = "deurenberg";
    } else {
      bfFinal = sex === "female" ? 0.25 : 0.18;
      bfSource = "fallback_default";
    }
  }

  const lbmBoer  = leanBodyMass(weightKg, heightCm, sex);                // unconditional Boer
  const lbmFinal = weightKg * (1 - bfFinal);                             // preferred when BF known
  const lbmJames = leanBodyMassJames(weightKg, heightCm, sex);
  const lbmHume  = leanBodyMassHume(weightKg, heightCm, sex);
  const fmKg     = fatMass(weightKg, lbmFinal);

  const ffmiValue = ffmi(lbmFinal, heightCm);
  const nFfmi     = normalizedFFMI(ffmiValue, heightCm);

  const bsaDB = bsaDuBois(weightKg, heightCm);
  const bsaMS = bsaMosteller(weightKg, heightCm);

  // Anthropometric inputs to Casey-Butt: prefer measured, else default.
  const wristCm = parseFloat(si.adv?.wristCm) || defaultWristCm(heightCm, sex);
  const ankleCm = parseFloat(si.adv?.ankleCm) || defaultAnkleCm(heightCm, sex);
  const cbMax   = caseyButtMaxLBM({ heightCm, wristCm, ankleCm, bfPct: bfFinal * 100, sex });
  const cbReg   = caseyButtRegional({ lbmMaxKg: cbMax.lbmKg, heightCm, wristCm, ankleCm });

  const water = waterCompartments(lbmFinal);

  const waistCmPred = predictWaistCm({ heightCm, bfFrac: bfFinal, sex });
  const hipCmPred   = predictHipCm({ heightCm, sex });
  const neckCmPred  = estimatedNeckFromNavy({ heightCm, bfFrac: bfFinal, sex });

  return {
    inputs: { sex, age, heightCm, weightKg, bfFrac: bfFinal, bfSource },
    composition: {
      lbmKg:        lbmFinal,
      lbmBoerKg:    lbmBoer,
      lbmJamesKg:   lbmJames,
      lbmHumeKg:    lbmHume,
      fatMassKg:    fmKg,
      bmi:          bmiValue,
      ffmi:         ffmiValue,
      normalizedFFMI: nFfmi,
      ffmiCeilingNatural: FFMI_CEILING_NATURAL[sex],
      essentialFatPct: ESSENTIAL_FAT_PCT[sex]
    },
    surface: { bsaDuBoisM2: bsaDB, bsaMostellerM2: bsaMS },
    caseyButt: {
      lbmMaxKg:     cbMax.lbmKg,
      female_approx: cbMax.female_approx,
      armCm:        cbReg.armCm,
      forearmCm:    cbReg.forearmCm,
      calfCm:       cbReg.calfCm,
      lbmHeadroomKg: cbMax.lbmKg - lbmFinal,
      lbmSaturation: lbmFinal / cbMax.lbmKg
    },
    water,
    anthro: {
      wristCm,
      ankleCm,
      waistCmPredicted: waistCmPred,
      hipCmPredicted:   hipCmPred,
      neckCmPredicted:  neckCmPred
    }
  };
}
