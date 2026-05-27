-- ═══════════════════════════════════════════════════════════
-- ALKI — Multi-Eidolon Support
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Each eidolon: { id, name, goals, compounds, lockedAt }
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eidolons jsonb default '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_eidolon_id text default null;
