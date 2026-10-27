import { test,expect } from '@playwright/test';

test('modern archive: featured navigation, keyboard search and filtered surprise',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
  await expect(page.locator('[data-archive-count]')).not.toHaveText('—');
  const title=await page.locator('#feature-title').textContent();
  await page.getByRole('button',{name:'Locandina successiva',exact:true}).click();
  await expect(page.locator('#feature-title')).not.toHaveText(title);
  await page.locator('#feature-open').click();await expect(page.locator('#product-dialog')).toBeVisible();await page.keyboard.press('Escape');
  await page.screenshot({path:'test-results/modern-home-desktop.png'});
  await page.keyboard.press('/');await expect(page.locator('#catalog-search')).toBeFocused();
  await page.locator('#catalog-search').fill('SHINING');
  const names=await page.locator('.product-details h3').allTextContents();expect(names.length).toBeGreaterThan(0);
  await page.locator('.lucky-button').click();expect(names).toContain(await page.locator('#dialog-title').textContent());
  expect(errors).toEqual([]);
});

test('category shortcuts, sorting, density persistence, favorites feedback and quick cover',async({page})=>{
  await page.goto('./');
  const shortcut=page.locator('[data-quick-category]').nth(1),category=await shortcut.getAttribute('data-quick-category');
  await shortcut.click();await expect(page.locator('#category-select')).toHaveValue(category);
  await page.locator('#archive-sort').selectOption('title');
  const names=await page.locator('.product-details h3').allTextContents();expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b,'it')));
  await page.getByRole('button',{name:'Griglia compatta',exact:true}).click();await expect(page.locator('#product-grid')).toHaveAttribute('data-density','compact');
  await page.locator('[data-favorite]').first().click();await expect(page.locator('#archive-toast')).toContainText('Aggiunto');
  await page.locator('.product-card').first().hover();
  await page.locator('.collection-toolbar').screenshot({path:'test-results/modern-filters-desktop.png'});
  await page.locator('[data-quick-type="cover"]').first().click();await expect(page.locator('.phonecase-viewer')).toHaveAttribute('data-state','ready');
  await expect(page.locator('[data-cover-editor]')).toBeEnabled();await page.locator('#product-dialog').screenshot({path:'test-results/modern-cover-desktop.png'});
  await page.keyboard.press('Escape');await page.reload();await expect(page.locator('#product-grid')).toHaveAttribute('data-density','compact');
});

test('mobile vintage interface remains usable without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
  await page.screenshot({path:'test-results/modern-home-mobile.png'});
  await page.getByRole('button',{name:'Apri menu',exact:true}).click();await expect(page.locator('#mobile-nav')).toBeVisible();await page.locator('#mobile-nav a').first().click();
  await page.locator('.collection-toolbar').scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/modern-catalog-mobile.png'});
  await page.locator('[data-quick-type="cover"]').first().click();await expect(page.locator('.phonecase-viewer')).toHaveAttribute('data-state','ready');
  await page.getByRole('slider',{name:'Dimensione',exact:false}).scrollIntoViewIfNeeded();
  await page.locator('#product-dialog').screenshot({path:'test-results/modern-editor-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
