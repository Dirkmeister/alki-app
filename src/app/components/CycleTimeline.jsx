"use client";

import { useState, useMemo, useRef, useEffect, Fragment } from "react";

/**
 * ============================================================
 * ALKI — CYCLE TIMELINE
 * ============================================================
 *
 * Drop-in screen for AlkiApp.jsx. Renders a week-by-week
 * protocol calendar for the user's selected stack: daily AM/PM
 * dosing, phase visualization (ramp → active → taper → PCT →
 * recovery), bloodwork windows, PCT auto-population by
 * suppression level, and a compound-lane overview.
 *
 * Compound IDs match AlkiApp.jsx COMPOUNDS array:
 *   bpc157, tb500, ipacjc, tesamorelin, semaglutide,
 *   retatrutide, ghkcu, pt141
 *
 * USAGE in AlkiApp:
 *   import CycleTimeline from "./CycleTimeline";
 *
 *   <CycleTimeline
 *     stack={selectedCompounds}        // string[] of compound IDs
 *     initialCycleLength={12}
 *     onBack={() => setScreen("dashboard")}
 *   />
 *
 * `stack` accepts either array of IDs (string[]) or array of
 * { id } objects, for flexible integration.
 *
 * Sources: umbrella_labs_reference.docx §7 (Tolerance &
 * Cycling), §9 (Quick Reference).
 * ============================================================
 */

// ============================================================
// COMPOUND CYCLE PROFILES — keyed to AlkiApp compound IDs
// ============================================================

const CYCLE_PROFILES = {
  bpc157: {
    id: "bpc157",
    name: "BPC-157",
    category: "Recovery",
    dose: { amount: 500, unit: "mcg" },
    route: "SubQ",
    timing: "AM",
    frequency: "daily",
    suppressionLevel: "none",
    rampUpWeeks: 0,
    taperWeeks: 0,
    runsThroughPCT: true,
    runsIndefinitely: false,
    extendsToCycleLength: true,
    standardCycleWeeks: 8,
    note: "Universal support — continues through any PCT phase.",
  },
  tb500: {
    id: "tb500",
    name: "TB-500",
    category: "Recovery",
    dose: { amount: 2.5, unit: "mg" },
    route: "SubQ",
    timing: "AM",
    frequency: "2x-week",
    days: [1, 4], // Mon, Thu
    suppressionLevel: "none",
    rampUpWeeks: 2,
    loadingDose: { amount: 5, unit: "mg" },
    taperWeeks: 0,
    runsThroughPCT: false,
    standardCycleWeeks: 6,
    note: "Loading dose 5mg weeks 1–2, then 2.5mg maintenance.",
  },
  ipacjc: {
    id: "ipacjc",
    name: "Ipamorelin + CJC-1295",
    category: "Growth Hormone",
    dose: { amount: "200/200", unit: "mcg" },
    route: "SubQ",
    timing: "PM",
    frequency: "5-on-2-off",
    days: [1, 2, 3, 4, 5], // Mon–Fri
    suppressionLevel: "none",
    rampUpWeeks: 0,
    taperWeeks: 0,
    runsThroughPCT: false,
    extendsToCycleLength: true,
    standardCycleWeeks: 12,
    note: "Pre-sleep dose. 5 days on / 2 off prevents pituitary desensitization.",
  },
  tesamorelin: {
    id: "tesamorelin",
    name: "Tesamorelin",
    category: "Fat Loss",
    dose: { amount: 1.4, unit: "mg" },
    route: "SubQ",
    timing: "PM",
    frequency: "daily",
    suppressionLevel: "none",
    rampUpWeeks: 0,
    taperWeeks: 0,
    runsThroughPCT: false,
    extendsToCycleLength: true,
    standardCycleWeeks: 12,
    note: "FDA-approved (Egrifta). Visceral fat target. Evaluate at week 12.",
  },
  semaglutide: {
    id: "semaglutide",
    name: "Semaglutide",
    category: "Weight Loss",
    dose: { amount: 2.4, unit: "mg" },
    route: "SubQ",
    timing: "AM",
    frequency: "weekly",
    days: [0],
    suppressionLevel: "none",
    rampUpWeeks: 16,
    titration: [
      { weeks: [1, 2, 3, 4], dose: 0.25 },
      { weeks: [5, 6, 7, 8], dose: 0.5 },
      { weeks: [9, 10, 11, 12], dose: 1.0 },
      { weeks: [13, 14, 15, 16], dose: 1.7 },
      { weeksFrom: 17, dose: 2.4 },
    ],
    taperWeeks: 4,
    runsThroughPCT: false,
    extendsToCycleLength: true,
    standardCycleWeeks: 24,
    note: "Titration is mandatory — minimizes GI side effects.",
  },
  retatrutide: {
    id: "retatrutide",
    name: "Retatrutide",
    category: "Weight Loss",
    dose: { amount: 8, unit: "mg" },
    route: "SubQ",
    timing: "AM",
    frequency: "weekly",
    days: [0],
    suppressionLevel: "none",
    rampUpWeeks: 12,
    titration: [
      { weeks: [1, 2, 3, 4], dose: 1 },
      { weeks: [5, 6, 7, 8], dose: 2 },
      { weeks: [9, 10, 11, 12], dose: 4 },
      { weeksFrom: 13, dose: 8 },
    ],
    taperWeeks: 4,
    runsThroughPCT: false,
    extendsToCycleLength: true,
    standardCycleWeeks: 24,
    note: "Most aggressive GLP class. Start conservative, escalate slowly.",
  },
  ghkcu: {
    id: "ghkcu",
    name: "GHK-Cu",
    category: "Anti-Aging",
    dose: { amount: 2, unit: "mg" },
    route: "Topical / SubQ",
    timing: "AM",
    frequency: "daily",
    suppressionLevel: "none",
    rampUpWeeks: 0,
    taperWeeks: 0,
    runsThroughPCT: false,
    // #73b5170e — 4 weeks ended right as results begin: the app's own compound
    // data notes skin/collagen changes are "gradual (4–8 weeks visible)" and the
    // published GHK-Cu facial-cream trials (Leyden 2002; Finkley 2005) ran
    // 8–12 weeks. 8 weeks reaches the end of that documented visible window
    // (≈ two back-to-back 30-day blocks) so a user actually sees the result.
    standardCycleWeeks: 8,
    note: "Naturally-occurring copper peptide. Run continuously ~8 weeks — visible skin/collagen changes begin ~4 weeks and mature by ~8. No receptor downregulation, so it can run continuously (often as back-to-back 30-day blocks) or topically.",
  },
  pt141: {
    id: "pt141",
    name: "PT-141",
    category: "Performance",
    dose: { amount: 1.75, unit: "mg" },
    route: "SubQ",
    timing: "As needed",
    frequency: "as-needed",
    maxPerWeek: 2,
    suppressionLevel: "none",
    rampUpWeeks: 0,
    taperWeeks: 0,
    runsThroughPCT: false,
    extendsToCycleLength: true,
    standardCycleWeeks: 0,
    note: "Use 45 min before activity. Max 2x/week.",
  },
};

