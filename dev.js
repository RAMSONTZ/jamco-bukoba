import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile,stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import handler from './api/site.js';
import { migrate } from './lib/db.js';

if(!process.env.DATABASE_URL&&!process.env.VERCEL) process.env.JAMCO_LOCAL_DB ||= 'memory://';
if (process.argv.includes('--migrate')) {
  await migrate();
  process.exit(0);
}
if (process.env.JAMCO_LOCAL_DB) await migrate();
const types = {'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const root = resolve('public');
http.createServer(async (req,res) => {
  if(req.url==='/__qa'&&!process.env.VERCEL){res.setHeader('Content-Type','text/html');return res.end(await readFile(new URL('./qa/responsive.html',import.meta.url)));}
  const path = resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
  const file = path.startsWith(root + sep) ? await stat(path).catch(() => null) : null;
  if (file?.isFile()) {
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    return createReadStream(path).pipe(res);
  }
  return handler(req,res);
}).listen(Number(process.env.PORT || (process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:null) || 3000),'0.0.0.0', () => console.log('JAMCO ready'));
