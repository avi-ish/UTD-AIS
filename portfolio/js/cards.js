// Certification cards as CSS 3D panels: they ride a drum on the white sheet,
// lit from above with soft shadows. No WebGL needed. The hero portrait canvas
// rides the same drum as card zero, shrinking out of the first screen.

import { CARD_STEP } from './timeline.js';

const STEP = 0.6; // radians between cards on the drum
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function createCards(stage, canvases, { onPick }) {
  const cards = canvases.map((cv, i) => {
    const el = document.createElement('div');
    el.className = 'card';
    cv.className = 'card__face';
    el.append(cv);
    el.addEventListener('click', () => onPick(i));
    stage.append(el);
    return el;
  });

  let cw = 800, ch = 500, R = 700, shift = 0, lift = 0, vw = innerWidth, vh = innerHeight;
  const nav = document.querySelector('.nav');
  function layout() {
    vw = innerWidth; vh = innerHeight;
    const wide = vw / vh > 1.2 && vw > 900;
    cw = Math.min(wide ? vw * 0.5 : vw * 0.86, 960);
    ch = cw * 0.625;
    R = vh * 1.05;
    shift = 0;
    // centre the cards in the screen below the bar
    lift = nav ? nav.offsetHeight / 2 : 0;
    stage.style.setProperty('--card-w', `${cw}px`);
  }
  layout();

  // where a card sits for drum offset u (0 = centred, +1 = next one below)
  function pose(u, k = 1, sx = shift, ly = lift) {
    const a = u * STEP;
    const x = sx + u * cw * 0.16;
    const y = ly + R * Math.sin(a) * 0.92;
    const z = -R * (1 - Math.cos(a));
    const rz = 9 * Math.min(Math.abs(u), 1.5) * (u < 0 ? 1.1 : 0.8);
    return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${(-a * 180) / Math.PI}deg) rotateZ(${rz}deg) scale(${k})`;
  }

  function frame(s, hero) {
    const r = s / CARD_STEP;
    cards.forEach((el, i) => {
      const u = i + 1 - r;
      const on = Math.abs(u) < 2.2 && r > 0.02;
      el.style.visibility = on ? 'visible' : 'hidden';
      if (!on) return;
      el.style.transform = pose(u);
      el.style.opacity = String(Math.min(1, (2.2 - Math.abs(u)) * 1.5));
    });

    // the hero canvas becomes card zero: full screen at r = 0, card-sized by r = 0.6
    if (hero) {
      if (r <= 0.002) {
        hero.style.transform = '';
        hero.style.borderRadius = '';
        hero.classList.remove('is-card');
      } else {
        const p = ease(r / 0.6);
        const k = 1 + (cw / vw - 1) * p;
        hero.classList.add('is-card');
        hero.style.transform = `perspective(1600px) ${pose(-r, k, shift * p, lift * p)}`;
        hero.style.borderRadius = `${(14 * p) / Math.max(k, 0.2)}px`;
      }
      hero.style.visibility = r > 2.3 ? 'hidden' : 'visible';
    }
  }

  // the keyboard reaches each card through the list: show which one has focus
  function focus(i) { cards.forEach((el, k) => el.classList.toggle('is-focus', k === i)); }

  return { frame, resize: layout, focus };
}
