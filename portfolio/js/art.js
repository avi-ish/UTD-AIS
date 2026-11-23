// Generated artwork, drawn with Canvas 2D at runtime (no image files): the
// issuer cards on the drum and one screen per certification for the viewer.
// Both are set like a data sheet: real names, dates and IDs in a quiet
// type hierarchy, one orange mark, nothing invented for decoration.

// the page's faces (loaded by tokens.css before anything is drawn)
const SANS = '"Spline Sans", system-ui, sans-serif';
const MONO = '"Spline Sans Mono", ui-monospace, monospace';
const ORANGE = '#ffa24c';
const INK = (a) => `rgba(238,240,244,${a})`;

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
/** Largest size (stepping down) at which `text` fits `maxW` in at most `maxLines` lines. */
function fit(ctx, text, font, maxW, maxLines, start, min) {
  let size = start, lines;
  for (;;) {
    ctx.font = font(size);
    lines = wrap(ctx, text, maxW);
    if ((lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) || size <= min) return { size, lines };
    size -= 2;
  }
}
const track = (ctx, em) => { if ('letterSpacing' in ctx) ctx.letterSpacing = em; };
const shortDate = (d) => (d ? `${d.slice(0, 3)} ${d.slice(-4)}` : '');

/** The dark surface both kinds of card sit on: a soft top light and a hairline edge. */
function surface(ctx, W, H, r) {
  ctx.save();
  rrect(ctx, 0, 0, W, H, r); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, '#181b21'); g.addColorStop(1, '#0d0f13');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const top = ctx.createRadialGradient(W * 0.3, -H * 0.2, 0, W * 0.3, -H * 0.2, W * 0.9);
  top.addColorStop(0, 'rgba(255,255,255,.055)'); top.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 2;
  rrect(ctx, 1, 1, W - 2, H - 2, r - 1); ctx.stroke();
}

function rule(ctx, x, y, w, a = 0.1) { ctx.fillStyle = INK(a); ctx.fillRect(x, y, w, 1.5); }

/**
 * An issuer's card on the drum: count and cue on top, the issuer large, then
 * its certifications as rows with their dates.
 * On phones the card is drawn with larger type, since it shows at a third of the size.
 * @param {{name:string, certs:{name:string, short:string, issued:string, id:string}[]}} iss
 */
export function makeCredentialCard(iss, { compact = false } = {}) {
  const W = 1600, H = 1000, P = 96, c = canvas(W, H), ctx = c.getContext('2d');
  const k = compact ? 1.45 : 1;
  surface(ctx, W, H, 36);
  const n = iss.certs.length;
  ctx.textBaseline = 'alphabetic';

  // top row
  ctx.font = `400 ${32 * k}px ${MONO}`; ctx.fillStyle = INK(0.6); track(ctx, '0px');
  ctx.fillText(n === 1 ? '1 certification' : `${n} certifications`, P, P + 26 * k);
  const cue = n === 1 ? 'Open' : `Open all ${n}`;
  ctx.font = `600 ${32 * k}px ${MONO}`; ctx.fillStyle = ORANGE;
  const cw = ctx.measureText(cue).width;
  ctx.fillText(cue, W - P - cw, P + 26 * k);
  ctx.fillRect(W - P - cw, P + 26 * k + 14, cw, 3 * k);

  // the issuer
  track(ctx, '-3px');
  const t = fit(ctx, iss.name, (s) => `600 ${s}px ${SANS}`, W - P * 2, 2, 150, 72);
  ctx.fillStyle = INK(0.97);
  let y = P + 40 + 20 * k;
  t.lines.forEach((l) => { y += t.size * 1.0; ctx.fillText(l, P - 4, y); });
  track(ctx, '0px');

  const bottom = H - P;
  if (n === 1) {
    // one certification: its full name and its facts
    const cert = iss.certs[0];
    const f = fit(ctx, cert.name, (s) => `400 ${s}px ${SANS}`, W - P * 2, 2, 54 * k, 36);
    const facts = [['Issued', cert.issued], cert.id ? ['Credential ID', cert.id] : null].filter(Boolean);
    const lh = f.size * 1.2, vy = bottom, ly = vy - 42 * k, last = ly - 72 * k;
    const first = last - (f.lines.length - 1) * lh;
    rule(ctx, P, first - f.size - 36, W - P * 2, 0.14);
    ctx.font = `400 ${f.size}px ${SANS}`; ctx.fillStyle = INK(0.9);
    f.lines.forEach((l, i) => ctx.fillText(l, P, first + i * lh));
    let fx = P;
    facts.forEach(([key, v]) => {
      ctx.font = `400 ${26 * k}px ${MONO}`; ctx.fillStyle = INK(0.5); ctx.fillText(key, fx, ly);
      ctx.font = `400 ${34 * k}px ${MONO}`; ctx.fillStyle = INK(0.88); ctx.fillText(v, fx, vy);
      fx += Math.max(380 * k, ctx.measureText(v).width + 96);
    });
    return c;
  }

  // several: a table of names and dates, filling the lower part of the card
  const rowH = Math.min(84 * k, Math.max(64, (bottom - (y + 70)) / n));
  let ry = bottom - rowH * n;
  rule(ctx, P, ry, W - P * 2, 0.16);
  iss.certs.forEach((cert, i) => {
    const mid = ry + rowH / 2 + 12 * k;
    const date = shortDate(cert.issued);
    ctx.font = `400 ${Math.min(30 * k, rowH * 0.5)}px ${MONO}`;
    const dw = ctx.measureText(date).width;
    ctx.fillStyle = INK(0.5); ctx.fillText(date, W - P - dw, mid);
    const nameW = W - P * 2 - dw - 48;
    const f = fit(ctx, cert.short, (s) => `400 ${s}px ${SANS}`, nameW, 1, Math.min(42 * k, rowH * 0.66), 28);
    ctx.fillStyle = INK(0.9); ctx.fillText(f.lines[0], P, mid);
    ry += rowH;
    if (i < n - 1) rule(ctx, P, ry, W - P * 2, 0.08);
  });
  return c;
}

