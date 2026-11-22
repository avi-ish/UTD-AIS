/*
  Hero renderer (WebGL2, no dependencies)
  ------------------------------------------------------------
    1. portrait pass – a raymarched bust (or your own photo / video) rendered at
                       half the glyph-cell size, with mipmaps;
    2. trail pass    – where the cursor moves fast, cells get pushed out as pins;
    3. screen pass   – fisheye sphere grid, dot-matrix glyphs, quadtree
                       subdivision in the dark areas, the iridescent lens that
                       follows the cursor, and the glitch band.

  The canvas keeps its drawing buffer so the 3D world can reuse the frame as a
  texture while the hero flies away on scroll.
*/

export const HERO_CONFIG = {
  // A cut-out portrait (transparent background). Set to null to use the generated bust instead.
  portrait: 'assets/portrait.webp',
  // where things are in that photo, as fractions of its width/height
  frame: { headTop: 0.235, faceX: 0.482, eye: [0.414, 0.419] },
  lensRadius: 0.064,       // lens radius as a fraction of the viewport width
  maxDpr: 2,
};

const VERT = /* glsl */`#version 300 es
const vec2 V[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main(){ gl_Position = vec4(V[gl_VertexID], 0.0, 1.0); }`;

// Shared header for the two portrait programs. Output: r = luminance,
// g = luminance², b = figure mask. Texture row 0 is the TOP of the screen.
const PORTRAIT_HEAD = /* glsl */`#version 300 es
precision highp float;
uniform vec2 uScreen;   // screen size, device px
uniform float uTexel;   // device px per portrait texel
uniform float uTime;
out vec4 o;
vec2 screenUV(){ return gl_FragCoord.xy * uTexel / uScreen; } // x right, y down
void emit(float lum, float mask){ lum = clamp(lum, 0.0, 1.0); o = vec4(lum, lum*lum, mask, 1.0); }
`;

