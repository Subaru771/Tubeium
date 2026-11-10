'use strict';
(async()=>{
 const api=window.tubeiumOffline,$=id=>document.getElementById(id);
 let media=null,item=null,busy=false,lastCommand=-Infinity;
 const status=text=>{$('status').textContent=text;};
 function positionState(){
  if(!navigator.mediaSession?.setPositionState)return;
  try{
   if(media&&Number.isFinite(media.duration)&&media.duration>0){
    navigator.mediaSession.setPositionState({duration:media.duration,playbackRate:media.playbackRate||1,position:Math.max(0,Math.min(media.duration,media.currentTime||0))});
   }else navigator.mediaSession.setPositionState();
  }catch{}
 }
 function sync(){
  $('play').textContent=media?.paused?'▶ Play':'Ⅱ Pause';
  $('play').setAttribute('aria-label',media?.paused?'Play':'Pause');
  $('previous').disabled=busy||!item?.canPrevious;$('next').disabled=busy||!item?.canNext;
  $('queue-position').textContent=item?`${item.position} / ${item.count}`:'';
  if(navigator.mediaSession)navigator.mediaSession.playbackState=!media||media.paused?'paused':'playing';
  positionState();
 }
 async function play(){try{await media?.play();}catch{status('Tap Play to start playback.');}sync();}
 function pause(){media?.pause();sync();}
 function toggle(){if(media?.paused)void play();else pause();}
 function seek(seconds){if(media&&Number.isFinite(media.duration))media.currentTime=Math.max(0,Math.min(media.duration,media.currentTime+seconds));}
 async function load(next,shouldPlay){
  if(media){media.pause();media.removeAttribute('src');media.load();}
  item=next;const audio=/\.(mp3|m4a|opus|ogg|wav)$/i.test(item.extension);
  $('video').hidden=audio;$('audio').hidden=!audio;media=$(audio?'audio':'video');
  $('title').textContent=item.title;document.title=item.title+' · Tubeium';$('error').hidden=true;status('');
  media.src=item.url;media.load();sync();
  if(navigator.mediaSession&&typeof MediaMetadata==='function')navigator.mediaSession.metadata=new MediaMetadata({title:item.title,artist:'Tubeium local downloads'});
  if(shouldPlay)await play();
 }
 async function step(direction,automatic=false){
  if(!item||busy||(!automatic&&Date.now()-lastCommand<500))return;
  lastCommand=Date.now();busy=true;sync();
  const shouldPlay=automatic||!media?.paused;
  try{
   const next=await api.navigate(direction,item.queueVersion);
   if(next.moved)await load(next,shouldPlay);
   else{item=next;status(direction>0?'End of downloaded queue.':'Beginning of downloaded queue.');}
  }catch(error){status('Cannot change file: '+error.message);}
  finally{busy=false;sync();}
 }
 $('previous').onclick=()=>void step(-1);$('next').onclick=()=>void step(1);$('play').onclick=toggle;
 $('back').onclick=()=>seek(-10);$('forward').onclick=()=>seek(10);
 $('external').onclick=()=>api.external().catch(error=>status(error.message));
 $('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await $('player-shell').requestFullscreen();}catch{status('Fullscreen is unavailable.');}
 };
 for(const element of [$('video'),$('audio')]){
  element.addEventListener('play',sync);element.addEventListener('pause',sync);
  for(const type of ['timeupdate','loadedmetadata','durationchange','ratechange','seeked'])element.addEventListener(type,positionState);
  element.addEventListener('ended',()=>{sync();if($('auto-next').checked&&item?.canNext)void step(1,true);else status('Playback finished.');});
  element.addEventListener('error',()=>{$('error').hidden=false;status('File missing or unsupported. Choose another file or open it externally.');});
 }
 document.addEventListener('keydown',event=>{
  if(event.repeat)return;
  const action={MediaTrackNext:()=>step(1),MediaNextTrack:()=>step(1),MediaTrackPrevious:()=>step(-1),MediaPreviousTrack:()=>step(-1),MediaPlayPause:toggle}[event.key];
  if(action){event.preventDefault();event.stopImmediatePropagation();void action();return;}
  if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest?.('button,input,select,textarea,[contenteditable="true"]'))return;
  const key=event.key.toLowerCase();
  const shortcut=event.code==='Space'||key==='k'?toggle:key==='arrowleft'?()=>seek(-10):key==='arrowright'?()=>seek(10):key==='f'?()=>$('fullscreen').click():event.shiftKey&&key==='n'?()=>step(1):event.shiftKey&&key==='p'?()=>step(-1):null;
  if(shortcut){event.preventDefault();void shortcut();}
 });
 if(navigator.mediaSession){
  for(const [action,handler] of Object.entries({nexttrack:()=>step(1),previoustrack:()=>step(-1),play,pause,stop:()=>{pause();if(media)media.currentTime=0;},seekbackward:details=>seek(-(details.seekOffset||10)),seekforward:details=>seek(details.seekOffset||10),seekto:details=>{if(media&&Number.isFinite(media.duration)&&Number.isFinite(details.seekTime))media.currentTime=Math.max(0,Math.min(media.duration,details.seekTime));}})){
   try{navigator.mediaSession.setActionHandler(action,handler);}catch{}
  }
 }
 try{const initial=await api.init();$('auto-next').checked=!!initial.autoplay;await load(initial,!!initial.autoplay);}
 catch(error){$('title').textContent='Offline media unavailable';$('error').hidden=false;status(error.message);}
})();
