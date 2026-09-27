// Footer year
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Forms are placeholders until a backend (e.g. Formspree, Buttondown) is wired up
document.querySelectorAll("[data-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = form.querySelector(".form__note");
    if (note) note.textContent = "Thank you — your note is on its way.";
    form.reset();
  });
});

// Gentle fade-in as sections enter the viewport
const targets = document.querySelectorAll(
  ".panel > *, .manifesto__card, .feature > *, .collage__item, .card, .contact__panel"
);
if ("IntersectionObserver" in window) {
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
    el.classList.add("reveal");
    observer.observe(el);
  });
}