// ============================================================
// PCT PROTOCOLS — keyed by stack-wide suppression level
// ============================================================

const PCT_PROTOCOLS = {
  mild: {
    key: "mild",
    name: "Recovery Break",
    durationWeeks: 2,
    compounds: [],
    note: "No suppressive compounds detected. Standard 2-week wash before evaluating next cycle.",
  },
  moderate: {
    key: "moderate",
    name: "Standard PCT",
    durationWeeks: 4,
    compounds: [
      { name: "Tamoxifen", dose: "20mg", route: "Oral", timing: "AM", weeks: [1, 2, 3, 4] },
    ],
    note: "Standard SARM PCT per Umbrella reference. Bloodwork 4 weeks after final dose.",
  },
  high: {
    key: "high",
    name: "Extended PCT",
    durationWeeks: 6,
    compounds: [
      { name: "Tamoxifen", dose: "20mg", route: "Oral", timing: "AM", weeks: [1, 2, 3, 4, 5, 6] },
      { name: "Enclomiphene", dose: "12.5mg", route: "Oral", timing: "AM", weeks: [1, 2, 3, 4, 5, 6] },
    ],
    note: "Aggressive shutdown protocol. Mid-PCT bloodwork at week 3 recommended.",
  },
};

// ============================================================
// DESIGN TOKENS — matches AlkiApp.jsx aesthetic
// ============================================================

const TOKENS = {
  bg: "#0a0a0a",
  surface: "rgba(255,255,255,0.04)",
  surfaceElevated: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  textPrimary: "#e8e8e8",
  textSecondary: "rgba(255,255,255,0.62)",
  textTertiary: "rgba(255,255,255,0.38)",
  textFaint: "rgba(255,255,255,0.25)",
  accent: "#22d68a",
  accentDim: "rgba(34,214,138,0.15)",
  accentBorder: "rgba(34,214,138,0.25)",
  // Phase colors — semantic
  phase: {
    ramp:     { base: "#5b8def", dim: "rgba(91,141,239,0.16)", label: "Ramp-up" },
    active:   { base: "#22d68a", dim: "rgba(34,214,138,0.16)", label: "Active" },
    taper:    { base: "#f0a848", dim: "rgba(240,168,72,0.16)", label: "Taper" },
    pct:      { base: "#b58bf7", dim: "rgba(181,139,247,0.16)", label: "PCT" },
    recovery: { base: "#6b7280", dim: "rgba(107,114,128,0.18)", label: "Recovery" },
  },
  bloodwork: "#ff6b6b",
};

const FONT_STACK = "'DM Sans', 'Helvetica Neue', sans-serif";
const MONO_STACK = "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

// ============================================================
// HELPERS
// ============================================================

function normalizeStack(stack) {
  // Accept either string[] or { id }[]
  if (!Array.isArray(stack)) return [];
  return stack
    .map(item => (typeof item === "string" ? { id: item } : item))
    .filter(item => item && item.id);
}

