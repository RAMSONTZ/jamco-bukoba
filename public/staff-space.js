import {directoryServices} from './service-categories.js';

const statusLabels={received:'Imepokelewa',reviewing:'Inapitiwa',approved:'Imeidhinishwa',declined:'Imekataliwa',closed:'Imefungwa'};
const avatar=(photoId,esc)=>photoId?'<img src="/media/'+esc(photoId)+'?w=96&format=webp" alt="Picha ya wasifu" width="96" height="96">':'<img src="/brand/icon-96.png" alt="" width="96" height="96">';

export function activationView(root,{api,esc,submit,toast},token,onReady) {
  root.innerHTML='<section class="staff-welcome panel"><img src="/brand/icon-96.png" width="56" height="56" alt=""><h1>Washa akaunti ya wakala</h1><p>Tumia barua pepe iliyowekewa mwaliko. Baada ya kuingia utasanidi uthibitisho wa hatua mbili.</p><form class="form"><label>Barua pepe<input type="email" name="email" autocomplete="email" required></label><label>Nenosiri jipya<input type="password" name="password" minlength="14" autocomplete="new-password" required></label><button class="primary">Washa akaunti</button><p class="form-status" role="status"></p></form></section>';
  const form=root.querySelector('form');
  form.onsubmit=event=>{
    event.preventDefault();
    submit(form,async values=>{
      const result=await api('agent-accept',{...values,token});
      history.replaceState(null,'','/admin/wakala');
      toast(result.message);
      await onReady();
      return result;
    });
  };
}

export async function inviteView(root,{api,esc,submit,toast}) {
  const {items}=await api('admin-agents');
  root.innerHTML=`<section class="panel"><h2>Waalike mawakala</h2><p>Unda kiungo cha mwaliko kwa barua pepe ya wakala. Kiungo kinafanya kazi mara moja ndani ya saa 48.</p><form class="form" data-invite><label>Barua pepe ya wakala<input type="email" name="email" required></label><button class="primary">Tengeneza mwaliko</button><p class="form-status" role="status"></p></form><div class="agent-link" hidden><label>Kiungo cha mwaliko<input readonly aria-label="Kiungo cha mwaliko"></label><button type="button" class="secondary">Nakili kiungo</button></div></section><section class="panel"><h2>Akaunti za wakala</h2>${items.length?items.map(item=>`<div class="list-item"><strong>${esc(item.email)}</strong><p>${item.active?'Hai':'Imesimamishwa'} · ${item.mfa?'Hatua mbili zimewashwa':'Inasubiri usanidi'}</p><button class="secondary" type="button" data-agent-toggle="${esc(item.email)}" data-active="${!item.active}">${item.active?'Simamisha':'Rejesha'}</button></div>`).join(''):'<p>Hakuna wakala aliyewasha akaunti bado.</p>'}</section>`;
  const form=root.querySelector('[data-invite]'),invite=root.querySelector('.agent-link'),link=invite.querySelector('input');
  form.onsubmit=event=>{
    event.preventDefault();
    invite.hidden=true;
    submit(form,async values=>{
      const result=await api('admin-agent-invite',values);
      link.value=location.origin+'/admin/wakala#invite='+result.token;
      invite.hidden=false;
      return {message:'Mwaliko umetengenezwa.'};
    });
  };
  invite.querySelector('button').onclick=async()=>{
    try{await navigator.clipboard.writeText(link.value);toast('Kiungo kimenakiliwa.');}
    catch{link.select();}
  };
  root.querySelectorAll('[data-agent-toggle]').forEach(button=>{
    button.onclick=async()=>{
      button.disabled=true;
      try{await api('admin-agent-update',{email:button.dataset.agentToggle,active:button.dataset.active==='true'});await inviteView(root,{api,esc,submit,toast});}
      catch(error){button.disabled=false;toast(error.message);}
    };
  });
}

