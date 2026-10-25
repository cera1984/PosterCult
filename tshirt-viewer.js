import * as THREE from 'three';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from './vendor/three/examples/jsm/geometries/DecalGeometry.js';
import { RoomEnvironment } from './vendor/three/examples/jsm/environments/RoomEnvironment.js';
import { cottonMaterial, garmentTrims, setCottonColor } from './garment-material.js';
import { normalizePrintScale, printDimensions } from './print-layout.js';

const modelUrl = new URL('./assets/models/boxy-shirt.glb?v=fit-scale-1', import.meta.url).href;

// One viewer per open dialog. Every asynchronous completion checks disposal/version.
export function mountTshirtViewer(host, initialItem, { scalePanel } = {}) {
  const status = host.querySelector('[data-viewer-status]');
  const stage = host.querySelector('[data-viewer-stage]');
  const controlsPanel = host.querySelector('[data-viewer-controls]');
  let disposed = false, request = 0, shirt, decal, texture, frontSurface;
  let renderer, controls, observer, trims, environmentTarget, groundTexture;
  let pendingItem = initialItem;
  let printScale = 100, artworkRatio = 1, scaleFrame;
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
    if (decal) { scene.remove(decal); decal.geometry.dispose(); decal.material.dispose(); decal = null; }
    texture?.dispose(); texture = null;
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
    if (button.dataset.view === 'white' || button.dataset.view === 'black') {
      const color = button.dataset.view;
      setCottonColor([shirt, trims], color);
      host.dataset.color = color;
      host.querySelectorAll('[data-view="white"], [data-view="black"]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      render();
    }
  };
  const onContextLost = event => { event.preventDefault(); setStatus('La vista 3D è stata interrotta. Torna a Poster e riapri T-shirt 3D.', 'error'); };

  function rebuildPrint(nextTexture = texture, ratio = artworkRatio) {
    if (!frontSurface || !nextTexture || disposed) return;
    const { width, height } = printDimensions(ratio, printScale);
    const geometry = new DecalGeometry(frontSurface, new THREE.Vector3(0, -.02, .25), new THREE.Euler(), new THREE.Vector3(width, height, 1));
    if (!geometry.attributes.position.count) { geometry.dispose(); throw new Error('Empty print geometry'); }
    if (!decal) {
      const ink = cottonMaterial('ink');
      ink.map = nextTexture; ink.transparent = true; ink.roughness = .91;
      ink.depthWrite = false; ink.polygonOffset = true; ink.polygonOffsetFactor = -4;
      decal = new THREE.Mesh(geometry, ink); decal.receiveShadow = true;
      decal.renderOrder = 1; scene.add(decal);
    } else {
      decal.geometry.dispose(); decal.geometry = geometry; decal.material.map = nextTexture;
    }
    if (texture && texture !== nextTexture) texture.dispose();
    texture = nextTexture; artworkRatio = ratio;
    host.dataset.printScale = String(printScale);
    host.dataset.printWidth = String(width); host.dataset.printHeight = String(height);
    render();
  }

  function setPrintScale(value) {
    printScale = normalizePrintScale(value);
    if (scalePanel) {
      scalePanel.querySelector('input').value = String(printScale);
      scalePanel.querySelector('output').value = `${printScale}%`;
      scalePanel.querySelectorAll('[data-print-scale]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.printScale) === printScale)));
    }
    cancelAnimationFrame(scaleFrame);
    scaleFrame = requestAnimationFrame(() => rebuildPrint());
  }
  const onScaleInput = event => { if (event.target.matches('[data-print-range]')) setPrintScale(event.target.value); };
  const onScaleClick = event => { const button = event.target.closest('[data-print-scale]'); if (button) setPrintScale(button.dataset.printScale); };
  scalePanel?.addEventListener('input', onScaleInput);
  scalePanel?.addEventListener('click', onScaleClick);

  async function setArtwork(item) {
    pendingItem = item;
    const version = ++request;
    if (!shirt) return;
    setStatus('Applicazione della grafica…', 'loading');
    try {
      // Catalog URLs are same-origin, including when hosted in a GitHub Pages subdirectory.
      const url = new URL(item.original.split('/').map(encodeURIComponent).join('/'), document.baseURI);
      const loaded = await new THREE.TextureLoader().loadAsync(url.href);
      if (disposed || version !== request) { loaded.dispose(); return; }
      const image = loaded.image;
      const ratio = image.width / image.height;
      const maxSize = Math.min(2048, renderer.capabilities.maxTextureSize);
      if (Math.max(image.width, image.height) > maxSize) {
        const canvas = document.createElement('canvas');
        const scale = maxSize / Math.max(image.width, image.height);
        canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        loaded.image = canvas;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      loaded.needsUpdate = true;
      try { rebuildPrint(loaded, ratio); } catch (error) { loaded.dispose(); throw error; }
      if (scalePanel) scalePanel.disabled = false;
      host.dataset.artwork = item.id;
      setStatus('Anteprima 3D pronta · stampa sul davanti', 'ready'); render();
    } catch (error) {
      if (disposed || version !== request) return;
      setStatus('Grafica non caricata. Se presente, resta visibile la grafica precedente. Riprova o scegli un’altra immagine.', 'error');
      console.warn('PosterCult artwork:', error);
    }
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true; ++request;
    cancelAnimationFrame(scaleFrame);
    scalePanel?.removeEventListener('input', onScaleInput); scalePanel?.removeEventListener('click', onScaleClick);
    observer?.disconnect(); controls?.dispose();
    host.removeEventListener('click', onAction);
    if (renderer) {
      renderer.domElement.removeEventListener('keydown', onKey);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    }
    releasePrint(); frontSurface?.geometry.dispose(); frontSurface?.material.dispose();
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
      trims = garmentTrims(shirt.geometry); scene.add(trims); setCottonColor([shirt, trims], 'white');
      // Print only on outward-facing front triangles: never bleeds through to the back.
      const source = shirt.geometry.index ? shirt.geometry.toNonIndexed() : shirt.geometry.clone();
      const p = source.attributes.position, n = source.attributes.normal, positions = [], normals = [];
      for (let i = 0; i < p.count; i += 3) {
        if ((n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2)) / 3 < .3) continue;
        if ((p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3 < 0) continue;
        for (let j = i; j < i + 3; j++) { positions.push(p.getX(j), p.getY(j), p.getZ(j)); normals.push(n.getX(j), n.getY(j), n.getZ(j)); }
      }
      source.dispose();
      const frontGeometry = new THREE.BufferGeometry();
      frontGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      frontGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      frontSurface = new THREE.Mesh(frontGeometry, new THREE.MeshBasicMaterial());
      frontSurface.updateMatrixWorld(true);
      controlsPanel.disabled = false;
      host.addEventListener('click', onAction);
      host.dataset.color = 'white';
      await setArtwork(pendingItem);
    } catch (error) {
      if (disposed) return;
      setStatus('Vista 3D non disponibile. Usa un browser con WebGL 2 e apri il sito via HTTP/HTTPS. Poster e originali restano disponibili.', 'error');
      console.warn('PosterCult 3D:', error);
    }
  })();
  return { dispose, setArtwork };
}
