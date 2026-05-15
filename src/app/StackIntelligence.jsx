"use client";

import React, { useMemo } from "react";

/**
 * ============================================================
 * ALKI — STACK INTELLIGENCE ENGINE
 * ============================================================
 *
 * Drop-in module for AlkiApp.jsx. Renders in the Dashboard as the
 * user selects compounds, and updates in real-time.
 *
 * Architecture mirrors the Umbrella Labs reference doc Section 6:
 * each stack is analyzed by biological axis coverage, support layer
 * requirements, contraindications, and design rationale.
 *
 * USAGE in Dashboard:
 *   import StackIntelligence from './StackIntelligence';
 *
 *   <StackIntelligence
 *     stackIds={selectedCompounds}          // array of compound ids
 *     userProfile={profile}                 // { sex, age, bodyFat, ... }
 *     onRemoveCompound={(id) => toggleCompound(id)}
 *   />
 *
 * The engine returns isBlocked = true when a critical contraindication
 * is present. The parent app should disable the Transform CTA until
 * isBlocked clears.
 *
 * Compound IDs match AlkiApp.jsx COMPOUNDS array:
 *   bpc157, tb500, ipacjc, tesamorelin, semaglutide,
 *   retatrutide, ghkcu, pt141
 * ============================================================
 */

// ============================================================
// BIOLOGICAL AXIS TAXONOMY
// ============================================================

const AXES = {
  ar: {
    label: "Androgen Receptor",
    short: "AR",
    color: "#ff6b6b",
    desc: "Muscle protein synthesis, strength, masculinization",
  },
  gh_axis: {
    label: "GH Axis",
    short: "GH",
    color: "#22d68a",
    desc: "Growth hormone & IGF-1 signaling, recovery, lean mass",
  },
  tissue_repair: {
    label: "Tissue Repair",
    short: "REPAIR",
    color: "#4dabf7",
    desc: "Angiogenesis, tendon/ligament/gut healing",
  },
  metabolic: {
    label: "Metabolic / GLP",
    short: "METAB",
    color: "#ffd43b",
    desc: "Appetite, glucose, fat oxidation",
  },
  anti_aging: {
    label: "Anti-Aging / ECM",
    short: "ECM",
    color: "#c084fc",
    desc: "Collagen, skin quality, longevity signaling",
  },
  cns_melanocortin: {
    label: "CNS / Melanocortin",
    short: "CNS",
    color: "#f783ac",
    desc: "Central libido, pigmentation pathway",
  },
  cortisol_hpa: {
    label: "Cortisol / HPA",
    short: "HPA",
    color: "#94a3b8",
    desc: "Stress axis, recovery, cortisol modulation",
  },
  cholinergic: {
    label: "Cholinergic",
    short: "ACh",
    color: "#74c0fc",
    desc: "Acetylcholine, memory, focus, neuromuscular",
  },
  dopaminergic: {
    label: "Dopaminergic",
    short: "DA",
    color: "#ff922b",
    desc: "Motivation, reward, executive function",
  },
  thyroid: {
    label: "Thyroid / BMR",
    short: "T3",
    color: "#fd7e14",
    desc: "Basal metabolic rate, thermogenesis",
  },
  estrogen: {
    label: "Estrogen / Aromatase",
    short: "E2",
    color: "#e599f7",
    desc: "Estrogen modulation, aromatase activity",
  },
  cardiovascular: {
    label: "Cardiovascular",
    short: "CV",
    color: "#ff8787",
    desc: "Vascular tone, blood pressure, PDE-5",
  },
};

// ============================================================
// COMPOUND INTELLIGENCE DATABASE
// IDs match AlkiApp.jsx COMPOUNDS array exactly.
// ============================================================

