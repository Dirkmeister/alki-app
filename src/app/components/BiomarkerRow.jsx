"use client";

// Presentational biomarker row for the Dashboard projection list. Props-only,
// no state — extracted from AlkiApp.jsx (Group 3 cleanup) with no behavior
// change. Renders a current→projected value pair with a colored delta.
export default function BiomarkerRow({ projection }) {
  const { label, unit, current, delta, projected, positive } = projection;
  const hasDelta = delta !== 0;
  const deltaColor = !hasDelta
    ? "rgba(255,255,255,0.35)"
    : positive
    ? "#1ae87a"
    : "#ef4444";
  const deltaStr = `${delta > 0 ? "+" : ""}${delta}${unit}`;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.05)",
      gap: 12
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: "rgba(255,255,255,0.45)" }}>{current}{unit}</span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
        <span style={{ color: "#fff", fontWeight: 700 }}>{projected}{unit}</span>
        <span style={{ color: deltaColor, fontWeight: 600, fontSize: 11, minWidth: 50, textAlign: "right" }}>
          {hasDelta ? deltaStr : "—"}
        </span>
      </div>
    </div>
  );
}
