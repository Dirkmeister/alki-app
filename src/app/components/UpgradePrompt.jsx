"use client";
import { useState } from "react";
import { PRO_PRICING, PRO_FEATURES } from "../lib/subscription";

// ── UPGRADE PROMPT — the one paywall surface ───────────────────────────────
// A single, consistent Pro upgrade component used everywhere a free user hits a
// gate (CLAUDE.md / Sprint 7: "do not scatter ad-hoc checks"). Two variants:
//   • "modal"  — full-screen overlay (Dashboard gates open this)
//   • "inline" — a card embedded in a page (Settings → Subscription)
// Shows both prices with annual marked best value, and drives checkout via the
// passed onSubscribe(tier) handler (which redirects to Stripe Checkout).

const ACCENT = "#1ae87a";

function PlanButton({ plan, onPick, busy, pickedTier }) {
  const isPicked = pickedTier === plan.tier;
  const best = !!plan.bestValue;
  return (
    <button
      onClick={() => onPick(plan.tier)}
      disabled={busy}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "left",
        padding: "16px 18px",
        marginBottom: 10,
        borderRadius: 14,
        cursor: busy ? "wait" : "pointer",
        fontFamily: "inherit",
        background: best ? "rgba(26,232,122,0.10)" : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${best ? "rgba(26,232,122,0.45)" : "rgba(255,255,255,0.12)"}`,
        opacity: busy && !isPicked ? 0.5 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      {best && (
        <span style={{
          position: "absolute", top: -9, right: 14,
          fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#060608", background: ACCENT, borderRadius: 100, padding: "3px 9px",
          fontFamily: "'JetBrains Mono', monospace",
        }}>Best value</span>
      )}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Syne','DM Sans',sans-serif" }}>
          {plan.tier === "annual" ? "Annual" : "Monthly"}
        </span>
        <span style={{ fontSize: 20, fontWeight: 800, color: best ? ACCENT : "#fff", fontVariantNumeric: "tabular-nums" }}>
          {plan.price}<span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{plan.cadence}</span>
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
        {isPicked && busy ? "Redirecting to secure checkout…" : plan.blurb}
      </div>
    </button>
  );
}

export default function UpgradePrompt({
  featureKey = null,
  variant = "modal",
  onSubscribe,
  onClose = null,
  heading = "Unlock Alki Pro",
}) {
  const [busy, setBusy] = useState(false);
  const [pickedTier, setPickedTier] = useState(null);
  const [error, setError] = useState(null);

  const feature = featureKey ? PRO_FEATURES[featureKey] : null;

  const pick = async (tier) => {
    if (busy) return;
    setBusy(true);
    setPickedTier(tier);
    setError(null);
    try {
      await onSubscribe(tier);
      // On success the browser navigates to Stripe — this component unmounts.
    } catch (e) {
      setError(e?.message || "Couldn't start checkout. Please try again.");
      setBusy(false);
      setPickedTier(null);
    }
  };

  const card = (
    <div style={{
      maxWidth: 380, width: "100%", margin: "0 auto",
      background: variant === "modal" ? "#0e0e12" : "rgba(255,255,255,0.04)",
      border: "1px solid rgba(26,232,122,0.25)",
      borderRadius: 18, padding: 24,
      boxShadow: variant === "modal" ? "0 20px 60px rgba(0,0,0,0.6)" : "none",
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: ACCENT, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
        ✦ Alki Pro
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>
        {feature ? feature.title : heading}
      </h2>
      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: "0 0 18px" }}>
        {feature ? feature.blurb : "Unlock the full Eidolon: your projected transformation, 3D avatar, protocol guide, progress tracking, and cycle timeline."}
      </p>

      {error && (
        <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <PlanButton plan={PRO_PRICING.annual} onPick={pick} busy={busy} pickedTier={pickedTier} />
      <PlanButton plan={PRO_PRICING.monthly} onPick={pick} busy={busy} pickedTier={pickedTier} />

      {onClose && (
        <button
          onClick={onClose}
          disabled={busy}
          style={{ width: "100%", marginTop: 6, padding: "12px", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}
        >
          Maybe later
        </button>
      )}

      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.25)", lineHeight: 1.5, textAlign: "center", marginTop: 12, marginBottom: 0 }}>
        Secure checkout by Stripe. Cancel anytime from Settings.
      </p>
    </div>
  );

  if (variant === "inline") return card;

  // Modal overlay
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && onClose && !busy) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        background: "rgba(4,4,6,0.78)", backdropFilter: "blur(4px)",
      }}
    >
      {card}
    </div>
  );
}
