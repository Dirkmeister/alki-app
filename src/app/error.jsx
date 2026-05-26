"use client";

import { useEffect, useState } from "react";

// ── Top-level error boundary (Next.js App Router) ──────────────────
// Catches render-time throws anywhere in the app so a single bad render
// degrades to a recoverable card instead of a white screen. It also
// surfaces the actual error text + a copy button so a crash can be
// reported (see #47: a large ~10-compound stack crashed the committed
// home and could not be filed via the in-app button because the app
// was down). Note: error boundaries catch render/lifecycle throws, not
// infinite loops or GPU hangs.
export default function AppError({ error, reset }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[Alki] render crash caught by error boundary:", error);
  }, [error]);

  const detail = [
    error?.message || "Unknown error",
    error?.digest ? `digest: ${error.digest}` : null,
    error?.stack || null,
  ].filter(Boolean).join("\n\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(detail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em", fontFamily: "'Syne', sans-serif" }}>
          Something broke
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 20px" }}>
          The screen hit an error and stopped rendering. Your data is safe — nothing was lost. Try again, or reload the app.
        </p>

        <div style={{ textAlign: "left", background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,77,77,0.7)", marginBottom: 6 }}>Error detail</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "monospace", wordBreak: "break-word", maxHeight: 160, overflowY: "auto", lineHeight: 1.5 }}>
            {error?.message || "Unknown error"}
            {error?.digest ? ` (digest: ${error.digest})` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => reset()} style={{ width: "100%", padding: "13px 16px", borderRadius: 10, background: "#22d68a", border: "none", color: "#0a0a0a", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Try again
          </button>
          <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }} style={{ width: "100%", padding: "13px 16px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Reload app
          </button>
          <button onClick={copy} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, background: "transparent", border: "none", color: "rgba(34,214,138,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {copied ? "✓ Copied — paste it into the bug report" : "Copy error detail"}
          </button>
        </div>
      </div>
    </div>
  );
}
