import { COMPOUNDS } from "../data/compounds";

export function resolveAvatarParams(profile, selectedCompounds = []) {
  const bf = profile.bodyFat;
  const isMale = profile.sex === "male";

  const baseFat = Math.max(0, Math.min(1, (bf - 6) / 34));
  const baseMuscle = isMale ? 0.5 : 0.35;

  let fatMod = 0;
  let muscleMod = 0;
  let skinMod = 0;

  for (const cid of selectedCompounds) {
    const c = COMPOUNDS.find(x => x.id === cid);
    if (c) {
      fatMod += c.effects.bf / 100;
      muscleMod += c.effects.muscle / 100;
      skinMod += c.effects.skin;
    }
  }

  return {
    current: { fat: baseFat, muscle: baseMuscle, skin: 0, isMale },
    projected: {
      fat: Math.max(0, Math.min(1, baseFat + fatMod)),
      muscle: Math.max(0, Math.min(1, baseMuscle + muscleMod)),
      skin: skinMod,
      isMale
    }
  };
}
