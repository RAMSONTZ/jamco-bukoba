import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),run=promisify(execFile);
const bundledEncoder=fileURLToPath(new URL('./vendor/ffmpeg',import.meta.url));
export function encoderPath(){if(process.env.JAMCO_FFMPEG)return process.env.JAMCO_FFMPEG;if(existsSync(bundledEncoder))return bundledEncoder;try{return require('ffmpeg-static')}catch{return null}}
export async function encoderHealth(){const binary=encoderPath();if(!binary)return {ready:false};try{const {stdout}=await run(binary,['-version'],{timeout:4000,maxBuffer:64000});return {ready:true,version:stdout.split('\n')[0].slice(0,140)}}catch{return {ready:false}}}
let table;
export async function videoTable(db){table??=db.query(`CREATE TABLE IF NOT EXISTS jamco_video_playback_v2 (id uuid NOT NULL REFERENCES jamco_uploads(id) ON DELETE CASCADE, quality text NOT NULL CHECK(quality IN ('lite','standard')), payload bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id,quality))`).catch(e=>{table=undefined;throw e});return table}
export const qualities={lite:{height:360,crf:'24',max:'850k',buf:'1700k',audio:'96k',preset:'veryfast',profile:'main'},standard:{height:1080,crf:'19',max:'6000k',buf:'12000k',audio:'160k',preset:'veryfast',profile:'high'}};
export function encodeArgs(source,output,quality){const q=qualities[quality];return ['-nostdin','-hide_banner','-loglevel','error','-y','-threads','2','-protocol_whitelist','file,pipe','-i',source,'-map','0:v:0','-map','0:a:0?','-map_metadata','-1','-map_chapters','-1','-vf',`scale=w='if(gte(iw,ih),-2,trunc(min(iw,${q.height})/2)*2)':h='if(gte(iw,ih),trunc(min(ih,${q.height})/2)*2,-2)'`,'-c:v','libx264','-preset',q.preset,'-pix_fmt','yuv420p','-profile:v',q.profile,'-threads','2','-fpsmax','60','-force_key_frames','expr:gte(t,n_forced*2)','-crf',q.crf,'-maxrate',q.max,'-bufsize',q.buf,'-c:a','aac','-ac','2','-b:a',q.audio,'-movflags','+faststart',output]}
export async function playbackCopy(db,id,owner,quality='lite',canManage=false){
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id||'')||(!Object.hasOwn(qualities,quality)&&quality!=='both'))return {ready:false,reason:'invalid'};
 await videoTable(db);
 const src=(await db.query("SELECT mime,octet_length(data) AS size FROM jamco_uploads WHERE id=$1 AND (owner=$2 OR ($3 AND public)) AND mime LIKE 'video/%'",[id,owner,canManage])).rows[0];
 if(!src)return {ready:false,reason:'not-owned'};
 const wanted=quality==='both'?(Number(src.size)<=30_000_000?['standard','lite']:['standard']):[quality];const existing=(await db.query('SELECT quality FROM jamco_video_playback_v2 WHERE id=$1',[id])).rows.map(r=>r.quality);const missing=wanted.filter(q=>!existing.includes(q));if(!missing.length)return {ready:true,quality,qualities:existing};
 if(Number(src.size)>100_000_000)return {ready:false,reason:'size'};
 const ffmpeg=encoderPath();if(!ffmpeg)return {ready:false,reason:'encoder-unavailable'};
 const folder=await mkdtemp(join(tmpdir(),'jamco-video-'));try{
 const input=join(folder,'source'),outputs=missing.map(q=>join(folder,q+'.mp4'));
 const raw=(await db.query('SELECT data FROM jamco_uploads WHERE id=$1 AND (owner=$2 OR ($3 AND public))',[id,owner,canManage])).rows[0];await writeFile(input,Buffer.from(raw.data));
 // Whole clip only: timeout returns original fallback, never a silently truncated video.
 const args=encodeArgs(input,outputs[0],missing[0]);for(let i=1;i<missing.length;i++){const extra=encodeArgs(input,outputs[i],missing[i]);args.push(...extra.slice(extra.indexOf('-map')))}await run(ffmpeg,args,{timeout:35000,killSignal:'SIGKILL',maxBuffer:128000});
 let bytes=0;const made=[];for(let i=0;i<missing.length;i++){const info=await stat(outputs[i]);if(info.size<32||info.size>100_000_000)continue;const payload=await readFile(outputs[i]);await db.query('INSERT INTO jamco_video_playback_v2(id,quality,payload) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,missing[i],payload]);made.push(missing[i]);bytes+=payload.length;}
 const available=[...existing,...made];return {ready:quality==='both'?available.includes('standard'):available.includes(quality),quality,qualities:available,bytes};
 }catch(e){console.warn('JAMCO playback preparation failed',e.code||e.name);return {ready:false,reason:'processing-limit-or-codec'}}finally{await rm(folder,{recursive:true,force:true})}
}
export async function getPlaybackCopy(db,file,id,quality){if(!Object.hasOwn(qualities,quality)||!file.mime.startsWith('video/'))return null;await videoTable(db);const row=(await db.query('SELECT octet_length(payload) AS size FROM jamco_video_playback_v2 WHERE id=$1 AND quality=$2',[id,quality])).rows[0];if(!row)return null;return {...file,mime:'video/mp4',size:Number(row.size),async read(start,length){const part=(await db.query('SELECT substring(payload FROM $3 FOR $4) AS data FROM jamco_video_playback_v2 WHERE id=$1 AND quality=$2',[id,quality,start+1,length])).rows[0];return Buffer.from(part?.data||[])}}}

/* Operator-issued, expiring, single-use jobs. No unauthenticated caller can choose a
 * source, quality or create a job. The database operator authorizes the exact public
 * video in advance; consuming the capability cannot disclose or change private media. */
export async function videoJobTable(db){await db.query(`CREATE TABLE IF NOT EXISTS jamco_video_jobs (
 token_hash text PRIMARY KEY, id uuid NOT NULL REFERENCES jamco_uploads(id) ON DELETE CASCADE,
 quality text NOT NULL CHECK(quality IN ('lite','standard','both')), expires_at timestamptz NOT NULL,
 claimed_at timestamptz, completed_at timestamptz, ready boolean)`)}
export async function runVideoJob(db,token){
 if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 await videoJobTable(db);const hash=createHash('sha256').update(token).digest('hex');
 const claim=(await db.query(`UPDATE jamco_video_jobs j SET claimed_at=now()
 FROM jamco_uploads u WHERE j.token_hash=$1 AND j.claimed_at IS NULL AND j.expires_at>now()
 AND u.id=j.id AND u.public AND u.mime LIKE 'video/%' RETURNING j.id,j.quality,u.owner`,[hash])).rows[0];if(!claim)return null;
 const result=await playbackCopy(db,claim.id,claim.owner,claim.quality,true);
 await db.query('UPDATE jamco_video_jobs SET ready=$2,completed_at=now() WHERE token_hash=$1',[hash,result.ready===true]);
 return {ready:result.ready===true,qualities:result.qualities||[],reason:result.reason||null};
}
