import * as THREE from 'three';

// About: a long machine hall. A track runs down the middle, circuit boards sit
// on posts either side, glowing cable runs line the edges, and rows of white
// robot arms lean in from both walls. Everything is instanced.

const LEN = 140;

export function createCorridor() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  scene.fog = new THREE.Fog(0x020203, 5, 36);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 80);

  scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x050505, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(0.4, 6, 3);
  scene.add(key);
  scene.add(key.target);
  const near = new THREE.PointLight(0xdfe8ff, 14, 9, 2);
  scene.add(near);

  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });
  const glowMat = (color) => new THREE.MeshBasicMaterial({ color });

  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); scene.add(m); return m; };
  const instanced = (geo, mat, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    list.forEach((it, i) => {
      p.set(it[0], it[1], it[2]);
      e.set(it[3] || 0, it[4] || 0, it[5] || 0);
      q.setFromEuler(e);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    return im;
  };

  // floor, bed, rails
  const floor = add(new THREE.PlaneGeometry(16, LEN), std(0x08090b, { roughness: 0.85 }), 0, 0, -LEN / 2 + 8);
  floor.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(1.5, 0.08, LEN), std(0x111317), 0, 0.04, -LEN / 2 + 8);
  const railMat = std(0xc4c8ce, { metalness: 0.85, roughness: 0.3 });
  for (const x of [-0.45, -0.12, 0.12, 0.45]) add(new THREE.BoxGeometry(0.055, 0.06, LEN), railMat, x, 0.11, -LEN / 2 + 8);

  // chips along the track
  const chips = [];
  for (let z = 8; z > -LEN + 8; z -= 0.55) { chips.push([-0.285, 0.1, z]); chips.push([0.285, 0.1, z]); }
  instanced(new THREE.BoxGeometry(0.2, 0.035, 0.15), std(0x1f7a45, { emissive: 0x0a3a1c, roughness: 0.4 }), chips);

  // side lanes: posts with circuit boards, white-capped pins, black actuators
  const posts = [], boards = [], boardChips = [], pins = [], caps = [], acts = [];
  for (let z = 6; z > -LEN + 8; z -= 2.0) {
    for (const sx of [-1, 1]) {
      posts.push([sx * 1.3, 0.27, z]);
      const ry = (Math.random() - 0.5) * 0.4;
      boards.push([sx * 1.3, 0.56, z, 0, ry, 0]);
      boardChips.push([sx * 1.3 - 0.08, 0.6, z + 0.03, 0, ry, 0]);
      boardChips.push([sx * 1.3 + 0.1, 0.6, z - 0.05, 0, ry, 0]);
    }
  }
  for (let z = 7; z > -LEN + 8; z -= 1.0) {
    for (const sx of [-1, 1]) {
      pins.push([sx * 0.8, 0.16, z + 0.3]);
      caps.push([sx * 0.8, 0.33, z + 0.3]);
      acts.push([sx * (1.85 + (Math.random() - 0.5) * 0.15), 0.25, z]);
    }
  }
  instanced(new THREE.CylinderGeometry(0.11, 0.14, 0.54, 10), std(0x15171b), posts);
  instanced(new THREE.BoxGeometry(0.52, 0.04, 0.36), std(0x2fae5a, { emissive: 0x0c3a1b, roughness: 0.5 }), boards);
  instanced(new THREE.BoxGeometry(0.12, 0.04, 0.1), std(0x0b0b0b, { roughness: 0.4 }), boardChips);
  instanced(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), std(0x1a1c20), pins);
  instanced(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 14), std(0xe8e8e8, { roughness: 0.35 }), caps);
  instanced(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 12), std(0x0c0d10, { roughness: 0.3, metalness: 0.4 }), acts);

  // slanted platforms and glowing cable runs
  for (const sx of [-1, 1]) {
    const plat = add(new THREE.BoxGeometry(1.4, 0.25, LEN), std(0x0d0f12, { roughness: 0.5 }), sx * 2.75, 0.18, -LEN / 2 + 8);
    plat.rotation.z = sx * 0.22;
    const cols = [0xd8251a, 0xff6a1a, 0xffc93a, 0xb81d14, 0xff9a3a];
    cols.forEach((c, i) => {
      const run = add(new THREE.BoxGeometry(0.014, 0.014, LEN), glowMat(c), sx * (2.2 + i * 0.085 + (i > 2 ? 0.12 : 0)), 0.33 + i * 0.022, -LEN / 2 + 8);
      run.rotation.z = sx * 0.22;
    });
  }

  // ceiling vault
  const vault = add(new THREE.CylinderGeometry(6.5, 6.5, LEN, 40, 1, true, -Math.PI / 2, Math.PI), std(0x040405, { side: THREE.BackSide, roughness: 1 }), 0, 0, -LEN / 2 + 8);
  vault.rotation.x = Math.PI / 2;

  /* ---- robot arms ---- */
  const white = std(0xd9dde3, { roughness: 0.55 });
  const dark = std(0x16181c, { roughness: 0.4, metalness: 0.3 });
  const PARTS = [
    { geo: new THREE.CylinderGeometry(0.34, 0.4, 0.24, 24), mat: dark },     // 0 base plate
    { geo: new THREE.CylinderGeometry(0.25, 0.28, 0.42, 24), mat: white },   // 1 turret
    { geo: new THREE.CylinderGeometry(0.21, 0.21, 0.44, 24), mat: white },   // 2 shoulder (horizontal)
    { geo: new THREE.CapsuleGeometry(0.16, 1.05, 6, 16), mat: white },       // 3 upper arm
    { geo: new THREE.CylinderGeometry(0.17, 0.17, 0.38, 24), mat: white },   // 4 elbow (horizontal)
    { geo: new THREE.CapsuleGeometry(0.12, 0.8, 6, 14), mat: white },        // 5 forearm
    { geo: new THREE.CylinderGeometry(0.1, 0.1, 0.24, 18), mat: white },     // 6 wrist
    { geo: new THREE.BoxGeometry(0.15, 0.24, 0.15), mat: dark },             // 7 tool
    { geo: new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6), mat: glowMat(0xff3524) }, // 8 cable red
    { geo: new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6), mat: glowMat(0x3f7dff) }, // 9 cable blue
    { geo: new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6), mat: glowMat(0xffd23f) }, // 10 cable yellow
  ];
  const arms = [];
  for (let z = 4; z > -LEN + 10; z -= 1.6) {
    for (const sx of [-1, 1]) arms.push({ x: sx * 3.3, z, side: sx, ph: Math.random() * 6.28 });
  }
  const meshes = PARTS.map((p) => {
    const im = new THREE.InstancedMesh(p.geo, p.mat, arms.length);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    scene.add(im);
    return im;
  });

  const M = () => new THREE.Matrix4();
  const mBase = M(), mSh = M(), mEl = M(), mWr = M(), tmp = M(), out = M();
  const T = (x, y, z) => tmp.clone().makeTranslation(x, y, z);
  const RX = (a) => tmp.clone().makeRotationX(a);
  const RY = (a) => tmp.clone().makeRotationY(a);
  const RZ = (a) => tmp.clone().makeRotationZ(a);
  const L1 = 1.05 + 0.32, L2 = 0.8 + 0.24;

  function poseArms(t) {
    arms.forEach((a, i) => {
      if (Math.abs(a.z - camera.position.z) > 40) return;
      const k = t * 0.7 + a.ph;
      const yaw = Math.sin(k * 0.6) * 0.25;
      const sh = -0.55 + Math.sin(k) * 0.12;          // lean toward the track
      const el = -1.95 + Math.sin(k * 1.3 + 1) * 0.18; // bend the forearm down
      mBase.copy(T(a.x, 0.3, a.z)).multiply(RY(a.side < 0 ? 0 : Math.PI));
      meshes[0].setMatrixAt(i, out.copy(mBase).multiply(T(0, 0.12, 0)));
      meshes[1].setMatrixAt(i, out.copy(mBase).multiply(T(0, 0.45, 0)));
      mSh.copy(mBase).multiply(T(0, 0.78, 0)).multiply(RY(yaw));
      meshes[2].setMatrixAt(i, out.copy(mSh).multiply(RX(Math.PI / 2)));
      const up = M().copy(mSh).multiply(RZ(sh));
      meshes[3].setMatrixAt(i, out.copy(up).multiply(T(0, L1 / 2, 0)));
      meshes[8].setMatrixAt(i, out.copy(up).multiply(T(0.13, L1 / 2, 0.1)).multiply(tmp.clone().makeScale(1, L1, 1)));
      meshes[9].setMatrixAt(i, out.copy(up).multiply(T(0.15, L1 / 2, -0.06)).multiply(tmp.clone().makeScale(1, L1, 1)));
      mEl.copy(up).multiply(T(0, L1, 0));
      meshes[4].setMatrixAt(i, out.copy(mEl).multiply(RX(Math.PI / 2)));
      const fo = M().copy(mEl).multiply(RZ(el));
      meshes[5].setMatrixAt(i, out.copy(fo).multiply(T(0, L2 / 2, 0)));
      meshes[10].setMatrixAt(i, out.copy(fo).multiply(T(0.11, L2 / 2, 0.08)).multiply(tmp.clone().makeScale(1, L2, 1)));
      mWr.copy(fo).multiply(T(0, L2, 0));
      meshes[6].setMatrixAt(i, out.copy(mWr));
      meshes[7].setMatrixAt(i, out.copy(mWr).multiply(T(0, 0.22, 0)));
    });
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }

  function resize(a) { camera.aspect = a; camera.updateProjectionMatrix(); }

  /** travel: 0..1 along the hall */
  function update(t, dt, { travel, pointer }) {
    const z = 5 - travel * 52;
    const px = (pointer.nx || 0), py = (pointer.ny || 0);
    camera.position.set(px * 0.18 + Math.sin(t * 0.4) * 0.03, 1.5 - py * 0.08 + Math.sin(t * 0.55) * 0.02, z);
    camera.lookAt(px * 0.5, 0.85 - py * 0.2, z - 6);
    near.position.set(0, 2.6, z - 3);
    key.position.set(0.4, 6, z + 3);
    key.target.position.set(0, 0, z - 6);
    poseArms(t);
  }

  return { scene, camera, resize, update };
}
