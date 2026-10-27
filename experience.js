/* Interaction layer for the vintage cinema archive. No external services. */
(() => {
  const ui=window.PosterCultUI;
  if(!ui)return;
  const format=new Intl.NumberFormat('it-IT');
  document.querySelector('[data-archive-count]').textContent=format.format(ui.images.length);
  document.querySelector('[data-film-count]').textContent=format.format(new Set(ui.images.map(item=>item.film)).size);
  const toast=document.getElementById('archive-toast');let toastTimer;
  const notify=message=>{toast.textContent=message;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},2600);};
  document.addEventListener('postercult:favorite',event=>notify(event.detail.added?'Aggiunto alla tua collezione di preferiti.':'Rimosso dai preferiti.'));

  const shortcuts=document.getElementById('category-shortcuts');
  const groups=[...new Set(ui.images.map(item=>item.group))];
  for(const value of ['tutti',...groups.slice(0,6)]){
    const button=document.createElement('button');button.type='button';button.dataset.quickCategory=value;
    button.textContent=value==='tutti'?'Tutto l’archivio':window.PosterCatalog.label(value);
    button.addEventListener('click',()=>ui.filterCategory(value));shortcuts.append(button);
  }
  const sync=()=>{
    for(const button of shortcuts.children)button.setAttribute('aria-pressed',String(button.dataset.quickCategory===ui.category));
    document.querySelectorAll('[data-surprise]').forEach(button=>{button.disabled=ui.visible.length===0;});
  };
  document.addEventListener('postercult:catalog-change',sync);sync();
  document.querySelectorAll('[data-surprise]').forEach(button=>button.addEventListener('click',()=>{
    if(ui.visible.length)ui.open(ui.visible[Math.floor(Math.random()*ui.visible.length)].id);
  }));
  document.getElementById('archive-sort').addEventListener('change',event=>ui.sort(event.target.value));
  const densityButtons=document.querySelectorAll('.density-switch button');
  const setDensity=value=>{
    const density=value==='compact'?'compact':'gallery';document.getElementById('product-grid').dataset.density=density;
    densityButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.density===density)));
    try{localStorage.setItem('postercult-catalog-density',density);}catch{}
  };
  let savedDensity;try{savedDensity=localStorage.getItem('postercult-catalog-density');}catch{}
  setDensity(savedDensity);
  densityButtons.forEach(button=>button.addEventListener('click',()=>setDensity(button.dataset.density)));

  const cards=[...document.querySelectorAll('.hero-card')];let featuredStep=0;
  const syncFeature=()=>{
    const active=ui.images.find(item=>item.id===document.getElementById('hero-front').dataset.featureId);
    document.getElementById('feature-title').textContent=active?.film || 'Dall’archivio';
    document.getElementById('feature-count').textContent=String(featuredStep+1).padStart(2,'0')+' / 03';
  };
  const openFeature=card=>{if(card.dataset.featureId)ui.open(card.dataset.featureId);};
  cards.forEach(card=>{
    card.addEventListener('click',()=>openFeature(card));
    card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openFeature(card);}});
  });
  document.getElementById('feature-open').addEventListener('click',()=>openFeature(document.getElementById('hero-front')));
  document.querySelectorAll('[data-feature-step]').forEach(button=>button.addEventListener('click',()=>{
    const direction=Number(button.dataset.featureStep),content=cards.map(card=>({html:card.innerHTML,id:card.dataset.featureId,label:card.getAttribute('aria-label')}));
    cards.forEach((card,index)=>{const next=content[(index+direction+cards.length)%cards.length];card.innerHTML=next.html;card.dataset.featureId=next.id;card.setAttribute('aria-label',next.label);});
    featuredStep=(featuredStep+direction+3)%3;syncFeature();
  }));syncFeature();
  document.addEventListener('keydown',event=>{
    if(event.key!=='/'||event.ctrlKey||event.metaKey||event.altKey||document.querySelector('dialog[open]'))return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    event.preventDefault();document.getElementById('search-toggle').click();
  });
  const hint=document.createElement('kbd');hint.textContent='/';hint.setAttribute('aria-hidden','true');document.querySelector('.search-field').append(hint);
})();
