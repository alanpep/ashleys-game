// Speed-up: combine lots of small pieces that share a material into one big piece,
// so the graphics card draws a few things instead of thousands.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP_ATTRS = ['position', 'normal', 'uv'];

// Merges the direct mesh children of `group`. Meshes with userData.keep are left alone.
// Meshes are only merged with others that have the same material, shadow settings and userData.tag.
// Returns a Map from each old mesh to the merged mesh that replaced it.
export function mergeStatic(group) {
  const buckets = new Map();
  for (const m of group.children) {
    if (!m.isMesh || Array.isArray(m.material) || m.userData.keep) continue;
    const key = `${m.material.uuid}|${m.castShadow}|${m.receiveShadow}|${m.userData.tag ?? ''}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(m);
  }
  const replaced = new Map();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = [];
    for (const m of list) {
      m.updateMatrix();
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!KEEP_ATTRS.includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.morphAttributes = {};
      g.applyMatrix4(m.matrix);
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mm = new THREE.Mesh(merged, list[0].material);
    mm.castShadow = list[0].castShadow;
    mm.receiveShadow = list[0].receiveShadow;
    mm.userData = list[0].userData;
    group.add(mm);
    for (const m of list) { group.remove(m); replaced.set(m, mm); }
  }
  return replaced;
}

// Swap merged meshes into a list (like the list of walls), without duplicates.
export function remap(list, replaced) {
  return [...new Set(list.map((m) => replaced.get(m) ?? m))];
}
