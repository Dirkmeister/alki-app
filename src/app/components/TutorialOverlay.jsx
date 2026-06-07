"use client";
import { useState } from "react";
import { DISCLAIMER } from "../lib/disclaimer";

// Sprint 6.5 — first-run tutorial RENDERING shell.
//
// A light, full-screen interstitial: a short sequence of intro slides shown
// once on first run. Skippable at any point, replayable from Settings. This
// component holds NO copy of its own — every word comes from the `slides` prop
// (lib/tutorial.js, pure data) so the content ports to native untouched and
// this shell is the only piece a native build would rewrite.
//
// Mobile-first: sized in dvh, vertically scrollable on a narrow viewport, and
// padded for the safe-area inset (matches the Stage C mobile-shell fixes).
//
// Props:
//   slides   — array of { id, eyebrow, title, body[], showDisclaimer?, signoff? }
//   onClose  — called when the user finishes the last slide OR skips. The caller
//              is responsible for setting the "seen" flag; this shell is dumb.

const ACCENT = "#1ae87a";

export default function TutorialOverlay({ slides = [], onClose }) {
  const [i, setI] = useState(0);

  // Defensive: an empty slide set should never trap the user behind a blank
  // overlay — close immediately rather than render nothing dismissable.
  if (!slides.length) {
    onClose?.();
    return null;
  }

  const slide = slides[i];
  const isLast = i === slides.length - 1;
  const isFirst = i === 0;

  const next = () => { if (isLast) onClose?.(); else setI(i + 1); };
  const back = () => { if (!isFirst) setI(i - 1); };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Alki introduction"
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "#060608",
        // Scroll the whole panel on short viewports rather than clipping it.
        overflowY: "auto",
        display: "flex", flexDirection: "column",
        // Safe-area aware top/bottom so the skip + nav controls clear notches.
        padding: "max(20px, env(safe-area-inset-top)) 22px max(22px, env(safe-area-inset-bottom))",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        color: "#ededed",
      }}
    >
      {/* Atmospheric orb to match the splash mood (purely decorative). */}
      <div style={{ position: "absolute", top: "8%", left: "15%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,232,122,0.06) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />

      {/* ── Top bar: progress dots + always-visible Skip ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {slides.map((s, idx) => (
            <span key={s.id} style={{
              width: idx === i ? 22 : 7, height: 7, borderRadius: 100,
              background: idx === i ? ACCENT : "rgba(255,255,255,0.18)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>
        <button
          onClick={() => onClose?.()}
          style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.5)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            padding: "6px 4px",
          }}
        >
          Skip
        </button>
      </div>

      {/* ── Slide body (centered, scrolls if tall) ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        maxWidth: 440, width: "100%", margin: "0 auto", padding: "24px 0",
        position: "relative", zIndex: 1,
      }}>
        {slide.eyebrow && (
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
            color: ACCENT, marginBottom: 14, fontFamily: "'JetBrains Mono', monospace",
          }}>
            {slide.eyebrow}
          </div>
        )}
        <h2 style={{
          fontSize: 30, fontWeight: 800, margin: "0 0 18px", lineHeight: 1.12,
          fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em", color: "#fff",
        }}>
          {slide.title}
        </h2>
        {(slide.body || []).map((line, idx) => (
          <p key={idx} style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", margin: "0 0 14px" }}>
            {line}
          </p>
        ))}

        {slide.showDisclaimer && (
          <p style={{
            fontSize: 11, lineHeight: 1.7, color: "rgba(255,255,255,0.3)",
            marginTop: 8, fontFamily: "'DM Sans', sans-serif",
          }}>
            {DISCLAIMER}
          </p>
        )}

        {slide.signoff && (
          <p style={{ fontSize: 14, color: "rgba(26,232,122,0.45)", marginTop: 18, fontStyle: "italic", letterSpacing: "0.06em" }}>
            {slide.signoff}
          </p>
        )}
      </div>

      {/* ── Bottom nav: Back (hidden on first slide) + Next / Get started ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, maxWidth: 440, width: "100%", margin: "0 auto", position: "relative", zIndex: 1 }}>
        {!isFirst && (
          <button
            onClick={back}
            style={{
              flex: "0 0 auto", padding: "15px 22px", borderRadius: 14,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Syne', 'DM Sans', sans-serif",
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={next}
          style={{
            flex: 1, padding: "17px 24px", borderRadius: 14,
            background: ACCENT, color: "#060608", border: "none",
            fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em",
            fontFamily: "'Syne', 'DM Sans', sans-serif",
            boxShadow: "0 0 20px rgba(26,232,122,0.15), 0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {isLast ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );
}
