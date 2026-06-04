# Phase A Appendix — Detailed Subsystem Reports

> Companion to `HUMGEN_PHASE_A_FINDINGS.md`. These are the raw per-subsystem investigation
> reports (full API surfaces, mechanisms, content dependencies, parameter tables) produced during
> Phase A. File:line citations refer to the repo at `C:\Users\Dallas\Desktop\HumGen3D`.

---

## A. SKIN

**File:** `human/skin/skin.py`

### Public API — `SkinSettings` (skin.py:59)

Properties: `texture` → TextureSettings (:75), `nodes` → SkinNodes (:84), `links` → SkinLinks (:94),
`material` → Material (:104), `gender_specific` → MaleSkin | FemaleSkin (:113)

Color controls (NodeInput attributes, skin.py:65-72): `cavity_strength` (Cavity_Multiply.Factor),
`tone` (Skin_tone.1), `redness` (Skin_tone.2), `saturation` (Skin_tone.3), `normal_strength`
(Normal Map.0), `roughness_multiplier` (R_Multiply.1), `freckles` (Freckles_control.Pos2),
`splotches` (Splotches_control.Pos2)

Methods: `randomize()` (:126), `set_subsurface_scattering(bool, context)` (:168),
`set_underwear(bool, context)` (:187), `as_dict()` (:203), `set_from_dict(data, context)` (:227)

Gender-specific:
- `MaleSkin` (:32): `mustache_shadow`, `beard_shadow` (Gender_Group nodegroup inputs 2/3)
- `FemaleSkin` (:41): `foundation_amount/color`, `blush_opacity/color`, `eyebrows_opacity/color`,
  `lipstick_color/opacity`, `eyeliner_opacity/color` (all Gender_Group inputs)

`TextureSettings` (:287): `set(textureset_path)` (:295), `set_resolution("high"|"medium"|"low")`
(:331), `save_to_library(...)` (:348)

### Mechanism
All parameters are shader-node inputs on the body material (slot 0). One material with nodegroups
for tone/normal/roughness/cavity/freckles/splotches + a swappable `Gender_Group` nodegroup.
Texture system: image nodes for diffuse + PBR (roughness_spec, normal). SSS input name differs by
Blender version ("Subsurface" < 4.0, "Subsurface Weight" ≥ 4.0).

### Content
`textures/{gender}/{Default 512px|1K|4K|8K}/...png` + `PBR/` subfolder per set.

### Parameters
| Param | Range | Effect |
|---|---|---|
| tone / redness / saturation | 0+ | HSV-style skin color |
| normal_strength | 0–1+ | normal map intensity |
| roughness_multiplier | 0+ | specularity |
| freckles / splotches | 0–1 | overlay visibility |
| cavity_strength | 0–1 | cavity occlusion |
| male: mustache/beard shadow | 0+ | stubble darkness |
| female: 10 makeup params | 0–1 / RGBA | makeup |

Serialization: `as_dict()` → tone, redness, saturation, normal_strength, roughness_multiplier,
freckles, splotches, texture.set (path), cavity_strength, gender_specific{...}

Notes: `randomize()` uses 80–120% multipliers + probability lists; SSS weight is 0.01 (<4.0) or
1.0 (≥4.0) (skin.py:182-184); underwear toggle at skin.py:197-201.

---

## B. EYES

**File:** `human/eyes/eyes.py`

`EyeSettings` (:56): `iris_color` (HG_Eye_Color node), `sclera_color` (HG_Scelera_Color node),
`eye_obj` (:69), `outer_material` (slot 0, transparent shell) (:78), `inner_material` (slot 1,
iris/sclera) (:87), `randomize()` (:104), `as_dict()` (:134), `set_from_dict()` (:145)

Mechanism: two materials on the eye mesh; colors are nodegroup inputs (sRGB→linear conversion at
:161-168). No content-file dependency.

Randomization uses real-world eye-color distribution (:114-126): Brown 79%, Amber/Hazel/Green 13%,
Blue 9%, Grey 3% — with weighted hex palettes per class.

---

## C. MATERIALS (reference API)

