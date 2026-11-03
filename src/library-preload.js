'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tubeiumLibrary',Object.freeze({
 init:()=>ipcRenderer.invoke('library-init'),
 list:(filter,query)=>ipcRenderer.invoke('library-list',filter,query),
 open:(id)=>ipcRenderer.invoke('library-open',id),
 remove:(id)=>ipcRenderer.invoke('library-remove',id),
 clear:(mode)=>ipcRenderer.invoke('library-clear',mode),
 export:()=>ipcRenderer.invoke('library-export'),
 import:()=>ipcRenderer.invoke('library-import'),
 settings:()=>ipcRenderer.invoke('library-settings'),
 playlists:()=>ipcRenderer.invoke('library-playlists'),
 playlistCreate:(name)=>ipcRenderer.invoke('library-playlist-create',name),
 playlistRename:(id,name)=>ipcRenderer.invoke('library-playlist-rename',id,name),
 playlistDelete:(id)=>ipcRenderer.invoke('library-playlist-delete',id),
 playlistAdd:(id,video)=>ipcRenderer.invoke('library-playlist-add',id,video),
 playlistRemove:(id,video)=>ipcRenderer.invoke('library-playlist-remove',id,video),
 offline:()=>ipcRenderer.invoke('library-offline-list'),
 playOffline:(id,index)=>ipcRenderer.invoke('library-offline-open',id,index),
}));
