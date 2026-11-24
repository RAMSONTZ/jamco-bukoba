import {readFile} from 'node:fs/promises';
import {mediaFixture} from '../qa/feed-fixture.js';
import {feedTopics} from '../public/feed-topics.js';
import {transformImage} from '../lib/media.js';
import {publicFeed,clearPublicFeed} from '../lib/public-feed.js';
import {social} from '../lib/social.js';
import {today} from '../lib/bukoba-today.js';
import {socialShell} from '../lib/social-pages.js';
import { getDb, published } from '../lib/db.js';
import { adminAction, publicAction, ApiError, media } from '../lib/actions.js';
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

async function sendBinary(req,res,file){
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(res,405,'text/plain','Method not allowed')}
 const data=file.data&&Buffer.from(file.data),size=data?.length??file.size;
 const read=(start,length)=>data?data.subarray(start,start+length):file.read(start,length);
 res.setHeader('Accept-Ranges','bytes');let start=0,end=size-1,status=200;
 if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||!match[1]&&!match[2]){res.setHeader('Content-Range','bytes */'+size);return send(res,416,'text/plain','Range not satisfiable')}
 if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1}else{start=Math.max(0,size-Number(match[2]));end=size-1}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start){res.setHeader('Content-Range','bytes */'+size);return send(res,416,'text/plain','Range not satisfiable')}
 end=Math.min(end,start+2_499_999);
 status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`)}
 if(status===200&&req.method==='GET'&&size>3_000_000){
   res.statusCode=200;res.setHeader('Content-Type',file.mime);res.flushHeaders?.();
   for(let i=0;i<size&&!res.destroyed;i+=1_000_000){
     const part=await read(i,Math.min(1_000_000,size-i));
     if(!res.write(part)) await new Promise(resolve=>{
       const done=()=>{res.removeListener('drain',done);res.removeListener('close',done);resolve()};
       res.once('drain',done);res.once('close',done);
     });
   }
   return res.end();
 }
 res.setHeader('Content-Length',end-start+1);return send(res,status,file.mime,req.method==='HEAD'?'':await read(start,end-start+1));
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
  if(['/admin','/admin/mmiliki'].includes(path))res.setHeader('Permissions-Policy','camera=(), microphone=(self), geolocation=()');
  try {
    if(path==='/offline-shell'&&['GET','HEAD'].includes(req.method)){
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-Robots-Tag','noindex');
      return send(res,200,'text/html; charset=utf-8',socialShell('/',{offline:true}));
    }
    if(path.startsWith('/__qa/')){if(process.env.VERCEL_ENV!=='preview'||path!=='/__qa/media.mp4')return send(res,404,'text/plain','Not found');res.setHeader('Cache-Control','no-store');return sendBinary(req,res,{mime:'video/mp4',data:await readFile(new URL('../qa/video-audio-test.mp4',import.meta.url))})}
    if(path==='/api/today'){
      if(!['GET','HEAD'].includes(req.method))return json(res,405,{message:'Method not allowed'});
      const result=await today(await getDb());
      res.setHeader('Cache-Control','public, max-age=0, s-maxage=15');
      return send(res,200,'application/json; charset=utf-8',JSON.stringify(result));
    }
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
      if(manage||/\/(?:admin-publish|admin-moderate|admin-instagram-import|admin-instagram-hide|admin-comment-approve|admin-comment-hide|profile|like|comment|comment-edit|comment-delete|comment-like)$/.test(path))clearPublicFeed();
      return json(res,200,result);
    }
    if(!['GET','HEAD'].includes(req.method)) return send(res,405,'text/plain','Method not allowed');
    if(redirects[path]) {
      res.setHeader('Location',redirects[path]);
      return send(res,308,'text/plain','Moved');
    }
    if(path==='/robots.txt') return send(res,200,'text/plain; charset=utf-8','User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: '+origin+'/sitemap.xml\n');
    if(['/','/admin','/admin/mmiliki','/admin/wakala','/gundua','/shiriki','/orodha/ombi','/akaunti','/hifadhi','/arifa'].includes(path)||/^\/habari\/[a-z0-9-]+$/.test(path)) {
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-JAMCO-Release','bukoba-20261124-offline');
      let initial=path==='/gundua'?{category:(query.get('category')||'').slice(0,80),q:(query.get('q')||'').slice(0,100)}:{};
      if(path==='/'){initial.topic=feedTopics.some(t=>t.key===query.get('mada'))?query.get('mada'):'bukoba';initial.qa=process.env.VERCEL_ENV==='preview'&&query.get('qa')==='media';if(initial.qa)initial.feed=mediaFixture();else{
        const db=await getDb();
        [initial.feed,initial.today]=await Promise.all([publicFeed(db,req,res,{limit:8,topic:initial.topic}),today(db)]);
      }res.setHeader('Cache-Control',initial.qa?'no-store':'public, max-age=0, s-maxage=10, stale-while-revalidate=20');}
      if(path.startsWith('/habari/')){
        const slug=path.slice(8);
        const result=await publicFeed(await getDb(),req,res,{slug,limit:1});
        if(!result.posts[0])return send(res,404,'text/html; charset=utf-8',socialShell(path));
        initial={post:result.posts[0]};
      }
      return send(res,200,'text/html; charset=utf-8',socialShell(path,initial));
    }
    if(path.startsWith('/media/')) {
      let file=await media(await getDb(),req,path.slice(7));
      if(!file)return send(res,404,'text/plain','File not found');
      if(query.has('w')&&file.mime.startsWith('image/'))file=await transformImage({...file,data:await file.read(0,file.size)},Number(query.get('w')),query.get('format')||'webp');
      res.setHeader('Cache-Control',file.public?'public, max-age=31536000, s-maxage=31536000, immutable':'no-store, private');
      res.setHeader('Content-Disposition','inline');
      return await sendBinary(req,res,file);
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
    if(res.headersSent){res.destroy(error);return;}
    if(!(error instanceof ApiError)) console.error('Jamco request failed',error.code||error.name,String(error.message).slice(0,200));
    if(path.startsWith('/api/')) return json(res,error.status||503,{message:error.status?error.message:'Huduma haipatikani kwa sasa. Jaribu tena baadaye.'});
    res.setHeader('Cache-Control','no-store');
    return send(res,503,'text/html; charset=utf-8',htmlShell({path,title:'Huduma inasubiri',description:'JAMCO Bukoba',noindex:true,content:'<section class="plain-card"><h1>Huduma haipatikani kwa sasa</h1><a href="/">Jaribu tena ↗</a></section>'}));
  }
}
