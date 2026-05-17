/**
 * ============================================================
 * ALKI — PEPTIDE MODELING & BODY COMPOSITION ENGINE
 * ============================================================
 *
 * Pure calculation module. No UI. No React. Fully deterministic.
 *
 * Consumes the same compound schema as AlkiApp.jsx:
 *   effects: { bf, muscle, skin, recovery }
 *
 * And the same user profile from Onboarding:
 *   { sex, age, heightFt, heightIn, weight, bodyFat, goals, adv }
 *
 * USAGE:
 *   import { buildProfile, simulate, analyzeProjection } from './lib/peptideEngine';
 *
 *   const profile = buildProfile(onboardingProfile, modelInputs);
 *   const result  = simulate(profile, selectedCompounds, COMPOUNDS, weeks);
 *   // result.timeline  → [{ week, weight, bf, leanMass, fatMass, bmr, tdee }]
 *   // result.summary   → { totalFatLoss, totalMuscleGain, ... }
 *   // result.baseline  → same shape, no compounds (diet + training only)
 *
 * ============================================================
 */

// ============================================================
// UNIT CONVERSIONS
// ============================================================

export function lbsToKg(lbs) { return lbs * 0.453592; }
export function kgToLbs(kg)  { return kg * 2.20462; }
export function feetInchesToCm(ft, inches) { return (ft * 12 + inches) * 2.54; }

// ============================================================
// BODY COMPOSITION FORMULAS
// ============================================================

/**
 * Katch-McArdle BMR — uses lean body mass (more accurate than Mifflin-St Jeor when BF% is known)
 */
export function calcBMR(weightKg, bodyFatPct) {
  const lbm = weightKg * (1 - bodyFatPct / 100);
  return 370 + 21.6 * lbm;
}

/**
 * Mifflin-St Jeor BMR — fallback when BF% is unreliable
 */
export function calcBMR_MSJ(weightKg, heightCm, age, sex) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

const ACTIVITY_MULT = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

/**
 * TDEE = BMR × activity multiplier
 */
export function calcTDEE(bmr, activityLevel) {
  return bmr * (ACTIVITY_MULT[activityLevel] || 1.55);
}

/**
 * Fat-Free Mass Index — normalized lean mass metric
 * Natural ceiling ~25, elite natural ~25-26, >26 almost certainly enhanced
 */
export function calcFFMI(leanMassKg, heightCm) {
  const h = heightCm / 100;
  return leanMassKg / (h * h) + 6.1 * (1.8 - h);
}

/**
 * Body Surface Area (DuBois) — useful for dose scaling
 */
export function calcBSA(weightKg, heightCm) {
  return 0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725);
}

/**
 * Protein target (g/day) based on lean mass and goal
 */
export function calcProteinTarget(leanMassKg, primaryGoal, trainingIntensity) {
  const multipliers = {
    fat_loss: 2.0, muscle: 2.2, recovery: 1.8, recomp: 2.0,
    anti_aging: 1.6, performance: 2.0, skin: 1.6, energy: 1.8,
  };
  let m = multipliers[primaryGoal] || 1.8;
  if (trainingIntensity === "high") m += 0.2;
  return Math.round(leanMassKg * m);
}

/**
 * Caloric target based on TDEE and goal
 */
export function calcCaloricTarget(tdee, primaryGoal, aggressiveness) {
  const adj = {
    fat_loss:     { conservative: -300, moderate: -500, aggressive: -750 },
    muscle:       { conservative: 200,  moderate: 350,  aggressive: 500 },
    recovery:     { conservative: 0,    moderate: 100,  aggressive: 200 },
    recomp:       { conservative: -100, moderate: 0,    aggressive: 100 },
    anti_aging:   { conservative: -100, moderate: 0,    aggressive: 0 },
    performance:  { conservative: 100,  moderate: 200,  aggressive: 300 },
    skin:         { conservative: 0,    moderate: 0,    aggressive: 0 },
    energy:       { conservative: 0,    moderate: 100,  aggressive: 200 },
  };
  const delta = adj[primaryGoal]?.[aggressiveness] || 0;
  return Math.round(tdee + delta);
}

