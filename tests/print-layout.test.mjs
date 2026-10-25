import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePrintScale, printDimensions } from '../print-layout.js';

test('100%, 150%, 200% multiply dimensions without distorting portrait or landscape art', () => {
  for (const ratio of [2 / 3, 16 / 9, 1]) {
    const base = printDimensions(ratio, 100);
    for (const percent of [25, 100, 150, 200, 275, 300]) {
      const scaled = printDimensions(ratio, percent);
      assert.ok(Math.abs(scaled.width / base.width - percent / 100) < 1e-10);
      assert.ok(Math.abs(scaled.height / base.height - percent / 100) < 1e-10);
      assert.ok(Math.abs(scaled.width / scaled.height - ratio) < 1e-10);
    }
  }
});

test('print scale stays within bounds and invalid aspect ratios are rejected', () => {
  assert.equal(normalizePrintScale(0), 25);
  assert.equal(normalizePrintScale(500), 300);
  assert.equal(normalizePrintScale('150'), 150);
  assert.equal(normalizePrintScale('invalid'), 100);
  assert.throws(() => printDimensions(0));
  assert.throws(() => printDimensions(Infinity));
});
