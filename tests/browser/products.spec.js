import { test, expect } from '@playwright/test';

test('uploaded hoodie loads when selected and keeps shirt editor controls', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'T-shirt 3D', exact: true }).click();
  const viewer = page.locator('.tshirt-viewer');
  await expect(viewer).toHaveAttribute('data-state', 'ready');
  await page.locator('[data-garment-select]').selectOption('hoodie-alt');
  await expect(viewer).toHaveAttribute('data-garment', 'hoodie-alt');
  await expect(page.locator('[data-viewer-status]')).toContainText('Felpa Yogaminggames');
  await expect(page.locator('#tshirt-artwork')).toBeEnabled();
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/yogaminggames-hoodie.png' });
  await page.locator('[data-garment-select]').selectOption('hoodie');
  await expect(page.locator('[data-viewer-status]')).toContainText('Premium Eco Hoodie');
});

test('all 15 iPhone models select in the cover viewer and artwork changes', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-open]').first().click();
  await page.getByRole('button', { name: 'Cover iPhone 3D', exact: true }).click();
  const viewer = page.locator('.phonecase-viewer');
  await expect(viewer).toHaveAttribute('data-state', 'ready');
  const models = page.locator('[data-iphone-model] option');
  await expect(models).toHaveCount(15);
  await page.locator('select[data-iphone-model]').selectOption('iPhone 17 Pro Max');
  await expect(viewer).toHaveAttribute('data-device-model', 'iPhone 17 Pro Max');
  await page.locator('#product-dialog').screenshot({ path: 'test-results/previews/iphone-17-pro-max-case.png' });
  const nextArtwork = await page.locator('#case-artwork option').nth(1).getAttribute('value');
  await page.locator('#case-artwork').selectOption(nextArtwork);
  await expect(viewer).toHaveAttribute('data-artwork', nextArtwork);
});
