import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const storageKey = 'postercult-print-compositions-v1';
test.beforeAll(async () => { await mkdir('test-results/previews', { recursive: true }); });
async function openEditor(page) {
  await page.goto('./');
  await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
}
async function save(page, name) {
  await page.locator('[data-composition-name]').fill(name);
  await page.locator('[data-composition-save]').click();
  await expect(page.locator('[data-viewer-status]')).toContainText('salvata');
}

test('two graphics keep independent transforms and front/back placement', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await openEditor(page);
  const host = page.locator('.tshirt-viewer'), canvas = page.locator('.tshirt-stage canvas');
  const initial = await canvas.screenshot();
  await page.locator('[data-transform=x]').fill('35');
  await page.locator('[data-transform=y]').fill('-25');
  await page.locator('[data-transform=rotation]').fill('30');
  await page.locator('[data-transform=crop]').fill('150');
  await page.locator('[data-layer-flip]').click();
  expect(Buffer.compare(initial, await canvas.screenshot())).not.toBe(0);
  const firstId = await page.locator('[data-layer-select]').inputValue();
  const firstArtwork = await host.getAttribute('data-artwork');
  await page.locator('[data-layer-add]').click();
  await expect(host).toHaveAttribute('data-layer-count', '2');
  const next = await page.locator('#tshirt-artwork option').nth(3).getAttribute('value');
  await page.locator('#tshirt-artwork').selectOption(next);
  await expect(host).toHaveAttribute('data-artwork', next);
  await page.locator('[data-layer-side]').selectOption('back');
  await page.locator('[data-transform=x]').fill('-20');
  await page.getByRole('button', { name: '150%', exact: true }).click();
  await page.locator('[data-layer-select]').selectOption(firstId);
  await expect(host).toHaveAttribute('data-artwork', firstArtwork);
  await expect(page.locator('[data-transform=x]')).toHaveValue('35');
  await expect(page.locator('[data-transform=rotation]')).toHaveValue('30');
  await expect(page.locator('[data-transform=crop]')).toHaveValue('150');
  await expect(page.locator('[data-layer-flip]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-layer-side]')).toHaveValue('front');
  await save(page, 'Due grafiche');
  const config = await page.evaluate(key => JSON.parse(localStorage.getItem(key))['tshirt:Due grafiche'], storageKey);
  expect(config.layers).toHaveLength(2);
  expect(config.layers[0]).toMatchObject({ itemId: firstArtwork, x: 35, y: -25, rotation: 30, crop: 150, flip: true, side: 'front', scale: 100 });
  expect(config.layers[1]).toMatchObject({ itemId: next, x: -20, rotation: 0, crop: 100, flip: false, side: 'back', scale: 150 });
  expect(errors).toEqual([]);
});

test('hoodie changes real rendering and same-name compositions survive reload independently', async ({ page }) => {
  await openEditor(page);
  const host = page.locator('.tshirt-viewer'), canvas = page.locator('.tshirt-stage canvas');
  await page.locator('[data-transform=x]').fill('25');
  await page.getByRole('button', { name: 'Nero', exact: true }).click();
  await save(page, 'Preferita');
  const shirt = await canvas.screenshot();
  const requests = []; page.on('request', request => { if (/boxy-shirt|assets\/originals/.test(request.url())) requests.push(request.url()); });
  await page.locator('[data-garment-select]').selectOption('hoodie');
  await expect(host).toHaveAttribute('data-garment', 'hoodie');
  expect(Buffer.compare(shirt, await canvas.screenshot())).not.toBe(0);
  await expect(page.locator('[data-composition-list]')).toContainText('Nessuna composizione');
  await page.locator('[data-transform=x]').fill('-35');
  await page.locator('[data-transform=scale]').fill('200');
  await page.getByRole('button', { name: 'Grigio', exact: true }).click();
  await save(page, 'Preferita');
  expect(requests).toEqual([]);
  await page.locator('#product-dialog').evaluate(dialog => { dialog.scrollTop = 0; });
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/hoodie-desktop.png' });
  await page.reload();
  await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(host).toHaveAttribute('data-state', 'ready');
  await page.locator('[data-composition-load]').click();
  await expect(host).toHaveAttribute('data-state', 'ready');
  await expect(host).toHaveAttribute('data-color', 'black');
  await expect(page.locator('[data-transform=x]')).toHaveValue('25');
  await page.locator('[data-garment-select]').selectOption('hoodie');
  await page.locator('[data-composition-load]').click();
  await expect(host).toHaveAttribute('data-state', 'ready');
  await expect(host).toHaveAttribute('data-color', 'grey');
  await expect(page.locator('[data-transform=x]')).toHaveValue('-35');
  await expect(page.locator('[data-transform=scale]')).toHaveValue('200');
  await page.locator('[data-composition-delete]').click();
  await expect(page.locator('[data-composition-list]')).toContainText('Nessuna composizione');
  await page.locator('[data-garment-select]').selectOption('tshirt');
  await expect(page.locator('[data-composition-list]')).toHaveValue('tshirt:Preferita');
});

