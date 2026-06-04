# HumGen3D — Phase A Findings (Source Investigation)

> **Status:** Phase A complete (source reading only — nothing was built or modified).
> **Produced for:** the Alki avatar effort. Hand-off target: the Claude.ai thread doing live
> Blender measurement (Phase B).
> **Date:** 2026-06-03
>
> **Sources investigated:**
> - Repo: `C:\Users\Dallas\Desktop\HumGen3D` (HumGen3D **v4.0.32**)
> - Live install: `C:\Users\Dallas\AppData\Roaming\Blender Foundation\Blender\5.1\scripts\addons\HumGen3D`
> - Content: `D:\Blender-HumGen-Paid\` (the addon-preference `filepath`)
>
> All `file:line` citations refer to the repo root unless stated otherwise.

---

## 0. Build provenance (established facts about *this* install)

1. **Repo and live install are byte-identical** — every `.py` file matches by MD5. There is one
   source of truth; the install adds only `__pycache__` and an auto-updater backup copy under
   `backend\updates\humgen3d.backend.updates_updater\backup\` (a stale duplicate — ignore it).

2. **This build is essentially stock official HumGen.** Diffed against the official
   `HumGen3D_v4_0_29.zip` (sitting in `D:\Blender-HumGen-Paid\`), only three things differ:
   - `__init__.py` — version bump `4.0.29 → 4.0.32`.
   - `human\keys\keys.py:35-58` — **hand-added debug timing `print()` calls** in
     `_get_starting_coordinates` (instrumentation from earlier Alki debugging; harmless).
   - `human\expression\expression.py:186-214` — **hand-added crash fix**: drivers are removed
     *before* shape keys when removing the facial rig (prevents an access-violation crash).
   Everything else — including the entire LiveKey machinery — is stock code.

3. **The official v4.0.29/32 code already contains Blender 4.x and 5.x compatibility patches**
   (`common\compatibility.py:3`, `human\pose\pose.py:249,281`, `human\expression\expression.py:150,177`,
   `common\render.py:16`, `human\process\bake.py:314`). The `bl_info` "blender": (3, 2, 0) is just
   stale metadata. So "runs on Blender 5.1" is *intended* by the vendor, but the support is
   piecemeal — see Fact 1 analysis below.

4. **The base model file** `D:\Blender-HumGen-Paid\models\HG_HUMAN.blend` was saved by
   **Blender 3.02** (file magic `BLENDER-v302`), uncompressed, 20.5 MB.

---

## 1. The three observed facts — reproduced and explained

### Fact 1 — `livekey.value = x` raises `KeyError: "Key 'LIVE_KEY_PERMANENT' not found"`

#### What `LIVE_KEY_PERMANENT` actually is

It is an **ordinary Blender shape key block that ships pre-built inside `HG_HUMAN.blend`**.
A binary scan of the .blend confirms exactly one `LIVE_KEY_PERMANENT` and one `LIVE_KEY_TEMP_`
KeyBlock, alongside `Basis`, `Male`, 12 `cor_*` corrective keys and 8 `eyeLook*` keys.
**No code ever creates it** — it is only *looked up* (`human\keys\keys.py:647`) and *deleted*
(`human\process\export.py:91`). If it is missing from the body mesh, nothing will recreate it.

Its role: it is the **accumulator** for all "committed" livekey deformations. It is meant to sit
at value 1.0 forever (preset JSONs store `"LIVE_KEY_PERMANENT": 1.0`). Every livekey you set gets
its per-vertex delta **added into this one key's coordinates**, so an arbitrary number of
livekeys can be stacked without creating any new shape keys.

#### The livekey commit pipeline (what the design intends)

Two shape keys + one bookkeeping dict implement the whole system:

| Piece | What it is | Where |
|---|---|---|
| `LIVE_KEY_PERMANENT` | accumulator shape key, value pinned at 1.0 | ships in HG_HUMAN.blend; accessed via `KeySettings.permanent_key` (`keys.py:640-647`) |
| `LIVE_KEY_TEMP_<name>` | scratch shape key holding the *currently dragged* livekey at full strength; its `value` slider is the livekey's value | `KeySettings.temp_key` (`keys.py:619-638`) |
| `rig.HG.sk_values` | dict-like ID-property store mapping livekey name → current value | `backend\properties\object_props.py:21-22,47` (an *empty* PropertyGroup used as a dict) |

Two write paths exist:

1. **UI / realtime path** (`human\keys\bpy_livekey.py:46-124`, `set_livekey`): when a UI slider
   changes, the livekey's npz deltas are loaded, the *previous* temp key's contribution is folded
   into `LIVE_KEY_PERMANENT` (`_add_temp_key_to_permanent_key_coords`, `bpy_livekey.py:132-147`),
   the new key's absolute coordinates are written into the temp key, the temp key is renamed
   `LIVE_KEY_TEMP_<name>`, and its `value` slider becomes the livekey value. A modal operator
   (`human\keys\key_slider_update.py:25-115`) waits for mouse-release and then runs the
   "correct everything" step.

2. **Python API path** (`human\keys\keys.py:258-306`, `LiveKeyItem.value` setter →
   `set_without_update`): the delta `npz × (old_value + new_value)` is added **directly into
   `LIVE_KEY_PERMANENT`'s coordinates** (no temp key involvement except resetting it), and
   `sk_values[name]` is updated. `value` setter then calls
   `update_human_from_key_change` (`keys.py:760-783`) which: un-hides the human, refits the
   armature to the new mesh shape, repositions eyes/teeth, and re-deforms clothing.

Reading a livekey value never touches the npz or the permanent key — it returns the temp key's
slider value (if that livekey is the "hot" one) or the number stored in `sk_values`, else 0.0
(`keys.py:241-256`). **This is why the read path works even when the write path is broken.**

#### Exactly where and why the KeyError is raised

The failing call chain, common to `value =`, `set_without_update`, and `body.reset_values`:

```
LiveKeyItem.set_without_update()              keys.py:273
  → self._human.keys.permanent_key            keys.py:301
    → KeySettings["LIVE_KEY_PERMANENT"]       keys.py:647
      → KeySettings.__getitem__               keys.py:829-835
        → searches self.all_keys (= all_livekeys + all_shapekeys) for .name == "LIVE_KEY_PERMANENT"
        → StopIteration → raise KeyError(f"Key '{name}' not found")   ← the observed error text
