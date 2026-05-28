// ═══════════════════════════════════════════════════════════
// ALKI EIDOLON ENGINE — MAPPING LAYER (mapToMorphs.js, Layer 4)
// ═══════════════════════════════════════════════════════════
// Converts a physiological STATE snapshot (from simulate.js) into the
// normalized [0,1] morph keys + skin material values the avatar renders.
// Every formula is the one in spec §7 ("Physiology → morph mapping").
//
// Pure module: zero React/DOM imports. Ports to React Native untouched.
//
// SCOPE (Sprint 5 — skin material): the skin block is now the live §5.4/
// §5.5/§7 mapping. Collagen (GHK-Cu, Epitalon) drives `skin_quality` and
// the §7 roughness/luminosity material curves; Melanotan drives
// `skin_tone_shift`, clamped at the per-type Fitzpatrick CEILING (decision
// below). Per-material evidence grades (§8) are surfaced so the UI can
// render the tan/collagen projections at their own confidence. These are
// MATERIAL params — no geometry moves. Everything upstream is unchanged:
// the §7 `water` expression (Sprint 4), bf_low/waist/abs_def/facial
// (Sprint 2) and the muscle_* / vascularity morphs (Sprint 3).

import { VISIBLE_THRESHOLDS } from "./constants.js";
import { predictWaistCm } from "./derivations.js";

// ── Sigmoid helper (§7) ──────────────────────────────────────
// Used for any morph that crosses a perceptual threshold (abs,
// vascularity). x is the pre-multiplied (threshold − BF%) × k.
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// ── Threshold centers (§2.5 / §7, reconciled with the seed) ──
// The seed prompt's Sprint-2 spec asks for an abs_def sigmoid centered
// at 12% (M) / 20% (F) — which is exactly the midpoint of the §2.5
// onset (14/22) and full-six-pack (10/18) thresholds, and matches the
// TL;DR / §4 "centered ~12% / ~20%". We derive it from constants so
// there is a single source of truth.
function thresholds(sex) {
  const t = VISIBLE_THRESHOLDS[sex === "female" ? "female" : "male"];
  return {
    absCenter: (t.abs_onset.center + t.abs_full.center) / 2, // 12 (M) / 20 (F)
    absSlope:  t.abs_onset.slope,                            // k = 0.6
    vascCenter: t.vascularity_on.center,                     // 12 (M) / 18 (F) — matches §7
    vascSlope:  t.vascularity_on.slope                       // k = 0.5
  };
}

// ── Fitzpatrick tan cap (§5.5) ───────────────────────────────
// Melanotan response ceiling by skin type: Fp I caps ~0.4, Fp IV+ → 1.0.
const FITZPATRICK_TAN_CAP = { 1: 0.40, 2: 0.55, 3: 0.75, 4: 1.0, 5: 1.0, 6: 1.0 };

/**
 * Map a single simulation state snapshot to morph keys.
 *
 * @param {object} state  A timeline entry from simulate() (carries BF, LBM,
 *                         BF0, LBM0, dVAT, dECW, dICW, dColl, dTan,
 *                         vasodilatorBoost, androgenTone).
 * @param {object} ctx
 *   @param {"male"|"female"} ctx.sex
 *   @param {number} ctx.heightCm
 *   @param {number} ctx.LBM_max_naturalKg    Natural Casey-Butt ceiling — muscle/vascularity morph reference
 *   @param {number} [ctx.LBM_max_effectiveKg] Lifted ceiling (gain dynamics; not used by the mapping itself)
 *   @param {number} [ctx.estrogenFlag] 0–1 aromatization flag — §7 water 3rd term (Sprint 4)
 *   @param {number} [ctx.fitzpatrick]  1–6 — caps Melanotan tan (Sprint 5)
 *   @param {{tan:?string, collagen:?string}} [ctx.skinEvidence] §8 per-material grades (Sprint 5)
 * @returns {object} morph keys + material values + engine-native extras
 */