const PORTRAIT_SDF = PORTRAIT_HEAD + /* glsl */`
uniform vec2 uLook;     // head yaw, pitch
uniform vec2 uCenter;   // where the view centre sits on screen (fractions)
uniform float uTanH;    // tan(half vertical fov)
uniform vec2 uCam;      // camera y, z

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr * rr; float il2 = 1.0 / l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2;
  vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv); float y2 = y * y * l2; float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

const vec3 PIVOT = vec3(0.0, -0.85, -0.1);
vec3 headSpace(vec3 p){
  vec3 q = p - PIVOT;
  float w = smoothstep(-1.55, -0.65, p.y);
  q.xz = rot(uLook.x * w) * q.xz;
  q.yz = rot(uLook.y * w) * q.yz;
  return q + PIVOT;
}

float hairline(vec3 q){
  return 0.62 - 0.4 * smoothstep(0.48, 0.74, abs(q.x)) - 0.75 * smoothstep(0.05, -0.55, q.z);
}

// x: distance, y: material (0 skin, 1 eye, 2 cloth)
vec2 map(vec3 p){
  vec3 q = headSpace(p);
  vec3 m = vec3(abs(q.x), q.y, q.z);

  float d = sdEll(q - vec3(0.0, 0.3, -0.1), vec3(0.78, 0.86, 0.88));              // cranium
  d = smin(d, sdEll(q - vec3(0.0, -0.25, 0.1), vec3(0.65, 0.72, 0.7)), 0.3);       // face mass
  d = smin(d, sdEll(m - vec3(0.36, -0.6, 0.1), vec3(0.2, 0.22, 0.32)), 0.28);      // jaw angle
  d = smin(d, sdEll(q - vec3(0.0, -0.94, 0.33), vec3(0.25, 0.19, 0.22)), 0.24);    // chin
  d = smin(d, sdEll(m - vec3(0.37, -0.1, 0.4), vec3(0.2, 0.14, 0.2)), 0.16);       // cheekbones
  d = smin(d, sdEll(q - vec3(0.0, 0.24, 0.58), vec3(0.52, 0.12, 0.18)), 0.12);     // brow ridge
  d = smax(d, -sdEll(m - vec3(0.255, 0.05, 0.76), vec3(0.16, 0.11, 0.15)), 0.07);  // eye sockets

  float nose = sdRC(q, vec3(0.0, 0.13, 0.72), vec3(0.0, -0.29, 0.95), 0.05, 0.095);
  nose = smin(nose, sdEll(m - vec3(0.085, -0.33, 0.83), vec3(0.075, 0.055, 0.07)), 0.05);
  d = smin(d, nose, 0.07);

  float lips = sdEll(q - vec3(0.0, -0.53, 0.765), vec3(0.17, 0.05, 0.09));
  lips = smin(lips, sdEll(q - vec3(0.0, -0.615, 0.75), vec3(0.15, 0.055, 0.09)), 0.04);
  d = smin(d, lips, 0.05);
  d = smax(d, -sdEll(q - vec3(0.0, -0.572, 0.85), vec3(0.17, 0.009, 0.06)), 0.015);

  vec3 e = m - vec3(0.76, -0.02, -0.04);
  e.xz = rot(-0.35) * e.xz;
  d = smin(d, sdEll(e, vec3(0.07, 0.23, 0.14)), 0.05);                             // ears

  // short hair: a slightly bigger shell above the hairline, roughened
  float hair = sdEll(q - vec3(0.0, 0.36, -0.12), vec3(0.82, 0.86, 0.9));
  hair = smax(hair, hairline(q) - q.y, 0.06);
  hair -= noise3(q * 22.0) * 0.018;
  d = smin(d, hair, 0.03);

  // eyelids hug the eyeball so it reads as a real eye, not a marble
  d = smin(d, sdEll(m - vec3(0.255, 0.105, 0.6), vec3(0.15, 0.06, 0.115)), 0.03);
  d = smin(d, sdEll(m - vec3(0.255, -0.035, 0.6), vec3(0.14, 0.035, 0.1)), 0.03);
  float eye = length(m - vec3(0.255, 0.045, 0.565)) - 0.115;

  vec3 b = vec3(abs(p.x), p.y, p.z);
  float neck = sdCap(p, vec3(0.0, -0.55, -0.15), vec3(0.0, -1.8, -0.15), 0.36);
  float torso = sdEll(p - vec3(0.0, -2.75, -0.25), vec3(1.7, 1.05, 0.78));
  torso = smin(torso, sdCap(b, vec3(0.2, -1.72, -0.22), vec3(1.25, -2.15, -0.22), 0.4), 0.35);

  float head = smin(d, neck, 0.12);
  float all = smin(head, torso, 0.25);
  if (eye < all) return vec2(eye, 1.0);
  return vec2(all, torso < head ? 2.0 : 0.0);
}

vec3 calcNormal(vec3 p){
  const vec2 k = vec2(1.0, -1.0); const float h = 0.0015;
  return normalize(k.xyy * map(p + k.xyy * h).x + k.yyx * map(p + k.yyx * h).x +
                   k.yxy * map(p + k.yxy * h).x + k.xxx * map(p + k.xxx * h).x);
}
float shadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 22; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.02, 0.2);
    if (res < 0.01 || t > 3.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float occlusion(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.02 + 0.1 * float(i);
    occ += (h - map(p + n * h).x) * sca;
    sca *= 0.8;
  }
  return clamp(1.0 - 1.6 * occ, 0.0, 1.0);
}

void main(){
  vec2 uv = screenUV();
  float aspect = uScreen.x / uScreen.y;
  vec2 s = vec2((uv.x - uCenter.x) * aspect, uCenter.y - uv.y) * 2.0;
  vec3 ro = vec3(0.0, uCam.x, uCam.y);
  vec3 rd = normalize(vec3(s * uTanH, -1.0));

  // bounding slab: skip rays that can't reach the figure
  float t = uCam.y - 1.0, tMax = uCam.y + 1.4;
  vec2 hit = vec2(-1.0);
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    vec2 h = map(p);
    if (h.x < 0.0012 * t) { hit = vec2(t, h.y); break; }
    t += h.x * 0.9;
    if (t > tMax) break;
  }
  if (hit.x < 0.0) { emit(0.0, 0.0); return; }

  vec3 p = ro + rd * hit.x;
  vec3 n = calcNormal(p);
  vec3 q = headSpace(p);
  vec3 m = vec3(abs(q.x), q.y, q.z);

  // albedo
  float alb = 0.74;
  if (hit.y > 1.5) {
    alb = 0.2 + 0.05 * noise3(p * 14.0);                                     // dark tee
  } else if (hit.y > 0.5) {
    vec3 ec = m - vec3(0.255, 0.045, 0.565);
    float iris = smoothstep(0.058, 0.047, length(ec.xy - vec2(-0.008, 0.0)));
    alb = mix(0.62, 0.2, iris) * mix(1.0, 0.12, smoothstep(0.024, 0.016, length(ec.xy - vec2(-0.008, 0.0))));
  } else {
    float hairM = smoothstep(-0.02, 0.05, q.y - hairline(q)) * step(-1.0, q.y);
    float beard = smoothstep(-0.16, -0.36, q.y) * smoothstep(-0.4, -0.1, q.z) * smoothstep(-1.35, -1.05, q.y);
    beard = max(beard, smoothstep(0.1, 0.05, length((q.xy - vec2(0.0, -0.45)) * vec2(0.55, 1.6))) * step(0.6, q.z));
    beard *= 1.0 - smoothstep(0.075, 0.03, length((q.xy - vec2(0.0, -0.575)) * vec2(0.5, 1.2))) * step(0.7, q.z); // keep the lips clean
    float sideburn = smoothstep(0.62, 0.7, m.x) * smoothstep(0.3, 0.1, q.y) * smoothstep(-0.5, -0.25, q.y);
    float stub = 0.55 + 0.9 * noise3(q * 46.0);
    alb = mix(alb, 0.12, hairM);
    alb = mix(alb, 0.4 * stub, max(beard, sideburn) * (1.0 - hairM));
    float brows = smoothstep(0.06, 0.02, abs(q.y - 0.2 + 0.05 * m.x)) * smoothstep(0.08, 0.14, m.x) * smoothstep(0.46, 0.36, m.x) * step(0.5, q.z);
    alb = mix(alb, 0.16, brows * 0.85);
  }

  vec3 L = normalize(vec3(0.5, 0.45, 0.74));
  float dif = clamp(dot(n, L), 0.0, 1.0);
  float sha = dif > 0.001 ? shadow(p + n * 0.01, L) : 0.0;
  float occ = occlusion(p, n);
  float fre = pow(clamp(1.0 + dot(n, rd), 0.0, 1.0), 3.0);
  float back = clamp(dot(n, normalize(vec3(-0.75, 0.35, -0.3))), 0.0, 1.0);
  float spe = pow(clamp(dot(reflect(rd, n), L), 0.0, 1.0), 22.0) * dif * sha;

  float lum = alb * (1.3 * dif * (0.25 + 0.75 * sha) + 0.3 * occ * (0.55 + 0.45 * n.y));
  lum += 0.45 * fre * back * occ;
  lum += spe * (hit.y > 0.5 && hit.y < 1.5 ? 0.8 : 0.22);
  lum = lum / (1.0 + 0.35 * lum);
  lum = pow(lum, 0.8) * 1.06;
  lum *= 0.97 + 0.03 * sin(uTime * 1.3);

  emit(lum, 1.0);
}`;

