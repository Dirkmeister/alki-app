# Plan D: Compound Classification & Recommendation Engine Review

**Priority: Tier 2 — Do After A/B/C**
**Depends on: Nothing (data-only changes)**
**Important: Modifies compound DATA only — no UI layout, avatar, or protocol changes.**
**Status: DONE (2026-05-27) — see implementation notes.**

> Reconstructed from May 17, 2026 session.

## Implementation notes (2026-05-27)

Decisions made with the owner:
- **Gating stays ADVISORY, not blocking.** Plan D's "verify hard block" and the
  old CLAUDE.md "GLP-1s are blocked" line were both inaccurate to the shipped
  design and have been reconciled. Alki advises (filters lean-user GLP-1s out of
  *recommendations* + shows a contraindication flag) but never hard-blocks
  selection/lock-in. `StackIntelligence.analyzeStack` hardcodes `isBlocked=false`.
  Thresholds in code are 15% / 22% (not the docs' old "12%").
- **Melanotan II** moved from `Performance` to a new **`Cosmetic`** category
  (compounds-expanded.js) + `Cosmetic` color token in AlkiApp `CAT_COLORS`. The
  category filter is built dynamically, so it surfaces automatically.
- **Proactive stack-aware suggestions** added: `getStackSuggestions` in
  StackIntelligence.jsx (reuses existing `COMPOUND_INTEL` synergy data); the
  builder shows a "Pairs well with your selection" strip when ≥1 compound is
  picked, each tappable to add. Antagonist/redundancy warnings remain handled
  post-hoc by `analyzeStack`.
- **Dead `lib/recommendations.js` deleted** (a blocking engine imported nowhere;
  the live engine is the inline `getRecommendations` in AlkiApp.jsx).
- NOT done (deliberately, per owner): full 71-compound category re-audit and
  changing the 15/22 thresholds — left as-is.

---

## The Problem

Austin flagged some compound categorization issues (e.g., Melanotan II placement). The recommendation engine's BF% gating thresholds may need review, and stack-aware recommendations could be smarter.

## The Goal

1. **Audit all compound categories** — verify each compound is in the correct category
2. **Fix Melanotan II classification** if it's miscategorized
3. **Review BF% gating thresholds** — verify GLP-1 blocking below 12% BF, priority above 22%
4. **Add stack-aware recommendation logic** — when a user selects compound X, surface synergistic compounds and warn about antagonistic ones
5. **Verify contraindication logic** catches all known bad combinations

## Scope

Files affected:
- `src/app/data/compounds.js` — category assignments
- `src/app/data/compounds-expanded.js` — expanded compound data
- `src/app/lib/recommendations.js` — recommendation logic
- `src/app/lib/peptideEngine.js` — engine rules

## Testing Checklist

- [x] Melanotan II in correct category — moved to new `Cosmetic` category
- [x] All 8 launch compounds have correct categories (unchanged; reviewed)
- [~] 25% BF fat-loss user → GLP-1 + GH + BPC-157 surfaced in recommendations (advisory ranking)
- [~] 13% BF recovery user → recovery/GH surfaced; GLP-1s de-prioritized (filtered from recommended)
- [x] GLP-1s for lean users are ADVISORY, not hard-blocked — confirmed design decision (not "blocked below 12%")
- [~] Multi-goal users get balanced recommendations (existing engine behavior, unchanged)
- [x] Stack builder shows contraindication advisories (no hard block — `isBlocked=false` by design)
- [x] No broken references after data changes (build passes)
- [x] NEW: stack-aware suggestions — selecting a compound surfaces synergistic partners to add
