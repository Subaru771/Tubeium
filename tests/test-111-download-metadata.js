'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {newTask,formatArgs,normalizeQueue}=require('../src/download-queue');
const {cleanTitle,cleanChannel,requestedQuality,applyVerifiedMetadata,fetchPublicVideoMetadata}=require('../src/download-metadata');
const {DEFAULTS}=require('../src/settings-schema');
const source='https://www.youtube.com/watch?v=ABCDEFGHIJK';
const task=newTask(source,'video','video',{title:'My test video - YouTube',channel:'Uploader',settings:DEFAULTS});
assert.equal(task.title,'My test video - YouTube');
assert.equal(task.channel,'Uploader');
assert.equal(task.quality,'Up to 1080p · MP4','Display requested maximum immediately');
assert.equal(task.resolvedQuality,'');
assert.equal(cleanTitle('\n My\tTitle \0x'),'My Title x');
assert.equal(cleanChannel('   A\n Channel '),'A Channel');
assert.equal(cleanTitle('z'.repeat(300)).length,190);
assert.equal(requestedQuality('audio',{audioFormat:'mp3'}),'MP3 audio');
assert.equal(requestedQuality('audio',{audioFormat:'best'}),'Original audio');
assert.equal(requestedQuality('thumbnail',{}),'Thumbnail');
assert.equal(requestedQuality('video',{videoQuality:'best',videoContainer:'mkv'}),'Best available · MKV');
const args=formatArgs(task,DEFAULTS,'C:/Downloads','ffmpeg','C:/archive');
const prints=args.filter((arg,i)=>args[i-1]==='--print');
assert(prints.includes('before_dl:TUBEIUM_META:%(.{title,channel,height,resolution,format_id})j'));
assert(prints.includes('after_move:filepath'));
const verified='TUBEIUM_META:'+JSON.stringify({title:'Actual video title',channel:'Verified channel',height:720,resolution:'1280x720'});
assert.equal(applyVerifiedMetadata(task,verified),true);
assert.equal(task.title,'Actual video title');
assert.equal(task.channel,'Verified channel');
assert.equal(task.resolvedQuality,'720p · MP4','Actual extracted quality must not be mislabeled 1080p');
assert.equal(task.quality,'Up to 1080p · MP4','Original requested cap must stay visible separately');
assert.equal(applyVerifiedMetadata(task,'[download] 8.5%'),false);
assert.equal(applyVerifiedMetadata(task,'TUBEIUM_META:invalid'),true);
const persisted=normalizeQueue({jobs:[task]})[0];
assert.equal(persisted.title,'Actual video title');
assert.equal(persisted.quality,'Up to 1080p · MP4');
assert.equal(persisted.resolvedQuality,'720p · MP4');
assert.equal(persisted.channel,'Verified channel');
const fallback=newTask(source,'video','video',{settings:DEFAULTS});
assert.equal(fallback.title,'Video ABCDEFGHIJK');
const audio=newTask(source,'video','audio',{settings:{audioFormat:'m4a'}});
assert.equal(audio.quality,'M4A audio');
const pkg=require('../package.json');
assert(pkg.build.files.includes('src/download-metadata.js'),'New metadata helper must be bundled');
const main=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
const preload=fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
assert.match(main,/if\(applyVerifiedMetadata\(job,line\)\)/);
assert.match(main,/title:request\?\.title,channel:request\?\.channel/);
assert.match(main,/quality:task\.quality/);
assert.match(preload,/title:safeTitle,channel:String\(channelNode\?\.textContent/);
assert.match(preload,/res\.quality/);
(async()=>{
 let request=null;
 const fetcher=async(url,options)=>{
   request={url,options};
   return{ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({
     provider_name:'YouTube',title:'Verified title from paste link',author_name:'Public channel'
   })};
 };
 const details=await fetchPublicVideoMetadata(source,fetcher);
 assert.deepEqual(details,{title:'Verified title from paste link',channel:'Public channel'});
 assert.equal(request.options.credentials,'omit','Public lookup must never send Google cookies');
 assert.equal(request.options.method,'GET');
 assert(request.url.startsWith('https://www.youtube.com/oembed?format=json&url='));
 assert.equal(await fetchPublicVideoMetadata('https://evil.example/watch?v=ABCDEFGHIJK',fetcher),null);
 assert.equal(await fetchPublicVideoMetadata(source,async()=>{throw new Error('offline');}),null,
   'Offline lookup cannot block the download');
 assert.equal(await fetchPublicVideoMetadata(source,async()=>({
   ok:false,headers:{get:()=>null},text:async()=>''})),null);
 console.log('PASS: immediate requested quality, yt-dlp verified resolution, optional safe public metadata lookup');
})().catch(error=>{console.error(error);process.exitCode=1;});
