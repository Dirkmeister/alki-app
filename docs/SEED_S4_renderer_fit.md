# SEED — Stage 4: Renderer fit fix (decouple height-norm from mass) + recenter

> **Thread type:** Claude **Code**. Shell-only change (`Body3DAvatar.jsx`). No Blender, no firewall
> files.
> **Depends on:** Stage 3 committed — all four bases live, `body_mass` geometry present. Stage 4 is
> what makes the mass channel (Stage 0) + the `body_mass` geometry (Stage 3) actually read as a
> bigger body in-app.
> **Paste into a new Claude Code thread with repo access.**

---

## What you're fixing

`Body3DAvatar.jsx` → `GLBAvatar.fit` does `scale = 1.7 / modelHeight`, **normalizing every body to
1.7 units tall regardless of mass** (`AVATAR_RANGE_ARCHITECTURE.md` §1.4). So a heavier morph gets
scaled back into the same vertical envelope as a lean one — the overall-size signal is cancelled,
and width-only morphs end up carrying 100% of the difference. The mass work upstream is invisible
until this is fixed. There's also a standing "avatar not centered" item to resolve in the same pass.

## Step 0 — read first

1. `CLAUDE.md` (architecture rules — note: this is a **shell** file, NOT firewall `lib/`/`engine/`).
2. `docs/AVATAR_RANGE_ARCHITECTURE.md` §1.4 (the fit/scale/centering analysis), §4.6 (the fix +
   gate).
3. `src/app/avatar/Body3DAvatar.jsx` — `GLBAvatar`, `fit`, the `morphMode` detection, the
   `morphInventory` name-scan.

## The change (shell only)

- **Decouple height-normalization from mass.** Either scale to a **width-aware envelope**, or anchor
  scale to a **frame dimension from derivations (height)** rather than the morphed bounding-box
  height — so a heavier morph genuinely occupies more frame instead of being shrunk back into the
  lean envelope. The avatar's apparent size should track mass, with real (engine) height as the
  anchor, not the post-morph bbox.
- **Recenter** on the morphed bounds in the same pass (fixes "avatar not centered").
- Don't break `morphMode: "shape_keys"` detection or the by-name morph keying — the four bases rely
  on name-keyed influences (per-mesh `morphTargetDictionary` scan), not global index.

## Guardrails

- Shell file only — fine to use three.js/React here. **Do not** add render/DOM imports to
  `lib/`/`engine/`, and do not touch `compoundVectors.js` / `compoundMorphVectors.js`.
- Never push to git.

## Verify gate (STOP for sign-off) — the whole-effort proof

1. `body_mass` 0→1 makes the silhouette **grow** in-app.
2. A heavy profile renders **bigger than a lean one end-to-end** (not just wider) — and the 185 vs
   285 case from Stage 0 now reads as two visibly different-sized bodies.
3. Avatar is **centered** in frame across lean and heavy.
4. Lean↔heavy before/after on one user still reads as the same person changing size (one comparable
   mesh).

This gate is the proof that Stage 0 (math) + Stage 3 (geometry) + Stage 4 (fit) combined fixed the
original 185/285 bug. Report with before/after screenshots, then **stop for sign-off.**

## Commit hand-off

Two copy-text boxes (title + prose description). Do not push.
