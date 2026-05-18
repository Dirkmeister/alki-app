// ═══════════════════════════════════════════════════════════
// ALKI MORPH TARGET SYSTEM
// ═══════════════════════════════════════════════════════════
// This is the brain of the parametric 3D body model.
//
// The canonical list of shape keys (morph targets) that every Alki
// base mesh MUST expose. Each one is sculpted in Blender as a shape
// key on the base mesh; at runtime, the driver computes a weight
// per shape key from the user's profile + selected compounds and
// applies them via three.js morphTargetInfluences.
//
// IMPORTANT: These names are a contract between Blender and the app.
// If you rename a shape key in Blender, rename it here too. Any new
// shape key you sculpt must be added to MORPH_TARGETS to be addressable.
//
// PHILOSOPHY: shape keys describe BODY DIMENSIONS, not COMPOUNDS.
// A compound like Ipamorelin/CJC-1295 doesn't have its own shape
// key; it has a *vector* across these dimensions (see
// compoundMorphVectors.js). This means new compounds can be added
// without sculpting new geometry — they just compose existing morphs.

/**
 * Canonical list of shape keys every Alki base mesh exposes.
 *
 * Each entry describes:
 *   key       — the exact shape key name in Blender (MUST match)
 *   range     — [min, max] for the weight (most are 0..1; some bidirectional)
 *   default   — neutral value when no input pushes it
 *   category  — for debugging / UI grouping
 *   notes     — what the sculpted variant should look like
 */
export const MORPH_TARGETS = [
  // ── Body fat axis ──────────────────────────────────────────────
  {
    key: "bf_low",
    range: [0, 1],
    default: 0,
    category: "adiposity",
    notes: "Lean physique. Reduced subcutaneous fat. Visible bone landmarks at the clavicle, hip crests, and ribs. Skin sits closer to muscle."
  },
  {
    key: "bf_high",
    range: [0, 1],
    default: 0,
    category: "adiposity",
    notes: "Higher adiposity. Soft tissue distribution thickens at the waist (male) or hips/thighs (female). Face fuller. Limb circumference larger."
  },
  {
    key: "visceral",
    range: [0, 1],
    default: 0,
    category: "adiposity",
    notes: "Visceral fat distention — specifically belly protrusion forward, independent of subcutaneous fat. Tesamorelin/Semaglutide target this."
  },
  {
    key: "water",
    range: [0, 1],
    default: 0,
    category: "adiposity",
    notes: "Soft uniform swell across face, hands, and ankles. Reduces muscle definition without changing actual fat. Common early in GH peptide protocols."
  },

  // ── Muscle axis (overall + regional) ───────────────────────────
  {
    key: "muscle_overall",
    range: [0, 1],
    default: 0.5,
    category: "muscle",
    notes: "Generic lean mass increase across the body. Apply uniformly if no regional shape keys fire."
  },
  {
    key: "muscle_chest",
    range: [0, 1],
    default: 0,
    category: "muscle",
    notes: "Pec hypertrophy. Chest depth increases, pec line becomes prominent. Male only — for female meshes, this should be a no-op or minimal."
  },
  {
    key: "muscle_shoulders",
    range: [0, 1],
    default: 0,
    category: "muscle",
    notes: "Deltoid cap + trap rise. Shoulder width increases, traps lift toward the neck."
  },
  {
    key: "muscle_arms",
    range: [0, 1],
    default: 0,
    category: "muscle",
    notes: "Bicep/tricep/forearm circumference. Visible peak in the upper arm. Apply at <15% BF to be visible."
  },
  {
    key: "muscle_back",
    range: [0, 1],
    default: 0,
    category: "muscle",
    notes: "Lat width. V-taper from shoulder to waist. Most visible from the back, but flares the upper torso silhouette from the front."
  },
  {
    key: "muscle_legs",
    range: [0, 1],
    default: 0,
    category: "muscle",
    notes: "Quad sweep + glute development + calf split. Increases thigh circumference and creates the outer-quad shelf."
  },

  // ── Definition (compositional, not strictly geometry) ──────────
  {
    key: "abs_def",
    range: [0, 1],
    default: 0,
    category: "definition",
    notes: "6-pack visibility. Sculpted as a sunken-in ab grid on the rectus. Weight should ONLY rise when BF is low AND muscle is present (compute in driver)."
  },
  {
    key: "vascularity",
    range: [0, 1],
    default: 0,
    category: "definition",
    notes: "Visible veins on biceps, forearms, shoulders, and abs. Sculpted as raised lines OR applied as a displacement/normal texture. Requires low BF to show."
  },

  // ── Material / texture (not geometry, applied separately) ──────
  // These do NOT correspond to Blender shape keys. They're applied
  // by the renderer as material adjustments. Included here so the
  // driver returns a single complete state vector.
  {
    key: "skin_tone_shift",
    range: [0, 1],
    default: 0,
    category: "material",
    notes: "Melanotan II — darkens base skin tone. Applied as material color shift, not geometry."
  },
  {
    key: "skin_quality",
    range: [0, 1],
    default: 0,
    category: "material",
    notes: "GHK-Cu — increases skin smoothness, reduces material roughness, slight luminosity boost. Material-side."
  }
];

