'use strict';
// A dependency-free renderer smoke test. A fake DOM is intentionally used so
// it can run even when GUI runners or Electron downloads are unavailable.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','src');
const {DEFAULTS,publicGroups}=require('../src/settings-schema');
const src=fs.readFileSync(path.join(root,'settings-renderer.js'),'utf8');
const html=fs.readFileSync(path.join(root,'settings.html'),'utf8');
class Fake {
  constructor(tag='div',id=''){
    this.tagName=tag.toUpperCase();this.id=id;this.children=[];
    this.attrs={};this.listeners={};this.className='';this.dataset={};
    this.value='';this.hidden=false;this.textContent='';this.scrollTop=0;
    this.style={setProperty(){}};
    this.classList={add(){},remove(){},toggle(){},contains(){return false;}};
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  setAttribute(key,value){this.attrs[key]=value;}
  getAttribute(key){return this.attrs[key];}
  addEventListener(key,handler){this.listeners[key]=handler;}
  focus(){}
  select(){}
  scrollIntoView(){}
  closest(){return null;}
}
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(a=>a[1]);
const nodes=Object.fromEntries(ids.map(id=>[id,new Fake('div',id)]));
const doc={
  body:new Fake('body'),documentElement:new Fake('html'),activeElement:new Fake('body'),
  getElementById:id=>nodes[id]||null,createElement:tag=>new Fake(tag),
  querySelector:()=>new Fake('div'),addEventListener(){}
};
const api={
  initialize:async()=>({settings:DEFAULTS,groups:publicGroups(),favorites:[],defaultDownloads:'C:/Downloads'}),
  onSettings(){},
  setFavorites:async keys=>keys,
  update:async patch=>({...DEFAULTS,...patch})
};
const window={youplusSettings:api};
const media={matches:false,addEventListener(){}};
async function test(){
  new Function('window','document','matchMedia','setTimeout','clearTimeout','confirm',src)(
    window,doc,()=>media,()=>1,()=>{},()=>true
  );
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(nodes['option-count'].textContent,'201');
  const navItems=nodes.navigation.children.filter(el=>el.className?.startsWith('nav-item'));
  assert.equal(navItems.length,17,'Overview, Favorites and all 15 categories remain accessible');
  assert(nodes.navigation.children.some(el=>el.className==='nav-section-label'),'Navigation groups are visible');
  assert.equal(nodes['quick-controls'].children.length,6,'Dashboard controls are real switches');
  assert.equal(nodes['floating-quick'].children.length,2,'Two independent dock controls');
  assert.equal(nodes['category-cards'].children.length,6);
  const downloads=navItems.find(button=>button.children.some(c=>c.textContent==='Downloads'));
  assert(downloads,'Downloads category must remain accessible');
  downloads.onclick();
  assert.equal(nodes['category-heading'].textContent,'Downloads');
  assert(nodes['settings-list'].children.length>1,'Downloads must render several accordion groups');
  const rows=nodes['settings-list'].children.flatMap(panel=>panel.children[1]?.children||[]);
  assert(rows.some(row=>row.dataset.settingKey==='showDownloadButton'));
  assert(rows.some(row=>row.dataset.settingKey==='showSigninHelpButton'));
  assert(rows.every(row=>row.children.some(c=>c.className?.startsWith('favorite-star'))));
  console.log('PASS: Studio boots from real settings schema, functional nav, category groups and two dock toggles');
}
test().catch(error=>{console.error(error);process.exitCode=1;});
