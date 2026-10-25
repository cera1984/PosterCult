import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function openShirt(page) {
  await page.goto('./');
  await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
}

test('desktop: actual WebGL rendering, colors, orbit, zoom, dynamic artwork, cleanup', async ({ page }) => {
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|GLSL|WebGL/.test(message.text())) errors.push(message.text()); });
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
  await openShirt(page);
  const host = page.locator('.tshirt-viewer');
  const canvas = host.locator('canvas');
  const stage = page.locator('[data-viewer-stage]');
  await expect(canvas).toBeVisible();
  const front = await canvas.screenshot();
  await mkdir('docs/screenshots', { recursive: true });
  await page.locator('#product-dialog').screenshot({ path: 'docs/screenshots/desktop-white.png' });
  await page.getByRole('button', { name: 'Nero', exact: true }).click();
  await expect(host).toHaveAttribute('data-color', 'black');
  expect(Buffer.compare(front, await canvas.screenshot())).not.toBe(0);
  await page.locator('#product-dialog').screenshot({ path: 'docs/screenshots/desktop-black.png' });
  const distance = Number(await stage.getAttribute('data-distance'));
  await page.getByRole('button', { name: 'Avvicina', exact: true }).click();
  expect(Number(await stage.getAttribute('data-distance'))).toBeLessThan(distance);
  await page.getByRole('button', { name: 'Allontana', exact: true }).click();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5, { steps: 10 }); await page.mouse.up();
  expect(Math.abs(Number(await stage.getAttribute('data-azimuth')))).toBeGreaterThan(.2);
  await page.getByRole('button', { name: 'Retro', exact: true }).click();
  expect(Math.abs(Number(await stage.getAttribute('data-azimuth')))).toBeCloseTo(Math.PI, 2);
  await page.locator('#product-dialog').screenshot({ path: 'docs/screenshots/desktop-back.png' });
  await page.getByRole('button', { name: 'Fronte', exact: true }).click();
  await canvas.focus(); await page.keyboard.press('ArrowRight');
  expect(Math.abs(Number(await stage.getAttribute('data-azimuth')))).toBeGreaterThan(.1);
  const oldId = await host.getAttribute('data-artwork');
  const options = page.locator('#tshirt-artwork option');
  const nextId = await options.nth(3).getAttribute('value');
  await page.locator('#tshirt-artwork').selectOption(nextId);
  await expect(host).toHaveAttribute('data-artwork', nextId);
  expect(nextId).not.toBe(oldId);
  await expect(host).toHaveAttribute('data-state', 'ready');
  await page.locator('#product-dialog').screenshot({ path: 'docs/screenshots/desktop-landscape.png' });
  await page.getByRole('button', { name: 'Poster', exact: true }).click();
  await expect(page.locator('.dialog-preview .poster-frame img')).toBeVisible();
  await expect(page.locator('.tshirt-stage canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(host).toHaveAttribute('data-state', 'ready');
  await page.keyboard.press('Escape');
  await expect(page.locator('#product-dialog')).not.toBeVisible();
  await expect(page.locator('.tshirt-stage canvas')).toHaveCount(0);
  expect(errors).toEqual([]); expect(failed).toEqual([]);
});

