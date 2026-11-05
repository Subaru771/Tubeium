'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const preload=fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
const schema=require('../src/settings-schema');
const settings=fs.readFileSync(path.join(__dirname,'../src/settings.html'),'utf8');

const fn=preload.match(/function streamQualityLabel\(video\) \{[\s\S]*?\n\}/);
assert(fn,'Stream quality formatter must be present in the preload (no sandboxed local module import)');
const evaluate=value=>vm.runInNewContext(fn[0]+'\nstreamQualityLabel('+JSON.stringify(value)+')');
assert.equal(evaluate({videoWidth:3840,videoHeight:2160}).badge,'4K','UHD 2160p should show the 4K badge');
assert.equal(evaluate({videoWidth:4096,videoHeight:2160}).badge,'4K','Cinema 4K 2160p should show the 4K badge');
assert.equal(evaluate({videoWidth:2560,videoHeight:1440}).badge,'1440p');
assert.equal(evaluate({videoWidth:7680,videoHeight:4320}).badge,'4320p','An 8K stream must not be misidentified as 4K');
assert.equal(evaluate({videoWidth:5120,videoHeight:2880}).badge,'2880p','An ultrawide or 5K stream must not be mislabeled 4K');
assert.equal(evaluate({videoWidth:1920,videoHeight:1080}).badge,'1080p');
assert.equal(evaluate({videoWidth:1280,videoHeight:720}).badge,'720p');
assert.equal(evaluate({videoWidth:854,videoHeight:480}).badge,'480p');
assert.equal(evaluate({videoWidth:1080,videoHeight:2160}).badge,'2160p','Vertical 1080x2160 must not be falsely marketed as 4K landscape');
assert.equal(evaluate({videoWidth:0,videoHeight:0}),null,'Unknown stream resolution should not show 4K');
assert.equal(evaluate(null),null);
assert.equal(evaluate({videoWidth:NaN,videoHeight:2160}),null);

assert.match(preload,/const info=currentVideoId\(\)&&!adShowing\(\)\?streamQualityLabel\(getVideo\(\)\):null/,'Never mislabel adverts or video-free pages');
assert.match(preload,/setInterval\(refreshStreamQualityButton,1500\)/,'Badge must refresh after adaptive quality changes');
assert.match(preload,/qualityButton\.setAttribute\('aria-label',title\)/,'Accessibility must describe actual resolution');
assert.match(preload,/else if\(id==='quality'\) openNativeQualityMenu\(\)/,'Button must open native YouTube quality choices');
assert.match(preload,/button\.tubeium-quality-4k/,'Show a distinct style only for verified 4K');

assert.equal(schema.DEFAULTS.preferredQuality,'auto','Do not silently force 4K for existing users');
assert.equal(schema.metadata.preferredQuality.options.find(x=>x[0]==='hd2160')[0],'hd2160');
assert.equal(schema.metadata.toolQuality.defaultValue,true,'Existing quality toolbar control stays enabled by default');
assert.equal(schema.publicGroups().reduce((n,g)=>n+g.settings.length,0),201,'No surprise changes to the existing 201 settings');
assert(settings.includes('UP TO 4K'),'Hero must not imply every video plays at 4K');
console.log('PASS: accurate 4K playback indicator, dynamic updates, 201 settings preserved, native quality menu');
