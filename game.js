/* Afterimage - a colour memory game. Pure vanilla JS, no deps. */

const Afterimage = (() => {
  "use strict";

  const ROUNDS = 5;
  const MEMORISE_MS = 5000;
  const DELTA_E_ZERO = 60; // delta-E at/above this scores 0%

  const state = {
    round: 0,
    target: null,
    scores: [],
    timer: null,
  };

  let el = {};

  // bias S/L to the mid-range so swatches stay vivid
  function randomColour() {
    return {
      h: Math.floor(Math.random() * 360),
      s: 45 + Math.floor(Math.random() * 50),
      l: 30 + Math.floor(Math.random() * 45),
    };
  }

  function hslString({ h, s, l }) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    if (s === 0) return [l, l, l];

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
  }

  function rgbToXyz(r, g, b) {
    const lin = (c) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);
    r = lin(r) * 100;
    g = lin(g) * 100;
    b = lin(b) * 100;
    return [
      r * 0.4124 + g * 0.3576 + b * 0.1805,
      r * 0.2126 + g * 0.7152 + b * 0.0722,
      r * 0.0193 + g * 0.1192 + b * 0.9505,
    ];
  }

  function xyzToLab(x, y, z) {
    const ref = [95.047, 100.0, 108.883]; // D65 white point
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x / ref[0]);
    const fy = f(y / ref[1]);
    const fz = f(z / ref[2]);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function hslToLab(c) {
    const [r, g, b] = hslToRgb(c.h, c.s, c.l);
    const [x, y, z] = rgbToXyz(r, g, b);
    return xyzToLab(x, y, z);
  }

  // CIE76 delta-E: perceptual distance in Lab space
  function deltaE(a, b) {
    const la = hslToLab(a);
    const lb = hslToLab(b);
    return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
  }

  function scoreFromDeltaE(dE) {
    const pct = Math.max(0, 1 - dE / DELTA_E_ZERO) * 100;
    return Math.round(pct);
  }

  function verdict(pct) {
    if (pct >= 95) return "Pixel-perfect. Are you a monitor?";
    if (pct >= 85) return "Outstanding. That is a trained eye.";
    if (pct >= 70) return "Really close. Nicely done.";
    if (pct >= 50) return "Solid guess. You had the vibe.";
    if (pct >= 30) return "In the neighbourhood.";
    return "Bold choice. Colour memory is hard!";
  }

  function show(phase) {
    el.phases.forEach((p) => p.classList.toggle("active", p.dataset.phase === phase));
  }

  function renderProgress() {
    el.progress.innerHTML = "";
    for (let i = 0; i < ROUNDS; i++) {
      const pip = document.createElement("span");
      pip.className = "pip";
      if (i < state.round) pip.classList.add("done");
      else if (i === state.round) pip.classList.add("current");
      el.progress.appendChild(pip);
    }
  }

  function startGame() {
    state.round = 0;
    state.scores = [];
    nextRound();
  }

  function nextRound() {
    if (state.round >= ROUNDS) return finish();
    renderProgress();
    state.target = randomColour();
    memorise();
  }

  function memorise() {
    show("memorise");
    el.memoSwatch.style.background = hslString(state.target);

    // run the countdown bar from full to empty
    const bar = el.memoTimerBar;
    bar.style.transition = "none";
    bar.style.transform = "scaleX(1)";
    void bar.offsetWidth; // reflow before animating
    bar.style.transition = `transform ${MEMORISE_MS}ms linear`;
    bar.style.transform = "scaleX(0)";

    clearTimeout(state.timer);
    state.timer = setTimeout(beginGuess, MEMORISE_MS);
  }

  function beginGuess() {
    // reset sliders so the last guess isn't a hint
    el.hue.value = 180;
    el.sat.value = 50;
    el.lit.value = 50;
    syncSliders();
    show("guess");
  }

  function syncSliders() {
    const h = +el.hue.value;
    const s = +el.sat.value;
    const l = +el.lit.value;
    el.hueVal.textContent = `${h}°`;
    el.satVal.textContent = `${s}%`;
    el.litVal.textContent = `${l}%`;
    el.guessPreview.style.background = `hsl(${h}, ${s}%, ${l}%)`;
  }

  function lockIn() {
    const guess = { h: +el.hue.value, s: +el.sat.value, l: +el.lit.value };
    const pct = scoreFromDeltaE(deltaE(state.target, guess));
    state.scores.push({ pct, target: state.target, guess });

    el.revealTarget.style.background = hslString(state.target);
    el.revealGuess.style.background = hslString(guess);
    el.roundVerdict.textContent = verdict(pct);
    animateNumber(el.roundPct, pct);
    show("reveal");
  }

  function advance() {
    state.round++;
    nextRound();
  }

  function finish() {
    renderProgress();
    const avg = Math.round(
      state.scores.reduce((sum, r) => sum + r.pct, 0) / state.scores.length
    );

    el.finalRounds.innerHTML = "";
    state.scores.forEach((r, i) => {
      const wrap = document.createElement("div");
      wrap.className = "final__round";
      wrap.innerHTML =
        `<span class="sw" style="background:${hslString(r.target)}"></span>` +
        `<span>R${i + 1}</span><b>${r.pct}%</b>`;
      el.finalRounds.appendChild(wrap);
    });

    el.finalVerdict.textContent = verdict(avg);
    animateNumber(el.finalPct, avg);
    show("final");
  }

  // count-up animation
  function animateNumber(node, target) {
    const start = performance.now();
    const dur = 700;
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(eased * target);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    const $ = (id) => document.getElementById(id);
    el = {
      phases: Array.from(document.querySelectorAll("#gameStage .phase")),
      progress: $("gameProgress"),
      memoSwatch: $("memoSwatch"),
      memoTimerBar: $("memoTimerBar"),
      guessPreview: $("guessPreview"),
      hue: $("hue"),
      sat: $("sat"),
      lit: $("lit"),
      hueVal: $("hueVal"),
      satVal: $("satVal"),
      litVal: $("litVal"),
      revealTarget: $("revealTarget"),
      revealGuess: $("revealGuess"),
      roundPct: $("roundPct"),
      roundVerdict: $("roundVerdict"),
      finalRounds: $("finalRounds"),
      finalPct: $("finalPct"),
      finalVerdict: $("finalVerdict"),
    };

    $("startBtn").addEventListener("click", startGame);
    $("lockBtn").addEventListener("click", lockIn);
    $("nextBtn").addEventListener("click", advance);
    $("againBtn").addEventListener("click", startGame);

    [el.hue, el.sat, el.lit].forEach((s) =>
      s.addEventListener("input", syncSliders)
    );

    renderProgress();
    syncSliders();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Afterimage.init);
