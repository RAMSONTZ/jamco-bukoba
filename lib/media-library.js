import {optimizeMedia} from './media.js';
// One grid tile/count per attached photo or video. A legacy photo record counts
// once; a story using it only as an illustration does not count it again.
const base=`WITH entries AS (
 SELECT c.slug,c.live_at,c.data->>'title' AS title,
 EXTRACT(YEAR FROM c.live_at AT TIME ZONE 'Africa/Dar_es_Salaam')::int AS year,
 m.item,m.ordinality AS idx
 FROM jamco_content c
 CROSS JOIN LATERAL jsonb_array_elements(
 CASE WHEN jsonb_typeof(c.data->'media')='array' AND jsonb_array_length(c.data->'media')>0 THEN c.data->'media'
 WHEN c.kind='photo' AND coalesce(c.data->>'image','')<>'' THEN jsonb_build_array(jsonb_build_object('type','image','url',c.data->>'image','large',c.data->>'large','alt',c.data->>'title'))
 WHEN c.kind='video' AND c.data->>'embed'='true' AND c.data->>'source' LIKE 'https://%' THEN jsonb_build_array(jsonb_build_object('type','video','external',true,'url',c.data->>'source'))
 ELSE '[]'::jsonb END
 ) WITH ORDINALITY AS m(item,ordinality)
 WHERE c.state='published' AND c.live_at<=now()
 AND c.kind IN ('story','photo','video','event','listing')
 AND (NOT(c.data ? 'expiresAt') OR (c.data->>'expiresAt')::timestamptz>now())
 AND c.data->>'libraryVisible' IS DISTINCT FROM 'false'
 AND m.item->>'type' IN ('image','video') AND coalesce(m.item->>'url','')<>''
 )`;
export async function mediaLibrary(db,d={}){
 const type=['image','video'].includes(d.type)?d.type:'';
 const year=/^\d{4}$/.test(String(d.year||''))?Number(d.year):null;
 const limit=Math.min(36,Math.max(1,Math.trunc(Number(d.limit)||24)));
 let cursor=null;
 if(d.cursor&&typeof d.cursor==='string'&&d.cursor.length<600){try{const v=JSON.parse(Buffer.from(d.cursor,'base64url').toString());if(Array.isArray(v)&&v.length===3&&Number.isFinite(Date.parse(v[0]))&&/^[a-z0-9-]{1,96}$/.test(v[1])&&Number.isInteger(v[2])&&v[2]>0)cursor=v}catch{}}
 const counts=(await db.query(base+` SELECT count(*) FILTER(WHERE item->>'type'='image')::int AS images,count(*) FILTER(WHERE item->>'type'='video')::int AS videos,coalesce(array_agg(DISTINCT year ORDER BY year DESC),'{}') AS years FROM entries`)).rows[0];
 const result=(await db.query(base+` SELECT slug,title,year,live_at::text AS live,idx,item FROM entries
 WHERE ($1='' OR item->>'type'=$1) AND ($2::int IS NULL OR year=$2)
 AND ($3::timestamptz IS NULL OR (live_at,slug,idx)<($3::timestamptz,$4::text,$5::bigint))
 ORDER BY live_at DESC,slug DESC,idx DESC LIMIT $6`,[type,year,cursor?.[0]||null,cursor?.[1]||null,cursor?.[2]||null,limit+1])).rows;
 const rows=result.slice(0,limit),last=rows.at(-1);
 return {images:counts.images,videos:counts.videos,years:counts.years,items:rows.map(r=>{
 const m=optimizeMedia(r.item);
 return {slug:r.slug,title:r.title,year:r.year,index:Number(r.idx),type:m.type,thumbnail:m.type==='image'?(m.thumbnail||m.url):m.poster||'',duration:Number.isFinite(m.duration)?m.duration:null,external:m.external===true};
 }),next:result.length>limit&&last?Buffer.from(JSON.stringify([last.live,last.slug,Number(last.idx)])).toString('base64url'):null};
}
