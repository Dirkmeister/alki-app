// ═══════════════════════════════════════════════════════════
// ALKI EIDOLON ENGINE — COMPOUND EFFECT VECTORS (Layer 3)
// ═══════════════════════════════════════════════════════════
// The per-compound effect-vector table transcribed verbatim from
// docs/EIDOLON_ENGINE_SPEC.md §5.8 ("Quick reference: starting-point
// effect vectors, 12-week projection, normalized [−1, +1]"), plus the
// evidence grades from §8, the wet/dry classification from §5.6, and
// the recovery-multiplier roles from §5.3.
//
// EACH VECTOR VALUE IS A NORMALIZED 12-WEEK TARGET, NOT A RATE.
// `+1` = "moves the relevant state to its compound-saturated maximum",
// `−1` = "fully toward its minimum". simulate.js converts these targets
// into a time-course via the τ time-constants in constants.js and a
// normalized→physical scale calibrated to the §5.1 clinical anchors.
//
// Pure module: zero React/DOM imports. Ports to React Native untouched.
//
// SCOPE NOTE: every §5.8 row was transcribed up front as declarative data
// (all sourced from §5.8 / §5.6 / §8) so each sprint adds only the
// consuming LOGIC, never new numbers — mirroring how constants.js already
// declares every reference dose. Live as of Sprint 6: FM/LBM/VAT (Sprints
// 2–3), ECW/ICW + GH-axis tone (Sprint 4), Coll/Tan + the skin metadata
// (Sprint 5), and the §5.3 recovery multiplier R + the §5.7 thermogenic
// class with their §5.7 safety flags (Sprint 6). Still inert until its
// sprint: the regression/decay path (Sprint 7).

import { REFERENCE_DOSES_PER_WEEK } from "./constants.js";

// ── State-variable keys the vectors push (§3) ────────────────
// Canonical physiological state the integrator tracks. A compound
// vector is a sparse map over these keys.
//   FM   — fat mass
//   LBM  — lean body mass
//   VAT  — visceral adipose tissue (normalized reduction driver)
//   ECW  — extracellular water ("puffy")
//   ICW  — intracellular water ("full")
//   Coll — collagen / skin quality (0–1)
//   Tan  — skin tan / eumelanin (0–1)
//   Vasc — vasodilator boost feeding the §7 vascularity formula
export const STATE_KEYS = ["FM", "LBM", "VAT", "ECW", "ICW", "Coll", "Tan", "Vasc"];

// ── Evidence-grade metadata (§8) ─────────────────────────────
// Drives the UI confidence treatment: A renders as a solid morph,
// D renders as a translucent "this is a hypothesis" overlay.
export const EVIDENCE_GRADES = {
  A: { label: "Human RCT, DEXA-confirmed",            bars: 4, overlay: false },
  B: { label: "Limited human data",                   bars: 3, overlay: false },
  C: { label: "Anecdotal / case-series human",        bars: 2, overlay: true  },
  D: { label: "Preclinical — mechanistic extrapolation", bars: 1, overlay: true }
};

// Helper: build a sparse vector with all unspecified state keys = 0.
function vec(partial) {
  const v = {};
  for (const k of STATE_KEYS) v[k] = partial[k] || 0;
  return v;
}

