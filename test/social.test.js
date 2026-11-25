import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {bukobaDate} from '../lib/bukoba-today.js';
import {createServer} from 'node:http';import {once} from 'node:events';import {readFile} from 'node:fs/promises';
import handler from '../api/site.js';import {getDb,migrate} from '../lib/db.js';import {sha} from '../lib/actions.js';import {totp,verifyTotp} from '../lib/social.js';
process.env.JAMCO_LOCAL_DB='memory://';process.env.JAMCO_SETUP_KEY='only-for-isolated-test-suite-20261122';
let host,server,owner,alice,bob,aliceId,bobId,moderator,commentId,replyId,submissionId;
const slug='social-workflow-test',content={slug,title:'Taarifa ya mfumo wa majaribio',body:'Haya ni maelezo ya jaribio kwenye database ya muda pekee.',category:'Jamii',contentType:'Habari',state:'published',confirmed:true,media:[]};
async function post(a,d={},cookie,extra={}){const res=await fetch(host+'/api/'+a,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},body:JSON.stringify(d)});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0],headers:res.headers}}
const api=(a,d,c)=>post('social/'+a,d,c);
async function enroll(cookie){const r=await api('mfa-start',{},cookie);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal((await api('mfa-confirm',{code:totp(r.data.secret)},cookie)).status,200);return r.data.secret}
async function verify(cookie,n){const u=(await api('me',{},cookie)).data.user,token='a'.repeat(63)+n;await(await getDb()).query("INSERT INTO jamco_verification(digest,user_id,purpose,expires_at) VALUES($1,$2,'verify',now()+interval '1 hour')",[sha(token),u.id]);assert.equal((await api('token',{token})).status,200);assert.equal((await api('token',{token})).status,400);return u.id}
before(async()=>{await migrate();server=createServer((req,res)=>{if(req.headers['x-test-studio'])req.headers.host='jamco-bukoba-admin.vercel.app';return handler(req,res)}).listen(0,'127.0.0.1');await once(server,'listening');host='http://127.0.0.1:'+server.address().port});after(()=>server?.close());
test('guest routes, feed and protected APIs',async()=>{for(const p of ['/','/gundua','/shiriki','/hifadhi','/akaunti','/admin'])assert.equal((await fetch(host+p)).status,200,p);assert.ok((await api('feed')).data.posts.length);assert.equal((await api('like',{slug})).status,401);assert.equal((await api('admin-dashboard')).status,401)});
test('owner setup and mandatory MFA',async()=>{const d={email:'owner@example.test',password:'Only used by automated test suite'};assert.equal((await api('staff-setup',{...d,key:'wrong'})).status,403);const r=await api('staff-setup',{...d,key:process.env.JAMCO_SETUP_KEY});assert.equal(r.status,200,JSON.stringify(r.data));owner=r.cookie;assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);assert.equal((await api('admin-dashboard',{},owner)).status,401);assert.equal((await post('manage/list',{},owner)).status,401);await enroll(owner);assert.equal((await api('admin-dashboard',{},owner)).status,200)});
test('registration cannot grant role or verification; email tokens single use',async()=>{let r=await api('register',{email:'alice@example.test',password:'Alice secure test password only',name:'Alice',consent:true,role:'owner',verified:true});assert.equal(r.status,200);alice=r.cookie;assert.equal(r.data.verificationSent,false);assert.equal((await api('me',{},alice)).data.user.verified,false);const existing='bukoba-yakagua-miradi';
const comment=await api('comment',{slug:existing,body:'Maoni ya papo hapo 🙏'},alice);
assert.equal(comment.status,200);
assert.equal(comment.data.pending,false);
assert.equal((await api('comments',{slug:existing})).data.comments[0].body,'Maoni ya papo hapo 🙏');
assert.equal((await api('comment-edit',{id:comment.data.id,body:'Nimehariri maoni yangu'},alice)).status,200);
assert.equal((await api('admin-comments',{},alice)).status,401);
assert.ok((await api('admin-comments',{},owner)).data.items.some(item=>item.id===comment.data.id));
const avatarBytes=await readFile(new URL('../public/brand/icon-48.png',import.meta.url));
const avatar=await api('upload',{file:'data:image/png;base64,'+avatarBytes.toString('base64')},alice);
assert.equal(avatar.status,200);
assert.equal((await api('profile',{avatar:avatar.data.id},alice)).status,200);
assert.equal((await api('me',{},alice)).data.user.avatar,avatar.data.url);
aliceId=await verify(alice,'1');r=await api('register',{email:'bob@example.test',password:'Bob secure test password only',name:'Bob',consent:true});assert.equal(r.status,200);bob=r.cookie;bobId=await verify(bob,'2');assert.equal((await api('admin-dashboard',{},alice)).status,401)});
test('validated media upload, private draft, publication visible to second client',async()=>{assert.equal((await api('upload',{file:'data:image/png;base64,'+Buffer.from('not an image file at all').toString('base64')},owner)).status,400);const b=await readFile(new URL('../public/brand/icon-48.png',import.meta.url));const r=await api('upload',{file:'data:image/png;base64,'+b.toString('base64')},owner);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal((await fetch(host+r.data.url)).status,404);assert.equal((await api('admin-publish',{...content,media:[r.data],story:true},owner)).status,200);const d=(await api('feed',{slug},bob)).data.posts[0];assert.equal(d.title,content.title);assert.equal(d.media.length,1);assert.equal((await api('stories')).data.items.length,1);assert.ok(!('reporter'in d));assert.equal((await fetch(host+r.data.url)).status,200);assert.equal((await api('admin-publish',content,alice)).status,401)});
test('concurrent likes deduplicate and unlike persists',async()=>{const rs=await Promise.all(Array.from({length:8},()=>api('like',{slug,active:true},alice)));rs.forEach(r=>assert.equal(r.status,200));assert.equal((await api('feed',{slug},bob)).data.posts[0].likes,1);assert.equal((await api('like',{slug,active:false},alice)).data.likes,0)});
test('threaded comments, ownership checks, likes and reply notifications',async()=>{let r=await api('comment',{slug,body:'Alice first comment'},alice);assert.equal(r.status,200,JSON.stringify(r.data));commentId=r.data.id;r=await api('comment',{slug,body:'Bob reply',parent:commentId},bob);assert.equal(r.status,200);replyId=r.data.id;assert.equal((await api('comments',{slug})).data.comments[1].parent_id,commentId);assert.equal((await api('comment-edit',{id:commentId,body:'hijack'},bob)).status,403);assert.equal((await api('comment-delete',{id:commentId},bob)).status,403);assert.equal((await api('comment-edit',{id:commentId,body:'Alice updated'},alice)).status,200);assert.equal((await api('comment-like',{id:commentId,active:true},bob)).status,200);assert.equal((await api('comments',{slug})).data.comments[0].likes,1);assert.ok((await api('notifications',{},alice)).data.items.some(x=>x.type==='replies'))});
test('cross-session saves and private member data',async()=>{await api('save',{slug,active:true},alice);const r=await api('login',{email:'alice@example.test',password:'Alice secure test password only'});assert.equal(r.status,200);assert.ok((await api('me',{},r.cookie)).data.saved.includes(slug));assert.equal((await api('saved',{},bob)).data.slugs.length,0);await api('save',{slug,active:false},r.cookie);assert.equal((await api('me',{},alice)).data.saved.length,0)});
test('narrow moderator permissions and reported comment workflow',async()=>{let r=await api('admin-staff',{email:'moderator@example.test',password:'Moderator test password only',role:'moderator',permissions:['moderate']},owner);assert.equal(r.status,200);r=await api('staff-login',{email:'moderator@example.test',password:'Moderator test password only'});moderator=r.cookie;await enroll(moderator);assert.equal((await api('admin-queue',{},moderator)).status,200);assert.equal((await api('admin-members',{},moderator)).status,403);assert.equal((await api('admin-publish',content,moderator)).status,403);assert.equal((await post('manage/list',{},moderator)).status,403);assert.equal((await api('report',{slug,comment:replyId,reason:'Review test comment'},alice)).status,200);assert.ok((await api('admin-reports',{},moderator)).data.items.length);assert.equal((await api('admin-comment-hide',{id:replyId},alice)).status,401);assert.equal((await api('admin-comment-hide',{id:replyId},moderator)).status,200);assert.ok(!(await api('comments',{slug})).data.comments.some(x=>x.id===replyId))});
test('current members only comment and editors can finish moderating previously submitted items',async()=>{
 const payload={title:'Community tip',body:'This test captures a previous submission.',category:'Habari',consent:true,media:[]};
 assert.equal((await api('submit',payload,alice)).status,403);
 submissionId=randomUUID();
 await (await getDb()).query('INSERT INTO jamco_community_submissions(id,user_id,category,headline,description,location,media) VALUES($1,$2,$3,$4,$5,$6,$7)',
  [submissionId,aliceId,payload.category,payload.title,payload.body,'Bukoba','[]']);
 assert.equal((await api('feed',{slug:'jamii-'+submissionId})).data.posts.length,0);
 assert.equal((await api('my-submissions',{},bob)).data.items.length,0);
 assert.equal((await api('admin-moderate',{id:submissionId,status:'review'},moderator)).status,200);
 assert.equal((await api('admin-moderate',{id:submissionId,status:'published',confirmed:true},moderator)).status,403);
 assert.equal((await api('admin-moderate',{id:submissionId,status:'published',confirmed:true},owner)).status,200);
 assert.equal((await api('feed',{slug:'jamii-'+submissionId})).data.posts.length,1);
});
test('premium approvals, expiry and revocation never grant administration',async()=>{await api('premium',{},alice);await api('premium',{},alice);let d=(await api('admin-memberships',{},owner)).data;assert.equal(d.items.length,1);const id=d.items[0].id;assert.equal((await api('admin-membership-update',{id,status:'approved',expiresAt:'2050-01-01T00:00:00Z'},owner)).status,200);assert.ok((await api('me',{},alice)).data.user.premium_until);assert.equal((await api('admin-posts',{},alice)).status,401);assert.equal((await api('admin-membership-update',{id,status:'revoked'},owner)).status,200);assert.equal((await api('me',{},alice)).data.user.premium_until,null)});
test('schedules and expiry respected, warnings require verification',async()=>{await api('admin-publish',{...content,slug:'scheduled-test',liveAt:'2050-01-01T00:00:00Z'},owner);assert.equal((await api('feed',{slug:'scheduled-test'})).data.posts.length,0);assert.equal((await fetch(host+'/habari/scheduled-test')).status,404);await api('admin-publish',{...content,slug:'expired-test',expiresAt:'2020-01-01T00:00:00Z'},owner);assert.equal((await api('feed',{slug:'expired-test'})).data.posts.length,0);assert.equal((await api('admin-publish',{...content,contentType:'Tahadhari'},owner)).status,400);assert.ok((await api('feed',{kind:'photo'})).data.posts.every(x=>x.kind==='photo'))});
test('CSRF checks, MFA replay and session revocation',async()=>{assert.equal((await post('social/like',{slug},alice,{Origin:'https://evil.example'})).status,403);assert.equal((await post('social/me',{},null,{'sec-fetch-site':'cross-site'})).status,403);assert.equal(verifyTotp('JBSWY3DPEHPK3PXP',totp('JBSWY3DPEHPK3PXP'),Math.floor(Date.now()/30000)),null);assert.equal((await api('admin-member-update',{id:bobId,active:false},owner)).status,200);assert.equal((await api('me',{},bob)).data.user,null);assert.equal((await api('login',{email:'bob@example.test',password:'Bob secure test password only'})).status,401);const d=(await api('admin-dashboard',{},owner)).data;assert.ok(d.audit.some(x=>x.action==='member.active.false'));assert.equal(d.stats.members,2);await api('logout',{},alice);assert.equal((await api('me',{},alice)).data.user,null)});
test('public GET feed and HTML never include member state',async()=>{const signed=await api('login',{email:'alice@example.test',password:'Alice secure test password only'});const cookie=signed.cookie;const r=await fetch(host+'/api/feed?limit=2',{headers:{Cookie:cookie}}),d=await r.json();assert.equal(r.status,200);assert.equal(d.posts.length,2);assert.equal(typeof d.posts[0].views,'number');assert.match(r.headers.get('cache-control'),/s-maxage=2/);assert.ok(d.posts.every(p=>!p.liked&&!('reporter' in p)));assert.ok(!JSON.stringify(d).includes('alice@example.test'));const html=await(await fetch(host+'/',{headers:{Cookie:cookie}})).text();assert.match(html,/id="initial-preview"/);assert.ok(!html.includes('alice@example.test'));assert.equal((await api('admin-instagram-status',{},cookie)).status,401);assert.equal((await api('admin-instagram-status',{},owner)).data.connected,false)});
test('discovery excludes expired and future posts and never exposes reporter metadata',async()=>{const d=(await api('discover')).data;assert.ok(d.items.some(x=>x.slug===slug));assert.ok(!d.items.some(x=>['expired-test','scheduled-test'].includes(x.slug)));assert.ok(d.items.every(x=>!('reporter' in x.data)));const html=await(await fetch(host+'/gundua?category=Elimu')).text();assert.doesNotMatch(html,/class="category-cutout"/);assert.match(html,/discovery.css/);assert.match(html,/Rudi Gundua/);});
test('members can preview only their private media, update avatar and publish reviewed promotions',async()=>{
 const login=await api('login',{email:'alice@example.test',password:'Alice secure test password only'}),cookie=login.cookie;
 const bytes=await readFile(new URL('../public/brand/icon-48.png',import.meta.url)),upload=await api('upload',{file:'data:image/png;base64,'+bytes.toString('base64')},cookie);assert.equal(upload.status,200);
 assert.equal((await fetch(host+upload.data.url)).status,404);assert.equal((await fetch(host+upload.data.url,{headers:{Cookie:cookie}})).status,200);assert.equal((await fetch(host+upload.data.url+'?w=96&format=webp',{headers:{Cookie:cookie}})).status,200);assert.equal((await fetch(host+upload.data.url,{headers:{Cookie:bob}})).status,404);
 assert.equal((await api('profile',{name:'Alice wa Bukoba',location:'Bukoba',avatar:upload.data.id},cookie)).status,200);assert.equal((await api('me',{},cookie)).data.user.avatar,upload.data.url);
 const legacyPromotion=randomUUID(),s='jamii-'+legacyPromotion;
 await (await getDb()).query('INSERT INTO jamco_community_submissions(id,user_id,category,headline,description,location,media) VALUES($1,$2,$3,$4,$5,$6,$7)',
 [legacyPromotion,aliceId,'Tangazo la biashara','Tangazo la biashara la jaribio','Hii ni taarifa ya majaribio kwenye database ya muda pekee.','Bukoba','[]']);
 assert.equal((await api('feed',{slug:s})).data.posts.length,0);
 assert.equal((await api('admin-moderate',{id:legacyPromotion,status:'published',confirmed:true},owner)).status,200);
 const p=(await api('feed',{slug:s})).data.posts[0];assert.equal(p.origin,'sponsored');assert.equal(p.contentType,'Business Promotions');assert.equal(p.contributorId,aliceId);assert.equal(p.contributor,'Alice wa Bukoba');assert.equal(p.contributorAvatar,upload.data.url);assert.ok(!JSON.stringify(p).includes('alice@example.test'));
 await api('comment',{slug:s,body:'Maoni ya jaribio la picha ya wasifu'},cookie);assert.equal((await api('comments',{slug:s})).data.comments[0].avatar,upload.data.url);
});
test('topic filters, image/video filters and media-free notes use stored public content',async()=>{
 const base={...content,media:[]};assert.equal((await api('admin-publish',{...base,slug:'government-topic-test',contentType:'Taarifa za Serikali',source:'https://www.bukobamc.go.tz/'},owner)).status,200);
 assert.equal((await api('feed',{topic:'serikali',slug:'government-topic-test'})).data.posts.length,1);assert.equal((await api('feed',{topic:'michezo',slug:'government-topic-test'})).data.posts.length,0);assert.equal((await api('feed',{topic:'invented-role-topic'})).status,400);
 assert.equal((await api('admin-publish',{...base,slug:'plain-text-topic-test',category:'Maendeleo'},owner)).status,200);assert.equal((await api('feed',{media:'text',topic:'maendeleo',slug:'plain-text-topic-test'})).data.posts.length,1);assert.equal((await api('feed',{media:'image',slug:'plain-text-topic-test'})).data.posts.length,0);
 const clip=await readFile(new URL('../qa/video-audio-test.mp4',import.meta.url)),upload=await api('upload',{file:'data:video/mp4;base64,'+clip.toString('base64')},owner);assert.equal(upload.status,200);assert.equal((await fetch(host+upload.data.url)).status,404);
 assert.equal((await api('admin-publish',{...base,slug:'video-in-news-test',media:[upload.data]},owner)).status,200);const p=(await api('feed',{media:'video',slug:'video-in-news-test'})).data.posts[0];assert.equal(p.kind,'story');assert.equal(p.media[0].type,'video');assert.equal((await api('feed',{media:'text',slug:'video-in-news-test'})).data.posts.length,0);
 const partial=await fetch(host+upload.data.url,{headers:{Range:'bytes=0-31'}});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,32);assert.match(partial.headers.get('content-range'),/^bytes 0-31\//);assert.equal((await fetch(host+upload.data.url,{headers:{Range:'bytes=999999999-'}})).status,416);assert.equal((await fetch(host+upload.data.url,{method:'HEAD'})).headers.get('content-length'),String(clip.length));
 const html=await(await fetch(host+'/?mada=serikali')).text();assert.match(html,/"topic":"serikali"/);assert.match(html,/"label":"Serikali"/);
});
test('existing municipal notices and development stories appear under the relevant feed topics', async () => {
 const cases = [
   ['mikopo-asilimia-kumi', ['serikali', 'matangazo', 'jamii'], 'maendeleo'],
   ['bukoba-yakagua-miradi', ['serikali', 'maendeleo'], 'matangazo'],
   ['soko-jipya-bukoba', ['maendeleo'], 'serikali'],
 ];
 for (const [slug, topics, unrelatedTopic] of cases) {
   for (const topic of topics) {
     const {data} = await api('feed', {slug, topic, media: 'text'});
     assert.deepEqual(data.posts.map(post => post.slug), [slug]);
   }
   const {data} = await api('feed', {slug, topic: unrelatedTopic});
   assert.deepEqual(data.posts, []);
 }
});
test('media QA fixtures are preview-only and never become production content',async()=>{
 const before=process.env.VERCEL_ENV;try{process.env.VERCEL_ENV='preview';const r=await fetch(host+'/?qa=media'),html=await r.text();assert.equal(r.headers.get('cache-control'),'no-store');assert.match(html,/qa-video-fixture/);assert.equal((await fetch(host+'/__qa/media.mp4',{headers:{Range:'bytes=0-31'}})).status,206);process.env.VERCEL_ENV='production';assert.equal((await fetch(host+'/__qa/media.mp4')).status,404);assert.ok(!(await(await fetch(host+'/?qa=media')).text()).includes('qa-video-fixture'));assert.equal((await api('feed',{slug:'qa-video-fixture'})).data.posts.length,0)}finally{if(before===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=before}
});

test('staff can publish a pinned funeral schedule with organized long text and recorded or synthesized audio',async()=>{
 assert.equal(bukobaDate(new Date('2026-11-23T21:01:00Z')),'2026-11-24');
 const spoken={text:'Habari za leo, Bukoba. Ratiba imebadilika.',language:'sw'};
 assert.equal((await api('synthesize',spoken,alice)).status,401);
 const audio=await api('synthesize',spoken,owner);
 assert.equal(audio.status,200,JSON.stringify(audio.data));
 assert.equal(audio.data.type,'audio');
 assert.equal((await fetch(host+audio.data.url)).status,404);
 const entry={...content,contentType:'Ratiba ya msiba',slug:'test-ratiba-ya-msiba',category:'Matukio',eventDate:bukobaDate(),eventTime:'09:30',pinned:true,
  body:'Ratiba ya mazishi.\n\n'+'Maelezo ya ratiba yanahifadhiwa. '.repeat(500),media:[audio.data],phone:'+255712123456'};
 assert.equal((await api('admin-publish',entry,owner)).status,200);
 const schedule=await (await fetch(host+'/api/today')).json();
 const item=schedule.items.find(item=>item.slug===entry.slug);
 assert.equal(item.eventTime,'09:30');
 assert.equal(item.pinned,true);
 assert.equal(item.phone,entry.phone);
 assert.equal((await api('feed',{media:'audio',slug:entry.slug})).data.posts[0].media[0].type,'audio');
 const recording=await fetch(host+audio.data.url,{headers:{Range:'bytes=0-43'}});
 const header=Buffer.from(await recording.arrayBuffer());
 assert.equal(recording.status,206);
 assert.equal(header.toString('ascii',0,4),'RIFF');
 assert.equal(header.toString('ascii',8,12),'WAVE');
 const article=await (await fetch(host+'/habari/'+entry.slug)).text();
 assert.match(article,/Ratiba ya mazishi\.\n\nMaelezo/);
 const preview=await (await fetch(host+'/api/feed?topic=matukio')).json();
 assert.ok(preview.posts.find(post=>post.slug===entry.slug).summary.length<=220);
 assert.ok(!('body' in preview.posts.find(post=>post.slug===entry.slug)));
});

test('large editorial uploads assemble idempotently and honor requested byte ranges',async()=>{
 const fixture=await readFile(new URL('../qa/video-audio-test.mp4',import.meta.url));
 const clip=Buffer.alloc(22_500_000);
 fixture.copy(clip);
 clip.writeUInt32BE(clip.length-fixture.length,fixture.length);
 clip.write('free',fixture.length+4);
 const info={id:randomUUID(),size:clip.length,mime:'video/mp4'};
 const first={...info,part:0,data:clip.subarray(0,2_500_000).toString('base64')};
 assert.equal((await api('upload-part',first,alice)).status,401);
 assert.equal((await api('upload-part',{...info,size:100_000_001,finish:true},owner)).status,400);
 assert.equal((await api('upload-part',{...info,finish:true},owner)).status,409);
 assert.equal((await api('upload-part',first,owner)).status,200);
 assert.deepEqual((await api('upload-part',{...info,status:true},owner)).data.parts,[0]);
 assert.equal((await api('upload-part',first,owner)).status,200);
 for(let part=1;part<9;part++){
  const data=clip.subarray(part*2_500_000,(part+1)*2_500_000).toString('base64');
  assert.equal((await api('upload-part',{...info,part,data},owner)).status,200);
 }
 const saved=await api('upload-part',{...info,finish:true},owner);
 assert.equal(saved.status,200,JSON.stringify(saved.data));
 assert.deepEqual((await api('upload-part',{...info,finish:true},owner)).data,saved.data);
 assert.equal((await fetch(host+saved.data.url)).status,404);
 assert.equal((await api('admin-publish',{...content,slug:'test-long-video',media:[saved.data]},owner)).status,200);
 const response=await fetch(host+saved.data.url,{headers:{Range:'bytes=0-'}});
 assert.equal(response.status,206);
 assert.equal(response.headers.get('content-range'),'bytes 0-22499999/22500000');
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),clip);
 const end=await fetch(host+saved.data.url,{headers:{Range:'bytes=-16'}});
 assert.equal(end.headers.get('content-range'),'bytes 22499984-22499999/22500000');
 assert.equal((await end.arrayBuffer()).byteLength,16);
});

