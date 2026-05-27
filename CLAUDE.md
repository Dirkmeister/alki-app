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
```

No test runner is configured yet. No linter config. Build errors surface on Vercel deploy.

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
├── .env.local.example         ← Environment variable template
├── next.config.mjs            ← Exposes VERCEL_GIT_COMMIT_SHA as build ID
├── package.json               ← Dependencies (no test/lint scripts yet)
│
├── src/app/
│   ├── AlkiApp.jsx            ← ROOT COMPONENT — main app shell, screen routing, global state
│   ├── page.js                ← Next.js page wrapper (renders AlkiApp)
│   ├── layout.js              ← Root layout, meta tags, font loading
│   ├── globals.css            ← Base styles, CSS reset
│   │
│   ├── screens/               ← Full-page views
│   │   ├── SplashScreen.jsx
│   │   ├── AgeGate.jsx
│   │   ├── Onboarding.jsx
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx      ← Main post-onboarding hub (builder + committed modes)
│   │   └── ProgressLog.jsx
│   │
│   ├── components/            ← Shared UI components
│   │   ├── BodyAvatar.jsx     ← SVG parametric body avatar (2D, free tier)
│   │   └── CompoundCard.jsx   ← Compound detail cards
│   │
│   ├── data/                  ← Static data (no render imports allowed)
│   │   ├── compounds.js       ← 8-compound core database
│   │   ├── compounds-expanded.js ← Extended compound data
│   │   └── goals.js           ← Goal definitions for onboarding
│   │
│   ├── lib/                   ← Pure logic (no render imports allowed)
│   │   ├── peptideEngine.js   ← Recommendation engine (deterministic, rule-based)
│   │   ├── recommendations.js ← Recommendation helpers
│   │   ├── morphTargets.js    ← Canonical 13-key morph system + baseline driver
│   │   ├── compoundMorphVectors.js ← Per-compound effect vectors (core IP)
│   │   ├── avatar.js          ← Avatar parameter resolution
│   │   ├── cultivation.js     ← Cultivation system (progressing/stagnant/regressing)
│   │   └── supabase.js        ← Supabase client initialization
│   │
│   ├── styles/
│   │   └── theme.js           ← Design tokens
│   │
│   ├── Body3DAvatar.jsx       ← Three.js 3D avatar renderer (Pro tier)
│   ├── AvatarHeadshot.jsx     ← Avatar head crop for UI
│   ├── AvaturnCapture.jsx     ← Avaturn "MAKE IT ME" integration
│   ├── avaturnConfig.js       ← Avaturn SDK config
│   ├── PeptideModeler.jsx     ← Compound modeling view
│   ├── AlkiProtocolQA.jsx     ← Protocol Q&A page (per-compound + general FAQs)
│   ├── StackGenerator.jsx     ← Stack builder UI
│   ├── stackGenerator.js      ← Stack builder logic
│   ├── StackIntelligence.jsx  ← Stack analysis view
│   ├── CycleTimeline.jsx      ← Protocol timeline visualization
│   ├── FeedbackFAB.jsx        ← Floating feedback button
│   ├── PerfHUD.jsx            ← Performance debug overlay
│   └── error.jsx              ← Error boundary
│
├── public/
│   ├── alki_humgen_male.glb       ← Full HumGen male body (3D)
│   └── alki_humgen_male_slim.glb  ← Slimmed GLB variant
│
├── blender_scripts/           ← Blender Python scripts for GLB pipeline
│   ├── build_base_body.py
│   ├── build_humgen_body.py
│   ├── check_glb.py
│   ├── list_livekeys.py
│   └── strip_textures.mjs
│
├── docs/
│   └── AVATAR_3D_ARCHITECTURE.md  ← 3D avatar architecture + build plan
│
├── supabase-setup.sql             ← Initial Supabase schema
├── supabase-migration-eidolons.sql
├── supabase-migration-progress.sql
└── supabase-migration-protocol.sql
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
- **Plan A:** Home screen redesign — avatar-first, eidolon name editing, stat pills. ALSO FIXES the new-eidolon crash bug (Dashboard missing setEidolons/setActiveEidolonId/setProfile props).
- **Plan B:** Avatar clothing — shirtless/sports bra + shorts, muscle definition opacity-mapped to BF%.
- **Plan C:** Practical protocol guide — supply list, reconstitution calculator, injection site diagram, weekly schedule.

### Tier 2 Plans (After Tier 1)
- **Plan D:** Compound classification review + stack-aware recommendations.
- **Plan E:** Photo capture/upload UI scaffolding (in-memory, no Supabase storage yet).

## Known Bugs

- **CRITICAL:** Creating new eidolons crashes the app. Root cause: Dashboard component doesn't receive `setEidolons`, `setActiveEidolonId`, `setProfile` props from AlkiApp.jsx root. Fix is in Plan A Step 1.
- (Add new bugs here as they surface)

## Key Warnings

- **18+ age gate is non-negotiable.** Never remove or weaken it.
- **Disclaimer architecture is non-negotiable.** Every critical surface needs the research/educational disclaimer.
- **Alki is an information platform.** Never add language that diagnoses, prescribes, treats, or sells.
- **GLP-1s are blocked for lean users** (below ~12% BF). Contraindication logic must stay active.
- **.env.local contains secrets.** Never commit it. The .gitignore already excludes `.env*.local`.

## Supabase Project

- Project ID: `fubrwttjgbthjarzledr`
- Migration files are at repo root (`supabase-*.sql`)
- Eidolons stored as JSONB array + activeEidolonId column on user profiles
- Feedback/bug tracking table: `public.feedback`

## Reference Docs

- `AVATAR_PLATFORM_PLAN.md` — Avatar web-to-native strategy
- `docs/AVATAR_3D_ARCHITECTURE.md` — 3D morph system architecture
- `ALKI_BUG_THREAD_SEED.md` — Bug triage session template
- Eidolon Engine spec and 5 coding plan docs live in Claude.ai project knowledge (search there for Plans A–E)
