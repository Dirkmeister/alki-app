"use client";

/**
 * ALKI — PROTOCOL GUIDE (Plan C)
 * ────────────────────────────────────────────────────────────
 * Personalized, assembled implementation guide for a locked stack:
 *   1. Supply list   2. Reconstitution calculator   3. Injection sites
 *   4. Weekly schedule   5. What to expect   6. Bloodwork
 *
 * Reads pure data via lib/protocolGuide.js + data/protocolProtocols.js.
 * Cross-links to the Q&A (reference) and the full Protocol Timeline;
 * it does NOT duplicate them. Research/educational only — not medical advice.
 * ────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import {
  buildSupplyList, siteRotation, buildSchedule, mergeTimeline, reconstitute,
} from "../lib/protocolGuide";
import { getProtocolsForStack, SITE_LABELS } from "../data/protocolProtocols";

const T = {
  bg: "#0a0a0a",
  surface: "rgba(255,255,255,0.04)",
  surfaceHi: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  text: "#e8e8e8",
  text2: "rgba(255,255,255,0.62)",
  text3: "rgba(255,255,255,0.38)",
  faint: "rgba(255,255,255,0.25)",
  accent: "#22d68a",
  accentDim: "rgba(34,214,138,0.10)",
  accentBorder: "rgba(34,214,138,0.25)",
  warn: "#ff6b6b",
};
const FONT = "'DM Sans', 'Helvetica Neue', sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginBottom: 14, fontFamily: FONT, ...style }}>
      {children}
    </div>
  );
}
function SectionLabel({ n, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accentBorder}`, color: T.accent, fontSize: 11, fontWeight: 700, fontFamily: MONO, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: T.text2 }}>{children}</span>
    </div>
  );
}

// ── 1. Supply list ───────────────────────────────────────────────
function SupplyListSection({ stackIds }) {
  const { items } = buildSupplyList(stackIds);
  return (
    <Card>
      <SectionLabel n="1">Supply List</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : "none" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{it.label}</span>
            <span style={{ fontSize: 12, color: T.text3, textAlign: "right" }}>{it.detail}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: T.faint, marginTop: 12, lineHeight: 1.5 }}>
        Source from a sterile, reputable supplier. Quantities are an estimate for one cycle.
      </div>
    </Card>
  );
}

// ── 2. Reconstitution calculator (interactive, per injectable) ───
function ReconCard({ p }) {
  const r = p.reconstitution;
  const [vialMg, setVialMg] = useState(r.defaultVialMg);
  const [bacWaterMl, setBacWaterMl] = useState(r.defaultBacWaterMl);
  const [doseMcg, setDoseMcg] = useState(r.perDoseMcg);
  const out = reconstitute({ vialMg, bacWaterMl, doseMcg });

  const field = (label, value, onChange, opts) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text3, marginBottom: 4 }}>{label}</div>
      {opts ? (
        <select value={value} onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width: "100%", padding: "9px 10px", background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 14, fontFamily: FONT, outline: "none" }}>
          {opts.map(o => <option key={o} value={o}>{o} mg</option>)}
        </select>
      ) : (
        <input type="number" inputMode="decimal" value={value} min={0}
          onChange={e => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 14, fontFamily: FONT, outline: "none" }} />
      )}
    </div>
  );

  return (
    <div style={{ background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 10 }}>{p.name}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {field("Vial size", vialMg, setVialMg, r.vialSizes)}
        {field("Bac water (mL)", bacWaterMl, setBacWaterMl)}
        {field("Dose (mcg)", doseMcg, setDoseMcg)}
      </div>
      {out.valid ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", alignItems: "baseline" }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: T.accent, fontFamily: MONO }}>{out.units}</span>
            <span style={{ fontSize: 12, color: T.text2, marginLeft: 6 }}>units (U-100)</span>
          </div>
          <div style={{ fontSize: 12, color: T.text3 }}>
            = {out.volumeMl} mL · {out.concentrationMcgPerMl} mcg/mL · ~{out.dosesPerVial} doses/vial
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: T.warn }}>Enter vial size, water, and dose to calculate.</div>
      )}
      {r.note && <div style={{ fontSize: 11, color: T.faint, marginTop: 10, lineHeight: 1.5 }}>{r.note}</div>}
    </div>
  );
}

function ReconSection({ stackIds, onQA }) {
  const injectables = getProtocolsForStack(stackIds).filter(p => p.routeType === "injectable" && p.reconstitution);
  return (
    <Card>
      <SectionLabel n="2">Reconstitution Calculator</SectionLabel>
      {injectables.length > 0 ? (
        <>
          {injectables.map(p => <ReconCard key={p.id} p={p} />)}
          <button onClick={onQA} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, padding: 0, marginTop: 2 }}>
            Full reconstitution guide in Q&amp;A →
          </button>
        </>
      ) : (
        <div style={{ fontSize: 13, color: T.text2 }}>No reconstitution needed — this stack has no injectable compounds.</div>
      )}
    </Card>
  );
}

// ── 3. Injection site diagram ────────────────────────────────────
const SITE_DOTS = {
  abdomen: [{ x: 100, y: 150 }],
  love_handle: [{ x: 76, y: 152 }, { x: 124, y: 152 }],
  thigh: [{ x: 86, y: 232 }, { x: 114, y: 232 }],
  delt: [{ x: 58, y: 96 }, { x: 142, y: 96 }],
  glute: [{ x: 84, y: 196 }, { x: 116, y: 196 }],
};

function InjectionSiteSection({ stackIds }) {
  const { sites, anyInjectable } = siteRotation(stackIds);
  if (!anyInjectable) {
    return (
      <Card>
        <SectionLabel n="3">Injection Sites</SectionLabel>
        <div style={{ fontSize: 13, color: T.text2 }}>No injections required for this stack (topical / oral compounds only).</div>
      </Card>
    );
  }
  const active = new Set(sites);
  return (
    <Card>
      <SectionLabel n="3">Injection Sites — rotate daily</SectionLabel>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <svg viewBox="0 0 200 300" style={{ width: 120, flexShrink: 0 }}>
          {/* simplified front-facing silhouette */}
          <g fill="rgba(255,255,255,0.05)" stroke={T.border} strokeWidth="1.5">
            <circle cx="100" cy="38" r="20" />
            <rect x="62" y="62" width="76" height="100" rx="20" />
            <rect x="48" y="66" width="20" height="80" rx="10" />
            <rect x="132" y="66" width="20" height="80" rx="10" />
            <rect x="74" y="158" width="22" height="110" rx="11" />
            <rect x="104" y="158" width="22" height="110" rx="11" />
          </g>
          {Object.entries(SITE_DOTS).flatMap(([site, dots]) =>
            dots.map((d, i) => {
              const on = active.has(site);
              return (
                <circle key={`${site}-${i}`} cx={d.x} cy={d.y} r={on ? 6 : 4}
                  fill={on ? T.accent : "rgba(255,255,255,0.12)"}
                  stroke={on ? "rgba(34,214,138,0.4)" : "transparent"} strokeWidth={on ? 4 : 0} />
              );
            })
          )}
        </svg>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 12, color: T.text3, marginBottom: 8 }}>Recommended SubQ sites for this stack:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {sites.map(s => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 100, background: T.accentDim, border: `1px solid ${T.accentBorder}`, fontSize: 12, fontWeight: 600, color: T.accent }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent }} />
                {SITE_LABELS[s] || s}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.faint, marginTop: 10, lineHeight: 1.5 }}>
            Rotate sites each injection to avoid irritation. Pinch SubQ tissue; insert at 45–90°.
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── 4. Weekly schedule ───────────────────────────────────────────
function ScheduleGroup({ title, entries }) {
  if (!entries.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text2, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(e => (
          <div key={e.id} style={{ background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{e.name}</span>
              <span style={{ fontSize: 13, fontFamily: MONO, color: T.accent }}>{e.dose}</span>
            </div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 3 }}>
              {e.frequencyLabel}
              {e.cycle?.onWeeks ? ` · ${e.cycle.onWeeks}wk${e.cycle.offWeeks ? ` on / ${e.cycle.offWeeks}wk off` : ""}` : ""}
            </div>
            {e.titration && (
              <div style={{ fontSize: 11, color: T.faint, marginTop: 6, lineHeight: 1.5 }}>
                Titration: {e.titration.map(t => `${t.weeks}: ${t.dose}`).join(" · ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleSection({ stackIds, onTimeline }) {
  const s = buildSchedule(stackIds);
  return (
    <Card>
      <SectionLabel n="4">Weekly Schedule</SectionLabel>
      <ScheduleGroup title="☀ Morning" entries={s.am} />
      <ScheduleGroup title="☾ Evening" entries={s.pm} />
      <ScheduleGroup title="◷ Weekly" entries={s.weekly} />
      <ScheduleGroup title="⚡ As needed" entries={s.asNeeded} />
      {onTimeline && (
        <button onClick={onTimeline} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, padding: 0 }}>
          See the full week-by-week timeline →
        </button>
      )}
    </Card>
  );
}

// ── 5. What to expect ────────────────────────────────────────────
function ExpectSection({ stackIds }) {
  const bands = mergeTimeline(stackIds);
  return (
    <Card>
      <SectionLabel n="5">What To Expect</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {bands.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div style={{ flexShrink: 0, width: 70, fontSize: 12, fontFamily: MONO, fontWeight: 600, color: T.accent, paddingTop: 2 }}>{b.weeks}</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {b.items.map((it, j) => (
                <div key={j} style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
                  <span style={{ color: T.text, fontWeight: 600 }}>{it.name}:</span> {it.expect}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 6. Bloodwork ─────────────────────────────────────────────────
function BloodworkSection({ stackIds, onQA }) {
  const protocols = getProtocolsForStack(stackIds);
  const markers = new Set();
  let anyRequired = false;
  for (const p of protocols) {
    (p.bloodwork?.panel || []).forEach(m => markers.add(m));
    if (p.bloodwork?.required) anyRequired = true;
  }
  const list = Array.from(markers);
  return (
    <Card>
      <SectionLabel n="6">Bloodwork</SectionLabel>
      {list.length > 0 ? (
        <>
          <div style={{ fontSize: 12, color: T.text3, marginBottom: 8 }}>
            {anyRequired ? "Recommended before, during, and after this cycle:" : "Optional baseline panel for this stack:"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {list.map(m => (
              <span key={m} style={{ padding: "5px 11px", borderRadius: 100, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.22)", fontSize: 12, fontWeight: 600, color: T.warn }}>{m}</span>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: T.text2 }}>No routine bloodwork flagged for this stack.</div>
      )}
      <button onClick={onQA} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, padding: 0, marginTop: 12 }}>
        More on monitoring in Q&amp;A →
      </button>
    </Card>
  );
}

// ── Screen ───────────────────────────────────────────────────────
export default function ProtocolGuideView({ stackIds = [], profile, onBack, onQA, onTimeline }) {
  const ids = Array.isArray(stackIds) ? stackIds.filter(Boolean) : [];

  const container = {
    maxWidth: 480, margin: "0 auto", padding: "20px 20px 48px", minHeight: "100vh",
    boxSizing: "border-box", color: T.text, fontFamily: FONT,
  };

  const back = onBack && (
    <button onClick={onBack} style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: FONT, marginBottom: 16 }}>← Back</button>
  );

  if (ids.length === 0) {
    return (
      <div style={container}>
        {back}
        <Card style={{ marginTop: 40, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No protocol locked in</div>
          <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>Lock in a stack to see your step-by-step protocol guide.</div>
        </Card>
      </div>
    );
  }

  return (
    <div style={container}>
      {back}
      <div style={{ fontSize: 10, fontFamily: MONO, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: T.accent, marginBottom: 4 }}>Protocol Guide</div>
      <h1 style={{ margin: "0 0 18px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: T.text, fontFamily: FONT, lineHeight: 1.15 }}>
        Your protocol, step by step.
      </h1>

      <SupplyListSection stackIds={ids} />
      <ReconSection stackIds={ids} onQA={onQA} />
      <InjectionSiteSection stackIds={ids} />
      <ScheduleSection stackIds={ids} onTimeline={onTimeline} />
      <ExpectSection stackIds={ids} />
      <BloodworkSection stackIds={ids} onQA={onQA} />

      <div style={{ fontSize: 11, lineHeight: 1.6, color: T.faint, textAlign: "center", padding: "8px 4px 0" }}>
        Assembled from your stack for research and educational purposes only. Nothing here is medical advice — consult a licensed healthcare provider before starting any protocol.
      </div>
      {onQA && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button onClick={onQA} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
            See the full reference Q&amp;A →
          </button>
        </div>
      )}
    </div>
  );
}