test('service provider requests are private and only editorial staff can review them',async()=>{
 const result=await post('tip',{service:'Usafiri',name:'Mtoa huduma wa jaribio',email:'provider@example.test',
  location:'Bukoba',phone:'+255712345678',message:'Hili ni ombi la jaribio kwenye orodha ya usafiri.',consent:true});
 assert.equal(result.status,200);
 assert.equal((await api('admin-intake',{},alice)).status,401);
 const {data}=await api('admin-intake',{},owner);
 const request=data.items.find(item=>item.email==='provider@example.test');
 assert.equal(request.data.service,'Usafiri');
 assert.equal(request.data.publicContact,false);
 assert.equal((await api('admin-intake-status',{reference:request.reference,status:'reviewing'},moderator)).status,403);
 assert.equal((await api('admin-intake-status',{reference:request.reference,status:'reviewing'},owner)).status,200);
 assert.equal((await api('admin-intake',{},owner)).data.items.find(item=>item.reference===request.reference).status,'reviewing');
});

test('owner issues a single-use agent invitation and the agent can securely submit a driver listing',async()=>{
 const password='Only for this test suite and nowhere else',email='field-agent@example.test';
 for(const path of ['/admin/mmiliki','/admin/wakala'])assert.equal((await fetch(host+path)).status,200);
 assert.equal((await api('admin-agent-invite',{email},alice)).status,401);
 assert.equal((await api('admin-agent-invite',{email},moderator)).status,403);
 const invite=await api('admin-agent-invite',{email},owner);
 assert.equal(invite.status,200,JSON.stringify(invite.data));
 assert.match(invite.data.token,/^[a-f0-9]{64}$/);
 const other=await api('agent-accept',{email:'wrong@example.test',password,token:invite.data.token});
 assert.equal(other.status,409);
 assert.equal((await api('agent-accept',{email,password,token:invite.data.token})).status,200);
 assert.equal((await api('agent-accept',{email,password,token:invite.data.token})).status,409);
 assert.equal((await api('staff-login',{email,password,mode:'owner'})).status,403);
 const signed=await api('staff-login',{email,password,mode:'agent'});
 assert.equal(signed.status,200);
 const session=signed.cookie;
 assert.equal((await api('agent-profile',{},session)).status,401);
 await enroll(session);
 assert.equal((await api('staff-me',{},session)).data.agent,true);
 assert.equal((await api('admin-publish',content,session)).status,403);
 assert.equal((await api('admin-intake',{},session)).status,403);
 assert.equal((await api('admin-agents',{},session)).status,403);
 assert.equal((await api('agent-profile',{},owner)).status,403);
 const png=await readFile(new URL('../public/brand/icon-48.png',import.meta.url));
 const upload={id:randomUUID(),mime:'image',size:png.length};
 assert.equal((await api('agent-upload-part',{...upload,part:0,data:png.toString('base64')},session)).status,200);
 const photo=(await api('agent-upload-part',{...upload,finish:true},session)).data;
 assert.equal(photo.type,'image');
 assert.equal((await fetch(host+photo.url)).status,404);
 assert.equal((await api('agent-profile-save',{name:'Wakala wa jaribio',photoId:photo.id},session)).status,200);
 const request=await api('agent-submit',{name:'Dereva wa jaribio',location:'Bukoba',service:'Boda boda',message:'Kusafirisha watu na kupeleka chakula katika eneo la jaribio.',phone:'+255700111222',consent:true,publicContact:true,delivery:true,photoId:photo.id},session);
 assert.equal(request.status,200,JSON.stringify(request.data));
 const listing={...content,slug:'driver-listing-test',contentType:'Wasifu wa huduma',category:'Boda boda',intakeReference:request.data.reference,phone:'+255700111222',delivery:true,title:'Dereva wa jaribio',media:[photo]};
 assert.equal((await api('admin-publish',{...listing,media:[]},owner)).status,400);
 assert.equal((await api('admin-publish',listing,owner)).status,200);
 assert.equal((await api('admin-publish',{...listing,phone:''},owner)).status,400);
 assert.equal((await api('feed',{slug:listing.slug})).data.posts[0].kind,'listing');
 assert.equal((await api('feed',{q:'Dereva wa jaribio'})).data.posts.length,0);
 assert.ok((await api('discover',{q:'Dereva wa jaribio'})).data.items.some(item=>item.slug===listing.slug));
 assert.equal((await api('agent-profile',{},session)).data.listings[0].slug,listing.slug);
 assert.equal((await fetch(host+photo.url)).status,200);
 assert.equal((await api('admin-agent-update',{email,active:false},owner)).status,200);
 assert.equal((await api('agent-profile',{},session)).status,401);
});

