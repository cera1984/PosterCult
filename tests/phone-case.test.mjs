import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createIphone16ProCase, SPEC } from '../iphone-16-pro-geometry.js';

test('16 Pro shell uses Apple body dimensions and leaves camera and front open', () => {
  const {group, print} = createIphone16ProCase();
  group.updateMatrixWorld(true);
  assert.deepEqual([SPEC.width,SPEC.height,SPEC.depth],[71.45,149.61,8.25]);
  const scale=1.55/SPEC.height;
  const ray = (x,y) => new THREE.Raycaster(new THREE.Vector3(x*scale,y*scale,1),new THREE.Vector3(0,0,-1));
  assert.equal(ray(SPEC.camera.x,SPEC.camera.y).intersectObjects(group.children).length,0,'camera opening has no triangles');
  assert.ok(ray(0,0).intersectObject(print).length,'back exists at print center');
  const box=new THREE.Box3().setFromObject(group);
  assert.ok(Math.abs(box.getSize(new THREE.Vector3()).x/scale-(SPEC.width+3.6))<.01);
  for(const child of group.children) {
    for(const value of child.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
  }
  assert.ok(SPEC.back<=2.1,'back thickness within Apple guideline, not a MagSafe certification');
});
