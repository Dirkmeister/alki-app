"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { generateStacks, detectPhase } from "../lib/stackGenerator";
import { DISCLAIMER } from "../lib/disclaimer";

/**
 * ============================================================
 * ALKI — STACK GENERATOR UI
 * ============================================================
 *
 * Renders 2–3 personalized stacks generated from the user's profile.
 * Each stack varies on intensity (conservative → aggressive) and
 * approach (different architectural patterns serving the same phase).
 *
 * Tapping "Load This Stack" replaces the user's current selection
 * with the generated compounds. Then the existing flow takes over:
 * Stack Intelligence renders, View Transformation works, etc.
 * ============================================================
 */

const PHASE_LABELS = {
  cut_high_bf: "Fat Loss Protocol",
  cut_moderate_bf: "Lean-Down Protocol",
  recomp: "Simultaneous Cut & Build",
  lean_bulk: "Lean Mass Protocol",
  ultra_lean: "Ultra-Lean Maintenance",
  recovery: "Recovery & Repair",
  longevity: "Longevity & Anti-Aging",
};

const INTENSITY_LABELS = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
  maximal: "Maximal",
};

export default function StackGenerator({ profile, compoundCatalog, onLoadStack, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openStackId, setOpenStackId] = useState(null);
  // E2 — opt-in to high/unknown-risk compounds and a larger "Maximal" stack that
  // exceeds the usual soft cap. Off by default (advise-don't-gatekeep: warn, allow).
  const [allowHighRisk, setAllowHighRisk] = useState(false);

  const stacks = useMemo(
    () => generateStacks(profile, compoundCatalog, { allowHighRisk }),
    [profile, compoundCatalog, allowHighRisk]
  );

  const phase = useMemo(() => detectPhase(profile), [profile]);
  const phaseLabel = PHASE_LABELS[phase] || "Recomposition";

  // Changing a goal re-detects the phase, which regenerates the stacks above.
  // Re-surface them: if the panel was collapsed (e.g. after loading a stack),
  // re-expand and drop any open card so the fresh ladder is visible. Skips the
  // initial mount so we don't force-open when defaultExpanded is false.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setOpenStackId(null);
    setExpanded(true);
  }, [phase]);

  if (stacks.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Top-level entry card */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={styles.entryButton}
      >
        <div style={styles.entryLeft}>
          <div style={styles.entryIcon}>⚡</div>
          <div style={styles.entryText}>
            <div style={styles.entryTitle}>Generate Research Protocol</div>
            <div style={styles.entrySubtitle}>
              {stacks.length} architecturally distinct protocol{stacks.length !== 1 ? "s" : ""} built for your profile · {phaseLabel}
            </div>
          </div>
        </div>
        <div style={{ ...styles.entryChevron, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</div>
      </button>

      {/* Generated stacks */}
      {expanded && (
        <div style={styles.stackList}>
          <div style={styles.phaseNote}>
            Based on your body fat ({profile.bodyFat}%), goals, and biometrics, Alki identified <span style={{ color: "#22d68a", fontWeight: 600 }}>{phaseLabel}</span> as your primary research phase. Each protocol below uses a different architectural approach.
          </div>

          {/* E2 — advisory opt-in: the soft cap and risk ceiling are not hard limits.
              Enabling this surfaces high/unknown-risk compounds and a larger Maximal
              protocol. Advise-don't-gatekeep: warn clearly, let the user proceed. */}
          <button
            onClick={() => setAllowHighRisk((v) => !v)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10, width: "100%", textAlign: "left",
              padding: "11px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              background: allowHighRisk ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${allowHighRisk ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <span style={{
              width: 20, height: 20, flexShrink: 0, marginTop: 1, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: allowHighRisk ? "#ef4444" : "transparent",
              border: `1.5px solid ${allowHighRisk ? "#ef4444" : "rgba(255,255,255,0.25)"}`,
              color: "#fff", fontSize: 12, fontWeight: 800,
            }}>{allowHighRisk ? "✓" : ""}</span>
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: allowHighRisk ? "#fca5a5" : "rgba(255,255,255,0.85)" }}>
                Include high-risk & unknown-risk compounds
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginTop: 2 }}>
                The 3-tier ladder and ~4-compound size are advisory, not hard limits. Turning this on adds a larger <strong>Maximal</strong> protocol built around HIGH/UNKNOWN-risk anchors. Suppression and side-effect burden rise sharply — full bloodwork and PCT become mandatory.
              </span>
            </span>
          </button>

          {stacks.map((stack) => (
            <StackCard
              key={stack.id}
              stack={stack}
              isOpen={openStackId === stack.id}
              onToggle={() => setOpenStackId(openStackId === stack.id ? null : stack.id)}
              onLoad={() => {
                onLoadStack(stack.compounds.map((c) => c.id));
                setExpanded(false);
                setOpenStackId(null);
              }}
            />
          ))}

          <div style={styles.footerNote}>
            {DISCLAIMER + " Each stack is a starting framework — review every compound's full profile before committing to a protocol."}
          </div>
        </div>
      )}
    </div>
  );
}

