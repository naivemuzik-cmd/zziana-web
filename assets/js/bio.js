import { motion } from './motion.js';
export function initBio({ t }) {
  const sec = document.getElementById('bio');
  if (!sec) return;
  initMore(sec, t);
  if (!motion.on) return;
  const gsap = window.gsap;
  const scene = sec.querySelector('.bio-scene');
  const fig = sec.querySelector('.bio-portrait');
  const frame = sec.querySelector('.bp-frame');
  const img = sec.querySelector('.bp-img');
  const live = sec.querySelector('.bio-live');
  const lframe = sec.querySelector('.bl-frame');
  const lead = sec.querySelector('.lead');
  motion.marquee(sec.querySelector('.mq-b'), { dir: 1, rate: 3.2 });
  motion.skew(lframe, { max: 3 });
  motion.skew(fig, { max: 2, when: () => innerWidth < 900 });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    motion.triReveal(frame, { trigger: scene, start: 'top 92%', end: 'top 0%', edge: fig, size: 0.5, scrub: 0.6 });
    gsap.fromTo(img, { scale: 1.26 }, { scale: 1.1, ease: 'none', scrollTrigger: { trigger: scene, start: 'top 90%', end: 'bottom bottom', scrub: 0.6 } });
    gsap.fromTo(live, { yPercent: 60 }, { yPercent: -48, ease: 'none', scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom bottom', scrub: 0.4 } });
    gsap.fromTo(lframe, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out',
      scrollTrigger: { trigger: scene, start: 'top 20%', end: 'top -55%', scrub: 0.6 },
    });
  });
  mm.add('(max-width: 899px)', () => {
    motion.triReveal(frame, { trigger: frame, start: 'top 92%', end: 'top 25%', edge: fig, size: 0.55 });
    gsap.fromTo(img, { scale: 1.24 }, { scale: 1.08, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo(live, { yPercent: 30 }, { yPercent: -20, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  let leadMM = null;
  const buildLead = () => {
    leadMM = gsap.matchMedia();
    const dim = 'rgb(156 163 181 / .25)'; // --ceniza al 25 %
    const luz = 'rgb(237 240 247)';
    leadMM.add('(min-width: 900px)', (ctx) => {
      motion.split()?.then((S) => ctx.add(() => {
        const split = S.create(lead, { type: 'words', tag: 'span', wordsClass: 'lw', aria: 'none', overwrite: false });
        gsap.fromTo(split.words, { color: dim }, {
          color: luz, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: scene, start: 'top 80%', end: 'bottom bottom', scrub: 0.5 },
        });
        window.ScrollTrigger.refresh();
      }), () => {});
    });
    leadMM.add('(max-width: 899px)', (ctx) => {
      motion.split()?.then((S) => ctx.add(() => {
        const split = S.create(lead, { type: 'lines', linesClass: 'lw', aria: 'none', overwrite: false });
        gsap.fromTo(split.lines, { color: dim }, {
          color: luz, ease: 'none', stagger: 0.35,
          scrollTrigger: { trigger: lead, start: 'top 85%', end: 'bottom 50%', scrub: 0.5 },
        });
      }), () => {});
    });
  };
  buildLead();
  document.addEventListener('zz:lang', () => {
    leadMM.revert();
    lead.textContent = t(lead.dataset.i18n);
    buildLead();
  });
}
function initMore(sec, t) {
  const more = sec.querySelector('.bio-more');
  const rest = sec.querySelector('.bio-rest');
  if (!more || !rest) return;
  more.addEventListener('click', () => {
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', String(open));
    rest.classList.toggle('open', open);
    more.dataset.i18n = open ? 'bio.less' : 'bio.more';
    more.textContent = t(more.dataset.i18n);
    if (!open) more.scrollIntoView({ block: 'nearest' });
    window.ScrollTrigger?.refresh();
  });
}
