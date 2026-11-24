import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {socialShell} from '../lib/social-pages.js';
const read=p=>readFile(new URL('../public/'+p,import.meta.url),'utf8');
test('Studio and public PWA identities differ',async()=>{const [studio,publicApp]=await Promise.all(['studio.webmanifest','manifest.webmanifest'].map(async p=>JSON.parse(await read(p))));assert.equal(studio.name,'JAMCO Studio');assert.notEqual(studio.id,publicApp.id);assert.equal(studio.start_url,'/');assert.match(socialShell('/admin/mmiliki',{adminOnly:true}),/href="\/studio.webmanifest"/);assert.match(socialShell('/'),/href="\/manifest.webmanifest"/);assert.doesNotMatch(socialShell('/'),/href="\/studio.webmanifest"/);});
test('Studio worker does not cache authenticated responses',async()=>{const worker=await read('studio-sw.js');assert.doesNotMatch(worker,/caches\.|cache\.put/);assert.match(worker,/Cache-Control':'no-store'/);});
