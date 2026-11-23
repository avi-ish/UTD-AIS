// The backdrop runs on one scroll timeline, measured in "screens". Each
// page section says which stretch of it it covers (data-s="start end"), so
// the world follows the real document however tall the sections end up.

export const CARD_STEP = 0.5;   // timeline per issuer card
export const N_CARDS = 9;
const RING_END = (N_CARDS + 1) * CARD_STEP;

// Keep the sections' data-s in index.html in step with these:
// hero 0 to 0.5, certifications 0.5 to growEnd, education growEnd to fallEnd, contact fallEnd to end.
export const TL = {
  ringEnd: RING_END,                  // 5.0: the last card has passed and the city starts to show
  growEnd: RING_END + 0.5,            // 5.5: the city fills the screen
  fallEnd: RING_END + 2.8,            // 7.8: bottom of the city canyon
  mixStart: RING_END + 2.35,          // the city dissolves into the alley,
  mixEnd: RING_END + 2.7,             // done as Contact arrives
  end: RING_END + 3.8,                // 8.8
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
