// Catalogo privato sincronizzato da generate_catalog.py
const images = Array.isArray(window.POSTERZ_IMAGES) ? window.POSTERZ_IMAGES : [];
const productTypes = { originale: 'Immagine', poster: 'Poster', magliette: 'Maglietta', felpe: 'Felpa' };

const garmentColors = {
  vintage: { name: 'Vintage Panna', fill: '#d4c5b2', stroke: '#b0a08b', shadow: '#221c17' },
  white: { name: 'Bianca', fill: '#f7f7f5', stroke: '#d1d1cd', shadow: '#18231b' },
  black: { name: 'Nera', fill: '#1a1b1a', stroke: '#3a3d3a', shadow: '#050706' },
  grey: { name: 'Grigia', fill: '#9b9e98', stroke: '#757873', shadow: '#151a17' }
};

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
} catch { /* Storage bloccato dal browser */ }

let category = 'tutti';
let subgroup = 'tutte';
let selectedFilm = 'tutti';
let onlyFavorites = false;
let selectedImage = null;
let selectedType = 'magliette';
let selectedColor = 'vintage';

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

function mockup(item, type, full = false, lazy = true, colorKey = 'vintage') {
  const picture = imageTag(item, full, lazy);
  if (type === 'originale') return `<div class="mockup mockup-original"><div class="original-preview">${picture}</div></div>`;
  if (type === 'poster') return `<div class="mockup mockup-poster"><div class="poster-frame">${picture}</div></div>`;

  const isHoodie = type === 'felpe';
  const color = garmentColors[colorKey] || garmentColors.vintage;
  const uid = `shirt-${item.id.replace(/[^a-z0-9]/gi, '')}-${full ? 'full' : 'thumb'}-${colorKey}`;
  const shirtPath = isHoodie ? 'M118 75Q114 27 180 17q65 10 62 58l-14 27 36 14 51 43 27 164-59 18-25-95v122H100V246l-25 95-59-18 27-164 51-43 36-14Z' : 'M108 44 149 27q31 36 62 0l41 17 88 58-38 69-43-22v214H101V149l-43 22-38-69Z';
  const chestPath = isHoodie ? 'M112 115 Q180 160 248 115 L238 282 Q180 307 122 282 Z' : 'M112 116 Q180 145 248 116 L242 300 Q180 320 118 300 Z';
  const source = fileUrl(item.original);

  return `<div class="mockup mockup-${isHoodie ? 'hoodie' : 'shirt'}"><div class="garment-stage" data-tilt><svg viewBox="0 0 360 390" role="img" aria-label="Anteprima su ${isHoodie ? 'felpa' : 'maglietta'}"><defs><clipPath id="${uid}"><path d="${chestPath}"/></clipPath><filter id="${uid}-shadow"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="${color.shadow}" flood-opacity=".28"/></filter></defs><g filter="url(#${uid}-shadow)"><path class="garment-base" d="${shirtPath}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="2"/><path class="garment-seam" d="${isHoodie ? 'M118 75q20 45 62 68 42-23 62-68M126 83q19 34 54 51 35-17 54-51M121 317h118' : 'M149 27q31 36 62 0M101 149l-1-59m159 59 1-59M101 362h158'}"/><image href="${escapeHtml(source)}" x="102" y="105" width="156" height="210" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid})" class="garment-print-image"/><path class="garment-wrinkles" d="M124 157q28 12 42 0m29 0q18 12 40 0M128 194q22 10 43 0m19 0q20 10 39 0M133 236q20 9 36 0m24 0q17 9 34 0M150 278q18 8 29 0m18 0q17 8 27 0"/></g></svg><span class="tilt-hint">TRASCINA PER RUOTARE</span></div></div>`;
}

function buildFilters() {
  const groups = [...new Set(images.map(item => item.group))].sort((a, b) => a.localeCompare(b, 'it'));
  
  // Costruiamo un menu a tendina smart per le categorie / collezioni
  categoryTabs.innerHTML = `
    <div class="smart-filters">
      <div class="filter-group">
        <label for="category-select">Collezione / Regista:</label>
        <select id="category-select" aria-label="Filtra per collezione o regista">
          <option value="tutti">Tutte le collezioni (${images.length})</option>
          ${groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group" id="subgroup-wrapper" hidden>
        <label for="subgroup-select">Sottocartella:</label>
        <select id="subgroup-select" aria-label="Filtra sottocartella">
          <option value="tutte">Tutte le sottocartelle</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="film-select">Film:</label>
        <select id="film-select" aria-label="Filtra per film">
          <option value="tutti">Tutti i film</option>
        </select>
      </div>
    </div>
  `;

  updateSubgroupsAndFilms();
}

