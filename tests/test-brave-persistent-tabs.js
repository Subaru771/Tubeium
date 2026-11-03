"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const main=read('src/main.js'),pkg=require('../package.json');
assert.equal(pkg.version,'1.0.0');
for(const f of ['tab-strip.html','tab-strip.css','tab-strip.js','tab-strip-preload.js']){assert(pkg.build.files.includes('src/'+f));assert(fs.existsSync(path.join(root,'src',f)));}
assert(main.includes('const TAB_STRIP_HEIGHT = 42'));
assert(main.includes('openTubeiumTabBar();'));
assert(main.includes("ipcMain.on('tubeium-tab-switch'"));
assert(main.includes("welcomeView.setVisible(false)"));
assert(main.includes("welcomeView.setVisible(true)"));
assert(main.includes("brave: 'BraveSoftware/Brave-Browser/Application/brave.exe'"));
assert(read('src/default-browser.js').includes("brave: 'brave://extensions'"));
assert(main.includes('await openBrowserExecutable(target.exe, args)'));
assert(main.includes('chromiumProfileArgs(target.profile, url)'));
assert(pkg.build.files.includes('src/clean-signin-browser.js'));
assert(pkg.build.files.includes('src/default-browser.js'));
assert.equal(Object.keys(require('../src/settings-schema').DEFAULTS).length,201);
console.log('PASS: Brave detection, extension route, persistent tab strip, 201 settings');
