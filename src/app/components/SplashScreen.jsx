"use client";
import { useState, useEffect } from "react";
import { S } from "./appStyles";
import { DISCLAIMER } from "../lib/disclaimer";

// ─────────────────────────────────────────────────────────────
// App version — bump on every commit so testers can confirm which deploy
// they're viewing. Shown on the splash/enter screen (upper-left).
const APP_VERSION = "0.2.00";
// Auto build id from Vercel's git commit SHA (wired in next.config.mjs).
// Updates on every deploy with no manual bump; "dev" when running locally.
const BUILD_SHA = (process.env.NEXT_PUBLIC_COMMIT_SHA || "dev").slice(0, 7);

export default function SplashScreen({ onEnter }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150);
    const t2 = setTimeout(() => setPhase(2), 500);
    const t3 = setTimeout(() => setPhase(3), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ ...S.inner, justifyContent: "safe center", alignItems: "center", textAlign: "center", position: "relative" }}>
      {/* Build version — upper-left, bumped each commit */}
      <div style={{ position: "absolute", top: 16, left: 16, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em", zIndex: 2 }}>
        v{APP_VERSION} · {BUILD_SHA}
      </div>
      {/* Atmospheric gradient orbs */}
      <div style={{ position: "absolute", top: "10%", left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,232,122,0.06) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none", opacity: phase >= 1 ? 1 : 0, transition: "opacity 1.5s ease" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(26,120,232,0.04) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none", opacity: phase >= 2 ? 1 : 0, transition: "opacity 1.5s ease" }} />

      <div style={{ marginBottom: 56, opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Greek text */}
        <div style={{
          fontSize: 11,
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.18)",
          marginBottom: 20,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 400
        }}>ἀλκή</div>

        {/* Logo mark */}
        <h1 style={{
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          margin: 0,
          lineHeight: 0.9,
          fontFamily: "'Syne', sans-serif"
        }}>
          <span style={{ color: "#fff" }}>AL</span>
          <span style={{
            color: S.accent,
            textShadow: "0 0 40px rgba(26,232,122,0.3), 0 0 80px rgba(26,232,122,0.1)"
          }}>KI</span>
        </h1>

        {/* Decorative line */}
        <div style={{
          width: 48,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(26,232,122,0.4), transparent)",
          margin: "20px auto",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "scaleX(1)" : "scaleX(0)",
          transition: "all 0.6s ease 0.2s"
        }} />

        <p style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 500,
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.6s ease 0.3s"
        }}>
          Peptide Intelligence
        </p>

        <p style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.15)",
          marginTop: 10,
          letterSpacing: "0.06em",
          fontFamily: "'DM Sans', sans-serif",
          fontStyle: "italic",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.6s ease 0.5s"
        }}>
          εἰδωλον · Your Eidolon Awaits
        </p>
      </div>

      <div style={{
        width: "100%",
        maxWidth: 300,
        opacity: phase >= 3 ? 1 : 0,
        transform: phase >= 3 ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)"
      }}>
        <button
          style={S.btn}
          onClick={onEnter}
          onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 0 30px rgba(26,232,122,0.25), 0 4px 12px rgba(0,0,0,0.4)"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = S.btn.boxShadow; }}
        >
          Enter Platform
        </button>
        <p style={{ ...S.disclaimer, marginTop: 24, maxWidth: 280, margin: "24px auto 0", fontSize: 10, lineHeight: 1.7 }}>
          {DISCLAIMER}
        </p>
        <p style={{ fontSize: 11, color: "rgba(26,232,122,0.3)", marginTop: 14, fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", letterSpacing: "0.06em" }}>
          Happy Researching.
        </p>
      </div>
    </div>
  );
}
