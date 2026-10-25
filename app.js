// Catalogo privato generato da generate_catalog.py: le immagini restano sull'SSD.
const images = Array.isArray(window.POSTERZ_IMAGES) ? window.POSTERZ_IMAGES : [];
const productTypes = { poster: 'Poster', originale: 'Immagine originale', tshirt: 'T-shirt 3D' };
const grid = document.getElementById('product-grid');
const searchInput = document.getElementById('catalog-search');
const filmFilter = document.getElementById('film-filter');
const categoryTabs = document.getElementById('category-tabs');
const resultsCount = document.getElementById('results-count');
const clearFilters = document.getElementById('clear-filters');
const favoritesToggle = document.getElementById('favorites-toggle');
const favoritesCount = document.getElementById('favorites-count');
const dialog = document.getElementById('product-dialog');
const dialogContent = document.getElementById('dialog-content');
const storageKey = 'posterz-personal-favorites';
let favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) favorites = new Set(saved.filter(id => images.some(p => p.id === id)));
} catch { /* Il sito funziona anche se il browser blocca l'archiviazione locale. */ }
let category = 'tutti';
let onlyFavorites = false;
let selectedImage = null;
let selectedType = 'poster';
let folderSelection = [];
let selectedFilm = 'tutti';
const catalog = window.PosterCatalog;
let tshirtViewer = null;
let viewerGeneration = 0;

function disposeTshirtViewer() {
  ++viewerGeneration;
  tshirtViewer?.dispose();
  tshirtViewer = null;
}

function tshirtMarkup() {
  return `<div class="tshirt-viewer" data-state="loading"><div class="tshirt-stage" data-viewer-stage></div><p class="tshirt-status" data-viewer-status role="status" aria-live="polite">Caricamento del modello 3D…</p><fieldset class="tshirt-controls" data-viewer-controls disabled><legend>Controlli T-shirt 3D</legend><button type="button" data-view="white" aria-pressed="true">Bianco</button><button type="button" data-view="black" aria-pressed="false">Nero</button><button type="button" data-view="front">Fronte</button><button type="button" data-view="back">Retro</button><button type="button" data-view="in" aria-label="Avvicina">＋</button><button type="button" data-view="out" aria-label="Allontana">−</button></fieldset><p class="tshirt-credit">Trascina per ruotare a 360° · rotella o pizzico per zoomare<br>Base CC0 di Elvaerwyn / MakeHuman, adattata boxy. <a href="docs/tshirt-model.html" target="_blank" rel="noopener">Modello e limiti</a></p></div>`;
}

