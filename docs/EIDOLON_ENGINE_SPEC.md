# Alki "Eidolon" Body-Transformation Simulation Engine: Mathematical & Physiological Reference

> **Framing.** This document is an engineering/research reference for a deterministic, parametric body-avatar projection system. It is **not medical advice**, does not constitute a recommendation to use any compound, and should be presented inside the platform as **"projected research outcomes"** — i.e., the system's best estimate of *what the published literature would predict if a given protocol behaved as the average published response.* Many of the compounds referenced are not FDA-approved, are WADA-prohibited, or have only preclinical evidence; that evidence-grade is explicitly tracked and surfaced in the UI.

-----

## TL;DR

- **Build the engine as four stacked deterministic layers.** (1) Physiological state variables (LBM, FM, BF%, TBW, glycogen-bound water, VAT/SAT split, collagen/skin quality, vascularity, IGF-1/androgen tone); (2) anthropometric derivations (Navy circumferences, FFMI, Casey-Butt regional ceilings, BSA); (3) per-compound effect vectors that push the physiological state over time with realistic rate constants and saturation against ceilings; and (4) a mapping layer converting state into normalized [0,1] morph-key and material values. Combine same-pathway compounds with a saturating function (GH-axis peptides do not stack linearly: use `tone = 1 − ∏(1 − tone_i)`), and enforce the Casey-Butt LBM ceiling and the Kouri normalized-FFMI = 25 (men) / 22 (women) wall on natural baselines, dynamically lifted by androgen/SARM use.
- **Real clinical numbers anchor the projections.** Semaglutide 2.4 mg → −15.0% body weight over 68 weeks with ~39% of weight lost coming from lean mass (STEP-1 DEXA sub-study, Wilding 2022 PMC8089287). Retatrutide 12 mg → −24.2% at 48 weeks and −28.7% body weight (−32.3 kg / −71.2 lbs) at 68 weeks on 12 mg in the TRIUMPH-4 trial of obesity-with-knee-OA participants (Eli Lilly press release, 11 Dec 2025; NCT05931367), 74% fat / 26% lean by Phase-2 DEXA. Tesamorelin 2 mg → VAT −15.2% at 26 weeks and sustained at −18% at 52 weeks (Falutz et al. NEJM 2007 357:2359; Falutz et al. AIDS 2008 22:1719). LGD-4033 1 mg → +1.2 kg LBM in 3 weeks without training (Basaria 2013). MK-677 25 mg → +1.6 kg fat-free mass over 12 months but much of it intracellular water (Nass et al. Ann Intern Med 2008). Testosterone enanthate 600 mg/wk → +7.9 kg FFM in 20 weeks (Bhasin 2001 dose-response). Clenbuterol 80 µg/d × 2 wk → +0.91 kg lean mass with no fat-mass change in 11 healthy men (Hostrup et al., *J Physiol*, 2025 Oct;603(19):5529–5545). These are the empirical anchors for compound effect-vector magnitudes; everything else (BPC-157, TB-500, GHK-Cu systemic, SR-9009, SLU-PP-332, MOTS-c, S-23, YK-11, Fragment 176-191) sits on preclinical or anecdotal evidence and must be flagged as such.
- **The visible avatar is driven by ~9 derived signals.** Body-fat fraction drives `bf_low`, waist circumference, facial fullness, ab visibility (sigmoid centered ~12% male / ~20% female), and vascularity (sigmoid centered ~9% male / ~16% female with vasodilator boost). LBM scaled against Casey-Butt regional ceilings drives the regional `muscle_*` keys, biased upper-body by an androgen-tone scalar. Glycogen+intracellular water and aromatization/wet-compound flag drive `water`. Melanotan drives a tan-lerp on skin tone, capped by Fitzpatrick type. GHK-Cu/Epitalon drive roughness-reduction and luminosity on the skin material. Recovery peptides (BPC-157, TB-500) drive nothing directly — they raise an internal `R` (recovery multiplier) that amplifies the muscle-gain vectors of other compounds.

-----

## Key Findings

