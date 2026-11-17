import { motion } from './motion.js';
export function initScenes() {
  if (!motion.on) return;
  const gsap = window.gsap;
  initLive(gsap);
  initNoTempo(gsap);
  initBooking(gsap);
}
function initLive(gsap) {
  const strip = document.querySelector('.vivo .strip');
  const reels = [...document.querySelectorAll('.vivo .reel')];
  if (!strip || !reels.length) return;
  gsap.set(reels, { y: 80, rotationX: 18, opacity: 0, transformPerspective: 1100, transformOrigin: '50% 100%' });
  let rise = null;
  const enter = window.ScrollTrigger.create({
    trigger: strip, start: 'top 88%', once: true,
    onEnter: () => { rise = gsap.to(reels, { y: 0, rotationX: 0, opacity: 1, duration: 1.25, ease: 'expo.out', stagger: 0.11 }); },
  });
  strip.addEventListener('focusin', () => {
    if (rise) rise.progress(1);
    else { enter.kill(); gsap.set(reels, { y: 0, rotationX: 0, opacity: 1 }); }
  });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const speeds = [-12, 9, -5, 14];
    reels.forEach((r, i) => {
      const s = speeds[i % speeds.length];
      gsap.fromTo(r, { yPercent: s }, { yPercent: -s, ease: 'none', scrollTrigger: { trigger: strip, start: 'top bottom', end: 'bottom top', scrub: 0.4 } });
    });
  });
  const film = document.querySelector('.film-media');
  const pic = film?.querySelector('picture');
  if (pic) {
    motion.triReveal(pic, { trigger: film, start: 'top 88%', end: 'top 28%', edge: film, size: 0.5 });
    const img = pic.querySelector('img');
    gsap.fromTo(img, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: film, start: 'top bottom', end: 'bottom 40%', scrub: 0.5 } });
  }
}
function initNoTempo(gsap) {
  const names = document.querySelector('.notempo .names');
  if (!names) return;
  const items = [...names.children];
  for (const el of items) {
    const m = document.createElement('span');
    m.className = 'nm-mask';
    el.before(m);
    m.append(el);
  }
  const parts = items.filter((el) => el.getAttribute('aria-hidden') !== 'true');
  const dots = items.filter((el) => el.getAttribute('aria-hidden') === 'true');
  gsap.set(parts, { yPercent: 115 });
  gsap.set(dots, { opacity: 0 });
  window.ScrollTrigger.create({
    trigger: names, start: 'top 85%', once: true,
    onEnter: () => {
      gsap.to(parts, { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.32, delay: 0.25 });
      gsap.to(dots, { opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.32, delay: 0.5 });
    },
  });
  const mq = document.querySelector('.notempo .mq-c');
  if (mq) gsap.fromTo(mq, { yPercent: 40 }, { yPercent: -40, ease: 'none', scrollTrigger: { trigger: mq, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
}
function initBooking(gsap) {
  const sec = document.getElementById('contratar');
  if (!sec) return;
  const mail = sec.querySelector('.mail');
  if (mail) motion.decode(mail, { duration: 600, pool: 'abcdefghijklmnopqrstuvwxyz0123456789' });
  const photo = sec.querySelector('.bk-photo');
  if (photo) gsap.fromTo(photo, { yPercent: 10 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  for (const btn of sec.querySelectorAll('.btn-primary')) magnet(gsap, btn);
}
function magnet(gsap, btn, max = 8, reach = 40) {
  const qx = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3.out' });
  const qy = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3.out' });
  let on = false;
  const move = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2 - gsap.getProperty(btn, 'x');
    const cy = r.top + r.height / 2 - gsap.getProperty(btn, 'y');
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const inside = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach;
    if (inside) {
      on = true;
      qx(Math.max(-max, Math.min(max, dx * 0.18)));
      qy(Math.max(-max, Math.min(max, dy * 0.3)));
    } else if (on) {
      on = false;
      qx(0);
      qy(0);
    }
  };
  let listening = false;
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !listening) { addEventListener('pointermove', move, { passive: true }); listening = true; }
    else if (!en.isIntersecting && listening) { removeEventListener('pointermove', move); listening = false; }
  }).observe(btn);
}
