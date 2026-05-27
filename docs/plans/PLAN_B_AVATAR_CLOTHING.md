# Plan B: Avatar Clothing Fix — "Show the Body"

**Priority: Tier 1 — Do With Plan A**
**Depends on: Nothing (can be done in parallel with Plan A)**
**Status: Core DONE (in inline SVG avatar) · two gaps + direction DEFERRED (decide later, 2026-05-27)**

> Reconstructed from May 17, 2026 session.

---

## Status reconciliation (2026-05-27)

The plan's core goal is already implemented in the **inline `BodyAvatar` inside
`AlkiApp.jsx`** (NOT `components/BodyAvatar.jsx`, which was a stale pre-Plan-B
copy — deleted 2026-05-27 along with the unused `screens/Home.jsx` and
`screens/Dashboard.jsx` that imported it):

- ✅ Athletic wear — shirtless male / sports-bra female + dark shorts (`#1a1a1a` / `#2a2a2a`)
- ✅ BF%→definition opacity mapping — exactly `(20 - bf) / 12`, per spec
- ✅ `<150px` line-hiding; shorts/bra scale with waist/chest; all definition lines

**Two checklist items remain unbuilt:** vascularity on arms/legs, and Melanotan II
skin-tone shift (the SVG ignores the `skin` param).

**Key caveat / open decision:** the SVG `BodyAvatar` is only the *fallback*.
`avatarUrl` defaults to the GLB (`AlkiApp.jsx`), so users see the **3D
`Body3DAvatar`** by default — which this plan explicitly says NOT to touch. So the
remaining SVG work is low-visibility, while the high-impact work (clothing/definition
on the 3D avatar) is out of this plan's original scope. **Direction deferred** —
revisit when prioritizing avatar polish vs. other plans.

## The Problem

The SVG parametric avatar currently wears clothing that obscures the physique. For a body-transformation platform, the user needs to SEE the body changing. Clothing hides the exact thing they're tracking.

## The Goal

Replace current clothing with athletic wear that shows the body:
- **Male:** Shirtless + dark athletic shorts
- **Female:** Sports bra + dark athletic shorts
- Muscle definition lines that appear based on body fat percentage
- Torso, arms, and legs visible to show transformation effects

## Styling Specifications

**Athletic wear colors:**
- Shorts/sports bra fill: `#1a1a1a`
- Waistband/straps: `#2a2a2a`
- No logos, no patterns — clean and minimal

**Anatomical definition lines:**
- Stroke color: `rgba(255,255,255, [opacity])` for contrast on any skin tone
- Stroke width: 0.5px for subtle lines, 0.8px for major separations (pec line, ab grid)

**BF% to definition opacity mapping:**
```javascript
const definitionOpacity = Math.max(0, Math.min(1, (20 - bodyFatPercent) / 12));
// 8% BF  → opacity 1.0 (fully visible)
// 14% BF → opacity 0.5
// 20% BF → opacity 0.0 (invisible)
```

**Small avatar rendering (< 150px width):**
- Hide muscle definition lines (too small, looks noisy)
- Shorts and sports bra still visible at all sizes

## What NOT to Touch

- Avatar positioning/sizing logic — Plan A handles that
- 3D avatar (Body3DAvatar / GLB rendering) — separate path
- Effect vectors data structure — already exists
- Compound database, recommendation engine, onboarding — no changes

## Testing Checklist

- [x] Male avatar: shirtless, wearing dark shorts, torso fully visible
- [x] Female avatar: sports bra + shorts, midriff and arms visible
- [x] Low BF% (~10%): muscle definition lines clearly visible (abs, pecs, obliques, delts)
- [x] High BF% (~25%): definition lines invisible, body shape shows fat distribution
- [x] Shorts width scales with waist parameter
- [x] Sports bra scales with chest parameter
- [x] Projected "after" avatar matches clothing style
- [ ] Vascularity effect vector visible on exposed arms/legs — NOT built (deferred)
- [ ] Skin tone shift (Melanotan II) visible across body — NOT built (deferred)
- [x] Avatar correct at large size (~300px) and small size (~100px)
- [x] Side-by-side before/after both show athletic wear
- [ ] Mobile responsive — pending Austin's on-device check
- NOTE: all the above applies to the inline SVG fallback; the default avatar is the 3D GLB.
