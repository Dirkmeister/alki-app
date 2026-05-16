/**
 * Avaturn configuration
 *
 * To enable the photoreal avatar capture flow:
 *
 * 1. Go to https://developer.avaturn.me and sign up (free).
 * 2. Create a new application. You will be given a subdomain
 *    that looks like: myapp.avaturn.dev
 * 3. Replace the SUBDOMAIN value below with just the prefix
 *    (e.g. "myapp", NOT "myapp.avaturn.dev").
 * 4. Save and push. That is it.
 *
 * Until a real subdomain is set, the app falls back to the
 * parametric humanoid built in Body3DAvatar.jsx. Nothing
 * breaks; the avatar capture screen shows a setup notice
 * instead.
 */

export const AVATURN_SUBDOMAIN = "demo"; // replace with your subdomain

export const AVATURN_ENABLED =
  AVATURN_SUBDOMAIN !== "demo" && AVATURN_SUBDOMAIN !== "";

export const AVATURN_URL = `https://${AVATURN_SUBDOMAIN}.avaturn.dev`;
