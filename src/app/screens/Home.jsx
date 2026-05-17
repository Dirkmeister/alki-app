"use client";
import { useMemo } from "react";
import { COMPOUNDS } from "../data/compounds";
import BodyAvatar from "../components/BodyAvatar";
import Body3DAvatar from "../Body3DAvatar";
import { getCultivationVisuals, getRegressionFactor } from "../lib/cultivation";

// ═══════════════════════════════════════════════════════════
// ALKI — Home Screen (Daily View)
// Clean, focused: Eidolon + protocol + cultivation + log
// ═══════════════════════════════════════════════════════════

const S = {
  inner: { maxWidth: 480, margin: "0 auto", padding: "0 20px", minHeight: "100vh", display: "flex", flexDirection: "column" },
  accent: "#22d68a",
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 12 },
  btn: { width: "100%", padding: "16px 24px", background: "#22d68a", color: "#0a0a0a", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em", fontFamily: "inherit" },
  btnOutline: { width: "100%", padding: "14px 24px", background: "transparent", color: "#22d68a", border: "2px solid rgba(34,214,138,0.3)", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  label: { fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 8, display: "block" },
  disclaimer: { fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, textAlign: "center", padding: "16px 0" }
};

function resolveAvatarParams(profile, compoundIds = []) {
  const bf = profile.bodyFat;
  const isMale = profile.sex === "male";
  const baseFat = Math.max(0, Math.min(1, (bf - 6) / 34));
  const baseMuscle = isMale ? 0.5 : 0.35;
  let fatMod = 0, muscleMod = 0, skinMod = 0;
  for (const cid of compoundIds) {
    const c = COMPOUNDS.find(x => x.id === cid);
    if (c) { fatMod += c.effects.bf / 100; muscleMod += c.effects.muscle / 100; skinMod += c.effects.skin; }
  }
  return {
    current: { fat: baseFat, muscle: baseMuscle, skin: 0, isMale },
    projected: { fat: Math.max(0, Math.min(1, baseFat + fatMod)), muscle: Math.max(0, Math.min(1, baseMuscle + muscleMod)), skin: skinMod, isMale }
  };
}

export default function Home({ profile, activeProtocol, cultivationState, avatarUrl, onProgress, onModify, onNewEidolon, onSignOut, userEmail }) {
  const compounds = activeProtocol?.compounds || [];
  const avatarParams = useMemo(() => resolveAvatarParams(profile, compounds), [profile, compounds]);
  const cv = getCultivationVisuals(cultivationState?.state || "new");
  const regression = getRegressionFactor(cultivationState || { state: "new" });

  // Blend avatar toward baseline based on regression
  const displayParams = useMemo(() => {
    if (regression <= 0) return avatarParams.projected;
    const p = avatarParams.projected;
    const c = avatarParams.current;
    return {
      fat: c.fat + (p.fat - c.fat) * (1 - regression),
      muscle: c.muscle + (p.muscle - c.muscle) * (1 - regression),
      skin: p.skin * (1 - regression),
      isMale: p.isMale
    };
  }, [avatarParams, regression]);

  const lockedDate = activeProtocol?.lockedAt ? new Date(activeProtocol.lockedAt) : null;
  const daysSinceLock = lockedDate ? Math.floor((Date.now() - lockedDate) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div style={S.inner}>
      {/* Header */}
      <div style={{ padding: "16px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
          <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
        </span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {userEmail && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{userEmail}</span>
          )}
          {onSignOut && (
            <button onClick={onSignOut} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Eidolon — large, centered */}
      <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>εἰδωλον</div>
        <div style={{ maxWidth: 200, margin: "0 auto" }}>
          {avatarUrl ? (
            <Body3DAvatar avatarUrl={avatarUrl} params={displayParams} label="" size="large" interactive={true} glow={cultivationState?.state === "progressing"} />
          ) : (
            <BodyAvatar params={displayParams} label="" glow={cultivationState?.state === "progressing"} />
          )}
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20, marginTop: 12,
          background: cv.statusBg, border: `1px solid ${cv.statusBorder}`
        }}>
          <span style={{ color: cv.statusColor, fontSize: 12 }}>{cv.statusIcon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: cv.statusColor }}>{cv.statusLabel}</span>
          {cultivationState?.streak > 0 && (
            <span style={{ fontSize: 11, color: cv.statusColor, opacity: 0.7 }}>· {cultivationState.streak}w streak</span>
          )}
        </div>
      </div>

      {/* Active Protocol Card */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={S.label}>Active Research Protocol</div>
          {lockedDate && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
              {daysSinceLock === 0 ? "Locked today" : `${daysSinceLock}d active`}
            </div>
          )}
        </div>
        {compounds.map(id => {
          const c = COMPOUNDS.find(x => x.id === id);
          if (!c) return null;
          const catColors = {
            Recovery: "#3b82f6", "Growth Hormone": "#a855f7", "Fat Loss": "#f59e0b",
            "Weight Loss": "#ef4444", "Anti-Aging": "#ec4899", Performance: "#06b6d4",
            SARM: "#ea580c", Nootropic: "#6366f1", "Cycle Support": "#10b981",
            Metabolic: "#eab308", Hormonal: "#f43f5e", "Hair Support": "#14b8a6"
          };
          const catColor = catColors[c.category] || "#888";
          return (
            <div key={id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{c.name}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: `${catColor}15`, color: catColor, fontWeight: 600, marginLeft: 8 }}>{c.category}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "right", maxWidth: 140 }}>{c.dosing}</div>
            </div>
          );
        })}
        {compounds.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: "8px 0" }}>
            No protocol locked yet.
          </div>
        )}
      </div>

      {/* Cultivation Banner — clickable → progress log */}
      <div
        onClick={onProgress}
        style={{
          ...S.card,
          borderColor: cv.statusBorder,
          background: cv.statusBg,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>
            {cultivationState?.state === "new" && "Log your first check-in to activate your Eidolon"}
            {cultivationState?.state === "progressing" && `Last logged ${cultivationState.daysSinceLog === 0 ? "today" : `${cultivationState.daysSinceLog}d ago`} · Keep the streak`}
            {cultivationState?.state === "stagnant" && `${cultivationState.daysSinceLog} days since last log · Your Eidolon is frozen`}
            {cultivationState?.state === "regressing" && `${cultivationState.daysSinceLog} days without a log · Projected gains are fading`}
          </div>
          <div style={{ fontSize: 11, color: cv.statusColor }}>
            Tap to log research check-in →
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <button onClick={onProgress} style={{ ...S.btn, marginBottom: 12 }}>
        Log Research Check-in
      </button>

      {/* Secondary actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button onClick={onModify} style={{ ...S.btnOutline, flex: 1, fontSize: 13, padding: "12px 16px" }}>
          Modify Protocol
        </button>
        <button onClick={onNewEidolon} style={{ ...S.btnOutline, flex: 1, fontSize: 13, padding: "12px 16px", color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.12)" }}>
          New Eidolon
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "auto" }}>
        <p style={S.disclaimer}>
          All information is for research and educational purposes only. Consult a licensed healthcare provider before initiating any protocol.
        </p>
        <p style={{ fontSize: 12, color: "rgba(34,214,138,0.3)", textAlign: "center", paddingBottom: 32, fontStyle: "italic", letterSpacing: "0.06em" }}>
          Alki · ἀλκή · Happy Researching.
        </p>
      </div>
    </div>
  );
}