/* ------------------------------------------------------------------ */
/* One screen per certification, for the viewer                         */
/* ------------------------------------------------------------------ */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// a calendar dial: twelve months round a ring, the month it was issued marked
function dial(ctx, cx, cy, R, issued) {
  const month = MONTHS.findIndex((m) => issued.startsWith(m));
  const year = issued.slice(-4);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = INK(0.14); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const r0 = R - (major ? 26 : 12), r1 = R - 4;
    ctx.strokeStyle = major ? INK(0.38) : INK(0.13); ctx.lineWidth = major ? 3 : 1.5;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
  }
  if (month >= 0) {
    const a = (month / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 34), Math.sin(a) * (R - 34)); ctx.lineTo(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4)); ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(Math.cos(a) * (R + 18), Math.sin(a) * (R + 18), 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.font = `400 22px ${MONO}`; ctx.fillStyle = INK(0.5);
  ctx.fillText(month >= 0 ? MONTHS[month] : '', 0, -26);
  ctx.font = `600 64px ${SANS}`; ctx.fillStyle = INK(0.92);
  ctx.fillText(year, 0, 40);
  ctx.restore();
}

/** One certification as a screen: the issuer, the name large, the facts in a row, a date dial. */
export function makeCertSlide(cert, issuer, k, n) {
  const W = 1440, H = 900, P = 88, c = canvas(W, H), ctx = c.getContext('2d');
  surface(ctx, W, H, 30);
  ctx.textBaseline = 'alphabetic';

  ctx.font = `400 28px ${MONO}`; ctx.fillStyle = INK(0.62);
  ctx.fillText(cert.issuer || issuer.name, P, P + 22);
  const pos = `${k + 1} of ${n}`;
  ctx.fillStyle = INK(0.45);
  ctx.fillText(pos, W - P - ctx.measureText(pos).width, P + 22);
  rule(ctx, P, P + 56, W - P * 2, 0.1);

  // the name, as large as fits beside the dial
  const colW = W * 0.6;
  track(ctx, '-2px');
  const t = fit(ctx, cert.short, (s) => `600 ${s}px ${SANS}`, colW, 3, 112, 52);
  let y = P + 100;
  ctx.fillStyle = INK(0.97);
  t.lines.forEach((l) => { y += t.size * 1.02; ctx.fillText(l, P - 3, y); });
  track(ctx, '0px');
  if (cert.name.toLowerCase() !== cert.short.toLowerCase()) {
    y += 30;
    ctx.font = `400 32px ${SANS}`; ctx.fillStyle = INK(0.62);
    wrap(ctx, cert.name, colW).slice(0, 2).forEach((l) => { y += 42; ctx.fillText(l, P, y); });
  }

  dial(ctx, W - P - 150, P + 250, 150, cert.issued);

  // the facts, as columns along the bottom
  const facts = [['Issued', cert.issued]];
  if (cert.expires) facts.push(['Expires', cert.expires]);
  if (cert.id) facts.push(['Credential ID', cert.id]);
  const fy = H - P;
  rule(ctx, P, fy - 100, W - P * 2, 0.12);
  let fx = P;
  facts.forEach(([key, v]) => {
    ctx.font = `400 25px ${MONO}`; ctx.fillStyle = INK(0.5); ctx.fillText(key, fx, fy - 46);
    ctx.font = `400 34px ${MONO}`; ctx.fillStyle = INK(0.92); ctx.fillText(v, fx, fy);
    fx += Math.max(320, ctx.measureText(v).width + 80);
  });
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
