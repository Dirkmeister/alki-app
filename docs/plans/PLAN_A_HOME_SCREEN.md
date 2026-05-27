# Plan A: Home / Profile Screen — "Open App, See Your Guy"

**Priority: Tier 1 — Do First**
**Depends on: Nothing (this is the foundation)**
**Blocks: Nothing directly, but Plans B and E enhance this screen**
**Status: Not started**

> Reconstructed from May 17, 2026 session. Reference the original conversation for full detail.

---

## The Problem

After completing onboarding, the app dumps the user into a dashboard that feels like a tool, not a home. Austin's feedback: the avatar should greet you when you open the app. The eidolon should feel like your character — like a Tamagotchi or RPG character sheet — not a feature buried in navigation.

## The Goal

When a user opens the app, they immediately see:
- Their eidolon avatar, large and centered
- Their eidolon's name (editable)
- Their key stats at a glance (stat pills)
- Their current stack displayed as "equipped" badges
- Their goals
- Quick action grid: View Projection, Modify Stack, Switch Eidolon, New Eidolon

Everything radiates from the avatar. The avatar IS the home screen.

## Step 1: Fix the Eidolon Crash Bug — ✅ DONE (2026-05-27)

**Actual root cause:** Refactor #61 moved goal selection inline (driven by the `editing` flag) and removed the `showGoalsEditor` state, but left two dangling `setShowGoalsEditor(false)` calls in `switchToEidolon` and `createNewEidolon` in AlkiApp.jsx. Calling a setter that no longer existed threw `ReferenceError: setShowGoalsEditor is not defined`, crashing the app on eidolon create/switch.

**Fix applied:** Removed both dead lines. Goals-editor visibility is now governed by `setEditing(true)`, which both functions already call, so no behavior was lost.

**Note:** The original diagnosis below was stale — `setEidolons`, `setActiveEidolonId`, and `setProfile` are already passed to Dashboard from AlkiApp.jsx; that was not the cause. The remaining steps (home screen redesign) are independent and still open.

## Steps 2–8: Home Screen Redesign

Most of this was already built in the later #19/#20/#61/#62 refactors (committed
mode was already an avatar-first home). Status reconciled with the codebase
2026-05-27:

- Step 2 — ✅ DONE (2026-05-27): Avatar-first layout. Committed mode already led
  with a large centered hero. Builder mode used to show a small profile card —
  now the hero is extracted into a shared `EidolonHero` component and **hoisted
  above the editing/committed split** in `AlkiApp.jsx`, so both modes lead with
  the large centered avatar from a single source of truth.
- Step 3 — ✅ DONE: Eidolon name display with inline edit (tap to rename). Lives
  in `EidolonHero`, so it now works in builder mode too (verified: renamed to
  "Apollo" live).
- Step 4 — ✅ DONE: Stat pills row (BF / WT / HT / AGE / SEX) — in `EidolonHero`.
- Step 5 — ✅ DONE: Active stack as badge row (committed mode, category-colored).
- Step 6 — ⚠️ CHANGED BY DESIGN: the 2×2 action grid was superseded by the
  "Manage ▾" nav dropdown (Modify / Switch / New) + a Projection/Timeline button
  pair (#62). Eidolon switching in the builder is a centered "⇄ Switch / New"
  button that opens the switcher modal.
- Step 7 — ✅ DONE: Cultivation status card (progressing/stagnant/regressing).
- Step 8 — ✅ DONE: Eidolon switching and creation wired from both the Manage
  menu and the switcher modal (verified end-to-end, no crash).

## What NOT to Touch

- Avatar rendering internals — Plan B handles clothing
- Compound database — no changes
- Recommendation engine — no changes
- Onboarding flow — no changes
- Q&A page — no changes

## Testing Checklist

- [x] New eidolon creation no longer crashes (fixed 2026-05-27; build passes)
- [x] Avatar renders large and centered on home screen (committed AND builder, 2026-05-27)
- [x] Eidolon name is displayed and editable (tap to edit) — works in both modes
- [x] Stat pills show correct biometric values
- [x] Stack badges show correct active compounds
- [x] Action buttons all navigate correctly (Manage ▾ menu + Projection/Timeline, per #62)
- [x] Eidolon switching works without data loss (verified end-to-end)
- [x] Cultivation status displays correctly
- [ ] Mobile responsive (Austin tests on phone) — pending real-device check by Austin
