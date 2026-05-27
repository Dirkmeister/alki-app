"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useRef, Suspense, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { MORPH_KEYS, MORPH_TARGETS } from "../lib/morphTargets";

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
  const invalidate = useThree((s) => s.invalidate);
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
    // #21 — widened fat/muscle influence so projected vs current reads on a
    // phone (legacy scale mode is what the current Avaturn GLB uses — no shape
    // keys). Kept moderate to avoid visibly distorting the human mesh.
    const sx = 1.0 + fat * 0.18 + muscle * 0.05;
    const sz = 1.0 + fat * 0.15 + muscle * 0.06;

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
  // IMPORTANT: HumGen's GLB export slots its textures wrong — the
  // freckles overlay lands in baseColorTexture and the real skin
  // albedo isn't exported at all, which renders the body near-black
  // with red blotches. Rather than depend on those broken maps, we
  // strip every texture/vertex-color channel off the skin material
  // and drive a clean, fully-controlled MeshStandard look. This also
  // means the 29MB of skin textures in the GLB are unused and can be
  // stripped from the file entirely (huge win for mobile load).
  const ALKI_SKIN_BASE = "#c89c79"; // warm neutral mid-tone, reads well on dark UI
  const ALKI_SKIN_TAN  = "#9a6440"; // Melanotan II target

  useEffect(() => {
    if (!cloned) return;
    const skinToneShift = morphState?.skin_tone_shift ?? 0;
    const skinQuality   = morphState?.skin_quality ?? 0;

    cloned.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const lower = (obj.name || "").toLowerCase();
      const isSkin = !["hair", "eye", "teeth", "tongue", "cloth", "shirt", "pant", "short"]
        .some(k => lower.includes(k));

      // One-time: neutralize HumGen's broken material channels on skin.
      // Null out every map slot (PBR + Physical extensions) and disable
      // vertex colors so nothing darkens or red-tints the body.
      if (isSkin && !obj.userData._alkiSkinCleaned) {
        const mapSlots = [
          "map", "normalMap", "roughnessMap", "metalnessMap", "aoMap",
          "specularMap", "specularIntensityMap", "specularColorMap",
          "clearcoatMap", "clearcoatRoughnessMap", "clearcoatNormalMap",
          "sheenColorMap", "sheenRoughnessMap", "emissiveMap", "bumpMap"
        ];
        for (const slot of mapSlots) {
          if (obj.material[slot] !== undefined) obj.material[slot] = null;
        }
        if ("vertexColors" in obj.material) obj.material.vertexColors = false;
        if ("clearcoat" in obj.material) obj.material.clearcoat = 0;
        if ("sheen" in obj.material) obj.material.sheen = 0;
        if (obj.material.metalness !== undefined) obj.material.metalness = 0;
        obj.userData._alkiSkinCleaned = true;
      }

      // Glow overlay (projected state)
      if (glow && obj.material.emissive) {
        obj.material.emissive = new THREE.Color("#0e4a2a");
        obj.material.emissiveIntensity = 0.22;
      } else if (obj.material.emissive) {
        obj.material.emissiveIntensity = 0;
      }

      // Clean, controlled skin look (skin meshes only)
      if (isSkin && obj.material.color) {
        // Base tone, warmed/darkened by Melanotan II
        const base = new THREE.Color(ALKI_SKIN_BASE);
        if (skinToneShift > 0) {
          const tan = new THREE.Color(ALKI_SKIN_TAN);
          base.lerp(tan, Math.min(1, skinToneShift) * 0.55);
        }
        obj.material.color.copy(base);

        // Baseline slightly glossy skin; GHK-Cu smooths it further
        if (obj.material.roughness !== undefined) {
          obj.material.roughness = Math.max(0.32, 0.7 - skinQuality * 0.3);
        }
      }

      obj.material.needsUpdate = true;
      obj.castShadow = true;
    });
  }, [cloned, glow, morphState]);

  // #47 — frameloop is "demand": the scale/morph/material effects above mutate
  // the scene imperatively, so request a repaint whenever a visual input changes
  // (otherwise the model can render blank until the next interaction).
  useEffect(() => { invalidate(); }, [cloned, fat, muscle, glow, morphState, useShapeKeys, invalidate]);

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
  autoRotate = false, // #50 — static by default; drag to rotate (auto-spin stuttered under demand frameloop)
  debugPanel = false,   // TEMP: show live morph-weight sliders for calibration
}) {
  const isSmall = size === "small";
  const camPos = isSmall ? [0, 1.55, 3.0] : [0, 0.95, 3.6];
  const camFov = isSmall ? 15 : 30;
  const targetY = isSmall ? 1.55 : 0.95;

  // ── Live calibration override (debug panel only) ────────────────
  // When the panel is on, we seed a local copy of the incoming
  // morphState and let the user scrub each weight live. null = use
  // the app-computed baseline untouched.
  const [override, setOverride] = useState(null);
  useEffect(() => {
    if (debugPanel && override === null && params?.morphState) {
      setOverride({ ...params.morphState });
    }
  }, [debugPanel, params, override]);

  const effectiveParams =
    debugPanel && override ? { ...params, morphState: override } : params;

  const wrapStyle = isSmall
    ? { width: "100%", aspectRatio: "1 / 1.2", maxWidth: 110 }
    : { width: "100%", aspectRatio: "1 / 1.6", maxWidth: 200 };

  const setKey = (k, v) =>
    setOverride(prev => ({ ...(prev || {}), [k]: v }));

  return (
    <div style={{ textAlign: "center" }}>
      <div style={wrapStyle}>
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: camPos, fov: camFov }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.42} />
          <directionalLight
            position={[2.5, 4, 3]}
            intensity={1.15}
            color="#ffffff"
          />
          <directionalLight position={[-2.5, 2, 2]} intensity={0.5} color="#a8c8ff" />
          <directionalLight position={[0, 3.5, -2]} intensity={0.55} color="#ffffff" />
          {glow && (
            <directionalLight position={[0, 2, -3]} intensity={1.3} color="#22d68a" />
          )}

          <Suspense fallback={null}>
            <GLBAvatar url={avatarUrl} params={effectiveParams} glow={glow} autoRotate={autoRotate} />
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

      {debugPanel && override && (
        <MorphDebugPanel
          override={override}
          setKey={setKey}
          onReset={() => setOverride({ ...params.morphState })}
          onZero={() =>
            setOverride(Object.fromEntries(MORPH_KEYS.map(k => [k, 0])))
          }
        />
      )}
    </div>
  );
}

