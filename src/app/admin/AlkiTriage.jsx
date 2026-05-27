import { useState } from "react";

// ALKI — Triage board. Source of truth is the Supabase `feedback` table.
// Snapshot 2026-05-27 · build line v0.1.77.
// The LIST below shows only active work (open + deferred). Shipped items live
// in the CHANGELOG, not the list. Update SHIPPED + CHANGELOG each session.

const SHIPPED = 49; // resolved-and-recorded count (lives in the changelog)

const CHANGELOG = [
  { date: "2026-05-25/26", session: "Session 1 — Usability Engineering", changes: [
    { rank: "—", title: "Dev toggle for debug panel", desc: "⚙ button, in-session only." },
    { rank: "—", title: "Dead import cleanup", desc: "Removed Home + getRegressionFactor." },
    { rank: "—", title: "Floating bug report button", desc: "FeedbackFAB → Supabase + localStorage." },
    { rank: "—", title: "Baseline User (Dev)", desc: "M/28/5'10\"/185lb/20%BF, full advanced stats." },
    { rank: 1, title: "Auth bypass on password recovery", desc: "onAuthStateChange before getSession + recoveryFired flag." },
    { rank: 2, title: "Eidolons share stats/state", desc: "flushCurrentEidolon() + refs + spread-copy." },
    { rank: 3, title: "Protocol persists after removal", desc: "'Discard Changes' restores locked protocol." },
    { rank: 4, title: "Log progress button broken", desc: "localStorage fallback + eidolon_id scoping." },
    { rank: 5, title: "Timeline fallback profiles", desc: "All 71 compounds parsed from catalog." },
    { rank: 6, title: "Builder guided path", desc: "Two-path UX: Recommend vs Build My Own." },
    { rank: 7, title: "28 compounds overwhelming", desc: "Category filter tabs + cap at 6." },
    { rank: 8, title: "Every stack = 'Body Recomp'", desc: "Rewrote detectPhase(): multi-goal BF-stratification." },
    { rank: "9/10", title: "Risk ladder, all tiers visible", desc: "Conservative → Moderate → Aggressive." },
    { rank: 12, title: "Goals blank in baseline", desc: "Baseline passes goals: []." },
    { rank: 13, title: "Stat units", desc: "'pts' with 0–20 scale note." },
    { rank: 14, title: "Fixed CTA bar", desc: "position:fixed at viewport bottom." },
    { rank: "15–20", title: "Home screen + daily experience", desc: "Avatar → progress → checklist → quick links; daily dose check-in; goals read-only when locked; contextual Q&A; free eidolon switching; name on creation." },
  ]},
  { date: "2026-05-26/27", session: "Session 2 — Perf, Filter & Nav", changes: [
    { rank: 21, title: "Avatar projected-morph exaggeration", desc: "Visible before/after on mobile." },
    { rank: 25, title: "Unified timeline buttons", desc: "All 3 entries → 'Protocol Timeline'." },
    { rank: "28–30", title: "Timeline polish", desc: "Ellipsis phase labels; drop irrelevant PCT; legend under bar + filtered; visible back-button pill." },
    { rank: 39, title: "Support add-to-stack", desc: "Add button for support compounds (Tadalafil)." },
    { rank: "41/42", title: "Timeline support roles", desc: "Lanes grouped by role; on-cycle support shown; BPC no longer a mystery pick." },
    { rank: 43, title: "Live safety badge in builder", desc: "Catalog fallback so all compounds move the score." },
    { rank: 45, title: "Goal filter chips", desc: "Later superseded by #51-57." },
    { rank: 47, title: "Avatar mobile-hang crash fix", desc: "Demand frameloop + drop shadows." },
    { rank: 48, title: "P0 lag fix (measure-first)", desc: "Built PerfHUD + perf_logs; removed backdrop-filter blur (see-all 17→120fps)." },
    { rank: 49, title: "Muscle-filter data fix", desc: "Removed wrong 'muscle' tag from 5 SERMs/AIs." },
    { rank: 50, title: "Body-morph dead-zone", desc: "Recovery shows identical before/after; autoRotate off." },
    { rank: "51–57", title: "Filter redesign", desc: "Two-tier connected goal→type filter, scoped to goal (surfaces SARM), matched + browse-all, Best match/Name/Risk/Category sort, Clear button." },
    { rank: "58/59", title: "'Your Stack' section", desc: "Selected compounds as removable chips, visible in both lanes." },
    { rank: 61, title: "Inline goal selection", desc: "In the builder; selected sort to front; gone once locked." },
    { rank: 62, title: "'Manage ▾' dropdown", desc: "Committed-home Modify/Switch/New; bottom grid now Projection + Timeline." },
    { rank: 63, title: "Removed dead reset icon", desc: "Cryptic top-left refresh on the profile card." },
    { rank: 66, title: "Rounded safety scores", desc: "Liver/Suppression/Cardio Math.round'd — no FP tails." },
    { rank: 68, title: "Weight tile on projection", desc: "current → projected lbs, lean mass held." },
    { rank: "—", title: "Hotfixes / infra", desc: "validIds crash; v0.1.77 bump; body-fat essential-fat floor; per-eidolon progress logs; PerfHUD + perf_logs table." },
  ]},
];

