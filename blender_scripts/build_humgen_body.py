# ═══════════════════════════════════════════════════════════
# ALKI — HumGen3D Base Body Generator  (v5 — multi-base + body_mass)
# ═══════════════════════════════════════════════════════════
# Generates ONE Alki base mesh per run and exports a GLB the browser drives
# in real time via morphTargetInfluences. v5 builds the FOUR-base matrix
# (Avatar Range, Stages 2-3): {male,female} × {lean,heavy}, each exposing
# the SAME 14 canonical shape-key names (the 13 originals + the new
# `body_mass`), with the muscle keys re-sculpted larger.
#
# ─── WHAT'S NEW IN v5 vs v4 ──────────────────────────────────────────
#   • BODY_TYPE = "lean" | "heavy" (alongside GENDER). Output filename is
#     alki_humgen_<gender>_<type>.glb — the 4 names selectBaseMesh.js wires.
#   • HEAVY base: a configurable set of HumGen mass LiveKeys is baked into
#     the NEUTRAL (rest pose) BEFORE the Alki morphs (spec §3.5). The base
#     body IS heavy; bf_low then carries it DOWN toward lean and body_mass
#     pushes UP — each morph travels half the distance (MakeHuman's
#     bidirectional-extreme principle at the base-mesh level).
#   • NEW `body_mass` key (spec §3.2): the gross soft-tissue envelope,
#     sourced from HumGen mass LiveKeys that MUST be DISTINCT from bf_high's
#     source (check_glb.py enforces a LOW body_mass↔bf_high cosine — that is
#     the proof it is new geometry, not a re-inflated bf_high).
#   • Per-key MORPH_SCALE post-multiplies each baked delta — an EXACT,
#     trivial vectorized scale (spec §3.3). Muscle keys ×~1.8 so a fully
#     driven body looks built; body_mass scaled to its target disp band.
#   • COLOR_0 (vertex colors) stripped and export_skins=False — the mesh is
#     static and the app drives its own material (spec §3.5).
#
# ─── THE v4 ISOLATION FIX (still the core of the bake) ───────────────
# Each Alki key stores  kb.co = basis + (deformed − neutral) × scale, so the
# delta the app applies (kb.co − Basis.co) is the ISOLATED effect of that
# key's source LiveKeys ON TOP of this base's neutral — gender/preset/heavy
# components cancel out. (v3 stored absolute coords → every muscle key ≈ the
# whole body, cosine 0.99; v4/v5 fix that.)
#
# RUN: Scripting workspace, Alt+P (open the system console first).
# Run it FOUR times, editing GENDER + BODY_TYPE each time. After each run,
# verify with:  blender --background --python ... NO — check_glb.py is plain
# Python:  python blender_scripts/check_glb.py public/alki_humgen_<g>_<t>.glb <type>
# Then slim:  node blender_scripts/slim_all_bases.mjs
#
# ─── §3.6 BEFORE YOU BUILD THE HEAVY / body_mass RECIPE ──────────────
# Run blender_scripts/list_livekeys.py FIRST and confirm the real HumGen
# names for the mass keys below (HumGen naming varies by version). The
# defaults are best-guess candidates — replace them with the confirmed
# names, then build. Anywhere a name is wrong the bake prints
# "WARN: livekey ... not found" and that key simply won't contribute.

import bpy
import os

# ── EDIT THESE TWO PER RUN ───────────────────────────────────────────
GENDER = "male"        # "male" | "female"
BODY_TYPE = "lean"     # "lean" | "heavy"

# Keep these CONSTANT across all four builds so the bases share proportions
# (spec §3.4: all ~1.8 units tall; in-pair vertex order must match).
HEIGHT_CM = 178
PRESET_INDEX = 0

OUTPUT_DIR = os.path.dirname(bpy.data.filepath) or os.path.expanduser("~")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, f"alki_humgen_{GENDER}_{BODY_TYPE}.glb")

