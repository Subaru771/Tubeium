'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('youplusSettings', Object.freeze({
  initialize: () => call('prefs-init'),
  setFavorites: keys => call('prefs-set-favorites', keys),
  update: patch => call('prefs-update', patch),
  applyPreset: preset => call('prefs-preset', preset),
  reset: group => call('prefs-reset', group),
  chooseFolder: () => call('prefs-folder'),
  openFolder: () => call('prefs-open-folder'),
  export: () => call('prefs-export'),
  import: () => call('prefs-import'),
  backup: () => call('prefs-backup'),
  restoreBackup: () => call('prefs-restore-backup'),
  checkUpdates: () => call('prefs-check-updates'),
  clearCache: () => call('prefs-clear-cache'),
  clearCookies: () => call('prefs-clear-cookies'),
  openPlayer: () => call('prefs-open-player'),
  openDownloads: () => call('prefs-open-downloads'),
  openLibrary: () => call('prefs-open-library'),
  onSettings: callback => {
    if (typeof callback !== 'function') return;
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('prefs-changed', listener);
    return () => ipcRenderer.removeListener('prefs-changed', listener);
  },
}));
