import * as THREE from 'three';
import { lantern, glow } from '../art.js';

// Contact: a real night-street photograph (a crop of a CC0 Poly Haven
// panorama) graded red, with paper lanterns hanging in 3D in front of it,
// drifting embers and a slow walk forward.

// The crop covers longitude -80°..80° and latitude -45°..60° around the view
// straight down the lane (-Z).
const BG_VERT = /* glsl */`
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const BG_FRAG = /* glsl */`
uniform sampler2D uMap;
uniform float uTime;
uniform float uFlicker;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float lon = degrees(atan(d.x, -d.z));
  float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
  vec2 uv = vec2((lon + 80.0) / 160.0, 1.0 - (60.0 - lat) / 105.0);
  vec3 c = texture2D(uMap, clamp(uv, 0.001, 0.999)).rgb;
  float edge = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x) * smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
  // red grade: shadows go oxblood, lights go hot orange-white
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 red = vec3(1.0, 0.085, 0.04) * pow(l, 1.3) * 1.25;
  vec3 hot = vec3(1.0, 0.42, 0.22) * pow(l, 3.6) * 2.2;
  vec3 col = mix(c * 0.1, red, 0.93) + hot;
  // darker toward the top and the near ground, like a lane lit from the shopfronts
  col *= 0.4 * uFlicker * (0.55 + 0.45 * smoothstep(-40.0, 5.0, lat)) * (1.0 - 0.35 * smoothstep(20.0, 55.0, lat));
  gl_FragColor = vec4(col * edge, 1.0);
}`;

export function createAlley({ anisotropy }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050000);
  scene.fog = new THREE.FogExp2(0x120201, 0.045);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 120);
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = anisotropy; return t; };

  // photo backdrop on a big sphere that follows the camera
  const photo = new THREE.TextureLoader().load('assets/env/alley.jpg');
  photo.colorSpace = THREE.SRGBColorSpace;
  photo.anisotropy = anisotropy;
  const bgMat = new THREE.ShaderMaterial({
    vertexShader: BG_VERT, fragmentShader: BG_FRAG,
    uniforms: { uMap: { value: photo }, uTime: { value: 0 }, uFlicker: { value: 1 } },
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), bgMat);
  sky.renderOrder = -1;
  scene.add(sky);

  // lanterns strung down both sides of the lane
  scene.add(new THREE.HemisphereLight(0xff5a3a, 0x080000, 0.4));
  const lMats = [0, 1, 2, 3].map((i) => {
    const t = tex(lantern(i + 1, i === 3));
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: i === 3 ? 1.2 : 1.7, roughness: 0.8 });
  });
  const lGeo = new THREE.SphereGeometry(0.24, 32, 20);
  const capGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 20);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 });
  const cordMat = new THREE.MeshBasicMaterial({ color: 0x050101 });
  const haloTex = tex(glow('rgba(255,90,40,0.9)'));
  const lanterns = [];
  let n = 0;
  for (let z = -1.5; z > -26; z -= 2.1) {
    for (const sx of [-1, 1]) {
      if ((n++ + (sx > 0 ? 1 : 0)) % 2 && z < -6) continue;
      const g = new THREE.Group();
      const body = new THREE.Mesh(lGeo, lMats[n % 4]);
      body.scale.set(1, 1.3, 1);
      g.add(body);
      const c1 = new THREE.Mesh(capGeo, capMat); c1.position.y = 0.32; g.add(c1);
      const c2 = new THREE.Mesh(capGeo, capMat); c2.position.y = -0.32; g.add(c2);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 3, 4), cordMat); cord.position.y = 1.8; g.add(cord);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: n % 4 === 3 ? 0xffc48a : 0xff4a22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }));
      halo.scale.setScalar(1.6);
      g.add(halo);
      g.position.set(sx * (1.35 + Math.random() * 0.35), 2.35 + Math.random() * 0.45, z);
      scene.add(g);
      lanterns.push({ g, ph: Math.random() * 6.28 });
    }
  }
  const lights = [];
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight(i % 2 ? 0xff3a18 : 0xff7a3a, 8, 7, 2);
    l.position.set((i % 2 ? 1 : -1) * 1.3, 2.4, -2 - i * 5);
    scene.add(l);
    lights.push(l);
  }

  // embers
  const EN = 220;
  const eg = new THREE.BufferGeometry();
  const ep = new Float32Array(EN * 3);
  for (let i = 0; i < EN; i++) { ep[i * 3] = (Math.random() - 0.5) * 4; ep[i * 3 + 1] = Math.random() * 4; ep[i * 3 + 2] = 1 - Math.random() * 16; }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({
    map: tex(glow('rgba(255,200,140,1)')), color: new THREE.Color(1.8, 0.7, 0.3), size: 0.05, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(embers);

  function resize(a) { camera.aspect = a; camera.updateProjectionMatrix(); }

  /** drift: 0..1 slow walk into the alley */
  function update(t, dt, { drift, pointer }) {
    const px = pointer.nx || 0, py = pointer.ny || 0;
    const z = 2.2 - drift * 2.4;
    camera.position.set(px * 0.12 + Math.sin(t * 0.35) * 0.03, 1.55 - py * 0.06 + Math.sin(t * 0.5) * 0.015, z);
    camera.lookAt(camera.position.x + px * 0.9, 1.62 - py * 0.4, z - 8);
    sky.position.copy(camera.position);
    bgMat.uniforms.uTime.value = t;
    bgMat.uniforms.uFlicker.value = 0.96 + 0.04 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
    lanterns.forEach((l) => { l.g.rotation.z = Math.sin(t * 0.9 + l.ph) * 0.04; });
    lights.forEach((l, i) => { l.intensity = 8 * (0.88 + 0.12 * Math.sin(t * (5 + i) + i)); });
    const p = embers.geometry.attributes.position;
    for (let i = 0; i < EN; i++) {
      let y = p.getY(i) + dt * (0.2 + (i % 5) * 0.07);
      if (y > 4) y = 0;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.04);
    }
    p.needsUpdate = true;
  }

  return { scene, camera, resize, update };
}
