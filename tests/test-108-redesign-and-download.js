'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/settings.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/settings.css'),'utf8');
const js=fs.readFileSync(path.join(root,'src/settings-renderer.js'),'utf8');
const preload=fs.readFileSync(path.join(root,'src/preload.js'),'utf8');
const main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
const pkg=require('../package.json');
assert.equal(pkg.version,'1.0.8');
assert(pkg.build.files.includes('src/download-folder-migration.js'));
assert.match(html,/<span class="brand-version">1\.08<\/span>/);
for(const key of [
 'navigation','actions-resizer','sidebar-resizer','overview','category-view',
 'settings-list','start-customizing','presets','open-favorites','category-heading',
 'search','overview-search','reset-section','reset-all','go-player','go-downloads',
 'open-download-folder','go-library','check-updates','font-smaller','font-larger',
 'export','import','clear-cache','clear-cookies','backup-all','restore-all'
]){
 assert(html.includes('id="'+key+'"'),key+' must stay accessible and wired');
}
assert.match(js,/\$\('overview-search'\)\.addEventListener\('input'/);
assert.match(js,/\$\('open-download-folder'\)\.onclick=/);
assert.match(css,/\/\* Tubeium Control Room — a complete Settings visual system/);
assert.match(css,/\.hero\{/);
assert.match(css,/\.presets\{/);
assert.match(css,/body\[data-theme="light"\]/);
assert.match(css,/\.setting-row\{/);
assert.match(css,/\.sidebar \.sidebar-bottom\{\s*flex:0 0 var\(--settings-actions-height,370px\)/);
assert.match(css,/\.sidebar-resizer\{\s*position:relative/);
assert.match(css,/flex:0 0 18px;width:18px;min-width:18px/);
assert.match(css,/margin-left:-9px;margin-right:-9px/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(preload,/main\.addEventListener\('click',\(\)=>start\('video'\)\)/,'Video must queue with one click');
assert.match(preload,/options\.addEventListener\('click'/);
assert.match(preload,/options\.setAttribute\('aria-expanded'/);
assert.match(preload,/const actions=document\.createElement\('div'\);actions\.className='uyp-download-actions'/);
assert.match(preload,/\['\s*Video'|\[\['Video', 'video'\]/);
assert.match(preload,/\['Audio', 'audio'\]/);
assert.match(preload,/open-download-manager/);
assert.match(main,/migrateLegacyDownloadFolder\(/);
assert.match(main,/remapDownloadJobPaths\(/);
console.log('PASS: completely redesigned Settings, compatibility IDs, light/dark, one-click download and folder shortcut');
