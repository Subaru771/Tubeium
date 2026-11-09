'use strict';
// The native download action must survive all supported video routes, even
// when YouTube's watch metadata/action row is absent or replaced mid-navigation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
const start=source.indexOf('function findTubeiumVisiblePlayer() {');
const end=source.indexOf('// ---- Download button ----',start);
assert(start>0 && end>start);
const snippet=source.slice(start,end);
const classes=new Set();
const dock={
 hidden:false,style:{},parentElement:null,querySelector:()=>null,
 classList:{add(...a){for(const x of a)classes.add(x);},remove(...a){for(const x of a)classes.delete(x);},contains:k=>classes.has(k)}
};
function append(parent,child){child.parentElement=parent;return child;}
const body={appendChild(child){return append(body,child);}};
const action={isConnected:true,closest:()=>null,appendChild(child){return append(action,child);},
 rect:{width:420,height:50,top:700,bottom:750},
 getBoundingClientRect(){return this.rect;}};
const player={rect:{width:970,height:545,top:90,bottom:635,right:980},
 getBoundingClientRect(){return this.rect;}};
const doc={
 body,getElementById:id=>id==='tubeium-right-actions'?dock:null,
 querySelector(selector){
   if(selector.includes('#actions')||selector.includes('#menu'))return showActions?action:null;
   if(selector==='#movie_player')return showPlayer?player:null;
   return null;
 }
};
const location={pathname:'/watch'},window={innerWidth:1400,innerHeight:900},state={showDownloadButton:true};
let id='ABCDEFGHIJK',showActions=false,showPlayer=true;
const positionDownloadDock=new Function('document','location','window','state','currentVideoId',
 snippet+'; return positionDownloadDock;')(doc,location,window,state,()=>id);
positionDownloadDock();
assert.equal(dock.hidden,false);
assert.equal(dock.parentElement,body,'Video action stays available if the metadata row is missing');
assert(classes.has('tubeium-dock-fallback'));
assert.equal(dock.style.top,'106px');
assert.equal(dock.style.left,'813px');
assert.match(source,/#tubeium-right-actions\.tubeium-dock-fallback\{position:fixed;left:0;top:74px;\s*opacity:1;pointer-events:auto/);
showActions=true;positionDownloadDock();
assert.equal(dock.parentElement,action,'Restores the inline action when YouTube loads metadata');
assert(classes.has('tubeium-dock-placed'));
action.rect={width:0,height:0,top:0,bottom:0};positionDownloadDock();
assert.equal(dock.parentElement,body,'Hidden/zero-size action group must not swallow the Download button');
action.rect={width:420,height:50,top:700,bottom:750};
location.pathname='/shorts/ABCDEFGHIJK';showActions=false;positionDownloadDock();
assert.equal(dock.hidden,false,'Shorts always have Download in the player fallback');
assert.equal(dock.parentElement,body);
location.pathname='/live/ABCDEFGHIJK';positionDownloadDock();
assert.equal(dock.hidden,false,'Live video still gets a Download action');
showPlayer=false;positionDownloadDock();
assert.equal(dock.hidden,false,'Metadata and player loading must not hide the video action');
state.showDownloadButton=false;positionDownloadDock();
assert.equal(dock.hidden,false,'Watch Later stays available even when Download is hidden');
state.showDownloadButton=true;id=null;positionDownloadDock();
assert.equal(dock.hidden,true,'Do not show Download on non-video routes');
assert.match(source,/document\.addEventListener\('yt-navigate-finish',updateDock\)/);
assert.match(source,/window\.addEventListener\('popstate',updateDock\)/);
assert.match(source,/setInterval\(updateDock,750\)/);
console.log('PASS: video action dock supports Watch Later on Shorts/live even when Download preference is disabled');
