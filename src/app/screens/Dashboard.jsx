"use client";
import { useState, useEffect, useMemo } from "react";
import { S } from "../styles/theme";
import { GOALS } from "../data/goals";
import { COMPOUNDS } from "../data/compounds";
import { getRecommendations } from "../lib/recommendations";
import { resolveAvatarParams } from "../lib/avatar";
import BodyAvatar from "../components/BodyAvatar";
import CompoundCard from "../components/CompoundCard";
import StackIntelligence, { analyzeStack } from "../StackIntelligence";

export default function Dashboard({ profile, onReset }) {
  const [selectedCompounds, setSelectedCompounds] = useState([]);
  const [showTransform, setShowTransform] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const recommendations = useMemo(() => getRecommendations(profile), [profile]);
  const stackAnalysis = useMemo(() => analyzeStack(selectedCompounds, profile), [selectedCompounds, profile]);

  useEffect(() => { setTimeout(() => setAnimateIn(true), 100); }, []);

  const toggleCompound = (id) => {
    setSelectedCompounds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setShowTransform(false);
  };

  const avatarParams = resolveAvatarParams(profile, selectedCompounds);

  const projectedChanges = useMemo(() => {
    let bfChange = 0;
    const muscleNote = [];
    for (const cid of selectedCompounds) {
      const c = COMPOUNDS.find(x => x.id === cid);
      if (c) {
        bfChange += c.effects.bf;
        if (c.effects.muscle > 1) muscleNote.push(`+${c.effects.muscle}% lean mass`);
        if (c.effects.muscle < 0) muscleNote.push(`${c.effects.muscle}% lean mass risk`);
      }
    }
    return { bfChange, muscleNote, timeline: 12 };
  }, [selectedCompounds]);

  const recommended = recommendations.filter(r => !r.blocked);
  const blocked = recommendations.filter(r => r.blocked);

  // ── TRANSFORM SCREEN ──────────────────────────────────────
  // Full StackIntelligence analysis lives here, not on the dashboard
  if (showTransform) {
    return (
      <div style={S.inner}>
        <div style={{ padding: "16px 0 8px" }}>
          <button onClick={() => setShowTransform(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            ← Back to Compounds
          </button>
        </div>

        <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Projected Transformation</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6 }}>
            {projectedChanges.timeline}-week projection based on selected stack
          </p>
        </div>

        {/* Before / After avatars */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "flex-end", padding: "10px 0 20px" }}>
          <div style={{ flex: 1, maxWidth: 180 }}>
            <BodyAvatar params={avatarParams.current} label="Current" />
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.15)", paddingBottom: 40 }}>→</div>
          <div style={{ flex: 1, maxWidth: 180 }}>
            <BodyAvatar params={avatarParams.projected} label="Projected" glow={true} />
          </div>
        </div>

        {/* Projected outcome stats */}
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 12 }}>Projected Outcomes</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.04)", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: projectedChanges.bfChange < 0 ? "#22d68a" : "#fff" }}>
                {projectedChanges.bfChange > 0 ? "+" : ""}{projectedChanges.bfChange}%
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Body Fat Change</div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.04)", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
                {profile.bodyFat + projectedChanges.bfChange}%
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Projected BF%</div>
            </div>
          </div>
          {projectedChanges.muscleNote.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              {projectedChanges.muscleNote.join("; ")}
            </div>
          )}
        </div>

        {/* Selected stack summary */}
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom: 10 }}>Selected Stack</div>
          {selectedCompounds.map(id => {
            const c = COMPOUNDS.find(x => x.id === id);
            return (
              <div key={id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: 8, fontSize: 12 }}>{c.dosing}</span>
              </div>
            );
          })}
        </div>

        {/* Full stack intelligence — only shown here on the transform screen */}
        <StackIntelligence
          stackIds={selectedCompounds}
          userProfile={profile}
          onRemoveCompound={(id) => { toggleCompound(id); setShowTransform(false); }}
          mode="full"
        />

        <p style={S.disclaimer}>
          Projections are estimates based on published research data and population averages. Individual results vary significantly based on genetics, training, nutrition, and adherence. This is not medical advice.
        </p>
      </div>
    );
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────
  return (
    <div style={{ ...S.inner, opacity: animateIn ? 1 : 0, transition: "opacity 0.6s ease" }}>
      <div style={{ padding: "16px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
          <span style={{ color: "#fff" }}>AL</span><span style={{ color: S.accent }}>KI</span>
        </span>
        <button onClick={onReset} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Reset
        </button>
      </div>

      {/* Profile summary */}
      <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 80, flexShrink: 0 }}>
          <BodyAvatar params={avatarParams.current} label="" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Your Profile</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
            {profile.sex === "male" ? "Male" : "Female"} · {profile.age} yrs · {profile.heightFt}'{profile.heightIn}" · {profile.weight} lbs<br />
            Body fat: <span style={{ color: "#fff", fontWeight: 600 }}>{profile.bodyFat}%</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {profile.goals.map(g => {
              const goal = GOALS.find(x => x.id === g);
              return (
                <span key={g} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: "rgba(34,214,138,0.1)", color: S.accent }}>
                  {goal?.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transform CTA — only visible when compounds are selected */}
      {selectedCompounds.length > 0 && (
        <button
          onClick={() => !stackAnalysis.isBlocked && setShowTransform(true)}
          disabled={stackAnalysis.isBlocked}
          style={{
            ...S.btn,
            ...(stackAnalysis.isBlocked ? S.btnDisabled : {}),
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          {stackAnalysis.isBlocked
            ? "Resolve Contraindications to Continue"
            : `View Transformation (${selectedCompounds.length} compound${selectedCompounds.length > 1 ? "s" : ""}) →`}
        </button>
      )}

      {/* Compact mode: only contraindication banners on the dashboard */}
      <StackIntelligence
        stackIds={selectedCompounds}
        userProfile={profile}
        onRemoveCompound={toggleCompound}
        mode="compact"
      />

      {/* Compound list */}
      <div style={{ ...S.label, marginBottom: 12, marginTop: 8 }}>
        Recommended for You — {recommended.length} compounds
      </div>
      {recommended.map(rec => (
        <CompoundCard
          key={rec.compound.id}
          rec={rec}
          isSelected={selectedCompounds.includes(rec.compound.id)}
          onToggle={() => toggleCompound(rec.compound.id)}
        />
      ))}

      {blocked.length > 0 && (
        <>
          <div style={{ ...S.label, marginBottom: 12, marginTop: 20, color: "rgba(255,255,255,0.25)" }}>
            Not Recommended at Your Profile
          </div>
          {blocked.map(rec => (
            <CompoundCard
              key={rec.compound.id}
              rec={rec}
              isSelected={false}
              onToggle={() => {}}
            />
          ))}
        </>
      )}

      <p style={{ ...S.disclaimer, paddingBottom: 32 }}>
        All information is for research and educational purposes only. Nothing on this platform constitutes medical advice. Consult a licensed healthcare provider before initiating any peptide protocol. Alki assumes no liability for user decisions.
      </p>
    </div>
  );
}
