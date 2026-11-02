'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {checkLock}=require('../scripts/check-dependency-lock');
const pkg={name:'demo',version:'1.0.0',dependencies:{alpha:'1.2.3'},devDependencies:{beta:'2.0.0'}};
const lock={name:'demo',version:'1.0.0',lockfileVersion:3,packages:{'':{...pkg},'node_modules/alpha':{version:'1.2.3',resolved:'https://registry.npmjs.org/alpha/-/alpha-1.2.3.tgz',integrity:'sha512-test'},'node_modules/beta':{version:'2.0.0',resolved:'https://registry.npmjs.org/beta/-/beta-2.0.0.tgz',integrity:'sha512-test'}}};
assert.equal(checkLock(pkg,lock,2),2);
assert.throws(()=>checkLock(pkg,{...lock,lockfileVersion:2},2));
assert.throws(()=>checkLock(pkg,{...lock,version:'0.9.0'},2));
assert.throws(()=>checkLock(pkg,{...lock,packages:{...lock.packages,'node_modules/alpha':{version:'5.0.0'}}},2));
assert.throws(()=>checkLock(pkg,{...lock,packages:{...lock.packages,'node_modules/beta':{version:'2.0.0',resolved:'http://example.com/a.tgz',integrity:'sha512-x'}}},2));
const base=path.resolve(__dirname,'..');
const beta=fs.readFileSync(path.join(base,'.github/workflows/build-windows.yml'),'utf8');
const rel=fs.readFileSync(path.join(base,'.github/workflows/release-windows.yml'),'utf8');
for(const workflow of [beta,rel]){
 assert.match(workflow,/npm ci --no-audit --no-fund/);
 assert.match(workflow,/npm audit --audit-level=high/);
 assert.doesNotMatch(workflow,/uses:\s*[^\s]+@v\d+/);
 assert.match(workflow,/uses: actions\/checkout@[a-f0-9]{40}/);
 assert.match(workflow,/uses: actions\/setup-node@[a-f0-9]{40}/);
}
assert(!/jobs:\s*[\s\S]*?env:\s*\n\s*GH_TOKEN:/.test(rel.slice(0,rel.indexOf('steps:'))));
assert(rel.indexOf('npm run build:installer')>0 && rel.indexOf('Verify signature and update metadata')>rel.indexOf('npm run build:installer'));
assert(rel.indexOf('gh release create')>rel.indexOf('Verify signature and update metadata'));
console.log('Release-gates tests passed: lock validation, immutable actions, audit gates, verify-before-upload.');