function StackCard({ stack, isOpen, onToggle, onLoad }) {
  return (
    <div style={styles.stackCard}>
      {/* Header */}
      <div style={styles.stackHeader} onClick={onToggle}>
        <div style={styles.stackHeaderLeft}>
          <div style={styles.stackName}>{stack.name}</div>
          <div style={styles.stackApproach}>{stack.approach}</div>
        </div>
        <div style={styles.stackHeaderRight}>
          <div style={{ ...styles.riskBadge, color: stack.riskColor, borderColor: stack.riskColor + "55" }}>
            {stack.riskLabel}
          </div>
          <div style={{ ...styles.cardChevron, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</div>
        </div>
      </div>

      {/* Quick meta row */}
      <div style={styles.metaRow}>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Intensity</span>
          <span style={styles.metaValue}>{INTENSITY_LABELS[stack.intensity]}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Compounds</span>
          <span style={styles.metaValue}>{stack.compounds.length}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Axes</span>
          <span style={styles.metaValue}>{stack.axes}</span>
        </div>
      </div>

      {/* Compound chips — always visible */}
      <div style={styles.chipRow}>
        {stack.compounds.map((c) => (
          <div key={c.id} style={styles.chip}>
            {c.name}
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {isOpen && (
        <div style={styles.expandedSection}>
          {/* Design note */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionTitle}>Why This Protocol</div>
            <div style={styles.designNote}>{stack.designNote}</div>
          </div>

          {/* Per-compound roles */}
          <div style={styles.sectionBlock}>
            <div style={styles.sectionTitle}>Role of Each Compound</div>
            {stack.compounds.map((c) => (
              <div key={c.id} style={styles.roleRow}>
                <div style={styles.roleName}>{c.name}</div>
                <div style={styles.roleDescription}>{c.role}</div>
                {c.dosing && <div style={styles.roleDosing}>{c.dosing}</div>}
              </div>
            ))}
          </div>

          {/* Support layer */}
          {stack.support && stack.support.length > 0 && (
            <div style={styles.sectionBlock}>
              <div style={styles.sectionTitle}>Support Requirements</div>
              {stack.support.map((s, i) => (
                <div key={i} style={styles.supportRow}>
                  <div style={styles.supportHeader}>
                    <div style={styles.supportLabel}>{s.label}</div>
                    <div
                      style={{
                        ...styles.supportUrgency,
                        color: s.urgency === "required" ? "#ef4444" : "#f59e0b",
                      }}
                    >
                      {s.urgency}
                    </div>
                  </div>
                  <div style={styles.supportReason}>{s.reason}</div>
                </div>
              ))}
            </div>
          )}

          {/* PCT */}
          {stack.pct && (
            <div style={styles.sectionBlock}>
              <div style={styles.sectionTitle}>Post-Cycle Therapy</div>
              <div style={styles.pctRow}>
                <div style={styles.pctDuration}>Duration: {stack.pct.duration}</div>
                <div style={styles.pctPrimary}>{stack.pct.primary}</div>
                <div style={styles.pctNote}>{stack.pct.note}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Load button — always visible at bottom */}
      <button onClick={onLoad} style={styles.loadButton}>
        Load This Protocol →
      </button>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    width: "100%",
    marginBottom: 16,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  },

  entryButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
    background: "linear-gradient(135deg, rgba(34,214,138,0.12), rgba(34,214,138,0.04))",
    border: "1px solid rgba(34,214,138,0.35)",
    borderRadius: 12,
    cursor: "pointer",
    color: "#e8e8e8",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "transform 0.15s ease",
  },
  entryLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  entryIcon: {
    fontSize: 24,
    lineHeight: 1,
  },
  entryText: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#22d68a",
    letterSpacing: "-0.01em",
  },
  entrySubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: 500,
  },
  entryChevron: {
    fontSize: 12,
    color: "rgba(34,214,138,0.7)",
    transition: "transform 0.2s ease",
    flexShrink: 0,
    marginLeft: 8,
  },

  stackList: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  phaseNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.55,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 10,
    marginBottom: 4,
  },

  stackCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    overflow: "hidden",
  },

  stackHeader: {
    padding: "14px 16px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  stackHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  stackName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 3,
    letterSpacing: "-0.01em",
  },
  stackApproach: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.4,
  },
  stackHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  riskBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    padding: "3px 8px",
    border: "1px solid",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  cardChevron: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    transition: "transform 0.2s ease",
  },

  metaRow: {
    display: "flex",
    gap: 16,
    padding: "8px 16px 12px",
    flexWrap: "wrap",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: 600,
    color: "#e8e8e8",
  },

  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    padding: "12px 16px",
  },
  chip: {
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    background: "rgba(34,214,138,0.1)",
    color: "#22d68a",
    border: "1px solid rgba(34,214,138,0.2)",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },

  expandedSection: {
    padding: "0 16px 12px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  sectionBlock: {
    padding: "14px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 10,
  },
  designNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.6,
  },

  roleRow: {
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  roleName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#22d68a",
    marginBottom: 3,
  },
  roleDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  roleDosing: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "monospace",
  },

  supportRow: {
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  supportHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  supportLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#e8e8e8",
  },
  supportUrgency: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    flexShrink: 0,
  },
  supportReason: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.5,
  },

  pctRow: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.5,
  },
  pctDuration: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  pctPrimary: {
    fontWeight: 600,
    color: "#e8e8e8",
    marginBottom: 6,
  },
  pctNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontStyle: "italic",
  },

  loadButton: {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(34,214,138,0.12)",
    color: "#22d68a",
    border: "none",
    borderTop: "1px solid rgba(34,214,138,0.2)",
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.02em",
    transition: "background 0.15s ease",
  },

  footerNote: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    lineHeight: 1.5,
    fontStyle: "italic",
    textAlign: "center",
    padding: "8px 4px",
  },
};
