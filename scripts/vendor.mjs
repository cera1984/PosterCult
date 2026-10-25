import { mkdir, copyFile } from 'node:fs/promises';
const files = ['build/three.core.js', 'build/three.module.js', 'examples/jsm/controls/OrbitControls.js', 'examples/jsm/loaders/GLTFLoader.js', 'examples/jsm/utils/BufferGeometryUtils.js', 'examples/jsm/geometries/DecalGeometry.js', 'examples/jsm/environments/RoomEnvironment.js', 'LICENSE'];
for (const file of files) {
  const target = `vendor/three/${file}`;
  await mkdir(target.slice(0, target.lastIndexOf('/')), { recursive: true });
  await copyFile(`node_modules/three/${file}`, target);
}
console.log('Three.js 0.180.0 vendored with MIT license.');
