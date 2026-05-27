/**
 * ALKI — PROTOCOL GUIDE LOGIC (Plan C)
 * ────────────────────────────────────────────────────────────
 * Pure helpers that assemble a personalized implementation guide
 * from a locked stack. No React imports (portability firewall).
 * Reads the canonical data in data/protocolProtocols.js.
 * ────────────────────────────────────────────────────────────
 */

import { getProtocolsForStack } from "../data/protocolProtocols";

// ── Reconstitution math (matches AlkiProtocolQA FAQ) ─────────────
//   concentration (mcg/mL) = vial(mg) * 1000 / bacWater(mL)
//   volume (mL)            = dose(mcg) / concentration
//   units (U-100 syringe)  = volume(mL) * 100
export function reconstitute({ vialMg, bacWaterMl, doseMcg }) {
  const v = parseFloat(vialMg), w = parseFloat(bacWaterMl), d = parseFloat(doseMcg);
  if (!(v > 0) || !(w > 0) || !(d > 0)) {
    return { concentrationMcgPerMl: 0, volumeMl: 0, units: 0, dosesPerVial: 0, valid: false };
  }
  const concentrationMcgPerMl = (v * 1000) / w;
  const volumeMl = d / concentrationMcgPerMl;
  const units = volumeMl * 100;
  const dosesPerVial = Math.floor((v * 1000) / d);
  return {
    concentrationMcgPerMl: Math.round(concentrationMcgPerMl),
    volumeMl: Math.round(volumeMl * 1000) / 1000,
    units: Math.round(units * 10) / 10,
    dosesPerVial,
    valid: true,
  };
}

// ── Supply list — what to actually buy for this stack ────────────
export function buildSupplyList(stackIds) {
  const protocols = getProtocolsForStack(stackIds);
  const injectables = [];
  const topicals = [];
  const orals = [];
  let bacWaterTotalMl = 0;
  let syringeType = "U-100 insulin, 29–31g, 0.5in";

  for (const p of protocols) {
    if (p.routeType === "injectable") {
      const vialMg = p.reconstitution?.defaultVialMg ?? null;
      const bac = p.reconstitution?.defaultBacWaterMl ?? 0;
      bacWaterTotalMl += bac;
      if (p.supplies?.syringeType) syringeType = p.supplies.syringeType;
      injectables.push({ id: p.id, name: p.name, vialMg, bacWaterMl: bac });
    } else if (p.routeType === "topical") {
      topicals.push({ id: p.id, name: p.name });
    } else {
      // oral / nasal / sublingual
      orals.push({ id: p.id, name: p.name, routeType: p.routeType });
    }
  }

  const hasInjectable = injectables.length > 0;
  const items = [];
  for (const inj of injectables) {
    items.push({
      label: inj.name,
      detail: inj.vialMg ? `Vial${"s"} — ${inj.vialMg}mg each` : "Vial(s)",
    });
  }
  if (hasInjectable) {
    items.push({ label: "Bacteriostatic water", detail: `~${bacWaterTotalMl}mL total (0.9% benzyl alcohol)` });
    items.push({ label: "Insulin syringes", detail: `${syringeType} — 1 box (100ct)` });
    items.push({ label: "Alcohol swabs", detail: "Sterile prep pads — 1 box" });
    items.push({ label: "Sharps container", detail: "For safe needle disposal" });
  }
  for (const t of topicals) {
    items.push({ label: t.name, detail: "Topical — applied directly, no syringe needed" });
  }
  for (const o of orals) {
    items.push({ label: o.name, detail: `${o.routeType === "nasal" ? "Intranasal spray" : "Oral"} — no injection supplies` });
  }

  return { items, hasInjectable, injectables, topicals, orals, bacWaterTotalMl, syringeType };
}

// ── Injection-site rotation — union across injectables ───────────
export function siteRotation(stackIds) {
  const protocols = getProtocolsForStack(stackIds);
  const set = new Set();
  let anyInjectable = false;
  for (const p of protocols) {
    if (p.routeType === "injectable") {
      anyInjectable = true;
      (p.injectionSites || []).forEach(s => set.add(s));
    }
  }
  return { sites: Array.from(set), anyInjectable };
}

// ── Weekly schedule — group the stack by when you dose ───────────
export const FREQUENCY_LABELS = {
  "daily": "Every day",
  "2x-week": "2–3× per week",
  "5-on-2-off": "Weekdays (5 on / 2 off)",
  "weekly": "Once weekly",
  "as-needed": "As needed",
};

export function buildSchedule(stackIds) {
  const protocols = getProtocolsForStack(stackIds);
  const am = [], pm = [], asNeeded = [], weekly = [];
  for (const p of protocols) {
    const entry = {
      id: p.id,
      name: p.name,
      dose: p.dose?.amount != null ? `${p.dose.amount}${p.dose.unit ? " " + p.dose.unit : ""}` : "per protocol",
      frequency: p.frequency,
      frequencyLabel: FREQUENCY_LABELS[p.frequency] || p.frequency,
      days: p.days,
      cycle: p.cycle,
      titration: p.titration || null,
      routeType: p.routeType,
    };
    if (p.frequency === "as-needed") asNeeded.push(entry);
    else if (p.frequency === "weekly") weekly.push(entry);
    else if (p.timing === "PM") pm.push(entry);
    else am.push(entry);
  }
  return { am, pm, weekly, asNeeded };
}

// ── What-to-expect — merge per-compound weekByWeek by week band ──
export function mergeTimeline(stackIds) {
  const protocols = getProtocolsForStack(stackIds);
  const byBand = new Map();
  for (const p of protocols) {
    for (const band of (p.weekByWeek || [])) {
      const key = band.weeks || "Over the cycle";
      if (!byBand.has(key)) byBand.set(key, []);
      byBand.get(key).push({ name: p.name, expect: band.expect });
    }
  }
  // Stable, readable ordering: numeric-leading bands first, then the rest.
  const bands = Array.from(byBand.entries()).map(([weeks, items]) => ({ weeks, items }));
  bands.sort((a, b) => {
    const na = parseInt(a.weeks), nb = parseInt(b.weeks);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return 0;
  });
  return bands;
}
