# SEED — Avatar Range: Verification & Help Layer (companion to S0–S4)

> **Thread type:** Claude **.ai + Filesystem MCP** (and Claude's own code sandbox). This is a
> **read-only help + verification thread** — it explains what each stage is doing in plain terms,
> and it independently **checks finished work against the actual repo bytes / GLB files**. It does
> **NOT execute** the avatar work: no edits to app code, no Blender driving, no commits, no git
> push. It reads, inspects, runs read-only reproductions in its own sandbox, and reports.
> **Paste this into a new Claude.ai thread whenever you want to understand a stage or verify it's
> actually done.**

---

## 0. How to use this thread

Two modes — just say which:

- **"Explain ___"** — plain-language teaching. *"Explain why we need two bases." "What does cosine
  LOW mean?" "What's the from-fresh-human rule?"* Answers are grounded in the real plan + the glossary
  (§7), pitched for someone learning the 3D side, no hand-waving.
- **"Verify S0" / "Verify S2" / "Check the male_heavy GLB"** — independent verification. The thread
  reads the relevant repo files (and, for GLBs, copies them into its own sandbox and inspects the
  bytes with a glTF reader), runs the stage's gate checklist item by item, and reports **PASS /
  FAIL / CAN'T-TELL with evidence** — never "looks fine, trust me."

**The standing rule for this thread:** verify on bytes, never on claims. If a stage's commit message
says "body_mass cosine LOW confirmed," that is not verification — re-measure it from the file. This
mirrors Alki's own principle and is the entire reason this layer exists.

What it can and can't run:
- **Pure-JS stages (S0, S1):** it can copy `engine/*.js` + `lib/morphTargets.js` into its sandbox
  and actually run them with Node to reproduce numbers (they're firewall-clean = standalone).
- **GLB stages (S2, S3):** it can copy a `.glb` into its sandbox and inspect it with a glTF reader
  (pip-install pygltflib/numpy) to independently reproduce the `check_glb.py` gates — vertex count,
  key names, per-key displacement, cosine between keys, neck-seam stability.
- **It cannot run Blender** — for anything that needs the live HumGen tool, it tells you what to run
  in the S2/S3 Blender thread and what the output should say.

---

## 1. The big picture in plain terms

**The bug:** a 185 lb and a 285 lb man (same height/frame, both 18% BF) rendered as nearly the same
avatar. Two separate failures stacked:
1. **No "how big is this person" channel.** The only thing that varied between two current bodies
   was a *muscle* signal — there was no independent **mass/adiposity** channel driven by actual
   weight. So the heavy man got drawn as a *bodybuilder*, not a *bigger person*.
2. **The muscle signal flattened out.** The 100 lb gap got squished into a tiny sliver at the top of
   a curve that was already maxed (sigmoid saturation — see glossary). Everyone above "natural max"
   pinned to the same value.

**The decision (C3, signed off 2026-06-04):** fix the math, and build **two base bodies per sex**
(lean + heavy) plus **one new morph key, `body_mass`**, instead of trying to stretch a single base
across the whole range. We proved (render 02/05 in `docs/phaseB_renders/`) that a single base pushed
heavy becomes a **forward beach-ball belly on thin limbs** — topologically intact but not a
believable heavy person. Two bases + a distributed `body_mass` key fixes that honestly.

**The five stages (this is the order, and the order matters):**

```
S0  Driver math      (Code, pure JS)     the "how big" channel + un-flatten the muscle curve
S1  Base selector    (Code, pure JS)     pick which body file a user gets, safely
S2  Lean bases       (Blender)           re-bake male_lean + female_lean (+ investigation)
       ── deploy / Austin tests ──
S3  Heavy bases      (Blender)           bake male_heavy + female_heavy
S4  Renderer fit     (Code, shell)       stop shrinking heavy bodies back to lean height
```

**The one rule that ended the trial-and-error era:** in Blender, **always start from a fresh
generated human.** Exporting a human *destroys* its morph system (it bakes-and-deletes the
"accumulator" key — proven in Phase B). Weeks of pain came from editing already-exported, already-dead
humans. Fresh human → set sliders → bake → export, once. (Glossary §7 explains the accumulator.)

---

## 2. Stage 0 — Driver math · *the "how big" channel + un-flatten the curve*

**Plain version:** add a real mass channel so the 285 lb man drives "big body" high and the 185 lb
man drives it low — regardless of muscle — and reshape the muscle curve so the difference between
two muscular bodies isn't crushed into a sliver. This is a **lens change** (how body stats map to
slider values), not a physiology change. What the engine *reports* (lean mass, body-fat %, ceilings)
must stay identical.

**Files that should have changed:** `src/app/engine/mapToMorphs.js` (live), `src/app/lib/morphTargets.js`
(fallback). **Nothing else.**

**Verify checklist:**
- [ ] `body_mass` exists in `MORPH_TARGETS` (`lib/morphTargets.js`): range `[0,1]`, default `0`,
  category `"adiposity"`.
- [ ] There's an **independent `body_mass` driver output** in `mapToMorphs.js`, computed from
  absolute adiposity relative to frame (BF% above neutral **plus** absolute fat mass) — *not* routed
  through the muscle channel.
- [ ] The **muscle sigmoid was reshaped**: the old `sigmoid((LBM/LBM_max − 0.7) × 8)` had its center
  and/or the `×8` steepness changed, and/or muscle magnitude now scales with absolute LBM.
- [ ] A **temporary `bf_high` bridge** exists (routes some `body_mass` into `bf_high` so the current
  mesh shows improvement) AND is clearly commented as a Stage-0 bridge to remove after S3.
- [ ] **IP untouched:** `engine/compoundVectors.js` and `lib/compoundMorphVectors.js` are byte-identical
  to before this stage. (The thread reads them and confirms no diff in the effect-vector numbers.)
- [ ] **Lens-only proof:** `simulate()`'s reported LBM / BF% / ceilings are unchanged.

**Independent reproduction (the thread can actually run this):** copy the engine + morphTargets JS
into the sandbox, run both profiles — **185 lb and 285 lb, 5'10", default wrist/ankle, 18% BF** —
through the patched mapper, and confirm the morph states are **visibly separated**: `body_mass`
divergent (heavy high / lean low), muscle weights **no longer both ~1.0**.

**Reference numbers for this case:** LBM 68.8 vs 106.0 kg · Casey-Butt ceiling 85.2 kg for *both*
(same frame) · lbmRatio 0.807 vs 1.244 · the *old* muscle output was 0.70 vs 0.99 (the broken
sliver). After S0 the two should spread apart meaningfully and the mass channel should diverge.

**What "wrong" looks like:** the two profiles still produce near-identical morph states; muscle still
pins both near 1.0; `body_mass` moves with muscle instead of independently; OR `simulate()` now
reports different LBM/BF% (means physiology was touched, not just the lens — that's a fail); OR any
change in `compoundVectors.js`/`compoundMorphVectors.js`.

---

## 3. Stage 1 — Base selector · *pick which body file a user gets, safely*

**Plain version:** a small pure function reads the user's **starting** stats and returns which of
the four GLBs to load. It must ship *before* the new GLBs exist without breaking anything — so it
falls back to whatever file is actually on disk.

**Files:** new `src/app/lib/selectBaseMesh.js`; two Supabase-load sites in `AlkiApp.jsx` (≈:3718,
≈:3812) changed away from `setAvatarUrl(saved.avatarUrl || DEFAULT)`.

**Verify checklist:**
- [ ] `selectBaseMesh(profile)` exists in `lib/`, is **pure** (no React/three.js/DOM imports), and
  **always returns non-null**.
- [ ] It keys off the **starting** profile (week-0 derivations), never the projected body.
- [ ] Lean-vs-heavy split is a single, isolated knob: heavy when **BF% ≥ ~25 (M) / ~32 (F)** (or a
  frame-relative BMI cutoff); else lean. Returns `/alki_humgen_{male|female}_{lean|heavy}.glb`.
- [ ] There's an **availability layer** that maps not-yet-built URLs to a present file so nothing
  404s (pre-S2: everything → current `/alki_humgen_male.glb`; after S2: `*_heavy` → matching lean;
  after S3: all real). It should be one-line-editable.
- [ ] The load sites no longer read `saved.avatarUrl` as the avatar source; `avatar_url` is reserved
  as the future "custom MAKE IT ME mesh" override (non-null = custom).
- [ ] App still boots; current avatar still renders; a **female** profile selects the female URL.

**Independent reproduction:** copy `selectBaseMesh.js` + `derivations.js` to the sandbox, run a grid
(lean M, heavy M, lean F, heavy F, incomplete) and confirm the URLs are correct and incomplete →
male-lean default.

**What "wrong" looks like:** a stored `avatar_url` still pins the avatar (existing users won't get
the new bodies; female users stay broken); the selector can return null/undefined; a not-yet-built
URL is returned with no fallback (404 / blank avatar); selector imports anything render-y (firewall
break).

---

## 4. Stage 2 — Lean bases · *re-bake male_lean + female_lean (with the HumGen investigation)*

**Plain version:** in Blender, build the two lean bodies fresh from HumGen, each carrying the full
14-key set (the 13 existing + the new `body_mass`), with the muscle keys re-sculpted stronger.
First, a short investigation pins down the exact slider recipe so nothing is guessed. The male base
is a **full replacement** of the old shipped GLB.

**This is Blender work — the thread can't run it.** It verifies the *outputs* (the GLB files + the
script changes) and tells you what the Blender thread's gate should have reported.

**Step-1 investigation should have produced (and you should be told):**
- The **`body_mass` lever stack** — distributed adiposity composed from `Belly Size` (belly depth,
  forward) + `Hips Size` (whole pelvis) + flank/limb-girth levers + mild face. *Not* a single
  `overweight` push (that's the beach-ball).
- The **heavy recipe** for S3: **male_heavy = `overweight ≈ 2.0`** (≈32.7% BF). And a **measured**
  female `overweight` value (~2.5–3.0 for ~30–34% BF) — because female `overweight` was never
  measured in Phase B.
- Confirmation that **bulk comes from per-region `* Muscles` levers + `Shoulder Width`, never the
  macro `muscular`** (which is a taper/cut that *shrinks* the body — Phase B §4.3).

**Script changes to confirm in `blender_scripts/`:**
- [ ] `build_humgen_body.py` has a `BODY_TYPE = "lean" | "heavy"` param and outputs
  `alki_humgen_{gender}_{type}.glb`.
- [ ] It bakes a `body_mass` key and adds `"body_mass"` to the canonical key list (14 keys).
- [ ] Muscle re-sculpt is done by **post-scaling the baked muscle offsets ×1.5–2** (target
  `muscle_overall` max ~0.05), not by driving the macro `muscular`.
- [ ] `COLOR_0` stripped; `export_skins=False`; `export_morph=True`; isolated-delta bake intact.
- [ ] `check_glb.py` has `body_mass` checks (cosine vs `bf_high` LOW; disp band; nonzero count).

**Per-base GLB gate — the thread verifies these directly from each `.glb`:**
- [ ] All **14 key names** present.
- [ ] **Vertex count recorded** as the male-pair contract (HumGen-native ~25,286, **not** the old
  26,575). Whatever the lean bake produced is the number S3's `male_heavy` must match.
- [ ] `muscle_chest` vs `muscle_legs` cosine **~0** (regional keys distinct — v3 regression guard).
- [ ] `body_mass` vs `bf_high` cosine **LOW** (proves `body_mass` is new geometry, not re-inflated
  `bf_high`).
- [ ] `body_mass` max displacement in **0.18–0.25** (lean band).
- [ ] `muscle_overall` max ~**0.05**.
- [ ] **Neck seam** (Y 1.51–1.53, X-width ~0.27) **unmoved** by every morph and identical across the
  pair.
- [ ] `water` / `abs_def` / `vascularity` still **flat (0)** — they're reserved placeholders.
- [ ] In-app it loads with console `morphMode: "shape_keys"` and all 14 keys found; ≤ ~5 MB post-slim.
- [ ] **Visual A/B (your eyes):** `body_mass` 0→1 grows the body **believably** — belly low+forward,
  limbs fuller proximally, face fuller — **not a sphere.** This is the honesty check the whole
  effort exists for.

**Outcome:** female users finally get a female body (closes the long-standing bug). Then **deploy and
let Austin test** before the heavy bases.

**What "wrong" looks like:** fewer than 14 keys; `body_mass` cosine vs `bf_high` is *high* (it just
re-inflated the old fat key — useless); `body_mass` disp tiny (~0.07 like the old `bf_high` — won't
read); `muscle_overall` still ~0.028 (re-sculpt didn't happen); neck seam moves under a morph (head
attach will break later); placeholders not flat; the lean male still 26,575 verts (old GLB wasn't
actually replaced); the `body_mass` 0→1 render looks like a balloon.

---

## 5. Stage 3 — Heavy bases · *bake male_heavy + female_heavy*

**Plain version:** build the two heavy bodies. The trick: **bake the heavy body into the rest pose
(Basis)** so `bf_low` carries it *down* toward lean and `body_mass` pushes *up* — each morph travels
half the distance, so neither end distorts. The heavy base's `body_mass` is a *shorter* push.

**Reuses S2's scripts.** Heavy recipe: **male_heavy = `overweight ≈ 2.0`** into Basis; **female_heavy
= the value measured in S2** (~30–34% BF). Within the coherent range (Phase B: `overweight` is fine
through ~5, breaks ~10), so the recipe is safely inside it.

**Per-base GLB gate (thread verifies from the `.glb`):**
- [ ] All 14 keys; `body_mass` vs `bf_high` cosine LOW; `muscle_overall` ~0.05; neck seam stable;
  placeholders flat.
- [ ] `body_mass` max displacement in **0.10–0.15** (heavy band — shorter push than lean).
- [ ] **In-pair vertex identity:** `male_heavy` vertex count **and order identical to `male_lean`**;
  `female_heavy` identical to `female_lean`. If a fresh heavy bake didn't preserve order, the Blender
  thread should have used **§3.4 approach-2** (derive heavy from the lean topology) — confirm which
  was used.
- [ ] Loads `morphMode: "shape_keys"`, all 14, ≤ ~5 MB.
- [ ] **Visual:** the heavy base reads as a believable heavier *person*; `bf_low` 0→1 slims it down
  believably toward lean.

**After S3:** remove the `*_heavy → lean` fallbacks from the S1 availability layer (heavy meshes now
real). All four bases live.

**What "wrong" looks like:** heavy `body_mass` disp out of band; in-pair vertex order mismatch (lean↔
heavy on one user will pop/tear when blending — the before/after product breaks); heavy base built by
just maxing `overweight` as a morph instead of baking into Basis (distorts at the lean end).

---

## 6. Stage 4 — Renderer fit · *stop shrinking heavy bodies back to lean height*

**Plain version:** the renderer currently scales every body to the same height, which *cancels* the
size difference — a heavier body gets shrunk back into the lean envelope. Fix it so a heavier morph
actually occupies more frame, anchored to real (engine) height, and recenter the avatar.

**File:** `src/app/avatar/Body3DAvatar.jsx` (a **shell** file — three.js is allowed here; firewall
rules don't apply, but still don't touch `lib/`/`engine/` or the IP files).

**Verify checklist:**
- [ ] `GLBAvatar.fit` no longer does a pure `scale = 1.7 / modelHeight` that flattens mass — scale is
  width-aware or anchored to a frame dimension from derivations.
- [ ] Avatar is **recentered** on morphed bounds ("not centered" item fixed).
- [ ] `morphMode: "shape_keys"` detection and **by-name** morph keying still work (the four bases
  depend on name-keyed influences).

**The whole-effort proof (your eyes):** `body_mass` 0→1 makes the silhouette **grow**; a heavy
profile renders **bigger than a lean one end-to-end**, not just wider; the original 185 vs 285 case
now reads as two clearly different-sized bodies; avatar centered; lean↔heavy before/after on one user
still reads as the same person changing size.

**What "wrong" looks like:** heavy still looks the same height/size as lean (fit still normalizing);
avatar off-center; morphs stop applying (name-keying broke).

---

## 7. Glossary (plain language, for the 3D side)

- **Shape key / morph / blend shape** — a saved "what moves where" offset on the body mesh. Slider at
  0 = base body; at 1 = full effect. Alki drives these to show transformations.
- **Vertex / vertex count / vertex order** — the points the mesh is made of. Two meshes can only blend
  cleanly if they have the **same points in the same order**. That's why lean↔heavy within a sex must
  match exactly (the "in-pair identity" gate).
- **Displacement (max disp)** — how far the *farthest* point moves at slider = 1, in mesh units (the
  body is ~1.8 units tall). Bigger = more visible. The old `bf_high` maxed at 0.068 (barely moved);
  `body_mass` targets 0.18–0.25 (lean) so it actually reads.
- **Basis / rest pose** — the body when every slider is 0. "Baking heavy into Basis" means the heavy
  body *is* the resting shape, so morphs push out from there in both directions.
- **Isolated-delta bake** — each key stores only *its own* change, not the whole body. The v3 bug
  baked nearly the whole body into every key (every key looked ~identical, cosine ~0.99). The v4 fix
  isolates them. The cosine checks guard against that bug returning.
- **Cosine between two keys** — a 0–1 similarity of "do these two keys move the body the same way."
  ~0 = unrelated (good: `muscle_chest` vs `muscle_legs`). LOW for `body_mass` vs `bf_high` = good
  (`body_mass` is genuinely new geometry). HIGH would mean `body_mass` just re-did the old fat key.
- **Name-keyed morphs** — the app finds morphs by **name**, not by position/index. This is why the
  four bases don't all need one shared vertex space across sexes — only the lean/heavy *pair* does.
- **The accumulator / `LIVE_KEY_PERMANENT` / from-fresh-human rule** — inside HumGen, every slider
  edit piles into one hidden "accumulator" key. **Exporting deletes it** — so an exported human can
  never be edited again (you get `KeyError: LIVE_KEY_PERMANENT not found`). Lesson: always build from
  a fresh generated human, bake once, export once. This single fact explains the whole prior struggle.
- **Neck seam** — the band (~Y 1.51–1.53) where a custom head will later attach. It must never move
  under any morph, or "MAKE IT ME" heads won't line up.
- **Sigmoid saturation** — an S-curve flattens at the top. The muscle driver ran on the flat part, so
  a huge weight difference (185→285) squished into a tiny output sliver (0.70→0.99) and everyone above
  "max" pinned to ~1.0. Reshaping it spreads that range back out.
- **Firewall** — `lib/` and `engine/` are pure JavaScript with **no** React/three.js/DOM imports, so
  they port to the iOS app untouched. Renderer (`avatar/`) is "shell" — render code lives there.
- **LBM** lean body mass · **BF%** body-fat percentage · **FFMI** fat-free mass index (lean mass
  normalized for height) · **Casey-Butt** a formula for a natural lifter's max lean mass given their
  frame (wrist/ankle). Two same-frame men share the same ceiling regardless of current weight — which
  is exactly why the old "lean vs ceiling" channel couldn't tell 185 from 285.

---

## 8. Master number reference (one place to check against)

| Thing | Value | Note |
|---|---|---|
| Neutral base height | **180 cm** | Phase B corrected the old "184" (that was the *commanded* value) |
| HumGen-native vertex count | **~25,286** | the contract for new bases |
| Old shipped GLB | 26,575 verts | **retired** — replaced wholesale |
| `overweight` → BF% | 1.0→24.3% · 2.0→32.7% · 3.0→39.1% | coherent to ~5, breaks ~10 |
| **male_heavy** recipe | `overweight ≈ 2.0` into Basis | ≈32.7% BF |
| **female_heavy** recipe | `overweight ≈ 2.5–3.0` | **measure first** — female untested in Phase B |
| `body_mass` max disp — lean base | **0.18–0.25** | must dwarf old `bf_high` |
| `body_mass` max disp — heavy base | **0.10–0.15** | shorter push from a heavy Basis |
| old `bf_high` max disp | 0.068 | the weak key that caused the ceiling |
| `muscle_overall` re-sculpt target | max **~0.05** | was 0.028; ×1.5–2 |
| Neck seam | Y **1.51–1.53**, X-width ~0.27 | stable across all bases, undeformed by all morphs |
| Key count | **14** (13 + `body_mass`) | every base exposes the same 14 names |
| Flat placeholders | `water`, `abs_def`, `vascularity` | = 0, reserved for a future material pass |
| Selector heavy threshold | BF% **≥ ~25 (M) / ~32 (F)** | the one tunable knob, isolated in `selectBaseMesh.js` |
| 185 vs 285 (5'10", 18%) | LBM 68.8 vs 106.0 · ceiling 85.2 both · ratio 0.807 vs 1.244 · old `mo` 0.70 vs 0.99 | the case S0 must separate |
| `muscular` macro | **taper/cut, NOT bulk** | reduces mass; FFMI peaks ~1.0 — never use it for muscle |
| File naming | `/alki_humgen_{male\|female}_{lean\|heavy}.glb` | four files |

---

## 9. Guardrails to check on every stage

- **IP files untouched:** `engine/compoundVectors.js`, `lib/compoundMorphVectors.js` — never modified
  by this work (it's geometry + driver-mapping only).
- **Firewall intact:** nothing in `lib/`/`engine/` imports React/three.js/DOM. Only `Body3DAvatar.jsx`
  (shell) may.
- **Contract held:** exactly **one** new key (`body_mass`); every base exposes the same 14 names.
- **Never pushed to git** by any execution thread — Dallas commits via GitHub Desktop.
- **Verified on bytes/renders**, never on a commit message or a tool's "success" line.

> Tell me a stage ("verify S2"), point me at a file or a `.glb`, or ask me to explain anything. I'll
> read the real thing and report PASS / FAIL / CAN'T-TELL with the evidence — I won't take a claim on
> faith, and I won't change anything.
