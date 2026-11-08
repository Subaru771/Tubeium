'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {DEFAULTS,metadata,publicGroups,normalize}=require('../src/settings-schema');
const read=p=>fs.readFileSync(path.join(__dirname,'..','src',p),'utf8');
const preload=read('preload.js'),main=read('main.js'),html=read('settings.html'),
  css=read('settings.css'),renderer=read('settings-renderer.js');
assert.equal(Object.keys(DEFAULTS).length,201);
assert.equal(publicGroups().length,15);
assert.equal(DEFAULTS.showDownloadButton,true);
assert.equal(DEFAULTS.showSignInHelpButton,true);
assert.equal(metadata.showSignInHelpButton.group,'downloads');
assert(!('downloadPosition' in DEFAULTS),'Previous left-side position no longer supported');
assert(!('downloadPosition' in normalize({downloadPosition:'left'})),'Legacy saved left preference ignored');
assert.match(preload,/#uyp-bottom-dock\{\s*position:fixed;right:22px;bottom:74px;left:auto/);
assert.doesNotMatch(preload,/html\.uyp-dl-left #uyp-dl/);
assert.match(preload,/#uyp-dl\[hidden\]\{display:none!important\}/);
assert.match(preload,/help\.hidden=state\.showSignInHelpButton===false/);
assert.match(preload,/box\.hidden=state\.showDownloadButton===false/);
assert.match(preload,/ipcRenderer\.send\('tubeium-open-signin-help'\)/);
assert.match(preload,/ipcRenderer\.send\('tubeium-hide-floating-action','download'\)/);
assert.match(preload,/ipcRenderer\.send\('tubeium-hide-floating-action','signin'\)/);
assert.match(main,/ipcMain\.on\('tubeium-open-signin-help', e =>/);
assert.match(main,/if \(ytOnly\(e\)\) openWelcomeTab\(\)/);
assert.match(main,/ipcMain\.on\('tubeium-hide-floating-action', \(e, name\) =>/);
assert.match(main,/name === 'download'\) setSettings\(\{showDownloadButton:false\}\)/);
assert.match(main,/name === 'signin'\) setSettings\(\{showSignInHelpButton:false\}\)/);
// Primary click is completely separate from menu toggling and the Download Manager IPC.
const primary=preload.slice(preload.indexOf("  main.addEventListener('click'"),preload.indexOf("  options.addEventListener('click'"));
assert.match(primary,/start\('video'\)/);
assert.match(primary,/event\.preventDefault\(\)/);
assert.match(primary,/event\.stopPropagation\(\)/);
assert.doesNotMatch(primary,/classList\.toggle\('open'\)|open-download-manager/);
const menu=preload.slice(preload.indexOf("  options.addEventListener('click'"),preload.indexOf("  box.appendChild(menu)"));
assert.match(menu,/box\.classList\.toggle\('open'\)/);
assert.doesNotMatch(menu,/start\('video'\)|open-download-manager/);
assert.match(preload,/managerButton\.addEventListener\('click',\(\)=>\{box\.classList\.remove\('open'\);ipcRenderer\.send\('open-download-manager'\)/);
assert.match(preload,/document\.documentElement\.classList\.toggle\('uyp-watch',!!currentVideoId\(\)\)/);
for(const id of ['navigation','sidebar-resizer','actions-resizer','overview','category-view','quick-controls',
  'category-cards','settings-list','inspector-favorites','floating-quick','global-search','search','overview-search',
  'open-favorites','start-customizing','presets','import','export','backup-all','restore-all','reset-all',
  'clear-cache','clear-cookies','go-downloads','open-download-folder']){
  assert(html.includes('id="'+id+'"'),id+' missing from rebuilt Studio');
}
assert.match(css,/\.workspace-columns\{display:grid;grid-template-columns:minmax\(0,1fr\) 245px/);
assert.match(css,/\.settings-panel\{/);
assert.match(renderer,/const panel=el\('details','settings-panel'\)/);
assert.match(renderer,/const region=\$\('floating-quick'\)/);
assert.match(renderer,/\$\('global-search'\)\.oninput=/);
assert.match(renderer,/\$\('inspector-downloads'\)\.onclick=/);
assert.match(renderer,/if\(current==='favorites'\)return/);
assert.match(css,/body\[data-theme="light"\]/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
console.log('PASS: one-click queue only, right-side Download and Sign-in Help, independent dismissal and Studio rebuild');
