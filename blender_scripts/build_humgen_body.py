# ═══════════════════════════════════════════════════════════
# ALKI — HumGen3D Base Body Generator  (v6.1 — npz-direct + chest taper)
# ═══════════════════════════════════════════════════════════
# v6.1 (2026-06-03): body_mass chest taper (gyno fix) + scale 3.0 → 3.5; see
# the CHEST_TAPER_* block. CLI override:  ... -- <gender> <body_type>
# v6.2 (2026-06-03): chest taper is MALE-only; female bases keep full chest.
# Generates ONE Alki base mesh per run and exports a GLB the browser drives
# in real time via morphTargetInfluences. v6 builds the FOUR-base matrix
# (Avatar Range, Stages 2-3): {male,female} × {lean,heavy}, each exposing
# the SAME 14 canonical shape-key names (the 13 originals + `body_mass`).
#
# ─── WHAT'S NEW IN v6 vs v5: NO MORE LIVEKEY .value API ─────────────────
# ROOT CAUSE of every recent failure: on Blender 5.1 + HumGen 4.0.x, setting
# livekey.value never commits (LIVE_KEY_PERMANENT is unresolvable on a
# scripted human), so every key read back the SAME residual deformation —
# that's why all muscle keys and all fat keys came out byte-identical with
# cosine 1.0.
#
# THE FIX: HumGen morphs are static .npz files on disk under the addon's
# content root (<root>/livekeys/...). v6 reads them DIRECTLY — no slider,
# no commit, no depsgraph evaluation. Each .npz holds:
#   indices              int64 (1, M) — indices into a flattened (nverts×3) array
#   relative_coordinates float64 (M,) — the per-component offsets
# Decoding them to a dense (nverts, 3) delta reproduces the morph exactly
# (verified: overweight max Δ 0.0681 / 23748 nonzero verts, belly grows on
# the depth axis — identical to what to_shapekey() produced).
#
# Each Alki key stores  kb.co = basis + Σ(npz deltas) × scale, with the
# neck-seam band zeroed, then everything is rebased onto this base's neutral
# (heavy bases bake 1.0×overweight into the neutral). The deltas are exact,
# isolated, and version-proof.
#
# RUN (either way):
#   • Scripting workspace, Alt+P (open the system console first), OR
#   • headless:  blender --background --python blender_scripts/build_humgen_body.py
# Run it FOUR times, editing GENDER + BODY_TYPE each time. After each run:
#   python blender_scripts/check_glb.py public/alki_humgen_<g>_<t>.glb <type>

import bpy
import os
import sys
import numpy as np

# ── EDIT THESE TWO PER RUN ───────────────────────────────────────────
GENDER = "male"        # "male" | "female"
BODY_TYPE = "heavy"    # "lean" | "heavy"

# Optional headless override (no file editing needed between runs):
#   blender --background --python blender_scripts/build_humgen_body.py -- <gender> <body_type>
if "--" in sys.argv:
    _cli = sys.argv[sys.argv.index("--") + 1:]
    if len(_cli) >= 1 and _cli[0] in ("male", "female"):
        GENDER = _cli[0]
    if len(_cli) >= 2 and _cli[1] in ("lean", "heavy"):
        BODY_TYPE = _cli[1]

# Keep these CONSTANT across all four builds so the bases share proportions
# (spec §3.4: all ~1.8 units tall; in-pair vertex order must match).
HEIGHT_CM = 178
PRESET_INDEX = 0

# Output: prefer <repo>/public next to this script (works headless), else the
# .blend's folder (works from the Scripting workspace), else home.
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

# ── HumGen content root (where the .npz livekey files live) ─────────
# Read from the addon preference; fall back to the known install path.
# Do NOT hardcode the pref value — it is machine-specific.
HUMGEN_CONTENT_FALLBACK = r"D:\Blender-HumGen-Paid"

