'use strict';
const fs=require('fs');
const path=require('path');
// Never back up cookies, login tokens, browser session files or yt-dlp binaries.
const BACKUP_MAX_BYTES=5*1024*1024;
const SUPPORTED=['settings','local-library','local-playlists'];
function createBackup(source){const contents={};for(const key of SUPPORTED){const data=source[key];if(data!==undefined)contents[key]=data;}return {app:'Tubeium',type:'privacy-safe-backup',version:1,createdAt:new Date().toISOString(),contents};}
function parseBackup(raw){if(!raw||raw.app!=='Tubeium'||raw.type!=='privacy-safe-backup'||raw.version!==1||!raw.contents||typeof raw.contents!=='object'||Array.isArray(raw.contents))throw new Error('Not a Tubeium backup');const c=raw.contents;for(const key of Object.keys(c))if(!SUPPORTED.includes(key))throw new Error('Unexpected backup content');return c;}
function readBackup(file){const stat=fs.statSync(file);if(stat.size>BACKUP_MAX_BYTES)throw new Error('Backup exceeds the 5 MB limit');return parseBackup(JSON.parse(fs.readFileSync(file,'utf8')));}
function writeBackup(file,backup){const out=JSON.stringify(backup,null,2);if(Buffer.byteLength(out)>BACKUP_MAX_BYTES)throw new Error('Backup exceeds the 5 MB limit');const temp=file+'.tmp';fs.writeFileSync(temp,out,{mode:0o600});fs.renameSync(temp,file);}
module.exports={createBackup,parseBackup,readBackup,writeBackup,BACKUP_MAX_BYTES};
