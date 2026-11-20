// Kleine Helfer: Rauschen, Mathe, Geometrien zusammenführen.
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

// Wertrauschen mit weicher Interpolation (eigene Umsetzung)
function hash(x, z) { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export function fbm(x, z, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += noise2(x * f + i * 17.3, z * f - i * 9.1) * a; a *= 0.5; f *= 2.03; } return s; }

// Abstand Punkt–Strecke, plus Anteil t
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return [Math.hypot(px - ax - dx * t, pz - az - dz * t), t];
}

// Alle Meshes einer Gruppe nach Material zusammenführen (statische Kulisse, wenige Draw-Calls)
export function bake(group, { shadows = true } = {}) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, list: [], cast: false, outline: !!o.userData.outline });
    const e = byMat.get(key); e.list.push(g); e.cast = e.cast || o.castShadow;
  });
  const out = new THREE.Group();
  for (const e of byMat.values()) {
    let n = 0; for (const g of e.list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    const hasCol = e.list.every(g => g.attributes.color);
    const col = hasCol ? new Float32Array(n * 3) : null;
    let k = 0;
    for (const g of e.list) {
      pos.set(g.attributes.position.array, k * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, k * 3);
      if (col) col.set(g.attributes.color.array, k * 3);
      k += g.attributes.position.count; g.dispose();
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (col) mg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    mg.computeBoundingSphere();
    const m = new THREE.Mesh(mg, e.mat);
    m.castShadow = shadows && e.cast && !e.outline; m.receiveShadow = !e.outline;
    out.add(m);
  }
  // nicht zusammengeführte Teile (keep) behalten
  const keep = []; group.traverse(o => { if (o.userData.keep && o !== group) keep.push(o); });
  for (const o of keep) { o.updateMatrixWorld(true); const m = o.matrixWorld.clone(); o.removeFromParent(); m.decompose(o.position, o.quaternion, o.scale); out.add(o); }
  return out;
}

// Geometrie mit einer festen Vertexfarbe versehen (für zusammengeführte Bäume)
export function tint(g, hex) {
  g = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
export function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let k = 0;
  for (const g of list) { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); if (g.attributes.color) col.set(g.attributes.color.array, k * 3); k += g.attributes.position.count; }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  m.computeBoundingSphere(); return m;
}