1. **A deterministic engine is feasible and well-anchored for the GLP-1, GH-axis, SARM, and anabolic categories**, where Phase-2 or Phase-3 human DEXA data exist. For these compounds the projection error band is narrow enough (≈ ±25% of point estimate) to render as a single confident projection plus a ±band.
1. **For BPC-157, TB-500, GHK-Cu (systemic), Epitalon, MOTS-c, SR-9009, AICAR, SLU-PP-332, S-23, YK-11, and Fragment 176-191**, no controlled human body-composition data exist. These should not move morph keys directly. BPC-157/TB-500 should modulate a "recovery_multiplier" that buffs the muscle-gain rate of co-stacked anabolics; GHK-Cu and Epitalon should modulate skin material (roughness/luminosity), not geometry; the orphan-receptor exercise mimetics should modulate fat-loss rate by a small preclinical-flagged amount.
1. **Water/glycogen shifts are the dominant short-horizon visual delta.** A user starting MK-677 or CJC-1295/Ipamorelin will show a visibly "fuller / puffier" Eidolon within 1–2 simulated weeks before any meaningful fat or muscle change. The water layer must be modeled separately from fat/lean with a faster time-constant (τ ≈ 5–10 days) than fat (τ ≈ 8–12 weeks) or muscle (τ ≈ 12–24 weeks). Glycogen storage binds water at 3 g per 1 g glycogen (Olsson & Saltin 1970, Acta Physiol Scand; confirmed by Fernández-Elías 2015, Eur J Appl Physiol) — a ~2.7 kg "fullness" mass swing for a fully glycogen-loaded trained male.
1. **The Casey-Butt LBM ceiling and the Kouri normalized-FFMI = 25 limit are the natural-physique asymptotes.** SARMs and anabolics shift these ceilings upward dynamically (Ostarine ~+7%, LGD-4033 ~+12%, RAD-140 ~+18%, supraphysiologic testosterone ~+40% based on Bhasin 2001 dose-response). The Eidolon should saturate against these dynamically-shifted ceilings rather than allowing unbounded gain.
1. **Sex matters at every layer.** Essential fat (men ~3–5%, women ~10–13% per ACSM), abs-visibility threshold (men ~10–12%, women ~18–20%), FFMI ceiling (men ~25, women ~22), fat distribution (android vs gynoid), and SARM sensitivity all require sex-branched parameters. Per Neil et al. (*J Clin Endocrinol Metab*, 2018;103(9):3215–3224, PMID 29982690), the SARM GSK2881078 produced a maximal mean LBM increase of 3.39 kg (SE 0.406) in females vs 1.76 kg (SE 0.767) in males at 8 weeks; "females exhibited a greater response at lower doses than did males."

-----

## Details

### 1. INPUT VARIABLES (the seed of the simulation)

|Variable                           |Symbol   |Unit                                                              |Notes                                                          |
|-----------------------------------|---------|------------------------------------------------------------------|---------------------------------------------------------------|
|Sex                                |`sex`    |{M, F}                                                            |Branches every constant below                                  |
|Age                                |`age`    |years                                                             |Drives baseline IGF-1, skin quality decay, recovery efficiency |
|Height                             |`h`      |cm                                                                |Anchors FFMI, BSA, Casey-Butt formulas                         |
|Body weight                        |`W`      |kg                                                                |Anchors BMI, LBM, FM partitioning                              |
|Body fat percentage                |`BF`     |fraction 0–1                                                      |If unknown, derive from Navy or Deurenberg                     |
|Training status                    |`T`      |{untrained, novice, intermediate, advanced, elite}                |Modulates muscle-gain rate (Lyle McDonald / Aragon curves)     |
|Wrist circumference (optional)     |`Wr`     |cm                                                                |Casey-Butt input; default to anthropometric estimate if missing|
|Ankle circumference (optional)     |`An`     |cm                                                                |Casey-Butt input                                               |
|Neck circumference (optional)      |`N`      |cm                                                                |Improves Navy BF estimate                                      |
|Waist circumference (optional)     |`Wa`     |cm                                                                |Improves Navy BF estimate, anchors fat-distribution morph      |
|Hip circumference (optional, women)|`Hip`    |cm                                                                |Required for female Navy formula                               |
|Fitzpatrick skin type              |`Fp`     |I–VI                                                              |Caps MT-II tan response                                        |
|Primary goal                       |`goal`   |{fat_loss, muscle, recomp, recovery, anti_age, skin, energy, perf}|UI emphasis, not the math                                      |
|Selected compounds                 |`stack[]`|list                                                              |Each with `dose`, `frequency`, `duration`                      |
|Protocol duration                  |`D`      |weeks                                                             |Default 12; engine integrates over `t ∈ [0, D]`                |

**Recommended defaults** when biometric data are partial:

- Wrist (men): `Wr ≈ 0.105 × h` (cm). Wrist (women): `Wr ≈ 0.097 × h`.
- Ankle (men): `An ≈ 0.130 × h`. Ankle (women): `An ≈ 0.123 × h`.
- Neck (men): derive from `BF` and `h` by inverting Navy formula given an estimated waist of `h × 0.45 × (1 + (BF − 0.15) × 2)`.

-----

### 2. DERIVED / CALCULATED VARIABLES (the deterministic backbone)

#### 2.1 Basic body composition

- **Lean Body Mass (Boer, 1984):**
  - Men: `LBM = 0.407 × W + 0.267 × h − 19.2`
  - Women: `LBM = 0.252 × W + 0.473 × h − 48.3`
- **James (1976) alternative:**
  - Men: `LBM = 1.1 × W − 128 × (W/h)²`
  - Women: `LBM = 1.07 × W − 148 × (W/h)²`
- **Hume (1966) alternative:**
  - Men: `LBM = 0.32810 × W + 0.33929 × h − 29.5336`
  - Women: `LBM = 0.29569 × W + 0.41813 × h − 43.2933`
- **Use rule:** If user-supplied BF is available, prefer `LBM = W × (1 − BF)` and treat Boer/James/Hume as fallback / cross-check.
- **Fat Mass:** `FM = W − LBM`
- **BMI:** `BMI = W / (h/100)²`
- **FFMI:** `FFMI = LBM / (h/100)²`
- **Normalized FFMI (Kouri et al. 1995):** `nFFMI = FFMI + 6.1 × (1.8 − h_meters)`. *Natural ceiling ≈ 25 (men), ≈ 22 (women)*; 42 drug-free athletes in Kouri's sample had normalized FFMI ≤ 25.0.
- **Body Surface Area (Du Bois):** `BSA = 0.007184 × W^0.425 × h^0.725`
- **BSA (Mosteller):** `BSA = √(W × h / 3600)`