def get_content_root():
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
# {g} expands to GENDER. Only the main/ files are gendered; Torso/ and
# Muscles/ morphs are shared (no gender prefix).
# Redundancy collapse (2026-05-29): the gross-mass envelope lives in ONE key,
# body_mass (overweight); bf_high is flank deposition (waist+hips), visceral
# is belly-forward — three genuinely distinct adiposity shapes.
ALKI_FROM_NPZ = {
    "body_mass":        ["livekeys/body_proportions/main/{g}_overweight.npz"],
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

# Canonical keys with no HumGen source — created as flat placeholders
# (material/normal-map pass is out of scope; spec §1.1).
ALKI_CUSTOM_PLACEHOLDERS = ["water", "abs_def", "vascularity"]

# §3.5 — HEAVY base: the heavy rest pose is built as GEOMETRY:
#     heavy neutral = lean basis + HEAVY_OVERWEIGHT_FRAC × overweight_npz_delta
# FRAC = 1.0 (verified: 0.5× grows torso depth only +0.011, too subtle; full
# overweight grows it ~+0.022 for a genuinely heavy base).
HEAVY_OVERWEIGHT_NPZ = "livekeys/body_proportions/main/{g}_overweight.npz"
HEAVY_OVERWEIGHT_FRAC = 1.0

# On the HEAVY base, keys are extracted relative to neutral — meaning each key
# subtracts the part of its OWN target shape already baked into neutral (the
# overweight delta). Only the whole-body adiposity-DIRECTION keys overlap with
# the heavy neutral:
#   • body_mass targets lean + scale×tapered_overweight → delta = scale×tap_ow − FRAC×ow
#     (the marginal push UP from an already-heavy rest pose)
#   • bf_low    targets lean + skinny         → delta = skinny − FRAC×ow
#     (carries DOWN: removes the heavy fat AND continues to skinny)
# The localized keys (bf_high/visceral/muscles) contain NO overweight in their
# sources, so nothing is subtracted — they stay pure npz × scale.
# (Subtracting ow from EVERY key was tested offline 2026-06-02 and fails
# check_glb: the shared −ow term makes cos(body_mass, visceral) = −0.93
# (clone gate), cos(muscle_chest, muscle_legs) = +0.93, and pushes
# muscle_overall to 0.088 — out of its 0.035–0.075 band.)
HEAVY_RELATIVE_KEYS = {"body_mass", "bf_low"}

# §3.3 muscle re-sculpt + §3.2 body_mass magnitude — per-key delta scale.
# EXACT vectorized multiply on the summed npz deltas:
#   • muscle keys ×1.8 → muscle_overall max ~0.051 (band 0.035–0.075).
#   • body_mass scale is GENDER-SPECIFIC (both land just above the lean band
#     floor of 0.15):
#       male   ×3.5  — the chest TAPER (see below) removes the peak that used
#                      to set max-disp, so the scale is raised from 3.0 to keep
#                      the BELLY-driven max in band: lean 0.152, heavy 0.102.
#                      Chest still drops 0.204 → 0.072 (−65%); gyno fix holds.
#       female ×3.75 — no taper, but female_overweight.npz is intrinsically
#                      weaker (raw max 0.0405 vs male 0.0681): ×3.5 only
#                      reached 0.142 (failed the lean band). ×3.75 → 0.152.
_MUSCLE = 1.8
_BODY_MASS_SCALE = {"male": 3.5, "female": 3.75}
MORPH_SCALE = {
    "muscle_overall": _MUSCLE, "muscle_chest": _MUSCLE,
    "muscle_shoulders": _MUSCLE, "muscle_arms": _MUSCLE,
    "muscle_back": _MUSCLE, "muscle_legs": _MUSCLE, "muscle_calves": _MUSCLE,
    "body_mass": _BODY_MASS_SCALE[GENDER],
}

# ── body_mass CHEST TAPER (male gynecomastia fix, 2026-06-03) ────────
# Root cause: male_overweight's largest displacement is on the CHEST (the
# global-max vertex sits at height-fraction 0.629), so amplifying it ×3+
# turned chest fat into breasts. Fix: a vertical smoothstep falloff applied to
# the overweight delta BEFORE the body_mass scale — belly/hips keep full
# strength, the chest keeps only CHEST_TAPER_FLOOR of its displacement.
# Applies ONLY to body_mass's overweight source: muscle keys, bf_low, bf_high,
# visceral, and the heavy NEUTRAL (rest pose) are untouched.
# MALE ONLY (2026-06-03): on female bases the taper is skipped entirely —
# full chest volume is anatomically correct there. If female heavy reads as
# excessive after the visual A/B, add a gentler female taper (e.g. floor 0.5).
# Height fraction is computed from the BASIS positions on the detected UP axis.
CHEST_TAPER_LO = 0.52      # full strength at/below this height fraction
CHEST_TAPER_HI = 0.66      # taper floor reached at/above this
CHEST_TAPER_FLOOR = 0.20   # fraction of displacement surviving in the chest


def chest_taper_weights(height_frac):
    """Per-vertex taper weight (1.0 below the chest, smoothstep down to
    CHEST_TAPER_FLOOR across the chest band). Vectorized over (nverts,)."""
    t = np.clip((height_frac - CHEST_TAPER_LO)
                / (CHEST_TAPER_HI - CHEST_TAPER_LO), 0.0, 1.0)
    s = t * t * (3.0 - 2.0 * t)          # smoothstep
    return 1.0 - s * (1.0 - CHEST_TAPER_FLOOR)

# Neck-seam band (spec §1.3/§3.7 #6): no morph may move this band; it is the
# head-attach reserve. The band is measured on the detected UP axis (largest
# extent — raw HumGen mesh is Z-up, ~1.8 units; glTF export turns that into +Y).
NECK_SEAM_BAND = (1.51, 1.53)

# Heavy gate: the exported heavy base must grow the torso band on the DEPTH
# axis by more than this vs lean. At FRAC=1.0 overweight grows depth ~+0.022,
# so gate at +0.01 (the old +0.02 failed even a correct bake).
HEAVY_GATE_MIN_DEPTH_GAIN = 0.01


def import_humgen():
    from HumGen3D import Human
    return Human


def call_flexible(func, *candidate_arglists):
    last = None
    for args in candidate_arglists:
        try:
            return func(*args)
        except Exception as e:
            last = e
    if last:
        raise last


def generate_human(Human, gender, preset_index):
    options = list(call_flexible(
        Human.get_preset_options, (gender,), (gender, bpy.context)))
    idx = max(0, min(preset_index, len(options) - 1))
    print(f"[Alki] Using preset [{idx}]: {options[idx]}")
    return call_flexible(Human.from_preset, (options[idx],),
                         (options[idx], bpy.context))


def find_body(human):
    try:
        return human.objects.body
    except Exception:
        for obj in human.children:
            if getattr(obj, "type", None) == "MESH" and obj.data.shape_keys:
                return obj
    return None


def load_npz_delta(content_root, rel_path, nverts):
    """Decode one HumGen livekey .npz into a dense (nverts, 3) float64 delta.

    indices index into a FLATTENED (nverts × 3) coordinate array, so the
    decode is: scatter relative_coordinates into a flat zero array, reshape.
    Raises with a clear message if the file is missing or the mesh is too
    small for the stored indices (vertex-order mismatch)."""
    path = os.path.join(content_root, rel_path)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"npz morph not found: {path}")
    d = np.load(path)
    idx = d["indices"].reshape(-1)
    rel = d["relative_coordinates"].reshape(-1)
    if idx.max() >= nverts * 3:
        raise ValueError(
            f"{rel_path}: max flat index {int(idx.max())} exceeds mesh size "
            f"{nverts}×3={nverts * 3} — wrong mesh / vertex-order mismatch.")
    flat = np.zeros(nverts * 3, dtype=np.float64)
    flat[idx] = rel
    return flat.reshape(nverts, 3)


