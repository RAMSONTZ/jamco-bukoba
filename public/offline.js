(() => {
 const publicCache='jamco-offline-public-v1';
 const accountCache='jamco-offline-account-v1';
 const identityKey='jamco-offline-account';
 const logoutKey='jamco-offline-signout';
 const local={
  read(key){try{return localStorage.getItem(key)||'';}catch{return '';}},
  write(key,value){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}catch{}},
 };
 let cachedIdentity=local.read(identityKey);
 let pendingLogout=local.read(logoutKey)==='1';
 let degraded=false;
 let installEvent;
 const scope=()=>pendingLogout?'':local.read(identityKey)||cachedIdentity;
 const isOffline=()=>navigator.onLine===false||degraded;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const lang=(sw,en)=>document.documentElement.lang==='en'?en:sw;

 function update(){
  const state=document.querySelector('#jamco-offline-state');
  if(state){
   state.hidden=!isOffline();
   state.textContent=lang('Huna intaneti kwa sasa. Unaona yaliyohifadhiwa kwenye kifaa hiki.','You’re offline. You can read and play what’s saved on this device.');
  }
  const install=document.querySelector('#jamco-install');
  if(install){
   install.hidden=document.documentElement.dataset.studio==='true'||isOffline()||standalone()||!('serviceWorker'in navigator);
   install.textContent=lang('Sakinisha JAMCO','Install JAMCO');
  }
  document.documentElement.dataset.offline=String(isOffline());
 }
 function setDegraded(value){degraded=value;update();}
 function offlineError(){
  const error=new Error(lang('Unganisha intaneti ili kuendelea.','Connect to the internet to continue.'));
  error.name='JamcoOfflineError';
  return error;
 }
 function networkError(error){
  return navigator.onLine===false||['TypeError','AbortError','TimeoutError','JamcoOfflineError'].includes(error?.name)||error?.status>=500;
 }
 const key=(action,data,owner)=>'/__offline-data/'+encodeURIComponent(owner||'public')+'/'+encodeURIComponent(action)+'?'+encodeURIComponent(JSON.stringify(data));
 async function read(action,data={},owner=''){
  if(owner&&owner!==scope())return null;
  try{
   const cache=await caches.open(owner?accountCache:publicCache);
   const response=await cache.match(key(action,data,owner));
   if(owner&&owner!==scope())return null;
   return response?await response.json():null;
  }catch{return null;}
 }
 async function write(action,data,payload,owner=''){
  if(owner&&scope()!==owner)return;
  try{
   const cache=await caches.open(owner?accountCache:publicCache);
   const url=key(action,data,owner);
   if(owner&&scope()!==owner)return;
   await cache.put(url,new Response(JSON.stringify(payload),{headers:{'Content-Type':'application/json'}}));
   if(owner&&scope()!==owner){await cache.delete(url);return;}
   const keys=await cache.keys();
   const maximum=owner?45:100;
   if(keys.length>maximum)await Promise.all(keys.slice(0,keys.length-maximum).map(item=>cache.delete(item)));
  }catch{}
 }
 async function setIdentity(owner){
  const previous=scope();
  cachedIdentity=owner||'';
  local.write(identityKey,cachedIdentity);
  if(previous!==cachedIdentity){try{await caches.delete(accountCache);}catch{}}
 }
 async function rememberAccount(me){
  if(pendingLogout)return;
  await setIdentity(me.user?.id);
  const owner=me.user?.id;
  if(!owner)return;
  const {id, display_name, avatar, location, verified}=me.user;
  await write('me',{}, {user:{id,display_name,avatar,location,verified},saved:me.saved||[],liked:me.liked||[]},owner);
 }
 const lastAccount=()=>scope()?read('me',{},scope()):null;
 async function beginLogout(){
  pendingLogout=true;
  local.write(logoutKey,'1');
  await setIdentity('');
  try{await caches.delete(accountCache);}catch{}
 }
 function finishLogout(){pendingLogout=false;local.write(logoutKey,'');}
 function logoutPending(){return pendingLogout||local.read(logoutKey)==='1';}

 async function watch(raw){
  if(isOffline()||!raw||!('serviceWorker'in navigator))return;
  const url=new URL(raw,location.href);
  if(url.origin!==location.origin||!/^\/media\/[a-f0-9-]{36}$/.test(url.pathname)||url.search)return;
  try{const registration=await navigator.serviceWorker.ready;registration.active?.postMessage({type:'jamco-watched',url:url.href});}catch{}
 }

 const mediaURLs=new Map();
 const mediaLoads=new WeakMap();
 function prepareMedia(media){
  if(!isOffline()||mediaURLs.has(media))return Promise.resolve();
  if(mediaLoads.has(media))return mediaLoads.get(media);
  const task=(async()=>{
   const source=media.dataset.offlineSource;
   if(!source)return;
   const url=new URL(source,location.href);
   if(url.origin!==location.origin||!/^\/media\/[a-f0-9-]{36}$/.test(url.pathname))return;
   try{
    const response=await (await caches.open('jamco-watched-v1')).match(url.href);
    if(!response||!media.isConnected)return;
    const blob=await response.blob();
    if(!media.isConnected)return;
    const playing=!media.paused,position=media.currentTime;
    const object=URL.createObjectURL(blob);
    mediaURLs.set(media,object);
    if(position>0)media.addEventListener('loadedmetadata',()=>{if(position<media.duration)media.currentTime=position;},{once:true});
    media.src=object;
    if(playing)media.play().catch(()=>{});
   }catch{}
  })();
  mediaLoads.set(media,task);
  task.then(()=>mediaLoads.delete(media),()=>mediaLoads.delete(media));
  return task;
 }
 function cleanupMedia(){
  for(const [media,url] of mediaURLs)if(!media.isConnected){URL.revokeObjectURL(url);mediaURLs.delete(media);}
 }
 async function recentPost(slug){
  try{
   const cache=await caches.open(publicCache);
   const keys=(await cache.keys()).filter(key=>new URL(key.url).pathname.endsWith('/feed')).reverse();
   for(const request of keys.slice(0,30)){
    const data=await (await cache.match(request))?.json();
    const post=data?.posts?.find(item=>item.slug===slug);
    if(post)return post;
   }
  }catch{}
  return null;
 }
 const recentKey='jamco-recent-photo-v1';
 const historyKey='jamco-navigation-v1';
 function stored(key,fallback){
  try{return JSON.parse(local.read(key))||fallback;}catch{return fallback;}
 }
 function safeRoute(raw){
  const url=new URL(raw,location.href);
  if(url.origin!==location.origin||url.searchParams.has('qa')||
    !/^\/(?:$|gundua\/?$|(?:habari|picha|tv)\/[a-z0-9-]+\/?$|(?:wasiliana|faragha|picha|tv|matukio|biashara|habari)\/?$)/.test(url.pathname))return null;
  url.hash='';
  return url;
 }
 function sendToWorker(data){
  const worker=navigator.serviceWorker;
  if(!worker)return;
  worker.ready.then(reg=>reg.active?.postMessage(data)).catch(()=>{});
 }
 function prefetch(raw){
  if(isOffline()||document.hidden||navigator.connection?.saveData||/2g/.test(navigator.connection?.effectiveType||''))return;
  const url=safeRoute(raw);
  if(!url||url.href===location.href.split('#')[0])return;
  const previous=prefetched.get(url.href)||0;
  if(Date.now()-previous<30000)return;
  if(prefetched.size>=24)prefetched.delete(prefetched.keys().next().value);
  prefetched.set(url.href,Date.now());
  sendToWorker({type:'jamco-prefetch-page',url:url.href});
 }
 const prefetched=new Map();
 function recentPictures(){return stored(recentKey,[]).slice(0,5);}
 const photoTargets=new WeakMap();
 let photoObserver;
 function recordPicture(img){
  const article=img.closest('.post[data-post]');
  const picture=img.currentSrc;
  if(!article||!picture||!img.naturalWidth)return;
  const url=new URL(picture,location.href);
  if(url.origin!==location.origin||!/^\/(?:media|photos)\//.test(url.pathname))return;
  const slug=article.dataset.post;
  if(!/^[a-z0-9-]{1,96}$/.test(slug))return;
  const previous=recentPictures();
  if(previous[0]?.url===url.href)return;
  const entries=[{url:url.href,slug,title:article.querySelector('h1,h2')?.textContent?.slice(0,180)||'JAMCO'},...previous.filter(item=>item.url!==url.href)].slice(0,5);
  local.write(recentKey,JSON.stringify(entries));
  if(!isOffline())sendToWorker({type:'jamco-pin-pictures',urls:entries.map(item=>item.url)});
 }
 function observePictures(root){
  photoObserver??=typeof IntersectionObserver==='function'?new IntersectionObserver(items=>{
   for(const entry of items){
    const img=entry.target;
    photoTargets.set(img,entry.isIntersecting);
    if(entry.isIntersecting)recordPicture(img);
   }
  },{threshold:.3}):null;
  if(!photoObserver)return;
  for(const img of root.querySelectorAll('.post .media-slide img')){
   if(photoTargets.has(img))continue;
   photoTargets.set(img,false);
   img.addEventListener('load',()=>{if(photoTargets.get(img))recordPicture(img);});
   photoObserver.observe(img);
  }
 }
 function predict(){
  if(document.documentElement.dataset.studio==='true')return;
  const current=safeRoute(location.href);
  if(current){
   const route=current.pathname+current.search;
   const history=stored(historyKey,[]).filter(item=>item.path!==route).slice(0,11);
   const last=stored(historyKey,[]).find(item=>item.path===route);
   history.unshift({path:route,visits:(last?.visits||0)+1});
   local.write(historyKey,JSON.stringify(history));
  }
  let pending;
  const schedule=event=>{
   clearTimeout(pending);
   const link=event.target.closest?.('a[href]');
   if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
   if(event.type==='pointerdown')prefetch(link.href);
   else pending=setTimeout(()=>prefetch(link.href),110);
  };
  for(const name of ['pointerover','pointerdown','focusin'])document.addEventListener(name,schedule,{passive:true});
  const idle=()=>{
   const likely=stored(historyKey,[]).filter(item=>current&&item.path!==current.pathname+current.search)
    .sort((a,b)=>b.visits-a.visits)[0]?.path;
   prefetch(likely||(current?.pathname==='/'?'/gundua':'/'));
  };
  if('requestIdleCallback'in window)requestIdleCallback(idle,{timeout:2500});
  else setTimeout(idle,1700);
 }

 async function warm(){
  if(!('serviceWorker'in navigator)||isOffline())return;
  const registration=await navigator.serviceWorker.ready;
  // The initial page may have downloaded pictures before the worker took control.
  const urls=[...document.querySelectorAll('#main img')].filter(img=>img.complete&&img.naturalWidth)
    .map(img=>img.currentSrc||img.src).filter(Boolean).slice(0,24);
  if(urls.length)registration.active?.postMessage({type:'jamco-warm-pictures',urls});
 }

 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;update();});
 window.addEventListener('appinstalled',()=>{installEvent=null;update();});
 window.addEventListener('offline',update);
 window.addEventListener('online',()=>setDegraded(false));
 window.addEventListener('jamco-language',update);
 window.addEventListener('storage',event=>{
  if(event.key!==identityKey&&event.key!==logoutKey)return;
  cachedIdentity=local.read(identityKey);
  pendingLogout=local.read(logoutKey)==='1';
  window.dispatchEvent(new Event('jamco-identity-change'));
 });
 document.addEventListener('DOMContentLoaded',()=>{
  update();
  predict();
  new MutationObserver(cleanupMedia).observe(document.body,{childList:true,subtree:true});
  document.querySelector('#jamco-install')?.addEventListener('click',async()=>{
   if(installEvent){
    const prompt=installEvent;installEvent=null;
    await prompt.prompt();
    await prompt.userChoice;
    return;
   }
   const dialog=document.querySelector('#jamco-install-help');
   if(!dialog)return;
   dialog.querySelector('h2').textContent=lang('Sakinisha JAMCO','Install JAMCO');
   dialog.querySelector('p').textContent=lang('Kwenye iPhone, fungua Safari, bonyeza Shiriki, kisha Ongeza kwenye Skrini ya Mwanzo. Kwenye Android au kompyuta, fungua menyu ya kivinjari kisha chagua Sakinisha programu au Ongeza kwenye skrini ya mwanzo.','On iPhone, open Safari and choose Share, then Add to Home Screen. On Android or desktop, open the browser menu and choose Install app or Add to Home Screen.');
   if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
   dialog.querySelector('button').onclick=()=>{if(dialog.close)dialog.close();else dialog.removeAttribute('open');};
  });
 });
 window.JamcoOffline={isOffline,setDegraded,offlineError,networkError,read,write,scope,rememberAccount,lastAccount,beginLogout,finishLogout,logoutPending,watch,warm,recentPost,prepareMedia,recentPictures,observePictures};
})();