#### 2.2 Body-fat estimation when not supplied (Hodgdon-Beckett / U.S. Navy)

- **Men (inches):** `BF% = 86.010 × log10(Wa − N) − 70.041 × log10(h) + 36.76`
- **Women (inches):** `BF% = 163.205 × log10(Wa + Hip − N) − 97.684 × log10(h) − 78.387`
- **Deurenberg (BMI-based fallback):** `BF% = 1.20 × BMI + 0.23 × age − 10.8 × sex − 5.4` (sex: M = 1, F = 0).
- Navy method is accurate to ±3–4% vs DEXA (Hodgdon & Beckett 1984, NHRC); Deurenberg is the sanity fallback when no tape measurements exist.

#### 2.3 Maximum-muscular-potential ceilings (Casey Butt, metric)

- **Maximum LBM at 10% BF (men):**
  `LBM_max = h^1.5 × (√Wr/22.6667 + √An/17.0100) × (BF%/224 + 1)` (with `h, Wr, An` in cm).
- **Maximum regional cold circumferences (~10% BF, men):** use full Butt regressions from *Your Muscular Potential* (4th ed.); good first-order approximations:
  - Arm (cold): `C_arm ≈ 1.1 × √(LBM_max × 100 / h)`
  - Forearm: `C_forearm ≈ 1.6 × Wr`
  - Calf: `C_calf ≈ 1.95 × An`
- **Apply Casey-Butt outputs as the natural ceiling.** The engine should treat current LBM as a fraction of `LBM_max`; muscle-gain rate scales with `(1 − LBM/LBM_max)^k` (k ≈ 1.5) to reproduce diminishing returns.
- **Anabolic/SARM ceilings:** when an anabolic compound is in the stack, raise the effective ceiling: `LBM_max_effective = LBM_max × (1 + Σ ceiling_lift_i)`, capped at a hard wall determined by the most potent compound in stack (testosterone 600 mg/wk → +40%; LGD-4033 5–10 mg → +12%; RAD-140 → +18%; etc., see § 5).

#### 2.4 Water compartments and glycogen

- **Total Body Water:** `TBW ≈ 0.72 × LBM` (canonical sports-physiology figure, ranges 70–75%).
- **Intracellular water (ICW):** ~60% of TBW. **Extracellular water (ECW):** ~40%. GH-axis peptides and aromatizing anabolics preferentially expand ECW (visible "puffiness"); glycogen storage and creatine expand ICW (visible "fullness," "harder" muscles).
- **Glycogen-bound water: 3 g water per 1 g muscle glycogen** (Olsson & Saltin 1970; Fernández-Elías et al. 2015). A trained 80 kg man stores 400–900 g glycogen at maximum → up to ~2.7 kg of glycogen+water mass swing independent of fat or lean change.
- **Use in engine:** track `W_glycogen` and `W_extracell_retention` as separate state variables driving the `water` morph; do not lump them into LBM or FM.

#### 2.5 Visible thresholds (sigmoid centers used in the mapping layer)

|Visible feature        |Center (men)|Center (women)|Slope          |
|-----------------------|------------|--------------|---------------|
|`abs_def` onset        |14% BF      |22% BF        |sharp (k = 0.6)|
|`abs_def` full six-pack|10% BF      |18% BF        |sharp          |
|`vascularity` onset    |12% BF      |18% BF        |medium         |
|`vascularity` full     |8% BF       |15% BF        |medium         |
|Striations             |6% BF       |13% BF        |sharp          |
|Facial angularity onset|15% BF      |22% BF        |gentle         |

Numbers triangulate InBody/ACE classifications, ACSM essential-fat guidance, and bodybuilding-physiology consensus.

#### 2.6 Anthropometric circumference predictors (for morph driving)

- **Waist (relaxed) ≈** `h × 0.445 + 80 × (BF − 0.15)` (cm, men); add ~5 cm offset for women.
- **Hip ≈** `h × 0.52` (men) / `h × 0.56` (women), modulated weakly by BF.
- **Neck ≈** `h × 0.21` (men) / `h × 0.195` (women), modulated weakly by BF.
- **Arm (flexed, cold) ≈** scale from `LBM/LBM_max` against Casey-Butt arm ceiling.
- Coarse but adequate for a parametric avatar; the engine ships the morphs as normalized [0,1], not absolute centimeters.

-----

### 3. PHYSIOLOGICAL STATE VARIABLES (what changes before / after a protocol)

