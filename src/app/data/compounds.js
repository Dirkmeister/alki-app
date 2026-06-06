// ─────────────────────────────────────────────────────────────
// ALKI — COMBINED COMPOUND DATABASE
// ─────────────────────────────────────────────────────────────
// Single combiner for the full compound list. The 8 founding
// compounds live in `./compoundsCore.js` (canonical source of truth,
// audit item 9), the 63-compound expansion in `./compounds-expanded.js`.
// This file just concatenates them.
//
// Consumed by AlkiApp.jsx (the app UI) and protocolProtocols.js (the
// Protocol Guide). Both import COMPOUNDS from here, so the 8 core are
// now defined exactly ONCE.
//
// Pure data — imports nothing from React / Next / DOM / three
// (portability firewall, CLAUDE.md rule 1).
// ─────────────────────────────────────────────────────────────
import { CORE_COMPOUNDS } from "./compoundsCore";
import { EXPANDED_COMPOUNDS } from "./compounds-expanded";

export const COMPOUNDS = [...CORE_COMPOUNDS, ...EXPANDED_COMPOUNDS];
