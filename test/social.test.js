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
before(async()=>{await migrate();server=createServer(handler).listen(0,'127.0.0.1');await once(server,'listening');host='http://127.0.0.1:'+server.address().port});after(()=>server?.close());
test('guest routes, feed and protected APIs',async()=>{for(const p of ['/','/gundua','/shiriki','/hifadhi','/akaunti','/admin'])assert.equal((await fetch(host+p)).status,200,p);assert.ok((await api('feed')).data.posts.length);assert.equal((await api('like',{slug})).status,401);assert.equal((await api('admin-dashboard')).status,401)});
test('owner setup and mandatory MFA',async()=>{const d={email:'owner@example.test',password:'Only used by automated test suite'};assert.equal((await api('staff-setup',{...d,key:'wrong'})).status,403);const r=await api('staff-setup',{...d,key:process.env.JAMCO_SETUP_KEY});assert.equal(r.status,200,JSON.stringify(r.data));owner=r.cookie;assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);assert.equal((await api('admin-dashboard',{},owner)).status,401);assert.equal((await post('manage/list',{},owner)).status,401);await enroll(owner);assert.equal((await api('admin-dashboard',{},owner)).status,200)});
test('registration cannot grant role or verification; email tokens single use',async()=>{let r=await api('register',{email:'alice@example.test',password:'Alice secure test password only',name:'Alice',consent:true,role:'owner',verified:true});assert.equal(r.status,200);alice=r.cookie;assert.equal(r.data.verificationSent,false);assert.equal((await api('me',{},alice)).data.user.verified,false);const existing='bukoba-yakagua-miradi';
const pending=await api('comment',{slug:existing,body:'Maoni yanayosubiri 🙏'},alice);
assert.equal(pending.status,200);
assert.equal(pending.data.pending,true);
assert.equal((await api('comments',{slug:existing})).data.comments.length,0);
assert.equal((await api('admin-comment-approve',{id:pending.data.id},alice)).status,401);
assert.equal((await api('admin-comment-approve',{id:pending.data.id},owner)).status,200);
assert.equal((await api('comments',{slug:existing})).data.comments[0].body,'Maoni yanayosubiri 🙏');aliceId=await verify(alice,'1');r=await api('register',{email:'bob@example.test',password:'Bob secure test password only',name:'Bob',consent:true});assert.equal(r.status,200);bob=r.cookie;bobId=await verify(bob,'2');assert.equal((await api('admin-dashboard',{},alice)).status,401)});
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
test('public GET feed and HTML never include member state',async()=>{const signed=await api('login',{email:'alice@example.test',password:'Alice secure test password only'});const cookie=signed.cookie;const r=await fetch(host+'/api/feed?limit=2',{headers:{Cookie:cookie}}),d=await r.json();assert.equal(r.status,200);assert.equal(d.posts.length,2);assert.match(r.headers.get('cache-control'),/s-maxage=10/);assert.ok(d.posts.every(p=>!p.liked&&!('reporter' in p)));assert.ok(!JSON.stringify(d).includes('alice@example.test'));const html=await(await fetch(host+'/',{headers:{Cookie:cookie}})).text();assert.match(html,/id="initial-preview"/);assert.ok(!html.includes('alice@example.test'));assert.equal((await api('admin-instagram-status',{},cookie)).status,401);assert.equal((await api('admin-instagram-status',{},owner)).data.connected,false)});
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

test('large editorial uploads assemble idempotently and play through bounded byte ranges',async()=>{
 const fixture=await readFile(new URL('../qa/video-audio-test.mp4',import.meta.url));
 const clip=Buffer.alloc(20_000_000);
 fixture.copy(clip);
 clip.writeUInt32BE(clip.length-fixture.length,fixture.length);
 clip.write('free',fixture.length+4);
 const info={id:randomUUID(),size:clip.length,mime:'video/mp4'};
 const first={...info,part:0,data:clip.subarray(0,2_500_000).toString('base64')};
 assert.equal((await api('upload-part',first,alice)).status,401);
 assert.equal((await api('upload-part',{...info,size:20_000_001,finish:true},owner)).status,400);
 assert.equal((await api('upload-part',{...info,finish:true},owner)).status,409);
 assert.equal((await api('upload-part',first,owner)).status,200);
 assert.equal((await api('upload-part',first,owner)).status,200);
 for(let part=1;part<8;part++){
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
 assert.equal(response.headers.get('content-range'),'bytes 0-2499999/20000000');
 assert.equal((await response.arrayBuffer()).byteLength,2_500_000);
 const end=await fetch(host+saved.data.url,{headers:{Range:'bytes=-16'}});
 assert.equal(end.headers.get('content-range'),'bytes 19999984-19999999/20000000');
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
