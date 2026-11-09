'use strict';
// Exercise the real Windows registry/browser selection functions in a simulated
// environment. Both actions MUST use one clean, isolated browser profile.
const assert = require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const db=require('../src/default-browser'), helper=require('../src/clean-signin-browser');
const source=fs.readFileSync(path.join(__dirname,'..','src/main.js'),'utf8');
const browserCode=source.slice(source.indexOf('function findInstalledBrowser(browser) {'),source.indexOf('// ---- One-time pairing code'));
const EXE={
 brave:'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
 chrome:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 edge:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
 opera:'C:\\Users\\Tester\\AppData\\Local\\Programs\\Opera\\opera.exe',
 firefox:'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
};
const CMD={BraveHTML:`"${EXE.brave}" --single-argument %1`,ChromeHTML:`"${EXE.chrome}" --single-argument %1`,MSEdgeHTM:`"${EXE.edge}" %1`,OperaStable:`"${EXE.opera}" -- "%1"`,FirefoxURL:`"${EXE.firefox}" -osint -url "%1"`};
function scenario({progId,installed,missingCommand=false}){
 const existing=new Set(installed.map(k=>EXE[k].toLowerCase())),launches=[],opened=[];let created=0;
 const spawnSync=(_cmd,args)=>{
  const key=String(args[1]),out=(name,value)=>({stdout:`\r\n${key}\r\n    ${name}    REG_SZ    ${value}\r\n`});
  if(/UserChoice$/i.test(key))return progId&&/\\https\\/i.test(key)?out('ProgId',progId):{stdout:''};
  const m=key.match(/^HKCR\\(.+)\\shell\\open\\command$/i);
  return m&&!missingCommand&&CMD[m[1]]?out('(Default)',CMD[m[1]]):{stdout:''};
 };
 const context={...db,process:{platform:'win32',env:{LOCALAPPDATA:'C:\\Users\\Tester\\AppData\\Local',PROGRAMFILES:'C:\\Program Files','PROGRAMFILES(X86)':'C:\\Program Files (x86)'}},
  path:path.win32,fs:{existsSync:p=>existing.has(String(p).toLowerCase())},spawnSync,
  createCleanProfile:()=>`/tmp/tubeium-clean-${++created}`,chromiumProfileArgs:helper.chromiumProfileArgs,
  spawn:(exe,args)=>{launches.push({exe,args:Array.from(args)});const child=new EventEmitter();child.unref=()=>{};queueMicrotask(()=>child.emit('spawn'));return child;},
  shell:{openExternal:async url=>opened.push(url)},clipboard:{writeText:()=>{}},console,Promise,Array,String,Set};
 vm.createContext(context);vm.runInContext(browserCode,context);
 return {run:expr=>vm.runInContext(expr,context),launches,opened,created:()=>created};
}
const YT='https://www.youtube.com';
(async()=>{
 let s=scenario({progId:'BraveHTML',installed:['brave','chrome','edge']});
 let r=await s.run('openPreferredBrowserExtensions()');
 assert.equal(r.browser,'Brave');assert.equal(s.launches[0].exe,EXE.brave);
 assert(s.launches[0].args.includes('brave://extensions'));
 assert(s.launches[0].args.some(a=>a.startsWith('--user-data-dir=/tmp/tubeium-clean-')));
 r=await s.run('openYouTubeInDefaultBrowser()');
 assert.equal(r.browser,'Brave');assert.equal(s.launches[1].exe,EXE.brave);
 assert(s.launches[1].args.includes(YT));
 assert.equal(s.launches[0].args[0],s.launches[1].args[0],'YouTube and helper must share isolated profile');
 assert.equal(s.created(),1,'do not create separate extension and YouTube profiles');
 assert.equal(s.opened.length,0,'do not launch an already signed-in browser with shell.openExternal');
 assert.match(r.instructions,/starts signed out/);
 // Reversed click order must also share one clean browser profile.
 s=scenario({progId:'BraveHTML',installed:['brave','edge']});
 await s.run('openYouTubeInDefaultBrowser()');await s.run('openPreferredBrowserExtensions()');
 assert.equal(s.created(),1);assert.equal(s.launches[0].args[0],s.launches[1].args[0]);
 // No registry launch command: still use installed *Brave*, never Edge.
 s=scenario({progId:'BraveHTML',installed:['brave','edge'],missingCommand:true});
 await s.run('openYouTubeInDefaultBrowser()');assert.equal(s.launches[0].exe,EXE.brave);
 // Other Chromium browsers can use clean profiles as well.
 s=scenario({progId:'ChromeHTML',installed:['chrome','edge']});
 await s.run('openYouTubeInDefaultBrowser()');assert.equal(s.launches[0].exe,EXE.chrome);
 s=scenario({progId:'MSEdgeHTM',installed:['edge']});
 await s.run('openYouTubeInDefaultBrowser()');assert.equal(s.launches[0].exe,EXE.edge);
 // Firefox cannot run this extension: explain the compatible fallback.
 s=scenario({progId:'FirefoxURL',installed:['firefox','chrome','edge']});
 r=await s.run('openYouTubeInDefaultBrowser()');assert.equal(r.browser,'Chrome');assert.match(r.instructions,/Firefox/);
 assert.equal(s.launches[0].exe,EXE.chrome);
 // No compatible browser must fail closed, not accidentally expose signed-in session.
 s=scenario({progId:'FirefoxURL',installed:['firefox']});
 r=await s.run('openYouTubeInDefaultBrowser()');assert.equal(r.opened,false);assert.equal(s.launches.length,0);assert.equal(s.opened.length,0);
 // The help tab remains available after clicking Go to YouTube.
 const slice=source.slice(source.indexOf('function updateTubeiumTabBar() {'),source.indexOf('function closeWelcomeTab() {'));
 const calls=[];
 const context={welcomeView:{setVisible:v=>calls.push(['visible',v])},activeTubeiumTab:'welcome',helpTabsVisible:true,tabMenuOpen:false,settings:{showSigninHelpButton:true},tabBarView:{webContents:{isDestroyed:()=>false,send:(...a)=>calls.push(['send',...a])}},win:{isDestroyed:()=>false,webContents:{focus:()=>{}}}};
 vm.runInNewContext(slice+'\nshowYoutubeTab()',context);
 assert.equal(context.activeTubeiumTab,'youtube');assert.deepEqual(calls[0],['visible',false]);
 console.log('PASS: fresh signed-out browser profile shared by extensions/YouTube; Brave default retained; no signed-in fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
