"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import StackIntelligence, { analyzeStack, getStackSuggestions } from "./components/StackIntelligence";
import StackGenerator from "./components/StackGenerator";
import AlkiProtocolQA from "./screens/AlkiProtocolQA";
import CycleTimeline from "./components/CycleTimeline";
import { COMPOUNDS } from "./data/compounds";
import Body3DAvatar from "./avatar/Body3DAvatar";
import AvaturnCapture from "./avatar/AvaturnCapture";
import { AVATURN_ENABLED } from "./avatar/avaturnConfig";
import PeptideModeler from "./components/PeptideModeler";
import StatTile from "./components/StatTile";
import BiomarkerRow from "./components/BiomarkerRow";
import EidolonSwitcherModal from "./components/EidolonSwitcherModal";
import ProgressLog from "./screens/ProgressLog";
import ProtocolGuideView from "./screens/ProtocolGuideView";
import ProgressPhotos from "./screens/ProgressPhotos";
import SettingsView, { TRAINING_STATUSES } from "./screens/SettingsView";
import { DEFAULT_PREFERENCES, formatWeight, formatHeight, lbToKg } from "./lib/units";
import { getCultivationState, getCultivationVisuals } from "./lib/cultivation";
import { supabase } from "./lib/supabase";
import { resolveMorphStates } from "./lib/morphTargets";
import { selectBaseMesh } from "./lib/selectBaseMesh";
import { getStackVectors } from "./lib/compoundMorphVectors";
import { projectBodyFat, projectWeight } from "./lib/bodyComposition";
import { DISCLAIMER } from "./lib/disclaimer";
import { isProUser, maxEidolons, lockedEidolonIds } from "./lib/subscription";
import UpgradePrompt from "./components/UpgradePrompt";
import SlotPurchasePrompt from "./components/SlotPurchasePrompt";
import TutorialOverlay from "./components/TutorialOverlay";
import { TUTORIAL_SLIDES, TUTORIAL_SEEN_KEY, NUDGE_PROJECTION_KEY } from "./lib/tutorial";
import { simulate } from "./engine/simulate";
import { mapToMorphs } from "./engine/mapToMorphs";
import FeedbackFAB from "./components/utilities/FeedbackFAB";
import PerfHUD from "./components/utilities/PerfHUD";
import { S, GOALS } from "./components/appStyles";
import SplashScreen from "./components/SplashScreen";
import AgeGate from "./components/AgeGate";
import Onboarding from "./components/Onboarding";
import BodyAvatar from "./components/BodyAvatar";
import { ACCENT } from "./theme";

// ─────────────────────────────────────────────────────────────
// Default 3D parametric body. This is the always-on avatar fallback for an
// incomplete profile / "Reset" (not null). Points at the 14-key male_lean
// base so the body_mass channel and re-sculpted muscle are always available;
// per-profile base selection (male/female × lean/heavy) is resolved by
// selectBaseMesh() at the load/onboarding sites. The legacy
// /alki_humgen_male.glb (13 keys, no body_mass) is superseded.
const DEFAULT_AVATAR_URL = "/alki_humgen_male_lean.glb";
// ─────────────────────────────────────────────────────────────
// Public site URL — used for auth redirect links (password reset) so the
// email ALWAYS points at the deployed app, never localhost. Set
// NEXT_PUBLIC_SITE_URL in Vercel project settings to the production URL
// (e.g. https://alki.vercel.app). Falls back to current origin only if the
// env var is missing, so local dev still functions.
const SITE_URL =
  (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "");

// ═══════════════════════════════════════════════════════════
// ALKI — ἀλκή — The AI-Powered Peptide Intelligence Platform
// Complete MVP: Onboarding → Intelligence → Avatar → Transform
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// APP_VERSION / BUILD_SHA moved into ./components/SplashScreen (their only
// consumer) as part of the splash extraction.

// ─────────────────────────────────────────────────────────────
// Single dev-affordance gate. Dev-only shortcuts (the "Baseline User (Dev)"
// auth-screen seed, the PerfHUD overlay) are rendered ONLY when this is true.
// Keyed on NODE_ENV (Next inlines it as a literal at build), so a production
// build constant-folds this to `false` and the bundler dead-code-eliminates
// the gated branches entirely — they don't just stay hidden, they're not in
// the production bundle at all. True automatically under `npm run dev`, so the
// shortcuts are still there for local development. To exercise them against a
// production-style build, run that build locally with NODE_ENV unset to
// "production" (i.e. `npm run dev`) — they are intentionally unavailable on
// the deployed app.
const ALKI_DEV = process.env.NODE_ENV !== "production";

// Routed inner screens — everything reachable from the dashboard via navTo().
// Drives the single global navigation chrome (persistent HOME + contextual
// BACK) rendered at the app root. The dashboard itself is "home" and is NOT
// listed here, so it shows no chrome. Each of these screens reserves a top
// nav band (≈60px top padding) and no longer renders its own back button —
// the root chrome is the one consistent nav surface (Sprint 4, item 4.1).
const INNER_SCREENS = ["modeler", "progress", "qa", "timeline", "protocol_guide", "photos", "settings"];

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

// ── COMPOUND DATABASE ──────────────────────────────────────
// The full list (8 core + 63 expanded) is assembled in
// ./data/compounds.js, which combines compoundsCore.js (the canonical
// original 8) with compounds-expanded.js. Imported at the top of this
// file; no longer declared inline (audit item 9 — dual source removed).

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

// #3G — compounds that suppress the natural HPG axis (need a visible PCT warning):
// all androgen-receptor SARMs + Hormonal compounds. Cardarine / GW-0742 are PPARδ
// agonists, not androgenic, so they don't suppress — they were reclassified out of
// the SARM category (now Metabolic, audit 6.9), so the category check below no
// longer catches them. This set is kept as a defensive safety net in case either
// is ever re-tagged SARM, so it would still be excluded from the PCT warning.
const NON_SUPPRESSIVE_SARMS = new Set(["gw501516", "gw0742"]);
function isSuppressiveCompound(c) {
  if (!c) return false;
  if (c.category === "Hormonal") return true;
  if (c.category === "SARM" && !NON_SUPPRESSIVE_SARMS.has(c.id)) return true;
  return false;
}

// GOALS moved to ./components/appStyles (imported above) so the extracted
// Onboarding component and the Dashboard share one definition.

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

    // Goal matching — primary ranking signal. Optional-chain the catalog shape:
    // one malformed entry (missing suitability/contraindications) would otherwise
    // throw here, and since the caller wraps this in try/catch returning [], the
    // whole recommended + browse-all list would silently go blank.
    const compoundContras = compound.contraindications || [];
    const goalOverlap = goals.filter(g => compound.suitability?.goals?.includes(g));
    score += goalOverlap.length * 25;

    // BF-contextual advisories — informational, never blocking
    if (compoundContras.includes("below15bf") && bodyFat < 15) {
      flags.push("At your body fat level, this compound's primary mechanism may yield diminished results. Understand the trade-offs.");
      score -= 5;
    }
    if (compoundContras.includes("below22bf_glp1") && bodyFat < 22) {
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
// App compound IDs that name a compound the Eidolon Engine models under a
// DIFFERENT key (compoundVectors.js). Without this map these compounds would
// be silently dropped by simulate() and contribute nothing to the avatar.
// Only true renames belong here — same compound, different identifier.
const ENGINE_KEY_ALIASES = {
  mk2866: "ostarine",     // Ostarine (MK-2866)
  slu_pp_332: "slupp332", // SLU-PP-332
};

function resolveAvatarParams(profile, selectedCompounds = []) {
  const isMale = profile.sex === "male";

  // ── EIDOLON ENGINE PATH ──────────────────────────────────────────
  // Run the deterministic engine once (the §6.2 time-course) and derive
  // EVERY avatar input from its physiological output, so all render paths
  // reflect the engine: the rich morphState (parametric 3D shape keys),
  // AND the legacy 2-dim fat/muscle that the SVG avatar + legacy GLB
  // scaler still consume. Week 0 of the timeline is the user's real body
  // (current); the 12-week horizon is the projected eidolon. The stack is
  // the app's selected compound IDs — the engine resolves the ones it has
  // §5.8 vectors for and silently ignores the rest (e.g. PT-141, nootropics).
  // `fat` is kept in the SAME 6–40% normalization the SVG inverts at render
  // (bfPercent = 6 + fat*34), and `muscle` reads the engine's muscle_overall.
  try {
    const stack = selectedCompounds.map(id => ENGINE_KEY_ALIASES[id] || id);
    const sim = simulate(profile, stack, { weeks: 12 });
    if (sim) {
      const currentMorph = mapToMorphs(sim, 0);     // baseline snapshot
      const projectedMorph = mapToMorphs(sim);       // final (12-wk) snapshot
      const toFat = bfFrac => Math.max(0, Math.min(1, (bfFrac * 100 - 6) / 34));
      // Real (engine) frame height — the renderer anchors the avatar's vertical
      // envelope to this instead of normalizing every body to a fixed height,
      // so a taller user reads taller and the mass channel isn't cancelled
      // (Stage 4 fit fix, AVATAR_RANGE_ARCHITECTURE §4.6).
      const heightCm = sim.derivations?.inputs?.heightCm ?? null;
      return {
        current: {
          fat: toFat(sim.baseline.BF),
          muscle: Math.max(0, Math.min(1, currentMorph.muscle_overall)),
          skin: 0,
          isMale,
          heightCm,
          morphState: currentMorph
        },
        projected: {
          fat: toFat(sim.final.BF),
          muscle: Math.max(0, Math.min(1, projectedMorph.muscle_overall)),
          skin: projectedMorph.skin_tone_shift || 0,
          isMale,
          heightCm,
          morphState: projectedMorph
        }
      };
    }
  } catch (e) {
    // Never let an engine error blank the avatar (it's the core engagement
    // mechanic) — fall through to the legacy calc below.
    console.error("[Alki] eidolon engine failed, using legacy avatar params:", e);
  }

  // ── LEGACY FALLBACK ──────────────────────────────────────────────
  // Used only when the engine can't run (e.g. an incomplete profile
  // missing weight/height, which makes deriveAll return null). Unchanged.
  const bf = profile.bodyFat;

  // Best-effort frame height for the renderer's height anchor (mirrors
  // toSIProfile's ft+in → cm conversion). Null when absent → renderer uses
  // its reference height.
  const _ft = parseFloat(profile.heightFt);
  const _in = parseFloat(profile.heightIn);
  const heightCm =
    (!Number.isNaN(_ft) || !Number.isNaN(_in))
      ? ((Number.isNaN(_ft) ? 0 : _ft * 12) + (Number.isNaN(_in) ? 0 : _in)) / 0.3937007874
      : (typeof profile.heightCm === "number" ? profile.heightCm : null);

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
    if (c && c.effects) {
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
      heightCm,
      morphState: morphStates.current
    },
    projected: {
      fat: Math.max(0, Math.min(1, baseFat + fatMod * MORPH_GAIN)),
      muscle: Math.max(0, Math.min(1, baseMuscle + muscleMod * MORPH_GAIN)),
      skin: skinMod * MORPH_GAIN,
      isMale,
      heightCm,
      morphState: morphStates.projected
    }
  };
}

// SVG BodyAvatar extracted to ./components/BodyAvatar (imported above).

