import { test,expect } from '@playwright/test';
import { PHONE_CASE_MODELS } from '../../phone-case-models.js';

test('every model loads its own shell with dynamic print and visual previews',async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await page.locator('[data-open]').first().click();
  await page.getByRole('button',{name:'Cover iPhone 3D',exact:true}).click();
  const host=page.locator('.phonecase-viewer');await expect(host).toHaveAttribute('data-state','ready');
  for(const p of PHONE_CASE_MODELS){
    await page.locator('[data-iphone-model]').selectOption(p.name);
    await expect(host).toHaveAttribute('data-device-model',p.name);
    await expect(host).not.toHaveAttribute('data-model-loading',p.name);
    await expect(host).toHaveAttribute('data-geometry','shell-3d');
    await expect(host).toHaveAttribute('data-camera-layout',p.layout);
    await host.locator('[data-phonecase-stage]').screenshot({path:'test-results/phones/'+p.id+'.png'});
  }
  expect(errors).toEqual([]);
});

test('a slow earlier model cannot replace the latest selection and failed downloads preserve current shell',async({page})=>{
  await page.goto('./');await page.locator('[data-open]').first().click();await page.getByRole('button',{name:'Cover iPhone 3D',exact:true}).click();
  const host=page.locator('.phonecase-viewer');await expect(host).toHaveAttribute('data-state','ready');
  let release;const delayed=new Promise(resolve=>{release=resolve;});let started;const waiting=new Promise(resolve=>{started=resolve;});
  await page.route('**/iphone-13-shell.glb*',async route=>{started();await delayed;await route.continue();});
  await page.locator('[data-iphone-model]').selectOption('iPhone 13');await waiting;
  await page.locator('[data-iphone-model]').selectOption('iPhone 17 Pro');await expect(host).toHaveAttribute('data-device-model','iPhone 17 Pro');
  release();await expect(host).not.toHaveAttribute('data-model-loading','iPhone 13');
  await page.route('**/iphone-14-shell.glb*',route=>route.fulfill({status:404,body:'missing'}));
  await page.locator('[data-iphone-model]').selectOption('iPhone 14');
  await expect(host.locator('[data-phonecase-status]')).toContainText('non caricata');
  await expect(host).toHaveAttribute('data-device-model','iPhone 17 Pro');await expect(page.locator('[data-iphone-model]')).toHaveValue('iPhone 17 Pro');
  await page.getByRole('button',{name:'Poster',exact:true}).click();await expect(host.locator('canvas')).toHaveCount(0);
});
