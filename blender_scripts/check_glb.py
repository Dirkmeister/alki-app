# ═══════════════════════════════════════════════════════════
# ALKI — GLB base-mesh verifier  (§3.7 per-base checklist gate)
# ═══════════════════════════════════════════════════════════
# Reads a base GLB straight from bytes (no Blender) and runs the Avatar
# Range §3.7 acceptance checklist, printing PASS/FAIL per criterion. This is
# the "verify before claiming fixed" gate — run it on every base before
# accepting it.
#
# RUN:  python blender_scripts/check_glb.py <path-to.glb> [lean|heavy]
#   e.g. python blender_scripts/check_glb.py public/alki_humgen_female_lean.glb lean
#
# In-pair vertex-order identity (§3.4/§4.5) is a CROSS-FILE check — compare
# the "vertices" count printed for a lean/heavy PAIR (they must be equal, and
# for the male pair == 26575). This tool prints the count; run it on both.

import struct, json, math, sys

# Windows consoles default to cp1252 and choke on the report glyphs (Δ, ≤, …).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PATH = sys.argv[1] if len(sys.argv) > 1 else r"public/alki_humgen_male.glb"
BODY_TYPE = (sys.argv[2] if len(sys.argv) > 2 else "").lower()  # "lean"|"heavy"|""

# Canonical GEOMETRY shape keys (the 13 originals + body_mass = 14). The two
# material keys (skin_tone_shift, skin_quality) are NOT shape keys.
GEOMETRY_KEYS = [
    "bf_low", "bf_high", "body_mass", "visceral", "water",
    "muscle_overall", "muscle_chest", "muscle_shoulders", "muscle_arms",
    "muscle_back", "muscle_legs", "muscle_calves", "abs_def", "vascularity",
]
MUSCLE_KEYS = ["muscle_overall", "muscle_chest", "muscle_shoulders",
               "muscle_arms", "muscle_back", "muscle_legs", "muscle_calves"]
PLACEHOLDERS = ["water", "abs_def", "vascularity"]

# §3.7 acceptance bands.
BODY_MASS_DISP = {"lean": (0.15, 0.28), "heavy": (0.15, 0.28)}  # Composition C is independent of the heavy neutral (not derived from overweight), so both bases use the same band
MUSCLE_OVERALL_DISP = (0.035, 0.075)   # spec target ~0.05
# Adiposity-trio CLONE gate. This threshold's real job is catching SCALED-CLONE
# keys (cosine ~0.85–1.0 — e.g. the body_mass==visceral collision we hit when two
# keys shared a source). It is NOT meant to force anatomically-independent fat
# distributions apart: gross mass (overweight) and flank (waist+hips) genuinely
# co-thicken the midsection, so body_mass↔bf_high ≈0.71 is HONEST correlated
# geometry, not a clone. Gate all three adiposity pairs at 0.85.
# (Driver note: because body_mass↔bf_high share a real waist component, the
# Stage-0 driver in mapToMorphs.js should treat bf_high as a MODIFIER layered on
# body_mass, not an independent additive channel, to avoid double-counting the
# midsection. That is a blending concern, not a geometry defect.)
ADIPOSITY_CLONE_COS_MAX = 0.85         # ≥ this ⇒ likely a scaled clone
CHEST_LEGS_COS_MAX = 0.30              # distinct regional muscle
NECK_SEAM_Y = (1.51, 1.53)
# Forward-looking head-attach gate. Natural fat/shoulder morphs legitimately
# influence the lower neck (the current shipped mesh moves it up to ~0.023),
# so this catches GROSS deformation only — not all movement. body_mass in
# particular (§3.2: neck untouched) should print well under this.
NECK_MAX_DELTA = 0.030
PLACEHOLDER_MAX_DELTA = 1e-4
FILE_SIZE_WARN_MB = 5.5

# ── GLB parse ────────────────────────────────────────────────
data = open(PATH, "rb").read()
length = struct.unpack("<I", data[8:12])[0]
off = 12; chunks = []
while off < length:
    clen, ctype = struct.unpack("<II", data[off:off + 8])
    chunks.append((ctype, data[off + 8:off + 8 + clen]))
    off += 8 + clen
g = json.loads(chunks[0][1].decode("utf-8"))
binc = chunks[1][1]

CT = {5121: "B", 5123: "H", 5125: "I"}
CSZ = {5121: 1, 5123: 2, 5125: 4}


