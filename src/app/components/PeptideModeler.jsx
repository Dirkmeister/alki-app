"use client";

import { useState, useMemo, useEffect } from "react";
import { buildProfile, simulate, estimateMonthlyCost } from "../lib/peptideEngine";
// Canonical BF% display helpers — shared with the dashboard so the headline
// body-fat numbers are cohesive app-wide (#47dc1758 / #86132d26). The
// week-by-week charts below stay on peptideEngine (deferred engine reconciliation).
import { projectBodyFat, projectWeight, bfCategory } from "../lib/bodyComposition";
// Read-only cycle length, calculated from the stack's compounds — the same source
// the Cycle Timeline uses. The protocol duration is a projection, not user-editable.
import { suggestedCycleLength } from "./CycleTimeline";

/**
 * ============================================================
 * ALKI — PEPTIDE MODELER
 * ============================================================
 *
 * Interactive body composition projection screen.
 * Runs the peptideEngine simulation against the user's profile
 * and selected compounds. Shows week-by-week charts, summary
 * stats, and protocol-vs-baseline comparison.
 *
 * USAGE in AlkiApp.jsx:
 *   import PeptideModeler from "./PeptideModeler";
 *
 *   <PeptideModeler
 *     profile={profile}
 *     selectedCompounds={selectedCompounds}
 *     compoundCatalog={COMPOUNDS}
 *   />
 * ============================================================
 */

// ── Design tokens (matches AlkiApp) ─────────────────────────
const C = {
  bg: "#0a0a0a",
  surface: "rgba(255,255,255,0.04)",
  surfaceAlt: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",
  text: "#e8e8e8",
  textDim: "rgba(255,255,255,0.55)",
  textFaint: "rgba(255,255,255,0.35)",
  accent: "#22d68a",
  accentDim: "rgba(34,214,138,0.15)",
  accentBorder: "rgba(34,214,138,0.25)",
  blue: "#6366f1",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
};

const FONT = "'DM Sans', 'Helvetica Neue', sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace";

// ── Style helpers ───────────────────────────────────────────
const card = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 18,
  marginBottom: 12,
  fontFamily: FONT,
};

const label = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.textFaint,
  marginBottom: 6,
  display: "block",
};

const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  background: C.surfaceAlt,
  border: `1px solid ${C.borderStrong}`,
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
  boxSizing: "border-box",
  appearance: "none",
};

const inputStyle = {
  ...selectStyle,
};

// ── Inline SVG Line Chart ──────────────────────────────────
function MiniChart({ data, dataKey, baselineKey, color, height = 140, label: chartLabel, yUnit = "" }) {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d[dataKey]);
  const baseValues = baselineKey ? data.map(d => d[baselineKey]) : [];
  const allValues = [...values, ...baseValues].filter(v => v != null);
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;

  const W = 360;
  const H = height;
  const padT = 20, padB = 24, padL = 44, padR = 12;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (i) => padL + (i / (data.length - 1)) * plotW;
  const toY = (v) => padT + (1 - (v - minV) / range) * plotH;

  const mainPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[dataKey]).toFixed(1)}`).join(" ");
  const basePath = baselineKey
    ? data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[baselineKey]).toFixed(1)}`).join(" ")
    : null;

  // Area fill under main line
  const areaPath = mainPath + ` L${toX(data.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${padL},${(padT + plotH).toFixed(1)} Z`;

  // Y-axis ticks (4 ticks)
  const yTicks = Array.from({ length: 4 }, (_, i) => minV + (range * i) / 3);

  return (
    <div style={{ ...card, padding: "14px 10px" }}>
      {chartLabel && (
        <div style={{ ...label, marginBottom: 10, paddingLeft: 4 }}>{chartLabel}</div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <text x={padL - 6} y={toY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily={MONO}>{v.toFixed(1)}{yUnit}</text>
          </g>
        ))}
        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 || i === data.length - 1).map((d, i) => (
          <text key={i} x={toX(data.indexOf(d))} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily={MONO}>W{d.week}</text>
        ))}
        {/* Baseline path */}
        {basePath && <path d={basePath} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="4 3" />}
        {/* Area fill */}
        <path d={areaPath} fill={color} opacity="0.08" />
        {/* Main line */}
        <path d={mainPath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Start/end dots */}
        <circle cx={toX(0)} cy={toY(values[0])} r="3" fill={color} />
        <circle cx={toX(data.length - 1)} cy={toY(values[values.length - 1])} r="3.5" fill={color} stroke="#0a0a0a" strokeWidth="1.5" />
        {/* End value label */}
        <text x={toX(data.length - 1) + 2} y={toY(values[values.length - 1]) - 8} fill={color} fontSize="11" fontFamily={MONO} fontWeight="700">
          {values[values.length - 1].toFixed(1)}{yUnit}
        </text>
      </svg>
      {baselineKey && (
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6, fontSize: 10, color: C.textFaint }}>
          <span><span style={{ display: "inline-block", width: 12, height: 2, background: color, borderRadius: 1, verticalAlign: "middle", marginRight: 4 }} />Protocol</span>
          <span><span style={{ display: "inline-block", width: 12, height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 1, verticalAlign: "middle", marginRight: 4, borderTop: "1px dashed rgba(255,255,255,0.3)" }} />Baseline</span>
        </div>
      )}
    </div>
  );
}

