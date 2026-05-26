"use client";
import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════
// ALKI — PROTOCOL Q&A ENGINE
// Contextual FAQ surface: per-compound, per-goal, stack-aware, general
// Drop in as a screen from Dashboard or Transform view.
//
// Props:
//   onBack         — () => void   — back navigation callback
//   activeCompound — string|null  — pre-select a compound tab
//   activeGoal     — string|null  — pre-select a goal tab
//
// Updated: reflects 71-compound database (original 8 + 63 expanded),
// new SARMs/nootropics/cycle support/hair/metabolic categories,
// MK-677, CycleTimeline, StackGenerator, Body3DAvatar additions.
// ═══════════════════════════════════════════════════════════

const DISCLAIMER =
  "All information is for research and educational purposes only. Nothing here constitutes medical advice, diagnosis, or treatment. Consult a licensed healthcare provider before initiating any peptide protocol. Alki assumes no liability for user decisions.";

// ── COMPOUND FAQ DATA ──────────────────────────────────────
const COMPOUND_FAQS = {

  // ── PEPTIDES ───────────────────────────────────────────
  "BPC-157": {
    category: "Recovery",
    tagline: "Tissue repair, gut healing, tendon regeneration",
    catColor: "#3b82f6",
    faqs: [
      {
        q: "Can I take BPC-157 orally instead of injecting it?",
        a: "BPC-157 has partial oral activity — a meaningful fraction survives the digestive environment due to its unusual structural stability. Oral administration (capsule or dissolved in water, taken on an empty stomach) is effective for gut-related applications like leaky gut, IBD, or gastric healing. For systemic tissue repair — tendons, ligaments, muscle — subcutaneous injection near the site of injury delivers significantly more reliable results. If needles are a hard barrier, oral is a legitimate starting point, especially for gut health goals.",
      },
      {
        q: "How long until I feel results from BPC-157?",
        a: "Gut and digestive improvements are often reported within 1–2 weeks at therapeutic doses. Tendon, ligament, and joint repair typically takes 3–6 weeks of consistent dosing to notice meaningful functional improvement. Subjective effects — better sleep, reduced inflammation, general well-being — are often reported earlier. BPC-157 is not acutely felt the way stimulants are; its effects accumulate over time. Consistent daily dosing outperforms intermittent use.",
      },
      {
        q: "Do I need to cycle BPC-157, or can I run it continuously?",
        a: "BPC-157 is non-suppressive, non-hormonal, and has no known dependency or tolerance mechanism. Continuous use during an active injury or recovery phase is the common approach. Many users run it for 4–8 weeks, take a break, and reassess. There is no established clinical reason a cycle break is mandatory — this is a protocol preference, not a safety requirement.",
      },
      {
        q: "SubQ or IM injection — which is better?",
        a: "SubQ injection into the fat layer near the injury site is the standard and preferred route. It's lower-risk, less painful, and clinically adequate. IM may theoretically deliver faster local concentration but carries higher discomfort and minor complication risk. Insulin needles (27–31g, 0.5 inch) are standard for SubQ. For gut applications, oral administration is a viable alternative.",
      },
      {
        q: "Can I stack BPC-157 with TB-500?",
        a: "Yes — this is one of the most well-regarded combinations. BPC-157 provides localized angiogenesis and tissue repair at the injury site. TB-500 provides systemic healing, stem cell mobilization, and anti-inflammatory signaling throughout the body. They hit different biological targets with no receptor overlap. The BPC/TB blend pre-mix is also available and simplifies dosing.",
      },
      {
        q: "How does BPC-157 interact with a SARM cycle?",
        a: "BPC-157 is one of the most universally recommended additions to any SARM cycle. SARMs increase training intensity and load, which puts significant stress on tendons and ligaments that lag behind the rapid strength gains. BPC-157 specifically addresses connective tissue integrity via angiogenesis, reducing injury risk during the cycle. It has no interaction with androgen receptors and does not affect the HPG axis. It runs throughout the cycle and does not require stopping during PCT.",
      },
      {
        q: "Should I get any bloodwork before starting BPC-157?",
        a: "BPC-157 is non-hormonal and non-suppressive, so a full hormone panel is not required. Basic pre-protocol bloodwork worth considering: CMP (comprehensive metabolic panel) for liver and kidney baselines, and a CBC. If you're stacking BPC-157 with suppressive compounds (SARMs, etc.), bloodwork requirements are driven by those compounds, not BPC-157 itself.",
      },
      {
        q: "Is BPC-157 liver-toxic?",
        a: "No liver toxicity has been documented with BPC-157 at standard doses. Preclinical data actually suggests hepatoprotective properties. It does not share the liver-stress profile of oral SARMs like YK-11 or LGD-4033. Standard liver support compounds (TUDCA, NAC) are not indicated for BPC-157 use alone, though they are required if the stack includes hepatotoxic compounds.",
      },
    ],
  },

  "TB-500": {
    category: "Recovery",
    tagline: "Systemic healing, stem cell mobilization, flexibility",
    catColor: "#3b82f6",
    faqs: [
      {
        q: "What's the difference between TB-500 and Thymosin Beta-4?",
        a: "TB-500 is a synthetic fragment of Thymosin Beta-4 (Tβ4) — specifically the active sequence responsible for actin binding and most of the peptide's biological activity. Full Thymosin Beta-4 is the naturally occurring protein; TB-500 is a research-grade analog. In practice, the terms are used interchangeably in the research community, but technically they are distinct compounds.",
      },
      {
        q: "How is TB-500 dosed and how often?",
        a: "Standard research dosing: loading phase of 4–8mg per week (two injections of 2–2.5mg each) for 4–6 weeks, followed by a maintenance phase of 2–4mg per week. Subcutaneous injection is standard. The twice-weekly split is preferred for more consistent plasma levels during the critical initial repair window.",
      },
      {
        q: "Can TB-500 be used alone, or does it need BPC-157?",
        a: "TB-500 can be used as a standalone — it has meaningful systemic healing properties on its own, particularly for widespread inflammation, muscle tears, and conditions requiring body-wide recovery support. However, the TB-500 + BPC-157 stack is significantly more comprehensive: TB-500 handles systemic healing and stem cell mobilization while BPC-157 handles localized angiogenesis and tissue repair. Solo TB-500 is a reasonable choice when injury is diffuse rather than site-specific.",
      },
      {
        q: "Is TB-500 WADA-banned?",
        a: "Yes. TB-500 (Thymosin Beta-4) is on the WADA prohibited list under peptide hormones and growth factors. Competitive athletes subject to anti-doping testing should not use it. Always verify current prohibited list status with your sport's governing body.",
      },
      {
        q: "Does TB-500 run through a SARM cycle and PCT?",
        a: "Yes — TB-500 is non-suppressive, non-hormonal, and has no interaction with the HPG axis. It can run throughout a SARM cycle, into PCT, and beyond. Many users treat the BPC-157/TB-500 stack as a continuous recovery layer that operates independently of whatever primary compound cycle they are running.",
      },
    ],
  },

  "Ipamorelin + CJC-1295": {
    category: "GH Stack",
    tagline: "Lean mass, fat reduction, sleep quality, GH pulse amplification",
    catColor: "#a855f7",
    faqs: [
      {
        q: "Why take Ipamorelin and CJC-1295 together instead of separately?",
        a: "They work through complementary, synergistic mechanisms. CJC-1295 No DAC is a GHRH analog — it signals the pituitary to be ready to release GH. Ipamorelin is a GHRP that directly triggers the GH pulse. Combined, the resulting GH release is 5–10x larger than either compound produces alone. It's a two-key system: GHRH loads the gun, GHRP pulls the trigger. The CJC/Ipamorelin stack at 100/100–200/200 mcg pre-sleep is the gold standard GH peptide protocol.",
      },
      {
        q: "CJC-1295 with DAC vs. without DAC — which should I use?",
        a: "For most users: CJC-1295 No DAC. No DAC produces sharp, physiological GH pulses that mimic natural pulsatile release — more effective for body composition and better for long-term pituitary health. CJC-1295 with DAC has an ~8-day half-life providing sustained GH elevation, but can lead to pituitary desensitization with extended use. No DAC is dosed pre-sleep (or 2–3x daily for more aggressive protocols). DAC is weekly — simpler schedule, but inferior physiology long-term.",
      },
      {
        q: "Can I stack this with MK-677?",
        a: "Yes — MK-677 and CJC/Ipamorelin are a well-matched combination. MK-677 provides sustained baseline IGF-1 elevation 24 hours/day via oral dosing. CJC/Ipamorelin adds sharp, amplified GH pulses during the sleep window. These hit the GH axis through independent mechanisms with no receptor conflict: MK-677 acts on the ghrelin receptor continuously; CJC/Ipamorelin acts via GHRH + ghrelin pulsatile stimulation. The combined IGF-1 and GH output is meaningfully higher than either protocol alone.",
      },
      {
        q: "When should I take the stack and why pre-sleep?",
        a: "Pre-sleep dosing (30–60 minutes before bed) aligns with the body's largest natural GH pulse, which occurs during deep slow-wave sleep. Amplifying this pulse rather than adding artificial pulses at random times produces the most physiological and effective outcome. Take on an empty stomach — elevated blood glucose or insulin suppresses GH release. Avoid carbohydrates for 2 hours before dosing.",
      },
      {
        q: "How long does it take to notice effects?",
        a: "GH peptide effects are not acute — they accumulate over weeks as GH and IGF-1 levels rise. Most users report improved sleep quality and vivid dreams within 1–2 weeks. Body composition changes typically become noticeable at 6–12 weeks. The full effect of a GH peptide stack requires 3–6 months to fully evaluate. Patience is required.",
      },
      {
        q: "Does the stack suppress natural GH production?",
        a: "No — GH peptides stimulate your own pituitary to release GH. They do not suppress the HPG or hypothalamic-pituitary-GH axis. When you stop the stack, your pituitary returns to baseline. This is a significant safety advantage over exogenous HGH, which suppresses pituitary output. GH peptides enhance what you already produce; they don't replace it.",
      },
      {
        q: "Can I run this stack alongside a SARM cycle?",
        a: "Yes — the GH stack is non-suppressive and has no interaction with androgen receptors. Running CJC/Ipamorelin alongside a SARM cycle adds IGF-1 elevation, improved recovery, and better sleep architecture to the anabolic environment created by the SARM. It continues through PCT without interruption. This is one of the most effective additions to a SARM protocol for users who want to maximize lean mass gains.",
      },
    ],
  },

  "MK-677": {
    category: "GH Stack",
    tagline: "The oral GH path — no injections, sustained IGF-1 elevation",
    catColor: "#a855f7",
    faqs: [
      {
        q: "What is MK-677 and how is it different from GH peptides?",
        a: "MK-677 (Ibutamoren) is an orally active ghrelin receptor agonist — not a peptide, not a SARM, and not exogenous GH. It stimulates the pituitary to release GH and drives sustained 24-hour IGF-1 elevation. The key distinction from injectable GH peptides: MK-677 produces a more sustained, continuous IGF-1 signal rather than sharp pulsatile GH spikes. The key distinction from exogenous HGH: it works through your own pituitary and does not suppress natural GH output.",
      },
      {
        q: "Is MK-677 a SARM?",
        a: "No. MK-677 is commonly grouped with SARMs in the research compound market, but it has no interaction with androgen receptors. It is a ghrelin receptor agonist — a GH secretagogue. It does not cause HPG axis suppression, does not require PCT, and does not affect testosterone, LH, or FSH. The grouping is commercial convenience, not pharmacological accuracy.",
      },
      {
        q: "Does MK-677 require PCT?",
        a: "No. MK-677 is non-suppressive. It does not affect the HPG axis in any direction. It can be run continuously through SARM cycles, through PCT, and as a long-term standalone. This is one of its most valued properties — it is the one GH-axis compound that runs through everything without complicating post-cycle recovery.",
      },
      {
        q: "What are the main side effects?",
        a: "Significant appetite increase is the most prominent and consistent side effect — MK-677 elevates ghrelin, the primary hunger hormone. This is advantageous during a bulk, problematic during a cut. Water retention in the first 2 weeks is common as IGF-1 levels rise. Mild fasting glucose elevation occurs — individuals with pre-diabetes or insulin resistance should monitor glucose. Vivid dreams and improved sleep depth are commonly reported positives. Lethargy in the first few weeks as the body adapts is reported by some users.",
      },
      {
        q: "What dose and timing work best?",
        a: "25mg/day oral is the standard dose. Evening or pre-sleep administration is preferred — it aligns the ghrelin-driven GH pulse with the natural sleep-window GH release, and the elevated appetite from the ghrelin agonism is less disruptive at night. Effects take 4–8 weeks to fully develop as IGF-1 levels stabilize. Some users respond adequately at 12.5mg/day with fewer appetite and water retention side effects.",
      },
      {
        q: "Can I stack MK-677 with SARMs?",
        a: "Yes — this is one of the most popular and well-regarded combinations. MK-677 provides the GH/IGF-1 anabolic axis; SARMs (particularly RAD-140 or MK-2866) provide the androgen receptor anabolic axis. They hit completely independent mechanisms with no receptor conflict and no additive suppression (MK-677 adds zero suppression). MK-677 also runs through PCT while the SARM requires a recovery protocol — it bridges the cycle without interruption.",
      },
      {
        q: "How does MK-677 compare to CJC-1295 + Ipamorelin?",
        a: "Both drive GH/IGF-1 elevation. The key differences: MK-677 is oral (no injections), produces sustained 24-hour IGF-1 elevation, and is non-suppressive — it runs indefinitely. CJC/Ipamorelin is injectable, produces sharp physiological GH pulses aligned with sleep, and is more effective for sleep architecture improvement. Many advanced users combine both: MK-677 as the sustained IGF-1 baseline, CJC/Ipamorelin for sleep-window pulse amplification. The combination is meaningfully more effective than either alone.",
      },
      {
        q: "What bloodwork should I run on MK-677?",
        a: "IGF-1 is the primary marker — test baseline before starting and retest at 8–12 weeks to confirm the compound is working and quantify your response. IGF-1 should rise meaningfully; if unchanged, reassess dose or compound quality. Fasting glucose and HbA1c are worth monitoring given MK-677's insulin-opposing GH effects. Annual lipid panel is reasonable for any long-running protocol.",
      },
    ],
  },

  Tesamorelin: {
    category: "Fat Loss",
    tagline: "FDA-approved GHRH analog, visceral fat reduction",
    catColor: "#f59e0b",
    faqs: [
      {
        q: "Is Tesamorelin actually FDA-approved?",
        a: "Yes — Tesamorelin (brand name Egrifta) is FDA-approved for the reduction of excess abdominal fat (lipodystrophy) in HIV-infected patients. It is the only GHRH analog in this class with completed clinical trials and FDA approval. This gives it more human safety and efficacy data than any other GH peptide, though that data is from an HIV lipodystrophy population.",
      },
      {
        q: "How does Tesamorelin differ from CJC-1295?",
        a: "Both are GHRH analogs that stimulate pituitary GH release, but Tesamorelin is specifically engineered for stability and has documented effects specifically on visceral fat reduction. CJC-1295 is a broader GH stimulator used for overall recomp. Tesamorelin's clinical evidence for visceral fat is stronger than any other peptide in this category.",
      },
      {
        q: "What dose and protocol should I use?",
        a: "The FDA-approved clinical dose is 2mg/day SubQ. Research users often start at 1mg/day to assess tolerance, moving to 2mg if well-tolerated. Administered daily as a SubQ injection, typically in the morning. Cycle lengths of 12–26 weeks have been studied clinically; most research users run 12–20 week cycles.",
      },
      {
        q: "How quickly does visceral fat reduction occur?",
        a: "Clinical trial data shows measurable visceral fat reduction by CT scan at 12 weeks, with continued reduction through 26 weeks of daily dosing. Subjective waistline changes are typically reported around 6–8 weeks. Visceral fat may partially return after cessation — maintenance dosing or re-cycling is common.",
      },
      {
        q: "Does Tesamorelin affect insulin sensitivity?",
        a: "Yes — all GH-elevating compounds have the potential to transiently reduce insulin sensitivity. Fasting glucose and HbA1c should be monitored before and during a Tesamorelin protocol. Individuals with pre-diabetes, Type 2 diabetes, or significant insulin resistance should approach GH-elevating peptides cautiously.",
      },
    ],
  },

  "Semaglutide (GLP-1)": {
    category: "Weight Loss",
    tagline: "Appetite suppression, metabolic improvement, weekly dosing",
    catColor: "#ef4444",
    faqs: [
      {
        q: "What body fat percentage is appropriate for Semaglutide?",
        a: "Semaglutide is appropriate for individuals at or above approximately 22% body fat. It is contraindicated for lean individuals (below ~12% body fat). In lean users, the appetite suppression mechanism causes muscle catabolism alongside any remaining fat loss. The compound is clinically approved for obesity (BMI 30+) and overweight with comorbidities (BMI 27+).",
      },
      {
        q: "How is Semaglutide dosed and how does titration work?",
        a: "Semaglutide is administered as a weekly subcutaneous injection. Standard titration: start at 0.25mg/week for weeks 1–4, increase to 0.5mg/week for weeks 5–8, continue escalating by 0.5mg increments every 4 weeks up to target dose. The gradual titration is essential to minimize GI side effects. Rushing the titration causes avoidable misery.",
      },
      {
        q: "Will I lose muscle mass on Semaglutide?",
        a: "This is the most important practical concern. Rapid weight loss from caloric restriction causes muscle catabolism — typically 25–40% of weight lost is lean mass, not fat. Mitigating muscle loss requires: high protein intake (1g+ per lb of lean body mass daily), progressive resistance training throughout the protocol, and co-administration of lean mass-preserving compounds — most effectively a GH peptide stack (CJC/Ipamorelin, MK-677, or Tesamorelin).",
      },
      {
        q: "What happens when I stop taking Semaglutide?",
        a: "Weight regain after cessation is well-documented — the majority of users regain a significant portion of lost weight within 12 months of stopping. This is because GLP-1 receptor agonism artificially suppresses appetite; when the compound is removed, appetite returns to or above baseline. Long-term use, very gradual dose tapering, and permanent lifestyle changes are strategies to manage this.",
      },
      {
        q: "What bloodwork should I run before and during a Semaglutide protocol?",
        a: "Pre-protocol: HbA1c, fasting glucose, lipid panel, comprehensive metabolic panel, thyroid panel (TSH + T4). Note: GLP-1 receptor agonists carry a black-box warning for thyroid C-cell tumors in rodents; personal or family history of medullary thyroid carcinoma or MEN-2 is an absolute contraindication. During protocol: repeat HbA1c and fasting glucose every 12 weeks.",
      },
    ],
  },

  "Retatrutide (GLP-3)": {
    category: "Weight Loss",
    tagline: "Triple agonist: GLP-1, GIP, Glucagon — most powerful GLP agent",
    catColor: "#ef4444",
    faqs: [
      {
        q: "What makes Retatrutide different from Semaglutide?",
        a: "Retatrutide is a triple agonist: it activates GLP-1 (appetite suppression, insulin secretion), GIP (glucose-dependent insulin release, fat cell signaling), and Glucagon (energy expenditure, fat mobilization) receptors simultaneously. Semaglutide is a single GLP-1 agonist. Phase 2 clinical trial data showed average weight loss of ~24% body weight in 48 weeks — substantially exceeding Semaglutide's clinical results.",
      },
      {
        q: "Is Retatrutide approved or still in trials?",
        a: "As of early 2026, Retatrutide is in Phase 3 clinical trials (Eli Lilly). It has not received FDA approval. Phase 2 data (NEJM, 2023) showed remarkable efficacy. Research-grade Retatrutide is available from gray-market suppliers, but users are extrapolating from Phase 2 data — there is no FDA-validated manufacturing pipeline. This is the most experimental compound in the GLP category.",
      },
      {
        q: "How does Retatrutide affect muscle mass?",
        a: "Retatrutide's Glucagon component increases energy expenditure and fat mobilization — but Glucagon also has catabolic signaling properties. In Phase 2 trials, lean mass loss was observed alongside fat loss, consistent with the broader GLP class. Lean mass preservation strategies are critical: high protein intake, resistance training, and co-administration of GH peptides (CJC/Ipamorelin or MK-677). The muscle loss risk may be proportionally higher than with Semaglutide given the Glucagon arm.",
      },
      {
        q: "Is Retatrutide appropriate for leaner users?",
        a: "No. Like Semaglutide, Retatrutide is inappropriate for lean individuals — and given its greater potency, it carries higher risk for lean users. Alki blocks GLP agents for users below 22% body fat and flags Retatrutide as the highest-risk GLP option.",
      },
    ],
  },

  "GHK-Cu": {
    category: "Anti-Aging",
    tagline: "Collagen synthesis, skin quality, wound healing, 4,000+ gene activation",
    catColor: "#ec4899",
    faqs: [
      {
        q: "What is GHK-Cu and why is it relevant for anti-aging?",
        a: "GHK-Cu (Glycyl-L-histidyl-L-lysine:copper) is a naturally occurring copper peptide found in human plasma, saliva, and urine. It has been shown to activate approximately 4,000 human genes — many involved in tissue repair, collagen synthesis, anti-inflammatory signaling, and antioxidant defense. Plasma GHK-Cu levels decline significantly with age (from ~200 ng/mL at age 20 to ~80 ng/mL by age 60).",
      },
      {
        q: "What are the most effective administration routes?",
        a: "Topical application has the strongest evidence base for skin applications (collagen synthesis, wrinkle reduction, wound healing). Intranasal administration is used for systemic and neurological applications. Subcutaneous injection at 1–2mg/day is used for more aggressive anti-aging protocols seeking systemic gene activation. Topical is the safest starting point; injectable use is more experimental but common in biohacking circles.",
      },
      {
        q: "How long should a GHK-Cu cycle run?",
        a: "30-day cycles are the common framework for injectable or intranasal GHK-Cu, followed by a break before reassessment. Topical cosmetic use can be daily and continuous. There is no documented receptor downregulation or dependence mechanism that mandates cycling.",
      },
      {
        q: "Does GHK-Cu promote hair growth?",
        a: "Yes — this is one of GHK-Cu's most documented effects. It has been studied for androgenetic alopecia with positive results in improving follicle size and hair diameter. It pairs naturally with other hair support compounds (finasteride, minoxidil) as a complementary mechanism focused on scalp tissue health rather than DHT blockade.",
      },
      {
        q: "Are there any safety concerns with copper peptides?",
        a: "GHK-Cu is generally regarded as very low risk at standard doses. Copper is an essential nutrient and GHK-Cu is a naturally occurring peptide. Individuals with Wilson's disease (copper metabolism disorder) should not use copper-containing compounds.",
      },
    ],
  },

  "PT-141": {
    category: "Performance",
    tagline: "CNS libido activation, FDA-approved pathway",
    catColor: "#06b6d4",
    faqs: [
      {
        q: "How does PT-141 work differently from PDE-5 inhibitors like Cialis?",
        a: "PDE-5 inhibitors work peripherally — they enhance blood flow to erectile tissue by blocking cGMP breakdown. They don't affect desire or arousal at the neurological level. PT-141 works centrally — it activates melanocortin 3 and 4 receptors (MC3R/MC4R) in the brain, directly stimulating sexual motivation and arousal. It addresses desire and arousal rather than just vascular mechanics. This makes it effective in cases where PDE-5 inhibitors fail.",
      },
      {
        q: "Is PT-141 FDA-approved?",
        a: "Yes — PT-141 (Bremelanotide) is FDA-approved as Vyleesi for hypoactive sexual desire disorder (HSDD) in premenopausal women. This makes it one of the few compounds in this database with a formal FDA approval pathway. The compound has meaningful human safety data from the clinical trial program.",
      },
      {
        q: "What is the correct dose and timing?",
        a: "Standard research dosing: 1–2mg SubQ administered 45–90 minutes before desired activity. The window of effect is approximately 6–12 hours. Start at 0.5–1mg to assess individual sensitivity. Maximum 2x/week is the recommended frequency ceiling. Nausea is the primary side effect and is dose-dependent; lower doses significantly reduce nausea risk.",
      },
      {
        q: "Does PT-141 work for both men and women?",
        a: "Yes — the FDA approval is for women (HSDD), but the compound works via MC3R/MC4R receptors present and active in both sexes. The neurological arousal mechanism is not sex-specific. Clinical trial data exists for both male and female populations.",
      },
    ],
  },

  // ── SARMs ──────────────────────────────────────────────
  "SARMs — Overview": {
    category: "SARM",
    tagline: "What they are, how they work, what to know before starting",
    catColor: "#f97316",
    faqs: [
      {
        q: "What is a SARM and how does it differ from anabolic steroids?",
        a: "SARM stands for Selective Androgen Receptor Modulator. SARMs bind to androgen receptors (AR) with varying degrees of selectivity for muscle and bone tissue over other androgen-sensitive tissues (prostate, scalp, sebaceous glands). Traditional anabolic steroids activate AR broadly and also aromatize to estrogen. SARMs attempt to deliver anabolic effects (muscle, bone) while reducing androgenic side effects (hair, skin, prostate). In practice, no SARM achieves complete tissue selectivity — all suppressive SARMs affect the HPG axis to varying degrees.",
      },
      {
        q: "Do all SARMs require PCT?",
        a: "Yes — all androgen receptor-active SARMs suppress the HPG axis to some degree. The suppression varies: MK-2866 (Ostarine) at 20mg has mild suppression; RAD-140 and LGD-4033 are significantly suppressive; YK-11 and S-23 approach near-complete shutdown. All AR-active SARMs require post-cycle therapy (PCT) using a SERM (Nolvadex or Enclomiphene) for 4–6 weeks after the cycle. MK-677 is grouped with SARMs commercially but is not AR-active and does not require PCT.",
      },
      {
        q: "What bloodwork is required for a SARM cycle?",
        a: "At minimum: pre-cycle full hormone panel (total testosterone, free testosterone, LH, FSH, estradiol, SHBG), ALT/AST (liver enzymes), lipid panel (HDL/LDL), and CBC. Repeat at mid-cycle (week 6) and 4 weeks post-PCT. The post-PCT check is critical — it confirms LH, FSH, and testosterone have returned to baseline before considering another cycle. Running another cycle before HPG axis recovery is confirmed is the most common mistake in SARM use.",
      },
      {
        q: "What is PCT and how do I run it?",
        a: "PCT (Post-Cycle Therapy) is the protocol used after a suppressive compound cycle to restart natural testosterone production. The goal is to stimulate LH and FSH secretion, which then signals the testes to resume testosterone synthesis. Standard PCT protocols: Nolvadex (Tamoxifen) 20mg/day for 4–6 weeks, or Enclomiphene 12.5mg/day for 4–6 weeks. Enclomiphene is the cleaner option — it contains only the active trans-isomer without the zuclomiphene component responsible for mood and visual side effects in racemic Clomid.",
      },
      {
        q: "What liver support is required for SARMs?",
        a: "For mild SARMs (MK-2866, S-4): basic liver support — NAC 600mg/day and periodic liver enzyme monitoring. For more suppressive or potentially hepatotoxic SARMs (LGD-4033, YK-11, RAD-140): TUDCA 500mg/day + NAC 600mg/day throughout the cycle and 2 weeks after. TUDCA (Tauroursodeoxycholic acid) is the primary hepatoprotective agent. Never run YK-11 without TUDCA/NAC. Bloodwork (ALT/AST) before starting and at mid-cycle is the only objective safety net.",
      },
      {
        q: "Can I stack SARMs with peptides?",
        a: "Yes — SARM + peptide combinations are among the most well-regarded protocols in this space. The three most effective additions to any SARM cycle: (1) BPC-157 + TB-500 for connective tissue protection — SARMs increase training load faster than tendons and ligaments adapt. (2) MK-677 for GH/IGF-1 — non-suppressive, runs through PCT, adds an independent anabolic axis. (3) CJC/Ipamorelin for sleep window GH pulse amplification. None of these peptides interact with androgen receptors or add to HPG suppression.",
      },
      {
        q: "How long should I wait between SARM cycles?",
        a: "The standard guideline: time off equals time on. If a cycle was 10 weeks, wait 10 weeks before starting the next. This includes the PCT period. More conservatively: wait until bloodwork confirms LH, FSH, and testosterone have returned to pre-cycle baseline — which should occur within 4–8 weeks post-PCT for most users. Starting a new cycle before confirming HPG axis recovery risks compounding suppression.",
      },
    ],
  },

  "MK-2866 (Ostarine)": {
    category: "SARM",
    tagline: "The mildest SARM — best entry point, clinical data, body recomposition",
    catColor: "#f97316",
    faqs: [
      {
        q: "Why is MK-2866 recommended as the best starting SARM?",
        a: "MK-2866 (Ostarine) is a partial AR agonist with the most extensive human clinical data of any SARM — it has been through multiple Phase II clinical trials, which is unusual in this class. Its suppression is mild compared to RAD-140 or LGD-4033, its side effect profile is well-characterized, and its dose-response is well-understood. For a first SARM cycle, it provides a meaningful performance benchmark while minimizing risk. The data-to-risk ratio is better than any other SARM.",
      },
      {
        q: "What results can I realistically expect?",
        a: "At 20mg/day for 8–12 weeks with proper training and nutrition: 4–8 lbs of lean mass gain with simultaneous modest fat loss (body recomposition). Strength improvements typically begin within 2 weeks. Users who go into a Ostarine cycle expecting the aggressive results of LGD-4033 or RAD-140 will be underwhelmed — that is by design. The milder result and milder risk are the same feature.",
      },
      {
        q: "What does the suppression profile look like?",
        a: "MK-2866 at 20mg/day produces mild HPG axis suppression — testosterone levels typically drop by 20–40% from baseline, with corresponding LH/FSH reduction. This is meaningful but significantly less than RAD-140 or LGD-4033. A 4-week Nolvadex or Enclomiphene PCT is standard. Most users fully recover by 4 weeks post-PCT confirmed on bloodwork. Running Ostarine at high doses (30mg+) increases suppression substantially without proportional benefit.",
      },
      {
        q: "Does MK-2866 help with joint and tendon health?",
        a: "Yes — this is a distinctive property of Ostarine that most other SARMs lack. It was originally developed for muscle wasting and bone density conditions, and has documented effects on connective tissue. Many users report significant joint comfort improvement. This is one of the reasons it is recommended for users with pre-existing joint issues as a first SARM — the connective tissue benefits combined with mild muscle anabolism is a well-suited profile for recovery-focused users.",
      },
      {
        q: "Does MK-2866 require liver support (TUDCA/NAC)?",
        a: "At standard doses (20mg/day), TUDCA is not mandatory — mild liver enzyme elevation is possible but typically modest and transient. NAC 600mg/day throughout the cycle is a low-cost, low-risk precaution worth taking. Get an ALT/AST baseline before starting. If you're stacking MK-2866 with other compounds (particularly any oral or methylated compound), liver support requirements are driven by the more hepatotoxic compound in the stack.",
      },
    ],
  },

  "RAD-140 (Testolone)": {
    category: "SARM",
    tagline: "Fastest strength onset in SARM class — most popular intermediate compound",
    catColor: "#f97316",
    faqs: [
      {
        q: "Why is RAD-140 considered the most popular SARM?",
        a: "RAD-140 produces the fastest visible strength and lean mass gains of any commonly used SARM — users typically report noticeable strength increases within 10–14 days. At 10–15mg/day it drives rapid body recomposition with no estrogenic side effects (it does not aromatize). The cost-to-effect ratio is favorable, and dosing is simple (single daily dose). It has become the most commonly used intermediate SARM largely because the results are immediately tangible, which reinforces compliance.",
      },
      {
        q: "What are the main risks and side effects?",
        a: "High HPG axis suppression is the primary concern — testosterone levels drop significantly during the cycle, producing the expected hormonal side effects: mid-cycle libido decline, mood flatness, and sometimes lethargy. Full SERM PCT is non-negotiable. Lipid impact is meaningful — HDL typically drops 20–30%. Hair loss acceleration in genetically predisposed users is real. Some users report aggressive or irritable mood. Bloodwork before, mid-cycle, and post-PCT is the only objective safety net.",
      },
      {
        q: "What PCT protocol does RAD-140 require?",
        a: "RAD-140 requires a full SERM PCT: Nolvadex 20mg/day or Enclomiphene 12.5mg/day for 4–6 weeks post-cycle. Enclomiphene is preferred for its cleaner side effect profile. MK-677 (if running it) continues through PCT without interruption. BPC-157/TB-500 continues through PCT. Wait for bloodwork to confirm testosterone and LH/FSH recovery before considering the next cycle.",
      },
      {
        q: "How does RAD-140 interact with hair loss?",
        a: "RAD-140, as a full AR agonist, can accelerate androgenetic alopecia (male pattern hair loss) in individuals with genetic predisposition. It does not aromatize to estrogen, but AR activation at scalp follicles in susceptible users can trigger or accelerate thinning. Mitigation options: RU58841 topical (scalp AR antagonist) applied during the cycle, or finasteride — though 5α-reductase inhibitors are less effective for SARMs than for testosterone (SARMs don't convert to DHT via 5AR). RU58841 is the more mechanistically appropriate hair protection tool for SARM cycles.",
      },
      {
        q: "What does RAD-140 + peptides look like as a complete stack?",
        a: "The most effective complete intermediate stack using Alki's database: RAD-140 10–15mg/day (AR anabolism) + MK-677 25mg/day (GH/IGF-1 axis, non-suppressive) + BPC-157 250–500mcg/day SubQ (connective tissue protection) + CJC/Ipamorelin pre-sleep (GH pulse amplification). Support layer: Tadalafil 5mg/day (cardiovascular), TUDCA optional at this dose range, bloodwork panel. This covers three independent anabolic axes with a recovery foundation.",
      },
      {
        q: "Should I run RAD-140 as my first SARM?",
        a: "It depends on context. RAD-140 has significantly higher suppression and side effect potential than MK-2866 (Ostarine). For users who have never run a SARM: Ostarine is the more appropriate first cycle — it establishes your individual response profile, suppression pattern, and side effect sensitivity with lower risk. For users who have run Ostarine successfully and have their bloodwork and PCT infrastructure in place: RAD-140 is a logical next step.",
      },
    ],
  },

  "LGD-4033 (Ligandrol)": {
    category: "SARM",
    tagline: "Highest raw lean mass gain — the mass builder",
    catColor: "#f97316",
    faqs: [
      {
        q: "How does LGD-4033 compare to RAD-140 for muscle gain?",
        a: "LGD-4033 is the superior mass builder in the core SARM category — it produces higher raw lean mass gain per cycle than RAD-140, particularly for users in a caloric surplus. First-time users at 5–10mg/day for 8–10 weeks typically report 8–12 lbs of lean mass. RAD-140 delivers faster visible strength onset but LGD-4033's mass accumulation over the full cycle is greater. The trade-off: LGD-4033's water retention, suppression severity, and lipid impact are meaningfully higher.",
      },
      {
        q: "What dose should I use?",
        a: "5mg/day is effective for most first-time LGD-4033 users and represents the best risk-to-benefit entry point. 10mg/day produces a meaningfully stronger anabolic signal but also stronger suppression, water retention, and lipid impact. The clinical trial data actually used 1–22mg/day — 5mg landed in the effective range with better tolerability. Doses above 10mg do not produce proportionally stronger results and increase side effects without justification.",
      },
      {
        q: "Does LGD-4033 require liver support?",
        a: "Yes — TUDCA 500mg/day + NAC 600mg/day throughout the cycle and 2 weeks after. LGD-4033 has documented hepatotoxicity reports and liver enzyme elevation in clinical trials, more so than RAD-140 or MK-2866. This is not optional. Get ALT/AST bloodwork before starting and at mid-cycle (week 5–6).",
      },
      {
        q: "What's the water retention situation with LGD-4033?",
        a: "Water retention is significant during the first 2–3 weeks as IGF-1 rises and the anabolic environment establishes. Some of the early 'weight gain' on LGD-4033 is intracellular water, not muscle — users often see a meaningful deflation in the first 1–2 weeks post-cycle. The actual lean mass gain, once water clears, is typically still substantial. Tracking body weight alone during an LGD cycle is misleading — use body fat measurements or waist circumference to track real composition changes.",
      },
      {
        q: "How does the suppression compare to RAD-140?",
        a: "LGD-4033 and RAD-140 are broadly comparable in suppression severity — both require full SERM PCT. LGD-4033 tends to produce more pronounced libido decline during cycle in some users. Both compounds typically restore testosterone to baseline within 4–8 weeks of a standard PCT. The post-PCT bloodwork check is non-negotiable for both.",
      },
    ],
  },

  // ── GH AXIS EXTRAS ─────────────────────────────────────
  "HGH Fragment 176-191": {
    category: "Fat Loss",
    tagline: "Targeted fat oxidation without glucose or anabolic effects",
    catColor: "#f59e0b",
    faqs: [
      {
        q: "What makes Fragment 176-191 different from other fat loss compounds?",
        a: "Fragment 176-191 is the C-terminal fragment of human GH that retains the lipolytic (fat-burning) activity while losing the anabolic and glucose-regulating effects of full GH. This means: fat oxidation without IGF-1 elevation, no blood sugar impact, no muscle growth, no receptor tolerance buildup. It is the cleanest targeted fat loss peptide in the database — appropriate for users who specifically want fat reduction without the broader GH-axis effects of Tesamorelin or CJC/Ipamorelin.",
      },
      {
        q: "How is it dosed and when?",
        a: "Standard dosing: 300mcg/day SubQ. Morning administration in a fasted state is preferred — GH fragment's lipolytic activity is amplified in low-insulin conditions. Injecting after carbohydrate consumption significantly blunts the fat-burning signal. Some users split into two 150mcg doses (AM and pre-workout). Cycle lengths of 8–16 weeks are typical.",
      },
      {
        q: "Can it be stacked with GLP-1 compounds?",
        a: "Yes — Fragment 176-191 and GLP-1s (Semaglutide, Retatrutide) target fat loss through completely different mechanisms. GLP-1s work via appetite suppression and metabolic improvement; Fragment 176-191 works via direct lipolysis at the adipocyte. They are mechanistically complementary with no known receptor conflict. This combination can be appropriate for high-body-fat users seeking aggressive fat loss, but the GLP-1's muscle catabolism concern remains and requires the same lean mass preservation countermeasures.",
      },
    ],
  },

  // ── CYCLE SUPPORT ──────────────────────────────────────
  "Cycle Support — Overview": {
    category: "Cycle Support",
    tagline: "PCT, SERMs, AIs, liver support — the infrastructure layer",
    catColor: "#64748b",
    faqs: [
      {
        q: "What is the difference between Nolvadex, Enclomiphene, and Clomid for PCT?",
        a: "All three are SERMs that block estrogen receptors at the hypothalamus, removing estrogen's negative feedback and stimulating LH/FSH → testosterone production. The key differences: Nolvadex (Tamoxifen) is the most validated, cheapest, and most widely available — the standard PCT choice. Enclomiphene is the cleaner, preferred option: it is the pure active isomer of clomiphene without the zuclomiphene component responsible for mood crashes and vision disturbances in racemic Clomid. Clomid (racemic clomiphene) works but has a worse side effect profile than either alternative. If Enclomiphene is available, use it over Clomid.",
      },
      {
        q: "Do I need an aromatase inhibitor (AI) on a SARM cycle?",
        a: "For most SARM-only cycles: no. True SARMs (RAD-140, LGD-4033, MK-2866) do not aromatize to estrogen the way testosterone does, so aromatase inhibitors have limited applicability. Estrogen elevation on a SARM cycle is typically minimal. The exception: if bloodwork shows elevated estradiol causing gynecomastia symptoms, a low-dose AI (Anastrozole 0.25mg EOD) is appropriate. Never take an AI speculatively — crashing E2 causes joint pain, libido loss, and mood disruption that is worse than mild estrogen elevation.",
      },
      {
        q: "What does TUDCA do and when is it actually required?",
        a: "TUDCA (Tauroursodeoxycholic acid) is a bile acid with documented hepatoprotective properties — it reduces liver cell stress, supports bile flow, and protects against hepatocyte damage from hepatotoxic compounds. It is required for: YK-11 (non-negotiable), LGD-4033 (strongly recommended), RAD-140 at higher doses, and any other compound with documented liver enzyme elevation. Standard dose: 500mg/day throughout cycle and 2 weeks after. NAC 600mg/day is paired with TUDCA as a complementary mechanism (glutathione precursor). Together they are the standard liver protection stack for any hepatotoxic compound.",
      },
      {
        q: "Why is Tadalafil recommended as cycle support?",
        a: "Tadalafil at 5mg/day (low-dose daily protocol) is one of the most underrated cycle support compounds. It provides: cardiovascular protection and blood pressure management during the cycle, sexual function preservation during HPG suppression, and sustained vascularity and pump. The clinical safety record at this dose is excellent — it is used indefinitely in men with pulmonary arterial hypertension and BPH at this dose range. For most SARM users, the sexual function and cardiovascular benefits during suppression justify inclusion in the support layer.",
      },
      {
        q: "What is Cabergoline and when is it needed?",
        a: "Cabergoline is a long-acting dopamine D2 agonist that suppresses prolactin. In the Alki compound context, prolactin elevation is primarily a concern with GHRP-6 and Hexarelin (prolactin-stimulating GHRPs not in the core database). Ipamorelin — the GHRP in the Alki core stack — does not cause prolactin elevation, making Cabergoline unnecessary for Ipamorelin protocols. If the user expands to 19-nor compounds or prolactin-elevating GHRPs as the database grows, Cabergoline becomes relevant. Dose: 0.25mg twice weekly.",
      },
    ],
  },
};