function calculateSuppressionLevel(stack) {
  const levels = stack
    .map(c => c.suppressionLevel || CYCLE_PROFILES[c.id]?.suppressionLevel)
    .filter(Boolean);
  if (levels.includes("high") || levels.includes("complete")) return "high";
  if (levels.includes("moderate")) return "moderate";
  if (levels.includes("mild")) return "mild";
  return "none";
}

function getDoseForWeek(profile, weekNumber) {
  if (profile.titration) {
    for (const step of profile.titration) {
      if (step.weeks && step.weeks.includes(weekNumber)) {
        return `${step.dose} ${profile.dose.unit}`;
      }
      if (step.weeksFrom && weekNumber >= step.weeksFrom) {
        return `${step.dose} ${profile.dose.unit}`;
      }
    }
  }
  if (profile.loadingDose && weekNumber <= profile.rampUpWeeks) {
    return `${profile.loadingDose.amount} ${profile.loadingDose.unit}`;
  }
  return `${profile.dose.amount} ${profile.dose.unit}`;
}

function getPhaseForCompoundWeek(profile, weekNumber, compoundEndWeek) {
  if (weekNumber > compoundEndWeek) return null;
  if (profile.rampUpWeeks > 0 && weekNumber <= profile.rampUpWeeks) return "ramp";
  if (profile.taperWeeks > 0 && weekNumber > compoundEndWeek - profile.taperWeeks) return "taper";
  return "active";
}

function buildTimeline(rawStack, cycleLength, compoundCatalog) {
  const stack = normalizeStack(rawStack);

  // Resolve profiles: use CYCLE_PROFILES if available, otherwise generate from catalog
  const resolveProfile = (id) => {
    if (CYCLE_PROFILES[id]) return CYCLE_PROFILES[id];
    if (compoundCatalog) {
      const catalogEntry = compoundCatalog.find(c => c.id === id);
      if (catalogEntry) return generateFallbackProfile(catalogEntry);
    }
    return null;
  };

  const suppressionLevel = calculateSuppressionLevel(stack.map(item => {
    const p = resolveProfile(item.id);
    return p ? { ...item, _profile: p } : item;
  }).filter(i => i._profile).map(i => ({ id: i.id, suppressionLevel: i._profile.suppressionLevel })));
  // No HPTA suppression (pure peptide/recovery stacks) -> no PCT and no recovery
  // phase. Forcing a "mild" PCT here previously added an irrelevant PCT + Recovery
  // block to clean stacks and a contradictory "none / PCT" summary (#28).
  const pct = suppressionLevel === "none" ? null : PCT_PROTOCOLS[suppressionLevel];

  // Per-compound cycle end
  const compoundEnds = {};
  for (const item of stack) {
    const p = resolveProfile(item.id);
    if (!p) continue;
    if (p.extendsToCycleLength || p.standardCycleWeeks === 0) {
      compoundEnds[item.id] = cycleLength;
    } else {
      compoundEnds[item.id] = Math.min(p.standardCycleWeeks, cycleLength);
    }
  }

  // Overall stack-level phases
  const phases = [
    { type: "active", startWeek: 1, endWeek: cycleLength, label: "Active Cycle" },
  ];
  if (pct) {
    phases.push({
      type: "pct",
      startWeek: cycleLength + 1,
      endWeek: cycleLength + pct.durationWeeks,
      label: pct.name,
    });
    phases.push({
      type: "recovery",
      startWeek: cycleLength + pct.durationWeeks + 1,
      endWeek: cycleLength + pct.durationWeeks + 2,
      label: "Recovery",
    });
  }
  const totalWeeks = phases[phases.length - 1].endWeek;

  // Bloodwork markers
  const bloodwork = [];
  if (stack.length > 0) {
    if (cycleLength >= 4) {
      bloodwork.push({
        week: 1,
        label: "Pre-cycle baseline",
        panel: "Total T, Free T, LH, FSH, E2, ALT/AST, Lipids, CBC",
      });
    }
    if (cycleLength >= 6) {
      bloodwork.push({
        week: 6,
        label: "Mid-cycle check",
        panel: "ALT, AST, E2, Blood Pressure",
      });
    }
    bloodwork.push({
      week: cycleLength + (pct?.durationWeeks || 0) + 1,
      label: pct ? "Post-PCT recovery" : "Post-cycle check",
      panel: "Full pre-cycle panel — verify T and LH/FSH recovered",
    });
  }

  // Week-by-week dosing matrix
  const weeks = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const currentPhase = phases.find(p => w >= p.startWeek && w <= p.endWeek);
    const am = [];
    const pm = [];
    const asNeeded = [];

    for (const item of stack) {
      const profile = resolveProfile(item.id);
      if (!profile) continue;
      const endWeek = compoundEnds[item.id];
      let active = false;
      let compoundPhase = "active";

      if (currentPhase?.type === "active" && w <= endWeek) {
        active = true;
        compoundPhase = getPhaseForCompoundWeek(profile, w, endWeek) || "active";
      } else if (currentPhase?.type === "pct" && profile.runsThroughPCT) {
        active = true;
        compoundPhase = "active";
      } else if (currentPhase?.type === "recovery" && profile.runsIndefinitely) {
        active = true;
        compoundPhase = "active";
      }

      if (!active) continue;

      const entry = {
        id: profile.id,
        name: profile.name,
        dose: getDoseForWeek(profile, w),
        route: profile.route,
        frequency: profile.frequency,
        days: profile.days,
        compoundPhase,
        maxPerWeek: profile.maxPerWeek,
      };
      if (profile.timing === "AM") am.push(entry);
      else if (profile.timing === "PM") pm.push(entry);
      else asNeeded.push(entry);
    }

    // PCT compounds injection
    if (currentPhase?.type === "pct" && pct && pct.compounds.length > 0) {
      const pctWeekIndex = w - cycleLength;
      for (const pc of pct.compounds) {
        if (pc.weeks.includes(pctWeekIndex)) {
          const entry = {
            id: `pct-${pc.name}`,
            name: pc.name,
            dose: pc.dose,
            route: pc.route,
            frequency: "daily",
            compoundPhase: "pct",
            isPCT: true,
          };
          if (pc.timing === "AM") am.push(entry);
          else pm.push(entry);
        }
      }
    }

    weeks.push({
      weekNumber: w,
      phase: currentPhase,
      am,
      pm,
      asNeeded,
      bloodwork: bloodwork.filter(b => b.week === w),
    });
  }

  // Compound lanes (overview viz)
  const lanes = stack.map(item => {
    const profile = resolveProfile(item.id);
    if (!profile) return null;
    const endWeek = compoundEnds[item.id];
    const segments = [];
    const rampEnd = Math.min(profile.rampUpWeeks, endWeek);
    if (rampEnd > 0) {
      segments.push({ from: 1, to: rampEnd, phase: "ramp" });
    }
    const activeStart = rampEnd + 1;
    const activeEnd = endWeek - profile.taperWeeks;
    if (activeEnd >= activeStart) {
      segments.push({ from: activeStart, to: activeEnd, phase: "active" });
    }
    if (profile.taperWeeks > 0) {
      const taperStart = Math.max(activeEnd + 1, rampEnd + 1);
      if (taperStart <= endWeek) {
        segments.push({ from: taperStart, to: endWeek, phase: "taper" });
      }
    }
    if (segments.length === 0 && endWeek > 0) {
      segments.push({ from: 1, to: endWeek, phase: "active" });
    }
    if (profile.runsThroughPCT && pct) {
      segments.push({
        from: cycleLength + 1,
        to: cycleLength + pct.durationWeeks,
        phase: "active",
      });
    }
    return { id: profile.id, name: profile.name, category: profile.category, segments };
  }).filter(Boolean);

  return { totalWeeks, phases, weeks, bloodwork, pct, suppressionLevel, lanes };
}

