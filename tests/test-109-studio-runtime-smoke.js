'use strict';
// Simulate the actual Settings renderer against its real 201-setting schema.
// Verify six curated categories by default, optional access to advanced
// options, and live usable controls without launching Electron.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {DEFAULTS,publicGroups}=require('../src/settings-schema');
const root=path.join(__dirname,'../src');
const source=fs.readFileSync(path.join(root,'settings-renderer.js'),'utf8');
const html=fs.readFileSync(path.join(root,'settings.html'),'utf8');
class Fake{
 constructor(tag='div',id=''){
  this.tagName=tag.toUpperCase();this.id=id;this.children=[];
  this.attrs={};this.listeners={};this.className='';this.dataset={};
  this.value='';this.hidden=false;this.textContent='';this.scrollTop=0;
  this.style={setProperty(){}};
  this.classList={add(){},remove(){},toggle(){},contains(){return false;}};
 }
 append(...xs){this.children.push(...xs);}
 replaceChildren(...xs){this.children=[...xs];}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return this.attrs[k];}
 addEventListener(k,f){this.listeners[k]=f;}
 focus(){}select(){}scrollIntoView(){}closest(){return null;}
}
const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Fake('div',m[1])]));
const doc={body:new Fake('body'),documentElement:new Fake('html'),activeElement:new Fake('div'),
 getElementById:id=>nodes[id]||null,createElement:tag=>new Fake(tag),querySelector:()=>new Fake('div'),addEventListener(){}};
let resetAsked=null,updates=[];
const api={
 initialize:async()=>({settings:DEFAULTS,groups:publicGroups(),favorites:[],defaultDownloads:'C:/Downloads'}),
 onSettings(){},update:async patch=>{updates.push(patch);return {...DEFAULTS,...patch};},
 reset:async id=>{resetAsked=id;return DEFAULTS;}
};
const window={youplusSettings:api};const media={matches:false,addEventListener(){}};
async function main(){
 new Function('window','document','matchMedia','setTimeout','clearTimeout','confirm',source)(
  window,doc,()=>media,()=>1,()=>{},()=>true
 );
 await Promise.resolve();await Promise.resolve();
 const nav=()=>nodes.navigation.children.filter(e=>e.className?.startsWith('nav-item'));
 const rows=()=>nodes['settings-list'].children.flatMap(x=>x.children[1]?.children||[]);
 assert.equal(nav().length,6,'Only six everyday categories shown initially');
 assert.equal(nodes['category-heading'].textContent,'General');
 assert.equal(nodes['settings-list'].children.length,2,'General has two compact groups');
 const downloads=nav().find(b=>b.children.some(c=>c.textContent==='Downloads'));
 assert(downloads);downloads.onclick();
 assert.equal(nodes['category-heading'].textContent,'Downloads');
 assert(rows().some(x=>x.dataset.settingKey==='showDownloadButton'));
 assert(!rows().some(x=>x.dataset.settingKey==='downloadInfoJson'),'Rare metadata setting stays out of everyday UI');
 const countCommon=nav().length;
 nodes['toggle-advanced'].onclick();
 assert.equal(nav().length,countCommon+1,'Advanced is opt-in');
 const adv=nav().find(b=>b.children.some(c=>c.textContent==='Advanced'));assert(adv);adv.onclick();
 assert.equal(nodes['category-heading'].textContent,'Advanced');
 assert.equal(rows().length,201,'Every original setting remains accessible in Advanced');
 nodes['toggle-advanced'].onclick();
 assert.equal(nav().length,6,'Collapsing Advanced restores clean navigation');
 assert.equal(nodes['category-heading'].textContent,'General');
 console.log('PASS: six curated categories, useful Download switch, optional 201-setting Advanced, no data loss');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
