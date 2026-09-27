// Floating logo button
// Once the landing area (hero or page header) scrolls away, the nav logo flies to the
// bottom right and grows into a button; scrolling back up flies it home again.
(() => {
  const fab = document.querySelector("[data-fab]");
  const button = fab?.querySelector(".fab__button");
  const navLogo = document.querySelector("[data-nav-logo]");
  const landing = document.querySelector("[data-landing]");
  if (!fab || !button || !navLogo || !landing) return;

  const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let docked = false;

  // Transform that places the (bottom-right) button exactly over the nav logo
  const overNavLogo = () => {
    button.style.transform = "none";
    const to = button.getBoundingClientRect();
    const from = navLogo.getBoundingClientRect();
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
  };

  const setOpen = (open) => {
    fab.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
  };

  // Run fn once the transform transition ends (the shadow fade ends too, so filter on it)
  const afterMove = (fn) => {
    if (instant) return fn();
    const handler = (e) => {
      if (e.propertyName !== "transform") return;
      button.removeEventListener("transitionend", handler);
      fn();
    };
    button.addEventListener("transitionend", handler);
  };

  const flyOut = () => {
    docked = true;
    fab.classList.remove("is-flying", "is-docked");
    button.style.transform = overNavLogo(); // start exactly on the nav logo
    button.getBoundingClientRect(); // apply it before transitions are switched on
    document.body.classList.add("fab-away");
    fab.classList.add("is-flying");
    button.getBoundingClientRect(); // commit the start position before animating
    button.style.transform = "none";
    button.tabIndex = 0;
    afterMove(() => {
      if (!docked) return;
      fab.classList.replace("is-flying", "is-docked");
      button.style.transform = "";
    });
  };

  const flyHome = () => {
    docked = false;
    setOpen(false);
    button.tabIndex = -1;
    const target = overNavLogo(); // measured from the docked spot
    fab.classList.add("is-flying");
    fab.classList.remove("is-docked");
    button.getBoundingClientRect();
    button.style.transform = target;
    afterMove(() => {
      if (docked) return;
      fab.classList.remove("is-flying");
      button.style.transform = "";
      document.body.classList.remove("fab-away");
    });
  };

  const check = () => {
    const past = landing.getBoundingClientRect().bottom < window.innerHeight * 0.25;
    if (past && !docked) flyOut();
    else if (!past && docked) flyHome();
  };
  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", check);
  check();

  button.addEventListener("click", () => setOpen(!fab.classList.contains("is-open")));
  document.addEventListener("click", (e) => { if (!fab.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();
