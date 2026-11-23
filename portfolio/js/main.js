import { createHero } from './hero.js';
import { makeCredentialCard } from './art.js';
import { readIssuers, createViewer } from './viewer.js';
import { createMedia } from './media.js';
import { createCards } from './cards.js';
import { TL, CARD_STEP, measureSections, timelineAt } from './timeline.js';
import { CONFIG } from './config.js';
import { reduceMotion, finePointer, setupCursor, setupMenu } from './ui.js';

const $ = (sel) => document.querySelector(sel);
const root = document.documentElement;

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

/* ---- shared pointer ---- */
const input = { x: innerWidth / 2, y: innerHeight / 2, active: false, last: 0, inside: false };
const setPtr = (e) => {
  if (e.clientX === 0 && e.clientY === 0 && !input.active) return; // synthetic event with no position yet
  input.x = e.clientX; input.y = e.clientY;
  input.active = true; input.inside = true; input.last = performance.now();
};
addEventListener('pointermove', setPtr, { passive: true });
addEventListener('pointerdown', setPtr, { passive: true });
root.addEventListener('pointerleave', () => { input.active = false; input.inside = false; });
addEventListener('blur', () => { input.active = false; input.inside = false; });

/* ---- motion switch: pauses every animation; scrolling still moves the scenes ---- */
let still = reduceMotion;
let viewer = null; // the certification viewer, made further down
const motionBtn = $('.nav__motion');
function setStill(v) {
  still = v;
  root.classList.toggle('is-still', v);
  motionBtn.setAttribute('aria-pressed', String(v));
  motionBtn.textContent = v ? 'Play motion' : 'Pause motion';
}
setStill(still);
motionBtn.addEventListener('click', () => setStill(!still));

/* ---- hero ---- */
const heroCanvas = $('#hero');
const heroInner = $('.hero__inner');
const hero = createHero(heroCanvas, input, { reduceMotion, finePointer });
if (!hero) root.classList.add('no-gl');

setupCursor();
const menu = setupMenu({ onNavigate: goto });

/* ---- scroll timeline, measured from the sections themselves ---- */
let sections = measureSections();
const remeasure = () => { sections = measureSections(); };
addEventListener('load', remeasure);
document.fonts && document.fonts.ready.then(remeasure);

function yForTimeline(s) {
  for (const sec of sections) {
    if (s >= sec.s0 && s <= sec.s1) return sec.top + ((s - sec.s0) / Math.max(1e-6, sec.s1 - sec.s0)) * sec.height;
  }
  return 0;
}
function goTo(y) { scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' }); }
function goto(where) {
  const target = where === 'top' ? $('#top') : document.getElementById(where);
  if (!target) return;
  const y = target.getBoundingClientRect().top + scrollY - (where === 'top' ? 0 : 0);
  goTo(where === 'credentials' ? cardY(0) : y);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a || a.closest('.menu')) return;
  e.preventDefault();
  goto(a.dataset.goto);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open && !viewer.isOpen) menu.close(); });

/* ---- certifications: each issuer opens its own inner menu ---- */
const issuers = readIssuers($('.certs__list'));
const cardY = (i) => yForTimeline(CARD_STEP * (i + 1));
viewer = createViewer({
  issuers,
  reduceMotion,
  isStill: () => still,
  // keep the page behind on the issuer being viewed, so closing lands there
  onIssuer: (i) => scrollTo({ top: cardY(i), behavior: 'instant' }),
});
issuers.forEach((iss, i) => {
  const n = iss.certs.length;
  iss.btn.setAttribute('aria-label', `${iss.name}, ${n} certification${n === 1 ? '' : 's'}`);
  iss.btn.addEventListener('click', () => viewer.open(i, 0, iss.btn));
  // the list is hidden with scripts on: focusing an issuer brings its card to the front
  iss.btn.addEventListener('focus', () => {
    if (viewer.isOpen) return;
    scrollTo({ top: cardY(i), behavior: 'instant' });
    if (cards && iss.btn.matches(':focus-visible')) cards.focus(i);
  });
  iss.btn.addEventListener('blur', () => cards && cards.focus(-1));
});
// the list marks the issuer whose card is in front
let activeCert = -2;
function syncCerts(s) {
  const r = s / CARD_STEP;
  const a = r < 0.5 || s > TL.ringEnd - CARD_STEP * 0.5 ? -1 : Math.max(0, Math.min(issuers.length - 1, Math.round(r) - 1));
  if (a === activeCert) return;
  activeCert = a;
  issuers.forEach((iss, i) => iss.el.classList.toggle('is-active', i === a));
}

/* ---- backdrop pictures and the certification cards ---- */
const worldCanvas = $('#world');
const media = createMedia(worldCanvas);
if (!media) root.classList.add('no-media');
let cards = null;
(async () => {
  try {
    const faces = ['400 16px "Spline Sans"', '600 16px "Spline Sans"', '400 16px "Spline Sans Mono"', '600 16px "Spline Sans Mono"'];
    await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]);
    const compact = innerWidth < 700;
    const canvases = issuers.map((iss) => makeCredentialCard(iss, { compact }));
    cards = createCards($('.cards'), canvases, { onPick: (i) => viewer.open(i, 0, issuers[i].btn) });
  } catch (err) {
    console.error(err);
  }
  if (CONFIG.splineScene) loadSpline();
})();

/* ---- your Spline scene, when one is configured ---- */
async function loadSpline() {
  try {
    await import(CONFIG.splineViewer);
    const v = document.createElement('spline-viewer');
    v.setAttribute('url', CONFIG.splineScene);
    const slot = $('#spline-slot');
    slot.append(v);
    slot.classList.add('has-scene');
  } catch (err) {
    console.error('Spline scene could not load', err);
  }
}

/* ---- loop ---- */
let s = 0, last = performance.now(), clock = 0, lastS = -1, lastPtr = '';
addEventListener('resize', () => { remeasure(); hero && hero.resize(); media && media.resize(); cards && cards.resize(); });

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!still) clock += dt;

  const target = timelineAt(scrollY, sections);
  const prev = s;
  s += (target - s) * (1 - Math.exp(-dt * (reduceMotion ? 30 : 9)));
  if (Math.abs(target - s) < 1e-4) s = target;
  const vel = (s - prev) / Math.max(dt, 1e-3);

  // when motion is paused, draw only when something the visitor did changed
  const ptrKey = `${input.x | 0},${input.y | 0}`;
  const changed = s !== lastS || ptrKey !== lastPtr;
  lastS = s; lastPtr = ptrKey;
  // nothing behind the viewer needs drawing while it covers the page
  const draw = (!still || changed) && !viewer.isOpen;

  if (hero && s < 1.6 && draw) hero.render(clock, still ? 0 : dt);
  document.body.classList.toggle('is-hero', s < 0.25);
  root.classList.toggle('is-scrolled', s > 0.3);

  if (media && draw && s > 0.004) {
    media.frame(clock, still ? 0 : dt, {
      s: Math.min(s, TL.end),
      vel: still ? 0 : vel,
      still,
      pointer: {
        x: input.x, y: input.y,
        nx: input.inside && finePointer ? (input.x / innerWidth) * 2 - 1 : 0,
        ny: input.inside && finePointer ? (input.y / innerHeight) * 2 - 1 : 0,
        inside: input.inside && !menu.open,
      },
    });
  }
  if (cards) cards.frame(s, hero ? heroCanvas : null);
  // the hero's words leave before the white sheet slides under them
  heroInner.style.opacity = String(Math.max(0, 1 - s / 0.22));

  syncCerts(s);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
