"use client";
import { useEffect, useRef, useState } from "react";
import { AVATURN_ENABLED, AVATURN_URL } from "./avaturnConfig";

/**
 * AvaturnCapture — Embeds the Avaturn iframe to capture a user's
 * selfie and return a rigged 3D avatar GLB.
 *
 * Flow:
 *   1. User taps "Create My Avatar" on dashboard
 *   2. This screen mounts the Avaturn SDK in an iframe
 *   3. User snaps a selfie inside the iframe and customizes
 *   4. Avaturn emits an "export" event with a GLB URL
 *   5. We bubble that URL up via onAvatarCreated(url)
 *
 * Until AVATURN_SUBDOMAIN is set in avaturnConfig.js, this
 * screen shows a setup notice instead of trying to load the
 * demo iframe (the demo subdomain triggers third-party CORS
 * issues from custom domains and isn't a useful sandbox).
 */
export default function AvaturnCapture({ onAvatarCreated, onCancel }) {
  const containerRef = useRef(null);
  const sdkRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error | disabled
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!AVATURN_ENABLED) {
      setStatus("disabled");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import so SSR builds don't try to bundle a browser SDK
        const mod = await import("@avaturn/sdk");
        if (cancelled) return;

        const AvaturnSDK = mod.AvaturnSDK || mod.default;
        if (!AvaturnSDK) {
          throw new Error("Avaturn SDK module did not expose AvaturnSDK");
        }

        const sdk = new AvaturnSDK();
        sdkRef.current = sdk;

        await sdk.init(containerRef.current, {
          url: AVATURN_URL,
          iframeClassName: "alki-avaturn-iframe",
        });

        if (cancelled) return;

        sdk.on("export", (data) => {
          // data.url is the GLB; data also includes avatarId, ARKit blendshape info, etc.
          const glbUrl = data?.url || data?.avatarUrl || data?.glb;
          if (glbUrl) {
            onAvatarCreated(glbUrl);
          } else {
            setErrorMsg("Avaturn returned no avatar URL. Try again.");
            setStatus("error");
          }
        });

        setStatus("ready");
      } catch (err) {
        console.error("[AvaturnCapture] init failed:", err);
        if (!cancelled) {
          setErrorMsg(err?.message || "Failed to load avatar SDK.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      try { sdkRef.current?.destroy?.(); } catch (_) {}
    };
  }, [onAvatarCreated]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0a0a0a",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
            Step 1 of 1
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: "#fff" }}>
            Create Your Avatar
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {status === "disabled" && <SetupNotice onCancel={onCancel} />}
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={errorMsg} onCancel={onCancel} />}

        {/* Always-present container; SDK mounts into it when enabled */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            display: AVATURN_ENABLED && status !== "error" ? "block" : "none",
          }}
        />
        <style jsx global>{`
          .alki-avaturn-iframe {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            display: block !important;
          }
        `}</style>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={centerStyle}>
      <div style={{ fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
        Loading avatar studio...
      </div>
    </div>
  );
}

function ErrorState({ message, onCancel }) {
  return (
    <div style={centerStyle}>
      <div style={{ maxWidth: 320, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 14 }}>⚠</div>
        <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Avatar studio unavailable</h3>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
          {message}
        </p>
        <button
          onClick={onCancel}
          style={{
            marginTop: 20,
            padding: "12px 22px",
            background: "#22d68a",
            color: "#0a0a0a",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

function SetupNotice({ onCancel }) {
  return (
    <div style={centerStyle}>
      <div style={{ maxWidth: 360, textAlign: "center" }}>
        <div style={{
          width: 60, height: 60, borderRadius: 14,
          background: "rgba(34,214,138,0.1)",
          border: "1px solid rgba(34,214,138,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px", fontSize: 26,
        }}>
          🧬
        </div>
        <h3 style={{ color: "#fff", fontSize: 19, fontWeight: 700, margin: 0 }}>Avatar capture setup required</h3>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
          To enable photoreal avatar capture, sign up for a free Avaturn developer account at{" "}
          <span style={{ color: "#22d68a" }}>developer.avaturn.me</span>, then paste your subdomain into{" "}
          <code style={{ background: "rgba(255,255,255,0.07)", padding: "2px 6px", borderRadius: 4, color: "#e8e8e8", fontSize: 12 }}>
            src/app/avaturnConfig.js
          </code>.
        </p>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 1.6, marginTop: 14 }}>
          Until then, the app uses a parametric 3D humanoid driven by your biometrics.
        </p>
        <button
          onClick={onCancel}
          style={{
            marginTop: 22,
            padding: "12px 24px",
            background: "#22d68a",
            color: "#0a0a0a",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Continue with default avatar
        </button>
      </div>
    </div>
  );
}

const centerStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};
