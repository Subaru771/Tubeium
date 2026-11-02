'use strict';
const assert=require('node:assert/strict');const fs=require('fs');const os=require('os');const path=require('path');
const {LibraryStore,sanitize,validId}=require('../library-store');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tubeium-library-test-'));
try{
 const file=path.join(tmp,'saved','library.json');const lib=new LibraryStore(file);
 assert.equal(lib.list().length,0);
 assert.equal(validId('aBcDeFgHiJ1'),true);assert.equal(validId('bad/../../foo'),false);
 assert.throws(()=>lib.bookmark({id:'bad'}),/Invalid/);
 const item={id:'aBcDeFgHiJ1',title:'A great video',channel:'A channel',position:17.1,duration:130};
 lib.record(item);assert.equal(lib.list('continue').length,1);
 assert.equal(lib.get(item.id).bookmarked,false);
 assert.equal(lib.bookmark(item).bookmarked,true);
 assert.equal(lib.list('bookmarks').length,1);
 assert.equal(new LibraryStore(file).list('bookmarks').length,1,'Persist between restarts');
 assert.equal(lib.list('all','GREAT').length,1);
 assert.equal(lib.list('all','something else').length,0);
 lib.clear('history');assert.equal(lib.list('bookmarks').length,1);assert.equal(lib.get(item.id).position,0);
 const exported=lib.export();assert.equal(exported.type,'local-library');assert(!JSON.stringify(exported).includes('cookie'));
 assert.equal(lib.remove(item.id),true);assert.equal(lib.get(item.id),null);
 assert.equal(lib.import(exported),1);assert.equal(lib.get(item.id).bookmarked,true);
 assert.equal(sanitize([{id:'not-valid',title:'unsafe'}]).length,0);
 assert.equal(lib.clear('all'),1);assert.equal(lib.list().length,0);
 console.log('PASS: local library validation, bookmark, resume, persistence, privacy and export/import');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
