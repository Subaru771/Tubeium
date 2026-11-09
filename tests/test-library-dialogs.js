'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/library-renderer.js'),'utf8');
class Node {
 constructor(id=''){this.id=id;this.value='';this.disabled=false;this.hidden=false;this.open=false;this.children=[];this.events={};}
 addEventListener(name,fn){this.events[name]=fn;}
 append(child){this.children.push(child);if(!this.value)this.value=child.value;}
 replaceChildren(){this.children=[];this.value='';}
 setCustomValidity(message){this.validation=message;}
 reportValidity(){}focus(){}
 showModal(){this.open=true;}
 close(){this.open=false;this.events.close?.();}
}
const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
const ctx={$ ,el:(_tag,_class,text)=>({textContent:text,value:''}),Promise};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf(" const playlistDialog="),source.indexOf(' function duration(')),ctx);
const submit=()=>$('playlist-dialog-form').events.submit({preventDefault(){}});
(async()=>{
 let result=ctx.askPlaylist({title:'Create playlist'});
 assert.equal($('playlist-dialog').open,true);assert.equal($('playlist-dialog-name').disabled,false);
 $('playlist-dialog-name').value='   ';submit();assert.equal($('playlist-dialog').open,true);
 assert.equal($('playlist-dialog-name').validation,'Enter a playlist name');
 $('playlist-dialog-name').events.input({target:$('playlist-dialog-name')});
 $('playlist-dialog-name').value=' New playlist ';submit();assert.equal(await result,'New playlist');
 result=ctx.askPlaylist({title:'Rename playlist',value:'Original'});assert.equal($('playlist-dialog-name').value,'Original');
 $('playlist-dialog').events.cancel({preventDefault(){}});assert.equal(await result,null);
 result=ctx.askPlaylist({title:'Choose playlist',choices:[{id:'stable-id',name:'A playlist'}]});
 assert.equal($('playlist-dialog-name').disabled,true);assert.equal($('playlist-dialog-choice').children[0].textContent,'A playlist');
 submit();assert.equal(await result,'stable-id');
 result=ctx.askPlaylist({title:'Cancel'});$('playlist-dialog-cancel').onclick();assert.equal(await result,null);
 assert.doesNotMatch(source,/\bprompt\s*\(/);
 console.log('PASS: library dialogs validate names, select stable playlist IDs and cancel without changes');
})().catch(e=>{console.error(e);process.exitCode=1;});
