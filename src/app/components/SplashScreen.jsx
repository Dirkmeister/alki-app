"use client";
import { useState, useEffect, useRef } from "react";
import { DISCLAIMER } from "../lib/disclaimer";
import { ACCENT } from "../theme";

// ─────────────────────────────────────────────────────────────
// App version — bump on every commit so testers can confirm which deploy
// they're viewing. Shown on the splash/enter screen (upper-left).
const APP_VERSION = "0.2.00";
// Auto build id from Vercel's git commit SHA (wired in next.config.mjs).
// Updates on every deploy with no manual bump; "dev" when running locally.
const BUILD_SHA = (process.env.NEXT_PUBLIC_COMMIT_SHA || "dev").slice(0, 7);

// Animation beats, in ms from mount. The bottom row starts only once the logo's
// 1.5s fade has finished (1500 + 500), which leaves it ~400ms of dwell before
// AUTO_ADVANCE_MS fires. Tight by design — the splash is a held breath, not a
// screen you read. Timers are cleared on unmount.
const LOGO_FADE_MS = 1500;
const ROW_DELAY_MS = 2000;
const ROW_FADE_MS = 600;
const AUTO_ADVANCE_MS = 3000;

// The four capability teasers. Not navigation — nothing here is tappable on its
// own; a tap anywhere on the splash advances. Icons are inline stroke SVGs so
// they inherit sizing and never pull a network request.
const CAPABILITIES = [
  { label: "Research", icon: SearchIcon },
  { label: "Visualize", icon: EyeIcon },
  { label: "Optimize", icon: BoltIcon },
  { label: "Evolve", icon: ArrowIcon },
];

export default function SplashScreen({ onEnter }) {
  const [logoIn, setLogoIn] = useState(false);
  const [rowIn, setRowIn] = useState(false);
  // Auto-advance and tap race each other; whichever lands first wins and the
  // other becomes a no-op. Without this guard a tap at ~2.99s would route twice.
  const enteredRef = useRef(false);

  const enter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    onEnter();
  };

  useEffect(() => {
    const t1 = setTimeout(() => setLogoIn(true), 50);
    const t2 = setTimeout(() => setRowIn(true), ROW_DELAY_MS);
    const t3 = setTimeout(enter, AUTO_ADVANCE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={enter}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); } }}
      role="button"
      tabIndex={0}
      aria-label="Enter Alki"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        outline: "none",
        overflow: "hidden",
      }}
    >
      {/* ── Atmosphere ────────────────────────────────────────────────
          Stands in for the corridor photograph until an asset exists: a
          vertical gradient that darkens at both ends, plus a green light
          source blooming from center-bottom — the thing the silhouette
          would be walking toward. Drop a background-image on this layer
          to swap the art in; the glow above it still reads. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "linear-gradient(to bottom, #0a0a0a 0%, #0d1a0f 50%, #0a0a0a 100%)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute", zIndex: 0, pointerEvents: "none",
          bottom: "-18%", left: "50%", transform: "translateX(-50%)",
          width: 520, height: 420,
          background: `radial-gradient(ellipse at center, ${ACCENT}22 0%, ${ACCENT}0d 38%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Build version — upper-left, bumped each commit */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 2,
        fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em",
      }}>
        v{APP_VERSION} · {BUILD_SHA}
      </div>

      {/* ── Logo block — upper third ──────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 1,
        marginTop: "16vh", textAlign: "center", padding: "0 24px",
        opacity: logoIn ? 1 : 0,
        transform: logoIn ? "translateY(0)" : "translateY(14px)",
        transition: `opacity ${LOGO_FADE_MS}ms ease, transform ${LOGO_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`,
      }}>
        <AlkiDelta />

        <h1 style={{
          margin: "28px 0 0",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: 44,
          lineHeight: 1,
          letterSpacing: "0.22em",
          textIndent: "0.22em", // counter the trailing letter-space so it optically centers
          color: "#fff",
        }}>
          ALKI
        </h1>

        <p style={{
          margin: "18px 0 0",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: 11,
          letterSpacing: "0.28em",
          textIndent: "0.28em",
          color: ACCENT,
        }}>
          OPTIMIZE. VISUALIZE. EVOLVE.
        </p>
      </div>

      {/* ── Bottom cluster ───────────────────────────────────────────
          Capability teaser + the canonical disclaimer. Both ride the same
          delayed fade so the splash resolves as one gesture. */}
      <div style={{
        position: "relative", zIndex: 1,
        marginTop: "auto", width: "100%", maxWidth: 480,
        // Bottom padding clears the FeedbackFAB, which is fixed at bottom/right 24
        // with a 48px face (so it owns the bottom ~72px of the viewport). Without
        // this the disclaimer's last lines render underneath it on a phone.
        padding: "0 20px 84px", boxSizing: "border-box",
        opacity: rowIn ? 1 : 0,
        transition: `opacity ${ROW_FADE_MS}ms ease`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {CAPABILITIES.map(({ label, icon: Icon }) => (
            <div key={label} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 9,
            }}>
              <Icon />
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9.5, fontWeight: 500,
                letterSpacing: "0.14em",
                textIndent: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.82)",
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <p style={{
          margin: "26px auto 0", maxWidth: 340,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 9.5, lineHeight: 1.65,
          color: "rgba(255,255,255,0.2)",
          textAlign: "center",
        }}>
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

// ── The mark ───────────────────────────────────────────────────────
// An OPEN delta: two strokes forming a triangle whose base is broken at the
// center. The gap is the doorway the corridor leads to — and it keeps the
// silhouette of the letter A that the wordmark below spells out.
function AlkiDelta() {
  return (
    <svg
      viewBox="0 0 100 88"
      width="104"
      height="92"
      fill="none"
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 22px ${ACCENT}59)`, display: "block", margin: "0 auto" }}
    >
      <path
        d="M50 7 L7 81 L37 81"
        stroke={ACCENT}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M63 81 L93 81 L50 7"
        stroke={ACCENT}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Capability icons ───────────────────────────────────────────────
// 24px stroke glyphs on a shared grid. `ACCENT` on every stroke; the label
// beneath carries the white.
const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: ACCENT,
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="20" y2="20" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M1.8 12S5.6 5.5 12 5.5 22.2 12 22.2 12 18.4 18.5 12 18.5 1.8 12 1.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg {...iconProps}>
      <path d="M13.5 2.5 4.5 13.8h6.2L10 21.5l9.2-11.4h-6.3l.6-7.6Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg {...iconProps}>
      <line x1="3.5" y1="12" x2="19.5" y2="12" />
      <polyline points="14,6.5 20,12 14,17.5" />
    </svg>
  );
}