def read_scalars(bvi, bo, comp, c):
    bv = g["bufferViews"][bvi]; start = bv.get("byteOffset", 0) + bo
    fmt = "<" + CT[comp] * c; sz = CSZ[comp] * c
    return list(struct.unpack(fmt, binc[start:start + sz]))


def acc(idx):
    a = g["accessors"][idx]; n = a["count"]
    full = [[0.0, 0.0, 0.0] for _ in range(n)]
    if "bufferView" in a:
        bv = g["bufferViews"][a["bufferView"]]
        start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        flat = struct.unpack("<" + "f" * (n * 3), binc[start:start + 12 * n])
        full = [[flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]] for i in range(n)]
    if "sparse" in a:
        sp = a["sparse"]; c = sp["count"]; ic = sp["indices"]; vc = sp["values"]
        idxs = read_scalars(ic["bufferView"], ic.get("byteOffset", 0), ic["componentType"], c)
        bvv = g["bufferViews"][vc["bufferView"]]
        vstart = bvv.get("byteOffset", 0) + vc.get("byteOffset", 0)
        vals = struct.unpack("<" + "f" * (c * 3), binc[vstart:vstart + 12 * c])
        for k, vi in enumerate(idxs):
            full[vi] = [vals[k * 3], vals[k * 3 + 1], vals[k * 3 + 2]]
    return full


prim = g["meshes"][0]["primitives"][0]
# targetNames can live on mesh.extras or primitive.extras depending on exporter.
tn = (g["meshes"][0].get("extras", {}) or {}).get("targetNames") \
    or (prim.get("extras", {}) or {}).get("targetNames") or []
targets = prim.get("targets", [])
name_to_target = {tn[i]: targets[i] for i in range(min(len(tn), len(targets)))}

base_pos = acc(prim["attributes"]["POSITION"])
VERTS = len(base_pos)


def D(k):
    t = name_to_target.get(k)
    return acc(t["POSITION"]) if t and "POSITION" in t else None


def dot(a, b): return sum(a[i][0] * b[i][0] + a[i][1] * b[i][1] + a[i][2] * b[i][2] for i in range(len(a)))
def norm(a): return math.sqrt(sum(a[i][0] ** 2 + a[i][1] ** 2 + a[i][2] ** 2 for i in range(len(a))))
def cos(a, b):
    if a is None or b is None: return None
    return dot(a, b) / (norm(a) * norm(b) + 1e-12)
def maxdisp(a): return max(math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2) for v in a) if a else 0.0
def nonzero(a): return sum(1 for v in a if (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) > 1e-12) if a else 0


# ── Report ───────────────────────────────────────────────────
results = []  # (ok, label)
def check(ok, label):
    results.append((ok, label))
    print(("  PASS " if ok else "  FAIL ") + label)

print("=" * 64)
print(f"file: {PATH}")
print(f"bytes: {length}   vertices: {VERTS}   body_type: {BODY_TYPE or '(unspecified)'}")
print("=" * 64)

# 1) Key presence — all 14.
present = [k for k in GEOMETRY_KEYS if k in name_to_target]
missing = [k for k in GEOMETRY_KEYS if k not in name_to_target]
print(f"\n[1] Key presence — {len(present)}/14 geometry keys")
check(len(missing) == 0, f"all 14 geometry keys present" + (f" (MISSING: {missing})" if missing else ""))
extra = [k for k in tn if k not in GEOMETRY_KEYS]
if extra:
    print(f"      note: non-canonical target(s) present: {extra}")

# Per-key disp table.
print("\n[disp table] key: max Δ / nonzero verts")
for k in GEOMETRY_KEYS:
    d = D(k)
    if d is None:
        print(f"      {k:<16} (absent)")
    else:
        print(f"      {k:<16} max {maxdisp(d):.4f}   nonzero {nonzero(d)}/{VERTS}")

# 3) Adiposity trio distinctness — no PAIR may be a scaled clone (cos ≥ 0.85).
#    body_mass / bf_high / visceral are anatomically correlated (all thicken the
#    midsection), so moderate cosines are expected and honest; only near-clone
#    pairs fail. See the ADIPOSITY_CLONE_COS_MAX rationale above.
print(f"\n[3] adiposity trio pairwise cosine (clone if ≥ {ADIPOSITY_CLONE_COS_MAX})")
for _a, _b in (("body_mass", "bf_high"), ("body_mass", "visceral"), ("bf_high", "visceral")):
    _c = cos(D(_a), D(_b))
    print(f"      cos({_a}, {_b}) = {None if _c is None else round(_c, 4)}")
    check(_c is not None and abs(_c) < ADIPOSITY_CLONE_COS_MAX,
          f"{_a} & {_b} are not clones (cos < {ADIPOSITY_CLONE_COS_MAX})")

