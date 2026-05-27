# SEED PROMPT — Eidolon Transformation Engine Implementation

> **How to use this:** Paste this whole block into a fresh thread in the Alki project. It assumes Filesystem MCP access to the repo. Work **one sprint at a time** — don't let the thread try to do all 7 at once. After each sprint, push via GitHub Desktop, let Vercel deploy, and have Austin sanity-check before moving on.

---

## CONTEXT (paste as-is)

You are implementing the **Eidolon body-transformation simulation engine** into the Alki app. This is a deterministic, parametric system that projects "research outcomes" onto a body avatar based on a user's biometrics + a selected compound stack.

**Before writing any code, read these files from the filesystem in this order:**
1. `D:\1File System\2Projects\alki-app\src\app\AlkiApp.jsx` — the current app root. Understand existing state shape, the compound database, the recommendation engine, and how the avatar currently consumes parameters.
2. `D:\1File System\2Projects\alki-app\docs\EIDOLON_ENGINE_SPEC.md` — the full mathematical/physiological reference. This is the source of truth for every formula, effect vector, threshold, and time constant. Do not invent numbers — pull them from this doc.

**Do not start editing until you've read both and confirmed back to me:**
- The current state object shape and where compound selection lives
- What morph keys the avatar currently accepts
- Which sprint (below) we're doing this session

---

## ARCHITECTURE — build in 4 layers, never skip ahead

The reference doc specifies four stacked deterministic layers. Build them in this order; each depends on the one before it:

1. **State layer** — physiological state variables (LBM, FM, BF%, VAT/SAT, ICW/ECW, glycogen, collagen, tan, IGF/androgen tone, recovery multiplier)
2. **Derivation layer** — anthropometric math (Boer LBM, Navy BF, FFMI/nFFMI, Casey-Butt ceilings, BSA, visible thresholds)
3. **Effect-vector layer** — per-compound vectors that push state over time with rate constants + saturation against ceilings
4. **Mapping layer** — converts state → normalized [0,1] morph keys + skin material values

**File structure to create** (keep logic OUT of AlkiApp.jsx — these are pure functions, fully portable to React Native later):
```
src/app/engine/
├── derivations.js      ← Layer 2: LBM, BF, FFMI, ceilings, BSA, thresholds (pure functions)
├── compoundVectors.js  ← Layer 3: the effect-vector table from §5.8 + evidence grades
├── simulate.js         ← the integrator: takes (profile, stack, weeks) → state timeline
├── mapToMorphs.js      ← Layer 4: state → morph keys + material values
└── constants.js        ← sex-branched constants, thresholds, time constants, reference doses
```
Everything in `engine/` is a pure function with no React dependency. AlkiApp.jsx imports `simulate()` and `mapToMorphs()` and feeds the output to the existing avatar.

---

## SPRINT SEQUENCE (do ONE per session)

### Sprint 1 — Derivation layer (no compounds yet)
**Build:** `constants.js` + `derivations.js`.
- Sex-branched constants: essential fat, FFMI ceilings (25 M / 22 F), ab/vascularity sigmoid centers, water fractions (TBW = 0.72 × LBM).
- Functions: `leanBodyMass()` (Boer, prefer `W×(1−BF)` when BF supplied), `fatMass()`, `bmi()`, `ffmi()`, `normalizedFFMI()` (Kouri), `bsa()` (Du Bois + Mosteller), `navyBodyFat()`, `deurenbergBF()`, `caseyButtMaxLBM()`, `caseyButtRegional()`, anthropometric defaults for missing wrist/ankle/neck.
- **Verify:** create a throwaway test call with a known profile (e.g., M, 30y, 180cm, 80kg, 15% BF) and console-log every derived value. Sanity-check against the doc: LBM ≈ 68 kg, FFMI ≈ 21, nFFMI ≈ 21, Casey-Butt max LBM in a believable range. Paste the numbers back to me before moving on.

### Sprint 2 — Fat-loss class (GLP-1 + tesamorelin)
**Build:** start `compoundVectors.js` (semaglutide, retatrutide, tesamorelin, fragment 176-191, MOTS-C) + `simulate.js` integrator + `mapToMorphs.js` (waist, bf_low, abs_def, facial fullness).
- Integrator: the `dS/dt` equation from §6.2 with the three time-scales (fat τ ≈ 8–12 wk).
- Mapping: sigmoid for abs_def (center 12% M / 20% F), linear for bf_low and waist.
- **Verify:** simulate a 26% BF male on semaglutide for 12 weeks. Confirm waist shrinks, bf_low rises, abs_def stays near 0 (still above threshold). Then run retatrutide and confirm a stronger effect. Numbers should track the doc's ΔFM:ΔLBM splits.

