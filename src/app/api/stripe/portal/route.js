// POST /api/stripe/portal
// Opens a Stripe Customer Portal session so a subscriber can manage or cancel
// their plan themselves. Session-verified; the customer is looked up from the
// caller's own profile (never supplied by the client).
import { NextResponse } from "next/server";
import { stripe } from "../../_lib/stripe";
import { supabaseAdmin } from "../../_lib/supabaseAdmin";
import { getUserFromRequest } from "../../_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (error || !profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No subscription on file to manage." },
      { status: 400 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/?portal=return`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/portal] create session failed:", e?.message || e);
    return NextResponse.json(
      { error: "Could not open the billing portal. Please try again." },
      { status: 500 }
    );
  }
}
