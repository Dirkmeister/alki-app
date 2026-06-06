# Alki — Sprint-fix Verification Suite

Checks whether the sprint fixes actually *hold* — it tests **behaviour**, not intent.
Every check can FAIL; a fix marked "done" that doesn't hold is reported FAIL, loudly,
and the test is never softened to make it pass. This is a **test-authoring** layer —
it makes no product-code changes and writes nothing to the Supabase `feedback` table
(it only reads).

## Run it

```bash
# 1) have the app running locally (the suite reuses a server if one answers,
#    otherwise it starts `npm run start` / `npm run dev` on :3000)
npm run build && npx next start -p 3000

# 2) run everything (static data-checks + Playwright e2e)
node verify/run.mjs

# point at a different port/host:
VERIFY_URL=http://localhost:3100 node verify/run.mjs

# static checks only (no browser):
node verify/run.mjs --data-only
node verify/data-checks.mjs
```

> ⚠️ Run against the **current working tree** (a local build/dev), not prod — prod
> may lag behind the code that contains the fixes. The report prints the exact git
> commit it tested so results map to that code.

## What you get

- A console report grouped by sprint with four buckets:
  - **PASS** — machine-verified true.
  - **FAIL** — claimed fixed but verification says otherwise (or a confirmed regression).
  - **MANUAL** — only a human can honestly judge (visual / multi-account / email).
  - **BLOCKED** — the check couldn't reach the UI state to judge (never a silent pass).
- **`verify-report.json`** (repo root) — one row per check
  `{feedback_id, sprint, check, result, detail, tested_commit}`. Close passing
  feedback rows by `feedback_id` from here.
- **`verify/MANUAL_CHECKLIST.md`** — regenerated each run; the human-only checks
  for you / Austin (clothing render, 185-vs-285 avatar, password-reset email, etc.).

The runner exits non-zero only when there is a real **FAIL** (MANUAL/BLOCKED do not
fail the gate — they mean "go look").

## Layout

```
verify/
├── run.mjs              # runner: data-checks + e2e → report + JSON + checklist
├── data-checks.mjs      # pure-Node static assertions (no browser) — the false-close catchers
├── e2e/
│   ├── _harness.mjs     # shared Playwright helpers (reuses the project's raw `playwright` lib)
│   ├── journey.spec.mjs # one onboarding → builder + committed + projection + nav checks
│   ├── settings-qa.spec.mjs
│   ├── admin.spec.mjs   # /admin gated when signed out
│   └── rls.spec.mjs     # progress_logs RLS behavioural half (anon read)
├── MANUAL_CHECKLIST.md  # generated
└── screenshots/         # generated (gitignored)
```

## Notes on the always-MANUAL items

Some things a machine cannot honestly sign off in this setup:
- **Age-gate write / cross-user RLS / Settings Sign-Out** need a *signed-in* account
  (the suite runs as a guest; standing up real auth users writes to the live project).
- **Clothing render, 185-vs-285 avatar difference, password-reset email** are
  visual / external. These are listed in `MANUAL_CHECKLIST.md`.
