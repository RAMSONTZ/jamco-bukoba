import {sessionCookie,sessionInterval,sessionSeconds} from './session-policy.js';
import {directoryServices} from '../public/service-categories.js';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sendNotification } from 'web-push';
import { published, record } from './db.js';
import { supportedEmbed } from './pages.js';

const scrypt = promisify(scryptCallback);
export const topics = ['Habari muhimu','Bukoba','Matukio','Jamii'];
const kinds = ['story','photo','video','event','listing','package','category'];
const editorial = ['story','photo','video','event','category'];
const commercial = ['listing','package'];
const roles = ['owner','editor','reporter','advertising','viewer'];
const states = ['draft','review','published','archived'];
export class ApiError extends Error { constructor(status,message) { super(message); this.status=status; } }
const fail = (status,message) => { throw new ApiError(status,message); };
const sha = v => createHash('sha256').update(v).digest('hex');
const text = (v,max) => typeof v==='string' ? v.trim().slice(0,max) : '';
const required = (v,max,min=1) => {
  const value=text(v,max);
  if(value.length<min) fail(400,'Jaza taarifa zote zinazohitajika.');
  return value;
};
const email = value => {
  const v=required(value,220).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail(400,'Weka barua pepe halali.');
  return v;
};
const validSlug = v => typeof v==='string' && /^[a-z0-9][a-z0-9-]{1,95}$/.test(v);
const uuid = v => typeof v==='string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v);
const isoDay = v => typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v;
const web = (value,local=false) => {
  const v=required(value,2000);
  if(local && /^\/(photos\/[a-z0-9-]+\.webp|media\/[a-f0-9-]{36}|habari\/[a-z0-9-]+)$/.test(v)) return v;
  try { const u=new URL(v); if(u.protocol==='https:' && !u.username && !u.password) return u.href; } catch {}
  fail(400,'Weka kiungo halali cha HTTPS.');
};
const audit = (db,actor,action,subject) => db.query('INSERT INTO jamco_audit(actor,action,subject) VALUES($1,$2,$3)',[actor,action,subject]);
function permission(user,allowed) {
  if(!user) fail(401,'Ingia kwanza.');
  if(!allowed.includes(user.role)) fail(403,'Huna ruhusa ya kufanya kitendo hiki.');
}
export async function session(db,req) {
  const token=(req.headers.cookie||'').match(/(?:^|;\s*)jamco_session=([a-f\d]{64})(?:;|$)/)?.[1];
  if(!token) return null;
  const {rows}=await db.query('SELECT s.email, s.role FROM jamco_sessions t JOIN jamco_staff s USING(email) WHERE t.digest=$1 AND s.active AND t.mfa_ok AND t.expires_at>now()',[sha(token)]);
  return rows[0]?{...rows[0],digest:sha(token)}:null;
}
const cookie=(res,token,age)=>sessionCookie(res,'jamco_session',token,age);
async function passwordHash(password) {
  const salt=randomBytes(24).toString('hex');
  return salt+':'+(await scrypt(password,salt,64)).toString('hex');
}
async function correctPassword(password,encoded) {
  if(!encoded) { await scrypt(password,'jamco-check-invalid-account',64); return false; }
  const [salt,hash]=encoded.split(':');
  return timingSafeEqual(Buffer.from(hash,'hex'),await scrypt(password,salt,64));
}
async function allow(db,req,action,limit,window=3600) {
  const address=(req.headers['x-vercel-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
  const bucket=Math.floor(Date.now()/1000/window);
  const {rows}=await db.query('INSERT INTO jamco_rates AS r(key,bucket) VALUES($1,$2) ON CONFLICT(key,bucket) DO UPDATE SET hits=r.hits+1 RETURNING hits',[sha(action+':'+address),bucket]);
  if(rows[0].hits>limit) fail(429,'Majaribio mengi. Jaribu tena baadaye.');
}
function creative(input) {
  if(!input) return null;
  const match=typeof input==='string' && input.match(/^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=]+)$/i);
  if(!match) fail(400,'Tumia JPG, PNG au WebP.');
  const bin=Buffer.from(match[2],'base64'), type=match[1].toLowerCase();
  const isPNG=bin.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const isJPEG=bin.subarray(0,3).equals(Buffer.from('ffd8ff','hex'));
  const isWebp=bin.subarray(0,4).toString()==='RIFF' && bin.subarray(8,12).toString()==='WEBP';
  if(bin.length>1048576 || bin.length<20 || !(type==='jpeg'?isJPEG:type==='png'?isPNG:isWebp)) fail(400,'Picha si halali au inazidi 1 MB.');
  return { bin, mime:'image/'+type };
}
async function upload(db,input,owner) {
  const file=creative(input);if(!file) return null;
  const id=randomUUID();
  await db.query('INSERT INTO jamco_uploads(id,mime,data,owner) VALUES($1,$2,$3,$4)',[id,file.mime,file.bin,owner]);
  return id;
}
export async function media(db,req,id) {
  if(!uuid(id))return null;
  const row=(await db.query('SELECT mime,public,owner,octet_length(data) AS size FROM jamco_uploads WHERE id=$1',[id])).rows[0];
  if(!row)return null;
  if(!row.public){
    const user=await session(db,req);
    const staffCanRead=user&&(user.email===row.owner||['owner','editor','advertising'].includes(user.role)||
      (await db.query('SELECT 1 FROM jamco_staff WHERE email=$1 AND permissions @> $2::jsonb',[user.email,'["moderate"]'])).rows.length>0);
    if(!staffCanRead){
      const token=(req.headers.cookie||'').match(/(?:^|;\s*)jamco_community=([a-f\d]{64})(?:;|$)/)?.[1];
      const own=token&&(await db.query('SELECT 1 FROM jamco_community_sessions s JOIN jamco_community_users u ON u.id=s.user_id WHERE s.digest=$1 AND s.expires_at>now() AND u.active AND u.id::text=$2',[sha(token),row.owner])).rows.length;
      if(!own)return null;
    }
  }
  return {...row,async read(start,length){
    const part=(await db.query('SELECT substring(data FROM $2 FOR $3) AS data FROM jamco_uploads WHERE id=$1',[id,start+1,length])).rows[0];
    return Buffer.from(part?.data||[]);
  }};
}
const labels = {received:'Ombi limepokelewa.',reviewing:'Ombi linapitiwa.',approved:'Ombi limeidhinishwa.',declined:'Ombi halikuidhinishwa.',closed:'Ombi limefungwa.'};
function pushEndpoint(input) {
  if(typeof input!=='string' || input.length>1200) return false;
  try {
    const url=new URL(input);
    return url.protocol==='https:' && !url.port && !url.username && !url.password &&
      (['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname) || url.hostname.endsWith('.notify.windows.com') || url.hostname.endsWith('.push.apple.com'));
  } catch { return false; }
}
export async function publicAction(db,req,res,action,data) {
  if(action==='push-config') return { key:process.env.VAPID_PUBLIC_KEY||'' };
  if(action==='read') {
    await allow(db,req,action,160);
    if(!validSlug(data.slug)) fail(400,'Habari haijapatikana.');
    await db.query("INSERT INTO jamco_reads(slug,day) SELECT slug,(now() at time zone 'Africa/Dar_es_Salaam')::date FROM jamco_content WHERE slug=$1 AND kind='story' AND state='published' AND live_at<=now() ON CONFLICT (slug,day) DO UPDATE SET reads=jamco_reads.reads+1",[data.slug]);
    return {};
  }
  if(action==='push' || action==='push-off') {
    await allow(db,req,action,24);
    const sub=data.subscription;
    if(!pushEndpoint(sub?.endpoint)) fail(400,'Anwani ya arifa si halali.');
    if(action==='push-off') {
      await db.query("DELETE FROM jamco_push WHERE endpoint=$1 AND subscription->'keys'=$2::jsonb",[sub.endpoint,JSON.stringify(sub.keys||{})]);
      return {message:'Arifa zimezimwa.'};
    }
    const groups=Array.isArray(data.categories)?[...new Set(data.categories.filter(x=>topics.includes(x)))]:[];
    if(!process.env.VAPID_PUBLIC_KEY || !groups.length || !/^[\w-]{87}$/.test(sub.keys?.p256dh||'') || !/^[\w-]{22}$/.test(sub.keys?.auth||'')) fail(400,'Chagua aina ya arifa au tumia kivinjari kinachoruhusu arifa.');
    await db.query("INSERT INTO jamco_push(endpoint,subscription,categories) VALUES($1,$2,$3) ON CONFLICT(endpoint) DO UPDATE SET subscription=excluded.subscription,categories=excluded.categories WHERE jamco_push.subscription->'keys'=excluded.subscription->'keys'",[sub.endpoint,sub,groups]);
    return {message:'Arifa zimewashwa.'};
  }
  if(!['tip','campaign','subscribe','track'].includes(action)) fail(404,'Huduma haijapatikana.');
  await allow(db,req,action,action==='track'?24:12);
  const address=email(data.email);
  if(action==='track') {
    const reference=required(data.reference,40).toUpperCase();
    const {rows}=await db.query("SELECT status FROM jamco_requests WHERE kind='campaign' AND reference=$1 AND email=$2",[reference,address]);
    if(!rows[0]) fail(404,'Hakuna kampeni iliyopatikana kwa taarifa hizo.');
    return {message:labels[rows[0].status]};
  }
  if(data.consent!==true) fail(400,'Thibitisha ridhaa yako.');
  const reference='JC-'+randomBytes(8).toString('hex').toUpperCase();
  if(action==='subscribe') {
    await db.query("INSERT INTO jamco_requests(reference,kind,email,data) VALUES($1,'subscription',$2,'{}') ON CONFLICT DO NOTHING",[reference,address]);
    return {message:'Usajili wa taarifa umepokelewa.'};
  }
  const name=required(data.name,100), message=required(data.message,3000,10);
  await db.transaction(async tx=>{
    const fields={name,message};
    if(action==='campaign') {
      const {rows}=await tx.query("SELECT data FROM jamco_content WHERE slug=$1 AND kind='package' AND state='published' AND live_at<=now()",[text(data.product,96)]);
      if(!rows[0]) fail(400,'Chagua huduma iliyopo.');
      fields.product=rows[0].data.title;
      fields.creative=await upload(tx,data.creative,null);
    } else {
      fields.location=text(data.location,100);
      if(data.topic==='support')fields.topic='support';
      if(directoryServices.includes(data.service)){
        fields.service=data.service;
        if(data.phone&&!/^\+?[0-9() .-]{7,24}$/.test(data.phone))fail(400,'Namba ya simu si halali.');
        fields.phone=text(data.phone,24);
        fields.publicContact=data.publicContact===true;
        fields.delivery=data.delivery===true;
      }
    }
    await tx.query('INSERT INTO jamco_requests(reference,kind,email,data) VALUES($1,$2,$3,$4)',[reference,action,address,fields]);
  });
  return {message:(action==='campaign'?'Ombi limepokelewa. Kumbukumbu: ':'Taarifa imepokelewa. Kumbukumbu: ')+reference};
}

function contentAccess(user,kind) {
  if(editorial.includes(kind)) permission(user,['owner','editor','reporter']);
  else if(commercial.includes(kind)) permission(user,['owner','advertising']);
  else fail(400,'Chagua aina halali ya maudhui.');
}
function fields(data,kind) {
  const common={title:required(data.title,180),date:data.date,summary:text(data.summary,650),category:text(data.category,80),location:text(data.location,140)};
  if(!isoDay(common.date)) fail(400,'Weka tarehe halali.');
  if(kind==='package') {
    if(data.price && (!/^\d{1,10}$/.test(data.price)||Number(data.price)<1)) fail(400,'Weka bei halali ya TZS.');
    return {...common,price:data.price?Number(data.price):null};
  }
  if(kind==='category') return common;
  const origin=['original','external','instagram','sponsored'].includes(data.origin)?data.origin:'external';
  const source = kind==='story' && origin==='original' && (!data.source||data.source==='/habari/'+data.slug) ? '/habari/'+data.slug : web(data.source);
  const base={...common,origin,source,publisher:required(data.publisher,150)};
  if(kind==='story') return {...base,summary:required(common.summary,650),body:required(data.body,15000),photo:validSlug(data.photo)?data.photo:'',tags:text(data.tags,300),featured:data.featured===true,breaking:data.breaking===true,caption:text(data.caption,2200),people:text(data.people,300),rights:text(data.rights,200)};
  if(kind==='photo') return {...base,image:data.image?web(data.image,true):'',large:data.large?web(data.large,true):'',license:required(data.license,100),album:text(data.album,100)};
  if(kind==='video') return {...base,summary:required(common.summary,650),embed:data.embed===true&&Boolean(supportedEmbed(source)),photo:validSlug(data.photo)?data.photo:'',caption:text(data.caption,2200),people:text(data.people,300),rights:text(data.rights,200)};
  if(kind==='event') {
    if(!isoDay(data.eventDate)) fail(400,'Weka tarehe ya tukio.');
    return {...base,eventDate:data.eventDate};
  }
  return base;
}

async function saveContent(db,user,data) {
  const {slug,kind,state}=data;
  if(!validSlug(slug) || !states.includes(state)) fail(400,'Weka kitambulisho na hali halali.');
  contentAccess(user,kind);
  if(user.role==='reporter' && !['draft','review'].includes(state)) fail(403,'Mhariri ndiye anayeweza kuchapisha.');
  const liveAt=data.liveAt || new Date().toISOString();
  if(typeof liveAt!=='string' || isNaN(Date.parse(liveAt))) fail(400,'Weka muda halali wa kuchapisha.');
  await db.transaction(async tx=>{
    const previous=(await tx.query('SELECT * FROM jamco_content WHERE slug=$1 FOR UPDATE',[slug])).rows[0];
    if(previous && (previous.kind!==kind || (user.role==='reporter' && (previous.state==='published' || previous.data.reporter!==user.email)))) fail(403,'Huwezi kubadili rekodi hii.');
    if(previous && previous.data.reporter!==user.email && user.role==='reporter') fail(403,'Rekodi ni ya ripota mwingine.');
    const d=fields(data,kind);
    if(kind==='photo') {
      const uploaded=await upload(tx,data.creative,user.email);
      if(uploaded) d.image=d.large='/media/'+uploaded;
      if(!d.image) fail(400,'Weka kiungo cha picha au pakia picha.');
      if(state==='published') {
        for(const url of new Set([d.image,d.large].filter(x=>x.startsWith('/media/')))) {
          const match=await tx.query('UPDATE jamco_uploads SET public=true WHERE id=$1 AND owner IS NOT NULL RETURNING id',[url.slice(7)]);
          if(!match.rows.length) fail(400,'Picha iliyopakiwa haipatikani.');
        }
      }
    }
    if(kind==='story' && d.featured && state==='published' && Date.parse(liveAt)<=Date.now()) {
      await tx.query("UPDATE jamco_content SET data=data-'featured' WHERE kind='story' AND slug<>$1 AND state='published' AND live_at<=now() AND data->>'featured'='true'",[slug]);
    }
    d.reporter=previous?.data.reporter||user.email;
    if(previous) {
      await tx.query('UPDATE jamco_content SET state=$2,live_at=$3,data=$4,updated_at=now() WHERE slug=$1',[slug,state,liveAt,d]);
    } else {
      const result=await tx.query('INSERT INTO jamco_content(slug,kind,state,live_at,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING slug',[slug,kind,state,liveAt,d]);
      if(!result.rows.length) fail(409,'Kitambulisho hiki tayari kinatumika.');
    }
    await audit(tx,user.email,'content.'+state,slug);
  });
  return {message:'Maudhui yamehifadhiwa.'};
}

async function pushSend(db,user,data) {
  permission(user,['owner','editor']);
  if(!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) fail(503,'Huduma ya arifa haijaunganishwa.');
  if(!topics.includes(data.topic)) fail(400,'Chagua mada halali.');
  const slug=text(data.slug,96);
  const {rows:stories}=await db.query("SELECT data FROM jamco_content WHERE slug=$1 AND kind='story' AND state='published' AND live_at<=now()",[slug]);
  if(!stories[0]) fail(404,'Chagua habari iliyochapishwa.');
  const {rows}=await db.query('SELECT subscription FROM jamco_push WHERE $1=ANY(categories) LIMIT 1001',[data.topic]);
  if(rows.length>1000) fail(503,'Orodha imezidi arifa 1,000. Tumia huduma ya kutuma kwa makundi.');
  const options={vapidDetails:{subject:process.env.VAPID_SUBJECT||'https://jamco-bukoba.vercel.app/',publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY},TTL:3600,timeout:3000};
  const payload=JSON.stringify({title:stories[0].data.title,body:stories[0].data.summary.slice(0,180),url:'/habari/'+slug});
  let sent=0;
  for(let i=0;i<rows.length;i+=25) {
    await Promise.all(rows.slice(i,i+25).map(async ({subscription})=>{
      if(!pushEndpoint(subscription.endpoint)) return;
      try { await sendNotification(subscription,payload,options); sent++; }
      catch (error) { if([404,410].includes(error.statusCode)) await db.query('DELETE FROM jamco_push WHERE endpoint=$1',[subscription.endpoint]); }
    }));
  }
  await audit(db,user.email,'push.sent',slug+':'+sent);
  return {message:'Arifa zimewasilishwa kwa huduma ya arifa: '+sent+' kati ya '+rows.length+'.'};
}

const instagramPost = value => {
  const url=new URL(web(value));
  if(!['instagram.com','www.instagram.com'].includes(url.hostname) || !/^\/(?:jamcobukoba2013\/)?(p|reel)\/[\w-]+\/?$/.test(url.pathname)) fail(400,'Weka kiungo cha chapisho au Reel ya Instagram.');
  return 'https://www.instagram.com'+url.pathname.replace(/^\/jamcobukoba2013(?=\/)/,'').replace(/\/$/,'')+'/';
};
async function instagramImport(db,user,data) {
  permission(user,['owner','editor']);
  if(data.source) {
    const source=instagramPost(data.source);
    if(!isoDay(data.date)) fail(400,'Weka tarehe ya chapisho iliyothibitishwa.');
    const slug='ig-'+sha(source).slice(0,18);
    const d={slug,kind:data.kind==='video'?'video':'story',state:'review',origin:'instagram',source,publisher:'@jamcobukoba2013',
      date:data.date,category:text(data.category,80)||'Jamii',title:required(data.title,180),summary:required(data.summary,650),body:required(data.summary,650),
      caption:text(data.caption,2200),location:text(data.location,140),rights:'Kiungo cha chanzo; hakimiliki ya media inasubiri uthibitisho.'};
    const found=await db.query("SELECT slug FROM jamco_content WHERE slug=$1 OR (kind IN ('story','video') AND replace(data->>'source','/jamcobukoba2013/','/')=$2)",[slug,source]);
    if(found.rows.length) fail(409,'Chapisho tayari lipo kwenye mfumo.');
    return saveContent(db,user,d);
  }
  if(!process.env.INSTAGRAM_ACCESS_TOKEN || !/^\d+$/.test(process.env.INSTAGRAM_USER_ID||'') || !/^v\d+\.\d+$/.test(process.env.INSTAGRAM_API_VERSION||'')) fail(503,'Akaunti ya Meta bado haijaidhinisha uingizaji.');
  const link=new URL('https://graph.instagram.com/'+process.env.INSTAGRAM_API_VERSION+'/'+process.env.INSTAGRAM_USER_ID+'/media');
  link.searchParams.set('fields','id,caption,media_type,media_product_type,permalink,timestamp,username');
  link.searchParams.set('limit','50');
  const response=await fetch(link,{headers:{Authorization:'Bearer '+process.env.INSTAGRAM_ACCESS_TOKEN},signal:AbortSignal.timeout(9000)});
  if(!response.ok) fail(502,'Meta haikurejesha machapisho. Hakikisha tokeni na ruhusa ni halali.');
  const received=await response.json();
  let added=0;
  await db.transaction(async tx=>{
    for(const m of received.data||[]) {
      if(m.username?.toLowerCase()!=='jamcobukoba2013' || !isoDay(m.timestamp?.slice(0,10))) continue;
      let source;
      try { source=instagramPost(m.permalink); } catch { continue; }
      const slug='ig-'+sha(source).slice(0,18), kind=m.media_type==='VIDEO'?'video':'story';
      const draft={title:'Chapisho la JAMCO · '+m.timestamp.slice(0,10),source,origin:'instagram',publisher:'@jamcobukoba2013',date:m.timestamp.slice(0,10),
        category:'Jamii',caption:text(m.caption,2200),summary:'',body:'',rights:'Kiungo cha chanzo; hakimiliki ya media inasubiri uthibitisho.'};
      const result=await tx.query("INSERT INTO jamco_content(slug,kind,state,data) VALUES($1,$2,'review',$3) ON CONFLICT DO NOTHING RETURNING slug",[slug,kind,draft]);
      added+=result.rows.length;
    }
    await audit(tx,user.email,'instagram.import',String(added));
  });
  return {message:added+' machapisho mapya yanangoja ukaguzi.'};
}

export async function adminAction(db,req,res,action,data) {
  if(action==='setup' || action==='login') {
    await allow(db,req,action,8,900);
    const identifier=text(data.email,254).toLowerCase();
    let address=action==='login'&&!identifier.includes('@')?null:email(identifier);
    const password=required(data.password,220,action==='setup'?14:1);
    if(action==='setup') {
      const key=process.env.JAMCO_SETUP_KEY;
      if(!key || key.length<24 || !timingSafeEqual(Buffer.from(sha(text(data.key,300))),Buffer.from(sha(key)))) fail(403,'Usanidi haujafunguliwa au ufunguo si sahihi.');
      const hash=await passwordHash(password);
      await db.transaction(async tx=>{
        await tx.query('SELECT pg_advisory_xact_lock(5963107)');
        const found=await tx.query("SELECT 1 FROM jamco_staff WHERE role='owner' LIMIT 1");
        if(found.rows.length) fail(409,'Mmiliki tayari amewekwa.');
        await tx.query("INSERT INTO jamco_staff(email,password,role) VALUES($1,$2,'owner')",[address,hash]);
        await audit(tx,address,'staff.setup',address);
      });
    } else {
      const {rows}=address
        ?await db.query('SELECT email,password,role,permissions FROM jamco_staff WHERE email=$1 AND active',[address])
        :await db.query('SELECT email,password,role,permissions FROM jamco_staff WHERE username=$1 AND active',[identifier]);
      if(!await correctPassword(password,rows[0]?.password)) fail(401,'Barua pepe au nenosiri si sahihi.');
      const account=rows[0];address=account.email;
      const agent=account.role==='viewer'&&account.permissions?.includes('field-agent');
      if((data.mode==='owner'&&account.role!=='owner')||(data.mode==='studio'&&agent)||(data.mode==='agent'&&!agent))fail(403,'Tumia kiungo kinacholingana na akaunti yako.');
    }
    const staff=(await db.query('SELECT totp_secret,totp_last,permissions,role FROM jamco_staff WHERE email=$1',[address])).rows[0];
    const studioPassword=data.mode==='studio'&&staff?.role&&!(staff.role==='viewer'&&staff.permissions?.includes('field-agent'))&&!staff.permissions?.includes('studio-mfa');
    let mfa=Boolean(studioPassword);
    if(staff?.totp_secret&&!studioPassword){if(data.code===undefined||data.code===''){const error=new ApiError(401,'Weka msimbo kutoka kwenye programu yako ya uthibitisho.');error.code='staff_code_required';throw error;}const {verifyTotp}=await import('./social.js');const counter=verifyTotp(staff.totp_secret,data.code,staff.totp_last);if(counter===null)fail(401,'Weka msimbo sahihi wa uthibitisho.');const updated=await db.query('UPDATE jamco_staff SET totp_last=$2 WHERE email=$1 AND totp_last<$2 RETURNING email',[address,counter]);if(!updated.rows.length)fail(401,'Msimbo umetumika. Subiri msimbo mpya.');mfa=true;}
    const token=randomBytes(32).toString('hex');
    await db.query(`INSERT INTO jamco_sessions(digest,email,expires_at,mfa_ok) VALUES($1,$2,now()+${mfa?sessionInterval:"interval '12 hours'"},$3)`,[sha(token),address,mfa]);
    cookie(res,token,mfa?sessionSeconds:43200);
    return {message:'Umeingia.',mfaRequired:!mfa};
  }
  const user=await session(db,req);
  if(action==='logout') {
    if(!user)fail(401,'Ingia kwanza.');
    await db.query('DELETE FROM jamco_sessions WHERE digest=$1',[user.digest]);cookie(res,'',0);return {message:'Umetoka.'};
  }
  permission(user,['owner','editor','reporter','advertising']);
  if(action==='content') return saveContent(db,user,data);
  if(action==='remove') {
    const slug=text(data.slug,96);
    await db.transaction(async tx=>{
      const p=(await tx.query('SELECT kind FROM jamco_content WHERE slug=$1 FOR UPDATE',[slug])).rows[0];
      if(!p) fail(404,'Rekodi haipo.');
      contentAccess(user,p.kind); permission(user,['owner','editor','advertising']);
      await tx.query("UPDATE jamco_content SET state='archived',updated_at=now() WHERE slug=$1",[slug]);
      await audit(tx,user.email,'content.deleted',slug);
    });
    return {message:'Rekodi imefutwa.'};
  }
  if(action==='status') {
    const status=text(data.status,24);
    if(!Object.hasOwn(labels,status)) fail(400,'Chagua hali halali.');
    await db.transaction(async tx=>{
      const reference=text(data.reference,40);
      const found=(await tx.query('SELECT kind FROM jamco_requests WHERE reference=$1 FOR UPDATE',[reference])).rows[0];
      if(!found) fail(404,'Ombi halipo.');
      permission(user,found.kind==='campaign'?['owner','advertising']:['owner','editor']);
      await tx.query('UPDATE jamco_requests SET status=$2 WHERE reference=$1',[reference,status]);
      await audit(tx,user.email,'request.'+status,reference);
    });
    return {message:'Hali imesasishwa.'};
  }
  if(action==='staff') {
    permission(user,['owner']);
    const address=email(data.email), role=text(data.role,22);
    if(!roles.includes(role)||role==='owner'||address===user.email) fail(400,'Chagua jukumu la mfanyakazi.');
    await db.transaction(async tx=>{
      const hash=data.password?await passwordHash(required(data.password,220,14)):null;
      const staff=(await tx.query('SELECT role FROM jamco_staff WHERE email=$1 FOR UPDATE',[address])).rows[0];
      if(staff?.role==='owner') fail(403,'Akaunti ya mmiliki haiwezi kubadilishwa hapa.');
      if(staff) await tx.query('UPDATE jamco_staff SET password=coalesce($2,password),role=$3,active=$4 WHERE email=$1',[address,hash,role,data.active===true]);
      else {
        if(!hash) fail(400,'Weka nenosiri la herufi angalau 14.');
        await tx.query('INSERT INTO jamco_staff(email,password,role,active) VALUES($1,$2,$3,$4)',[address,hash,role,data.active===true]);
      }
      await tx.query('DELETE FROM jamco_sessions WHERE email=$1',[address]);
      await audit(tx,user.email,'staff.changed',address);
    });
    return {message:'Akaunti imehifadhiwa.'};
  }
  if(action==='push') return pushSend(db,user,data);
  if(action==='instagram') return instagramImport(db,user,data);
  if(action==='list') {
    const {rows}=await db.query('SELECT * FROM jamco_content ORDER BY updated_at DESC,slug LIMIT 700');
    const editorialRows=rows.map(record).filter(x=>user.role!=='reporter'||x.state==='published'||x.reporter===user.email);
    const requestKinds=user.role==='owner'?['tip','campaign','subscription']:user.role==='editor'?['tip','subscription']:user.role==='advertising'?['campaign']:[];
    const requests=requestKinds.length?(await db.query("SELECT * FROM jamco_requests WHERE kind=ANY($1) AND reference LIKE 'JC-%' ORDER BY created_at DESC LIMIT 300",[requestKinds])).rows:[];
    const staff=user.role==='owner'?(await db.query('SELECT email,role,active FROM jamco_staff ORDER BY email')).rows:[];
    const events=user.role==='owner'?(await db.query('SELECT actor,action,subject,happened_at FROM jamco_audit ORDER BY id DESC LIMIT 40')).rows:[];
    const reads=(await db.query("SELECT slug,sum(reads)::int AS reads FROM jamco_reads WHERE day>=current_date-30 GROUP BY slug ORDER BY reads DESC LIMIT 30")).rows;
    return {role:user.role,content:editorialRows,requests,staff,audit:events,reads,topics,labels};
  }
  fail(404,'Huduma haijapatikana.');
}

export { published };

export { passwordHash, correctPassword, allow, creative, upload, sha, audit, fields, saveContent };
