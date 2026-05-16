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
export const AVATURN_ENABLED = AVATURN_SUBDOMAIN !== "";

export const AVATURN_URL = `https://${AVATURN_SUBDOMAIN}.avaturn.dev`;
