"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useMemo, useEffect, useState } from "react";
import * as THREE from "three";

/**
 * Body3DAvatar — Three.js avatar renderer for Alki.
 *
 * Two render modes:
 *   1. Photoreal GLB (when `avatarUrl` is provided): renders an
 *      Avaturn-exported GLB, auto-framed via bounding-box measurement,
 *      with parametric body-comp morphing applied via mesh scale.
 *   2. Parametric humanoid fallback (when `avatarUrl` is null):
 *      renders the primitive-based humanoid driven by
 *      { fat, muscle, isMale }.
 *
 * Coordinate convention (both modes):
 *   - Model feet land on y = 0
 *   - Model head-top is at y ≈ 1.7
 *   - Mid-torso ≈ y = 0.95
 *
 * That convention is enforced inside each <Humanoid />
 * and <GLBAvatar />, so the outer Canvas camera + target work
 * identically for both modes.
 */

// ──────────────────────────────────────────────────────────────
// PARAMETRIC HUMANOID (fallback)
// Anchored: feet at y=0, head at y≈1.7
// ──────────────────────────────────────────────────────────────
function Humanoid({ params, glow, autoRotate = true }) {
  const { fat, muscle, isMale } = params;
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  const shoulderW = isMale ? 0.46 + muscle * 0.16 : 0.36 + muscle * 0.10;
  const chestW    = isMale ? 0.36 + muscle * 0.10 + fat * 0.08 : 0.30 + muscle * 0.06 + fat * 0.09;
  const waistW    = 0.22 + fat * 0.20 + (isMale ? 0 : fat * 0.04);
  const hipW      = isMale ? 0.30 + fat * 0.10 : 0.36 + fat * 0.14 + muscle * 0.02;
  const armR      = 0.052 + muscle * 0.024 + fat * 0.014;
  const foreR     = 0.042 + muscle * 0.014 + fat * 0.010;
  const thighR    = isMale ? 0.082 + muscle * 0.022 + fat * 0.022 : 0.090 + muscle * 0.016 + fat * 0.034;
  const calfR     = 0.058 + muscle * 0.014 + fat * 0.012;
  const neckR     = 0.062 + muscle * 0.018 + fat * 0.016;
  const headR     = 0.105 + fat * 0.020;
  const deltR     = armR + muscle * 0.022;

  // Y positions — feet at 0, head ≈ 1.72
  const headY     = 1.62;
  const neckTop   = 1.52;
  const neckBot   = 1.43;
  const shoulderY = 1.41;
  const chestY    = 1.22;
  const waistY    = 1.00;
  const hipY      = 0.88;
  const kneeY     = 0.48;
  const ankleY    = 0.06;

  const skinHex   = glow ? "#d4a87a" : "#c69771";
  const skinDeep  = glow ? "#b88a5e" : "#a37a52";
  const emissive  = glow ? "#0e4a2a" : "#000000";
  const emInt     = glow ? 0.35 : 0;

  const skinMat = useMemo(() => ({
    color: skinHex,
    roughness: 0.62,
    metalness: 0.0,
    emissive: emissive,
    emissiveIntensity: emInt,
  }), [skinHex, emissive, emInt]);

  const skinDeepMat = useMemo(() => ({
    color: skinDeep,
    roughness: 0.65,
    metalness: 0.0,
    emissive: emissive,
    emissiveIntensity: emInt * 0.5,
  }), [skinDeep, emissive, emInt]);

  const Limb = ({ x, yTop, yBot, rTop, rBot, mat = skinMat }) => {
    const h = yTop - yBot;
    const yMid = (yTop + yBot) / 2;
    return (
      <mesh position={[x, yMid, 0]} castShadow>
        <cylinderGeometry args={[rTop, rBot, h, 20, 1, false]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    );
  };

  // NO outer offset — feet sit at y=0 as the convention requires.
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[headR, 32, 32]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      <Limb x={0} yTop={neckTop} yBot={neckBot} rTop={neckR * 0.88} rBot={neckR} />

      {muscle > 0.35 && (
        <mesh position={[0, shoulderY + 0.025, 0]} castShadow>
          <sphereGeometry args={[shoulderW * 0.45, 18, 12]} />
          <meshStandardMaterial {...skinDeepMat} />
        </mesh>
      )}

      <mesh position={[-shoulderW / 2 + 0.01, shoulderY - 0.02, 0]} castShadow>
        <sphereGeometry args={[deltR, 18, 14]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>
      <mesh position={[shoulderW / 2 - 0.01, shoulderY - 0.02, 0]} castShadow>
        <sphereGeometry args={[deltR, 18, 14]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      <Limb x={0} yTop={shoulderY} yBot={chestY} rTop={shoulderW / 2.3} rBot={chestW / 2} />
      <Limb x={0} yTop={chestY} yBot={waistY} rTop={chestW / 2} rBot={waistW / 2} />
      <Limb x={0} yTop={waistY} yBot={hipY} rTop={waistW / 2} rBot={hipW / 2} />

      {/* Male: pec mass hint */}
      {isMale && muscle > 0.4 && (
        <>
          <mesh position={[-chestW / 4, chestY + 0.05, chestW / 4]} castShadow>
            <sphereGeometry args={[chestW / 5, 18, 12]} />
            <meshStandardMaterial {...skinDeepMat} />
          </mesh>
          <mesh position={[chestW / 4, chestY + 0.05, chestW / 4]} castShadow>
            <sphereGeometry args={[chestW / 5, 18, 12]} />
            <meshStandardMaterial {...skinDeepMat} />
          </mesh>
        </>
      )}

      {/* Male: visible pec plate even at lower muscle (so chest reads male) */}
      {isMale && (
        <>
          <mesh position={[-chestW / 4.5, chestY + 0.04, chestW / 5]} castShadow>
            <sphereGeometry args={[chestW / 4.5, 20, 14]} />
            <meshStandardMaterial color={skinHex} roughness={0.62} metalness={0} />
          </mesh>
          <mesh position={[chestW / 4.5, chestY + 0.04, chestW / 5]} castShadow>
            <sphereGeometry args={[chestW / 4.5, 20, 14]} />
            <meshStandardMaterial color={skinHex} roughness={0.62} metalness={0} />
          </mesh>
        </>
      )}

      {[-1, 1].map((side) => {
        const shoulderX = side * (shoulderW / 2 - 0.005);
        const elbowY = shoulderY - 0.32;
        const wristY = elbowY - 0.30;
        return (
          <group key={`arm${side}`}>
            <Limb x={shoulderX} yTop={shoulderY - 0.02} yBot={elbowY} rTop={armR} rBot={armR * 0.85} />
            <mesh position={[shoulderX, elbowY, 0]} castShadow>
              <sphereGeometry args={[armR * 0.9, 14, 12]} />
              <meshStandardMaterial {...skinDeepMat} />
            </mesh>
            <Limb x={shoulderX} yTop={elbowY} yBot={wristY} rTop={foreR * 1.1} rBot={foreR * 0.75} />
            <mesh position={[shoulderX, wristY - 0.06, 0]} castShadow>
              <sphereGeometry args={[foreR * 0.95, 14, 12]} />
              <meshStandardMaterial {...skinDeepMat} />
            </mesh>
          </group>
        );
      })}

      {[-1, 1].map((side) => {
        const hipX = side * (hipW / 2 - thighR * 0.6);
        return (
          <group key={`leg${side}`}>
            <Limb x={hipX} yTop={hipY} yBot={kneeY} rTop={thighR} rBot={thighR * 0.7} />
            <mesh position={[hipX, kneeY, 0]} castShadow>
              <sphereGeometry args={[thighR * 0.78, 16, 12]} />
              <meshStandardMaterial {...skinDeepMat} />
            </mesh>
            <Limb x={hipX} yTop={kneeY} yBot={ankleY} rTop={calfR * 1.15} rBot={calfR * 0.7} />
            <mesh position={[hipX, ankleY - 0.04, 0.04]} castShadow>
              <boxGeometry args={[calfR * 1.6, 0.05, 0.18]} />
              <meshStandardMaterial {...skinDeepMat} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// GLB AVATAR (photoreal — Avaturn export)
// Normalized to: feet at y=0, head ≈ y=1.7
// ──────────────────────────────────────────────────────────────
function GLBAvatar({ url, params, glow, autoRotate = true }) {
  const { fat, muscle } = params;
  const groupRef = useRef();
  const { scene } = useGLTF(url);

  // Clone so multiple instances (current + projected) don't share state.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Auto-fit: measure box, recenter X/Z, lift floor to y=0, scale to 1.7m.
  const fit = useMemo(() => {
    if (!cloned) return { scale: 1, offsetX: 0, offsetY: 0, offsetZ: 0 };

    // Reset any previous transform we applied, so re-measure is accurate.
    cloned.position.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);

    const modelHeight = Math.max(size.y, 0.001);
    const targetHeight = 1.7;
    const scale = targetHeight / modelHeight;

    // After scaling:
    //   new floor y = box.min.y * scale
    //   new midX   = (box.min.x + box.max.x) / 2 * scale
    //   new midZ   = (box.min.z + box.max.z) / 2 * scale
    const offsetY = -box.min.y * scale;                       // lift feet to y=0
    const offsetX = -((box.min.x + box.max.x) / 2) * scale;   // center X
    const offsetZ = -((box.min.z + box.max.z) / 2) * scale;   // center Z

    return { scale, offsetX, offsetY, offsetZ };
  }, [cloned]);

  // Apply per-mesh body-comp tweaks WITHOUT touching the head.
  useEffect(() => {
    if (!cloned) return;
    const torsoScaleX = 1.0 + fat * 0.10 - muscle * 0.02 + muscle * 0.04;
    const torsoScaleY = 1.0;
    const torsoScaleZ = 1.0 + fat * 0.08 + muscle * 0.03;

    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      const lower = (obj.name || "").toLowerCase();
      const isHead =
        lower.includes("head") ||
        lower.includes("face") ||
        lower.includes("hair") ||
        lower.includes("eye") ||
        lower.includes("teeth") ||
        lower.includes("tongue") ||
        lower.includes("beard") ||
        lower.includes("brow");
      const isBody = !isHead && (
        lower.includes("body") ||
        lower.includes("torso") ||
        lower.includes("avatar")
      );

      if (isHead) {
        obj.scale.set(1, 1, 1);
      } else if (isBody) {
        obj.scale.set(torsoScaleX, torsoScaleY, torsoScaleZ);
      }

      if (obj.material && !obj.userData._alkiTuned) {
        if (obj.material.roughness !== undefined) {
          obj.material.roughness = Math.min(1, (obj.material.roughness ?? 0.7) + 0.05);
          obj.material.metalness = 0;
        }
        if (glow && obj.material.emissive) {
          obj.material.emissive = new THREE.Color("#0e4a2a");
          obj.material.emissiveIntensity = 0.18;
        }
        obj.material.needsUpdate = true;
        obj.userData._alkiTuned = true;
      }
      obj.castShadow = true;
      obj.receiveShadow = false;
    });
  }, [cloned, fat, muscle, glow]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[fit.offsetX, fit.offsetY, fit.offsetZ]}
      scale={fit.scale}
    >
      <primitive object={cloned} />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// OUTER COMPONENT
// One camera convention for both modes since both place feet at y=0.
// ──────────────────────────────────────────────────────────────
export default function Body3DAvatar({
  params,
  label,
  glow = false,
  size = "large",       // "small" | "large"
  interactive = true,
  autoRotate = true,
  avatarUrl = null,
}) {
  const isGLB = !!avatarUrl;

  // Camera setups (model is 1.7m tall, feet at y=0):
  //   - LARGE: full body. Camera at mid-body height, ~3.0m away.
  //   - SMALL: head-and-shoulders portrait. Camera near head, very close.
  let camPos, camFov, targetY, ctrlMinPol, ctrlMaxPol;

  if (size === "small") {
    // Profile-card bubble — head + upper chest portrait
    camPos = [0, 1.55, 1.4];
    camFov = 26;
    targetY = 1.55;
    ctrlMinPol = Math.PI / 2.4;
    ctrlMaxPol = Math.PI / 1.95;
  } else {
    // Full-body framing
    camPos = isGLB ? [0, 1.0, 3.4] : [0, 1.0, 3.0];
    camFov = isGLB ? 26 : 28;
    targetY = 0.95;
    ctrlMinPol = Math.PI / 2.6;
    ctrlMaxPol = Math.PI / 1.9;
  }

  const wrapStyle = size === "small"
    ? { width: "100%", aspectRatio: "1 / 1.4", maxWidth: 100 }
    : { width: "100%", aspectRatio: "1 / 1.6", maxWidth: 200 };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={wrapStyle}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: camPos, fov: camFov }}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
          style={{ background: "transparent" }}
        >
          {/* Premium 3-point lighting */}
          <ambientLight intensity={0.42} />
          <directionalLight
            position={[2.5, 4, 3]}
            intensity={1.15}
            color="#ffffff"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-2.5, 2, 2]} intensity={0.5} color="#a8c8ff" />
          <directionalLight position={[0, 3.5, -2]} intensity={0.55} color="#ffffff" />
          {glow && (
            <directionalLight position={[0, 2, -3]} intensity={1.3} color="#22d68a" />
          )}

          <Suspense fallback={null}>
            {isGLB ? (
              <GLBAvatar url={avatarUrl} params={params} glow={glow} autoRotate={autoRotate} />
            ) : (
              <Humanoid params={params} glow={glow} autoRotate={autoRotate} />
            )}
            {size === "large" && (
              <ContactShadows
                position={[0, 0, 0]}
                opacity={0.45}
                scale={3}
                blur={2.4}
                far={1.2}
                resolution={512}
              />
            )}
          </Suspense>

          {interactive && (
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              minPolarAngle={ctrlMinPol}
              maxPolarAngle={ctrlMaxPol}
              autoRotate={false}
              dampingFactor={0.08}
              target={[0, targetY, 0]}
            />
          )}
        </Canvas>
      </div>
      {label && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: glow ? "#22d68a" : "rgba(255,255,255,0.5)",
            marginTop: 6,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
