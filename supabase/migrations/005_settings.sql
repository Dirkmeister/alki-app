-- ═══════════════════════════════════════════════════════════
-- ALKI — Sprint 5: Profile & Settings
-- Run this in your Supabase SQL Editor (already applied to the live
-- project fubrwttjgbthjarzledr via MCP on 2026-06-05).
-- ═══════════════════════════════════════════════════════════

-- 5.1 — explicit training-status attribute on the profile (Sedentary …
-- Athlete). Nullable; the recommendation engine does not consume it yet, it is
-- a stored profile attribute surfaced/edited on the Settings page.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_status text;

-- 5.4 — scaffolded display-preferences bag (unit system today, room for more).
-- Mirrors localStorage for instant/offline + no-account use; this column is the
-- cross-device sync layer for signed-in users.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb default '{}'::jsonb;

-- 5.3 — self-service account deletion (GDPR / CCPA + App Store compliance).
-- Deleting the auth.users row CASCADEs to public.profiles (FK profiles_id_fkey)
-- and public.progress_logs (FK progress_logs_user_id_fkey), both ON DELETE
-- CASCADE, so this single delete removes every row the user owns. Eidolons live
-- in profiles.eidolons (jsonb), so they go with the profile row.
--
-- SECURITY DEFINER lets an authenticated user delete ONLY their own auth record
-- (scoped to auth.uid()) without exposing the service-role key to the client.
-- search_path is pinned empty and every object is schema-qualified to prevent
-- search-path hijacking of a definer function.
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Only a logged-in user may call it; never anon/public.
REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
