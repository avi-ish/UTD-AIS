import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createWork } from './scenes/work.js';
import { createCorridor } from './scenes/corridor.js';
import { createCity } from './scenes/city.js';
import { createAlley } from './scenes/alley.js';
import { TL, CARD_STEP } from './timeline.js';

// The 3D journey behind the page, driven by scroll:
//   credentials (white floating panels) → about (blue city canyon)
//   → experience (machine hall) → let's connect (red alley)

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
  work:  { bg: [0.88, 0.88, 0.87], barrel: 0.12, chroma: 0.035, band: 0.0, grain: 0.022, vig: 0.1, tint: [1, 1, 1], burst: 0.0, tone: 0, exposure: 1, bloom: 0 },
  city:  { bg: [0, 0, 0], barrel: 0.08, chroma: 0.04, band: 0.12, grain: 0.02, vig: 0.5, tint: [0.96, 1, 1.04], burst: 0.0, tone: 1, exposure: 1.0, bloom: 0.22 },
  hall:  { bg: [0, 0, 0], barrel: 0.07, chroma: 0.05, band: 0.3, grain: 0.02, vig: 0.6, tint: [1, 1, 1], burst: 0.1, tone: 1, exposure: 1.0, bloom: 0.32 },
  alley: { bg: [0, 0, 0], barrel: 0.06, chroma: 0.05, band: 0.08, grain: 0.022, vig: 0.7, tint: [1, 1, 1], burst: 0.0, tone: 1, exposure: 1.0, bloom: 0.4 },
};
function mixPreset(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], t)) : lerp(a[k], b[k], t);
  return o;
}

export function createWorld(canvas, { heroCanvas, cards }) {
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
  const rtPortal = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 2 });

  const work = createWork({ heroCanvas, cards, portalTexture: rtPortal.texture, anisotropy });
  const city = createCity();
  const hall = createCorridor();
  const alley = createAlley({ anisotropy });

  const post = new THREE.ShaderMaterial({
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tA: { value: rtA.texture }, tB: { value: rtB.texture }, tC: { value: rtB.texture },
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
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.32, 1.05);

  // image-based lighting for the machine hall (CC0 HDRI, Poly Haven)
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load('assets/env/warehouse_1k.hdr', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    hall.setEnvironment(pmrem.fromEquirectangular(tex).texture);
    tex.dispose();
  });

  function resize() {
    const cssW = innerWidth, cssH = innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(cssW, cssH, false);
    const w = Math.max(4, Math.round(cssW * pr)), h = Math.max(4, Math.round(cssH * pr));
    rtA.setSize(w, h); rtB.setSize(w, h);
    bloom.setSize(Math.round(w / 2), Math.round(h / 2));
    const a = cssW / cssH;
    rtPortal.setSize(Math.round(Math.min(1280, w * 0.6)), Math.round(Math.min(1280, w * 0.6) / a));
    [work, city, hall, alley].forEach((s) => s.resize(a));
    post.uniforms.uAspect.value = a;
    post.uniforms.uRes.value.set(w, h);
  }
  resize();

  const draw = (target, s) => { renderer.setRenderTarget(target); renderer.render(s.scene, s.camera); };

  let frames = 0, acc = 0, settled = false;
  let burst = 0, nextBurst = 5;

  // shared progress values, so a scene looks the same whether it is the
  // incoming half of a dissolve or the main scene right after it
  const fallAt = (s) => clamp01((s - TL.growEnd) / (TL.fallEnd - TL.growEnd));
  const travelAt = (s) => clamp01((s - TL.mixStart) / (TL.hallEnd - TL.mixStart));
  const driftAt = (s) => clamp01((s - TL.mix2Start) / (TL.end - TL.mix2Start));

  /** st: { s, vel, pointer:{nx,ny,hx,hy,inside}, reduceMotion } */
  function frame(t, dt, st) {
    const s = st.s, P = st.pointer;
    let preset, mixAB = 0;

    if (!settled) {
      acc += dt; frames++;
      if (frames >= 120) {
        if (acc / frames > 0.024 && pr > 0.75) { pr = Math.max(0.75, pr - 0.5); resize(); } else settled = true;
        frames = 0; acc = 0;
      }
    }

    if (s < TL.growEnd) {
      const r = Math.min(s / CARD_STEP, work.count - 1);
      const grow = clamp01((s - TL.ringEnd) / (TL.growEnd - TL.ringEnd));
      if (s > TL.ringEnd - 2.2) { city.update(t, dt, { fall: 0, pointer: P }); draw(rtPortal, city); }
      preset = mixPreset(PRESETS.work, PRESETS.city, clamp01((grow - 0.55) / 0.45));
      preset.barrel = lerp(PRESETS.work.barrel * clamp01(s / 0.3), PRESETS.city.barrel, clamp01(grow * 1.4));
      work.update(t, dt, { r, grow, pointer: P, barrel: preset.barrel });
      draw(rtA, work);
    } else if (s < TL.mixEnd) {
      city.update(t, dt, { fall: fallAt(s), pointer: P });
      draw(rtA, city);
      preset = PRESETS.city;
      if (s > TL.mixStart) {
        mixAB = clamp01((s - TL.mixStart) / (TL.mixEnd - TL.mixStart));
        hall.update(t, dt, { travel: travelAt(s), pointer: P });
        draw(rtB, hall);
        preset = mixPreset(PRESETS.city, PRESETS.hall, mixAB);
      }
    } else if (s < TL.mix2End) {
      hall.update(t, dt, { travel: travelAt(s), pointer: P });
      draw(rtA, hall);
      preset = PRESETS.hall;
      if (s > TL.mix2Start) {
        mixAB = clamp01((s - TL.mix2Start) / (TL.mix2End - TL.mix2Start));
        alley.update(t, dt, { drift: driftAt(s), pointer: P });
        draw(rtB, alley);
        preset = mixPreset(PRESETS.hall, PRESETS.alley, mixAB);
      }
    } else {
      alley.update(t, dt, { drift: driftAt(s), pointer: P });
      draw(rtA, alley);
      preset = PRESETS.alley;
    }

    if (preset.bloom > 0.01) {
      bloom.strength = preset.bloom;
      bloom.render(renderer, null, rtA, dt, false);
    }

    if (t > nextBurst) { burst = 0.12 + Math.random() * 0.12; nextBurst = t + 5 + Math.random() * 7; }
    burst = Math.max(0, burst - dt);
    const vGlitch = Math.min(0.45, Math.max(0, Math.abs(st.vel) - 0.4) * 0.08);

    const u = post.uniforms;
    u.uMixAB.value = mixAB; u.uMixC.value = 0;
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

  return { frame, resize, get hoveredCard() { return work.hoveredCard; } };
}
