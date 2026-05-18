"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useMemo, useEffect } from "react";
import * as THREE from "three";
import { MORPH_KEYS } from "./lib/morphTargets";

/**
 * Body3DAvatar — GLB renderer with shape-key morphing.
 *
 * TWO MODES OF OPERATION:
 *
 * 1) Shape-key mode (the new path):
 *    If the loaded GLB has Blender shape keys whose names match
 *    Alki's canonical MORPH_KEYS, those are driven directly via
 *    morphTargetInfluences. This is the parametric body model —
 *    every dimension (fat, muscle by region, vascularity, water,
 *    skin) is independently controllable.
 *
 *    Trigger this mode by passing `params.morphState` — a full
 *    weight map produced by resolveMorphStates() in
 *    lib/morphTargets.js.
 *
 * 2) Legacy mode (the old path):
 *    If no morphState is provided OR the GLB has no shape keys,
 *    the renderer falls back to crude X/Z body scaling from
 *    params.fat and params.muscle. This is what Avaturn-generated
 *    GLBs use, and it's what every existing call site already
 *    passes.
 *
 * The detection is automatic. Existing call sites in AlkiApp.jsx
 * keep working unchanged. New code that wants the parametric
 * upgrade just passes morphState.
 *
 * Material params (skin_tone_shift, skin_quality) are always
 * applied as material adjustments, regardless of mode.
 */

function GLBAvatar({ url, params, glow, autoRotate, rotateAround = [0, 0, 0] }) {
  const { fat = 0, muscle = 0, morphState = null } = params || {};
  const groupRef = useRef();
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // ── Discover shape keys present in the loaded GLB ────────────────
  // We scan every skinned/static mesh, collect each one's morph
  // dictionary, and remember which Alki canonical keys are available.
  const morphInventory = useMemo(() => {
    const inventory = []; // [{ mesh, keyMap: { canonical_key: morph_index } }]
    let totalKeysFound = 0;
    cloned.traverse(obj => {
      if (!obj.isMesh) return;
      const dict = obj.morphTargetDictionary;
      if (!dict) return;
      const keyMap = {};
      for (const canonical of MORPH_KEYS) {
        if (dict[canonical] !== undefined) {
          keyMap[canonical] = dict[canonical];
        }
      }
      if (Object.keys(keyMap).length > 0) {
        inventory.push({ mesh: obj, keyMap });
        totalKeysFound += Object.keys(keyMap).length;
      }
    });
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[Alki morph inventory]", {
        meshesWithMorphs: inventory.length,
        totalKeysFound,
        availableKeys: [...new Set(inventory.flatMap(i => Object.keys(i.keyMap)))]
      });
    }
    return inventory;
  }, [cloned]);

  const hasMorphTargets = morphInventory.length > 0;
  const useShapeKeys = hasMorphTargets && !!morphState;

  // ── Auto-fit (unchanged) ─────────────────────────────────────────
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

    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[Alki GLB fit]", {
        rawMin: box.min.toArray().map(n => n.toFixed(3)),
        rawMax: box.max.toArray().map(n => n.toFixed(3)),
        rawSize: size.toArray().map(n => n.toFixed(3)),
        scaleFactor: scale.toFixed(3),
        appliedOffset: [offsetX.toFixed(3), offsetY.toFixed(3), offsetZ.toFixed(3)],
        afterFitFeetY: 0,
        afterFitHeadY: 1.7,
        morphMode: useShapeKeys ? "shape_keys" : "legacy_scale"
      });
    }
    return { scale, offsetX, offsetY, offsetZ };
  }, [cloned, useShapeKeys]);

  // ── Apply morph state to shape keys (SHAPE-KEY MODE) ─────────────
  useEffect(() => {
    if (!cloned || !useShapeKeys || !morphState) return;
    for (const { mesh, keyMap } of morphInventory) {
      if (!mesh.morphTargetInfluences) continue;
      for (const [canonical, morphIndex] of Object.entries(keyMap)) {
        const weight = morphState[canonical];
        if (typeof weight === "number" && !isNaN(weight)) {
          mesh.morphTargetInfluences[morphIndex] = weight;
        }
      }
    }
  }, [cloned, morphInventory, useShapeKeys, morphState]);

  // ── Apply legacy fat/muscle scaling (LEGACY MODE) ────────────────
  useEffect(() => {
    if (!cloned || useShapeKeys) return;
    const sx = 1.0 + fat * 0.10 + muscle * 0.02;
    const sz = 1.0 + fat * 0.08 + muscle * 0.03;

    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      const lower = (obj.name || "").toLowerCase();
      const isHead = ["head", "face", "hair", "eye", "teeth", "tongue", "beard", "brow"]
        .some(k => lower.includes(k));
      const isBody = !isHead && ["body", "torso", "avatar"]
        .some(k => lower.includes(k));

      if (isHead) obj.scale.set(1, 1, 1);
      else if (isBody) obj.scale.set(sx, 1, sz);
    });
  }, [cloned, fat, muscle, useShapeKeys]);

  // ── Apply material adjustments (both modes) ──────────────────────
  useEffect(() => {
    if (!cloned) return;
    const skinToneShift = morphState?.skin_tone_shift ?? 0;
    const skinQuality = morphState?.skin_quality ?? 0;

    cloned.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const lower = (obj.name || "").toLowerCase();
      const isSkin = !["hair", "eye", "teeth", "tongue", "cloth", "shirt", "pant", "short"]
        .some(k => lower.includes(k));

      // One-time tune: roughness, metalness, optional emissive for glow
      if (!obj.userData._alkiTunedBase) {
        if (obj.material.roughness !== undefined) {
          obj.material.roughness = Math.min(1, (obj.material.roughness ?? 0.7) + 0.05);
          obj.material.metalness = 0;
        }
        obj.userData._alkiTunedBase = true;
      }

      // Glow overlay (projected state)
      if (glow && obj.material.emissive) {
        obj.material.emissive = new THREE.Color("#0e4a2a");
        obj.material.emissiveIntensity = 0.18;
      } else if (obj.material.emissive) {
        obj.material.emissiveIntensity = 0;
      }

      // Skin material modulation (skin meshes only)
      if (isSkin && obj.material.color) {
        // Cache the original color the first time we touch it
        if (!obj.userData._alkiOrigColor) {
          obj.userData._alkiOrigColor = obj.material.color.clone();
        }
        const orig = obj.userData._alkiOrigColor;

        // Melanotan II: shift skin tone darker/warmer
        if (skinToneShift > 0) {
          const tanColor = new THREE.Color("#a8693d");
          obj.material.color.copy(orig).lerp(tanColor, skinToneShift * 0.4);
        } else {
          obj.material.color.copy(orig);
        }

        // GHK-Cu: smoother skin = lower roughness, slight luminosity
        if (skinQuality > 0 && obj.material.roughness !== undefined) {
          if (obj.userData._alkiOrigRoughness === undefined) {
            obj.userData._alkiOrigRoughness = obj.material.roughness;
          }
          const orig_r = obj.userData._alkiOrigRoughness;
          obj.material.roughness = Math.max(0.25, orig_r - skinQuality * 0.25);
        }
      }

      obj.material.needsUpdate = true;
      obj.castShadow = true;
    });
  }, [cloned, glow, morphState]);

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

export default function Body3DAvatar({
  avatarUrl,
  params,
  label,
  glow = false,
  size = "large",       // "small" | "large"
  interactive = true,
  autoRotate = true,
}) {
  const isSmall = size === "small";
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