// Active board — open + deferred only. Shipped items are NOT listed here.
const ITEMS = [
  // ── Dashboard / builder ──
  { id: 11, rank: 11, screen: "Dashboard", cat: "pain_point", sev: "P2", noted: "dallas", status: "open", title: "Live stat projection on profile card", desc: "The app's goal is learning what compounds do — seeing impact means navigating away. A live projection on the profile card that updates as compounds are added would be optimal.", fix: "Core 'learn what each does' feature; #50 dead-zone is a building block. Likely needs the Eidolon simulate() engine." },
  { id: 22, rank: 22, screen: "Dashboard", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "2D SVG avatar looks bad", desc: "The 2D SVG avatar isn't compelling.", fix: "Rework (tangled with the deferred LOD work)." },
  { id: 60, rank: 60, screen: "Dashboard", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "Generator doesn't update on goal change", desc: "Stack generator may not reflect a goal change (or gives a 'safe' stack).", fix: "DIAGNOSED: machinery is correct (handleGoalToggle + memo + goal-aware detectPhase); likely a UX gap once a stack is loaded. Awaiting Austin repro." },
  { id: 64, rank: 64, screen: "Dashboard", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "Screens load at the bottom", desc: "Some screens open scrolled down; all new screen loads should be consistent.", fix: "Normalize scroll-to-top on every screen load." },
  { id: "67a", rank: 67, screen: "Dashboard", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "SR-9009 missing 'reason in stack' text", desc: "No reason-in-stack text for SR-9009 — looks like missing copy.", fix: "Add the reason text, or a 'not needed' flag. (Rank collides with #67b — renumber one.)" },
  { id: "67b", rank: 67, screen: "Dashboard", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "Safety badge updates above the fold", desc: "#43 follow-up: the live Stack Safety badge updates correctly but sits above the fold, so after adding a compound lower down you must scroll up to see it.", fix: "Echo the score near the add action, or a sticky mini-indicator. (Rank collides with #67a — renumber one.)" },
  { id: 70, rank: 70, screen: "Dashboard", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "Tadalafil add bounces to the builder", desc: "Adding Tadalafil bounces back to the builder and forces a 'see projection' step.", fix: "Auto-add + auto-update in place." },
  { id: 37, rank: 37, screen: "Dashboard", cat: "idea", sev: "P3", noted: "both", status: "open", title: "New-user tutorial walkthrough", desc: "No first-time guidance — explain what an eidolon is, the goal of the app, how to use it.", fix: "First-run overlay, 4–5 steps." },
  { id: 40, rank: 40, screen: "Dashboard", cat: "idea", sev: "P3", noted: "dallas", status: "open", title: "Dev: date/time simulation", desc: "Simulate timeline/cultivation progression for testing.", fix: "Dev-mode date override to fast-forward state." },
  { id: 44, rank: 44, screen: "Dashboard", cat: "idea", sev: "P2", noted: "dallas", status: "open", title: "ROA changes bioavailability", desc: "Route of administration changes the protocol — BPC-157 oral vs SubQ are almost different compounds. Data-model gap.", fix: "Add an ROA field per compound; ROA selector with per-variant dosing/use-case." },
  { id: 46, rank: 46, screen: "Dashboard", cat: "idea", sev: "P3", noted: "dallas", status: "open", title: "Search for power users", desc: "Users who know what they want should search by name instead of browsing.", fix: "Search bar above the compound list (name / category / keyword)." },

  // ── Onboarding ──
  { id: 31, rank: 31, screen: "Onboarding", cat: "pain_point", sev: "P2", noted: "dallas", status: "open", title: "BF% note pre-decides the goal", desc: "The body-fat note already tells the user which goal to pursue — unnecessary for a learning app.", fix: "Neutral range label only." },
  { id: 32, rank: 32, screen: "Onboarding", cat: "pain_point", sev: "P2", noted: "dallas", status: "open", title: "Advanced stats framing", desc: "Most users won't hit 'advanced'; reframe as an equipment-based optional prompt.", fix: "'If you have InBody/DEXA, expand Advanced Stats for an optimal experience.'" },

  // ── Modeler ──
  { id: 33, rank: 33, screen: "Modeler", cat: "bug", sev: "P2", noted: "dallas", status: "open", title: "Training box doesn't save / wrong place", desc: "Training & lifestyle box doesn't save or affect anything, and surfaces after lock-in.", fix: "Wire it in, or move it to onboarding." },
  { id: 34, rank: 34, screen: "Modeler", cat: "bug", sev: "P2", noted: "dallas", status: "open", title: "FFMI unexplained; 'Modeler' a poor word", desc: "Advanced stats are great but FFMI is unexplained — if the user doesn't know it, they're lost.", fix: "Tooltips; rename 'Modeler.'" },
  { id: 69, rank: 69, screen: "Modeler", cat: "bug", sev: "P2", noted: "austin", status: "deferred", title: "BF% inconsistent with projection screen", desc: "Modeler BF% differs from the projection screen for the same stack — two different projection engines.", fix: "DEFERRED — engine revamp: simulate() becomes the single source of truth (projection screen + avatar morph + Modeler), at a neutral/maintenance default. No interim number patching." },

  // ── Progress ──
  { id: 35, rank: 35, screen: "Progress", cat: "bug", sev: "P2", noted: "dallas", status: "open", title: "No cycle start / tracking", desc: "When did the cycle start? Nothing tracks it, and only 2 body measurements.", fix: "Set start at lock-in; show Week X of Y; more measurements." },
  { id: 36, rank: 36, screen: "Progress", cat: "bug", sev: "P2", noted: "dallas", status: "open", title: "Subjective categories undefined", desc: "3 subjective categories, undefined, and shown only here — nowhere else in the app.", fix: "Define each; introduce at onboarding." },

  // ── Timeline ──
  { id: 65, rank: 65, screen: "Timeline", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "No easy Home button", desc: "3 screens deep — there should be an easy Home button.", fix: "Add a Home affordance." },
  { id: 71, rank: 71, screen: "Timeline", cat: "bug", sev: "P2", noted: "dallas", status: "open", title: "Cycle length editable on locked protocol", desc: "Cycle length shouldn't be editable on a locked protocol. Recommended stacks should have calculated cycles; build-your-own gets suggested timelines.", fix: "Lock cycle on committed; calculated cycles for recommended, suggested for build-your-own." },

  // ── Avatar ──
  { id: "lod", rank: "—", screen: "Avatar", cat: "idea", sev: "P3", noted: "dallas", status: "deferred", title: "Adaptive graphics quality (LOD)", desc: "#47 throttled every avatar globally; small 1–2 compound stacks could run full quality.", fix: "DEFERRED — scale fidelity inversely to stack size + device capability." },
];

