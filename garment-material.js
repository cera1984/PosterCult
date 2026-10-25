import * as THREE from 'three';
import { boundaryLoops, garmentTopology } from './garment-geometry.js';
import { GARMENT_COLORS } from './garment-palette.js';

export function cottonMaterial(role = 'body') {
  const material = new THREE.MeshPhysicalMaterial({ roughness: .9, metalness: 0, side: THREE.DoubleSide, sheen: .28, sheenRoughness: .9, sheenColor: '#aaa79f', specularIntensity: .24 });
  material.userData.fabricRole = role;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFabricPosition;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvFabricPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFabricPosition;').replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      // The same world-space weave is used for cloth and ink, independent of their UVs.
      vec2 threads = vFabricPosition.xy * vec2(480.0, 660.0);
      float weaveAA = 1.0 - smoothstep(0.9, 3.0, max(fwidth(threads.x), fwidth(threads.y)));
      float fiberHeight = 0.095 * weaveAA * sin(threads.x + 0.3 * sin(threads.y)) * sin(threads.y);
      vec3 fabricDx = normalize(dFdx(vViewPosition));
      vec3 fabricDy = normalize(dFdy(vViewPosition));
      vec3 fabricR1 = cross(fabricDy, normal);
      vec3 fabricR2 = cross(normal, fabricDx);
      float fabricDet = dot(fabricDx, fabricR1);
      vec3 fabricGradient = sign(fabricDet) * (dFdx(fiberHeight) * fabricR1 + dFdy(fiberHeight) * fabricR2);
      normal = normalize(abs(fabricDet) * normal - faceDirection * fabricGradient);
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec2 fiberThreads = vFabricPosition.xy * vec2(480.0, 660.0);
      float fiberAA = 1.0 - smoothstep(0.9, 3.0, max(fwidth(fiberThreads.x), fwidth(fiberThreads.y)));
      diffuseColor.rgb *= 1.0 - 0.025 * fiberAA * (0.5 + 0.5 * sin(fiberThreads.x) * sin(fiberThreads.y));
    `);
  };
  material.customProgramCacheKey = () => 'postercult-cotton-v1';
  return material;
}

export function setCottonColor(objects, color) {
  const palette = GARMENT_COLORS[color] || GARMENT_COLORS.white;
  const base = new THREE.Color(palette.base);
  for (const root of objects) root?.traverse(object => {
    const material = object.material;
    if (!material?.userData.fabricRole || material.userData.fabricRole === 'ink') return;
    const role = material.userData.fabricRole;
    material.color.copy(base).multiplyScalar(role === 'rib' ? .91 : role === 'thread' ? .79 : 1);
    if (material.sheenColor) material.sheenColor.set(palette.sheen);
  });
}

// Build collar and hems from actual open mesh boundaries, including the back.
export function garmentTrims(geometry) {
  const group = new THREE.Group(); group.name = 'Collar and double-stitched hems';
  const topology = garmentTopology(geometry), n = geometry.attributes.normal;
  const normals = topology.points.map(() => new THREE.Vector3());
  topology.ids.forEach((id, i) => normals[id].add(new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i))));
  normals.forEach(normal => normal.normalize());
  const key = p => p.toArray().map(v => v.toFixed(6)).join(',');
  const lookup = new Map(topology.points.map((p, id) => [key(p), id]));
  const ribMaterial = cottonMaterial('rib');
  const threadMaterial = new THREE.LineDashedMaterial({ color: '#aaa79e', dashSize: .005, gapSize: .004, transparent: true, opacity: .7 });
  threadMaterial.userData.fabricRole = 'thread';
  for (const loop of boundaryLoops(geometry)) {
    const center = loop.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(loop.length);
    const collar = center.y > .45, width = collar ? .036 : .027;
    const frames = loop.map((p, i) => {
      const id = lookup.get(key(p)), normal = normals[id];
      const tangent = loop[(i + 1) % loop.length].clone().sub(loop[(i + loop.length - 1) % loop.length]).normalize();
      const interior = [...topology.neighbors[id]].filter(index => !topology.boundary[index].size);
      const reference = new THREE.Vector3();
      for (const index of interior) reference.add(topology.points[index].clone().sub(p));
      const inward = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      if (inward.dot(reference) < 0) inward.negate();
      return { p, normal, inward };
    });
    const pointAt = (i, t) => {
      const f = frames[i % frames.length];
      return f.p.clone().addScaledVector(f.inward, width * t).addScaledVector(f.normal, .002 + .002 * Math.sin(t * Math.PI));
    };
    const positions = [];
    for (let i = 0; i < frames.length; i++) for (let row = 0; row < 3; row++) {
      const a = pointAt(i, row / 3), b = pointAt(i + 1, row / 3), c = pointAt(i, (row + 1) / 3), d = pointAt(i + 1, (row + 1) / 3);
      for (const point of [a, b, c, b, d, c]) positions.push(...point.toArray());
    }
    const bandGeometry = new THREE.BufferGeometry(); bandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); bandGeometry.computeVertexNormals();
    const band = new THREE.Mesh(bandGeometry, ribMaterial); band.castShadow = true; band.receiveShadow = true; group.add(band);
    const path = new THREE.CatmullRomCurve3(loop.map((p, i) => p.clone().addScaledVector(frames[i].normal, .001)), true, 'centripetal');
    const rolledEdge = new THREE.Mesh(new THREE.TubeGeometry(path, loop.length, collar ? .0045 : .0025, 6, true), ribMaterial);
    rolledEdge.castShadow = true; group.add(rolledEdge);
    for (const t of collar ? [.78] : [.5, .84]) {
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(frames.map((f, i) => pointAt(i, t).addScaledVector(f.normal, .001))), threadMaterial);
      line.computeLineDistances(); group.add(line);
    }
  }
  return group;
}
