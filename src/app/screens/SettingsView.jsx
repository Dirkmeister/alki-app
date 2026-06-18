"use client";
import { useState, useEffect } from "react";
import {
  formatWeight, formatHeight,
  lbToKg, kgToLb, ftInToCm, cmToFtIn,
} from "../lib/units";
import UpgradePrompt from "../components/UpgradePrompt";
import { PRO_PRICING } from "../lib/subscription";

// ═══════════════════════════════════════════════════════════
// ALKI — Profile & Settings (Sprint 5)
// One page, four sections:
//   5.1 Profile display + inline edit (biometrics, training status, goals)
//   5.2 Eidolon management (rename, switch active, delete)
//   5.3 Account actions (change password, sign out, delete account)
//   5.4 Display preferences (unit system)
//
// Back/Home navigation is the app-root chrome (INNER_SCREENS) — this screen
// reserves the top band and renders no back button of its own.
// ═══════════════════════════════════════════════════════════

const S = {
  inner: { maxWidth: 480, margin: "0 auto", padding: "64px 20px 48px", minHeight: "100vh" },
  accent: "#1ae87a",
  danger: "#ef4444",
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 14 },
  input: { width: "100%", padding: "13px 15px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  label: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 7, display: "block", fontFamily: "'JetBrains Mono', monospace" },
  btn: { width: "100%", padding: "15px 24px", background: "#1ae87a", color: "#060608", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne','DM Sans',sans-serif", letterSpacing: "0.02em" },
  btnOutline: { width: "100%", padding: "13px 24px", background: "transparent", color: "#1ae87a", border: "1.5px solid rgba(26,232,122,0.25)", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnDisabled: { opacity: 0.35, cursor: "not-allowed" },
  sectionTitle: { fontSize: 18, fontWeight: 800, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em", margin: "0 0 4px" },
  sectionHint: { fontSize: 12.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: "0 0 12px" },
};

// H1 — exported so onboarding can surface the same Training Status options (it was
// previously only editable here in Settings).
export const TRAINING_STATUSES = [
  { id: "sedentary",    label: "Sedentary",    hint: "Little / no exercise" },
  { id: "recreational", label: "Recreational", hint: "1–3× per week" },
  { id: "trained",      label: "Trained",      hint: "4–6× per week, structured" },
  { id: "athlete",      label: "Athlete",      hint: "Competitive / daily" },
];

// ── Sprint 7 — subscription management card ──
// Renders one of three states from the loaded profile's subscription fields:
//   • Pro (active or comped) → status + Manage Subscription (Stripe portal)
//   • past_due               → payment-failed warning + Manage Subscription
//   • free / canceled        → inline upgrade prompt (both prices)
// "Refresh subscription status" calls the reconciliation route (Stage 4) and is
// always available so a missed webhook can be corrected on demand.
function SubscriptionCard({ isPro, subscriptionStatus, subscriptionTier, comped, proUntil, onSubscribe, onManageBilling, onRefreshSubscription }) {
  const [portalBusy, setPortalBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Promo grant (008): a time-boxed pass, Pro until proUntil. It carries no
  // Stripe customer, so it's displayed like `comped` (no Manage button) but with
  // its expiry shown. Only counts while it's the thing granting Pro — a real
  // active Stripe sub takes precedence.
  const promoUntil =
    subscriptionStatus !== "active" && proUntil && new Date(proUntil) > new Date()
      ? new Date(proUntil)
      : null;
  const noStripe = comped || !!promoUntil;
  const promoExpiry = promoUntil
    ? promoUntil.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  const tierLabel = subscriptionTier === "annual"
    ? `Annual · ${PRO_PRICING.annual.price}${PRO_PRICING.annual.cadence}`
    : subscriptionTier === "monthly"
      ? `Monthly · ${PRO_PRICING.monthly.price}${PRO_PRICING.monthly.cadence}`
      : null;

  const openPortal = async () => {
    setPortalBusy(true); setErr(null); setMsg(null);
    try {
      await onManageBilling();
      // On success the browser navigates to Stripe.
    } catch (e) {
      setErr(e?.message || "Couldn't open the billing portal. Try again.");
      setPortalBusy(false);
    }
  };

  const refresh = async () => {
    setRefreshBusy(true); setErr(null); setMsg(null);
    try {
      await onRefreshSubscription();
      setMsg("Subscription status refreshed.");
    } catch (e) {
      setErr(e?.message || "Couldn't refresh status. Try again.");
    } finally {
      setRefreshBusy(false);
    }
  };

  const refreshLink = (
    <button onClick={refresh} disabled={refreshBusy} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, cursor: refreshBusy ? "wait" : "pointer", fontFamily: "inherit", padding: "10px 0 0", textDecoration: "underline" }}>
      {refreshBusy ? "Refreshing…" : "Refresh subscription status"}
    </button>
  );

  // ── Pro: active subscription OR a manual comp ──
  if (isPro) {
    return (
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", fontFamily: "'Syne',sans-serif" }}>Alki Pro</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1ae87a", background: "rgba(26,232,122,0.12)", border: "1px solid rgba(26,232,122,0.25)", borderRadius: 100, padding: "2px 8px" }}>
            {comped ? "Complimentary" : promoUntil ? "Pro Pass" : "Active"}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, margin: "0 0 14px" }}>
          {comped
            ? "You have complimentary Pro access. Enjoy the full Eidolon."
            : promoUntil
              ? `Your Pro pass is active through ${promoExpiry}. Redeem another code to extend it.`
              : `Your plan: ${tierLabel || "Pro"}. Manage your plan, payment method, or cancel anytime.`}
        </p>

        {msg && <Banner kind="ok">{msg}</Banner>}
        {err && <Banner kind="err">{err}</Banner>}

        {/* Comped + promo-pass users have no Stripe customer to manage — only paying subs do. */}
        {!noStripe && (
          <button onClick={openPortal} disabled={portalBusy} style={{ ...S.btnOutline, ...(portalBusy ? S.btnDisabled : {}) }}>
            {portalBusy ? "Opening…" : "Manage Subscription"}
          </button>
        )}
        {refreshLink}
      </div>
    );
  }

  // ── past_due: keep them in the loop with a recovery path ──
  if (subscriptionStatus === "past_due") {
    return (
      <div style={S.card}>
        <Banner kind="err">Your last payment failed, so Pro is paused. Update your payment method to restore access.</Banner>
        {err && <Banner kind="err">{err}</Banner>}
        {msg && <Banner kind="ok">{msg}</Banner>}
        <button onClick={openPortal} disabled={portalBusy} style={{ ...S.btn, ...(portalBusy ? S.btnDisabled : {}) }}>
          {portalBusy ? "Opening…" : "Update Payment Method"}
        </button>
        {refreshLink}
      </div>
    );
  }

  // ── free / canceled: show the upgrade prompt inline ──
  return (
    <div>
      {err && <Banner kind="err">{err}</Banner>}
      {msg && <Banner kind="ok">{msg}</Banner>}
      <UpgradePrompt variant="inline" onSubscribe={onSubscribe} />
      <div style={{ textAlign: "center" }}>{refreshLink}</div>
    </div>
  );
}

