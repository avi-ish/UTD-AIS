import * as THREE from 'three';
import { makeScreens, softbox, glow } from '../art.js';

// Project detail: a row of curved screens on an arc around the camera, set in
// an environment chosen per project (space, fog, studio, void).

export function createDetail({ projects, anisotropy }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  const RADIUS = 6.2, GAP = 0.52;

  const screenGeo = (() => {
    const g = new THREE.PlaneGeometry(2.6, 1.625, 32, 12);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -0.05 * x * x); }
    p.needsUpdate = true;
    return g;
  })();

  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = anisotropy; return t; };

  // screens are drawn lazily per project and cached
  const cache = new Map();
  function screensFor(i) {
    if (!cache.has(i)) {
      const canvases = makeScreens(projects[i]);
      cache.set(i, { canvases, textures: canvases.map(tex) });
    }
    return cache.get(i);
  }

  const carousel = new THREE.Group();
  scene.add(carousel);
  let screens = [];

  /* ---- environments ---- */
  const envs = {};
  function buildEnv(kind) {
    const g = new THREE.Group();
    if (kind === 'space') {
      const N = 2600, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 60;
        const s = Math.sqrt(1 - u * u);
        pos.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.add(new THREE.Points(geo, new THREE.PointsMaterial({ map: tex(glow('rgba(255,255,255,1)')), color: 0xffffff, size: 0.55, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      const neb = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ map: tex(glow('rgba(60,30,110,.55)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      neb.position.set(8, -6, -40);
      g.add(neb);
      g.userData = { bg: 0x050507, fog: null };
    } else if (kind === 'studio') {
      g.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.4));
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -1.7;
      g.add(floor);
      // curved backdrop so the rigs read as silhouettes
      const cyc = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 14, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 1, side: THREE.BackSide }));
      cyc.position.set(0, 5, 2);
      g.add(cyc);
      const front = tex(softbox());
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.45, metalness: 0.2 });
      const faceMat = new THREE.MeshBasicMaterial({ map: front });
      const legMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.5, roughness: 0.35 });
      const placements = [[-4.2, -3.2, 0.7], [4.4, -3.6, -0.7], [-6.5, -7, 0.45], [6.8, -7.5, -0.4], [0, -11, 0]];
      placements.forEach(([x, z, ry]) => {
        const rig = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.3), boxMat);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.88), faceMat);
        face.position.z = 0.152;
        const head = new THREE.Group(); head.add(box, face);
        head.position.y = 1.0; head.rotation.x = -0.35;
        rig.add(head);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), legMat);
        pole.position.y = -0.4; rig.add(pole);
        for (let k = 0; k < 3; k++) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.4, 6), legMat);
          const a = (k / 3) * Math.PI * 2;
          leg.position.set(Math.cos(a) * 0.35, -1.15, Math.sin(a) * 0.35);
          leg.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
          rig.add(leg);
        }
        rig.position.set(x, 0, z); rig.rotation.y = ry + (x < 0 ? 0.5 : -0.5);
        g.add(rig);
      });
      const spot = new THREE.PointLight(0xffffff, 30, 20, 2); spot.position.set(0, 3, 2); g.add(spot);
      g.userData = { bg: 0x0d0d0d, fog: new THREE.Fog(0x0d0d0d, 8, 26) };
    } else if (kind === 'fog') {
      g.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.3));
      const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(3, 5, 4); g.add(d);
      const blobMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85, flatShading: false });
      for (let i = 0; i < 9; i++) {
        const geo = new THREE.IcosahedronGeometry(0.8 + Math.random() * 1.6, 5);
        const p = geo.attributes.position, v = new THREE.Vector3();
        const s1 = Math.random() * 5, s2 = Math.random() * 5;
        for (let k = 0; k < p.count; k++) {
          v.fromBufferAttribute(p, k);
          const n = 1 + 0.22 * Math.sin(v.x * 2.1 + s1) * Math.sin(v.y * 1.7 + s2) + 0.08 * Math.sin(v.z * 5.3);
          v.multiplyScalar(n); p.setXYZ(k, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, blobMat);
        const a = Math.random() * Math.PI * 2;
        m.position.set(Math.cos(a) * (9 + Math.random() * 8), (Math.random() - 0.5) * 7, -Math.abs(Math.sin(a)) * 10 - 6);
        m.userData.spin = (Math.random() - 0.5) * 0.3;
        g.add(m);
      }
      g.userData = { bg: 0xb9bbbe, fog: new THREE.Fog(0xb9bbbe, 6, 26) };
    } else {
      // void: a slow iridescent particle swirl
      const N = 5000, pos = new Float32Array(N * 3), colr = new Float32Array(N * 3), c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const t = Math.random() * Math.PI * 2, R = 9 + Math.random() * 4, tube = 1.5 + Math.random() * 1.8, a = Math.random() * Math.PI * 2;
        pos.set([(R + Math.cos(a) * tube) * Math.cos(t), Math.sin(a) * tube * 0.7 + Math.sin(t * 3) * 0.6, (R + Math.cos(a) * tube) * Math.sin(t) - 4], i * 3);
        c.setHSL((0.55 + t / (Math.PI * 2) * 0.35) % 1, 0.85, 0.6);
        colr.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
      g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })));
      g.userData = { bg: 0x040205, fog: null };
    }
    g.visible = false;
    scene.add(g);
    envs[kind] = g;
    return g;
  }

  let current = -1, idx = 0, target = 0, env = null;

  function open(i) {
    current = i;
    const p = projects[i];
    Object.values(envs).forEach((e) => { e.visible = false; });
    env = envs[p.env] || buildEnv(p.env);
    env.visible = true;
    scene.background = new THREE.Color(env.userData.bg);
    scene.fog = env.userData.fog;
    // rebuild the screens for this project
    screens.forEach((s) => carousel.remove(s));
    const { textures } = screensFor(i);
    screens = textures.map((t, k) => {
      const m = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: t, fog: false, transparent: true }));
      m.userData.k = k;
      carousel.add(m);
      return m;
    });
    idx = target = 0;
    return screensFor(i).canvases;
  }

  function go(k) { target = Math.max(0, Math.min(screens.length - 1, k)); }
  function nudge(d) { target = Math.max(0, Math.min(screens.length - 1, target + d)); }

  function resize(a) {
    camera.aspect = a;
    camera.fov = Math.max(40, 2 * Math.atan(1.55 / RADIUS / a) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }

  function update(t, dt, { pointer }) {
    idx += (target - idx) * (1 - Math.exp(-dt * 7));
    screens.forEach((m, k) => {
      const a = (k - idx) * GAP;
      m.position.set(Math.sin(a) * RADIUS, 0.25, -Math.cos(a) * RADIUS);
      m.rotation.set(0, -a, 0);
      const f = Math.max(0, 1 - Math.abs(k - idx) * 0.18);
      m.scale.setScalar(0.85 + 0.15 * f);
      m.material.opacity = Math.min(1, 1.6 - Math.abs(k - idx) * 0.3);
    });
    const px = pointer.nx || 0, py = pointer.ny || 0;
    camera.position.set(px * 0.15, -py * 0.1, 0);
    camera.lookAt(px * 0.4, 0.1 - py * 0.2, -RADIUS);
    if (env) {
      env.rotation.y = t * 0.01;
      env.children.forEach((c) => { if (c.userData.spin) { c.rotation.y += c.userData.spin * dt; c.rotation.x += c.userData.spin * dt * 0.5; } });
    }
  }

  return { scene, camera, open, go, nudge, resize, update, get index() { return Math.round(target); }, get count() { return screens.length; } };
}
