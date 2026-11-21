// Generated artwork: project covers and screens, plus the small textures the
// 3D scenes need (glyph floor, shutters, signs, softboxes, lanterns).
// Everything is drawn with Canvas 2D at runtime, so there are no image files.

const SANS = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
const PIXEL = 'Silkscreen, monospace';
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
function textBars(ctx, x, y, w, lines, lh, color, r) {
  ctx.fillStyle = color;
  for (let i = 0; i < lines; i++) {
    const lw = i === lines - 1 ? w * (0.35 + r() * 0.3) : w * (0.82 + r() * 0.18);
    ctx.fillRect(x, y + i * lh, lw, lh * 0.42);
  }
}
function condensed(ctx, text, x, y, size, weight, color, squeeze = 0.82, align = 'left') {
  ctx.save();
  ctx.font = `${weight} ${size}px ${SANS}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y);
  ctx.scale(squeeze, 1);
  ctx.textAlign = align;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Per-project visual language                                         */
/* ------------------------------------------------------------------ */

const PAINTERS = {
  // a bright indigo galaxy: orbits, planets, little ships
  orbit: {
    bg(ctx, x, y, w, h) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#0d0a3a'); g.addColorStop(0.55, '#2a1fa6'); g.addColorStop(1, '#4b39e6');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const rg = ctx.createRadialGradient(x + w * 0.7, y + h * 0.55, 0, x + w * 0.7, y + h * 0.55, w * 0.6);
      rg.addColorStop(0, 'rgba(120,180,255,.35)'); rg.addColorStop(1, 'rgba(120,180,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
    },
    art(ctx, x, y, w, h, r, zoom = 1) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`;
        const s = r() < 0.92 ? 1.5 : 3;
        ctx.fillRect(x + r() * w, y + r() * h, s, s);
      }
      const cx = x + w * 0.62, cy = y + h * 0.56;
      ctx.lineWidth = Math.max(1, w / 700);
      for (let i = 1; i <= 5; i++) {
        ctx.strokeStyle = `rgba(190,210,255,${0.32 - i * 0.04})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.09 * i * zoom, h * 0.05 * i * zoom, -0.32, 0, Math.PI * 2);
        ctx.stroke();
      }
      const planet = (px, py, pr, c1, c2, ring) => {
        const g = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
        g.addColorStop(0, c1); g.addColorStop(1, c2);
        if (ring) {
          ctx.strokeStyle = 'rgba(255,214,150,.9)'; ctx.lineWidth = pr * 0.16;
          ctx.beginPath(); ctx.ellipse(px, py, pr * 1.9, pr * 0.5, -0.35, Math.PI, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        if (ring) {
          ctx.beginPath(); ctx.ellipse(px, py, pr * 1.9, pr * 0.5, -0.35, 0, Math.PI); ctx.stroke();
        }
      };
      planet(cx, cy, w * 0.055 * zoom, '#ffd27a', '#ff6a3d', true);
      planet(x + w * 0.88, y + h * 0.22, w * 0.03 * zoom, '#9ff7ff', '#1aa0c8');
      planet(x + w * 0.34, y + h * 0.8, w * 0.04 * zoom, '#ffb3e6', '#a23fd6');
      planet(x + w * 0.45, y + h * 0.33, w * 0.018 * zoom, '#d8ffb0', '#36b86b');
      // comet
      const cg = ctx.createLinearGradient(x + w * 0.74, y + h * 0.3, x + w * 0.84, y + h * 0.12);
      cg.addColorStop(0, 'rgba(255,140,60,0)'); cg.addColorStop(1, 'rgba(255,220,120,1)');
      ctx.strokeStyle = cg; ctx.lineWidth = w / 180; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + w * 0.74, y + h * 0.3); ctx.lineTo(x + w * 0.84, y + h * 0.12); ctx.stroke();
      // little ships
      for (let i = 0; i < 4; i++) {
        const sx = x + w * (0.2 + r() * 0.6), sy = y + h * (0.25 + r() * 0.6), s = w / 90;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.4 + r() * 0.8);
        ctx.fillStyle = '#ff7a59'; ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 1.1); ctx.lineTo(0, s * 1.9); ctx.lineTo(s * 0.3, s * 1.1); ctx.fill();
        ctx.fillStyle = '#e9f6ff'; ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s * 0.55, s * 1.1); ctx.lineTo(-s * 0.55, s * 1.1); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    },
    title: 'Northstar Atlas',
    ink: '#ffffff',
    sub: 'rgba(220,230,255,.7)',
    accent: '#8fe3ff',
  },

  // soft grey studio with one dark sculpted blob
  monolith: {
    bg(ctx, x, y, w, h) {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#b7babe'); g.addColorStop(1, '#e6e7e9');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    },
    art(ctx, x, y, w, h, r, zoom = 1) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      const cx = x + w * 0.68, cy = y + h * 0.58, R = Math.min(w, h) * 0.34 * zoom;
      const a = r() * 6, b = r() * 6;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * Math.PI * 2;
        const rr = R * (1 + 0.16 * Math.sin(3 * t + a) + 0.07 * Math.sin(7 * t + b) + 0.03 * Math.sin(13 * t));
        const px = cx + Math.cos(t) * rr * 1.15, py = cy + Math.sin(t) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R * 1.25);
      g.addColorStop(0, '#5a5c60'); g.addColorStop(0.45, '#17181a'); g.addColorStop(1, '#030303');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      for (let i = 0; i < 4200; i++) {
        const px = cx + (r() - 0.5) * R * 2.6, py = cy + (r() - 0.5) * R * 2.2;
        ctx.fillStyle = `rgba(255,255,255,${r() * 0.12})`;
        ctx.fillRect(px, py, 2, 2);
      }
      ctx.restore();
      // grainy halo where the shape meets the background
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = w / 500;
      ctx.stroke();
      ctx.restore();
    },
    title: 'SHAPE WHAT’S NEXT.',
    ink: '#0b0b0c',
    sub: 'rgba(20,20,22,.55)',
    accent: '#0b0b0c',
  },

  // black stage, loud wordmark, gradient film stills
  framework: {
    bg(ctx, x, y, w, h) { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, y, w, h); },
    art(ctx, x, y, w, h, r) {
      const scenes = [
        (sx, sy, sw, sh) => { // sunset
          const g = ctx.createLinearGradient(0, sy, 0, sy + sh);
          g.addColorStop(0, '#ff5f6d'); g.addColorStop(0.6, '#ffc371'); g.addColorStop(0.61, '#2b1d3a'); g.addColorStop(1, '#0f0a18');
          ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
          ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.arc(sx + sw * 0.6, sy + sh * 0.58, sh * 0.16, Math.PI, 0); ctx.fill();
        },
        (sx, sy, sw, sh) => { // sea
          const g = ctx.createLinearGradient(0, sy, 0, sy + sh);
          g.addColorStop(0, '#9be7ff'); g.addColorStop(1, '#03506f');
          ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
          for (let i = 0; i < 7; i++) {
            ctx.beginPath();
            for (let k = 0; k <= 20; k++) {
              const px = sx + (k / 20) * sw, py = sy + sh * (0.45 + i * 0.08) + Math.sin(k * 0.9 + i) * sh * 0.015;
              k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
            }
            ctx.stroke();
          }
        },
        (sx, sy, sw, sh) => { // neon
          ctx.fillStyle = '#12001f'; ctx.fillRect(sx, sy, sw, sh);
          for (let i = 0; i < 3; i++) {
            const g = ctx.createRadialGradient(sx + sw * (0.2 + i * 0.3), sy + sh * (0.4 + (i % 2) * 0.25), 0, sx + sw * (0.2 + i * 0.3), sy + sh * (0.4 + (i % 2) * 0.25), sh * 0.6);
            g.addColorStop(0, ['#ff2bd6', '#2bd9ff', '#ffe02b'][i]); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
          }
        },
        (sx, sy, sw, sh) => { // desert
          ctx.fillStyle = '#f3b27a'; ctx.fillRect(sx, sy, sw, sh);
          ctx.fillStyle = '#d9824d';
          ctx.beginPath(); ctx.moveTo(sx, sy + sh * 0.7);
          ctx.quadraticCurveTo(sx + sw * 0.4, sy + sh * 0.45, sx + sw, sy + sh * 0.65); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx, sy + sh); ctx.fill();
          ctx.fillStyle = '#7a3b22'; ctx.fillRect(sx + sw * 0.7, sy + sh * 0.35, sw * 0.02, sh * 0.3);
        },
      ];
      const n = 3, gap = w * 0.02, tw = (w - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const fn = scenes[(i + Math.floor(r() * 4)) % scenes.length];
        ctx.save(); ctx.beginPath(); ctx.rect(x + i * (tw + gap), y, tw, h); ctx.clip();
        fn(x + i * (tw + gap), y, tw, h);
        ctx.restore();
      }
    },
    title: 'FRAMEWORK',
    ink: '#ffffff',
    sub: 'rgba(255,255,255,.55)',
    accent: '#ffffff',
  },

  // near-black plum with a glowing particle figure
  afterglow: {
    bg(ctx, x, y, w, h) {
      const g = ctx.createRadialGradient(x + w * 0.55, y + h * 0.5, 0, x + w * 0.55, y + h * 0.5, w * 0.7);
      g.addColorStop(0, '#2a0f38'); g.addColorStop(1, '#050208');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    },
    art(ctx, x, y, w, h, r, zoom = 1) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const cx = x + w * 0.58, cy = y + h * 0.52, S = Math.min(w, h) * 0.3 * zoom;
      for (let i = 0; i < 5200; i++) {
        const t = r() * Math.PI * 2, p = 2, q = 3;
        const rr = Math.cos(q * t) + 2;
        const jx = (r() - 0.5) * 0.35, jy = (r() - 0.5) * 0.35, jz = (r() - 0.5) * 0.35;
        const X = rr * Math.cos(p * t) + jx, Y = rr * Math.sin(p * t) + jy, Z = -Math.sin(q * t) + jz;
        const yaw = 0.6, px = X * Math.cos(yaw) + Z * Math.sin(yaw);
        const sx = cx + px * S / 3, sy = cy + (Y * 0.9 + Z * 0.25) * S / 3;
        const hue = (200 + t * 60 + Z * 40) % 360;
        ctx.fillStyle = `hsla(${hue},90%,${55 + r() * 25}%,${0.25 + r() * 0.4})`;
        const s = r() < 0.94 ? 1.6 : 3.2;
        ctx.fillRect(sx, sy, s, s);
      }
      ctx.restore();
    },
    title: 'AFTERGLOW',
    ink: '#f4ecff',
    sub: 'rgba(240,225,255,.6)',
    accent: '#d9a6ff',
  },
};

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

function navBar(ctx, P, x, y, w, h, r, name) {
  ctx.fillStyle = P.ink;
  ctx.font = `700 ${h * 0.03}px ${SANS}`;
  ctx.textBaseline = 'top';
  ctx.fillText(name, x + w * 0.03, y + h * 0.035);
  ctx.font = `500 ${h * 0.022}px ${SANS}`;
  ['Work', 'About', 'Contact'].forEach((t, i) => {
    ctx.globalAlpha = 0.75;
    ctx.fillText(t, x + w * (0.66 + i * 0.075), y + h * 0.04);
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = P.ink; ctx.lineWidth = Math.max(1, h / 500);
  rrect(ctx, x + w * 0.89, y + h * 0.028, w * 0.08, h * 0.045, h * 0.022); ctx.stroke();
}

// variant: 0 cover, 1 grid, 2 split, 3 panels, 4 mobile
function paintScreen(ctx, project, x, y, w, h, variant, seed) {
  const P = PAINTERS[project.art];
  const r = rng(seed);
  P.bg(ctx, x, y, w, h);

  if (variant === 0) {
    P.art(ctx, x, y, w, h, r);
    if (project.art === 'framework') {
      ctx.font = `900 ${h * 0.33}px ${SANS}`;
      const fit = Math.min(0.78, (w * 0.94) / ctx.measureText(P.title).width);
      condensed(ctx, P.title, x + w * 0.03, y + h * 0.36, h * 0.33, 900, P.ink, fit);
      P.art(ctx, x + w * 0.03, y + h * 0.46, w * 0.94, h * 0.46, r);
    } else if (project.art === 'monolith') {
      condensed(ctx, 'SHAPE', x + w * 0.04, y + h * 0.36, h * 0.17, 900, P.ink);
      condensed(ctx, 'WHAT’S NEXT.', x + w * 0.04, y + h * 0.52, h * 0.17, 900, P.ink);
      textBars(ctx, x + w * 0.04, y + h * 0.6, w * 0.3, 2, h * 0.035, P.sub, r);
      ctx.strokeStyle = P.ink; ctx.lineWidth = h / 300;
      rrect(ctx, x + w * 0.04, y + h * 0.72, w * 0.13, h * 0.06, h * 0.03); ctx.stroke();
      ctx.fillStyle = P.ink; ctx.font = `700 ${h * 0.025}px ${SANS}`; ctx.textBaseline = 'middle';
      ctx.fillText('SEE HOW →', x + w * 0.055, y + h * 0.75);
    } else if (project.art === 'afterglow') {
      ctx.save();
      ctx.fillStyle = P.ink; ctx.font = `300 ${h * 0.11}px ${SANS}`; ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${h * 0.03}px`;
      ctx.fillText(P.title, x + w * 0.05, y + h * 0.2);
      ctx.restore();
      ctx.fillStyle = P.sub; ctx.font = `500 ${h * 0.025}px ${SANS}`;
      ctx.fillText('A NEW SCENT FOR LATE HOURS', x + w * 0.05, y + h * 0.27);
    } else {
      ctx.fillStyle = P.ink; ctx.font = `italic 800 ${h * 0.11}px ${SANS}`; ctx.textBaseline = 'alphabetic';
      ctx.fillText(P.title, x + w * 0.04, y + h * 0.16);
      textBars(ctx, x + w * 0.04, y + h * 0.3, w * 0.2, 5, h * 0.03, P.sub, r);
    }
    if (project.art !== 'framework') navBar(ctx, P, x, y, w, h, r, project.name.split(' ')[0]);
    return;
  }

  navBar(ctx, P, x, y, w, h, r, project.name.split(' ')[0]);

  if (variant === 1) {
    condensed(ctx, ['Explore', 'Work', 'Archive', 'Stops'][seed % 4], x + w * 0.04, y + h * 0.24, h * 0.13, 900, P.ink, 0.85);
    const cols = 4, rows = 2, gx = w * 0.04, gy = y + h * 0.34, gw = w * 0.92, gap = w * 0.015;
    const tw = (gw - gap * (cols - 1)) / cols, th = tw * 0.62;
    for (let i = 0; i < cols * rows; i++) {
      const tx = x + gx + (i % cols) * (tw + gap), ty = gy + Math.floor(i / cols) * (th + gap * 2.2);
      ctx.save(); ctx.beginPath(); ctx.rect(tx, ty, tw, th); ctx.clip();
      P.bg(ctx, tx, ty, tw, th);
      P.art(ctx, tx - tw * 0.2, ty - th * 0.1, tw * 1.4, th * 1.3, r, 0.8);
      ctx.restore();
      textBars(ctx, tx, ty + th + gap * 0.6, tw * 0.6, 1, h * 0.02, P.sub, r);
    }
  } else if (variant === 2) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + h * 0.1, w * 0.62, h * 0.9); ctx.clip();
    P.art(ctx, x - w * 0.15, y, w * 0.95, h * 1.1, r, 1.5);
    ctx.restore();
    ctx.fillStyle = P.ink; ctx.font = `800 ${h * 0.06}px ${SANS}`; ctx.textBaseline = 'top';
    ctx.fillText(['Up close', 'The idea', 'Process', 'In motion'][seed % 4], x + w * 0.67, y + h * 0.22);
    textBars(ctx, x + w * 0.67, y + h * 0.34, w * 0.28, 7, h * 0.034, P.sub, r);
    ctx.strokeStyle = P.ink; ctx.lineWidth = h / 400;
    rrect(ctx, x + w * 0.67, y + h * 0.66, w * 0.12, h * 0.055, h * 0.027); ctx.stroke();
  } else if (variant === 3) {
    const pw = w * 0.28, ph = h * 0.5, py = y + h * 0.28;
    ctx.fillStyle = P.ink; ctx.font = `700 ${h * 0.045}px ${SANS}`; ctx.textBaseline = 'top';
    ctx.fillText(['Flight deck', 'Overview', 'Signals', 'Live'][seed % 4], x + w * 0.5 - h * 0.12, y + h * 0.13);
    for (let i = 0; i < 3; i++) {
      const px = x + w * 0.06 + i * (pw + w * 0.04);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = project.art === 'monolith' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.08)';
      rrect(ctx, px, py, pw, ph, h * 0.02); ctx.fill();
      ctx.strokeStyle = P.sub; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const vx = px + pw * 0.08 + (k / 24) * pw * 0.84, vy = py + ph * (0.75 - 0.4 * r() * (0.5 + 0.5 * Math.sin(k * 0.5 + i)));
        k ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
      }
      ctx.stroke();
      textBars(ctx, px + pw * 0.08, py + ph * 0.08, pw * 0.5, 2, h * 0.03, P.sub, r);
      ctx.restore();
    }
  } else {
    // two phones
    for (let i = 0; i < 2; i++) {
      const pw = h * 0.36, ph = h * 0.74, px = x + w * (0.3 + i * 0.24), py = y + h * 0.16 + i * h * 0.04;
      ctx.fillStyle = '#060606'; rrect(ctx, px - 8, py - 8, pw + 16, ph + 16, 34); ctx.fill();
      ctx.save(); rrect(ctx, px, py, pw, ph, 26); ctx.clip();
      P.bg(ctx, px, py, pw, ph);
      P.art(ctx, px - pw * 0.6, py, pw * 2.2, ph, r, 0.9);
      ctx.fillStyle = P.ink; ctx.font = `800 ${pw * 0.12}px ${SANS}`; ctx.textBaseline = 'top';
      ctx.fillText(project.name.split(' ')[0], px + pw * 0.08, py + ph * 0.07);
      ctx.restore();
    }
  }
}

