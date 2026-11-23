// Generated artwork, drawn with Canvas 2D at runtime (no image files):
// the issuer cards on the drum, one screen per certification for the
// viewer, and the faint glyph floor under the cards.

// the page's one family (loaded by tokens.css before the cards are drawn)
const PIXEL = '"Spline Sans Mono", ui-monospace, monospace';
const TECH = PIXEL;

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
  // a document page beside a slide, for office software
  pages(ctx, x, y, w, h, A, r) {
    const pw = h * 0.62, ph = h * 0.86, px = x + w * 0.04, py = y + h * 0.06;
    ctx.fillStyle = 'rgba(255,255,255,.05)'; rrect(ctx, px, py, pw, ph, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; rrect(ctx, px, py, pw, ph, 12); ctx.stroke();
    ctx.fillStyle = A; ctx.fillRect(px + 28, py + 34, pw * 0.5, 10);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.16 + r() * 0.2})`;
      ctx.fillRect(px + 28, py + 70 + i * (ph - 100) / 12, (pw - 56) * (i % 4 === 3 ? 0.55 : 0.8 + r() * 0.2), 5);
    }
    const sw = w * 0.56, sh = sw * 0.62, sx = x + w - sw - w * 0.02, sy = y + h * 0.3;
    ctx.fillStyle = '#0d1018'; rrect(ctx, sx, sy, sw, sh, 12); ctx.fill();
    ctx.strokeStyle = A; ctx.lineWidth = 3; rrect(ctx, sx, sy, sw, sh, 12); ctx.stroke();
    ctx.fillStyle = A; ctx.fillRect(sx + 26, sy + 28, sw * 0.42, 12);
    for (let i = 0; i < 5; i++) {
      const bh = sh * (0.14 + r() * 0.36);
      ctx.fillStyle = rgba(A, 0.35 + i * 0.13);
      ctx.fillRect(sx + sw * 0.52 + i * sw * 0.085, sy + sh - 26 - bh, sw * 0.06, bh);
    }
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(sx + 26, sy + 68 + i * 24, sw * 0.36, 5); }
  },
  // bracketed blocks of code
  code(ctx, x, y, w, h, A, r) {
    ctx.font = `400 ${Math.round(h * 0.34)}px ${PIXEL}`; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(A, 0.9);
    ctx.fillText('{', x, y + h * 0.48);
    const cw = ctx.measureText('}').width;
    ctx.fillText('}', x + w - cw, y + h * 0.48);
    let ly = y + h * 0.12, indent = 0;
    for (let i = 0; i < 11; i++) {
      const lx = x + cw * 1.3 + indent * 34;
      const parts = 1 + Math.floor(r() * 3);
      let cx = lx;
      for (let k = 0; k < parts; k++) {
        const len = (w - cw * 2.6 - indent * 34) * (0.16 + r() * 0.3);
        if (cx + len > x + w - cw * 1.3) break;
        ctx.fillStyle = k === 0 && i % 3 === 0 ? A : `rgba(255,255,255,${0.2 + r() * 0.3})`;
        ctx.fillRect(cx, ly, len, 12);
        cx += len + 16;
      }
      ly += h * 0.072;
      indent = Math.max(0, Math.min(3, indent + (r() < 0.4 ? 1 : r() < 0.5 ? -1 : 0)));
    }
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

/** A certification card: dark panel in a thin bezel, the issuer large, its certifications listed, a motif. */
export function makeCredentialCard(cred, i) {
  const W = 1600, H = 1000, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(19 + i * 37);
  const A = cred.accent;
  ctx.fillStyle = '#0b0c10';
  rrect(ctx, 0, 0, W, H, 34); ctx.fill();
  const b = 16, x0 = b, y0 = b, w0 = W - b * 2, h0 = H - b * 2;
  ctx.save();
  rrect(ctx, x0, y0, w0, h0, 20); ctx.clip();

  // background: deep gradient, accent bloom, fine grid, faint terminal text
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h0);
  g.addColorStop(0, '#0e1119'); g.addColorStop(1, '#06070b');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w0, h0);
  const rg = ctx.createRadialGradient(W * 0.78, H * 0.35, 0, W * 0.78, H * 0.35, W * 0.55);
  rg.addColorStop(0, rgba(A, 0.2)); rg.addColorStop(1, rgba(A, 0));
  ctx.fillStyle = rg; ctx.fillRect(x0, y0, w0, h0);
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for (let gx = x0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = y0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  ctx.font = `16px ${PIXEL}`; ctx.textBaseline = 'top';
  const chars = '0123456789abcdef.:/-+=';
  for (let row = 0; row < 40; row++) {
    let s = '';
    for (let k = 0; k < 90; k++) s += r() < 0.2 ? ' ' : chars[Math.floor(r() * chars.length)];
    ctx.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.025})`;
    ctx.fillText(s, x0 + 20, y0 + 20 + row * 24);
  }

  // top row: how many, in plain words
  const n = cred.items.length;
  ctx.fillStyle = 'rgba(236,238,242,.62)'; ctx.font = `400 26px ${PIXEL}`;
  ctx.fillText(n === 1 ? '1 certification' : `${n} certifications`, x0 + 64, y0 + 56);
  ctx.fillStyle = A; ctx.fillRect(x0 + 64, y0 + 104, 72, 4);

  // motif on the right
  ctx.save();
  ctx.shadowColor = rgba(A, 0.55); ctx.shadowBlur = 16;
  MOTIFS[cred.motif](ctx, x0 + w0 * 0.56, y0 + h0 * 0.2, w0 * 0.39, h0 * 0.64, A, r);
  ctx.restore();

  // the issuer, large, sized to fit the left column
  const maxW = w0 * 0.48;
  let size = 104, lines;
  for (;;) {
    ctx.font = `600 ${size}px ${TECH}`;
    lines = wrap(ctx, cred.issuer, maxW);
    if ((lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxW)) || size < 48) break;
    size -= 4;
  }
  const lh = size * 1.05;
  let y = y0 + 190;
  ctx.fillStyle = '#f1f2f5'; ctx.textBaseline = 'alphabetic';
  lines.forEach((l) => { y += lh; ctx.fillText(l, x0 + 64, y); });

  // the certifications under it
  y += 56;
  const fs = n > 4 ? 30 : 34;
  ctx.font = `400 ${fs}px ${PIXEL}`;
  cred.items.forEach((item) => {
    wrap(ctx, item, maxW).forEach((l) => {
      ctx.fillStyle = 'rgba(236,238,242,.86)';
      ctx.fillText(l, x0 + 64, y);
      y += fs * 1.45;
    });
  });

  // the cue that this card opens
  ctx.font = `600 28px ${PIXEL}`; ctx.textBaseline = 'alphabetic';
  const cue = n === 1 ? 'Open certification' : `Open all ${n}`;
  ctx.fillStyle = A; ctx.fillText(cue, x0 + 64, y0 + h0 - 64);
  ctx.fillRect(x0 + 64, y0 + h0 - 50, ctx.measureText(cue).width, 3);
  ctx.restore();

  // glass sheen
  const sh = ctx.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0, 'rgba(255,255,255,.05)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; rrect(ctx, x0, y0, w0, h0, 20); ctx.fill();
  return c;
}

