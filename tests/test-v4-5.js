'use strict';
const assert=require('assert/strict');const fs=require('fs');const path=require('path');const os=require('os');
const {PlaylistStore,validate}=require('../src/local-playlists');const {createBackup,parseBackup,readBackup,writeBackup}=require('../src/backup-manager');const {chooseProfile,overlay}=require('../src/viewing-profiles');const {gains}=require('../src/audio-presets');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tubeium-test-'));
try{
 const library=new PlaylistStore(path.join(tmp,'playlists.json'));
 const p=library.create('My videos');assert.ok(p.id);library.add(p.id,'dQw4w9WgXcQ');library.add(p.id,'dQw4w9WgXcQ');assert.equal(library.list()[0].ids.length,1);
 library.rename(p.id,'Focus');assert.equal(new PlaylistStore(path.join(tmp,'playlists.json')).list()[0].name,'Focus');
 library.remove(p.id,'dQw4w9WgXcQ');assert.equal(library.list()[0].ids.length,0);library.add(p.id,'dQw4w9WgXcQ');
 assert.equal(validate({playlists:[{id:p.id,name:'T',ids:['invalid','dQw4w9WgXcQ']} ]})[0].ids.length,1);
 const b=createBackup({settings:{pageTheme:'dark'},'local-playlists':library.export(),'local-library':{items:[]},cookies:{secret:'NO'}});
 assert.equal(b.contents.cookies,undefined);writeBackup(path.join(tmp,'backup.json'),b);assert.deepEqual(readBackup(path.join(tmp,'backup.json')),parseBackup(b));
 assert.throws(()=>parseBackup({...b,contents:{...b.contents,cookies:{}}}),/Unexpected/);
 assert.equal(chooseProfile('auto',{title:'Physics lecture 1'}),'study');assert.equal(chooseProfile('auto',{title:'Random upload'}),null);
 const settings={hideComments:false,smartProfileMode:'study'};assert.equal(overlay(settings,{title:'x'}).settings.hideComments,true);assert.equal(settings.hideComments,false);
 assert.deepEqual(gains('off'),[0,0,0]);assert.equal(gains('bass',50)[0],2.5);
 console.log('PASS v4.5 playlists, safe backups, temporary viewing profiles, audio presets');
} finally{fs.rmSync(tmp,{recursive:true,force:true});}