const PORTRAIT_IMAGE = PORTRAIT_HEAD + /* glsl */`
uniform sampler2D uImg;
uniform vec2 uImgSize;
uniform vec2 uCenter;
uniform vec4 uRect;     // cut-out placement on screen (uv, y down): x, y, w, h
uniform float uCut;     // 1 = cut-out with alpha, 0 = cover-fit photo
uniform vec2 uLook;     // small parallax so the photo feels a little 3D
void main(){
  vec2 uv = screenUV();
  vec2 st;
  if (uCut > 0.5) {
    st = (uv - uRect.xy) / uRect.zw;
    // a soft "pillow" depth from the blurred alpha: the middle of the head moves more than the edges
    float depth = textureLod(uImg, st, 5.0).a;
    st -= uLook * vec2(0.035, 0.025) * (depth - 0.45);
  } else {
    float sa = uScreen.x / uScreen.y, ia = uImgSize.x / uImgSize.y;
    st = uv - vec2(uCenter.x, 0.5);
    if (sa > ia) st.y *= ia / sa; else st.x *= sa / ia;
    st += 0.5;
  }
  if (any(lessThan(st, vec2(0.0))) || any(greaterThan(st, vec2(1.0)))) { emit(0.0, 0.0); return; }
  vec4 c = texture(uImg, st);
  float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  if (uCut > 0.5) {
    // local contrast: pull features (eyes, glasses, mouth) out of the flat skin tones
    float blur = dot(textureLod(uImg, st, 3.5).rgb, vec3(0.2126, 0.7152, 0.0722));
    lum = lum + (lum - blur) * 1.1;
    lum = smoothstep(0.03, 0.95, lum);
    lum = lum / (1.0 + 1.1 * max(lum - 0.5, 0.0));   // keep the white shirt from going flat
    lum = pow(lum, 1.05) * c.a;
    emit(lum, smoothstep(0.1, 0.6, c.a));
  } else {
    lum = smoothstep(0.03, 0.95, lum);
    emit(lum, smoothstep(0.05, 0.22, lum));
  }
}`;

const SCREEN = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D uP;
uniform vec2 uRes;       // device px
uniform vec2 uPScale;    // 1 / (portrait texture size in device px)
uniform float uTexel;    // device px per portrait texel
uniform float uDpr;
uniform float uTime;
uniform vec2 uMouse;     // device px, y down
uniform float uLensR;    // device px
uniform float uLensOn;
uniform float uCell;     // device px
uniform float uBandY;
uniform float uBandH;
uniform float uBandAmp;
uniform float uGlitch;
uniform float uIntro;
uniform vec2 uGridRot;
uniform sampler2D uTrail; // cursor trail intensity, row 0 = top
uniform vec2 uTrailScale; // 1 / (trail texture size in device px)
uniform vec2 uVP;         // vanishing point for the extruded pins, device px
out vec4 o;

#define TAU 6.28318530718

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec4 P(vec2 px, float lod){ return textureLod(uP, px * uPScale, max(lod, 0.0)); }

// ball-lens refraction around the cursor + a ripple that leaks outside it.
// disp shifts the strength per colour channel (dispersion).
vec2 lens(vec2 px, float disp){
  vec2 v = px - uMouse;
  float r = length(v) / uLensR;
  float s = r < 1.0 ? mix(0.34 + disp, 1.0, r * r) : 1.0;
  float rip = sin((r - 1.0) * 13.0 - uTime * 2.4 + disp * 30.0) * 0.07
            * exp(-max(r - 1.0, 0.0) * 2.0) * smoothstep(0.8, 1.05, r) * smoothstep(2.6, 1.4, r);
  s = mix(1.0, s + rip, uLensOn);
  return uMouse + v * s;
}
float lensMag(float r){ return r < 1.0 ? mix(0.34, 1.0, r * r) : 1.0; }