// ── GOAL FAQ DATA ──────────────────────────────────────────
const GOAL_FAQS = {
  "Fat Loss": {
    icon: "🔥",
    faqs: [
      {
        q: "Which peptides are best for fat loss, and in what order of priority?",
        a: "Priority hierarchy for fat loss: (1) Semaglutide or Retatrutide for users above 22% BF — appetite suppression is the most powerful fat loss tool in the database. (2) Tesamorelin for visceral fat specifically. (3) HGH Fragment 176-191 for direct lipolysis without GH-axis systemic effects. (4) Ipamorelin + CJC-1295 or MK-677 for lean mass preservation during deficit — GH is lipolytic and anti-catabolic, essential when running a GLP-1. For users below 22% BF, GLP-1s are contraindicated; the stack focuses on GH peptides and Tesamorelin for recomposition.",
      },
      {
        q: "How do I preserve muscle during a GLP-1 fat loss protocol?",
        a: "Four strategies, in priority order: (1) Protein intake — target 1g per pound of lean body mass daily. Non-negotiable. (2) Resistance training — maintain progressive overload throughout the protocol. You cannot preserve muscle with cardio alone. (3) GH peptide co-administration — CJC/Ipamorelin, MK-677, or Tesamorelin alongside the GLP-1. GH is anti-catabolic and lipolytic simultaneously. (4) Monitor composition — track body composition, not just scale weight.",
      },
      {
        q: "Do SARMs help with fat loss?",
        a: "SARMs are primarily anabolic (muscle-building) tools, but several produce meaningful body recomposition effects — simultaneous fat loss and lean mass gain. MK-2866 (Ostarine) and S-4 (Andarine) have the strongest recomposition profiles. RAD-140 and LGD-4033 are primarily mass-builders. SARMs are not appropriate fat loss tools for users above 22% BF who should prioritize GLP-1s. For leaner users (12–20% BF) targeting recomposition, SARMs are more relevant than GLP-1s.",
      },
      {
        q: "What body fat percentage should I aim for before transitioning off GLP-1s?",
        a: "A reasonable framework: reach a body fat level that is sustainable with lifestyle intervention (typically 12–18% for men, 18–25% for women), have established the dietary and training habits that will maintain that composition, then taper the GLP-1 gradually rather than stopping abruptly. Abrupt cessation leads to rapid appetite rebound.",
      },
    ],
  },
  "Muscle Gain": {
    icon: "💪",
    faqs: [
      {
        q: "What's the best stack for lean muscle gain?",
        a: "The most effective lean mass stack using Alki's full compound database: MK-2866 (Ostarine) or RAD-140 (AR anabolism, SARM tier) + MK-677 25mg/day (GH/IGF-1, oral, non-suppressive) + CJC/Ipamorelin pre-sleep (GH pulse amplification) + BPC-157 + TB-500 (connective tissue protection under increasing load). This covers three independent anabolic axes (AR, GH pulsatile, GH sustained) with a recovery foundation. Support layer: Nolvadex/Enclomiphene PCT after the SARM cycle; MK-677 and peptides continue through PCT.",
      },
      {
        q: "What's the difference between SARM-based and peptide-only muscle gain?",
        a: "SARM-based protocols produce more rapid, dramatic lean mass gains than peptide-only approaches — SARMs directly activate androgen receptors, the primary muscle protein synthesis signaling pathway. The trade-off is HPG axis suppression and PCT requirement. Peptide-only protocols (GH peptides + MK-677) are non-suppressive, run indefinitely, and produce gradual, sustained lean mass improvement — but the magnitude of gain per cycle is significantly lower than a SARM cycle. The choice depends on goals, experience, and how the user values the suppression/PCT trade-off.",
      },
      {
        q: "How do GH peptides and SARMs interact?",
        a: "They are mechanistically independent and highly complementary. SARMs activate androgen receptors to drive muscle protein synthesis via the mTOR pathway. GH peptides (CJC/Ipamorelin, MK-677) elevate IGF-1, which activates a separate but parallel muscle protein synthesis pathway. Running both simultaneously covers two independent anabolic axes. Importantly: MK-677 and injectable GH peptides do not add to SARM-related HPG suppression — they are non-suppressive and continue through PCT without complicating recovery.",
      },
      {
        q: "How important is training and diet alongside the protocol?",
        a: "They are the primary drivers — compounds are the multiplier, not the engine. SARMs amplify the anabolic signal, but there must be a progressive training stimulus for that signal to act on and adequate protein to build with. Without 1g+/lb lean mass protein intake and progressive resistance training, even aggressive SARM stacks produce suboptimal results. The user who optimizes training, diet, sleep, and then adds compounds sees dramatically better results than the one relying on compounds to compensate for lifestyle deficits.",
      },
    ],
  },
  Recovery: {
    icon: "🩹",
    faqs: [
      {
        q: "What's the fastest peptide protocol for an acute injury?",
        a: "For an acute injury: BPC-157 + TB-500 is the first-line combination. BPC-157 at 250–500mcg/day SubQ near the injury site for local angiogenesis and tissue repair. TB-500 at 2.5mg 2x/week for systemic healing and stem cell mobilization. Adding a GH peptide stack (CJC/Ipamorelin pre-sleep or MK-677 oral) amplifies the repair window during sleep. Expect meaningful functional improvement at 3–6 weeks, with continued benefit through 8–12 weeks.",
      },
      {
        q: "Does MK-677 help with recovery?",
        a: "Yes — MK-677's sustained IGF-1 elevation has meaningful recovery benefits. IGF-1 drives tissue repair at the cellular level, improves collagen synthesis in connective tissue, and supports joint health. Many users report significant joint comfort improvement on MK-677. It also dramatically improves sleep depth, which is the primary recovery window. For injury recovery, MK-677 pairs well with BPC-157/TB-500 as a systemic IGF-1 foundation.",
      },
      {
        q: "Do I need to stop training while using recovery peptides?",
        a: "Generally not — and continuing appropriate training is often beneficial. BPC-157 and TB-500 are active during normal physiological activity. Active rehabilitation typically produces better outcomes than complete rest. That said, appropriate load management is important — peptides accelerate healing but do not make you invincible. Don't use reduced pain from peptides as license to train through a serious structural injury.",
      },
    ],
  },
  "Anti-Aging": {
    icon: "⏳",
    faqs: [
      {
        q: "What's the best anti-aging peptide stack?",
        a: "A comprehensive anti-aging protocol targets multiple aging mechanisms simultaneously: GHK-Cu (topical and/or injectable) for collagen, skin quality, and gene activation. Ipamorelin + CJC-1295 or MK-677 for GH/IGF-1 restoration (GH declines ~14% per decade after 30). Epitalon for telomerase stimulation and pineal/melatonin regulation. Enclomiphene (if testosterone optimization needed) to maintain HPG axis without suppression. Pregnenolone for neurosteroid support and hormone precursor replenishment. The longevity stack is about maintaining function across multiple aging mechanisms simultaneously.",
      },
      {
        q: "Is MK-677 relevant for anti-aging?",
        a: "Yes — MK-677 is one of the most accessible and effective anti-aging tools in the database, specifically because it is oral, non-suppressive, and can be run indefinitely. GH/IGF-1 decline is one of the primary contributors to age-related body composition change (muscle loss, fat gain), joint degradation, and sleep disruption. MK-677 directly addresses the GH axis. For users over 35 who are uncomfortable with injectable GH peptides, MK-677 is the practical starting point for GH optimization.",
      },
      {
        q: "At what age is anti-aging peptide use appropriate?",
        a: "GH secretion begins declining in the late 20s–early 30s. GHK-Cu plasma levels begin declining measurably in the 30s. Practical guideline: GHK-Cu and collagen-focused compounds from the 30s onward; GH peptides most relevant from 35+ when natural output has declined meaningfully. Younger users with optimal natural hormone levels get minimal marginal benefit from GH peptides and some of the GH axis optimization is better served by sleep, training, and body composition optimization first.",
      },
    ],
  },
  "Skin Quality": {
    icon: "✨",
    faqs: [
      {
        q: "Which compounds specifically improve skin quality?",
        a: "GHK-Cu is the primary compound for skin quality — it directly stimulates collagen synthesis, elastin production, and has antioxidant properties. Topical GHK-Cu serums are backed by cosmetic research demonstrating measurable improvements in skin thickness, wrinkle depth, and elasticity. Tesamorelin and GH peptides (CJC/Ipamorelin, MK-677) improve skin indirectly via IGF-1 elevation — GH is a major regulator of collagen turnover throughout the body. Epithalon has documented effects on skin regeneration in aging biology research.",
      },
      {
        q: "Is topical GHK-Cu as effective as injectable for skin?",
        a: "For skin applications specifically, topical is the most evidence-supported route — the compound is applied directly to the target tissue and has documented penetration through the dermis. Injectable GHK-Cu provides systemic effects including body-wide collagen support, at the cost of injection administration. For users whose primary goal is facial skin quality, topical is likely sufficient.",
      },
    ],
  },
  Energy: {
    icon: "⚡",
    faqs: [
      {
        q: "Which compounds most directly improve energy levels?",
        a: "MK-677 has the most prominent energy-relevant effects in the database: it dramatically improves sleep architecture (GH-mediated deep sleep enhancement), and sustained IGF-1 elevation supports daytime energy and recovery quality. Users consistently report this as the most subjectively noticeable benefit. CJC/Ipamorelin produces similar sleep benefits via pre-sleep GH pulse amplification. For more direct CNS energy, the nootropic compounds in the expanded database (Flmodafinil, Bromantane, NALT) are purpose-built — but are outside the core peptide stack.",
      },
      {
        q: "Does MK-677 cause fatigue or improve energy?",
        a: "Both, depending on the phase. In the first 2–4 weeks, MK-677 causes lethargy in many users as the body adapts to higher GH/IGF-1 levels — this is temporary. After adaptation, the primary energy-relevant experience is improved sleep quality, which produces better next-day energy. The appetite increase from ghrelin agonism can also be disorienting initially. Most users report net positive energy and well-being after the initial adaptation period.",
      },
    ],
  },
  Performance: {
    icon: "🎯",
    faqs: [
      {
        q: "What's the best stack for athletic performance and recovery?",
        a: "BPC-157 + TB-500 for connective tissue durability and systemic recovery. Ipamorelin + CJC-1295 for sleep quality, lean mass accrual, and repair signal amplification. MK-677 as a non-suppressive GH/IGF-1 foundation that runs continuously. For more aggressive anabolic enhancement: MK-2866 (Ostarine) adds AR-mediated anabolism with mild suppression profile. This combination covers the full performance support spectrum: injury prevention (BPC-157), systemic healing (TB-500), body recomposition (GH peptides), sleep optimization (pre-sleep GH dosing), and sustained IGF-1 baseline (MK-677).",
      },
      {
        q: "Which compounds are WADA-banned for tested athletes?",
        a: "WADA-banned compounds in the Alki database: TB-500 (Thymosin Beta-4), all SARMs (MK-2866, RAD-140, LGD-4033, YK-11, S-23, S-4 etc.), GW-501516 (Cardarine), SR-9009/SR-9011, AICAR, IGF-1 LR3, HGH Fragment 176-191, Melanotan II. GH peptides (BPC-157, Ipamorelin, CJC-1295, Sermorelin, Tesamorelin) may also be prohibited under peptide hormone and growth factor categories depending on the sport and governing body. Tested athletes should assume any performance-enhancing compound is prohibited until verified otherwise with their specific governing body.",
      },
    ],
  },
};

