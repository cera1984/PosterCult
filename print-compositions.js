import { normalizePrintScale } from './print-layout.js';
import { GARMENT_COLORS } from './garment-palette.js';

const bounded = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export function normalizeLayerConfig(value = {}) {
  return {
    side: value.side === 'back' ? 'back' : 'front',
    x: bounded(value.x, 0, -100, 100),
    y: bounded(value.y, 0, -100, 100),
    scale: normalizePrintScale(value.scale ?? 100),
    rotation: bounded(value.rotation, 0, -180, 180),
    crop: bounded(value.crop, 100, 100, 300),
    flip: value.flip === true,
  };
}

// Normalize legacy unscoped entries in memory; persist only on an explicit save.
export function normalizeCompositions(value) {
  const result = Object.create(null);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [key, config] of Object.entries(value)) {
    if (!config || typeof config !== 'object' || !Array.isArray(config.layers)) continue;
    const scoped = /^(tshirt|hoodie):(.*)$/s.exec(key);
    const garment = scoped?.[1] || (config.garment === 'hoodie' ? 'hoodie' : 'tshirt');
    const name = (scoped?.[2] || key).trim().slice(0, 120);
    if (!name) continue;
    result[`${garment}:${name}`] = {
      garment,
      color: Object.hasOwn(GARMENT_COLORS, config.color) ? config.color : 'white',
      layers: config.layers.filter(layer => layer && typeof layer.itemId === 'string')
        .map(layer => ({ itemId: layer.itemId, ...normalizeLayerConfig(layer) })),
    };
  }
  return result;
}
