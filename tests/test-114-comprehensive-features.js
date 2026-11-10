'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const {normalizeYouTubeUrl,parseTubeiumLaunch,parseChecksums,memorySnapshot,compareMemorySnapshots}=require('../src/feature-helpers');
const {assetPaths,fetchVerifiedInstaller}=require('../src/verified-update');
assert.equal(normalizeYouTubeUrl('https://www.youtube.com/watch?v=abcdefghijk'),'https://www.youtube.com/watch?v=abcdefghijk');
assert.equal(normalizeYouTubeUrl('https://youtu.be/abcdefghijk'),'https://www.youtube.com/watch?v=abcdefghijk');
assert.equal(normalizeYouTubeUrl('https://m.youtube.com/shorts/abcdefghijk'),'https://www.youtube.com/shorts/abcdefghijk');
assert.equal(normalizeYouTubeUrl('http://www.youtube.com/watch?v=abcdefghijk'),null);
assert.equal(normalizeYouTubeUrl('https://youtube.com.evil.test/watch?v=abcdefghijk'),null);
assert.equal(normalizeYouTubeUrl('https://youtube.com@evil.test/watch?v=abcdefghijk'),null);
assert.equal(normalizeYouTubeUrl('file:///etc/passwd'),null);
assert.equal(normalizeYouTubeUrl('javascript:alert(1)'),null);
assert.equal(normalizeYouTubeUrl('https://www.youtube.com/watch?v=notvideo'),null);
assert.equal(normalizeYouTubeUrl('https://www.youtube.com/redirect?q=https://evil.test'),null);
const launch='tubeium://open?url='+encodeURIComponent('https://www.youtube.com/watch?v=abcdefghijk');
assert.equal(parseTubeiumLaunch(launch),'https://www.youtube.com/watch?v=abcdefghijk');
assert.equal(parseTubeiumLaunch('tubeium://open/?url='+encodeURIComponent('https://youtu.be/abcdefghijk')),'https://www.youtube.com/watch?v=abcdefghijk');
assert.equal(parseTubeiumLaunch('tubeium://evil?url='+encodeURIComponent('https://youtu.be/abcdefghijk')),null);
assert.equal(parseTubeiumLaunch('tubeium://open?url='+encodeURIComponent('https://evil.test/')),null);
assert.equal(parseTubeiumLaunch('tubeium://open?url='+encodeURIComponent('https://youtu.be/abcdefghijk')+'&url=x'),null);
assert.equal(parseTubeiumLaunch('--no-sandbox'),null);
const metrics=[{type:'Browser',memory:{workingSetSize:150*1024}},{type:'Tab',memory:{workingSetSize:80*1024}},{type:'Tab',memory:{workingSetSize:100*1024}}];
const before=memorySnapshot(metrics,1000),after=memorySnapshot([{type:'Browser',memory:{workingSetSize:140*1024}}],6000);
assert.equal(before.totalMB,330);assert.equal(before.processCount,3);assert.equal(before.byProcessTypeMB.Tab,180);
assert.deepEqual(compareMemorySnapshots(before,after),{baselineMB:330,currentMB:140,deltaMB:-190,baselineProcesses:3,currentProcesses:1,elapsedSeconds:5});
const {createDesktopFeatures}=require('../src/desktop-features');
const preload=fs.readFileSync(path.join(root,'src/preload.js'),'utf8');
const main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
for(const hook of ['tubeium-media-navigator','tubeium-gesture-sensitivity-get','tubeium-sleep-video-ended','tubeiumParseTimestamp','tubeiumTranscriptRows','tubeiumChapterRows','tubeium-gesture-hint']){
 assert(preload.includes(hook),hook+' missing from video page');
}
for(const hook of ['desktopFeatures.menuItems()','desktopFeatures.downloadVerified','desktopFeatures.attach()','desktopFeatures.openLink','desktopFeatures.navigatorTab']){
 assert(main.includes(hook),hook+' not wired in main process');
}
assert.match(preload,/\['Transcript Search','transcript'\]/);
assert.match(preload,/\['Video Chapters','chapters'\]/);
assert.match(main,/second-instance/);
assert.match(fs.readFileSync(path.join(root,'src/desktop-features.js'),'utf8'),/tubeium-gesture-sensitivity/);
const pkg=require('../package.json');
for(const name of ['src/desktop-features.js','src/feature-helpers.js','src/verified-update.js','src/open-in-tubeium-extension/**']){
 assert(pkg.build.files.includes(name),name+' missing from packaged app');
}
const extension=JSON.parse(fs.readFileSync(path.join(root,'src/open-in-tubeium-extension/manifest.json')));
assert.equal(extension.manifest_version,3);
assert.deepEqual(extension.permissions,['contextMenus','activeTab']);
assert(!extension.host_permissions,'The browser link extension must not read page contents');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/release-windows.yml'),'utf8');
assert.match(workflow,/TUBEIUM_CSC_LINK/);assert.match(workflow,/TUBEIUM_RELEASE_APPROVED/);
assert.match(workflow,/Get-AuthenticodeSignature/);
const timeMatch=preload.match(/function tubeiumParseTimestamp\(input\)\{[\s\S]*?\n\}/);
assert(timeMatch);
const vm=require('node:vm'),ctx={};
vm.runInNewContext(timeMatch[0]+'; this.parse=tubeiumParseTimestamp;',ctx);
assert.equal(ctx.parse('1:02'),62);assert.equal(ctx.parse('1:02:03'),3723);
assert.equal(ctx.parse('not time'),null);
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tubeium-release-test-'));
 try{
  const tag='v1.0.14',urls=assetPaths(tag),body=Buffer.from('test installer stream that is NOT an executable');
  const hash=crypto.createHash('sha256').update(body).digest('hex');
  const filename=urls.filename;
  const manifest=hash+'  '+filename+'\n';
  assert.equal(parseChecksums(manifest,filename),hash);
  assert.equal(parseChecksums('broken',filename),null);
  let calls=0;
  const fetcher=async url=>{
   calls++;
   if(url===urls.checksums)return new Response(manifest,{status:200});
   if(url===urls.asset)return new Response(body,{status:200,headers:{'content-length':String(body.length)}});
   throw Error('Unexpected URL');
  };
  const first=await fetchVerifiedInstaller(fetcher,tag,temp);
  assert.equal(first.sha256,hash);assert.equal(first.fromCache,false);
  assert.equal(fs.readFileSync(first.file).toString(),body.toString());
  const second=await fetchVerifiedInstaller(fetcher,tag,temp);
  assert.equal(second.fromCache,true,'Existing verified installer is reused');
  const bogus=async url=>url===urls.checksums?new Response('0'.repeat(64)+'  '+filename):new Response(body);
  await fs.promises.rm(first.file);
  await assert.rejects(fetchVerifiedInstaller(bogus,tag,temp),/SHA-256 verification failed/);
  assert(!fs.existsSync(first.file),'Unverified installer must not remain');
  assert(!fs.readdirSync(temp).some(name=>name.includes('.partial-')),'Incomplete installer files must be deleted');
  assert.throws(()=>assetPaths('v1.0.14/evil'),/Invalid official version/);
  console.log('PASS: safe browser links, gesture/video actions, memory snapshots, signing gate and verified updates');
 }finally{await fs.promises.rm(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