// Quick lookup
export const MORPH_KEYS = MORPH_TARGETS.map(m => m.key);
export const MORPH_BY_KEY = Object.fromEntries(MORPH_TARGETS.map(m => [m.key, m]));

/**
 * Build the baseline morph state from a user's profile alone (before
 * any compounds are applied).
 *
 * Profile inputs that matter here:
 *   - sex            — male/female (changes baseline distribution)
 *   - bodyFat        — drives bf_low/bf_high split
 *   - weight, height — proxies for muscle mass baseline
 *   - adv.muscleMass, adv.skelMuscle — refines baseline if provided
 *   - adv.visceralFat, adv.subFat, adv.bodyWater — refines if provided
 */
export function baselineMorphState(profile) {
  const state = Object.fromEntries(MORPH_TARGETS.map(m => [m.key, m.default]));

  if (!profile) return state;

  const bf = parseFloat(profile.bodyFat) || 18;
  const sex = profile.sex || "male";
  const adv = profile.adv || {};

  // ── Body fat distribution ────────────────────────────────────────
  // Maps BF% onto a bidirectional axis around the "neutral" ~18% mark.
  // <18% pushes bf_low; >18% pushes bf_high.
  if (bf < 18) {
    state.bf_low = Math.min(1, (18 - bf) / 12);  // fully lean at 6% BF
    state.bf_high = 0;
  } else {
    state.bf_high = Math.min(1, (bf - 18) / 17); // fully high at 35% BF
    state.bf_low = 0;
  }

  // ── Visceral fat (if user provided it via advanced stats) ────────
  // InBody scale: 1–20, where ~10+ is elevated.
  const visceralStat = parseFloat(adv.visceralFat);
  if (!isNaN(visceralStat) && visceralStat > 0) {
    state.visceral = Math.max(0, Math.min(1, (visceralStat - 5) / 12));
  } else if (bf > 22) {
    // Fall back: estimate visceral from total BF if no measurement
    state.visceral = Math.min(0.6, (bf - 22) / 18);
  }

  // ── Subcutaneous fat refinement ──────────────────────────────────
  // If user gave a separate subQ measurement, blend it with total BF.
  const subFatStat = parseFloat(adv.subFat);
  if (!isNaN(subFatStat) && subFatStat > 0) {
    // High subQ amplifies bf_high; low subQ at high total BF means more is visceral
    if (subFatStat > 20) state.bf_high = Math.min(1, state.bf_high + 0.1);
    if (subFatStat < 10) state.bf_low = Math.min(1, state.bf_low + 0.1);
  }

  // ── Body water (puffiness baseline) ──────────────────────────────
  const bodyWaterStat = parseFloat(adv.bodyWater);
  if (!isNaN(bodyWaterStat) && bodyWaterStat > 0) {
    const lowWater = sex === "female" ? 45 : 50;
    const highWater = sex === "female" ? 60 : 65;
    if (bodyWaterStat > highWater) {
      state.water = Math.min(0.5, (bodyWaterStat - highWater) / 10);
    }
  }

  // ── Muscle baseline ──────────────────────────────────────────────
  // Default by sex, refined by skeletal muscle % if provided.
  state.muscle_overall = sex === "male" ? 0.45 : 0.30;

  const skelStat = parseFloat(adv.skelMuscle);
  if (!isNaN(skelStat) && skelStat > 0) {
    // Sex-adjusted: men 38–46% is normal-good, women 34–42%
    const low = sex === "female" ? 30 : 34;
    const high = sex === "female" ? 44 : 48;
    state.muscle_overall = Math.max(0, Math.min(1, (skelStat - low) / (high - low)));
  }

  const muscleMassLb = parseFloat(adv.muscleMass);
  const weight = parseFloat(profile.weight);
  if (!isNaN(muscleMassLb) && !isNaN(weight) && weight > 0) {
    const musclePct = (muscleMassLb / weight) * 100;
    // High muscle ratio amplifies overall muscle and regional defaults
    if (musclePct > 45) {
      state.muscle_overall = Math.max(state.muscle_overall, 0.7);
      state.muscle_shoulders = Math.max(state.muscle_shoulders, 0.4);
      state.muscle_legs = Math.max(state.muscle_legs, 0.4);
    }
  }

  // ── Definition (computed, not direct input) ──────────────────────
  // Abs are only visible at low BF AND with some muscle. This formula
  // mirrors the SVG avatar's opacity logic: visible <20% BF, max <10%.
  const bfDefFactor = Math.max(0, Math.min(1, (20 - bf) / 12));
  state.abs_def = bfDefFactor * Math.min(1, state.muscle_overall + 0.3);

  // Vascularity is more aggressive — needs <15% BF and decent muscle
  const vascFactor = Math.max(0, Math.min(1, (15 - bf) / 8));
  state.vascularity = vascFactor * Math.min(1, state.muscle_overall * 0.8);

  return state;
}

