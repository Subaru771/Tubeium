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
module.exports={cleanTitle,cleanChannel,requestedQuality,fallbackTitle,applyVerifiedMetadata};