// ── STACK FAQ DATA ─────────────────────────────────────────
const STACK_FAQS = [
  {
    stack: ["BPC-157", "TB-500"],
    label: "BPC-157 + TB-500",
    subtitle: "Gold Standard Recovery Stack",
    warning: false,
    faqs: [
      {
        q: "Why is BPC-157 + TB-500 considered the gold standard recovery stack?",
        a: "They operate through entirely different but complementary mechanisms with zero receptor overlap. BPC-157 drives local angiogenesis and tissue repair at the injury site — rebuilding blood supply to damaged tissue and activating tissue fibroblasts. TB-500 works systemically: binds G-actin, mobilizes stem cells from bone marrow, creates an anti-inflammatory environment body-wide. Together they cover all levels of the healing process: local vascular repair (BPC-157) + systemic cell recruitment and anti-inflammation (TB-500).",
      },
      {
        q: "Do I inject them at the same site or separately?",
        a: "They can be injected at the same site (the pre-mixed blend is available for this reason) or separately. BPC-157 benefits from injection near the injury site. TB-500's systemic mechanism means site doesn't matter — abdominal SubQ is convenient. If using separately: BPC-157 near the injury site daily, TB-500 anywhere SubQ twice weekly.",
      },
      {
        q: "Can I add a GH stack to this combination for maximum recovery?",
        a: "Yes — this is the most comprehensive peptide recovery stack: BPC-157 (local) + TB-500 (systemic) + CJC-1295/Ipamorelin (GH pulse during sleep) + MK-677 (sustained IGF-1 all day). GH and IGF-1 are key signals in tissue repair — they amplify protein synthesis in all tissues including connective tissue. The GH stack targets the sleep window; MK-677 maintains the IGF-1 environment throughout the day.",
      },
      {
        q: "Does this stack run through a SARM cycle?",
        a: "Yes — this is one of the most recommended additions to any SARM cycle. SARMs increase training load and strength faster than tendons and ligaments adapt, making connective tissue injury a meaningful risk. BPC-157/TB-500 running throughout the cycle, into PCT, and beyond is standard protocol for responsible SARM users. Neither compound interacts with the HPG axis or adds to suppression.",
      },
    ],
  },
  {
    stack: ["MK-677", "MK-2866 (Ostarine)"],
    label: "MK-677 + MK-2866",
    subtitle: "Beginner Stack — Dual Anabolic Axis, Clean PCT",
    warning: false,
    faqs: [
      {
        q: "Why is MK-677 + MK-2866 the recommended beginner SARM stack?",
        a: "This combination covers two independent anabolic axes with the best risk profile in the SARM category. MK-2866 provides AR-mediated anabolism with mild suppression and the most human clinical data of any SARM. MK-677 provides GH/IGF-1-mediated anabolism with zero suppression, zero PCT requirement, and oral administration. The combination produces body recomposition — simultaneous lean mass gain and modest fat loss — that exceeds what either compound achieves alone, without the aggressive suppression or side effect profile of RAD-140 or LGD-4033.",
      },
      {
        q: "How do I structure the cycle and PCT?",
        a: "MK-2866: 20mg/day oral, 10 weeks. MK-677: 25mg/day oral, continues through PCT and beyond indefinitely. PCT after MK-2866 cessation: Enclomiphene 12.5mg/day for 4 weeks or Nolvadex 20mg/day for 4 weeks. MK-677 runs through PCT without interruption — it is non-suppressive and can actually be considered supportive during the recovery period. Add BPC-157/TB-500 throughout to protect connective tissue.",
      },
      {
        q: "What results can I expect compared to RAD-140?",
        a: "Expect more modest results than RAD-140 — this is by design. MK-2866 + MK-677 over 10 weeks produces approximately 5–8 lbs of lean mass with a caloric surplus, with more gradual strength gains than RAD-140. The trade-off is significantly lower suppression, better tolerability, and a simpler recovery. For a first SARM cycle, this combination is the responsible entry point. Once individual response, bloodwork patterns, and PCT dynamics are understood, RAD-140 or LGD-4033 represents a logical escalation.",
      },
    ],
  },
  {
    stack: ["RAD-140 (Testolone)", "MK-677", "BPC-157", "TB-500"],
    label: "RAD-140 + MK-677 + BPC/TB",
    subtitle: "Optimal Lean Bulk — Intermediate",
    warning: false,
    faqs: [
      {
        q: "What makes this the optimal intermediate lean bulk stack?",
        a: "Three independent anabolic mechanisms with built-in recovery support and zero redundancy. RAD-140 drives AR-mediated anabolism — the primary muscle protein synthesis pathway. MK-677 drives GH/IGF-1-mediated anabolism — a completely separate pathway with no receptor overlap. BPC-157/TB-500 protects the connective tissue that will be under accelerating stress as strength increases rapidly. The support layer (Tadalafil, bloodwork, PCT infrastructure) makes the cycle sustainable. This is the architecture referenced in Stack 1 of the Umbrella Labs reference document.",
      },
      {
        q: "What does the full timeline look like?",
        a: "Weeks 1–10: RAD-140 10–15mg/day + MK-677 25mg/day + BPC-157 250–500mcg/day + TB-500 2.5mg 2x/week. Tadalafil 5mg/day throughout. TUDCA and NAC optional at this dose range but reasonable precaution. Weeks 11–14: PCT — Enclomiphene 12.5mg/day or Nolvadex 20mg/day. MK-677, BPC-157, TB-500 all continue through PCT without interruption. Week 14+: MK-677 continues indefinitely. 4 weeks post-PCT: Full bloodwork to confirm testosterone, LH, FSH recovery before considering next cycle.",
      },
      {
        q: "Should I add CJC/Ipamorelin to this stack?",
        a: "Yes, if injectable GH peptides are within the user's protocol comfort. CJC/Ipamorelin pre-sleep adds the pulsatile GH dimension that MK-677's continuous IGF-1 signal doesn't fully replicate. The combination of MK-677 (sustained IGF-1 baseline) + CJC/Ipamorelin (sharp sleep-window GH pulse) produces more total GH axis stimulation than either alone. The addition is non-suppressive and does not complicate PCT. The practical consideration is adding two more daily injections alongside BPC-157.",
      },
    ],
  },
  {
    stack: ["Semaglutide (GLP-1)", "Ipamorelin + CJC-1295"],
    label: "Semaglutide + GH Stack",
    subtitle: "GLP-1 Weight Loss + Lean Mass Preservation",
    warning: false,
    faqs: [
      {
        q: "Will the GH peptides help preserve muscle during Semaglutide weight loss?",
        a: "This is exactly what this combination is designed for. Semaglutide drives caloric restriction via appetite suppression, which creates catabolic pressure on muscle tissue. GH peptides (CJC/Ipamorelin or MK-677) are anti-catabolic — GH directly inhibits muscle protein breakdown and shifts the body toward fat oxidation as the primary energy substrate. Clinical data on GLP-1 therapy shows 25–40% of weight lost is lean mass without intervention — GH co-administration is the primary tool for improving that ratio.",
      },
      {
        q: "Do these compounds interact with each other?",
        a: "There is no known pharmacological interaction. They operate through completely independent receptor systems: GLP-1 receptor agonism vs. GHRH/ghrelin receptor systems. Semaglutide is administered weekly; CJC/Ipamorelin is administered pre-sleep; MK-677 is oral daily. These don't need to be timed together. There are no known contraindications for this combination.",
      },
      {
        q: "When should I start the GH stack relative to the GLP-1?",
        a: "Simultaneously, from the start of the protocol. Muscle catabolism begins immediately when a caloric deficit is created — there is no benefit to waiting to add the anti-catabolic layer. MK-677 is the simplest addition (oral, no additional injections), making it the lowest-friction lean mass preservation tool for GLP-1 users who are uncomfortable adding more injections.",
      },
    ],
  },
  {
    stack: ["Semaglutide (GLP-1)", "Retatrutide (GLP-3)"],
    label: "Semaglutide + Retatrutide",
    subtitle: "⚠️ Contraindicated — Do Not Combine",
    warning: true,
    faqs: [
      {
        q: "Can I combine Semaglutide with Retatrutide for maximum fat loss?",
        a: "This combination is contraindicated. Both compounds activate GLP-1 receptors — combining them creates receptor saturation without proportional benefit and dramatically increases side effect burden (nausea, vomiting, gastroparesis risk, dangerous hypoglycemia). The correct approach is to choose the more appropriate GLP agent based on your specific situation: Retatrutide for users who need aggressive intervention; Semaglutide for more moderate fat loss goals. Running both simultaneously is not a supported protocol.",
      },
    ],
  },
  {
    stack: ["RAD-140 (Testolone)", "LGD-4033 (Ligandrol)"],
    label: "RAD-140 + LGD-4033",
    subtitle: "⚠️ High Suppression — Advanced Users Only",
    warning: true,
    faqs: [
      {
        q: "Is stacking RAD-140 and LGD-4033 safe?",
        a: "This is a high-risk combination for most users. Both compounds are full AR agonists with significant suppression profiles — stacking them produces additive HPG suppression without an additive reduction in side effects. The increased risk of severe lipid impact, prolonged recovery, and liver enzyme elevation is not proportionally offset by muscle gains beyond what either alone provides at optimized doses. If you are considering this combination, bloodwork infrastructure (pre, mid, post-PCT), full PCT protocol, TUDCA/NAC throughout, and Tadalafil 5mg/day are non-negotiable. This is not appropriate as a first or second SARM cycle.",
      },
    ],
  },
];

