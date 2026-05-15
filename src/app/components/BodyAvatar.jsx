"use client";

export default function BodyAvatar({ params, label, glow = false }) {
  const { fat, muscle, isMale } = params;

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

  const skinColor = glow ? "#d4a574" : "#c4956a";
  const skinDark = glow ? "#c49464" : "#b4855a";
  const glowFilter = glow ? "url(#avatarGlow)" : "";

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 260" style={{ width: "100%", maxWidth: 180 }}>
        {glow && (
          <defs>
            <filter id="avatarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="glowOverlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d68a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#22d68a" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        )}

        <g filter={glowFilter}>
          <ellipse cx={cx} cy={headY} rx={12 + fat * 3} ry={14 + fat * 2} fill={skinColor} />
          <ellipse cx={cx - 12 - fat * 3} cy={headY + 1} rx={2.5} ry={4} fill={skinDark} />
          <ellipse cx={cx + 12 + fat * 3} cy={headY + 1} rx={2.5} ry={4} fill={skinDark} />

          <rect x={cx - neckW / 2} y={neckY - 6} width={neckW} height={shoulderY - neckY + 6} rx={neckW / 3} fill={skinColor} />

          {trapH > 1 && (
            <path d={`M${cx - neckW / 2} ${neckY} Q${cx - shoulderW / 2 - 4} ${shoulderY - 4} ${cx - shoulderW / 2} ${shoulderY} L${cx + shoulderW / 2} ${shoulderY} Q${cx + shoulderW / 2 + 4} ${shoulderY - 4} ${cx + neckW / 2} ${neckY} Z`} fill={skinColor} />
          )}

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

          {isMale && muscle > 0.3 && (
            <>
              <ellipse cx={cx - 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
              <ellipse cx={cx + 10} cy={chestY - 2} rx={chestW / 4.5} ry={6 + muscle * 4} fill={skinDark} opacity="0.2" />
            </>
          )}

          {fat < 0.35 && isMale && (
            <line x1={cx} y1={chestY + 6} x2={cx} y2={waistY - 2} stroke={skinDark} strokeWidth="0.8" opacity={0.3 - fat * 0.6} />
          )}

          {[-1, 1].map(side => {
            const sx = cx + side * (shoulderW / 2);
            const elbowX = cx + side * (shoulderW / 2 + 8 + fat * 2);
            const elbowY = shoulderY + 42;
            const wristX = cx + side * (shoulderW / 2 + 4);
            const wristY = waistY + 16;
            return (
              <g key={side}>
                <path d={`
                  M${sx - side * armW / 2} ${shoulderY + 2}
                  Q${elbowX - side * armW / 2} ${elbowY} ${elbowX - side * (armW * 0.4)} ${elbowY}
                  L${elbowX + side * (armW * 0.4)} ${elbowY}
                  Q${elbowX + side * armW / 2} ${elbowY} ${sx + side * armW / 2} ${shoulderY + 2}
                  Z
                `} fill={skinColor} />
                <path d={`
                  M${elbowX - side * (armW * 0.4)} ${elbowY}
                  Q${wristX - side * 3} ${wristY} ${wristX - side * 2.5} ${wristY + 4}
                  L${wristX + side * 2.5} ${wristY + 4}
                  Q${wristX + side * 3} ${wristY} ${elbowX + side * (armW * 0.4)} ${elbowY}
                  Z
                `} fill={skinColor} />
                <ellipse cx={wristX} cy={wristY + 8} rx={3.5} ry={5} fill={skinDark} />
                <ellipse cx={sx} cy={shoulderY} rx={armW / 2 + muscle * 3} ry={5 + muscle * 4} fill={skinColor} />
              </g>
            );
          })}

          {[-1, 1].map(side => {
            const kneeX = cx + side * (hipW / 3);
            return (
              <g key={`leg${side}`}>
                <path d={`
                  M${cx + side * (hipW / 2)} ${hipY}
                  Q${cx + side * (hipW / 2 + 2)} ${(hipY + kneeY) / 2} ${kneeX + side * (thighW / 3)} ${kneeY}
                  L${kneeX - side * (thighW / 3)} ${kneeY}
                  Q${cx + side * (hipW / 4 - 2)} ${(hipY + kneeY) / 2} ${cx + side * (hipW / 4)} ${hipY}
                  Z
                `} fill={skinColor} />
                <path d={`
                  M${kneeX + side * (thighW / 3)} ${kneeY}
                  Q${kneeX + side * (calfW / 2 + 2)} ${(kneeY + ankleY) / 2 - 8} ${kneeX + side * 3} ${ankleY}
                  L${kneeX - side * 3} ${ankleY}
                  Q${kneeX - side * (calfW / 2)} ${(kneeY + ankleY) / 2 - 8} ${kneeX - side * (thighW / 3)} ${kneeY}
                  Z
                `} fill={skinColor} />
                <ellipse cx={kneeX + side * 1} cy={footY} rx={6 + fat} ry={3} fill={skinDark} />
              </g>
            );
          })}
        </g>

        {glow && (
          <rect x="0" y="0" width="200" height="260" fill="url(#glowOverlay)" />
        )}
      </svg>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: glow ? "#22d68a" : "rgba(255,255,255,0.5)",
        marginTop: 4
      }}>{label}</div>
    </div>
  );
}
