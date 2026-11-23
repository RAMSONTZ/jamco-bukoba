const CACHE='jamco-bukoba-20261123-1';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('jamco')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.mode==='navigate'||!/^\/(photos\/|discovery\/|discovery\.|brand\/|assets\/|social\.|feed\.|bukoba-guide\.|editorial-media\.|jamco-language\.|theme\.|site\.|manifest\.)/.test(url.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok&&!/private|no-store/.test(response.headers.get('Cache-Control')||'')){event.waitUntil((async()=>{await cache.put(request,response.clone());const keys=await cache.keys();if(keys.length>100)await cache.delete(keys[0])})())}return response})());
});
self.addEventListener('push',event=>{let data;try{data=event.data.json()}catch{return}const url=/^\/habari\/[a-z\d-]+$/.test(data.url)?data.url:'/';event.waitUntil(self.registration.showNotification(data.title||'JAMCO Bukoba',{body:data.body,icon:'/brand/icon-192.png',data:{url},tag:url}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow(event.notification.data?.url||'/'))});
