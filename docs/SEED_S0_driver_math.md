# SEED — Stage 0: Driver Math (independent mass channel + sigmoid reshape)

> **Thread type:** Claude **Code**. Pure-JS engine work — no Blender, no mesh, ships on the
> CURRENT mesh.
> **Decided at the STOP gate (2026-06-04):** full Option C (`AVATAR_RANGE_ARCHITECTURE.md`).
> This is the first execution stage. It is a hard dependency for all four base meshes — it is the
> math that drives them, not a reduced scope.
> **Paste into a new Claude Code thread with repo access.**

---

## What you're fixing

Two stacked failures make a 185 lb and a 285 lb male (5'10", 18% BF) render as nearly the same body
(Supabase feedback, byte-verified in `AVATAR_RANGE_ARCHITECTURE.md` §1.2):

1. **No independent mass/adiposity channel.** At a static "current" snapshot, both fat channels are
   zero (`bf_low`/`bf_high` are defined relative to the user's *own* baseline), so everything
   distinguishing two current bodies launders through the muscle channel.
2. **The muscle channel saturates.** The live driver
   `mo = clamp(sigmoid((LBM/LBM_max_natural − 0.7) × 8), 0, 1)` puts the entire 100 lb difference
   into a **0.29 sliver on the flat top of the sigmoid** (0.70 → 0.99), and pins everyone at/above
   natural max to ~1.0. The heavy man isn't clamped — he's **modeled as a bodybuilder**.

The reference numbers to reproduce (5'10" M, default wrist/ankle, 18% BF):

| | 185 lb | 285 lb |
|---|---|---|
| LBM | 68.8 kg (FFMI 21.8) | 106.0 kg (FFMI 33.5) |
| Casey-Butt LBM_max | 85.2 kg | 85.2 kg (identical — same frame) |
| lbmRatio = LBM / LBM_max | 0.807 | 1.244 |
| current `mo` | 0.70 | 0.99 |

## Step 0 — read first (do not write before reading)

1. `CLAUDE.md` (repo root) — architecture rules, firewall, IP warnings.
2. `docs/AVATAR_RANGE_ARCHITECTURE.md` — §1.2 (the exact convergence), §4.2 (the two changes),
   §4.8 (what the plan protects), Appendix A (why the muscle channel reshape is principled, not a
   bug-fix-on-a-bug — the engine is spec-faithful; this is a deliberate lens evolution).
3. The live engine: `src/app/engine/simulate.js`, `engine/derivations.js`, `engine/mapToMorphs.js`,
   `engine/constants.js`. The **live** profile→morph path is `AlkiApp.jsx resolveAvatarParams`
   (≈ line 451) → `simulate()` → `mapToMorphs()`. `lib/morphTargets.js resolveMorphStates` is the
   **catch-fallback** only (incomplete profile).
4. `src/app/lib/morphTargets.js` — `MORPH_TARGETS` and `baselineMorphState` (the fallback path).

## The two coordinated changes

Both live in `engine/mapToMorphs.js` (live) **mirrored** in `lib/morphTargets.js` (fallback). You
change the **state→weight mapping** (the lens), not the physiology. **Engine state outputs
(LBM / BF% / ceilings / compound vectors) are unchanged.**

### (a) Independent `body_mass` channel
Add a driver output for `body_mass` computed from **absolute adiposity relative to frame** — a
function of BF% above neutral *plus* absolute fat mass — so:
- 285 lb / 18% BF drives `body_mass` **high**
- 185 lb / 18% BF drives `body_mass` **low**
- **regardless of the muscle sigmoid.**

Add `body_mass` to `MORPH_TARGETS` now (range `[0,1]`, default `0`, category `"adiposity"`) so the
output has a home and the renderer's name-scan recognizes it. (The renderer keys morphs by name; a
key absent from the current GLB is simply ignored — harmless until the `body_mass` mesh ships in
Stage 3.) This satisfies the "`MORPH_TARGETS += body_mass`" item that `AVATAR_RANGE_ARCHITECTURE.md`
§4.7 lists under Stage 1 — doing it here is fine and keeps the channel from being half-wired.

**Temporary bridge so Stage 0 shows improvement on the current mesh:** until the `body_mass` mesh
exists (Stage 3), also route a fraction of the `body_mass` signal into `bf_high` (the only live
"heavy" key), so the heavy man visibly reads heavier *now*. Mark this nudge clearly in a comment as
a Stage-0 bridge to be removed/retuned once `body_mass` geometry lands.

### (b) Reshape the muscle sigmoid
The 185→285 difference must stop living on the saturating shoulder. Choose during implementation,
using the debug panel:
- **re-center / re-slope** — lower the sigmoid center and reduce the ×8 steepness so the working
  range (`lbmRatio` ~0.65 → 1.0) spans more morph travel; and/or
- **scale muscle morph magnitude with absolute LBM** — a bigger frame reads larger at equal ratio.

**Hard constraint:** week-0 `current` must keep matching the user's real body. This is a lens
change. Do not alter what `simulate()` reports for LBM / BF% / ceilings.

## Firewall & IP guardrails (non-negotiable)

- `engine/` and `lib/` import **nothing** from React / three.js / DOM. Pure JS only.
- **Do not touch** `engine/compoundVectors.js` or `lib/compoundMorphVectors.js` — core IP effect
  vectors. This stage changes state→weight mapping only.
- Never push to git. Dallas commits via GitHub Desktop.

## Verify gate (STOP for sign-off — no mesh needed)

1. Write a tiny Node harness (throwaway) that runs both profiles through the **patched** mapper:
   185 lb and 285 lb, 5'10", default wrist/ankle, 18% BF.
2. Assert the resulting morph states are **visibly separated**: `body_mass` divergent (heavy high,
   lean low); muscle weights **no longer both pinned ~1.0**.
3. Confirm week-0 `current` LBM / BF% / ceilings are **unchanged** vs. pre-patch (lens-only proof).
4. In-app debug panel: the heavy profile no longer renders as a bodybuilder (note: the full in-app
   silhouette payoff lands after Stage 3 geometry + Stage 4 fit; Stage 0's proof is the Node
   separation + debug-panel morph readout, not the rendered size).

Report the before/after morph numbers for both profiles, then **stop for sign-off** before any
further stage.

## Commit hand-off

Provide two copy-text boxes: commit title + plain-prose description (imperative summary line, no
markdown/bullets in the body). Do not push.