float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdPlus(vec2 p, float l, float w){ p = abs(p); return min(sdBox(p, vec2(l, w)), sdBox(p, vec2(w, l))); }

// dot-matrix glyph ramp: . · + • * ● ■
float glyph(vec2 p, float v, float aa){
  float lv = floor(clamp(v, 0.0, 0.999) * 8.0);
  float d;
  if (lv < 1.0) return 0.0;
  else if (lv < 2.0) d = length(p) - 0.075;
  else if (lv < 3.0) d = length(p) - 0.13;
  else if (lv < 4.0) d = sdPlus(p, 0.26, 0.065);
  else if (lv < 5.0) d = length(p) - 0.22;
  else if (lv < 6.0) { vec2 r = vec2(p.x + p.y, p.x - p.y) * 0.7071; d = min(sdPlus(p, 0.33, 0.065), sdPlus(r, 0.28, 0.06)); }
  else if (lv < 7.0) d = length(p) - 0.31;
  else d = sdBox(p, vec2(0.33)) - 0.07;
  return 1.0 - smoothstep(-aa, aa, d);
}

// the inside of a sphere: meridians bow outward like ( ) toward the edges,
// latitudes stay almost level and open up slightly at the sides
float grid(vec2 px){
  vec2 s = (px - 0.5 * uRes) / (0.5 * uRes.y);
  vec2 g = vec2(s.x / (1.0 - 0.11 * s.y * s.y), s.y / (1.0 + 0.035 * s.x * s.x));
  g = vec2(g.x * 6.9 + uGridRot.x * 40.0, g.y * 4.15 + uGridRot.y * 12.0 + 0.5);
  vec2 fw = max(fwidth(g), vec2(1e-4));
  vec2 dd = abs(fract(g - 0.5) - 0.5) / fw;          // distance to nearest line, px
  float hw = 0.55 * uDpr;
  float l = 1.0 - smoothstep(hw - 0.5, hw + 0.6, min(dd.x, dd.y));
  // a touch of unevenness along each line
  float seg = h21(floor(g * vec2(1.0, 4.0)) + floor(g.yx * vec2(1.0, 6.0)));
  return l * (0.78 + 0.32 * seg);
}

