"use client";

import { ACCENT } from "../theme";

/**
 * ============================================================
 * ALKI — STACK GENERATOR  (v2 — risk-ladder tuning)
 * ============================================================
 *
 * Composes fresh stacks from the user's profile. Each call returns an
 * ordered RISK LADDER of 2–3 architecturally distinct stacks:
 *
 *     Conservative  →  Moderate  →  Aggressive
 *
 * The ladder is built by selecting, for each intensity tier, the FIRST
 * pattern that is buildable for this user's profile + body-fat band.
 * Each phase lists a preferred pattern per tier followed by non-SARM
 * fallbacks, so the ladder never collapses to a single tier just because
 * a body-fat gate excluded the SARM/GH option (the old #10 failure mode).
 *
 * Method (Umbrella Labs Section 6 framing):
 *   1. Determine the user's primary phase from profile + goals.
 *   2. For each intensity tier, pick the first buildable architectural
 *      pattern (anchor + complementary + recovery + support).
 *   3. Fill each role with the best catalog compound for the profile,
 *      risk band, and body-fat gate.
 *   4. Layer in mandatory support (PCT, hepatic, thyroid, CV, lifestyle).
 *   5. Enforce: no contraindications, no duplicate-class compounds, no
 *      educational-reference-only / experimental compounds.
 *
 * DETERMINISTIC — same profile always produces the same ladder. No LLM,
 * no randomness.
 *
 * USAGE:
 *   import { generateStacks } from "./stackGenerator";
 *   const stacks = generateStacks(profile, COMPOUNDS);
 *   // stacks: [{ id, name, approach, intensity, compounds:[{id,role,...}],
 *   //           axes, support, pct, designNote, riskLabel, riskColor, phase }]
 * ============================================================
 */

// ============================================================
// PHASE DETECTION   (unchanged from #8 rewrite)
// ============================================================

function detectPhase(profile) {
  const { sex, age, bodyFat, goals = [], adv = {} } = profile;
  const skelMuscle = parseFloat(adv.skelMuscle) || null;
  const lowSMThreshold = sex === "female" ? 34 : 38;

  const wantsFatLoss = goals.includes("fat_loss");
  const wantsMuscle = goals.includes("muscle");
  const wantsRecovery = goals.includes("recovery");
  const wantsAntiAging = goals.includes("anti_aging") || goals.includes("skin");
  const wantsPerformance = goals.includes("performance") || goals.includes("energy");

  const highBF   = sex === "female" ? 28 : 22;
  const modBF    = sex === "female" ? 22 : 15;
  const leanBF   = sex === "female" ? 18 : 12;
  const ultraBF  = sex === "female" ? 15 : 10;

  if (skelMuscle !== null && skelMuscle < lowSMThreshold && !wantsFatLoss) {
    return "lean_bulk";
  }

  if (wantsFatLoss && wantsMuscle) {
    if (bodyFat >= highBF) return "cut_high_bf";
    if (bodyFat >= modBF)  return "cut_moderate_bf";
    if (bodyFat >= leanBF) return "lean_bulk";
    return "ultra_lean";
  }

  if (wantsFatLoss) {
    if (bodyFat >= highBF) return "cut_high_bf";
    if (bodyFat >= modBF)  return "cut_moderate_bf";
    if (bodyFat >= leanBF) return "cut_moderate_bf";
    return "ultra_lean";
  }

  if (wantsMuscle) {
    if (bodyFat < ultraBF)  return "ultra_lean";
    if (bodyFat <= highBF)  return "lean_bulk";
    return "lean_bulk";
  }

  if (wantsRecovery && !wantsFatLoss && !wantsMuscle) {
    return "recovery";
  }

  if (wantsAntiAging && age >= 35) return "longevity";
  if (wantsAntiAging) return "recovery";

  if (wantsPerformance) {
    if (bodyFat >= highBF) return "cut_high_bf";
    return "lean_bulk";
  }

  if (bodyFat >= highBF) return "cut_high_bf";
  if (bodyFat >= modBF)  return "cut_moderate_bf";
  return "lean_bulk";
}

// ============================================================
// ARCHITECTURAL PATTERNS
// Ordered within each phase as: conservative → moderate → aggressive,
// with the PREFERRED variant before any fallback of the same tier.
// The generator emits the first buildable pattern per tier.
// ============================================================

