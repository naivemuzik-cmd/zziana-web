import { initMotion, motion } from './motion.js';
import { initHero } from './hero.js';
import { initSets } from './sets.js';
import { initBio } from './bio.js';
import { initGallery } from './gallery.js';
import { initClips } from './clips.js';
import { initScenes } from './scenes.js';
import { initHaze } from './haze.js';
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasMotion = html.classList.contains('js-motion');
const EN = JSON.parse(document.getElementById('i18n-en').textContent);
const ES = JSON.parse(document.getElementById('i18n-es').textContent);
const metaDesc = document.querySelector('meta[name="description"]');
const BASE = html.lang.startsWith('es') ? ES : EN;
for (const el of document.querySelectorAll('[data-i18n]')) {
  const key = el.dataset.i18n;
  if (!(key in BASE)) BASE[key] = el.textContent;
}
for (const el of document.querySelectorAll('[data-i18n-attr]')) {
  for (const [attr, key] of pairs(el)) if (!(key in BASE)) BASE[key] = el.getAttribute(attr) ?? '';
}
document.fonts?.load('800 1em Doto').then((f) => { if (!f.length) html.classList.add('dot-off'); }, () => html.classList.add('dot-off'));
BASE['meta.title'] ??= document.title;
BASE['meta.desc'] ??= metaDesc?.content ?? ''; // dentro de un visor ajeno (link de propuesta) puede no haber <meta>
let lang = BASE === ES ? 'es' : 'en';
export const t = (key) => (lang === 'en' ? EN[key] : ES[key]) ?? BASE[key] ?? key;
export const getLang = () => lang;
function pairs(el) {
  return el.dataset.i18nAttr.split(';').filter(Boolean).map((p) => p.split(':').map((s) => s.trim()));
}
function applyLang(next, save = true) {
  lang = next === 'en' ? 'en' : 'es';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-attr]')) {
    for (const [attr, key] of pairs(el)) el.setAttribute(attr, t(key));
  }
  html.lang = lang === 'en' ? 'en' : 'es-AR';
  document.title = t('meta.title');
  if (metaDesc) metaDesc.content = t('meta.desc');
  for (const b of document.querySelectorAll('.lang-btn')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  deltaA();
  if (save) { try { localStorage.setItem('zz-lang', lang); } catch { /* sin almacenamiento */ } }
  document.dispatchEvent(new CustomEvent('zz:lang', { detail: { lang } }));
}
function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'es') return q;
  try {
    const s = localStorage.getItem('zz-lang');
    if (s === 'en' || s === 'es') return s;
  } catch { /* sin almacenamiento */ }
  return 'en'; // por defecto inglés, en cualquier navegador: el botón ES·EN cambia y se recuerda
}
function deltaA() {
  for (const h of document.querySelectorAll('h2.title')) {
    const text = h.dataset.i18n ? t(h.dataset.i18n) : h.textContent;
    const len = text.replace(/\s/g, '').length + 0.4 * (text.match(/\s/g) || []).length;
    h.style.setProperty('--len', len.toFixed(1));
    h.toggleAttribute('data-long', len >= 11);
    if (!/[aA]/.test(text)) { h.removeAttribute('aria-label'); continue; }
    h.setAttribute('aria-label', text);
    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach((word) => {
      if (!/[aA]/.test(word)) { if (word) frag.append(word); return; }
      const w = document.createElement('span');
      w.className = 'nw';
      let buf = '';
      for (const ch of word) {
        if (ch === 'A' || ch === 'a') {
          if (buf) { w.append(buf); buf = ''; }
          const span = document.createElement('span');
          span.className = 'delta';
          span.innerHTML = `<span class="vh">${ch}</span><svg aria-hidden="true" focusable="false" viewBox="381.6 6.6 207.9 180.2"><use href="#glyph-a-title"/></svg>`;
          w.append(span);
        } else buf += ch;
      }
      if (buf) w.append(buf);
      frag.append(w);
    });
    h.replaceChildren(frag);
  }
}
function scrollToEl(el, focusEl = el) {
  if (motion.on) { motion.scrollTo(el, { focus: focusEl }); return; }
  const behavior = reduced ? 'instant' : 'smooth';
  if (el.id === 'top') window.scrollTo({ top: 0, behavior });
  else el.scrollIntoView({ behavior, block: 'start' });
  if (focusEl) focusEl.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const id = a.getAttribute('href').slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  e.preventDefault();
  const menu = document.getElementById('menu');
  if (menu.matches(':popover-open')) menu.hidePopover();
  if (a.classList.contains('watch-c')) {
    scrollToEl(target, target.querySelector('.facade:not([hidden]) .play') || target.querySelector('.listen'));
  } else if (id === 'top') {
    scrollToEl(target, null);
    document.querySelector('.home').focus({ preventScroll: true });
  } else {
    scrollToEl(target);
  }
  history.replaceState(null, '', id === 'top' ? location.pathname + location.search : '#' + id);
});
function initHeader() {
  const header = document.querySelector('.site-header');
  const sentinel = document.querySelector('.hero-sentinel');
  new IntersectionObserver(([en]) => {
    const past = !en.isIntersecting && en.boundingClientRect.top < 0;
    header.toggleAttribute('data-solid', past);
  }).observe(sentinel);
  const links = [...document.querySelectorAll('.nav a, .menu a')];
  const ids = ['sets', 'bio', 'fotos', 'en-vivo', 'no-tempo', 'contratar'];
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      for (const a of links) {
        if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  for (const id of ids) { const s = document.getElementById(id); if (s) io.observe(s); }
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) for (const a of links) a.removeAttribute('aria-current');
  }, { rootMargin: '-45% 0px -50% 0px' }).observe(document.querySelector('.hero .stage'));
}
function initCopy() {
  const btn = document.querySelector('.copy-mail');
  const mail = document.querySelector('.mail');
  const toast = document.querySelector('.toast');
  let timer;
  btn.addEventListener('click', async () => {
    const addr = mail.textContent.trim();
    let ok = false;
    try { await navigator.clipboard.writeText(addr); ok = true; } catch { /* sin portapapeles */ }
    if (!ok) {
      const r = document.createRange(); r.selectNodeContents(mail);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try { ok = document.execCommand('copy'); } catch { ok = false; }
    }
    if (!ok) { mail.focus(); return; } // queda seleccionado: se copia con Ctrl+C
    toast.textContent = t('bk.copied');
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => { toast.classList.remove('show'); toast.textContent = ''; }, 2400);
  });
}
function initFallbacks() {
  if (!hasMotion) return;
  if (!CSS.supports('animation-timeline: view()')) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add(en.target.classList.contains('veil') ? 'lit' : 'in');
        io.unobserve(en.target);
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    for (const el of document.querySelectorAll('.reveal, .veil')) io.observe(el);
  }
  const draw = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      draw.unobserve(el);
      el.classList.add('drawing');
      const ms = el.classList.contains('rider') ? 800 : 600;
      setTimeout(() => { el.classList.remove('drawing'); el.classList.add('drawn'); }, ms + 80);
    }
  }, { threshold: 0.35 });
  for (const el of document.querySelectorAll('.rider')) draw.observe(el);
}
function boot() {
  for (const b of document.querySelectorAll('.lang-btn')) b.addEventListener('click', () => applyLang(b.dataset.lang));
  const first = initialLang();
  if (first !== lang) applyLang(first, false);
  else deltaA();
  const ctx = { t, reduced, motion: hasMotion, getLang };
  initMotion(ctx);
  initHeader();
  initHero(ctx);
  initSets(ctx);
  initBio(ctx);
  initGallery(ctx);
  initClips(ctx);
  initScenes();
  initCopy();
  initFallbacks();
  initHaze(ctx);
  initReveals();
}
function initReveals() {
  if (!motion.on) return;
  for (const h of document.querySelectorAll('h2.title')) motion.revealTitle(h);
  for (const h of document.querySelectorAll('.set-title')) motion.revealLines(h);
  const mono = '.eyebrow > span[data-i18n]:not(.now), .sec-head .tag, .set-meta, .facts dt, .cap, .reel-cap';
  for (const el of document.querySelectorAll(mono)) motion.decode(el);
  motion.marquee(document.querySelector('.mq-a'), { dir: -1 });
  motion.marquee(document.querySelector('.mq-c'), { dir: -1 });
}
boot();
