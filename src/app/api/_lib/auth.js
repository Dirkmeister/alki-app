// Server-only: verify the caller's Supabase session from the request.
//
// The app's supabase-js client stores its session in localStorage (not
// cookies), so the server can't read it from the request automatically.
// Instead the client sends its access token as `Authorization: Bearer <jwt>`,
// and we validate that jwt against Supabase Auth here. We NEVER trust a
// client-supplied user id — the user is always derived from the verified token.
import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";

// Returns the authenticated Supabase user, or null if the request carries no
// valid bearer token. getUser(jwt) validates the token server-side against
// GoTrue, so a forged/expired token resolves to null.
export async function getUserFromRequest(req) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch (_) {
    return null;
  }
}