/** Card for the Selected Work carousel: screen inside a dark rounded bezel. */
export function makeCover(project, seed = 7) {
  const W = 1600, H = 1000, c = canvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = '#060606';
  rrect(ctx, 0, 0, W, H, 46); ctx.fill();
  const b = 24;
  ctx.save();
  rrect(ctx, b, b, W - b * 2, H - b * 2, 20); ctx.clip();
  paintScreen(ctx, project, b, b, W - b * 2, H - b * 2, 0, seed);
  ctx.restore();
  // glass sheen
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; rrect(ctx, b, b, W - b * 2, H - b * 2, 20); ctx.fill();
  return c;
}

/** The 5 screens shown in a project's detail view. */
export function makeScreens(project) {
  return [0, 1, 2, 3, 4].map((v) => {
    const W = 1440, H = 900, c = canvas(W, H), ctx = c.getContext('2d');
    ctx.save(); rrect(ctx, 0, 0, W, H, 18); ctx.clip();
    paintScreen(ctx, project, 0, 0, W, H, v, 11 + v * 17);
    ctx.restore();
    return c;
  });
}

export function thumbURL(src, w = 160) {
  const h = Math.round(w * src.height / src.width), c = canvas(w, h);
  c.getContext('2d').drawImage(src, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.8);
}

