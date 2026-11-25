import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import sharp from 'sharp';
import {discoveryCategories,transportCategories,discoveryPage,matchesDiscovery} from '../public/discovery.js';
test('all discovery categories have small responsive transparent photographic assets',async()=>{assert.equal(discoveryCategories.length,15);assert.equal(new Set(discoveryCategories.map(c=>c.label)).size,15);let thumbnailBytes=0;const counted=new Set();for(const c of discoveryCategories){assert.equal(c.variants.length,3);for(const v of c.variants){const bytes=await readFile('public'+v.url),m=await sharp(bytes).metadata();assert.equal(m.width,v.width);assert.equal(m.height,v.width);assert.equal(m.hasAlpha,true);if(v.width===160){if(!counted.has(v.url))thumbnailBytes+=bytes.length;counted.add(v.url);const {data}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});assert.equal(data[3],0)}}}assert.ok(thumbnailBytes<110000)});
test('discovery SSR escapes search input and category aliases match relevant records',()=>{const html=discoveryPage('Hoteli','"><script>bad()</script>');assert.equal((discoveryPage().match(/class="category-cutout"/g)||[]).length,15);assert.doesNotMatch(html,/class="category-cutout"/);assert.match(html,/Rudi Gundua/);assert.ok(!html.includes('<script>bad'));assert.ok(matchesDiscovery({kind:'photo',data:{category:'Miundombinu',title:'Uwanja wa ndege'}},'Maendeleo','ndege'));assert.ok(matchesDiscovery({kind:'story',data:{category:'Jamii'}},'Habari'));assert.ok(matchesDiscovery({kind:'listing',data:{category:'Elimu',title:'Shule ya jamii'}},'Elimu','shule'));assert.ok(!matchesDiscovery({kind:'photo',data:{category:'Utalii'}},'Hoteli'));});

test('Gundua features development before the category grid and transport pages remain focused',()=>{
 const root=discoveryPage(),transport=discoveryPage('Usafiri'),driver=discoveryPage('Boda boda');
 assert.doesNotMatch(root,/discover-results/);assert.match(root,/Bukoba Inabadilika/);assert.ok(root.indexOf('development-feature')<root.indexOf('discovery-categories'));assert.ok(matchesDiscovery({kind:'video',data:{category:'Viongozi',title:'Ofisi ya mkoa'}},'Viongozi'));
 assert.deepEqual(transportCategories.map(item=>item.key),['boda-boda','teksi','meli']);
 assert.match(transport,/category=Boda%20boda/);
 assert.match(transport,/category=Teksi/);
 assert.match(transport,/category=Meli/);
 assert.doesNotMatch(transport,/discover-results/);
 assert.match(driver,/Rudi Usafiri/);
 assert.ok(matchesDiscovery({kind:'listing',data:{category:'Boda boda'}},'Boda boda'));
 assert.ok(!matchesDiscovery({kind:'listing',data:{category:'Boda boda'}},'Teksi'));
 assert.ok(matchesDiscovery({slug:'miradi-ya-mji-wa-bukoba',kind:'story',data:{category:'Bukoba'}},'Maendeleo'));
});
