'use strict';
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const playable=/\.(?:mp4|webm|mkv|m4v|mov|mp3|m4a|opus|ogg|wav)$/i;
function playableFiles(job){
 if(!job||!Array.isArray(job.files))return [];
 return job.files.filter(file=>typeof file==='string'&&path.isAbsolute(file)&&playable.test(file)&&(()=>{try{return fs.statSync(file).isFile();}catch{return false;}})()).slice(0,200);
}
function findOfflineMedia(jobs,id,index=0){
 if(typeof id!=='string'||!(/^[0-9a-f-]{36}$/i).test(id)||!Number.isInteger(index)||index<0||index>199)throw new Error('Invalid media selection');
 const job=jobs.find(j=>j.id===id && j.status==='completed');
 if(!job)throw new Error('Completed download not found');
 const files=playableFiles(job);if(!files[index])throw new Error('No playable media in this download');
 const file=files[index];return {file,url:pathToFileURL(file).href,title:path.basename(file),extension:path.extname(file).toLowerCase()};
}
module.exports={playableFiles,findOfflineMedia};

// Snapshot only verified completed downloads. IPC never accepts arbitrary paths.
function offlineQueue(jobs,id,index=0){
 const selected=findOfflineMedia(jobs,id,index),seen=new Set(),items=[];
 for(const job of jobs){
  if(job.status!=='completed')continue;
  for(const file of playableFiles(job)){
   if(seen.has(file))continue;seen.add(file);
   items.push({file,url:pathToFileURL(file).href,title:path.basename(file),extension:path.extname(file).toLowerCase()});
  }
 }
 const position=items.findIndex(item=>item.file===selected.file);
 if(position<0)throw new Error('Selected download is no longer available');
 return {items,index:position};
}
function offlineNeighbor(items,index,direction){
 if(!Array.isArray(items)||!Number.isInteger(index)||![-1,1].includes(direction))throw new Error('Invalid queue navigation');
 for(let i=index+direction;i>=0&&i<items.length;i+=direction){
  try{if(fs.statSync(items[i].file).isFile())return i;}catch{}
 }
 return -1;
}
module.exports.offlineQueue=offlineQueue;
module.exports.offlineNeighbor=offlineNeighbor;
