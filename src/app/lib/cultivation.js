// ═══════════════════════════════════════════════════════════
// ALKI — Eidolon Cultivation State Machine
// Progression → Stagnation → Regression
// ═══════════════════════════════════════════════════════════

/**
 * Compute cultivation state from progress logs.
 *
 * States:
 *   "new"         — no logs yet
 *   "progressing"  — logged within last 9 days (buffer beyond 7)
 *   "stagnant"     — 9–18 days since last log
 *   "regressing"   — 18+ days since last log
 *
 * Returns: { state, daysSinceLog, streak, weeksCovered }
 */
export function getCultivationState(logs) {
  if (!logs || logs.length === 0) {
    return { state: "new", daysSinceLog: null, streak: 0, weeksCovered: 0 };
  }

  // logs should be sorted by logged_at desc (newest first)
  const latest = new Date(logs[0].logged_at);
  const now = new Date();
  const daysSinceLog = Math.floor((now - latest) / (1000 * 60 * 60 * 24));

  // Calculate streak: consecutive weeks with at least one log
  // Walk backward from current week
  const weekBuckets = new Map();
  for (const log of logs) {
    const d = new Date(log.logged_at);
    const weekKey = getWeekKey(d);
    weekBuckets.set(weekKey, true);
  }

  let streak = 0;
  const checkDate = new Date(now);
  // Start from current week and walk backward
  for (let i = 0; i < 52; i++) {
    const wk = getWeekKey(checkDate);
    if (weekBuckets.has(wk)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 7);
    } else if (i === 0) {
      // Current week might not have a log yet — don't break streak
      checkDate.setDate(checkDate.getDate() - 7);
      continue;
    } else {
      break;
    }
  }

  const state =
    daysSinceLog <= 9 ? "progressing" :
    daysSinceLog <= 18 ? "stagnant" :
    "regressing";

  return {
    state,
    daysSinceLog,
    streak,
    weeksCovered: weekBuckets.size
  };
}

/**
 * Compute a regression factor (0–1) for how much the Eidolon
 * should revert toward baseline. 0 = full projected gains, 1 = baseline.
 */
export function getRegressionFactor(cultivationState) {
  if (cultivationState.state === "progressing") return 0;
  if (cultivationState.state === "stagnant") {
    // Gradually increase from 0 to 0.3 over the stagnant window
    const days = cultivationState.daysSinceLog;
    return Math.min(0.3, (days - 9) / 30);
  }
  // Regressing: ramp from 0.3 to 0.85 over 30 more days
  const days = cultivationState.daysSinceLog;
  return Math.min(0.85, 0.3 + (days - 18) / 50);
}

/**
 * Visual parameters for the Eidolon based on cultivation state.
 */
export function getCultivationVisuals(state) {
  switch (state) {
    case "progressing":
      return {
        glowColor: "#22d68a",
        glowOpacity: 0.12,
        glowIntensity: 3,
        overlayOpacity: 0.08,
        statusLabel: "Progressing",
        statusColor: "#22d68a",
        statusIcon: "▲",
        statusBg: "rgba(34,214,138,0.1)",
        statusBorder: "rgba(34,214,138,0.25)"
      };
    case "stagnant":
      return {
        glowColor: "#f59e0b",
        glowOpacity: 0.06,
        glowIntensity: 1.5,
        overlayOpacity: 0.03,
        statusLabel: "Stagnant",
        statusColor: "#f59e0b",
        statusIcon: "■",
        statusBg: "rgba(245,158,11,0.1)",
        statusBorder: "rgba(245,158,11,0.25)"
      };
    case "regressing":
      return {
        glowColor: "#ef4444",
        glowOpacity: 0.04,
        glowIntensity: 0.8,
        overlayOpacity: 0.01,
        statusLabel: "Regressing",
        statusColor: "#ef4444",
        statusIcon: "▼",
        statusBg: "rgba(239,68,68,0.1)",
        statusBorder: "rgba(239,68,68,0.25)"
      };
    default: // "new"
      return {
        glowColor: "rgba(255,255,255,0.2)",
        glowOpacity: 0,
        glowIntensity: 0,
        overlayOpacity: 0,
        statusLabel: "Awaiting First Log",
        statusColor: "rgba(255,255,255,0.4)",
        statusIcon: "○",
        statusBg: "rgba(255,255,255,0.04)",
        statusBorder: "rgba(255,255,255,0.1)"
      };
  }
}

// ── Helpers ──────────────────────────────────────────────

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO week: Monday-based
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