**File:** `human/materials.py` — `MaterialSettings` (:11): `body` (:18), `clothing` (list, :27),
`teeth` (:44), `eye_outer` (:53), `eye_inner` (:62), `haircards` (:71), `haircap` (:79),
`eye_hair` (body slot 1, :88), `head_hair` (body slot 2, :92), `face_hair` (body slot 3, :96).
Read-only accessors; body object carries 4 material slots (skin/eyelash+brow/head hair/face hair).

---

## D. HAIR

**Files:** `human/hair/*.py`

### API
`HairSettings` (hair.py:30): `eyebrows`/`eyelashes`/`face_hair`/`regular_hair` sub-settings,
`particle_systems` (:87), `modifiers` (:96), `set_connected(bool)` (:111),
`children_set_hide(bool)` (:128), `remove_system_by_name` (:144),
`update_hair_shader_type("fast"|"accurate")` (:153),
`set_hair_quality("high"|"medium"|"low"|"ultralow")` (:172), `as_dict`/`set_from_dict` (:200/:214)

`BaseHair` (basehair.py:40) material levers (all `HG_Hair` nodegroup inputs): `lightness`,
`redness`, `roughness`, `salt_and_pepper`, `roots`, `root_lightness`, `root_redness`, `roots_hue`,
`fast_or_accurate`, `hue`. Plus `convert_to_haircards()` (:124), `randomize_color()` (:252).

`ImportableHair` (basehair.py:324) adds `set(preset)` (:329), `save_to_library(...)` (:424),
`remove_all()` (:461), `randomize()` (:468).

Concrete types: `RegularHairSettings` (mat slot 2), `FacialHairSettings` (mat slot 3, male only —
raises NotImplementedError for females, face_hair.py:25-28), `EyebrowSettings` (mat slot 1, cycles
particle systems, active tracked in `rig["ACTIVE_EYEBROWS"]`), `EyelashSettings` (mat slot 1).

### Mechanism
Hair = Blender particle systems on the body mesh; vertex groups control density/length per system.
Styles are stored as JSON metadata + .blend (a copy of HG_Body carrying the particle systems);
loading morphs that donor body to the current body shape and transfers the particle systems
(basehair.py:505-522). Haircard conversion samples evaluated particles, simplifies with RDP,
builds quad-strip card meshes with UV atlas zones + haircap meshes (haircards.py).

### Content
`hair/head/{male|female}/{category}/{name}.json+.blend`, `hair/face_hair/{category}/...`,
`hair/haircards/` (zone json, materials, haircap blends).

---

## E. CLOTHING

**Files:** `human/clothing/*.py`

### API
`ClothingSettings` (clothing.py:20): `.outfit` / `.footwear` / `as_dict` / `set_from_dict`
`BaseClothing` (base_clothing.py:67): `set(preset, context)` (:79), `deform_cloth_to_human` (:167),
`add_obj(obj, cloth_type, ...)` (:132), `remove()` (:214), `save_to_library(...)` (:239),
`set_texture_resolution(...)` (:290), `randomize_colors(...)` (:346), `as_dict()` (:397),
`pattern` → `PatternSettings` (pattern.py:53): `set(preset, obj)`, `set_random(obj)`, `remove(obj)`

### Mechanism (the cloth-fit engine)
1. `build_distance_dict(body_coords, cloth_coords)` (common/geometry.py:124-141): KD-tree of body
   verts; per cloth vert store (closest body vert index, offset vector).
2. On load / on body change: `deform_obj_from_difference()` re-evaluates the body (with shape keys)
   and moves each cloth vert to follow its anchor → stored as a "Body Proportions" shape key on
   the cloth at value 1.0.
3. Corrective shape keys (add_obj_to_clothing.py:59-93): per cloth type (pants/top/full/footwear),
   creates cor_* keys on the cloth mirroring the body's correctives, with drivers copied so cloth
   follows pose.
4. Weight transfer: nearest-vertex data_transfer of body vertex groups + armature modifier.
5. Geometry masks: cloth carries `mask_*` custom props → MASK modifiers on the body hide covered
   skin.

### Content
`outfits/{gender}/{category}/{item}.blend`, `footwear/...`, `outfits/textures/...`,
`patterns/{category}/*.png`. Config JSONs in the addon: `corrective_sk_names_v2.json`,
`colorgroups.json`.

Notable: arbitrary mesh → clothing conversion (`add_obj`), clipping detection
(`_calc_percentage_clipping_vertices`, base_clothing.py:581-632), cross-gender saving.

