'use strict';
// Offline static release audit: no network access, credentials or user data.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const required = [
  'package.json', 'src/main.js', 'src/preload.js', 'src/settings-schema.js',
  'src/settings.html', 'src/settings.css', 'src/settings-renderer.js',
  'src/downloads.html', 'src/downloads-renderer.js', 'src/offline-player.html',
  'src/ytdlp-pin.js', 'src/ytdlp-installer.js', 'tests/run-all.js', 'docs/CODE-SIGNING.md',
  'src/library.html', 'src/browser-session-transfer.js', 'src/browser-login-once/manifest.json',
  'src/browser-login-once/popup.js', 'scripts/BUILD_WINDOWS_EXE.cmd',
  'PRIVACY.md', 'SECURITY.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
  'docs/RELEASE_CHECKLIST.md', 'docs/REPRODUCIBLE_BUILDS.md', 'scripts/GENERATE_LOCKFILE.cmd', 'scripts/check-dependency-lock.js', 'scripts/validate-unsigned-release.js', '.github/workflows/release-windows.yml'
];
for (const name of required) {
  const loc = path.join(root,name);
  assert(fs.existsSync(loc) && fs.statSync(loc).size>0, `Missing/empty release file: ${name}`);
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const sourcePreload=fs.readFileSync(path.join(root,'src/preload.js'),'utf8');
assert(sourcePreload.includes('let enabled = false;'),'Early ad filter must not activate before user preferences are loaded');
assert(sourcePreload.includes('blockAds: false'),'Experimental ad filtering should start disabled');
const appSource=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
assert(appSource.includes('checkboxChecked:false'),'Cookie export deletion must be opt-in');
assert(appSource.includes('createYtDlpInstaller'),'Use pinned and checked downloader installer');
assert.equal(pkg.name,'tubeium');
assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
assert.equal(pkg.build.appId,'io.tubeium.desktop');
for(const entry of pkg.build.files){
  if(entry.includes('*')) continue;
  assert(fs.existsSync(path.join(root,entry)),`Missing packaged file: ${entry}`);
}
assert(pkg.scripts['verify:release'] && pkg.scripts['audit:release']);
const {DEFAULTS,publicGroups}=require('../src/settings-schema');
assert.equal(Object.keys(DEFAULTS).length,201,'Existing 201 options must remain intact');
assert.equal(publicGroups().length,15,'Existing settings categorization must remain intact');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/browser-login-once/manifest.json')));
assert.equal(manifest.manifest_version,3);
assert(!manifest.host_permissions.some(x=>x.includes('google.com')),'Google access must be optional');
assert(manifest.optional_host_permissions.some(x=>x.includes('google.com')));
const popup=fs.readFileSync(path.join(root,'src/browser-login-once/popup.html'),'utf8');
assert(/id="google" type="checkbox"/.test(popup) && !/id="google" type="checkbox" checked/.test(popup),'Google authentication cookies must be opt-in');
const bridge=fs.readFileSync(path.join(root,'src/browser-session-transfer.js'),'utf8');
assert(bridge.includes("server.listen(0, '127.0.0.1'"),'Sign-in bridge must only bind loopback');
assert(bridge.includes('processing = true') && bridge.includes('processing || finished'),'Single-use pairing must reject concurrent requests');
const securityDocs=required.filter(f=>['PRIVACY.md','SECURITY.md','LICENSE','THIRD_PARTY_NOTICES.md'].includes(f));
for(const doc of securityDocs) assert(fs.statSync(path.join(root,doc)).size>350);
const {execFileSync}=require('node:child_process');
const criticalJs=['src/main.js','src/preload.js','src/browser-session-transfer.js','src/browser-login-once/popup.js','scripts/prepare-release.js'];
for(const name of criticalJs) execFileSync(process.execPath,['--check',path.join(root,name)],{stdio:'pipe'});
const workflow=fs.readFileSync(path.join(root,'.github/workflows/release-windows.yml'),'utf8');
assert(/npm ci --no-audit --no-fund/.test(workflow),'CI must use npm ci');
assert(/npm audit --audit-level=high/.test(workflow),'CI must audit dev and production dependencies');
assert(!/uses:\s*[^\s]+@v\d/.test(workflow),'CI must pin actions by SHA');
assert(workflow.indexOf('gh release create') > workflow.indexOf('Verify signature and update metadata'),'Publishing must be after validation');
console.log(`Release audit passed: ${pkg.name}@${pkg.version}, 201 settings, 15 categories, ${required.length} required files, privacy + bridge protections`);
