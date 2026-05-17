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
 * Both modes accept the same `params` object so the rest of the
 * app does not need to change between modes.
 */

// ──────────────────────────────────────────────────────────────
// PARAMETRIC HUMANOID (fallback)
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

  return (
    <group ref={groupRef} position={[0, -0.85, 0]}>
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
// ──────────────────────────────────────────────────────────────
function GLBAvatar({ url, params, glow, autoRotate = true, framing = "full" }) {
  const { fat, muscle } = params;
  const groupRef = useRef();
  const { scene } = useGLTF(url);

  // Clone so multiple instances (current + projected) don't share state
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Measure the model on first load to compute scale + center offset.
  // Avaturn models are ~1.7m tall with origin at feet, but we frame
  // everything to a normalized "unit-1.7m model centered around y=0.85"
  // so the camera framing in the outer Canvas can be universal.
  const fitTransform = useMemo(() => {
    if (!cloned) return { scale: 1, offsetY: 0, height: 1.7 };
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const modelHeight = Math.max(size.y, 0.001);
    const targetHeight = 1.7; // canonical target height in scene units
    const scale = targetHeight / modelHeight;

    // After scaling, we want feet at y=0 (so model occupies y=0..1.7).
    // box.min.y * scale would be the new floor; we shift up by -box.min.y * scale.
    const floorAfterScale = box.min.y * scale;
    const offsetY = -floorAfterScale;

    return { scale, offsetY, height: targetHeight, centerX: -center.x * scale, centerZ: -center.z * scale };
  }, [cloned]);

  useEffect(() => {
    if (!cloned) return;

    // Body-comp scale heuristic — visible enough to read on previews
    // but conservative enough to never distort the head or face.
    const torsoScaleX = 1.0 + fat * 0.10 - muscle * 0.02 + (muscle * 0.04);
    const torsoScaleY = 1.0;
    const torsoScaleZ = 1.0 + fat * 0.08 + muscle * 0.03;

    cloned.traverse((obj) => {
      if (obj.isMesh) {
        const lower = (obj.name || "").toLowerCase();
        const isHead = lower.includes("head") || lower.includes("face") || lower.includes("hair") || lower.includes("eye") || lower.includes("teeth") || lower.includes("tongue");
        const isBody = !isHead && (lower.includes("body") || lower.includes("torso") || lower.includes("avatar"));

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
      }
    });
  }, [cloned, fat, muscle, glow]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  // For "head" framing (small profile bubble), nudge the model down
  // so the head dominates the visible area.
  const verticalOffset = framing === "head" ? -1.4 : -0.85;

  return (
    <group
      ref={groupRef}
      position={[fitTransform.centerX ?? 0, verticalOffset + fitTransform.offsetY, fitTransform.centerZ ?? 0]}
      scale={fitTransform.scale}
    >
      <primitive object={cloned} />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// OUTER COMPONENT
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
  // Camera framing depends BOTH on size AND on whether we have a GLB.
  // Small + GLB → close-up of head/shoulders (avatar reveal vibe).
  // Large + GLB → full body, slightly wider FOV to fit Avaturn's taller mesh.
  // Parametric mode keeps the original tight framing.
  const isGLB = !!avatarUrl;
  const framing = size === "small" ? "head" : "full";

  let camPos, camFov;
  if (isGLB) {
    if (size === "small") {
      camPos = [0, 0.0, 1.0];   // closer for head/shoulders bubble
      camFov = 28;
    } else {
      camPos = [0, 0.15, 3.4];  // pulled back to fit ~1.7m model
      camFov = 28;
    }
  } else {
    // Parametric humanoid — original tight framing
    camPos = size === "small" ? [0, 0.3, 2.4] : [0, 0.3, 2.6];
    camFov = size === "small" ? 22 : 24;
  }

  const wrapStyle = size === "small"
    ? { width: "100%", aspectRatio: "1 / 1.6", maxWidth: 100 }
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
          {/* Premium 3-point lighting — Apple Fitness+ feel */}
          <ambientLight intensity={0.4} />
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
              <GLBAvatar url={avatarUrl} params={params} glow={glow} autoRotate={autoRotate} framing={framing} />
            ) : (
              <Humanoid params={params} glow={glow} autoRotate={autoRotate} />
            )}
            {size === "large" && (
              <ContactShadows
                position={[0, -0.86, 0]}
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
              minPolarAngle={Math.PI / 2.6}
              maxPolarAngle={Math.PI / 1.9}
              autoRotate={false}
              dampingFactor={0.08}
              target={isGLB && size === "large" ? [0, 0.85, 0] : [0, 0.3, 0]}
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
