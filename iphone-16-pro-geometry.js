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
export function createIphone16ProCase() {
  const p = SPEC, w=p.width+2*(p.clearance+p.wall), h=p.height+2*(p.clearance+p.wall);
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: '#e7e2d7', roughness: .58 });
  const c=p.camera;
  const back = roundedRect(w,h,p.corner+p.wall);
  back.holes.push(hole(roundedRect(c.width,c.height,c.radius,c.x,c.y)));
  const geometry = new THREE.ExtrudeGeometry(back,{depth:p.back,bevelEnabled:false,curveSegments:24});
  // Planar UVs in mm, continuous across the camera opening. No image bridges the hole.
  const uv=geometry.attributes.uv, pos=geometry.attributes.position;
  for(let i=0;i<uv.count;i++) uv.setXY(i,(pos.getX(i)+w/2)/w,(pos.getY(i)+h/2)/h);
  const print = new THREE.Mesh(geometry,material); print.userData.aspect=w/h; group.add(print);
  // Open front; segmented side rails leave real openings for keys and Camera Control.
  const railMaterial=new THREE.MeshStandardMaterial({color:'#444b47',roughness:.55});
  const inside=new THREE.Mesh(new THREE.ShapeGeometry(back,24),new THREE.MeshStandardMaterial({color:'#444b47',roughness:.65,side:THREE.BackSide}));
  inside.position.z=-.01;group.add(inside);
  const rail=(length,x,y,vertical=false)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(vertical?p.wall:length,vertical?length:p.wall,p.depth+.8),railMaterial);
    mesh.position.set(x,y,-(p.depth+.8)/2);group.add(mesh);
  };
  const left=-w/2+p.wall/2,right=-left,bottom=-h/2+p.wall/2,top=-bottom;
  // Left openings cover Action/volume controls. Right: side button and Camera Control.
  for(const [a,b] of [[-h/2+p.corner,14],[64,h/2-p.corner]]) rail(b-a,left,(a+b)/2,true);
  for(const [a,b] of [[-h/2+p.corner,-50],[-24,18],[48,h/2-p.corner]]) rail(b-a,right,(a+b)/2,true);
  rail(w-2*p.corner,0,top);
  // Broad bottom opening leaves USB-C, microphones and speaker unobstructed visually.
  for(const sign of [-1,1]) rail(7,sign*(w/2-p.corner-3.5),bottom);
  // Curved corner rails follow the same circular profile as the back.
  for(const [x,y,start] of [[w/2-p.corner-p.wall,h/2-p.corner-p.wall,0],[-w/2+p.corner+p.wall,h/2-p.corner-p.wall,Math.PI/2],[-w/2+p.corner+p.wall,-h/2+p.corner+p.wall,Math.PI],[w/2-p.corner-p.wall,-h/2+p.corner+p.wall,Math.PI*1.5]]) {
    const outer=p.corner+p.wall, inner=p.corner;
    const s=new THREE.Shape();s.absarc(x,y,outer,start,start+Math.PI/2,false);s.absarc(x,y,inner,start+Math.PI/2,start,true);s.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:p.depth+.8,bevelEnabled:false,curveSegments:24}),railMaterial);
    mesh.position.z=-(p.depth+.8);group.add(mesh);
  }
  // Raised camera protection is a ring, never an opaque fake camera island.
  const ring=roundedRect(c.width+2,c.height+2,c.radius+1,c.x,c.y);
  ring.holes.push(hole(roundedRect(c.width,c.height,c.radius,c.x,c.y)));
  const rim=new THREE.Mesh(new THREE.ExtrudeGeometry(ring,{depth:3.3,bevelEnabled:false,curveSegments:24}),railMaterial);
  rim.position.z=p.back;group.add(rim);
  group.scale.setScalar(1.55/p.height);
  return {group,print};
}