/**
 * Waist-to-height ratio estimate from body fat %
 * (rough heuristic — used for avatar and health scoring)
 */
export function estimateWaistToHeight(bodyFatPct, sex) {
  const base = sex === "male" ? 0.38 : 0.36;
  return base + (bodyFatPct / 100) * 0.55;
}

// ============================================================
// BUILD FULL PROFILE FROM ONBOARDING + MODEL INPUTS
// ============================================================

/**
 * Takes the raw onboarding profile from AlkiApp and the modeler's
 * extended inputs, returns a fully computed profile.
 *
 * @param {Object} onboarding  — { sex, age, heightFt, heightIn, weight, bodyFat, goals, adv }
 * @param {Object} model       — { activityLevel, trainingExperience, trainingFrequency,
 *                                  sleepQuality, caloricContext, aggressiveness, riskTolerance,
 *                                  peptideExperience, hasInjury, budget }
 */
export function buildProfile(onboarding, model = {}) {
  const sex       = onboarding.sex || "male";
  const age       = parseInt(onboarding.age) || 30;
  const heightCm  = feetInchesToCm(parseInt(onboarding.heightFt) || 5, parseInt(onboarding.heightIn) || 10);
  const weightLbs = parseFloat(onboarding.weight) || 185;
  const weightKg  = lbsToKg(weightLbs);
  const bodyFat   = parseFloat(onboarding.bodyFat) || 20;
  const goals     = onboarding.goals || [];

  const fatMassKg  = weightKg * (bodyFat / 100);
  const leanMassKg = weightKg - fatMassKg;

  const activityLevel      = model.activityLevel      || "moderate";
  const trainingExperience = model.trainingExperience  || "intermediate";
  const trainingFrequency  = model.trainingFrequency   || 4;
  const sleepQuality       = model.sleepQuality        || "average";
  const caloricContext     = model.caloricContext       || "deficit";
  const aggressiveness     = model.aggressiveness       || "moderate";

  const bmr    = calcBMR(weightKg, bodyFat);
  const bmrMSJ = calcBMR_MSJ(weightKg, heightCm, age, sex);
  const tdee   = calcTDEE(bmr, activityLevel);
  const ffmi   = calcFFMI(leanMassKg, heightCm);
  const bsa    = calcBSA(weightKg, heightCm);

  const primaryGoal   = goals[0] || "fat_loss";
  const proteinTarget = calcProteinTarget(leanMassKg, primaryGoal, trainingFrequency >= 5 ? "high" : "moderate");
  const caloricTarget = calcCaloricTarget(tdee, primaryGoal, aggressiveness);

  return {
    // Raw inputs
    sex, age, heightCm, weightLbs, weightKg, bodyFat, goals,
    activityLevel, trainingExperience, trainingFrequency,
    sleepQuality, caloricContext, aggressiveness,
    // Computed body comp
    fatMassKg, leanMassKg, bmr, bmrMSJ, tdee, ffmi, bsa,
    proteinTarget, caloricTarget,
    // Flags
    fatMassLbs: kgToLbs(fatMassKg),
    leanMassLbs: kgToLbs(leanMassKg),
    bfCategory: bodyFat < 10 ? "Competition" : bodyFat < 15 ? "Athletic" : bodyFat < 20 ? "Fit" : bodyFat < 25 ? "Average" : bodyFat < 30 ? "Above Average" : "Elevated",
    ffmiCategory: ffmi > 25 ? "Elite" : ffmi > 22 ? "Athletic" : ffmi > 19 ? "Average" : "Below Average",
  };
}

// ============================================================
// NATURAL CHANGE RATES (no compounds — diet + training only)
// ============================================================

/**
 * Natural muscle gain rate (kg/week) — Alan Aragon model
 * Adjusted for training experience, frequency, caloric context, sleep, age
 */
