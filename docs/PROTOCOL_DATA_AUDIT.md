# Protocol Data Audit — `needs_review` records

**Date:** 2026-05-27 · **Scope:** the 63 derived per-compound records in
`src/app/data/protocolProtocols.js` (the 8 core compounds are hand-authored,
`confidence: "high"`, and excluded here).

## What this audit is (and isn't)

Each derived record is generated from the compound's own in-repo strings
(`dosing` / `cycle` / `route` / `category`). This audit verifies the derivation is
**faithful to that source** and flags every field that is a placeholder or
approximation. It does **NOT** certify clinical accuracy — vial sizes,
reconstitution volumes, full titration ramps, and week-by-week effects need a
domain source (Dallas + the umbrella_labs / Eidolon-Engine references).

## Verdicts (63 records)

| Verdict | Count | Meaning |
|---|---|---|
| ✅ FAITHFUL | 40 | dose / route / frequency / cycle all match the source string |
| ⚠️ DOSE-CAVEAT | 18 | parsed dose is an approximation (see list) |
| 🔬 EXPERIMENTAL | 5 | no published dose in source (no reconstitution shown) |

## Fixed in this pass

- **Per-day cadence surfaced** (audit finding): 11 "multi-daily" compounds were
  flattened to "Every day," losing the times-per-day in the source. Added
  `deriveCadence` → the schedule now shows e.g. *"Every day · 1–3×/day"* and, for
  titrated compounds, *"titrate per protocol (starting dose shown)."* Faithful to
  source, no fabrication.

## ⚠️ DOSE-CAVEAT — verify the dose before trusting it

These show a usable *starting* number, but the calculator's `perDoseMcg` / schedule
may understate the real regimen:

- **Multi-phase / titrated** (parsed value is the *start*, full ramp not encoded):
  `t3` (25→75mcg), `clenbuterol` (40mcg pyramid), `melanotan2` (0.5mg load → weekly),
  `anastrozole` (0.25mg EOD, titrate to labs). → **Needs the full titration schedule.**
- **Multi-daily** (per-dose right; now shows ×/day): `cjc1295_nodac`, `ipamorelin`,
  `s23`, `s4`, `lgd3303`, `sr9011`, `metformin`, `semax`, `noopept`, `selank`,
  `picamilon`. → Verify the daily *count* is acceptable.
- **Combo** `bpc_tb_blend` — only the BPC-157 component (500mcg daily) is captured;
  the TB-500 half (2mg 2×/week) is **missing**. → Needs hand-authoring as a dual record.
- **Range** `alpha_gpc` — "300–600 mg" parses to 600 (upper bound). → Confirm intended.
- **Unparsed** `ru58841` — "5% topical solution" has no mg dose (topical, so no recon
  needed). → Acceptable as-is.

## 🔬 EXPERIMENTAL — no real dose in source

`gw501516`, `gw0742`, `slu_pp_332`, `aicar`, `idra21`. Reconstitution is correctly
omitted; cycle shows the raw text. `gw501516`/`gw0742`/`slu_pp_332`/`idra21` also carry
a `displayWarning` (surfaced as the guide's warning banner). → Confirm presentation is
acceptable; these should arguably never be "recommended."

## Universal caveats (apply to ALL 63)

1. **Reconstitution vial sizes** default to `[5, 10] mg` / `2 mL` bac water. These are
   **editable defaults** in the calculator (the user enters their real vial), not
   asserted facts — but the defaults could be set per-compound for a better starting point.
2. **`weekByWeek`** is a generic line built from `keyBenefits` + "see Q&A." Real
   week-by-week expectations need authoring per compound.
3. **`bloodwork`** is a category default (SARM/Hormonal → full hormone panel;
   Metabolic → metabolic/lipid; GH/fat-loss → IGF-1/glucose; else CMP/CBC). Reasonable,
   but verify per compound.
4. **Injection sites** default to abdomen / thigh / love-handle for all injectables
   (standard SubQ sites — fine generically).

## How to clear an entry

When you've verified a compound, hand-author its record in the `AUTHORED` map in
`protocolProtocols.js` (same shape as the 8 core) and it flips to
`confidence: "high"` and drops out of `REVIEW_QUEUE`.