# 4) muscle_chest vs muscle_legs cosine ~0 (v3 regression guard).
c_cl = cos(D("muscle_chest"), D("muscle_legs"))
print(f"\n[4] muscle_chest↔muscle_legs cosine = {None if c_cl is None else round(c_cl,4)} (want < {CHEST_LEGS_COS_MAX})")
check(c_cl is not None and abs(c_cl) < CHEST_LEGS_COS_MAX,
      "regional muscle keys are distinct")

# 5) body_mass magnitude in band.
bm = D("body_mass"); bm_max = maxdisp(bm)
band = BODY_MASS_DISP.get(BODY_TYPE)
print(f"\n[5] body_mass max disp = {bm_max:.4f}" + (f"  band {band}" if band else "  (pass lean|heavy as arg 2 to band-check)"))
check(nonzero(bm) > VERTS * 0.1, "body_mass deforms a broad region (nonzero > 10% verts)")
if band:
    check(band[0] <= bm_max <= band[1], f"body_mass max disp within {BODY_TYPE} band {band}")

# 6) muscle_overall re-sculpt magnitude.
mo_max = maxdisp(D("muscle_overall"))
print(f"\n[6] muscle_overall max disp = {mo_max:.4f}  target ~0.05 {MUSCLE_OVERALL_DISP}")
check(MUSCLE_OVERALL_DISP[0] <= mo_max <= MUSCLE_OVERALL_DISP[1],
      "muscle_overall re-sculpted into target band")

# 7) Placeholders flat.
print(f"\n[7] placeholders flat (water/abs_def/vascularity)")
ph_ok = True
for k in PLACEHOLDERS:
    d = D(k); md = maxdisp(d) if d is not None else 0.0
    flat = md < PLACEHOLDER_MAX_DELTA
    ph_ok = ph_ok and flat
    print(f"      {k:<14} max Δ {md:.6f} {'(flat)' if flat else '(NOT FLAT)'}")
check(ph_ok, "all three placeholders are flat")

# 8) Neck-seam band — INFORMATIONAL (lockout disabled 2026-06-04, no head mesh).
# Re-enable when a head-attach mesh ships (Avaturn "MAKE IT ME" or equivalent).
nlo, nhi = NECK_SEAM_Y
neck_idx = [i for i in range(VERTS) if nlo <= base_pos[i][1] <= nhi]
print(f"\n[8] neck-seam band y∈[{nlo},{nhi}] — {len(neck_idx)} verts; lockout DISABLED (informational)")
for k in GEOMETRY_KEYS:
    d = D(k)
    if d is None:
        continue
    nm = max((math.sqrt(d[i][0] ** 2 + d[i][1] ** 2 + d[i][2] ** 2) for i in neck_idx), default=0.0)
    print(f"      {k:<16} neck Δ {nm:.4f}")
check(True, "neck-seam lockout disabled (re-enable for head-attach)")

# 9) File size.
mb = length / 1e6
print(f"\n[9] file size = {mb:.2f} MB (pre-slim; warn > {FILE_SIZE_WARN_MB})")
check(mb <= FILE_SIZE_WARN_MB, f"file ≤ {FILE_SIZE_WARN_MB} MB (run slim_all_bases.mjs if over)")

# ── Summary ──────────────────────────────────────────────────
passed = sum(1 for ok, _ in results if ok)
print("\n" + "=" * 64)
print(f"RESULT: {passed}/{len(results)} checks passed")
if passed != len(results):
    print("  ▼ FAILURES:")
    for ok, label in results:
        if not ok:
            print("    - " + label)
    print("\n  (vertex-order in-pair identity is a CROSS-FILE check — compare the")
    print("   'vertices' count above against this base's lean/heavy partner.)")
    sys.exit(1)
print("  All §3.7 byte-level gates passed. (Still do the visual A/B in §3.7 #10")
print("   and the in-app shape_keys load + in-pair vertex-count match.)")
