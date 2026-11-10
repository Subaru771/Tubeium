'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
const startup=src.slice(src.indexOf('  app.whenReady().then(async () => {'),src.lastIndexOf('\n}'));
async function check(autoRestore){
 let started=0;const settings={downloadSubfolder:'Tubeium',autoRestoreDownloads:autoRestore};const job={id:'queued-job',status:'queued'};
 const ctx={fs:{},process:{argv:[]},desktopFeatures:{attach(){},linkArgument:()=>null,openLink(){}},app:{getPath:()=>'/tmp',whenReady:()=>Promise.resolve()},migrateUserData(){},settings,normalize:()=>settings,
  readJson:(_path,fallback)=>fallback,settingsFile:()=>'',memoryFile:()=>'',queueFile:()=>'',migrateLegacyDownloadFolder:()=>({nextSubfolder:'Tubeium'}),
  playerMemory:{},LibraryStore:class{},PlaylistStore:class{},path,setupWebsitePermissions(){},
  normalizeQueue:()=>[job],sendDownloads(){},applyLoginSetting(){},createWindow(){},verifyImportedSessionOnce(){},buildMenu(){},buildTray(){},
  queueDrain(){if(job.status==='queued'){started++;job.status='running';}}};
 vm.runInNewContext(startup,ctx);await new Promise(r=>setImmediate(r));
 assert.equal(started,autoRestore?1:0);assert.equal(job.status,autoRestore?'running':'paused');
}
(async()=>{await check(true);await check(false);console.log('PASS: startup drains restored queued jobs only when auto-restore is enabled');})().catch(e=>{console.error(e);process.exitCode=1;});