function naturalMuscleRate(profile) {
  const rates = { beginner: 0.015, intermediate: 0.0075, advanced: 0.003 };
  let weeklyKg = (profile.weightKg * (rates[profile.trainingExperience] || 0.0075)) / 4.33;

  // Training frequency scaling
  weeklyKg *= Math.min(profile.trainingFrequency / 5, 1.2);

  // Caloric context — can't build optimally in a deficit
  if (profile.caloricContext === "deficit")      weeklyKg *= 0.3;
  if (profile.caloricContext === "maintenance")  weeklyKg *= 0.6;

  // Sleep quality
  if (profile.sleepQuality === "poor")      weeklyKg *= 0.7;
  if (profile.sleepQuality === "excellent") weeklyKg *= 1.1;

  // Age decline — GH and testosterone drop with age
  if (profile.age > 35) weeklyKg *= 0.9;
  if (profile.age > 45) weeklyKg *= 0.8;
  if (profile.age > 55) weeklyKg *= 0.65;

  return weeklyKg;
}

/**
 * Natural fat loss rate (kg/week) — scaled by current BF%
 * Higher BF% can sustain larger deficits safely
 */
function naturalFatLossRate(profile, currentBF) {
  if (profile.caloricContext === "surplus")      return -0.08; // slight fat gain
  if (profile.caloricContext === "maintenance")  return 0;

  // Base rate by BF range
  let weeklyKg;
  if      (currentBF > 30) weeklyKg = 0.70;
  else if (currentBF > 25) weeklyKg = 0.55;
  else if (currentBF > 20) weeklyKg = 0.45;
  else if (currentBF > 15) weeklyKg = 0.35;
  else                     weeklyKg = 0.25;

  // Aggressiveness modifier
  if (profile.aggressiveness === "conservative") weeklyKg *= 0.7;
  if (profile.aggressiveness === "aggressive")   weeklyKg *= 1.3;

  return weeklyKg;
}

// ============================================================
// COMPOUND EFFECT MODELING
// ============================================================

/**
 * Compound onset/peak effect curve.
 * Most compounds don't hit full effect day 1 — there's an onset ramp.
 * Returns 0→1 multiplier for a given week.
 *
 * onset: weeks before meaningful effect begins
 * peak:  weeks to reach full effect
 */
function getOnsetPeak(compound) {
  // Use CycleTimeline CYCLE_PROFILES onset heuristics, hardcoded here
  // to keep this module dependency-free.
  const profiles = {
    bpc157:      { onset: 1, peak: 4 },
    tb500:       { onset: 2, peak: 5 },
    ipacjc:      { onset: 2, peak: 8 },
    tesamorelin: { onset: 4, peak: 12 },
    semaglutide: { onset: 4, peak: 16 },
    retatrutide: { onset: 4, peak: 20 },
    ghkcu:       { onset: 3, peak: 6 },
    pt141:       { onset: 0, peak: 1 },
  };
  return profiles[compound.id] || { onset: 2, peak: 6 };
}

function weekEffectMultiplier(compound, week) {
  const { onset, peak } = getOnsetPeak(compound);
  if (week < onset) return (week / Math.max(onset, 0.5)) * 0.3;
  if (week < peak) return 0.3 + ((week - onset) / (peak - onset)) * 0.7;
  return week > peak * 2 ? 0.9 : 1.0;
}

/**
 * Convert the existing `effects` schema into per-week kg rates.
 *
 * The AlkiApp effects are 12-week CUMULATIVE magnitudes:
 *   bf:       percentage points of body fat change over 12 weeks (neg = loss)
 *   muscle:   relative muscle gain/loss magnitude (scale: 0–3)
 *   skin:     skin quality (0–4)
 *   recovery: recovery acceleration (0–5)
 *
 * We convert bf and muscle into kg/week values.
 */