|State                      |Symbol|Units         |Drivers                                                          |
|---------------------------|------|--------------|-----------------------------------------------------------------|
|Fat mass                   |`FM`  |kg            |GLP-1s, GH-axis, β2-agonists, PPARδ agonists                     |
|Visceral adipose tissue    |`VAT` |kg / arbitrary|Tesamorelin (primary), GH-axis, GLP-1s (secondary)               |
|Subcutaneous adipose tissue|`SAT` |kg            |Most fat-loss compounds; not selectively targeted                |
|Lean body mass             |`LBM` |kg            |SARMs, anabolics, GH-axis (modestly), training                   |
|Skeletal muscle mass       |`SMM` |kg            |Subset of LBM; drives muscle morphs                              |
|Intracellular water        |`ICW` |kg            |Glycogen, MK-677 ("intramuscular water"), creatine               |
|Extracellular water        |`ECW` |kg            |Estrogen/aromatization, GH at high doses, sodium                 |
|Muscle glycogen            |`Gly` |g             |Training status, diet (engine assumes "normal" diet by default)  |
|Collagen / skin quality    |`Coll`|0–1           |Age (decays), GHK-Cu (topical), Epitalon, GH-axis                |
|Skin tan (eumelanin)       |`Tan` |0–1           |Melanotan II, baseline Fitzpatrick                               |
|Vascularity tone           |`Vasc`|0–1           |`(1 − BF) × LBM/LBM_max × (1 + vasodilator_boost)`               |
|IGF-1 surrogate            |`IGF` |0–1           |GH-axis peptides, MK-677, IGF-1 LR3                              |
|Androgen tone              |`AT`  |0–1           |SARMs, testosterone; modulates muscle ceiling and upper-body bias|
|Estrogen/aromatization flag|`E`   |0–1           |Biases water → ECW (puffy) and SAT distribution                  |
|Recovery multiplier        |`R`   |0.8–1.4       |BPC-157, TB-500, sleep proxy from MK-677/CJC                     |

### 4. VISIBLE METRICS (what the Eidolon shows)

|Morph key / material                             |Driven primarily by                                                           |Curve                 |
|-------------------------------------------------|------------------------------------------------------------------------------|----------------------|
|`bf_low`                                         |`1 − BF/BF_baseline`, clipped [0, 1]                                          |linear                |
|Waist circumference                              |`BF` + `VAT` (men), `BF` (women)                                              |linear + sigmoid combo|
|`muscle_overall`                                 |`LBM / LBM_max_effective`                                                     |sigmoid, k = 0.4      |
|`muscle_chest` / `_shoulders` / `_arms` / `_back`|regional LBM proxy × androgen-tone bias                                       |sigmoid               |
|`muscle_legs` / `_calves`                        |regional LBM proxy (no androgen bias)                                         |sigmoid               |
|`abs_def`                                        |sigmoid on BF crossing 14% / 22% × `muscle_overall` factor                    |steep sigmoid         |
|`vascularity`                                    |sigmoid on BF crossing 12% / 18% × `LBM/LBM_max` × (1 + vasodilator_boost)    |steep sigmoid         |
|`water`                                          |`ECW_delta` + GH-axis flag + estrogen flag + (glycogen for "full" not "puffy")|linear                |
|Facial fullness                                  |`BF × 0.6 + ECW_delta × 0.4`                                                  |linear                |
|Skin tone (tan_lerp)                             |`Tan` (0 = baseline Fitzpatrick, 1 = max eumelanin response)                  |linear lerp           |
|Skin roughness (material)                        |`1 − Coll`                                                                    |linear, inverted      |
|Skin luminosity (material)                       |`Coll^0.5`                                                                    |gamma curve           |

-----

### 5. PER-COMPOUND EFFECT VECTORS (the heart of the engine)

> **Evidence-grade key:** **A** = Phase 2/3 human RCT with DEXA or imaging; **B** = small human trial / Phase 1 / open-label; **C** = anecdotal / forum / bodybuilding-clinic case series in humans; **D** = preclinical (rodent / primate) only.

#### 5.1 GLP-1 / metabolic weight-loss class

|Compound                 |Evidence|Typical protocol|Total weight Δ|Fat:Lean split|VAT-selective?|Water/skin notes|
|-------------------------|--------|----------------|--------------|--------------|--------------|----------------|
|**Semaglutide 2.4 mg/wk**|A (STEP 1 sub-study)|68 wk titration|−15.0% body weight|61% fat / 39% lean of weight lost (DEXA, n = 140)|mildly|"Ozempic face" via SAT loss in face|
|**Retatrutide 12 mg/wk** |A (Jastreboff et al., NEJM 2023; Lilly press release 11 Dec 2025)|48–68 wk|−24.2% at 48 wk (Phase 2); **−28.7% body weight (−32.3 kg / −71.2 lbs) at 68 weeks on 12 mg in TRIUMPH-4 (NCT05931367, 445 participants)**|74% fat / 26% lean (DEXA, Phase 2)|strongly|hepatic-fat reduction up to −82% at 24 wk on 12 mg|
|**Tesamorelin 2 mg/d**   |A (Falutz NEJM 2007; AIDS 2008; JCEM 2010)|26–52 wk|total BW unchanged; **VAT −15.2% at 26 wk vs +5.0% placebo; sustained −18% at 52 wk**; LBM +1.4 kg (meta-analysis)|virtually all loss is VAT|**most VAT-selective compound known**; trunk fat −1.18 kg, waist circumference −1.6 cm||
|**Fragment 176-191**     |D (rodent obesity; no controlled human BC data)|—|label as preclinical|n/a|claimed VAT-selective|engine effect ~0.3× tesamorelin, flagged D|
|**MOTS-c**               |D (Lee et al. *Cell Metabolism* 2015 21(3):443–454; mice fed HFD treated with 0.5 mg/kg/day MOTS-c IP showed prevented diet-induced obesity vs HFD controls, no change in caloric intake; no human BC RCT)|—|mouse data only|n/a|preclinical|flag in UI|