export function mapState(state, ctx) {
  const sex = ctx.sex === "female" ? "female" : "male";
  const th = thresholds(sex);
  const BF = state.BF;                 // current fraction
  const BF0 = state.BF0;               // baseline fraction
  const BFpct = BF * 100;
  // Muscle/vascularity morphs map against the NATURAL Casey-Butt ceiling,
  // NOT the anabolic-lifted one. §7 writes `LBM / LBM_max_effective`, but
  // using the lifted ceiling makes a stronger compound (bigger ceiling
  // lift) render a SMALLER avatar at equal LBM, and deflates the week-0
  // baseline below the user's actual physique. Anchoring to the natural
  // ceiling keeps absolute size stable and lets enhanced LBM read as growth
  // PAST the natural wall (ratio > 1 → the sigmoid saturates toward 1.0).
  // The lifted ceiling still governs the GAIN DYNAMICS upstream in
  // simulate.js (§2.3) — that is its proper job. (Deviation from §7
  // approved 2026-05-27; effective ceiling kept in ctx for callers.)
  const LBM_max_ref = ctx.LBM_max_naturalKg || ctx.LBM_max_effectiveKg || state.LBM;
  const androgenTone = state.androgenTone || 0;
  const vasodilator = state.vasodilatorBoost || 0;

  // ── bf_low (§7): leanness gained relative to the user's baseline ──
  const bf_low = clamp(BF0 > 0 ? 1 - BF / BF0 : 0, 0, 1);
  // bf_high — avatar key for ADDED adiposity (BF rose above baseline).
  // Fat-loss stacks never push this; included so the mapper output is a
  // complete, avatar-ready vector.
  const bf_high = clamp(BF0 > 0 ? (BF - BF0) / BF0 : 0, 0, 1);

  // ── muscle_overall (§7) + regional androgen bias ─────────────
  // §7 form: sigmoid((LBM / LBM_max − 0.7) × 8). LBM_max is the NATURAL
  // ceiling here (see note above); enhanced LBM can push the ratio past 1.
  const lbmRatio = LBM_max_ref > 0 ? state.LBM / LBM_max_ref : 0;
  const mo = clamp(sigmoid((lbmRatio - 0.7) * 8), 0, 1);
  const muscle_chest     = clamp(mo * (0.95 + 0.10 * androgenTone), 0, 1);
  const muscle_shoulders = clamp(mo * (0.95 + 0.15 * androgenTone), 0, 1);
  const muscle_arms      = clamp(mo * (0.95 + 0.15 * androgenTone), 0, 1);
  const muscle_back      = clamp(mo * (0.95 + 0.10 * androgenTone), 0, 1);
  const muscle_legs      = clamp(mo * (1.00 - 0.05 * androgenTone), 0, 1);
  const muscle_calves    = clamp(mo * 0.80, 0, 1);

  // ── abs_def (§7): steep sigmoid on BF crossing the threshold ──
  const abs_def = clamp(
    sigmoid((th.absCenter - BFpct) * th.absSlope) * Math.pow(mo, 0.5),
    0, 1
  );

  // ── vascularity (§7) ─────────────────────────────────────────
  const vascularity = clamp(
    sigmoid((th.vascCenter - BFpct) * th.vascSlope)
      * lbmRatio
      * (1 + 0.3 * (vasodilator > 0 ? 1 : 0)),
    0, 1
  );

  // ── visceral (avatar key): baseline belly distension × VAT change ──
  // Baseline visceral estimated from BF the same way baselineMorphState
  // does (>22% BF → distension). dVAT (≤0 for fat-loss) shrinks it.
  const visceralBaseline = clamp((BF0 * 100 - 22) / 18, 0, 0.6);
  const visceral = clamp(visceralBaseline * (1 + (state.dVAT || 0)), 0, 1);

  // ── water (§7): 0.5·ECW + 0.3·glycogen + 0.2·estrogen flag ──
  //   ECW_delta        → "puffy" extracellular retention (GH-axis, sodium).
  //   glycogen_state   → §2.4 puts glycogen + creatine "fullness" in the
  //                      INTRACELLULAR compartment, so the §5.8 ICW column
  //                      IS the glycogen/fullness driver — no separate
  //                      gram-level model needed; read it straight off dICW.
  //   estrogen flag    → aromatization puffiness from wet anabolics,
  //                      carried stack-level in ctx from sim meta.
  const ecwPos = clamp(state.dECW || 0, 0, 1);
  const icwPos = clamp(state.dICW || 0, 0, 1);
  const estrogenFlag = clamp(ctx.estrogenFlag || 0, 0, 1);
  const water = clamp(0.5 * ecwPos + 0.3 * icwPos + 0.2 * estrogenFlag, 0, 1);

  // ── facial_fullness (§7) ─────────────────────────────────────
  const facial_fullness = clamp(
    0.6 * (BF0 > 0 ? BF / BF0 : 1) + 0.4 * ecwPos,
    0, 1.2
  );

  // ── waist (§7): BF (+ VAT for men) → relaxed waist circumference ──
  // Engine-native absolute cm output for display/verification, plus a
  // normalized delta vs baseline. §6.4: women's fat loss is gynoid, so
  // their waist responds ~40% less (the redirected loss would drive a hip
  // morph the base mesh doesn't yet expose).
  const waistCm = predictWaistCm({ heightCm: ctx.heightCm, bfFrac: BF, sex });
  const waistCm0 = predictWaistCm({ heightCm: ctx.heightCm, bfFrac: BF0, sex });
  let waistDeltaCm = waistCm - waistCm0;
  if (sex === "female") waistDeltaCm *= 0.6; // 40% redirected away from waist (§6.4)
  const waistEffectiveCm = waistCm0 + waistDeltaCm;

  // ── skin material (§5.4 / §5.5 / §7) — Sprint 5 ──────────────
  // Collagen (GHK-Cu, Epitalon) and tan (Melanotan II) move MATERIAL
  // params only — zero geometry. `state.dColl` / `state.dTan` are the
  // collagen / eumelanin improvement vs baseline (0 at week 0), already
  // integrated on their own τ (collagen 12 wk, tan 4 wk) by simulate.js.
  const coll = clamp(state.dColl || 0, 0, 1);

  // Fitzpatrick is a genetic CEILING on tan, not a linear scaler
  // (decision 2026-05-27, reconciling §7's `melanotan_state × Fp_cap`
  // shorthand with §5.5's "Fp I caps at ~0.4 / Fp IV caps at 1.0" and the
  // Sprint-5 verify criteria). The Melanotan tan drive rises toward its
  // §5.8 max (≈0.80 at the 12-wk horizon) and is clamped at the per-type
  // cap: a fair Fp I user tops out at 0.40, while Fp IV+ is limited only by
  // the §5.8 drive. min(), not ×, so a Fp III tans to its own 0.75 wall
  // rather than to 75% of a Fp IV's tan.
  const fpCap = ctx.fitzpatrick ? (FITZPATRICK_TAN_CAP[ctx.fitzpatrick] ?? 1.0) : 1.0;
  const skin_tone_shift = clamp(Math.min(state.dTan || 0, fpCap), 0, 1);

  // §7 material curves applied to the collagen improvement: roughness
  // falls linearly (1 − Coll), luminosity "pops" early then plateaus
  // (√Coll). The renderer owns the absolute baseline — Body3DAvatar lerps
  // its own 0.7 skin roughness by `skin_quality` — so these two are
  // improvement-from-baseline readouts for verification / future material
  // wiring, NOT consumed as absolute material values. (`coll` is the
  // delta, 0 at baseline; the spec gives no age-baseline collagen to
  // anchor an absolute level, so we don't invent one.)
  const skin_quality = coll;                       // avatar's single 0..1 collagen key
  const skin_roughness_material = clamp(1 - coll, 0, 1);
  const skin_luminosity_material = Math.sqrt(coll);

  // §8 per-material evidence — lets the UI render the tan vs collagen
  // projections at their own confidence (Melanotan A pigment, GHK-Cu B,
  // Epitalon C). Carried stack-level in ctx from sim meta.
  const skin_tone_evidence = ctx.skinEvidence?.tan ?? null;
  const skin_quality_evidence = ctx.skinEvidence?.collagen ?? null;

  return {
    // ── Avatar-compatible morph keys (match MORPH_TARGETS) ──
    bf_low,
    bf_high,
    visceral,
    water,
    muscle_overall: mo,
    muscle_chest,
    muscle_shoulders,
    muscle_arms,
    muscle_back,
    muscle_legs,
    muscle_calves,
    abs_def,
    vascularity,
    skin_tone_shift,
    skin_quality,
    // ── Engine-native extras (for UI readouts / later wiring) ──
    waistCm: waistEffectiveCm,
    waistDeltaCm,
    facial_fullness,
    skin_roughness_material,
    skin_luminosity_material,
    skin_tone_evidence,
    skin_quality_evidence
  };
}

