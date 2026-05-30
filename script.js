(() => {
  "use strict";

  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const body = document.body;

  // sticky nav background on scroll
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // mobile menu
  function closeMenu() {
    body.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
  navToggle.addEventListener("click", () => {
    const open = body.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });

  // scroll reveal
  const revealEls = document.querySelectorAll(".reveal-up");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  // language map
  const langCanvas = document.getElementById("langCanvas");
  if (langCanvas) {
    const mapHost = document.getElementById("indiaMap");
    const pins = Array.from(langCanvas.querySelectorAll(".langmap__pin"));
    const card = document.getElementById("langCard");
    const lcName = document.getElementById("lcName");
    const lcRegion = document.getElementById("lcRegion");
    const lcLevel = document.getElementById("lcLevel");
    const lcNote = document.getElementById("lcNote");

    let activePin = pins.find((p) => p.classList.contains("is-active")) || pins[0];

    function statesFor(pin) {
      const spec = pin.dataset.states || "";
      if (spec === "all") return Array.from(mapHost.querySelectorAll(".state"));
      return spec
        .split(/\s+/)
        .map((id) => mapHost.querySelector(`[data-id="${id}"]`))
        .filter(Boolean);
    }

    function paintMap(pin) {
      const colour = pin.style.getPropertyValue("--c");
      mapHost
        .querySelectorAll(".state.lit")
        .forEach((s) => s.classList.remove("lit"));
      statesFor(pin).forEach((s) => {
        s.style.setProperty("--lit", colour);
        s.classList.add("lit");
      });
    }

    function fillCard(pin) {
      const d = pin.dataset;
      lcName.textContent = d.lang;
      lcRegion.textContent = d.region;
      lcLevel.textContent = d.level;
      lcNote.textContent = d.note;
      card.style.setProperty("--c", pin.style.getPropertyValue("--c"));
      card.classList.remove("flash");
      void card.offsetWidth;
      card.classList.add("flash");
    }

    function selectPin(pin, { persist } = {}) {
      fillCard(pin);
      paintMap(pin);
      if (persist) {
        activePin = pin;
        pins.forEach((p) => p.classList.toggle("is-active", p === pin));
      }
    }

    pins.forEach((pin) => {
      pin.addEventListener("mouseenter", () => selectPin(pin));
      pin.addEventListener("focus", () => selectPin(pin, { persist: true }));
      pin.addEventListener("click", () => selectPin(pin, { persist: true }));
    });

    // revert to the locked-in pin on mouse out
    langCanvas.addEventListener("mouseleave", () => {
      if (activePin) selectPin(activePin);
    });

    // load the map, then light up the default
    fetch("assets/india.svg")
      .then((r) => r.text())
      .then((svg) => {
        mapHost.innerHTML = svg;
        if (activePin) paintMap(activePin);
      })
      .catch(() => {
        mapHost.classList.add("langmap__map--missing");
      });
  }

  // active nav link for the section in view
  const links = Array.from(navLinks.querySelectorAll("a"));
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          links.forEach((a) =>
            a.classList.toggle("active", a.getAttribute("href") === `#${id}`)
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  // "view source" modal
  const modal = document.getElementById("codeModal");
  const codeContent = document.getElementById("codeContent");
  let codeLoaded = false;

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // tiny JS highlighter; stash comments/strings first so keywords inside them survive
  function highlight(src) {
    const KEYWORDS =
      /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|this|typeof|instanceof|void|in|of|try|catch|finally|throw|delete|yield|await|async|default)\b/g;

    const tokens = [];
    const stash = (cls, text) => {
      tokens.push(`<span class="${cls}">${escapeHtml(text)}</span>`);
      return `\u0000${tokens.length - 1}\u0000`;
    };

    let out = src
      // block + line comments
      .replace(/\/\*[\s\S]*?\*\//g, (m) => stash("tok-com", m))
      .replace(/\/\/[^\n]*/g, (m) => stash("tok-com", m))
      // strings (single, double, template)
      .replace(/`(?:\\.|[^`\\])*`/g, (m) => stash("tok-str", m))
      .replace(/"(?:\\.|[^"\\])*"/g, (m) => stash("tok-str", m))
      .replace(/'(?:\\.|[^'\\])*'/g, (m) => stash("tok-str", m));

    out = escapeHtml(out)
      .replace(KEYWORDS, '<span class="tok-key">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>')
      // function-call names
      .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');

    // restore stashed tokens (tolerate a number span around the index)
    out = out.replace(
      /\u0000(?:<span class="tok-num">)?(\d+)(?:<\/span>)?\u0000/g,
      (_, i) => tokens[+i]
    );
    return out;
  }

  async function loadCode() {
    if (codeLoaded) return;
    // live file first, fall back to the embedded mirror for file://
    try {
      const res = await fetch("game.js");
      if (!res.ok) throw new Error("bad status");
      const text = await res.text();
      codeContent.innerHTML = highlight(text);
      codeLoaded = true;
      return;
    } catch (err) {
      if (typeof window.GAME_SRC === "string") {
        codeContent.innerHTML = highlight(window.GAME_SRC);
        codeLoaded = true;
        return;
      }
      codeContent.textContent =
        "Couldn't load the source here. Serve the folder over HTTP, or view game.js on GitHub.";
    }
  }

  function openModal() {
    loadCode();
    modal.classList.add("open");
    body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("open");
    body.style.overflow = "";
  }

  ["viewCodeBtn", "viewCodeBtn2"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", openModal);
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });
})();
