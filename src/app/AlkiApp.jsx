"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import StackIntelligence, { analyzeStack } from "./StackIntelligence";
import StackGenerator from "./StackGenerator";
import AlkiProtocolQA from "./AlkiProtocolQA";
import CycleTimeline from "./CycleTimeline";
import { EXPANDED_COMPOUNDS } from "./data/compounds-expanded";
import Body3DAvatar from "./Body3DAvatar";
import AvaturnCapture from "./AvaturnCapture";
import { AVATURN_ENABLED } from "./avaturnConfig";
import PeptideModeler from "./PeptideModeler";
import ProgressLog from "./screens/ProgressLog";
import Home from "./screens/Home";
import { getCultivationState, getCultivationVisuals, getRegressionFactor } from "./lib/cultivation";
import { supabase } from "./lib/supabase";
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
  const { sex, age, heightFt, heightIn, weight, bodyFat, goals, adv = {} } = profile;

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
function resolveAvatarParams(profile, selectedCompounds = []) {
  const bf = profile.bodyFat;
  const isMale = profile.sex === "male";

  // Base parameters from body fat %
  const baseFat = Math.max(0, Math.min(1, (bf - 6) / 34)); // 0 at 6%, 1 at 40%
  const baseMuscle = isMale ? 0.5 : 0.35;

  let fatMod = 0;
  let muscleMod = 0;
  let skinMod = 0;

  for (const cid of selectedCompounds) {
    const c = COMPOUNDS.find(x => x.id === cid);
    if (c) {
      fatMod += c.effects.bf / 100;
      muscleMod += c.effects.muscle / 100;
      skinMod += c.effects.skin;
    }
  }

  return {
    current: { fat: baseFat, muscle: baseMuscle, skin: 0, isMale },
    projected: {
      fat: Math.max(0, Math.min(1, baseFat + fatMod)),
      muscle: Math.max(0, Math.min(1, baseMuscle + muscleMod)),
      skin: skinMod,
      isMale
    }
  };
}

// ── SVG AVATAR COMPONENT ───────────────────────────────────
function BodyAvatar({ params, label, glow = false }) {
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

  const skinColor = glow ? "#d4a574" : "#c4956a";
  const skinDark = glow ? "#c49464" : "#b4855a";
  const glowFilter = glow ? "url(#avatarGlow)" : "";

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 260" style={{ width: "100%", maxWidth: 180 }}>
        {glow && (
          <defs>
            <filter id="avatarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="glowOverlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d68a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#22d68a" stopOpacity="0.02" />
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

          {/* Pecs / chest detail */}
          {isMale && muscle > 0.3 && (
            <>
              <ellipse cx={cx - 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
              <ellipse cx={cx + 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
            </>
          )}

          {/* Abs hint */}
          {fat < 0.35 && isMale && (
            <line x1={cx} y1={chestY + 6} x2={cx} y2={waistY - 2} stroke={skinDark} strokeWidth="0.8" opacity={0.3 - fat * 0.6} />
          )}

          {/* Arms */}
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
              </g>
            );
          })}

          {/* Legs */}
          {[-1, 1].map(side => {
            const hipX = cx + side * (hipW / 2 - thighW / 2 - 1);
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
        color: glow ? "#22d68a" : "rgba(255,255,255,0.5)",
        marginTop: 4
      }}>{label}</div>
    </div>
  );
}

// ── STYLES ─────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e8e8e8",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    overflow: "hidden"
  },
  inner: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 20px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  accent: "#22d68a",
  accentDim: "rgba(34,214,138,0.15)",
  accentBorder: "rgba(34,214,138,0.25)",
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  btn: {
    width: "100%",
    padding: "16px 24px",
    background: "#22d68a",
    color: "#0a0a0a",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
    fontFamily: "inherit",
    transition: "opacity 0.2s"
  },
  btnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed"
  },
  btnOutline: {
    width: "100%",
    padding: "14px 24px",
    background: "transparent",
    color: "#22d68a",
    border: "2px solid rgba(34,214,138,0.3)",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit"
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 8,
    display: "block"
  },
  tag: {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    marginRight: 8,
    marginBottom: 8
  },
  disclaimer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    lineHeight: 1.5,
    textAlign: "center",
    padding: "16px 0"
  }
};

// ── SCREEN COMPONENTS ──────────────────────────────────────

