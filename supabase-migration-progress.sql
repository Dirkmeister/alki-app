-- ═══════════════════════════════════════════════════════════
-- ALKI — Progress Logs Table
-- Run this in your Supabase SQL Editor (SQL → New query)
-- ═══════════════════════════════════════════════════════════

create table public.progress_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  logged_at timestamp with time zone default now(),
  weight real,
  body_fat real,
  wellbeing integer check (wellbeing between 1 and 10),
  energy integer check (energy between 1 and 10),
  sleep_quality integer check (sleep_quality between 1 and 10),
  notes text,
  created_at timestamp with time zone default now()
);

-- Index for fast lookups by user, sorted by date
create index idx_progress_logs_user on public.progress_logs (user_id, logged_at desc);

-- Row Level Security
alter table public.progress_logs enable row level security;

create policy "Users can read own logs"
  on public.progress_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.progress_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.progress_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.progress_logs for delete
  using (auth.uid() = user_id);
