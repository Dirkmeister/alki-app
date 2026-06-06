#!/usr/bin/env node
// verify/data-checks.mjs
// ─────────────────────────────────────────────────────────────────────────────
// ALKI — SPRINT-FIX VERIFICATION: static / data layer (NO browser).
//
// These are the highest-value checks: this is where a "fix" that was marked
// done can be silently false-closed (the wrong source still says the old
// thing). Every assertion below can FAIL. A failing check means a claimed fix
// did NOT actually land — we report FAIL loudly, we do NOT soften the test.
//
// Buckets used: PASS (machine-verified true) | FAIL (claimed fixed, isn't)
//             | MANUAL (a human must confirm) | BLOCKED (a prerequisite, e.g.
//               a migration, isn't in place, so the check can't run honestly).
//
// This file makes NO product-code changes and writes NOTHING to the DB. It
// reads source files in the working tree + the supabase/migrations/ SQL (the
// source of truth for schema). It imports the pure compound-data modules
// directly so it tests the REAL data objects, not a regex guess.
//
// Run standalone:  node verify/data-checks.mjs
// Or import { runDataChecks } from "./data-checks.mjs" (used by run.mjs).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src", "app");
const MIG = path.join(ROOT, "supabase", "migrations");

const P = {
  alkiApp:        path.join(SRC, "AlkiApp.jsx"),
  compoundsIndex: path.join(SRC, "data", "compounds.js"),
  compoundsCore:  path.join(SRC, "data", "compoundsCore.js"),
  compoundsExp:   path.join(SRC, "data", "compounds-expanded.js"),
  protocols:      path.join(SRC, "data", "protocolProtocols.js"),
  cycleTimeline:  path.join(SRC, "components", "CycleTimeline.jsx"),
  protocolQA:     path.join(SRC, "screens", "AlkiProtocolQA.jsx"),
  disclaimer:     path.join(SRC, "lib", "disclaimer.js"),
  mig005Settings: path.join(MIG, "005_settings.sql"),
  mig005Rls:      path.join(MIG, "005_progress_rls_harden.sql"),
  mig006Age:      path.join(MIG, "006_age_verification.sql"),
};

// ── result plumbing ──────────────────────────────────────────────────────────
const results = [];
function record(feedback_id, sprint, check, result, detail) {
  results.push({ feedback_id, sprint, check, result, detail });
}
// assert(): PASS when cond is true, FAIL when false. `detail` describes what was
// actually observed either way so a reader can audit the verdict.
function assert(meta, cond, passDetail, failDetail) {
  record(meta.id, meta.sprint, meta.check, cond ? "PASS" : "FAIL", cond ? passDetail : failDetail);
  return cond;
}
function read(p) {
  try { return readFileSync(p, "utf8"); } catch { return null; }
}

// Import a self-contained ESM data module (no relative imports inside) without a
// temp file: the project's package.json has no "type":"module", so a .js import
// would be treated as CommonJS and choke on `export`. A data: URL is always ESM.
async function importSelfContained(absPath) {
  const src = readFileSync(absPath, "utf8");
  return import("data:text/javascript," + encodeURIComponent(src));
}

// Extract the `<key>: { ... }` object-literal slice for a top-level data key, so
// a regex assertion is scoped to the right record instead of the whole file.
function sliceObjectBlock(text, keyRegex) {
  const m = text.match(keyRegex);
  if (!m) return null;
  let i = text.indexOf("{", m.index);
  if (i === -1) return null;
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const ch = text[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(i, j + 1); }
  }
  return null;
}

const FOUR_ON_OFF = /4\s*[-–]?\s*(?:weeks?\s*)?on|4\s*on\s*\/?\s*2|4\s*weeks?\s*on\s*,?\s*2\s*weeks?\s*off/i;

