// Server-only Stripe client + price/tier helpers.
//
// `server-only` makes this module a hard build error if it is ever imported
// into a client component, so the secret key can never leak into a browser
// bundle. This file lives under api/_lib (a Next.js private folder, never
// routed) — deliberately NOT in src/app/lib, which is the portability-firewall
// zone for pure, renderer-free logic. Stripe-secret code is neither portable
// nor pure, so it stays on the server side of the line.
import "server-only";
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  // Surfaced at first import on the server (route handler), never in the client.
  throw new Error("STRIPE_SECRET_KEY is not set — Stripe routes cannot run.");
}

// No apiVersion pin: use the version baked into the installed SDK so the
// shapes the SDK expects and the API returns always agree.
export const stripe = new Stripe(secret);

// Price IDs come from env (set per-environment in Vercel). Sandbox values live
// in .env.local. Never hardcode a price id — they differ between sandbox/live.
export const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY || null;
export const PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL || null;
// One-time $10 add-on: a permanent extra eidolon slot. Bought in PAYMENT mode
// (not a subscription), so it has its own price id and never flows through the
// tier helpers above.
export const PRICE_SLOT = process.env.STRIPE_PRICE_SLOT || null;

// tier ('monthly' | 'annual') → the configured Stripe price id, or null if the
// tier is unknown or its env var is missing.
export function priceIdForTier(tier) {
  if (tier === "monthly") return PRICE_MONTHLY;
  if (tier === "annual") return PRICE_ANNUAL;
  return null;
}

// A Stripe price id → our tier label. Matches the two configured prices first,
// then falls back to the recurring interval so a re-created price (different
// id, same interval) still resolves. Returns null when it can't be classified.
export function tierForPrice(price) {
  const id = typeof price === "string" ? price : price?.id;
  if (id && id === PRICE_MONTHLY) return "monthly";
  if (id && id === PRICE_ANNUAL) return "annual";
  const interval = typeof price === "object" ? price?.recurring?.interval : null;
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return null;
}

// Map a Stripe subscription's status to our profiles.subscription_status enum.
// Stripe statuses: active, trialing, past_due, canceled, unpaid, incomplete,
// incomplete_expired, paused. We collapse them into the four the app uses.
export function statusFromStripe(stripeStatus) {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      // incomplete / paused / anything new — treat as not-yet-entitled.
      return "free";
  }
}
