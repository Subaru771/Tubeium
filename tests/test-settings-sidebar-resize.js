'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root,'src/settings.html'),'utf8');
const css = fs.readFileSync(path.join(root,'src/settings.css'),'utf8');
const renderer = fs.readFileSync(path.join(root,'src/settings-renderer.js'),'utf8');
const pkg = require('../package.json');

assert.match(html,/id="sidebar-resizer"[^>]*role="separator"[^>]*aria-label="Resize settings sidebar"/);
assert.match(html,/tabindex="0"/);
assert(html.indexOf('settings-sidebar-resize.js') < html.indexOf('settings-renderer.js'));
assert.match(css,/width:var\(--settings-sidebar-width,249px\)/);
assert.match(css,/\.sidebar-resizer\{\s*position:relative/,'Divider must share the flex layout');
assert.match(css,/flex:0 0 18px;width:18px;min-width:18px/);
assert.match(css,/margin-left:-9px;margin-right:-9px/,'Grip must stay centered on the sidebar border');
assert.doesNotMatch(css,/\.sidebar-resizer\{\s*position:absolute/,'Detached divider caused the recording bug');
assert.match(css,/html\.settings-sidebar-dragging,html\.settings-sidebar-dragging \*/);
assert.match(css, /@media\(max-width:640px\)\{[\s\S]*?\.sidebar-resizer\{display:none\}/);
assert.match(renderer,/sidebar: document\.querySelector\('\.sidebar'\)/,'Pass the actual flex child to the resizer');
assert(pkg.build.files.includes('src/settings-sidebar-resize.js'));

const source=fs.readFileSync(path.join(root,'src/settings-sidebar-resize.js'),'utf8');
function el() {
  const listeners={},attrs={},classes=new Set(),props=new Map();
  return {
    listeners,attrs,classes,props,
    style:{setProperty(k,v){props.set(k,v);}},
    addEventListener(type,handler){listeners[type]=handler;},
    setAttribute(k,v){attrs[k]=v;},
    classList:{
      add(name){classes.add(name);},
      remove(name){classes.delete(name);},
      contains(name){return classes.has(name);}
    },
    setPointerCapture(id){this.captured=id;}
  };
}
function event(key,rest={}) {
  let prevented=false;
  return {key,...rest,preventDefault(){prevented=true;},get prevented(){return prevented;}};
}
const store=new Map();
const storage={getItem(k){return store.has(k)?store.get(k):null;},setItem(k,v){store.set(k,v);}};
let selectionCleared=0;
const win={localStorage:storage,innerWidth:1080,listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},getSelection(){return {removeAllRanges(){selectionCleared++;}};}};
vm.runInNewContext(source,{window:win});
const api=win.tubeiumSidebarResize;
assert(api && typeof api.init==='function');

const shell={clientWidth:1100};
const grip=el(),sidebar=el(),documentRoot=el();
api.init({shell,sidebar,handle:grip,root:documentRoot,win});
const width=()=>parseInt(documentRoot.props.get('--settings-sidebar-width'),10);
assert.equal(width(),249);
assert.equal(sidebar.props.get('width'),'249px','Real navigation panel must match divider');
assert.equal(sidebar.props.get('flex-basis'),'249px','Actual flex layout must resize');
assert.equal(grip.attrs['aria-valuenow'],'249');

const down=event(undefined,{button:0,isPrimary:true,pointerId:3,clientX:249});
grip.listeners.pointerdown(down);
assert(down.prevented);
assert.equal(grip.captured,3);
assert(documentRoot.classes.has('settings-sidebar-dragging'),'Block text selection throughout drag');
assert.equal(selectionCleared,1);
const movement=event(undefined,{pointerId:3,clientX:354});
win.listeners.pointermove(movement); // Pointer moves across entire window, not just the divider
assert(movement.prevented);
assert.equal(width(),354);
assert.equal(sidebar.props.get('width'),'354px','The sidebar width must move with the divider');
assert.equal(sidebar.props.get('flex-basis'),'354px');
win.listeners.pointerup(event(undefined,{pointerId:3,type:'pointerup'}));
assert(!documentRoot.classes.has('settings-sidebar-dragging'));
assert.equal(store.get(api.STORAGE_KEY),'354','Persist once drag ends');

const grip2=el(),side2=el(),root2=el();
api.init({shell,sidebar:side2,handle:grip2,root:root2,win});
assert.equal(width(),354); // First init root keeps its own width, see second root below.
assert.equal(side2.props.get('width'),'354px','Reload restores actual sidebar width');
let ev=event('ArrowLeft',{shiftKey:true});
grip2.listeners.keydown(ev);
assert(ev.prevented);
assert.equal(side2.props.get('width'),'324px');
assert.equal(store.get(api.STORAGE_KEY),'324');
grip2.listeners.keydown(event('Home'));
assert.equal(side2.props.get('width'),'205px');
grip2.listeners.keydown(event('End'));
assert.equal(side2.props.get('width'),'480px');

shell.clientWidth=750;
win.listeners.resize();
assert.equal(side2.props.get('width'),'330px');
assert.equal(grip2.attrs['aria-valuemax'],'330');
assert.equal(store.get(api.STORAGE_KEY),'480','Window shrinking must not overwrite saved preference');
shell.clientWidth=1100;
win.listeners.resize();
assert.equal(side2.props.get('width'),'480px');

grip2.listeners.pointerdown(event(undefined,{button:0,isPrimary:true,pointerId:5,clientX:480}));
win.listeners.pointermove(event(undefined,{pointerId:5,clientX:350}));
assert.equal(side2.props.get('width'),'350px');
win.listeners.pointercancel(event(undefined,{pointerId:5,type:'pointercancel'}));
assert.equal(side2.props.get('width'),'480px','Cancelled drag restores previous width');
assert.equal(store.get(api.STORAGE_KEY),'480');

grip2.listeners.dblclick(event('dblclick'));
assert.equal(side2.props.get('width'),'249px');
assert.equal(store.get(api.STORAGE_KEY),'249','Double-click restores original width');

console.log('PASS: real flex sidebar follows divider; no text selection, drag, cancel, keyboard, persistence and window clamps');
