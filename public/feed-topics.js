export const feedTopics=[
 {key:'bukoba',label:'Bukoba',icon:'compass',aliases:[]},
 {key:'serikali',label:'Serikali',icon:'building',aliases:['Taarifa za Serikali','Serikali']},
 {key:'maendeleo',label:'Maendeleo',icon:'growth',aliases:['Maendeleo','Miundombinu','Ujenzi']},
 {key:'jamii',label:'Jamii',icon:'people',aliases:['Jamii','Taarifa ya Jamii','Taarifa Muhimu','Msiba / Kumbukumbu','Harusi / Uchumba','Mahafali']},
 {key:'matukio',label:'Matukio',icon:'calendar',aliases:['Matukio','Tukio']},
 {key:'matangazo',label:'Matangazo',icon:'megaphone',aliases:['Tangazo','Business Promotions','Matangazo','Tangazo la biashara']},
 {key:'michezo',label:'Michezo',icon:'ball',aliases:['Michezo','Sports']}
];
export const findFeedTopic=key=>feedTopics.find(x=>x.key===key);
