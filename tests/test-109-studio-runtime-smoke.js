'use strict';
// Exercise the real Settings renderer with the 201-option schema.
// Advanced is always the last sidebar tab; its seven topics contain only
// the less-used options, with no duplicates of the six everyday sections.
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
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return this.attrs[k];}
 addEventListener(k,f){this.listeners[k]=f;}
 focus(){}select(){}scrollIntoView(){}closest(){return null;}
}
const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Fake('div',m[1])]));
const doc={body:new Fake('body'),documentElement:new Fake('html'),activeElement:new Fake('div'),
 getElementById:id=>nodes[id]||null,createElement:tag=>new Fake(tag),
 querySelector:()=>new Fake('div'),addEventListener(){}};
const api={
 initialize:async()=>({settings:DEFAULTS,groups:publicGroups(),favorites:[],defaultDownloads:'C:/Downloads'}),
 onSettings(){},update:async patch=>({...DEFAULTS,...patch}),reset:async()=>DEFAULTS
};
const window={youplusSettings:api};const media={matches:false,addEventListener(){}};
async function main(){
 new Function('window','document','matchMedia','setTimeout','clearTimeout','confirm',source)(
  window,doc,()=>media,()=>1,()=>{},()=>true
 );
 await Promise.resolve();await Promise.resolve();
 const nav=()=>nodes.navigation.children.filter(e=>e.className?.includes('nav-item'));
 const panels=()=>nodes['settings-list'].children.filter(x=>x.className?.includes('settings-panel'));
 const rows=()=>panels().flatMap(panel=>panel.children[1]?.children||[]);
 const keys=()=>new Set(rows().map(row=>row.dataset.settingKey).filter(Boolean));
 const go=label=>{
   const button=nav().find(b=>b.children.some(c=>c.textContent===label));
   assert(button,'Missing sidebar tab '+label);button.onclick();
 };
 assert.equal(nav().length,7,'Six everyday tabs and the permanent Advanced tab');
 assert.equal(nav().at(-1).children.at(-1).textContent,'Advanced','Advanced is below all other settings');
 assert.equal(nodes['category-heading'].textContent,'General');
 assert.equal(panels().length,2,'General contains two compact groups');
 assert.equal(nodes['toggle-advanced'],undefined,'No Show advanced settings control');
 assert.equal(nodes['advanced-topics'].hidden,true,'Topic chips only show inside Advanced');
 const common=new Set();
 for(const label of ['General','Appearance','Playback','Downloads','Privacy & Ads','Library & Keys']){
   go(label);
   for(const key of keys())common.add(key);
 }
 assert(common.has('showDownloadButton'),'Download button stays in everyday settings');
 assert(!common.has('downloadInfoJson'),'Rare download metadata stays in Advanced');
 go('Advanced');
 assert.equal(nodes['category-heading'].textContent,'Advanced');
 assert.equal(nav().length,7,'The sidebar does not grow or shrink when opening Advanced');
 assert.equal(nodes['advanced-topics'].hidden,false);
 const topics=()=>nodes['advanced-topics'].children;
 assert.equal(topics().length,7,'Advanced has seven purposeful topic groups');
 assert(topics()[0].className.includes('active'),'The first topic is open by default');
 assert.equal(panels()[0].open,true,'The first Advanced subcategory is immediately expanded');
 if(panels().length>2)assert.equal(panels()[2].open,false,'Less relevant groups stay folded');
 const advanced=new Set();
 for(const label of ['Player & audio','Appearance & feed','Download details','Privacy & blocking',
                     'Shortcuts & devices','Local library','Windows & tools']){
   const button=topics().find(b=>b.children.some(c=>c.textContent===label));
   assert(button,'Missing Advanced group '+label);
   button.onclick();
   for(const key of keys()){
     assert(!advanced.has(key),'Duplicate Advanced setting '+key);
     advanced.add(key);
   }
 }
 assert.equal([...common].filter(key=>advanced.has(key)).length,0,'Advanced must not repeat everyday options');
 const together=new Set([...common,...advanced]);
 assert.equal(together.size,Object.keys(DEFAULTS).length,'Every existing option remains reachable');
 assert.equal(advanced.size,201-common.size,'Advanced must contain only the remaining settings');
 // Global search finds a rare option without opening seven separate topics.
 nodes['global-search'].oninput({target:{value:'downloadInfoJson'}});
 assert(keys().has('downloadInfoJson'),'Search must find uncommon options across Advanced topics');
 assert.equal(nodes['advanced-topics'].hidden,true,'Topic chips disappear during global search');
 nodes['global-search'].oninput({target:{value:''}});
 assert.equal(nodes['advanced-topics'].hidden,false);
 go('General');
 assert.equal(nodes['advanced-topics'].hidden,true);
 assert.equal(nav().length,7);
 console.log('PASS: permanent Advanced tab, seven organized topics, no duplicate settings, all 201 values reachable');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
