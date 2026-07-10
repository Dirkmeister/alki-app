"use client";
import { useState, useEffect } from "react";
import { S } from "./appStyles";

export default function AgeGate({ onConfirm, onDeny }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{ ...S.inner, justifyContent: "safe center", alignItems: "center", textAlign: "center", opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)", transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ marginBottom: 44 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "rgba(34,214,138,0.06)",
          border: "1px solid rgba(34,214,138,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 30,
          boxShadow: "0 0 30px rgba(34,214,138,0.06)"
        }}>
          🔒
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Age Verification</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 14, lineHeight: 1.7, maxWidth: 300, margin: "14px auto 0" }}>
          Alki is designed exclusively for adults aged 18 and older. By continuing, you confirm that you are at least 18 years of age.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 300 }}>
        <button
          style={S.btn}
          onClick={onConfirm}
          onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 0 30px rgba(34,214,138,0.25), 0 4px 12px rgba(0,0,0,0.4)"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = S.btn.boxShadow; }}
        >
          I am 18 or older
        </button>
        <button
          style={{ ...S.btnOutline, marginTop: 12 }}
          onClick={onDeny}
        >
          I am under 18
        </button>
      </div>
    </div>
  );
}
