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
import math

# ── EDIT THESE TWO PER RUN ───────────────────────────────────────────
GENDER = "male"        # "male" | "female"
BODY_TYPE = "heavy"    # "lean" | "heavy"

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
#   bf_high   = FLANK deposition (waist + hips). NOT a second copy of
#               "overweight", and NOT Belly Size (that is visceral's source) —
#               keeping all three adiposity keys genuinely distinct geometry.
#   visceral  = belly-FORWARD (Belly Size).
#   bf_low    = lean direction (skinny), unchanged.
# The three are instrumented below: the bake prints all three pairwise
# cosines + max Δ before export so a collision is caught before the GLB.
ALKI_FROM_LIVEKEYS = {
    "body_mass":        ["overweight"],                  # gross envelope ×3
    "bf_low":           ["skinny"],                      # lean direction
    "bf_high":          ["Waist Thickness", "Hips Size"],  # flank (confirmed present)
    "visceral":         ["Belly Size"],                  # belly-forward
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

# §3.5 — HEAVY base: the heavy rest pose is built as GEOMETRY, not via a
# runtime slider. We extract the "overweight" morph delta (set value + evaluate
# — the SAME mechanism the Alki morphs use) and add HEAVY_OVERWEIGHT_FRAC of it
# directly to the lean rest pose to form the heavy Basis.
#
# WHY NOT a background slider: HumGen's live-key COMMIT
# (human.keys.update_human_from_key_change) raises KeyError 'LIVE_KEY_PERMANENT'
# on a scripted/baked human — that buffer key only exists during interactive
# generation. So NO .value/commit call can persist a background on this mesh;
# overweight=0.5 would silently never bake in. Reading the morph delta works
# fine (it's how body_mass is made from overweight), so we do the rest-pose
# math ourselves: heavy Basis = lean_rest + 0.5 × overweight_delta. The heavy
# base then covers overweight ~0.5→beyond; the lean base covers 0→1.
HEAVY_OVERWEIGHT_KEY = "overweight"
HEAVY_OVERWEIGHT_FRAC = 0.5    # heavy Basis = lean_rest + 0.5 × overweight_delta

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
    # body_mass sources from "overweight" (raw ~0.068 on lean, 0→1) — far too
    # weak unscaled for the gross-mass channel. ×3 → ~0.20, the SAME post-scale
    # multiply the muscle keys use. The same ×3 works on the heavy base: there
    # the raw delta is overweight 0.5→1.0 (~half, ~0.034), so ×3 → ~0.10, which
    # lands in the heavy band 0.08–0.18. One flat scale, both bands hit.
    "body_mass": 3.0,
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
    # Best-effort PERMANENT commit. On a scripted/baked human this raises
    # KeyError 'LIVE_KEY_PERMANENT' (that buffer key only exists during
    # interactive generation) — but it is NOT needed: setting the value and
    # reading the EVALUATED mesh already reflects the deformation, which is all
    # the extraction below uses. So we attempt it, note the absence ONCE, and
    # carry on. (The heavy rest pose is built by geometry arithmetic on the
    # extracted overweight delta, never by persisting a slider through this.)
    try:
        call_flexible(human.keys.update_human_from_key_change, (bpy.context,), ())
    except Exception as e:
        if not getattr(set_livekeys, "_warned", False):
            print(f"[Alki] NOTE: update_human_from_key_change unavailable ({e}); "
                  f"not needed — extraction uses evaluated deltas directly.")
            set_livekeys._warned = True
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
    if BODY_TYPE == "heavy":
        print(f"[Alki] Heavy rest pose = lean + {HEAVY_OVERWEIGHT_FRAC}×"
              f"{HEAVY_OVERWEIGHT_KEY!r} delta (geometry offset, no live-key commit).")
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

    # ── Rest pose: lean evaluated body, + arithmetic overweight for heavy ──
    # basis     = Basis shape key coords (base space) — livekey-VALUE-independent.
    # lean_ref  = evaluated body with NO livekeys = the lean rest pose.
    # neutral   = THIS base's rest pose (becomes the exported Basis via rebase):
    #               lean  -> lean_ref
    #               heavy -> lean_ref + FRAC × overweight_delta, computed by
    #                        ARITHMETIC (extract the overweight morph the same
    #                        way the Alki keys are extracted, then add a
    #                        fraction of it). No live-key commit involved, so
    #                        the LIVE_KEY_PERMANENT KeyError can't no-op it.
    set_livekeys(human, {})
    basis = bake_basis(body)
    lean_ref = evaluate_mesh_positions(body)
    print(f"[Alki] basis verts: {len(basis)} | lean_ref eval verts: {len(lean_ref)}")
    if len(lean_ref) != len(basis):
        print("[Alki] ERROR: lean_ref vert count != basis. Aborting "
              "(a modifier is changing topology; the isolation math needs "
              "matching vertex order).")
        return

    if BODY_TYPE == "heavy":
        applied = set_livekeys(human, {HEAVY_OVERWEIGHT_KEY: 1.0})
        ow_full = evaluate_mesh_positions(body)
        set_livekeys(human, {})                       # back to the lean body
        if HEAVY_OVERWEIGHT_KEY not in applied or len(ow_full) != len(lean_ref):
            print(f"[Alki] ERROR: could not read {HEAVY_OVERWEIGHT_KEY!r} delta "
                  f"(applied={applied}, verts={len(ow_full)}); cannot build the "
                  f"heavy rest pose. Aborting.")
            return
        neutral = [lean_ref[i] + (ow_full[i] - lean_ref[i]) * HEAVY_OVERWEIGHT_FRAC
                   for i in range(len(lean_ref))]
        ow_max = max((ow_full[i] - lean_ref[i]).length for i in range(len(lean_ref)))
        print(f"[Alki] Built heavy rest pose: lean + {HEAVY_OVERWEIGHT_FRAC}×"
              f"overweight (overweight morph max Δ {ow_max:.4f}).")
    else:
        neutral = lean_ref

    # Rest-pose extents (informational; the hard gate before export enforces).
    def _extents(coords):
        return tuple(max(c[a] for c in coords) - min(c[a] for c in coords)
                     for a in range(3))
    lref, ncur = _extents(lean_ref), _extents(neutral)
    print(f"[Alki] Rest extents (X,Y,Z)  lean_ref="
          f"{tuple(round(v, 3) for v in lref)}  neutral="
          f"{tuple(round(v, 3) for v in ncur)}")

    # ── Neck-seam vertex set (spec §1.3/§3.7 #6) ──────────────────────
    # Lock the head-attach reserve so NO morph disturbs the neck seam. The
    # seam is defined in the EXPORTED mesh, whose Basis == `neutral` and whose
    # up-axis becomes glTF +Y. We therefore pick seam verts from `neutral` on
    # the empirically-detected up-axis (largest extent) — NOT from the raw
    # pre-rebase Basis on a hardcoded .y. That space/axis mismatch is exactly
    # why the earlier lock missed the seam. This set is the SAME indices
    # check_glb step [8] measures, so locking them forces neck Δ == 0 there.
    nlo, nhi = NECK_SEAM_Y
    _ext = [max(c[a] for c in neutral) - min(c[a] for c in neutral) for a in range(3)]
    UP = max(range(3), key=lambda a: _ext[a])
    seam_idx = {i for i in range(len(neutral)) if nlo <= neutral[i][UP] <= nhi}
    print(f"[Alki] Neck-seam lock: up-axis '{'xyz'[UP]}', band [{nlo},{nhi}] "
          f"holds {len(seam_idx)}/{len(neutral)} verts (zeroed in every morph).")
    if not seam_idx:
        print("[Alki]   !! WARNING: no verts in the seam band — mesh scale/axis "
              "differs from the 1.8-unit reference; inspect before trusting.")

    created = []
    for alki_key, source_lks in ALKI_FROM_LIVEKEYS.items():
        # Only this key's source livekeys active (extracted on the LEAN body).
        # The morph delta is taken against `neutral` below, so on the heavy base
        # each key is automatically the marginal push/pull FROM the heavy rest
        # pose — e.g. body_mass = (overweight − heavy_rest) = the 0.5→1.0 push,
        # bf_low = (skinny − heavy_rest) = the full slim-down toward lean.
        mapping = {}
        for lk_name in source_lks:
            mapping[lk_name] = 1.0
        applied = set_livekeys(human, mapping)
        source_applied = applied

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
        # NECK-SEAM LOCK: verts in `seam_idx` (computed above, in exported-Basis
        # space) get ZERO displacement so no morph disturbs the neck seam. Set
        # relative to basis, so it survives the rebase-onto-neutral untouched
        # (old_delta == 0 → new co == neutral). Applies to ALL bases.
        scale = MORPH_SCALE.get(alki_key, 1.0)
        max_d = 0.0
        sum_d = 0.0
        neck_locked = 0
        for i in range(len(deformed)):
            if i in seam_idx:
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

    # Reset livekeys to zero; the rest pose is set by the rebase onto `neutral`
    # (which already encodes the heavy offset for heavy bases), not by sliders.
    set_livekeys(human, {})

    # Flat placeholders for keys with no HumGen source (sculpt later).
    for key in ALKI_CUSTOM_PLACEHOLDERS:
        if body.data.shape_keys.key_blocks.get(key) is None:
            body.shape_key_add(name=key, from_mix=False)
            print(f"[Alki] Added placeholder {key!r} (flat; sculpt later)")
            created.append(key)

    print(f"[Alki] Created {len(created)} canonical keys: {created}")

    # ── Cross-key region signature (legs|torso|upper mean Δ) ──────────
    # Classify by the SAME up-axis + exported-Basis (neutral) space as the
    # seam lock, so the neck Δ reported here matches check_glb step [8].
    print("[Alki] Region signature per key (legs|torso|upper mean Δ) + neck-seam Δ:")
    ys = [c[UP] for c in neutral]
    ymin, ymax = min(ys), max(ys); H = (ymax - ymin) or 1.0

    def region_means(kb):
        legs = tor = arm = 0.0
        nl = nt = na = 0
        neck_max = 0.0
        for i in range(len(basis)):
            d = (kb.data[i].co - basis[i]).length
            fy = (neutral[i][UP] - ymin) / H
            if fy < 0.45: legs += d; nl += 1
            elif fy < 0.82: tor += d; nt += 1
            else: arm += d; na += 1
            if i in seam_idx and d > neck_max:
                neck_max = d
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

    # ── Adiposity-trio distinctness (pre-export) ──────────────────────
    # body_mass / bf_high / visceral MUST be three DIFFERENT shapes. Print the
    # three max Δ and all three pairwise cosines BEFORE export, so a collision
    # (two keys ~identical → |cos| near 1) is caught before the GLB is trusted.
    # Deltas read here (kb.co − basis) are pre-rebase and identical to the
    # exported deltas. check_glb re-checks body_mass↔bf_high on the file.
    def _delta(name):
        kb = body.data.shape_keys.key_blocks.get(name)
        return [kb.data[i].co - basis[i] for i in range(len(basis))] if kb else None

    def _cos(a, b):
        if a is None or b is None:
            return None
        dot = sum(a[i].dot(b[i]) for i in range(len(a)))
        na = math.sqrt(sum(v.length_squared for v in a))
        nb = math.sqrt(sum(v.length_squared for v in b))
        return dot / (na * nb + 1e-12)

    trio = {k: _delta(k) for k in ("body_mass", "bf_high", "visceral")}
    print("[Alki] Adiposity trio — max Δ:")
    for k, d in trio.items():
        print(f"[Alki]   {k:<10} " +
              (f"max Δ {max(v.length for v in d):.4f}" if d else "(absent)"))
    # Gate at 0.85 (clone detection), NOT 0.5: gross mass and flank honestly
    # co-thicken the midsection, so a moderate cosine is correct anatomy — only
    # a near-clone (≥0.85, two keys sharing a source) is a real defect.
    print("[Alki] Adiposity trio — pairwise cosine (clone if |cos| ≥ 0.85):")
    for a, b in (("body_mass", "bf_high"), ("body_mass", "visceral"),
                 ("bf_high", "visceral")):
        c = _cos(trio[a], trio[b])
        flag = "  << CLONE" if (c is not None and abs(c) >= 0.85) else ""
        print(f"[Alki]   cos({a:<10}, {b:<10}) = " +
              (f"{c:+.4f}{flag}" if c is not None else "n/a"))

    # ── Bake the gender/heavy body into Basis, strip extra shape keys ──
    # The Alki morphs were stored as basis + scaled(deformed − neutral). We
    # REBASE them onto `neutral` (the gender body, + heavy mass if heavy), so
    # their deltas are unchanged relative to the new rest pose:
    #     new_morph_co = neutral[i] + (old_morph_co − basis[i])
    # then move `neutral` into Basis. Male/heavy/correctives drop out safely.
    sk = body.data.shape_keys.key_blocks
    # The TRUE relative-basis key — what every morph is relative to AND what the
    # exporter writes as the base POSITION. Do NOT look it up by the name
    # "Basis": HumGen's reference key may be named otherwise, and updating the
    # wrong block leaves the EXPORTED base lean (morphs rebase onto neutral, but
    # the real base never moves — the exact lean-clone symptom we hit).
    basis_kb = body.data.shape_keys.reference_key or sk[0]

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
    # Flush the edits into the mesh + depsgraph so the EXPORT and the gate's
    # re-evaluation below see the new base, not a stale pre-write copy.
    body.data.update()

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

    # ── HARD GATE: heavy base must actually be heavy (no silent no-op) ──
    # Measure the RE-EVALUATED mesh — with all morphs at 0 this IS the exported
    # base geometry, so it reflects what truly committed, NOT the Python-side
    # key block we wrote (which always reads back correct even if the write
    # never reached the exported base — the bug that hid the last failure).
    # RAISE if a heavy base didn't widen vs its own lean rest pose (relative
    # threshold ⇒ correct for the female pair too; for male, lean ≈ 1.19).
    if BODY_TYPE == "heavy":
        final = evaluate_mesh_positions(body)
        final_xw = max(c[0] for c in final) - min(c[0] for c in final)
        lean_xw = max(c[0] for c in lean_ref) - min(c[0] for c in lean_ref)
        print(f"[Alki] FINAL evaluated base X-width = {final_xw:.3f} "
              f"(lean rest = {lean_xw:.3f})")
        if final_xw <= lean_xw + 0.005:
            raise RuntimeError(
                f"Heavy bake produced a NON-heavy exported base (X-width "
                f"{final_xw:.3f} ≤ lean {lean_xw:.3f} + tol). The 0.5×overweight "
                f"offset did not commit to the base mesh the exporter reads. "
                f"Refusing to export a lean clone.")

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
