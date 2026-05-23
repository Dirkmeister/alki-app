// Strips ALL textures from the GLB's materials, then prunes the orphaned
// image data. Does NOT touch geometry, morph targets, or accessors — so the
// 13 shape keys survive untouched. The app drives a controlled MeshStandard
// material in-code (Body3DAvatar.jsx), so these embedded textures are dead
// weight (~42MB of HumGen freckle/albedo maps we never use).
//
// RUN from repo root:  node blender_scripts/strip_textures.mjs
// Requires: npx/npm available (uses @gltf-transform/core, auto-installed via npx)
//
// Reads:  public/alki_humgen_male.glb
// Writes: public/alki_humgen_male_slim.glb   (original left intact)

import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { readFileSync, writeFileSync } from 'fs';

const SRC = 'public/alki_humgen_male.glb';
const OUT = 'public/alki_humgen_male_slim.glb';

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
