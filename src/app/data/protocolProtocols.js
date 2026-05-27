/**
 * ALKI — PROTOCOL PROTOCOLS (Plan C data layer)
 * ────────────────────────────────────────────────────────────
 * Structured, per-compound implementation data that powers the
 * personalized Protocol Guide: supply list, reconstitution calc,
 * injection sites, weekly schedule, what-to-expect, bloodwork.
 *
 * SOURCE OF TRUTH for the guide. Keyed by compound `id` (matches
 * data/compounds.js COMPOUNDS and AlkiApp's inline COMPOUNDS).
 *
 * Pure data + pure helpers — imports NOTHING from React/renderers
 * (portability firewall, CLAUDE.md rule 1).
 *
 * CONFIDENCE / SAFETY:
 *   Every record carries `confidence` ("high" | "needs_review")
 *   and `sources`. The 8 core compounds are hand-authored from the
 *   CycleTimeline CYCLE_PROFILES + AlkiProtocolQA FAQs ("high").
 *   The rest are DERIVED from each compound's in-repo
 *   dosing/cycle/route/category fields + category defaults, and
 *   default to "needs_review" — they give the guide a usable record
 *   for every stack, but the owner must audit them before they are
 *   treated as authoritative. `REVIEW_QUEUE` lists those ids.
 *
 * FOR RESEARCH AND EDUCATIONAL PURPOSES ONLY. NOT MEDICAL ADVICE.
 * Nothing here prescribes, diagnoses, or treats.
 * ────────────────────────────────────────────────────────────
 */

import { COMPOUNDS } from "./compounds";

// Standard SubQ injection sites used across injectable peptides.
const SUBQ_SITES = ["abdomen", "thigh", "love_handle"];

