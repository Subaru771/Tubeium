'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const pin=require('../src/ytdlp-pin');
const {createInstaller,assetName}=require('../src/ytdlp-installer');
const {verifyBinary,expectedHash}=require('../src/downloader-integrity');
assert.match(pin.version,/^\d{4}\.\d{2}\.\d{2}$/);
for(const [name,hash] of Object.entries(pin.sha256)) assert.match(hash,/^[0-9a-f]{64}$/,name);
for(const platform of ['win32','darwin','linux'])assert.ok(pin.sha256[assetName(platform)],platform);
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tubeium-pin-test-'));
  const urls=[];
  const bad=Buffer.from('not a real downloader');
  const net={fetch:async url=>{urls.push(url);return {ok:true,status:200,headers:{get:()=>String(bad.length)},arrayBuffer:async()=>bad};}};
  const install=createInstaller({net,binDir:()=>dir,canRun:async()=>false});
  try {
    await assert.rejects(()=>install(()=>{}),/integrity check failed/i);
    assert.equal(urls.length,1,'pinned install must not trust a dynamic remote checksum');
    assert(urls[0].includes('/download/'+pin.version+'/'),'pinned URL required');
    assert.deepEqual(fs.readdirSync(dir),[],'rejected binary must not be written');
    const sample=Buffer.from('verified binary sample');
    const hash=crypto.createHash('sha256').update(sample).digest('hex');
    assert(verifyBinary(sample,hash));
    assert.equal(expectedHash(hash+'  '+assetName()+'\n',assetName()),hash);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
  console.log('PASS: pinned yt-dlp install refuses tampering and retains clean directory');
})().catch(e=>{console.error(e);process.exitCode=1;});