test('removing a layer during download cannot resurrect it or replace another layer', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await openEditor(page);
  const host = page.locator('.tshirt-viewer'), original = await host.getAttribute('data-artwork');
  await page.locator('[data-layer-add]').click();
  await expect(host).toHaveAttribute('data-state', 'ready');
  let release, arrived;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { arrived = resolve; });
  await page.route('**/tl2.jpg', async route => { arrived(); await gate; await route.continue(); });
  const next = await page.locator('#tshirt-artwork option').nth(1).getAttribute('value');
  await page.locator('#tshirt-artwork').selectOption(next); await started;
  await page.locator('[data-layer-remove]').click();
  const response = page.waitForResponse(response => response.url().endsWith('/tl2.jpg'));
  release(); await response;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(host).toHaveAttribute('data-layer-count', '1');
  await expect(host).toHaveAttribute('data-artwork', original);
  expect(errors).toEqual([]);
});

test('artwork chosen before model loading becomes the single initial layer', async ({ page }) => {
  let release, arrived;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { arrived = resolve; });
  await page.route('**/boxy-shirt.glb*', async route => { arrived(); await gate; await route.continue(); });
  await page.goto('./'); await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click(); await started;
  const next = await page.locator('#tshirt-artwork option').nth(3).getAttribute('value');
  await page.locator('#tshirt-artwork').selectOption(next);
  await expect(page.locator('[data-layer-add]')).toBeDisabled();
  release();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-layer-count', '1');
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-artwork', next);
});

test('unavailable local storage reports a failed save while the editor keeps working', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException('Unavailable', 'QuotaExceededError'); };
  });
  await openEditor(page);
  await page.locator('[data-composition-name]').fill('Non salvabile');
  await page.locator('[data-composition-save]').click();
  await expect(page.locator('[data-viewer-status]')).toContainText('Impossibile salvare');
  await page.locator('[data-transform=x]').fill('40');
  await expect(page.locator('[data-out=x]')).toHaveText('40');
  await expect(page.locator('.tshirt-stage canvas')).toBeVisible();
});

test.describe('tablet editor', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  test('landscape and portrait keep garment controls and composition fields usable', async ({ page }) => {
    await openEditor(page);
    await page.locator('[data-garment-select]').selectOption('hoodie');
    await page.locator('[data-transform=x]').fill('15');
    await page.locator('[data-layer-add]').click();
    await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
    await page.locator('[data-layer-side]').selectOption('back');
    await save(page, 'Tablet');
    for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const widths = await page.locator('#product-dialog').evaluate(dialog => [dialog.scrollWidth, dialog.clientWidth]);
      expect(widths[0]).toBeLessThanOrEqual(widths[1] + 1);
      await page.locator('#product-dialog').evaluate(dialog => { dialog.scrollTop = 0; });
      await expect(page.locator('[data-garment-select]')).toBeVisible();
      await page.locator('#product-dialog').screenshot({ path: `test-results/previews/hoodie-${viewport.width}.png` });
    }
  });
});
