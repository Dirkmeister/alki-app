# ═══════════════════════════════════════════════════════════
# ALKI — HumGen3D Base Body Generator  (v7.0 — underwear overlay, body-only)
# ═══════════════════════════════════════════════════════════
# Generates ONE Alki base mesh per run and exports a GLB the browser drives in
# real time via morphTargetInfluences. Builds the FOUR-base matrix:
# {male,female} × {lean,heavy}, each exposing the SAME 14 canonical shape-key
# names (13 originals + body_mass).
#
# ─── v7.0 (2026-06-04): BODY-ONLY MESH + baked UNDERWEAR texture overlay ───
# Changes vs v6.2:
#   • skin.set_underwear(True): HumGen paints its default underwear into the
#     skin shader (briefs for male, bra + briefs for female).
#   • That underwear layer is BAKED to a clean overlay map — a neutral-white
#     body with only the dark underwear region — via the Underwear_Opacity
#     mask. NO other skin detail (freckles / age / PBR / albedo) is retained;
#     this single 1K JPEG is the only texture in the GLB. The app tints the
#     white body to skin tone at runtime and the underwear rides on top.
#   • Eyes and Teeth objects are DELETED. They are not part of the body base
#     and render as broken geometry without face textures. The premium Avaturn
#     head replaces the face later.
#   • All faces collapse to ONE material slot -> a single clean GLB primitive.
#   • Export carries materials + the one JPEG underwear map (v6 exported NONE).
# Everything else is unchanged from v6.x: the npz-direct morph bake (no livekey
# .value API — see HUMGEN_PHASE_B_REPORT.md, H1), the 14 canonical keys, the
# two-base heavy strategy (heavy neutral = basis + overweight; bf_low carries
# it back down), and the heavy depth gate.
#
# RUN (either way):
#   • Scripting workspace, Alt+P (open the system console first), OR
#   • blender --background --python blender_scripts/build_humgen_body.py -- <gender> <body_type>
# Run it FOUR times. After each:
#   python blender_scripts/check_glb.py public/alki_humgen_<g>_<t>.glb <type>

import bpy
import os
import sys
import numpy as np

# ── EDIT THESE TWO PER RUN (or pass as CLI args after `--`) ──────────
GENDER = "male"        # "male" | "female"
BODY_TYPE = "lean"     # "lean" | "heavy"

if "--" in sys.argv:
    _cli = sys.argv[sys.argv.index("--") + 1:]
    if len(_cli) >= 1 and _cli[0] in ("male", "female"):
        GENDER = _cli[0]
    if len(_cli) >= 2 and _cli[1] in ("lean", "heavy"):
        BODY_TYPE = _cli[1]

# Keep CONSTANT across all four builds so the bases share proportions
# (all ~1.78 m tall; in-pair vertex order must match).
HEIGHT_CM = 178
PRESET_INDEX = 0

HUMGEN_CONTENT_FALLBACK = r"D:\Blender-HumGen-Paid"


