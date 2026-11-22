import { createHero } from './hero.js';
import { CREDENTIALS } from './content.js';
import { makeCredentialCard } from './art.js';
import { TL, SPOTS, CARD_STEP } from './timeline.js';
import { reduceMotion, finePointer, scramble, setupHoverScramble, setupCursor, setupMenu, setupBot } from './ui.js';

const $ = (sel) => document.querySelector(sel);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => x * x * (3 - 2 * x);
const pad = (n) => String(n).padStart(2, '0');

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
$('.scroll-space').style.height = `${(TL.end + 1) * 100}vh`;

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

/* ---- DOM ---- */
const label = $('.label');
const labelTitle = $('[data-label-title]');
const list = $('.label__list');
const intro = $('.intro');
const about = $('.copy--about');
const exp = $('.tl');
const expItems = [...exp.querySelectorAll('.tl__item')];
const contact = $('.contact');
const foot = $('.foot');
const heroCanvas = $('#hero');
const worldCanvas = $('#world');

/* ---- hero ---- */
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

/* ---- credential list ---- */
CREDENTIALS.forEach((c, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span class="label__n">[${pad(i + 1)}]</span> <span>${c.title.toUpperCase()}</span>`;
  b.addEventListener('click', () => goTo(CARD_STEP * (i + 1)));
  li.append(b);
  list.append(li);
});

setupHoverScramble();
setupCursor();
const bot = setupBot();
const menu = setupMenu({ onNavigate: goto });

// intro type
[...document.querySelectorAll('.bar [data-scramble]'), labelTitle, $('.intro__lead')].forEach((el, i) => {
  setTimeout(() => scramble(el, el.classList.contains('intro__lead') ? 1200 : 800), 250 + i * 90);
});

/* ---- 3D world, loaded after the fonts since the cards draw text ---- */
let world = null;
(async () => {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('16px Silkscreen'), document.fonts.load('500 16px "Chakra Petch"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    const cards = CREDENTIALS.map((c, i) => makeCredentialCard(c, i, CREDENTIALS.length));
    const mod = await import('./world.js');
    world = mod.createWorld(worldCanvas, { heroCanvas, cards });
  } catch (err) {
    console.error(err);
  }
  if (!world) document.documentElement.classList.add('no-world');
})();

/* ---- navigation ---- */
function goTo(s) { scrollTo({ top: s * innerHeight, behavior: reduceMotion ? 'auto' : 'smooth' }); }
function goto(where) {
  if (where === 'credentials') return goTo(CARD_STEP);
  goTo(SPOTS[where] ?? 0);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a || a.closest('.menu')) return;
  e.preventDefault();
  if (a.closest('.bubble')) bot.close();
  goto(a.dataset.goto);
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (menu.open) menu.close();
  if (bot.open) bot.close();
});

// clicking a floating card centres it
worldCanvas.addEventListener('click', () => {
  if (!world) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const i = world.hoveredCard;
    if (i >= 0) goTo(CARD_STEP * (i + 1));
  }));
});

/* ---- scroll-driven overlays ---- */
let mode = 'hero', active = -1, aboutOn = false, expOn = false, contactOn = false, introHidden = false;

function setMode(m) {
  if (m === mode) return;
  mode = m;
  label.classList.toggle('is-hidden', m === 'none');
  if (m === 'none') return;
  label.dataset.mode = m;
  scramble(labelTitle, 650, m === 'hero' ? 'AVI PANDYA' : 'SELECTED CREDENTIALS');
  if (m === 'work') list.querySelectorAll('button span:last-child').forEach((b, i) => setTimeout(() => scramble(b, 500), i * 45));
}

function reveal(el, on, was) {
  if (on !== was) {
    el.classList.toggle('is-on', on);
    if (on) el.querySelectorAll('[data-scramble]').forEach((x, i) => setTimeout(() => scramble(x, 600), i * 120));
  }
  return on;
}

// short blocks: enter at the bottom-left, rise to the top, then leave
function placeCopy(el, s, s0, s1, was) {
  const p = (s - s0) / (s1 - s0);
  const on = reveal(el, p > -0.08 && p < 1.05, was);
  if (!on) return false;
  const h = el.offsetHeight, padPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 32;
  const yStart = innerHeight - h - padPx * 1.6, yEnd = padPx * 2.4;
  let y = yStart + (yEnd - yStart) * ease(clamp01(p / 0.85));
  if (p > 0.85) y -= (p - 0.85) * innerHeight * 1.2;
  el.style.transform = `translate3d(0, ${y}px, 0)`;
  el.style.opacity = String(clamp01((p + 0.08) / 0.12) * (1 - clamp01((p - 0.92) / 0.1)));
  return true;
}

// the timeline is taller than the screen: it scrolls through at its own pace
function placeTimeline(s, s0, s1, was) {
  const p = (s - s0) / (s1 - s0);
  const on = reveal(exp, p > -0.05 && p < 1.05, was);
  if (!on) return false;
  const h = exp.offsetHeight;
  const y = innerHeight * 0.72 + (innerHeight * 0.18 - h - innerHeight * 0.72) * clamp01(p);
  exp.style.transform = `translate3d(0, ${y}px, 0)`;
  exp.style.opacity = String(clamp01((p + 0.05) / 0.08) * (1 - clamp01((p - 0.95) / 0.1)));
  // highlight the entry nearest the middle of the screen
  const mid = innerHeight * 0.48;
  let best = -1, bestD = Infinity;
  expItems.forEach((it, i) => {
    const r = it.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - mid);
    if (d < bestD) { bestD = d; best = i; }
  });
  expItems.forEach((it, i) => it.classList.toggle('is-active', i === best));
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

  // which canvas is on screen
  const heroOnly = s < 0.004;
  if (hero && s < 1.6) hero.render(t, dt);
  heroCanvas.classList.toggle('is-off', !heroOnly || !hero);
  document.body.classList.toggle('is-hero', s < 0.25);
  document.documentElement.classList.toggle('is-scrolled', s > 0.3);

  if (world && (!heroOnly || !hero)) {
    const hx = (input.x / innerWidth) * 2 - 1, hy = (input.y / innerHeight) * 2 - 1;
    world.frame(t, dt, {
      s: Math.min(s, TL.end),
      vel,
      reduceMotion,
      pointer: {
        nx: input.inside && finePointer ? hx : 0,
        ny: input.inside && finePointer ? hy : 0,
        hx, hy,
        inside: input.inside && !menu.open,
      },
    });
    worldCanvas.classList.toggle('is-pointer', world.hoveredCard >= 0);
  }

  // left label, intro text, active credential
  setMode(s < 0.45 ? 'hero' : s < TL.ringEnd - 0.3 ? 'work' : 'none');
  const hideIntro = s > 0.3;
  if (hideIntro !== introHidden) {
    introHidden = hideIntro;
    intro.classList.toggle('is-hidden', hideIntro);
    if (!hideIntro) scramble($('.intro__lead'), 700);
  }
  const r = s / CARD_STEP;
  const a = r < 0.5 ? -1 : Math.max(0, Math.min(CREDENTIALS.length - 1, Math.round(r) - 1));
  if (a !== active) {
    active = a;
    [...list.children].forEach((li, i) => {
      li.classList.toggle('is-active', i === a);
      if (i === a) li.firstChild.setAttribute('aria-current', 'true'); else li.firstChild.removeAttribute('aria-current');
    });
  }

  // sections
  aboutOn = placeCopy(about, s, TL.growEnd - 0.1, TL.fallEnd - 0.15, aboutOn);
  expOn = placeTimeline(s, TL.mixEnd - 0.2, TL.mix2Start + 0.05, expOn);
  const c = clamp01((s - (TL.mix2End - 0.1)) / 0.35);
  contactOn = reveal(contact, c > 0, contactOn);
  foot.classList.toggle('is-on', c > 0);
  contact.style.opacity = String(c);
  contact.style.transform = `translate(-50%, ${-50 + (1 - c) * 6}%)`;
  foot.style.opacity = String(c);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
