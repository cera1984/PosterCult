import * as THREE from 'three';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';

const devices = [
  ['iPhone 13', 71.5, 146.7, 'standard'], ['iPhone 13 Pro', 71.5, 146.7, 'pro'], ['iPhone 13 Pro Max', 78.1, 160.8, 'pro'],
  ['iPhone 14', 71.5, 146.7, 'standard'], ['iPhone 14 Pro', 71.5, 147.5, 'pro'], ['iPhone 14 Pro Max', 77.6, 160.7, 'pro'],
  ['iPhone 15', 71.6, 147.6, 'standard'], ['iPhone 15 Pro', 70.6, 146.6, 'pro'], ['iPhone 15 Pro Max', 76.7, 159.9, 'pro'],
  ['iPhone 16', 71.6, 147.6, 'standard'], ['iPhone 16 Pro', 71.5, 149.6, 'pro'], ['iPhone 16 Pro Max', 77.6, 163.0, 'pro'],
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

function makeLens(parent, x, y, radius, z) {
  const lens = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshStandardMaterial({ color: '#111719', roughness: .18, metalness: .22 }));
  lens.position.set(x, y, z); parent.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * .48, 20), new THREE.MeshBasicMaterial({ color: '#213449' }));
  glass.position.set(x - radius * .15, y + radius * .16, z + .001); parent.add(glass);
}

function addCameraModule(group, device, width, height, z) {
  const wide = device.camera === 'wide-pro';
  const pro = device.camera !== 'standard';
  const moduleW = width * (wide ? .59 : pro ? .39 : .36);
  const moduleH = height * (wide ? .19 : pro ? .24 : .20);
  const x = -width * .28, y = height * .33;
  const module = panel(moduleW, moduleH, moduleW * .16, '#e6e2d8', z, { roughness: .48 });
  module.position.x = x; module.position.y = y; group.add(module);
  const lensRadius = moduleW * (wide ? .115 : .19);
  const offsets = wide
    ? [[-.28, .22], [.03, .22], [.34, .22]]
    : pro ? [[-.25, .25], [.25, .25], [-.25, -.25]] : [[-.24, .24], [.24, -.24]];
  for (const [dx, dy] of offsets) makeLens(group, x + dx * moduleW, y + dy * moduleH, lensRadius, z + .004);
  const flash = new THREE.Mesh(new THREE.CircleGeometry(moduleW * .045, 16), new THREE.MeshBasicMaterial({ color: '#faf3d6' }));
  flash.position.set(x + moduleW * .33, y - moduleH * .27, z + .004); group.add(flash);
}

function fitArtwork(texture, aspect) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  const sourceAspect = texture.image.width / texture.image.height;
  if (sourceAspect > aspect) {
    const repeatX = aspect / sourceAspect;
    texture.repeat.set(repeatX, 1); texture.offset.set((1 - repeatX) / 2, 0);
  } else {
    const repeatY = sourceAspect / aspect;
    texture.repeat.set(1, repeatY); texture.offset.set(0, (1 - repeatY) / 2);
  }
  texture.needsUpdate = true;
}

