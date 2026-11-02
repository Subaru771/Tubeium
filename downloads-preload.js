'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('youplusDownloads',{
  init:()=>ipcRenderer.invoke('downloads-init'),
  add:(url,scope,mode)=>ipcRenderer.invoke('downloads-add',{url,scope,mode}),
  action:(id,action)=>ipcRenderer.invoke('downloads-action',id,action),
  folder:()=>ipcRenderer.invoke('downloads-open-folder'),
  playOffline:(id,index)=>ipcRenderer.invoke('downloads-play-offline',id,index),
  health:()=>ipcRenderer.invoke('downloads-health'),
  subscribeAppearance:(callback)=>{const fn=(_event,data)=>callback(data);ipcRenderer.on('downloads-appearance',fn);return()=>ipcRenderer.removeListener('downloads-appearance',fn);},
  subscribe:(callback)=>{const fn=(_event,data)=>callback(data);ipcRenderer.on('downloads-changed',fn);return()=>ipcRenderer.removeListener('downloads-changed',fn);}
});
