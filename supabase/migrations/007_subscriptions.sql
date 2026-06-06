-- ═══════════════════════════════════════════════════════════
-- ALKI — Sprint 7 — Subscription columns + client-write guard
-- Run this in your Supabase SQL Editor (SQL → New query).
-- SANDBOX / single project — this is a FILE only; it is not auto-applied.
-- ═══════════════════════════════════════════════════════════

-- ── Columns ────────────────────────────────────────────────
-- All four live on profiles so the loaded profile carries subscription state
-- in one round-trip (no extra table/join). subscription_status is the source
-- of truth for access; comped is a manual override so the founder can grant
-- Pro to testers without payment.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id  text,
  ADD COLUMN IF NOT EXISTS subscription_tier   text,
  ADD COLUMN IF NOT EXISTS comped              boolean NOT NULL DEFAULT false;

-- Allowed values (documented, not hard-enforced as enums so Stripe can add
-- statuses later without a migration blocking the webhook):
--   subscription_status : 'free' | 'active' | 'past_due' | 'canceled'
--   subscription_tier   : 'monthly' | 'annual' | NULL  (NULL while free)
COMMENT ON COLUMN public.profiles.subscription_status IS
  'free | active | past_due | canceled. Written ONLY by the Stripe webhook (service role) or manually by an admin. Never client-writable (see guard trigger below).';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'Stripe customer id (cus_...). Set by the webhook on first checkout. Used by the portal + sync routes.';
COMMENT ON COLUMN public.profiles.subscription_tier IS
  'monthly | annual | NULL. Mirrors the purchased price interval. Written only by the webhook / admin.';
COMMENT ON COLUMN public.profiles.comped IS
  'Manual Pro override (founder/tester grants). Treated as Pro regardless of subscription_status. Admin-only write.';

-- ── Read access ────────────────────────────────────────────
-- The existing "Users can read own profile" policy from 001_setup.sql is
-- `for select using (auth.uid() = id)` over the whole row, so these new
-- columns are ALREADY readable by their owner. No new SELECT policy needed —
-- the client reads subscription_status / comped to derive isPro.

-- ── Why there is NO client UPDATE policy for these columns ─────────────────
-- Access is money: a user who could flip their own subscription_status to
-- 'active' (or comped to true) would unlock Pro for free. So these columns
-- must be writable ONLY by:
--   1. the Stripe webhook, using the service-role key — service role BYPASSES
--      RLS entirely, so it needs no policy; and
--   2. the founder, editing manually in the dashboard (also bypasses RLS).
--
-- The catch: Postgres RLS policies are ROW-level, not column-level. The
-- existing "Users can update own profile" policy (001_setup.sql) already lets
-- an authenticated user UPDATE their own row, and RLS gives us no way to carve
-- specific columns out of that policy. So "just don't add a policy" does NOT
-- close the hole — the blanket policy already covers every column on the row,
-- including these. The actual enforcement therefore lives in a BEFORE UPDATE
-- trigger that rejects any change to these columns coming from the client
-- roles (authenticated / anon). Privileged roles (service_role, postgres,
-- the dashboard) pass straight through.

CREATE OR REPLACE FUNCTION public.guard_subscription_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only the PostgREST client roles are restricted. The webhook (service_role)
  -- and manual dashboard edits (postgres / supabase_admin) must pass untouched.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.subscription_tier  IS DISTINCT FROM OLD.subscription_tier
     OR NEW.comped             IS DISTINCT FROM OLD.comped THEN
    RAISE EXCEPTION
      'subscription columns are not client-writable (subscription_status, stripe_customer_id, subscription_tier, comped)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_subscription_columns ON public.profiles;
CREATE TRIGGER guard_subscription_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_subscription_columns();

-- Note on the existing client auto-save (saveProfile upsert in AlkiApp.jsx):
-- that upsert never sends these four columns, so on a normal profile UPDATE the
-- NEW values equal OLD for all four and the trigger is a no-op. On INSERT (first
-- profile row) the trigger does not fire (BEFORE UPDATE only), so the column
-- defaults ('free' / false / NULL) apply. The client flow is unaffected.