/* ------------------------------------------------------------------ */
/* One screen per certification, for the viewer                         */
/* ------------------------------------------------------------------ */

// a guilloche rosette, the engraved pattern on banknotes and certificates
function rosette(ctx, cx, cy, R, A) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let k = 0; k < 3; k++) {
    const r0 = R * (1 - k * 0.24), amp = R * 0.11, lobes = 18 + k * 6;
    ctx.strokeStyle = rgba(A, 0.5 - k * 0.12); ctx.lineWidth = 1.4;
    for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      for (let i = 0; i <= 720; i++) {
        const t = (i / 720) * Math.PI * 2;
        const rr = r0 + amp * Math.sin(lobes * t + j * 0.5) * Math.cos(3 * t + j);
        i ? ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : ctx.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** One certification as a screen: the issuer, the name large, the dates and ID, a motif and a seal. */
export function makeCertSlide(cert, issuer, k, n) {
  const W = 1440, H = 900, c = canvas(W, H), ctx = c.getContext('2d');
  const A = issuer.accent, r = rng(101 + issuer.index * 53 + k * 17);
  ctx.fillStyle = '#0b0c10'; rrect(ctx, 0, 0, W, H, 30); ctx.fill();
  const b = 14, x0 = b, y0 = b, w0 = W - b * 2, h0 = H - b * 2;
  ctx.save();
  rrect(ctx, x0, y0, w0, h0, 18); ctx.clip();

  const g = ctx.createLinearGradient(0, y0, W, y0 + h0);
  g.addColorStop(0, '#10131c'); g.addColorStop(1, '#05060a');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w0, h0);
  const rg = ctx.createRadialGradient(W * 0.8, H * 0.42, 0, W * 0.8, H * 0.42, W * 0.5);
  rg.addColorStop(0, rgba(A, 0.24)); rg.addColorStop(1, rgba(A, 0));
  ctx.fillStyle = rg; ctx.fillRect(x0, y0, w0, h0);
  ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.lineWidth = 1;
  for (let gx = x0; gx < W; gx += 36) { ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = y0; gy < H; gy += 36) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

  // motif and seal on the right, each slide seeded differently
  ctx.save();
  ctx.globalAlpha = 0.85; ctx.shadowColor = rgba(A, 0.5); ctx.shadowBlur = 14;
  MOTIFS[issuer.motif](ctx, x0 + w0 * 0.6, y0 + h0 * 0.17, w0 * 0.34, h0 * 0.5, A, r);
  ctx.restore();
  rosette(ctx, x0 + w0 * 0.84, y0 + h0 * 0.8, 120, A);

  // top row: issuer and position
  const L = x0 + 72;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 30px ${PIXEL}`; ctx.fillStyle = A;
  ctx.fillText(cert.issuer || issuer.name, L, y0 + 92);
  ctx.font = `400 26px ${PIXEL}`; ctx.fillStyle = 'rgba(236,238,242,.55)';
  const pos = `${k + 1} of ${n}`;
  ctx.fillText(pos, x0 + w0 - 72 - ctx.measureText(pos).width, y0 + 92);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(L, y0 + 122, w0 - 144, 1);

  // the name, as large as fits the left column in three lines
  const maxW = w0 * 0.5;
  let size = 112, lines;
  for (;;) {
    ctx.font = `600 ${size}px ${TECH}`;
    lines = wrap(ctx, cert.short, maxW);
    if ((lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= maxW)) || size <= 44) break;
    size -= 4;
  }
  let y = y0 + 200;
  ctx.fillStyle = '#f2f3f6';
  lines.forEach((l) => { y += size * 1.04; ctx.fillText(l, L, y); });

  // the full name when it says more than the short one
  if (cert.name.toLowerCase() !== cert.short.toLowerCase()) {
    y += 52;
    ctx.font = `400 30px ${PIXEL}`; ctx.fillStyle = 'rgba(236,238,242,.7)';
    wrap(ctx, cert.name, maxW).slice(0, 3).forEach((l) => { ctx.fillText(l, L, y); y += 42; });
  }

  // dates and ID along the bottom
  const facts = [`Issued ${cert.issued}`];
  if (cert.expires) facts.push(`Expires ${cert.expires}`);
  if (cert.id) facts.push(`ID ${cert.id}`);
  ctx.font = `400 26px ${PIXEL}`;
  let fy = y0 + h0 - 72 - (facts.length - 1) * 38;
  facts.forEach((f, i) => {
    ctx.fillStyle = i ? 'rgba(236,238,242,.6)' : 'rgba(236,238,242,.88)';
    ctx.fillText(f, L, fy); fy += 38;
  });
  ctx.fillStyle = A; ctx.fillRect(L, y0 + h0 - 72 - (facts.length - 1) * 38 - 44, 64, 4);
  ctx.restore();

  const sh = ctx.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0, 'rgba(255,255,255,.06)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; rrect(ctx, x0, y0, w0, h0, 18); ctx.fill();
  return c;
}

/** A small copy of a slide for the thumbnail row. */
export function thumbOf(slide, w = 192) {
  const h = Math.round((w * slide.height) / slide.width);
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(slide, 0, 0, w, h);
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
