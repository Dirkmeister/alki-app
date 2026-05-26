/**
 * ALKI — EXPANDED COMPOUND DATABASE
 * ────────────────────────────────────────────────────────────
 * 63 additional compounds added to the original 8-compound MVP set.
 *
 * MODULARITY:
 *   This file is fully isolated. To remove all expanded compounds:
 *     1. Delete this file
 *     2. Remove the 2-line addition in `data/compounds.js`
 *        (one import, one spread inside the COMPOUNDS array)
 *   The original 8 compounds remain completely untouched.
 *
 * SCHEMA:
 *   All compounds use the same flat schema as the original 8 so they
 *   work with existing CompoundCard, recommendations.js, and avatar.js
 *   without code changes elsewhere.
 *
 *   Core fields (consumed by current UI):
 *     id, name, category, tagline, mechanism,
 *     keyBenefits, dosing, cycle, route, pros, cons,
 *     effects: { bf, muscle, skin, recovery },
 *     suitability: { minBf, maxBf, goals },
 *     contraindications, visualChange
 *
 *   Extended fields (forward-compatible, not yet consumed by UI):
 *     riskTier:       "very_low" | "low" | "low_mod" | "moderate"
 *                   | "mod_high" | "high" | "unknown"
 *     experienceLevel: "beginner" | "intermediate" | "advanced"
 *                    | "experimental_only"
 *     displayWarning:  Optional string for compounds requiring
 *                      a prominent warning banner.
 *
 * RISK GATING (for future advanced-mode UI):
 *   Default recommendations:   very_low | low | low_mod
 *   Advanced (user opt-in):    moderate | mod_high
 *   Educational reference:     high | unknown | has displayWarning
 *
 * GOAL MAPPING:
 *   All `goals` values use the existing GOAL IDs from data/goals.js:
 *     fat_loss, muscle, recovery, anti_aging, skin, energy, performance
 *
 * CATEGORIES:
 *   Existing categories preserved: Recovery, Growth Hormone, Fat Loss,
 *   Weight Loss, Anti-Aging, Performance.
 *   New categories introduced: SARM, Nootropic, Cycle Support,
 *   Hair Support, Metabolic, Hormonal.
 *   New categories will render with default gray in CompoundCard until
 *   color mappings are added — purely cosmetic, not functional.
 *
 * FOR RESEARCH AND EDUCATIONAL PURPOSES ONLY. NOT MEDICAL ADVICE.
 * ────────────────────────────────────────────────────────────
 */

