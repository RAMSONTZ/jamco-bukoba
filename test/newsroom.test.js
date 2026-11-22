import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import handler from '../api/site.js';
import { migrate, getDb } from '../lib/db.js';
import seed from '../lib/seed.js';
import {totp} from '../lib/social.js';
async function enroll(cookie){const start=await post('social/mfa-start',{},cookie);assert.equal(start.res.status,200,JSON.stringify(start.data));const confirm=await post('social/mfa-confirm',{code:totp(start.data.secret)},cookie);assert.equal(confirm.res.status,200,JSON.stringify(confirm.data));}

let server, host, owner;
process.env.JAMCO_LOCAL_DB='memory://';
process.env.JAMCO_SETUP_KEY='jamco-test-key-01234567890123';
process.env.VAPID_PUBLIC_KEY='test-public-key';

before(async()=>{
  await migrate();
  server=createServer(handler).listen(0,'127.0.0.1');
  await once(server,'listening');
  host='http://127.0.0.1:'+server.address().port;
});
after(()=>server?.close());
const get=(p,opts={})=>fetch(host+p,{redirect:'manual',...opts});
async function post(path,data={},cookie) {
  const res=await get('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
  return {res,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
const ownerEmail='owner@example.test';
const credentials={email:ownerEmail,password:'Test password for this suite only'};
const article={slug:'integration-story',kind:'story',date:'2026-11-21',category:'Bukoba',title:'Kichwa cha jaribio',summary:'Muhtasari wa jaribio la uhariri.',body:'Maelezo ya jaribio.\n\nAya ya pili.',origin:'original',publisher:'JAMCO Bukoba'};

test('public pages, article metadata and sitemap',async()=>{
  for(const path of ['/','/habari','/habari/bukoba-yakagua-miradi','/picha','/picha/airfield','/tv','/matukio','/biashara','/wasiliana','/kumbukumbu','/faragha','/hifadhi','/mapendeleo','/tafuta','/instagram','/admin','/sitemap.xml','/robots.txt']) {
    const res=await get(path);
    assert.equal(res.status,200,path);
    assert.equal(res.headers.get('x-content-type-options'),'nosniff');
  }
  assert.equal((await get('/missing')).status,404);
  assert.equal((await get('/updates')).headers.get('location'),'/habari');
  const detail=await (await get('/habari/bukoba-yakagua-miradi')).text();
  assert.match(detail,/application\/ld\+json/);
  assert.match(detail,/social.js/);
  assert.match(await (await get('/tafuta?q=Victoria')).text(),/MV Victoria katika Bandari ya Bukoba/);
  assert.match(await (await get('/habari?mada=Kagera')).text(),/Kagera yazindua/);
  for(const p of seed.filter(x=>x.kind==='photo')) {
    await readFile(new URL('../public'+p.image,import.meta.url));
    await readFile(new URL('../public'+p.large,import.meta.url));
  }
});

test('owner bootstrap, unauthorized requests, newsroom publishing and staff roles',async()=>{
  assert.equal((await post('manage/list')).res.status,401);
  assert.equal((await post('manage/setup',{...credentials,key:'invalid'})).res.status,403);
  const setup=await post('manage/setup',{...credentials,key:process.env.JAMCO_SETUP_KEY});
  assert.equal(setup.res.status,200,JSON.stringify(setup.data));
  owner=setup.cookie;
  assert.equal((await post('manage/list',{},owner)).res.status,401);
  await enroll(owner);
  assert.match(setup.res.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal((await post('manage/setup',{...credentials,key:process.env.JAMCO_SETUP_KEY})).res.status,409);
  assert.equal((await post('manage/content',{...article,state:'review'},owner)).res.status,200);
  assert.equal((await get('/habari/'+article.slug)).status,404);
  assert.equal((await post('manage/content',{...article,state:'published',liveAt:'2050-01-01T08:30:00Z'},owner)).res.status,200);
  assert.equal((await get('/habari/'+article.slug)).status,404);
  assert.equal((await post('manage/content',{...article,state:'published'},owner)).res.status,200);
  assert.equal((await get('/habari/'+article.slug)).status,200);
  assert.equal((await post('read',{slug:article.slug})).res.status,200);
  const reporter={email:'reporter@example.test',password:'Reporter test password only'};
  assert.equal((await post('manage/staff',{...reporter,role:'reporter',active:true},owner)).res.status,200);
  const login=await post('manage/login',reporter);
  assert.equal(login.res.status,200);
  await enroll(login.cookie);
  assert.equal((await post('manage/content',{...article,slug:'new-reporter-story',state:'published'},login.cookie)).res.status,403);
  assert.equal((await post('manage/content',{...article,slug:'new-reporter-story',state:'review'},login.cookie)).res.status,200);
  assert.equal((await post('manage/remove',{slug:article.slug},login.cookie)).res.status,403);
  assert.equal((await post('manage/logout',{},login.cookie)).res.status,200);
  assert.equal((await post('manage/list',{},login.cookie)).res.status,401);
  const admin=await post('manage/list',{},owner);
  assert.equal(admin.data.role,'owner');
  assert.ok(admin.data.audit.some(x=>x.action==='content.published'));
  assert.ok(admin.data.reads.some(x=>x.slug===article.slug&&x.reads===1));
});

test('campaign creative, request tracking, tips and subscriber deduplication',async()=>{
  const mail='reader@example.test';
  const fields={email:mail,name:'Test business',message:'This is a local test request only.',consent:true};
  const picture=await readFile(new URL('../public/assets/icon-192.png',import.meta.url));
  const campaign=await post('campaign',{...fields,product:'coverage-booking',creative:'data:image/png;base64,'+picture.toString('base64')});
  assert.equal(campaign.res.status,200,JSON.stringify(campaign.data));
  const reference=campaign.data.message.match(/JC-[A-F0-9]{16}/)[0];
  assert.equal((await post('track',{reference,email:'wrong@example.test'})).res.status,404);
  assert.match((await post('track',{reference,email:mail})).data.message,/limepokelewa/);
  const dashboard=await post('manage/list',{},owner);
  const item=dashboard.data.requests.find(x=>x.reference===reference);
  assert.equal(item.email,mail);
  assert.equal((await get('/media/'+item.data.creative)).status,404);
  assert.equal((await get('/media/'+item.data.creative,{headers:{Cookie:owner}})).status,200);
  assert.equal((await post('manage/status',{reference,status:'approved'},owner)).res.status,200);
  assert.match((await post('track',{reference,email:mail})).data.message,/limeidhinishwa/);
  assert.equal((await post('tip',{...fields,location:'Bukoba'})).res.status,200);
  assert.equal((await post('subscribe',{email:mail,consent:false})).res.status,400);
  for(let i=0;i<2;i++) assert.equal((await post('subscribe',{email:mail,consent:true})).res.status,200);
  const db=await getDb();
  const result=await db.query("SELECT count(*)::int AS n FROM jamco_requests WHERE kind='subscription' AND email=$1",[mail]);
  assert.equal(result.rows[0].n,1);
});

test('Instagram review, push opt-in, input limits and same-origin policy',async()=>{
  assert.equal((await post('manage/instagram',{source:'https://example.test/reel/whatever',date:'2026-11-21'},owner)).res.status,400);
  const a=seed.find(x=>x.origin==='instagram');
  if(a) {
    const r=await post('manage/instagram',{source:a.source,date:a.date,title:a.title,summary:a.summary},owner);
    assert.ok([200,409].includes(r.res.status));
  }
  assert.equal((await get('/api/push-config')).status,200);
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/localtest',keys:{auth:'a'.repeat(22),p256dh:'a'.repeat(87)}};
  assert.equal((await post('push',{categories:['Bukoba'],subscription:{...subscription,endpoint:'https://example.test/'}})).res.status,400);
  assert.equal((await post('push',{subscription,categories:['Bukoba']})).res.status,200);
  assert.equal((await post('push-off',{subscription})).res.status,200);
  const cross=await get('/api/tip',{method:'POST',headers:{'Content-Type':'application/json','Sec-Fetch-Site':'cross-site'},body:'{}'});
  assert.equal(cross.status,403);
});