function updateSubgroupsAndFilms() {
  const catSelect = document.getElementById('category-select');
  const subWrap = document.getElementById('subgroup-wrapper');
  const subSelect = document.getElementById('subgroup-select');
  const filmSel = document.getElementById('film-select');
  if (!catSelect || !filmSel) return;

  category = catSelect.value;

  // Sottocartelle per la categoria scelta
  const filteredForSub = category === 'tutti' ? images : images.filter(i => i.group === category);
  const subvalues = [...new Set(filteredForSub.map(i => i.subgroup).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  
  if (subWrap && subSelect) {
    if (subvalues.length > 0) {
      subWrap.hidden = false;
      subSelect.innerHTML = '<option value="tutte">Tutte le sottocartelle</option>' + subvalues.map(s => `<option value="${escapeHtml(s)}" ${subgroup === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
    } else {
      subWrap.hidden = true;
      subgroup = 'tutte';
    }
  }

  // Film disponibili
  const filteredForFilms = filteredForSub.filter(i => subgroup === 'tutte' || i.subgroup === subgroup);
  const films = [...new Set(filteredForFilms.map(i => i.film))].sort((a, b) => a.localeCompare(b, 'it'));
  filmSel.innerHTML = '<option value="tutti">Tutti i film</option>' + films.map(f => `<option value="${escapeHtml(f)}" ${selectedFilm === f ? 'selected' : ''}>${escapeHtml(f)}</option>`).join('');
}

function setFeatured() {
  const choose = (text, fallback) => images.find(item => normalize(item.folder).includes(normalize(text))) || images[fallback];
  const selection = [choose('2001', 0), choose('SHINING', 1), choose('PULP', 2)];
  ['hero-back', 'hero-middle', 'hero-front'].forEach((id, i) => {
    const element = document.getElementById(id);
    if (selection[i]) element.innerHTML = imageTag(selection[i], false, false);
  });
  const editorial = document.getElementById('editorial-frame');
  const feature = choose('ESSI VIVONO', Math.min(3, images.length - 1));
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
  const query = normalize(searchInput.value.trim());
  const visible = images.filter(item =>
    (category === 'tutti' || item.group === category) &&
    (subgroup === 'tutte' || item.subgroup === subgroup) &&
    (selectedFilm === 'tutti' || item.film === selectedFilm) &&
    (!onlyFavorites || favorites.has(item.id)) &&
    (!query || normalize(`${item.film} ${item.filename} ${item.folder} ${item.group} ${item.subgroup}`).includes(query))
  );

  grid.innerHTML = visible.length ? visible.map(item => `
    <article class="product-card">
      <div class="product-visual">
        <span class="product-tag">${escapeHtml(item.group)}${item.subgroup ? ' / ' + escapeHtml(item.subgroup) : ''}</span>
        <button class="favorite-button ${favorites.has(item.id) ? 'is-favorite' : ''}" type="button" data-favorite="${item.id}" aria-label="${favorites.has(item.id) ? 'Rimuovi' : 'Aggiungi'} ${escapeHtml(item.filename)} ${favorites.has(item.id) ? 'dai' : 'ai'} preferiti" aria-pressed="${favorites.has(item.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20.5 8.6c0 4.7-8.5 10-8.5 10s-8.5-5.3-8.5-10a4.6 4.6 0 0 1 8.5-2.3 4.6 4.6 0 0 1 8.5 2.3Z"/></svg></button>
        <div class="product-open" role="button" tabindex="0" data-open="${item.id}" aria-label="Apri ${escapeHtml(item.filename)} e provalo sui prodotti">${mockup(item, 'poster', false, true, selectedColor)}</div>
      </div>
      <div class="product-details"><div><h3>${escapeHtml(item.film)}</h3><p title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</p></div><span class="product-price">${item.width} × ${item.height}</span></div>
    </article>`).join('') : `<div class="empty-state"><span aria-hidden="true">✳</span><h3>${onlyFavorites && favorites.size === 0 ? 'Nessun preferito, per ora.' : 'Nessuna immagine trovata.'}</h3><p>${onlyFavorites && favorites.size === 0 ? 'Tocca il cuore su una foto per ritrovarla qui.' : 'Prova un’altra ricerca o rimuovi i filtri.'}</p><button type="button" id="empty-reset">Mostra tutte le immagini</button></div>`;

  resultsCount.textContent = `${visible.length} ${visible.length === 1 ? 'immagine' : 'immagini'}${onlyFavorites ? ' · preferiti' : ''}`;
  clearFilters.hidden = category === 'tutti' && subgroup === 'tutte' && selectedFilm === 'tutti' && !query && !onlyFavorites;
  updateFavoriteUI();
}

function resetFilters() {
  category = 'tutti';
  subgroup = 'tutte';
  selectedFilm = 'tutti';
  searchInput.value = '';
  onlyFavorites = false;
  const catSel = document.getElementById('category-select');
  if (catSel) catSel.value = 'tutti';
  updateSubgroupsAndFilms();
  render();
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch { /* Facoltativo */ }
  render();
}

function renderDialog() {
  disposeTshirtViewer();
  if (!selectedImage) return;
  const item = selectedImage;
  const isGarment = selectedType === 'magliette' || selectedType === 'felpe';

  dialogContent.innerHTML = `
    <div class="dialog-layout">
      <div class="dialog-preview">${mockup(item, selectedType, true, false, selectedColor)}</div>
      <div class="dialog-info">
        <span class="section-index">${escapeHtml(item.group)}${item.subgroup ? ' / ' + escapeHtml(item.subgroup) : ''} / ${escapeHtml(item.folder)}</span>
        <h2 id="dialog-title">${escapeHtml(item.film)}</h2>
        <p class="dialog-description">${escapeHtml(item.filename)}<br />${item.width} × ${item.height} pixel · ${escapeHtml(item.filename.split('.').pop().toUpperCase())}</p>
        
        <p class="dialog-label">SCEGLI TIPO DI ANTEPRIMA</p>
        <div class="variant-list" role="group" aria-label="Seleziona anteprima">
          ${Object.entries(productTypes).map(([type, label]) => `<button class="variant-button ${selectedType === type ? 'is-selected' : ''}" type="button" data-variant="${type}" aria-pressed="${selectedType === type}">${label}</button>`).join('')}
        </div>

        ${isGarment ? `
          <p class="dialog-label">COLORE DEL CAPO</p>
          <div class="color-list" role="group" aria-label="Seleziona colore capo">
            ${Object.entries(garmentColors).map(([key, col]) => `<button class="color-button ${selectedColor === key ? 'is-selected' : ''}" type="button" data-color="${key}" style="background-color: ${col.fill};" title="${col.name}" aria-label="${col.name}" aria-pressed="${selectedColor === key}"></button>`).join('')}
          </div>
        ` : ''}

        <p class="dialog-price">Il file originale è nel tuo archivio.</p>
        <a class="button button-dark original-link" href="${escapeHtml(fileUrl(item.original))}" target="_blank" rel="noopener">Apri il file originale <span aria-hidden="true">↗</span></a>
        <p class="dialog-note">Simulazione di stampa personale. Trascina l'anteprima per ruotarla in 3D. Verifica risoluzione e formato con chi stampa.</p>
      </div>
    </div>
  `;
}

function openDialog(id) {
  selectedImage = images.find(item => item.id === id);
  if (!selectedImage) return;
  selectedType = 'poster';
  renderDialog();
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

buildFilters();
setFeatured();
render();

// Event Listeners per i filtri smart
categoryTabs.addEventListener('change', event => {
  if (event.target.id === 'category-select') {
    category = event.target.value;
    subgroup = 'tutte';
    selectedFilm = 'tutti';
    updateSubgroupsAndFilms();
    render();
  } else if (event.target.id === 'subgroup-select') {
    subgroup = event.target.value;
    selectedFilm = 'tutti';
    updateSubgroupsAndFilms();
    render();
  } else if (event.target.id === 'film-select') {
    selectedFilm = event.target.value;
    render();
  }
});

searchInput.addEventListener('input', render);
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
dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); selectedImage = null; });

dialogContent.addEventListener('click', event => {
  const variantBtn = event.target.closest('[data-variant]');
  if (variantBtn) {
    selectedType = variantBtn.dataset.variant;
    renderDialog();
    return;
  }
  const colorBtn = event.target.closest('[data-color]');
  if (colorBtn) {
    selectedColor = colorBtn.dataset.color;
    renderDialog();
    return;
  }
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
