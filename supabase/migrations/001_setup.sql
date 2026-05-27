-- ═══════════════════════════════════════════════════════════
-- ALKI — Supabase Database Setup
-- Run this in your Supabase SQL Editor (SQL → New query)
-- ═══════════════════════════════════════════════════════════

-- Profiles table — stores biometric data, goals, selected compounds
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  sex text,
  age integer,
  height_ft integer,
  height_in integer,
  weight real,
  body_fat real,
  goals jsonb default '[]'::jsonb,
  adv jsonb default '{}'::jsonb,
  selected_compounds jsonb default '[]'::jsonb,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Row Level Security — users can only access their own profile
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
