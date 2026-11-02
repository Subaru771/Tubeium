'use strict';
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const playable=/\.(?:mp4|webm|mkv|m4v|mov|mp3|m4a|opus|ogg|wav)$/i;
function playableFiles(job){
 if(!job||!Array.isArray(job.files))return [];
 return job.files.filter(file=>typeof file==='string'&&path.isAbsolute(file)&&playable.test(file)&&fs.existsSync(file)&&fs.statSync(file).isFile()).slice(0,200);
}
function findOfflineMedia(jobs,id,index=0){
 if(typeof id!=='string'||!(/^[0-9a-f-]{36}$/i).test(id)||!Number.isInteger(index)||index<0||index>199)throw new Error('Invalid media selection');
 const job=jobs.find(j=>j.id===id && j.status==='completed');
 if(!job)throw new Error('Completed download not found');
 const files=playableFiles(job);if(!files[index])throw new Error('No playable media in this download');
 const file=files[index];return {file,url:pathToFileURL(file).href,title:path.basename(file),extension:path.extname(file).toLowerCase()};
}
module.exports={playableFiles,findOfflineMedia};
