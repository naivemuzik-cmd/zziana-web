const SRC_LENIS = 'assets/vendor/lenis.min.js';
const SRC_SPLIT = 'assets/vendor/SplitText.min.js';
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CURSOR_EN = { VER: 'VIEW' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const scripts = new Map();
function loadScript(src) {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => res();
      s.onerror = () => rej(new Error('no cargó ' + src));
      document.head.append(s);
    }));
  }
  return scripts.get(src);
}
const ticks = new Set();
const skews = [];
let vel = 0;
let lastY = 0;
let sampleDt = 0;
let getLang = () => 'es';
let splitReady = null;
export const motion = {
  on: false,
  smooth: false,
  lenis: null,
  velocity: () => vel,
  y: () => lastY,
  onTick(fn) { ticks.add(fn); return fn; },
  offTick(fn) { ticks.delete(fn); },
  split: () => splitReady,       // Promise de SplitText (null sin movimiento)
  stop() { motion.lenis?.stop(); },
  start() { motion.lenis?.start(); },
  scrollTo, revealTitle, revealLines, decode, marquee, skew, triReveal, parallax,
};
export function initMotion(ctx) {
  getLang = ctx.getLang;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  motion.on = !!(ctx.motion && gsap && ST);
  if (!motion.on) return motion;
  gsap.registerPlugin(ST);
  splitReady = loadScript(SRC_SPLIT).then(() => { gsap.registerPlugin(window.SplitText); return window.SplitText; });
  splitReady.catch(() => { for (const el of document.querySelectorAll('.tw')) el.classList.remove('tw'); });
  lastY = scrollY;
  gsap.ticker.add((time, dt) => {
    const y = scrollY;
    const raw = dt > 0 ? ((y - lastY) / dt) * 1000 : 0;
    lastY = y;
    sampleDt = dt;
    vel += (clamp(raw, -9000, 9000) - vel) * 0.18;
    if (Math.abs(vel) < 0.5) vel = 0;
  }, false, true);
  gsap.ticker.add(() => {
    for (const fn of ticks) fn(sampleDt, vel);
    applySkew();
  });
  const ready = () => document.documentElement.classList.add('st-ready');
  ST.addEventListener('refresh', ready);
  setTimeout(ready, 3000);
  const fine = matchMedia('(pointer: fine) and (hover: hover)').matches;
  if (fine) {
    loadScript(SRC_LENIS).then(() => {
      const lenis = new window.Lenis({
        autoRaf: false,
        lerp: 0.1,
        smoothWheel: true,
        prevent: (node) => !!node.closest?.('[data-lenis-prevent], dialog, [popover]'),
      });
      lenis.on('scroll', ST.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      motion.lenis = lenis;
      motion.smooth = true;
      document.addEventListener('zz:media', (e) => {
        if (e.detail.source === 'dialog') e.detail.playing ? lenis.stop() : lenis.start();
      });
    }, () => { /* sin Lenis: scroll nativo */ });
    initCursor(gsap);
  }
  document.addEventListener('zz:lang', () => {
    for (const [el, s] of splits) {
      s.tween?.kill();
      el.classList.remove('tw-run');
      splits.delete(el);
    }
  });
  const refresh = () => ST.refresh();
  document.fonts?.ready.then(refresh);
  addEventListener('load', refresh, { once: true });
  return motion;
}
function flowTop(el) {
  const mark = el.previousElementSibling?.classList.contains('flow-mark') ? el.previousElementSibling : el;
  return mark.getBoundingClientRect().top + scrollY;
}
function anchorTop(el) {
  if (el.id === 'sets' && motion.on) {
    const head = el.querySelector('.sec-head');
    if (head) return head.getBoundingClientRect().top + scrollY - 64 - 24;
  }
  return flowTop(el);
}
function scrollTo(target, { focus = null, immediate = false } = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  const y = typeof target === 'number' ? target : !el || el.id === 'top' ? 0 : Math.max(0, anchorTop(el));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motion.lenis) {
    motion.lenis.scrollTo(y, { immediate: immediate || reduced, duration: 1.3, easing: (t) => 1 - Math.pow(2, -10 * t), force: true });
  } else {
    window.scrollTo({ top: y, behavior: immediate || reduced ? 'instant' : 'smooth' });
  }
  if (focus) focus.focus({ preventScroll: true });
}
const onceCbs = new WeakMap();
let onceIO = null;
function whenSeen(el, cb) {
  onceIO ??= new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      onceIO.unobserve(en.target);
      const f = onceCbs.get(en.target);
      onceCbs.delete(en.target);
      f?.();
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  onceCbs.set(el, cb);
  onceIO.observe(el);
}
const splits = new Map();
function revealTitle(el) {
  if (!motion.on || !el) return;
  el.classList.add('tw');
  whenSeen(el, () => playTitle(el));
}
async function playTitle(el) {
  const gsap = window.gsap;
  let S;
  try { S = await splitReady; await document.fonts?.ready; } catch { el.classList.remove('tw'); return; }
  const split = S.create(el, {
    type: 'words,chars', mask: 'words', ignore: '.delta', aria: 'auto', overwrite: false,
    wordsClass: 'tw-w', charsClass: 'tw-c',
  });
  el.classList.add('tw-run');
  const items = [...el.querySelectorAll('.tw-c, .delta svg')];
  gsap.set(items, { yPercent: 118 });
  el.classList.remove('tw');
  const rec = { split };
  splits.set(el, rec);
  rec.tween = gsap.to(items, {
    yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.03,
    onComplete: () => {
      if (splits.get(el) !== rec) return; // cambió el idioma: el contenido ya es otro
      splits.delete(el);
      split.revert();
      el.classList.remove('tw-run');
    },
  });
}
function revealLines(el, { stagger = 0.09 } = {}) {
  if (!motion.on || !el) return;
  el.classList.add('tw');
  whenSeen(el, async () => {
    const gsap = window.gsap;
    let S;
    try { S = await splitReady; await document.fonts?.ready; } catch { el.classList.remove('tw'); return; }
    const split = S.create(el, { type: 'lines', mask: 'lines', linesClass: 'tl-l', aria: 'auto', overwrite: false });
    const lines = split.lines;
    gsap.set(lines, { yPercent: 110 });
    el.classList.remove('tw');
    const rec = { split };
    splits.set(el, rec);
    rec.tween = gsap.to(lines, {
      yPercent: 0, duration: 0.9, ease: 'expo.out', stagger,
      onComplete: () => { if (splits.get(el) === rec) { splits.delete(el); split.revert(); } },
    });
  });
}
function decode(el, { duration = 560, delay = 0, pool = POOL } = {}) {
  if (!motion.on || !el || !el.textContent.trim()) return;
  el.classList.add('dc-wait');
  whenSeen(el, () => runDecode(el, duration, delay, pool));
}
function runDecode(el, duration, delay, pool) {
  const text = el.textContent;
  el.style.transition = 'none';
  el.classList.remove('dc-wait');
  const cs = getComputedStyle(el);
  el.style.setProperty('--dc-c', cs.color);
  if (cs.position === 'static') el.classList.add('dc-rel');
  el.style.transition = '';
  el.dataset.dc = '';
  el.classList.add('dc-run');
  const chars = [...text];
  const at = chars.map((_, i) => 0.15 + (i / Math.max(1, chars.length)) * 0.6 + Math.random() * 0.25);
  const keep = (c) => /[\s ·.,:/&()#@-]/.test(c);
  let t0 = 0;
  let lastSwap = 0;
  const fn = () => {
    const now = performance.now();
    if (!t0) t0 = now + delay;
    if (el.textContent !== text) { done(); return; } // cambió el idioma a mitad: queda el texto real
    const p = (now - t0) / duration;
    if (p >= 1) { done(); return; }
    if (now - lastSwap < 45) return; // los caracteres al azar cambian ~22 veces por segundo
    lastSwap = now;
    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      out += p >= at[i] || keep(c) ? c : p < 0 ? ' ' : pool[(Math.random() * pool.length) | 0];
    }
    el.dataset.dc = out;
  };
  const done = () => {
    motion.offTick(fn);
    delete el.dataset.dc;
    el.style.removeProperty('--dc-c');
    el.classList.remove('dc-run', 'dc-rel');
  };
  motion.onTick(fn);
}
function marquee(el, { speed, rate = 0.42, dir = -1 } = {}) {
  const track = el?.querySelector('.mq-track');
  const seq = track?.querySelector('.mq-seq');
  if (!motion.on || !seq) return null;
  let w = 0;
  let x = 0;
  let visible = false;
  let px = 0;
  const fill = () => {
    w = seq.getBoundingClientRect().width;
    if (!w) return;
    const need = Math.ceil(el.clientWidth / w) + 1;
    while (track.children.length < Math.min(need, 12)) track.append(seq.cloneNode(true));
    px = speed ?? parseFloat(getComputedStyle(el).fontSize) * rate; // px/s (rate: cuerpos de letra por segundo)
    if (dir > 0 && x === 0) x = -w;
  };
  fill();
  new ResizeObserver(fill).observe(el);
  document.fonts?.ready.then(fill);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(el);
  const fn = (dt, v) => {
    if (!visible || !w) return;
    const boost = 1 + Math.min(Math.abs(v) / 260, 9);
    x += dir * px * boost * (dt / 1000);
    if (x <= -w) x += w;
    if (x > 0) x -= w;
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  };
  motion.onTick(fn);
  el.classList.add('mq-live');
  return { kill: () => motion.offTick(fn) };
}
let skewIO = null;
function skew(el, { max = 3, when = null, axis = 'Y' } = {}) {
  if (!motion.on || !el) return;
  const rec = { el, max, when, axis, seen: false, cur: 0 };
  skewIO ??= new IntersectionObserver((entries) => {
    for (const en of entries) {
      const r = skews.find((s) => s.el === en.target);
      if (r) r.seen = en.isIntersecting;
    }
  });
  skews.push(rec);
  skewIO.observe(el);
}
function applySkew() {
  for (const s of skews) s.target = !s.seen ? 0 : s.when && !s.when() ? 0 : clamp(-vel / 900, -s.max, s.max);
  for (const s of skews) {
    if (!s.seen && !s.cur) continue;
    s.cur += (s.target - s.cur) * 0.14;
    if (Math.abs(s.cur) < 0.005) s.cur = 0;
    const v = s.cur.toFixed(2);
    if (v !== s.last) { s.last = v; s.el.style.transform = s.cur ? `skew${s.axis}(${v}deg)` : ''; }
  }
}
const R3 = Math.sqrt(3);
function triPoly(W, H, p, size = 0.46) {
  const s0 = Math.min(W, H * 1.15) * size;
  const h0 = (s0 * R3) / 2;
  const cy = H / 2 + h0 * 0.08;
  const a0 = cy - h0 * 0.667;
  const b0 = cy + h0 * 0.333;
  const a = a0 + ((-W * R3) / 2 - a0) * p;
  const b = b0 + (H - b0) * p;
  const half = (b - a) / R3;
  const cx = W / 2;
  return [[cx, a], [cx + half, b], [cx - half, b]];
}
function triReveal(el, { trigger = el, start = 'top 85%', end = 'top 25%', scrub = 0.5, edge = null, size, onUpdate } = {}) {
  const gsap = window.gsap;
  if (!motion.on || !el) return null;
  let W = 0;
  let H = 0;
  let svg = null;
  let poly = null;
  if (edge) {
    svg = edge.querySelector(':scope > .tri-edge');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'tri-edge');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.append(document.createElementNS('http://www.w3.org/2000/svg', 'polygon'));
      edge.append(svg);
    }
    poly = svg.firstElementChild;
  }
  const st = { p: 0 };
  const draw = () => {
    const p = st.p;
    if (p >= 0.999) {
      el.style.clipPath = '';
      if (svg) svg.style.opacity = '0';
    } else {
      const pts = triPoly(W, H, p, size);
      el.style.clipPath = `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
      if (svg) {
        poly.setAttribute('points', pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
        svg.style.opacity = String(clamp(1 - p * 1.25, 0, 1));
      }
    }
    onUpdate?.(p);
  };
  let trig = null;
  const ro = new ResizeObserver(() => {
    if (trig && !window.ScrollTrigger.getAll().includes(trig)) { ro.disconnect(); return; }
    measure();
  });
  const measure = () => {
    W = el.offsetWidth;
    H = el.offsetHeight;
    svg?.setAttribute('viewBox', `0 0 ${W} ${H}`);
    draw();
  };
  measure();
  ro.observe(el);
  trig = window.ScrollTrigger.create({
    trigger, start, end, scrub,
    animation: gsap.to(st, { p: 1, ease: 'power2.inOut', onUpdate: draw }),
    onRefresh: measure,
  });
  return trig;
}
function parallax(el, { from = -8, to = 8, trigger = el, start = 'top bottom', end = 'bottom top', scrub = true } = {}) {
  if (!motion.on || !el) return null;
  return window.gsap.fromTo(el, { yPercent: from }, { yPercent: to, ease: 'none', scrollTrigger: { trigger, start, end, scrub } });
}
function initCursor(gsap) {
  const ring = document.createElement('div');
  ring.className = 'cur-ring';
  const ringC = document.createElement('i');
  ring.append(ringC);
  const disc = document.createElement('div');
  disc.className = 'cur-disc';
  const label = document.createElement('span');
  disc.append(label);
  for (const n of [ring, disc]) { n.setAttribute('aria-hidden', 'true'); document.body.append(n); }
  gsap.set(disc, { scale: 0 });
  const opt = { duration: 0.42, ease: 'power3.out' };
  const rx = gsap.quickTo(ring, 'x', opt);
  const ry = gsap.quickTo(ring, 'y', opt);
  const dx = gsap.quickTo(disc, 'x', { duration: 0.55, ease: 'power3.out' });
  const dy = gsap.quickTo(disc, 'y', { duration: 0.55, ease: 'power3.out' });
  let shown = false;
  let cur = null;
  const show = (v) => {
    if (v === shown) return;
    shown = v;
    ring.classList.toggle('on', v);
    disc.classList.toggle('on', v);
  };
  const setLabel = (key) => {
    if (key === cur) return;
    cur = key;
    if (key) {
      label.textContent = getLang() === 'en' ? CURSOR_EN[key] ?? key : key;
      gsap.to(disc, { scale: 1, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
      gsap.to(ringC, { scale: 0.4, opacity: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    } else {
      gsap.to(disc, { scale: 0, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
      gsap.to(ringC, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    }
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!shown) { gsap.set([ring, disc], { x: e.clientX, y: e.clientY }); show(true); }
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    const t = e.target.closest?.('[data-cursor]');
    setLabel(t && !t.closest('[data-state]') ? t.dataset.cursor : null);
  }, { passive: true });
  addEventListener('keydown', () => { setLabel(null); show(false); });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) { show(false); setLabel(null); } });
  addEventListener('blur', () => show(false));
}