function compoundWeeklyRates(compound, profile) {
  const e = compound.effects;
  const weightKg = profile.weightKg;

  // BF effect: e.bf is percentage points over 12 weeks
  // Convert to kg fat per week: (bf_pct_change / 100) × bodyweight / 12
  const fatLossKgPerWeek = Math.abs(e.bf) * weightKg / 100 / 12;
  const fatDirection = e.bf < 0 ? 1 : e.bf > 0 ? -1 : 0; // positive = losing fat

  // Muscle effect: e.muscle is a relative scale
  // Convert to kg lean mass per week: scale × 0.03 kg/week (calibrated so
  // ipacjc at 3 ≈ 0.09 kg/week ≈ ~1 kg lean over 12 weeks at peak)
  const muscleKgPerWeek = e.muscle * 0.03;

  // Recovery multiplier: recovery value / 10 = bonus to natural muscle gain
  // e.g., BPC-157 at recovery=5 → 50% boost to natural muscle gain rate
  const recoveryMultiplier = 1 + (e.recovery || 0) * 0.10;

  // GH-axis compounds get a small additional fat loss + muscle gain bonus
  const isGHAxis = compound.category === "Growth Hormone" || compound.id === "tesamorelin";
  const ghFatBonus   = isGHAxis ? 0.02 : 0;
  const ghMusclBonus = isGHAxis ? 0.01 : 0;

  // Appetite suppression for GLP-1 class — additional fat loss in deficit
  const isGLP = compound.category === "Weight Loss";
  const appetiteBonus = isGLP && profile.caloricContext === "deficit" ? 0.08 : 0;

  return {
    fatLossKgPerWeek: fatLossKgPerWeek * fatDirection + ghFatBonus + appetiteBonus,
    muscleKgPerWeek: muscleKgPerWeek + ghMusclBonus,
    recoveryMultiplier,
    isGLP,
  };
}

// ============================================================
// SYNERGY DETECTION (simplified — uses same IDs as StackIntelligence)
// ============================================================

const SYNERGY_PAIRS = {
  "bpc157|tb500": 1.6,
  "bpc157|ipacjc": 1.2,
  "bpc157|ghkcu": 1.3,
  "ipacjc|tb500": 1.15,
  "ipacjc|semaglutide": 1.3,
  "ipacjc|retatrutide": 1.35,
  "ghkcu|tesamorelin": 1.15,
  "ghkcu|tb500": 1.25,
  "ghkcu|ipacjc": 1.3,
};

function getSynergyMultiplier(idA, idB) {
  const key = [idA, idB].sort().join("|");
  return SYNERGY_PAIRS[key] || 1;
}

// ============================================================
// MAIN SIMULATION ENGINE
// ============================================================

/**
 * Simulate body composition changes week-by-week.
 *
 * @param {Object}   profile           — from buildProfile()
 * @param {string[]} selectedIds       — array of compound IDs
 * @param {Object[]} compoundCatalog   — full COMPOUNDS array from AlkiApp
 * @param {number}   protocolWeeks     — duration (default 12)
 * @returns {{ timeline, baseline, summary, weeklyDetail }}
 */
