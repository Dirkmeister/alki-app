# Lists every HumGen LiveKey name and WRITES them to a file.
# Run in Scripting workspace, Alt+P. No console scrollback needed.
import bpy, os

GENDER = "male"
PRESET_INDEX = 0
OUT = os.path.join(os.path.expanduser("~"), "alki_livekeys.txt")

def call_flexible(func, *candidate_arglists):
    last = None
    for args in candidate_arglists:
        try:
            return func(*args)
        except Exception as e:
            last = e
    if last:
        raise last

from HumGen3D import Human
options = list(call_flexible(Human.get_preset_options, (GENDER,), (GENDER, bpy.context)))
idx = max(0, min(PRESET_INDEX, len(options) - 1))
human = call_flexible(Human.from_preset, (options[idx],), (options[idx], bpy.context))

names = sorted(lk.name for lk in human.keys.all_livekeys)
muscle = [n for n in names if any(k in n.lower() for k in
          ["calf", "calve", "quad", "leg", "thigh", "glute", "ham", "shin", "muscle"])]
# §3.6 — the mass / fat keys that feed the HEAVY base + the new body_mass key.
# body_mass MUST be distinct from bf_high (=overweight), so look here for
# regional fat keys (belly/stomach/love-handle/waist/hip) to source it from.
mass = [n for n in names if any(k in n.lower() for k in
        ["overweight", "skinny", "fat", "weight", "belly", "stomach",
         "love", "handle", "waist", "hip", "body", "size", "chubby"])]

with open(OUT, "w", encoding="utf-8") as f:
    f.write("=== ALL LIVEKEYS ===\n")
    f.write("\n".join(names))
    f.write(f"\n\ntotal: {len(names)}\n")
    f.write("\n=== §3.6 MASS / FAT CANDIDATES (heavy base + body_mass) ===\n")
    f.write("\n".join(mass))
    f.write("\n\n=== LOWER-BODY / MUSCLE CANDIDATES ===\n")
    f.write("\n".join(muscle))

print(f"[Alki] wrote {len(names)} livekey names -> {OUT}")
print(f"[Alki] §3.6 mass/fat candidates ({len(mass)}):")
for n in mass:
    print(f"[Alki]   -> {n!r}")
