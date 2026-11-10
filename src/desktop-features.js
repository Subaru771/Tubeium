'use strict';
const fs=require('node:fs'),path=require('node:path');
const {parseTubeiumLaunch,normalizeYouTubeUrl,memorySnapshot,compareMemorySnapshots}=require('./feature-helpers');
const {fetchVerifiedInstaller}=require('./verified-update');
function createDesktopFeatures({app,dialog,shell,clipboard,ipcMain,net,powerMonitor,getWindow,showWindow,pausePlayback,buildMenu,ytOnly,appDirectory}){
 const gestureFile=path.join(app.getPath('userData'),'touch-gestures.json');
 let gesture='normal';
 try{const v=JSON.parse(fs.readFileSync(gestureFile,'utf8')).sensitivity;if(['low','normal','high'].includes(v))gesture=v;}catch{}
 let baseline=null,lastComparison=null,sleep=null,sleepHandle=null;
 function notify(message){const win=getWindow();if(win&&!win.isDestroyed())win.webContents.send('toast',message);}
 function setGesture(value){
  if(!['low','normal','high'].includes(value))return false;
  gesture=value;try{fs.writeFileSync(gestureFile,JSON.stringify({sensitivity:value}));}catch(error){console.warn('Gesture setting:',error.message);}
  const win=getWindow();if(win&&!win.isDestroyed())win.webContents.send('tubeium-gesture-sensitivity',value);
  buildMenu();return true;
 }
 const linkArgument=argv=>Array.isArray(argv)?argv.map(parseTubeiumLaunch).find(Boolean)||null:null;
 function openLink(raw){
  const url=parseTubeiumLaunch(raw);
  if(!url)return false;
  showWindow();
  const win=getWindow();
  if(win&&!win.isDestroyed())void win.loadURL(url).catch(error=>console.warn('External YouTube link:',error.message));
  return true;
 }
 function registerLinks(){
  if(process.platform!=='win32'||!app.isPackaged||process.env.PORTABLE_EXECUTABLE_FILE){
   void dialog.showMessageBox({type:'info',title:'Open in Tubeium',message:'Protocol registration requires the installed Windows edition.',detail:'Portable builds cannot reliably register a stable executable path.'});return false;
  }
  const success=app.setAsDefaultProtocolClient('tubeium');
  void dialog.showMessageBox({type:success?'info':'warning',title:'Open in Tubeium',
    message:success?'You can now open tubeium:// links':'Windows could not register Tubeium links',
    detail:'This does not replace your default browser. Your browser may ask before opening Tubeium.'});
  return success;
 }
 async function prepareExtension(){
  const folder=path.join(app.getPath('userData'),'Open in Tubeium extension');
  try{
   fs.mkdirSync(folder,{recursive:true});
   for(const file of ['manifest.json','background.js'])fs.copyFileSync(path.join(appDirectory,'open-in-tubeium-extension',file),path.join(folder,file));
   await shell.openPath(folder);
   await dialog.showMessageBox({type:'info',title:'Open in Tubeium extension',message:'The extension folder is ready',detail:'Chrome / Edge / Brave → Extensions → Developer mode → Load unpacked. Choose this folder. Register Tubeium links first. The extension uses context menus only, without YouTube/Google account access.'});
  }catch(error){await dialog.showMessageBox({type:'warning',title:'Extension unavailable',message:String(error.message||error)});}
 }
 function clipboardLink(){
  const url=normalizeYouTubeUrl(clipboard.readText());
  if(!url){void dialog.showMessageBox({type:'warning',message:'No supported HTTPS YouTube link in clipboard.'});return false;}
  return openLink(url);
 }
 function cancelSleep(){
  if(sleepHandle)clearTimeout(sleepHandle);
  sleepHandle=null;sleep=null;
 }
 function expireSleep(endedVideoId=null){
  if(!sleep)return;
  const ended=sleep.mode==='end';
  cancelSleep();pausePlayback();
  const win=getWindow();
  if(ended&&win&&!win.isDestroyed()&&/^[\w-]{11}$/.test(String(endedVideoId||''))){
    win.webContents.send('tubeium-sleep-stop-next',endedVideoId);
  }
  notify('Sleep timer finished · Playback paused');
 }
 function setSleep(mode){
  cancelSleep();
  if(mode==='off')return;
  if(mode==='end'){sleep={mode};return;}
  if(![15,30,60].includes(mode))return;
  sleep={mode:'time',deadline:Date.now()+mode*60*1000};
  sleepHandle=setTimeout(expireSleep,mode*60*1000);
 }
 async function sleepDialog(){
  const active=sleep?.mode==='time'?Math.max(0,Math.ceil((sleep.deadline-Date.now())/60000))+' minutes remaining':sleep?.mode==='end'?'Stop after this video':'No active timer';
  const result=await dialog.showMessageBox({type:'question',title:'Tubeium · Sleep timer',message:'Stop playback automatically',detail:active,
    buttons:['Cancel timer','15 min','30 min','60 min','End of video','Keep existing'],defaultId:5,cancelId:5});
  const options=['off',15,30,60,'end'];
  if(result.response<5){setSleep(options[result.response]);notify(result.response===0?'Sleep timer cancelled':'Sleep timer enabled');}
 }
 async function memoryDialog(){
  const current=memorySnapshot(app.getAppMetrics()),comparison=baseline?compareMemorySnapshots(baseline,current):null;
  if(comparison)lastComparison=comparison;
  const detail=['Electron working set: '+current.totalMB+' MB','Processes: '+current.processCount,
    'By type: '+JSON.stringify(current.byProcessTypeMB),comparison?'Baseline → now: '+comparison.baselineMB+' → '+comparison.currentMB+' MB; delta '+(comparison.deltaMB>=0?'+':'')+comparison.deltaMB+' MB':'No baseline recorded'].join('\n');
  const result=await dialog.showMessageBox({title:'Tubeium · Memory monitor',type:'info',message:'Measure Tubeium memory use',
    detail:detail+'\nUse the same video quality and open windows when comparing.',
    buttons:['Set baseline','Compare again','Save report','Close'],defaultId:baseline?1:0,cancelId:3});
  if(result.response===0){baseline=current;notify('Memory baseline recorded');}
  if(result.response===1)return memoryDialog();
  if(result.response===2){
   const dest=await dialog.showSaveDialog({defaultPath:path.join(app.getPath('documents'),'Tubeium-memory.json'),filters:[{name:'JSON',extensions:['json']}]});
   if(dest.filePath)fs.writeFileSync(dest.filePath,JSON.stringify({baseline,current,comparison:lastComparison},null,2));
  }
 }
 function navigatorTab(type){
  const win=getWindow();if(win&&!win.isDestroyed()&&['transcript','chapters'].includes(type))win.webContents.send('tubeium-media-navigator',type);
 }
 async function downloadVerified(tag){
  const win=getWindow();
  try{
   const folder=path.join(app.getPath('downloads'),'Tubeium Updates');
   const verified=await fetchVerifiedInstaller(net.fetch,tag,folder,(received,total)=>{
    const open=getWindow();if(open&&!open.isDestroyed()&&total>0)open.setProgressBar(Math.min(1,received/total));
   });
   if(win&&!win.isDestroyed())win.setProgressBar(-1);
   const result=await dialog.showMessageBox({type:'info',title:'Tubeium · Verified update',
    message:'Official installer downloaded and SHA-256 verified',detail:'File: '+verified.file+'\nSHA-256: '+verified.sha256+'\n\nUnsigned EXEs are never executed automatically.',
    buttons:['Close','Show in folder'],defaultId:1,cancelId:0});
   if(result.response===1)shell.showItemInFolder(verified.file);
   return true;
  }catch(error){
   if(win&&!win.isDestroyed())win.setProgressBar(-1);
   await dialog.showMessageBox({type:'warning',title:'Update download failed',message:'No unverified installer was installed',detail:String(error.message||error)});
   return false;
  }
 }
 function attach(){
  ipcMain.handle('tubeium-gesture-sensitivity-get',event=>{
   if(!ytOnly(event))throw Error('YouTube-only input preference');return gesture;
  });
  ipcMain.on('tubeium-sleep-video-ended',(event,videoId)=>{
   if(ytOnly(event)&&sleep?.mode==='end')expireSleep(videoId);
  });
  if(powerMonitor)powerMonitor.on('resume',()=>{if(sleep?.mode==='time'&&Date.now()>=sleep.deadline)expireSleep();});
 }
 const menuItems=()=>[
  {label:'Sleep timer…',click:sleepDialog},
  {label:'Search transcript…',click:()=>navigatorTab('transcript')},
  {label:'Video chapters…',click:()=>navigatorTab('chapters')},
  {label:'Open YouTube link from clipboard',click:clipboardLink},
  {label:'Register Open in Tubeium links…',click:registerLinks},
  {label:'Prepare browser link extension…',click:prepareExtension},
  {label:'Touch gesture sensitivity',submenu:['low','normal','high'].map(value=>({
   label:value[0].toUpperCase()+value.slice(1),type:'radio',checked:gesture===value,click:()=>setGesture(value)
  }))},
  {label:'Memory monitor…',click:memoryDialog}
 ];
 return {attach,menuItems,linkArgument,openLink,registerLinks,clipboardLink,
  setGesture,getGesture:()=>gesture,cancelSleep,expireSleep,sleepDialog,memoryDialog,navigatorTab,downloadVerified,prepareExtension};
}
module.exports={createDesktopFeatures};
