-- ═══════════════════════════════════════════════════════════
-- ALKI — 008 — Promo codes (single-use → time-boxed Pro)
-- Run this in your Supabase SQL Editor (SQL → New query).
-- SANDBOX / single project — this is a FILE only; it is not auto-applied.
--
-- Reuses the 007 "burn" pattern: a money-grade entitlement is written ONLY by
-- a privileged server path (here a SECURITY DEFINER RPC instead of the webhook),
-- the backing table is RLS-locked with NO client policies, and the single-use
-- guarantee is an ATOMIC claim (UPDATE ... WHERE used_by IS NULL). No Stripe
-- coupons; redemption flips the SAME entitlement state the app already gates on.
-- ═══════════════════════════════════════════════════════════

-- ── Expiry column for time-boxed Pro ───────────────────────
-- The existing gate (isProUser) was binary; a promo grants Pro for a fixed
-- window, so we need an expiry. NULL = no time-boxed grant. isProUser is now
-- true while now() < pro_until (see lib/subscription.js). Like the other
-- entitlement columns this is MONEY and is locked against client writes by the
-- guard trigger (extended below) — only redeem_promo_code() / an admin set it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_until timestamptz;

COMMENT ON COLUMN public.profiles.pro_until IS
  'Time-boxed Pro expiry from promo-code redemption. isPro is true while now() < pro_until. Written ONLY by redeem_promo_code() (SECURITY DEFINER) or an admin. Never client-writable (guard trigger).';

-- ── promo_codes table ──────────────────────────────────────
-- One row per code. used_by / used_at NULL ⇒ unredeemed. pro_days is how many
-- days of Pro the code grants (default 30 ≈ 1 month).
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code       text PRIMARY KEY,                                   -- e.g. ALKI-7Q4M-2KX9 (stored uppercase)
  pro_days   integer NOT NULL DEFAULT 30,
  used_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- who burned it (NULL = unused)
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lock the table exactly like processed_stripe_sessions (007): RLS ON, NO
-- policies → the client roles (authenticated / anon) can neither read the code
-- list nor flip used_by. Every redemption goes through the RPC below; the
-- service role (admin tooling) bypasses RLS and keeps full access.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.promo_codes TO service_role;

-- ── Extend the 007 entitlement guard to cover pro_until ────
-- Same trigger/function as 007; CREATE OR REPLACE adds pro_until to the locked
-- set so a client can't self-extend Pro by writing it through the profile
-- upsert. (saveProfile never sends pro_until, so normal saves stay a no-op.)
CREATE OR REPLACE FUNCTION public.guard_subscription_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_status      IS DISTINCT FROM OLD.subscription_status
     OR NEW.stripe_customer_id    IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.subscription_tier     IS DISTINCT FROM OLD.subscription_tier
     OR NEW.comped                IS DISTINCT FROM OLD.comped
     OR NEW.eidolon_slots_purchased IS DISTINCT FROM OLD.eidolon_slots_purchased
     OR NEW.pro_until             IS DISTINCT FROM OLD.pro_until THEN
    RAISE EXCEPTION
      'subscription/entitlement columns are not client-writable (subscription_status, stripe_customer_id, subscription_tier, comped, eidolon_slots_purchased, pro_until)';
  END IF;

  RETURN NEW;
END;
$$;

-- ── Atomic redemption RPC ──────────────────────────────────
-- Called by the signed-in client (authenticated). SECURITY DEFINER so it can
-- write the RLS-locked promo_codes row and the guarded profiles columns; it
-- only ever acts on auth.uid() (the caller), so a user can never redeem for
-- someone else. Single-use is the atomic claim: the UPDATE matches only while
-- used_by IS NULL, and the row lock serializes concurrent attempts — exactly
-- one wins, the rest match 0 rows and are reported as already used.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_days  integer;
  v_until timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauth');
  END IF;

  -- Atomic single-use claim.
  UPDATE public.promo_codes
     SET used_by = v_uid, used_at = now()
   WHERE upper(code) = upper(btrim(p_code))
     AND used_by IS NULL
  RETURNING pro_days INTO v_days;

  IF v_days IS NULL THEN
    -- Disambiguate "already used" from "no such code" for a clearer message.
    IF EXISTS (SELECT 1 FROM public.promo_codes WHERE upper(code) = upper(btrim(p_code))) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'used');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  -- Grant time-boxed Pro. Extend from the later of now() or any existing grant
  -- so stacking codes adds time. subscription_tier='comp' is informational (the
  -- gate is pro_until); subscription_status is intentionally left untouched so a
  -- real Stripe subscription, if any, still owns that field.
  v_until := GREATEST(now(), COALESCE((SELECT pro_until FROM public.profiles WHERE id = v_uid), now()))
             + make_interval(days => v_days);

  UPDATE public.profiles
     SET pro_until = v_until,
         subscription_tier = COALESCE(subscription_tier, 'comp')
   WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'reason', 'granted', 'pro_until', v_until, 'days', v_days);
END;
$$;

-- Only signed-in users may redeem. Revoke the PostgREST-default PUBLIC grant,
-- then allow authenticated. (anon has no auth.uid() and would get 'unauth'.)
REVOKE ALL ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;
