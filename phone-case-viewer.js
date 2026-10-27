import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { createIphone16ProCase } from './iphone-16-pro-geometry.js?v=shell-2';
import { RoomEnvironment } from './vendor/three/examples/jsm/environments/RoomEnvironment.js';

const devices = [
  ['iPhone 13', 71.5, 146.7, 'standard'], ['iPhone 13 Pro', 71.5, 146.7, 'pro'], ['iPhone 13 Pro Max', 78.1, 160.8, 'pro'],
  ['iPhone 14', 71.5, 146.7, 'standard'], ['iPhone 14 Pro', 71.5, 147.5, 'pro'], ['iPhone 14 Pro Max', 77.6, 160.7, 'pro'],
  ['iPhone 15', 71.6, 147.6, 'standard'], ['iPhone 15 Pro', 70.6, 146.6, 'pro'], ['iPhone 15 Pro Max', 76.7, 159.9, 'pro'],
  ['iPhone 16', 71.6, 147.6, 'standard'], ['iPhone 16 Pro', 71.45, 149.61, 'pro'], ['iPhone 16 Pro Max', 77.6, 163.0, 'pro'],
  ['iPhone 17', 71.5, 149.6, 'standard'], ['iPhone 17 Pro', 71.9, 150.0, 'wide-pro'], ['iPhone 17 Pro Max', 78.0, 163.4, 'wide-pro']
].map(([name, width, height, camera]) => ({ name, width, height, camera }));

function roundedShape(width, height, radius) {
  const x = width / 2, y = height / 2, r = Math.min(radius, x, y);
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y); shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r); shape.quadraticCurveTo(x, y, x - r, y); shape.lineTo(-x + r, y);
  shape.quadraticCurveTo(-x, y, -x, y - r); shape.lineTo(-x, -y + r); shape.quadraticCurveTo(-x, -y, -x + r, -y);
  return shape;
}

function panel(width, height, radius, color, z, materialOptions = {}) {
  const geometry = new THREE.ShapeGeometry(roundedShape(width, height, radius), 8);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .68, ...materialOptions }));
  mesh.position.z = z;
  return mesh;
}

function makeDisk(parent, x, y, z, radius, depth, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material);
  mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

function makeLens(parent, x, y, radius, z) {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * .94, radius * .09, 8, 40), new THREE.MeshPhysicalMaterial({ color: '#aeb8b8', metalness: .92, roughness: .2, clearcoat: .7 }));
  rim.position.set(x, y, z); parent.add(rim);
  makeDisk(parent, x, y, z + radius * .1, radius * .81, radius * .12, new THREE.MeshPhysicalMaterial({ color: '#101619', metalness: .25, roughness: .16, clearcoat: 1, clearcoatRoughness: .08 }));
  makeDisk(parent, x, y, z + radius * .18, radius * .57, radius * .045, new THREE.MeshPhysicalMaterial({ color: '#080d12', metalness: .32, roughness: .08, clearcoat: 1 }));
  const glint = new THREE.Mesh(new THREE.CircleGeometry(radius * .16, 20), new THREE.MeshBasicMaterial({ color: '#9ab9c6', transparent: true, opacity: .56 }));
  glint.position.set(x - radius * .2, y + radius * .24, z + radius * .22); parent.add(glint);
}

function raisedPanel(width, height, radius, depth, material) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(width, height, radius), { depth, bevelEnabled: true, bevelSegments: 3, bevelSize: depth * .15, bevelThickness: depth * .18, curveSegments: 16, steps: 1 });
  return new THREE.Mesh(geometry, material);
}

function addCameraModule(group, device, width, height, z) {
  const wide = device.camera === 'wide-pro';
  const pro = device.camera !== 'standard';
  const moduleW = width * (wide ? .39 : pro ? .39 : .34);
  const moduleH = height * (wide ? .185 : pro ? .205 : .18);
  const x = -width * .285, y = height * .345;
  const moduleDepth = width * .025;
  const module = raisedPanel(moduleW, moduleH, moduleW * .19, moduleDepth, new THREE.MeshPhysicalMaterial({ color: '#303638', metalness: .53, roughness: .24, clearcoat: .72, clearcoatRoughness: .18 }));
  module.position.set(x, y, z - moduleDepth * .1); group.add(module);
  const lensRadius = moduleW * (wide ? .105 : pro ? .12 : .14);
  const offsets = pro
    ? [[-.24, .25], [.24, .25], [-.24, -.25]]
    : [[-.23, .24], [.23, -.24]];
  const lensZ = z + moduleDepth * .92;
  for (const [dx, dy] of offsets) makeLens(group, x + dx * moduleW, y + dy * moduleH, lensRadius, lensZ);
  const detailX = x + moduleW * .31, detailY = y - moduleH * .29;
  makeDisk(group, detailX, detailY, lensZ, moduleW * .045, moduleW * .04, new THREE.MeshPhysicalMaterial({ color: '#e5dfc9', roughness: .2, clearcoat: .8 }));
  if (pro) makeDisk(group, detailX, detailY - moduleH * .25, lensZ, moduleW * .032, moduleW * .03, new THREE.MeshStandardMaterial({ color: '#101516', metalness: .4, roughness: .2 }));
}

