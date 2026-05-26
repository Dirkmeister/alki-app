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

8. **After each session**, regenerate the triage artifact (JSX + PDF) with current status.

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

**Last updated:** 2026-05-26

| Tier | Status | Done/Total |
|------|--------|------------|
| 1 | ✓ COMPLETE | 5/5 |
| 2 | ✓ COMPLETE | 8/9 |
| 3 | ✓ COMPLETE | 6/6 |
| 4 | Open | 0/4 |
| 5 | Partial | 2/6 |
| 6 | Open | 0/6 |
| 7 | Open | 0/2 |
| 8 | NEW | 0/8 |
| **Total** | | **21/46 (46%)** |

### Open Items

**Tier 4 — Avatar:** #21 P1 morph too subtle, #22 P2 SVG quality, #23 P2 selfie features, #24 P2 face upload
**Tier 5 — Timeline:** #25 P1 3 buttons, #28 P2 phase text, #29 P3 legend, #30 P3 back button
**Tier 6 — Polish:** #31 P2 BF% text, #32 P2 advanced stats, #33 P2 training box, #34 P2 FFMI, #35 P2 cycle date, #36 P2 subjective categories
**Tier 7 — Vision:** #37 P3 tutorial, #38 P3 social
**Tier 8 — New:** #39 P2 support auto-add, #40 P3 dev date sim, #41 P2 Tadalafil missing, #42 P2 BPC ghost in timeline, #43 P2 risk no update, #44 P2 ROA bioavailability, #45 P1 muscle goal no category, #46 P3 search

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
