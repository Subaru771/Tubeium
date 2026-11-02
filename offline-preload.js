'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tubeiumOffline',Object.freeze({
  init:()=>ipcRenderer.invoke('offline-init'),
  external:()=>ipcRenderer.invoke('offline-external')
}));
