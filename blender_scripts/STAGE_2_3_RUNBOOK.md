# Avatar Range — Stage 2 & 3 Build Runbook

Build the four base meshes (`{male,female} × {lean,heavy}`) + the new
`body_mass` key + the muscle re-sculpt. Spec: `docs/AVATAR_RANGE_ARCHITECTURE.md`
(Phase 3). Driver math (Stage 0) and the selector (Stage 1) already shipped.

**Prereqs:** Blender with the HumGen3D addon installed, a saved `.blend`
(scripts write the GLB next to it), and the system console open (Blender →
Window → Toggle System Console) so you can read the per-key Δ prints.

The scripts are parameterized and gated; the **only** thing that needs a live
Blender session to finalize is confirming HumGen's LiveKey names (§3.6).

---

## 0. §3.6 — Confirm the mass/fat LiveKey names (do this first)

HumGen LiveKey names vary by version, and the `body_mass` recipe must be
**distinct from `bf_high`** (which uses `overweight`).

1. In Blender Scripting, open `list_livekeys.py`, set `GENDER="male"`, Alt+P.
   Repeat with `GENDER="female"`. It writes `~/alki_livekeys.txt` and prints a
   **§3.6 MASS / FAT CANDIDATES** list to the console.
2. From that list pick:
   - **`body_mass` sources** — regional fat keys (belly / stomach / love-handle
     / waist), NOT `overweight`. These give the gross soft-tissue envelope.
   - **heavy-base background** — the macro(s) that make the rest pose heavy
     (likely `overweight`, optionally stacked with a belly/weight macro).
3. Open `build_humgen_body.py` and edit the two clearly-marked slots:
   - `ALKI_FROM_LIVEKEYS["body_mass"]` (the `§3.6 CONFIRM` line)
   - `HEAVY_BACKGROUND_LIVEKEYS`
   Any name that's wrong prints `WARN: livekey ... not found` on build.

---

## 1. Stage 2 — Female lean base (closes the no-female-avatar bug)

1. `build_humgen_body.py`: `GENDER="female"`, `BODY_TYPE="lean"`. Alt+P.
   → writes `alki_humgen_female_lean.glb` next to the `.blend`.
2. Move it to `public/`.
3. Verify: `python blender_scripts/check_glb.py public/alki_humgen_female_lean.glb lean`
   Must reach **all §3.7 gates pass** (14 keys, body_mass↔bf_high cosine low,
   body_mass disp in band, chest≠legs, placeholders flat, neck stable).
4. Slim: `node blender_scripts/slim_all_bases.mjs` (in-place, morph-guarded).
5. Turn the base on in `src/app/lib/selectBaseMesh.js` → `AVAILABLE_BASES`:
   uncomment `female_lean: "/alki_humgen_female_lean.glb"`.
6. In-app: a female profile loads it with console `morphMode: "shape_keys"`
   and renders a female body. **← Stage 2 verify gate. STOP for sign-off.**

---

## 2. Stage 3 — `body_mass` + heavy bases (M+F) + muscle re-sculpt

Build the remaining three, plus **re-export `male_lean`** (the current
`alki_humgen_male.glb` has no `body_mass` and old muscle scale):

| run | GENDER | BODY_TYPE | output |
|----|--------|-----------|--------|
| a | male   | lean  | `alki_humgen_male_lean.glb`   |
| b | male   | heavy | `alki_humgen_male_heavy.glb`  |
| c | female | heavy | `alki_humgen_female_heavy.glb` |

(female_lean from Stage 2 already has `body_mass` + the rescale — rebuild it
too only if you change the recipe.)

For each: edit `GENDER`/`BODY_TYPE`, Alt+P, move to `public/`, then
`python blender_scripts/check_glb.py public/<file> <lean|heavy>`.

**Tuning levers** (in `build_humgen_body.py`), tune after reading the printed
max Δ per key:
- `MORPH_SCALE["body_mass"]` → hit the disp band (lean 0.18–0.25, heavy
  0.10–0.15). The verifier's `[5]` check enforces it.
- `_MUSCLE` (muscle scale) → `muscle_overall` max ~0.05. Verifier `[6]`.

**In-pair vertex identity (§3.4 / §4.5):** run `check_glb.py` on a pair and
compare the printed `vertices:` count — the male pair must both be **26575**;
each female file must equal its female partner. If the female heavy topology
diverges from female lean, switch to spec §3.4 approach-2 (heavy-from-lean on
shared female topology).

Then slim all: `node blender_scripts/slim_all_bases.mjs`.

Turn the bases on in `selectBaseMesh.js` `AVAILABLE_BASES` (uncomment
`male_heavy`, `female_heavy`, and repoint `male_lean` →
`/alki_humgen_male_lean.glb`).

### ⚠️ Driver bridge removal (do this WITH Stage 3, in the same commit)

Stage 0 folds `body_mass` into `bf_high` so the *current* mesh (no `body_mass`
key) shows heaviness. Once the bases HAVE a real `body_mass` key, the renderer
drives it directly — keeping the bridge would **double-count**. Set the bridge
to 0 in both driver paths:
- `src/app/engine/mapToMorphs.js` → `BODY_MASS_TO_BF_HIGH = 0`
- `src/app/lib/morphTargets.js` → `BM_TO_BF_HIGH = 0`

(Leave `bf_high`'s relative term intact — only the body_mass→bf_high bridge
fraction goes to 0.)

**Stage 3 verify gate:** all four files pass `check_glb.py` `<type>`; visual
A/B (§3.7 #10) shows `body_mass` 0→1 grows the body believably (belly
low+forward, limbs proximal, face fuller), not spherically. **STOP for sign-off.**

---

## 3. Stage 4 — Renderer fit fix (separate, shell-only)

After the geometry ships, `Body3DAvatar.jsx`'s `scale = 1.7 / modelHeight`
still normalizes every body to the same height, cancelling the mass signal
(spec §4.6). That's Stage 4 — decouple height-normalization from mass so a
heavier morph occupies more frame, and recenter. Handled in a later thread.
