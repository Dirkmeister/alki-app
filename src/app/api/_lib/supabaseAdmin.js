// Server-only Supabase client using the SERVICE ROLE key.
//
// The service role bypasses RLS — it is the ONLY writer allowed to touch the
// subscription columns on profiles (the guard trigger in migration 007 rejects
// those writes from the client roles). `server-only` guarantees this module —
// and therefore the service-role key — can never be pulled into a browser
// bundle: importing it from a client component is a build error.
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

// No session persistence / auto-refresh: this is a stateless server client used
// per-request to write subscription state. It must never adopt a user session.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