export const EXPANDED_COMPOUNDS = [

  // ══════════════════════════════════════════════════════════
  // GROWTH HORMONE AXIS — additional peptides
  // ══════════════════════════════════════════════════════════

  {
    id: "mk677",
    name: "MK-677",
    category: "Growth Hormone",
    tagline: "The Oral GH Path",
    mechanism: "Orally active ghrelin receptor agonist that drives pulsatile GH and sustained 24-hour IGF-1 elevation without affecting the HPG axis. The only practical oral entry into the GH axis.",
    keyBenefits: ["Sustained IGF-1 elevation", "Deep sleep improvement", "Joint and connective tissue support", "Recomposition without injections"],
    dosing: "25 mg/day oral",
    cycle: "12–24 weeks; non-suppressive, runs through PCT",
    route: "Oral capsule or liquid, evening preferred",
    pros: ["Non-suppressive — runs through cycles, PCT, and bridges", "Oral — no injections", "Significant sleep architecture improvement", "Joint and tendon benefits via IGF-1"],
    cons: ["Significant appetite increase (bulk-friendly, cut-unfriendly)", "Water retention in first 2 weeks", "Mild fasting glucose elevation", "Effects take 4–8 weeks to fully develop"],
    effects: { bf: -1.5, muscle: 3, skin: 1.2, recovery: 3 },
    suitability: { minBf: 8, maxBf: 35, goals: ["muscle", "recovery", "anti_aging", "fat_loss"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "sermorelin",
    name: "Sermorelin",
    category: "Growth Hormone",
    tagline: "The Physiological GH Pulse",
    mechanism: "GHRH analog (1-29) that triggers physiological pulsatile GH release via the natural hypothalamic-pituitary pathway. Was previously FDA-approved as Geref.",
    keyBenefits: ["Physiological GH release", "Strong sleep architecture improvement", "Anti-aging GH restoration", "Long clinical track record"],
    dosing: "300 mcg/day SubQ",
    cycle: "12 weeks to 6+ months; optional 4-week breaks",
    route: "Subcutaneous injection, pre-bed on empty stomach",
    pros: ["Most clinical data of any GH peptide", "Preserves pituitary feedback — no desensitization", "Strong safety profile across long-term use", "Sleep architecture improvement well-documented"],
    cons: ["Short half-life requires daily injection", "Effects modest compared to direct HGH", "Diminished response in users over 50 or high BF", "Requires subcutaneous injection"],
    effects: { bf: -1, muscle: 1.5, skin: 1.5, recovery: 2.5 },
    suitability: { minBf: 8, maxBf: 35, goals: ["anti_aging", "recovery", "muscle"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "igf1lr3",
    name: "IGF-1 LR3",
    category: "Growth Hormone",
    tagline: "Direct Anabolic Signal",
    mechanism: "Modified IGF-1 analog (~3x potency, 20–30hr half-life) that bypasses the GH axis entirely for direct IGF-1 receptor activation. Theoretical hyperplasia potential.",
    keyBenefits: ["Most potent IGF-1 signal outside HGH", "Bypasses GH axis entirely", "Localized muscle development at injection sites", "Theoretical hyperplasia (new cell formation)"],
    dosing: "30 mcg/day SubQ",
    cycle: "4–6 weeks on, 4 weeks off (mandatory receptor breaks)",
    route: "Subcutaneous injection, post-workout or pre-bed",
    pros: ["Most potent anabolic IGF signal outside HGH", "Works in users with poor pituitary response", "Long half-life — single daily dose", "Local muscle effects at injection sites"],
    cons: ["Hypoglycemia risk — requires food management", "Receptor downregulation requires strict cycling", "Theoretical cancer concern (strongest of GH-axis class)", "Not appropriate as first peptide cycle"],
    effects: { bf: -1, muscle: 5, skin: 0.8, recovery: 1 },
    suitability: { minBf: 8, maxBf: 25, goals: ["muscle", "recovery"] },
    contraindications: [],
    visualChange: true,
    riskTier: "moderate",
    experienceLevel: "advanced"
  },

  {
    id: "fragment176",
    name: "HGH Fragment 176-191",
    category: "Fat Loss",
    tagline: "GH Without The Cost",
    mechanism: "Synthetic 16-aa fragment from the C-terminus of human GH. Retains lipolytic activity while removing anabolic and glucose-regulating effects.",
    keyBenefits: ["Fat loss without IGF-1 or glucose impact", "Localized fat reduction at injection sites", "No tolerance buildup", "Safer than full GH for glucose-sensitive users"],
    dosing: "300 mcg/day SubQ",
    cycle: "8–16 weeks continuous",
    route: "Subcutaneous injection, abdominal, AM fasted",
    pros: ["Fat loss without affecting IGF-1, blood sugar, or muscle", "Localized fat reduction at injection sites", "No tolerance buildup", "Compatible with virtually any other compound"],
    cons: ["Effects modest — not a magic bullet", "Less dramatic than Semaglutide or Tesamorelin", "Requires consistent injection schedule", "Limited human research data"],
    effects: { bf: -2.5, muscle: 0, skin: 0.2, recovery: 0 },
    suitability: { minBf: 12, maxBf: 30, goals: ["fat_loss"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "cjc1295_nodac",
    name: "CJC-1295 No DAC",
    category: "Growth Hormone",
    tagline: "Pulsatile GH Release",
    mechanism: "Modified GHRH analog without the drug affinity complex — sharp 30-minute pulses preserving natural GH rhythm. Pairs with a GHRP for amplified output.",
    keyBenefits: ["Physiological GH pulse pattern", "No pituitary desensitization", "Strong sleep architecture improvement", "Standard pairing base for Ipamorelin"],
    dosing: "100 mcg, 1–3x daily SubQ",
    cycle: "12 weeks to 6+ months",
    route: "Subcutaneous injection, pre-sleep highest value",
    pros: ["Physiological pulse pattern preserves feedback", "No pituitary desensitization with long-term use", "Strong sleep benefits", "Compatible with all peptides"],
    cons: ["Underwhelming solo — designed to stack with GHRP", "Short half-life requires consistent timing", "Effects modest compared to direct HGH", "Diminished response in older or high-BF users"],
    effects: { bf: -0.5, muscle: 1.5, skin: 1.2, recovery: 2 },
    suitability: { minBf: 8, maxBf: 35, goals: ["anti_aging", "recovery", "muscle"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low",
    experienceLevel: "intermediate"
  },

  {
    id: "cjc1295_dac",
    name: "CJC-1295 DAC",
    category: "Growth Hormone",
    tagline: "Sustained GH Elevation",
    mechanism: "GHRH analog with drug affinity complex extending half-life to ~8 days. Produces continuous GH/IGF-1 elevation rather than physiological pulses.",
    keyBenefits: ["Once-weekly dosing convenience", "Sustained GH/IGF-1 elevation", "Lean mass and recomp benefits", "No injection fatigue"],
    dosing: "1 mg/week SubQ",
    cycle: "8–12 weeks, 4-week break after 12 weeks",
    route: "Subcutaneous injection, weekly",
    pros: ["Once-weekly dosing convenience", "Sustained GH/IGF-1 elevation", "Lean mass and recomp benefits", "No daily injection requirement"],
    cons: ["Loses physiological pulse pattern", "Pituitary desensitization with extended use", "More water retention than no-DAC version", "Less effective for sleep architecture"],
    effects: { bf: -1, muscle: 2.5, skin: 1.2, recovery: 1.5 },
    suitability: { minBf: 8, maxBf: 35, goals: ["anti_aging", "recovery", "muscle"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  {
    id: "ipamorelin",
    name: "Ipamorelin",
    category: "Growth Hormone",
    tagline: "The Clean GHRP",
    mechanism: "Selective ghrelin receptor agonist that amplifies GH pulses without the cortisol or prolactin elevation of other GHRPs. The cleanest GHRP in the catalog.",
    keyBenefits: ["No cortisol or prolactin spike", "Standard pairing for GHRH analogs", "Significant sleep architecture improvement", "Excellent safety profile"],
    dosing: "200 mcg, 1–3x daily SubQ",
    cycle: "12 weeks to 6+ months",
    route: "Subcutaneous injection, pre-sleep highest value",
    pros: ["Cleanest GHRP — no cortisol or prolactin elevation", "Standard pairing partner for GHRH analogs", "Significant sleep improvement", "No tolerance at standard doses"],
    cons: ["Underwhelming solo — designed for stacking", "Multiple daily injections for full benefit", "Effects modest compared to direct HGH", "Mild appetite increase in some users"],
    effects: { bf: -0.8, muscle: 2, skin: 1, recovery: 2.5 },
    suitability: { minBf: 8, maxBf: 35, goals: ["anti_aging", "recovery", "muscle"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  // ══════════════════════════════════════════════════════════
  // RECOVERY — Combined Peptide Stack
  // ══════════════════════════════════════════════════════════

  {
    id: "bpc_tb_blend",
    name: "BPC-157 / TB-500 Blend",
    category: "Recovery",
    tagline: "The Gold Standard Recovery Stack",
    mechanism: "Pre-mixed combination — BPC-157 drives local angiogenesis and tissue repair; TB-500 mobilizes stem cells systemically. Two independent healing mechanisms in one vial.",
    keyBenefits: ["Local + systemic tissue repair", "Tendon and ligament rebuilding", "Gut healing (BPC-157 component)", "Universal stack support for any SARM cycle"],
    dosing: "500 mcg BPC-157 daily + 2 mg TB-500 2x/week",
    cycle: "6 weeks acute, indefinite chronic at reduced dose",
    route: "Subcutaneous injection near injury site when possible",
    pros: ["Two independent healing mechanisms — local plus systemic", "No HPG suppression, no PCT required", "Universal applicability across goals and stacks", "Strong anecdotal track record"],
    cons: ["No human clinical trial data for either component", "TB-500 is WADA-banned (tested athletes)", "Theoretical cancer concern (angiogenesis + stem cells)", "Cost higher than single-peptide protocols"],
    effects: { bf: 0, muscle: 0.5, skin: 1.5, recovery: 7 },
    suitability: { minBf: 0, maxBf: 100, goals: ["recovery", "performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low_mod",
    experienceLevel: "beginner"
  },

  // ══════════════════════════════════════════════════════════
  // SARMs — Androgen Receptor Modulators
  // ══════════════════════════════════════════════════════════

  {
    id: "mk2866",
    name: "MK-2866",
    category: "SARM",
    tagline: "The Mildest SARM",
    mechanism: "Partial androgen receptor agonist (~66% maximal activation) with strong tissue selectivity for muscle and bone. The most clinically studied SARM and the standard entry point.",
    keyBenefits: ["Mildest suppression of any SARM", "Body recomposition with strong dose efficiency", "Joint and tendon healing legacy", "Tolerated by females at reduced doses"],
    dosing: "20 mg/day oral",
    cycle: "8–12 weeks; mild SERM PCT required",
    route: "Oral, morning",
    pros: ["Most extensive human clinical data of any SARM", "Mildest suppression profile in the AR-active class", "Joint and tendon healing properties", "Effective recomposition without aggressive shutdown"],
    cons: ["Effects modest compared to RAD-140 or LGD-4033", "Still suppressive — PCT advised", "WADA-banned", "Mild lipid impact (HDL reduction)"],
    effects: { bf: -2, muscle: 6, skin: 0.3, recovery: 1 },
    suitability: { minBf: 8, maxBf: 22, goals: ["muscle", "recovery", "fat_loss"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "rad140",
    name: "RAD-140",
    category: "SARM",
    tagline: "Rapid Strength Onset",
    mechanism: "Full AR agonist with high tissue selectivity for muscle. The most popular SARM in informal use — produces rapid strength and lean mass within 2 weeks of starting.",
    keyBenefits: ["Fastest visible strength gains in SARM class", "Aggressive recomposition signal", "No estrogenic side effects", "Strong dose-response at 10–15mg"],
    dosing: "10 mg/day oral",
    cycle: "8–10 weeks; full SERM PCT required",
    route: "Oral, morning",
    pros: ["Fastest visible strength and lean mass onset", "Aggressive recomposition signal", "No estrogenic side effects", "Mild neuroprotective effects (preclinical)"],
    cons: ["High suppression — full PCT mandatory", "Mood flatness and libido decline mid-cycle", "Lipid impact (HDL reduction)", "Hair loss risk in susceptible users"],
    effects: { bf: -2.5, muscle: 9, skin: 0, recovery: 1 },
    suitability: { minBf: 8, maxBf: 20, goals: ["muscle", "performance"] },
    contraindications: [],
    visualChange: true,
    riskTier: "moderate",
    experienceLevel: "intermediate"
  },

  {
    id: "lgd4033",
    name: "LGD-4033",
    category: "SARM",
    tagline: "The Mass Builder",
    mechanism: "Full AR agonist with strong tissue selectivity. The premier mass-building SARM — produces 5–10 lbs of lean mass over 8 weeks in beginner users.",
    keyBenefits: ["Highest raw lean mass gain of any SARM", "Strong dose efficiency at 5mg", "Sustained nitrogen retention", "Bone density benefits"],
    dosing: "5 mg/day oral",
    cycle: "8–10 weeks; full SERM PCT required",
    route: "Oral, morning",
    pros: ["Highest raw lean mass gain of any SARM", "Strong dose efficiency — 5mg often sufficient", "Sustained anabolic nitrogen retention", "Bone density benefits"],
    cons: ["Suppression equal to or exceeding RAD-140", "Hepatotoxicity reports — TUDCA/NAC advised", "Water retention significant", "Libido decline mid-cycle pronounced"],
    effects: { bf: -1, muscle: 11, skin: 0, recovery: 0.5 },
    suitability: { minBf: 10, maxBf: 20, goals: ["muscle"] },
    contraindications: [],
    visualChange: true,
    riskTier: "moderate",
    experienceLevel: "intermediate"
  },

  {
    id: "yk11",
    name: "YK-11",
    category: "SARM",
    tagline: "Ceiling Removal",
    mechanism: "Dual mechanism: AR agonist plus myostatin inhibitor. Steroidal structure closer to a designer anabolic than a true SARM. Theoretically removes the natural muscle growth ceiling.",
    keyBenefits: ["Most aggressive muscle signal in SARM class", "Myostatin inhibition removes natural ceiling", "Visible strength gains within 2 weeks", "Dry, hard muscle quality"],
    dosing: "5 mg/day oral",
    cycle: "6 weeks max; aggressive SERM PCT required",
    route: "Oral, morning",
    pros: ["Most aggressive muscle gain signal in SARM class", "Myostatin inhibition mechanism", "Strength gains visible within 2 weeks", "Dry muscle quality — no aromatization"],
    cons: ["Steroidal — liver stress real and dose-dependent", "Near-complete HPG axis suppression", "Hair loss risk meaningful", "Mood and libido decline during cycle pronounced"],
    effects: { bf: -1, muscle: 12, skin: -0.5, recovery: -0.5 },
    suitability: { minBf: 8, maxBf: 18, goals: ["muscle"] },
    contraindications: ["below15bf"],
    visualChange: true,
    riskTier: "high",
    experienceLevel: "advanced",
    displayWarning: "Steroidal structure with significant liver stress and HPG suppression. TUDCA/NAC and full bloodwork are non-negotiable."
  },

  {
    id: "s23",
    name: "S-23",
    category: "SARM",
    tagline: "Hard, Dry, Suppressive",
    mechanism: "Full AR agonist originally researched as a male contraceptive due to near-complete HPG axis shutdown. Produces unusually hard, dry lean mass.",
    keyBenefits: ["Hardest, driest muscle quality in SARM class", "Strong fat-loss component", "No water retention", "Strong vascularity and conditioning"],
    dosing: "10 mg, 2x daily oral (split)",
    cycle: "6–8 weeks max; aggressive SERM PCT required",
    route: "Oral, AM and PM",
    pros: ["Hard, dry, dense muscle quality unique in SARM class", "Strong fat-loss component during cycle", "No water retention", "Strong vascularity aesthetic"],
    cons: ["Complete HPG axis suppression — was studied as contraceptive", "Testicular atrophy reliable and pronounced", "Recovery often slow — months to bloodwork-confirmed restoration", "Mood and libido shutdown severe"],
    effects: { bf: -3, muscle: 9, skin: 0, recovery: -1 },
    suitability: { minBf: 8, maxBf: 15, goals: ["muscle", "performance"] },
    contraindications: ["below15bf"],
    visualChange: true,
    riskTier: "high",
    experienceLevel: "advanced",
    displayWarning: "Near-complete HPG axis shutdown. Was researched as a male contraceptive. Fertility-conscious users should not consider this compound."
  },

  {
    id: "s4",
    name: "S-4",
    category: "SARM",
    tagline: "The Hardener",
    mechanism: "Moderate-potency AR agonist with affinity for retinal androgen receptors. Produces hard, dry muscle quality with a distinct vision side effect at higher doses.",
    keyBenefits: ["Hard, dry conditioning effect", "Excellent for cutting and recomposition", "Strength preservation in deficit", "Mild lipid impact compared to LGD-4033"],
    dosing: "50 mg/day (split into 2–3 doses)",
    cycle: "6–8 weeks with 5/2 protocol",
    route: "Oral, split throughout day",
    pros: ["Hard, dry conditioning effect", "Excellent for cutting and recomposition", "Strength preservation in caloric deficit", "Vision side effects fully reversible on cessation"],
    cons: ["Yellow vision tint at higher doses (reversible)", "Reduced night vision during cycle", "Short half-life requires split dosing", "WADA-banned"],
    effects: { bf: -3, muscle: 5, skin: 0, recovery: 0 },
    suitability: { minBf: 8, maxBf: 16, goals: ["muscle", "fat_loss"] },
    contraindications: ["below15bf"],
    visualChange: true,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  {
    id: "lgd3303",
    name: "LGD-3303",
    category: "SARM",
    tagline: "Aggressive Mass + Bone",
    mechanism: "More potent AR agonist than LGD-4033 with notable bone density effects. Originally researched for osteoporosis and muscle wasting.",
    keyBenefits: ["Stronger mass per mg than LGD-4033", "Notable bone density benefit", "Strong nitrogen retention", "Effective for plateau-breaking"],
    dosing: "10 mg/day (split AM/PM)",
    cycle: "6–8 weeks max; full SERM PCT required",
    route: "Oral, AM and PM",
    pros: ["Strong raw mass gain potential", "Notable bone density benefit", "Effective for stubborn plateaus from milder SARMs", "Strong nitrogen retention"],
    cons: ["More suppression than LGD-4033 without proportional muscle benefit", "Lipid impact pronounced", "Short half-life requires split dosing", "Limited human data"],
    effects: { bf: -1, muscle: 10, skin: 0, recovery: -0.5 },
    suitability: { minBf: 8, maxBf: 18, goals: ["muscle"] },
    contraindications: [],
    visualChange: true,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "rad150",
    name: "RAD-150",
    category: "SARM",
    tagline: "Esterified RAD-140",
    mechanism: "Benzoate ester modification of RAD-140 with extended half-life and reportedly stronger subjective effects, including mood elevation and aggression — closer to a traditional anabolic profile.",
    keyBenefits: ["Stronger anabolic signal than RAD-140", "Unique mood elevation in SARM class", "Long half-life — single daily dose", "Rapid strength gains"],
    dosing: "10 mg/day oral",
    cycle: "6–8 weeks max; full SERM PCT required",
    route: "Oral, morning",
    pros: ["Stronger anabolic signal than RAD-140", "Unique mood elevation profile", "Long half-life — single daily dose", "Strength gains rapid and pronounced"],
    cons: ["Minimal human research data", "Aggression and mood effects unpredictable", "Stronger suppression than RAD-140", "Liver stress meaningful"],
    effects: { bf: -2, muscle: 10, skin: 0, recovery: -0.5 },
    suitability: { minBf: 8, maxBf: 18, goals: ["muscle", "performance"] },
    contraindications: [],
    visualChange: true,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "gw501516",
    name: "GW-501516",
    category: "SARM",
    tagline: "Cardarine — Educational Reference Only",
    mechanism: "PPARδ agonist developed by GSK for metabolic syndrome. Produces dramatic endurance and fat oxidation effects. Development abandoned due to multi-organ cancer signal in animal studies.",
    keyBenefits: ["Dramatic endurance improvement", "Strong fat oxidation effect", "Lipid profile improvement", "Listed for educational reference"],
    dosing: "10 mg/day oral (if used at all)",
    cycle: "No protocol eliminates the cancer signal",
    route: "Oral, pre-workout",
    pros: ["Dramatic endurance improvement in animal studies", "Strong fat oxidation effect", "Lipid profile improvement (HDL up, LDL down)", "No HPG suppression"],
    cons: ["Carcinogenic across multiple organs in animal studies", "GSK abandoned development specifically due to cancer signal", "Cancer risk does not respond to cycling", "WADA-banned"],
    effects: { bf: -3, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 100, maxBf: 100, goals: [] },
    contraindications: [],
    visualChange: true,
    riskTier: "high",
    experienceLevel: "experimental_only",
    displayWarning: "CARCINOGENIC IN ANIMAL STUDIES. Development abandoned by GSK due to multi-organ cancer signal. Listed for educational reference only — Alki does not recommend use under any circumstances."
  },

  {
    id: "gw0742",
    name: "GW-0742",
    category: "SARM",
    tagline: "PPARδ Successor — Same Concerns",
    mechanism: "More selective PPARδ agonist than Cardarine, developed by GSK in the same research program. Same fundamental mechanism, same fundamental class-level cancer concern.",
    keyBenefits: ["Higher PPARδ selectivity than Cardarine", "Strong endurance effects in preclinical models", "Lipid profile improvements", "Listed for educational reference"],
    dosing: "10 mg/day oral (if used at all)",
    cycle: "Same mechanistic concerns as Cardarine",
    route: "Oral, pre-workout",
    pros: ["Higher PPARδ selectivity than GW-501516", "Strong endurance effects in preclinical models", "Lipid profile improvements", "No HPG suppression"],
    cons: ["Same mechanistic carcinogenicity concerns as Cardarine", "PPARδ class abandoned by GSK across the board", "No human safety data at endurance doses", "WADA-banned"],
    effects: { bf: -3, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 100, maxBf: 100, goals: [] },
    contraindications: [],
    visualChange: true,
    riskTier: "high",
    experienceLevel: "experimental_only",
    displayWarning: "Belongs to PPARδ agonist class with established carcinogenicity signal. Listed for educational reference only — Alki does not recommend use."
  },

  // ══════════════════════════════════════════════════════════
  // METABOLIC — Mitochondrial, Rev-Erb, ERR, AMPK
  // ══════════════════════════════════════════════════════════

  {
    id: "motsc",
    name: "MOTS-C",
    category: "Metabolic",
    tagline: "Mitochondrial Signal",
    mechanism: "16-aa mitochondrially-encoded peptide discovered in 2015. Activates AMPK to regulate insulin sensitivity, glucose homeostasis, and metabolic adaptation.",
    keyBenefits: ["Novel mitochondrially-encoded peptide", "Insulin sensitivity restoration", "Energy improvement", "Compatible with virtually any compound"],
    dosing: "10 mg, 3x weekly SubQ",
    cycle: "8–12 weeks; optional 4-week breaks",
    route: "Subcutaneous injection, AM",
    pros: ["Genuinely novel mechanism", "Insulin sensitivity restoration well-supported preclinically", "Energy improvement reported by most users", "No suppression, no liver impact"],
    cons: ["Very limited human research", "Effects subtle without baseline metabolic dysfunction", "Cost higher than older peptides", "Long-term effects not characterized"],
    effects: { bf: -1.5, muscle: 0, skin: 0.3, recovery: 1 },
    suitability: { minBf: 12, maxBf: 40, goals: ["fat_loss", "energy", "anti_aging"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  {
    id: "sr9009",
    name: "SR-9009",
    category: "Metabolic",
    tagline: "Stenabolic — Limited By Bioavailability",
    mechanism: "Rev-Erbα agonist modulating circadian metabolic regulation. Activates mitochondrial biogenesis and fat oxidation pathways — but oral bioavailability is poor.",
    keyBenefits: ["Genuinely novel circadian mechanism", "Mitochondrial biogenesis pathway", "Endurance improvements in animal models", "No HPG suppression"],
    dosing: "30 mg, 3–4x daily oral",
    cycle: "6–8 weeks",
    route: "Oral, frequent dosing required",
    pros: ["Genuinely novel circadian mechanism", "No HPG suppression, no liver toxicity", "Endurance improvements documented in animals", "No cancer concerns at PPARδ class level"],
    cons: ["Oral bioavailability poor — most informal use is largely placebo", "Sleep disruption likely (circadian mechanism)", "Short half-life requires multiple daily doses", "WADA-banned"],
    effects: { bf: -2, muscle: 0, skin: 0, recovery: -1 },
    suitability: { minBf: 12, maxBf: 30, goals: ["fat_loss", "performance"] },
    contraindications: [],
    visualChange: true,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "sr9011",
    name: "SR-9011",
    category: "Metabolic",
    tagline: "Improved-Bioavailability Stenabolic",
    mechanism: "Close analog of SR-9009 with structural modifications for better oral bioavailability. Same Rev-Erbα mechanism with more pronounced effects from oral dosing.",
    keyBenefits: ["Better oral bioavailability than SR-9009", "Circadian-metabolic mechanism", "Endurance and fat oxidation", "No HPG suppression"],
    dosing: "20 mg, 2–3x daily oral",
    cycle: "6–8 weeks",
    route: "Oral, every 6–8 hours",
    pros: ["Better oral bioavailability than SR-9009", "Genuine circadian-metabolic mechanism", "Endurance and fat oxidation effects", "No HPG suppression"],
    cons: ["Sleep disruption more pronounced than SR-9009", "Still requires multiple daily doses", "Limited human safety data", "WADA-banned"],
    effects: { bf: -2.5, muscle: 0, skin: 0, recovery: -1.5 },
    suitability: { minBf: 12, maxBf: 30, goals: ["fat_loss", "performance"] },
    contraindications: [],
    visualChange: true,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "slu_pp_332",
    name: "SLU-PP-332",
    category: "Metabolic",
    tagline: "Experimental Exercise Mimetic",
    mechanism: "Pan-ERR agonist activating PGC-1α and mitochondrial biogenesis — the same downstream pathway as sustained endurance training. Striking preclinical data; no human studies.",
    keyBenefits: ["Most mechanistically sophisticated exercise mimetic", "Compelling preclinical endurance data", "Distinct from GLP-1, PPARδ, or AMPK approaches", "PGC-1α mitochondrial biogenesis pathway"],
    dosing: "No established human dose",
    cycle: "No human protocol exists",
    route: "Oral (presumed); no human protocols",
    pros: ["Most mechanistically sophisticated exercise mimetic in catalog", "Preclinical data exceptionally compelling", "Distinct mechanism from existing classes", "Could represent genuinely novel category"],
    cons: ["ZERO human safety data", "No standard dosing protocol exists", "Cancer-relevant signaling pathway (theoretical concern)", "Long-term effects completely uncharacterized"],
    effects: { bf: -2, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 100, maxBf: 100, goals: [] },
    contraindications: [],
    visualChange: true,
    riskTier: "unknown",
    experienceLevel: "experimental_only",
    displayWarning: "Experimental compound. No human safety data. No established human dosing. Listed for educational reference only."
  },

  {
    id: "aicar",
    name: "AICAR",
    category: "Metabolic",
    tagline: "AMPK Activator (Bioavailability-Limited)",
    mechanism: "AMP-mimetic compound that directly activates AMPK without requiring cellular energy depletion. Mimics endurance training adaptation; poor oral bioavailability is the practical ceiling.",
    keyBenefits: ["Strong mechanistic basis for endurance effects", "Clinical research history at IV doses", "No HPG suppression", "No major toxicity"],
    dosing: "Research protocol only",
    cycle: "No standard cycle established",
    route: "Oral (poor bioavailability); originally IV in research",
    pros: ["Strong mechanistic basis for endurance and metabolic effects", "Clinical research history at IV doses", "No HPG suppression, no major toxicity", "Genuine AMPK activation mechanism"],
    cons: ["Oral bioavailability poor — major practical limitation", "Cost high for what often produces minimal real-world effect", "WADA-banned", "Most informal protocols essentially placebo"],
    effects: { bf: -1, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 100, maxBf: 100, goals: [] },
    contraindications: [],
    visualChange: false,
    riskTier: "moderate",
    experienceLevel: "experimental_only"
  },

  {
    id: "t3",
    name: "T3 (Liothyronine)",
    category: "Metabolic",
    tagline: "Aggressive Fat Loss",
    mechanism: "The active thyroid hormone introduced exogenously to directly increase BMR, fat oxidation, and protein turnover. Suppresses endogenous thyroid production during use.",
    keyBenefits: ["Most aggressive fat loss tool in catalog", "Direct mechanism — bypasses appetite pathways", "Effective when other tools plateau", "Affordable"],
    dosing: "25 mcg/day (titrate up to 75 mcg)",
    cycle: "6 weeks with full taper; minimum 4 weeks recovery",
    route: "Oral, morning",
    pros: ["Most aggressive fat loss tool in the catalog", "Direct mechanism — bypasses appetite and glucose pathways", "Effective even when other fat loss tools plateau", "Strong clinical history"],
    cons: ["Muscle catabolism without anabolic protection", "Cardiac strain at higher doses", "Endogenous thyroid suppression — temporary but real", "Psychological addiction risk"],
    effects: { bf: -5, muscle: -2.5, skin: 0, recovery: -1.5 },
    suitability: { minBf: 15, maxBf: 35, goals: ["fat_loss"] },
    contraindications: ["below15bf"],
    visualChange: true,
    riskTier: "moderate",
    experienceLevel: "intermediate"
  },

  {
    id: "t4",
    name: "T4 (Levothyroxine)",
    category: "Metabolic",
    tagline: "The Milder Thyroid Path",
    mechanism: "Inactive thyroid hormone the body converts to T3 as needed. The conversion step provides natural rate-limiting that direct T3 lacks.",
    keyBenefits: ["Milder than T3 alone", "Natural conversion rate-limiting", "Long half-life — once-daily dosing", "More physiological than T3-only"],
    dosing: "50 mcg/day oral",
    cycle: "Body composition use rare; typically long-term clinical",
    route: "Oral, morning fasted",
    pros: ["Milder than T3 alone — natural conversion rate-limiting", "Long half-life makes once-daily dosing practical", "Strong clinical safety data", "More physiological than T3-only protocols"],
    cons: ["HPT axis suppression real even at modest doses", "Body composition use without bloodwork is inappropriate", "Most users do not need this", "Cardiac effects compound with stimulants"],
    effects: { bf: -2, muscle: -1, skin: 0, recovery: -0.5 },
    suitability: { minBf: 15, maxBf: 35, goals: ["fat_loss"] },
    contraindications: ["below15bf"],
    visualChange: true,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "clenbuterol",
    name: "Clenbuterol",
    category: "Metabolic",
    tagline: "Thermogenic Edge",
    mechanism: "Potent beta-2 adrenergic agonist that increases metabolic rate and core temperature. Mild anti-catabolic effects help preserve lean mass during caloric deficit.",
    keyBenefits: ["Effective thermogenic fat loss", "Mild muscle-preserving effect", "Strong contest-prep track record", "No HPG or thyroid suppression"],
    dosing: "40 mcg/day (titrate; pyramid up by 20 mcg)",
    cycle: "2 weeks on / 2 weeks off (cardiac safety)",
    route: "Oral, AM",
    pros: ["Effective thermogenic fat loss", "Mild muscle-preserving effect", "Strong contest-prep track record", "Does not affect HPG axis or thyroid"],
    cons: ["Cardiac hypertrophy with chronic use — does not fully reverse", "Tremor, anxiety, sweating common", "Sleep disruption pronounced", "Muscle cramping reliable without taurine support"],
    effects: { bf: -4, muscle: 0, skin: 0, recovery: -2 },
    suitability: { minBf: 12, maxBf: 25, goals: ["fat_loss"] },
    contraindications: ["below15bf"],
    visualChange: true,
    riskTier: "mod_high",
    experienceLevel: "intermediate"
  },

  {
    id: "metformin",
    name: "Metformin",
    category: "Metabolic",
    tagline: "Longevity & Glucose Management",
    mechanism: "Biguanide antidiabetic that activates AMPK, reduces hepatic glucose production, and improves peripheral insulin sensitivity. Active longevity research compound (TAME trial).",
    keyBenefits: ["Deepest clinical safety record of metabolic compounds", "Effective glucose management on MK-677", "Strong emerging longevity data", "Compatible with virtually any compound"],
    dosing: "500 mg, 2x daily oral",
    cycle: "Long-term sustainable",
    route: "Oral, with meals",
    pros: ["Deepest clinical safety record of any metabolic compound", "Effective for glucose management on MK-677 or insulin-resistant users", "Strong emerging longevity data", "Affordable and widely available"],
    cons: ["GI side effects (diarrhea, nausea) common initially", "B12 depletion with long-term use", "May modestly blunt training adaptations", "Mild lactic acidosis risk in kidney dysfunction"],
    effects: { bf: -1.5, muscle: -0.5, skin: 0, recovery: 0.5 },
    suitability: { minBf: 12, maxBf: 50, goals: ["fat_loss", "anti_aging", "energy"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  // ══════════════════════════════════════════════════════════
  // SPECIALTY PEPTIDES — Tanning, Cognitive, HPG, Longevity
  // ══════════════════════════════════════════════════════════

  {
    id: "melanotan2",
    name: "Melanotan II",
    category: "Performance",
    tagline: "Tan + Libido + Appetite",
    mechanism: "Non-selective melanocortin agonist driving melanin production for tanning, activating central libido pathways, and suppressing appetite. The most multi-functional melanocortin peptide.",
    keyBenefits: ["Multi-functional — tan, libido, appetite", "Tan effects last weeks beyond cessation", "Libido enhancement well-reported", "Useful adjunct in fat loss phases"],
    dosing: "0.5 mg/day loading, then 1–2x weekly",
    cycle: "4 weeks loading + ongoing 1x weekly maintenance",
    route: "Subcutaneous injection, evening",
    pros: ["Multi-functional in a single compound", "Tan effects last weeks beyond cessation", "Libido enhancement well-reported", "Appetite suppression useful in fat loss"],
    cons: ["Non-selective receptor profile = diverse side effects", "Nausea common at full dose — load slowly", "Mole darkening is real and warrants dermatologist baseline", "Long-term melanoma risk theoretically possible"],
    effects: { bf: -1, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 8, maxBf: 40, goals: ["performance", "skin"] },
    contraindications: [],
    visualChange: true,
    riskTier: "moderate",
    experienceLevel: "intermediate"
  },

  {
    id: "semax",
    name: "Semax",
    category: "Performance",
    tagline: "BDNF Cognitive Enhancement",
    mechanism: "Russian-developed heptapeptide derived from ACTH 4-10. Elevates BDNF and modulates dopamine/serotonin. Actually prescribed in Russia for stroke recovery, cognitive deficits, and ADHD.",
    keyBenefits: ["Genuine BDNF elevation", "Strong cognitive enhancement", "Neuroprotection during stress", "Compatible with virtually any compound"],
    dosing: "300 mcg, 1–2x daily intranasal",
    cycle: "2–3 weeks on, 1 week off (or daily sustainable)",
    route: "Intranasal spray — essential for CNS effect",
    pros: ["Genuine clinical use history in Russia", "Strong BDNF elevation — neuroprotective and pro-cognitive", "No tolerance at standard protocols", "Intranasal route avoids first-pass metabolism"],
    cons: ["Intranasal administration only — oral inactive", "Limited Western research", "Mild overstimulation possible", "Effects subtle compared to direct stimulants"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "gonadorelin",
    name: "Gonadorelin",
    category: "Recovery",
    tagline: "HPG Axis Maintenance",
    mechanism: "Synthetic GnRH that stimulates pituitary LH/FSH release, maintaining testicular function during suppressive cycles. Pulsatile dosing essential — continuous use is counterproductive.",
    keyBenefits: ["Preserves HPG axis during suppressive cycles", "Faster post-cycle recovery", "Fertility preservation", "Strong clinical history"],
    dosing: "100 mcg, 2–3x weekly SubQ",
    cycle: "Throughout suppressive cycle (8–12 weeks)",
    route: "Subcutaneous injection, spaced 2–3 days apart",
    pros: ["Preserves HPG axis function during otherwise suppressive cycles", "Faster post-cycle recovery", "Fertility preservation (distinct from testosterone alone)", "Strong clinical history from IVF use"],
    cons: ["Pulsatile dosing requires discipline", "Mild injection-site reactions reported", "Does not fully prevent suppression — only mitigates", "Cost adds to overall cycle expense"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "intermediate"
  },

  {
    id: "epitalon",
    name: "Epitalon",
    category: "Anti-Aging",
    tagline: "Telomerase Activation",
    mechanism: "Soviet-developed tetrapeptide that upregulates telomerase activity, the enzyme that maintains chromosomal telomeres. Also regulates pineal melatonin and circadian rhythm.",
    keyBenefits: ["Genuine telomerase mechanism — biologically novel", "Strong sleep and circadian benefits", "Pulsed cycling reduces cumulative exposure", "Effects persist months after cycle ends"],
    dosing: "5 mg/day during 10-day cycle SubQ",
    cycle: "10–20 day cycles, repeated 2–4x yearly",
    route: "Subcutaneous injection, evening",
    pros: ["Genuinely novel mechanism — telomerase upregulation", "Strong sleep and circadian rhythm benefits", "No suppression, no liver impact", "Effects persist months after cycle ends"],
    cons: ["Telomerase is also a cancer cell mechanism — theoretical concern", "Russian/Soviet research dominates literature", "Subjective effects often subtle", "Long-term safety data essentially absent"],
    effects: { bf: 0, muscle: 0, skin: 1.2, recovery: 2 },
    suitability: { minBf: 5, maxBf: 50, goals: ["anti_aging", "recovery"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  // ══════════════════════════════════════════════════════════
  // NOOTROPICS — Cognitive & Performance Compounds
  // ══════════════════════════════════════════════════════════

  {
    id: "phenibut",
    name: "Phenibut",
    category: "Nootropic",
    tagline: "Powerful Anxiolytic — High Dependency Risk",
    mechanism: "GABA-B agonist producing profound anxiety reduction and social confidence. Tolerance develops within 2–3 days of consecutive use; withdrawal from daily use is severe and prolonged.",
    keyBenefits: ["Most effective anxiolytic in the catalog", "Strong social disinhibition effect", "Useful for severe situational anxiety", "Pulsed use can be sustainable"],
    dosing: "1000 mg, max 2x weekly (NEVER consecutive days)",
    cycle: "Weekly pulsing only — never daily",
    route: "Oral, builds over 2–4 hours",
    pros: ["Most effective anxiolytic in the entire catalog", "Strong social disinhibition and confidence effect", "Meaningful for users with severe situational anxiety", "Pulsed use can be sustainable"],
    cons: ["Tolerance develops in 2–3 consecutive days", "Severe withdrawal from daily use — equivalent to benzodiazepines", "Dependency develops faster than most users realize", "Combining with alcohol potentially fatal"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "high",
    experienceLevel: "advanced",
    displayWarning: "HIGH DEPENDENCY RISK. Daily use produces withdrawal equivalent to benzodiazepines. Maximum 2x weekly with no consecutive days."
  },

  {
    id: "cyclazodone",
    name: "Cyclazodone",
    category: "Nootropic",
    tagline: "Prescription-Strength Focus",
    mechanism: "Pemoline analog that increases dopamine and norepinephrine via reuptake inhibition and presynaptic release. Approaches prescription amphetamine in subjective potency.",
    keyBenefits: ["Approaches prescription stimulant effect", "Sustained 6–8 hour focus window", "Strong motivation and task initiation", "Useful for genuine high-stakes performance"],
    dosing: "10 mg, max 3x weekly oral",
    cycle: "Pulsed use only — daily use destroys response within a week",
    route: "Oral, AM only",
    pros: ["Approaches prescription stimulant effect", "Sustained 6–8 hour focus window", "Strong motivation and task initiation", "Useful for genuine high-demand performance windows"],
    cons: ["Tolerance within days of daily use", "Rebound depression after extended use", "Sleep disruption pronounced", "Moderate dependency potential"],
    effects: { bf: -0.5, muscle: 0, skin: 0, recovery: -1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy"] },
    contraindications: [],
    visualChange: false,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "dihexa",
    name: "Dihexa",
    category: "Nootropic",
    tagline: "HGF Synaptogenesis",
    mechanism: "Angiotensin IV analog claimed to be millions of times more potent than BDNF at driving synaptogenesis via HGF/c-Met receptor activation. Strong preclinical data; zero human safety data.",
    keyBenefits: ["Biologically novel HGF/c-Met mechanism", "Strong preclinical neuroprotection data", "Anecdotal cognitive plasticity effects", "Oral bioavailability higher than expected"],
    dosing: "15 mg/day oral",
    cycle: "Unknown — no human data",
    route: "Oral or topical",
    pros: ["Biologically novel mechanism — HGF/c-Met agonism", "Strong preclinical neuroprotection data", "Anecdotal cognitive plasticity effects", "Effective oral bioavailability for a peptide"],
    cons: ["Zero human safety data", "Cancer pathway implications theoretically real", "No standard dosing or cycling protocols", "Subjective effects often subtle despite potency claims"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "mod_high",
    experienceLevel: "experimental_only"
  },

  {
    id: "flmodafinil",
    name: "Flmodafinil",
    category: "Nootropic",
    tagline: "The Cleanest Wakefulness",
    mechanism: "Bisfluorinated modafinil analog with ~4x potency and no hepatic conversion required. Dopamine transporter inhibition plus orexin system activation.",
    keyBenefits: ["Cleanest wakefulness in the catalog", "No liver prodrug conversion (unlike adrafinil)", "Sustained 10–12 hour productive window", "Low abuse potential relative to stimulants"],
    dosing: "100 mg/day oral",
    cycle: "4–6 weeks, then break",
    route: "Oral, morning ONLY",
    pros: ["Cleanest wakefulness agent — no stimulant feeling", "No hepatic prodrug conversion (unlike adrafinil)", "Sustained 10–12 hour productive window", "Low abuse potential vs true stimulants"],
    cons: ["Sleep disruption with late dosing", "Headache common (hydration helps)", "Mild appetite suppression", "Tolerance over weeks of daily use"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: -0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  {
    id: "bromantane",
    name: "Bromantane",
    category: "Nootropic",
    tagline: "Sustainable Daily Motivation",
    mechanism: "Russian adaptogen that increases dopamine and serotonin synthesis by upregulating their synthesis enzymes — distinct from typical stimulants. Effects build over 2–4 weeks; no tolerance.",
    keyBenefits: ["No tolerance, no addiction, no withdrawal", "Sustainable daily use indefinitely", "Upstream synthesis mechanism", "Strong stress resilience effects"],
    dosing: "50 mg/day oral",
    cycle: "Indefinite — no tolerance buildup",
    route: "Oral, morning",
    pros: ["No tolerance, no addiction, no withdrawal", "Sustainable daily use indefinitely", "Upstream mechanism — increases capacity, not depletes reserves", "Strong stress resilience effects"],
    cons: ["Effects subtle in first 2 weeks", "Less immediate gratification than stimulants", "Limited Western research", "Some users find effect too mild"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy", "recovery"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "noopept",
    name: "Noopept",
    category: "Nootropic",
    tagline: "Fast-Acting Plasticity",
    mechanism: "Dipeptide analog of piracetam with ~1000x greater potency. Upregulates NGF and BDNF; supports neurogenesis and synaptic plasticity. Sublingual onset within minutes.",
    keyBenefits: ["~1000x potency vs piracetam", "Fast sublingual onset", "Genuine BDNF/NGF mechanism", "Mild anxiolytic effect"],
    dosing: "15 mg, 1–3x daily sublingual",
    cycle: "Long-term sustainable at 10–20mg",
    route: "Sublingual preferred, oral acceptable",
    pros: ["~1000x potency vs piracetam by weight", "Fast sublingual onset", "Genuine cognitive plasticity mechanism (BDNF/NGF)", "Daily sustainable use"],
    cons: ["Brain fog at doses above 30mg", "Alpha-GPC pairing mandatory", "Effects subtler than potency multiplier suggests", "Some users non-responders"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "selank",
    name: "Selank",
    category: "Nootropic",
    tagline: "Anxiolysis Without Sedation",
    mechanism: "Russian heptapeptide modulating GABA-ergic, dopaminergic, and serotonergic systems without direct GABA receptor binding. Anxiolysis without sedation, tolerance, or dependency.",
    keyBenefits: ["Anxiety reduction without sedation", "No tolerance or dependency", "Compatible with cognitive demands", "Classical Semax pairing for cognitive state"],
    dosing: "300 mcg, 1–3x daily intranasal",
    cycle: "Long-term sustainable, daily indefinite",
    route: "Intranasal spray — oral inactive",
    pros: ["Anxiety reduction without sedation, tolerance, or dependency", "Compatible with cognitive demands (no impairment)", "Among the safest peptides in the catalog", "Classical Semax/Selank pairing"],
    cons: ["Intranasal route only — oral inactive", "Effects subtle compared to GABA-ergic anxiolytics", "Limited Western research", "Cost adds up with daily intranasal use"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "recovery"] },
    contraindications: [],
    visualChange: false,
    riskTier: "very_low",
    experienceLevel: "beginner"
  },

  {
    id: "nsi189",
    name: "NSI-189",
    category: "Nootropic",
    tagline: "Hippocampal Neurogenesis",
    mechanism: "Small molecule that selectively stimulates hippocampal neurogenesis. Phase II depression trial showed MRI-confirmed hippocampal volume increases — biologically distinctive.",
    keyBenefits: ["MRI-confirmed hippocampal volume increases", "Phase II clinical trial data", "No tolerance, no withdrawal", "Compatible with most nootropic protocols"],
    dosing: "40 mg/day oral",
    cycle: "8–12 weeks on, 4 weeks off",
    route: "Oral, morning",
    pros: ["MRI-confirmed hippocampal volume increases — biological effect", "Phase II clinical trial data", "No tolerance, no withdrawal", "Compatible with most nootropic protocols"],
    cons: ["Effects build slowly (4–8 weeks)", "Cost higher than many nootropics", "GI side effects at higher doses", "Subjective effects subtle despite real biology"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "anti_aging"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "intermediate"
  },

  {
    id: "methylene_blue",
    name: "Methylene Blue",
    category: "Nootropic",
    tagline: "Mitochondrial Electron Carrier",
    mechanism: "At low doses, functions as alternative mitochondrial electron carrier bypassing complex IV dysfunction. At higher doses, becomes an MAO inhibitor.",
    keyBenefits: ["150+ years of clinical use history", "Mitochondrial mechanism support", "Effective at very low cost", "Daily sustainable at appropriate dose"],
    dosing: "2 mg/day oral (USP grade only)",
    cycle: "Long-term tolerated at low doses",
    route: "Oral, AM",
    pros: ["Long clinical history (150+ years of use)", "Strong mitochondrial mechanism support", "Effective at very low cost", "Cognitive enhancement effects well-documented"],
    cons: ["Serotonin syndrome risk with SSRIs/SNRIs/MAOIs (absolute contraindication)", "Stains tongue and urine", "USP grade essential — lab grade unsafe", "G6PD deficiency contraindication"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["energy", "anti_aging", "performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "beginner"
  },

  {
    id: "phenylpiracetam",
    name: "Phenylpiracetam",
    category: "Nootropic",
    tagline: "WADA-Banned Performance Edge",
    mechanism: "Phenylated derivative of piracetam with added stimulant component. Modulates AMPA receptors and increases dopamine/norepinephrine. Famously banned by WADA for performance enhancement.",
    keyBenefits: ["Genuine cognitive and physical enhancement", "Cold tolerance effect", "Mood elevation", "Clinical use history in Russia"],
    dosing: "100 mg, max 3x weekly oral",
    cycle: "Pulsed — daily use causes tolerance within a week",
    route: "Oral, morning only",
    pros: ["Genuine cognitive and physical performance enhancement", "Cold tolerance effect useful in specific contexts", "Mild mood elevation", "Clinical use history in Russia"],
    cons: ["Tolerance develops in days with daily use", "WADA-banned for competition", "Sleep disruption pronounced", "Dependency potential at sustained daily use"],
    effects: { bf: -0.5, muscle: 0, skin: 0, recovery: -0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy"] },
    contraindications: [],
    visualChange: false,
    riskTier: "moderate",
    experienceLevel: "intermediate"
  },

  {
    id: "methylphenylpiracetam",
    name: "Methylphenylpiracetam",
    category: "Nootropic",
    tagline: "Potent Cognitive Load — Cardiac Stress",
    mechanism: "Methylated phenylpiracetam analog with 10–20x stronger sigma-1 receptor binding. Among the most potent nootropics in informal use — cardiac load scales with potency.",
    keyBenefits: ["Among the most potent cognitive enhancers", "Strong sustained focus and motivation", "10–20x sigma-1 binding vs phenylpiracetam", "High-stakes performance applications"],
    dosing: "10 mg, max 2x weekly oral",
    cycle: "Pulsed use only — cardiac stress is rate-limiter",
    route: "Oral, morning only",
    pros: ["Among the most potent cognitive enhancers in informal use", "Strong sustained focus and motivation effect", "10–20x sigma-1 binding vs phenylpiracetam"],
    cons: ["Cardiac load significant — chest pressure and palpitations reported", "Moderate-high addiction potential", "Sleep disruption severe", "Most users do not need this potency level"],
    effects: { bf: -0.5, muscle: 0, skin: 0, recovery: -2 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "mod_high",
    experienceLevel: "advanced",
    displayWarning: "Significant cardiac load — chest pressure and palpitations reported at full doses. Most users should choose Flmodafinil or Phenylpiracetam as safer alternatives."
  },

  {
    id: "picamilon",
    name: "Picamilon",
    category: "Nootropic",
    tagline: "FDA-Banned Anxiolytic",
    mechanism: "Combines GABA with niacin to cross the blood-brain barrier — providing mild anxiolysis with simultaneous mild stimulation. Banned by the FDA in 2015 as a drug, not a supplement.",
    keyBenefits: ["Mild anxiolysis without sedation", "Unique stimulating component from niacin", "Solves GABA BBB problem", "Useful for daily calm focus"],
    dosing: "100 mg, 1–2x daily oral",
    cycle: "2–4 weeks on, 1 week off",
    route: "Oral, AM or PM",
    pros: ["Mild anxiolysis without sedation", "Unique stimulating component from niacin", "Solves GABA blood-brain barrier problem", "Calmer than direct GABA-ergic compounds"],
    cons: ["FDA-banned in US — explicit regulatory action", "GABA-class dependency potential (milder than phenibut)", "Quality control variable in informal channels", "Short half-life requires multiple daily doses"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "mod_high",
    experienceLevel: "intermediate"
  },

  {
    id: "adrafinil",
    name: "Adrafinil",
    category: "Nootropic",
    tagline: "Modafinil Prodrug — Liver Cost",
    mechanism: "Prodrug the liver converts to modafinil. Provides modafinil's wakefulness effects plus the additional liver load of the conversion process.",
    keyBenefits: ["Modafinil-class effects without prescription", "Long history of informal use", "Was clinically used as Olmifon", "Wakefulness platform"],
    dosing: "300 mg/day oral",
    cycle: "4 weeks on, 2 weeks off (liver framing)",
    route: "Oral, morning",
    pros: ["Was clinically used (Olmifon) for wakefulness", "Effective modafinil-class effects without prescription", "Long history of informal use"],
    cons: ["Liver enzyme elevation common with sustained use", "Discontinued commercially because modafinil is cleaner", "Slower onset than modafinil due to conversion", "Flmodafinil is a strictly better alternative if available"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: -1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy"] },
    contraindications: [],
    visualChange: false,
    riskTier: "moderate",
    experienceLevel: "intermediate"
  },

  {
    id: "idra21",
    name: "IDRA-21",
    category: "Nootropic",
    tagline: "AMPAkine — Convulsant Signal",
    mechanism: "One of the most potent AMPA receptor modulators ever synthesized. Animal studies showed dramatic cognitive enhancement alongside significant convulsant activity.",
    keyBenefits: ["Most potent cognitive plasticity compound in preclinical literature", "Strong AMPA-mediated cognitive signal", "Educational reference for AMPAkine class"],
    dosing: "No established human dose",
    cycle: "No human protocol exists",
    route: "Oral, theoretical only",
    pros: ["One of the most potent cognitive plasticity compounds in preclinical literature", "Strong AMPA-mediated cognitive enhancement signal in animal models"],
    cons: ["Convulsant activity documented in animal studies", "No human safety dataset", "Therapeutic window between benefit and seizure appears narrow", "Listed for educational reference only"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 100, maxBf: 100, goals: [] },
    contraindications: [],
    visualChange: false,
    riskTier: "unknown",
    experienceLevel: "experimental_only",
    displayWarning: "Convulsant activity documented in animal studies. No established human dosing. Listed for educational reference only."
  },

  {
    id: "sulbutiamine",
    name: "Sulbutiamine",
    category: "Nootropic",
    tagline: "Mild Mood & Motivation",
    mechanism: "Lipophilic thiamine derivative that crosses the blood-brain barrier and increases central dopaminergic activity via D1 upregulation. French clinical use for asthenia.",
    keyBenefits: ["Genuine mood and motivation effects", "Mild side effect profile at standard doses", "Clinical use history (French asthenia)", "Affordable"],
    dosing: "400 mg, max 3x weekly oral",
    cycle: "Pulsed use indefinitely sustainable",
    route: "Oral, AM with food",
    pros: ["Genuine mood and motivation effects", "Mild side effect profile at standard doses", "Clinical use history (French asthenia treatment)", "Affordable"],
    cons: ["Tolerance develops with daily use", "Dopaminergic pull means dose escalation risk", "Rebound fatigue when stopping after extended daily use", "Mild but real addiction potential"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  // ══════════════════════════════════════════════════════════
  // NOOTROPIC SUPPORT — Substrate Compounds
  // ══════════════════════════════════════════════════════════

  {
    id: "alpha_gpc",
    name: "Alpha-GPC",
    category: "Nootropic",
    tagline: "Universal Cholinergic Substrate",
    mechanism: "Bioavailable choline source that crosses the BBB and serves as substrate for acetylcholine synthesis. The standard pairing compound for any racetam, ampakine, or plasticity-driving nootropic.",
    keyBenefits: ["Universal cognitive nootropic pairing", "Foundation for any nootropic stack", "Strong safety record", "Mild ergogenic effect"],
    dosing: "300–600 mg/day oral",
    cycle: "Long-term sustainable, daily continuous",
    route: "Oral, AM",
    pros: ["Universally compatible with cognitive-active compounds", "Strong clinical safety record", "Effective at modest cost", "Mild ergogenic effect on power output"],
    cons: ["Headache common at high doses (paradoxical cholinergic)", "Some observational data raises questions at very high sustained doses", "Effects subtle alone — works as substrate"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy", "anti_aging"] },
    contraindications: [],
    visualChange: false,
    riskTier: "very_low",
    experienceLevel: "beginner"
  },

  {
    id: "nalt",
    name: "NALT (N-Acetyl L-Tyrosine)",
    category: "Nootropic",
    tagline: "Dopamine Synthesis Substrate",
    mechanism: "More bioavailable form of tyrosine — the amino acid substrate for dopamine and norepinephrine synthesis. Pairs with any dopaminergic compound to prevent rebound depletion.",
    keyBenefits: ["Universal dopaminergic pairing", "Prevents stimulant-rebound depletion", "Stress and cold tolerance support", "Foundation for ADHD-spectrum protocols"],
    dosing: "500 mg/day oral",
    cycle: "Long-term sustainable",
    route: "Oral, AM empty stomach",
    pros: ["Universal pairing with dopaminergic compounds", "Prevents stimulant-rebound dopamine depletion", "Strong safety profile", "Foundation substrate for ADHD-spectrum protocols"],
    cons: ["Effects subtle alone — substrate compound, not driver", "Some users non-responders to oral tyrosine", "Migraine trigger potential"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "energy"] },
    contraindications: [],
    visualChange: false,
    riskTier: "very_low",
    experienceLevel: "beginner"
  },

  {
    id: "citicoline",
    name: "Citicoline",
    category: "Nootropic",
    tagline: "Cholinergic + Membrane Support",
    mechanism: "Alternative cholinergic source with added cytidine component that supports phospholipid synthesis and membrane integrity. Clinical use in stroke recovery.",
    keyBenefits: ["Dual cholinergic + membrane support", "Clinical recovery context use", "Lower effective dose than Alpha-GPC", "Some users prefer subjectively"],
    dosing: "250 mg/day oral",
    cycle: "Long-term sustainable",
    route: "Oral, AM",
    pros: ["Dual cholinergic and membrane support mechanism", "Clinical use in cognitive recovery", "Lower effective dose than Alpha-GPC", "Strong safety record"],
    cons: ["Effects subtle alone", "Cost higher per gram than Alpha-GPC", "Headache possible (cholinergic effect)", "Individual preference vs Alpha-GPC variable"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["performance", "anti_aging"] },
    contraindications: [],
    visualChange: false,
    riskTier: "very_low",
    experienceLevel: "beginner"
  },

  // ══════════════════════════════════════════════════════════
  // CYCLE SUPPORT — SERMs, AIs, ED, Cardiovascular
  // ══════════════════════════════════════════════════════════

  {
    id: "tamoxifen",
    name: "Tamoxifen",
    category: "Cycle Support",
    tagline: "Gold Standard PCT",
    mechanism: "SERM with hypothalamic ER antagonism — restores LH/FSH signaling and endogenous testosterone production. Blocks ER at breast tissue (gynecomastia prevention).",
    keyBenefits: ["Most clinically validated PCT compound", "Decades of safety data", "Both PCT and gyno management", "Bone and lipid protective"],
    dosing: "20 mg/day oral",
    cycle: "4–6 weeks PCT post-cycle",
    route: "Oral, consistent time daily",
    pros: ["Most clinically validated SERM for PCT", "Decades of safety data from oncology use", "Effective for both PCT and on-cycle gyno management", "Affordable and widely available"],
    cons: ["Mild mood effects in some users", "Vision changes at high doses (reversible)", "DVT/PE risk in predisposed individuals", "Not as clean as Enclomiphene for pure HPG restoration"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "muscle"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "intermediate"
  },

  {
    id: "anastrozole",
    name: "Anastrozole",
    category: "Cycle Support",
    tagline: "Bloodwork-Guided E2 Control",
    mechanism: "Reversible non-steroidal aromatase inhibitor. Reduces testosterone-to-estrogen conversion in dose-dependent manner. Bloodwork-guided titration is non-negotiable.",
    keyBenefits: ["Effective E2 control when needed", "Strong clinical safety data", "Reversible mechanism", "Titratable to bloodwork"],
    dosing: "0.25 mg EOD oral (titrate to labs)",
    cycle: "Throughout cycle if E2 elevated",
    route: "Oral, consistent intervals",
    pros: ["Effective E2 control when needed", "Strong clinical safety data", "Reversible mechanism — stopping restores E2 quickly", "Cheaper than letrozole and more titratable"],
    cons: ["Easy to overdose — joint pain, libido crash, mood disruption", "Requires bloodwork to use properly", "Most users overestimate their need for AI use", "Can impair lipid profile if used unnecessarily"],
    effects: { bf: -1, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "muscle"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "intermediate"
  },

  {
    id: "letrozole",
    name: "Letrozole",
    category: "Cycle Support",
    tagline: "Aggressive E2 Reduction",
    mechanism: "Significantly more potent AI than anastrozole — capable of reducing estradiol by 95%+. Used for established gynecomastia or severe estrogenic side effects.",
    keyBenefits: ["Most potent AI for emergency E2 control", "Effective for established gynecomastia reversal", "Strong oncology safety data"],
    dosing: "0.25 mg, 2x weekly oral",
    cycle: "Short-term targeted use, 2–4 weeks",
    route: "Oral, consistent intervals",
    pros: ["Most potent AI available for emergency E2 control", "Effective for reversing established gynecomastia", "Strong oncology safety data at therapeutic doses"],
    cons: ["Easy to crash E2 — joint pain and libido loss reliable", "Lipid impact significant", "Most users do NOT need this potency", "Anastrozole is appropriate first-line"],
    effects: { bf: -1, muscle: 0, skin: -0.3, recovery: -1 },
    suitability: { minBf: 8, maxBf: 30, goals: ["recovery"] },
    contraindications: [],
    visualChange: false,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "enclomiphene",
    name: "Enclomiphene",
    category: "Cycle Support",
    tagline: "Pure SERM Without The Crash",
    mechanism: "Pure trans-isomer of clomiphene — the active HPG-stimulating component without the problematic zuclomiphene isomer. Cleaner than racemic clomiphene for PCT and TRT-alternative use.",
    keyBenefits: ["Cleaner side effect profile than clomid", "PCT or long-term HPG support", "Preserves fertility unlike traditional TRT", "Phase III trial data"],
    dosing: "12.5 mg/day oral",
    cycle: "4–6 weeks PCT or long-term continuous",
    route: "Oral, consistent time",
    pros: ["Cleaner side effect profile than clomiphene (no zuclomiphene)", "Effective for both PCT and long-term HPG support", "Preserves fertility unlike traditional TRT", "Sustained testosterone increases at 12.5mg daily"],
    cons: ["Visual effects still possible (rare)", "Some users find mood neutral or slightly off", "Cost higher than racemic clomiphene", "Long-term safety data only fair"],
    effects: { bf: -0.5, muscle: 1.5, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "muscle", "energy"] },
    contraindications: [],
    visualChange: true,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  {
    id: "clomiphene",
    name: "Clomiphene",
    category: "Cycle Support",
    tagline: "Original PCT — With Caveats",
    mechanism: "Racemic SERM mixture — enclomiphene (active component) plus zuclomiphene (longer-acting partial agonist responsible for mood and visual side effects).",
    keyBenefits: ["Effective HPG restoration", "Long clinical history (fertility medicine)", "Widely available and affordable", "Strong cost-benefit when enclomiphene unavailable"],
    dosing: "25 mg/day oral",
    cycle: "4–6 weeks PCT post-cycle",
    route: "Oral, consistent time",
    pros: ["Effective HPG axis restoration", "Long clinical history (fertility medicine)", "Widely available and affordable", "Strong cost-benefit when enclomiphene unavailable"],
    cons: ["Zuclomiphene-driven mood crash in significant subset", "Visual disturbances (floaters, sensitivity) in some users", "Enclomiphene is strictly better when available", "Side effects can persist weeks after stopping"],
    effects: { bf: 0, muscle: 0.5, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "muscle"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  {
    id: "toremifene",
    name: "Toremifene",
    category: "Cycle Support",
    tagline: "Lipid-Friendly Tamoxifen Alternative",
    mechanism: "Tamoxifen-related SERM with meaningfully better lipid profile and lower DVT risk. PCT option for users with existing lipid concerns or tamoxifen intolerance.",
    keyBenefits: ["Better lipid profile than tamoxifen", "Lower DVT/PE risk", "Strong oncology clinical history", "Reduced mood/visual sides vs tamoxifen"],
    dosing: "60 mg/day oral",
    cycle: "4–6 weeks PCT",
    route: "Oral, consistent time",
    pros: ["Better lipid profile than tamoxifen", "Lower DVT/PE risk than tamoxifen", "Strong clinical safety data from oncology", "Reduced mood and visual side effects vs tamoxifen"],
    cons: ["Less aggressive HPG recovery than tamoxifen", "QT prolongation at high doses", "More expensive than tamoxifen", "Less widely available in research channels"],
    effects: { bf: 0, muscle: 0.5, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "muscle"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low_mod",
    experienceLevel: "advanced"
  },

  {
    id: "exemestane",
    name: "Exemestane",
    category: "Cycle Support",
    tagline: "Irreversible AI",
    mechanism: "Steroidal AI that permanently inactivates aromatase upon binding ('suicidal' AI). Distinct from reversible AIs because enzyme inhibition does not reverse on cessation.",
    keyBenefits: ["Stable E2 control without rebound", "Mild anabolic effect (vs reversible AIs)", "Strong oncology clinical history", "Steroidal structure"],
    dosing: "12.5 mg EOD oral",
    cycle: "Throughout cycle if E2 management needed",
    route: "Oral, consistent intervals",
    pros: ["Stable E2 control without rebound on cessation", "Mild anabolic effect", "Strong oncology clinical history", "Steroidal structure may have downstream benefits"],
    cons: ["Irreversible mechanism means errors persist", "Joint pain reliable when overdosed", "Lipid impact meaningful", "Not appropriate as first AI experience"],
    effects: { bf: -1, muscle: 1, skin: -0.3, recovery: -0.3 },
    suitability: { minBf: 8, maxBf: 30, goals: ["recovery"] },
    contraindications: [],
    visualChange: true,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "cabergoline",
    name: "Cabergoline",
    category: "Cycle Support",
    tagline: "Prolactin Control",
    mechanism: "Long-acting dopamine D2 agonist that suppresses prolactin. Used for prolactin elevation from 19-nor compounds or GHRP-2/GHRP-6 stacks.",
    keyBenefits: ["Effective prolactin management at low doses", "Mood and libido benefits", "Long half-life — 2x weekly dosing", "Strong clinical safety at therapeutic doses"],
    dosing: "0.25 mg, 2x weekly oral",
    cycle: "Throughout prolactin-elevating cycles",
    route: "Oral, spaced 3–4 days apart",
    pros: ["Effective prolactin management at low doses", "Mood and libido benefits beyond primary indication", "Long half-life makes dosing convenient", "Strong clinical safety data"],
    cons: ["Cardiac valve fibrosis at high doses (low risk at body comp doses)", "Nausea and orthostatic hypotension common", "Mood effects unpredictable in some users", "Most users do not need this compound"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "moderate",
    experienceLevel: "advanced"
  },

  {
    id: "tadalafil",
    name: "Tadalafil",
    category: "Cycle Support",
    tagline: "Daily Cardio Support",
    mechanism: "Long-acting PDE-5 inhibitor with ~17.5 hour half-life. Low-dose daily protocol provides cardiovascular protection, blood pressure management, and sexual function preservation.",
    keyBenefits: ["Most underrated cycle support compound", "Cardiovascular protective at therapeutic doses", "Sustained pump and vascularity", "Sexual function during suppressive cycles"],
    dosing: "5 mg/day oral",
    cycle: "Long-term sustainable",
    route: "Oral, consistent time daily",
    pros: ["Most underrated cycle support compound in the catalog", "Cardiovascular protective at therapeutic doses", "Sustained pump and vascularity", "Excellent clinical safety record"],
    cons: ["Headache common when starting", "Nitrate contraindication absolute", "Color vision changes possible (rare)", "Mild lower back / muscle aches reported by some users"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["recovery", "performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low",
    experienceLevel: "intermediate"
  },

  // ══════════════════════════════════════════════════════════
  // HAIR SUPPORT
  // ══════════════════════════════════════════════════════════

  {
    id: "finasteride",
    name: "Finasteride",
    category: "Hair Support",
    tagline: "Standard DHT Blockade",
    mechanism: "5α-reductase type II inhibitor reducing DHT by approximately 70%. Standard pharmaceutical intervention for male pattern hair loss.",
    keyBenefits: ["Most effective oral hair loss prevention", "Long clinical track record", "Mild prostate protective effect", "Affordable and widely available"],
    dosing: "1 mg/day oral",
    cycle: "Long-term for hair preservation",
    route: "Oral, consistent time daily",
    pros: ["Most effective oral hair loss prevention available", "Long clinical track record (decades)", "Mild prostate protective effect", "Affordable and widely available"],
    cons: ["Post-Finasteride Syndrome — persistent effects in small subset", "Sexual side effects in ~5% while on", "Mood and cognitive effects reported by some users", "Teratogenic for female partners trying to conceive"],
    effects: { bf: 0, muscle: 0, skin: 0.3, recovery: 0 },
    suitability: { minBf: 5, maxBf: 50, goals: ["anti_aging"] },
    contraindications: [],
    visualChange: false,
    riskTier: "moderate",
    experienceLevel: "intermediate"
  },

  {
    id: "dutasteride",
    name: "Dutasteride",
    category: "Hair Support",
    tagline: "Aggressive DHT Suppression",
    mechanism: "Dual inhibitor of both type I and type II 5α-reductase, reducing DHT by approximately 95%. Significantly more aggressive than finasteride.",
    keyBenefits: ["Near-complete DHT suppression", "Effective when finasteride is insufficient", "Strong clinical safety record at BPH doses", "Superior hair protection"],
    dosing: "0.5 mg/day oral",
    cycle: "Long-term with monitoring",
    route: "Oral, daily",
    pros: ["Near-complete DHT suppression — superior hair protection", "Effective when finasteride is insufficient", "Strong clinical safety record at BPH doses"],
    cons: ["Five-week washout — side effects persist long after stopping", "Sexual side effects more frequent than finasteride", "Post-drug syndrome risk similar to or exceeding finasteride", "Aggressive systemic DHT suppression has whole-body effects"],
    effects: { bf: 0, muscle: 0, skin: 0.8, recovery: 0 },
    suitability: { minBf: 5, maxBf: 50, goals: ["anti_aging"] },
    contraindications: [],
    visualChange: false,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "oral_minoxidil",
    name: "Oral Minoxidil",
    category: "Hair Support",
    tagline: "Aggressive Regrowth — Cardiac Load",
    mechanism: "Vasodilator originally developed as antihypertensive. Hair effects discovered as side effect — oral dosing produces stronger regrowth than topical with systemic cardiovascular cost.",
    keyBenefits: ["Stronger hair regrowth than topical minoxidil", "Single oral dose easier than topical", "Effective for diffuse thinning"],
    dosing: "1.25 mg/day oral",
    cycle: "Long-term with monitoring",
    route: "Oral, consistent time daily",
    pros: ["Stronger hair regrowth than topical minoxidil", "Single oral dose easier than topical application", "Effective for diffuse thinning beyond what topical can reach"],
    cons: ["Cardiovascular effects real and dose-dependent", "Generalized hypertrichosis (face, body) is expected, not rare", "Fluid retention common", "Effects reverse on discontinuation — hair shed when stopping"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: -0.5 },
    suitability: { minBf: 5, maxBf: 50, goals: ["anti_aging"] },
    contraindications: [],
    visualChange: false,
    riskTier: "mod_high",
    experienceLevel: "advanced"
  },

  {
    id: "ru58841",
    name: "RU58841",
    category: "Hair Support",
    tagline: "Topical AR Antagonist",
    mechanism: "Topical-only androgen receptor antagonist that blocks DHT at hair follicles without (theoretically) systemic androgen blockade. Alternative to finasteride for PFS-conscious users.",
    keyBenefits: ["Topical route theoretically avoids systemic effects", "Alternative for users with PFS concerns", "Compound mechanism complements minoxidil"],
    dosing: "5% topical solution",
    cycle: "Long-term with monitoring",
    route: "Topical to scalp, evening",
    pros: ["Topical route theoretically avoids finasteride-style systemic effects", "Alternative for users with Post-Finasteride Syndrome concerns", "Compound mechanism complements minoxidil"],
    cons: ["Limited research — clinical data sparse", "Systemic absorption not zero — theoretical concerns persist", "Vehicle irritation common", "Effects reverse on discontinuation"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 5, maxBf: 50, goals: ["anti_aging"] },
    contraindications: [],
    visualChange: false,
    riskTier: "low_mod",
    experienceLevel: "intermediate"
  },

  // ══════════════════════════════════════════════════════════
  // HORMONAL
  // ══════════════════════════════════════════════════════════

  {
    id: "pregnenolone",
    name: "Pregnenolone",
    category: "Anti-Aging",
    tagline: "Master Hormone Precursor",
    mechanism: "Precursor hormone for most other steroid hormones plus direct neurosteroid effects via GABA-A and NMDA receptor modulation. Endogenous levels decline with age.",
    keyBenefits: ["Multi-functional cognitive, mood, hormonal support", "Genuine neurosteroid effects", "Long clinical safety history", "Affordable"],
    dosing: "25 mg/day oral",
    cycle: "Long-term sustainable at low doses",
    route: "Oral or topical, AM",
    pros: ["Genuine neurosteroid effects independent of hormone conversion", "Multi-functional cognitive, mood, and hormonal support", "Long clinical safety history", "Affordable"],
    cons: ["Individual cascade outcomes unpredictable", "Estrogenic conversion possible in some users", "Effects subtle without bloodwork-guided protocols", "Bloodwork support strongly advised"],
    effects: { bf: 0, muscle: 0.5, skin: 0.3, recovery: 1 },
    suitability: { minBf: 5, maxBf: 50, goals: ["anti_aging", "performance"] },
    contraindications: [],
    visualChange: false,
    riskTier: "moderate",
    experienceLevel: "advanced"
  }

];

/**
 * ────────────────────────────────────────────────────────────
 * INTEGRATION SUMMARY
 *
 * To merge these expanded compounds with the original 8, add the
 * following to `data/compounds.js`:
 *
 *   import { EXPANDED_COMPOUNDS } from "./compounds-expanded";
 *
 * Then change the existing export to:
 *
 *   export const COMPOUNDS = [
 *     ...the original 8 compound objects,
 *     ...EXPANDED_COMPOUNDS
 *   ];
 *
 * To revert: delete this file, remove the import line, remove the
 * spread `...EXPANDED_COMPOUNDS`. Total revert: 2 lines + 1 file.
 *
 * COMPOUND COUNT BY CATEGORY:
 *   Growth Hormone:   6 (MK-677, Sermorelin, IGF-1, CJC variants, Ipa)
 *   Fat Loss:         1 (Fragment 176-191)
 *   Recovery:         2 (BPC/TB blend, Gonadorelin)
 *   SARM:            10 (Ostarine, RAD-140, LGD-4033, YK-11, S-23,
 *                        S-4, LGD-3303, RAD-150, Cardarine, GW-0742)
 *   Metabolic:        8 (MOTS-C, SR-9009/9011, SLU-PP-332, AICAR,
 *                        T3, T4, Clenbuterol, Metformin)
 *   Performance:      2 (Melanotan II, Semax)
 *   Anti-Aging:       2 (Epitalon, Pregnenolone)
 *   Nootropic:       15 (full cognitive spectrum + 3 support)
 *   Cycle Support:    9 (SERMs, AIs, ED, prolactin)
 *   Hair Support:     4 (Fin, Dut, Oral Min, RU58841)
 *
 *   Total expansion: 63 compounds
 *   Combined database (with original 8): 71 compounds
 *
 * RISK TIER DISTRIBUTION:
 *   very_low:        4
 *   low:            13
 *   low_mod:        10
 *   moderate:       10
 *   mod_high:       12
 *   high:            4 (have displayWarning set)
 *   unknown:         2 (have displayWarning set)
 *
 * FUTURE UI ENHANCEMENTS (not required, but unlocked by extended fields):
 *   1. Risk-tier gating in recommendations.js — filter by riskTier
 *      to show only default-tier compounds unless user opts in.
 *   2. Display warning banners on CompoundCard when displayWarning
 *      field is present.
 *   3. Experience-level filtering — beginner/intermediate/advanced.
 *   4. Category color mapping additions in CompoundCard.jsx for the
 *      new categories (SARM, Nootropic, Cycle Support, Hair Support,
 *      Metabolic, Hormonal). Currently render as default gray.
 *
 * FOR RESEARCH AND EDUCATIONAL PURPOSES ONLY. NOT MEDICAL ADVICE.
 * ────────────────────────────────────────────────────────────
 */
