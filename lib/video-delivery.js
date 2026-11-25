import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),run=promisify(execFile);
const bundledEncoder=fileURLToPath(new URL('./vendor/ffmpeg',import.meta.url));
export function encoderPath(){if(process.env.JAMCO_FFMPEG)return process.env.JAMCO_FFMPEG;if(existsSync(bundledEncoder))return bundledEncoder;try{return require('ffmpeg-static')}catch{return null}}
export async function encoderHealth(){const binary=encoderPath();if(!binary)return {ready:false};try{const {stdout}=await run(binary,['-version'],{timeout:4000,maxBuffer:64000});return {ready:true,version:stdout.split('\n')[0].slice(0,140)}}catch{return {ready:false}}}
let table;
export async function videoTable(db){table??=db.query(`CREATE TABLE IF NOT EXISTS jamco_video_playback (id uuid NOT NULL REFERENCES jamco_uploads(id) ON DELETE CASCADE, quality text NOT NULL CHECK(quality IN ('lite','standard')), payload bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id,quality))`).catch(e=>{table=undefined;throw e});return table}
export const qualities={lite:{height:240,rate:'180k',max:'220k',buf:'360k',audio:'40k'},standard:{height:480,rate:'600k',max:'780k',buf:'1200k',audio:'64k'}};
export function encodeArgs(source,output,quality){const q=qualities[quality];return ['-nostdin','-hide_banner','-loglevel','error','-y','-threads','2','-protocol_whitelist','file,pipe','-i',source,'-map','0:v:0','-map','0:a:0?','-map_metadata','-1','-map_chapters','-1','-vf',`scale=w='if(gte(iw,ih),-2,trunc(min(iw,${q.height})/2)*2)':h='if(gte(iw,ih),trunc(min(ih,${q.height})/2)*2,-2)'`,'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-profile:v','baseline','-threads','2','-r','24','-g','48','-b:v',q.rate,'-maxrate',q.max,'-bufsize',q.buf,'-c:a','aac','-ac','1','-b:a',q.audio,'-movflags','+faststart',output]}
export async function playbackCopy(db,id,owner,quality='lite',canManage=false){
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id||'')||!qualities[quality])return {ready:false,reason:'invalid'};
 await videoTable(db);
 const src=(await db.query("SELECT mime,octet_length(data) AS size FROM jamco_uploads WHERE id=$1 AND (owner=$2 OR ($3 AND public)) AND mime LIKE 'video/%'",[id,owner,canManage])).rows[0];
 if(!src)return {ready:false,reason:'not-owned'};
 if((await db.query('SELECT 1 FROM jamco_video_playback WHERE id=$1 AND quality=$2',[id,quality])).rows.length)return {ready:true,quality};
 if(Number(src.size)>100_000_000)return {ready:false,reason:'size'};
 const ffmpeg=encoderPath();if(!ffmpeg)return {ready:false,reason:'encoder-unavailable'};
 const folder=await mkdtemp(join(tmpdir(),'jamco-video-'));try{
 const input=join(folder,'source'),output=join(folder,'play.mp4');
 const raw=(await db.query('SELECT data FROM jamco_uploads WHERE id=$1 AND (owner=$2 OR ($3 AND public))',[id,owner,canManage])).rows[0];await writeFile(input,Buffer.from(raw.data));
 // Whole clip only: timeout returns original fallback, never a silently truncated video.
 await run(ffmpeg,encodeArgs(input,output,quality),{timeout:35000,killSignal:'SIGKILL',maxBuffer:128000});
 const info=await stat(output);if(info.size<32||info.size>50_000_000)return {ready:false,reason:'output-size'};
 const payload=await readFile(output);
 await db.query('INSERT INTO jamco_video_playback(id,quality,payload) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,quality,payload]);
 return {ready:true,quality,bytes:payload.length};
 }catch(e){console.warn('JAMCO playback preparation failed',e.code||e.name);return {ready:false,reason:'processing-limit-or-codec'}}finally{await rm(folder,{recursive:true,force:true})}
}
export async function getPlaybackCopy(db,file,id,quality){if(!qualities[quality]||!file.mime.startsWith('video/'))return null;await videoTable(db);const row=(await db.query('SELECT octet_length(payload) AS size FROM jamco_video_playback WHERE id=$1 AND quality=$2',[id,quality])).rows[0];if(!row)return null;return {...file,mime:'video/mp4',size:Number(row.size),async read(start,length){const part=(await db.query('SELECT substring(payload FROM $3 FOR $4) AS data FROM jamco_video_playback WHERE id=$1 AND quality=$2',[id,quality,start+1,length])).rows[0];return Buffer.from(part?.data||[])}}}
