'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=read('src/main.js'),html=read('src/welcome.html'),preload=read('src/welcome-preload.js'),pkg=require('../package.json');
assert.match(source,/WebContentsView/);
assert.match(source,/view\.webContents\.loadFile\(path\.join\(__dirname,'welcome\.html'\)\)/);
assert.match(source,/if \(!welcomeSender\(event\)\) throw/);
assert.match(source,/Welcome \/ Sign-in Help tab/);
assert.match(read('src/tab-strip.html'),/Sign-in Help/);
assert.match(read('src/tab-strip.html'),/id="hide-tabs"/);
assert.match(read('src/tab-strip.html'),/id="show-tabs"/);
assert.match(read('src/tab-strip-preload.js'),/tubeium-tab-hide/);
assert.match(read('src/tab-strip-preload.js'),/tubeium-tab-show/);
assert.match(read('src/tab-strip.js'),/tubeiumTabs\.hide\(\)/);
assert.match(read('src/tab-strip.js'),/tubeiumTabs\.show\(\)/);
assert.match(source,/ipcMain\.on\('tubeium-tab-hide'/);
assert.match(source,/ipcMain\.on\('tubeium-tab-show'/);
assert.match(source,/setHelpTabsVisible\(false\)/);
assert.match(source,/setHelpTabsVisible\(true\)/);
assert.match(source,/showHelpTabsPreference\(\)/);
assert.match(source,/return !!saved && saved\.showHelpTabs === true/);
assert.doesNotMatch(source,/if \(!helpTabsVisible\) setHelpTabsVisible\(true\)/,
  'Opening help should never force a second full-width bottom tab bar');
assert.match(source,/CmdOrCtrl\+Shift\+G/);
assert.match(source,/Show Sign-in Help tabs/);
assert.match(read('src/welcome.html'),/id="show-tabs"/);
assert.match(read('src/welcome-preload.js'),/welcome-set-tabs-visible/);
assert.match(read('src/welcome-renderer.js'),/setShowTabs\(next\)/);
for(const key of ['youtube','folder','open-browser','copy']){
 assert.match(html,new RegExp('data-action="'+key+'"'));
 assert.match(preload,new RegExp("'"+key+"'"));
}
// Plain, numbered instructions that mention each thing the user must click.
for(const phrase of ['Extensions','Developer mode','Load unpacked','Open Extensions Folder','Open Browser','Transfer sign-in','Ctrl+V','restart automatically'])assert(html.includes(phrase),phrase);
assert.equal((html.match(/<li>/g)||[]).length,3,'exactly three numbered steps');
const steps = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
assert.equal(steps.length, 3);
assert.match(steps[0], /data-action="open-browser"/, 'Open Browser must come first');
assert.match(steps[0], /no account signed in/);
assert.doesNotMatch(html, /data-action="extensions"/, 'Open Extensions button must be removed');
assert.match(steps[1], /brave:\/\/extensions/, 'step 2 tells Brave users how to open Extensions');
assert.match(steps[1], /data-action="folder"/);
assert.match(steps[1], /Developer mode/);
assert.match(steps[2], /sign in/);
assert.match(steps[2], /Transfer sign-in/);

assert.doesNotMatch(html,/data-action="google"|Continue with Google|Open in Chrome|Open in Edge/);
assert.equal((html.match(/class="guide"/g)||[]).length,1);
assert.match(html,/id="status"/);
assert.match(source,/shell\.openPath\(folder\)/,'folder button opens the real extension directory');

// Instructions are a tab, not a window; no auto-open unless the user opted in.
assert.doesNotMatch(source,/new BrowserWindow\(\{\s*parent: win && !win\.isDestroyed\(\) \? win : undefined,\s*width: 700/);
assert.match(source,/if \(showWelcomeOnStartup\(\)\) openWelcomeTab\(\)/);
assert.doesNotMatch(html,/id="on-start"[^>]*checked/);
assert.match(html,/Show this help tab when Tubeium starts/);
const startup=source.slice(source.indexOf('const WELCOME_GUIDE_REVISION'),source.indexOf('function welcomeSender'));
const run=(state)=>vm.runInNewContext(startup+'\nshowWelcomeOnStartup()',{readJson:()=>state,welcomeStatePath:()=>'x'});
assert.equal(run({}),false,'fresh install opens on YouTube');
assert.equal(run(null),false);
assert.equal(run({showOnStartup:true}),false,'values saved by older versions are ignored');
assert.equal(run({showOnStartup:true,lastShownRevision:456}),false);
assert.equal(run({showOnStartup:false,optInRevision:458}),false);
assert.equal(run({showOnStartup:true,optInRevision:458}),true,'explicit opt-in is honoured');

assert.match(read('scripts/BUILD_WINDOWS_EXE.cmd'),/Tubeium-%TUBEIUM_VERSION%-Setup-x64\.exe/);
assert.match(read('scripts/VERIFY_WINDOWS_BUILD.cmd'),/Tubeium-%TUBEIUM_VERSION%-Setup-x64\.exe/);
for(const f of ['welcome.html','welcome.css','welcome-renderer.js','welcome-preload.js','default-browser.js'])assert(pkg.build.files.includes('src/'+f),f);
for(const f of ['signin-guide.html','signin-guide.js','signin-preload.js'])assert(!pkg.build.files.includes(f),f+' removed');
assert(pkg.build.files.includes('src/guide-toggle.js'));
assert.equal(Object.keys(require('../src/settings-schema').DEFAULTS).length,201);
console.log('PASS: simpler three-step sign-in guide, tab preserved, no settings change');
