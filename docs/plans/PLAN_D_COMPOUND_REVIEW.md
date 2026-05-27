# Plan D: Compound Classification & Recommendation Engine Review

**Priority: Tier 2 — Do After A/B/C**
**Depends on: Nothing (data-only changes)**
**Important: Modifies compound DATA only — no UI layout, avatar, or protocol changes.**
**Status: Not started**

> Reconstructed from May 17, 2026 session.

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

- [ ] Melanotan II in correct category (not under "Performance")
- [ ] All 8 launch compounds have correct categories
- [ ] 25% BF fat loss user → GLP-1 + GH stack + BPC-157
- [ ] 13% BF recovery user → BPC-157 + TB-500 + GH stack, NO GLP-1
- [ ] GLP-1s blocked below 12% BF (verify hard block)
- [ ] Multi-goal users get balanced recommendations
- [ ] Stack builder still enforces contraindication logic
- [ ] No broken references after data changes
