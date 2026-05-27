# ALKI Bug Thread — Seed Prompt

> **Paste this into a new thread in the Alki project when starting a bug-fix session.**

---

## CONTEXT

You are fixing bugs and UX issues in the Alki app. This is a usability engineering session — we triage, fix, verify, and close.

**Before writing any code, read these files:**

1. `D:\1File System\2Projects\alki-app\src\app\AlkiApp.jsx` — the monolithic app
2. Any component file relevant to the bug (check `src/app/` and `src/app/screens/`)

**Do not start editing until you've read the relevant code and confirmed back to me what you see.**

---

## WORKFLOW

1. **Pull open bugs:** Run this SQL against Supabase project `fubrwttjgbthjarzledr`:
   ```sql
   select triage_rank, category, description, screen, created_at
   from public.feedback
   where status = 'open'
   order by triage_rank asc nulls last, created_at asc;
   ```

2. **I tell you which rank(s) to fix.** Or I describe a new issue and you triage it.

3. **Read the code first.** Use Filesystem MCP to read the relevant source files before editing.

4. **Fix it.** Write changes directly to the filesystem. Batch small fixes on the same screen.

5. **Give me commit text.** Two copy-text boxes: Update (title) and Description.

6. **Close the bug in Supabase:**
   ```sql
   update public.feedback
   set status = 'done', resolved_at = now(), commit_msg = '<commit title>'
   where triage_rank = <rank>;
   ```

7. **If I report a new bug**, triage it:
   - Assign next available `triage_rank` (check max: `select max(triage_rank) from feedback;`)
   - Assign a tier (1–8)
   - Assign severity (P1/P2/P3)
   - Insert or tag in Supabase

8. **After each session**, update **CURRENT STATUS** + **CHANGELOG** in this seed file and regenerate the triage JSX (in the repo) with current status.

---

## TRIAGE TIERS

