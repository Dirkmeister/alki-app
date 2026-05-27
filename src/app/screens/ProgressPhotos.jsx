"use client";

/**
 * ALKI — PROGRESS PHOTOS (Plan E)
 * ────────────────────────────────────────────────────────────
 * UI scaffolding for progress-photo tracking. Capture/upload via the native
 * file picker (camera on mobile), view a date-sorted gallery, tap for full size.
 *
 * SCAFFOLDING ONLY — photos live in AlkiApp state for the session and are NOT
 * persisted (Supabase Storage wiring is a future task). The notice makes this
 * explicit to the user. No CV/avatar generation here.
 * ────────────────────────────────────────────────────────────
 */

import { useRef, useState } from "react";

const T = {
  text: "#e8e8e8", text2: "rgba(255,255,255,0.6)", text3: "rgba(255,255,255,0.38)",
  faint: "rgba(255,255,255,0.25)", surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.12)",
  accent: "#22d68a", accentDim: "rgba(34,214,138,0.10)", accentBorder: "rgba(34,214,138,0.25)",
  warn: "#f0a848", danger: "#ff6b6b",
};
const FONT = "'DM Sans', 'Helvetica Neue', sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

function fmt(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

export default function ProgressPhotos({ photos = [], eidolonName = "Eidolon", onCapture, onDelete, onBack }) {
  const fileRef = useRef(null);
  const [viewing, setViewing] = useState(null);

  const sorted = [...photos].sort((a, b) => b.ts - a.ts);

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapture && onCapture(reader.result);
    reader.readAsDataURL(file);
    e.target.value = ""; // let the same file be picked again
  };

  const container = {
    maxWidth: 480, margin: "0 auto", padding: "20px 20px 48px", minHeight: "100vh",
    boxSizing: "border-box", color: T.text, fontFamily: FONT,
  };

  return (
    <div style={container}>
      <button onClick={onBack} style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: FONT, marginBottom: 16 }}>← Back</button>

      <div style={{ fontSize: 10, fontFamily: MONO, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: T.accent, marginBottom: 4 }}>Progress Photos</div>
      <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: T.text, fontFamily: FONT, lineHeight: 1.15 }}>
        {eidolonName}
      </h1>
      <div style={{ fontSize: 13, color: T.text3, marginBottom: 18 }}>
        {sorted.length} photo{sorted.length !== 1 ? "s" : ""} this session
      </div>

      {/* Hidden native input — camera on mobile, file picker on desktop */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <button
        onClick={() => fileRef.current && fileRef.current.click()}
        style={{
          width: "100%", padding: "15px", borderRadius: 14, cursor: "pointer", fontFamily: FONT,
          fontSize: 15, fontWeight: 700, color: "#06210f", background: T.accent, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
        }}
      >
        📷 Take / Upload Photo
      </button>

      {/* Session-only notice */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(240,168,72,0.07)", border: "1px solid rgba(240,168,72,0.25)", borderRadius: 10, padding: "10px 12px", marginBottom: 20 }}>
        <span style={{ fontSize: 13 }}>⚠️</span>
        <span style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>
          Photos are <strong style={{ color: T.warn }}>not saved between sessions</strong> yet — they stay only while the app is open. Cloud storage is coming.
        </span>
      </div>

      {/* Gallery */}
      {sorted.length === 0 ? (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🖼️</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No photos yet</div>
          <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>Take or upload your first progress photo to start tracking your transformation.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {sorted.map((p) => (
            <button
              key={p.id}
              onClick={() => setViewing(p)}
              style={{ position: "relative", aspectRatio: "1 / 1", padding: 0, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: T.surface }}
            >
              <img src={p.dataUrl} alt={`Progress ${fmt(p.ts)}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "3px 6px", fontSize: 9, fontFamily: MONO, color: "#fff", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", textAlign: "left" }}>{fmt(p.ts)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Full-size viewer */}
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={viewing.dataUrl} alt="Progress full size" style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 12, objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
          <div style={{ marginTop: 14, fontSize: 13, color: T.text2, fontFamily: MONO }}>{fmt(viewing.ts)} · {eidolonName}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { onDelete && onDelete(viewing.id); setViewing(null); }} style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: T.danger, fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontFamily: FONT }}>Delete</button>
            <button onClick={() => setViewing(null)} style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontFamily: FONT }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
