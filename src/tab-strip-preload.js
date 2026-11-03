"use strict";
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tubeiumTabs',Object.freeze({
 select:tab=>{if(tab==='youtube'||tab==='welcome')ipcRenderer.send('tubeium-tab-switch',tab);},
 onState:cb=>{if(typeof cb==='function')ipcRenderer.on('tubeium-tab-state',(_e,state)=>{if(state==='youtube'||state==='welcome')cb(state);});},
}));
