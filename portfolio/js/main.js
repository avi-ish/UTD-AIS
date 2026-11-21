import { createHero } from './hero.js';
import { PROJECTS } from './projects.js';
import { thumbURL } from './art.js';
import { reduceMotion, finePointer, scramble, setupHoverScramble, setupCursor, setupMenu, setupBot } from './ui.js';

const $ = (sel) => document.querySelector(sel);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => x * x * (3 - 2 * x);

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = `©${new Date().getFullYear()}`; });

/* ---- shared pointer ---- */
const input = { x: innerWidth / 2, y: innerHeight / 2, active: false, last: 0, inside: false };
const setPtr = (e) => {
  if (e.clientX === 0 && e.clientY === 0 && !input.active) return; // synthetic event with no position yet
  input.x = e.clientX; input.y = e.clientY;
  input.active = true; input.inside = true; input.last = performance.now();
};
addEventListener('pointermove', setPtr, { passive: true });
addEventListener('pointerdown', setPtr, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { input.active = false; input.inside = false; });
addEventListener('blur', () => { input.active = false; input.inside = false; });

/* ---- hero ---- */
const heroCanvas = $('#hero');
const labelTitle = $('[data-label-title]');
const hero = createHero(heroCanvas, input, {
  reduceMotion,
  finePointer,
  onGlitch() {
    if (label.dataset.mode !== 'hero') return;
    labelTitle.classList.remove('is-glitch');
    void labelTitle.offsetWidth;
    labelTitle.classList.add('is-glitch');
  },
});
if (!hero) document.documentElement.classList.add('no-gl');

// drag & drop your own portrait
let dragDepth = 0;
addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; document.body.classList.add('is-dragging'); });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('is-dragging'); } });
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('is-dragging');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!f || !/^(image|video)\//.test(f.type) || !hero) return;
  hero.useMedia(URL.createObjectURL(f), f.type.startsWith('video/'));
});

/* ---- DOM ---- */
const label = $('.label');
const list = $('.label__list');
const tagline = $('.tagline');
const about = $('.copy--about');
const clients = $('.copy--clients');
const contact = $('.contact');
const foot = $('.foot');
const detailEl = $('#detail');

PROJECTS.forEach((p, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = `[${String(i + 1).padStart(2, '0')}] ${p.name}`;
  b.addEventListener('click', () => openDetail(i, b));
  li.append(b);
  list.append(li);
});

setupHoverScramble();
setupCursor();
const bot = setupBot();
const menu = setupMenu({ onNavigate: goto });

// intro type
[...document.querySelectorAll('.bar [data-scramble]'), labelTitle, tagline].forEach((el, i) => {
  setTimeout(() => scramble(el, el === tagline ? 1100 : 800), 250 + i * 90);
});

/* ---- world (Three.js) is loaded after the fonts, since the covers draw text ---- */
let world = null, TL = { end: 11.2, growEnd: 5.6, hallEnd: 8, mixEnd: 8, fallEnd: 9.6, diveEnd: 10.2 };
$('.scroll-space').style.height = `${(TL.end + 1) * 100}vh`;
(async () => {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('16px Silkscreen'), document.fonts.load('500 16px "Chakra Petch"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    const mod = await import('./world.js');
    TL = mod.TL;
    $('.scroll-space').style.height = `${(TL.end + 1) * 100}vh`;
    world = mod.createWorld($('#world'), { heroCanvas, projects: PROJECTS });
  } catch (err) {
    console.error(err);
  }
})();

/* ---- navigation ---- */
const SPOTS = { 0: 0, work: 1.0, about: 6.1, clients: 8.4, contact: 10.9 };
function goto(where) {
  if (detail.open) closeDetail();
  const s = SPOTS[where] ?? 0;
  scrollTo({ top: s * innerHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a || a.closest('.menu')) return;
  e.preventDefault();
  if (a.closest('.bubble')) bot.close();
  goto(a.dataset.goto);
});

/* ---- project detail ---- */
const detail = { open: false, amt: 0, index: 0, opener: null };
const dName = $('.detail__name'), dText = $('.detail__text'), dRole = $('.detail__role'), dThumbs = $('.detail__thumbs'), dCount = $('.detail__count');

