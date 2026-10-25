import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Vector3 } from 'three';
import { refineGarment, boundaryLoops } from '../garment-geometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const input = 'assets/models/source/crude_male_shirt.obj';
const obj = await readFile(input);
const root = new OBJLoader().parse(obj.toString());
const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
if (meshes.length !== 1) throw new Error('Expected exactly one garment mesh');
let geometry = meshes[0].geometry;
geometry.computeBoundingBox();
const center = geometry.boundingBox.getCenter(new Vector3());
const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
const scale = 1.55 / height;
let position = geometry.attributes.position, uv = geometry.attributes.uv;
if (!uv || uv.count !== position.count) throw new Error('Missing complete UV coordinates');
const sideProfile = [[-.775, .58], [-.7, .558], [-.6, .529], [-.5, .518], [-.4, .511], [-.3, .510], [-.2, .520], [-.1, .534], [0, .552], [.1, .586], [.12, .60], [.3, .64]];
function boxyFactor(y) {
  if (y >= .3) return 1;
  const index = sideProfile.findIndex(([level]) => level >= y);
  if (index <= 0) return .64 / sideProfile[0][1];
  const [a, b] = [sideProfile[index - 1], sideProfile[index]];
  const halfWidth = a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
  return .64 / halfWidth;
}
for (let i = 0; i < position.count; i++) {
  // Straighten the sampled waist profile and lower the outer sleeve for a boxy silhouette.
  const y = (position.getY(i) - center.y) * scale;
  const x = (position.getX(i) - center.x) * scale * 1.22 * boxyFactor(y);
  const sleeveDrop = .10 * Math.max(0, Math.min(1, (Math.abs(x) - .64) / .26));
  const z = (position.getZ(i) - center.z) * scale * .58;
  const neck = Math.exp(-Math.pow((y - .64) / .22, 4)) * Math.exp(-Math.pow(Math.abs(x) / .49, 6));
  const frontNeckLift = z > .05 ? .045 * Math.exp(-Math.pow(x / .34, 4)) * Math.exp(-Math.pow((y - .5) / .12, 2)) : 0;
  position.setXYZ(i, x * (1 - .18 * neck), y - sleeveDrop + frontNeckLift, z);
}
geometry = refineGarment(geometry);
position = geometry.attributes.position; uv = geometry.attributes.uv;
// Relaxed proportions: narrower shoulders/body, a little more length and a soft waist.
for (let i = 0; i < position.count; i++) {
  const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
  const waist = 1 - .035 * Math.exp(-Math.pow((y + .2) / .4, 2));
  position.setXYZ(i, x * .88 * waist, y * 1.06, z);
}
geometry.computeVertexNormals();
// OBJ is expanded at UV seams; average normals by position so seams do not look faceted.
const sums = new Map(), normal = geometry.attributes.normal;
const key = i => [position.getX(i), position.getY(i), position.getZ(i)].map(v => v.toFixed(6)).join(',');
for (let i = 0; i < position.count; i++) {
  const k = key(i), sum = sums.get(k) || new Vector3();
  sum.add(new Vector3(normal.getX(i), normal.getY(i), normal.getZ(i))); sums.set(k, sum);
}
for (let i = 0; i < position.count; i++) { const n = sums.get(key(i)).clone().normalize(); normal.setXYZ(i, n.x, n.y, n.z); }
geometry.computeBoundingBox();
const min = geometry.boundingBox.min.toArray(), max = geometry.boundingBox.max.toArray();
const indexed = mergeVertices(geometry, 1e-6);
let byteOffset = 0;
const buffers = [], views = [], accessors = [];
for (const [name, attribute, type] of [['POSITION', indexed.attributes.position, 'VEC3'], ['NORMAL', indexed.attributes.normal, 'VEC3'], ['TEXCOORD_0', indexed.attributes.uv, 'VEC2']]) {
  const buffer = Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
  buffers.push(buffer); views.push({ buffer: 0, byteOffset, byteLength: buffer.length, target: 34962 });
  accessors.push({ bufferView: views.length - 1, componentType: 5126, count: attribute.count, type, ...(name === 'POSITION' ? { min, max } : {}) });
  byteOffset += buffer.length;
}
const indexBuffer = Buffer.from(indexed.index.array.buffer, indexed.index.array.byteOffset, indexed.index.array.byteLength);
views.push({ buffer: 0, byteOffset, byteLength: indexBuffer.length, target: 34963 });
accessors.push({ bufferView: 3, componentType: indexed.index.array instanceof Uint16Array ? 5123 : 5125, count: indexed.index.count, type: 'SCALAR' });
const paddedIndices = Buffer.concat([indexBuffer, Buffer.alloc((4 - indexBuffer.length % 4) % 4)]);
buffers.push(paddedIndices); byteOffset += paddedIndices.length;
const gltf = {
  asset: { version: '2.0', generator: 'PosterCult scripts/build-shirt.mjs', copyright: 'Makehuman edited by Elvaerwyn (CC0); PosterCult boxy adaptation' },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'Boxy T-shirt (prototype)' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
  materials: [{ name: 'Cotton preview', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .96 } }],
  buffers: [{ byteLength: byteOffset }], bufferViews: views, accessors,
};
const json = Buffer.from(JSON.stringify(gltf));
const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const binary = Buffer.concat(buffers);
const header = Buffer.alloc(12); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binary.length, 8);
const chunk = (length, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(length); b.writeUInt32LE(type, 4); return b; };
const glb = Buffer.concat([header, chunk(jsonPadded.length, 0x4e4f534a), jsonPadded, chunk(binary.length, 0x004e4942), binary]);
await writeFile('assets/models/boxy-shirt.glb', glb);
const ranges = [0, 1].map(axis => {
  const values = Array.from({ length: uv.count }, (_, i) => uv.array[i * 2 + axis]);
  return [Math.min(...values), Math.max(...values)];
});
let degenerateUVTriangles = 0;
const paths = [];
for (let i = 0; i < uv.count; i += 3) {
  const points = [0, 1, 2].map(j => [uv.getX(i + j), uv.getY(i + j)]);
  const [a, b, c] = points;
  if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-10) degenerateUVTriangles++;
  paths.push(`<path d="M${points.map(([u, v]) => `${(u * 640).toFixed(2)},${((1 - v) * 640).toFixed(2)}`).join('L')}Z"/>`);
}
await writeFile('docs/shirt-uv.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 656 656"><rect x="-8" y="-8" width="656" height="656" fill="#faf8f2"/><g fill="none" stroke="#244a38" stroke-width=".35">${paths.join('')}</g></svg>`);
const report = { source: input, sourceSha256: createHash('sha256').update(obj).digest('hex'), outputSha256: createHash('sha256').update(glb).digest('hex'), bytes: glb.length, triangles: position.count / 3, vertices: indexed.attributes.position.count, expandedVertices: position.count, boundaries: boundaryLoops(geometry).length, bounds: { min, max }, uv: { count: indexed.attributes.uv.count, ranges, finite: [...uv.array].every(Number.isFinite), degenerateTriangles: degenerateUVTriangles, overlap: 'Not certified; printing uses separate front-only projected decal UVs.' }, adaptation: { height: 1.55, widthMultiplier: 1.22, depthMultiplier: .58, bodyTargetHalfWidth: .64, outerSleeveDrop: .10, neckline: 'narrower with raised front', detail: 'two midpoint subdivisions, boundary smoothing, static analytic folds', units: 'preview units, not garment measurements' } };
report.adaptation.finalProportions = { widthMultiplier: .88, heightMultiplier: 1.06, waistReduction: .035 };
await writeFile('docs/shirt-model-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
