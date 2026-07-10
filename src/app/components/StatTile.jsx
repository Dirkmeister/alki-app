"use client";
import { ACCENT } from "../theme";

// Outcome card for the projection surface. Props-only, no state.
//
// The headline IS the delta ("−2.5%", "+1.2 pts"), not the projected absolute:
// current → projected for body fat and weight is shown by the Current/Projected
// comparison columns above, so repeating it here would say the same thing twice.
//
// Colour is favourability, not sign. `goodDirection` is per-metric — body fat and
// weight are "down", lean mass and skin are "up" — so a 2.5% fat LOSS reads green
// while a 2.5% fat GAIN reads red. Colouring on sign alone would invert both.
export default function StatTile({ label, delta, unit, goodDirection = "up", isScore = false, note = null }) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const isFavorable = hasDelta && (goodDirection === "up" ? delta > 0 : delta < 0);
  const valueColor = !hasDelta ? "rgba(255,255,255,0.35)" : isFavorable ? ACCENT : "#ef4444";

  const formattedDelta = hasDelta
    ? `${delta > 0 ? "+" : ""}${Math.round(delta * 10) / 10}${unit}`
    : `0${unit}`;

  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 12,
      background: "#1a1a1a",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textIndent: "0.12em",
        textTransform: "uppercase", color: "#666666", fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: valueColor, lineHeight: 1.1,
        fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums",
      }}>
        {hasDelta ? formattedDelta : (isScore ? "—" : `0${unit}`)}
      </div>
      {note && (
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", lineHeight: 1.45 }}>
          {note}
        </div>
      )}
    </div>
  );
}
