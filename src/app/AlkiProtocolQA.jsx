"use client";
import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════
// ALKI — PROTOCOL Q&A ENGINE
// Contextual FAQ surface: per-compound, per-goal, stack-aware, general
// Drop in as a screen from Dashboard or Transform view.
// Props:
//   onBack         — () => void   — back navigation callback
//   activeCompound — string|null  — pre-select a compound tab
//   activeGoal     — string|null  — pre-select a goal tab
// ═══════════════════════════════════════════════════════════

const DISCLAIMER =
  "All information is for research and educational purposes only. Nothing here constitutes medical advice, diagnosis, or treatment. Consult a licensed healthcare provider before initiating any peptide protocol. Alki assumes no liability for user decisions.";

// ── COMPOUND FAQ DATA ──────────────────────────────────────
const COMPOUND_FAQS = {
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
        a: "BPC-157 is non-suppressive, non-hormonal, and has no known dependency or tolerance mechanism. Continuous use during an active injury or recovery phase is the common approach. Many users run it for 4–8 weeks, take a break, and reassess. There is no established clinical reason a cycle break is mandatory — this is a protocol preference, not a safety requirement. Extended continuous use has not been studied in humans at therapeutic doses, so periodic breaks are a reasonable precaution.",
      },
      {
        q: "SubQ or intramuscular (IM) injection — which is better?",
        a: "SubQ injection into the fat layer near the injury site is the standard and preferred route. It's lower-risk, less painful, and clinically adequate. IM may theoretically deliver faster local concentration but carries higher discomfort and minor complication risk. Insulin needles (27–31g, 0.5 inch) are standard for SubQ. For gut applications, oral administration is a viable alternative.",
      },
      {
        q: "Can I stack BPC-157 with TB-500?",
        a: "Yes — this is one of the most well-regarded peptide combinations. BPC-157 provides localized angiogenesis and tissue repair at the injury site. TB-500 provides systemic healing, stem cell mobilization, and anti-inflammatory signaling throughout the body. They hit different biological targets with no receptor overlap. The combination is particularly effective for stubborn tendon, ligament, and joint injuries where both local and systemic healing support is beneficial.",
      },
      {
        q: "Does BPC-157 need to be reconstituted? How do I do that?",
        a: "Yes. BPC-157 is lyophilized (freeze-dried powder) and must be reconstituted with bacteriostatic water before injection. Add bacteriostatic water slowly along the inside wall of the vial — not directly onto the powder. Gently swirl (do not shake). Example: 2mL bacteriostatic water into a 5mg vial gives 2,500 mcg/mL; drawing 0.2mL gives a 500 mcg dose. Refrigerate reconstituted peptide; use within 30 days.",
      },
      {
        q: "Should I get any bloodwork before starting BPC-157?",
        a: "BPC-157 is non-hormonal and non-suppressive, so a full hormone panel is not required. Basic pre-protocol bloodwork worth considering: CMP (comprehensive metabolic panel) for liver and kidney baselines, and a CBC. This is precautionary due diligence. If you're stacking BPC-157 with suppressive compounds, bloodwork requirements are driven by those compounds, not BPC-157 itself.",
      },
      {
        q: "Is BPC-157 liver-toxic?",
        a: "No liver toxicity has been documented with BPC-157 at standard doses. Preclinical data actually suggests hepatoprotective properties. It does not share the liver-stress profile of oral SARMs like YK-11 or LGD-4033. Standard liver support compounds (TUDCA, NAC) are not indicated for BPC-157 use alone.",
      },
      {
        q: "Are there any documented contraindications or safety concerns?",
        a: "No human clinical trials have been completed for BPC-157. All evidence is preclinical or anecdotal. Key consideration: some theoretical concern about angiogenesis in individuals with active cancers or pre-cancerous conditions, since new blood vessel formation could theoretically support tumor growth. Individuals with active malignancy should not use BPC-157 without physician guidance. Not appropriate for pregnant or breastfeeding individuals.",
      },
      {
        q: "Will BPC-157 show up on a drug test?",
        a: "BPC-157 is not currently on the WADA prohibited list (unlike TB-500, which is WADA-banned). For standard employment or legal drug testing, BPC-157 is not screened for. Athletes subject to sports drug testing should verify their specific sport's governing body rules, as lists evolve.",
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
        a: "Standard research dosing: a loading phase of 4–8mg per week (split into two injections of 2–2.5mg each) for the first 4–6 weeks, followed by a maintenance phase of 2–4mg per week. Some protocols use front-loaded weekly dosing (4–5mg/week) during loading. Subcutaneous injection is standard. The twice-weekly split is preferred for more consistent plasma levels.",
      },
      {
        q: "Can TB-500 be used alone, or does it need BPC-157?",
        a: "TB-500 can be used as a standalone — it has meaningful systemic healing properties on its own, particularly for widespread inflammation, muscle tears, and conditions requiring body-wide recovery support. However, the TB-500 + BPC-157 stack is significantly more comprehensive: TB-500 handles systemic healing and stem cell mobilization while BPC-157 handles localized angiogenesis and tissue repair. Solo TB-500 is a reasonable choice when injury is diffuse rather than site-specific.",
      },
      {
        q: "Is TB-500 WADA-banned?",
        a: "Yes. TB-500 (Thymosin Beta-4) is on the WADA prohibited list under peptide hormones and growth factors. Competitive athletes subject to anti-doping testing should not use it. Note that WADA bans extend to substances used both in and out of competition for certain categories. Always verify current prohibited list status with your sport's governing body.",
      },
      {
        q: "How long before TB-500 produces noticeable effects?",
        a: "Most users report noticeable improvement in mobility, flexibility, and reduced inflammation within 2–4 weeks of consistent use. More significant structural repair — tendon integrity, muscle tear recovery — typically shows clear progress by weeks 4–8. TB-500's systemic nature means it can simultaneously improve multiple areas, which is one of its most valued properties.",
      },
      {
        q: "Are there cancer concerns with TB-500?",
        a: "This is a legitimate consideration. Thymosin Beta-4 plays a role in cell migration and angiogenesis — mechanisms that, in the context of malignant cells, could theoretically support tumor growth or metastasis. This has not been demonstrated in clinical practice at research peptide doses, but the theoretical mechanism exists. Individuals with active cancer or a recent cancer diagnosis should not use TB-500 without oncology consultation.",
      },
      {
        q: "Can TB-500 help with neurological injury?",
        a: "There is preclinical (animal) research suggesting Thymosin Beta-4 has neuroprotective and neurogenic properties — including research in TBI and stroke models. This is an emerging research area with no human clinical data. Users exploring TB-500 for neurological injury should be aware this is extrapolation from animal models.",
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
        a: "They work through complementary, synergistic mechanisms. CJC-1295 (No DAC) is a GHRH analog — it signals the pituitary to be ready to release GH. Ipamorelin is a GHRP (ghrelin receptor agonist) that directly triggers the GH pulse. Combined, the resulting GH release is 5–10x larger than either compound produces alone. It's a two-key system: GHRH loads the gun, GHRP pulls the trigger. The CJC/Ipamorelin stack at 100/100–200/200 mcg pre-sleep is the gold standard GH peptide protocol.",
      },
      {
        q: "CJC-1295 with DAC vs. without DAC — which should I use?",
        a: "For most users: CJC-1295 No DAC. No DAC produces sharp, physiological GH pulses that mimic natural pulsatile release — more effective for body composition and better for long-term pituitary health. CJC-1295 with DAC has an ~8-day half-life providing sustained GH elevation, but can lead to pituitary desensitization with extended use. No DAC is dosed pre-sleep; DAC is weekly. Default to No DAC.",
      },
      {
        q: "What is Ipamorelin's advantage over other GHRPs like GHRP-6?",
        a: "Ipamorelin is the cleanest GHRP available. Unlike GHRP-6 and GHRP-2, which stimulate cortisol and prolactin alongside GH release, Ipamorelin selectively triggers GH release with minimal to no impact on cortisol or prolactin. No unwanted stress hormone elevation, no prolactin-related side effects, no excessive hunger. For a standard recomp or recovery stack, Ipamorelin's selectivity makes it the preferred GHRP.",
      },
      {
        q: "When should I take the stack and why pre-sleep?",
        a: "Pre-sleep dosing (30–60 minutes before bed) aligns with the body's largest natural GH pulse, which occurs during deep slow-wave sleep. Amplifying this pulse rather than adding artificial pulses at random times produces the most physiological and effective outcome. Take on an empty stomach — elevated blood glucose or insulin suppresses GH release. Avoid carbohydrates for 2 hours before dosing.",
      },
      {
        q: "How long does it take to notice effects?",
        a: "GH peptide effects are not acute — they accumulate over weeks as GH and IGF-1 levels rise. Most users report improved sleep quality and vivid dreams within 1–2 weeks. Body composition changes typically become noticeable at 6–12 weeks. The full effect of a GH peptide stack requires 3–6 months to fully evaluate. Patience is required; this is not a compound with a rapid acute response.",
      },
      {
        q: "Does the stack suppress natural GH production?",
        a: "No — GH peptides stimulate your own pituitary to release GH. They do not suppress the HPG or hypothalamic-pituitary-GH axis. When you stop the stack, your pituitary returns to baseline. This is a significant safety advantage over exogenous HGH, which suppresses pituitary output. GH peptides enhance what you already produce; they don't replace it.",
      },
      {
        q: "What bloodwork should I run?",
        a: "Pre-stack baseline: IGF-1 is the most useful marker — it reflects cumulative GH output and will rise with an effective protocol. Also run fasting glucose and HbA1c, as GH elevation can transiently reduce insulin sensitivity. After 8–12 weeks, repeat IGF-1 to confirm the protocol is working. If IGF-1 remains unchanged, assess dosing, timing, and compound quality.",
      },
      {
        q: "Can I use this stack while on a caloric deficit for fat loss?",
        a: "Yes — GH is strongly lipolytic (fat-mobilizing), making GH peptide stacks particularly effective during fat loss phases. More importantly, GH is anti-catabolic to muscle tissue, helping preserve lean mass during a caloric deficit. Combining a GLP-1 (for appetite suppression) with a GH stack (for lean mass preservation) is the recommended body recomposition approach in the Alki protocol.",
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
        a: "Yes — Tesamorelin (brand name Egrifta) is FDA-approved for the reduction of excess abdominal fat (lipodystrophy) in HIV-infected patients. It is the only GHRH analog in this class with completed clinical trials and FDA approval. This is significant: Tesamorelin has more human safety and efficacy data than any other GH peptide, though that data is from an HIV lipodystrophy population, not healthy fitness users.",
      },
      {
        q: "How does Tesamorelin differ from CJC-1295?",
        a: "Both are GHRH analogs that stimulate pituitary GH release, but Tesamorelin is specifically engineered for stability and has documented effects specifically on visceral fat reduction. CJC-1295 is a broader GH stimulator used for overall recomp. Tesamorelin's clinical evidence for visceral fat is stronger than any other peptide in this category. It doesn't require co-administration with a GHRP, though the combination can be used.",
      },
      {
        q: "What dose and protocol should I use?",
        a: "The FDA-approved clinical dose is 2mg/day SubQ. Research users often start at 1mg/day to assess tolerance, moving to 2mg if well-tolerated. Administered daily as a SubQ injection, typically in the morning. Cycle lengths of 12–26 weeks have been studied clinically; most research users run 12–20 week cycles.",
      },
      {
        q: "How quickly does visceral fat reduction occur?",
        a: "Clinical trial data shows measurable visceral fat reduction by CT scan at 12 weeks, with continued reduction through 26 weeks of daily dosing. Subjective waistline changes are typically reported by users around 6–8 weeks. Tesamorelin's fat reduction is sustained during use but visceral fat may partially return after cessation — maintenance dosing or re-cycling is common.",
      },
      {
        q: "Does Tesamorelin affect insulin sensitivity?",
        a: "Yes — all GH-elevating compounds have the potential to transiently reduce insulin sensitivity, since GH antagonizes insulin signaling. Fasting glucose and HbA1c should be monitored before and during a Tesamorelin protocol. Individuals with pre-diabetes, Type 2 diabetes, or significant insulin resistance should approach GH-elevating peptides cautiously and with physician oversight.",
      },
      {
        q: "Should I run bloodwork while using Tesamorelin?",
        a: "Yes. Pre-protocol: IGF-1, fasting glucose, HbA1c, lipid panel. During protocol (every 8–12 weeks): IGF-1 to confirm efficacy, fasting glucose to monitor insulin sensitivity. IGF-1 should rise meaningfully — if it doesn't, the compound may be underdosed or improperly stored. If IGF-1 rises above the upper reference range, reduce dose.",
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
        a: "Semaglutide is appropriate for individuals at or above approximately 22% body fat. It is contraindicated — and genuinely inappropriate — for lean individuals (below ~12% body fat). In lean users, the appetite suppression mechanism causes muscle catabolism alongside any remaining fat loss. The compound is clinically approved for obesity (BMI 30+) and overweight with comorbidities (BMI 27+).",
      },
      {
        q: "How is Semaglutide dosed and how does titration work?",
        a: "Semaglutide is administered as a weekly subcutaneous injection. Standard titration: start at 0.25mg/week for weeks 1–4, increase to 0.5mg/week for weeks 5–8. Continue escalating by 0.5mg increments every 4 weeks up to target dose (1mg/week for body composition; 2.4mg/week is the clinical obesity dose). The gradual titration is essential to minimize GI side effects. Rushing the titration causes avoidable misery.",
      },
      {
        q: "Will I lose muscle mass on Semaglutide?",
        a: "This is the most important practical concern. Rapid weight loss from caloric restriction causes muscle catabolism alongside fat loss — typically 25–40% of weight lost is lean mass, not fat. Mitigating muscle loss requires: high protein intake (1g+ per lb of lean body mass daily), progressive resistance training throughout the protocol, and co-administration of lean mass-preserving compounds — most effectively a GH peptide stack (CJC/Ipamorelin or Tesamorelin).",
      },
      {
        q: "What happens when I stop taking Semaglutide?",
        a: "Weight regain after cessation is well-documented — the majority of users regain a significant portion of lost weight within 12 months of stopping. This is because GLP-1 receptor agonism artificially suppresses appetite; when the compound is removed, appetite returns to or above baseline. Long-term use, very gradual dose tapering, and permanent lifestyle changes are strategies to manage this.",
      },
      {
        q: "What are the most common side effects and how do I manage them?",
        a: "Nausea and GI distress during dose escalation are the primary side effects. Management: eat smaller, lower-fat meals; avoid strong smells and rich foods during the first days after injection; time injection strategically (some prefer evening injection so peak nausea occurs during sleep). Constipation and delayed gastric emptying are common at maintenance doses — adequate hydration and fiber are important.",
      },
      {
        q: "What bloodwork should I run before and during a Semaglutide protocol?",
        a: "Pre-protocol: HbA1c, fasting glucose, lipid panel, comprehensive metabolic panel, thyroid panel (TSH + T4). Note: GLP-1 receptor agonists carry a black-box warning for thyroid C-cell tumors in rodents; personal or family history of medullary thyroid carcinoma or MEN-2 is an absolute contraindication. During protocol: repeat HbA1c and fasting glucose every 12 weeks.",
      },
      {
        q: "Can Semaglutide be combined with Ipamorelin/CJC-1295?",
        a: "Yes — this is specifically recommended in the Alki protocol. Semaglutide drives weight loss through appetite suppression. GH peptides (CJC/Ipamorelin or Tesamorelin) are anti-catabolic and lipolytic, supporting lean mass preservation during the caloric deficit induced by GLP-1 therapy. The combination is mechanistically complementary with no known receptor interaction.",
      },
    ],
  },

  "Retatrutide (GLP-3)": {
    category: "Weight Loss",
    tagline: "Triple agonist: GLP-1, GIP, and Glucagon — most powerful GLP agent",
    catColor: "#ef4444",
    faqs: [
      {
        q: "What makes Retatrutide different from Semaglutide?",
        a: "Retatrutide is a triple agonist: it activates GLP-1 (appetite suppression, insulin secretion), GIP (glucose-dependent insulin release, fat cell signaling), and Glucagon (energy expenditure, fat mobilization) receptors simultaneously. Semaglutide is a single GLP-1 agonist. Phase 2 clinical trial data showed average weight loss of ~24% body weight in 48 weeks, substantially exceeding Semaglutide's clinical results.",
      },
      {
        q: "Is Retatrutide approved or still in trials?",
        a: "As of early 2026, Retatrutide is in Phase 3 clinical trials (Eli Lilly). It has not received FDA approval for any indication. Phase 2 data (NEJM, 2023) showed remarkable efficacy. Research-grade Retatrutide is available from gray-market suppliers, but users are extrapolating from Phase 2 data — there is no FDA-validated manufacturing pipeline. This is the most experimental compound in the GLP category.",
      },
      {
        q: "What are the expected side effects compared to Semaglutide?",
        a: "The side effect profile is broadly similar: GI distress during dose escalation, injection site reactions. Because Retatrutide includes Glucagon receptor agonism — which directly increases metabolic rate — there is also potential for elevated heart rate and hypoglycemia risk in combination with insulin or other glucose-lowering agents. Careful titration is mandatory.",
      },
      {
        q: "How does Retatrutide affect muscle mass?",
        a: "Retatrutide's Glucagon component increases energy expenditure and fat mobilization — but Glucagon also has catabolic signaling properties. In Phase 2 trials, lean mass loss was observed alongside fat loss, consistent with the broader GLP class. Lean mass preservation strategies are critical: high protein intake, resistance training, and co-administration of GH peptides. The muscle loss risk may be proportionally higher than with Semaglutide given the Glucagon arm.",
      },
      {
        q: "Is Retatrutide appropriate for leaner users?",
        a: "No. Like Semaglutide, Retatrutide is inappropriate for lean individuals — and given its greater potency, it carries higher risk. In a lean individual with limited adipose tissue, the triple agonist mechanism could drive significant lean mass catabolism. Alki blocks GLP agents for users below 22% body fat and flags Retatrutide as the highest-risk GLP option.",
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
        a: "GHK-Cu (Glycyl-L-histidyl-L-lysine:copper) is a naturally occurring copper peptide found in human plasma, saliva, and urine. It has been shown to activate approximately 4,000 human genes — many involved in tissue repair, collagen synthesis, anti-inflammatory signaling, and antioxidant defense. Plasma GHK-Cu levels decline significantly with age (from 200 ng/mL at age 20 to 80 ng/mL by age 60), making supplementation a plausible anti-aging intervention.",
      },
      {
        q: "What are the most effective administration routes?",
        a: "Topical application has the strongest evidence base for skin applications (collagen synthesis, wrinkle reduction, wound healing). Intranasal administration is used for systemic and neurological applications. Subcutaneous injection at 1–2mg/day is used for more aggressive anti-aging protocols seeking systemic gene activation. Topical is the safest starting point; injectable use is more experimental but common in biohacking circles.",
      },
      {
        q: "How long should a GHK-Cu cycle run?",
        a: "30-day cycles are the common framework for injectable or intranasal GHK-Cu, followed by a break before reassessment. Topical cosmetic use can be daily and continuous — it's in skincare products used indefinitely at low concentrations. There is no documented receptor downregulation or dependence mechanism that mandates cycling.",
      },
      {
        q: "Does GHK-Cu promote hair growth?",
        a: "Yes — this is one of GHK-Cu's most documented effects. It has been studied in clinical contexts for androgenetic alopecia with positive results in improving follicle size and hair diameter. The mechanism involves stimulation of hair follicle cells and collagen remodeling in the scalp. Topical application (scalp serum with GHK-Cu) is the most direct route.",
      },
      {
        q: "Are there any safety concerns with copper peptides?",
        a: "GHK-Cu is generally regarded as very low risk at standard doses. Copper is an essential nutrient and GHK-Cu is a naturally occurring peptide. At very high doses, excess copper accumulation is theoretically possible, but this has not been documented at standard peptide dosing. Individuals with Wilson's disease (copper metabolism disorder) should not use copper-containing compounds.",
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
        a: "PDE-5 inhibitors work peripherally — they enhance blood flow to erectile tissue by blocking cGMP breakdown. They don't affect desire or arousal at the neurological level. PT-141 works centrally — it activates melanocortin 3 and 4 receptors (MC3R/MC4R) in the brain, directly stimulating sexual motivation and arousal at the neurological level. It addresses desire and arousal rather than just vascular mechanics. This makes it effective in cases where PDE-5 inhibitors fail.",
      },
      {
        q: "Is PT-141 FDA-approved?",
        a: "Yes — PT-141 (Bremelanotide) is FDA-approved as Vyleesi for hypoactive sexual desire disorder (HSDD) in premenopausal women. This makes it one of the few compounds in this database with a formal FDA approval pathway. The compound has meaningful human safety data from the clinical trial program supporting this approval.",
      },
      {
        q: "What is the correct dose and timing?",
        a: "Standard research dosing: 1–2mg SubQ administered 45–90 minutes before desired activity. The window of effect is approximately 6–12 hours. Start at 0.5–1mg to assess individual sensitivity — some users are highly responsive at lower doses. Maximum 2x/week is the recommended frequency ceiling. Nausea is the primary side effect and is dose-dependent; lower doses significantly reduce nausea risk.",
      },
      {
        q: "What are the main side effects?",
        a: "Nausea is the most common side effect, particularly at doses above 1mg. Transient facial flushing and mild increases in blood pressure are documented. Hyperpigmentation with repeated use has been reported from the MC1R activation pathway — at standard doses and frequencies, this effect is mild. Pre-dose anti-nausea strategies and staying horizontal can help.",
      },
      {
        q: "Can PT-141 be combined with Tadalafil?",
        a: "Yes — this is an effective combination. PT-141 addresses the central/neurological arousal component; Tadalafil addresses the peripheral vascular component. They work through completely independent mechanisms with no pharmacological conflict. Combining 1mg PT-141 with 5–10mg Tadalafil covers both axes effectively. Note: PT-141 can cause mild blood pressure elevation — monitor for hypotension when combined with PDE-5 inhibitors.",
      },
      {
        q: "Does PT-141 work for both men and women?",
        a: "Yes — the FDA approval is for women (HSDD), but the compound works via MC3R/MC4R receptors present and active in both sexes. The neurological arousal mechanism is not sex-specific. Clinical trial data exists for both male and female populations.",
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
        a: "Priority hierarchy for fat loss: (1) Semaglutide or Retatrutide for users above 22% BF — appetite suppression is the most powerful fat loss tool in the database. (2) Tesamorelin for visceral fat specifically, or as a complement to GLP-1 therapy. (3) Ipamorelin + CJC-1295 for lean mass preservation during deficit — GH is lipolytic and anti-catabolic, making it essential when running a GLP-1. For users below 22% BF, GLP-1s are contraindicated; the stack focuses on GH peptides and Tesamorelin for body recomposition.",
      },
      {
        q: "How do I preserve muscle during a GLP-1 fat loss protocol?",
        a: "Four strategies, in priority order: (1) Protein intake — target 1g per pound of lean body mass daily. Non-negotiable. (2) Resistance training — maintain progressive overload throughout the protocol. You cannot preserve muscle with cardio alone. (3) GH peptide co-administration — CJC/Ipamorelin or Tesamorelin alongside the GLP-1. GH is anti-catabolic and lipolytic simultaneously. (4) Monitor composition — track body composition with DEXA, not just scale weight.",
      },
      {
        q: "What body fat percentage should I aim for before transitioning off GLP-1s?",
        a: "A reasonable framework: reach a body fat level that is sustainable with lifestyle intervention (typically 12–18% for men, 18–25% for women), have established the dietary and training habits that will maintain that composition, then taper the GLP-1 gradually rather than stopping abruptly. Abrupt cessation leads to rapid appetite rebound.",
      },
      {
        q: "Can I lose fat without injectable peptides?",
        a: "The most powerful fat loss peptides require subcutaneous injection — Semaglutide, Retatrutide, and Tesamorelin are all injectable. There is no oral peptide equivalent to GLP-1 efficacy. If needles are an absolute barrier, the honest answer is you're leaving significant efficacy on the table. If it's anxiety or technique, insulin needles (31g, 0.5 inch) are essentially painless with proper technique.",
      },
    ],
  },
  "Muscle Gain": {
    icon: "💪",
    faqs: [
      {
        q: "What's the best peptide stack for lean muscle gain?",
        a: "For peptides specifically: CJC-1295 + Ipamorelin is the foundation. GH peptides drive IGF-1 elevation, which is the downstream anabolic signal for muscle hypertrophy. Add BPC-157 to protect connective tissue during progressive loading — tendons and ligaments lag behind muscle strength gains, and BPC-157 reduces injury risk during high-volume training. TB-500 complements BPC-157 for systemic recovery support.",
      },
      {
        q: "How do GH peptides build muscle — what's the mechanism?",
        a: "GH peptides stimulate the pituitary to release GH in larger, more frequent pulses. GH signals the liver to produce IGF-1, which binds to IGF-1 receptors on muscle cells, activating mTOR and muscle protein synthesis pathways. GH also has direct lipolytic effects, mobilizing fat for fuel and enabling simultaneous muscle gain and fat loss (body recomposition) at caloric maintenance.",
      },
      {
        q: "How important is training and diet alongside the peptide protocol?",
        a: "They are the primary drivers — peptides are the multiplier, not the engine. GH peptides amplify the anabolic signal, but there must be a training stimulus for that signal to act on and adequate protein to build with. Without progressive resistance training and sufficient protein (1g+/lb lean mass), GH peptides will produce minimal body composition changes.",
      },
    ],
  },
  Recovery: {
    icon: "🩹",
    faqs: [
      {
        q: "What's the fastest peptide protocol for an acute injury?",
        a: "For an acute injury: BPC-157 + TB-500 is the first-line combination. BPC-157 at 250–500mcg/day SubQ near the injury site for local angiogenesis and tissue repair. TB-500 at 2.5mg 2x/week for systemic healing and stem cell mobilization. Adding a GH peptide stack (CJC/Ipamorelin pre-sleep) amplifies the repair window during sleep. Expect meaningful functional improvement at 3–6 weeks, with continued benefit through 8–12 weeks.",
      },
      {
        q: "Can peptides help with chronic pain or old injuries?",
        a: "Yes — this is one of the most commonly reported applications. BPC-157's angiogenic effect can reopen blood supply to chronically damaged tissues. Many chronic injuries are characterized by poor vascular supply to damaged tissue, which is exactly what BPC-157 addresses. Chronic injuries may require longer treatment windows (8–12 weeks) than acute ones.",
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
        a: "A comprehensive anti-aging protocol typically combines: GHK-Cu (topical and/or injectable) for collagen, skin quality, and gene activation. Ipamorelin + CJC-1295 for GH/IGF-1 restoration (GH declines ~14% per decade after 30). Epithalon for telomerase stimulation and pineal/melatonin regulation (outside core Alki 8). The longevity stack is about maintaining function across multiple aging mechanisms simultaneously, not maximizing any single anabolic axis.",
      },
      {
        q: "At what age is anti-aging peptide use appropriate?",
        a: "GH secretion begins declining in the late 20s–early 30s. GHK-Cu plasma levels begin declining measurably in the 30s. Practical guideline: GHK-Cu and collagen-focused compounds from the 30s onward; GH peptides most relevant from 35+ when natural output has declined meaningfully. Younger users with optimal natural hormone levels get minimal marginal benefit from GH peptides.",
      },
      {
        q: "Do anti-aging peptides actually extend lifespan?",
        a: "No human longevity data exists. Animal model data is promising but cannot be directly extrapolated to humans. The realistic claims for anti-aging peptides are: improved biomarkers associated with aging, better functional health maintenance, and quality-of-life improvements that are measurable in the present. The longevity benefit is speculative; the functional maintenance benefit is more grounded.",
      },
    ],
  },
  "Skin Quality": {
    icon: "✨",
    faqs: [
      {
        q: "Which peptides specifically improve skin quality?",
        a: "GHK-Cu is the primary compound for skin quality — it directly stimulates collagen synthesis, elastin production, and has antioxidant properties. Topical GHK-Cu serums are backed by cosmetic research demonstrating measurable improvements in skin thickness, wrinkle depth, and elasticity. Tesamorelin and GH peptides improve skin indirectly via IGF-1 elevation — GH is a major regulator of collagen turnover throughout the body.",
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
        q: "Which peptides in the Alki database most affect energy levels?",
        a: "GH peptides (CJC/Ipamorelin) indirectly improve energy by improving sleep architecture — GH secretion during deep sleep is a key driver of next-day energy and recovery quality. Users on GH peptide protocols consistently report better sleep quality and improved daytime energy. BPC-157 has reported effects on mitochondrial function and gut health that some users associate with improved energy. No compound in the core Alki 8 is a direct energy stimulant — energy benefits are downstream of improved recovery, sleep, and GH output.",
      },
    ],
  },
  Performance: {
    icon: "🎯",
    faqs: [
      {
        q: "What's the best stack for athletic performance and recovery?",
        a: "BPC-157 + TB-500 for connective tissue durability and systemic recovery. Ipamorelin + CJC-1295 for sleep quality, lean mass accrual, and repair signal amplification. This combination — the gold standard recovery stack plus the gold standard GH stack — covers the full performance support spectrum: injury prevention (BPC-157), systemic healing (TB-500), body recomposition (GH peptides), and sleep-window optimization (pre-sleep GH dosing).",
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
        a: "They can be injected at the same site (many users use a pre-mixed blend for convenience) or separately. BPC-157 benefits from injection near the injury site — local application directly in the tissue region being repaired. TB-500's systemic mechanism means site doesn't matter for its effects — abdominal SubQ is convenient. If using separately: BPC-157 near the injury site daily, TB-500 anywhere SubQ twice weekly.",
      },
      {
        q: "How long should I run this stack for a specific injury?",
        a: "For acute injuries: 8–12 weeks as the primary protocol. For chronic injuries: some users run 12–16 weeks or longer. Neither compound is suppressive or has a known tolerance mechanism. Reassess functional improvement at 6–8 weeks. If significant improvement is occurring, continue. If no change after 8 weeks, evaluate dosing, administration site, and compound storage quality.",
      },
      {
        q: "Can I add a GH stack to this combination for maximum recovery?",
        a: "Yes — this is the most comprehensive peptide recovery stack: BPC-157 (local) + TB-500 (systemic) + CJC-1295/Ipamorelin (GH pulse during sleep). GH is a key signal in tissue repair — it amplifies IGF-1, which drives protein synthesis in all tissues including connective tissue. The pre-sleep GH stack specifically targets the primary repair window (deep sleep).",
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
        a: "This is exactly what this combination is designed for. Semaglutide drives caloric restriction via appetite suppression, which creates catabolic pressure on muscle tissue. GH peptides (CJC/Ipamorelin) are anti-catabolic — GH directly inhibits muscle protein breakdown and shifts the body toward fat oxidation as the primary energy substrate. Clinical data on GLP-1 therapy shows 25–40% of weight lost is lean mass without intervention — GH co-administration is the primary tool for improving that ratio.",
      },
      {
        q: "Do these compounds interact with each other?",
        a: "There is no known pharmacological interaction. They operate through completely independent receptor systems: GLP-1 receptor agonism vs. GHRH/ghrelin receptor systems. Semaglutide is administered weekly; CJC/Ipamorelin is administered pre-sleep. These don't need to be timed together. There are no known contraindications for this combination.",
      },
      {
        q: "When should I start the GH stack relative to the GLP-1?",
        a: "Simultaneously, from the start of the protocol. Muscle catabolism begins immediately when a caloric deficit is created — there is no benefit to waiting to add the anti-catabolic layer. Starting the GH peptide stack concurrent with Semaglutide initiation means the protective mechanism is in place from day one.",
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
    stack: ["Retatrutide (GLP-3)", "Ipamorelin + CJC-1295"],
    label: "Retatrutide + GH Stack",
    subtitle: "Aggressive Fat Loss + Lean Mass Preservation",
    warning: false,
    faqs: [
      {
        q: "Is combining the GH stack with Retatrutide the right approach?",
        a: "Yes — the same logic that makes GH peptides essential alongside Semaglutide applies even more strongly with Retatrutide. Retatrutide's Glucagon component adds direct catabolic pressure beyond what GLP-1 alone produces. The GH peptide stack is not optional with this combination — it's the primary lean mass preservation mechanism. High protein intake and resistance training are equally non-negotiable.",
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
        a: "Example: 5mg BPC-157 vial + 2mL bacteriostatic water = 2,500 mcg/mL. To dose 500 mcg: 500 ÷ 2,500 = 0.2mL = 20 units on a U-100 insulin syringe. Formula: Desired dose (mcg) ÷ Concentration (mcg/mL) = Volume (mL). Convert to units by multiplying mL × 100 for U-100 syringes. Label your vial: compound name, date, total amount, water volume added, resulting concentration.",
      },
      {
        q: "How long can I store unreconstituted lyophilized peptides?",
        a: "Lyophilized (freeze-dried) peptides in sealed vials stored away from light and moisture: typically 12–24 months at room temperature, longer when refrigerated or frozen. Once reconstituted, refrigerate and use within 30 days. Signs of degraded peptides: discoloration, cloudiness, or visible particulates after reconstitution. Discard if any of these are present.",
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
        a: "Step-by-step: (1) Wash hands thoroughly. (2) Swab injection site with alcohol, allow to dry 30 seconds. (3) Pinch a fold of skin at the injection site (abdomen, outer thigh). (4) Insert needle at a 45–90° angle — 90° for adequate skin fold, 45° for thinner individuals. (5) Inject the solution slowly and steadily. (6) Withdraw needle and apply gentle pressure with a clean swab (do not rub). (7) Dispose of needle in a sharps container. The needles are very fine — the physical sensation is minimal.",
      },
      {
        q: "What should I do if I hit a blood vessel?",
        a: "If blood appears in the syringe when you aspirate (pull back slightly on plunger), withdraw the needle, apply pressure, discard the syringe, and draw a fresh dose with a new needle. SubQ injections have very low risk of intravascular administration — the SubQ tissue layer has minimal vasculature. If blood appears at the injection site after withdrawal, apply gentle pressure for 30 seconds.",
      },
      {
        q: "How do I manage injection site reactions?",
        a: "Minor redness, swelling, or itching at the injection site is normal and typically resolves within 24 hours. Rotating injection sites prevents accumulated irritation. Persistent nodules from repeated injection at the same site (lipohypertrophy) can be avoided by systematic rotation. Significant swelling, warmth, or signs of infection (spreading redness, fever, discharge) warrant medical attention.",
      },
    ],
  },
  {
    category: "Bloodwork & Monitoring",
    icon: "🩺",
    faqs: [
      {
        q: "What is the minimum bloodwork I should run before any peptide protocol?",
        a: "For peptide-only protocols: comprehensive metabolic panel (CMP), CBC, fasting glucose, and HbA1c. This establishes liver, kidney, and blood sugar baselines. For GH peptides: add IGF-1. For GLP-1s: add lipid panel, TSH. For any protocols involving hormonal compounds (SARMs): full hormone panel including total testosterone, free testosterone, LH, FSH, estradiol, SHBG. Bloodwork is the only real safety net — it's not optional for responsible protocol management.",
      },
      {
        q: "What does IGF-1 testing tell me about my GH peptide protocol?",
        a: "IGF-1 is the most useful biomarker for assessing GH peptide efficacy. Unlike GH itself (which spikes and falls rapidly), IGF-1 reflects cumulative GH output over approximately 24 hours. A successful GH peptide protocol should produce measurable IGF-1 elevation from your baseline. If IGF-1 is unchanged after 8+ weeks, assess: timing relative to meals (GH is suppressed by insulin), injection technique, and compound quality.",
      },
      {
        q: "How often should I get bloodwork while on a peptide protocol?",
        a: "Minimum: baseline before starting, mid-protocol check at 6–8 weeks, and post-protocol assessment. The mid-protocol check is most valuable for catching emerging issues while there is still time to adjust. For suppressive protocols (SARMs), add a post-PCT check to confirm HPG axis recovery. Annual or quarterly bloodwork is an underutilized health optimization tool that provides objective data no subjective assessment can match.",
      },
    ],
  },
  {
    category: "PCT & Cycling",
    icon: "🔁",
    faqs: [
      {
        q: "Do peptides require PCT (Post-Cycle Therapy)?",
        a: "No. None of the eight compounds in the Alki core database suppress the HPG axis (hypothalamic-pituitary-gonadal axis). They do not reduce testosterone production, LH, or FSH. PCT (which typically involves SERMs like Nolvadex or Enclomiphene to restart natural testosterone production) is specifically required for compounds that suppress the HPG axis — primarily SARMs, anabolic steroids, and exogenous testosterone. GH peptides, GLP-1s, BPC-157, TB-500, GHK-Cu, and PT-141 can all be stopped without a PCT protocol.",
      },
      {
        q: "Do peptides cause hormonal suppression?",
        a: "The compounds in the Alki core database do not. GH peptides stimulate your own pituitary — they are not exogenous GH, which would suppress the pituitary. GLP-1s have no HPG interaction. BPC-157 and TB-500 are non-hormonal. GHK-Cu is a naturally occurring copper peptide. PT-141 acts on melanocortin receptors unrelated to HPG. This is a fundamental advantage of peptide-based protocols over SARM or steroid protocols.",
      },
      {
        q: "Should I cycle peptides or can I run them continuously?",
        a: "Most peptides are run for defined protocol windows rather than continuously — not because of suppression risk but as a precautionary approach to long-term use without established human safety data. Common frameworks: BPC-157/TB-500 — run until recovery goal is achieved, then stop. GH peptides — often run in 3–6 month cycles with breaks. GLP-1s — can be long-term per clinical protocols. No compound in the core eight has a documented receptor tolerance mechanism that requires mandatory cycling.",
      },
    ],
  },
  {
    category: "Sourcing & Quality",
    icon: "🔬",
    faqs: [
      {
        q: "How do I evaluate the quality of a peptide supplier?",
        a: "Key quality indicators: (1) Certificate of Analysis (CoA) — every batch should have an independently verified CoA showing purity percentage (target 98%+) and compound identity confirmation. (2) HPLC testing documentation — High-Performance Liquid Chromatography is the standard purity verification method for peptides. (3) Third-party lab testing — in-house testing is a conflict of interest; reputable suppliers use independent labs. (4) Clear 'research use only' labeling. (5) Reputation and community verification in established forums with long verification histories.",
      },
      {
        q: "What are the risks of sourcing from low-quality suppliers?",
        a: "Primary risks: (1) Incorrect compound — receiving a different peptide than labeled is documented and consequential. (2) Contamination — bacterial endotoxins in improperly manufactured peptides can cause significant systemic inflammation, fever, and serious adverse reactions. (3) Underdosing — receiving less of the active compound than labeled. (4) Excessive additives — undisclosed excipients or solvents. Quality verification is the most important non-protocol decision in any research compound use.",
      },
      {
        q: "What does 'for research use only' mean?",
        a: "'Research use only' is the legal designation for compounds that have not received FDA approval for human therapeutic use in the indications they're being sold for. This designation allows suppliers to legally sell compounds without making therapeutic claims. Alki operates within this framework as an information platform about research compounds. Users who choose to use these compounds are doing so outside established medical care, which is why comprehensive education and individual responsibility are essential.",
      },
    ],
  },
];

// ── COMPONENT ──────────────────────────────────────────────
const TABS = ["Compound", "Goal", "Stack", "General"];

const ACCENT = "#22d68a";
const ACCENT_DIM = "rgba(34,214,138,0.08)";
const ACCENT_BORDER = "rgba(34,214,138,0.2)";

export default function AlkiProtocolQA({ onBack, activeCompound, activeGoal }) {
  const initTab = activeCompound ? "Compound" : activeGoal ? "Goal" : "Compound";
  const [tab, setTab] = useState(initTab);
  const [selectedCompound, setSelectedCompound] = useState(
    activeCompound && COMPOUND_FAQS[activeCompound] ? activeCompound : Object.keys(COMPOUND_FAQS)[0]
  );
  const [selectedGoal, setSelectedGoal] = useState(
    activeGoal && GOAL_FAQS[activeGoal] ? activeGoal : Object.keys(GOAL_FAQS)[0]
  );
  const [selectedStack, setSelectedStack] = useState(0);
  const [selectedGeneral, setSelectedGeneral] = useState(0);
  const [openItems, setOpenItems] = useState({});
  const [search, setSearch] = useState("");

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
              {tab === "Compound" && Object.entries(COMPOUND_FAQS).map(([name, data]) => (
                <SidebarBtn
                  key={name}
                  active={selectedCompound === name}
                  onClick={() => { setSelectedCompound(name); setOpenItems({}); }}
                  label={name}
                  sub={data.category}
                />
              ))}
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
  // Search results
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
