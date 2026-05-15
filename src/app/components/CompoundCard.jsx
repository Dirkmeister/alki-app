"use client";
import { useState } from "react";
import { S } from "../styles/theme";

export default function CompoundCard({ rec, isSelected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const c = rec.compound;
  const blocked = rec.blocked;

  const catColors = {
    Recovery: "#3b82f6",
    "Growth Hormone": "#a855f7",
    "Fat Loss": "#f59e0b",
    "Weight Loss": "#ef4444",
    "Anti-Aging": "#ec4899",
    Performance: "#06b6d4"
  };
  const catColor = catColors[c.category] || "#888";

  return (
    <div style={{
      ...S.card,
      opacity: blocked ? 0.45 : 1,
      borderColor: isSelected ? S.accent : "rgba(255,255,255,0.08)",
      background: isSelected ? "rgba(34,214,138,0.06)" : "rgba(255,255,255,0.04)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{c.name}</span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: `${catColor}20`, color: catColor, fontWeight: 600 }}>
              {c.category}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>{c.tagline}</div>
        </div>
        {!blocked && (
          <button onClick={onToggle} style={{
            width: 36, height: 36, borderRadius: 10,
            border: `2px solid ${isSelected ? S.accent : "rgba(255,255,255,0.15)"}`,
            background: isSelected ? S.accent : "transparent",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: isSelected ? "#0a0a0a" : "rgba(255,255,255,0.3)", flexShrink: 0
          }}>
            {isSelected ? "✓" : "+"}
          </button>
        )}
      </div>

      {blocked && rec.flags.length > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#fca5a5", marginBottom: 10 }}>
          ⚠ {rec.flags[0]}
        </div>
      )}

      {!blocked && rec.flags.length > 0 && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", fontSize: 12, color: "#fbbf24", marginBottom: 10 }}>
          ⚠ {rec.flags[0]}
        </div>
      )}

      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "8px 0" }}>
        {c.mechanism}
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
          {c.dosing}
        </span>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
          {c.cycle}
        </span>
      </div>

      <button onClick={() => setExpanded(!expanded)} style={{
        background: "none", border: "none", color: S.accent, fontSize: 13, fontWeight: 600,
        cursor: "pointer", padding: "10px 0 0", fontFamily: "inherit"
      }}>
        {expanded ? "Collapse ↑" : "Full Profile ↓"}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>Key Benefits</div>
            {c.keyBenefits.map((b, i) => (
              <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", padding: "3px 0", paddingLeft: 12, borderLeft: `2px solid ${catColor}40` }}>
                {b}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ ...S.label, marginBottom: 6, color: "#22d68a" }}>Pros</div>
              {c.pros.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", padding: "3px 0", lineHeight: 1.5 }}>+ {p}</div>
              ))}
            </div>
            <div>
              <div style={{ ...S.label, marginBottom: 6, color: "#ef4444" }}>Cons</div>
              {c.cons.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", padding: "3px 0", lineHeight: 1.5 }}>− {p}</div>
              ))}
            </div>
          </div>
          {rec.stackNotes.length > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(34,214,138,0.06)", border: "1px solid rgba(34,214,138,0.15)", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              🔗 {rec.stackNotes[0]}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>Administration</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{c.route}</div>
          </div>
        </div>
      )}
    </div>
  );
}
