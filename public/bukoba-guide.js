const site = {
  walkgard: 'https://walkgard.com/contact/',
  elct: 'https://elctbukobahotelandtours.com/contact/',
  kiroyera: 'https://kiroyeratours.com/about-us/kiroyera-beach-campsite/',
};
const entries = [
  {type:'hoteli', title:'The Walkgard Transit Hotel', area:'Uganda Road / Karume Road', phone:'+255769430001', booking:site.walkgard, gallery:'https://walkgard.com/accommodations/', source:site.walkgard, directions:'The Walkgard Transit Hotel, Bukoba', sw:'Malazi katikati ya Bukoba. Angalia aina za vyumba na picha, kisha wasiliana na hoteli kuhusu nafasi.', en:'Accommodation in central Bukoba. Browse rooms and photos, then contact the hotel about availability.'},
  {type:'hoteli', title:'ELCT Bukoba Hotel & Tours', area:'Pwani Street, Bukoba', phone:'+255754415404', booking:site.elct, source:site.elct, directions:'ELCT Bukoba Hotel and Tours, Bukoba', sw:'Hoteli na huduma za ziara. Omba bei na nafasi kwa hoteli.', en:'Hotel and tour services. Contact the hotel for prices and availability.'},
  {type:'utalii', title:'Kiroyera Beach & Leisure Site', area:'Ziwa Victoria, Bukoba', phone:'+255759424933', booking:site.kiroyera, gallery:site.kiroyera, source:site.kiroyera, directions:'Kiroyera Beach, Bukoba', sw:'Ufukwe, kambi na shughuli za mapumziko karibu na mji.', en:'Lakeside leisure activities and camping near town.'},
  {type:'migahawa', title:'Walkgard Restaurant', area:'Uganda Road / Karume Road', phone:'+255769430001', booking:site.walkgard, gallery:'https://walkgard.com/dining/', source:'https://walkgard.com/dining/', directions:'The Walkgard Transit Hotel, Bukoba', sw:'Tazama menyu na mwonekano wa mgahawa. Piga simu kuuliza kuhusu nafasi.', en:'Browse the menu and restaurant tour. Call about availability.'},
  {type:'migahawa', title:'Kiroyera Coffee and Cappuccino Bar', area:'Kiroyera Beach, Bukoba', phone:'+255759424933', source:site.kiroyera, directions:'Kiroyera Beach, Bukoba', sw:'Kahawa ya Robusta kutoka Kagera katika eneo la mapumziko la Kiroyera.', en:'Kagera Robusta coffee at Kiroyera’s lakeside venue.'},
  {type:'meli', title:'Tanzania Shipping Company (TASHICO)', area:'Ziwa Victoria', booking:'https://www.tashico.co.tz/faqs', source:'https://www.tashico.co.tz/faqs', directions:'Bukoba Port, Tanzania', sw:'Angalia maelekezo rasmi ya tiketi na thibitisha tarehe na ratiba kabla ya safari.', en:'Read the official ticketing instructions and confirm the sailing date and timetable.'},
  {type:'afya', title:'Hospitali ya Rufaa ya Mkoa wa Bukoba', area:'Bilele, Bukoba', phone:'+255734165375', source:'https://bukobarrh.go.tz/contact', directions:'Bukoba Regional Referral Hospital, Bukoba', sw:'Mawasiliano ya hospitali yaliyochapishwa. Kwa dharura, unaweza pia kwenda moja kwa moja kitengo cha dharura kilicho karibu.', en:'Published hospital contact. In an emergency, you can also go directly to the nearest emergency department.'},
  {type:'huduma', title:'BUWASA', area:'Kitekere Street, Bukoba', phone:'+255282220300', source:'https://buwasa.go.tz/contacts', directions:'BUWASA, Bukoba', sw:'Huduma ya maji na usafi wa mazingira Bukoba.', en:'Water and sanitation services in Bukoba.'},
  {type:'huduma', title:'TANESCO', area:'Tanzania', source:'https://www.tanesco.co.tz/', sw:'Tovuti rasmi ya huduma ya umeme.', en:'Official electricity utility website.'},
];
const scrub = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe = value => {
  try {return typeof value === 'string' && new URL(value).protocol === 'https:' ? scrub(value) : '';}
  catch {return '';}
};

export function actionLinks(entry, lang = 'sw') {
  const tr = (sw, en) => lang === 'en' ? en : sw;
  const phone = typeof entry.phone === 'string' ? entry.phone.replace(/[^+0-9]/g, '') : '';
  const map = safe(entry.directions) || (entry.directions ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(entry.directions) : '');
  const anchor = (url,text) => url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : '';
  return `<div class="local-actions">${/^\+?\d{7,15}$/.test(phone) ? `<a href="tel:${phone}">${entry.delivery?tr('Piga simu / omba usafirishaji','Call / request delivery'):tr('Piga simu','Call')}</a>` : ''}${anchor(safe(entry.booking),tr('Omba nafasi / tiketi','Request booking / tickets'))}${anchor(safe(entry.gallery),tr('Picha / menyu','Photos / menu'))}${anchor(map,tr('Ramani','Directions'))}${anchor(safe(entry.source),tr('Tovuti rasmi','Official site'))}</div>`;
}

export function localDirectory(key, query, lang = 'sw') {
  const needle = query.trim().toLowerCase();
  if(!key&&!needle)return '';
  return entries.filter(entry => (!key || key === entry.type) && (!needle ||
    [entry.title, entry.area, entry.sw, entry.en].some(value => value?.toLowerCase().includes(needle))))
    .map(entry => `<article class="local-card"><h3>${scrub(entry.title)}</h3><p class="local-location">${scrub(entry.area)}</p><p>${scrub(entry[lang] || entry.sw)}</p>${actionLinks(entry, lang)}</article>`).join('');
}
