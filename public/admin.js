(() => {
  const app=document.getElementById('admin-app');
  if(!app) return;
  const {api,formData,feedback}=window.jamco;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const request=(name,data={})=>api('/api/manage/'+name,data);
  const kinds={story:'Habari',photo:'Picha / albamu',video:'Video',event:'Tukio',listing:'Biashara',package:'Huduma ya matangazo',category:'Mada'};
  const states={draft:'Rasimu',review:'Inasubiri ukaguzi',published:'Imeidhinishwa / Panga',archived:'Kumbukumbu'};
  const options=(list,current)=>Object.entries(list).map(([v,label])=>'<option value="'+escape(v)+'" '+(v===current?'selected':'')+'>'+escape(label)+'</option>').join('');
  const field=(name,label,value='',type='text',required=false)=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+escape(value)+'" '+(required?'required':'')+'></label>';
  const area=(name,label,value='',rows=4)=>'<label>'+label+'<textarea name="'+name+'" rows="'+rows+'">'+escape(value)+'</textarea></label>';
  const select=(name,label,list,value)=>'<label>'+label+'<select name="'+name+'">'+options(list,value)+'</select></label>';
  const check=(name,label,checked)=>'<label class="check"><input type="checkbox" name="'+name+'" '+(checked?'checked':'')+'> '+label+'</label>';
  const button=(text,variant='')=>'<button class="button '+variant+'">'+text+'</button>';
  const status='<p class="form-status" role="status"></p>';
  let store, view='content', selected=null;
  const access={
    owner:Object.keys(kinds),
    editor:['story','photo','video','event','category'],
    reporter:['story','photo','video','event','category'],
    advertising:['package','listing'],
    viewer:[],
  };
  function addressLocal(raw) {
    if(!raw) return '';
    const date=new Date(raw);
    return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
  }
  function contentForm(row,kind,editable) {
    const x=row||{};
    const categoryTitles=Object.fromEntries([...new Set(['Bukoba','Kagera','Tanzania','Jamii','Biashara','Usafiri',...store.content.filter(d=>d.kind==='category').map(d=>d.title)])].map(t=>[t,t]));
    const base='<div class="admin-fields">'+field('slug','Kitambulisho cha kiungo',x.slug,'text',true)+field('title','Kichwa',x.title,'text',true)+field('date','Tarehe ya chanzo',x.date||new Date().toISOString().slice(0,10),'date',true)+field('category','Mada',x.category)+field('location','Eneo / nafasi',x.location)+
      select('state','Hali',store.role==='reporter'?{draft:states.draft,review:states.review}:states,x.state||'draft')+field('liveAt','Muda wa kuchapisha (muda wa kifaa)',addressLocal(x.liveAt),'datetime-local')+'</div>'+
      '<datalist id="admin-categories">'+options(categoryTitles)+'</datalist>'+area('summary','Muhtasari',x.summary,3);
    const editorial=['story','photo','video','event','listing'].includes(kind)?'<div class="admin-fields">'+field('publisher','Mchapishaji / mpiga picha',x.publisher)+field('source','Kiungo cha chanzo (HTTPS)',x.source)+select('origin','Asili',{external:'Chanzo cha nje',original:'JAMCO',instagram:'Instagram',sponsored:'Udhamini'},x.origin)+'</div>':'';
    const specific={
      story:area('body','Maudhui ya habari',x.body,8)+field('photo','Kitambulisho cha picha (hiari)',x.photo)+field('tags','Maneno muhimu',x.tags)+check('featured','Weka kama habari kuu',x.featured)+check('breaking','Weka kwenye taarifa mpya',x.breaking),
      photo:'<label>Pakia JPG, PNG au WebP (hadi 1 MB)<input name="creative" type="file" accept="image/jpeg,image/png,image/webp"></label>'+field('image','Anwani ya picha',x.image)+field('large','Anwani ya picha kubwa',x.large)+field('license','Leseni / ruhusa',x.license,'text',true)+field('album','Jina la albamu',x.album),
      video:field('photo','Kitambulisho cha picha (hiari)',x.photo)+check('embed','Onyesha kicheza video ikiwa chanzo kinaruhusu',x.embed),
      event:field('eventDate','Tarehe ya tukio',x.eventDate,'date',true),
      package:field('price','Bei kwa TZS (hiari)',x.price,'number'),
    };
    return '<form class="admin-form plain-card" data-action="content"><fieldset '+(!editable?'disabled':'')+'><legend>'+escape(kinds[kind])+'</legend><input name="kind" value="'+kind+'" type="hidden">'+base+editorial+(specific[kind]||'')+
      (x.origin==='instagram'?area('caption','Maelezo ya awali ya Instagram',x.caption)+field('people','Watu au taasisi zilizothibitishwa',x.people)+field('rights','Hali ya haki za media',x.rights):'')+
      (editable?'<div class="actions">'+button('Hifadhi')+(x.slug&&store.role!=='reporter'?'<button type="button" class="button outline" data-delete="'+escape(x.slug)+'">Futa</button>':'')+'</div>':'')+'</fieldset>'+status+'</form>';
  }
  function render() {
    const canManage=['owner','editor'].includes(store.role);
    const tabs={content:'Maudhui',requests:'Maombi',analytics:'Takwimu'};
    if(canManage) {tabs.instagram='Instagram';tabs.push='Arifa';}
    if(store.role==='owner') {tabs.staff='Wafanyakazi';tabs.audit='Historia';}
    if(!['owner','editor','advertising'].includes(store.role)) delete tabs.requests;
    const actions='<div class="admin-toolbar">'+Object.entries(tabs).map(([key,label])=>'<button type="button" class="button '+(view===key?'':'outline')+'" data-tab="'+key+'">'+label+'</button>').join('')+'<button type="button" class="button outline" data-logout>Toka</button></div>';
    let body='';
    if(view==='content') {
      const row=store.content.find(x=>x.slug===selected);
      const allowed=access[store.role];
      const fresh=selected?.startsWith('new:')?selected.slice(4):allowed[0];
      const kind=row?.kind||fresh;
      const editable=allowed.includes(kind)&&(store.role!=='reporter'||row?.state!=='published');
      body='<div class="admin-layout"><div class="admin-list">'+allowed.map(k=>'<button type="button" data-pick="new:'+k+'">+ '+kinds[k]+'</button>').join('')+
        '<input type="search" data-admin-search placeholder="Tafuta maudhui" aria-label="Tafuta maudhui">'+store.content.map(x=>'<button type="button" data-pick="'+escape(x.slug)+'" data-record>'+escape(x.title)+' · '+escape(kinds[x.kind])+' · '+escape(states[x.state])+'</button>').join('')+'</div>'+
        (kind?contentForm(row,kind,editable):'<p>Chagua rekodi kutoka kwenye orodha.</p>')+'</div>';
    } else if(view==='requests') {
      body='<div class="admin-list">'+(store.requests.map(r=>'<article class="admin-record"><h3>'+escape(r.data.name||r.kind)+'</h3><p>'+escape(r.kind)+' · '+escape(r.email)+' · '+escape(r.reference)+'</p><p>'+escape(r.data.product||r.data.location)+'</p><p>'+escape(r.data.message)+'</p>'+
        (r.data.creative?'<a href="/media/'+escape(r.data.creative)+'">Angalia picha ↗</a>':'')+'<form class="admin-form" data-action="status"><input type="hidden" name="reference" value="'+escape(r.reference)+'">'+select('status','Hali',store.labels,r.status)+'<div>'+button('Sasisha')+'</div>'+status+'</form></article>').join('')||'<p>Hakuna maombi.</p>')+'</div>';
    } else if(view==='analytics') {
      body='<h2>Usomaji wa siku 30</h2><p>Hesabu za kufunguliwa kwa makala zilizorekodiwa kwenye tovuti.</p><ol>'+store.reads.map(x=>'<li>'+escape(store.content.find(r=>r.slug===x.slug)?.title||x.slug)+' · '+escape(x.reads)+'</li>').join('')+'</ol>';
    } else if(view==='staff') {
      body='<div class="form-layout"><form class="admin-form plain-card" data-action="staff">'+field('email','Barua pepe','','email',true)+field('password','Nenosiri jipya (herufi 14 au zaidi)','','password')+select('role','Jukumu',{editor:'Mhariri',reporter:'Ripota',advertising:'Meneja wa matangazo',viewer:'Mtazamaji'})+check('active','Akaunti hai',true)+button('Hifadhi akaunti')+status+'</form><ul>'+store.staff.map(u=>'<li>'+escape(u.email)+' · '+escape(u.role)+' · '+(u.active?'Hai':'Imezimwa')+'</li>').join('')+'</ul></div>';
    } else if(view==='audit') {
      body='<ol>'+store.audit.map(x=>'<li>'+escape(x.actor)+' · '+escape(x.action)+' · '+escape(x.subject)+' · '+escape(x.happened_at)+'</li>').join('')+'</ol>';
    } else if(view==='push') {
      body='<form class="admin-form plain-card" data-action="push">'+select('slug','Habari iliyochapishwa',Object.fromEntries(store.content.filter(x=>x.kind==='story'&&x.state==='published'&&Date.parse(x.liveAt)<=Date.now()).map(x=>[x.slug,x.title])))+
        select('topic','Mada',Object.fromEntries(store.topics.map(t=>[t,t])))+button('Tuma arifa')+status+'</form>';
    } else if(view==='instagram') {
      body='<div class="form-layout"><form class="admin-form plain-card" data-action="instagram"><h2>Ongeza kiungo kwa ukaguzi</h2>'+field('source','Kiungo cha chapisho au Reel','','url',true)+field('title','Kichwa kilichothibitishwa','','text',true)+field('date','Tarehe iliyothibitishwa','','date',true)+select('kind','Aina',{story:'Chapisho',video:'Reel / video'})+field('location','Eneo lililothibitishwa')+field('category','Mada')+area('caption','Maelezo ya awali')+area('summary','Muhtasari wa ukweli')+button('Wasilisha kwa ukaguzi')+status+'</form>'+
        '<form class="admin-form plain-card" data-action="instagram"><h2>Leta kupitia Meta</h2><p>Uingizaji utaunda rekodi za kukaguliwa kabla ya kuchapishwa.</p><div>'+button('Leta machapisho')+'</div>'+status+'</form></div>';
    }
    app.innerHTML=actions+body;
    const category=app.querySelector('[name=category]');
    if(category && app.querySelector('#admin-categories')) category.setAttribute('list','admin-categories');
    const slug=app.querySelector('[name=slug]');
    if(slug && selected && !selected.startsWith('new:')) slug.readOnly=true;
  }
  async function update(){store=await request('list');render();}
  app.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b) return;
    if(b.dataset.tab){view=b.dataset.tab;render();}
    if(b.dataset.pick){selected=b.dataset.pick;render();}
    if('logout' in b.dataset) {
      try {await request('logout');location.replace('/admin');} catch(error) {feedback(error.message);}
    }
    if(b.dataset.delete&&confirm('Ufute rekodi hii?')){
      try {await request('remove',{slug:b.dataset.delete});selected=null;await update();} catch(error) {feedback(error.message);}
    }
  });
  app.addEventListener('input',e=>{
    if(!('adminSearch' in e.target.dataset)) return;
    for(const item of app.querySelectorAll('[data-record]')) item.hidden=!item.textContent.toLowerCase().includes(e.target.value.toLowerCase());
  });
  app.addEventListener('submit',async e=>{
    const form=e.target, action=form.dataset.action;
    if(!action) return;
    e.preventDefault();
    if(action==='push'&&!confirm('Utume arifa hii kwa waliojiandikisha?')) return;
    const message=form.querySelector('.form-status'), submit=form.querySelector('button:not([type])');
    submit.disabled=true;
    try {
      const data=await formData(form), result=await request(action,data);
      if(action==='content') selected=data.slug;
      await update();feedback(result.message);
    } catch(error){message.textContent=error.message;}
    finally{submit.disabled=false;}
  });
  update().catch(error=>{app.textContent=error.message;});
})();
