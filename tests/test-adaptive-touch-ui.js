'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const touch=read('src/touch-mode.js');
function createContext(width=750,points=0){
 const classes=new Set(),listeners=new Map(),queries=new Map();
 const classList={toggle(k,v){if(v)classes.add(k);else classes.delete(k);}};
 const document={documentElement:{classList,dataset:{}},addEventListener:(name,callback)=>listeners.set(name,callback)};
 const window={innerWidth:width,navigator:{maxTouchPoints:points},matchMedia(query){
  if(!queries.has(query))queries.set(query,{matches:false,addEventListener(_,cb){this.change=cb;}});
  return queries.get(query);
 },addEventListener:(name,cb)=>listeners.set('window:'+name,cb)};
 vm.runInNewContext(touch,{window,document});
 return {window,document,classes,listeners,queries};
}
let ctx=createContext(700,2);
assert(ctx.classes.has('tubeium-touch'),'Surface-like devices auto-enable touch mode');
assert(ctx.classes.has('tubeium-touch-compact'),'Narrow tablet windows use compact layout');
ctx.window.innerWidth=1100;ctx.listeners.get('window:resize')();
assert(!ctx.classes.has('tubeium-touch-compact'),'Responsive mode follows resizing');
assert(ctx.classes.has('tubeium-touch'),'Resizing must not remove touch hardware detection');
ctx=createContext(900,0);assert(!ctx.classes.has('tubeium-touch'));
ctx.listeners.get('pointerdown')({pointerType:'mouse'});assert(!ctx.classes.has('tubeium-touch'));
ctx.listeners.get('pointerdown')({pointerType:'pen'});assert(ctx.classes.has('tubeium-touch'));
ctx.queries.get('(pointer: coarse)').change({matches:false});
assert(ctx.classes.has('tubeium-touch'),'Mouse attachment does not revert touch mode');
ctx=createContext(1024,0);
const coarse=ctx.queries.get('(any-pointer: coarse)');coarse.matches=true;coarse.change();
assert(ctx.classes.has('tubeium-touch'),'Media query changes activate touch mode');
const pkg=require('../package.json');
assert(pkg.build.files.includes('src/touch-mode.js'),'Adaptive script must be packaged');
for(const name of ['settings','downloads','library','offline-player','tab-strip','welcome']){
 assert(read('src/'+name+'.html').includes('<script src="touch-mode.js"></script>'),name+' must load touch detector');
 assert(read('src/'+name+'.css').includes('html.tubeium-touch'),name+' must have touch layouts');
}
const preload=read('src/preload.js');
assert.match(preload,/dock\.append\(box\)/,'Only Download goes below the YouTube video');
assert.match(preload,/transport\.append\(previousButton,playButton,nextButton,laterButton,toolsButton\)/);
assert.match(preload,/const fullscreen=!!document\.fullscreenElement/);
assert.match(preload,/dock\.hidden=fullscreen\|\|!videoId\|\|state\.showDownloadButton===false/);
assert.match(preload,/html\.uyp-fs #tubeium-right-actions/,'Fullscreen hides the Download row');
assert.match(preload,/html\.uyp-fs #tubeium-player-transport/,'Fullscreen hides the custom player bar');
assert.match(preload,/html\.uyp-fs #uyp-toolbox/,'Fullscreen hides Tubeium quick tools');
assert.match(preload,/if\(document\.fullscreenElement\)\{/,'Fullscreen re-render never resurrects overlays');
assert.match(preload,/\['watchLater','Save to local Watch Later','◷'\]/,'Desktop player hover tools keep Watch Later available');
assert.match(preload,/getElementById\('tubeium-player-transport'\)\?\.remove\(\)/,'SPA navigation cannot duplicate player transport');
console.log('PASS: tablet/touch detection, compact layout, isolated Download and native-only fullscreen');