/**
 * Compose the baseline with compound effect vectors to produce the
 * final morph state.
 *
 * compoundVectors: array of vectors, each is a partial map of
 *   { shape_key_name: delta } — see compoundMorphVectors.js
 * timelineFactor: 0..1, how far through the protocol (default 1 =
 *   fully realized 12-week outcome). Used to animate the before→after.
 *
 * Returns: { shape_key_name: final_weight } — every weight clamped
 * to the shape key's declared range.
 */
export function composeMorphState(baseline, compoundVectors = [], timelineFactor = 1) {
  const state = { ...baseline };

  for (const vec of compoundVectors) {
    if (!vec) continue;
    for (const [key, delta] of Object.entries(vec)) {
      if (state[key] === undefined) continue; // unknown key, skip silently
      state[key] = state[key] + (delta * timelineFactor);
    }
  }

  // Clamp every value to its declared range
  for (const m of MORPH_TARGETS) {
    const [min, max] = m.range;
    state[m.key] = Math.max(min, Math.min(max, state[m.key]));
  }

  // ── Cross-key invariants ─────────────────────────────────────────
  // bf_low and bf_high are mutually exclusive — if both got pushed,
  // resolve to whichever is larger and zero the other.
  if (state.bf_low > 0 && state.bf_high > 0) {
    if (state.bf_low >= state.bf_high) state.bf_high = 0;
    else state.bf_low = 0;
  }

  // Recompute abs_def AFTER bf and muscle shifts. Compounds that move
  // BF down + muscle up should auto-reveal abs.
  const effectiveBf = 18 - (state.bf_low * 12) + (state.bf_high * 17);
  const muscleSum = Math.min(1, state.muscle_overall + state.muscle_chest * 0.3);
  const bfDefFactor = Math.max(0, Math.min(1, (20 - effectiveBf) / 12));
  state.abs_def = Math.max(state.abs_def, bfDefFactor * (muscleSum + 0.2));

  // Vascularity similarly
  const vascFactor = Math.max(0, Math.min(1, (15 - effectiveBf) / 8));
  state.vascularity = Math.max(state.vascularity, vascFactor * muscleSum * 0.7);

  // Final clamp pass
  for (const m of MORPH_TARGETS) {
    const [min, max] = m.range;
    state[m.key] = Math.max(min, Math.min(max, state[m.key]));
  }

  return state;
}

/**
 * Convenience: full pipeline. Takes a profile + compound vectors and
 * returns both current and projected morph states for the before/after
 * view.
 */
export function resolveMorphStates(profile, compoundVectors = []) {
  const baseline = baselineMorphState(profile);
  return {
    current: baseline,
    projected: composeMorphState(baseline, compoundVectors, 1)
  };
}

/**
 * Diff two morph states — used for debugging the projected view
 * ("what did the stack actually change visually?").
 */
export function diffMorphStates(before, after, threshold = 0.05) {
  const diff = {};
  for (const key of MORPH_KEYS) {
    const d = (after[key] ?? 0) - (before[key] ?? 0);
    if (Math.abs(d) >= threshold) diff[key] = d;
  }
  return diff;
}
