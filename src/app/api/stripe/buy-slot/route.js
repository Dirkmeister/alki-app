// POST /api/stripe/buy-slot
// Creates a Stripe Checkout Session in PAYMENT mode (one-time $10) for a
// permanent extra eidolon slot. Like every other Stripe route, the caller's
// identity comes ONLY from their verified Supabase session (Authorization:
// Bearer <jwt>) — never from the request body.
//
// Gate: slots are a Pro add-on, so we REQUIRE an active subscription (or a
// founder comp) SERVER-SIDE before opening checkout. A free user has no slot to
// buy — they should be upgrading to Pro first. The webhook is what actually
// grants the slot (idempotently); this route only starts the purchase.
import { NextResponse } from "next/server";
import { stripe, PRICE_SLOT } from "../../_lib/stripe";
import { supabaseAdmin } from "../../_lib/supabaseAdmin";
import { getUserFromRequest } from "../../_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!PRICE_SLOT) {
    console.error("[stripe/buy-slot] STRIPE_PRICE_SLOT is not set.");
    return NextResponse.json(
      { error: "Slot purchases are not configured." },
      { status: 500 }
    );
  }

  // Read the caller's entitlement from THEIR profile (never trust the client).
  // We need both the subscription state (to gate) and the customer id (to reuse
  // the existing Stripe customer rather than spawning a duplicate).
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, subscription_status, comped")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      { error: "Could not load your profile." },
      { status: 500 }
    );
  }

  // Server-side Pro gate: active subscription OR a founder comp. This mirrors
  // isProUser() on the client, but the client check is advisory — THIS is the
  // enforcement. 'past_due' / 'canceled' / 'free' cannot buy slots.
  const isPro = profile.subscription_status === "active" || profile.comped === true;
  if (!isPro) {
    return NextResponse.json(
      { error: "An active Alki Pro subscription is required to buy extra slots." },
      { status: 403 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // one-time charge, NOT a subscription
      line_items: [{ price: PRICE_SLOT, quantity: 1 }],
      // Identify the user AND the purpose so the (shared) webhook can route this
      // session to the slot-grant branch and credit the right profile. The
      // webhook trusts metadata.user_id because Stripe echoes back exactly what
      // we set here on a session we created for an authenticated caller.
      client_reference_id: user.id,
      metadata: { user_id: user.id, purpose: "eidolon_slot" },
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      success_url: `${origin}/?slot=success`,
      cancel_url: `${origin}/?slot=cancel`,
      allow_promotion_codes: false,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/buy-slot] create session failed:", e?.message || e);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
