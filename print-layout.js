export const MIN_PRINT_SCALE = 25;
export const MAX_PRINT_SCALE = 300;

export function normalizePrintScale(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_PRINT_SCALE, Math.max(MIN_PRINT_SCALE, number)) : 100;
}

// Percentage scales both dimensions; image proportions never change.
export function printDimensions(ratio, percentage = 100) {
  if (!Number.isFinite(ratio) || ratio <= 0) throw new Error('Invalid artwork aspect ratio');
  const factor = normalizePrintScale(percentage) / 100;
  const height = Math.min(.76, .56 / ratio) * factor;
  return { width: height * ratio, height };
}
