// Shared pure catalog logic. Classic script keeps the poster archive usable via file://.
(() => {
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const label = value => value.toLocaleLowerCase('it').replace(/(^|[\s-])\p{L}/gu, letter => letter.toLocaleUpperCase('it'));
  function folders(item) {
    const parts = item.folder.split(/\s*\/\s*/).filter(Boolean);
    if (['others', 'altri film'].includes(normalize(parts[0]))) parts.shift();
    parts.shift(); // The current category is already shown by the category menu.
    return parts;
  }
  function filter(items, { category = 'tutti', path = [], film = 'tutti' } = {}) {
    return items.filter(item => (category === 'tutti' || item.group === category) &&
      path.every((part, i) => folders(item)[i] === part) && (film === 'tutti' || item.film === film));
  }
  function search(items, query, favorites = null) {
    const text = normalize(query.trim());
    return items.filter(item => (!favorites || favorites.has(item.id)) && (!text || normalize(`${item.film} ${item.filename} ${item.folder} ${item.group} ${item.subgroup}`).includes(text)));
  }
  function choices(items, field, counted = items) {
    const counts = new Map();
    for (const item of counted) counts.set(field(item), (counts.get(field(item)) || 0) + 1);
    return [...new Set(items.map(field).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it')).map(value => ({ value, count: counts.get(value) || 0 }));
  }
  function levels(items, category, path, counted = items) {
    if (category === 'tutti') return [];
    const result = [];
    for (let depth = 0; depth <= path.length; depth++) {
      const scope = { category, path: path.slice(0, depth) };
      const options = choices(filter(items, scope), item => folders(item)[depth], filter(counted, scope));
      if (!options.length) break;
      result.push({ depth, options });
    }
    return result;
  }
  globalThis.PosterCatalog = { normalize, label, folders, filter, search, choices, levels };
})();
