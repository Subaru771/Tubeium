'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/offline-player.js'),'utf8');
const nodes=new Map(),handlers=new Map(),keys=new Map();let now=1000,index=1,moves=0;
class Element{
 constructor(){this.events=new Map();this.paused=true;this.duration=100;this.currentTime=0;this.checked=false;this.hidden=false;this.attrs={};}
 addEventListener(type,handler){this.events.set(type,handler);}
 setAttribute(key,value){this.attrs[key]=value;}
 removeAttribute(){}load(){}closest(){return null;}
 async play(){this.paused=false;this.events.get('play')?.();}
 pause(){this.paused=true;this.events.get('pause')?.();}
 click(){return this.onclick?.();}
 async requestFullscreen(){document.fullscreenElement=this;}
}
const $=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const state=()=>({url:'file:///safe/'+index+'.mp3',title:'Track '+index,extension:'.mp3',position:index+1,count:3,queueVersion:7,canPrevious:index>0,canNext:index<2,autoplay:false});
const api={init:async()=>state(),external:async()=>true,navigate:async(direction,version)=>{
 assert.equal(version,7);moves++;if(index+direction<0||index+direction>2)return {moved:false,...state()};index+=direction;return {moved:true,...state()};
}};
const document={getElementById:$,addEventListener:(type,fn)=>keys.set(type,fn),exitFullscreen:async()=>{document.fullscreenElement=null;}};
const context={window:{tubeiumOffline:api},document,navigator:{mediaSession:{setActionHandler:(type,handler)=>handlers.set(type,handler)}},MediaMetadata:class{constructor(value){Object.assign(this,value);}},Date:{now:()=>now}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await vm.runInNewContext(source,context);assert.equal($('audio').hidden,false);assert.equal($('video').hidden,true);
 $('previous').click();await tick();assert.equal(index,0);assert.equal($('previous').disabled,true);
 now+=600;await handlers.get('nexttrack')();assert.equal(index,1);
 now+=600;await handlers.get('previoustrack')();assert.equal(index,0);
 await handlers.get('play')();assert.equal($('audio').paused,false);handlers.get('pause')();assert.equal($('audio').paused,true);
 $('audio').currentTime=40;handlers.get('seekbackward')({seekOffset:10});assert.equal($('audio').currentTime,30);
 handlers.get('seekto')({seekTime:500});assert.equal($('audio').currentTime,100);
 $('auto-next').checked=true;$('audio').events.get('ended')();await tick();assert.equal(index,1);assert.equal($('audio').paused,false);
 now+=600;const before=moves;const first=handlers.get('nexttrack')();await handlers.get('nexttrack')();await first;assert.equal(moves,before+1);assert.equal(index,2);assert.equal($('next').disabled,true);
 await $('fullscreen').click();assert.equal(document.fullscreenElement,$('player-shell'));
 $('audio').events.get('error')();assert.equal($('error').hidden,false);assert.match($('status').textContent,/unsupported/);
 now+=600;keys.get('keydown')({key:'MediaTrackPrevious',preventDefault(){},stopImmediatePropagation(){}});await tick();assert.equal(index,1);
 console.log('PASS: offline transport, media-session play/pause/seek/navigation, auto-next and duplicate-command guard');
})().catch(error=>{console.error(error);process.exitCode=1;});
