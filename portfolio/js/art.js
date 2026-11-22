// Generated artwork, drawn with Canvas 2D at runtime (no image files):
// credential cards, the faint glyph floor, lantern skins and soft glows.

const PIXEL = 'Silkscreen, ui-monospace, monospace';
const TECH = '"Chakra Petch", system-ui, sans-serif';

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* ------------------------------------------------------------------ */
/* Credential motifs: original finance / analytics line art             */
/* ------------------------------------------------------------------ */

const MOTIFS = {
  // candlestick chart with a moving average
  candles(ctx, x, y, w, h, A, r) {
    const n = 22, cw = w / n;
    let v = 0.55;
    const mids = [];
    for (let i = 0; i < n; i++) {
      const o = v; v = Math.min(0.9, Math.max(0.12, v + (r() - 0.45) * 0.16));
      const c = v, hi = Math.max(o, c) + r() * 0.06, lo = Math.min(o, c) - r() * 0.06;
      const cx = x + i * cw + cw / 2, Y = (q) => y + h * (1 - q);
      const up = c >= o;
      ctx.strokeStyle = up ? A : 'rgba(255,255,255,.45)';
      ctx.fillStyle = up ? A : 'rgba(255,255,255,.18)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, Y(hi)); ctx.lineTo(cx, Y(lo)); ctx.stroke();
      ctx.fillRect(cx - cw * 0.3, Y(Math.max(o, c)), cw * 0.6, Math.max(3, Math.abs(c - o) * h));
      mids.push([cx, Y((o + c) / 2)]);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5; ctx.beginPath();
    mids.forEach(([px], i) => {
      const s = mids.slice(Math.max(0, i - 4), i + 1);
      const my = s.reduce((a, b) => a + b[1], 0) / s.length;
      i ? ctx.lineTo(px, my) : ctx.moveTo(px, my);
    });
    ctx.stroke();
  },
  // two stacked panels (101 / 201) with bars
  stack(ctx, x, y, w, h, A, r) {
    const panel = (px, py, pw, ph, label, alpha) => {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.06})`; rrect(ctx, px, py, pw, ph, 18); ctx.fill();
      ctx.strokeStyle = rgba(A, alpha); ctx.lineWidth = 2; rrect(ctx, px, py, pw, ph, 18); ctx.stroke();
      ctx.fillStyle = rgba(A, alpha); ctx.font = `48px ${PIXEL}`; ctx.textBaseline = 'top'; ctx.fillText(label, px + 28, py + 24);
      for (let i = 0; i < 9; i++) {
        const bh = ph * (0.15 + r() * 0.45), bx = px + 30 + i * (pw - 60) / 9;
        ctx.fillStyle = rgba(A, alpha * (0.35 + 0.65 * (i / 9)));
        ctx.fillRect(bx, py + ph - 26 - bh, (pw - 60) / 9 - 10, bh);
      }
    };
    panel(x + w * 0.02, y + h * 0.04, w * 0.7, h * 0.6, '101', 0.45);
    panel(x + w * 0.26, y + h * 0.32, w * 0.72, h * 0.64, '201', 1);
  },
  // wireframe globe with linked nodes
  globe(ctx, x, y, w, h, A, r) {
    const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * 0.46;
    ctx.strokeStyle = rgba(A, 0.35); ctx.lineWidth = 1.6;
    for (let i = -4; i <= 4; i++) {
      const ry = R * Math.cos((i / 5) * Math.PI / 2);
      ctx.beginPath(); ctx.ellipse(cx, cy + R * Math.sin((i / 5) * Math.PI / 2), ry, ry * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(cx, cy, R * Math.abs(Math.cos((i / 9) * Math.PI)), R, 0, 0, Math.PI * 2); ctx.stroke(); }
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, b = (r() - 0.5) * 2.4;
      pts.push([cx + Math.cos(a) * R * 0.92 * Math.cos(b * 0.6), cy + Math.sin(b * 0.6) * R * 0.92]);
    }
    ctx.strokeStyle = rgba(A, 0.8); ctx.lineWidth = 2;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 60, bx, by); ctx.stroke();
    }
    pts.forEach(([px, py]) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); });
  },
  // several time series
  series(ctx, x, y, w, h, A, r) {
    for (let k = 0; k < 4; k++) {
      let v = 0.3 + r() * 0.4;
      ctx.strokeStyle = k === 0 ? A : `rgba(255,255,255,${0.18 + k * 0.08})`;
      ctx.lineWidth = k === 0 ? 3.5 : 2;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        v = Math.min(0.95, Math.max(0.05, v + (r() - 0.48) * 0.07));
        const px = x + (i / 60) * w, py = y + h * (1 - v);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x, y + (i / 4) * h); ctx.lineTo(x + w, y + (i / 4) * h); ctx.stroke(); }
  },
  // spreadsheet grid with highlighted cells
  ledger(ctx, x, y, w, h, A, r) {
    const cols = 6, rows = 9, cw = w / cols, rh = h / rows;
    ctx.font = `22px ${PIXEL}`; ctx.textBaseline = 'middle';
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const hot = r() < 0.12;
        if (hot) { ctx.fillStyle = rgba(A, 0.22); ctx.fillRect(x + j * cw + 2, y + i * rh + 2, cw - 4, rh - 4); }
        ctx.fillStyle = hot ? A : 'rgba(255,255,255,.4)';
        if (i === 0) ctx.fillText(String.fromCharCode(65 + j), x + j * cw + 14, y + rh / 2);
        else ctx.fillText((r() * 999).toFixed(j % 2 ? 1 : 0), x + j * cw + 14, y + i * rh + rh / 2);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
    for (let i = 0; i <= rows; i++) { ctx.beginPath(); ctx.moveTo(x, y + i * rh); ctx.lineTo(x + w, y + i * rh); ctx.stroke(); }
    for (let j = 0; j <= cols; j++) { ctx.beginPath(); ctx.moveTo(x + j * cw, y); ctx.lineTo(x + j * cw, y + h); ctx.stroke(); }
  },
  // screening rings and a list of checked records
  scan(ctx, x, y, w, h, A, r) {
    const cx = x + w * 0.34, cy = y + h * 0.5, R = Math.min(w, h) * 0.4;
    for (let i = 1; i <= 4; i++) {
      ctx.strokeStyle = rgba(A, 0.14 + i * 0.12); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(-0.6, cx, cy);
      g.addColorStop(0, rgba(A, 0.55)); g.addColorStop(0.18, rgba(A, 0)); g.addColorStop(1, rgba(A, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const ly = y + h * 0.12 + i * h * 0.11, lx = x + w * 0.72;
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(lx + 40, ly - 6, w * 0.22 * (0.5 + r() * 0.5), 12);
      ctx.strokeStyle = i % 3 === 1 ? 'rgba(255,255,255,.5)' : A; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 9, ly + 9); ctx.lineTo(lx + 24, ly - 9); ctx.stroke();
    }
  },
  // oscillating energy field
  wave(ctx, x, y, w, h, A) {
    for (let k = 0; k < 14; k++) {
      ctx.strokeStyle = k === 7 ? A : rgba(A, 0.08 + k * 0.025);
      ctx.lineWidth = k === 7 ? 4 : 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = i / 120, px = x + t * w;
        const py = y + h * 0.5 + Math.sin(t * Math.PI * 4 + k * 0.35) * h * 0.32 * Math.sin(t * Math.PI) * (0.4 + k / 20);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  },
  // nested shield outlines with a check mark
  shield(ctx, x, y, w, h, A) {
    const cx = x + w / 2, cy = y + h * 0.48;
    const path = (s) => {
      const sw = h * 0.42 * s, top = cy - h * 0.46 * s, bot = cy + h * 0.46 * s;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.quadraticCurveTo(cx + sw, top + h * 0.06 * s, cx + sw, top + h * 0.2 * s);
      ctx.quadraticCurveTo(cx + sw, bot - h * 0.22 * s, cx, bot);
      ctx.quadraticCurveTo(cx - sw, bot - h * 0.22 * s, cx - sw, top + h * 0.2 * s);
      ctx.quadraticCurveTo(cx - sw, top + h * 0.06 * s, cx, top);
    };
    for (let i = 5; i >= 1; i--) { path(i / 5); ctx.strokeStyle = rgba(A, i === 5 ? 1 : 0.15 + i * 0.1); ctx.lineWidth = i === 5 ? 4 : 1.5; ctx.stroke(); }
    ctx.strokeStyle = A; ctx.lineWidth = 7; ctx.beginPath();
    ctx.moveTo(cx - h * 0.14, cy); ctx.lineTo(cx - h * 0.03, cy + h * 0.1); ctx.lineTo(cx + h * 0.16, cy - h * 0.1); ctx.stroke();
  },
  // low-poly crystal facets
  facets(ctx, x, y, w, h, A, r) {
    const cx = x + w / 2, cy = y + h * 0.52;
    const pts = [[0, -0.48], [0.3, -0.2], [0.36, 0.18], [0.1, 0.46], [-0.24, 0.38], [-0.38, 0.02], [-0.22, -0.3]].map(([a, b]) => [cx + a * h, cy + b * h]);
    const core = [cx + h * 0.02, cy - h * 0.02];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      ctx.fillStyle = rgba(A, 0.1 + r() * 0.35);
      ctx.beginPath(); ctx.moveTo(core[0], core[1]); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(A, 0.9); ctx.lineWidth = 2; ctx.stroke();
    });
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${r() * 0.5})`; ctx.fillRect(x + r() * w, y + r() * h, 2, 2); }
  },
};

