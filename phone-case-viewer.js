import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { createPhoneCase } from './iphone-16-pro-geometry.js?v=all-shells-1';
import { PHONE_CASE_MODELS as devices } from './phone-case-models.js';
import { RoomEnvironment } from './vendor/three/examples/jsm/environments/RoomEnvironment.js';

export function mountPhoneCaseViewer(host, initialItem, { editor } = {}) {
  const stage = host.querySelector('[data-phonecase-stage]');
  const status = host.querySelector('[data-phonecase-status]');
  const controlsPanel = host.querySelector('[data-phonecase-controls]');
  const select = host.querySelector('[data-iphone-model]');
  select.replaceChildren(...devices.map(device => new Option(device.name, device.name)));
  select.value = 'iPhone 16 Pro';
  let fitMode = "cover", artworkFrame, modelRequest = 0;
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

  const releaseAsset = root => {
    root?.traverse(object => {
      object.geometry?.dispose();
      if(object.material) for(const material of Array.isArray(object.material)?object.material:[object.material]) {material.map?.dispose();material.dispose();}
    });
  };
  const modelStatus = () => (currentModel?.device.name || select.value)+' · cover vuota · stampa sul dorso';
  const setModel = async device => {
    const version=++modelRequest;
    host.dataset.modelLoading=device.name;
    setStatus('Caricamento cover '+device.name+'…');
    try {
      const asset=await new GLTFLoader().loadAsync(new URL(device.asset,import.meta.url).href);
      if(disposed || version!==modelRequest) {releaseAsset(asset.scene);return false;}
      let next;
      try {next=createPhoneCase(asset.scene,device);} finally {releaseAsset(asset.scene);}
      if(currentModel) {scene.remove(currentModel.group);releaseAsset(currentModel.group);}
      currentModel={...next,device};scene.add(currentModel.group);
      if(ground) {ground.geometry.dispose();ground.geometry=new THREE.PlaneGeometry((device.width+3.6)*1.55/device.height*1.6,.28);ground.position.set(0,-.85,-.015);}
      host.dataset.deviceModel=device.name;host.dataset.geometry='shell-3d';host.dataset.cameraLayout=device.layout;
      delete host.dataset.modelLoading;
      camera.position.set(.85,.36,3.55);controls.target.copy(target);controls.update();
      if(artwork) {updateArtwork();host.dataset.state='ready';}
      setStatus(modelStatus());render();return true;
    } catch(error) {
      if(disposed || version!==modelRequest)return false;
      delete host.dataset.modelLoading;
      if(currentModel) {select.value=currentModel.device.name;host.dataset.state='ready';setStatus('Cover '+device.name+' non caricata. Rimane visibile '+currentModel.device.name+'. Riprova scegliendo il modello.');}
      else {host.dataset.state='error';setStatus('Modello cover non caricato. Torna a Poster e riapri la cover per riprovare.');}
      console.warn('PosterCult cover model:',error);return false;
    }
  };
  const onModelChange = () => {
    const device=devices.find(entry=>entry.name===select.value);
    if(device)setModel(device);
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
      host.dataset.artwork = item.id; setStatus(modelStatus());
    } catch (error) {
      if (disposed || currentRequest !== request) return;
      setStatus('Immagine non caricata. Riprova o scegli un’altra grafica.'); console.warn('PosterCult cover artwork:', error);
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true; ++request; ++modelRequest;
    cancelAnimationFrame(artworkFrame);
    editor?.removeEventListener('input',onTransform);editor?.removeEventListener('click',onReset);
    select.removeEventListener('change', onModelChange); host.removeEventListener('click', onAction);
    observer?.disconnect(); controls?.dispose(); artwork?.dispose(); environmentTarget?.dispose(); groundTexture?.dispose();
    scene.traverse(object => { object.geometry?.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) { material.map?.dispose(); material.dispose(); } } });
    scene.clear(); renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
  };
  (async () => {
    try {
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
      select.value = initialModel.name;
      if(!await setModel(initialModel))return;
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