/**
 * Convenience: map a whole simulation result at a given week (default =
 * final). Pulls sex / height / effective ceiling / Fitzpatrick from the
 * sim's derivations + meta so callers don't re-thread context.
 *
 * @param {object} simResult  Output of simulate()
 * @param {number} [atWeek]   Week to map (default: final entry)
 * @returns {object} morph keys
 */
export function mapToMorphs(simResult, atWeek) {
  if (!simResult) return null;
  const ctx = {
    sex: simResult.meta.sex,
    heightCm: simResult.derivations.inputs.heightCm,
    LBM_max_naturalKg: simResult.derivations.caseyButt.lbmMaxKg,  // morph reference
    LBM_max_effectiveKg: simResult.meta.LBM_max_effectiveKg,      // gain-dynamics ceiling
    estrogenFlag: simResult.meta.estrogenFlag,                    // §7 water estrogen term (Sprint 4)
    fitzpatrick: simResult.meta.fitzpatrick,                      // Melanotan tan cap (Sprint 5)
    skinEvidence: simResult.meta.skinEvidence                     // §8 per-material grades (Sprint 5)
  };
  let state = simResult.final;
  if (typeof atWeek === "number") {
    const found = simResult.timeline.find(s => Math.abs(s.week - atWeek) < 1e-6);
    if (found) state = found;
  }
  return mapState(state, ctx);
}

export default mapToMorphs;
