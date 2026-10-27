// SPDX-License-Identifier: MIT
// Original preview meshes, not manufacturing CAD. Browser loads one GLB at a time.
import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFile } from 'node:fs/promises';
import { roundedRect } from '../iphone-16-pro-geometry.js';
import { PHONE_CASE_MODELS } from '../phone-case-models.js';
const warn=console.warn;console.warn=(...args)=>{if(!String(args[0]).includes('maxLeafTris'))warn(...args);};
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}};
for(const p of PHONE_CASE_MODELS) {
  if(process.argv[2] && p.id!==process.argv[2])continue;
  const w=p.width+3.6,h=p.height+3.6;
  const ink=new THREE.MeshStandardMaterial();ink.name='Printed exterior';
  const inner=new THREE.MeshStandardMaterial();inner.name='TPU inner surface';
  const brushes=[];
  function solid(shape,z,depth,bevel=0,material=inner){
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:4,curveSegments:24,steps:1});
    g.translate(0,0,z);const uv=g.attributes.uv,pos=g.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+w/2)/w,(pos.getY(i)+h/2)/h);
    const b=new Brush(g,material);b.updateMatrixWorld(true);brushes.push(b);return b;
  }
  const evaluator=new Evaluator();evaluator.useGroups=true;evaluator.consolidateGroups=true;
  let body=solid(roundedRect(w-1.2,h-1.2,p.corner+.9),-p.depth-.45,p.depth+1.35,.6,ink);
  const cut=b=>{body=evaluator.evaluate(body,b,SUBTRACTION);body.updateMatrixWorld(true);};
  cut(solid(roundedRect(p.width+.6,p.height+.6,p.corner),-p.depth-2,p.depth+2));
  for(const c of p.cameras)cut(solid(roundedRect(c.width,c.height,c.radius,c.x,c.y),-1,8,.25));
  function sideCut(sideFromFront,top,length,height){
    const b=solid(roundedRect(length,height,height/2),0,8,.18);
    b.geometry.rotateZ(Math.PI/2);b.geometry.rotateY(Math.PI/2);
    // Mesh +Z faces the printed BACK, with its camera at -X.
    // The phone's front-left controls therefore lie at mesh +X.
    b.position.set(sideFromFront==='left'?w/2-4:-w/2-4,p.height/2-top,-p.depth/2);
    b.updateMatrixWorld(true);return b;
  }
  for(const [top,length,height] of [[p.controls.action,p.actionButton?9:10,p.actionButton?3.8:5], [p.controls.volumeUp,13.5,3.8],[p.controls.volumeDown,13.5,3.8]])cut(sideCut('left',top,length,height));
  cut(sideCut('right',p.controls.power,20,3.8));
  if(p.controls.cameraControl)cut(sideCut('right',p.controls.cameraControl,26,6.1));
  function bottomCut(x,width,height){
    const b=solid(roundedRect(width,height,height/2),0,8,.2);b.rotation.x=Math.PI/2;
    b.position.set(x,-h/2+4,-p.depth/2);b.updateMatrixWorld(true);return b;
  }
  cut(bottomCut(0,p.connector==='Lightning'?14:15,6.5));
  for(const x of [-24,-20,-16,16,20,24])cut(bottomCut(x,2.1,3));
  const glb=await new GLTFExporter().parseAsync(new THREE.Mesh(body.geometry,body.material),{binary:true});
  await writeFile('assets/models/'+p.id+'-shell.glb',Buffer.from(glb));
  console.log(p.name+': '+glb.byteLength+' bytes');
  for(const b of brushes)b.geometry.dispose();body.geometry.dispose();ink.dispose();inner.dispose();
}
