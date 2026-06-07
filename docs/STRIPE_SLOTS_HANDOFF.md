# Eidolon Slot add-on — handoff (Sprint 7, slots)

One-time $10 purchase that grants a Pro user one PERMANENT extra Eidolon slot.
Built on top of the existing subscription spine (do not redo that). This doc
covers the new Stripe object, the deploy checklist, and a sandbox test script.

## Stripe sandbox objects (account: Alki sandbox, test mode)

- Product: **Eidolon Slot** — `prod_UemhwCRyifo7uM`
- Price: **$10.00 USD, one-time** (`type: one_time`, not recurring) —
  `price_1TfT8bD3vSAI0ZSEvs0Q9xfH`

This is the value for `STRIPE_PRICE_SLOT`.

> NOTE: I could not write `.env.local` — the harness blocks edits to that file.
> Add this line yourself:
>
> ```
> STRIPE_PRICE_SLOT=price_1TfT8bD3vSAI0ZSEvs0Q9xfH
> ```

## Deploy checklist

1. **Local env** — add `STRIPE_PRICE_SLOT=price_1TfT8bD3vSAI0ZSEvs0Q9xfH` to
   `.env.local` (see note above).
2. **Vercel env** — mirror `STRIPE_PRICE_SLOT` to the Vercel project
   (Settings → Environment Variables) for every environment that runs Stripe
   (Production + Preview). Use the SANDBOX price id while testing; swap to the
   LIVE price id when you create the live product. This is the one NEW env var
   this feature adds — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `SUPABASE_SERVICE_ROLE_KEY`
   are already set.
3. **Apply the migration** — run `supabase/migrations/007_subscriptions.sql` in
   the Supabase SQL editor. It is now AMENDED (not yet applied) and adds:
   `profiles.eidolon_slots_purchased`, the `processed_stripe_sessions`
   idempotency ledger, the `grant_eidolon_slot()` atomic RPC, and the extended
   guard trigger (now also locks `eidolon_slots_purchased` against client
   writes). Slot purchases will 500 (and Stripe will retry) until this is
   applied, because the webhook calls `grant_eidolon_slot`.
4. **Webhook** — no new events to subscribe to. The slot grant rides on the
   `checkout.session.completed` event the webhook already receives; the handler
   branches on `mode === 'payment'` + `metadata.purpose === 'eidolon_slot'`.
   Keep `STRIPE_WEBHOOK_SECRET` current for the endpoint.
5. **Live mode** — when going live, recreate the product + one-time price in
   live mode and set the live `STRIPE_PRICE_SLOT` in Vercel. Everything else is
   already live-ready.

## Sandbox test script

Prereqs: `stripe login` (sandbox), dev server running, the migration applied to
your Supabase project, and a test user whose profile has
`subscription_status = 'active'` (or `comped = true`).

```bash
# 1. Forward webhooks to your local handler and copy the printed whsec_... into
#    STRIPE_WEBHOOK_SECRET (.env.local), then restart the dev server.
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 2. Gate check — a FREE/past_due/canceled user must be rejected (403).
#    From the app, while signed in as a non-Pro user, tap "+ New Eidolon" at the
#    cap; you should get the Pro UPGRADE modal, never the slot prompt. Direct
#    call (replace <JWT> with a non-Pro user's access token):
curl -i -X POST localhost:3000/api/stripe/buy-slot \
  -H "Authorization: Bearer <JWT>"
#    Expect: HTTP/1.1 403  {"error":"An active Alki Pro subscription is required..."}

# 3. Happy path — as a Pro user, tap "+ New Eidolon" at the cap → "Add a
#    permanent slot — $10" → Checkout. Pay with 4242 4242 4242 4242, any future
#    expiry/CVC. On return (?slot=success) the dashboard re-reads the profile and
#    the new slot appears (cap goes up by 1).

# 4. IDEMPOTENCY — the critical test. Capture a real slot Checkout Session id
#    (cs_...) from the dashboard or `stripe events list`, then deliver the same
#    completed event TWICE and confirm the counter increments only ONCE.
#    Easiest: in `stripe listen`, note the event is delivered once on real
#    payment; then resend that exact event:
stripe events resend evt_XXXXXXXX   # the checkout.session.completed for the slot
#    Verify in Supabase:
#      select eidolon_slots_purchased from profiles where id = '<user-uuid>';
#      -> increased by exactly 1, NOT 2
#      select * from processed_stripe_sessions where session_id = 'cs_...';
#      -> exactly one row
#    The webhook logs "slot session already processed, skipped" on the resend.

# 5. Self-grant guard — confirm a client cannot mint slots directly. As an
#    authenticated (non-service) user, attempt the RPC; it must be rejected
#    (REVOKEd from authenticated; the guard trigger + ledger RLS also block it):
#      supabase.rpc('grant_eidolon_slot', { p_session_id:'x', p_user_id:'<self>', p_quantity: 99 })
#      -> permission denied / not exposed. profiles.eidolon_slots_purchased unchanged.

# 6. Downgrade safety — set the test user's subscription_status back to 'canceled'
#    in Supabase. Reload: eidolon_slots_purchased is UNCHANGED (slots persist),
#    base allowance drops, and any Eidolons over the new cap show as 🔒 LOCKED in
#    the switcher (visible, not deleted). Tapping a locked one makes it active.
```

## What changed (code)

- `src/app/api/stripe/buy-slot/route.js` — NEW. PAYMENT-mode Checkout, server-side
  active-Pro gate, identity from the verified bearer token only.
- `src/app/api/stripe/webhook/route.js` — slot branch added to
  `checkout.session.completed`; subscription path unchanged; raw-body + signature
  handling untouched; increment via the idempotent `grant_eidolon_slot` RPC.
- `src/app/api/_lib/stripe.js` — `PRICE_SLOT` export.
- `supabase/migrations/007_subscriptions.sql` — amended (see checklist step 3).
- `src/app/lib/subscription.js` — `maxEidolons()` + `lockedEidolonIds()` (pure);
  new `projection` / `extra_eidolon` / `eidolon_customization` feature keys;
  `browse_all` removed (library un-gated).
- `src/app/AlkiApp.jsx` — `eidolonSlotsPurchased` threaded onto the profile;
  `startBuySlot`; `?slot=success` return handling; creation gated at the cap;
  `promoteEidolon`; projection surface Pro-gated (the #1 fix); rename gated;
  naming gate is Pro-only; library un-gated.
- `src/app/components/SlotPurchasePrompt.jsx` — NEW (Pro-at-cap $10 prompt).
- `src/app/components/EidolonSwitcherModal.jsx` — locked-Eidolon display + promote.
- `src/app/screens/SettingsView.jsx` — rename gated for free; Pro-perks copy fixed.
