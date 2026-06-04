# HumGen3D — Phase B Report (Live Measurement)

> **Status:** Phase B complete. Live measurement on the actual install; no Alki code/content/model
> was built or changed. Throwaway artifacts only (renders in `docs/phaseB_renders/`).
> **Date:** 2026-06-04
> **Companion to:** `HUMGEN_PHASE_A_FINDINGS.md`, `HUMGEN_PHASE_A_APPENDIX_SUBSYSTEMS.md`
>
> **Environment (verified live):** Blender **5.1.2**, Python **3.13.9**, HumGen3D **v4.0.32**,
> content root `D:\Blender-HumGen-Paid\`. Matches Phase A provenance exactly.
> Measurement subject: `models\male\Caucasian\David.json` (the one male Caucasian preset present).
>
> **Method note (read first — it governs every number below):** all circumferences are the
> **convex-hull perimeter** of the body cross-section at a given height, after isolating the central
> (torso/limb) vertex cluster to exclude the A-pose arms. Convex-hull perimeter **slightly
> overestimates** a real tape measurement at concave regions (most at the waist), and two waist
> figures appear in this report — an **auto-detected waist** (narrowest torso ring in 0.48–0.60·H,
> used for Navy BF%) and a **fixed-slice waist circ@0.55·H** (used for lever calibration). They are
> internally consistent each within their own series but are **not** interchangeable absolute tape
> values. Treat all absolute cm as calibration anchors / relative deltas, not tailor measurements.
> Mass/FFMI come from signed mesh **volume × Siri density(BF)** — valid here only because the body
> mesh is watertight (confirmed, B3). All measurements taken with the **armature forced to REST**
> so pose does not bias cross-sections. Numbers are **David-preset-relative** at a **180 cm neutral
> base** (height keys zeroed, all macros zeroed) unless stated.

---

## 1. The four central unknowns — answered

### Q1 — Does the generation pipeline work on Blender 5.1? **YES.**
A fresh `Human.from_preset("models\male\Caucasian\David.json")` builds correctly (B4). It writes
`rig.HG.hashes` (`$hair, $pose, $outfit, $footwear`) and stamps `version (4,0,32)` without error —
i.e. the exact PropertyGroup dict-write that 5.0 was feared to have broken **succeeds**. Generation
is not broken on this install. **Implication: hand-baking starting GLBs to dodge a "5.1 can't
generate" problem is unnecessary — the problem does not exist.**

### Q2 — Do PropertyGroup dict-writes (the `sk_values`/`hashes` pattern) work on 5.1? **YES.**
`rig.HG.sk_values["x"] = 0.5` wrote, read back as `0.5`, and deleted cleanly; `rig.HG.hashes["x"]`
write also succeeded (B2). **This rules out hypothesis H3** (the Blender-5.0 IDProperty-breakage
theory) as the cause of the setter error. Value bookkeeping is intact on 5.1 (corroborated by the
exact Belly Size round-trip in B5).

### Q3 — Root cause of `KeyError: "Key 'LIVE_KEY_PERMANENT' not found"`? **H1 — PROVEN.**
The block is destroyed by **export** (and by modifier-apply / LOD), exactly per Phase A
`export.py:68–91`. Proof chain (B8 → B1):
1. Before export, the body carries `Male`, `LIVE_KEY_PERMANENT`, `LIVE_KEY_TEMP_` (+ correctives,
   eyeLook).
2. `human.export.to_glb(...)` succeeds, and **afterwards those three blocks are gone** — only
   `Basis`, 12 `cor_*`, and 8 `eyeLook*` remain.
3. The API's body pointer (`rig.HG.body_obj`) still points at the *same* scene body — so this is
   **not** H2 (wrong-object). The block is genuinely gone, not hiding on another mesh.
4. The very next `keys["overweight"].value = 0.5` raises **`KeyError: "Key 'LIVE_KEY_PERMANENT'
   not found"`** — the exact observed error.
Combined with Q2 (dict-writes fine → not H3), the cause is **H1 and only H1**: any human that has
been exported (or duplicated from / modifier-applied like one that was) can never accept a livekey
write again.

### Q4 — Does anything still drive the mesh on a key-stripped (post-export) human? **Partly.**
- API livekey writes: **NO** — `value =` raises the H1 KeyError.
- `keys.update_human_from_key_change()`: **NO** — same KeyError (it reads `permanent_key` for the
  armature refit at `height.py:146`). So after export you cannot refit the skeleton via the API
  either.