function fillDetail(i) {
  const p = PROJECTS[i];
  const canvases = world.detail.open(i);
  dName.textContent = p.name;
  dText.textContent = p.info;
  dRole.textContent = p.role.join('\n');
  dCount.textContent = `${String(i + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}`;
  dThumbs.innerHTML = '';
  canvases.forEach((c, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `Screen ${k + 1}`);
    b.style.backgroundImage = `url(${thumbURL(c)})`;
    b.addEventListener('click', () => world.detail.go(k));
    dThumbs.append(b);
  });
  scramble(dName, 600, p.name);
}

function openDetail(i, opener) {
  if (!world) return;
  detail.index = i;
  detail.opener = opener || null;
  fillDetail(i);
  detail.open = true;
  detailEl.hidden = false;
  document.body.classList.add('detail-open');
  requestAnimationFrame(() => detailEl.classList.add('is-open'));
  $('.detail__close').focus({ preventScroll: true });
}
function closeDetail() {
  detail.open = false;
  detailEl.classList.remove('is-open');
  document.body.classList.remove('detail-open');
  setTimeout(() => { if (!detail.open) detailEl.hidden = true; }, 500);
  if (detail.opener) detail.opener.focus({ preventScroll: true });
}
$('.detail__close').addEventListener('click', closeDetail);
$('.detail__prev').addEventListener('click', () => { detail.index = (detail.index + PROJECTS.length - 1) % PROJECTS.length; fillDetail(detail.index); });
$('.detail__next').addEventListener('click', () => { detail.index = (detail.index + 1) % PROJECTS.length; fillDetail(detail.index); });

let wheelAcc = 0, wheelAt = 0;
addEventListener('wheel', (e) => {
  if (!detail.open) return;
  e.preventDefault();
  wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  const now = performance.now();
  if (Math.abs(wheelAcc) > 40 && now - wheelAt > 320) {
    world.detail.nudge(Math.sign(wheelAcc));
    wheelAcc = 0; wheelAt = now;
  }
}, { passive: false });
let dragX = null;
detailEl.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) dragX = e.clientX; });
addEventListener('pointerup', (e) => {
  if (dragX === null || !detail.open) { dragX = null; return; }
  const dx = e.clientX - dragX;
  if (Math.abs(dx) > 40) world.detail.nudge(dx < 0 ? 1 : -1);
  dragX = null;
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (detail.open) closeDetail();
    else if (menu.open) menu.close();
    if (bot.open) bot.close();
  }
  if (detail.open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) world.detail.nudge(e.key === 'ArrowRight' ? 1 : -1);
});

// clicking a card in Selected Work
const worldCanvas = $('#world');
worldCanvas.addEventListener('click', () => {
  if (!world || detail.open) return;
  // wait a frame so the hover test has seen this pointer position (touch)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const i = world.hoveredProject;
    if (i >= 0) openDetail(i, list.children[i].firstChild);
  }));
});

/* ---- scroll-driven UI ---- */
let mode = 'hero', active = -1, aboutOn = false, clientsOn = false, contactOn = false;
function setMode(m) {
  if (m === mode) return;
  mode = m;
  label.classList.toggle('is-hidden', m === 'none');
  if (m === 'none') return;
  label.dataset.mode = m;
  scramble(labelTitle, 650, m === 'hero' ? 'YOUR NAME' : 'SELECTED WORK');
  if (m === 'work') list.querySelectorAll('button').forEach((b, i) => setTimeout(() => scramble(b, 500), i * 70));
}

function placeCopy(el, s, s0, s1, wasOn) {
  const p = (s - s0) / (s1 - s0);
  const on = p > -0.08 && p < 1.05;
  if (on !== wasOn) {
    el.classList.toggle('is-on', on);
    if (on) el.querySelectorAll('[data-scramble]').forEach((x, i) => setTimeout(() => scramble(x, 600), i * 120));
  }
  if (!on) return false;
  const h = el.offsetHeight, pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 32;
  const yStart = innerHeight - h - pad * 1.6, yEnd = pad * 2.4;
  const k = clamp01(p / 0.85);
  let y = yStart + (yEnd - yStart) * ease(k);
  if (p > 0.85) y -= (p - 0.85) * innerHeight * 1.2;
  el.style.transform = `translate3d(0, ${y}px, 0)`;
  el.style.opacity = String(clamp01((p + 0.08) / 0.12) * (1 - clamp01((p - 0.92) / 0.1)));
  return true;
}

