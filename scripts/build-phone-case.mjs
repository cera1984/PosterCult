// Build the original preview shell once; browser only loads the resulting mesh.
import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFile } from 'node:fs/promises';
import { roundedRect, SPEC } from '../iphone-16-pro-geometry.js';
const p=SPEC,w=p.width+3.6,h=p.height+3.6;
const ink=new THREE.MeshStandardMaterial();ink.name='Printed exterior';
const inner=new THREE.MeshStandardMaterial();inner.name='TPU inner surface';
function solid(shape,z,depth,bevel=.0,material=inner){
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:4,curveSegments:24,steps:1});
  g.translate(0,0,z);
  const uv=g.attributes.uv,pos=g.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+w/2)/w,(pos.getY(i)+h/2)/h);
  const b=new Brush(g,material);b.updateMatrixWorld(true);return b;
}
const e=new Evaluator();e.useGroups=true;e.consolidateGroups=true;
let body=solid(roundedRect(w-1.2,h-1.2,p.corner+.9),-8.7,9.6,.6,ink);
const cut=b=>{body=e.evaluate(body,b,SUBTRACTION);body.updateMatrixWorld(true);};
cut(solid(roundedRect(p.width+.6,p.height+.6,p.corner),-10,10,0));
const c=p.camera;
cut(solid(roundedRect(c.width,c.height,c.radius,c.x,c.y),-1,8,.25));
// Side openings are capsules with a continuous rim above and below them.
function sideCut(x,y,length,height){const b=solid(roundedRect(length,height,height/2),0,7,.18);b.geometry.rotateZ(Math.PI/2);b.geometry.rotateY(Math.PI/2);b.position.set(x,y,-3.8);b.updateMatrixWorld(true);return b;}
// At x negative/positive, local horizontal becomes the phone longitudinal axis.
for(const [x,y,length,height] of [[-40,50,9,3.8],[-40,34,29,3.8],[33,33,19,3.8],[33,-36,23,6.1]])cut(sideCut(x,y,length,height));
function bottomCut(x,width,height){const b=solid(roundedRect(width,height,height/2),0,7,.2);b.rotation.x=Math.PI/2;b.position.set(x,-72,-4.3);b.updateMatrixWorld(true);return b;}
cut(bottomCut(0,15,6.5));
for(const x of [-24,-20,-16,16,20,24])cut(bottomCut(x,2.1,3));
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();}); }
};
const mesh=new THREE.Mesh(body.geometry,body.material);
const glb=await new GLTFExporter().parseAsync(mesh,{binary:true});
await writeFile('assets/models/iphone-16-pro-shell.glb',Buffer.from(glb));
console.log('Built shell:',body.geometry.attributes.position.count,'vertices;',glb.byteLength,'bytes');
