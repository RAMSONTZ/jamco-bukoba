(() => {
  const strings = {
    'Nyumbani':'Home','Gundua':'Explore','Akaunti':'Account','Arifa':'Notifications','Tafuta':'Search','Shiriki nasi':'Contact JAMCO',
    'Habari':'News','Matukio':'Events','Utalii':'Tourism','Hoteli':'Hotels','Migahawa':'Restaurants','Usafiri':'Transport',
    'Afya':'Health','Biashara':'Business','Burudani':'Entertainment','Elimu':'Education','Michezo':'Sports','Huduma za jamii':'Community services',
    'Serikali':'Government','Maendeleo':'Development','Jamii':'Community','Matangazo':'Notices','Bukoba':'Bukoba',
    'Zote':'All','Picha':'Photos','Video':'Video','Sauti':'Audio','Maandishi':'Text','Maoni':'Comments','Ona zaidi':'Read more',
    'Leo Bukoba':'Today in Bukoba','Taarifa za leo':'Today’s news','Ratiba ya leo':'Today’s schedule','Hakuna tukio lililothibitishwa kwa leo.':'No confirmed events today.',
    'Hakuna taarifa ya leo iliyochapishwa.':'No news has been published today.','Rudi Gundua':'Back to Explore',
    'Anza auto-scroll':'Start auto-scroll','Simamisha auto-scroll':'Stop auto-scroll','Chaguo za media':'Media settings',
    'Inapakia…':'Loading…','Jaribu tena':'Try again','Umefika mwisho.':'You’re all caught up.',
    'Tuma maoni':'Post comment','Maoni yako':'Your comment','Nakili maoni':'Copy comment','Jibu':'Reply','Penda':'Like',
    'Sikiliza taarifa':'Listen to this update','Wasiliana na JAMCO':'Contact JAMCO','Wasilisha ombi la kuorodheshwa':'Request a listing',
    'Gundua Bukoba':'Explore Bukoba','Makundi ya Gundua':'Explore categories','Taarifa na huduma':'News and services',
    'Habari na maeneo':'News and places','Matokeo ya utafutaji':'Search results','Tafuta Bukoba':'Search Bukoba',
    'Tafuta taarifa, eneo au huduma…':'Search for news, a place or a service…','Tazama yote':'Show all','Menyu kuu':'Main menu','Menyu ya simu':'Mobile menu',
    'Faragha':'Privacy','Chumba cha habari':'Newsroom','Karibu Bukoba.':'Welcome to Bukoba.','Gundua zaidi':'Explore more',
    'Matukio ya jamii':'Community events','Usafiri na miundombinu':'Transport and infrastructure','Biashara za karibu':'Local businesses',
    'Karibu nyumbani.':'Welcome home.','Jamii na Maendeleo Bukoba':'Community and development in Bukoba',
    'Watu, matukio na hadithi zinazotuunganisha.':'People, events and stories that bring us together.',
    'Malazi na sehemu za kupumzika':'Accommodation and places to stay','Taarifa na habari za jamii':'Local news and updates',
    'Shughuli na mikusanyiko':'Events and gatherings','Mandhari na maeneo ya kutembelea':'Sights and destinations','Chakula na ladha za karibu':'Local food and dining',
    'Boda boda, barabara na safari':'Motorcycle taxis, roads and travel','Huduma na taarifa za afya':'Health services and updates',
    'Wajasiriamali na biashara za karibu':'Entrepreneurs and local businesses','Muziki, sanaa na burudani':'Music, arts and entertainment',
    'Shule, masomo na maarifa':'Schools and education','Viwanja, timu na michezo':'Sports grounds, teams and fixtures','Wataalamu na huduma muhimu':'Tradespeople and essential services',
    'Mada na Story za JAMCO':'Topics and JAMCO Stories','Funga':'Close','Ghairi jibu':'Cancel reply','Hariri':'Edit','Futa':'Delete',
    'Ripoti':'Report','Umesahau nenosiri?':'Forgot your password?','Jina la kuonekana':'Display name',
    'Barua pepe':'Email','Nenosiri':'Password','Nimekubali sera ya faragha':'I accept the privacy policy',
    'Washa mandhari nyeupe':'Switch to light theme','Washa mandhari nyeusi':'Switch to dark theme',
    'Ingia':'Sign in','Fungua akaunti':'Create account','Ruka hadi maudhui':'Skip to content',
  };
  let locale = 'sw';
  try {if (localStorage.getItem('jamco-language') === 'en') locale = 'en';} catch {}
  const t = key => locale === 'en' ? strings[key] || key : key;
  const pair = (sw, en) => locale === 'en' ? en : sw;
  const labels = new WeakMap();
  function update(root = document) {
    root.querySelectorAll('[data-ui]').forEach(el => {
      const value = t(el.dataset.ui);
      if (el.childElementCount === 0 && el.textContent !== value) el.textContent = value;
    });
    root.querySelectorAll('[data-ui-label]').forEach(el => {
      const value = t(el.dataset.uiLabel);
      if (labels.get(el) !== value) {el.setAttribute('aria-label',value);labels.set(el,value);}
    });
    root.querySelectorAll('[data-ui-placeholder]').forEach(el => {
      const value=t(el.dataset.uiPlaceholder);
      if(el.placeholder!==value)el.placeholder=value;
    });
    const button = document.querySelector('[data-language-toggle]');
    if (button) {
      const label = pair('Change language to English','Badili lugha iwe Kiswahili');
      if (button.textContent !== (locale === 'sw' ? 'EN' : 'SW')) button.textContent = locale === 'sw' ? 'EN' : 'SW';
      button.title = label;
      button.setAttribute('aria-label',label);
    }
    document.documentElement.lang = locale;
  }
  function start() {
    update();
    document.querySelector('[data-language-toggle]')?.addEventListener('click', () => {
      locale = locale === 'sw' ? 'en' : 'sw';
      try {localStorage.setItem('jamco-language',locale);} catch {}
      update();
      window.dispatchEvent(new Event('jamco-language'));
    });
    new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) update();
    }).observe(document.body,{childList:true,subtree:true});
  }
  window.JamcoLanguage = {t,pair,get locale(){return locale;},update};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
