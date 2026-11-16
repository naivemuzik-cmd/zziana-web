// clips.js — reels: sólo suena (en silencio) el más visible, pausa respetada, carga cerca de la vista,
// contador de la tira en móvil y el film del presskit (con sonido, sólo con clic).

export function initClips({ t, reduced }) {
  const reels = [...document.querySelectorAll('.reel')].map((el, i) => ({
    el, i, video: el.querySelector('video'), btn: el.querySelector('.reel-toggle'),
    ratio: 0, userPaused: false, userPlayed: false,
  }));
  const saveData = !!navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;
  const auto = !reduced && !saveData;
  const block = { set: false, film: false, dialog: false };
  const blocked = () => block.set || block.film || block.dialog;

  const label = (r) => {
    const playing = !r.video.paused; // el texto dice la acción; sin aria-pressed (ver hero.js)
    r.btn.dataset.i18n = playing ? 'clip.pause' : 'clip.play';
    r.btn.textContent = t(r.btn.dataset.i18n);
  };

  function load(r) {
    // cambiar preload a "auto" ya dispara la descarga (llamar a load() la cortaría y la reiniciaría)
    if (r.video.preload !== 'auto') r.video.preload = 'auto';
  }
  function play(r) {
    load(r);
    const pr = r.video.play();
    if (pr) pr.catch(() => label(r));
  }

  // decide quién reproduce: un solo reel. Si el usuario dio play a uno visible, ése (aunque haya un set abierto);
  // si no, el más visible (≥ 60 %), salvo pausa del usuario o bloqueo
  function decide() {
    let best = reels.find((r) => r.ratio > 0 && r.userPlayed && !r.userPaused) || null;
    if (!best && auto && !blocked()) {
      for (const r of reels) {
        if (r.ratio >= 0.6 && !r.userPaused && (!best || r.ratio > best.ratio)) best = r;
      }
    }
    for (const r of reels) {
      if (r === best) { if (r.video.paused) play(r); }
      else if (!r.video.paused) r.video.pause();
    }
  }

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const r = reels.find((x) => x.el === en.target);
      r.ratio = en.isIntersecting ? en.intersectionRatio : 0;
      if (!en.isIntersecting) r.userPlayed = false;
    }
    decide();
  }, { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] });

  // compuerta de carga: preload="auto" sólo a 200 px de la vista
  const gate = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      gate.unobserve(en.target);
      if (auto) load(reels.find((x) => x.el === en.target));
    }
  }, { rootMargin: '200px' });

  for (const r of reels) {
    io.observe(r.el);
    gate.observe(r.el);
    r.video.addEventListener('play', () => label(r));
    r.video.addEventListener('pause', () => label(r));
    r.btn.addEventListener('click', () => {
      if (r.video.paused) {
        for (const o of reels) if (o !== r) o.userPlayed = false;
        r.userPaused = false; r.userPlayed = true;
        decide();
      } else {
        r.userPaused = true; r.userPlayed = false;
        r.video.pause();
      }
    });
    label(r);
  }

  /* ---------- contador de la tira (móvil) ---------- */
  const strip = document.querySelector('.strip');
  const num = document.querySelector('.sc-n');
  const cio = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) num.textContent = String(reels.find((x) => x.el === en.target).i + 1);
    }
  }, { root: strip, threshold: 0.6 });
  for (const r of reels) cio.observe(r.el);

  /* ---------- film del presskit ---------- */
  const filmBtn = document.querySelector('.film-play');
  const slot = document.querySelector('.film-media');
  const tpl = document.querySelector('.film-tpl');
  let film = null;
  // el bloqueo del film se marca antes de avisar: al cerrar los sets (evento anidado) ningún reel arranca de rebote
  const filmMedia = (playing) => {
    if (playing) block.film = true;
    document.dispatchEvent(new CustomEvent('zz:media', { detail: { source: 'film', playing } }));
  };
  filmBtn.addEventListener('click', () => {
    if (!film) {
      film = tpl.content.firstElementChild.cloneNode(true);
      slot.replaceChildren(film);
      film.addEventListener('play', () => filmMedia(true));
      film.addEventListener('pause', () => filmMedia(false));
      film.addEventListener('ended', () => filmMedia(false));
    }
    filmMedia(true);
    film.play().catch(() => { /* con controles nativos, el usuario puede darle play */ });
    film.focus();
  });

  /* ---------- bloqueos: sets, film y diálogos pausan los reels ---------- */
  document.addEventListener('zz:media', (e) => {
    const { source, playing } = e.detail;
    if (!(source in block)) return;
    block[source] = playing;
    if (source === 'set' && playing && film && !film.paused) film.pause();
    if (playing) for (const r of reels) { if (!r.video.paused) r.video.pause(); r.userPlayed = false; }
    decide();
  });
}