# Alki canonical key -> list of HumGen LiveKey names summed into it.
# body_mass MUST be distinct from bf_high (verifier checks the cosine).
# Redundancy collapse (2026-05-29): the gross-mass envelope now lives in ONE
# key, body_mass, sourced from "overweight"; bf_high is RE-TASKED off
# "overweight" onto a distinct localized shape so all three adiposity keys
# (body_mass / bf_high / bf_low) are genuinely different geometry.
#   body_mass = the SINGLE broad-adiposity key — the gross whole-body
#               soft-tissue envelope, from HumGen "overweight" (subcat main).
#   bf_high   = LOCALIZED fat deposition (regional belly + flank). NOT a
#               second copy of "overweight"; that is the point. §3.6: confirm
#               these regional names against list_livekeys.py before trusting.
#   bf_low    = lean direction (skinny), unchanged.
ALKI_FROM_LIVEKEYS = {
    # ▼ broad whole-body adiposity (confirmed HumGen key) ▼
    "body_mass":        ["overweight"],
    "bf_low":           ["skinny"],
    # ▼▼▼ §3.6 CONFIRM names — localized fat, kept DISTINCT from body_mass ▼▼▼
    "bf_high":          ["Belly Size", "Stomach Size", "Love Handles"],
    # ▲▲▲ candidates only; replace with confirmed HumGen mass-key names ▲▲▲
    "visceral":         ["Belly Size"],
    "muscle_overall":   ["muscular"],
    "muscle_chest":     ["Chest Muscles"],
    "muscle_shoulders": ["Shoulder Muscles", "Traps Muscles"],
    "muscle_arms":      ["Biceps", "Triceps", "Forearm Muscles"],
    "muscle_back":      ["Back Muscles"],
    "muscle_legs":      ["Quad Muscles", "Hamstring Muscles",
                         "Upper Butt Muscles", "Lower Butt Muscles"],
    "muscle_calves":    ["Calves Muscles"],
}

# Canonical keys with no HumGen source — created as flat placeholders
# (material/normal-map pass is out of scope; spec §1.1).
ALKI_CUSTOM_PLACEHOLDERS = ["water", "abs_def", "vascularity"]

# §3.5/§3.6 — HEAVY base only: mass LiveKeys baked into the NEUTRAL/Basis
# before the Alki morphs, so the rest pose is the heavy body. §3.6: confirm
# names; consider stacking overweight + a belly/weight macro at ~1.0.
HEAVY_BACKGROUND_LIVEKEYS = {"overweight": 1.0}
BACKGROUND = dict(HEAVY_BACKGROUND_LIVEKEYS) if BODY_TYPE == "heavy" else {}

# §3.3 muscle re-sculpt + §3.2 body_mass magnitude — post-bake delta scale.
# EXACT vectorized multiply on the stored offsets. Tune after the first
# build prints each key's max Δ:
#   • muscle_overall target max ~0.05 (regional keys proportional).
#   • body_mass target max: lean 0.18–0.25, heavy 0.10–0.15 (shorter push
#     from an already-heavy neutral → smaller scale on the heavy base).
_MUSCLE = 1.8
MORPH_SCALE = {
    "muscle_overall": _MUSCLE, "muscle_chest": _MUSCLE,
    "muscle_shoulders": _MUSCLE, "muscle_arms": _MUSCLE,
    "muscle_back": _MUSCLE, "muscle_legs": _MUSCLE, "muscle_calves": _MUSCLE,
    # body_mass now sources from "overweight" (a LARGE whole-body key), not
    # the small belly candidates it used to — the old 3.5/2.0 would blow far
    # past the disp band. Start at 1.0 so the FIRST build prints the RAW
    # overweight max Δ, then set this to (target ÷ raw): target ~0.22 lean /
    # ~0.12 heavy (check_glb bands 0.15–0.28 / 0.08–0.18).
    "body_mass": 1.0,
}

# Neck-seam band (spec §1.3/§3.7 #6): no morph should move this band; it is
# the head-attach reserve. Printed per key so you can SEE it stays ~0.
NECK_SEAM_Y = (1.51, 1.53)


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


def livekey_by_name(human, name):
    """Find a livekey by name, tolerant of '.trial' suffix and whitespace."""
    target = name.strip().lower().replace(".trial", "")
    for lk in human.keys.all_livekeys:
        clean = lk.name.strip().lower().replace(".trial", "")
        if clean == target:
            return lk
    return None


