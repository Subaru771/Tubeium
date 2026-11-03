'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const ACTIONS=new Set(['youtube','extensions','folder','open-browser','copy']);
contextBridge.exposeInMainWorld('tubeiumWelcome',Object.freeze({
  // Resolves with {opened, copied, browser, instructions} so the page can say what happened.
  action:name=>ACTIONS.has(name)?ipcRenderer.invoke('welcome-action',name):Promise.reject(new Error('Unavailable action')),
  navigate:target=>ipcRenderer.invoke('welcome-navigate',target),
  getState:()=>ipcRenderer.invoke('welcome-get-state'),
  setShowOnStartup:value=>ipcRenderer.invoke('welcome-set-startup',value===true),
  setShowTabs:value=>ipcRenderer.invoke('welcome-set-tabs-visible',value===true),
  onSignInCompleted:callback=>{
    if(typeof callback!=='function')return;
    ipcRenderer.on('welcome-signin-completed',(_event,data)=>callback({
      imported:Number(data?.imported)||0,rejected:Number(data?.rejected)||0,
    }));
  },
}));
