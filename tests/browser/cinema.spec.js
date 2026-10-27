import { test,expect } from '@playwright/test';

async function enter(page){await page.goto('./?cinema=1');await expect(page.locator('#cinema-dialog')).toHaveAttribute('data-state','ready');}

test('cinema: walk in the hall, tap an actual 3D door, project posters and return',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await enter(page);
  const cinema=page.locator('#cinema-dialog'),world=page.locator('[data-cinema-world]');
  await expect(page.locator('[data-cinema-audio]')).toHaveAttribute('aria-pressed','false');
  await cinema.screenshot({path:'test-results/cinema-hall-desktop.png'});
  const canvas=world.locator('canvas'),rect=await canvas.boundingBox();await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
  await expect(cinema).toHaveAttribute('data-mode','room');await expect(cinema).toHaveAttribute('data-poster-id',/.+/);
  await page.locator('[data-cinema-back]').click();const z=Number(await world.getAttribute('data-z'));
  const stick=page.locator('[data-cinema-stick]'),r=await stick.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-25);
  await expect.poll(async()=>Number(await world.getAttribute('data-z'))).toBeLessThan(z-.12);await page.mouse.up();
  await page.locator('[data-cinema-rooms]').first().click();await page.locator('[data-cinema-room]').filter({hasText:'Kubrick'}).click();
  await expect(cinema).toHaveAttribute('data-poster-id',/.+/);const first=await cinema.getAttribute('data-poster-id');await page.locator('[data-cinema-next]').click();await expect(cinema).not.toHaveAttribute('data-poster-id',first);
  await page.locator('[data-cinema-focus]').fill('50');await expect.poll(async()=>Number(await world.getAttribute('data-z'))).toBeLessThan(6);
  await cinema.screenshot({path:'test-results/cinema-auditorium-desktop.png'});
  await page.locator('[data-cinema-back]').click();await expect(world).toHaveAttribute('data-mode','hall');await page.locator('[data-cinema-close]').click();await expect(cinema).not.toBeVisible();await expect(world.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile cinema workshop: real cover and accessible rotary knobs, then back to the screen',async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await enter(page);
  const cinema=page.locator('#cinema-dialog');await cinema.screenshot({path:'test-results/cinema-hall-mobile.png'});
  await page.locator('[data-cinema-rooms]').first().click();await page.locator('[data-cinema-room]').filter({hasText:'Carpenter'}).click();await expect(cinema).toHaveAttribute('data-poster-id',/.+/);
  await cinema.screenshot({path:'test-results/cinema-screen-mobile.png'});
  const poster=await cinema.getAttribute('data-poster-id');await page.locator('[data-cinema-create="cover"]').click();
  const product=page.locator('#product-dialog');await expect(product).toHaveClass(/cinema-workshop/);await expect(product.locator('.phonecase-viewer')).toHaveAttribute('data-state','ready');
  const dial=page.getByRole('slider',{name:'Manopola dimensione',exact:true});await expect(dial).toBeEnabled();await dial.scrollIntoViewIfNeeded();await dial.focus();await page.keyboard.press('ArrowUp');
  await expect(product.locator('.phonecase-viewer')).toHaveAttribute('data-artwork-scale','101');await expect(page.locator('#cover-scale')).toHaveValue('101');
  await product.screenshot({path:'test-results/cinema-workbench-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Chiudi anteprima',exact:true}).click();await expect(cinema).toHaveAttribute('data-mode','room');await expect(cinema).toHaveAttribute('data-poster-id',poster);
  await page.locator('[data-cinema-close]').click();await expect(page.locator('body')).not.toHaveClass(/cinema-open/);
});

test('WebGL unavailable keeps room selection and the catalog accessible',async({page})=>{
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
  await page.goto('./?cinema=1');await expect(page.locator('#cinema-dialog')).toHaveAttribute('data-state','error');await expect(page.locator('[data-cinema-fallback]')).toBeVisible();
  await page.locator('[data-cinema-fallback] [data-cinema-rooms]').click();await page.locator('[data-cinema-room]').filter({hasText:'Kubrick'}).click();await expect(page.locator('#cinema-dialog')).not.toBeVisible();await expect(page.locator('#category-select')).toHaveValue('Kubrick');
});

test('closing the entrance while its module loads cannot create a stale world',async({page})=>{
  let release,started;const pending=new Promise(resolve=>release=resolve),requested=new Promise(resolve=>started=resolve);
  await page.route('**/cinema-world.js*',async route=>{started();await pending;await route.continue();});await page.goto('./');await page.locator('[data-enter-cinema]').first().click();await requested;
  await page.locator('[data-cinema-close]').click();release();await expect(page.locator('#cinema-dialog')).not.toBeVisible();await expect(page.locator('[data-cinema-world] canvas')).toHaveCount(0);
});
