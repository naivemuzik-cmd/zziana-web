const A1_COUNTER = [[428.3, 161.1], [485.7, 61.6], [543.1, 161.1]];
const A2_COUNTER = [[838.6, 161.1], [895.9, 61.8], [953.2, 161.1]];
const R_IN_U = 114.8 / (2 * Math.sqrt(3)); // radio inscripto del hueco ≈ 33.1
const RING_U = 26.9;                        // ancho del anillo blanco del logo
const BLEED = 0.75;                         // px extra bajo el anillo: sin hilo oscuro entre video y glifo
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const inOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const centroid = (p) => [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3];
const fmt = (p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
const sub = (p) => `M${fmt(p[0])} L${fmt(p[1])} L${fmt(p[2])} Z`;
const scaleTri = (pts, c, k, dx, dy) => pts.map(([x, y]) => [c[0] + (x - c[0]) * k + dx, c[1] + (y - c[1]) * k + dy]);
export function initHero({ t, reduced, motion }) {
  window.__zzHero = true;
  const html = document.documentElement;
  const hero = document.querySelector('.hero');
  const stage = hero.querySelector('.stage');
  const video = stage.querySelector('.aperture');
  const h1 = stage.querySelector('.wordmark');
  const svg = h1.querySelector('svg');
  const glyphs = [...svg.querySelectorAll('.glyph')];
  const ringSvg = stage.querySelector('.ring');
  const ringPath = ringSvg.querySelector('.ring-path');
  const ui = stage.querySelector('.hero-ui');
  const parts = [ui.querySelector('.hero-meta'), ui.querySelector('.hero-cta'), ui.querySelector('.hero-foot')];
  const fade = stage.querySelector('.stage-fade');
  const header = document.querySelector('.site-header');
  const toggle = stage.querySelector('.video-toggle');
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const animate = motion && gsap && ST;
  if (motion && !animate) html.classList.remove('js-motion'); // sin GSAP: todo quieto y visible
  const st = { iris: animate ? 0 : 1, p: 0 };
  const introDone = () => { window.__zzIntro = true; document.dispatchEvent(new CustomEvent('zz:intro')); };
  if (!animate) introDone();
  let g = null;
  let raf = 0;
  let last = '';
  function measure() {
    const prev = h1.style.transform;
    h1.style.transform = 'none';
    const m = svg.getScreenCTM();
    const sr = stage.getBoundingClientRect();
    h1.style.transform = prev;
    if (!m || !sr.width) return;
    const map = ([x, y]) => [m.a * x + m.c * y + m.e - sr.left, m.b * x + m.d * y + m.f - sr.top];
    const a1 = A1_COUNTER.map(map);
    const a2 = A2_COUNTER.map(map);
    const scale = Math.hypot(m.a, m.b);
    const rin = R_IN_U * scale;
    const W = sr.width;
    const H = sr.height;
    const S = (Math.hypot(W / 2, H / 2) / rin) * 1.04;
    g = { a1, a2, c1: centroid(a1), c2: centroid(a2), rin, w: RING_U * scale, scale, W, H, S };
    ringSvg.setAttribute('viewBox', `0 0 ${W.toFixed(2)} ${H.toFixed(2)}`);
    last = '';
  }
  const k = (s) => (g.rin * s + BLEED) / g.rin;
  function writeClip(s1, s2, dx1, dy1, dx2, dy2) {
    let d = '';
    if (s1 > 0.001) d += sub(scaleTri(g.a1, g.c1, k(s1), dx1, dy1));
    if (s2 > 0.001) d += (d ? ' ' : '') + sub(scaleTri(g.a2, g.c2, k(s2), dx2, dy2));
    video.style.clipPath = d ? `path('${d}')` : 'polygon(0 0, 0 0, 0 0)';
  }
  function render() {
    raf = 0;
    if (!g) return;
    const key = `${st.p.toFixed(4)}|${st.iris.toFixed(4)}|${g.W}|${g.H}`;
    if (key === last) return;
    last = key;
    const p = st.p;
    const e = inOut(clamp01(p / 0.3));
    const dx = (g.W / 2 - g.c2[0]) * e;
    const dy = (g.H / 2 - g.c2[1]) * e;
    h1.style.transform = e > 0 ? `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)` : '';
    const drift = (innerWidth * 0.04 * e) / g.scale;
    for (let i = 0; i < 5; i++) {
      const dir = i === 4 ? [0.5, 0.866] : [-0.5, -0.866];
      glyphs[i].style.opacity = e > 0 ? String(1 - e) : '';
      glyphs[i].style.transform = e > 0 ? `translate(${(dir[0] * drift).toFixed(2)}px, ${(dir[1] * drift).toFixed(2)}px)` : '';
    }
    const uiOp = 1 - clamp01(p / 0.2);
    ui.style.opacity = p > 0 ? String(uiOp) : '';
    ui.style.visibility = uiOp <= 0 ? 'hidden' : '';
    const s1 = st.iris * (1 - e);
    let s2 = st.iris;
    if (p < 0.3) {
      glyphs[5].style.opacity = '';
      ringPath.style.visibility = 'hidden';
    } else {
      const q = clamp01((p - 0.3) / 0.7);
      s2 = 1 + (g.S - 1) * q * q;
      glyphs[5].style.opacity = '0';
      const outer = scaleTri(g.a2, g.c2, (g.rin * s2 + g.w) / g.rin, dx, dy);
      const inner = scaleTri(g.a2, g.c2, s2, dx, dy);
      ringPath.setAttribute('d', `${sub(outer)} ${sub(inner)}`);
      const x = clamp01((p - 0.3) / 0.12);
      const c = x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); // expo.out: azul enseguida después del relevo
      ringPath.style.fill = `color-mix(in oklab, var(--laser) ${(c * 100).toFixed(1)}%, var(--luz))`;
      ringPath.style.visibility = 'visible';
    }
    fade.style.opacity = String(clamp01((p - 0.9) / 0.1));
    const dpx = innerWidth * 0.04 * e;
    writeClip(s1, s2, dx - 0.5 * dpx, dy - 0.866 * dpx, dx, dy);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };
  measure();
  render();
  new ResizeObserver(() => { measure(); schedule(); }).observe(stage);
  document.fonts?.ready.then(() => { measure(); schedule(); });
  if (animate) {
    gsap.registerPlugin(ST);
    const wipes = glyphs.map((gl) => ({ w: 0, box: gl.getBBox() }));
    const K = Math.tan(Math.PI / 6); // barrido sobre una diagonal de 60°
    const wipeClip = (i) => {
      const { w, box } = wipes[i];
      if (w >= 0.999) { glyphs[i].style.clipPath = 'none'; return; }
      const y0 = box.y - 2;
      const y1 = box.y + box.height + 2;
      const h = y1 - y0;
      const from = box.x - 2 - K * h;
      const to = box.x + box.width + 2;
      const c = from + (to - from) * w;
      const x0 = box.x - 4;
      glyphs[i].style.clipPath = `polygon(${x0}px ${y0}px, ${(c + K * h).toFixed(2)}px ${y0}px, ${c.toFixed(2)}px ${y1}px, ${x0}px ${y1}px) view-box`;
    };
    wipes.forEach((_, i) => wipeClip(i));
    const tl = gsap.timeline({ onComplete: finish });
    wipes.forEach((o, i) => tl.to(o, { w: 1, duration: 0.48, ease: 'expo.out', onUpdate: () => wipeClip(i) }, i * 0.07));
    tl.to(st, { iris: 1, duration: 0.6, ease: 'expo.out', onUpdate: schedule }, 0.7);
    tl.fromTo(parts, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' }, 1.0);
    tl.to(header, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 1.3);
    const skipEvents = ['keydown', 'wheel', 'touchstart', 'pointerdown'];
    const skip = () => { if (tl.progress() < 1) tl.progress(1); };
    skipEvents.forEach((ev) => addEventListener(ev, skip, { passive: true }));
    function finish() {
      skipEvents.forEach((ev) => removeEventListener(ev, skip));
      glyphs.forEach((gl) => { gl.style.clipPath = 'none'; });
      st.iris = 1;
      schedule();
      introDone();
    }
    ST.config({ ignoreMobileResize: true });
    const low = (navigator.hardwareConcurrency || 8) <= 4 || navigator.connection?.saveData;
    ST.create({
      trigger: hero,
      pin: stage,
      start: 'top top',
      end: () => (low ? '+=80%' : matchMedia('(max-width: 700px)').matches ? '+=90%' : '+=120%'),
      scrub: 0.6,
      onUpdate: (self) => { st.p = self.progress; schedule(); },
      onToggle: (self) => { video.style.willChange = self.isActive ? 'clip-path' : ''; },
      onRefresh: (self) => { measure(); st.p = self.progress; schedule(); },
    });
  }
  const mobile = matchMedia('(max-width: 700px)').matches;
  const slug = mobile ? 'hero-mobile' : 'hero-desktop';
  for (const s of [...video.querySelectorAll('source')]) if (!s.getAttribute('src').includes(`/${slug}.`)) s.remove();
  const saveData = !!navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;
  const auto = !reduced && !saveData;
  let started = false;
  let userPaused = false;
  let inView = true;
  const setToggle = (playing) => {
    toggle.dataset.i18n = playing ? 'video.pause' : 'video.play';
    toggle.textContent = t(toggle.dataset.i18n);
  };
  function play() {
    if (!started) {
      started = true;
      if (video.currentSrc && !video.currentSrc.includes(`/${slug}.`)) video.load();
      video.preload = 'auto'; // esto ya dispara la descarga
    }
    const pr = video.play();
    if (pr) pr.then(() => setToggle(true), () => setToggle(false));
  }
  let ready = false; // ya pasó load + idle: se puede arrancar solo
  if (auto) {
    const go = () => {
      const start = () => { ready = true; if (inView && !userPaused) play(); };
      'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300);
    };
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  } else {
    setToggle(false);
  }
  toggle.addEventListener('click', () => {
    if (toggle.dataset.i18n === 'video.pause') { userPaused = true; video.pause(); setToggle(false); }
    else { userPaused = false; play(); }
  });
  new IntersectionObserver(([en]) => {
    inView = en.isIntersecting;
    if (!inView) { if (!video.paused) video.pause(); }
    else if ((started || (auto && ready)) && !userPaused && video.paused) play();
  }).observe(stage);
}
