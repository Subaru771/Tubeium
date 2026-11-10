'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Readable,Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const {parseChecksums}=require('./feature-helpers');
const MAX_BYTES=300*1024*1024;
function assetPaths(tag){
 if(typeof tag!=='string'||!/^v\d+\.\d+\.\d+$/.test(tag))throw Error('Invalid official version');
 const filename='Tubeium-'+tag.slice(1)+'-Setup-x64.exe';
 const base='https://github.com/Subaru771/Tubeium/releases/download/'+tag+'/';
 return {filename,asset:base+filename,checksums:base+'SHA256SUMS.txt'};
}
async function fetchVerifiedInstaller(fetcher,tag,outputDir,onProgress=()=>{}){
 if(typeof fetcher!=='function')throw Error('No HTTPS download available');
 const {filename,asset,checksums}=assetPaths(tag);
 const controller=new AbortController(),abort=setTimeout(()=>controller.abort(),10*60*1000);
 let temporary=null;
 try{
  const manifest=await fetcher(checksums,{signal:controller.signal});
  if(!manifest?.ok)throw Error('The official checksum file is unavailable');
  const checkLen=Number(manifest.headers?.get?.('content-length')||0);
  if(checkLen>10000)throw Error('Checksum manifest too large');
  const checksumText=await manifest.text();
  const expected=parseChecksums(checksumText,filename);
  if(!expected)throw Error('The official release has no matching installer checksum');
  const target=path.join(outputDir,filename);
  await fs.promises.mkdir(outputDir,{recursive:true});
  try {
   const existing=await fs.promises.readFile(target);
   const hash=crypto.createHash('sha256').update(existing).digest('hex');
   if(hash===expected)return {file:target,sha256:hash,fromCache:true};
   throw Error('An existing installer has a different checksum. Move it away before downloading again.');
  }catch(e){if(e.code!=='ENOENT')throw e;}
  const response=await fetcher(asset,{signal:controller.signal});
  if(!response?.ok||!response.body)throw Error('Official installer download is unavailable');
  const length=Number(response.headers?.get?.('content-length')||0);
  if(length>MAX_BYTES)throw Error('Installer exceeds the maximum allowed size');
  temporary=target+'.partial-'+process.pid;
  let count=0,last=0;const hash=crypto.createHash('sha256');
  await pipeline(Readable.fromWeb(response.body),new Transform({
   transform(chunk,_enc,callback){
    count+=chunk.length;
    if(count>MAX_BYTES){callback(Error('Installer exceeded size limit'));return;}
    hash.update(chunk);
    if(Date.now()-last>300){last=Date.now();onProgress(count,length);}
    callback(null,chunk);
   }
  }),fs.createWriteStream(temporary,{flags:'wx'}));
  const actual=hash.digest('hex');
  if(actual!==expected)throw Error('SHA-256 verification failed; installer not saved');
  await fs.promises.rename(temporary,target);temporary=null;
  onProgress(count,count);
  return {file:target,sha256:actual,fromCache:false};
 }finally{
  clearTimeout(abort);
  if(temporary)await fs.promises.rm(temporary,{force:true}).catch(()=>{});
 }
}
module.exports={assetPaths,fetchVerifiedInstaller,MAX_BYTES};
