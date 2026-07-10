"use client";

// Internal route: /admin → the bug-triage board.
// 6.7-b — previously rendered unconditionally, reachable by anyone with the
// URL. It is now gated behind an authenticated Supabase session AND an admin
// email allowlist, so the Triage board (and the feedback snapshot it pulls)
// never mounts for a signed-out or non-admin visitor. The allowlist is
// NEXT_PUBLIC_ADMIN_EMAILS (comma-separated), defaulting to the owner so the
// board works out of the box; emails are not secrets. NOTE: the durable data
// guard is feedback-table RLS — this client gate hides the board but does not
// by itself stop a determined authenticated user from querying feedback.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Triage from "./AlkiTriage";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "dallaskrech20@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const wrap = {
  minHeight: "100vh",
  background: "#0a0a0a",
  color: "#ededed",
  fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: 24,
};

export default function AdminPage() {
  // "checking" until the session resolves, then "allowed" or "denied". Both
  // non-allowed states render a neutral screen — never the Triage board.
  const [state, setState] = useState("checking");

  useEffect(() => {
    if (!supabase) {
      setState("denied");
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        const email = session?.user?.email?.toLowerCase();
        setState(email && ADMIN_EMAILS.includes(email) ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setState("denied");
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === "allowed") return <Triage />;

  return (
    <div style={wrap}>
      {state === "checking" ? (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Checking access…</div>
      ) : (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", margin: 0 }}>
            Access Restricted
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 12, maxWidth: 320, lineHeight: 1.7 }}>
            This is an internal tool. Sign in to Alki with an authorized account to view it.
          </p>
        </>
      )}
    </div>
  );
}
