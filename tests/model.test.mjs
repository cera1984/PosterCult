import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import validator from 'gltf-validator';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { boundaryLoops } from '../garment-geometry.js';

test('self-contained GLB passes Khronos validation and recorded hash', async () => {
  const bytes = await readFile('assets/models/boxy-shirt.glb');
  const result = await validator.validateBytes(new Uint8Array(bytes));
  assert.equal(result.issues.numErrors, 0, JSON.stringify(result.issues));
  assert.equal(result.issues.numWarnings, 0, JSON.stringify(result.issues));
  const report = JSON.parse(await readFile('docs/shirt-model-report.json'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), report.outputSha256);
  const source = await readFile(report.source);
  assert.match(source.toString(), /# license CC0/);
  assert.equal(createHash('sha256').update(source).digest('hex'), report.sourceSha256);
  assert.equal(report.uv.finite, true);
  assert.equal(report.uv.count, report.vertices);
  assert.equal(report.boundaries, 4, 'neckline, two sleeves and hem remain open');
  assert.ok(report.bytes < 1500000, 'detailed model must remain light enough for the static site');
  const loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '');
  assert.equal(boundaryLoops(loaded.scene.children[0].geometry).length, 4, 'indexed GLB boundaries must generate collar and hems');
  assert.equal(report.uv.degenerateTriangles, 0);
  assert.ok(report.uv.ranges.every(([min, max]) => min >= 0 && max <= 1 && max > min));
});

test('every catalog original and thumbnail remains available', async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile('gallery-data.js', 'utf8'), context);
  const items = context.window.POSTERZ_IMAGES;
  assert.ok(items.length > 100);
  await Promise.all(items.flatMap(item => [access(item.original), access(item.thumbnail)]));
});
