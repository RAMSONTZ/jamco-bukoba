export const origin = 'https://jamco-bukoba.vercel.app';
export const instagram = 'https://www.instagram.com/jamcobukoba2013/';
export const direct = 'https://ig.me/m/jamcobukoba2013';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const storyPath = story => '/habari/' + story.slug;
const format = new Intl.DateTimeFormat('sw-TZ', {day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Dar_es_Salaam'});
export const dateText = date => date ? format.format(new Date(date)) : '';
const categories = ['Bukoba','Kagera','Tanzania','Jamii','Usafiri','Biashara'];
const links = [['/','Mwanzo'],['/habari','Habari'],['/habari?mada=Bukoba','Bukoba'],['/habari?mada=Kagera','Kagera'],['/habari?mada=Tanzania','Tanzania'],['/habari?mada=Jamii','Jamii'],['/picha','Picha za Bukoba'],['/tv','JAMCO TV'],['/matukio','Matukio'],['/biashara','Matangazo']];
const icons = {
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  bookmark:'<path d="M6 4h12v16l-6-4-6 4z"/>', share:'<path d="M12 15V3m-4 4 4-4 4 4M5 11v9h14v-9"/>',
  home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>', news:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
  tv:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  photos:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1"/><path d="m5 18 5-5 3 3 3-5 4 7"/>',
};
function icon(name) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + icons[name] + '</svg>'; }
const mark = '<img src="/brand/icon-96.png" width="44" height="44" alt=""> <span class="wordmark">JAMCO<span>.</span></span><span class="mark-place">BUKOBA</span>';
const blank = text => '<p class="empty">' + esc(text) + '</p>';
const heading = (name, link, label = 'Ona zote') => '<header class="section-head"><h2>' + esc(name) + '</h2>' + (link ? '<a href="'+esc(link)+'">'+esc(label)+' <span aria-hidden="true">↗</span></a>' : '') + '</header>';
const intro = (title, text) => '<header class="intro"><h1>'+esc(title)+'</h1>'+(text ? '<p>'+esc(text)+'</p>' : '')+'</header>';
const embedUrl = url => {
  if (!url) return '';
  let link;
  try { link = new URL(url, origin); } catch { return ''; }
  const id = link.hostname === 'youtu.be' ? link.pathname.slice(1) : ['www.youtube.com','youtube.com'].includes(link.hostname) ? link.searchParams.get('v') : '';
  if (id && /^[\w-]{11}$/.test(id)) return 'https://www.youtube-nocookie.com/embed/' + id;
  if (['instagram.com','www.instagram.com'].includes(link.hostname) && /^\/(p|reel)\/[\w-]+\/?$/.test(link.pathname)) return 'https://www.instagram.com' + link.pathname.replace(/\/$/,'') + '/embed/';
  return '';
};
export const supportedEmbed = embedUrl;
function picture(photo, {eager = false, large = false} = {}) {
  if (!photo) return '';
  const largeWidth = /-(1440|1100)\.webp$/.exec(photo.large)?.[1];
  return '<img src="'+esc(photo.image)+'"'+(large && largeWidth ? ' srcset="'+esc(photo.image)+' 640w, '+esc(photo.large)+' '+largeWidth+'w" sizes="(max-width: 720px) 100vw, 820px"' : '')+
   ' alt="'+esc(photo.title)+'" '+(eager ? 'fetchpriority="high"' : 'loading="lazy"')+' decoding="async">';
}
const licenses = {'CC0 1.0':'https://creativecommons.org/publicdomain/zero/1.0/','CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/','CC BY-SA 4.0':'https://creativecommons.org/licenses/by-sa/4.0/','CC BY-SA 2.0':'https://creativecommons.org/licenses/by-sa/2.0/'};
function credit(photo) {
  const license = licenses[photo.license];
  return '<a href="'+esc(photo.source)+'">'+esc(photo.publisher)+'</a> · '+(license ? '<a href="'+license+'">'+esc(photo.license)+'</a>' : esc(photo.license))+
    (photo.image?.startsWith('/photos/') ? ' · ukubwa umebadilishwa' : '');
}
const save = a => '<button class="icon-btn save" data-save="'+esc(a.slug)+'" aria-pressed="false" aria-label="Hifadhi makala">'+icon('bookmark')+'</button>';
const meta = a => '<span class="meta">'+esc(a.category)+' <span>·</span> <time datetime="'+esc(a.date)+'">'+dateText(a.date)+'</time></span>';
function card(story, photos, options = {}) {
  const image = photos.get(story.photo);
  return '<article class="story-card'+(image ? ' illustrated' : '')+'">'+(image?'<a class="story-img" tabindex="-1" aria-hidden="true" href="'+storyPath(story)+'">'+picture(image)+'</a>':'')+
    '<div class="story-copy">'+meta(story)+'<h3><a href="'+storyPath(story)+'">'+esc(story.title)+'</a></h3>'+(options.compact ? '' : '<p>'+esc(story.summary)+'</p>')+
    '<div class="story-foot"><small>'+esc(story.publisher)+'</small>'+save(story)+'</div></div></article>';
}
const grid = (items, photos) => items.length ? '<div class="story-grid">'+items.map(a=>card(a,photos)).join('')+'</div>' : blank('Hakuna habari zinazolingana na chaguo lako.');
function filter(path, list, current, q) {
  return '<form method="get" action="'+path+'" class="filters"><label><span>Tafuta</span><input name="q" type="search" value="'+esc(q)+'" placeholder="Andika neno la kutafuta"></label><label><span>Mada</span><select name="mada"><option value="">Mada zote</option>'+
  list.map(cat=>'<option'+(cat===current?' selected':'')+'>'+esc(cat)+'</option>').join('')+'</select></label><button class="button">Chuja</button></form>';
}
function photoTile(p) {
  return '<figure class="photo-tile"><a href="/picha/'+esc(p.slug)+'" data-photo="'+esc(p.slug)+'">'+picture(p)+'<span class="expand" aria-hidden="true">↗</span></a><figcaption><a href="/picha/'+esc(p.slug)+'" data-photo="'+esc(p.slug)+'">'+esc(p.title)+'</a><small>'+esc(p.publisher)+' · '+dateText(p.date)+'</small></figcaption></figure>';
}
function videoTile(v, photos) {
  const p = photos.get(v.photo);
  return '<article class="video-tile"><a href="/tv/'+esc(v.slug)+'" class="video-cover">'+picture(p)+'<span aria-hidden="true">▶</span><span class="sr-only">Tazama '+esc(v.title)+'</span></a>'+meta(v)+'<h3><a href="/tv/'+esc(v.slug)+'">'+esc(v.title)+'</a></h3><p>'+esc(v.publisher)+(v.origin==='instagram'?' · Reel':'')+'</p></article>';
}
function updateForm() {
  return '<form data-json="/api/subscribe" class="form quick"><label><span>Barua pepe</span><input name="email" type="email" autocomplete="email" required placeholder="jina@mfano.com"></label><label class="check"><input type="checkbox" name="consent" required> Nakubali kupokea taarifa</label><button class="button">Jisajili</button><p role="status" class="form-status"></p></form>';
}
function newsroomCTA() {
  return '<section class="newsletter"><div><h2>Pokea habari za Bukoba</h2><p>Jisajili kwa taarifa za JAMCO au chagua arifa unazotaka.</p><a href="/mapendeleo#arifa">Chagua arifa ↗</a></div>'+updateForm()+'</section>';
}
export function htmlShell({path,title,description,content, image, schema, noindex=false, admin=false}) {
  const canonical = origin + path;
  const fullTitle = title ? title+' | JAMCO Bukoba' : 'JAMCO Bukoba | Habari za Bukoba na Kagera';
  const section = path.startsWith('/habari') ? '/habari' : path.startsWith('/picha') ? '/picha' : path.startsWith('/tv') ? '/tv' : path;
  return '<!doctype html><html lang="sw" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#121314"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="description" content="'+esc(description)+'"><title>'+esc(fullTitle)+'</title><link rel="canonical" href="'+esc(canonical)+'"><meta property="og:title" content="'+esc(fullTitle)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'"><meta property="og:type" content="'+(schema?'article':'website')+'"><meta property="og:image" content="'+esc(new URL(image||'/brand/icon-512.png',origin).href)+'">'+(noindex?'<meta name="robots" content="noindex">':'')+'<link rel="icon" href="/brand/icon-48.png" type="image/png"><link rel="apple-touch-icon" href="/brand/icon-192.png"><link rel="manifest" href="/manifest.webmanifest"><script src="/theme.js?v=20261122speed1"></script><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/theme.css?v=20261122speed1"><script defer src="/site.js"></script>'+(admin?'<script defer src="/admin.js"></script>':'')+(schema ? '<script type="application/ld+json">'+JSON.stringify(schema).replaceAll('<','\\u003c')+'</script>' : '')+'</head><body>'+
    '<a class="skip" href="#main">Ruka hadi maudhui</a><header class="masthead"><div class="utility wrap"><span>BUKOBA · KAGERA · TANZANIA</span><div><a href="/wasiliana">Tuma taarifa</a><a href="'+instagram+'">Instagram ↗</a></div></div><div class="mast-main wrap"><a href="/" class="brand" aria-label="JAMCO Bukoba, mwanzo">'+mark+'</a><div class="mast-actions"><button type="button" class="icon-btn" data-theme-toggle aria-label="Badilisha mandhari"></button><a class="icon-btn" href="/tafuta" aria-label="Tafuta">'+icon('search')+'</a><a class="icon-btn desktop" href="/hifadhi" aria-label="Ulizohifadhi">'+icon('bookmark')+'</a><a class="button mast-sub desktop" href="/mapendeleo#arifa">Pokea taarifa</a><button type="button" class="icon-btn mobile" data-menu aria-label="Fungua menyu" aria-controls="main-nav" aria-expanded="false">'+icon('menu')+'</button></div></div>'+
    '<nav id="main-nav" class="main-nav wrap" aria-label="Menyu kuu">'+links.map(([href,label])=>'<a href="'+href+'" '+(section===href?'aria-current="page"':'')+'>'+label+'</a>').join('')+'<a href="/mapendeleo" class="mobile">Mapendeleo</a></nav></header><main id="main" class="wrap">'+content+'</main>'+
    '<footer class="footer"><div class="wrap"><div><a class="brand" href="/" aria-label="JAMCO Bukoba">'+mark+'</a><p>Habari na matukio ya Bukoba, Kagera na Tanzania.</p></div><nav aria-label="JAMCO"><a href="/wasiliana">Wasiliana nasi</a><a href="/biashara">Tangaza nasi</a><a href="/kumbukumbu">Kumbukumbu</a><a href="/faragha">Faragha</a><a href="/admin">Chumba cha habari</a></nav><div><a href="'+instagram+'">@jamcobukoba2013 ↗</a><br><small>© JAMCO Bukoba</small></div></div></footer>'+
    '<nav class="bottom-nav" aria-label="Menyu ya simu">'+[['/','Mwanzo','home'],['/habari','Habari','news'],['/tv','Video','tv'],['/picha','Picha','photos'],['/hifadhi','Hifadhi','bookmark']].map(([href,label,i])=>'<a href="'+href+'" '+(section===href?'aria-current="page"':'')+'>'+icon(i)+'<span>'+label+'</span></a>').join('')+'</nav><div class="toast" role="status"></div></body></html>';
}

export function page(path, query, items, popular = []) {
  const stories = items.filter(x=>x.kind==='story');
  const photos = new Map(items.filter(x=>x.kind==='photo').map(x=>[x.slug,{...x,album:x.album||x.category}]));
  const videos = items.filter(x=>x.kind==='video');
  const events = items.filter(x=>x.kind==='event');
  const products = items.filter(x=>x.kind==='package');
  const businesses = items.filter(x=>x.kind==='listing');
  const groups = [...new Set([...categories,...items.filter(x=>x.kind==='category').map(x=>x.title),...stories.map(x=>x.category)])];
  const q = (query.get('q')||'').slice(0,100).trim();
  const category = (query.get('mada')||'').slice(0,80);
  const matches = x => (!category || x.category===category) && (!q || [x.title,x.summary,x.body,x.publisher,x.location,x.category,x.tags].join(' ').toLocaleLowerCase('sw').includes(q.toLocaleLowerCase('sw')));
  const settings = {path, description:'Habari za Bukoba na Kagera, picha, video na matukio kutoka JAMCO Bukoba.'};
  const collection = (group, list) => '<section>'+heading(group,'/habari?mada='+encodeURIComponent(group))+grid(list,photos)+'</section>';
  const emptyEvent = blank('Hakuna tukio lijalo lililothibitishwa kwa sasa.')+'<a href="/wasiliana">Wasilisha tukio ↗</a>';
  const upcoming = events.filter(event=>event.eventDate >= new Date().toLocaleDateString('sv-SE',{timeZone:'Africa/Dar_es_Salaam'})).sort((a,b)=>a.eventDate.localeCompare(b.eventDate));
  const eventList = upcoming.map(e=>'<article class="plain-card">'+meta({...e,date:e.eventDate})+'<h3>'+esc(e.title)+'</h3><p>'+esc(e.summary)+'</p><a href="'+esc(e.source)+'">Maelezo ya tukio ↗</a></article>').join('');
  if (path==='/') {
    const hero = photos.get('airfield') || photos.values().next().value;
    const lead = stories.find(s=>s.featured)||stories[0];
    const breaking = stories.filter(s=>s.breaking && Date.now()-Date.parse(s.date)<172800000);
    const latest = stories.filter(s=>s!==lead).slice(0,4);
    const jamcoReels=videos.filter(v=>v.origin==='instagram');
    const featureVideos=[...videos.filter(v=>v.embed).slice(0,1),...jamcoReels.slice(0,1)];
    const reading = popular.map(slug=>stories.find(s=>s.slug===slug)).filter(Boolean).slice(0,5);
    const photoSelection = ['town','lakeshore','victoria'].map(slug=>photos.get(slug)).filter(Boolean);
    const alerts = breaking.length ? breaking : stories.slice(0,3);
    settings.image = hero?.large;
    settings.content = '<div class="ticker"><strong>'+ (breaking.length?'HABARI MPYA':'TAARIFA MPYA')+'</strong><div>'+alerts.map(x=>'<a href="'+storyPath(x)+'">'+esc(x.title)+'</a>').join('')+'</div></div>'+
    '<div class="front-grid"><section class="lead"><figure class="lead-figure">'+picture(hero,{large:true,eager:true})+(hero?'<figcaption>'+esc(hero.location)+' / '+dateText(hero.date)+' · '+credit(hero)+'</figcaption>':'')+'</figure>'+
    (lead?'<div class="lead-text">'+meta(lead)+'<h1><a href="'+storyPath(lead)+'">'+esc(lead.title)+'</a></h1><p>'+esc(lead.summary)+'</p><a class="read-link" href="'+storyPath(lead)+'">Soma habari <span aria-hidden="true">↗</span></a></div>':'<h1>Habari za Bukoba na Kagera</h1>')+'</section>'+
    '<aside class="latest">'+heading('Habari za hivi karibuni','/habari','Habari zote')+latest.map(s=>card(s,photos,{compact:true})).join('')+'</aside></div>'+
    '<div class="home-sections">'+collection('Bukoba',stories.filter(s=>s.category==='Bukoba' && s!==lead).slice(0,3))+'<div class="paired">'+collection('Kagera',stories.filter(s=>s.category==='Kagera').slice(0,2))+collection('Tanzania',stories.filter(s=>s.category==='Tanzania').slice(0,2))+'</div>'+
    '<section>'+heading('Picha za Bukoba','/picha')+'<div class="photo-grid">'+photoSelection.map(photoTile).join('')+'</div></section><div class="paired"><section>'+heading('JAMCO TV','/tv')+'<div class="video-grid">'+featureVideos.map(v=>videoTile(v,photos)).join('')+'</div></section><section>'+heading('Instagram','/instagram')+
      stories.filter(s=>s.origin==='instagram').slice(0,3).map(s=>card(s,photos,{compact:true})).join('')+
      '<div class="plain-card"><a href="'+instagram+'">@jamcobukoba2013 ↗</a></div></section></div>'+
    collection('Jamii',stories.filter(s=>s.category==='Jamii').slice(0,3))+'<div class="paired"><section>'+heading('Matukio yajayo','/matukio')+(eventList||emptyEvent)+'</section><section>'+heading('Zinazosomwa zaidi','/habari')+(reading.length?reading.map(x=>card(x,photos,{compact:true})).join(''):blank('Orodha itaonekana baada ya wasomaji kufungua makala.'))+'</section></div>'+
    '<section>'+heading('Biashara na matangazo','/biashara')+'<div class="plain-card"><h3>Tangaza biashara au tukio lako</h3><p>Chagua huduma na ufuatilie ombi lako kwa namba ya kumbukumbu.</p><a href="/biashara">Angalia huduma ↗</a></div>'+(businesses.length?listingCards(businesses):'')+'</section>'+newsroomCTA()+'</div>';
  } else if (path==='/habari' || path==='/kumbukumbu' || path==='/tafuta') {
    const archive = path==='/kumbukumbu', search = path==='/tafuta';
    const year = query.get('mwaka') || '';
    const results = stories.filter(x=>matches(x) && (!year || x.date.startsWith(year)));
    const title = search ? 'Tafuta habari na picha' : archive ? 'Kumbukumbu' : category || 'Habari';
    settings.title = title;
    settings.content = intro(title, search?'Tafuta maneno katika habari, picha na video.':'')+filter(path,groups,category,q)+
      (archive ? '<div class="chips"><a href="/kumbukumbu">Miaka yote</a>'+[...new Set(stories.map(x=>x.date.slice(0,4)))].map(y=>'<a href="/kumbukumbu?mwaka='+y+'" '+(y===year?'aria-current="page"':'')+'>'+y+'</a>').join('')+'</div>':'')+
      (!search?'<div class="chips"><a href="/habari?mada='+encodeURIComponent(category)+'" data-follow="'+esc(category||'Habari')+'">Fuata mada</a><a href="/kumbukumbu">Kumbukumbu</a></div>':'')+grid(results,photos)+
      (search ? heading('Picha','/picha')+'<div class="photo-grid">'+[...photos.values()].filter(matches).map(photoTile).join('')+'</div>'+heading('Video','/tv')+'<div class="video-grid">'+videos.filter(matches).map(v=>videoTile(v,photos)).join('')+'</div>' : '');
  } else if (path.startsWith('/habari/')) {
    const a = stories.find(x=>storyPath(x)===path);
    if (!a) return null;
    const p = photos.get(a.photo);
    settings.title = a.title; settings.description = a.summary; settings.image = p?.large;
    settings.schema = {'@context':'https://schema.org','@type':'NewsArticle',headline:a.title,description:a.summary,datePublished:a.date,author:{'@type':'Organization',name:a.origin==='original'?'JAMCO Bukoba':a.publisher},publisher:{'@type':'Organization',name:'JAMCO Bukoba'},mainEntityOfPage:origin+path,...(p?{image:new URL(p.large||p.image,origin).href}:{})};
    const related = stories.filter(x=>x!==a).sort((left,right)=>Number(right.category===a.category)-Number(left.category===a.category)).slice(0,3);
    settings.content = '<article class="article" data-article="'+esc(a.slug)+'"><a class="back" href="/habari">← Habari</a><header>'+meta(a)+'<h1>'+esc(a.title)+'</h1><p class="deck">'+esc(a.summary)+'</p><p class="byline">'+esc(a.origin==='original'?'Habari ya JAMCO':a.origin==='instagram'?'Instagram · JAMCO':a.origin==='sponsored'?'Makala ya udhamini':'Muhtasari wa JAMCO')+' · '+esc(a.publisher)+(a.location?' · '+esc(a.location):'')+'</p><div class="article-actions">'+save(a)+'<button class="icon-btn" data-share aria-label="Shiriki">'+icon('share')+'</button><a href="https://wa.me/?text='+encodeURIComponent(a.title+' '+origin+path)+'">WhatsApp ↗</a></div></header>'+
      (p?'<figure>'+picture(p,{large:true,eager:true})+'<figcaption>'+esc(p.summary)+' '+credit(p)+'</figcaption></figure>':'')+
      '<div class="article-body">'+a.body.split(/\n\s*\n/).map(p=>'<p>'+esc(p)+'</p>').join('')+'<a class="read-link" href="'+esc(a.source)+'">Soma chanzo cha habari ↗</a></div></article><section>'+heading('Habari zinazohusiana','/habari')+grid(related,photos)+'</section>';
  } else if (path==='/picha' || path.startsWith('/picha/')) {
    const selected=photos.get(path.split('/')[2]);
    if (path!=='/picha' && !selected) return null;
    const album=(query.get('albamu')||'').slice(0,100);
    const allPhotos=[...photos.values()];
    const collection=allPhotos.filter(p=>matches(p)&&(!album||p.album===album));
    const albums=[...new Set(allPhotos.map(p=>p.album).filter(Boolean))];
    const albumLinks='<div class="chips" aria-label="Albamu"><a href="/picha">Albamu zote</a>'+albums.map(p=>'<a href="/picha?albamu='+encodeURIComponent(p)+'" '+(album===p?'aria-current="page"':'')+'>'+esc(p)+'</a>').join('')+'</div>';
    settings.title=selected?.title||'Picha za Bukoba'; settings.image=selected?.large; settings.description=selected?.summary||settings.description;
    settings.content = (selected ? '<section class="photo-detail"><a href="/picha">← Picha zote</a>'+intro(selected.title,selected.summary)+'<figure>'+picture(selected,{large:true,eager:true})+'<figcaption>'+esc(selected.location)+' · '+dateText(selected.date)+' · '+credit(selected)+'</figcaption></figure><a class="read-link" href="/picha?albamu='+encodeURIComponent(selected.album)+'">Albamu ya '+esc(selected.album)+' ↗</a> <button class="button" data-share>Shiriki picha</button></section>'+heading('Picha nyingine') : intro('Picha za Bukoba','Mji, Ziwa Victoria na kumbukumbu za Kagera.')+filter('/picha',[...new Set([...photos.values()].map(p=>p.category))],category,q)+albumLinks)+
      (collection.length?'<div class="photo-grid gallery">'+collection.map(photoTile).join('')+'</div>':blank('Hakuna picha zinazolingana.'))+
      '<dialog class="lightbox" aria-label="Picha ya ukubwa kamili"><div><button class="icon-btn" data-photo-close aria-label="Funga picha">✕</button><button class="icon-btn" data-photo-step="-1" aria-label="Picha iliyotangulia">←</button><button class="icon-btn" data-photo-step="1" aria-label="Picha inayofuata">→</button><button class="icon-btn" data-fullscreen aria-label="Jaza skrini">⤢</button></div><figure><img alt=""><figcaption></figcaption></figure><div><a data-photo-source>Chanzo ↗</a><a data-photo-license>Leseni ↗</a><button class="button" data-share>Shiriki picha</button></div></dialog>'+
      '<template id="photo-data">'+esc(JSON.stringify(collection.map(p=>({...p,licenseUrl:licenses[p.license]}))))+'</template>';
  } else if (path==='/tv' || path.startsWith('/tv/')) {
    const v=videos.find(x=>'/tv/'+x.slug===path);
    if (path!=='/tv'&&!v) return null;
    const frame = v?.embed && embedUrl(v.source);
    settings.title=v?.title||'JAMCO TV';
    settings.content = (v ? '<a class="back" href="/tv">← Video</a>'+intro(v.title,v.summary)+
      (frame?'<div class="player" data-player="'+esc(frame)+'"><button class="button" data-load-video>Tazama video ▶</button></div>':'')+
      '<p>'+dateText(v.date)+' · '+esc(v.publisher)+' · <a href="'+esc(v.source)+'">Fungua video kwenye chanzo ↗</a></p>'+(v.rights?'<p class="muted">'+esc(v.rights)+'</p>':'')+heading('Video nyingine') : intro('JAMCO TV','Video za Bukoba, Kagera na Ziwa Victoria.')+filter('/tv',[...new Set(videos.map(x=>x.category))],category,q))+
      '<div class="video-grid">'+videos.filter(x=>x!==v&&matches(x)).map(x=>videoTile(x,photos)).join('')+'</div><section>'+heading('Reels za JAMCO','/instagram')+'<a href="'+instagram+'reels/">Fungua Reels kwenye Instagram ↗</a></section>';
  } else if (path==='/matukio') {
    settings.title='Matukio';settings.content=intro('Matukio ya Kagera','Kalenda ya matukio yaliyothibitishwa.')+(eventList||emptyEvent);
  } else if (path==='/instagram') {
    const imports = stories.filter(x=>x.origin==='instagram');
    settings.title='JAMCO kwenye Instagram'; settings.content=intro(settings.title,'Habari, matukio na kazi za media za Jamal Kalumuna.')+
      '<a class="button" href="'+instagram+'">Fungua @jamcobukoba2013 ↗</a> <a class="read-link" href="'+direct+'">Tuma ujumbe ↗</a>'+
      (imports.length?'<section>'+heading('Machapisho ya JAMCO')+grid(imports,photos)+'</section>':'')+'<section>'+heading('Reels za JAMCO')+'<div class="video-grid">'+videos.filter(x=>x.origin==='instagram').map(x=>videoTile(x,photos)).join('')+'</div></section>';
  } else if (path==='/hifadhi') {
    settings.title='Habari ulizohifadhi'; settings.noindex=true;
    settings.content=intro(settings.title,'Habari ulizochagua zinahifadhiwa kwenye kifaa hiki.')+'<p data-saved-empty>Hakuna makala ulizohifadhi.</p><div class="story-grid" data-saved-list>'+stories.map(s=>'<div hidden data-saved-item="'+esc(s.slug)+'">'+card(s,photos)+'</div>').join('')+'</div>';
  } else if (path==='/mapendeleo') {
    settings.title='Mapendeleo';settings.noindex=true;settings.content=intro(settings.title,'Dhibiti mandhari, mada unazofuatilia na arifa kwenye kifaa hiki.')+
      '<section class="plain-card"><h2>Mandhari</h2><label>Mandhari ya tovuti <select data-theme-select><option value="dark">Giza</option><option value="light">Mwanga</option></select></label><h2>Mada ninazofuatilia</h2><div data-followed></div></section>'+
      '<section class="plain-card" id="arifa"><h2>Arifa za JAMCO</h2><p>Chagua taarifa unazotaka. Kivinjari kitaomba ruhusa baada ya kubonyeza Washa arifa.</p><form data-push class="form">'+['Habari muhimu','Bukoba','Matukio','Jamii'].map((x,i)=>'<label class="check"><input type="checkbox" name="topics" value="'+esc(x)+'" '+(i===0?'checked':'')+'> '+x+'</label>').join('')+'<div class="actions"><button class="button">Washa arifa</button><button class="button outline" type="button" data-push-off>Zima arifa</button></div><p role="status" class="form-status"></p></form><button type="button" class="button outline" hidden data-install>Sakinisha JAMCO</button><p class="install-note">Kwenye iPhone, fungua Safari, chagua Shiriki kisha Ongeza kwenye Skrini ya Mwanzo.</p></section>'+newsroomCTA();
  } else if (path==='/wasiliana') {
    settings.title='Tuma taarifa';settings.content=intro(settings.title,'Una habari, tukio au hoja ya kufuatilia? Wasilisha taarifa kwa chumba cha habari cha JAMCO.')+
      '<div class="form-layout"><form data-json="/api/tip" class="form plain-card"><label>Jina<input name="name" maxlength="100" required></label><label>Barua pepe<input type="email" name="email" autocomplete="email" required></label><label>Mada<select name="topic"><option value="tip">Taarifa au tukio</option><option value="support">Msaada / ujumbe kwa JAMCO</option></select></label><label>Eneo<input name="location" maxlength="100"></label><label>Maelezo<textarea name="message" required minlength="10" maxlength="3000" rows="6"></textarea></label><label class="check"><input type="checkbox" name="consent" required> Nakubali JAMCO kuwasiliana nami kuhusu taarifa hii.</label><button class="button">Wasilisha taarifa</button><p role="status" class="form-status"></p></form><aside class="plain-card"><h2>Wasiliana na JAMCO</h2><a href="'+direct+'">Tuma ujumbe kwenye Instagram ↗</a><p>Bukoba, Kagera, Tanzania</p></aside></div>';
  } else if (path==='/biashara') {
    settings.title='Tangaza kupitia JAMCO';settings.content=intro(settings.title,'Omba nafasi ya matangazo, tangaza tukio au weka nafasi ya huduma za picha na video.')+
    '<div class="service-grid">'+products.map(x=>'<article class="plain-card"><span class="meta">'+esc(x.location)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary)+'</p><p>'+ (x.price ? new Intl.NumberFormat('sw-TZ',{style:'currency',currency:'TZS',maximumFractionDigits:0}).format(x.price) : 'Bei kwa ombi')+'</p><a href="#ombi" data-product="'+esc(x.slug)+'">Chagua huduma ↗</a></article>').join('')+'</div>'+
    (businesses.length?heading('Biashara zilizochaguliwa')+listingCards(businesses):'')+
    '<div class="form-layout" id="ombi"><form class="form plain-card" data-json="/api/campaign"><h2>Omba kampeni</h2><label>Huduma<select name="product" required>'+products.map(x=>'<option value="'+esc(x.slug)+'">'+esc(x.title)+'</option>').join('')+'</select></label><label>Biashara au taasisi<input name="name" maxlength="100" required></label><label>Barua pepe<input type="email" name="email" required></label><label>Maelezo ya kampeni<textarea name="message" rows="4" required minlength="10" maxlength="3000"></textarea></label><label>Picha ya tangazo (hiari, JPG, PNG au WebP, hadi 1 MB)<input type="file" name="creative" accept="image/jpeg,image/png,image/webp"></label><label class="check"><input type="checkbox" name="consent" required> Nina ruhusa ya kutumia picha ninayowasilisha.</label><button class="button">Wasilisha ombi</button><p role="status" class="form-status"></p></form>'+
    '<form class="form plain-card" data-json="/api/track"><h2>Fuatilia kampeni</h2><label>Namba ya kumbukumbu<input name="reference" required></label><label>Barua pepe<input type="email" name="email" required></label><button class="button">Angalia hali</button><p role="status" class="form-status"></p></form></div>';
  } else if(path==='/faragha') {
    settings.title='Faragha';settings.content=intro(settings.title,'JAMCO Bukoba')+'<div class="article-body"><p>Mapendeleo na makala ulizohifadhi hubaki kwenye kivinjari chako. Taarifa unazowasilisha kupitia fomu huhifadhiwa ili JAMCO ishughulikie ombi lako. Wafanyakazi walioidhinishwa wanaweza kuzifikia kulingana na majukumu yao.</p><p>Unaweza kuzima arifa kwenye Mapendeleo na kuomba kufuta taarifa zako kupitia ujumbe kwa JAMCO. Video za nje hupakia baada ya kuchagua kuzitazama.</p><a href="'+direct+'">Wasiliana na JAMCO ↗</a></div>';
  } else return null;
  return settings;
}
function listingCards(list) {
  return '<div class="service-grid">'+list.map(x=>'<article class="plain-card"><span class="meta">BIASHARA</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary)+'</p><a href="'+esc(x.source)+'">Tembelea biashara ↗</a></article>').join('')+'</div>';
}
