# Alki Parametric 3D Body — Architecture & Build Plan

## What just got built

The bones of the parametric 3D body model — the system that will replace Avaturn for Alki's actual product mechanic (showing the user's body changing on a protocol).

Four new files, one edited:

```
src/app/lib/morphTargets.js              ← Canonical shape key list + driver
src/app/lib/compoundMorphVectors.js      ← Per-compound morph vectors (the IP)
src/app/Body3DAvatar.jsx                 ← Updated renderer (shape-key aware)
blender_scripts/build_base_body.py       ← Test asset generator (Blender Python)
src/app/AlkiApp.jsx                      ← edited: resolveAvatarParams now emits morphState
```

The system is **backward compatible**. The existing Avaturn GLB has no shape keys, so the renderer falls back to the old crude X/Z scaling. Nothing in the live app should look different until you swap in a GLB that exposes the canonical shape keys.

## How the layers fit together

```
USER PROFILE  ──┐
                ├──► resolveAvatarParams (AlkiApp.jsx)
SELECTED CMPDS ─┘            │
                             ▼
                    ┌────────────────────┐
                    │   morphTargets.js  │ ◄── baselineMorphState
                    │                    │     from profile alone
                    │  resolveMorphStates│
                    │                    │ ◄── compoundMorphVectors.js
                    │  → { current,      │     getStackVectors(ids, catalog)
                    │      projected }   │
                    └────────────────────┘
                             │
                             ▼
                    Body3DAvatar.jsx
                       │           │
                  shape keys?     no shape keys?
                       │           │
                       ▼           ▼
              morphTargetInfluences  crude X/Z scale (legacy)
```

The handoff between Blender and the app is a **naming contract**. The canonical names in `MORPH_KEYS` (morphTargets.js) MUST exactly match the shape key names on the GLB. The renderer scans every mesh's `morphTargetDictionary` for those names and drives the matching `morphTargetInfluences`.

## Canonical shape keys

12 geometry keys + 2 material params. Adding new ones means (a) sculpting the variant in Blender, (b) adding the entry to `MORPH_TARGETS`, (c) writing the compound effect vectors that drive it.

| Key | What it is |
|---|---|
| `bf_low` | Lean physique — reduced subcutaneous fat |
| `bf_high` | Higher adiposity — thicker waist/hips/limbs |
| `visceral` | Belly protrusion forward (independent of subQ fat) |
| `water` | Soft uniform swell from water retention |
| `muscle_overall` | Generic lean mass increase |
| `muscle_chest` | Pec hypertrophy |
| `muscle_shoulders` | Deltoid + trap |
| `muscle_arms` | Bicep/tricep/forearm |
| `muscle_back` | Lat width / V-taper |
| `muscle_legs` | Quad sweep + calf split |
| `abs_def` | 6-pack visibility (auto-computed from BF + muscle) |
| `vascularity` | Visible veins (auto-computed from BF + muscle) |
| `skin_tone_shift` | Melanotan II — material, not geometry |
| `skin_quality` | GHK-Cu — material smoothness |

`abs_def` and `vascularity` are auto-computed by the driver from current BF + muscle state, but you can also push them with compound vectors. They're sculpted in Blender like any other shape key — the driver just adds an extra invariant pass to make sure they activate when geometry conditions warrant.

## Compound morph vectors

Defined in `compoundMorphVectors.js`. Each compound has a sparse vector across the canonical keys representing its **fully-realized 12-week visual outcome**. Eight core compounds are hand-tuned; the other 63 from the expanded catalog get a computed approximation from their legacy 4-dim effects (bf/muscle/skin/recovery).

Example — semaglutide hits seven different keys:
```js
semaglutide: {
  bf_high: -0.42,         // dramatic fat reduction
  bf_low: 0.26,           // pushes toward lean
  visceral: -0.20,        // visceral fat drops too
  muscle_overall: -0.10,  // muscle loss without lifting
  muscle_chest: -0.05,
  muscle_arms: -0.06,
  muscle_legs: -0.08,
  water: -0.05,
  skin_quality: -0.05     // "Ozempic face"
}
```

This is what no other peptide app has and what makes the body simulator actually credible.

## How to test it end-to-end RIGHT NOW

