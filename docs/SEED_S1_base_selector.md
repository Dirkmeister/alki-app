# SEED — Stage 1: Base-mesh selector + avatar_url migration

> **Thread type:** Claude **Code**. Pure-JS infra + a small AlkiApp wiring change. No Blender.
> **Depends on:** Stage 0 committed (`SEED_S0_driver_math.md`) — `body_mass` is in `MORPH_TARGETS`
> by now. If Stage 0 did not add it, add it here.
> **Ships safely before any new mesh exists** — the selector degrades gracefully to the mesh that
> is actually present.
> **Paste into a new Claude Code thread with repo access.**

---

## What you're building

A pure function that picks which base GLB a user gets from their **starting** profile, plus the
migration that makes it the avatar source — replacing the current single-string `avatarUrl` that
only ever holds the male default.

Grounding (byte-verified, `AVATAR_RANGE_ARCHITECTURE.md` §1.5): there is **no `bodyUrl` field in
live code** today; the live equivalent is a flat `avatarUrl` string that is *always* the default
(the only user-specific write is gated behind `AVATURN_ENABLED`, off in production). So
`avatar_url` carries **no irreplaceable user data** → migration is clean.

## Step 0 — read first

1. `CLAUDE.md`.
2. `docs/AVATAR_RANGE_ARCHITECTURE.md` §1.5 (avatar_url lifecycle), §4.1 (the selector spec), §4.4
   (load order + migration), §4.8 (seam preservation).
3. `src/app/engine/derivations.js` (`deriveAll` — for week-0 BF% / FFMI).
4. `src/app/AlkiApp.jsx` — the avatar resolution sites: `DEFAULT_AVATAR_URL` (≈:28),
   `useState(DEFAULT_AVATAR_URL)` (≈:3620), the two Supabase loads `setAvatarUrl(saved.avatarUrl || DEFAULT)`
   (≈:3718, ≈:3812). Line numbers drift — confirm by reading.

## Build: `src/app/lib/selectBaseMesh.js` (NEW — firewall-safe)

```
selectBaseMesh(profile) → string   // ALWAYS non-null
```
- No React / three.js / DOM imports (Node-runnable; firewall rule).
- Reads `sex` + **week-0** derivations (weight, bodyFat, height → BF%, FFMI via `deriveAll`).
  Keys off the **starting** body, never the projected one.
- Sex → male/female branch. Within sex, lean-vs-heavy by a **BF% + mass band** (mass × leanness is
  2-D, not BF alone). First cut: heavy when `BF% ≥ ~25 (M) / ~32 (F)` or a frame-relative BMI
  cutoff; else lean. **This band is the one calibration knob — isolate it in this function** so it
  can be tuned without touching anything else.
- Returns the canonical `/alki_humgen_{male|female}_{lean|heavy}.glb`.
- `DEFAULT_AVATAR_URL` (male-lean) is the ultimate fallback for an incomplete profile — never null.

## Graceful availability layer (so Stage 1 ships before the meshes exist)

At Stage 1 only the current mesh exists on disk. The selector must return canonical names **and not
404**. Add a small `AVAILABLE_BASES` set (or equivalent) that maps any not-yet-built URL to the best
present fallback:
- **Now (pre-S2):** every canonical URL → the current `/alki_humgen_male.glb`.
- **After S2 (lean bases land):** `male_lean` + `female_lean` real; `*_heavy` → fall back to the
  matching lean.
- **After S3:** all four real; remove the fallbacks.

Keep this map obvious and one-line-editable — it shrinks as stages land. The selector returns
intent; the availability layer guarantees a loadable file.

## Migration (grounded in the verified lifecycle, §4.4)

- Change both Supabase-load sites from `setAvatarUrl(saved.avatarUrl || DEFAULT)` to
  `setAvatarUrl(<availability-resolved> selectBaseMesh(profile))`. **Why:** a stored value would
  pin existing users and re-break female users on the existing base.
- **Ignore** the `localStorage` `alki_avatar_url` mirror for *selection* (leave the key for the
  disabled Avaturn path; don't let it drive base choice).
- **Reserve `avatar_url` for the future custom-mesh override:** a *non-null* value will mean "user
  has a custom 'MAKE IT ME' mesh — use it instead of the selected base." Its meaning narrows from
  "the avatar" to "a custom override, if any." This preserves the
  `{ bodyUrl, headUrl, morphState, materialParams }` seam (`headUrl` stays null;
  `morphState`/`materialParams` from `resolveAvatarParams`, unchanged).
- **No destructive DB migration** — existing `avatar_url` values become inert. Optional one-line
  null-backfill is cleanup, not required.

## Firewall & IP guardrails

- `selectBaseMesh.js` is pure `lib/` — no render/DOM imports.
- Do not touch `compoundVectors.js` / `compoundMorphVectors.js`.
- Never push to git.

## Verify gate (STOP for sign-off)

1. Node: `selectBaseMesh` returns the correct URL across a grid of profiles (lean M, heavy M, lean
   F, heavy F, incomplete → male-lean default).
2. Existing users are **not pinned** to a stored value — confirm the load sites no longer read
   `saved.avatarUrl` as the source.
3. A female profile **selects the female URL**, and (pre-S2) the availability layer resolves it to a
   real, loadable file with no 404.
4. App still boots and the current avatar still renders.

Report the selector's output grid, then **stop for sign-off**.

## Commit hand-off

Two copy-text boxes (title + prose description). Do not push.
