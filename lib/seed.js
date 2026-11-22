import instagram from './instagram.js';

const municipal = 'https://bukobamc.go.tz/news';
const council = 'Manispaa ya Bukoba';
const shipping = 'Tanzania Shipping Company (TASHICO)';
const daily = 'Daily News';

function story(slug, title, date, category, location, publisher, source, summary, body, extra = {}) {
  return { slug, kind: 'story', title, date, category, location, publisher, source, summary, body, ...extra };
}

function photo(slug, title, date, category, publisher, file, license, summary) {
  return { slug, kind: 'photo', title, date, category, publisher, source: 'https://commons.wikimedia.org/wiki/File:' + file,
    license, location: 'Bukoba', summary, image: '/photos/' + slug + '-640.webp',
    large: '/photos/' + slug + (['waterfront','airfield','victoria'].includes(slug) ? '-1440.webp' : '-1100.webp') };
}

export default [
  ...instagram,
  story('bukoba-yakagua-miradi', 'Bukoba yakagua miradi ya elimu, afya na biashara', '2026-11-19', 'Bukoba', 'Bukoba Mjini', council, municipal,
    'Kamati ya Usalama ya Wilaya ilitembelea miradi inayoendelea, ikiwemo maabara za shule na kituo cha mafunzo ya ufundi.',
    'Ziara iliongozwa na Mkuu wa Wilaya ya Bukoba, Erasto Yohana Sima. Kwa mujibu wa manispaa, kamati ilifuatilia kazi zinazoendelea na changamoto zinazoweza kuchelewesha kukamilika kwa miradi.\n\nMaeneo yaliyotembelewa ni pamoja na kituo cha ufundi cha Stadium VETA, maabara za sekondari za Samia Suluhu na Kyamigege, na kituo cha mafunzo ya walimu kilichopo Shule ya Msingi Ihungo, Buhembe.',
    { featured: true }),
  story('uchunguzi-mv-new-mwanza', 'Serikali yatangaza uchunguzi wa tukio la MV New Mwanza', '2026-11-19', 'Tanzania', 'Ziwa Victoria', shipping, 'https://www.tashico.co.tz/news/investigation-into-mv-new-mwanza',
    'TASHICO imeripoti kuwa serikali inapanga kuunda timu ya wataalamu kubaini chanzo cha tukio la meli kugonga mwamba Mwanza.',
    'Kwa mujibu wa taarifa ya TASHICO, tukio lilitokea karibu na Bismarck Rock katika Ziwa Victoria. Taarifa ilieleza mpango wa kufanya uchunguzi wa kina. MV New Mwanza ilifanya safari ya majaribio kuelekea Bukoba mwaka 2025.'),
  story('mikopo-asilimia-kumi', 'Manispaa yafungua dirisha la mikopo ya asilimia 10', '2026-11-12', 'Jamii', 'Bukoba Mjini', council, 'https://www.bukobamc.go.tz/huduma-za-uvuvi',
    'Dirisha lilitangazwa kuwa wazi kuanzia 12 Novemba hadi 12 Desemba 2026.',
    'Tangazo la mkurugenzi wa Manispaa ya Bukoba limeainisha kipindi cha kupokea maombi ya mikopo hiyo. Angalia tangazo rasmi kwenye sehemu ya Matangazo Muhimu kwa masharti na utaratibu wa kutuma maombi.'),
  story('jkt-bukoba-hiari', 'Bukoba yatangaza nafasi za JKT kwa vijana wanaojitolea', '2026-11-10', 'Jamii', 'Bukoba', council, 'https://www.bukobamc.go.tz/huduma-za-uvuvi',
    'Ofisi ya Mkuu wa Wilaya imetangaza fursa ya mafunzo ya hiari ya JKT kwa mwaka 2026/2027.',
    'Tangazo linataja mafunzo kwa mkataba wa miaka miwili. Vijana wenye nia wanaweza kusoma tangazo la uandikishaji kwenye tovuti ya manispaa ili kupata vigezo na hatua za kujiunga.'),
  story('anuani-za-makazi-bukoba', 'Bukoba yatoa wito wa kuhuisha anwani za makazi', '2026-11-10', 'Jamii', 'Bukoba Mjini', council, 'https://www.bukobamc.go.tz/huduma-za-uvuvi',
    'Manispaa imewaomba wakazi kushiriki katika usasishaji wa taarifa za makazi.',
    'Halmashauri inaeleza kuwa zoezi hilo linalenga kuboresha mawasiliano na utambuzi wa makazi wakati wananchi wanahitaji huduma za serikali. Maelekezo ya ushiriki yanapatikana kupitia tangazo la manispaa.'),
  story('kagera-bima-ya-afya', 'Kagera yazindua awamu ya pili ya bima ya afya kwa wote', '2026-10-20', 'Kagera', 'Kagera', council, 'https://bukobamc.go.tz/welcomenote',
    'Mpango huo unalenga kupanua upatikanaji wa huduma za afya, ukiweka mkazo kwa kaya zenye uhitaji.',
    'Taarifa ya manispaa inamtaja Mkuu wa Mkoa wa Kagera, Kanali Yahya Kido, kuwa alizindua awamu hiyo. Alieleza matarajio ya kusajili kaya 38,217 kupitia mpango huu. Idadi hiyo ni lengo lililotajwa wakati wa uzinduzi.'),
  story('ukaguzi-nshambya-ihungo', 'Manispaa yakagua miradi ya Hospitali ya Nshambya na Ihungo', '2026-10-13', 'Bukoba', 'Bukoba Mjini', council, municipal,
    'Miongoni mwa maeneo yaliyotembelewa ni majengo ya huduma za afya ya uzazi, meno na macho.',
    'Timu ya menejimenti ilikagua pia kituo cha mafunzo ya walimu cha Ihungo na jengo la utawala la Rwamishenye. Manispaa ilisema ukaguzi ulilenga kufuatilia maendeleo na kutambua vikwazo vya utekelezaji.'),
  story('soko-jipya-bukoba', 'Wafanyabiashara Bukoba waandaliwa kuhamia soko jipya', '2026-09-25', 'Biashara', 'Bukoba Mjini', daily, 'https://dailynews.co.tz/bukoba-market-upgrade-nears-completion/',
    'Daily News iliripoti kwamba ujenzi wa soko ulikuwa umefikia asilimia 65 wakati wa ziara ya mkuu wa mkoa mwezi Septemba.',
    'Taarifa hiyo ilieleza kuwa maandalizi ya kuwahamisha wafanyabiashara yalipaswa kuanza mapema. Mkurugenzi wa manispaa alitaja Januari 2027 kama muda uliopangwa wa kukamilisha kazi wakati huo. Jengo linatarajiwa kuwa na vibanda vya biashara, maduka na sehemu ya maegesho.'),
  story('miradi-ya-mji-wa-bukoba', 'Miradi ya soko, stendi na Mto Kanoni katika mpango wa Bukoba', '2026-05-01', 'Bukoba', 'Bukoba Mjini', daily, 'https://dailynews.co.tz/bukoba-set-for-major-facelift-under-30bn-project/',
    'Mpango wa miradi ya mji ulijumuisha maeneo ya biashara, usafiri na kingo za mto.',
    'Katika mkutano na madiwani, Mkuu wa Wilaya alisisitiza ufuatiliaji wa ujenzi na uwajibikaji. Daily News iliripoti pia wito kwa wakazi kufikiria fursa za huduma kama malazi na mikutano kadiri shughuli za kiuchumi zinavyoongezeka.'),
  story('mv-mwanza-yazinduliwa', 'Waziri Mkuu azindua MV New Mwanza', '2026-03-11', 'Tanzania', 'Mwanza', shipping, 'https://www.tashico.co.tz/news/title-en-mv-new-mwanza-yazinduliwa-summary-en-waziri-mkuu-dk-mwigulu-nchemba-amezindua-rasmi-meli-ya-mv-new-mwanza-ambayo-ni-kubwa-zaidi-katika-ukanda-wa-afrika-inayofanya-kazi-katika-maji-matamu-ikiwa-na-kimo-cha-ghorofa-nne-urefu-wa-mita-92-6-upana-wa-m',
    'TASHICO ilitangaza uzinduzi rasmi wa meli hiyo ya Ziwa Victoria mwezi Machi.',
    'Kwa mujibu wa TASHICO, Waziri Mkuu Dk. Mwigulu Nchemba ndiye aliyezindua meli. Meli hiyo yenye ghorofa nne ilitangulia kufanya safari ya majaribio kati ya Mwanza na Bukoba.'),
  story('mv-mwanza-jaribio-bukoba', 'Safari ya majaribio ya MV New Mwanza kuelekea Bukoba', '2025-10-02', 'Usafiri', 'Ziwa Victoria', shipping, 'https://www.tashico.co.tz/news/title-en-mv-new-mwanza-yafanya-safari-ya-kwanza-mwanza-kwenda-bukoba-summary-en-mkuu-wa-mkoa-wa-mwanza-mhe-said-mtanda-leo-tarehe-21-septemba-2025-ameshuhudia-safari-ya-kwanza-ya-meli-ya-mv-new-mwanza-kutoka-bandari-ya-mwanza-kusini-iliyopo-jijini-mwanza-',
    'Safari ilianza Bandari ya Mwanza Kusini tarehe 21 Septemba 2025.',
    'TASHICO ilieleza kuwa meli ilibeba wataalamu wa mkandarasi, maafisa wa serikali na wawakilishi wa vyombo vya ulinzi na usalama. Mkuu wa Mkoa wa Mwanza, Said Mtanda, alishuhudia kuondoka kwa meli.'),
  story('mv-victoria-huduma-2025', 'Kumbukumbu ya kurejea kwa huduma ya MV Victoria mwaka 2025', '2025-05-21', 'Usafiri', 'Ziwa Victoria', daily, 'https://dailynews.co.tz/tanzanias-mv-victoria-resumes-operations/',
    'Daily News iliripoti kwamba safari ya Mwanza hadi Bukoba ilipangwa kurejea tarehe 22 Mei 2025 baada ya matengenezo.',
    'Matengenezo yalihusisha injini na mifumo ya urambazaji, kwa mujibu wa taarifa hiyo. Angalia huduma ya tiketi ya TASHICO kwa ratiba za sasa.', { photo: 'victoria' }),
  photo('airfield','Uwanja wa ndege wa Bukoba','2025-12-02','Bukoba Leo','Byera04','Bukoba_Airport_2025.jpg','CC0 1.0','Mwonekano wa Uwanja wa Ndege wa Bukoba, Desemba 2025.'),
  photo('aircraft','Ndege zikiwa zimetua Bukoba','2025-12-02','Miundombinu','Byera04','Ndege_zikiwa_zimetua_uwanja_wa_ndege_wa_Bukoba.jpg','CC BY 4.0','Ndege katika uwanja wa Bukoba.'),
  photo('waterfront','Pana ya mwambao wa Bukoba','2021-11-01','Ziwa Victoria','Bugsinmyfood','Bukoba_beach_panorama.jpg','CC BY-SA 4.0','Mandhari ya ufukwe wa Bukoba kwenye Ziwa Victoria.'),
  photo('lakeshore','Ufukwe wa Ziwa Victoria','2021-10-30','Ziwa Victoria','Bugsinmyfood','Bukoba_beach.jpg','CC BY-SA 4.0','Ufukwe wa Ziwa Victoria, Bukoba.'),
  photo('town','Bukoba na eneo la Kanisa Kuu','2021-09-28','Utalii','Bertin wekaza','Bukoba_tanzania.jpg','CC BY-SA 4.0','Mwonekano wa mji wa Bukoba na eneo la Kanisa Kuu kutoka juu.'),
  photo('night','Bukoba usiku','2021-09-28','Utalii','Bertin wekaza','Bukoba_city_at_night.png','CC BY-SA 4.0','Taa za mji wa Bukoba wakati wa usiku.'),
  photo('victoria','MV Victoria katika Bandari ya Bukoba','2012-11-30','Kumbukumbu','FrooiOhnesorg','MV_Victoria.jpg','CC BY-SA 2.0','Picha ya kumbukumbu ya MV Victoria (1959) ikitia nanga Bukoba.'),
  { ...photo('shore-archive','Mwonekano wa Bukoba kutoka juu','2006-01-30','Kumbukumbu','Andrew Coe','Bukoba.JPG','Public domain','Picha ya kumbukumbu ya Bukoba. Tarehe inaonyesha ilipopakiwa, si tarehe ya kupigwa.'), uploadDate: true },
  {slug:'video-mv-new-mwanza',kind:'video',title:'MV New Mwanza yaanza safari kuelekea Bukoba',summary:'Mwananchi Digital ilifuatilia safari ya majaribio kutoka Bandari ya Mwanza Kusini.',date:'2025-09-21',category:'Usafiri',publisher:'Mwananchi Digital',source:'https://www.youtube.com/watch?v=9qx643SkbCU',embed:true, photo:'waterfront'},
  {slug:'video-icon-tv',kind:'video',title:'ICON TV yafuatilia safari ya kwanza kuelekea Bukoba',summary:'Taarifa ya video ya kuondoka kwa MV New Mwanza kuelekea Bukoba.',date:'2025-09-21',category:'Usafiri',publisher:'ICON TV TZ',source:'https://www.youtube.com/watch?v=CoMfCEB3h9A',embed:true},
  ...[
    ['sponsored-story','Makala ya udhamini','Habari / Makala','Makala iliyowekewa alama ya udhamini.'],
    ['business-profile','Wasifu wa biashara','Orodha ya biashara','Onyesha huduma, eneo na mawasiliano ya biashara yako.'],
    ['homepage-ad','Tangazo la ukurasa wa mwanzo','Mwanzo','Onyesha kampeni kwa wasomaji wa ukurasa wa mwanzo.'],
    ['category-ad','Tangazo kwa mada','Kurasa za mada','Onyesha kampeni kwenye mada inayolingana na biashara yako.'],
    ['event-promotion','Tangazo la tukio','Matukio','Tangaza tukio na maelekezo ya kushiriki.'],
    ['video-sponsor','Udhamini wa video','JAMCO TV','Omba nafasi ya udhamini katika sehemu ya video.'],
    ['coverage-booking','Huduma za picha na video','Booking','Omba huduma ya kupiga picha au video katika tukio lako.'],
    ['notice','Tangazo la kibiashara','Matangazo','Wasilisha taarifa rasmi ya biashara au taasisi.'],
  ].map(([slug,title,location,summary])=>({slug,title,location,summary,kind:'package',date:'2026-11-21'}))
];