// ── Hand-authored, high-confidence records: the 8 core compounds ──
// Fields seeded from CycleTimeline CYCLE_PROFILES + AlkiProtocolQA.
const AUTHORED = {
  bpc157: {
    routeType: "injectable", injectionDepth: "subq", injectionSites: ["abdomen", "love_handle"],
    dose: { amount: 500, unit: "mcg" }, frequency: "daily", timing: "AM",
    reconstitution: { vialSizes: [5, 10], defaultVialMg: 5, defaultBacWaterMl: 2, perDoseMcg: 500 },
    cycle: { onWeeks: 6, offWeeks: 2, standardCycleWeeks: 6 },
    weekByWeek: [
      { weeks: "1–2", expect: "Gut/digestive improvements often reported first." },
      { weeks: "3–6", expect: "Tendon, ligament, and soft-tissue repair builds." },
    ],
    bloodwork: { required: false, panel: ["CMP", "CBC"], note: "Non-hormonal, non-suppressive — no hormone panel required." },
    supplies: { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: true },
    sources: ["AlkiProtocolQA reconstitution FAQ", "CYCLE_PROFILES.bpc157"],
  },
  tb500: {
    routeType: "injectable", injectionDepth: "subq", injectionSites: SUBQ_SITES,
    dose: { amount: 2.5, unit: "mg" }, frequency: "2x-week", days: [1, 4], timing: "AM",
    loadingDose: { amount: 5, unit: "mg", weeks: [1, 2] },
    reconstitution: { vialSizes: [5, 10], defaultVialMg: 10, defaultBacWaterMl: 2, perDoseMcg: 2500 },
    cycle: { onWeeks: 6, offWeeks: 0, standardCycleWeeks: 6 },
    weekByWeek: [
      { weeks: "1–2", expect: "Loading dose (5mg/wk). Systemic recovery begins." },
      { weeks: "3–6", expect: "2.5mg/wk maintenance. Flexibility and whole-body healing." },
    ],
    bloodwork: { required: false, panel: ["CMP", "CBC"], note: "Non-hormonal. Baseline panel optional." },
    supplies: { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: true },
    sources: ["CYCLE_PROFILES.tb500"],
  },
  ipacjc: {
    routeType: "injectable", injectionDepth: "subq", injectionSites: SUBQ_SITES,
    dose: { amount: 200, unit: "mcg", note: "200mcg Ipamorelin + 200mcg CJC-1295" }, frequency: "5-on-2-off", days: [1, 2, 3, 4, 5], timing: "PM",
    reconstitution: { vialSizes: [5, 10], defaultVialMg: 5, defaultBacWaterMl: 2, perDoseMcg: 200, note: "Each peptide reconstituted separately; doses are per-peptide." },
    cycle: { onWeeks: 12, offWeeks: 4, standardCycleWeeks: 12 },
    weekByWeek: [
      { weeks: "1–3", expect: "Deeper sleep is usually the first noticeable change." },
      { weeks: "4–8", expect: "Recovery and skin quality improve; gradual recomposition." },
      { weeks: "9–12", expect: "Lean-mass and fat-redistribution effects mature." },
    ],
    bloodwork: { required: false, panel: ["IGF-1", "Fasting glucose"], note: "GH-axis — IGF-1 and glucose worth monitoring." },
    supplies: { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: true },
    sources: ["CYCLE_PROFILES.ipacjc"],
  },
  tesamorelin: {
    routeType: "injectable", injectionDepth: "subq", injectionSites: ["abdomen"],
    dose: { amount: 1.4, unit: "mg" }, frequency: "daily", timing: "PM",
    reconstitution: { vialSizes: [5, 10], defaultVialMg: 5, defaultBacWaterMl: 2, perDoseMcg: 1400 },
    cycle: { onWeeks: 12, offWeeks: 0, standardCycleWeeks: 12 },
    weekByWeek: [
      { weeks: "1–4", expect: "Sleep and recovery improve; visceral-fat effect is gradual." },
      { weeks: "5–12", expect: "Visceral adipose reduction accrues. Re-evaluate at week 12." },
    ],
    bloodwork: { required: true, panel: ["IGF-1", "Fasting glucose", "HbA1c"], note: "GH-axis — monitor IGF-1 and glucose." },
    supplies: { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: true },
    sources: ["CYCLE_PROFILES.tesamorelin"],
  },
  semaglutide: {
    routeType: "injectable", injectionDepth: "subq", injectionSites: ["abdomen", "thigh"],
    dose: { amount: 2.4, unit: "mg" }, frequency: "weekly", days: [0], timing: "AM",
    titration: [
      { weeks: "1–4", dose: "0.25 mg/wk" }, { weeks: "5–8", dose: "0.5 mg/wk" },
      { weeks: "9–12", dose: "1.0 mg/wk" }, { weeks: "13–16", dose: "1.7 mg/wk" },
      { weeks: "17+", dose: "2.4 mg/wk" },
    ],
    reconstitution: { vialSizes: [5, 10], defaultVialMg: 5, defaultBacWaterMl: 2, perDoseMcg: 250, note: "Dose escalates per the titration schedule — start at 0.25mg/wk." },
    cycle: { onWeeks: 24, offWeeks: 0, standardCycleWeeks: 24 },
    weekByWeek: [
      { weeks: "1–4", expect: "0.25mg titration. Appetite suppression begins; mild GI side effects." },
      { weeks: "5–16", expect: "Dose escalates. Steady weight loss; pair resistance training to protect lean mass." },
      { weeks: "17+", expect: "Maintenance dose. Continued loss; weight regain is common if stopped abruptly." },
    ],
    bloodwork: { required: false, panel: ["CMP", "Lipids", "HbA1c"], note: "Monitor metabolic panel; titration minimizes GI effects." },
    supplies: { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: true },
    sources: ["CYCLE_PROFILES.semaglutide", "AlkiProtocolQA GLP-1 FAQ"],
  },
  retatrutide: {
    routeType: "injectable", injectionDepth: "subq", injectionSites: ["abdomen", "thigh"],
    dose: { amount: 8, unit: "mg" }, frequency: "weekly", days: [0], timing: "AM",
    titration: [
      { weeks: "1–4", dose: "1 mg/wk" }, { weeks: "5–8", dose: "2 mg/wk" },
      { weeks: "9–12", dose: "4 mg/wk" }, { weeks: "13+", dose: "8 mg/wk" },
    ],
    reconstitution: { vialSizes: [10, 20], defaultVialMg: 10, defaultBacWaterMl: 2, perDoseMcg: 1000, note: "Dose escalates per titration — start at 1mg/wk." },
    cycle: { onWeeks: 24, offWeeks: 0, standardCycleWeeks: 24 },
    weekByWeek: [
      { weeks: "1–4", expect: "1mg titration. Strong appetite suppression; expect GI adjustment." },
      { weeks: "5–12", expect: "Escalation. Aggressive weight loss; protect lean mass with training + protein." },
      { weeks: "13+", expect: "Full dose. Most potent GLP-class loss; escalate slowly to tolerate." },
    ],
    bloodwork: { required: false, panel: ["CMP", "Lipids", "HbA1c"], note: "Most aggressive GLP class — monitor metabolic panel." },
    supplies: { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: true },
    sources: ["CYCLE_PROFILES.retatrutide"],
  },
  ghkcu: {
    routeType: "topical", injectionDepth: null, injectionSites: [],
    dose: { amount: 2, unit: "mg" }, frequency: "daily", timing: "AM",
    reconstitution: null,
    cycle: { onWeeks: 4, offWeeks: 2, standardCycleWeeks: 4 },
    weekByWeek: [
      { weeks: "1–4", expect: "Skin texture, tone, and luminosity improve gradually." },
      { weeks: "5–8", expect: "Collagen-driven changes mature with repeated 30-day cycles." },
    ],
    bloodwork: { required: false, panel: [], note: "Topical copper peptide — no routine bloodwork required." },
    supplies: { needsSyringe: false, syringeType: null, needsBacWater: false, extras: ["Topical GHK-Cu serum/cream (or vial if injecting)"] },
    sources: ["CYCLE_PROFILES.ghkcu"],
  },
  pt141: {
    routeType: "injectable", injectionDepth: "subq", injectionSites: ["abdomen", "thigh"],
    dose: { amount: 1.75, unit: "mg" }, frequency: "as-needed", maxPerWeek: 2, timing: "As needed",
    reconstitution: { vialSizes: [10], defaultVialMg: 10, defaultBacWaterMl: 2, perDoseMcg: 1750 },
    cycle: { onWeeks: 0, offWeeks: 0, standardCycleWeeks: 0 },
    weekByWeek: [
      { weeks: "Per use", expect: "Use ~45 min before activity. Effect is on-demand, not cumulative. Max 2×/week." },
    ],
    bloodwork: { required: false, panel: [], note: "On-demand use — no routine bloodwork required." },
    supplies: { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: true },
    sources: ["CYCLE_PROFILES.pt141"],
  },
};