def _resolve_output_dir():
    try:
        repo_public = os.path.normpath(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public"))
        if os.path.isdir(repo_public):
            return repo_public
    except NameError:
        pass  # __file__ undefined in an unsaved Text Editor block
    return os.path.dirname(bpy.data.filepath) or os.path.expanduser("~")


OUTPUT_DIR = _resolve_output_dir()
OUTPUT_PATH = os.path.join(OUTPUT_DIR, f"alki_humgen_{GENDER}_{BODY_TYPE}.glb")


def get_content_root():
    """HumGen content root (where the .npz livekey files live). Read from the
    addon preference; fall back to the known install path."""
    root = None
    try:
        prefs = bpy.context.preferences.addons["HumGen3D"].preferences
        root = getattr(prefs, "filepath", None) or None
    except Exception:
        pass
    if not root or not os.path.isdir(root):
        print(f"[Alki] NOTE: HumGen filepath pref unavailable/invalid ({root!r}); "
              f"falling back to {HUMGEN_CONTENT_FALLBACK!r}")
        root = HUMGEN_CONTENT_FALLBACK
    return root


# ── Alki canonical key -> list of HumGen .npz morphs summed into it ──
# {g} expands to GENDER. Only the main/ files are gendered; Torso/, Muscles/,
# Arms/, Legs/, face_proportions/ are shared (no gender prefix). Tuples are
# (path, weight); bare strings are ×1.0.  (Unchanged from v6.2.)
ALKI_FROM_NPZ = {
    # Composition C — distributed adiposity from individual levers (NOT the
    # overweight macro, which inflates spherically). Shared files -> identical
    # composition for both sexes; only MORPH_SCALE differs (it doesn't, here).
    "body_mass": [
        ("livekeys/body_proportions/Torso/Belly Size.npz", 0.15),
        ("livekeys/body_proportions/Torso/Hips Size.npz", 0.5),
        ("livekeys/body_proportions/Torso/Waist Thickness.npz", 0.8),
        ("livekeys/body_proportions/Torso/Chest Width.npz", 0.7),
        ("livekeys/body_proportions/Torso/Breast Size.npz", 0.4),
        ("livekeys/body_proportions/Torso/Shoulder Width.npz", 0.2),
        ("livekeys/body_proportions/Legs/Thigh Thickness.npz", 1.0),
        ("livekeys/body_proportions/Arms/Upper Arm Thickness.npz", 0.8),
        ("livekeys/body_proportions/Arms/Forearm Thickness.npz", 0.4),
        ("livekeys/body_proportions/Legs/Shin Thickness.npz", 0.5),
        ("livekeys/face_proportions/cheeks/cheek_fullness.npz", 0.8),
        ("livekeys/face_proportions/jaw/jaw_width.npz", 0.4),
    ],
    "bf_low":           ["livekeys/body_proportions/main/{g}_skinny.npz"],
    "bf_high":          ["livekeys/body_proportions/Torso/Waist Thickness.npz",
                         "livekeys/body_proportions/Torso/Hips Size.npz"],
    "visceral":         ["livekeys/body_proportions/Torso/Belly Size.npz"],
    "muscle_overall":   ["livekeys/body_proportions/main/{g}_muscular.npz"],
    "muscle_chest":     ["livekeys/body_proportions/Muscles/Chest Muscles.npz"],
    "muscle_shoulders": ["livekeys/body_proportions/Muscles/Shoulder Muscles.npz",
                         "livekeys/body_proportions/Muscles/Traps Muscles.npz"],
    "muscle_arms":      ["livekeys/body_proportions/Muscles/Biceps.npz",
                         "livekeys/body_proportions/Muscles/Triceps.npz",
                         "livekeys/body_proportions/Muscles/Forearm Muscles.npz"],
    "muscle_back":      ["livekeys/body_proportions/Muscles/Back Muscles.npz"],
    "muscle_legs":      ["livekeys/body_proportions/Muscles/Quad Muscles.npz",
                         "livekeys/body_proportions/Muscles/Hamstring Muscles.npz",
                         "livekeys/body_proportions/Muscles/Upper Butt Muscles.npz",
                         "livekeys/body_proportions/Muscles/Lower Butt Muscles.npz"],
    "muscle_calves":    ["livekeys/body_proportions/Muscles/Calves Muscles.npz"],
}

# Canonical keys with no HumGen source — flat placeholders (a future
# material/normal-map pass owns water/abs_def/vascularity).
ALKI_CUSTOM_PLACEHOLDERS = ["water", "abs_def", "vascularity"]

# Per-key delta scale on the summed npz deltas.
_MUSCLE = 1.8                      # muscle_overall lands ~0.05 (band 0.035–0.075)
_BODY_MASS_SCALE = 5.3             # Composition C raw max ~0.038; ×5.3 -> ~0.20 (band 0.15–0.28)
MORPH_SCALE = {
    "muscle_overall": _MUSCLE, "muscle_chest": _MUSCLE,
    "muscle_shoulders": _MUSCLE, "muscle_arms": _MUSCLE,
    "muscle_back": _MUSCLE, "muscle_legs": _MUSCLE, "muscle_calves": _MUSCLE,
    "body_mass": _BODY_MASS_SCALE,
}

# §3.5 HEAVY base: heavy rest pose = lean basis + FRAC × overweight npz delta.
HEAVY_OVERWEIGHT_NPZ = "livekeys/body_proportions/main/{g}_overweight.npz"
HEAVY_OVERWEIGHT_FRAC = 1.0
# On HEAVY, only the whole-body adiposity-DIRECTION key overlaps the baked
# overweight: bf_low must subtract it (carries DOWN from the heavy rest pose to
# skinny). The localized keys (bf_high/visceral/muscles/body_mass = Composition
# C) contain no overweight, so nothing is subtracted.
HEAVY_RELATIVE_KEYS = {"bf_low"}
# Heavy depth gate: the exported heavy base must grow the torso band on the
# DEPTH axis by more than this vs the lean basis (no silent lean clone).
HEAVY_GATE_MIN_DEPTH_GAIN = 0.01


def _cf(func, *candidate_arglists):
    """Call HumGen API tolerating the (…, context) vs (…) signature variants."""
    last = None
    for args in candidate_arglists:
        try:
            return func(*args)
        except Exception as e:
            last = e
    if last:
        raise last


def load_npz_delta(content_root, rel_path, nverts):
    """Decode one HumGen livekey .npz into a dense (nverts, 3) float64 delta.
    Indices index a FLATTENED (nverts × 3) array (HUMGEN_PHASE_B_REPORT.md B10:
    byte-exact to the official loader)."""
    path = os.path.join(content_root, *rel_path.split("/"))
    if not os.path.isfile(path):
        raise FileNotFoundError(f"npz morph not found: {path}")
    d = np.load(path)
    idx = d["indices"].reshape(-1)
    rel = d["relative_coordinates"].reshape(-1)
    if idx.max() >= nverts * 3:
        raise ValueError(f"{rel_path}: index {int(idx.max())} exceeds {nverts}×3 "
                         f"— wrong mesh / vertex-order mismatch.")
    flat = np.zeros(nverts * 3, dtype=np.float64)
    flat[idx] = rel
    return flat.reshape(nverts, 3)


def read_coords(collection, n):
    buf = np.empty(n * 3, dtype=np.float32)
    collection.foreach_get("co", buf)
    return buf.reshape(n, 3).astype(np.float64)


def write_coords(collection, coords):
    collection.foreach_set("co", coords.astype(np.float32).ravel())


def generate_human(Human, gender, preset_index):
    options = list(_cf(Human.get_preset_options, (gender,), (gender, bpy.context)))
    idx = max(0, min(preset_index, len(options) - 1))
    print(f"[Alki] Using preset [{idx}]: {options[idx]}")
    return _cf(Human.from_preset, (options[idx],), (options[idx], bpy.context))


def find_body(human):
    try:
        return human.objects.body
    except Exception:
        for obj in human.children:
            if getattr(obj, "type", None) == "MESH" and obj.data.shape_keys:
                return obj
    return None


def bake_underwear_overlay(body, skin_mat, content_root, size=1024):
    """Bake HumGen's underwear layer into a clean baseColor overlay image:
    a neutral-WHITE body with only the dark underwear region.

    HumGen's underwear is NOT a separate texture — it is a procedural darkening
    of the skin driven by the Underwear_Opacity mask (fed from a channel of the
    freckle-body mask). We EMIT-bake just that mask to grayscale, then composite
    white⇄dark in numpy. No other skin detail is captured. Returns the image."""
    nt = skin_mat.node_tree
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    uw = nt.nodes.get("Underwear_Opacity")
    if uw is None:
        raise RuntimeError("Underwear_Opacity node not found — was set_underwear(True) called?")

    # Temporary EMIT setup: emission color = the underwear mask (float -> grayscale).
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(uw.outputs[0], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])

    bake_img = bpy.data.images.new("Alki_UWmask", size, size, alpha=False)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bake_img
    for n in nt.nodes:
        n.select = False
    tex.select = True
    nt.nodes.active = tex

    sc = bpy.context.scene
    prev_engine = sc.render.engine
    sc.render.engine = "CYCLES"
    try:
        sc.cycles.device = "CPU"
    except Exception:
        pass
    sc.cycles.samples = 1
    sc.render.bake.margin = 8
    bpy.ops.object.bake(type="EMIT")
    sc.render.engine = prev_engine

    px = np.empty(size * size * 4, dtype=np.float32)
    bake_img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    mask = np.clip(px[:, 0] * 2.0, 0.0, 1.0)          # underwear opacity ~0.5 -> normalize to ~1
    white = np.array([1.0, 1.0, 1.0])
    dark = np.array([0.02, 0.02, 0.028])              # near-black underwear
    rgb = white[None, :] * (1 - mask[:, None]) + dark[None, :] * mask[:, None]

    final = bpy.data.images.new(f"Alki_Underwear_{GENDER}", size, size, alpha=False)
    fp = np.empty((size * size, 4), dtype=np.float32)
    fp[:, :3] = rgb
    fp[:, 3] = 1.0
    final.pixels.foreach_set(fp.ravel())
    final.pack()
    print(f"[Alki] Underwear overlay baked ({int((mask > 0.05).mean() * 100)}% of UV).")
    return final


