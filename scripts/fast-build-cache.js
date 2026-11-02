// Local development build cache only; does not change release verification.
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const marker=path.join(root,'node_modules','.tubeium-build-deps-sha256');
const required=[
  'node_modules/.bin/electron-builder.cmd',
  'node_modules/electron/dist/electron.exe',
  'node_modules/.bin/electron.cmd',
  'node_modules/ffmpeg-static/package.json',
  'node_modules/electron-updater/package.json'
];
function fingerprint(){
 const hash=crypto.createHash('sha256');
 for(const name of ['package.json','package-lock.json']){
  const f=path.join(root,name);
  if(!fs.existsSync(f))throw new Error('Missing '+name);
  hash.update(name).update(fs.readFileSync(f));
 }
 return hash.digest('hex');
}
function isReady(){
 if(!required.every(name=>fs.existsSync(path.join(root,name))))return false;
 if(!fs.existsSync(marker))return false;
 return fs.readFileSync(marker,'utf8').trim()===fingerprint();
}
try{
 const command=process.argv[2];
 if(command==='version'){
  process.stdout.write(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version+'\n');
 }else if(command==='check'){
  const ready=isReady();
  console.log(ready?'Dependencies unchanged: reusing local node_modules.':'Dependencies missing or changed: installation required.');
  process.exitCode=ready?0:1;
 }else if(command==='mark'){
  if(!required.every(name=>fs.existsSync(path.join(root,name))))throw new Error('Required runtime/build dependencies are missing.');
  fs.writeFileSync(marker,fingerprint()+'\n');
  console.log('Local dependency cache ready.');
 }else{throw new Error('Expected check or mark command.');}
}catch(error){console.error('Build dependency cache:',error.message);process.exitCode=2;}
