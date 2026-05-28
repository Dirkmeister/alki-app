// ═══════════════════════════════════════════════════════════
// ALKI EIDOLON ENGINE — CONSTANTS
// ═══════════════════════════════════════════════════════════
// Layer 1 of the 4-layer engine. All numbers in this file come from
// docs/EIDOLON_ENGINE_SPEC.md (the source of truth) — see the cited
// section in each block. Do NOT invent numbers here.
//
// Pure module: zero React/DOM imports. Ports to React Native untouched.
//
// Unit convention: SI throughout the engine (kg, cm, meters).
// Conversion helpers (lbToKg/inToCm) live in derivations.js so callers
// can pass the app's imperial profile in unchanged.

// ── Sex-branched anthropometric ratios ───────────────────────
// Anthropometric defaults from spec §1, "Recommended defaults":
//   Wr (men)  ≈ 0.105 × h     Wr (women) ≈ 0.097 × h
//   An (men)  ≈ 0.130 × h     An (women) ≈ 0.123 × h
//   Neck      derived from BF / waist via inversion of Navy formula
//             (handled in derivations.js, not a pure ratio).
export const ANTHRO_DEFAULTS = {
  male:   { wristRatio: 0.105, ankleRatio: 0.130, neckRatio: 0.21,  hipRatio: 0.52 },
  female: { wristRatio: 0.097, ankleRatio: 0.123, neckRatio: 0.195, hipRatio: 0.56 }
};

// ── Essential fat (ACSM) ─────────────────────────────────────
// Spec §"Key Findings" #5: men ~3–5%, women ~10–13%.
// Lower bound used as the hard floor for any fat-loss projection.
export const ESSENTIAL_FAT_PCT = {
  male: 3,
  female: 10
};

// ── FFMI natural ceiling (Kouri et al. 1995) ─────────────────
// Spec §2.1: nFFMI ≤ 25 (men), ≤ 22 (women) for 42 drug-free athletes.
// "Dynamically lifted by androgen/SARM use" — that lift is applied in
// the effect-vector layer; this is the unmodified natural wall.
export const FFMI_CEILING_NATURAL = {
  male: 25,
  female: 22
};

// ── Kouri normalization anchor ───────────────────────────────
// Spec §2.1: nFFMI = FFMI + 6.1 × (1.8 − h_meters).
// Reference height embedded in the formula = 1.8 m. Exported so any
// caller that needs to label "normalized to 1.80 m" has a single
// source.
export const KOURI_REFERENCE_HEIGHT_M = 1.8;
export const KOURI_HEIGHT_COEFF = 6.1;

// ── Total body water fraction of LBM ─────────────────────────
// Spec §2.4: TBW ≈ 0.72 × LBM (canonical sports-physiology figure,
// ranges 70–75%). ICW ≈ 60% of TBW, ECW ≈ 40%.
export const TBW_FRACTION_OF_LBM = 0.72;
export const ICW_FRACTION_OF_TBW = 0.60;
export const ECW_FRACTION_OF_TBW = 0.40;

// ── Glycogen-bound water ─────────────────────────────────────
// Spec §2.4: 3 g water per 1 g muscle glycogen (Olsson & Saltin 1970;
// Fernández-Elías 2015). Trained 80 kg male stores 400–900 g glycogen
// at maximum → up to ~2.7 kg fullness swing.
export const WATER_PER_GRAM_GLYCOGEN = 3;
export const GLYCOGEN_STORE_MAX_G = { trained: 900, untrained: 400 };

// ── Visible-feature sigmoid centers + slopes (§2.5) ──────────
// Each entry: { center: %BF where the morph is half-on, slope: sigmoid
// k, full: %BF where the morph reaches saturation }. Sex-branched.
//
// "Slope" labels in the spec: sharp = k≈0.6, medium = mid, gentle = low.
// We encode the k value the integrator/mapping layer will multiply by
// (BF_threshold − BF) inside a sigmoid.
export const VISIBLE_THRESHOLDS = {
  male: {
    abs_onset:        { center: 14, slope: 0.6, full: 10 },
    abs_full:         { center: 10, slope: 0.6, full: 8  },
    vascularity_on:   { center: 12, slope: 0.5, full: 9  },
    vascularity_full: { center:  9, slope: 0.5, full: 6  },
    striations:       { center:  6, slope: 0.7, full: 4  },
    facial_angularity:{ center: 15, slope: 0.3, full: 10 }
  },
  female: {
    abs_onset:        { center: 22, slope: 0.6, full: 18 },
    abs_full:         { center: 18, slope: 0.6, full: 15 },
    vascularity_on:   { center: 18, slope: 0.5, full: 16 },
    vascularity_full: { center: 15, slope: 0.5, full: 13 },
    striations:       { center: 13, slope: 0.7, full: 10 },
    facial_angularity:{ center: 22, slope: 0.3, full: 16 }
  }
};