// ── TEMP calibration panel ─────────────────────────────────────────
// Live sliders for every morph weight. Fixed to the right edge so it
// doesn't disturb the Modeler layout. Read the JSON at the bottom and
// paste it back to bake the values into baselineMorphState().
function MorphDebugPanel({ override, setKey, onReset, onZero }) {
  const geom = MORPH_TARGETS.filter(m => m.category !== "material");
  const mat = MORPH_TARGETS.filter(m => m.category === "material");
  const fmt = v => (typeof v === "number" ? v.toFixed(2) : "0.00");
  const json = JSON.stringify(
    Object.fromEntries(MORPH_KEYS.map(k => [k, +(override[k] || 0).toFixed(3)]))
  );

  const row = (m) => (
    <div key={m.key} style={{ marginBottom: 8, textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.85)", fontFamily: "monospace" }}>
        <span>{m.key}</span>
        <span style={{ color: "#22d68a" }}>{fmt(override[m.key])}</span>
      </div>
      <input
        type="range"
        min={m.range?.[0] ?? 0}
        max={m.range?.[1] ?? 1}
        step={0.01}
        value={override[m.key] || 0}
        onChange={e => setKey(m.key, parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#22d68a", height: 14 }}
      />
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 64,
        right: 12,
        width: 230,
        maxHeight: "82vh",
        overflowY: "auto",
        background: "rgba(12,12,12,0.94)",
        border: "1px solid #22d68a",
        borderRadius: 10,
        padding: 12,
        zIndex: 9999,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "#22d68a", letterSpacing: "0.06em", marginBottom: 8 }}>
        MORPH CALIBRATION
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 10, lineHeight: 1.4 }}>
        Drag to find proportions that look right, then paste the JSON below back to Claude.
      </div>
      {geom.map(row)}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", margin: "8px 0" }} />
      {mat.map(row)}
      <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
        <button
          onClick={onReset}
          style={{ flex: 1, fontSize: 10, padding: "6px 4px", background: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer" }}
        >
          Reset baseline
        </button>
        <button
          onClick={onZero}
          style={{ flex: 1, fontSize: 10, padding: "6px 4px", background: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer" }}
        >
          Zero all
        </button>
      </div>
      <textarea
        readOnly
        value={json}
        onFocus={e => e.target.select()}
        style={{ width: "100%", height: 70, fontSize: 9, fontFamily: "monospace", background: "#000", color: "#22d68a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: 6, resize: "vertical" }}
      />
    </div>
  );
}
