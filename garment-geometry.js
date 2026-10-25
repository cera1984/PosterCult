import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

// Weld by position, not UV: the downloaded OBJ duplicates vertices at UV seams.
export function garmentTopology(geometry) {
  const p = geometry.attributes.position;
  const points = [], ids = [], lookup = new Map(), edges = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(6)).join(',');
    if (!lookup.has(key)) { lookup.set(key, points.length); points.push(new Vector3(p.getX(i), p.getY(i), p.getZ(i))); }
    ids.push(lookup.get(key));
  }
  const neighbors = points.map(() => new Set()), boundary = points.map(() => new Set());
  const triangles = geometry.index ? Array.from(geometry.index.array, id => ids[id]) : ids;
  for (let i = 0; i < triangles.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = triangles[i + j], b = triangles[i + (j + 1) % 3];
    neighbors[a].add(b); neighbors[b].add(a);
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    const edge = edges.get(key) || { a, b, count: 0 }; edge.count++; edges.set(key, edge);
  }
  for (const { a, b, count } of edges.values()) if (count === 1) { boundary[a].add(b); boundary[b].add(a); }
  return { points, ids, neighbors, boundary };
}

export function boundaryLoops(geometry) {
  const topology = garmentTopology(geometry), visited = new Set(), loops = [];
  for (let start = 0; start < topology.points.length; start++) {
    if (visited.has(start) || topology.boundary[start].size !== 2) continue;
    const ids = []; let current = start, previous = -1;
    do {
      ids.push(current); visited.add(current);
      const next = [...topology.boundary[current]].find(id => id !== previous);
      previous = current; current = next;
    } while (current !== start && current !== undefined && !visited.has(current));
    if (current === start && ids.length >= 3) loops.push(ids.map(id => topology.points[id]));
  }
  return loops;
}

export function smoothGarmentNormals(geometry) {
  geometry.computeVertexNormals();
  const { ids, points } = garmentTopology(geometry), normals = geometry.attributes.normal;
  const sums = points.map(() => new Vector3());
  for (let i = 0; i < ids.length; i++) sums[ids[i]].add(new Vector3(normals.getX(i), normals.getY(i), normals.getZ(i)));
  sums.forEach(n => n.normalize());
  for (let i = 0; i < ids.length; i++) { const n = sums[ids[i]]; normals.setXYZ(i, n.x, n.y, n.z); }
}

export function refineGarment(input, subdivisions = 2) {
  let geometry = input;
  for (let pass = 0; pass < subdivisions; pass++) {
    const p = geometry.attributes.position, uv = geometry.attributes.uv, positions = [], uvs = [];
    const add = (a, b, c) => { for (const v of [a, b, c]) { positions.push(...v.slice(0, 3)); uvs.push(...v.slice(3)); } };
    const midpoint = (a, b) => a.map((v, i) => (v + b[i]) * .5);
    for (let i = 0; i < p.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map(j => [p.getX(i + j), p.getY(i + j), p.getZ(i + j), uv.getX(i + j), uv.getY(i + j)]);
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      add(a, ab, ca); add(ab, b, bc); add(ca, bc, c); add(ab, bc, ca);
    }
    const refined = new BufferGeometry();
    refined.setAttribute('position', new Float32BufferAttribute(positions, 3));
    refined.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.dispose(); geometry = refined;
  }
  const topology = garmentTopology(geometry);
  // Relax edges slightly, preserving the boxy outline and UV correspondence.
  for (let pass = 0; pass < 3; pass++) {
    const smoothed = topology.points.map((point, i) => {
      const neighbors = topology.boundary[i].size ? topology.boundary[i] : topology.neighbors[i];
      const average = new Vector3(); for (const n of neighbors) average.add(topology.points[n]);
      return point.clone().lerp(average.divideScalar(neighbors.size), topology.boundary[i].size ? .3 : .22);
    });
    topology.points = smoothed;
  }
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const point = topology.points[topology.ids[i]].clone(), { x, y, z } = point;
    const body = Math.exp(-Math.pow(Math.abs(x) / .67, 8));
    const lower = 1 / (1 + Math.exp(8 * (y - .15)));
    const side = Math.min(1, Math.abs(x) / .5);
    const frontBack = Math.min(1, Math.abs(z) / .11);
    const vertical = .014 * Math.sin(x * 24 + y * 2.5 + .4 * Math.sin(y * 6)) * lower * (.3 + .7 * side);
    const diagonal = .013 * Math.exp(-Math.pow((y - (.26 - .7 * (.6 - Math.abs(x)))) / .045, 2));
    const chest = .005 * Math.sin(y * 19 + x * 5) * Math.exp(-Math.pow(y / .45, 4));
    const sleeve = .008 * Math.sin(y * 31 + Math.abs(x) * 9) * (1 - body);
    point.z += Math.sign(z) * frontBack * ((vertical + diagonal + chest) * body + sleeve);
    point.y += .004 * Math.sin(x * 14 + .5) * Math.exp(-Math.pow((y + .77) / .10, 2));
    p.setXYZ(i, point.x, point.y, point.z);
  }
  smoothGarmentNormals(geometry);
  return geometry;
}
