const ig = 'https://www.instagram.com/jamcobukoba2013/';
const publisher = 'Jamal Kalumuna · @jamcobukoba2013';
const rights = 'Kiungo cha chanzo pekee. Picha na video zinahitaji ruhusa ya kuchapishwa tena.';
const item = (kind, slug, id, type, date, title, summary, category, location, extra={}) => ({
  kind, slug, origin: 'instagram', title, summary, date, category, location, publisher, rights,
  source: ig+type+'/'+id+'/', ...extra,
});

export default [
  item('story','jamco-frank-agnes','DgAVrmeiG0U','p','2026-11-21','JAMCO yawapongeza Frank na Agnes',
    'Jamal Kalumuna aliwapongeza Frank na Agnes na kuishukuru kamati katika chapisho la JAMCO.',
    'Jamii','',{body:'Katika chapisho lenye picha, JAMCO ilitoa pongezi kwa Frank na Agnes na kuishukuru kamati kwa kuiamini. Picha na ujumbe wa awali vinapatikana moja kwa moja kwenye akaunti ya JAMCO.',people:'Frank, Agnes',caption:'Hongera sana Frank & Agnes'}),
  item('story','jamco-ratiba-ya-mazishi-bukoba','Df9AP6mohDY','p','2026-11-19','JAMCO yashiriki taarifa ya mazishi ya Robert Matungwa Bashereka',
    'Tangazo la JAMCO lilitaja Jumatatu, Novemba 23, kama siku ya mazishi.',
    'Jamii','Bukoba',{body:'JAMCO ilishiriki tangazo la ratiba ya kumuaga Robert Matungwa Bashereka. Kwa mujibu wa tangazo hilo, ratiba ilianza Jumapili, Novemba 22, na mazishi yalipangwa kufanyika Jumatatu, Novemba 23. Fuata chapisho la awali na taarifa zinazofuata kutoka kwa waandaaji kwa mabadiliko yoyote.',people:'Robert Matungwa Bashereka',caption:'Ratiba ya mazishi'}),
  item('video','reel-jamco-maandalizi-ya-mazishi','DgABH7MIVfa','reel','2026-11-21','Maandalizi ya mazishi katika Kitendaguro',
    'JAMCO ilichapisha taarifa ya video kuhusu maandalizi ya kumuaga Robert Matungwa Bashereka.',
    'Jamii','Kitendaguro, Bukoba',{people:'Robert Matungwa Bashereka',caption:'Maandalizi yanaendelea'}),
  item('video','reel-jamco-gymkana','Df-LE4Ru-NF','reel','2026-11-20','Mwamposa katika viwanja vya Gymkana, Bukoba',
    'JAMCO ilishiriki video na kutaja Novemba 20 kuwa siku ya tukio kwenye viwanja vya Gymkana.',
    'Jamii','Gymkana, Bukoba',{people:'Mwamposa',caption:'Viwanja vya Gymkana Bukoba Manispaa'}),
  item('video','reel-jamco-kcu','Df-ZacoOGZE','reel','2026-11-20','JAMCO ndani ya ukumbi wa KCU',
    'Video ya JAMCO inaonyesha shughuli katika ukumbi ambao Kalumuna aliutaja kama KCU.',
    'Burudani','Ukumbi wa KCU',{caption:'Ni ukumbi wa Kcu'}),
  item('video','reel-jamco-kanisa-kuu','Df9nTxAI7R4','reel','2026-11-20','Video kutoka eneo la Kanisa Kuu la Bukoba',
    'JAMCO iliweka video yenye maelezo “Cathedral Bukoba” kwenye Instagram.',
    'Jamii','Kanisa Kuu, Bukoba',{caption:'Cathedral Bukoba'}),
  item('video','reel-jamco-mapacha','Df-kVtluOf9','reel','2026-11-20','JAMCO yashiriki video ya mapacha',
    'Jamal Kalumuna aliwasherehekea mapacha katika video aliyoshiriki Novemba 20.',
    'Burudani','',{caption:'Mapacha mmetisha'}),
  item('event','jamco-ratiba-ya-jamii-novemba','DgABH7MIVfa','reel','2026-11-21','Ratiba ya mazishi iliyotangazwa na JAMCO',
    'Mazishi ya Robert Matungwa Bashereka yalitangazwa kufanyika Jumatatu, Novemba 23. Angalia chanzo kwa taarifa za ratiba.',
    'Jamii','Bukoba',{eventDate:'2026-11-23'}),
];