test('an optional featured announcement is included on its specified day and ordinary posts stay in the feed',async()=>{
 const day=bukobaDate(),notice={...content,contentType:'Tangazo',slug:'highlight-day-test',title:'Tangazo muhimu la jaribio',highlightDay:day};
 assert.equal((await api('admin-publish',notice,owner)).status,200);
 assert.equal((await api('admin-publish',{...notice,slug:'ordinary-today-test',highlightDay:''},owner)).status,200);
 const schedule=await (await fetch(host+'/api/today')).json();
 assert.equal(schedule.items.find(item=>item.slug===notice.slug).featured,true);
 assert.ok(!schedule.items.some(item=>item.slug==='ordinary-today-test'));
 assert.equal((await api('admin-publish',{...notice,highlightDay:'2026-02-30'},owner)).status,400);
});

test('active member and MFA staff sessions renew without asking for credentials',async()=>{
 const db=await getDb();
 const signed=await api('login',{email:'alice@example.test',password:'Alice secure test password only'});
 assert.equal(signed.status,200);
 assert.match(signed.headers.get('set-cookie'),/Max-Age=31536000/);
 const memberDigest=sha(signed.cookie.split('=')[1]);
 await db.query("UPDATE jamco_community_sessions SET expires_at=now()+interval '2 days' WHERE digest=$1",[memberDigest]);
 const member=await api('me',{},signed.cookie);
 assert.equal(member.data.user.id,aliceId);
 assert.ok(!('expires_at' in member.data.user));
 assert.match(member.headers.get('set-cookie'),/Max-Age=31536000/);
 const staffDigest=sha(owner.split('=')[1]);
 await db.query("UPDATE jamco_sessions SET expires_at=now()+interval '1 day' WHERE digest=$1",[staffDigest]);
 const staff=await api('staff-me',{},owner);
 assert.equal(staff.status,200);
 assert.equal(staff.data.mfa,true);
 assert.match(staff.headers.get('set-cookie'),/Max-Age=31536000/);
 const closed=await api('logout',{},signed.cookie);
 assert.match(closed.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal((await api('me',{},signed.cookie)).data.user,null);
});
test('the offline shell is public even when fetched by a signed-in browser',async()=>{
 const result=await fetch(host+'/offline-shell',{headers:{Cookie:owner}});
 const shell=await result.text();
 assert.equal(result.status,200);
 assert.equal(result.headers.get('cache-control'),'no-store');
 assert.match(shell,/"offline":true/);
 assert.match(shell,/id="jamco-install"/);
 assert.doesNotMatch(shell,/owner@example\.test|alice@example\.test|"post":|"feed":/);
});

test('newsroom publishes short notes or audio-only announcements and receives support messages',async()=>{
 const notice={...content,slug:'short-newsroom-note',title:'Taarifa fupi',body:'Karibu.'};
 assert.equal((await api('admin-publish',notice,owner)).status,200);
 assert.equal((await api('admin-publish',{...notice,slug:'empty-newsroom-note',body:''},owner)).status,400);
 const voice=await api('synthesize',{text:'Karibu Bukoba leo.',language:'sw'},owner);
 assert.equal(voice.status,200);
 const audio={...notice,slug:'audio-newsroom-note',body:'',media:[{...voice.data,alt:'Muziki'}]};
 assert.equal((await api('admin-publish',audio,owner)).status,200);
 assert.equal((await api('feed',{slug:audio.slug})).data.posts[0].media[0].alt,'Muziki');
 assert.equal((await post('tip',{email:'support-test@example.test',name:'Jaribio',message:'Nahitaji msaada wa kutumia huduma.',topic:'support',consent:true})).status,200);
 assert.ok((await api('admin-intake',{},owner)).data.items.some(item=>item.email==='support-test@example.test'&&item.data.topic==='support'));
});

test('dedicated studio uses existing staff authorization and stages the login code',async()=>{
 const studioHost='jamco-bukoba-admin.vercel.app';
 const studioHeaders={'x-test-studio':'1'};
 const root=await fetch(host+'/',{headers:studioHeaders});
 assert.equal(root.status,200);
 assert.equal(root.headers.get('x-robots-tag'),'noindex, nofollow');
 const html=await root.text();
 assert.match(html,/data-studio="true"/);
 assert.doesNotMatch(html,/"feed":/);assert.match(html,/href="\/studio.webmanifest"/);
 const publicRoute=await fetch(host+'/gundua',{headers:studioHeaders,redirect:'manual'});
 assert.equal(publicRoute.headers.get('location'),'https://jamco-bukoba.vercel.app/gundua');
 assert.equal((await post('social/admin-dashboard',{},null,studioHeaders)).status,401);
 assert.equal((await post('social/admin-dashboard',{},owner,{...studioHeaders,Origin:'https://'+studioHost})).status,200);
 assert.equal((await post('social/admin-dashboard',{},owner,{...studioHeaders,Origin:'https://jamco-bukoba.vercel.app'})).status,403);
 const password='Only used by automated test suite';
 const challenge=await post('social/staff-login',{email:'owner@example.test',password,mode:'owner'},null,studioHeaders);
 assert.equal(challenge.status,401);
 assert.equal(challenge.data.code,'staff_code_required');
 assert.equal(challenge.cookie,undefined);
 const wrong=await post('social/staff-login',{email:'owner@example.test',password:'wrong',mode:'owner'},null,studioHeaders);
 assert.equal(wrong.status,401);
 assert.equal(wrong.data.code,undefined);
});

test('studio owner can change credentials and published audio has a scannable QR',async()=>{
 const missing=await fetch(host+'/api/audio-qr/social-workflow-test');
 assert.equal(missing.status,404);
 const qr=await fetch(host+'/api/audio-qr/audio-newsroom-note');
 assert.equal(qr.status,200);
 assert.equal(qr.headers.get('content-type'),'image/png');
 assert.equal(Buffer.from(await qr.arrayBuffer()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const credentials={email:'updated-owner@example.test',displayName:'Mmiliki wa JAMCO',username:'test-studio-owner',newPassword:'New isolated test password'};
 assert.equal((await api('staff-account',{...credentials,currentPassword:'wrong'},owner)).status,401);
 assert.equal((await api('staff-account',{...credentials,currentPassword:'Only used by automated test suite'},owner)).status,200);
 const staff=await api('staff-me',{},owner);
 assert.equal(staff.data.email,credentials.email);
 assert.equal(staff.data.displayName,credentials.displayName);
 assert.equal((await api('staff-login',{email:credentials.username,password:credentials.newPassword,mode:'owner'})).data.code,'staff_code_required');
});

test('public media library counts individual assets, excludes drafts, and paginates',async()=>{
 const db=await getDb();const item={title:'Library test',media:[{type:'image',url:'/brand/icon-192.png'},{type:'video',url:'/brand/test.mp4'}]};
 for(const [s,state,live] of [['library-test-published','published','2001-01-01'],['library-test-draft','draft','2001-01-01'],['library-test-future','published','2050-01-01']])await db.query('INSERT INTO jamco_content(slug,kind,state,live_at,data) VALUES($1,$2,$3,$4,$5)',[s,'story',state,live,JSON.stringify(item)]);
 const page=await fetch(host+'/api/library?year=2001&limit=1').then(r=>r.json());assert.equal(page.items.length,1);assert.equal(page.items[0].slug,'library-test-published');assert.ok(page.next);const next=await fetch(host+'/api/library?year=2001&limit=1&cursor='+encodeURIComponent(page.next)).then(r=>r.json());assert.equal(next.items.length,1);assert.notEqual(next.items[0].type,page.items[0].type);assert.equal(next.next,null);assert.equal(page.images,next.images);assert.equal(page.videos,next.videos);assert.ok(page.years.includes(2001));
 await db.query("DELETE FROM jamco_content WHERE slug LIKE 'library-test-%'");
});

test('Studio password login and real time-series respect permissions',async()=>{const r=await api('staff-login',{email:'test-studio-owner',password:'New isolated test password',mode:'studio'});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal((await api('admin-dashboard',{},r.cookie)).status,200);const a=await api('admin-analytics-series',{days:7},r.cookie);assert.equal(a.status,200,JSON.stringify(a.data));assert.equal(a.data.series.length,7);assert.equal((await api('admin-analytics-series',{},alice)).status,401);});

test('advertising circle count follows publication state and placement',async()=>{for(const slug of ['test-ad-one','test-ad-two'])assert.equal((await api('admin-publish',{...content,slug,contentType:'Business Promotions',advertiser:'Test company',adCircle:true,adFeed:true},owner)).status,200);const first=await api('ads');assert.ok(first.data.items.some(x=>x.slug==='test-ad-one'));assert.equal(first.data.count,first.data.items.length);assert.equal((await api('admin-publish',{...content,slug:'test-ad-one',contentType:'Business Promotions',state:'archived'},owner)).status,200);const second=await api('ads');assert.equal(second.data.count,first.data.count-1);});

test('editorial image retains uploaded source bytes',async()=>{const bytes=await readFile(new URL('../public/brand/icon-48.png',import.meta.url));const info={id:randomUUID(),size:bytes.length,mime:'image'};assert.equal((await api('upload-part',{...info,part:0,data:bytes.toString('base64')},owner)).status,200);const saved=await api('upload-part',{...info,finish:true},owner);assert.equal(saved.status,200,JSON.stringify(saved.data));const response=await fetch(host+saved.data.url,{headers:{Cookie:owner}});assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);const d=await api('admin-media-info',{id:info.id},owner);assert.equal(d.data.sha256,sha(bytes));assert.equal(d.data.size,bytes.length);});

test('QuickTime source upload resumes and is byte-identical after publishing',async()=>{const clip=await readFile(new URL('../qa/video-audio-test.mp4',import.meta.url));const info={id:randomUUID(),mime:'video/quicktime',size:clip.length};assert.equal((await api('upload-part',{...info,part:0,data:clip.toString('base64')},owner)).status,200);assert.deepEqual((await api('upload-part',{...info,status:true},owner)).data.parts,[0]);const saved=await api('upload-part',{...info,finish:true},owner);assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal((await api('upload-part',{...info,status:true},owner)).data.complete.id,info.id);assert.equal((await api('admin-publish',{...content,slug:'test-quicktime-original',media:[saved.data]},owner)).status,200);const response=await fetch(host+saved.data.url);assert.equal(response.headers.get('content-type'),'video/quicktime');assert.deepEqual(Buffer.from(await response.arrayBuffer()),clip);});

test('encoder produces a real fast-start playback copy and preserves original bytes',async t=>{let ffmpeg;try{ffmpeg=(await import('ffmpeg-static')).default}catch{t.skip('ffmpeg-static not installed in local environment');return}assert.ok(ffmpeg);const fixture=await readFile(new URL('../qa/video-audio-test.mp4',import.meta.url));const info={id:randomUUID(),size:fixture.length,mime:'video/mp4'};assert.equal((await api('upload-part',{...info,part:0,data:fixture.toString('base64')},owner)).status,200);const saved=await api('upload-part',{...info,finish:true},owner);assert.equal(saved.status,200);assert.equal((await api('upload-part',{id:info.id,optimize:true,quality:'lite'},alice)).status,401);const optimized=await api('upload-part',{id:info.id,optimize:true,quality:'both'},owner);assert.equal(optimized.status,200);assert.equal(optimized.data.ready,true,JSON.stringify(optimized.data));assert.deepEqual(optimized.data.qualities.sort(),['lite','standard']);assert.equal((await fetch(host+saved.data.url+'?stream=lite')).status,404);assert.equal((await api('admin-publish',{...content,slug:'test-fast-video',media:[saved.data]},owner)).status,200);const hd=await fetch(host+saved.data.url+'?v=2&stream=standard');assert.equal(hd.status,200);const hdBytes=Buffer.from(await hd.arrayBuffer());assert.ok(hdBytes.indexOf(Buffer.from('moov'))<hdBytes.indexOf(Buffer.from('mdat')));const stream=await fetch(host+saved.data.url+'?stream=lite');assert.equal(stream.status,200);assert.equal(stream.headers.get('content-type'),'video/mp4');const data=Buffer.from(await stream.arrayBuffer());assert.ok(data.indexOf(Buffer.from('moov'))<data.indexOf(Buffer.from('mdat')));assert.deepEqual(Buffer.from(await (await fetch(host+saved.data.url)).arrayBuffer()),fixture);const range=await fetch(host+saved.data.url+'?stream=lite',{headers:{Range:'bytes=0-31'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),data.subarray(0,32));});

test('operator preparation capability is single use and restricted to public videos',async()=>{const {videoJobTable}=await import('../lib/video-delivery.js'),db=await getDb();await videoJobTable(db);const {createHash,randomBytes}=await import('node:crypto');const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');const rows=(await db.query("SELECT id FROM jamco_uploads WHERE public AND mime='video/mp4' ORDER BY created_at DESC LIMIT 1")).rows;assert.ok(rows[0]);await db.query("INSERT INTO jamco_video_jobs(token_hash,id,quality,expires_at) VALUES($1,$2,'lite',now()+interval '5 minutes')",[hash,rows[0].id]);assert.equal((await fetch(host+'/api/video-preparation/'+'0'.repeat(64))).status,404);const res=await fetch(host+'/api/video-preparation/'+token);assert.equal(res.status,200);assert.equal((await fetch(host+'/api/video-preparation/'+token)).status,404);});
