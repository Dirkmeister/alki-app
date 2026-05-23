# ═══════════════════════════════════════════════════════════
# ALKI — HumGen3D Base Body Generator  (v4 — ISOLATED LiveKey baking)
# ═══════════════════════════════════════════════════════════
# Generates a HumGen human, then BAKES selected LiveKeys into permanent
# shape keys named with Alki's canonical vocabulary, and exports a GLB
# the browser drives in real-time via morphTargetInfluences.
#
# ─── WHY v4 EXISTS (the v3 bug) ──────────────────────────────────────
# v3 stored each shape key's ABSOLUTE evaluated coordinates:
#       kb.data[i].co = deformed[i]
# But the evaluated mesh is the full MALE body (Male + LIVE_KEY_PERMANENT
# baked in at weight 1) plus the one livekey. Stored against the female
# Basis, every key's delta came out ≈ the male body shape — so all nine
# muscle keys were near-identical (cosine 0.99 to each other and to the
# Male morph). There was NO regional control; muscle_chest == muscle_legs
# == the whole male body. That's why the app body bloated and couldn't be
# tuned.
#
# ─── THE FIX ─────────────────────────────────────────────────────────
# Capture a NEUTRAL evaluated body once (all livekeys at 0). For each key,
# capture the evaluated body with only that livekey at 1, then store:
#       kb.data[i].co = basis[i] + (deformed[i] - neutral[i])
# The morph delta the app applies (kb.co - Basis.co) now equals exactly
# (deformed - neutral) — the ISOLATED effect of that one livekey, with the
# gender/preset/corrective components cancelled out.
#
# Each key prints its max per-vertex displacement so you can SEE that the
# keys are distinct and non-empty before trusting the export.
#
# RUN: Scripting workspace, Alt+P. Open the system console first.
# OUTPUT: alki_humgen_<gender>.glb next to your .blend (or home dir)

import bpy
import os

GENDER = "male"             # "male" | "female"
HEIGHT_CM = 178
PRESET_INDEX = 0

OUTPUT_DIR = os.path.dirname(bpy.data.filepath) or os.path.expanduser("~")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, f"alki_humgen_{GENDER}.glb")

