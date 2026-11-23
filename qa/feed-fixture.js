import {optimizeMedia} from '../lib/media.js';
export function mediaFixture(){
 const common={publisher:'JAMCO · Jaribio la preview',origin:'original',contentType:'Habari',category:'Jamii',location:'QA pekee',date:'2026-11-23',liveAt:'2026-11-23T06:00:00Z',likes:0,comments:0,liked:false,kind:'story'};
 const posts=[
 {...common,slug:'qa-video-fixture',title:'JARIBIO: video na sauti — si habari',body:'Hii ni video ya test pattern yenye sauti ya majaribio. Inaonekana kwenye preview ya QA pekee; haihifadhiwi kwenye database na haionekani production.',media:[{type:'video',url:'/__qa/media.mp4',alt:'Test pattern ya sekunde nne yenye audio ya majaribio'}]},
 {...common,slug:'qa-carousel-fixture',title:'JARIBIO: picha nyingi — si habari',body:'Picha za kumbukumbu zilizopo zinatumika kupima swipe, mzunguko wa hiari na kuza picha. Huu si uchapishaji wa umma.',media:[optimizeMedia({type:'image',url:'/photos/aircraft-1100.webp',alt:'Jaribio la picha ya kwanza',credit:'Byera04',license:'CC BY 4.0',date:'2025-12-02',source:'https://commons.wikimedia.org/wiki/File:Ndege_zikiwa_zimetua_uwanja_wa_ndege_wa_Bukoba.jpg'}),optimizeMedia({type:'image',url:'/photos/airfield-1440.webp',alt:'Jaribio la picha ya pili',credit:'Byera04',license:'CC0 1.0',date:'2025-12-02',source:'https://commons.wikimedia.org/wiki/File:Bukoba_Airport_2025.jpg'})]},
 {...common,slug:'qa-note-fixture',title:'JARIBIO: ujumbe wa maandishi pekee',body:'Ujumbe huu wa majaribio unaonyesha namna taarifa fupi inaweza kuonekana bila picha au video. Preview pekee; haujatumwa kwa jamii.',media:[]}
 ];
 const photos=posts[1].media,clip=posts[0].media[0];
 posts.push({...common,slug:'qa-mixed-album',title:'JARIBIO: albamu ya picha na video',body:'Media kumi kwa jaribio la swipe kwenye preview.',
  media:Array.from({length:10},(_,i)=>i===2?clip:photos[i%2])});
 return {posts,more:false};
}
