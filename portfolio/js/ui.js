// Small DOM pieces: text scramble, cursor dot, menu, assistant bubble.

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine)').matches;

const GLYPHS = '#%&*+=-/\\<>[]{}01?!$@';

/** Scramble an element's text into `to` (or back into its own text). */
export function scramble(el, duration = 700, to) {
  if (!el) return;
  const target = to ?? el.dataset.text ?? el.textContent;
  el.dataset.text = target;
  if (reduceMotion) { el.textContent = target; return; }
  const from = el.textContent;
  const start = performance.now();
  cancelAnimationFrame(el._scr);
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const len = Math.round(from.length + (target.length - from.length) * Math.min(1, p * 2));
    let out = '';
    for (let i = 0; i < len; i++) {
      const ch = target[i] ?? '';
      if (ch === ' ') out += ' ';
      else if (i / Math.max(len, 1) < p * 1.15 - 0.15) out += ch;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scr = requestAnimationFrame(tick);
    else el.textContent = target;
  };
  el._scr = requestAnimationFrame(tick);
}

export function setupHoverScramble(root = document) {
  root.querySelectorAll('[data-scramble]').forEach((el) => {
    if (el._hoverBound) return;
    el._hoverBound = true;
    const host = el.closest('a, button') || el;
    host.addEventListener('pointerenter', () => scramble(el, 420));
  });
}

export function setupCursor() {
  const cursor = document.querySelector('.cursor');
  if (!finePointer) return;
  addEventListener('pointermove', (e) => {
    cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    cursor.classList.add('is-on');
    cursor.classList.toggle('is-link', !!e.target.closest('a, button'));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
}

export function setupMenu({ onNavigate }) {
  const menu = document.getElementById('menu');
  const btn = document.querySelector('.bar__menu');
  const label = document.querySelector('.bar__menu-label');
  function set(open) {
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    scramble(label, 380, open ? 'CLOSE' : 'MENU');
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      menu.querySelectorAll('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el, 520), i * 60));
      menu.querySelector('a').focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
    }
  }
  btn.addEventListener('click', () => set(menu.hidden));
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    set(false);
    if (a.dataset.goto) { e.preventDefault(); onNavigate(a.dataset.goto); }
  });
  return { get open() { return !menu.hidden; }, close: () => set(false) };
}

export function setupBot() {
  const bot = document.querySelector('.bot');
  const bubble = document.getElementById('bot-bubble');
  bot.addEventListener('click', () => {
    const open = bubble.hidden;
    bubble.hidden = !open;
    bot.setAttribute('aria-expanded', String(open));
    if (open) scramble(bubble.querySelector('[data-scramble]'), 600);
  });
  // the visor switches between eyes and a terminal prompt now and then
  if (!reduceMotion) {
    setInterval(() => {
      bot.classList.add('is-prompt');
      setTimeout(() => bot.classList.remove('is-prompt'), 2600);
    }, 7000);
  }
  return { close() { bubble.hidden = true; bot.setAttribute('aria-expanded', 'false'); }, get open() { return !bubble.hidden; } };
}
