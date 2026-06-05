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

// ── Size model (Stage 4 — AVATAR_RANGE_ARCHITECTURE §1.4 / §4.6) ──────
// The old fit did `scale = 1.7 / modelHeight`, normalizing EVERY body to a
// fixed 1.7-unit height. That cancelled the mass signal: a heavier morph (and
// the heavy base mesh) was scaled back into the lean vertical envelope, so all
// the Stage-0 mass math + Stage-3 `body_mass` geometry could only read as
// "wider," never as "a bigger person." We decouple apparent size from the
// height-normalization:
//   • the base mesh's authored height only sets a consistent UNIT (so meshes
//     authored at slightly different scales line up) — it is no longer the
//     final size,
//   • the avatar's frame is anchored to the user's REAL (engine) height, so a
//     taller user renders taller, and
//   • a heavier body (body_mass + muscle) genuinely occupies MORE frame
//     end-to-end, not just wider.
// REF_HEIGHT_CM is the frame the base mesh's 1.7-unit norm represents; the two
// gains are the tunable "how much bigger does mass read" knobs (sign-off).
const REF_HEIGHT_CM = 178;
const BODY_MASS_SIZE_GAIN = 0.20; // body_mass 0→1 grows the whole silhouette ~+20%
const MUSCLE_SIZE_GAIN = 0.07;    // a fully-built frame reads a touch larger too
const HEIGHT_FACTOR_MIN = 0.88;   // ~157 cm floor on the height anchor
const HEIGHT_FACTOR_MAX = 1.12;   // ~199 cm ceiling on the height anchor

function GLBAvatar({ url, params, glow, autoRotate, centerVertically = true, anchorY = 1.0 }) {
  const { fat = 0, muscle = 0, morphState = null, heightCm = null } = params || {};
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

  // ── Mass signal that drives apparent size ─────────────────────────
  // In shape-key mode this is the engine's independent `body_mass` channel
  // (+ muscle_overall); in legacy mode it's the 2-dim fat/muscle props. Either
  // way, a heavier body grows the silhouette (see Size model notes above).
  const sizeBodyMass = morphState ? (morphState.body_mass ?? 0) : fat;
  const sizeMuscle = morphState ? (morphState.muscle_overall ?? 0) : muscle;

  // ── Auto-fit: height-anchored scale + mass amplification + recenter ──
  const fit = useMemo(() => {
    if (!cloned) return { scale: 1, offsetX: 0, offsetY: 0, offsetZ: 0 };
    cloned.position.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // NOTE: THREE.computeBoundingBox expands the box by EVERY morph target at
    // full influence, so `box`/`center`/`modelHeight` are the union of all morph
    // extents — stable across the current morph state. That's why the old
    // `1.7 / modelHeight` could never grow with a morph (the box never changes),
    // and why centering on this box is jitter-free as body_mass animates.
    const modelHeight = Math.max(size.y, 0.001);

    // (1) Base unit — normalize the authored height to a known unit. This sets
    //     the unit only; it is NOT the final on-screen size.
    const baseUnit = 1.7 / modelHeight;
    // (2) Height anchor — real engine frame, clamped to a human band so a bad
    //     profile can't produce a giant/tiny avatar.
    const hCm = (typeof heightCm === "number" && heightCm > 0) ? heightCm : REF_HEIGHT_CM;
    const heightFactor = Math.max(HEIGHT_FACTOR_MIN, Math.min(HEIGHT_FACTOR_MAX, hCm / REF_HEIGHT_CM));
    // (3) Mass amplifier — a heavier body occupies more frame end-to-end.
    const bm = Math.max(0, Math.min(1, sizeBodyMass));
    const mus = Math.max(0, Math.min(1, sizeMuscle));
    const massFactor = 1 + BODY_MASS_SIZE_GAIN * bm + MUSCLE_SIZE_GAIN * mus;

    const scale = baseUnit * heightFactor * massFactor;

    // Recenter on the (scaled) bounds — fixes "avatar not centered".
    const offsetX = -center.x * scale;
    const offsetZ = -center.z * scale;
    // Vertical: large/full-body view centers the bbox midpoint on the camera
    // anchor, so lean & heavy both sit centered and growth expands symmetrically
    // (no clipping to one end). Small/cropped view keeps feet on the floor to
    // preserve its existing high crop.
    const offsetY = centerVertically
      ? anchorY - center.y * scale
      : -box.min.y * scale;

    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[Alki GLB fit]", {
        rawSize: size.toArray().map(n => n.toFixed(3)),
        baseUnit: baseUnit.toFixed(3),
        heightCm: hCm,
        heightFactor: heightFactor.toFixed(3),
        bodyMass: bm.toFixed(3),
        muscle: mus.toFixed(3),
        massFactor: massFactor.toFixed(3),
        scaleFactor: scale.toFixed(3),
        scaledHeight: (modelHeight * scale).toFixed(3),
        appliedOffset: [offsetX.toFixed(3), offsetY.toFixed(3), offsetZ.toFixed(3)],
        morphMode: useShapeKeys ? "shape_keys" : "legacy_scale"
      });
    }
    return { scale, offsetX, offsetY, offsetZ };
  }, [cloned, useShapeKeys, heightCm, sizeBodyMass, sizeMuscle, centerVertically, anchorY]);

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
      // Skin vs clothing/eyes is classified by the UNION of mesh name +
      // material name. The body and its joined garment export as a single mesh
      // (sharing one mesh name), so the garment can only be told apart by its
      // material (Alki_Cloth_Boxers); skin keeps Alki_Skin and stays skin; eyes
      // carry "eye". Without the material-name check the garment would be
      // recolored to skin tone and lose its fabric look.
      const matName = (obj.material?.name || "").toLowerCase();
      const tag = lower + " " + matName;
      const isSkin = !["hair", "eye", "teeth", "tongue", "cloth", "shirt", "pant",
        "short", "boxer", "brief", "bra", "underwear", "garment", "sock", "shoe"]
        .some(k => tag.includes(k));

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
  // Large/full-body view: center the body on `anchorY` and frame it wide enough
  // that the LARGEST avatar in the honest size range (Stage 4 — heavy + tall)
  // fits without head/feet clipping. The trade is intentional: a lean body now
  // reads genuinely SMALLER in frame than a heavy one, instead of every body
  // being normalized to fill the same envelope. Small view keeps its tight high
  // crop (feet-floored), which the range gate doesn't touch.
  const anchorY = isSmall ? 0 : 1.0;
  const centerVertically = !isSmall;
  const camPos = isSmall ? [0, 1.55, 3.0] : [0, 1.0, 4.3];
  const camFov = isSmall ? 15 : 32;
  const targetY = isSmall ? 1.55 : 1.0;

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

  // `margin: 0 auto` is load-bearing: this is a block element with a maxWidth
  // smaller than its container (e.g. the 280px hero slot in AlkiApp). The parent
  // uses `textAlign: center`, which only centers INLINE content — a block child
  // ignores it and pins left, shifting the whole canvas (and the x=0-centered
  // body inside it) off to the left. Auto side-margins center the block itself.
  const wrapStyle = isSmall
    ? { width: "100%", aspectRatio: "1 / 1.2", maxWidth: 110, margin: "0 auto" }
    : { width: "100%", aspectRatio: "1 / 1.6", maxWidth: 200, margin: "0 auto" };

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
            <GLBAvatar
              url={avatarUrl}
              params={effectiveParams}
              glow={glow}
              autoRotate={autoRotate}
              centerVertically={centerVertically}
              anchorY={anchorY}
            />
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
