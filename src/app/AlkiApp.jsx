"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import StackIntelligence, { analyzeStack, getStackSuggestions } from "./components/StackIntelligence";
import StackGenerator from "./components/StackGenerator";
import AlkiProtocolQA from "./screens/AlkiProtocolQA";
import CycleTimeline from "./components/CycleTimeline";
import { EXPANDED_COMPOUNDS } from "./data/compounds-expanded";
import Body3DAvatar from "./avatar/Body3DAvatar";
import AvaturnCapture from "./avatar/AvaturnCapture";
import { AVATURN_ENABLED } from "./avatar/avaturnConfig";
import PeptideModeler from "./components/PeptideModeler";
import ProgressLog from "./screens/ProgressLog";
import ProtocolGuideView from "./screens/ProtocolGuideView";
import ProgressPhotos from "./screens/ProgressPhotos";
import { getCultivationState, getCultivationVisuals } from "./lib/cultivation";
import { supabase } from "./lib/supabase";
import { resolveMorphStates } from "./lib/morphTargets";
import { getStackVectors } from "./lib/compoundMorphVectors";
import FeedbackFAB from "./components/utilities/FeedbackFAB";
import PerfHUD from "./components/utilities/PerfHUD";

// ─────────────────────────────────────────────────────────────
// Default 3D parametric body. This is the always-on avatar. "Reset"
// returns to this (not null). Female mesh TBD (Phase 3) — same shape-key
// vocabulary, will branch on profile.sex when available.
const DEFAULT_AVATAR_URL = "/alki_humgen_male.glb";
// ─────────────────────────────────────────────────────────────
// Public site URL — used for auth redirect links (password reset) so the
// email ALWAYS points at the deployed app, never localhost. Set
// NEXT_PUBLIC_SITE_URL in Vercel project settings to the production URL
// (e.g. https://alki.vercel.app). Falls back to current origin only if the
// env var is missing, so local dev still functions.
const SITE_URL =
  (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "");
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// The import above adds 63 compounds via `data/compounds-expanded.js`.
// The original 8 compounds remain inline below, untouched.
// To revert: remove this import line AND remove the
// `...EXPANDED_COMPOUNDS` spread at the end of the COMPOUNDS array.
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════
// ALKI — ἀλκή — The AI-Powered Peptide Intelligence Platform
// Complete MVP: Onboarding → Intelligence → Avatar → Transform
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// App version — bump on every commit so testers can confirm which deploy
// they're viewing. Shown on the splash/enter screen (upper-left).
const APP_VERSION = "0.1.95";
// Auto build id from Vercel's git commit SHA (wired in next.config.mjs).
// Updates on every deploy with no manual bump; "dev" when running locally.
const BUILD_SHA = (process.env.NEXT_PUBLIC_COMMIT_SHA || "dev").slice(0, 7);

// Baseline test profile — average male, useful neutral starting point
// for evaluating stacks and testing the new-user flow without creating
// an account. Triggered from the auth screen.
const BASELINE_PROFILE = {
  sex: "male",
  age: 28,
  heightFt: 5,
  heightIn: 10,
  weight: 185,
  bodyFat: 20,
  goals: ["fat_loss", "muscle", "recovery"],
  adv: { skelMuscle: "39.4", fatFreeMass: "148", subFat: "16.2", visceralFat: "8", bodyWater: "55.8", muscleMass: "73", boneMass: "7.4", bmr: "1810" }
};

// #47 repro — lean user + the 10-compound "banger" stack that crashed the
// committed home. Loads straight into the dashboard builder so the crash
// flow (project → lock in → main) can be reproduced in a couple of taps.
const CRASH_REPRO_PROFILE = {
  sex: "male",
  age: 28,
  heightFt: 5,
  heightIn: 7,
  weight: 138,
  bodyFat: 7.5,
  goals: ["muscle", "fat_loss", "recovery"],
  adv: { skelMuscle: "59.8", fatFreeMass: "128.9", subFat: "7.1", visceralFat: "3", bodyWater: "66.7", muscleMass: "122.7", boneMass: "6.2", bmr: "1633" }
};
const CRASH_REPRO_STACK = ["rad140", "lgd4033", "mk677", "fragment176", "sr9009", "bpc157", "cjc1295_nodac", "ipamorelin", "tb500", "tadalafil"];
// ─────────────────────────────────────────────────────────────

// ── COMPOUND DATABASE ──────────────────────────────────────
const COMPOUNDS = [
  {
    id: "bpc157",
    name: "BPC-157",
    category: "Recovery",
    tagline: "The Wolverine Peptide",
    mechanism: "Gastric pentadecapeptide that accelerates tissue repair via angiogenesis, nitric oxide modulation, and growth factor upregulation.",
    keyBenefits: ["Tendon & ligament repair", "Gut healing", "Systemic anti-inflammatory", "Neuroprotective effects"],
    dosing: "250–500 mcg/day SubQ",
    cycle: "4–6 weeks on, 2 weeks off",
    route: "Subcutaneous injection near injury site or abdomen",
    pros: ["Extensive preclinical evidence for tissue repair", "Well-tolerated in available human data", "Versatile: gut, tendon, ligament, muscle", "Pairs synergistically with TB-500"],
    cons: ["Most research is preclinical (rodent models)", "Not FDA-approved for any indication", "Injectable formulation requires sterile technique", "Oral bioavailability is debated"],
    effects: { bf: 0, muscle: 0.5, skin: 1, recovery: 5 },
    suitability: { minBf: 0, maxBf: 100, goals: ["recovery", "performance"] },
    contraindications: [],
    visualChange: false
  },
  {
    id: "tb500",
    name: "TB-500",
    category: "Recovery",
    tagline: "Systemic Healing Factor",
    mechanism: "Synthetic fragment of thymosin beta-4 that promotes cell migration, reduces inflammation, and supports systemic tissue repair.",
    keyBenefits: ["Whole-body healing acceleration", "Flexibility improvement", "Cardiac tissue protection", "Synergistic with BPC-157"],
    dosing: "2.5 mg 2x/week (loading), then 2.5 mg/week",
    cycle: "6–8 weeks loading, 4 weeks maintenance",
    route: "Subcutaneous injection",
    pros: ["Systemic healing; not site-specific like BPC-157", "Strong preclinical evidence for cardiac and wound repair", "Excellent synergy in BPC-157/TB-500 stack", "Supports flexibility and joint health"],
    cons: ["Preclinical data predominates", "Higher cost per cycle than BPC-157", "Some users report temporary fatigue during loading", "Not FDA-approved"],
    effects: { bf: 0, muscle: 0.3, skin: 0.5, recovery: 4 },
    suitability: { minBf: 0, maxBf: 100, goals: ["recovery", "performance"] },
    contraindications: [],
    visualChange: false
  },
  {
    id: "ipacjc",
    name: "Ipamorelin + CJC-1295",
    category: "Growth Hormone",
    tagline: "The Clean GH Stack",
    mechanism: "Ipamorelin is a selective GH secretagogue; CJC-1295 (DAC) extends GH release duration. Together they amplify pulsatile GH output without cortisol or prolactin spikes.",
    keyBenefits: ["Lean mass accrual", "Fat redistribution & reduction", "Deep sleep enhancement", "Recovery acceleration"],
    dosing: "200–300 mcg each, combined injection, 5 days on / 2 off",
    cycle: "8–12 weeks, with 4-week breaks between cycles",
    route: "Subcutaneous injection, pre-bed or AM fasted",
    pros: ["Selective GH release without cortisol/prolactin elevation", "Synergistic stack amplifies results vs either alone", "Improves sleep architecture; users report deeper sleep", "Supports body recomposition: simultaneous fat loss and lean gain"],
    cons: ["Requires consistent daily injection schedule", "Results are gradual; full effects at 6–8 weeks", "Water retention possible in first 2 weeks", "Cost of two compounds adds up"],
    effects: { bf: -2.5, muscle: 3, skin: 1.5, recovery: 2 },
    suitability: { minBf: 8, maxBf: 30, goals: ["muscle", "fat_loss", "recovery", "anti_aging", "performance"] },
    contraindications: [],
    visualChange: true
  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    category: "Fat Loss",
    tagline: "Visceral Fat Eliminator",
    mechanism: "GHRH analog that stimulates endogenous GH release, with FDA-documented efficacy for reducing visceral adipose tissue.",
    keyBenefits: ["Targeted visceral fat reduction", "GH stimulation via natural pathway", "FDA-approved mechanism (for lipodystrophy)", "Cognitive benefits in emerging research"],
    dosing: "1–2 mg/day SubQ",
    cycle: "12–26 weeks continuous",
    route: "Subcutaneous injection, abdomen",
    pros: ["FDA-approved for lipodystrophy; established safety data", "Specifically targets visceral fat (the dangerous kind)", "Stimulates natural GH pathway", "Emerging evidence for cognitive benefits (Alzheimer's research)"],
    cons: ["Higher cost than most peptides ($200+/month)", "Daily injection commitment", "Less effective for subcutaneous fat than GLP-1s", "May cause injection site reactions"],
    effects: { bf: -2, muscle: 1, skin: 0.5, recovery: 0.5 },
    suitability: { minBf: 15, maxBf: 100, goals: ["fat_loss", "anti_aging", "performance"] },
    contraindications: ["below15bf"],
    visualChange: true
  },
  {
    id: "semaglutide",
    name: "Semaglutide",
    category: "Weight Loss",
    tagline: "The GLP-1 Standard",
    mechanism: "GLP-1 receptor agonist that reduces appetite, slows gastric emptying, and improves insulin sensitivity. The compound behind Ozempic and Wegovy.",
    keyBenefits: ["Significant weight loss (15–20% body weight)", "Appetite suppression", "Metabolic improvement", "Cardiovascular risk reduction"],
    dosing: "0.25 mg/week escalating to 2.4 mg/week over 16 weeks",
    cycle: "Ongoing; weight regain common upon discontinuation",
    route: "Subcutaneous injection, weekly",
    pros: ["Most robust clinical evidence of any compound on this list", "FDA-approved for weight management (Wegovy)", "Once-weekly dosing; highest compliance", "Cardiovascular and metabolic benefits beyond weight loss"],
    cons: ["Significant muscle mass loss without resistance training", "GI side effects (nausea, constipation) common during titration", "Weight regain upon discontinuation is well-documented", "Not appropriate for lean individuals; depletes necessary mass"],
    effects: { bf: -6, muscle: -1.5, skin: 0, recovery: 0 },
    suitability: { minBf: 22, maxBf: 100, goals: ["fat_loss"] },
    contraindications: ["below15bf", "below22bf_glp1"],
    visualChange: true
  },
  {
    id: "retatrutide",
    name: "Retatrutide",
    category: "Weight Loss",
    tagline: "The Triple Agonist",
    mechanism: "Triple agonist targeting GLP-1, GIP, and glucagon receptors simultaneously. The most powerful weight loss compound in current research.",
    keyBenefits: ["Superior weight loss vs semaglutide in trials", "Triple receptor activation", "Metabolic reset potential", "Active Phase 3 trials"],
    dosing: "Research phase; 4–12 mg/week in clinical trials",
    cycle: "Ongoing; research protocols vary",
    route: "Subcutaneous injection, weekly",
    pros: ["Phase 2 data showed up to 24% body weight loss at 48 weeks", "Triple agonist mechanism targets more metabolic pathways", "Potentially superior to semaglutide and tirzepatide", "Strong pharmaceutical pipeline backing (Eli Lilly)"],
    cons: ["Not yet FDA-approved; still in clinical trials", "Dosing protocols not finalized", "GI side effects expected similar to or greater than semaglutide", "Same muscle loss concerns as all GLP-1 class compounds"],
    effects: { bf: -8, muscle: -2, skin: 0, recovery: 0 },
    suitability: { minBf: 22, maxBf: 100, goals: ["fat_loss"] },
    contraindications: ["below15bf", "below22bf_glp1"],
    visualChange: true
  },
  {
    id: "ghkcu",
    name: "GHK-Cu",
    category: "Anti-Aging",
    tagline: "The Regeneration Signal",
    mechanism: "Copper-binding tripeptide that resets gene expression toward a regenerative profile, stimulating collagen synthesis, stem cell activity, and antioxidant enzyme production.",
    keyBenefits: ["Collagen and elastin stimulation", "Skin texture and luminosity", "Wound healing acceleration", "Anti-inflammatory gene regulation"],
    dosing: "1–2 mg/day SubQ or topical",
    cycle: "30-day cycles with 2-week breaks",
    route: "Subcutaneous injection or topical cream",
    pros: ["Dual delivery options (injectable and topical)", "Strong evidence for skin quality and wound healing", "Resets 4,000+ genes toward a younger expression profile", "Well-tolerated; copper peptide has long safety history"],
    cons: ["Skin quality changes are gradual (4–8 weeks visible)", "Injectable form is more effective but requires commitment", "Topical penetration varies by formulation quality", "Not a body composition compound; purely regenerative"],
    effects: { bf: 0, muscle: 0, skin: 4, recovery: 1.5 },
    suitability: { minBf: 0, maxBf: 100, goals: ["anti_aging", "skin", "recovery"] },
    contraindications: [],
    visualChange: false
  },
  {
    id: "pt141",
    name: "PT-141",
    category: "Performance",
    tagline: "Central Activation",
    mechanism: "Melanocortin receptor agonist that works via CNS activation rather than vascular mechanisms. FDA-approved pathway (Vyleesi).",
    keyBenefits: ["CNS-mediated performance enhancement", "Works regardless of vascular status", "FDA-approved mechanism", "On-demand dosing"],
    dosing: "1.75 mg as needed, max 2x/week",
    cycle: "As needed; not a daily protocol",
    route: "Subcutaneous injection, 45 min before desired effect",
    pros: ["FDA-approved mechanism via Vyleesi", "CNS pathway; works when vascular compounds do not", "On-demand dosing; no daily commitment", "Both male and female applications"],
    cons: ["Nausea is common side effect (30–40% of users)", "Should not be used more than 2x per week", "Can cause temporary skin flushing or darkening", "Not a body composition compound"],
    effects: { bf: 0, muscle: 0, skin: 0, recovery: 0 },
    suitability: { minBf: 0, maxBf: 100, goals: ["performance"] },
    contraindications: [],
    visualChange: false
  },
  // ─────────────────────────────────────────────────────────
  // Expansion (63 compounds). Source: ./data/compounds-expanded.js
  // To revert: remove the line below and the import at the top.
  // ─────────────────────────────────────────────────────────
  ...EXPANDED_COMPOUNDS
];

// Category color tokens — shared between CompoundCard, stack badges, and any
// other surface that wants a consistent per-category accent.
const CAT_COLORS = {
  Recovery: "#3b82f6",
  "Growth Hormone": "#a855f7",
  "Fat Loss": "#f59e0b",
  "Weight Loss": "#ef4444",
  "Anti-Aging": "#ec4899",
  Performance: "#06b6d4",
  SARM: "#ea580c",
  Nootropic: "#6366f1",
  "Cycle Support": "#10b981",
  "Hair Support": "#14b8a6",
  Metabolic: "#eab308",
  Hormonal: "#f43f5e",
  Cosmetic: "#f783ac"
};

const GOALS = [
  { id: "fat_loss", label: "Fat Loss", icon: "🔥" },
  { id: "muscle", label: "Muscle Gain", icon: "💪" },
  { id: "recovery", label: "Recovery", icon: "🩹" },
  { id: "anti_aging", label: "Anti-Aging", icon: "⏳" },
  { id: "skin", label: "Skin Quality", icon: "✨" },
  { id: "energy", label: "Energy", icon: "⚡" },
  { id: "performance", label: "Performance", icon: "🎯" }
];

