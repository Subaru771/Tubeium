'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const preload=read('src/preload.js'),main=read('src/main.js');
const start=preload.indexOf('const TUBEIUM_GESTURE_CONTROLS='),end=preload.indexOf('\nfunction initGestures(){',start);
assert(start>0&&end>start,'Touchscreen gestures must be isolated and testable');
const script=preload.slice(start,end);
let now=1000,current='abcdefghijk',touchMode=true,ads=false,navigations=[],toasts=[],repositions=0;
const documentEvents={},windowEvents={};
const video={style:{transform:'rotate(0deg)',transformOrigin:'top left'},currentTime:100,duration:500,isConnected:true};
const player={querySelector:()=>video,getBoundingClientRect:()=>({left:0,top:0,width:800,height:500})};
const surface={closest(selector){
 if(selector==='.html5-video-player')return player;
 return null;
}};
const blocked={closest(selector){if(selector==='.html5-video-player')return player;return selector.includes('button')?{}:null;}};
const document={addEventListener:(name,fn)=>{documentEvents[name]=fn;}};
const window={addEventListener:(name,fn)=>{windowEvents[name]=fn;}};
const location={pathname:'/watch'};
const state={disableDoubleTapSkip:false};
const DateProxy={now:()=>now};
const context={document,window,location,state,Date:DateProxy,Math,Number,toast:msg=>toasts.push(msg),
  currentVideoId:()=>current,adShowing:()=>ads,positionDownloadDock:()=>repositions++,
  refreshTubeiumPlayerOverlays:()=>repositions++,navigateTubeiumVideo:dir=>navigations.push(dir),
  tubeiumTouchMode:touchMode};
vm.createContext(context);vm.runInContext(script+'\ninitTubeiumPhoneGestures()',context);
const finger=(x,y)=>({clientX:x,clientY:y});
const emit=(name,touches,changedTouches=touches,target=surface)=>{
 const e={target,touches,changedTouches,defaultPrevented:false,
  preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){}};
 documentEvents[name](e);return e;
};
const tap=(x,y,target=surface)=>{
 emit('touchstart',[finger(x,y)],[],target);now+=80;
 return emit('touchend',[],[finger(x,y)],target);
};
// Double tap right/left. Single taps must not seek.
tap(750,200);assert.equal(video.currentTime,100);
now+=150;const forward=tap(744,203);assert.equal(video.currentTime,110);
assert(forward.defaultPrevented,'Second tap should suppress competing native actions');
now+=600;tap(80,200);now+=130;tap(82,203);assert.equal(video.currentTime,100);
state.disableDoubleTapSkip=true;now+=600;tap(745,200);now+=120;tap(747,201);
assert.equal(video.currentTime,100,'Explicit disable flag must be respected');
state.disableDoubleTapSkip=false;
// Horizontal swipe on watch page.
now+=600;emit('touchstart',[finger(730,280)],[]);
now+=120;emit('touchmove',[finger(530,290)]);
const swipe=emit('touchend',[],[finger(530,290)]);
assert(swipe.defaultPrevented);assert.deepEqual(navigations,[1]);
now+=600;emit('touchstart',[finger(120,280)],[]);now+=180;
emit('touchmove',[finger(350,295)]);emit('touchend',[],[finger(350,295)]);
assert.deepEqual(navigations,[1,-1]);
// Shorts swipe up/down.
location.pathname='/shorts/abcdefghijk';now+=600;
emit('touchstart',[finger(400,420)],[]);now+=170;emit('touchmove',[finger(404,240)]);emit('touchend',[],[finger(404,240)]);
assert.deepEqual(navigations,[1,-1,1]);
// Reject interactive UI and non-touch mode.
now+=600;tap(750,200,blocked);now+=150;tap(750,200,blocked);assert.equal(video.currentTime,100);
context.tubeiumTouchMode=false;now+=600;tap(750,200);now+=150;tap(750,200);assert.equal(video.currentTime,100);
context.tubeiumTouchMode=true;location.pathname='/watch';
// Two-finger pinch: preserve original video transform and restore on navigation.
now+=600;emit('touchstart',[finger(280,180)],[]);
emit('touchstart',[finger(280,180),finger(380,180)]);
const pinch=emit('touchmove',[finger(240,180),finger(440,180)]);
assert(pinch.defaultPrevented);
assert.match(video.style.transform,/scale\(2\)/);
emit('touchend',[],[finger(240,180),finger(440,180)]);
documentEvents['yt-navigate-finish']();
assert.equal(video.style.transform,'rotate(0deg)');
assert.equal(video.style.transformOrigin,'top left');
windowEvents.orientationchange();assert.equal(repositions,2);
// Conservative memory changes; do not modify cookies, media, GPU flags or downloader.
assert.match(main,/backgroundThrottling:\s*true/);
const youtubeSwitch=main.slice(main.indexOf('function showYoutubeTab()'),main.indexOf('function closeWelcomeTab()'));
assert.match(youtubeSwitch,/removeChildView\(old\)/);
assert.match(youtubeSwitch,/old\.webContents\.close\(\)/);
assert.doesNotMatch(youtubeSwitch,/browserPairing\.close\(/);
assert.match(preload,/document\.visibilityState==='hidden'/);
assert.match(preload,/document\.addEventListener\('visibilitychange'/);
console.log('PASS: touch seek/swipes/pinch, interactive exclusion, orientation reflow, hidden UI cleanup, pairing retained');
