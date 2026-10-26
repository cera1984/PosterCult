import * as THREE from 'three';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from './vendor/three/examples/jsm/geometries/DecalGeometry.js';
import { RoomEnvironment } from './vendor/three/examples/jsm/environments/RoomEnvironment.js';
import { cottonMaterial, garmentTrims, setCottonColor } from './garment-material.js?v=catalog-restore-1';
import { GARMENT_COLORS } from './garment-palette.js';
import { printDimensions } from './print-layout.js';
import { prepareHoodieModel, prepareStudioHoodieModel } from './hoodie-model.js?v=studio-hoodie-1';
import { normalizeLayerConfig, normalizeCompositions } from './print-compositions.js?v=editor-hoodie-2';

const modelUrl = new URL('./assets/models/boxy-shirt.glb?v=fit-scale-1', import.meta.url).href;
const hoodieModelUrl = new URL('./assets/models/premium-eco-hoodie.glb?v=hoodie-premium-1', import.meta.url).href;
const studioHoodieModelUrl = new URL('./assets/models/hoodie-yogaminggames.glb?v=hoodie-yogaminggames-1', import.meta.url).href;

// One viewer per open dialog. Every asynchronous completion checks disposal/version.
export function mountTshirtViewer(host, initialItem, { editorPanel, compositionPanel } = {}) {
  const status = host.querySelector('[data-viewer-status]');
  const stage = host.querySelector('[data-viewer-stage]');
  const controlsPanel = host.querySelector('[data-viewer-controls]');
  let disposed = false, shirt, frontSurface, backSurface, hoodieDetails, hoodieBodyMeshes = [], hoodieFrontSurface, hoodieBackSurface;
  let studioHoodieDetails, studioHoodieFrontSurface, studioHoodieBackSurface, studioHoodiePromise;
  let garment = 'tshirt';
  let layers = [], selectedLayer = null, layerSequence = 0;
  let renderer, controls, observer, trims, environmentTarget, groundTexture;
  let pendingItem = initialItem;
  let editorReady = false;
  let framingDistance = 4.45;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  camera.position.set(0, 0.05, 4.45);
  const setStatus = (message, state) => {
    if (disposed) return;
    status.textContent = message;
    host.dataset.state = state;
  };
  const releasePrint = () => {
    for (const layer of layers) { scene.remove(layer.mesh); layer.mesh.geometry?.dispose(); layer.mesh.material?.dispose(); layer.texture?.dispose(); }
    layers = []; selectedLayer = null;
  };
  const render = () => {
    if (disposed || !renderer) return;
    renderer.render(scene, camera);
    stage.dataset.azimuth = controls.getAzimuthalAngle().toFixed(3);
    stage.dataset.distance = camera.position.distanceTo(controls.target).toFixed(3);
  };
  const setView = (back = false) => {
    const distance = camera.position.distanceTo(controls.target);
    camera.position.set(0, 0.05, back ? -distance : distance);
    controls.target.set(0, 0.05, 0); controls.update(); render();
  };
  const zoom = (factor) => {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset); controls.update(); render();
  };
  const onKey = event => {
    if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); zoom(event.key === '-' ? 1.15 : 1 / 1.15); }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta += event.key === 'ArrowLeft' ? -.15 : event.key === 'ArrowRight' ? .15 : 0;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -.15 : event.key === 'ArrowDown' ? .15 : 0), .25, Math.PI - .25);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); render();
    }
  };
  const onAction = event => {
    const button = event.target.closest('[data-view]');
    if (!button || !controls) return;
    if (button.dataset.view === 'front') setView();
    if (button.dataset.view === 'back') setView(true);
    if (button.dataset.view === 'in') zoom(1 / 1.15);
    if (button.dataset.view === 'out') zoom(1.15);
    if (Object.hasOwn(GARMENT_COLORS, button.dataset.view)) {
      const color = button.dataset.view;
      setCottonColor([shirt, trims, hoodieDetails, studioHoodieDetails], color);
      host.dataset.color = color;
      host.querySelectorAll('[data-view="white"], [data-view="black"], [data-view="grey"], [data-view="vintage"]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      render();
    }
  };
  const makeSurfaceFor = (sourceMeshes, front) => {
    const positions = [], normals = [];
    for (const sourceMesh of sourceMeshes) {
      sourceMesh.updateWorldMatrix(true, false);
      const sourceGeometry = sourceMesh.geometry.index ? sourceMesh.geometry.toNonIndexed() : sourceMesh.geometry.clone();
      sourceGeometry.applyMatrix4(sourceMesh.matrixWorld);
      const p = sourceGeometry.attributes.position, n = sourceGeometry.attributes.normal;
      for (let i = 0; i < p.count; i += 3) {
        const nz = (n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2)) / 3;
        const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        if (front ? nz < .3 || z < 0 : nz > -.3 || z > 0) continue;
        for (let j = i; j < i + 3; j++) { positions.push(p.getX(j), p.getY(j), p.getZ(j)); normals.push(n.getX(j), n.getY(j), n.getZ(j)); }
      }
      sourceGeometry.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()); mesh.updateMatrixWorld(true); return mesh;
  };
  const ensureStudioHoodie = () => {
    if (!studioHoodiePromise) studioHoodiePromise = (async () => {
      const gltf = await new GLTFLoader().loadAsync(studioHoodieModelUrl);
      if (disposed) { gltf.scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); return; }
      const model = prepareStudioHoodieModel(gltf);
      studioHoodieDetails = model.group; studioHoodieDetails.visible = false; scene.add(studioHoodieDetails);
      setCottonColor([shirt, trims, hoodieDetails, studioHoodieDetails], host.dataset.color || 'white');
      studioHoodieFrontSurface = makeSurfaceFor(model.bodyMeshes, true);
      studioHoodieBackSurface = makeSurfaceFor(model.bodyMeshes, false);
      return studioHoodieDetails;
    })();
    return studioHoodiePromise;
  };
  const onGarmentChange = async event => {
    if (!event.target.matches('[data-garment-select]')) return;
    garment = event.target.value;
    host.dataset.garment = garment;
    if (hoodieDetails) hoodieDetails.visible = garment === 'hoodie';
    if (studioHoodieDetails) studioHoodieDetails.visible = garment === 'hoodie-alt';
    if (shirt) shirt.visible = garment === 'tshirt';
    if (trims) trims.visible = garment === 'tshirt';
    const garmentName = garment === 'hoodie' ? 'Premium Eco Hoodie' : garment === 'hoodie-alt' ? 'Felpa Yogaminggames' : 'T-shirt boxy';
    renderer.domElement.setAttribute('aria-label', `${garmentName} 3D. Frecce per ruotare; più e meno per zoomare.`);
    if (garment === 'hoodie-alt' && !studioHoodieDetails) {
      setStatus('Caricamento della felpa…', 'loading');
      try {
        await ensureStudioHoodie();
        if (disposed || garment !== 'hoodie-alt') return;
        studioHoodieDetails.visible = true;
      } catch (error) {
        if (!disposed) setStatus('Felpa non caricata. Riprova o seleziona un altro capo.', 'error');
        console.warn('PosterCult hoodie model:', error); return;
      }
    }
    for (const layer of layers) updateLayer(layer);
    const dialogLabel = host.closest('#dialog-content')?.querySelector('.dialog-label');
    if (dialogLabel) dialogLabel.textContent = garment === 'hoodie' ? 'PREMIUM ECO HOODIE · MODELLO 3D' : garment === 'hoodie-alt' ? 'FELPA YOGAMINGGAMES · MODELLO 3D' : 'T-SHIRT BOXY · MODELLO 3D';
    updateCompositionsList();
    setStatus(`${garmentName} · modello 3D`, 'ready');
    render();
  };
  const onContextLost = event => { event.preventDefault(); setStatus('La vista 3D è stata interrotta. Torna a Poster e riapri T-shirt 3D.', 'error'); };

  const storageKey = 'postercult-print-compositions-v1';
  const readCompositions = () => {
    try { return normalizeCompositions(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
    catch { return Object.create(null); }
  };
  const saveCompositions = value => {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); return true; }
    catch { setStatus('Impossibile salvare: lo spazio locale del browser non è disponibile.', 'error'); return false; }
  };
  const selected = () => layers.find(layer => layer.id === selectedLayer);
  const serialize = () => ({ garment, color: host.dataset.color || 'white', layers: layers.map(layer => ({ itemId: layer.item.id, ...normalizeLayerConfig(layer) })) });

  function syncCompositionControls() {
    if (!compositionPanel) return;
    const key = compositionPanel.querySelector('[data-composition-list]').value;
    compositionPanel.querySelector('[data-composition-save]').disabled = !editorReady || !layers.length || layers.some(layer => layer.loading);
    compositionPanel.querySelector('[data-composition-load]').disabled = !editorReady || !key;
    compositionPanel.querySelector('[data-composition-delete]').disabled = !editorReady || !key;
  }
  function syncLayerSelect() {
    host.dataset.layerCount = String(layers.length);
    syncCompositionControls();
    const layer = selected();
    if (layer?.texture) {
      const { width, height } = printDimensions(layer.texture.image.width / layer.texture.image.height, layer.scale);
      host.dataset.artwork = layer.item.id;
      host.dataset.printScale = String(layer.scale);
      host.dataset.printWidth = String(width);
      host.dataset.printHeight = String(height);
    } else {
      delete host.dataset.artwork;
      delete host.dataset.printScale;
    }
    if (!editorPanel) return;
    const select = editorPanel.querySelector('[data-layer-select]');
    select.replaceChildren(...layers.map((entry, i) => {
      const option = document.createElement('option'); option.value = entry.id;
      option.textContent = `${i + 1}. ${entry.item.film} — ${entry.item.filename} (${entry.side === 'front' ? 'fronte' : 'retro'})`;
      return option;
    }));
    select.value = selectedLayer || '';
    select.disabled = !editorReady || !layer;
    editorPanel.querySelector('[data-layer-add]').disabled = !editorReady;
    editorPanel.dataset.disabled = String(!editorReady || !layer);
    editorPanel.querySelectorAll('[data-transform], [data-layer-side], [data-layer-flip], [data-layer-remove], [data-print-scale]').forEach(el => { el.disabled = !editorReady || !layer; });
    if (!layer) return;
    const catalogSelect = host.closest('#dialog-content')?.querySelector('#tshirt-artwork');
    if (catalogSelect) catalogSelect.value = (layer.pendingItem || layer.item).id;
    editorPanel.querySelector('[data-layer-side]').value = layer.side;
    editorPanel.querySelector('[data-layer-flip]').setAttribute('aria-pressed', String(layer.flip));
    for (const key of ['x', 'y', 'scale', 'rotation', 'crop']) {
      editorPanel.querySelector(`[data-transform="${key}"]`).value = String(layer[key]);
      editorPanel.querySelector(`[data-out="${key}"]`).value = key === 'scale' || key === 'crop' ? `${layer[key]}%` : key === 'rotation' ? `${layer[key]}°` : String(layer[key]);
    }
    editorPanel.querySelectorAll('[data-print-scale]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.printScale) === layer.scale)));
  }
  function updateLayer(layer) {
    const target = garment === 'hoodie-alt'
      ? (layer.side === 'front' ? studioHoodieFrontSurface : studioHoodieBackSurface)
      : garment === 'hoodie'
        ? (layer.side === 'front' ? hoodieFrontSurface : hoodieBackSurface)
        : (layer.side === 'front' ? frontSurface : backSurface);
    if (!target || !layer.texture) return;
    const { width, height } = printDimensions(layer.texture.image.width / layer.texture.image.height, layer.scale);
    const center = new THREE.Vector3(layer.x * .0048, -.02 - layer.y * .0042, layer.side === 'front' ? .25 : -.25);
    const rotation = new THREE.Euler(0, layer.side === 'front' ? 0 : Math.PI, THREE.MathUtils.degToRad(layer.rotation));
    const geometry = new DecalGeometry(target, center, rotation, new THREE.Vector3(width, height, 1));
    layer.mesh.geometry.dispose(); layer.mesh.geometry = geometry;
    const repeatX = (layer.flip ? -1 : 1) * 100 / layer.crop, repeatY = 100 / layer.crop;
    layer.texture.repeat.set(repeatX, repeatY);
    layer.texture.offset.set(.5 - repeatX / 2, .5 - repeatY / 2);
    layer.texture.needsUpdate = true;
    render();
  }
  function updateCompositionsList(preferredKey = '') {
    if (!compositionPanel) return;
    const select = compositionPanel.querySelector('[data-composition-list]');
    const entries = Object.keys(readCompositions()).filter(key => key.startsWith(`${garment}:`));
    select.replaceChildren(...(entries.length ? entries.map(key => {
      const option = document.createElement('option'); option.value = key; option.textContent = key.slice(garment.length + 1); return option;
    }) : [new Option('Nessuna composizione salvata', '')]));
    if (entries.includes(preferredKey)) select.value = preferredKey;
    syncCompositionControls();
  }
  async function loadLayerArtwork(layer, item) {
    const version = ++layer.request;
    layer.pendingItem = item; layer.loading = true;
    setStatus('Applicazione della grafica…', 'loading'); syncLayerSelect();
    let loaded;
    try {
      const url = new URL(item.original.split('/').map(encodeURIComponent).join('/'), document.baseURI);
      loaded = await new THREE.TextureLoader().loadAsync(url.href);
      if (disposed || !layers.includes(layer) || version !== layer.request) { loaded.dispose(); return; }
      const image = loaded.image, maxSize = Math.min(2048, renderer.capabilities.maxTextureSize);
      if (Math.max(image.width, image.height) > maxSize) {
        const canvas = document.createElement('canvas'), factor = maxSize / Math.max(image.width, image.height);
        canvas.width = Math.max(1, Math.round(image.width * factor)); canvas.height = Math.max(1, Math.round(image.height * factor));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); loaded.image = canvas;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); loaded.needsUpdate = true;
      const previousTexture = layer.texture, previousItem = layer.item;
      layer.texture = loaded; layer.item = item;
      layer.mesh.material.map = loaded; layer.mesh.material.needsUpdate = true;
      try { updateLayer(layer); }
      catch (error) {
        layer.texture = previousTexture; layer.item = previousItem; layer.mesh.material.map = previousTexture;
        layer.mesh.material.needsUpdate = true; throw error;
      }
      previousTexture?.dispose();
      layer.loading = false; layer.pendingItem = null; syncLayerSelect();
      setStatus(layers.some(entry => entry.loading) ? 'Caricamento delle grafiche…' : `${layers.length} ${layers.length === 1 ? 'grafica pronta' : 'grafiche pronte'} · fronte e retro modificabili`, layers.some(entry => entry.loading) ? 'loading' : 'ready');
    } catch (error) {
      loaded?.dispose();
      if (disposed || !layers.includes(layer) || version !== layer.request) return;
      layer.loading = false; layer.pendingItem = null; syncLayerSelect();
      setStatus('Grafica non caricata. Se presente, resta visibile la grafica precedente. Riprova o scegli un’altra immagine.', 'error');
      console.warn('PosterCult artwork:', error);
    }
  }
  function updateLayerOrder() {
    layers.forEach((layer, i) => { layer.mesh.renderOrder = i + 1; layer.mesh.material.polygonOffsetFactor = -4 - i; });
  }
  function addLayer(item, config = {}) {
    const layer = { id: `layer-${++layerSequence}`, item, ...normalizeLayerConfig(config), texture: null, request: 0, loading: false, pendingItem: null };
    const ink = cottonMaterial('ink'); ink.transparent = true; ink.roughness = .91; ink.depthWrite = false; ink.polygonOffset = true;
    layer.mesh = new THREE.Mesh(new THREE.BufferGeometry(), ink); scene.add(layer.mesh);
    layers.push(layer); selectedLayer = layer.id; updateLayerOrder(); syncLayerSelect();
    return loadLayerArtwork(layer, item);
  }
  function removeLayer(id) {
    const index = layers.findIndex(layer => layer.id === id); if (index < 0) return;
    const [layer] = layers.splice(index, 1); ++layer.request;
    scene.remove(layer.mesh); layer.mesh.geometry.dispose(); layer.mesh.material.dispose(); layer.texture?.dispose();
    selectedLayer = layers[Math.max(0, index - 1)]?.id || null;
    updateLayerOrder(); syncLayerSelect(); render();
    const loading = layers.some(entry => entry.loading);
    setStatus(loading ? 'Caricamento delle grafiche…' : layers.length ? 'Grafica rimossa.' : 'Aggiungi una grafica dal catalogo.', loading ? 'loading' : 'ready');
  }
  function setArtwork(item) {
    pendingItem = item;
    if (!editorReady) return;
    const layer = selected();
    return layer ? loadLayerArtwork(layer, item) : addLayer(item);
  }
  function onEditorInput(event) {
    const layer = selected(); if (!editorReady || !layer) return;
    const key = event.target.dataset.transform;
    if (key) { Object.assign(layer, normalizeLayerConfig({ ...layer, [key]: Number(event.target.value) })); syncLayerSelect(); updateLayer(layer); }
    if (event.target.matches('[data-layer-side]')) { layer.side = event.target.value; syncLayerSelect(); setView(layer.side === 'back'); updateLayer(layer); }
  }
  function onEditorClick(event) {
    const button = event.target.closest('button'); if (!button || !editorReady) return;
    if (button.matches('[data-layer-add]')) { addLayer(pendingItem); return; }
    if (button.matches('[data-layer-remove]')) { removeLayer(selectedLayer); return; }
    if (button.matches('[data-layer-flip]')) { const layer = selected(); if (layer) { layer.flip = !layer.flip; syncLayerSelect(); updateLayer(layer); } return; }
    if (button.matches('[data-print-scale]')) { const layer = selected(); if (layer) { layer.scale = Number(button.dataset.printScale); syncLayerSelect(); updateLayer(layer); } return; }
    if (button.matches('[data-composition-save]')) {
      const name = compositionPanel.querySelector('[data-composition-name]').value.trim().slice(0, 120);
      if (!name) { setStatus('Scrivi un nome per salvare la composizione.', 'ready'); return; }
      const all = readCompositions(), key = `${garment}:${name}`; all[key] = serialize();
      if (saveCompositions(all)) { updateCompositionsList(key); setStatus(`Composizione “${name}” salvata su questo dispositivo.`, 'ready'); }
      return;
    }
    if (button.matches('[data-composition-load]')) {
      const key = compositionPanel.querySelector('[data-composition-list]').value, config = readCompositions()[key];
      if (!config || config.garment !== garment) return;
      const catalog = new Map((window.POSTERZ_IMAGES || []).map(item => [item.id, item]));
      const restored = config.layers.filter(saved => catalog.has(saved.itemId));
      releasePrint(); syncLayerSelect(); host.dataset.color = config.color;
      setCottonColor([shirt, trims, hoodieDetails], config.color);
      host.querySelectorAll('[data-view="white"], [data-view="black"], [data-view="grey"], [data-view="vintage"]').forEach(entry => entry.setAttribute('aria-pressed', String(entry.dataset.view === config.color)));
      compositionPanel.querySelector('[data-composition-name]').value = key.slice(garment.length + 1);
      const requests = restored.map(saved => addLayer(catalog.get(saved.itemId), saved));
      const selectedAfterRestore = selectedLayer;
      Promise.all(requests).then(() => {
        if (disposed || selectedLayer !== selectedAfterRestore) return;
        syncLayerSelect(); render();
        if (restored.length < config.layers.length) setStatus('Composizione aperta. Alcune grafiche non sono più nel catalogo.', 'ready');
        else if (!restored.length) setStatus('Composizione vuota.', 'ready');
      });
      if (restored.length) setView(restored.at(-1).side === 'back');
      render(); return;
    }
    if (button.matches('[data-composition-delete]')) {
      const select = compositionPanel.querySelector('[data-composition-list]'), all = readCompositions();
      delete all[select.value];
      if (saveCompositions(all)) { updateCompositionsList(); setStatus('Composizione eliminata dal dispositivo.', 'ready'); }
    }
  }
  function onSelectLayer(event) {
    selectedLayer = event.target.value;
    const layer = selected(); if (layer) { pendingItem = layer.pendingItem || layer.item; setView(layer.side === 'back'); }
    syncLayerSelect();
  }
  const onCompositionChange = () => syncCompositionControls();
  editorPanel?.addEventListener('input', onEditorInput); editorPanel?.addEventListener('change', onEditorInput);
  editorPanel?.addEventListener('click', onEditorClick); editorPanel?.querySelector('[data-layer-select]')?.addEventListener('change', onSelectLayer);
  compositionPanel?.addEventListener('click', onEditorClick); compositionPanel?.addEventListener('change', onCompositionChange);
  updateCompositionsList(); syncLayerSelect();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    editorPanel?.removeEventListener('input', onEditorInput); editorPanel?.removeEventListener('change', onEditorInput); editorPanel?.removeEventListener('click', onEditorClick); editorPanel?.querySelector('[data-layer-select]')?.removeEventListener('change', onSelectLayer); compositionPanel?.removeEventListener('click', onEditorClick); compositionPanel?.removeEventListener('change', onCompositionChange);
    observer?.disconnect(); controls?.dispose();
    host.removeEventListener('click', onAction);
    host.removeEventListener('change', onGarmentChange);
    if (renderer) {
      renderer.domElement.removeEventListener('keydown', onKey);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    }
    releasePrint();
    for (const surface of [frontSurface, backSurface, hoodieFrontSurface, hoodieBackSurface, studioHoodieFrontSurface, studioHoodieBackSurface]) { surface?.geometry.dispose(); surface?.material.dispose(); }
    scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    environmentTarget?.dispose();
    groundTexture?.dispose();
    scene.clear(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
  };

  (async () => {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
      environmentTarget = pmrem.fromScene(room, .04);
      scene.environment = environmentTarget.texture; scene.environmentIntensity = .4;
      room.dispose(); pmrem.dispose();
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.setAttribute('aria-label', 'T-shirt 3D. Frecce per ruotare; più e meno per zoomare.');
      renderer.domElement.addEventListener('keydown', onKey);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      stage.append(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false; controls.enableDamping = false;
      controls.minDistance = 2.2; controls.maxDistance = 8;
      controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI - .25;
      controls.target.set(0, .05, 0); controls.update(); controls.addEventListener('change', render);
      scene.add(new THREE.HemisphereLight(0xfff8ee, 0x555c61, .85));
      for (const [position, intensity] of [[[-2.5, 3, 3], 3.2], [[3, .5, 2], .6], [[2, 2, -3], 2]]) {
        const light = new THREE.DirectionalLight(0xffffff, intensity); light.position.set(...position); scene.add(light);
        if (intensity === 3.2) {
          light.castShadow = true; light.shadow.mapSize.set(2048, 2048);
          Object.assign(light.shadow.camera, { left: -1.4, right: 1.4, top: 1.3, bottom: -1.3, near: .1, far: 10 });
          light.shadow.normalBias = .008; light.shadow.bias = -.0001;
        }
      }
      const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
      const shadowContext = shadowCanvas.getContext('2d'), gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(30,32,30,.24)'); gradient.addColorStop(.45, 'rgba(30,32,30,.12)'); gradient.addColorStop(1, 'rgba(30,32,30,0)');
      shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
      groundTexture = new THREE.CanvasTexture(shadowCanvas);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.25), new THREE.MeshBasicMaterial({ map: groundTexture, transparent: true, depthWrite: false }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -.88; scene.add(ground);
      observer = new ResizeObserver(() => {
        if (disposed) return;
        const { width, height } = stage.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false); camera.aspect = width / height;
        // Keep the initial garment within 70% of the viewport width, even in tall dialogs.
        // Preserve the user's relative zoom when the viewport changes.
        const nextFraming = Math.max(4.45, 1.78 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * .70));
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(THREE.MathUtils.clamp(offset.length() * nextFraming / framingDistance, controls.minDistance, controls.maxDistance));
        camera.position.copy(controls.target).add(offset); framingDistance = nextFraming;
        camera.updateProjectionMatrix(); controls.update(); render();
      });
      observer.observe(stage);
      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      if (disposed) { gltf.scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); return; }
      gltf.scene.traverse(object => { if (object.isMesh && !shirt) shirt = object; });
      if (!shirt?.geometry.attributes.uv) throw new Error('Model or UV missing');
      shirt.material.dispose();
      shirt.material = cottonMaterial(); shirt.castShadow = true; shirt.receiveShadow = true;
      scene.add(shirt); shirt.updateMatrixWorld(true);
      trims = garmentTrims(shirt.geometry); scene.add(trims);
      // Separate front and back targets keep prints attached to the selected garment.
      const makeSurface = (sourceMeshes, front) => {
        const positions = [], normals = [];
        for (const sourceMesh of sourceMeshes) {
          sourceMesh.updateWorldMatrix(true, false);
          const sourceGeometry = sourceMesh.geometry;
          const source = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
          source.applyMatrix4(sourceMesh.matrixWorld);
          const p = source.attributes.position, n = source.attributes.normal;
          for (let i = 0; i < p.count; i += 3) {
            const nz = (n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2)) / 3;
            const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
            if (front ? nz < .3 || z < 0 : nz > -.3 || z > 0) continue;
            for (let j = i; j < i + 3; j++) { positions.push(p.getX(j), p.getY(j), p.getZ(j)); normals.push(n.getX(j), n.getY(j), n.getZ(j)); }
          }
          source.dispose();
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()); mesh.updateMatrixWorld(true); return mesh;
      };
      frontSurface = makeSurface([shirt], true); backSurface = makeSurface([shirt], false);
      const hoodieGltf = await new GLTFLoader().loadAsync(hoodieModelUrl);
      if (disposed) { hoodieGltf.scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); return; }
      const hoodieModel = prepareHoodieModel(hoodieGltf);
      hoodieDetails = hoodieModel.group; hoodieBodyMeshes = hoodieModel.bodyMeshes;
      hoodieDetails.visible = false; scene.add(hoodieDetails);
      setCottonColor([shirt, trims, hoodieDetails], 'white');
      hoodieFrontSurface = makeSurface(hoodieBodyMeshes, true); hoodieBackSurface = makeSurface(hoodieBodyMeshes, false);
      controlsPanel.disabled = false; editorReady = true; editorPanel?.removeAttribute('data-disabled'); syncLayerSelect();
      host.addEventListener('click', onAction);
      host.addEventListener('change', onGarmentChange);
      host.dataset.color = 'white'; host.dataset.garment = garment;
      await addLayer(pendingItem);
    } catch (error) {
      if (disposed) return;
      setStatus('Vista 3D non disponibile. Usa un browser con WebGL 2 e apri il sito via HTTP/HTTPS. Poster e originali restano disponibili.', 'error');
      console.warn('PosterCult 3D:', error);
    }
  })();
  return { dispose, setArtwork };
}
