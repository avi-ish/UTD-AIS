// Projects shown in Selected Work and the detail views.
//
// shots – screenshots (first one is the card cover), 1440×900 works best
// env   – the 3D setting the detail view opens into: studio | fog | space | void
// url   – optional link shown in the detail view
//
// Add your own projects by dropping screenshots in assets/shots/ and adding
// an entry here. Projects without shots fall back to generated artwork (`art`).

export const PROJECTS = [
  {
    id: 'ais-v3',
    name: 'AIS AT UTD — EDITORIAL',
    env: 'studio',
    shots: ['ais-v3-0', 'ais-v3-1', 'ais-v3-2', 'ais-v3-3'].map((s) => `assets/shots/${s}.jpg`),
    info: 'THE THIRD SITE I BUILT FOR UT DALLAS’S CHAPTER OF THE ASSOCIATION FOR INFORMATION SYSTEMS: ONE EDITORIAL PAGE WITH A LOADING COUNTER, A CUSTOM CURSOR AND SCROLL-DRIVEN MOTION.',
    role: ['DESIGN', 'DEVELOPMENT', 'MOTION'],
    url: '../v3/',
  },
  {
    id: 'ais-v2',
    name: 'AIS AT UTD — MULTI-PAGE',
    env: 'fog',
    shots: ['ais-v2-0', 'ais-v2-1', 'ais-v2-2', 'ais-v2-3', 'ais-v2-4'].map((s) => `assets/shots/${s}.jpg`),
    info: 'A MULTI-PAGE VERSION OF THE CHAPTER SITE WITH ITS OWN PAGES FOR EVENTS, OFFICERS, ALUMNI AND JOINING, BUILT FROM ONE SHARED TEMPLATE.',
    role: ['DESIGN', 'DEVELOPMENT'],
    url: '../v2/',
  },
  {
    id: 'ais-v1',
    name: 'AIS AT UTD — ORIGINAL',
    env: 'space',
    shots: ['ais-v1-0', 'ais-v1-1', 'ais-v1-2', 'ais-v1-3', 'ais-v1-4'].map((s) => `assets/shots/${s}.jpg`),
    info: 'THE FIRST SITE FOR THE CHAPTER: WHO WE ARE, EVENTS, OFFICERS, SPONSORS AND A JOIN FORM, ALL IN ONE SCROLL.',
    role: ['DESIGN', 'DEVELOPMENT'],
    url: '../',
  },
  {
    id: 'portfolio',
    name: 'THIS PORTFOLIO',
    env: 'void',
    shots: ['portfolio-0', 'portfolio-1', 'portfolio-2', 'portfolio-3', 'portfolio-4'].map((s) => `assets/shots/${s}.jpg`),
    info: 'THE SITE YOU’RE ON: A DOT-MATRIX PORTRAIT, A SCROLL-DRIVEN 3D JOURNEY AND REAL-TIME GLITCH EFFECTS, BUILT WITH WEBGL AND THREE.JS.',
    role: ['DESIGN', 'DEVELOPMENT', '3D'],
    art: 'afterglow',
  },
];

/** Load every project's screenshots. Missing files are skipped. */
export async function loadShots(projects) {
  const load = (src) => new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  await Promise.all(projects.map(async (p) => {
    const imgs = await Promise.all((p.shots || []).map(load));
    p.images = imgs.filter(Boolean);
  }));
}
