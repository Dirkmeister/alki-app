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
  browse_all: {
    title: "Full Compound Library",
    blurb: "Browse the entire 70+ compound database — every compound beyond your personalized recommendations.",
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