// ── Promo codes (008) — redeem a single-use code for a month of Pro ──
// Calls onRedeemCode(code) (the AlkiApp redeem handler → server RPC, which
// burns the code and grants time-boxed Pro, then refreshes the profile so the
// card above re-renders as Pro). Single field; success/error shown inline.
function RedeemCodeCard({ onRedeemCode }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true); setMsg(null); setErr(null);
    try {
      await onRedeemCode(trimmed);
      setMsg("Code redeemed — Alki Pro is unlocked for one month.");
      setCode("");
    } catch (e) {
      setErr(e?.message || "Couldn't redeem that code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <label style={S.label}>Have a code?</label>
      <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: "0 0 12px" }}>
        Redeem a promo code for one month of Alki Pro.
      </p>
      {msg && <Banner kind="ok">{msg}</Banner>}
      {err && <Banner kind="err">{err}</Banner>}
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); }}
        placeholder="ALKI-XXXX-XXXX"
        autoCapitalize="characters"
        spellCheck={false}
        style={{ ...S.input, marginBottom: 10, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}
      />
      <button onClick={submit} disabled={!code.trim() || busy} style={{ ...S.btn, ...((!code.trim() || busy) ? S.btnDisabled : {}) }}>
        {busy ? "Redeeming…" : "Redeem Code"}
      </button>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={S.sectionTitle}>{title}</h2>
      {hint && <p style={S.sectionHint}>{hint}</p>}
      {children}
    </div>
  );
}

