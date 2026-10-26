import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.beforeAll(async () => { await mkdir('test-results/previews', { recursive: true }); });

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
  await mkdir('test-results/previews', { recursive: true });
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/desktop-white.png' });
  await page.getByRole('button', { name: 'Nero', exact: true }).click();
  await expect(host).toHaveAttribute('data-color', 'black');
  expect(Buffer.compare(front, await canvas.screenshot())).not.toBe(0);
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/desktop-black.png' });
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
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/desktop-back.png' });
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
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/desktop-landscape.png' });
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
  await expect(page.locator('#dialog-title')).toContainText(/pulp fiction/i);
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
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/mobile.png' });
  const previewBottom = await page.locator('.dialog-preview').evaluate(el => el.getBoundingClientRect().bottom);
  const controlsBottom = await page.getByRole('button', { name: 'Allontana', exact: true }).evaluate(el => el.getBoundingClientRect().bottom);
  expect(controlsBottom).toBeLessThan(previewBottom);
  await page.getByRole('button', { name: 'Nero', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-color', 'black');
  await page.getByRole('button', { name: '200%', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-print-scale', '200');
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
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/realism-2001.png' });
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Avvicina', exact: true }).click();
  await page.locator('.tshirt-stage').screenshot({ path: 'test-results/previews/realism-closeup.png' });
  await page.getByRole('button', { name: 'Nero', exact: true }).click();
  await page.locator('.tshirt-stage').screenshot({ path: 'test-results/previews/realism-closeup-black.png' });
  expect(errors).toEqual([]);
});

test('print size: presets, arbitrary percentage, boundaries and catalog persistence', async ({ page }) => {
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  await openShirt(page);
  const host = page.locator('.tshirt-viewer'), slider = page.locator('[data-print-range]');
  expect(Number(await page.locator('[data-viewer-stage]').getAttribute('data-distance'))).toBeGreaterThanOrEqual(4.45);
  await expect(host).toHaveAttribute('data-print-scale', '100');
  const baseWidth = Number(await host.getAttribute('data-print-width'));
  const initial = await page.locator('canvas').last().screenshot();
  page.on('request', r => { if (r.url().includes('/assets/originals/')) requests.push(r.url()); });
  for (const percent of [150, 200]) {
    await page.getByRole('button', { name: `${percent}%`, exact: true }).click();
    await expect(host).toHaveAttribute('data-print-scale', String(percent));
    expect(Number(await host.getAttribute('data-print-width')) / baseWidth).toBeCloseTo(percent / 100, 8);
    await expect(slider).toHaveValue(String(percent));
    await expect(page.getByRole('button', { name: `${percent}%`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  expect(Buffer.compare(initial, await page.locator('canvas').last().screenshot())).not.toBe(0);
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/print-200.png' });
  for (const percent of [275, 25, 300]) {
    await slider.fill(String(percent));
    await expect(host).toHaveAttribute('data-print-scale', String(percent));
    await expect(page.locator('[data-out=scale]')).toHaveText(`${percent}%`);
  }
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: '150%', exact: true }).click();
  const next = await page.locator('#tshirt-artwork option').nth(3).getAttribute('value');
  await page.locator('#tshirt-artwork').selectOption(next);
  await expect(host).toHaveAttribute('data-artwork', next);
  await expect(host).toHaveAttribute('data-print-scale', '150');
  await expect(host).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'Poster', exact: true }).click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(host).toHaveAttribute('data-state', 'ready');
  await expect(host).toHaveAttribute('data-print-scale', '100');
  expect(errors).toEqual([]);
});

test('changing print scale during an image download uses the latest scale', async ({ page }) => {
  await openShirt(page);
  let release, arrived;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { arrived = resolve; });
  await page.route('**/tl2.jpg', async route => { arrived(); await gate; await route.continue(); });
  const next = await page.locator('#tshirt-artwork option').nth(1).getAttribute('value');
  await page.locator('#tshirt-artwork').selectOption(next); await started;
  await page.getByRole('button', { name: '200%', exact: true }).click();
  release();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-artwork', next);
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-print-scale', '200');
});

test('Sopranos original, poster and 3D print use exact published path spelling', async ({ page }) => {
  await page.goto('./');
  await page.locator('#catalog-search').fill('sopranos2.webp');
  await page.locator('[data-open]').first().click();
  await page.waitForFunction(() => { const img = document.querySelector('.dialog-preview img'); return img?.complete && img.naturalWidth > 0; });
  await expect(page.locator('.original-link')).toHaveAttribute('href', 'assets/originals/sopranos/sopranos2.webp');
  expect((await page.request.get('assets/originals/sopranos/sopranos2.webp')).status()).toBe(200);
  expect((await page.request.get('assets/originals/SOPRANOS/sopranos2.webp')).status()).toBe(404);
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: '200%', exact: true }).click();
  await expect(page.locator('.tshirt-viewer')).toHaveAttribute('data-print-scale', '200');
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/sopranos-path-fixed.png' });
});

