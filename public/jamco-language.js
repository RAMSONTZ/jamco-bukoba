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
