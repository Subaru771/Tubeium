'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tubeiumOffline',Object.freeze({
  init:()=>ipcRenderer.invoke('offline-init'),
  navigate:(direction,version)=>ipcRenderer.invoke('offline-navigate',direction,version),
  external:()=>ipcRenderer.invoke('offline-external')
}));
