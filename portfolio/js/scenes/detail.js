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
      // backdrop + lighting come from a real photo-studio panorama (setBackdrop)
      g.userData = { bg: 0x0d0d0d, fog: null, bgIntensity: 0.38, blur: 0 };
    } else if (kind === 'fog') {
      const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(3, 5, 4); g.add(d);
      const blobMat = new THREE.MeshPhysicalMaterial({ color: 0x121214, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.35 });
      for (let i = 0; i < 9; i++) {
        const geo = new THREE.IcosahedronGeometry(0.8 + Math.random() * 1.6, 12);
        const p = geo.attributes.position, v = new THREE.Vector3();
        const s1 = Math.random() * 5, s2 = Math.random() * 5;
        for (let k = 0; k < p.count; k++) {
          v.fromBufferAttribute(p, k);
          const n = 1 + 0.22 * Math.sin(v.x * 2.1 + s1) * Math.sin(v.y * 1.7 + s2) + 0.05 * Math.sin(v.z * 3.1 + s1);
          v.multiplyScalar(n); p.setXYZ(k, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, blobMat);
        const a = Math.random() * Math.PI * 2;
        m.position.set(Math.cos(a) * (9 + Math.random() * 8), (Math.random() - 0.5) * 7, -Math.abs(Math.sin(a)) * 10 - 6);
        m.userData.spin = (Math.random() - 0.5) * 0.3;
        g.add(m);
      }
      g.userData = { bg: 0xb9bbbe, fog: new THREE.Fog(0xb9bbbe, 10, 34), bgIntensity: 0.85, blur: 0.18 };
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
  const backdrops = {};
  // photo panorama on a sphere around the camera, so it can be aimed (the
  // studio's softboxes sit about 90° to the right of the panorama's centre)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.scale.x = -1;
  dome.renderOrder = -1;
  dome.visible = false;
  scene.add(dome);
  function applyBackdrop() {
    if (!env) return;
    const kind = projects[current].env, b = backdrops[kind];
    dome.visible = false;
    if (b && kind === 'studio') {
      dome.material.map = b.bg;
      dome.material.color.setScalar(env.userData.bgIntensity ?? 1);
      dome.material.needsUpdate = true;
      dome.rotation.y = 0.1;
      dome.visible = true;
      scene.background = new THREE.Color(0x000000);
      scene.environment = b.env;
    } else if (b) {
      scene.background = b.bg;
      scene.backgroundIntensity = env.userData.bgIntensity ?? 1;
      scene.backgroundBlurriness = env.userData.blur ?? 0;
      scene.environment = b.env;
    } else {
      scene.background = new THREE.Color(env.userData.bg);
      scene.environment = null;
    }
  }
  function setBackdrop(kind, bg, envTex) { backdrops[kind] = { bg, env: envTex }; if (current >= 0) applyBackdrop(); }

  function open(i) {
    current = i;
    const p = projects[i];
    Object.values(envs).forEach((e) => { e.visible = false; });
    env = envs[p.env] || buildEnv(p.env);
    env.visible = true;
    scene.fog = env.userData.fog;
    applyBackdrop();
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

  return { scene, camera, open, go, nudge, resize, update, setBackdrop, get index() { return Math.round(target); }, get count() { return screens.length; } };
}