// ── STYLES ─────────────────────────────────────────────────
// The `S` style object moved to ./components/appStyles (imported above) so the
// extracted screen components share AlkiApp's exact styling. Every `S.x`
// reference in this file resolves to the imported object unchanged.

// ── SCREEN COMPONENTS ──────────────────────────────────────
// SplashScreen extracted to ./components/SplashScreen (imported above).
// AgeGate extracted to ./components/AgeGate (imported above).

function AgeBlocked() {
  return (
    <div style={{ ...S.inner, justifyContent: "safe center", alignItems: "center", textAlign: "center" }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>Access Restricted</h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 14, maxWidth: 300, lineHeight: 1.7 }}>
        Alki is not available to individuals under 18 years of age. This restriction is non-negotiable.
      </p>
    </div>
  );
}

// estimateNavyBodyFat moved into ./components/Onboarding (its only consumer).

// Onboarding extracted to ./components/Onboarding (imported above).

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

      {/* Audit 6.4/6.9 — the strongest per-compound safety string (carcinogenicity,
          no human data, dependency risk, etc.) previously rendered only in the
          Protocol Guide. Surface it on the card itself, at the point of selection,
          so a flagged compound never appears without its warning. Purely
          informational — it never blocks selection (advise, don't gatekeep). */}
      {c.displayWarning && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.5)", marginBottom: 10 }}>
          <span style={{ fontSize: 14, lineHeight: 1.3, flexShrink: 0 }}>⛔</span>
          <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 700, lineHeight: 1.45 }}>
            {c.displayWarning}
          </span>
        </div>
      )}

      {/* #3G — unmissable testosterone-suppression warning on every SARM / hormonal
          compound. Sits at the top of the card, not buried in the detail text. */}
      {isSuppressiveCompound(c) && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 12px", borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", marginBottom: 10 }}>
          <span style={{ fontSize: 14, lineHeight: 1.3, flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 600, lineHeight: 1.45 }}>
            Suppresses natural testosterone. Post-Cycle Therapy (PCT) may be required.
          </span>
        </div>
      )}

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
        {DISCLAIMER}
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
  onCaptureAvatar, onResetAvatar, showAvatarDebug,
  avatarResetSignal = 0,
  pulse = false, glowLevel = 0, projection = null, units = "imperial",
  isPro = false, onUpgrade,
}) {
  return (
    <>
      {/* Completion flourish is scale-only — opacity is driven by glowLevel so the
          glow brightens as the checklist fills, never dips on check-off (#16 bug). */}
      <style>{`@keyframes alkiDosePulse { 0% { transform: translateX(-50%) scale(1); } 35% { transform: translateX(-50%) scale(1.22); } 100% { transform: translateX(-50%) scale(1); } }`}</style>

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
            // Sprint 7 — renaming the Eidolon is a Pro customization. Free users
            // tapping the name get the upgrade prompt instead of an edit field.
            onClick={() => { if (isPro) onStartEditName(); else onUpgrade?.("eidolon_customization"); }}
            title={isPro ? "Tap to rename" : "Renaming is an Alki Pro feature"}
            style={{
              fontSize: 26, fontWeight: 800, color: "#fff", margin: 0,
              fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8, padding: "2px 8px"
            }}
          >
            {eidolonName}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>{isPro ? "✎" : "🔒"}</span>
          </h1>
        )}
        <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
          εἰδωλον
        </div>
      </div>

      {/* Hero avatar with radial glow that intensifies as today's protocol is
          checked off (#16): faint at none → full green when all doses are logged. */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "10px 0 4px", width: "100%" }}>
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(26,232,122,0.22) 0%, rgba(26,232,122,0.08) 40%, transparent 70%)",
          pointerEvents: "none", filter: "blur(6px)",
          opacity: 0.22 + Math.max(0, Math.min(1, glowLevel)) * 0.78,
          transition: "opacity 0.45s ease",
          animation: pulse ? "alkiDosePulse 1.4s ease" : undefined
        }} />
        <div style={{ position: "relative", width: "100%", maxWidth: 280 }}>
          {/* Sprint 7 (corrected) — the 3D BASELINE Eidolon renders for EVERY tier,
              free included. The 2D SVG is only a fallback when there's no GLB url.
              The Pro gate is the PROJECTION (before/after) surface, not the baseline
              avatar — see the gated "View Projection" buttons + showTransform. */}
          {avatarUrl ? (
            <Body3DAvatar avatarUrl={avatarUrl} params={avatarParams.current} label="" size="large" interactive={true} debugPanel={showAvatarDebug} resetSignal={avatarResetSignal} />
          ) : (
            <BodyAvatar params={avatarParams.current} label="" maxWidth={280} />
          )}
        </div>
      </div>

      {/* Avatar customization chip. Sprint 7 (corrected) — free users already
          have the 3D baseline avatar, so this is no longer a "3D" upsell. It now
          surfaces CUSTOMIZATION (renaming + "Make it me"), which stays Pro. */}
      <div style={{ textAlign: "center", marginBottom: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
        {!isPro ? (
          // HIDDEN FOR NOW (kept as an asset): the free-tier "Customize · Pro"
          // upsell chip. Re-enable by swapping the `null` below for the button.
          // <button onClick={() => onUpgrade?.("eidolon_customization")} style={{ background: "rgba(26,232,122,0.08)", border: "1px solid rgba(26,232,122,0.22)", color: S.accent, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 16px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>
          //   ✦ Customize · Pro
          // </button>
          null
        ) : avatarUrl ? (
          <button onClick={onResetAvatar} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>
            ↺ Reset Avatar
          </button>
        ) : (
          <button onClick={onCaptureAvatar} style={{ background: "rgba(26,232,122,0.08)", border: "1px solid rgba(26,232,122,0.22)", color: S.accent, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 16px", borderRadius: 100, cursor: "pointer", fontFamily: "inherit" }}>
            {AVATURN_ENABLED ? "✦ Make it me" : "Make it me · setup"}
          </button>
        )}
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
        {[
          { label: "BF",  value: `${profile.bodyFat}%` },
          { label: "WT",  value: formatWeight(profile.weight, units) },
          { label: "HT",  value: formatHeight(profile.heightFt, profile.heightIn, units) },
          { label: "AGE", value: `${profile.age}` },
          { label: "SEX", value: profile.sex === "male" ? "♂" : "♀" }
        ].map(p => (
          <div key={p.label} style={{ padding: "5px 11px", borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace" }}>{p.label}</span>
            <span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.value}</span>
          </div>
        ))}
      </div>

      {/* #11 — live projection summary: updates reactively as compounds are added/
          removed in the builder. Shows current → projected for the headline metrics. */}
      {projection && (() => {
        const cells = [
          { k: "BODY FAT", cur: `${profile.bodyFat}%`, proj: `${projection.projectedBodyFat}%`, delta: projection.bfChange, good: "down", unit: "%" },
          { k: "WEIGHT", cur: formatWeight(profile.weight, units), proj: formatWeight(projection.projectedWeight, units), delta: projection.weightChange, good: "down", unit: "lb" },
          // 6.10 — muscleChange is a unitless 0–3 effect score (Σ effects.muscle),
          // NOT a percentage and not an engine LBM delta. The compact pill has no
          // room for a clarifying note, so show an honest directional readout
          // instead of a fake "%". (Detailed Transform tile shows it as "pts".)
          { k: "LEAN MASS", cur: null, proj: projection.muscleChange === 0 ? "—" : (projection.muscleChange > 0 ? "Supported" : "At risk"), delta: projection.muscleChange, good: "up", unit: "" },
        ];
        const col = (d, good) => (!d || d === 0) ? "rgba(255,255,255,0.4)" : ((good === "up" ? d > 0 : d < 0) ? ACCENT : "#ef4444");
        return (
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: 14, borderColor: S.accentBorder, background: S.accentDim }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
              Projected · {projection.timeline}-wk
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {cells.map(c => (
                <div key={c.k} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>{c.k}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: col(c.delta, c.good), fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{c.proj}</div>
                  {c.cur && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>from {c.cur}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </>
  );
}

// Shared apply-core for switching the active eidolon. Used by both the Dashboard
// switcher (switchToEidolon) and the Settings switcher (switchActiveEidolon),
// which live in different component scopes and pass their own state setters in.
// Adopts the eidolon's id, goals, and its locked-vs-unlocked stack, then exits
// the transform view. Each caller layers its own extra side-effects (builder
// flush, editing flags, modal toggles) around this and supplies its own
// source-of-truth read. Returns whether the eidolon is locked so callers can set
// the editing flag accordingly.
function applyEidolonState(eid, { setActiveEidolonId, setProfile, setActiveProtocol, setSelectedCompounds, setShowTransform }) {
  const locked = !!(eid.lockedAt && eid.compounds?.length);
  setActiveEidolonId(eid.id);
  setProfile(prev => ({ ...prev, goals: eid.goals || [] }));
  if (locked) {
    setActiveProtocol({ compounds: [...eid.compounds], lockedAt: eid.lockedAt });
    setSelectedCompounds([...eid.compounds]);
  } else {
    setActiveProtocol(null);
    setSelectedCompounds(eid.compounds ? [...eid.compounds] : []);
  }
  setShowTransform(false);
  return locked;
}

function Dashboard({ profile, setProfile, selectedCompounds, setSelectedCompounds, showTransform, setShowTransform, onReset, onLockIn, activeProtocol, setActiveProtocol, onQA, onTimeline, onModeler, onProgress, onProtocolGuide, onPhotos, cultivationState, progressLogs, avatarUrl, avatarHeadshot, onCaptureAvatar, onResetAvatar, onSignOut, onSettings, units = "imperial", userEmail, eidolons, setEidolons, activeEidolonId, setActiveEidolonId, doseLog, setDoseLog, isPro = false, onSubscribe, onBuySlot }) {
  const [animateIn, setAnimateIn] = useState(false);
  // Sprint 7 — the ONE paywall surface for this screen. Set to a PRO_FEATURES
  // key to open the upgrade modal; gates call gatePro(feature, action) so a free
  // user gets the prompt and a Pro user runs the action. Centralizes the check
  // instead of scattering isPro branches across every button.
  const [paywall, setPaywall] = useState(null);
  const gatePro = (feature, action) => { if (isPro) { action?.(); } else { setPaywall(feature); } };
  // Sprint 7 (slots) — Pro users at their Eidolon cap see this one-time add-on
  // prompt instead of the (irrelevant) upgrade modal.
  const [slotPrompt, setSlotPrompt] = useState(false);

  // Eidolon allowance: how many Eidolons this profile may run (computed, never
  // stored), and which are locked because the profile is over that allowance
  // (e.g. a lapsed Pro). Locked eidolons are still VISIBLE — they're just not
  // editable and don't occupy an active slot until promoted.
  const eidolonCap = maxEidolons(profile);
  const lockedIds = useMemo(() => lockedEidolonIds(eidolons, profile), [eidolons, profile]);
  const atEidolonCap = (eidolons?.length || 0) >= eidolonCap;
  const [showOtherCompounds, setShowOtherCompounds] = useState(false);
  // #9166e05e — bumped on each "Reset Avatar" press to re-center the 3D orbit.
  const [avatarResetSignal, setAvatarResetSignal] = useState(0);
  // #51-57 — two-tier connected filter (goal -> type) + sort + clear.
  const [goalFilter, setGoalFilter] = useState("all");   // "all" | goalId
  const [catFilter, setCatFilter] = useState("all");     // "all" | category name
  const [searchQuery, setSearchQuery] = useState("");    // #46 — free-text compound search
  const [sortMode, setSortMode] = useState("match");     // match | name | risk | category
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [editing, setEditing] = useState(!activeProtocol);
  const [showManageMenu, setShowManageMenu] = useState(false); // #62 — committed-home Manage dropdown
  const [showEidolonSwitcher, setShowEidolonSwitcher] = useState(false);
  // Morph calibration panel stays available for future calibration sessions:
  // flip this default to true (or set via devtools) to surface the slider panel.
  // The in-app ⚙ toggle was removed for deployment hygiene (Sprint 1, item 1.2).
  const [showAvatarDebug] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [dosePulse, setDosePulse] = useState(false); // #16 — daily-dose completion pulse
  // D2 — builder Goals editor collapse state. Collapsed shows the chosen goals as a
  // compact summary so the section is concise; it stays open when no goals are set
  // (a new eidolon still needs to pick goals) and is one tap to reopen ("Change").
  const [goalsEditorOpen, setGoalsEditorOpen] = useState(false);
  // D3 — the projection surface is now tabbed: "projection" (before/after avatar +
  // stats, the selling point) and "timeline" (the cycle timeline, rendered inline).
  const [transformTab, setTransformTab] = useState("projection");
  // #6 — builder lane: null (chooser) | "recommend" | "build".
  const [builderPath, setBuilderPath] = useState(null);
  // Sprint 6.5 (optional nudge) — one-time, dismissable callout pointing at the
  // View Projection / Start Protocol CTA the first time a stack has compounds in
  // it, so a new user discovers the payoff. Own localStorage flag, fired once.
  const [showProjectionNudge, setShowProjectionNudge] = useState(false);
  const projectionNudgeChecked = useRef(false);

  const activeEidolon = eidolons?.find(e => e.id === activeEidolonId) || eidolons?.[0] || null;
  const isModifying = editing && activeEidolon?.lockedAt != null;
  // G1 — require naming the eidolon before its stack can be built. Only NEW eidolons
  // are flagged `named: false` at creation; eidolons saved before this change have no
  // `named` field (undefined), so they're grandfathered in and never re-gated.
  // Sprint 7 — the naming gate is itself a Pro customization, so it only applies
  // to Pro users. A free user keeps the default name ("Eidolon 1") and is NOT
  // forced to name before building (naming/renaming is Pro; stack-building is a
  // free keep) — gating it for free would otherwise deadlock the builder. If a
  // free user later upgrades, named:false still triggers the prompt then.
  const needsNaming = isPro && editing && activeEidolon && activeEidolon.named === false;
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

  // Sprint 6.5 (optional nudge) — surface the callout the first time the user
  // has a non-empty stack in the builder, once per device.
  useEffect(() => {
    if (projectionNudgeChecked.current) return;
    if (builderView !== null && selectedCompounds.length > 0) {
      projectionNudgeChecked.current = true;
      try { if (!localStorage.getItem(NUDGE_PROJECTION_KEY)) setShowProjectionNudge(true); } catch (_) {}
    }
  }, [builderView, selectedCompounds.length]);
  const dismissProjectionNudge = useCallback(() => {
    setShowProjectionNudge(false);
    try { localStorage.setItem(NUDGE_PROJECTION_KEY, "1"); } catch (_) {}
  }, []);

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
    // 3. Full clean swap — shared apply-core plus the builder-specific flags
    const locked = applyEidolonState(eid, { setActiveEidolonId, setProfile, setActiveProtocol, setSelectedCompounds, setShowTransform });
    setEditing(!locked);
    setShowEidolonSwitcher(false);
    setEditingName(false);
  }, [flushCurrentEidolon, setActiveEidolonId, setProfile, setActiveProtocol, setSelectedCompounds, setShowTransform]);

  const createNewEidolon = useCallback(() => {
    // Sprint 7 (slots) — enforce the Eidolon allowance at the single creation
    // choke point (both the Manage menu and the switcher modal route here). At
    // the cap, a Pro user is offered a one-time slot add-on; a free user gets
    // the Pro upgrade prompt. Either way we DON'T create the eidolon.
    const count = eidolonsRef.current?.length || 0;
    if (count >= maxEidolons(profile)) {
      setShowEidolonSwitcher(false);
      if (isPro) setSlotPrompt(true);
      else setPaywall("extra_eidolon");
      return;
    }
    // Save current eidolon's state before creating a new one
    flushCurrentEidolon();
    const num = (eidolonsRef.current?.length || 0) + 1;
    // G1 — named:false flags this eidolon for the naming gate before its stack can be built.
    const eid = { id: 'e_' + Date.now(), name: `Eidolon ${num}`, goals: [...(profile?.goals || [])], compounds: [], lockedAt: null, named: false };
    setEidolons(prev => [...(prev || []), eid]);
    setActiveEidolonId(eid.id);
    setActiveProtocol(null);
    setSelectedCompounds([]);
    setEditing(true);
    setShowTransform(false);
    setShowEidolonSwitcher(false);
    // G1 — the naming gate (needsNaming) owns the naming step now; seed an empty
    // field for it. The hero's inline editor is no longer auto-opened on create.
    setNameInput("");
    setEditingName(false);
  }, [flushCurrentEidolon, profile, isPro]);

  // Sprint 7 (slots) — promote a LOCKED eidolon back into the active window by
  // moving it to the front of the array. Locking is computed from array order
  // (lockedEidolonIds locks the trailing overflow), so a reorder is how the user
  // "chooses which Eidolons stay active" after a downgrade. Never deletes; the
  // eidolon that falls past the cap simply becomes the locked one instead.
  const promoteEidolon = useCallback((eidId) => {
    setEidolons(prev => {
      const list = prev || [];
      const target = list.find(e => e.id === eidId);
      if (!target) return list;
      return [target, ...list.filter(e => e.id !== eidId)];
    });
  }, [setEidolons]);

  const commitEidolonName = useCallback(() => {
    const trimmed = (nameInput || "").trim();
    if (!trimmed || !activeEidolon) { setEditingName(false); return; }
    // G1 — committing a name also clears the naming gate (named: true).
    setEidolons(prev => (prev || []).map(e => e.id === activeEidolon.id ? { ...e, name: trimmed, named: true } : e));
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
    // Sprint 7 — locking in a protocol is Pro. Free users can build/preview a
    // draft stack, but committing it (and the cultivation it unlocks) gates here.
    if (!isPro) { setPaywall("stack_lock_in"); return; }
    const protocol = { compounds, lockedAt: new Date().toISOString() };
    setActiveProtocol(protocol);
    if (activeEidolon) {
      setEidolons(prev => prev.map(e => e.id === activeEidolon.id ? { ...e, compounds, lockedAt: protocol.lockedAt } : e));
    }
    setEditing(false);
    setShowTransform(false);
    // Reset to the original dashboard load state: committed home, default
    // Projection tab, scrolled to the top so the centered avatar greets the user —
    // not wherever they happened to be (e.g. the Timeline tab, scrolled down) when
    // they locked in. The builder-home lock-in path never toggles showTransform, so
    // the scroll-reset effect wouldn't fire on its own; reset it here for both paths.
    setTransformTab("projection");
    try { window.scrollTo(0, 0); } catch (_) {}
  }, [activeEidolon, isPro]);

  // 4.3 — re-enter the builder on the committed stack to adjust it. Surfaced on
  // the committed home as a visible "Edit Protocol" button AND tappable Active
  // Stack / Goals cards, so users no longer have to dig through the Manage ▾ menu
  // to modify. The commit/lock logic is unchanged — this just flips back into the
  // existing edit flow with the locked compounds loaded.
  const startModify = useCallback(() => {
    setSelectedCompounds(activeProtocol?.compounds || []);
    setShowTransform(false);
    setEditing(true);
  }, [activeProtocol, setSelectedCompounds]);

  const recommendations = useMemo(() => {
    try { return getRecommendations(profile); }
    catch (e) { console.error('getRecommendations error:', e); return []; }
  }, [profile]);
  const stackAnalysis = useMemo(() => {
    if (selectedCompounds.length === 0) return { isBlocked: false, compounds: [], contraindications: [], synergies: [], redundancies: [], supportRequired: [], safetyScore: { overall: 100 }, summary: null };
    // #67 — pass the catalog so derived (catalog-fallback) compounds are counted.
    // Without it this score dropped non-COMPOUND_INTEL compounds and read higher
    // than the StackIntelligence card (which gets the catalog) — visible once the
    // score was echoed in the CTA bar. Now both use the same basis.
    try { return analyzeStack(selectedCompounds, profile, COMPOUNDS); }
    catch (e) { console.error('analyzeStack error:', e); return { isBlocked: false, compounds: [], contraindications: [], synergies: [], redundancies: [], supportRequired: [], safetyScore: { overall: 100 }, summary: null }; }
  }, [selectedCompounds, profile]);

  useEffect(() => { setTimeout(() => setAnimateIn(true), 100); }, []);

  // #64 — entering/leaving the projection view is a view change; scroll to top
  // so the before/after avatars are framed (matches screen-load behavior).
  // D3 — also reset to the Projection tab so the surface always opens on the
  // selling-point view, not whichever tab was left selected last time.
  useEffect(() => { try { window.scrollTo(0, 0); } catch (_) {} if (showTransform) setTransformTab("projection"); }, [showTransform]);

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

  // #16 — fraction of today's protocol that's been checked off (0..1). Drives the
  // hero avatar's green glow so it intensifies as the checklist fills.
  const doseProgress = useMemo(() => {
    const compIds = activeProtocol?.compounds || [];
    if (!compIds.length) return 0;
    const eid = activeEidolonId || "solo";
    const today = new Date().toISOString().slice(0, 10);
    const taken = new Set((((doseLog || {})[eid] || {})[today] || {}).taken || []);
    return compIds.filter(id => taken.has(id)).length / compIds.length;
  }, [doseLog, activeEidolonId, activeProtocol]);

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
      if (!c || !c.effects) continue;
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

    // #72dc3952 — the lean rows below (Fat-Free Mass, Muscle Mass) are anchored
    // to the user's manually-entered InBody figures and bumped by the muscle
    // effect sum — a SEPARATE track from projectWeight() (which is the
    // weight×(1−bf)-derived frame). Without a guard a muscle stack can project
    // lean ABOVE projected total weight, violating spec §2.1 (FM = W − LBM ⇒
    // LBM ≤ W). Compute projected weight up front and clamp each lean row to it.
    const projectedBodyFat = projectBodyFat(profile, selectedCompounds, COMPOUNDS) ?? profile.bodyFat;
    const projectedWeight = projectWeight(profile, selectedCompounds, COMPOUNDS) ?? (profile.weight ?? null);
    const weightChange = profile.weight ? projectedWeight - profile.weight : 0;
    // Clamp a projected lean value to projected total weight (§2.1) and re-derive
    // the delta so the row stays internally consistent (current + delta = projected).
    const capLeanToWeight = (base, projected) => {
      if (projectedWeight != null && projected > projectedWeight) {
        const capped = projectedWeight;
        return { projected: capped, delta: Math.round((capped - base) * 10) / 10 };
      }
      return { projected, delta: Math.round((projected - base) * 10) / 10 };
    };

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
      // §2.1 cap: muscle mass is lean tissue and cannot exceed projected weight.
      const capped = capLeanToWeight(muscleMassBase, Math.round((muscleMassBase + delta) * 10) / 10);
      advProjections.push({
        label: "Muscle Mass",
        unit: "lbs",
        current: muscleMassBase,
        delta: capped.delta,
        projected: capped.projected,
        positive: capped.delta > 0
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
      // §2.1 cap: fat-free mass (lean) cannot exceed projected total weight.
      const capped = capLeanToWeight(ffmBase, Math.round((ffmBase + delta) * 10) / 10);
      advProjections.push({
        label: "Fat-Free Mass",
        unit: "lbs",
        current: ffmBase,
        delta: capped.delta,
        projected: capped.projected,
        positive: capped.delta > 0
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

    // #47dc1758/#86132d26 — projectedBodyFat / projectedWeight / weightChange are
    // computed once at the top of this block (above the advanced-biomarker rows,
    // which now clamp lean to projectedWeight per spec §2.1). They come from the
    // shared lib/bodyComposition helper so the dashboard, the hero projection
    // summary, and the Modeler headline all display the SAME number. The helper
    // keeps the #bf clamp and the #68 constant-lean weight re-solve. Deep engines
    // are untouched — see the lib file's scope note.

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

    // Skip experimental-only and warning-flagged compounds (need explicit opt-in).
    // recommendableDespiteWarning lets a specific compound (Melanotan II) keep its
    // card warning yet stay recommendable; every other warned compound (carcinogens,
    // no-human-data) lacks the flag and remains excluded.
    if (c.experienceLevel === "experimental_only") return false;
    if (c.displayWarning && !c.recommendableDespiteWarning) return false;

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
    // #46 — free-text search across name, tagline, and category.
    const q = searchQuery.trim().toLowerCase();
    if (q && !`${c.name} ${c.tagline || ""} ${c.category || ""}`.toLowerCase().includes(q)) return false;
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
  const filtersActive = goalFilter !== "all" || catFilter !== "all" || searchQuery.trim() !== "";
  const setGoal = (g) => { setGoalFilter(g); setCatFilter("all"); setShowAllRecommended(false); };
  // #b7ee70fb — filter state and selection state are independent. Clearing
  // filters must NOT discard the user's picked compounds, and clearing the
  // selection must NOT reset the filters. Two separate handlers, each touching
  // only its own state.
  const clearSelection = () => setSelectedCompounds([]);
  const clearFilters = () => { setGoalFilter("all"); setCatFilter("all"); setSearchQuery(""); setShowAllRecommended(false); };

  const recommendedIds = new Set(recommended.map(r => r.compound.id));
  const otherCompounds = recommendations.filter(r => !recommendedIds.has(r.compound.id));

  // A2 — auto-expand "Browse all" when a filter becomes active (#54), but as a
  // one-shot: previously Browse-all visibility was `showOtherCompounds || filtersActive`,
  // which pinned the section open whenever any filter/search was set and made the
  // "Hide all compounds" button inert. Opening it via an effect on filter activation
  // lets the button fully control the section thereafter (collapses in both directions).
  useEffect(() => {
    if (filtersActive) setShowOtherCompounds(true);
  }, [filtersActive]);

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
        {paywall && (
          <UpgradePrompt featureKey={paywall} onSubscribe={onSubscribe} onClose={() => setPaywall(null)} />
        )}
        {/* ef1083fa — the projection surface now uses the SAME persistent HOME
            chrome as every other inner screen (fixed top-right ALKI⌂ pill), not a
            back arrow. The pill collapses the projection back to the dashboard home
            — identical to the dashboard wordmark's home action. */}
        <button
          onClick={() => { setShowTransform(false); if (activeProtocol) setEditing(false); }}
          title="Home"
          aria-label="Home"
          style={{
            position: "fixed", top: 12, right: 14, zIndex: 901,
            display: "flex", alignItems: "center", gap: 7,
            padding: "7px 13px", borderRadius: 100,
            background: "rgba(10,10,12,0.82)", border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", fontFamily: "'Syne', 'DM Sans', sans-serif",
            boxShadow: "0 2px 12px rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1 }}>⌂</span>
        </button>

        <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>εἰδωλον</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Projected Research Outcome</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6 }}>
            {projectedChanges.timeline}-week protocol · Based on published research literature
          </p>
        </div>

        {/* D3 — Projection / Timeline tabs. The projection (before/after) is the
            selling point and is the default; the cycle timeline lives behind a tab
            on the SAME surface instead of being buried as a separate screen. */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, marginBottom: 16 }}>
          {[["projection", "Projection"], ["timeline", "Timeline"]].map(([id, lbl]) => {
            const active = transformTab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  // Sprint 7 — the Cycle Timeline tab is Pro-gated.
                  if (id === "timeline" && !isPro) { setPaywall("cycle_timeline"); return; }
                  setTransformTab(id); try { window.scrollTo(0, 0); } catch (_) {}
                }}
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 100, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
                  background: active ? S.accent : "transparent",
                  color: active ? "#060608" : "rgba(255,255,255,0.6)",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {lbl}{id === "timeline" && !isPro ? " 🔒" : ""}
              </button>
            );
          })}
        </div>

        {transformTab === "timeline" ? (
          <div style={{ marginBottom: 8 }}>
            <CycleTimeline
              stack={selectedCompounds}
              compoundCatalog={COMPOUNDS}
              initialCycleLength={12}
              embedded
              locked={(() => {
                const ap = activeProtocol;
                if (!ap?.lockedAt) return false;
                const a = [...selectedCompounds].sort().join(",");
                const b = [...(ap.compounds || [])].sort().join(",");
                return a === b;
              })()}
            />
          </div>
        ) : (
        <>
        {/* Before / After — both rendered in 3D. This whole projection surface is
            Pro-gated (the "View Projection" buttons block free users), so we don't
            re-check isPro here; the SVG is only a fallback when a GLB url is absent. */}
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

        {/* Stats — core projections. D5 — the tiles are data-driven and ordered so
            the stack's actually-targeted outcomes (a non-zero projected change) lead,
            with untouched categories ("No change") falling to the end, so the
            projection reads as "here's what this stack moves" first. */}
        {(() => {
          const tiles = [
            { id: "bf", label: "Body Fat", current: `${profile.bodyFat}%`, projected: `${projectedChanges.projectedBodyFat}%`, delta: projectedChanges.bfChange, unit: "%", goodDirection: "down" },
            { id: "wt", label: "Weight", current: formatWeight(profile.weight, units), projected: formatWeight(projectedChanges.projectedWeight, units), delta: units === "metric" ? Math.round(lbToKg(projectedChanges.weightChange) * 10) / 10 : projectedChanges.weightChange, unit: units === "metric" ? " kg" : " lbs", goodDirection: "down", note: "Est. at projected body fat (lean mass held)" },
            { id: "lean", label: "Lean Mass", delta: projectedChanges.muscleChange, unit: " pts", isScore: true, goodDirection: "up", note: projectedChanges.muscleChange === 0 ? "No change" : "Relative effect score, not a percentage" },
            { id: "skin", label: "Skin Quality", delta: projectedChanges.skinChange, unit: "pts", isScore: true, goodDirection: "up", note: projectedChanges.skinChange === 0 ? "No change" : "Relative improvement score (0–20 scale)" },
            { id: "rec", label: "Recovery", delta: projectedChanges.recoveryChange, unit: "pts", isScore: true, goodDirection: "up", note: projectedChanges.recoveryChange === 0 ? "No change" : "Relative improvement score (0–20 scale)" },
          ];
          const isTargeted = (t) => typeof t.delta === "number" && t.delta !== 0;
          const ordered = tiles
            .map((t, i) => ({ t, i }))
            .sort((a, b) => (isTargeted(b.t) - isTargeted(a.t)) || (a.i - b.i))
            .map(x => x.t);
          const targetedCount = tiles.filter(isTargeted).length;
          return (
            <div style={S.card}>
              <div style={{ ...S.label, marginBottom: 12 }}>Projected Outcomes · {projectedChanges.timeline}-week protocol</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ordered.map(({ id, ...props }) => (
                  <StatTile key={id} {...props} />
                ))}
              </div>
              {targetedCount > 0 && targetedCount < tiles.length && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 10, lineHeight: 1.5 }}>
                  Outcomes this stack targets are shown first; categories it doesn't act on follow.
                </div>
              )}
            </div>
          );
        })()}

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
        </>
        )}

        {/* D3 — the Protocol Timeline is now the "Timeline" tab above, not a
            separate in-page CTA. The lock-in action stays below, shared by both tabs. */}

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
            {isModifying ? 'Confirm Changes →' : 'Start Protocol →'}
          </button>
        )}

        {/* A1 — the canonical DISCLAIMER renders once on this surface, inside the
            StackIntelligence analysis above (<Disclaimer/>). This footer keeps ONLY
            the projection-specific caveat so the medical disclaimer isn't doubled. */}
        <p style={S.disclaimer}>
          Projected research outcome based on published literature. Individual results are not guaranteed.
        </p>
        <p style={{ fontSize: 12, color: "rgba(26,232,122,0.35)", textAlign: "center", paddingBottom: 20, fontStyle: "italic", letterSpacing: "0.06em" }}>
          Happy Researching.
        </p>
      </div>
    );
  }


  return (
    <div style={{ ...S.inner, opacity: animateIn ? 1 : 0, transition: "opacity 0.6s ease" }}>
      {paywall && (
        <UpgradePrompt featureKey={paywall} onSubscribe={onSubscribe} onClose={() => setPaywall(null)} />
      )}
      {/* Header */}
      <div style={{ padding: "16px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {/* #3F — ALKI wordmark doubles as a home shortcut: collapses the
              projection / exits the builder back to the committed home view. */}
          <span
            onClick={() => { setShowTransform(false); if (activeProtocol) setEditing(false); }}
            title="Home"
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", fontFamily: "'Syne', sans-serif", cursor: "pointer" }}
          >
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
            // B2 — inline-flex + center so the Manage button aligns with its
            // sibling header controls. As a plain block-div wrapper its button sat
            // on the div's text baseline (descender space below), nudging it out of
            // line with Analytics/Q&A, which are flex-centered direct children.
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <button onClick={() => setShowManageMenu(v => !v)} style={{ background: "none", border: "none", color: showManageMenu ? '#fff' : S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Manage ▾
              </button>
              {showManageMenu && (
                <>
                  <div onClick={() => setShowManageMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 91, background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 6, minWidth: 168, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                    {[
                      ["Modify protocol", startModify],
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
            Analytics
          </button>
          <button onClick={onQA} style={{ background: "none", border: "none", color: S.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Q&amp;A
          </button>
          {onSettings && (
            <button onClick={onSettings} title="Profile & Settings" aria-label="Profile and Settings" style={{ background: "none", border: "none", color: S.accent, fontSize: 17, cursor: "pointer", fontFamily: "inherit", lineHeight: 1, padding: 0 }}>
              ⚙
            </button>
          )}
          {/* B1 — Sign Out was removed from this top-right header: it sat in the
              exact corner the global HOME control lands on, so a second tap after
              navigating home would sign the user out by accident. Sign-out now
              lives only in Settings (reached via the ⚙ above), behind an explicit
              "Are you sure?" confirmation. The non-destructive ⚙ is now the
              rightmost control, so an accidental double-tap just opens Settings. */}
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
        onResetAvatar={() => { onResetAvatar?.(); setAvatarResetSignal(n => n + 1); }}
        avatarResetSignal={avatarResetSignal}
        showAvatarDebug={showAvatarDebug}
        pulse={dosePulse}
        glowLevel={doseProgress}
        units={units}
        projection={editing && selectedCompounds.length > 0 ? projectedChanges : null}
        isPro={isPro}
        onUpgrade={(feat) => setPaywall(feat || "eidolon_customization")}
      />

      {/* Inline Goals Editor — collapsible (builder mode only; goals lock once a protocol is committed — #17) */}
      {/* #61 — goal selection is inline while building/modifying (no longer hidden
          behind a nav toggle); the whole card disappears once the protocol is locked
          in (committed mode). Buttons render in fixed GOALS order — selection is
          conveyed by active styling, not reordering (#B11: avoids jump-under-finger). */}
      {editing && (() => {
        // D2 — concise, collapsible goals. Collapsed = compact summary pills + a
        // "Change" toggle; expanded = the full chooser with compact chips. Forced
        // open when no goals are set so a fresh eidolon is still prompted.
        const goals = profile.goals || [];
        const goalsOpen = goalsEditorOpen || goals.length === 0;
        const compactTag = (active) => ({
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 11px', borderRadius: 100, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', marginRight: 6, marginBottom: 6,
          background: active ? S.accentDim : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${active ? S.accent : 'rgba(255,255,255,0.1)'}`,
          color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        });
        return (
          <div style={{ ...S.card, borderColor: 'rgba(26,232,122,0.2)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: goalsOpen || goals.length ? 10 : 0 }}>
              <div style={{ ...S.label, marginBottom: 0 }}>
                Goals for {activeEidolon?.name || 'Eidolon 1'}
                {goalsOpen && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{' '}· tap to choose</span>}
              </div>
              {goals.length > 0 && (
                <button onClick={() => setGoalsEditorOpen(o => !o)} style={{ background: 'none', border: 'none', color: S.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', padding: 0 }}>
                  {goalsOpen ? 'Done ▴' : 'Change ▾'}
                </button>
              )}
            </div>
            {goalsOpen ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                {GOALS.map(g => {
                  const active = goals.includes(g.id);
                  return (
                    <button key={g.id} onClick={() => handleGoalToggle(g.id)} style={compactTag(active)}>
                      {g.icon} {g.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {goals.map(gid => {
                  const goal = GOALS.find(x => x.id === gid);
                  if (!goal) return null;
                  return (
                    <span key={gid} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 100, background: 'rgba(26,232,122,0.08)', border: '1px solid rgba(26,232,122,0.18)', color: S.accent, fontWeight: 600 }}>
                      {goal.icon} {goal.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

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
                onClick={() => gatePro("progress_log", onProgress)}
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
                  <div style={{ width: `${(doneCount / total) * 100}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${ACCENT},#1ae87a)`, transition: "width 0.3s ease" }} />
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
                {/* F1 — research-subject framing: the EIDOLON is on protocol, not the
                    user. Log each compound as it's administered to the eidolon. */}
                <div style={{ fontSize: 11, color: allDone ? "rgba(34,214,138,0.6)" : "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                  {allDone
                    ? `Protocol complete for today. ${activeEidolon?.name || "Your Eidolon"} is cultivating — see you tomorrow.`
                    : `Log each compound as it's administered to ${activeEidolon?.name || "your Eidolon"}. Completing the protocol every day keeps the streak alive.`}
                </div>
              </div>
            );
          })()}

          {/* 5. Active stack — equipped badges. 4.3 — the whole card is now
              tap-to-edit (re-enters the builder on this stack). */}
          <div onClick={startModify} title="Edit protocol" style={{ ...S.card, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ ...S.label, marginBottom: 0 }}>Active Stack</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.accent, letterSpacing: "0.04em" }}>Edit ✎</span>
            </div>
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

          {/* 6. Goals. 4.3 — tap-to-edit; goals become editable again inside the
              builder (they lock only while committed). */}
          <div onClick={startModify} title="Edit goals & protocol" style={{ ...S.card, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ ...S.label, marginBottom: 0 }}>Goals</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.accent, letterSpacing: "0.04em" }}>Edit ✎</span>
            </div>
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
                No goals set. Tap <span style={{ color: S.accent, fontWeight: 600 }}>Edit ✎</span> to choose goals — they lock while a protocol is active.
              </div>
            )}
          </div>

          {/* 7. Primary actions. D3 — the projection is the selling point, so
              "View Projection" is the prominent primary CTA here; the cycle timeline
              is a tab inside that surface (no longer a separate button). The protocol
              guide drops to a secondary action. Eidolon management (Modify / Switch /
              New) lives in the "Manage ▾" nav dropdown (#62). */}
          <button
            onClick={() => { if (stackAnalysis.isBlocked) return; if (!isPro) { setPaywall("projection"); return; } setShowTransform(true); }}
            disabled={stackAnalysis.isBlocked}
            style={{ ...S.btn, marginTop: 8, marginBottom: 10, ...(stackAnalysis.isBlocked ? S.btnDisabled : {}) }}
          >
            View Projection · Before / After {isPro ? "→" : "🔒"}
          </button>
          <button onClick={() => gatePro("protocol_guide", onProtocolGuide)} style={{ ...S.btnOutline, marginBottom: 10 }}>
            View Full Protocol{!isPro ? " 🔒" : ""}
          </button>
          {/* D4 — the standalone "Edit Protocol" button was removed (the Active Stack
              and Goals cards above are already tap-to-edit, re-entering the builder),
              and Progress Photos moved into the check-in / cultivation log. */}
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
          {/* G1 — naming gate: a newly created eidolon must be named before its stack
              can be built. The rest of the builder is withheld until then. */}
          {needsNaming ? (
            <div style={{ ...S.card, borderColor: S.accentBorder }}>
              <div style={{ ...S.label, marginBottom: 6 }}>Name your Eidolon</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: 14 }}>
                Give your research subject a name before building its protocol. You can rename it anytime.
              </p>
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) commitEidolonName(); }}
                maxLength={30}
                placeholder="e.g. Atlas, Prime, Subject One"
                style={{ ...S.input, marginBottom: 12 }}
              />
              <button
                onClick={commitEidolonName}
                disabled={!nameInput.trim()}
                style={{ ...S.btn, ...(!nameInput.trim() ? S.btnDisabled : {}) }}
              >
                Name &amp; Build Protocol →
              </button>
            </div>
          ) : (
          <>
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
                {/* D1 — bulk "Clear all" (clear SELECTION) lives here in the stack
                    card, distinct from "Clear filters" in the filter bar below. */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ ...S.label, marginBottom: 0 }}>
                    Your Stack — {selectedCompounds.length} compound{selectedCompounds.length !== 1 ? "s" : ""}
                  </div>
                  <button onClick={clearSelection} title="Remove all selected compounds" style={{ background: "none", border: "1px solid rgba(239,107,107,0.3)", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#ef6b6b", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    Clear all
                  </button>
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

              {/* 4.2 — the Protocol Timeline CTA moved out of the mid-page stack
                  block and into the always-visible sticky footer below, alongside
                  View Projection and the primary Start Protocol action, so the key
                  actions are no longer buried under the stack analysis. */}

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

              {/* Compounds — single consolidated filter bar (D1). The three chip
                  rows (Goal / Type / Sort) were replaced by compact dropdowns so the
                  filter area reads as ONE bar. The bulk clear-SELECTION control was
                  removed from here and moved into the "Your Stack" card above, so it
                  can no longer be confused with clear-FILTERS (the two used to sit
                  side by side). The connected goal→type→sort logic is unchanged. */}
              {(() => {
                const goalOpts = (profile.goals || []).map(gid => GOALS.find(g => g.id === gid)).filter(Boolean);
                const typeCats = goalScopedCats();
                const SORTS = [["match", "Best match"], ["name", "Name"], ["risk", "Risk"], ["category", "Category"]];
                const selectStyle = {
                  appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
                  width: "100%", boxSizing: "border-box",
                  padding: "9px 30px 9px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", cursor: "pointer", fontFamily: "inherit", outline: "none",
                };
                // Wrap each select with its own ▾ (globals.css strips the native one).
                const field = (key, node) => (
                  <div key={key} style={{ position: "relative", flex: "1 1 30%", minWidth: 108 }}>
                    {node}
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(255,255,255,0.4)", pointerEvents: "none" }}>▾</span>
                  </div>
                );
                return (
                  <div style={{ marginBottom: 16 }}>
                    {/* #46 — free-text search; applies to matched + browse-all via passesFilters */}
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}>🔍</span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setShowAllRecommended(false); }}
                        placeholder="Search compounds by name…"
                        style={{
                          width: "100%", boxSizing: "border-box", padding: "10px 34px 10px 34px",
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 100, color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit",
                        }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 20, height: 20, color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                        >×</button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {goalOpts.length > 0 && field("goal",
                        <select value={goalFilter} onChange={e => setGoal(e.target.value)} style={selectStyle} aria-label="Filter by goal">
                          <option value="all">All goals</option>
                          {goalOpts.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                        </select>
                      )}
                      {typeCats.length > 1 && field("type",
                        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setShowAllRecommended(false); }} style={selectStyle} aria-label="Filter by type">
                          <option value="all">All types</option>
                          {typeCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      )}
                      {field("sort",
                        <select value={sortMode} onChange={e => setSortMode(e.target.value)} style={selectStyle} aria-label="Sort compounds">
                          {SORTS.map(([id, lbl]) => <option key={id} value={id}>Sort · {lbl}</option>)}
                        </select>
                      )}
                      {filtersActive && (
                        <button onClick={clearFilters} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, padding: "9px 14px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          Clear filters
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
                // A2 — visibility is driven solely by showOtherCompounds so the Hide
                // toggle always collapses the list; filter-activation auto-opens it via
                // the one-shot effect above rather than pinning `open` true here.
                // Full compound browsing is a FREE keep (product decision 2026-06-06):
                // the whole library is open to every tier; the Pro levers are
                // projection, lock-in, 3D, customization, timeline, and slots.
                const open = showOtherCompounds;
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

          {/* Fixed bottom CTA bar — always visible once a stack exists.
              4.2 — this is now the single home for the builder's key actions, which
              were previously buried at the bottom of the stack: a prominent primary
              "Start Protocol" (the lock-in, clearer label than "Lock in Protocol"),
              with "View Projection" and "Protocol Timeline" as clear secondary
              buttons. The commit logic (handleLockIn) is unchanged — only its
              surfacing moved up here so testers actually see it. */}
          {builderView !== null && selectedCompounds.length > 0 && (
            <>
              {/* Spacer so content isn't hidden behind the fixed bar (taller now
                  that the bar carries the primary CTA + a secondary action row).
                  Bumped while the one-time projection nudge is showing. */}
              <div style={{ height: showProjectionNudge ? 212 : 156 }} />
              <div style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                padding: "12px 20px 18px", zIndex: 100,
                background: "linear-gradient(to top, #0a0a0a 82%, transparent)",
              }}>
                <div style={{ maxWidth: 480, margin: "0 auto" }}>
                  {/* Sprint 6.5 (optional nudge) — one-time pointer to the payoff. */}
                  {showProjectionNudge && (
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10,
                      padding: "10px 12px", borderRadius: 12,
                      background: "rgba(26,232,122,0.1)", border: "1px solid rgba(26,232,122,0.25)",
                    }}>
                      <span style={{ fontSize: 14, lineHeight: 1.4 }}>✨</span>
                      <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45, color: "rgba(255,255,255,0.8)" }}>
                        Your stack is taking shape. Tap <strong style={{ color: S.accent }}>View Projection</strong> to see your Eidolon's before / after, or <strong style={{ color: S.accent }}>Start Protocol</strong> to lock it in.
                      </span>
                      <button
                        onClick={dismissProjectionNudge}
                        aria-label="Dismiss"
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1, cursor: "pointer", fontFamily: "inherit", padding: "0 2px" }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {/* #67 — echo the live Stack Safety score so its change is seen
                      without scrolling back up to the analysis. */}
                  {(() => {
                    const sc = stackAnalysis.safetyScore?.overall ?? 100;
                    const col = sc >= 85 ? ACCENT : sc >= 65 ? "#a3e635" : sc >= 45 ? "#f59e0b" : "#ef4444";
                    return (
                      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10, fontWeight: 700 }}>Stack Safety</span>
                        <span style={{ color: col, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{stackAnalysis.summary?.risk || "—"} · {sc}/100</span>
                      </div>
                    );
                  })()}
                  {/* D3 — single prominent "View Projection" (the selling point). The
                      Protocol Timeline is now a tab inside the projection surface, so
                      it's no longer a competing side-by-side button here. */}
                  <button
                    onClick={() => { dismissProjectionNudge(); if (stackAnalysis.isBlocked) return; if (!isPro) { setPaywall("projection"); return; } setShowTransform(true); }}
                    disabled={stackAnalysis.isBlocked}
                    style={{ ...S.btnOutline, width: "100%", padding: "13px 12px", marginBottom: 10, ...(stackAnalysis.isBlocked ? { opacity: 0.4, cursor: "not-allowed" } : {}) }}
                  >
                    View Projection · Before / After {!isPro && "🔒"}
                  </button>
                  {/* Primary — Start Protocol (or Confirm Changes when modifying a
                      locked stack). Locks in directly via the unchanged handleLockIn. */}
                  <button
                    onClick={() => !stackAnalysis.isBlocked && handleLockIn(selectedCompounds)}
                    disabled={stackAnalysis.isBlocked}
                    style={{
                      ...S.btn,
                      ...(stackAnalysis.isBlocked ? S.btnDisabled : {}),
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%",
                      boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
                    }}
                  >
                    {stackAnalysis.isBlocked
                      ? "Resolve Contraindications"
                      : isModifying
                        ? `Confirm Changes (${selectedCompounds.length}) →`
                        : `Start Protocol (${selectedCompounds.length}) →`}
                  </button>
                </div>
              </div>
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
          onCreate={createNewEidolon}
          goalsCatalog={GOALS}
          lockedIds={lockedIds}
          onPromote={(id) => { promoteEidolon(id); switchToEidolon(id); }}
          atCap={atEidolonCap}
          maxEidolons={eidolonCap}
        />
      )}

      {/* Sprint 7 (slots) — Pro user at the Eidolon cap: offer the $10 add-on. */}
      {slotPrompt && (
        <SlotPurchasePrompt
          onBuy={onBuySlot}
          onClose={() => setSlotPrompt(false)}
        />
      )}

      <p style={{ ...S.disclaimer, paddingBottom: 8 }}>
        {DISCLAIMER}
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
        adv: data.adv || {},
        trainingStatus: data.training_status || null,
        // Sprint 7 — subscription state rides on the profile object so isPro is
        // derivable wherever the profile flows. These are READ-only on the
        // client: saveProfile never writes them back (migration 007's guard
        // trigger would reject it anyway). `|| 'free'` / `=== true` keep a
        // pre-migration profile (columns absent → undefined) reading as free.
        subscriptionStatus: data.subscription_status || "free",
        subscriptionTier: data.subscription_tier || null,
        stripeCustomerId: data.stripe_customer_id || null,
        comped: data.comped === true,
        // Sprint 7 (slots) — count of purchased permanent eidolon slots. Read
        // only on the client; written solely by the webhook (guard trigger
        // blocks client writes). `|| 0` keeps a pre-migration profile at zero.
        eidolonSlotsPurchased: data.eidolon_slots_purchased || 0,
        // Promo codes (008) — time-boxed Pro expiry. Read-only on the client
        // (set only by redeem_promo_code(); guard trigger blocks client writes).
        // isProUser treats an unexpired proUntil as Pro.
        proUntil: data.pro_until || null
      },
      selectedCompounds: data.selected_compounds || [],
      avatarUrl: data.avatar_url || null,
      activeProtocol: data.active_protocol || null,
      eidolons: data.eidolons || [],
      activeEidolonId: data.active_eidolon_id || null,
      preferences: data.preferences || null,
      // 6.7-a — server-side 18+ attestation. `=== true` so a missing column
      // (pre-migration) or null reads as not-yet-verified and re-gates.
      ageVerified: data.age_verified === true
    };
  } catch (e) {
    console.error("loadProfile error:", e);
    return null;
  }
}

async function saveProfile(userId, profile, selectedCompounds, avatarUrl, activeProtocol, eidolons, activeEidolonId, preferences, ageVerified) {
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
        training_status: profile.trainingStatus || null,
        selected_compounds: selectedCompounds || [],
        avatar_url: avatarUrl || null,
        active_protocol: activeProtocol || null,
        eidolons: eidolons || [],
        active_eidolon_id: activeEidolonId || null,
        preferences: preferences || {},
        // 6.7-a — persist the 18+ attestation. Only ever written true (the
        // caller passes the live ageVerified flag, which is true once the gate
        // is passed); never downgraded to false by an auto-save, since a
        // verified session keeps the flag true for its lifetime.
        age_verified: ageVerified === true,
        updated_at: new Date().toISOString()
      });
    if (error) console.error("saveProfile error:", error);
  } catch (e) {
    console.error("saveProfile error:", e);
  }
}

