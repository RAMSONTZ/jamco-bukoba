/* JAMCO Studio release: binary1. Never use the public app cache. */
// Studio is network-only: never cache authenticated HTML, API responses or media.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode!=='navigate'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(request).catch(()=>new Response('JAMCO Studio — Huna intaneti. Unganisha intaneti kisha ujaribu tena.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})));
});
