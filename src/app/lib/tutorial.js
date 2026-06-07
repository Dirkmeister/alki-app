// Sprint 6.5 — first-run tutorial CONTENT (pure data, firewall-clean).
//
// This is the slide copy/structure only — an array of plain objects with no
// React, no renderer, no DOM. It imports the canonical DISCLAIMER (also pure)
// so the legal framing stays single-sourced, and nothing else. The RENDERING
// lives in components/TutorialOverlay.jsx; the TRIGGER + persistence live in
// AlkiApp.jsx. Keeping this file pure means the intro copy ports to React
// Native untouched (only the overlay shell and the storage call get rewritten).
//
// Copy rule: use the app's existing research-subject framing and the canonical
// disclaimer — do NOT invent medical or efficacy language here.
import { DISCLAIMER } from "./disclaimer";

// localStorage keys. Per-device, first-run only — deliberately NOT a Supabase
// column (no migration): a returning user who predates the tutorial simply sees
// it once on their next device that lacks the flag.
export const TUTORIAL_SEEN_KEY = "alki_tutorial_seen";
// Optional one-time nudge pointing at the View Projection / Start Protocol CTA
// the first time a stack has compounds in it.
export const NUDGE_PROJECTION_KEY = "alki_nudge_projection_seen";

// Each slide: { id, eyebrow, title, body: string[], showDisclaimer?, signoff? }.
// The overlay renders them generically; order here is the order shown.
export const TUTORIAL_SLIDES = [
  {
    id: "welcome",
    eyebrow: "Welcome",
    title: "This is Alki",
    body: [
      "An information and research platform for adults 18+ — built to explore peptide protocols, not to sell or prescribe them.",
    ],
    // Slide 1 is the first 100%-free surface every user reaches, so it carries
    // the full canonical disclaimer — this is where the legal framing is set.
    showDisclaimer: true,
  },
  {
    id: "eidolon",
    eyebrow: "Your research subject",
    title: "Meet your Eidolon",
    body: [
      "Your Eidolon is your research subject — a parametric body model calibrated to your biometrics. It is not you.",
      "It exists so you can study how a protocol could reshape a body like yours, separately from your own.",
    ],
  },
  {
    id: "flow",
    eyebrow: "How it works",
    title: "Browse · Build · Project",
    body: [
      "Browse compounds, build a stack, and see your Eidolon's projected transformation.",
      "Every compound carries an evidence grade and a safety advisory, so you always see the basis and the caveats.",
    ],
  },
  {
    id: "tiers",
    eyebrow: "Free & Pro",
    title: "What you can do",
    body: [
      "Free: browse compounds, build a stack, and see your Eidolon with its basic projection.",
      "Pro: the full before / after projection, the cycle timeline, and locking in a protocol.",
    ],
  },
  {
    id: "close",
    eyebrow: "ἀλκή · Strength",
    title: "You're all set",
    body: [
      "Your Eidolon is ready. Build a stack whenever you like — and explore freely.",
    ],
    signoff: "Happy Researching.",
  },
];