export function mountPhoneCaseViewer(host, initialItem) {
  const stage = host.querySelector('[data-phonecase-stage]');
  const status = host.querySelector('[data-phonecase-status]');
  const controlsPanel = host.querySelector('[data-phonecase-controls]');
  const select = host.querySelector('[data-iphone-model]');
  select.replaceChildren(...devices.map(device => new Option(device.name, device.name)));
  let disposed = false, renderer, controls, observer, artwork, request = 0, currentModel, facing = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e5e4da');
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 30);
  camera.position.set(.15, .22, 3.15);
  const target = new THREE.Vector3(0, 0, 0);
  const setStatus = message => { if (!disposed) status.textContent = message; };
  const render = () => { if (!disposed && renderer) renderer.render(scene, camera); };
  const updateArtwork = () => {
    if (!currentModel?.print || !artwork) return;
    const texture = new THREE.Texture(artwork.image);
    fitArtwork(texture, currentModel.print.userData.aspect);
    const previous = currentModel.print.material.map;
    currentModel.print.material.map = texture; currentModel.print.material.needsUpdate = true;
    previous?.dispose(); render();
  };
  const setModel = device => {
    if (currentModel) {
      scene.remove(currentModel.group);
      currentModel.group.traverse(object => { object.geometry?.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) material.dispose(); } });
    }
    const scale = 1.55 / device.height;
    const width = device.width * scale, height = device.height * scale;
    const caseW = width + .035, caseH = height + .035, depth = .095;
    const group = new THREE.Group();
    const bodyGeometry = new THREE.ExtrudeGeometry(roundedShape(caseW, caseH, width * .13), { depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .009, bevelThickness: .008, curveSegments: 10 });
    const body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({ color: '#282c2c', metalness: .14, roughness: .32 }));
    body.position.z = -depth / 2; body.castShadow = true; body.receiveShadow = true; group.add(body);
    const printW = width * .86, printH = height * .91, printZ = depth / 2 + .014;
    const print = panel(printW, printH, width * .12, '#f6f1e8', printZ, { roughness: .86, side: THREE.DoubleSide });
    print.position.z = printZ; print.userData.aspect = printW / printH; group.add(print);
    const screenW = width * .91, screenH = height * .96;
    const screen = panel(screenW, screenH, width * .12, '#101315', -depth / 2 - .002, { roughness: .19, metalness: .08, side: THREE.DoubleSide });
    screen.rotation.y = Math.PI; screen.position.z = -depth / 2 - .002; group.add(screen);
    const notch = panel(width * .3, height * .035, width * .02, '#080a0b', -depth / 2 - .004, { roughness: .18, side: THREE.DoubleSide });
    notch.position.set(0, height * .43, -depth / 2 - .004); notch.rotation.y = Math.PI; group.add(notch);
    addCameraModule(group, device, width, height, depth / 2 + .018);
    currentModel = { group, print };
    scene.add(group);
    camera.position.set(.12, .15, Math.max(2.65, caseH * 1.75));
    camera.lookAt(target); controls?.target.copy(target); controls?.update();
    host.dataset.deviceModel = device.name;
    if (artwork) updateArtwork();
    render();
  };
  const onModelChange = () => {
    const device = devices.find(entry => entry.name === select.value);
    if (device) { setModel(device); setStatus(`${device.name} · anteprima cover 3D indicativa`); }
  };
  const onAction = event => {
    const button = event.target.closest('[data-phone-view]');
    if (!button || !controls) return;
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
      host.dataset.artwork = item.id; setStatus(`${select.value} · anteprima cover 3D indicativa`);
    } catch (error) {
      if (disposed || currentRequest !== request) return;
      setStatus('Immagine non caricata. Riprova o scegli un’altra grafica.'); console.warn('PosterCult cover artwork:', error);
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true; ++request;
    select.removeEventListener('change', onModelChange); host.removeEventListener('click', onAction);
    observer?.disconnect(); controls?.dispose(); artwork?.dispose();
    scene.traverse(object => { object.geometry?.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) material.dispose(); } });
    scene.clear(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
  };
  (async () => {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
      stage.append(renderer.domElement); renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('role', 'img'); renderer.domElement.setAttribute('aria-label', 'Anteprima interattiva di una cover iPhone. Trascina per ruotare.');
      controls = new OrbitControls(camera, renderer.domElement); controls.enablePan = false; controls.enableDamping = false; controls.minDistance = 1.9; controls.maxDistance = 6; controls.addEventListener('change', render);
      scene.add(new THREE.HemisphereLight(0xfff7e9, 0x555b5d, 1.25));
      for (const [position, intensity] of [[[2, 3, 4], 2.8], [[-3, 1, 2], .9], [[0, 2, -3], 1.2]]) { const light = new THREE.DirectionalLight(0xffffff, intensity); light.position.set(...position); scene.add(light); }
      observer = new ResizeObserver(() => { if (disposed) return; const { width, height } = stage.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(); });
      observer.observe(stage);
      const initialModel = devices.find(device => device.name === select.value) || devices[0];
      select.value = initialModel.name; setModel(initialModel);
      await setArtwork(initialItem);
      if (disposed) return;
      controlsPanel.disabled = false; host.dataset.state = 'ready';
    } catch (error) {
      if (disposed) return;
      host.dataset.state = 'error'; setStatus('Vista 3D non disponibile. Usa un browser con WebGL 2 e apri il sito via HTTP/HTTPS.'); console.warn('PosterCult iPhone 3D:', error);
    }
  })();
  return { dispose, setArtwork };
}
