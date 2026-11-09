'use strict';
// An independent, local-only watch library. No authentication cookies are read or exported.
const fs = require('fs');
const path = require('path');
const ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_ENTRIES = 3000;
const text = (s, max=180) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
function validId(id) { return typeof id==='string' && ID.test(id); }
function clampTime(n) { n=Number(n);return Number.isFinite(n)?Math.max(0,Math.min(864000,Math.round(n*10)/10)):0; }
function clean(input) {
 if(!input||typeof input!=='object'||!validId(input.id)) return null;
 return {
   id:input.id,
   title:text(input.title,220)||`Video ${input.id}`,
   channel:text(input.channel,100),
   position:clampTime(input.position),
   duration:clampTime(input.duration),
   bookmarked:input.bookmarked===true,
   watchLater:input.watchLater===true,
   watchLaterAt:Number.isFinite(input.watchLaterAt)?Math.max(0,Math.min(Date.now()+3600000,input.watchLaterAt)):0,
   lastWatched: Number.isFinite(input.lastWatched)?Math.max(0,Math.min(Date.now()+3600000,input.lastWatched)):Date.now(),
 };
}
function sanitize(raw){
 const items=Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:[]);
 const byId=new Map();
 for(const rawItem of items.slice(0,MAX_ENTRIES*3)){
   const v=clean(rawItem);if(!v)continue;
   const existing=byId.get(v.id);
   if(!existing || existing.lastWatched<=v.lastWatched) byId.set(v.id,v);
 }
 return [...byId.values()].sort((a,b)=>b.lastWatched-a.lastWatched).slice(0,MAX_ENTRIES);
}
class LibraryStore {
 constructor(file){this.file=file;this.items=[];this.load();}
 load(){try{this.items=sanitize(JSON.parse(fs.readFileSync(this.file,'utf8')));}catch{this.items=[];}return this.items;}
 save(){fs.mkdirSync(path.dirname(this.file),{recursive:true}); const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify({version:1,items:this.items},null,2),{mode:0o600});fs.renameSync(tmp,this.file);}
 list(filter='all',query=''){
 const q=text(query,150).toLowerCase();
 const items=this.items.filter(v=>(
   filter==='bookmarks'?v.bookmarked:
   filter==='watch-later'?v.watchLater:
   filter==='continue'?v.position>10&&(!v.duration||v.position<Math.max(0,v.duration-20)):true
 )&&(!q||[v.title,v.channel,v.id].some(s=>s.toLowerCase().includes(q))));
 return filter==='watch-later'?items.sort((a,b)=>b.watchLaterAt-a.watchLaterAt):items;
}
 get(id){return validId(id)?this.items.find(v=>v.id===id)||null:null;}
 record(input){const v=clean(input);if(!v)throw new Error('Invalid video identifier');const old=this.get(v.id);const merged={...(old||{}),...v, bookmarked:old?.bookmarked===true,watchLater:old?.watchLater===true,watchLaterAt:old?.watchLaterAt||0,lastWatched:Date.now()}; if(!input?.title&&old)merged.title=old.title;if(!input?.channel&&old)merged.channel=old.channel; if(old && v.position<3 && old.position>10 && old.duration && old.position < old.duration-20)merged.position=old.position;this.items=[merged,...this.items.filter(x=>x.id!==v.id)].slice(0,MAX_ENTRIES);this.save();return merged;}
 bookmark(input){const v=clean(input);if(!v)throw new Error('Invalid video identifier');const old=this.get(v.id);const merged={...v,...(old||{}),title:v.title?.startsWith('Video ')?old?.title||v.title:v.title,channel:v.channel||old?.channel||'',bookmarked:!old?.bookmarked,lastWatched:Date.now()};this.items=[merged,...this.items.filter(x=>x.id!==v.id)].slice(0,MAX_ENTRIES);this.save();return merged;}
 watchLater(input,add=true){
 const v=clean(input);if(!v)throw new Error('Invalid video identifier');
 const old=this.get(v.id);
 const enabled=add!==false;
 const merged={...(old||{}),...v,
   title:v.title.startsWith('Video ')?old?.title||v.title:v.title,
   channel:v.channel||old?.channel||'',
   bookmarked:old?.bookmarked===true,
   watchLater:enabled,
   watchLaterAt:enabled?(old?.watchLaterAt||Date.now()):0,
   lastWatched:old?.lastWatched||0};
 this.items=[merged,...this.items.filter(x=>x.id!==v.id)].slice(0,MAX_ENTRIES);
 this.save();return merged;
}
remove(id){if(!validId(id))return false;const count=this.items.length;this.items=this.items.filter(x=>x.id!==id);if(count!==this.items.length)this.save();return count!==this.items.length;}
 clear(mode='history'){const old=this.items.length;this.items=mode==='all'?[]:this.items.filter(v=>v.bookmarked||v.watchLater).map(v=>({...v,position:0,lastWatched:0}));this.save();return old-this.items.length;}
 import(raw){const imported=sanitize(raw);const merged=new Map(this.items.map(v=>[v.id,v]));for(const v of imported){const old=merged.get(v.id);if(!old || v.lastWatched>=old.lastWatched)merged.set(v.id,{...v,bookmarked:v.bookmarked||!!old?.bookmarked,watchLater:v.watchLater||!!old?.watchLater,watchLaterAt:Math.max(v.watchLaterAt||0,old?.watchLaterAt||0)});}this.items=sanitize([...merged.values()]);this.save();return imported.length;}
 export(){return {app:'Tubeium',type:'local-library',version:1,exportedAt:new Date().toISOString(),items:this.items};}
}
module.exports={LibraryStore,validId,sanitize,clean};
