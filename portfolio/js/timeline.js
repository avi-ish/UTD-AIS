// Scroll timeline, in viewport heights scrolled. Shared by the 3D world and
// the page overlays so they always agree on where each section is.

export const CARD_STEP = 0.6;   // scroll per credential card
export const N_CARDS = 9;

export const TL = {
  ringEnd: (N_CARDS + 1) * CARD_STEP, // 6.0 — last card (a window into the city) is centred
  growEnd: 6.6,                       // that window fills the screen → About
  fallEnd: 8.9,                       // bottom of the city canyon
  mixStart: 8.6, mixEnd: 9.0,         // city dissolves into the machine hall → Experience
  hallEnd: 12.6,
  mix2Start: 12.3, mix2End: 12.7,     // hall dissolves into the alley → Let's connect
  end: 13.7,
};

// where the header / menu links scroll to
export const SPOTS = {
  top: 0,
  credentials: CARD_STEP,
  about: 7.0,
  experience: 9.15,
  connect: 13.45,
};
