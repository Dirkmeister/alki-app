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

-- ── Eidolon slot purchases (one-time add-ons) ──────────────
-- A Pro user can buy extra PERMANENT eidolon slots ($10 one-time each). This
-- counter is the number purchased; maxEidolons is COMPUTED client-side as
-- (isPro ? 2 : 1) + eidolon_slots_purchased — it is NEVER stored. Like the
-- subscription columns above, this is MONEY: a user who could increment it
-- would mint themselves free slots, so it is written ONLY by the Stripe webhook
-- (service role) and locked against client writes by the guard trigger below.
-- It PERSISTS regardless of subscription_status — a purchased slot is permanent.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS eidolon_slots_purchased integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.eidolon_slots_purchased IS
  'Count of one-time purchased permanent eidolon slots. Written ONLY by the Stripe webhook (service role) via grant_eidolon_slot(). Never client-writable (guard trigger). Survives subscription lapse.';

-- ── Webhook idempotency ledger ─────────────────────────────
-- Stripe retries webhook deliveries, and the slot path is an INCREMENT, so a
-- naive retry would mint free slots. Subscription writes are naturally
-- idempotent (they SET an absolute status) and need no ledger; increments do.
-- A dedicated table (session id as PRIMARY KEY) is chosen over a jsonb array on
-- profiles because the PK gives us an ATOMIC claim: under concurrent retries,
-- exactly one INSERT wins and the rest hit the unique constraint — no
-- read-modify-write race that a jsonb array would suffer. The claim + the
-- increment happen together inside grant_eidolon_slot() (one transaction) so
-- they can never half-apply.
CREATE TABLE IF NOT EXISTS public.processed_stripe_sessions (
  session_id   text PRIMARY KEY,        -- Stripe Checkout Session id (cs_...)
  purpose      text,                    -- e.g. 'eidolon_slot'
  user_id      uuid,                    -- our profiles.id this applied to
  quantity     integer,                 -- slots granted by this session
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Lock the ledger down: enable RLS and add NO policies. The client roles
-- (authenticated / anon) therefore have zero access — they can neither read the
-- ledger nor forge a row to fake "already processed". The service role (webhook)
-- bypasses RLS entirely, so it needs no policy.
ALTER TABLE public.processed_stripe_sessions ENABLE ROW LEVEL SECURITY;

-- ── Atomic slot grant ──────────────────────────────────────
-- Called ONLY by the webhook (service role) as an RPC. In a single transaction
-- it (1) claims the checkout session via an INSERT ... ON CONFLICT DO NOTHING
-- and (2) increments eidolon_slots_purchased ONLY if the claim was new. Returns
-- true when it applied the grant, false when the session was already processed.
-- Because the claim and the increment share one transaction, a retry can never
-- double-apply (the second caller's INSERT affects 0 rows → no increment) and
-- can never half-apply (if the UPDATE fails, the claim rolls back too, so a
-- later retry re-runs cleanly). Runs as service_role → SECURITY INVOKER is fine
-- (it bypasses RLS and passes the guard trigger, which only restricts the client
-- roles). NOT exposed to clients: there is no client path that can call it,
-- because authenticated/anon callers would be blocked by the guard trigger on
-- the UPDATE anyway.
CREATE OR REPLACE FUNCTION public.grant_eidolon_slot(
  p_session_id text,
  p_user_id    uuid,
  p_quantity   integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  IF p_user_id IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION 'grant_eidolon_slot requires a session id and a user id';
  END IF;

  -- Claim the session. ON CONFLICT DO NOTHING makes this the atomic gate:
  -- only the first delivery inserts a row; concurrent/later retries insert 0.
  INSERT INTO public.processed_stripe_sessions (session_id, purpose, user_id, quantity)
  VALUES (p_session_id, 'eidolon_slot', p_user_id, GREATEST(COALESCE(p_quantity, 1), 1))
  ON CONFLICT (session_id) DO NOTHING;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;  -- 1 = freshly claimed, 0 = already seen

  IF v_claimed THEN
    UPDATE public.profiles
      SET eidolon_slots_purchased = eidolon_slots_purchased + GREATEST(COALESCE(p_quantity, 1), 1)
      WHERE id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Lock the function down to the service role. PostgREST would otherwise expose
-- it as an RPC executable by PUBLIC (anon/authenticated). Even if a client
-- called it, the guard trigger on the UPDATE and RLS on the ledger would both
-- reject the attempt (the function is SECURITY INVOKER, so it runs as the
-- calling role) — but we revoke EXECUTE anyway so the self-grant path doesn't
-- even exist. Only the webhook (service role) may call it.
REVOKE ALL ON FUNCTION public.grant_eidolon_slot(text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_eidolon_slot(text, uuid, integer) TO service_role;

-- The webhook (service role) needs to write the ledger. service_role bypasses
-- RLS, but still needs the table privilege; grant it explicitly and leave the
-- client roles with nothing (RLS already denies them, and no grant is cleaner).
GRANT ALL ON TABLE public.processed_stripe_sessions TO service_role;

-- ── Read access ────────────────────────────────────────────
-- The existing "Users can read own profile" policy from 001_setup.sql is
-- `for select using (auth.uid() = id)` over the whole row, so these new
-- columns are ALREADY readable by their owner. No new SELECT policy needed —
-- the client reads subscription_status / comped to derive isPro, and reads
-- eidolon_slots_purchased to compute maxEidolons.

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

  -- eidolon_slots_purchased is guarded for the SAME reason as the subscription
  -- columns: it is money. A user must not be able to grant themselves slots any
  -- more than they can flip their own subscription_status. Only the service role
  -- (via grant_eidolon_slot in the webhook) may change it.
  IF NEW.subscription_status      IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id    IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.subscription_tier     IS DISTINCT FROM OLD.subscription_tier
     OR NEW.comped                IS DISTINCT FROM OLD.comped
     OR NEW.eidolon_slots_purchased IS DISTINCT FROM OLD.eidolon_slots_purchased THEN
    RAISE EXCEPTION
      'subscription/entitlement columns are not client-writable (subscription_status, stripe_customer_id, subscription_tier, comped, eidolon_slots_purchased)';
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
-- that upsert never sends these guarded columns, so on a normal profile UPDATE
-- the NEW values equal OLD for all of them and the trigger is a no-op. On INSERT
-- (first profile row) the trigger does not fire (BEFORE UPDATE only), so the
-- column defaults ('free' / false / NULL / 0) apply. The client flow is
-- unaffected.
