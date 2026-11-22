// The backdrop: real photographs and video instead of live 3D. One WebGL2
// pass draws the section's picture slightly zoomed (and scrubs the video with
// the scroll), grades it, lays the CRT treatment on top, dissolves between
// sections in blocks, and lets the cursor knock the picture into flying
// pixels wherever it moves.

import { TL } from './timeline.js';

const VERT = `#version 300 es
const vec2 V[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
out vec2 vUv;
void main(){ vec2 p = V[gl_VertexID]; vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const TRAIL = `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSize;
uniform vec2 uA, uB;      // pointer segment, in trail pixels
uniform float uRadius, uDecay, uPower, uTime;
out vec4 o;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / uSize;
  vec4 prev = texture(uPrev, uv);
  float t = prev.r * uDecay;
  vec2 pa = gl_FragCoord.xy - uA, ba = uB - uA;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-3), 0.0, 1.0);
  float d = length(pa - ba * h);
  float wob = 0.7 + 0.6 * h21(floor(gl_FragCoord.xy / 3.0) + floor(uTime * 8.0));
  float add = smoothstep(uRadius * wob, uRadius * wob * 0.2, d) * uPower;
  o = vec4(min(1.0, t + add * (1.0 - t)), 0.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D tA, tB, tTrail, tFloor;
uniform vec2 uRes;
uniform vec4 uCoverA, uCoverB;   // uv scale (xy) and offset (zw) for cover fit + zoom
uniform int uModeA, uModeB;      // 0 sheet, 1 picture
uniform vec3 uGradeA, uGradeB;   // shadow tint, per section
uniform vec3 uHiA, uHiB;         // highlight tint, per section
uniform float uLiftA, uLiftB;    // how much of the original colour survives
uniform float uMix;              // block dissolve A -> B
uniform float uTime, uGlitch, uBand, uBandY, uDpr;
uniform vec2 uMouse;             // device px, y up

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

vec3 sheet(vec2 uv){
  vec3 paper = vec3(0.945, 0.943, 0.93);
  // the faint text floor, tipped back in perspective
  float y = 1.0 - uv.y;
  if (y > 0.58) {
    float depth = (y - 0.58) / 0.42;
    vec2 fuv = vec2((uv.x - 0.5) / (0.35 + depth * 0.9) + 0.5, 1.0 / (0.08 + depth * 0.92));
    float g = texture(tFloor, fuv * vec2(2.2, 0.7)).a;
    paper = mix(paper, vec3(0.42, 0.43, 0.46), g * 0.55 * smoothstep(0.0, 0.5, depth));
  }
  return paper;
}

vec3 picture(sampler2D t, vec4 cover, vec2 uv, vec3 grade, vec3 hi, float lift){
  vec3 c = texture(t, uv * cover.xy + cover.zw).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // duotone from the section's night colour into its highlight colour, with contrast
  float k = smoothstep(0.06, 0.95, l);
  vec3 toned = mix(grade, hi, k * k * (3.0 - 2.0 * k)) * (0.35 + 0.85 * l);
  return mix(toned, c * hi, lift);
}

vec3 layer(int mode, sampler2D t, vec4 cover, vec2 uv, vec3 grade, vec3 hi, float lift){
  return mode == 0 ? sheet(uv) : picture(t, cover, uv, grade, hi, lift);
}

float reveal(vec2 uv, float p){
  if (p <= 0.0) return 0.0;
  if (p >= 1.0) return 1.0;
  float n = h21(floor(uv * vec2(7.0, 4.0))) * 0.5 + h21(floor(uv * vec2(28.0, 16.0))) * 0.3 + h21(floor(uv * vec2(110.0, 62.0))) * 0.2;
  return step(n, p);
}

vec3 scene(vec2 uv){
  vec3 a = layer(uModeA, tA, uCoverA, uv, uGradeA, uHiA, uLiftA);
  if (uMix <= 0.0) return a;
  vec3 b = layer(uModeB, tB, uCoverB, uv, uGradeB, uHiB, uLiftB);
  return mix(a, b, reveal(uv, uMix));
}

void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 uv = vUv;

  // tearing rows in the drifting band and during dissolves
  float y = 1.0 - uv.y;
  float row = floor(px.y / (2.0 * uDpr));
  float tf = floor(uTime * 22.0);
  float band = smoothstep(0.06, 0.02, abs(y - uBandY)) * uBand;
  float trans = uMix * (1.0 - uMix) * 4.0;
  uv.x += (h21(vec2(row, tf)) - 0.5) * 0.02 * band;
  uv.x += (h21(vec2(floor(y * 70.0), tf + 9.0)) - 0.5) * 0.06 * trans;
  float gRow = floor(y * 40.0);
  uv.x += step(1.0 - 0.4 * uGlitch, h21(vec2(gRow, floor(uTime * 30.0)))) * (h21(vec2(gRow, tf + 3.0)) - 0.5) * 0.1 * uGlitch;

  // the cursor: where it moved, the picture breaks into blocks that fly outward
  float tr = texture(tTrail, vUv).r;
  vec3 col;
  if (tr > 0.02) {
    float B = mix(5.0, 16.0, h21(floor(px / 24.0))) * uDpr;
    vec2 cell = floor(px / B);
    vec2 cc = (cell + 0.5) * B;
    vec2 dir = normalize(cc - uMouse + vec2(0.001));
    float r = h21(cell);
    vec2 fly = (dir * (0.6 + r) + (vec2(h21(cell + 7.1), h21(cell + 3.3)) - 0.5) * 1.4) * tr * 90.0 * uDpr;
    vec2 suv = (cc - fly) / uRes;
    float split = tr * 0.012;
    col = vec3(scene(suv + vec2(split, 0.0)).r, scene(suv).g, scene(suv - vec2(split, 0.0)).b);
    // some blocks drop out, some flare, as if the pixels were knocked loose
    col *= step(tr * 0.55, r + 0.12);
    col += step(1.0 - tr * 0.18, r) * vec3(1.0, 0.62, 0.34) * 0.9;
    col = mix(scene(uv), col, smoothstep(0.02, 0.18, tr));
  } else {
    col = scene(uv);
  }

  // CRT finish: scan lines, grain, vignette
  col *= 0.94 + 0.06 * step(mod(px.y, 3.0 * uDpr), 1.5 * uDpr);
  vec2 vv = vUv - 0.5;
  col *= 1.0 - 0.55 * dot(vv, vv) * float(uModeA == 1 || uMix > 0.5);
  col += (h21(px + fract(uTime * 7.0) * 100.0) - 0.5) * 0.035;
  float seg = floor((px.x + h21(vec2(row, 2.0)) * 900.0) / (20.0 + 80.0 * h21(vec2(row, 5.0))));
  col += step(0.93, h21(vec2(seg, row + tf * 0.37))) * band * 0.12;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => x * x * (3 - 2 * x);

// what each stretch of the timeline shows
const SCENES = [
  { id: 'sheet', mode: 0, from: 0, to: TL.ringEnd },
  { id: 'city', mode: 1, src: 'assets/env/city-drop.mp4', poster: 'assets/env/city-drop-poster.jpg', video: true, from: TL.ringEnd, to: TL.fallEnd, zoom: [1.06, 1.16], grade: [0.01, 0.05, 0.14], hi: [0.62, 0.8, 1.0], lift: 0.12 },
  { id: 'workshop', mode: 1, src: 'assets/env/workshop.jpg', from: TL.mixStart, to: TL.hallEnd, zoom: [1.04, 1.2], grade: [0.005, 0.03, 0.04], hi: [0.72, 0.92, 0.9], lift: 0.1 },
  { id: 'alley', mode: 1, src: 'assets/env/alley.jpg', from: TL.mix2Start, to: TL.end, zoom: [1.06, 1.14], grade: [0.06, 0.005, 0.004], hi: [1.0, 0.42, 0.26], lift: 0.18 },
];
const DISSOLVES = [
  { a: 0, b: 1, from: TL.ringEnd, to: TL.growEnd },
  { a: 1, b: 2, from: TL.mixStart, to: TL.mixEnd },
  { a: 2, b: 3, from: TL.mix2Start, to: TL.mix2End },
];

export function createMedia(canvas, { floorCanvas }) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const program = (fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };
  let main, trailProg;
  try { main = program(FRAG); trailProg = program(TRAIL); } catch (err) { console.error(err); return null; }
  gl.bindVertexArray(gl.createVertexArray());

  const texture = (src) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 14, 22, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (src) upload(t, src);
    return t;
  };
  function upload(t, src, repeat = false) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (repeat) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }
  }

  // media
  const media = SCENES.map((sc) => {
    const m = { ...sc, tex: texture(null), w: 16, h: 9, ready: false, el: null, lastT: -1 };
    if (sc.mode === 0) return m;
    const img = new Image();
    img.onload = () => { if (!m.ready || !sc.video) { upload(m.tex, img); m.w = img.naturalWidth; m.h = img.naturalHeight; m.ready = true; } };
    img.src = sc.poster || sc.src;
    if (sc.video) {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
      v.src = sc.src;
      v.addEventListener('loadeddata', () => { m.el = v; m.w = v.videoWidth; m.h = v.videoHeight; });
      v.addEventListener('seeked', () => { if (m.el) { upload(m.tex, v); m.ready = true; } });
      v.load();
    }
    return m;
  });
  const floorTex = texture(null);
  upload(floorTex, floorCanvas, true);

  // trail ping-pong at an eighth of the screen
  const trail = [0, 1].map(() => ({ tex: texture(null), fbo: gl.createFramebuffer() }));
  let tW = 1, tH = 1, ti = 0, W = 1, H = 1, dpr = 1;
  function alloc() {
    trail.forEach((t) => {
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tW, tH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
    canvas.width = W; canvas.height = H;
    tW = Math.max(8, Math.round(W / 8)); tH = Math.max(8, Math.round(H / 8));
    alloc();
  }
  resize();

  // cover fit with a zoom around the centre, plus a little pointer parallax
  function cover(m, zoom, px, py) {
    const sa = W / H, ia = m.w / m.h;
    let sx = 1, sy = 1;
    if (sa > ia) sy = ia / sa; else sx = sa / ia;
    sx /= zoom; sy /= zoom;
    return [sx, sy, 0.5 - sx / 2 + px * 0.01, 0.5 - sy / 2 - py * 0.008];
  }

  const prev = { x: -1, y: -1 };

  function frame(t, dt, { s, pointer, still, vel }) {
    // which picture, and which one it is dissolving into
    let a = media[0], b = null, mix = 0;
    for (let i = media.length - 1; i >= 0; i--) { if (s >= media[i].from) { a = media[i]; break; } }
    for (const d of DISSOLVES) {
      if (s > d.from && s < d.to) { a = media[d.a]; b = media[d.b]; mix = ease(clamp01((s - d.from) / (d.to - d.from))); }
    }
    const progress = (m) => clamp01((s - m.from) / (m.to - m.from));

    // scrub the drop-down video with the scroll
    for (const m of [a, b]) {
      if (!m || !m.video || !m.el || !m.el.duration) continue;
      const want = progress(m) * (m.el.duration - 0.05);
      if (Math.abs(want - m.lastT) > 1 / 40 && !m.el.seeking) { m.el.currentTime = want; m.lastT = want; }
    }

    // trail
    const mx = pointer.inside ? pointer.x * dpr : -9999, my = pointer.inside ? (innerHeight - pointer.y) * dpr : -9999;
    if (prev.x < -9000) { prev.x = mx; prev.y = my; }
    const speed = Math.hypot(mx - prev.x, my - prev.y) / dpr / Math.max(dt, 1e-3);
    const power = still || !pointer.inside ? 0 : clamp01((speed - 120) / 900);
    const src = trail[ti], dst = trail[1 - ti];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, tW, tH);
    gl.useProgram(trailProg.p);
    let u = trailProg.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(u.uPrev, 0);
    gl.uniform2f(u.uSize, tW, tH);
    gl.uniform2f(u.uA, prev.x / 8, prev.y / 8);
    gl.uniform2f(u.uB, mx / 8, my / 8);
    gl.uniform1f(u.uRadius, Math.max(9, Math.min(18, innerWidth / 90)));
    gl.uniform1f(u.uDecay, still ? 0.8 : Math.pow(0.93, dt * 60));
    gl.uniform1f(u.uPower, power);
    gl.uniform1f(u.uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    ti = 1 - ti;
    prev.x = mx; prev.y = my;

    // picture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(main.p);
    u = main.u;
    const px = pointer.nx || 0, py = pointer.ny || 0;
    const bind = (unit, tex, name) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u[name], unit); };
    bind(0, a.tex, 'tA'); bind(1, (b || a).tex, 'tB'); bind(2, trail[ti].tex, 'tTrail'); bind(3, floorTex, 'tFloor');
    const za = a.zoom ? a.zoom[0] + (a.zoom[1] - a.zoom[0]) * progress(a) : 1;
    const zb = b && b.zoom ? b.zoom[0] + (b.zoom[1] - b.zoom[0]) * progress(b) : 1;
    gl.uniform4f(u.uCoverA, ...cover(a, za, px, py));
    gl.uniform4f(u.uCoverB, ...cover(b || a, zb, px, py));
    gl.uniform1i(u.uModeA, a.mode); gl.uniform1i(u.uModeB, (b || a).mode);
    gl.uniform3f(u.uGradeA, ...(a.grade || [0, 0, 0])); gl.uniform3f(u.uGradeB, ...((b || a).grade || [0, 0, 0]));
    gl.uniform3f(u.uHiA, ...(a.hi || [1, 1, 1])); gl.uniform3f(u.uHiB, ...((b || a).hi || [1, 1, 1]));
    gl.uniform1f(u.uLiftA, a.lift ?? 1); gl.uniform1f(u.uLiftB, (b || a).lift ?? 1);
    gl.uniform1f(u.uMix, b ? mix : 0);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform2f(u.uMouse, mx, my);
    gl.uniform1f(u.uGlitch, still ? 0 : Math.min(0.4, Math.max(0, Math.abs(vel) - 0.5) * 0.08));
    gl.uniform1f(u.uBand, still || a.mode === 0 ? 0 : 0.3);
    gl.uniform1f(u.uBandY, 0.32 + 0.22 * Math.sin(t * 0.11));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { frame, resize };
}
