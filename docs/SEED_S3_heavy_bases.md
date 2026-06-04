# SEED — Stage 3: the two HEAVY bases (male + female)

> **Thread type:** Claude **.ai + Blender** (live MCP, Blender 5.1.2 open). Mesh work.
> **Depends on:** Stage 2 committed — `build_humgen_body.py` already has `BODY_TYPE`, the
> `body_mass` bake, and the muscle re-sculpt; `check_glb.py` already has the `body_mass` checks; the
> Step-1 investigation already fixed the heavy recipe + the body_mass lever stack.
> **The honest heavy end, both sexes — the geometry the whole effort exists for.**
> **Paste into a new Claude.ai thread with Filesystem MCP + Blender MCP.**

---

## The one rule (unchanged from Stage 2)

**Author from a FRESH `Human.from_preset(...)` every time.** Never iterate on an exported human —
export deletes the permanent key (Phase B H1, proven). One fresh human → levers → bake → export.

## Step 0 — read first

1. `CLAUDE.md`; `docs/AVATAR_RANGE_ARCHITECTURE.md` §3.1 (base table), §3.2 (`body_mass` spec),
   §3.4 (cross-base consistency — esp. **approach-2** for the female pair), §3.7 (per-base gate),
   §4.5 (in-pair vertex-identity gate).
2. `docs/HUMGEN_PHASE_B_REPORT.md` §4.2 (`overweight` calibration) and §4.6 (range extremes —
   coherent through ~5, so the heavy recipe is safely inside the coherent band).
3. The Stage-2 **investigation findings** (the recorded recipe + the female `overweight` value you
   measured) and the recorded **male/female vertex-count contracts** — from the Stage-2 thread's
   report and/or `CLAUDE.md`.
4. `blender_scripts/build_humgen_body.py` (as Stage 2 left it), `check_glb.py`, `list_livekeys.py`.

## The key move (why heavy bases don't distort)

The heavy base **bakes the heavy body into its Basis (rest pose).** Then `bf_low` carries it *down*
toward lean and `body_mass` pushes *up* — each morph travels half the distance, so neither end
distorts. This is MakeHuman's bidirectional-extreme principle at the base-mesh level. `body_mass` on
the heavy base is a **shorter push** (max disp ~0.10–0.15, vs 0.18–0.25 on the lean base). `bf_high`
is demoted to "mild fat above this base's neutral"; `body_mass` carries the dramatic range.

## STEP 1 — bake `male_heavy` → per-base gate → STOP

Fresh HumGen male → set **`overweight ≈ 2.0`** (Phase B: ~32.7% BF — confirm against the Stage-2
recipe; stack `Belly Size` etc. only if the investigation called for it) **into the neutral/Basis
before baking the Alki morphs**, so the rest pose IS the heavy body. The existing isolated-delta
bake then captures each morph relative to *this* heavy neutral. `BODY_TYPE="heavy"`,
`GENDER="male"`.

Gate (§3.7 + §4.5):
- All 14 keys; `body_mass` vs `bf_high` cosine LOW; `body_mass` max disp **0.10–0.15** (heavy band);
  `muscle_overall` max ~0.05; neck seam Y 1.51–1.53 stable; placeholders flat.
- **In-pair identity:** `male_heavy` vertex **count + order identical to `male_lean`** (the recorded
  male-pair contract). If a fresh HumGen heavy bake does not preserve order vs the lean bake, use
  **§3.4 approach-2**: derive `male_heavy` by applying the heavy displacement as the new Basis on
  the *same* `male_lean` topology, then re-add morphs as deltas — this guarantees in-pair identity.
- Loads in-app `morphMode: "shape_keys"`, all 14 found; ≤ ~5 MB post-slim.
- **Visual A/B:** the heavy base reads as a believable heavier *person* (distributed adiposity), and
  `bf_low` 0→1 slims it down believably toward lean. → **STOP for sign-off.**

## STEP 2 — bake `female_heavy` → per-base gate → STOP

Fresh HumGen female → **`overweight ≈ the value you measured in Stage 2`** (target ~30–34% BF) into
Basis. `BODY_TYPE="heavy"`, `GENDER="female"`.

**Female-pair identity:** if HumGen female topology differs from the female_lean bake (likely
untested), use **§3.4 approach-2** to guarantee `female_heavy` shares `female_lean`'s vertex order.
Run the full §3.7 gate + the in-pair identity assertion against the recorded female-pair contract.
→ **STOP for sign-off.**

## After both heavy bases pass

- All four bases live (`alki_humgen_{male,female}_{lean,heavy}.glb`). Update the Stage-1 selector's
  **availability layer** — remove the `*_heavy → lean` fallbacks (heavy meshes now real).
- Deploy. The honest heavy end is live for both sexes. Stage 4 (`SEED_S4_renderer_fit.md`) is now
  required for the in-app silhouette to actually grow with mass — until the fit fix lands, the
  renderer's height-normalization still partially cancels the size signal.
- Update `CLAUDE.md`: four bases live; per-pair vertex contracts recorded; note which pairs used
  §3.4 approach-2.
- Never push to git. Verify every gate item on bytes/renders, not on tool "success" output.
