// sets.js — fachadas livianas de YouTube, un reproductor a la vez, etiquetas del tracklist y región en vivo.

export function initSets({ t, reduced }) {
  const sets = [...document.querySelectorAll('.set')];
  const live = document.getElementById('sets-live');
  let preconnected = false;

  // conexión anticipada a YouTube sólo cuando alguien se acerca a un set
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

  // vuelve a la fachada; con focus=true devuelve el foco al botón de play
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
    // doble clic rápido: el reproductor recién entra en el próximo cuadro, así que el estado va en el elemento
    if (set.dataset.state) return;
    set.dataset.state = 'opening';
    const key = set.dataset.key;
    const id = set.dataset.yt;
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
    // en el link de propuesta (claude.ai no deja embeber YouTube, ver tools/build_artifact.py)
    // .play y .listen son enlaces a YouTube: se dejan funcionar solos, sin reproductor embebido
    const play = set.querySelector('.play');
    const listen = set.querySelector('.listen');
    if (play.tagName === 'BUTTON') {
      set.addEventListener('pointerenter', preconnect, { once: true });
      set.addEventListener('focusin', preconnect, { once: true });
      play.addEventListener('click', () => open(set));
    }
    if (listen.tagName === 'BUTTON') {
      listen.addEventListener('click', () => {
        // mientras se abre (un cuadro) se ignora el segundo clic
        if (set.dataset.state === 'open') close(set, true); else if (!set.dataset.state) open(set);
      });
    }

    // tracklist: etiqueta según estado (acordeón exclusivo por <details name>)
    const det = set.querySelector('.tracklist');
    const label = det.querySelector('.tl-label');
    const closedKey = label.dataset.i18n;
    det.addEventListener('toggle', () => {
      label.dataset.i18n = det.open ? 'tl.hide' : closedKey;
      label.textContent = t(label.dataset.i18n);
    });
  }

  // el film del presskit (con sonido) cierra cualquier set abierto
  document.addEventListener('zz:media', (e) => {
    if (e.detail.source === 'film' && e.detail.playing) for (const s of sets) close(s);
  });
  // títulos de iframes abiertos al cambiar idioma
  document.addEventListener('zz:lang', () => {
    for (const s of sets) {
      const f = s.querySelector('.player iframe');
      if (f) f.title = t(`${s.dataset.key}.iframe`);
    }
  });
}
