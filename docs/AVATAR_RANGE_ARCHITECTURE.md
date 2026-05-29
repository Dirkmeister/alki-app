# Avatar Range Architecture — Multi-Base Mesh + Driver Fix

> **Status:** Design — signed off through Phase 4. Not yet implemented.
> **Scope:** The *geometry* the morph state drives (base meshes + shape-key system) and
> the *driver mapping* (physiological state → normalized morph weights). Does **not**
> touch compound effect vectors / engine IP numbers.
> **Source of truth for live state:** `CLAUDE.md`. Where this doc and `CLAUDE.md` disagree
> on structural facts, `CLAUDE.md` wins — but note this doc corrects two omissions in the
> current `CLAUDE.md` structure block (see §1.0).
> **Companion deliverable:** `AVATAR_RANGE_IMPLEMENTATION_SEED.md` (the executable thread).

---

## 0. The problem in one paragraph

A single base mesh driven by shape keys cannot honestly represent the full range of human
starting bodies. On record (Supabase feedback): a **185 lb and a 285 lb male produce
nearly the same avatar.** Two failures stack — a **driver-math** failure (weight never
reaches the avatar as an independent mass signal; it launders through a muscle channel that
saturates) and a **geometry** failure (one base topology morphed across 130→320 lb distorts
at the ends). This doc verifies both at the byte/formula level, chooses a strategy
(**Option C: lean + heavy base meshes per sex, plus one new `body_mass` morph key**), and
specifies the Blender build and the app integration.

---

## 1. Phase 1 — Verified current state

Everything in this section is cited to live files read on 2026-05-29, not to memory or
prior snapshots. Several findings **correct** the seed prompt's stated premises.

### 1.0 Premise corrections (important — these reframe the whole effort)

**(a) The live morph driver is `engine/`, not `lib/morphTargets.js`.** The seed prompt and
`AVATAR_PLATFORM_PLAN.md` state that profile→morph happens in `morphTargets.js` via
`baselineMorphState`. On the live path it does **not**. `AlkiApp.jsx` →
`resolveAvatarParams` (≈ line 451) runs `simulate()` → `mapToMorphs()` from
`src/app/engine/` as the **primary** path; the `morphTargets.js` `resolveMorphStates` call
is reached only in a `catch` fallback when the engine returns null (incomplete profile). So
the range-collapse bug as shipped lives in **`engine/mapToMorphs.js` + `engine/derivations.js`**.
Both paths collapse, for different reasons; both are addressed.

**(b) `CLAUDE.md`'s structure block omits the `engine/` folder.** `src/app/engine/`
(`simulate.js`, `mapToMorphs.js`, `derivations.js`, `compoundVectors.js`, `constants.js`)
is the live Eidolon engine. It is firewall-clean (pure JS) and should be treated as
core IP alongside `lib/` — read freely, modify only the *driver-mapping* outputs, never the
effect-vector numbers. **Action:** add `engine/` to the `CLAUDE.md` structure block.

### 1.1 The canonical key contract — 13 geometry + 2 material

Defined in `lib/morphTargets.js` (`MORPH_TARGETS`). The GLB bakes **13 geometry shape keys**;
2 further entries are material-only (no shape key).

**Geometry (13 shape keys on the GLB):**
`bf_low`, `bf_high`, `visceral`, `water`, `muscle_overall`, `muscle_chest`,
`muscle_shoulders`, `muscle_arms`, `muscle_back`, `muscle_legs`, `muscle_calves`,
`abs_def`, `vascularity`.

**Material (no geometry — applied in `Body3DAvatar.jsx`):**
`skin_tone_shift` (lerp toward `ALKI_SKIN_TAN`), `skin_quality` (roughness).

**Critical nuance (byte-verified):** of the 13 geometry keys, **`water`, `abs_def`, and
`vascularity` are baked FLAT** (0 nonzero verts — confirmed by direct GLB inspection;
`build_humgen_body.py` lists them in `ALKI_CUSTOM_PLACEHOLDERS`). The engine computes
weights for them, but on the production GLB they move no geometry. They are reserved for a
future material/normal-map pass. **Net: only 10 of the 13 geometry keys deform the live mesh.**
This effort leaves the 3 placeholders flat (material pass is out of scope).

### 1.2 How a profile becomes morph weights — and the exact 185/285 convergence

