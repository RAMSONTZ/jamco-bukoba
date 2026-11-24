const shellCache='jamco-shell-v3';
const assetCache='jamco-assets-v1';
const pageCache='jamco-public-pages-v1';
const recentCache='jamco-recent-pictures-v1';
const videoCache='jamco-watched-v1';
const offlineShell='/offline-shell';
const shellFiles=[
 offlineShell,'/theme.js','/social.css','/theme.css','/feed.css','/bukoba-guide.css','/discovery.css',
 '/offline.js','/jamco-language.js','/editorial-media.js','/social.js','/discovery.js','/bukoba-guide.js',
 '/manifest.webmanifest','/brand/icon-48.png','/brand/icon-96.png','/brand/icon-180.png',
 '/brand/icon-192.png','/brand/icon-512.png','/brand/jamco-logo-display.webp',
];
const mediaPath=/^\/media\/[a-f\d-]{36}$/;
const shellRoutes=/^\/(?:$|gundua\/?$|akaunti\/?$|arifa\/?$|hifadhi\/?$|shiriki\/?$|orodha\/ombi\/?$|(?:habari|picha|tv)\/[a-z0-9-]+\/?$|admin(?:\/(?:mmiliki|wakala))?\/?$|(?:wasiliana|faragha|picha|tv|matukio|biashara|habari)\/?$)/;
const assets=/^\/(?:photos\/|discovery\/|brand\/|assets\/|(?:theme|social|feed|discovery|bukoba-guide|editorial-media|jamco-language|offline|service-categories|staff-space|manifest)\.)/;
const maxMediaSize=20_000_000;
const maxMediaTotal=60_000_000;
const publicMedia=response=>response.status===200&&/(?:^|[,\s])public(?:[,\s]|$)/i.test(response.headers.get('Cache-Control')||'')&&!/no-store|private/i.test(response.headers.get('Cache-Control')||'');

