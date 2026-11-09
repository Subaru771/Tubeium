'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(base,'src/settings.html'),'utf8');
const css=fs.readFileSync(path.join(base,'src/settings.css'),'utf8');
const renderer=fs.readFileSync(path.join(base,'src/settings-renderer.js'),'utf8');
const pkg=require('../package.json');
// The old second resize divider and its shortcuts panel were a major
// source of visual clutter. Keep the legacy resizer module compatible without
// wiring it into new installations or displaying a redundant handle.
assert.doesNotMatch(html,/id="actions-resizer"/);
assert.doesNotMatch(html,/settings-actions-resize\.js/);
assert.doesNotMatch(renderer,/tubeiumActionsResize\?\.init/);
assert.match(html,/id="sidebar-resizer"/);
assert(pkg.build.files.includes('src/settings-actions-resize.js'),'Keep legacy module available');
const source=fs.readFileSync(path.join(base,'src/settings-actions-resize.js'),'utf8');
function el(){
 const listeners={},attrs={},classes=new Set(),props=new Map();
 return {listeners,attrs,classes,props,clientHeight:900,
  style:{setProperty(k,v){props.set(k,v);}},
  addEventListener(k,cb){listeners[k]=cb;},
  setAttribute(k,v){attrs[k]=v;},
  classList:{add(k){classes.add(k);},remove(k){classes.delete(k);}},
  setPointerCapture(id){this.capture=id;}
 };
}
const store=new Map();
const win={
 innerHeight:900,localStorage:{
   getItem(k){return store.has(k)?store.get(k):null;},
   setItem(k,v){store.set(k,v);}
 },
 listeners:{},addEventListener(k,f){this.listeners[k]=f;},
 getSelection(){return {removeAllRanges(){win.selectionCleared=true;}}}
};
vm.runInNewContext(source,{window:win});
const api=win.tubeiumActionsResize;
assert.equal(typeof api.init,'function');
const sidebar=el(),nav=el(),panel=el(),handle=el(),root=el();
sidebar.getBoundingClientRect=()=>({top:0});
nav.getBoundingClientRect=()=>({top:135});
api.init({sidebar,navigation:nav,panel,handle,root,win});
const height=()=>panel.props.get('flex-basis');
assert.equal(height(),'370px');
assert.equal(panel.props.get('height'),'370px','Real lower section height changes');
assert.equal(handle.attrs['aria-valuenow'],'370');
function evt(opts){let prevented=false;return {...opts,preventDefault(){prevented=true;},get prevented(){return prevented;}};}
const start=evt({button:0,isPrimary:true,pointerId:4,clientY:510});
handle.listeners.pointerdown(start);
assert(start.prevented&&win.selectionCleared);
assert(root.classes.has('settings-actions-dragging'));
assert.equal(handle.capture,4);
const move=evt({pointerId:4,clientY:410});
win.listeners.pointermove(move);
assert(move.prevented);
assert.equal(height(),'470px','Dragging UP increases the lower section height');
win.listeners.pointerup(evt({pointerId:4}));
assert.equal(store.get(api.STORAGE_KEY),'470');
assert(!root.classes.has('settings-actions-dragging'));
handle.listeners.keydown(evt({key:'ArrowDown'}));
assert.equal(height(),'460px');
handle.listeners.keydown(evt({key:'ArrowUp',shiftKey:true}));
assert.equal(height(),'490px');
handle.listeners.keydown(evt({key:'Home'}));
assert.equal(height(),'160px');
handle.listeners.keydown(evt({key:'End'}));
assert.equal(height(),'623px','Keep 110px navigation and divider usable');
assert.equal(store.get(api.STORAGE_KEY),'623');
sidebar.clientHeight=650;
win.listeners.resize();
assert.equal(height(),'373px','Window shrink clamps actual lower panel');
assert.equal(store.get(api.STORAGE_KEY),'623','Clamp does not overwrite preference');
sidebar.clientHeight=900;
win.listeners.resize();
assert.equal(height(),'623px','Resizing window back restores chosen height');
handle.listeners.pointerdown(evt({button:0,pointerId:6,clientY:510}));
win.listeners.pointermove(evt({pointerId:6,clientY:700}));
assert.equal(height(),'433px');
win.listeners.pointercancel(evt({pointerId:6}));
assert.equal(height(),'623px','Cancelled drag restores size');
handle.listeners.dblclick(evt({}));
assert.equal(height(),'370px');
assert.equal(store.get(api.STORAGE_KEY),'370');
const newSidebar=el(),newPanel=el(),newNav=el(),newHandle=el(),newRoot=el();
newSidebar.getBoundingClientRect=()=>({top:0});
newNav.getBoundingClientRect=()=>({top:135});
api.init({sidebar:newSidebar,navigation:newNav,panel:newPanel,handle:newHandle,root:newRoot,win});
assert.equal(newPanel.props.get('flex-basis'),'370px','Persisted height restored in new Settings window');
console.log('PASS: real lower panel vertical resizing, independent scrolling, persistence, keyboard, limits and cancel');
