'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const html=read('src/settings.html'),css=read('src/settings.css'),renderer=read('src/settings-renderer.js'),preload=read('src/preload.js'),main=read('src/main.js'),pkg=require('../package.json');
assert.equal(pkg.version,'1.0.9');
assert(pkg.build.files.includes('src/download-folder-migration.js'));
assert.match(html,/<span class="brand-version">1\.09<\/span>/);
for(const id of ['navigation','sidebar-resizer','settings-list','category-heading','reset-section','toggle-advanced','global-search','go-player','go-downloads','open-download-folder','check-updates','import','export','clear-cache','clear-cookies','backup-all','restore-all','reset-all']){
  assert(html.includes('id="'+id+'"'),id+' must stay wired');
}
for(const obsolete of ['overview','actions-resizer','presets','open-favorites','overview-search','font-smaller','font-larger']){
  assert(!html.includes('id="'+obsolete+'"'),obsolete+' clutters the new interface');
}
assert.match(renderer,/const SECTIONS=\[/);
assert.match(renderer,/\{id:'downloads',title:'Downloads'/);
assert.match(renderer,/advanced=!advanced/);
assert.match(css,/\.settings-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css,/body\[data-theme="light"\]/);
assert.match(preload,/function positionDownloadDock\(\)/);
assert.match(preload,/dock\.hidden=state\.showDownloadButton===false \|\| !videoId/);
assert.match(preload,/dock\.classList\.add\('tubeium-dock-fallback','tubeium-dock-active'\)/);
assert.match(preload,/main\.addEventListener\('click',event=>\{[\s\S]*?void start\('video'\)/);
assert.match(preload,/options\.addEventListener\('click'/);
assert.match(preload,/managerButton\.addEventListener\('click'/);
assert.match(main,/migrateLegacyDownloadFolder\(/);
assert.match(main,/remapDownloadJobPaths\(/);
console.log('PASS: simplified Settings, original downloads and migration preserved, visible fallback');
