"use client";

// Presentational stat tile for the Dashboard biometric summary. Props-only,
// no state — extracted from AlkiApp.jsx (Group 3 cleanup) with no behavior
// change. Shows either an absolute projected value with a from→delta line, or a
// standalone delta when only a change is available.
export default function StatTile({ label, current, projected, delta, unit, goodDirection = "up", isScore = false, note = null }) {
  // Determine if the delta is favorable based on the metric's direction.
  const hasDelta = typeof delta === "number" && delta !== 0;
  const isFavorable = hasDelta && (goodDirection === "up" ? delta > 0 : delta < 0);
  const deltaColor = !hasDelta
    ? "rgba(255,255,255,0.35)"
    : isFavorable
    ? "#1ae87a"
    : "#ef4444";

  // Display value: prefer projected absolute when provided, otherwise show delta.
  const showAbsolute = current && projected;
  const formattedDelta = hasDelta
    ? `${delta > 0 ? "+" : ""}${Math.round(delta * 10) / 10}${unit}`
    : `0${unit}`;

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      gap: 4
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
        {label}
      </div>
      {showAbsolute ? (
        <>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.1, fontFamily: "'JetBrains Mono', monospace" }}>
            {projected}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            from <span style={{ color: "rgba(255,255,255,0.6)" }}>{current}</span>{" "}
            <span style={{ color: deltaColor, fontWeight: 600 }}>({formattedDelta})</span>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: deltaColor, lineHeight: 1.1, fontFamily: "'JetBrains Mono', monospace" }}>
            {hasDelta ? formattedDelta : (isScore ? "—" : `0${unit}`)}
          </div>
          {note && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {note}
            </div>
          )}
        </>
      )}
    </div>
  );
}
