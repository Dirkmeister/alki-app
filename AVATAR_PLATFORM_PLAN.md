# ALKI — Avatar Platform Strategy & Execution Plan
**Date:** May 23, 2026
**Author:** Dallas + Claude (working session)
**Status:** Active plan — supersedes ad-hoc avatar work from this session
**Scope:** Strategy for taking the calibrated 3D avatar from web-dev to a shippable phone app, with a reserved seam for "MAKE IT ME" face-matching. Does NOT cover face-matching/hair/clothing implementation (separate threads).

---

## 0. TL;DR — The Strategy in Five Sentences

1. The expensive IP we just built (morph system, calibration, recommendation engine, compound DB) is **pure logic with zero rendering dependency** — it already ports to native untouched.
2. The **only** web-specific piece is the ~250-line `Body3DAvatar.jsx` render shell; on native it becomes a `@react-three/fiber/native` + `expo-gl` shell driving the *same* GLB with the *same* morph influences.
3. Therefore: **keep iterating fast on web (Vercel sandbox) now**, and protect the portable core so the native port is a render-shell rewrite, not a product rewrite.
4. **Decision deferred, not avoided:** the web-vs-native commitment doesn't need to be made until the product is validated — as long as nothing built now is throwaway, which the architecture guarantees.
5. Immediate priority is **cleanup + GLB slimming** so the repo is pushable and nothing rots; then a deliberate "portability firewall" so future work stays native-ready.

---

## 1. Where We Are (Verified State, May 23 2026)

### The 3D avatar is calibrated and correct
- Isolated morph bake confirmed at byte level: every shape key is distinct (`muscle_chest` vs `muscle_legs` cosine 0.0, vs `Male` 0.0294).
- Full muscular system driven and proportional:
  - `muscle_chest` (433 verts), `muscle_shoulders`, `muscle_arms` (2,132 verts — bi/tri/forearm), `muscle_back`
  - `muscle_legs` (7,416 verts — quad/ham/glute), `muscle_calves` (1,120 verts, max disp 0.0088)
- Render pipeline proven sound: app-rendered NEUTRAL body matches Blender neutral exactly (mesh, material, lighting, camera, auto-fit all correct).
- Calibration drivers live in `morphTargets.js`:
  - `bf_low` softened (lean ≠ skinny): `min(0.55, (18-bf)/20)`
  - FFMI-based muscle baseline (`M_OFFSET`/`M_SPAN`)
  - `muscle_legs` driven from `muscle_overall * 0.85` (upper/lower proportion)
  - `muscle_calves` driven from `muscle_legs * 0.9` (kills "chicken legs")
- Material controlled cleanly: HumGen's mis-slotted textures stripped in-code; driven `MeshStandard` with `ALKI_SKIN_BASE`/`ALKI_SKIN_TAN` (Melanotan lerp), roughness from skin quality.

### Three placeholders remain (intentionally flat)
- `water`, `abs_def`, `vascularity` bake as empty keys. **Decision:** these belong in a future **material/normal-map pass**, NOT the geometry bake. Veins and ab separation don't read as vertex moves at 26k polys. `water` *could* later be a real global-puffiness morph if a compound needs it. Leave flat for now — harmless, cost-free.

### Repo structure is partly decomposed (better than "monolith")
- `src/app/lib/` — **the portable core (50KB pure logic, zero render deps):** `morphTargets.js`, `compoundMorphVectors.js`, `peptideEngine.js`, `recommendations.js`, `cultivation.js`, `avatar.js`, `supabase.js`
- `src/app/data/` — compound databases (`compounds.js`, `compounds-expanded.js`, `goals.js`)
- `src/app/screens/` — `AgeGate`, `Onboarding`, `Dashboard`, `Home`, `ProgressLog`, `SplashScreen`
- `src/app/components/` — `BodyAvatar.jsx` (2D SVG free tier), `CompoundCard.jsx`
- `src/app/Body3DAvatar.jsx` — **the only render-shell piece** (three.js / r3f)
- `AlkiApp.jsx` — still the central orchestrator/router

### Known cruft to resolve
- **Dead Avaturn path:** `AvaturnCapture.jsx`, `avaturnConfig.js`, `AvatarHeadshot.jsx` — from the abandoned photoreal-head approach. Candidates for deletion (confirm before removing).
- **Possible duplicate:** both `stackGenerator.js` and `StackGenerator.jsx` exist; both `StackIntelligence.jsx` and `StackGenerator.jsx`. Need a dedupe pass.
- **Temp test edits still live in `AlkiApp.jsx`** (MUST revert before any real wiring):
  1. `const [avatarUrl, setAvatarUrl] = useState("/alki_humgen_male.glb");` (was `null`)
  2. Two Supabase load sites changed to `if (saved.avatarUrl) setAvatarUrl(...)` (was `setAvatarUrl(saved.avatarUrl||null)`)
- **Debug slider panel still wired on** the home hero avatar (`debugPanel={true}`).
- **46MB GLB is NOT gitignored** and `public/` is tracked → it will commit & push to Vercel on next commit. Must slim BEFORE first commit.

