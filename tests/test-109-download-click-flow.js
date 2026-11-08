'use strict';
// Regression for the user-reported bug: clicking Download used to open the
// options menu and then the Download Manager instead of queuing just a video.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
const start=source.indexOf('function initDownloadButton() {');
const end=source.indexOf('// Floating tools and gestures',start);
assert(start>0&&end>start,'Download dock should be self-contained');
const snippet=source.slice(start,end);
class FakeEl{
 constructor(tag='div'){
   this.tagName=tag.toUpperCase();this.children=[];this.events={};this.attrs={};
   this.hidden=false;this.className='';this.id='';this.textContent='';
   const classes=new Set();
   this.classList={
     add:x=>classes.add(x),remove:x=>classes.delete(x),
     toggle:x=>{const on=!classes.has(x);if(on)classes.add(x);else classes.delete(x);return on;},
     contains:x=>classes.has(x)
   };
 }
 append(...args){this.children.push(...args);}
 appendChild(el){this.children.push(el);return el;}
 addEventListener(type,handler){(this.events[type]??=[]).push(handler);}
 setAttribute(key,value){this.attrs[key]=String(value);}
 getAttribute(key){return this.attrs[key];}
 remove(){}
 focus(){}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
}
const body=new FakeEl('body');
const getById=id=>{
  const find=node=>node.id===id?node:node.children.map(find).find(Boolean);
  return find(body)||null;
};
const doc={body,createElement:tag=>new FakeEl(tag),getElementById:getById,events:{},
  addEventListener(type,cb){(this.events[type]??=[]).push(cb);}};
const actions=[],manager=[],toasts=[];
const ipcRenderer={
  invoke:async(channel,args)=>{actions.push({channel,args});return{ok:true};},
  send:channel=>manager.push(channel),
  on:()=>{}
};
let state={showDownloadButton:true,showSigninHelpButton:true,downloadThumbnailOnly:true,toolDownloads:true,videoContainer:'mp4',audioFormat:'mp3'};
const applyState=()=>{
  getById('uyp-dl').hidden=state.showDownloadButton===false;
  getById('tubeium-signin-help').hidden=state.showSigninHelpButton===false;
  getById('tubeium-right-actions').hidden=!state.showDownloadButton&&!state.showSigninHelpButton;
  getById('uyp-dl-manager').hidden=state.toolDownloads===false;
};
const ctx={document:doc,ipcRenderer,state,location:{search:'?v=ABCDEFGHIJK'},
  URLSearchParams,applyState,currentVideoId:()=> 'ABCDEFGHIJK',
  toast:x=>toasts.push(x),setTimeout:()=>0};
vm.runInNewContext(snippet+'\ninitDownloadButton();',ctx);
function click(el){
 assert(el,'Missing action element');
 let prevented=false,stopped=false;
 const event={preventDefault(){prevented=true;},stopPropagation(){stopped=true;},
  stopImmediatePropagation(){stopped=true;}};
 for(const cb of (el.events.click||[]))cb(event);
 return{prevented,stopped};
}
const download=getById('uyp-dl');
const menu=download.children.find(x=>x.className==='uyp-menu');
const actionsBar=download.children.find(x=>x.className==='uyp-download-actions');
const main=actionsBar.children[0],options=actionsBar.children[1];
const managerButton=getById('uyp-dl-manager');
assert(getById('tubeium-right-actions'),'Only one right-side dock');
assert.strictEqual(getById('uyp-dl-left'),null,'No left-side Download widget');
assert.equal(download.hidden,false);
assert.equal(options.getAttribute('aria-controls'),'tubeium-download-options');
(async()=>{
click(main);
assert.equal(actions.length,1,'Primary click queues exactly one video');
assert.equal(actions[0].channel,'download');
assert.equal(actions[0].args.mode,'video');
assert.equal(manager.length,0,'Primary click never opens the manager');
assert.equal(download.classList.contains('open'),false,'Primary click never opens the menu');
// The first click's async IPC must settle before the next user action.
await Promise.resolve();await Promise.resolve();
click(options);
assert.equal(actions.length,1,'Chevron must not queue an extra video');
assert.equal(manager.length,0,'Chevron must not open manager');
assert.equal(download.classList.contains('open'),true,'Chevron opens format menu');
assert.equal(options.getAttribute('aria-expanded'),'true');
click(main);
assert.equal(actions.length,2);
assert.equal(download.classList.contains('open'),false,'Download closes open options without opening manager');
assert.equal(manager.length,0);
click(managerButton);
assert.deepEqual(manager,['open-download-manager'],'Only explicit manager action opens it');
click(getById('tubeium-signin-help'));
assert.deepEqual(manager,['open-download-manager','tubeium-open-signin-help']);
state.showDownloadButton=false;state.showSigninHelpButton=true;applyState();
assert.equal(download.hidden,true);
assert.equal(getById('tubeium-signin-help').hidden,false);
assert.equal(getById('tubeium-right-actions').hidden,false);
state.showDownloadButton=true;state.showSigninHelpButton=false;applyState();
assert.equal(download.hidden,false);
assert.equal(getById('tubeium-signin-help').hidden,true);
state.showDownloadButton=false;applyState();
assert.equal(getById('tubeium-right-actions').hidden,true);
state.toolDownloads=false;applyState();
assert.equal(managerButton.hidden,true);
assert(!source.includes("['downloads','Download manager','↓']"),
  'Remove the redundant floating toolbar download button');
assert.match(source,/if\(managerEntry\)managerEntry\.hidden=state\.toolDownloads===false/);
console.log('PASS: single-click video, isolated More/Manager/Sign-in actions, right-only independently hideable dock');
})().catch(e=>{console.error(e);process.exitCode=1;});
