# Plan C: Practical Protocol Guide — "Tell Me Exactly What to Do"

**Priority: Tier 1 — Do With Plans A and B**
**Depends on: Plan A (home screen provides the entry point to protocols)**
**Important: Does NOT duplicate or replace the existing Q&A page content.**
**Status: BUILT (2026-05-27) — all 6 sections live; expanded-compound data is `needs_review`.**

> Reconstructed from May 17, 2026 session.

---

## Implementation notes (2026-05-27)

Built as a new `protocol_guide` screen reached from a "View Full Protocol →" CTA
in committed mode. Files:
- `src/app/data/protocolProtocols.js` — canonical per-compound data for all 71.
  The 8 core are hand-authored (`confidence: "high"`) from `CYCLE_PROFILES` + Q&A;
  the rest are **derived** from each compound's in-repo dosing/cycle/route/category
  and flagged `confidence: "needs_review"`. `REVIEW_QUEUE` lists them — **Dallas must
  audit these before treating them as authoritative** (health-adjacent data).
- `src/app/lib/protocolGuide.js` — pure helpers: `reconstitute`, `buildSupplyList`,
  `siteRotation`, `buildSchedule`, `mergeTimeline`.
- `src/app/screens/ProtocolGuideView.jsx` — the 6 sections (sub-components colocated).
- `src/app/AlkiApp.jsx` — route + `onProtocolGuide` prop + committed-mode CTA.
- Compound `displayWarning`s (e.g. Cardarine "CARCINOGENIC") surface as an
  informational banner at the top of the guide. **No guardrails** — it never
  blocks, hides, or disables the compound/guide (Alki advises, never gatekeeps).

**Audit pass (2026-05-27):** systematically compared every derived record against
its source. Fixed three derivation bugs — frequency precedence ("2x/week" /
"3x weekly" mis-read as once-weekly; "2–3x daily" mis-read as 2x-week), route
("Oral or topical" → oral), and `parseCycle` no longer fabricates "8 weeks" when
the source has no fixed length (shows the real cadence text instead). No "error"
flags remain; the ~29 `needs_review` items left are genuine domain calls (per-vial
reconstitution sizes, week-by-week expectations, experimental compounds with no
published dose) for owner verification.

**Deviation from the approved plan (lower risk):** rather than extracting a
`cycleEngine.js` and modifying the working `CycleTimeline`, the guide's Weekly
Schedule is built directly from the authored data (`buildSchedule`) and the guide
**cross-links** to the full Protocol Timeline (CycleTimeline, untouched). This keeps
the verified timeline screen unchanged and makes the guide self-contained on the
authored dataset. Verified end-to-end (Playwright): all 6 sections render, recon
calc is reactive, supply list omits syringes for orals, Q&A cross-link works,
build passes, 0 console errors.

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

- [x] Lock in protocol with 2+ compounds → "View Full Protocol" CTA appears
- [x] Supply list correct for locked stack (orals omit syringes; bac water summed)
- [x] Reconstitution calculator math is correct (5mg/2mL/500mcg = 20 units; reactive)
- [x] Injection site diagram shows correct SubQ sites (union across injectables)
- [x] Weekly schedule groups compounds by timing correctly (AM/PM/weekly/as-needed)
- [x] Cycling protocols show on/off weeks
- [x] What-to-expect timeline merges compound expectations by week band
- [x] GLP-1 shows weekly dosing + titration schedule (Semaglutide/Retatrutide)
- [x] Disclaimer present at bottom + Q&A cross-link
- [ ] Scrollable on mobile — verified at 414px viewport; pending Austin's device check
- NOTE: expanded-compound (63) records are derived + `needs_review` — owner audit pending.
