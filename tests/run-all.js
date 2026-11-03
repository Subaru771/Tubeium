'use strict';
// New regression files are discovered automatically without a package.json edit.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const files=fs.readdirSync(__dirname).filter(f=>/^test-.*\.js$/.test(f)).sort();
let failed=0;
for (const file of files) {
  const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});
  if (result.status!==0) {failed++;console.error('FAIL: '+file);}
}
console.log('\n'+(files.length-failed)+'/'+files.length+' test files passed');
process.exit(failed?1:0);
