'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root,'src/settings.html'), 'utf8');
const css = fs.readFileSync(path.join(root,'src/settings.css'), 'utf8');
const main = fs.readFileSync(path.join(root,'src/settings-renderer.js'), 'utf8');
const pkg = require('../package.json');

assert.match(html,/id="sidebar-resizer"[^>]*role="separator"[^>]*aria-label="Resize settings sidebar"/);
assert.match(html,/tabindex="0"/);
assert(html.indexOf('settings-sidebar-resize.js') < html.indexOf('settings-renderer.js'), 'Load resizing logic before renderer');
assert.match(css,/width:var\(--settings-sidebar-width,249px\)/);
assert.match(css,/left:calc\(var\(--settings-sidebar-width,249px\) - 6px\)/);
assert.match(css, /@media\(max-width:640px\)\{\.sidebar-resizer\{display:none\}\}/);
assert.match(main,/window\.tubeiumSidebarResize\?\.init/);
assert(pkg.build.files.includes('src/settings-sidebar-resize.js'), 'Packaged build must contain the resize controller');

const source = fs.readFileSync(path.join(root, 'src/settings-sidebar-resize.js'),'utf8');
function element() {
  const listeners = {};
  const attrs = {};
  const classes = new Set();
  return {
    listeners, attrs, classes,
    addEventListener(name, fn) { listeners[name] = fn; },
    setAttribute(name, value) { attrs[name] = value; },
    classList: {add(name){classes.add(name);},remove(name){classes.delete(name);}},
    setPointerCapture(id) {this.captured = id;},
  };
}
function event(key, other={}) {
  let prevented=false;
  return {key, ...other, preventDefault(){prevented=true;}, get prevented(){return prevented;}};
}
const store = new Map();
const storage={getItem(k){return store.has(k)?store.get(k):null;},setItem(k,v){store.set(k,v);}};
const win={localStorage:storage,innerWidth:1080,listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}};
vm.runInNewContext(source,{window:win});
const api=win.tubeiumSidebarResize;
assert(api && typeof api.init==='function');
const shell={clientWidth:1100};
const grip=element();
const style=new Map();
const docRoot={style:{setProperty(k,v){style.set(k,v);}}};
api.init({shell,handle:grip,root:docRoot,win});
const width=()=>Number.parseInt(style.get('--settings-sidebar-width'),10);
assert.equal(width(),249, 'Initial width must match existing layout');
assert.equal(grip.attrs['aria-valuenow'],'249');

grip.listeners.pointerdown(event(undefined,{button:0,isPrimary:true,pointerId:3,clientX:249}));
assert.equal(grip.captured,3,'Capture the pointer during dragging');
grip.listeners.pointermove(event(undefined,{pointerId:3,clientX:354}));
assert.equal(width(),354);
grip.listeners.pointerup(event(undefined,{pointerId:3,type:'pointerup'}));
assert.equal(store.get(api.STORAGE_KEY),'354', 'Persist width on drag end');

const second=element(), root2={style:{setProperty(k,v){style.set(k,v);}}};
api.init({shell,handle:second,root:root2,win});
assert.equal(width(),354,'New settings windows restore saved width');
let ev=event('ArrowLeft',{shiftKey:true});
second.listeners.keydown(ev);
assert(ev.prevented,'Keyboard arrows must prevent browser navigation');
assert.equal(width(),324);
assert.equal(store.get(api.STORAGE_KEY),'324');
second.listeners.keydown(event('Home'));
assert.equal(width(),205);
second.listeners.keydown(event('End'));
assert.equal(width(),480);
assert.equal(store.get(api.STORAGE_KEY),'480');

shell.clientWidth=750;
win.listeners.resize();
assert.equal(width(),330, 'Preserve at least 420px for the content area');
assert.equal(second.attrs['aria-valuemax'],'330');
assert.equal(store.get(api.STORAGE_KEY),'480','Temporary window shrink must not overwrite preferred width');
shell.clientWidth=1100;
win.listeners.resize();
assert.equal(width(),480,'Restore preferred width when window grows');

second.listeners.dblclick();
assert.equal(width(),249);
assert.equal(store.get(api.STORAGE_KEY),'249','Double-click resets and persists the original width');
console.log('PASS: accessible draggable Settings sidebar, persistence, keyboard, reset, responsive width');
