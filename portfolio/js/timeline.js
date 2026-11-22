// The 3D world runs on one scroll timeline, measured in "screens". Each
// page section says which stretch of it it covers (data-s="start end"), so
// the world follows the real document however tall the sections end up.

export const CARD_STEP = 0.6;   // timeline per credential card
export const N_CARDS = 8;

export const TL = {
  ringEnd: (N_CARDS + 1) * CARD_STEP, // 5.4: last card (a window into the city) is centred
  growEnd: 6.0,                       // that window fills the screen
  fallEnd: 8.3,                       // bottom of the city canyon
  mixStart: 8.1, mixEnd: 8.5,         // city dissolves into the machine hall
  hallEnd: 13.0,
  mix2Start: 12.75, mix2End: 13.15,   // hall dissolves into the alley, done before Contact arrives
  end: 14.3,
};

/** Read the sections' stretches once per resize. */
export function measureSections() {
  return [...document.querySelectorAll('[data-s]')].map((el) => {
    const [s0, s1] = el.dataset.s.split(' ').map(Number);
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, height: Math.max(1, r.height), s0, s1 };
  }).sort((a, b) => a.top - b.top);
}

/** Map a scroll position to the world's timeline. */
export function timelineAt(y, sections) {
  if (!sections.length) return 0;
  if (y <= sections[0].top) return sections[0].s0;
  for (const sec of sections) {
    if (y < sec.top + sec.height) return sec.s0 + ((y - sec.top) / sec.height) * (sec.s1 - sec.s0);
  }
  return sections[sections.length - 1].s1;
}
