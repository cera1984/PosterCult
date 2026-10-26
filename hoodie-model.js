import { cottonMaterial } from './garment-material.js?v=hoodie-model-3';

// Prepare the CC BY Premium Eco Hoodie GLB for the catalog viewer.
export function prepareHoodieModel(gltf) {
  const group = gltf.scene;
  group.name = 'Premium Eco Hoodie';
  // The source model is authored in metres, standing upright around y=1.4.
  group.position.y = -1.41;
  const bodyMeshes = [];
  const oldMaterials = new Set();

  group.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (!object.name.startsWith('Pattern_')) return;

    bodyMeshes.push(object);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) if (material) oldMaterials.add(material);
    const replacement = cottonMaterial('body');
    replacement.name = 'PosterCult cotton';
    replacement.color.set('#ffffff');
    object.material = replacement;
  });

  // The GLB's base map is a multicolour alignment chart. The configurator uses
  // its own fabric shading and solid garment palette instead.
  for (const material of oldMaterials) {
    material.map?.dispose();
    material.dispose();
  }
  group.updateMatrixWorld(true);
  return { group, bodyMeshes };
}
