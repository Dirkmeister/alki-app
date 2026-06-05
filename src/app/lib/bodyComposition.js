/**
 * ============================================================
 * ALKI — Canonical body-fat DISPLAY helpers
 * ============================================================
 *
 * Single source of truth for the body-fat % the USER SEES on every surface:
 * the dashboard "Projected Outcomes", the EidolonHero projection summary, and
 * the Modeler headline tiles. Before this module each surface re-derived the
 * number its own way (the dashboard summed `effects.bf` with a 5/12% floor; the
 * Modeler ran peptideEngine's week-by-week sim with a 3% floor), so the same
 * stack read as a different projected BF on different pages (#47dc1758 / #86132d26).
 *
 * Pure logic — no React, no renderer imports. Lives behind the portability
 * firewall like everything else in lib/.
 *
 * SCOPE NOTE (intentional): this unifies the *displayed headline numbers* only.
 * It does NOT replace the deep engines and is not meant to — the Eidolon engine
 * (engine/) still drives the avatar geometry, and the Modeler's peptideEngine
 * week-by-week CHARTS still model the trajectory shape. Reconciling those two
 * engines is deferred debt, out of scope here.
 */

// Essential body-fat floor a projection can never cross (men ~3–5%, women
// ~10–12%, ACSM). Matches the dashboard's long-standing #bf clamp.
export const ESSENTIAL_FAT_PCT = { male: 5, female: 12 };

export function essentialFatPct(sex) {
  return sex === "female" ? ESSENTIAL_FAT_PCT.female : ESSENTIAL_FAT_PCT.male;
}

// Sum of per-compound 12-week body-fat deltas (percentage points; negative = loss).
export function bfChangeFromStack(selectedCompounds = [], catalog = []) {
  let bfChange = 0;
  for (const id of selectedCompounds) {
    const c = catalog.find((x) => x.id === id);
    if (c && c.effects) bfChange += c.effects.bf || 0;
  }
  return Math.round(bfChange * 10) / 10;
}

// Canonical projected body-fat % for display. Never raises an already-leaner
// user above their current BF, and never drops below essential fat. Returns null
// when the profile has no usable bodyFat (callers fall back to current).
export function projectBodyFat(profile, selectedCompounds = [], catalog = []) {
  const current = Number(profile?.bodyFat);
  if (!Number.isFinite(current)) return null;
  const bfChange = bfChangeFromStack(selectedCompounds, catalog);
  const floor = essentialFatPct(profile?.sex);
  const raw = Math.round((current + bfChange) * 10) / 10;
  return Math.max(Math.min(current, floor), raw);
}

// Projected bodyweight: hold lean mass constant and re-solve total weight at the
// projected BF. Naturally zero-change for stacks that don't move fat.
export function projectWeight(profile, selectedCompounds = [], catalog = []) {
  const w = Number(profile?.weight);
  const current = Number(profile?.bodyFat);
  if (!Number.isFinite(w)) return null;
  const projBf = projectBodyFat(profile, selectedCompounds, catalog);
  if (projBf == null || projBf >= 100 || !Number.isFinite(current)) return Math.round(w);
  const lbm = w * (1 - current / 100);
  return Math.round(lbm / (1 - projBf / 100));
}

// Single BF% → category mapping used wherever a label is shown.
export function bfCategory(bf) {
  const n = Number(bf);
  if (!Number.isFinite(n)) return "";
  return n < 10 ? "Competition"
       : n < 15 ? "Athletic"
       : n < 20 ? "Fit"
       : n < 25 ? "Average"
       : n < 30 ? "Above Average"
       : "Elevated";
}
