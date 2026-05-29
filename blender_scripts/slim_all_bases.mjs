// ═══════════════════════════════════════════════════════════
// ALKI — slim all four base meshes (Avatar Range, Stage 3)
// ═══════════════════════════════════════════════════════════
// Runs a geometry-preserving slim pass over every base GLB that exists in
// /public: detaches any leftover textures, prunes orphaned material/image/
// texture data, and dedups accessors — WITHOUT touching morph targets. The
// v5 build already exports clean (no materials/textures/vertex colors), so
// this is mostly a safety + dedup pass; the critical job is the MORPH-COUNT
// GUARD — if the prune ever changes a file's morph-target count, that file
// is left UNWRITTEN and flagged, so a bad slim can never ship.
//
// RUN from repo root:  node blender_scripts/slim_all_bases.mjs
// Writes each file IN PLACE (only if its morph count is unchanged).
//
// Requires: @gltf-transform/core + functions (already in node_modules).

import { NodeIO } from '@gltf-transform/core';
import { prune, dedup } from '@gltf-transform/functions';
import { existsSync, statSync } from 'fs';

const BASES = [
  'public/alki_humgen_male_lean.glb',
  'public/alki_humgen_male_heavy.glb',
  'public/alki_humgen_female_lean.glb',
  'public/alki_humgen_female_heavy.glb',
  // The currently-shipped default (kept until male_lean re-exports cleanly):
  'public/alki_humgen_male.glb',
];

const io = new NodeIO();
const mb = (n) => (n / 1e6).toFixed(2) + 'MB';
const morphCount = (root) =>
  root.listMeshes().flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + p.listTargets().length, 0);

let processed = 0, skipped = 0, failed = 0;

for (const path of BASES) {
  if (!existsSync(path)) { console.log(`skip  ${path}  (not built yet)`); skipped++; continue; }

  const sizeBefore = statSync(path).size;
  const doc = await io.read(path);
  const root = doc.getRoot();
  const morphBefore = morphCount(root);

  for (const mat of root.listMaterials()) {
    mat.setBaseColorTexture(null);
    mat.setNormalTexture(null);
    mat.setEmissiveTexture(null);
    mat.setOcclusionTexture(null);
    mat.setMetallicRoughnessTexture(null);
  }

  // Protect morph data: prune only non-geometry property types, then dedup
  // accessors/meshes (dedup never drops referenced morph targets).
  await doc.transform(
    prune({ propertyTypes: ['Texture', 'TextureInfo', 'Material', 'Image'], keepLeaves: false }),
    dedup(),
  );

  const morphAfter = morphCount(root);
  if (morphAfter !== morphBefore) {
    console.log(`FAIL  ${path}  morph targets ${morphBefore} -> ${morphAfter} — NOT WRITTEN`);
    failed++;
    continue;
  }

  await io.write(path, doc);
  const sizeAfter = statSync(path).size;
  console.log(`ok    ${path}  ${mb(sizeBefore)} -> ${mb(sizeAfter)}  (morphs ${morphAfter}, unchanged)`);
  processed++;
}

console.log(`\n${processed} slimmed, ${skipped} not-built, ${failed} failed-guard.`);
if (failed) process.exit(1);
