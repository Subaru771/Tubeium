'use strict';
const ALLOWED_VIDEO_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be']);
function normalizeYouTubeUrl(input){
 if(typeof input!=='string'||input.length>2048)return null;
 let u;try{u=new URL(input.trim());}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!ALLOWED_VIDEO_HOSTS.has(u.hostname.toLowerCase()))return null;
 if(/[%\\]/.test(u.pathname))return null;
 if(u.hostname==='youtu.be'){
  const id=u.pathname.slice(1);
  if(!/^[\w-]{11}$/.test(id))return null;
  const t=u.searchParams.get('t');
  return 'https://www.youtube.com/watch?v='+id+(t&&/^\d{1,8}s?$/.test(t)?'&t='+t:'');
 }
 const path=u.pathname;
 const safe=path==='/'||path==='/watch'||path==='/playlist'||path==='/results'||
   /^\/(?:shorts|live|embed)\/[\w-]{11}\/?$/.test(path)||
   /^\/(?:feed|channel|c|user)\/[\w-]{1,110}\/?$/.test(path)||
   /^\/@[\w.-]{2,90}(?:\/(?:videos|shorts|streams|playlists))?\/?$/.test(path);
 if(!safe)return null;
 if(path==='/watch'&&!/^[\w-]{11}$/.test(u.searchParams.get('v')||''))return null;
 if(path==='/playlist'&&!/^[\w-]{10,100}$/.test(u.searchParams.get('list')||''))return null;
 if(path==='/results'&&!u.searchParams.get('search_query'))return null;
 u.hostname='www.youtube.com';u.protocol='https:';u.hash='';
 return u.href;
}
function parseTubeiumLaunch(raw){
 if(typeof raw!=='string'||raw.length>4096)return null;
 if(!/^tubeium:\/\//i.test(raw))return normalizeYouTubeUrl(raw);
 let url;try{url=new URL(raw);}catch{return null;}
 if(url.protocol!=='tubeium:'||url.hostname!=='open'||(url.pathname!==''&&url.pathname!=='/')||url.username||url.password||url.port)return null;
 const values=url.searchParams.getAll('url');
 if(values.length!==1)return null;
 return normalizeYouTubeUrl(values[0]);
}
function parseChecksums(data,filename){
 if(typeof data!=='string'||data.length>10000||!/^[A-Za-z0-9._-]+\.exe$/.test(filename))return null;
 for(const line of data.split(/\r?\n/)){
  const match=/^([a-fA-F0-9]{64})\s{2}([A-Za-z0-9._-]+\.exe)$/.exec(line.trim());
  if(match&&match[2]===filename)return match[1].toLowerCase();
 }
 return null;
}
function memorySnapshot(metrics,at=Date.now()){
 if(!Array.isArray(metrics))return null;
 const processes=metrics.map(m=>({type:String(m.type||'other').slice(0,40),
  kb:Number.isFinite(m.memory?.workingSetSize)?Math.max(0,m.memory.workingSetSize):0}));
 const perType={};for(const p of processes)perType[p.type]=(perType[p.type]||0)+p.kb;
 return {at,processCount:processes.length,totalMB:Math.round(processes.reduce((n,x)=>n+x.kb,0)/1024),
  byProcessTypeMB:Object.fromEntries(Object.entries(perType).map(([k,v])=>[k,Math.round(v/1024)]))};
}
function compareMemorySnapshots(baseline,current){
 if(!baseline||!current)return null;
 return {baselineMB:baseline.totalMB,currentMB:current.totalMB,deltaMB:current.totalMB-baseline.totalMB,
  baselineProcesses:baseline.processCount,currentProcesses:current.processCount,
  elapsedSeconds:Math.max(0,Math.round((current.at-baseline.at)/1000))};
}
module.exports={normalizeYouTubeUrl,parseTubeiumLaunch,parseChecksums,memorySnapshot,compareMemorySnapshots};
