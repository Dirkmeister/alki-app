"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * AvatarHeadshot — one-shot renderer that produces a static PNG
 * headshot from an Avaturn GLB URL.
 *
 * Spawns an offscreen WebGL canvas, loads the GLB, frames the head,
 * renders a single frame, captures it as a data URL via canvas.toDataURL,
 * then disposes everything. Runs ONCE, calls onComplete(dataUrl),
 * then unmounts itself.
 *
 * This is how we avoid running a live Three.js canvas on the profile
 * card. Render once → cache as <img src=...> → never touch WebGL again
 * for that view.
 */
export default function AvatarHeadshot({ glbUrl, onComplete, onError }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !glbUrl) return;
    startedRef.current = true;

    let renderer = null;
    let cancelled = false;

    (async () => {
      try {
        // Render at 2x for retina-quality headshots; final image is 200x200
        const SIZE = 400;

        // Offscreen canvas — never added to the DOM
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;

        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true, // required for toDataURL
        });
        renderer.setPixelRatio(1);
        renderer.setSize(SIZE, SIZE, false);
        renderer.setClearColor(0x000000, 0); // transparent background

        const scene = new THREE.Scene();

        // Premium 3-point lighting matched to Body3DAvatar.jsx
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 1.2);
        key.position.set(2, 3, 4);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xa8c8ff, 0.55);
        fill.position.set(-2, 2, 2);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 0.5);
        rim.position.set(0, 3, -2);
        scene.add(rim);

        // Load the GLB
        const loader = new GLTFLoader();
        const gltf = await new Promise((resolve, reject) => {
          loader.load(glbUrl, resolve, undefined, reject);
        });
        if (cancelled) return;

        const model = gltf.scene;

        // Auto-fit: scale model to canonical 1.7m, feet at y=0, centered X/Z
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = 1.7 / Math.max(size.y, 0.001);
        model.scale.setScalar(scale);

        const box2 = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box2.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box2.min.y;

        scene.add(model);

        // Camera framed on the head only — a portrait-style headshot.
        // Head sits around y=1.55 (between shoulders y=1.4 and crown y=1.72).
        // Telephoto-ish FOV for flattering proportions.
        const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 100);
        camera.position.set(0, 1.55, 3.4);
        camera.lookAt(0, 1.55, 0);

        // Three frames of rendering — first two warm up the loader/material
        // setup; the third is what we actually capture. This avoids the
        // "first frame is blank" issue some browsers have with WebGL contexts.
        renderer.render(scene, camera);
        renderer.render(scene, camera);
        renderer.render(scene, camera);

        if (cancelled) return;

        const dataUrl = canvas.toDataURL("image/png");

        // Cleanup
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
        renderer = null;

        if (!cancelled && onComplete) onComplete(dataUrl);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[AvatarHeadshot] render failed:", err);
        if (renderer) {
          try { renderer.dispose(); } catch (_) {}
        }
        if (!cancelled && onError) onError(err);
      }
    })();

    return () => {
      cancelled = true;
      if (renderer) {
        try { renderer.dispose(); } catch (_) {}
      }
    };
  }, [glbUrl, onComplete, onError]);

  // Renders nothing visible — we only need the effect
  return null;
}
