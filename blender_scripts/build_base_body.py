# ═══════════════════════════════════════════════════════════
# ALKI — Build Test Base Body
# ═══════════════════════════════════════════════════════════
# Generates a programmatic humanoid mesh with ALL the canonical
# Alki shape keys (matching src/app/lib/morphTargets.js) and
# exports it to a GLB you can drop into the app for testing.
#
# THIS IS NOT THE FINAL ART. It's a pipeline validation asset:
#   - Proves the GLB → app pipeline preserves shape keys
#   - Proves the morph driver actually moves morphTargetInfluences
#   - Proves regional morphs hit the right body parts
#   - Lets you iterate on the driver logic with a real asset NOW
#
# Once the pipeline is validated, replace this script's mesh
# generation with your hand-sculpted base mesh — but KEEP the
# shape key naming convention exactly. Every shape key the app
# expects is in CANONICAL_KEYS below; Blender exports them
# under those exact names so the app finds them via name match.
#
# RUNNING THIS SCRIPT
#   - Open Blender, switch to the Scripting workspace, paste, run
#   - Or via Blender MCP: ask Claude to run it
#   - Or from CLI:
#       blender --background --python build_base_body.py
#
# OUTPUT
#   alki_test_body.glb in the same directory as this script
#
# DEPENDENCIES
#   Blender 3.0+ (developed against 4.x)

import bpy
import bmesh
import math
import os
from mathutils import Vector

# ── Configuration ───────────────────────────────────────────────────
OUTPUT_PATH = os.path.join(os.path.dirname(bpy.data.filepath) or os.path.expanduser("~"), "alki_test_body.glb")
BODY_NAME = "AlkiBody"

# Canonical shape key list — MUST match MORPH_KEYS in morphTargets.js
CANONICAL_KEYS = [
    "bf_low",
    "bf_high",
    "visceral",
    "water",
    "muscle_overall",
    "muscle_chest",
    "muscle_shoulders",
    "muscle_arms",
    "muscle_back",
    "muscle_legs",
    "abs_def",
    "vascularity",
    # skin_tone_shift and skin_quality are material-only, no shape key needed
]