**GLP-1 regression caveat for the "what happens if I stop?" view:** Per Wilding JPH et al., "Weight regain and cardiometabolic effects after withdrawal of semaglutide: The STEP 1 trial extension," *Diabetes Obes Metab*. 2022 May 19;24(8):1553–1564 (PMC9542252), the former-semaglutide group regained body weight to **+11.6% above baseline at week 120 (a +14.8% rebound from the week-68 nadir)** — about two-thirds of the prior loss. The engine's regression model for GLP-1s should default to this ~66%-of-loss-regained-within-1-year curve.

**Recommended engine values (Semaglutide 2.4 mg, 12-wk extrapolation):**

- `ΔW ≈ −0.0022 × W_0 × t_weeks` (linear approximation of titration phase 0–16 wk; curve plateaus toward Wk 52)
- `ΔFM : ΔLBM = 0.61 : 0.39` of weight lost (STEP-1 DEXA)
- VAT bonus: 5% of fat-loss is preferentially visceral
- Time-constant: τ ≈ 20 weeks (slow exponential approach to plateau ~−15% at 68 wk)

#### 5.2 GH-axis peptides

|Compound|Evidence|Typical dose|LBM effect|Fat effect|Water (ECW) flag|
|--------|--------|------------|----------|----------|----------------|
|**MK-677 (Ibutamoren) 25 mg/d**|A (Nass 2008 *Ann Intern Med* 149:601)|25 mg PO daily|**+1.6 kg FFM at 12 mo** (much intracellular water)|no significant fat-mass change; mild limb-fat increase|**HIGH** — ankle/leg edema common; weight can jump 5–10 lb in 1–2 weeks (mostly water)|
|**Ipamorelin**|B/C (small studies of GHRH-class)|200–300 µg 2–3×/d|modest LBM trend; no clean DEXA RCT|modest fat loss reported in GHRH-class meta-data|mild–moderate|
|**CJC-1295 no-DAC (mod-GRF 1-29)**|B/C; CJC-1295-DAC has Teichman 2006 *JCEM* dose-response|100 µg with each ipamorelin dose|modest LBM trend|modest visceral-fat trend|moderate (lower than DAC version)|
|**CJC-1295 DAC**|B (Teichman 2006)|2 mg weekly|small LBM gain in observational; no DEXA RCT in athletes|small fat loss|moderate–high|
|**Sermorelin**|B (older endocrinology; pediatric GH-deficiency)|200–500 µg/d|small LBM trend in GH-deficient adults; not powerful in healthy adults|modest|mild|
|**IGF-1 LR3**|C (no clean human RCT for body comp)|20–50 µg/d|claims of substantial LBM gain; unverified|minimal|moderate|

**Engine convention for GH-axis:** combine all GH-axis peptides into a single "GH-axis tone" scalar from 0 (none) to 1 (saturated, equivalent to ~6 IU/d exogenous HGH-equivalent). MK-677 alone ≈ 0.5; CJC + Ipa ≈ 0.6; CJC-DAC ≈ 0.7; CJC + Ipa + MK-677 ≈ 0.85 (NOT 1.0+ — saturating ceiling). Multiple GH-axis agents do NOT add linearly; use `tone = 1 − ∏(1 − tone_i)`.

**Time-course for water/fullness:** GH-axis water expansion is visible within **5–10 days** (τ ≈ 7 d). LBM accrual is slow (τ ≈ 16–24 weeks); 12-week MK-677 projections should bias more toward water than true tissue.

#### 5.3 Recovery / repair peptides

|Compound|Evidence|Direct BC effect|Engine role|
|--------|--------|----------------|-----------|
|**BPC-157**|D (extensive rodent; small uncontrolled human reports)|none directly demonstrated in humans|**modulates `R` (recovery multiplier) +0.10 to +0.15**; multiplies LBM-gain rate of co-stacked anabolics. Should NOT directly move muscle/fat morphs.|
|**TB-500 (TB4 fragment)**|D|none directly|as BPC-157; combined: +0.15 to +0.20 multiplier when both present.|

**UI note:** the platform should explicitly say "BPC-157 and TB-500 do not visibly transform the body. They are projected to accelerate the gains of compounds you stack with them, via improved recovery and reduced injury time. Evidence is preclinical in humans; both are WADA-prohibited under category S0." This protects credibility.

#### 5.4 Skin / anti-aging peptides

|Compound|Evidence|Direct effect|Engine role|
|--------|--------|-------------|-----------|
|**GHK-Cu (topical)**|B — multiple controlled topical trials. Pickart et al., *Int J Mol Sci* 2018 (PMC6073405). Leyden et al., *J Cosmet Dermatol* 2002;1(3):197–204.|skin thickness ↑, elasticity ↑, wrinkle depth ↓; collagen I synthesis|drives `Coll` +0.15 to +0.30 over 12 weeks (topical); systemic injection evidence is much weaker — label B/C. **No geometry change.**|
|**Epitalon**|C/D — Russian/Soviet aging literature; limited Western replication|claimed telomere/skin effects; minimal controlled body-comp data|small `Coll` boost; flag as low-evidence|

#### 5.5 Appearance / specialty

