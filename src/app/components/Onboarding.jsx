"use client";
import { useState } from "react";
import { S, GOALS } from "./appStyles";
import { DISCLAIMER } from "../lib/disclaimer";
import { TRAINING_STATUSES } from "../screens/SettingsView";

// G2 — optional US Navy (Hodgdon-Beckett) body-fat estimate. This is the canonical
// IMPERIAL form: every circumference AND height is in INCHES. Men use neck + waist +
// height; women add hip. (The alternative "495 / (1.0324 − …) − 450" form uses
// CENTIMETER constants and would under-read badly with inches, so the linear inch
// coefficients below are used instead — they reproduce the Navy's published inch
// tables.) Additive to direct BF% entry — it only offers a number the user can apply,
// never replacing manual entry. Returns a rounded % or null on missing/invalid input.
function estimateNavyBodyFat({ sex, heightIn, neck, waist, hip }) {
  const h = parseFloat(heightIn);
  const n = parseFloat(neck);
  const w = parseFloat(waist);
  const hp = parseFloat(hip);
  if (!(h > 0) || !(n > 0) || !(w > 0)) return null;
  let bf;
  if (sex === "female") {
    if (!(hp > 0)) return null;
    const x = w + hp - n;
    if (x <= 0) return null;
    bf = 163.205 * Math.log10(x) - 97.684 * Math.log10(h) - 78.387;
  } else {
    const x = w - n;
    if (x <= 0) return null;
    bf = 86.010 * Math.log10(x) - 70.041 * Math.log10(h) + 36.76;
  }
  if (!isFinite(bf)) return null;
  return Math.round(Math.max(3, Math.min(60, bf)) * 10) / 10;
}

