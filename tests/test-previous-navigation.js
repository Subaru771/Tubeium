'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {PlaybackHistory,videoURL}=require('../src/playback-history');
const source=fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
const history=new PlaybackHistory();
let clicks=0,now=1000,controls=[],ad=false;
const location={href:'https://www.youtube.com/watch?v=aaaaaaaaaaa',pathname:'/watch',search:'?v=aaaaaaaaaaa'};
function context(){
 const ctx={URL,URLSearchParams,location,currentVideoId:()=>new URL(location.href).searchParams.get('v')||'aaaaaaaaaaa',adShowing:()=>ad,getVideo:()=>null,Date:{now:()=>now},toast(){},document:{getElementById:()=>null,querySelectorAll:()=>controls},
 ipcRenderer:{invoke:async(_channel,action,direction)=>{
  history.record(location.href);
  if(action==='move'){const url=history.move(direction);if(url){location.href=url;location.search=new URL(url).search;}}
  return history.state();
 }}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('let tubeiumLastNextAt='),source.indexOf('function initTubeiumMediaKeys()')),ctx);return ctx;
}
(async()=>{
 let ctx=context();history.record(location.href);location.href='https://www.youtube.com/watch?v=bbbbbbbbbbb&utm_source=test';history.record(location.href);ctx.acceptTubeiumHistory(history.state());
 assert.equal(ctx.previousTubeiumVideo(),true);await new Promise(r=>setImmediate(r));assert.equal(location.href,'https://www.youtube.com/watch?v=aaaaaaaaaaa');
 // A new renderer uses the same native in-memory visit list after loadURL.
 ctx=context();ctx.recordTubeiumVisit();await new Promise(r=>setImmediate(r));now+=600;
 assert.equal(ctx.nextTubeiumVideo(),true);await new Promise(r=>setImmediate(r));assert.equal(location.href,'https://www.youtube.com/watch?v=bbbbbbbbbbb');
 now+=600;location.search='?v=bbbbbbbbbbb&list=PL0123456789';assert.equal(ctx.previousTubeiumVideo(),false,'Playlist boundary cannot escape into unrelated history');
 const control={getAttribute:()=>null,closest:()=>null,getBoundingClientRect:()=>({width:44,height:44}),click:()=>clicks++};controls=[control];
 assert.equal(ctx.previousTubeiumVideo(),true);assert.equal(clicks,1);
 now+=600;ad=true;assert.equal(ctx.previousTubeiumVideo(),false);ad=false;control.disabled=true;assert.equal(ctx.nextTubeiumVideo(),false);control.disabled=false;
 location.pathname='/shorts/aaaaaaaaaaa';let selector='';ctx.document.querySelectorAll=value=>{selector=value;return [control];};assert.equal(ctx.previousTubeiumVideo(),true);assert.match(selector,/navigation-button-up/);
 assert.equal(videoURL('https://evil.example/watch?v=ccccccccccc'),null);assert.equal(videoURL('https://www.youtube.com/redirect?v=aaaaaaaaaaa'),null);
 assert.equal(videoURL('https://www.youtube.com/watch?v=aaaaaaaaaaa&utm_source=tracking'),'https://www.youtube.com/watch?v=aaaaaaaaaaa');
 const bounded=new PlaybackHistory();for(let i=0;i<110;i++)bounded.record('https://www.youtube.com/watch?v='+String(i).padStart(11,'0'));
 assert.equal(bounded.state().items.length,100);assert.throws(()=>bounded.move(5));
 console.log('PASS: native visit memory survives renderer reload; Previous respects playlists, Shorts and safe URLs');
})().catch(error=>{console.error(error);process.exitCode=1;});