// ── Derivation for compounds without an authored record ──────────
// Produces a complete, usable record from a compound's existing
// in-repo fields. Marked needs_review — seeds, not clinical truth.

function deriveRouteType(route = "") {
  const r = route.toLowerCase();
  if (/intranasal|nasal|spray/.test(r)) return "nasal";
  if (/sublingual/.test(r)) return "oral";
  if (/oral|capsule|tablet/.test(r)) return "oral"; // "Oral or topical" → oral (primary route)
  if (/topical|cream|serum/.test(r)) return "topical";
  return "injectable"; // SubQ / IM default
}

// Precedence matters: "Nx daily" is daily cadence; "Nx weekly" / "Nx/week" /
// EOD is multi-weekly; bare "weekly" / "/week" is once-weekly. Checking daily
// and multi-weekly BEFORE bare-weekly avoids "2x/week" or "3x weekly" being
// mis-read as once-weekly, and "2–3x daily" as multi-weekly.
function deriveFrequency(dosing = "", cycle = "") {
  const d = `${dosing} ${cycle}`.toLowerCase();
  if (/as.?needed|prn|per use/.test(d)) return "as-needed";
  if (/x\s*daily|x\/day|times?\s*(?:a|per)\s*day|\bbid\b|\btid\b/.test(d)) return "daily"; // "1–3x daily", "2x daily"
  if (/\/day|per day|every day|\bdaily\b/.test(d)) return "daily";
  if (/\dx\s*(?:weekly|\/week|per week|a week)|twice.?week|every other day|\beod\b/.test(d)) return "2x-week"; // "3x weekly", "2x/week"
  if (/once.?(?:weekly|a week|per week)|1x.?week|weekly|\/week/.test(d)) return "weekly";
  if (/5.?on|weekday/.test(d)) return "5-on-2-off";
  return "daily";
}

function deriveTiming(c) {
  const d = (c.dosing || "").toLowerCase();
  if (/as.?needed|prn/.test(d)) return "As needed";
  if (c.category === "Growth Hormone" || /pm\b|evening|pre.?bed|pre.?sleep|bedtime|sleep/.test(`${c.dosing} ${c.route}`.toLowerCase())) return "PM";
  return "AM";
}

// Pull the first "<number><unit>" out of a dosing string.
function parseDose(dosing = "") {
  const m = dosing.match(/([\d.]+)\s*(mcg|mg|iu)\b/i);
  if (!m) return { amount: null, unit: "" };
  return { amount: parseFloat(m[1]), unit: m[2].toLowerCase() };
}

function toMcg({ amount, unit }) {
  if (amount == null) return null;
  if (unit === "mg") return amount * 1000;
  if (unit === "mcg") return amount;
  return null; // iu / unknown → not reconstitutable by mass
}

