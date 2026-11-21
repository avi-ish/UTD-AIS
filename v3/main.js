// AIS at UT Dallas, v3
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const lerp = (a, b, t) => a + (b - a) * t;

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- Split text into letters (wrapped per word so lines break naturally) ---------- */
document.querySelectorAll("[data-split]").forEach((el) => {
  let i = 0;
  el.innerHTML = el.textContent.split(" ").map((word) =>
    `<span class="split-wrap">${[...word].map((c) => `<span class="char" style="--i:${i++}">${c}</span>`).join("")}</span>`
  ).join(" ");
});

/* ---------- Words for the scroll-lit statement ---------- */
const words = [];
document.querySelectorAll("[data-words]").forEach((el) => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="word">${w}</span>`).join(" ");
  words.push(...el.querySelectorAll(".word"));
});

/* ---------- Loader: count to 100, then lift ---------- */
const countEl = document.querySelector("[data-loader-count]");
const finishLoad = () => {
  document.body.classList.add("is-ready");
  document.body.classList.remove("is-loading");
  setTimeout(() => document.querySelectorAll(".hero [data-split]").forEach((el) => el.classList.add("is-in")), 350);
};
if (reduce) {
  finishLoad();
} else {
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / 1600, 1);
    countEl.textContent = Math.round(100 * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick); else setTimeout(finishLoad, 200);
  };
  requestAnimationFrame(tick);
}

/* ---------- Clock (Dallas time) ---------- */
const clock = document.querySelector("[data-clock]");
const setClock = () => {
  clock.textContent = "Richardson, TX — " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
};
setClock();
setInterval(setClock, 30000);

/* ---------- Cursor with labels, and magnetic elements ---------- */
const cursor = document.querySelector(".cursor");
const cursorLabel = cursor.querySelector(".cursor__label");
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
window.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

if (fine && !reduce) {
  document.querySelectorAll("a, button, label, [data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      const label = el.closest("[data-cursor]")?.dataset.cursor;
      cursor.classList.toggle("is-label", !!label);
      cursor.classList.toggle("is-hover", !label);
      cursorLabel.textContent = label || "";
    });
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover", "is-label"));
  });

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.3;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transition = "transform 0.6s cubic-bezier(.2,.7,.1,1)";
      el.style.transform = "";
      setTimeout(() => (el.style.transition = ""), 600);
    });
  });
}

/* ---------- Officers: floating photo follows the cursor ---------- */
const float = document.querySelector(".team__float");
const floatImg = float.querySelector("img");
let fx = mx, fy = my;
document.querySelectorAll(".team__list li").forEach((li) => {
  li.style.setProperty("--img", `url("${li.dataset.img}")`);
  li.addEventListener("pointerenter", () => {
    if (!fine) return;
    floatImg.src = li.dataset.img;
    float.classList.add("is-on");
  });
  li.addEventListener("pointerleave", () => float.classList.remove("is-on"));
});

/* ---------- Reveal on enter ---------- */
// Checked every frame rather than with IntersectionObserver, which can miss
// elements inside the sticky events panel after a large scroll jump
let pending = reduce ? [] : [...document.querySelectorAll(".pillars li, .team__list li, .contact > div, .alumni__sub, .statement__img, .big, .label, [data-split]:not(.hero [data-split])")];
pending.forEach((el) => { if (!el.matches("[data-split]")) el.classList.add("reveal"); });
const revealInView = () => {
  if (!pending.length) return;
  const limit = innerHeight * 0.9;
  pending = pending.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < limit && r.bottom > 0) { el.classList.add("is-in"); return false; }
    return true;
  });
};

/* ---------- Alumni count-up ---------- */
document.querySelectorAll("[data-count]").forEach((el) => {
  if (reduce) return;
  const target = +el.dataset.count;
  el.textContent = "0";
  const obs = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 4000, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.5 });
  obs.observe(el);
});

/* ---------- Scroll-driven: horizontal strip, statement words, parallax, hero ---------- */
const hs = document.querySelector(".hscroll");
const track = document.querySelector("[data-hscroll]");
const parallax = [...document.querySelectorAll("[data-parallax]")];
const heroImg = document.querySelector("[data-hero-img]");

function frame() {
  const vh = innerHeight;
  revealInView();

  // Cursor and floating photo ease toward the pointer
  cx = lerp(cx, mx, 0.22); cy = lerp(cy, my, 0.22);
  cursor.style.transform = `translate(${cx}px, ${cy}px)`;
  fx = lerp(fx, mx, 0.12); fy = lerp(fy, my, 0.12);
  float.style.left = fx + "px"; float.style.top = fy + "px";

  if (!reduce) {
    // Events: vertical progress through the tall section → horizontal translate
    const r = hs.getBoundingClientRect();
    const travel = hs.offsetHeight - vh;
    const p = Math.min(Math.max(-r.top / travel, 0), 1);
    const max = track.scrollWidth - innerWidth;
    track.style.transform = `translate3d(${-p * max}px, 0, 0)`;

    // Statement words light up as they pass 70% of the viewport
    words.forEach((w) => w.classList.toggle("is-lit", w.getBoundingClientRect().top < vh * 0.72));

    parallax.forEach((el) => {
      const b = el.parentElement.getBoundingClientRect();
      el.style.transform = `translate3d(0, ${(b.top + b.height / 2 - vh / 2) * -+el.dataset.parallax}px, 0)`;
    });

    if (document.body.classList.contains("is-ready") && scrollY < vh) {
      heroImg.style.transform = `scale(${1.06 + scrollY / vh * 0.12}) translateY(${scrollY * 0.2}px)`;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- Form → FormSubmit → utdallasais@gmail.com ---------- */
const INBOX = "utdallasais@gmail.com";
const THANKS = "Thank you! Your message is on its way, and we’ll be in touch soon.";
if (new URLSearchParams(location.search).has("sent")) document.querySelector(".form__note").textContent = THANKS;
document.querySelectorAll("[data-form]").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = form.querySelector(".form__note");
    const button = form.querySelector("button[type=submit]");
    const label = button.innerHTML;
    const picked = form.querySelector("input[name=topic]:checked");
    form.querySelector("[data-subject]").value = picked.dataset.subjectValue;
    button.disabled = true;
    button.innerHTML = "<span>Sending…</span>";
    note.textContent = "";
    let data;
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${INBOX}`, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      data = await res.json();
    } catch (err) {
      const next = Object.assign(document.createElement("input"), { type: "hidden", name: "_next", value: location.origin + location.pathname + "?sent=1#join" });
      form.append(next);
      HTMLFormElement.prototype.submit.call(form);
      return;
    }
    button.disabled = false;
    button.innerHTML = label;
    if (String(data.success) === "true") { form.reset(); note.textContent = THANKS; }
    else if (data.message) note.textContent = data.message;
    else note.innerHTML = `Something went wrong. Please email us at <a href="mailto:${INBOX}">${INBOX}</a>.`;
  });
});