async function startTshirtViewer(item) {
  const generation = viewerGeneration;
  const host = dialogContent.querySelector('.tshirt-viewer');
  host.querySelector('[data-view="black"]').insertAdjacentHTML('afterend', '<button type="button" data-view="grey" aria-pressed="false">Grigio</button><button type="button" data-view="vintage" aria-pressed="false">Panna vintage</button>');
  try {
    const { mountTshirtViewer } = await import('./tshirt-viewer.js?v=catalog-restore-1');
    if (generation !== viewerGeneration || !host.isConnected || !dialog.open) return;
    tshirtViewer = mountTshirtViewer(host, item, { scalePanel: dialogContent.querySelector('[data-print-controls]') });
    dialogContent.querySelector('#tshirt-artwork').disabled = false;
  } catch {
    if (generation === viewerGeneration && host.isConnected) {
      host.dataset.state = 'error';
      host.querySelector('[data-viewer-status]').textContent = 'Vista 3D non disponibile. Apri il sito via HTTP/HTTPS; puoi continuare a usare Poster e Immagine originale.';
    }
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function fileUrl(path) {
  return path.split('/').map(part => part === '..' ? part : encodeURIComponent(part)).join('/');
}
function normalize(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function imageTag(item, full = false, lazy = true) {
  const source = full ? fileUrl(item.original) : fileUrl(item.thumbnail);
  return `<img src="${escapeHtml(source)}" alt="" ${lazy ? 'loading="lazy"' : ''} decoding="async" />`;
}
function mockup(item, type, full = false, lazy = true) {
  if (type === 'tshirt') return tshirtMarkup();
  const picture = imageTag(item, full, lazy);
  if (type === 'originale') return `<div class="mockup mockup-original"><div class="original-preview">${picture}</div></div>`;
  if (type === 'poster') return `<div class="mockup mockup-poster"><div class="poster-frame">${picture}</div></div>`;
  const isHoodie = type === 'felpe';
  const uid = `shirt-${item.id.replace(/[^a-z0-9]/gi, '')}-${full ? 'full' : 'thumb'}`;
  const shirtPath = isHoodie ? 'M118 75Q114 27 180 17q65 10 62 58l-14 27 36 14 51 43 27 164-59 18-25-95v122H100V246l-25 95-59-18 27-164 51-43 36-14Z' : 'M108 44 149 27q31 36 62 0l41 17 88 58-38 69-43-22v214H101V149l-43 22-38-69Z';
  const chestPath = isHoodie ? 'M112 115 Q180 160 248 115 L238 282 Q180 307 122 282 Z' : 'M112 116 Q180 145 248 116 L242 300 Q180 320 118 300 Z';
  const source = fileUrl(item.original);
  return `<div class="mockup mockup-${isHoodie ? 'hoodie' : 'shirt'}"><div class="garment-stage" data-tilt><svg viewBox="0 0 360 390" role="img" aria-label="Anteprima interattiva su ${isHoodie ? 'felpa' : 'maglietta'}"><defs><clipPath id="${uid}"><path d="${chestPath}"/></clipPath><filter id="${uid}-shadow"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#18231b" flood-opacity=".23"/></filter></defs><g filter="url(#${uid}-shadow)"><path class="garment-base" d="${shirtPath}"/><path class="garment-seam" d="${isHoodie ? 'M118 75q20 45 62 68 42-23 62-68M126 83q19 34 54 51 35-17 54-51M121 317h118' : 'M149 27q31 36 62 0M101 149l-1-59m159 59 1-59M101 362h158'}"/><image href="${escapeHtml(source)}" x="102" y="105" width="156" height="210" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid})" class="garment-print-image"/><path class="garment-wrinkles" d="M124 157q28 12 42 0m29 0q18 12 40 0M128 194q22 10 43 0m19 0q20 10 39 0M133 236q20 9 36 0m24 0q17 9 34 0M150 278q18 8 29 0m18 0q17 8 27 0"/></g></svg><span class="tilt-hint">TRASCINA PER RUOTARE</span></div></div>`;
}

function buildFilters() {
  searchInput.placeholder = 'Cerca film, categoria, autore o file…';
  searchInput.setAttribute('aria-label', 'Cerca nel catalogo');
  categoryTabs.innerHTML = '<div class="catalog-controls"><div class="catalog-field"><label for="category-select">Categoria</label><select id="category-select"></select></div><div id="catalog-folders" class="catalog-folder-levels"></div><div class="catalog-field" id="film-field"><label for="film-filter">Film</label></div></div><p id="catalog-path" class="catalog-path"></p>';
  document.getElementById('film-field').append(filmFilter);
  filmFilter.setAttribute('aria-label', 'Film');
}

function filterOptions(options, allLabel, allValue, selected, prettify = false) {
  return `<option value="${allValue}">${allLabel}</option>` + options.map(({ value, count }) => `<option value="${escapeHtml(value)}" ${count === 0 && value !== selected ? 'disabled' : ''}>${escapeHtml(prettify ? catalog.label(value) : value)} (${count})</option>`).join('');
}

function updateFilters(base) {
  const categorySelect = document.getElementById('category-select');
  categorySelect.innerHTML = filterOptions(catalog.choices(images, item => item.group, base), `Tutte le categorie (${base.length})`, 'tutti', category);
  categorySelect.value = category;
  document.getElementById('catalog-folders').innerHTML = catalog.levels(images, category, folderSelection, base).map(({ depth, options }) => `<div class="catalog-field"><label for="folder-level-${depth}">${depth === 0 ? 'Sottocartella' : `Sottocartella ${depth + 1}`}</label><select id="folder-level-${depth}" data-folder-depth="${depth}">${filterOptions(options, 'Tutte le sottocartelle', '', folderSelection[depth], true)}</select></div>`).join('');
  folderSelection.forEach((value, depth) => { const select = document.getElementById(`folder-level-${depth}`); if (select) select.value = value; });
  const scope = { category, path: folderSelection };
  const films = catalog.choices(catalog.filter(images, scope), item => item.film, catalog.filter(base, scope));
  filmFilter.innerHTML = filterOptions(films, 'Tutti i film', 'tutti', selectedFilm);
  filmFilter.value = selectedFilm;
  document.getElementById('film-field').hidden = category !== 'tutti' && films.length < 2;
  document.getElementById('catalog-path').textContent = category === 'tutti' ? 'Scegli una categoria oppure cerca per film, autore o file.' : [category, ...folderSelection.map(catalog.label)].join(' › ');
}

function setFeatured() {
  const choose = (text, fallback) => images.find(item => normalize(item.folder).includes(normalize(text))) || images[fallback];
  const selection = [choose('2001 SPACE ODDITY', 0), choose('SHINING', 1), choose('ESSI VIVONO', 2)];
  ['hero-back', 'hero-middle', 'hero-front'].forEach((id, i) => {
    const element = document.getElementById(id);
    if (selection[i]) element.innerHTML = imageTag(selection[i], false, false);
  });
  const editorial = document.getElementById('editorial-frame');
  const feature = choose('PULP FICTION', Math.min(3, images.length - 1));
  if (feature) editorial.innerHTML = imageTag(feature);
}

function updateFavoriteUI() {
  favoritesCount.textContent = String(favorites.size);
  favoritesCount.hidden = favorites.size === 0;
  favoritesToggle.classList.toggle('is-active', onlyFavorites);
  favoritesToggle.setAttribute('aria-label', onlyFavorites ? 'Mostra tutte le immagini' : 'Mostra i preferiti');
  favoritesToggle.title = onlyFavorites ? 'Mostra tutte' : 'Preferiti';
}

function render() {
  const query = searchInput.value.trim();
  const base = catalog.search(images, query, onlyFavorites ? favorites : null);
  updateFilters(base);
  const visible = catalog.filter(base, { category, path: folderSelection, film: selectedFilm });
  grid.innerHTML = visible.length ? visible.map(item => `
    <article class="product-card">
      <div class="product-visual">
        <span class="product-tag">${escapeHtml(item.group)}</span>
        <button class="favorite-button ${favorites.has(item.id) ? 'is-favorite' : ''}" type="button" data-favorite="${item.id}" aria-label="${favorites.has(item.id) ? 'Rimuovi' : 'Aggiungi'} ${escapeHtml(item.filename)} ${favorites.has(item.id) ? 'dai' : 'ai'} preferiti" aria-pressed="${favorites.has(item.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20.5 8.6c0 4.7-8.5 10-8.5 10s-8.5-5.3-8.5-10a4.6 4.6 0 0 1 8.5-2.3 4.6 4.6 0 0 1 8.5 2.3Z"/></svg></button>
        <div class="product-open" role="button" tabindex="0" data-open="${item.id}" aria-label="Apri il poster ${escapeHtml(item.filename)}">${mockup(item, 'poster')}</div>
      </div>
      <div class="product-details"><div><h3>${escapeHtml(item.film)}</h3><p title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</p></div><span class="product-price">${item.width} × ${item.height}</span></div>
    </article>`).join('') : `<div class="empty-state"><span aria-hidden="true">✳</span><h3>${onlyFavorites && favorites.size === 0 ? 'Nessun preferito, per ora.' : 'Nessuna immagine trovata.'}</h3><p>${onlyFavorites && favorites.size === 0 ? 'Tocca il cuore su una foto per ritrovarla qui.' : 'Prova un’altra ricerca o rimuovi i filtri.'}</p><button type="button" id="empty-reset">Mostra tutte le immagini</button></div>`;
  resultsCount.textContent = `${visible.length} ${visible.length === 1 ? 'immagine' : 'immagini'}${onlyFavorites ? ' · preferiti' : ''}`;
  clearFilters.hidden = category === 'tutti' && folderSelection.length === 0 && selectedFilm === 'tutti' && !query && !onlyFavorites;
  updateFavoriteUI();
}

function resetFilters() {
  category = 'tutti'; folderSelection = []; selectedFilm = 'tutti'; searchInput.value = ''; onlyFavorites = false; render();
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch { /* Facoltativo. */ }
  render();
}

function renderDialog() {
  disposeTshirtViewer();
  if (!selectedImage) return;
  const item = selectedImage;
  dialogContent.innerHTML = `<div class="dialog-layout"><div class="dialog-preview">${mockup(item, selectedType, true, false)}</div><div class="dialog-info"><span class="section-index">${escapeHtml(item.group)} / ${escapeHtml(item.folder)}</span><h2 id="dialog-title">${escapeHtml(item.film)}</h2><p class="dialog-description">${escapeHtml(item.filename)}<br />${item.width} × ${item.height} pixel · ${escapeHtml(item.filename.split('.').pop().toUpperCase())}</p><p class="dialog-label">VISUALIZZAZIONE DEL POSTER</p><div class="variant-list" role="group" aria-label="Seleziona anteprima">${Object.entries(productTypes).map(([type, label]) => `<button class="variant-button ${selectedType === type ? 'is-selected' : ''}" type="button" data-variant="${type}" aria-pressed="${selectedType === type}">${label}</button>`).join('')}</div><p class="dialog-price">Il file originale è nel tuo archivio.</p><a class="button button-dark original-link" href="${escapeHtml(fileUrl(item.original))}" target="_blank" rel="noopener">Apri il file originale <span aria-hidden="true">↗</span></a><p class="dialog-note">Le anteprime servono a immaginare il risultato: non modificano il file e non sono file pronti per la stampa. Verifica risoluzione e formato con chi stampa.</p></div></div>`;
}

function setupTshirtDialog(item) {
  if (selectedType !== 'tshirt') return;
  dialogContent.querySelector('.dialog-label').textContent = 'T-SHIRT BOXY · PROTOTIPO 3D';
  const choices = document.createElement('div');
  choices.className = 'tshirt-catalog';
  choices.innerHTML = `<label for="tshirt-artwork">Grafica dal catalogo</label><select id="tshirt-artwork" disabled>${images.map(image => `<option value="${escapeHtml(image.id)}" ${image.id === item.id ? 'selected' : ''}>${escapeHtml(image.film)} — ${escapeHtml(image.filename)}</option>`).join('')}</select><p class="dialog-note">Taglio boxy indicativo, stampa frontale a proporzioni conservate. Nessuna simulazione di taglia, tessuto o file di stampa.</p>`;
  choices.insertAdjacentHTML('beforeend', `<fieldset class="print-size-controls" data-print-controls disabled><legend id="print-size-label">Dimensione grafica <output for="tshirt-print-size" aria-live="polite">100%</output></legend><input id="tshirt-print-size" data-print-range type="range" min="25" max="300" step="5" value="100" aria-labelledby="print-size-label" /><div class="print-size-presets" role="group" aria-label="Percentuali rapide">${[100, 150, 200].map(value => `<button type="button" data-print-scale="${value}" aria-pressed="${value === 100}">${value}%</button>`).join('')}</div><p>Da 25% a 300%. Oltre i bordi del capo, la grafica viene ritagliata.</p></fieldset>`);
  dialogContent.querySelector('.variant-list').after(choices);
  startTshirtViewer(item);
}

function openDialog(id) {
  selectedImage = images.find(item => item.id === id);
  if (!selectedImage) return;
  selectedType = 'poster';
  renderDialog();
  dialogContent.querySelector('.section-index').textContent = [selectedImage.group, ...catalog.folders(selectedImage).map(catalog.label)].join(' / ');
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

buildFilters();
setFeatured();
render();
categoryTabs.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'category-select') { category = target.value; folderSelection = []; selectedFilm = 'tutti'; }
  else if (target.matches('[data-folder-depth]')) {
    const depth = Number(target.dataset.folderDepth);
    folderSelection = folderSelection.slice(0, depth);
    if (target.value) folderSelection.push(target.value);
    selectedFilm = 'tutti';
  } else return;
  render();
  document.getElementById(target.id)?.focus({ preventScroll: true });
});
searchInput.addEventListener('input', render);
filmFilter.addEventListener('change', () => { selectedFilm = filmFilter.value; render(); });
clearFilters.addEventListener('click', resetFilters);
grid.addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]');
  if (favorite) return toggleFavorite(favorite.dataset.favorite);
  const open = event.target.closest('[data-open]');
  if (open) openDialog(open.dataset.open);
  if (event.target.id === 'empty-reset') resetFilters();
});
grid.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open]')) {
    event.preventDefault(); openDialog(event.target.dataset.open);
  }
});
favoritesToggle.addEventListener('click', () => {
  onlyFavorites = !onlyFavorites; render(); document.getElementById('collezione').scrollIntoView({ behavior: 'smooth' });
});
document.getElementById('search-toggle').addEventListener('click', () => {
  document.getElementById('collezione').scrollIntoView({ behavior: 'smooth' });
  searchInput.focus({ preventScroll: true });
});
document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { disposeTshirtViewer(); document.body.classList.remove('dialog-open'); selectedImage = null; });
dialogContent.addEventListener('click', event => {
  const button = event.target.closest('[data-variant]');
  if (!button) return;
  selectedType = button.dataset.variant;
  renderDialog();
  dialogContent.querySelector('.section-index').textContent = [selectedImage.group, ...catalog.folders(selectedImage).map(catalog.label)].join(' / ');
  setupTshirtDialog(selectedImage);
  dialogContent.querySelector(`[data-variant="${selectedType}"]`).focus();
});
dialogContent.addEventListener('change', event => {
  if (event.target.id !== 'tshirt-artwork') return;
  const item = images.find(image => image.id === event.target.value);
  if (!item) return;
  // Keep the original poster's title/link truthful; this selector changes only the print.
  tshirtViewer?.setArtwork(item);
});
document.addEventListener('pointermove', event => {
  const stage = event.target.closest('[data-tilt]');
  if (!stage || !stage.hasPointerCapture?.(event.pointerId)) return;
  const rect = stage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - .5) * 18;
  const y = ((event.clientY - rect.top) / rect.height - .5) * -12;
  stage.style.setProperty('--tilt-x', `${x}deg`);
  stage.style.setProperty('--tilt-y', `${y}deg`);
});
document.addEventListener('pointerdown', event => {
  const stage = event.target.closest('[data-tilt]');
  if (stage) stage.setPointerCapture?.(event.pointerId);
});
document.addEventListener('pointerup', event => {
  const stage = event.target.closest('[data-tilt]');
  if (stage) { stage.releasePointerCapture?.(event.pointerId); stage.style.setProperty('--tilt-x', '0deg'); stage.style.setProperty('--tilt-y', '0deg'); }
});
const menuToggle = document.getElementById('menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
menuToggle.addEventListener('click', () => {
  mobileNav.hidden = !mobileNav.hidden;
  menuToggle.setAttribute('aria-expanded', String(!mobileNav.hidden));
  menuToggle.setAttribute('aria-label', mobileNav.hidden ? 'Apri menu' : 'Chiudi menu');
});
mobileNav.addEventListener('click', event => {
  if (event.target.closest('a')) { mobileNav.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Apri menu'); }
});
