// Flaches Toon-Shading mit drei harten Helligkeitsstufen, ohne Glanz.
import * as THREE from 'three';
import { PAL } from './palette.js';

const gradient = (() => {
  // 3 Stufen: Schatten, Halbton, Licht
  const data = new Uint8Array([120, 120, 120, 255, 196, 196, 196, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

const cache = new Map();
export function toon(color, opts) {
  const key = color + (opts ? JSON.stringify(Object.keys(opts)) : '');
  if (!opts && cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradient }, opts || {}));
  if (!opts) cache.set(key, m);
  return m;
}

// Tinte für Umrisse (umgedrehte Hülle)
export const inkLine = new THREE.MeshBasicMaterial({ color: PAL.tinte, side: THREE.BackSide });
export const inkFlat = new THREE.MeshBasicMaterial({ color: PAL.tinte });

// Umriss für ein Mesh: Kopie mit Rückseiten, leicht aufgeblasen
export function outline(mesh, w = 0.035) {
  const o = new THREE.Mesh(mesh.geometry, inkLine);
  o.userData.outline = true;
  const g = mesh.geometry; g.computeBoundingSphere();
  const r = g.boundingSphere.radius || 1;
  o.scale.setScalar(1 + w / r);
  o.castShadow = false; o.receiveShadow = false;
  mesh.add(o);
  return o;
}

export { gradient };