// ── Three time-scales for the integrator (§6.1) ──────────────
// Time constants τ in WEEKS. dS/dt approaches steady state with
// e^(−t/τ); ~63% of total movement by t = τ, ~95% by t = 3τ.
//
// Used by simulate.js (built in Sprint 2). Defined here so every
// compound vector references a single shared time-scale per category.
export const TIME_CONSTANTS_WEEKS = {
  water:      1.0,   // 5–10 days. The FIRST visible change for GH-axis/wet stacks.
  glycogen:   1.0,   // Bound to training/diet, tracks water on a fast scale.
  fat:        10.0,  // 8–12 weeks. Semaglutide week-6 ~30% of total loss.
  visceral:   8.0,   // Tesamorelin VAT moves slightly faster than total fat.
  lbm:        20.0,  // 16–24 weeks. Half of testosterone's 20-wk gain by wk ~10.
  collagen:   12.0,  // GHK-Cu 12-wk topical RCT readout window.
  tan:        4.0,   // Melanotan II 2–8 week ramp.
  ecw:        1.0,   // Same fast scale as water; modeled as separate state.
  icw:        2.0,   // Slightly slower than ECW (creatine/glycogen load).
  androgen:   1.5,   // Test ester pharmacokinetics; ~10 d for enanthate plateau.
  igf:        2.0    // GH-axis tone → IGF-1 follows on a multi-week scale.
};

// ── Decay constants (§6.5) ───────────────────────────────────
// When no compound is pushing a state, the integrator decays it back to
// baseline with τ_decay (weeks). Listed for completeness — Sprint 7 will
// wire these into the regression simulation. Numbers from §6.5:
//   Water (ECW + glycogen): 2–4 wk → τ ≈ 1.5 wk
//   Tan: t½ ≈ 2 mo → τ ≈ 12 wk
//   SARM LBM: 30–50% lost in 8–12 wk → τ ≈ 16 wk
//   Collagen: ~50% loss over 3–6 mo → τ ≈ 24 wk
//   GLP-1 fat: rebound to +11.6% over baseline at wk 120 (Wilding 2022)
export const DECAY_CONSTANTS_WEEKS = {
  water:    1.5,
  ecw:      1.5,
  icw:      2.0,
  glycogen: 1.5,
  tan:      12,
  lbm:      16,
  collagen: 24,
  // Fat doesn't decay back deterministically — it follows the Wilding
  // rebound curve, which Sprint 7 implements separately.
  fat:      null
};

// ── Training status multipliers (§6.3, Lyle McDonald) ────────
// Applied to all LBM-gain effects.
export const TRAINING_LBM_MULTIPLIER = {
  untrained:    1.5,  // first year
  novice:       1.5,  // alias used by onboarding
  intermediate: 0.6,  // year 3 average
  advanced:     0.3,  // 4+ yr
  elite:        0.15  // near-ceiling
};

// ── Sex modulation (§6.4) ────────────────────────────────────
// - Halve non-SARM/non-anabolic LBM rates for women.
// - DOUBLE SARM LBM-per-mg responsiveness for women (Neil 2018,
//   GSK2881078: 3.39 kg F vs 1.76 kg M at 8 weeks).
// - Bias BF reduction 40% away from waist toward hips for women.
export const SEX_MODULATION = {
  female: {
    nonAnabolicLbmRate: 0.5,
    sarmLbmRate:        2.0,
    bfWaistVsHipBias:   0.4   // fraction of BF loss redirected from waist to hip morph
  },
  male: {
    nonAnabolicLbmRate: 1.0,
    sarmLbmRate:        1.0,
    bfWaistVsHipBias:   0.0
  }
};

