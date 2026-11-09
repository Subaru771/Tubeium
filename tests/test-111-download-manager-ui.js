'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/downloads-renderer.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../src/downloads.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../src/downloads.css'),'utf8');
const {newTask}=require('../src/download-queue');
class Node {
  constructor(tag='div',id=''){
    this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.parentElement=null;
    this.dataset={};this.attrs={};this.handlers={};this.className='';
    this.textContent='';this.title='';this.hidden=false;this.style={setProperty(){}};
    const classes=new Set();
    this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),
      toggle:(c,v)=>{if(v===undefined)v=!classes.has(c);if(v)classes.add(c);else classes.delete(c);return v;},
      contains:c=>classes.has(c)};
  }
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(name,handler){this.handlers[name]=handler;}
  append(...items){for(const item of items)this.appendChild(item);}
  appendChild(node){if(node.parentElement)node.remove();this.children.push(node);node.parentElement=this;return node;}
  insertBefore(node,ref){
    if(node===ref)return node;
    if(node.parentElement)node.remove();
    const index=ref?this.children.indexOf(ref):-1;
    if(index<0)this.children.push(node);else this.children.splice(index,0,node);
    node.parentElement=this;return node;
  }
  replaceChildren(...items){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...items);}
  remove(){if(!this.parentElement)return;const list=this.parentElement.children;const idx=list.indexOf(this);if(idx>=0)list.splice(idx,1);this.parentElement=null;}
  querySelector(){return {disabled:false};}
  querySelectorAll(){return this.children;}
  closest(){return null;}
}
const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(x=>[x[1],new Node('div',x[1])]));
const document={getElementById:id=>nodes[id]||null,createElement:name=>new Node(name),
  documentElement:new Node('html')};
const task=newTask('ABCDEFGHIJK','video','video',{title:'Named video from watch page',
  channel:'Creator',settings:{videoQuality:'1080',videoContainer:'mp4'}});
let changed=null;
const api={init:async()=>({jobs:[task],folder:'C:/Downloads/Tubeium'}),
  subscribe:cb=>{changed=cb;},subscribeAppearance(){},action:async()=>[],folder:async()=>{},
  health:async()=>({downloader:'Available',ffmpeg:'Available'})};
const window={youplusDownloads:api};
async function test(){
  new Function('window','document','setTimeout','clearTimeout',source)(
    window,document,()=>1,()=>{}
  );
  await Promise.resolve();await Promise.resolve();
  assert.equal(nodes.jobs.children.length,1);
  const row=nodes.jobs.children[0];
  assert.equal(row._view.title.textContent,'Named video from watch page');
  assert.equal(row._view.channel.textContent,'Creator');
  assert.equal(row._view.quality.textContent,'Up to 1080p · MP4');
  assert.match(row._view.quality.title,/Requested/);
  assert.equal(row._view.pct.textContent,'0%');
  task.status='running';task.progress=19;task.detail='4.5MiB/s · ETA 00:10';
  changed([task]);
  assert.equal(nodes.jobs.children[0],row,'Update queue without destroying the card');
  assert.equal(row._view.pct.textContent,'19%');
  assert.match(row._view.detail.textContent,/ETA 00:10/);
  task.resolvedQuality='720p · MP4';
  task.title='Verified actual video title';
  changed([task]);
  assert.equal(row._view.title.textContent,'Verified actual video title');
  assert.equal(row._view.quality.textContent,'720p · MP4');
  assert.match(row._view.quality.title,/Confirmed/);
  assert.equal(nodes.jobs.children[0],row);
  task.status='completed';task.progress=100;task.files=['C:/Downloads/Tubeium/example.mp4'];
  changed([task]);
  assert.equal(row._view.pct.textContent,'100%');
  assert(row._view.actions.children.length>0);
  assert.match(css,/\.job-title\{/);
  assert.doesNotMatch(html,/<div class="intro"|DOWNLOAD STUDIO|THE LIBRARY IS YOURS/);
  assert.match(html,/id="queue-form"/);
  assert.match(html,/id="tabs"/);
  assert.match(html,/id="jobs"/);
  console.log('PASS: modern manager shows title, requested then actual quality, stable progress and compact controls');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
