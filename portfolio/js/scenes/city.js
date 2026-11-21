import * as THREE from 'three';
import { glow as glowCanvas } from '../art.js';

// Who I work with: falling down a canyon of towers through blue haze. The
// camera looks straight down the street, so the far ground glows like a light
// shaft. At the bottom a red window into the next scene waits on the street.

const VERT = /* glsl */`
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying float vD;
void main(){
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
    im = instanceMatrix;
  #endif
  vec4 wp = modelMatrix * im * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix * im) * normal);
  vC = vec3(1.0);
  #ifdef USE_INSTANCING_COLOR
    vC = instanceColor;
  #endif
  vec4 mv = viewMatrix * wp;
  vD = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform vec3 uFog;
uniform float uDensity;
uniform float uTime;
varying vec3 vW;
varying vec3 vN;
varying vec3 vC;
varying float vD;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec3 n = normalize(vN);
  vec3 col;
  if (abs(n.y) < 0.5) {
    vec2 f = abs(n.x) > 0.5 ? vec2(vW.z, vW.y) : vec2(vW.x, vW.y);
    vec2 cell = vec2(2.3, 3.1);
    vec2 id = floor(f / cell), g = fract(f / cell);
    float win = step(0.16, g.x) * step(g.x, 0.8) * step(0.22, g.y) * step(g.y, 0.82);
    float lit = step(0.86 - vC.b * 0.1, h21(id + vC.g * 37.0));
    float shade = 0.5 + 0.5 * max(dot(n, normalize(vec3(0.4, 0.6, 0.7))), 0.0);
    col = vec3(0.045, 0.085, 0.125) * (0.65 + 0.7 * vC.r) * shade;
    col *= 0.82 + 0.18 * step(0.07, g.y);                         // floor slabs
    col = mix(col, col * 0.45, win);                                // dark glass
    col = mix(col, vec3(0.82, 0.92, 1.0) * 1.6, win * lit);         // lit windows
  } else {
    col = vec3(0.06, 0.1, 0.14) * (0.6 + 0.6 * vC.r);
    if (n.y > 0.5 && vC.b > 0.95) col = vec3(0.025, 0.03, 0.04);   // street
  }
  float fog = 1.0 - exp(-pow(uDensity * vD, 2.0));
  col = mix(col, uFog, clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export function createCity({ portalTexture }) {
  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(0x7fb2d6);
  scene.background = fogColor.clone();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 900);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uFog: { value: fogColor }, uDensity: { value: 0.006 }, uTime: { value: 0 } },
  });

  // towers along both sides of a long street, plus a second row behind
  const boxes = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const STREET = 8;
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      let z = -320;
      while (z < 320) {
        const d = rnd(10, 22), w = rnd(10, 18), h = row === 0 ? rnd(140, 330) : rnd(80, 260);
        const x = side * (STREET + row * 24 + w / 2 + rnd(0, 2.5));
        boxes.push({ x, y: h / 2, z: z + d / 2, w, h, d, c: [rnd(0, 1), rnd(0, 1), rnd(0, 1) * 0.8] });
        z += d + rnd(0.5, 6);
      }
    }
  }
  // balconies and ledges sticking into the street
  for (let i = 0; i < 520; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const w = rnd(1.2, 3.2), h = rnd(0.3, 1.4), d = rnd(2, 7);
    boxes.push({ x: side * (STREET - w / 2 + 0.4), y: rnd(4, 300), z: rnd(-300, 300), w, h, d, c: [rnd(0, 0.4), rnd(0, 1), 0.2] });
  }
  // low kiosks near the plaza at the bottom
  for (let i = 0; i < 40; i++) {
    const w = rnd(2, 5), h = rnd(1.5, 5), d = rnd(2, 5);
    const x = rnd(-STREET + 1, STREET - 1), z = rnd(-60, 60);
    if (Math.abs(x) < 6 && Math.abs(z) < 8) continue;
    boxes.push({ x, y: h / 2, z, w, h, d, c: [rnd(0, 1), rnd(0, 1), 0.5] });
  }
  // the street itself
  boxes.push({ x: 0, y: -0.5, z: 0, w: 200, h: 1, d: 700, c: [0.2, 0.5, 1.0] });

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const im = new THREE.InstancedMesh(geo, mat, boxes.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  boxes.forEach((b, i) => {
    m4.makeScale(b.w, b.h, b.d).setPosition(b.x, b.y, b.z);
    im.setMatrixAt(i, m4);
    im.setColorAt(i, col.setRGB(b.c[0], b.c[1], b.c[2]));
  });
  im.instanceMatrix.needsUpdate = true;
  im.instanceColor.needsUpdate = true;
  im.frustumCulled = false;
  scene.add(im);

  // drifting flecks
  const N = 900;
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rnd(-STREET, STREET); pos[i * 3 + 1] = rnd(0, 340); pos[i * 3 + 2] = rnd(-120, 120);
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flecks = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xdfefff, size: 0.35, transparent: true, opacity: 0.75, fog: false }));
  scene.add(flecks);

  // red window on the street
  const PORTAL_ROT = 0.38;
  const portalMat = new THREE.MeshBasicMaterial({ map: portalTexture, fog: false });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), portalMat);
  portal.rotation.order = 'YXZ';
  portal.rotation.set(-Math.PI / 2, PORTAL_ROT, 0);
  portal.position.set(0, 0.25, 0);
  scene.add(portal);
  const glowTex = new THREE.CanvasTexture(glowCanvas('rgba(255,60,30,1)'));
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
  glow.rotation.copy(portal.rotation);
  glow.position.set(0, 0.2, 0);
  scene.add(glow);

  let aspect = 1;
  const PW = 12;
  function resize(a) {
    aspect = a;
    camera.aspect = a; camera.updateProjectionMatrix();
    portal.scale.set(PW, PW / a, 1);
    glow.scale.set(PW * 2.2, PW / a * 2.6, 1);
  }
  const fillHeight = () => (PW / aspect / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) + 0.25;

  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  /** fall: 0..1 down the canyon, dive: 0..1 into the portal */
  function update(t, dt, { fall, dive, pointer }) {
    mat.uniforms.uTime.value = t;
    const yFall = THREE.MathUtils.lerp(330, 34, ease(fall) * 0.6 + fall * 0.4);
    const y = THREE.MathUtils.lerp(yFall, fillHeight(), ease(dive));
    const roll = THREE.MathUtils.lerp(-0.25 + fall * 0.5, PORTAL_ROT, ease(dive));
    const px = (pointer.nx || 0) * (1 - dive), py = (pointer.ny || 0) * (1 - dive);
    camera.position.set(px * 1.2 + Math.sin(t * 0.3) * 0.4 * (1 - dive), y, py * 1.2);
    camera.up.set(-Math.sin(roll), 0, -Math.cos(roll));
    camera.lookAt(camera.position.x * (1 - dive) * 0.6, 0, camera.position.z * 0.6);
    // denser haze high up, clear at street level
    mat.uniforms.uDensity.value = THREE.MathUtils.lerp(0.0042, 0.012, ease(fall));
    const p = flecks.geometry.attributes.position;
    for (let i = 0; i < N; i++) {
      let yy = p.getY(i) + dt * (4 + (i % 7));
      if (yy > 340) yy = 0;
      p.setY(i, yy);
    }
    p.needsUpdate = true;
    glowMat.opacity = (0.45 + 0.12 * Math.sin(t * 3.0)) * (1 - ease(dive));
  }

  return { scene, camera, resize, update };
}
