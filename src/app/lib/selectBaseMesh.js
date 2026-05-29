// ═══════════════════════════════════════════════════════════
// ALKI — BASE MESH SELECTOR  (Avatar Range, Stage 1)
// ═══════════════════════════════════════════════════════════
// Picks WHICH base GLB an avatar loads from the user's STARTING profile.
// This is the `bodyUrl` half of the reserved seam (AVATAR_PLATFORM_PLAN):
// selectBaseMesh → bodyUrl; `avatar_url` (Supabase) is reserved for the
// FUTURE custom-mesh override ("MAKE IT ME"); headUrl stays null.
//
// Pure module — firewall-safe: NO React / three.js / DOM. Node-runnable.
// It imports only the pure engine derivation (deriveAll) to read the
// starting body's BF% + frame, exactly as spec §4.1 calls for.
//
// WHY a selector at all: one base mesh morphed across 130→320 lb distorts
// at the ends (spec §0/§2.1). Option C ships lean + heavy bases per sex;
// this function routes each starting body to the honest base. The
// lean↔heavy decision is a 2-D band (relative leanness AND absolute fat
// burden), isolated here as the single calibration knob.

import { deriveAll } from "../engine/derivations.js";

// The shipped fallback mesh (mirrors AlkiApp's DEFAULT_AVATAR_URL). Used
// when the profile is too incomplete to derive, OR when the honestly
// selected base hasn't been built yet (see AVAILABLE_BASES). Never null.
export const DEFAULT_BASE_MESH = "/alki_humgen_male.glb";

// ── The lean↔heavy band (THE knob) ───────────────────────────
// Heavy base when the starting body is genuinely large *as fat* — by
// relative adiposity (BF%) OR absolute fat burden relative to frame
// (fat-mass index, FMI = fatMassKg / heightM²). FMI is used rather than
// BMI deliberately: BMI flags a 210 lb / 14% lifter as "heavy" (muscle),
// whereas FMI only fires on actual fat mass, so a big lean lifter still
// gets the lean base while a 250 lb / 24%-BF body (BF% under the cut but
// high fat burden) correctly gets the heavy base.
//   Reference FMI bands: M normal 3–6 / overweight 6–9 / obese 9+;
//                        F normal 5–9 / overweight 9–13 / obese 13+.
// Cutoffs sit at mid-overweight so a clearly-heavy body whose BF% is just
// under the relative line still routes heavy (e.g. a 250 lb / 24% male →
// FMI ≈ 8.6 ≥ 8 → heavy). Single calibration knob; tune here only.
const HEAVY_BAND = {
  male:   { bfPct: 25, fmi: 8 },
  female: { bfPct: 32, fmi: 11 }
};

// The base meshes that physically EXIST in /public right now. Adding a
// key here is the ONE switch that "turns on" a base as each Blender stage
// deploys it — anything not listed resolves gracefully to the default
// shipped mesh (logged), so the app never requests a 404 GLB and never
// blanks the avatar (the core engagement mechanic).
//   male_lean  = the currently-shipped mesh (spec §3.1: male_lean origin
//                is the current male GLB). Wired to the existing file
//                until its clean re-export.
const AVAILABLE_BASES = {
  male_lean: "/alki_humgen_male.glb",
  // male_heavy:   "/alki_humgen_male_heavy.glb",     // Stage 3
  // female_lean:  "/alki_humgen_female_lean.glb",    // Stage 2
  // female_heavy: "/alki_humgen_female_heavy.glb",   // Stage 3
};

function normalizeSex(sex) {
  return sex === "female" || sex === "F" ? "female" : "male";
}

/**
 * The selection decision, independent of which files exist yet. Returns
 * the canonical base key ("male_lean" | "male_heavy" | "female_lean" |
 * "female_heavy"), or null if the profile is too incomplete to derive.
 * Exposed for verification / future custom-override wiring.
 */
export function selectBaseKey(profile) {
  if (!profile) return null;
  const sex = normalizeSex(profile.sex);
  const der = deriveAll(profile);
  if (!der) return null; // missing weight/height → can't honestly choose

  const bfPct = der.inputs.bfFrac * 100;
  const heightM = der.inputs.heightCm / 100;
  const fmi = heightM > 0 ? der.composition.fatMassKg / (heightM * heightM) : 0;

  const band = HEAVY_BAND[sex];
  const heavy = bfPct >= band.bfPct || fmi >= band.fmi;
  return `${sex}_${heavy ? "heavy" : "lean"}`;
}

/**
 * Resolve a profile to a loadable base-mesh URL. Always non-null.
 *   • Incomplete profile        → DEFAULT_BASE_MESH.
 *   • Selected base not built yet → DEFAULT_BASE_MESH (logged once).
 *   • Otherwise                  → the selected base's real GLB.
 *
 * @param {object} profile  App imperial profile { sex, weight, heightFt, heightIn, bodyFat, ... }
 * @returns {string} a GLB path under /public
 */
export function selectBaseMesh(profile) {
  const key = selectBaseKey(profile);
  if (!key) return DEFAULT_BASE_MESH;

  const url = AVAILABLE_BASES[key];
  if (url) return url;

  // Honestly selected, but its mesh hasn't shipped yet → graceful default.
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.info(`[Alki selectBaseMesh] base "${key}" not built yet — using ${DEFAULT_BASE_MESH}`);
  }
  return DEFAULT_BASE_MESH;
}

export default selectBaseMesh;
