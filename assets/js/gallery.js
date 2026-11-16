// gallery.js — lightbox con <dialog>: foto completa sin gradar, flechas, Esc, clic afuera y foco de vuelta.

export function initGallery({ t }) {
  const tiles = [...document.querySelectorAll('.photo')];
  const dlg = document.querySelector('.lightbox');
  if (!dlg || !tiles.length) return;
  const img = dlg.querySelector('.lb-img');
  const [srcAvif, srcWebp] = dlg.querySelectorAll('source');
  const cap = dlg.querySelector('.lb-cap');
  const count = dlg.querySelector('.lb-count');
  let index = 0;
  let opener = null;

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

  const media = (playing) => document.dispatchEvent(new CustomEvent('zz:media', { detail: { source: 'dialog', playing } }));

  tiles.forEach((tile, i) => tile.addEventListener('click', () => {
    opener = tile;
    show(i);
    dlg.showModal();
    media(true);
  }));
  dlg.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  dlg.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  // clic en el fondo (fuera de la foto y los botones) cierra
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.classList.contains('lb-inner')) dlg.close();
  });
  dlg.addEventListener('close', () => {
    media(false);
    opener?.focus();
  });
  // si cambia el idioma con el lightbox abierto, actualizar la leyenda
  document.addEventListener('zz:lang', () => { if (dlg.open) show(index); });
}
