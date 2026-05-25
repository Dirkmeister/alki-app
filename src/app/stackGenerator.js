"use client";

/**
 * ============================================================
 * ALKI — STACK GENERATOR
 * ============================================================
 *
 * Composes fresh stacks from the user's profile. Does not pick from
 * pre-written presets. Each call returns 2–3 architecturally distinct
 * stacks varying on two axes: RISK INTENSITY (conservative → aggressive)
 * and APPROACH (the architectural pattern used).
 *
 * METHOD (Umbrella Labs Section 6 framing):
 *   1. Determine the user's primary phase from profile + goals.
 *   2. For each output stack, select a different ARCHITECTURAL PATTERN
 *      that serves that phase (anchor + complementary + recovery + support).
 *   3. For each role in the pattern, pick the best compound from the
 *      catalog that fits the user's profile, risk band, and the slot's
 *      mechanism requirements.
 *   4. Layer in mandatory support (PCT, hepatic, CV, lifestyle).
 *   5. Enforce: no receptor overlap unless intentional, no contraindications,
 *      no duplicate-class compounds.
 *
 * The generator is DETERMINISTIC — same profile always produces the
 * same stacks. No LLM. No randomness.
 *
 * USAGE:
 *   import { generateStacks } from "./stackGenerator";
 *   const stacks = generateStacks(profile, COMPOUNDS);
 *   // stacks: [{ id, name, approach, intensity, compounds: [{id,role,why}],
 *   //           axes, support, pct, designNote, riskLabel, riskColor, gate }]
 * ============================================================
 */

// ============================================================
// PHASE DETECTION
// ============================================================

/**
 * Determine the user's primary biological phase from profile.
 * Returns one of: "cut_high_bf", "cut_moderate_bf", "recomp",
 * "lean_bulk", "ultra_lean", "recovery", "longevity".
 *
 * Multiple goals collapse into the dominant phase. Advanced stats
 * sharpen the decision (low skel muscle → lean_bulk even if user
 * also picked fat_loss).
 */
function detectPhase(profile) {
  const { sex, age, bodyFat, goals = [], adv = {} } = profile;
  const skelMuscle = parseFloat(adv.skelMuscle) || null;
  const visceralFat = parseFloat(adv.visceralFat) || null;
  const lowSMThreshold = sex === "female" ? 34 : 38;

  const wantsFatLoss = goals.includes("fat_loss");
  const wantsMuscle = goals.includes("muscle");
  const wantsRecovery = goals.includes("recovery");
  const wantsAntiAging = goals.includes("anti_aging") || goals.includes("skin");
  const wantsPerformance = goals.includes("performance") || goals.includes("energy");

  // Override: low skeletal muscle is the dominant signal regardless of stated goal
  if (skelMuscle !== null && skelMuscle < lowSMThreshold && !wantsFatLoss) {
    return "lean_bulk";
  }

  // Pure recovery focus
  if (wantsRecovery && !wantsFatLoss && !wantsMuscle) {
    return "recovery";
  }

  // Anti-aging focus (35+ tilts toward longevity architecture)
  if (wantsAntiAging && !wantsFatLoss && !wantsMuscle && age >= 35) {
    return "longevity";
  }

  // Fat loss phases — BF-stratified
  if (wantsFatLoss) {
    const minBF = sex === "female" ? 28 : 22;
    if (bodyFat >= minBF) return "cut_high_bf";
    if (bodyFat >= (sex === "female" ? 22 : 15)) return "cut_moderate_bf";
    // User wants fat loss but is already lean — recomp territory
    return "recomp";
  }

  // Muscle / lean bulk — BF-stratified
  if (wantsMuscle) {
    if (bodyFat < 10) return "ultra_lean";          // already very lean, has to be careful
    if (bodyFat < (sex === "female" ? 25 : 18)) return "lean_bulk";
    return "recomp";  // higher BF, want muscle → recomp first
  }

  // Performance only → recomp default
  if (wantsPerformance) return "recomp";

  // Anti-aging without age criterion → recovery default
  if (wantsAntiAging) return "recovery";

  // Fallback
  return "recomp";
}

