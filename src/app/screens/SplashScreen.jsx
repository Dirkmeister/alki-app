"use client";
import { useState, useEffect } from "react";
import { S } from "../styles/theme";

export default function SplashScreen({ onEnter }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{ ...S.inner, justifyContent: "center", alignItems: "center", textAlign: "center", opacity: show ? 1 : 0, transition: "opacity 0.8s ease" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>ἀλκή</div>
        <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, lineHeight: 1 }}>
          <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 12, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Peptide Intelligence Platform
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 320 }}>
        <button style={S.btn} onClick={onEnter}>
          Enter Platform
        </button>
        <p style={{ ...S.disclaimer, marginTop: 20, maxWidth: 280, margin: "20px auto 0" }}>
          For informational and research purposes only. Not medical advice. Consult a licensed physician before initiating any peptide protocol.
        </p>
      </div>
    </div>
  );
}