# Alki canonical key -> list of HumGen LiveKey names to combine into it.
# Multiple HumGen keys summed into one Alki key (e.g. arms = biceps+triceps).
ALKI_FROM_LIVEKEYS = {
    "bf_high":          ["overweight"],
    "bf_low":           ["skinny"],
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

# Canonical keys with no HumGen source — created as flat placeholders.
ALKI_CUSTOM_PLACEHOLDERS = ["water", "abs_def", "vascularity"]


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


def reset_all_livekeys(human):
    for lk in human.keys.all_livekeys:
        try:
            lk.value = 0.0
        except Exception:
            pass
    try:
        human.keys.update_human_from_key_change(bpy.context)
    except Exception:
        pass


def bake_basis(body):
    """Snapshot Basis (base-space) vertex positions of the body mesh."""
    return [v.co.copy() for v in body.data.vertices]


def evaluate_mesh_positions(body):
    """Read evaluated vertex positions after livekey application.

    IMPORTANT: re-acquire the depsgraph every call so we read the CURRENT
    deformation, not a stale snapshot.
    """
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = body.evaluated_get(depsgraph)
    eval_mesh = eval_obj.to_mesh()
    coords = [v.co.copy() for v in eval_mesh.vertices]
    eval_obj.to_mesh_clear()
    return coords


def build():
    print(f"\n[Alki] HumGen build v4 (isolated) — GENDER={GENDER}")
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

    # ── Capture references in BOTH spaces, all livekeys at 0 ──────────
    # basis   = Basis shape key coords (base space) — the export rest pose
    # neutral = evaluated body with no livekeys (male preset, correctives)
    # Both must share vertex order/count for the subtraction to be valid.
    reset_all_livekeys(human)
    basis = bake_basis(body)
    neutral = evaluate_mesh_positions(body)
    print(f"[Alki] basis verts: {len(basis)} | neutral eval verts: {len(neutral)}")

    # Diagnostic: print leg/calf-related livekey names so we can confirm the
    # exact calf livekey spelling (HumGen naming varies by version).
    print("[Alki] Leg/calf livekeys available:")
    for lk in human.keys.all_livekeys:
        nm = lk.name.lower()
        if "calf" in nm or "calve" in nm or "quad" in nm or "leg" in nm:
            print(f"[Alki]   -> {lk.name!r}")
    if len(neutral) != len(basis):
        print("[Alki] ERROR: neutral eval vert count != basis. Aborting "
              "(a modifier is changing topology; the isolation math needs "
              "matching vertex order).")
        return

    created = []
    for alki_key, source_lks in ALKI_FROM_LIVEKEYS.items():
        # Only this key's source livekeys active.
        reset_all_livekeys(human)
        applied = []
        for lk_name in source_lks:
            lk = livekey_by_name(human, lk_name)
            if lk is None:
                print(f"[Alki] WARN: livekey {lk_name!r} not found for {alki_key!r}")
                continue
            try:
                lk.value = 1.0
                applied.append(lk_name)
            except Exception as e:
                print(f"[Alki] WARN: could not set {lk_name!r}: {e}")
        try:
            human.keys.update_human_from_key_change(bpy.context)
        except Exception:
            pass

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

        # ── ISOLATED delta: (deformed - neutral) added onto Basis ──────
        # so the morph's effect == only this livekey's displacement.
        max_d = 0.0
        sum_d = 0.0
        for i in range(len(deformed)):
            delta = deformed[i] - neutral[i]
            kb.data[i].co = basis[i] + delta
            dl = delta.length
            sum_d += dl
            if dl > max_d:
                max_d = dl
        kb.value = 0.0
        mean_d = sum_d / len(deformed) if deformed else 0.0
        created.append(alki_key)
        print(f"[Alki] Baked {alki_key!r} from {applied}  "
              f"(max Δ {max_d:.4f}, mean Δ {mean_d:.5f})")
        if max_d < 1e-4:
            print(f"[Alki]   !! WARNING: {alki_key!r} barely moved — the "
                  f"source livekey may not have applied.")

    # Reset to neutral so the exported base mesh is the neutral body.
    reset_all_livekeys(human)

    # Flat placeholders for keys with no HumGen source (sculpt later).
    for key in ALKI_CUSTOM_PLACEHOLDERS:
        if body.data.shape_keys.key_blocks.get(key) is None:
            body.shape_key_add(name=key, from_mix=False)
            print(f"[Alki] Added placeholder {key!r} (sculpt later)")
            created.append(key)

    print(f"[Alki] Created {len(created)} canonical keys: {created}")

    # ── Cross-key sanity check ───────────────────────────────────────
    # If two muscle keys are near-identical, isolation failed again.
    # Compare each pair's stored deltas cheaply via a per-region signature.
    print("[Alki] Region signature per key (legs|torso|arms mean Δ):")
    ys = [c.y for c in basis]
    ymin, ymax = min(ys), max(ys); H = (ymax - ymin) or 1.0
    def region_means(kb):
        legs = tor = arm = 0.0; nl = nt = na = 0
        for i in range(len(basis)):
            d = (kb.data[i].co - basis[i]).length
            fy = (basis[i].y - ymin) / H
            if fy < 0.45: legs += d; nl += 1
            elif fy < 0.82: tor += d; nt += 1
            else: arm += d; na += 1
        return (legs / max(nl, 1), tor / max(nt, 1), arm / max(na, 1))
    for k in created:
        kb = body.data.shape_keys.key_blocks.get(k)
        if kb is None:
            continue
        lg, tr, ar = region_means(kb)
        print(f"[Alki]   {k:<16} legs={lg:.4f} torso={tr:.4f} upper={ar:.4f}")

    # ── Bake the male body into Basis, then strip unused shape keys ──
    # WHY: `basis` is the FEMALE base mesh (raw Basis verts). The male body
    # comes from HumGen's `Male` + `LIVE_KEY_PERMANENT` SHAPE keys (not
    # livekeys), which stay applied at weight 1. Our Alki morphs are deltas
    # on top of the female basis, and the body only LOOKS male because the
    # `Male` shape key is present at weight 1 in the export. If we simply
    # delete `Male`, the rest pose reverts to female (observed bug).
    #
    # FIX: write the `neutral` positions (which already include Male +
    # LIVE_KEY_PERMANENT at weight 1) into the Basis, so the rest pose IS
    # the male body. Our Alki morphs were stored as basis_female + (deformed
    # - neutral); we must REBASE them onto the new (male) basis so their
    # deltas are unchanged relative to the new rest pose:
    #     new_morph_co = neutral[i] + (old_morph_co - basis_female[i])
    # i.e. the same (deformed - neutral) delta, now added to the male rest.
    # Then Male/LIVE_KEY_PERMANENT/correctives can be removed safely.
    sk = body.data.shape_keys.key_blocks
    basis_kb = sk.get("Basis")

    # 1) Rebase every Alki morph onto the male neutral rest pose.
    for k in created:
        kb = sk.get(k)
        if kb is None:
            continue
        for i in range(len(neutral)):
            old_delta = kb.data[i].co - basis[i]      # (deformed - neutral)
            kb.data[i].co = neutral[i] + old_delta

    # 2) Move the male body into Basis itself.
    if basis_kb is not None:
        for i in range(len(neutral)):
            basis_kb.data[i].co = neutral[i]
    # Also move the underlying mesh verts so the rest mesh matches Basis.
    for i in range(len(neutral)):
        body.data.vertices[i].co = neutral[i]

    # 3) Strip everything except Basis + the 13 canonical Alki keys.
    keep = set(created) | {"Basis"}
    to_remove = [kb.name for kb in sk if kb.name not in keep]
    print(f"[Alki] Stripping {len(to_remove)} unused shape keys: {to_remove}")
    for name in to_remove:
        kb = body.data.shape_keys.key_blocks.get(name)
        if kb is not None:
            body.shape_key_remove(kb)
    remaining = [kb.name for kb in body.data.shape_keys.key_blocks]
    print(f"[Alki] Shape keys remaining ({len(remaining)}): {remaining}")

    # ── Strip materials/textures (the ~28MB of bloat) ───────────────
    # HumGen embeds large freckle/albedo/normal texture maps. The app drives
    # its OWN MeshStandard material at runtime (Body3DAvatar.jsx strips every
    # texture slot and sets a controlled skin color), so these embedded maps
    # are pure dead weight — they're what kept the file at 35MB after the
    # morph slim. Clearing the mesh's material slots here means the exporter
    # writes no images at all. Done in Blender so no post-processor touches
    # the (now verified-good) morph data.
    body.data.materials.clear()
    print(f"[Alki] Cleared materials. Slots now: {len(body.data.materials)}")

    # ── Export ───────────────────────────────────────────────────────
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH, export_format="GLB", use_selection=True,
        export_yup=True, export_apply=False, export_morph=True,
        export_morph_normal=False, export_skins=True, export_animations=False,
        export_materials="NONE", export_image_format="NONE",
    )
    print(f"[Alki] Exported → {OUTPUT_PATH}")
    print("[Alki] DONE.")


if __name__ == "__main__":
    build()
