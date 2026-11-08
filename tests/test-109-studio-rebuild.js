'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'src/settings.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/settings.css'),'utf8');
const renderer=fs.readFileSync(path.join(root,'src/settings-renderer.js'),'utf8');
const {DEFAULTS,publicGroups}=require('../src/settings-schema');
assert.equal(Object.keys(DEFAULTS).length,201,'Preserve 201 validated preferences');
assert.equal(publicGroups().length,15);
assert('showSigninHelpButton' in DEFAULTS,'Use the current main branch sign-in help setting');
assert(!('showSignInHelpButton' in DEFAULTS),'No case-mismatched duplicate sign-in option');
assert.match(renderer,/buildQuickToggle\('showSigninHelpButton'/);
assert.match(renderer,/renderInspector\(\)[\s\S]*?buildQuickToggle\('showSigninHelpButton','Sign-in help'/);
assert.match(css,/\/\* Tubeium Workspace v1\.09 — rebuilt from an empty stylesheet/);
assert.match(css,/\.workspace-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css,/\.settings-panel\{/);
assert.doesNotMatch(css,/\.inspector\{/, 'The old permanent inspector column must be removed');
assert.match(css,/\.settings-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css,/body\[data-theme="light"\]/);
assert.doesNotMatch(css,/\.hero\{/,'Old marketing-style hero must actually be replaced');
assert.match(renderer,/const panel=el\('details','settings-panel'\)/);
assert.match(renderer,/const region=\$\('quick-controls'\)/);
assert.match(renderer,/const region=\$\('floating-quick'\)/);
assert.match(renderer,/const sections=\[/);
assert.match(renderer,/nav-section-label/);
assert.match(renderer,/\$\('global-search'\)\.oninput=/);
assert.match(renderer,/\$\('inspector-downloads'\)\.onclick=/);
assert.match(renderer,/star\.onclick=\(\)=>toggleFavorite\(m\.key\)/);
assert.match(renderer,/window\.tubeiumSidebarResize\?\.init/);
assert.match(renderer,/window\.tubeiumActionsResize\?\.init/);
for(const id of ['navigation','sidebar-resizer','actions-resizer','category-cards',
  'inspector-favorites','floating-quick','global-search','overview','category-view',
  'quick-controls','settings-list','reset-section','reset-all','go-player','go-downloads',
  'open-download-folder','go-library','backup-all','restore-all','import','export',
  'open-favorites','presets','search','overview-search','clear-cache','clear-cookies']){
  assert(html.includes('id="'+id+'"'),id+' is missing');
}
assert.match(css,/@media\(max-width:640px\)\{\.sidebar \.actions-resizer\{display:none\}\}/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
console.log('PASS: New task-first Settings workspace, two-column panels, grouped navigation, all controls and resizers retained');