// ── RECOMMENDATION ENGINE ──────────────────────────────────
// No blocking. Every compound is always available. Ranked by relevance.
// Advisories inform; they never gatekeep.
function getRecommendations(profile) {
  const { sex, age, heightFt, heightIn, weight, bodyFat, goals = [], adv = {} } = profile;

  // Parse optional advanced body stats — only applied when user actually entered them
  const visceralFat  = parseFloat(adv.visceralFat)  || null;
  const skelMuscle   = parseFloat(adv.skelMuscle)   || null;
  const muscleMassLb = parseFloat(adv.muscleMass)   || null;
  const fatFreeMass  = parseFloat(adv.fatFreeMass)  || null;
  const subFat       = parseFloat(adv.subFat)       || null;
  const bodyWater    = parseFloat(adv.bodyWater)    || null;
  const boneMass     = parseFloat(adv.boneMass)     || null;
  const bmr          = parseFloat(adv.bmr)          || null;

  const results = [];

  for (const compound of COMPOUNDS) {
    let score = 0;
    let flags = [];

    // Goal matching — primary ranking signal
    const goalOverlap = goals.filter(g => compound.suitability.goals.includes(g));
    score += goalOverlap.length * 25;

    // BF-contextual advisories — informational, never blocking
    if (compound.contraindications.includes("below15bf") && bodyFat < 15) {
      flags.push("At your body fat level, this compound's primary mechanism may yield diminished results. Understand the trade-offs.");
      score -= 5;
    }
    if (compound.contraindications.includes("below22bf_glp1") && bodyFat < 22) {
      flags.push("Below 22% BF, GLP-1 compounds carry lean mass depletion risk. Consider pairing with GH peptides if running lean.");
      score -= 10;
    }

    // BF-specific boosts
    if (bodyFat > 22 && compound.category === "Weight Loss") score += 30;
    if (bodyFat > 28 && compound.category === "Weight Loss") score += 20;
    if (bodyFat < 18 && compound.category === "Growth Hormone") score += 15;
    if (bodyFat < 15 && compound.category === "Recovery") score += 10;
    if (goals.includes("recovery") && compound.category === "Recovery") score += 20;
    if (goals.includes("anti_aging") && compound.id === "ghkcu") score += 20;
    if (goals.includes("skin") && compound.id === "ghkcu") score += 25;
    if (goals.includes("muscle") && compound.id === "ipacjc") score += 15;

    // ── Advanced body stats signals (only fire when user provided the value) ──

    // High visceral fat → fat-loss-targeting compounds
    if (visceralFat !== null) {
      if (visceralFat >= 10 && compound.id === "tesamorelin") {
        score += 25;
        flags.push(`High visceral fat (level ${visceralFat}) — Tesamorelin's FDA-approved mechanism targets visceral adipose specifically.`);
      }
      if (visceralFat >= 10 && compound.id === "fragment176") {
        score += 15;
        if (!flags.some(f => f.includes("visceral"))) flags.push(`High visceral fat (level ${visceralFat}) — Fragment 176-191 targets fat oxidation.`);
      }
      if (visceralFat >= 12 && compound.category === "Weight Loss") {
        score += 12;
        if (!flags.some(f => f.includes("visceral"))) flags.push(`Visceral fat level ${visceralFat} supports GLP-1 prioritization.`);
      }
      if (visceralFat >= 12 && (compound.category === "Fat Loss" || compound.category === "Metabolic")) {
        score += 10;
        if (!flags.some(f => f.includes("visceral"))) flags.push(`Visceral fat level ${visceralFat} — fat-loss and metabolic compounds prioritized.`);
      }
    }

    // Low skeletal muscle % → prioritize GH peptides for lean mass
    // Sex-adjusted: men optimal 38–44%, women 34–40%
    if (skelMuscle !== null) {
      const lowThreshold = sex === "female" ? 34 : 38;
      if (skelMuscle < lowThreshold) {
        if (compound.id === "ipacjc") { score += 20; flags.push(`Low skeletal muscle % (${skelMuscle}%) — GH stack prioritized to support lean mass.`); }
        if (compound.id === "tesamorelin") score += 10;
        if (compound.category === "Growth Hormone" && compound.id !== "ipacjc") {
          score += 12;
          if (!flags.some(f => f.includes("skeletal muscle"))) flags.push(`Low skeletal muscle % (${skelMuscle}%) — GH-axis peptides prioritized.`);
        }
      }
      if (skelMuscle > (sex === "female" ? 42 : 46)) {
        if (compound.id === "bpc157" || compound.id === "tb500") score += 8;
        if (compound.category === "Recovery" && compound.id !== "bpc157" && compound.id !== "tb500") score += 5;
      }
    }

    // Low muscle mass ratio relative to body weight
    if (muscleMassLb !== null && weight !== null) {
      const musclePct = (muscleMassLb / weight) * 100;
      if (musclePct < 40 && (compound.id === "ipacjc" || compound.id === "tesamorelin")) {
        score += 10;
        if (!flags.some(f => f.includes("muscle"))) flags.push("Low muscle mass ratio — GH peptides prioritized.");
      }
      if (musclePct < 40 && compound.category === "Growth Hormone" && compound.id !== "ipacjc") {
        score += 7;
      }
    }

    // High subcutaneous fat → GHK-Cu for skin quality
    if (subFat !== null && subFat > 20 && compound.id === "ghkcu") {
      score += 12;
      flags.push(`Elevated subcutaneous fat (${subFat}%) — GHK-Cu supports collagen and skin quality.`);
    }

    // Low body water % → GH axis support (GH influences cellular hydration/tissue quality)
    if (bodyWater !== null) {
      const lowWater = sex === "female" ? 45 : 50;
      if (bodyWater < lowWater && compound.id === "ipacjc") {
        score += 8;
        flags.push(`Low body water % (${bodyWater}%) — GH axis support relevant for tissue quality.`);
      }
      if (bodyWater < lowWater && compound.category === "Growth Hormone" && compound.id !== "ipacjc") {
        score += 5;
      }
    }

    // Low bone mass → GH peptides (IGF-1 is a key signal for bone density maintenance)
    if (boneMass !== null && boneMass < 6) {
      if (compound.id === "ipacjc" || compound.id === "tesamorelin") {
        score += 10;
        flags.push(`Low bone mass (${boneMass} lbs) — IGF-1 stimulation from GH peptides supports bone density.`);
      }
      if (compound.category === "Growth Hormone" && compound.id !== "ipacjc") {
        score += 7;
      }
    }

    // Low BMR → metabolic compounds and GH peptides to support resting metabolism
    if (bmr !== null && bmr < 1400) {
      if (compound.id === "tesamorelin") { score += 12; flags.push(`Low BMR (${bmr} kcal/day) — Tesamorelin's GH stimulation supports metabolic rate.`); }
      if (compound.category === "Weight Loss") score += 8;
      if (compound.category === "Metabolic" || compound.category === "Fat Loss") {
        score += 7;
        if (!flags.some(f => f.includes("BMR"))) flags.push(`Low BMR (${bmr} kcal/day) — metabolic compounds support resting energy expenditure.`);
      }
    }

    // ── End advanced signals ──────────────────────────────────────────────────

    // Stack synergy notes
    let stackNotes = [];
    if (compound.id === "bpc157") stackNotes.push("Pairs synergistically with TB-500 for systemic + localized recovery");
    if (compound.id === "tb500") stackNotes.push("Pairs synergistically with BPC-157 for comprehensive healing");
    if (compound.id === "semaglutide") stackNotes.push("Consider pairing with Ipamorelin/CJC-1295 to preserve lean mass during cut");
    if (compound.id === "retatrutide") stackNotes.push("Consider pairing with Ipamorelin/CJC-1295 to preserve lean mass during aggressive cut");
    if (compound.id === "tesamorelin") stackNotes.push("Stacks well with GHK-Cu for combined fat loss and skin quality improvement");

    const relevance = goalOverlap.length > 0 ? "matched" : "available";
    results.push({ compound, score: Math.max(0, score), flags, stackNotes, goalOverlap, relevance });
  }

  // Matched compounds first by score, then available compounds
  results.sort((a, b) => {
    if (a.relevance === "matched" && b.relevance !== "matched") return -1;
    if (a.relevance !== "matched" && b.relevance === "matched") return 1;
    return b.score - a.score;
  });
  return results;
}

// ── AVATAR PARAMETER RESOLVER ──────────────────────────────
// Produces TWO parameter sets per call site (current + projected),
// each containing both the legacy 2-dim params (fat, muscle) used by
// the SVG avatar and the legacy GLB scaler, AND the rich morphState
// used by the new parametric 3D body model.
//
// The morphState only takes effect when a GLB with matching shape
// keys is loaded. With the current Avaturn GLB (no shape keys) the
// renderer falls back to the legacy scaling automatically.
function resolveAvatarParams(profile, selectedCompounds = []) {
  const bf = profile.bodyFat;
  const isMale = profile.sex === "male";

  // Legacy 2-dim params (still used by SVG BodyAvatar + legacy GLB path)
  const baseFat = Math.max(0, Math.min(1, (bf - 6) / 34));
  const baseMuscle = isMale ? 0.5 : 0.35;

  // #21 — projected morph deltas. Per-cycle effects are small: under the old
  // /100 scaling a -6% BF cut moved the SVG waist ~2px — invisible on a phone.
  // Fix: scale the BF effect into the SAME 0..1 space as baseFat (the 6–40%
  // range = ÷34) instead of ÷100, give muscle a calibrated gain, and multiply
  // the projected delta by MORPH_GAIN so before/after reads clearly on mobile —
  // without touching the `current` baseline (the user's real body). Tunable.
  const MORPH_GAIN = 1.8;
  let fatMod = 0;
  let muscleMod = 0;
  let skinMod = 0;

  for (const cid of selectedCompounds) {
    const c = COMPOUNDS.find(x => x.id === cid);
    if (c) {
      fatMod += c.effects.bf / 34;
      muscleMod += c.effects.muscle / 60;
      skinMod += c.effects.skin;
    }
  }

  // #50 — only morph the BODY when the stack moves fat or muscle perceptibly.
  // Recovery/support compounds (BPC-157, TB-500, SERMs) carry tiny incidental
  // bf/muscle values that MORPH_GAIN would otherwise exaggerate into a fake
  // before/after. Snap sub-threshold deltas to zero so a healing/support stack
  // shows an identical physique; real fat-loss/muscle-gain stacks still morph.
  const FAT_DEADZONE = 0.03;    // ~1% body fat in the normalized (÷34) space
  const MUSCLE_DEADZONE = 0.015; // ~0.9 muscle units (÷60) — lets real builders (MK-677) morph, keeps recovery (BPC/TB) flat
  if (Math.abs(fatMod) < FAT_DEADZONE) fatMod = 0;
  if (Math.abs(muscleMod) < MUSCLE_DEADZONE) muscleMod = 0;

  // Rich morph state for the parametric 3D body model
  let morphStates = { current: null, projected: null };
  try {
    const stackVectors = getStackVectors(selectedCompounds, COMPOUNDS);
    morphStates = resolveMorphStates(profile, stackVectors);
  } catch (e) {
    // If anything in the morph system errors, fall back silently —
    // SVG and legacy GLB scaling still work without morphState.
    console.error("[Alki] morph resolve failed:", e);
  }

  return {
    current: {
      fat: baseFat,
      muscle: baseMuscle,
      skin: 0,
      isMale,
      morphState: morphStates.current
    },
    projected: {
      fat: Math.max(0, Math.min(1, baseFat + fatMod * MORPH_GAIN)),
      muscle: Math.max(0, Math.min(1, baseMuscle + muscleMod * MORPH_GAIN)),
      skin: skinMod * MORPH_GAIN,
      isMale,
      morphState: morphStates.projected
    }
  };
}

