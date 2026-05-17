"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { getCultivationState, getCultivationVisuals } from "../lib/cultivation";

// ═══════════════════════════════════════════════════════════
// ALKI — Progress Log & Eidolon Cultivation Tracker
// ═══════════════════════════════════════════════════════════

const S = {
  inner: { maxWidth: 480, margin: "0 auto", padding: "0 20px", minHeight: "100vh" },
  accent: "#22d68a",
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 12 },
  input: { width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  label: { fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 8, display: "block" },
  btn: { width: "100%", padding: "16px 24px", background: "#22d68a", color: "#0a0a0a", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em", fontFamily: "inherit" },
  btnDisabled: { opacity: 0.35, cursor: "not-allowed" },
  btnOutline: { width: "100%", padding: "14px 24px", background: "transparent", color: "#22d68a", border: "2px solid rgba(34,214,138,0.3)", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  disclaimer: { fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, textAlign: "center", padding: "16px 0" }
};

function ScoreInput({ label, value, onChange, icon }) {
  return (
    <div>
      <div style={{ ...S.label, fontSize: 10, marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: `1px solid ${n === value ? S.accent : "rgba(255,255,255,0.1)"}`,
              background: n === value ? "rgba(34,214,138,0.15)" : "rgba(255,255,255,0.03)",
              color: n === value ? "#fff" : "rgba(255,255,255,0.35)",
              fontSize: 12,
              fontWeight: n === value ? 700 : 400,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProgressLog({ onBack, userId, profile, cultivationState, onLogsChanged }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [weight, setWeight] = useState(profile?.weight ? String(profile.weight) : "");
  const [bodyFat, setBodyFat] = useState(profile?.bodyFat ? String(profile.bodyFat) : "");
  const [wellbeing, setWellbeing] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [notes, setNotes] = useState("");

  const visuals = getCultivationVisuals(cultivationState?.state || "new");

  // Load logs on mount
  useEffect(() => {
    if (!supabase || !userId) { setLoading(false); return; }
    supabase
      .from("progress_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          setLogs(data);
          if (onLogsChanged) onLogsChanged(data);
        }
        setLoading(false);
      });
  }, [userId]);

  const handleSave = async () => {
    if (!supabase || !userId) return;
    setSaving(true);
    const entry = {
      user_id: userId,
      logged_at: new Date().toISOString(),
      weight: parseFloat(weight) || null,
      body_fat: parseFloat(bodyFat) || null,
      wellbeing,
      energy,
      sleep_quality: sleepQuality,
      notes: notes.trim() || null
    };
    const { data, error } = await supabase
      .from("progress_logs")
      .insert(entry)
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      const updated = [data, ...logs];
      setLogs(updated);
      if (onLogsChanged) onLogsChanged(updated);
      setShowForm(false);
      setNotes("");
    }
  };

  const localCultivation = useMemo(() => getCultivationState(logs), [logs]);
  const activeState = logs.length > 0 ? localCultivation : (cultivationState || { state: "new", daysSinceLog: null, streak: 0 });
  const activeVisuals = getCultivationVisuals(activeState.state);

  // Trend calculation
  const trend = useMemo(() => {
    if (logs.length < 2) return null;
    const recent = logs[0];
    const prev = logs[1];
    const bfDelta = (recent.body_fat && prev.body_fat) ? recent.body_fat - prev.body_fat : null;
    const wtDelta = (recent.weight && prev.weight) ? recent.weight - prev.weight : null;
    return { bfDelta, wtDelta };
  }, [logs]);

  const canSave = (weight || bodyFat);

  return (
    <div style={S.inner}>
      {/* Header */}
      <div style={{ padding: "16px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          ← Back to Research
        </button>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
          εἰδωλον · Progress
        </div>
      </div>

      {/* Cultivation Status Banner */}
      <div style={{
        ...S.card,
        borderColor: activeVisuals.statusBorder,
        background: activeVisuals.statusBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ color: activeVisuals.statusColor, fontSize: 14 }}>{activeVisuals.statusIcon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: activeVisuals.statusColor }}>
              Eidolon: {activeVisuals.statusLabel}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
            {activeState.state === "new" && "Log your first check-in to activate your Eidolon."}
            {activeState.state === "progressing" && `${activeState.streak}-week streak · Last logged ${activeState.daysSinceLog === 0 ? "today" : `${activeState.daysSinceLog}d ago`}`}
            {activeState.state === "stagnant" && `${activeState.daysSinceLog} days since last log · Eidolon frozen`}
            {activeState.state === "regressing" && `${activeState.daysSinceLog} days since last log · Projected gains fading`}
          </div>
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: activeVisuals.statusBg,
          border: `1.5px solid ${activeVisuals.statusBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: activeVisuals.statusColor,
          fontVariantNumeric: "tabular-nums"
        }}>
          {activeState.streak > 0 ? activeState.streak : "—"}
        </div>
      </div>

      {/* Trend row — if we have at least 2 logs */}
      {trend && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {trend.bfDelta !== null && (
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Body Fat Trend</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: trend.bfDelta < 0 ? "#22d68a" : trend.bfDelta > 0 ? "#ef4444" : "rgba(255,255,255,0.5)" }}>
                {trend.bfDelta > 0 ? "+" : ""}{trend.bfDelta.toFixed(1)}%
              </div>
            </div>
          )}
          {trend.wtDelta !== null && (
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Weight Trend</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>
                {trend.wtDelta > 0 ? "+" : ""}{trend.wtDelta.toFixed(1)} lbs
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log CTA or Form */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ ...S.btn, marginBottom: 16 }}>
          Log Research Check-in
        </button>
      ) : (
        <div style={{ ...S.card, borderColor: "rgba(34,214,138,0.2)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Weekly Research Check-in</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Weight (lbs)</label>
              <input type="number" placeholder={profile?.weight ? String(profile.weight) : "185"} value={weight} onChange={e => setWeight(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Body Fat %</label>
              <input type="number" placeholder={profile?.bodyFat ? String(profile.bodyFat) : "18"} value={bodyFat} onChange={e => setBodyFat(e.target.value)} style={S.input} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
            <ScoreInput label="Wellbeing" value={wellbeing} onChange={setWellbeing} icon="🧠" />
            <ScoreInput label="Energy" value={energy} onChange={setEnergy} icon="⚡" />
            <ScoreInput label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} icon="🌙" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Notes (optional)</label>
            <textarea
              placeholder="How is your research tracking?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{ ...S.input, resize: "vertical", minHeight: 60 }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowForm(false)}
              style={{ ...S.btnOutline, flex: 1, padding: "12px 16px", fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{ ...S.btn, flex: 2, padding: "12px 16px", fontSize: 14, ...(!canSave || saving ? S.btnDisabled : {}) }}
            >
              {saving ? "Saving..." : "Log Progress"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div style={{ ...S.label, marginTop: 8, marginBottom: 12 }}>
        Research Log — {logs.length} entr{logs.length === 1 ? "y" : "ies"}
      </div>

      {loading && (
        <div style={{ ...S.card, color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center" }}>
          Loading logs...
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div style={{ ...S.card, color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.6, textAlign: "center" }}>
          No check-ins yet. Log your first entry to begin cultivating your Eidolon.
        </div>
      )}

      {logs.map((log, i) => {
        const d = new Date(log.logged_at);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

        return (
          <div key={log.id} style={{
            ...S.card,
            padding: 16,
            borderColor: i === 0 ? "rgba(34,214,138,0.15)" : "rgba(255,255,255,0.06)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                {dateStr}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                {timeStr}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: log.notes ? 8 : 0 }}>
              {log.weight && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Weight </span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{log.weight} lbs</span>
                </div>
              )}
              {log.body_fat && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>BF </span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{log.body_fat}%</span>
                </div>
              )}
              {log.wellbeing && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  🧠 {log.wellbeing}/10
                </div>
              )}
              {log.energy && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  ⚡ {log.energy}/10
                </div>
              )}
              {log.sleep_quality && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  🌙 {log.sleep_quality}/10
                </div>
              )}
            </div>

            {log.notes && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontStyle: "italic", lineHeight: 1.5 }}>
                "{log.notes}"
              </div>
            )}
          </div>
        );
      })}

      <p style={{ ...S.disclaimer, paddingBottom: 8 }}>
        Progress logged. Your Eidolon reflects your consistency.
      </p>
      <p style={{ fontSize: 12, color: "rgba(34,214,138,0.3)", textAlign: "center", paddingBottom: 32, fontStyle: "italic", letterSpacing: "0.06em" }}>
        Alki · ἀλκή · Happy Researching.
      </p>
    </div>
  );
}