void main(){
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float t = uTime;
  float yN = fc.y / uRes.y;

  /* ---- glitch: horizontal row tearing inside the band, plus rare bursts ---- */
  float row = floor(fc.y / (2.0 * uDpr));
  float tf = floor(t * 20.0);
  float band = smoothstep(uBandH, uBandH * 0.45, abs(yN - uBandY)) * uBandAmp;
  float n1 = h21(vec2(row, tf));
  float n2 = h21(vec2(floor(row / 5.0), floor(t * 7.0)));
  float off = (n1 - 0.5) * (6.0 + 20.0 * n2) * uDpr * band;
  float gRow = floor(fc.y / (uRes.y * 0.035));
  float gN = h21(vec2(gRow, floor(t * 28.0)));
  off += step(1.0 - 0.35 * uGlitch, gN) * (h21(vec2(gRow, tf + 3.1)) - 0.5) * 160.0 * uDpr * step(0.01, uGlitch);
  vec2 fd = fc + vec2(off, 0.0);

  /* ---- intro: resolve from big blocks to fine cells ---- */
  float cell = uCell * exp2(floor((1.0 - uIntro) * 5.0));

  /* ---- dot-matrix glyph layer ---- */
  vec2 ci = floor(fd / cell);
  vec2 lc = fd / cell - ci - 0.5;
  vec2 cc = (ci + 0.5) * cell;
  float rC = length(cc - uMouse) / uLensR;
  float lod = log2(cell / uTexel) + log2(mix(1.0, lensMag(rC), uLensOn));
  vec3 q = vec3(P(lens(cc, -0.05), lod).r, P(lens(cc, 0.0), lod).r, P(lens(cc, 0.05), lod).r);

  float pupil = mix(1.0, mix(0.07, 1.0, smoothstep(0.16, 0.8, rC)), uLensOn);
  q *= pupil;
  float ang = atan(cc.y - uMouse.y, cc.x - uMouse.x);
  // iridescent rim (brighter where the face underneath is lit) and faint arcs that spill onto bright features
  float under = P(cc, log2(cell / uTexel)).r;
  float ring = exp(-pow((rC - 0.9) / 0.085, 2.0)) + 0.5 * exp(-pow((rC - 0.72) / 0.035, 2.0));
  float arcs = exp(-pow((rC - 1.22) / 0.05, 2.0)) + 0.7 * exp(-pow((rC - 1.46) / 0.045, 2.0));
  vec3 ir = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + rC * 2.2 + ang / TAU + t * 0.12));
  ir = mix(vec3(0.45, 0.7, 1.0), ir, 0.7);
  q += ir * uLensOn * (ring * (0.16 + 0.52 * under) + arcs * 0.5 * smoothstep(0.3, 0.75, under));

  float dith = h21(ci + 0.37) * 0.1 - 0.05;
  float aa = 1.1 / cell;
  vec3 gcol = vec3(
    glyph(lc, q.r + dith, aa) * (0.28 + 0.85 * q.r),
    glyph(lc, q.g + dith, aa) * (0.28 + 0.85 * q.g),
    glyph(lc, q.b + dith, aa) * (0.28 + 0.85 * q.b));
  vec3 col = gcol * vec3(0.84, 0.89, 1.0);

  /* ---- fast cursor moves leave a trail of cells pushed out toward the viewer,
          seen in perspective as iridescent pins ---- */
  float tr = texture(uTrail, cc * uTrailScale).r;
  float pinK = smoothstep(0.04, 0.22, tr) * uLensOn;
  if (pinK > 0.001) {
    vec2 dir = normalize(cc - uVP + vec2(1e-3));
    float L = mix(0.2, 1.05, smoothstep(0.05, 0.85, tr)) * (0.75 + 0.5 * h21(ci + 4.1));
    vec2 a0 = -dir * L * 0.45, b0 = dir * L * 0.55;
    vec2 pa = lc - a0, ba = b0 - a0;
    float hseg = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    float pin = 1.0 - smoothstep(-aa, aa, length(pa - ba * hseg) - mix(0.13, 0.08, hseg));
    float tip = 1.0 - smoothstep(-aa, aa, length(lc - b0) - 0.12);
    float under0 = P(cc, log2(cell / uTexel)).r;
    vec3 irc = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + h21(ci) * 0.35 + tr * 0.9 + hseg * 0.25 + t * 0.15));
    irc = mix(vec3(0.32, 0.72, 1.0), irc, 0.55);
    vec3 pc = irc * (0.3 + 0.95 * max(under0, 0.22)) * max(pin * (0.55 + 0.6 * hseg), tip * 1.25);
    col = mix(col, pc, pinK);
  }

  /* ---- quadtree on the dark parts: cells split where the image varies ---- */
  float qMean = 0.0, qK = 0.0, qS = cell, qMask = 0.0, qInLens = 0.0;
  vec2 qO = vec2(0.0);
  for (int k = 4; k >= 0; k--) {
    float S = cell * exp2(float(k));
    vec2 id = floor(fd / S);
    vec2 cen = (id + 0.5) * S;
    float rq = length(cen - uMouse) / uLensR;
    vec4 tx = P(lens(cen, 0.0), log2(S / uTexel) + log2(mix(1.0, lensMag(rq), uLensOn)));
    float var = max(tx.g - tx.r * tx.r, 0.0);
    qMean = tx.r * mix(1.0, mix(0.07, 1.0, smoothstep(0.16, 0.8, rq)), uLensOn);
    qMask = tx.b;
    qInLens = (1.0 - smoothstep(0.85, 1.05, rq)) * uLensOn;
    qK = float(k); qS = S; qO = id * S;
    if (var < 0.0032) break;
  }
  vec2 lp = fd - qO;
  float edge = max(step(lp.x, uDpr), step(lp.y, uDpr));
  float dark = 1.0 - smoothstep(0.06, 0.2, qMean);
  float edgeCell = smoothstep(0.02, 0.25, qMask) * smoothstep(0.98, 0.75, qMask);
  float qt = dark * step(qK, 3.5) * step(0.5, uIntro) * (1.0 - pinK) * max(edgeCell, qInLens);
  col += qt * mix(vec3(qMean * 0.45), vec3(0.2), edge);

  /* ---- sphere grid behind the figure (dispersed through the lens) ---- */
  vec2 gp = lens(fd, 0.0);
  float mk = P(gp, 0.0).b;
  float smear = (h21(vec2(row, tf + 1.7)) - 0.5) * 16.0 * uDpr * band;
  float gG = max(grid(gp), grid(gp + vec2(smear, 0.0)) * 0.85 * step(0.02, band));
  float gR = grid(lens(fd, -0.05));
  float gB = grid(lens(fd, 0.05));
  float rF = length(fd - uMouse) / uLensR;
  float inLens = uLensOn * smoothstep(1.3, 0.9, rF);
  vec3 g = mix(vec3(gG), vec3(gR, gG, gB), inLens);
  g *= mix(1.0, mix(0.12, 1.0, smoothstep(0.16, 0.8, rF)), uLensOn);
  float gridVis = (1.0 - smoothstep(0.03, 0.25, mk)) * smoothstep(0.0, 0.4, uIntro);
  col += g * 0.4 * gridVis * vec3(0.95, 0.97, 1.0);

  /* ---- band streaks + stray dashes ---- */
  float segLen = (18.0 + 90.0 * h21(vec2(row, 5.0))) * uDpr;
  float seg = floor((fc.x + h21(vec2(row, 2.0)) * 1000.0) / segLen);
  float streak = step(0.9, h21(vec2(seg, row + tf * 0.37)));
  col += streak * band * 0.3 * (0.6 + 0.4 * h21(vec2(seg, row)));

  float dRow = floor(fc.y / (3.0 * uDpr));
  float dSeg = floor(fc.x / (26.0 * uDpr) + h21(vec2(dRow, 1.0)) * 3.0);
  float dh = h21(vec2(dRow * 1.37 + floor(t * 5.0) * 17.0, dSeg));
  col += step(0.9988, dh) * step(mod(fc.y, 3.0 * uDpr), uDpr) * 0.5;

  /* ---- finish: scanlines, grain, vignette ---- */
  col *= 0.93 + 0.07 * step(mod(fc.y, 3.0 * uDpr), 1.5 * uDpr);
  col += (h21(fc + fract(t * 7.0) * 100.0) - 0.5) * 0.03;
  vec2 vv = fc / uRes - 0.5;
  col *= 1.0 - 0.5 * dot(vv, vv);
  col *= smoothstep(0.0, 0.2, uIntro);
  o = vec4(max(col, 0.0), 1.0);
}`;


// Cursor trail: decays every frame, the latest pointer segment is stamped in.
const TRAIL = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSize;      // trail texture size
uniform vec2 uScreen;    // device px
uniform vec2 uA;         // segment start, device px, y down
uniform vec2 uB;         // segment end
uniform float uRadius;
uniform float uDecay;
uniform float uPower;
uniform float uTime;
out vec4 o;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / uSize;
  float prev = texture(uPrev, uv).r * uDecay;
  vec2 px = uv * uScreen;
  vec2 pa = px - uA, ba = uB - uA;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-3), 0.0, 1.0);
  float d = length(pa - ba * h);
  float wob = 0.65 + 0.7 * vnoise(px / uRadius * 1.8 + uTime * 0.7);
  float add = smoothstep(uRadius * wob, uRadius * wob * 0.3, d) * uPower;
  o = vec4(min(1.0, prev + add * (1.0 - prev)), 0.0, 0.0, 1.0);
}`;