|Compound|Evidence|Direct effect|Engine role|
|--------|--------|-------------|-----------|
|**Melanotan II**|B — Phase 1 Dorr et al. 1996 (3 fair-skinned men)|skin darkening (eumelanin shift)|drives `Tan` 0→1 on a 2–8 week curve, capped by Fitzpatrick type (Fp I caps at ~0.4; Fp IV caps at 1.0). Side effects: appetite suppression (≈−5% caloric intake proxy → small fat-loss bias), facial freckle/mole darkening (cosmetic warning copy).|
|**PT-141 (Bremelanotide)**|A (FDA-approved as Vyleesi for HSDD in women)|no body-composition effect; sexual function only|**no morph movement**; appears as a "quality of life" tag in UI.|

#### 5.6 SARMs and anabolics (muscle / recomp)

|Compound|Evidence|Typical dose|LBM gain|Water flag|Suppression / regression|
|--------|--------|------------|--------|----------|------------------------|
|**Testosterone enanthate 600 mg/wk**|A (Bhasin 1996 *NEJM* 335:1; Bhasin 2001)|600 mg/wk × 10–20 wk|**+6.1 kg FFM in 10 wk with training; +7.9 kg in 20 wk no training**|high (aromatization → ECW; "wet" compound)|strong shutdown; rapid regression on cessation if no PCT|
|**LGD-4033 (Ligandrol)**|B (Basaria et al. 2013)|5–10 mg/d × 8 wk|+2 to +4 kg LBM|low–moderate ("dryer" than testosterone)|moderate suppression|
|**Ostarine / MK-2866**|B (GTx Phase 2)|15–25 mg/d × 8–12 wk|+1.5 to +3 kg LBM|low ("dry")|mild suppression|
|**RAD-140 (Testolone)**|C (animal + anecdotal)|10–20 mg/d × 8–10 wk|+3 to +5 kg LBM (anecdotal)|low–moderate ("dry")|strong suppression; hepatotoxicity reports|
|**YK-11**|D (in vitro myostatin inhibition)|5–10 mg/d × 6–8 wk anecdotal|"myostatin-inhibitor" claims; uncontrolled|low|suppression reported|
|**S-4 (Andarine)**|C/D|25–50 mg/d × 6–8 wk anecdotal|+1.5 to +3 kg LBM anecdotal|low|mild suppression; yellow-tinted vision side effect|
|**S-23**|D|anecdotal only|"driest" SARM; strong claims, no human RCT|very low|strong suppression|

**SARM sex-responsiveness anchor:** Per Neil D et al., *J Clin Endocrinol Metab*. 2018;103(9):3215–3224 (PMID 29982690), the SARM GSK2881078 produced a maximal mean LBM change of **3.39 kg (SE 0.406) in females vs 1.76 kg (SE 0.767) in males** at 8 weeks. Use this as the canonical sex-sensitivity multiplier for SARMs in the engine.

**Wet vs Dry classification** (drives `water` morph bias):

- **Wet** (E flag high → ECW expansion → puffier face/abdomen): testosterone, supraphysiologic anabolics, MK-677, CJC-1295-DAC, IGF-1 LR3 at high dose, Dianabol-class (reference)
- **Dry** (E flag low → no ECW expansion; muscles look "harder"): Ostarine, RAD-140, S-23, YK-11, Anavar-class, Clenbuterol, GW-501516

#### 5.7 Metabolic / thermogenic research chemicals

|Compound|Evidence|Effect on FM|Effect on LBM|Water|Notes|
|--------|--------|------------|-------------|-----|-----|
|**GW-501516 (Cardarine)**|D (rodent)|small fat-loss bias|neutral|low|**Carcinogen flag must appear in UI.**|
|**SR-9009 (Stenabolic)**|D (rodent only; poor oral bioavailability)|small fat-loss claim|neutral|low|preclinical only; engine effect ~0.5× Cardarine|
|**Clenbuterol**|B (Hostrup et al., *J Physiol*, 2025)|small fat loss; RCT showed no fat-mass change in 2 wk|small LBM gain (+0.91 kg in 2 wk)|low ("dry")|**β2-receptor desensitization rapid (2 wk)** — engine should attenuate effect over time|
|**T3 (liothyronine)**|A/B (hyperthyroidism literature)|moderate fat loss|**moderate lean-mass LOSS** (catabolic)|low|engine should debit LBM as well as FM|
|**AICAR**|D (rodent only)|small fat-loss claim|neutral|low|preclinical only|
|**SLU-PP-332 (ERRα/β/γ agonist)**|D (Billon C et al., *J Pharmacol Exp Ther*. 2024;388(2):232–240)|preclinical fat-loss (mice)|preclinical lean-preserving|low|flag as preclinical; engine effect ~0.5× Cardarine on fat with endurance buff|

#### 5.8 Quick reference: starting-point effect vectors (12-week projection, normalized [−1, +1])

`+1` would mean "moves the relevant morph or state to its compound-saturated maximum" and `−1` "moves it fully toward its minimum." These are *tuning starting points* to calibrate against client beta data.

