import { motion } from './motion.js';
const TRACK_MQ = '(min-width: 900px) and (hover: hover) and (pointer: fine)';
const pad = (n) => String(n).padStart(2, '0');
export function initGallery({ t }) {
  const sec = document.getElementById('fotos');
  const tiles = [...document.querySelectorAll('.photo')];
  const dlg = document.querySelector('.lightbox');
  if (!sec || !dlg || !tiles.length) return;
  const counter = initCounter(sec, tiles.length);
  initLightbox(dlg, tiles);
  if (!motion.on) return;
  initTrack(sec, tiles, counter);
  initStrip(sec, tiles, counter);
}
function initCounter(sec, total) {
  const n = sec.querySelector('.fc-n');
  const bar = sec.querySelector('.fc-bar i');
  sec.querySelector('.fc-t').textContent = `/ ${pad(total)}`;
  let last = -1;
  return {
    set(i, p = null) {
      if (i !== last) { last = i; n.textContent = pad(i + 1); }
      if (bar && p !== null) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    },
  };
}
function initTrack(sec, tiles, counter) {
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const track = sec.querySelector('.steps');
  const ghost = sec.querySelector('.fotos-ghost');
  const isTrack = () => sec.classList.contains('is-track');
  for (const b of tiles) motion.skew(b, { max: 3, axis: 'X', when: isTrack });
  const mm = gsap.matchMedia();
  mm.add(TRACK_MQ, () => {
    sec.classList.add('is-track');
    let travel = 0;
    let centers = [];
    const measure = () => {
      travel = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      sec.style.setProperty('--travel', `${travel}px`);
      centers = tiles.map((b) => { const li = b.parentElement; return li.offsetLeft + li.offsetWidth / 2; });
    };
    measure();
    ST.addEventListener('refreshInit', measure);
    const where = (p) => {
      const mid = p * travel + innerWidth * (0.3 + 0.6 * p);
      let best = 0;
      centers.forEach((c, i) => { if (Math.abs(c - mid) < Math.abs(centers[best] - mid)) best = i; });
      counter.set(best, p);
    };
    const move = gsap.to(track, {
      x: () => -travel, ease: 'none',
      scrollTrigger: {
        trigger: sec, start: 'top top', end: () => `+=${travel}`, scrub: true, invalidateOnRefresh: true,
        onUpdate: (self) => where(self.progress), onRefresh: (self) => where(self.progress),
      },
    });
    gsap.fromTo(ghost, { x: 0 }, {
      x: () => -travel * 0.32, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${travel}`, scrub: true, invalidateOnRefresh: true },
    });
    gsap.fromTo(ghost, { opacity: 0 }, {
      opacity: 1, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${Math.max(1, travel * 0.12)}`, scrub: true, invalidateOnRefresh: true },
    });
    for (const b of tiles) {
      const li = b.parentElement;
      const frame = b.querySelector('.frame');
      const pic = b.querySelector('picture');
      const ca = { trigger: li, containerAnimation: move, scrub: true };
      gsap.fromTo(pic, { xPercent: -5.2 }, { xPercent: 5.2, ease: 'none', scrollTrigger: { ...ca, start: 'left right', end: 'right left' } });
      gsap.fromTo(pic, { scale: 1.08 }, { scale: 1, ease: 'power1.out', scrollTrigger: { ...ca, start: 'left right', end: 'center center' } });
      gsap.fromTo(frame, { '--dim': 0.85 }, { '--dim': 0, ease: 'none', scrollTrigger: { ...ca, start: 'left 105%', end: 'left 45%' } });
    }
    const onFocus = (e) => {
      const b = e.target.closest('.photo');
      if (!b) return;
      const r = b.getBoundingClientRect();
      if (r.left >= 0 && r.right <= innerWidth) return;
      const i = tiles.indexOf(b);
      const top = sec.getBoundingClientRect().top + scrollY;
      const y = top + Math.min(travel, Math.max(0, centers[i] - innerWidth / 2));
      motion.scrollTo(y, { immediate: true });
    };
    sec.addEventListener('focusin', onFocus);
    return () => {
      ST.removeEventListener('refreshInit', measure);
      sec.removeEventListener('focusin', onFocus);
      sec.classList.remove('is-track');
      sec.style.removeProperty('--travel');
      for (const b of tiles) b.querySelector('.frame').style.removeProperty('--dim');
    };
  });
}
function initStrip(sec, tiles, counter) {
  const strip = sec.querySelector('.photo-grid');
  const mq = matchMedia(TRACK_MQ);
  const pics = tiles.map((b) => b.querySelector('picture'));
  let raf = 0;
  const paint = () => {
    raf = 0;
    if (mq.matches) return;
    const sr = strip.getBoundingClientRect();
    if (sr.bottom < 0 || sr.top > innerHeight) return;
    const mid = sr.left + sr.width / 2;
    let best = 0;
    let bestD = Infinity;
    tiles.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      const d = (r.left + r.width / 2 - mid) / sr.width; // -1..1 aprox.
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
      const k = Math.max(-1, Math.min(1, d));
      pics[i].style.transform = `translate3d(${(-k * 5.2).toFixed(2)}%,0,0)`;
    });
    const max = strip.scrollWidth - strip.clientWidth;
    counter.set(best, max > 0 ? strip.scrollLeft / max : 0);
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(paint); };
  strip.addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  new IntersectionObserver(([en]) => { if (en.isIntersecting) ask(); }).observe(strip);
  mq.addEventListener('change', () => {
    if (mq.matches) for (const p of pics) p.style.removeProperty('transform');
    else ask();
  });
  ask();
}
function initLightbox(dlg, tiles) {
  const img = dlg.querySelector('.lb-img');
  const [srcAvif, srcWebp] = dlg.querySelectorAll('source');
  const cap = dlg.querySelector('.lb-cap');
  const count = dlg.querySelector('.lb-count');
  const fig = dlg.querySelector('.lb-fig');
  let index = 0;
  let opener = null;
  const vtOK = () => !!document.startViewTransition && motion.on;
  function show(i) {
    index = (i + tiles.length) % tiles.length;
    const tile = tiles[index];
    const base = tile.dataset.src; // variante más grande (≤ 1600w)
    srcAvif.srcset = `${base}.avif`;
    srcWebp.srcset = `${base}.webp`;
    img.src = `${base}.jpg`;
    img.width = Number(tile.dataset.w);
    img.height = Number(tile.dataset.h);
    img.alt = tile.querySelector('img').alt;
    cap.textContent = tile.querySelector('.cap').textContent;
    count.textContent = `${index + 1} / ${tiles.length}`;
  }
  function step(dir) {
    show(index + dir);
    if (motion.on) window.gsap.fromTo(fig, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'expo.out', overwrite: true });
  }
  const media = (playing) => document.dispatchEvent(new CustomEvent('zz:media', { detail: { source: 'dialog', playing } }));
  const frameOf = (i) => tiles[i].querySelector('.frame');
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; };
  const ready = () => Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 420))]);
  async function open(i) {
    opener = tiles[i];
    show(i);
    const frame = frameOf(i);
    if (!vtOK() || !onScreen(frame)) { dlg.showModal(); media(true); return; }
    await ready();
    frame.style.viewTransitionName = 'lb-photo';
    const vt = document.startViewTransition(() => {
      frame.style.viewTransitionName = '';
      img.style.viewTransitionName = 'lb-photo';
      dlg.showModal();
    });
    media(true);
    vt.finished.finally(() => { img.style.viewTransitionName = ''; });
  }
  function close() {
    if (!dlg.open) return;
    const frame = frameOf(index);
    if (!vtOK() || opener !== tiles[index] || !onScreen(frame)) { dlg.close(); return; }
    img.style.viewTransitionName = 'lb-photo';
    const vt = document.startViewTransition(() => {
      img.style.viewTransitionName = '';
      frame.style.viewTransitionName = 'lb-photo';
      dlg.close();
    });
    vt.finished.finally(() => { frame.style.viewTransitionName = ''; });
  }
  tiles.forEach((tile, i) => tile.addEventListener('click', () => open(i)));
  dlg.querySelector('.lb-prev').addEventListener('click', () => step(-1));
  dlg.querySelector('.lb-next').addEventListener('click', () => step(1));
  dlg.querySelector('.lb-close').addEventListener('click', close);
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  let swiped = false;
  dlg.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    if (e.target === dlg || e.target.classList.contains('lb-inner')) close();
  });
  dlg.addEventListener('close', () => {
    media(false);
    opener?.focus({ preventScroll: true });
  });
  let sx = 0;
  let sy = 0;
  let pid = null;
  dlg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    pid = e.pointerId; sx = e.clientX; sy = e.clientY;
  });
  dlg.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; step(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 400); }
  });
  dlg.addEventListener('pointercancel', () => { pid = null; });
  document.addEventListener('zz:lang', () => { if (dlg.open) show(index); });
}
