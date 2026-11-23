// The inner menu for one issuer: a dark room with that issuer's
// certifications as a row of screens. Previous and Next, the thumbnails,
// the arrow keys, the wheel and a swipe all move along the row. The bar
// hops to the neighbouring issuers. Escape or Close goes back to the page.

import { makeCertSlide, thumbOf } from './art.js';

/** Read the issuers and their certifications from the list in the page. */
export function readIssuers(list) {
  return [...list.querySelectorAll('.issuer')].map((li, index) => ({
    index,
    el: li,
    btn: li.querySelector('.issuer__btn'),
    name: li.querySelector('.issuer__name').textContent.trim(),
    motif: li.dataset.motif,
    accent: li.dataset.accent,
    certs: [...li.querySelectorAll('.cert')].map((c) => {
      const times = c.querySelectorAll('time');
      const id = c.querySelector('.cert__id');
      const note = c.querySelector('.cert__note');
      const link = c.querySelector('.cert__link');
      const name = c.querySelector('.cert__name').textContent.trim();
      return {
        name,
        short: c.dataset.short || name,
        issued: times[0] ? times[0].textContent.trim() : '',
        expires: times[1] ? times[1].textContent.trim() : '',
        id: id ? id.textContent.replace(/^Credential ID\s*/, '').trim() : '',
        note: note ? note.textContent.trim() : '',
        url: link ? link.href : '',
      };
    }),
  }));
}

const CHEVRON = (dir) => `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="${dir < 0 ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}"/></svg>`;

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