---

## 2. The Core Architectural Insight (Why This All Works)

```
┌─────────────────────────────────────────────────────────┐
│  PORTABLE CORE  (runs identically on web AND native)      │
│  src/app/lib/  +  src/app/data/                           │
│  • morphTargets.js      — morph contract + calibration    │
│  • compoundMorphVectors — per-compound effect vectors     │
│  • peptideEngine.js     — compound DB driver              │
│  • recommendations.js   — deterministic rec engine        │
│  • cultivation.js       — progress logic                  │
│  • compounds*.js        — the database                    │
│  • the GLB itself       — geometry + shape-key contract   │
│  ↑ ZERO rendering/platform dependency. Plain JS + data.   │
└─────────────────────────────────────────────────────────┘
                          │ consumed by
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────────┐
│  WEB SHELL (today)     │   │  NATIVE SHELL (future)      │
│  Next.js on Vercel     │   │  Expo / React Native        │
│  Body3DAvatar.jsx      │   │  Body3DAvatar.native.jsx    │
│   = @react-three/fiber │   │   = @react-three/fiber/native│
│  screens/ as web       │   │   + expo-gl                 │
│  components            │   │  screens/ reused (RN prims) │
└───────────────────────┘   └───────────────────────────┘
```

**Implication:** the web-vs-native question is low-stakes. You are not betting the avatar on a platform — it runs on both. You are only choosing where the **UI shell** lives and when to build the second one. This is why "timeline undecided" is fine.

---

## 3. The Portability Firewall (The One Rule That Protects Everything)

To keep the native port a shell-swap and not a rewrite, enforce one discipline from now on:

> **`lib/` and `data/` must never import anything web- or render-specific.**
> No `next/*`, no `window`/`document`, no DOM, no three.js, no `@react-three/*`.
> They are plain JS: functions, constants, and data only.

Everything platform-specific lives in the shell (`Body3DAvatar.jsx`, screens, components). When native comes, you write `Body3DAvatar.native.jsx` and re-skin the screens with RN primitives — the core is imported as-is.

**Test for any new file:** "Could this run in Node with no browser?" If it's logic/data → yes, goes in `lib`/`data`. If it touches rendering/DOM → it's a shell file.

---

## 4. The "MAKE IT ME" Seam (Reserve Now, Build Later)

Face-matching is a fundamentally different pipeline (capture → face mesh → attach head to body) than parametric morphs. We are NOT building it now, but we reserve a clean seam so it drops in without refactor:

- **Avatar identity is a single resolved object**, e.g. `{ bodyUrl, headUrl|null, morphState, materialParams }`, produced by one function (today: `resolveAvatarParams()`). Face-matching will later populate `headUrl` (or a head morph set) without touching body morphs.
- **Head and body are separate concerns.** The body GLB stays as-is. A future head GLB attaches at the neck seam. Keep the neck region of the body mesh stable so a head can mount predictably.
- **Capture is a shell concern, not core.** Selfie capture (MediaPipe on web / Vision on native) lives in the shell; it outputs parameters into the resolved avatar object. The core never knows how the head was captured.
- **Delete the old Avaturn files** — they encode the *abandoned* approach and will confuse the seam. (Confirm, then remove `AvaturnCapture.jsx`, `avaturnConfig.js`, possibly `AvatarHeadshot.jsx`.)

That's all "reserve a seam" means: one identity object, head/body separation, capture-in-shell. No code to write now beyond not painting over it.

---

## 5. Execution Plan — Ordered Phases

### PHASE 0 — Make the repo pushable (do first, ~30 min)
Goal: clean state that can commit/push to Vercel without bloat or debug leakage.

- [ ] **0.1 Slim the GLB BEFORE any commit.** From repo root:
      `npx @gltf-transform/cli optimize public/alki_humgen_male.glb public/alki_humgen_male.glb --texture-compress webp`
      Then strip the now-unused textures entirely (we drive a controlled material in-code):
      `npx @gltf-transform/cli prune public/alki_humgen_male.glb public/alki_humgen_male.glb`
      Target: 46MB → ~3–5MB. Re-run `check_glb.py` after to confirm the 13 morph keys survived (the optimizer can reorder; verify cosines/vert counts unchanged).
- [ ] **0.2 Add a GLB guard to `.gitignore` strategy.** Decide: commit the *slimmed* GLB (fine at ~4MB) — but NEVER the 46MB one. If unsure, slim first, verify size, then commit.
- [ ] **0.3 Revert the 3 temp test edits in `AlkiApp.jsx`** (avatarUrl back to `null`; both Supabase load sites back to `setAvatarUrl(saved.avatarUrl||null)`).
- [ ] **0.4 Remove the debug panel** (`debugPanel={true}` off the home hero; the panel code can stay in `Body3DAvatar.jsx` behind the default-false prop for future calibration).
- [ ] **0.5 Decide real avatar wiring** (see Phase 1) — at minimum, ensure a sensible default so the app isn't blank when no avatar URL is set.
- [ ] **0.6 First clean commit + push**, confirm Vercel deploy is green and the GLB loads from the deployed URL (not just localhost).