test('posters: search, original, favorites, keyboard dialog remain usable without loading Three.js', async ({ page }) => {
  const requests = []; page.on('request', r => requests.push(r.url()));
  await page.goto('./');
  const total = await page.locator('[data-open]').count();
  await page.locator('#catalog-search').fill('PULP FICTION');
  expect(await page.locator('[data-open]').count()).toBeLessThan(total);
  await page.locator('[data-open]').first().focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#dialog-title')).toContainText('PULP FICTION');
  await page.getByRole('button', { name: 'Immagine originale', exact: true }).click();
  await expect.poll(() => page.locator('.original-preview img').evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
  const url = await page.locator('.original-link').getAttribute('href');
  expect((await page.request.get(url)).ok()).toBeTruthy();
  await page.keyboard.press('Escape');
  await page.locator('[data-favorite]').first().click();
  await expect(page.locator('#favorites-count')).toHaveText('1');
  await page.reload(); await expect(page.locator('#favorites-count')).toHaveText('1');
  expect(requests.some(url => url.includes('/vendor/three/') || url.includes('boxy-shirt.glb'))).toBeFalsy();
});

test('mobile viewport: visible controls, canvas, no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShirt(page);
  await page.locator('#product-dialog').screenshot({ path: 'docs/screenshots/mobile.png' });
  await page.getByRole('button', { name: 'Nero', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-color', 'black');
  const sizes = await page.locator('#product-dialog').evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
});

test('missing GLB: clear error and working poster fallback', async ({ page }) => {
  await page.route('**/boxy-shirt.glb*', route => route.fulfill({ status: 404, body: 'Missing' }));
  await page.goto('./'); await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('[data-viewer-status]')).toContainText('Vista 3D non disponibile');
  await page.getByRole('button', { name: 'Poster', exact: true }).click();
  await expect(page.locator('.poster-frame img').last()).toBeVisible();
});

test('missing artwork: truthful error retains previous print; retry works', async ({ page }) => {
  await openShirt(page);
  const host = page.locator('.tshirt-viewer'), oldId = await host.getAttribute('data-artwork');
  await page.route('**/assets/originals/**', route => route.fulfill({ status: 404 }));
  const nextId = await page.locator('#tshirt-artwork option').nth(1).getAttribute('value');
  await page.locator('#tshirt-artwork').selectOption(nextId);
  await expect(host).toHaveAttribute('data-state', 'error');
  await expect(host).toHaveAttribute('data-artwork', oldId);
  await page.unroute('**/assets/originals/**');
  await page.locator('#tshirt-artwork').selectOption(oldId);
  await expect(host).toHaveAttribute('data-state', 'ready');
});

test('closing during model download cannot mount a stale canvas', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/boxy-shirt.glb*', async route => { await new Promise(resolve => setTimeout(resolve, 400)); await route.continue(); });
  await page.goto('./'); await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await page.getByRole('button', { name: 'Poster', exact: true }).click();
  await expect(page.locator('.tshirt-stage canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('.tshirt-stage canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('WebGL unavailable: explicit fallback, poster still opens', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return String(type).startsWith('webgl') ? null : original.call(this, type, ...args); };
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/PosterCult/');
  await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'error');
  await page.getByRole('button', { name: 'Poster', exact: true }).click();
  await expect(page.locator('.dialog-preview .poster-frame img')).toBeVisible();
  await context.close();
});

test('rapid catalog changes keep the most recent successful print', async ({ page }) => {
  await openShirt(page);
  const options = page.locator('#tshirt-artwork option');
  const slowId = await options.nth(1).getAttribute('value');
  const finalId = await options.nth(3).getAttribute('value');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let arrived;
  const started = new Promise(resolve => { arrived = resolve; });
  await page.route('**/tl2.jpg', async route => { arrived(); await gate; await route.continue(); });
  await page.locator('#tshirt-artwork').selectOption(slowId);
  await started;
  await page.locator('#tshirt-artwork').selectOption(finalId);
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-artwork', finalId);
  const finished = page.waitForResponse(response => response.url().endsWith('/tl2.jpg'));
  release(); await finished;
  // A round trip through the browser event loop lets the stale loader completion run.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-artwork', finalId);
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
});

test('realism: 2001 artwork at an angle and closer fabric inspection', async ({ page }) => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|GLSL|WebGL/.test(message.text())) errors.push(message.text()); });
  await page.goto('./');
  await page.locator('#catalog-search').fill('SPACE ODDITY 10.webp');
  await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
  await page.locator('.tshirt-stage canvas').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Bianco', exact: true }).click();
  await page.locator('#product-dialog').screenshot({ path: 'docs/screenshots/realism-2001.png' });
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Avvicina', exact: true }).click();
  await page.locator('.tshirt-stage').screenshot({ path: 'docs/screenshots/realism-closeup.png' });
  await page.getByRole('button', { name: 'Nero', exact: true }).click();
  await page.locator('.tshirt-stage').screenshot({ path: 'docs/screenshots/realism-closeup-black.png' });
  expect(errors).toEqual([]);
});
