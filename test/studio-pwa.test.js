import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {socialShell} from '../lib/social-pages.js';
const read=p=>readFile(new URL('../public/'+p,import.meta.url),'utf8');
test('Studio and public PWA identities differ',async()=>{const [studio,publicApp]=await Promise.all(['studio.webmanifest','manifest.webmanifest'].map(async p=>JSON.parse(await read(p))));assert.equal(studio.name,'JAMCO Studio');assert.notEqual(studio.id,publicApp.id);assert.equal(studio.start_url,'/');assert.match(socialShell('/admin/mmiliki',{adminOnly:true}),/href="\/studio.webmanifest"/);assert.match(socialShell('/'),/href="\/manifest.webmanifest"/);assert.doesNotMatch(socialShell('/'),/href="\/studio.webmanifest"/);});
test('Studio worker does not cache authenticated responses',async()=>{const worker=await read('studio-sw.js');assert.doesNotMatch(worker,/caches\.|cache\.put/);assert.match(worker,/Cache-Control':'no-store'/);});

import {shellMarkup} from '../public/studio-shell.js';
import {chartGeometry,filterPosts} from '../public/studio-dashboard.js';
test('studio navigation is grouped, permission-filtered and mobile drawer is compact',()=>{const markup=shellMarkup([['dashboard','Muhtasari'],['compose','Chapisha'],['account','Akaunti']],'dashboard',{displayName:'<owner>',role:'owner'});assert.match(markup,/studio-rail-nav/);assert.match(markup,/studio-dock/);assert.match(markup,/aria-expanded="false"/);assert.match(markup,/aria-controls="studio-navigation"/);assert.doesNotMatch(markup,/data-admin-tab="staff"/);assert.doesNotMatch(markup,/<owner>/);assert.match(markup,/aria-current="page"/);assert.match(socialShell('/admin/mmiliki',{adminOnly:true}),/studio\.css\?v=2/);assert.doesNotMatch(socialShell('/'),/studio\.css/);});
test('chart preserves missing login tracking and actual zero values',()=>{const data=[{day:'2026-11-01',logins:0,views:0},{day:'2026-11-02',logins:2,views:3}];assert.equal(chartGeometry(data,'logins',null).total,null);assert.equal(chartGeometry(data,'logins','2026-11-02').points[0].value,null);assert.equal(chartGeometry(data,'views').total,3);assert.equal(chartGeometry(data,'views').points[0].value,0);});

test('post list search respects state and matches real data',()=>{const rows=[{state:'draft',data:{title:'Bukoba news'}},{state:'published',data:{title:'Bukoba video'}}];assert.equal(filterPosts(rows,'bukoba','draft').length,1);assert.equal(filterPosts(rows,'video','published').length,1);assert.equal(filterPosts(rows,'missing','').length,0)});