1. **Generate the test base mesh.** Open Blender, paste the contents of `blender_scripts/build_base_body.py` into the Scripting workspace, and run. It produces `alki_test_body.glb` next to the script (or in your home directory if Blender hasn't saved a .blend file yet). Check the console — it should print:
   ```
   [Alki] Shape keys present: ['Basis', 'bf_high', 'bf_low', 'visceral', ...]
   [Alki] All 12 canonical keys present
   [Alki] Exported to ...
   ```

2. **Drop the GLB into the public folder.** Copy `alki_test_body.glb` to `alki-app/public/alki_test_body.glb`. Anything in `public/` is served at the root URL.

3. **Point the app at it.** Open the app in your browser, open DevTools console, paste:
   ```js
   localStorage.setItem("alki_avatar_url", "/alki_test_body.glb");
   localStorage.removeItem("alki_avatar_headshot");
   location.reload();
   ```
   The existing avatar code path picks up `alki_avatar_url` from localStorage on mount.

4. **Watch the console.** You'll see two debug logs from Body3DAvatar:
   ```
   [Alki morph inventory] { meshesWithMorphs: 1, totalKeysFound: 12, availableKeys: [...] }
   [Alki GLB fit] { ..., morphMode: "shape_keys" }
   ```
   If `morphMode` says `shape_keys`, the new pipeline is live.

5. **Drive the morphs.** Pick different compound stacks in the app. Toggle between the home avatar (current state) and the projected transformation view. The body should visibly change — semaglutide should drop fat, Ipa/CJC should add muscle, GHK-Cu should smooth the skin material.

If any of step 4's logs say `morphMode: "legacy_scale"`, the shape keys aren't being found. Most likely cause: shape key names don't match. Check the Blender shape key panel — names must be exactly the strings in `MORPH_KEYS`.

## What comes next (your work)

The pipeline is proven once step 5 above produces visible, correct morphing. After that, the test asset gets thrown away and you sculpt the real one. The work has two phases.

**Phase 1 — Replace the primitive humanoid with proper geometry.**

Build the male-average base body in Blender. Clean topology, anatomically informed edge flow, ~5-10k tris is plenty for mobile. The exact same shape key names get sculpted as actual anatomical variants — `bf_high` is a real soft-tissue distribution, not a uniform X/Y scale. `muscle_chest` is a sculpted pec, not just a vertex push. This is where your Blender skill is the entire product. The output GLB drops into the same code path and everything else stays the same.

**Phase 2 — Add the female base and the body-type variants.**

Female base mesh, same shape key vocabulary. After that, optionally male-lean and male-heavy starting variants if you want to reduce the morph distance the shape keys have to cover for outlier body types. Each new mesh is a clone of the rig at the script level — the morph driver doesn't change.

**Phase 3 — Face capture.**

This is the part that replaces Avaturn's actual value-add. MediaPipe FaceMesh extracts face geometry and skin tone from a selfie, projects onto the head of the base mesh. Recognizable but stylized. Lives entirely in the browser, no server, no per-avatar cost.

## What's intentionally NOT in this commit

- No changes to AvaturnCapture flow. The premium "MAKE IT ME" button still goes to Avaturn. Once the parametric body is sculpted and the face capture works, that button gets repointed.
- No changes to the SVG BodyAvatar. The free tier still uses the SVG path with Plan B's definition layer.
- No compound vector tuning for the 63 expanded compounds beyond the legacy-effects fallback. They work but visually they're generic. Hand-tune the high-impact ones (Retatrutide, RAD-140, MK-677, etc.) as the database expands.

## Files reference

- `src/app/lib/morphTargets.js` — read the comments at the top. Adding a shape key means adding to `MORPH_TARGETS`.
- `src/app/lib/compoundMorphVectors.js` — `NAMED_VECTORS` is the table of hand-tuned compound vectors. Add new ones here.
- `src/app/Body3DAvatar.jsx` — two render paths. The shape-key path is the new one. Don't delete the legacy path until every avatar in use has shape keys.
- `blender_scripts/build_base_body.py` — single source of truth for "what does a working Alki GLB look like." When you replace the test mesh with a real sculpted one, this script becomes a reference for what the final asset must contain.