/** A credential card: dark panel in a thin bezel with index, title and a motif. */
export function makeCredentialCard(cred, i, n) {
  const W = 1600, H = 1000, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(19 + i * 37);
  const A = cred.accent;
  ctx.fillStyle = '#0b0b0d';
  rrect(ctx, 0, 0, W, H, 34); ctx.fill();
  const b = 16, x0 = b, y0 = b, w0 = W - b * 2, h0 = H - b * 2;
  ctx.save();
  rrect(ctx, x0, y0, w0, h0, 20); ctx.clip();

  // background: deep gradient, accent glow, fine grid, faint terminal text
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h0);
  g.addColorStop(0, '#0d1018'); g.addColorStop(1, '#05060a');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w0, h0);
  const rg = ctx.createRadialGradient(W * 0.78, H * 0.35, 0, W * 0.78, H * 0.35, W * 0.55);
  rg.addColorStop(0, rgba(A, 0.22)); rg.addColorStop(1, rgba(A, 0));
  ctx.fillStyle = rg; ctx.fillRect(x0, y0, w0, h0);
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for (let gx = x0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = y0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  ctx.font = `16px ${PIXEL}`; ctx.textBaseline = 'top';
  const chars = '0123456789ABCDEF.:/-+=#';
  for (let row = 0; row < 40; row++) {
    let s = '';
    for (let k = 0; k < 90; k++) s += r() < 0.18 ? ' ' : chars[Math.floor(r() * chars.length)];
    ctx.fillStyle = `rgba(255,255,255,${0.025 + r() * 0.03})`;
    ctx.fillText(s, x0 + 20, y0 + 20 + row * 24);
  }

  // header row
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `22px ${PIXEL}`;
  ctx.fillText('CREDENTIAL', x0 + 56, y0 + 50);
  ctx.textAlign = 'right';
  ctx.fillText(`${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, x0 + w0 - 56, y0 + 50);
  ctx.textAlign = 'left';
  ctx.fillStyle = A; ctx.fillRect(x0 + 56, y0 + 92, 64, 4);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x0 + 120, y0 + 93, w0 - 176, 2);

  // motif on the right
  ctx.save();
  ctx.shadowColor = rgba(A, 0.6); ctx.shadowBlur = 18;
  MOTIFS[cred.motif](ctx, x0 + w0 * 0.53, y0 + h0 * 0.2, w0 * 0.42, h0 * 0.68, A, r);
  ctx.restore();

  // title on the left, sized to fit
  const title = (cred.short || cred.title).toUpperCase();
  const maxW = w0 * 0.44;
  let size = 96, lines;
  for (;;) {
    ctx.font = `500 ${size}px ${TECH}`;
    lines = wrap(ctx, title, maxW);
    if ((lines.length <= 4 && lines.every((l) => ctx.measureText(l).width <= maxW)) || size < 40) break;
    size -= 4;
  }
  const lh = size * 1.02;
  const ty = y0 + h0 * 0.58 - (lines.length * lh) / 2;
  ctx.fillStyle = '#f2f3f5'; ctx.textBaseline = 'alphabetic';
  lines.forEach((l, k) => ctx.fillText(l, x0 + 56, ty + (k + 1) * lh));
  ctx.restore();

  // glass sheen
  const s = ctx.createLinearGradient(0, 0, W, H);
  s.addColorStop(0, 'rgba(255,255,255,.06)'); s.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = s; rrect(ctx, x0, y0, w0, h0, 20); ctx.fill();
  return c;
}

/* ------------------------------------------------------------------ */
/* Scene textures                                                       */
/* ------------------------------------------------------------------ */

/** Faint rows of glyphs for the white floor under the credential cards. */
export function glyphFloor() {
  const W = 1024, H = 1024, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(3);
  ctx.textBaseline = 'top';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=-/<>[]';
  for (let row = 0; row < 40; row++) {
    let x = r() * 60;
    const y = row * 26;
    ctx.font = `${12 + Math.floor(r() * 3) * 2}px ${PIXEL}`;
    while (x < W) {
      const len = 3 + Math.floor(r() * 12);
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(r() * chars.length)];
      ctx.fillStyle = `rgba(60,60,64,${0.12 + r() * 0.35})`;
      ctx.fillText(s, x, y);
      x += ctx.measureText(s).width + 14 + r() * 80;
    }
  }
  return c;
}

/** Paper lantern skin: warm stripes with ribs and a simple mark. */
export function lantern(seed = 1, white = false) {
  const r = rng(seed);
  const W = 256, H = 256, c = canvas(W, H), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (white) { g.addColorStop(0, '#fff1d6'); g.addColorStop(1, '#ffd29a'); } else { g.addColorStop(0, '#ff4a2a'); g.addColorStop(1, '#d4120c'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(80,0,0,.25)';
  for (let y = 0; y < H; y += 14) ctx.fillRect(0, y, W, 2);
  ctx.fillStyle = white ? 'rgba(160,20,10,.85)' : 'rgba(20,0,0,.75)';
  ctx.font = '900 72px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(['●', '◆', '✦', '■'][Math.floor(r() * 4)], W * 0.5, H * 0.5);
  return c;
}

/** Soft radial glow. */
export function glow(inner, outer = 'rgba(0,0,0,0)', size = 256) {
  const c = canvas(size, size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}
