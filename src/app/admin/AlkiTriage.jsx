import { useState } from "react";

// ALKI — Triage board. Source of truth is the Supabase `feedback` table.
// Snapshot 2026-05-28 · build line v0.1.99.
// The LIST below shows only active work (open + deferred). Shipped items live
// in the CHANGELOG, not the list. Update SHIPPED + CHANGELOG each session.

const SHIPPED = 65; // resolved-and-recorded count (lives in the changelog)

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
  { date: "2026-05-27/28", session: "Session 3 — Builder, Modeler & Home polish (v0.1.95–0.1.99)", changes: [
    { rank: 11, title: "Live stat projection on profile card", desc: "v0.1.99: live projected BF/weight/lean-mass on builder card, reactive to stack changes." },
    { rank: 22, title: "2D SVG avatar polish", desc: "v0.1.99: depth gradient, warmer palette, grounding shadow (fallback path only)." },
    { rank: 31, title: "BF% note pre-decided the goal", desc: "v0.1.96: reworded to informational, not goal-prescribing." },
    { rank: 32, title: "Advanced-stats framing", desc: "v0.1.96: reframed as optional/equipment-based prompt." },
    { rank: 33, title: "Training box didn't save", desc: "v0.1.99: Analytics training inputs now persist across sessions." },
    { rank: 34, title: "FFMI unexplained; rename Modeler", desc: "v0.1.99: added FFMI explainer; renamed nav to 'Analytics'." },
    { rank: 35, title: "No cycle start / tracking", desc: "v0.1.99: Cycle Start + day counter; waist added as 3rd measurement." },
    { rank: 36, title: "Subjective categories undefined", desc: "v0.1.96: intro + per-score definitions on check-in." },
    { rank: 46, title: "Search for power users", desc: "v0.1.96: free-text compound search across matched + browse-all." },
    { rank: 60, title: "Generator goal-change update", desc: "Batch 1 / v0.1.95: re-detects phase + re-expands ladder on goal change." },
    { rank: 64, title: "Screens load at the bottom", desc: "v0.1.95: scroll-to-top on every screen + view change." },
    { rank: 65, title: "No easy Home button", desc: "v0.1.99: ALKI wordmark home shortcut + fixed top-right home on inner screens." },
    { rank: "67a", title: "SR-9009 missing reason text", desc: "v0.1.96: catalog-fallback compounds show real role-in-stack text." },
    { rank: "67b", title: "Safety badge above the fold", desc: "v0.1.96: live score echoed in fixed CTA bar; unified score basis." },
    { rank: 70, title: "Tadalafil add bounced to builder", desc: "v0.1.95: support compounds add in place on projection view." },
    { rank: 71, title: "Cycle length editable when locked", desc: "v0.1.97: cycle calculated from stack — read-only when locked, suggested for build-your-own." },
    { rank: "—", title: "Avatar dose glow + PCT SERMs", desc: "v0.1.97/98: hero glow scales with dose completion; Support Layer offers PCT SERMs (Tamoxifen/Enclomiphene) as add-to-stack." },
  ]},
];

// Active board — open + deferred only. Shipped items are NOT listed here.
// Synced to Supabase 2026-05-28: 16 builder/Modeler/home items resolved in
// Session 3 (now in the CHANGELOG); 5 new items added (ranks 72–76).
const ITEMS = [
  // ── Dashboard / builder ──
  { id: "b7ee70fb", rank: 72, screen: "Dashboard", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "Clear filter also clears selected compounds", desc: "Pressing the filter 'Clear' button wipes the user's selected compounds, not just the active filters.", fix: "ROOT CAUSE: clearSelection (AlkiApp.jsx ~L2342) does setSelectedCompounds([]) AND resets goal/cat/search; the 'Clear (N)' filter chip calls it, so it nukes the stack. FIX (<10 lines): split into clearFilters (filters only) and clearSelection (selection only); wire the filter chip to clearFilters." },
  { id: 37, rank: 37, screen: "Dashboard", cat: "idea", sev: "P3", noted: "both", status: "open", title: "New-user tutorial walkthrough", desc: "No first-time guidance — explain what an eidolon is, the goal of the app, how to use it.", fix: "First-run overlay, 4–5 steps." },
  { id: 40, rank: 40, screen: "Dashboard", cat: "idea", sev: "P3", noted: "dallas", status: "open", title: "Dev: date/time simulation", desc: "Simulate timeline/cultivation progression for testing.", fix: "Dev-mode date override to fast-forward state." },
  { id: 44, rank: 44, screen: "Dashboard", cat: "idea", sev: "P2", noted: "dallas", status: "open", title: "ROA changes bioavailability", desc: "Route of administration changes the protocol — BPC-157 oral vs SubQ are almost different compounds. Data-model gap.", fix: "Add an ROA field per compound; ROA selector with per-variant dosing/use-case." },
  { id: "8c9a0ea1", rank: 74, screen: "Dashboard", cat: "idea", sev: "P3", noted: "austin", status: "open", title: "Make summary boxes clickable to edit", desc: "Each home box (goals, protocol, etc.) should be a clickable button that opens for editing — e.g. tap your goals list to change it in place.", fix: "Make goals/protocol/profile summary cards tappable, opening the existing edit flow inline. Pairs with Plan A home-screen work." },
  { id: "bb7dd494", rank: 75, screen: "Dashboard", cat: "idea", sev: "P3", noted: "austin", status: "open", title: "Personalized avatar via selfie upload", desc: "Let users personalize the avatar with a facial selfie upload.", fix: "Plan E (photo capture) + Avaturn 'MAKE IT ME' path (currently disabled). Scaffold UI first; needs face→avatar pipeline decision before build." },
  { id: "d92580fc", rank: 76, screen: "Dashboard", cat: "idea", sev: "P3", noted: "dallas", status: "open", title: "Compound list curation / Popular tag", desc: "Instead of a fixed 'commonly used' default, let the engine rank/optimize; consider a 'Popular' tag + filter chip so users can optionally surface common compounds. (Default-visible/hidden split was declined in favor of optimization.)", fix: "Add a 'Popular' tag to the compound data + an optional filter chip; defer the engine-ranked ordering to the recommendation-engine revamp." },

  // ── Onboarding ──
  // (all onboarding items shipped in Session 3 — see CHANGELOG)

  // ── Modeler ──
  { id: 69, rank: 69, screen: "Modeler", cat: "bug", sev: "P2", noted: "austin", status: "deferred", title: "BF% inconsistent with projection screen", desc: "Modeler BF% differs from the projection screen for the same stack — two different projection engines.", fix: "DEFERRED — engine revamp: simulate() becomes the single source of truth (projection screen + avatar morph + Modeler), at a neutral/maintenance default. No interim number patching." },

  // ── Timeline ──
  { id: "73b5170e", rank: 73, screen: "Timeline", cat: "bug", sev: "P2", noted: "austin", status: "open", title: "GHK-Cu cycle too short (4 weeks)", desc: "GHK-Cu is recommended for only 4 weeks — not long enough to see results. Timelines must reflect real researched protocols.", fix: "ROOT CAUSE: data/protocolProtocols.js ghkcu has cycle.onWeeks/standardCycleWeeks = 4, yet its own week-by-week notes results 'mature with repeated 30-day cycles' (wks 5–8). FIX (data, <10 lines): extend ghkcu on-cycle to a researched 8–12 wks and align week-by-week. Part of the broader protocol-data review (credibility-sensitive — verify against literature)." },

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
          Alki · ἀλκή · snapshot 2026-05-28 · source of truth: Supabase feedback table.
        </div>
      </div>
    </div>
  );
}