def set_livekeys(human, mapping):
    """Zero every livekey, then apply mapping {name: value}, then commit.
    Returns the list of names that were actually found + applied."""
    for lk in human.keys.all_livekeys:
        try:
            lk.value = 0.0
        except Exception:
            pass
    applied = []
    for name, val in mapping.items():
        lk = livekey_by_name(human, name)
        if lk is None:
            print(f"[Alki] WARN: livekey {name!r} not found")
            continue
        try:
            lk.value = float(val)
            applied.append(name)
        except Exception as e:
            print(f"[Alki] WARN: could not set {name!r}: {e}")
    try:
        human.keys.update_human_from_key_change(bpy.context)
    except Exception:
        pass
    return applied


def bake_basis(body):
    """Snapshot Basis (base-space) vertex positions of the body mesh."""
    return [v.co.copy() for v in body.data.vertices]


def evaluate_mesh_positions(body):
    """Read evaluated vertex positions after livekey application.
    Re-acquire the depsgraph every call so we read the CURRENT deformation."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = body.evaluated_get(depsgraph)
    eval_mesh = eval_obj.to_mesh()
    coords = [v.co.copy() for v in eval_mesh.vertices]
    eval_obj.to_mesh_clear()
    return coords


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
    print(f"\n[Alki] HumGen build v5 — GENDER={GENDER} BODY_TYPE={BODY_TYPE}")
    print(f"[Alki] Background (heavy) livekeys: {BACKGROUND or '(none — lean)'}")
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

    # ── References in BOTH spaces, with the BACKGROUND applied ─────────
    # basis   = Basis shape key coords (base space) — unaffected by livekey
    #           VALUES (those drive evaluated shape keys), so it's the raw
    #           gender base either way.
    # neutral = evaluated body with ONLY the background livekeys (lean: none;
    #           heavy: overweight etc. at 1.0) — i.e. THIS base's rest pose.
    set_livekeys(human, BACKGROUND)
    basis = bake_basis(body)
    neutral = evaluate_mesh_positions(body)
    print(f"[Alki] basis verts: {len(basis)} | neutral eval verts: {len(neutral)}")
    if len(neutral) != len(basis):
        print("[Alki] ERROR: neutral eval vert count != basis. Aborting "
              "(a modifier is changing topology; the isolation math needs "
              "matching vertex order).")
        return

    created = []
    for alki_key, source_lks in ALKI_FROM_LIVEKEYS.items():
        # Background + only this key's source livekeys active.
        mapping = dict(BACKGROUND)
        for lk_name in source_lks:
            mapping[lk_name] = 1.0
        applied = set_livekeys(human, mapping)
        source_applied = [n for n in applied if n not in BACKGROUND]

        deformed = evaluate_mesh_positions(body)
        if len(deformed) != len(basis):
            print(f"[Alki] WARN: vert count mismatch on {alki_key!r} "
                  f"({len(deformed)} vs {len(basis)}); skipping")
            continue

        if body.data.shape_keys is None:
            body.shape_key_add(name="Basis")
        kb = body.data.shape_keys.key_blocks.get(alki_key)
        if kb is None:
            kb = body.shape_key_add(name=alki_key, from_mix=False)

        # ── ISOLATED, SCALED delta: (deformed − neutral) × scale onto Basis
        # NECK-SEAM LOCK (spec §1.3/§3.7 #6): any vertex whose BASIS Y sits in
        # the head-attach reserve band gets ZERO displacement, so no morph can
        # disturb the neck seam. Done here, relative to basis, so it survives
        # the later rebase-onto-neutral untouched (old_delta == 0 → new co ==
        # neutral). Applies to ALL bases (male/female × lean/heavy).
        scale = MORPH_SCALE.get(alki_key, 1.0)
        nlo, nhi = NECK_SEAM_Y
        max_d = 0.0
        sum_d = 0.0
        neck_locked = 0
        for i in range(len(deformed)):
            if nlo <= basis[i].y <= nhi:
                kb.data[i].co = basis[i]          # locked: zero displacement
                neck_locked += 1
                continue
            delta = (deformed[i] - neutral[i]) * scale
            kb.data[i].co = basis[i] + delta
            dl = delta.length
            sum_d += dl
            if dl > max_d:
                max_d = dl
        kb.value = 0.0
        mean_d = sum_d / len(deformed) if deformed else 0.0
        created.append(alki_key)
        sc = f" ×{scale}" if scale != 1.0 else ""
        print(f"[Alki] Baked {alki_key!r} from {source_applied}{sc}  "
              f"(max Δ {max_d:.4f}, mean Δ {mean_d:.5f}, neck-locked {neck_locked})")
        if max_d < 1e-4:
            print(f"[Alki]   !! WARNING: {alki_key!r} barely moved — its "
                  f"source livekey(s) may not have applied (check §3.6 names).")

    # Reset to this base's neutral (background only) for the export rest pose.
    set_livekeys(human, BACKGROUND)

    # Flat placeholders for keys with no HumGen source (sculpt later).
    for key in ALKI_CUSTOM_PLACEHOLDERS:
        if body.data.shape_keys.key_blocks.get(key) is None:
            body.shape_key_add(name=key, from_mix=False)
            print(f"[Alki] Added placeholder {key!r} (flat; sculpt later)")
            created.append(key)

    print(f"[Alki] Created {len(created)} canonical keys: {created}")

    # ── Cross-key region signature (legs|torso|upper mean Δ) ──────────
    print("[Alki] Region signature per key (legs|torso|upper mean Δ) + neck-seam Δ:")
    ys = [c.y for c in basis]
    ymin, ymax = min(ys), max(ys); H = (ymax - ymin) or 1.0
    nlo, nhi = NECK_SEAM_Y

    def region_means(kb):
        legs = tor = arm = neck = 0.0
        nl = nt = na = nn = 0
        neck_max = 0.0
        for i in range(len(basis)):
            d = (kb.data[i].co - basis[i]).length
            y = basis[i].y
            fy = (y - ymin) / H
            if fy < 0.45: legs += d; nl += 1
            elif fy < 0.82: tor += d; nt += 1
            else: arm += d; na += 1
            if nlo <= y <= nhi:
                neck += d; nn += 1
                if d > neck_max: neck_max = d
        return (legs / max(nl, 1), tor / max(nt, 1),
                arm / max(na, 1), neck_max)

    for k in created:
        kb = body.data.shape_keys.key_blocks.get(k)
        if kb is None:
            continue
        lg, tr, ar, neck_max = region_means(kb)
        flag = "  << NECK MOVED!" if neck_max > 0.002 else ""
        print(f"[Alki]   {k:<16} legs={lg:.4f} torso={tr:.4f} "
              f"upper={ar:.4f} neckMaxΔ={neck_max:.4f}{flag}")

    # ── Bake the gender/heavy body into Basis, strip extra shape keys ──
    # The Alki morphs were stored as basis + scaled(deformed − neutral). We
    # REBASE them onto `neutral` (the gender body, + heavy mass if heavy), so
    # their deltas are unchanged relative to the new rest pose:
    #     new_morph_co = neutral[i] + (old_morph_co − basis[i])
    # then move `neutral` into Basis. Male/heavy/correctives drop out safely.
    sk = body.data.shape_keys.key_blocks
    basis_kb = sk.get("Basis")

    for k in created:
        kb = sk.get(k)
        if kb is None:
            continue
        for i in range(len(neutral)):
            old_delta = kb.data[i].co - basis[i]
            kb.data[i].co = neutral[i] + old_delta

    if basis_kb is not None:
        for i in range(len(neutral)):
            basis_kb.data[i].co = neutral[i]
    for i in range(len(neutral)):
        body.data.vertices[i].co = neutral[i]

    # Strip everything except Basis + the 14 canonical Alki keys.
    keep = set(created) | {"Basis"}
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
          f"python blender_scripts/check_glb.py {OUTPUT_PATH} {BODY_TYPE}")


if __name__ == "__main__":
    build()
