"use client";

import { useMemo } from "react";
import { DISCLAIMER } from "../lib/disclaimer";

/**
 * ============================================================
 * ALKI — STACK INTELLIGENCE ENGINE
 * ============================================================
 *
 * Drop-in module for AlkiApp.jsx. Renders in the Dashboard as the
 * user selects compounds, and updates in real-time.
 *
 * Architecture mirrors the Umbrella Labs reference doc Section 6:
 * each stack is analyzed by biological axis coverage, support layer
 * requirements, contraindications, and design rationale.
 *
 * USAGE in Dashboard:
 *   import StackIntelligence from './StackIntelligence';
 *
 *   <StackIntelligence
 *     stackIds={selectedCompounds}          // array of compound ids
 *     userProfile={profile}                 // { sex, age, bodyFat, ... }
 *     onRemoveCompound={(id) => toggleCompound(id)}
 *   />
 *
 * The engine returns isBlocked = true when a critical contraindication
 * is present. The parent app should disable the Transform CTA until
 * isBlocked clears.
 *
 * Compound IDs match AlkiApp.jsx COMPOUNDS array:
 *   bpc157, tb500, ipacjc, tesamorelin, semaglutide,
 *   retatrutide, ghkcu, pt141
 *   + expanded: sermorelin, cjc1295_nodac, ipamorelin, mk677, igf1lr3,
 *     fragment176, mk2866, rad140, lgd4033, yk11, s23, tadalafil, bpc_tb_blend
 * ============================================================
 */

// ============================================================
// BIOLOGICAL AXIS TAXONOMY
// ============================================================

const AXES = {
  ar: {
    label: "Androgen Receptor",
    short: "AR",
    color: "#ff6b6b",
    desc: "Muscle protein synthesis, strength, masculinization",
  },
  gh_axis: {
    label: "GH Axis",
    short: "GH",
    color: "#22d68a",
    desc: "Growth hormone & IGF-1 signaling, recovery, lean mass",
  },
  tissue_repair: {
    label: "Tissue Repair",
    short: "REPAIR",
    color: "#4dabf7",
    desc: "Angiogenesis, tendon/ligament/gut healing",
  },
  metabolic: {
    label: "Metabolic / GLP",
    short: "METAB",
    color: "#ffd43b",
    desc: "Appetite, glucose, fat oxidation",
  },
  anti_aging: {
    label: "Anti-Aging / ECM",
    short: "ECM",
    color: "#c084fc",
    desc: "Collagen, skin quality, longevity signaling",
  },
  cns_melanocortin: {
    label: "CNS / Melanocortin",
    short: "CNS",
    color: "#f783ac",
    desc: "Central libido, pigmentation pathway",
  },
  cortisol_hpa: {
    label: "Cortisol / HPA",
    short: "HPA",
    color: "#94a3b8",
    desc: "Stress axis, recovery, cortisol modulation",
  },
  cholinergic: {
    label: "Cholinergic",
    short: "ACh",
    color: "#74c0fc",
    desc: "Acetylcholine, memory, focus, neuromuscular",
  },
  dopaminergic: {
    label: "Dopaminergic",
    short: "DA",
    color: "#ff922b",
    desc: "Motivation, reward, executive function",
  },
  thyroid: {
    label: "Thyroid / BMR",
    short: "T3",
    color: "#fd7e14",
    desc: "Basal metabolic rate, thermogenesis",
  },
  estrogen: {
    label: "Estrogen / Aromatase",
    short: "E2",
    color: "#e599f7",
    desc: "Estrogen modulation, aromatase activity",
  },
  cardiovascular: {
    label: "Cardiovascular",
    short: "CV",
    color: "#ff8787",
    desc: "Vascular tone, blood pressure, PDE-5",
  },
};

// ============================================================
// COMPOUND INTELLIGENCE DATABASE
// IDs match AlkiApp.jsx COMPOUNDS array exactly.
// ============================================================