export function simulate(profile, selectedIds, compoundCatalog, protocolWeeks = 12) {
  const compounds = selectedIds
    .map(id => compoundCatalog.find(c => c.id === id))
    .filter(Boolean);

  // ── Run TWO simulations: with compounds and baseline (no compounds) ──
  const timeline = runSim(profile, compounds, protocolWeeks);
  const baseline = runSim(profile, [], protocolWeeks);

  // ── Summary stats ──
  const t0 = timeline[0], tN = timeline[timeline.length - 1];
  const b0 = baseline[0], bN = baseline[baseline.length - 1];

  const summary = {
    // Absolute changes
    totalFatLossKg:    +(t0.fatMassKg - tN.fatMassKg).toFixed(2),
    totalFatLossLbs:   +kgToLbs(t0.fatMassKg - tN.fatMassKg).toFixed(1),
    totalMuscleGainKg: +(tN.leanMassKg - t0.leanMassKg).toFixed(2),
    totalMuscleGainLbs:+kgToLbs(tN.leanMassKg - t0.leanMassKg).toFixed(1),
    totalWeightChangeKg:  +(tN.weightKg - t0.weightKg).toFixed(2),
    totalWeightChangeLbs: +kgToLbs(tN.weightKg - t0.weightKg).toFixed(1),
    startBF: t0.bf,
    endBF: tN.bf,
    bfReduction: +(t0.bf - tN.bf).toFixed(1),
    startWeightLbs: +kgToLbs(t0.weightKg).toFixed(1),
    endWeightLbs: +kgToLbs(tN.weightKg).toFixed(1),
    startFFMI: t0.ffmi,
    endFFMI: tN.ffmi,
    // Rates
    avgWeeklyFatLossKg:   +((t0.fatMassKg - tN.fatMassKg) / protocolWeeks).toFixed(3),
    avgWeeklyMuscleGainKg:+((tN.leanMassKg - t0.leanMassKg) / protocolWeeks).toFixed(3),
    // Compound edge (delta beyond what diet + training alone would do)
    compoundEdgeFatLbs:   +kgToLbs((t0.fatMassKg - tN.fatMassKg) - (b0.fatMassKg - bN.fatMassKg)).toFixed(1),
    compoundEdgeMuscleLbs:+kgToLbs((tN.leanMassKg - t0.leanMassKg) - (bN.leanMassKg - b0.leanMassKg)).toFixed(1),
    // Baseline comparison
    baselineFatLossLbs:   +kgToLbs(b0.fatMassKg - bN.fatMassKg).toFixed(1),
    baselineMuscleGainLbs:+kgToLbs(bN.leanMassKg - b0.leanMassKg).toFixed(1),
    // Protocol
    protocolWeeks,
    compoundCount: compounds.length,
  };

  // ── Weekly detail (for table view) ──
  const weeklyDetail = timeline.map((d, i) => {
    const prev = i > 0 ? timeline[i - 1] : d;
    return {
      ...d,
      weeklyFatLossKg:   +(prev.fatMassKg - d.fatMassKg).toFixed(3),
      weeklyFatLossLbs:  +kgToLbs(prev.fatMassKg - d.fatMassKg).toFixed(2),
      weeklyMuscleGainKg:+(d.leanMassKg - prev.leanMassKg).toFixed(3),
      weeklyMuscleGainLbs:+kgToLbs(d.leanMassKg - prev.leanMassKg).toFixed(2),
    };
  });

  return { timeline, baseline, summary, weeklyDetail };
}

/**
 * Internal: run a single simulation pass
 */
