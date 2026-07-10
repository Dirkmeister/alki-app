"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// ── Floating bug-report button for dev/testing ─────────────
// Always visible. Stores to Supabase `feedback` table with
// auto-captured metadata (screen, device, user). Falls back to
// localStorage if Supabase is unavailable.

const CATEGORIES = [
  { id: "bug",        label: "Bug",        icon: "🐛", desc: "Something is broken" },
  { id: "pain_point", label: "Pain Point",  icon: "😤", desc: "Works but feels wrong" },
  { id: "idea",       label: "Idea",        icon: "💡", desc: "Feature or improvement" },
];

// `bottomOffset` lifts the FAB clear of anything else pinned to the bottom
// edge (currently the tab bar, which the FAB would otherwise cover — it
// outranks the nav at z-index 900).
export default function FeedbackFAB({ currentScreen, userEmail, bottomOffset = 0 }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async () => {
    const text = description.trim();
    if (!text) return;
    setSubmitting(true);

    const report = {
      category,
      description: text,
      screen: currentScreen || "unknown",
      user_email: userEmail || "anonymous",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      viewport_width: typeof window !== "undefined" ? window.innerWidth : null,
      viewport_height: typeof window !== "undefined" ? window.innerHeight : null,
      created_at: new Date().toISOString(),
    };

    let saved = false;
    if (supabase) {
      try {
        const { error } = await supabase.from("feedback").insert([report]);
        if (!error) saved = true;
        else console.error("Feedback save error:", error);
      } catch (e) {
        console.error("Feedback save error:", e);
      }
    }

    // Fallback: localStorage
    if (!saved) {
      try {
        const existing = JSON.parse(localStorage.getItem("alki_feedback") || "[]");
        existing.push(report);
        localStorage.setItem("alki_feedback", JSON.stringify(existing));
        saved = true;
      } catch (_) {}
    }

    setSubmitting(false);
    setDescription("");
    setCategory("bug");
    setOpen(false);
    setToast(saved ? "Report saved ✓" : "Failed to save — try again");
  };

  const accent = "#22D68A";

  return (
    <>
      {/* ── FAB ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 24 + bottomOffset,
            right: 24,
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 900,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            transition: "transform 0.15s ease, background 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "scale(1)"; }}
          title="Report a bug or feedback"
        >
          🐛
        </button>
      )}

      {/* ── Modal ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 950,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "20px 16px",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 400,
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "22px 20px 18px",
              marginBottom: 8,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>
                Report Feedback
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Auto-captured context chip */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              marginBottom: 14,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span>📍 {currentScreen || "—"}</span>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
              <span>{userEmail || "anon"}</span>
            </div>

            {/* Category selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {CATEGORIES.map(cat => {
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: 10,
                      background: active ? "rgba(34,214,138,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${active ? accent : "rgba(255,255,255,0.08)"}`,
                      color: active ? "#fff" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{cat.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{cat.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Description */}
            <textarea
              autoFocus
              placeholder="What happened? What did you expect?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 14,
                lineHeight: 1.5,
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(34,214,138,0.3)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || submitting}
              style={{
                width: "100%",
                padding: "14px 20px",
                background: !description.trim() || submitting ? "rgba(34,214,138,0.15)" : accent,
                color: !description.trim() || submitting ? "rgba(255,255,255,0.3)" : "#000000",
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: !description.trim() || submitting ? "not-allowed" : "pointer",
                fontFamily: "'Syne', 'DM Sans', sans-serif",
                letterSpacing: "0.02em",
                transition: "all 0.15s ease",
              }}
            >
              {submitting ? "Sending..." : "Submit Report"}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 84,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "10px 20px",
          borderRadius: 10,
          background: "rgba(34,214,138,0.15)",
          border: "1px solid rgba(34,214,138,0.25)",
          color: accent,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 960,
          pointerEvents: "none",
          animation: "fadeInUp 0.25s ease",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