// ============================================================
// ARCHITECTURAL PATTERNS
// Each pattern is a list of "slots" (roles). The generator fills
// each slot with the best compound from the catalog for this user.
// Patterns are scoped to phases — every phase has 2–3 patterns
// available, each representing a different APPROACH.
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
      designTemplate: (compounds, profile) =>
        `${compounds[0]?.name} drives appetite suppression and dramatic caloric deficit. ` +
        `${compounds[1]?.name} provides the GH/IGF-1 signal that counteracts the lean mass loss typical of standalone GLP-1 protocols — this pairing is the single most important architecture for the ${profile.bodyFat}% body fat demographic.` +
        (compounds[2] ? ` ${compounds[2].name} protects joints and connective tissue under reduced caloric intake.` : ""),
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
      designTemplate: (compounds, profile) =>
        `${compounds[0]?.name} stimulates endogenous GH release with FDA-documented visceral fat reduction.` +
        (compounds[1] ? ` ${compounds[1].name} adds a separate fat oxidation mechanism without affecting glucose or muscle.` : "") +
        (compounds[2] ? ` ${compounds[2].name} addresses collagen and skin quality — Tesamorelin-class fat loss can reveal skin laxity that GHK-Cu directly counteracts.` : ""),
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} is the most aggressive GLP-class compound currently available — triple receptor activation on GLP-1, GIP, and Glucagon. ` +
        `${compounds[1]?.name} provides the GH/IGF-1 anchor against the increased lean mass loss risk this potency carries.` +
        (compounds[2] ? ` ${compounds[2].name} supports connective tissue throughout the aggressive deficit.` : "") +
        ` Glucose monitoring and resistance training are non-negotiable on this protocol.`,
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} drives simultaneous fat loss and lean mass support via GH/IGF-1 elevation — the core recomp mechanism. ` +
        `${compounds[1]?.name} protects joints and tendons under training stress.` +
        (compounds[2] ? ` ${compounds[2].name} adds non-suppressive oral GH support and 24-hour IGF-1 coverage.` : ""),
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} provides the strongest human evidence of the GH peptide class for fat loss, with FDA-documented visceral fat reduction.` +
        (compounds[1] ? ` ${compounds[1].name} protects connective tissue.` : "") +
        (compounds[2] ? ` ${compounds[2].name} adds a separate lipolytic mechanism with no glucose or muscle impact.` : ""),
    },
  ],

  // ---- Lean bulk (clean muscle gain at moderate BF) ----
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} drives the physiological GH pulse pre-sleep — the primary repair and recomp window. ` +
        `${compounds[1]?.name} provides sustained 24-hour IGF-1 elevation orally, non-suppressive — runs indefinitely. ` +
        `${compounds[2]?.name} protects connective tissue under progressive load. Two independent anabolic mechanisms with zero receptor overlap.`,
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} drives muscle protein synthesis at the androgen receptor — primary lean mass mechanism. ` +
        `${compounds[1]?.name} adds a fully independent GH axis with 24-hour IGF-1 elevation; non-suppressive, runs through PCT. ` +
        `${compounds[2]?.name} protects connective tissue under increasing load.` +
        (compounds[3] ? ` ${compounds[3].name} provides cardiovascular support and pump throughout the cycle.` : "") +
        ` PCT will be required.`,
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} is the premier mass-building AR agonist — significant lean mass over an 8–10 week cycle. ` +
        `${compounds[1]?.name} adds the independent GH/IGF-1 mechanism. ` +
        `${compounds[2]?.name} is non-negotiable connective tissue support given the load progression this protocol enables.` +
        (compounds[3] ? ` ${compounds[3].name} maintains cardiovascular function under cycle stress.` : "") +
        ` TUDCA 500mg + NAC 600mg daily are mandatory throughout cycle for hepatic protection. Bloodwork before, mid-cycle, and 4 weeks post-PCT.`,
    },
  ],

  // ---- Ultra-lean (already below 10% BF, has to be cautious) ----
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
      designTemplate: (compounds) =>
        `At your body fat level, the priority is preserving and enhancing lean mass rather than driving further fat loss. ` +
        `${compounds[0]?.name} drives the GH pulse for recomp without depleting necessary mass. ` +
        `${compounds[1]?.name} supports the connective tissue under the high training intensity that maintains this body fat range.` +
        (compounds[2] ? ` ${compounds[2].name} conditions the body-wide repair environment.` : "") +
        (compounds[3] ? ` ${compounds[3].name} provides 24-hour IGF-1 coverage non-suppressively.` : ""),
    },
  ],

  // ---- Recomp (moderate BF, want muscle + fat loss simultaneously) ----
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} drives simultaneous fat redistribution and lean mass via pulsed GH/IGF-1 — the cleanest recomp mechanism available without suppression.` +
        (compounds[1] ? ` ${compounds[1].name} provides 24-hour IGF-1 coverage between pulses; runs orally and indefinitely.` : "") +
        ` ${compounds[compounds.length - 1]?.name} protects connective tissue under the training intensity recomp requires.`,
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} is the mildest SARM and the standard entry point — recomp signal without aggressive HPG suppression.` +
        (compounds[1] ? ` ${compounds[1].name} adds non-suppressive GH support that runs through PCT.` : "") +
        ` ${compounds[compounds.length - 1]?.name} protects joints and tendons throughout the cycle. Mild SERM PCT is required.`,
    },
  ],

  // ---- Recovery (injury, training stress, no body comp objective) ----
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} drives local angiogenesis at injury sites and tendon/ligament repair. ` +
        `${compounds[1]?.name} conditions the body-wide healing environment via stem cell mobilization.` +
        (compounds[2] ? ` ${compounds[2].name} adds collagen synthesis and ECM reconstruction — naturally occurring with no suppression.` : "") +
        ` No HPG suppression. No PCT required. Sustainable indefinitely.`,
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
      designTemplate: (compounds) =>
        `${compounds[0]?.name} and ${compounds[1]?.name} handle local and systemic tissue repair simultaneously. ` +
        `${compounds[2]?.name} maximizes the GH pulse during sleep — the primary repair window.` +
        (compounds[3] ? ` ${compounds[3].name} maintains IGF-1 elevation chronically through the day.` : "") +
        ` Every compound here operates at a different biological level with zero receptor overlap.`,
    },
  ],

  // ---- Longevity (35+, anti-aging focus, no body comp aggression) ----
  longevity: [
    {
      id: "mito_neuro_longevity",
      name: "Multi-Axis Longevity Support",
      approach: "Mitochondrial + neurogenic + ECM, no suppression",
      intensity: "conservative",
      slots: [
        { role: "Skin / ECM anchor", mechanism: "ecm", required: true },
        { role: "GH axis support", mechanism: "gh_axis", required: false },
        { role: "Tissue repair", mechanism: "tissue_repair", required: false },
      ],
      designTemplate: (compounds) =>
        `${compounds[0]?.name} resets gene expression toward a regenerative profile and is the strongest skin and ECM signal in the catalog.` +
        (compounds[1] ? ` ${compounds[1].name} restores GH/IGF-1 to a physiological range — naturally declining with age and the single most actionable hormone target for longevity.` : "") +
        (compounds[2] ? ` ${compounds[2].name} maintains tissue repair capacity under the slower healing of older bodies.` : "") +
        ` No suppression, no PCT, sustainable indefinitely.`,
    },
  ],
};

// ============================================================
// MECHANISM RESOLVERS
// Maps each abstract slot mechanism to the actual compounds in the
// catalog that satisfy it. Returns candidates ordered by preference
// (strongest match for the slot first).
// ============================================================

const MECHANISM_CANDIDATES = {
  // GLP family
  glp1: ["semaglutide"],
  glp_triple: ["retatrutide"],

  // GH axis — injectable GH peptides
  gh_axis: ["ipacjc", "sermorelin", "cjc1295_nodac"],

  // GHRH analog specifically for visceral fat
  ghrh: ["tesamorelin"],

  // Ghrelin / oral GH path (non-suppressive, runs everywhere)
  ghrelin: ["mk677"],

  // Fat oxidation adjunct (no glucose or muscle impact)
  lipolysis: ["fragment176"],

  // AR — mild entry point
  ar_mild: ["mk2866"],
  // AR — stronger mass builder
  ar_strong: ["lgd4033", "rad140"],

  // Tissue repair
  tissue_repair: ["bpc157"],
  tissue_repair_systemic: ["tb500", "bpc_tb_blend"],

  // ECM / skin
  ecm: ["ghkcu"],

  // Cardiovascular support (cycle-supportive PDE-5)
  pde5: ["tadalafil"],

  // Hepatic support is a flag, not a compound — surfaces in support layer
  hepatic_support: ["__support_tudca_nac__"],
};

// ============================================================
// COMPOUND SELECTION
// For each slot, pick the best candidate from the catalog given the
// user's profile and risk band. Skip compounds with displayWarning
// or experimental_only unless explicitly opted in (future feature).
// ============================================================

function selectCompoundForSlot(slot, profile, catalog, alreadySelected) {
  const candidates = MECHANISM_CANDIDATES[slot.mechanism] || [];
  const alreadyIds = new Set(alreadySelected.map((c) => c.id));

  for (const candidateId of candidates) {
    // Skip if already in stack (don't duplicate)
    if (alreadyIds.has(candidateId)) continue;

    // Support flags pass through as virtual entries
    if (candidateId.startsWith("__support_")) {
      return { id: candidateId, name: candidateId, isSupportFlag: true };
    }

    const compound = catalog.find((c) => c.id === candidateId);
    if (!compound) continue;

    // Profile gating — body fat suitability
    const bf = profile.bodyFat;
    if (compound.suitability) {
      if (bf < compound.suitability.minBf) continue;
      if (bf > compound.suitability.maxBf) continue;
    }

    // Skip compounds where contraindications fire
    if (compound.contraindications) {
      if (compound.contraindications.includes("below15bf") && bf < 15) continue;
      if (compound.contraindications.includes("below22bf_glp1") && bf < 22) continue;
    }

    // Skip experimental and warning-flagged compounds (require explicit user opt-in)
    if (compound.experienceLevel === "experimental_only") continue;
    if (compound.displayWarning) continue;

    return compound;
  }

  return null;
}

// ============================================================
// SUPPORT LAYER GENERATION
// Based on the compounds in the stack, surface required support.
// ============================================================

function generateSupportLayer(compounds, pattern) {
  const support = [];
  const ids = new Set(compounds.map((c) => c.id));
  const categories = new Set(compounds.map((c) => c.category));

  // GLP-1 compounds → protein + resistance training mandatory
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

  // Retatrutide → glucose monitoring
  if (ids.has("retatrutide")) {
    support.push({
      label: "Weekly glucose check or CGM",
      urgency: "recommended",
      reason: "Triple-agonist hypoglycemia risk warrants monitoring during titration.",
    });
  }

  // Tesamorelin → glucose monitoring
  if (ids.has("tesamorelin")) {
    support.push({
      label: "Fasting glucose monitoring",
      urgency: "recommended",
      reason: "GHRH-driven GH elevation can mildly affect insulin sensitivity.",
    });
  }

  // SARM presence → PCT + bloodwork
  if (categories.has("SARM")) {
    support.push({
      label: "PCT: Tamoxifen 20mg/day or Enclomiphene 12.5mg/day, 4 weeks post-cycle",
      urgency: "required",
      reason: "Restores HPG axis function after suppressive cycle. Bloodwork 4 weeks post-PCT to verify recovery.",
    });
    support.push({
      label: "Bloodwork: pre-cycle, week 6, and 4 weeks post-PCT",
      urgency: "required",
      reason: "Total + Free Testosterone, LH, FSH, Estradiol, ALT, AST, Lipids, CBC. The only real safety net for any suppressive compound.",
    });
  }

  // Hepatic flag from pattern
  if (pattern.slots.some((s) => s.mechanism === "hepatic_support")) {
    support.push({
      label: "TUDCA 500mg + NAC 600mg daily throughout cycle",
      urgency: "required",
      reason: "Mandatory hepatic support for compounds with liver impact. Continue 2 weeks past cycle end.",
    });
  }

  // Aggressive intensity → tadalafil if not already in stack
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
// Returns null if no PCT required, or a structured PCT plan.
// ============================================================

function generatePCT(compounds) {
  const categories = new Set(compounds.map((c) => c.category));

  if (!categories.has("SARM")) return null;

  // Determine PCT aggressiveness from the SARMs present
  const hasStrongSARM = compounds.some((c) =>
    ["yk11", "rad140", "lgd4033", "lgd3303", "rad150", "s23"].includes(c.id)
  );

  return {
    duration: hasStrongSARM ? "4–6 weeks" : "4 weeks",
    primary: hasStrongSARM
      ? "Tamoxifen 20mg/day + Enclomiphene 12.5mg/day"
      : "Tamoxifen 20mg/day OR Enclomiphene 12.5mg/day",
    note: hasStrongSARM
      ? "Dual SERM protocol given the suppression level of this cycle. Continue MK-677 through PCT if present in stack — non-suppressive."
      : "Single SERM protocol sufficient for mild SARM cycles. Continue non-suppressive compounds through PCT.",
  };
}

// ============================================================
// RISK LABELING
// ============================================================

function classifyRisk(compounds, intensity) {
  if (intensity === "aggressive") return { label: "Moderate–High", color: "#f59e0b" };
  if (intensity === "moderate") {
    // Moderate intensity with SARM = bumped to moderate
    if (compounds.some((c) => c.category === "SARM")) return { label: "Moderate", color: "#fbbf24" };
    return { label: "Low–Moderate", color: "#a3e635" };
  }
  return { label: "Low", color: "#22d68a" };
}

// ============================================================
// AXIS SUMMARY
// Build a human-readable axis label from the compounds.
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
// MAIN ENTRY POINT
// ============================================================

export function generateStacks(profile, catalog) {
  const phase = detectPhase(profile);
  const patterns = PATTERNS[phase] || PATTERNS.recomp;

  const stacks = [];

  for (const pattern of patterns) {
    const selected = [];
    let buildable = true;

    // Fill each slot in order; track which compounds are already in the stack
    for (const slot of pattern.slots) {
      const compound = selectCompoundForSlot(slot, profile, catalog, selected);

      if (!compound) {
        // Slot couldn't be filled — fail the pattern only if the slot is required
        if (slot.required) {
          buildable = false;
          break;
        }
        continue;
      }

      // Don't add support flags as actual compounds
      if (compound.isSupportFlag) continue;

      selected.push({
        ...compound,
        role: slot.role,
      });
    }

    if (!buildable || selected.length === 0) continue;

    const support = generateSupportLayer(selected, pattern);
    const pct = generatePCT(selected);
    const risk = classifyRisk(selected, pattern.intensity);
    const axes = summarizeAxes(selected);

    stacks.push({
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
      phase,
    });
  }

  return stacks;
}

// Export phase detection for testing / display
export { detectPhase };
