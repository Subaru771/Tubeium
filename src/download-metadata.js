'use strict';
// Safe display metadata only; no untrusted title or quality enters yt-dlp CLI.
function cleanTitle(value){
  if(typeof value!=='string')return '';
  return value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,190);
}
function cleanChannel(value){
  if(typeof value!=='string')return '';
  return value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,90);
}
function requestedQuality(mode,settings){
  if(mode==='thumbnail')return 'Thumbnail';
  if(mode==='audio')return settings.audioFormat==='best'?'Original audio':String(settings.audioFormat||'mp3').toUpperCase()+' audio';
  const max=String(settings.videoQuality||'1080');
  const quality=max==='best'?'Best available':/^\d{3,4}$/.test(max)?'Up to '+max+'p':'Auto';
  return quality+' · '+String(settings.videoContainer||'mp4').toUpperCase();
}
function fallbackTitle(task){
  if(task.scope==='playlist')return 'YouTube playlist';
  if(task.scope==='channel')return 'Channel videos';
  const match=String(task.source||'').match(/[?&]v=([\w-]{11})/);
  return match?'Video '+match[1]:'YouTube video';
}
function applyVerifiedMetadata(job,output){
  if(!String(output).startsWith('TUBEIUM_META:'))return false;
  let info;
  try{info=JSON.parse(String(output).slice('TUBEIUM_META:'.length));}catch{return true;}
  if(!info||typeof info!=='object'||Array.isArray(info))return true;
  const title=cleanTitle(info.title),channel=cleanChannel(info.channel);
  if(title && title!=='NA')job.title=title;
  if(channel && channel!=='NA')job.channel=channel;
  if(job.mode==='video'){
    let height=Number(info.height);
    if(!Number.isInteger(height)||height<144||height>4320)height=0;
    if(!height){
      const resolution=String(info.resolution||'');
      const match=resolution.match(/(?:^|x)(\d{3,4})(?:p|$)/i);
      if(match)height=Number(match[1]);
    }
    if(height)job.resolvedQuality=height+'p · '+String(job.container||'mp4').toUpperCase();
  }
  return true;
}
// Fast, unauthenticated public title lookup. No browser cookies or third-party
// service. This never blocks the actual download and is optional if offline.
async function fetchPublicVideoMetadata(source,fetchFn){
  if(typeof source!=='string'||!/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(source)||
     typeof fetchFn!=='function')return null;
  const url='https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(source);
  try{
    const res=await fetchFn(url,{
      method:'GET',credentials:'omit',signal:AbortSignal.timeout(4000),
      headers:{accept:'application/json'}
    });
    if(!res?.ok)return null;
    const size=Number(res.headers?.get?.('content-length')||0);
    if(size>65536)return null;
    const raw=await res.text();
    if(typeof raw!=='string'||raw.length>65536)return null;
    const info=JSON.parse(raw);
    if(info?.provider_name!=='YouTube')return null;
    const title=cleanTitle(info.title),channel=cleanChannel(info.author_name);
    return title?{title,channel}:null;
  }catch{return null;}
}
module.exports={cleanTitle,cleanChannel,requestedQuality,fallbackTitle,applyVerifiedMetadata,fetchPublicVideoMetadata};