self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(shellCache);
 await cache.addAll(shellFiles.map(url=>new Request(url,{cache:'reload',credentials:'omit'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>(key==='jamco-shell-v1'||key==='jamco-shell-v2')||key.startsWith('jamco-bukoba-')||key.startsWith('jamco-feed-')).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));

const safePage=url=>url.origin===self.location.origin&&!url.searchParams.has('qa')&&
 /^\/(?:$|gundua\/?$|(?:habari|picha|tv)\/[a-z0-9-]+\/?$|(?:wasiliana|faragha|picha|tv|matukio|biashara|habari)\/?$)/.test(url.pathname);
const trimCache=async(cache,limit)=>{
 const keys=await cache.keys();
 await Promise.all(keys.slice(0,Math.max(0,keys.length-limit)).map(key=>cache.delete(key)));
};
async function savePage(cache,key,response){
 if(response.status!==200||response.redirected||!response.headers.get('Content-Type')?.startsWith('text/html'))return;
 const headers=new Headers(response.headers);
 headers.delete('Content-Encoding');headers.delete('Content-Length');headers.delete('Set-Cookie');
 headers.set('X-Jamco-Saved',String(Date.now()));
 await cache.delete(key);
 await cache.put(key,new Response(response.body,{headers}));
 await trimCache(cache,20);
}
const pageJobs=new Map();
function prefetchPage(url){
 if(!safePage(url)||pageJobs.size>=2)return Promise.resolve();
 if(pageJobs.has(url.href))return pageJobs.get(url.href);
 const job=(async()=>{
  const cache=await caches.open(pageCache);
  const hit=await cache.match(url.href);
  if(Date.now()-Number(hit?.headers.get('X-Jamco-Saved'))<30000)return;
  const response=await fetch(url.href,{credentials:'omit',redirect:'error'});
  await savePage(cache,url.href,response);
 })().catch(()=>{}).finally(()=>pageJobs.delete(url.href));
 pageJobs.set(url.href,job);return job;
}
async function navigate(event,request,url){
 const cache=safePage(url)?await caches.open(pageCache).catch(()=>null):null;
 const hit=cache?await cache.match(url.href).catch(()=>null):null;
 if(hit&&Date.now()-Number(hit.headers.get('X-Jamco-Saved'))<30000){return hit;}
 try{
  const response=await fetch(request,hit&&typeof AbortSignal.timeout==='function'?{signal:AbortSignal.timeout(2500)}:undefined);
  if(response.status<500){
   if(cache&&response.status===200&&!response.redirected)event.waitUntil(savePage(cache,url.href,response.clone()).catch(()=>{}));
   if(cache&&(response.status===404||response.status===410))event.waitUntil(cache.delete(url.href).catch(()=>{}));
   return response;
  }
 }catch{}
 return hit||(await caches.match(offlineShell,{cacheName:shellCache}))||
  new Response('JAMCO · Unganisha intaneti kisha ujaribu tena.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
async function lookupAsset(event,request,isUpload){
 const cache=await caches.open(assetCache);
 const key=isUpload?new Request(request.url,{credentials:'omit'}):request;
 const cached=await cache.match(key)||(request.destination==='image'&&await caches.match(key,{cacheName:recentCache}));
 if(cached)return cached;
 try{
  const response=await fetch(request);
  const usable=isUpload?publicMedia(response)&&response.headers.get('Content-Type')?.startsWith('image/'):
   response.status===200&&!/private|no-store/i.test(response.headers.get('Cache-Control')||'');
  if(usable){
   const copy=response.clone();
   event.waitUntil((async()=>{
    await cache.put(key,copy);
    const keys=await cache.keys();
    await Promise.all(keys.slice(0,Math.max(0,keys.length-200)).map(item=>cache.delete(item)));
   })().catch(()=>{}));
  }
  return response;
 }catch(error){
  if(!isUpload){const fallback=await caches.match(request,{cacheName:shellCache,ignoreSearch:true});if(fallback)return fallback;}
  return Response.error();
 }
}
async function ranged(response,header){
 if(!header)return response;
 const data=await response.blob();
 const part=/^bytes=(\d*)-(\d*)$/.exec(header);
 const invalid=()=>new Response(null,{status:416,headers:{'Content-Range':'bytes */'+data.size}});
 if(!part||(!part[1]&&!part[2]))return invalid();
 const start=part[1]?Number(part[1]):Math.max(0,data.size-Number(part[2]));
 const end=part[1]&&part[2]?Math.min(data.size-1,Number(part[2])):data.size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=data.size)return invalid();
 return new Response(data.slice(start,end+1),{status:206,headers:{
  'Content-Type':response.headers.get('Content-Type')||'application/octet-stream','Accept-Ranges':'bytes',
  'Content-Range':`bytes ${start}-${end}/${data.size}`,'Content-Length':String(end-start+1),
 }});
}
async function play(request){
 const cache=await caches.open(videoCache);
 const hit=await cache.match(request.url);
 if(hit)return ranged(hit,request.headers.get('Range'));
 try{return await fetch(request);}catch{return Response.error();}
}
async function storeWatched(url){
 if(url.origin!==self.location.origin||!mediaPath.test(url.pathname)||url.search||url.hash)return;
 const cache=await caches.open(videoCache);
 if(await cache.match(url.href))return;
 const request=new Request(url.href,{credentials:'omit',cache:'reload'});
 const response=await fetch(request);
 const mime=response.headers.get('Content-Type')||'';
 if(!publicMedia(response)||! /^(?:video|audio)\//.test(mime)||!response.body)return;
 const reader=response.body.getReader(),parts=[];
 let size=0;
 for(;;){
  const {done,value}=await reader.read();
  if(done)break;
  size+=value.byteLength;
  if(size>maxMediaSize){await reader.cancel();return;}
  parts.push(value);
 }
 if(!size)return;
 await cache.put(url.href,new Response(new Blob(parts),{headers:{
  'Content-Type':mime,'Content-Length':String(size),'Accept-Ranges':'bytes',
 }}));
 const keys=await cache.keys();
 let total=0;
 for(const [index,key] of keys.reverse().entries()){
  const item=await cache.match(key);
  if(index>=6||total+Number(item?.headers.get('Content-Length')||0)>maxMediaTotal)await cache.delete(key);
  else total+=Number(item?.headers.get('Content-Length')||0);
 }
}

self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  if(shellRoutes.test(url.pathname)||safePage(url))event.respondWith(navigate(event,req,url));
  return;
 }
 if(mediaPath.test(url.pathname)){
  if(req.destination==='video'||req.destination==='audio'||req.headers.has('Range'))event.respondWith(play(req));
  else if(req.destination==='image')event.respondWith(lookupAsset(event,req,true));
  return;
 }
 if(assets.test(url.pathname))event.respondWith(lookupAsset(event,req,false));
});
async function warmPictures(urls){
 const cache=await caches.open(assetCache);
 await Promise.allSettled(urls.slice(0,24).map(async value=>{
  const url=new URL(value,self.location.origin);
  if(url.origin!==self.location.origin||!(mediaPath.test(url.pathname)||/^\/(?:photos|discovery)\//.test(url.pathname)))return;
  if(await cache.match(url.href))return;
  const response=await fetch(new Request(url.href,{credentials:'omit'}));
  if(response.headers.get('Content-Type')?.startsWith('image/')&&publicMedia(response))await cache.put(url.href,response);
 }));
 const keys=await cache.keys();
 await Promise.all(keys.slice(0,Math.max(0,keys.length-200)).map(key=>cache.delete(key)));
}
let recentQueue=Promise.resolve();
async function pinPictures(values){
 const source=await caches.open(assetCache), pinned=await caches.open(recentCache);
 const urls=new Set(values.slice(0,5).map(value=>new URL(value,self.location.origin)).filter(url=>
  url.origin===self.location.origin&&(mediaPath.test(url.pathname)||/^\/photos\//.test(url.pathname))).map(url=>url.href));
 await Promise.allSettled([...urls].map(async url=>{
  if(await pinned.match(url))return;
  const response=await source.match(url)||await fetch(url,{credentials:'omit'});
  const upload=mediaPath.test(new URL(url).pathname);
  const cacheable=upload?publicMedia(response):response.status===200&&!/no-store|private/i.test(response.headers.get('Cache-Control')||'');
  if(cacheable&&response.headers.get('Content-Type')?.startsWith('image/'))await pinned.put(url,response);
 }));
 await Promise.all((await pinned.keys()).filter(key=>!urls.has(key.url)).map(key=>pinned.delete(key)));
}
let saveQueue=Promise.resolve();
self.addEventListener('message',event=>{
 if(event.data?.type==='jamco-prefetch-page'&&typeof event.data.url==='string'){
  event.waitUntil(prefetchPage(new URL(event.data.url,self.location.origin)));return;
 }
 if(event.data?.type==='jamco-pin-pictures'&&Array.isArray(event.data.urls)){
  recentQueue=recentQueue.then(()=>pinPictures(event.data.urls)).catch(()=>{});
  event.waitUntil(recentQueue);return;
 }
 if(event.data?.type==='jamco-warm-pictures'&&Array.isArray(event.data.urls)){event.waitUntil(warmPictures(event.data.urls).catch(()=>{}));return;}
 if(event.data?.type!=='jamco-watched'||typeof event.data.url!=='string')return;
 saveQueue=saveQueue.then(()=>storeWatched(new URL(event.data.url,self.location.origin))).catch(()=>{});
 event.waitUntil(saveQueue);
});
self.addEventListener('push',event=>{let data;try{data=event.data.json()}catch{return}const url=/^\/habari\/[a-z\d-]+$/.test(data.url)?data.url:'/';event.waitUntil(self.registration.showNotification(data.title||'JAMCO Bukoba',{body:data.body,icon:'/brand/icon-192.png',data:{url},tag:url}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow(event.notification.data?.url||'/'))});