|Compound              |ΔFM  |ΔLBM     |ΔVAT |ΔECW |ΔICW |ΔColl|ΔTan                |ΔVasc|Ceiling lift       |
|----------------------|-----|---------|-----|-----|-----|-----|--------------------|-----|-------------------|
|Semaglutide 2.4 mg    |−0.40|−0.15    |−0.30|0    |0    |0    |0                   |+0.05|0                  |
|Retatrutide 12 mg     |−0.60|−0.20    |−0.50|0    |0    |0    |0                   |+0.10|0                  |
|Tesamorelin 2 mg      |−0.05|+0.10    |−0.45|+0.10|+0.10|+0.05|0                   |+0.05|0                  |
|MK-677 25 mg          |+0.05|+0.20    |0    |+0.40|+0.30|+0.05|0                   |−0.10|+0.03              |
|Ipa + CJC no-DAC      |0    |+0.10    |−0.05|+0.15|+0.15|+0.05|0                   |0    |+0.02              |
|CJC-1295-DAC          |−0.05|+0.15    |−0.05|+0.30|+0.20|+0.05|0                   |0    |+0.03              |
|IGF-1 LR3             |−0.05|+0.30    |0    |+0.20|+0.30|0    |0                   |0    |+0.05              |
|BPC-157               |0    |0        |0    |0    |0    |+0.05|0                   |0    |0 (R +0.10)        |
|TB-500                |0    |0        |0    |0    |0    |+0.03|0                   |0    |0 (R +0.10)        |
|GHK-Cu                |0    |0        |0    |0    |0    |+0.30|0                   |0    |0                  |
|Epitalon              |0    |0        |0    |0    |0    |+0.10|0                   |0    |0                  |
|Melanotan II          |−0.05|0        |0    |0    |0    |0    |+0.80 (capped by Fp)|0    |0                  |
|Testosterone 600 mg/wk|−0.20|+0.70    |−0.10|+0.50|+0.30|+0.05|0                   |+0.15|+0.40              |
|LGD-4033 10 mg        |−0.10|+0.35    |0    |+0.15|+0.15|0    |0                   |+0.10|+0.12              |
|Ostarine 20 mg        |−0.10|+0.20    |0    |+0.05|+0.05|0    |0                   |+0.05|+0.07              |
|RAD-140 15 mg         |−0.10|+0.45    |0    |+0.05|+0.10|0    |0                   |+0.15|+0.18              |
|YK-11                 |0    |+0.25    |0    |+0.05|+0.05|0    |0                   |+0.05|+0.10 (preclinical)|
|S-4 (Andarine)        |−0.10|+0.15    |0    |0    |+0.05|0    |0                   |+0.10|+0.06              |
|S-23                  |−0.05|+0.30    |0    |0    |+0.05|0    |0                   |+0.15|+0.12 (preclinical)|
|GW-501516             |−0.20|0        |−0.05|0    |0    |0    |0                   |+0.10|0                  |
|SR-9009               |−0.10|0        |0    |0    |0    |0    |0                   |+0.05|0 (preclinical)    |
|Clenbuterol           |−0.20|+0.05    |0    |0    |0    |0    |0                   |+0.15|+0.02              |
|T3                    |−0.30|**−0.20**|0    |0    |0    |−0.05|0                   |+0.05|0                  |
|AICAR                 |−0.05|0        |0    |0    |0    |0    |0                   |+0.05|0 (preclinical)    |
|SLU-PP-332            |−0.15|+0.05    |0    |0    |0    |0    |0                   |+0.10|0 (preclinical)    |

These numbers encode the *direction and rough magnitude* observed in the literature; they should be tuned by the engineering team against client outcomes data.

-----

### 6. TIME-DYNAMICS MODEL

#### 6.1 Three time-scales

- **Fast (τ ≈ 5–10 days):** water shifts (ECW from GH-axis, glycogen from training/diet). The FIRST visible Eidolon change in any GH-axis or "wet" stack.
- **Medium (τ ≈ 4–8 weeks):** fat-loss compounds reach their visible inflection. By Week 6 of semaglutide, ~30% of total projected loss has occurred.
- **Slow (τ ≈ 16–24 weeks):** LBM accrual. Even on testosterone 600 mg/wk, roughly half of the 20-week +7.9 kg FFM gain occurs in the first ~8–10 weeks.

#### 6.2 Recommended integrator

For each state `S_i(t)`:

```
dS_i/dt = Σ_compounds (effect_i_compound × dose_factor × R_multiplier)
        × (1 − S_i / S_i_max)^k
        − decay_i × (S_i − S_baseline)
```

- `dose_factor`: dose / reference_dose, clamped at 1.5 to prevent runaway scaling.
- `R_multiplier`: recovery multiplier from BPC/TB-500 etc., applied only to LBM gain.
- `(1 − S_i / S_i_max)^k`: saturation against the dynamically-shifted ceiling.
- `decay_i`: regression-to-baseline term active when no compound is pushing that state.

#### 6.3 Newbie-gains / training-status modulation (Lyle McDonald)

Apply a multiplier to all LBM-gain effects based on training-status:

- Untrained / first-year: ×1.5
- Year 2: ×1.0
- Year 3: ×0.6
- Advanced (4+ yr): ×0.3
- Elite / near-ceiling: ×0.15

A 21-year-old novice on RAD-140 projects much larger gains than a 35-year-old advanced lifter at the same dose.

#### 6.4 Sex modulation

