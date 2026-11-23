import {readFile} from 'node:fs/promises';
import {mediaFixture} from '../qa/feed-fixture.js';
import {feedTopics} from '../public/feed-topics.js';
import {transformImage} from '../lib/media.js';
import {publicFeed,clearPublicFeed} from '../lib/public-feed.js';
import {social,member} from '../lib/social.js';
import {socialShell} from '../lib/social-pages.js';
import { getDb, published } from '../lib/db.js';
import { adminAction, publicAction, ApiError, session, media } from '../lib/actions.js';
import { page, htmlShell, origin, esc } from '../lib/pages.js';

const json = (res,status,value) => {
  res.setHeader('Cache-Control','no-store');
  return send(res,status,'application/json; charset=utf-8',JSON.stringify(value));
};
function send(res,status,type,value) {
  res.statusCode=status;
  res.setHeader('Content-Type',type);
  res.end(value);
}

function sendBinary(req,res,file){
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(res,405,'text/plain','Method not allowed')}
 const data=Buffer.from(file.data),size=data.length;res.setHeader('Accept-Ranges','bytes');let start=0,end=size-1,status=200;
 if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||!match[1]&&!match[2]){res.setHeader('Content-Range','bytes */'+size);return send(res,416,'text/plain','Range not satisfiable')}
 if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1}else{start=Math.max(0,size-Number(match[2]));end=size-1}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start){res.setHeader('Content-Range','bytes */'+size);return send(res,416,'text/plain','Range not satisfiable')}
 status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`)}
 res.setHeader('Content-Length',end-start+1);return send(res,status,file.mime,req.method==='HEAD'?'':data.subarray(start,end+1));
}

async function input(req) {
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) throw new ApiError(415,'Tuma taarifa za JSON.');
  if(Number(req.headers['content-length'])>4_300_000) throw new ApiError(413,'Faili ni kubwa mno.');
  let result=req.body;
  if(result===undefined) {
    const chunks=[];
    let size=0;
    for await(const chunk of req) {
      size+=chunk.length;
      if(size>4_300_000) throw new ApiError(413,'Faili ni kubwa mno.');
      chunks.push(chunk);
    }
    result=Buffer.concat(chunks).toString('utf8');
  }
  try { if(typeof result==='string' || Buffer.isBuffer(result)) result=JSON.parse(result); }
  catch { throw new ApiError(400,'Taarifa hazikusomeka.'); }
  if(!result || typeof result!=='object' || Array.isArray(result)) throw new ApiError(400,'Taarifa hazikusomeka.');
  return result;
}

const redirects = {
  '/updates':'/habari','/news':'/habari','/events':'/matukio','/gallery':'/picha','/video':'/tv',
  '/business':'/biashara','/contact':'/wasiliana','/saved':'/hifadhi',
};

function adminPage(configured,setup) {
  return '<header class="intro"><h1>Chumba cha habari</h1><p>Usimamizi wa maudhui, kampeni na taarifa za JAMCO.</p></header>'+
    (configured?'<div id="admin-app"><p>Inapakia chumba cha habari…</p></div>':
      '<form class="admin-form plain-card" data-json="/api/manage/'+(setup?'setup':'login')+'" data-reload><h2>'+(setup?'Unda akaunti ya mmiliki':'Ingia')+'</h2>'+
      (setup?'<label>Ufunguo wa usanidi<input type="password" name="key" required autocomplete="off"></label>':'')+
      '<label>Barua pepe<input type="email" name="email" autocomplete="username" required></label><label>Nenosiri<input type="password" name="password" autocomplete="'+(setup?'new-password':'current-password')+'" required></label><div><button class="button">'+(setup?'Unda akaunti':'Ingia')+'</button></div><p role="status" class="form-status"></p></form>');
}
function security(res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options',process.env.VERCEL?'DENY':'SAMEORIGIN');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',("default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self' https: data:; frame-src https://www.youtube-nocookie.com https://www.instagram.com; form-action 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; upgrade-insecure-requests").replace("frame-ancestors 'none'",process.env.VERCEL?"frame-ancestors 'none'":"frame-ancestors 'self'").replace('frame-src https:',process.env.VERCEL?'frame-src https:':"frame-src 'self' https:"));
}
export default async function handler(req,res) {
  security(res);
  const parsed = new URL(req.url,'http://internal');
  const path = (parsed.pathname==='/api/site' && typeof req.query?.__path==='string' ? req.query.__path : parsed.pathname).replace(/\/$/,'') || '/';
  const query=parsed.searchParams;
  try {
    if(path.startsWith('/__qa/')){if(process.env.VERCEL_ENV!=='preview'||path!=='/__qa/media.mp4')return send(res,404,'text/plain','Not found');res.setHeader('Cache-Control','no-store');return sendBinary(req,res,{mime:'video/mp4',data:await readFile(new URL('../qa/video-audio-test.mp4',import.meta.url))})}
    if(path==='/api/feed'){
      if(!['GET','HEAD'].includes(req.method))return json(res,405,{message:'Method not allowed'});
      const data=Object.fromEntries(query);delete data.__path;
      const result=await publicFeed(await getDb(),req,res,data);
      res.setHeader('Cache-Control','public, max-age=0, s-maxage=10, stale-while-revalidate=20');
      res.setHeader('Vary','Accept-Encoding');
      return send(res,200,'application/json; charset=utf-8',JSON.stringify(result));
    }
    if(path.startsWith('/api/')) {
      const method=path==='/api/push-config'?'GET':'POST';
      if(req.method!==method) return json(res,405,{message:'Njia hii haikubaliki.'});
      if(method==='POST' && req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site'])) return json(res,403,{message:'Ombi halikuruhusiwa.'});
      if(method==='POST' && req.headers.origin && !["https://jamco-bukoba.vercel.app",'https://'+req.headers.host,...(!process.env.VERCEL?['http://'+req.headers.host]:[])].includes(req.headers.origin)) return json(res,403,{message:'Ombi halikuruhusiwa.'});
      const db=await getDb();
      const data=method==='POST'?await input(req):{};
      const manage=path.startsWith('/api/manage/');
      const result=path.startsWith('/api/social/')?await social(db,req,res,path.slice(12),data):manage?await adminAction(db,req,res,path.slice(12),data):await publicAction(db,req,res,path.slice(5),data);
      if(manage||/\/(?:admin-publish|admin-moderate|admin-instagram-import|admin-instagram-hide|profile|like|comment|comment-edit|comment-delete|comment-like)$/.test(path))clearPublicFeed();
      return json(res,200,result);
    }
    if(!['GET','HEAD'].includes(req.method)) return send(res,405,'text/plain','Method not allowed');
    if(redirects[path]) {
      res.setHeader('Location',redirects[path]);
      return send(res,308,'text/plain','Moved');
    }
    if(path==='/robots.txt') return send(res,200,'text/plain; charset=utf-8','User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: '+origin+'/sitemap.xml\n');
    if(['/','/admin','/gundua','/shiriki','/akaunti','/hifadhi','/arifa'].includes(path)||/^\/habari\/[a-z0-9-]+$/.test(path)) {
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-JAMCO-Release','social-20261122');
      let initial=path==='/gundua'?{category:(query.get('category')||'').slice(0,80),q:(query.get('q')||'').slice(0,100)}:{};
      if(path==='/'){initial.topic=feedTopics.some(t=>t.key===query.get('mada'))?query.get('mada'):'bukoba';initial.qa=process.env.VERCEL_ENV==='preview'&&query.get('qa')==='media';initial.feed=initial.qa?mediaFixture():await publicFeed(await getDb(),req,res,{limit:8,topic:initial.topic});res.setHeader('Cache-Control',initial.qa?'no-store':'public, max-age=0, s-maxage=10, stale-while-revalidate=20');}
      if(path.startsWith('/habari/')){const slug=path.slice(8);const rows=(await (await getDb()).query("SELECT data,kind,live_at FROM jamco_content WHERE slug=$1 AND state='published' AND live_at<=now() AND (NOT(data ? 'expiresAt') OR (data->>'expiresAt')::timestamptz>now())",[slug])).rows;if(!rows[0])return send(res,404,'text/html; charset=utf-8',socialShell(path));initial={post:{title:rows[0].data.title,body:rows[0].data.body||rows[0].data.summary,date:rows[0].data.date,publisher:rows[0].data.publisher,slug}};}
      return send(res,200,'text/html; charset=utf-8',socialShell(path,initial));
    }
    if(path.startsWith('/media/')) {
      const db=await getDb();let file=await media(db,req,path.slice(7));
      if(!file && /^[a-f0-9-]{36}$/.test(path.slice(7))){const u=await member(db,req),staff=await session(db,req);if(u||staff){const row=(await db.query('SELECT mime,data,public,owner FROM jamco_uploads WHERE id=$1',[path.slice(7)])).rows[0];if(row&&(row.owner===u?.id||row.owner===staff?.email||['owner','editor'].includes(staff?.role)||(staff&&(await db.query('SELECT 1 FROM jamco_staff WHERE email=$1 AND permissions @> \'["moderate"]\'::jsonb',[staff.email])).rows.length)))file=row;}}
      if(!file) return send(res,404,'text/plain','File not found');
      if(query.has('w'))file=await transformImage(file,Number(query.get('w')),query.get('format')||'webp');
      res.setHeader('Cache-Control',file.public?'public, max-age=31536000, s-maxage=31536000, immutable':'no-store, private');
      return sendBinary(req,res,file);
    }
    const [items,popular]=await Promise.all([published(),
      path==='/'?getDb().then(db=>db.query("SELECT slug,sum(reads) AS n FROM jamco_reads WHERE day>=current_date-7 GROUP BY slug ORDER BY n DESC,slug LIMIT 10")).then(x=>x.rows.map(r=>r.slug)):[]]);
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    if(path==='/sitemap.xml') {
      const paths=['/','/habari','/picha','/tv','/matukio','/instagram','/kumbukumbu','/biashara','/wasiliana',...items.filter(x=>['story','video','photo'].includes(x.kind)).map(x=>({story:'/habari/',video:'/tv/',photo:'/picha/'}[x.kind]+x.slug))];
      return send(res,200,'application/xml; charset=utf-8','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(url=>'<url><loc>'+origin+esc(url)+'</loc></url>').join('')+'</urlset>');
    }
    const result=page(path,query,items,popular);
    if(!result) return send(res,404,'text/html; charset=utf-8',htmlShell({path,title:'Ukurasa haupatikani',description:'JAMCO Bukoba',noindex:true,content:'<section class="plain-card"><h1>Ukurasa haupatikani</h1><a href="/">Rudi Mwanzo ↗</a></section>'}));
    if(path==='/') res.setHeader('X-JAMCO-Release','newsroom-2026-11');
    return send(res,200,'text/html; charset=utf-8',htmlShell(result));
  } catch(error) {
    if(!(error instanceof ApiError)) console.error('Jamco request failed',error.code||error.name,String(error.message).slice(0,200));
    if(path.startsWith('/api/')) return json(res,error.status||503,{message:error.status?error.message:'Huduma haipatikani kwa sasa. Jaribu tena baadaye.'});
    res.setHeader('Cache-Control','no-store');
    return send(res,503,'text/html; charset=utf-8',htmlShell({path,title:'Huduma inasubiri',description:'JAMCO Bukoba',noindex:true,content:'<section class="plain-card"><h1>Huduma haipatikani kwa sasa</h1><a href="/">Jaribu tena ↗</a></section>'}));
  }
}