export async function agentView(root,{api,esc,submit,toast},staff,onExit) {
  const {profile,listings}=await api('agent-profile');
  const label=(value)=>esc(value||'');
  root.innerHTML=`<section class="agent-profile"><div class="agent-profile-avatar">${avatar(profile.photoId,esc)}</div><div><p>JAMCO · WAKALA</p><h1>${esc(profile.name||'Wasifu wangu')}</h1><small>${esc(profile.location||staff.email)}</small></div><button class="secondary" type="button" data-agent-logout>Toka</button></section>
  <section class="panel"><h2>Orodha yangu</h2>${listings.length?listings.map(item=>`<div class="list-item"><strong>${esc(item.name)}</strong><p>${esc(item.service)} · ${esc(statusLabels[item.status]||item.status)}</p>${item.slug?`<a class="read-link" href="/habari/${esc(item.slug)}">Ona wasifu wa umma →</a>`:''}</div>`).join(''):'<p>Maombi yako yataonekana hapa  baada ya kuyatuma.</p>'}</section>
  <section class="panel"><h2>Wasilisha mtoa huduma</h2><form class="form" data-agent-listing><label>Sehemu<select name="service">${directoryServices.map(service=>`<option value="${esc(service)}">${esc(service)}</option>`).join('')}</select></label><label>Jina la umma<input name="name" maxlength="100" required></label><label>Eneo<input name="location" maxlength="100" required></label><label>Simu ya mtoa huduma<input name="phone" type="tel" maxlength="24"></label><label>Huduma zinazotolewa<textarea name="message" minlength="10" maxlength="3000" required></textarea></label><label>Picha<input type="file" name="photo" accept="image/*,.heic,.heif,.tiff"></label><label class="check"><input name="delivery" type="checkbox">Anaweza kupeleka chakula au bidhaa</label><label class="check"><input name="publicContact" type="checkbox">Mtoa huduma ameruhusu namba yake kuonekana hadharani</label><label class="check"><input name="consent" type="checkbox" required>Nina ridhaa ya mtoa huduma, ikiwemo ridhaa ya kutumia picha</label><button class="primary">Tuma kwa JAMCO</button><p class="form-status" role="status"></p></form></section>
  <details class="panel"><summary>Hariri wasifu wangu</summary><form class="form" data-agent-profile><label>Jina<input name="name" value="${label(profile.name)}" maxlength="100" required></label><label>Eneo<input name="location" value="${label(profile.location)}" maxlength="100"></label><label>Kuhusu mimi<textarea name="bio" maxlength="500">${label(profile.bio)}</textarea></label><label>Picha ya wasifu<input type="file" name="photo" accept="image/*,.heic,.heif,.tiff"></label><button class="primary">Hifadhi wasifu</button><p class="form-status" role="status"></p></form></details>`;
  const attach=async(form,values,fallback='')=>{
    const original=form.elements.photo.files[0];
    const result=original?await window.JamcoMedia.upload(original,(action,data)=>api('agent-'+action,data),percent=>{
      form.querySelector('.form-status').textContent='Inapakia picha: '+percent+'%';
    }):null;
    const {photo,...rest}=values;
    return {...rest,photoId:result?.id||fallback};
  };
  const profileForm=root.querySelector('[data-agent-profile]'),listingForm=root.querySelector('[data-agent-listing]');
  profileForm.onsubmit=event=>{
    event.preventDefault();
    submit(profileForm,async values=>{
      const result=await api('agent-profile-save',await attach(profileForm,values,profile.photoId));
      await agentView(root,{api,esc,submit,toast},staff,onExit);return result;
    });
  };
  listingForm.onsubmit=event=>{
    event.preventDefault();
    submit(listingForm,async values=>{
      const result=await api('agent-submit',await attach(listingForm,values));
      toast(result.message);
      await agentView(root,{api,esc,submit,toast},staff,onExit);return result;
    });
  };
  root.querySelector('[data-agent-logout]').onclick=onExit;
}
