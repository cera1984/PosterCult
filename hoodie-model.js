import * as THREE from 'three';
import { cottonMaterial } from './garment-material.js?v=hoodie-model-1';

// Standalone, low-poly hoodie body and details made from procedural geometry.
// No third-party hoodie asset is included.
export function createHoodieModel() {
  const group = new THREE.Group();
  group.name = 'Procedural hoodie model';

  const bodyMaterial = cottonMaterial('body');
  const rib = cottonMaterial('rib');
  const addMesh = (geometry, material, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const profile = [
    [-.82, .42, .155], [-.68, .43, .17], [-.36, .47, .19],
    [ .02, .52, .205], [ .34, .52, .19], [ .52, .45, .165], [.60, .245, .13],
  ];
  const radialSegments = 48, positions = [], uvs = [], indices = [];
  profile.forEach(([y, radiusX, radiusZ], row) => {
    for (let i = 0; i < radialSegments; i++) {
      const angle = i / radialSegments * Math.PI * 2;
      positions.push(Math.sin(angle) * radiusX, y, Math.cos(angle) * radiusZ);
      uvs.push(i / radialSegments, row / (profile.length - 1));
    }
  });
  for (let row = 0; row < profile.length - 1; row++) for (let i = 0; i < radialSegments; i++) {
    const a = row * radialSegments + i, b = row * radialSegments + (i + 1) % radialSegments;
    const c = a + radialSegments, d = b + radialSegments;
    indices.push(a, b, c, b, d, c);
  }
  const bodyGeometry = new THREE.BufferGeometry();
  bodyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  bodyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  bodyGeometry.setIndex(indices);
  bodyGeometry.computeVertexNormals();
  const body = addMesh(bodyGeometry, bodyMaterial, 'Hoodie torso');
  body.material.side = THREE.DoubleSide;
  group.userData.body = body;

  // Tapered sleeves extend from the dropped shoulder to ribbed cuffs.
  for (const side of [-1, 1]) {
    const start = new THREE.Vector3(side * .48, .35, 0);
    const end = new THREE.Vector3(side * .78, -.47, 0);
    const direction = end.clone().sub(start);
    const sleeve = addMesh(
      new THREE.CylinderGeometry(.145, .105, direction.length(), 20, 1, true),
      bodyMaterial,
      `Long sleeve ${side}`,
    );
    sleeve.position.copy(start).add(end).multiplyScalar(.5);
    sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

    const cuff = addMesh(new THREE.CylinderGeometry(.112, .112, .09, 20, 1, true), rib, `Rib cuff ${side}`);
    cuff.position.copy(end);
    cuff.quaternion.copy(sleeve.quaternion);
  }

  // Kangaroo pocket, kept below the normal print area.
  const pocketShape = new THREE.Shape();
  pocketShape.moveTo(-.29, -.34);
  pocketShape.lineTo(.29, -.34);
  pocketShape.lineTo(.24, -.62);
  pocketShape.quadraticCurveTo(0, -.69, -.24, -.62);
  pocketShape.closePath();
  const pocketGeometry = new THREE.ShapeGeometry(pocketShape, 16);
  const pocketPositions = pocketGeometry.attributes.position;
  for (let i = 0; i < pocketPositions.count; i++) {
    const x = pocketPositions.getX(i), y = pocketPositions.getY(i);
    const radiusX = y < -.68 ? .43 : y < -.36 ? .43 + (y + .68) * .125 : .47;
    const radiusZ = y < -.68 ? .17 : y < -.36 ? .17 + (y + .68) * .0625 : .19;
    const z = radiusZ * Math.sqrt(Math.max(.08, 1 - (x / radiusX) ** 2)) + .006;
    pocketPositions.setZ(i, z);
  }
  pocketGeometry.computeVertexNormals();
  const pocket = addMesh(pocketGeometry, cottonMaterial('body'), 'Kangaroo pocket');
  pocket.material.polygonOffset = true;
  pocket.material.polygonOffsetFactor = -2;
  pocket.material.side = THREE.DoubleSide;

  // Rounded hood panel sits behind the neckline and reads from both views.
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-.23, .53);
  hoodShape.quadraticCurveTo(-.28, .82, 0, .91);
  hoodShape.quadraticCurveTo(.28, .82, .23, .53);
  hoodShape.quadraticCurveTo(0, .43, -.23, .53);
  const hood = addMesh(new THREE.ExtrudeGeometry(hoodShape, { depth: .12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .018, bevelThickness: .018 }), cottonMaterial('body'), 'Hood');
  hood.position.z = -.26;
  hood.material.side = THREE.DoubleSide;

  return group;
}