/* ------------------------------------------------------------------ */
/* Scene textures                                                       */
/* ------------------------------------------------------------------ */

/** Faint rows of glyphs for the white Selected Work floor. */
export function glyphFloor() {
  const W = 1024, H = 1024, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(3);
  ctx.clearRect(0, 0, W, H);
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

/** Roll-down shutter. */
export function shutter(seed = 1) {
  const W = 256, H = 256, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(seed);
  const base = 40 + r() * 30;
  for (let y = 0; y < H; y += 8) {
    const v = base + (y % 16 ? 10 : 0);
    ctx.fillStyle = `rgb(${v + 30},${v * 0.6},${v * 0.5})`;
    ctx.fillRect(0, y, W, 8);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, y + 7, W, 1);
  }
  for (let i = 0; i < 30; i++) { // grime
    ctx.fillStyle = `rgba(0,0,0,${r() * 0.25})`;
    ctx.fillRect(r() * W, r() * H, 2 + r() * 30, 2 + r() * 50);
  }
  return c;
}

const SIGN_WORDS = ['OPEN', 'BAR', 'NO.7', 'LATE', 'TEA', 'NOODLE', 'GRILL', 'ROOMS', 'KARAOKE', 'SAKE', '24H', 'CAFE'];
/** Shop sign: a word or a vertical stack of blocks, lit from inside. */
export function sign(seed = 1, vertical = false) {
  const r = rng(seed);
  const W = vertical ? 128 : 512, H = vertical ? 512 : 160, c = canvas(W, H), ctx = c.getContext('2d');
  const palettes = [['#f6efe2', '#c4161c'], ['#c4161c', '#ffe9c8'], ['#1b1b1b', '#ff3b2f'], ['#ffd34a', '#1a0d05'], ['#ffffff', '#141414']];
  const [bg, fg] = palettes[Math.floor(r() * palettes.length)];
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (vertical) {
    const word = SIGN_WORDS[Math.floor(r() * SIGN_WORDS.length)];
    ctx.font = `900 ${W * 0.55}px ${SANS}`;
    const letters = word.slice(0, 5).split('');
    letters.forEach((ch, i) => ctx.fillText(ch, W / 2, 60 + i * ((H - 100) / Math.max(letters.length - 1, 1))));
  } else {
    const word = SIGN_WORDS[Math.floor(r() * SIGN_WORDS.length)];
    ctx.font = `900 ${H * 0.55}px ${SANS}`;
    ctx.fillText(word, W / 2, H / 2 + 4);
    ctx.beginPath(); ctx.arc(46, H / 2, 18, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/** Paper lantern: warm stripes with ribs. */
export function lantern(seed = 1, white = false) {
  const r = rng(seed);
  const W = 256, H = 256, c = canvas(W, H), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (white) { g.addColorStop(0, '#fff1d6'); g.addColorStop(1, '#ffd29a'); }
  else { g.addColorStop(0, '#ff4a2a'); g.addColorStop(1, '#d4120c'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(80,0,0,.25)';
  for (let y = 0; y < H; y += 14) ctx.fillRect(0, y, W, 2);
  ctx.fillStyle = white ? 'rgba(160,20,10,.85)' : 'rgba(20,0,0,.75)';
  ctx.font = `900 72px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(['●', '◆', '✦', '■'][Math.floor(r() * 4)], W * 0.5, H * 0.5);
  return c;
}

/** Softbox front: bright bars behind a black grid. */
export function softbox() {
  const W = 256, H = 160, c = canvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 10 + i * 16, W - 20, 10);
  }
  return c;
}

/** Big blurred gradient (used for nebula, glows). */
export function glow(inner, outer = 'rgba(0,0,0,0)', size = 256) {
  const c = canvas(size, size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}

export { TECH, PIXEL };