At a static "current" snapshot with both subjects at 18% BF, the **fat channels are both
zero**: `bf_low = 1 − BF/BF0 = 0` and `bf_high = (BF−BF0)/BF0 = 0` (they are defined
relative to the user's *own* baseline). So **everything distinguishing two current bodies
flows through the muscle channel.**

Live muscle driver (`derivations.js` → `mapToMorphs.js`):
```
mo (muscle_overall) = clamp(sigmoid((LBM / LBM_max_natural − 0.7) × 8), 0, 1)
LBM = W·(1−BF)
LBM_max_natural = Casey-Butt(height, wrist, ankle, BF%)   ← independent of weight at fixed frame
```

For a 5'10" male, default wrist/ankle, 18% BF — verified by re-running the live formulas:

| | 185 lb | 285 lb |
|---|---|---|
| LBM | 68.8 kg (FFMI 21.8) | 106.0 kg (FFMI 33.5) |
| Casey-Butt LBM_max | **85.2 kg** | **85.2 kg** (identical — same frame) |
| lbmRatio = LBM / LBM_max | 0.807 | 1.244 |
| `mo = sigmoid((ratio−0.7)×8)` | **0.70** | **0.99** |

The two do **not** produce the identical avatar on the live path — but the 100 lb difference
compresses into a **0.29 morph-weight sliver, entirely inside the saturating shoulder of the
sigmoid** (0.70→0.99), where the shape key is already near full influence and visually
flattening. Anyone at/above natural max pins to `mo ≈ 1.0`. The mass that should read as a
**bigger body** has nowhere to go — there is **no independent total-mass / adiposity-volume
channel driven by absolute weight.** The heavy man isn't clamped; he's **modeled as a
bodybuilder**, because the only mass channel available is "lean mass vs muscle ceiling."

**Fallback path (`morphTargets.baselineMorphState`)** collapses harder:
`muscle_overall = clamp((FFMI − 16.5)/16, 0, 1)` → 185 lb = 0.329, 285 lb = **1.000**
(clamped). Above FFMI ≈ 32.5 every body pins to maximum. Also has no absolute-mass channel.

**Two stacked failures, confirmed with corrected location:**
1. **Driver math** — no independent mass/adiposity channel; the mass signal saturates in the
   Casey-Butt-ratio sigmoid (live) or the FFMI map (fallback). *Fixable in `mapToMorphs.js`
   + `morphTargets.js`.*
2. **Geometry ceiling** — `bf_high` (the only live "heavy" key) is a HumGen `overweight`
   morph with **max displacement 0.068** on a 1.8-unit-tall mesh. It cannot honestly cover
   130→320 lb. *Requires the mesh strategy below.*

### 1.3 What the production GLB actually contains (byte-verified)

`public/alki_humgen_male.glb` — **4.35 MB** (the adjacent 17 MB `_slim` variant is a stale
intermediate flagged for deletion).

- Node name **`Female_Body_Default`** — the "male" GLB carries a female *node label*
  (artifact of the bake starting from HumGen female Basis, then writing the male body into
  Basis). Cosmetic, but be aware which is which during the female build.
- **No rig.** `skins: 0`, no `JOINTS_0`/`WEIGHTS_0` — contradicts the platform plan's
  "skins exported." The shipped mesh is **static**. Good news: no joint-correctives needed;
  cross-base consistency is about **key names + vertex order + proportion only**.
- **26,575 vertices / 50,568 triangles** (≈2× the "~26k polys" the platform plan cited —
  it conflated verts and polys). This is the real mobile budget; new bases target it ±10%.
- **`COLOR_0` present** — vertex colors still in the mesh (renderer disables them). Strip on
  rebuild to save bytes.
- Generated by `build_humgen_body.py` (v4): HumGen male preset → LiveKey→Alki key map →
  **isolated-delta bake** (`basis + (deformed − neutral)`, the v4 fix for the v3 bug where
  every muscle key ≈ whole body, cosine 0.99) → rebase onto male neutral → strip
  non-canonical keys + materials. Export: `export_morph=True`, `export_materials="NONE"`,
  `export_skins=True` (but no skin survives — set explicitly False on rebuild).

Per-key displacement (byte-measured, max / mean on the 1.8-unit mesh):
- `bf_high` **0.068** / 0.0038 ← the *only* "heavy" key, and it barely deforms
- `bf_low` 0.044, `visceral` 0.045 (sparse, 3,815 verts)
- `muscle_overall` **0.028**, `muscle_chest` 0.010, `_shoulders` 0.015, `_arms` 0.017,
  `_back` 0.016, `_legs` 0.017, `_calves` 0.009 ← muscle high-end is under-sculpted
- `water` / `abs_def` / `vascularity` = **0** (flat placeholders, confirmed)
- **Neck seam:** narrowest upper band ≈ Y 1.51–1.53, X-width 0.27 → head-attach reserve;
  must stay positionally stable across all bases and be undeformed by every morph.

### 1.4 Renderer fit/scale/centering — and how it masks size

`Body3DAvatar.jsx` → `GLBAvatar.fit` computes a bounding box, then
**`scale = 1.7 / modelHeight`**, floors feet at y=0, centers x/z. Mode detection: shape keys
present **and** `morphState` passed → `morphMode: "shape_keys"`; else `"legacy_scale"`
(Avaturn-era X/Z scaling from `fat`/`muscle`). The renderer keys morphs by **name** (per-mesh
`morphTargetDictionary` scan), **not global index** — important for the multi-mesh plan (§4.5).

**Problem for the range goal:** the fit **normalizes every body to 1.7 units tall regardless
of mass**, so a heavier morph is scaled back into the same vertical envelope as a lean one,
cancelling the overall-size signal. Width-only morphs then carry 100% of the size difference.
Any range fix must address fit scaling, not just morph weights. (Also an open "avatar not
centered" item to resolve in the same pass.)

### 1.5 How `bodyUrl` resolves today

There is **no `bodyUrl` field in live code** — the `{ bodyUrl, headUrl, morphState,
materialParams }` seam in `AVATAR_PLATFORM_PLAN.md` is **reserved, not implemented**. Live
equivalent is a flat string `avatarUrl`:
- `DEFAULT_AVATAR_URL = "/alki_humgen_male.glb"` (AlkiApp.jsx:28).
- `const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL)` (:3620).
- Supabase load: `setAvatarUrl(saved.avatarUrl || DEFAULT_AVATAR_URL)` (:3718, :3812).
- `avatar_url` persisted in Supabase as a **raw string**; a `localStorage` mirror
  (`alki_avatar_url`) is read on mount (test-harness leftover).
- **Every `setAvatarUrl` write** is either `DEFAULT_AVATAR_URL` or a stored value that itself
  originated as the default — the only user-specific write (line 3769) is gated behind
  `AVATURN_ENABLED`, which is **off** in production. So `avatar_url` carries **no
  irreplaceable user data today** → migration is clean (§4.4).

A mesh-selection decision therefore lives as a **new pure function in `lib/`** that returns
the body URL from the user's *starting* profile, called where `DEFAULT_AVATAR_URL` currently
resolves, populating the reserved `bodyUrl` slot of the seam.

---

## 2. Phase 2 — Design space & recommendation

### 2.1 The hard constraint that bounds everything

A shape key is a per-vertex offset on one base topology — honest near the base, degrading at
range. Real bodies at the extremes differ by **volume distribution and proportion**, not
displacement; a 130 lb and a 300 lb body don't share an interpolable edge flow. For this
mesh specifically, the only "heavy" geometry is `bf_high` (HumGen `overweight`, max disp
0.068 — roughly a +30–40 lb sculpted intent), and it is the *only* live key carrying "heavy."
Pushed past its intent it inflates spherically rather than reading as a heavier *person*.

### 2.2 Two distinct range failures (they need different fixes)

1. **"Heavy looks jacked"** — mass with no adiposity channel; a 285 lb non-lifter and a
   285 lb bodybuilder render almost identically near max muscle. *Missing-channel problem.*
2. **"Everyone above average converges"** — sigmoid saturation; the entire 185→285 difference
   is a 0.29 sliver on the flat top. *Curve-shape problem.*

### 2.3 Options matrix

| | A — Single base + math | B — Mesh grid (6–8) | C — Hybrid (2+2 bases + `body_mass`) |
|---|---|---|---|
| Honest at lean–athletic (140–210 lb) | Yes | Yes | Yes |
| Honest at heavy extreme (250 lb+) | **No** — no geometry to drive | Yes | **Yes** |
| Fixes "heavy looks jacked" | Partial — math decouples, `bf_high` can't render it | Yes | **Yes** |
| Before/after stays one mesh (core product need) | Yes | **No** at zone crossings | Mostly (one morph, rare base switch) |
| Seam / discontinuity risk | None | **High** | Low (one seam, placed off common protocols) |
| Blender work | None | 6–8 full sculpts | 4 sculpts + 1 new key |
| Asset weight | 4 MB | 20–40 MB | ~12–16 MB |
| Migration | None | Required | Required (simpler) |
| Ships incrementally | Immediately | All-or-nothing | **Yes — math first, geometry staged** |
| Breaks 13-key contract | No | No | **Yes — +1 key** (justified) |

### 2.4 Industry reference (the techniques that ground the recommendation)

- **MakeHuman (HumGen's lineage)** drives the whole human range from **one** base via a small
  set of **independent, bidirectional macro targets** — gender, age, **muscle**, **weight**,
  height, proportion — each with min *and* max shape keys. **Weight and muscle are separate
  axes with separate geometry.** This validates a dedicated `body_mass` key *distinct from*
  muscle. (HumGen inherited this — `overweight` and `muscular` are separate LiveKeys; Alki
  just isn't exposing an honest dedicated mass key downstream.)
- **Bidirectional extremes** beat one-directional push — the heavy extreme deserves its own
  sculpted target, not the lean-fat morph's inverse.
- **Corrective / morph-controlled shape keys (Daz Genesis, iClone)** fix combination
  distortion via **multiplicative controllers that fire only when their parent morph is
  dialed in.** Alki is static (no posing → no joint-correctives yet), but the *combination*
  case applies (high `bf_high` × high muscle; mass-down meets muscle-up). Keep
  morph-controlled correctives in reserve — cheaper than a third base.
- The field does **not** ship a base mesh per body type for a *parametric* tool — that's a
  *game* technique for narrow-range hand-authored archetypes. Evidence **against** Option B's
  grid, **for** maximum mileage from better targets on fewer bases.

### 2.5 Recommendation: **full Option C**

Reasoning:
1. The **driver math** (Option A's content) is a hard dependency and ships first — it drives
   all four meshes; it is the foundation, not a lite version.
2. Math **alone provably cannot** reach honest at the heavy end (sigmoid analysis +
   `bf_high`-is-one-weak-HumGen-morph). MakeHuman confirms the fix is a **dedicated weight
   target** — the one justified contract exception.
3. **Two bases, not a grid** — halves each base's morph distance, leaves one seam (placed at
   a BF/mass band most 12-week projections don't cross), keeps the heavy lifting in a *morph*
   so slim-down projections stay one comparable mesh. Avoids B's seam-breaks-the-product flaw.
4. **Correctives are the reserve tool**, not a base substitute.
5. **Female bases included** — closes the no-female-avatar bug at the selection layer.

---

## 3. Phase 3 — Blender production spec

### 3.0 Governing constraints (byte-verified)

- **Vertex order + count is the contract, not a rig** (no skin). Consistency = identical key
  names + identical vertex count/order *within each lean/heavy pair* + matched proportions.
- **Tri budget:** 50,568 tris / 26,575 verts; all bases ±10%.
- **Neck seam Y 1.51–1.53, X-width 0.27** — stable across bases, undeformed by all morphs.
- **Displacement budget is too small at the heavy end** (`bf_high` 0.068); `body_mass` must
  dwarf it.
- **3 keys stay flat** (`water`/`abs_def`/`vascularity`).

### 3.1 The four bases

| Base | Centered at | Origin | Role |
|---|---|---|---|
| `male_lean` | ~12–15% BF, athletic | current male GLB, re-exported clean | default male; lean→athletic |
| `male_heavy` | ~28–32% BF, heavier frame | HumGen male, `overweight` baked into **Basis** | honest heavy male |
| `female_lean` | ~20–24% BF, athletic | `build_humgen_body.py` `GENDER="female"` | default female; closes bug |
| `female_heavy` | ~30–34% BF, heavier frame | HumGen female, `overweight` into Basis | honest heavy female |

**Key move:** the heavy base **bakes the heavy body into its Basis (rest pose)**. Its `bf_low`
then carries it *down* toward lean, its `body_mass` pushes *up*. Each morph travels half the
distance → neither distorts. This is MakeHuman's bidirectional-extreme principle applied at
the base-mesh level.

### 3.2 Shape-key set per base — 14 keys (13 existing + `body_mass`)

Every base exposes the **same 14 names**. The 13 keep current semantics; magnitudes below.

**`body_mass` — the load-bearing new key (exact sculpt spec):** real soft-tissue
distribution, **not** uniform inflation. On each base, "this person carries significant
additional adiposity":
- **Abdomen:** primary volume, forward (+Z) and lateral (±X), sitting **low and forward**
  (visceral + subcutaneous). Distinct from `visceral` (belly-forward only); `body_mass` adds
  the subcutaneous envelope around it.
- **Waist/flank:** love-handle fullness, lateral expansion at the iliac crest.
- **Chest:** males — soft low pectoral fat pad (not pec muscle); females — interacts with
  existing chest geometry naturally.
- **Limbs:** upper-arm + thigh girth (subcutaneous), tapering toward wrists/ankles
  (proximal fat distribution). **Do not** inflate the neck seam band.
- **Face:** mild cheek/jaw fullness — keep above the neck seam stable.
- **Posture:** very slight pelvic tilt / lumbar curve (optional, subtle).

**Displacement target:** lean base `body_mass` **max ~0.18–0.25** (≈3–4× the current
`bf_high` 0.068), mean ~0.02–0.03. Heavy base `body_mass` **max ~0.10–0.15** (shorter push
from an already-heavy neutral). These magnitudes are what survive the renderer's
height-normalization (also fixed in §4.6).

**`bf_high` retained** but demoted on the new bases to "mild fat above this base's neutral"
while `body_mass` carries the dramatic range — analogous to MakeHuman keeping both a weight
macro and finer regional fat targets. The driver blends `bf_high` (fine adiposity) with
`body_mass` (gross adiposity).

### 3.3 Muscle re-sculpt (CONFIRMED in scope)

`muscle_overall` maxes at only 0.028 — even a maxed muscle state barely deforms, compounding
the sigmoid problem. **Re-sculpt the muscle keys on all four bases to ~1.5–2× current
displacement** (target `muscle_overall` max ~0.05, regional keys proportional) so a
fully-driven body looks **built**. This is a *geometry* change only — normalized 0..1 weights
unchanged; weight=1.0 now means a larger, correct delta. Implement via post-scaling the baked
shape-key offsets by 1.5–2× (a vectorized multiply — exact and trivial) or by driving the
HumGen muscle LiveKeys above 1.0 where allowed.

### 3.4 Cross-base consistency (the hard part)

The renderer addresses morphs **by name**, so the four meshes do **not** all need one shared
vertex space — only each **lean/heavy pair** benefits from shared topology for believable
in-pair blending. Approaches, in preference order:

1. **Shared topology via HumGen (preferred).** All four from the same HumGen base topology;
   heavy = same topology with `overweight` in Basis. **Verify** HumGen male vs female vertex
   count/order (the shipped male is 26,575 — female export must match for clean cross-sex
   parity, though name-keying tolerates divergence).
2. **Heavy-from-lean displacement (fallback, guarantees in-pair identity).** Build only the
   two lean bases from HumGen; derive each heavy base by applying a strong `body_mass`-style
   sculpt as the **new Basis** on the *same* lean topology, then re-adding morphs as deltas
   from the new basis. Guarantees lean↔heavy identical vertex order within each sex.
3. **Wrap/data-transfer retopo (last resort)** — only if 1 and 2 fail.

**Proportion/scale:** all bases ~1.8 units tall, feet at Y=0, centered, identical neck-seam
band.

### 3.5 Script & pipeline changes

**`build_humgen_body.py` (main change):**
- Parameterize: add `BODY_TYPE = "lean" | "heavy"` alongside `GENDER`. Output
  `alki_humgen_{gender}_{type}.glb` → 4 files.
- **Heavy path:** set `overweight` (and stack belly/mass LiveKeys per §3.6) at ~1.0 into the
  **neutral/Basis** before baking Alki morphs, so the rest pose is the heavy body; the
  existing isolated-delta bake then captures each morph relative to *this* neutral.
- **Add `body_mass` bake** from HumGen mass LiveKeys (§3.6); add `"body_mass"` to the
  canonical key list.
- **Re-sculpt muscle** (§3.3): post-scale baked muscle deltas ×1.5–2.
- **Strip `COLOR_0`**; keep material/texture strip; set `export_skins=False` (static mesh —
  honest intent + leaner file); keep `export_morph=True`, y-up, per-key max-disp print.

**`lib/morphTargets.js`:** add `body_mass` to `MORPH_TARGETS` (range [0,1], default 0,
category "adiposity") so both driver paths and the renderer key-scan recognize it.

**`check_glb.py`:** generalize to a path arg (already supports it); add `body_mass` checks —
assert `body_mass` vs `bf_high` cosine **low** (proves it's new geometry, not re-inflation),
nonzero-vert count high, max disp in 0.10–0.25 band.

**`strip_textures.mjs`:** unchanged; run per base (it guards morph count). ~3–5 MB each × 4.

**Optional `slim_all_bases.mjs`:** wraps optimize+prune+COLOR_0-strip over all four with the
morph-count guard, so slimming can't be skipped.

### 3.6 HumGen LiveKey investigation (FIRST build step)

`overweight`-as-morph gave only 0.068. Before sculpting the heavy base, run `list_livekeys.py`
and confirm the mass LiveKeys, then decide: `overweight` at 1.0 **into Basis** (likely enough
— it's the full overweight body, not a small delta); whether to **stack** `overweight` +
`Belly Size` + any weight/mass macro; whether HumGen exposes a stronger body-fat macro. ~10 min
in Blender; determines the heavy recipe. Do not guess LiveKey names ahead of this.

### 3.7 Per-base verification checklist (the "verify before claiming" gate)

For **each** GLB before it's accepted:
1. **Key presence:** all 14 names (targetNames dump / `check_glb.py`).
2. **Vertex-order identity:** count identical within each lean/heavy pair (26,575 exactly for
   the male pair). If female differs from male, §3.4 approach-2 governs the female pair.
3. **Distinctness (cosine):** `muscle_chest` vs `muscle_legs` ~0 (v3 regression guard);
   **`body_mass` vs `bf_high` LOW**; muscle keys mutually distinct.
4. **`body_mass` magnitude:** nonzero-vert count high; max disp lean 0.18–0.25 / heavy
   0.10–0.15.
5. **Muscle re-sculpt:** `muscle_overall` max ~0.05.
6. **Neck seam:** Y 1.51–1.53 band unmoved by all morphs; same position across pair.
7. **Placeholders still flat:** `water`/`abs_def`/`vascularity` = 0.
8. **In-app:** loads with console `morphMode: "shape_keys"`; inventory finds all 14.
9. **File size:** ≤ ~5 MB post-slim; morph-count guard passed.
10. **Visual A/B:** `body_mass` 0→1 grows the body **believably** (belly low+forward, limbs
    proximal, face fuller), not spherically. The honesty check the whole effort exists for.

---

## 4. Phase 4 — Integration & implementation plan

### 4.0 Dependency spine (why the order is the order)

```
STAGE 0  Driver math fix (engine + fallback)        ships on CURRENT mesh; foundation for all meshes
STAGE 1  bodyUrl selector (pure lib/) + migration   infra; defaults safely to the mesh that exists
STAGE 2  Female lean base (Blender)                 closes no-female-avatar bug
STAGE 3  body_mass key + heavy bases + muscle re-sculpt (Blender)   the honest heavy end, both sexes
STAGE 4  Renderer fit fix (shell)                   stops height-norm cancelling the mass channel
```

Stage 0 is first because it is the math that drives all four meshes — a hard dependency, not
a reduced scope.

### 4.1 `bodyUrl` selector — pure function in `lib/`

New `src/app/lib/selectBaseMesh.js` (firewall-safe: no React/three.js/DOM; Node-runnable).

```
selectBaseMesh(profile) → string   // always non-null
```
- Reads `sex` + week-0 derivations (`weight`, `bodyFat`, height → FFMI, BF% via `deriveAll`).
  Keys off the **starting** body, never the projected one.
- Sex → male/female branch. Within sex, lean-vs-heavy by a **BF% + mass band** (not BF alone
  — mass×leanness is 2-D). First cut: heavy when `BF% ≥ ~25 (M) / ~32 (F)` or a frame-relative
  BMI cutoff; else lean. The band is a calibration knob isolated in this one function.
- Returns `/alki_humgen_{male|female}_{lean|heavy}.glb`.
- Called wherever `DEFAULT_AVATAR_URL` currently **resolves** the avatar; populates the
  `bodyUrl` slot of the reserved seam (`headUrl` stays null; `morphState`/`materialParams`
  from `resolveAvatarParams`, unchanged).
- `DEFAULT_AVATAR_URL` retained as ultimate fallback (incomplete profile → male-lean default,
  never null).

### 4.2 Driver changes (Stage 0) — the math that makes range honest

Two coordinated changes in `engine/mapToMorphs.js` (live) mirrored in `lib/morphTargets.js`
(fallback). **No effect-vector / IP files touched — we change state→weight mapping, not
physiology.**

**(a) Independent mass/adiposity channel.** Add a driver output for `body_mass` computed from
**absolute adiposity relative to frame** (a function of BF% above neutral *plus* absolute fat
mass), so the 285 lb/18% man drives `body_mass` high while the 185 lb/18% man drives it low —
**regardless of the muscle sigmoid.** Until the `body_mass` mesh ships (Stage 3), this can
also nudge `bf_high` so Stage 0 shows improvement on the current mesh.

**(b) Reshape the muscle sigmoid.** The 185→285 difference currently lives in the saturating
shoulder (0.70→0.99) and pins everyone above natural max. Choose during implementation via the
debug panel: *re-center/re-slope* (lower center, reduce ×8 steepness so `lbmRatio 0.65→1.0`
spans more travel), and/or *scale muscle morph magnitude with absolute LBM* (bigger frame
reads larger at equal ratio). **Constraint:** week-0 `current` must keep matching the user's
real body — this is a lens change; engine state outputs (LBM/BF/ceilings) are unchanged.

**Verify gate (Stage 0):** re-run 185 vs 285 through the patched mapper in Node → visibly
separated morph states (mass channel divergent, muscle no longer both pinned ~1.0); debug
panel confirms heavy no longer renders as a bodybuilder. No mesh needed to verify.

### 4.3 `body_mass` contract addition + muscle re-sculpt

- `body_mass` added to `MORPH_TARGETS` — the one approved contract exception (justified by
  the missing-channel finding). Sculpted on all four bases (§3.2).
- Muscle re-sculpt **confirmed in scope** (§3.3) — ×1.5–2 displacement on all four bases.

### 4.4 Load order + migration (grounded in the verified lifecycle)

`avatar_url` is a raw string that today only ever holds the male default (Avaturn off), plus a
`localStorage` mirror. Migration:

**New load order:**
```
profile loads → selectBaseMesh(profile) → bodyUrl     (PRIMARY, always)
   └─ DEFAULT_AVATAR_URL only if profile too incomplete to derive
```
- Stop reading `saved.avatarUrl` as the avatar source. The two Supabase-load sites
  (≈3718, ≈3812) change from `setAvatarUrl(saved.avatarUrl || DEFAULT)` to
  `setAvatarUrl(selectBaseMesh(profile))`. **Why:** a stored value would pin existing users
  and re-break female users on the existing base.
- Ignore the `localStorage` `alki_avatar_url` mirror for **selection** (leave the key for the
  disabled Avaturn path; don't let it drive base choice).
- **Reserve `avatar_url` for the future custom-mesh override** — a *non-null* value will mean
  "user has a custom 'MAKE IT ME' mesh; use it instead of the selected base." The field's
  meaning narrows from "the avatar" to "a custom override, if any." Preserves the seam.
- **No destructive DB migration** — existing `avatar_url` values become inert; nothing lost
  (they only ever held the default). Optional one-line null-backfill is cleanup, not required.

### 4.5 Vertex-order verification gate (carried from Phase 3)

The renderer keys morphs **by name** (`Body3DAvatar.jsx` `morphInventory` scan), so the four
meshes do **not** need one shared vertex space — cross-sex topology divergence is tolerable.
The gate's real job: **confirm lean↔heavy identity within each sex**.
- Before any heavy/female sculpt is accepted: run the GLB inventory; within the male pair
  assert `vertexCount === 26575` and identical index order. For the female pair, if HumGen
  female topology differs from male, §3.4 approach-2 (heavy-from-lean on shared female
  topology) guarantees in-pair identity.

### 4.6 Renderer fit fix (Stage 4 — shell, in scope)

`GLBAvatar.fit` does `scale = 1.7 / modelHeight`, cancelling the mass signal. Fix in the shell
(`Body3DAvatar.jsx`), not the firewall:
- Decouple **height normalization from mass** — scale to a width-aware envelope, or anchor
  scale to a frame dimension from derivations (height) rather than the morphed bounding-box
  height, so a heavier morph genuinely occupies more frame.
- Resolve "avatar not centered" in the same pass (recenter on morphed bounds).
- **Verify gate:** `body_mass` 0→1 makes the silhouette **grow**; heavy renders bigger than
  lean end-to-end. The proof that math (S0) + geometry (S3) + fit (S4) combined fixed the bug.

### 4.7 Staged rollout with verify gates

| Stage | Work | Files | Verify gate |
|---|---|---|---|
| **0** | Mass channel + sigmoid reshape | `engine/mapToMorphs.js`, `lib/morphTargets.js` | 185 vs 285 separated in Node; debug panel: heavy ≠ jacked. **No IP files.** |
| **1** | `bodyUrl` selector + migration | NEW `lib/selectBaseMesh.js`; AlkiApp.jsx load sites; `MORPH_TARGETS += body_mass` | selector correct per profile in Node; existing users not pinned; female profile selects female URL (graceful default if mesh absent). |
| **2** | Female lean base | `build_humgen_body.py` (`GENDER="female"`); slim; deploy | `check_glb.py`: 14 keys, chest≠legs cosine ~0; in-app `shape_keys`; female renders female body — bug closed. |
| **3** | `body_mass` + heavy bases (M+F) + muscle ×1.5–2 | `build_humgen_body.py` (`BODY_TYPE`, body_mass bake, muscle scale); `check_glb.py` extended; slim ×4 | Per-base checklist §3.7: body_mass≠bf_high cosine LOW, disp 0.10–0.25, neck seam stable, placeholders flat, in-pair vertex identity. |
| **4** | Renderer fit + recenter | `Body3DAvatar.jsx` (shell) | body_mass 0→1 grows silhouette; heavy > lean end-to-end; centered. |

Each gate is a **stop-for-proof** point — read the bytes / toggle isolation; never declare
done on assumption.

### 4.8 What the plan protects

- **Contract:** exactly one new key (`body_mass`); every base exposes the same 14 names.
- **Firewall:** only new logic is `selectBaseMesh.js` (pure) + driver-math edits in
  already-pure `engine/`+`lib/`. Renderer fit fix is shell-only. No new render/DOM imports in
  the firewall.
- **Seam:** `selectBaseMesh` populates `bodyUrl`; `avatar_url` narrows to the custom-override
  slot; `headUrl` stays null for the future "MAKE IT ME" head-attach.
- **Core IP:** `compoundVectors.js` / `compoundMorphVectors.js` untouched — geometry + driver
  mapping only.

---

## Appendix A — Engine ↔ Spec coherence (evidence the driver changes are safe)

Before changing the driver mapping, the live engine was audited against the master
physiological reference (`Alki "Eidolon" … Mathematical & Physiological Reference`) to confirm
the changes won't disturb faithful physiology. Result: **the engine is a faithful, coherent
implementation.**

- **Constants: 46/46 exact** — every anthropometric ratio, ceiling, water fraction,
  Casey-Butt/Navy/Deurenberg coefficient, sigmoid center, training/sex multiplier matches the
  spec's stated number.
- **Compound vectors: 25/25 exact** — every §5.8 row (8 state components + ceiling-lift) is
  transcribed with zero drift. (MOTS-c, Fragment 176-191 exist as D-flagged derivations with no
  §5.8 row — as the spec intends; MOTS-c carries an honest `INFERRED — NEEDS CONFIRMATION` flag.)
- **Calibration anchors reproduce the spec's clinical pillars** (verified by running the
  integrator): semaglutide −2.64% BW at 12 wk; testosterone 600 mg → +7.9 kg FFM at 20 wk
  (Bhasin), ~5.0 kg by wk 12; GLP-1 rebound τ = 52/ln(3) regains exactly 2/3 at 52 wk
  (Wilding 2022); GH-axis MK-677+CJC-DAC saturating-combine → 0.85; Casey-Butt → 86.3 kg for
  the reference subject.
- **Six deliberate, documented deviations from the *literal* spec — all correct:**
  1. **Casey-Butt units** — spec §2.3 labels constants "cm" (yields 557 kg); code uses inches
     (86.3 kg). Spec typo; code is right.
  2. **Muscle morph anchors to *natural* ceiling, not §7's *effective*** — sounder: effective
     would render a stronger compound *smaller* at equal LBM and deflate week-0 baseline. Code
     keeps absolute size stable; enhanced LBM reads as growth past the wall. (×8 shape preserved.)
     *Note: this is the very channel Stage 0 reshapes — the audit confirms the current behavior
     is principled, so the reshape is a deliberate, documented evolution, not a bug-fix on top
     of a bug.*
  3. **`abs_def` slope uses §2.5's 0.6, not §7's "k≈60"** — 60 = binary step; 0.6 = the curve.
  4. **Semaglutide fat:lean follows §5.8 vector (~73/27), not §5.1 DEXA prose (61/39)** —
     explicit documented precedence: §5.8 Layer-3 table wins over §5.1 prose on conflict.
  5. **Clenbuterol keeps full vector + warning** rather than modeling β2 desensitization decay
     (spec gives no magnitude → flag-don't-fabricate).
  6. **Vascularity uses §2.5 onset center (12) vs §7 full-center (0.09)** — first-visible point,
     within the spec's range.

Every divergence carries an in-code comment with reasoning and (where relevant) a decision
date. **No silent or unjustified deviations.** Implication for this effort: the Stage 0
driver-mapping changes operate on a sound, spec-faithful base — they change the *lens* (how
state maps to morph weights), and the physiological *state* the lens reads is verified correct.