---

## F. POSE

**Files:** `human/pose/pose.py`, `rigify.py`

### API
`PoseSettings` (pose.py:34): `set(preset, context)` (:46), `reset()` (:151),
`save_to_library(...)` (:104), `as_dict()` (:143), `get_posebone_by_original_name(name)` (:89),
`rigify` → `RigifySettings` (rigify.py:17): `generate(context)` (:25), `is_rigify` (:21)

### Mechanism
Poses are .blend files containing an `HG_Pose` armature; applying = import, match bone rolls and
rotation modes, copy/paste pose buffer, delete donor (pose.py:157-262). Bones are addressable by
semantic name via the `original_name` custom property regardless of renaming (incl. after Rigify).
Rigify generation replaces the HG rig wholesale: regenerates weights names (DEF- prefix), redirects
armature modifiers, fixes shape-key drivers, relinks the facial rig (rigify.py:40-199).

Pose hashing (pose.py:264-302) excludes eye/facial bones — used to detect "has been posed".

### Content
`poses/{category}/{name}.blend` (22 categories, incl. 16 DPL third-party).

---

## G. EXPRESSION

**File:** `human/expression/expression.py`

### API
`ExpressionSettings` (:78): `set(preset)` (:103) — 1-click expression from npz;
`load_facial_rig(context)` (:140); `remove_facial_rig()` (:162); `has_facial_rig` (:90);
`keys` (:94) — filtered expression keys.

### Mechanism
- 1-click: npz (same sparse format) → `keys.load_from_npz()` → shape key `expr_<name>` at 1.0,
  all other expr_ keys zeroed.
- Facial rig: 49 FACS-style bones (list at :24-75); `models/face_rig.json` (18 MB) holds per-key
  sparse coordinates + driver definitions for body AND lower teeth; loading creates the shape keys
  and wires drivers from bone transforms (:219-247). Removal hides bones and removes drivers
  before keys (local crash-fix patch).
- ARKit prep operator renames keys to ARKit convention and strips drivers
  (expression/operators.py:63-106).

### Content
`shapekeys/expressions/{category}/*.npz` (99 files), `models/face_rig.json`.

---

## H. FACE

**File:** `human/face/face.py`

`FaceSettings` (:20): `keys` (:27) = `human.keys.filtered("face_proportions")`,
`reset(context)` (:36), `randomize(subcategory="all", use_bell_curve=False, use_locks=False)`
(:51). Randomization: normal distribution, σ=0.2 for "distance" keys, σ=0.5 otherwise; respects
per-subcategory locks; batch-applies via `set_without_update` + one
`update_human_from_key_change`.

Face keys are the same livekey mechanism as body keys — only the category folder differs.

---

## I. PROCESS / EXPORT / BAKE / LOD / BATCH

**Files:** `human/process/*.py`, `batch_generator/*.py`

### ProcessSettings (process.py:73)
Properties: `baking` (:80), `lod` (:89), `has_haircards` (:98), `was_baked` (:107), `is_lod`
(:116), `rig_renamed` (:125), `parts_were_renamed` (:134).
Methods: `rename_bones_from_json` (:142), `rename_objects_from_json` (:189),
`rename_materials_from_json` (:241), `save_settings_to_template` (:288),
`set_settings_from_template` (:388).

### Process pipeline (operators.py:51-188) — 8 optional stages
haircards → texture bake → LOD → bone rename → object/material rename → custom scripts →
modifier apply → output (replace / duplicate / export). All stages configurable and storable as
process templates (`process_templates/` JSON).

### ExportBuilder (export.py:97)
`to_fbx` (:102), `to_obj` (:135), `to_gltf_embedded` (:190), `to_gltf_separate` (:200), `to_glb`
(:246), `to_abc` (:256). All run through the `@exporter` wrapper (:26-93) which **bakes and
deletes** Male/LIVE_KEY_PERMANENT/LIVE_KEY_TEMP_* keys (destructive — see main findings Fact 1)
and removes the outer eye material.

