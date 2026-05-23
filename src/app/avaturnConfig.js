/**
 * Avaturn configuration
 *
 * Currently using Avaturn's shared `demo` subdomain — the free-tier
 * sandbox that powers their public quickstart. Limitations:
 *  - Branded "Powered by Avaturn" watermark in the iframe
 *  - Shared rate limits
 *  - Avatars may not persist long-term on their CDN
 *
 * Plenty good for prototype + Austin testing. Upgrade to a paid
 * dedicated subdomain later (alki-io.avaturn.dev is reserved on
 * the account; activating it requires a Pro plan).
 */

export const AVATURN_SUBDOMAIN = "demo";

// We treat `demo` as enabled — it really is the free-tier path,
// per Avaturn's own quickstart. Only an empty subdomain disables.
//
// DISABLED (May 2026): the parametric HumGen 3D body replaced Avaturn as
// the real avatar. Avaturn was the abandoned photoreal-head path. All
// Avaturn code is kept intact for possible future face-capture use — set
// this back to `AVATURN_SUBDOMAIN !== ""` to re-enable.
export const AVATURN_ENABLED = false;

export const AVATURN_URL = `https://${AVATURN_SUBDOMAIN}.avaturn.dev`;
