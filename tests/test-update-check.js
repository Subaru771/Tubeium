'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {LATEST_API_URL,RELEASES_URL,parseVersion,compareVersions,inspectRelease,fetchLatest}=require('../src/update-check');
const src=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../src/settings.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../src/settings.css'),'utf8');
const manifest=require('../package.json');

assert.deepEqual(parseVersion('v1.0.6'),[1,0,6]);
assert.deepEqual(parseVersion('1.0.7'),[1,0,7]);
for(const bad of ['a','v1.0.6-beta','1.0','https://evil.test','v1.0.6/../../../bad',null])assert.equal(parseVersion(bad),null);
assert.equal(compareVersions('v1.0.7','1.0.6'),1);
assert.equal(compareVersions('v1.0.6','1.0.6'),0);
assert.equal(compareVersions('v1.0.5','1.0.6'),-1);
assert.equal(compareVersions('v1.1.0','1.0.99'),1);
assert.equal(compareVersions('v2.0.0','1.99.99'),1);
assert.equal(inspectRelease({tag_name:'v1.0.7'},'1.0.6').status,'available');
assert.equal(inspectRelease({tag_name:'v1.0.6'},'1.0.7').status,'ahead');
assert.equal(inspectRelease({tag_name:'v1.0.6'},'1.0.6').status,'current');
for(const payload of [{tag_name:'v1.0.9',draft:true},{tag_name:'v1.0.9',prerelease:true},{tag_name:'v1.0.8-beta'},{tag_name:'v1.0.8',foo:'bar',draft:true},null]){
 assert.throws(()=>inspectRelease(payload,'1.0.6'));
}
assert.equal(inspectRelease({tag_name:'v1.0.7',html_url:'https://evil.test/download.exe'},'1.0.6').url,RELEASES_URL,'Never open untrusted release links');
assert.equal(LATEST_API_URL,'https://api.github.com/repos/Subaru771/Tubeium/releases/latest');
assert.match(src,/fetchGitHubRelease\(net\.fetch,app\.getVersion\(\)/);
assert.match(src,/if\(settings\.autoCheckUpdates\)setTimeout\(\(\)=>void checkTubeiumUpdates\(false\),12000\)/);
assert.match(src,/if\(!client\)return checkGitHubUpdates\(interactive\)/);
assert.match(src,/shell\.openExternal\(RELEASES_URL\)/);
assert(!src.includes('Automatic releases are not configured yet.'),'Old nonfunctional update message must be removed');
assert(manifest.build.files.includes('src/update-check.js'),'Bundle updater helper in packaged app');
for(const id of ['go-player','go-downloads','go-library','backup-all','restore-all','check-updates']){
 assert.match(html,new RegExp('id="'+id+'" class="outline-full"[^>]*><span class="action-icon" aria-hidden="true">'));
}
assert.match(css,/\.sidebar \.sidebar-bottom \.outline-full \.action-icon\{/);
assert.match(css,/font-size:11px/);
const reply=(body,status=200,headers={})=>({
 ok:status>=200&&status<300,
 status,headers:{get:k=>headers[k]||null},
 text:async()=>body
});
async function run(){
 let called=null;
 const fetchFn=async(url,opts)=>{called={url,opts};return reply(JSON.stringify({tag_name:'v1.0.8',html_url:'https://evil.test'}));};
 const latest=await fetchLatest(fetchFn,'1.0.7');
 assert.equal(latest.status,'available');
 assert.equal(latest.url,RELEASES_URL);
 assert.equal(called.url,LATEST_API_URL);
 assert.equal(called.opts.method,'GET');
 assert(!JSON.stringify(called.opts).includes('Cookie'),'No sign-in tokens sent');
 await assert.rejects(fetchLatest(async()=>reply('{}',403),'1.0.7'),/rate limit/);
 await assert.rejects(fetchLatest(async()=>reply('invalid json'),'1.0.7'),/Invalid response/);
 await assert.rejects(fetchLatest(async()=>reply(JSON.stringify({tag_name:'v1.0.7'}),200,{'content-length':'300000'}),'1.0.7'),/size/);
 await assert.rejects(fetchLatest(async()=>reply('x'.repeat(250001)),'1.0.7'),/size/);
 await assert.rejects(fetchLatest(async()=>reply(JSON.stringify({tag_name:'v1.0.9',prerelease:true})),'1.0.7'),/stable release/);
 console.log('PASS: GitHub release checker, safe fixed link, version comparisons, compact action icons and offline handling');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
