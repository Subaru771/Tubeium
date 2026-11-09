'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {snapshotDownloadOptions}=require('../src/download-queue');
const src=fs.readFileSync(require('node:path').join(__dirname,'../src/main.js'),'utf8');
const queue=src.slice(src.indexOf('function setJobStatus('),src.indexOf('function managerOnly('));
const tick=()=>new Promise(r=>setImmediate(r));
function harness(defer=false){
 const job={id:'job',status:'queued',files:[]};const children=[],pending=[];
 const ctx={jobs:[job],running:new Map(),downloadAttempts:new Map(),quitting:false,draining:false,
  settings:{parallelDownloads:1},sendDownloads(){},jobPublic:()=>[],snapshotDownloadOptions,requestedQuality:require('../src/download-metadata').requestedQuality,
  ensureYtDlp:defer?()=>new Promise(r=>pending.push(r)):async()=>'/fake/yt-dlp',
  bundledFfmpeg:()=>'/fake/ffmpeg',canRun:async()=>true,fs:{mkdirSync(){},existsSync:()=>false},
  dlDir:()=>'/tmp',formatArgs:()=>[],archiveFile:()=>'/tmp/archive',path:require('node:path'),
  spawn(){const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr=new EventEmitter();c.kill=()=>{};children.push(c);return c;},
  applyVerifiedMetadata:()=>false,shell:{},Date,Map,Symbol,console};
 vm.createContext(ctx);vm.runInContext(queue,ctx);
 const start=src.indexOf("app.on('before-quit',()=>{");const end=src.indexOf('\n});',start)+4;
 let shutdown;ctx.app={on:(_event,fn)=>shutdown=fn};vm.runInContext(src.slice(start,end),ctx);
 return {ctx,job,children,pending,shutdown:()=>shutdown()};
}
(async()=>{
 const h=harness(true);h.ctx.queueDrain();h.ctx.jobAction('job','pause');h.ctx.jobAction('job','resume');
 assert.equal(h.pending.length,1,'Preparation retains the slot through pause/resume');
 h.pending[0]('/fake/yt-dlp');await tick();
 assert.equal(h.children.length,0,'Cancelled preparation must never spawn');
 assert.equal(h.pending.length,2);h.pending[1]('/fake/yt-dlp');await tick();
 assert.equal(h.children.length,1);assert.equal(h.job.status,'running');
 h.children[0].emit('close',0);await tick();assert.equal(h.job.status,'completed');
 const k=harness();k.ctx.queueDrain();await tick();k.ctx.jobAction('job','pause');k.ctx.jobAction('job','resume');await tick();
 assert.equal(k.children.length,1,'Resume waits for the old child to close');
 k.children[0].stdout.emit('data',Buffer.from('[download] 99%\n'));
 assert.notEqual(k.job.progress,99,'Late progress from a stopped attempt is ignored');
 k.children[0].emit('close',1);await tick();assert.equal(k.children.length,2);
 assert.equal(k.job.status,'running');assert.equal(k.job.error,'');
 k.children[1].emit('close',0);await tick();assert.equal(k.job.status,'completed');
 const q=harness();q.ctx.jobs.push({id:'waiting',status:'queued',files:[]});q.ctx.queueDrain();await tick();
 q.shutdown();q.children[0].emit('close',null);await tick();
 assert.equal(q.children.length,1);assert.equal(q.ctx.jobs[1].status,'queued');assert.equal(q.ctx.downloadAttempts.size,0);
 const p=harness(true);p.ctx.queueDrain();p.shutdown();p.pending[0]('/fake/yt-dlp');await tick();assert.equal(p.children.length,0);
 console.log('PASS: pause/resume serializes attempts; stale events and shutdown cannot restart downloads');
})().catch(e=>{console.error(e);process.exitCode=1;});
