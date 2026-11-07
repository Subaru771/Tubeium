'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const preload=fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
const main=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
const begin=preload.indexOf('function computePlaybackDiagnostics(video, previous, nowMs) {');
const end=preload.indexOf('\nlet diagnosticsPanel=',begin);
assert(begin>0 && end>begin,'Pure statistics helper is defined in sandbox-safe preload');
const fn=vm.runInNewContext(preload.slice(begin,end)+'\ncomputePlaybackDiagnostics');
const video={
 videoWidth:3840,videoHeight:2160,currentTime:10,paused:false,readyState:4,
 buffered:{length:1,start:()=>0,end:()=>25},
 getVideoPlaybackQuality:()=>({totalVideoFrames:1000,droppedVideoFrames:20})
};
const x=fn(video,null,1000);
assert.equal(x.width,3840);
assert.equal(x.height,2160);
assert.equal(x.bufferedSeconds,15);
assert.equal(x.totalFrames,1000);
assert.equal(x.droppedFrames,20);
assert.equal(x.droppedPercent,2);
assert.equal(x.renderedFps,null);
const y=fn({...video,getVideoPlaybackQuality:()=>({totalVideoFrames:1072,droppedVideoFrames:24})},x.sample,2800);
assert.equal(y.renderedFps,null,'Different HTMLVideoElement has no reliable frame delta');
video.getVideoPlaybackQuality=()=>({totalVideoFrames:1090,droppedVideoFrames:24});
const z=fn(video,x.sample,2800);
assert.equal(z.renderedFps,50,'Frame-rate estimate uses the same video, time delta and frame delta');
assert.equal(z.droppedPercent,2.2);
assert.equal(fn(null,null,0),null);
const noCodec={videoWidth:0,videoHeight:0,currentTime:0,paused:true,readyState:0,
 buffered:{length:0},getVideoPlaybackQuality:undefined};
const empty=fn(noCodec,null,0);
assert.equal(empty.totalFrames,null);
assert.equal(empty.renderedFps,null);
assert.equal(empty.bufferedSeconds,0);
const thrown=fn({...noCodec,buffered:{get length(){throw new Error('gone');}},getVideoPlaybackQuality:()=>{throw Error('missing');}},null,0);
assert.equal(thrown.bufferedSeconds,0);
assert.equal(thrown.droppedFrames,null);
assert.match(preload,/const video=currentVideoId\(\)&&!adShowing\(\)\?getVideo\(\):null/);
assert.match(preload,/ipcRenderer\.on\('tubeium-toggle-diagnostics',togglePlaybackDiagnostics\)/);
assert.match(main,/win\.webContents\.send\('tubeium-toggle-diagnostics'\)/);
assert.match(preload,/copy-video-text',diagnosticsText/);
assert.match(preload,/const key=document\.createElement\('span'\)/);
assert.match(preload,/key\.textContent=label/);
assert.match(preload,/val\.textContent=value/,'UI uses textContent, not remote markup');
assert.match(preload,/initPlaybackDiagnostics\(\);/);
assert.match(preload,/data-tool="diagnostics"/);
assert(!preload.includes("require('./playback-diagnostics')"),'Sandboxed preload cannot require a relative module');
console.log('PASS: local playback diagnostics buffering, FPS, dropped frames, copy and accessible UI');
