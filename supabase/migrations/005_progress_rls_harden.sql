-- ═══════════════════════════════════════════════════════════
-- ALKI — Progress Logs RLS hardening (privacy fix #3a63b324)
-- Defense in depth for "research log includes logged days from
-- different users." The read scoping (auth.uid() = user_id) was already
-- correct and enforced; this migration re-asserts it idempotently so the
-- policy lives in source control, and closes one gap: UPDATE had no
-- WITH CHECK, so a user could reassign their own row's user_id to another
-- account. Every command is now scoped to the authenticated owner.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════

alter table public.progress_logs enable row level security;

drop policy if exists "Users can read own logs"   on public.progress_logs;
drop policy if exists "Users can insert own logs" on public.progress_logs;
drop policy if exists "Users can update own logs" on public.progress_logs;
drop policy if exists "Users can delete own logs" on public.progress_logs;

create policy "Users can read own logs"
  on public.progress_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.progress_logs for insert
  with check (auth.uid() = user_id);

-- USING gates which rows can be updated; WITH CHECK gates what they may
-- become — together they stop a user handing a row to another user_id.
create policy "Users can update own logs"
  on public.progress_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.progress_logs for delete
  using (auth.uid() = user_id);