def build():
    print(f"\n[Alki] HumGen build v7.0 (underwear overlay, body-only) — "
          f"GENDER={GENDER} BODY_TYPE={BODY_TYPE}")
    content_root = get_content_root()
    print(f"[Alki] HumGen content root: {content_root}")

    from HumGen3D import Human
    human = generate_human(Human, GENDER, PRESET_INDEX)
    _cf(human.height.set, (HEIGHT_CM,), (HEIGHT_CM, bpy.context))
    # Paint HumGen's default underwear into the skin shader (briefs / bra+briefs).
    _cf(human.skin.set_underwear, (True,), (True, bpy.context))

    body = find_body(human)
    if body is None:
        print("[Alki] ERROR: no body object")
        return
    skin_mat = body.data.materials[0]

    # ── Delete Eyes/Teeth (and any other non-body child mesh) ──────────
    # Not part of the body base; without face textures they are broken geometry.
    deleted = []
    for ob in list(human.objects.rig.children_recursive):
        if ob is not body and ob.type == "MESH":
            deleted.append(ob.name)
            bpy.data.objects.remove(ob, do_unlink=True)
    print(f"[Alki] Deleted non-body meshes: {deleted}")

    # HumGen parents the human to its own collection; ensure the body is in the
    # active view layer so it can be selected/exported.
    bpy.ops.object.select_all(action="DESELECT")
    try:
        bpy.context.scene.collection.objects.link(body)
    except RuntimeError:
        pass
    bpy.context.view_layer.update()
    body.select_set(True)
    bpy.context.view_layer.objects.active = body

    nverts = len(body.data.vertices)
    if body.data.shape_keys is None:
        body.shape_key_add(name="Basis")
    sk = body.data.shape_keys.key_blocks
    ref_kb = body.data.shape_keys.reference_key or sk[0]

    # Basis: male uses the Male shape key (male-specific proportions); female is
    # the Basis itself (Male.value = 0). Then uniform-scale to HEIGHT_CM.
    male_kb = sk.get("Male")
    basis = read_coords(male_kb.data, nverts) if (male_kb and GENDER == "male") \
        else read_coords(ref_kb.data, nverts)
    UP = int(np.argmax(basis.max(axis=0) - basis.min(axis=0)))
    z_extent = float(basis[:, UP].max() - basis[:, UP].min())
    scale_factor = (HEIGHT_CM / 100.0) / z_extent if z_extent > 0.01 else 1.0
    centroid = basis.mean(axis=0)
    basis = centroid + (basis - centroid) * scale_factor
    print(f"[Alki] body verts: {nverts}  height-norm scale {scale_factor:.4f}")

    # Neutral rest pose: lean -> basis; heavy -> basis + FRAC × overweight.
    ow_in_neutral = None
    if BODY_TYPE == "heavy":
        ow = load_npz_delta(content_root, HEAVY_OVERWEIGHT_NPZ.format(g=GENDER), nverts)
        ow_in_neutral = ow * HEAVY_OVERWEIGHT_FRAC
        neutral = basis + ow_in_neutral
        print(f"[Alki] Heavy neutral = basis + {HEAVY_OVERWEIGHT_FRAC}×overweight "
              f"(max Δ {float(np.linalg.norm(ow, axis=1).max()):.4f}).")
    else:
        neutral = basis.copy()
    ext = neutral.max(axis=0) - neutral.min(axis=0)
    DEPTH = int(np.argmin(ext))

    # ── Bake each of the 14 canonical keys from its npz source(s) ──────
    np_deltas = {}
    created = []
    for alki_key, sources in ALKI_FROM_NPZ.items():
        total = np.zeros((nverts, 3), dtype=np.float64)
        for src in sources:
            if isinstance(src, tuple):
                rel, weight = src[0].format(g=GENDER), src[1]
            else:
                rel, weight = src.format(g=GENDER), 1.0
            total += load_npz_delta(content_root, rel, nverts) * weight
        delta = total * MORPH_SCALE.get(alki_key, 1.0)
        if ow_in_neutral is not None and alki_key in HEAVY_RELATIVE_KEYS:
            delta = delta - ow_in_neutral      # carries down from the heavy rest pose
        kb = body.data.shape_keys.key_blocks.get(alki_key) \
            or body.shape_key_add(name=alki_key, from_mix=False)
        write_coords(kb.data, basis + delta)
        kb.value = 0.0
        np_deltas[alki_key] = delta
        created.append(alki_key)

    for key in ALKI_CUSTOM_PLACEHOLDERS:
        if body.data.shape_keys.key_blocks.get(key) is None:
            kb = body.shape_key_add(name=key, from_mix=False)
            write_coords(kb.data, basis)            # flat: zero delta
        np_deltas[key] = np.zeros((nverts, 3), dtype=np.float64)
        created.append(key)
    print(f"[Alki] Created {len(created)} canonical keys.")

    # ── Rebase keys onto neutral; bake neutral into Basis + mesh verts ──
    sk = body.data.shape_keys.key_blocks
    basis_kb = body.data.shape_keys.reference_key or sk[0]
    for k in created:
        write_coords(sk.get(k).data, neutral + np_deltas[k])
    write_coords(basis_kb.data, neutral)
    write_coords(body.data.vertices, neutral)
    body.data.update()

    keep = set(created) | {"Basis", basis_kb.name}
    for name in [kb.name for kb in sk if kb.name not in keep]:
        kb = body.data.shape_keys.key_blocks.get(name)
        if kb is not None:
            body.shape_key_remove(kb)
    print(f"[Alki] Shape keys remaining: "
          f"{[kb.name for kb in body.data.shape_keys.key_blocks]}")

    # ── HARD GATE: heavy base must actually be heavy (DEPTH-axis torso band) ──
    if BODY_TYPE == "heavy":
        def torso_band_depth(coords):
            up = coords[:, UP]
            lo, hi = float(up.min()), float(up.max())
            span = (hi - lo) or 1.0
            band = ((up - lo) / span >= 0.45) & ((up - lo) / span < 0.82)
            return float(coords[band, DEPTH].max() - coords[band, DEPTH].min()) if band.any() else 0.0
        final_d = torso_band_depth(read_coords(body.data.vertices, nverts))
        lean_d = torso_band_depth(basis)
        print(f"[Alki] FINAL torso-band depth = {final_d:.3f} "
              f"(lean {lean_d:.3f}, gate +{HEAVY_GATE_MIN_DEPTH_GAIN})")
        if final_d <= lean_d + HEAVY_GATE_MIN_DEPTH_GAIN:
            raise RuntimeError(
                f"Heavy bake produced a NON-heavy base (depth {final_d:.3f} "
                f"<= lean {lean_d:.3f} + {HEAVY_GATE_MIN_DEPTH_GAIN}). Refusing to "
                f"export a lean clone.")

    # ── Underwear overlay: bake the only retained texture ──────────────
    overlay = bake_underwear_overlay(body, skin_mat, content_root)
    uwmat = bpy.data.materials.new("Alki_Skin_UW")
    uwmat.use_nodes = True
    unt = uwmat.node_tree
    bsdf = next(n for n in unt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = unt.nodes.new("ShaderNodeTexImage")
    tex.image = overlay
    unt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    body.data.materials.clear()
    body.data.materials.append(uwmat)
    # Collapse all faces to slot 0 -> a single GLB primitive.
    body.data.polygons.foreach_set("material_index", [0] * len(body.data.polygons))

    # Strip vertex colors (renderer disables them; dead weight).
    try:
        while body.data.color_attributes:
            body.data.color_attributes.remove(body.data.color_attributes[0])
    except Exception:
        pass

    # ── Export (body-only; carries the one underwear JPEG) ─────────────
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH, export_format="GLB", use_selection=True,
        export_yup=True, export_apply=False, export_morph=True,
        export_morph_normal=False, export_skins=False, export_animations=False,
        export_materials="EXPORT", export_image_format="JPEG",
    )
    print(f"[Alki] Exported → {OUTPUT_PATH}")
    print("[Alki] DONE. Now run: "
          f"python blender_scripts/check_glb.py \"{OUTPUT_PATH}\" {BODY_TYPE}")


if __name__ == "__main__":
    build()
