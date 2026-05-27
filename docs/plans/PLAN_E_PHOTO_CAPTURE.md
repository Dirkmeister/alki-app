# Plan E: Photo Capture & Upload UI Scaffolding

**Priority: Tier 2 — Do After A/B/C**
**Depends on: Plan A (home screen where progress photos are accessed)**
**Important: UI scaffolding only. No Supabase storage. No CV-based avatar generation (that's Phase 2).**
**Status: Not started**

> Reconstructed from May 17, 2026 session.

---

## The Problem

Austin wants two things:
1. **Photo-based avatar generation** — upload a photo, avatar looks like you (Phase 2 — NOT this plan)
2. **Progress photos** — take/upload photos over time to track transformation (THIS plan)

## The Goal

Add two photo features:

**A. "Take Photo" / "Upload Photo" for Progress Tracking**
- Accessible from home screen (Plan A adds the entry point)
- Opens device camera or file picker
- Photo stored with timestamp and associated eidolon
- Photos viewable in a progress gallery
- No backend persistence yet — in-memory/state during session
- Note: Supabase Storage wiring is a future task

**B. Progress Photo Gallery**
- Grid view of all captured photos, sorted by date
- Each photo shows date, eidolon name, and any logged check-in data
- Tap to view full-size
- Integration with cultivation check-ins (photo taken = visual check-in)

## Key Steps

- Step 1: Camera/file picker component (uses native `<input type="file" accept="image/*" capture>`)
- Step 2: Photo state management (store in component state with metadata)
- Step 3: Progress gallery grid view
- Step 4: Full-size photo viewer
- Step 5: Integration with cultivation check-in flow
- Step 6: Wire into home screen action grid
- Step 7: Add "Photos" to navigation

## What's Explicitly Deferred

- Supabase Storage persistence (future — photos lost on refresh for now)
- CV-based body composition estimation from photos
- Photo-to-avatar generation (Avaturn or custom ML pipeline)
- Photo comparison slider (before/after overlay)

## What NOT to Touch

- Avatar rendering (Plan B), protocol guide (Plan C), compound data (Plan D)
- Existing onboarding, recommendation engine, Q&A page

## Testing Checklist

- [ ] Camera opens on mobile (Austin's phone)
- [ ] File picker works as fallback on desktop
- [ ] Captured photo appears in gallery immediately
- [ ] Gallery shows photos sorted by date
- [ ] Tap to view full-size works
- [ ] Photos associated with correct eidolon
- [ ] Clear "photos are not saved between sessions" notice visible
- [ ] Mobile responsive