- `livekey.to_shapekey()` **bypass: YES** — on the stripped human it still created
  `b_{main}_overweight` and is drivable. `load_from_npz` and raw numpy-decode + `foreach_set`
  (B10) are in the same bypass class. **Caveat:** these move only the mesh; bones/eyes/teeth/
  clothing do **not** follow, because the refit path needs the (now-absent) permanent key.

---

## 2. B1–B10 results

| # | Result | What it establishes |
|---|--------|---------------------|
| **B1** | **PASS (H1 reproduced)** | Post-export setter raises the exact `LIVE_KEY_PERMANENT` KeyError. |
| **B2** | **PASS** | `sk_values`/`hashes` dict-write+readback+delete all OK on 5.1 → rules out H3. |
| **B3** | **PASS** | Body = **25,286 verts** (matches Phase A). Up-axis **Z**. **Watertight** (0 boundary, 0 non-manifold edges; 50,608 edges) → volume→mass method valid. 102 Rigify-style bones. A-pose (hands at X≈±0.463). Healthy human has `LIVE_KEY_PERMANENT`. |
| **B4** | **PASS** | Fresh `from_preset` builds on 5.1; `hashes` written; version (4,0,32). |
| **B5** | **PASS** | Belly Size 0→1→0 round-trips **exactly** (waist 81.7→87.6→81.7, round-trip error 0.0 cm; `sk_values` bookkeeping correct). All four sanctioned drive paths work on a healthy human. |
| **B6** | **PASS (corrects Phase A)** | True neutral base = **180.02 cm**, not 184. Both height keys perfectly linear. See §4.1. |
| **B7** | **PASS** | Morphs are **additive and order-independent** (max vertex diff 0.00045 mm between orders) and **ungated** (overweight=1 + muscular=1 yields both effects). |
| **B8** | **PASS** | GLB export on 5.1 succeeds and **bakes+removes** Male/LIVE_KEY_PERMANENT/LIVE_KEY_TEMP_ (destructive, confirmed). |
| **B9** | **PASS** | `to_shapekey()` → real block **`b_{main}_overweight`** (literal braces), slider ±2.0, drives the mesh (waist 85.1→105.2; max vertex move 6.81 cm). |
| **B10** | **PASS** | Raw npz decode == official pipeline within **0.0004 mm** (below the npz's 4-dp storage precision). Same 23,748 verts moved, same 6.806 cm max move. |

---

## 3. Which drive-paths work on this install

Verified working on a **healthy** human (B5): (A) `livekey.value = x`; (B)
`keys.set_from_dict({...})`; (C) `set_without_update(x)` ×N + one `update_human_from_key_change()`;
(D) UI path `as_bpy().value`. All four route through `permanent_key`.

Verified working on a **stripped/exported** human (Q4): **only** the bypass class —
`livekey.to_shapekey()`, `keys.load_from_npz()`, raw numpy decode + `foreach_set` — and these do
**not** refit bones/eyes/teeth/clothing.

Practical reading: the permanent-key paths are the "normal" API and they are fully functional **as
long as the human has never been exported/modifier-applied**. The bypass paths are the only thing
that survives a strip, at the cost of automatic skeleton/accessory refit.

---

## 4. Calibration tables

> All at the 180 cm neutral base, David proportions, REST pose. `bf%` = Navy BF from
> auto-waist+neck; `waist` in the macro tables is the auto-detected waist; mass/FFMI from
> watertight volume × Siri density.

### 4.1 Height (B6) — **corrects Phase A**
- **True neutral base** (`height_150 = height_200 = 0`, `Male = 1`) = **180.02 cm**. Phase A's
  source-derived "184 cm base" is the *commanded* value HumGen maps to, not the resulting mesh
  height.
- `height.set(cm)` **overshoots** the true mesh height by up to ~4 cm near mid-range
  (`set(184)` → 180.0 mesh), shrinking to <0.5 cm at the extremes.
- Both keys are **perfectly linear** in mesh height — formula-free maps:
  - `mesh_cm = 180.02 − 30.38 · height_150`  (value 1.0 → 149.64 cm)
  - `mesh_cm = 180.02 + 19.52 · height_200`  (value 1.0 → 199.54 cm)
- **Quirk:** `height.set()` does not zero the opposite-branch key when crossing the 184 boundary →
  residual drift on repeated cross-boundary sets. From a clean state each individual set is correct.
- Height readback: mesh bbox Z == rig bone-span == HumGen `.centimeters` (validated 3 ways).

### 4.2 Fat macros (`overweight`, `skinny`)
`overweight` (lever → bf% / auto-waist cm / mass kg / FFMI):

| value | bf% | waist | mass | FFMI |
|---|---|---|---|---|
| 0.0 | 13.1 | 85.1 | 78.4 | 21.0 |
| 0.25 | 15.3 | 89.8 | 83.2 | — |
| 0.5 | 17.9 | 94.8 | 88.1 | — |
| 0.75 | 21.0 | 99.9 | 93.1 | — |
| 1.0 | 24.3 | 105.2 | 98.1 | 22.9 |
| 1.5 | 29.1 | 113.7 | 109.0 | — |
| 2.0 | 32.7 | 120.8 | 120.8 | 25.1 |
| 3.0 | 39.1 | 135.2 | 146.6 | 27.6 |

Roughly **+11 BF points and +5–6 cm waist per unit**; need `overweight ≈ 2–3` to span 30 %+ BF.

`skinny` (lever → bf% / waist / mass / FFMI):

| value | bf% | waist | mass | FFMI |
|---|---|---|---|---|
| 0.5 | 7.3 | 75.3 | 65.9 | — |
| 1.0 | 0.0(floor) | 65.8 | 54.7 | 16.9 |
| 1.5 | 0.0 | 56.7 | 44.0 | 13.6 |
| 2.0 | 0.0 | 47.3 | 34.8 | 10.8 |

`skinny` drives Navy BF to its 0 % floor by value 1.0 and keeps removing mass; ≥2 is starvation
geometry (see §5).

### 4.3 The macro `muscular` lever — **does not behave like "add muscle"**
`muscular` (lever → bf% / waist / chest-depth / shoulder-breadth / mass / FFMI):

| value | bf% | waist | chest-d | shoulder-b | mass | FFMI |
|---|---|---|---|---|---|---|
| 0.0 | 13.1 | 85.1 | 24.1 | 48.0 | 78.4 | 21.0 |
| 0.5 | 7.1 | 79.0 | 24.1 | 49.5 | 76.1 | 21.8 |
| 1.0 | 0.1 | 73.0 | 24.2 | 49.7 | 74.1 | 22.8 |
| 1.5 | 0.0 | 67.7 | 24.3 | 49.8 | 71.2 | 22.0 |
| 2.0 | 0.0 | 62.9 | 24.3 | 50.0 | 68.5 | 21.1 |
| 3.0 | 0.0 | 54.7 | 24.6 | 50.3 | 63.8 | 19.7 |

It **sharply narrows the waist** (85→55 cm), barely moves chest depth (+0.6 cm over the whole
range) and shoulder breadth (+2.3 cm), and **net-reduces volume and mass** (73→58 L; 78→64 kg).
FFMI **peaks at value ≈1.0 (22.8) then declines**. It is a **lean / V-taper / "cut" morph, not a
hypertrophy morph.** (It also drives Navy BF to a 0 % floor by value 1.0, because waist−neck
collapses — so BF% is not a meaningful readout under this morph; see §5.)

### 4.4 Torso levers (lever value → primary dimension; baseline in row 0)
Baseline (neutral): waist-circ@0.55 = 91.1, waist W/D = 32.5/24.2, chest-depth@0.68 = 24.1,
chest-breadth@0.68 = 32.5, shoulder-breadth@0.80 = 48.0, hip-circ@0.50 = 96.0, armL = 45.1,
thighL = 59.8 (cm). UI soft range is −1..1; values shown to +2 to expose slope.

| lever | drives (primary) | v=−1 | v=1 | v=2 | notes |
|---|---|---|---|---|---|
| **Belly Size** | waist **depth** (Y) + waist circ | circ 89.0 / D 20.2 | circ 95.5 / D 28.4 | circ 101.3 / D 32.5 | belly is depth-driven; bleeds into chest-depth |
| **Waist Thickness** | lower-ribcage / chest depth+breadth | — | chest-d 26.0 / chest-b 33.8 | chest-d 28.0 / chest-b 35.1 | barely touches the actual waist circ (91.6/92.2) |
| **Shoulder Width** | shoulder breadth | sb 44.2 | sb 51.7 | sb 55.5 | **clean, isolated; ≈ +3.76 cm/unit** |
| **Chest Width** | chest depth + breadth | chest-d 21.7 / chest-b 28.0 | chest-d 26.5 / chest-b 36.1 | chest-d 28.8 / chest-b 39.7 | slight arm-circ reduction |
| **Hips Size** | whole pelvis (waist+hip+thigh) | waist 77.2 / hip 86.3 | waist 105.2 / hip 106.6 | waist 119.4 / hip 117.6 | scales waist, hip and thigh together |
| **Chest Height** | vertical chest position | chest-d 23.6 | ≈inert | chest-d 24.3 | near-zero effect on circumferences |

### 4.5 Per-region muscle levers — region-isolated and additive
Each adds bulk only to its target region (values 0 → 1 → 2 unless noted):

| lever | measured dimension | 0 | 1 | 2 |
|---|---|---|---|---|
| **Biceps** | upper-arm circ @0.70 | 45.1 | 45.8 | 46.6 |
| **Triceps** | upper-arm circ @0.70 | 45.1 | 47.8 | 50.2 |
| **Shoulder Muscles** | shoulder breadth @0.80 | 48.0 | 51.1 | 52.7 |
| **Back Muscles** | chest depth @0.68 | 24.1 | 24.8 | 25.8 |
| **Quad Muscles** | thigh circ @0.45 | 59.8 | 61.1 | 62.7 |
| **Calves Muscles** | calf circ @0.22 | 36.4 | 37.9 | 39.4 |
| **Chest Muscles** | pec depth @0.76 (peak) | 25.6 | — | 27.0 |
| **Traps Muscles** | neck-base circ @0.86 | 46.8 | — | 64.5 |

Notes: muscle-lever names carry a `" Muscles"` suffix (`Chest Muscles`, `Shoulder Muscles`, etc.)
except `Biceps`, `Triceps`, `Forearm *`. **Chest Muscles** acts at ~0.74–0.76·H (upper pec), not
mid-chest; **Traps Muscles** acts at ~0.86·H (neck base) and is the strongest single-region morph
measured. These are the **real hypertrophy levers** (contrast the macro `muscular`, §4.3).

### 4.6 Range extremes (where the mesh breaks)
| config | height | waist | bf% | mass | FFMI | verdict |
|---|---|---|---|---|---|---|
| `overweight=3` | 180 | 135 | 39 | 147 | 27.6 | coherent |
| `overweight=5` | 180 | 165 | 49 | 207 | 32.2 | coherent (render 02) |
| `overweight=10` | 180 | *38* | — | — | — | **BROKEN — self-intersection** (render 03) |
| `muscular=5` | 180 | 44 | floor | — | — | emaciated caricature; wrong direction |
| `skinny=2` | 180 | 47 | 0 | 35 | 10.8 | starvation geometry |
| `skinny=5` | 180 | 33 | 0 | 13 | 4.0 | non-physical (neck 17.8 cm) |
| LARGEST (`ow5`+all muscle/shoulder `2`) | 180 | 165 | 49 | 227 | 35.4 | coherent (render 05) |
| SMALLEST (`skinny2`+`h150=1`) | 149.6 | 36 | 0 | 27 | 11.9 | coherent (render 06) |

**Usable ranges:** `overweight` coherent through ~5, catastrophic self-intersection by 10 (the
`overweight=10` cross-section inverts → the auto-waist reads a nonsense 38 cm and volume balloons to
424 L; visually the mesh explodes). Realistic obese range 0–3. `skinny` realistic 0–1 (≥2 is
starvation). `muscular` useful only ≤~1 (it shrinks past that). Renders for each are in
`docs/phaseB_renders/` (01 neutral, 02 ow5, 03 ow10-broken, 04 muscular2, 05 largest, 06 smallest).

---

## 5. Confirmations / corrections of Phase A

**Confirmed:**
- Exact vertex count **25,286**; up-axis Z; topology watertight (volume method valid).
- Morphs are sparse npz; the **empirical decode is byte-exact** to the official pipeline (B10:
  ≤0.0004 mm). npz format: `indices` int64 shape `(1, N)`, `relative_coordinates` float64 `(N,)`,
  4-dp rounded; for `male_overweight` N=62,159, max index 75,857 (= 25,286·3 − 1).
- `to_shapekey()` block name is literally **`b_{main}_overweight`** (curly braces are part of the
  serialization format), slider ±2.0 (B9).
- **Export is destructive** to Male/LIVE_KEY_PERMANENT/LIVE_KEY_TEMP_ (B8) — this **is** the H1
  mechanism behind the KeyError (B1).
- Morphs are additive, order-independent, ungated (B7). Drive-path inventory (B5).
- Bone-follows-mesh: the rig refit and clothing re-deform run off `update_human_from_key_change`,
  which itself depends on the permanent key (hence the post-export refit failure, Q4).

**Corrected:**
- **Neutral base height is 180.0 cm, not 184 cm.** The 184 figure is the commanded value in
  HumGen's piecewise mapping, not the resulting mesh height; `height.set()` overshoots the mesh by
  up to ~4 cm mid-range (§4.1).
- The **macro `muscular` lever is a lean/taper morph, not a mass morph** — it reduces volume and
  mass and peaks FFMI at value ≈1 (§4.3). Phase A listed it among "main body macros" without this
  behavioral characterization; real hypertrophy lives in the per-region `* Muscles` levers (§4.5).

**Measurement caveat established:** Navy BF% is only physiologically meaningful in the
**fat-driven** regime. Any morph that artificially narrows the waist relative to the neck
(`muscular`, `skinny`) drives the Navy formula to its 0 % floor — an artifact, not a real body-fat
reading. Mass/FFMI from mesh volume are sound while the mesh stays coherent (i.e. not at the broken
extremes in §4.6).

---

## 6. Updated open questions

1. **Cross-gender morph basis** (Phase A Q5): not tested this phase — apply `Belly Size` to a
   female human and compare displacement fields to confirm which deltas are gender-specific vs
   shared. (Low risk; Alki is male-first.)
2. **Exact `overweight` break threshold** between 5 and 10 (and the same for `muscular`/`skinny`
   downward) — only bracketed here, not bisected. Bisect if a hard clamp value is ever needed.
3. **`Chest Muscles` / `Traps Muscles` full profiles** — measured at their peak slices only
   (0.76·H and 0.86·H); a full z-profile per region would tighten the per-region calibration if
   regional morph authoring is ever pursued.
4. **`muscular` interaction with per-region levers** — whether stacking `muscular` (taper) with
   `* Muscles` (bulk) reproduces a realistic lean-muscular look, or whether the taper fights the
   bulk. Additivity (B7) predicts they sum, but the combined aesthetic is unmeasured.
5. **`set_from_dict` vs height keys** — `set_from_dict` does not drive `height_150/height_200`
   (they are managed specially); confirmed incidentally, not exhaustively characterized.
6. Cosmetic Phase A leftovers (`livekeys\special\Main\` empty; height npz duplicated in two
   folders) — unchanged, still cosmetic.

---

## 7. Strategy-relevant facts (facts only — no recommendation)

- **5.1 generation is fully functional** (Q1/Q2/B4). No 5.1-specific blocker exists for building
  or driving humans; the only failure mode is post-strip (export/modifier-apply), which is H1.
- **The KeyError is entirely explained by H1** and is deterministic: it occurs **iff** the body
  has been exported/modifier-applied/LOD'd (permanent key baked away). A never-exported human
  drives cleanly on every sanctioned path.
- **Two morph regimes for an avatar exist on this install:** (a) the live HumGen human (all drive
  paths, full refit) before any export; (b) a stripped mesh (e.g. an exported GLB or its
  re-import) where only the bypass paths move the mesh and nothing refits the skeleton/accessories.
- **Lever semantics, measured, not assumed:**
  - Fat: `overweight` ≈ +11 BF pts & +5–6 cm waist per unit (coherent 0–~5); `skinny` floors BF by
    value 1 and removes mass (coherent 0–1).
  - **`muscular` (macro) = taper/cut, not bulk** (reduces mass/volume; FFMI peaks at ~1).
  - **Bulk/hypertrophy = the per-region `* Muscles` levers + `Shoulder Width`**, each region-
    isolated and additive (Shoulder Width ≈ +3.76 cm breadth/unit; Triceps the biggest arm driver;
    Traps the biggest single-region morph).
  - Height is a linear full-body morph (180.0 base) with a clean formula-free map; not a scale.
- **Alki's existing empirical npz decode is correct to sub-0.001 mm** (B10) — it is interchangeable
  with the official loader for read-only morph application.
- **`to_shapekey()` produces an export-survivable, drivable real shape key** (`b_{main}_<name>`,
  slider ±2) that works even on a stripped human, mesh-only (no auto refit).
- All body shape (incl. limb length) is vertex morphs with bones following the mesh; there is no
  scale/length lever, and the refit that makes bones follow depends on the permanent key.

*End of Phase B report. No strategy, base-model, or app-code work was performed — that is the
gate thread's scope.*
