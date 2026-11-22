(() => {
  const get=(key,fallback)=>{
    try { return JSON.parse(localStorage.getItem('jamcoPortal-'+key)) ?? fallback; } catch { return fallback; }
  };
  const put=(key,value)=>{
    try { localStorage.setItem('jamcoPortal-'+key,JSON.stringify(value)); } catch {}
  };
  const toast=document.querySelector('.toast');
  let timer;
  const feedback=message=>{toast.textContent=message;clearTimeout(timer);timer=setTimeout(()=>{toast.textContent='';},3600);};
  async function api(url,data) {
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result=await res.json();
    if(!res.ok) throw new Error(result.message||'Jaribu tena.');
    return result;
  }
  const readFile = file => new Promise((resolve,reject)=>{
    if(file.size>1048576) return reject(new Error('Picha isizidi 1 MB.'));
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Picha haikuweza kusomwa.'));
    reader.readAsDataURL(file);
  });
  async function formData(form) {
    const data={};
    for (const [k,v] of new FormData(form)) {
      if(v instanceof File) { if(v.size) data[k]=await readFile(v); }
      else data[k]=v;
    }
    form.querySelectorAll('input[type=checkbox][name]').forEach(x=>{data[x.name]=x.checked;});
    if(data.liveAt) data.liveAt=new Date(data.liveAt).toISOString();
    return data;
  }
  window.jamco={api,formData,feedback};
  const previous= (()=>{try{return JSON.parse(localStorage.getItem('jamco4-saved'))||[];}catch{return[];}})();
  const legacyViews={news:'/habari',gallery:'/picha',video:'/tv',events:'/matukio',business:'/biashara',contact:'/wasiliana',saved:'/hifadhi'};
  const legacy={'mv-victoria':'mv-victoria-huduma-2025','market-2026':'soko-jipya-bukoba','2026-development':'miradi-ya-mji-wa-bukoba'};
  if(location.pathname==='/') {
    const fragment=location.hash.slice(1), oldArticle=fragment.startsWith('soma/')?legacy[fragment.slice(5)]:null;
    const next=oldArticle?'/habari/'+oldArticle:legacyViews[fragment];
    if(typeof next==='string') location.replace(next);
  }
  const saved=new Set(get('saved',Array.isArray(previous)?previous.map(x=>legacy[x]).filter(Boolean):[]));
  const followed=new Set(get('followed',[]));
  function syncSaved() {
    document.querySelectorAll('[data-save]').forEach(button=>{
      const active=saved.has(button.dataset.save);
      button.setAttribute('aria-pressed',active);
      button.setAttribute('aria-label',active?'Ondoa kwenye hifadhi':'Hifadhi makala');
    });
    const slots=[...document.querySelectorAll('[data-saved-item]')];
    slots.forEach(item=>{item.hidden=!saved.has(item.dataset.savedItem);});
    const empty=document.querySelector('[data-saved-empty]');
    if(empty) empty.hidden=slots.some(item=>!item.hidden);
  }
  function syncFollowed() {
    document.querySelectorAll('[data-follow]').forEach(x=>{x.textContent=followed.has(x.dataset.follow)?'Acha kufuata mada':'Fuata mada';});
    const list=document.querySelector('[data-followed]');
    if(!list) return;
    list.replaceChildren();
    if(!followed.size) list.textContent='Bado hujafuata mada.';
    for(const topic of followed) {
      const a=document.createElement('a');
      a.className='button outline';
      a.href='/habari'+(topic==='Habari'?'':'?mada='+encodeURIComponent(topic));
      a.textContent=topic;
      const remove=document.createElement('button');
      remove.type='button';remove.className='icon-btn';remove.textContent='×';remove.setAttribute('aria-label','Acha kufuata '+topic);
      remove.addEventListener('click',()=>{followed.delete(topic);put('followed',[...followed]);syncFollowed();});
      const row=document.createElement('div');row.className='actions';row.append(a,remove);list.append(row);
    }
  }
  const theme=document.querySelector('[data-theme-select]');
  if(theme){theme.value=window.JamcoTheme?.get()||'dark';theme.addEventListener('change',()=>window.JamcoTheme?.set(theme.value));}
  syncSaved();syncFollowed();

  const dialog=document.querySelector('.lightbox');
  const photoData=document.getElementById('photo-data');
  const photos=photoData?JSON.parse(photoData.content.textContent):[];
  let currentPhoto=0;
  function showPhoto(index) {
    if(!dialog || !photos.length || index<0) return;
    currentPhoto=(index+photos.length)%photos.length;
    const photo=photos[currentPhoto], img=dialog.querySelector('img');
    img.src=photo.large||photo.image;img.alt=photo.title;
    dialog.querySelector('figcaption').textContent=[photo.title,photo.location,photo.date,photo.publisher,photo.license,photo.image.startsWith('/photos/')?'ukubwa umebadilishwa':''].filter(Boolean).join(' · ');
    dialog.querySelector('[data-photo-source]').href=photo.source;
    const license=dialog.querySelector('[data-photo-license]');license.hidden=!photo.licenseUrl;
    if(photo.licenseUrl) license.href=photo.licenseUrl;
    if(!dialog.open) dialog.showModal();
  }
  dialog?.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    showPhoto((currentPhoto+(event.key==='ArrowLeft'?-1:1)+photos.length)%photos.length);
  });
  dialog?.addEventListener('close',()=>{if(document.fullscreenElement===dialog) document.exitFullscreen();});
  async function share() {
    const photo=dialog?.open?photos[currentPhoto]:null;
    const url=photo?new URL('/picha/'+photo.slug,location.origin).href:location.href;
    if(navigator.share) {
      await navigator.share({title:photo?.title||document.title,url});
    } else {
      await navigator.clipboard.writeText(url);feedback('Kiungo kimenakiliwa.');
    }
  }
  document.addEventListener('click',async event=>{
    const node=event.target.closest('button,a');
    if(!node) return;
    const d=node.dataset;
    if(d.save) {
      if(saved.has(d.save)) saved.delete(d.save); else saved.add(d.save);
      put('saved',[...saved]);syncSaved();
    } else if(d.follow) {
      event.preventDefault();
      if(followed.has(d.follow)) followed.delete(d.follow); else followed.add(d.follow);
      put('followed',[...followed]);syncFollowed();
    } else if('menu' in d) {
      const expanded=document.getElementById('main-nav').classList.toggle('open');
      node.setAttribute('aria-expanded',expanded);
      node.setAttribute('aria-label',expanded?'Funga menyu':'Fungua menyu');
    } else if(d.photo && dialog && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();showPhoto(photos.findIndex(p=>p.slug===d.photo));
    } else if('photoClose' in d) dialog.close();
    else if(d.photoStep) showPhoto((currentPhoto+Number(d.photoStep)+photos.length)%photos.length);
    else if('fullscreen' in d) {
      try { if(document.fullscreenElement) await document.exitFullscreen(); else if(dialog.requestFullscreen) await dialog.requestFullscreen(); } catch {}
    } else if('share' in d) {
      try { await share(); } catch(error) { if(error.name!=='AbortError') feedback('Tumia anwani ya ukurasa kushiriki.'); }
    } else if('loadVideo' in d) {
      const wrap=node.closest('[data-player]'), frame=document.createElement('iframe');
      frame.src=wrap.dataset.player;frame.title=document.querySelector('h1').textContent;
      frame.allow='encrypted-media; fullscreen; picture-in-picture';frame.allowFullscreen=true;
      wrap.replaceChildren(frame);
    } else if(d.product) {
      const choice=document.querySelector('#ombi select[name=product]');
      choice.value=d.product;choice.focus();
    }
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;
    if(!form.dataset.json) return;
    event.preventDefault();
    const button=form.querySelector('button[type=submit],button:not([type])');
    const status=form.querySelector('.form-status');
    if(button) button.disabled=true;
    if(status) status.textContent='Inawasilishwa…';
    try {
      const data=await formData(form), response=await api(form.dataset.json,data);
      if(status) status.textContent=response.message;
      if('reload' in form.dataset) location.replace('/admin');
      else if(form.dataset.json!=='/api/track') form.reset();
    } catch(error) { if(status) status.textContent=error.message; }
    finally { if(button) button.disabled=false; }
  });

  const slug=document.querySelector('[data-article]')?.dataset.article;
  if(slug) {
    const day=new Date().toISOString().slice(0,10), views=get('views',{});
    if(views[slug]!==day) api('/api/read',{slug}).then(()=>put('views',{...get('views',{}),[slug]:day})).catch(()=>{});
  }
  if('serviceWorker' in navigator && !location.pathname.startsWith('/admin')) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
  let installPrompt;
  const install=document.querySelector('[data-install]');
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(install) install.hidden=false;});
  install?.addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;install.hidden=true;}});
  const pushForm=document.querySelector('[data-push]');
  function promiseTimeout(promise) {
    return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Huduma ya arifa haijawa tayari. Jaribu tena.')),6000))]);
  }
  pushForm?.addEventListener('submit',async event=>{
    event.preventDefault();
    const status=pushForm.querySelector('.form-status'), button=pushForm.querySelector('button');
    button.disabled=true;
    try {
      if(!('Notification' in window) || !('PushManager' in window)) throw new Error('Kivinjari hiki hakiruhusu arifa. Kwenye iPhone, sakinisha JAMCO kwanza.');
      const categories=new FormData(pushForm).getAll('topics');
      if(!categories.length) throw new Error('Chagua angalau mada moja.');
      const allowed=await Notification.requestPermission();
      if(allowed!=='granted') throw new Error('Ruhusu arifa kwenye mipangilio ya kivinjari.');
      const config=await fetch('/api/push-config').then(x=>x.json());
      if(!config.key) throw new Error('Huduma ya arifa haijawa tayari.');
      const registration=await promiseTimeout(navigator.serviceWorker.ready);
      const current=await registration.pushManager.getSubscription();
      const sub=current||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:config.key});
      const result=await api('/api/push',{subscription:sub.toJSON(),categories});
      put('push-topics',categories);status.textContent=result.message;
    } catch(error) {status.textContent=error.message;}
    finally {button.disabled=false;}
  });
  if(pushForm) {
    const active=get('push-topics',null);
    if(active) pushForm.querySelectorAll('[name=topics]').forEach(x=>{x.checked=active.includes(x.value);});
  }
  document.querySelector('[data-push-off]')?.addEventListener('click',async()=>{
    const status=pushForm.querySelector('.form-status');
    try {
      if('serviceWorker' in navigator && 'PushManager' in window) {
        const registration=await promiseTimeout(navigator.serviceWorker.ready);
        const sub=await registration.pushManager.getSubscription();
        if(sub) {await api('/api/push-off',{subscription:sub.toJSON()});await sub.unsubscribe();}
      }
      put('push-topics',null);status.textContent='Arifa zimezimwa.';
    } catch(error){status.textContent=error.message;}
  });
})();
