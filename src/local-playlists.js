'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID=/^[a-f0-9-]{36}$/i;
const cleanText=(x,n=90)=>String(x??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,n);
function validate(raw){
 if(!raw || !Array.isArray(raw.playlists))return [];
 const seen=new Set();
 return raw.playlists.slice(0,150).flatMap(p=>{
  if(!p||typeof p!=='object'||!PLAYLIST_ID.test(p.id)||seen.has(p.id))return [];
  seen.add(p.id);
  return [{id:p.id,name:cleanText(p.name)||'Untitled playlist',ids:[...new Set((Array.isArray(p.ids)?p.ids:[]).filter(x=>typeof x==='string'&&VIDEO_ID.test(x)))].slice(0,1500),createdAt:Number.isFinite(p.createdAt)?p.createdAt:Date.now()}];
 });
}
class PlaylistStore{
 constructor(file){this.file=file;this.playlists=[];try{this.playlists=validate(JSON.parse(fs.readFileSync(file,'utf8')));}catch{}}
 save(){fs.mkdirSync(path.dirname(this.file),{recursive:true});const f=this.file+'.tmp';fs.writeFileSync(f,JSON.stringify({version:1,playlists:this.playlists},null,2),{mode:0o600});fs.renameSync(f,this.file);}
 list(){return this.playlists.map(p=>({...p,ids:[...p.ids]}));}
 create(name){if(this.playlists.length>=150)throw new Error('Playlist limit reached');const p={id:crypto.randomUUID(),name:cleanText(name),ids:[],createdAt:Date.now()};if(!p.name)throw new Error('Enter a playlist name');this.playlists.push(p);this.save();return p;}
 rename(id,name){const p=this.playlists.find(p=>p.id===id);if(!p)throw new Error('Playlist not found');const nextName=cleanText(name);if(!nextName)throw new Error('Enter a playlist name');p.name=nextName;this.save();return p;}
 delete(id){const before=this.playlists.length;this.playlists=this.playlists.filter(p=>p.id!==id);if(before!==this.playlists.length)this.save();return before!==this.playlists.length;}
 add(id,videoId){if(!VIDEO_ID.test(videoId))throw new Error('Invalid video ID');const p=this.playlists.find(p=>p.id===id);if(!p)throw new Error('Playlist not found');if(!p.ids.includes(videoId)){if(p.ids.length>=1500)throw new Error('Playlist full');p.ids.push(videoId);this.save();}return p;}
 remove(id,videoId){const p=this.playlists.find(p=>p.id===id);if(!p)throw new Error('Playlist not found');p.ids=p.ids.filter(v=>v!==videoId);this.save();return p;}
 export(){return {app:'Tubeium',type:'playlists',version:1,playlists:this.list()};}
 import(raw){const incoming=validate(raw);const byId=new Map(this.playlists.map(p=>[p.id,p]));incoming.forEach(p=>{if(!byId.has(p.id))byId.set(p.id,p);});this.playlists=[...byId.values()].slice(0,150);this.save();return incoming.length;}
}
module.exports={PlaylistStore,validate};