function smooth(x) { return x * x * (3 - 2 * x); }

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{x:number,y:number,active:boolean,last:number}} input shared pointer state (CSS px)
 * @param {{reduceMotion:boolean, finePointer:boolean, onGlitch?:Function}} env
 */
export function createHero(canvas, input, env) {
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const program = (fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };

  let progSdf, progImg, progScreen, progTrail;
  try {
    progSdf = program(PORTRAIT_SDF);
    progImg = program(PORTRAIT_IMAGE);
    progScreen = program(SCREEN);
    progTrail = program(TRAIL);
  } catch (err) {
    console.error(err);
    return null;
  }

  gl.bindVertexArray(gl.createVertexArray());

  const makeTarget = (mip) => {
    const tex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    return { tex, fbo, mip };
  };
  const portrait = makeTarget(true);
  const trail = [makeTarget(false), makeTarget(false)];
  let trailIdx = 0;
  const imgTex = gl.createTexture();
  let source = { kind: 'sdf', el: null, w: 1, h: 1 };

  let dpr = 1, W = 0, H = 0, cellD = 6, texel = 3, pW = 0, pH = 0, tW = 0, tH = 0;
  let dprCap = Math.min(window.devicePixelRatio || 1, HERO_CONFIG.maxDpr);
  const view = { cx: 0.54, cy: 0.5, tanH: 0.265, camY: -0.33, camZ: 6.0 };

  function alloc(t, w, h, mip) {
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // placement of a framed cut-out photo, in screen uv (y down)
  const rect = { x: 0, y: 0, w: 1, h: 1 };
  function placeCutout() {
    if (!source.frame) return;
    const f = source.frame, aspect = innerWidth / innerHeight, ia = source.w / source.h;
    const narrow = aspect < 0.9;
    const top = narrow ? 0.12 : 0.03, bottom = narrow ? 1.0 : 1.38;
    rect.h = (bottom - top) / (1 - f.headTop);
    rect.y = top - f.headTop * rect.h;
    rect.w = rect.h * ia / aspect;
    rect.x = view.cx - f.faceX * rect.w;
  }

  // where the bust's (viewer's) left eye lands on screen, in CSS px, for a given head turn
  function eyeOnScreen(yaw, pitch) {
    if (source.frame) {
      return {
        x: (rect.x + source.frame.eye[0] * rect.w - yaw * 0.035 * 0.55 * rect.w) * innerWidth,
        y: (rect.y + source.frame.eye[1] * rect.h - pitch * 0.025 * 0.55 * rect.h) * innerHeight,
      };
    }
    const piv = [0, -0.85, -0.1];
    let x = -0.255 - piv[0], y = 0.045 - piv[1], z = 0.565 - piv[2];
    // undo the pitch, then the yaw (inverse of headSpace in the shader)
    let c = Math.cos(pitch), s = Math.sin(pitch);
    [y, z] = [c * y - s * z, s * y + c * z];
    c = Math.cos(yaw); s = Math.sin(yaw);
    [x, z] = [c * x - s * z, s * x + c * z];
    x += piv[0]; y += piv[1]; z += piv[2];
    const dz = view.camZ - z;
    const sx = x / dz / view.tanH, sy = (y - view.camY) / dz / view.tanH;
    const aspect = innerWidth / innerHeight;
    return { x: (view.cx + sx / (2 * aspect)) * innerWidth, y: (view.cy - sy / 2) * innerHeight };
  }

  const lens = { x: 0, y: 0 };
  const look = { x: 0, y: 0 };
  const idle = { x: 0, y: 0, next: 1.5 };
  const prevPtr = { x: -1, y: -1 };
  let home = { x: innerWidth * 0.45, y: innerHeight * 0.4 };

  function layout() {
    const cssW = innerWidth, cssH = innerHeight;
    dpr = dprCap;
    W = Math.max(1, Math.round(cssW * dpr));
    H = Math.max(1, Math.round(cssH * dpr));
    canvas.width = W;
    canvas.height = H;
    const cellCss = Math.max(5, Math.min(9, Math.round(cssW / 210)));
    cellD = cellCss * dpr;
    texel = cellD / 2;
    pW = Math.ceil(W / texel);
    pH = Math.ceil(H / texel);
    tW = Math.ceil(W / cellD);
    tH = Math.ceil(H / cellD);
    alloc(portrait, pW, pH, true);
    alloc(trail[0], tW, tH, false);
    alloc(trail[1], tW, tH, false);

    const aspect = cssW / cssH;
    if (aspect < 0.9) {
      view.cx = 0.5;
      view.tanH = 0.265 * Math.max(1, 0.62 / aspect);
      view.camY = -0.33 - (view.tanH - 0.265) * 2.4;
    } else {
      view.cx = 0.54;
      view.tanH = 0.265;
      view.camY = -0.33;
    }
    placeCutout();
    home = eyeOnScreen(look.x, look.y);
    if (!input.active) { lens.x = home.x; lens.y = home.y; }
  }

  /* ---- custom portrait: config, ?portrait=, or drag & drop ---- */
  function useMedia(url, isVideo, frame = null) {
    if (isVideo) {
      const v = document.createElement('video');
      v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.crossOrigin = 'anonymous';
      v.addEventListener('loadeddata', () => { source = { kind: 'video', el: v, w: v.videoWidth, h: v.videoHeight }; }, { once: true });
      v.play().catch(() => {});
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, imgTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        source = { kind: 'image', el: img, w: img.naturalWidth, h: img.naturalHeight, frame };
        placeCutout();
        home = eyeOnScreen(look.x, look.y);
        if (!input.active) { lens.x = home.x; lens.y = home.y; }
      };
      img.src = url;
    }
  }
  const qp = new URLSearchParams(location.search).get('portrait');
  if (qp) useMedia(qp, /\.(mp4|webm|mov)(\?|$)/i.test(qp));
  else if (HERO_CONFIG.portrait) useMedia(HERO_CONFIG.portrait, false, HERO_CONFIG.frame);

  let glitch = 0, glitchUntil = 0, nextGlitch = 3.2, bandJump = 0;
  let frames = 0, acc = 0, checked = false, started = -1;

  layout();
  lens.x = home.x; lens.y = home.y;

  function render(time, dt) {
    if (started < 0) started = time;
    const t = time - started;
    const reduce = env.reduceMotion;

    // quality: if slow after the intro, drop resolution once or twice
    if (t > 2.5 && !checked) {
      acc += dt; frames++;
      if (frames >= 90) {
        if (acc / frames > 0.028 && dprCap > 1) { dprCap = Math.max(1, dprCap - 0.5); layout(); }
        else checked = true;
        frames = 0; acc = 0;
      }
    }

    const nowMs = performance.now();
    const moving = input.active && nowMs - input.last < 2500;

    // the head looks around on its own, and toward the cursor while it moves
    if (t > idle.next) {
      idle.next = t + 3.5 + Math.random() * 3.5;
      const side = Math.random() < 0.5 ? -1 : 1;
      idle.x = Math.random() < 0.3 ? 0 : side * (0.25 + Math.random() * 0.45);
      idle.y = (Math.random() - 0.4) * 0.22;
    }
    const mx = (input.active ? input.x / innerWidth : 0.5) - 0.5;
    const my = (input.active ? input.y / innerHeight : 0.45) - 0.45;
    const tx = moving ? mx * 0.5 : (reduce ? 0 : idle.x);
    const ty = moving ? my * 0.24 : (reduce ? 0 : idle.y);
    const lk = 1 - Math.exp(-dt * (moving ? 2.4 : 1.1));
    look.x += (tx + Math.sin(t * 0.4) * 0.025 - look.x) * lk;
    look.y += (ty + Math.sin(t * 0.31) * 0.012 - look.y) * lk;
    home = eyeOnScreen(look.x, look.y);

    // lens follows the pointer; when idle it settles on the eye
    const idleLens = !input.active || (nowMs - input.last > 9000 && !env.finePointer);
    const lx = idleLens ? home.x + Math.sin(t * 0.7) * 5 : input.x;
    const ly = idleLens ? home.y + Math.sin(t * 0.9 + 1.3) * 3 : input.y;
    const k = 1 - Math.exp(-dt * (idleLens ? 4 : 11));
    lens.x += (lx - lens.x) * k;
    lens.y += (ly - lens.y) * k;

    // glitch bursts
    if (!reduce && t > nextGlitch) {
      glitchUntil = t + 0.12 + Math.random() * 0.16;
      nextGlitch = t + 3.5 + Math.random() * 5.5;
      bandJump = (Math.random() - 0.5) * 0.18;
      env.onGlitch && env.onGlitch();
    }
    glitch = t < glitchUntil ? 1 : 0;
    bandJump *= Math.exp(-dt * 3);

    const intro = reduce ? 1 : Math.min(1, Math.max(0, (t - 0.15) / 1.5));
    const lensOn = reduce ? 1 : smooth(Math.min(1, Math.max(0, (t - 1.2) / 0.9)));
    const bandY = 0.305 + (reduce ? 0 : 0.03 * Math.sin(t * 0.37) + 0.012 * Math.sin(t * 1.7) + bandJump);
    const bandAmp = reduce ? 0.6 : 0.85 + 0.15 * Math.sin(t * 9.0) + glitch * 0.6;

    /* trail pass (ping-pong) */
    const ptrX = input.active ? input.x : lens.x, ptrY = input.active ? input.y : lens.y;
    if (prevPtr.x < 0) { prevPtr.x = ptrX; prevPtr.y = ptrY; }
    const speed = Math.hypot(ptrX - prevPtr.x, ptrY - prevPtr.y) / Math.max(dt, 1e-3);
    const power = reduce ? 0 : Math.min(1, Math.max(0, (speed - 220) / 1200)) * lensOn;
    const src = trail[trailIdx], dst = trail[1 - trailIdx];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, tW, tH);
    gl.useProgram(progTrail.p);
    let u = progTrail.u;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(u.uPrev, 0);
    gl.uniform2f(u.uSize, tW, tH);
    gl.uniform2f(u.uScreen, tW * cellD, tH * cellD);
    gl.uniform2f(u.uA, prevPtr.x * dpr, prevPtr.y * dpr);
    gl.uniform2f(u.uB, ptrX * dpr, ptrY * dpr);
    gl.uniform1f(u.uRadius, Math.max(40, Math.min(110, innerWidth * 0.055)) * dpr);
    gl.uniform1f(u.uDecay, Math.pow(0.955, dt * 60));
    gl.uniform1f(u.uPower, power);
    gl.uniform1f(u.uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    trailIdx = 1 - trailIdx;
    prevPtr.x = ptrX; prevPtr.y = ptrY;

    /* portrait pass */
    gl.bindFramebuffer(gl.FRAMEBUFFER, portrait.fbo);
    gl.viewport(0, 0, pW, pH);
    if (source.kind === 'sdf') {
      gl.useProgram(progSdf.p);
      u = progSdf.u;
      gl.uniform2f(u.uScreen, W, H);
      gl.uniform1f(u.uTexel, texel);
      gl.uniform1f(u.uTime, t);
      gl.uniform2f(u.uLook, look.x, look.y);
      gl.uniform2f(u.uCenter, view.cx, view.cy);
      gl.uniform1f(u.uTanH, view.tanH);
      gl.uniform2f(u.uCam, view.camY, view.camZ);
    } else {
      if (source.kind === 'video' && source.el.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, imgTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source.el);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      gl.useProgram(progImg.p);
      u = progImg.u;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.uniform1i(u.uImg, 0);
      gl.uniform2f(u.uImgSize, source.w, source.h);
      gl.uniform4f(u.uRect, rect.x, rect.y, rect.w, rect.h);
      gl.uniform1f(u.uCut, source.frame ? 1 : 0);
      gl.uniform2f(u.uLook, look.x, look.y);
      gl.uniform2f(u.uScreen, W, H);
      gl.uniform1f(u.uTexel, texel);
      gl.uniform1f(u.uTime, t);
      gl.uniform2f(u.uCenter, view.cx, view.cy);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, portrait.tex);
    gl.generateMipmap(gl.TEXTURE_2D);

    /* screen pass */
    gl.viewport(0, 0, W, H);
    gl.useProgram(progScreen.p);
    u = progScreen.u;
    gl.uniform1i(u.uP, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, trail[trailIdx].tex);
    gl.uniform1i(u.uTrail, 1);
    gl.uniform2f(u.uTrailScale, 1 / (tW * cellD), 1 / (tH * cellD));
    gl.uniform2f(u.uVP, view.cx * W, 0.42 * H);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform2f(u.uPScale, 1 / (pW * texel), 1 / (pH * texel));
    gl.uniform1f(u.uTexel, texel);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform1f(u.uTime, t);
    gl.uniform2f(u.uMouse, lens.x * dpr, lens.y * dpr);
    gl.uniform1f(u.uLensR, Math.max(46, Math.min(130, innerWidth * HERO_CONFIG.lensRadius)) * dpr);
    gl.uniform1f(u.uLensOn, lensOn);
    gl.uniform1f(u.uCell, cellD);
    gl.uniform1f(u.uBandY, bandY);
    gl.uniform1f(u.uBandH, 0.058);
    gl.uniform1f(u.uBandAmp, bandAmp);
    gl.uniform1f(u.uGlitch, glitch);
    gl.uniform1f(u.uIntro, intro);
    gl.uniform2f(u.uGridRot, t * 0.006 + mx * 0.05, my * 0.035);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { canvas, render, resize: layout, useMedia, get introDone() { return started >= 0; } };
}