const PATTERNS = {
  // ---- Cut at high body fat (GLP-1 territory) ----
  cut_high_bf: [
    {
      id: "glp1_preservation",
      name: "GLP-1 with Muscle Preservation",
      approach: "Appetite suppression + GH-axis lean mass protection",
      intensity: "conservative",
      slots: [
        { role: "Primary fat loss anchor", mechanism: "glp1", required: true },
        { role: "Lean mass preservation", mechanism: "gh_axis", required: true },
        { role: "Joint / connective tissue", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c, p) =>
        `${c[0]?.name} drives appetite suppression and a sustained caloric deficit. ` +
        `${c[1]?.name} supplies the GH/IGF-1 signal that offsets the lean mass loss typical of standalone GLP-1 protocols — the single most important architecture for the ${p.bodyFat}% body fat demographic.` +
        (c[2] ? ` ${c[2].name} protects joints and connective tissue under reduced intake.` : ""),
    },
    {
      id: "glp1_basic",
      name: "GLP-1 Foundation",
      approach: "Appetite suppression with recovery support",
      intensity: "conservative",
      slots: [
        { role: "Primary fat loss anchor", mechanism: "glp1", required: true },
        { role: "Joint / connective tissue", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives appetite suppression and a sustained caloric deficit — the foundation of the high-body-fat research phase.` +
        (c[1] ? ` ${c[1].name} supports connective tissue while training resumes.` : "") +
        ` Protein intake and resistance training carry the lean-mass protection here.`,
    },
    {
      id: "metabolic_layered",
      name: "Multi-Axis Metabolic Cut",
      approach: "Visceral fat targeting + GH stimulation + skin support",
      intensity: "moderate",
      slots: [
        { role: "Visceral fat targeting", mechanism: "ghrh", required: true },
        { role: "Adjunct fat oxidation", mechanism: "lipolysis", required: false },
        { role: "Skin / collagen support", mechanism: "ecm", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} stimulates endogenous GH release with FDA-documented visceral fat reduction.` +
        (c[1] ? ` ${c[1].name} adds a separate fat-oxidation mechanism with no glucose or muscle impact.` : "") +
        (c[2] ? ` ${c[2].name} addresses collagen and skin quality — rapid fat loss can reveal laxity that GHK-Cu counteracts.` : ""),
    },
    {
      id: "aggressive_cut",
      name: "Aggressive Triple Agonist",
      approach: "Maximum-potency GLP + GH preservation + monitoring",
      intensity: "aggressive",
      slots: [
        { role: "Maximum fat loss agent", mechanism: "glp_triple", required: true },
        { role: "Lean mass preservation", mechanism: "gh_axis", required: true },
        { role: "Joint support", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} is the most aggressive GLP-class compound available — triple receptor activation on GLP-1, GIP, and Glucagon. ` +
        `${c[1]?.name} provides the GH/IGF-1 anchor against the elevated lean mass loss risk this potency carries.` +
        (c[2] ? ` ${c[2].name} supports connective tissue throughout the deficit.` : "") +
        ` Glucose monitoring and resistance training are non-negotiable.`,
    },
    {
      id: "aggressive_metabolic",
      name: "Aggressive Metabolic Cut",
      approach: "GLP triple + thyroid adjunct + GH preservation (fallback)",
      intensity: "aggressive",
      slots: [
        { role: "Maximum fat loss agent", mechanism: "glp_triple", required: true },
        { role: "Metabolic rate adjunct", mechanism: "metabolic_adjunct", required: false },
        { role: "Joint support", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} delivers maximum GLP-class fat loss via triple receptor activation.` +
        (c[1] ? ` ${c[1].name} raises metabolic rate as an adjunct — used cautiously, titrated, and tapered, never stopped abruptly.` : "") +
        (c[2] ? ` ${c[2].name} protects connective tissue.` : "") +
        ` Glucose, heart rate, and resistance training must all be monitored.`,
    },
  ],

  // ---- Cut at moderate body fat (recomp-leaning, GH-axis dominant) ----
  cut_moderate_bf: [
    {
      id: "gh_recomp_cut",
      name: "GH-Axis Moderate Cut",
      approach: "Body recomposition via GH peptides + tissue repair",
      intensity: "conservative",
      slots: [
        { role: "Body recomposition anchor", mechanism: "gh_axis", required: true },
        { role: "Connective tissue support", mechanism: "tissue_repair", required: true },
        { role: "Sustained IGF-1", mechanism: "ghrelin", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives simultaneous fat loss and lean mass support via GH/IGF-1 elevation — the core recomp mechanism. ` +
        `${c[1]?.name} protects joints and tendons under training stress.` +
        (c[2] ? ` ${c[2].name} adds non-suppressive oral GH support and 24-hour IGF-1 coverage.` : ""),
    },
    {
      id: "visceral_targeted",
      name: "Visceral Fat Targeted",
      approach: "Tesamorelin-led with GH-axis breadth",
      intensity: "moderate",
      slots: [
        { role: "Visceral fat targeting", mechanism: "ghrh", required: true },
        { role: "Connective tissue support", mechanism: "tissue_repair", required: false },
        { role: "Adjunct fat oxidation", mechanism: "lipolysis", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} provides the strongest human evidence in the GH-peptide class for fat loss, with FDA-documented visceral fat reduction.` +
        (c[1] ? ` ${c[1].name} protects connective tissue.` : "") +
        (c[2] ? ` ${c[2].name} adds a separate lipolytic mechanism with no glucose or muscle impact.` : ""),
    },
    {
      id: "gh_lipolytic_cut",
      name: "GH + Lipolytic Cut",
      approach: "GH axis + direct lipolysis + recovery (lean-cutter fallback)",
      intensity: "moderate",
      slots: [
        { role: "Body recomposition anchor", mechanism: "gh_axis", required: true },
        { role: "Direct lipolysis", mechanism: "lipolysis", required: true },
        { role: "Sustained IGF-1", mechanism: "ghrelin", required: false },
        { role: "Connective tissue support", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives GH-mediated recomposition while ${c[1]?.name} adds a direct, glucose-neutral lipolytic signal — the moderate option for already-lean cutters where Tesamorelin isn't indicated.` +
        (c[2] ? ` ${c[2].name} sustains 24-hour IGF-1.` : "") +
        (c[3] ? ` ${c[3].name} protects connective tissue.` : ""),
    },
    {
      id: "metabolic_cut_aggressive",
      name: "Aggressive Metabolic Cut",
      approach: "GHRH + lipolytic + thyroid adjunct",
      intensity: "aggressive",
      slots: [
        { role: "Visceral fat targeting", mechanism: "ghrh", required: true },
        { role: "Adjunct fat oxidation", mechanism: "lipolysis", required: false },
        { role: "Metabolic rate adjunct", mechanism: "metabolic_adjunct", required: true },
        { role: "Connective tissue support", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives GH-mediated visceral fat loss as the anchor.` +
        (c.find(x => x.category === "Fat Loss" && x.id === "fragment176") ? ` Fragment 176-191 adds direct lipolysis.` : "") +
        ` A thyroid adjunct raises metabolic rate for the steepest deficit in this phase — it must be titrated up slowly, tapered down, and never stopped abruptly, with heart-rate monitoring throughout.` +
        (c[c.length - 1]?.category === "Recovery" ? ` ${c[c.length - 1].name} protects connective tissue under the deficit.` : ""),
    },
  ],

  // ---- Lean bulk (clean muscle gain) ----
  lean_bulk: [
    {
      id: "gh_lean_bulk",
      name: "GH-Axis Lean Bulk",
      approach: "Injectable + oral GH anchors with recovery layer",
      intensity: "conservative",
      slots: [
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: true },
        { role: "Connective tissue support", mechanism: "tissue_repair", required: true },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives the physiological GH pulse pre-sleep — the primary repair and recomp window. ` +
        `${c[1]?.name} provides sustained 24-hour IGF-1 elevation orally and non-suppressively, so it runs indefinitely. ` +
        `${c[2]?.name} protects connective tissue under progressive load. Two independent anabolic mechanisms, zero receptor overlap.`,
    },
    {
      id: "sarm_assisted",
      name: "SARM-Assisted Lean Bulk",
      approach: "AR anchor + GH support + mandatory recovery layer",
      intensity: "moderate",
      slots: [
        { role: "AR anabolic anchor", mechanism: "ar_mild", required: true },
        { role: "GH-axis support", mechanism: "ghrelin", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
        { role: "Cardiovascular support", mechanism: "pde5", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives muscle protein synthesis at the androgen receptor — the primary lean mass mechanism. ` +
        `${c[1]?.name} adds a fully independent GH axis with 24-hour IGF-1 elevation; non-suppressive, runs through PCT. ` +
        `${c[2]?.name} protects connective tissue under increasing load.` +
        (c[3] ? ` ${c[3].name} provides cardiovascular support and pump throughout the cycle.` : "") +
        ` PCT will be required.`,
    },
    {
      id: "gh_igf_moderate",
      name: "GH + Direct IGF-1 Bulk",
      approach: "GH pulse + oral IGF + direct IGF-1 anchor (non-SARM)",
      intensity: "moderate",
      slots: [
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: true },
        { role: "Direct IGF-1 anchor", mechanism: "gh_strong", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
      ],
      designTemplate: (c) =>
        `A non-SARM step up: ${c[0]?.name} drives the nightly GH pulse, ${c[1]?.name} sustains 24-hour IGF-1, and ${c[2]?.name} adds a direct IGF-1 signal at the muscle for stronger anabolism without androgen-receptor suppression. ` +
        `${c[3]?.name} protects connective tissue. No PCT required — none of these suppress the HPG axis. Site rotation and conservative IGF-1 dosing are essential.`,
    },
    {
      id: "gh_plus_moderate",
      name: "GH Axis + Circulatory Support",
      approach: "GH pulse + oral IGF + recovery + CV support (any body fat)",
      intensity: "moderate",
      slots: [
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
        { role: "Cardiovascular support", mechanism: "pde5", required: true },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives the nightly GH pulse and ${c[1]?.name} sustains daytime IGF-1. ` +
        `${c[2]?.name} protects connective tissue, and ${c[3]?.name} adds circulatory support and nutrient delivery to working muscle. ` +
        `A non-suppressive step up from the foundation tier, appropriate across body-fat ranges where SARMs aren't indicated.`,
    },
    {
      id: "aggressive_mass",
      name: "Aggressive Mass Build",
      approach: "Stronger AR anchor + GH + full support infrastructure",
      intensity: "aggressive",
      slots: [
        { role: "AR mass anchor", mechanism: "ar_strong", required: true },
        { role: "GH-axis support", mechanism: "ghrelin", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
        { role: "Cardiovascular support", mechanism: "pde5", required: true },
        { role: "Hepatic support flag", mechanism: "hepatic_support", required: true },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} is the premier mass-building AR agonist — significant lean mass over an 8–10 week cycle. ` +
        `${c[1]?.name} adds the independent GH/IGF-1 mechanism. ` +
        `${c[2]?.name} is non-negotiable connective-tissue support given the load progression this enables.` +
        (c[3] ? ` ${c[3].name} maintains cardiovascular function under cycle stress.` : "") +
        ` TUDCA 500mg + NAC 600mg daily are mandatory. Bloodwork before, mid-cycle, and 4 weeks post-PCT.`,
    },
    {
      id: "gh_igf_aggressive",
      name: "Maximal GH / IGF-1 Bulk",
      approach: "Direct IGF-1 + GH pulse + oral IGF (non-SARM fallback)",
      intensity: "aggressive",
      slots: [
        { role: "Direct IGF-1 anchor", mechanism: "gh_strong", required: true },
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
      ],
      designTemplate: (c) =>
        `The most aggressive non-androgenic build available: ${c[0]?.name} delivers a direct IGF-1 signal at the muscle, layered over the ${c[1]?.name} GH pulse and ${c[2]?.name} 24-hour IGF-1 coverage. ` +
        `${c[3]?.name} protects connective tissue under the resulting load. Direct IGF-1 carries hypoglycemia risk — keep cycles short, rotate sites, and monitor blood glucose.`,
    },
    {
      // E2 — opt-in only: HIGH/UNKNOWN-risk anchor + a larger stack that exceeds the
      // soft cap. Only emitted when the user explicitly enables high-risk generation.
      id: "maximal_mass",
      name: "Maximal Mass (Advanced)",
      approach: "High-risk AR anchor + direct IGF-1 + GH axis + full support",
      intensity: "maximal",
      requiresOptIn: true,
      slots: [
        { role: "Maximal AR anchor", mechanism: "ar_max", required: true },
        { role: "Direct IGF-1 anchor", mechanism: "gh_strong", required: true },
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
        { role: "Cardiovascular support", mechanism: "pde5", required: false },
        { role: "Hepatic support flag", mechanism: "hepatic_support", required: true },
      ],
      designTemplate: (c) =>
        `An advanced, high-risk build you explicitly opted into: ${c[0]?.name} is a maximal androgen-receptor anchor, layered with ${c[1]?.name} for a direct IGF-1 signal, the ${c[2]?.name} GH pulse, and ${c[3]?.name} 24-hour IGF-1 coverage. ` +
        `${c[4]?.name} protects connective tissue under the load.` +
        (c[5] ? ` ${c[5].name} adds cardiovascular support.` : "") +
        ` This exceeds the usual stack size and risk ceiling — full bloodwork, hepatic support, and a complete PCT are mandatory, and the suppression and side-effect burden is significant.`,
    },
  ],

  // ---- Ultra-lean (already very lean, cautious) ----
  ultra_lean: [
    {
      id: "ultra_lean_recovery",
      name: "Ultra-Lean Recovery + GH Support",
      approach: "GH axis without fat-loss compounds; recovery dominant",
      intensity: "conservative",
      slots: [
        { role: "GH axis support", mechanism: "gh_axis", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
        { role: "Systemic healing", mechanism: "tissue_repair_systemic", required: false },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: false },
      ],
      designTemplate: (c) =>
        `At your body fat level the priority is preserving and enhancing lean mass, not driving further fat loss. ` +
        `${c[0]?.name} drives the GH pulse for recomp without depleting necessary mass. ` +
        `${c[1]?.name} supports connective tissue under the high training intensity that maintains this range.` +
        (c[2] ? ` ${c[2].name} conditions the body-wide repair environment.` : "") +
        (c[3] ? ` ${c[3].name} provides 24-hour IGF-1 coverage non-suppressively.` : ""),
    },
    {
      id: "ultra_lean_mild_sarm",
      name: "Mild SARM Recomp",
      approach: "GH pulse + oral IGF + mild AR anchor",
      intensity: "moderate",
      slots: [
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: true },
        { role: "Mild AR anchor", mechanism: "ar_mild", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} and ${c[1]?.name} establish the GH/IGF-1 base, and ${c[2]?.name} — the mildest SARM and standard entry point — adds an androgen-receptor signal for lean accrual at very low body fat. ` +
        `${c[3]?.name} protects connective tissue. A mild SERM PCT is required even at this gentle dose; bloodwork confirms recovery.`,
    },
    {
      id: "ultra_lean_sarm",
      name: "AR-Anchored Lean Build",
      approach: "Strong AR anchor + GH support + full recovery layer",
      intensity: "aggressive",
      slots: [
        { role: "AR mass anchor", mechanism: "ar_strong", required: true },
        { role: "GH-axis support", mechanism: "ghrelin", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
        { role: "Cardiovascular support", mechanism: "pde5", required: false },
        { role: "Hepatic support flag", mechanism: "hepatic_support", required: true },
      ],
      designTemplate: (c) =>
        `For the advanced, already-lean researcher: ${c[0]?.name} provides a strong androgen-receptor anabolic signal, with ${c[1]?.name} adding an independent GH/IGF-1 axis. ` +
        `${c[2]?.name} protects connective tissue.` +
        (c[3] ? ` ${c[3].name} supports the cardiovascular system under cycle stress.` : "") +
        ` TUDCA/NAC and full pre/mid/post bloodwork are mandatory, and PCT will be required.`,
    },
    {
      // E2 — opt-in only maximal tier (see lean_bulk maximal_mass).
      id: "maximal_lean",
      name: "Maximal Lean Build (Advanced)",
      approach: "High-risk AR anchor + direct IGF-1 + GH axis + full support",
      intensity: "maximal",
      requiresOptIn: true,
      slots: [
        { role: "Maximal AR anchor", mechanism: "ar_max", required: true },
        { role: "Direct IGF-1 anchor", mechanism: "gh_strong", required: true },
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained oral IGF-1", mechanism: "ghrelin", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
        { role: "Cardiovascular support", mechanism: "pde5", required: false },
        { role: "Hepatic support flag", mechanism: "hepatic_support", required: true },
      ],
      designTemplate: (c) =>
        `An advanced, high-risk lean build you explicitly opted into: ${c[0]?.name} is a maximal androgen-receptor anchor over the ${c[2]?.name} GH pulse, ${c[3]?.name} oral IGF-1, and ${c[1]?.name} direct IGF-1 signal. ` +
        `${c[4]?.name} protects connective tissue.` +
        (c[5] ? ` ${c[5].name} adds cardiovascular support.` : "") +
        ` This exceeds the usual stack size and risk ceiling — full bloodwork, hepatic support, and a complete PCT are mandatory.`,
    },
  ],

  // ---- Recomp (safety fallback; detectPhase rarely returns this) ----
  recomp: [
    {
      id: "gh_recomp",
      name: "GH-Axis Simultaneous Cut & Build",
      approach: "Body recomposition via GH peptides + recovery anchor",
      intensity: "conservative",
      slots: [
        { role: "Recomp anchor", mechanism: "gh_axis", required: true },
        { role: "Sustained IGF-1", mechanism: "ghrelin", required: false },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives simultaneous fat redistribution and lean mass via pulsed GH/IGF-1 — the cleanest recomp mechanism without suppression.` +
        (c[1] ? ` ${c[1].name} provides 24-hour IGF-1 coverage between pulses; oral and indefinite.` : "") +
        ` ${c[c.length - 1]?.name} protects connective tissue under the training intensity recomp requires.`,
    },
    {
      id: "sarm_recomp",
      name: "Mild SARM Cut & Build",
      approach: "Mild AR anchor + GH support + recovery",
      intensity: "moderate",
      slots: [
        { role: "Mild AR anchor", mechanism: "ar_mild", required: true },
        { role: "GH support", mechanism: "ghrelin", required: false },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} is the mildest SARM and the standard entry point — a recomp signal without aggressive HPG suppression.` +
        (c[1] ? ` ${c[1].name} adds non-suppressive GH support that runs through PCT.` : "") +
        ` ${c[c.length - 1]?.name} protects joints and tendons. Mild SERM PCT is required.`,
    },
    {
      id: "gh_igf_recomp_aggressive",
      name: "Direct IGF-1 Recomp",
      approach: "Direct IGF-1 + GH pulse + recovery (non-SARM)",
      intensity: "aggressive",
      slots: [
        { role: "Direct IGF-1 anchor", mechanism: "gh_strong", required: true },
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Connective tissue", mechanism: "tissue_repair", required: true },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} adds a direct IGF-1 signal over the ${c[1]?.name} GH pulse for the steepest non-androgenic recomp. ` +
        `${c[2]?.name} protects connective tissue. Short cycles and glucose monitoring are essential.`,
    },
  ],

  // ---- Recovery (injury / training stress; no body-comp objective) ----
  recovery: [
    {
      id: "peptide_recovery",
      name: "Pure Peptide Recovery",
      approach: "Local + systemic tissue repair, no body composition load",
      intensity: "conservative",
      slots: [
        { role: "Local tissue repair", mechanism: "tissue_repair", required: true },
        { role: "Systemic healing", mechanism: "tissue_repair_systemic", required: true },
        { role: "ECM / collagen", mechanism: "ecm", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} drives local angiogenesis at injury sites and tendon/ligament repair. ` +
        `${c[1]?.name} conditions the body-wide healing environment.` +
        (c[2] ? ` ${c[2].name} adds collagen synthesis and ECM reconstruction with no suppression.` : "") +
        ` No HPG suppression. No PCT. Sustainable indefinitely.`,
    },
    {
      id: "gh_assisted_recovery",
      name: "GH-Assisted Recovery",
      approach: "Tissue repair layered under elevated GH/IGF-1",
      intensity: "moderate",
      slots: [
        { role: "Local repair", mechanism: "tissue_repair", required: true },
        { role: "Systemic healing", mechanism: "tissue_repair_systemic", required: true },
        { role: "Primary GH pulse", mechanism: "gh_axis", required: true },
        { role: "Sustained IGF-1", mechanism: "ghrelin", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} and ${c[1]?.name} handle local and systemic tissue repair simultaneously. ` +
        `${c[2]?.name} maximizes the GH pulse during sleep — the primary repair window.` +
        (c[3] ? ` ${c[3].name} maintains IGF-1 elevation chronically.` : "") +
        ` Each compound operates at a different biological level with zero receptor overlap.`,
    },
  ],

  // ---- Longevity (35+, anti-aging focus) ----
  longevity: [
    {
      id: "mito_neuro_longevity",
      name: "Multi-Axis Longevity Support",
      approach: "ECM + GH axis + tissue repair, no suppression",
      intensity: "conservative",
      slots: [
        { role: "Skin / ECM anchor", mechanism: "ecm", required: true },
        { role: "GH axis support", mechanism: "gh_axis", required: false },
        { role: "Tissue repair", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} resets gene expression toward a regenerative profile and is the strongest skin/ECM signal in the catalog.` +
        (c[1] ? ` ${c[1].name} restores GH/IGF-1 toward a physiological range — naturally declining with age and the single most actionable hormone target for longevity.` : "") +
        (c[2] ? ` ${c[2].name} maintains tissue-repair capacity under the slower healing of older bodies.` : "") +
        ` No suppression, no PCT, sustainable indefinitely.`,
    },
    {
      id: "longevity_mito",
      name: "Longevity + Cellular Support",
      approach: "ECM + GH axis + bioregulator + mitochondrial layer",
      intensity: "moderate",
      slots: [
        { role: "Skin / ECM anchor", mechanism: "ecm", required: true },
        { role: "GH axis support", mechanism: "gh_axis", required: true },
        { role: "Cellular bioregulator", mechanism: "longevity_peptide", required: true },
        { role: "Mitochondrial / metabolic", mechanism: "mitochondrial", required: false },
        { role: "Tissue repair", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (c) =>
        `${c[0]?.name} anchors skin and ECM regeneration while ${c[1]?.name} restores the GH/IGF-1 axis. ` +
        `${c[2]?.name} acts as a cellular bioregulator targeting age-related decline at the gene-expression level.` +
        (c.find(x => x.category === "Metabolic") ? ` A mitochondrial layer addresses the energy-production decline central to aging.` : "") +
        (c.find(x => x.category === "Recovery") ? ` Connective-tissue repair capacity is maintained.` : "") +
        ` Non-suppressive and sustainable.`,
    },
  ],
};

// ============================================================
// MECHANISM RESOLVERS  (broadened to the full 71-compound catalog)
// Candidates are ordered by preference; the generator takes the first
// that passes the profile / body-fat gate. Wider-BF options are listed
// after the preferred pick so the slot still fills at higher body fat.
// ============================================================

const MECHANISM_CANDIDATES = {
  // GLP family
  glp1: ["semaglutide"],
  glp_triple: ["retatrutide"],

  // GH axis — injectable GH peptides (ipacjc preferred; sermorelin/cjc cover higher BF)
  gh_axis: ["ipacjc", "ipamorelin", "sermorelin", "cjc1295_nodac", "cjc1295_dac"],

  // Direct IGF-1 — aggressive, non-androgenic anchor
  gh_strong: ["igf1lr3"],

  // GHRH analog for visceral fat
  ghrh: ["tesamorelin"],

  // Ghrelin / oral GH (non-suppressive, runs everywhere)
  ghrelin: ["mk677"],

  // Fat oxidation adjunct (no glucose / muscle impact)
  lipolysis: ["fragment176"],

  // Thyroid / metabolic-rate adjunct (aggressive cut tiers)
  metabolic_adjunct: ["t3"],

  // Mitochondrial / metabolic efficiency (longevity, endurance)
  mitochondrial: ["motsc", "sr9009"],

  // Longevity peptide bioregulator (wide BF, non-suppressive)
  longevity_peptide: ["epitalon"],

  // AR — mild entry point
  ar_mild: ["mk2866", "s4"],
  // AR — stronger mass builders (intermediate first, advanced fallbacks)
  ar_strong: ["rad140", "lgd4033", "lgd3303", "rad150"],
  // AR — maximal anchors (HIGH / UNKNOWN risk; opt-in only — E2). YK-11 and S-23
  // carry displayWarning and only become eligible once allowHighRisk is set.
  ar_max: ["yk11", "s23", "rad150", "lgd3303"],

  // Tissue repair
  tissue_repair: ["bpc157"],
  tissue_repair_systemic: ["tb500", "bpc_tb_blend"],

  // ECM / skin
  ecm: ["ghkcu"],

  // Cardiovascular support (cycle-supportive PDE-5)
  pde5: ["tadalafil"],

  // Hepatic support — flag, not a compound; surfaces in support layer
  hepatic_support: ["__support_tudca_nac__"],
};

// ============================================================
// COMPOUND SELECTION
// ============================================================

function selectCompoundForSlot(slot, profile, catalog, alreadySelected, allowHighRisk = false) {
  const candidates = MECHANISM_CANDIDATES[slot.mechanism] || [];
  const alreadyIds = new Set(alreadySelected.map((c) => c.id));

  for (const candidateId of candidates) {
    if (alreadyIds.has(candidateId)) continue;

    if (candidateId.startsWith("__support_")) {
      return { id: candidateId, name: candidateId, isSupportFlag: true };
    }

    const compound = catalog.find((c) => c.id === candidateId);
    if (!compound) continue;

    const bf = profile.bodyFat;
    // E1 — the suitability minBf/maxBf band is the compound's IDEAL range, an
    // advisory, not a hard gate. Hard-excluding on it collapsed goal-relevant
    // ladders: a muscle-gain user above ~20-22% BF had every androgen anchor
    // (MK-2866 maxBf 22, RAD-140 maxBf 20, ...) filtered out, so the moderate
    // and aggressive tiers fell back to GH-axis compounds and the whole ladder
    // read as the lowest-risk, goal-irrelevant GH/recovery stacks. Per
    // advise-don't-gatekeep we no longer block on the soft suitability band —
    // the contraindication advisory still surfaces in StackIntelligence — and
    // keep only the genuine contraindication and reference-only exclusions below.
    if (compound.contraindications) {
      if (compound.contraindications.includes("below15bf") && bf < 15) continue;
      if (compound.contraindications.includes("below22bf_glp1") && bf < 22) continue;
    }

    // Educational-reference-only / experimental compounds require explicit opt-in.
    // recommendableDespiteWarning (Melanotan II only) keeps a warned-but-usable
    // compound eligible; carcinogen / no-human-data compounds lack it and stay out.
    // E2 — when the user has explicitly opted into high/unknown-risk compounds, these
    // exclusions become advisory and are skipped (advise-don't-gatekeep: warn, allow).
    if (!allowHighRisk) {
      if (compound.experienceLevel === "experimental_only") continue;
      if (compound.displayWarning && !compound.recommendableDespiteWarning) continue;
    }

    return compound;
  }

  return null;
}

// ============================================================
// SUPPORT LAYER GENERATION
// ============================================================

function generateSupportLayer(compounds, pattern) {
  const support = [];
  const ids = new Set(compounds.map((c) => c.id));
  const categories = new Set(compounds.map((c) => c.category));

  if (ids.has("semaglutide") || ids.has("retatrutide")) {
    support.push({
      label: "Protein intake ≥ 0.8g per lb bodyweight",
      urgency: "required",
      reason: "GLP-1 use without adequate protein produces poor body composition — significant lean mass loss alongside fat loss.",
    });
    support.push({
      label: "Resistance training 3–4x/week",
      urgency: "required",
      reason: "Single strongest signal preserving lean mass during GLP-1-induced weight loss.",
    });
  }

  if (ids.has("retatrutide")) {
    support.push({
      label: "Weekly glucose check or CGM",
      urgency: "recommended",
      reason: "Triple-agonist hypoglycemia risk warrants monitoring during titration.",
    });
  }

  if (ids.has("tesamorelin")) {
    support.push({
      label: "Fasting glucose monitoring",
      urgency: "recommended",
      reason: "GHRH-driven GH elevation can mildly affect insulin sensitivity.",
    });
  }

  // Thyroid adjunct (T3 / T4)
  if (ids.has("t3") || ids.has("t4")) {
    support.push({
      label: "Thyroid: titrate up slowly, taper down, never stop abruptly",
      urgency: "required",
      reason: "Exogenous thyroid suppresses endogenous output. Abrupt cessation crashes metabolism. Monitor resting heart rate; hold or reduce on palpitations.",
    });
  }

  // Direct IGF-1
  if (ids.has("igf1lr3")) {
    support.push({
      label: "IGF-1: short cycles, site rotation, glucose awareness",
      urgency: "required",
      reason: "Direct IGF-1 carries hypoglycemia risk and localized tissue growth at injection sites. Keep cycles short (≤4 weeks) and rotate sites.",
    });
  }

  if (categories.has("SARM")) {
    support.push({
      label: "PCT: Tamoxifen 20mg/day or Enclomiphene 12.5mg/day, 4 weeks post-cycle",
      urgency: "required",
      reason: "Restores HPG axis function after a suppressive cycle. Bloodwork 4 weeks post-PCT to verify recovery.",
    });
    support.push({
      label: "Bloodwork: pre-cycle, week 6, and 4 weeks post-PCT",
      urgency: "required",
      reason: "Total + Free Testosterone, LH, FSH, Estradiol, ALT, AST, Lipids, CBC. The only real safety net for any suppressive compound.",
    });
  }

  if (pattern.slots.some((s) => s.mechanism === "hepatic_support")) {
    support.push({
      label: "TUDCA 500mg + NAC 600mg daily throughout cycle",
      urgency: "required",
      reason: "Mandatory hepatic support for compounds with liver impact. Continue 2 weeks past cycle end.",
    });
  }

  if (pattern.intensity === "aggressive" && !ids.has("tadalafil")) {
    support.push({
      label: "Tadalafil 5mg daily (cardiovascular support)",
      urgency: "recommended",
      reason: "Underrated cycle support — cardiovascular protection, BP management, sexual function. Zero downside at this dose.",
    });
  }

  return support;
}

// ============================================================
// PCT GENERATION
// ============================================================

function generatePCT(compounds) {
  const categories = new Set(compounds.map((c) => c.category));
  if (!categories.has("SARM")) return null;

  const hasStrongSARM = compounds.some((c) =>
    ["yk11", "rad140", "lgd4033", "lgd3303", "rad150", "s23"].includes(c.id)
  );

  return {
    duration: hasStrongSARM ? "4–6 weeks" : "4 weeks",
    primary: hasStrongSARM
      ? "Tamoxifen 20mg/day + Enclomiphene 12.5mg/day"
      : "Tamoxifen 20mg/day OR Enclomiphene 12.5mg/day",
    note: hasStrongSARM
      ? "Dual SERM protocol given the suppression level of this cycle. Continue MK-677 through PCT if present — non-suppressive."
      : "Single SERM protocol sufficient for mild SARM cycles. Continue non-suppressive compounds through PCT.",
  };
}

// ============================================================
// RISK LABELING
// ============================================================

function classifyRisk(compounds, intensity) {
  // E2 — the opt-in maximal tier carries HIGH (or HIGH/UNKNOWN) risk.
  if (intensity === "maximal") {
    const hasUnknown = compounds.some((c) => c.riskTier === "unknown");
    return { label: hasUnknown ? "High · Unknown" : "High", color: "#ef4444" };
  }
  if (intensity === "aggressive") return { label: "Moderate–High", color: "#f59e0b" };
  if (intensity === "moderate") {
    if (compounds.some((c) => c.category === "SARM")) return { label: "Moderate", color: "#fbbf24" };
    return { label: "Low–Moderate", color: "#a3e635" };
  }
  return { label: "Low", color: ACCENT };
}

// ============================================================
// AXIS SUMMARY
// ============================================================

function summarizeAxes(compounds) {
  const labels = new Set();
  compounds.forEach((c) => {
    if (!c) return;
    if (c.category === "SARM") labels.add("AR");
    if (c.category === "Growth Hormone") labels.add("GH");
    if (c.category === "Recovery") labels.add("REPAIR");
    if (c.category === "Anti-Aging") labels.add("ECM");
    if (c.category === "Weight Loss") labels.add("METAB");
    if (c.category === "Fat Loss") labels.add("FAT-LOSS");
    if (c.category === "Cycle Support") labels.add("CV");
    if (c.category === "Performance") labels.add("CNS");
    if (c.category === "Nootropic") labels.add("CNS");
    if (c.category === "Metabolic") labels.add("METAB");
  });
  return Array.from(labels).join(" + ");
}

// ============================================================
// PATTERN BUILDER
// ============================================================

function buildPattern(pattern, profile, catalog, allowHighRisk = false) {
  const selected = [];

  for (const slot of pattern.slots) {
    const compound = selectCompoundForSlot(slot, profile, catalog, selected, allowHighRisk);
    if (!compound) {
      if (slot.required) return null; // required slot unfilled → pattern not buildable
      continue;
    }
    if (compound.isSupportFlag) continue;
    selected.push({ ...compound, role: slot.role });
  }

  if (selected.length === 0) return null;

  const support = generateSupportLayer(selected, pattern);
  const pct = generatePCT(selected);
  const risk = classifyRisk(selected, pattern.intensity);
  const axes = summarizeAxes(selected);

  return {
    id: pattern.id,
    name: pattern.name,
    approach: pattern.approach,
    intensity: pattern.intensity,
    compounds: selected,
    support,
    pct,
    axes,
    riskLabel: risk.label,
    riskColor: risk.color,
    designNote: pattern.designTemplate(selected, profile),
    phase: pattern.phase,
  };
}

// ============================================================
// MAIN ENTRY POINT
// Emits an ordered risk ladder: the first buildable pattern per tier.
// ============================================================

// E2 — "maximal" is the opt-in-only high-risk / larger-stack tier, appended after
// aggressive when the user enables it.
const INTENSITY_ORDER = ["conservative", "moderate", "aggressive", "maximal"];

export function generateStacks(profile, catalog, opts = {}) {
  const allowHighRisk = !!opts.allowHighRisk;
  const phase = detectPhase(profile);
  const patterns = PATTERNS[phase] || PATTERNS.recomp;

  const chosen = {}; // intensity -> built stack (first buildable wins)

  for (const pattern of patterns) {
    // E2 — patterns flagged requiresOptIn (the maximal tier) only build when the
    // user has explicitly enabled high-risk generation.
    if (pattern.requiresOptIn && !allowHighRisk) continue;
    if (chosen[pattern.intensity]) continue; // tier already filled
    const built = buildPattern({ ...pattern, phase }, profile, catalog, allowHighRisk);
    if (built) chosen[pattern.intensity] = built;
  }

  // Fallback safety net: if not a single tier built (extreme profile),
  // force the most universally buildable conservative recovery stack so
  // the user is never shown an empty generator.
  if (Object.keys(chosen).length === 0) {
    const safety = buildPattern(
      { ...PATTERNS.recovery[0], phase: "recovery" },
      profile,
      catalog,
      allowHighRisk
    );
    if (safety) chosen.conservative = safety;
  }

  return INTENSITY_ORDER.filter((i) => chosen[i]).map((i) => chosen[i]);
}

export { detectPhase };
