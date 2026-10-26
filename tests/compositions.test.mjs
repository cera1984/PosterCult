import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCompositions, normalizeLayerConfig } from '../print-compositions.js';
import { createHoodieModel } from '../hoodie-model.js';
import { boundaryLoops } from '../garment-geometry.js';

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

test('hoodie torso has only neck and hem boundaries, without a false center seam', () => {
  const model = createHoodieModel(), body = model.userData.body;
  assert.ok(body.geometry.attributes.uv);
  const loops = boundaryLoops(body.geometry);
  assert.equal(loops.length, 2);
  for (const loop of loops) {
    const ys = loop.map(point => point.y);
    assert.ok(Math.max(...ys) - Math.min(...ys) < .000001);
  }
  const normals = body.geometry.attributes.normal;
  assert.ok(Array.from(normals.array).every(Number.isFinite));
  model.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
});
