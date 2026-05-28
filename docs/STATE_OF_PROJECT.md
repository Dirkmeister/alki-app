# ALKI — State of the Project

**Date:** May 28, 2026
**Version:** v0.1.99+
**Live:** https://alki-app.vercel.app
**Author:** Dallas Krech

---

## Executive Summary

Alki has gone from a working prototype to a feature-complete pre-revenue product in a single development sprint. The Eidolon body-transformation simulation engine — the core differentiator — is fully built and wired into the app, backed by clinical trial data across 24+ compounds. The app has been through 83 feedback items (76 resolved, 5 open, 2 deferred). The codebase is organized, documented, and ready for Claude Code-driven development at speed.

**What Alki does today:** A user completes biometric onboarding, gets matched to compounds via a deterministic recommendation engine, builds or accepts a personalized stack, and sees a parametric body avatar project what the published research literature predicts their transformation would look like — week by week, compound by compound, with evidence-grade badges on every projection.

**What's missing for revenue:** Stripe integration and a profile/settings page. That's it.

---

## What's Complete

### Core Product Loop
- 18+ age gate (hard block, non-negotiable)
- 4-step biometric onboarding (sex, age, height, weight, BF%, goals)
- Training status capture (integrated into onboarding, persists via localStorage)
- 24+ compound database with full profiles, dosing, cycle lengths, contraindications
- Deterministic recommendation engine with personalization by body composition and goals
- Stack builder with contraindication logic and risk ladder (conservative → aggressive)
- Stack safety scoring with live-updating badge
- Compound search and filtering by category/goal
- SARM suppression warnings on all androgen-receptor compounds
- Before/after transformation view with outcome stats

### Eidolon Engine (7 Sprints — All Complete)
- **Sprint 1:** Derivation layer — LBM, BF%, FFMI, nFFMI, Casey-Butt ceilings, BSA, anthropometric defaults
- **Sprint 2:** Fat-loss class — semaglutide, retatrutide, tesamorelin, fragment 176-191, MOTS-c + integrator + morph mapping (waist, bf_low, abs_def, facial fullness)
- **Sprint 3:** Muscle class — SARMs + testosterone, regional muscle morphs, dynamic ceiling lift, androgen-tone upper-body bias, sex modulation (Neil 2018), newbie-gains multiplier (Lyle McDonald)
- **Sprint 4:** GH-axis + water — MK-677, Ipa/CJC, CJC-DAC, IGF-1 LR3, saturating GH-axis tone (not additive), ICW/ECW pipeline, fast τ≈7d water time-constant
- **Sprint 5:** Skin material — GHK-Cu collagen (topical evidence), Epitalon, Melanotan II tan-lerp capped by Fitzpatrick type
- **Sprint 6:** Recovery multiplier — BPC-157/TB-500 as gains accelerator (no direct morph), Cardarine, SR-9009, AICAR, SLU-PP-332, clenbuterol, T3 (catabolic — debits LBM)
- **Sprint 7:** Regression/decay — water deflates in 2-4 wk, tan t½≈2mo, SARM LBM 30-50% lost in 8-12 wk, GLP-1 rebound anchored to Wilding 2022 STEP-1 extension curve
- **Integration:** Engine wired into AlkiApp.jsx — simulate() and mapToMorphs() feed the avatar

### Engine Architecture (Pure, Portable)
```
src/app/engine/
├── constants.js        ← Sex-branched constants, thresholds, time constants
├── derivations.js      ← LBM, BF, FFMI, ceilings, BSA (pure functions)
├── compoundVectors.js  ← 24+ compound effect vectors with evidence grades
├── simulate.js         ← Integrator: (profile, stack, weeks) → state timeline
└── mapToMorphs.js      ← State → normalized [0,1] morph keys + material values
```
All pure functions, zero React dependency. Ports to React Native untouched.

### Avatar System
- 2D parametric SVG avatar (free tier fallback, improved proportions)
- 3D GLB avatar via Three.js / @react-three/fiber (default, HumGen male model)
- Avaturn "MAKE IT ME" integration (disabled, scaffolding in place)
- Effect vectors: skin tone shift, vascularity, skin quality, water retention
- Avatar clothing: athletic wear (shirtless/sports bra + shorts), muscle definition lines opacity-mapped to BF%

### Multi-Eidolon System
- Named profiles with per-eidolon goals, compounds, lockedAt timestamps
- Eidolon switching and creation (crash bug fixed)
- Cultivation system (progressing/stagnant/regressing) with tap-to-log check-ins
- Per-eidolon progress logs with independent data