// ── THE §5.8 TABLE ───────────────────────────────────────────
// Keys match constants.REFERENCE_DOSES_PER_WEEK so refDose resolves
// without duplicating the dose figure. `class` groups by sprint:
//   glp1 / fatloss-gh  → Sprint 2 (this sprint)
//   gh-axis            → Sprint 4
//   recovery           → Sprint 6 (R multiplier only)
//   skin / appearance  → Sprint 5
//   sarm / anabolic    → Sprint 3
//   thermogenic        → Sprint 6
export const COMPOUND_VECTORS = {
  // ── §5.1 GLP-1 / metabolic weight-loss class (Sprint 2) ──────────
  semaglutide: {
    label: "Semaglutide", class: "glp1", evidence: "A",
    refDoseKey: "semaglutide", wet: false,
    vector: vec({ FM: -0.40, LBM: -0.15, VAT: -0.30, Vasc: 0.05 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    // §5.1 reference anchors. weeklyWeightLossCoeff is the calibration
    // source for WEIGHT_RESPONSE (simulate.js). The fat:lean SPLIT follows
    // the §5.8 vector (≈73% fat), NOT this DEXA figure — product decision
    // (2026-05-27): the §5.8 Layer-3 table is authoritative where it
    // conflicts with §5.1 prose. fatLeanSplitDexa kept for reference only.
    clinical: {
      weeklyWeightLossCoeff: 0.0022, // ΔW ≈ −0.0022 × W₀ × t_weeks (0–16 wk titration)
      fatLeanSplitDexa: 0.61,        // §5.1 DEXA: 61% fat / 39% lean (reference; not targeted)
      vatBonusFracOfFat: 0.05        // §5.1: 5% of fat-loss is preferentially visceral
    }
  },
  retatrutide: {
    label: "Retatrutide", class: "glp1", evidence: "A",
    refDoseKey: "retatrutide", wet: false,
    vector: vec({ FM: -0.60, LBM: -0.20, VAT: -0.50, Vasc: 0.10 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    clinical: { fatLeanSplitDexa: 0.74 } // §5.1 Phase-2 DEXA: 74% fat / 26% lean
  },
  tesamorelin: {
    // Most VAT-selective compound known. Total BW ~unchanged; the loss
    // is almost entirely visceral, with a small GH-mediated LBM gain.
    label: "Tesamorelin", class: "fatloss-gh", evidence: "A",
    refDoseKey: "tesamorelin", wet: false,
    vector: vec({ FM: -0.05, LBM: 0.10, VAT: -0.45, ECW: 0.10, ICW: 0.10, Coll: 0.05, Vasc: 0.05 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    clinical: { vatSelective: true } // §5.1: VAT −15.2% @26wk, −18% @52wk; LBM +1.4 kg
  },
  fragment176: {
    // §5.1: "engine effect ~0.3× tesamorelin, flagged D." Derived, not
    // independently anchored — every component is 0.3 × tesamorelin.
    label: "Fragment 176-191", class: "fatloss-gh", evidence: "D",
    refDoseKey: "fragment176", wet: false,
    vector: vec({ FM: -0.015, LBM: 0.03, VAT: -0.135, ECW: 0.03, ICW: 0.03, Coll: 0.015, Vasc: 0.015 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    docAnchor: "derived: 0.3 × tesamorelin (§5.1)"
  },
  motsc: {
    // §5.1 / Key Finding #2: mouse data only, no human BC RCT. The doc
    // gives DIRECTION (prevents diet-induced obesity → fat-loss bias)
    // but NO magnitude — §5.8 has no MOTS-c row. The value below is
    // INFERRED by analogy to §5.7's preclinical fat-loss mimetics
    // (SR-9009 −0.10 FM, "~0.5× Cardarine"). FLAGGED for Dallas to
    // confirm or replace with a doc-sourced anchor.
    label: "MOTS-c", class: "thermogenic", evidence: "D",
    refDoseKey: "motsc", wet: false,
    vector: vec({ FM: -0.10 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    docAnchor: "INFERRED — not in §5.8; analogy to §5.7 preclinical mimetic. NEEDS CONFIRMATION."
  },

  // ── §5.2 GH-axis peptides (Sprint 4) ─────────────────────────────
  mk677: {
    label: "MK-677 (Ibutamoren)", class: "gh-axis", evidence: "A",
    refDoseKey: "mk677", wet: true,
    vector: vec({ FM: 0.05, LBM: 0.20, ECW: 0.40, ICW: 0.30, Coll: 0.05, Vasc: -0.10 }),
    ceilingLift: 0.03, recoveryMultiplier: 0, ghAxisTone: 0.5
  },
  ipacjc: {
    // Ipamorelin + CJC-1295 no-DAC. App id is "ipacjc".
    label: "Ipamorelin + CJC-1295 (no-DAC)", class: "gh-axis", evidence: "B",
    refDoseKey: "ipamorelin", wet: false,
    vector: vec({ LBM: 0.10, VAT: -0.05, ECW: 0.15, ICW: 0.15, Coll: 0.05 }),
    ceilingLift: 0.02, recoveryMultiplier: 0, ghAxisTone: 0.6
  },
  cjc1295_dac: {
    label: "CJC-1295 DAC", class: "gh-axis", evidence: "B",
    refDoseKey: "cjc1295_dac", wet: true,
    vector: vec({ FM: -0.05, LBM: 0.15, VAT: -0.05, ECW: 0.30, ICW: 0.20, Coll: 0.05 }),
    ceilingLift: 0.03, recoveryMultiplier: 0, ghAxisTone: 0.7
  },
  igf1lr3: {
    label: "IGF-1 LR3", class: "gh-axis", evidence: "C",
    refDoseKey: "igf1lr3", wet: true,
    vector: vec({ FM: -0.05, LBM: 0.30, ECW: 0.20, ICW: 0.30 }),
    ceilingLift: 0.05, recoveryMultiplier: 0, ghAxisTone: 0.5
  },

  // ── §5.3 Recovery / repair peptides (Sprint 6) ───────────────────
  // These move NO morph directly — they raise the R recovery multiplier
  // that buffs co-stacked anabolic LBM-gain rate.
  bpc157: {
    label: "BPC-157", class: "recovery", evidence: "D",
    refDoseKey: "bpc157", wet: false,
    // §5.8 gives a small +0.05 Coll (tendon/skin repair) — the ONLY direct
    // morph BPC moves. §5.3 is explicit it must NOT move muscle/fat morphs,
    // and the §5.8 row confirms that (FM/LBM/VAT/ECW/ICW all 0). Its real
    // role is the R multiplier below, surfaced as a "gains accelerator."
    vector: vec({ Coll: 0.05 }),
    ceilingLift: 0, recoveryMultiplier: 0.10,
    warnings: ["BPC-157 does not visibly transform the body — it is projected to accelerate the gains of co-stacked anabolics via improved recovery. Human evidence is preclinical; WADA-prohibited (S0) (§5.3)."]
  },
  tb500: {
    label: "TB-500", class: "recovery", evidence: "D",
    refDoseKey: "tb500", wet: false,
    vector: vec({ Coll: 0.03 }),
    ceilingLift: 0, recoveryMultiplier: 0.10,
    warnings: ["TB-500 does not visibly transform the body — like BPC-157 it accelerates co-stacked anabolics via recovery. Human evidence is preclinical; WADA-prohibited (S0) (§5.3)."]
  },

  // ── §5.4 Skin / anti-aging peptides (Sprint 5) ───────────────────
  ghkcu: {
    label: "GHK-Cu (topical)", class: "skin", evidence: "B",
    refDoseKey: "ghkcu", wet: false,
    vector: vec({ Coll: 0.30 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    // §5.4 + Caveats: topical GHK-Cu has multiple controlled trials
    // (Pickart 2018; Leyden 2002 → grade B). The +0.30 Coll vector is the
    // TOPICAL projection. Systemic/injected evidence is much weaker — the
    // route flag lets the UI down-grade + caveat an injection protocol
    // instead of promising the topical result.
    route: "topical",
    evidenceByRoute: { topical: "B", systemic: "C" },
    note: "Collagen projection is for TOPICAL use; systemic/SubQ injection evidence is much weaker (C) — do not overpromise."
  },
  epitalon: {
    label: "Epitalon", class: "skin", evidence: "C",
    refDoseKey: "epitalon", wet: false,
    vector: vec({ Coll: 0.10 }),
    ceilingLift: 0, recoveryMultiplier: 0
  },

  // ── §5.5 Appearance / specialty (Sprint 5) ───────────────────────
  melanotan2: {
    label: "Melanotan II", class: "appearance", evidence: "A",
    refDoseKey: "melanotan2", wet: false,
    vector: vec({ FM: -0.05, Tan: 0.80 }), // Tan clamped to the Fitzpatrick ceiling in mapToMorphs (§5.5)
    ceilingLift: 0, recoveryMultiplier: 0,
    // §8: the A grade is for PIGMENTATION specifically (Dorr 1996), not
    // body composition — surfaced so the UI can scope the badge.
    evidenceScope: "pigmentation",
    // §5.5 side effects. The cosmetic warning is UI copy; the appetite
    // note explains the −0.05 FM bias above (it IS the ~5% caloric-intake
    // suppression proxy, not a direct lipolytic effect).
    warnings: ["Darkens existing freckles and moles; monitor pigmented lesions (§5.5)."],
    appetiteNote: "Appetite suppression (~5% intake proxy) drives the −0.05 FM bias, not lipolysis (§5.5)."
  },

  // ── §5.6 SARMs and anabolics (Sprint 3) ──────────────────────────
  testosterone: {
    label: "Testosterone enanthate", class: "anabolic", evidence: "A",
    refDoseKey: "testosterone", wet: true,
    vector: vec({ FM: -0.20, LBM: 0.70, VAT: -0.10, ECW: 0.50, ICW: 0.30, Coll: 0.05, Vasc: 0.15 }),
    ceilingLift: 0.40, recoveryMultiplier: 0, androgenTone: 1.0
  },
  lgd4033: {
    label: "LGD-4033 (Ligandrol)", class: "sarm", evidence: "B",
    refDoseKey: "lgd4033", wet: false,
    vector: vec({ FM: -0.10, LBM: 0.35, ECW: 0.15, ICW: 0.15, Vasc: 0.10 }),
    ceilingLift: 0.12, recoveryMultiplier: 0, androgenTone: 0.5
  },
  ostarine: {
    label: "Ostarine (MK-2866)", class: "sarm", evidence: "B",
    refDoseKey: "ostarine", wet: false,
    vector: vec({ FM: -0.10, LBM: 0.20, ECW: 0.05, ICW: 0.05, Vasc: 0.05 }),
    ceilingLift: 0.07, recoveryMultiplier: 0, androgenTone: 0.35
  },
  rad140: {
    label: "RAD-140 (Testolone)", class: "sarm", evidence: "C",
    refDoseKey: "rad140", wet: false,
    vector: vec({ FM: -0.10, LBM: 0.45, ECW: 0.05, ICW: 0.10, Vasc: 0.15 }),
    ceilingLift: 0.18, recoveryMultiplier: 0, androgenTone: 0.6
  },
  yk11: {
    label: "YK-11", class: "sarm", evidence: "D",
    refDoseKey: "yk11", wet: false,
    vector: vec({ LBM: 0.25, ECW: 0.05, ICW: 0.05, Vasc: 0.05 }),
    ceilingLift: 0.10, recoveryMultiplier: 0, androgenTone: 0.4
  },
  s4: {
    label: "S-4 (Andarine)", class: "sarm", evidence: "C",
    refDoseKey: "s4", wet: false,
    vector: vec({ FM: -0.10, LBM: 0.15, ICW: 0.05, Vasc: 0.10 }),
    ceilingLift: 0.06, recoveryMultiplier: 0, androgenTone: 0.3
  },
  s23: {
    label: "S-23", class: "sarm", evidence: "D",
    refDoseKey: "s23", wet: false,
    vector: vec({ FM: -0.05, LBM: 0.30, ICW: 0.05, Vasc: 0.15 }),
    ceilingLift: 0.12, recoveryMultiplier: 0, androgenTone: 0.5
  },

  // ── §5.7 Metabolic / thermogenic research chemicals (Sprint 6) ───
  // Vectors from §5.8; evidence + safety flags from §5.7/§8. Clenbuterol
  // is A-grade (Hostrup 2025 RCT, §8) — NOT a D-grade preclinical like the
  // rest of this class. β2 desensitization is surfaced as a cycling caveat
  // only (product decision 2026-05-28): the §5.8 vector is kept as the
  // projection rather than scaled by an attenuation depth the spec never
  // gives. T3 is catabolic — its −0.20 LBM debits lean mass via the §6.2
  // loss channel, so the avatar reads leaner AND flatter (§5.7 / Caveats).
  gw501516: {
    label: "GW-501516 (Cardarine)", class: "thermogenic", evidence: "D",
    refDoseKey: "gw501516", wet: false,
    vector: vec({ FM: -0.20, VAT: -0.05, Vasc: 0.10 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    // §5.7: "Carcinogen flag must appear in UI." Non-negotiable.
    warnings: ["Carcinogen flag: rodent studies showed dose-dependent tumors across multiple organs; development was halted on this basis. Preclinical (rodent) efficacy only (§5.7)."]
  },
  sr9009: {
    label: "SR-9009 (Stenabolic)", class: "thermogenic", evidence: "D",
    refDoseKey: "sr9009", wet: false,
    vector: vec({ FM: -0.10, Vasc: 0.05 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    // §5.7: rodent-only; the −0.10 FM is "~0.5× Cardarine" and assumes
    // systemic exposure that oral dosing largely fails to achieve.
    warnings: ["Preclinical (rodent) only; poor oral bioavailability means the real-world effect is likely well below this projection (§5.7)."]
  },
  clenbuterol: {
    label: "Clenbuterol", class: "thermogenic", evidence: "A",
    refDoseKey: "clenbuterol", wet: false,
    vector: vec({ FM: -0.20, LBM: 0.05, Vasc: 0.15 }),
    ceilingLift: 0.02, recoveryMultiplier: 0,
    // §5.7: β2-receptor desensitization is rapid (~2 wk). Disclosure-only
    // (2026-05-28): no attenuation magnitude in the spec, so we keep the
    // §5.8 vector and surface the cycling caveat instead of guessing a
    // decay depth. desensitizeWeeks kept as machine-readable metadata.
    desensitizeWeeks: 2,
    warnings: ["β2 receptors desensitize within ~2 weeks; this projection assumes proper cycling (e.g. 2 weeks on / 2 off). Continuous use loses fat-loss efficacy quickly (§5.7)."]
  },
  t3: {
    // §5.7: catabolic — DEBITS lean mass as well as fat. The avatar
    // should get leaner AND visibly flatter.
    label: "T3 (liothyronine)", class: "thermogenic", evidence: "B",
    refDoseKey: "t3", wet: false,
    vector: vec({ FM: -0.30, LBM: -0.20, Coll: -0.05, Vasc: 0.05 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    warnings: ["Catabolic: debits lean mass as well as fat — the projection shows you leaner but visibly flatter/smaller in the muscle morphs (§5.7 / Caveats)."]
  },
  aicar: {
    label: "AICAR", class: "thermogenic", evidence: "D",
    refDoseKey: "aicar", wet: false,
    vector: vec({ FM: -0.05, Vasc: 0.05 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    warnings: ["Preclinical (rodent) only — mechanistic extrapolation; effect in humans is unproven (§5.7)."]
  },
  slupp332: {
    label: "SLU-PP-332", class: "thermogenic", evidence: "D",
    refDoseKey: "slupp332", wet: false,
    vector: vec({ FM: -0.15, LBM: 0.05, Vasc: 0.10 }),
    ceilingLift: 0, recoveryMultiplier: 0,
    warnings: ["Preclinical (mouse) only — ERRα/β/γ agonist; effect in humans is unproven (§5.7)."]
  }
};

// Compounds with no body-composition effect (sexual function / CNS).
// Listed so the engine recognizes them and renders no morph movement.
export const NON_MORPH_COMPOUNDS = {
  pt141: { label: "PT-141 (Bremelanotide)", evidence: "A", note: "Sexual function only — no morph movement." }
};

// ── Lookups ──────────────────────────────────────────────────
/**
 * Resolve a compound's reference weekly dose (mg/wk) from constants.
 * @returns {number|null}
 */
export function referenceDose(compoundKey) {
  const entry = COMPOUND_VECTORS[compoundKey];
  if (!entry) return null;
  return REFERENCE_DOSES_PER_WEEK[entry.refDoseKey] ?? null;
}

/**
 * Get a compound's full vector entry, or null if unknown / non-morph.
 */
export function getCompound(compoundKey) {
  return COMPOUND_VECTORS[compoundKey] || null;
}

export { COMPOUND_VECTORS as default };
