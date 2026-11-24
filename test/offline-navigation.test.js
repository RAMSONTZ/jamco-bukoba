import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const code=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
const base='https://jamco.example';
function worker(){
 const callbacks={},buckets=new Map(),requests=[];
 let connected=true;
 const url=key=>new URL(typeof key==='string'?key:key.url,base).href;
 const caches={
  async open(name){
   if(!buckets.has(name))buckets.set(name,new Map());
   const cache=buckets.get(name);
   return {
    async match(key){return cache.get(url(key))?.clone();},
    async put(key,value){cache.set(url(key),value.clone());},
    async delete(key){cache.delete(url(key));},
    async keys(){return [...cache.keys()].map(key=>new Request(key));},
   };
  },
  async match(key,{cacheName}){return (await this.open(cacheName)).match(key);},
 };
 const network=async (request,options)=>{
  const href=url(request);requests.push({href,credentials:options?.credentials});
  if(!connected)throw new TypeError('offline');
  if(new URL(href).pathname.startsWith('/photos/')){
   return new Response('image bytes',{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=3600'}});
  }
  return new Response('<html>public test page</html>',{headers:{'Content-Type':'text/html'}});
 };
 runInNewContext(code,{
  self:{location:{origin:base},addEventListener(name,fn){callbacks[name]=fn;}},
  caches,fetch:network,URL,Request,Response,Headers,Blob,AbortSignal,
 });
 async function emit(name,props){
  const work=[];
  let reply;
  callbacks[name]({...props,waitUntil(task){work.push(task);},respondWith(response){reply=response;}});
  const response=await reply;
  await Promise.all(work);
  return response;
 }
 return {caches,requests,emit,disconnect(){connected=false;}};
}
test('a warmed public route is reusable and private routes are excluded from prediction',async()=>{
 const app=worker();
 await app.emit('message',{data:{type:'jamco-prefetch-page',url:'/gundua'}});
 await app.emit('message',{data:{type:'jamco-prefetch-page',url:'/akaunti'}});
 await app.emit('message',{data:{type:'jamco-prefetch-page',url:'/admin/mmiliki'}});
 assert.deepEqual(app.requests,[{href:base+'/gundua',credentials:'omit'}]);
 app.disconnect();
 const discover=await app.emit('fetch',{request:{url:base+'/gundua',method:'GET',mode:'navigate'}});
 assert.equal(await discover.text(),'<html>public test page</html>');
 const account=await app.emit('fetch',{request:{url:base+'/akaunti',method:'GET',mode:'navigate'}});
 assert.equal(account.status,503);
});
test('five recently seen pictures have a separate cache after ordinary asset eviction',async()=>{
 const app=worker();
 const urls=Array.from({length:6},(_,i)=>base+'/photos/'+i+'.webp');
 await app.emit('message',{data:{type:'jamco-pin-pictures',urls}});
 await app.emit('message',{data:{type:'jamco-pin-pictures',urls:urls.slice(1)}});
 const pinned=await app.caches.open('jamco-recent-pictures-v1');
 assert.deepEqual((await pinned.keys()).map(key=>key.url),urls.slice(1));
 app.disconnect();
 const picture=await app.emit('fetch',{request:{url:urls[5],method:'GET',destination:'image'}});
 assert.equal(await picture.text(),'image bytes');
});
