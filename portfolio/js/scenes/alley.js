import * as THREE from 'three';
import { shutter, sign, lantern, glow } from '../art.js';

// Contact: a narrow, red-lit night alley. Shopfronts with shutters and signs,
// paper lanterns, overhead cables, a warm glow at the far end, rising embers.

export function createAlley({ anisotropy }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0201);
  scene.fog = new THREE.FogExp2(0x1d0503, 0.075);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 60);
  scene.add(new THREE.HemisphereLight(0xff6a4a, 0x0a0000, 0.55));

  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = anisotropy; return t; };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...extra });
  const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };

  const W = 1.9;          // half width
  const LEN = 34;

  // wet ground
  const ground = add(new THREE.PlaneGeometry(W * 2, LEN), std(0x1a0705, { roughness: 0.28, metalness: 0.35 }), 0, 0, -LEN / 2 + 6);
  ground.rotation.x = -Math.PI / 2;

  const shutters = [0, 1, 2, 3].map((i) => std(0xffffff, { map: tex(shutter(i + 1)), roughness: 0.6 }));
  const wallMats = [0x3a0f0a, 0x2b0b07, 0x4a1a10, 0x220806].map((c) => std(c, { roughness: 0.9 }));
  const signs = [], vsigns = [];
  for (let i = 0; i < 8; i++) signs.push(new THREE.MeshStandardMaterial({ map: tex(sign(i * 7 + 1)), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.6 }));
  signs.forEach((m) => { m.emissiveMap = m.map; m.emissiveIntensity = 0.9; });
  for (let i = 0; i < 6; i++) {
    const t = tex(sign(i * 11 + 3, true));
    vsigns.push(new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.6 }));
  }

  // shopfronts on both sides, every ~2.4 m
  let k = 0;
  for (let z = 4; z > -LEN + 6; z -= 2.4) {
    for (const sx of [-1, 1]) {
      k++;
      const wall = wallMats[k % wallMats.length];
      add(new THREE.BoxGeometry(0.3, 5.2, 2.42), wall, sx * (W + 0.15), 2.6, z);
      // recess + shutter
      add(new THREE.PlaneGeometry(1.7, 2.1), shutters[k % 4], sx * (W - 0.001), 1.1, z, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
      // awning
      const aw = add(new THREE.BoxGeometry(0.7, 0.06, 2.2), std(k % 3 ? 0x5a0d08 : 0x161616), sx * (W - 0.35), 2.35, z);
      aw.rotation.z = sx * -0.25;
      // horizontal sign above the awning
      if (k % 2) add(new THREE.PlaneGeometry(1.8, 0.56), signs[k % signs.length], sx * (W - 0.02), 2.95, z, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
      // vertical sign sticking out into the alley
      if (k % 3 === 0) {
        const vs = add(new THREE.BoxGeometry(0.06, 1.4, 0.36), std(0x111111), sx * (W - 0.45), 3.4, z + 0.7);
        add(new THREE.PlaneGeometry(0.34, 1.32), vsigns[k % vsigns.length], sx * (W - 0.45) - sx * 0.035, 3.4, z + 0.7, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
        vs.rotation.y = 0;
      }
      // crates and plants
      if (k % 4 === 1) add(new THREE.BoxGeometry(0.5, 0.4, 0.5), std(0x3b2414), sx * (W - 0.35), 0.2, z - 0.6);
      if (k % 5 === 2) {
        add(new THREE.CylinderGeometry(0.2, 0.16, 0.36, 10), std(0x2a1410), sx * (W - 0.3), 0.18, z + 0.4);
        add(new THREE.IcosahedronGeometry(0.34, 0), std(0x24120c, { flatShading: true }), sx * (W - 0.3), 0.58, z + 0.4);
      }
    }
  }
  // far wall with a warm glow
  add(new THREE.PlaneGeometry(W * 2, 6), std(0x2a0a06), 0, 3, -LEN + 6);
  const farGlow = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: tex(glow('rgba(255,170,90,1)', 'rgba(255,60,20,0)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  farGlow.position.set(0, 1.6, -LEN + 6.2);
  scene.add(farGlow);

  // overhead cables and beams
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x050101 });
  for (let i = 0; i < 18; i++) {
    const c = add(new THREE.CylinderGeometry(0.012, 0.012, W * 2.4, 5), cableMat, 0, 4.2 + Math.random() * 1.2, 4 - Math.random() * (LEN - 8));
    c.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.25;
    c.rotation.y = (Math.random() - 0.5) * 0.6;
  }

  // lanterns + red lights
  const lanterns = [];
  const lMats = [0, 1, 2, 3].map((i) => {
    const t = tex(lantern(i + 1, i === 3));
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.7 });
  });
  const lGeo = new THREE.SphereGeometry(0.26, 20, 14);
  const capGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12);
  const capMat = std(0x0a0a0a);
  let n = 0;
  for (let z = 3; z > -LEN + 8; z -= 1.8) {
    for (const sx of [-1, 1]) {
      if ((n++ + (sx > 0 ? 1 : 0)) % 2) continue;
      const g = new THREE.Group();
      const body = new THREE.Mesh(lGeo, lMats[n % 4]);
      body.scale.set(1, 1.3, 1);
      g.add(body);
      const c1 = new THREE.Mesh(capGeo, capMat); c1.position.y = 0.34; g.add(c1);
      const c2 = new THREE.Mesh(capGeo, capMat); c2.position.y = -0.34; g.add(c2);
      g.position.set(sx * (W - 0.55), 2.55 + Math.random() * 0.35, z);
      scene.add(g);
      lanterns.push({ g, ph: Math.random() * 6.28 });
    }
  }
  const lights = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight(i % 3 === 2 ? 0xffb070 : 0xff2a12, 16, 8, 2);
    l.position.set((i % 2 ? 1 : -1) * 1.1, 2.4, 3 - i * 4.4);
    scene.add(l);
    lights.push(l);
  }

  // embers
  const EN = 260;
  const eg = new THREE.BufferGeometry();
  const ep = new Float32Array(EN * 3);
  for (let i = 0; i < EN; i++) { ep[i * 3] = (Math.random() - 0.5) * W * 2; ep[i * 3 + 1] = Math.random() * 5; ep[i * 3 + 2] = 5 - Math.random() * 24; }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({
    map: tex(glow('rgba(255,200,140,1)')), color: 0xff7a3a, size: 0.07, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(embers);

  function resize(a) { camera.aspect = a; camera.updateProjectionMatrix(); }

  /** drift: 0..1 slow walk into the alley */
  function update(t, dt, { drift, pointer }) {
    const px = pointer.nx || 0, py = pointer.ny || 0;
    const z = 6.2 - drift * 2.2;
    camera.position.set(px * 0.25 + Math.sin(t * 0.35) * 0.04, 1.45 - py * 0.12 + Math.sin(t * 0.5) * 0.02, z);
    camera.lookAt(px * 0.6, 1.75 - py * 0.3, z - 8);
    lanterns.forEach((l) => { l.g.rotation.z = Math.sin(t * 0.9 + l.ph) * 0.05; });
    lights.forEach((l, i) => { l.intensity = 16 * (0.85 + 0.15 * Math.sin(t * (5 + i) + i)); });
    const p = embers.geometry.attributes.position;
    for (let i = 0; i < EN; i++) {
      let y = p.getY(i) + dt * (0.25 + (i % 5) * 0.08);
      if (y > 5) y = 0;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.05);
    }
    p.needsUpdate = true;
  }

  return { scene, camera, resize, update };
}
