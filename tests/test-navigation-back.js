'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8');
const main=read('main.js'),html=read('tab-strip.html'),css=read('tab-strip.css');
const bar=read('tab-strip.js'),bridge=read('tab-strip-preload.js');
const begin=main.indexOf('function tubeiumCanGoBack()');
const end=main.indexOf('function showYoutubeTab()',begin);
assert(begin>0&&end>begin,'Back handlers must exist in main process');
let available=false,steps=0,helpReturns=0,lastState=null;
const history={canGoBack:()=>available,goBack(){steps++;}};
const ctx={
 win:{isDestroyed:()=>false,webContents:{navigationHistory:history}},
 activeTubeiumTab:'youtube',tabMenuOpen:false,helpTabsVisible:false,
 settings:{showSigninHelpButton:true},
 tabBarView:{webContents:{isDestroyed:()=>false,send:(name,state)=>{assert.equal(name,'tubeium-tab-state');lastState=state;}}},
 showYoutubeTab(){helpReturns++;ctx.activeTubeiumTab='youtube';},
 setImmediate:callback=>callback()
};
vm.runInNewContext(main.slice(begin,end),ctx);
assert.equal(ctx.tubeiumCanGoBack(),false);
assert.equal(ctx.tubeiumGoBack(),false,'Home must not navigate when history is empty');
assert.equal(steps,0);
ctx.updateTubeiumTabBar();assert.equal(lastState.canGoBack,false);
available=true;ctx.updateTubeiumTabBar();assert.equal(lastState.canGoBack,true);
assert.equal(ctx.tubeiumGoBack(),true);
assert.equal(steps,1,'Back invokes Electron native navigation history');
ctx.activeTubeiumTab='welcome';available=false;
assert.equal(ctx.tubeiumCanGoBack(),true,'Sign-in Help always permits returning to YouTube');
assert.equal(ctx.tubeiumGoBack(),true);
assert.equal(helpReturns,1);assert.equal(steps,1,'Help Back does not affect YouTube history');
ctx.updateTubeiumTabBar();assert.equal(lastState.canGoBack,false);
assert.match(main,/win\.webContents\.on\('did-navigate-in-page',updateTubeiumTabBar\)/,'YouTube SPA history updates Back state');
assert.match(main,/ipcMain\.on\('tubeium-tab-back',event=>/,'Back IPC must be registered');
assert.match(main,/if\(!trustedTabEvent\(event\)\)return;/,'Native Back IPC validates sender');
assert.match(main,/click: tubeiumGoBack/,'Alt+Left uses same Back logic');
assert.match(bridge,/back:\(\)=>ipcRenderer\.send\('tubeium-tab-back'\)/);
assert.match(bridge,/canGoBack:state\.canGoBack===true/);
for(const id of ['nav-back','compact-back']){
 assert(html.includes('id="'+id+'"'),id+' present in navigation');
 assert(bar.includes("'"+id+"'"),id+' bound to Back');
 assert(html.includes('aria-label="Go back"'),'Back must be accessible to screen readers');
}
assert(css.includes('html.tubeium-touch #compact-back'),'The compact Back button has touch targets');
assert(css.includes('nav .back-button'),'The expanded Back button is visible for mouse users');
console.log('PASS: back navigation works on mouse and touch, disabled at Home, safe in Help, SPA-aware');
