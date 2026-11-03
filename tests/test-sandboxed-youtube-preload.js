'use strict';
// Reproduce Electron 45's sandboxed-preload module restrictions.
// Previously a relative require('./guide-toggle') aborted the whole YouTube
// preload before it could install the Settings UI and ad-skipping fallback.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const preload = fs.readFileSync(path.join(__dirname,'../src/preload.js'),'utf8');
const main = fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
assert.match(main,/preload: path\.join\(__dirname, 'preload\.js'\)/);
assert.match(main,/sandbox: true/,'Keep Chromium sandbox enabled');
const imports=[...preload.matchAll(/\brequire\((['"])([^'"]+)\1\)/g)].map(m=>m[2]);
assert(imports.length>0,'The preload must explicitly import Electron');
assert(imports.every(x=>x==='electron'), 'A sandboxed preload cannot require local modules or Node builtins');
let bootHandler=null;
const ipcChannels=[];
const window={addEventListener(type,fn){if(type==='DOMContentLoaded')bootHandler=fn;}};
const ipcRenderer={on(name,cb){ipcChannels.push(name);},send(){},invoke(){return Promise.resolve({});}};
const electron={
  ipcRenderer,
  webFrame:{executeJavaScript(){return Promise.resolve(true);}},
  contextBridge:{executeInMainWorld({func,args}) { assert.equal(typeof func,'function');assert(Array.isArray(args)); }}
};
vm.runInNewContext(preload,{
  location:{hostname:'www.youtube.com'},
  process:{argv:['Tubeium.exe','--tubeium-ad-block=on']},
  require(name){
    if(name!=='electron')throw new Error('Sandbox: module not found: '+name);
    return electron;
  },
  window,document:{},setTimeout,clearTimeout,setInterval,clearInterval,
  console
},{timeout:2000});
assert.equal(typeof bootHandler,'function','YouTube preload must survive sandbox initialization');
assert(ipcChannels.includes('state'),'Live state handler must register');
assert.match(preload,/initSettingsButton\(\);/);
assert.match(preload,/initAdBlock\(\);/);
console.log('PASS: sandboxed YouTube preload initializes Settings and ad-skipping entry points');