function runSim(profile, compounds, weeks) {
  let weightKg = profile.weightKg;
  let bf       = profile.bodyFat;
  let fatKg    = weightKg * (bf / 100);
  let leanKg   = weightKg - fatKg;

  const timeline = [];

  for (let wk = 0; wk <= weeks; wk++) {
    const bmr  = calcBMR(weightKg, bf);
    const tdee = calcTDEE(bmr, profile.activityLevel);
    const ffmi = calcFFMI(leanKg, profile.heightCm);

    timeline.push({
      week: wk,
      weightKg:   +weightKg.toFixed(2),
      weightLbs:  +kgToLbs(weightKg).toFixed(1),
      bf:         +bf.toFixed(1),
      leanMassKg: +leanKg.toFixed(2),
      leanMassLbs:+kgToLbs(leanKg).toFixed(1),
      fatMassKg:  +fatKg.toFixed(2),
      fatMassLbs: +kgToLbs(fatKg).toFixed(1),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      ffmi: +ffmi.toFixed(1),
    });

    if (wk === weeks) break;

    // ── Weekly delta calculation ──

    let weeklyFatLoss   = naturalFatLossRate(profile, bf);
    let weeklyMuscleGain = naturalMuscleRate(profile);
    let recoveryMult     = 1;

    for (const c of compounds) {
      const we = weekEffectMultiplier(c, wk);
      const rates = compoundWeeklyRates(c, profile);

      weeklyFatLoss    += rates.fatLossKgPerWeek * we;
      weeklyMuscleGain += rates.muscleKgPerWeek * we;
      recoveryMult     *= 1 + (rates.recoveryMultiplier - 1) * we;
    }

    // Recovery multiplier boosts natural muscle gain
    weeklyMuscleGain *= recoveryMult;

    // Apply pairwise synergy bonuses
    for (let i = 0; i < compounds.length; i++) {
      for (let j = i + 1; j < compounds.length; j++) {
        const syn = getSynergyMultiplier(compounds[i].id, compounds[j].id);
        if (syn > 1) {
          const bonus = (syn - 1) * 0.1;
          weeklyMuscleGain *= 1 + bonus;
          weeklyFatLoss    *= 1 + bonus * 0.5;
        }
      }
    }

    // ── Physiological limits ──
    weeklyMuscleGain = Math.min(weeklyMuscleGain, 0.30);   // max ~0.3 kg lean/week
    weeklyFatLoss    = Math.min(weeklyFatLoss, 1.50);       // max ~1.5 kg fat/week
    weeklyMuscleGain = Math.max(weeklyMuscleGain, -0.20);   // muscle loss floor

    const minFatKg = weightKg * 0.03; // essential fat floor (~3% BW)

    fatKg    = Math.max(fatKg - weeklyFatLoss, minFatKg);
    leanKg   = Math.max(leanKg + weeklyMuscleGain, leanKg * 0.95);
    weightKg = fatKg + leanKg;
    bf       = (fatKg / weightKg) * 100;
  }

  return timeline;
}

// ============================================================
// PROJECTION ANALYSIS — quick summary for UI display
// ============================================================

/**
 * Returns high-level projection stats for a compound set,
 * without running the full week-by-week simulation.
 * Good for compound cards and quick previews.
 */
export function quickProjection(selectedIds, compoundCatalog, bodyFat, weightLbs, weeks = 12) {
  const compounds = selectedIds.map(id => compoundCatalog.find(c => c.id === id)).filter(Boolean);
  const weightKg = lbsToKg(weightLbs);

  let totalBfChange = 0;
  let totalMuscleChange = 0;
  let totalRecovery = 0;
  let totalSkin = 0;

  for (const c of compounds) {
    totalBfChange     += c.effects.bf || 0;
    totalMuscleChange += c.effects.muscle || 0;
    totalRecovery     += c.effects.recovery || 0;
    totalSkin         += c.effects.skin || 0;
  }

  const projectedBF = Math.max(3, bodyFat + totalBfChange);
  const fatLossKg = (bodyFat - projectedBF) / 100 * weightKg;

  return {
    projectedBF: +projectedBF.toFixed(1),
    bfChange: +totalBfChange.toFixed(1),
    muscleScore: +totalMuscleChange.toFixed(1),
    recoveryScore: +totalRecovery.toFixed(1),
    skinScore: +totalSkin.toFixed(1),
    fatLossLbs: +kgToLbs(fatLossKg).toFixed(1),
    weeks,
  };
}

// ============================================================
// COST ESTIMATION
// ============================================================

const COST_ESTIMATES = {
  bpc157:      { low: 40,  high: 80 },
  tb500:       { low: 50,  high: 100 },
  ipacjc:      { low: 80,  high: 150 },
  tesamorelin: { low: 120, high: 250 },
  semaglutide: { low: 150, high: 400 },
  retatrutide: { low: 200, high: 500 },
  ghkcu:       { low: 30,  high: 60 },
  pt141:       { low: 50,  high: 100 },
};

export function estimateMonthlyCost(selectedIds) {
  let low = 0, high = 0;
  for (const id of selectedIds) {
    const est = COST_ESTIMATES[id] || { low: 50, high: 150 };
    low  += est.low;
    high += est.high;
  }
  return { low, high };
}
