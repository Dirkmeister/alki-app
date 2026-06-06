// POST /api/stripe/checkout
// Creates a Stripe Checkout Session (subscription mode) for the signed-in user
// and returns its URL. The caller's identity comes ONLY from their verified
// Supabase session (Authorization: Bearer <jwt>) — never from the request body.
import { NextResponse } from "next/server";
import { stripe, priceIdForTier } from "../../_lib/stripe";
import { supabaseAdmin } from "../../_lib/supabaseAdmin";
import { getUserFromRequest } from "../../_lib/auth";

// Stripe SDK needs Node (not the edge runtime); never cache this handler.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    /* empty body is fine — handled by the tier check below */
  }

  // We accept a tier label and resolve the price id server-side, so the client
  // can never point checkout at an arbitrary (or wrong-priced) Stripe price.
  const tier = body?.tier;
  const priceId = priceIdForTier(tier);
  if (!priceId) {
    return NextResponse.json(
      { error: "Invalid plan selection." },
      { status: 400 }
    );
  }

  // Reuse an existing Stripe customer if we already have one for this user, so
  // repeat checkouts don't fan out into duplicate customers.
  let customerId = null;
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    customerId = profile?.stripe_customer_id || null;
  } catch (_) {
    /* no profile row yet is fine — Checkout will create the customer */
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Map the checkout back to our user from BOTH the session and the
      // resulting subscription, so every downstream webhook can resolve the
      // Supabase user id without a customer lookup.
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      ...(customerId
        ? { customer: customerId }
        : { customer_email: user.email }),
      // Let Stripe attach the customer id to the resulting customer object too.
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: false,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/checkout] create session failed:", e?.message || e);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
