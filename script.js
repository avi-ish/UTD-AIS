const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Footer year
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Forms are placeholders until a backend (e.g. Formspree, Google Forms) is wired up
document.querySelectorAll("[data-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = form.querySelector(".form__note");
    if (note) note.textContent = "Thank you — we’ll be in touch soon.";
    form.reset();
  });
});

// Nav: solid bar after the hero, mobile menu, active section link
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-nav-toggle]");
const setMenu = (open) => {
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
};
toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
nav.querySelectorAll(".nav__links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

const navLinks = [...nav.querySelectorAll(".nav__links a")];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

// Scroll-driven effects: progress bar, nav state, parallax
const progress = document.querySelector(".progress");
const parallaxEls = reduceMotion ? [] : [...document.querySelectorAll("[data-parallax]")];
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
  nav.classList.toggle("is-scrolled", y > vh * 0.6);

  let current = null;
  sections.forEach((s) => { if (s.getBoundingClientRect().top < vh * 0.4) current = s; });
  navLinks.forEach((a) => a.classList.toggle("is-active", current && a.getAttribute("href") === "#" + current.id));

  const stacked = window.innerWidth <= 900;
  parallaxEls.forEach((el) => {
    // Collage tiles stack on small screens, where drifting would make them overlap
    if (stacked && el.classList.contains("collage__item")) { el.style.translate = ""; return; }
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
    el.style.translate = `0 ${(-offset).toFixed(1)}px`;
  });
  ticking = false;
}
window.addEventListener("scroll", () => {
  if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
}, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

// Staggered fade-in as content enters the viewport
const targets = document.querySelectorAll(
  ".panel > *, .manifesto__card, .pillars li, .feature > *, .collage__item, .card, .contact__panel, .officers__grid li, .musings li"
);
if ("IntersectionObserver" in window && !reduceMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.matches && [...targets].includes(c));
    el.style.setProperty("--d", `${Math.min(siblings.indexOf(el), 6) * 0.08}s`);
    el.classList.add("reveal");
    observer.observe(el);
  });
}

// Count up the alumni figure when it scrolls into view
document.querySelectorAll("[data-count]").forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  el.textContent = "0";
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    const start = performance.now();
    const duration = 2200;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(target * eased).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.5 });
  io.observe(el);
});
