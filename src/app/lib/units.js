// ── UNIT SYSTEM (display preferences) ──────────────────────────────────────
// Pure logic, no React/render imports — part of the portability firewall, so
// this ports to React Native untouched.
//
// CANONICAL STORAGE IS IMPERIAL. The profile always stores heightFt/heightIn
// and weight in pounds, because the Eidolon engine (engine/derivations.js
// toSIProfile) reads imperial and converts to SI internally. The unit system
// here is a DISPLAY/INPUT preference only: metric values are converted to the
// canonical imperial fields before they ever reach state or Supabase, so the
// engine, avatar, and recommendation paths never have to know which units the
// user prefers. Switching units must never change the underlying body.

// Scaffolded preferences object. Add future display toggles (e.g. dateFormat,
// theme) here and they round-trip through Supabase profiles.preferences and
// localStorage automatically — no schema migration per toggle.
export const DEFAULT_PREFERENCES = {
  units: "imperial", // "imperial" | "metric"
};

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

// ── Raw conversions ────────────────────────────────────────────────────────
export function lbToKg(lb) {
  const n = parseFloat(lb);
  return Number.isFinite(n) ? n / LB_PER_KG : 0;
}
export function kgToLb(kg) {
  const n = parseFloat(kg);
  return Number.isFinite(n) ? n * LB_PER_KG : 0;
}
export function ftInToCm(ft, inch) {
  const f = parseFloat(ft) || 0;
  const i = parseFloat(inch) || 0;
  return (f * 12 + i) * CM_PER_IN;
}
// Total centimetres → { ft, in } with inch rounding that rolls 12 → +1 ft.
export function cmToFtIn(cm) {
  const n = parseFloat(cm);
  if (!Number.isFinite(n) || n <= 0) return { ft: 0, in: 0 };
  const totalIn = n / CM_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return { ft, in: inch };
}

// ── Unit labels ────────────────────────────────────────────────────────────
export function weightUnitLabel(units) {
  return units === "metric" ? "kg" : "lb";
}
export function heightUnitLabel(units) {
  return units === "metric" ? "cm" : "ft/in";
}

// ── Display formatters ─────────────────────────────────────────────────────
// Weight is stored in pounds. Returns e.g. "185 lb" or "84 kg".
export function formatWeight(lb, units, { withUnit = true } = {}) {
  const n = parseFloat(lb);
  if (!Number.isFinite(n)) return "—";
  if (units === "metric") {
    const kg = Math.round(lbToKg(n));
    return withUnit ? `${kg} kg` : `${kg}`;
  }
  const r = Math.round(n);
  return withUnit ? `${r} lb` : `${r}`;
}

// Height is stored as ft + in. Returns e.g. `5'10"` or "178 cm".
export function formatHeight(heightFt, heightIn, units) {
  const ft = parseFloat(heightFt);
  const inch = parseFloat(heightIn);
  if (units === "metric") {
    const cm = Math.round(ftInToCm(ft, inch));
    return cm > 0 ? `${cm} cm` : "—";
  }
  if (!Number.isFinite(ft)) return "—";
  return `${ft}'${Number.isFinite(inch) ? inch : 0}"`;
}