function Banner({ kind = "ok", children }) {
  const styles = kind === "ok"
    ? { bg: "rgba(26,232,122,0.1)", bd: "rgba(26,232,122,0.25)", fg: "#1ae87a" }
    : { bg: "rgba(239,68,68,0.1)", bd: "rgba(239,68,68,0.25)", fg: "#fca5a5" };
  return (
    <div style={{ padding: "11px 14px", borderRadius: 10, background: styles.bg, border: `1px solid ${styles.bd}`, color: styles.fg, fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
      {children}
    </div>
  );
}

export default function SettingsView({
  profile,
  onSaveProfile,
  eidolons = [],
  activeEidolonId,
  onSwitchEidolon,
  onRenameEidolon,
  onDeleteEidolon,
  preferences,
  onSetPreferences,
  onReplayTutorial,
  goalOptions = [],
  userEmail,
  hasAccount = false,
  onChangePassword,
  onSignOut,
  onDeleteAccount,
  // Sprint 7 — subscription
  isPro = false,
  subscriptionStatus = "free",
  subscriptionTier = null,
  comped = false,
  // Promo codes (008) — time-boxed Pro expiry + the redeem action.
  proUntil = null,
  onRedeemCode,
  onSubscribe,
  onManageBilling,
  onRefreshSubscription,
}) {
  const units = preferences?.units || "imperial";
  const metric = units === "metric";

  // ── 5.1 Profile edit state ────────────────────────────────────────────────
  // Canonical edit form is always imperial (heightFt/heightIn/weight-lb), the
  // same shape the engine + avatar consume. Metric inputs write through to the
  // canonical fields via free-text buffers so typing stays smooth (no
  // round-trip rounding mid-keystroke).
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [cmBuf, setCmBuf] = useState("");   // metric height buffer
  const [kgBuf, setKgBuf] = useState("");   // metric weight buffer
  const [savedMsg, setSavedMsg] = useState(false);

  const seedForm = () => {
    const f = {
      sex: profile?.sex || "male",
      age: profile?.age != null ? String(profile.age) : "",
      heightFt: profile?.heightFt != null ? String(profile.heightFt) : "5",
      heightIn: profile?.heightIn != null ? String(profile.heightIn) : "10",
      weight: profile?.weight != null ? String(profile.weight) : "",
      bodyFat: profile?.bodyFat != null ? String(profile.bodyFat) : "",
      trainingStatus: profile?.trainingStatus || "",
      goals: [...(profile?.goals || [])],
    };
    setForm(f);
    seedBuffers(f);
  };
  const seedBuffers = (f) => {
    const cm = ftInToCm(f.heightFt, f.heightIn);
    setCmBuf(cm > 0 ? String(Math.round(cm)) : "");
    const kg = lbToKg(f.weight);
    setKgBuf(parseFloat(f.weight) > 0 ? String(Math.round(kg)) : "");
  };

  // Re-seed the metric buffers if the unit system flips while editing.
  useEffect(() => {
    if (editing && form) seedBuffers(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const startEdit = () => { seedForm(); setSavedMsg(false); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setForm(null); };

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const onCmChange = (v) => {
    setCmBuf(v);
    const { ft, in: inch } = cmToFtIn(v);
    setForm(prev => ({ ...prev, heightFt: String(ft), heightIn: String(inch) }));
  };
  const onKgChange = (v) => {
    setKgBuf(v);
    const lb = kgToLb(v);
    setForm(prev => ({ ...prev, weight: lb > 0 ? String(Math.round(lb * 10) / 10) : "" }));
  };
  const toggleGoal = (id) => setForm(prev => ({
    ...prev,
    goals: prev.goals.includes(id) ? prev.goals.filter(g => g !== id) : [...prev.goals, id],
  }));

  const canSave = form && form.sex && form.age && form.weight && form.bodyFat && form.goals.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    // Build the canonical profile, preserving fields Settings doesn't edit
    // (notably the `adv` body-stat bag). Biometrics flow back through the same
    // derivation path onboarding uses — the root re-selects the base mesh and
    // the memoized engine/recommendation recalc fire off the new profile.
    const updated = {
      ...profile,
      sex: form.sex,
      age: parseInt(form.age, 10),
      heightFt: parseInt(form.heightFt, 10) || 0,
      heightIn: parseInt(form.heightIn, 10) || 0,
      weight: parseFloat(form.weight),
      bodyFat: parseFloat(form.bodyFat),
      trainingStatus: form.trainingStatus || null,
      goals: form.goals,
    };
    onSaveProfile(updated);
    setEditing(false);
    setForm(null);
    setSavedMsg(true);
  };

  const trainingLabel = TRAINING_STATUSES.find(t => t.id === profile?.trainingStatus)?.label || "Not set";

  return (
    <div style={S.inner}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em", margin: 0 }}>Profile &amp; Settings</h1>
      </div>

      {/* ───────────── 5.1 PROFILE ───────────── */}
      <Section title="Your Profile" hint="Your biometrics drive every recommendation and your Eidolon's body. Editing them recalculates both.">
        {savedMsg && !editing && (
          <Banner kind="ok">Saved. Your recommendations and avatar have been updated.</Banner>
        )}

        {!editing ? (
          <div style={S.card}>
            <Row label="Sex" value={profile?.sex === "male" ? "Male" : profile?.sex === "female" ? "Female" : "—"} />
            <Row label="Age" value={profile?.age != null ? `${profile.age}` : "—"} />
            <Row label="Height" value={formatHeight(profile?.heightFt, profile?.heightIn, units)} />
            <Row label="Weight" value={formatWeight(profile?.weight, units)} />
            <Row label="Body Fat" value={profile?.bodyFat != null ? `${profile.bodyFat}%` : "—"} />
            <Row label="Training Status" value={trainingLabel} />
            <Row
              label="Goals"
              value={(profile?.goals || []).length
                ? (profile.goals.map(g => goalOptions.find(o => o.id === g)?.label || g).join(", "))
                : "—"}
              last
            />
            <button onClick={startEdit} style={{ ...S.btnOutline, marginTop: 14 }}>Edit Profile</button>
          </div>
        ) : (
          <div style={S.card}>
            {/* Sex */}
            <label style={S.label}>Biological Sex</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {["male", "female"].map(s => (
                <button key={s} onClick={() => setF("sex", s)} style={{
                  flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  textTransform: "capitalize", fontSize: 15, fontWeight: 600,
                  background: form.sex === s ? "rgba(26,232,122,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${form.sex === s ? S.accent : "rgba(255,255,255,0.1)"}`,
                  color: form.sex === s ? "#fff" : "rgba(255,255,255,0.6)",
                }}>{s}</button>
              ))}
            </div>

            {/* Age */}
            <label style={S.label}>Age</label>
            <input type="number" value={form.age} onChange={e => setF("age", e.target.value)} style={{ ...S.input, marginBottom: 16 }} min="18" max="99" />

            {/* Height */}
            <label style={S.label}>Height</label>
            {metric ? (
              <div style={{ position: "relative", marginBottom: 16 }}>
                <input type="number" value={cmBuf} onChange={e => onCmChange(e.target.value)} placeholder="178" style={S.input} />
                <span style={unitSuffix}>cm</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <select value={form.heightFt} onChange={e => setF("heightFt", e.target.value)} style={{ ...S.input, appearance: "none", flex: 1 }}>
                  {[4, 5, 6, 7].map(f => <option key={f} value={f}>{f} ft</option>)}
                </select>
                <select value={form.heightIn} onChange={e => setF("heightIn", e.target.value)} style={{ ...S.input, appearance: "none", flex: 1 }}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}
                </select>
              </div>
            )}

            {/* Weight */}
            <label style={S.label}>Weight</label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              {metric ? (
                <input type="number" value={kgBuf} onChange={e => onKgChange(e.target.value)} placeholder="84" style={S.input} />
              ) : (
                <input type="number" value={form.weight} onChange={e => setF("weight", e.target.value)} placeholder="185" style={S.input} />
              )}
              <span style={unitSuffix}>{metric ? "kg" : "lb"}</span>
            </div>

            {/* Body fat */}
            <label style={S.label}>Body Fat %</label>
            <input type="number" value={form.bodyFat} onChange={e => setF("bodyFat", e.target.value)} placeholder="18" style={{ ...S.input, marginBottom: 16 }} min="3" max="60" />

            {/* Training status */}
            <label style={S.label}>Training Status</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {TRAINING_STATUSES.map(t => {
                const active = form.trainingStatus === t.id;
                return (
                  <button key={t.id} onClick={() => setF("trainingStatus", active ? "" : t.id)} style={{
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    background: active ? "rgba(26,232,122,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${active ? S.accent : "rgba(255,255,255,0.1)"}`,
                  }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.7)" }}>{t.label}</div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{t.hint}</div>
                  </button>
                );
              })}
            </div>

            {/* Goals */}
            <label style={S.label}>Goals</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {goalOptions.map(g => {
                const active = form.goals.includes(g.id);
                return (
                  <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
                    padding: "8px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    background: active ? "rgba(26,232,122,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${active ? S.accent : "rgba(255,255,255,0.1)"}`,
                    color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  }}>{g.icon ? `${g.icon} ` : ""}{g.label}</button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={cancelEdit} style={{ ...S.btnOutline, flex: 1, borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
              <button onClick={handleSave} disabled={!canSave} style={{ ...S.btn, flex: 1.4, ...(canSave ? {} : S.btnDisabled) }}>Save Changes</button>
            </div>
          </div>
        )}
      </Section>

      {/* ───────────── 5.4 DISPLAY PREFERENCES ───────────── */}
      <Section title="Display" hint="How heights and weights are shown across the app.">
        <div style={S.card}>
          <label style={S.label}>Unit System</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["imperial", "Imperial", "lb · ft/in"], ["metric", "Metric", "kg · cm"]].map(([id, lbl, sub]) => {
              const active = units === id;
              return (
                <button key={id} onClick={() => onSetPreferences({ ...preferences, units: id })} style={{
                  flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  background: active ? "rgba(26,232,122,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${active ? S.accent : "rgba(255,255,255,0.1)"}`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,0.6)" }}>{lbl}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>{sub}</div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Sprint 6.5 — replay the first-run intro tutorial on demand. */}
        {onReplayTutorial && (
          <div style={S.card}>
            <label style={S.label}>Intro Tutorial</label>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: "0 0 12px" }}>
              Watch the quick walkthrough of Alki, your Eidolon, and the core flow again.
            </p>
            <button onClick={onReplayTutorial} style={S.btnOutline}>Show intro again</button>
          </div>
        )}
      </Section>

      {/* ───────────── SPRINT 7 — SUBSCRIPTION ───────────── */}
      <Section title="Subscription" hint="Alki Pro unlocks your projected transformation, eidolon customization, the protocol guide, progress tracking, and the cycle timeline.">
        {!hasAccount ? (
          <div style={{ ...S.card, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            Subscriptions are tied to an account. Create one from the start screen to go Pro and sync across devices.
          </div>
        ) : (
          <>
            <SubscriptionCard
              isPro={isPro}
              subscriptionStatus={subscriptionStatus}
              subscriptionTier={subscriptionTier}
              comped={comped}
              proUntil={proUntil}
              onSubscribe={onSubscribe}
              onManageBilling={onManageBilling}
              onRefreshSubscription={onRefreshSubscription}
            />
            {/* Promo codes (008) — redeem a single-use code for a month of Pro.
                Hidden for comped accounts (already permanent Pro). */}
            {onRedeemCode && !comped && <RedeemCodeCard onRedeemCode={onRedeemCode} />}
          </>
        )}
      </Section>

      {/* ───────────── 5.2 EIDOLON MANAGEMENT ───────────── */}
      <Section title="Your Eidolons" hint="Rename, switch the active Eidolon, or delete one. Deleting removes its locked protocol and all of its progress logs.">
        {eidolons.length === 0 && (
          <div style={{ ...S.card, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No Eidolons yet.</div>
        )}
        {eidolons.map(eid => (
          <EidolonRow
            key={eid.id}
            eid={eid}
            isActive={eid.id === activeEidolonId}
            canDelete={eidolons.length > 1}
            isPro={isPro}
            onSwitch={() => onSwitchEidolon(eid.id)}
            onRename={(name) => onRenameEidolon(eid.id, name)}
            onDelete={() => onDeleteEidolon(eid.id)}
          />
        ))}
      </Section>

      {/* ───────────── 5.3 ACCOUNT ───────────── */}
      <Section title="Account">
        {hasAccount ? (
          <AccountCard
            userEmail={userEmail}
            onChangePassword={onChangePassword}
            onSignOut={onSignOut}
            onDeleteAccount={onDeleteAccount}
          />
        ) : (
          <div style={{ ...S.card, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
            You're using Alki without an account. Your profile lives only on this device. Create an account from the start screen to sync across devices and manage account settings.
          </div>
        )}
      </Section>

      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.5, textAlign: "center", paddingBottom: 8 }}>
        Alki is a research and educational platform — not medical advice. Consult a licensed healthcare provider before initiating any protocol.
      </p>
    </div>
  );
}

const unitSuffix = {
  position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)",
  color: "rgba(255,255,255,0.35)", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", pointerEvents: "none",
};

function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ fontSize: 14, color: "#fff", fontWeight: 600, textAlign: "right", maxWidth: "62%" }}>{value}</span>
    </div>
  );
}

// ── 5.2 — one eidolon's row, with inline rename + two-step delete ──
function EidolonRow({ eid, isActive, canDelete, isPro = false, onSwitch, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(eid.name || "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const locked = eid.lockedAt != null;
  const count = (eid.compounds || []).length;
  const status = locked
    ? `Locked · ${count} compound${count === 1 ? "" : "s"}`
    : (count > 0 ? `Draft · ${count} compound${count === 1 ? "" : "s"}` : "Empty draft");

  const commitRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed) onRename(trimmed);
    setRenaming(false);
  };

  return (
    <div style={{ ...S.card, borderColor: isActive ? "rgba(26,232,122,0.3)" : "rgba(255,255,255,0.08)", background: isActive ? "rgba(26,232,122,0.05)" : "rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
              maxLength={30}
              style={{ ...S.input, padding: "8px 12px", fontSize: 15 }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: "#fff" }}>{eid.name}</span>
              {isActive && (
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1ae87a", background: "rgba(26,232,122,0.12)", border: "1px solid rgba(26,232,122,0.25)", borderRadius: 100, padding: "2px 8px" }}>Active</span>
              )}
            </div>
          )}
          {!renaming && (
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
              {locked && <span>🔒</span>}<span>{status}</span>
            </div>
          )}
        </div>
      </div>

      {confirmingDelete ? (
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <div style={{ fontSize: 12.5, color: "#fca5a5", lineHeight: 1.5, marginBottom: 10 }}>
            Delete <strong>{eid.name}</strong>? This permanently removes its locked protocol and every progress log tied to it. This can't be undone.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmingDelete(false)} style={{ ...S.btnOutline, padding: "10px", flex: 1, borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
            <button onClick={() => { setConfirmingDelete(false); onDelete(); }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Delete forever</button>
          </div>
        </div>
      ) : (
        !renaming && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {!isActive && (
              <button onClick={onSwitch} style={pillBtn(S.accent)}>Switch to</button>
            )}
            {/* Sprint 7 — renaming is a Pro customization. Free users see a
                locked control; the Subscription section above is the upgrade path. */}
            {isPro ? (
              <button onClick={() => { setNameInput(eid.name || ""); setRenaming(true); }} style={pillBtn("rgba(255,255,255,0.6)")}>Rename</button>
            ) : (
              <button disabled title="Renaming is an Alki Pro feature" style={{ ...pillBtn("rgba(255,255,255,0.6)"), opacity: 0.4, cursor: "not-allowed" }}>Rename 🔒</button>
            )}
            <button
              onClick={() => canDelete && setConfirmingDelete(true)}
              disabled={!canDelete}
              title={canDelete ? "Delete this Eidolon" : "You can't delete your only Eidolon"}
              style={{ ...pillBtn("#fca5a5"), ...(canDelete ? {} : { opacity: 0.35, cursor: "not-allowed" }) }}
            >Delete</button>
          </div>
        )
      )}
    </div>
  );
}

function pillBtn(color) {
  return {
    padding: "7px 14px", borderRadius: 100, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color,
  };
}

// ── 5.3 — account card (change password / sign out / delete account) ──
function AccountCard({ userEmail, onChangePassword, onSignOut, onDeleteAccount }) {
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState(null);

  // B1 — Sign Out asks for confirmation before tearing down the session, so an
  // accidental tap can't drop the user out. Inline confirm mirrors the delete flow.
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const changePassword = async () => {
    setPwBusy(true); setPwMsg(null); setPwErr(null);
    try {
      const msg = await onChangePassword();
      setPwMsg(msg || "Password reset link sent. Check your email.");
    } catch (e) {
      setPwErr(e?.message || "Couldn't send the reset link. Try again.");
    } finally {
      setPwBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDelBusy(true); setDelErr(null);
    try {
      await onDeleteAccount();
      // On success the app signs out and routes away — nothing more to do here.
    } catch (e) {
      setDelErr(e?.message || "Couldn't delete your account. Try again.");
      setDelBusy(false);
    }
  };

  return (
    <>
      <div style={S.card}>
        {userEmail && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Signed in as</span>
            <span style={{ fontSize: 13.5, color: "#fff", fontWeight: 600, maxWidth: "62%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>
          </div>
        )}

        {pwMsg && <Banner kind="ok">{pwMsg}</Banner>}
        {pwErr && <Banner kind="err">{pwErr}</Banner>}

        <button onClick={changePassword} disabled={pwBusy} style={{ ...S.btnOutline, marginBottom: 10, ...(pwBusy ? S.btnDisabled : {}) }}>
          {pwBusy ? "Sending…" : "Change Password"}
        </button>
        {!confirmingSignOut ? (
          <button onClick={() => setConfirmingSignOut(true)} style={{ ...S.btnOutline, borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
            Sign Out
          </button>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 10, lineHeight: 1.5 }}>
              Sign out of this device? You'll need to sign back in to reach your Eidolons.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmingSignOut(false)} style={{ ...S.btnOutline, flex: 1, borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>
                Cancel
              </button>
              <button onClick={onSignOut} style={{ ...S.btnOutline, flex: 1, borderColor: "rgba(255,255,255,0.25)", color: "#fff" }}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone — account deletion */}
      <div style={{ ...S.card, borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fca5a5", marginBottom: 4 }}>Delete Account</div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 0 12px" }}>
          Permanently erases your account and every piece of your data — profile, all Eidolons, and all progress logs. This cannot be undone.
        </p>

        {delErr && <Banner kind="err">{delErr}</Banner>}

        {!confirmingDelete ? (
          <button onClick={() => { setConfirmingDelete(true); setConfirmText(""); setDelErr(null); }} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "1.5px solid rgba(239,68,68,0.4)", background: "transparent", color: "#fca5a5", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Delete My Account
          </button>
        ) : (
          <div>
            <label style={{ ...S.label, color: "rgba(255,255,255,0.5)" }}>Type DELETE to confirm</label>
            <input
              autoFocus
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{ ...S.input, marginBottom: 10, borderColor: "rgba(239,68,68,0.3)" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setConfirmingDelete(false); setConfirmText(""); }} disabled={delBusy} style={{ ...S.btnOutline, flex: 1, borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
              <button
                onClick={deleteAccount}
                disabled={confirmText.trim() !== "DELETE" || delBusy}
                style={{ flex: 1.3, padding: "13px", borderRadius: 12, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", ...((confirmText.trim() !== "DELETE" || delBusy) ? S.btnDisabled : {}) }}
              >
                {delBusy ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