test('catalog: existing categories, dependent folders, search counts and reset', async ({ page }) => {
  await page.goto('./');
  const total = await page.locator('[data-open]').count();
  expect(total).toBeGreaterThanOrEqual(346);
  const categories = await page.locator('#category-select option').allTextContents();
  expect(categories.some(label => /^(others|altri film)(\s|$)/i.test(label))).toBeFalsy();
  expect(categories.some(label => label.includes('Fahrenheit 451'))).toBeTruthy();
  await page.locator('#category-select').selectOption('Italiani');
  const italianCount = await page.locator('[data-open]').count();
  await page.locator('#folder-level-0').selectOption('DARIO ARGENTO');
  expect(await page.locator('[data-open]').count()).toBeLessThan(italianCount);
  await expect(page.locator('#catalog-path')).toContainText('Italiani › Dario Argento');
  await page.locator('.collection-toolbar').screenshot({ path: 'test-results/previews/catalog-italiani.png' });
  await page.locator('#folder-level-0').selectOption('ANTONIONI');
  await page.locator('#folder-level-1').selectOption('BLOW UP');
  await expect(page.locator('#catalog-path')).toContainText('Italiani › Antonioni › Blow Up');
  expect(await page.locator('[data-open]').count()).toBeGreaterThan(0);
  await page.locator('.collection-toolbar').screenshot({ path: 'test-results/previews/catalog-nested.png' });
  await page.locator('#category-select').selectOption('Tarantino');
  await expect(page.locator('#catalog-path')).not.toContainText('Dario Argento');
  await expect(page.locator('#folder-level-0')).toHaveValue('');
  await page.locator('#folder-level-0').selectOption('PULP FICTION');
  await expect(page.locator('#film-field')).toBeHidden();
  await page.locator('#clear-filters').click();
  await expect(page.locator('[data-open]')).toHaveCount(total);
  await page.locator('#catalog-search').fill('FAHRENHEIT 451');
  await expect(page.locator('#category-select option[value="Fahrenheit 451"]')).toContainText('(9)');
  await expect(page.locator('[data-open]')).toHaveCount(9);
  await page.locator('[data-open]').first().click();
  await expect(page.locator('.dialog-info .section-index')).not.toContainText(/others/i);
  await page.getByRole('button', { name: 'Chiudi anteprima', exact: true }).click();
  await expect(page.locator('#product-dialog')).not.toBeVisible();
});

test('restored home, header search, favorites filter and mobile menu', async ({ page }) => {
  await page.goto('./');
  await page.screenshot({ path: 'test-results/previews/restored-home.png' });
  const hero = await page.locator('#hero-front img').evaluate(img => ({ image: img.getBoundingClientRect().width, card: img.parentElement.getBoundingClientRect().width }));
  expect(hero.image).toBeLessThanOrEqual(hero.card + 1);
  await page.locator('#search-toggle').click();
  await expect(page.locator('#catalog-search')).toBeFocused();
  await page.locator('[data-favorite]').first().click();
  await page.locator('#favorites-toggle').click();
  await expect(page.locator('[data-open]')).toHaveCount(1);
  await page.locator('#clear-filters').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#mobile-nav a').first().click();
  await expect(page.locator('#mobile-nav')).toBeHidden();
  await page.locator('.collection-toolbar').screenshot({ path: 'test-results/previews/catalog-mobile.png' });
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(widths[0]).toBeLessThanOrEqual(widths[1] + 1);
});

test('four 3D garment colors preserve artwork, scale and orbit without reloading', async ({ page }) => {
  await openShirt(page);
  const host = page.locator('.tshirt-viewer');
  const artwork = await host.getAttribute('data-artwork');
  await page.getByRole('button', { name: '150%', exact: true }).click();
  await expect(host).toHaveAttribute('data-print-scale', '150');
  const requests = []; page.on('request', r => { if (/boxy-shirt|assets\/originals/.test(r.url())) requests.push(r.url()); });
  const screenshots = [];
  for (const [name, key] of [['Bianco', 'white'], ['Nero', 'black'], ['Grigio', 'grey'], ['Panna vintage', 'vintage']]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(host).toHaveAttribute('data-color', key);
    await expect(host).toHaveAttribute('data-artwork', artwork);
    await expect(host).toHaveAttribute('data-print-scale', '150');
    await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    screenshots.push(await page.locator('.tshirt-stage canvas').screenshot());
    if (['grey', 'vintage'].includes(key)) await page.locator('#product-dialog').screenshot({ path: `test-results/previews/color-${key}.png` });
  }
  expect(new Set(screenshots.map(buffer => buffer.toString('base64'))).size).toBe(4);
  expect(requests).toEqual([]);
});