// ── Stat Tile ──────────────────────────────────────────────
function Stat({ value, label: statLabel, sub, color }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "#fff", lineHeight: 1.1, fontFamily: MONO, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ ...label, marginTop: 4, marginBottom: 0 }}>{statLabel}</div>
      {sub && <div style={{ fontSize: 10, color: C.textFaint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Meter ──────────────────────────────────────────────────
function Meter({ value, max = 100, color = C.accent }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PeptideModeler({ profile, selectedCompounds, compoundCatalog, initialInputs = {}, onPersist }) {
  // ── Extended model inputs (beyond what onboarding captures) ──
  // #33 — seeded from the persisted profile inputs so they survive across sessions
  // (Option B); changes are written back via onPersist below.
  const [activityLevel, setActivityLevel]           = useState(initialInputs.activityLevel || "moderate");
  const [trainingExperience, setTrainingExperience] = useState(initialInputs.trainingExperience || "intermediate");
  const [trainingFrequency, setTrainingFrequency]   = useState(initialInputs.trainingFrequency ?? 4);
  const [sleepQuality, setSleepQuality]             = useState(initialInputs.sleepQuality || "average");
  const [caloricContext, setCaloricContext]          = useState(initialInputs.caloricContext || "deficit");
  const [aggressiveness, setAggressiveness]         = useState(initialInputs.aggressiveness || "moderate");
  // Protocol duration is READ-ONLY — calculated from the selected compounds (the
  // same suggestedCycleLength the Cycle Timeline uses), never edited. The old +/-
  // stepper here was the last reachable control that could change a timeline value.
  const protocolWeeks = useMemo(
    () => suggestedCycleLength(selectedCompounds, compoundCatalog, { fallback: 12 }),
    [selectedCompounds, compoundCatalog]
  );
  const [showTable, setShowTable]                   = useState(false);
  const [showFFMI, setShowFFMI]                     = useState(false); // #34 — FFMI explainer

  // #33 — persist inputs whenever they change (debounced write happens upstream).
  useEffect(() => {
    if (!onPersist) return;
    onPersist({ activityLevel, trainingExperience, trainingFrequency, sleepQuality, caloricContext, aggressiveness });
  }, [activityLevel, trainingExperience, trainingFrequency, sleepQuality, caloricContext, aggressiveness]);

  // ── Build enriched profile ──
  const enrichedProfile = useMemo(() => {
    if (!profile) return null;
    return buildProfile(profile, {
      activityLevel, trainingExperience, trainingFrequency,
      sleepQuality, caloricContext, aggressiveness,
    });
  }, [profile, activityLevel, trainingExperience, trainingFrequency, sleepQuality, caloricContext, aggressiveness]);

  // ── Run simulation ──
  const simResult = useMemo(() => {
    if (!enrichedProfile || selectedCompounds.length === 0) return null;
    return simulate(enrichedProfile, selectedCompounds, compoundCatalog, protocolWeeks);
  }, [enrichedProfile, selectedCompounds, compoundCatalog, protocolWeeks]);

  // ── Baseline-only simulation (for comparison when no compounds) ──
  const baselineOnly = useMemo(() => {
    if (!enrichedProfile) return null;
    return simulate(enrichedProfile, [], compoundCatalog, protocolWeeks);
  }, [enrichedProfile, compoundCatalog, protocolWeeks]);

  // ── Cost estimate ──
  const cost = useMemo(() => estimateMonthlyCost(selectedCompounds), [selectedCompounds]);

  // ── Canonical headline projection (#47dc1758/#86132d26) ──
  // The big "Projected BF / Projected Wt" tiles read from the SAME shared helper
  // the dashboard uses, so this page is cohesive with the rest of the app. The
  // peptideEngine week-by-week charts below remain the deeper trajectory model.
  const headlineBF = useMemo(
    () => projectBodyFat(profile, selectedCompounds, compoundCatalog),
    [profile, selectedCompounds, compoundCatalog]
  );
  const headlineWeight = useMemo(
    () => projectWeight(profile, selectedCompounds, compoundCatalog),
    [profile, selectedCompounds, compoundCatalog]
  );

  // ── Merged chart data ──
  const chartData = useMemo(() => {
    if (!simResult) return null;
    return simResult.timeline.map((d, i) => ({
      ...d,
      baseBf:      simResult.baseline[i]?.bf,
      baseWeight:  simResult.baseline[i]?.weightLbs,
      baseLean:    simResult.baseline[i]?.leanMassLbs,
      baseFat:     simResult.baseline[i]?.fatMassLbs,
    }));
  }, [simResult]);

  // ── Active compounds list ──
  const activeCompounds = useMemo(() => {
    return selectedCompounds.map(id => compoundCatalog.find(c => c.id === id)).filter(Boolean);
  }, [selectedCompounds, compoundCatalog]);

  const noCompounds = selectedCompounds.length === 0;

  const containerStyle = {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 20px 48px",
    minHeight: "100vh",
    color: C.text,
    fontFamily: FONT,
  };

  return (
    <div style={containerStyle}>
      {/* Header — top padding reserves the global nav band (persistent HOME +
          contextual BACK at the app root); the in-flow back button was removed
          in favor of that single nav chrome. Sprint 4, item 4.1. */}
      <div style={{ padding: "60px 0 8px" }}>
        <div style={{ ...label, color: C.accent, letterSpacing: "0.18em", marginBottom: 4 }}>Analytics</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          Body Composition Projections
        </h1>
        <p style={{ fontSize: 13, color: C.textDim, marginTop: 6, lineHeight: 1.5 }}>
          Week-by-week simulation based on your biometrics, training inputs, and selected compounds.
        </p>
      </div>

      {/* ── Computed Profile Summary ── */}
      {enrichedProfile && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 12 }}>Your Computed Profile</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
            <Stat value={Math.round(enrichedProfile.bmr)} label="BMR" sub="kcal/day" />
            <Stat value={Math.round(enrichedProfile.tdee)} label="TDEE" sub="kcal/day" />
            <Stat value={enrichedProfile.caloricTarget} label="Cal Target" sub="kcal/day" color={C.accent} />
            <Stat value={`${enrichedProfile.proteinTarget}g`} label="Protein" sub="/day" color={C.blue} />
            <Stat value={enrichedProfile.ffmi.toFixed(1)} label="FFMI" sub={enrichedProfile.ffmiCategory} color={enrichedProfile.ffmi > 25 ? C.yellow : "#fff"} />
            <Stat value={`${enrichedProfile.leanMassLbs.toFixed(0)}`} label="Lean Mass" sub="lbs" />
            <Stat value={`${enrichedProfile.fatMassLbs.toFixed(0)}`} label="Fat Mass" sub="lbs" />
            <Stat value={`${enrichedProfile.bodyFat}%`} label="Body Fat" sub={bfCategory(enrichedProfile.bodyFat)} color={enrichedProfile.bodyFat > 25 ? C.yellow : enrichedProfile.bodyFat < 15 ? C.accent : "#fff"} />
          </div>
          {/* #34 — FFMI explainer */}
          <button
            onClick={() => setShowFFMI(v => !v)}
            style={{ marginTop: 12, background: "none", border: "none", color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>ⓘ What's FFMI?</span>
            <span style={{ fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: showFFMI ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>
          {showFFMI && (
            <div style={{ marginTop: 8, padding: "12px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.textDim, lineHeight: 1.55 }}>
              <strong style={{ color: C.text }}>FFMI (Fat-Free Mass Index)</strong> measures how muscular you are relative to your height — think of it as BMI but for muscle. As a rough guide: <strong style={{ color: C.text }}>~18–20</strong> is average, <strong style={{ color: C.text }}>~22–23</strong> is athletic, and <strong style={{ color: C.text }}>~25</strong> is the natural ceiling.
            </div>
          )}
        </div>
      )}

      {/* ── Training & Lifestyle Inputs ── */}
      <div style={card}>
        <div style={{ ...label, marginBottom: 12 }}>Training & Lifestyle Inputs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={label}>Activity Level</label>
            <select style={selectStyle} value={activityLevel} onChange={e => setActivityLevel(e.target.value)}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light (1-3d/wk)</option>
              <option value="moderate">Moderate (3-5d/wk)</option>
              <option value="active">Active (6-7d/wk)</option>
              <option value="veryActive">Very Active (2x/day)</option>
            </select>
          </div>
          <div>
            <label style={label}>Training Experience</label>
            <select style={selectStyle} value={trainingExperience} onChange={e => setTrainingExperience(e.target.value)}>
              <option value="beginner">Beginner (&lt;1yr)</option>
              <option value="intermediate">Intermediate (1-3yr)</option>
              <option value="advanced">Advanced (3yr+)</option>
            </select>
          </div>
          <div>
            <label style={label}>Train Freq (days/wk)</label>
            <input style={inputStyle} type="number" min={0} max={7} value={trainingFrequency} onChange={e => setTrainingFrequency(+e.target.value)} />
          </div>
          <div>
            <label style={label}>Sleep Quality</label>
            <select style={selectStyle} value={sleepQuality} onChange={e => setSleepQuality(e.target.value)}>
              <option value="poor">Poor</option>
              <option value="average">Average</option>
              <option value="good">Good</option>
              <option value="excellent">Excellent</option>
            </select>
          </div>
          <div>
            <label style={label}>Caloric Context</label>
            <select style={selectStyle} value={caloricContext} onChange={e => setCaloricContext(e.target.value)}>
              <option value="deficit">Deficit (cutting)</option>
              <option value="maintenance">Maintenance</option>
              <option value="surplus">Surplus (bulking)</option>
            </select>
          </div>
          <div>
            <label style={label}>Aggressiveness</label>
            <select style={selectStyle} value={aggressiveness} onChange={e => setAggressiveness(e.target.value)}>
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={label}>Protocol Duration</label>
          {/* Read-only — the duration is a projection calculated from the stack's
              compounds (matches the Cycle Timeline), not an editable value. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600 }}>{protocolWeeks} weeks</span>
            <span style={{ fontSize: 11, color: C.textFaint }}>Calculated from your stack</span>
          </div>
        </div>
      </div>

      {/* ── Active Stack ── */}
      <div style={card}>
        <div style={{ ...label, marginBottom: 8 }}>Active Stack · {activeCompounds.length} compound{activeCompounds.length !== 1 ? "s" : ""}</div>
        {noCompounds ? (
          <div style={{ fontSize: 13, color: C.textFaint, lineHeight: 1.6 }}>
            No compounds selected. Return to the dashboard and add compounds to your stack, then come back to see projections.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activeCompounds.map(c => (
              <span key={c.id} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", background: C.accentDim, color: C.accent, border: `1px solid ${C.accentBorder}`, borderRadius: 999 }}>
                {c.name}
              </span>
            ))}
          </div>
        )}
        {!noCompounds && (
          <div style={{ marginTop: 10, fontSize: 11, color: C.textFaint }}>
            Est. cost: <span style={{ color: C.textDim, fontFamily: MONO }}>${cost.low}–${cost.high}/mo</span>
          </div>
        )}
      </div>

      {/* ── PROJECTIONS ── */}
      {simResult && chartData && (
        <>
          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
            <Stat
              value={`-${simResult.summary.totalFatLossLbs}`}
              label="Fat Loss"
              sub={`vs baseline: -${simResult.summary.baselineFatLossLbs}`}
              color={C.accent}
            />
            <Stat
              value={`+${simResult.summary.totalMuscleGainLbs}`}
              label="Muscle Gain"
              sub={`vs baseline: +${simResult.summary.baselineMuscleGainLbs}`}
              color={C.blue}
            />
            <Stat
              value={`${headlineBF ?? simResult.summary.endBF}%`}
              label="Projected BF"
              sub={`from ${profile.bodyFat}%`}
              color={C.accent}
            />
            <Stat
              value={`${headlineWeight ?? simResult.summary.endWeightLbs}`}
              label="Projected Wt"
              sub={`from ${profile.weight} lbs`}
            />
            <Stat
              value={`+${simResult.summary.compoundEdgeFatLbs}`}
              label="Compound Edge"
              sub="fat lbs beyond baseline"
              color={C.yellow}
            />
            <Stat
              value={simResult.summary.endFFMI || "—"}
              label="Projected FFMI"
              sub={`from ${simResult.summary.startFFMI}`}
              color={C.purple}
            />
          </div>

          {/* Charts */}
          <MiniChart data={chartData} dataKey="bf" baselineKey="baseBf" color={C.accent} label="Body Fat % — Protocol vs Baseline" yUnit="%" />
          <MiniChart data={chartData} dataKey="weightLbs" baselineKey="baseWeight" color={C.accent} label="Weight (lbs)" height={120} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <MiniChart data={chartData} dataKey="leanMassLbs" baselineKey="baseLean" color={C.blue} label="Lean Mass (lbs)" height={110} />
            <MiniChart data={chartData} dataKey="fatMassLbs" baselineKey="baseFat" color={C.red} label="Fat Mass (lbs)" height={110} />
          </div>

          {/* BMR / TDEE trajectory */}
          <MiniChart data={chartData} dataKey="bmr" color={C.yellow} label="BMR (kcal/day)" height={100} />

          {/* Week-by-week table (collapsible) */}
          <div style={card}>
            <button onClick={() => setShowTable(v => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: C.text, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              <span>Week-by-Week Breakdown</span>
              <span style={{ fontSize: 11, color: C.textFaint, transition: "transform 0.2s", display: "inline-block", transform: showTable ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>
            {showTable && (
              <div style={{ marginTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: MONO }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.borderStrong}` }}>
                      {["Wk", "Wt (lbs)", "BF%", "Lean", "Fat", "BMR", "Δ Fat", "Δ Muscle"].map(h => (
                        <th key={h} style={{ padding: "8px 4px", textAlign: "right", color: C.textFaint, fontWeight: 600, fontSize: 9, letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {simResult.weeklyDetail.map((d, i) => (
                      <tr key={d.week} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: C.textFaint, fontWeight: 700 }}>{d.week}</td>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: "#fff" }}>{d.weightLbs}</td>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: d.bf < simResult.timeline[0].bf ? C.accent : "#fff" }}>{d.bf}%</td>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: "#fff" }}>{d.leanMassLbs}</td>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: "#fff" }}>{d.fatMassLbs}</td>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: C.textFaint }}>{d.bmr}</td>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: d.weeklyFatLossLbs > 0 ? C.accent : C.textFaint }}>
                          {i > 0 ? `-${d.weeklyFatLossLbs}` : "—"}
                        </td>
                        <td style={{ padding: "5px 4px", textAlign: "right", color: d.weeklyMuscleGainLbs > 0 ? C.blue : C.textFaint }}>
                          {i > 0 ? `+${d.weeklyMuscleGainLbs}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FFMI trajectory note */}
          {simResult.summary.endFFMI > 25 && (
            <div style={{ ...card, borderColor: `${C.yellow}33`, background: "rgba(245,158,11,0.04)" }}>
              <div style={{ fontSize: 12, color: C.yellow, fontWeight: 600, marginBottom: 4 }}>FFMI Note</div>
              <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>
                Projected FFMI of {simResult.summary.endFFMI} approaches the natural ceiling (~25). Results at this level depend heavily on genetics, training quality, and protocol adherence.
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state when no compounds */}
      {noCompounds && enrichedProfile && (
        <div style={{ ...card, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 16, color: C.textFaint, marginBottom: 8 }}>No compounds selected</div>
          <div style={{ fontSize: 13, color: C.textFaint, lineHeight: 1.5 }}>
            Add compounds to your stack from the dashboard to see body composition projections.
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 20, padding: "12px 14px", fontSize: 11, lineHeight: 1.5, color: C.textFaint, textAlign: "center", fontStyle: "italic" }}>
        Projections are mathematical estimates based on published research parameters, population-average response rates, and your individual biometrics. Actual results vary significantly based on genetics, training quality, nutrition adherence, sleep, and other factors. This is not medical advice. Consult a licensed healthcare provider before initiating any protocol.
      </div>
    </div>
  );
}
