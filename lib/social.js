import {renewSession,sessionCookie,sessionInterval,sessionToken} from './session-policy.js';
import {agentGrant,assertAgent,inviteAgent,acceptAgent,agentRoster,updateAgent,agentProfile,saveAgentProfile,submitAgentListing} from './field-agents.js';
import {callCategories,directoryServices} from '../public/service-categories.js';
import {synthesizeNotice} from './editorial-voice.js';
import {uploadPart,mediaKind} from './editorial-media.js';
import {today,bukobaDate} from './bukoba-today.js';
import {findFeedTopic} from '../public/feed-topics.js';
import {importInstagram,instagramStatus} from './instagram-import.js';
import {optimizeMedia} from './media.js';
import {randomBytes,randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {ApiError,passwordHash,correctPassword,sha,allow,audit,session,adminAction,creative} from './actions.js';

// Existing published stories keep their original editorial categories and URLs.
const legacyTopicSlugs = {
  serikali: [
    'bukoba-yakagua-miradi', 'uchunguzi-mv-new-mwanza', 'mikopo-asilimia-kumi',
    'jkt-bukoba-hiari', 'anuani-za-makazi-bukoba', 'kagera-bima-ya-afya',
    'ukaguzi-nshambya-ihungo', 'mv-mwanza-yazinduliwa',
  ],
  maendeleo: [
    'bukoba-yakagua-miradi', 'ukaguzi-nshambya-ihungo', 'soko-jipya-bukoba',
    'miradi-ya-mji-wa-bukoba', 'mv-mwanza-yazinduliwa',
  ],
  matangazo: ['mikopo-asilimia-kumi', 'jkt-bukoba-hiari', 'anuani-za-makazi-bukoba'],
};

const pendingCommentReason='Maoni mapya yanahitaji ukaguzi';
const fail=(status,message)=>{throw new ApiError(status,message)};
const text=(x,n=200)=>typeof x==='string'?x.trim().slice(0,n):'';
const id=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
const email=x=>{x=text(x,220).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))fail(400,'Weka barua pepe halali.');return x};
export const contentTypes=['Habari','Taarifa Muhimu','Tangazo','Tahadhari','Matukio','Taarifa za Serikali','Business Promotions','Ratiba ya msiba','Wasifu wa huduma'];
export const permissions=['publish','moderate','members','premium','analytics'];
const fields='id,email,display_name,location,bio,avatar,verified,active,premium_until,preferences';
export async function member(db,req){const t=(req.headers.cookie||'').match(/(?:^|;\s*)jamco_community=([a-f\d]{64})(?:;|$)/)?.[1];if(!t)return null;return (await db.query(`SELECT ${fields.split(',').map(x=>'u.'+x).join(',')},s.digest,s.expires_at FROM jamco_community_sessions s JOIN jamco_community_users u ON u.id=s.user_id WHERE s.digest=$1 AND s.expires_at>now() AND u.active`,[sha(t)])).rows[0]||null}
const cookie=(res,token,age)=>sessionCookie(res,'jamco_community',token,age);
const publicUser=u=>u?Object.fromEntries(Object.entries(u).filter(([k])=>k!=='digest'&&k!=='expires_at')):null;
async function signed(db,res,u){const t=randomBytes(32).toString('hex');await db.query(`INSERT INTO jamco_community_sessions(digest,user_id,expires_at) VALUES($1,$2,now()+${sessionInterval})`,[sha(t),u.id]);cookie(res,t)}
function requireMember(u,verified=true){if(!u)fail(401,'Ingia kwenye akaunti kwanza.');if(verified&&!u.verified)fail(403,'Thibitisha barua pepe yako kwanza.');return u}
async function staff(db,req,permission){const s=await session(db,req);if(!s)fail(401,'Ingia kama msimamizi na uthibitishe MFA.');const r=(await db.query('SELECT permissions FROM jamco_staff WHERE email=$1',[s.email])).rows[0];const grants=s.role==='owner'?permissions:s.role==='editor'?['publish','moderate','analytics']:r?.permissions||[];if(permission&&!grants.includes(permission))fail(403,'Huna ruhusa ya kufanya kitendo hiki.');return {...s,grants}}
async function pendingStaff(db,req){const t=(req.headers.cookie||'').match(/(?:^|;\s*)jamco_session=([a-f\d]{64})(?:;|$)/)?.[1];if(!t)fail(401,'Ingia kwanza.');const s=(await db.query('SELECT u.*,s.mfa_ok,s.digest,s.expires_at FROM jamco_sessions s JOIN jamco_staff u ON u.email=s.email WHERE s.digest=$1 AND s.expires_at>now() AND u.active',[sha(t)])).rows[0];if(!s)fail(401,'Ingia kwanza.');return s}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(b){let bits='',s='';for(const x of b)bits+=x.toString(2).padStart(8,'0');for(let i=0;i<bits.length;i+=5)s+=alphabet[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];return s}
function from32(s){let b='';for(const x of s)b+=alphabet.indexOf(x).toString(2).padStart(5,'0');return Buffer.from(b.match(/.{8}/g).map(x=>parseInt(x,2)))}
export function totp(secret,counter=Math.floor(Date.now()/30000)){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=createHmac('sha1',from32(secret)).update(b).digest(),p=h[19]&15;return ((h.readUInt32BE(p)&0x7fffffff)%1000000).toString().padStart(6,'0')}
export function verifyTotp(secret,code,last=-1){if(!/^\d{6}$/.test(code||''))return null;const n=Math.floor(Date.now()/30000);for(const c of [n-1,n,n+1])if(c>Number(last)&&timingSafeEqual(Buffer.from(totp(secret,c)),Buffer.from(code)))return c;return null}
async function notify(db,user,type,title,url){if(!user)return;await db.query("INSERT INTO jamco_notifications(id,user_id,type,title,url) SELECT $1,id,$3,$4,$5 FROM jamco_community_users WHERE id=$2 AND coalesce((preferences->>$3)::boolean,true)",[randomUUID(),user,type,title,url])}
async function sendMail(to,subject,body){if(!process.env.RESEND_API_KEY||!process.env.JAMCO_EMAIL_FROM)return false;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.JAMCO_EMAIL_FROM,to:[to],subject,text:body}),signal:AbortSignal.timeout(8000)});return r.ok}
async function tokenMail(db,u,purpose,isStaff=false){const token=randomBytes(32).toString('hex');await db.query('INSERT INTO jamco_verification(digest,user_id,staff_email,purpose,expires_at) VALUES($1,$2,$3,$4,now()+interval \'1 hour\')',[sha(token),isStaff?null:u.id,isStaff?u.email:null,purpose]);return sendMail(u.email,'JAMCO — '+(purpose==='verify'?'Thibitisha akaunti':'Rejesha akaunti'),'Fungua kiungo hiki: https://jamco-bukoba.vercel.app/akaunti?token='+token+'&purpose='+purpose)}
async function live(db,slug){if(!/^[a-z0-9][a-z0-9-]{1,95}$/.test(slug||''))fail(400,'Chapisho si halali.');const r=(await db.query("SELECT * FROM jamco_content WHERE slug=$1 AND state='published' AND live_at<=now() AND (NOT(data ? 'expiresAt') OR (data->>'expiresAt')::timestamptz>now())",[slug])).rows[0];if(!r)fail(404,'Chapisho halipatikani.');return r}
async function owned(db,media,owner){if(!Array.isArray(media)||media.length>12)fail(400,'Faili zisizidi 12.');for(const item of media){if(!id(item.id))fail(400,'Faili si halali.');const r=(await db.query('SELECT mime FROM jamco_uploads WHERE id=$1 AND owner=$2',[item.id,owner])).rows[0];if(!r)fail(403,'Faili hii si yako.');item.type=mediaKind(r.mime);item.url='/media/'+item.id;item.alt=text(item.alt,180)}return Promise.all(media.map(async x=>{const result={id:x.id,url:x.url,type:x.type,alt:x.alt};if(x.posterId){if(!id(x.posterId))fail(400,'Picha ya video si halali.');const poster=(await db.query("SELECT id FROM jamco_uploads WHERE id=$1 AND owner=$2 AND mime LIKE 'image/%'",[x.posterId,owner])).rows[0];if(!poster)fail(403,'Picha ya video si yako.');result.posterId=x.posterId;result.poster='/media/'+x.posterId;}return result}))}
export async function social(db,req,res,action,d){
 const u=await member(db,req);
 if(action==='me'){if(u)await renewSession(db,req,res,u,'jamco_community');return {user:publicUser(u),liked:u?(await db.query('SELECT slug FROM jamco_social_likes WHERE user_id=$1',[u.id])).rows.map(x=>x.slug):[],saved:u?(await db.query('SELECT permalink FROM jamco_community_saves WHERE user_id=$1',[u.id])).rows.map(x=>x.permalink.split('/').pop()):[],emailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.JAMCO_EMAIL_FROM)};}
 if(['register','login'].includes(action)){
  await allow(db,req,'social-'+action,action==='register'?5:12,900);const address=email(d.email),password=text(d.password,220);if(password.length<(action==='register'?14:1))fail(400,'Nenosiri liwe na herufi angalau 14.');
  if(action==='register'){if(!text(d.name,80)||d.consent!==true)fail(400,'Weka jina na ukubali sera ya faragha.');const m={id:randomUUID(),email:address};const r=await db.query('INSERT INTO jamco_community_users(id,email,display_name,password_hash,location) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',[m.id,address,text(d.name,80),await passwordHash(password),text(d.location,140)]);if(!r.rows.length)fail(409,'Barua pepe tayari imesajiliwa.');await signed(db,res,m);const sent=await tokenMail(db,m,'verify').catch(()=>false);return {message:sent?'Akaunti imefunguliwa. Angalia barua ya uthibitisho.':'Akaunti imefunguliwa. Uthibitisho wa barua pepe unasubiri huduma ya barua kuunganishwa.',verificationSent:sent}}
  const m=(await db.query('SELECT id,password_hash FROM jamco_community_users WHERE email=$1 AND active',[address])).rows[0];if(!await correctPassword(password,m?.password_hash))fail(401,'Barua pepe au nenosiri si sahihi.');await signed(db,res,m);return {message:'Umeingia.'};
 }
 if(action==='recover'){await allow(db,req,'recover',4,3600);const address=email(d.email);const m=(await db.query(d.staff?'SELECT email FROM jamco_staff WHERE email=$1 AND active':'SELECT id,email FROM jamco_community_users WHERE email=$1 AND active',[address])).rows[0];if(m)await tokenMail(db,m,d.staff?'staff-reset':'reset',d.staff===true).catch(()=>false);return {message:'Ikiwa akaunti ipo na huduma ya barua imeunganishwa, kiungo kitatumwa.'}}
 if(action==='token'){
  await allow(db,req,'token',12,900);if(!/^[a-f\d]{64}$/.test(d.token||''))fail(400,'Kiungo si halali.');await db.transaction(async tx=>{const t=(await tx.query('SELECT * FROM jamco_verification WHERE digest=$1 AND expires_at>now() FOR UPDATE',[sha(d.token)])).rows[0];if(!t)fail(400,'Kiungo kimeisha au kimetumika.');if(t.purpose==='verify')await tx.query('UPDATE jamco_community_users SET verified=true WHERE id=$1',[t.user_id]);else{if(text(d.password,220).length<14)fail(400,'Nenosiri liwe na herufi angalau 14.');const h=await passwordHash(d.password);if(t.staff_email){await tx.query('UPDATE jamco_staff SET password=$2 WHERE email=$1',[t.staff_email,h]);await tx.query('DELETE FROM jamco_sessions WHERE email=$1',[t.staff_email])}else{await tx.query('UPDATE jamco_community_users SET password_hash=$2 WHERE id=$1',[t.user_id,h]);await tx.query('DELETE FROM jamco_community_sessions WHERE user_id=$1',[t.user_id])}}await tx.query('DELETE FROM jamco_verification WHERE digest=$1',[t.digest])});return {message:'Akaunti imesasishwa.'};
 }
 if(action==='feed'){
  const selectedTopic=d.topic?findFeedTopic(d.topic):null;if(d.topic&&!selectedTopic)fail(400,'Mada si halali.');const mediaFilter=['image','video','audio','text'].includes(d.media)?d.media:'';
  const limit=Math.max(1,Math.min(12,Number(d.limit)||12)),offset=Math.max(0,Math.min(10000,Number(d.offset)||0)),category=text(d.category,80),q=text(d.q,100);const rows=(await db.query("SELECT c.*,(SELECT jsonb_build_object('name',a.display_name,'avatar',a.avatar) FROM jamco_community_users a WHERE a.id::text=c.data->>'contributorId' AND a.active) contributor_profile,coalesce((SELECT count(*) FROM jamco_social_likes l WHERE l.slug=c.slug),0)::int likes,(coalesce((SELECT count(*) FROM jamco_comments m WHERE m.slug=c.slug AND NOT hidden),0)+coalesce((SELECT count(*) FROM jamco_instagram_comments i WHERE i.slug=c.slug AND NOT i.hidden),0))::int comments,EXISTS(SELECT 1 FROM jamco_social_likes l WHERE l.slug=c.slug AND l.user_id=$1) liked FROM jamco_content c WHERE state='published' AND live_at<=now() AND kind=ANY($2) AND (NOT(data ? 'expiresAt') OR (data->>'expiresAt')::timestamptz>now()) AND ($3='' OR data->>'category'=$3 OR data->>'contentType'=$3) AND ($4='' OR concat(data->>'title',' ',data->>'body',' ',data->>'location') ILIKE '%'||$4||'%') AND ($5='' OR slug=$5) AND ($8='' OR ($8='image' AND (kind='photo' OR coalesce(data->>'photo','')<>'' OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(data->'media','[]')) m WHERE m->>'type'='image'))) OR ($8='video' AND (kind='video' OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(data->'media','[]')) m WHERE m->>'type'='video'))) OR ($8='audio' AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(data->'media','[]')) m WHERE m->>'type'='audio')) OR ($8='text' AND kind IN ('story','event') AND jsonb_array_length(coalesce(data->'media','[]'))=0 AND coalesce(data->>'photo','')='')) AND ($9::text[] IS NULL OR data->>'category'=ANY($9) OR data->>'contentType'=ANY($9) OR c.slug=ANY($11::text[]) OR ($10='matukio' AND kind='event')) ORDER BY coalesce((data->>'pinned')::boolean,false) DESC,live_at DESC,slug LIMIT $6 OFFSET $7",[u?.id||null,d.slug?['story','photo','video','event','listing']:d.kind&&['story','photo','video','event'].includes(d.kind)?[d.kind]:['story','photo','video','event'],category,q,text(d.slug,96),limit+1,offset,mediaFilter,selectedTopic?.aliases.length?selectedTopic.aliases:null,selectedTopic?.key||'',legacyTopicSlugs[selectedTopic?.key]??[]])).rows;
  const photoSlugs=[...new Set(rows.map(row=>row.data.photo).filter(Boolean))];
  const media=photoSlugs.length?(await db.query("SELECT slug,data FROM jamco_content WHERE slug=ANY($1) AND kind='photo' AND state='published' AND live_at<=now()",[photoSlugs])).rows:[];const photos=new Map(media.map(x=>[x.slug,x.data]));return {posts:rows.slice(0,limit).map(r=>{const p=photos.get(r.data.photo);const {reporter,...publicData}=r.data;return {...publicData,slug:r.slug,kind:r.kind,liveAt:r.live_at,contributor:r.contributor_profile?.name||publicData.contributor,contributorAvatar:r.contributor_profile?.avatar||'',likes:r.likes,views:r.views,comments:r.comments,liked:r.liked,media:(r.data.media?.length?r.data.media:r.kind==='photo'?[{url:r.data.image,large:r.data.large,type:'image',alt:r.data.title,credit:r.data.publisher,source:r.data.source,license:r.data.license,date:r.data.date}]:p?[{url:p.image,large:p.large,type:'image',alt:p.title,credit:p.publisher,source:p.source,license:p.license,date:p.date,illustration:true}]:[]).map(optimizeMedia)}}),more:rows.length>limit};
 }
 if(action==='today')return today(db);
 if(action==='stories')return {items:(await db.query("SELECT s.id,s.post_slug,s.media,s.expires_at,c.data->>'title' title FROM jamco_stories s JOIN jamco_content c ON c.slug=s.post_slug WHERE s.expires_at>now() AND c.state='published' AND c.live_at<=now() AND (NOT(c.data ? 'expiresAt') OR (c.data->>'expiresAt')::timestamptz>now()) ORDER BY s.created_at DESC LIMIT 30")).rows};
 if(action==='comments'){
  await live(db,d.slug);const rows=(await db.query("SELECT c.id,c.parent_id,c.body,c.created_at,c.edited_at,c.user_id,u.display_name,u.avatar,(SELECT count(*)::int FROM jamco_comment_likes l WHERE l.comment_id=c.id) likes,EXISTS(SELECT 1 FROM jamco_comment_likes l WHERE l.comment_id=c.id AND l.user_id=$2) liked FROM jamco_comments c JOIN jamco_community_users u ON u.id=c.user_id WHERE c.slug=$1 AND NOT c.hidden ORDER BY c.created_at,c.id LIMIT 200",[d.slug,u?.id||null])).rows;
  const imported=(await db.query("SELECT 'instagram:'||id id,NULL::uuid parent_id,body,posted_at created_at,NULL::timestamptz edited_at,NULL::uuid user_id,author display_name,'' avatar,0 likes,false liked,'instagram' origin,source_url FROM jamco_instagram_comments WHERE slug=$1 AND NOT hidden ORDER BY posted_at LIMIT 100",[d.slug])).rows;
  const {count}= (await db.query("SELECT ((SELECT count(*) FROM jamco_comments WHERE slug=$1 AND NOT hidden)+(SELECT count(*) FROM jamco_instagram_comments WHERE slug=$1 AND NOT hidden))::int AS count",[d.slug])).rows[0];
  return {count,comments:[...rows,...imported].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))}}
 if(action==='discover'){
  const driverCategory=callCategories.includes(d.category)?d.category:'';
  return {items:(await db.query("SELECT slug,kind,data FROM jamco_content WHERE state='published' AND live_at<=now() AND kind IN ('listing','event','photo','story','video') AND (NOT(data ? 'expiresAt') OR (data->>'expiresAt')::timestamptz>now()) AND ($1='' OR strpos(lower(concat_ws(' ',data->>'title',data->>'body',data->>'summary',data->>'location',data->>'category')),lower($1))>0) AND ($2='' OR (kind='listing' AND data->>'category'=$2) OR (data->>'contentType'='Wasifu wa huduma' AND data->>'category'=$2)) ORDER BY live_at DESC,slug LIMIT 150",[text(d.q,100),driverCategory])).rows.map(x=>{const {reporter,body,...data}=x.data;if(body)data.summary=(data.summary||body).slice(0,800);const picture=data.media?.find(m=>m.type==='image');return {slug:x.slug,kind:x.kind,data,preview:picture?optimizeMedia(picture):data.image?optimizeMedia({type:'image',url:data.image}):null}})};
 }
 if(action==='agent-accept'){await allow(db,req,'agent-accept',12,900);return acceptAgent(db,d);}
 if(action.startsWith('agent-')){
  const actor=await staff(db,req);
  assertAgent(actor);
  if(action==='agent-profile')return agentProfile(db,actor);
  if(action==='agent-profile-save')return saveAgentProfile(db,actor,d);
  if(action==='agent-submit'){await allow(db,req,'agent-submit',12,3600);return submitAgentListing(db,actor,d);}
  if(action==='agent-upload-part'){
   if(d.mime!=='image')fail(415,'Wakala anaweza kupakia picha pekee.');
   if(d.part===0)await allow(db,req,'agent-photo',25,3600);
   return uploadPart(db,actor.email,d);
  }
  fail(404,'Huduma haipatikani.');
 }
 if(action==='staff-login')return adminAction(db,req,res,'login',d);
 if(action==='staff-logout'){
  const account=await pendingStaff(db,req);
  await db.query('DELETE FROM jamco_sessions WHERE digest=$1',[account.digest]);
  res.setHeader('Set-Cookie',`jamco_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.VERCEL?'; Secure':''}`);
  return {message:'Umetoka.'};
 }
 if(action==='staff-setup')return adminAction(db,req,res,'setup',d);
 if(action==='staff-me'){const s=await pendingStaff(db,req);if(s.mfa_ok)await renewSession(db,req,res,s,'jamco_session');return {email:s.email,displayName:s.display_name||'',username:s.username||'',role:s.role,agent:s.role==='viewer'&&s.permissions?.includes(agentGrant)===true,mfa:s.mfa_ok,enrolled:Boolean(s.totp_secret)}}
 if(action==='staff-account'){
  const s=await pendingStaff(db,req);
  if(!s.mfa_ok||s.role!=='owner')fail(403,'Mmiliki aliyethibitisha MFA pekee.');
  await allow(db,req,'staff-account',8,900);
  const address=email(d.email),name=text(d.displayName,80),next=text(d.newPassword,220);
  const username=text(d.username,32).toLowerCase()||null;
  if(username&&!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username))fail(400,'Jina la kuingia liwe na herufi au tarakimu 3–32. Alama zinazoruhusiwa ni . _ na -');
  if(next&&next.length<14)fail(400,'Nenosiri jipya liwe na angalau herufi 14.');
  try{
   await db.transaction(async tx=>{
    const row=(await tx.query('SELECT password FROM jamco_staff WHERE email=$1 AND active FOR UPDATE',[s.email])).rows[0];
    if(!await correctPassword(text(d.currentPassword,220),row?.password))fail(401,'Nenosiri la sasa si sahihi.');
    await tx.query('UPDATE jamco_staff SET email=$2,display_name=$3,password=$4,username=$5 WHERE email=$1',[s.email,address,name,next?await passwordHash(next):row.password,username]);
    if(address!==s.email){
     await tx.query('UPDATE jamco_uploads SET owner=$2 WHERE owner=$1',[s.email,address]);
     if((await tx.query("SELECT to_regclass('jamco_media_ingest') AS table_name")).rows[0].table_name)await tx.query('UPDATE jamco_media_ingest SET owner=$2 WHERE owner=$1',[s.email,address]);
    }
    if(next||address!==s.email){
     await tx.query('DELETE FROM jamco_sessions WHERE email=$1 AND digest<>$2',[address,s.digest]);
     await tx.query("DELETE FROM jamco_verification WHERE staff_email=$1 AND purpose='staff-reset'",[address]);
    }
    await audit(tx,address,'staff.account.updated',s.email);
   });
  }catch(error){if(error.code==='23505')fail(409,'Barua pepe au jina la kuingia tayari linatumika.');throw error;}
  return {message:'Akaunti imesasishwa.'};
 }
 if(action==='mfa-start'){const s=await pendingStaff(db,req);if(s.totp_secret)fail(409,'MFA tayari imewekwa.');const secret=base32(randomBytes(20));await db.query('UPDATE jamco_staff SET pending_totp=$2 WHERE email=$1',[s.email,secret]);return {secret,uri:`otpauth://totp/JAMCO:${encodeURIComponent(s.email)}?secret=${secret}&issuer=JAMCO&digits=6&period=30`}}
 if(action==='mfa-confirm'){const s=await pendingStaff(db,req);await allow(db,req,'mfa',10,900);if(!s.pending_totp||s.totp_secret)fail(400,'Anza usanidi wa MFA.');const c=verifyTotp(s.pending_totp,d.code);if(c===null)fail(401,'Msimbo si sahihi.');await db.transaction(async tx=>{await tx.query('UPDATE jamco_staff SET totp_secret=pending_totp,pending_totp=null,totp_last=$2 WHERE email=$1',[s.email,c]);await tx.query(`UPDATE jamco_sessions SET mfa_ok=true,expires_at=now()+${sessionInterval} WHERE digest=$1`,[s.digest]);await audit(tx,s.email,'mfa.enrolled',s.email)});sessionCookie(res,'jamco_session',sessionToken(req,'jamco_session'));return {message:'MFA imewashwa.'}}
 if(action.startsWith('admin-'))return adminSocial(db,req,res,action.slice(6),d);
 if(action==='synthesize'){const s=await staff(db,req,'publish');await allow(db,req,'editorial-voice',15,3600);return synthesizeNotice(db,s.email,d)}
 if(action==='upload-part'){const s=await staff(db,req,'publish');if(d.part===0)await allow(db,req,'editorial-media-start',50,3600);return uploadPart(db,s.email,d)}
 if(action==='upload'){const s=d.avatar===true?null:await session(db,req);if(!s)requireMember(u,false);else await staff(db,req,'publish');await allow(db,req,'social-upload',30);const owner=s?.email||u.id;let f;if(typeof d.file==='string'&&d.file.startsWith('data:video/')){if(!s)fail(403,'JAMCO pekee ndiyo hupakia video.');const m=d.file.match(/^data:video\/(mp4|webm);base64,([a-z0-9+/=]+)$/i);if(!m)fail(400,'Tumia MP4 au WebM.');const bin=Buffer.from(m[2],'base64');if(bin.length>3*1024*1024||bin.length<30||(m[1]==='mp4'?bin.subarray(4,8).toString()!=='ftyp':bin.subarray(0,4).toString('hex')!=='1a45dfa3'))fail(400,'Video si halali au inazidi 3 MB.');f={bin,mime:'video/'+m[1]}}else f=creative(d.file);if(!f)fail(400,'Chagua faili.');const file=randomUUID();await db.query('INSERT INTO jamco_uploads(id,mime,data,owner) VALUES($1,$2,$3,$4)',[file,f.mime,f.bin,owner]);return {id:file,url:'/media/'+file,type:f.mime.startsWith('video')?'video':'image'}}
 if(action==='logout'){requireMember(u,false);await db.query('DELETE FROM jamco_community_sessions WHERE digest=$1',[u.digest]);cookie(res,'',0);return {message:'Umetoka.'}}
 requireMember(u,false);
 if(action==='verify-send'){await allow(db,req,'verify',3,3600);if(!await tokenMail(db,u,'verify'))fail(503,'Huduma ya barua pepe haijaunganishwa.');return {message:'Barua imetumwa.'}}
 if(action==='profile'){let avatar=u.avatar;if(d.avatar){const [image]=await owned(db,[{id:d.avatar}],u.id);if(image.type!=='image')fail(400,'Chagua picha ya wasifu.');avatar='/media/'+d.avatar;await db.query('UPDATE jamco_uploads SET public=true WHERE id=$1',[d.avatar])}const prefs=Object.fromEntries(['posts','replies','submissions','membership'].map(k=>[k,d.preferences?.[k]!==false]));await db.query('UPDATE jamco_community_users SET display_name=$2,location=$3,bio=$4,avatar=$5,preferences=$6 WHERE id=$1',[u.id,text(d.name,80)||u.display_name,text(d.location,140),text(d.bio,500),avatar,prefs]);return {message:'Wasifu umehifadhiwa.'}}
 if(action==='saved')return {slugs:(await db.query('SELECT permalink FROM jamco_community_saves WHERE user_id=$1 ORDER BY created_at DESC LIMIT 300',[u.id])).rows.map(x=>x.permalink.split('/').pop())};
 if(action==='save'){await live(db,d.slug);const url='/habari/'+d.slug;if(d.active===false)await db.query('DELETE FROM jamco_community_saves WHERE user_id=$1 AND (permalink=$2 OR permalink=$3)',[u.id,url,'https://jamco-bukoba.vercel.app'+url]);else await db.query('INSERT INTO jamco_community_saves(user_id,permalink) VALUES($1,$2) ON CONFLICT DO NOTHING',[u.id,url]);return {message:'Chaguo limehifadhiwa.'}}
 if(action==='notifications')return {items:(await db.query('SELECT id,type,title,url,read_at,created_at FROM jamco_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 80',[u.id])).rows};
 if(action==='notifications-read'){await db.query('UPDATE jamco_notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL',[u.id]);return {message:'Arifa zimesomwa.'}}
 if(action==='my-submissions')return {items:(await db.query('SELECT id,category,headline,status,editorial_note,post_url,created_at FROM jamco_community_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[u.id])).rows};
 if(action==='my-membership')return {items:(await db.query('SELECT * FROM jamco_memberships WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[u.id])).rows};
 if(!['comment','comment-edit','comment-delete','comment-like','report'].includes(action))requireMember(u);
 if(action==='like'){await live(db,d.slug);if(d.active===false)await db.query('DELETE FROM jamco_social_likes WHERE slug=$1 AND user_id=$2',[d.slug,u.id]);else await db.query('INSERT INTO jamco_social_likes(slug,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[d.slug,u.id]);return {likes:Number((await db.query('SELECT count(*) n FROM jamco_social_likes WHERE slug=$1',[d.slug])).rows[0].n),liked:d.active!==false}}
 if(action==='comment'){
  await live(db,d.slug);
  await allow(db,req,'comment',30);
  const body=text(d.body,2000);if(!body)fail(400,'Andika maoni.');
  const comment=randomUUID();
  await db.transaction(async tx=>{
   const parent=d.parent&&id(d.parent)?(await tx.query('SELECT * FROM jamco_comments WHERE id=$1 AND slug=$2 AND NOT hidden',[d.parent,d.slug])).rows[0]:null;
   if(d.parent&&!parent)fail(400,'Maoni ya awali hayapo.');
   await tx.query('INSERT INTO jamco_comments(id,slug,user_id,parent_id,body) VALUES($1,$2,$3,$4,$5)',[comment,d.slug,u.id,parent?.id||null,body]);
   if(parent&&parent.user_id!==u.id){
    await notify(tx,parent.user_id,'replies',u.display_name+' amejibu maoni yako','/habari/'+d.slug);
   }
  });
  return {id:comment,pending:false,message:'Maoni yamechapishwa.'};
 }
 if(['comment-edit','comment-delete','comment-like'].includes(action)){if(!id(d.id))fail(400,'Maoni si halali.');const c=(await db.query('SELECT * FROM jamco_comments WHERE id=$1 AND NOT hidden',[d.id])).rows[0];if(!c)fail(404,'Maoni hayapo.');await live(db,c.slug);if(action==='comment-like'){if(d.active===false)await db.query('DELETE FROM jamco_comment_likes WHERE comment_id=$1 AND user_id=$2',[d.id,u.id]);else await db.query('INSERT INTO jamco_comment_likes(comment_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[d.id,u.id])}else{if(c.user_id!==u.id)fail(403,'Maoni si yako.');if(action==='comment-delete')await db.query('UPDATE jamco_comments SET hidden=true WHERE id=$1',[d.id]);else{if(!text(d.body,2000))fail(400,'Andika maoni.');await db.query('UPDATE jamco_comments SET body=$2,edited_at=now() WHERE id=$1',[d.id,text(d.body,2000)])}}return {message:'Maoni yamesasishwa.'}}
 if(action==='report'){await allow(db,req,'social-report',10);if(text(d.reason,1500)===pendingCommentReason)fail(400,'Andika sababu ya ripoti.');if(text(d.reason,1500).length<5)fail(400,'Eleza sababu.');await live(db,d.slug);if(d.comment&&(!id(d.comment)||!(await db.query('SELECT 1 FROM jamco_comments WHERE id=$1 AND slug=$2',[d.comment,d.slug])).rows.length))fail(400,'Maoni si halali.');await db.query('INSERT INTO jamco_social_reports(id,user_id,slug,comment_id,reason) VALUES($1,$2,$3,$4,$5)',[randomUUID(),u.id,d.slug,d.comment||null,text(d.reason,1500)]);return {message:'Taarifa imepelekwa kwa msimamizi.'}}
 if(action==='submit')fail(403,'Machapisho yanaandaliwa na JAMCO. Unaweza kushiriki kwenye maoni.');
 if(action==='premium'){await allow(db,req,'premium',4);await db.query('INSERT INTO jamco_memberships(id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[randomUUID(),u.id]);return {message:'Ombi limepokelewa. Hakuna bei iliyowekwa.'}}
 if(action==='view'){await live(db,d.slug);await db.query('INSERT INTO jamco_views(slug,viewer) VALUES($1,$2) ON CONFLICT DO NOTHING',[d.slug,sha(u.id)]);return {views:(await db.query('SELECT count(*)::int AS total FROM jamco_views WHERE slug=$1',[d.slug])).rows[0].total}}
 fail(404,'Huduma haipatikani.');
}
async function adminSocial(db,req,res,action,d){
 const needs={comments:'moderate',dashboard:'analytics',publish:'publish',posts:'publish',intake:'publish','intake-status':'publish',members:'members','member-update':'members',queue:'moderate',moderate:'moderate',reports:'moderate','comment-hide':'moderate','comment-approve':'moderate',memberships:'premium','membership-update':'premium'};
 const s=await staff(db,req,action.startsWith('instagram')?'publish':needs[action]);
 if(['agents','agent-invite','agent-update'].includes(action)){
  if(s.role!=='owner')fail(403,'Mmiliki pekee ndiye anasimamia akaunti za wakala.');
  if(action==='agents')return agentRoster(db);
  if(action==='agent-update')return updateAgent(db,s,d);
  await allow(db,req,'agent-invite',20,3600);
  return inviteAgent(db,s,d.email);
 }
 if(action==='instagram-status')return instagramStatus();
 if(action==='instagram-import'){if(!s.grants.includes('moderate'))fail(403,'Ruhusa ya kupitia maoni inahitajika.');return importInstagram(db,s.email,d);}
 if(action==='instagram-hide'){if(!s.grants.includes('moderate'))fail(403,'Ruhusa ya kupitia maoni inahitajika.');await db.query('UPDATE jamco_instagram_comments SET hidden=$2 WHERE id=$1',[text(d.id,80),d.hidden!==false]);await audit(db,s.email,'instagram.comment.moderated',text(d.id,80));return {message:'Maoni ya Instagram yamesasishwa.'};}
 if(action==='comments'){
  const {rows}=await db.query(`SELECT m.id,m.slug,m.body,m.created_at,m.hidden,u.display_name,c.data->>'title' AS title
    FROM jamco_comments m JOIN jamco_community_users u ON u.id=m.user_id JOIN jamco_content c ON c.slug=m.slug
    ORDER BY m.created_at DESC LIMIT 100`);
  return {items:rows};
 }
 if(action==='dashboard'){const stats=(await db.query("SELECT (SELECT count(*)::int FROM jamco_community_users) members,(SELECT count(DISTINCT user_id)::int FROM jamco_community_sessions WHERE expires_at>now()) signed_in_members,(SELECT count(*)::int FROM jamco_community_users WHERE created_at>now()-interval '7 days') new_members,(SELECT count(*)::int FROM jamco_content WHERE state='published' AND live_at<=now()) published,(SELECT count(*)::int FROM jamco_social_likes) likes,(SELECT count(*)::int FROM jamco_comments WHERE NOT hidden) comments,(SELECT count(*)::int FROM jamco_community_submissions WHERE status IN ('submitted','review','information')) submissions,(SELECT count(*)::int FROM jamco_social_reports WHERE NOT resolved) reports,(SELECT count(*)::int FROM jamco_memberships WHERE status='pending') premium,(SELECT count(*)::int FROM jamco_views v JOIN jamco_content c ON v.slug=c.slug WHERE c.kind='video') video_views")).rows[0];const locations=(await db.query("SELECT lower(trim(location)) AS location,count(*)::int AS members FROM jamco_community_users WHERE active AND trim(location)<>'' GROUP BY lower(trim(location)) ORDER BY members DESC,location LIMIT 12")).rows;return {stats,locations,grants:s.grants,role:s.role,audit:s.role==='owner'?(await db.query('SELECT actor,action,subject,happened_at FROM jamco_audit ORDER BY id DESC LIMIT 60')).rows:[]}}
 if(action==='intake'){
  const section=['intake','tips','support'].includes(d.section)?d.section:'';
  const {rows}=await db.query(`SELECT reference,email,status,data,created_at FROM jamco_requests
    WHERE kind='tip' AND reference LIKE 'JC-%' AND ($1='' OR
      ($1='intake' AND coalesce(data->>'service','')<>'') OR
      ($1='support' AND data->>'topic'='support') OR
      ($1='tips' AND coalesce(data->>'service','')='' AND coalesce(data->>'topic','')<>'support'))
    ORDER BY created_at DESC LIMIT 150`,[section]);
  return {items:rows};
 }
 if(action==='intake-status'){
  if(!/^JC-[A-F0-9]{16}$/.test(d.reference||'')||!['reviewing','approved','declined','closed'].includes(d.status))fail(400,'Chagua hali halali.');
  await db.transaction(async tx=>{
   const changed=await tx.query("UPDATE jamco_requests SET status=$2 WHERE reference=$1 AND kind='tip' RETURNING reference",[d.reference,d.status]);
   if(!changed.rows.length)fail(404,'Ombi halipo.');
   await audit(tx,s.email,'request.'+d.status,d.reference);
  });
  return {message:'Hali ya ombi imehifadhiwa.'};
 }
 if(action==='posts')return {items:(await db.query('SELECT * FROM jamco_content ORDER BY updated_at DESC LIMIT 600')).rows};
 if(action==='publish'){
  if(!/^[a-z0-9][a-z0-9-]{1,95}$/.test(d.slug||'')||!['draft','review','published','archived'].includes(d.state)||!contentTypes.includes(d.contentType))fail(400,'Chagua kitambulisho, aina na hali halali.');
  if(text(d.title,180).length<4||(!text(d.body,30000)&&!d.media?.length))fail(400,'Andika ujumbe au ongeza picha, video au sauti.');
  if(d.state==='published'&&d.confirmed!==true)fail(400,'Thibitisha ukweli, ridhaa na haki za media.');
  if(d.contentType==='Tahadhari'&&(!text(d.source,2000)||d.verified!==true))fail(400,'Tahadhari inahitaji chanzo na uthibitisho wa mhariri.');
  let source=text(d.source,2000);if(source){let url;try{url=new URL(source)}catch{}if(url?.protocol!=='https:')fail(400,'Chanzo kiwe HTTPS.');}
  const liveAt=d.liveAt||new Date().toISOString();if(isNaN(Date.parse(liveAt)))fail(400,'Muda si halali.');
  if(d.eventDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.eventDate)||!Number.isFinite(Date.parse(d.eventDate))||new Date(d.eventDate).toISOString().slice(0,10)!==d.eventDate))fail(400,'Tarehe ya tukio si halali.');
  if(d.eventTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.eventTime))fail(400,'Saa ya tukio si halali.');
  if(d.highlightDay&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.highlightDay)||!Number.isFinite(Date.parse(d.highlightDay))||new Date(d.highlightDay).toISOString().slice(0,10)!==d.highlightDay))fail(400,'Tarehe ya tangazo muhimu si halali.');
  if(d.contentType==='Wasifu wa huduma'&&!directoryServices.includes(d.category))fail(400,'Chagua sehemu ya huduma inayotambulika.');
  if(d.intakeReference&&!/^JC-[A-F0-9]{16}$/.test(d.intakeReference))fail(400,'Namba ya ombi si halali.');
  const links={};for(const key of ['booking','directions']){if(!d[key])continue;try{const url=new URL(d[key]);if(url.protocol!=='https:')throw Error();links[key]=url.href}catch{fail(400,'Viungo vya huduma viwe HTTPS.')}}
  if(d.phone&&!/^\+?[0-9() .-]{7,24}$/.test(d.phone))fail(400,'Namba ya simu si halali.');
  if(d.expiresAt&&isNaN(Date.parse(d.expiresAt)))fail(400,'Muda wa mwisho si halali.');
  await db.transaction(async tx=>{const prev=(await tx.query('SELECT * FROM jamco_content WHERE slug=$1 FOR UPDATE',[d.slug])).rows[0];
 const intake=d.intakeReference?(await tx.query("SELECT email,data FROM jamco_requests WHERE reference=$1 AND kind='tip' AND data ? 'service' FOR UPDATE",[d.intakeReference])).rows[0]:null;
 if(d.intakeReference&&(!intake||d.contentType!=='Wasifu wa huduma'||(intake.data.publicSlug&&intake.data.publicSlug!==d.slug)))fail(409,'Ombi hili haliwezi kuunganishwa na wasifu huu.');
 let media=d.media||[];if(!Array.isArray(media)||media.length>12||media.some(item=>!item||typeof item!=='object'))fail(400,'Chagua hadi faili 12 halali.');const retained=prev?.data.media||[];for(let i=0;i<media.length;i++){const m=media[i];if(!id(m.id)){
  const original=(!m.id&&m.url)?retained.find(item=>!item.id&&item.url===m.url):null;
  if(!original)fail(400,'Faili si halali.');
  media[i]=original;continue;
 }if(!retained.some(p=>p.id===m.id))media[i]=(await owned(tx,[m],intake?.data.agent&&intake.data.photoId===m.id?intake.email:s.email))[0];else{const file=(await tx.query('SELECT mime FROM jamco_uploads WHERE id=$1',[m.id])).rows[0];if(!file)fail(400,'Faili haipo.');media[i]={id:m.id,url:'/media/'+m.id,type:mediaKind(file.mime),alt:text(m.alt,180),...(retained.find(p=>p.id===m.id)?.posterId?{posterId:retained.find(p=>p.id===m.id).posterId,poster:'/media/'+retained.find(p=>p.id===m.id).posterId}:{})}}}if(d.state==='published'&&d.contentType==='Wasifu wa huduma'&&callCategories.includes(d.category)&&
 (!media.some(item=>item.type==='image')||String((d.phone===undefined?prev?.data.phone:d.phone)||'').replace(/\D/g,'').length<9))
 fail(400,'Wasifu wa dereva unahitaji picha na namba ya simu ya umma.');
 const data={...(prev?.data||{}),title:text(d.title,180),body:text(d.body,30000),summary:text(d.body,650),date:text(d.date,10)||bukobaDate(),publisher:'JAMCO Bukoba',category:text(d.category,80)||'Jamii',contentType:d.contentType,location:text(d.location,140),eventDate:d.eventDate===undefined?prev?.data.eventDate||'':text(d.eventDate,10),
eventTime:d.eventTime===undefined?prev?.data.eventTime||'':d.eventDate?text(d.eventTime,5):'',
phone:d.phone===undefined?prev?.data.phone||'':text(d.phone,24),
booking:d.booking===undefined?prev?.data.booking||'':links.booking||'',
directions:d.directions===undefined?prev?.data.directions||'':links.directions||'',
delivery:d.delivery===undefined?prev?.data.delivery===true:d.delivery===true,
highlightDay:d.highlightDay===undefined?prev?.data.highlightDay||'':text(d.highlightDay,10),
speech:d.speech===undefined?prev?.data.speech===true:d.speech===true,media,source:source||'/habari/'+d.slug,origin:d.contentType==='Business Promotions'?'sponsored':prev?.data.origin==='instagram'?'instagram':'original',pinned:d.pinned===true,verified:d.verified===true,rights:text(d.rights,500),reporter:prev?.data.reporter||s.email};if(d.expiresAt)data.expiresAt=d.expiresAt;else delete data.expiresAt;await tx.query("INSERT INTO jamco_content(slug,kind,state,live_at,data) VALUES($1,$5,$2,$3,$4) ON CONFLICT(slug) DO UPDATE SET kind=excluded.kind,state=excluded.state,live_at=excluded.live_at,data=excluded.data,updated_at=now()",[d.slug,d.state,liveAt,data,d.contentType==='Wasifu wa huduma'?'listing':prev?.kind==='listing'?'story':prev?.kind||'story']);if(d.state==='published'&&intake)await tx.query("UPDATE jamco_requests SET status='approved',data=data||jsonb_build_object('publicSlug',$2::text) WHERE reference=$1",[d.intakeReference,d.slug]);
if(d.state==='published')for(const m of media){if(!m.id)continue;await tx.query('UPDATE jamco_uploads SET public=true WHERE id=$1',[m.id]);if(m.posterId)await tx.query('UPDATE jamco_uploads SET public=true WHERE id=$1',[m.posterId]);}if(d.story===true&&d.state==='published'&&media.some(item=>item.type!=='audio')){await tx.query('INSERT INTO jamco_stories(id,post_slug,created_by,media,expires_at) VALUES($1,$2,$3,$4,$5)',[randomUUID(),d.slug,s.email,JSON.stringify(media.filter(item=>item.type!=='audio')),new Date(Math.max(Date.now(),Date.parse(liveAt))+86400000).toISOString()]);}await audit(tx,s.email,'social.content.'+d.state,d.slug);if(d.state==='published'&&Date.parse(liveAt)<=Date.now()&&prev?.state!=='published')await tx.query("INSERT INTO jamco_notifications(id,user_id,type,title,url) SELECT gen_random_uuid(),id,'posts',$1,$2 FROM jamco_community_users WHERE active AND coalesce((preferences->>'posts')::boolean,true)",[data.title,'/habari/'+d.slug])});return {message:'Chapisho limehifadhiwa.'};
 }
 if(action==='members'){if(s.role!=='owner'&&!s.grants.includes('members'))fail(403,'Huna ruhusa.');return {items:(await db.query(`SELECT ${fields},created_at,(SELECT max(expires_at) FROM jamco_community_sessions WHERE user_id=jamco_community_users.id AND expires_at>now()) AS session_expires FROM jamco_community_users WHERE display_name ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC LIMIT 150`,['%'+text(d.q,100)+'%'])).rows}}
 if(action==='member-update'){if(typeof d.active!=='boolean'||!id(d.id))fail(400,'Taarifa si halali.');await db.transaction(async tx=>{await tx.query('UPDATE jamco_community_users SET active=$2 WHERE id=$1',[d.id,d.active]);if(!d.active)await tx.query('DELETE FROM jamco_community_sessions WHERE user_id=$1',[d.id]);await audit(tx,s.email,'member.active.'+d.active,d.id)});return {message:'Akaunti imesasishwa.'}}
 if(action==='staff'){if(s.role!=='owner')fail(403,'Mmiliki pekee.');if(d.list)return {items:(await db.query('SELECT email,role,active,permissions,(totp_secret IS NOT NULL) mfa FROM jamco_staff ORDER BY email')).rows};const address=email(d.email);if(address===s.email)fail(400,'Huwezi kubadili mmiliki hapa.');const grants=Array.isArray(d.permissions)?d.permissions.filter(x=>permissions.includes(x)):[];const role=d.role==='editor'?'editor':d.role==='reporter'?'reporter':'viewer';await db.transaction(async tx=>{const old=(await tx.query('SELECT role FROM jamco_staff WHERE email=$1 FOR UPDATE',[address])).rows[0];if(old?.role==='owner')fail(403,'Huwezi kubadili mmiliki.');if(old)await tx.query('UPDATE jamco_staff SET role=$2,permissions=$3,active=$4 WHERE email=$1',[address,role,JSON.stringify(grants),d.active!==false]);else{if(text(d.password,220).length<14)fail(400,'Nenosiri liwe na herufi 14 au zaidi.');await tx.query('INSERT INTO jamco_staff(email,password,role,permissions) VALUES($1,$2,$3,$4)',[address,await passwordHash(d.password),role,JSON.stringify(grants)])}await tx.query('DELETE FROM jamco_sessions WHERE email=$1',[address]);await audit(tx,s.email,'staff.permissions',address)});return {message:'Ruhusa zimehifadhiwa.'}}
 if(action==='queue')return {items:(await db.query('SELECT s.*,u.display_name FROM jamco_community_submissions s JOIN jamco_community_users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 200')).rows};
 if(action==='moderate'){
  if(!id(d.id)||!['submitted','review','information','approved','published','rejected'].includes(d.status))fail(400,'Hali si halali.');if(d.status==='published'&&!s.grants.includes('publish'))fail(403,'Ruhusa ya kuchapisha inahitajika.');
  await db.transaction(async tx=>{const r=(await tx.query('SELECT * FROM jamco_community_submissions WHERE id=$1 FOR UPDATE',[d.id])).rows[0];if(!r)fail(404,'Taarifa haipo.');let url=r.post_url;if(d.status==='published'){if(d.confirmed!==true)fail(400,'Thibitisha ukweli, ridhaa na haki za media.');const slug='jamii-'+r.id;url='/habari/'+slug;const data={title:r.headline,body:r.description,summary:r.description.slice(0,650),location:r.location,category:r.category,contentType:r.category==='Tangazo la biashara'?'Business Promotions':r.category==='Tangazo'?'Tangazo':'Habari',media:r.media,publisher:'JAMCO Bukoba',contributor:r.display_name,contributorId:r.user_id,date:new Date().toISOString().slice(0,10),origin:r.category==='Tangazo la biashara'?'sponsored':'original',source:url,rights:'JAMCO editorial review'};await tx.query("INSERT INTO jamco_content(slug,kind,state,data) VALUES($1,'story','published',$2) ON CONFLICT(slug) DO UPDATE SET state='published',data=excluded.data,updated_at=now()",[slug,data]);for(const m of r.media){await tx.query('UPDATE jamco_uploads SET public=true WHERE id=$1',[m.id]);if(m.posterId)await tx.query('UPDATE jamco_uploads SET public=true WHERE id=$1',[m.posterId])}}await tx.query('UPDATE jamco_community_submissions SET status=$2,editorial_note=$3,post_url=$4,updated_at=now() WHERE id=$1',[r.id,d.status,text(d.note,1500),url||'']);await notify(tx,r.user_id,'submissions','Hali ya taarifa yako: '+d.status,'/akaunti');await audit(tx,s.email,'submission.'+d.status,r.id)});return {message:'Taarifa imesasishwa.'};
 }
 if(action==='reports')return {items:(await db.query('SELECT r.*,c.body FROM jamco_social_reports r LEFT JOIN jamco_comments c ON c.id=r.comment_id WHERE NOT resolved ORDER BY r.created_at DESC LIMIT 200')).rows};
 if(action==='comment-approve'){
  if(!id(d.id))fail(400,'Maoni si halali.');
  await db.transaction(async tx=>{
   const pending=(await tx.query('SELECT id FROM jamco_social_reports WHERE comment_id=$1 AND reason=$2 AND NOT resolved FOR UPDATE',[d.id,pendingCommentReason])).rows[0];
   if(!pending)fail(409,'Maoni haya hayana ukaguzi unaosubiri.');
   await tx.query('UPDATE jamco_comments SET hidden=false WHERE id=$1',[d.id]);
   await tx.query('UPDATE jamco_social_reports SET resolved=true WHERE id=$1',[pending.id]);
   await audit(tx,s.email,'comment.approved',d.id);
  });
  return {message:'Maoni yamechapishwa.'};
 }
 if(action==='comment-hide'){if(!id(d.id))fail(400,'Maoni si halali.');await db.transaction(async tx=>{await tx.query('UPDATE jamco_comments SET hidden=$2 WHERE id=$1',[d.id,d.hidden!==false]);await tx.query('UPDATE jamco_social_reports SET resolved=true WHERE comment_id=$1',[d.id]);await audit(tx,s.email,'comment.moderated',d.id)});return {message:'Maoni yamefanyiwa ukaguzi.'}}
 if(action==='memberships')return {items:(await db.query('SELECT m.*,u.display_name FROM jamco_memberships m JOIN jamco_community_users u ON u.id=m.user_id ORDER BY m.created_at DESC LIMIT 200')).rows};
 if(action==='membership-update'){if(!id(d.id)||!['approved','rejected','revoked'].includes(d.status))fail(400,'Hali si halali.');if(d.status==='approved'&&(!d.expiresAt||Date.parse(d.expiresAt)<=Date.now()||isNaN(Date.parse(d.expiresAt))))fail(400,'Weka tarehe ya mwisho iliyo mbele.');await db.transaction(async tx=>{const m=(await tx.query('SELECT * FROM jamco_memberships WHERE id=$1 FOR UPDATE',[d.id])).rows[0];if(!m)fail(404,'Ombi halipo.');await tx.query('UPDATE jamco_memberships SET status=$2,expires_at=$3,note=$4,updated_at=now() WHERE id=$1',[m.id,d.status,d.status==='approved'?d.expiresAt:null,text(d.note,1500)]);await tx.query('UPDATE jamco_community_users SET premium_until=$2 WHERE id=$1',[m.user_id,d.status==='approved'?d.expiresAt:null]);await notify(tx,m.user_id,'membership','Ombi la Premium: '+d.status,'/akaunti');await audit(tx,s.email,'membership.'+d.status,m.id)});return {message:'Uanachama umesasishwa.'}}
 if(action==='logout')return adminAction(db,req,res,'logout',{});
 fail(404,'Huduma haipatikani.');
}