/* ---- loop ---- */
let s = scrollY / innerHeight, last = performance.now();
addEventListener('resize', () => { hero && hero.resize(); world && world.resize(); });

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  const sTarget = scrollY / innerHeight;
  const prev = s;
  s += (sTarget - s) * (1 - Math.exp(-dt * (reduceMotion ? 30 : 9)));
  if (Math.abs(sTarget - s) < 1e-4) s = sTarget;
  const vel = (s - prev) / Math.max(dt, 1e-3);

  detail.amt += ((detail.open ? 1 : 0) - detail.amt) * (1 - Math.exp(-dt * 6));
  if (Math.abs((detail.open ? 1 : 0) - detail.amt) < 0.004) detail.amt = detail.open ? 1 : 0;

  // which canvas is on screen
  const heroOnly = s < 0.004 && detail.amt === 0;
  if (hero && s < 1.7 && detail.amt < 1) hero.render(t, dt);
  heroCanvas.classList.toggle('is-off', !heroOnly || !hero);
  document.body.classList.toggle('is-hero', s < 0.25 && !detail.open);

  if (world && (!heroOnly || !hero)) {
    const hx = (input.x / innerWidth) * 2 - 1, hy = (input.y / innerHeight) * 2 - 1;
    const pointer = {
      // parallax only follows a mouse; a finger would leave the camera skewed after a tap
      nx: input.inside && finePointer ? hx : 0,
      ny: input.inside && finePointer ? hy : 0,
      hx, hy,
      inside: input.inside && !detail.open && !menu.open,
    };
    world.frame(t, dt, { s: Math.min(s, TL.end), vel, pointer, detail: { amt: detail.amt }, reduceMotion });
    const hov = world.hoveredProject >= 0 && !detail.open;
    worldCanvas.classList.toggle('is-pointer', hov);
  }

  // left label + tagline
  setMode(detail.open ? 'none' : s < 0.5 ? 'hero' : s < (TL.growEnd - 0.45) ? 'work' : 'none');
  tagline.classList.toggle('is-hidden', s > 0.3 || detail.open);
  if (s < 0.6 && !tagline.classList.contains('is-hidden') && tagline._wasHidden) scramble(tagline, 700);
  tagline._wasHidden = tagline.classList.contains('is-hidden');
  const r = Math.min(s, 5);
  const a = r < 0.5 ? -1 : Math.max(0, Math.min(PROJECTS.length - 1, Math.round(r) - 1));
  if (a !== active) {
    active = a;
    [...list.children].forEach((li, i) => li.classList.toggle('is-active', i === a));
  }

  // section copy
  const hide = detail.open;
  aboutOn = placeCopy(about, hide ? -99 : s, TL.growEnd - 0.1, TL.hallEnd - 0.15, aboutOn);
  clientsOn = placeCopy(clients, hide ? -99 : s, TL.mixEnd - 0.05, TL.fallEnd + 0.1, clientsOn);
  const c = hide ? 0 : clamp01((s - (TL.diveEnd - 0.05)) / 0.35);
  if ((c > 0) !== contactOn) {
    contactOn = c > 0;
    contact.classList.toggle('is-on', contactOn);
    foot.classList.toggle('is-on', contactOn);
    if (contactOn) contact.querySelectorAll('[data-scramble]').forEach((x, i) => setTimeout(() => scramble(x, 500), i * 80));
  }
  contact.style.opacity = String(c);
  contact.style.transform = `translate(-50%, ${-46 + (1 - c) * 6}%)`;
  foot.style.opacity = String(c);

  // thumbs follow the carousel
  if (detail.open && world) {
    const k = world.detail.index;
    [...dThumbs.children].forEach((b, i) => b.setAttribute('aria-selected', String(i === k)));
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
