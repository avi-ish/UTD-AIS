const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Footer year
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Forms post to FormSubmit, which forwards every submission to the chapter inbox.
// The first ever submission triggers an "Activate Form" email to that inbox.
const INBOX = "utdallasais@gmail.com";
const THANKS = "Thank you! Your message is on its way, and we’ll be in touch soon.";

// Returning from a plain (non-AJAX) submission: FormSubmit sends people back here with ?sent=1
if (new URLSearchParams(location.search).has("sent")) {
  const note = document.querySelector("[data-form] .form__note");
  if (note) note.textContent = THANKS;
  history.replaceState(null, "", location.pathname + "#join");
}

document.querySelectorAll("[data-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = form.querySelector(".form__note");
    const button = form.querySelector("button[type=submit]");
    const label = button.textContent;
    const picked = form.querySelector("input[name=topic]:checked");
    const subject = form.querySelector("[data-subject]");
    if (picked && subject) subject.value = picked.dataset.subjectValue;
    button.disabled = true;
    button.textContent = "Sending…";
    note.textContent = "";

    let data;
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${INBOX}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      data = await res.json();
    } catch (err) {
      // The background request was blocked (network, extension, embedded preview):
      // fall back to a normal form submission, which FormSubmit redirects back from.
      let next = form.querySelector("input[name=_next]");
      if (!next) {
        next = Object.assign(document.createElement("input"), { type: "hidden", name: "_next" });
        form.append(next);
      }
      next.value = location.origin + location.pathname + "?sent=1#join";
      HTMLFormElement.prototype.submit.call(form);
      return;
    }

    button.disabled = false;
    button.textContent = label;
    if (String(data.success) === "true") {
      form.reset();
      note.textContent = THANKS;
    } else if (data.message) {
      // e.g. the one-time "This form needs Activation" notice
      note.textContent = data.message;
    } else {
      note.innerHTML = `Something went wrong. Please email us directly at <a href="mailto:${INBOX}">${INBOX}</a>.`;
    }
  });
});

// Links like "Partner with the chapter" preselect the matching form topic
document.querySelectorAll("[data-topic]").forEach((link) => {
  link.addEventListener("click", () => {
    const radio = document.querySelector(`input[name=topic][value="${link.dataset.topic}"]`);
    if (radio) radio.checked = true;
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

  parallaxEls.forEach((el) => {
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
  ".panel > *, .pillars li, .events__grid li, .feature > *, .collage__item, .contact__panel, .officers__grid li"
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
