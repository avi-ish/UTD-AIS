// Small DOM pieces: cursor dot and menu.

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine)').matches;

export function setupCursor() {
  const cursor = document.querySelector('.cursor');
  if (!finePointer || !cursor) return;
  addEventListener('pointermove', (e) => {
    cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    cursor.classList.add('is-on');
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
}

export function setupMenu({ onNavigate }) {
  const menu = document.getElementById('menu');
  const btn = document.querySelector('.nav__menu');
  const label = document.querySelector('.nav__menu-label');
  function set(open, returnFocus = true) {
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    label.textContent = open ? 'Close' : 'Menu';
    if (open) {
      menu.hidden = false;
      menu.querySelector('a').focus({ preventScroll: true });
    } else {
      menu.hidden = true;
      if (returnFocus) btn.focus({ preventScroll: true });
    }
  }
  btn.addEventListener('click', () => set(menu.hidden));
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    set(false, false);
    if (a.dataset.goto) { e.preventDefault(); onNavigate(a.dataset.goto); }
  });
  return { get open() { return !menu.hidden; }, close: () => set(false) };
}