// ── SVG AVATAR COMPONENT ───────────────────────────────────
// Athletic wear + anatomical definition. The body is visible because
// the entire point of the projected eidolon is showing physique change.
// Definition lines (abs, pecs, obliques, delts, quads) fade in as BF drops:
// fully visible at ~8% BF, gone by 20% BF. Muscle-driven lines (biceps,
// quad sweep) scale independently with the muscle param.
function BodyAvatar({ params, label, glow = false, maxWidth = 180 }) {
  const { fat, muscle, isMale } = params;

  // Derived dimensions
  const shoulderW = isMale ? 52 + muscle * 30 : 42 + muscle * 20;
  const chestW = isMale ? 44 + muscle * 20 + fat * 10 : 38 + muscle * 12 + fat * 10;
  const waistW = 28 + fat * 32 + (isMale ? 0 : fat * 6);
  const hipW = isMale ? 34 + fat * 16 : 40 + fat * 20 + muscle * 4;
  const armW = 6 + muscle * 6 + fat * 4;
  const thighW = isMale ? 14 + muscle * 8 + fat * 8 : 16 + muscle * 6 + fat * 10;
  const calfW = 8 + muscle * 4 + fat * 3;
  const neckW = 10 + muscle * 4 + fat * 4;
  const trapH = muscle * 6;

  const cx = 100;
  const headY = 28;
  const neckY = 48;
  const shoulderY = 58 + trapH;
  const chestY = 78;
  const waistY = 108;
  const hipY = 128;
  const kneeY = 185;
  const ankleY = 230;
  const footY = 240;

  // ── Definition layer (Plan B) ────────────────────────────────────
  // Recover BF% from the normalized 0..1 fat param (inverse of resolveAvatarParams).
  const bfPercent = 6 + fat * 34;
  // Anatomical definition opacity: fully visible <= 8% BF, fades to 0 by 20% BF.
  const defOpacity = Math.max(0, Math.min(1, (20 - bfPercent) / 12));
  // Hide fine anatomical lines at small render sizes (thumbnails, switcher cards).
  const showDetail = maxWidth >= 150;
  const defStrokeMinor = `rgba(255,255,255,${defOpacity * 0.4})`;
  const defStrokeMajor = `rgba(255,255,255,${defOpacity * 0.55})`;
  // Muscle-driven stroke (biceps, quads) — fades in independently of BF.
  const muscleOpacity = Math.max(0, (muscle - 0.35) * 0.9);
  const muscleStroke = `rgba(255,255,255,${muscleOpacity})`;

  // Athletic wear
  const wearFill = "#1a1a1a";
  const wearAccent = "#2a2a2a";
  const shortsTopY = hipY - 6;
  const shortsBottomY = hipY + 30;
  const braTopY = chestY - 12;
  const braBottomY = chestY + 12;

  const skinColor = glow ? "#d4a574" : "#c4956a";
  const skinDark = glow ? "#c49464" : "#b4855a";
  const glowFilter = glow ? "url(#avatarGlow)" : "";

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 260" style={{ width: "100%", maxWidth }}>
        {glow && (
          <defs>
            <filter id="avatarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="glowOverlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1ae87a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1ae87a" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        )}

        <g filter={glowFilter}>
          {/* Head */}
          <ellipse cx={cx} cy={headY} rx={12 + fat * 3} ry={14 + fat * 2} fill={skinColor} />
          {/* Ears */}
          <ellipse cx={cx - 12 - fat * 3} cy={headY + 1} rx={2.5} ry={4} fill={skinDark} />
          <ellipse cx={cx + 12 + fat * 3} cy={headY + 1} rx={2.5} ry={4} fill={skinDark} />

          {/* Neck */}
          <rect x={cx - neckW / 2} y={neckY - 6} width={neckW} height={shoulderY - neckY + 6} rx={neckW / 3} fill={skinColor} />

          {/* Traps */}
          {trapH > 1 && (
            <path d={`M${cx - neckW / 2} ${neckY} Q${cx - shoulderW / 2 - 4} ${shoulderY - 4} ${cx - shoulderW / 2} ${shoulderY} L${cx + shoulderW / 2} ${shoulderY} Q${cx + shoulderW / 2 + 4} ${shoulderY - 4} ${cx + neckW / 2} ${neckY} Z`} fill={skinColor} />
          )}

          {/* Torso */}
          <path d={`
            M${cx - shoulderW / 2} ${shoulderY}
            Q${cx - chestW / 2 - 4} ${chestY - 8} ${cx - chestW / 2} ${chestY}
            Q${cx - waistW / 2 - 2} ${(chestY + waistY) / 2} ${cx - waistW / 2} ${waistY}
            Q${cx - hipW / 2 - 2} ${(waistY + hipY) / 2} ${cx - hipW / 2} ${hipY}
            L${cx + hipW / 2} ${hipY}
            Q${cx + hipW / 2 + 2} ${(waistY + hipY) / 2} ${cx + waistW / 2} ${waistY}
            Q${cx + waistW / 2 + 2} ${(chestY + waistY) / 2} ${cx + chestW / 2} ${chestY}
            Q${cx + chestW / 2 + 4} ${chestY - 8} ${cx + shoulderW / 2} ${shoulderY}
            Z
          `} fill={skinColor} />

          {/* Pec shading (male, muscle-driven) */}
          {isMale && muscle > 0.3 && (
            <>
              <ellipse cx={cx - 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
              <ellipse cx={cx + 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
            </>
          )}

          {/* ── ANATOMICAL DEFINITION (on bare torso) ─────────────── */}
          {/* Male: pec separation + pec undercurves + 6-pack grid */}
          {showDetail && defOpacity > 0.02 && isMale && (
            <g>
              {/* Pec separation / sternum line */}
              <line x1={cx} y1={chestY - 6} x2={cx} y2={chestY + 10} stroke={defStrokeMajor} strokeWidth="0.8" />
              {/* Pec bottom curves */}
              <path d={`M${cx - chestW / 2 + 4} ${chestY + 8} Q${cx - 5} ${chestY + 13} ${cx - 1.5} ${chestY + 9}`} stroke={defStrokeMinor} strokeWidth="0.7" fill="none" />
              <path d={`M${cx + 1.5} ${chestY + 9} Q${cx + 5} ${chestY + 13} ${cx + chestW / 2 - 4} ${chestY + 8}`} stroke={defStrokeMinor} strokeWidth="0.7" fill="none" />
              {/* Linea alba — vertical center line through abs */}
              <line x1={cx} y1={chestY + 14} x2={cx} y2={waistY + 4} stroke={defStrokeMajor} strokeWidth="0.7" />
              {/* Three transverse ab lines (6-pack grid) */}
              {[0.28, 0.55, 0.82].map(t => {
                const y = chestY + 14 + (waistY + 4 - chestY - 14) * t;
                const lineW = waistW / 3 + 1;
                return (
                  <line key={`ab${t}`} x1={cx - lineW} y1={y} x2={cx + lineW} y2={y} stroke={defStrokeMinor} strokeWidth="0.5" />
                );
              })}
            </g>
          )}

          {/* Obliques — both genders, fade with BF */}
          {showDetail && defOpacity > 0.1 && (
            <g>
              <path d={`M${cx - waistW / 2 + 1} ${chestY + 18} Q${cx - waistW / 2 - 1.5} ${waistY + 2} ${cx - hipW / 3} ${hipY - 4}`} stroke={defStrokeMinor} strokeWidth="0.55" fill="none" />
              <path d={`M${cx + waistW / 2 - 1} ${chestY + 18} Q${cx + waistW / 2 + 1.5} ${waistY + 2} ${cx + hipW / 3} ${hipY - 4}`} stroke={defStrokeMinor} strokeWidth="0.55" fill="none" />
            </g>
          )}

          {/* Female midriff tone — single subtle linea alba */}
          {showDetail && defOpacity > 0.1 && !isMale && (
            <line x1={cx} y1={chestY + 16} x2={cx} y2={waistY + 4} stroke={defStrokeMinor} strokeWidth="0.5" />
          )}

          {/* Arms (with deltoid caps + definition) */}
          {[-1, 1].map(side => {
            const sx = cx + side * (shoulderW / 2);
            const elbowX = cx + side * (shoulderW / 2 + 8 + fat * 2);
            const elbowY = shoulderY + 42;
            const wristX = cx + side * (shoulderW / 2 + 4);
            const wristY = waistY + 16;
            return (
              <g key={side}>
                {/* Upper arm */}
                <path d={`
                  M${sx - side * armW / 2} ${shoulderY + 2}
                  Q${elbowX - side * armW / 2} ${elbowY} ${elbowX - side * (armW * 0.4)} ${elbowY}
                  L${elbowX + side * (armW * 0.4)} ${elbowY}
                  Q${elbowX + side * armW / 2} ${elbowY} ${sx + side * armW / 2} ${shoulderY + 2}
                  Z
                `} fill={skinColor} />
                {/* Forearm */}
                <path d={`
                  M${elbowX - side * (armW * 0.4)} ${elbowY}
                  Q${wristX - side * 3} ${wristY} ${wristX - side * 2.5} ${wristY + 4}
                  L${wristX + side * 2.5} ${wristY + 4}
                  Q${wristX + side * 3} ${wristY} ${elbowX + side * (armW * 0.4)} ${elbowY}
                  Z
                `} fill={skinColor} />
                {/* Hand */}
                <ellipse cx={wristX} cy={wristY + 8} rx={3.5} ry={5} fill={skinDark} />

                {/* Deltoid cap */}
                <ellipse cx={sx} cy={shoulderY} rx={armW / 2 + muscle * 3} ry={5 + muscle * 4} fill={skinColor} />

                {/* Deltoid cap separation arc (delt-to-arm) */}
                {showDetail && defOpacity > 0.05 && (
                  <path
                    d={`M${sx - side * 0.5} ${shoulderY - 2 - muscle * 2} Q${sx + side * (armW / 2 + 1.5)} ${shoulderY + 3} ${sx - side * 0.5} ${shoulderY + 8 + muscle * 2}`}
                    stroke={defStrokeMinor}
                    strokeWidth="0.6"
                    fill="none"
                  />
                )}

                {/* Bicep peak (muscle-driven) */}
                {showDetail && muscle > 0.4 && (
                  <path
                    d={`M${elbowX - side * (armW * 0.4)} ${shoulderY + 22} Q${elbowX - side * (armW * 0.05)} ${shoulderY + 30} ${elbowX - side * (armW * 0.4)} ${shoulderY + 38}`}
                    stroke={muscleStroke}
                    strokeWidth="0.5"
                    fill="none"
                  />
                )}

                {/* Forearm definition (BF-driven) */}
                {showDetail && defOpacity > 0.2 && (
                  <line
                    x1={wristX - side * 1.5}
                    y1={elbowY + 8}
                    x2={wristX - side * 0.5}
                    y2={wristY - 4}
                    stroke={defStrokeMinor}
                    strokeWidth="0.4"
                  />
                )}
              </g>
            );
          })}

          {/* Legs */}
          {[-1, 1].map(side => {
            const kneeX = cx + side * (hipW / 3);
            return (
              <g key={`leg${side}`}>
                {/* Thigh */}
                <path d={`
                  M${cx + side * (hipW / 2)} ${hipY}
                  Q${cx + side * (hipW / 2 + 2)} ${(hipY + kneeY) / 2} ${kneeX + side * (thighW / 3)} ${kneeY}
                  L${kneeX - side * (thighW / 3)} ${kneeY}
                  Q${cx + side * (hipW / 4 - 2)} ${(hipY + kneeY) / 2} ${cx + side * (hipW / 4)} ${hipY}
                  Z
                `} fill={skinColor} />
                {/* Calf */}
                <path d={`
                  M${kneeX + side * (thighW / 3)} ${kneeY}
                  Q${kneeX + side * (calfW / 2 + 2)} ${(kneeY + ankleY) / 2 - 8} ${kneeX + side * 3} ${ankleY}
                  L${kneeX - side * 3} ${ankleY}
                  Q${kneeX - side * (calfW / 2)} ${(kneeY + ankleY) / 2 - 8} ${kneeX - side * (thighW / 3)} ${kneeY}
                  Z
                `} fill={skinColor} />
                {/* Foot */}
                <ellipse cx={kneeX + side * 1} cy={footY} rx={6 + fat} ry={3} fill={skinDark} />
              </g>
            );
          })}

          {/* ── ATHLETIC WEAR — drawn over hips & upper legs ──────── */}
          {/* Shorts: waistband at hip, tapers to mid-thigh, inseam in center */}
          <path d={`
            M${cx - hipW / 2 - 1} ${shortsTopY}
            L${cx + hipW / 2 + 1} ${shortsTopY}
            L${cx + hipW / 2 + 1} ${hipY + 4}
            Q${cx + hipW / 2 + 1} ${shortsBottomY - 8} ${cx + hipW / 3 + thighW / 3 + 1} ${shortsBottomY}
            L${cx + 3} ${shortsBottomY + 1}
            L${cx + 1} ${shortsBottomY - 5}
            L${cx - 1} ${shortsBottomY - 5}
            L${cx - 3} ${shortsBottomY + 1}
            L${cx - hipW / 3 - thighW / 3 - 1} ${shortsBottomY}
            Q${cx - hipW / 2 - 1} ${shortsBottomY - 8} ${cx - hipW / 2 - 1} ${hipY + 4}
            Z
          `} fill={wearFill} />
          {/* Waistband stripe */}
          <rect x={cx - hipW / 2 - 1} y={shortsTopY} width={hipW + 2} height={2.5} fill={wearAccent} />

          {/* Sports bra (female) — band + straps + center seam */}
          {!isMale && (
            <g>
              {/* Main band */}
              <path d={`
                M${cx - chestW / 2 - 1} ${braTopY + 3}
                Q${cx - chestW / 2 - 1} ${braTopY} ${cx - chestW / 2 + 3} ${braTopY}
                L${cx + chestW / 2 - 3} ${braTopY}
                Q${cx + chestW / 2 + 1} ${braTopY} ${cx + chestW / 2 + 1} ${braTopY + 3}
                L${cx + chestW / 2} ${braBottomY - 2}
                Q${cx + chestW / 2 - 3} ${braBottomY + 2} ${cx} ${braBottomY + 1}
                Q${cx - chestW / 2 + 3} ${braBottomY + 2} ${cx - chestW / 2} ${braBottomY - 2}
                Z
              `} fill={wearFill} />
              {/* Center seam */}
              <line x1={cx} y1={braTopY + 2} x2={cx} y2={braBottomY} stroke={wearAccent} strokeWidth="0.5" />
              {/* Underbust accent */}
              <path d={`M${cx - chestW / 2 + 2} ${braBottomY - 1} Q${cx} ${braBottomY + 2} ${cx + chestW / 2 - 2} ${braBottomY - 1}`} stroke={wearAccent} strokeWidth="0.6" fill="none" />
              {/* Left strap */}
              <path d={`
                M${cx - chestW / 2 + 5} ${braTopY + 1}
                L${cx - shoulderW / 2 + 4} ${shoulderY + 2}
                L${cx - shoulderW / 2 + 8} ${shoulderY + 2}
                L${cx - chestW / 2 + 9} ${braTopY + 1}
                Z
              `} fill={wearFill} />
              {/* Right strap */}
              <path d={`
                M${cx + chestW / 2 - 5} ${braTopY + 1}
                L${cx + shoulderW / 2 - 4} ${shoulderY + 2}
                L${cx + shoulderW / 2 - 8} ${shoulderY + 2}
                L${cx + chestW / 2 - 9} ${braTopY + 1}
                Z
              `} fill={wearFill} />
            </g>
          )}

          {/* ── LEG DEFINITION (after shorts, visible on thighs/calves) ── */}
          {showDetail && [-1, 1].map(side => {
            const kneeX = cx + side * (hipW / 3);
            // Quad sweep needs either visible muscle OR low BF to show
            const quadVisible = muscle > 0.35 || defOpacity > 0.2;
            if (!quadVisible) return null;
            // Combined opacity from both BF and muscle signals
            const quadOp = Math.min(1, defOpacity * 0.45 + Math.max(0, (muscle - 0.35) * 0.7));
            return (
              <g key={`legdef${side}`}>
                {/* Outer quad sweep — diagonal line on outer thigh */}
                <line
                  x1={cx + side * (hipW / 2 - 3)}
                  y1={shortsBottomY + 3}
                  x2={kneeX + side * (thighW / 3 - 1)}
                  y2={kneeY - 4}
                  stroke={`rgba(255,255,255,${quadOp * 0.5})`}
                  strokeWidth="0.55"
                />
                {/* Inner quad — only at higher muscle / lower BF */}
                {(muscle > 0.5 || defOpacity > 0.4) && (
                  <line
                    x1={cx + side * (hipW / 6)}
                    y1={shortsBottomY + 3}
                    x2={kneeX - side * (thighW / 3 - 1)}
                    y2={kneeY - 4}
                    stroke={`rgba(255,255,255,${quadOp * 0.35})`}
                    strokeWidth="0.4"
                  />
                )}
                {/* Calf split — gastrocnemius shape */}
                {(muscle > 0.4 || defOpacity > 0.3) && (
                  <line
                    x1={kneeX + side * 2}
                    y1={kneeY + 6}
                    x2={kneeX + side * 1.5}
                    y2={(kneeY + ankleY) / 2 + 4}
                    stroke={`rgba(255,255,255,${quadOp * 0.4})`}
                    strokeWidth="0.4"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Projected glow overlay */}
        {glow && (
          <rect x="0" y="0" width="200" height="260" fill="url(#glowOverlay)" />
        )}
      </svg>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: glow ? "#1ae87a" : "rgba(255,255,255,0.5)",
        marginTop: 4
      }}>{label}</div>
    </div>
  );
}

// ── STYLES ─────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#060608",
    color: "#ededed",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    overflow: "hidden"
  },
  inner: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 24px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  accent: "#1ae87a",
  accentDim: "rgba(26,232,122,0.12)",
  accentBorder: "rgba(26,232,122,0.22)",
  card: {
    // #48 — backdrop-filter:blur was on EVERY card. With dozens of cards (up to
    // ~71 in "see all"), any repaint (scroll, a keystroke's cursor blink) forced
    // the compositor to re-blur each layer -> 7-17fps with ZERO JS blocking time.
    // Over the flat #0a0a0a bg the blur was visually negligible; removed it.
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 22,
    marginBottom: 14,
    transition: "border-color 0.25s ease, background 0.25s ease"
  },
  input: {
    width: "100%",
    padding: "15px 18px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s ease, background 0.2s ease"
  },
  btn: {
    width: "100%",
    padding: "17px 24px",
    background: "#1ae87a",
    color: "#060608",
    border: "none",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.03em",
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    transition: "transform 0.15s ease, box-shadow 0.2s ease",
    boxShadow: "0 0 20px rgba(26,232,122,0.15), 0 2px 8px rgba(0,0,0,0.3)"
  },
  btnDisabled: {
    opacity: 0.3,
    cursor: "not-allowed",
    boxShadow: "none"
  },
  btnOutline: {
    width: "100%",
    padding: "15px 24px",
    background: "rgba(26,232,122,0.04)",
    color: "#1ae87a",
    border: "1.5px solid rgba(26,232,122,0.2)",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    letterSpacing: "0.02em",
    transition: "border-color 0.2s ease, background 0.2s ease"
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    marginBottom: 10,
    display: "block",
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace"
  },
  tag: {
    display: "inline-block",
    padding: "8px 16px",
    borderRadius: 100,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginRight: 8,
    marginBottom: 8
  },
  disclaimer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.22)",
    lineHeight: 1.6,
    textAlign: "center",
    padding: "20px 0",
    fontFamily: "'DM Sans', sans-serif"
  }
};

// ── SCREEN COMPONENTS ──────────────────────────────────────

function SplashScreen({ onEnter }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150);
    const t2 = setTimeout(() => setPhase(2), 500);
    const t3 = setTimeout(() => setPhase(3), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center", position: "relative" }}>
      {/* Build version — upper-left, bumped each commit */}
      <div style={{ position: "absolute", top: 16, left: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em", zIndex: 2 }}>
        v{APP_VERSION} · {BUILD_SHA}
      </div>
      {/* Atmospheric gradient orbs */}
      <div style={{ position: "absolute", top: "10%", left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,232,122,0.06) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none", opacity: phase >= 1 ? 1 : 0, transition: "opacity 1.5s ease" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,120,232,0.04) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none", opacity: phase >= 2 ? 1 : 0, transition: "opacity 1.5s ease" }} />

      <div style={{ marginBottom: 56, opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Greek text */}
        <div style={{
          fontSize: 11,
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.18)",
          marginBottom: 20,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 400
        }}>ἀλκή</div>

        {/* Logo mark */}
        <h1 style={{
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          margin: 0,
          lineHeight: 0.9,
          fontFamily: "'Syne', sans-serif"
        }}>
          <span style={{ color: "#fff" }}>AL</span>
          <span style={{
            color: S.accent,
            textShadow: "0 0 40px rgba(26,232,122,0.3), 0 0 80px rgba(26,232,122,0.1)"
          }}>KI</span>
        </h1>

        {/* Decorative line */}
        <div style={{
          width: 48,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(26,232,122,0.4), transparent)",
          margin: "20px auto",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "scaleX(1)" : "scaleX(0)",
          transition: "all 0.6s ease 0.2s"
        }} />

        <p style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 500,
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.6s ease 0.3s"
        }}>
          Peptide Intelligence
        </p>

        <p style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.15)",
          marginTop: 10,
          letterSpacing: "0.06em",
          fontFamily: "'DM Sans', sans-serif",
          fontStyle: "italic",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.6s ease 0.5s"
        }}>
          εἰδωλον · Your Eidolon Awaits
        </p>
      </div>

      <div style={{
        width: "100%",
        maxWidth: 300,
        opacity: phase >= 3 ? 1 : 0,
        transform: phase >= 3 ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)"
      }}>
        <button
          style={S.btn}
          onClick={onEnter}
          onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 0 30px rgba(26,232,122,0.25), 0 4px 12px rgba(0,0,0,0.4)"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = S.btn.boxShadow; }}
        >
          Enter Platform
        </button>
        <p style={{ ...S.disclaimer, marginTop: 24, maxWidth: 280, margin: "24px auto 0", fontSize: 10, lineHeight: 1.7 }}>
          For informational and research purposes only. Not medical advice. Consult a licensed physician before initiating any peptide protocol.
        </p>
        <p style={{ fontSize: 11, color: "rgba(26,232,122,0.3)", marginTop: 14, fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", letterSpacing: "0.06em" }}>
          Happy Researching.
        </p>
      </div>
    </div>
  );
}

function AgeGate({ onConfirm, onDeny }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center", opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)", transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ marginBottom: 44 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "rgba(26,232,122,0.06)",
          border: "1px solid rgba(26,232,122,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 30,
          boxShadow: "0 0 30px rgba(26,232,122,0.06)"
        }}>
          🔒
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Age Verification</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 14, lineHeight: 1.7, maxWidth: 300, margin: "14px auto 0" }}>
          Alki is designed exclusively for adults aged 18 and older. By continuing, you confirm that you are at least 18 years of age.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 300 }}>
        <button
          style={S.btn}
          onClick={onConfirm}
          onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 0 30px rgba(26,232,122,0.25), 0 4px 12px rgba(0,0,0,0.4)"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = S.btn.boxShadow; }}
        >
          I am 18 or older
        </button>
        <button
          style={{ ...S.btnOutline, marginTop: 12 }}
          onClick={onDeny}
        >
          I am under 18
        </button>
      </div>
    </div>
  );
}

function AgeBlocked() {
  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>Access Restricted</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 14, maxWidth: 300, lineHeight: 1.7 }}>
        Alki is not available to individuals under 18 years of age. This restriction is non-negotiable.
      </p>
    </div>
  );
}

