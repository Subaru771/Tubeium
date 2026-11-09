'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
const start=source.indexOf('const TUBEIUM_VIDEO_ID=');
const end=source.indexOf('const FLAGS',start);
assert(start>0&&end>start,'Home-card quick actions are present in sandbox preload');
const snippet=source.slice(start,end);
class Node {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};
 this.attrs={};this.dataset={};this.hidden=false;this.disabled=false;this.textContent='';
 const cs=new Set();this.classList={add:x=>cs.add(x),contains:x=>cs.has(x)};}
 append(...nodes){nodes.forEach(n=>this.appendChild(n));}
 appendChild(node){node.parent=this;this.children.push(node);return node;}
 remove(){if(!this.parent)return;this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){this.handlers[k]=fn;}
 getAttribute(k){return this.attrs[k]||null;}
 querySelector(selector){
   if(selector===':scope > .tubeium-card-actions')return this.children.find(x=>x.className==='tubeium-card-actions')||null;
   if(selector==='[data-action="download"]')return this.children.find(x=>x.dataset.action==='download')||null;
   if(selector==='ytd-thumbnail')return this.thumbnail||null;
   if(selector.startsWith('#video-title'))return this.titleNode||null;
   if(selector.startsWith('ytd-channel-name'))return this.channelNode||null;
   return null;
 }
 closest(){return null;}
 querySelectorAll(selector){if(selector==='a[href]')return [this.link];return [];}
}
const host=new Node('ytd-thumbnail');
const card=new Node('ytd-rich-grid-media');card.thumbnail=host;
const link={href:'/watch?v=ABCDEFGHIJK',getAttribute(k){return k==='href'?this.href:null;}};
card.link=link;
card.titleNode={getAttribute:()=> 'Home video title'};
card.channelNode={textContent:'Video channel'};
const doc={body:new Node('body'),createElement:tag=>new Node(tag),
 querySelectorAll(selector){return selector.includes('ytd-rich-grid-media')?[card]:[];}};
const calls=[],toasts=[];
const ipcRenderer={invoke:async(channel,record)=>{
 calls.push({channel,record});return channel==='download'
 ?{ok:true,title:record.title,quality:'Up to 1080p · MP4'}
 :{watchLater:true,id:record.id};
}};
const state={showDownloadButton:true},location={origin:'https://www.youtube.com'};
const ctx={document:doc,location,window:{},ipcRenderer,state,toast:t=>toasts.push(t),
 URL,MutationObserver:undefined,setTimeout:cb=>{cb();return 1;},setInterval:()=>1};
const api=vm.runInNewContext(snippet+'\n({tubeiumVideoIdFromHref,tubeiumCardRecord,tubeiumInstallCardActions})',ctx);
assert.equal(api.tubeiumVideoIdFromHref('/watch?v=ABCDEFGHIJK'),'ABCDEFGHIJK');
assert.equal(api.tubeiumVideoIdFromHref('/shorts/ABCDEFGHIJK'),'ABCDEFGHIJK');
assert.equal(api.tubeiumVideoIdFromHref('/live/ABCDEFGHIJK'),'ABCDEFGHIJK');
assert.equal(api.tubeiumVideoIdFromHref('/playlist?list=PL123'),null);
assert.equal(api.tubeiumVideoIdFromHref('https://evil.invalid/watch?v=ABCDEFGHIJK'),null);
assert.equal(api.tubeiumVideoIdFromHref('/watch?v=../invalid'),null);
assert.equal(api.tubeiumCardRecord(card).title,'Home video title');
api.tubeiumInstallCardActions();
let row=host.children[0];
assert(row,'Video thumbnail must get quick action row');
assert.equal(host.children.length,1);
assert.equal(row.children.length,2);
const [download,later]=row.children;
assert.equal(download.textContent,'↓ Download');
assert.equal(later.textContent,'◷ Watch Later');
let stopped=0;
const event={preventDefault(){stopped++;},stopImmediatePropagation(){stopped++;},stopPropagation(){stopped++;}};
async function run(){
 download.handlers.click(event);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(stopped,3,'Click must not navigate to video or trigger parent YouTube buttons');
 assert.equal(calls[0].channel,'download');
 assert.equal(calls[0].record.id,'ABCDEFGHIJK');
 assert.equal(calls[0].record.title,'Home video title');
 assert.equal(download.textContent,'✓ Queued');
 assert(download.disabled,'A repeated click should not create duplicate queued jobs');
 download.handlers.click(event);
 assert.equal(calls.length,1,'Duplicate Home download must be suppressed');
 later.handlers.click(event);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls[1].channel,'library-watch-later');
 assert.equal(calls[1].record.channel,'Video channel');
 assert.equal(later.textContent,'✓ Saved');
 assert.equal(later.dataset.saved,'true');
 api.tubeiumInstallCardActions();
 assert.equal(host.children.length,1,'Re-render must not duplicate buttons');
 state.showDownloadButton=false;api.tubeiumInstallCardActions();
 assert.equal(download.hidden,true,'Hide Download preference respected without hiding Watch Later');
 assert.equal(later.hidden,false);
 link.href='/watch?v=ZXCVBNMasdf';api.tubeiumInstallCardActions();
 assert.equal(host.children.length,1,'Virtualized thumbnail replaces rather than stacks actions');
 assert.equal(host.children[0].dataset.videoId,'ZXCVBNMasdf');
 link.href='/playlist?list=PL123';api.tubeiumInstallCardActions();
 assert.equal(host.children.length,0,'Never add a video action to playlist-only entries');
 assert.match(source,/initTubeiumCardActions\(\)/);
 assert.match(source,/document\.addEventListener\('yt-navigate-finish',update\)/);
 console.log('PASS: Home quick Download/Watch Later, no duplicate jobs, no click-through, dynamic cards');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
