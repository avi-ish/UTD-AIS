import * as THREE from 'three';
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
varying vec2 vUv;

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
  float ca = uChroma + trans * 0.15 + uGlitch * 0.1;
  vec3 col = vec3(chan(uv, k * (1.0 - ca), 0), chan(uv, k, 1), chan(uv, k * (1.0 + ca), 2));
  // a little colour fringing even where the lens is weak
  float edge = length((vUv - 0.5) * vec2(uAspect, 1.0));
  col.r = mix(col.r, chan(uv + vec2(0.0015 * edge, 0.0), k, 0), 0.6);

  // band streaks
  float seg = floor((uv.x * uRes.x + h21(vec2(row, 2.0)) * 900.0) / (20.0 + 80.0 * h21(vec2(row, 5.0))));
  col += step(0.92, h21(vec2(seg, row + tf * 0.37))) * band * 0.18;

  col *= uTint;
  col *= 1.0 - uVig * dot(vUv - 0.5, vUv - 0.5);
  col = clamp(col, 0.0, 1.0);
  // linear -> sRGB, then film grain in display space so it stays even in the darks
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  col += (h21(vUv * uRes + fract(uTime * 7.0) * 100.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

const PRESETS = {
  work:     { bg: [0.88, 0.88, 0.87], barrel: 0.16, chroma: 0.06, band: 0.12, grain: 0.06, vig: 0.15, tint: [1, 1, 1], burst: 0.45 },
  hall:     { bg: [0, 0, 0], barrel: 0.08, chroma: 0.08, band: 0.55, grain: 0.045, vig: 0.65, tint: [1, 1, 1], burst: 0.5 },
  city:     { bg: [0, 0, 0], barrel: 0.1, chroma: 0.06, band: 0.25, grain: 0.045, vig: 0.55, tint: [0.95, 1, 1.05], burst: 0.4 },
  alley:    { bg: [0, 0, 0], barrel: 0.08, chroma: 0.08, band: 0.18, grain: 0.045, vig: 0.75, tint: [1.06, 0.95, 0.93], burst: 0.35 },
  detail:   { bg: [0, 0, 0], barrel: 0.1, chroma: 0.05, band: 0.1, grain: 0.035, vig: 0.5, tint: [1, 1, 1], burst: 0.12 },
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
    },
  });
  const postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let pr = Math.min(window.devicePixelRatio || 1, 1.5);
  let cssW = 1, cssH = 1;

  function resize() {
    cssW = innerWidth; cssH = innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(cssW, cssH, false);
    const w = Math.max(4, Math.round(cssW * pr)), h = Math.max(4, Math.round(cssH * pr));
    rtA.setSize(w, h); rtB.setSize(w, h); rtC.setSize(w, h);
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
        if (acc / frames > 0.026 && pr > 0.75) { pr -= 0.25; resize(); } else settled = true;
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

    // random glitch bursts, stronger while scrolling fast
    if (t > nextBurst) { burst = 0.18 + Math.random() * 0.2; nextBurst = t + 3 + Math.random() * 5; }
    burst = Math.max(0, burst - dt);
    const vGlitch = Math.min(0.7, Math.abs(st.vel) * 0.12);

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
