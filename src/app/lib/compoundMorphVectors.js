// ═══════════════════════════════════════════════════════════
// COMPOUND MORPH VECTORS
// ═══════════════════════════════════════════════════════════
// Each compound is expressed as a vector across the canonical
// shape keys (see morphTargets.js). The numbers represent the
// FULL 12-week realized visual outcome — the driver scales by
// timelineFactor for animation.
//
// Adding a new compound:
//   1. Add an entry below keyed by compound.id
//   2. Specify only the keys it affects (sparse vector)
//   3. Range is roughly [-0.5, +0.5] per key for any single
//      compound. Stacks compose by summing, so multiple
//      compounds can push a single key further.
//
// IMPORTANT: These are the PROJECTED visual deltas at end of
// protocol. They are intentionally idealized — assumes user
// follows protocol and stack actually works. Reality varies.
//
// FALLBACK: For any compound not listed here (e.g. the 63
// expanded compounds), getCompoundVector falls back to a
// computed approximation from the compound's legacy
// effects.{bf,muscle,skin,recovery} vector.

const NAMED_VECTORS = {
  // ── Recovery compounds: minimal visual change ────────────────────
  bpc157: {
    // Tissue repair — no body comp change. Slight skin quality
    // boost from systemic anti-inflammatory effect.
    skin_quality: 0.08
  },

  tb500: {
    // Same category as BPC-157. Slightly more systemic.
    skin_quality: 0.05
  },

  // ── GH axis: lean mass + modest fat loss + visceral targeting ───
  ipacjc: {
    // Ipamorelin + CJC-1295. The clean GH stack — recomp profile.
    bf_high: -0.18,
    bf_low: 0.10,
    visceral: -0.12,
    muscle_overall: 0.22,
    muscle_shoulders: 0.18,
    muscle_chest: 0.15,
    muscle_arms: 0.12,
    muscle_back: 0.14,
    muscle_legs: 0.12,
    water: 0.08,           // GH peptides cause some early water retention
    skin_quality: 0.18,    // IGF-1 improves skin/collagen
    vascularity: 0.05      // lean mass + low BF combo aids this
  },

  // ── Fat loss (GH-mediated, visceral-targeted) ────────────────────
  tesamorelin: {
    // FDA-approved for visceral fat reduction. Its specialty.
    visceral: -0.30,       // primary mechanism
    bf_high: -0.12,
    bf_low: 0.06,
    muscle_overall: 0.08,   // modest GH-mediated lean boost
    skin_quality: 0.10,
    water: 0.05
  },

  // ── GLP-1 class: aggressive fat loss + lean mass risk ────────────
  semaglutide: {
    // The GLP-1 standard. 15-20% body weight loss in 12-16 weeks.
    bf_high: -0.42,
    bf_low: 0.26,
    visceral: -0.20,
    muscle_overall: -0.10,   // muscle loss without resistance training
    muscle_chest: -0.05,
    muscle_arms: -0.06,
    muscle_legs: -0.08,
    water: -0.05,            // GLP-1s tend to reduce water retention
    skin_quality: -0.05      // "Ozempic face" — gaunt, hollowed
  },

  retatrutide: {
    // Triple agonist. More aggressive than semaglutide.
    bf_high: -0.55,
    bf_low: 0.32,
    visceral: -0.28,
    muscle_overall: -0.14,
    muscle_chest: -0.08,
    muscle_arms: -0.08,
    muscle_legs: -0.10,
    water: -0.08,
    skin_quality: -0.08
  },

  // ── Anti-aging / skin ──────────────────────────────────────────
  ghkcu: {
    // Copper peptide — collagen, skin quality, no body comp change.
    skin_quality: 0.45,
    skin_tone_shift: 0      // doesn't tan; just smooths
  },

  // ── Performance (CNS) ──────────────────────────────────────────
  pt141: {
    // Central activation. No body comp change.
  }
};

// ── Expanded-database fallback ─────────────────────────────────────
// For compounds not in NAMED_VECTORS, compute a morph vector from
// their legacy 4-dim effect vector. This keeps every compound
// addressable; the resulting visuals are less specific but
// directionally correct.
function deriveVectorFromLegacyEffects(compound) {
  if (!compound || !compound.effects) return {};
  const { bf = 0, muscle = 0, skin = 0, recovery = 0 } = compound.effects;
  const vec = {};

  // Body fat: legacy bf is in "percentage points" (-6 = lose ~6% BF)
  // Translate to morph deltas: -6 BF ≈ +0.25 bf_low + -0.4 bf_high
  if (bf < 0) {
    vec.bf_high = bf / 15;          // -0.4 at -6 BF
    vec.bf_low = -bf / 24;          // +0.25 at -6 BF
  } else if (bf > 0) {
    vec.bf_high = bf / 15;
    vec.bf_low = -bf / 24;
  }

  // Muscle: legacy muscle is "lean mass %" — translate uniformly
  if (muscle !== 0) {
    const m = muscle / 14;          // +3 → +0.21 muscle_overall
    vec.muscle_overall = m;
    // Spread to regional muscles at lower weight
    vec.muscle_chest = m * 0.6;
    vec.muscle_shoulders = m * 0.65;
    vec.muscle_arms = m * 0.55;
    vec.muscle_back = m * 0.55;
    vec.muscle_legs = m * 0.6;
  }

  // Skin: legacy skin is 0..5 — translate to skin_quality
  if (skin !== 0) {
    vec.skin_quality = skin / 10;
  }

  // Recovery doesn't have direct visual analog
  return vec;
}

/**
 * Get the morph vector for a compound.
 *
 * compound: a full compound object (must have .id and .effects)
 * Returns: a sparse map of { shape_key: delta }
 */
export function getCompoundVector(compound) {
  if (!compound || !compound.id) return {};
  if (NAMED_VECTORS[compound.id]) return NAMED_VECTORS[compound.id];
  return deriveVectorFromLegacyEffects(compound);
}

/**
 * Get vectors for all selected compounds. Convenience wrapper.
 *
 * compoundIds: array of compound ids
 * compoundCatalog: full COMPOUNDS array (so we can look up by id)
 */
export function getStackVectors(compoundIds, compoundCatalog) {
  if (!compoundIds || !compoundCatalog) return [];
  return compoundIds
    .map(id => compoundCatalog.find(c => c.id === id))
    .filter(Boolean)
    .map(getCompoundVector);
}

// Export the raw named vectors too, in case a feature wants to
// inspect or visualize them directly (e.g. compound info card
// showing "this compound affects: chest, shoulders, back").
export { NAMED_VECTORS };
