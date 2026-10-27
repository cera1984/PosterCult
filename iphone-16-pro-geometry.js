// SPDX-License-Identifier: MIT
// Original preview geometry; dimensions in mm. See docs/IPHONE-16-PRO.md.
import * as THREE from 'three';
export const SPEC = Object.freeze({ width: 71.45, height: 149.61, depth: 8.25,
  clearance: .3, wall: 1.5, back: 1.5, corner: 12,
  camera: Object.freeze({ x: -14, y: 52, width: 40, height: 42, radius: 9 }) });

export function roundedRect(w, h, r, x = 0, y = 0) {
  const s = new THREE.Shape(), l = x-w/2, b = y-h/2;
  s.moveTo(l+r,b); s.lineTo(l+w-r,b); s.absarc(l+w-r,b+r,r,-Math.PI/2,0,false);
  s.lineTo(l+w,b+h-r); s.absarc(l+w-r,b+h-r,r,0,Math.PI/2,false);
  s.lineTo(l+r,b+h); s.absarc(l+r,b+h-r,r,Math.PI/2,Math.PI,false);
  s.lineTo(l,b+r); s.absarc(l+r,b+r,r,Math.PI,Math.PI*1.5,false);
  return s;
}
function hole(shape) { const p = new THREE.Path(); p.curves = shape.curves; return p; }
export function createIphone16ProCase(data) {
  const p=SPEC,c=p.camera,w=p.width+3.6,h=p.height+3.6;
  const group=new THREE.Group();
  const printMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.38,clearcoat:.42,clearcoatRoughness:.3,metalness:0});
  const lining=new THREE.MeshPhysicalMaterial({color:'#242727',roughness:.64,clearcoat:.08});
  const mesh=data.clone(true);
  mesh.traverse(node=>{if(node.isMesh){node.geometry=node.geometry.clone();node.material=node.material.name==='Printed exterior'?printMaterial:lining;}});
  group.add(mesh);
  const ring=roundedRect(c.width+1.6,c.height+1.6,c.radius+.8,c.x,c.y);
  ring.holes.push(hole(roundedRect(c.width,c.height,c.radius,c.x,c.y)));
  const rim=new THREE.Mesh(new THREE.ExtrudeGeometry(ring,{depth:2.1,bevelEnabled:true,bevelSize:.3,bevelThickness:.3,bevelSegments:4,curveSegments:32}),lining);
  rim.position.z=1.3;group.add(rim);
  group.scale.setScalar(1.55/p.height);
  return {group,print:{material:printMaterial,userData:{aspect:w/h}},surface:mesh};
}
