const CACHE='jamco-social-20261122-v1';
const assets=['/social.css','/social.js','/brand/icon-192.png','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(assets)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('jamco')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/admin')||url.pathname.startsWith('/akaunti')||url.pathname.startsWith('/arifa')||url.pathname.startsWith('/shiriki')||url.pathname.startsWith('/hifadhi')||url.pathname.startsWith('/media/')) return;
  if(request.mode==='navigate') return;
  if(!/^\/(photos\/|assets\/|brand\/|social\.|site\.|manifest\.)/.test(url.pathname)) return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(request.mode!=='navigate') {
      const cached=await cache.match(request);
      if(cached) return cached;
    }
    try {
      const response=await fetch(request);
      if(response.ok && !/private|no-store/.test(response.headers.get('Cache-Control')||'') && (!url.search||request.mode!=='navigate')) {
        await cache.put(request,response.clone());
        const keys=await cache.keys();
        if(keys.length>100) await cache.delete(keys.find(key=>!assets.includes(new URL(key.url).pathname))||keys[0]);
      }
      return response;
    } catch {
      return await cache.match(request) || new Response('Ukurasa haujapakuliwa. Unganisha intaneti kisha ujaribu tena.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
self.addEventListener('push',event=>{
  let data;
  try { data=event.data.json(); } catch { return; }
  const url=/^\/habari\/[a-z\d-]+$/.test(data.url)?data.url:'/';
  event.waitUntil(self.registration.showNotification(data.title||'JAMCO Bukoba',{body:data.body,icon:'/brand/icon-192.png',data:{url},tag:url}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const path=event.notification.data?.url||'/';
  event.waitUntil(self.clients.openWindow(path));
});