```

`all_shapekeys` (`keys.py:574-585`) wraps every key block of **`human.objects.body`** — which is
**not** "whatever mesh you are looking at" but specifically the object referenced by the
PointerProperty **`rig.HG.body_obj`** (`human\objects.py:27-33`, `object_props.py:45`).
The name-parsing regex (`keys.py:397-399`) passes "LIVE_KEY_PERMANENT" through unchanged
(verified by regex trace), so **if the block exists on the object `HG.body_obj` points to, the
lookup succeeds**. Therefore the error means, with certainty:

> **At the moment of the call, the mesh that `rig.HG.body_obj` points to has no key block named
> exactly `LIVE_KEY_PERMANENT`.**

Note the order of operations inside `set_without_update`: vertex reads on the body succeed first
(`keys.py:283-288`), and `temp_key` access (`keys.py:291`) will silently **create** a
`LIVE_KEY_TEMP_` key via `shape_key_add` if none is found — so the failure at `permanent_key`
means the body the API sees is a real mesh, just one missing that specific block.

#### Three hypotheses that explain "but I can see the block on the mesh" — ranked

**H1 (most likely): the block was destroyed by a prior export or modifier-apply, and the block
the user sees is on a different object / different human.**
`human\process\export.py:68-91` (`_apply_base_shape_keys`, stock code) **bakes and then
`shape_key_remove`s** `Male`, `LIVE_KEY_PERMANENT` and `LIVE_KEY_TEMP_*` from the body on
**every** export (`to_fbx`, `to_glb`, `to_obj`, …). The same happens in
`human\process\apply_modifiers.py`. This is destructive and permanent — after one export, that
human can never accept a livekey write again. Since Alki's pipeline exports avatars, any human
that has been exported (or duplicated from one that was) is in this state.

**H2: `rig.HG.body_obj` points at a different object than the one being inspected.**
Causes: manual duplication of the human (`Human.duplicate` reassigns the pointer at
`human\human.py:731-734`, but Blender's own Ctrl+D does not), two humans in the scene, a stale
pointer after file lib-linking, or `_verify_body_object`'s fallback logic
(`human\human.py:884-905`) picking a wrong child.

**H3: Blender 5.x IDProperty breakage.**
Blender 5.0 split ID-property storage into "system" properties (backing `bpy.props`-defined RNA
like `HG.body_obj` and `HG.sk_values`) and "user" properties (dict-style `obj["key"]`), made
system containers read-only by default, and **removed dict-style access to `bpy.props`-defined
data**. HumGen's pipeline depends on both patterns:
  - `sk_values[name] = value` *writes arbitrary dict keys into a PropertyGroup*
    (`keys.py:306`, `bpy_livekey.py:90,122,146`) — exactly the pattern 5.0 restricted;
  - `props.hashes["$pose"] = ...` (`human\human.py:241-244`) — same pattern, used by
    `from_preset`;
  - `HG.body_obj` PointerProperty data stored in pre-5.0 files goes through 5.0's versioning
    migration when the .blend is opened in 5.1.
This may not be the cause of *this exact* KeyError (the failure geometry fits H1/H2 better), but
it is a **documented latent breakage** that will corrupt value bookkeeping on 5.1 even when the
key lookup works. Sources:
[Blender 5.0 Python API release notes](https://developer.blender.org/docs/release_notes/5.0/python_api/),
[Blender issue #123232 — Breaking Changes To IDProperties For 5.0](https://projects.blender.org/blender/blender/issues/123232).

#### → Phase B measurements to discriminate (2-minute script)

Run with the failing human's rig selected:

```python
import bpy
from HumGen3D import Human
human = Human.from_existing(bpy.context.object)
rig  = human.objects.rig
body_ptr = rig.HG.body_obj                                  # what the API uses
print("HG.body_obj           ->", body_ptr)
print("object user inspects  ->", bpy.context.object)
print("same object?          ->", body_ptr == bpy.context.object)
print("body_ptr.data.shape_keys ->", body_ptr.data.shape_keys if body_ptr else None)
if body_ptr and body_ptr.data.shape_keys:
    print("key blocks:", [kb.name for kb in body_ptr.data.shape_keys.key_blocks])
print("API all_shapekeys     ->", [sk.sk_name for sk in human.keys.all_shapekeys])
print("rig was exported?     ->", "hg_baked" in rig, rig.get("modifiers_applied"))
# H3 test: does dict-write into a PropertyGroup still work on Blender 5.1?
try:
    human.props.sk_values["__test__"] = 1.0
    print("sk_values dict-write  -> OK", dict(human.props.sk_values.items()) if hasattr(human.props.sk_values, "items") else "")
except Exception as e:
    print("sk_values dict-write  -> FAILS:", repr(e))