export function mountPhoneCaseViewer(host, initialItem, { editor } = {}) {
  const stage = host.querySelector('[data-phonecase-stage]');
  const status = host.querySelector('[data-phonecase-status]');
  const controlsPanel = host.querySelector('[data-phonecase-controls]');
  const select = host.querySelector('[data-iphone-model]');
  select.replaceChildren(...devices.map(device => new Option(device.name, device.name)));
  select.value = 'iPhone 16 Pro';
  let caseData, fitMode = "cover", artworkFrame;
  const transform = { scale: 100, x: 0, y: 0 };
  let disposed = false, renderer, controls, observer, artwork, request = 0, currentModel, environmentTarget, ground, groundTexture, facing = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eeede8');
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 30);
  camera.position.set(.15, .22, 3.15);
  const target = new THREE.Vector3(0, 0, 0);
  const setStatus = message => { if (!disposed) status.textContent = message; };
  const render = () => { if (!disposed && renderer) { renderer.render(scene, camera); stage.dataset.azimuth = controls?.getAzimuthalAngle().toFixed(3); stage.dataset.distance = camera.position.distanceTo(target).toFixed(3); } };
  const updateArtwork = () => {
    if (!currentModel?.print || !artwork) return;
    const aspect=currentModel.print.userData.aspect;
    const material=currentModel.print.material;
    const texture=material.map || new THREE.CanvasTexture(document.createElement('canvas'));
    const canvas=texture.image;
    const height=Math.round(1024/aspect);
    if(canvas.width!==1024 || canvas.height!==height) {canvas.width=1024;canvas.height=height;}
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f2eee6';ctx.fillRect(0,0,canvas.width,canvas.height);
    const image=artwork.image;
    const fit=fitMode==='contain'?Math.min:Math.max;
    const scale=fit(canvas.width/image.width,canvas.height/image.height)*transform.scale/100;
    const w=image.width*scale,h=image.height*scale;
    ctx.drawImage(image,(canvas.width-w)/2+canvas.width*transform.x/100,(canvas.height-h)/2-canvas.height*transform.y/100,w,h);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=renderer?.capabilities.getMaxAnisotropy() || 1;
    texture.needsUpdate=true;
    material.map=texture;material.needsUpdate=true;
    for(const [key,value] of Object.entries(transform)) host.dataset['artwork'+key[0].toUpperCase()+key.slice(1)]=String(value);
    render();
  };
  const syncEditor = () => {
    if(!editor) return;
    for(const [key,value] of Object.entries(transform)) {
      editor.querySelector('[data-cover-transform="'+key+'"]').value=String(value);
      editor.querySelector('[data-cover-out="'+key+'"]').textContent=value+'%';
    }
  };
  const onTransform = event => {
    const key=event.target.dataset.coverTransform;
    if(!Object.hasOwn(transform,key)) return;
    const value=Number(event.target.value);
    if(!Number.isFinite(value)) return;
    transform[key]=THREE.MathUtils.clamp(value,key==='scale'?25:-100,key==='scale'?300:100);
    syncEditor();
    cancelAnimationFrame(artworkFrame);
    artworkFrame=requestAnimationFrame(()=>{if(!disposed)updateArtwork();});
  };
  const onReset = event => {
    if(!event.target.closest('[data-cover-reset]')) return;
    Object.assign(transform,{scale:100,x:0,y:0});syncEditor();updateArtwork();
  };
  editor?.addEventListener('input',onTransform);
  editor?.addEventListener('click',onReset);

  const setModel = device => {
    if (currentModel) {
      scene.remove(currentModel.group);
      currentModel.group.traverse(object => { object.geometry?.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) { material.map?.dispose(); material.dispose(); } } });
    }
    if (device.name === 'iPhone 16 Pro') {
      currentModel = createIphone16ProCase(caseData); scene.add(currentModel.group);
      if (ground) { ground.position.set(0,-.85,-.015); }
      host.dataset.deviceModel = device.name; host.dataset.geometry = 'parametric-16-pro';
      camera.position.set(.85,.36,3.55); controls?.target.copy(target); controls?.update();
      if (artwork) updateArtwork(); render(); return;
    }
    host.dataset.geometry = 'indicative';
    const scale = 1.55 / device.height;
    const width = device.width * scale, height = device.height * scale;
    const caseW = width + .035, caseH = height + .035, depth = .095;
    if (ground) {
      ground.geometry.dispose(); ground.geometry = new THREE.PlaneGeometry(caseW * 1.6, caseH * .18);
      ground.position.set(0, -caseH / 2 - .035, -.015);
    }
    const group = new THREE.Group();
    const bodyGeometry = new THREE.ExtrudeGeometry(roundedShape(caseW, caseH, width * .14), { depth, bevelEnabled: true, bevelSegments: 6, steps: 1, bevelSize: .012, bevelThickness: .009, curveSegments: 16 });
    const body = new THREE.Mesh(bodyGeometry, new THREE.MeshPhysicalMaterial({ color: '#404744', metalness: .28, roughness: .3, clearcoat: .32, clearcoatRoughness: .28 }));
    body.position.z = -depth / 2; body.castShadow = true; body.receiveShadow = true; group.add(body);
    const sideButtonMaterial = new THREE.MeshPhysicalMaterial({ color: '#b5b9b4', metalness: .82, roughness: .23, clearcoat: .4 });
    for (const [x, y, length] of [[-caseW / 2 - .004, height * .3, .075], [-caseW / 2 - .004, height * .21, .075], [caseW / 2 + .004, height * .25, .11]]) {
      const key = new THREE.Mesh(new THREE.CapsuleGeometry(.009, length, 4, 8), sideButtonMaterial);
      key.position.set(x, y, 0); key.castShadow = true; group.add(key);
    }
    const printW = width * .86, printH = height * .91, printZ = depth / 2 + .014;
    const print = panel(printW, printH, width * .12, '#f6f1e8', printZ, { roughness: .57, clearcoat: .2, clearcoatRoughness: .45, side: THREE.DoubleSide });
    print.position.z = printZ; print.userData.aspect = printW / printH; group.add(print);
    const screenW = width * .91, screenH = height * .96;
    const screen = panel(screenW, screenH, width * .12, '#101315', -depth / 2 - .002, { roughness: .19, metalness: .08, side: THREE.DoubleSide });
    screen.rotation.y = Math.PI; screen.position.z = -depth / 2 - .002; group.add(screen);
    const notch = panel(width * .28, height * .035, width * .02, '#050607', -depth / 2 - .004, { roughness: .16, side: THREE.DoubleSide });
    notch.position.set(0, height * .43, -depth / 2 - .004); notch.rotation.y = Math.PI; group.add(notch);
    const speaker = new THREE.Mesh(new THREE.BoxGeometry(width * .19, .008, .003), new THREE.MeshStandardMaterial({ color: '#26292a', roughness: .4 }));
    speaker.position.set(0, -height * .478, -depth / 2); group.add(speaker);
    addCameraModule(group, device, width, height, depth / 2 + .018);
    currentModel = { group, print };
    scene.add(group);
    camera.position.set(.34, .16, Math.max(2.65, caseH * 1.78));
    camera.lookAt(target); controls?.target.copy(target); controls?.update();
    host.dataset.deviceModel = device.name;
    if (artwork) updateArtwork();
    render();
  };
  const onModelChange = () => {
    const device = devices.find(entry => entry.name === select.value);
    if (device) { setModel(device); setStatus(`${device.name} · ${device.name === "iPhone 16 Pro" ? "cover vuota · stampa sul dorso" : "anteprima cover 3D indicativa"}`); }
  };
  const onAction = event => {
    const button = event.target.closest('[data-phone-view]');
    if (!button || !controls) return;
    if (['fit','fill'].includes(button.dataset.phoneView)) {
      fitMode=button.dataset.phoneView==='fit'?'contain':'cover';updateArtwork();
      host.dataset.artworkFit=fitMode;
      host.querySelectorAll('[data-phone-view="fit"],[data-phone-view="fill"]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      return;
    }
    if (button.dataset.phoneView === 'front' || button.dataset.phoneView === 'back') {
      facing = button.dataset.phoneView === 'front';
      const distance = camera.position.distanceTo(controls.target);
      camera.position.set(0, .08, (facing ? -1 : 1) * distance); controls.update(); render();
    } else if (button.dataset.phoneView === 'in' || button.dataset.phoneView === 'out') {
      const factor = button.dataset.phoneView === 'in' ? .83 : 1.2;
      camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); render();
    }
  };
  select.addEventListener('change', onModelChange); host.addEventListener('click', onAction);

  const setArtwork = async item => {
    const currentRequest = ++request;
    setStatus('Aggiornamento della grafica…');
    try {
      const url = new URL(item.original.split('/').map(encodeURIComponent).join('/'), document.baseURI);
      const next = await new THREE.TextureLoader().loadAsync(url.href);
      if (disposed || currentRequest !== request) { next.dispose(); return; }
      const previous = artwork; artwork = next;
      try { updateArtwork(); }
      catch (error) { artwork = previous; next.dispose(); throw error; }
      previous?.dispose();
      host.dataset.artwork = item.id; setStatus(`${select.value} · ${select.value === "iPhone 16 Pro" ? "cover vuota · stampa sul dorso" : "anteprima cover 3D indicativa"}`);
    } catch (error) {
      if (disposed || currentRequest !== request) return;
      setStatus('Immagine non caricata. Riprova o scegli un’altra grafica.'); console.warn('PosterCult cover artwork:', error);
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true; ++request;
    cancelAnimationFrame(artworkFrame);
    editor?.removeEventListener('input',onTransform);editor?.removeEventListener('click',onReset);
    select.removeEventListener('change', onModelChange); host.removeEventListener('click', onAction);
    observer?.disconnect(); caseData?.traverse(node=>{node.geometry?.dispose();node.material?.dispose();}); controls?.dispose(); artwork?.dispose(); environmentTarget?.dispose(); groundTexture?.dispose();
    scene.traverse(object => { object.geometry?.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) { material.map?.dispose(); material.dispose(); } } });
    scene.clear(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
  };
  (async () => {
    try {
      const asset = await new GLTFLoader().loadAsync(new URL('./assets/models/iphone-16-pro-shell.glb?v=shell-2',import.meta.url).href);
      caseData = asset.scene;
      if (disposed) { caseData.traverse(node=>{node.geometry?.dispose();node.material?.dispose();}); return; }
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
      renderer.shadowMap.enabled = false;
      stage.append(renderer.domElement); renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', 'Anteprima interattiva di una cover iPhone. Trascina per ruotare.');
      controls = new OrbitControls(camera, renderer.domElement); controls.enablePan = false; controls.enableDamping = false; controls.minDistance = 1.9; controls.maxDistance = 6; controls.addEventListener('change', render);
      const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
      environmentTarget = pmrem.fromScene(room, .04); scene.environment = environmentTarget.texture; scene.environmentIntensity = .55;
      room.dispose(); pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xfff7e9, 0x555b5d, 1.05));
      for (const [position, intensity] of [[[2, 3, 4], 3.1], [[-3, 1, 2], 1.1], [[0, 2, -3], 1.4]]) { const light = new THREE.DirectionalLight(0xffffff, intensity); light.position.set(...position); scene.add(light); }
      const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
      const shadowContext = shadowCanvas.getContext('2d'), gradient = shadowContext.createRadialGradient(128, 128, 8, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(24,28,25,.20)'); gradient.addColorStop(.42, 'rgba(24,28,25,.09)'); gradient.addColorStop(1, 'rgba(24,28,25,0)');
      shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 256, 256);
      groundTexture = new THREE.CanvasTexture(shadowCanvas);
      ground = new THREE.Mesh(new THREE.PlaneGeometry(.8, .2), new THREE.MeshBasicMaterial({ map: groundTexture, transparent: true, depthWrite: false }));
      ground.rotation.x = -Math.PI / 2; scene.add(ground);
      observer = new ResizeObserver(() => { if (disposed) return; const { width, height } = stage.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); });
      observer.observe(stage);
      const initialModel = devices.find(device => device.name === select.value) || devices[0];
      select.value = initialModel.name; setModel(initialModel);
      await setArtwork(initialItem);
      if (disposed) return;
      controlsPanel.disabled = false; if(editor)editor.disabled=false; host.dataset.state = 'ready';
    } catch (error) {
      if (disposed) return;
      host.dataset.state = 'error'; setStatus('Vista 3D non disponibile. Usa un browser con WebGL 2 e apri il sito via HTTP/HTTPS.'); console.warn('PosterCult iPhone 3D:', error);
    }
  })();
  return { dispose, setArtwork };
}