### BakeSettings (bake.py:69)
`bake_all(folder, samples, context)` (:232), `bake_single_texture` (:267), resolutions 128–4096px
per object class, passes: body (color/spec/rough/normal), eyes (color), teeth (color/rough/normal),
clothing (color/rough/normal), haircards (+alpha). Forces Cycles during bake; builds `*_BAKED`
materials afterwards.

### LodSettings (lod.py:19)
`set_body_lod(0|1|2)` (:25) — dissolves precomputed edge sets (edges.json / collar_edges.json /
lod2.json); irreversible. `set_clothing_lod(decimate_ratio=0.15, ...)` (:74).

### BatchHumanGenerator (generator.py:16)
Config: gender chances, preset category weights, clothing/expression/hair toggles + types,
height bell curve (mean/sd per gender), texture resolution, hair quality.
`generate_human(context, pose_type)` (:50): preset → body/face/skin/eyes randomize → hair →
height → clothing → pose → expression. Marker system (`hg_batch_marker` custom prop) places
humans at empties in the scene.

### Scripts system
`scripts/` (content dir) + `scripts/preset_scripts/` (addon): Python files with
`main(context, human)` signature, auto-discovered, args parsed from AST/annotations.
Shipped: `remove_all_rig_elements.py` (strips rig/correctives/drivers → plain mesh),
`bake_alpha_into_baked_haircards.py` (RGBA pack for game engines).

---

## J. BACKEND / CONTENT PACKS / PROPERTIES / UI

### Content packs (backend/content/content_packs.py)
`.hgpack` = zip with `content_packs/<name>.json` manifest (config: pack_name, creator,
pack_version, weblink; categs: which content types it contains; files: extracted file list).
Install = unzip into content dir + record files (:310-335); uninstall = delete recorded files
(:526-598); `cpacks_refresh()` (:457-481) rescans `content_packs/*.json`.

### Preferences (backend/preferences/preference_props.py)
`filepath_` — THE content root (everything resolves against it); `tab_name`; `sss_by_default`;
update checker settings; `dev_tools`; `debug_mode`; `silence_all_console_messages`;
`skip_url_request`; `is_trial`.

### Scene properties (`scene.HG3D`, backend/properties/scene_main_properties.py)
Subgroups: `.pcoll` (content selection enums), `.ui` (panel open/close + phase), `.custom_content`
(saving UI state), `.batch`, `.locks` (randomize locks), `.process`. Direct props: `gender`,
`human_height` (proxies HeightSettings), `age` (proxies AgeSettings), `skin_sss`,
`underwear_switch`, `update_exception`, `load_exception`.

### Object properties (`object.HG`, backend/properties/object_props.py)
`ishuman`, `gender`, `body_obj` (PointerProperty), `batch_result`, `sk_values` (empty
PropertyGroup used as dict), `hashes` (same), `version`, `length`, `backup` (legacy),
`active_human_preset`, `phase`.

### Preview collections (backend/preview_collections.py:22-36)
Content discovery = folder walking with per-type config (extension, gender split, folder,
category prop, search prop). Registry covers: humans, pose, outfit, footwear, hair, face_hair,
expression, pattern, texture, scripts, process_templates, shapekeys, livekeys.

### Callbacks (backend/callback.py)
msgbus subscription on active-object change → syncs UI toggles to the selected human's actual
state; tab-change hooks refresh content lists.

### Auto-registration (backend/auto_classes.py:25-51)
Walks all addon .py files, collects bpy classes, registers in `_register_priority` order
(preferences first, property groups, then everything).

### Common utilities (common/)
`@injected_context` (auto-fills `context=bpy.context`), `@verify_addon` (checks filepath/content),
`geometry.py` (world_coords_from_obj with shape-key evaluation, KD-tree distance dicts),
`drivers.py` (build_driver_dict), `math.py` (centroid, normalize), `memory_management.py`
(hg_delete, remove_broken_drivers), `context.py` (context_override), `exceptions.py`
(HumGenException).

### UI → API mapping
Body panel (user_interface/main_panel/body_ui.py): sliders draw `key.draw_prop(section,
"value_limited")` (:112) → the `BpyLiveKey.value_limited` FloatProperty (soft −1..1) → same
get/set functions as `.value`. Main macros use `value_positive_limited` elsewhere. Randomize/reset
buttons call `hg3d.random_value` / `hg3d.reset_values` operators → `human.body.randomize()` /
`reset_values()`.