```

Expected outcomes: H1 → key blocks list lacks LIVE_KEY_PERMANENT (and may contain stray
`LIVE_KEY_TEMP_.001` blocks created by failed attempts); H2 → `same object?` is False; H3 → the
dict-write test fails.

#### The intended ways to drive a key on this version (in order of API "official-ness")

1. `human.keys.set_from_dict({"name": value, ...}, context)` (`keys.py:727-758`) — batch set, what
   `from_preset` itself uses. Tolerates missing keys (returns them as error strings).
2. `livekey_item.value = x` — single key + full update (`keys.py:258-271`).
3. `livekey_item.set_without_update(x)` for many keys, then
   `human.keys.update_human_from_key_change(context)` once (`keys.py:273-306,760-783`).
4. UI path: `livekey_item.as_bpy().value = x` (the `BpyLiveKey` FloatProperty,
   `bpy_livekey.py:161-169`) — requires part of the human to be the *active object*.
5. **Workarounds that bypass the permanent key entirely** (work even on a stripped human):
   - `livekey_item.to_shapekey()` (`keys.py:308-337`) — materializes the npz as a real Blender
     shape key (named e.g. `b_{main}_overweight`); drive its `.value` like any shape key.
   - `human.keys.load_from_npz(filepath)` (`keys.py:678-714`) — same, from an arbitrary npz path.
   - Direct numpy decode + `foreach_set` on the mesh — what Alki did empirically; equivalent to
     what `set_without_update` does, minus bookkeeping and armature/clothing correction.

   ⚠️ All bypasses skip `update_human_from_key_change`, so bones/eyes/teeth/clothing will NOT
   follow the mesh unless you call `human.keys.update_human_from_key_change()` (which needs the
   permanent key for `height._correct_armature`… see `human\height\height.py:146` — it reads
   `permanent_key` too!). **Flag for Phase B: verify which correction steps still work on a
   stripped human.**

---

### Fact 2 — Morphs are sparse `.npz` files

Fully confirmed; the empirical decode was exactly right. Details from source + data inspection:

#### File format (verified by parsing npz headers directly)

Every livekey npz (e.g. `livekeys\body_proportions\main\male_overweight.npz`) is a zip of two
npy arrays:

| member | dtype | shape | meaning |
|---|---|---|---|
| `indices.npy` | int64 | `(1, N)` | indices into the **flattened** `(nverts*3)` coordinate array |
| `relative_coordinates.npy` | float64 | `(N,)` | offsets (in meters, object space), rounded to 4 decimals |

The odd `(1, N)` shape exists because the writer saves `np.nonzero(...)` (a tuple of arrays)
directly: `keys.py:489-494`. The values are rounded to 4 decimal places at save time
(`keys.py:488`), which is why tiny offsets read as e.g. `6e-05`.

The largest index in `male_overweight.npz` is 75,857 → the body mesh has **≥ 25,286 vertices**
(75,858 / 3). *Phase B: confirm exact vertex count of HG_Body.*

#### Loader and application

- `import_npz_key(vert_count, filepath)` (`keys.py:63-78`): allocate `zeros(nverts*3)`, scatter
  `relative_coordinates` into it at `indices`, return. (Exactly the empirically-derived decode.)
- Application (`set_without_update`, `keys.py:300-304`): `permanent_key_coords += delta * (old_value + value)`.
  Note: **deltas are relative to the Basis/current vertex positions, and stack additively** —
  there is no normalization or clamping in the math itself; only the UI sliders clamp
  (hard ±10, soft ±2 / ±1, `bpy_livekey.py:161-187`).
- Saving (`ShapeKeyItem.save_to_library`, `keys.py:441-502`): any shape key can be written back
  to disk as a new livekey npz (or kept as a shape key) — this is how custom morphs are authored.

#### `to_shapekey()` and the name-mangling explained

`LiveKeyItem.to_shapekey()` (`keys.py:308-337`) decodes the npz, adds `body coordinates + delta`
as a new real shape key with `slider_min/max = ±2`, and names it:

```python
name = f"{self.category[0]}_{{{self.subcategory}}}_{self.name}"   # keys.py:322
```

The f-string's `{{{...}}}` produces **literal** curly braces, so category "body_proportions",
subcategory "main", name "overweight" → block name **`b_{main}_overweight`**. This is not a bug;
it is a serialization format. `ShapeKeyItem.__init__` (`keys.py:396-408`) parses it back with the
regex `^((?P<category>[^_])[_\{])?((?P<subcategory>.+)\}_)?(?P<name>.*)` and the category map
`{"f": face_proportions, "b": body_proportions, "p": presets, "e": expressions, "s": special}`
(`keys.py:388-394`). So a converted livekey round-trips: the block `b_{main}_overweight` appears
in the API as name="overweight", category="body_proportions", subcategory="main".

#### LiveKey vs ShapeKey vs permanent/temp — the full taxonomy

| Kind | Backed by | Lives where | Drives mesh how |
|---|---|---|---|
| **LiveKeyItem** (`keys.py:227-382`) | npz file on disk | `bpy.context.window_manager.livekeys` collection (`BpyLiveKey` PropertyGroup, populated by `update_livekey_collection()` walking the `livekeys\` folder, `keys.py:81-131`) | delta added into LIVE_KEY_PERMANENT's coords; value bookkept in `HG.sk_values` |
| **ShapeKeyItem** (`keys.py:385-529`) | real Blender key block on the body | mesh shape keys | normal Blender shape key evaluation (`value` × delta) |
| **LIVE_KEY_PERMANENT** | real key block (ships in model) | body mesh | the accumulator; always value 1.0 |
| **LIVE_KEY_TEMP_<name>** | real key block (ships in model) | body mesh | holds the hot livekey during slider drags; its `value` is the livekey value |
| **`Male`** | real key block (ships in model) | body mesh | the gender morph: base mesh is female-shaped; `Male`=1.0 produces the male body |
| **`cor_*`** (12) | real key blocks (ship in model) | body mesh | pose-corrective keys driven by bone rotation drivers (elbow/knee/shoulder/foot bends) |
| **`eyeLook*`** (8) | real key blocks (ship in model) | body mesh | eyelid-follow keys for eye look direction |
| **`expr_*`** | created on demand from `shapekeys\expressions\*.npz` | body mesh | 1-click expressions (`human\expression\expression.py:103-137`) |

The `window_manager.livekeys` collection is runtime-only (rebuilt by walking the folder), is
shared across all humans, and filters gendered files (`male_*`/`female_*` prefix or `_male`/`_female`
suffix) per human at access time (`keys.py:547-571`).

---

### Fact 3 — Content directory layout

Full map of `D:\Blender-HumGen-Paid\` (folders, with file counts; thumbnails are `.jpg` next to
each item). The livekey tree is enumerated exhaustively; other trees summarized.

```
D:\Blender-HumGen-Paid\
├── content_packs\            [6]   installed-pack manifests (.json) + icons
├── models\
│   ├── HG_HUMAN.blend               THE base human (rig+body+eyes+teeth, all shape keys, 61 fitted bones)
│   ├── face_rig.json          18MB  FACS facial-rig shape key data + drivers (body + teeth)
│   ├── male\   {Asian, Asian presets, Black, Black presets, Caucasian, Caucasian Presets,
│   │            Hispanic, Middle Eastern}\*.json + *.jpg     ← starting-human presets
│   └── female\ {same categories}\*.json + *.jpg
├── livekeys\
│   ├── body_proportions\
│   │   ├── main\        male_overweight, male_muscular, male_skinny,
│   │   │                female_overweight, female_muscular, female_skinny,
│   │   │                height_150, height_200                     [8 npz]
│   │   ├── Torso\       Belly Size, Breast Size, Chest Height, Chest Width, Hips Height,
│   │   │                Hips Size, Shoulder Width, Waist Thickness  [8 npz]
│   │   ├── Muscles\     Back, Biceps, Calves, Chest, Forearm, Hamstring, Lower Butt, Quad,
│   │   │                Shoulder, Traps, Triceps, Upper Butt        [12 npz]
│   │   ├── Arms\        Forearm Length/Thickness, Hand Length/Thickness/Width,
│   │   │                Upper Arm Length/Thickness                  [7 npz]
│   │   ├── Legs\        Foot Length, Shin Length/Thickness, Thigh Length/Thickness [5 npz]
│   │   ├── Head\        Neck Length, Neck Thickness                 [2 npz]
│   │   └── Special\     Stylized                                    [1 npz]
│   ├── face_presets\    asian, black, caucasian, variation_1..11    [14 npz]  ← ethnicity/variation morphs
│   ├── face_proportions\
│   │   ├── cheeks\ [3] chin\ [4] ears\ [5] eyes\ [11] jaw\ [3] l_skull\ [2]
│   │   ├── mouth\ [5] nose\ [11] special\ [1: Eye Scale] u_skull\ [5]
│   └── special\
│       ├── height_150.npz, height_200.npz   [2]   ← DUPLICATES of the ones in main\
│       ├── age\         aged_female, aged_male, aged_young          [3 npz]
│       ├── eyes\        Eye Depth, Eye Distance, Eye Height, Eye Scale [4 npz]
│       └── Main\        (empty)
├── shapekeys\expressions\
│   ├── Base Shapekeys\ [51]  Expressive\ [15]  Happy\ [12]  Neutral\ [18]  Sad\ [3]
│   │                          ← 1-click expression npz files (same sparse format)
├── hair\
│   ├── head\{male,female}\{Aged, Curls, Long, Regular, Short}\*.json + *.blend
│   ├── face_hair\{Beard, Mustache, Other}\*.json + *.blend
│   └── haircards\ [9]   haircard generation data (zones json, materials, haircap blends)
├── outfits\{male,female}\{Casual, Extra Outfits Pack, Office, Summer, Winter}\*.blend
│   └── textures\ ...
├── footwear\{male,female}\{Extra Outfits Pack, Office, Outdoor, Sneakers, Sports}\*.blend
│   └── textures\ [30]
├── patterns\{Abstract, Camouflage, Geometric, Lines, Plaid}\*.png    ← clothing patterns
├── poses\{Base Poses, Running, Sitting, Socializing, Sporting, Standing around, Walking,
│         DPL * (16 third-party categories)}\*.blend
├── process_templates\Generic\ [2]    ← process-pipeline presets (json)
├── scripts\ [2]                      ← user post-process scripts (.py)
└── textures\
    ├── male\  {Default 512px, 1K, 4K, 8K}\*.png + PBR\   ← skin texture sets
    ├── female\{Default 512px, 1K, 4K, 8K}\*.png + PBR\
    ├── eyes\{LOW_RES, MEDIUM_RES}\  teeth\{...}\  masks\{...}\  layers\{...}\
