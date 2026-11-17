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
    if (r.video.preload !== 'auto') r.video.preload = 'auto';
  }
  function play(r) {
    load(r);
    const pr = r.video.play();
    if (pr) pr.catch(() => label(r));
  }
  let hovered = null;
  function decide() {
    let best = hovered && auto && !blocked() && !hovered.userPaused && hovered.ratio > 0 ? hovered : null;
    best ??= reels.find((r) => r.ratio > 0 && r.userPlayed && !r.userPaused) || null;
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
      if (!en.isIntersecting) { r.userPlayed = false; if (hovered === r) hovered = null; }
    }
    decide();
  }, { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] });
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
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    for (const r of reels) {
      const frame = r.el.querySelector('.reel-frame');
      frame.addEventListener('pointerenter', () => {
        for (const o of reels) o.userPlayed = false;
        hovered = r;
        decide();
      });
    }
  }
  const strip = document.querySelector('.strip');
  const num = document.querySelector('.sc-n');
  const cio = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) num.textContent = String(reels.find((x) => x.el === en.target).i + 1);
    }
  }, { root: strip, threshold: 0.6 });
  for (const r of reels) cio.observe(r.el);
  const lv = document.querySelector('.loop-video');
  const lbtn = document.querySelector('.loop-toggle');
  let lseen = false;
  let lpaused = !auto;
  const llabel = () => {
    lbtn.dataset.i18n = lv.paused ? 'loop.play' : 'loop.pause';
    lbtn.textContent = t(lbtn.dataset.i18n);
  };
  const lplay = () => {
    if (lv.preload !== 'auto') lv.preload = 'auto';
    lv.play()?.catch(llabel);
  };
  const loopCheck = () => {
    if (!lv || !lbtn) return;
    if (lseen && !lpaused && !blocked()) lplay();
    else if (!lv.paused) lv.pause();
  };
  if (lv && lbtn) {
    let lt = 0;
    new IntersectionObserver(([en]) => {
      lseen = en.isIntersecting;
      clearTimeout(lt);
      lt = setTimeout(loopCheck, lseen ? 350 : 1500);
    }, { threshold: 0.25 }).observe(lv);
    lv.addEventListener('play', llabel);
    lv.addEventListener('pause', llabel);
    lbtn.addEventListener('click', () => {
      lpaused = !lv.paused;
      if (lpaused) lv.pause(); else lplay();
    });
    llabel();
  }
  document.addEventListener('zz:media', (e) => {
    const { source, playing } = e.detail;
    if (!(source in block)) return;
    block[source] = playing;
    loopCheck();
    if (playing) for (const r of reels) { if (!r.video.paused) r.video.pause(); r.userPlayed = false; }
    decide();
  });
}
