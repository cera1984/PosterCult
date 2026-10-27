import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';

export const CINEMA_ASSETS = Object.freeze({
  projector: './assets/cinema/film-projector.glb',
  pedestal: './assets/cinema/projector-pedestal.glb',
  seat: './assets/cinema/auditorium-seat.glb',
  curtain: './assets/cinema/curtain-panel.glb',
  reel: './assets/cinema/film-reel.glb',
  popcorn: './assets/cinema/popcorn-machine.glb',
  counter: './assets/cinema/concession-counter.glb'
});

// Source templates belong to the library; each scene receives independent resources.
export function createCinemaAssetLibrary() {
  const pending = new Map(), templates = new Set();
  let disposed = false;
  const release = root => root.traverse(node => {
    node.geometry?.dispose();
    for (const m of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) m.dispose();
  });
  function load(key) {
    if (disposed) return Promise.resolve(null);
    if (!pending.has(key)) {
      const promise = new GLTFLoader().loadAsync(new URL(CINEMA_ASSETS[key], import.meta.url).href)
        .then(gltf => { if (disposed) { release(gltf.scene); return null; } templates.add(gltf.scene); return gltf.scene; })
        .catch(() => { pending.delete(key); return null; });
      pending.set(key, promise);
    }
    return pending.get(key);
  }
  function copy(source, track) {
    const root = source.clone(true), materials = new Map();
    root.traverse(node => {
      if (!node.isMesh) return;
      node.geometry = track(node.geometry.clone());
      const adapt = original => {
        if (materials.has(original)) return materials.get(original);
        let material = original.clone();
        if (original.name === 'burgundy') {
          material = new THREE.MeshPhysicalMaterial({ color: '#64172b', roughness: .87, metalness: 0, sheen: .7, sheenColor: '#bc5263', sheenRoughness: .75, side: original.side });
          material.name = 'burgundy';
        }
        if (original.name === 'teal') { material.color.set('#30463d'); material.roughness = .42; material.metalness = .4; }
        if (original.name === 'brass') { material.color.set('#bc9958'); material.metalness = .72; material.roughness = .35; }
        if (original.name === 'wood') { material.color.set('#462b1b'); material.roughness = .62; }
        // Avoid a transmission render pass for the little concession glass.
        if (original.name === 'glass') { material.transmission = 0; material.transparent = true; material.opacity = .15; material.depthWrite = false; }
        materials.set(original, track(material)); return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(adapt) : adapt(node.material);
    });
    return root;
  }
  return { load, copy, dispose() { disposed = true; for (const root of templates) release(root); templates.clear(); pending.clear(); } };
}

export function instanceCinemaSeats(model, placements, track) {
  model.updateMatrixWorld(true);
  const group = new THREE.Group(), transform = new THREE.Matrix4();
  model.traverse(part => {
    if (!part.isMesh) return;
    const geometry = track(part.geometry.clone());
    // glTF quantized attributes must be expanded before baking metre-space transforms.
    for (const name of ['position', 'normal']) {
      const attribute = geometry.getAttribute(name);
      if (!attribute || attribute.array instanceof Float32Array) continue;
      const values = new Float32Array(attribute.count * 3);
      for (let i = 0; i < attribute.count; i++) { values[i*3]=attribute.getX(i); values[i*3+1]=attribute.getY(i); values[i*3+2]=attribute.getZ(i); }
      geometry.setAttribute(name,new THREE.BufferAttribute(values,3));
    }
    geometry.applyMatrix4(part.matrixWorld);
    const instances = new THREE.InstancedMesh(geometry, part.material, placements.length);
    for (let i = 0; i < placements.length; i++) {
      const { x, y, z } = placements[i];
      transform.makeRotationY(Math.PI); transform.setPosition(x, y, z);
      instances.setMatrixAt(i, transform);
    }
    instances.computeBoundingSphere(); group.add(instances);
  });
  return group;
}
