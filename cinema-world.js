import * as THREE from 'three';
import { createCinemaAssetLibrary, instanceCinemaSeats } from './cinema-assets.js?v=cinema-props-1';

// Touch-first cinema with locally hosted, optional CC0 props and procedural fallbacks.
export function createCinemaWorld(host, rooms, { onDoor, onInspect, onPose } = {}) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  host.append(renderer.domElement);const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Atrio del cinema 3D. Trascina per guardarti intorno e tocca una porta.');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#1c1310');scene.fog=new THREE.Fog('#261812',15,42);
  const camera=new THREE.PerspectiveCamera(62,1,.06,65);camera.rotation.order='YXZ';
  let root,mode='hall',page=0,yaw=0,pitch=0,disposed=false,paused=false,frame,last=0,version=0,posterRequest=0,screen;
  let stick={x:0,y:0},look,targets=[],keys=new Set();const resources=new Set(),colliders=[];
  const clamp=THREE.MathUtils.clamp;
  const assets=createCinemaAssetLibrary(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let animatedCurtains=[],curtainStarted=0,curtainOpen=false,projectionReady=false,spinningReels=[],assetCount=0;
  const seatPositions=[],reelFrustum=new THREE.Frustum(),reelMatrix=new THREE.Matrix4(),reelSphere=new THREE.Sphere(new THREE.Vector3(),.4);
  const addAsset=async(key,configure)=>{const current=version,source=await assets.load(key);if(!source||disposed||current!==version)return;const model=assets.copy(source,track);configure(model);assetCount++;host.dataset.assetCount=String(assetCount);render();};
  const track=value=>{resources.add(value);return value;};
  const material=(color,opts={})=>track(new THREE.MeshStandardMaterial({color,roughness:.8,...opts}));
  const mesh=(geometry,mat,x,y,z,parent=root)=>{const m=new THREE.Mesh(track(geometry),mat);m.position.set(x,y,z);parent.add(m);return m;};
  const box=(w,h,d,mat,x,y,z,parent=root)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const drawLabel=(text,{background='#1d241e',color='#e9cc8f',size=44,width=1024,height=256}={})=>{
    const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='#b79352';ctx.lineWidth=3;ctx.strokeRect(14,14,width-28,height-28);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
    const lines=text.split('\n');lines.forEach((line,i)=>{let font=size;font=Math.min(font,(height-30)/(lines.length*1.3));ctx.font=font+'px Georgia';while(ctx.measureText(line).width>width-60&&font>16){font--;ctx.font=font+'px Georgia';}ctx.fillText(line,width/2,height/2+(i-(lines.length-1)/2)*(size*1.3));});
    const t=track(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;return t;
  };
  const label=(text,w,h,x,y,z,parent=root,opts={})=>mesh(new THREE.PlaneGeometry(w,h),track(new THREE.MeshBasicMaterial({map:drawLabel(text,{...opts,width:w>5?2048:1024,height:Math.max(96,Math.round((w>5?2048:1024)*h/w))})})),x,y,z,parent);
  const floorTexture=()=>{
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
    for(let x=0;x<4;x++)for(let y=0;y<4;y++){ctx.fillStyle=(x+y)%2?'#27231f':'#635640';ctx.fillRect(x*64,y*64,64,64);ctx.strokeStyle='#ae98751c';ctx.strokeRect(x*64,y*64,64,64);}
    const t=track(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,7);return t;
  };
  const clear=()=>{version++;posterRequest++;animatedCurtains=[];spinningReels=[];curtainStarted=0;curtainOpen=false;projectionReady=false;seatPositions.length=0;assetCount=0;host.dataset.assetCount='0';delete host.dataset.curtain;if(root){root.traverse(node=>{if(node.isInstancedMesh)node.dispose();});scene.remove(root);}for(const r of resources)r.dispose?.();resources.clear();root=new THREE.Group();scene.add(root);targets=[];colliders.length=0;screen=null;};
  const lightRoom=(auditorium=false)=>{
    root.add(new THREE.HemisphereLight(0xffe2b0,0x25110b,auditorium ? .8 : 1.7));
    const key=new THREE.DirectionalLight(0xffd1a0,auditorium?1.2:2.8);key.position.set(1,5,6);root.add(key);
    const fill=new THREE.DirectionalLight(0xe9bd7d,.7);fill.position.set(-4,3,-7);root.add(fill);
  };
  const lamp=(x,y,z,parent=root)=>{
    const gold=material('#b48a46',{metalness:.65,roughness:.32}),glow=track(new THREE.MeshBasicMaterial({color:'#ffe3ab'}));
    box(.12,.65,.16,gold,x,y,z,parent);mesh(new THREE.SphereGeometry(.16,12,8),glow,x,y+.1,z+.13,parent);
  };
  const trim=(x,z,rotation=0)=>{
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rotation;root.add(group);
    const wood=material('#443020'),gold=material('#b28d4d',{metalness:.6,roughness:.4});
    box(12,.14,.12,wood,0,.2,0,group);box(12,.045,.07,gold,0,1.12,.03,group);box(12,.12,.12,gold,0,4.8,0,group);return group;
  };
  const photo=(item,w,h,parent,x,y,z)=>{
    const current=version,mat=track(new THREE.MeshBasicMaterial({color:'#d4bea0'}));const p=mesh(new THREE.PlaneGeometry(w,h),mat,x,y,z,parent);
    if(!item)return;
    const url=item.thumbnail.split('/').map(encodeURIComponent).join('/');
    new THREE.TextureLoader().load(new URL(url,document.baseURI).href,t=>{if(disposed||version!==current){t.dispose();return;}track(t);t.colorSpace=THREE.SRGBColorSpace;mat.map=t;mat.color.set('#ffffff');mat.needsUpdate=true;render();},undefined,()=>{});return p;
  };
  function makeDoor(room,index,x,z,rotation){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;root.add(g);
    const velvet=material('#671d27'),dark=material('#2c1015'),gold=material('#be9c5d',{metalness:.65,roughness:.3});
    box(2.65,3.85,.18,dark,0,1.95,0,g);
    for(const side of [-1,1]){box(.12,3.95,.28,gold,side*1.34,1.98,.08,g);box(1.19,3.55,.12,velvet,side*.62,1.86,.12,g);box(.035,3.3,.03,gold,side*1.16,1.86,.2,g);box(.055,.65,.07,gold,side*.15,1.65,.23,g);}
    box(2.8,.15,.3,gold,0,3.97,.06,g);box(2.8,.06,.3,gold,0,.06,.06,g);
    label('SALA '+String(index+1).padStart(2,'0')+'\n'+room.label,2.95,.55,0,4.35,.12,g,{size:53});
    label(room.items.length+' LOCANDINE',1.6,.22,0,.48,.24,g,{size:38,height:128});
    const hit=mesh(new THREE.PlaneGeometry(2.7,4.2),new THREE.MeshBasicMaterial({visible:false}),0,2,.33,g);track(hit.material);hit.userData.room=room.key;targets.push(hit);
    const posterGroup=new THREE.Group();posterGroup.position.set(1.95,2.15,.06);g.add(posterGroup);
    box(1.03,1.52,.14,gold,0,0,0,posterGroup);photo(room.items[0],.9,1.38,posterGroup,0,0,.08);lamp(-1.9,2.8,.12,g);
  }
  function showHall(nextPage=0){
    clear();mode='hall';host.dataset.projector='fallback';page=nextPage;scene.fog.color.set('#261812');lightRoom();
    const plaster=material('#ae9673'),wall=material('#72252c'),wood=material('#322219'),gold=material('#ab8848',{metalness:.6,roughness:.38});
    const fm=material('#ffffff',{map:floorTexture(),roughness:.28});const floor=mesh(new THREE.PlaneGeometry(12,23),fm,0,0,0);floor.rotation.x=-Math.PI/2;
    box(12,.08,22,material('#1c1915'),0,5.65,0);box(.18,5.6,22,plaster,-6,2.8,0);box(.18,5.6,22,plaster,6,2.8,0);box(12,5.6,.18,plaster,0,2.8,-10);box(12,5.6,.18,plaster,0,2.8,11);
    box(11.9,1.08,.1,wall,0,.57,-9.88);const left=trim(-5.88,0,Math.PI/2),right=trim(5.88,0,-Math.PI/2);left.scale.x=right.scale.x=1.8;
    const carpet=box(3,.018,20,wall,0,.022,0);for(const x of [-1.47,1.47])box(.025,.025,20,gold,x,.04,0);
    for(const z of [-7,-2,3,8]){box(12,.12,.16,gold,0,5.2,z);box(.08,4.9,.16,wood,-5.85,2.6,z);box(.08,4.9,.16,wood,5.85,2.6,z);}
    label('POSTERCULT  /  CINEMA PRIVATO',9,.53,0,5.15,-9.85,root,{size:55});
    const current=rooms.slice(page*9,page*9+9);
    current.forEach((room,i)=>{if(i<3)makeDoor(room,page*9+i,(i-1)*3.55,-9.74,0);else{const j=i-3;makeDoor(room,page*9+i,j%2===0?-5.82:5.82,-5.4+Math.floor(j/2)*5.3,j%2===0?Math.PI/2:-Math.PI/2);}});
    for(const x of [-3.6,3.6]){box(2.2,.4,.9,wall,x,.57,6.2);box(2.25,.7,.15,wall,x,1.03,6.6);for(const dx of [-.9,.9])box(.07,.4,.65,gold,x+dx,.2,6.2);colliders.push({x0:x-1.25,x1:x+1.25,z0:5.4,z1:6.9});}
    // A small projection display and concession counter, outside the central walkway.
    box(1.9,.16,1.6,wood,3.85,.08,3.9);colliders.push({x0:2.7,x1:5,z0:2.8,z1:4.9});
    const sparePedestal=box(.78,.92,.7,material('#30463d'),3.85,.62,3.9);
    const spareProjector=new THREE.Group();spareProjector.position.set(3.85,1.084,3.9);spareProjector.rotation.y=-.6;root.add(spareProjector);
    box(.45,.5,.5,material('#30463d'),0,.28,0,spareProjector);
    const lens=mesh(new THREE.CylinderGeometry(.09,.09,.3,16),gold,0,.28,.36,spareProjector);lens.rotation.x=Math.PI/2;
    for(const z of [-.22,.3]){const reel=mesh(new THREE.TorusGeometry(.2,.025,6,20),gold,.17,.73,z,spareProjector);reel.rotation.y=Math.PI/2;}
    addAsset('pedestal',m=>{m.position.set(3.85,.16,3.9);m.rotation.y=-.6;root.add(m);sparePedestal.visible=false;});
    addAsset('projector',m=>{m.position.set(3.85,1.084,3.9);m.rotation.y=-.6;root.add(m);spareProjector.visible=false;host.dataset.projector='ready';});
    label('LA CABINA / 35 MM',2.2,.36,3.85,2.65,3.9,root,{size:50});
    box(.72,.09,.68,wood,2.85,1,3.9);for(const x of [2.57,3.13])box(.07,1,.54,gold,x,.5,3.9);
    addAsset('reel',m=>{m.position.set(2.85,1.05,3.9);root.add(m);spinningReels.push(m);host.dataset.reel='ready';});
    addAsset('counter',m=>{m.position.set(-3.9,0,3.3);root.add(m);});
    addAsset('popcorn',m=>{m.position.set(-3.9,1.02,3.3);root.add(m);});
    colliders.push({x0:-5.3,x1:-2.5,z0:2.7,z1:3.9});label('IL BAR DEL CINEMA',2.4,.36,-3.9,2.4,3.3,root,{size:48});
    const ticket=box(3,1.1,.9,wood,-3.7,.55,10);label('BIGLIETTERIA',2.5,.5,-3.7,2.6,10.35,root,{size:65});
    camera.position.set(0,1.7,7.8);yaw=0;pitch=.025;camera.rotation.set(pitch,yaw,0);canvas.setAttribute('aria-label','Atrio 3D con le porte delle sale. Trascina per guardarti intorno.');render();
  }
  const curtain=(x,z,height=7)=>{
    const g=new THREE.Group();g.position.set(x,height/2,z);root.add(g);const red=material('#5c1321'),shade=material('#3c0f17');
    for(let i=0;i<10;i++){const fold=mesh(new THREE.CylinderGeometry(.13,.13,height,8),i%2?red:shade,(i-4.5)*.22,0,0,g);}
  };
  function showRoom(room){
    clear();mode='room';lightRoom(true);scene.fog.color.set('#170f12');
    const wine=material('#551b26'),dark=material('#171314'),gold=material('#a4864c',{metalness:.55,roughness:.4});
    box(17,.2,26,material('#302020'),0,-.12,0);box(.2,8,26,wine,-8.5,4,0);box(.2,8,26,wine,8.5,4,0);box(17,8,.2,dark,0,4,-11);box(17,.2,26,dark,0,8,0);
    for(const z of [-7,-1,5,11])for(const x of [-8.35,8.35]){box(.06,4.9,.09,gold,x,3.4,z);lamp(x*.99,4.5,z);}
    box(15,.28,3,material('#5b3d28'),0,.15,-9.5);box(14.9,.045,.08,gold,0,.31,-8.0);
    box(13.3,7.4,.16,gold,0,4.5,-10.7);box(13,7.1,.18,dark,0,4.5,-10.55);
    const initial=drawLabel('POSTERCULT\nLa proiezione sta per iniziare.',{background:'#e9dfc5',color:'#403322',width:2048,height:1152,size:80});
    const sm=track(new THREE.MeshBasicMaterial({map:initial}));screen=mesh(new THREE.PlaneGeometry(12.7,6.9),sm,0,4.5,-10.4);screen.userData.inspect=true;targets.push(screen);
    // The original side curtains remain available if the GLB cannot be loaded.
    curtain(-7.5,-10.1);curtain(7.5,-10.1);box(16,.45,.3,wine,0,7.9,-10.1);
    addAsset('curtain',model=>{
      const fabric=new THREE.Group();root.add(fabric);
      for(let i=0;i<8;i++){
        const panel=i===0?model:assets.copy(model,track);panel.position.set((i-3.5)*1.62,1.05,-10.12);panel.scale.set(1,1.96,1.5);fabric.add(panel);animatedCurtains.push({panel,closed:panel.position.x,open:(i<4?-1:1)*(6.62+(i<4?3-i:i-4)*.38)});
      }
      host.dataset.curtain='closed';if(projectionReady)openCurtains();
    });
    const chairs=new THREE.InstancedMesh(track(new THREE.CapsuleGeometry(.3,.34,4,8)),wine,64);root.add(chairs);
    const seats=new THREE.InstancedMesh(track(new THREE.BoxGeometry(.67,.15,.68)),wine,64);root.add(seats);
    const arms=new THREE.InstancedMesh(track(new THREE.BoxGeometry(.09,.28,.68)),gold,128);root.add(arms);
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3();let n=0;
    for(let row=0;row<8;row++)for(const x of [-5.3,-4.15,-3,-1.85,1.85,3,4.15,5.3]){
      const z=-3.7+row*1.65,y=row*.055;seatPositions.push({x,y,z});pos.set(x,y+.86,z+.23);scale.set(1,1,.35);matrix.compose(pos,q,scale);chairs.setMatrixAt(n,matrix);
      pos.set(x,y+.48,z);matrix.compose(pos,q,new THREE.Vector3(1,1,1));seats.setMatrixAt(n,matrix);
      for(const [j,dx]of [[0,-.4],[1,.4]]){pos.set(x+dx,y+.6,z);matrix.compose(pos,q,new THREE.Vector3(1,1,1));arms.setMatrixAt(n*2+j,matrix);}n++;
    }
    addAsset('seat',model=>{const detailed=instanceCinemaSeats(model,seatPositions,track);root.add(detailed);chairs.visible=seats.visible=arms.visible=false;host.dataset.seats='glb';host.dataset.seatInstances=String(seatPositions.length);});
    host.dataset.seats='fallback';
    for(const x of [-.8,.8])box(.025,.012,19,track(new THREE.MeshBasicMaterial({color:'#b19755'})),x,.012,2);
    const beam=mesh(new THREE.CylinderGeometry(.08,5.9,19.2,24,1,true),track(new THREE.MeshBasicMaterial({color:'#efdcb0',transparent:true,opacity:.022,depthWrite:false,side:THREE.DoubleSide})),0,5,-.7);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,19).normalize());
    label('SALA '+room.label.toUpperCase(),5,.5,0,7.9,-10.2,root,{size:53});
    camera.position.set(0,1.75,9.2);yaw=0;pitch=.14;camera.rotation.set(pitch,yaw,0);canvas.setAttribute('aria-label','Sala '+room.label+'. Locandina proiettata sul grande schermo.');render();
  }
  function showWorkshop(){
    clear();mode='workshop';lightRoom();const wood=material('#69432b'),dark=material('#2e231c'),gold=material('#ad864b',{metalness:.55,roughness:.35});
    box(12,.2,14,dark,0,-.15,0);box(12,6,.2,material('#77725b'),0,3,-5);
    box(7,.25,3.2,wood,0,1.15,-1);for(const x of [-3,3])for(const z of [-2.2,.2])box(.18,1.2,.18,dark,x,.5,z);
    for(const x of [-2,-.8,.4,1.6])box(.9,.025,1.2,material('#d2b98a'),x,1.3,-1.2);
    addAsset('reel',model=>{model.position.set(2.25,1.28,-1);root.add(model);spinningReels.push(model);host.dataset.reel='ready';});
    label('IL BANCO DI STAMPA\nFatto a modo tuo.',7,1.5,0,3.5,-4.8,root,{size:72});lamp(3.2,2.2,-2);
    camera.position.set(0,2.5,5);yaw=0;pitch=-.08;camera.rotation.set(pitch,0,0);render();
  }
  async function projectPoster(item,index,total){
    const request=++posterRequest,current=version;const image=new Image();image.decoding='async';
    const loaded=new Promise(resolve=>{image.onload=()=>resolve(true);image.onerror=()=>resolve(false);});
    image.src=new URL(item.original.split('/').map(encodeURIComponent).join('/'),document.baseURI).href;
    if(!await loaded || disposed || current!==version || request!==posterRequest || !screen)return false;
    const c=screen.material.map.image,ctx=c.getContext('2d');ctx.fillStyle='#eee6d2';ctx.fillRect(0,0,c.width,c.height);
    const maxW=1800,maxH=990,s=Math.min(maxW/image.width,maxH/image.height);ctx.drawImage(image,(c.width-image.width*s)/2,70,image.width*s,image.height*s);
    ctx.fillStyle='#5f5139';ctx.textAlign='center';ctx.font='24px Georgia';ctx.fillText('POSTERCULT   /   '+String(index+1).padStart(2,'0')+' — '+String(total).padStart(2,'0'),c.width/2,1120);
    screen.material.map.needsUpdate=true;projectionReady=true;openCurtains();render();return true;
  }
  function openCurtains(){
    if(curtainOpen||!animatedCurtains.length)return;curtainOpen=true;curtainStarted=performance.now();host.dataset.curtain='opening';
    if(reducedMotion.matches)animateProps(curtainStarted+1400);
  }
  function animateProps(time){
    let dirty=false;
    if(curtainOpen&&animatedCurtains.length&&host.dataset.curtain!=='open'){const t=clamp((time-curtainStarted)/1400,0,1),ease=t*t*(3-2*t);for(const {panel,closed,open}of animatedCurtains){panel.position.x=THREE.MathUtils.lerp(closed,open,ease);panel.scale.x=THREE.MathUtils.lerp(1,.28,ease);}if(host.dataset.curtain!=='open'){host.dataset.curtain=t===1?'open':'opening';dirty=true;}}
    if(!reducedMotion.matches&&spinningReels.length){reelFrustum.setFromProjectionMatrix(reelMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));for(const reel of spinningReels){reel.getWorldPosition(reelSphere.center);if(reelFrustum.intersectsSphere(reelSphere)){reel.rotation.y=time*.00022;dirty=true;}}}
    return dirty;
  }
  function inspectProjector(){if(mode!=='hall')return;camera.position.set(1.6,1.65,5.7);yaw=-.9;pitch=-.04;camera.rotation.set(pitch,yaw,0);cancel();render();}
  function render(){if(disposed||paused)return;camera.fov=mode==='room'&&camera.aspect<.8?78:62;camera.updateProjectionMatrix();renderer.render(scene,camera);host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.mode=mode;host.dataset.x=camera.position.x.toFixed(3);host.dataset.z=camera.position.z.toFixed(3);host.dataset.yaw=yaw.toFixed(3);onPose?.();}
  function loop(time){if(disposed||paused)return;const dt=Math.min((time-last)/1000||0,.05);last=time;
    if(mode==='hall'){
      const vx=stick.x+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),vy=stick.y+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);
      if(vx||vy){const nx=clamp(camera.position.x+(vx*Math.cos(yaw)+vy*Math.sin(yaw))*dt*2.5,-5.1,5.1),nz=clamp(camera.position.z+(-vx*Math.sin(yaw)+vy*Math.cos(yaw))*dt*2.5,-8.6,8.8);if(!colliders.some(b=>nx>b.x0&&nx<b.x1&&nz>b.z0&&nz<b.z1)){camera.position.x=nx;camera.position.z=nz;render();}}
    }if(animateProps(time))render();frame=requestAnimationFrame(loop);
  }
  const resize=new ResizeObserver(()=>{if(disposed)return;const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();render();});resize.observe(host);
  const down=e=>{if(look)return;look={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};canvas.setPointerCapture(e.pointerId);};
  const move=e=>{if(!look||look.id!==e.pointerId)return;const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;yaw-=dx*.004;pitch=clamp(pitch+dy*.003,-.55,.45);if(mode!=='hall'){yaw=clamp(yaw,-.7,.7);pitch=clamp(pitch,-.4,.25);}camera.rotation.set(pitch,yaw,0);render();};
  const up=e=>{if(!look||look.id!==e.pointerId)return;const tap=Math.hypot(e.clientX-look.startX,e.clientY-look.startY)<9;look=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(tap){const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(targets)[0];if(hit?.object.userData.room)onDoor?.(hit.object.userData.room);if(hit?.object.userData.inspect)onInspect?.();}};
  const cancel=()=>{look=null;stick={x:0,y:0};keys.clear();};
  const keyDown=e=>{if(!['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||e.target.closest('input,select,textarea,[data-cinema-room-menu]'))return;if(mode==='hall'){keys.add(e.key);e.preventDefault();}};
  const keyUp=e=>keys.delete(e.key);
  const contextLost=e=>{e.preventDefault();pause(true);host.dispatchEvent(new CustomEvent('cinema-context-lost',{bubbles:true}));};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('webglcontextlost',contextLost);
  host.parentElement.addEventListener('keydown',keyDown);host.parentElement.addEventListener('keyup',keyUp);window.addEventListener('blur',cancel);
  function pause(value){paused=value;cancel();cancelAnimationFrame(frame);if(!value){last=performance.now();render();frame=requestAnimationFrame(loop);}}
  frame=requestAnimationFrame(loop);
  return {showHall,showRoom,showWorkshop,projectPoster,pause,inspectProjector,setSeatZoom:(value)=>{if(mode!=='room')return;camera.position.z=9.2-clamp(value,0,100)*.10;camera.position.y=1.75+clamp(value,0,100)*.01;pitch=Math.atan2(4.5-camera.position.y,10.4+camera.position.z);camera.rotation.set(pitch,yaw,0);render();},setStick:(x,y)=>{stick={x,y};},dispose(){if(disposed)return;disposed=true;posterRequest++;version++;cancelAnimationFrame(frame);assets.dispose();resize.disconnect();window.removeEventListener('blur',cancel);host.parentElement.removeEventListener('keydown',keyDown);host.parentElement.removeEventListener('keyup',keyUp);clear();canvas.removeEventListener('webglcontextlost',contextLost);renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