def read_coords(collection, n):
    """foreach_get 'co' from a vertex/shape-key-point collection -> (n,3) float64."""
    buf = np.empty(n * 3, dtype=np.float32)
    collection.foreach_get("co", buf)
    return buf.reshape(n, 3).astype(np.float64)


def write_coords(collection, coords):
    """foreach_set 'co' on a vertex/shape-key-point collection from (n,3) array."""
    collection.foreach_set("co", coords.astype(np.float32).ravel())


def strip_vertex_colors(mesh):
    """Remove COLOR_0 / vertex-color layers (renderer disables them)."""
    removed = 0
    try:
        while mesh.color_attributes:
            mesh.color_attributes.remove(mesh.color_attributes[0])
            removed += 1
    except Exception:
        pass
    try:
        while getattr(mesh, "vertex_colors", None):
            mesh.vertex_colors.remove(mesh.vertex_colors[0])
            removed += 1
    except Exception:
        pass
    return removed


def build():
    print(f"\n[Alki] HumGen build v6.2 (npz-direct + male chest taper) — "
          f"GENDER={GENDER} BODY_TYPE={BODY_TYPE}")
    content_root = get_content_root()
    print(f"[Alki] HumGen content root: {content_root}")

    Human = import_humgen()
    human = generate_human(Human, GENDER, PRESET_INDEX)
    call_flexible(human.height.set, (HEIGHT_CM,), (HEIGHT_CM, bpy.context))

    body = find_body(human)
    if body is None:
        print("[Alki] ERROR: no body object")
        return

    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body

    # ── Basis + neutral ────────────────────────────────────────────────
    # basis   = Basis shape key coords (the lean rest pose, raw mesh space —
    #           the SAME space the npz deltas are authored in).
    # neutral = THIS base's rest pose (becomes the exported Basis via rebase):
    #             lean  -> basis
    #             heavy -> basis + FRAC × overweight npz delta
    nverts = len(body.data.vertices)
    if body.data.shape_keys is None:
        body.shape_key_add(name="Basis")
    ref_kb = body.data.shape_keys.reference_key or body.data.shape_keys.key_blocks[0]
    basis = read_coords(ref_kb.data, nverts)
    print(f"[Alki] body verts: {nverts}")

    ow_in_neutral = None  # the overweight delta baked into the heavy neutral
    if BODY_TYPE == "heavy":
        ow_rel = HEAVY_OVERWEIGHT_NPZ.format(g=GENDER)
        ow_delta = load_npz_delta(content_root, ow_rel, nverts)
        ow_in_neutral = ow_delta * HEAVY_OVERWEIGHT_FRAC
        neutral = basis + ow_in_neutral
        ow_max = float(np.linalg.norm(ow_delta, axis=1).max())
        ow_nonzero = int((np.linalg.norm(ow_delta, axis=1) > 1e-12).sum())
        print(f"[Alki] Heavy neutral = basis + {HEAVY_OVERWEIGHT_FRAC}×overweight "
              f"({ow_rel}: max Δ {ow_max:.4f}, {ow_nonzero}/{nverts} nonzero verts).")
    else:
        neutral = basis.copy()

    # Rest-pose extents + axis detection. UP = largest extent (raw HumGen mesh
    # is Z-up ~1.8); DEPTH = smallest extent (front-to-back, ~0.39 — the axis
    # overweight thickens); the remaining axis is width (~1.19).
    ext = neutral.max(axis=0) - neutral.min(axis=0)
    UP = int(np.argmax(ext))
    DEPTH = int(np.argmin(ext))
    print(f"[Alki] Rest extents (X,Y,Z): basis="
          f"{tuple(round(float(v), 3) for v in (basis.max(axis=0) - basis.min(axis=0)))}  "
          f"neutral={tuple(round(float(v), 3) for v in ext)}  "
          f"-> UP='{'xyz'[UP]}', DEPTH='{'xyz'[DEPTH]}'")

    # ── Neck-seam vertex set (spec §1.3/§3.7 #6) ──────────────────────
    # Lock the head-attach reserve so NO morph disturbs the neck seam. Picked
    # from `neutral` (the exported Basis) on the detected UP axis — the same
    # band check_glb step [8] measures on the exported file.
    nlo, nhi = NECK_SEAM_BAND
    seam_mask = (neutral[:, UP] >= nlo) & (neutral[:, UP] <= nhi)
    n_seam = int(seam_mask.sum())
    print(f"[Alki] Neck-seam lock: up-axis '{'xyz'[UP]}', band [{nlo},{nhi}] "
          f"holds {n_seam}/{nverts} verts (zeroed in every morph).")
    if n_seam == 0:
        print("[Alki]   !! WARNING: no verts in the seam band — mesh scale/axis "
              "differs from the 1.8-unit reference; inspect before trusting.")

    # ── Chest-taper weights (MALE body_mass only — see CHEST_TAPER_* note) ──
    up_b = basis[:, UP]
    height_frac = (up_b - up_b.min()) / ((up_b.max() - up_b.min()) or 1.0)
    if GENDER == "male":
        taper_w = chest_taper_weights(height_frac)
        n_tapered = int((taper_w < 0.999).sum())
        print(f"[Alki] Chest taper for body_mass: frac [{CHEST_TAPER_LO},{CHEST_TAPER_HI}] "
              f"-> floor {CHEST_TAPER_FLOOR}; {n_tapered}/{nverts} verts attenuated.")
    else:
        taper_w = np.ones(nverts, dtype=np.float64)
        print("[Alki] Chest taper SKIPPED (female base keeps full chest volume).")

    # ── Extract each Alki key directly from its npz file(s) ──────────
    created = []
    np_deltas = {}  # alki key -> final (nverts,3) delta, in basis space
    for alki_key, sources in ALKI_FROM_NPZ.items():
        rel_paths = [s.format(g=GENDER) for s in sources]
        total = np.zeros((nverts, 3), dtype=np.float64)
        for rel in rel_paths:
            total += load_npz_delta(content_root, rel, nverts)

        # Gyno fix: attenuate the chest region of body_mass's overweight
        # source BEFORE the scale (belly/hips stay full strength).
        if alki_key == "body_mass":
            total = total * taper_w[:, None]

        scale = MORPH_SCALE.get(alki_key, 1.0)
        delta = total * scale

        # Heavy base: adiposity-direction keys are marginal relative to the
        # overweight content already in neutral (see HEAVY_RELATIVE_KEYS note).
        if ow_in_neutral is not None and alki_key in HEAVY_RELATIVE_KEYS:
            delta = delta - ow_in_neutral

        # Neck-seam lock: zero displacement in the head-attach band.
        delta[seam_mask] = 0.0

        # Shape key stores basis + delta (rebased onto neutral before export).
        if body.data.shape_keys is None:
            body.shape_key_add(name="Basis")
        kb = body.data.shape_keys.key_blocks.get(alki_key)
        if kb is None:
            kb = body.shape_key_add(name=alki_key, from_mix=False)
        write_coords(kb.data, basis + delta)
        kb.value = 0.0

        np_deltas[alki_key] = delta
        created.append(alki_key)

        lens = np.linalg.norm(delta, axis=1)
        sc = f" ×{scale}" if scale != 1.0 else ""
        rel_note = " (rel. to heavy neutral)" if (
            ow_in_neutral is not None and alki_key in HEAVY_RELATIVE_KEYS) else ""
        names = [os.path.basename(p) for p in rel_paths]
        print(f"[Alki] Baked {alki_key!r} from {names}{sc}{rel_note}  "
              f"(max Δ {float(lens.max()):.4f}, mean Δ {float(lens.mean()):.5f}, "
              f"neck-locked {n_seam})")
        if alki_key == "body_mass":
            # Gyno check: track the vertex where RAW overweight peaks (the
            # chest/breast vertex, height-frac ~0.63 on the male mesh) and
            # report its tapered displacement. Untapered ×3.0 read ~0.204.
            raw_ow = sum(load_npz_delta(content_root, p, nverts) for p in rel_paths)
            gyno_i = int(np.argmax(np.linalg.norm(raw_ow, axis=1)))
            print(f"[Alki]   body_mass gyno check: raw-overweight peak vertex "
                  f"(frac {height_frac[gyno_i]:.3f}, taper w "
                  f"{taper_w[gyno_i]:.3f}) now displaces "
                  f"{float(lens[gyno_i]):.4f} (untapered ×3.0 was ~0.204)")
        if lens.max() < 1e-4:
            print(f"[Alki]   !! WARNING: {alki_key!r} barely moved — its npz "
                  f"source(s) may be empty/wrong.")

    # Flat placeholders for keys with no HumGen source (sculpt later).
    for key in ALKI_CUSTOM_PLACEHOLDERS:
        if body.data.shape_keys.key_blocks.get(key) is None:
            kb = body.shape_key_add(name=key, from_mix=False)
            write_coords(kb.data, basis)  # flat: zero delta
            print(f"[Alki] Added placeholder {key!r} (flat; sculpt later)")
        np_deltas[key] = np.zeros((nverts, 3), dtype=np.float64)
        created.append(key)

    print(f"[Alki] Created {len(created)} canonical keys: {created}")

    # ── Cross-key region signature (legs|torso|upper mean Δ) ──────────
    print("[Alki] Region signature per key (legs|torso|upper mean Δ) + neck-seam Δ:")
    up_co = neutral[:, UP]
    ymin, ymax = float(up_co.min()), float(up_co.max())
    H = (ymax - ymin) or 1.0
    frac = (up_co - ymin) / H
    legs_m, torso_m, upper_m = frac < 0.45, (frac >= 0.45) & (frac < 0.82), frac >= 0.82
    for k in created:
        lens = np.linalg.norm(np_deltas[k], axis=1)
        lg = float(lens[legs_m].mean()) if legs_m.any() else 0.0
        tr = float(lens[torso_m].mean()) if torso_m.any() else 0.0
        ar = float(lens[upper_m].mean()) if upper_m.any() else 0.0
        neck_max = float(lens[seam_mask].max()) if n_seam else 0.0
        flag = "  << NECK MOVED!" if neck_max > 0.002 else ""
        print(f"[Alki]   {k:<16} legs={lg:.4f} torso={tr:.4f} "
              f"upper={ar:.4f} neckMaxΔ={neck_max:.4f}{flag}")

    # ── Adiposity-trio distinctness (pre-export) ──────────────────────
    # body_mass / bf_high / visceral MUST be three DIFFERENT shapes. Print all
    # three max Δ and pairwise cosines BEFORE export so a collision (two keys
    # ~identical → |cos| near 1) is caught before the GLB is trusted.
    def _cos(a, b):
        fa, fb = np_deltas[a].ravel(), np_deltas[b].ravel()
        denom = np.linalg.norm(fa) * np.linalg.norm(fb) + 1e-12
        return float(fa @ fb / denom)

    print("[Alki] Adiposity trio — max Δ:")
    for k in ("body_mass", "bf_high", "visceral"):
        print(f"[Alki]   {k:<10} max Δ {float(np.linalg.norm(np_deltas[k], axis=1).max()):.4f}")
    # Gate at 0.85 (clone detection), NOT 0.5: gross mass and flank honestly
    # co-thicken the midsection, so a moderate cosine is correct anatomy — only
    # a near-clone (≥0.85, two keys sharing a source) is a real defect.
    print("[Alki] Adiposity trio — pairwise cosine (clone if |cos| ≥ 0.85):")
    for a, b in (("body_mass", "bf_high"), ("body_mass", "visceral"),
                 ("bf_high", "visceral")):
        c = _cos(a, b)
        flag = "  << CLONE" if abs(c) >= 0.85 else ""
        print(f"[Alki]   cos({a:<10}, {b:<10}) = {c:+.4f}{flag}")

    # ── Rebase onto neutral, bake neutral into Basis ──────────────────
    # Morphs were stored as basis + delta. Rebase them onto `neutral` (the
    # heavy rest pose for heavy bases) so their deltas are unchanged relative
    # to the new rest pose, then move `neutral` into the Basis key AND the
    # mesh vertices (the exporter writes mesh positions as base POSITION).
    sk = body.data.shape_keys.key_blocks
    basis_kb = body.data.shape_keys.reference_key or sk[0]

    for k in created:
        kb = sk.get(k)
        if kb is not None:
            write_coords(kb.data, neutral + np_deltas[k])
    write_coords(basis_kb.data, neutral)
    write_coords(body.data.vertices, neutral)
    # Flush the edits into the mesh + depsgraph so the EXPORT and the gate's
    # read-back below see the new base, not a stale pre-write copy.
    body.data.update()

    # Strip everything except Basis + the 14 canonical Alki keys.
    keep = set(created) | {"Basis", basis_kb.name}
    to_remove = [kb.name for kb in sk if kb.name not in keep]
    print(f"[Alki] Stripping {len(to_remove)} unused shape keys: {to_remove}")
    for name in to_remove:
        kb = body.data.shape_keys.key_blocks.get(name)
        if kb is not None:
            body.shape_key_remove(kb)
    remaining = [kb.name for kb in body.data.shape_keys.key_blocks]
    print(f"[Alki] Shape keys remaining ({len(remaining)}): {remaining}")

    # ── Strip materials/textures + vertex colors (COLOR_0) ───────────
    # The app drives its OWN MeshStandard material at runtime, so HumGen's
    # embedded freckle/albedo/normal maps and the vertex colors are dead
    # weight. Clearing them here means the exporter writes none.
    body.data.materials.clear()
    n_col = strip_vertex_colors(body.data)
    print(f"[Alki] Cleared materials (slots: {len(body.data.materials)}); "
          f"stripped {n_col} vertex-color layer(s).")

    # ── HARD GATE: heavy base must actually be heavy (no silent no-op) ──
    # Read the mesh vertices BACK after the write + update — this is the
    # geometry the exporter writes as base POSITION. Measure the torso band's
    # extent on the DEPTH axis (overweight thickens front-to-back, NOT
    # side-to-side) and require it to exceed the lean basis by the gate margin.
    if BODY_TYPE == "heavy":
        def torso_band_depth(coords):
            up = coords[:, UP]
            lo, hi = float(up.min()), float(up.max())
            span = (hi - lo) or 1.0
            band = ((up - lo) / span >= 0.45) & ((up - lo) / span < 0.82)
            if not band.any():
                return 0.0
            d = coords[band, DEPTH]
            return float(d.max() - d.min())

        final = read_coords(body.data.vertices, nverts)
        final_d = torso_band_depth(final)
        lean_d = torso_band_depth(basis)
        print(f"[Alki] FINAL torso-band depth ('{'xyz'[DEPTH]}'-extent) = {final_d:.3f} "
              f"(lean basis = {lean_d:.3f}, gate = lean + {HEAVY_GATE_MIN_DEPTH_GAIN})")
        if final_d <= lean_d + HEAVY_GATE_MIN_DEPTH_GAIN:
            raise RuntimeError(
                f"Heavy bake produced a NON-heavy exported base (torso-band "
                f"depth {final_d:.3f} ≤ lean {lean_d:.3f} + "
                f"{HEAVY_GATE_MIN_DEPTH_GAIN}). The overweight offset did not "
                f"reach the base mesh the exporter reads. Refusing to export "
                f"a lean clone.")

    # ── Export (static mesh: export_skins=False) ─────────────────────
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body

    export_kwargs = dict(
        filepath=OUTPUT_PATH, export_format="GLB", use_selection=True,
        export_yup=True, export_apply=False, export_morph=True,
        export_morph_normal=False, export_skins=False, export_animations=False,
        export_materials="NONE", export_image_format="NONE",
    )
    # export_vertex_color flag name varies by Blender version; try, then fall
    # back to the kwarg set above (vertex colors are already stripped anyway).
    try:
        bpy.ops.export_scene.gltf(**export_kwargs, export_vertex_color="NONE")
    except TypeError:
        bpy.ops.export_scene.gltf(**export_kwargs)

    print(f"[Alki] Exported → {OUTPUT_PATH}")
    print("[Alki] DONE. Now run: "
          f"python blender_scripts/check_glb.py \"{OUTPUT_PATH}\" {BODY_TYPE}")


if __name__ == "__main__":
    build()
