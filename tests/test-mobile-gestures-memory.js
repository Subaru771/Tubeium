'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const preload=read('src/preload.js'),main=read('src/main.js');
const start=preload.indexOf('const TUBEIUM_GESTURE_CONTROLS='),end=preload.indexOf('\nfunction initGestures(){',start);
assert(start>0&&end>start,'Touch gestures must remain testable in isolation');
const script=preload.slice(start,end);
let now=1000,id='abcdefghijk',repositions=0;
const nav=[],handlers={},winHandlers={},pending=[],notices=[];
const rect={left:0,top:0,right:800,bottom:500,width:800,height:500};
const video={style:{transform:'rotate(0deg)',transformOrigin:'top left'},currentTime:100,duration:500,isConnected:true,
 getBoundingClientRect:()=>rect};
const player={querySelector:()=>video,getBoundingClientRect:()=>rect};
const surface={closest(selector){return selector==='.html5-video-player'?player:null;}};
const blocked={closest(selector){if(selector==='.html5-video-player')return player;return selector.includes('button')?{}:null;}};
const document={fullscreenElement:null,body:{},addEventListener:(name,handler)=>handlers[name]=handler,
 querySelector(selector){return selector==='.ytp-fullscreen-button'?{click(){document.fullscreenElement=document.fullscreenElement?null:player;}}:null;}};
const window={innerWidth:800,innerHeight:550,addEventListener:(name,fn)=>winHandlers[name]=fn};
const location={pathname:'/watch'},state={disableDoubleTapSkip:false};
const context={document,window,location,state,Math,Number,Date:{now:()=>now},
 currentVideoId:()=>id,adShowing:()=>false,positionDownloadDock:()=>repositions++,
 refreshTubeiumPlayerOverlays:()=>repositions++,navigateTubeiumVideo:dir=>{nav.push(dir);return true;},
 tubeiumTouchMode:true,toast:x=>notices.push(x),
 setTimeout(fn){pending.push(fn);return pending.length;},clearTimeout(){},
 ipcRenderer:{invoke:async()=> 'normal',on(channel,fn){if(channel==='tubeium-gesture-sensitivity')context.setSensitivity=fn;}}};
vm.createContext(context);vm.runInContext(script+'\ninitTubeiumPhoneGestures()',context);
const finger=(x,y)=>({clientX:x,clientY:y});
const emit=(name,touches,changedTouches=touches,target=surface)=>{
 const event={target,touches,changedTouches,cancelable:true,defaultPrevented:false,
  preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){}};
 handlers[name](event);return event;
};
const tap=(x,y,target=surface)=>{
 emit('touchstart',[finger(x,y)],[],target);now+=80;
 return emit('touchend',[],[finger(x,y)],target);
};
const swipe=(x,y,endX,endY,target=surface)=>{
 emit('touchstart',[finger(x,y)],[],target);now+=165;
 emit('touchmove',[finger(endX,endY)],[],target);
 return emit('touchend',[],[finger(endX,endY)],target);
};
const flush=()=>{while(pending.length)pending.shift()();};
tap(725,220);assert.equal(video.currentTime,100,'Single taps must stay native');
now+=140;
const forward=tap(720,222);assert.equal(video.currentTime,110);assert(forward.defaultPrevented);
now+=550;tap(75,220);now+=140;tap(80,222);
assert.equal(video.currentTime,100,'Left double tap rewinds 10 seconds');
now+=550;tap(725,220);video.currentTime+=10;now+=140;tap(720,222);
assert.equal(video.currentTime,110,'Native YouTube seeks must not be doubled');
state.disableDoubleTapSkip=true;now+=550;tap(725,220);now+=140;tap(720,220);
assert.equal(video.currentTime,110,'Double tap disable preference is respected');
state.disableDoubleTapSkip=false;
// Horizontal swipe must not unexpectedly navigate to another video.
now+=550;const horizontal=swipe(710,300,410,308);
assert(!horizontal.defaultPrevented);assert.deepEqual(nav,[]);
assert.equal(document.fullscreenElement,null);
// Mobile-style up/down swipes toggle native fullscreen only when appropriate.
now+=550;const up=swipe(420,410,430,170);
assert(up.defaultPrevented);assert.equal(document.fullscreenElement,player);
now+=550;const down=swipe(420,160,423,410);
assert(down.defaultPrevented);assert.equal(document.fullscreenElement,null);
now+=550;swipe(420,200,450,247);
assert.deepEqual(nav,[],'Incidental movement should never change videos');
// Do not intercept input or navigation through player controls.
now+=550;tap(725,220,blocked);now+=140;tap(720,222,blocked);
assert.equal(video.currentTime,110);
// Let YouTube's own Shorts navigation run before fallback.
location.pathname='/shorts/abcdefghijk';now+=550;swipe(420,430,422,160);
assert.deepEqual(nav,[]);
id='newshort001';flush();assert.deepEqual(nav,[],'No duplicate next after native navigation');
id='abcdefghijk';now+=550;swipe(420,430,422,160);flush();
assert.deepEqual(nav,[1],'Use bounded fallback if YouTube did not navigate');
// Pinch zoom only video, then navigation must restore native transform.
location.pathname='/watch';now+=550;
emit('touchstart',[finger(260,170)],[]);
emit('touchstart',[finger(260,170),finger(360,170)]);
const pinch=emit('touchmove',[finger(220,170),finger(420,170)]);
assert(pinch.defaultPrevented);assert.match(video.style.transform,/scale\(2\)/);
emit('touchend',[],[finger(220,170),finger(420,170)]);
handlers['yt-navigate-finish']();
assert.equal(video.style.transform,'rotate(0deg)');assert.equal(video.style.transformOrigin,'top left');
// Explicit native-only mode and mouse input should leave gestures untouched.
context.setSensitivity(null,'off');
now+=550;swipe(420,410,430,170);assert.equal(document.fullscreenElement,null);
context.tubeiumTouchMode=false;context.setSensitivity(null,'normal');
now+=550;swipe(420,410,430,170);assert.equal(document.fullscreenElement,null);
winHandlers.orientationchange();assert.equal(repositions,2);
assert.match(main,/backgroundThrottling:\s*true/);
const switchCode=main.slice(main.indexOf('function showYoutubeTab()'),main.indexOf('function closeWelcomeTab()'));
assert.match(switchCode,/removeChildView\(old\)/);
assert.doesNotMatch(switchCode,/browserPairing\.close\(/);
assert.match(preload,/document\.visibilityState==='hidden'/);
console.log('PASS: native double tap, fullscreen swipes, Shorts fallback, zoom reset, off/mouse mode, no accidental navigation');
