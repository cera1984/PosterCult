/* Touch-first entrance to the cinema; the normal catalog remains available. */
(() => {
  const ui=window.PosterCultUI,dialog=document.getElementById('cinema-dialog');if(!ui||!dialog)return;
  const $=selector=>dialog.querySelector(selector),product=document.getElementById('product-dialog');
  const grouped=new Map();for(const item of ui.images){if(!grouped.has(item.group))grouped.set(item.group,[]);grouped.get(item.group).push(item);}
  const priority=name=>({kubrick:0,carpenter:1}[name.toLowerCase()]??2);
  const rooms=[...grouped].map(([key,items])=>({key,label:window.PosterCatalog.label(key),items})).sort((a,b)=>priority(a.key)-priority(b.key)||a.label.localeCompare(b.label,'it'));
  let picker,recommending=false,recommendationTrigger;
  const recommendation=()=>$('[data-cinema-recommendation]');
  const hideRecommendation=()=>{recommendation().hidden=true;};
  const closeRecommendation=()=>{hideRecommendation();const target=recommendationTrigger?.getClientRects().length?recommendationTrigger:[...dialog.querySelectorAll('[data-cinema-random]')].find(b=>b.getClientRects().length);target?.focus();};
  let world,opening=0,selection=0,room=null,index=0,pendingIndex=0,wing=0,fallback=false,entry,stickId,knobObserver,audio;
  const status=message=>{$('[data-cinema-status]').textContent=message;};
  const setMode=mode=>{dialog.dataset.mode=mode;$('[data-cinema-walk]').hidden=mode!=='hall';$('[data-cinema-hall-ticket]').hidden=mode!=='hall';$('[data-cinema-projection]').hidden=mode!=='room';$('[data-cinema-back]').hidden=mode==='hall';};
  const menu=visible=>{$('[data-cinema-room-menu]').hidden=!visible;if(visible){hideRecommendation();world?.setStick(0,0);$('[data-cinema-menu-close]').focus();}};
  $('[data-cinema-room-count]').textContent=rooms.length+' sale da esplorare';
  $('[data-cinema-wing]').hidden=rooms.length<=9;
  rooms.forEach((r,i)=>{const b=document.createElement('button');b.type='button';b.dataset.cinemaRoom=r.key;const n=document.createElement('span');n.textContent='SALA '+String(i+1).padStart(2,'0');const name=document.createElement('strong');name.textContent=r.label;const count=document.createElement('small');count.textContent=r.items.length+' locandine  ↗';b.append(n,name,count);$('[data-cinema-room-list]').append(b);});
  function hall(){delete dialog.dataset.focus;$('[data-cinema-projector]').textContent='Il proiettore ↗';hideRecommendation();selection++;room=null;menu(false);setMode('hall');world?.showHall(wing);$('[data-cinema-location]').textContent='ATRIO / ALA '+String(wing+1).padStart(2,'0');$('[data-cinema-title]').textContent='Ogni porta, un altro mondo.';$('[data-cinema-description]').textContent='Trascina per guardarti intorno. Usa il comando circolare per camminare e tocca una porta.';status('Scegli una porta o apri Le sale.');}
  async function project(next){
    hideRecommendation();if(!room||!world)return;const token=++selection,current=room,candidate=(next+room.items.length)%room.items.length,item=room.items[candidate];
    status('Il proiezionista sta cambiando la locandina…');
    pendingIndex=candidate;const ok=await world.projectPoster(item,candidate,current.items.length);
    if(!dialog.open||token!==selection||current!==room)return;
    if(!ok){pendingIndex=index;status('Questa locandina non è stata caricata. Prova la successiva.');return;}
    index=candidate;dialog.querySelectorAll('[data-cinema-create],[data-cinema-inspect]').forEach(button=>button.disabled=false);dialog.dataset.posterId=item.id;$('[data-cinema-counter]').textContent=String(index+1).padStart(2,'0')+' / '+String(room.items.length).padStart(2,'0');$('[data-cinema-film]').textContent=item.film;$('[data-cinema-file]').textContent=item.filename;
    $('[data-cinema-prev]').disabled=$('[data-cinema-next]').disabled=room.items.length<2;status(item.film+' · in proiezione');
  }
  async function enterRoom(key, initialIndex=0){
    const next=rooms.find(r=>r.key===key);if(!next)return;delete dialog.dataset.focus;
    if(fallback){ui.filterCategory(key);dialog.close();document.getElementById('collezione').scrollIntoView({behavior:'smooth'});return;}
    room=next;index=0;pendingIndex=0;delete dialog.dataset.posterId;$('[data-cinema-prev]').disabled=$('[data-cinema-next]').disabled=next.items.length<2;dialog.querySelectorAll('[data-cinema-create],[data-cinema-inspect]').forEach(button=>button.disabled=true);$('[data-cinema-film]').textContent=next.label;$('[data-cinema-file]').textContent='';menu(false);setMode('room');$('[data-cinema-location]').textContent='IN SALA / '+next.label.toUpperCase();$('[data-cinema-title]').textContent='Mettiti comodo.';$('[data-cinema-description]').textContent='Sfoglia le locandine sullo schermo. Quella giusta ti aspetta al banco di stampa.';
    $('[data-cinema-focus]').value='20';world.showRoom(next);world.setSeatZoom(20);await project(initialIndex);
  }
  async function enter(button){
    if(dialog.open)return;entry=button;document.getElementById('mobile-nav').hidden=true;document.getElementById('menu-toggle').setAttribute('aria-expanded','false');document.getElementById('menu-toggle').setAttribute('aria-label','Apri menu');const token=++opening;fallback=false;dialog.dataset.state='loading';dialog.showModal();document.body.classList.add('cinema-open');$('[data-cinema-fallback]').hidden=true;menu(false);setMode('hall');status('Accendiamo le luci…');
    try{const {createCinemaWorld}=await import('./cinema-world.js?v=cinema-props-1');if(token!==opening||!dialog.open)return;
      world=createCinemaWorld($('[data-cinema-world]'),rooms,{onDoor:enterRoom,onInspect:()=>openProduct('poster')});dialog.dataset.state='ready';hall();
    }catch(error){if(token!==opening||!dialog.open)return;fallback=true;dialog.dataset.state='error';$('[data-cinema-fallback]').hidden=false;$('[data-cinema-walk]').hidden=true;status('Il catalogo e le sale rimangono disponibili.');console.warn('PosterCult cinema:',error);}
  }

  async function recommend(trigger){
    if(recommending)return;recommending=true;recommendationTrigger=trigger;const token=selection,opened=opening;
    dialog.querySelectorAll('[data-cinema-random]').forEach(b=>b.disabled=true);
    try{
      if(!picker){const {createFilmPicker}=await import('./film-recommendations.js?v=1');picker=createFilmPicker(ui.images);}
      if(!dialog.open||opened!==opening||token!==selection)return;
      const choice=picker();if(!choice){status('Nessun consiglio disponibile per questo catalogo.');return;}
      const {film,item,count}=choice;menu(false);world?.setStick(0,0);
      if(!fallback){const target=rooms.find(r=>r.key===item.group);await enterRoom(item.group,target.items.findIndex(i=>i.id===item.id));if(!dialog.open||opened!==opening||dialog.dataset.posterId!==item.id)return;}
      $('#cinema-recommendation-title').textContent=film.title;$('[data-recommendation-meta]').textContent=film.year+' · '+film.director;
      const list=$('[data-recommendation-tips]');list.replaceChildren();
      for(const tip of film.tips){const li=document.createElement('li'),title=document.createElement('h3'),text=document.createElement('p'),link=document.createElement('a');title.textContent=tip.title;text.textContent=tip.text;link.textContent=tip.source+' ↗';link.href=tip.url;link.target='_blank';link.rel='noopener noreferrer';li.append(title,text,link);list.append(li);}
      $('[data-recommendation-coverage]').textContent='Sorteggio tra '+count+' film con curiosità verificate. Ogni film ha la stessa probabilità, indipendentemente dalle locandine.';
      recommendation().hidden=false;$('#cinema-recommendation-title').focus({preventScroll:true});status(film.title+' · il consiglio del proiezionista');
    }catch(error){status('Il consiglio non è disponibile. Riprova tra un momento.');console.warn('PosterCult recommendation:',error);}
    finally{recommending=false;dialog.querySelectorAll('[data-cinema-random]').forEach(b=>b.disabled=false);}
  }
  function syncKnobs(){
    const knobs=product.querySelectorAll('[data-workshop-knob]');
    knobs.forEach(knob=>{const key=knob.dataset.workshopKnob,range=product.querySelector('[data-cover-transform="'+key+'"], [data-transform="'+key+'"]');const ready=!!product.querySelector('[data-state="ready"]');const disabled=!range||!ready;if(knob.disabled!==disabled)knob.disabled=disabled;if(!range)return;const value=Number(range.value),min=Number(range.min),max=Number(range.max);knob.setAttribute('aria-valuenow',String(value));knob.setAttribute('aria-valuemin',String(min));knob.setAttribute('aria-valuemax',String(max));knob.style.setProperty('--knob-angle',(-135+(value-min)/(max-min)*270)+'deg');const text=value+(key==='scale'?'%':key==='rotation'?'°':'');if(knob.nextElementSibling.textContent!==text)knob.nextElementSibling.textContent=text;});
  }
  function installConsole(){
    if(!product.classList.contains('cinema-workshop'))return;const panel=product.querySelector('.tshirt-catalog');if(!panel)return;
    if(!panel.querySelector('.workshop-console')){
      const console=document.createElement('section');console.className='workshop-console';console.setAttribute('aria-label','Banco di stampa con manopole');const title=document.createElement('p');title.textContent='BANCO DI STAMPA / REGOLAZIONE MANUALE';console.append(title);
      const row=document.createElement('div');row.className='workshop-dials';console.append(row);
      for(const [key,label]of [['scale','Dimensione'],['x','Orizzontale'],['y','Verticale'],['rotation','Rotazione']]){
        const cell=document.createElement('div');cell.className='workshop-dial';const name=document.createElement('label');name.textContent=label;
        const knob=document.createElement('button');knob.type='button';knob.dataset.workshopKnob=key;knob.setAttribute('role','slider');knob.setAttribute('aria-label','Manopola '+label.toLowerCase());knob.setAttribute('aria-orientation','vertical');knob.title='Trascina verso l’alto o il basso; usa le frecce da tastiera';
        const output=document.createElement('output');cell.append(name,knob,output);row.append(cell);let drag;
        const input=()=>product.querySelector('[data-cover-transform="'+key+'"], [data-transform="'+key+'"]');
        const change=value=>{const r=input();if(!r)return;r.value=String(Math.max(Number(r.min),Math.min(Number(r.max),value)));r.dispatchEvent(new Event('input',{bubbles:true}));syncKnobs();};
        knob.addEventListener('pointerdown',e=>{const r=input();if(!r)return;drag={y:e.clientY,value:Number(r.value),id:e.pointerId};knob.setPointerCapture(e.pointerId);});
        knob.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId)change(Math.round(drag.value+(drag.y-e.clientY)*(key==='scale'?1.5:.8)));});
        const end=()=>{drag=null;};knob.addEventListener('pointerup',end);knob.addEventListener('pointercancel',end);
        knob.addEventListener('keydown',e=>{const r=input();if(!r)return;const step=Number(r.step)||1;if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();change(e.key==='Home'?Number(r.min):e.key==='End'?Number(r.max):Number(r.value)+(['ArrowUp','ArrowRight'].includes(e.key)?step:-step));}});
      }panel.insertBefore(console,panel.querySelector('.print-editor'));
    }syncKnobs();
  }
  function openProduct(type){
    if(!room||!dialog.dataset.posterId)return;const item=room.items[index];if(!item||item.id!==dialog.dataset.posterId)return;selection++;
    if(type!=='poster'){setMode('workshop');world.showWorkshop();}world.pause(true);product.classList.add('cinema-workshop');ui.open(item.id,type);installConsole();
    knobObserver?.disconnect();knobObserver=new MutationObserver(()=>installConsole());knobObserver.observe(product,{subtree:true,childList:true,attributes:true,attributeFilter:['data-state','disabled']});
  }
  product.addEventListener('input',syncKnobs);
  product.addEventListener('close',()=>{if(!product.classList.contains('cinema-workshop'))return;knobObserver?.disconnect();knobObserver=null;product.classList.remove('cinema-workshop');if(dialog.open&&world){world.pause(false);if(room){setMode('room');world.showRoom(room);world.setSeatZoom(Number($('[data-cinema-focus]').value));project(index);}}});
  document.querySelectorAll('[data-enter-cinema]').forEach(button=>button.addEventListener('click',()=>enter(button)));
  dialog.addEventListener('click',event=>{
    if(event.target.closest('[data-cinema-random]'))recommend(event.target.closest('[data-cinema-random]'));
    if(event.target.closest('[data-recommendation-close]')){closeRecommendation();}
    if(event.target.closest('[data-cinema-close]'))dialog.close();
    if(event.target.closest('[data-cinema-rooms]'))menu(true);
    if(event.target.closest('[data-cinema-menu-close]'))menu(false);
    const r=event.target.closest('[data-cinema-room]');if(r)enterRoom(r.dataset.cinemaRoom);
    if(event.target.closest('[data-cinema-back]'))hall();
    if(event.target.closest('[data-cinema-projector]')){if(dialog.dataset.focus==='projector')hall();else{dialog.dataset.focus='projector';world?.inspectProjector();$('[data-cinema-projector]').textContent='Esplora l’atrio ↗';$('[data-cinema-location]').textContent='ATRIO / LA CABINA';status('Proiettore a pellicola · trascina per guardarti intorno.');}}
    if(event.target.closest('[data-cinema-wing]')){wing=(wing+1)%Math.ceil(rooms.length/9);hall();}
    if(event.target.closest('[data-cinema-prev]'))project(pendingIndex-1);
    if(event.target.closest('[data-cinema-next]'))project(pendingIndex+1);
    if(event.target.closest('[data-cinema-inspect]'))openProduct('poster');
    const create=event.target.closest('[data-cinema-create]');if(create)openProduct(create.dataset.cinemaCreate);
  });
  $('[data-cinema-focus]').addEventListener('input',event=>world?.setSeatZoom(Number(event.target.value)));
  const stick=$('[data-cinema-stick]');
  stick.addEventListener('pointerdown',event=>{stickId=event.pointerId;stick.setPointerCapture(event.pointerId);});
  stick.addEventListener('pointermove',event=>{if(event.pointerId!==stickId)return;const r=stick.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(event.clientX-r.left-r.width/2)/28)),y=Math.max(-1,Math.min(1,(event.clientY-r.top-r.height/2)/28));world?.setStick(x,y);stick.style.setProperty('--stick-x',x*20+'px');stick.style.setProperty('--stick-y',y*20+'px');});
  const releaseStick=()=>{stickId=null;world?.setStick(0,0);stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');};
  stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);
  async function stopAudio(){const context=audio;audio=null;if(context&&context.state!=='closed')await context.close().catch(()=>{});}
  $('[data-cinema-audio]').addEventListener('click',async()=>{
    const button=$('[data-cinema-audio]');button.disabled=true;try{if(audio){await stopAudio();button.textContent='Audio spento';button.setAttribute('aria-pressed','false');return;}
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){status('Audio non disponibile in questo browser.');return;}const context=new Audio();audio=context;await context.resume();if(audio!==context||!dialog.open)return;
      const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.02)/1.02;data[i]=brown*3;}
      const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;const gain=audio.createGain();gain.gain.value=.035;source.connect(gain);gain.connect(audio.destination);source.start();button.textContent='Audio attivo';button.setAttribute('aria-pressed','true');
    }catch{stopAudio();status('Non è stato possibile attivare l’audio.');}finally{button.disabled=false;}
  });
  dialog.addEventListener('cinema-context-lost',()=>{fallback=true;dialog.dataset.state='error';$('[data-cinema-fallback]').hidden=false;status('La vista 3D si è interrotta. Puoi usare il catalogo.');});
  dialog.addEventListener('cancel',event=>{if(!recommendation().hidden){event.preventDefault();closeRecommendation();return;}if(!$('[data-cinema-room-menu]').hidden){event.preventDefault();menu(false);$('[data-cinema-rooms]').focus();}});
  dialog.addEventListener('close',()=>{hideRecommendation();opening++;selection++;world?.dispose();world=null;stopAudio();$('[data-cinema-audio]').textContent='Audio spento';$('[data-cinema-audio]').setAttribute('aria-pressed','false');document.body.classList.remove('cinema-open');releaseStick();(entry?.getClientRects().length?entry:document.getElementById('menu-toggle'))?.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(world&&dialog.open)world.pause(document.hidden||product.open);if(audio)(document.hidden?audio.suspend():audio.resume()).catch(()=>{});});
  if(new URL(location.href).searchParams.get('cinema')==='1')enter(document.querySelector('[data-enter-cinema]'));
})();
