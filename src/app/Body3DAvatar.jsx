"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useMemo, useEffect } from "react";
import * as THREE from "three";

/**
 * Body3DAvatar — photoreal GLB renderer only.
 *
 * This component renders an Avaturn-exported GLB. The 2D SVG
 * parametric `BodyAvatar` in AlkiApp.jsx is the free-tier visual;
 * this 3D renderer is the premium "MAKE IT ME" path.
 *
 * Auto-fits the model to a 1.7m canonical height with feet at y=0
 * and recenters X/Z so the model is always framed correctly.
 */

function GLBAvatar({ url, params, glow, autoRotate, rotateAround = [0, 0, 0] }) {
  const { fat, muscle } = params;
  const groupRef = useRef();
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Auto-fit: measure box, recenter X/Z, lift floor to y=0, scale to 1.7m.
  const fit = useMemo(() => {
    if (!cloned) return { scale: 1, offsetX: 0, offsetY: 0, offsetZ: 0 };
    cloned.position.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);

    const modelHeight = Math.max(size.y, 0.001);
    const scale = 1.7 / modelHeight;
    const offsetY = -box.min.y * scale;
    const offsetX = -((box.min.x + box.max.x) / 2) * scale;
    const offsetZ = -((box.min.z + box.max.z) / 2) * scale;

    // Debug logging — prints the raw bbox so we can see exactly where the
    // model sits. Inspect the browser console after loading the avatar.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[Alki GLB fit]", {
        rawMin: box.min.toArray().map(n => n.toFixed(3)),
        rawMax: box.max.toArray().map(n => n.toFixed(3)),
        rawSize: size.toArray().map(n => n.toFixed(3)),
        scaleFactor: scale.toFixed(3),
        appliedOffset: [offsetX.toFixed(3), offsetY.toFixed(3), offsetZ.toFixed(3)],
        afterFitFeetY: 0,
        afterFitHeadY: 1.7
      });
    }
    return { scale, offsetX, offsetY, offsetZ };
  }, [cloned]);

  // Apply body-comp morphing without distorting the head.
  useEffect(() => {
    if (!cloned) return;
    const sx = 1.0 + fat * 0.10 + muscle * 0.02;
    const sz = 1.0 + fat * 0.08 + muscle * 0.03;

    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      const lower = (obj.name || "").toLowerCase();
      const isHead = ["head","face","hair","eye","teeth","tongue","beard","brow"]
        .some(k => lower.includes(k));
      const isBody = !isHead && ["body","torso","avatar"]
        .some(k => lower.includes(k));

      if (isHead) obj.scale.set(1, 1, 1);
      else if (isBody) obj.scale.set(sx, 1, sz);

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
    });
  }, [cloned, fat, muscle, glow]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      // Rotate around the rotateAround pivot rather than the group origin
      // (feet). For the small head-portrait view this keeps the head fixed
      // in frame as the body rotates underneath.
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

export default function Body3DAvatar({
  avatarUrl,
  params,
  label,
  glow = false,
  size = "large",       // "small" | "large"
  interactive = true,
  autoRotate = true,
}) {
  // Two framing setups. Camera positions and FOVs chosen empirically
  // so the 1.7m model (feet at y=0, head at y≈1.72) fits each canvas.
  const isSmall = size === "small";
  // SMALL: head portrait. Camera far back with tight FOV so the model
  // fills frame with head at center and shoulders just inside.
  // LARGE: full body. Camera at mid-body, well back to capture feet-to-head.
  const camPos = isSmall ? [0, 1.55, 3.0] : [0, 0.95, 3.6];
  const camFov = isSmall ? 15 : 30;
  const targetY = isSmall ? 1.55 : 0.95;

  const wrapStyle = isSmall
    ? { width: "100%", aspectRatio: "1 / 1.2", maxWidth: 110 }
    : { width: "100%", aspectRatio: "1 / 1.6", maxWidth: 200 };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={wrapStyle}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: camPos, fov: camFov }}
          gl={{ antialias: true, alpha: true }}
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
            <GLBAvatar url={avatarUrl} params={params} glow={glow} autoRotate={autoRotate} />
            {!isSmall && (
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
              minPolarAngle={Math.PI / 2.4}
              maxPolarAngle={Math.PI / 1.95}
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
