(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',plus:'<rect x="3" y="3" width="18" height="18" rx="6"/><path d="M12 7v10M7 12h10"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',comment:'<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 10 10 0 0 1-4-.9L3 21l1.8-5a8.7 8.7 0 1 1 16.2-4.5z"/>',share:'<path d="m21 3-7 18-4-7-7-4 18-7zM10 14l11-11"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',volume:'<path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',mute:'<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6"/>',play:'<path d="m8 4 12 8-12 8z"/>',pause:'<path d="M8 4v16M16 4v16"/>',expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',check:'<path d="m5 12 4 4L19 6"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>'};
Object.assign(paths,{building:'<path d="m3 9 9-6 9 6zM3 21h18M5 11v7M10 11v7M14 11v7M19 11v7"/>',growth:'<path d="M4 20V10M10 20V7M16 20V3M3 5l5-2 4 3 8-4"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/>',megaphone:'<path d="m3 10 14-5v14L3 14zM6 15l2 6h3l-1-5M20 8l2-2M20 16l2 2"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="m12 7 5 4-2 6H9l-2-6zM12 7V3M17 11l4-2M15 17l2 3M9 17l-2 3M7 11 3 9"/>',sliders:'<path d="M4 6h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="18" r="2"/>'});
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[n]||paths.user}</svg>`;
const nav=[['/','Nyumbani','home'],['/gundua','Gundua','compass'],['/arifa','Arifa','bell'],['/akaunti','Akaunti','user']];
const locale=window.JamcoLanguage,t=locale.t,tr=locale.pair;
const labels=label=>`data-ui="${esc(label)}"`;
const levelBars='<span class="level-bars" aria-hidden="true">'+ '<i></i>'.repeat(8)+'</span>';
const mediaControls='controlslist="nodownload noremoteplayback" disableremoteplayback';
const glyphs=['❤️','👏','🙏','😊','😂','🔥','💯','🎉','🇹🇿'];
const stickers={pole:['🕊️','Pole sana','My condolences'],hongera:['🎉','Hongera','Congratulations'],asante:['🙏','Asante','Thank you'],bukoba:['💚','Bukoba yetu','Our Bukoba']};
const stickerToken=/\[stika:(pole|hongera|asante|bukoba)\]/g;
function commentMarkup(body){
 return esc(body).replace(stickerToken,(_match,key)=>{
  const [emoji,sw,en]=stickers[key];
  return `<span class="comment-sticker"><span aria-hidden="true">${emoji}</span>${esc(tr(sw,en))}</span>`;
 });
}
function plainComment(body){return body.replace(stickerToken,(_match,key)=>stickers[key][0]+' '+tr(stickers[key][1],stickers[key][2]));}
let todayData, loadingMore;

const main=$('#main'),sheet=$('#sheet'),viewer=$('#viewer');
for(const dialog of [sheet,viewer])if(!dialog.close)dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new Event('close'));};let user=null,saved=new Set(),posts=new Map(),offset=0,more=false,filter='',request=0,adminTab='dashboard',adminGrants=[],mediaFiles=[],currentEdit=null,listingDraft=null,viewerScale=1,feedTimer,commentTimer;
let liked=new Set(),initialData={};try{initialData=JSON.parse($('#initial')?.textContent||'{}')}catch{}const publicReads=new Map(),offline=window.JamcoOffline;
if(initialData.offline)offline.setDegraded(true);
const topics=initialData.topics||[{key:'bukoba',label:'Bukoba',icon:'compass'}];let viewerCurrent=null;let topic=initialData.topic||'bukoba',autoRead=false,autoTimer,readInterval=15000,autoSlides=false,slideTimer;
const thumb=url=>/^\/media\/[a-f0-9-]{36}$/.test(url||'')?url+'?w=96&format=webp':url;

let localSaved=[];try{localSaved=JSON.parse(localStorage.getItem('jamco-social-saves')||'[]')}catch{}saved=new Set(localSaved);
const date=x=>{try{return new Intl.DateTimeFormat(locale.locale==='en'?'en-TZ':'sw-TZ',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Dar_es_Salaam'}).format(new Date(x))}catch{return ''}};
const time=x=>{try{return new Intl.DateTimeFormat(locale.locale==='en'?'en-TZ':'sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Dar_es_Salaam'}).format(new Date(x))}catch{return ''}};
function toast(x){const t=$('#toast');t.textContent=x;t.style.display='block';clearTimeout(t.timer);t.timer=setTimeout(()=>t.style.display='none',4500)}
const publicOfflineReads=new Set(['feed','today','stories','discover']);
const privateOfflineReads=new Set(['notifications','saved','my-submissions','my-membership']);
async function api(action,data={}){
 const isFeed=action==='feed',key=JSON.stringify(data),hit=isFeed&&publicReads.get(key);
 if(hit&&hit.until>Date.now())return hit.promise;
 const owner=privateOfflineReads.has(action)||action==='comments'?offline.scope():'';
 const cacheable=publicOfflineReads.has(action)||action==='comments'||(privateOfflineReads.has(action)&&owner);
 const work=(async()=>{
  try{
   if(navigator.onLine===false)throw offline.offlineError();
   const url=isFeed?'/api/feed?'+new URLSearchParams({...data,limit:data.limit||8}):action==='today'?'/api/today':'/api/social/'+action;
   const request=isFeed||action==='today'?{credentials:'omit',cache:'default'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),...(action==='comments'&&!owner?{credentials:'omit'}:{})};
   const response=await fetch(url,{...request,...(typeof AbortSignal.timeout==='function'?{signal:AbortSignal.timeout(10000)}:{})});
   if(response.status>=500){const error=offline.offlineError();error.status=response.status;throw error;}
   offline.setDegraded(false);
   const body=await response.json();
   if(!response.ok){const error=Error(body.message||'Ombi halikufanikiwa.');error.status=response.status;throw error;}
   if(cacheable&&!initialData.qa)await offline.write(action,data,body,owner);
   if(!cacheable&&action!=='me')publicReads.clear();
   return body;
  }catch(error){
   if(!offline.networkError(error))throw error;
   offline.setDegraded(true);
   if(cacheable){
    const cached=await offline.read(action,data,owner);
    if(cached)return cached;
   }
   throw offline.offlineError();
  }
 })();
 if(isFeed){if(publicReads.size>40)publicReads.delete(publicReads.keys().next().value);publicReads.set(key,{promise:work,until:Date.now()+5000});work.catch(()=>publicReads.delete(key));}
 return work;
}
async function flushLogout(){
 if(!offline.logoutPending())return;
 try{await api('logout');}
 catch(error){if(error.status!==401)throw error;}
 offline.finishLogout();
}
async function signOut(){
 ++authRun;
 await offline.beginLogout();
 user=null;saved.clear();liked.clear();localSaved=[];
 try{localStorage.removeItem('jamco-social-saves');}catch{}
 try{await flushLogout();}catch{}
 await init();
}
function imageTag(m,alt,eager=false,thumbnail=false,deferred=false){
 const src=thumbnail?(m.thumbnail||m.url):m.url;const srcset=thumbnail?'':m.srcset||'';const avif=thumbnail?'':m.avifSrcset||'';const load=deferred?'data-src':'src';const sourceAttr=deferred?'data-srcset':'srcset';
 const img=`<img draggable="false" ${load}="${esc(src)}" ${srcset?`${sourceAttr}="${esc(srcset)}" sizes="(max-width: 760px) 100vw, 620px"`:''} ${m.large?`data-fallback="${esc(m.large)}"`:''} width="${thumbnail?96:m.width||640}" height="${thumbnail?96:m.height||640}" alt="${esc(alt)}" ${eager?'fetchpriority="high" loading="eager"':'loading="lazy"'} decoding="async">`;
 return avif?`<picture><source type="image/avif" ${sourceAttr}="${esc(avif)}" sizes="(max-width: 760px) 100vw, 620px">${img}</picture>`:img;
}

function drawNav(){for(const n of ['#desktop-nav','#dock'])$(n).innerHTML=nav.map(([href,label,i])=>`<a class="nav-item ${location.pathname===href?'active':''}" href="${href}" ${location.pathname===href?'aria-current="page"':''}>${icon(i)}<span ${labels(label)}>${esc(t(label))}</span></a>`).join('');$$('[data-icon]').forEach(x=>x.innerHTML=icon(x.dataset.icon));if(user){const a=$('.account-link');if(a)a.innerHTML=user.avatar?`<img src="${esc(user.avatar)}" alt="">`:esc(user.display_name[0])}const compose=$('.compose-avatar img');if(compose)compose.src=user?.avatar?thumb(user.avatar):'/brand/icon-96.png'}
function intro(title,description='',eye='JAMCO BUKOBA'){return `<header class="intro"><div class="eyebrow">${esc(eye)}</div><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</header>`}
function empty(title,body,i='compass'){return `<div class="empty">${icon(i)}<h2>${esc(title)}</h2><p>${esc(body)}</p></div>`}
function needLogin(verified=true){if(!user){openSheet(tr('Jiunge na mazungumzo','Join the conversation'),`<p>${tr('Ingia ili kutoa maoni.','Sign in to comment.')}</p><a class="primary" href="/akaunti">${tr('Ingia au fungua akaunti','Sign in or create an account')}</a>`);return false}if(verified&&!user.verified){toast('Thibitisha barua pepe yako kupitia Akaunti.');return false}return true}
function openSheet(title,html){clearInterval(commentTimer);$('#sheet h2').textContent=title;$('.sheet-body').innerHTML=html;if(!sheet.open){if(sheet.showModal)sheet.showModal();else sheet.setAttribute('open','');}$('[data-close]').onclick=()=>sheet.close()}
function mediaMarkup(p,eager=false){if(!p.media?.length)return '';return `<div class="media-wrap ${p.media.length>1?'media-album':''}"><div class="carousel" tabindex="0" aria-label="${tr('Picha na video za chapisho','Post photos and videos')}" data-carousel="${esc(p.slug)}">${p.media.map((m,i)=>`<div class="media-slide">${m.type==='video'?`<video crossorigin="anonymous" data-offline-source="${esc(m.url)}" src="${esc(m.url)}" preload="none" playsinline muted loop disablepictureinpicture ${mediaControls} ${m.poster?`poster="${esc(m.poster)}"`:''} aria-label="${esc(m.alt||p.title)}"></video><div class="video-controls"><button data-video="play" aria-label="Cheza video" aria-pressed="false">${icon('play')}</button><button data-video="mute" aria-label="Washa sauti" aria-pressed="true">${icon('mute')}</button>${levelBars}<label class="video-volume"><span class="sr-only">Kiwango cha sauti</span><input type="range" min="0" max="1" step="0.05" value="0" data-volume aria-label="Kiwango cha sauti"></label><button data-view="${esc(p.slug)}" data-index="${i}" aria-label="Fungua video">${icon('expand')}</button></div><p class="video-status" role="status"></p>`:m.type==='audio'?`<div class="audio-post"><span>${m.alt==='Muziki'?tr('Muziki','Music'):t('Sauti')}</span>${levelBars}<audio crossorigin="anonymous" controls ${mediaControls} preload="none" data-offline-source="${esc(m.url)}" src="${esc(m.url)}" aria-label="${esc(m.alt||p.title)}"></audio></div>`:`<button data-view="${esc(p.slug)}" data-index="${i}" aria-label="Fungua picha ${i+1}">${imageTag(m,m.alt||p.title,eager&&i===0,false,i>0)}</button>`}</div>`).join('')}</div>${p.media.length>1?`<span class="media-counter">1/${p.media.length}</span>${p.media.every(m=>m.type==='image')?`<button class="carousel-automatic" data-carousel-play aria-label="Badilisha picha kiotomatiki" aria-pressed="false">${icon('play')}</button>`:''}<div class="media-nav"><button data-slide="-1" aria-label="Media iliyotangulia">‹</button><button data-slide="1" aria-label="Media inayofuata">›</button></div><div class="album-steps" role="group" aria-label="${tr('Chagua picha au video','Choose a photo or video')}">${p.media.map((m,i)=>`<button type="button" data-slide-to="${i}" aria-label="${m.type==='video'?tr('Video','Video'):m.type==='audio'?tr('Sauti','Audio'):tr('Picha','Photo')} ${i+1}" aria-current="${i===0?'true':'false'}"><span></span></button>`).join('')}</div>`:''}${p.kind==='photo'?`<span class="archive-label">PICHA · ${esc(date(p.date))}</span>`:''}</div>${p.media[0].credit?`<p class="media-credit">${p.media[0].illustration?'Picha ya mandhari; si picha ya tukio hili. ':''}${esc(p.media[0].credit)} · ${esc(p.media[0].license)} · ${esc(date(p.media[0].date))} · <a href="${esc(p.media[0].source)}" target="_blank" rel="noopener">Chanzo</a></p>`:''}`}
function card(p, expanded=false){
 posts.set(p.slug,p);
 const community=Boolean(p.contributorId),official=!community&&((p.publisher||'').includes('JAMCO')||p.origin==='original');
 const publisher=community?p.contributor||'Mwanajamii':official?'JAMCO Bukoba':p.publisher||'JAMCO Bukoba';
 const when=['original','sponsored'].includes(p.origin)||p.instagramId?time(p.liveAt):date(p.date||p.liveAt);
 const href='/habari/'+esc(p.slug), copy=expanded?p.body||p.summary||p.caption:p.summary||p.body||p.caption;
 const heading=expanded?`<h1>${esc(p.title)}</h1>`:`<h2><a href="${href}">${esc(p.title)}</a></h2>`;
 const event=p.eventDate?`<p class="event-line">${icon('calendar')}${esc(date(p.eventDate))}${p.eventTime?' · '+esc(p.eventTime)+' EAT':''}</p>`:'';
 return `<article class="post ${p.media?.length?'':'post-note'}" data-post="${esc(p.slug)}"><header class="post-head">${p.contributorAvatar?`<img src="${esc(thumb(p.contributorAvatar))}" alt="">`:official?'<img src="/brand/icon-96.png" alt="">':`<span class="publisher-initial" aria-hidden="true">${esc(publisher[0])}</span>`}<div class="publisher"><strong>${esc(publisher)}</strong><small>${esc(p.location||'Bukoba')} · <time datetime="${esc(p.liveAt||p.date)}">${esc(when)}</time></small></div></header>${mediaMarkup(p,posts.size===1&&offset===0)}<div class="post-copy"><span class="type-badge ${p.contentType==='Tahadhari'?'warning':''}">${esc(p.origin==='sponsored'?tr('Tangazo la udhamini','Sponsored'):t(p.contentType||p.category||'Jamii'))}${p.pinned?tr(' · Imebandikwa',' · Pinned'):''}</span>${heading}${event}<p class="caption ${expanded?'article-body':''}">${esc(expanded?copy:(copy||'').slice(0,200))}</p>${!expanded?`<a class="read-link" href="${href}" ${labels('Ona zaidi')}>${t('Ona zaidi')}</a>`:''}${expanded&&p.speech?`<button class="secondary" data-speak="${esc(p.slug)}" ${labels('Sikiliza taarifa')}>${t('Sikiliza taarifa')}</button>`:''}<div class="post-actions"><button data-comments="${esc(p.slug)}" data-ui-label="Maoni" aria-label="Maoni">${icon('comment')}<span>${p.comments||0}</span></button><button data-share="${esc(p.slug)}" aria-label="${tr('Shiriki kiungo','Share link')}">${icon('share')}</button></div></div></article>`;
}
function scheduleMarkup(){
 const d=todayData||initialData.today;
 if(!d?.items?.length||d.day!==new Date().toLocaleDateString('sv-SE',{timeZone:'Africa/Dar_es_Salaam'}))return '';
 const featured=d.items.filter(post=>post.featured),events=d.items.filter(post=>post.eventDate===d.day&&!post.featured);
 const rows=items=>items.map(p=>`<article class="schedule-entry"><a href="/habari/${esc(p.slug)}"><strong>${esc(p.title)}</strong><small>${p.eventTime?esc(p.eventTime)+' EAT · ':''}${esc(p.location||p.category||'Bukoba')}</small></a>${typeof p.phone==='string'&&/^\+?[0-9() .-]{7,24}$/.test(p.phone)?`<a class="schedule-call" href="tel:${p.phone.replace(/[^+0-9]/g,'')}">${tr('Piga simu','Call')}</a>`:''}</article>`).join('');
 return `<section class="today-box today-featured" aria-labelledby="today-title"><header><div><p>${esc(date(d.day))}</p><h1 id="today-title" ${labels('Leo Bukoba')}>${t('Leo Bukoba')}</h1></div><a href="/gundua?category=Matukio"><span ${labels('Matukio')}>${t('Matukio')}</span> →</a></header>${featured.length?`<section class="today-priority"><h2 ${labels('Tangazo muhimu la leo')}>${t('Tangazo muhimu la leo')}</h2>${featured.map(p=>`<a href="/habari/${esc(p.slug)}"><strong>${esc(p.title)}</strong>${p.summary?`<span>${esc(p.summary)}</span>`:''}${p.eventTime&&p.eventDate===d.day?`<small>${esc(p.eventTime)} EAT</small>`:''}</a>`).join('')}</section>`:''}${events.length?`<section class="today-agenda"><h2 ${labels('Ratiba ya leo')}>${t('Ratiba ya leo')}</h2>${rows(events)}</section>`:''}</section>`;
}
function rail(stories=[]){return `<div class="story-rail topic-rail" aria-label="Mada na Story za JAMCO" data-ui-label="Mada na Story za JAMCO"><a class="story-bubble share-bubble" href="/shiriki"><span class="topic-circle"><img src="/brand/icon-96.png" alt=""><b aria-hidden="true">+</b></span><span ${labels('Shiriki nasi')}>${t('Shiriki nasi')}</span></a>${topics.map(t=>`<button class="story-bubble topic-bubble ${topic===t.key?'selected':''}" data-topic="${esc(t.key)}" aria-pressed="${topic===t.key}"><span class="topic-circle">${icon(t.icon)}</span><span ${labels(t.label)}>${esc(locale.t(t.label))}</span></button>`).join('')}${stories.map(x=>{const key='story-'+x.id;posts.set(key,{slug:x.post_slug,title:x.title,media:x.media});const cover=x.media[0];return `<button class="story-bubble live-story" data-view="${esc(key)}" data-index="0"><span class="topic-circle"><img src="${esc(cover.poster?thumb(cover.poster):(cover.type==='image'?thumb(cover.url):'/brand/icon-96.png'))}" alt=""></span><span>${esc(x.title)}</span><small>Story · saa 24</small></button>`}).join('')}</div>`}
const observe=(handler,options)=>typeof IntersectionObserver==='function'?new IntersectionObserver(handler,options):{
 observe:target=>handler([{target,isIntersecting:true,intersectionRatio:0}]),unobserve(){},disconnect(){},
};
const photoObserver=observe(entries=>{for(const e of entries)if(e.isIntersecting){const image=e.target;const picture=image.closest('picture');if(picture)$$('source[data-srcset]',picture).forEach(source=>{source.srcset=source.dataset.srcset;delete source.dataset.srcset});if(image.dataset.srcset){image.srcset=image.dataset.srcset;delete image.dataset.srcset}image.src=image.dataset.src;delete image.dataset.src;photoObserver.unobserve(image)}},{rootMargin:'200px 0px'});
document.addEventListener('error',e=>{const image=e.target;if(image.tagName!=='IMG'||!image.dataset.fallback||image.dataset.retried)return;image.dataset.retried='1';const picture=image.closest('picture');if(picture)$$('source',picture).forEach(source=>source.remove());image.removeAttribute('srcset');image.src=image.dataset.fallback},true);
function syncVideo(v){const parent=v.closest('.media-slide');if(!parent)return;const play=$('[data-video="play"]',parent),mute=$('[data-video="mute"]',parent),volume=$('[data-volume]',parent);if(play){play.innerHTML=icon(v.paused?'play':'pause');play.setAttribute('aria-label',v.paused?'Cheza video':'Simamisha video');play.setAttribute('aria-pressed',String(!v.paused))}if(mute){mute.innerHTML=icon(v.muted||v.volume===0?'mute':'volume');mute.setAttribute('aria-label',v.muted||v.volume===0?'Washa sauti':'Zima sauti');mute.setAttribute('aria-pressed',String(v.muted||v.volume===0))}if(volume)volume.value=String(v.muted?0:v.volume)}
function pauseOtherVideos(except){document.querySelectorAll('video,audio').forEach(v=>{if(v!==except)v.pause()})}
function carouselActive(c){return c.dataset.autoPaused!=='1'&&(c.dataset.auto==='1'||autoSlides)}
function syncCarousel(c){const b=$('[data-carousel-play]',c.parentNode);if(b){b.innerHTML=icon(carouselActive(c)?'pause':'play');b.setAttribute('aria-label',carouselActive(c)?'Simamisha picha zinazobadilika':'Badilisha picha kiotomatiki');b.setAttribute('aria-pressed',String(carouselActive(c)))}}
function bindMedia(root=main){if(offline.isOffline())$$('[data-offline-source]',root).forEach(media=>offline.prepareMedia(media));$$('img[data-src]',root).forEach(img=>photoObserver.observe(img));$$('.carousel',root).forEach(c=>{if(!c.dataset.bound){c.dataset.bound='1';c.addEventListener('scroll',()=>{const n=Math.round(c.scrollLeft/c.clientWidth),counter=$('.media-counter',c.parentNode);if(counter)counter.textContent=`${n+1}/${c.children.length}`;$$('[data-slide-to]',c.parentNode).forEach((b,i)=>b.setAttribute('aria-current',String(i===n)))},{passive:true});c.addEventListener('pointerdown',e=>{if(e.target.closest('[data-carousel-play]'))return;c.dataset.autoPaused='1';syncCarousel(c)},{passive:true})}syncCarousel(c)});$$('video',root).forEach(v=>{videoObserver.observe(v);if(!v.dataset.tracking){v.dataset.tracking='1';['play','pause','volumechange','ended'].forEach(event=>v.addEventListener(event,()=>syncVideo(v)));v.addEventListener('play',()=>{pauseOtherVideos(v);const status=$('.video-status',v.parentNode);if(status)status.textContent=''});v.addEventListener('error',()=>{const status=$('.video-status',v.parentNode);if(status)status.textContent=offline.isOffline()?tr('Unganisha intaneti ikiwa video hii haijahifadhiwa.','Connect to load this video if it isn’t saved.'):tr('Video haijapakiwa. Bonyeza Cheza ili ujaribu tena.','The video could not load. Select Play to try again.')});v.addEventListener('timeupdate',()=>{if(v.currentTime>=2&&!v.dataset.counted&&user){v.dataset.counted='1';const slug=v.closest('[data-post]')?.dataset.post;if(slug&&!initialData.qa)api('view',{slug}).catch(()=>{})}})}syncVideo(v)});clearInterval(slideTimer);slideTimer=setInterval(()=>{if(document.hidden||viewer.open||sheet.open)return;$$('.carousel').filter(c=>carouselActive(c)&&c.children.length>1&&!$('video',c)).forEach(c=>{const r=c.getBoundingClientRect();if(r.top<innerHeight*.65&&r.bottom>innerHeight*.35){const n=(Math.round(c.scrollLeft/c.clientWidth)+1)%c.children.length;c.scrollTo({left:n*c.clientWidth,behavior:motion()})}})},6000)}
const videoObserver=observe(entries=>{for(const e of entries){const v=e.target;if(e.isIntersecting&&e.intersectionRatio>=.7&&!v.dataset.paused&&document.visibilityState==='visible'&&!viewer.open){pauseOtherVideos(v);v.play().catch(()=>syncVideo(v))}else v.pause()}},{threshold:[0,.7]});
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
function feedArgs(){return {offset,topic,category:filter==='Jamii'?'Jamii':'',kind:filter==='Habari'?'story':'',media:filter==='Picha'?'image':filter==='Video'?'video':filter==='Sauti'?'audio':filter==='Maandishi'?'text':''}}
const feedEnd = typeof IntersectionObserver==='function' ? new IntersectionObserver(entries=>{
 if(entries.some(e=>e.isIntersecting)&&more)loadMore().catch(error=>paginationError(error));
},{rootMargin:'420px 0px'}) : null;
function paginationError(error){
 const zone=$('#load-zone');
 if(zone)zone.innerHTML=offline.networkError(error)?`<small data-reconnect>${esc(tr('Unganisha intaneti kupata machapisho zaidi.','Connect to the internet for more posts.'))}</small>`:
  `<button class="secondary" data-load>${t('Jaribu tena')}</button><small>${esc(error.message)}</small>`;
}
async function loadMore(){
 if(loadingMore||!more)return loadingMore;
 loadingMore=feed(false);
 try{return await loadingMore}finally{loadingMore=null}
}
async function feed(reset=true){
 const generation=++request;
 if(reset){
  offset=0;more=false;posts.clear();photoObserver.disconnect();videoObserver.disconnect();feedEnd?.disconnect();
  main.innerHTML=`<div id="rail">${rail()}</div><div id="today">${topic==='bukoba'&& !initialData.qa?scheduleMarkup():''}</div><div class="feed-tools"><button data-auto-feed aria-pressed="false"></button><button data-feed-options aria-label="${t('Chaguo za media')}" title="${t('Chaguo za media')}">${icon('sliders')}</button><span id="feed-auto-status" role="status"></span></div><div class="tabs" role="group" aria-label="${tr('Chuja machapisho','Filter posts')}">${[['','Zote'],['Habari','Habari'],['Picha','Picha'],['Video','Video'],['Sauti','Sauti'],['Maandishi','Maandishi']].map(([value,label])=>`<button class="tab ${filter===value?'active':''}" data-filter="${value}" aria-pressed="${filter===value}" ${labels(label)}>${t(label)}</button>`).join('')}</div><div id="feed-list" aria-busy="true"><div class="skeleton app-start"><img src="/brand/icon-96.png" alt="" width="36" height="36"><div></div></div></div><div id="load-zone" class="feed-end" role="status"></div>`;
  if(topic==='bukoba'&&!initialData.qa&&!initialData.today&&!todayData)api('today').then(d=>{if(d){todayData=d;if($('#today')&&topic==='bukoba')$('#today').innerHTML=scheduleMarkup()}}).catch(()=>{});
 }
 const list=$('#feed-list'),zone=$('#load-zone');
 if(!reset)zone.textContent=t('Inapakia…');
 const args=feedArgs();
 const preloaded=reset&&!filter&&topic===(initialData.topic||'bukoba')&&initialData.feed;
 const data=preloaded||await api('feed',args);
 if(preloaded&&!initialData.qa){
  await offline.write('feed',args,data);
  if(initialData.today)offline.write('today',{},initialData.today);
 }
 if(generation!==request)return;
 if(reset)initialData.feed=null;
 const html=data.posts.map(post=>card(post)).join('');
 if(reset){
  list.innerHTML=html||empty(tr('Bado hakuna machapisho ya mada hii','No posts in this topic yet'),tr('Taarifa mpya za JAMCO zitaonekana hapa.','New JAMCO updates will appear here.'));
  if(!initialData.qa)api('stories').then(result=>{if($('#rail'))$('#rail').innerHTML=rail(result.items||[])}).catch(()=>{});
 }else list.insertAdjacentHTML('beforeend',html);
 list.setAttribute('aria-busy','false');
 offset+=data.posts.length;more=data.more&&data.posts.length>0;
 zone.innerHTML=more?(feedEnd?'':'<button class="secondary" data-load>'+tr('Pakia zaidi','Load more')+'</button>'):(data.posts.length&&!initialData.qa?t('Umefika mwisho.'):'');
 feedEnd?.disconnect();if(more&&feedEnd)feedEnd.observe(zone);
 bindMedia();clearInterval(feedTimer);if(!initialData.qa)feedTimer=setInterval(refreshFeed,20000);
 updateAutoRead();if(autoRead)scheduleAutoRead();
}

let lastTodayRefresh=Date.now();
async function refreshFeed(){if(navigator.onLine===false||document.hidden||sheet.open||viewer.open||location.pathname!=='/')return;if(topic==='bukoba'&&Date.now()-lastTodayRefresh>55_000){
 lastTodayRefresh=Date.now();api('today').then(data=>{if(data){todayData=data;if($('#today')&&topic==='bukoba')$('#today').innerHTML=scheduleMarkup()}}).catch(()=>{});
 }try{const d=await api('feed',{...feedArgs(),offset:0});const top=$('.post');if(d.posts[0]&&top&&top.dataset.post!==d.posts[0].slug){if(!$('[data-refresh]'))$('#feed-list').insertAdjacentHTML('beforebegin','<div class="load"><button class="primary" data-refresh>Machapisho mapya · Onyesha</button></div>')}for(const p of d.posts){const el=$(`[data-post="${p.slug}"]`);if(el){$('[data-like] span',el).textContent=p.likes;$('[data-comments] span',el).textContent=p.comments}}}catch{}}
function updateAutoRead(){const b=$('[data-auto-feed]');if(b){b.setAttribute('aria-pressed',String(autoRead));b.innerHTML=icon(autoRead?'pause':'play')+'<span>'+(t(autoRead?'Simamisha auto-scroll':'Anza auto-scroll'))+'</span>'}const s=$('#feed-auto-status');if(s)s.textContent=autoRead?'Kila sekunde '+readInterval/1000:''}
function stopAutoRead(){autoRead=false;clearTimeout(autoTimer);$$('.post[aria-current]',main).forEach(p=>p.removeAttribute('aria-current'));updateAutoRead()}
function scheduleAutoRead(){clearTimeout(autoTimer);if(!autoRead)return;autoTimer=setTimeout(async()=>{if(!autoRead)return;if(document.hidden||viewer.open||sheet.open){scheduleAutoRead();return}let list=$$('.post',main),current=list.findIndex(p=>p.getBoundingClientRect().bottom>150);if(current<0)current=0;let next=list[current+1];if(!next&&more){await loadMore();if(!autoRead)return;list=$$('.post',main);next=list[current+1]}if(!next){stopAutoRead();toast('Umefika mwisho wa machapisho.');return}$$('.post[aria-current]',main).forEach(p=>p.removeAttribute('aria-current'));next.setAttribute('aria-current','true');window.scrollTo({top:scrollY+next.getBoundingClientRect().top-80,behavior:motion()});scheduleAutoRead()},readInterval)}
function feedOptions(){openSheet('Chaguo za kutazama',`<form id="feed-options" class="form"><p>Auto-scroll huanza ukibonyeza Anza. Kugusa chapisho, kutumia kibodi au kuscroll mwenyewe huisimamisha.</p><label>Muda wa auto-scroll<select name="interval">${[8,15,25].map(n=>`<option value="${n*1000}" ${readInterval===n*1000?'selected':''}>Sekunde ${n}</option>`).join('')}</select></label><label class="check"><input type="checkbox" name="slides" ${autoSlides?'checked':''}>Picha nyingi zibadilike zenyewe ukiwa unazitazama</label><p>Unaweza pia kuwasha au kusimamisha mzunguko wa picha kwenye chapisho moja. Video huanza bila sauti; Washa sauti ukitaka kuisikiliza.</p><button class="primary">Hifadhi chaguo</button></form>`);$('#feed-options').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);readInterval=[8000,15000,25000].includes(Number(d.get('interval')))?Number(d.get('interval')):15000;autoSlides=d.has('slides');$$('.carousel').forEach(c=>{delete c.dataset.autoPaused;syncCarousel(c)});sheet.close();updateAutoRead();scheduleAutoRead()}}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-auto-feed],[data-feed-options]'))stopAutoRead()},{passive:true});document.addEventListener('wheel',stopAutoRead,{passive:true});document.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End','Escape','Tab'].includes(e.key))stopAutoRead()});document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause());else scheduleAutoRead()});
document.addEventListener('keydown',e=>{if(viewer.open&&viewerCurrent&&$('.viewer-stage img')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const p=posts.get(viewerCurrent.slug);view(viewerCurrent.slug,(viewerCurrent.index+(e.key==='ArrowRight'?1:-1)+p.media.length)%p.media.length)}});
document.addEventListener('input',e=>{if(e.target.matches('[data-volume]')){const v=$('video',e.target.closest('.media-slide'));v.volume=Math.max(0,Math.min(1,Number(e.target.value)));v.muted=v.volume===0;syncVideo(v);window.JamcoMedia.meter(v,$$('.level-bars i',v.closest('.media-slide')))}});
async function comments(slug){const p=posts.get(slug);openSheet(t('Maoni'),'<p class="muted">'+tr('Inapakia maoni…','Loading comments…')+'</p>');let parent=null,editing=null;
 const render=async()=>{const d=await api('comments',{slug});if(!sheet.open)return;const html=d.comments.length?d.comments.map(c=>c.origin==='instagram'?`<article class="comment external-comment"><span class="source-label">INSTAGRAM · IMELETWA KUTOKA CHANZO</span><header><strong>@${esc(c.display_name)}</strong><time>${esc(time(c.created_at))}</time></header><p>${esc(c.body)}</p></article>`:`<article class="comment ${c.parent_id?'reply':''}"><header>${c.avatar?`<img class="comment-avatar" src="${esc(thumb(c.avatar))}" alt="">`:`<span class="comment-initial" aria-hidden="true">${esc(c.display_name[0])}</span>`}<strong>${esc(c.display_name)}</strong><time>${esc(time(c.created_at))}${c.edited_at?' · imehaririwa':''}</time></header>${c.parent_id?'<small>Jibu kwa maoni ya awali</small>':''}<p>${commentMarkup(c.body)}</p><div class="comment-actions"><button data-copy-comment="${c.id}" data-ui="Nakili maoni">Nakili maoni</button><button data-clike="${c.id}" data-liked="${c.liked}">Penda · ${c.likes}</button><button data-reply="${c.id}" data-name="${esc(c.display_name)}" data-ui="Jibu">Jibu</button>${user?.id===c.user_id?`<button data-edit="${c.id}" data-ui="Hariri">Hariri</button><button data-delete="${c.id}" data-ui="Futa">Futa</button>`:`<button data-report-comment="${c.id}" data-ui="Ripoti">Ripoti</button>`}</div></article>`).join(''):empty('Anza mazungumzo','Bado hakuna maoni.','comment');let holder=$('#comments-list');if(!holder){$('.sheet-body').innerHTML='<div id="comments-list"></div><form class="form comment-form"><small id="reply-to"></small><label><span data-ui="Maoni yako">Maoni yako</span><textarea name="body" maxlength="2000" required placeholder="Shiriki mawazo yako…"></textarea></label><div class="comment-emoji" aria-label="Emoji na vibandiko">'+glyphs.map(g=>'<button type="button" data-emoji="'+g+'">'+g+'</button>').join('')+'</div><div class="comment-stickers" aria-label="Stika">'+Object.entries(stickers).map(([k,v])=>'<button type="button" data-emoji="[stika:'+k+']" title="'+esc(tr(v[1],v[2]))+'">'+v[0]+'</button>').join('')+'</div><div class="form-foot"><button class="primary" data-ui="Tuma maoni">Tuma maoni</button><button type="button" class="text-button" data-cancel-reply data-ui="Ghairi jibu">Ghairi jibu</button></div><p class="form-status" role="status"></p></form>';holder=$('#comments-list');$('.comment-form').onsubmit=async e=>{e.preventDefault();if(!needLogin(false))return;await submit(e.currentTarget,async d=>{const result=await api(editing?'comment-edit':'comment',editing?{id:editing,body:d.body}:{slug,body:d.body,parent});parent=editing=null;e.target.reset();$('#reply-to').textContent='';await render();return result})}}holder.innerHTML=html;
 holder.onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.reply){if(!needLogin(false))return;parent=b.dataset.reply;editing=null;$('#reply-to').textContent='Jibu kwa '+b.dataset.name;$('textarea',sheet).focus()}if(b.dataset.edit){editing=b.dataset.edit;parent=null;$('textarea',sheet).value=d.comments.find(x=>x.id===editing).body;$('#reply-to').textContent='Hariri maoni yako';$('textarea',sheet).focus()}if(b.dataset.delete){await api('comment-delete',{id:b.dataset.delete});await render()}if(b.dataset.clike){if(!needLogin(false))return;await api('comment-like',{id:b.dataset.clike,active:b.dataset.liked!=='true'});await render()}if(b.dataset.copyComment){const message=d.comments.find(item=>item.id===b.dataset.copyComment);if(message){await navigator.clipboard.writeText(plainComment(message.body));toast(tr('Maoni yamenakiliwa.','Comment copied.'))}}if(b.dataset.reportComment)report(slug,b.dataset.reportComment)}catch(err){toast(err.message)}};
 $('[data-cancel-reply]').onclick=()=>{parent=editing=null;$('#reply-to').textContent='';$('textarea',sheet).value=''};};try{await render()}catch(error){if(!offline.networkError(error))throw error;$('.sheet-body').innerHTML='<p>'+esc(tr('Maoni haya hayajahifadhiwa kwenye kifaa hiki.','These comments haven’t been saved on this device.'))+'</p>';return;}commentTimer=setInterval(()=>{if(offline.isOffline()||document.hidden||$('textarea',sheet)?.value)return;render().catch(()=>{})},12000)}
function report(slug,comment){if(!needLogin(false))return;openSheet('Ripoti maudhui',`<form class="form" id="report-form"><label>Sababu<textarea name="reason" required minlength="5" maxlength="1500"></textarea></label><button class="primary">Tuma kwa msimamizi</button><p class="form-status" role="status"></p></form>`);$('#report-form').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async d=>{await api('report',{slug,comment,reason:d.reason});sheet.close();toast('Taarifa imepokelewa.')})}}
function view(slug,index=0){const p=posts.get(slug),m=p?.media?.[index];if(!m)return;viewerCurrent={slug,index};stopAutoRead();const source=$(`[data-post="${slug}"] .media-slide:nth-child(${index+1}) video`);const videoState=source?{muted:source.muted,volume:source.volume,time:source.currentTime}:{muted:true,volume:1,time:0};document.querySelectorAll('video').forEach(v=>v.pause());viewerScale=1;$('.viewer-stage').innerHTML=m.type==='video'?`<video crossorigin="anonymous" data-offline-source="${esc(m.url)}" src="${esc(m.url)}" controls ${mediaControls} disablepictureinpicture playsinline autoplay ${videoState.muted?'muted':''}></video>`:m.type==='audio'?`<audio crossorigin="anonymous" controls ${mediaControls} data-offline-source="${esc(m.url)}" src="${esc(m.url)}"></audio>`:`<img src="${esc(m.large||m.url)}" alt="${esc(m.alt||p.title)}" draggable="false">`;$('.viewer-credit').textContent=[m.alt||p.title,m.credit,m.license,m.date&&date(m.date)].filter(Boolean).join(' · ');if(!viewer.open){if(viewer.showModal)viewer.showModal();else viewer.setAttribute('open','');}let sequence=$('.viewer-sequence',viewer);if(!sequence){sequence=document.createElement('div');sequence.className='viewer-sequence';sequence.setAttribute('aria-label','Badilisha media');viewer.append(sequence)}sequence.innerHTML=p.media.length>1?`<button data-view-step="-1" aria-label="Media iliyotangulia">‹ Nyuma</button><span>${index+1}/${p.media.length}</span><button data-view-step="1" aria-label="Media inayofuata">Mbele ›</button>`:'';sequence.onclick=e=>{const b=e.target.closest('[data-view-step]');if(b)view(slug,(index+Number(b.dataset.viewStep)+p.media.length)%p.media.length)};const full=$('.viewer-stage video');if(offline.isOffline())$$('[data-offline-source]',viewer).forEach(media=>offline.prepareMedia(media));if(full){full.volume=videoState.volume;full.muted=videoState.muted;full.addEventListener('loadedmetadata',()=>{if(videoState.time<full.duration)full.currentTime=videoState.time},{once:true});full.addEventListener('play',()=>pauseOtherVideos(full))}const im=$('.viewer-stage img');if(im){const pointers=new Map();let distance=0,startScale=1,x=0,y=0,last=null;const apply=()=>{im.style.transform=`translate(${x}px,${y}px) scale(${viewerScale})`};im.onpointerdown=e=>{im.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];distance=Math.hypot(a.x-b.x,a.y-b.y);startScale=viewerScale}last={x:e.clientX,y:e.clientY}};im.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const[a,b]=[...pointers.values()];viewerScale=Math.max(1,Math.min(5,startScale*Math.hypot(a.x-b.x,a.y-b.y)/distance))}else if(viewerScale>1&&last){x+=e.clientX-last.x;y+=e.clientY-last.y}last={x:e.clientX,y:e.clientY};apply()};im.onpointerup=im.onpointercancel=e=>{pointers.delete(e.pointerId);last=null};im.ondblclick=()=>{viewerScale=viewerScale===1?2:1;x=y=0;apply()};viewer.zoom=(how)=>{viewerScale=how==='reset'?1:Math.max(1,Math.min(5,viewerScale+(how==='in'?.5:-.5)));if(viewerScale===1)x=y=0;apply()}}}
$('.viewer-close').onclick=()=>viewer.close();viewer.addEventListener('close',()=>{$('.viewer-stage').innerHTML='';viewerScale=1;viewer.zoom=null;viewerCurrent=null;const sequence=$('.viewer-sequence',viewer);if(sequence)sequence.innerHTML=''});$$('[data-zoom]').forEach(b=>b.onclick=()=>viewer.zoom?.(b.dataset.zoom));sheet.addEventListener('close',()=>clearInterval(commentTimer));
async function submit(form,fn){const button=$('[type=submit],button:not([type])',form),status=$('.form-status',form);if(button)button.disabled=true;if(status){status.classList.remove('error');status.textContent='Inahifadhi…'}try{const d={};new FormData(form).forEach((v,k)=>d[k]=v);$$('input[type=checkbox]',form).forEach(x=>d[x.name]=x.checked);const r=await fn(d);if(status)status.textContent=r?.message||'Imehifadhiwa.';return r}catch(e){if(status){status.textContent=e.message;status.classList.add('error')}else toast(e.message)}finally{if(button)button.disabled=false}}
async function account(){
 if(offline.isOffline()){
  main.innerHTML=user?`<section class="panel"><h1>${esc(user.display_name)}</h1><p>${esc(user.location||'Bukoba')}</p><div class="profile-links"><a href="/arifa">${t('Arifa')}</a><a href="/hifadhi">${tr('Zilizohifadhiwa','Saved posts')}</a><button type="button" class="secondary" data-offline-logout>${tr('Toka','Sign out')}</button></div></section>`:
   intro(t('Akaunti'),tr('Unganisha intaneti ili kuingia au kufungua akaunti.','Connect to sign in or create an account.'));
  $('[data-offline-logout]')?.addEventListener('click',()=>signOut().catch(error=>toast(error.message)));
  return;
 }
 const params=new URLSearchParams(location.search);if(params.has('token')){const purpose=params.get('purpose');main.innerHTML=intro('Thibitisha akaunti')+`<section class="panel"><form id="token-form" class="form">${purpose!=='verify'?'<label>Nenosiri jipya<input name="password" type="password" minlength="14" autocomplete="new-password" required></label>':'<p>Bonyeza kuthibitisha barua pepe yako.</p>'}<button class="primary">Thibitisha</button><p class="form-status" role="status"></p></form></section>`;$('#token-form').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async d=>{const r=await api('token',{...d,token:params.get('token')});history.replaceState({},'','/akaunti');toast(r.message);await init();return r})};return}
 if(!user){main.innerHTML=intro(tr('Karibu kwenye jamii.','Welcome to the community.'),tr('Soma bila akaunti. Jiunge ili kutoa maoni.','Read without an account. Sign in to comment.'))+`<section class="panel"><div class="tabs"><button class="tab active" data-auth="login" data-ui="Ingia">Ingia</button><button class="tab" data-auth="register" data-ui="Fungua akaunti">Fungua akaunti</button></div><div id="auth-form"></div></section><div class="empty"><a href="/admin">Mmiliki au mchapishaji? Ingia hapa</a></div>`;const authForm=(mode)=>{$('#auth-form').innerHTML=`<form class="form" id="member-auth">${mode==='register'?'<label><span data-ui="Jina la kuonekana">Jina la kuonekana</span><input name="name" autocomplete="name" maxlength="80" required></label>':''}<label><span data-ui="Barua pepe">Barua pepe</span><input name="email" type="email" autocomplete="email" required></label><label><span data-ui="Nenosiri">Nenosiri</span><input name="password" type="password" autocomplete="${mode==='register'?'new-password':'current-password'}" ${mode==='register'?'minlength="14"':''} required></label>${mode==='register'?'<label class="check"><input type="checkbox" name="consent" required> Nimekubali <a href="/faragha">sera ya faragha</a></label>':''}<button class="primary" ${labels(mode==='register'?'Fungua akaunti':'Ingia')}>${t(mode==='register'?'Fungua akaunti':'Ingia')}</button><p class="form-status" role="status"></p><button class="text-button" type="button" data-recover data-ui="Umesahau nenosiri?">Umesahau nenosiri?</button></form>`;$('#member-auth').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async d=>{await flushLogout();const r=await api(mode,d);toast(r.message);await init();return r})};$('[data-recover]').onclick=()=>recovery(false)};authForm('login');$$('[data-auth]').forEach(b=>b.onclick=()=>{$$('[data-auth]').forEach(x=>x.classList.toggle('active',x===b));authForm(b.dataset.auth)});return}
 const [sub,member]=await Promise.all([api('my-submissions'),api('my-membership')]);main.innerHTML=`<div class="profile-hero"><div class="profile-photo">${user.avatar?`<img src="${esc(user.avatar)}" alt="Picha ya wasifu">`:icon('user')}</div><h1>${esc(user.display_name)}</h1><p>${esc(user.location||'Mwanajamii wa JAMCO')} ${user.premium_until&&Date.parse(user.premium_until)>Date.now()?' · Premium':''}</p><div class="profile-links"><a href="/hifadhi">Zilizohifadhiwa</a><a href="/arifa">Arifa</a><button class="text-button" data-logout>Toka</button></div></div>${!user.verified?'<div class="panel"><h2>Thibitisha barua pepe</h2><p>Unaweza kutoa maoni na kubadilisha picha ya wasifu. Uthibitisho wa barua pepe ni kwa ulinzi wa akaunti.</p><button class="secondary" data-verify>Tuma barua ya uthibitisho</button></div>':''}<section class="panel"><h2>Wasifu na mapendeleo</h2><form class="form" id="profile-form"><label>Jina<input name="name" value="${esc(user.display_name)}" required maxlength="80"></label><label>Eneo la jumla<input name="location" value="${esc(user.location)}" maxlength="140"></label><label>Kuhusu wewe<textarea name="bio" maxlength="500">${esc(user.bio)}</textarea></label><label>Picha ya wasifu<input type="file" name="avatarFile" accept="image/jpeg,image/png,image/webp"></label><h3>Arifa za ndani ya akaunti</h3>${[['posts','Machapisho mapya'],['replies','Majibu ya maoni'],['submissions','Hali ya taarifa'],['membership','Maamuzi ya uanachama']].map(([k,l])=>`<label class="check"><input name="pref-${k}" type="checkbox" ${user.preferences?.[k]!==false?'checked':''}>${l}</label>`).join('')}<button class="primary">Hifadhi wasifu</button><p class="form-status" role="status"></p></form><button class="text-button" data-push>Arifa za kivinjari</button></section><section class="panel"><h2>Taarifa ulizowasilisha</h2>${sub.items.length?sub.items.map(x=>`<div class="list-item"><h3>${esc(x.headline)}</h3><span class="status">${esc(statusLabel(x.status))}</span><p>${esc(x.editorial_note)}</p>${x.post_url?`<a class="read-link" href="${esc(x.post_url)}">Fungua chapisho</a>`:''}</div>`).join(''):'<p>Hakuna taarifa zilizowasilishwa bado.</p>'}<a href="/shiriki" class="secondary">Shiriki taarifa</a></section><section class="panel"><h2>Uanachama wa Premium</h2><p>Omba hali ya Premium. Timu ya JAMCO itapitia ombi lako. Bei haijawekwa.</p><button class="secondary" data-premium>Omba Premium</button>${member.items.map(x=>`<div class="list-item"><span class="status">${esc(statusLabel(x.status))}</span>${x.expires_at?` · ${esc(date(x.expires_at))}`:''}<p>${esc(x.note)}</p></div>`).join('')}</section>`;
 $('#profile-form').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async d=>{let avatar;const file=$('[name=avatarFile]').files[0];if(file)avatar=(await uploadFile(file)).id;const preferences=Object.fromEntries(['posts','replies','submissions','membership'].map(k=>[k,d['pref-'+k]]));const r=await api('profile',{...d,avatar,preferences});user=(await api('me')).user;drawNav();return r})};$('[data-logout]').onclick=()=>signOut().catch(error=>toast(error.message));$('[data-verify]')?.addEventListener('click',()=>api('verify-send').then(r=>toast(r.message)).catch(e=>toast(e.message)));$('[data-premium]').onclick=()=>{if(needLogin())api('premium').then(r=>{toast(r.message);account()}).catch(e=>toast(e.message))};$('[data-push]').onclick=push;
}
function recovery(isStaff){openSheet('Rejesha akaunti',`<form id="recover-form" class="form"><p>Kiungo cha kurejesha nenosiri kitatumwa ikiwa huduma ya barua pepe imeunganishwa. MFA itaendelea kuhitajika kwa wasimamizi.</p><label><span data-ui="Barua pepe">Barua pepe</span><input name="email" type="email" required></label><button class="primary">Tuma kiungo</button><p class="form-status" role="status"></p></form>`);$('#recover-form').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,d=>api('recover',{...d,staff:isStaff}))}}
async function push(){try{if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)){toast('Arifa za kivinjari hazitumiki hapa. Tumia Arifa kwenye akaunti.');return}const permission=await Notification.requestPermission();if(permission!=='granted'){toast('Arifa hazijaruhusiwa.');return}const reg=await navigator.serviceWorker.ready;const config=await fetch('/api/push-config').then(x=>x.json());if(!config.key)throw Error('Huduma ya arifa bado haijaunganishwa.');const s=config.key.replace(/-/g,'+').replace(/_/g,'/'),raw=atob(s.padEnd(Math.ceil(s.length/4)*4,'=')),key=Uint8Array.from(raw,c=>c.charCodeAt(0));const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:subscription.toJSON(),categories:['Habari muhimu','Bukoba','Matukio','Jamii']})}).then(x=>x.json());toast(r.message||'Chaguo limehifadhiwa.')}catch(e){toast(e.message)}}
const statusLabel=s=>({submitted:'Imewasilishwa',review:'Inapitiwa',information:'Maelezo zaidi yanahitajika',approved:'Imeidhinishwa',published:'Imechapishwa',rejected:'Imekataliwa',pending:'Inasubiri',revoked:'Imeondolewa'}[s]||s);
function discoveryRecord(item,ui,guide){
 const data=item.data, article=item.kind!=='listing'||data.contentType==='Wasifu wa huduma',href='/habari/'+esc(item.slug);
 return `<article class="discovery-result${['Boda boda','Teksi'].includes(data.category)?' driver-card':''}">${item.preview?`${article?`<a href="${href}" tabindex="-1" aria-hidden="true">`:''}${ui.discoveryPicture(item.preview,data.title,'(max-width:480px) 120px, 270px')}${article?'</a>':''}`:''}<div class="discovery-result-copy"><span class="type-badge">${esc(t(data.contentType||data.category||'Habari'))}</span><h3>${article?`<a href="${href}">${esc(data.title)}</a>`:esc(data.title)}</h3><p>${esc((data.summary||'').slice(0,190))}</p><p class="discovery-meta">${esc(data.location||'Bukoba')}${data.eventDate||data.date?' · '+esc(date(data.eventDate||data.date)):''}${data.eventTime?' · '+esc(data.eventTime)+' EAT':''}</p>${guide.actionLinks({...data,source:article?'':data.source},locale.locale)}${article?`<a class="read-link" href="${href}" ${labels('Ona zaidi')}>${t('Ona zaidi')} →</a>`:''}</div></article>`;
}
let discoveryRead, discoveryRun=0;
async function discover(){
 const generation=++discoveryRun;
 const [ui,guide]=await Promise.all([import('/discovery.js?v=20261124offline'),import('/bukoba-guide.js?v=2')]);
 if(generation!==discoveryRun)return;
 const params=new URLSearchParams(location.search),category=(params.get('category')||'').slice(0,80),q=(params.get('q')||'').slice(0,100),selected=ui.categoryFor(category);
 if(!$('.discovery-page'))main.innerHTML=ui.discoveryPage(category,q);
 if(params.has('search'))$('#discovery-query')?.focus();
 const results=$('#discover-results'),gallery=$('#discovery-gallery'),count=$('#discovery-count');$('.local-inquiry')?.remove();
 if(!results)return;
 const listing=guide.localDirectory(selected?.key,q,locale.locale);
 if(listing)gallery.innerHTML=`<section class="local-section" aria-label="${tr('Mawasiliano na huduma','Services and contacts')}"><h2>${tr('Mawasiliano na huduma','Services and contacts')}</h2><div class="local-grid">${listing}</div></section>`;else gallery.innerHTML='';
 try{
  discoveryRead ??= api('discover',{q,category:selected?.label||category}).catch(error=>{discoveryRead=null;throw error});
  const data=await discoveryRead;
  if(generation!==discoveryRun)return;
  let matches=data.items.filter(item=>ui.matchesDiscovery(item,category,''));
  results.closest('.discovery-section').hidden=Boolean(listing&&!matches.length);
  count.textContent=matches.length?`${matches.length} ${tr('taarifa','results')}`:'';
  const render=items=>items.map(item=>discoveryRecord(item,ui,guide)).join('');
  const isDirectory=['hoteli','utalii','migahawa','usafiri','boda-boda','teksi','meli','afya','biashara','maduka','huduma'].includes(selected?.key);
  const dayKey=instant=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Dar_es_Salaam',year:'numeric',month:'2-digit',day:'2-digit'}).format(instant);
  const today=dayKey(new Date()),nextWeek=dayKey(new Date(Date.now()+6*86400000));
  const eventDay=item=>item.data.eventDate||(item.kind==='event'?item.data.date:'');
  const section=(heading,entries,message)=>`<section class="directory-group"><h3>${heading}</h3>${entries.length?render(entries):`<p class="schedule-empty">${message}</p>`}</section>`;
  if(!q&&selected?.key==='habari'){
   results.innerHTML=section(tr('Taarifa za leo','Today’s news'),matches.filter(item=>item.data.date===today),t('Hakuna taarifa ya leo iliyochapishwa.'))+
    section(tr('Taarifa za awali','Earlier news'),matches.filter(item=>item.data.date!==today),tr('Hakuna taarifa nyingine.','No other news.'));
  }else if(!q&&['matukio','burudani','michezo'].includes(selected?.key)){
   const events=matches.filter(eventDay),scheduled=events.filter(item=>eventDay(item)>=today&&eventDay(item)<=nextWeek).sort((a,b)=>eventDay(a).localeCompare(eventDay(b)));
   results.innerHTML=section(tr('Wiki hii','This week'),scheduled,tr('Hakuna tukio lililothibitishwa wiki hii.','No confirmed events this week.'))+
    section(tr('Ratiba zijazo','Later events'),events.filter(item=>eventDay(item)>nextWeek).sort((a,b)=>eventDay(a).localeCompare(eventDay(b))),tr('Hakuna ratiba nyingine kwa sasa.','No later events are listed.'))+
    section(tr('Matukio yaliyopita na taarifa','Past events and updates'),matches.filter(item=>!eventDay(item)||eventDay(item)<today),tr('Hakuna taarifa za awali.','No earlier updates.'));
  }else if(!q&&['boda-boda','teksi'].includes(selected?.key)){
   results.innerHTML=matches.length?`<div class="driver-grid">${render(matches)}</div>`:`<div class="discovery-empty"><h3>${tr('Orodha ya madereva inaanza','Driver listings are opening')}</h3><p>${tr('Madereva wataonekana hapa baada ya JAMCO kukagua picha na namba zao.','Drivers will appear here after JAMCO reviews their photo and number.')}</p></div>`;
  }else{
   results.innerHTML=matches.length?render(matches):`<div class="discovery-empty"><h3>${tr('Hakuna taarifa nyingine kwa sasa','No other listings right now')}</h3>${q?`<a href="/gundua${category?'?category='+encodeURIComponent(category):''}">${tr('Ondoa utafutaji','Clear search')}</a>`:''}</div>`;
  }
  if(isDirectory||['matukio','habari','maendeleo','burudani','michezo'].includes(selected?.key)){
   const message=selected.key==='usafiri'?tr('Pikipiki na watoa huduma za usafiri wanaweza kuwasilisha ombi kwa JAMCO.','Motorcycle taxi operators and transport providers can request a JAMCO listing.'):
    selected.key==='afya'?tr('Wataalamu wa afya wanaweza kuwasilisha taarifa kwa wahariri wa JAMCO.','Health professionals can send updates to JAMCO’s editors.'):
    isDirectory?tr('Watoa huduma na biashara wanaweza kuomba kuorodheshwa.','Service providers and businesses can request a listing.'):tr('Wasiliana na JAMCO kuhusu taarifa au tukio.','Contact JAMCO about a story or event.');
   results.insertAdjacentHTML('afterend',`<div class="local-inquiry"><p>${message}</p><a class="read-link" href="${isDirectory?'/orodha/ombi?category='+encodeURIComponent(selected.label):'/wasiliana'}">${isDirectory?t('Wasilisha ombi la kuorodheshwa'):t('Wasiliana na JAMCO')} →</a></div>`);
  }
 }catch{
  results.innerHTML=`<div class="discovery-empty"><p>${tr('Taarifa hazikuweza kupakiwa.','Updates could not load.')}</p><button class="secondary" data-discover-retry>${t('Jaribu tena')}</button></div>`;
  $('[data-discover-retry]').onclick=discover;
 }
}

function submission(){
 main.innerHTML=intro(tr('Wasiliana na JAMCO','Contact JAMCO'))+`<section class="panel"><p>${tr('Tuma taarifa, pendekezo la tukio au ombi la kuorodheshwa. JAMCO husimamia machapisho; wasomaji hushiriki kupitia maoni.','Send a tip, suggest an event or request a directory listing. JAMCO manages publication and readers join through comments.')}</p><a class="primary" href="/wasiliana">${tr('Fungua fomu ya mawasiliano','Open the contact form')}</a></section>`;
}
function listingRequest(){
 const categories=['Boda boda','Teksi','Meli','Hoteli','Utalii','Migahawa','Usafiri','Afya','Biashara','Maduka','Huduma za jamii'];
 const category=new URLSearchParams(location.search).get('category');
 main.innerHTML=intro(t('Wasilisha ombi la kuorodheshwa'))+`<section class="panel"><form class="form" id="listing-request"><label>${tr('Huduma','Service')}<select name="service">${categories.map(name=>`<option value="${esc(name)}"${category===name?' selected':''}>${esc(t(name))}</option>`).join('')}</select></label><label>${tr('Jina la biashara au mtoa huduma','Business or provider name')}<input maxlength="100" name="name" required></label><label>${tr('Barua pepe ya mawasiliano','Contact email')}<input type="email" name="email" required></label><label>${tr('Simu','Phone')}<input type="tel" name="phone" maxlength="24"></label><label>${tr('Eneo','Location')}<input name="location" maxlength="100" required></label><label>${tr('Huduma au bidhaa na maelezo yake','Services or products and their details')}<textarea minlength="10" maxlength="3000" name="message" required></textarea></label><label class="check"><input type="checkbox" required name="consent">${tr('Ninaruhusu JAMCO kunifikia kuhusu ombi hili.','I agree to be contacted by JAMCO about this request.')}</label><label class="check"><input type="checkbox" name="publicContact">${tr('Simu hii inaweza kuonekana kwenye orodha ya umma baada ya ukaguzi.','This number may appear on the public listing after review.')}</label><label class="check"><input type="checkbox" name="delivery">${tr('Natoa pia huduma ya kupeleka chakula au bidhaa.','I also deliver food or goods.')}</label><button class="primary">${tr('Tuma ombi','Submit request')}</button><p class="form-status" role="status"></p></form></section>`;
 const form=$('#listing-request');
 form.onsubmit=event=>{event.preventDefault();submit(form,async data=>{
   if(offline.isOffline())throw offline.offlineError();
   const response=await fetch('/api/tip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   const result=await response.json();
   if(!response.ok)throw Error(result.message);
   form.reset();return result;
 })};
}
async function uploadFile(file){
 if(['/admin','/admin/mmiliki'].includes(location.pathname))return window.JamcoMedia.upload(file,api,percent=>{$('#upload-status').textContent=`Inapakia ${file.name}: ${percent}%`;});
 if(file.type&&!file.type.startsWith('image/'))throw Error('Chagua picha ya wasifu.');
 const image=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,512/Math.max(image.width,image.height));
 canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();
 return api('upload',{file:canvas.toDataURL('image/webp',.82),avatar:true});
}
function bindUploads(){
 const input=$('#media-input'),uploads=$('#upload-status'),voice=$('[data-synthesize]',input.form);
 const add=async (file,alt)=>{
   if(mediaFiles.length>=12)throw Error('Faili zisizidi 12.');
   const item=await uploadFile(file);if(alt)item.alt=alt;mediaFiles.push(item);renderPreviews();uploads.textContent='Faili imepakiwa.';
 };
 input.onchange=async()=>{
   input.disabled=true;
   try{for(const file of input.files)await add(file)}
   catch(error){uploads.textContent=error.message}
   finally{input.disabled=false;input.value=''}
 };
 if(voice)voice.onclick=async()=>{
   if(input.disabled)return;
   if(mediaFiles.length>=12){uploads.textContent='Faili zisizidi 12.';return;}
   input.disabled=voice.disabled=true;
   uploads.textContent='Inatengeneza sauti…';
   try{
     const text=$('[name=narration]',input.form).value.trim()||$('[name=body]',input.form).value.trim();
     const language=$('[name=voiceLanguage]',input.form).value;
     mediaFiles.push(await api('synthesize',{text,language}));renderPreviews();uploads.textContent='Sauti iko tayari. Isikilize kabla ya kuchapisha.';
   }catch(error){uploads.textContent=error.message;}
   finally{input.disabled=voice.disabled=false;}
 };
 const music=$('[name=music]',input.form);
 if(music)music.onchange=async()=>{
  if(input.disabled||!music.files[0])return;
  input.disabled=music.disabled=true;
  try{await add(music.files[0],'Muziki');}
  catch(error){uploads.textContent=error.message;}
  finally{input.disabled=music.disabled=false;music.value='';}
 };
 window.JamcoMedia.bindRecorder(input.form,async file=>{
   input.disabled=true;
   try{await add(file);$('[data-record-status]').textContent='Rekodi imepakiwa.'}
   finally{input.disabled=false;}
 },message=>{$('[data-record-status]').textContent=message});
 renderPreviews();
}
function renderPreviews(){
 const el=$('#previews'),count=$('#preview-count');if(!el)return;
 if(count)count.textContent=`${mediaFiles.length} / 12`;
 el.innerHTML=mediaFiles.map((m,i)=>`<figure>${m.type==='video'?`<video src="${esc(m.url)}" ${m.poster?`poster="${esc(m.poster)}"`:''} controls ${mediaControls} preload="metadata"></video>`:m.type==='audio'?`<audio src="${esc(m.url)}" controls ${mediaControls} preload="none"></audio>`:`<img src="${esc(m.url)}" alt="Picha ${i+1}">`}<figcaption><small>${i+1}</small><button type="button" data-remove-media="${i}">Ondoa</button>${m.type==='image'?`<button type="button" data-crop="${i}">Hariri</button>`:''}${i>0?`<button type="button" data-move-media="${i}" data-shift="-1" aria-label="Sogeza mbele">←</button>`:''}${i<mediaFiles.length-1?`<button type="button" data-move-media="${i}" data-shift="1" aria-label="Sogeza nyuma">→</button>`:''}</figcaption></figure>`).join('');
 $$('[data-remove-media]',el).forEach(b=>b.onclick=()=>{mediaFiles.splice(Number(b.dataset.removeMedia),1);renderPreviews();});
 $$('[data-crop]',el).forEach(b=>b.onclick=()=>imageEditor(Number(b.dataset.crop)));
 $$('[data-move-media]',el).forEach(b=>b.onclick=()=>{
  const index=Number(b.dataset.moveMedia),next=index+Number(b.dataset.shift),[item]=mediaFiles.splice(index,1);
  mediaFiles.splice(next,0,item);renderPreviews();
 });
}

function imageEditor(index){const m=mediaFiles[index];openSheet('Hariri picha',`<canvas class="image-editor" id="crop-canvas"></canvas><form class="form" id="crop-form"><label>Ukubwa wa kukata<select name="ratio"><option value="original">Asili</option><option value="1">Mraba 1:1</option><option value="0.8">Wima 4:5</option><option value="1.777777">Mlalo 16:9</option></select></label><label>Mzunguko<select name="rotate"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label><label>Kuza<input name="zoom" type="range" min="1" max="3" step=".05" value="1"></label><label>Mlalo<input name="x" type="range" min="0" max="1" step=".01" value=".5"></label><label>Wima<input name="y" type="range" min="0" max="1" step=".01" value=".5"></label><button class="primary">Hifadhi picha</button><p class="form-status" role="status"></p></form>`);const im=new Image();im.src=m.url;const c=$('#crop-canvas'),f=$('#crop-form');function draw(){const d=Object.fromEntries(new FormData(f)),rotate=Number(d.rotate),swap=rotate%180!==0,w=swap?im.height:im.width,h=swap?im.width:im.height,r=d.ratio==='original'?w/h:Number(d.ratio);c.width=Math.min(1500,w);c.height=Math.round(c.width/r);const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);const scale=Math.max(c.width/w,c.height/h)*Number(d.zoom);ctx.translate(c.width/2+(Number(d.x)-.5)*(w*scale-c.width),c.height/2+(Number(d.y)-.5)*(h*scale-c.height));ctx.rotate(rotate*Math.PI/180);ctx.drawImage(im,-im.width*scale/2,-im.height*scale/2,im.width*scale,im.height*scale)}im.onload=draw;f.oninput=draw;f.onsubmit=e=>{e.preventDefault();submit(f,async()=>{const r=await api('upload',{file:c.toDataURL('image/webp',.85)});mediaFiles[index]=r;sheet.close();renderPreviews();return {message:'Picha imehifadhiwa.'}})}}
async function savedPage(){main.innerHTML=intro('Zilizohifadhiwa.','Machapisho unayotaka kurudia.');if(!saved.size){main.innerHTML+=empty('Hifadhi kinachokuvutia','Bonyeza alama ya hifadhi kwenye chapisho.','bookmark');return}const list=await Promise.all([...saved].slice(0,100).map(slug=>api('feed',{slug}).then(x=>x.posts[0]).catch(()=>null)));main.innerHTML+=list.filter(Boolean).map(card).join('');bindMedia()}
async function notifications(){
 main.innerHTML=intro(t('Arifa'));
 if(!user){
  main.innerHTML+=empty(tr('Arifa za jamii yako','Your notifications'),offline.isOffline()?tr('Ingia ukiwa na intaneti ili arifa zihifadhiwe kwenye kifaa hiki.','Sign in online to make notifications available on this device.'):tr('Ingia ili kuona majibu na hali ya taarifa zako.','Sign in to view replies and updates.'),'bell');return;
 }
 let data;
 try{data=await api('notifications');}catch(error){
  if(!offline.networkError(error))throw error;
  main.innerHTML+=empty(tr('Arifa hazijahifadhiwa','No cached notifications'),tr('Unganisha intaneti ili kupakia arifa.','Connect to load notifications.'),'bell');return;
 }
 main.innerHTML+=`<section class="panel">${data.items.length?data.items.map(item=>`<a href="${esc(item.url)}" class="list-item" style="display:block"><h3>${esc(item.title)}</h3><small>${esc(time(item.created_at))}</small></a>`).join(''):`<p>${tr('Hakuna arifa kwa sasa.','No notifications yet.')}</p>`}</section>`;
 if(!offline.isOffline())api('notifications-read').catch(()=>{});
}

function youtubeId(post){
 if(!post.embed)return '';
 try{
  const link=new URL(post.source);
  if(!['www.youtube.com','youtube.com','youtu.be'].includes(link.hostname))return '';
  const id=link.hostname==='youtu.be'?link.pathname.slice(1):link.searchParams.get('v');
  return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:'';
 }catch{return '';}
}
async function detail(slug){
 let p=initialData.post?.slug===slug&&Array.isArray(initialData.post.media)?initialData.post:null;
 if(p&&!initialData.qa)await offline.write('feed',{slug},{posts:[p],more:false});
 if(!p){
  try{p=(await api('feed',{slug})).posts[0];}
  catch(error){if(!offline.networkError(error))throw error;p=await offline.recentPost(slug);}
 }if(!p){main.innerHTML=empty('Chapisho halipatikani','Huenda limehifadhiwa au limeondolewa.');return}posts.set(slug,p);main.innerHTML=`<a class="article-back" href="/">← ${t('Nyumbani')}</a>`+card(p,true);
 const video=youtubeId(p);
 if(video)$('.post-copy',main).insertAdjacentHTML('afterbegin',`<div class="external-player"><button type="button" class="secondary" data-embed="${video}">${tr('Cheza video','Play video')}</button></div>`);
 bindMedia();
 if(p.phone||p.booking||p.directions){
  const guide=await import('/bukoba-guide.js?v=2');
  $('.post-copy .post-actions',main)?.insertAdjacentHTML('beforebegin',guide.actionLinks(p,locale.locale));
 }}
async function admin(){
 const mode=location.pathname==='/admin/mmiliki'?'owner':location.pathname==='/admin/wakala'?'agent':'';
 const viewTools={api,esc,submit,toast};
 const logout=async()=>{await api('staff-logout');await admin();};
 const fragment=new URLSearchParams(location.hash.slice(1)).get('invite');
 if(mode==='agent'&&fragment){
  const ui=await import('/staff-space.js?v=1');ui.activationView(main,viewTools,fragment,admin);return;
 }
 let staff;try{staff=await api('staff-me')}catch(error){
  if(offline.networkError(error)){main.innerHTML=intro(tr('Chumba cha habari','Newsroom'),tr('Unganisha intaneti kufungua chumba cha habari.','Connect to open the newsroom.'));return;}
  if(error.status!==401)throw error;
  staff=null;
 }
 if(staff&&((mode==='owner'&&staff.role!=='owner')||(mode==='agent'&&!staff.agent))){
  main.innerHTML=intro(mode==='owner'?'Akaunti ya mmiliki':'Akaunti ya wakala','Kikao kilicho wazi kinatumia akaunti tofauti.')+`<section class="panel"><button class="primary" data-switch-account>Toka ili ubadilishe akaunti</button></section>`;
  $('[data-switch-account]').onclick=()=>logout().catch(error=>toast(error.message));return;
 }
 if(!staff){
  const setup=mode!=='agent'&&new URLSearchParams(location.search).has('setup');main.innerHTML=intro(mode==='agent'?'Eneo la wakala':mode==='owner'?'Chumba cha mmiliki':'Chumba cha habari',mode==='agent'?'Ingia uone wasifu wako, hali ya maombi yako na huduma ulizowasilisha.':'Usimamizi wa machapisho, ratiba na maoni ya JAMCO.')+`<section class="panel"><h2>${setup?'Sanidi mmiliki':'Ingia kama mchapishaji'}</h2><form class="form" id="staff-login">${setup?'<label>Ufunguo wa usanidi<input name="key" type="password" autocomplete="off" required></label>':''}<label><span data-ui="Barua pepe">Barua pepe</span><input name="email" type="email" autocomplete="username" required></label><label><span data-ui="Nenosiri">Nenosiri</span><input name="password" type="password" autocomplete="current-password" ${setup?'minlength="14"':''} required></label>${setup?'':'<label>Msimbo wa MFA <small>(baada ya usanidi wa kwanza)</small><input name="code" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code"></label>'}<button class="primary">${setup?'Unda mmiliki':'Ingia'}</button><p class="form-status" role="status"></p><button class="text-button" type="button" data-staff-recover>Rejesha nenosiri</button></form><p class="fineprint">Ruhusa hudhibitiwa na seva. Akaunti ya mwanachama haitoi ruhusa ya usimamizi.</p></section>`;$('#staff-login').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async d=>{const r=await api(setup?'staff-setup':'staff-login',{...d,mode});await admin();return r})};$('[data-staff-recover]').onclick=()=>recovery(true);return}
 if(!staff.mfa){main.innerHTML=intro('Linda akaunti yako.','MFA inahitajika kwa kila msimamizi.')+`<section class="panel"><h2>Sanidi programu ya uthibitisho</h2><p>Tumia programu ya TOTP. Hifadhi ufunguo kwa usalama kabla ya kuthibitisha.</p><button class="secondary" data-mfa-start>Onyesha ufunguo wa MFA</button><div id="mfa-setup"></div></section>`;$('[data-mfa-start]').onclick=async()=>{try{const d=await api('mfa-start');$('#mfa-setup').innerHTML=`<p class="copy-secret">${esc(d.secret)}</p><p><a href="${esc(d.uri)}" class="text-button">Fungua programu ya uthibitisho</a></p><form class="form" id="mfa-form"><label>Msimbo wa tarakimu 6<input name="code" inputmode="numeric" pattern="[0-9]{6}" required></label><button class="primary">Thibitisha MFA</button><p class="form-status" role="status"></p></form>`;$('#mfa-form').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async d=>{const r=await api('mfa-confirm',d);await admin();return r})}}catch(e){toast(e.message)}};return}
 if(staff.agent){
  const ui=await import('/staff-space.js?v=1');await ui.agentView(main,viewTools,staff,logout);return;
 }
 let dash;try{dash=await api('admin-dashboard')}catch{dash={grants:[],role:staff.role};for(const p of ['publish','moderate','members','premium']){try{await api(({publish:'admin-posts',moderate:'admin-queue',members:'admin-members',premium:'admin-memberships'})[p]);dash.grants.push(p)}catch{}}}adminGrants=dash.grants;
 const tabs=[['dashboard','Muhtasari','analytics'],['posts','Machapisho','publish'],['compose','Chapisha','publish'],['instagram','Instagram','publish'],['intake','Maombi','publish'],['tips','Taarifa','publish'],['support','Msaada','publish'],['comments','Maoni','moderate'],['queue','Taarifa za jamii','moderate'],['reports','Ripoti','moderate'],['members','Wanachama','members'],['memberships','Premium','premium'],['agents','Mawakala','owner'],['staff','Ruhusa','owner']].filter(x=>x[2]==='owner'?staff.role==='owner':adminGrants.includes(x[2]));if(adminTab==='publish'&&adminGrants.includes('publish'))tabs.splice(2,0,['publish','Mipangilio ya chapisho','publish']);if(!tabs.some(x=>x[0]===adminTab))adminTab=tabs[0]?.[0]||'';main.classList.add('newsroom-workspace');main.innerHTML=`<section class="agent-profile newsroom-profile"><div class="agent-profile-avatar"><img src="/brand/icon-96.png" alt="" width="96" height="96"></div><div><p>JAMCO · CHUMBA CHA HABARI</p><h1>Chumba cha habari</h1><small>${esc(staff.email)}</small></div><a class="secondary" href="/">Ona tovuti</a></section>`+`<div class="tabs admin-tabs">${tabs.map(([k,l])=>`<button class="tab ${adminTab===k?'active':''}" data-admin-tab="${k}">${l}</button>`).join('')}<button class="tab" data-staff-logout>Toka</button></div><div id="admin-panel"></div>`;$$('[data-admin-tab]').forEach(b=>b.onclick=()=>{if($('#media-input')?.disabled||$('#quick-publisher')?.dataset.saving){toast('Subiri upakiaji ukamilike.');return;}if(adminTab===b.dataset.adminTab)return;adminTab=b.dataset.adminTab;admin().catch(error=>toast(error.message));});$('[data-staff-logout]').onclick=async()=>{await api('admin-logout');admin()};await adminPanel(dash)}
async function adminPanel(dash){const el=$('#admin-panel');if(adminTab==='dashboard'){const labels={members:'Wanachama',signed_in_members:'Wanachama wenye vipindi hai',new_members:'Waliojiunga siku 7',published:'Maudhui yaliyochapishwa',likes:'Kupendwa',comments:'Maoni',submissions:'Taarifa zinazosubiri',reports:'Ripoti zinazosubiri',premium:'Maombi ya Premium',video_views:'Watazamaji wa video / siku'};el.innerHTML=`<section class="panel">${dash.grants?.includes('publish')?`<div class="newsroom-quick"><button type="button" class="primary" data-new-compose>Chapisho jipya</button><button type="button" class="secondary" data-quick-editor="notice">Tangazo muhimu la leo</button><button type="button" class="secondary" data-quick-editor="funeral">Ratiba ya msiba</button></div>`:''}<div class="stats">${Object.entries(dash.stats||{}).map(([k,v])=>`<div class="stat"><strong>${v}</strong><small>${labels[k]||k}</small></div>`).join('')}</div><p class="fineprint">Vipindi hai si kipimo cha watumiaji walio mtandaoni sasa. Video huhesabiwa baada ya sekunde 2 za kucheza kwa mwanachama aliyethibitishwa, kwa siku.</p></section><section class="panel"><h2>Kumbukumbu za usimamizi</h2>${(dash.audit||[]).map(x=>`<div class="list-item"><strong>${esc(x.action)}</strong><p>${esc(x.subject)}</p><small>${esc(x.actor)} · ${esc(time(x.happened_at))}</small></div>`).join('')}</section>`;
  $('[data-new-compose]',el)?.addEventListener('click',()=>{listingDraft=null;currentEdit=null;adminTab='compose';admin();});
  $$('[data-quick-editor]',el).forEach(button=>button.onclick=()=>{
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Dar_es_Salaam'}).format(new Date());
   const funeral=button.dataset.quickEditor==='funeral';
   currentEdit=null;
   listingDraft={contentType:funeral?'Ratiba ya msiba':'Tangazo',category:funeral?'Matukio':'Matangazo',highlightDay:today,pinned:true};
   adminTab='publish';admin();
  });
  return}
 if(adminTab==='compose'){quickPublisher(el);return}
 if(adminTab==='comments'){
  const {items}=await api('admin-comments');
  el.innerHTML=`<section class="panel"><h2>Maoni ya wasomaji</h2>${items.length?items.map(item=>`<article class="list-item"><strong>${esc(item.display_name)}</strong><small> · ${esc(time(item.created_at))}</small><p>${commentMarkup(item.body)}</p><div class="newsroom-actions"><a class="read-link" href="/habari/${esc(item.slug)}">${esc(item.title||item.slug)}</a><button class="secondary" data-comment-moderate="${esc(item.id)}" data-hidden="${!item.hidden}">${item.hidden?'Onyesha':'Ficha'}</button></div></article>`).join(''):'<p>Hakuna maoni bado.</p>'}</section>`;
  $$('[data-comment-moderate]',el).forEach(button=>button.onclick=async()=>{
   button.disabled=true;
   try{await api('admin-comment-hide',{id:button.dataset.commentModerate,hidden:button.dataset.hidden==='true'});await adminPanel(dash);}
   catch(error){toast(error.message);button.disabled=false;}
  });
  return;
 }
 if(['intake','tips','support'].includes(adminTab)){
  const {items}=await api('admin-intake',{section:adminTab});
  const heading={intake:'Maombi ya huduma',tips:'Taarifa kutoka kwa jamii',support:'Ujumbe wa msaada'}[adminTab];
  const states={received:'Imepokelewa',reviewing:'Inapitiwa',approved:'Imeidhinishwa',declined:'Imekataliwa',closed:'Imefungwa'};
  el.innerHTML=`<section class="panel"><h2>${heading}</h2>${items.length?items.map(item=>{
   const info=item.data;
   return `<form class="form list-item" data-intake="${esc(item.reference)}"><h3>${esc(info.name)} · ${esc(info.service||'Taarifa')}</h3><small>${esc(item.reference)} · ${esc(time(item.created_at))}</small><p>${esc(info.message)}</p>${info.photoId?`<img class="intake-photo" src="/media/${esc(info.photoId)}?w=240&format=webp" alt="Picha iliyowasilishwa" loading="lazy">`:''}<small>${esc(info.location)} · ${esc(item.email)}${info.phone?' · '+esc(info.phone):''}</small>${info.service?`<small>${info.publicContact?'Ameruhusu kuchapishwa kwa simu.':'Simu ya mawasiliano ya ndani.'}</small>`:''}<label>Hali<select name="status">${Object.entries(states).map(([state,label])=>`<option value="${state}" ${state===item.status?'selected':''} ${state==='received'?'disabled':''}>${label}</option>`).join('')}</select></label><button class="secondary">Hifadhi hali</button><button type="button" class="secondary" data-intake-copy="${esc(item.reference)}">Nakili ujumbe</button>${info.service?`<button type="button" class="text-button" data-intake-draft="${esc(item.reference)}">Andaa wasifu wa huduma</button>`:info.topic!=='support'?`<button type="button" class="text-button" data-intake-compose="${esc(item.reference)}">Tumia kwenye rasimu</button>`:''}<p class="form-status" role="status"></p></form>`;
  }).join(''):'<p>Hakuna maombi.</p>'}</section>`;
  $$('[data-intake]',el).forEach(form=>form.onsubmit=event=>{event.preventDefault();submit(form,d=>api('admin-intake-status',{...d,reference:form.dataset.intake}));});
  $$('[data-intake-copy]',el).forEach(button=>button.onclick=async()=>{
   const message=items.find(item=>item.reference===button.dataset.intakeCopy)?.data.message;
   if(!message)return;
   try{await navigator.clipboard.writeText(message);toast('Ujumbe umenakiliwa.');}
   catch{openSheet('Nakili ujumbe',`<textarea readonly rows="7">${esc(message)}</textarea>`);}
  });
  $$('[data-intake-compose]',el).forEach(button=>button.onclick=()=>{
   const info=items.find(item=>item.reference===button.dataset.intakeCompose)?.data;
   if(!info)return;
   currentEdit=null;listingDraft={body:info.message,category:'Jamii'};adminTab='compose';admin();
  });
  $$('[data-intake-draft]',el).forEach(button=>button.onclick=()=>{
   const info=items.find(item=>item.reference===button.dataset.intakeDraft)?.data;
   if(!info)return;
   currentEdit=null;
   listingDraft={title:info.name,category:info.service,body:info.message,location:info.location,phone:info.publicContact?info.phone:'',
    contentType:'Wasifu wa huduma',delivery:info.delivery===true,intakeReference:button.dataset.intakeDraft,
    media:info.photoId?[{id:info.photoId,type:'image',url:'/media/'+info.photoId}]:[]};
   adminTab='publish';admin();
  });
  return;
 }
 if(adminTab==='agents'){const ui=await import('/staff-space.js?v=1');await ui.inviteView(el,{api,esc,submit,toast});return}
 if(adminTab==='publish'){publisher(el);return}
 if(adminTab==='instagram'){const info=await api('admin-instagram-status');el.innerHTML=`<section class="panel"><h2>Instagram ya JAMCO</h2><p>@jamcobukoba2013 · ${info.connected?'Muunganisho umewekwa':'Uidhinishaji unahitajika'}</p><p>Machapisho hubaki na tarehe, credit na chanzo chake. Maoni huwekewa alama ya Instagram; hayasajiliwi kama akaunti za JAMCO.</p>${!info.connected?'<div class="notice">Unganisha akaunti rasmi kupitia Meta yenye ruhusa za kusoma media na maoni. Weka tokeni kwa usalama kwenye mipangilio ya seva.</div>':''}<form class="form" id="instagram-import"><label>Idadi ya machapisho<select name="limit"><option>3</option><option>1</option><option>5</option></select></label><label>Maoni kwa chapisho<select name="comments"><option>5</option><option>0</option><option>10</option></select></label><label class="check"><input name="confirmed" type="checkbox" required>Ninathibitisha ruhusa, haki za media na ukaguzi wa maoni.</label><label class="check"><input name="publish" type="checkbox">Chapisha mara moja baada ya ukaguzi; vinginevyo hifadhi kwa review.</label><button class="primary" ${info.connected?'':'disabled'}>Leta machapisho na maoni</button><p class="form-status" role="status"></p></form><p class="fineprint">Ruhusa: ${esc(info.permissions.join(', '))}</p></section>`;$('#instagram-import').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async d=>{const r=await api('admin-instagram-import',d);if(r.warnings?.length)toast(r.warnings.join(' '));return r})};return}
 
 if(adminTab==='posts'){const d=await api('admin-posts');el.innerHTML=`<section class="panel"><h2>Machapisho na rasimu</h2>${d.items.map(x=>`<div class="list-item"><h3>${esc(x.data.title)}</h3><p>${esc(x.kind)} · ${esc(x.state)} · ${esc(time(x.live_at))}</p><button class="secondary" data-edit-post="${esc(x.slug)}" data-ui="Hariri">Hariri</button></div>`).join('')}</section>`;$$('[data-edit-post]').forEach(b=>b.onclick=()=>{listingDraft=null;currentEdit=d.items.find(x=>x.slug===b.dataset.editPost);adminTab='publish';admin()});return}
 if(adminTab==='members'){const d=await api('admin-members');el.innerHTML=`<section class="panel"><h2>Wanachama</h2><input class="search-input" id="member-search" placeholder="Tafuta kwa jina au barua pepe" aria-label="Tafuta mwanachama"><div id="member-list"></div></section>`;function render(list){$('#member-list').innerHTML=list.map(x=>`<div class="list-item"><h3>${esc(x.display_name)}</h3><p>${esc(x.email)} · ${x.verified?'Imethibitishwa':'Haijathibitishwa'} · ${x.active?'Hai':'Imesimamishwa'}</p><button class="secondary" data-member="${x.id}" data-active="${!x.active}">${x.active?'Simamisha':'Rejesha'}</button></div>`).join('');$$('[data-member]').forEach(b=>b.onclick=()=>api('admin-member-update',{id:b.dataset.member,active:b.dataset.active==='true'}).then(()=>admin()).catch(e=>toast(e.message)))}render(d.items);$('#member-search').oninput=e=>render(d.items.filter(x=>(x.display_name+' '+x.email).toLowerCase().includes(e.target.value.toLowerCase())));return}
 if(adminTab==='queue'){const d=await api('admin-queue');el.innerHTML=`<section class="panel"><h2>Taarifa za jamii</h2>${d.items.length?d.items.map(x=>`<form class="form list-item" data-moderate="${x.id}"><h3>${esc(x.headline)}</h3><small>${esc(x.display_name)} · ${esc(x.category)} · ${esc(x.location)}</small><p>${esc(x.description)}</p>${(x.media||[]).map(m=>m.type==='video'?`<video src="${esc(m.url)}" controls preload="none"></video>`:`<img src="${esc(m.url)}" alt="Media ya taarifa" loading="lazy">`).join('')}<label>Hali<select name="status">${['submitted','review','information','approved','published','rejected'].map(s=>`<option value="${s}" ${s===x.status?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></label><label>Maelezo kwa mchangiaji<textarea name="note">${esc(x.editorial_note)}</textarea></label><label class="check"><input type="checkbox" name="confirmed"> Nimehakiki ukweli, ridhaa na haki za media.</label><button class="primary">Hifadhi uamuzi</button><p class="form-status" role="status"></p></form>`).join(''):'<p>Hakuna taarifa zinazosubiri.</p>'}</section>`;$$('[data-moderate]').forEach(f=>f.onsubmit=e=>{e.preventDefault();submit(f,d=>api('admin-moderate',{...d,id:f.dataset.moderate}))});return}
 if(adminTab==='reports'){const d=await api('admin-reports');el.innerHTML=`<section class="panel"><h2>Ripoti za maudhui</h2>${d.items.length?d.items.map(x=>`<div class="list-item"><h3>${esc(x.reason)}</h3><p>${esc(x.body||x.slug)}</p><a class="read-link" href="/habari/${esc(x.slug)}">Fungua chapisho</a>${x.comment_id?`${x.reason==='Maoni mapya yanahitaji ukaguzi'?`<button class="primary" data-approve-comment="${x.comment_id}">Chapisha maoni</button>`:''}<button class="secondary" data-hide-comment="${x.comment_id}">${x.reason==='Maoni mapya yanahitaji ukaguzi'?'Kataa maoni':'Ficha maoni'}</button>`:''}</div>`).join(''):'<p>Hakuna ripoti zinazosubiri.</p>'}</section>`;$$('[data-approve-comment]').forEach(b=>b.onclick=()=>api('admin-comment-approve',{id:b.dataset.approveComment}).then(()=>admin()).catch(e=>toast(e.message)));$$('[data-hide-comment]').forEach(b=>b.onclick=()=>api('admin-comment-hide',{id:b.dataset.hideComment}).then(()=>admin()).catch(e=>toast(e.message)));return}
 if(adminTab==='memberships'){const d=await api('admin-memberships');el.innerHTML=`<section class="panel"><h2>Maombi ya Premium</h2>${d.items.length?d.items.map(x=>`<form class="form list-item" data-membership="${x.id}"><h3>${esc(x.display_name)}</h3><p>${esc(statusLabel(x.status))} · ${esc(date(x.created_at))}</p><label>Uamuzi<select name="status"><option value="approved">Idhinisha</option><option value="rejected">Kataa</option><option value="revoked">Ondoa</option></select></label><label>Tarehe ya mwisho<input type="datetime-local" name="expiresAt"></label><label>Maelezo<textarea name="note">${esc(x.note)}</textarea></label><button class="primary">Hifadhi uamuzi</button><p class="form-status" role="status"></p></form>`).join(''):'<p>Hakuna maombi bado.</p>'}</section>`;$$('[data-membership]').forEach(f=>f.onsubmit=e=>{e.preventDefault();submit(f,d=>api('admin-membership-update',{...d,id:f.dataset.membership,expiresAt:d.expiresAt?new Date(d.expiresAt).toISOString():null}))});return}
 if(adminTab==='staff'){const d=await api('admin-staff',{list:true});el.innerHTML=`<section class="panel"><h2>Ruhusa za timu</h2>${d.items.map(x=>`<div class="list-item"><h3>${esc(x.email)}</h3><p>${esc(x.role)} · MFA ${x.mfa?'imewashwa':'inasubiri'} · ${esc((x.permissions||[]).join(', '))}</p></div>`).join('')}<form id="staff-form" class="form"><label>Barua pepe<input type="email" name="email" required></label><label>Nenosiri la awali <small>(akaunti mpya pekee)</small><input type="password" name="password" minlength="14" autocomplete="new-password"></label><label>Jukumu<select name="role"><option value="admin">Administrator — ruhusa zilizochaguliwa</option><option value="editor">Editor / Publisher</option><option value="moderator">Moderator — chagua moderate</option><option value="reporter">Reporter — rasimu</option></select></label>${[['publish','Kuchapisha'],['moderate','Kusimamia maudhui'],['members','Wanachama'],['premium','Premium'],['analytics','Takwimu']].map(([k,l])=>`<label class="check"><input type="checkbox" name="perm-${k}">${l}</label>`).join('')}<label class="check"><input type="checkbox" name="active" checked>Akaunti hai</label><button class="primary">Hifadhi ruhusa</button><p class="form-status" role="status"></p></form></section>`;$('#staff-form').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,d=>api('admin-staff',{...d,permissions:['publish','moderate','members','premium','analytics'].filter(k=>d['perm-'+k])}))};return}}