const COMPOUND_INTEL = {
  bpc157: {
    name: "BPC-157",
    category: "Recovery",
    axes: [
      { axis: "tissue_repair", weight: 1.0, mechanism: "Angiogenesis, local tendon/ligament/gut repair" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "limited_human" },
    synergies: ["tb500", "bpc_tb_blend", "mk677", "ipacjc"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Local tissue repair anchor. Pairs canonically with TB-500 for systemic + local coverage.",
  },
  tb500: {
    name: "TB-500",
    category: "Recovery",
    axes: [
      { axis: "tissue_repair", weight: 0.9, mechanism: "Systemic actin binding, stem cell mobilization" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "limited_human" },
    synergies: ["bpc157", "bpc_tb_blend", "mk677", "ipacjc"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Systemic healing layer. BPC-157 handles local injury; TB-500 conditions the body-wide repair environment.",
  },
  ipacjc: {
    name: "Ipamorelin + CJC-1295",
    category: "Growth Hormone",
    axes: [
      { axis: "gh_axis", weight: 1.0, mechanism: "GHRH analog (CJC) + selective ghrelin agonist (Ipamorelin)" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0.05, dataQuality: "moderate" },
    synergies: ["bpc157", "tb500", "semaglutide", "retatrutide", "mk677", "bpc_tb_blend"],
    redundancies: ["tesamorelin", "sermorelin", "cjc1295_nodac"],
    supportTriggers: [],
    contraindications: [],
    designNote: "Physiological GH pulse via complementary mechanisms. 5–10x larger pulse than either alone. Run pre-sleep for primary repair window.",
  },
  tesamorelin: {
    name: "Tesamorelin",
    category: "Fat Loss",
    axes: [
      { axis: "gh_axis", weight: 0.85, mechanism: "GHRH analog (FDA-approved)" },
      { axis: "metabolic", weight: 0.35, mechanism: "Visceral fat reduction (validated mechanism)" },
    ],
    risk: { suppression: 0, liver: 0.05, cardio: 0.1, dataQuality: "fda_approved" },
    synergies: ["ghkcu"],
    redundancies: ["ipacjc"],
    supportTriggers: ["glucose_monitoring"],
    contraindications: [],
    designNote: "Strongest human evidence of the GH peptide class. Targets visceral fat specifically. Not redundant with Ipamorelin/CJC at lower doses on separate timing — but stacking both at full dose is over-saturation.",
  },
  semaglutide: {
    name: "Semaglutide",
    category: "Weight Loss",
    axes: [
      { axis: "metabolic", weight: 1.0, mechanism: "GLP-1 receptor agonist — appetite suppression + insulin secretion" },
    ],
    risk: { suppression: 0, liver: 0.05, cardio: 0.1, dataQuality: "fda_approved" },
    synergies: ["ipacjc"],
    redundancies: ["retatrutide"],
    supportTriggers: ["protein_intake", "resistance_training"],
    contraindications: [
      {
        type: "body_fat_min",
        male: 15,
        female: 22,
        severity: "critical",
        message:
          "GLP-1 agonists are contraindicated for lean individuals. Significant lean mass loss occurs alongside fat loss — net body composition outcome is poor below these body fat thresholds.",
      },
    ],
    designNote: "Best for body fat ≥22% (female) or ≥15% (male). Pair with resistance training and elevated protein to preserve lean mass. Weight rebounds after cessation without lifestyle anchor.",
  },
  retatrutide: {
    name: "Retatrutide",
    category: "Weight Loss",
    axes: [
      { axis: "metabolic", weight: 1.2, mechanism: "Triple agonist: GLP-1 + GIP + Glucagon receptors" },
    ],
    risk: { suppression: 0, liver: 0.15, cardio: 0.2, dataQuality: "phase_iii" },
    synergies: ["ipacjc"],
    redundancies: ["semaglutide"],
    supportTriggers: ["protein_intake", "resistance_training", "glucose_monitoring"],
    contraindications: [
      {
        type: "body_fat_min",
        male: 18,
        female: 24,
        severity: "critical",
        message:
          "Retatrutide is the most aggressive GLP-class compound currently known. Lean mass loss risk exceeds Semaglutide. Higher body fat threshold required.",
      },
    ],
    designNote: "Triple agonist — most powerful GLP available. Still in Phase III. Treat as the maximum-output GLP option; not a starting compound. Glucose monitoring strongly advised.",
  },
  ghkcu: {
    name: "GHK-Cu",
    category: "Anti-Aging",
    axes: [
      { axis: "tissue_repair", weight: 0.5, mechanism: "Collagen synthesis, ECM reconstruction" },
      { axis: "anti_aging", weight: 1.0, mechanism: "4000+ gene activation, skin/hair quality, longevity signaling" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "moderate" },
    synergies: ["bpc157", "tesamorelin"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Naturally occurring copper peptide. Topical/intranasal route has best evidence. Stacks cleanly with everything else in the database.",
  },
  pt141: {
    name: "PT-141",
    category: "Performance",
    axes: [
      { axis: "cns_melanocortin", weight: 1.0, mechanism: "MC3R/MC4R agonist — central libido pathway" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0.2, dataQuality: "fda_approved" },
    synergies: [],
    redundancies: [],
    supportTriggers: [],
    contraindications: [
      {
        type: "hypertension",
        severity: "moderate",
        message:
          "PT-141 can transiently elevate blood pressure. Use with caution if uncontrolled hypertension is present. Discuss with a physician before use.",
      },
    ],
    designNote: "Central nervous system mechanism — not vascular like PDE-5 inhibitors. Use as needed, max 2x/week. Nausea common at higher doses.",
  },

  // ============================================================
  // EXPANDED COMPOUND INTEL — GH Axis
  // ============================================================

  sermorelin: {
    name: "Sermorelin",
    category: "Growth Hormone",
    axes: [
      { axis: "gh_axis", weight: 0.80, mechanism: "GHRH analog (1-29) — physiological pulsatile GH release; most clinical data of any GH peptide, formerly FDA-approved" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "fda_approved" },
    synergies: ["bpc157", "tb500", "ghkcu"],
    redundancies: ["ipacjc", "tesamorelin"],
    supportTriggers: [],
    contraindications: [],
    designNote: "Physiological GH pulse via the natural GHRH pathway. Preserves pituitary feedback — no desensitization risk. Best GH peptide for long-term anti-aging use. Requires daily injection; short half-life.",
  },

  cjc1295_nodac: {
    name: "CJC-1295 (No DAC)",
    category: "Growth Hormone",
    axes: [
      { axis: "gh_axis", weight: 0.80, mechanism: "Short-acting GHRH analog — sharp GH pulse; 30-min half-life; must be paired with a GHRP" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "moderate" },
    synergies: ["bpc157", "tb500", "ghkcu"],
    redundancies: ["ipacjc", "tesamorelin", "sermorelin"],
    supportTriggers: [],
    contraindications: [],
    designNote: "Short-acting GHRH analog. Drives a sharp physiological GH pulse when combined with Ipamorelin — together they mirror the GH pulse from Ipamorelin + CJC-1295 No DAC (the most common pairing). 30-minute half-life means it must always be co-administered with a GHRP.",
  },

  ipamorelin: {
    name: "Ipamorelin",
    category: "Growth Hormone",
    axes: [
      { axis: "gh_axis", weight: 0.85, mechanism: "Selective ghrelin receptor agonist (GHRP) — cleanest GH secretagogue, no cortisol or prolactin spike" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "moderate" },
    synergies: ["bpc157", "tb500", "cjc1295_nodac", "semaglutide", "retatrutide"],
    redundancies: ["ipacjc"],
    supportTriggers: [],
    contraindications: [],
    designNote: "The cleanest GHRP. No cortisol or prolactin elevation unlike GHRP-6 or hexarelin. Typically combined with CJC-1295 No DAC for a 5–10x amplified GH pulse. Standalone Ipamorelin is also effective but less potent than the combined stack.",
  },

  mk677: {
    name: "MK-677",
    category: "Growth Hormone",
    axes: [
      { axis: "gh_axis", weight: 0.80, mechanism: "Oral ghrelin receptor agonist — 24-hour IGF-1 elevation; the only practical oral GH axis entry" },
    ],
    risk: { suppression: 0, liver: 0.05, cardio: 0.05, dataQuality: "moderate" },
    synergies: ["bpc157", "tb500", "ipacjc", "rad140", "lgd4033", "mk2866", "bpc_tb_blend"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Non-suppressive. Runs through cycles, PCT, and bridges indefinitely — the most universally useful compound for any stack involving suppressive SARMs. Oral dosing. Appetite increase and water retention common in the first two weeks.",
  },

  igf1lr3: {
    name: "IGF-1 LR3",
    category: "Growth Hormone",
    axes: [
      { axis: "gh_axis", weight: 0.90, mechanism: "Modified IGF-1 analog — bypasses GH axis for direct IGF-1R activation; 20–30hr half-life; theoretical hyperplasia potential" },
    ],
    risk: { suppression: 0, liver: 0.10, cardio: 0.05, dataQuality: "limited_human" },
    synergies: ["bpc157", "tb500"],
    redundancies: ["ipacjc", "mk677"],
    supportTriggers: [],
    contraindications: [
      {
        type: "body_fat_min",
        male: 8,
        female: 14,
        severity: "moderate",
        message: "IGF-1 LR3 is not recommended below this body fat threshold — hypoglycemia risk increases significantly in very lean individuals.",
      },
    ],
    designNote: "Most potent IGF-1 signal outside pharmaceutical HGH. Works in users with poor pituitary response. Requires food management to avoid hypoglycemia. Mandatory receptor breaks (4 weeks on / 4 weeks off) to prevent downregulation. Not appropriate as a first peptide cycle.",
  },

  fragment176: {
    name: "Fragment 176-191",
    category: "Fat Loss",
    axes: [
      { axis: "metabolic", weight: 0.40, mechanism: "Isolated GH fat-burning fragment — fat oxidation without anabolic effect or blood glucose impact" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "limited_human" },
    synergies: ["ipacjc", "tesamorelin", "semaglutide"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Clean lipolysis adjunct. No anabolic activity, no effect on blood glucose. Stacks with GH peptides or GLP-1 compounds without receptor competition. Best used as an add-on mechanism, not a primary fat loss driver.",
  },

  // ============================================================
  // EXPANDED COMPOUND INTEL — SARMs
  // ============================================================

  mk2866: {
    name: "MK-2866 (Ostarine)",
    category: "SARM",
    axes: [
      { axis: "ar", weight: 0.65, mechanism: "Partial AR agonist — mildest, most studied SARM; low-moderate suppression" },
    ],
    risk: { suppression: 0.35, liver: 0.10, cardio: 0.10, dataQuality: "moderate" },
    synergies: ["mk677", "bpc157", "tb500", "tadalafil"],
    redundancies: ["rad140", "lgd4033", "yk11", "s23"],
    supportTriggers: ["pct_standard", "bloodwork_panel"],
    contraindications: [],
    designNote: "Entry-point SARM. Lowest suppression and best-characterized human safety profile in class. Best choice for a first SARM cycle. Recomposition signal at moderate doses. Mild SERM PCT sufficient.",
  },

  rad140: {
    name: "RAD-140",
    category: "SARM",
    axes: [
      { axis: "ar", weight: 0.90, mechanism: "Potent AR agonist — fastest strength and lean mass onset in SARM class" },
    ],
    risk: { suppression: 0.65, liver: 0.10, cardio: 0.15, dataQuality: "moderate" },
    synergies: ["mk677", "bpc157", "tb500", "bpc_tb_blend", "tadalafil"],
    redundancies: ["lgd4033", "yk11", "s23", "mk2866"],
    supportTriggers: ["pct_standard", "bloodwork_panel", "tadalafil_daily"],
    contraindications: [],
    designNote: "Premier lean mass AR agonist. Fast-acting strength signal within 2 weeks. High suppression — PCT is non-negotiable. MK-677 pairs cleanly for GH/IGF-1 coverage through PCT. Bloodwork required before, mid-cycle, and 4 weeks post-PCT.",
  },

  lgd4033: {
    name: "LGD-4033",
    category: "SARM",
    axes: [
      { axis: "ar", weight: 0.90, mechanism: "AR agonist — significant mass gains; among the strongest SARMs for bulking phases" },
    ],
    risk: { suppression: 0.65, liver: 0.25, cardio: 0.10, dataQuality: "moderate" },
    synergies: ["mk677", "bpc157", "tb500", "bpc_tb_blend", "tadalafil"],
    redundancies: ["rad140", "yk11", "s23", "mk2866"],
    supportTriggers: ["pct_standard", "bloodwork_panel", "tudca_nac", "tadalafil_daily"],
    contraindications: [],
    designNote: "Mass-building SARM. Some hepatotoxicity reports in human data — TUDCA is recommended throughout. Significant suppression requires full PCT. MK-677 adds non-suppressive GH coverage that runs through PCT. Bloodwork mandatory.",
  },

  yk11: {
    name: "YK-11",
    category: "SARM",
    axes: [
      { axis: "ar", weight: 1.0, mechanism: "Steroidal AR agonist + myostatin inhibitor — most aggressive compound in SARM class" },
    ],
    risk: { suppression: 0.90, liver: 0.50, cardio: 0.20, dataQuality: "minimal" },
    synergies: ["mk677", "bpc157", "tb500", "bpc_tb_blend", "tadalafil"],
    redundancies: ["rad140", "lgd4033", "s23", "mk2866"],
    supportTriggers: ["pct_standard", "bloodwork_panel", "tudca_nac", "tadalafil_daily"],
    contraindications: [],
    designNote: "Steroidal SARM with myostatin inhibition — the ceiling-removal mechanism. Near-complete testosterone shutdown expected. TUDCA 500mg/day + NAC 600mg/day are mandatory throughout cycle and for 2 weeks after. Minimum 2-3 month recovery post-PCT. Not appropriate for any user without prior SARM cycle experience.",
  },

  s23: {
    name: "S-23",
    category: "SARM",
    axes: [
      { axis: "ar", weight: 0.95, mechanism: "Near-complete AR agonism — researched as a male contraceptive agent" },
    ],
    risk: { suppression: 0.95, liver: 0.10, cardio: 0.10, dataQuality: "minimal" },
    synergies: ["mk677", "bpc157", "tb500", "bpc_tb_blend", "tadalafil"],
    redundancies: ["rad140", "lgd4033", "yk11", "mk2866"],
    supportTriggers: ["pct_standard", "bloodwork_panel", "tadalafil_daily"],
    contraindications: [],
    designNote: "Near-complete testosterone shutdown. Full dual-SERM PCT (Nolvadex + Enclomiphene) required. Minimal human data — risk profile extrapolated from animal models and anecdote. Not appropriate without full bloodwork infrastructure.",
  },

  // ============================================================
  // EXPANDED COMPOUND INTEL — Cycle Support & Recovery
  // ============================================================

  tadalafil: {
    name: "Tadalafil",
    category: "Cycle Support",
    axes: [
      { axis: "cardiovascular", weight: 1.0, mechanism: "PDE-5 inhibitor (longest-acting) — cardiovascular protection, blood pressure management, sexual function support" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "fda_approved" },
    synergies: ["rad140", "lgd4033", "yk11", "s23", "mk2866"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Most underrated cycle support compound. Daily 5mg provides cardiovascular protection, blood pressure management, pump enhancement, and sexual function support under HPG suppression. Strong clinical data. Zero downside at therapeutic dose for most users.",
  },

  bpc_tb_blend: {
    name: "BPC-157 / TB-500 Blend",
    category: "Recovery",
    axes: [
      { axis: "tissue_repair", weight: 1.0, mechanism: "Pre-mixed local angiogenesis (BPC-157) + systemic stem cell mobilization (TB-500) — full-spectrum tissue repair in one injection" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "limited_human" },
    synergies: ["ipacjc", "mk677", "ghkcu", "rad140", "lgd4033", "yk11", "s23"],
    redundancies: ["bpc157", "tb500"],
    supportTriggers: [],
    contraindications: [],
    designNote: "Pre-mixed gold standard recovery pairing. BPC-157 drives local tissue repair; TB-500 conditions the systemic healing environment. Chemically identical to running them separately — convenience format for users who want both without managing two vials.",
  },
};

// ============================================================
// SUPPORT COMPOUND / LIFESTYLE REQUIREMENT DEFINITIONS
// Extensible map. Future SARM expansion adds TUDCA, NAC,
// Tadalafil, Nolvadex, Enclomiphene, Anastrozole, etc.
// ============================================================

const SUPPORT_DEFS = {
  protein_intake: {
    label: "Elevated Protein Intake",
    category: "Lifestyle",
    urgency: "required",
    detail:
      "Target 0.8–1.0g protein per pound bodyweight daily. GLP-1 use without adequate protein produces a poor body composition outcome — fat loss is mixed with significant lean mass loss.",
  },
  resistance_training: {
    label: "Resistance Training Protocol",
    category: "Lifestyle",
    urgency: "required",
    detail:
      "Resistance training 3–4x/week is the single strongest signal preserving lean mass during GLP-1-induced weight loss. Without it, expect 30–40% of weight lost to be lean tissue.",
  },
  glucose_monitoring: {
    label: "Glucose Monitoring",
    category: "Monitoring",
    urgency: "recommended",
    detail:
      "CGM or fasting glucose check weekly during the first month. Watch for hypoglycemia risk, particularly with triple-agonist compounds.",
  },
  monitor_prolactin: {
    label: "Monitor for Prolactin Sides",
    category: "Monitoring",
    urgency: "optional",
    detail:
      "If libido drop or nipple sensitivity occurs, consider lab work. Cabergoline 0.25mg 2x/week resolves prolactin sides if confirmed. (Reserved for GHRP-6 / hexarelin when database expands — Ipamorelin does not require this.)",
  },
  tudca_nac: {
    label: "TUDCA 500mg/day + NAC 600mg/day",
    category: "Hepatic Support",
    urgency: "required",
    detail:
      "Mandatory throughout cycle and 2 weeks after for hepatotoxic compounds. Bile acid + glutathione precursor combination is the standard liver protection layer.",
  },
  tadalafil_daily: {
    label: "Tadalafil 5mg Daily",
    category: "Cardiovascular Support",
    urgency: "recommended",
    detail:
      "Daily low-dose tadalafil provides cardiovascular protection, blood pressure management, and sexual function support during cycles. Zero downside at this dose for most users.",
  },
  pct_standard: {
    label: "Standard PCT Protocol",
    category: "Hormonal Recovery",
    urgency: "required",
    detail:
      "Nolvadex 20mg/day or Enclomiphene 12.5mg/day for 4–6 weeks post-cycle to restore HPG axis function. Bloodwork 4 weeks post-PCT to verify recovery.",
  },
  bloodwork_panel: {
    label: "Bloodwork Panel",
    category: "Monitoring",
    urgency: "required",
    detail:
      "Pre-cycle, week 6, and 4 weeks post-PCT: Total + Free Testosterone, LH, FSH, Estradiol, ALT, AST, Lipids, CBC. This is the only real safety net for any hormonal compound.",
  },
};

// #39/#71 — support items that map to actual catalog compounds the user can add to
// their stack. Values are option LISTS: most are a single compound, but PCT offers a
// choice of SERMs (Tamoxifen / Enclomiphene) — one or both per suppression level.
// Lifestyle/monitoring support (protein, bloodwork, TUDCA/NAC not yet in catalog)
// stays as guidance.
const SUPPORT_COMPOUND_OPTIONS = {
  tadalafil_daily: ["tadalafil"],
  pct_standard: ["tamoxifen", "enclomiphene"],
};

// ============================================================
// STACK ANALYZER — pure function, deterministic
// ============================================================

// #43 — conservative intel fallback for catalog compounds not in COMPOUND_INTEL
// (most of the expanded catalog). Previously these were dropped, which froze the
// safety score for manually-built stacks. Mirrors the timeline's fallback pattern.
const RISK_TIER_MAP = {
  very_low: { liver: 0,    cardio: 0    },
  low:      { liver: 0,    cardio: 0.02 },
  low_mod:  { liver: 0.05, cardio: 0.05 },
  moderate: { liver: 0.08, cardio: 0.08 },
  mod_high: { liver: 0.15, cardio: 0.13 },
  high:     { liver: 0.22, cardio: 0.18 },
  unknown:  { liver: 0.10, cardio: 0.10 },
};
function deriveIntelFromCatalog(c) {
  const tier = RISK_TIER_MAP[c.riskTier] || { liver: 0.05, cardio: 0.05 };
  let suppression = 0;
  if (c.category === "SARM") suppression = 0.4;
  else if (c.category === "Hormonal") suppression = 0.7;
  return {
    id: c.id,
    name: c.name,
    category: c.category || "Other",
    axes: [],
    synergies: [],
    redundancies: [],
    contraindications: [],
    supportTriggers: [],
    risk: { suppression, liver: tier.liver, cardio: tier.cardio, dataQuality: "limited_human" },
    // #67 — give catalog-fallback compounds (e.g. SR-9009) a real "Role in Stack"
    // line instead of a blank, using their mechanism/tagline from the catalog.
    designNote: c.mechanism || c.tagline || "Part of your custom stack — open its full profile for mechanism, dosing, and role.",
    _derived: true,
  };
}

function analyzeStack(stackIds, userProfile = {}, compoundCatalog = []) {
  // Resolve each id to full intel, deriving a fallback from the catalog when the
  // compound isn't in COMPOUND_INTEL so every selection moves the analysis (#43).
  const compounds = (stackIds || [])
    .map((id) => {
      if (COMPOUND_INTEL[id]) return { id, ...COMPOUND_INTEL[id] };
      const cat = compoundCatalog.find((c) => c.id === id);
      return cat ? deriveIntelFromCatalog(cat) : null;
    })
    .filter(Boolean);

  if (compounds.length === 0) {
    return {
      compounds: [],
      axisCoverage: {},
      redundancies: [],
      synergies: [],
      supportRequired: [],
      contraindications: [],
      safetyScore: { overall: 100, suppression: 100, liver: 100, cardio: 100, interaction: 100 },
      isBlocked: false,
      summary: null,
    };
  }

  // -------- AXIS COVERAGE --------
  const axisCoverage = {};
  compounds.forEach((c) => {
    c.axes.forEach(({ axis, weight, mechanism }) => {
      if (!axisCoverage[axis]) {
        axisCoverage[axis] = { totalWeight: 0, compounds: [] };
      }
      axisCoverage[axis].totalWeight += weight;
      axisCoverage[axis].compounds.push({
        id: c.id,
        name: c.name,
        weight,
        mechanism,
      });
    });
  });

  // #43 follow-up — set of resolved stack ids + a lookup that also covers derived
  // (catalog-fallback) compounds, so redundancy/synergy detection works and a
  // base compound pointing at a derived one never dereferences undefined.
  const stackIdSet = new Set(compounds.map((c) => c.id));
  const intelById = {};
  compounds.forEach((c) => { intelById[c.id] = c; });

  // -------- REDUNDANCIES --------
  const redundancies = [];
  const seenRedundancyPairs = new Set();

  compounds.forEach((c) => {
    c.redundancies.forEach((rid) => {
      if (stackIdSet.has(rid)) {
        const pairKey = [c.id, rid].sort().join("|");
        if (!seenRedundancyPairs.has(pairKey)) {
          seenRedundancyPairs.add(pairKey);
          const other = intelById[rid] || { name: rid, axes: [] };
          // Recommend keeping the better-evidenced / stronger compound and
          // dropping the other, so the warning is actionable (#bc9b8b30).
          const keep = redundancyStrength(c) >= redundancyStrength(other) ? c : other;
          const drop = keep === c ? other : c;
          redundancies.push({
            type: "explicit",
            axisLabels: c.axes
              .filter((a) => (other.axes || []).some((oa) => oa.axis === a.axis))
              .map((a) => AXES[a.axis]?.label || a.axis),
            compounds: [c.name, other.name],
            severity: "moderate",
            recommendation: { keepId: keep.id, keepName: keep.name, dropId: drop.id, dropName: drop.name },
            message: `${c.name} and ${other.name} target the same primary axis. Effects are not strictly additive — receptor desensitization or pituitary blunting is possible over extended dual stimulation. If both are desired, run at reduced doses on separate timing or alternating days.`,
          });
        }
      }
    });
  });

  // -------- SYNERGIES --------
  const synergies = [];
  const seenSynergyPairs = new Set();

  compounds.forEach((c) => {
    c.synergies.forEach((sid) => {
      if (stackIdSet.has(sid)) {
        const pairKey = [c.id, sid].sort().join("|");
        if (!seenSynergyPairs.has(pairKey)) {
          seenSynergyPairs.add(pairKey);
          synergies.push({
            compounds: [c.name, (intelById[sid] || { name: sid }).name],
            message: getSynergyMessage(c.id, sid),
          });
        }
      }
    });
  });

  // -------- SUPPORT REQUIRED --------
  const supportRequired = [];
  const seenSupport = new Set();
  compounds.forEach((c) => {
    c.supportTriggers.forEach((sid) => {
      if (!seenSupport.has(sid) && SUPPORT_DEFS[sid]) {
        seenSupport.add(sid);
        supportRequired.push({
          id: sid,
          ...SUPPORT_DEFS[sid],
          triggeredBy: c.name,
        });
      }
    });
  });

  // -------- CONTRAINDICATIONS --------
  const contraindications = [];

  compounds.forEach((c) => {
    c.contraindications.forEach((contra) => {
      if (matchesContraindication(contra, userProfile)) {
        contraindications.push({
          compound: c.id,
          compoundName: c.name,
          ...contra,
        });
      }
    });
  });

  // Stack-level: duplicate GLP-class detection
  const glpCount = compounds.filter((c) =>
    c.axes.some((a) => a.axis === "metabolic" && a.weight >= 0.9)
  ).length;
  if (glpCount > 1) {
    contraindications.push({
      compound: null,
      compoundName: "Stack-level",
      type: "duplicate_class",
      severity: "critical",
      message:
        "Multiple GLP-class agonists detected in this stack. These should never be combined — receptor saturation, severe GI side effects, and dangerous hypoglycemia risk. Select one GLP compound only.",
    });
  }

  // Stack-level: dual suppressive SARM detection
  const suppressiveSARMs = compounds.filter((c) =>
    c.category === "SARM" && c.risk.suppression >= 0.35
  );
  if (suppressiveSARMs.length > 1) {
    contraindications.push({
      compound: null,
      compoundName: "Stack-level",
      type: "receptor_competition",
      severity: "critical",
      message:
        `Multiple suppressive SARMs detected (${suppressiveSARMs.map(c => c.name).join(" + ")}). ` +
        "Compounded suppression does not produce proportionally greater results but does compound recovery burden. " +
        "Near-complete testosterone shutdown expected. Dual-SERM PCT (Nolvadex + Enclomiphene), bloodwork at every phase, TUDCA/NAC for any hepatotoxic compound, and 2–3 month recovery minimum are non-negotiable.",
    });
  }

  // -------- SAFETY SCORE --------
  const sumRisk = (key) => compounds.reduce((sum, c) => sum + (c.risk[key] || 0), 0);

  // #66 — round at source so the score bars never render long FP tails (e.g. 84.99999).
  const suppression = Math.round(clamp(100 - sumRisk("suppression") * 100, 0, 100));
  const liver = Math.round(clamp(100 - sumRisk("liver") * 100, 0, 100));
  const cardio = Math.round(clamp(100 - sumRisk("cardio") * 100, 0, 100));

  let interactionPenalty = redundancies.length * 8;
  contraindications.forEach((c) => {
    if (c.severity === "critical") interactionPenalty += 40;
    else if (c.severity === "moderate") interactionPenalty += 15;
    else interactionPenalty += 5;
  });
  const interaction = clamp(100 - interactionPenalty, 0, 100);

  const overall = Math.round((suppression + liver + cardio + interaction) / 4);

  const isBlocked = false; // Contraindications inform; they never block the user.

  const activeAxes = Object.keys(axisCoverage)
    .map((a) => AXES[a]?.short || a)
    .join(" + ");
  const riskLabel =
    overall >= 85
      ? "Low"
      : overall >= 70
      ? "Low–Moderate"
      : overall >= 55
      ? "Moderate"
      : overall >= 40
      ? "Mod–High"
      : "High";

  return {
    compounds,
    axisCoverage,
    redundancies,
    synergies,
    supportRequired,
    contraindications,
    safetyScore: { overall, suppression, liver, cardio, interaction },
    isBlocked,
    summary: {
      axes: activeAxes,
      risk: riskLabel,
      compoundCount: compounds.length,
    },
  };
}

function matchesContraindication(contra, userProfile) {
  if (contra.type === "body_fat_min") {
    const sex = (userProfile.sex || "male").toLowerCase();
    const threshold = sex === "female" ? contra.female : contra.male;
    if (typeof userProfile.bodyFat === "number" && userProfile.bodyFat < threshold) {
      return true;
    }
  }
  if (contra.type === "hypertension") {
    return userProfile.hypertension === true ? true : false;
  }
  return false;
}

function getSynergyMessage(idA, idB) {
  const key = [idA, idB].sort().join("|");
  const messages = {
    // ── Original 8 compound pairs ────────────────────────────────
    "bpc157|tb500":
      "The canonical recovery pairing. BPC-157 drives local angiogenesis and direct tissue repair; TB-500 mobilizes stem cells systemically and conditions the body-wide healing environment. Together they cover both ends of the repair pathway with no receptor overlap.",
    "bpc157|ghkcu":
      "BPC-157 drives angiogenesis at injury sites; GHK-Cu adds collagen synthesis and ECM reconstruction. Complementary repair mechanisms operating on different cellular targets.",
    "bpc157|ipacjc":
      "Recovery stack: connective tissue repair (BPC-157) under elevated GH/IGF-1 conditions (Ipamorelin/CJC). The GH pulse amplifies the local repair signal — particularly effective during high-load training phases.",
    "ipacjc|tb500":
      "Sleep-window recovery enhancement. TB-500 conditions systemic healing; the GH pulse from Ipamorelin/CJC accelerates the repair processes TB-500 enables.",
    "ipacjc|semaglutide":
      "GLP-1 fat loss with lean mass preservation. Ipamorelin/CJC adds the GH/IGF-1 signal that counteracts the lean mass loss typical of standalone GLP-1 protocols. This is the most important pairing for the GLP-1 demographic.",
    "ipacjc|retatrutide":
      "Aggressive fat loss with GH-axis muscle preservation. The most powerful GLP agent paired with GH peptide support. Resistance training and protein intake remain non-negotiable.",
    "ghkcu|tesamorelin":
      "Visceral fat reduction (Tesamorelin) with skin quality support (GHK-Cu). Tesamorelin's fat loss can reveal skin laxity; GHK-Cu actively rebuilds collagen and ECM in parallel.",

    // ── MK-677 pairings ─────────────────────────────────────────
    "ipacjc|mk677":
      "Complementary GH axis coverage: Ipamorelin/CJC drives the sharp pre-sleep GH pulse; MK-677 maintains 24-hour IGF-1 elevation orally between pulses. Together they provide full-spectrum, non-suppressive GH/IGF-1 support across the entire day.",
    "bpc157|mk677":
      "Tissue repair under sustained IGF-1 elevation. MK-677's 24-hour IGF-1 signal amplifies BPC-157's local repair mechanisms. Non-suppressive combination — safe to run indefinitely.",
    "mk677|tb500":
      "Systemic healing under sustained IGF-1 support. TB-500 mobilizes stem cells and conditions the repair environment; MK-677's IGF-1 elevation accelerates the regenerative processes TB-500 activates.",
    "lgd4033|mk677":
      "Independent anabolic mechanisms with zero receptor overlap. LGD-4033 drives AR-mediated muscle protein synthesis; MK-677 adds GH/IGF-1 anabolism through a completely separate pathway. MK-677 is non-suppressive and runs through PCT — the most universally useful pairing for any SARM cycle.",
    "mk677|rad140":
      "Premier lean bulk pairing. RAD-140 drives potent AR anabolism; MK-677 provides sustained GH/IGF-1 coverage through a fully independent mechanism. Zero receptor overlap. MK-677's non-suppressive nature means it continues through PCT, bridging the hormonal recovery window.",
    "mk2866|mk677":
      "Clean entry-level stack. Ostarine's mild AR signal with MK-677's oral GH support — two independent anabolic mechanisms, neither suppressing the other's pathway. Best first combination for users new to performance compounds.",
    "mk677|yk11":
      "Triple-mechanism mass stack: AR + Myostatin inhibition (YK-11) layered under GH/IGF-1 elevation (MK-677). MK-677 continues through PCT while YK-11 cycle ends — maintains IGF-1 during the critical recovery window.",
    "mk677|s23":
      "GH axis support throughout the most suppressive SARM available. MK-677's non-suppressive IGF-1 elevation provides ongoing anabolic signaling while S-23's PCT window completes.",

    // ── BPC-TB Blend pairings ────────────────────────────────────
    "bpc157|bpc_tb_blend":
      "Note: BPC-157/TB-500 Blend already contains BPC-157. Adding standalone BPC-157 creates redundancy at the local repair axis — consider using the blend alone or running standalone BPC-157 + TB-500 separately if dose titration is important.",
    "bpc_tb_blend|tb500":
      "Note: BPC-157/TB-500 Blend already contains TB-500. This combination creates redundancy at the systemic repair axis. Use the blend alone or standalone BPC-157 + TB-500 to avoid dose overlap.",
    "bpc_tb_blend|ipacjc":
      "Complete recovery architecture: BPC-157/TB-500 Blend covers both local and systemic tissue repair while Ipamorelin/CJC-1295 maximizes the GH repair window during sleep. Every mechanism operates at a different biological level. Non-suppressive — no PCT required.",
    "bpc_tb_blend|mk677":
      "Maximum non-suppressive recovery stack. BPC-157/TB-500 covers local and systemic tissue repair; MK-677 adds 24-hour IGF-1 elevation orally. Three independent repair mechanisms — none overlapping, none suppressive. Can be run indefinitely.",
    "bpc_tb_blend|ghkcu":
      "Full-spectrum tissue restoration. BPC-157/TB-500 handles acute repair; GHK-Cu adds collagen synthesis, ECM reconstruction, and longevity gene activation. Complementary depth of mechanism.",
    "bpc_tb_blend|rad140":
      "SARM cycle with mandatory recovery infrastructure. RAD-140 drives the anabolic AR signal; BPC-157/TB-500 Blend protects connective tissue under the progressive load this cycle enables. Standard pairing for any AR compound — connective tissue is the limiting factor before muscle is.",
    "bpc_tb_blend|lgd4033":
      "Mass cycle with connective tissue protection. LGD-4033's significant mass gains put connective tissue under stress; BPC-157/TB-500 Blend is the standard recovery infrastructure for managing that load.",
    "bpc_tb_blend|yk11":
      "Aggressive cycle with mandatory repair layer. YK-11's AR + myostatin inhibition produces rapid tissue loading; BPC-157/TB-500 Blend is non-negotiable connective tissue protection. The blend runs through the full cycle and PCT without conflict.",

    // ── SARM + Tadalafil pairings ────────────────────────────────
    "rad140|tadalafil":
      "Cardiovascular support under AR suppression. Tadalafil 5mg daily provides blood pressure management, cardiovascular protection, and sexual function support during the HPG-suppressed cycle state RAD-140 produces. Strongest evidence of any cycle support compound at this dose.",
    "lgd4033|tadalafil":
      "Cardiovascular and sexual health support throughout LGD-4033 cycle. Tadalafil's PDE-5 inhibition maintains vascular tone and sexual function during HPG suppression. Zero interaction risk.",
    "mk2866|tadalafil":
      "Even mild SARM cycles benefit from cardiovascular support. Tadalafil 5mg daily adds no risk and provides BP management and pump enhancement throughout the mild Ostarine cycle.",
    "s23|tadalafil":
      "Critical pairing for the most suppressive SARM. Tadalafil's cardiovascular protection and sexual function support are particularly valuable during S-23's near-complete HPG shutdown.",
    "tadalafil|yk11":
      "Mandatory cycle support for the most aggressive SARM stack. Tadalafil's cardiovascular coverage is non-negotiable during YK-11's near-complete HPG suppression.",
  };
  return (
    messages[key] ||
    "These compounds operate on complementary biological mechanisms with documented synergy in research and protocol design."
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// #bc9b8b30 — when two compounds are redundant we don't just warn, we recommend
// which one to keep. Rank by evidence quality first (a researched compound beats
// an experimental one), then by primary-axis weight as a tie-breaker. The
// stronger member is the keep; the other is the suggested drop.
const DATA_QUALITY_RANK = {
  fda_approved: 5,
  phase_iii: 4,
  phase_ii: 3,
  moderate: 3,
  limited_human: 2,
  minimal: 1,
};
function redundancyStrength(intel) {
  const q = DATA_QUALITY_RANK[intel?.risk?.dataQuality] ?? 2;
  const weights = (intel?.axes || []).map((a) => a.weight || 0);
  const w = weights.length ? Math.max(...weights) : 0;
  return q * 10 + w; // dataQuality dominates; axis weight breaks ties
}

// ============================================================
// VISUAL COMPONENTS
// ============================================================

const ACCENT = "#22d68a";
const BG_CARD = "rgba(255,255,255,0.04)";
const BG_CARD_2 = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_BRIGHT = "rgba(255,255,255,0.15)";
const TEXT = "#e8e8e8";
const TEXT_DIM = "rgba(255,255,255,0.55)";
const TEXT_FAINT = "rgba(255,255,255,0.35)";
const RED = "#ef4444";
const AMBER = "#f59e0b";

function scoreColor(score) {
  if (score >= 85) return ACCENT;
  if (score >= 65) return "#a3e635";
  if (score >= 45) return AMBER;
  return RED;
}

export default function StackIntelligence({ stackIds = [], userProfile = {}, onRemoveCompound, onAddCompound, mode = "full", compoundCatalog = [] }) {
  const analysis = useMemo(
    () => analyzeStack(stackIds, userProfile, compoundCatalog),
    [stackIds, userProfile, compoundCatalog]
  );

  if (analysis.compounds.length === 0) {
    return null;
  }

  // #71 — PCT SERM recommendation: both Tamoxifen + Enclomiphene for a strongly- or
  // dual-suppressive cycle; either one for a mild cycle. Mirrors generatePCT() in
  // the stack generator (strong-SARM list + dual-suppressive detection).
  const STRONG_SARM_IDS = ["yk11", "rad140", "lgd4033", "lgd3303", "rad150", "s23"];
  const pctRecommendBoth =
    analysis.compounds.some((c) => STRONG_SARM_IDS.includes(c.id)) ||
    analysis.compounds.filter((c) => c.category === "SARM" && (c.risk?.suppression || 0) >= 0.35).length > 1;

  // Compact mode: render ONLY the critical contraindication banner.
  // Used on the Dashboard so the selection flow stays clean.
  // Full analysis lives on the Transform screen.
  if (mode === "compact") {
    // #43 — always surface a live risk read while building, not only on contraindications.
    return (
      <div style={styles.container}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
            Stack Safety
          </div>
          <div style={{ ...styles.riskBadge, color: scoreColor(analysis.safetyScore.overall) }}>
            {analysis.summary.risk} · {analysis.safetyScore.overall}/100
          </div>
        </div>
        {analysis.contraindications.length > 0 && (
          <ContraindicationBanner
            contraindications={analysis.contraindications}
            onRemoveCompound={onRemoveCompound}
          />
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ArchitectureHeader analysis={analysis} />

      {analysis.contraindications.length > 0 && (
        <ContraindicationBanner
          contraindications={analysis.contraindications}
          onRemoveCompound={onRemoveCompound}
        />
      )}

      <SafetyScoreSection score={analysis.safetyScore} />

      <AxisMap analysis={analysis} />

      {(analysis.redundancies.length > 0 || analysis.synergies.length > 0) && (
        <InteractionsSection
          redundancies={analysis.redundancies}
          synergies={analysis.synergies}
          onRemoveCompound={onRemoveCompound}
        />
      )}

      {analysis.supportRequired.length > 0 && (
        <SupportLayer
          supportRequired={analysis.supportRequired}
          selectedIds={stackIds}
          onAddCompound={onAddCompound}
          compoundCatalog={compoundCatalog}
          pctRecommendBoth={pctRecommendBoth}
        />
      )}

      <DesignNotes compounds={analysis.compounds} />

      <Disclaimer />
    </div>
  );
}

function ArchitectureHeader({ analysis }) {
  const { summary, safetyScore } = analysis;
  return (
    <div style={styles.archHeader}>
      <div style={styles.archHeaderTop}>
        <div style={styles.archHeaderLabel}>STACK ARCHITECTURE</div>
        <div style={{ ...styles.riskBadge, color: scoreColor(safetyScore.overall) }}>
          Risk: {summary.risk}
        </div>
      </div>
      <div style={styles.archHeaderAxes}>
        <span style={styles.archHeaderAxesLabel}>Axes</span>
        <span style={styles.archHeaderAxesValue}>{summary.axes}</span>
      </div>
      <div style={styles.archHeaderMeta}>
        {summary.compoundCount} compound{summary.compoundCount === 1 ? "" : "s"} · Live analysis
      </div>
    </div>
  );
}

function ContraindicationBanner({ contraindications, onRemoveCompound }) {
  const critical = contraindications.filter((c) => c.severity === "critical");
  const moderate = contraindications.filter((c) => c.severity !== "critical");

  return (
    <div style={styles.contraSection}>
      {critical.length > 0 && (
        <div style={styles.contraBlockBox}>
          <div style={styles.contraBlockHeader}>
            <span style={styles.contraBlockIcon}>⨯</span>
            <span>
              {critical.length} HIGH-RISK ADVISORY
              {critical.length === 1 ? "" : " FLAGS"}
            </span>
          </div>
          {critical.map((contra, i) => (
            <div key={i} style={styles.contraItem}>
              <div style={styles.contraItemHeader}>
                <span style={styles.contraItemCompound}>{contra.compoundName}</span>
                {contra.compound && onRemoveCompound && (
                  <button
                    style={styles.contraRemoveBtn}
                    onClick={() => onRemoveCompound(contra.compound)}
                  >
                    Remove from stack
                  </button>
                )}
              </div>
              <div style={styles.contraItemMessage}>{contra.message}</div>
            </div>
          ))}
          <div style={styles.contraBlockFooter}>
            Proceed with caution. You understand the trade-offs.
          </div>
        </div>
      )}

      {moderate.length > 0 && (
        <div style={styles.contraWarnBox}>
          <div style={styles.contraWarnHeader}>
            <span style={styles.contraWarnIcon}>!</span>
            <span>
              {moderate.length} caution flag{moderate.length === 1 ? "" : "s"}
            </span>
          </div>
          {moderate.map((contra, i) => (
            <div key={i} style={styles.contraWarnItem}>
              <span style={styles.contraWarnCompound}>{contra.compoundName}:</span>{" "}
              {contra.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SafetyScoreSection({ score }) {
  const overallColor = scoreColor(score.overall);

  return (
    <div style={styles.scoreBox}>
      <div style={styles.scoreLeft}>
        <div style={styles.scoreLabel}>SAFETY SCORE</div>
        <div style={{ ...styles.scoreNumber, color: overallColor }}>{score.overall}</div>
        <div style={styles.scoreOutOf}>/ 100</div>
      </div>
      <div style={styles.scoreRight}>
        <ScoreBar label="Suppression" value={score.suppression} />
        <ScoreBar label="Liver Load" value={score.liver} />
        <ScoreBar label="Cardiovascular" value={score.cardio} />
        <ScoreBar label="Interaction Risk" value={score.interaction} />
      </div>
    </div>
  );
}

function ScoreBar({ label, value }) {
  const color = scoreColor(value);
  return (
    <div style={styles.scoreBarRow}>
      <div style={styles.scoreBarLabel}>{label}</div>
      <div style={styles.scoreBarTrack}>
        <div
          style={{
            ...styles.scoreBarFill,
            width: `${value}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div style={{ ...styles.scoreBarValue, color }}>{value}</div>
    </div>
  );
}

function AxisMap({ analysis }) {
  const { axisCoverage } = analysis;
  const orderedAxes = Object.entries(axisCoverage).sort(
    (a, b) => b[1].totalWeight - a[1].totalWeight
  );

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Biological Axis Coverage</div>
        <div style={styles.sectionSubtitle}>
          Where this stack acts on the body. Multiple compounds on one axis = redundancy.
        </div>
      </div>

      <div style={styles.axisRack}>
        {orderedAxes.map(([axisKey, data]) => {
          const axis = AXES[axisKey] || { label: axisKey, color: TEXT_DIM, short: axisKey };
          const isOverSaturated = data.totalWeight > 1.5;
          const fillPct = Math.min(100, data.totalWeight * 60);

          return (
            <div key={axisKey} style={styles.axisRow}>
              <div style={styles.axisRowHeader}>
                <div style={styles.axisRowLeft}>
                  <span style={{ ...styles.axisDot, backgroundColor: axis.color }} />
                  <span style={styles.axisLabel}>{axis.label}</span>
                  <span style={styles.axisDesc}>{axis.desc}</span>
                </div>
                <div
                  style={{
                    ...styles.axisStrength,
                    color: isOverSaturated ? AMBER : TEXT_FAINT,
                  }}
                >
                  {isOverSaturated ? "SATURATED" : `${Math.round(data.totalWeight * 100)}%`}
                </div>
              </div>

              <div style={styles.axisTrack}>
                <div
                  style={{
                    ...styles.axisFill,
                    width: `${fillPct}%`,
                    background: `linear-gradient(90deg, ${axis.color}55, ${axis.color}cc)`,
                  }}
                />
              </div>

              <div style={styles.axisCompounds}>
                {data.compounds.map((c, i) => (
                  <div key={i} style={styles.axisCompoundNode}>
                    <div
                      style={{
                        ...styles.axisCompoundChip,
                        borderColor: axis.color + "88",
                      }}
                    >
                      <span style={styles.axisCompoundName}>{c.name}</span>
                      <span style={styles.axisCompoundWeight}>{Math.round(c.weight * 100)}%</span>
                    </div>
                    <div style={styles.axisCompoundMechanism}>{c.mechanism}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractionsSection({ redundancies, synergies, onRemoveCompound }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Compound Interactions</div>
        <div style={styles.sectionSubtitle}>
          How compounds reinforce or compete with each other.
        </div>
      </div>

      {synergies.length > 0 && (
        <div style={styles.interactionGroup}>
          <div style={styles.interactionGroupHeader}>
            <span style={{ ...styles.interactionTag, color: ACCENT, borderColor: ACCENT + "66" }}>
              SYNERGY
            </span>
            <span style={styles.interactionGroupCount}>{synergies.length}</span>
          </div>
          {synergies.map((syn, i) => (
            <div key={i} style={styles.interactionItem}>
              <div style={styles.interactionItemPair}>{syn.compounds.join("  +  ")}</div>
              <div style={styles.interactionItemMsg}>{syn.message}</div>
            </div>
          ))}
        </div>
      )}

      {redundancies.length > 0 && (
        <div style={styles.interactionGroup}>
          <div style={styles.interactionGroupHeader}>
            <span style={{ ...styles.interactionTag, color: AMBER, borderColor: AMBER + "66" }}>
              REDUNDANCY
            </span>
            <span style={styles.interactionGroupCount}>{redundancies.length}</span>
          </div>
          {redundancies.map((red, i) => (
            <div key={i} style={styles.interactionItem}>
              <div style={styles.interactionItemPair}>
                {red.compounds.join("  ⇄  ")}
                {red.axisLabels?.length > 0 && (
                  <span style={styles.interactionAxisTag}>{red.axisLabels.join(", ")}</span>
                )}
              </div>
              <div style={styles.interactionItemMsg}>{red.message}</div>
              {/* #bc9b8b30 — actionable recommendation: name the compound to keep
                  and offer a one-tap removal of the redundant one. */}
              {red.recommendation && (
                <div style={styles.redundancyFix}>
                  <span style={styles.redundancyFixText}>
                    Recommended: keep <strong style={{ color: ACCENT }}>{red.recommendation.keepName}</strong>, drop{" "}
                    <strong style={{ color: TEXT }}>{red.recommendation.dropName}</strong>.
                  </span>
                  {onRemoveCompound && red.recommendation.dropId && (
                    <button
                      style={styles.redundancyFixBtn}
                      onClick={() => onRemoveCompound(red.recommendation.dropId)}
                    >
                      Remove {red.recommendation.dropName}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportLayer({ supportRequired, selectedIds = [], onAddCompound, compoundCatalog = [], pctRecommendBoth = false }) {
  const grouped = supportRequired.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const nameOf = (id) =>
    (compoundCatalog.find((c) => c.id === id) || COMPOUND_INTEL[id] || {}).name || id;

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Support Layer</div>
        <div style={styles.sectionSubtitle}>
          Compounds, monitoring, and lifestyle requirements triggered by this stack.
        </div>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={styles.supportGroup}>
          <div style={styles.supportGroupHeader}>{category}</div>
          {items.map((item, i) => (
            <div key={i} style={styles.supportCard}>
              <div style={styles.supportCardHeader}>
                <div style={styles.supportCardLabel}>{item.label}</div>
                <div
                  style={{
                    ...styles.supportUrgency,
                    color:
                      item.urgency === "required"
                        ? RED
                        : item.urgency === "recommended"
                        ? AMBER
                        : TEXT_FAINT,
                  }}
                >
                  {item.urgency}
                </div>
              </div>
              <div style={styles.supportCardDetail}>{item.detail}</div>
              <div style={styles.supportCardTrigger}>Triggered by {item.triggeredBy}</div>
              {(() => {
                const opts = SUPPORT_COMPOUND_OPTIONS[item.id];
                if (!opts || !onAddCompound) return null;
                const req = item.urgency === "required";
                // #71 — PCT offers a choice: one SERM for mild cycles, both for
                // strongly/dual-suppressive ones. Other support items are single.
                const isPCT = item.id === "pct_standard";
                const recLabel = isPCT
                  ? (pctRecommendBoth
                      ? "Recommended for this stack: add BOTH (strong/dual suppression)"
                      : "Add one — Tamoxifen or Enclomiphene both work for a mild cycle")
                  : null;
                return (
                  <div style={{ marginTop: 8 }}>
                    {recLabel && (
                      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 6, lineHeight: 1.4 }}>{recLabel}</div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {opts.map((id) => {
                        const inStack = selectedIds.includes(id);
                        if (inStack) {
                          return (
                            <span key={id} style={{ fontSize: 11, fontWeight: 600, color: ACCENT, padding: "7px 0" }}>
                              ✓ {nameOf(id)} in stack
                            </span>
                          );
                        }
                        return (
                          <button
                            key={id}
                            onClick={() => onAddCompound(id)}
                            style={{
                              padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                              cursor: "pointer", fontFamily: "inherit",
                              background: req ? ACCENT : "transparent",
                              color: req ? "#06281b" : ACCENT,
                              border: `1px solid ${req ? ACCENT : ACCENT + "66"}`,
                            }}
                          >
                            + {nameOf(id)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DesignNotes({ compounds }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Role in Stack</div>
        <div style={styles.sectionSubtitle}>What each compound contributes to the protocol.</div>
      </div>
      <div style={styles.designNotes}>
        {compounds.map((c, i) => (
          <div key={i} style={styles.designNoteRow}>
            <div style={styles.designNoteCompound}>{c.name}</div>
            <div style={styles.designNoteText}>{c.designNote}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div style={styles.disclaimer}>
      {DISCLAIMER}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    color: TEXT,
    width: "100%",
    marginBottom: 12,
  },

  archHeader: {
    padding: "18px 20px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
    border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 12,
  },
  archHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  archHeaderLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: ACCENT,
  },
  riskBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    border: `1px solid currentColor`,
    borderRadius: 999,
    letterSpacing: "0.05em",
  },
  archHeaderAxes: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 8,
  },
  archHeaderAxesLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.12em",
    color: TEXT_FAINT,
    textTransform: "uppercase",
  },
  archHeaderAxesValue: {
    fontSize: 17,
    fontWeight: 600,
    color: TEXT,
    letterSpacing: "-0.01em",
  },
  archHeaderMeta: {
    fontSize: 12,
    color: TEXT_DIM,
  },

  contraSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  contraBlockBox: {
    border: `1px solid ${AMBER}`,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderRadius: 12,
    overflow: "hidden",
  },
  contraBlockHeader: {
    padding: "12px 16px",
    backgroundColor: AMBER,
    color: "#0a0a0a",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  contraBlockIcon: {
    fontSize: 18,
    lineHeight: 1,
    fontWeight: 700,
  },
  contraItem: {
    padding: "14px 16px",
    borderBottom: `1px solid rgba(239,68,68,0.2)`,
  },
  contraItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
    flexWrap: "wrap",
  },
  contraItemCompound: {
    fontSize: 14,
    fontWeight: 600,
    color: TEXT,
  },
  contraRemoveBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: AMBER,
    backgroundColor: "transparent",
    border: `1px solid ${AMBER}`,
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  contraItemMessage: {
    fontSize: 13,
    color: "#fcd34d",
    lineHeight: 1.5,
  },
  contraBlockFooter: {
    padding: "10px 16px",
    fontSize: 11,
    color: "#fbbf24",
    letterSpacing: "0.04em",
    backgroundColor: "rgba(245,158,11,0.04)",
  },

  contraWarnBox: {
    border: `1px solid rgba(245,158,11,0.4)`,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderRadius: 10,
    padding: 14,
  },
  contraWarnHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
    color: AMBER,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  contraWarnIcon: {
    fontSize: 16,
    fontWeight: 700,
  },
  contraWarnItem: {
    fontSize: 13,
    color: "#fcd34d",
    lineHeight: 1.5,
    paddingTop: 6,
  },
  contraWarnCompound: {
    fontWeight: 600,
    color: AMBER,
  },

  scoreBox: {
    display: "flex",
    gap: 20,
    padding: 20,
    backgroundColor: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  scoreLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 110,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: TEXT_FAINT,
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  scoreOutOf: {
    fontSize: 13,
    color: TEXT_FAINT,
    marginTop: 4,
  },
  scoreRight: {
    flex: 1,
    minWidth: 200,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  scoreBarRow: {
    display: "grid",
    gridTemplateColumns: "100px 1fr 32px",
    alignItems: "center",
    gap: 10,
  },
  scoreBarLabel: {
    fontSize: 11,
    color: TEXT_DIM,
    fontWeight: 500,
  },
  scoreBarTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 300ms ease, background-color 300ms ease",
  },
  scoreBarValue: {
    fontSize: 11,
    fontWeight: 600,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },

  section: {
    padding: 20,
    backgroundColor: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: TEXT,
    marginBottom: 4,
    letterSpacing: "-0.01em",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.5,
  },

  axisRack: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  axisRow: {
    paddingBottom: 14,
    borderBottom: `1px solid ${BORDER}`,
  },
  axisRowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  axisRowLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    flex: 1,
    minWidth: 0,
  },
  axisDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  },
  axisLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT,
  },
  axisDesc: {
    fontSize: 11,
    color: TEXT_FAINT,
  },
  axisStrength: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    fontVariantNumeric: "tabular-nums",
  },
  axisTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 10,
  },
  axisFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 400ms ease",
  },
  axisCompounds: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  axisCompoundNode: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  axisCompoundChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 10px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 12,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  axisCompoundName: {
    fontWeight: 600,
    color: TEXT,
  },
  axisCompoundWeight: {
    fontSize: 10,
    color: TEXT_DIM,
    fontVariantNumeric: "tabular-nums",
  },
  axisCompoundMechanism: {
    fontSize: 11,
    color: TEXT_FAINT,
    paddingLeft: 12,
    lineHeight: 1.4,
  },

  interactionGroup: {
    marginBottom: 14,
  },
  interactionGroupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  interactionTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    padding: "3px 8px",
    border: "1px solid",
    borderRadius: 4,
  },
  interactionGroupCount: {
    fontSize: 11,
    color: TEXT_FAINT,
    fontVariantNumeric: "tabular-nums",
  },
  interactionItem: {
    padding: 12,
    backgroundColor: BG_CARD_2,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    marginBottom: 8,
  },
  interactionItemPair: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  interactionAxisTag: {
    fontSize: 10,
    color: TEXT_FAINT,
    padding: "2px 6px",
    border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 4,
    fontWeight: 500,
    letterSpacing: "0.05em",
  },
  interactionItemMsg: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.55,
  },
  redundancyFix: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${BORDER}`,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  redundancyFixText: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.5,
    flex: 1,
    minWidth: 160,
  },
  redundancyFixBtn: {
    padding: "7px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    background: "transparent",
    color: AMBER,
    border: `1px solid ${AMBER}66`,
    whiteSpace: "nowrap",
  },

  supportGroup: {
    marginBottom: 14,
  },
  supportGroupHeader: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: TEXT_FAINT,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  supportCard: {
    padding: 14,
    backgroundColor: BG_CARD_2,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    marginBottom: 8,
  },
  supportCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  supportCardLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT,
  },
  supportUrgency: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  supportCardDetail: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.55,
    marginBottom: 8,
  },
  supportCardTrigger: {
    fontSize: 11,
    color: TEXT_FAINT,
    fontStyle: "italic",
  },

  designNotes: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  designNoteRow: {
    paddingBottom: 12,
    borderBottom: `1px solid ${BORDER}`,
  },
  designNoteCompound: {
    fontSize: 13,
    fontWeight: 600,
    color: ACCENT,
    marginBottom: 4,
  },
  designNoteText: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.55,
  },

  disclaimer: {
    fontSize: 11,
    color: TEXT_FAINT,
    lineHeight: 1.5,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.02)",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    fontStyle: "italic",
  },
};

// Proactive stack-aware suggestions (Plan D): given the current selection,
// surface synergistic compounds NOT yet in the stack, ranked by how many of the
// selected compounds they pair with. Advisory only — the user adds them by hand;
// nothing is auto-added, and antagonist/redundancy warnings are handled by
// analyzeStack once a compound is in the stack.
function getStackSuggestions(selectedIds = [], catalog = []) {
  const selected = new Set(selectedIds);
  const catalogIds = new Set(catalog.map((c) => c.id));

  // #b56f4ec2 — never suggest a compound already in the stack, nor one that is a
  // functional duplicate of something selected. The literal id is the obvious
  // case; the subtle one is composites: with BPC-157 and/or TB-500 selected the
  // synergy graph points at the BPC-157/TB-500 blend (which CONTAINS them), and
  // with the blend selected it points back at the components. Build an
  // "effectively present" set from the bidirectional redundancy graph and
  // exclude all of it, so the blend↔components pair (and any same-axis redundant
  // pair) can never be suggested as a new addition.
  const excluded = new Set(selectedIds);
  for (const id of selectedIds) {
    for (const rid of (COMPOUND_INTEL[id]?.redundancies || [])) excluded.add(rid);
  }
  for (const [cid, intel] of Object.entries(COMPOUND_INTEL)) {
    if ((intel.redundancies || []).some((rid) => selected.has(rid))) excluded.add(cid);
  }

  const scores = {};
  for (const id of selectedIds) {
    const intel = COMPOUND_INTEL[id];
    if (!intel) continue;
    for (const synId of intel.synergies || []) {
      if (excluded.has(synId) || !catalogIds.has(synId)) continue;
      if (!scores[synId]) scores[synId] = { count: 0, partners: [] };
      scores[synId].count++;
      scores[synId].partners.push(intel.name || id);
    }
  }
  return Object.entries(scores)
    .map(([id, s]) => {
      const c = catalog.find((x) => x.id === id);
      return {
        id,
        name: c?.name || COMPOUND_INTEL[id]?.name || id,
        category: c?.category || COMPOUND_INTEL[id]?.category || "",
        partners: s.partners,
        count: s.count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export { analyzeStack, COMPOUND_INTEL, AXES, SUPPORT_DEFS, getStackSuggestions };
