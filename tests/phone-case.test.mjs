import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import validator from 'gltf-validator';
import * as THREE from 'three';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { createPhoneCase } from '../iphone-16-pro-geometry.js';
import { PHONE_CASE_MODELS } from '../phone-case-models.js';
const buttonAudit=JSON.parse(readFileSync(new URL('./fixtures/iphone-button-audit.json',import.meta.url)));
const hashes=new Set();
for(const p of PHONE_CASE_MODELS)test(p.name+': valid dedicated shell, camera holes, controls and connector',async()=>{
  const bytes=readFileSync(new URL('../assets/models/'+p.id+'-shell.glb',import.meta.url));
  const hash=createHash('sha256').update(bytes).digest('hex');assert.ok(!hashes.has(hash));hashes.add(hash);
  const validation=await validator.validateBytes(new Uint8Array(bytes));assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);
  const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const {group,surface}=createPhoneCase(asset.scene,p);group.updateMatrixWorld(true);
  group.traverse(node=>{if(node.isMesh){computeBoundsTree.call(node.geometry);node.raycast=acceleratedRaycast;}});
  const scale=1.55/p.height;
  const ray=(x,y,z,dx,dy,dz,far=Infinity)=>new THREE.Raycaster(new THREE.Vector3(x,y,z).multiplyScalar(scale),new THREE.Vector3(dx,dy,dz),0,far*scale);
  for(const c of p.cameras)assert.equal(ray(c.x,c.y,20,0,0,-1).intersectObject(group,true).length,0,'camera cutout remains open');
  assert.ok(ray(0,0,20,0,0,-1).intersectObject(surface,true).length,'printed back exists');
  assert.equal(ray(0,0,-p.depth-2,0,0,1,p.depth+1.5).intersectObject(group,true).length,0,'open interior');
  // Golden coordinates are independent of the model manifest and CSG builder.
  const expected=buttonAudit.models[p.id].buttons;
  const sideHits=(sideFromFront,fromTop)=>{
    const sign=sideFromFront==='left'?1:-1;
    return ray(sign*(p.width/2+2.8),p.height/2-fromTop,-p.depth/2,-sign,0,0,4).intersectObject(group,true);
  };
  for(const [name,button] of Object.entries(expected)) {
    assert.equal(p.controls[name],button.fromTop,name+' must match audited Apple ordinate');
    assert.equal(sideHits(button.sideFromFront,button.fromTop).length,0,name+' aperture on correct physical side');
    // Measure both edges of the exported hole, rather than only checking an open centre.
    const edge=direction=>{
      let open=button.fromTop,solid=open;
      for(let i=0;i<400;i++){solid+=direction*.05;if(sideHits(button.sideFromFront,solid).length)break;open=solid;}
      assert.ok(sideHits(button.sideFromFront,solid).length,name+' must have a closed boundary');
      for(let i=0;i<12;i++){const mid=(open+solid)/2;if(sideHits(button.sideFromFront,mid).length)solid=mid;else open=mid;}
      return (open+solid)/2;
    };
    const measuredCentre=(edge(-1)+edge(1))/2;
    assert.ok(Math.abs(measuredCentre-button.fromTop)<.02,name+' exported aperture centre: '+measuredCentre+' vs Apple '+button.fromTop);
  }
  assert.ok(sideHits('right',expected.action.fromTop).length>0,'no mirrored mute/Action hole on front-right');
  const volumeGap=(expected.volumeUp.fromTop+expected.volumeDown.fromTop)/2;
  assert.ok(sideHits('left',volumeGap).length>0,'solid bridge separates volume apertures');
  if(expected.cameraControl)assert.ok(sideHits('left',expected.cameraControl.fromTop).length>0,'no mirrored Camera Control hole');
  assert.equal(ray(0,-p.height/2-2.8,-p.depth/2,0,1,0,4).intersectObject(group,true).length,0,'connector aperture');
  const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()).divideScalar(scale);
  assert.ok(Math.abs(size.x-(p.width+3.6))<.01);assert.ok(Math.abs(size.y-(p.height+3.6))<.01);
  group.traverse(node=>{if(node.geometry)for(const value of node.geometry.attributes.position.array)assert.ok(Number.isFinite(value));});
});
