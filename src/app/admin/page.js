"use client";

// Internal route: /admin → the bug-triage board.
// Not part of the user-facing app shell (no splash/age-gate/auth). Reachable by
// URL only. Source of truth for the board data is the Supabase `feedback` table;
// AlkiTriage holds the curated snapshot. Unauthenticated for now — internal/dev use.
import Triage from "./AlkiTriage";

export default function AdminPage() {
  return <Triage />;
}