### Screens Built
- Splash screen with version stamp
- Age gate
- Onboarding (4-step with goal suggestion bubble)
- Home screen (avatar-first, eidolon name editing, stat pills, stack badges, action grid)
- Dashboard (builder mode + committed mode with daily view)
- Protocol Q&A (per-compound FAQs, stack-specific FAQs, reconstitution/injection/dosing guides)
- Protocol Guide (personalized: supply list, reconstitution calculator, injection site diagram, weekly schedule, week-by-week expectations)
- Progress Log (weight, BF%, waist circumference, subjective scores with definitions, cycle start date from lockedAt)
- Progress Photos (camera/file picker, in-memory gallery, per-eidolon association)
- Cycle Timeline
- Peptide Modeler / Body Stats (FFMI explainer, training status)
- Stack Generator (risk ladder)
- Stack Intelligence (safety scoring, compound role descriptions)
- Admin Triage Board (internal, reads from Supabase feedback table)

### Infrastructure
- **Frontend:** Next.js (React 19), deployed on Vercel, auto-deploys on push
- **Database:** Supabase (PostgreSQL) — user profiles, eidolons (JSONB), progress logs (with waist column), feedback table
- **Auth:** Supabase Auth — email, Google OAuth, age verification
- **Dev tooling:** ESLint (next/core-web-vitals), jsconfig.json (@/ path aliases), Claude Code with hooks (auto-lint, secret blocking), reviewer subagent
- **Documentation:** CLAUDE.md, cheatsheet, 5 plan docs, Eidolon Engine spec, seed prompt, avatar architecture doc, protocol data audit, bug triage template

### Bug Triage
- 83 total feedback items tracked in Supabase
- 76 resolved and shipped
- 5 open (see below)
- 2 deferred

---

## What's Open

### Bugs (2)
1. **BF% inconsistent across pages** — modeler shows different BF% than other screens. Deferred.
2. **Clear filter clears selected compounds** — pushing clear filter wipes the user's compound selection. Should only clear filters.

