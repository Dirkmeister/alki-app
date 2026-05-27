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

## Step 1: Fix the Eidolon Crash Bug (MUST DO FIRST)

**Root cause:** Dashboard component doesn't receive `setEidolons`, `setActiveEidolonId`, `setProfile` props from AlkiApp.jsx root — calling undefined functions when creating a new eidolon.

**Fix:** Pass these props from AlkiApp.jsx through to Dashboard (and any child that needs eidolon management). Must be resolved before any other eidolon UI work.

## Steps 2–8: Home Screen Redesign

- Step 2: Avatar-first layout (large avatar centered at top, everything below)
- Step 3: Eidolon name display with inline edit (tap to rename)
- Step 4: Stat pills row (key biometrics at a glance)
- Step 5: Active stack as badge row (compound names as small pills)
- Step 6: Action grid (2x2 grid of action buttons)
- Step 7: Cultivation status integration (progressing/stagnant/regressing indicator)
- Step 8: Wire up eidolon switching and creation from the action grid

## What NOT to Touch

- Avatar rendering internals — Plan B handles clothing
- Compound database — no changes
- Recommendation engine — no changes
- Onboarding flow — no changes
- Q&A page — no changes

## Testing Checklist

- [ ] New eidolon creation no longer crashes
- [ ] Avatar renders large and centered on home screen
- [ ] Eidolon name is displayed and editable (tap to edit)
- [ ] Stat pills show correct biometric values
- [ ] Stack badges show correct active compounds
- [ ] Action grid buttons all navigate correctly
- [ ] Eidolon switching works without data loss
- [ ] Cultivation status displays correctly
- [ ] Mobile responsive (Austin tests on phone)