function SplashScreen({ onEnter }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center", opacity: show ? 1 : 0, transition: "opacity 0.8s ease" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>ἀλκή</div>
        <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, lineHeight: 1 }}>
          <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 12, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Peptide Intelligence Platform
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 6, fontStyle: "italic", letterSpacing: "0.04em" }}>
          εἰδωλον · Your Eidolon Awaits
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 320 }}>
        <button style={S.btn} onClick={onEnter}>
          Enter Platform
        </button>
        <p style={{ ...S.disclaimer, marginTop: 20, maxWidth: 280, margin: "20px auto 0" }}>
          For informational and research purposes only. Not medical advice. Consult a licensed physician before initiating any peptide protocol.
        </p>
        <p style={{ fontSize: 12, color: "rgba(34,214,138,0.4)", marginTop: 12, fontStyle: "italic", letterSpacing: "0.06em" }}>
          Happy Researching.
        </p>
      </div>
    </div>
  );
}

function AgeGate({ onConfirm, onDeny }) {
  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(34,214,138,0.1)", border: `1px solid ${S.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>
          🔒
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Age Verification</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>
          Alki is designed exclusively for adults aged 18 and older. By continuing, you confirm that you are at least 18 years of age.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 320 }}>
        <button style={S.btn} onClick={onConfirm}>
          I am 18 or older
        </button>
        <button style={{ ...S.btnOutline, marginTop: 12 }} onClick={onDeny}>
          I am under 18
        </button>
      </div>
    </div>
  );
}