// ── Reference doses (§5.8 footing) ───────────────────────────
// Magnitude vectors in §5.8 are 12-week normalized projections at the
// reference dose listed below. dose_factor = user_dose / ref_dose,
// clamped at 1.5 to prevent runaway scaling (§6.2).
//
// Sprint 1 doesn't read these — Sprint 2+ will. Keeping them here so
// the compound table in compoundVectors.js can stay declarative.
export const REFERENCE_DOSES_PER_WEEK = {
  semaglutide:        2.4,   // mg/wk
  retatrutide:        12,    // mg/wk
  tesamorelin:        14,    // mg/wk (2 mg/d)
  fragment176:        2,     // mg/wk (placeholder; preclinical)
  motsc:              7,     // mg/wk (placeholder; preclinical)
  mk677:              175,   // mg/wk (25 mg/d)
  ipamorelin:         2.1,   // mg/wk (300 µg × 7 d)
  cjc1295_nodac:      2.1,   // mg/wk (paired with ipa)
  cjc1295_dac:        2,     // mg/wk
  sermorelin:         3.5,   // mg/wk (500 µg/d)
  igf1lr3:            0.35,  // mg/wk (50 µg/d)
  bpc157:             1.75,  // mg/wk (250 µg/d)
  tb500:              2.5,   // mg/wk (maintenance dose)
  ghkcu:              7,     // mg/wk (1 mg/d topical or SubQ)
  epitalon:           7,     // mg/wk
  melanotan2:         3.5,   // mg/wk (0.5 mg/d ramp)
  testosterone:       600,   // mg/wk (Bhasin dose-response anchor)
  lgd4033:            70,    // mg/wk (10 mg/d)
  ostarine:           175,   // mg/wk (25 mg/d)
  rad140:             105,   // mg/wk (15 mg/d)
  yk11:               70,    // mg/wk (10 mg/d)
  s4:                 350,   // mg/wk (50 mg/d)
  s23:                70,    // mg/wk (10 mg/d)
  gw501516:           140,   // mg/wk (20 mg/d)
  sr9009:             280,   // mg/wk (40 mg/d, poor oral bioavailability)
  clenbuterol:        0.56,  // mg/wk (80 µg/d)
  t3:                 0.35,  // mg/wk (50 µg/d)
  aicar:              350,   // mg/wk (placeholder)
  slupp332:           7      // mg/wk (placeholder; preclinical)
};

// ── Saturation exponent for ceiling approach (§2.3 + §6.2) ───
// gain_rate ∝ (1 − S / S_max)^k, k ≈ 1.5 to reproduce diminishing
// returns observed in Casey-Butt anchored trajectories.
export const CEILING_SATURATION_K = 1.5;

// ── Casey-Butt formula constants (§2.3) ──────────────────────
// LBM_max(lb) = h^1.5 × (√Wr/22.6667 + √An/17.0100) × (BF%/224 + 1)
// IMPERIAL: h/Wr/An in inches, output in pounds. The constants below
// are Casey L. Butt's published regression coefficients, which are
// imperial-calibrated. derivations.js converts the engine's SI inputs
// to inches before applying and returns kg. (The spec doc originally
// mislabeled these as cm — corrected 2026-05-27.)
export const CASEY_BUTT = {
  wristDivisor: 22.6667,
  ankleDivisor: 17.0100,
  bfDivisor:    224,
  // First-order regional cold circumferences (§2.3):
  armCoeff:     1.1,
  forearmCoeff: 1.6,
  calfCoeff:    1.95
};

// ── Hodgdon-Beckett / Navy BF formula constants (§2.2) ───────
// Inputs in INCHES (the original Navy publication uses inches).
// derivations.js converts user circumferences before applying.
export const NAVY_BF = {
  male:   { a: 86.010,  b: 70.041,  c: 36.76  },   // 86.010·log10(Wa−N) − 70.041·log10(h) + 36.76
  female: { a: 163.205, b: 97.684,  c: -78.387 }   // 163.205·log10(Wa+Hip−N) − 97.684·log10(h) − 78.387
};

// ── Deurenberg BMI-based BF fallback (§2.2) ──────────────────
// BF% = 1.20·BMI + 0.23·age − 10.8·sex − 5.4   (sex: M = 1, F = 0)
export const DEURENBERG = {
  bmiCoeff: 1.20,
  ageCoeff: 0.23,
  sexCoeff: 10.8,
  constant: 5.4
};

// ── BSA formula coefficients (§2.1) ──────────────────────────
// Du Bois:    BSA = 0.007184 × W^0.425 × h^0.725   (kg, cm)
// Mosteller:  BSA = √(W × h / 3600)
export const BSA = {
  duBois: { k: 0.007184, weightExp: 0.425, heightExp: 0.725 },
  mostellerDivisor: 3600
};
