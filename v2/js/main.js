// AIS at UT Dallas, multi-page site (v2)
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- Nav: solid bar after the landing area, mobile menu ---------- */
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-nav-toggle]");
const setMenu = (open) => {
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
};
toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

const progress = document.querySelector(".progress");
const landing = document.querySelector("[data-landing]");
let ticking = false;
function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
  const threshold = landing ? landing.offsetHeight * 0.6 : 0;
  nav.classList.toggle("is-scrolled", y > threshold);
  ticking = false;
}
window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

/* ---------- Staggered fade-in ---------- */
const targets = [...document.querySelectorAll("[data-reveal] > *, .pillars li, .events__grid li, .officers__grid li, .collage__item, .contact__panel")];
if ("IntersectionObserver" in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  targets.forEach((el) => {
    const i = [...el.parentElement.children].indexOf(el);
    el.style.setProperty("--d", `${Math.min(i, 6) * 0.08}s`);
    el.classList.add("reveal");
    io.observe(el);
  });
}

/* ---------- Count-up numbers ---------- */
document.querySelectorAll("[data-count]").forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  el.textContent = "0";
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 4500, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.5 });
  io.observe(el);
});

/* ---------- Join form → FormSubmit → utdallasais@gmail.com ---------- */
const INBOX = "utdallasais@gmail.com";
const THANKS = "Thank you! Your message is on its way, and we’ll be in touch soon.";
const params = new URLSearchParams(location.search);
if (params.has("sent")) {
  const note = document.querySelector("[data-form] .form__note");
  if (note) note.textContent = THANKS;
}
if (params.get("topic") === "partner") {
  const radio = document.querySelector('input[name=topic][value="Partnering or sponsoring"]');
  if (radio) radio.checked = true;
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
      // Background request blocked: fall back to a normal POST that FormSubmit redirects back from
      let next = form.querySelector("input[name=_next]");
      if (!next) {
        next = Object.assign(document.createElement("input"), { type: "hidden", name: "_next" });
        form.append(next);
      }
      next.value = location.origin + location.pathname + "?sent=1#form";
      HTMLFormElement.prototype.submit.call(form);
      return;
    }
    button.disabled = false;
    button.textContent = label;
    if (String(data.success) === "true") {
      form.reset();
      note.textContent = THANKS;
    } else if (data.message) {
      note.textContent = data.message; // e.g. the one-time activation notice
    } else {
      note.innerHTML = `Something went wrong. Please email us directly at <a href="mailto:${INBOX}">${INBOX}</a>.`;
    }
  });
});

/* ---------- Upcoming events from Google Calendar ----------
   To show real events, fill in both values:
   id:  Google Calendar → Settings → your calendar → "Integrate calendar" → Calendar ID
   key: Google Cloud Console → Credentials → API key with the Google Calendar API enabled
   Until then the sample cards in the HTML are shown. */
const CALENDAR = { id: "", key: "" };

(async () => {
  const sections = [...document.querySelectorAll("[data-calendar]")];
  if (!sections.length || !CALENDAR.id) return;
  const calUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(CALENDAR.id)}&ctz=America%2FChicago`;
  document.querySelectorAll("[data-calendar-link]").forEach((a) => (a.href = calUrl));
  if (!CALENDAR.key) return;
  const q = new URLSearchParams({ key: CALENDAR.key, timeMin: new Date().toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "3" });
  let items;
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR.id)}/events?${q}`);
    if (!res.ok) throw new Error(res.status);
    items = (await res.json()).items || [];
  } catch (err) {
    return; // keep the cards already on the page
  }
  const images = ["images/ocean.jpg", "images/comb.jpg", "images/blue-table.jpg"];
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const when = (ev) => {
    const d = new Date(ev.start.dateTime || ev.start.date + "T12:00:00");
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
    return ev.start.dateTime ? `${date} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}` : date;
  };
  const html = items.length
    ? items.map((ev, i) => `
    <li><a class="event" href="${esc(ev.htmlLink)}" target="_blank" rel="noopener">
      <img src="${images[i % images.length]}" alt="" loading="lazy">
      <span class="event__meta">${esc(when(ev))}${ev.location ? " · " + esc(ev.location.split(",")[0]) : ""}</span>
      <span class="event__title">${esc(ev.summary || "AIS event")}</span>
    </a></li>`).join("")
    : '<li class="events__empty">No upcoming events right now. Check back soon!</li>';
  sections.forEach((s) => (s.querySelector(".events__grid").innerHTML = html));
})();
