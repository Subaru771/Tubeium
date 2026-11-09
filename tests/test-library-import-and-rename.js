'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {LibraryStore}=require('../src/library-store');const {PlaylistStore}=require('../src/local-playlists');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tubeium-library-merge-'));
try{
 const store=new LibraryStore(path.join(tmp,'library.json'));
 store.record({id:'abcdefghijk',title:'Recent title',position:120,duration:600});
 store.import({items:[{id:'abcdefghijk',title:'Old title',position:20,bookmarked:true,watchLater:true,watchLaterAt:100,lastWatched:1}]});
 let item=new LibraryStore(store.file).get('abcdefghijk');
 assert.equal(item.bookmarked,true);assert.equal(item.watchLater,true);assert.equal(item.title,'Recent title');assert.equal(item.position,120);
 store.import({items:[{id:'abcdefghijk',title:'New title',position:200,lastWatched:Date.now()+1000}]});
 item=new LibraryStore(store.file).get('abcdefghijk');assert.equal(item.bookmarked,true);assert.equal(item.watchLater,true);assert.equal(item.position,200);
 const playlists=new PlaylistStore(path.join(tmp,'playlists.json'));const p=playlists.create('Original');
 assert.throws(()=>playlists.rename(p.id,'   '));assert.equal(playlists.list()[0].name,'Original');
 playlists.add(p.id,'abcdefghijk');assert.equal(new PlaylistStore(playlists.file).list()[0].name,'Original');
 assert.equal(playlists.rename(p.id,' Renamed ').name,'Renamed');
 console.log('PASS: importing saved flags preserves newest progress; invalid rename never mutates or persists');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
