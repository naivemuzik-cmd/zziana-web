import { motion } from './motion.js';
export function initSets({ t, reduced }) {
  const sets = [...document.querySelectorAll('.set')];
  const live = document.getElementById('sets-live');
  let preconnected = false;
  for (const s of sets) {
    const m = document.createElement('i');
    m.className = 'flow-mark';
    m.setAttribute('aria-hidden', 'true');
    s.before(m);
  }
  function preconnect() {
    if (preconnected) return;
    preconnected = true;
    for (const href of ['https://www.youtube-nocookie.com', 'https://i.ytimg.com']) {
      const l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = href;
      document.head.append(l);
    }
  }
  const announce = (msg) => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = msg; }); };
  const media = (playing) => document.dispatchEvent(new CustomEvent('zz:media', { detail: { source: 'set', playing } }));
  function setLabels(set, playing) {
    const btn = set.querySelector('.listen');
    btn.dataset.i18n = playing ? 'set.close' : 'set.listen';
    btn.textContent = t(btn.dataset.i18n);
    set.querySelector('.now').hidden = !playing;
  }
  function close(set, focus = false, notify = true) {
    const players = set.querySelectorAll('.player');
    if (!players.length && !set.dataset.state) return;
    players.forEach((p) => p.remove());
    delete set.dataset.state;
    set.querySelector('.facade').hidden = false;
    setLabels(set, false);
    if (focus) set.querySelector('.play').focus();
    if (notify && !sets.some((s) => s.dataset.state)) media(false);
  }
  function open(set) {
    if (set.dataset.state) return;
    set.dataset.state = 'opening';
    stopPrev(set);
    const key = set.dataset.key;
    const id = set.dataset.yt;
    for (const m of msets) closeM(m);
    const facade = set.querySelector('.facade');
    const tri = set.querySelector('.tri');
    const player = document.createElement('div');
    player.className = 'player';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    iframe.title = t(`${key}.iframe`);
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.loading = 'eager';
    player.append(iframe);
    const swap = () => {
      for (const s of sets) if (s !== set) close(s, false, false);
      tri.style.viewTransitionName = '';
      facade.hidden = true;
      facade.after(player);
      set.dataset.state = 'open';
      player.style.viewTransitionName = 'set-aperture';
      setLabels(set, true);
    };
    media(true);
    if (document.startViewTransition && !reduced) {
      tri.style.viewTransitionName = 'set-aperture';
      const vt = document.startViewTransition(swap);
      vt.finished.finally(() => { player.style.viewTransitionName = ''; iframe.focus(); });
    } else {
      swap();
      player.style.viewTransitionName = '';
      iframe.focus();
    }
    announce(t('set.nowplaying') + t(`${key}.title`));
  }
  for (const set of sets) {
    const play = set.querySelector('.play');
    const listen = set.querySelector('.listen');
    if (play.tagName === 'BUTTON') {
      set.addEventListener('pointerenter', preconnect, { once: true });
      set.addEventListener('focusin', preconnect, { once: true });
      play.addEventListener('click', () => open(set));
    }
    if (listen.tagName === 'BUTTON') {
      listen.addEventListener('click', () => {
        if (set.dataset.state === 'open') close(set, true); else if (!set.dataset.state) open(set);
      });
    }
    const det = set.querySelector('.tracklist');
    const label = det.querySelector('.tl-label');
    const closedKey = label.dataset.i18n;
    const panel = det.querySelector('.tl-panel');
    det.addEventListener('toggle', () => {
      label.dataset.i18n = det.open ? 'tl.hide' : closedKey;
      label.textContent = t(label.dataset.i18n);
      if (det.open) { stopPrev(set); isolate(panel); }
    });
    new ResizeObserver(() => { if (det.open) isolate(panel); }).observe(panel);
  }
  const msets = [...document.querySelectorAll('.mset')];
  function closeM(m) {
    const p = m.querySelector('.player');
    if (!p) return;
    p.remove();
    m.querySelector('.facade').hidden = false;
    delete m.dataset.state;
  }
  for (const m of msets) {
    const play = m.querySelector('.play');
    if (play.tagName !== 'BUTTON') continue; // link de propuesta: es un enlace a YouTube
    m.addEventListener('pointerenter', preconnect, { once: true });
    m.addEventListener('focusin', preconnect, { once: true });
    play.addEventListener('click', () => {
      if (m.dataset.state) return;
      for (const s of sets) close(s, false, false);
      for (const o of msets) if (o !== m) closeM(o);
      const player = document.createElement('div');
      player.className = 'player';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${m.dataset.yt}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = t(`${m.dataset.key}.iframe`);
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.append(iframe);
      const facade = m.querySelector('.facade');
      facade.hidden = true;
      facade.after(player);
      m.dataset.state = 'open';
      media(true);
      iframe.focus();
      announce(t('set.nowplaying') + t(`${m.dataset.key}.title`));
    });
  }
  function isolate(panel) {
    panel.toggleAttribute('data-lenis-prevent', panel.scrollHeight > panel.clientHeight + 1);
  }
  const saveData = !!navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;
  const allowPrev = motion.on && !saveData;
  const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const block = { set: false, film: false, dialog: false };
  let cur = null;
  function video(set) {
    if (!set._prev) {
      const tpl = set.querySelector('.prev-tpl');
      if (!tpl) return null; // set D: no hay video de esa noche
      const v = tpl.content.firstElementChild.cloneNode(true);
      v.addEventListener('playing', () => { if (cur === set) set.classList.add('prev-on'); });
      tpl.after(v);
      set._prev = v;
    }
    return set._prev;
  }
  function preload(set) { const v = allowPrev && video(set); if (v) v.preload = 'auto'; }
  function startPrev(set) {
    if (!allowPrev || block.set || block.film || block.dialog || set.dataset.state) return;
    if (set.querySelector('.tracklist').open || !set.querySelector('.prev-tpl')) return;
    if (cur && cur !== set) stopPrev(cur);
    cur = set;
    const v = video(set);
    v.preload = 'auto';
    v.play()?.catch(() => { /* sin reproducción automática: queda el póster */ });
  }
  function stopPrev(set) {
    set.classList.remove('prev-on');
    if (set._prev && !set._prev.paused) set._prev.pause();
    if (cur === set) cur = null;
  }
  if (allowPrev) {
    if (hover) {
      for (const set of sets) {
        const slot = set.querySelector('.media-slot');
        slot.addEventListener('pointerenter', () => startPrev(set));
        slot.addEventListener('pointerleave', () => { if (!set.querySelector('.play:focus-visible')) stopPrev(set); });
        const play = set.querySelector('.play');
        play.addEventListener('focus', () => startPrev(set));
        play.addEventListener('blur', () => { if (!slot.matches(':hover')) stopPrev(set); });
      }
    } else {
      const ratio = new Map();
      const io = new IntersectionObserver((entries) => {
        for (const en of entries) ratio.set(en.target.closest('.set'), en.isIntersecting ? en.intersectionRatio : 0);
        let best = null;
        for (const [s, r] of ratio) if (r >= 0.6 && (!best || r > ratio.get(best))) best = s;
        for (const s of sets) if (s !== best && s === cur) stopPrev(s);
        if (best) startPrev(best);
      }, { threshold: [0, 0.3, 0.6, 0.8, 1] });
      for (const s of sets) io.observe(s.querySelector('.media-slot'));
    }
  }
  document.addEventListener('zz:media', (e) => {
    const { source, playing } = e.detail;
    if (source === 'film' && playing) for (const s of sets) close(s);
    if (source in block) block[source] = playing;
    if (playing && cur) stopPrev(cur);
  });
  document.addEventListener('zz:lang', () => {
    for (const s of [...sets, ...msets]) {
      const f = s.querySelector('.player iframe');
      if (f) f.title = t(`${s.dataset.key}.iframe`);
    }
  });
  if (!motion.on) return;
  initStage(sets, preload);
}
function initStage(sets, preload) {
  const gsap = window.gsap;
  const stackMQ = matchMedia('(min-width: 900px)');
  const ro = new ResizeObserver(() => { for (const s of sets) s.style.setProperty('--h', `${s.offsetHeight}px`); });
  for (const s of sets) ro.observe(s);
  const activate = (s, i) => {
    if (s.dataset.on) return;
    s.dataset.on = '1';
    s.classList.add('drawing');
    setTimeout(() => { s.classList.remove('drawing'); s.classList.add('drawn'); }, 1000);
    preload(s);
  };
  sets.forEach((s) => {
    const mark = s.previousElementSibling;
    const slot = s.querySelector('.media-slot');
    const pin = window.ScrollTrigger.create({ trigger: mark, start: 'top 2px' });
    motion.skew(slot, { max: 2.5, when: () => !stackMQ.matches || motion.y() < pin.start });
  });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    sets.forEach((s, i) => {
      const mark = s.previousElementSibling;
      motion.triReveal(s.querySelector('.ap'), { trigger: mark, start: 'top 80%', end: 'top 10%', edge: s.querySelector('.facade'), size: 0.5 });
      window.ScrollTrigger.create({ trigger: mark, start: 'top 45%', once: true, onEnter: () => activate(s, i) });
      if (!i) return;
      const prev = sets[i - 1];
      gsap.timeline({ scrollTrigger: { trigger: mark, start: 'top bottom', end: 'top top', scrub: true } })
        .fromTo(prev.querySelector('.set-in'), { scale: 1, yPercent: 0 }, { scale: 0.92, yPercent: -16, ease: 'none' }, 0)
        .fromTo(prev, { '--shade': 0 }, { '--shade': 0.6, ease: 'none' }, 0);
    });
  });
  mm.add('(max-width: 899px)', () => {
    sets.forEach((s, i) => {
      const slot = s.querySelector('.media-slot');
      motion.triReveal(s.querySelector('.ap'), { trigger: slot, start: 'top 95%', end: 'top 35%', edge: s.querySelector('.facade'), size: 0.5 });
      window.ScrollTrigger.create({ trigger: slot, start: 'top 70%', once: true, onEnter: () => activate(s, i) });
    });
  });
  sets.forEach((s, i) => {
    s.addEventListener('focusin', (e) => {
      const next = sets[i + 1];
      if (!stackMQ.matches || !next) return;
      if (next.getBoundingClientRect().top < e.target.getBoundingClientRect().bottom + 8) motion.scrollTo(s, { immediate: true });
    });
  });
}
