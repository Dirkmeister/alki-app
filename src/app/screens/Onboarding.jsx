"use client";
import { useState } from "react";
import { S } from "../styles/theme";
import { GOALS } from "../data/goals";

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    sex: "", age: "", heightFt: "5", heightIn: "10", weight: "", bodyFat: "", goals: []
  });

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));
  const toggleGoal = (g) => setData(prev => ({
    ...prev,
    goals: prev.goals.includes(g) ? prev.goals.filter(x => x !== g) : [...prev.goals, g]
  }));

  const bfNum = parseFloat(data.bodyFat);
  const bfFeedback = !isNaN(bfNum) && bfNum > 0 ? (
    bfNum < 8  ? { text: "Competition-level lean. Recovery and GH peptides are your primary category.", color: "#f59e0b" } :
    bfNum < 15 ? { text: "Athletic range. GLP-1 compounds will not be recommended at this body fat. GH and recovery peptides are optimal.", color: "#22d68a" } :
    bfNum < 22 ? { text: "Healthy range. Full compound spectrum available. Body recomposition protocols are ideal.", color: "#22d68a" } :
    bfNum < 30 ? { text: "GLP-1 compounds are high-priority at this body fat percentage. Fat loss protocols will be primary recommendations.", color: "#f59e0b" } :
    { text: "GLP-1 compounds are strongly indicated. Fat loss is the recommended primary objective before optimizing other goals.", color: "#ef4444" }
  ) : null;

  const steps = [
    <div key="sex">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Biological Sex</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>
        Compound recommendations and avatar rendering are calibrated to biological sex.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        {["male", "female"].map(s => (
          <button key={s} onClick={() => { set("sex", s); setStep(1); }} style={{
            flex: 1, padding: "20px 16px",
            background: data.sex === s ? S.accentDim : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${data.sex === s ? S.accent : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, cursor: "pointer",
            color: data.sex === s ? "#fff" : "rgba(255,255,255,0.6)",
            fontSize: 16, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize"
          }}>
            {s}
          </button>
        ))}
      </div>
    </div>,

    <div key="basics">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Biometrics</h2>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Age</label>
        <input type="number" placeholder="28" value={data.age} onChange={e => set("age", e.target.value)} style={S.input} min="18" max="99" />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Height</label>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <select value={data.heightFt} onChange={e => set("heightFt", e.target.value)} style={{ ...S.input, appearance: "none" }}>
              {[4,5,6,7].map(f => <option key={f} value={f}>{f} ft</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <select value={data.heightIn} onChange={e => set("heightIn", e.target.value)} style={{ ...S.input, appearance: "none" }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Weight (lbs)</label>
        <input type="number" placeholder="185" value={data.weight} onChange={e => set("weight", e.target.value)} style={S.input} />
      </div>
      <button
        style={{ ...S.btn, ...((!data.age || !data.weight) ? S.btnDisabled : {}) }}
        disabled={!data.age || !data.weight}
        onClick={() => setStep(2)}
      >
        Continue
      </button>
    </div>,

    <div key="bf">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Body Fat Percentage</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>
        Your body fat percentage is the single most important variable for compound selection. Estimate as accurately as possible.
      </p>
      <input
        type="number" placeholder="18" value={data.bodyFat}
        onChange={e => set("bodyFat", e.target.value)}
        style={{ ...S.input, fontSize: 28, textAlign: "center", fontWeight: 700 }}
        min="3" max="60"
      />
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 6 }}>%</div>
      {bfFeedback && (
        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${bfFeedback.color}`, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
          {bfFeedback.text}
        </div>
      )}
      <button
        style={{ ...S.btn, marginTop: 24, ...(!data.bodyFat ? S.btnDisabled : {}) }}
        disabled={!data.bodyFat}
        onClick={() => setStep(3)}
      >
        Continue
      </button>
    </div>,

    <div key="goals">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Primary Goals</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>
        Select all that apply. Your goals determine which compounds are surfaced and how they are ranked.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {GOALS.map(g => {
          const active = data.goals.includes(g.id);
          return (
            <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
              ...S.tag,
              background: active ? S.accentDim : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${active ? S.accent : "rgba(255,255,255,0.1)"}`,
              color: active ? "#fff" : "rgba(255,255,255,0.5)"
            }}>
              {g.icon} {g.label}
            </button>
          );
        })}
      </div>
      <button
        style={{ ...S.btn, marginTop: 28, ...(data.goals.length === 0 ? S.btnDisabled : {}) }}
        disabled={data.goals.length === 0}
        onClick={() => onComplete({
          sex: data.sex,
          age: parseInt(data.age),
          heightFt: parseInt(data.heightFt),
          heightIn: parseInt(data.heightIn),
          weight: parseFloat(data.weight),
          bodyFat: parseFloat(data.bodyFat),
          goals: data.goals
        })}
      >
        Generate Recommendations →
      </button>
    </div>
  ];

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div style={S.inner}>
      <div style={{ padding: "16px 0 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
            Step {step + 1} of {steps.length}
          </div>
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: S.accent, borderRadius: 1, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 40 }}>
        {steps[step]}
      </div>
    </div>
  );
}