// ── AUTH SCREEN ────────────────────────────────────────────
function AuthScreen({ onAuth, onBack, onSkip, onBaseline }) {
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
    // A thrown rejection (e.g. network drop) would otherwise leave `loading`
    // pinned true — the button stuck on "Working…" with no error and no retry.
    // Catch it and clear loading in finally.
    if (mode === "signin") {
      try {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) { setError(err.message); }
        else { onAuth(data.user); }
      } catch (e) {
        setError(e?.message || "Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) { setError(err.message); }
        else if (data.user && !data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
          setMode("signin"); setPassword(""); setConfirmPw("");
        } else if (data.user) { onAuth(data.user); }
      } catch (e) {
        setError(e?.message || "Network error. Please try again.");
      } finally {
        setLoading(false);
      }
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
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: SITE_URL,
      });
      if (err) { setError(err.message); }
      else {
        setMessage("If an account exists for that email, a password reset link is on its way. Check your inbox (and spam).");
      }
    } catch (e) {
      setError(e?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.inner}>
      <div style={{ padding: "16px 0 8px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          ← Back
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "safe center", maxWidth: 360, margin: "0 auto", width: "100%" }}>
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

        {ALKI_DEV && onBaseline && (
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
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      setDone(true);
    } catch (e) {
      setError(e?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.inner}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "safe center", maxWidth: 360, margin: "0 auto", width: "100%" }}>
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
  // 6.7-a — the 18+ attestation, mirrored from profiles.age_verified. Starts
  // false; flips true when the user passes the age gate OR when a loaded
  // profile already carries the server-side attestation. Threaded into
  // saveProfile so it persists, so returning users aren't re-gated forever.
  const [ageVerified, setAgeVerified] = useState(false);
  // Where to route after the age gate is confirmed. Null → the default
  // first-run target (auth when Supabase is wired, else onboarding). Set to
  // "dashboard"/"onboarding" when an already-signed-in user is re-gated
  // because their profile lacks a server-side attestation.
  const [pendingAfterGate, setPendingAfterGate] = useState(null);
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
  const [trainingInputs, setTrainingInputs] = useState({}); // #33 — persisted Analytics inputs (activity, training, sleep, etc.)
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
  // Sprint 5.4 — display preferences (unit system + future toggles). localStorage
  // is the universal layer (instant, offline, works for no-account users); the
  // profiles.preferences column is the cross-device sync layer for signed-in
  // users (merged in on profile load below).
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const saveTimeout = useRef(null);

  // Sprint 6.5 — first-run intro tutorial. Shown once on the first dashboard
  // load (localStorage flag, per-device — no DB column). `tutorialChecked` makes
  // the first-run check fire exactly once per session so re-entering the
  // dashboard after dismissal doesn't re-open it.
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialChecked = useRef(false);

  // ── Load saved avatar (URL + headshot PNG) from localStorage on mount ──
  // ── #16 — load/save daily dose log ──
  useEffect(() => {
    try { const d = localStorage.getItem("alki_dose_log"); if (d) setDoseLog(JSON.parse(d)); } catch (_) {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("alki_dose_log", JSON.stringify(doseLog)); } catch (_) {}
  }, [doseLog]);
  // #33 — persist Analytics (modeler) training inputs across sessions.
  useEffect(() => {
    try { const t = localStorage.getItem("alki_training_inputs"); if (t) setTrainingInputs(JSON.parse(t)); } catch (_) {}
  }, []);
  const persistTrainingInputs = useCallback((inputs) => {
    setTrainingInputs(inputs);
    try { localStorage.setItem("alki_training_inputs", JSON.stringify(inputs)); } catch (_) {}
  }, []);
  // #5.4 — load display preferences from localStorage on mount (universal layer).
  // A signed-in user's DB preferences are merged in when their profile loads.
  useEffect(() => {
    try {
      const p = localStorage.getItem("alki_preferences");
      if (p) setPreferences(prev => ({ ...prev, ...JSON.parse(p) }));
    } catch (_) {}
  }, []);
  // Single writer for preferences: updates state AND mirrors to localStorage so
  // the choice survives reloads even without an account. The debounced profile
  // auto-save (below) carries it to Supabase when signed in.
  const updatePreferences = useCallback((next) => {
    setPreferences(next);
    try { localStorage.setItem("alki_preferences", JSON.stringify(next)); } catch (_) {}
  }, []);

  // Sprint 6.5 — open the intro overlay the first time the dashboard mounts when
  // the per-device flag is absent (brand-new user OR an existing user who
  // predates the tutorial). Runs once per session via the ref guard.
  useEffect(() => {
    if (screen !== "dashboard" || tutorialChecked.current) return;
    tutorialChecked.current = true;
    try {
      if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) setShowTutorial(true);
    } catch (_) {}
  }, [screen]);

  // Finish/skip: hide the overlay and set the flag so it never auto-shows again.
  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, "1"); } catch (_) {}
  }, []);

  // Settings "Show intro again": clear the flag and re-open it immediately so it
  // can be re-watched (and re-tested). Dismissing re-sets the flag.
  const replayTutorial = useCallback(() => {
    try { localStorage.removeItem(TUTORIAL_SEEN_KEY); } catch (_) {}
    setShowTutorial(true);
  }, []);

  useEffect(() => {
    try {
      // NOTE: the `alki_avatar_url` mirror is intentionally NOT read to drive
      // the base mesh — base selection is derived from the profile via
      // selectBaseMesh() at the load/onboarding sites (Avatar Range, Stage 1).
      // A stored URL must not pin or re-break the per-profile selection. The
      // localStorage key is left in place for the disabled Avaturn path.
      const savedShot = localStorage.getItem("alki_avatar_headshot");
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
    // Capture the whole return and optional-chain it — some supabase-js builds
    // can hand back an unexpected shape, and a hard destructure here would crash
    // the entire root render on mount.
    const authListener = supabase.auth.onAuthStateChange(
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
            // Base mesh is derived from the profile (Avatar Range, Stage 1) —
            // NOT the stored avatar_url, which is reserved for the future
            // custom-mesh override and would otherwise pin/re-break selection.
            setAvatarUrl(selectBaseMesh(saved.profile));
            setActiveProtocol(saved.activeProtocol || null);
            setEidolons(saved.eidolons || []);
            setActiveEidolonId(saved.activeEidolonId || null);
            if (saved.preferences && Object.keys(saved.preferences).length) {
              updatePreferences({ ...DEFAULT_PREFERENCES, ...saved.preferences });
            }
            // 6.7-a — a live session bypasses splash → agegate, so the gate is
            // re-enforced here from the server-side attestation. If the profile
            // already carries it, proceed; otherwise route through the gate
            // (landing back on the dashboard once confirmed).
            if (saved.ageVerified) {
              setAgeVerified(true);
              setScreen("dashboard");
            } else {
              setPendingAfterGate("dashboard");
              setScreen("agegate");
            }
          } else {
            setScreen("onboarding");
          }
        });
        // Load progress logs for cultivation state
        if (supabase) {
          supabase.from("progress_logs").select("*").eq("user_id", session.user.id)
            .order("logged_at", { ascending: false }).limit(50)
            .then(({ data }) => { if (data) setProgressLogs(data); })
            .catch((e) => console.error("progress_logs load failed:", e));
        }
      } else {
        setScreen("splash");
      }
    }).catch((e) => {
      // getSession can reject on a network failure / unreachable Supabase /
      // malformed PKCE params. Without this, the unhandled rejection leaves the
      // app pinned on the "loading" screen forever with no recovery. Fall back
      // to splash so the user can still proceed.
      console.error("getSession failed:", e);
      setScreen("splash");
    });

    return () => authListener?.data?.subscription?.unsubscribe();
  }, []);

  // ── Auto-save profile on changes (debounced) ──
  useEffect(() => {
    if (!supabase || !user || !profile) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // Persist NULL for avatar_url (Avatar Range, Stage 1): that column is
      // reserved for the future custom-mesh override, where a non-null value
      // means "use the custom mesh instead of the profile-selected base."
      // The live base is derived from the profile via selectBaseMesh(), so we
      // must NOT write the selected base path here, or the future override
      // read would treat it as a custom mesh and re-break selection.
      saveProfile(user.id, profile, selectedCompounds, null, activeProtocol, eidolons, activeEidolonId, preferences, ageVerified);
    }, 1500);
    return () => clearTimeout(saveTimeout.current);
  }, [user, profile, selectedCompounds, activeProtocol, eidolons, activeEidolonId, preferences, ageVerified]);

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

  // ── Sprint 7 — Pro entitlement + Stripe actions ─────────────────────────
  // isPro is derived purely from the loaded profile (active subscription OR a
  // manual comp). Recomputed each render; it's a cheap field read.
  const isPro = isProUser(profile);

  // Attach the caller's Supabase access token so the API route can verify the
  // session SERVER-SIDE (we never trust a client-supplied user id). Returns the
  // parsed JSON or throws a friendly error.
  const callStripeRoute = useCallback(async (path, body) => {
    if (!supabase) throw new Error("Account required. Please sign in first.");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Please sign in to manage your subscription.");
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
    return data;
  }, []);

  // Start Checkout for a tier ('monthly' | 'annual'); redirects to Stripe.
  const startCheckout = useCallback(async (tier) => {
    const { url } = await callStripeRoute("/api/stripe/checkout", { tier });
    if (url) window.location.href = url;
    else throw new Error("Could not start checkout. Please try again.");
  }, [callStripeRoute]);

  // Open the Stripe Customer Portal so a subscriber can manage/cancel.
  const openBillingPortal = useCallback(async () => {
    const { url } = await callStripeRoute("/api/stripe/portal", {});
    if (url) window.location.href = url;
    else throw new Error("Could not open the billing portal. Please try again.");
  }, [callStripeRoute]);

  // Buy a one-time permanent eidolon slot ($10). The route enforces the
  // active-Pro requirement server-side; this just starts Checkout (payment mode)
  // and redirects. On return (?slot=success) the effect above re-reads the
  // incremented eidolon_slots_purchased so the new slot appears without a reload.
  const startBuySlot = useCallback(async () => {
    const { url } = await callStripeRoute("/api/stripe/buy-slot", {});
    if (url) window.location.href = url;
    else throw new Error("Could not start checkout. Please try again.");
  }, [callStripeRoute]);

  // Re-read ONLY the subscription columns from Supabase and merge them into the
  // in-memory profile (leaving the user's other fields/edits untouched). This is
  // a plain DB read — NOT a Stripe call — so it's safe to use on the checkout
  // return without violating the "no extra Stripe calls on load" rule. Reused by
  // the Settings "Refresh subscription status" action after /api/stripe/sync.
  const refreshSubscriptionFromDb = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_tier, stripe_customer_id, comped, eidolon_slots_purchased, pro_until")
      .eq("id", user.id)
      .single();
    if (data) {
      setProfile(prev => prev ? {
        ...prev,
        subscriptionStatus: data.subscription_status || "free",
        subscriptionTier: data.subscription_tier || null,
        stripeCustomerId: data.stripe_customer_id || null,
        comped: data.comped === true,
        eidolonSlotsPurchased: data.eidolon_slots_purchased || 0,
        proUntil: data.pro_until || null,
      } : prev);
    }
  }, [user]);

  // Promo-code redemption (008). Calls the server RPC, which atomically burns a
  // single-use code and grants time-boxed Pro to the caller (auth.uid()), then
  // re-reads the subscription fields so isPro flips live with no reload. Throws
  // a friendly message on a used/invalid code so Settings can surface it.
  const redeemPromoCode = useCallback(async (code) => {
    if (!supabase || !user) throw new Error("Sign in to redeem a code.");
    const { data, error } = await supabase.rpc("redeem_promo_code", { p_code: (code || "").trim() });
    if (error) throw new Error(error.message || "Couldn't redeem that code. Please try again.");
    if (!data?.ok) {
      const reasons = {
        used: "That code has already been used.",
        invalid: "That code isn't valid. Check it and try again.",
        unauth: "Sign in to redeem a code.",
      };
      throw new Error(reasons[data?.reason] || "That code isn't valid.");
    }
    await refreshSubscriptionFromDb();
    return data;
  }, [user, refreshSubscriptionFromDb]);

  // Stage 4 — reconciliation. Asks the server to re-fetch the subscription from
  // Stripe and correct the DB (covers a missed webhook), then re-reads the
  // corrected fields into the in-memory profile. Wired to Settings' "Refresh
  // subscription status" only — never on profile load.
  const syncSubscription = useCallback(async () => {
    await callStripeRoute("/api/stripe/sync", {});
    await refreshSubscriptionFromDb();
  }, [callStripeRoute, refreshSubscriptionFromDb]);

  // ── Sprint 7 — handle the return from Stripe Checkout / Portal ──
  // The webhook writes the new status server-side; here we only clean the query
  // params and, after a successful checkout, re-read the subscription a couple
  // of times to catch the (usually sub-second) webhook without a manual reload.
  // Declared AFTER refreshSubscriptionFromDb so its dep array isn't evaluated
  // against the callback before it's initialized (TDZ).
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const portal = params.get("portal");
    const slot = params.get("slot"); // slot purchase return (one-time add-on)
    if (!checkout && !portal && !slot) return;
    try {
      params.delete("checkout");
      params.delete("portal");
      params.delete("slot");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    } catch (_) {}
    if (checkout === "success" || portal === "return" || slot === "success") {
      refreshSubscriptionFromDb();
      const t1 = setTimeout(refreshSubscriptionFromDb, 2000);
      const t2 = setTimeout(refreshSubscriptionFromDb, 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [user, refreshSubscriptionFromDb]);

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
    // 3D body is always on, so "reset" returns to the profile-derived base
    // (respects sex + lean/heavy selection), not a hardcoded male default.
    setAvatarUrl(profile ? selectBaseMesh(profile) : DEFAULT_AVATAR_URL);
    setAvatarHeadshot(null);
    try {
      localStorage.removeItem("alki_avatar_url");
      localStorage.removeItem("alki_avatar_headshot");
    } catch (_) {}
  }, [profile]);

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

  // ── Sprint 5 — Settings handlers ─────────────────────────────────────────
  // 5.1 — biometric save. Re-runs the SAME derivation path onboarding uses:
  // setProfile feeds the memoized recommendation engine + avatar params, and we
  // re-select the base mesh (the one piece that isn't reactive) so a weight/BF
  // change that crosses a lean/heavy or sex band swaps the body too. The active
  // eidolon's goals mirror the profile's, so keep them in lock-step.
  const handleSettingsProfileSave = useCallback((updated) => {
    setProfile(updated);
    setAvatarUrl(selectBaseMesh(updated));
    if (activeEidolonId) {
      setEidolons(prev => (prev || []).map(e => e.id === activeEidolonId ? { ...e, goals: updated.goals } : e));
    }
  }, [activeEidolonId]);

  // 5.2 — switch the active eidolon from Settings. Root-level clean swap that
  // mirrors the Dashboard's switchToEidolon, minus the builder-flush (the
  // builder is unmounted on the Settings screen, so there's no dirty state).
  const switchActiveEidolon = useCallback((eidId) => {
    const eid = (eidolons || []).find(e => e.id === eidId);
    if (!eid) return;
    applyEidolonState(eid, { setActiveEidolonId, setProfile, setActiveProtocol, setSelectedCompounds, setShowTransform });
  }, [eidolons]);

  const renameEidolon = useCallback((eidId, name) => {
    setEidolons(prev => (prev || []).map(e => e.id === eidId ? { ...e, name } : e));
  }, []);

  // 5.2 — delete an eidolon. Eidolons are JSONB on the profile, so there's no DB
  // cascade: a deleted eidolon would ORPHAN its progress_logs (they carry an
  // eidolon_id). Handle that deliberately — delete those rows (when signed in)
  // and drop the eidolon's local dose log — then remove it from the array and,
  // if it was active, fall back to another eidolon's full state.
  const deleteEidolon = useCallback((eidId) => {
    const remaining = (eidolons || []).filter(e => e.id !== eidId);
    if (remaining.length === (eidolons || []).length) return; // not found
    if (supabase && user) {
      supabase.from("progress_logs").delete().eq("user_id", user.id).eq("eidolon_id", eidId)
        .then(({ error }) => { if (error) console.error("delete eidolon logs:", error); });
    }
    setProgressLogs(prev => (prev || []).filter(l => l.eidolon_id !== eidId));
    setDoseLog(prev => { const next = { ...prev }; delete next[eidId]; return next; });
    setEidolons(remaining);
    if (eidId === activeEidolonId) {
      const fallback = remaining[0];
      if (fallback) {
        setActiveEidolonId(fallback.id);
        setProfile(prev => ({ ...prev, goals: fallback.goals || [] }));
        if (fallback.lockedAt && fallback.compounds?.length) {
          setActiveProtocol({ compounds: [...fallback.compounds], lockedAt: fallback.lockedAt });
          setSelectedCompounds([...fallback.compounds]);
        } else {
          setActiveProtocol(null);
          setSelectedCompounds(fallback.compounds ? [...fallback.compounds] : []);
        }
        setShowTransform(false);
      } else {
        setActiveEidolonId(null);
        setActiveProtocol(null);
        setSelectedCompounds([]);
      }
    }
  }, [eidolons, activeEidolonId, user]);

  // 5.3 — change password via the existing recovery flow: a reset email whose
  // link re-enters the app on the SetNewPassword screen. Returns the
  // confirmation string for the Settings UI (throws on error).
  const handleChangePassword = useCallback(async () => {
    if (!supabase || !user?.email) throw new Error("No account email on file.");
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: SITE_URL });
    if (error) throw error;
    return `Password reset link sent to ${user.email}. Check your inbox (and spam).`;
  }, [user]);

  // 5.3 — delete account (GDPR/CCPA + App Store). delete_user() removes the
  // auth.users row, which CASCADEs to profiles (incl. the eidolons JSONB) and
  // progress_logs. Then sign out and wipe all client state + local storage.
  const handleDeleteAccount = useCallback(async () => {
    if (!supabase) throw new Error("Account deletion is unavailable.");
    // Cancel any pending debounced profile save so it can't re-insert the row
    // we're about to delete.
    clearTimeout(saveTimeout.current);
    const { error } = await supabase.rpc("delete_user");
    if (error) throw error;
    // The auth user is gone; sign-out may itself error on the now-invalid
    // session — that must not surface as a "delete failed" message.
    try { await supabase.auth.signOut(); } catch (_) {}
    try {
      localStorage.removeItem("alki_dose_log");
      localStorage.removeItem("alki_training_inputs");
      localStorage.removeItem("alki_preferences");
      localStorage.removeItem("alki_avatar_url");
      localStorage.removeItem("alki_avatar_headshot");
      localStorage.removeItem("alki_remember_email");
    } catch (_) {}
    setUser(null);
    setProfile(null);
    setSelectedCompounds([]);
    setShowTransform(false);
    setActiveProtocol(null);
    setEidolons([]);
    setActiveEidolonId(null);
    setDoseLog({});
    setProgressLogs([]);
    setPreferences(DEFAULT_PREFERENCES);
    setNavHistory([]);
    setAvatarUrl(DEFAULT_AVATAR_URL);
    setScreen("splash");
  }, []);

  const handleAuthComplete = async (authUser) => {
    setUser(authUser);
    const saved = await loadProfile(authUser.id);
    if (saved) {
      setProfile(saved.profile);
      setSelectedCompounds(saved.selectedCompounds || []);
      // Base mesh derived from the profile (Avatar Range, Stage 1); the
      // stored avatar_url is reserved for the future custom-mesh override.
      setAvatarUrl(selectBaseMesh(saved.profile));
      setActiveProtocol(saved.activeProtocol || null);
      setEidolons(saved.eidolons || []);
      setActiveEidolonId(saved.activeEidolonId || null);
      if (saved.preferences && Object.keys(saved.preferences).length) {
        updatePreferences({ ...DEFAULT_PREFERENCES, ...saved.preferences });
      }
      // 6.7-a — re-enforce the age gate from the server-side attestation. The
      // normal sign-in path already passed the gate (ageVerified true), but the
      // password-recovery deep link reaches here without it, so gate if absent.
      if (saved.ageVerified) {
        setAgeVerified(true);
        setScreen("dashboard");
      } else {
        setPendingAfterGate("dashboard");
        setScreen("agegate");
      }
    } else {
      setScreen("onboarding");
    }
    // Load progress logs
    if (supabase) {
      supabase.from("progress_logs").select("*").eq("user_id", authUser.id)
        .order("logged_at", { ascending: false }).limit(50)
        .then(({ data }) => { if (data) setProgressLogs(data); })
        .catch((e) => console.error("progress_logs load failed:", e));
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
  // 6.7-a — passing the gate records the attestation in client state (carried
  // to Supabase by the next profile save) and routes onward. pendingAfterGate
  // overrides the first-run target when an already-signed-in user was re-gated.
  const confirmAgeGate = () => {
    setAgeVerified(true);
    setScreen(pendingAfterGate || afterAgeGate);
    setPendingAfterGate(null);
  };

  return (
    <div style={S.app}>
      {AVATURN_ENABLED && showAvatarCapture && (
        <AvaturnCapture
          onAvatarCreated={handleAvatarCreated}
          onCancel={() => setShowAvatarCapture(false)}
        />
      )}

      {screen === "loading" && (
        <div style={{ ...S.inner, justifyContent: "safe center", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}>
            <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 12 }}>Loading...</div>
        </div>
      )}

      {screen === "splash" && <SplashScreen onEnter={() => setScreen("agegate")} />}
      {screen === "agegate" && <AgeGate onConfirm={confirmAgeGate} onDeny={() => setScreen("blocked")} />}
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
            setAvatarUrl(selectBaseMesh(BASELINE_PROFILE));
            setAvatarHeadshot(null);
            setOnboardingStartStep(0);
            setScreen("onboarding");
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
            // G1 — named:false routes the new user through the naming gate before building.
            const eid = { id: 'e_' + Date.now(), name: 'Eidolon 1', goals: p.goals, compounds: [], lockedAt: null, named: false };
            setEidolons(prev => [...(prev || []).filter(e => e.id !== eid.id), eid]);
            setActiveEidolonId(eid.id);
            setProfile(p);
            // Select the base mesh from the just-completed profile so a new
            // user (incl. female) gets the right body immediately, not only
            // after a reload (Avatar Range, Stage 1).
            setAvatarUrl(selectBaseMesh(p));
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
          onSettings={() => navTo("settings")}
          units={preferences?.units || "imperial"}
          userEmail={user?.email || null}
          eidolons={eidolons}
          setEidolons={setEidolons}
          activeEidolonId={activeEidolonId}
          setActiveEidolonId={setActiveEidolonId}
          doseLog={doseLog}
          setDoseLog={setDoseLog}
          isPro={isPro}
          onSubscribe={startCheckout}
          onBuySlot={startBuySlot}
        />
      )}
      {screen === "progress" && (
        <ProgressLog
          userId={user?.id}
          eidolonId={activeEidolonId}
          profile={profile}
          cultivationState={cultivationState}
          onLogsChanged={setProgressLogs}
          cycleStart={(eidolons.find(e => e.id === activeEidolonId)?.lockedAt) || activeProtocol?.lockedAt || null}
          onPhotos={() => navTo("photos")}
          eidolonName={(eidolons.find(e => e.id === activeEidolonId) || eidolons[0])?.name || "your Eidolon"}
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
          />
        );
      })()}
      {screen === "qa" && (() => {
        // #18 — scope Q&A to the user's stack: committed → locked stack, else builder selection
        const qaIds = (activeProtocol?.compounds?.length ? activeProtocol.compounds : selectedCompounds) || [];
        const qaNames = qaIds.map(id => COMPOUNDS.find(c => c.id === id)?.name).filter(Boolean);
        return <AlkiProtocolQA contextCompounds={qaNames} />;
      })()}
      {screen === "timeline" && (
        <CycleTimeline
          stack={selectedCompounds}
          compoundCatalog={COMPOUNDS}
          initialCycleLength={12}
          // #71 — locked when the shown stack is the committed protocol (not a draft):
          // cycle length is then read-only. Building/modifying → editable suggestion.
          locked={(() => {
            const ap = activeProtocol;
            if (!ap?.lockedAt) return false;
            const a = [...selectedCompounds].sort().join(",");
            const b = [...(ap.compounds || [])].sort().join(",");
            return a === b;
          })()}
        />
      )}
      {screen === "protocol_guide" && (
        <ProtocolGuideView
          stackIds={(activeProtocol?.compounds?.length ? activeProtocol.compounds : selectedCompounds) || []}
          profile={profile}
          onQA={() => navTo("qa")}
          onTimeline={() => navTo("timeline")}
        />
      )}
      {screen === "modeler" && (
        <PeptideModeler
          profile={profile}
          selectedCompounds={selectedCompounds}
          compoundCatalog={COMPOUNDS}
          initialInputs={trainingInputs}
          onPersist={persistTrainingInputs}
        />
      )}
      {screen === "settings" && profile && (
        <SettingsView
          profile={profile}
          onSaveProfile={handleSettingsProfileSave}
          eidolons={eidolons}
          activeEidolonId={activeEidolonId}
          onSwitchEidolon={switchActiveEidolon}
          onRenameEidolon={renameEidolon}
          onDeleteEidolon={deleteEidolon}
          preferences={preferences}
          onSetPreferences={updatePreferences}
          onReplayTutorial={replayTutorial}
          goalOptions={GOALS}
          userEmail={user?.email || null}
          hasAccount={!!(supabase && user)}
          onChangePassword={handleChangePassword}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          isPro={isPro}
          subscriptionStatus={profile?.subscriptionStatus || "free"}
          subscriptionTier={profile?.subscriptionTier || null}
          comped={profile?.comped === true}
          proUntil={profile?.proUntil || null}
          onSubscribe={startCheckout}
          onManageBilling={openBillingPortal}
          onRefreshSubscription={syncSubscription}
          onRedeemCode={redeemPromoCode}
        />
      )}

      {/* #65/#3F/Sprint4-4.1 — ONE consistent navigation chrome on every inner
          screen. HOME (top-right): the ALKI wordmark is the brand touchpoint AND
          a one-tap return to the dashboard from anywhere — ALWAYS present.
          BACK (top-left): a contextual arrow that appears ONLY when there's a
          real previous screen to step back to (navHistory deeper than the
          dashboard root); when you arrived straight from home, HOME already
          covers the return so BACK stays hidden. Screens no longer render their
          own back buttons — this is the single source of nav truth. */}
      {INNER_SCREENS.includes(screen) && (
        <>
          {navHistory.length > 1 && (
            <button
              onClick={navBack}
              title="Back"
              aria-label="Back"
              style={{
                position: "fixed", top: 12, left: 14, zIndex: 901,
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 100,
                background: "rgba(10,10,12,0.82)", border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer", fontFamily: "'Syne', 'DM Sans', sans-serif",
                color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: 600,
                boxShadow: "0 2px 12px rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
              <span>Back</span>
            </button>
          )}
          <button
            onClick={goHome}
            title="Home"
            aria-label="Home"
            style={{
              position: "fixed", top: 12, right: 14, zIndex: 901,
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 13px", borderRadius: 100,
              background: "rgba(10,10,12,0.82)", border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer", fontFamily: "'Syne', 'DM Sans', sans-serif",
              boxShadow: "0 2px 12px rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1 }}>⌂</span>
          </button>
        </>
      )}

      {/* Sprint 6.5 — first-run intro overlay. Sits above all chrome (z 2000);
          shown once on first dashboard load and replayable from Settings. */}
      {showTutorial && (
        <TutorialOverlay slides={TUTORIAL_SLIDES} onClose={dismissTutorial} />
      )}

      {/* Dev/testing feedback button — visible on all screens past splash */}
      {screen !== "loading" && (
        <FeedbackFAB currentScreen={screen} userEmail={user?.email || null} />
      )}

      {/* Dev-only perf HUD — gated to dev builds (ALKI_DEV) so it never ships
          in the production bundle. In dev it's further opt-in via ?perf=1 or
          localStorage alkiPerf=1. */}
      {ALKI_DEV && <PerfHUD screen={screen} />}
    </div>
  );
}
