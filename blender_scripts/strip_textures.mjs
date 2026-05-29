// Strips ALL textures from the GLB's materials, then prunes the orphaned
// image data. Does NOT touch geometry, morph targets, or accessors — so the
// 13 shape keys survive untouched. The app drives a controlled MeshStandard
// material in-code (Body3DAvatar.jsx), so these embedded textures are dead
// weight (~42MB of HumGen freckle/albedo maps we never use).
//
// RUN from repo root:
//   node blender_scripts/strip_textures.mjs [src.glb] [out.glb]
//   default src = public/alki_humgen_male.glb; default out = <src>_slim.glb
// For the 4-base build, prefer:  node blender_scripts/slim_all_bases.mjs
// Requires: @gltf-transform/core + functions (already in node_modules).
//
// The v5 build script already exports with no materials/textures/vertex
// colors, so on a freshly-built base this is mostly a prune/no-op safety
// pass — but it stays the per-file slimmer and guards the morph count.

import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { readFileSync } from 'fs';

const SRC = process.argv[2] || 'public/alki_humgen_male.glb';
const OUT = process.argv[3] || SRC.replace(/\.glb$/i, '_slim.glb');

const io = new NodeIO();
const doc = await io.read(SRC);
const root = doc.getRoot();

// Count what we start with.
const texCountBefore = root.listTextures().length;
const morphBefore = root.listMeshes()
  .flatMap(m => m.listPrimitives())
  .reduce((n, p) => n + p.listTargets().length, 0);

// Detach every texture slot from every material. We don't recolor here —
// the app overrides the material entirely at runtime — we just sever the
// links so the image data becomes unreferenced.
for (const mat of root.listMaterials()) {
  mat.setBaseColorTexture(null);
  mat.setNormalTexture(null);
  mat.setEmissiveTexture(null);
  mat.setOcclusionTexture(null);
  mat.setMetallicRoughnessTexture(null);
}

// Prune ONLY orphaned textures (and the unused property types that follow).
// Explicitly DO NOT prune accessors/meshes — protect morph data.
await doc.transform(
  prune({
    propertyTypes: ['Texture', 'TextureInfo', 'Material', 'Image'],
    keepLeaves: false,
  })
);

const texCountAfter = root.listTextures().length;
const morphAfter = root.listMeshes()
  .flatMap(m => m.listPrimitives())
  .reduce((n, p) => n + p.listTargets().length, 0);

await io.write(OUT, doc);

const sizeBefore = readFileSync(SRC).length;
const sizeAfter = readFileSync(OUT).length;

console.log('=== Alki texture strip ===');
console.log(`textures: ${texCountBefore} -> ${texCountAfter}`);
console.log(`morph targets: ${morphBefore} -> ${morphAfter}  (MUST be unchanged)`);
console.log(`size: ${(sizeBefore/1e6).toFixed(2)}MB -> ${(sizeAfter/1e6).toFixed(2)}MB`);
console.log(`wrote ${OUT}`);
if (morphAfter !== morphBefore) {
  console.log('!! WARNING: morph target count changed — DO NOT use this output.');
}