const quickCategories=['Jamii','Habari','Serikali','Maendeleo','Matukio','Matangazo','Utalii','Biashara','Michezo','Burudani','Afya','Elimu'];
function quickPublisher(el){
 const draft=listingDraft||{};
 const draftSlug='jamco-'+crypto.randomUUID();
 mediaFiles=structuredClone(draft.media||[]);
 el.innerHTML=`<section class="panel quick-composer"><header><h2>Chapisho jipya</h2><button type="button" class="text-button" data-advanced-post>Chaguo zaidi</button></header>
 <form id="quick-publisher" class="form">
  <div class="composer-choices"><label class="composer-pick"><strong>Picha au video</strong><small>Chagua faili hadi 12</small><input id="media-input" type="file" accept="image/*,video/mp4,video/webm,.heic,.heif" multiple></label><button type="button" class="secondary" data-record>Rekodi sauti</button><button type="button" class="secondary" data-write-post>Andika ujumbe</button></div>
  <p id="upload-status" role="status"></p><p data-record-status role="status"></p>
  <div class="composer-gallery"><div id="previews" class="media-previews"></div><small id="preview-count" aria-label="Idadi ya faili"></small></div>
  <label class="music-choice">Ongeza muziki <small>Faili ya sauti uliyo na haki ya kutumia</small><input name="music" type="file" accept="audio/*,.m4a,.mp3,.ogg"></label>
  <label>Caption au ujumbe<textarea name="body" maxlength="30000" rows="5" placeholder="Andika caption au taarifa yako…">${esc(draft.body||'')}</textarea></label>
  <label>Kundi<select name="category">${quickCategories.map(value=>`<option ${value===draft.category?'selected':''}>${esc(value)}</option>`).join('')}</select></label>
  <details><summary>Kichwa na eneo (hiari)</summary><label>Kichwa<input name="title" maxlength="180"></label><label>Eneo<input name="location" maxlength="140" placeholder="Bukoba"></label></details>
  <label class="check"><input name="confirmed" type="checkbox">Nimehakiki taarifa na nina haki ya kutumia media hii.</label>
  <div class="composer-footer"><button type="submit" class="primary" value="published">Chapisha sasa</button><button type="submit" class="secondary" value="draft">Hifadhi rasimu</button></div><p class="form-status" role="status"></p>
 </form></section>`;
 const form=$('#quick-publisher');
 $('[data-write-post]',form).onclick=()=>$('[name=body]',form).focus();
 $('[data-advanced-post]',el).onclick=()=>{
  if($('#media-input').disabled||$('[data-record]',form).dataset.recording==='1')return;
  if(form.dataset.saving)return;
  const fields=Object.fromEntries(new FormData(form));
  listingDraft={title:fields.title,body:fields.body,category:fields.category,location:fields.location,media:[...mediaFiles]};
  currentEdit=null;adminTab='publish';admin();
 };
 bindUploads();
 form.onsubmit=event=>{
  event.preventDefault();
  const state=event.submitter?.value||'published';
  if(form.dataset.saving)return;
  form.dataset.saving='1';
  submit(form,async values=>{
   if($('#media-input').disabled||$('[data-record]',form).dataset.recording==='1')throw Error('Subiri hadi faili au rekodi ikamilike.');
   const body=values.body.trim();
   const title=(values.title.trim()||body.split('\n')[0].trim().slice(0,110)|| (mediaFiles.some(item=>item.type==='audio')&&!mediaFiles.some(item=>item.type!=='audio')?'Taarifa ya sauti':'Chapisho la JAMCO'));
   const result=await api('admin-publish',{slug:draftSlug,title:title.length<4?'Ujumbe: '+title:title,body,category:values.category,location:values.location,contentType:values.category==='Matangazo'?'Tangazo':'Habari',media:mediaFiles,state,confirmed:values.confirmed});
   listingDraft=null;currentEdit=null;
   if(!form.isConnected)return result;
   el.innerHTML=`<section class="panel"><h2>${state==='published'?'Chapisho limechapishwa':'Rasimu imehifadhiwa'}</h2><div class="newsroom-actions">${state==='published'?`<a class="secondary" href="/habari/${draftSlug}">Tazama chapisho</a>`:''}<button class="primary" data-next-compose>Chapisho jipya</button></div></section>`;
   $('[data-next-compose]').onclick=()=>quickPublisher(el);
   return result;
  }).finally(()=>delete form.dataset.saving);
 };
}
function editorialDateTime(value){
 const part=new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Dar_es_Salaam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
 return part.replace(' ','T');
}
function publisher(el){const p=currentEdit?.data||listingDraft||{},v=(k)=>esc(p[k]||''),types=['Habari','Taarifa Muhimu','Tangazo','Tahadhari','Matukio','Ratiba ya msiba','Taarifa za Serikali','Wasifu wa huduma','Business Promotions'];mediaFiles=structuredClone(p.media||[]);el.innerHTML=`<section class="panel"><h2>${currentEdit?'Hariri chapisho':'Chapisho jipya'}</h2><form class="form" id="publisher-form"><label>Kichwa<input name="title" value="${v('title')}" required maxlength="180"></label><label>Kitambulisho cha kiungo<input name="slug" pattern="[a-z0-9][a-z0-9-]{1,95}" value="${esc(currentEdit?.slug||'')}" ${currentEdit?'readonly':''} required placeholder="habari-ya-jamii"></label><label>Aina ya uhariri<select name="contentType">${types.map(x=>`<option ${x===p.contentType?'selected':''}>${x}</option>`).join('')}</select></label><label>Mada<input name="category" list="publisher-topics" value="${v('category')}" placeholder="Jamii"></label><datalist id="publisher-topics">${['Habari','Serikali','Maendeleo','Jamii','Matukio','Matangazo','Utalii','Hoteli','Migahawa','Usafiri','Boda boda','Teksi','Meli','Afya','Biashara','Maduka','Burudani','Elimu','Michezo','Huduma za jamii'].map(name=>`<option value="${name}"></option>`).join('')}</datalist><label>Maelezo kamili<textarea name="body" maxlength="30000" rows="9">${esc(p.body||p.caption||p.summary||'')}</textarea></label><label>Eneo<input name="location" value="${v('location')}" maxlength="140"></label><label>Chanzo rasmi <small>(HTTPS inapohitajika)</small><input name="source" type="url" value="${p.source?.startsWith('https:')?v('source'):''}"></label><label>Tarehe ya taarifa<input name="date" type="date" value="${v('date')||new Date().toLocaleDateString('sv-SE',{timeZone:'Africa/Dar_es_Salaam'})}"></label><fieldset class="publisher-dates"><legend>Ratiba na mawasiliano</legend><label>Tangazo muhimu la leo <small>(hiari, chagua siku ya kulionyesha Nyumbani)</small><input name="highlightDay" type="date" value="${v('highlightDay')}"></label><label>Siku ya tukio<input name="eventDate" type="date" value="${v('eventDate')}"></label><label>Saa ya tukio (EAT)<input name="eventTime" type="time" value="${v('eventTime')}"></label><label>Simu ya umma<input type="tel" name="phone" value="${v('phone')}" maxlength="24"></label><label>Kiungo cha booking<input type="url" name="booking" value="${v('booking')}"></label><label>Kiungo cha ramani<input type="url" name="directions" value="${v('directions')}"></label></fieldset><label class="check"><input name="delivery" type="checkbox" ${p.delivery?'checked':''}>Huduma hii inaweza kupeleka chakula au bidhaa</label><label>Picha, video au sauti <small>(hiari)</small><input type="file" id="media-input" multiple accept="image/*,video/mp4,video/webm,.mov,audio/*,.heic,.heif,.tif,.tiff"></label><small>Video hadi MB 20, sauti hadi MB 10. Picha zinazosomeka hubanwa zenyewe.</small><p id="upload-status" role="status"></p><button class="secondary" type="button" data-record>Rekodi sauti</button><p data-record-status role="status"></p><details class="voice-editor"><summary>Tengeneza sauti kutokana na maandishi</summary><label>Maandishi ya kusomwa <small>(herufi 1,400; ukiacha wazi, maelezo ya chapisho yatatumika)</small><textarea name="narration" maxlength="1400" rows="4"></textarea></label><label>Lugha ya sauti<select name="voiceLanguage"><option value="sw">Kiswahili</option><option value="en">English</option></select></label><button class="secondary" type="button" data-synthesize>Tengeneza sauti</button></details><label class="check"><input type="checkbox" name="speech"  ${p.speech?'checked':''}> Ruhusu kifaa cha msomaji kusoma maandishi kwa sauti</label><p id="preview-count" aria-label="Idadi ya faili"></p><div class="media-previews" id="previews"></div><label>Haki na credit<input name="rights" value="${v('rights')}" maxlength="500"></label><label>Hali<select name="state">${['draft','review','published','archived'].map(x=>`<option value="${x}" ${x===currentEdit?.state?'selected':''}>${{draft:'Rasimu',review:'Ukaguzi',published:'Chapisha / ratibu',archived:'Hifadhi / rejesha taarifa'}[x]}</option>`).join('')}</select></label><label>Ratiba ya kuchapisha <small>(saa za Bukoba; acha wazi kuchapisha sasa)</small><input name="liveAt" type="datetime-local" value="${currentEdit?.live_at&&Date.parse(currentEdit.live_at)>Date.now()?esc(editorialDateTime(currentEdit.live_at)): ''}"></label><label>Muda wa mwisho wa taarifa<input name="expiresAt" type="datetime-local" value="${p.expiresAt?esc(editorialDateTime(p.expiresAt)): ''}"></label><label class="check"><input name="story" type="checkbox">Pia chapisha Story ya saa 24 (ikiwa media ipo)</label><label class="check"><input name="pinned" type="checkbox" ${p.pinned?'checked':''}>Bandika juu</label><label class="check"><input name="verified" type="checkbox" ${p.verified?'checked':''}>Nimehakiki chanzo (lazima kwa Tahadhari)</label><label class="check"><input name="confirmed" type="checkbox">Nimehakiki ukweli, ridhaa na haki za media.</label><button class="primary">Hifadhi chapisho</button><button type="button" class="text-button" data-new-post>Anza chapisho jipya</button><p class="form-status" role="status"></p></form></section>`;bindUploads();const form=$('#publisher-form');if(!currentEdit){const title=$('[name=title]',form),setSlug=()=>{$('[name=slug]',form).value=title.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,86)};title.oninput=setSlug;if(title.value)setSlug();}form.onsubmit=e=>{e.preventDefault();submit(form,async d=>{if($('#media-input').disabled||$('[data-record]',form).dataset.recording==='1')throw Error('Subiri media ikamilike.');const r=await api('admin-publish',{...d,intakeReference:listingDraft?.intakeReference,media:mediaFiles,liveAt:d.liveAt?new Date(d.liveAt+'+03:00').toISOString():currentEdit?.live_at||undefined,expiresAt:d.expiresAt?new Date(d.expiresAt+'+03:00').toISOString():undefined});toast(r.message);return r})};$('[data-new-post]').onclick=()=>{if($('#media-input').disabled)return;currentEdit=listingDraft=null;publisher(el)}}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.hasAttribute('data-auto-feed')){autoRead=!autoRead;updateAutoRead();scheduleAutoRead()}if(b.hasAttribute('data-feed-options'))feedOptions();if(b.hasAttribute('data-topic')){topic=b.dataset.topic;filter='';stopAutoRead();history.pushState({},'',topic==='bukoba'?'/':'/?mada='+encodeURIComponent(topic));await feed()}if(b.hasAttribute('data-carousel-play')){const c=$('.carousel',b.closest('.media-wrap')),active=carouselActive(c);c.dataset.auto=active?'0':'1';c.dataset.autoPaused=active?'1':'0';syncCarousel(c)}if(b.dataset.view)view(b.dataset.view,Number(b.dataset.index)||0);if(b.dataset.slideTo!==undefined){const c=$('.carousel',b.closest('.media-wrap'));c.dataset.autoPaused='1';syncCarousel(c);c.scrollTo({left:c.clientWidth*Number(b.dataset.slideTo),behavior:motion()});}if(b.dataset.slide){const c=$('.carousel',b.closest('.media-wrap'));c.scrollBy({left:c.clientWidth*Number(b.dataset.slide),behavior:'smooth'})}if(b.dataset.video){const v=$('video',b.closest('.media-slide'));if(offline.isOffline())await offline.prepareMedia(v);if(b.dataset.video==='mute'){v.muted=!v.muted;if(!v.muted&&v.volume===0)v.volume=1;syncVideo(v);window.JamcoMedia.meter(v,$$('.level-bars i',b.closest('.media-slide')))}else{if(v.paused){delete v.dataset.paused;pauseOtherVideos(v);if(v.error)v.load();await v.play();syncVideo(v)}else{v.pause();v.dataset.paused='1';syncVideo(v)}}}if(b.dataset.like){if(!needLogin())return;const p=posts.get(b.dataset.like);b.disabled=true;const r=await api('like',{slug:p.slug,active:!p.liked});p.liked=r.liked;if(r.liked)liked.add(p.slug);else liked.delete(p.slug);p.likes=r.likes;b.setAttribute('aria-pressed',r.liked);$('span',b).textContent=r.likes;b.disabled=false}if(b.dataset.comments)await comments(b.dataset.comments);if(b.dataset.save){const slug=b.dataset.save,active=!saved.has(slug);if(user)await api('save',{slug,active});if(active)saved.add(slug);else saved.delete(slug);try{localStorage.setItem('jamco-social-saves',JSON.stringify([...saved]))}catch{}b.setAttribute('aria-pressed',active);toast(active?'Imehifadhiwa.':'Imeondolewa.')}if(b.dataset.share){const p=posts.get(b.dataset.share),url=location.origin+'/habari/'+p.slug;if(navigator.share)await navigator.share({title:p.title,url});else{await navigator.clipboard.writeText(url);toast('Kiungo kimenakiliwa.')}}if(b.dataset.expand){const p=posts.get(b.dataset.expand),cap=$('.caption',b.parentNode);if(b.dataset.open){cap.textContent=(p.summary||p.body||p.caption||'').slice(0,180);b.textContent='Soma zaidi';delete b.dataset.open}else{cap.textContent=p.body||p.caption||p.summary;b.textContent='Onyesha machache';b.dataset.open='1'}}if(b.dataset.menu){const slug=b.dataset.menu;openSheet('Chaguo za chapisho',`<div class="menu-options"><a href="/habari/${esc(slug)}">Fungua taarifa kamili</a><button data-copy="${esc(slug)}">Nakili kiungo</button><button data-report-post="${esc(slug)}">Ripoti maudhui</button></div>`)}if(b.dataset.embed&&/^[A-Za-z0-9_-]{11}$/.test(b.dataset.embed)){
 if(offline.isOffline()){toast(tr('Video hii inahitaji intaneti.','This video requires internet.'));return;}
 const frame=document.createElement('iframe');frame.title=tr('Video ya habari','News video');
 frame.src='https://www.youtube-nocookie.com/embed/'+b.dataset.embed+'?autoplay=1';
 frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;
 b.closest('.external-player').replaceChildren(frame);
}
if(b.dataset.speak){const p=posts.get(b.dataset.speak);if(!window.JamcoMedia.speak(b,p?.body||p?.summary,'sw-TZ'))toast(tr('Sauti ya Kiswahili haipatikani kwenye kifaa hiki.','A Swahili voice is unavailable on this device.'))}
if(b.dataset.emoji){const field=$('textarea[name=body]',b.closest('form'));if(field.value.length-field.selectionEnd+field.selectionStart+b.dataset.emoji.length<=field.maxLength)field.setRangeText(b.dataset.emoji,field.selectionStart,field.selectionEnd,'end');field.focus()}
if(b.dataset.copy){await navigator.clipboard.writeText(location.origin+'/habari/'+b.dataset.copy);toast('Kiungo kimenakiliwa.');sheet.close()}if(b.dataset.reportPost)report(b.dataset.reportPost);if(b.dataset.filter!==undefined){filter=b.dataset.filter;await feed()}if(b.hasAttribute('data-load')){b.disabled=true;await loadMore()}if(b.hasAttribute('data-refresh'))await feed()}catch(err){b.disabled=false;if(err.name!=='AbortError')toast(err.message)}});
let authRun=0, latestNotifications='';
async function loadAccount(){
 const generation=++authRun;
 let me;
 try{
  await flushLogout();
  me=await api('me');
  if(generation!==authRun)return;
  await offline.rememberAccount(me);
 }catch(error){
  if(!offline.networkError(error))return;
  me=await offline.lastAccount();
 }
 if(generation!==authRun)return;
 user=me?.user||null;
 liked=new Set(me?.liked||[]);
 saved=new Set(me?.saved||localSaved);
 if(user&&!offline.isOffline()){
  const guest=localSaved;localSaved=[];
  if(guest.length){
   try{localStorage.removeItem('jamco-social-saves');}catch{}
   await Promise.all(guest.filter(slug=>!saved.has(slug)).map(slug=>api('save',{slug,active:true}).then(()=>saved.add(slug)).catch(()=>{})));
  }
  if(latestNotifications!==user.id&&location.pathname!=='/arifa'){
   latestNotifications=user.id;
   api('notifications').catch(()=>{latestNotifications='';});
  }
 }
}
function offlinePlaceholder(){
 main.innerHTML=intro('JAMCO Bukoba')+empty(
  tr('Sehemu hii inahitaji intaneti','This page requires internet'),
  tr('Rudi Nyumbani kusoma yaliyohifadhiwa kwenye kifaa hiki.','Go back to Home to see what is saved on this device.')
 )+'<div class="load"><a class="secondary" href="/">'+t('Nyumbani')+'</a></div>';
}
async function init(){
 clearInterval(feedTimer);clearInterval(commentTimer);stopAutoRead();
 const path=location.pathname;
 const publicPage=['/','/gundua','/orodha/ombi','/shiriki'].includes(path)||path.startsWith('/habari/');
 const auth=path.startsWith('/admin')?Promise.resolve():loadAccount();
 if(!publicPage)await auth;
 drawNav();
 try{
  if(path==='/')await feed();
  else if(path==='/gundua')await discover();
  else if(path==='/shiriki')submission();
  else if(path==='/orodha/ombi')listingRequest();
  else if(path==='/akaunti')await account();
  else if(path==='/hifadhi')await savedPage();
  else if(path==='/arifa')await notifications();
  else if(['/admin','/admin/mmiliki','/admin/wakala'].includes(path))await admin();
  else if(path.startsWith('/habari/'))await detail(path.split('/').pop());
  else if(initialData.offline)offlinePlaceholder();
  if(publicPage){
   await auth;drawNav();
   $$('[data-like]').forEach(b=>{const active=liked.has(b.dataset.like);b.setAttribute('aria-pressed',String(active));const p=posts.get(b.dataset.like);if(p)p.liked=active});
   $$('[data-save]').forEach(b=>b.setAttribute('aria-pressed',String(saved.has(b.dataset.save))));
  }
 }catch(error){
  if(offline.networkError(error)){offlinePlaceholder();return;}
  main.innerHTML=intro('JAMCO Bukoba')+empty('Huduma haipatikani kwa sasa',error.message)+'<div class="load"><button class="secondary" data-retry>Jaribu tena</button></div>';
  $('[data-retry]').onclick=init;
 }
}
if(initialData.offline&&location.pathname==='/'){
 const selected=new URLSearchParams(location.search).get('mada');
 if(topics.some(item=>item.key===selected))topic=selected;
}
window.addEventListener('offline',()=>{
 $$('[data-offline-source]').forEach(media=>offline.prepareMedia(media));
});
window.addEventListener('online',async()=>{
 publicReads.clear();
 if(location.pathname==='/'){
  if(!$('#feed-list .post')){await init();return;}
  await loadAccount();drawNav();
  refreshFeed();
  if($('[data-reconnect]')&&more)loadMore().catch(paginationError);
 }else if(!sheet.open&&!viewer.open&&['/akaunti','/arifa','/hifadhi','/gundua','/admin','/admin/mmiliki','/admin/wakala'].includes(location.pathname)){
  await init();
 }else if(offline.logoutPending())flushLogout().catch(()=>{});
});
window.addEventListener('jamco-identity-change',()=>{
 user=null;saved.clear();liked.clear();
 if(['/akaunti','/arifa','/hifadhi'].includes(location.pathname))init();
 else {drawNav();if(sheet.open)sheet.close();}
});
document.addEventListener('timeupdate',event=>{
 const media=event.target;
 if(!media.matches?.('.audio-post audio,.media-slide video,.viewer-stage video,.viewer-stage audio')||initialData.qa||media.dataset.offlineWatch||offline.isOffline())return;
 const threshold=Number.isFinite(media.duration)?Math.min(2,media.duration*.65):2;
 if(media.currentTime<threshold||!media.currentSrc)return;
 media.dataset.offlineWatch='1';
 offline.watch(media.currentSrc);
},true);
document.addEventListener('play',event=>{
 const media=event.target;if(!media.matches?.('.audio-post audio,.viewer-stage video,.media-slide video'))return;
 pauseOtherVideos(media);if(!media.muted)window.JamcoMedia.meter(media,$$('.level-bars i',media.parentNode));
},true);
window.addEventListener('jamco-language',()=>{
 drawNav();
 if(location.pathname==='/'&&$('#today')&&topic==='bukoba'){$('#today').innerHTML=scheduleMarkup();updateAutoRead();}
 if(location.pathname==='/orodha/ombi'&&!$$('#listing-request input:not([type=checkbox]),#listing-request textarea').some(field=>field.value))listingRequest();
 if(location.pathname==='/gundua')discover().catch(error=>toast(error.message));
 if(location.pathname.startsWith('/habari/'))detail(location.pathname.split('/').pop()).catch(error=>toast(error.message));
});
window.addEventListener('popstate',()=>{if(location.pathname==='/'){const next=new URLSearchParams(location.search).get('mada');topic=topics.some(t=>t.key===next)?next:'bukoba';filter='';stopAutoRead();feed().catch(e=>toast(e.message))}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').then(()=>offline.warm()).catch(()=>{});
init();
})();