### PHASE 1 — Decide the avatar's product role (web sandbox)
Goal: answer "who sees the 3D body and when" now that it's good.

- [ ] **1.1 Tier decision:** Is the parametric 3D body the **default for everyone**, or does free tier stay 2D SVG (`BodyAvatar.jsx`) with 3D as a Pro unlock? (Whitepaper implies 2D free / 3D Pro. Confirm.)
- [ ] **1.2 Wire `avatarUrl` properly:** male GLB as the shipped default; female GLB pending (Phase 3). Load order: Supabase profile → fallback to bundled default. Remove the test hardcode.
- [ ] **1.3 Confirm the 3 render sites** behave: home hero (committed mode), Modeler, before/after transform view. Home mini-avatar stays 2D by design.

### PHASE 2 — Tighten the portable core (firewall enforcement)
Goal: guarantee native-readiness without starting the port.

- [ ] **2.1 Audit `lib/` + `data/` imports** — confirm zero web/render dependencies. Fix any leak (e.g., a `window` reference) by moving it to the shell.
- [ ] **2.2 Dedupe:** resolve `stackGenerator.js` vs `StackGenerator.jsx` vs `StackIntelligence.jsx`. Keep one source of truth.
- [ ] **2.3 Delete dead Avaturn files** (confirm first): `AvaturnCapture.jsx`, `avaturnConfig.js`, `AvatarHeadshot.jsx`.
- [ ] **2.4 Document the morph contract** — a short comment block in `morphTargets.js` listing the 13 canonical keys as the GLB↔app interface (any future mesh must match these names).

### PHASE 3 — Female base mesh (same contract)
Goal: both sexes, one morph vocabulary.

- [ ] **3.1 Re-run `build_humgen_body.py` with `GENDER="female"`** → `alki_humgen_female.glb`. Same 13 keys, same isolation bake.
- [ ] **3.2 Verify with `check_glb.py`** (keys distinct, non-empty).
- [ ] **3.3 Slim it (Phase 0.1 process), wire sex→GLB selection** in the resolved avatar object.
- [ ] **3.4 Re-check female calibration** — `M_OFFSET`/`M_SPAN` already have female values; verify on a real female profile.

### PHASE 4 — Native readiness spike (timeboxed, NON-committal)
Goal: de-risk the native port WITHOUT committing to it. Prove the core + GLB render under Expo.

- [ ] **4.1 Throwaway Expo sandbox** (separate scratch project, not the repo): `@react-three/fiber/native` + `expo-gl` + `expo-three`, load the slimmed GLB, drive `morphTargetInfluences`, import `morphTargets.js` unchanged.
- [ ] **4.2 Confirm:** morph influences animate on a phone; GLB loads at acceptable size; framerate is OK on a mid device.
- [ ] **4.3 Output:** a go/no-go note on native render feasibility + any gotchas (texture format, GLB loader differences). This informs the timeline decision — does not make it.

### PHASE 5 — Material/detail pass (the placeholders)
Goal: make `water`/`vascularity`/`abs_def` real, via material not geometry.

- [ ] **5.1 Normal-map / shader approach** for ab separation + vascularity, driven by the existing low-BF + muscle signal (same inputs the SVG opacity logic uses).
- [ ] **5.2 Decide `water`** — keep as a future global-puffiness geometry morph (bake from scaled `overweight`) IF a compound needs it; otherwise drop the placeholder.

---

## 6. Decisions Locked This Session
- Web (Vercel/Next.js) = **dev sandbox**; native = **eventual real product**.
- Native timeline = **open**, decided after web validation + Phase 4 spike.
- "MAKE IT ME" = **reserve a clean seam now**, build in a later thread.
- Placeholders (`water`/`vascularity`/`abs_def`) = **material pass later**, not geometry.
- Glutes/hams/forearms = **folded into existing `muscle_legs`/`muscle_arms` keys** (no new canonical keys; 13-key contract stable).

## 7. Open Questions for Dallas (not blocking)
- Q1: Free tier = 2D SVG with 3D as Pro unlock? (confirm tiering)
- Q2: Commit the slimmed GLB to the repo, or host it externally (e.g., Supabase Storage / CDN) and fetch at runtime? (Affects repo size + native fetch later.)
- Q3: Is Austin's testing staying mobile-browser-on-Vercel through Phase 3, or do you want the Phase 4 Expo spike sooner?

---

## 8. The One-Line Guardrails (pin these)
1. **Verify before claiming** — read bytes / use a debug isolation toggle before declaring anything fixed.
2. **One lever per iteration** — change a single variable, observe, then the next.
3. **Firewall the core** — `lib/` and `data/` import nothing web/render-specific, ever.
4. **Slim the GLB before it ever hits a commit.**
5. **Dallas decides when work pauses/stops.**

*End of plan.*