const COMPOUND_INTEL = {
  bpc157: {
    name: "BPC-157",
    category: "Recovery",
    axes: [
      { axis: "tissue_repair", weight: 1.0, mechanism: "Angiogenesis, local tendon/ligament/gut repair" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "limited_human" },
    synergies: ["tb500"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Local tissue repair anchor. Pairs canonically with TB-500 for systemic + local coverage.",
  },
  tb500: {
    name: "TB-500",
    category: "Recovery",
    axes: [
      { axis: "tissue_repair", weight: 0.9, mechanism: "Systemic actin binding, stem cell mobilization" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "limited_human" },
    synergies: ["bpc157"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Systemic healing layer. BPC-157 handles local injury; TB-500 conditions the body-wide repair environment.",
  },
  ipacjc: {
    name: "Ipamorelin + CJC-1295",
    category: "Growth Hormone",
    axes: [
      { axis: "gh_axis", weight: 1.0, mechanism: "GHRH analog (CJC) + selective ghrelin agonist (Ipamorelin)" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0.05, dataQuality: "moderate" },
    synergies: ["bpc157", "tb500", "semaglutide", "retatrutide"],
    redundancies: ["tesamorelin"],
    supportTriggers: [],
    contraindications: [],
    designNote: "Physiological GH pulse via complementary mechanisms. 5–10x larger pulse than either alone. Run pre-sleep for primary repair window.",
  },
  tesamorelin: {
    name: "Tesamorelin",
    category: "Fat Loss",
    axes: [
      { axis: "gh_axis", weight: 0.85, mechanism: "GHRH analog (FDA-approved)" },
      { axis: "metabolic", weight: 0.35, mechanism: "Visceral fat reduction (validated mechanism)" },
    ],
    risk: { suppression: 0, liver: 0.05, cardio: 0.1, dataQuality: "fda_approved" },
    synergies: ["ghkcu"],
    redundancies: ["ipacjc"],
    supportTriggers: ["glucose_monitoring"],
    contraindications: [],
    designNote: "Strongest human evidence of the GH peptide class. Targets visceral fat specifically. Not redundant with Ipamorelin/CJC at lower doses on separate timing — but stacking both at full dose is over-saturation.",
  },
  semaglutide: {
    name: "Semaglutide",
    category: "Weight Loss",
    axes: [
      { axis: "metabolic", weight: 1.0, mechanism: "GLP-1 receptor agonist — appetite suppression + insulin secretion" },
    ],
    risk: { suppression: 0, liver: 0.05, cardio: 0.1, dataQuality: "fda_approved" },
    synergies: ["ipacjc"],
    redundancies: ["retatrutide"],
    supportTriggers: ["protein_intake", "resistance_training"],
    contraindications: [
      {
        type: "body_fat_min",
        male: 15,
        female: 22,
        severity: "critical",
        message:
          "GLP-1 agonists are contraindicated for lean individuals. Significant lean mass loss occurs alongside fat loss — net body composition outcome is poor below these body fat thresholds.",
      },
    ],
    designNote: "Best for body fat ≥22% (female) or ≥15% (male). Pair with resistance training and elevated protein to preserve lean mass. Weight rebounds after cessation without lifestyle anchor.",
  },
  retatrutide: {
    name: "Retatrutide",
    category: "Weight Loss",
    axes: [
      { axis: "metabolic", weight: 1.2, mechanism: "Triple agonist: GLP-1 + GIP + Glucagon receptors" },
    ],
    risk: { suppression: 0, liver: 0.15, cardio: 0.2, dataQuality: "phase_iii" },
    synergies: ["ipacjc"],
    redundancies: ["semaglutide"],
    supportTriggers: ["protein_intake", "resistance_training", "glucose_monitoring"],
    contraindications: [
      {
        type: "body_fat_min",
        male: 18,
        female: 24,
        severity: "critical",
        message:
          "Retatrutide is the most aggressive GLP-class compound currently known. Lean mass loss risk exceeds Semaglutide. Higher body fat threshold required.",
      },
    ],
    designNote: "Triple agonist — most powerful GLP available. Still in Phase III. Treat as the maximum-output GLP option; not a starting compound. Glucose monitoring strongly advised.",
  },
  ghkcu: {
    name: "GHK-Cu",
    category: "Anti-Aging",
    axes: [
      { axis: "tissue_repair", weight: 0.5, mechanism: "Collagen synthesis, ECM reconstruction" },
      { axis: "anti_aging", weight: 1.0, mechanism: "4000+ gene activation, skin/hair quality, longevity signaling" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0, dataQuality: "moderate" },
    synergies: ["bpc157", "tesamorelin"],
    redundancies: [],
    supportTriggers: [],
    contraindications: [],
    designNote: "Naturally occurring copper peptide. Topical/intranasal route has best evidence. Stacks cleanly with everything else in the database.",
  },
  pt141: {
    name: "PT-141",
    category: "Performance",
    axes: [
      { axis: "cns_melanocortin", weight: 1.0, mechanism: "MC3R/MC4R agonist — central libido pathway" },
    ],
    risk: { suppression: 0, liver: 0, cardio: 0.2, dataQuality: "fda_approved" },
    synergies: [],
    redundancies: [],
    supportTriggers: [],
    contraindications: [
      {
        type: "hypertension",
        severity: "moderate",
        message:
          "PT-141 can transiently elevate blood pressure. Use with caution if uncontrolled hypertension is present. Discuss with a physician before use.",
      },
    ],
    designNote: "Central nervous system mechanism — not vascular like PDE-5 inhibitors. Use as needed, max 2x/week. Nausea common at higher doses.",
  },
};

// ============================================================
// SUPPORT COMPOUND / LIFESTYLE REQUIREMENT DEFINITIONS
// Extensible map. Future SARM expansion adds TUDCA, NAC,
// Tadalafil, Nolvadex, Enclomiphene, Anastrozole, etc.
// ============================================================

const SUPPORT_DEFS = {
  protein_intake: {
    label: "Elevated Protein Intake",
    category: "Lifestyle",
    urgency: "required",
    detail:
      "Target 0.8–1.0g protein per pound bodyweight daily. GLP-1 use without adequate protein produces a poor body composition outcome — fat loss is mixed with significant lean mass loss.",
  },
  resistance_training: {
    label: "Resistance Training Protocol",
    category: "Lifestyle",
    urgency: "required",
    detail:
      "Resistance training 3–4x/week is the single strongest signal preserving lean mass during GLP-1-induced weight loss. Without it, expect 30–40% of weight lost to be lean tissue.",
  },
  glucose_monitoring: {
    label: "Glucose Monitoring",
    category: "Monitoring",
    urgency: "recommended",
    detail:
      "CGM or fasting glucose check weekly during the first month. Watch for hypoglycemia risk, particularly with triple-agonist compounds.",
  },
  monitor_prolactin: {
    label: "Monitor for Prolactin Sides",
    category: "Monitoring",
    urgency: "optional",
    detail:
      "If libido drop or nipple sensitivity occurs, consider lab work. Cabergoline 0.25mg 2x/week resolves prolactin sides if confirmed. (Reserved for GHRP-6 / hexarelin when database expands — Ipamorelin does not require this.)",
  },
  tudca_nac: {
    label: "TUDCA 500mg/day + NAC 600mg/day",
    category: "Hepatic Support",
    urgency: "required",
    detail:
      "Mandatory throughout cycle and 2 weeks after for hepatotoxic compounds. Bile acid + glutathione precursor combination is the standard liver protection layer.",
  },
  tadalafil_daily: {
    label: "Tadalafil 5mg Daily",
    category: "Cardiovascular Support",
    urgency: "recommended",
    detail:
      "Daily low-dose tadalafil provides cardiovascular protection, blood pressure management, and sexual function support during cycles. Zero downside at this dose for most users.",
  },
  pct_standard: {
    label: "Standard PCT Protocol",
    category: "Hormonal Recovery",
    urgency: "required",
    detail:
      "Nolvadex 20mg/day or Enclomiphene 12.5mg/day for 4–6 weeks post-cycle to restore HPG axis function. Bloodwork 4 weeks post-PCT to verify recovery.",
  },
  bloodwork_panel: {
    label: "Bloodwork Panel",
    category: "Monitoring",
    urgency: "required",
    detail:
      "Pre-cycle, week 6, and 4 weeks post-PCT: Total + Free Testosterone, LH, FSH, Estradiol, ALT, AST, Lipids, CBC. This is the only real safety net for any hormonal compound.",
  },
};

// ============================================================
// STACK ANALYZER — pure function, deterministic
// ============================================================

function analyzeStack(stackIds, userProfile = {}) {
  const validIds = (stackIds || []).filter((id) => COMPOUND_INTEL[id]);
  const compounds = validIds.map((id) => ({ id, ...COMPOUND_INTEL[id] }));

  if (compounds.length === 0) {
    return {
      compounds: [],
      axisCoverage: {},
      redundancies: [],
      synergies: [],
      supportRequired: [],
      contraindications: [],
      safetyScore: { overall: 100, suppression: 100, liver: 100, cardio: 100, interaction: 100 },
      isBlocked: false,
      summary: null,
    };
  }

  // -------- AXIS COVERAGE --------
  const axisCoverage = {};
  compounds.forEach((c) => {
    c.axes.forEach(({ axis, weight, mechanism }) => {
      if (!axisCoverage[axis]) {
        axisCoverage[axis] = { totalWeight: 0, compounds: [] };
      }
      axisCoverage[axis].totalWeight += weight;
      axisCoverage[axis].compounds.push({
        id: c.id,
        name: c.name,
        weight,
        mechanism,
      });
    });
  });

  // -------- REDUNDANCIES --------
  const redundancies = [];
  const seenRedundancyPairs = new Set();

  compounds.forEach((c) => {
    c.redundancies.forEach((rid) => {
      if (validIds.includes(rid)) {
        const pairKey = [c.id, rid].sort().join("|");
        if (!seenRedundancyPairs.has(pairKey)) {
          seenRedundancyPairs.add(pairKey);
          const other = COMPOUND_INTEL[rid];
          redundancies.push({
            type: "explicit",
            axisLabels: c.axes
              .filter((a) => other.axes.some((oa) => oa.axis === a.axis))
              .map((a) => AXES[a.axis]?.label || a.axis),
            compounds: [c.name, other.name],
            severity: "moderate",
            message: `${c.name} and ${other.name} target the same primary axis. Effects are not strictly additive — receptor desensitization or pituitary blunting is possible over extended dual stimulation. If both are desired, run at reduced doses on separate timing or alternating days.`,
          });
        }
      }
    });
  });

  // -------- SYNERGIES --------
  const synergies = [];
  const seenSynergyPairs = new Set();

  compounds.forEach((c) => {
    c.synergies.forEach((sid) => {
      if (validIds.includes(sid)) {
        const pairKey = [c.id, sid].sort().join("|");
        if (!seenSynergyPairs.has(pairKey)) {
          seenSynergyPairs.add(pairKey);
          synergies.push({
            compounds: [c.name, COMPOUND_INTEL[sid].name],
            message: getSynergyMessage(c.id, sid),
          });
        }
      }
    });
  });

  // -------- SUPPORT REQUIRED --------
  const supportRequired = [];
  const seenSupport = new Set();
  compounds.forEach((c) => {
    c.supportTriggers.forEach((sid) => {
      if (!seenSupport.has(sid) && SUPPORT_DEFS[sid]) {
        seenSupport.add(sid);
        supportRequired.push({
          id: sid,
          ...SUPPORT_DEFS[sid],
          triggeredBy: c.name,
        });
      }
    });
  });

  // -------- CONTRAINDICATIONS --------
  const contraindications = [];

  compounds.forEach((c) => {
    c.contraindications.forEach((contra) => {
      if (matchesContraindication(contra, userProfile)) {
        contraindications.push({
          compound: c.id,
          compoundName: c.name,
          ...contra,
        });
      }
    });
  });

  // Stack-level: duplicate-class detection
  const glpCount = compounds.filter((c) =>
    c.axes.some((a) => a.axis === "metabolic" && a.weight >= 0.9)
  ).length;
  if (glpCount > 1) {
    contraindications.push({
      compound: null,
      compoundName: "Stack-level",
      type: "duplicate_class",
      severity: "critical",
      message:
        "Multiple GLP-class agonists detected in this stack. These should never be combined — receptor saturation, severe GI side effects, and dangerous hypoglycemia risk. Select one GLP compound only.",
    });
  }

  // -------- SAFETY SCORE --------
  const sumRisk = (key) => compounds.reduce((sum, c) => sum + (c.risk[key] || 0), 0);

  const suppression = clamp(100 - sumRisk("suppression") * 100, 0, 100);
  const liver = clamp(100 - sumRisk("liver") * 100, 0, 100);
  const cardio = clamp(100 - sumRisk("cardio") * 100, 0, 100);

  let interactionPenalty = redundancies.length * 8;
  contraindications.forEach((c) => {
    if (c.severity === "critical") interactionPenalty += 40;
    else if (c.severity === "moderate") interactionPenalty += 15;
    else interactionPenalty += 5;
  });
  const interaction = clamp(100 - interactionPenalty, 0, 100);

  const overall = Math.round((suppression + liver + cardio + interaction) / 4);

  const isBlocked = contraindications.some((c) => c.severity === "critical");

  const activeAxes = Object.keys(axisCoverage)
    .map((a) => AXES[a]?.short || a)
    .join(" + ");
  const riskLabel =
    overall >= 85
      ? "Low"
      : overall >= 70
      ? "Low–Moderate"
      : overall >= 55
      ? "Moderate"
      : overall >= 40
      ? "Mod–High"
      : "High";

  return {
    compounds,
    axisCoverage,
    redundancies,
    synergies,
    supportRequired,
    contraindications,
    safetyScore: { overall, suppression, liver, cardio, interaction },
    isBlocked,
    summary: {
      axes: activeAxes,
      risk: riskLabel,
      compoundCount: compounds.length,
    },
  };
}

function matchesContraindication(contra, userProfile) {
  if (contra.type === "body_fat_min") {
    const sex = (userProfile.sex || "male").toLowerCase();
    const threshold = sex === "female" ? contra.female : contra.male;
    if (typeof userProfile.bodyFat === "number" && userProfile.bodyFat < threshold) {
      return true;
    }
  }
  if (contra.type === "hypertension") {
    return userProfile.hypertension === true ? true : false;
  }
  return false;
}

function getSynergyMessage(idA, idB) {
  const key = [idA, idB].sort().join("|");
  const messages = {
    "bpc157|tb500":
      "The canonical recovery pairing. BPC-157 drives local angiogenesis and direct tissue repair; TB-500 mobilizes stem cells systemically and conditions the body-wide healing environment. Together they cover both ends of the repair pathway with no receptor overlap.",
    "bpc157|ghkcu":
      "BPC-157 drives angiogenesis at injury sites; GHK-Cu adds collagen synthesis and ECM reconstruction. Complementary repair mechanisms operating on different cellular targets.",
    "bpc157|ipacjc":
      "Recovery stack: connective tissue repair (BPC-157) under elevated GH/IGF-1 conditions (Ipamorelin/CJC). The GH pulse amplifies the local repair signal — particularly effective during high-load training phases.",
    "ipacjc|tb500":
      "Sleep-window recovery enhancement. TB-500 conditions systemic healing; the GH pulse from Ipamorelin/CJC accelerates the repair processes TB-500 enables.",
    "ipacjc|semaglutide":
      "GLP-1 fat loss with lean mass preservation. Ipamorelin/CJC adds the GH/IGF-1 signal that counteracts the lean mass loss typical of standalone GLP-1 protocols. This is the most important pairing for the GLP-1 demographic.",
    "ipacjc|retatrutide":
      "Aggressive fat loss with GH-axis muscle preservation. The most powerful GLP agent paired with GH peptide support. Resistance training and protein intake remain non-negotiable.",
    "ghkcu|tesamorelin":
      "Visceral fat reduction (Tesamorelin) with skin quality support (GHK-Cu). Tesamorelin's fat loss can reveal skin laxity; GHK-Cu actively rebuilds collagen and ECM in parallel.",
  };
  return (
    messages[key] ||
    "These compounds operate on complementary biological mechanisms with documented synergy in research and protocol design."
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ============================================================
// VISUAL COMPONENTS
// ============================================================

const ACCENT = "#22d68a";
const BG_CARD = "rgba(255,255,255,0.04)";
const BG_CARD_2 = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_BRIGHT = "rgba(255,255,255,0.15)";
const TEXT = "#e8e8e8";
const TEXT_DIM = "rgba(255,255,255,0.55)";
const TEXT_FAINT = "rgba(255,255,255,0.35)";
const RED = "#ef4444";
const AMBER = "#f59e0b";

function scoreColor(score) {
  if (score >= 85) return ACCENT;
  if (score >= 65) return "#a3e635";
  if (score >= 45) return AMBER;
  return RED;
}

export default function StackIntelligence({ stackIds = [], userProfile = {}, onRemoveCompound }) {
  const analysis = useMemo(
    () => analyzeStack(stackIds, userProfile),
    [stackIds, userProfile]
  );

  if (analysis.compounds.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <ArchitectureHeader analysis={analysis} />

      {analysis.contraindications.length > 0 && (
        <ContraindicationBanner
          contraindications={analysis.contraindications}
          onRemoveCompound={onRemoveCompound}
        />
      )}

      <SafetyScoreSection score={analysis.safetyScore} />

      <AxisMap analysis={analysis} />

      {(analysis.redundancies.length > 0 || analysis.synergies.length > 0) && (
        <InteractionsSection
          redundancies={analysis.redundancies}
          synergies={analysis.synergies}
        />
      )}

      {analysis.supportRequired.length > 0 && (
        <SupportLayer supportRequired={analysis.supportRequired} />
      )}

      <DesignNotes compounds={analysis.compounds} />

      <Disclaimer />
    </div>
  );
}

function ArchitectureHeader({ analysis }) {
  const { summary, safetyScore } = analysis;
  return (
    <div style={styles.archHeader}>
      <div style={styles.archHeaderTop}>
        <div style={styles.archHeaderLabel}>STACK ARCHITECTURE</div>
        <div style={{ ...styles.riskBadge, color: scoreColor(safetyScore.overall) }}>
          Risk: {summary.risk}
        </div>
      </div>
      <div style={styles.archHeaderAxes}>
        <span style={styles.archHeaderAxesLabel}>Axes</span>
        <span style={styles.archHeaderAxesValue}>{summary.axes}</span>
      </div>
      <div style={styles.archHeaderMeta}>
        {summary.compoundCount} compound{summary.compoundCount === 1 ? "" : "s"} · Live analysis
      </div>
    </div>
  );
}

function ContraindicationBanner({ contraindications, onRemoveCompound }) {
  const critical = contraindications.filter((c) => c.severity === "critical");
  const moderate = contraindications.filter((c) => c.severity !== "critical");

  return (
    <div style={styles.contraSection}>
      {critical.length > 0 && (
        <div style={styles.contraBlockBox}>
          <div style={styles.contraBlockHeader}>
            <span style={styles.contraBlockIcon}>⨯</span>
            <span>
              STACK BLOCKED — {critical.length} CRITICAL CONTRAINDICATION
              {critical.length === 1 ? "" : "S"}
            </span>
          </div>
          {critical.map((contra, i) => (
            <div key={i} style={styles.contraItem}>
              <div style={styles.contraItemHeader}>
                <span style={styles.contraItemCompound}>{contra.compoundName}</span>
                {contra.compound && onRemoveCompound && (
                  <button
                    style={styles.contraRemoveBtn}
                    onClick={() => onRemoveCompound(contra.compound)}
                  >
                    Remove from stack
                  </button>
                )}
              </div>
              <div style={styles.contraItemMessage}>{contra.message}</div>
            </div>
          ))}
          <div style={styles.contraBlockFooter}>
            Resolve all critical contraindications to proceed with this stack.
          </div>
        </div>
      )}

      {moderate.length > 0 && (
        <div style={styles.contraWarnBox}>
          <div style={styles.contraWarnHeader}>
            <span style={styles.contraWarnIcon}>!</span>
            <span>
              {moderate.length} caution flag{moderate.length === 1 ? "" : "s"}
            </span>
          </div>
          {moderate.map((contra, i) => (
            <div key={i} style={styles.contraWarnItem}>
              <span style={styles.contraWarnCompound}>{contra.compoundName}:</span>{" "}
              {contra.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SafetyScoreSection({ score }) {
  const overallColor = scoreColor(score.overall);

  return (
    <div style={styles.scoreBox}>
      <div style={styles.scoreLeft}>
        <div style={styles.scoreLabel}>SAFETY SCORE</div>
        <div style={{ ...styles.scoreNumber, color: overallColor }}>{score.overall}</div>
        <div style={styles.scoreOutOf}>/ 100</div>
      </div>
      <div style={styles.scoreRight}>
        <ScoreBar label="Suppression" value={score.suppression} />
        <ScoreBar label="Liver Load" value={score.liver} />
        <ScoreBar label="Cardiovascular" value={score.cardio} />
        <ScoreBar label="Interaction Risk" value={score.interaction} />
      </div>
    </div>
  );
}

function ScoreBar({ label, value }) {
  const color = scoreColor(value);
  return (
    <div style={styles.scoreBarRow}>
      <div style={styles.scoreBarLabel}>{label}</div>
      <div style={styles.scoreBarTrack}>
        <div
          style={{
            ...styles.scoreBarFill,
            width: `${value}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div style={{ ...styles.scoreBarValue, color }}>{value}</div>
    </div>
  );
}

function AxisMap({ analysis }) {
  const { axisCoverage } = analysis;
  const orderedAxes = Object.entries(axisCoverage).sort(
    (a, b) => b[1].totalWeight - a[1].totalWeight
  );

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Biological Axis Coverage</div>
        <div style={styles.sectionSubtitle}>
          Where this stack acts on the body. Multiple compounds on one axis = redundancy.
        </div>
      </div>

      <div style={styles.axisRack}>
        {orderedAxes.map(([axisKey, data]) => {
          const axis = AXES[axisKey] || { label: axisKey, color: TEXT_DIM, short: axisKey };
          const isOverSaturated = data.totalWeight > 1.5;
          const fillPct = Math.min(100, data.totalWeight * 60);

          return (
            <div key={axisKey} style={styles.axisRow}>
              <div style={styles.axisRowHeader}>
                <div style={styles.axisRowLeft}>
                  <span style={{ ...styles.axisDot, backgroundColor: axis.color }} />
                  <span style={styles.axisLabel}>{axis.label}</span>
                  <span style={styles.axisDesc}>{axis.desc}</span>
                </div>
                <div
                  style={{
                    ...styles.axisStrength,
                    color: isOverSaturated ? AMBER : TEXT_FAINT,
                  }}
                >
                  {isOverSaturated ? "SATURATED" : `${Math.round(data.totalWeight * 100)}%`}
                </div>
              </div>

              <div style={styles.axisTrack}>
                <div
                  style={{
                    ...styles.axisFill,
                    width: `${fillPct}%`,
                    background: `linear-gradient(90deg, ${axis.color}55, ${axis.color}cc)`,
                  }}
                />
              </div>

              <div style={styles.axisCompounds}>
                {data.compounds.map((c, i) => (
                  <div key={i} style={styles.axisCompoundNode}>
                    <div
                      style={{
                        ...styles.axisCompoundChip,
                        borderColor: axis.color + "88",
                      }}
                    >
                      <span style={styles.axisCompoundName}>{c.name}</span>
                      <span style={styles.axisCompoundWeight}>{Math.round(c.weight * 100)}%</span>
                    </div>
                    <div style={styles.axisCompoundMechanism}>{c.mechanism}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractionsSection({ redundancies, synergies }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Compound Interactions</div>
        <div style={styles.sectionSubtitle}>
          How compounds reinforce or compete with each other.
        </div>
      </div>

      {synergies.length > 0 && (
        <div style={styles.interactionGroup}>
          <div style={styles.interactionGroupHeader}>
            <span style={{ ...styles.interactionTag, color: ACCENT, borderColor: ACCENT + "66" }}>
              SYNERGY
            </span>
            <span style={styles.interactionGroupCount}>{synergies.length}</span>
          </div>
          {synergies.map((syn, i) => (
            <div key={i} style={styles.interactionItem}>
              <div style={styles.interactionItemPair}>{syn.compounds.join("  +  ")}</div>
              <div style={styles.interactionItemMsg}>{syn.message}</div>
            </div>
          ))}
        </div>
      )}

      {redundancies.length > 0 && (
        <div style={styles.interactionGroup}>
          <div style={styles.interactionGroupHeader}>
            <span style={{ ...styles.interactionTag, color: AMBER, borderColor: AMBER + "66" }}>
              REDUNDANCY
            </span>
            <span style={styles.interactionGroupCount}>{redundancies.length}</span>
          </div>
          {redundancies.map((red, i) => (
            <div key={i} style={styles.interactionItem}>
              <div style={styles.interactionItemPair}>
                {red.compounds.join("  ⇄  ")}
                {red.axisLabels?.length > 0 && (
                  <span style={styles.interactionAxisTag}>{red.axisLabels.join(", ")}</span>
                )}
              </div>
              <div style={styles.interactionItemMsg}>{red.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupportLayer({ supportRequired }) {
  const grouped = supportRequired.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Support Layer</div>
        <div style={styles.sectionSubtitle}>
          Compounds, monitoring, and lifestyle requirements triggered by this stack.
        </div>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={styles.supportGroup}>
          <div style={styles.supportGroupHeader}>{category}</div>
          {items.map((item, i) => (
            <div key={i} style={styles.supportCard}>
              <div style={styles.supportCardHeader}>
                <div style={styles.supportCardLabel}>{item.label}</div>
                <div
                  style={{
                    ...styles.supportUrgency,
                    color:
                      item.urgency === "required"
                        ? RED
                        : item.urgency === "recommended"
                        ? AMBER
                        : TEXT_FAINT,
                  }}
                >
                  {item.urgency}
                </div>
              </div>
              <div style={styles.supportCardDetail}>{item.detail}</div>
              <div style={styles.supportCardTrigger}>Triggered by {item.triggeredBy}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DesignNotes({ compounds }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Role in Stack</div>
        <div style={styles.sectionSubtitle}>What each compound contributes to the protocol.</div>
      </div>
      <div style={styles.designNotes}>
        {compounds.map((c, i) => (
          <div key={i} style={styles.designNoteRow}>
            <div style={styles.designNoteCompound}>{c.name}</div>
            <div style={styles.designNoteText}>{c.designNote}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div style={styles.disclaimer}>
      For research and educational purposes only. Not medical advice, diagnosis, or treatment
      recommendations. Consult a licensed healthcare provider before initiating any peptide
      protocol.
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    color: TEXT,
    width: "100%",
    marginBottom: 12,
  },

  archHeader: {
    padding: "18px 20px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
    border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 12,
  },
  archHeaderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  archHeaderLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: ACCENT,
  },
  riskBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    border: `1px solid currentColor`,
    borderRadius: 999,
    letterSpacing: "0.05em",
  },
  archHeaderAxes: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 8,
  },
  archHeaderAxesLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.12em",
    color: TEXT_FAINT,
    textTransform: "uppercase",
  },
  archHeaderAxesValue: {
    fontSize: 17,
    fontWeight: 600,
    color: TEXT,
    letterSpacing: "-0.01em",
  },
  archHeaderMeta: {
    fontSize: 12,
    color: TEXT_DIM,
  },

  contraSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  contraBlockBox: {
    border: `1px solid ${RED}`,
    backgroundColor: "rgba(239,68,68,0.06)",
    borderRadius: 12,
    overflow: "hidden",
  },
  contraBlockHeader: {
    padding: "12px 16px",
    backgroundColor: RED,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  contraBlockIcon: {
    fontSize: 18,
    lineHeight: 1,
    fontWeight: 700,
  },
  contraItem: {
    padding: "14px 16px",
    borderBottom: `1px solid rgba(239,68,68,0.2)`,
  },
  contraItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
    flexWrap: "wrap",
  },
  contraItemCompound: {
    fontSize: 14,
    fontWeight: 600,
    color: TEXT,
  },
  contraRemoveBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: RED,
    backgroundColor: "transparent",
    border: `1px solid ${RED}`,
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  contraItemMessage: {
    fontSize: 13,
    color: "#fca5a5",
    lineHeight: 1.5,
  },
  contraBlockFooter: {
    padding: "10px 16px",
    fontSize: 11,
    color: "#fca5a5",
    letterSpacing: "0.04em",
    backgroundColor: "rgba(239,68,68,0.04)",
  },

  contraWarnBox: {
    border: `1px solid rgba(245,158,11,0.4)`,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderRadius: 10,
    padding: 14,
  },
  contraWarnHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
    color: AMBER,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  contraWarnIcon: {
    fontSize: 16,
    fontWeight: 700,
  },
  contraWarnItem: {
    fontSize: 13,
    color: "#fcd34d",
    lineHeight: 1.5,
    paddingTop: 6,
  },
  contraWarnCompound: {
    fontWeight: 600,
    color: AMBER,
  },

  scoreBox: {
    display: "flex",
    gap: 20,
    padding: 20,
    backgroundColor: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  scoreLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 110,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: TEXT_FAINT,
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  scoreOutOf: {
    fontSize: 13,
    color: TEXT_FAINT,
    marginTop: 4,
  },
  scoreRight: {
    flex: 1,
    minWidth: 200,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  scoreBarRow: {
    display: "grid",
    gridTemplateColumns: "100px 1fr 32px",
    alignItems: "center",
    gap: 10,
  },
  scoreBarLabel: {
    fontSize: 11,
    color: TEXT_DIM,
    fontWeight: 500,
  },
  scoreBarTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 300ms ease, background-color 300ms ease",
  },
  scoreBarValue: {
    fontSize: 11,
    fontWeight: 600,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },

  section: {
    padding: 20,
    backgroundColor: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: TEXT,
    marginBottom: 4,
    letterSpacing: "-0.01em",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.5,
  },

  axisRack: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  axisRow: {
    paddingBottom: 14,
    borderBottom: `1px solid ${BORDER}`,
  },
  axisRowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  axisRowLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    flex: 1,
    minWidth: 0,
  },
  axisDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  },
  axisLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT,
  },
  axisDesc: {
    fontSize: 11,
    color: TEXT_FAINT,
  },
  axisStrength: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    fontVariantNumeric: "tabular-nums",
  },
  axisTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 10,
  },
  axisFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 400ms ease",
  },
  axisCompounds: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  axisCompoundNode: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  axisCompoundChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 10px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 12,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  axisCompoundName: {
    fontWeight: 600,
    color: TEXT,
  },
  axisCompoundWeight: {
    fontSize: 10,
    color: TEXT_DIM,
    fontVariantNumeric: "tabular-nums",
  },
  axisCompoundMechanism: {
    fontSize: 11,
    color: TEXT_FAINT,
    paddingLeft: 12,
    lineHeight: 1.4,
  },

  interactionGroup: {
    marginBottom: 14,
  },
  interactionGroupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  interactionTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    padding: "3px 8px",
    border: "1px solid",
    borderRadius: 4,
  },
  interactionGroupCount: {
    fontSize: 11,
    color: TEXT_FAINT,
    fontVariantNumeric: "tabular-nums",
  },
  interactionItem: {
    padding: 12,
    backgroundColor: BG_CARD_2,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    marginBottom: 8,
  },
  interactionItemPair: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  interactionAxisTag: {
    fontSize: 10,
    color: TEXT_FAINT,
    padding: "2px 6px",
    border: `1px solid ${BORDER_BRIGHT}`,
    borderRadius: 4,
    fontWeight: 500,
    letterSpacing: "0.05em",
  },
  interactionItemMsg: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.55,
  },

  supportGroup: {
    marginBottom: 14,
  },
  supportGroupHeader: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: TEXT_FAINT,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  supportCard: {
    padding: 14,
    backgroundColor: BG_CARD_2,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    marginBottom: 8,
  },
  supportCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  supportCardLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT,
  },
  supportUrgency: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  supportCardDetail: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.55,
    marginBottom: 8,
  },
  supportCardTrigger: {
    fontSize: 11,
    color: TEXT_FAINT,
    fontStyle: "italic",
  },

  designNotes: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  designNoteRow: {
    paddingBottom: 12,
    borderBottom: `1px solid ${BORDER}`,
  },
  designNoteCompound: {
    fontSize: 13,
    fontWeight: 600,
    color: ACCENT,
    marginBottom: 4,
  },
  designNoteText: {
    fontSize: 12,
    color: TEXT_DIM,
    lineHeight: 1.55,
  },

  disclaimer: {
    fontSize: 11,
    color: TEXT_FAINT,
    lineHeight: 1.5,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.02)",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    fontStyle: "italic",
  },
};

export { analyzeStack, COMPOUND_INTEL, AXES, SUPPORT_DEFS };
