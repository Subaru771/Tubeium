"use strict";
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tubeiumTabs',Object.freeze({
 select:tab=>{if(tab==='youtube'||tab==='welcome')ipcRenderer.send('tubeium-tab-switch',tab);},
 hide:()=>ipcRenderer.send('tubeium-tab-hide'),
 show:()=>ipcRenderer.send('tubeium-tab-show'),
 openSettings:()=>ipcRenderer.send('tubeium-tab-open-settings'),
 openDownloads:()=>ipcRenderer.send('tubeium-tab-open-downloads'),
 toggleMenu:()=>ipcRenderer.send('tubeium-tab-menu-toggle'),
 onState:cb=>{if(typeof cb==='function')ipcRenderer.on('tubeium-tab-state',(_e,state)=>{
   if(state && (state.tab==='youtube'||state.tab==='welcome') &&
     typeof state.showHelpTabs==='boolean' && typeof state.menuOpen==='boolean')
     cb(Object.freeze({tab:state.tab,showHelpTabs:state.showHelpTabs,
       menuOpen:state.menuOpen,showSigninHelpButton:state.showSigninHelpButton!==false}));
 });},
}));
