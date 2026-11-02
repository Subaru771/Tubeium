'use strict';
const fs=require('node:fs');const path=require('node:path');
const repo=process.env.GITHUB_REPOSITORY||'';
if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('GITHUB_REPOSITORY must be owner/repo');
const tag=process.env.GITHUB_REF_NAME||'';if(tag && tag!==`v${require('../package.json').version}`)throw new Error('Git tag does not match package version');
const [owner,name]=repo.split('/');const f=path.join(__dirname,'..','package.json');const pkg=JSON.parse(fs.readFileSync(f,'utf8'));
pkg.build.publish=[{provider:'github',owner,repo:name,releaseType:'release'}];
fs.writeFileSync(f,JSON.stringify(pkg,null,2)+'\n');
console.log('Configured Tubeium updater publication for '+repo);