### Sprint 3 — Muscle class (SARMs + testosterone)
**Build:** add SARMs + testosterone to `compoundVectors.js`; implement regional muscle morphs + the dynamic Casey-Butt ceiling lift + androgen-tone upper-body bias.
- Saturation: `(1 − LBM/LBM_max_effective)^k`, ceiling lifted per-compound (Test +40%, RAD +18%, LGD +12%, Ostarine +7%).
- Sex modulation: double SARM responsiveness for women (Neil 2018), halve non-anabolic LBM rates.
- **Verify:** simulate a lean 13% male novice on RAD-140 12 wk — shoulders/arms scale up, vascularity unlocks (below 12% threshold). Then same profile on testosterone — bigger gain + water flag rising. Confirm an advanced lifter near ceiling gains far less (newbie-gains multiplier working).

### Sprint 4 — GH-axis + water (the puffiness layer)
**Build:** GH-axis compounds (MK-677, Ipa/CJC, sermorelin, IGF-1 LR3) + the ICW/ECW + glycogen water pipeline + `water` morph.
- **Critical:** water has a FAST time constant (τ ≈ 7 days). The most common failure is the avatar not visibly puffing up in week 1.
- GH-axis combine with saturating function `tone = 1 − ∏(1 − tone_i)`, NOT additive.
- **Verify:** simulate MK-677 — facial fullness + water morph should rise visibly by simulated week 2, before any real tissue change. Confirm MK-677 + CJC-DAC together don't exceed ~0.85 normalized GH-axis tone.

### Sprint 5 — Skin material (GHK-Cu, Epitalon, Melanotan)
**Build:** skin material outputs (roughness, luminosity) + Melanotan tan-lerp capped by Fitzpatrick type.
- These move MATERIAL params, not geometry. GHK-Cu drives collagen (topical evidence strong, systemic weak — flag accordingly).
- **Verify:** Melanotan on Fitzpatrick I caps tan at ~0.4; on Fitzpatrick IV reaches ~1.0. GHK-Cu raises luminosity/lowers roughness over 12 wk, zero geometry change.

### Sprint 6 — Recovery multiplier + preclinical mimetics
**Build:** the `R` recovery multiplier (BPC-157, TB-500) that buffs co-stacked anabolic LBM rate but moves NO morph directly; add Cardarine, SR-9009, AICAR, SLU-PP-332, clenbuterol, T3 with D-grade flags.
- **Critical honesty:** BPC/TB-500 must surface as a numeric "gains accelerator" multiplier in the protocol summary, not a body change. T3 must DEBIT lean mass (catabolic) — the avatar gets leaner but visibly flatter.
- **Verify:** BPC-157 alone = zero morph change but R multiplier shows in summary. BPC-157 + RAD-140 = faster muscle gain than RAD-140 alone. T3 = fat down AND muscle morphs down.

### Sprint 7 — Regression / "what if I stop?"
**Build:** the decay simulation. Water regresses in 2–4 wk, tan t½ ≈ 2 mo, SARM LBM 30–50% lost in 8–12 wk, GLP-1 rebound to +11.6% over baseline at wk 120 (Wilding 2022 anchor), collagen ~50% over 3–6 mo.
- **Verify:** run a stack to week 12, then simulate cessation. Confirm water deflates fast, muscle decays slow, GLP-1 fat rebounds per the doc curve.

---

## EVIDENCE-GRADE BADGES (wire into UI, every sprint)
Every compound carries an A/B/C/D badge (§8 of the doc). A-grade renders as solid morphs; D-grade renders as a translucent "hypothesis" overlay with a confidence band. Don't ship a projection without its badge.

---

## NON-NEGOTIABLES
- **No invented numbers.** Every magnitude, threshold, and time constant comes from the reference doc. If the doc doesn't cover something, ask me — don't guess.
- **Engine code stays pure** (no React) so it ports to React Native later. The whole point is nothing is throwaway.
- **"Projected research outcomes," never "expected results."** Keep the framing research/simulation, not medical.
- **Don't refactor AlkiApp.jsx wholesale.** Add the engine import + wire the output to the existing avatar. Minimal surface change.

## WORKFLOW (after each sprint)
1. Write changes directly to the files.
2. Give me **two copy-text boxes**: one for the GitHub commit title, one for the description.
3. I push via GitHub Desktop → Vercel auto-deploys → Austin tests on mobile.

---

**Start by telling me which sprint we're doing, then read the two files and confirm the current state shape + avatar morph keys before writing anything.**
