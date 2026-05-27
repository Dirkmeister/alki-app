# Plan C: Practical Protocol Guide — "Tell Me Exactly What to Do"

**Priority: Tier 1 — Do With Plans A and B**
**Depends on: Plan A (home screen provides the entry point to protocols)**
**Important: Does NOT duplicate or replace the existing Q&A page content.**
**Status: Not started**

> Reconstructed from May 17, 2026 session.

---

## The Problem

Users lock in a stack but don't know what to actually buy, how to mix it, where to inject, or what schedule to follow. The Q&A page has this information as a reference library, but it's not assembled into a personalized, actionable protocol.

## The Goal

When a user locks in a protocol, they get a personalized implementation guide assembled from their actual stack:

1. **Supply List** — exactly what to buy for THIS stack (vials, bac water, syringes, alcohol swabs)
2. **Reconstitution Calculator** — interactive: adjust vial size / water volume, get units per dose
3. **Injection Site Diagram** — simplified SVG body, green dots for correct SubQ sites
4. **Weekly Schedule** — compounds grouped by timing (AM/PM/specific days), cycling (5 on/2 off)
5. **What to Expect Timeline** — week-by-week merged across all compounds in the stack
6. **Bloodwork Recommendations** — pulled from existing Q&A data

## Relationship to Existing Q&A Content

- **Protocol Guide** = personalized, assembled view (user's actual stack → custom plan)
- **Q&A page** = reference library (searchable, browsable, comprehensive)
- Cross-link between them: "Want more detail on BPC-157? See the full Q&A →"

## Key Steps

- Step 1: Define compound protocol data structure (per-compound: reconstitution, dosing, schedule, week-by-week)
- Step 2: Build supply list generator from locked stack
- Step 3: Interactive reconstitution calculator (real-time math on input changes)
- Step 4: SVG injection site diagram component
- Step 5: Weekly schedule assembler (merges all compounds into one calendar view)
- Step 6: What-to-expect timeline (merges per-compound weekByWeek data)
- Step 7: Assemble full ProtocolGuideView screen
- Step 8: Wire into navigation (CTA from home screen after lock-in)

## Edge Cases

- Non-injectable compounds (GHK-Cu topical) — no syringe/injection info
- GLP-1 compounds (Semaglutide) — weekly dosing, not daily
- Dose escalation schedules (Semaglutide/Retatrutide ramp-up)

## What NOT to Touch

- Home screen layout (Plan A), avatar rendering (Plan B), compound categories (Plan D)
- Q&A page content — already built, not modified
- Recommendation engine, onboarding, Supabase schema

## Testing Checklist

- [ ] Lock in protocol with 2+ compounds → "View Full Protocol" CTA appears
- [ ] Supply list correct for locked stack
- [ ] Reconstitution calculator math is correct (verify manually)
- [ ] Injection site diagram shows correct SubQ sites
- [ ] Weekly schedule groups compounds by timing correctly
- [ ] Cycling protocols show on/off days (5 on/2 off for CJC/Ipamorelin)
- [ ] What-to-expect timeline merges all compound timelines
- [ ] GLP-1 shows weekly dosing, dose escalation visible
- [ ] Disclaimer present at bottom
- [ ] Scrollable on mobile
