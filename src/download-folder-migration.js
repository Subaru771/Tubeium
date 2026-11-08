'use strict';
const path=require('node:path');
const LEGACY_NAMES=['uyouplus','uyouplus pc','youplus pc','uyou+','youplus'];
const isLegacyName=(v)=>typeof v==='string'&&LEGACY_NAMES.includes(v.trim().toLowerCase());
function migrationPlan(base,existingSubfolder,fs){
  // Only target the system Downloads directory or an explicitly configured base.
  // Never touch arbitrary user-selected paths.
  const requested=typeof existingSubfolder==='string'?existingSubfolder.trim():'Tubeium';
  const legacy=isLegacyName(requested)?requested:null;
  const nextSubfolder=legacy?'Tubeium':requested;
  const oldNames=legacy?[legacy]:(requested.toLowerCase()==='tubeium'?LEGACY_NAMES:[]);
  const destination=path.join(base,'Tubeium');
  let source=null;
  for(const n of oldNames){
    const candidate=path.join(base,n);
    try{
      if(fs.existsSync(candidate)&&fs.statSync(candidate).isDirectory()&&candidate!==destination){source=candidate;break;}
    }catch{}
  }
  return {nextSubfolder,source,destination};
}
function migrateLegacyDownloadFolder({fs,base,subfolder}){
  const plan=migrationPlan(base,subfolder,fs);
  let moved=false,blocked=false;
  if(plan.source){
    // Rename only when there is no destination. Never merge, overwrite or
    // silently discard a user's downloaded files.
    try{
      if(fs.existsSync(plan.destination))blocked=true;
      else {fs.renameSync(plan.source,plan.destination);moved=true;}
    }catch{blocked=true;}
  }
  return {...plan,moved,blocked};
}
function remapDownloadJobPaths(jobs,oldDir,newDir){
  if(!oldDir||!newDir||!Array.isArray(jobs))return jobs;
  const oldPrefix=path.resolve(oldDir)+path.sep;
  return jobs.map(job=>({
    ...job,
    files:Array.isArray(job.files)?job.files.map(file=>{
      if(typeof file!=='string')return file;
      const resolved=path.resolve(file);
      if(resolved.toLowerCase().startsWith(oldPrefix.toLowerCase()))
        return path.join(newDir,resolved.slice(oldPrefix.length));
      return file;
    }):job.files
  }));
}
module.exports={isLegacyName,migrateLegacyDownloadFolder,remapDownloadJobPaths};
