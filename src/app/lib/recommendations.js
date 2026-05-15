import { COMPOUNDS } from "../data/compounds";

export function getRecommendations(profile) {
  const { goals, bodyFat } = profile;
  const results = [];

  for (const compound of COMPOUNDS) {
    let score = 0;
    let flags = [];
    let blocked = false;

    const goalOverlap = goals.filter(g => compound.suitability.goals.includes(g));
    score += goalOverlap.length * 25;

    if (bodyFat < compound.suitability.minBf) {
      blocked = true;
      flags.push(`Not recommended below ${compound.suitability.minBf}% body fat`);
    }
    if (bodyFat > compound.suitability.maxBf) {
      blocked = true;
    }

    if (compound.contraindications.includes("below15bf") && bodyFat < 15) {
      flags.push("Body fat below recommended threshold for this compound");
    }
    if (compound.contraindications.includes("below22bf_glp1") && bodyFat < 22) {
      blocked = true;
      flags.push("GLP-1 compounds are not recommended below 22% body fat; risk of depleting necessary mass");
    }

    if (bodyFat > 22 && compound.category === "Weight Loss") score += 30;
    if (bodyFat > 28 && compound.category === "Weight Loss") score += 20;
    if (bodyFat < 18 && compound.category === "Growth Hormone") score += 15;
    if (goals.includes("recovery") && compound.category === "Recovery") score += 20;
    if (goals.includes("anti_aging") && compound.id === "ghkcu") score += 20;
    if (goals.includes("skin") && compound.id === "ghkcu") score += 25;

    let stackNotes = [];
    if (compound.id === "bpc157") stackNotes.push("Pairs synergistically with TB-500 for systemic + localized recovery");
    if (compound.id === "tb500") stackNotes.push("Pairs synergistically with BPC-157 for comprehensive healing");
    if (compound.id === "semaglutide") stackNotes.push("Consider pairing with Ipamorelin/CJC-1295 to preserve lean mass during cut");
    if (compound.id === "retatrutide") stackNotes.push("Consider pairing with Ipamorelin/CJC-1295 to preserve lean mass during aggressive cut");
    if (compound.id === "tesamorelin") stackNotes.push("Stacks well with GHK-Cu for combined fat loss and skin quality improvement");

    if (!blocked && goalOverlap.length > 0) {
      results.push({ compound, score, flags, stackNotes, goalOverlap });
    } else if (blocked && flags.length > 0) {
      results.push({ compound, score: -1, flags, stackNotes, goalOverlap, blocked: true });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