export function createViewer({ issuers, isStill, reduceMotion, onIssuer }) {
  const dlg = el('dialog', 'viewer');
  dlg.setAttribute('aria-labelledby', 'viewer-h');
  dlg.innerHTML = `
    <canvas class="viewer__sky" aria-hidden="true"></canvas>
    <div class="viewer__bar">
      <button class="viewer__hop viewer__hop--prev" type="button" data-hop="-1">${CHEVRON(-1)}<span class="viewer__hop-name"></span></button>
      <button class="viewer__close" type="button">Close</button>
      <button class="viewer__hop viewer__hop--next" type="button" data-hop="1"><span class="viewer__hop-name"></span>${CHEVRON(1)}</button>
    </div>
    <div class="viewer__stage">
      <div class="viewer__track"></div>
    </div>
    <div class="viewer__info">
      <div class="viewer__head">
        <h2 class="viewer__issuer" id="viewer-h"></h2>
        <p class="viewer__pos"></p>
      </div>
      <div class="viewer__about">
        <h3 class="viewer__name"></h3>
        <dl class="viewer__facts"></dl>
        <p class="viewer__note"></p>
        <a class="viewer__link" target="_blank" rel="noopener">Show credential<span class="visually-hidden"> (opens in a new tab)</span></a>
      </div>
      <div class="viewer__controls">
        <div class="viewer__thumbs" role="group" aria-label="Choose a certification"></div>
        <div class="viewer__steps">
          <button class="viewer__step" type="button" data-step="-1">${CHEVRON(-1)}<span>Previous</span></button>
          <button class="viewer__step" type="button" data-step="1"><span>Next</span>${CHEVRON(1)}</button>
        </div>
      </div>
    </div>
    <p class="visually-hidden" aria-live="polite" aria-atomic="true"></p>`;
  document.body.append(dlg);

  const q = (s) => dlg.querySelector(s);
  const sky = q('.viewer__sky');
  const stage = q('.viewer__stage');
  const track = q('.viewer__track');
  const live = dlg.querySelector('[aria-live]');
  const hopPrev = q('.viewer__hop--prev');
  const hopNext = q('.viewer__hop--next');
  const stepPrev = q('[data-step="-1"]');
  const stepNext = q('[data-step="1"]');
  const thumbsBox = q('.viewer__thumbs');

  let issuer = null, at = 0, slides = [], thumbs = [], drag = 0, returnTo = null;
  let slideW = 800, gap = 80;
  const cache = new Map();

  function slidesFor(iss) {
    if (!cache.has(iss.index)) {
      cache.clear(); // keep only one issuer's screens in memory
      const list = iss.certs.map((c, k) => makeCertSlide(c, iss, k, iss.certs.length));
      cache.set(iss.index, list);
    }
    return cache.get(iss.index);
  }

  function layout() {
    const r = stage.getBoundingClientRect();
    const wide = innerWidth > 760;
    slideW = Math.max(220, Math.min(r.width * (wide ? 0.58 : 0.8), 1040, (r.height - 24) * 1.6));
    gap = wide ? Math.min(96, r.width * 0.06) : r.width * 0.05;
    stage.style.setProperty('--slide-w', `${slideW}px`);
    place();
  }

  function place() {
    slides.forEach((s, k) => {
      const o = k - at + drag;
      const a = Math.abs(o);
      s.style.transform = `translate(-50%, -50%) translateX(${o * (slideW + gap)}px) rotateY(${-o * 16}deg) scale(${1 - Math.min(a, 1.5) * 0.1})`;
      s.style.opacity = String(a > 2.2 ? 0 : a > 1.2 ? 0.35 : 1 - a * 0.35);
      s.classList.toggle('is-on', k === at);
    });
  }

  function fill() {
    const c = issuer.certs[at], n = issuer.certs.length;
    q('.viewer__pos').textContent = n === 1 ? 'One certification' : `Certification ${at + 1} of ${n}`;
    q('.viewer__name').textContent = c.name;
    const facts = [['Issued', c.issued]];
    if (c.expires) facts.push(['Expires', c.expires]);
    if (c.id) facts.push(['Credential ID', c.id]);
    q('.viewer__facts').innerHTML = facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v.replace(/[<&]/g, (m) => (m === '<' ? '&lt;' : '&amp;'))}</dd></div>`).join('');
    const note = q('.viewer__note');
    note.textContent = c.note;
    note.hidden = !c.note;
    const link = q('.viewer__link');
    link.hidden = !c.url;
    if (c.url) link.href = c.url; else link.removeAttribute('href');
    thumbs.forEach((t, k) => t.setAttribute('aria-current', String(k === at)));
    stepPrev.disabled = at === 0;
    stepNext.disabled = at === n - 1;
    live.textContent = `${c.name}, ${at + 1} of ${n}`;
  }

  function go(k, { glitch = true } = {}) {
    const n = issuer.certs.length;
    const next = Math.max(0, Math.min(n - 1, k));
    drag = 0;
    if (next === at) { place(); return; }
    at = next;
    place();
    fill();
    if (glitch && !isStill()) {
      const on = slides[at];
      on.classList.remove('is-glitch'); void on.offsetWidth; on.classList.add('is-glitch');
    }
  }

  function show(iIssuer, k = 0) {
    issuer = issuers[(iIssuer + issuers.length) % issuers.length];
    at = Math.max(0, Math.min(issuer.certs.length - 1, k));
    dlg.style.setProperty('--accent-cert', issuer.accent);
    q('.viewer__issuer').textContent = issuer.name;
    stage.setAttribute('aria-label', `${issuer.name} certifications`);
    const prev = issuers[(issuer.index - 1 + issuers.length) % issuers.length];
    const next = issuers[(issuer.index + 1) % issuers.length];
    hopPrev.querySelector('.viewer__hop-name').textContent = prev.name;
    hopNext.querySelector('.viewer__hop-name').textContent = next.name;
    hopPrev.setAttribute('aria-label', `Previous issuer, ${prev.name}`);
    hopNext.setAttribute('aria-label', `Next issuer, ${next.name}`);

    const canvases = slidesFor(issuer);
    track.replaceChildren();
    thumbsBox.replaceChildren();
    slides = canvases.map((cv, j) => {
      const s = el('div', 'viewer__slide');
      s.setAttribute('aria-hidden', 'true');
      cv.className = 'viewer__screen';
      s.append(cv);
      s.addEventListener('click', () => { if (!moved) go(j); });
      track.append(s);
      return s;
    });
    thumbs = canvases.map((cv, j) => {
      const b = el('button', 'viewer__thumb');
      b.type = 'button';
      b.setAttribute('aria-label', issuer.certs[j].short);
      b.append(thumbOf(cv, 144));
      b.addEventListener('click', () => go(j));
      thumbsBox.append(b);
      return b;
    });
    thumbsBox.hidden = canvases.length < 2;
    q('.viewer__steps').hidden = canvases.length < 2;
    drag = 0;
    track.classList.remove('is-enter'); void track.offsetWidth; track.classList.add('is-enter');
    layout();
    fill();
    onIssuer && onIssuer(issuer.index);
  }

  /* ---- open and close ---- */
  function open(iIssuer, k = 0, from = document.activeElement) {
    returnTo = from;
    document.documentElement.classList.add('is-viewing');
    dlg.classList.remove('is-closing');
    if (!dlg.open) dlg.showModal();
    show(iIssuer, k);
    (issuer.certs.length > 1 ? stepNext : q('.viewer__close')).focus({ preventScroll: true });
    startSky();
  }
  let closing = 0;
  function close() {
    if (!dlg.open || closing) return;
    const finish = () => {
      closing = 0;
      dlg.close();
      dlg.classList.remove('is-closing');
      document.documentElement.classList.remove('is-viewing');
      const back = issuer && issuer.btn;
      (back || returnTo) && (back || returnTo).focus({ preventScroll: true });
    };
    if (reduceMotion || isStill()) { finish(); return; }
    dlg.classList.add('is-closing');
    closing = setTimeout(finish, 260);
  }
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  q('.viewer__close').addEventListener('click', close);
  hopPrev.addEventListener('click', () => show(issuer.index - 1));
  hopNext.addEventListener('click', () => show(issuer.index + 1));
  stepPrev.addEventListener('click', () => go(at - 1));
  stepNext.addEventListener('click', () => go(at + 1));

  /* ---- keys, wheel, swipe ---- */
  dlg.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const keys = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: issuer.certs.length - 1 };
    if (e.key in keys) { e.preventDefault(); go(keys[e.key]); }
  });

  let wheelAcc = 0, wheelLock = 0;
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(wheelAcc) > 50) {
      go(at + Math.sign(wheelAcc));
      wheelAcc = 0;
      wheelLock = now + 420;
    }
  }, { passive: false });

  let down = null, moved = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    down = { x: e.clientX, t: performance.now(), id: e.pointerId };
    moved = false;
  });
  addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x;
    if (!moved && Math.abs(dx) > 6) {
      moved = true;
      track.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch { /* the pointer may already be gone */ }
    }
    if (!moved) return;
    const n = issuer.certs.length;
    let d = dx / (slideW + gap);
    if ((at === 0 && d > 0) || (at === n - 1 && d < 0)) d *= 0.3; // resist past the ends
    drag = d;
    place();
  });
  const release = (e) => {
    if (!down || (e && e.pointerId !== down.id)) return;
    const dx = e ? e.clientX - down.x : 0;
    const fast = Math.abs(dx) / Math.max(1, performance.now() - down.t) > 0.5;
    down = null;
    track.classList.remove('is-dragging');
    if (!moved) return;
    const steps = Math.abs(dx) > (slideW + gap) * 0.25 || fast ? -Math.sign(dx) * Math.max(1, Math.round(Math.abs(dx) / (slideW + gap))) : 0;
    drag = 0;
    if (steps) go(at + steps); else place();
    setTimeout(() => { moved = false; }, 0);
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  addEventListener('resize', () => { if (dlg.open) { layout(); sizeSky(); } });

  /* ---- the room: slow drifting points of light ---- */
  const sctx = sky.getContext('2d');
  let stars = [], skyRaf = 0, skyW = 0, skyH = 0;
  function sizeSky() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    skyW = innerWidth; skyH = innerHeight;
    sky.width = Math.round(skyW * dpr); sky.height = Math.round(skyH * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    stars = Array.from({ length: Math.round((skyW * skyH) / 5200) }, () => ({ x: rnd() * skyW, y: rnd() * skyH, z: 0.2 + rnd() * 0.8, p: rnd() * 6.28 }));
  }
  function drawSky(t) {
    sctx.clearRect(0, 0, skyW, skyH);
    for (const s of stars) {
      const x = (s.x - t * 6 * s.z + skyW * 4) % skyW;
      const tw = 0.55 + 0.45 * Math.sin(t * 1.3 + s.p);
      sctx.fillStyle = `rgba(226,232,255,${(0.12 + s.z * 0.5) * tw})`;
      const r = s.z * 1.4;
      sctx.fillRect(x, s.y, r, r);
    }
  }
  function startSky() {
    sizeSky();
    cancelAnimationFrame(skyRaf);
    const t0 = performance.now();
    const tick = (now) => {
      if (!dlg.open) return;
      drawSky(isStill() ? 0 : (now - t0) / 1000);
      if (!isStill()) skyRaf = requestAnimationFrame(tick);
    };
    skyRaf = requestAnimationFrame(tick);
  }

  return {
    open,
    close,
    get isOpen() { return dlg.open; },
    resume() { if (dlg.open) startSky(); },
  };
}
