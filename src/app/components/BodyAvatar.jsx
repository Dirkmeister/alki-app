// ── SVG AVATAR COMPONENT ───────────────────────────────────
// Athletic wear + anatomical definition. The body is visible because
// the entire point of the projected eidolon is showing physique change.
// Definition lines (abs, pecs, obliques, delts, quads) fade in as BF drops:
// fully visible at ~8% BF, gone by 20% BF. Muscle-driven lines (biceps,
// quad sweep) scale independently with the muscle param.
//
// Self-contained: every dimension is derived from `params`; it references no
// shared module state, so it ports cleanly. Extracted from AlkiApp.jsx.
export default function BodyAvatar({ params, label, glow = false, maxWidth = 180 }) {
  const { fat, muscle, isMale } = params;

  // Derived dimensions
  const shoulderW = isMale ? 52 + muscle * 30 : 42 + muscle * 20;
  const chestW = isMale ? 44 + muscle * 20 + fat * 10 : 38 + muscle * 12 + fat * 10;
  const waistW = 28 + fat * 32 + (isMale ? 0 : fat * 6);
  const hipW = isMale ? 34 + fat * 16 : 40 + fat * 20 + muscle * 4;
  const armW = 6 + muscle * 6 + fat * 4;
  const thighW = isMale ? 14 + muscle * 8 + fat * 8 : 16 + muscle * 6 + fat * 10;
  const calfW = 8 + muscle * 4 + fat * 3;
  const neckW = 10 + muscle * 4 + fat * 4;
  const trapH = muscle * 6;

  const cx = 100;
  const headY = 28;
  const neckY = 48;
  const shoulderY = 58 + trapH;
  const chestY = 78;
  const waistY = 108;
  const hipY = 128;
  const kneeY = 185;
  const ankleY = 230;
  const footY = 240;

  // ── Definition layer (Plan B) ────────────────────────────────────
  // Recover BF% from the normalized 0..1 fat param (inverse of resolveAvatarParams).
  const bfPercent = 6 + fat * 34;
  // Anatomical definition opacity: fully visible <= 8% BF, fades to 0 by 20% BF.
  const defOpacity = Math.max(0, Math.min(1, (20 - bfPercent) / 12));
  // Hide fine anatomical lines at small render sizes (thumbnails, switcher cards).
  const showDetail = maxWidth >= 150;
  const defStrokeMinor = `rgba(255,255,255,${defOpacity * 0.4})`;
  const defStrokeMajor = `rgba(255,255,255,${defOpacity * 0.55})`;
  // Muscle-driven stroke (biceps, quads) — fades in independently of BF.
  const muscleOpacity = Math.max(0, (muscle - 0.35) * 0.9);
  const muscleStroke = `rgba(255,255,255,${muscleOpacity})`;

  // Athletic wear
  const wearFill = "#1a1a1a";
  const wearAccent = "#2a2a2a";
  const shortsTopY = hipY - 6;
  const shortsBottomY = hipY + 30;
  const braTopY = chestY - 12;
  const braBottomY = chestY + 12;

  // #22 — warmer, cleaner palette + a vertical skin gradient (top-lit) so the body
  // reads with form instead of a flat muddy fill. skinColor now points at a gradient;
  // skinDark stays solid for shading accents (ears, hands, feet, pec shadow).
  const gradId = glow ? "alkiSkinGradGlow" : "alkiSkinGrad";
  const skinLight = glow ? "#e8bd8c" : "#dcae80";
  const skinMid   = glow ? "#d4a274" : "#c89570";
  const skinDeep  = glow ? "#bb8f5e" : "#ac7d54";
  const skinColor = `url(#${gradId})`;
  const skinDark = glow ? "#a67b4f" : "#936a48";
  const glowFilter = glow ? "url(#avatarGlow)" : "";

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 260" style={{ width: "100%", maxWidth }}>
        {/* #22 — always-present skin gradient for depth */}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0.15" y2="1">
            <stop offset="0%" stopColor={skinLight} />
            <stop offset="48%" stopColor={skinMid} />
            <stop offset="100%" stopColor={skinDeep} />
          </linearGradient>
        </defs>
        {glow && (
          <defs>
            <filter id="avatarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="glowOverlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1ae87a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1ae87a" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        )}

        {/* #22 — soft ground shadow to anchor the figure on the dark theme */}
        <ellipse cx={cx} cy={footY + 6} rx={26 + fat * 6} ry={3.5} fill="#000" opacity="0.28" />

        <g filter={glowFilter}>
          {/* Head */}
          <ellipse cx={cx} cy={headY} rx={12 + fat * 3} ry={14 + fat * 2} fill={skinColor} />
          {/* Ears */}
          <ellipse cx={cx - 12 - fat * 3} cy={headY + 1} rx={2.5} ry={4} fill={skinDark} />
          <ellipse cx={cx + 12 + fat * 3} cy={headY + 1} rx={2.5} ry={4} fill={skinDark} />

          {/* Neck */}
          <rect x={cx - neckW / 2} y={neckY - 6} width={neckW} height={shoulderY - neckY + 6} rx={neckW / 3} fill={skinColor} />

          {/* Traps */}
          {trapH > 1 && (
            <path d={`M${cx - neckW / 2} ${neckY} Q${cx - shoulderW / 2 - 4} ${shoulderY - 4} ${cx - shoulderW / 2} ${shoulderY} L${cx + shoulderW / 2} ${shoulderY} Q${cx + shoulderW / 2 + 4} ${shoulderY - 4} ${cx + neckW / 2} ${neckY} Z`} fill={skinColor} />
          )}

          {/* Torso */}
          <path d={`
            M${cx - shoulderW / 2} ${shoulderY}
            Q${cx - chestW / 2 - 4} ${chestY - 8} ${cx - chestW / 2} ${chestY}
            Q${cx - waistW / 2 - 2} ${(chestY + waistY) / 2} ${cx - waistW / 2} ${waistY}
            Q${cx - hipW / 2 - 2} ${(waistY + hipY) / 2} ${cx - hipW / 2} ${hipY}
            L${cx + hipW / 2} ${hipY}
            Q${cx + hipW / 2 + 2} ${(waistY + hipY) / 2} ${cx + waistW / 2} ${waistY}
            Q${cx + waistW / 2 + 2} ${(chestY + waistY) / 2} ${cx + chestW / 2} ${chestY}
            Q${cx + chestW / 2 + 4} ${chestY - 8} ${cx + shoulderW / 2} ${shoulderY}
            Z
          `} fill={skinColor} />

          {/* Pec shading (male, muscle-driven) */}
          {isMale && muscle > 0.3 && (
            <>
              <ellipse cx={cx - 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
              <ellipse cx={cx + 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
            </>
          )}

          {/* ── ANATOMICAL DEFINITION (on bare torso) ─────────────── */}
          {/* Male: pec separation + pec undercurves + 6-pack grid */}
          {showDetail && defOpacity > 0.02 && isMale && (
            <g>
              {/* Pec separation / sternum line */}
              <line x1={cx} y1={chestY - 6} x2={cx} y2={chestY + 10} stroke={defStrokeMajor} strokeWidth="0.8" />
              {/* Pec bottom curves */}
              <path d={`M${cx - chestW / 2 + 4} ${chestY + 8} Q${cx - 5} ${chestY + 13} ${cx - 1.5} ${chestY + 9}`} stroke={defStrokeMinor} strokeWidth="0.7" fill="none" />
              <path d={`M${cx + 1.5} ${chestY + 9} Q${cx + 5} ${chestY + 13} ${cx + chestW / 2 - 4} ${chestY + 8}`} stroke={defStrokeMinor} strokeWidth="0.7" fill="none" />
              {/* Linea alba — vertical center line through abs */}
              <line x1={cx} y1={chestY + 14} x2={cx} y2={waistY + 4} stroke={defStrokeMajor} strokeWidth="0.7" />
              {/* Three transverse ab lines (6-pack grid) */}
              {[0.28, 0.55, 0.82].map(t => {
                const y = chestY + 14 + (waistY + 4 - chestY - 14) * t;
                const lineW = waistW / 3 + 1;
                return (
                  <line key={`ab${t}`} x1={cx - lineW} y1={y} x2={cx + lineW} y2={y} stroke={defStrokeMinor} strokeWidth="0.5" />
                );
              })}
            </g>
          )}

          {/* Obliques — both genders, fade with BF */}
          {showDetail && defOpacity > 0.1 && (
            <g>
              <path d={`M${cx - waistW / 2 + 1} ${chestY + 18} Q${cx - waistW / 2 - 1.5} ${waistY + 2} ${cx - hipW / 3} ${hipY - 4}`} stroke={defStrokeMinor} strokeWidth="0.55" fill="none" />
              <path d={`M${cx + waistW / 2 - 1} ${chestY + 18} Q${cx + waistW / 2 + 1.5} ${waistY + 2} ${cx + hipW / 3} ${hipY - 4}`} stroke={defStrokeMinor} strokeWidth="0.55" fill="none" />
            </g>
          )}

          {/* Female midriff tone — single subtle linea alba */}
          {showDetail && defOpacity > 0.1 && !isMale && (
            <line x1={cx} y1={chestY + 16} x2={cx} y2={waistY + 4} stroke={defStrokeMinor} strokeWidth="0.5" />
          )}

          {/* Arms (with deltoid caps + definition) */}
          {[-1, 1].map(side => {
            const sx = cx + side * (shoulderW / 2);
            const elbowX = cx + side * (shoulderW / 2 + 8 + fat * 2);
            const elbowY = shoulderY + 42;
            const wristX = cx + side * (shoulderW / 2 + 4);
            const wristY = waistY + 16;
            return (
              <g key={side}>
                {/* Upper arm */}
                <path d={`
                  M${sx - side * armW / 2} ${shoulderY + 2}
                  Q${elbowX - side * armW / 2} ${elbowY} ${elbowX - side * (armW * 0.4)} ${elbowY}
                  L${elbowX + side * (armW * 0.4)} ${elbowY}
                  Q${elbowX + side * armW / 2} ${elbowY} ${sx + side * armW / 2} ${shoulderY + 2}
                  Z
                `} fill={skinColor} />
                {/* Forearm */}
                <path d={`
                  M${elbowX - side * (armW * 0.4)} ${elbowY}
                  Q${wristX - side * 3} ${wristY} ${wristX - side * 2.5} ${wristY + 4}
                  L${wristX + side * 2.5} ${wristY + 4}
                  Q${wristX + side * 3} ${wristY} ${elbowX + side * (armW * 0.4)} ${elbowY}
                  Z
                `} fill={skinColor} />
                {/* Hand */}
                <ellipse cx={wristX} cy={wristY + 8} rx={3.5} ry={5} fill={skinDark} />

                {/* Deltoid cap */}
                <ellipse cx={sx} cy={shoulderY} rx={armW / 2 + muscle * 3} ry={5 + muscle * 4} fill={skinColor} />

                {/* Deltoid cap separation arc (delt-to-arm) */}
                {showDetail && defOpacity > 0.05 && (
                  <path
                    d={`M${sx - side * 0.5} ${shoulderY - 2 - muscle * 2} Q${sx + side * (armW / 2 + 1.5)} ${shoulderY + 3} ${sx - side * 0.5} ${shoulderY + 8 + muscle * 2}`}
                    stroke={defStrokeMinor}
                    strokeWidth="0.6"
                    fill="none"
                  />
                )}

                {/* Bicep peak (muscle-driven) */}
                {showDetail && muscle > 0.4 && (
                  <path
                    d={`M${elbowX - side * (armW * 0.4)} ${shoulderY + 22} Q${elbowX - side * (armW * 0.05)} ${shoulderY + 30} ${elbowX - side * (armW * 0.4)} ${shoulderY + 38}`}
                    stroke={muscleStroke}
                    strokeWidth="0.5"
                    fill="none"
                  />
                )}

                {/* Forearm definition (BF-driven) */}
                {showDetail && defOpacity > 0.2 && (
                  <line
                    x1={wristX - side * 1.5}
                    y1={elbowY + 8}
                    x2={wristX - side * 0.5}
                    y2={wristY - 4}
                    stroke={defStrokeMinor}
                    strokeWidth="0.4"
                  />
                )}
              </g>
            );
          })}

          {/* Legs */}
          {[-1, 1].map(side => {
            const kneeX = cx + side * (hipW / 3);
            return (
              <g key={`leg${side}`}>
                {/* Thigh */}
                <path d={`
                  M${cx + side * (hipW / 2)} ${hipY}
                  Q${cx + side * (hipW / 2 + 2)} ${(hipY + kneeY) / 2} ${kneeX + side * (thighW / 3)} ${kneeY}
                  L${kneeX - side * (thighW / 3)} ${kneeY}
                  Q${cx + side * (hipW / 4 - 2)} ${(hipY + kneeY) / 2} ${cx + side * (hipW / 4)} ${hipY}
                  Z
                `} fill={skinColor} />
                {/* Calf */}
                <path d={`
                  M${kneeX + side * (thighW / 3)} ${kneeY}
                  Q${kneeX + side * (calfW / 2 + 2)} ${(kneeY + ankleY) / 2 - 8} ${kneeX + side * 3} ${ankleY}
                  L${kneeX - side * 3} ${ankleY}
                  Q${kneeX - side * (calfW / 2)} ${(kneeY + ankleY) / 2 - 8} ${kneeX - side * (thighW / 3)} ${kneeY}
                  Z
                `} fill={skinColor} />
                {/* Foot */}
                <ellipse cx={kneeX + side * 1} cy={footY} rx={6 + fat} ry={3} fill={skinDark} />
              </g>
            );
          })}

          {/* ── ATHLETIC WEAR — drawn over hips & upper legs ──────── */}
          {/* Shorts: waistband at hip, tapers to mid-thigh, inseam in center */}
          <path d={`
            M${cx - hipW / 2 - 1} ${shortsTopY}
            L${cx + hipW / 2 + 1} ${shortsTopY}
            L${cx + hipW / 2 + 1} ${hipY + 4}
            Q${cx + hipW / 2 + 1} ${shortsBottomY - 8} ${cx + hipW / 3 + thighW / 3 + 1} ${shortsBottomY}
            L${cx + 3} ${shortsBottomY + 1}
            L${cx + 1} ${shortsBottomY - 5}
            L${cx - 1} ${shortsBottomY - 5}
            L${cx - 3} ${shortsBottomY + 1}
            L${cx - hipW / 3 - thighW / 3 - 1} ${shortsBottomY}
            Q${cx - hipW / 2 - 1} ${shortsBottomY - 8} ${cx - hipW / 2 - 1} ${hipY + 4}
            Z
          `} fill={wearFill} />
          {/* Waistband stripe */}
          <rect x={cx - hipW / 2 - 1} y={shortsTopY} width={hipW + 2} height={2.5} fill={wearAccent} />

          {/* Sports bra (female) — band + straps + center seam */}
          {!isMale && (
            <g>
              {/* Main band */}
              <path d={`
                M${cx - chestW / 2 - 1} ${braTopY + 3}
                Q${cx - chestW / 2 - 1} ${braTopY} ${cx - chestW / 2 + 3} ${braTopY}
                L${cx + chestW / 2 - 3} ${braTopY}
                Q${cx + chestW / 2 + 1} ${braTopY} ${cx + chestW / 2 + 1} ${braTopY + 3}
                L${cx + chestW / 2} ${braBottomY - 2}
                Q${cx + chestW / 2 - 3} ${braBottomY + 2} ${cx} ${braBottomY + 1}
                Q${cx - chestW / 2 + 3} ${braBottomY + 2} ${cx - chestW / 2} ${braBottomY - 2}
                Z
              `} fill={wearFill} />
              {/* Center seam */}
              <line x1={cx} y1={braTopY + 2} x2={cx} y2={braBottomY} stroke={wearAccent} strokeWidth="0.5" />
              {/* Underbust accent */}
              <path d={`M${cx - chestW / 2 + 2} ${braBottomY - 1} Q${cx} ${braBottomY + 2} ${cx + chestW / 2 - 2} ${braBottomY - 1}`} stroke={wearAccent} strokeWidth="0.6" fill="none" />
              {/* Left strap */}
              <path d={`
                M${cx - chestW / 2 + 5} ${braTopY + 1}
                L${cx - shoulderW / 2 + 4} ${shoulderY + 2}
                L${cx - shoulderW / 2 + 8} ${shoulderY + 2}
                L${cx - chestW / 2 + 9} ${braTopY + 1}
                Z
              `} fill={wearFill} />
              {/* Right strap */}
              <path d={`
                M${cx + chestW / 2 - 5} ${braTopY + 1}
                L${cx + shoulderW / 2 - 4} ${shoulderY + 2}
                L${cx + shoulderW / 2 - 8} ${shoulderY + 2}
                L${cx + chestW / 2 - 9} ${braTopY + 1}
                Z
              `} fill={wearFill} />
            </g>
          )}

          {/* ── LEG DEFINITION (after shorts, visible on thighs/calves) ── */}
          {showDetail && [-1, 1].map(side => {
            const kneeX = cx + side * (hipW / 3);
            // Quad sweep needs either visible muscle OR low BF to show
            const quadVisible = muscle > 0.35 || defOpacity > 0.2;
            if (!quadVisible) return null;
            // Combined opacity from both BF and muscle signals
            const quadOp = Math.min(1, defOpacity * 0.45 + Math.max(0, (muscle - 0.35) * 0.7));
            return (
              <g key={`legdef${side}`}>
                {/* Outer quad sweep — diagonal line on outer thigh */}
                <line
                  x1={cx + side * (hipW / 2 - 3)}
                  y1={shortsBottomY + 3}
                  x2={kneeX + side * (thighW / 3 - 1)}
                  y2={kneeY - 4}
                  stroke={`rgba(255,255,255,${quadOp * 0.5})`}
                  strokeWidth="0.55"
                />
                {/* Inner quad — only at higher muscle / lower BF */}
                {(muscle > 0.5 || defOpacity > 0.4) && (
                  <line
                    x1={cx + side * (hipW / 6)}
                    y1={shortsBottomY + 3}
                    x2={kneeX - side * (thighW / 3 - 1)}
                    y2={kneeY - 4}
                    stroke={`rgba(255,255,255,${quadOp * 0.35})`}
                    strokeWidth="0.4"
                  />
                )}
                {/* Calf split — gastrocnemius shape */}
                {(muscle > 0.4 || defOpacity > 0.3) && (
                  <line
                    x1={kneeX + side * 2}
                    y1={kneeY + 6}
                    x2={kneeX + side * 1.5}
                    y2={(kneeY + ankleY) / 2 + 4}
                    stroke={`rgba(255,255,255,${quadOp * 0.4})`}
                    strokeWidth="0.4"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Projected glow overlay */}
        {glow && (
          <rect x="0" y="0" width="200" height="260" fill="url(#glowOverlay)" />
        )}
      </svg>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: glow ? "#1ae87a" : "rgba(255,255,255,0.5)",
        marginTop: 4
      }}>{label}</div>
    </div>
  );
}