// ── GENERAL FAQ DATA ───────────────────────────────────────
const GENERAL_FAQS = [
  {
    category: "Reconstitution & Storage",
    icon: "🧪",
    faqs: [
      {
        q: "How do I reconstitute lyophilized peptides?",
        a: "Step-by-step: (1) Allow the vial to come to room temperature before opening. (2) Draw your desired volume of bacteriostatic water into an insulin syringe. (3) Inject the bacteriostatic water slowly along the inside wall of the peptide vial — not directly onto the powder. (4) Allow the peptide to dissolve without shaking. Gently swirl if needed. (5) Label the vial with the compound, concentration, and reconstitution date. Refrigerate at 2–8°C and use within 30 days.",
      },
      {
        q: "What is bacteriostatic water and why use it instead of regular water?",
        a: "Bacteriostatic water is sterile water containing 0.9% benzyl alcohol. The benzyl alcohol prevents bacterial growth in the vial between uses — essential for multi-use peptide vials. Regular sterile water (for injection) has no preservative and should only be used in single-use contexts. Bacteriostatic water enables multi-use over the peptide's refrigerated shelf life (typically 30 days after reconstitution).",
      },
      {
        q: "How do I calculate my dose from a reconstituted vial?",
        a: "Example: 5mg BPC-157 vial + 2mL bacteriostatic water = 2,500 mcg/mL. To dose 500 mcg: 500 ÷ 2,500 = 0.2mL = 20 units on a U-100 insulin syringe. Formula: Desired dose (mcg) ÷ Concentration (mcg/mL) = Volume (mL). Convert to units by multiplying mL × 100 for U-100 syringes.",
      },
      {
        q: "What needle size should I use for SubQ peptide injections?",
        a: "Standard: 27–31 gauge, 0.5 inch (13mm) insulin needle. This gauge is thin enough to be nearly painless while maintaining adequate flow for peptide solutions. Injection sites: abdomen (most common), outer thigh, lateral hip. Rotate sites to prevent tissue trauma. Clean the injection site with an alcohol swab and allow to dry before injecting.",
      },
    ],
  },
  {
    category: "SubQ Injection Technique",
    icon: "💉",
    faqs: [
      {
        q: "How do I perform a subcutaneous injection correctly?",
        a: "Step-by-step: (1) Wash hands thoroughly. (2) Swab injection site with alcohol, allow to dry 30 seconds. (3) Pinch a fold of skin at the injection site (abdomen, outer thigh). (4) Insert needle at a 45–90° angle. (5) Inject the solution slowly and steadily. (6) Withdraw needle and apply gentle pressure with a clean swab (do not rub). (7) Dispose of needle in a sharps container. The needles are very fine — the physical sensation is minimal with proper technique.",
      },
      {
        q: "What should I do if I hit a blood vessel?",
        a: "If blood appears in the syringe when you aspirate (pull back slightly on plunger), withdraw the needle, apply pressure, discard the syringe, and draw a fresh dose with a new needle. SubQ injections have very low risk of intravascular administration — the SubQ tissue layer has minimal vasculature.",
      },
      {
        q: "How do I manage injection site reactions?",
        a: "Minor redness, swelling, or itching at the injection site is normal and typically resolves within 24 hours. Rotating injection sites prevents accumulated irritation. Significant swelling, warmth, or signs of infection (spreading redness, fever, discharge) warrant medical attention immediately.",
      },
    ],
  },
  {
    category: "Bloodwork & Monitoring",
    icon: "🩺",
    faqs: [
      {
        q: "What is the minimum bloodwork I should run before any protocol?",
        a: "For peptide-only protocols: comprehensive metabolic panel (CMP), CBC, fasting glucose, and HbA1c. For GH peptides: add IGF-1. For GLP-1s: add lipid panel, TSH. For SARM protocols: full hormone panel including total testosterone, free testosterone, LH, FSH, estradiol, SHBG, PLUS ALT/AST (liver) and full lipid panel. Bloodwork is the only real safety net — it's not optional for responsible SARM use.",
      },
      {
        q: "What does IGF-1 testing tell me about my GH peptide protocol?",
        a: "IGF-1 is the most useful biomarker for assessing GH peptide efficacy. Unlike GH itself (which spikes and falls rapidly), IGF-1 reflects cumulative GH output over approximately 24 hours. A successful GH peptide or MK-677 protocol should produce measurable IGF-1 elevation from your baseline. If IGF-1 is unchanged after 8+ weeks, assess: timing relative to meals (GH is suppressed by insulin), injection technique, compound quality.",
      },
      {
        q: "What does the bloodwork timeline look like for a SARM cycle?",
        a: "Pre-cycle: Full hormone panel (Total T, Free T, LH, FSH, Estradiol, SHBG), ALT/AST, lipid panel (LDL/HDL/TG), CBC. Mid-cycle (week 5–6): ALT/AST, Estradiol, blood pressure check. Post-PCT (4 weeks after PCT completion): Full pre-cycle panel repeat — verify testosterone, LH, and FSH have returned to pre-cycle baseline. This post-PCT check is non-negotiable. Do not start another cycle until this confirms recovery.",
      },
      {
        q: "What should I look for in lipid panel results?",
        a: "Key markers: LDL-C (target below 100 mg/dL for general health). HDL-C (target above 40 mg/dL for men, 50 mg/dL for women — SARMs typically lower HDL meaningfully). Triglycerides (target below 150 mg/dL). SARMs can worsen lipid profiles significantly — LDL up, HDL down. Tadalafil 5mg/day and omega-3 supplementation are standard cardiovascular support measures during a SARM cycle.",
      },
    ],
  },
  {
    category: "PCT — Post-Cycle Therapy",
    icon: "🔁",
    faqs: [
      {
        q: "Do peptides require PCT?",
        a: "No. None of the eight original core compounds and none of the GH peptides in the expanded database suppress the HPG axis. GH peptides, GLP-1s, BPC-157, TB-500, GHK-Cu, and PT-141 can all be stopped without a PCT protocol. MK-677 is non-suppressive and requires no PCT. PCT is required for AR-active SARMs only.",
      },
      {
        q: "Which SARMs require PCT and how aggressive does it need to be?",
        a: "All AR-active SARMs require some PCT. Graduated by suppression severity: MK-2866 (Ostarine) — mild suppression, 4 weeks Nolvadex 20mg or Enclomiphene 12.5mg is sufficient. RAD-140 — moderate-high suppression, 4–6 weeks full SERM PCT. LGD-4033 — similar to RAD-140, 4–6 weeks. YK-11 / S-23 — near-complete shutdown, 6 weeks aggressive SERM PCT, consider double SERM (Nolvadex + Enclomiphene together) and extended monitoring. PCT duration and intensity should match suppression severity.",
      },
      {
        q: "What's the difference between Nolvadex and Enclomiphene for PCT?",
        a: "Both are SERMs that block estrogen receptors at the hypothalamus, stimulating LH/FSH production and testosterone recovery. Enclomiphene is the preferred choice: it is the pure active trans-isomer of clomiphene without the zuclomiphene isomer responsible for mood crashes, visual disturbances, and emotional instability seen with racemic Clomid. Nolvadex (Tamoxifen) is a valid alternative — decades of clinical data, effective, and affordable. Use Enclomiphene when available; Nolvadex is a solid fallback.",
      },
      {
        q: "Can I run anything during PCT to maintain gains?",
        a: "Yes — and this is where MK-677 proves its value. As a non-suppressive GH secretagogue, MK-677 runs continuously through cycles and PCT without complicating HPG recovery. It maintains IGF-1 elevation, preserves sleep quality, and supports tissue integrity during the post-cycle period when natural testosterone is recovering. BPC-157 and TB-500 also continue through PCT without interruption. These three compounds are the standard 'PCT bridge' layer in the Alki protocol.",
      },
      {
        q: "How long should I wait between SARM cycles?",
        a: "Standard guideline: time off equals time on. If a cycle was 10 weeks, wait 10 weeks before starting the next (this period includes PCT). More conservatively: wait until bloodwork confirms LH, FSH, and testosterone have returned to pre-cycle baseline — which should occur within 4–8 weeks post-PCT for most users on mild-moderate SARMs. Running another cycle before confirming HPG axis recovery risks compounding suppression that becomes progressively harder to reverse.",
      },
    ],
  },
  {
    category: "Sourcing & Quality",
    icon: "🔬",
    faqs: [
      {
        q: "How do I evaluate the quality of a supplier?",
        a: "Key quality indicators: (1) Certificate of Analysis (CoA) — every batch should have an independently verified CoA showing purity percentage (target 98%+) and compound identity confirmation. (2) HPLC testing documentation — High-Performance Liquid Chromatography is the standard purity verification method. (3) Third-party lab testing — in-house testing is a conflict of interest; reputable suppliers use independent labs. (4) Clear 'research use only' labeling. (5) Reputation and community verification in established forums with long verification histories.",
      },
      {
        q: "What are the risks of sourcing from low-quality suppliers?",
        a: "Primary risks: (1) Incorrect compound — receiving a different compound than labeled is documented and consequential. (2) Contamination — bacterial endotoxins in improperly manufactured peptides can cause significant systemic inflammation, fever, and serious adverse reactions. (3) Underdosing — receiving less of the active compound than labeled, leading to wasted resources and ineffective protocols. (4) Undisclosed excipients or solvents. Quality verification is the most important non-protocol decision in any research compound use.",
      },
      {
        q: "What does 'for research use only' mean legally?",
        a: "'Research use only' is the legal designation for compounds that have not received FDA approval for human therapeutic use in the indications they're being sold for. This designation allows suppliers to legally sell compounds without making therapeutic claims. The regulatory environment is active — the FDA issued 50+ warning letters to peptide vendors and compounders in 2024–2025, and federal agents raided major domestic peptide resellers in 2025. The gray market is being squeezed. Alki operates as an information platform within this framework; users who choose to use these compounds do so outside established medical care.",
      },
    ],
  },
  {
    category: "Using the Cycle Timeline",
    icon: "📅",
    faqs: [
      {
        q: "What does the Cycle Timeline show?",
        a: "The Cycle Timeline screen (accessible from the dashboard) generates a week-by-week visual schedule for any stack you've built. It maps compound start/stop dates, PCT windows, support compound phases, bloodwork check points, and the MK-677/peptide continuation layer through PCT. It is the scheduling layer that turns a compound selection into an actionable protocol calendar.",
      },
      {
        q: "How do I use the Cycle Timeline effectively?",
        a: "Select your compounds on the dashboard, then tap the Timeline button in the header. The timeline renders your stack's schedule from cycle start through post-PCT bloodwork confirmation. Use it to identify: when PCT begins relative to the last SARM dose, which compounds continue through PCT, when mid-cycle bloodwork should be drawn, and the total time commitment of the full protocol before the next cycle is cleared to start.",
      },
    ],
  },
];