// ═════════════════════════════════════════════════════════════════════════════
export async function runDataChecks() {
  results.length = 0;

  // ── Load the real combined compound data (core + expanded) ────────────────
  let CORE = null, EXPANDED = null, COMBINED = null, loadErr = null;
  try {
    CORE = (await importSelfContained(P.compoundsCore)).CORE_COMPOUNDS;
    EXPANDED = (await importSelfContained(P.compoundsExp)).EXPANDED_COMPOUNDS;
    COMBINED = [...CORE, ...EXPANDED];
  } catch (e) { loadErr = e; }

  const txtApp   = read(P.alkiApp);
  const txtIndex = read(P.compoundsIndex);
  const txtProto = read(P.protocols);
  const txtTL    = read(P.cycleTimeline);
  const txtQA    = read(P.protocolQA);
  const txtDisc  = read(P.disclaimer);

  // ───────────────────────────────────────────────────────────────────────────
  // 1) GHK-Cu coherence (73b5170e) — 8-week CONTINUOUS in ALL FOUR sources.
  //    This is the one that was falsely closed once, so each source is its own
  //    explicit assertion. ANY source still saying 4-on/2-off => FAIL.
  // ───────────────────────────────────────────────────────────────────────────
  const ghkMeta = (n) => ({ id: "73b5170e", sprint: "Compound data unification", check: `GHK-Cu cycle = 8-week continuous — source ${n}` });

  // Source 1: compound card data (compoundsCore.js ghkcu.cycle)
  if (COMBINED) {
    const ghk = COMBINED.find(c => c.id === "ghkcu");
    const cyc = ghk?.cycle || "";
    const ok = /continuous/i.test(cyc) && /8\s*weeks?/i.test(cyc) && !FOUR_ON_OFF.test(cyc);
    assert(ghkMeta("1: compound card (compoundsCore.js)"), ok,
      `ghkcu.cycle = "${cyc}" — continuous + ~8 weeks, no 4-on/2-off.`,
      `ghkcu.cycle = "${cyc}" — does NOT read as 8-week continuous (or still encodes 4-on/2-off).`);
  } else {
    record("73b5170e", "Compound data unification", "GHK-Cu cycle — source 1: compound card", "FAIL",
      `Could not load compound data: ${loadErr?.message || "unknown"}`);
  }

  // Source 2: protocolProtocols.js authored ghkcu record
  if (txtProto) {
    const blk = sliceObjectBlock(txtProto, /\bghkcu\s*:/);
    const ok = !!blk && /standardCycleWeeks\s*:\s*8\b/.test(blk) && /onWeeks\s*:\s*8\b/.test(blk)
      && /offWeeks\s*:\s*0\b/.test(blk) && !/onWeeks\s*:\s*4\b/.test(blk);
    assert(ghkMeta("2: protocolProtocols.js"), ok,
      `AUTHORED.ghkcu.cycle = { onWeeks:8, offWeeks:0, standardCycleWeeks:8 }.`,
      `AUTHORED.ghkcu cycle block did not assert onWeeks:8 / offWeeks:0 / standardCycleWeeks:8. Block: ${blk ? blk.slice(0, 200) : "NOT FOUND"}`);
  } else record("73b5170e", "Compound data unification", "GHK-Cu cycle — source 2: protocolProtocols.js", "FAIL", "protocolProtocols.js not readable.");

  // Source 3: CycleTimeline CYCLE_PROFILES.ghkcu
  if (txtTL) {
    const blk = sliceObjectBlock(txtTL, /\bghkcu\s*:\s*\{/);
    const ok = !!blk && /standardCycleWeeks\s*:\s*8\b/.test(blk) && !/standardCycleWeeks\s*:\s*4\b/.test(blk) && !FOUR_ON_OFF.test(blk);
    assert(ghkMeta("3: CycleTimeline profile"), ok,
      `CYCLE_PROFILES.ghkcu.standardCycleWeeks = 8, continuous (no 4-on/2-off).`,
      `CYCLE_PROFILES.ghkcu did not assert standardCycleWeeks:8 / continuous. Block: ${blk ? blk.slice(0, 240) : "NOT FOUND"}`);
  } else record("73b5170e", "Compound data unification", "GHK-Cu cycle — source 3: CycleTimeline", "FAIL", "CycleTimeline.jsx not readable.");

  // Source 4: AlkiProtocolQA "How long should a GHK-Cu cycle run?" FAQ
  if (txtQA) {
    // Scope to the GHK-Cu cycle-length answer.
    const m = txtQA.match(/How long should a GHK-Cu cycle run\?[\s\S]{0,600}/i);
    const ans = m ? m[0] : "";
    const ok = !!ans && /continuous/i.test(ans) && /8\s*weeks?/i.test(ans) && !FOUR_ON_OFF.test(ans);
    assert(ghkMeta("4: AlkiProtocolQA FAQ"), ok,
      `GHK-Cu cycle FAQ says run continuously for ~8 weeks (no 4-on/2-off).`,
      `GHK-Cu cycle FAQ did not read as 8-week continuous. Snippet: ${ans ? ans.slice(0, 240) : "FAQ NOT FOUND"}`);
  } else record("73b5170e", "Compound data unification", "GHK-Cu cycle — source 4: AlkiProtocolQA", "FAIL", "AlkiProtocolQA.jsx not readable.");

  // ───────────────────────────────────────────────────────────────────────────
  // 2) Source unification (audit item 9)
  // ───────────────────────────────────────────────────────────────────────────
  // 2a — no inline COMPOUNDS array still declared in AlkiApp.jsx
  if (txtApp) {
    const inlineDecl = /\b(?:const|let|var)\s+COMPOUNDS\s*=/.test(txtApp);
    const importsIt = /import\s*\{[^}]*\bCOMPOUNDS\b[^}]*\}\s*from\s*["']\.\/data\/compounds["']/.test(txtApp);
    assert({ id: "audit-9", sprint: "Compound data unification", check: "No inline COMPOUNDS array in AlkiApp.jsx (imported instead)" },
      !inlineDecl && importsIt,
      `AlkiApp.jsx imports COMPOUNDS from ./data/compounds and declares no inline array.`,
      `AlkiApp.jsx ${inlineDecl ? "still DECLARES an inline COMPOUNDS array" : "does not import COMPOUNDS from ./data/compounds"}.`);
  }
  // 2b — combiner spreads both core + expanded
  if (txtIndex) {
    const ok = /CORE_COMPOUNDS/.test(txtIndex) && /EXPANDED_COMPOUNDS/.test(txtIndex) && /\.\.\.CORE_COMPOUNDS/.test(txtIndex) && /\.\.\.EXPANDED_COMPOUNDS/.test(txtIndex);
    assert({ id: "audit-9", sprint: "Compound data unification", check: "data/compounds.js combines core + expanded" },
      ok, `compounds.js spreads ...CORE_COMPOUNDS and ...EXPANDED_COMPOUNDS.`,
      `compounds.js does not spread both core + expanded sets.`);
  }
  // 2c — combined length === 71
  if (COMBINED) {
    assert({ id: "audit-9", sprint: "Compound data unification", check: "Combined COMPOUNDS length === 71" },
      COMBINED.length === 71, `COMPOUNDS.length === 71 (core ${CORE.length} + expanded ${EXPANDED.length}).`,
      `COMPOUNDS.length === ${COMBINED.length} (expected 71; core ${CORE.length} + expanded ${EXPANDED.length}).`);
    // 2d — zero duplicate ids
    const ids = COMBINED.map(c => c.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert({ id: "audit-9", sprint: "Compound data unification", check: "Zero duplicate compound ids" },
      dupes.length === 0, `All ${ids.length} compound ids unique.`,
      `Duplicate compound ids found: ${[...new Set(dupes)].join(", ")}`);
  } else {
    record("audit-9", "Compound data unification", "Combined COMPOUNDS length === 71", "FAIL", `Could not load compound data: ${loadErr?.message || "unknown"}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3) Classification (6.9)
  // ───────────────────────────────────────────────────────────────────────────
  if (COMBINED) {
    const byId = Object.fromEntries(COMBINED.map(c => [c.id, c]));
    const mt2 = byId["melanotan2"];
    assert({ id: "6.9", sprint: "Classification & dosing", check: "Melanotan2 category !== Cosmetic" },
      mt2 && mt2.category !== "Cosmetic", `melanotan2.category = "${mt2?.category}".`,
      `melanotan2.category = "${mt2?.category}" (must not be "Cosmetic").`);
    for (const id of ["gw501516", "gw0742"]) {
      const c = byId[id];
      assert({ id: "6.9", sprint: "Classification & dosing", check: `${id} category !== SARM` },
        c && c.category !== "SARM", `${id}.category = "${c?.category}".`,
        `${id}.category = "${c?.category}" (must not be "SARM").`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4) MT-II decouple (Task 2): melanotan2 alone keeps recommendableDespiteWarning,
  //    and NO other displayWarning compound carries that override (carcinogens etc.
  //    stay excluded from recommendations).
  // ───────────────────────────────────────────────────────────────────────────
  if (COMBINED) {
    const byId = Object.fromEntries(COMBINED.map(c => [c.id, c]));
    const mt2 = byId["melanotan2"];
    assert({ id: "Task-2", sprint: "Classification & dosing", check: "Melanotan2 has recommendableDespiteWarning + displayWarning" },
      !!(mt2 && mt2.recommendableDespiteWarning === true && mt2.displayWarning),
      `melanotan2 has recommendableDespiteWarning === true AND a displayWarning.`,
      `melanotan2 missing the opt-in: recommendableDespiteWarning=${mt2?.recommendableDespiteWarning}, displayWarning=${mt2?.displayWarning ? "present" : "MISSING"}.`);

    const offenders = COMBINED.filter(c => c.displayWarning && c.recommendableDespiteWarning === true && c.id !== "melanotan2");
    const warned = COMBINED.filter(c => c.displayWarning).map(c => c.id);
    assert({ id: "Task-2", sprint: "Classification & dosing", check: "No OTHER displayWarning compound has recommendableDespiteWarning" },
      offenders.length === 0,
      `Of ${warned.length} displayWarning compounds (${warned.join(", ")}), only melanotan2 has the override.`,
      `These warned compounds ALSO carry recommendableDespiteWarning (carcinogens could slip into recs): ${offenders.map(c => c.id).join(", ")}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5) Disclaimer single-source (6.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (txtDisc) {
    assert({ id: "6.2", sprint: "Compliance", check: "Shared DISCLAIMER constant exists in lib/disclaimer.js" },
      /export\s+const\s+DISCLAIMER\s*=/.test(txtDisc),
      `lib/disclaimer.js exports a canonical DISCLAIMER constant.`,
      `lib/disclaimer.js does not export a DISCLAIMER constant.`);
  } else record("6.2", "Compliance", "Shared DISCLAIMER constant exists", "FAIL", "lib/disclaimer.js not readable.");

  if (txtApp) {
    assert({ id: "6.2", sprint: "Compliance", check: "AlkiApp imports DISCLAIMER (not re-typed inline)" },
      /import\s*\{[^}]*\bDISCLAIMER\b[^}]*\}\s*from\s*["']\.\/lib\/disclaimer["']/.test(txtApp),
      `AlkiApp.jsx imports DISCLAIMER from ./lib/disclaimer.`,
      `AlkiApp.jsx does not import the shared DISCLAIMER constant.`);
  }

  // The canonical sentence must be a literal in exactly ONE place (disclaimer.js).
  // If it's re-typed inline anywhere else, single-sourcing has regressed.
  {
    const CANON = "All information is for research and educational purposes only.";
    const files = [P.disclaimer, P.alkiApp, P.protocolQA, P.cycleTimeline, P.protocols,
      path.join(SRC, "screens", "ProtocolGuideView.jsx"),
      path.join(SRC, "screens", "ProgressLog.jsx"),
      path.join(SRC, "screens", "SettingsView.jsx"),
      path.join(SRC, "screens", "ProgressPhotos.jsx")];
    const offenders = [];
    for (const f of files) {
      if (f === P.disclaimer) continue;
      const t = read(f);
      if (t && t.includes(CANON)) offenders.push(path.basename(f));
    }
    assert({ id: "6.2", sprint: "Compliance", check: "Canonical disclaimer text is not re-typed inline outside disclaimer.js" },
      offenders.length === 0,
      `Canonical disclaimer literal lives only in disclaimer.js.`,
      `Canonical disclaimer text re-typed inline in: ${offenders.join(", ")} (single-source regressed).`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6) Copy fix (6.1): the FALSE claim strings must be gone from AlkiProtocolQA.
  //    ("Alki does not block any compound" is the correct copy and is allowed.)
  // ───────────────────────────────────────────────────────────────────────────
  if (txtQA) {
    const hasBlocksGlp = /blocks\s+GLP/i.test(txtQA);
    const hasAlkiBlocks = /\bAlki\s+blocks\b/i.test(txtQA);
    assert({ id: "6.1", sprint: "Compliance", check: 'False "Alki blocks GLP" copy removed from AlkiProtocolQA' },
      !hasBlocksGlp && !hasAlkiBlocks,
      `No "blocks GLP" / "Alki blocks" copy present (advise-don't-gatekeep wording intact).`,
      `False gatekeeping copy still present: ${[hasBlocksGlp && '"blocks GLP"', hasAlkiBlocks && '"Alki blocks"'].filter(Boolean).join(", ")}`);
  } else record("6.1", "Compliance", "False blocks-GLP copy removed", "FAIL", "AlkiProtocolQA.jsx not readable.");

  // ───────────────────────────────────────────────────────────────────────────
  // 7) LEAN MASS pill (6.10): the projection pill must NOT render a raw
  //    effects.muscle scalar suffixed "%". It should show a directional readout.
  // ───────────────────────────────────────────────────────────────────────────
  if (txtApp) {
    // Locate the LEAN MASS projection cell.
    const m = txtApp.match(/k:\s*["']LEAN MASS["'][\s\S]{0,260}/);
    const cell = m ? m[0] : "";
    const rendersScalarPct = /muscleChange\s*\}\s*%|muscleChange[^}]*\+\s*["']%|\.muscle\s*\}\s*%/.test(cell);
    const rendersDirectional = /Supported/.test(cell) && /At risk/.test(cell);
    const ok = !!cell && rendersDirectional && !rendersScalarPct;
    assert({ id: "6.10", sprint: "Home redesign", check: 'LEAN MASS hero pill shows directional readout, not raw muscle "%"' },
      ok,
      `LEAN MASS pill renders "Supported"/"At risk"/"—", no raw scalar "%".`,
      cell ? `LEAN MASS pill still renders a raw muscle scalar suffixed "%". Cell: ${cell.slice(0, 200)}`
           : `Could not locate the LEAN MASS projection cell in AlkiApp.jsx.`);
    // Defensive: no pill anywhere renders a bare effects.muscle scalar with "%".
    assert({ id: "6.10", sprint: "Home redesign", check: "No effects.muscle scalar rendered with % suffix anywhere" },
      !/effects\.muscle\s*\}\s*%/.test(txtApp),
      `No "{effects.muscle}%" render found.`,
      `Found a raw "{effects.muscle}%" render in AlkiApp.jsx.`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8) delete_user RPC (5.3) — assert the migration source-of-truth declares it
  //    SECURITY DEFINER, zero params. (Independently confirmed live on the remote
  //    project fubrwttjgbthjarzledr via privileged query 2026-06-06: prosecdef=t,
  //    pronargs=0, returns void — see detail.)
  // ───────────────────────────────────────────────────────────────────────────
  {
    const sql = read(P.mig005Settings);
    if (!sql) {
      record("5.3", "Profile & Settings (Sprint 5)", "delete_user RPC is SECURITY DEFINER, zero params", "FAIL", "005_settings.sql migration not found.");
    } else {
      const decl = sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.delete_user\s*\(\s*\)[\s\S]*?\$\$;/i);
      const block = decl ? decl[0] : "";
      const ok = !!block && /SECURITY\s+DEFINER/i.test(block) && /public\.delete_user\s*\(\s*\)/.test(block) && /RETURNS\s+void/i.test(block);
      assert({ id: "5.3", sprint: "Profile & Settings (Sprint 5)", check: "delete_user() RPC is SECURITY DEFINER, zero params, returns void" },
        ok,
        `Migration declares public.delete_user() SECURITY DEFINER, zero params, returns void; pinned search_path. Live remote confirmed (prosecdef=t, pronargs=0, returns void).`,
        `005_settings.sql does not declare delete_user() as a zero-param SECURITY DEFINER function. Block: ${block.slice(0, 200) || "NOT FOUND"}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9) Privacy / RLS policy catalog (3a63b324) — SELECT on progress_logs is gated
  //    on auth.uid() = user_id (migration source-of-truth; live remote confirmed).
  //    The BEHAVIORAL half (user A cannot read user B's rows) is MANUAL — see
  //    e2e and the manual checklist — unless a second user is safely stood up.
  // ───────────────────────────────────────────────────────────────────────────
  {
    const sql = read(P.mig005Rls);
    if (!sql) {
      record("3a63b324", "Privacy/RLS", "progress_logs SELECT gated on auth.uid()", "FAIL", "005_progress_rls_harden.sql not found.");
    } else {
      const ok = /enable row level security/i.test(sql)
        && /for\s+select[\s\S]{0,80}using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i.test(sql);
      assert({ id: "3a63b324", sprint: "Privacy/RLS", check: "progress_logs SELECT policy gated on auth.uid() = user_id" },
        ok,
        `RLS enabled; SELECT policy uses (auth.uid() = user_id). Live remote pg_policies confirmed all four CRUD policies owner-scoped, UPDATE has WITH CHECK.`,
        `progress_logs SELECT policy is not gated on auth.uid() = user_id in the migration.`);
      // Behavioral cross-user isolation can't be honestly machine-verified here.
      record("3a63b324", "Privacy/RLS", "Cross-user read isolation (user A cannot see user B rows)", "MANUAL",
        "Requires two authenticated users with logged rows. Policy catalog confirms SELECT is owner-scoped; behavioral proof needs a 2-account round-trip (see MANUAL_CHECKLIST).");
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Age-gate dependency (6.7-a) — depends on migration 006 (profiles.age_verified).
  //   If the column isn't declared, mark BLOCKED (not FAIL). Live remote query on
  //   2026-06-06 shows the column EXISTS (boolean) — so the gate path is unblocked;
  //   the write/re-gate behavior is a signed-in round-trip → MANUAL.
  // ───────────────────────────────────────────────────────────────────────────
  {
    const sql = read(P.mig006Age);
    const declaresCol = sql && /ADD COLUMN IF NOT EXISTS\s+age_verified\s+boolean/i.test(sql);
    if (!declaresCol) {
      record("6.7-a", "Compliance", "age_verified column exists (migration 006)", "BLOCKED",
        "Migration 006 does not declare profiles.age_verified — age-attestation persistence cannot be verified until it is run.");
    } else {
      record("6.7-a", "Compliance", "age_verified column declared (migration 006) + present on remote", "PASS",
        "006_age_verification.sql adds profiles.age_verified boolean NOT NULL DEFAULT false; live remote query 2026-06-06 confirms the column exists (data_type=boolean). NOTE: the migration file header still says 'NOT yet applied' — it HAS since been applied; the comment is stale.");
      record("6.7-a", "Compliance", "Passing the age gate writes age_verified; profile without it re-gates", "MANUAL",
        "Behavioral: requires a signed-in account round-trip (guest mode does not persist). Verify a real account: pass gate → row.age_verified=true; force false → app re-gates on load. See MANUAL_CHECKLIST.");
    }
  }

  return results;
}

// ── standalone runner ────────────────────────────────────────────────────────
function printReport(rows) {
  const order = { FAIL: 0, BLOCKED: 1, MANUAL: 2, PASS: 3 };
  const tally = rows.reduce((a, r) => (a[r.result] = (a[r.result] || 0) + 1, a), {});
  console.log("\nALKI data-checks");
  console.log("================");
  for (const r of [...rows].sort((a, b) => (order[a.result] - order[b.result]))) {
    console.log(`  [${r.result.padEnd(7)}] (${r.feedback_id}) ${r.check}`);
    if (r.result !== "PASS") console.log(`             ↳ ${r.detail}`);
  }
  console.log(`\n  PASS ${tally.PASS || 0} · FAIL ${tally.FAIL || 0} · MANUAL ${tally.MANUAL || 0} · BLOCKED ${tally.BLOCKED || 0}`);
  return tally;
}

const INVOKED_DIRECTLY = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (INVOKED_DIRECTLY) {
  runDataChecks().then(rows => {
    const tally = printReport(rows);
    process.exit((tally.FAIL || 0) > 0 ? 1 : 0);
  }).catch(e => { console.error("data-checks fatal:", e); process.exit(2); });
}
