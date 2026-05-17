-- ═══════════════════════════════════════════════════════════
-- ALKI — Add active_protocol column
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.profiles
ADD COLUMN active_protocol jsonb default null;

-- active_protocol stores: { "compounds": ["bpc157", "tb500"], "lockedAt": "2026-05-17T..." }
-- null = no locked protocol (user is in builder/exploration mode)