function Onboarding({ onComplete, onExitHome, prefill = null, initialStep = 0 }) {
  const [step, setStep] = useState(initialStep);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [data, setData] = useState(prefill ? {
    sex: prefill.sex || "",
    age: prefill.age != null ? String(prefill.age) : "",
    heightFt: prefill.heightFt != null ? String(prefill.heightFt) : "5",
    heightIn: prefill.heightIn != null ? String(prefill.heightIn) : "10",
    weight: prefill.weight != null ? String(prefill.weight) : "",
    bodyFat: prefill.bodyFat != null ? String(prefill.bodyFat) : "",
    goals: prefill.goals || [],
    adv: prefill.adv || { skelMuscle: "", fatFreeMass: "", subFat: "", visceralFat: "", bodyWater: "", muscleMass: "", boneMass: "", bmr: "" }
  } : {
    sex: "", age: "", heightFt: "5", heightIn: "10", weight: "", bodyFat: "", goals: [],
    adv: { skelMuscle: "", fatFreeMass: "", subFat: "", visceralFat: "", bodyWater: "", muscleMass: "", boneMass: "", bmr: "" }
  });

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));
  const setAdv = (k, v) => setData(prev => ({ ...prev, adv: { ...prev.adv, [k]: v } }));
  const toggleGoal = (g) => setData(prev => ({
    ...prev,
    goals: prev.goals.includes(g) ? prev.goals.filter(x => x !== g) : [...prev.goals, g]
  }));

  const bfNum = parseFloat(data.bodyFat);
  const bfFeedback = !isNaN(bfNum) && bfNum > 0 ? (
    bfNum < 8 ? { text: "Competition-level lean. All compounds available for research. Recovery and GH peptides are most commonly studied at this range.", color: "#1ae87a" } :
    bfNum < 15 ? { text: "Athletic range. Full compound spectrum available for research. GH and recovery peptides are frequently studied here; GLP-1 research indicates lean mass risk at this level.", color: "#1ae87a" } :
    bfNum < 22 ? { text: "Healthy range. Full compound spectrum available. Research literature supports body recomposition protocols at this body fat level.", color: "#1ae87a" } :
    bfNum < 30 ? { text: "Research literature indicates GLP-1 compounds show strongest outcomes at this range. Fat loss protocols will be prioritized in your research profile.", color: "#1ae87a" } :
    { text: "Research literature documents strongest GLP-1 clinical results at this body fat percentage. Fat loss protocols will lead your research profile.", color: "#1ae87a" }
  ) : null;

  const steps = [
    // Step 0: Sex
    <div key="sex">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Biological Sex</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>Research protocols and Eidolon rendering are calibrated to biological sex.</p>
      <div style={{ display: "flex", gap: 12 }}>
        {["male", "female"].map(s => (
          <button key={s} onClick={() => { set("sex", s); setStep(1); }} style={{
            flex: 1, padding: "20px 16px",
            background: data.sex === s ? S.accentDim : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${data.sex === s ? S.accent : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, cursor: "pointer", color: data.sex === s ? "#fff" : "rgba(255,255,255,0.6)",
            fontSize: 16, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize"
          }}>
            {s}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Basics
    <div key="basics">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Biometrics</h2>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Age</label>
        <input type="number" placeholder="28" value={data.age} onChange={e => set("age", e.target.value)} style={S.input} min="18" max="99" />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Height</label>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <select value={data.heightFt} onChange={e => set("heightFt", e.target.value)} style={{ ...S.input, appearance: "none" }}>
              {[4,5,6,7].map(f => <option key={f} value={f}>{f} ft</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <select value={data.heightIn} onChange={e => set("heightIn", e.target.value)} style={{ ...S.input, appearance: "none" }}>
              {Array.from({length:12},(_, i) => <option key={i} value={i}>{i} in</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Weight (lbs)</label>
        <input type="number" placeholder="185" value={data.weight} onChange={e => set("weight", e.target.value)} style={S.input} />
      </div>
      <button style={{ ...S.btn, ...((!data.age || !data.weight) ? S.btnDisabled : {}) }} disabled={!data.age || !data.weight} onClick={() => setStep(2)}>
        Continue
      </button>
    </div>,

    // Step 2: Body fat + Advanced accordion
    <div key="bf">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Body Fat Percentage</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>The single most important variable for protocol configuration. Estimate as accurately as possible.</p>
      <input type="number" placeholder="18" value={data.bodyFat} onChange={e => set("bodyFat", e.target.value)} style={{ ...S.input, fontSize: 32, textAlign: "center", fontWeight: 700 }} min="3" max="60" />
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 6 }}>%</div>
      {bfFeedback && (
        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${bfFeedback.color}`, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
          {bfFeedback.text}
        </div>
      )}

      {/* ── Advanced body stats accordion ── */}
      {(() => {
        const advFields = [
          { key: "skelMuscle",  label: "Skeletal Muscle",  unit: "%",    placeholder: "42.3", hint: "From InBody / DEXA" },
          { key: "fatFreeMass", label: "Fat Free Mass",    unit: "lbs",  placeholder: "148",  hint: "Body weight minus fat" },
          { key: "subFat",      label: "Subcutaneous Fat", unit: "%",    placeholder: "14.2", hint: "Fat under the skin" },
          { key: "visceralFat", label: "Visceral Fat",     unit: "lvl",  placeholder: "8",    hint: "Organ fat (1–20 scale)" },
          { key: "bodyWater",   label: "Body Water",       unit: "%",    placeholder: "57.4", hint: "Total body water %" },
          { key: "muscleMass",  label: "Muscle Mass",      unit: "lbs",  placeholder: "138",  hint: "Skeletal muscle weight" },
          { key: "boneMass",    label: "Bone Mass",        unit: "lbs",  placeholder: "7.2",  hint: "Bone mineral content" },
          { key: "bmr",         label: "BMR",              unit: "kcal", placeholder: "1840", hint: "Basal metabolic rate / day" },
        ];
        const filledCount = Object.values(data.adv).filter(Boolean).length;
        return (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setAdvancedOpen(v => !v)}
              style={{
                width: "100%", padding: "13px 16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: advancedOpen ? "10px 10px 0 0" : 10,
                color: "rgba(255,255,255,0.45)",
                fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚗️</span>
                <span>Advanced body stats</span>
                {filledCount > 0 && (
                  <span style={{ background: "rgba(26,232,122,0.15)", color: "#1ae87a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                    {filledCount}/8
                  </span>
                )}
              </span>
              <span style={{ fontSize: 11, transition: "transform 0.2s", display: "inline-block", transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>
            <div style={{
              overflow: "hidden",
              maxHeight: advancedOpen ? 700 : 0,
              transition: "max-height 0.35s ease"
            }}>
              <div style={{
                border: "1px solid rgba(255,255,255,0.1)", borderTop: "none",
                borderRadius: "0 0 10px 10px", padding: "16px 14px 14px"
              }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>
                  Optional — from an InBody machine, DEXA scan, or smart scale. Each field you fill in sharpens your recommendations.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {advFields.map(({ key, label, unit, placeholder, hint }) => (
                    <div key={key}>
                      <label style={{ ...S.label, fontSize: 10, marginBottom: 4 }}>
                        {label} <span style={{ color: "rgba(255,255,255,0.2)" }}>{unit}</span>
                      </label>
                      <input
                        type="number"
                        placeholder={placeholder}
                        value={data.adv[key]}
                        onChange={e => setAdv(key, e.target.value)}
                        style={{ ...S.input, padding: "10px 12px", fontSize: 14 }}
                      />
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 3 }}>{hint}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <button style={{ ...S.btn, marginTop: 20, ...(!data.bodyFat ? S.btnDisabled : {}) }} disabled={!data.bodyFat} onClick={() => setStep(3)}>
        Continue
      </button>
    </div>,

    // Step 3: Goals
    <div key="goals">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Primary Goals</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>Select all that apply. Your goals determine which compounds are surfaced and how your research protocol is configured.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {GOALS.map(g => {
          const active = data.goals.includes(g.id);
          return (
            <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
              ...S.tag,
              background: active ? S.accentDim : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${active ? S.accent : "rgba(255,255,255,0.1)"}`,
              color: active ? "#fff" : "rgba(255,255,255,0.5)"
            }}>
              {g.icon} {g.label}
            </button>
          );
        })}
      </div>
      <button style={{ ...S.btn, marginTop: 28, ...(data.goals.length === 0 ? S.btnDisabled : {}) }} disabled={data.goals.length === 0} onClick={() => {
        const profile = {
          sex: data.sex,
          age: parseInt(data.age),
          heightFt: parseInt(data.heightFt),
          heightIn: parseInt(data.heightIn),
          weight: parseFloat(data.weight),
          bodyFat: parseFloat(data.bodyFat),
          goals: data.goals,
          adv: data.adv
        };
        onComplete(profile);
      }}>
        Generate Research Protocol →
      </button>
    </div>
  ];

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div style={S.inner}>
      {/* Progress bar */}
      <div style={{ padding: "16px 0 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              ← Back
            </button>
          ) : <span />}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Step {step + 1} of {steps.length}
            </div>
            {onExitHome && (
              <button
                onClick={onExitHome}
                style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontFamily: "inherit", fontWeight: 600, letterSpacing: "0.02em" }}
              >
                Exit to Home
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: S.accent, borderRadius: 1, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 40 }}>
        {steps[step]}
      </div>
    </div>
  );
}

function CompoundCard({ rec, isSelected, onToggle, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const c = rec.compound;
  const blocked = rec.blocked;

  const catColor = CAT_COLORS[c.category] || "#888";

  return (
    <div style={{
      ...S.card,
      opacity: blocked ? 0.45 : 1,
      borderColor: isSelected ? S.accent : "rgba(255,255,255,0.08)",
      background: isSelected ? "rgba(26,232,122,0.06)" : "rgba(255,255,255,0.04)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{c.name}</span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: `${catColor}20`, color: catColor, fontWeight: 600 }}>
              {c.category}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>{c.tagline}</div>
        </div>
        {!blocked && (
          <button onClick={onToggle} style={{
            width: 36, height: 36, borderRadius: 10, border: `2px solid ${isSelected ? S.accent : "rgba(255,255,255,0.15)"}`,
            background: isSelected ? S.accent : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: isSelected ? "#060608" : "rgba(255,255,255,0.3)", flexShrink: 0
          }}>
            {isSelected ? "✓" : "+"}
          </button>
        )}
      </div>

      {blocked && rec.flags.length > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#fca5a5", marginBottom: 10 }}>
          ⚠ {rec.flags[0]}
        </div>
      )}

      {!blocked && rec.flags.length > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", fontSize: 12, color: "#fbbf24", marginBottom: 10 }}>
          ⚠ {rec.flags[0]}
        </div>
      )}

      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "8px 0" }}>
        {c.mechanism}
      </p>

      {/* Quick stats row */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
          Research Protocol: {c.dosing}
        </span>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
          {c.cycle}
        </span>
      </div>

      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, lineHeight: 1.4, fontStyle: "italic" }}>
        All information is derived from published research literature and is presented for educational purposes.
      </div>

      <button onClick={() => setExpanded(!expanded)} style={{
        background: "none", border: "none", color: S.accent, fontSize: 13, fontWeight: 600,
        cursor: "pointer", padding: "10px 0 0", fontFamily: "inherit"
      }}>
        {expanded ? "Collapse ↑" : "Full Profile ↓"}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>Research-Documented Benefits</div>
            {c.keyBenefits.map((b, i) => (
              <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", padding: "3px 0", paddingLeft: 12, borderLeft: `2px solid ${catColor}40` }}>
                {b}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ ...S.label, marginBottom: 6, color: "#1ae87a" }}>Documented Advantages</div>
              {c.pros.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", padding: "3px 0", lineHeight: 1.5 }}>+ {p}</div>
              ))}
            </div>
            <div>
              <div style={{ ...S.label, marginBottom: 6, color: "#ef4444" }}>Documented Considerations</div>
              {c.cons.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", padding: "3px 0", lineHeight: 1.5 }}>− {p}</div>
              ))}
            </div>
          </div>
          {rec.stackNotes.length > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(26,232,122,0.06)", border: "1px solid rgba(26,232,122,0.15)", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              🔗 {rec.stackNotes[0]}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>Documented Administration Route</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{c.route}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, current, projected, delta, unit, goodDirection = "up", isScore = false, note = null }) {
  // Determine if the delta is favorable based on the metric's direction.
  const hasDelta = typeof delta === "number" && delta !== 0;
  const isFavorable = hasDelta && (goodDirection === "up" ? delta > 0 : delta < 0);
  const deltaColor = !hasDelta
    ? "rgba(255,255,255,0.35)"
    : isFavorable
    ? "#1ae87a"
    : "#ef4444";

  // Display value: prefer projected absolute when provided, otherwise show delta.
  const showAbsolute = current && projected;
  const formattedDelta = hasDelta
    ? `${delta > 0 ? "+" : ""}${Math.round(delta * 10) / 10}${unit}`
    : `0${unit}`;

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      gap: 4
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
        {label}
      </div>
      {showAbsolute ? (
        <>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.1, fontFamily: "'JetBrains Mono', monospace" }}>
            {projected}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            from <span style={{ color: "rgba(255,255,255,0.6)" }}>{current}</span>{" "}
            <span style={{ color: deltaColor, fontWeight: 600 }}>({formattedDelta})</span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: deltaColor, lineHeight: 1.1, fontFamily: "'JetBrains Mono', monospace" }}>
            {hasDelta ? formattedDelta : (isScore ? "—" : `0${unit}`)}
          </div>
          {note && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {note}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BiomarkerRow({ projection }) {
  const { label, unit, current, delta, projected, positive } = projection;
  const hasDelta = delta !== 0;
  const deltaColor = !hasDelta
    ? "rgba(255,255,255,0.35)"
    : positive
    ? "#1ae87a"
    : "#ef4444";
  const deltaStr = `${delta > 0 ? "+" : ""}${delta}${unit}`;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.05)",
      gap: 12
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: "rgba(255,255,255,0.45)" }}>{current}{unit}</span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
        <span style={{ color: "#fff", fontWeight: 700 }}>{projected}{unit}</span>
        <span style={{ color: deltaColor, fontWeight: 600, fontSize: 11, minWidth: 50, textAlign: "right" }}>
          {hasDelta ? deltaStr : "—"}
        </span>
      </div>
    </div>
  );
}

