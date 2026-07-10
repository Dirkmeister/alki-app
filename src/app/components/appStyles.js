// ── SHARED UI STYLES & CONSTANTS ───────────────────────────
// Extracted from AlkiApp.jsx so the inline screen components (SplashScreen,
// AgeGate, Onboarding, …) can live in their own files while AlkiApp and every
// other component keep referencing the SAME single source of truth. Pure data —
// no React, no renderer imports — so it stays portable.

// ── STYLES ─────────────────────────────────────────────────
export const S = {
  app: {
    // Stage C — the app shell must scroll like a native mobile viewport. This was
    // `overflow: hidden` (both axes), which clipped any content taller than the
    // viewport so centered screens (splash, age gate) couldn't be scrolled to.
    // Only the horizontal axis is clipped now (the 3D canvas / wide rows can bleed
    // sideways); vertical scroll flows to the page body. globals.css already pins
    // `overflow-x: hidden` on html/body, so this is belt-and-suspenders for X.
    minHeight: "100dvh",
    background: "#0a0a0a",
    color: "#ededed",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    overflowX: "hidden"
  },
  inner: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 24px",
    // Stage C — `dvh` tracks the visible viewport, so the shell is sized to the
    // area actually on screen instead of the static `100vh` (which includes the
    // mobile address-bar strip and made short, centered screens like the age gate
    // appear to jump/resize as the bar collapsed). Centered screens pair this with
    // `justifyContent: "safe center"` so taller content scrolls instead of clipping.
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column"
  },
  accent: "#22D68A",
  accentDim: "rgba(34,214,138,0.12)",
  accentBorder: "rgba(34,214,138,0.22)",
  card: {
    // #48 — backdrop-filter:blur was on EVERY card. With dozens of cards (up to
    // ~71 in "see all"), any repaint (scroll, a keystroke's cursor blink) forced
    // the compositor to re-blur each layer -> 7-17fps with ZERO JS blocking time.
    // Over the flat #0a0a0a bg the blur was visually negligible; removed it.
    background: "#1a1a1a",
    // The border is TRANSPARENT, not absent. A neutral card shows no border (as
    // specified), but ~7 call sites spread this object and then override only
    // `borderColor` to signal state — contraindication red, caution amber,
    // cultivation status, selected compound green. With no `border` shorthand
    // there'd be no width/style for those overrides to colour, and every one of
    // those signals would silently disappear. Keeping 1px transparent also means
    // switching a card into a state never shifts layout by a pixel.
    border: "1px solid transparent",
    borderRadius: 12,
    padding: 22,
    marginBottom: 14,
    transition: "border-color 0.25s ease, background 0.25s ease"
  },
  input: {
    width: "100%",
    padding: "15px 18px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s ease, background 0.2s ease"
  },
  btn: {
    width: "100%",
    padding: "17px 24px",
    background: "#22D68A",
    color: "#000000",
    border: "none",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.03em",
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    transition: "transform 0.15s ease, box-shadow 0.2s ease",
    boxShadow: "0 0 20px rgba(34,214,138,0.15), 0 2px 8px rgba(0,0,0,0.3)"
  },
  btnDisabled: {
    opacity: 0.3,
    cursor: "not-allowed",
    boxShadow: "none"
  },
  btnOutline: {
    width: "100%",
    padding: "15px 24px",
    // Secondary CTA: transparent fill, accent border, accent text.
    background: "transparent",
    color: "#22D68A",
    border: "1.5px solid #22D68A",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Syne', 'DM Sans', sans-serif",
    letterSpacing: "0.02em",
    transition: "border-color 0.2s ease, background 0.2s ease"
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    // 1px, not the old 0.14em (=1.4px at this size).
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: "#666666",
    marginBottom: 10,
    display: "block",
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace"
  },
  tag: {
    display: "inline-block",
    padding: "8px 16px",
    borderRadius: 100,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginRight: 8,
    marginBottom: 8
  },
  disclaimer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.22)",
    lineHeight: 1.6,
    textAlign: "center",
    padding: "20px 0",
    fontFamily: "'DM Sans', sans-serif"
  }
};

export const GOALS = [
  { id: "fat_loss", label: "Fat Loss", icon: "🔥" },
  { id: "muscle", label: "Muscle Gain", icon: "💪" },
  { id: "recovery", label: "Recovery", icon: "🩹" },
  { id: "anti_aging", label: "Anti-Aging", icon: "⏳" },
  { id: "skin", label: "Skin Quality", icon: "✨" },
  { id: "energy", label: "Energy", icon: "⚡" },
  { id: "performance", label: "Performance", icon: "🎯" }
];