- Women: halve LBM gain rates for non-SARM/non-anabolic stacks.
- Women: DOUBLE ostarine/SARM LBM-per-mg responsiveness (per Neil 2018). Net: similar total LBM but achieved at lower dose.
- Women: fat distribution is gynoid (hip/thigh) rather than android (waist) → bias `BF` reductions away from waist morph toward hip morph by ~40%.

#### 6.5 Regression / "Eidolon decay"

When a protocol ends:

- **Water (ECW + glycogen):** regresses within 2–4 weeks.
- **Tan:** regresses with t½ ≈ 2 months.
- **LBM:** ~30–50% of SARM-driven LBM lost in 8–12 weeks post-cycle without proper PCT.
- **Fat:** regresses only if user reverts to caloric surplus. Engine default for GLP-1 discontinuation: rebound to +11.6% above pre-treatment baseline at week 120 (Wilding 2022 — about two-thirds of prior loss reclaimed within a year of stopping).
- **Collagen:** slow; ~50% loss of GHK-Cu gains over 3–6 months without continued application.

-----

### 7. PHYSIOLOGY → MORPH MAPPING (the final visual translation)

```
bf_low = clamp(1 − BF / BF_baseline, 0, 1)

muscle_overall = sigmoid((LBM / LBM_max_effective − 0.7) × 8)

muscle_chest     = muscle_overall × (0.95 + 0.10 × androgen_tone)
muscle_shoulders = muscle_overall × (0.95 + 0.15 × androgen_tone)
muscle_arms      = muscle_overall × (0.95 + 0.15 × androgen_tone)
muscle_back      = muscle_overall × (0.95 + 0.10 × androgen_tone)
muscle_legs      = muscle_overall × (1.00 − 0.05 × androgen_tone)
muscle_calves    = muscle_overall × 0.80

abs_def = sigmoid((BF_threshold_abs − BF) × k_abs) × muscle_overall^0.5

vascularity = sigmoid((BF_threshold_vasc − BF) × k_vasc)
            × (LBM / LBM_max_effective)
            × (1 + 0.3 × vasodilator_flag)

water = clamp(0.5 × normalized_ECW_delta + 0.3 × glycogen_state
              + 0.2 × estrogen_aromatization_flag, 0, 1)

facial_fullness = 0.6 × (BF / BF_baseline) + 0.4 × normalized_ECW_delta

skin_tan                  = melanotan_state × Fitzpatrick_cap
skin_roughness_material   = 1 − Coll
skin_luminosity_material  = sqrt(Coll)
```

Use **sigmoid** for any morph that crosses a perceptual threshold (abs, vascularity, striations). Use **linear** for continuous, gradual changes (bf_low, facial fullness, tan, water). Use **sqrt / gamma** for material parameters that should "pop" early then plateau (luminosity).

-----

### 8. EVIDENCE-GRADE BADGES IN THE UI

For credibility, every compound's projected effect should carry a visible evidence badge:

- **A** ▮▮▮▮ "Human RCT, DEXA-confirmed" — Semaglutide, Retatrutide, Tesamorelin, MK-677, Testosterone, Clenbuterol, GHK-Cu (topical), Melanotan II (pigmentation), PT-141 (sexual function)
- **B** ▮▮▮ "Limited human data" — LGD-4033, Ostarine, CJC-1295-DAC, Sermorelin, Ipamorelin
- **C** ▮▮ "Anecdotal / case-series human" — RAD-140, S-4, IGF-1 LR3, Epitalon
- **D** ▮ "Preclinical only — mechanistic extrapolation" — BPC-157, TB-500, YK-11, S-23, SR-9009, AICAR, SLU-PP-332, MOTS-c, Fragment 176-191

This isn't just ethical disclosure — it lets the UI show confidence bands on the Eidolon (A-grade projections render as solid morphs; D-grade renders as a translucent "this is a hypothesis" overlay).

-----

## Recommendations

1. **Build the state layer first, then the mapping layer.**
1. **Calibrate against published anchors first, anecdotal sources second.**
1. **Treat water as a first-class citizen, not a side effect.**
1. **Ship the recovery multiplier as a separate concept.**
1. **Implement the Casey-Butt ceiling dynamically.**
1. **Stage the build** (see 7-sprint plan above).
1. **Benchmarks that should change the design** (see thresholds above).

-----

## Caveats

- **Most "anecdotal" SARM and prohormone magnitudes are confounded** by training, diet, and unknown stack composition. The C/D-grade numbers should be treated as the *ceiling of plausibility*, not the expected mean.
- **No compound here has 5+ year safety data outside the FDA-approved GLP-1s, PT-141, and tesamorelin.** The platform's framing should be relentless about "projected research outcomes" rather than "expected results."
- **The Eidolon is a parametric average, not a personal prediction.** Surface a confidence band, not a deterministic single result.
- **WADA-prohibited / FDA-unapproved compounds.** The platform should include this status as compound metadata.
- **GHK-Cu evidence is overwhelmingly topical, not systemic.** Do not overpromise systemic injection effects.
- **T3 catabolism risk.** The Eidolon should reflect that the user gets leaner but also visibly smaller / flatter in the muscle morphs.
- **The "water" morph is the single most user-confusing concept.** Consider exposing it as "fullness / water retention" with a tooltip.
- **Compounded / "research chemical" supply chain.** Effect-vector magnitudes assume label-accurate dosing. Surface this assumption clearly.