function EidolonSwitcherModal({ eidolons, activeEidolonId, onSelect, onClose, onCreate }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Switch Eidolon</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Select a research profile to load.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {eidolons.map(e => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              style={{
                width: '100%', padding: '14px 16px', textAlign: 'left',
                background: e.id === activeEidolonId ? 'rgba(26,232,122,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${e.id === activeEidolonId ? '#1ae87a' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {e.goals?.length ? e.goals.map(gid => GOALS.find(g => g.id === gid)?.label).filter(Boolean).join(', ') : 'No goals set'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {e.lockedAt && <span style={{ fontSize: 10, color: 'rgba(26,232,122,0.6)', fontWeight: 600 }}>LOCKED</span>}
                {e.id === activeEidolonId && <span style={{ color: '#1ae87a', fontSize: 16 }}>●</span>}
              </div>
            </button>
          ))}
        </div>
        {onCreate && (
          <button onClick={onCreate} style={{ width: '100%', marginTop: 12, padding: '12px 16px', background: 'rgba(26,232,122,0.08)', border: '1px solid rgba(26,232,122,0.25)', borderRadius: 10, color: '#1ae87a', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + New Eidolon
          </button>
        )}
        <button onClick={onClose} style={{ width: '100%', marginTop: 12, padding: '12px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── EIDOLON HERO ───────────────────────────────────────────
// Avatar-first header shared by BOTH the committed home and the builder
// (Plan A Step 2). The eidolon is always front-and-center — large centered
// avatar, editable name above, biometric stat pills below — whether you're
// viewing a locked protocol or assembling a new one. Single source of truth:
// Dashboard renders this once, above the editing/committed split, so the two
// modes stay visually identical and there's one place to evolve the hero.
function EidolonHero({
  profile, avatarUrl, avatarParams, eidolonName,
  editingName, nameInput, setNameInput, onStartEditName, onCommitName, onCancelName,
  onCaptureAvatar, onResetAvatar, showAvatarDebug, setShowAvatarDebug,
  pulse = false,
}) {
  return (
    <>
      <style>{`@keyframes alkiDosePulse { 0% { opacity: 0.1; transform: translateX(-50%) scale(1); } 35% { opacity: 0.5; transform: translateX(-50%) scale(1.18); } 100% { opacity: 0.1; transform: translateX(-50%) scale(1); } }`}</style>

      {/* Name — large, centered, inline-editable */}
      <div style={{ textAlign: "center", marginTop: 6, marginBottom: 0 }}>
        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={onCommitName}
            onKeyDown={e => {
              if (e.key === "Enter") onCommitName();
              if (e.key === "Escape") onCancelName();
            }}
            maxLength={30}
            style={{
              fontSize: 26, fontWeight: 800, background: "transparent", border: "none",
              borderBottom: `1.5px solid ${S.accent}`, color: "#fff", textAlign: "center",
              outline: "none", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em",
              padding: "4px 14px", minWidth: 220, maxWidth: "90%"
            }}
          />
        ) : (
          <h1
            onClick={onStartEditName}
            title="Tap to rename"
            style={{
              fontSize: 26, fontWeight: 800, color: "#fff", margin: 0,
              fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8, padding: "2px 8px"
            }}
          >
            {eidolonName}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>✎</span>
          </h1>
        )}
        <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
          εἰδωλον
        </div>
      </div>

      {/* Hero avatar with subtle radial glow */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "10px 0 4px", width: "100%" }}>
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(26,232,122,0.10) 0%, rgba(26,232,122,0.04) 40%, transparent 70%)",
          pointerEvents: "none", filter: "blur(6px)",
          animation: pulse ? "alkiDosePulse 1.6s ease" : undefined
        }} />
        <div style={{ position: "relative", width: "100%", maxWidth: 280 }}>
          {avatarUrl ? (
            <Body3DAvatar avatarUrl={avatarUrl} params={avatarParams.current} label="" size="large" interactive={true} debugPanel={showAvatarDebug} />
          ) : (
            <BodyAvatar params={avatarParams.current} label="" maxWidth={280} />
          )}
        </div>
      </div>

      {/* Avatar customization chip + debug toggle */}
      <div style={{ textAlign: "center", marginBottom: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        {avatarUrl ? (
          <button onClick={onResetAvatar} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>
            ↺ Reset Avatar
          </button>
        ) : (
          <button onClick={onCaptureAvatar} style={{ background: "rgba(26,232,122,0.08)", border: "1px solid rgba(26,232,122,0.22)", color: S.accent, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 16px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>
            {AVATURN_ENABLED ? "✦ Make it me" : "Make it me · setup"}
          </button>
        )}
        <button
          onClick={() => setShowAvatarDebug(v => !v)}
          title="Toggle morph debug panel"
          style={{ background: showAvatarDebug ? "rgba(26,232,122,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${showAvatarDebug ? "rgba(26,232,122,0.25)" : "rgba(255,255,255,0.07)"}`, color: showAvatarDebug ? S.accent : "rgba(255,255,255,0.3)", fontSize: 13, padding: "4px 10px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit", lineHeight: 1, transition: "all 0.15s ease" }}
        >
          ⚙
        </button>
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
        {[
          { label: "BF",  value: `${profile.bodyFat}%` },
          { label: "WT",  value: `${profile.weight}lb` },
          { label: "HT",  value: `${profile.heightFt}'${profile.heightIn}\"` },
          { label: "AGE", value: `${profile.age}` },
          { label: "SEX", value: profile.sex === "male" ? "♂" : "♀" }
        ].map(p => (
          <div key={p.label} style={{ padding: "5px 11px", borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace" }}>{p.label}</span>
            <span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Dashboard({ profile, setProfile, selectedCompounds, setSelectedCompounds, showTransform, setShowTransform, onReset, onLockIn, activeProtocol, setActiveProtocol, onBackToHome, onQA, onTimeline, onModeler, onProgress, onProtocolGuide, onPhotos, cultivationState, progressLogs, avatarUrl, avatarHeadshot, onCaptureAvatar, onResetAvatar, onSignOut, userEmail, eidolons, setEidolons, activeEidolonId, setActiveEidolonId, doseLog, setDoseLog }) {
  const [animateIn, setAnimateIn] = useState(false);
  const [showOtherCompounds, setShowOtherCompounds] = useState(false);
  // #51-57 — two-tier connected filter (goal -> type) + sort + clear.
  const [goalFilter, setGoalFilter] = useState("all");   // "all" | goalId
  const [catFilter, setCatFilter] = useState("all");     // "all" | category name
  const [sortMode, setSortMode] = useState("match");     // match | name | risk | category
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [editing, setEditing] = useState(!activeProtocol);
  const [showManageMenu, setShowManageMenu] = useState(false); // #62 — committed-home Manage dropdown
  const [showEidolonSwitcher, setShowEidolonSwitcher] = useState(false);
  const [showAvatarDebug, setShowAvatarDebug] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [dosePulse, setDosePulse] = useState(false); // #16 — daily-dose completion pulse
  // #6 — builder lane: null (chooser) | "recommend" | "build".
  const [builderPath, setBuilderPath] = useState(null);

  const activeEidolon = eidolons?.find(e => e.id === activeEidolonId) || eidolons?.[0] || null;
  const isModifying = editing && activeEidolon?.lockedAt != null;
  // #6 — which builder lane to render. A live selection or a modify-flow skips
  // the chooser and lands in the manual lane; a fresh empty build shows the fork.
  const builderView = (selectedCompounds.length > 0 || isModifying)
    ? (builderPath || "build")
    : builderPath;

  // ── Eidolon helpers ──
  // Ref keeps the latest eidolons accessible inside callbacks without
  // stale closures — critical for switch/create that read+write the array.
  const eidolonsRef = useRef(eidolons);
  eidolonsRef.current = eidolons;
  const selectedCompoundsRef = useRef(selectedCompounds);
  selectedCompoundsRef.current = selectedCompounds;
  const activeProtocolRef = useRef(activeProtocol);
  activeProtocolRef.current = activeProtocol;

  // Persist the current eidolon's working state back to the array.
  // Called before any switch/create so dirty builder state isn't lost.
  const flushCurrentEidolon = useCallback(() => {
    if (!activeEidolonId) return;
    const curCompounds = selectedCompoundsRef.current || [];
    const curProtocol = activeProtocolRef.current;
    setEidolons(prev => prev.map(e => {
      if (e.id !== activeEidolonId) return e;
      // If locked, sync the locked compounds. If unlocked, save builder selections.
      if (curProtocol?.lockedAt) {
        return { ...e, compounds: curProtocol.compounds || [], lockedAt: curProtocol.lockedAt };
      }
      return { ...e, compounds: curCompounds };
    }));
  }, [activeEidolonId]);

  const switchToEidolon = useCallback((eidId) => {
    // 1. Save current eidolon's dirty state
    flushCurrentEidolon();
    // 2. Read the LATEST eidolons from ref, not closure
    const latest = eidolonsRef.current || [];
    const eid = latest.find(e => e.id === eidId);
    if (!eid) return;
    // 3. Full clean swap — every piece of eidolon-dependent state
    setActiveEidolonId(eidId);
    setProfile(prev => ({ ...prev, goals: eid.goals || [] }));
    if (eid.lockedAt && eid.compounds?.length) {
      setActiveProtocol({ compounds: [...eid.compounds], lockedAt: eid.lockedAt });
      setSelectedCompounds([...eid.compounds]);
      setEditing(false);
    } else {
      setActiveProtocol(null);
      setSelectedCompounds(eid.compounds ? [...eid.compounds] : []);
      setEditing(true);
    }
    setShowTransform(false);
    setShowEidolonSwitcher(false);
    setEditingName(false);
  }, [flushCurrentEidolon]);

  const createNewEidolon = useCallback(() => {
    // Save current eidolon's state before creating a new one
    flushCurrentEidolon();
    const num = (eidolonsRef.current?.length || 0) + 1;
    const eid = { id: 'e_' + Date.now(), name: `Eidolon ${num}`, goals: [...(profile?.goals || [])], compounds: [], lockedAt: null };
    setEidolons(prev => [...(prev || []), eid]);
    setActiveEidolonId(eid.id);
    setActiveProtocol(null);
    setSelectedCompounds([]);
    setEditing(true);
    setShowTransform(false);
    setShowEidolonSwitcher(false);
    // #20 — drop straight into naming the new eidolon
    setNameInput("");
    setEditingName(true);
  }, [flushCurrentEidolon, profile?.goals]);

  const commitEidolonName = useCallback(() => {
    const trimmed = (nameInput || "").trim();
    if (!trimmed || !activeEidolon) { setEditingName(false); return; }
    setEidolons(prev => (prev || []).map(e => e.id === activeEidolon.id ? { ...e, name: trimmed } : e));
    setEditingName(false);
  }, [nameInput, activeEidolon, setEidolons]);

  const handleGoalToggle = useCallback((goalId) => {
    const currentGoals = profile?.goals || [];
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter(g => g !== goalId)
      : [...currentGoals, goalId];
    setProfile(prev => ({ ...prev, goals: newGoals }));
    if (activeEidolon) {
      setEidolons(prev => prev.map(e => e.id === activeEidolon.id ? { ...e, goals: newGoals } : e));
    }
  }, [profile?.goals, activeEidolon]);

  const handleLockIn = useCallback((compounds) => {
    const protocol = { compounds, lockedAt: new Date().toISOString() };
    setActiveProtocol(protocol);
    if (activeEidolon) {
      setEidolons(prev => prev.map(e => e.id === activeEidolon.id ? { ...e, compounds, lockedAt: protocol.lockedAt } : e));
    }
    setEditing(false);
    setShowTransform(false);
  }, [activeEidolon]);

  const recommendations = useMemo(() => {
    try { return getRecommendations(profile); }
    catch (e) { console.error('getRecommendations error:', e); return []; }
  }, [profile]);
  const stackAnalysis = useMemo(() => {
    if (selectedCompounds.length === 0) return { isBlocked: false, compounds: [], contraindications: [], synergies: [], redundancies: [], supportRequired: [], safetyScore: { overall: 100 }, summary: null };
    try { return analyzeStack(selectedCompounds, profile); }
    catch (e) { console.error('analyzeStack error:', e); return { isBlocked: false, compounds: [], contraindications: [], synergies: [], redundancies: [], supportRequired: [], safetyScore: { overall: 100 }, summary: null }; }
  }, [selectedCompounds, profile]);

  useEffect(() => { setTimeout(() => setAnimateIn(true), 100); }, []);

  // #64 — entering/leaving the projection view is a view change; scroll to top
  // so the before/after avatars are framed (matches screen-load behavior).
  useEffect(() => { try { window.scrollTo(0, 0); } catch (_) {} }, [showTransform]);

  const toggleCompound = (id) => {
    setSelectedCompounds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setShowTransform(false);
  };

  // #70 — add/remove a compound WITHOUT leaving the current view. The projection
  // and stack analysis are derived from selectedCompounds via memos, so they
  // update in place. Used by the projection screen's Support Layer (e.g. adding
  // Tadalafil) and contraindication banner, which previously called
  // toggleCompound and got bounced back to the builder by its setShowTransform(false).
  const toggleCompoundInPlace = (id) => {
    setSelectedCompounds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // #47 — memoize so unrelated re-renders (lock-in, auto-save, animateIn) don't
  // hand the 3D avatar a fresh morphState object each time, which re-runs its
  // per-mesh material traversal and compounds the GPU jank on the committed home.
  const avatarParams = useMemo(
    () => resolveAvatarParams(profile, selectedCompounds),
    [profile, selectedCompounds]
  );

  const hasVisualChange = selectedCompounds.some(id => {
    const c = COMPOUNDS.find(x => x.id === id);
    return c && c.visualChange;
  });

  // Calculate projected changes for display
  const projectedChanges = useMemo(() => {
    const timeline = 12;

    // Aggregate raw effect sums from selected compounds
    let bfChange = 0;
    let muscleChange = 0;
    let skinChange = 0;
    let recoveryChange = 0;
    let hasGHAxis = false;
    let hasGLP1 = false;
    let hasVisceralTarget = false;
    let hasECM = false;

    for (const cid of selectedCompounds) {
      const c = COMPOUNDS.find(x => x.id === cid);
      if (!c) continue;
      bfChange       += c.effects.bf       || 0;
      muscleChange   += c.effects.muscle   || 0;
      skinChange     += c.effects.skin     || 0;
      recoveryChange += c.effects.recovery || 0;

      if (c.category === "Growth Hormone") hasGHAxis = true;
      if (c.category === "Weight Loss")    hasGLP1 = true;
      if (c.id === "tesamorelin" || c.id === "fragment176") hasVisceralTarget = true;
      if (c.id === "ghkcu")                hasECM = true;
    }

    // ── Advanced biomarker projections (only when user provided a baseline) ──
    // Conservative 12-week projections derived from effect sums + mechanism flags.
    const adv = profile.adv || {};
    const advProjections = [];

    const skelBase = parseFloat(adv.skelMuscle);
    if (!isNaN(skelBase) && skelBase > 0) {
      // GH axis raises skeletal muscle %; GLP-1 without GH support lowers it
      let delta = muscleChange * 0.18;
      if (hasGHAxis) delta += 0.6;
      if (hasGLP1 && !hasGHAxis) delta -= 1.2;
      delta = Math.round(delta * 10) / 10;
      advProjections.push({
        label: "Skeletal Muscle",
        unit: "%",
        current: skelBase,
        delta,
        projected: Math.round((skelBase + delta) * 10) / 10,
        positive: delta > 0
      });
    }

    const muscleMassBase = parseFloat(adv.muscleMass);
    if (!isNaN(muscleMassBase) && muscleMassBase > 0) {
      // Lean mass in lbs — scaled from muscle effect sum
      let delta = muscleChange * 0.9;
      if (hasGLP1 && !hasGHAxis) delta -= 4;
      delta = Math.round(delta * 10) / 10;
      advProjections.push({
        label: "Muscle Mass",
        unit: "lbs",
        current: muscleMassBase,
        delta,
        projected: Math.round((muscleMassBase + delta) * 10) / 10,
        positive: delta > 0
      });
    }

    const visceralBase = parseFloat(adv.visceralFat);
    if (!isNaN(visceralBase) && visceralBase > 0) {
      let delta = 0;
      if (hasVisceralTarget) delta -= 2;
      if (hasGLP1)           delta -= 1.5;
      if (hasGHAxis && !hasVisceralTarget) delta -= 0.5;
      delta = Math.round(delta * 10) / 10;
      advProjections.push({
        label: "Visceral Fat",
        unit: "lvl",
        current: visceralBase,
        delta,
        projected: Math.max(1, Math.round((visceralBase + delta) * 10) / 10),
        positive: delta < 0
      });
    }

    const subFatBase = parseFloat(adv.subFat);
    if (!isNaN(subFatBase) && subFatBase > 0) {
      // Subcutaneous fat tracks roughly with total BF change
      let delta = bfChange * 0.8;
      if (hasECM) delta -= 0.2;
      delta = Math.round(delta * 10) / 10;
      advProjections.push({
        label: "Subcutaneous Fat",
        unit: "%",
        current: subFatBase,
        delta,
        projected: Math.max(0, Math.round((subFatBase + delta) * 10) / 10),
        positive: delta < 0
      });
    }

    const ffmBase = parseFloat(adv.fatFreeMass);
    if (!isNaN(ffmBase) && ffmBase > 0) {
      let delta = muscleChange * 0.7;
      if (hasGLP1 && !hasGHAxis) delta -= 3;
      delta = Math.round(delta * 10) / 10;
      advProjections.push({
        label: "Fat-Free Mass",
        unit: "lbs",
        current: ffmBase,
        delta,
        projected: Math.round((ffmBase + delta) * 10) / 10,
        positive: delta > 0
      });
    }

    const bmrBase = parseFloat(adv.bmr);
    if (!isNaN(bmrBase) && bmrBase > 0) {
      // GH axis raises BMR; GLP-1 alone modestly lowers it via lean mass loss
      let delta = muscleChange * 8;
      if (hasGHAxis) delta += 40;
      if (hasGLP1 && !hasGHAxis) delta -= 60;
      delta = Math.round(delta);
      advProjections.push({
        label: "BMR",
        unit: "kcal",
        current: bmrBase,
        delta,
        projected: Math.round(bmrBase + delta),
        positive: delta > 0
      });
    }

    // Backward-compat note string (kept so anything else reading it still works)
    const muscleNote = [];
    if (muscleChange > 1)  muscleNote.push(`+${muscleChange}% lean mass`);
    if (muscleChange < 0)  muscleNote.push(`${muscleChange}% lean mass risk`);

    // #bf — projected body fat can't fall below essential fat (men ~3-5%,
    // women ~10-12%), and never raises an already-leaner user. Prevents the
    // physiologically impossible "0%" a stacked GLP protocol used to show.
    const bfEssential = profile.sex === "female" ? 12 : 5;
    const bfRaw = Math.round((profile.bodyFat + bfChange) * 10) / 10;
    const projectedBodyFat = Math.max(Math.min(profile.bodyFat, bfEssential), bfRaw);

    // #68 — projected bodyweight: hold lean mass constant and re-solve total
    // weight at the projected body fat. Naturally zero-change for stacks that
    // don't move fat (consistent with the #50 dead-zone), so recovery stacks
    // show no weight delta. Surfaces the bodyweight the projection is based on.
    const _lbm = profile.weight ? profile.weight * (1 - profile.bodyFat / 100) : null;
    const projectedWeight = (_lbm != null && projectedBodyFat < 100)
      ? Math.round(_lbm / (1 - projectedBodyFat / 100))
      : (profile.weight ?? null);
    const weightChange = profile.weight ? projectedWeight - profile.weight : 0;

    return {
      bfChange,
      projectedBodyFat,
      projectedWeight,
      weightChange,
      muscleChange,
      skinChange,
      recoveryChange,
      muscleNote,
      timeline,
      advProjections
    };
  }, [selectedCompounds, profile]);

  // ── Recommended-for-you filter ────────────────────────────────────────
  // Strict match: (goal overlap OR advanced-biomarker match) + BF range
  // + no triggered contraindications + not experimental/educational-only.
  // Everything else falls to the collapsible "Browse all" section below.

  // Parse advanced biomarkers from the profile (same fields as the engine reads)
  const _adv = profile.adv || {};
  const _advVF   = parseFloat(_adv.visceralFat) || null;
  const _advSM   = parseFloat(_adv.skelMuscle)  || null;
  const _advMMlb = parseFloat(_adv.muscleMass)  || null;
  const _advSubF = parseFloat(_adv.subFat)      || null;
  const _advBW   = parseFloat(_adv.bodyWater)   || null;
  const _advBM   = parseFloat(_adv.boneMass)    || null;
  const _advBMR  = parseFloat(_adv.bmr)         || null;
  const _sex     = profile.sex;
  const _wt      = profile.weight;

  // Does the user's biomarker profile specifically call for this compound?
  // Mirrors the engine's advanced-stat scoring blocks above.
  const isAdvStatMatch = (c) => {
    // High visceral fat → fat-loss / metabolic compounds
    if (_advVF !== null) {
      if (_advVF >= 10 && (c.id === "tesamorelin" || c.id === "fragment176")) return true;
      if (_advVF >= 12 && (c.category === "Weight Loss" || c.category === "Fat Loss" || c.category === "Metabolic")) return true;
    }
    // Low skeletal muscle → GH axis
    if (_advSM !== null) {
      const lowT = _sex === "female" ? 34 : 38;
      if (_advSM < lowT && (c.category === "Growth Hormone" || c.id === "tesamorelin")) return true;
      const highT = _sex === "female" ? 42 : 46;
      if (_advSM > highT && c.category === "Recovery") return true;
    }
    // Low muscle mass ratio → GH axis
    if (_advMMlb !== null && _wt) {
      const pct = (_advMMlb / _wt) * 100;
      if (pct < 40 && (c.category === "Growth Hormone" || c.id === "tesamorelin")) return true;
    }
    // High subQ fat → GHK-Cu (skin/collagen mechanism)
    if (_advSubF !== null && _advSubF > 20 && c.id === "ghkcu") return true;
    // Low body water → GH axis
    if (_advBW !== null) {
      const lowW = _sex === "female" ? 45 : 50;
      if (_advBW < lowW && c.category === "Growth Hormone") return true;
    }
    // Low bone mass → GH peptides (IGF-1)
    if (_advBM !== null && _advBM < 6 && (c.category === "Growth Hormone" || c.id === "tesamorelin")) return true;
    // Low BMR → metabolic compounds
    if (_advBMR !== null && _advBMR < 1400) {
      if (c.id === "tesamorelin") return true;
      if (c.category === "Weight Loss" || c.category === "Metabolic" || c.category === "Fat Loss") return true;
    }
    return false;
  };

  const recommended = recommendations.filter(r => {
    const c = r.compound;
    const bf = profile.bodyFat;

    // Must have a goal match OR an advanced-biomarker match
    const hasGoalMatch = r.goalOverlap && r.goalOverlap.length > 0;
    const hasAdvMatch  = isAdvStatMatch(c);
    if (!hasGoalMatch && !hasAdvMatch) return false;

    // BF must be inside the compound's stated suitability range
    if (bf < c.suitability.minBf) return false;
    if (bf > c.suitability.maxBf) return false;

    // Skip compounds whose contraindications fire for this user
    if (c.contraindications && c.contraindications.includes("below15bf") && bf < 15) return false;
    if (c.contraindications && c.contraindications.includes("below22bf_glp1") && bf < 22) return false;

    // Skip experimental-only and warning-flagged compounds (need explicit opt-in)
    if (c.experienceLevel === "experimental_only") return false;
    if (c.displayWarning) return false;

    return true;
  });

  // #45 — the active filter can be "All", a goal ("goal:<id>"), or a category
  // ("cat:<Category>"). Goals bridge the vocabulary the user picked at onboarding
  // (e.g. "Muscle Gain") to compounds, since categories are mechanism classes.
  // #51 — connected filter: a goal narrows the set, then the Type row narrows
  // further within that goal. Both apply to the matched list AND browse-all.
  const passesFilters = (rec) => {
    const c = rec.compound;
    if (goalFilter !== "all" && !(c.suitability?.goals || []).includes(goalFilter)) return false;
    if (catFilter !== "all" && c.category !== catFilter) return false;
    return true;
  };

  // #56 — sort. Base-8 compounds lack riskTier -> treat as "moderate".
  const RISK_ORDER = { very_low: 0, low: 1, low_mod: 2, moderate: 3, mod_high: 4, high: 5, unknown: 3 };
  const sortRecs = (arr) => {
    const a = [...arr];
    if (sortMode === "name") a.sort((x, y) => x.compound.name.localeCompare(y.compound.name));
    else if (sortMode === "risk") a.sort((x, y) => (RISK_ORDER[x.compound.riskTier] ?? 3) - (RISK_ORDER[y.compound.riskTier] ?? 3));
    else if (sortMode === "category") a.sort((x, y) => x.compound.category.localeCompare(y.compound.category) || (y.score - x.score));
    else a.sort((x, y) => y.score - x.score); // "match"
    return a;
  };

  // #51/#52 — Type options are the categories present among ALL compounds (matched
  // + browse-all) that satisfy the current goal, so e.g. picking Muscle Gain
  // surfaces SARM even when SARMs are gated out of the matched list.
  const filterAndSort = (arr) => sortRecs(arr.filter(passesFilters));
  const goalScopedCats = () => {
    const pool = [...recommended, ...otherCompounds].filter(
      (rec) => goalFilter === "all" || (rec.compound.suitability?.goals || []).includes(goalFilter)
    );
    return [...new Set(pool.map((rec) => rec.compound.category))].sort();
  };
  const filtersActive = goalFilter !== "all" || catFilter !== "all";
  const setGoal = (g) => { setGoalFilter(g); setCatFilter("all"); setShowAllRecommended(false); };
  const clearSelection = () => { setSelectedCompounds([]); setGoalFilter("all"); setCatFilter("all"); };

  const recommendedIds = new Set(recommended.map(r => r.compound.id));
  const otherCompounds = recommendations.filter(r => !recommendedIds.has(r.compound.id));

  // ── Resolve profile with latest log data when protocol is locked ──
  // If user has logged newer BF/weight, the avatar should reflect that
  const effectiveProfile = useMemo(() => {
    if (!activeProtocol || editing || !progressLogs || !progressLogs.length) return profile;
    const latest = progressLogs[0];
    return {
      ...profile,
      weight: latest.weight || profile.weight,
      bodyFat: latest.body_fat || profile.bodyFat
    };
  }, [profile, activeProtocol, editing, progressLogs]);

  if (showTransform) {
    return (
      <div style={S.inner}>
        <div style={{ padding: "16px 0 8px" }}>
          <button onClick={() => setShowTransform(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            ← Back to Research
          </button>
        </div>

        <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>εἰδωλον</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Projected Research Outcome</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6 }}>
            {projectedChanges.timeline}-week protocol · Based on published research literature
          </p>
        </div>

        {/* Before / After — SVG free / 3D premium based on avatarUrl */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "flex-end", padding: "10px 0 20px" }}>
          <div style={{ flex: 1, maxWidth: 180 }}>
            {avatarUrl ? (
              <Body3DAvatar avatarUrl={avatarUrl} params={avatarParams.current} label="Current Eidolon" size="large" interactive={true} />
            ) : (
              <BodyAvatar params={avatarParams.current} label="Current Eidolon" />
            )}
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.15)", paddingBottom: 40 }}>→</div>
          <div style={{ flex: 1, maxWidth: 180 }}>
            {avatarUrl ? (
              <Body3DAvatar avatarUrl={avatarUrl} params={avatarParams.projected} label="Projected Eidolon" size="large" interactive={true} glow={true} />
            ) : (
              <BodyAvatar params={avatarParams.projected} label="Projected Eidolon" glow={true} />
            )}
          </div>
        </div>

        {/* Stats — core projections */}
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 12 }}>Projected Outcomes · {projectedChanges.timeline}-week protocol</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <StatTile
              label="Body Fat"
              current={`${profile.bodyFat}%`}
              projected={`${projectedChanges.projectedBodyFat}%`}
              delta={projectedChanges.bfChange}
              unit="%"
              goodDirection="down"
            />
            <StatTile
              label="Weight"
              current={`${profile.weight} lbs`}
              projected={`${projectedChanges.projectedWeight} lbs`}
              delta={projectedChanges.weightChange}
              unit=" lbs"
              goodDirection="down"
              note="Est. at projected body fat (lean mass held)"
            />
            <StatTile
              label="Lean Mass"
              delta={projectedChanges.muscleChange}
              unit="%"
              goodDirection="up"
              note={projectedChanges.muscleChange === 0 ? "No change" : null}
            />
            <StatTile
              label="Skin Quality"
              delta={projectedChanges.skinChange}
              unit="pts"
              goodDirection="up"
              isScore
              note={projectedChanges.skinChange === 0 ? "No change" : "Relative improvement score (0–20 scale)"}
            />
            <StatTile
              label="Recovery"
              delta={projectedChanges.recoveryChange}
              unit="pts"
              goodDirection="up"
              isScore
              note={projectedChanges.recoveryChange === 0 ? "No change" : "Relative improvement score (0–20 scale)"}
            />
          </div>
        </div>

        {/* Advanced biomarker projections — only when user provided baselines */}
        {projectedChanges.advProjections.length > 0 && (
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 4 }}>Advanced Biomarker Projections</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14, lineHeight: 1.5 }}>
              Based on the body composition data you provided during onboarding. Projections are population estimates; individual response varies.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {projectedChanges.advProjections.map((p, i) => (
                <BiomarkerRow key={i} projection={p} />
              ))}
            </div>
          </div>
        )}

        {/* Selected Stack */}
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 10 }}>Your Research Protocol</div>
          {selectedCompounds.map(id => {
            const c = COMPOUNDS.find(x => x.id === id);
            if (!c) return null;
            return (
              <div key={id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 8, fontSize: 12 }}>{c.dosing}</span>
              </div>
            );
          })}
        </div>

        {/* Stack Intelligence — full analysis. #70 — add/remove happen in place
            (no bounce back to the builder) so adding support like Tadalafil from
            the Support Layer updates this projection live. */}
        <StackIntelligence
          stackIds={selectedCompounds}
          userProfile={profile}
          onRemoveCompound={toggleCompoundInPlace}
          onAddCompound={toggleCompoundInPlace}
          compoundCatalog={COMPOUNDS}
        />

        {/* Cycle Timeline CTA — also reachable from the Transformation view */}
        <button
          onClick={onTimeline}
          style={{
            ...S.btnOutline,
            marginTop: 8,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          Protocol Timeline
        </button>

        {/* Lock In / Confirm Changes — only when actively building or modifying. Hidden when just viewing a locked protocol. */}
        {editing && (
          <button
            onClick={() => handleLockIn(selectedCompounds)}
            style={{
              ...S.btn,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            {isModifying ? 'Confirm Changes →' : 'Lock In This Protocol →'}
          </button>
        )}

        <p style={S.disclaimer}>
          Projected research outcome based on published literature. Individual results are not guaranteed. This is not medical advice. Consult a licensed healthcare provider before initiating any protocol.
        </p>
        <p style={{ fontSize: 12, color: "rgba(26,232,122,0.35)", textAlign: "center", paddingBottom: 20, fontStyle: "italic", letterSpacing: "0.06em" }}>
          Happy Researching.
        </p>
      </div>
    );
  }


  return (
    <div style={{ ...S.inner, opacity: animateIn ? 1 : 0, transition: "opacity 0.6s ease" }}>
      {/* Header */}
      <div style={{ padding: "16px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", fontFamily: "'Syne', sans-serif" }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {activeProtocol && editing && (
            <button onClick={() => {
              // Cancel modify — restore the locked protocol's compounds
              setSelectedCompounds(activeProtocol.compounds || []);
              setEditing(false);
            }} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Discard Changes
            </button>
          )}
          {/* #62 — committed-home eidolon management lives here now (was the bottom action grid) */}
          {!editing && activeProtocol && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowManageMenu(v => !v)} style={{ background: "none", border: "none", color: showManageMenu ? '#fff' : S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Manage ▾
              </button>
              {showManageMenu && (
                <>
                  <div onClick={() => setShowManageMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 91, background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 6, minWidth: 168, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                    {[
                      ["Modify protocol", () => { setSelectedCompounds(activeProtocol.compounds || []); setEditing(true); }],
                      ["Switch eidolon", () => setShowEidolonSwitcher(true)],
                      ["+ New eidolon", createNewEidolon],
                    ].map(([mLabel, fn]) => (
                      <button
                        key={mLabel}
                        onClick={() => { fn(); setShowManageMenu(false); }}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "9px 12px", borderRadius: 6, whiteSpace: "nowrap" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        {mLabel}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={onModeler} style={{ background: "none", border: "none", color: S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Modeler
          </button>
          <button onClick={onQA} style={{ background: "none", border: "none", color: S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Q&amp;A
          </button>
          {onSignOut && (
            <button onClick={onSignOut} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Avatar-first hero — rendered once for BOTH builder and committed modes
          (Plan A Step 2). Was previously a small profile card in builder and a
          separate inline hero in committed; now a single EidolonHero above the
          mode split so the eidolon always greets you, whatever you're doing. */}
      <EidolonHero
        profile={profile}
        avatarUrl={avatarUrl}
        avatarParams={avatarParams}
        eidolonName={activeEidolon?.name || 'Eidolon 1'}
        editingName={editingName}
        nameInput={nameInput}
        setNameInput={setNameInput}
        onStartEditName={() => { setNameInput(activeEidolon?.name || 'Eidolon 1'); setEditingName(true); }}
        onCommitName={commitEidolonName}
        onCancelName={() => setEditingName(false)}
        onCaptureAvatar={onCaptureAvatar}
        onResetAvatar={onResetAvatar}
        showAvatarDebug={showAvatarDebug}
        setShowAvatarDebug={setShowAvatarDebug}
        pulse={dosePulse}
      />

      {/* Inline Goals Editor — collapsible (builder mode only; goals lock once a protocol is committed — #17) */}
      {/* #61 — goal selection is inline while building/modifying (no longer hidden
          behind a nav toggle); selected goals sort to the front, and the whole card
          disappears once the protocol is locked in (committed mode). */}
      {editing && (
        <div style={{ ...S.card, borderColor: 'rgba(26,232,122,0.2)' }}>
          <div style={{ ...S.label, marginBottom: 12 }}>
            Goals for {activeEidolon?.name || 'Eidolon 1'}{' '}
            <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· tap to choose</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
            {[...GOALS]
              .sort((a, b) => (((profile.goals || []).includes(a.id) ? 0 : 1) - ((profile.goals || []).includes(b.id) ? 0 : 1)))
              .map(g => {
                const active = (profile.goals || []).includes(g.id);
                return (
                  <button key={g.id} onClick={() => handleGoalToggle(g.id)} style={{
                    ...S.tag,
                    background: active ? S.accentDim : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${active ? S.accent : 'rgba(255,255,255,0.1)'}`,
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)'
                  }}>
                    {g.icon} {g.label}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* ═══ COMMITTED MODE — Avatar-First Home ═══ */}
      {!editing && activeProtocol && (
        <>
          {/* Hero (name + avatar + stat pills) now renders above the mode split
              via <EidolonHero>. Committed home continues straight to status. */}
          {/* 4. Cultivation status */}
          {(() => {
            const cv = getCultivationVisuals(cultivationState?.state || "new");
            return (
              <div
                onClick={onProgress}
                style={{
                  ...S.card,
                  borderColor: cv.statusBorder,
                  background: cv.statusBg,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ color: cv.statusColor, fontSize: 13 }}>{cv.statusIcon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cv.statusColor }}>Cultivation: {cv.statusLabel}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {cultivationState?.state === "new" && "Log your first check-in →"}
                    {cultivationState?.state === "progressing" && `${cultivationState.streak}-week streak · Tap to log`}
                    {cultivationState?.state === "stagnant" && `${cultivationState.daysSinceLog}d since last log · Eidolon frozen`}
                    {cultivationState?.state === "regressing" && `${cultivationState.daysSinceLog}d since last log · Gains fading`}
                  </div>
                </div>
                <div style={{ color: cv.statusColor, fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {cultivationState?.streak > 0 ? cultivationState.streak : "→"}
                </div>
              </div>
            );
          })()}

          {/* 4b. Today's Protocol — daily dose checklist (#16) */}
          {(() => {
            const compIds = activeProtocol?.compounds || [];
            if (compIds.length === 0) return null;
            const eid = activeEidolonId || "solo";
            const today = new Date().toISOString().slice(0, 10);
            const dayLog = ((doseLog || {})[eid] || {})[today] || { taken: [], done: false };
            const takenSet = new Set(dayLog.taken || []);
            const total = compIds.length;
            const doneCount = compIds.filter(id => takenSet.has(id)).length;
            const allDone = doneCount === total && total > 0;

            const toggleDose = (cid) => {
              const cur = new Set((((doseLog || {})[eid] || {})[today] || {}).taken || []);
              if (cur.has(cid)) cur.delete(cid); else cur.add(cid);
              const takenArr = compIds.filter(id => cur.has(id));
              const nowDone = takenArr.length === compIds.length;
              const wasDone = dayLog.done;
              setDoseLog(prev => {
                const eidLog = { ...((prev || {})[eid] || {}) };
                eidLog[today] = { taken: takenArr, done: nowDone };
                return { ...(prev || {}), [eid]: eidLog };
              });
              if (nowDone && !wasDone) { setDosePulse(true); setTimeout(() => setDosePulse(false), 1600); }
            };

            return (
              <div style={{ ...S.card, borderColor: allDone ? "rgba(34,214,138,0.3)" : "rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ ...S.label, marginBottom: 0 }}>Today's Protocol</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: allDone ? S.accent : "rgba(255,255,255,0.4)" }}>
                    {doneCount}/{total}{allDone ? " · Complete ✓" : ""}
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ width: `${(doneCount / total) * 100}%`, height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#22d68a,#1ae87a)", transition: "width 0.3s ease" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {compIds.map(cid => {
                    const c = COMPOUNDS.find(x => x.id === cid);
                    if (!c) return null;
                    const checked = takenSet.has(cid);
                    return (
                      <button key={cid} onClick={() => toggleDose(cid)} style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                        padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        background: checked ? "rgba(34,214,138,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${checked ? "rgba(34,214,138,0.25)" : "rgba(255,255,255,0.07)"}`,
                        transition: "all 0.15s ease"
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: checked ? S.accent : "transparent",
                          border: `1.5px solid ${checked ? S.accent : "rgba(255,255,255,0.25)"}`,
                          color: "#0a0a0a", fontSize: 13, fontWeight: 800
                        }}>{checked ? "✓" : ""}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: checked ? "#fff" : "rgba(255,255,255,0.8)" }}>{c.name}</span>
                          {c.dosing && <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1, lineHeight: 1.4 }}>{c.dosing}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: allDone ? "rgba(34,214,138,0.6)" : "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                  {allDone
                    ? "Protocol complete for today. Your Eidolon is cultivating — see you tomorrow."
                    : "Check off each compound as you take it. Completing every day keeps your streak alive."}
                </div>
              </div>
            );
          })()}

          {/* 5. Active stack — equipped badges */}
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 10 }}>Active Stack</div>
            {(activeProtocol.compounds || []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {(activeProtocol.compounds || []).map(id => {
                  const c = COMPOUNDS.find(x => x.id === id);
                  if (!c) return null;
                  const catColor = CAT_COLORS[c.category] || "#888";
                  return (
                    <span key={id} style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "6px 12px",
                      borderRadius: 100,
                      background: `${catColor}12`,
                      border: `1px solid ${catColor}30`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff"
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: catColor,
                        boxShadow: `0 0 6px ${catColor}88`,
                        display: "inline-block"
                      }} />
                      {c.name}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No active stack</div>
            )}
          </div>

          {/* 6. Goals */}
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 10 }}>Goals</div>
            {(profile.goals || []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(profile.goals || []).map(gid => {
                  const goal = GOALS.find(x => x.id === gid);
                  if (!goal) return null;
                  return (
                    <span key={gid} style={{
                      fontSize: 12,
                      padding: "5px 12px",
                      borderRadius: 100,
                      background: "rgba(26,232,122,0.08)",
                      border: "1px solid rgba(26,232,122,0.18)",
                      color: S.accent,
                      fontWeight: 600
                    }}>
                      {goal.icon} {goal.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                No goals set. Tap <span style={{ color: S.accent, fontWeight: 600 }}>Manage ▾ → Modify</span> to change goals — they lock while a protocol is active.
              </div>
            )}
          </div>

          {/* 7. Primary actions — Protocol Guide is the headline post-lock-in
              action (Plan C); Projection + Timeline below. Eidolon management
              (Modify / Switch / New) lives in the "Manage ▾" nav dropdown (#62). */}
          <button onClick={onProtocolGuide} style={{ ...S.btn, marginTop: 8, marginBottom: 10 }}>
            View Full Protocol →
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <button
              onClick={() => !stackAnalysis.isBlocked && setShowTransform(true)}
              disabled={stackAnalysis.isBlocked}
              style={{
                ...S.btnOutline,
                ...(stackAnalysis.isBlocked ? { opacity: 0.4, cursor: "not-allowed" } : {})
              }}
            >
              View Projection
            </button>
            <button
              onClick={onTimeline}
              style={S.btnOutline}
            >
              Protocol Timeline
            </button>
          </div>
          {/* Plan E — progress photos entry */}
          <button onClick={onPhotos} style={{ ...S.btnOutline, marginBottom: 10 }}>
            📷 Progress Photos
          </button>
        </>
      )}

      {/* ═══ BUILDER MODE ═══ */}
      {editing && (
        <>
          {/* #19 — switch/create eidolons from the builder (no lock-in required).
              Name editing now lives in the avatar-first hero above (Plan A Step 2). */}
          {eidolons && eidolons.length >= 1 && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <button
                onClick={() => setShowEidolonSwitcher(true)}
                style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "6px 14px", borderRadius: 100, whiteSpace: "nowrap" }}
              >
                ⇄ Switch / New
              </button>
            </div>
          )}
          {/* #6 — Guided two-path fork. First-timers pick a lane instead of seeing
              the generator, the matched list, and the full library all at once. */}
          {builderView === null && (
            <>
              <div style={{ ...S.label, marginTop: 8, marginBottom: 12 }}>
                How do you want to build this protocol?
              </div>

              <button
                onClick={() => setBuilderPath("recommend")}
                style={{
                  ...S.card, width: "100%", textAlign: "left", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14, marginBottom: 12,
                  background: "linear-gradient(135deg, rgba(34,214,138,0.12), rgba(34,214,138,0.03))",
                  border: "1px solid rgba(34,214,138,0.35)", fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>⚡</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: S.accent, marginBottom: 4 }}>
                    Recommend a Stack
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                    Alki builds 2–3 research protocols matched to your profile, ranked conservative to aggressive. Best if you're new to peptides.
                  </span>
                </span>
                <span style={{ fontSize: 16, color: S.accent, flexShrink: 0 }}>→</span>
              </button>

              <button
                onClick={() => setBuilderPath("build")}
                style={{
                  ...S.card, width: "100%", textAlign: "left", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>🧪</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    Build My Own
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                    Browse compounds matched to your goals and assemble a custom stack. Best if you already know what you're researching.
                  </span>
                </span>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>→</span>
              </button>
            </>
          )}

          {/* RECOMMEND LANE — guided generator */}
          {builderView === "recommend" && (
            <>
              <button
                onClick={() => setBuilderPath("build")}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "4px 0", marginBottom: 4 }}
              >
                ← Build my own instead
              </button>
              <StackGenerator
                profile={profile}
                compoundCatalog={COMPOUNDS}
                defaultExpanded
                onLoadStack={(compoundIds) => {
                  setSelectedCompounds(compoundIds);
                  setShowTransform(false);
                }}
              />
            </>
          )}

          {/* SHARED — current selection: timeline + intelligence */}
          {builderView !== null && selectedCompounds.length > 0 && (
            <>
              {/* #58/#59 — Your Stack: see what's selected at a glance + remove in one tap */}
              <div style={{ ...S.card, marginBottom: 14 }}>
                <div style={{ ...S.label, marginBottom: 10 }}>
                  Your Stack — {selectedCompounds.length} compound{selectedCompounds.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selectedCompounds.map(cid => {
                    const c = COMPOUNDS.find(x => x.id === cid);
                    if (!c) return null;
                    const col = CAT_COLORS[c.category] || "#888";
                    return (
                      <div key={cid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 12px", borderRadius: 100, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{c.name}</span>
                        <button
                          onClick={() => toggleCompound(cid)}
                          title={`Remove ${c.name}`}
                          style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 18, height: 18, color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                        >×</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline CTA */}
              {!stackAnalysis.isBlocked && (
                <button onClick={onTimeline} style={{ ...S.btnOutline, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Protocol Timeline
                </button>
              )}

              {/* Stack Intelligence — compact */}
              <StackIntelligence
                stackIds={selectedCompounds}
                userProfile={profile}
                onRemoveCompound={toggleCompound}
                mode="compact"
                compoundCatalog={COMPOUNDS}
              />
            </>
          )}

          {/* BUILD LANE — manual compound selection */}
          {builderView === "build" && (
            <>
              <button
                onClick={() => setBuilderPath("recommend")}
                style={{ background: "none", border: "none", color: S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "4px 0", marginBottom: 4, marginTop: 4 }}
              >
                ⚡ Recommend a stack for me instead
              </button>

              {/* Compounds — connected filter (goal -> type) + sort (#51-57) */}
              {(() => {
                const chip = (active) => ({
                  padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                  background: active ? "rgba(34,214,138,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(34,214,138,0.25)" : "rgba(255,255,255,0.08)"}`,
                  color: active ? S.accent : "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                });
                const rowLabel = { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", minWidth: 38 };
                const goalChips = (profile.goals || []).map(gid => GOALS.find(g => g.id === gid)).filter(Boolean);
                const typeCats = goalScopedCats();
                const SORTS = [["match", "Best match"], ["name", "Name"], ["risk", "Risk"], ["category", "Category"]];
                return (
                  <div style={{ marginBottom: 16 }}>
                    {goalChips.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                        <span style={rowLabel}>Goal</span>
                        <button onClick={() => setGoal("all")} style={chip(goalFilter === "all")}>All</button>
                        {goalChips.map(g => (
                          <button key={g.id} onClick={() => setGoal(g.id)} style={chip(goalFilter === g.id)}>{g.icon} {g.label}</button>
                        ))}
                      </div>
                    )}
                    {typeCats.length > 1 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                        <span style={rowLabel}>Type</span>
                        <button onClick={() => { setCatFilter("all"); setShowAllRecommended(false); }} style={chip(catFilter === "all")}>All</button>
                        {typeCats.map(cat => (
                          <button key={cat} onClick={() => { setCatFilter(cat); setShowAllRecommended(false); }} style={chip(catFilter === cat)}>{cat}</button>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={rowLabel}>Sort</span>
                      {SORTS.map(([id, lbl]) => (
                        <button key={id} onClick={() => setSortMode(id)} style={chip(sortMode === id)}>{lbl}</button>
                      ))}
                      {selectedCompounds.length > 0 && (
                        <button onClick={clearSelection} style={{ ...chip(false), marginLeft: "auto", color: "#ef6b6b", borderColor: "rgba(239,107,107,0.3)" }}>
                          Clear ({selectedCompounds.length})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Stack-aware suggestions (#D) — synergistic partners for the
                  current selection. Advisory: tap + to add; nothing auto-added. */}
              {selectedCompounds.length > 0 && (() => {
                const suggestions = getStackSuggestions(selectedCompounds, COMPOUNDS)
                  .filter(s => !selectedCompounds.includes(s.id));
                if (suggestions.length === 0) return null;
                return (
                  <div style={{ ...S.card, borderColor: S.accentBorder, background: S.accentDim, marginTop: 4 }}>
                    <div style={{ ...S.label, marginBottom: 4 }}>Pairs well with your selection</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                      Synergistic with what you've picked — tap to add.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {suggestions.map(s => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button
                            onClick={() => toggleCompound(s.id)}
                            aria-label={`Add ${s.name}`}
                            style={{
                              width: 30, height: 30, flexShrink: 0, borderRadius: 9,
                              border: `2px solid ${S.accent}`, background: "transparent",
                              color: S.accent, fontSize: 17, cursor: "pointer", lineHeight: 1,
                              display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                          >+</button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                              Synergistic with {s.partners.join(", ")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Matched — filtered + sorted */}
              {(() => {
                const all = filterAndSort(recommended);
                const visible = showAllRecommended ? all : all.slice(0, 6);
                const hasMore = all.length > 6 && !showAllRecommended;
                return (
                  <>
                    <div style={{ ...S.label, marginBottom: 12, marginTop: 4 }}>
                      Matched to Your Profile — {all.length} compound{all.length !== 1 ? "s" : ""}
                    </div>
                    {all.length === 0 && (
                      <div style={{ ...S.card, color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6 }}>
                        No matched compounds for this filter.{otherCompounds.some(passesFilters) ? " See Browse all below." : " Try a different goal or type."}
                      </div>
                    )}
                    {visible.map(rec => (
                      <CompoundCard key={rec.compound.id} rec={rec} isSelected={selectedCompounds.includes(rec.compound.id)} onToggle={() => toggleCompound(rec.compound.id)} />
                    ))}
                    {hasMore && (
                      <button onClick={() => setShowAllRecommended(true)} style={{ ...S.btnOutline, marginTop: 8, marginBottom: 4, fontSize: 12, padding: "10px 16px" }}>
                        Show {all.length - 6} more matched compounds
                      </button>
                    )}
                  </>
                );
              })()}

              {/* Browse all — same filter + sort; auto-opens when a filter is active (#54) */}
              {otherCompounds.length > 0 && (() => {
                const all = filterAndSort(otherCompounds);
                const open = showOtherCompounds || filtersActive;
                return (
                  <>
                    <button
                      onClick={() => setShowOtherCompounds(v => !v)}
                      style={{ ...S.btnOutline, marginTop: 20, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", fontSize: 13 }}
                    >
                      <span>{open ? "Hide" : "Browse"} all compounds ({filtersActive ? `${all.length} matching` : `${otherCompounds.length} more`})</span>
                      <span style={{ fontSize: 11, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </button>
                    {open && (
                      <>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, marginBottom: 14, padding: "0 4px" }}>
                          These compounds fall outside your goals, body fat range, or experience tier. Some are educational reference only — read the full profile before considering.
                        </p>
                        {all.length === 0 && (
                          <div style={{ ...S.card, color: "rgba(255,255,255,0.45)", fontSize: 13 }}>None match the current filter.</div>
                        )}
                        {all.map(rec => (
                          <CompoundCard key={rec.compound.id} rec={rec} isSelected={selectedCompounds.includes(rec.compound.id)} onToggle={() => toggleCompound(rec.compound.id)} />
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {/* Fixed bottom CTA bar — always visible once a stack exists */}
          {builderView !== null && selectedCompounds.length > 0 && (
            <>
              {/* Spacer so content isn't hidden behind the fixed bar */}
              <div style={{ height: 80 }} />
              <div style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                padding: "12px 20px 20px", zIndex: 100,
                background: "linear-gradient(to top, #0a0a0a 85%, transparent)",
              }}>
                <button
                  onClick={() => !stackAnalysis.isBlocked && setShowTransform(true)}
                  disabled={stackAnalysis.isBlocked}
                  style={{
                    ...S.btn,
                    ...(stackAnalysis.isBlocked ? S.btnDisabled : {}),
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    maxWidth: 480, margin: "0 auto",
                    boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
                  }}
                >
                  {stackAnalysis.isBlocked
                    ? "Resolve Contraindications"
                    : `View Eidolon Projection (${selectedCompounds.length}) →`}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Eidolon Switcher Modal */}
      {showEidolonSwitcher && (
        <EidolonSwitcherModal
          eidolons={eidolons || []}
          activeEidolonId={activeEidolonId}
          onSelect={switchToEidolon}
          onClose={() => setShowEidolonSwitcher(false)}
          onCreate={createNewEidolon}
        />
      )}

      <p style={{ ...S.disclaimer, paddingBottom: 8 }}>
        All information is for research and educational purposes only. Nothing on this platform constitutes medical advice. Consult a licensed healthcare provider before initiating any peptide protocol. Alki assumes no liability for user decisions.
      </p>
      <p style={{ fontSize: 12, color: "rgba(26,232,122,0.3)", textAlign: "center", paddingBottom: 32, fontStyle: "italic", letterSpacing: "0.06em" }}>
        Alki · ἀλκή · Happy Researching.
      </p>
    </div>
  );
}

// ── SUPABASE PROFILE HELPERS ───────────────────────────────
async function loadProfile(userId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return {
      profile: {
        sex: data.sex,
        age: data.age,
        heightFt: data.height_ft,
        heightIn: data.height_in,
        weight: data.weight,
        bodyFat: data.body_fat,
        goals: data.goals || [],
        adv: data.adv || {}
      },
      selectedCompounds: data.selected_compounds || [],
      avatarUrl: data.avatar_url || null,
      activeProtocol: data.active_protocol || null,
      eidolons: data.eidolons || [],
      activeEidolonId: data.active_eidolon_id || null
    };
  } catch (e) {
    console.error("loadProfile error:", e);
    return null;
  }
}

async function saveProfile(userId, profile, selectedCompounds, avatarUrl, activeProtocol, eidolons, activeEidolonId) {
  if (!supabase || !profile) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        sex: profile.sex,
        age: profile.age,
        height_ft: profile.heightFt,
        height_in: profile.heightIn,
        weight: profile.weight,
        body_fat: profile.bodyFat,
        goals: profile.goals,
        adv: profile.adv || {},
        selected_compounds: selectedCompounds || [],
        avatar_url: avatarUrl || null,
        active_protocol: activeProtocol || null,
        eidolons: eidolons || [],
        active_eidolon_id: activeEidolonId || null,
        updated_at: new Date().toISOString()
      });
    if (error) console.error("saveProfile error:", error);
  } catch (e) {
    console.error("saveProfile error:", e);
  }
}

// ── AUTH SCREEN ────────────────────────────────────────────
function AuthScreen({ onAuth, onBack, onSkip, onBaseline, onCrashRepro }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem("alki_remember_email") ? true : false; } catch(_) { return false; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Pre-fill email from localStorage if "Remember me" was checked
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alki_remember_email");
      if (saved) setEmail(saved);
    } catch(_) {}
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "signup") {
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPw) { setError("Passwords don't match."); return; }
    }
    setLoading(true);
    // Persist or clear remembered email
    try {
      if (rememberMe && email) localStorage.setItem("alki_remember_email", email);
      else localStorage.removeItem("alki_remember_email");
    } catch(_) {}
    if (mode === "signin") {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) { setError(err.message); }
      else { onAuth(data.user); }
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (err) { setError(err.message); }
      else if (data.user && !data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("signin"); setPassword(""); setConfirmPw("");
      } else if (data.user) { onAuth(data.user); }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (err) setError(err.message);
  };

  // Send a password-reset email. Supabase mails a secure recovery link;
  // clicking it returns the user to the app, where onAuthStateChange fires
  // a PASSWORD_RECOVERY event and routes them to the set-new-password screen.
  // NOTE: the redirectTo origin must be registered in Supabase dashboard →
  // Authentication → URL Configuration → Redirect URLs (localhost for dev,
  // the Vercel domain for production).
  const handlePasswordReset = async () => {
    setError(null);
    setMessage(null);
    if (!email) { setError("Enter your email above, then tap Send reset link."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: SITE_URL,
    });
    setLoading(false);
    if (err) { setError(err.message); }
    else {
      setMessage("If an account exists for that email, a password reset link is on its way. Check your inbox (and spam).");
    }
  };

  return (
    <div style={S.inner}>
      <div style={{ padding: "16px 0 8px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          ← Back
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 360, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent, textShadow: "0 0 30px rgba(26,232,122,0.2)" }}>KI</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 }}>
            {mode === "signin" ? "Welcome back, researcher." : "Create your research account."}
          </p>
        </div>

        {message && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(26,232,122,0.1)", border: "1px solid rgba(26,232,122,0.2)", fontSize: 13, color: "#1ae87a", marginBottom: 16, lineHeight: 1.5 }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#fca5a5", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Email</label>
          <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={S.input} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <div style={{ marginBottom: 16, position: "relative" }}>
          <label style={S.label}>Password</label>
          <input type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ ...S.input, paddingRight: 48 }} onKeyDown={e => e.key === "Enter" && mode === "signin" && handleSubmit()} />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: "absolute", right: 14, top: 34, background: "none", border: "none",
              color: showPw ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
              fontSize: 16, cursor: "pointer", padding: "4px", lineHeight: 1,
            }}
            tabIndex={-1}
            title={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? "👁" : "👁‍🗨"}
          </button>
          {mode === "signin" && (
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button
                onClick={handlePasswordReset}
                disabled={loading}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>
        {mode === "signup" && (
          <div style={{ marginBottom: 16, position: "relative" }}>
            <label style={S.label}>Confirm Password</label>
            <input type={showConfirmPw ? "text" : "password"} placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={{ ...S.input, paddingRight: 48 }} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            <button
              type="button"
              onClick={() => setShowConfirmPw(v => !v)}
              style={{
                position: "absolute", right: 14, top: 34, background: "none", border: "none",
                color: showConfirmPw ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
                fontSize: 16, cursor: "pointer", padding: "4px", lineHeight: 1,
              }}
              tabIndex={-1}
              title={showConfirmPw ? "Hide password" : "Show password"}
            >
              {showConfirmPw ? "👁" : "👁‍🗨"}
            </button>
          </div>
        )}

        {/* Remember me */}
        {mode === "signin" && (
          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.45)",
            userSelect: "none",
          }}>
            <div
              onClick={() => setRememberMe(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                background: rememberMe ? S.accent : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${rememberMe ? S.accent : "rgba(255,255,255,0.15)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s ease", cursor: "pointer",
              }}
            >
              {rememberMe && <span style={{ color: "#060608", fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✓</span>}
            </div>
            <span onClick={() => setRememberMe(v => !v)}>Remember me</span>
          </label>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ ...S.btn, ...(loading ? S.btnDisabled : {}), marginBottom: 20 }}>
          {loading ? "Working..." : (mode === "signin" ? "Sign In" : "Create Account")}
        </button>

        <div style={{ textAlign: "center" }}>
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setMessage(null); }} style={{ background: "none", border: "none", color: S.accent, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        {onSkip && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={onSkip} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Continue without account →
            </button>
          </div>
        )}

        {onBaseline && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={onBaseline} style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.3)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              padding: "8px 16px",
              borderRadius: 8,
              letterSpacing: "0.04em",
            }}>
              ⚙ Baseline User (Dev)
            </button>
          </div>
        )}

        {onCrashRepro && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={onCrashRepro} style={{
              background: "none",
              border: "1px solid rgba(255,77,77,0.25)",
              color: "rgba(255,77,77,0.6)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              padding: "8px 16px",
              borderRadius: 8,
              letterSpacing: "0.04em",
            }}>
              ⚠ Crash Repro · 10-stack (Dev)
            </button>
          </div>
        )}
      </div>

      <p style={{ ...S.disclaimer, paddingBottom: 20 }}>
        Your research profile is saved to your account and synced across devices.
      </p>
    </div>
  );
}

// ── SET NEW PASSWORD (password recovery) ───────────────────
// Shown after the user clicks the reset link in their email. By the time
// this renders, Supabase has already established a temporary recovery
// session (via the PASSWORD_RECOVERY auth event), so updateUser can set
// the new password directly — no old password required.
function SetNewPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleUpdate = async () => {
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPw) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  };

  return (
    <div style={S.inner}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 360, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent, textShadow: "0 0 30px rgba(26,232,122,0.2)" }}>KI</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 }}>
            {done ? "Password updated." : "Set a new password."}
          </p>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#fca5a5", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {done ? (
          <>
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(26,232,122,0.1)", border: "1px solid rgba(26,232,122,0.2)", fontSize: 13, color: "#1ae87a", marginBottom: 20, lineHeight: 1.5 }}>
              Your password has been changed. You can use it to sign in from now on.
            </div>
            <button onClick={onDone} style={S.btn}>Continue</button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>New Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={S.input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Confirm New Password</label>
              <input type="password" placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={S.input} onKeyDown={e => e.key === "Enter" && handleUpdate()} />
            </div>
            <button onClick={handleUpdate} disabled={loading} style={{ ...S.btn, ...(loading ? S.btnDisabled : {}) }}>
              {loading ? "Working..." : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── APP ROOT ───────────────────────────────────────────────
export default function AlkiApp() {
  const [screen, setScreen] = useState(supabase ? "loading" : "splash");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedCompounds, setSelectedCompounds] = useState([]);
  const [showTransform, setShowTransform] = useState(false);
  // 3D parametric body is the default avatar (always on). Avaturn path is
  // disabled (see handleCaptureAvatar / AVATURN_ENABLED) but kept for later.
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL);
  const [avatarHeadshot, setAvatarHeadshot] = useState(null);
  const [showAvatarCapture, setShowAvatarCapture] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [doseLog, setDoseLog] = useState({}); // #16 — { [eidolonId]: { [YYYY-MM-DD]: { taken:[ids], done:bool } } }
  // Plan E — progress photos, in-memory ONLY (deliberately not in saveProfile/auto-save;
  // Supabase Storage is a future task). { [eidolonId]: [{ id, dataUrl, ts }] }
  const [photos, setPhotos] = useState({});
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [eidolons, setEidolons] = useState([]);
  const [activeEidolonId, setActiveEidolonId] = useState(null);
  const [onboardingStartStep, setOnboardingStartStep] = useState(null);
  // #64 — lightweight nav stack for the dashboard's sub-screens. Drives both
  // one-level Back and a persistent Home button once the user is 2+ deep.
  const [navHistory, setNavHistory] = useState([]);
  const saveTimeout = useRef(null);

  // ── Load saved avatar (URL + headshot PNG) from localStorage on mount ──
  // ── #16 — load/save daily dose log ──
  useEffect(() => {
    try { const d = localStorage.getItem("alki_dose_log"); if (d) setDoseLog(JSON.parse(d)); } catch (_) {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("alki_dose_log", JSON.stringify(doseLog)); } catch (_) {}
  }, [doseLog]);

  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem("alki_avatar_url");
      const savedShot = localStorage.getItem("alki_avatar_headshot");
      if (savedUrl) setAvatarUrl(savedUrl);
      if (savedShot) setAvatarHeadshot(savedShot);
    } catch (_) {}
  }, []);

  // ── Session check on mount ──
  useEffect(() => {
    if (!supabase) return;

    // Track whether onAuthStateChange fires PASSWORD_RECOVERY before
    // getSession routing runs. This prevents a recovery session from
    // bypassing the set-new-password screen.
    let recoveryFired = false;

    // Subscribe FIRST so PASSWORD_RECOVERY can fire before getSession resolves.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          recoveryFired = true;
          setScreen("reset_password");
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setSelectedCompounds([]);
          setShowTransform(false);
          setAvatarUrl(DEFAULT_AVATAR_URL);
          setNavHistory([]);
          setScreen("splash");
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Check URL for recovery markers AND the event-driven flag.
      const isRecovery = recoveryFired ||
        (typeof window !== "undefined" && (
          window.location.hash.includes("type=recovery") ||
          window.location.search.includes("type=recovery")
        ));
      if (isRecovery) {
        setScreen("reset_password");
        return;
      }
      // If URL has PKCE auth params, wait briefly for onAuthStateChange
      // to potentially fire PASSWORD_RECOVERY before routing to dashboard.
      if (typeof window !== "undefined" && window.location.search.includes("code=")) {
        await new Promise(r => setTimeout(r, 500));
        if (recoveryFired) { setScreen("reset_password"); return; }
      }
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id).then(saved => {
          if (saved) {
            setProfile(saved.profile);
            setSelectedCompounds(saved.selectedCompounds || []);
            // 3D default always on; only override if a saved avatar exists.
            setAvatarUrl(saved.avatarUrl || DEFAULT_AVATAR_URL);
            setActiveProtocol(saved.activeProtocol || null);
            setEidolons(saved.eidolons || []);
            setActiveEidolonId(saved.activeEidolonId || null);
            setScreen("dashboard");
          } else {
            setScreen("onboarding");
          }
        });
        // Load progress logs for cultivation state
        if (supabase) {
          supabase.from("progress_logs").select("*").eq("user_id", session.user.id)
            .order("logged_at", { ascending: false }).limit(50)
            .then(({ data }) => { if (data) setProgressLogs(data); });
        }
      } else {
        setScreen("splash");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Auto-save profile on changes (debounced) ──
  useEffect(() => {
    if (!supabase || !user || !profile) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveProfile(user.id, profile, selectedCompounds, avatarUrl, activeProtocol, eidolons, activeEidolonId);
    }, 1500);
    return () => clearTimeout(saveTimeout.current);
  }, [user, profile, selectedCompounds, avatarUrl, activeProtocol, eidolons, activeEidolonId]);

  const cultivationState = useMemo(() => {
    // Filter progress logs to the active eidolon for cultivation state
    // Strictly scope to the active eidolon — or to solo (untagged) logs when
    // none is active — so one eidolon never inherits another's (or legacy) logs.
    const eidolonLogs = !progressLogs.length
      ? progressLogs
      : progressLogs.filter(l => activeEidolonId ? l.eidolon_id === activeEidolonId : !l.eidolon_id);
    // #16 hybrid: completed dose-days keep the streak alive & state progressing.
    // Weekly weight/BF logs still drive measured gains (effectiveProfile / trend).
    const dl = doseLog[activeEidolonId || "solo"] || {};
    const doseDays = Object.keys(dl)
      .filter(d => dl[d] && dl[d].done)
      .map(d => ({ logged_at: new Date(d + "T12:00:00").toISOString(), eidolon_id: activeEidolonId, _dose: true }));
    const merged = [...eidolonLogs, ...doseDays].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    return getCultivationState(merged);
  }, [progressLogs, activeEidolonId, doseLog]);

  const handleAvatarCreated = useCallback((url, headshotDataUrl) => {
    setAvatarUrl(url);
    setAvatarHeadshot(headshotDataUrl || null);
    setShowAvatarCapture(false);
    try {
      localStorage.setItem("alki_avatar_url", url);
      if (headshotDataUrl) {
        localStorage.setItem("alki_avatar_headshot", headshotDataUrl);
      } else {
        localStorage.removeItem("alki_avatar_headshot");
      }
    } catch (_) {}
  }, []);

  const handleResetAvatar = useCallback(() => {
    // 3D body is always on, so "reset" returns to the default parametric
    // body (not null, which would drop to the 2D SVG with no way back).
    setAvatarUrl(DEFAULT_AVATAR_URL);
    setAvatarHeadshot(null);
    try {
      localStorage.removeItem("alki_avatar_url");
      localStorage.removeItem("alki_avatar_headshot");
    } catch (_) {}
  }, []);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSelectedCompounds([]);
    setShowTransform(false);
    setAvatarUrl(DEFAULT_AVATAR_URL);
    setActiveProtocol(null);
    setNavHistory([]);
    setScreen("splash");
  };

  const handleAuthComplete = async (authUser) => {
    setUser(authUser);
    const saved = await loadProfile(authUser.id);
    if (saved) {
      setProfile(saved.profile);
      setSelectedCompounds(saved.selectedCompounds || []);
      // 3D default always on; only override if a saved avatar exists.
      setAvatarUrl(saved.avatarUrl || DEFAULT_AVATAR_URL);
      setActiveProtocol(saved.activeProtocol || null);
      setEidolons(saved.eidolons || []);
      setActiveEidolonId(saved.activeEidolonId || null);
      setScreen("dashboard");
    } else {
      setScreen("onboarding");
    }
    // Load progress logs
    if (supabase) {
      supabase.from("progress_logs").select("*").eq("user_id", authUser.id)
        .order("logged_at", { ascending: false }).limit(50)
        .then(({ data }) => { if (data) setProgressLogs(data); });
    }
  };

  // #64 — every screen change returns to the top. Carrying the previous
  // screen's scroll position was landing users mid-page ("screen loaded at
  // bottom"). Applies to ALL screens for consistent load behavior.
  useEffect(() => {
    try { window.scrollTo(0, 0); } catch (_) {}
  }, [screen]);

  // #64 — sub-screen navigation. navTo pushes the current screen so Back
  // returns one level (not always straight to home), and the persistent Home
  // button (rendered below) appears once navHistory is 2+ deep.
  const navTo = (next) => { setNavHistory((h) => [...h, screen]); setScreen(next); };
  const navBack = () => {
    const prev = navHistory.length ? navHistory[navHistory.length - 1] : "dashboard";
    setNavHistory((h) => h.slice(0, -1));
    setScreen(prev);
  };
  const goHome = () => { setNavHistory([]); setScreen("dashboard"); };

  const afterAgeGate = supabase ? "auth" : "onboarding";

  return (
    <div style={S.app}>
      {AVATURN_ENABLED && showAvatarCapture && (
        <AvaturnCapture
          onAvatarCreated={handleAvatarCreated}
          onCancel={() => setShowAvatarCapture(false)}
        />
      )}

      {screen === "loading" && (
        <div style={{ ...S.inner, justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 12 }}>Loading...</div>
        </div>
      )}

      {screen === "splash" && <SplashScreen onEnter={() => setScreen("agegate")} />}
      {screen === "agegate" && <AgeGate onConfirm={() => setScreen(afterAgeGate)} onDeny={() => setScreen("blocked")} />}
      {screen === "blocked" && <AgeBlocked />}
      {screen === "auth" && (
        <AuthScreen
          onAuth={handleAuthComplete}
          onBack={() => setScreen("agegate")}
          onSkip={() => setScreen("onboarding")}
          onBaseline={() => {
            // Fresh start with pre-filled average values — always runs
            // the full new-user flow, never saves to Supabase (no user).
            setUser(null);
            setProfile({ ...BASELINE_PROFILE, goals: [] }); // goals blank for active choice
            setSelectedCompounds([]);
            setShowTransform(false);
            setActiveProtocol(null);
            setEidolons([]);
            setActiveEidolonId(null);
            setAvatarUrl(DEFAULT_AVATAR_URL);
            setAvatarHeadshot(null);
            setOnboardingStartStep(0);
            setScreen("onboarding");
          }}
          onCrashRepro={() => {
            // #47 repro — load the lean profile + 10-compound stack straight
            // into the dashboard builder. No Supabase user; nothing persisted.
            setUser(null);
            setProfile({ ...CRASH_REPRO_PROFILE });
            setSelectedCompounds([...CRASH_REPRO_STACK]);
            setShowTransform(false);
            setActiveProtocol(null);
            setEidolons([]);
            setActiveEidolonId(null);
            setAvatarUrl(DEFAULT_AVATAR_URL);
            setAvatarHeadshot(null);
            setOnboardingStartStep(null);
            setScreen("dashboard");
          }}
        />
      )}
      {screen === "reset_password" && (
        <SetNewPassword
          onDone={async () => {
            // After setting a new password the user holds a valid session.
            // Clear the recovery token from the URL, then route them in.
            try {
              if (typeof window !== "undefined" && window.history?.replaceState) {
                window.history.replaceState(null, "", window.location.pathname);
              }
            } catch (_) {}
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await handleAuthComplete(session.user);
            } else {
              setScreen("auth");
            }
          }}
        />
      )}
      {screen === "onboarding" && (
        <Onboarding
          onComplete={(p) => {
            const eid = { id: 'e_' + Date.now(), name: 'Eidolon 1', goals: p.goals, compounds: [], lockedAt: null };
            setEidolons(prev => [...(prev || []).filter(e => e.id !== eid.id), eid]);
            setActiveEidolonId(eid.id);
            setProfile(p);
            setOnboardingStartStep(null);
            setScreen("dashboard");
          }}
          onExitHome={() => { setProfile(null); setSelectedCompounds([]); setShowTransform(false); setOnboardingStartStep(null); setScreen("splash"); }}
          prefill={profile}
          initialStep={onboardingStartStep ?? (profile ? 3 : 0)}
        />
      )}
      {screen === "dashboard" && profile && (
        <Dashboard
          profile={profile}
          setProfile={setProfile}
          selectedCompounds={selectedCompounds}
          setSelectedCompounds={setSelectedCompounds}
          showTransform={showTransform}
          setShowTransform={setShowTransform}
          onReset={() => { setSelectedCompounds([]); setShowTransform(false); setScreen("onboarding"); }}
          onLockIn={(compounds) => { const p = { compounds, lockedAt: new Date().toISOString() }; setActiveProtocol(p); }}
          activeProtocol={activeProtocol}
          setActiveProtocol={setActiveProtocol}
          onBackToHome={null}
          onQA={() => navTo("qa")}
          onTimeline={() => navTo("timeline")}
          onProtocolGuide={() => navTo("protocol_guide")}
          onModeler={() => navTo("modeler")}
          onProgress={() => navTo("progress")}
          onPhotos={() => navTo("photos")}
          cultivationState={cultivationState}
          progressLogs={progressLogs}
          avatarUrl={avatarUrl}
          avatarHeadshot={avatarHeadshot}
          onCaptureAvatar={() => setShowAvatarCapture(true)}
          onResetAvatar={handleResetAvatar}
          onSignOut={supabase ? handleSignOut : null}
          userEmail={user?.email || null}
          eidolons={eidolons}
          setEidolons={setEidolons}
          activeEidolonId={activeEidolonId}
          setActiveEidolonId={setActiveEidolonId}
          doseLog={doseLog}
          setDoseLog={setDoseLog}
        />
      )}
      {screen === "progress" && (
        <ProgressLog
          onBack={navBack}
          userId={user?.id}
          eidolonId={activeEidolonId}
          profile={profile}
          cultivationState={cultivationState}
          onLogsChanged={setProgressLogs}
        />
      )}
      {screen === "photos" && (() => {
        const key = activeEidolonId || "solo";
        const activeName = (eidolons.find(e => e.id === activeEidolonId) || eidolons[0])?.name || "Your Eidolon";
        return (
          <ProgressPhotos
            photos={photos[key] || []}
            eidolonName={activeName}
            onCapture={(dataUrl) => setPhotos(prev => ({ ...prev, [key]: [...(prev[key] || []), { id: "p_" + Date.now(), dataUrl, ts: Date.now() }] }))}
            onDelete={(id) => setPhotos(prev => ({ ...prev, [key]: (prev[key] || []).filter(p => p.id !== id) }))}
            onBack={navBack}
          />
        );
      })()}
      {screen === "qa" && (() => {
        // #18 — scope Q&A to the user's stack: committed → locked stack, else builder selection
        const qaIds = (activeProtocol?.compounds?.length ? activeProtocol.compounds : selectedCompounds) || [];
        const qaNames = qaIds.map(id => COMPOUNDS.find(c => c.id === id)?.name).filter(Boolean);
        return <AlkiProtocolQA onBack={navBack} contextCompounds={qaNames} />;
      })()}
      {screen === "timeline" && (
        <CycleTimeline
          stack={selectedCompounds}
          compoundCatalog={COMPOUNDS}
          initialCycleLength={12}
          onBack={navBack}
        />
      )}
      {screen === "protocol_guide" && (
        <ProtocolGuideView
          stackIds={(activeProtocol?.compounds?.length ? activeProtocol.compounds : selectedCompounds) || []}
          profile={profile}
          onBack={navBack}
          onQA={() => navTo("qa")}
          onTimeline={() => navTo("timeline")}
        />
      )}
      {screen === "modeler" && (
        <PeptideModeler
          profile={profile}
          selectedCompounds={selectedCompounds}
          compoundCatalog={COMPOUNDS}
          onBack={navBack}
        />
      )}

      {/* #64 — persistent Home button, shown once the user is 2+ screens deep
          (e.g. dashboard → protocol guide → timeline). Back steps one level;
          this jumps straight home. Bottom-left to clear the feedback FAB. */}
      {navHistory.length >= 2 && (
        <button
          onClick={goHome}
          title="Back to home"
          style={{
            position: "fixed", left: 16, bottom: 24, zIndex: 901,
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 16px", borderRadius: 100,
            background: "rgba(20,20,20,0.92)", border: "1px solid rgba(26,232,122,0.3)",
            color: "#1ae87a", fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Syne', 'DM Sans', sans-serif",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          }}
        >
          ⌂ Home
        </button>
      )}

      {/* Dev/testing feedback button — visible on all screens past splash */}
      {screen !== "loading" && (
        <FeedbackFAB currentScreen={screen} userEmail={user?.email || null} />
      )}

      {/* Dev-only perf HUD — opt-in via ?perf=1 or localStorage alkiPerf=1 */}
      <PerfHUD screen={screen} />
    </div>
  );
}