export default function Onboarding({ onComplete, onExitHome, prefill = null, initialStep = 0 }) {
  const [step, setStep] = useState(initialStep);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // G2 — optional Navy-method estimator state (circumferences in inches). Local only;
  // it just computes a BF% the user can choose to apply to the bodyFat field.
  const [navyOpen, setNavyOpen] = useState(false);
  const [navy, setNavy] = useState({ neck: "", waist: "", hip: "" });
  const [data, setData] = useState(prefill ? {
    sex: prefill.sex || "",
    age: prefill.age != null ? String(prefill.age) : "",
    heightFt: prefill.heightFt != null ? String(prefill.heightFt) : "5",
    heightIn: prefill.heightIn != null ? String(prefill.heightIn) : "10",
    weight: prefill.weight != null ? String(prefill.weight) : "",
    bodyFat: prefill.bodyFat != null ? String(prefill.bodyFat) : "",
    goals: prefill.goals || [],
    trainingStatus: prefill.trainingStatus || "",
    adv: prefill.adv || { skelMuscle: "", fatFreeMass: "", subFat: "", visceralFat: "", bodyWater: "", muscleMass: "", boneMass: "", bmr: "" }
  } : {
    sex: "", age: "", heightFt: "5", heightIn: "10", weight: "", bodyFat: "", goals: [], trainingStatus: "",
    adv: { skelMuscle: "", fatFreeMass: "", subFat: "", visceralFat: "", bodyWater: "", muscleMass: "", boneMass: "", bmr: "" }
  });

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));
  const setAdv = (k, v) => setData(prev => ({ ...prev, adv: { ...prev.adv, [k]: v } }));
  const toggleGoal = (g) => setData(prev => ({
    ...prev,
    goals: prev.goals.includes(g) ? prev.goals.filter(x => x !== g) : [...prev.goals, g]
  }));

  // 6.7-c — the age gate is a binary attestation; this is the second guard.
  // The basics step's `min="18"` is only a browser hint, so an under-18 value
  // could be typed and saved. Block it here: the Continue button stays disabled
  // and an inline notice explains why, so under-18 never reaches the profile.
  const ageNum = parseInt(data.age, 10);
  const ageEntered = data.age !== "" && !Number.isNaN(ageNum);
  const ageUnder18 = ageEntered && ageNum < 18;
  const basicsValid = ageEntered && ageNum >= 18 && !!data.weight;

  const bfNum = parseFloat(data.bodyFat);
  // #31 — informational only. Describe what the range *means* physiologically;
  // don't prescribe a goal or protocol. The recommendation engine still ranks
  // compounds by body fat — this copy is here to teach, not to steer.
  const bfFeedback = !isNaN(bfNum) && bfNum > 0 ? (
    bfNum < 8 ? { text: "Competition-level lean — at or below the essential-fat margin for most men. Very lean ranges are where much GH-axis and recovery research is focused.", color: "#1ae87a" } :
    bfNum < 15 ? { text: "Athletic range. Lean and within healthy limits. For context, GLP-1 research notes elevated lean-mass-loss risk the leaner you are.", color: "#1ae87a" } :
    bfNum < 22 ? { text: "Healthy range — typical for an active adult.", color: "#1ae87a" } :
    bfNum < 30 ? { text: "Above-average body fat — the range most published GLP-1 weight-loss trials were conducted in.", color: "#1ae87a" } :
    { text: "High body fat — where the strongest documented GLP-1 weight-loss results come from in the clinical literature.", color: "#1ae87a" }
  ) : null;

  const steps = [
    // Step 0: Sex
    <div key="sex">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Biological Sex</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>Research protocols and Eidolon rendering are calibrated to biological sex.</p>
      <div style={{ display: "flex", gap: 12 }}>
        {["male", "female"].map(s => (
          <button key={s} onClick={() => { set("sex", s); setStep(1); }} style={{
            flex: 1, padding: "20px 16px",
            background: data.sex === s ? S.accentDim : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${data.sex === s ? S.accent : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, cursor: "pointer", color: data.sex === s ? "#fff" : "rgba(255,255,255,0.6)",
            fontSize: 16, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize"
          }}>
            {s}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Basics
    <div key="basics">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Biometrics</h2>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Age</label>
        <input type="number" placeholder="28" value={data.age} onChange={e => set("age", e.target.value)} style={{ ...S.input, ...(ageUnder18 ? { borderColor: "rgba(239,68,68,0.6)" } : {}) }} min="18" max="99" />
        {ageUnder18 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>
            Alki is available only to adults aged 18 and older.
          </div>
        )}
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
              {Array.from({length:12},(_, i) => <option key={i} value={i}>{i} in</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Weight (lbs)</label>
        <input type="number" placeholder="185" value={data.weight} onChange={e => set("weight", e.target.value)} style={S.input} />
      </div>
      {/* H1 — Training Status surfaced in onboarding (previously only in Settings).
          Optional; stored on the profile for Sprint 2 to wire into the engine. */}
      <div style={{ marginBottom: 24 }}>
        <label style={S.label}>Training Status <span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· optional</span></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {TRAINING_STATUSES.map(t => {
            const active = data.trainingStatus === t.id;
            return (
              <button
                key={t.id}
                onClick={() => set("trainingStatus", active ? "" : t.id)}
                style={{
                  padding: "11px 12px", textAlign: "left", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  background: active ? S.accentDim : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${active ? S.accent : "rgba(255,255,255,0.1)"}`,
                  color: active ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{t.label}</span>
                <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button style={{ ...S.btn, ...(!basicsValid ? S.btnDisabled : {}) }} disabled={!basicsValid} onClick={() => setStep(2)}>
        Continue
      </button>
    </div>,

    // Step 2: Body fat + Advanced accordion
    <div key="bf">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Body Fat Percentage</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>The single most important variable for protocol configuration. Estimate as accurately as possible.</p>
      <input type="number" placeholder="18" value={data.bodyFat} onChange={e => set("bodyFat", e.target.value)} style={{ ...S.input, fontSize: 32, textAlign: "center", fontWeight: 700 }} min="3" max="60" />
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 6 }}>%</div>
      {bfFeedback && (
        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${bfFeedback.color}`, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
          {bfFeedback.text}
        </div>
      )}

      {/* ── G2 — optional US Navy tape-measure estimator (additive to direct entry) ── */}
      {(() => {
        const navyHeightIn = (parseInt(data.heightFt, 10) || 0) * 12 + (parseInt(data.heightIn, 10) || 0);
        const estimate = estimateNavyBodyFat({ sex: data.sex, heightIn: navyHeightIn, neck: navy.neck, waist: navy.waist, hip: navy.hip });
        const isFemale = data.sex === "female";
        const fields = [
          { key: "neck", label: "Neck", hint: "Below the larynx" },
          { key: "waist", label: "Waist", hint: isFemale ? "Narrowest point" : "At the navel" },
          ...(isFemale ? [{ key: "hip", label: "Hip", hint: "Widest point" }] : []),
        ];
        return (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setNavyOpen(v => !v)}
              style={{
                width: "100%", padding: "13px 16px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: navyOpen ? "10px 10px 0 0" : 10, color: "rgba(255,255,255,0.45)",
                fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>📏</span>
                <span>Not sure? Estimate with a tape measure</span>
              </span>
              <span style={{ fontSize: 11, transition: "transform 0.2s", display: "inline-block", transform: navyOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>
            <div style={{ overflow: "hidden", maxHeight: navyOpen ? 520 : 0, transition: "max-height 0.35s ease" }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "16px 14px 14px" }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>
                  US Navy method — measure each circumference in inches with a soft tape. This estimates your body fat from your measurements and height; you can apply it to the field above or keep your own number.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isFemale ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
                  {fields.map(({ key, label, hint }) => (
                    <div key={key}>
                      <label style={{ ...S.label, fontSize: 10, marginBottom: 4 }}>
                        {label} <span style={{ color: "rgba(255,255,255,0.2)" }}>in</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={key === "neck" ? "15" : key === "hip" ? "40" : "34"}
                        value={navy[key]}
                        onChange={e => setNavy(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ ...S.input, padding: "10px 12px", fontSize: 14 }}
                      />
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 3 }}>{hint}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                    {estimate != null ? (
                      <>Estimated: <span style={{ color: S.accent, fontWeight: 800, fontSize: 18 }}>{estimate}%</span></>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>Enter measurements to estimate</span>
                    )}
                  </div>
                  <button
                    onClick={() => { if (estimate != null) set("bodyFat", String(estimate)); }}
                    disabled={estimate == null}
                    style={{ ...S.btnOutline, width: "auto", padding: "10px 16px", fontSize: 13, ...(estimate == null ? S.btnDisabled : {}) }}
                  >
                    Use this estimate
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Advanced body stats accordion ── */}
      {(() => {
        const advFields = [
          { key: "skelMuscle",  label: "Skeletal Muscle",  unit: "%",    placeholder: "42.3", hint: "From InBody / DEXA" },
          { key: "fatFreeMass", label: "Fat Free Mass",    unit: "lbs",  placeholder: "148",  hint: "Body weight minus fat" },
          { key: "subFat",      label: "Subcutaneous Fat", unit: "%",    placeholder: "14.2", hint: "Fat under the skin" },
          { key: "visceralFat", label: "Visceral Fat",     unit: "lvl",  placeholder: "8",    hint: "Organ fat (1–20 scale)" },
          { key: "bodyWater",   label: "Body Water",       unit: "%",    placeholder: "57.4", hint: "Total body water %" },
          { key: "muscleMass",  label: "Muscle Mass",      unit: "lbs",  placeholder: "138",  hint: "Skeletal muscle weight" },
          { key: "boneMass",    label: "Bone Mass",        unit: "lbs",  placeholder: "7.2",  hint: "Bone mineral content" },
          { key: "bmr",         label: "BMR",              unit: "kcal", placeholder: "1840", hint: "Basal metabolic rate / day" },
        ];
        const filledCount = Object.values(data.adv).filter(Boolean).length;
        return (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setAdvancedOpen(v => !v)}
              style={{
                width: "100%", padding: "13px 16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: advancedOpen ? "10px 10px 0 0" : 10,
                color: "rgba(255,255,255,0.45)",
                fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚗️</span>
                <span>Advanced body stats</span>
                {filledCount > 0 && (
                  <span style={{ background: "rgba(26,232,122,0.15)", color: "#1ae87a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                    {filledCount}/8
                  </span>
                )}
              </span>
              <span style={{ fontSize: 11, transition: "transform 0.2s", display: "inline-block", transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>
            <div style={{
              overflow: "hidden",
              maxHeight: advancedOpen ? 700 : 0,
              transition: "max-height 0.35s ease"
            }}>
              <div style={{
                border: "1px solid rgba(255,255,255,0.1)", borderTop: "none",
                borderRadius: "0 0 10px 10px", padding: "16px 14px 14px"
              }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 14px", lineHeight: 1.5 }}>
                  Optional — most people skip this, and that's fine. If you have a DEXA scan, InBody, or smart-scale readout handy, enter whatever you can: each value sharpens your projections and recommendations.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {advFields.map(({ key, label, unit, placeholder, hint }) => (
                    <div key={key}>
                      <label style={{ ...S.label, fontSize: 10, marginBottom: 4 }}>
                        {label} <span style={{ color: "rgba(255,255,255,0.2)" }}>{unit}</span>
                      </label>
                      <input
                        type="number"
                        placeholder={placeholder}
                        value={data.adv[key]}
                        onChange={e => setAdv(key, e.target.value)}
                        style={{ ...S.input, padding: "10px 12px", fontSize: 14 }}
                      />
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 3 }}>{hint}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <button style={{ ...S.btn, marginTop: 20, ...(!data.bodyFat ? S.btnDisabled : {}) }} disabled={!data.bodyFat} onClick={() => setStep(3)}>
        Continue
      </button>
    </div>,

    // Step 3: Goals
    <div key="goals">
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>Primary Goals</h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>Select all that apply. Your goals determine which compounds are surfaced and how your research protocol is configured.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
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
      {/* 6.2 — onboarding carried no disclaimer on any step; surface the
          canonical form right before the user generates a protocol. */}
      <p style={{ ...S.disclaimer, marginTop: 24, textAlign: "left", fontSize: 11, lineHeight: 1.6 }}>
        {DISCLAIMER}
      </p>
      <button style={{ ...S.btn, marginTop: 16, ...(data.goals.length === 0 ? S.btnDisabled : {}) }} disabled={data.goals.length === 0} onClick={() => {
        const profile = {
          sex: data.sex,
          age: parseInt(data.age),
          heightFt: parseInt(data.heightFt),
          heightIn: parseInt(data.heightIn),
          weight: parseFloat(data.weight),
          bodyFat: parseFloat(data.bodyFat),
          goals: data.goals,
          trainingStatus: data.trainingStatus || null,
          adv: data.adv
        };
        onComplete(profile);
      }}>
        Generate Research Protocol →
      </button>
    </div>
  ];

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div style={S.inner}>
      {/* Progress bar */}
      <div style={{ padding: "16px 0 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              ← Back
            </button>
          ) : <span />}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Step {step + 1} of {steps.length}
            </div>
            {onExitHome && (
              <button
                onClick={onExitHome}
                style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontFamily: "inherit", fontWeight: 600, letterSpacing: "0.02em" }}
              >
                Exit to Home
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: S.accent, borderRadius: 1, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "safe center", paddingBottom: 40 }}>
        {steps[step]}
      </div>
    </div>
  );
}
