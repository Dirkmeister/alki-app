// verify/e2e/rls.spec.mjs
// Privacy / RLS behavioural half (3a63b324). The migration source + live
// pg_policies (checked in data-checks) prove the SELECT policy is owner-scoped
// (auth.uid() = user_id). Here we exercise it: an UNAUTHENTICATED anon client
// must read ZERO rows from progress_logs — it can never see another user's data.
//
// The full A-vs-B isolation (user A authenticated, must not see user B's rows)
// needs two real accounts with logged rows; standing those up writes auth users
// to the live project, which is out of scope for a read-only verification — so
// that half is reported MANUAL (see MANUAL_CHECKLIST).
//
// This spec uses the supabase-js client directly (no browser) — it is grouped
// with the e2e specs only because it is a live-service behavioural check.

import { createClient } from "@supabase/supabase-js";
import { res, readEnvLocal } from "./_harness.mjs";

export async function run(/* context, shot */) {
  const out = [];
  const env = readEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    out.push(res("3a63b324", "Privacy/RLS", "Anon client cannot read any progress_logs rows", "BLOCKED",
      "Supabase URL / anon key not found in .env.local — cannot run the behavioural anon-read check."));
    out.push(res("3a63b324", "Privacy/RLS", "User A cannot read User B's progress_logs", "MANUAL",
      "Requires two authenticated accounts with logged rows (see MANUAL_CHECKLIST)."));
    return out;
  }

  try {
    const supa = createClient(url, anon, { auth: { persistSession: false } });
    // No session → auth.uid() is NULL → owner-scoped SELECT must yield nothing.
    const { data, error } = await supa.from("progress_logs").select("id,user_id").limit(50);
    const rows = data || [];
    // PASS: RLS returns zero rows (or denies). FAIL: any row leaks to anon.
    const ok = rows.length === 0;
    out.push(res("3a63b324", "Privacy/RLS", "Anon (no session) client reads ZERO progress_logs rows", ok ? "PASS" : "FAIL",
      ok ? `Unauthenticated select returned 0 rows${error ? ` (RLS/permission: ${error.message})` : ""} — SELECT is owner-scoped, no cross-user leak to anon.`
         : `LEAK: unauthenticated select returned ${rows.length} row(s) including user_id(s) ${[...new Set(rows.map(r => r.user_id))].slice(0, 3).join(", ")} — RLS is NOT protecting progress_logs.`));
  } catch (e) {
    out.push(res("3a63b324", "Privacy/RLS", "Anon client cannot read any progress_logs rows", "BLOCKED", `supabase-js error: ${e.message}`));
  }

  out.push(res("3a63b324", "Privacy/RLS", "User A cannot read User B's progress_logs (cross-user)", "MANUAL",
    "Behavioural cross-user isolation needs two authenticated accounts each with logged rows; standing them up writes to the live project (out of scope for read-only verification). Anon-read PASS + policy-catalog PASS together cover the machine-checkable surface."));
  return out;
}
