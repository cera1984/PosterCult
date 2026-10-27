import { test,expect } from '@playwright/test';

async function enter(page){await page.goto('./?cinema=1');await expect(page.locator('#cinema-dialog')).toHaveAttribute('data-state','ready');}

test('iPad landscape: touch-sized navigation and rotary control of the real T-shirt print',async({page})=>{
  await page.setViewportSize({width:1024,height:768});await enter(page);const cinema=page.locator('#cinema-dialog');
  await page.locator('[data-cinema-rooms]').first().click();await expect(page.locator('[data-cinema-room]')).toHaveCount(await page.evaluate(()=>new Set(PosterCultUI.images.map(i=>i.group)).size));
  await page.locator('[data-cinema-room]').filter({hasText:'Kubrick'}).click();await expect(cinema).toHaveAttribute('data-poster-id',/.+/);
  await cinema.screenshot({path:'test-results/cinema-ipad-screen.png'});await page.locator('[data-cinema-create="tshirt"]').click();
  const product=page.locator('#product-dialog'),viewer=product.locator('.tshirt-viewer');await expect(viewer).toHaveAttribute('data-state','ready');
  const dial=page.getByRole('slider',{name:'Manopola dimensione',exact:true});await expect(dial).toBeEnabled();await dial.scrollIntoViewIfNeeded();
  const before=Number(await product.locator('[data-transform="scale"]').inputValue()),rect=await dial.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2-18,{steps:8});await page.mouse.up();
  await expect.poll(async()=>Number(await product.locator('[data-transform="scale"]').inputValue())).toBeGreaterThan(before);
  await product.screenshot({path:'test-results/cinema-ipad-workbench.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('a late projection from a previous room cannot replace the current poster',async({page})=>{
  await enter(page);let release,started,first=true;const pending=new Promise(r=>release=r),requested=new Promise(r=>started=r);
  await page.route('**/assets/originals/**',async route=>{if(first){first=false;started();await pending;}await route.continue();});
  await page.locator('[data-cinema-rooms]').first().click();await page.locator('[data-cinema-room]').filter({hasText:'Kubrick'}).click();await requested;
  await page.locator('[data-cinema-rooms]').first().click();await page.locator('[data-cinema-room]').filter({hasText:'Carpenter'}).click();
  const id=await page.evaluate(()=>PosterCultUI.images.find(i=>i.group==='Carpenter').id);await expect(page.locator('#cinema-dialog')).toHaveAttribute('data-poster-id',id);
  release();await expect(page.locator('[data-cinema-location]')).toContainText('CARPENTER');await expect(page.locator('#cinema-dialog')).toHaveAttribute('data-poster-id',id);
});

test('audio stays opt-in and is released when leaving the cinema',async({page})=>{
  await page.addInitScript(()=>{const Original=window.AudioContext;window.__cinemaAudio=[];window.AudioContext=function(...args){const c=new Original(...args);window.__cinemaAudio.push(c);return c;};window.AudioContext.prototype=Original.prototype;});
  await enter(page);expect(await page.evaluate(()=>window.__cinemaAudio.length)).toBe(0);
  await page.locator('[data-cinema-audio]').click();await expect(page.locator('[data-cinema-audio]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-cinema-close]').click();await expect.poll(()=>page.evaluate(()=>window.__cinemaAudio[0].state)).toBe('closed');
});

test('a failed projection can advance, and Escape closes the room list before leaving the cinema',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await enter(page);let first=true;
  await page.route('**/assets/originals/**',route=>{if(first){first=false;return route.fulfill({status:404,body:'missing poster'});}return route.continue();});
  await page.locator('[data-cinema-rooms]').first().click();await page.locator('[data-cinema-room]').filter({hasText:'Carpenter'}).click();
  await expect(page.locator('[data-cinema-status]')).toContainText('non è stata caricata');await expect(page.locator('[data-cinema-create="cover"]')).toBeDisabled();
  await page.locator('[data-cinema-next]').click();await expect(page.locator('#cinema-dialog')).toHaveAttribute('data-poster-id',/.+/);await expect(page.locator('[data-cinema-create="cover"]')).toBeEnabled();
  await page.locator('[data-cinema-rooms]').first().click();await page.keyboard.press('Escape');await expect(page.locator('[data-cinema-room-menu]')).not.toBeVisible();await expect(page.locator('#cinema-dialog')).toBeVisible();
  await page.locator('[data-cinema-close]').click();expect(errors).toEqual([]);
});
