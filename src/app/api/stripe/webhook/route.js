// POST /api/stripe/webhook
// Stripe's server-to-server notifications. This is the ONLY path that writes
// the subscription columns on profiles, using the service-role client (which
// bypasses the migration-007 guard trigger). Every request is authenticated by
// verifying Stripe's signature against STRIPE_WEBHOOK_SECRET — an unsigned or
// mis-signed request is rejected before any work happens.
import { NextResponse } from "next/server";
import {
  stripe,
  tierForPrice,
  statusFromStripe,
} from "../../_lib/stripe";
import { supabaseAdmin } from "../../_lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Write subscription fields onto a profile keyed by our Supabase user id.
async function updateProfileById(userId, fields) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(fields)
    .eq("id", userId);
  if (error) throw new Error(`profiles update (id=${userId}): ${error.message}`);
}

// Fallback path: resolve the profile by the Stripe customer id we stored on the
// first checkout, when an event doesn't carry our user_id metadata.
async function updateProfileByCustomer(customerId, fields) {
  if (!customerId) return false;
  const { data, error: selErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (selErr) throw new Error(`profiles lookup (cus=${customerId}): ${selErr.message}`);
  if (!data?.id) return false;
  await updateProfileById(data.id, fields);
  return true;
}

// Resolve our user id from a subscription: prefer the metadata we set at
// checkout, otherwise fall back to the stored customer id.
async function applyToSubscriptionOwner(subscription, fields) {
  const userId = subscription?.metadata?.user_id || null;
  const merged = { ...fields, stripe_customer_id: subscription?.customer || null };
  if (userId) {
    await updateProfileById(userId, merged);
    return;
  }
  const ok = await updateProfileByCustomer(subscription?.customer, fields);
  if (!ok) {
    console.warn(
      "[stripe/webhook] could not map subscription to a profile",
      subscription?.id
    );
  }
}

export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured → we cannot trust anything. Refuse rather than
    // process an unverifiable payload.
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text(); // raw body required for signature verification

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err?.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;
        // Pull the subscription to read its price (→ tier) and live status.
        let tier = null;
        let status = "active";
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          tier = tierForPrice(sub.items?.data?.[0]?.price);
          status = statusFromStripe(sub.status);
        }
        const fields = {
          subscription_status: status,
          subscription_tier: tier,
          stripe_customer_id: session.customer || null,
        };
        if (userId) {
          await updateProfileById(userId, fields);
        } else {
          await updateProfileByCustomer(session.customer, fields);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        await applyToSubscriptionOwner(sub, {
          subscription_status: statusFromStripe(sub.status),
          subscription_tier: tierForPrice(sub.items?.data?.[0]?.price),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        // Subscription ended — drop to canceled and clear the tier. Keep the
        // customer id so the user can re-subscribe / open the portal.
        await applyToSubscriptionOwner(sub, {
          subscription_status: "canceled",
          subscription_tier: null,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        // No subscription metadata on invoices — resolve by stored customer id.
        const ok = await updateProfileByCustomer(invoice.customer, {
          subscription_status: "past_due",
        });
        if (!ok) {
          console.warn(
            "[stripe/webhook] payment_failed for unknown customer",
            invoice.customer
          );
        }
        break;
      }

      default:
        // Acknowledge unhandled event types so Stripe stops retrying them.
        break;
    }
  } catch (e) {
    // A DB write failed — return 500 so Stripe retries the delivery later.
    console.error("[stripe/webhook] handler error:", e?.message || e);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