| Tier | Name | Description |
|------|------|-------------|
| 1 | Ship-Blocking Bugs | ✓ COMPLETE. Broken features that erode trust. |
| 2 | Builder & Recommendation Engine | ✓ COMPLETE (#11 deferred). Core product loop. |
| 3 | Home Screen & Daily Experience | ✓ COMPLETE. Committed mode daily screen. |
| 4 | Avatar & Transformation | Visual impact — the TikTok feature. |
| 5 | Timeline Rebuild | Cycle timeline subsystem. |
| 6 | Onboarding, Modeler & Progress | Secondary screen polish. |
| 7 | Future Vision | Roadmap ideas, not built yet. |
| 8 | New Reports (Untriaged) | Fresh from feedback button, needs sorting. |

---

## CURRENT STATUS

**Last updated:** 2026-05-27 · build line v0.1.77

**Live board (Supabase `feedback`):** 49 shipped · 19 open · 2 deferred · (+10 merged/dups) — **70% of distinct items resolved.** Ranks now run to #71.

| Area | Status |
|------|--------|
| Ship-blocking bugs | ✓ complete |
| Builder & recommendation engine | ✓ core complete (filter redesign, Your Stack, inline goals); #11 live-stat-on-card still open |
| Home / daily experience | ✓ complete (committed-home redesign + Manage ▾ dropdown) |
| Timeline | ✓ rebuilt (#25/28/29/30/41/42); #65 home button + #71 cycle-length editing open |
| Avatar & transformation | #21 morph shipped; #22 SVG rework open; LOD deferred |
| Onboarding / Modeler / Progress | all open (#31–36) + #69 deferred |
| Perf | ✓ #47/#48 lag fixed (measure-first; removed backdrop-filter blur) |
| Future vision | #37/40/44/46 open |

### Open Items (live, by rank)

**Dashboard / builder**
- #11 pain_point — live stat projection on the profile card as compounds are added (the core "learn what each does" feature; #50 dead-zone is a building block)
- #22 bug — 2D SVG avatar quality rework
- #60 bug — generator should reflect goal changes (DIAGNOSED: machinery OK — handleGoalToggle + memo + goal-aware detectPhase; likely a UX gap once a stack is loaded — awaiting Austin repro)
- #64 bug — all screens should load at the top, consistently
- #67-a bug — SR-9009 missing "reason in stack" text (or add a "not needed" flag)
- #67-b bug — #43 follow-up: live Stack Safety badge updates above the fold; echo near the add action / sticky mini-indicator  *(rank collides with #67-a — renumber one)*
- #70 bug — adding Tadalafil should auto-add + auto-update in place, not bounce to the builder

**Onboarding**
- #31 pain_point — BF% note pre-decides the goal (unnecessary for a learning app)
- #32 pain_point — reframe the "advanced" note as an equipment-based optional prompt

**Modeler**
- #33 bug — training/lifestyle box doesn't save and surfaces after lock-in; should be in onboarding
- #34 bug — FFMI unexplained; "Modeler" may be a poor name

**Progress**
- #35 bug — no cycle start/tracking; only 2 body measurements
- #36 bug — 3 undefined subjective categories, shown only here

**Timeline**
- #65 bug — easy Home button when 3 screens deep
- #71 bug — cycle length not editable on locked protocols; recommended = calculated cycles, build-your-own = suggested

**Ideas / vision**
- #37 idea — new-user tutorial sequence
- #40 idea — DEV-only date/time simulation for the timeline
- #44 idea — route-of-administration bioavailability (BPC oral vs SubQ are different protocols)
- #46 idea — search for power users

### Deferred
- #69 bug — Modeler BF% inconsistent with the projection screen. **Engine revamp:** `simulate()` becomes the single source of truth (projection screen + avatar morph + Modeler all derive from it at a neutral/maintenance default). No interim number patching.
- (unranked) idea — adaptive graphics quality (LOD by stack size); #47 throttled every avatar globally despite GPU headroom on small stacks.

---

## SUPABASE QUICK REFERENCE

**Project ID:** `fubrwttjgbthjarzledr`

```sql
-- Pull open bugs
select triage_rank, category, description, screen from feedback where status='open' order by triage_rank asc nulls last;

-- Close a bug
update feedback set status='done', resolved_at=now(), commit_msg='fix: <desc>' where triage_rank=<N>;

-- New unranked reports
select id, category, description, screen, created_at from feedback where triage_rank is null and status='open' order by created_at;

-- Status summary
select status, count(*) from feedback group by status;
```

---

## DEV ENVIRONMENT

- **Filesystem MCP:** `D:\1File System\2Projects\alki-app`
- **Primary file:** `src/app/AlkiApp.jsx`
- **Deploy:** GitHub Desktop → Vercel auto-deploys
- **Testing:** Austin on mobile, Dallas via Baseline User
- **Bug reports:** 🐛 FeedbackFAB → Supabase `feedback` table
- **Debug panel:** ⚙ button on dashboard

---

## CHANGELOG

### Session 1 — 2026-05-25/26
- Dev: debug toggle, dead imports, FeedbackFAB, Baseline User
- #1 Auth bypass fix
- #2 Eidolon state isolation
- #3 Protocol persistence
- #4 Log button + eidolon_id scoping
- #5 Timeline fallback profiles (71 compounds)
- #6 Builder guided path (Dallas)
- #7 Category filters + cap
- #8 detectPhase() rewrite
- #9/#10 Risk tiers (Dallas)
- #12 Goals blank in baseline
- #13 Stat units
- #14 Fixed CTA bar
- #15–20 Tier 3 complete (Dallas)

### Session 2 — 2026-05-26/27
- #21 Avatar: exaggerate projected morph for visible before/after
- #25 Timeline: unified all 3 entry buttons to "Protocol Timeline"
- #28/#29/#30 Timeline: ellipsis phase labels, legend under bar + filtered to phases present, visible back-button pill
- #39 Support Layer: add-to-stack for support compounds (Tadalafil)
- #41/#42 Timeline: lanes grouped by role; on-cycle support shown; BPC no longer a mystery core pick
- #43 Live safety badge in builder + catalog fallback so all compounds move the score
- #45 Goal filter chips (later superseded by #51-57)
- #47 Avatar mobile-hang crash fix (demand frameloop, drop shadows)
- #48 P0 lag — MEASURE-FIRST (built PerfHUD recorder + `perf_logs` table); removed backdrop-filter blur from S.card (see-all 17→120fps, typing 7→49fps; compositing-bound, zero JS blocking)
- #49 Data: removed wrong "muscle" goal tag from 5 SERMs/AIs (PCT ancillaries)
- #50 Body-morph dead-zone — recovery/support stacks show identical before/after; 3D autoRotate default off
- #51-57 Filter redesign — two-tier connected goal→type filter (scoped to goal, surfaces SARM), applied to matched + browse-all, Best match/Name/Risk/Category sort, Clear button
- #58/#59 "Your Stack" — selected compounds as removable chips, visible in both lanes
- #61 Inline goal selection in the builder; selected goals sort to front; gone once locked
- #62 "Manage ▾" committed-home dropdown (Modify/Switch/New); bottom grid now just Projection + Timeline
- #63 Removed dead top-left reset/refresh icon on the profile card
- #66 Rounded Liver/Suppression/Cardio safety scores at source (no FP tails)
- #68 Weight tile on the projection screen (current→projected lbs, lean mass held)
- #69 DEFERRED — projection-engine reconciliation; simulate() to become single source of truth in a future revamp
- Hotfix: validIds crash (regression from #43); version bump → v0.1.77; body-fat floored at essential-fat %; progress logs scoped strictly per-eidolon
- Infra: PerfHUD opt-in perf overlay/recorder + `perf_logs` table (measure→fix→re-measure workflow)

> **Note (2026-05-27):** the original 8-tier model has drifted as the board grew to #71. Current status is driven by the live Supabase board (see CURRENT STATUS above), not the tier table. The triage JSX in the repo is kept current each session.
