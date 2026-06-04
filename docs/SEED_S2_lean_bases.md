# SEED — Stage 2: HumGen investigation + the two LEAN bases (male + female)

> **Thread type:** Claude **.ai + Blender** (live MCP, Blender 5.1.2 open). Mesh/measurement work.
> **Depends on:** Stages 0 + 1 committed. The selector + `body_mass` channel are wired.
> **Covers plan Stages 2 + 3-lean.** Both lean bases share one pipeline, so they're authored in one
> thread; each base is its own stop-for-proof gate. This thread also makes the
> `build_humgen_body.py` / `check_glb.py` changes that Stage 3 (heavy bases) will reuse.
> **Paste into a new Claude.ai thread with Filesystem MCP + Blender MCP.**

---

## The one rule that ends the trial-and-error era (Phase B, proven)

**Always author from a FRESH `Human.from_preset(...)`. Never iterate on an exported or
modifier-applied human.** Export bakes-and-deletes `Male` / `LIVE_KEY_PERMANENT` / `LIVE_KEY_TEMP_`
(Phase B B8/B1, H1 proven) — after one export that human can never accept a livekey write again
(`KeyError: "Key 'LIVE_KEY_PERMANENT' not found"`). One fresh human → set levers → bake → export.
Generation works perfectly on 5.1 (Phase B Q1/Q2/B4), so this loop is deterministic, not guesswork.

## Step 0 — read first

