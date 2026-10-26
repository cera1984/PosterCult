import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeCompositions, normalizeLayerConfig } from '../print-compositions.js';
import validator from 'gltf-validator';

test('legacy compositions migrate without colliding with a hoodie of the same name', () => {
  const saved = normalizeCompositions({
    Preferita: { color: 'black', layers: [{ itemId: 'a', x: 20 }] },
    'hoodie:Preferita': { garment: 'hoodie', color: 'grey', layers: [{ itemId: 'b', side: 'back' }] },
  });
  assert.deepEqual(Object.keys(saved), ['tshirt:Preferita', 'hoodie:Preferita']);
  assert.equal(saved['tshirt:Preferita'].layers[0].x, 20);
  assert.equal(saved['hoodie:Preferita'].layers[0].side, 'back');
  const roundTrip = normalizeCompositions(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(roundTrip, saved);
});

test('damaged local storage cannot introduce invalid print transforms or colors', () => {
  assert.equal(Object.keys(normalizeCompositions([])).length, 0);
  const saved = normalizeCompositions({
    broken: null, incomplete: { color: 'red' },
    Valid: { color: 'constructor', layers: [null, {}, { itemId: 'a', x: Infinity, scale: -2, crop: 'bad', side: 'wrong', rotation: 999 }] },
  });
  assert.equal(Object.keys(saved).length, 1);
  assert.equal(saved['tshirt:Valid'].color, 'white');
  assert.deepEqual(saved['tshirt:Valid'].layers, [{ itemId: 'a', side: 'front', x: 0, y: 0, scale: 25, rotation: 180, crop: 100, flip: false }]);
  assert.equal(normalizeLayerConfig({ x: -200, y: 500, crop: 999 }).crop, 300);
});

test('Premium Eco Hoodie GLB is valid and includes textured UV garment meshes', async () => {
  const bytes = new Uint8Array(await readFile(new URL('../assets/models/premium-eco-hoodie.glb', import.meta.url)));
  const report = await validator.validateBytes(bytes, { uri: 'premium-eco-hoodie.glb' });
  assert.equal(report.issues.numErrors, 0, JSON.stringify(report.issues.messages));
  assert.ok(report.info.animationCount === 0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12, document;
  while (offset < bytes.byteLength) {
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
    if (type === 0x4e4f534a) document = JSON.parse(new TextDecoder().decode(bytes.subarray(offset + 8, offset + 8 + length)).trim());
    offset += 8 + length;
  }
  assert.ok(document.images?.length, 'the packaged GLB should keep its embedded source texture');
  assert.ok(document.meshes.some(mesh => mesh.name.startsWith('Pattern_') && mesh.primitives.some(primitive => primitive.attributes.TEXCOORD_0 !== undefined)));
});
