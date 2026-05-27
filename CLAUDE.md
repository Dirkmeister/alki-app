# ALKI — Claude Code Project Guide

> ἀλκή · Strength · Prowess · Your Final Form
> AI-powered peptide intelligence platform

## Quick Context

Alki is a personalized peptide research platform — not medical advice, not a vendor. Users complete biometric onboarding, get matched to compounds via a deterministic recommendation engine, and see a parametric body avatar visualize projected transformations. The Eidolon (avatar) is the core engagement mechanic.

**Live:** https://alki-app.vercel.app
**GitHub:** Dirkmeister
**Owner:** Dallas Krech (solo founder, non-professional dev background)
**Tester:** Austin (Dallas's brother, tests on mobile)

## Tech Stack

- **Framework:** Next.js (React 19) on Vercel
- **Language:** JavaScript (JSX), no TypeScript
- **Styling:** CSS-in-JS via inline styles + globals.css, dark theme (#0a0a0a), DM Sans font, green accent (#22D68A)
- **Database:** Supabase (PostgreSQL) — auth + user profiles wired, progress logs schema exists
- **Auth:** Supabase Auth (email + Google OAuth + age verification)
- **3D Avatar:** Three.js via @react-three/fiber + @react-three/drei, HumGen GLB models in /public
- **2D Avatar:** Parametric SVG rendered in-browser (free tier default)
- **Payments:** Stripe — NOT yet integrated
- **Deploy:** Vercel auto-deploys on every GitHub push

## Commands

```bash
npm run dev      # Local dev server (localhost:3000)
npm run build    # Production build — run before pushing if you want to catch build errors
npm run start    # Serve production build locally
npm run lint     # ESLint check (extends next/core-web-vitals)
```

No test runner is configured yet. Build errors surface on Vercel deploy.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_SITE_URL` — production URL (https://alki-app.vercel.app)

The build also reads `VERCEL_GIT_COMMIT_SHA` automatically (set by Vercel at build time, falls back to "dev" locally).

## Project Structure

```
alki-app/
├── CLAUDE.md                  ← You are here
├── CLAUDE_CODE_CHEATSHEET.md  ← Quick reference for slash commands and workflow
├── ALKI_BUG_THREAD_SEED.md   ← Template for bug-fix sessions
├── AVATAR_PLATFORM_PLAN.md   ← Avatar strategy: web → native portability plan
├── .eslintrc.json             ← ESLint config (extends next/core-web-vitals)
├── jsconfig.json              ← Path aliases (@/ → ./src/)
├── .env.local.example         ← Environment variable template
├── next.config.mjs            ← Exposes VERCEL_GIT_COMMIT_SHA as build ID
├── package.json               ← Dependencies + scripts (dev, build, start, lint)
│
├── src/app/
│   ├── AlkiApp.jsx            ← ROOT COMPONENT — main app shell, screen routing, global state
│   ├── page.js                ← Next.js page wrapper (renders AlkiApp)
│   ├── layout.js              ← Root layout, meta tags, font loading
│   ├── globals.css            ← Base styles, CSS reset
│   │
│   ├── screens/               ← Standalone full-page views
│   │   ├── ProgressLog.jsx
│   │   ├── AlkiProtocolQA.jsx ← Protocol Q&A reference (per-compound + general FAQs)
│   │   └── ProtocolGuideView.jsx ← Plan C: personalized protocol guide (6 sections)
│   │   (NOTE: Splash, AgeGate, Onboarding, Dashboard + the SVG BodyAvatar are
│   │    defined INLINE in AlkiApp.jsx — NOT here. The stale standalone copies of
│   │    those, plus CompoundCard / theme.js / goals.js / avatar.js / Home / Dash,
│   │    were deleted in the 2026-05-27 dead-code sweep.)
│   │
│   ├── components/            ← Shared UI components (CompoundCard is inline in AlkiApp)
│   │   ├── StackIntelligence.jsx ← Stack analysis (analyzeStack, getStackSuggestions, synergy data)
│   │   ├── StackGenerator.jsx ← Stack builder UI
│   │   ├── CycleTimeline.jsx  ← Protocol timeline visualization
│   │   ├── PeptideModeler.jsx ← Compound modeling view
│   │   └── utilities/
│   │       ├── FeedbackFAB.jsx ← Floating feedback button (dev/testing)
│   │       └── PerfHUD.jsx    ← Performance debug overlay
│   │
│   ├── avatar/                ← All avatar-related rendering
│   │   ├── Body3DAvatar.jsx   ← Three.js 3D avatar renderer (Pro tier)
│   │   ├── AvatarHeadshot.jsx ← Avatar head crop for UI
│   │   ├── AvaturnCapture.jsx ← Avaturn "MAKE IT ME" integration (disabled)
│   │   └── avaturnConfig.js   ← Avaturn SDK config (disabled)
│   │
│   ├── admin/                 ← Internal tools (not user-facing)
│   │   ├── page.js            ← /admin route (renders the triage board; unauthenticated, dev/internal)
│   │   └── AlkiTriage.jsx     ← Bug triage board (reachable at /admin since 2026-05-27)
│   │
│   ├── data/                  ← Static data (no render imports allowed; GOALS is inline in AlkiApp)
│   │   ├── compounds.js       ← 8-compound core DB (also spreads in the expanded set)
│   │   ├── compounds-expanded.js ← Extended 63-compound data
│   │   └── protocolProtocols.js ← Plan C: per-compound protocol data (all 71; needs_review flags)
│   │
│   ├── lib/                   ← Pure logic (no render imports allowed)
│   │   ├── peptideEngine.js   ← Morph/effect helpers (NOTE: the LIVE recommendation
│   │   │                         engine is the INLINE getRecommendations in AlkiApp.jsx)
│   │   ├── stackGenerator.js  ← Stack generation logic
│   │   ├── morphTargets.js    ← Canonical 13-key morph system + baseline driver
│   │   ├── compoundMorphVectors.js ← Per-compound effect vectors (core IP)
│   │   ├── protocolGuide.js   ← Plan C: supply/reconstitution/schedule/timeline helpers
│   │   ├── cultivation.js     ← Cultivation system (progressing/stagnant/regressing)
│   │   └── supabase.js        ← Supabase client initialization
│   │
│   └── error.jsx              ← Error boundary
│
├── public/
│   ├── alki_humgen_male.glb       ← Trimmed HumGen male body (4.5MB, production)
│   └── alki_humgen_male_slim.glb  ← Stale intermediate (18MB — candidate for deletion)
│
├── blender_scripts/           ← Blender Python scripts for GLB pipeline
│   ├── build_base_body.py
│   ├── build_humgen_body.py
│   ├── check_glb.py
│   ├── list_livekeys.py
│   └── strip_textures.mjs
│
├── docs/
│   ├── AVATAR_3D_ARCHITECTURE.md  ← 3D avatar architecture + build plan
│   └── plans/                     ← Coding plans (from May 17 session)
│       ├── PLAN_A_HOME_SCREEN.md
│       ├── PLAN_B_AVATAR_CLOTHING.md
│       ├── PLAN_C_PROTOCOL_GUIDE.md
│       ├── PLAN_D_COMPOUND_REVIEW.md
│       └── PLAN_E_PHOTO_CAPTURE.md
│
└── supabase/
    └── migrations/
        ├── 001_setup.sql
        ├── 002_eidolons.sql
        ├── 003_progress.sql
        └── 004_protocol.sql
```

## Architecture Rules

1. **`lib/` and `data/` import nothing from React or any renderer.** They are pure logic. This is the "portability firewall" — everything in these folders ports to React Native untouched.
2. **`screens/` are full-page views.** Each manages its own layout. They receive props from AlkiApp.jsx.
3. **AlkiApp.jsx is the state root.** All top-level state (profile, eidolons, screen routing, auth) lives here and flows down as props. This is intentional — not a refactor target until complexity demands it.
4. **The recommendation engine is deterministic.** Rule-based matching, not LLM-powered. Claude API integration for conversational Q&A is a future layer.
5. **Compound effect vectors in `compoundMorphVectors.js` are the core IP.** These are research-grounded numbers anchored to published clinical data. Don't modify without understanding the evidence basis (see the Eidolon Engine spec).

## Coding Style

- **Functional components with hooks.** No class components.
- **Clean and readable over clever.** Dallas reads and understands the code — don't over-abstract.
- **Comments where logic is non-obvious.** Especially in the recommendation engine, morph math, and contraindication logic.
- **No TypeScript.** Plain JavaScript/JSX throughout.
- **Inline styles are fine** for component-scoped styling. globals.css for resets and base styles.
- **When making architectural decisions, explain what you're doing and why.** Don't silently restructure — Dallas needs to understand the "why" to maintain it.

## Workflow

1. Dallas designs features in **Claude.ai conversations** first (prototyping, spec writing, decision-making)
2. Implementation happens in **Claude Code** against the actual codebase
3. Dallas commits via **GitHub Desktop** (commit → push)
4. **Vercel auto-deploys** on push (under 60 seconds)
5. **Austin tests on mobile**, sends feedback
6. Bug triage uses the Supabase `feedback` table (see ALKI_BUG_THREAD_SEED.md)

## Active Sprint Context

### Eidolon Engine Spec
A comprehensive mathematical/physiological reference document exists covering:
- 4-layer deterministic engine (physiological state → anthropometric derivations → compound effect vectors → morph mapping)
- Per-compound effect vectors anchored to published clinical data (semaglutide, retatrutide, tesamorelin, LGD-4033, MK-677, testosterone, clenbuterol, etc.)
- Evidence-grade badges (A through D) for UI credibility
- Casey-Butt / FFMI ceilings for natural vs. enhanced limits

### 7-Sprint Build Plan
- **Sprint 1:** Inputs + derivation (LBM, BF, FFMI, BSA, ceilings)
- **Sprint 2:** GLP-1 + tesamorelin (fat-loss class)
- **Sprint 3:** SARMs + testosterone (muscle class)
- **Sprint 4:** GH-axis + water/ECW
- **Sprint 5:** Skin material (GHK-Cu, Epitalon) + Melanotan
- **Sprint 6:** Recovery multiplier (BPC/TB-500) + exercise-mimetics
- **Sprint 7:** Regression/decay simulation ("what happens if I stop?")

### Tier 1 Plans (Do First)
- **Plan A:** Home screen redesign — avatar-first, eidolon name editing, stat pills. (The new-eidolon crash this plan originally bundled is now fixed independently — see Known Bugs.)
- **Plan B:** Avatar clothing — shirtless/sports bra + shorts, muscle definition opacity-mapped to BF%.
- **Plan C:** Practical protocol guide — supply list, reconstitution calculator, injection site diagram, weekly schedule.

### Tier 2 Plans (After Tier 1)
- **Plan D:** Compound classification review + stack-aware recommendations.
- **Plan E:** Photo capture/upload UI scaffolding (in-memory, no Supabase storage yet).

## Known Bugs

- **FIXED (2026-05-27):** Creating/switching eidolons crashed the app. Actual root cause: refactor #61 moved goal selection inline (driven by the `editing` flag) and removed the `showGoalsEditor` state, but left two dangling `setShowGoalsEditor(false)` calls in `switchToEidolon` and `createNewEidolon` in AlkiApp.jsx — calling a setter that no longer existed threw `ReferenceError: setShowGoalsEditor is not defined`. Fix: removed both dead lines (visibility is now governed by `setEditing(true)`, which both functions already call). NOTE: the earlier "Dashboard missing setEidolons/setActiveEidolonId/setProfile props" diagnosis was stale — those props are already wired (AlkiApp.jsx Dashboard render).
- (Add new bugs here as they surface)

## Key Warnings

- **18+ age gate is non-negotiable.** Never remove or weaken it.
- **Disclaimer architecture is non-negotiable.** Every critical surface needs the research/educational disclaimer.
- **Alki is an information platform.** Never add language that diagnoses, prescribes, treats, or sells.
- **GLP-1s are de-prioritized for lean users, NOT hard-blocked.** Alki advises, it doesn't gatekeep (confirmed 2026-05-27). Below the BF thresholds (code uses **15% / 22%**, not the "12%" this line previously claimed), GLP-1s are filtered out of the *recommended* list (AlkiApp.jsx `getRecommendations` + the recommended-list filter) and a contraindication advisory is shown, but the compound stays selectable via "Browse all" and the stack can still be locked. `StackIntelligence.analyzeStack` hardcodes `isBlocked = false` ("contraindications inform; they never block"). Keep this advisory logic active — do not add a hard block without an explicit product decision to reverse the advise-don't-gatekeep philosophy.
- **.env.local contains secrets.** Never commit it. The .gitignore already excludes `.env*.local`.

## Supabase Project

- Project ID: `fubrwttjgbthjarzledr`
- Migration files are at repo root (`supabase-*.sql`)
- Eidolons stored as JSONB array + activeEidolonId column on user profiles
- Feedback/bug tracking table: `public.feedback`

## Reference Docs

- `AVATAR_PLATFORM_PLAN.md` — Avatar web-to-native strategy
- `docs/AVATAR_3D_ARCHITECTURE.md` — 3D morph system architecture
- `docs/plans/PLAN_A_HOME_SCREEN.md` — Home screen redesign + eidolon crash fix
- `docs/plans/PLAN_B_AVATAR_CLOTHING.md` — Athletic wear + muscle definition lines
- `docs/plans/PLAN_C_PROTOCOL_GUIDE.md` — Personalized protocol implementation guide
- `docs/plans/PLAN_D_COMPOUND_REVIEW.md` — Compound classification audit
- `docs/plans/PLAN_E_PHOTO_CAPTURE.md` — Progress photo UI scaffolding
- `ALKI_BUG_THREAD_SEED.md` — Bug triage session template
- Eidolon Engine spec: `docs/EIDOLON_ENGINE_SPEC.md` — the full mathematical/physiological reference for the simulation engine
