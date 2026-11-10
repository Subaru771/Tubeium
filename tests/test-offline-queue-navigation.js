'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const vm=require('node:vm');
const {offlineQueue,offlineNeighbor}=require('../src/offline-media');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tubeium-queue-'));
try{
 const files=['one.mp4','two.mp3','three.webm'].map(name=>{const file=path.join(tmp,name);fs.writeFileSync(file,'test');return file;});
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const jobs=[{id,status:'completed',files},{id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',status:'running',files:[files[0]]},{id:'cccccccc-cccc-cccc-cccc-cccccccccccc',status:'completed',files:[files[1]]}];
 const queue=offlineQueue(jobs,id,1);assert.equal(queue.index,1);assert.equal(queue.items.length,3,'Duplicate file paths are played once');
 assert.equal(offlineNeighbor(queue.items,1,-1),0);assert.equal(offlineNeighbor(queue.items,1,1),2);
 assert.equal(offlineNeighbor(queue.items,0,-1),-1);assert.equal(offlineNeighbor(queue.items,2,1),-1);
 fs.unlinkSync(files[1]);assert.equal(offlineNeighbor(queue.items,0,1),2,'Deleted files are skipped in both directions');assert.equal(offlineNeighbor(queue.items,2,-1),0);
 assert.throws(()=>offlineNeighbor(queue.items,0,2));assert.throws(()=>offlineNeighbor(queue.items,'0',1));
 assert.throws(()=>offlineQueue(jobs,'../../outside',0));
 const main=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
 assert.match(main,/ipcMain\.handle\('offline-navigate',\(e,direction,version\)=>\{\s*if\(!offlineOnly\(e\)/);
 const start=main.indexOf("ipcMain.handle('offline-navigate',");
 const end=main.indexOf("ipcMain.handle('offline-external'",start);
 let navigate;
 const context={ipcMain:{handle:(_channel,handler)=>navigate=handler},offlineOnly:event=>event.sender==='player',offlineSelection:queue.items[0],offlineQueueVersion:7,offlinePlaylist:{items:queue.items,index:0},offlineNeighbor,offlineState:()=>({})};
 vm.runInNewContext(main.slice(start,end),context);
 assert.throws(()=>navigate({sender:'other'},1,7));
 assert.throws(()=>navigate({sender:'player'},1,6),'Stale commands from a replaced queue are rejected');
 assert.throws(()=>navigate({sender:'player'},2,7));
 assert.equal(navigate({sender:'player'},1,7).moved,true);assert.equal(context.offlinePlaylist.index,2);
 assert.equal(navigate({sender:'player'},1,7).moved,false);
 console.log('PASS: offline queue boundaries, deduplication, deleted files and trusted-only navigation');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