1. `CLAUDE.md`; `docs/AVATAR_RANGE_ARCHITECTURE.md` §3 (whole Blender spec), §4.5 (vertex-order
   gate), §4.8 (what's protected).
2. `docs/HUMGEN_PHASE_B_REPORT.md` — §4.1 (height: base 180 cm, linear), §4.2 (`overweight`
   calibration), §4.3 (the `muscular` macro is a TAPER, not bulk), §4.4 (torso lever → anatomy
   map), §4.5 (per-region muscle levers — the real hypertrophy), §4.6 (range extremes).
3. `docs/HUMGEN_PHASE_A_FINDINGS.md` Fact 1 (the export-destruction mechanism + the from-fresh rule)
   and §1's drive-path inventory.
4. `blender_scripts/build_humgen_body.py`, `check_glb.py`, `list_livekeys.py`, `strip_textures.mjs`.

## STEP 1 — HumGen LiveKey investigation (≈10 min) → STOP for sign-off

This replaces guesswork in the recipe. Run `list_livekeys.py`; confirm names live. Then settle two
recipes against Phase B numbers:

**(a) `body_mass` lever stack.** `body_mass` must be **distributed adiposity**, not uniform
inflation (Phase B render 02/05 prove a single `overweight` push is a forward beach-ball belly on
thin limbs — that is the failure this key exists to fix). Compose it from the levers Phase B mapped
(§4.4): `Belly Size` (waist *depth*, forward), `Hips Size` (whole pelvis — waist + hip + thigh
together), plus flank/limb-girth levers for proximal arm/thigh fullness, mild cheek/jaw. Keep the
**neck-seam band (Y 1.51–1.53) undeformed.** Target distribution per `AVATAR_RANGE_ARCHITECTURE.md`
§3.2. Verify the composed shape against §3.2 before baking.

**(b) Heavy-base recipe (for Stage 3, decided now while you're measuring).** Phase B §4.2:
`overweight = 1.0` is only **24.3% BF** — too lean for the heavy base. Targets:
- **male_heavy ~28–32% BF → `overweight ≈ 2.0`** (Phase B: 32.7% BF, waist 120.8).
- **female_heavy ~30–34% BF → `overweight ≈ 2.5–3.0`** — but **female `overweight` was NOT measured
  in Phase B (Q6 #1).** Do a 10-min female check now: fresh female `from_preset`, sweep
  `overweight` 1→3, read BF%/waist, pick the value that lands ~30–34% BF. Record it.

**DO NOT use the macro `muscular` lever for bulk.** Phase B §4.3: it is a lean/taper/cut morph that
*reduces* mass and volume (FFMI peaks at ~1.0 then declines). All hypertrophy comes from the
per-region `* Muscles` levers + `Shoulder Width` (§4.5).

Report the two recipes (exact lever names + values) → **STOP for sign-off** before touching scripts.

## STEP 2 — pipeline changes (made once; Stage 3 reuses them)

**`build_humgen_body.py`:**
- Parameterize: add `BODY_TYPE = "lean" | "heavy"` alongside `GENDER`. Output
  `alki_humgen_{gender}_{type}.glb` (4 files across S2+S3).
- Add a **`body_mass` bake** from the Step-1 lever stack; add `"body_mass"` to the canonical key
  list (now **14 keys**).
- **Muscle re-sculpt** (×1.5–2 displacement, target `muscle_overall` max ~0.05): implement by
  **post-scaling the baked muscle shape-key offsets** (a vectorized multiply — exact, trivial) —
  NOT by driving the macro `muscular`. Normalized 0..1 weights stay unchanged; weight = 1.0 now
  means a larger, correct delta.
- Keep the **isolated-delta bake** (`basis + (deformed − neutral)` — the v4 fix; do not regress to
  the v3 "every key ≈ whole body" bug).
- **Strip `COLOR_0`**; keep material/texture strip; **`export_skins=False`** (static mesh — honest
  intent + leaner file); `export_morph=True`; y-up; per-key max-disp print.

**`check_glb.py`** — add `body_mass` checks: assert `body_mass` vs `bf_high` cosine **LOW** (proves
new geometry, not re-inflation); nonzero-vert count high; max disp in the **0.18–0.25** band (lean
base). Generalize to a path arg (already supports it).

## STEP 3 — bake `male_lean` → per-base gate → STOP

Fresh HumGen male (`models\male\Caucasian\David.json`) → set levers → isolated-delta bake → 14 keys
→ clean export. **Vertex count will be HumGen-native (~25,286), NOT the old GLB's 26,575** — the
26,575 mesh is replaced wholesale (decided 2026-06-04). **Record the exact vertex count this bake
produces — it becomes the male-pair contract** (Stage 3's `male_heavy` must match it; the §4.5 gate
no longer asserts `=== 26575`).

Per-base verification gate (`AVATAR_RANGE_ARCHITECTURE.md` §3.7 — every item, verify on bytes):
all 14 key names present; `muscle_chest` vs `muscle_legs` cosine ~0; `body_mass` vs `bf_high` cosine
LOW; `body_mass` max disp 0.18–0.25; `muscle_overall` max ~0.05; neck seam Y 1.51–1.53 unmoved by
all morphs; `water`/`abs_def`/`vascularity` still flat (0); loads in-app with console
`morphMode: "shape_keys"` and all 14 found; ≤ ~5 MB post-slim; **visual A/B: `body_mass` 0→1 grows
the body believably (belly low+forward, limbs proximal, face fuller) — not spherically.** This last
one is the honesty check the whole effort exists for. → **STOP for sign-off.**

## STEP 4 — bake `female_lean` → per-base gate → STOP

Same pipeline, `GENDER="female"`, `BODY_TYPE="lean"`, centered ~20–24% BF athletic. Female topology
may differ from male (Phase B Q6 untested) — the renderer keys morphs **by name**, so cross-sex
divergence is tolerable; **record the female vertex count as the female-pair contract.** Run the
full §3.7 gate. This **closes the no-female-avatar bug.** → **STOP for sign-off.**

## DEPLOY CHECKPOINT

After both lean bases pass: deploy. Female users now get a female body; the male base is the clean
re-bake. **Get Austin's eyes on range + the female avatar against real profiles before Stage 3**
(this is also Tier 2 #5, engine tuning against real profiles). Then run `SEED_S3_heavy_bases.md`.

## Housekeeping

- Update `CLAUDE.md`: add `src/app/engine/` to the structure block (it omits it —
  `AVATAR_RANGE_ARCHITECTURE.md` §1.0b); record the 4-base GLB naming scheme and the recorded
  male/female vertex-count contracts; note the old `_slim` + 26,575 GLBs are retired.
- Never push to git. Verify every claim on bytes/renders, never on tool "success" output.