### Ideas (5, not yet built)
1. **Tutorial walkthrough** (#37) — new user onboarding sequence explaining eidolons, app flow, goals
2. **Dev mode date manipulation** (#40) — ability to simulate time passing for testing the timeline
3. **ROA system** (#44) — route of administration changes bioavailability (BPC-157 oral vs SubQ are different protocols)
4. **Popular compound tag** — engine-ranked compound curation with a "Popular" filter chip
5. **Adaptive graphics quality** — LOD by stack size and device capability. Deferred.

---

## What Needs to Be Built — Priority Order

### Tier 1: Revenue-Critical
These block monetization. Do them next.

1. **Stripe Integration** — $19.99/month and $149.99/year subscription tiers. Free tier: onboarding + 3 compound cards, no avatar, no stack builder. Pro tier: everything. The whitepaper has full pricing spec.
2. **Profile / Settings Page** — email, password change, account info, subscription status. Austin flagged this directly. Wired through Supabase Auth.
3. **Fix remaining bugs** — clear-filter bug, BF% consistency.

### Tier 2: User Experience
These make the product stickier and more polished.

4. **Tutorial / Onboarding Walkthrough** (#37) — first-time user experience explaining what eidolons are, how to build a stack, what the projections mean. Critical for retention.
5. **Engine Tuning** — test the avatar projections with real user profiles. If the transformations look too aggressive or too subtle, adjust the effect vector magnitudes. Austin's eyes are the calibration tool.
6. **Referral System** — referral link generation, tracking via Supabase, reward logic. Austin asked for this.
7. **ROA System** (#44) — route of administration per compound. BPC-157 oral vs SubQ are fundamentally different protocols. Requires compound database expansion.

### Tier 3: Growth Features
These expand the product's reach and defensibility.

8. **Compound Database Expansion** — scale from 24 to 40+ compounds. The engine supports it — just add rows to compoundVectors.js with evidence-anchored numbers.
9. **AI Protocol Q&A Chatbot** — Claude API integration for conversational peptide guidance. The Q&A page is the static version; this is the dynamic layer.
10. **iOS App** — React → React Native conversion. Everything in engine/, lib/, and data/ ports untouched. The portability firewall has been maintained throughout.
11. **Supplier Affiliate Marketplace** — vetted vendor partnerships with CoA verification. 10-20% commission on referred sales. Secondary revenue stream.

### Tier 4: Future / R&D
These are roadmap items, not near-term priorities.

12. **Photo-to-Avatar Pipeline** — CV-based body composition estimation from user photos. Plan E scaffolding (camera + gallery) is built; the ML pipeline is not.
13. **WebGL/Three.js Full 3D Avatar** — Phase 3 avatar upgrade beyond the current GLB morph system.
14. **AR Mode** — projected transformation on live camera feed. Phase 4.
15. **Adaptive Graphics Quality** — LOD system scaling fidelity by stack size and device capability.
16. **Dev Mode Date Simulation** (#40) — time manipulation for testing timeline progression.
17. **B2B Clinic Partnerships** — white-label or referral integration with peptide clinics.
18. **Data Licensing** — anonymized longitudinal outcomes database (requires significant user scale).

---

## Codebase Architecture

```
alki-app/
├── CLAUDE.md                       ← Claude Code project config
├── CLAUDE_CODE_CHEATSHEET.md       ← Dev workflow reference
├── .eslintrc.json                  ← ESLint (next/core-web-vitals)
├── jsconfig.json                   ← Path aliases (@/ → ./src/)
├── .claude/
│   ├── settings.json               ← Permissions, hooks (auto-lint, secret blocking)
│   └── skills/
│
├── src/app/
│   ├── AlkiApp.jsx                 ← Root component (state, routing, engine integration)
│   ├── engine/                     ← THE CORE — pure, portable simulation engine
│   │   ├── constants.js
│   │   ├── derivations.js
│   │   ├── compoundVectors.js
│   │   ├── simulate.js
│   │   └── mapToMorphs.js
│   ├── screens/                    ← Full-page views
│   ├── components/                 ← Shared UI + utilities
│   ├── avatar/                     ← 3D/2D avatar rendering
│   ├── admin/                      ← Internal tools (triage board)
│   ├── data/                       ← Static compound + protocol data
│   ├── lib/                        ← Pure logic (recommendations, cultivation, etc.)
│   └── styles/                     ← Design tokens
│
├── docs/
│   ├── EIDOLON_ENGINE_SPEC.md      ← Full mathematical/physiological reference
│   ├── EIDOLON_ENGINE_SEED_PROMPT.md
│   ├── AVATAR_3D_ARCHITECTURE.md
│   ├── PROTOCOL_DATA_AUDIT.md
│   └── plans/                      ← Plans A-E (all complete)
│
├── supabase/migrations/            ← Database schema history
│   ├── 001_setup.sql
│   ├── 002_eidolons.sql
│   ├── 003_progress.sql
│   └── 004_protocol.sql
│
├── public/                         ← Static assets (GLB models)
└── blender_scripts/                ← GLB pipeline tooling
```

### Key Architectural Rules
1. **engine/, lib/, and data/ import nothing from React.** This is the portability firewall — everything ports to React Native untouched.
2. **AlkiApp.jsx is the state root.** All top-level state flows down as props. Intentional until complexity demands extraction.
3. **The recommendation engine is deterministic.** Rule-based, not LLM-powered. Claude API is a future conversational layer on top.
4. **Every compound effect vector is anchored to published data.** A/B/C/D evidence grades tracked per compound. No invented numbers.

---

## Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Next.js (React 19), Vercel | Live |
| Engine | Pure JS, deterministic simulation | Complete |
| Avatar (2D) | Parametric SVG | Live (fallback) |
| Avatar (3D) | Three.js via @react-three/fiber, HumGen GLB | Live (default) |
| Database | Supabase (PostgreSQL) | Live |
| Auth | Supabase Auth (email + Google OAuth) | Live |
| Payments | Stripe | NOT YET INTEGRATED |
| AI Layer | Claude API | NOT YET INTEGRATED |
| iOS | React Native | NOT YET STARTED |

---

## Business Model (Unchanged from Whitepaper v2)

- **Free:** Onboarding + 3 compound info cards, no avatar, no stack builder
- **Alki Pro — $19.99/month:** Full database, stacking, avatar, progress log, AI Q&A
- **Alki Pro — $149.99/year:** All Pro features at ~37% discount
- **Affiliate revenue:** 10-20% commission on referred supplier sales (future)

---

## Team

- **Dallas Krech** — Founder, product owner, sole builder
- **Austin Krech** — Primary tester, mobile QA, feature feedback
- **Claude Code** — Implementation engine (hooks, subagents, reviewer configured)
- **Claude.ai** — Design, planning, strategy, documentation

---

## What Changed Today (May 28, 2026)

This was the single largest development day in the project's history:

1. Full repo reorganization — 13 files moved, 8 import chains updated, 4 new directories created
2. CLAUDE.md + cheatsheet + settings created for Claude Code integration
3. Plans A-E exported to docs/plans/
4. Eidolon Engine spec and seed prompt written to repo
5. ESLint, jsconfig, .claude/settings.json configured
6. Plans A through E implemented by Claude Code
7. 76+ bugs triaged and resolved across 3 batches
8. Eidolon Engine built — all 7 sprints complete and wired into the app
9. Claude Code hooks (auto-lint, secret blocking) and reviewer subagent configured
10. Project went from prototype to feature-complete pre-revenue product
