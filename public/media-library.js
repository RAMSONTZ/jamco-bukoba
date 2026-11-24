const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const safeImage=raw=>{try{const u=new URL(raw,location.origin);return u.origin===location.origin||u.protocol==='https:'?u.href:''}catch{return ''}};
export function mount(main){
 if(main.querySelector('.jamco-library'))return;
 const section=el('section','panel jamco-library');section.append(el('h2','','Maktaba ya JAMCO'),el('p','muted','Picha na video zilizochapishwa hadharani.'));
 const totals=el('p','library-totals','Inapakia hesabu…'),toolbar=el('div','library-toolbar'),types=el('div','tabs'),years=el('select','');years.setAttribute('aria-label','Chuja kwa mwaka');
 const grid=el('div','library-grid'),status=el('p','muted'),more=el('button','secondary','Pakia zaidi');status.setAttribute('role','status');more.type='button';
 const params=new URLSearchParams(location.search);let type=['image','video'].includes(params.get('media'))?params.get('media'):'',year=/^\d{4}$/.test(params.get('year')||'')?params.get('year'):'',cursor=null,run=0,loading=false;
 for(const [value,label] of [['','Zote'],['image','Picha'],['video','Video']]){const b=el('button','tab',label);b.type='button';b.dataset.type=value;b.addEventListener('click',()=>{type=value;reset()});types.append(b)}
 years.append(new Option('Miaka yote',''));years.onchange=()=>{year=years.value;reset()};
 toolbar.append(types,years);section.append(totals,toolbar,grid,status,more);main.append(section);
 let restore=null;try{restore=JSON.parse(sessionStorage.getItem('jamco-library-return')||'null');sessionStorage.removeItem('jamco-library-return')}catch{}
 const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&cursor&&!loading&&!restore)load()},{rootMargin:'400px'}):null;
 function controls(){for(const b of types.children){const active=b.dataset.type===type;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))}}
 function reset(){run++;loading=false;cursor=null;restore=null;grid.replaceChildren();const url=new URL(location.href);for(const [k,v] of [['media',type],['year',year]])v?url.searchParams.set(k,v):url.searchParams.delete(k);history.replaceState(history.state,'',url);controls();load()}
 async function load(){if(loading)return;loading=true;const id=run;more.disabled=true;status.textContent='Inapakia media…';try{
 const q=new URLSearchParams({type,year,limit:'24'});if(cursor)q.set('cursor',cursor);
 const response=await fetch('/api/library?'+q,{credentials:'omit'});if(!response.ok)throw Error('Maktaba haipatikani.');const data=await response.json();if(id!==run||!section.isConnected)return;
 totals.textContent=data.images.toLocaleString('sw-TZ')+' picha · '+data.videos.toLocaleString('sw-TZ')+' video';
 years.replaceChildren(new Option('Miaka yote',''),...data.years.map(y=>new Option(String(y),String(y))));years.value=year;
 for(const item of data.items){const tile=el('a','library-tile');tile.href='/habari/'+encodeURIComponent(item.slug);tile.setAttribute('aria-label',(item.type==='video'?'Video: ':'Picha: ')+(item.title||'JAMCO'));
 if(item.thumbnail&&safeImage(item.thumbnail)){const img=el('img');img.src=safeImage(item.thumbnail);img.alt=item.title||'JAMCO';img.loading='lazy';img.decoding='async';tile.append(img)}else tile.append(el('span','library-placeholder',item.type==='video'?'▶':'Picha'));
 if(item.type==='video')tile.append(el('span','library-video','▶'+(item.duration?' '+Math.floor(item.duration/60)+':'+String(Math.floor(item.duration%60)).padStart(2,'0'):'')));
 tile.addEventListener('click',()=>{try{sessionStorage.setItem('jamco-library-return',JSON.stringify({type,year,count:grid.children.length,scroll:window.scrollY}))}catch{}});grid.append(tile)}
 cursor=data.next;status.textContent=grid.children.length?'':'Hakuna media kwa kichujio hiki.';more.hidden=!cursor;more.textContent='Pakia zaidi';if(cursor)observer?.observe(more);
 if(restore&&restore.type===type&&restore.year===year){if(cursor&&grid.children.length<restore.count){loading=false;await load();return}const y=restore.scroll;restore=null;requestAnimationFrame(()=>window.scrollTo(0,y))}
 }catch(e){if(id===run){status.textContent='Maktaba haipatikani kwa sasa.';more.hidden=false;more.textContent='Jaribu tena'}}finally{if(id===run){loading=false;more.disabled=false}}}
 controls();more.onclick=load;load();
}