// Never fabricate a cycle length. If the source has no parseable week count we
// return onWeeks: null and carry the raw string so the UI shows the real cadence
// ("pulsed", "throughout cycle", "ongoing", etc.) instead of a made-up "8 weeks".
function parseCycle(cycle = "") {
  const raw = (cycle || "").trim();
  const on = cycle.match(/(\d+)\s*(?:–|-|to)?\s*(\d+)?\s*weeks?\s*on/i) || cycle.match(/(\d+)\s*(?:–|-|to)\s*(\d+)\s*week/i) || cycle.match(/(\d+)\s*week/i);
  const off = cycle.match(/(\d+)\s*weeks?\s*off/i);
  const dayCycle = cycle.match(/(\d+)\s*(?:–|-|to)?\s*(\d+)?\s*day/i);
  let onWeeks = null;
  if (on) onWeeks = parseInt(on[2] || on[1]) || null;
  else if (/ongoing|indefinite|sustainable|long.?term|throughout|6\+/i.test(cycle)) onWeeks = null; // continuous — no fixed length
  else if (dayCycle) onWeeks = Math.max(1, Math.round(parseInt(dayCycle[2] || dayCycle[1]) / 7)); // "10–20 day cycles" → ~weeks
  return { onWeeks, offWeeks: off ? parseInt(off[1]) : 0, raw };
}

function deriveBloodwork(category) {
  if (category === "SARM" || category === "Hormonal") {
    return { required: true, panel: ["Total T", "Free T", "LH", "FSH", "E2", "ALT/AST", "Lipids"], note: "Suppressive class — full hormone + liver panel pre/post cycle." };
  }
  if (category === "Metabolic") {
    return { required: false, panel: ["CMP", "Lipids", "Fasting glucose"], note: "Monitor metabolic and lipid panel." };
  }
  if (category === "Growth Hormone" || category === "Fat Loss" || category === "Weight Loss") {
    return { required: false, panel: ["IGF-1", "Fasting glucose"], note: "GH/metabolic axis — monitor IGF-1 and glucose." };
  }
  return { required: false, panel: ["CMP", "CBC"], note: "No routine hormone panel required for this class." };
}

function deriveRecord(c) {
  const routeType = deriveRouteType(c.route);
  const dose = parseDose(c.dosing);
  const injectable = routeType === "injectable";
  const perDoseMcg = injectable ? toMcg(dose) : null;
  return {
    id: c.id,
    routeType,
    injectionDepth: injectable ? (/intramuscular|\bim\b/i.test(c.route || "") ? "im" : "subq") : null,
    injectionSites: injectable ? SUBQ_SITES : [],
    dose,
    frequency: deriveFrequency(c.dosing, c.cycle),
    timing: deriveTiming(c),
    reconstitution: injectable && perDoseMcg
      ? { vialSizes: [5, 10], defaultVialMg: 5, defaultBacWaterMl: 2, perDoseMcg }
      : null,
    cycle: parseCycle(c.cycle),
    weekByWeek: (c.keyBenefits && c.keyBenefits.length)
      ? [{ weeks: "Over the cycle", expect: `${c.keyBenefits.slice(0, 2).join("; ")}. See Q&A for detail.` }]
      : [{ weeks: "Over the cycle", expect: "Effects develop across the cycle — see the Q&A for detail." }],
    bloodwork: deriveBloodwork(c.category),
    supplies: injectable
      ? { needsSyringe: true, syringeType: "U-100 insulin, 29–31g, 0.5in", needsBacWater: routeType === "injectable" }
      : { needsSyringe: false, syringeType: null, needsBacWater: false },
  };
}

function buildRecord(c) {
  const base = deriveRecord(c);
  const authored = AUTHORED[c.id];
  if (authored) {
    return { ...base, ...authored, id: c.id, name: c.name, category: c.category, confidence: "high" };
  }
  return { ...base, name: c.name, category: c.category, confidence: "needs_review", sources: ["derived from compounds-expanded.js dosing/cycle/route"] };
}

// Canonical record map for all compounds, keyed by id.
export const PROTOCOLS = Object.fromEntries(COMPOUNDS.map(c => [c.id, buildRecord(c)]));

export function getProtocol(id) {
  return PROTOCOLS[id] || null;
}

export function getProtocolsForStack(ids = []) {
  return ids.map(getProtocol).filter(Boolean);
}

// ids whose records are derived (not hand-authored) — owner audit queue.
export const REVIEW_QUEUE = Object.values(PROTOCOLS)
  .filter(p => p.confidence === "needs_review")
  .map(p => p.id);

// Human-readable labels for injection sites (used by the diagram + supply list).
export const SITE_LABELS = {
  abdomen: "Abdomen",
  thigh: "Front thigh",
  love_handle: "Love handle / flank",
  delt: "Deltoid",
  glute: "Upper glute",
};
