import {social} from './social.js';
const cache=new Map();
export function publicRequest(req){return {...req,headers:{...req.headers,cookie:''}}}
export function clearPublicFeed(){cache.clear()}
export async function publicFeed(db,req,res,data={}){
 const safe={offset:Math.max(0,Math.min(10000,Number(data.offset)||0)),limit:Math.max(1,Math.min(12,Number(data.limit)||8)),kind:String(data.kind||'').slice(0,12),media:String(data.media||'').slice(0,12),topic:String(data.topic||'').slice(0,20),category:String(data.category||'').slice(0,80),q:String(data.q||'').slice(0,100),slug:String(data.slug||'').slice(0,96)};
 const key=JSON.stringify(safe),hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.promise;
 if(cache.size>=100)cache.delete(cache.keys().next().value);
 const promise=social(db,publicRequest(req),res,'feed',safe).then(result=>safe.slug?result:{
   ...result,posts:result.posts.map(({body,caption,...post})=>{
     const preview=post.summary||body||caption||'';
     return {...post,summary:preview.slice(0,220),hasMore:Boolean(body||caption||preview.length>220)};
   }),
 }).catch(e=>{cache.delete(key);throw e});cache.set(key,{promise,until:Date.now()+1000});return promise;
}
