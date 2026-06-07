"use client";
import { useState } from "react";

// ── SLOT PURCHASE PROMPT ───────────────────────────────────────────────────
// Shown when a PRO user is at their Eidolon cap and taps "+ New Eidolon". They
// already have Pro, so the upgrade modal is wrong here — instead we offer the
// one-time $10 permanent-slot add-on. onBuy() starts Checkout (payment mode)
// and redirects to Stripe; on success the browser leaves and this unmounts.
// Free users at the cap get the regular UpgradePrompt instead (handled upstream).

const ACCENT = "#1ae87a";

export default function SlotPurchasePrompt({ onBuy, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onBuy();
      // Success → redirect to Stripe; component unmounts.
    } catch (e) {
      setError(e?.message || "Couldn't start checkout. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, background: "rgba(4,4,6,0.78)", backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        maxWidth: 360, width: "100%", margin: "0 auto",
        background: "#0e0e12", border: "1px solid rgba(26,232,122,0.25)",
        borderRadius: 18, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: ACCENT, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
          ✦ Add a slot
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>
          Add a permanent Eidolon slot
        </h2>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: "0 0 18px" }}>
          You're at your current Eidolon limit. Unlock one more permanent slot for a single $10 charge — it's yours for good, even if your subscription changes.
        </p>

        {error && (
          <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={buy}
          disabled={busy}
          style={{
            width: "100%", padding: "15px 18px", borderRadius: 14,
            cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
            background: "rgba(26,232,122,0.10)", border: "1.5px solid rgba(26,232,122,0.45)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Syne','DM Sans',sans-serif" }}>
            {busy ? "Redirecting to checkout…" : "Add a permanent slot"}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>$10</span>
        </button>

        <button
          onClick={onClose}
          disabled={busy}
          style={{ width: "100%", marginTop: 6, padding: "12px", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}
        >
          Maybe later
        </button>

        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.25)", lineHeight: 1.5, textAlign: "center", marginTop: 12, marginBottom: 0 }}>
          One-time charge. Secure checkout by Stripe.
        </p>
      </div>
    </div>
  );
}