const SEV_COLORS = { P1: "#ff4d4d", P2: "#f0a030", P3: "#888" };
const CAT_LABELS = { bug: "🐛 Bug", pain_point: "😤 Pain", idea: "💡 Idea" };
const NOTED_LABELS = { dallas: "Dallas", austin: "Austin", both: "★ Both" };
const NOTED_COLORS = { dallas: "rgba(100,160,255,0.2)", austin: "rgba(255,180,60,0.2)", both: "rgba(34,214,138,0.2)" };
const NOTED_TEXT = { dallas: "rgba(100,160,255,0.8)", austin: "rgba(255,180,60,0.8)", both: "#22D68A" };
const STATUS_STYLE = {
  open: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", label: "Open" },
  deferred: { bg: "rgba(140,120,255,0.08)", border: "rgba(140,120,255,0.2)", color: "rgba(140,120,255,0.7)", label: "Deferred" },
};
const SCREEN_ORDER = ["Dashboard", "Onboarding", "Modeler", "Progress", "Timeline", "Avatar", "Social"];

const displayRank = (r) => (r === "—" || r === null || r === undefined ? "—" : "#" + r);

export default function Triage() {
  const [filterSev, setFilterSev] = useState("All");
  const [filterNoted, setFilterNoted] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set());
  const [showChangelog, setShowChangelog] = useState(false);

  const filtered = ITEMS.filter(r =>
    (filterSev === "All" || r.sev === filterSev) &&
    (filterNoted === "All" || r.noted === filterNoted)
  );

  const counts = {
    shipped: SHIPPED,
    open: ITEMS.filter(r => r.status === "open").length,
    deferred: ITEMS.filter(r => r.status === "deferred").length,
    P1: ITEMS.filter(r => r.sev === "P1").length,
    P2: ITEMS.filter(r => r.sev === "P2").length,
    P3: ITEMS.filter(r => r.sev === "P3").length,
    both: ITEMS.filter(r => r.noted === "both").length,
  };
  const total = counts.shipped + counts.open + counts.deferred;
  const pct = Math.round((counts.shipped / total) * 100);

  const screens = SCREEN_ORDER.filter(s => filtered.some(r => r.screen === s));
  const toggle = (s) => setCollapsed(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const pill = (label, active, onClick, color) => (
    <button key={label} onClick={onClick} style={{ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: active ? (color || "rgba(255,255,255,0.12)") : "rgba(255,255,255,0.04)", border: `1px solid ${active ? (color || "rgba(255,255,255,0.25)") : "rgba(255,255,255,0.08)"}`, color: active ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{label}</button>
  );

  return (
    <div style={{ background: "#0a0a0a", color: "#fff", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", padding: "32px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>ALKI — Triage</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: "6px 0 0" }}>
            <span style={{ color: "#22D68A" }}>{counts.shipped} shipped</span> · <span style={{ color: "#ff4d4d" }}>{counts.open} open</span> · <span style={{ color: "rgba(140,120,255,0.7)" }}>{counts.deferred} deferred</span> · {total} total
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #22D68A, #1ae87a)" }} />
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{pct}%</span>
          </div>
        </div>

        {/* Changelog (shipped work lives here) */}
        <button onClick={() => setShowChangelog(v => !v)} style={{ background: "rgba(34,214,138,0.06)", border: "1px solid rgba(34,214,138,0.15)", color: "#22D68A", fontSize: 12, fontWeight: 600, padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", marginBottom: 20, width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between" }}>
          <span>📋 Changelog — shipped work ({CHANGELOG.reduce((n, s) => n + s.changes.length, 0)} entries)</span>
          <span style={{ fontSize: 10, color: "rgba(34,214,138,0.5)" }}>{showChangelog ? "▲" : "▼"}</span>
        </button>

        {showChangelog && (
          <div style={{ marginBottom: 24, borderRadius: 12, border: "1px solid rgba(34,214,138,0.1)", overflow: "hidden" }}>
            {CHANGELOG.map((s, si) => (
              <div key={si}>
                <div style={{ padding: "10px 16px", background: "rgba(34,214,138,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#22D68A" }}>{s.date}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 12 }}>{s.session}</span>
                </div>
                {s.changes.map((ch, ci) => (
                  <div key={ci} style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "grid", gridTemplateColumns: "56px 1fr", gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: ch.rank === "—" ? "rgba(255,255,255,0.2)" : "#22D68A" }}>{ch.rank === "—" ? "DEV" : "#" + ch.rank}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 2 }}>{ch.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{ch.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {pill("All", filterSev === "All", () => setFilterSev("All"))}
          {pill(`P1·${counts.P1}`, filterSev === "P1", () => setFilterSev(filterSev === "P1" ? "All" : "P1"), "rgba(255,77,77,0.35)")}
          {pill(`P2·${counts.P2}`, filterSev === "P2", () => setFilterSev(filterSev === "P2" ? "All" : "P2"), "rgba(240,160,48,0.35)")}
          {pill(`P3·${counts.P3}`, filterSev === "P3", () => setFilterSev(filterSev === "P3" ? "All" : "P3"), "rgba(136,136,136,0.35)")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {pill("All reporters", filterNoted === "All", () => setFilterNoted("All"))}
          {pill(`★ Both·${counts.both}`, filterNoted === "both", () => setFilterNoted(filterNoted === "both" ? "All" : "both"), "rgba(34,214,138,0.35)")}
          {pill("Dallas", filterNoted === "dallas", () => setFilterNoted(filterNoted === "dallas" ? "All" : "dallas"), "rgba(100,160,255,0.35)")}
          {pill("Austin", filterNoted === "austin", () => setFilterNoted(filterNoted === "austin" ? "All" : "austin"), "rgba(255,180,60,0.35)")}
        </div>

        {/* Grouped by screen */}
        {screens.map(screen => {
          const items = filtered.filter(r => r.screen === screen);
          const isCollapsed = collapsed.has(screen);
          return (
            <div key={screen} style={{ marginBottom: 20 }}>
              <div onClick={() => toggle(screen)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 16px", borderRadius: isCollapsed ? 12 : "12px 12px 0 0", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderBottom: isCollapsed ? undefined : "none" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", flex: 1 }}>{screen}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{items.length}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.15s" }}>▼</span>
              </div>
              {!isCollapsed && (
                <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
                  {items.map(r => {
                    const st = STATUS_STYLE[r.status] || STATUS_STYLE.open;
                    return (
                      <div key={r.id}>
                        <div onClick={() => setExpanded(expanded === r.id ? null : r.id)} style={{ display: "grid", gridTemplateColumns: "40px 44px 1fr 70px 64px", padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.03)", background: expanded === r.id ? "rgba(255,255,255,0.03)" : "transparent", alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{displayRank(r.rank)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: SEV_COLORS[r.sev], background: `${SEV_COLORS[r.sev]}15`, padding: "3px 6px", borderRadius: 6, width: "fit-content" }}>{r.sev}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", lineHeight: 1.4, paddingRight: 8 }}>{r.title}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, padding: "3px 7px", borderRadius: 6, textAlign: "center" }}>{st.label}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: NOTED_TEXT[r.noted], background: NOTED_COLORS[r.noted], padding: "3px 7px", borderRadius: 6, textTransform: "uppercase", textAlign: "center" }}>{NOTED_LABELS[r.noted]}</span>
                        </div>
                        {expanded === r.id && (
                          <div style={{ padding: "12px 16px 16px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>
                              <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{r.screen}</span> · {CAT_LABELS[r.cat]}
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 10 }}>{r.desc}</div>
                            <div style={{ fontSize: 12, color: r.status === "deferred" ? "rgba(140,120,255,0.85)" : "#22D68A", lineHeight: 1.6, padding: "8px 12px", background: r.status === "deferred" ? "rgba(140,120,255,0.06)" : "rgba(34,214,138,0.06)", borderRadius: 8, borderLeft: `3px solid ${r.status === "deferred" ? "rgba(140,120,255,0.3)" : "rgba(34,214,138,0.3)"}` }}>
                              <strong style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: r.status === "deferred" ? "rgba(140,120,255,0.7)" : "rgba(34,214,138,0.7)" }}>{r.status === "deferred" ? "Deferred — plan" : "Proposed fix"}</strong><br />{r.fix}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 28, fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", fontStyle: "italic" }}>
          Alki · ἀλκή · snapshot 2026-05-27 · source of truth: Supabase feedback table.
        </div>
      </div>
    </div>
  );
}