# ── Helpers ─────────────────────────────────────────────────────────
def clear_scene():
    """Remove all mesh objects from the current scene."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)


def add_primitive(kind, location, scale, rotation=(0, 0, 0), segments=16):
    """Add a primitive at location/scale and return the new object."""
    if kind == "uv_sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=1.0, segments=segments, ring_count=segments // 2,
            location=location, rotation=rotation
        )
    elif kind == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(
            radius=1.0, depth=1.0, vertices=segments,
            location=location, rotation=rotation
        )
    elif kind == "cube":
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    else:
        raise ValueError(f"Unknown primitive: {kind}")
    obj = bpy.context.active_object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def build_body_primitives():
    """Build a humanoid using primitives. Returns a list of objects."""
    parts = []

    # ── Torso ───────────────────────────────────────────────────────
    torso = add_primitive("cylinder", (0, 0, 1.10), (0.18, 0.10, 0.35))
    torso.name = "torso_main"
    parts.append(torso)

    chest_top = add_primitive("uv_sphere", (0, 0, 1.45), (0.20, 0.12, 0.10))
    chest_top.name = "chest_top"
    parts.append(chest_top)

    pelvis = add_primitive("uv_sphere", (0, 0, 0.78), (0.17, 0.11, 0.10))
    pelvis.name = "pelvis"
    parts.append(pelvis)

    # ── Head + neck ─────────────────────────────────────────────────
    neck = add_primitive("cylinder", (0, 0, 1.58), (0.045, 0.045, 0.04))
    neck.name = "neck"
    parts.append(neck)

    head = add_primitive("uv_sphere", (0, 0, 1.70), (0.085, 0.095, 0.105))
    head.name = "head"
    parts.append(head)

    # ── Arms (each side) ────────────────────────────────────────────
    for side, sign in [("L", -1), ("R", 1)]:
        shoulder = add_primitive("uv_sphere", (sign * 0.21, 0, 1.50), (0.06, 0.06, 0.05))
        shoulder.name = f"shoulder_{side}"
        parts.append(shoulder)

        upper_arm = add_primitive("cylinder", (sign * 0.27, 0, 1.27), (0.045, 0.045, 0.13),
                                  rotation=(0, sign * 0.10, 0))
        upper_arm.name = f"upper_arm_{side}"
        parts.append(upper_arm)

        forearm = add_primitive("cylinder", (sign * 0.30, 0, 0.97), (0.04, 0.04, 0.13),
                                rotation=(0, sign * 0.05, 0))
        forearm.name = f"forearm_{side}"
        parts.append(forearm)

        hand = add_primitive("uv_sphere", (sign * 0.31, 0, 0.78), (0.04, 0.025, 0.06))
        hand.name = f"hand_{side}"
        parts.append(hand)

    # ── Legs (each side) ────────────────────────────────────────────
    for side, sign in [("L", -1), ("R", 1)]:
        thigh = add_primitive("cylinder", (sign * 0.09, 0, 0.52), (0.07, 0.07, 0.22))
        thigh.name = f"thigh_{side}"
        parts.append(thigh)

        calf = add_primitive("cylinder", (sign * 0.09, 0, 0.16), (0.05, 0.05, 0.15))
        calf.name = f"calf_{side}"
        parts.append(calf)

        foot = add_primitive("uv_sphere", (sign * 0.09, 0.04, 0.02), (0.045, 0.08, 0.03))
        foot.name = f"foot_{side}"
        parts.append(foot)

    return parts


def join_to_single_mesh(parts, final_name):
    """Join all parts into one mesh object and return it."""
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = final_name

    body.location = (0, 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return body


# ── Shape key generation ────────────────────────────────────────────
# Each shape key is created by selecting vertices in a body region
# (by Z-coordinate range and optionally X-distance from center) and
# applying a programmatic deformation.

def get_basis_coords(mesh):
    """Snapshot the basis (rest) vertex positions."""
    return [v.co.copy() for v in mesh.vertices]


def add_shape_key(obj, name):
    """Add a named shape key and return its key block."""
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis")
    return obj.shape_key_add(name=name, from_mix=False)


def in_z_range(co, z_min, z_max):
    return z_min <= co.z <= z_max


def lateral_distance(co):
    return math.sqrt(co.x ** 2 + co.y ** 2)


def deform_shape_key(obj, basis, key_block, deform_fn):
    """For each vertex, apply deform_fn(co_basis, i) -> new co into key_block."""
    for i, v in enumerate(basis):
        key_block.data[i].co = deform_fn(v, i)


def build_shape_keys(body):
    """Sculpt all canonical shape keys programmatically."""
    # Ensure a Basis key exists first
    if body.data.shape_keys is None:
        body.shape_key_add(name="Basis")

    basis = get_basis_coords(body.data)

    # ── bf_high: thicken waist, hips, face, limbs ───────────────────
    kb = add_shape_key(body, "bf_high")
    def bf_high(co, i):
        c = co.copy()
        if in_z_range(co, 0.70, 1.20):
            c.x *= 1.35
            c.y *= 1.30
        elif in_z_range(co, 1.60, 1.80):
            c.x *= 1.10
            c.y *= 1.10
        elif lateral_distance(co) > 0.15 and in_z_range(co, 0.05, 1.50):
            c.x *= 1.12
            c.y *= 1.12
        return c
    deform_shape_key(body, basis, kb, bf_high)

    # ── bf_low: trim waist, hollow face, lean limbs ─────────────────
    kb = add_shape_key(body, "bf_low")
    def bf_low(co, i):
        c = co.copy()
        if in_z_range(co, 0.80, 1.20):
            c.x *= 0.88
            c.y *= 0.90
        elif in_z_range(co, 1.60, 1.80):
            c.x *= 0.94
            c.y *= 0.94
        elif lateral_distance(co) > 0.15 and in_z_range(co, 0.05, 1.50):
            c.x *= 0.94
            c.y *= 0.94
        return c
    deform_shape_key(body, basis, kb, bf_low)

    # ── visceral: belly protrusion forward (positive Y) ─────────────
    kb = add_shape_key(body, "visceral")
    def visceral(co, i):
        c = co.copy()
        if in_z_range(co, 0.85, 1.15) and co.y > -0.05:
            c.y += 0.06 * (1 - abs(co.z - 1.0) / 0.15)
        return c
    deform_shape_key(body, basis, kb, visceral)

    # ── water: soft uniform swell across face, hands, ankles ───────
    kb = add_shape_key(body, "water")
    def water(co, i):
        c = co.copy()
        if in_z_range(co, 1.60, 1.80):
            c.x *= 1.06; c.y *= 1.06
        if in_z_range(co, 0.70, 0.85) and lateral_distance(co) > 0.25:
            c.x *= 1.08; c.y *= 1.08
        if in_z_range(co, -0.02, 0.10):
            c.x *= 1.08; c.y *= 1.08
        return c
    deform_shape_key(body, basis, kb, water)

    # ── muscle_overall: uniform expansion of body mass ─────────────
    kb = add_shape_key(body, "muscle_overall")
    def muscle_overall(co, i):
        c = co.copy()
        if in_z_range(co, 0.05, 1.55):
            c.x *= 1.08
            c.y *= 1.08
        return c
    deform_shape_key(body, basis, kb, muscle_overall)

    # ── muscle_chest: pec hypertrophy ───────────────────────────────
    kb = add_shape_key(body, "muscle_chest")
    def muscle_chest(co, i):
        c = co.copy()
        if in_z_range(co, 1.30, 1.50) and co.y < 0.05:
            c.y -= 0.04 * (1 - abs(co.x) / 0.20)
            c.x *= 1.10
        return c
    deform_shape_key(body, basis, kb, muscle_chest)

    # ── muscle_shoulders: delt cap + trap rise ──────────────────────
    kb = add_shape_key(body, "muscle_shoulders")
    def muscle_shoulders(co, i):
        c = co.copy()
        if in_z_range(co, 1.42, 1.58) and abs(co.x) > 0.13:
            c.x *= 1.20
            c.z += 0.02
        return c
    deform_shape_key(body, basis, kb, muscle_shoulders)

    # ── muscle_arms: bicep/tricep/forearm thickness ─────────────────
    kb = add_shape_key(body, "muscle_arms")
    def muscle_arms(co, i):
        c = co.copy()
        if lateral_distance(co) > 0.22 and in_z_range(co, 0.80, 1.50):
            c.x *= 1.15
            c.y *= 1.15
        return c
    deform_shape_key(body, basis, kb, muscle_arms)

    # ── muscle_back: lat width (Y > 0 = back side) ──────────────────
    kb = add_shape_key(body, "muscle_back")
    def muscle_back(co, i):
        c = co.copy()
        if in_z_range(co, 1.10, 1.45) and co.y > 0:
            c.x *= 1.18
            c.y *= 1.05
        return c
    deform_shape_key(body, basis, kb, muscle_back)

    # ── muscle_legs: quad sweep + calf split ────────────────────────
    kb = add_shape_key(body, "muscle_legs")
    def muscle_legs(co, i):
        c = co.copy()
        if in_z_range(co, 0.25, 0.75):
            c.x *= 1.18
            c.y *= 1.15
        elif in_z_range(co, 0.02, 0.30):
            c.x *= 1.12
            c.y *= 1.12
        return c
    deform_shape_key(body, basis, kb, muscle_legs)

    # ── abs_def: rippled ab grid on rectus (front of torso) ─────────
    kb = add_shape_key(body, "abs_def")
    def abs_def(co, i):
        c = co.copy()
        if in_z_range(co, 0.95, 1.20) and co.y < -0.08:
            c.y += 0.01 * (1 + math.sin(co.z * 30))
        return c
    deform_shape_key(body, basis, kb, abs_def)

    # ── vascularity: subtle raised lines on arms/shoulders ──────────
    kb = add_shape_key(body, "vascularity")
    def vascularity(co, i):
        c = co.copy()
        if lateral_distance(co) > 0.20 and in_z_range(co, 0.85, 1.50):
            c.x *= 1.015
            c.y *= 1.015
        return c
    deform_shape_key(body, basis, kb, vascularity)

    print(f"[Alki] Created {len(CANONICAL_KEYS)} shape keys on {body.name}")


# ── Material setup ──────────────────────────────────────────────────
def setup_skin_material(body):
    """Apply a simple skin material so the export has color info."""
    mat = bpy.data.materials.new(name="alki_skin")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.78, 0.58, 0.42, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.65
        for k in ("Metallic", "Metalness"):
            if k in bsdf.inputs:
                bsdf.inputs[k].default_value = 0.0
                break
    body.data.materials.append(mat)


# ── Export ──────────────────────────────────────────────────────────
def export_glb(body, output_path):
    """Export the body as GLB with shape keys preserved."""
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
        export_skins=False,
        export_animations=False,
    )
    print(f"[Alki] Exported to {output_path}")


# ── Validation ──────────────────────────────────────────────────────
def validate_shape_keys(body):
    """Print which canonical keys exist on the body."""
    if not body.data.shape_keys:
        print("[Alki] WARN: no shape keys on body!")
        return False
    existing = [kb.name for kb in body.data.shape_keys.key_blocks]
    print(f"[Alki] Shape keys present: {existing}")
    missing = [k for k in CANONICAL_KEYS if k not in existing]
    if missing:
        print(f"[Alki] WARN: missing canonical keys: {missing}")
        return False
    print(f"[Alki] All {len(CANONICAL_KEYS)} canonical keys present")
    return True


# ── Main ────────────────────────────────────────────────────────────
def main():
    print("[Alki] Building test base body...")
    clear_scene()

    parts = build_body_primitives()
    body = join_to_single_mesh(parts, BODY_NAME)

    for poly in body.data.polygons:
        poly.use_smooth = True

    build_shape_keys(body)
    setup_skin_material(body)

    validate_shape_keys(body)
    export_glb(body, OUTPUT_PATH)

    print(f"[Alki] DONE. Drop {OUTPUT_PATH} into the app and set avatarUrl to point at it.")
    print("[Alki] Then pass a morphState through Body3DAvatar params to drive the shape keys.")


if __name__ == "__main__":
    main()
