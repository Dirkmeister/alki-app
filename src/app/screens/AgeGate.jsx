"use client";
import { S } from "../styles/theme";

export function AgeGate({ onConfirm, onDeny }) {
  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(34,214,138,0.1)", border: `1px solid ${S.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>
          🔒
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Age Verification</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>
          Alki is designed exclusively for adults aged 18 and older. By continuing, you confirm that you are at least 18 years of age.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 320 }}>
        <button style={S.btn} onClick={onConfirm}>
          I am 18 or older
        </button>
        <button style={{ ...S.btnOutline, marginTop: 12 }} onClick={onDeny}>
          I am under 18
        </button>
      </div>
    </div>
  );
}

export function AgeBlocked() {
  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700 }}>Access Restricted</h2>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 12, maxWidth: 300 }}>
        Alki is not available to individuals under 18 years of age. This restriction is non-negotiable.
      </p>
    </div>
  );
}
