import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createWork } from './scenes/work.js';
import { createCorridor } from './scenes/corridor.js';
import { createCity } from './scenes/city.js';
import { createAlley } from './scenes/alley.js';
import { createDetail } from './scenes/detail.js';

// Scroll timeline, in viewport heights scrolled.
export const TL = {
  workEnd: 5.0,        // ring reaches the last (portal) card
  growEnd: 5.6,        // portal card fills the screen -> machine hall
  hallEnd: 8.0,
  mixStart: 7.6,       // hall dissolves into the city
  mixEnd: 8.0,
  fallEnd: 9.6,        // reached the street
  diveEnd: 10.2,       // red window fills the screen -> alley
  end: 11.2,
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;

const POST_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = /* glsl */`
uniform sampler2D tA;
uniform sampler2D tB;
uniform sampler2D tC;
uniform float uMixAB;
uniform float uMixC;
uniform float uBarrel;
uniform float uChroma;
uniform float uTime;
uniform float uGlitch;
uniform float uBandY;
uniform float uBandAmp;
uniform float uGrain;
uniform float uVig;
uniform float uAspect;
uniform vec3 uBg;
uniform vec3 uTint;
uniform vec2 uRes;
uniform float uTone;      // 0 = leave colours as they are (white page), 1 = filmic tone curve
uniform float uExposure;
varying vec2 vUv;

vec3 aces(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

// blocky glitch reveal: big blocks first, then finer ones
float reveal(vec2 uv, float p, float seed){
  if (p <= 0.0) return 0.0;
  if (p >= 1.0) return 1.0;
  float n = h21(floor(uv * vec2(7.0, 4.0)) + seed) * 0.5
          + h21(floor(uv * vec2(28.0, 16.0)) + seed) * 0.3
          + h21(floor(uv * vec2(110.0, 62.0)) + seed) * 0.2;
  float tear = h21(vec2(floor(uv.y * 90.0), floor(uTime * 24.0)));
  n = mix(n, tear, 0.25);
  return step(n, p);
}

vec3 frame(vec2 uv){
  vec3 c = texture2D(tA, uv).rgb;
  if (uMixAB > 0.0) c = mix(c, texture2D(tB, uv).rgb, reveal(uv, uMixAB, 1.7));
  if (uMixC > 0.0) c = mix(c, texture2D(tC, uv).rgb, reveal(uv, uMixC, 5.3));
  return c;
}

float chan(vec2 uv, float k, int ch){
  vec2 d = uv - 0.5; d.x *= uAspect;
  float r2 = dot(d, d);
  d *= 1.0 + k * r2;
  d.x /= uAspect;
  vec2 u = d + 0.5;
  if (u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0) return uBg[ch];
  return frame(u)[ch];
}

void main(){
  vec2 uv = vUv;
  float y = 1.0 - uv.y;

  // row tearing: velocity / bursts everywhere, plus the drifting band
  float rowH = 2.0 / uRes.y;
  float row = floor(y / rowH);
  float tf = floor(uTime * 22.0);
  float band = smoothstep(0.06, 0.025, abs(y - uBandY)) * uBandAmp;
  float off = (h21(vec2(row, tf)) - 0.5) * 0.02 * band;
  float gRow = floor(y * 40.0);
  float g = step(1.0 - 0.45 * uGlitch, h21(vec2(gRow, floor(uTime * 30.0))));
  off += g * (h21(vec2(gRow, tf + 3.0)) - 0.5) * 0.12 * uGlitch;
  float trans = max(uMixAB * (1.0 - uMixAB), uMixC * (1.0 - uMixC)) * 4.0;
  off += (h21(vec2(floor(y * 70.0), tf + 9.0)) - 0.5) * 0.08 * trans;
  uv.x += off;

  float k = uBarrel;
  float ca = uChroma + trans * 0.12 + uGlitch * 0.06;
  vec3 col = vec3(chan(uv, k * (1.0 - ca), 0), chan(uv, k, 1), chan(uv, k * (1.0 + ca), 2));
  // band streaks
  float seg = floor((uv.x * uRes.x + h21(vec2(row, 2.0)) * 900.0) / (20.0 + 80.0 * h21(vec2(row, 5.0))));
  col += step(0.93, h21(vec2(seg, row + tf * 0.37))) * band * 0.12;

  col *= uTint;
  col = mix(col, aces(col * uExposure), uTone);
  col *= 1.0 - uVig * dot(vUv - 0.5, vUv - 0.5);
  col = clamp(col, 0.0, 1.0);
  // linear -> sRGB, then film grain in display space so it stays even in the darks
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  col += (h21(vUv * uRes + fract(uTime * 7.0) * 100.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

// look of each section; bloom is applied to the scene before this post pass
const PRESETS = {
  work:   { bg: [0.88, 0.88, 0.87], barrel: 0.12, chroma: 0.035, band: 0.0, grain: 0.022, vig: 0.1, tint: [1, 1, 1], burst: 0.0, tone: 0, exposure: 1, bloom: 0 },
  hall:   { bg: [0, 0, 0], barrel: 0.07, chroma: 0.05, band: 0.35, grain: 0.02, vig: 0.6, tint: [1, 1, 1], burst: 0.12, tone: 1, exposure: 1.0, bloom: 0.32 },
  city:   { bg: [0, 0, 0], barrel: 0.08, chroma: 0.04, band: 0.12, grain: 0.02, vig: 0.5, tint: [0.96, 1, 1.04], burst: 0.0, tone: 1, exposure: 1.0, bloom: 0.22 },
  alley:  { bg: [0, 0, 0], barrel: 0.06, chroma: 0.05, band: 0.08, grain: 0.022, vig: 0.7, tint: [1, 1, 1], burst: 0.0, tone: 1, exposure: 1.0, bloom: 0.4 },
  detail: { bg: [0, 0, 0], barrel: 0.08, chroma: 0.03, band: 0.0, grain: 0.018, vig: 0.45, tint: [1, 1, 1], burst: 0.0, tone: 1, exposure: 1.0, bloom: 0.15 },
};
function mixPreset(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], t)) : lerp(a[k], b[k], t);
  return o;
}

export function createWorld(canvas, { heroCanvas, projects }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    console.error(err);
    return null;
  }
  renderer.setClearColor(0x000000, 1);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const rtOpts = { type: THREE.HalfFloatType, samples: 4 };
  const rtA = new THREE.WebGLRenderTarget(4, 4, rtOpts);
  const rtB = new THREE.WebGLRenderTarget(4, 4, rtOpts);
  const rtC = new THREE.WebGLRenderTarget(4, 4, rtOpts);
  const rtPortal = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 2 });

  const work = createWork({ heroCanvas, projects, portalTexture: rtPortal.texture, anisotropy });
  const hall = createCorridor();
  const city = createCity({ portalTexture: rtPortal.texture });
  const alley = createAlley({ anisotropy });
  const detail = createDetail({ projects, anisotropy });

  const post = new THREE.ShaderMaterial({
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tA: { value: rtA.texture }, tB: { value: rtB.texture }, tC: { value: rtC.texture },
      uMixAB: { value: 0 }, uMixC: { value: 0 }, uBarrel: { value: 0 }, uChroma: { value: 0 },
      uTime: { value: 0 }, uGlitch: { value: 0 }, uBandY: { value: 0.3 }, uBandAmp: { value: 0 },
      uGrain: { value: 0.05 }, uVig: { value: 0 }, uAspect: { value: 1 },
      uBg: { value: new THREE.Vector3() }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uRes: { value: new THREE.Vector2(1, 1) },
      uTone: { value: 0 }, uExposure: { value: 1 },
    },
  });
  const postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let pr = Math.min(window.devicePixelRatio || 1, 2);

  // bloom, applied in place to the main scene target
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.32, 1.05);

  // image-based lighting: real HDR environments (CC0, Poly Haven)
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load('assets/env/warehouse_1k.hdr', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    hall.setEnvironment(pmrem.fromEquirectangular(tex).texture);
    tex.dispose();
  });
  const texLoader = new THREE.TextureLoader();
  const equirect = (url, cb) => texLoader.load(url, (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    cb(tex, pmrem.fromEquirectangular(tex).texture);
  });
  equirect('assets/env/studio.jpg', (bg, env) => detail.setBackdrop('studio', bg, env));
  equirect('assets/env/softstudio.jpg', (bg, env) => detail.setBackdrop('fog', bg, env));
  let cssW = 1, cssH = 1;

  function resize() {
    cssW = innerWidth; cssH = innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(cssW, cssH, false);
    const w = Math.max(4, Math.round(cssW * pr)), h = Math.max(4, Math.round(cssH * pr));
    rtA.setSize(w, h); rtB.setSize(w, h); rtC.setSize(w, h);
    bloom.setSize(Math.round(w / 2), Math.round(h / 2));
    const a = cssW / cssH;
    rtPortal.setSize(Math.round(Math.min(1280, w * 0.6)), Math.round(Math.min(1280, w * 0.6) / a));
    [work, hall, city, alley, detail].forEach((s) => s.resize(a));
    post.uniforms.uAspect.value = a;
    post.uniforms.uRes.value.set(w, h);
  }
  resize();

  const draw = (target, s) => { renderer.setRenderTarget(target); renderer.render(s.scene, s.camera); };

  let frames = 0, acc = 0, settled = false;
  let burst = 0, nextBurst = 4;

  /**
   * st: { s, vel, pointer:{nx,ny,inside}, detail:{amt} }
   */
  function frame(t, dt, st) {
    const s = st.s, P = st.pointer;
    let preset, mixAB = 0, mixC = 0;
    let A = rtA, B = rtB;

    // adaptive resolution
    if (!settled) {
      acc += dt; frames++;
      if (frames >= 120) {
        if (acc / frames > 0.024 && pr > 0.75) { pr = Math.max(0.75, pr - 0.5); resize(); } else settled = true;
        frames = 0; acc = 0;
      }
    }

    const sectionVisible = st.detail.amt < 1;
    if (sectionVisible) {
      if (s < TL.growEnd) {
        const r = Math.min(s, TL.workEnd);
        const grow = clamp01((s - TL.workEnd) / (TL.growEnd - TL.workEnd));
        if (s > 3.4) { hall.update(t, dt, { travel: 0, pointer: P }); draw(rtPortal, hall); }
        preset = mixPreset(PRESETS.work, PRESETS.hall, clamp01((grow - 0.55) / 0.45));
        preset.barrel = lerp(PRESETS.work.barrel * clamp01(s / 0.45), PRESETS.hall.barrel, clamp01(grow * 1.4));
        preset.band *= clamp01(s / 0.5);
        work.update(t, dt, { r, grow, pointer: P, barrel: preset.barrel });
        draw(A, work);
      } else if (s < TL.mixEnd) {
        const travel = clamp01((s - TL.growEnd) / (TL.hallEnd - TL.growEnd));
        hall.update(t, dt, { travel, pointer: P });
        draw(A, hall);
        preset = PRESETS.hall;
        if (s > TL.mixStart) {
          mixAB = clamp01((s - TL.mixStart) / (TL.mixEnd - TL.mixStart));
          city.update(t, dt, { fall: 0, dive: 0, pointer: P });
          draw(B, city);
          preset = mixPreset(PRESETS.hall, PRESETS.city, mixAB);
        }
      } else if (s < TL.diveEnd) {
        const fall = clamp01((s - TL.mixStart) / (TL.fallEnd - TL.mixStart));
        const dive = clamp01((s - TL.fallEnd) / (TL.diveEnd - TL.fallEnd));
        alley.update(t, dt, { drift: 0, pointer: P });
        draw(rtPortal, alley);
        city.update(t, dt, { fall, dive, pointer: P });
        draw(A, city);
        preset = mixPreset(PRESETS.city, PRESETS.alley, dive);
      } else {
        const drift = clamp01((s - TL.diveEnd) / (TL.end - TL.diveEnd));
        alley.update(t, dt, { drift, pointer: P });
        draw(A, alley);
        preset = PRESETS.alley;
      }
    }

    if (st.detail.amt > 0) {
      detail.update(t, dt, { pointer: P });
      if (sectionVisible) {
        draw(rtC, detail);
        mixC = st.detail.amt;
        preset = mixPreset(preset, PRESETS.detail, st.detail.amt);
      } else {
        draw(A, detail);
        preset = PRESETS.detail;
      }
    }

    // bloom on the main target
    if (preset.bloom > 0.01) {
      bloom.strength = preset.bloom;
      bloom.render(renderer, null, A, dt, false);
    }

    // rare glitch bursts, and some tearing while scrolling fast
    if (t > nextBurst) { burst = 0.12 + Math.random() * 0.12; nextBurst = t + 5 + Math.random() * 7; }
    burst = Math.max(0, burst - dt);
    const vGlitch = Math.min(0.45, Math.max(0, Math.abs(st.vel) - 0.4) * 0.08);

    const u = post.uniforms;
    u.tA.value = A.texture; u.tB.value = B.texture; u.tC.value = rtC.texture;
    u.uMixAB.value = mixAB; u.uMixC.value = mixC;
    u.uBarrel.value = preset.barrel;
    u.uChroma.value = preset.chroma;
    u.uTime.value = t;
    u.uGlitch.value = Math.max(vGlitch, burst > 0 ? preset.burst : 0) * (st.reduceMotion ? 0 : 1);
    u.uBandY.value = 0.32 + 0.22 * Math.sin(t * 0.11) + 0.04 * Math.sin(t * 0.7);
    u.uBandAmp.value = preset.band * (st.reduceMotion ? 0.3 : 1);
    u.uGrain.value = preset.grain;
    u.uVig.value = preset.vig;
    u.uBg.value.set(...preset.bg);
    u.uTint.value.set(...preset.tint);
    u.uTone.value = preset.tone;
    u.uExposure.value = preset.exposure;

    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  return {
    frame,
    resize,
    detail,
    get hoveredProject() { return work.hoveredProject; },
  };
}