// ── COMPONENT ──────────────────────────────────────────────
const TABS = ["Compound", "Goal", "Stack", "General"];

const ACCENT = "#22d68a";
const ACCENT_DIM = "rgba(34,214,138,0.08)";
const ACCENT_BORDER = "rgba(34,214,138,0.2)";

// ── #18 — contextual scoping: match the user's stack (compound display names)
// to COMPOUND_FAQS keys via normalized substring (handles "RAD-140 (Testolone)" etc.)
const _normFaq = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
function stackFaqKeysFor(contextCompounds) {
  if (!contextCompounds || !contextCompounds.length) return [];
  const ctx = contextCompounds.map(_normFaq).filter(Boolean);
  return Object.keys(COMPOUND_FAQS).filter((k) => {
    const kn = _normFaq(k);
    return ctx.some((c) => kn.includes(c) || c.includes(kn));
  });
}

export default function AlkiProtocolQA({ onBack, activeCompound, activeGoal, contextCompounds = [] }) {
  const initStackKeys = stackFaqKeysFor(contextCompounds);
  const initTab = (activeCompound || initStackKeys.length) ? "Compound" : activeGoal ? "Goal" : "Compound";
  const [tab, setTab] = useState(initTab);
  const [selectedCompound, setSelectedCompound] = useState(
    activeCompound && COMPOUND_FAQS[activeCompound]
      ? activeCompound
      : (initStackKeys[0] || Object.keys(COMPOUND_FAQS)[0])
  );
  const [selectedGoal, setSelectedGoal] = useState(
    activeGoal && GOAL_FAQS[activeGoal] ? activeGoal : Object.keys(GOAL_FAQS)[0]
  );
  const [selectedStack, setSelectedStack] = useState(0);
  const [selectedGeneral, setSelectedGeneral] = useState(0);
  const [openItems, setOpenItems] = useState({});
  const [search, setSearch] = useState("");
  const [showAllCompounds, setShowAllCompounds] = useState(false); // #18
  const stackKeys = useMemo(() => stackFaqKeysFor(contextCompounds), [contextCompounds]); // #18
  const stackKeySet = useMemo(() => new Set(stackKeys), [stackKeys]);

  const toggleItem = (key) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results = [];
    Object.entries(COMPOUND_FAQS).forEach(([compound, data]) => {
      data.faqs.forEach((faq, i) => {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          results.push({ key: `c-${compound}-${i}`, source: compound, category: "Compound", ...faq });
        }
      });
    });
    Object.entries(GOAL_FAQS).forEach(([goal, data]) => {
      data.faqs.forEach((faq, i) => {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          results.push({ key: `g-${goal}-${i}`, source: goal, category: "Goal", ...faq });
        }
      });
    });
    STACK_FAQS.forEach((stack, si) => {
      stack.faqs.forEach((faq, i) => {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          results.push({ key: `s-${si}-${i}`, source: stack.label, category: "Stack", ...faq });
        }
      });
    });
    GENERAL_FAQS.forEach((cat, ci) => {
      cat.faqs.forEach((faq, i) => {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          results.push({ key: `gen-${ci}-${i}`, source: cat.category, category: "General", ...faq });
        }
      });
    });
    return results;
  }, [search]);

  const currentCompound = COMPOUND_FAQS[selectedCompound];
  const currentGoal = GOAL_FAQS[selectedGoal];
  const currentStack = STACK_FAQS[selectedStack];
  const currentGeneral = GENERAL_FAQS[selectedGeneral];

  return (
    <div style={S.root}>
      {/* Screen header */}
      <div style={S.screenHeader}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <span style={S.screenTitle}>Protocol Q&A</span>
        <span style={S.wordmark}>ALKI</span>
      </div>

      {/* Search */}
      <div style={S.searchWrap}>
        <span style={S.searchIcon}>⌕</span>
        <input
          style={S.searchInput}
          placeholder="Search all Q&A…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpenItems({}); }}
        />
        {search && (
          <button style={S.clearBtn} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {searchResults ? (
        <div style={S.body}>
          <div style={S.searchMeta}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </div>
          {searchResults.length === 0 ? (
            <div style={S.empty}>No results found. Try different keywords.</div>
          ) : (
            searchResults.map((r) => (
              <div key={r.key} style={{ marginBottom: 8 }}>
                <div style={S.searchResultMeta}>
                  <span style={S.badge}>{r.category}</span>
                  <span style={S.badgeSource}>{r.source}</span>
                </div>
                <FAQItem faq={r} id={r.key} openItems={openItems} toggle={toggleItem} />
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={S.tabBar}>
            {TABS.map((t) => (
              <button
                key={t}
                style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
                onClick={() => { setTab(t); setOpenItems({}); }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={S.twoCol}>
            {/* Sidebar */}
            <div style={S.sidebar}>
              {tab === "Compound" && (stackKeys.length === 0
                ? Object.entries(COMPOUND_FAQS).map(([name, data]) => (
                    <SidebarBtn
                      key={name}
                      active={selectedCompound === name}
                      onClick={() => { setSelectedCompound(name); setOpenItems({}); }}
                      label={name}
                      sub={data.category}
                    />
                  ))
                : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#22d68a", padding: "2px 4px 8px" }}>Your Stack</div>
                    {Object.entries(COMPOUND_FAQS).filter(([n]) => stackKeySet.has(n)).map(([name, data]) => (
                      <SidebarBtn
                        key={name}
                        active={selectedCompound === name}
                        onClick={() => { setSelectedCompound(name); setOpenItems({}); }}
                        label={name}
                        sub={data.category}
                      />
                    ))}
                    {Object.keys(COMPOUND_FAQS).length > stackKeys.length && (
                      <button
                        onClick={() => setShowAllCompounds((v) => !v)}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "10px 4px 6px" }}
                      >
                        {showAllCompounds ? "− Hide other compounds" : `+ Show all compounds (${Object.keys(COMPOUND_FAQS).length - stackKeys.length})`}
                      </button>
                    )}
                    {showAllCompounds && Object.entries(COMPOUND_FAQS).filter(([n]) => !stackKeySet.has(n)).map(([name, data]) => (
                      <SidebarBtn
                        key={name}
                        active={selectedCompound === name}
                        onClick={() => { setSelectedCompound(name); setOpenItems({}); }}
                        label={name}
                        sub={data.category}
                      />
                    ))}
                  </>
                )
              )}
              {tab === "Goal" && Object.entries(GOAL_FAQS).map(([goal, data]) => (
                <SidebarBtn
                  key={goal}
                  active={selectedGoal === goal}
                  onClick={() => { setSelectedGoal(goal); setOpenItems({}); }}
                  label={goal}
                  icon={data.icon}
                />
              ))}
              {tab === "Stack" && STACK_FAQS.map((stack, i) => (
                <SidebarBtn
                  key={i}
                  active={selectedStack === i}
                  onClick={() => { setSelectedStack(i); setOpenItems({}); }}
                  label={stack.label}
                  sub={stack.warning ? "⚠ Contraindicated" : stack.subtitle}
                  warn={stack.warning}
                />
              ))}
              {tab === "General" && GENERAL_FAQS.map((cat, i) => (
                <SidebarBtn
                  key={i}
                  active={selectedGeneral === i}
                  onClick={() => { setSelectedGeneral(i); setOpenItems({}); }}
                  label={cat.category}
                  icon={cat.icon}
                />
              ))}
            </div>

            {/* Main content */}
            <div style={S.main}>
              {tab === "Compound" && (
                <>
                  <div style={S.contentHeader}>
                    <div>
                      <div style={S.contentTitle}>{selectedCompound}</div>
                      <div style={S.contentSub}>{currentCompound.tagline}</div>
                    </div>
                    <span style={{
                      ...S.catBadge,
                      background: currentCompound.catColor + "18",
                      color: currentCompound.catColor,
                    }}>
                      {currentCompound.category}
                    </span>
                  </div>
                  <div style={S.faqCount}>{currentCompound.faqs.length} questions</div>
                  {currentCompound.faqs.map((faq, i) => (
                    <FAQItem key={i} faq={faq} id={`c-${selectedCompound}-${i}`} openItems={openItems} toggle={toggleItem} />
                  ))}
                </>
              )}

              {tab === "Goal" && (
                <>
                  <div style={S.contentHeader}>
                    <div>
                      <div style={S.goalEmoji}>{currentGoal.icon}</div>
                      <div style={S.contentTitle}>{selectedGoal}</div>
                      <div style={S.contentSub}>Goal-based protocol guidance</div>
                    </div>
                  </div>
                  <div style={S.faqCount}>{currentGoal.faqs.length} questions</div>
                  {currentGoal.faqs.map((faq, i) => (
                    <FAQItem key={i} faq={faq} id={`g-${selectedGoal}-${i}`} openItems={openItems} toggle={toggleItem} />
                  ))}
                </>
              )}

              {tab === "Stack" && (
                <>
                  {currentStack.warning && (
                    <div style={S.warnBanner}>⚠ This combination is contraindicated — do not use</div>
                  )}
                  <div style={S.contentHeader}>
                    <div>
                      <div style={S.contentTitle}>{currentStack.label}</div>
                      <div style={S.contentSub}>{currentStack.subtitle}</div>
                    </div>
                  </div>
                  <div style={S.stackPills}>
                    {currentStack.stack.map((c) => (
                      <span key={c} style={S.stackPill}>{c}</span>
                    ))}
                  </div>
                  <div style={S.faqCount}>{currentStack.faqs.length} question{currentStack.faqs.length !== 1 ? "s" : ""}</div>
                  {currentStack.faqs.map((faq, i) => (
                    <FAQItem key={i} faq={faq} id={`s-${selectedStack}-${i}`} openItems={openItems} toggle={toggleItem} />
                  ))}
                </>
              )}

              {tab === "General" && (
                <>
                  <div style={S.contentHeader}>
                    <div>
                      <div style={S.goalEmoji}>{currentGeneral.icon}</div>
                      <div style={S.contentTitle}>{currentGeneral.category}</div>
                      <div style={S.contentSub}>Protocol fundamentals</div>
                    </div>
                  </div>
                  <div style={S.faqCount}>{currentGeneral.faqs.length} questions</div>
                  {currentGeneral.faqs.map((faq, i) => (
                    <FAQItem key={i} faq={faq} id={`gen-${selectedGeneral}-${i}`} openItems={openItems} toggle={toggleItem} />
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div style={S.disclaimer}>{DISCLAIMER}</div>
    </div>
  );
}

// ── FAQ ITEM ───────────────────────────────────────────────
function FAQItem({ faq, id, openItems, toggle }) {
  const isOpen = !!openItems[id];
  return (
    <div style={{ ...S.faqItem, ...(isOpen ? S.faqItemOpen : {}) }}>
      <button style={S.faqQ} onClick={() => toggle(id)}>
        <span style={S.faqQText}>{faq.q}</span>
        <span style={{ ...S.chevron, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {isOpen && (
        <div style={S.faqA}>
          <div style={S.faqAText}>{faq.a}</div>
          <div style={S.faqADisclaimer}>For research and educational purposes only. Not medical advice.</div>
        </div>
      )}
    </div>
  );
}

// ── SIDEBAR BUTTON ─────────────────────────────────────────
function SidebarBtn({ active, onClick, label, sub, icon, warn }) {
  return (
    <button
      style={{
        ...S.sidebarBtn,
        ...(active ? S.sidebarBtnActive : {}),
        ...(warn ? { borderLeftColor: "#ef4444" } : {}),
      }}
      onClick={onClick}
    >
      {icon && <span style={S.sidebarIcon}>{icon}</span>}
      <span style={S.sidebarLabel}>{label}</span>
      {sub && <span style={{ ...S.sidebarSub, ...(warn ? { color: "#ef4444" } : {}) }}>{sub}</span>}
    </button>
  );
}

// ── STYLES ─────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e8e8e8",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    display: "flex",
    flexDirection: "column",
    maxWidth: 480,
    margin: "0 auto",
  },
  screenHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 12px",
    borderBottom: "1px solid #1a1a1a",
    flexShrink: 0,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
  },
  wordmark: {
    fontSize: 16,
    fontWeight: 800,
    color: ACCENT,
    letterSpacing: "0.12em",
  },
  searchWrap: {
    position: "relative",
    padding: "12px 20px",
    flexShrink: 0,
  },
  searchIcon: {
    position: "absolute",
    left: 32,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#555",
    fontSize: 18,
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    color: "#e8e8e8",
    fontSize: 14,
    padding: "11px 36px 11px 38px",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  clearBtn: {
    position: "absolute",
    right: 28,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: 13,
    padding: 4,
  },
  tabBar: {
    display: "flex",
    padding: "0 20px",
    borderBottom: "1px solid #1a1a1a",
    flexShrink: 0,
    overflowX: "auto",
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#555",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    padding: "12px 14px",
    whiteSpace: "nowrap",
    transition: "color 0.15s, border-color 0.15s",
  },
  tabActive: {
    color: ACCENT,
    borderBottomColor: ACCENT,
  },
  twoCol: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    width: 160,
    minWidth: 140,
    borderRight: "1px solid #1a1a1a",
    overflowY: "auto",
    padding: "8px 0",
    flexShrink: 0,
  },
  sidebarBtn: {
    width: "100%",
    background: "none",
    border: "none",
    borderLeft: "2px solid transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "9px 14px",
    gap: 2,
    textAlign: "left",
  },
  sidebarBtnActive: {
    backgroundColor: ACCENT_DIM,
    borderLeftColor: ACCENT,
  },
  sidebarIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  sidebarLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#ccc",
    fontFamily: "inherit",
    lineHeight: 1.3,
  },
  sidebarSub: {
    fontSize: 10,
    color: "#444",
    fontFamily: "inherit",
    lineHeight: 1.3,
  },
  main: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
  },
  contentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 10,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  contentSub: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },
  catBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 20,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  goalEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  stackPills: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    margin: "8px 0 12px",
  },
  stackPill: {
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: 20,
    backgroundColor: ACCENT_DIM,
    color: ACCENT,
    border: `1px solid ${ACCENT_BORDER}`,
  },
  warnBanner: {
    backgroundColor: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 14,
  },
  faqCount: {
    fontSize: 11,
    color: "#333",
    marginBottom: 10,
    marginTop: 4,
  },
  faqItem: {
    borderRadius: 10,
    border: "1px solid #1a1a1a",
    marginBottom: 6,
    overflow: "hidden",
  },
  faqItemOpen: {
    borderColor: ACCENT_BORDER,
  },
  faqQ: {
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    padding: "13px 14px",
    textAlign: "left",
    fontFamily: "inherit",
  },
  faqQText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#ccc",
    lineHeight: 1.5,
    flex: 1,
  },
  chevron: {
    color: "#444",
    fontSize: 15,
    flexShrink: 0,
    marginTop: 1,
    transition: "transform 0.2s",
  },
  faqA: {
    padding: "0 14px 14px",
    borderTop: "1px solid #1a1a1a",
  },
  faqAText: {
    fontSize: 13,
    color: "#888",
    lineHeight: 1.75,
    paddingTop: 12,
  },
  faqADisclaimer: {
    fontSize: 10,
    color: "#2a2a2a",
    marginTop: 10,
    fontStyle: "italic",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 20px",
  },
  searchMeta: {
    fontSize: 12,
    color: "#444",
    marginBottom: 12,
    fontWeight: 600,
  },
  empty: {
    textAlign: "center",
    color: "#333",
    fontSize: 14,
    paddingTop: 40,
  },
  searchResultMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 4,
  },
  badge: {
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 20,
    backgroundColor: ACCENT_DIM,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  badgeSource: {
    fontSize: 11,
    color: "#444",
    fontWeight: 600,
  },
  disclaimer: {
    padding: "14px 20px",
    fontSize: 10,
    color: "#2a2a2a",
    lineHeight: 1.6,
    borderTop: "1px solid #111",
    textAlign: "center",
    flexShrink: 0,
  },
};
