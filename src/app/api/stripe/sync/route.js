// POST /api/stripe/sync
// Reconciliation guard for missed webhooks. Re-fetches the caller's
// subscriptions from Stripe (by their stored customer id) and corrects the
// profile to match the live truth. Session-verified. Called ONLY from Settings
// ("Refresh subscription status") — never on every profile load.
import { NextResponse } from "next/server";
import { stripe, tierForPrice, statusFromStripe } from "../../_lib/stripe";
import { supabaseAdmin } from "../../_lib/supabaseAdmin";
import { getUserFromRequest } from "../../_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pick the subscription that best represents entitlement: a live one
// (active/trialing) wins over past_due, which wins over ended ones.
const STATUS_RANK = { active: 3, trialing: 3, past_due: 2, unpaid: 2, canceled: 1 };
function chooseSubscription(subs) {
  if (!subs?.length) return null;
  return [...subs].sort((a, b) => {
    const ra = STATUS_RANK[a.status] || 0;
    const rb = STATUS_RANK[b.status] || 0;
    if (rb !== ra) return rb - ra;
    return (b.created || 0) - (a.created || 0); // newer first on a tie
  })[0];
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, subscription_status, subscription_tier")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 });
  }

  // No Stripe customer → nothing to reconcile. Report current state unchanged.
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({
      subscription_status: profile?.subscription_status || "free",
      subscription_tier: profile?.subscription_tier || null,
    });
  }

  let chosen;
  try {
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 20,
    });
    chosen = chooseSubscription(subs.data);
  } catch (e) {
    console.error("[stripe/sync] list subscriptions failed:", e?.message || e);
    return NextResponse.json(
      { error: "Could not reach Stripe. Please try again." },
      { status: 502 }
    );
  }

  // No subscriptions at all on this customer → they have no active plan.
  const nextStatus = chosen ? statusFromStripe(chosen.status) : "free";
  const nextTier = chosen && nextStatus === "active"
    ? tierForPrice(chosen.items?.data?.[0]?.price)
    : null;

  const { error: updErr } = await supabaseAdmin
    .from("profiles")
    .update({ subscription_status: nextStatus, subscription_tier: nextTier })
    .eq("id", user.id);

  if (updErr) {
    console.error("[stripe/sync] profile update failed:", updErr.message);
    return NextResponse.json({ error: "Could not save the synced status." }, { status: 500 });
  }

  return NextResponse.json({ subscription_status: nextStatus, subscription_tier: nextTier });
}