```

Notes:
- Height npz files exist **twice** (`body_proportions\main\` and `special\`). Both get registered
  in the livekey collection; `keys.filtered()` explicitly hides them from category listings
  (`keys.py:669-670`), and `HeightSettings` looks them up by name (first match wins).
- Gendered files (`male_*`/`female_*`) are merged into one logical key per gender at collection
  build time (`keys.py:96-100`): a female human sees "overweight" backed by
  `female_overweight.npz`.
- Subcategory folders are *discovered*, not hardcoded — dropping a new folder of npz files under
  `livekeys\` creates a new UI section + randomization lock automatically
  (`keys.py:106-131`).

---

## 2. A1 — Architecture: how the system works end to end

### 2.1 What a HumGen human *is* in Blender terms

A human = **5 objects parented to one armature**, plus properties on that armature:

```
HG_<Name> (Armature "rig")  ← all identity/state lives here, on rig.HG (PropertyGroup):
│     .ishuman=True, .gender, .body_obj → pointer, .sk_values{...}, .hashes{...},
│     .version, .active_human_preset, .length
├── HG_Body   (mesh, ~25k verts, 4 material slots: skin / eyelash+brow / head hair / face hair)
│     shape keys: Basis, Male, LIVE_KEY_PERMANENT, LIVE_KEY_TEMP_, cor_*×12, eyeLook*×8
│     particle systems: hair;  vertex groups: bone weights + hair density + masks
├── HG_Eyes   (mesh, 2 materials: outer transparent shell / inner iris+sclera)
├── HG_TeethUpper (mesh)
├── HG_TeethLower (mesh)
└── [clothing / footwear / haircard objects appear here when added]
```

The rig's 61 deform bones each carry custom properties `head_verts`, `tail_verts`,
`head_relative_co`, `tail_relative_co` (verified present in HG_HUMAN.blend, 61× each) — lists of
body-vertex indices plus an offset. This is the **bone-follows-mesh system**: after any morph,
each bone's head/tail is re-placed at the centroid of its tracked vertices plus the stored offset
(`human\height\height.py:167-186`). That is how *one* morph system handles both shape AND
skeleton.

Identification of parts is by custom property, not name: `hg_body`, `hg_eyes`, `hg_teeth`
(`human\human.py:590-592`, `human\objects.py:36-76`), and `"cloth"`/`"shoe"` for clothing.

### 2.2 Package / module layout

```
HumGen3D\
├── __init__.py            registration; exports Human, BatchHumanGenerator (v4.0.32)
├── human\                  ← THE API. One sub-package per "aspect" of a human:
│   ├── human.py            Human class: from_preset/from_existing + .body .height .face .age
│   │                       .keys .skin .eyes .hair .clothing .pose .expression .process
│   │                       .materials .objects .props .export
│   ├── keys\               LiveKey/ShapeKey machinery (THE morph core — see Fact 1/2)
│   ├── body\ height\ face\ age.py            body-shape levers (all thin wrappers over keys)
│   ├── skin\ eyes\ materials.py              shader-node-driven appearance
│   ├── hair\               particle-system hair + haircard baking
│   ├── clothing\           outfit/footwear loading + cloth-to-body deformation
│   ├── pose\               pose library + Rigify conversion
│   ├── expression\         1-click expressions + FACS facial rig
│   └── process\            export / bake / LOD / modifier apply / renaming pipeline
├── batch_generator\        BatchHumanGenerator: randomized crowd generation
├── backend\                content packs, preferences, properties, preview collections,
│                           callbacks, logging, auto class registration
├── common\                 decorators, geometry (KD-tree deform), drivers, math, context
├── user_interface\         N-panel UI (drives the same Python API)
└── extern\                 blendfile.py (pure-python .blend parser), rdp.py (line simplify)
```

Design pattern: `Human` is a *stateless facade* — every property access constructs a fresh
settings object wrapping the rig pointer (`human\human.py:278-459`). All actual state lives in
the Blender scene (objects, shape keys, ID properties, node values). You can therefore create
`Human.from_existing(obj)` at any time and get a fully functional handle.

### 2.3 The real `Human` API surface (v4.0.32)

Constructors / class methods (`human\human.py`):
- `Human.from_preset(preset, context, prettify_eevee=True, from_batch_generator=False)` :169
- `Human.from_existing(obj, strict_check=True)` :121
- `Human.get_preset_options(gender, category, context)` :79, `Human.get_categories(gender)` :257
- `Human._import_human(context, gender)` :554 (internal: appends from HG_HUMAN.blend)

Instance properties → sub-APIs: `.body .height .face .age .pose .clothing .expression .process
.materials .objects .children .gender .pose_bones .props .skin .keys .eyes .hair .export
.location .rotation_euler .name .is_trial`

Instance methods: `.delete()` :536, `.hide_set(bool)` :620, `.make_camera_look_at_human()` :630,
`.save_to_library(name, category, thumbnail, context)` :654, `.as_dict()` :691,
`.duplicate(context)` :706, `.render_thumbnail(...)` :745

### 2.4 The generation pipeline (`from_preset`)

1. Read preset JSON (e.g. `models\male\Caucasian\David.json`) — `human.py:190-198`.
2. `_import_human`: append the 5 objects from `HG_HUMAN.blend`, set `rig.HG.*` props, run
   `keys._set_gender_specific` (renames `Male_`/`Female_` prefixed keys, deletes opposite-gender
   ones), delete opposite-gender hair/skin features — `human.py:554-618`.
3. For each top-level section of the JSON (`age`, `keys`, `skin`, `eyes`, `height`, `hair`,
   `clothing`) call the corresponding sub-API's `set_from_dict(data)` — `human.py:222-235`.
   The `keys` section is the complete morph state (≈115 entries; see preset JSON inventory in §3).
4. Stamp version + content hashes into `rig.HG`, random name, optional SSS — `human.py:236-249`.

`as_dict()` is the exact inverse → presets are just saved humans (`human.py:691-704`,
`save_to_library` :654). **This means Alki can author its own starting presets as plain JSON.**

### 2.5 The content pack system (summary; full detail in `HUMGEN_PHASE_A_APPENDIX_SUBSYSTEMS.md` §J)

- A `.hgpack` is a zip of content + a manifest JSON; installing = unzipping into the content dir
  and recording the file list (`backend\content\content_packs.py:310-335`).
- The addon discovers content by **walking folders at runtime** (preview collections,
  `backend\preview_collections.py:107-180`; livekeys, `keys.py:81-131`). There is no database —
  dropping correctly-named files into the tree IS installation.
- Custom content of every type (keys, presets, hair, clothing, poses, textures) can be saved back
  into the tree from the UI or API (`backend\content\saving_operators.py`).

### 2.6 The export path (and its interaction with the key system)

`human.export.to_fbx/to_obj/to_gltf_embedded/to_gltf_separate/to_glb/to_abc`
(`human\process\export.py:97-274`). Every exporter runs through the `@exporter` wrapper
(`export.py:26-93`) which:
1. moves the human to origin, optionally bakes textures,
2. removes the transparent outer eye material,
3. **bakes `Male`, `LIVE_KEY_PERMANENT`, `LIVE_KEY_TEMP_*` into the mesh and deletes those key
   blocks** (`export.py:68-91`), fixing up all other (relative) keys so cor_/expr_ keys still work,
4. runs the actual `bpy.ops` exporter.

⚠️ This is **destructive to the live human** — there is no copy made. Post-export, the livekey
system is dead for that human (see Fact 1 / H1). The corrective and expression keys survive.

---

## 3. A2 — Characterization of every body lever

### 3.1 The complete lever inventory (from preset JSON + livekey tree + source)

A preset's `keys` section (e.g. `models\male\Caucasian\David.json`) enumerates the full morph
state. Grouped:

| Group | Keys | Mechanism | Range (API / UI) |
|---|---|---|---|
| **Main body macros** (gendered) | `overweight`, `muscular`, `skinny` | sparse npz livekey → permanent key | hard ±10; UI soft 0..1 (`value_positive_limited`); randomizer uses uniform(0,1) (`body.py:78-83`) |
| **Height** | `height_150`, `height_200` | npz livekey + armature/eye/teeth refit | driven via `height.set(cm)`, 150–200 cm mapped piecewise (see 3.2) |
| **Torso** | Belly Size, Breast Size, Chest Height, Chest Width, Hips Height, Hips Size, Shoulder Width, Waist Thickness | npz livekey (shared, ungendered) | hard ±10, UI soft −1..1 (`value_limited`, `body_ui.py:112`); randomizer normal(0, 0.1–0.5) |
| **Muscles** (12, per-region) | Back, Biceps, Calves, Chest, Forearm, Hamstring, Lower Butt, Quad, Shoulder, Traps, Triceps, Upper Butt | npz livekey | same as Torso |
| **Arms** (7) | Forearm Length/Thickness, Hand Length/Thickness/Width, Upper Arm Length/Thickness | npz livekey | same |
| **Legs** (5) | Foot Length, Shin Length/Thickness, Thigh Length/Thickness | npz livekey | same |
| **Head/neck** (2) | Neck Length, Neck Thickness | npz livekey | same |
| **Special** | Stylized | npz livekey (whole-body stylization morph) | same |
| **Gender** | `Male` shape key | real shape key shipped in model | 0..1 (presets use 0 or 1) |
| **Age (body)** | `aged_young`, `aged_male`/`aged_female` | npz livekeys in `special\age` | driven by `age.set(years)`, see 3.3 |
| **Ethnicity / face presets** | `asian`, `black`, `caucasian`, `variation_1..11` | npz livekeys (`face_presets\`) | 0..1, presets mix them (e.g. caucasian=1.0) |
| **Face proportions** (~50) | nose_* (11), eye*/eyelid_* (11), lip_*/mouth (5), chin_* (4), jaw_* (3), cheek_* (3), ear_* (5), browridge_*/forehead/temple (5), muzzle_* (2), Eye Scale | npz livekeys | ±2 typical; face randomizer normal(0, 0.2–0.5) (`face.py:51-96`) |
| **Eye geometry** | Eye Depth, Eye Distance, Eye Height, Eye Scale | npz livekeys (`special\eyes`, also listed under face) | ±2 |
| **Expressions** | 99 npz files (`shapekeys\expressions\`) | materialized as `expr_*` shape keys on demand | 0..1 |
| **Pose correctives** | 12 `cor_*` keys | real shape keys, driven by bone-rotation drivers | automatic |
| **Eye look** | 8 `eyeLook*` keys | real shape keys | automatic/driver |

Body-fat and body-frame have **no dedicated lever** — they are the composite of
`overweight`/`skinny` (fat) and `muscular` + skeleton proportions (frame). There is no
bone-length/scale lever at all: **all body shape, including limb lengths, is vertex morphs; bones
follow the mesh**, never the other way around.

### 3.2 Litmus test — how the height lever produces height

`HeightSettings.set(value_cm)` (`human\height\height.py:66-105`):

1. **Piecewise mapping to one of two livekeys** (`height.py:80-85`):
   - taller than 184 cm: `value = (cm − 184) / 16`, key = `height_200`
   - shorter: `value = −((cm − 150) / 34 − 1)`, key = `height_150`
   So the base mesh is **184 cm**; `height_200` at 1.0 = 200 cm; `height_150` at 1.0 = 150 cm.
   (Both keys are ordinary sparse npz morphs — ~67,700 affected coordinate entries each, i.e.
   nearly every vertex moves.)
2. The livekey is set through the normal pipeline → delta lands in `LIVE_KEY_PERMANENT`.
3. **Armature refit** (`_correct_armature`, `height.py:131-191`): compute the morphed vertex
   positions (permanent + temp keys evaluated in numpy, not via depsgraph), then for each edit
   bone with `head_verts`/`tail_verts` properties, place head/tail at
   `centroid(tracked verts) + stored offset`. The skeleton therefore scales/repositions exactly
   with the mesh.
4. **Eye and teeth refit** (`_correct_eyes` :203, `_correct_teeth` :261): these are separate
   objects that don't share the body's shape keys, so they are *translated* to follow the
   eyeball/jaw bones, and the eyeball gets an `eyeball_size` shape key value computed from the
   measured inter-vertex eye width (verts 1109 & 7010, `height.py:210-211`).
5. Clothing re-deform (`update_human_from_key_change`, `keys.py:778-781`).
6. Height **readback** is skeletal, not mesh: head-bone tail Z − heel-bone tail Z
   (`height.py:52-63`).

So: height is *not* a scale factor — it's a full-body morph plus skeleton refit. This is why
height interacts with every other morph additively (and why measuring "height" on the mesh and
on the rig can disagree slightly — **Phase B should measure both**).

### 3.3 Age as a body lever

`AgeSettings.set(age)` (`human\age.py:47-100`) drives **five things at once** from one integer
(UI uses decades 10–70):

| Sub-lever | Formula | Mechanism |
|---|---|---|
| `aged_young` livekey | `−0.1·age + 3` for age<30, else 0 (age 10 → 2.0) | npz morph (younger face/body) |
| `aged_male`/`aged_female` + other `special/age` keys | `(age − 40)/30` for age>40, else 0 (age 70 → 1.0) | npz morph (sagging, posture) |
| Skin normal-map strength | `min((age−10)/10, 2.5)` | shader node "Normal Map".Strength |
| Skin wrinkle strength | `age_key_value × 6` | shader node "HG_Age".Strength |
| Skin color aging / cavity | `(age−30)/30` | nodes "Age_Multiply", "Cavity_Multiply" |

Current age is cached as user custom property `body["Age"]` (`age.py:32-36,100`).

### 3.4 Interactions and chaining (what gates what)

- **Everything stacks additively in one accumulator.** No livekey gates another; setting
  `overweight=1` then `muscular=1` adds both deltas. There is no blending/normalization layer.
- **Order doesn't matter for the mesh** (addition commutes) but **value bookkeeping breaks if
  `sk_values` writes fail** (the old value can't be subtracted on re-set → drift). This is the H3
  risk on Blender 5.1.
- **Gender gates content**: female humans don't see `male_*` livekeys, facial hair raises
  `NotImplementedError` for females, gendered clothing/texture trees.
- **Any livekey change re-fits**: armature, eyes, teeth, clothing (`keys.py:760-783`). If you
  bypass the API (raw foreach_set), nothing re-fits.
- **Pose correctives chain off pose**, not off body morphs (drivers on bone rotation).
- **Cloth deformation chains off body shape**: clothing stores a "Body Proportions" shape key
  computed by nearest-vertex KD-tree mapping from the body (`human\clothing\base_clothing.py:167-212`)
  and is recomputed on every key change.
- **Export destroys the morph system** (Fact 1/H1). LOD and modifier-apply also bake keys.

---

## 4. A3 — Discovery: what the tool can do that Alki isn't using

(Capabilities reported; uses intentionally NOT designed — that's post-gate work.)

### 4.1 Morph system capabilities

- **Custom morph authoring round-trip**: sculpt/edit any shape key on the body → 
  `ShapeKeyItem.save_to_library(name, category, subcategory, as_livekey=True)` writes a new npz
  into the content tree, instantly available to all humans (`keys.py:441-502`). Categories and UI
  sections are auto-discovered from folders.
- **`keys.set_from_dict` / `keys.as_dict`**: full morph state serialization — Alki could store
  avatar bodies as ~115-float JSON dicts (this *is* the preset format).
- **`load_from_npz` onto arbitrary objects** (`keys.py:678-714`): a livekey can be applied to any
  mesh with matching topology (e.g. clothing or a separately exported body copy).
- **Face presets as ethnicity mixer**: `asian`/`black`/`caucasian`/`variation_1..11` are just
  livekeys — they can be set to fractional values and mixed.
- **The `Stylized` morph**: one-key whole-body stylization (cartoon proportions).
- **Drivers on keys**: `KeySettings._add_driver` (`keys.py:804-827`) — keys can be driven by bone
  transforms (this is how correctives + the facial rig work).

### 4.2 Generation & randomization

- **`BatchHumanGenerator`** (`batch_generator\generator.py:16-124`): one-call randomized human
  with config for gender odds, preset category weights, clothing/hair/expression toggles, height
  bell curve (mean ± sd), texture resolution, hair quality. Designed for crowd/dataset generation.
- **Per-system `randomize()`**: body (`body.py:58-99`), face (subcategory-scoped, bell-curve
  option), skin, eyes (real-world eye-color distribution), hair (style + color palette), height.
  Plus per-subcategory randomization **locks** (`backend\properties\randomize_locks.py`).
- **Starting presets are just JSON** — Alki can ship its own preset library.

### 4.3 Face / expression

- **FACS-style facial rig** (`human\expression\expression.py:140-247` + `models\face_rig.json`,
  18 MB): 49 face bones with drivers onto generated shape keys on body + teeth. ARKit-compatible
  export path exists (`expression\operators.py:63-106` renames keys for ARKit).
- **99 one-click expressions** as npz morphs.
- **~50 face-proportion livekeys** in 10 anatomical subcategories + 14 ethnicity/variation morphs.

### 4.4 Appearance

- Skin: 8 universal shader levers + 10 female (makeup: foundation/blush/lipstick/eyeliner…) or
  2 male (beard/mustache shadow) levers; texture sets at 4 resolutions; SSS and underwear
  toggles. (`human\skin\skin.py`)
- Eyes: iris/sclera color, real-world-distribution randomizer. (`human\eyes\eyes.py`)
- Hair: particle hair styles (37 head styles, beards, eyebrows, eyelashes), 10 material levers,
  **haircard baking** (particle hair → game-ready card meshes + haircap, with UV atlas).
- Clothing: outfit/footwear libraries, automatic fit-to-body (KD-tree deform), pose-following
  corrective keys, pattern/color randomization, **arbitrary mesh → clothing conversion**
  (`human\clothing\add_obj_to_clothing.py`).

### 4.5 Output pipeline

- **Process pipeline** (`human\process\`): haircards → texture bake → LOD (3 levels of edge
  dissolve from precomputed edge lists) → bone/object/material renaming (JSON-driven, for engine
  naming conventions) → custom Python scripts → modifier apply → export. All steps scriptable and
  storable as **process templates** (JSON).
- **Texture baking**: all materials → PNG/JPEG/TIFF at 128–4096 px (body: color/spec/rough/normal;
  clothing, eyes, teeth, haircards).
- **Export**: FBX, OBJ, glTF (embedded/separate), GLB, Alembic. (With the destructive key-baking
  caveat from Fact 1.)
- **Rigify conversion** (`human\pose\rigify.py`): replaces the HG rig with a full Rigify IK/FK
  rig, remapping weights, drivers, and the facial rig.
- **Pose library**: 200+ poses across 22 categories.

### 4.6 Lower-level utilities worth knowing about

- `extern\blendfile.py`: a pure-Python .blend parser shipped with the addon (usable outside
  Blender).
- `common\geometry.py`: `world_coords_from_obj` (evaluates shape keys via numpy without the
  depsgraph), `build_distance_dict`/`deform_obj_from_difference` (the KD-tree cloth-fit engine —
  usable for fitting *any* mesh to the body).
- `scripts\` + `process_templates\`: user-extensible post-processing hooks that receive
  `(context, human)`.

---

## 5. Open questions / unknowns (explicit)

1. **Root cause of Fact 1 (H1 vs H2 vs H3)** — needs the Phase B diagnostic script (§1, Fact 1).
   Source analysis alone cannot tell which condition holds in Dallas's .blend.
2. **Does Blender 5.1 allow dict-writes into PropertyGroups at all** (`sk_values[name] = v`)?
   If not, even a pristine human will mis-track values on 5.1 (drift on re-setting keys, broken
   `as_dict`/`from_preset` hashes). Needs a live test (one line, in the diagnostic script).
3. **Exact body vertex count** (source implies ≥25,286) and whether topology is identical between
   genders (the `Male` key approach implies yes).
4. **Whether `update_human_from_key_change` works on a key-stripped human** (it reads
   `permanent_key` at `height.py:146` → probably raises the same KeyError → armature refit
   impossible after export). Phase B should confirm and measure what still functions.
5. **The `Male` shape key's interaction with livekeys**: livekey npz deltas are authored relative
   to which gender's basis? (The gendered `male_*`/`female_*` main morphs suggest deltas are
   gender-specific where it matters, shared where it doesn't.) Phase B: apply `Belly Size` to
   both genders and compare displacement fields.
6. **Whether the UI slider path works on Dallas's 5.1 install** (it shares the same
   `permanent_key` dependency — if it works in the UI but not via API, that alone discriminates
   H1/H2 vs H3).
7. `livekeys\special\Main\` is empty and height keys are duplicated in two folders — intentional
   or packaging artifact? (Cosmetic; affects key enumeration counts.)

---

## 6. Phase B measurement checklist (consolidated)

| # | Measurement | Discriminates / confirms |
|---|---|---|
| B1 | Run the Fact-1 diagnostic script (§1) on the failing human | H1 vs H2 vs H3 |
| B2 | `human.props.sk_values["x"]=1.0` write test on Blender 5.1 | H3 / latent 5.x breakage |
| B3 | `len(body.data.vertices)` on fresh human | exact vert count (≥25,286 predicted) |
| B4 | Fresh `from_preset` human on 5.1: does it even build? (it writes `props.hashes[...]`) | 5.x viability of generation pipeline |
| B5 | Set `Belly Size=1.0` via API on a fresh human; measure waist circumference before/after; then set back to 0 and re-measure | morph apply + bookkeeping round-trip integrity |
| B6 | `height.set(150)`, `height.set(200)`: measure rig height (bone method) vs mesh bounding box | height formula (184 base, piecewise mapping) |
| B7 | Set `muscular=1` then `overweight=1`; compare with reverse order | additive stacking / no gating |
| B8 | Export to GLB, then list body key blocks | destructive export behavior (H1 mechanism) |
| B9 | `to_shapekey()` on a livekey; confirm block name `b_{main}_...` and that driving its value moves the mesh | the workaround path for Alki |
| B10 | Apply `male_overweight.npz` raw (numpy decode → foreach_set) and diff against API-applied result | validates Alki's existing empirical decode exactly matches the official pipeline |

---

*End of Phase A findings. Phase A constraint respected: no code, content, or model changes were
made — the only artifacts created are this document and throwaway inspection scripts in
`%TEMP%\hg_inspect\` (outside the repo).*
