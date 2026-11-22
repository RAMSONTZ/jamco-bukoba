import {randomUUID} from 'node:crypto';
import {ApiError,sha,audit} from './actions.js';
const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const fail=(status,message)=>{throw new ApiError(status,message)};
export function instagramStatus(){return {connected:Boolean(process.env.INSTAGRAM_ACCESS_TOKEN&&/^\d{1,40}$/.test(process.env.INSTAGRAM_USER_ID||'')&&/^v\d+\.\d+$/.test(process.env.INSTAGRAM_API_VERSION||'')),account:'jamcobukoba2013',permissions:['instagram_business_basic','instagram_business_manage_comments']}}
export function instagramPermalink(value){let u;try{u=new URL(value)}catch{}if(!u||u.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(u.hostname)||!/^\/(?:jamcobukoba2013\/)?(?:p|reel)\/[\w-]+\/?$/.test(u.pathname))fail(400,'Kiungo cha Instagram si halali.');return 'https://www.instagram.com'+u.pathname.replace(/^\/jamcobukoba2013(?=\/)/,'').replace(/\/$/,'')+'/'}
export function allowedInstagramMedia(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(u.hostname.endsWith('.cdninstagram.com')||u.hostname.endsWith('.fbcdn.net'))}catch{return false}}
async function boundedMedia(url,fetchFn,limit){
 for(let n=0;n<3;n++){if(!allowedInstagramMedia(url))throw Error('Media host not permitted');const r=await fetchFn(url,{redirect:'manual',signal:AbortSignal.timeout(5000)});if([301,302,303,307,308].includes(r.status)){url=new URL(r.headers.get('location'),url).href;continue}if(!r.ok||Number(r.headers.get('content-length')||0)>limit)throw Error('Media unavailable or too large');const reader=r.body.getReader(),parts=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('Media too large');parts.push(Buffer.from(value))}}finally{await reader.cancel().catch(()=>{})}return {data:Buffer.concat(parts),mime:r.headers.get('content-type')||''}}
 throw Error('Media redirect limit');
}
export async function importInstagram(db,actor,options={},fetchFn=fetch){
 if(!instagramStatus().connected)fail(503,'Unganisha akaunti rasmi ya Instagram kwenye mipangilio ya seva kwanza.');
 if(options.confirmed!==true)fail(400,'Thibitisha haki za media, ruhusa na ukaguzi wa maoni.');
 const limit=Math.max(1,Math.min(5,Number(options.limit)||3)),count=Math.max(0,Math.min(10,Number.isFinite(Number(options.comments))?Number(options.comments):5));
 const base='https://graph.instagram.com/'+process.env.INSTAGRAM_API_VERSION+'/',token=process.env.INSTAGRAM_ACCESS_TOKEN;
 const graph=async(path,fields,n)=>{if(!/^[\d/]+(?:media|comments)?$/.test(path))throw Error('Invalid API path');const url=new URL(base+path);url.searchParams.set('fields',fields);if(n)url.searchParams.set('limit',String(n));const r=await fetchFn(url.href,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(7000),redirect:'error'});if(!r.ok)fail(502,'Meta haikutoa data. Hakiki ruhusa za akaunti na maoni.');return r.json()};
 const account=await graph(process.env.INSTAGRAM_USER_ID,'id,username');if(account.username?.toLowerCase()!=='jamcobukoba2013')fail(403,'Tokeni lazima iwe ya akaunti rasmi @jamcobukoba2013.');
 const list=await graph(process.env.INSTAGRAM_USER_ID+'/media','id,caption,media_type,permalink,timestamp,username,media_url,thumbnail_url,children{id,media_type,media_url,thumbnail_url}',limit);
 const result={posts:0,comments:0,media:0,skipped:0,warnings:[],published:options.publish===true},deadline=Date.now()+40000;
 for(const item of (list.data||[]).slice(0,limit)){
  if(Date.now()>deadline){result.warnings.push('Baadhi ya machapisho yamebaki kwa sababu ya muda. Jaribu tena.');break}
  if(!/^\d{1,40}$/.test(String(item.id))||!item.timestamp||isNaN(Date.parse(item.timestamp))||item.username&&item.username.toLowerCase()!=='jamcobukoba2013'){result.skipped++;continue}
  let source;try{source=instagramPermalink(item.permalink)}catch{result.skipped++;continue}
  const prev=(await db.query("SELECT * FROM jamco_content WHERE replace(data->>'source','/jamcobukoba2013/','/')=$1 OR slug=$2 LIMIT 1",[source,'ig-'+sha(source).slice(0,18)])).rows[0];
  if(prev?.state==='published'&&options.publish!==true){result.skipped++;continue}
  const slug=prev?.slug||'ig-'+sha(source).slice(0,18),attached=prev?.data.instagramId===item.id?prev.data.media||[]:[],uploads=[];
  let external=[];if(count){try{external=(await graph(item.id+'/comments','id,text,username,timestamp',count)).data||[]}catch{result.warnings.push('Maoni hayakupatikana kwa '+item.id+'. Hakiki instagram_business_manage_comments.')}}
  if(!attached.length){const children=item.media_type==='CAROUSEL_ALBUM'?item.children?.data||[]:[item];
   const received=await Promise.allSettled(children.slice(0,3).map(async child=>{const file=await boundedMedia(child.media_url,fetchFn,child.media_type==='VIDEO'?3*1024*1024:8*1024*1024);const id=randomUUID();if(child.media_type==='VIDEO'){if(file.data.subarray(4,8).toString()!=='ftyp')throw Error('Unsupported video');let poster;if(child.thumbnail_url){try{const p=await boundedMedia(child.thumbnail_url,fetchFn,4*1024*1024),{default:sharp}=await import('sharp'),data=await sharp(p.data,{limitInputPixels:40000000}).rotate().resize({width:768,withoutEnlargement:true}).webp({quality:74}).toBuffer();poster={id:randomUUID(),data,mime:'image/webp'}}catch{}}
    return {id,data:file.data,mime:'video/mp4',type:'video',poster};}
   const {default:sharp}=await import('sharp');const data=await sharp(file.data,{limitInputPixels:40000000,failOn:'error'}).rotate().resize({width:1280,withoutEnlargement:true}).webp({quality:78}).toBuffer();return {id,data,mime:'image/webp',type:'image'};}));
   for(const r of received)if(r.status==='fulfilled'){uploads.push(r.value);attached.push({id:r.value.id,url:'/media/'+r.value.id,type:r.value.type,alt:text(item.caption,180),...(r.value.poster?{posterId:r.value.poster.id,poster:'/media/'+r.value.poster.id}:{})})}else result.warnings.push('Media moja haikupakiwa (ukubwa, format au upatikanaji). Chanzo cha Instagram kimehifadhiwa.');
  }
  const validComments=external.slice(0,count).filter(c=>/^\d{1,40}$/.test(String(c.id))&&text(c.text,2000)&&text(c.username,100)&&!isNaN(Date.parse(c.timestamp)));
  await db.transaction(async tx=>{for(const f of uploads){await tx.query('INSERT INTO jamco_uploads(id,mime,data,owner,public) VALUES($1,$2,$3,$4,$5)',[f.id,f.mime,f.data,actor,options.publish===true]);if(f.poster)await tx.query('INSERT INTO jamco_uploads(id,mime,data,owner,public) VALUES($1,$2,$3,$4,$5)',[f.poster.id,f.poster.mime,f.poster.data,actor,options.publish===true])}
   if(options.publish)for(const m of attached){await tx.query('UPDATE jamco_uploads SET public=true WHERE id=$1',[m.id]);if(m.posterId)await tx.query('UPDATE jamco_uploads SET public=true WHERE id=$1',[m.posterId]);}
   const caption=text(item.caption,15000),data={...(prev?.data||{}),title:prev?.data.title||text(caption.split('\n')[0],180)||'Chapisho la JAMCO · '+item.timestamp.slice(0,10),body:caption,caption,summary:caption.slice(0,650),date:item.timestamp.slice(0,10),publisher:'JAMCO Bukoba',origin:'instagram',source,category:prev?.data.category||'Jamii',contentType:'Habari',media:attached,instagramId:item.id,instagramAccount:'jamcobukoba2013',rights:'Imported from authorized official JAMCO account',reporter:prev?.data.reporter||actor};
   await tx.query("INSERT INTO jamco_content(slug,kind,state,live_at,data) VALUES($1,'story',$2,$3,$4) ON CONFLICT(slug) DO UPDATE SET state=excluded.state,live_at=excluded.live_at,data=excluded.data,updated_at=now()",[slug,options.publish?'published':'review',item.timestamp,data]);
   for(const c of validComments)await tx.query('INSERT INTO jamco_instagram_comments(id,slug,author,body,posted_at,source_url) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET body=excluded.body,author=excluded.author,posted_at=excluded.posted_at',[String(c.id),slug,text(c.username,100),text(c.text,2000),c.timestamp,source]);
   await audit(tx,actor,'instagram.authorized-import',slug+':'+validComments.length);
  });result.posts++;result.comments+=validComments.length;result.media+=uploads.length;
 }
 return {...result,message:`Machapisho ${result.posts}, media ${result.media}, maoni ${result.comments}. ${options.publish?'Yamechapishwa.':'Yanasubiri ukaguzi.'}`};
}
