// ── SUBSCRIPTION / PRO ENTITLEMENT — pure logic ───────────────────────────
// Per the portability firewall (CLAUDE.md rule 1) this file imports nothing
// from React or any renderer. It answers two questions: "is this profile Pro?"
// and "does this feature need Pro?" — plus the price copy the paywall shows.
// All paywall *rendering* lives in shell/components; only the WHAT lives here.

// The two purchasable tiers, with display copy for the upgrade prompt. Amounts
// are presentation only — the real charge is the Stripe price resolved
// server-side from STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL. Keep these in
// sync with the sandbox/live prices ($19.99/mo, $149.99/yr).
export const PRO_PRICING = {
  monthly: {
    tier: "monthly",
    price: "$19.99",
    cadence: "/mo",
    blurb: "Billed monthly. Cancel anytime.",
  },
  annual: {
    tier: "annual",
    price: "$149.99",
    cadence: "/yr",
    // 12 × $19.99 = $239.88 → $149.99 saves ~37%.
    blurb: "$12.50/mo, billed yearly — save 37%.",
    bestValue: true,
  },
};

// Pro-gated features. Each maps to the upgrade-prompt copy shown when a free
// user hits the gate. Keep this the single source of truth for "what is Pro" —
// gates reference these keys instead of hardcoding their own checks.
export const PRO_FEATURES = {
  // The #1 gate. Free users see numeric projection deltas in the builder, but
  // the full before/after transform surface — paired Eidolon avatars, the stat
  // tiles, and the Timeline tab — is Pro. This is the core "see your projection"
  // upsell, so it leads the feature list.
  projection: {
    title: "See Your Projection",
    blurb: "Watch your Eidolon transform — a full before/after of your projected physique, the stat-by-stat breakdown, and your cycle timeline.",
  },
  avatar_3d: {
    title: "3D Eidolon",
    blurb: "See your Eidolon in full 3D — rotate it, zoom in, and watch your projected transformation render in real time.",
  },
  stack_lock_in: {
    title: "Lock In Your Protocol",
    blurb: "Commit your stack to begin cultivation — unlock progress tracking, your timeline, and your personalized protocol guide.",
  },
  protocol_guide: {
    title: "Protocol Guide",
    blurb: "Your personalized supply list, reconstitution calculator, injection schedule, and week-by-week plan.",
  },
  progress_log: {
    title: "Progress Log",
    blurb: "Log weekly check-ins and watch your Eidolon cultivate as your real body changes.",
  },
  cycle_timeline: {
    title: "Cycle Timeline",
    blurb: "A week-by-week visualization of your protocol's ramp, peak, and taper phases.",
  },
  extra_eidolon: {
    title: "A Second Eidolon",
    blurb: "Alki Pro lets you run two Eidolons at once — compare protocols side by side. Need more? Add permanent slots any time.",
  },
  eidolon_customization: {
    title: "Customize Your Eidolon",
    blurb: "Rename your Eidolon and make it yours. Customization — including renaming and the editable 3D avatar — is part of Alki Pro.",
  },
};

// Whether a feature key requires Pro. Anything not in PRO_FEATURES is free.
export function isProFeature(featureKey) {
  return Object.prototype.hasOwnProperty.call(PRO_FEATURES, featureKey);
}

// The core entitlement check. A profile is Pro when its subscription is active
// OR it has been manually comped (founder/tester grant). Defensive against a
// null profile or a pre-migration profile missing these fields (→ not Pro).
// NOTE: 'past_due' and 'canceled' are intentionally NOT Pro — access re-locks
// when payment fails or the plan ends (Settings shows the recovery prompt).
export function isProUser(profile) {
  if (!profile) return false;
  return profile.subscriptionStatus === "active" || profile.comped === true;
}

// Can this profile access a given feature? True for free features always, and
// for Pro features only when the user is Pro.
export function canAccessFeature(profile, featureKey) {
  if (!isProFeature(featureKey)) return true;
  return isProUser(profile);
}

// ── EIDOLON SLOTS — how many active Eidolons this profile may run ──────────
// COMPUTED, never stored: base allowance (Pro = 2, free = 1) plus any
// one-time PERMANENT slots the user purchased ($10 each). Purchased slots
// persist across subscription changes (the eidolon_slots_purchased counter
// lives on the profile and is never decremented), so a lapsed Pro keeps every
// slot they paid for even though the base drops back to 1.
export function maxEidolons(profile) {
  const base = isProUser(profile) ? 2 : 1;
  const purchased = Math.max(0, Math.floor(Number(profile?.eidolonSlotsPurchased) || 0));
  return base + purchased;
}

// Which eidolons are LOCKED (archived) because the profile is over its current
// allowance — e.g. a Pro lapsed from 2 active back to 1. Returns a Set of ids.
// We NEVER delete the excess; we lock from the END of the stored array (the
// most recently created) so the user's earliest/primary eidolons stay active by
// default. The UI lets the user promote a locked eidolon back into the active
// window (choosing which stay active), which simply reorders the array. A
// profile at or under its cap has no locked eidolons.
export function lockedEidolonIds(eidolons, profile) {
  const list = Array.isArray(eidolons) ? eidolons : [];
  const cap = maxEidolons(profile);
  if (list.length <= cap) return new Set();
  return new Set(list.slice(cap).map((e) => e.id));
}