function AgeBlocked() {
  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700 }}>Access Restricted</h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 12, maxWidth: 300 }}>
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
    bfNum < 8 ? { text: "Competition-level lean. All compounds available for research. Recovery and GH peptides are most commonly studied at this range.", color: "#22d68a" } :
    bfNum < 15 ? { text: "Athletic range. Full compound spectrum available for research. GH and recovery peptides are frequently studied here; GLP-1 research indicates lean mass risk at this level.", color: "#22d68a" } :
    bfNum < 22 ? { text: "Healthy range. Full compound spectrum available. Research literature supports body recomposition protocols at this body fat level.", color: "#22d68a" } :
    bfNum < 30 ? { text: "Research literature indicates GLP-1 compounds show strongest outcomes at this range. Fat loss protocols will be prioritized in your research profile.", color: "#22d68a" } :
    { text: "Research literature documents strongest GLP-1 clinical results at this body fat percentage. Fat loss protocols will lead your research profile.", color: "#22d68a" }
  ) : null;

  const steps = [
    // Step 0: Sex
    <div key="sex">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Biological Sex</h2>
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
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Biometrics</h2>
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
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Body Fat Percentage</h2>
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
                  <span style={{ background: "rgba(34,214,138,0.15)", color: "#22d68a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
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
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Primary Goals</h2>
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

  const catColors = {
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
    Hormonal: "#f43f5e"
  };
  const catColor = catColors[c.category] || "#888";

  return (
    <div style={{
      ...S.card,
      opacity: blocked ? 0.45 : 1,
      borderColor: isSelected ? S.accent : "rgba(255,255,255,0.08)",
      background: isSelected ? "rgba(34,214,138,0.06)" : "rgba(255,255,255,0.04)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{c.name}</span>
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
            fontSize: 18, color: isSelected ? "#0a0a0a" : "rgba(255,255,255,0.3)", flexShrink: 0
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
              <div style={{ ...S.label, marginBottom: 6, color: "#22d68a" }}>Documented Advantages</div>
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
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(34,214,138,0.06)", border: "1px solid rgba(34,214,138,0.15)", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
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
    ? "#22d68a"
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
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
            {projected}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            from <span style={{ color: "rgba(255,255,255,0.6)" }}>{current}</span>{" "}
            <span style={{ color: deltaColor, fontWeight: 600 }}>({formattedDelta})</span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: deltaColor, lineHeight: 1.1 }}>
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
    ? "#22d68a"
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

function EidolonSwitcherModal({ eidolons, activeEidolonId, onSelect, onClose }) {
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
                background: e.id === activeEidolonId ? 'rgba(34,214,138,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${e.id === activeEidolonId ? '#22d68a' : 'rgba(255,255,255,0.08)'}`,
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
                {e.lockedAt && <span style={{ fontSize: 10, color: 'rgba(34,214,138,0.6)', fontWeight: 600 }}>LOCKED</span>}
                {e.id === activeEidolonId && <span style={{ color: '#22d68a', fontSize: 16 }}>●</span>}
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 16, padding: '12px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Dashboard({ profile, setProfile, selectedCompounds, setSelectedCompounds, showTransform, setShowTransform, onReset, onLockIn, activeProtocol, setActiveProtocol, onBackToHome, onQA, onTimeline, onModeler, onProgress, cultivationState, progressLogs, avatarUrl, onCaptureAvatar, onResetAvatar, onSignOut, userEmail, eidolons, setEidolons, activeEidolonId, setActiveEidolonId }) {
  const [animateIn, setAnimateIn] = useState(false);
  const [showOtherCompounds, setShowOtherCompounds] = useState(false);
  const [editing, setEditing] = useState(!activeProtocol);
  const [showGoalsEditor, setShowGoalsEditor] = useState(false);
  const [showEidolonSwitcher, setShowEidolonSwitcher] = useState(false);

  const activeEidolon = eidolons?.find(e => e.id === activeEidolonId) || eidolons?.[0] || null;
  const isModifying = editing && activeEidolon?.lockedAt != null;

  // ── Eidolon helpers ──
  const switchToEidolon = useCallback((eidId) => {
    const eid = eidolons.find(e => e.id === eidId);
    if (!eid) return;
    setActiveEidolonId(eidId);
    setProfile(prev => ({ ...prev, goals: eid.goals || [] }));
    if (eid.lockedAt && eid.compounds?.length) {
      setActiveProtocol({ compounds: eid.compounds, lockedAt: eid.lockedAt });
      setSelectedCompounds(eid.compounds);
      setEditing(false);
    } else {
      setActiveProtocol(null);
      setSelectedCompounds(eid.compounds || []);
      setEditing(true);
    }
    setShowTransform(false);
    setShowEidolonSwitcher(false);
  }, [eidolons]);

  const createNewEidolon = useCallback(() => {
    const num = (eidolons?.length || 0) + 1;
    const eid = { id: 'e_' + Date.now(), name: `Eidolon ${num}`, goals: [...(profile.goals || [])], compounds: [], lockedAt: null };
    setEidolons(prev => [...(prev || []), eid]);
    setActiveEidolonId(eid.id);
    setActiveProtocol(null);
    setSelectedCompounds([]);
    setEditing(true);
    setShowTransform(false);
  }, [eidolons, profile.goals]);

  const handleGoalToggle = useCallback((goalId) => {
    const newGoals = profile.goals.includes(goalId)
      ? profile.goals.filter(g => g !== goalId)
      : [...profile.goals, goalId];
    setProfile(prev => ({ ...prev, goals: newGoals }));
    if (activeEidolon) {
      setEidolons(prev => prev.map(e => e.id === activeEidolon.id ? { ...e, goals: newGoals } : e));
    }
  }, [profile.goals, activeEidolon]);

  const handleLockIn = useCallback((compounds) => {
    const protocol = { compounds, lockedAt: new Date().toISOString() };
    setActiveProtocol(protocol);
    if (activeEidolon) {
      setEidolons(prev => prev.map(e => e.id === activeEidolon.id ? { ...e, compounds, lockedAt: protocol.lockedAt } : e));
    }
    setEditing(false);
  }, [activeEidolon]);

  const recommendations = useMemo(() => getRecommendations(profile), [profile]);
  const stackAnalysis = useMemo(() => analyzeStack(selectedCompounds, profile), [selectedCompounds, profile]);

  useEffect(() => { setTimeout(() => setAnimateIn(true), 100); }, []);

  const toggleCompound = (id) => {
    setSelectedCompounds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setShowTransform(false);
  };

  const avatarParams = resolveAvatarParams(profile, selectedCompounds);

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

    return {
      bfChange,
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

  const recommendedIds = new Set(recommended.map(r => r.compound.id));
  const otherCompounds = recommendations.filter(r => !recommendedIds.has(r.compound.id));

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
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Projected Research Outcome</h2>
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
              projected={`${Math.max(0, Math.round((profile.bodyFat + projectedChanges.bfChange) * 10) / 10)}%`}
              delta={projectedChanges.bfChange}
              unit="%"
              goodDirection="down"
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
              unit=""
              goodDirection="up"
              isScore
              note={projectedChanges.skinChange === 0 ? "No change" : null}
            />
            <StatTile
              label="Recovery"
              delta={projectedChanges.recoveryChange}
              unit=""
              goodDirection="up"
              isScore
              note={projectedChanges.recoveryChange === 0 ? "No change" : null}
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
            return (
              <div key={id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 8, fontSize: 12 }}>{c.dosing}</span>
              </div>
            );
          })}
        </div>

        {/* Stack Intelligence — full analysis */}
        <StackIntelligence
          stackIds={selectedCompounds}
          userProfile={profile}
          onRemoveCompound={toggleCompound}
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
          View Research Timeline →
        </button>

        {/* Lock In / Confirm Changes from Transformation View */}
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

        <p style={S.disclaimer}>
          Projected research outcome based on published literature. Individual results are not guaranteed. This is not medical advice. Consult a licensed healthcare provider before initiating any protocol.
        </p>
        <p style={{ fontSize: 12, color: "rgba(34,214,138,0.35)", textAlign: "center", paddingBottom: 20, fontStyle: "italic", letterSpacing: "0.06em" }}>
          Happy Researching.
        </p>
      </div>
    );
  }

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

  return (
    <div style={{ ...S.inner, opacity: animateIn ? 1 : 0, transition: "opacity 0.6s ease" }}>
      {/* Header */}
      <div style={{ padding: "16px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {activeProtocol && editing && (
            <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              ← Home
            </button>
          )}
          <button onClick={() => setShowGoalsEditor(v => !v)} style={{ background: "none", border: "none", color: showGoalsEditor ? '#fff' : S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Goals
          </button>
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

      {/* Profile card */}
      <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 16, position: 'relative' }}>
        {/* Reset avatar icon — top-left */}
        {avatarUrl && (
          <button
            onClick={onResetAvatar}
            title="Reset avatar"
            style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0
            }}
          >
            ↺
          </button>
        )}
        <div style={{ width: 80, flexShrink: 0 }}>
          {avatarUrl ? (
            <Body3DAvatar avatarUrl={avatarUrl} params={avatarParams.current} label="" size="small" interactive={false} autoRotate={true} />
          ) : (
            <BodyAvatar params={avatarParams.current} label="" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{activeEidolon?.name || 'Eidolon 1'}</div>
            {!avatarUrl && (
              <button
                onClick={onCaptureAvatar}
                style={{
                  background: "rgba(34,214,138,0.12)",
                  border: "1px solid rgba(34,214,138,0.3)",
                  color: "#22d68a",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "5px 10px",
                  borderRadius: 8,
                }}
              >
                {AVATURN_ENABLED ? "Make it me" : "Make it me · setup"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
            {profile.sex === "male" ? "Male" : "Female"} · {profile.age} yrs · {profile.heightFt}'{profile.heightIn}" · {profile.weight} lbs<br />
            Body fat: <span style={{ color: "#fff", fontWeight: 600 }}>{profile.bodyFat}%</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {profile.goals.map(g => {
              const goal = GOALS.find(x => x.id === g);
              return (
                <span key={g} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: "rgba(34,214,138,0.1)", color: S.accent }}>
                  {goal?.label}
                </span>
              );
            })}
          </div>
          {userEmail && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
              {userEmail}
            </div>
          )}
          {/* Committed mode: Modify / Switch / New buttons */}
          {!editing && activeProtocol && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button onClick={() => { setSelectedCompounds(activeProtocol.compounds || []); setEditing(true); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Modify
              </button>
              {eidolons?.length > 1 && (
                <button onClick={() => setShowEidolonSwitcher(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Switch Eidolon
                </button>
              )}
              <button onClick={createNewEidolon} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                New
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Goals Editor — collapsible */}
      {showGoalsEditor && (
        <div style={{ ...S.card, borderColor: 'rgba(34,214,138,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ ...S.label, marginBottom: 0 }}>Goals for {activeEidolon?.name || 'Eidolon 1'}</div>
            <button onClick={() => setShowGoalsEditor(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
            {GOALS.map(g => {
              const active = profile.goals.includes(g.id);
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

      {/* ═══ COMMITTED MODE ═══ */}
      {!editing && activeProtocol && (
        <>
          {/* Projection CTA */}
          {selectedCompounds.length > 0 && (
            <button
              onClick={() => !stackAnalysis.isBlocked && setShowTransform(true)}
              disabled={stackAnalysis.isBlocked}
              style={{
                ...S.btn,
                ...(stackAnalysis.isBlocked ? S.btnDisabled : {}),
                marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              {stackAnalysis.isBlocked
                ? "Resolve Contraindications to Continue"
                : `View Eidolon Projection (${selectedCompounds.length} compound${selectedCompounds.length > 1 ? "s" : ""}) →`}
            </button>
          )}

          {/* Timeline CTA */}
          {selectedCompounds.length > 0 && !stackAnalysis.isBlocked && (
            <button onClick={onTimeline} style={{ ...S.btnOutline, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              View Research Timeline →
            </button>
          )}

          {/* Cultivation Status */}
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: cv.statusColor }}>Eidolon: {cv.statusLabel}</span>
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

          {/* Active Protocol Summary */}
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: 10 }}>Active Research Protocol</div>
            {(activeProtocol.compounds || []).map(id => {
              const c = COMPOUNDS.find(x => x.id === id);
              if (!c) return null;
              return (
                <div key={id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{c.dosing}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ BUILDER MODE ═══ */}
      {editing && (
        <>
          {/* Stack Generator */}
          <StackGenerator
            profile={profile}
            compoundCatalog={COMPOUNDS}
            onLoadStack={(compoundIds) => {
              setSelectedCompounds(compoundIds);
              setShowTransform(false);
            }}
          />

          {/* Projection CTA */}
          {selectedCompounds.length > 0 && (
            <button
              onClick={() => !stackAnalysis.isBlocked && setShowTransform(true)}
              disabled={stackAnalysis.isBlocked}
              style={{
                ...S.btn,
                ...(stackAnalysis.isBlocked ? S.btnDisabled : {}),
                marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              {stackAnalysis.isBlocked
                ? "Resolve Contraindications to Continue"
                : `View Eidolon Projection (${selectedCompounds.length} compound${selectedCompounds.length > 1 ? "s" : ""}) →`}
            </button>
          )}

          {/* Timeline CTA */}
          {selectedCompounds.length > 0 && !stackAnalysis.isBlocked && (
            <button onClick={onTimeline} style={{ ...S.btnOutline, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              View Research Timeline →
            </button>
          )}

          {/* Stack Intelligence — compact */}
          <StackIntelligence
            stackIds={selectedCompounds}
            userProfile={profile}
            onRemoveCompound={toggleCompound}
            mode="compact"
          />

          {/* Recommended compounds */}
          <div style={{ ...S.label, marginBottom: 12, marginTop: 8 }}>
            Matched to Your Profile — {recommended.length} compound{recommended.length !== 1 ? "s" : ""}
          </div>
          {recommended.length === 0 && (
            <div style={{ ...S.card, color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6 }}>
              No compounds match your current profile and goals. Try adjusting your goals, or browse the full library below.
            </div>
          )}
          {recommended.map(rec => (
            <CompoundCard
              key={rec.compound.id}
              rec={rec}
              isSelected={selectedCompounds.includes(rec.compound.id)}
              onToggle={() => toggleCompound(rec.compound.id)}
            />
          ))}

          {/* Browse all — collapsible */}
          {otherCompounds.length > 0 && (
            <>
              <button
                onClick={() => setShowOtherCompounds(v => !v)}
                style={{
                  ...S.btnOutline, marginTop: 20, marginBottom: 12,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 16px", fontSize: 13
                }}
              >
                <span>{showOtherCompounds ? "Hide" : "Browse"} all compounds ({otherCompounds.length} more)</span>
                <span style={{ fontSize: 11, transition: "transform 0.2s", display: "inline-block", transform: showOtherCompounds ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </button>
              {showOtherCompounds && (
                <>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, marginBottom: 14, padding: "0 4px" }}>
                    These compounds fall outside your goals, body fat range, or experience tier. Some are educational reference only — read the full profile before considering.
                  </p>
                  {otherCompounds.map(rec => (
                    <CompoundCard
                      key={rec.compound.id}
                      rec={rec}
                      isSelected={selectedCompounds.includes(rec.compound.id)}
                      onToggle={() => toggleCompound(rec.compound.id)}
                    />
                  ))}
                </>
              )}
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
        />
      )}

      <p style={{ ...S.disclaimer, paddingBottom: 8 }}>
        All information is for research and educational purposes only. Nothing on this platform constitutes medical advice. Consult a licensed healthcare provider before initiating any peptide protocol. Alki assumes no liability for user decisions.
      </p>
      <p style={{ fontSize: 12, color: "rgba(34,214,138,0.3)", textAlign: "center", paddingBottom: 32, fontStyle: "italic", letterSpacing: "0.06em" }}>
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
function AuthScreen({ onAuth, onBack, onSkip }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "signup") {
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPw) { setError("Passwords don't match."); return; }
    }
    setLoading(true);
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

  return (
    <div style={S.inner}>
      <div style={{ padding: "16px 0 8px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          ← Back
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 360, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 }}>
            {mode === "signin" ? "Welcome back, researcher." : "Create your research account."}
          </p>
        </div>

        {message && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(34,214,138,0.1)", border: "1px solid rgba(34,214,138,0.2)", fontSize: 13, color: "#22d68a", marginBottom: 16, lineHeight: 1.5 }}>
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
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={S.input} onKeyDown={e => e.key === "Enter" && mode === "signin" && handleSubmit()} />
        </div>
        {mode === "signup" && (
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Confirm Password</label>
            <input type="password" placeholder="••••••••" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={S.input} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
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
      </div>

      <p style={{ ...S.disclaimer, paddingBottom: 20 }}>
        Your research profile is saved to your account and synced across devices.
      </p>
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
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showAvatarCapture, setShowAvatarCapture] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [eidolons, setEidolons] = useState([]);
  const [activeEidolonId, setActiveEidolonId] = useState(null);
  const saveTimeout = useRef(null);

  // ── Session check on mount ──
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id).then(saved => {
          if (saved) {
            setProfile(saved.profile);
            setSelectedCompounds(saved.selectedCompounds || []);
            setAvatarUrl(saved.avatarUrl || null);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setSelectedCompounds([]);
          setShowTransform(false);
          setAvatarUrl(null);
          setScreen("splash");
        }
      }
    );
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

  const cultivationState = useMemo(() => getCultivationState(progressLogs), [progressLogs]);

  const handleAvatarCreated = useCallback((url) => {
    setAvatarUrl(url);
    setShowAvatarCapture(false);
  }, []);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSelectedCompounds([]);
    setShowTransform(false);
    setAvatarUrl(null);
    setActiveProtocol(null);
    setScreen("splash");
  };

  const handleAuthComplete = async (authUser) => {
    setUser(authUser);
    const saved = await loadProfile(authUser.id);
    if (saved) {
      setProfile(saved.profile);
      setSelectedCompounds(saved.selectedCompounds || []);
      setAvatarUrl(saved.avatarUrl || null);
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

  const afterAgeGate = supabase ? "auth" : "onboarding";

  return (
    <div style={S.app}>
      {showAvatarCapture && (
        <AvaturnCapture
          onAvatarCreated={handleAvatarCreated}
          onCancel={() => setShowAvatarCapture(false)}
        />
      )}

      {screen === "loading" && (
        <div style={{ ...S.inner, justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
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
        />
      )}
      {screen === "onboarding" && (
        <Onboarding
          onComplete={(p) => {
            const eid = { id: 'e_' + Date.now(), name: 'Eidolon 1', goals: p.goals, compounds: [], lockedAt: null };
            setEidolons(prev => [...(prev || []).filter(e => e.id !== eid.id), eid]);
            setActiveEidolonId(eid.id);
            setProfile(p);
            setScreen("dashboard");
          }}
          onExitHome={() => { setProfile(null); setSelectedCompounds([]); setShowTransform(false); setScreen("splash"); }}
          prefill={profile}
          initialStep={profile ? 3 : 0}
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
          onQA={() => setScreen("qa")}
          onTimeline={() => setScreen("timeline")}
          onModeler={() => setScreen("modeler")}
          onProgress={() => setScreen("progress")}
          cultivationState={cultivationState}
          progressLogs={progressLogs}
          avatarUrl={avatarUrl}
          onCaptureAvatar={() => setShowAvatarCapture(true)}
          onResetAvatar={() => setAvatarUrl(null)}
          onSignOut={supabase ? handleSignOut : null}
          userEmail={user?.email || null}
          eidolons={eidolons}
          setEidolons={setEidolons}
          activeEidolonId={activeEidolonId}
          setActiveEidolonId={setActiveEidolonId}
        />
      )}
      {screen === "progress" && (
        <ProgressLog
          onBack={() => setScreen("dashboard")}
          userId={user?.id}
          profile={profile}
          cultivationState={cultivationState}
          onLogsChanged={setProgressLogs}
        />
      )}
      {screen === "qa" && (
        <AlkiProtocolQA onBack={() => setScreen("dashboard")} />
      )}
      {screen === "timeline" && (
        <CycleTimeline
          stack={selectedCompounds}
          initialCycleLength={12}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "modeler" && (
        <PeptideModeler
          profile={profile}
          selectedCompounds={selectedCompounds}
          compoundCatalog={COMPOUNDS}
          onBack={() => setScreen("dashboard")}
        />
      )}
    </div>
  );
}