// #71 — calculate a protocol's natural cycle length from its compounds: the
// longest standard cycle among them (compounds with no finite cycle — as-needed
// or indefinite — don't drive it). PCT is auto-appended downstream. Used to seed
// the (editable) length on build-my-own and to fix it on a locked protocol.
function suggestedCycleLength(rawStack, compoundCatalog, { min = 4, max = 24, fallback = 12 } = {}) {
  const stack = normalizeStack(rawStack);
  let longest = 0;
  for (const item of stack) {
    let p = CYCLE_PROFILES[item.id];
    if (!p && compoundCatalog) {
      const c = compoundCatalog.find((x) => x.id === item.id);
      if (c) p = generateFallbackProfile(c);
    }
    if (!p || !p.standardCycleWeeks) continue; // 0 / undefined → as-needed/indefinite
    if (p.standardCycleWeeks > longest) longest = p.standardCycleWeeks;
  }
  const base = longest > 0 ? longest : fallback;
  return Math.max(min, Math.min(max, base));
}

// ============================================================
// ICONS
// ============================================================

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TOKENS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TOKENS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TOKENS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function PhaseBar({ phases, totalWeeks }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{
        display: "flex",
        width: "100%",
        height: 36,
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${TOKENS.border}`,
      }}>
        {phases.map((p, i) => {
          const width = ((p.endWeek - p.startWeek + 1) / totalWeeks) * 100;
          const color = TOKENS.phase[p.type] || TOKENS.phase.active;
          return (
            <div key={i} style={{
              width: `${width}%`,
              background: color.dim,
              borderLeft: i > 0 ? `1px solid ${TOKENS.border}` : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: 2,
                background: color.base,
              }} />
              <span style={{
                fontFamily: FONT_STACK,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: color.base,
                whiteSpace: "nowrap",
                padding: "0 6px",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
                boxSizing: "border-box",
              }}>
                {width > 12 ? p.label : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{
        display: "flex",
        marginTop: 6,
        fontFamily: MONO_STACK,
        fontSize: 10,
        color: TOKENS.textTertiary,
      }}>
        {phases.map((p, i) => {
          const width = ((p.endWeek - p.startWeek + 1) / totalWeeks) * 100;
          return (
            <div key={i} style={{ width: `${width}%`, textAlign: "left", paddingLeft: 2 }}>
              W{p.startWeek}{p.startWeek !== p.endWeek ? `–${p.endWeek}` : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekStrip({ weeks, selectedWeek, onSelect }) {
  const stripRef = useRef(null);

  useEffect(() => {
    if (!stripRef.current) return;
    const el = stripRef.current.querySelector(`[data-week="${selectedWeek}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedWeek]);

  return (
    <div
      ref={stripRef}
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "4px 2px 14px 2px",
        scrollbarWidth: "thin",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {weeks.map(week => {
        const isSelected = week.weekNumber === selectedWeek;
        const phaseColor = TOKENS.phase[week.phase?.type] || TOKENS.phase.active;
        const hasBloodwork = week.bloodwork.length > 0;
        const compoundCount = week.am.length + week.pm.length + week.asNeeded.length;

        return (
          <button
            key={week.weekNumber}
            data-week={week.weekNumber}
            onClick={() => onSelect(week.weekNumber)}
            style={{
              flex: "0 0 auto",
              width: 52,
              padding: "10px 0",
              background: isSelected ? phaseColor.dim : TOKENS.surface,
              border: `1px solid ${isSelected ? phaseColor.base : TOKENS.border}`,
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              position: "relative",
              transition: "all 0.15s ease",
              fontFamily: FONT_STACK,
            }}
          >
            <span style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: phaseColor.base,
            }}>
              WK
            </span>
            <span style={{
              fontSize: 17,
              fontWeight: 600,
              fontFamily: MONO_STACK,
              color: isSelected ? TOKENS.textPrimary : TOKENS.textSecondary,
              lineHeight: 1,
            }}>
              {week.weekNumber}
            </span>
            <span style={{
              fontSize: 9,
              fontFamily: MONO_STACK,
              color: TOKENS.textTertiary,
            }}>
              {compoundCount > 0 ? `${compoundCount}` : "—"}
            </span>
            {hasBloodwork && (
              <span style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: TOKENS.bloodwork,
                boxShadow: `0 0 6px ${TOKENS.bloodwork}`,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayChips({ days }) {
  if (!days) return null;
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
      {labels.map((l, i) => {
        const active = days.includes(i);
        return (
          <span key={i} style={{
            width: 18, height: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontFamily: MONO_STACK,
            fontWeight: 600,
            borderRadius: 4,
            background: active ? TOKENS.accentDim : "transparent",
            color: active ? TOKENS.accent : TOKENS.textTertiary,
            border: `1px solid ${active ? "transparent" : TOKENS.border}`,
          }}>
            {l}
          </span>
        );
      })}
    </div>
  );
}

function CompoundEntry({ entry }) {
  const phaseColor = TOKENS.phase[entry.compoundPhase] || TOKENS.phase.active;
  const freqLabel = {
    "daily": "Every day",
    "2x-week": "2× per week",
    "5-on-2-off": "Weekdays only",
    "weekly": "Once weekly",
    "as-needed": "As needed",
  }[entry.frequency] || entry.frequency;

  return (
    <div style={{
      background: TOKENS.surfaceElevated,
      border: `1px solid ${TOKENS.border}`,
      borderLeft: `2px solid ${phaseColor.base}`,
      borderRadius: 8,
      padding: "12px 14px",
      fontFamily: FONT_STACK,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 8,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: TOKENS.textPrimary,
          letterSpacing: "-0.01em",
        }}>
          {entry.name}
        </span>
        {entry.isPCT && (
          <span style={{
            fontSize: 9,
            fontFamily: MONO_STACK,
            fontWeight: 600,
            color: TOKENS.phase.pct.base,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            PCT
          </span>
        )}
      </div>
      <div style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        marginTop: 4,
        flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 13,
          fontFamily: MONO_STACK,
          fontWeight: 500,
          color: TOKENS.accent,
        }}>
          {entry.dose}
        </span>
        <span style={{ fontSize: 11, color: TOKENS.textTertiary }}>·</span>
        <span style={{
          fontSize: 11,
          color: TOKENS.textSecondary,
          fontWeight: 500,
        }}>
          {entry.route}
        </span>
        <span style={{ fontSize: 11, color: TOKENS.textTertiary }}>·</span>
        <span style={{
          fontSize: 11,
          color: TOKENS.textSecondary,
        }}>
          {freqLabel}{entry.maxPerWeek ? ` (max ${entry.maxPerWeek})` : ""}
        </span>
      </div>
      {(entry.frequency === "2x-week" || entry.frequency === "5-on-2-off" || entry.frequency === "weekly") && entry.days && (
        <DayChips days={entry.days} />
      )}
    </div>
  );
}

function WeekDetail({ week }) {
  if (!week) return null;
  const phaseColor = TOKENS.phase[week.phase?.type] || TOKENS.phase.active;
  const isEmpty = week.am.length === 0 && week.pm.length === 0 && week.asNeeded.length === 0;

  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.border}`,
      borderRadius: 14,
      padding: 18,
      fontFamily: FONT_STACK,
    }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 4,
        flexWrap: "wrap",
        gap: 6,
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: MONO_STACK,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: TOKENS.textTertiary,
        }}>
          Week {week.weekNumber}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: phaseColor.base,
          fontFamily: FONT_STACK,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}>
          {week.phase?.label || "—"}
        </span>
      </div>

      {week.bloodwork.length > 0 && (
        <div style={{
          marginTop: 14,
          padding: "12px 14px",
          background: "rgba(255,107,107,0.06)",
          border: `1px solid rgba(255,107,107,0.20)`,
          borderRadius: 10,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}>
            <span style={{
              width: 8, height: 8,
              borderRadius: "50%",
              background: TOKENS.bloodwork,
              boxShadow: `0 0 8px ${TOKENS.bloodwork}`,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: TOKENS.bloodwork,
            }}>
              Bloodwork window
            </span>
          </div>
          {week.bloodwork.map((b, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: TOKENS.textPrimary,
              }}>
                {b.label}
              </div>
              <div style={{
                fontSize: 11,
                color: TOKENS.textSecondary,
                marginTop: 2,
              }}>
                {b.panel}
              </div>
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div style={{
          padding: "24px 12px",
          textAlign: "center",
          color: TOKENS.textTertiary,
          fontSize: 13,
        }}>
          No active dosing this week.
        </div>
      )}

      {week.am.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}>
            <SunIcon />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: TOKENS.textSecondary,
            }}>
              Morning
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {week.am.map((e, i) => <CompoundEntry key={i} entry={e} />)}
          </div>
        </div>
      )}

      {week.pm.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}>
            <MoonIcon />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: TOKENS.textSecondary,
            }}>
              Evening
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {week.pm.map((e, i) => <CompoundEntry key={i} entry={e} />)}
          </div>
        </div>
      )}

      {week.asNeeded.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}>
            <BoltIcon />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: TOKENS.textSecondary,
            }}>
              As needed
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {week.asNeeded.map((e, i) => <CompoundEntry key={i} entry={e} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// #41/#42 — classify each compound's role so support compounds read as support
// (not mysterious core picks) in the cycle view.
const ROLE_ORDER = ["Core protocol", "Recovery support", "On-cycle support"];
function laneRole(category) {
  if (category === "Cycle Support" || category === "Hair Support") return "On-cycle support";
  if (category === "Recovery") return "Recovery support";
  return "Core protocol";
}

function CompoundLanes({ lanes, totalWeeks, cycleLength }) {
  if (lanes.length === 0) return null;
  // Group by role; show role sub-headers only when the stack spans >1 role.
  const ordered = [...lanes].sort(
    (a, b) => ROLE_ORDER.indexOf(laneRole(a.category)) - ROLE_ORDER.indexOf(laneRole(b.category))
  );
  const multiRole = new Set(lanes.map((l) => laneRole(l.category))).size > 1;
  return (
    <div style={{
      background: TOKENS.surface,
      border: `1px solid ${TOKENS.border}`,
      borderRadius: 14,
      padding: 18,
      fontFamily: FONT_STACK,
    }}>
      <div style={{
        fontSize: 11,
        fontFamily: MONO_STACK,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: TOKENS.textTertiary,
        marginBottom: 14,
      }}>
        Stack Timeline
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ordered.map((lane, idx) => {
          const role = laneRole(lane.category);
          const showHeader = multiRole && (idx === 0 || laneRole(ordered[idx - 1].category) !== role);
          return (
            <Fragment key={lane.id}>
              {showHeader && (
                <div style={{ fontSize: 10, fontFamily: MONO_STACK, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TOKENS.textSecondary, marginTop: idx === 0 ? 2 : 8, marginBottom: 2 }}>
                  {role}
                </div>
              )}
              <div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: TOKENS.textPrimary,
              }}>
                {lane.name}
              </span>
              <span style={{
                fontSize: 10,
                fontFamily: MONO_STACK,
                color: TOKENS.textTertiary,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
                {lane.category}
              </span>
            </div>
            <div style={{
              position: "relative",
              height: 8,
              background: TOKENS.bg,
              borderRadius: 4,
              border: `1px solid ${TOKENS.border}`,
              overflow: "hidden",
            }}>
              {lane.segments.map((seg, i) => {
                const left = ((seg.from - 1) / totalWeeks) * 100;
                const width = ((seg.to - seg.from + 1) / totalWeeks) * 100;
                const color = TOKENS.phase[seg.phase] || TOKENS.phase.active;
                return (
                  <div key={i} style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 0,
                    bottom: 0,
                    background: color.base,
                    opacity: 0.85,
                  }} />
                );
              })}
              {/* Cycle-end marker */}
              <div style={{
                position: "absolute",
                left: `${(cycleLength / totalWeeks) * 100}%`,
                top: -2, bottom: -2,
                width: 1,
                background: "rgba(255,255,255,0.30)",
              }} />
            </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function StepBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36, height: 36,
        background: TOKENS.surfaceElevated,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 10,
        color: disabled ? TOKENS.textTertiary : TOKENS.textPrimary,
        fontSize: 18,
        fontWeight: 500,
        fontFamily: FONT_STACK,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s ease",
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

function Header({ onBack }) {
  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: TOKENS.surface,
            border: `1px solid ${TOKENS.borderStrong}`,
            color: TOKENS.textPrimary,
            fontSize: 14,
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: FONT_STACK,
            marginBottom: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back
        </button>
      )}
      <div style={{
        fontSize: 10,
        fontFamily: MONO_STACK,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: TOKENS.accent,
        marginBottom: 4,
      }}>
        Protocol Timeline
      </div>
      <h1 style={{
        margin: 0,
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: TOKENS.textPrimary,
        fontFamily: FONT_STACK,
        lineHeight: 1.15,
      }}>
        Your full protocol, week by week.
      </h1>
    </div>
  );
}

function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 10,
      fontFamily: MONO_STACK,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: TOKENS.textTertiary,
      marginBottom: 10,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CycleTimeline({
  stack = [],
  compoundCatalog = [],
  initialCycleLength = 12,
  minCycleLength = 4,
  maxCycleLength = 24,
  locked = false,          // #71 — locked protocol: cycle length is fixed, not editable
  onBack,
}) {
  // #71 — the cycle length is calculated from the compounds. On a locked protocol
  // it's read-only; while building your own you can override the suggestion.
  const suggested = useMemo(
    () => suggestedCycleLength(stack, compoundCatalog, { min: minCycleLength, max: maxCycleLength, fallback: initialCycleLength }),
    [stack, compoundCatalog, minCycleLength, maxCycleLength, initialCycleLength]
  );
  const [override, setOverride] = useState(null); // null = follow the suggestion
  const cycleLength = locked ? suggested : (override ?? suggested);
  const setCycleLength = (n) => setOverride(Math.max(minCycleLength, Math.min(maxCycleLength, n)));
  const [selectedWeek, setSelectedWeek] = useState(1);

  const timeline = useMemo(
    () => buildTimeline(stack, cycleLength, compoundCatalog),
    [stack, cycleLength, compoundCatalog]
  );

  // Clamp selectedWeek if cycleLength shrinks
  useEffect(() => {
    if (selectedWeek > timeline.totalWeeks) {
      setSelectedWeek(timeline.totalWeeks);
    }
  }, [timeline.totalWeeks, selectedWeek]);

  const selectedWeekData = timeline.weeks[selectedWeek - 1];

  // #29 — surface only the phases/markers actually present in THIS protocol.
  const usedPhaseKeys = new Set(timeline.phases.map(p => p.type));
  (timeline.lanes || []).forEach(l => (l.segments || []).forEach(seg => usedPhaseKeys.add(seg.phase)));
  const hasBloodwork = (timeline.bloodwork || []).length > 0;

  const containerStyle = {
    maxWidth: 480,
    margin: "0 auto",
    padding: "20px 20px 48px 20px",
    minHeight: "100vh",
    boxSizing: "border-box",
    color: TOKENS.textPrimary,
    fontFamily: FONT_STACK,
  };

  const normalizedStack = normalizeStack(stack);

  if (normalizedStack.length === 0) {
    return (
      <div style={containerStyle}>
        <Header onBack={onBack} />
        <div style={{
          marginTop: 60,
          padding: 40,
          textAlign: "center",
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 16,
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: TOKENS.textPrimary,
            marginBottom: 8,
          }}>
            No stack selected
          </div>
          <div style={{
            fontSize: 13,
            color: TOKENS.textSecondary,
            lineHeight: 1.5,
          }}>
            Build a stack first to see your week-by-week cycle protocol.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <Header onBack={onBack} />

      {/* Cycle length — #71. Locked protocol: read-only, calculated from compounds.
          Build-my-own: editable stepper seeded with the suggestion. */}
      <div style={{
        marginTop: 20,
        marginBottom: 24,
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontFamily: MONO_STACK,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TOKENS.textTertiary,
            marginBottom: 2,
          }}>
            Cycle length{locked ? " · locked" : ""}
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: TOKENS.textPrimary,
            fontFamily: MONO_STACK,
          }}>
            {cycleLength} weeks
          </div>
          <div style={{ fontSize: 11, color: TOKENS.textTertiary, marginTop: 3, lineHeight: 1.4 }}>
            {locked
              ? "Set by your locked protocol — calculated from its compounds + PCT."
              : (override != null && override !== suggested
                  ? <>Suggested from your compounds: {suggested} wk. <button onClick={() => setOverride(null)} style={{ background: "none", border: "none", color: TOKENS.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT_STACK, padding: 0 }}>↺ reset</button></>
                  : `Suggested from your compounds. Adjust to explore.`)}
          </div>
        </div>
        {!locked && (
          <div style={{ display: "flex", gap: 6 }}>
            <StepBtn
              onClick={() => setCycleLength(Math.max(minCycleLength, cycleLength - 1))}
              disabled={cycleLength <= minCycleLength}
            >−</StepBtn>
            <StepBtn
              onClick={() => setCycleLength(Math.min(maxCycleLength, cycleLength + 1))}
              disabled={cycleLength >= maxCycleLength}
            >+</StepBtn>
          </div>
        )}
      </div>

      <SectionLabel>Protocol phases</SectionLabel>
      <PhaseBar phases={timeline.phases} totalWeeks={timeline.totalWeeks} />

      {/* Legend — directly under the bar, only phases present in this protocol (#29) */}
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "8px 14px", alignItems: "center" }}>
        {Object.entries(TOKENS.phase)
          .filter(([key]) => usedPhaseKeys.has(key))
          .map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TOKENS.textSecondary }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: val.base }} />
              {val.label}
            </div>
          ))}
        {hasBloodwork && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TOKENS.textSecondary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: TOKENS.bloodwork, boxShadow: `0 0 6px ${TOKENS.bloodwork}` }} />
            Bloodwork
          </div>
        )}
      </div>

      {/* Suppression / PCT summary — only when the stack actually suppresses (#28) */}
      {timeline.suppressionLevel !== "none" && (
      <div style={{
        marginTop: 16,
        padding: "10px 14px",
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontFamily: MONO_STACK,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: TOKENS.textTertiary,
          }}>
            Stack suppression
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: TOKENS.textPrimary,
            marginTop: 2,
            textTransform: "capitalize",
          }}>
            {timeline.suppressionLevel}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontSize: 10,
            fontFamily: MONO_STACK,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: TOKENS.textTertiary,
          }}>
            PCT
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: TOKENS.phase.pct.base,
            marginTop: 2,
          }}>
            {timeline.pct?.name || "None"}
          </div>
        </div>
      </div>
      )}

      <SectionLabel style={{ marginTop: 28 }}>Week-by-week</SectionLabel>
      <WeekStrip
        weeks={timeline.weeks}
        selectedWeek={selectedWeek}
        onSelect={setSelectedWeek}
      />

      <WeekDetail week={selectedWeekData} />

      <div style={{ marginTop: 24 }}>
        <CompoundLanes
          lanes={timeline.lanes}
          totalWeeks={timeline.totalWeeks}
          cycleLength={cycleLength}
        />
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: 24,
        padding: "12px 14px",
        fontSize: 11,
        lineHeight: 1.5,
        color: TOKENS.textFaint,
        fontFamily: FONT_STACK,
        textAlign: "center",
      }}>
        All information is for research and educational purposes only. Nothing on this platform constitutes medical advice. Consult a licensed healthcare provider before initiating any peptide protocol.
      </div>
    </div>
  );
}

// ============================================================
// NAMED EXPORTS — useful for parent components
// ============================================================

export { CYCLE_PROFILES, PCT_PROTOCOLS, buildTimeline, calculateSuppressionLevel };

// ============================================================
// FALLBACK PROFILE GENERATOR
// ============================================================
// Generates a usable cycle profile from the compound catalog
// entry when CYCLE_PROFILES doesn't have a manual entry.

function generateFallbackProfile(compound) {
  if (!compound) return null;
  const c = compound;

  // Parse cycle length from the cycle string (e.g. "4–6 weeks on, 2 weeks off" → 6)
  let standardWeeks = 12;
  if (c.cycle) {
    const m = c.cycle.match(/(\d+)\s*(?:–|-|to)\s*(\d+)\s*week/i) || c.cycle.match(/(\d+)\s*week/i);
    if (m) standardWeeks = parseInt(m[2] || m[1]) || 12;
    if (/ongoing|indefinite|as needed|sustainable|long.?term/i.test(c.cycle)) standardWeeks = 0;
  }

  // Detect frequency from dosing string
  let frequency = "daily";
  let days = undefined;
  let timing = "AM";
  if (c.dosing) {
    if (/weekly|once.?week/i.test(c.dosing)) { frequency = "weekly"; days = [0]; }
    else if (/2x.?week|twice.?week/i.test(c.dosing)) { frequency = "2x-week"; days = [1, 4]; }
    else if (/as.?needed|prn/i.test(c.dosing)) { frequency = "as-needed"; }
    else if (/5.?on|weekday/i.test(c.dosing)) { frequency = "5-on-2-off"; days = [1, 2, 3, 4, 5]; }
  }

  // Timing heuristic
  if (c.category === "Growth Hormone" || /sleep|bed|pm|evening/i.test(c.dosing || "")) timing = "PM";
  if (/as.?needed/i.test(c.dosing || "")) timing = "As needed";

  // Parse dose
  let doseStr = c.dosing || "per protocol";
  const doseMatch = doseStr.match(/([\d.,\/]+\s*(?:mcg|mg|iu|ml))/i);
  const doseAmount = doseMatch ? doseMatch[1] : doseStr.split(",")[0].trim();

  // Suppression heuristic
  let suppressionLevel = "none";
  if (c.category === "SARM") suppressionLevel = "moderate";
  if (c.category === "Hormonal") suppressionLevel = "high";

  return {
    id: c.id,
    name: c.name,
    category: c.category || "Other",
    dose: { amount: doseAmount, unit: "" },
    route: c.route || "SubQ",
    timing,
    frequency,
    days,
    suppressionLevel,
    rampUpWeeks: 0,
    taperWeeks: 0,
    runsThroughPCT: false,
    extendsToCycleLength: standardWeeks === 0,
    standardCycleWeeks: standardWeeks,
    note: c.tagline || "",
    _generated: true,
  };
}
