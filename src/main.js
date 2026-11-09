const {
  app, BrowserWindow, WebContentsView, Menu, Tray, ipcMain, shell, session, net, nativeImage, screen, dialog, clipboard,
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { DEFAULTS, normalize, publicGroups, metadata } = require('./settings-schema');
const { newTask, normalizeQueue, formatArgs } = require('./download-queue');
const {applyVerifiedMetadata}=require('./download-metadata');
const { migrateLegacyDownloadFolder, remapDownloadJobPaths } = require('./download-folder-migration');
const { migrateUserData } = require('./migration-userdata');
const { importCookies, MAX_FILE_BYTES } = require('./signin-cookies');
const { startTransfer } = require('./browser-session-transfer');
const { LABELS, CHROMIUM_BASED, EXTENSIONS_URL, buildLaunch, resolveDefaultBrowser } = require('./default-browser');
const { createCleanProfile, chromiumProfileArgs } = require('./clean-signin-browser');
const { GOOGLE_ERROR_SCAN, isSignInLocation, classifyFailure, messageFor } = require('./signin-failure');
const { LibraryStore, validId } = require('./library-store');
const { communityTitle } = require('./dearrow');
const { websitePermission } = require('./permission-policy');
const { createInstaller: createYtDlpInstaller } = require('./ytdlp-installer');
const { findOfflineMedia, playableFiles } = require('./offline-media');
const { basicHealth } = require('./system-health');
const { PlaylistStore } = require('./local-playlists');
const { createBackup, readBackup, writeBackup } = require('./backup-manager');
const { normalizeFavorites } = require('./settings-favorites');
const { fetchLatest: fetchGitHubRelease, RELEASES_URL } = require('./update-check');

const START_URL = 'https://www.youtube.com';
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');
const ALLOWED_HOST = /(^|\.)(youtube\.com|google\.com|youtube-nocookie\.com)$/;
// Restricted to HTTPS sign-in hosts; used only for first-party login redirects.
const LOGIN_HOST = /(^|\.)(youtube\.com|google\.com|googleusercontent\.com|gstatic\.com)$/;

// Keep the original YouPlus PC Chromium profile when available: renaming
// should not silently sign out an existing user. Tubeium settings stay separate.
if (process.platform === 'win32') {
  const legacyProfile = path.join(app.getPath('appData'), 'YouPlus PC');
  if ([path.join(legacyProfile, 'Network', 'Cookies'), path.join(legacyProfile, 'Cookies')]
    .some(f => { try { return fs.statSync(f).isFile(); } catch { return false; } })) {
    try { app.setPath('sessionData', legacyProfile); }
    catch (error) { console.warn('Could not reuse previous session:', error.message); }
  }
}

// ---- Command-line switches (must be set before ready) ----
app.commandLine.appendSwitch('enable-features', 'HardwareMediaKeyHandling,MediaSessionService');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// ---- Settings (schema-validated and backward compatible with v1) ----
let settings = normalize();
let win = null;
let welcomeView = null;
let tabBarView = null;
let activeTubeiumTab = 'youtube';
let helpTabsVisible = true;
let tabBarFullscreen = false;
let tabMenuOpen = false;
let prefs = null;
let downloadsWindow = null;
let libraryWindow = null;
let offlineWindow = null;
let offlineSelection = null;
let libraryStore = null;
let playlistStore = null;
let tray = null;
let mini = false;
let quitting = false;
let normalBounds = null;
let adBlockInstalled = false;
let playerMemory = { speed: 1, volume: 100, muted: false };

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const favoriteSettingsFile = () => path.join(app.getPath('userData'), 'settings-favorites.json');
const getFavoriteSettings = () => normalizeFavorites(readJson(favoriteSettingsFile(), []), Object.keys(DEFAULTS));
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
const memoryFile = () => path.join(app.getPath('userData'), 'playback-memory.json');
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, file);
  } catch (e) { console.error(e); }
}
const saveSettings = () => writeJson(settingsFile(), settings);
const payload = () => ({ ...settings, mini });
function sendState() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('state', payload());
    win.webContents.setZoomFactor(settings.pageZoom / 100);
  }
  if (prefs && !prefs.isDestroyed()) prefs.webContents.send('prefs-changed', settings);
  if (downloadsWindow && !downloadsWindow.isDestroyed()) downloadsWindow.webContents.send('downloads-appearance', {accent:settings.accentColor,fontPercent:settings.dashboardFontSize});
}
function applyLoginSetting() {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return;
  try { app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, openAsHidden: settings.startMinimized }); }
  catch (e) { console.warn('OS login setting unavailable', e.message); }
}
function setSettings(patch) {
  settings = normalize(patch, settings);
  saveSettings();
  applyLoginSetting();
  if(updateClient)updateClient.autoDownload=!!settings.autoDownloadUpdates;
  if(mini && win && process.platform==='win32')win.setOpacity(settings.miniOpacity/100);
  sendState();
  updateHelpTabsVisibility();
  updateTubeiumTabBar();
  buildMenu();
  queueDrain();
  return settings;
}
const START_PAGES = { home: 'https://www.youtube.com', subscriptions: 'https://www.youtube.com/feed/subscriptions', history: 'https://www.youtube.com/feed/history', explore: 'https://www.youtube.com/feed/explore' };
function startupUrl() { return START_PAGES[settings.startPage] || START_URL; }

// ---- Presets are overlays, not destructive global resets ----
const PRESETS = {
  balanced: { hideShorts: true, hideComments: false, hideRelated: false, hideHomeFeed: false, compactDensity: false, hideSidebar: false, autoTheater: false, pageTheme: 'native', loopVideo: false, hideLiveChat: false },
  focus: { hideShorts: true, hideComments: true, hideRelated: true, hideHomeFeed: true, hideSidebar: true, hideMixes: true, hideLiveChat: true, hideEndScreens: true, hideCards: true, compactDensity: true },
  cinema: { pageTheme: 'oled', autoTheater: true, hideComments: true, hideRelated: true, hideSidebar: true, hideLiveChat: true, hideEndScreens: true, hideCards: true },
  music: { loopVideo: true, hideShorts: true, hideComments: true, hideHomeFeed: false, hideRelated: false, autoTheater: false, pageTheme: 'dark' },
};

// ---- Settings dashboard (separate local isolated window) ----
function openSettings() {
  if (prefs && !prefs.isDestroyed()) { prefs.show(); prefs.focus(); return; }
  prefs = new BrowserWindow({
    width: 1080, height: 760, minWidth: 750, minHeight: 560,
    backgroundColor: '#111119', icon: ICON, title: 'Tubeium · Settings',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'settings-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  prefs.loadFile(path.join(__dirname, 'settings.html'));
  prefs.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  prefs.webContents.on('will-navigate', (e, url) => { if (url !== prefs.webContents.getURL()) e.preventDefault(); });
  prefs.on('closed', () => { prefs = null; });
}
function prefsOnly(e) { return !!prefs && !prefs.isDestroyed() && e.sender === prefs.webContents; }
function ytOnly(e) { return !!win && !win.isDestroyed() && e.sender === win.webContents; }
const prefsHandlers = {
  'prefs-init': () => ({ settings, groups: publicGroups(), favorites: getFavoriteSettings(), platform: process.platform, defaultDownloads: app.getPath('downloads') }),
  'prefs-set-favorites': (_e, keys) => { const favorites = normalizeFavorites(keys, Object.keys(DEFAULTS)); writeJson(favoriteSettingsFile(), favorites); return favorites; },
  'prefs-update': (_e, patch) => setSettings(patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}),
  'prefs-preset': (_e, name) => { if (!Object.prototype.hasOwnProperty.call(PRESETS, name)) throw new Error('Unknown preset'); return setSettings(PRESETS[name]); },
  'prefs-reset': (_e, group) => {
    const keys = group === 'all' ? Object.keys(DEFAULTS) : publicGroups().find(g => g.id === group)?.settings.map(s => s.key);
    if (!keys) throw new Error('Unknown settings category');
    return setSettings(Object.fromEntries(keys.map(k => [k, DEFAULTS[k]])));
  },
  'prefs-folder': async () => {
    const result = await dialog.showOpenDialog(prefs, { title: 'Choose downloads folder', properties: ['openDirectory','createDirectory'], defaultPath: settings.downloadBaseFolder || app.getPath('downloads') });
    if (result.canceled || !result.filePaths[0]) return settings;
    return setSettings({ downloadBaseFolder: result.filePaths[0] });
  },
  'prefs-open-folder': () => { fs.mkdirSync(dlDir(), { recursive: true }); return shell.openPath(dlDir()); },
  'prefs-export': async () => {
    const res = await dialog.showSaveDialog(prefs, { title: 'Export Tubeium settings', defaultPath: path.join(app.getPath('documents'), 'tubeium-settings.json'), filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (res.canceled || !res.filePath) return false;
    fs.writeFileSync(res.filePath, JSON.stringify({ app: 'Tubeium', version: 4.1, settings }, null, 2));
    return true;
  },
  'prefs-import': async () => {
    const res = await dialog.showOpenDialog(prefs, { title: 'Import Tubeium settings', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (res.canceled || !res.filePaths[0]) return settings;
    const file = res.filePaths[0];
    if (fs.statSync(file).size > 500000) throw new Error('Settings file is too large');
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid settings file');
    const data = ['Tubeium', 'YouPlus PC'].includes(parsed.app) ? parsed.settings : parsed;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid settings data');
    return setSettings(data);
  },

  'prefs-backup': async () => {
    const result=await dialog.showSaveDialog(prefs,{title:'Back up Tubeium settings, library and playlists',defaultPath:path.join(app.getPath('documents'),'Tubeium-backup.json'),filters:[{name:'JSON',extensions:['json']}]});
    if(result.canceled||!result.filePath)return false;
    const backup=createBackup({settings,'local-library':requireLibrary().export(),'local-playlists':playlistStore.export()});
    writeBackup(result.filePath,backup);return true;
  },
  'prefs-restore-backup': async () => {
    const file=await dialog.showOpenDialog(prefs,{title:'Restore local Tubeium backup',properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});
    if(file.canceled||!file.filePaths[0])return {restored:false};
    const contents=readBackup(file.filePaths[0]);
    // Validate the backup before mutating any application data.
    if(contents.settings!==undefined && (!contents.settings||typeof contents.settings!=='object'||Array.isArray(contents.settings)))throw new Error('Invalid settings backup');
    if(contents['local-library']!==undefined && (!contents['local-library']||contents['local-library'].type!=='local-library'||!Array.isArray(contents['local-library'].items)))throw new Error('Invalid library backup');
    if(contents['local-playlists']!==undefined && (!contents['local-playlists']||contents['local-playlists'].type!=='playlists'||!Array.isArray(contents['local-playlists'].playlists)))throw new Error('Invalid playlists backup');
    if(contents['local-library'])requireLibrary().import(contents['local-library']);
    if(contents['local-playlists'])playlistStore.import(contents['local-playlists']);
    if(contents.settings)setSettings(contents.settings);
    return {restored:true};
  },
  'prefs-check-updates': async () => checkTubeiumUpdates(true),
  'prefs-clear-cache': async () => { await session.defaultSession.clearCache(); return true; },
  'prefs-clear-cookies': async () => { await session.defaultSession.cookies.flushStore(); await session.defaultSession.clearStorageData({ storages: ['cookies'] }); return true; },
  'prefs-open-player': () => { showWindow(); return true; },
  'prefs-open-downloads': () => { openDownloadManager(); return true; },
  'prefs-open-library': () => { openLocalLibrary(); return true; },
};
for (const [channel, handler] of Object.entries(prefsHandlers)) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!prefsOnly(event)) throw new Error('Forbidden');
    return handler(event, ...args);
  });
}
ipcMain.on('open-settings', e => { if (ytOnly(e)) openSettings(); });

// ---- Welcome / sign-in help tab (local WebContentsView, not a notification) ----
// This view sits over the original YouTube WebContents only while the user is
// reading it. Switching to YouTube removes the view without reloading a video
// or altering the existing login/session/cookie handling.
const welcomeStatePath = () => path.join(app.getPath('userData'), 'welcome-tab.json');
const WELCOME_GUIDE_REVISION = 458;
function showHelpTabsPreference() {
  const saved = readJson(welcomeStatePath(), {});
  // A single 44px Tubeium launcher is the default; the full tab bar is opt-in.
  return !!saved && saved.showHelpTabs === true;
}
function showWelcomeOnStartup() {
  // Opt-in only: Tubeium opens on YouTube. Earlier versions opened this tab at
  // every launch, so values saved by them are ignored; only a choice made with
  // this version's checkbox counts.
  const state = readJson(welcomeStatePath(), {});
  return !!state && state.showOnStartup === true && state.optInRevision === WELCOME_GUIDE_REVISION;
}
function welcomeSender(event) {
  return !!welcomeView && !welcomeView.webContents.isDestroyed() &&
    event.sender === welcomeView.webContents;
}
// The native tab strip remains visible after switching back to YouTube.
// Place it at the bottom so Tubeium does not cover YouTube's own navigation.
const TAB_STRIP_HEIGHT = 42;
const COLLAPSED_TAB_WIDTH = 48;
const COLLAPSED_TAB_HEIGHT = 48;
const TUBEIUM_MENU_WIDTH = 244;
const TUBEIUM_MENU_HEIGHT = 298;
function sizeWelcomeTab() {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  const stripHeight = helpTabsVisible ? TAB_STRIP_HEIGHT : 0;
  if (welcomeView) welcomeView.setBounds({x:0,y:0,width:Math.max(width,1),height:Math.max(1,height-stripHeight)});
  if (tabBarView) {
    // Collapsed: keep an obvious, compact native restore handle instead of hiding
    // the entire strip with no discoverable way back.
    const compactWidth = Math.min(tabMenuOpen ? TUBEIUM_MENU_WIDTH : COLLAPSED_TAB_WIDTH, Math.max(width,1));
    const compactHeight = Math.min(tabMenuOpen ? TUBEIUM_MENU_HEIGHT : COLLAPSED_TAB_HEIGHT, Math.max(height,1));
    tabBarView.setBounds(helpTabsVisible
      ? {x:0,y:Math.max(0,height-TAB_STRIP_HEIGHT),width:Math.max(width,1),height:TAB_STRIP_HEIGHT}
      : {x:Math.max(0,width-compactWidth-12),y:Math.max(0,height-compactHeight-10),
         width:compactWidth,height:compactHeight});
  }
}
function updateHelpTabsVisibility() {
  if (tabBarView && !tabBarView.webContents.isDestroyed()) {
    const available = helpTabsVisible || settings.showSettingsButton !== false || activeTubeiumTab === 'welcome';
    tabBarView.setVisible(!tabBarFullscreen && available);
  }
}
function setHelpTabsVisible(value) {
  helpTabsVisible = value === true;
  tabMenuOpen = false;
  const saved = readJson(welcomeStatePath(), {});
  // When the bar is dismissed, do not reopen the instructions on next launch.
  writeJson(welcomeStatePath(), {
    ...saved, showHelpTabs: helpTabsVisible,
    ...(helpTabsVisible ? {} : {showOnStartup:false}),
  });
  if (!helpTabsVisible && activeTubeiumTab === 'welcome') showYoutubeTab();
  sizeWelcomeTab();
  updateHelpTabsVisibility();
  updateTubeiumTabBar(); // Tell the tab renderer to show its compact restore handle.
  buildMenu(); // Keep the View checkbox synchronized with the native tab strip.
  return {showHelpTabs: helpTabsVisible};
}
function updateTubeiumTabBar() {
  if (tabBarView && !tabBarView.webContents.isDestroyed()) {
    tabBarView.webContents.send('tubeium-tab-state', {tab: activeTubeiumTab, showHelpTabs: helpTabsVisible,
      menuOpen: tabMenuOpen, showSigninHelpButton: settings.showSigninHelpButton !== false});
  }
}
function showYoutubeTab() {
  if(tabMenuOpen){tabMenuOpen=false;sizeWelcomeTab();}
  activeTubeiumTab = 'youtube';
  if (welcomeView) welcomeView.setVisible(false); // keep it available, don't destroy it
  updateTubeiumTabBar();
  if (win && !win.isDestroyed()) win.webContents.focus();
}
function closeWelcomeTab() {
  if (browserPairing) { browserPairing.close(); browserPairing = null; }
  if (!welcomeView) return;
  const old = welcomeView;
  welcomeView = null;
  activeTubeiumTab = 'youtube';
  try { old.setVisible(false); } catch (e) { console.warn('Could not hide welcome tab:', e.message); }
  if (win && !win.isDestroyed()) {
    try { win.contentView.removeChildView(old); } catch (e) { console.warn('Could not detach welcome tab:', e.message); }
  }
  try { if (!old.webContents.isDestroyed()) old.webContents.close(); }
  catch (e) { console.warn('Could not close welcome tab:', e.message); }
  updateTubeiumTabBar();
}
function openWelcomeTab() {
  if (!win || win.isDestroyed()) return;
  // Help is reachable from the compact menu; do not force a second bottom tab bar.
  if(tabMenuOpen){tabMenuOpen=false;sizeWelcomeTab();}
  activeTubeiumTab = 'welcome';
  if (welcomeView) {
    welcomeView.setVisible(true);
    if (tabBarView) win.contentView.addChildView(tabBarView); // tab switcher stays on top
    win.show(); win.focus(); updateTubeiumTabBar();
    return;
  }
  const view = new WebContentsView({webPreferences: {
    preload:path.join(__dirname,'welcome-preload.js'),
    sandbox:true,contextIsolation:true,nodeIntegration:false,
    webSecurity:true,partition:'tubeium-welcome-local',
  }});
  welcomeView = view;
  view.setBackgroundColor('#101019');
  view.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  view.webContents.on('will-navigate',(e,url) => {
    if (url !== view.webContents.getURL()) e.preventDefault();
  });
  // Copying a folder path during setup replaces the code; put it back when the
  // user returns to this tab so Ctrl+V in the extension always pastes the code.
  view.webContents.on('focus', () => { if (!signInRestartPending) copyPairingCode(); });
  win.contentView.addChildView(view);
  sizeWelcomeTab();
  if (tabBarView) win.contentView.addChildView(tabBarView);
  updateTubeiumTabBar();
  view.webContents.loadFile(path.join(__dirname,'welcome.html')).catch(error=>{
    console.error('Could not open Tubeium Welcome tab:',error.message);
    closeWelcomeTab();
  });
}
function openTubeiumTabBar() {
  if (!win || win.isDestroyed() || tabBarView) return;
  const view = new WebContentsView({webPreferences:{
    preload:path.join(__dirname,'tab-strip-preload.js'),
    sandbox:true,contextIsolation:true,nodeIntegration:false,
    webSecurity:true,partition:'tubeium-tabbar-local',
  }});
  tabBarView = view;
  view.setBackgroundColor('#00000000');
  updateHelpTabsVisibility();
  view.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  view.webContents.on('will-navigate', e=>e.preventDefault());
  win.contentView.addChildView(view);
  sizeWelcomeTab();
  view.webContents.on('did-finish-load',updateTubeiumTabBar);
  view.webContents.loadFile(path.join(__dirname,'tab-strip.html')).catch(error=>console.warn('Could not load tab strip:',error.message));
}
ipcMain.on('tubeium-tab-switch',(event,tab)=>{
  if (!tabBarView || tabBarView.webContents.isDestroyed() || event.sender!==tabBarView.webContents) return;
  if (tab==='youtube') showYoutubeTab();
  else if (tab==='welcome') openWelcomeTab();
});
ipcMain.on('tubeium-tab-hide', event => {
  if (!tabBarView || tabBarView.webContents.isDestroyed() || event.sender!==tabBarView.webContents) return;
  setHelpTabsVisible(false);
});
ipcMain.on('tubeium-tab-show', event => {
  if (!tabBarView || tabBarView.webContents.isDestroyed() || event.sender!==tabBarView.webContents) return;
  setHelpTabsVisible(true);
});
// Each native Tubeium launcher command is restricted to the local tab strip.
function trustedTabEvent(event){return !!tabBarView && !tabBarView.webContents.isDestroyed() && event.sender===tabBarView.webContents;}
function closeTabMenu(){if(!tabMenuOpen)return;tabMenuOpen=false;sizeWelcomeTab();updateTubeiumTabBar();}
ipcMain.on('tubeium-tab-menu-toggle',event=>{
  if(!trustedTabEvent(event))return;
  tabMenuOpen=!tabMenuOpen && !helpTabsVisible;
  sizeWelcomeTab();updateTubeiumTabBar();
});
ipcMain.on('tubeium-tab-open-settings',event=>{
  if(!trustedTabEvent(event))return;
  closeTabMenu();openSettings();
});
ipcMain.on('tubeium-tab-open-downloads',event=>{
  if(!trustedTabEvent(event))return;
  closeTabMenu();openDownloadManager();
});
ipcMain.handle('welcome-get-state', (event) => {
  if (!welcomeSender(event)) throw new Error('Not a Tubeium welcome tab');
  return {showOnStartup:showWelcomeOnStartup(), showHelpTabs:helpTabsVisible, browserLabel:browserLabelForHelp(), codeReady:!!browserPairing};
});
ipcMain.handle('welcome-set-startup', (event, value) => {
  if (!welcomeSender(event) || typeof value !== 'boolean') throw new Error('Invalid welcome setting');
  writeJson(welcomeStatePath(),{...readJson(welcomeStatePath(),{}), showOnStartup:value,optInRevision:WELCOME_GUIDE_REVISION});
  return {showOnStartup:value};
});
ipcMain.handle('welcome-set-tabs-visible', (event, value) => {
  if (!welcomeSender(event) || typeof value !== 'boolean') throw new Error('Invalid tab visibility setting');
  return setHelpTabsVisible(value);
});
// Switching tabs hides the Welcome view but keeps its native tab available.
ipcMain.handle('welcome-navigate', async (event, target) => {
  if (!welcomeSender(event)) throw new Error('Not a Tubeium welcome tab');
  if (target === 'youtube') {
    showYoutubeTab();
    return {opened:true};
  }
  if (target === 'open-browser') {
    return openYouTubeInDefaultBrowser();
  }
  throw new Error('Unsupported Tubeium navigation');
});
// Every help-tab button reports back, so the tab can say what happened.
ipcMain.handle('welcome-action', async (event, action) => {
  if (!welcomeSender(event)) throw new Error('Not a Tubeium help tab');
  if (!['extensions','folder','copy'].includes(action)) throw new Error('Unsupported Tubeium action');
  if (action === 'folder') {
    // Do not overwrite the pairing code on the clipboard with the folder path.
    // Showing the folder is sufficient for Load unpacked; the code remains ready.
    const folder = browserHelperFolder();
    const err = await shell.openPath(folder);
    return {opened:!err, copied:false, instructions: err
      ? `Could not open the extension folder. It is located at: ${folder}`
      : 'The Tubeium extension folder is open. In Load unpacked, select this same folder. Your pairing code is still copied.'};
  }
  const pairing = await ensureBrowserPairing();
  if (!pairing.ok) return {opened:false, instructions:`Could not create a sign-in code: ${pairing.error}`};
  if (action === 'copy') return {copied:true, instructions:'Code copied again. Paste it (Ctrl+V) into the Tubeium extension if its box is empty.'};
  const result = await openPreferredBrowserExtensions();
  return {...result, copied:true, instructions: `${result.instructions} Your one-time code is copied.`};
});

// ---- Account: original player, two local sign-in methods only ----
// This intentionally does not access Chrome profiles or send credentials to any service.
let loginWindow = null;
let pendingSignInNotice = null;
const pendingSignInCheckFile = () => path.join(app.getPath('userData'), 'pending-signin-check.json');
function clearSignInFailureNotice() {
  pendingSignInNotice = null;
  if (win && !win.isDestroyed()) win.webContents.send('tubeium-signin-recovery-clear');
}
function notifySignInFailure(reason) {
  if (!reason || !win || win.isDestroyed()) return;
  const notice = { reason, message: messageFor(reason) };
  pendingSignInNotice = notice;
  if (!win.webContents.isLoadingMainFrame()) {
    win.webContents.send('tubeium-signin-recovery', notice);
  }
  if (!win.isVisible()) win.show();
}
function markImportedSessionForVerification() {
  // A timestamp-only marker. Authentication material is NEVER copied here.
  writeJson(pendingSignInCheckFile(), { started: Date.now() });
}
async function verifyImportedSessionOnce() {
  const marker = readJson(pendingSignInCheckFile(), null);
  if (!marker || !Number.isFinite(marker.started)) return;
  // Remove before checking, so the warning never loops between restarts.
  try { fs.unlinkSync(pendingSignInCheckFile()); } catch {}
  if (Date.now() - marker.started > 10 * 60 * 1000) return;
  if (!win || win.isDestroyed()) return;
  win.webContents.once('did-finish-load', () => setTimeout(async () => {
    if (!win || win.isDestroyed()) return;
    try {
      const result = await win.webContents.executeJavaScript(`(() => {
        if (location.hostname !== 'www.youtube.com') return { signedOut:false };
        const avatar = !!document.querySelector('ytd-topbar-menu-button-renderer #avatar-btn, ytd-masthead button#avatar-btn, ytd-masthead yt-avatar-shape');
        const signInLink = !!document.querySelector('a[href*="ServiceLogin"], a[href*="accounts.google.com/ServiceLogin"], ytd-button-renderer a[href*="/signin"]');
        return { signedOut: !avatar && signInLink };
      })()`, true);
      if (result?.signedOut) notifySignInFailure('session-unconfirmed');
    } catch { /* Avoid false failure reports when YouTube changes layout. */ }
  }, 10000));
}
function safeLoginUrl(raw) {
  if (raw === 'about:blank') return true; // Google may create a blank OAuth popup first.
  try { const u = new URL(raw); return u.protocol === 'https:' && LOGIN_HOST.test(u.hostname); }
  catch { return false; }
}
function safeExternalUrl(raw) {
  try { const u = new URL(raw); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
}
function setupLoginWindow(child) {
  loginWindow = child;
  child.webContents.setUserAgent(win?.webContents.getUserAgent() || session.defaultSession.getUserAgent());
  child.setMenuBarVisibility(false);
  child.webContents.setWindowOpenHandler(({ url }) => {
    // Do not allow arbitrary nested windows or insecure redirects.
    return { action: 'deny' };
  });
  child.webContents.on('will-navigate', (event, url) => {
    if (!safeLoginUrl(url)) event.preventDefault();
  });
  child.webContents.on('will-redirect', (event, url) => {
    if (!safeLoginUrl(url)) event.preventDefault();
  });
  // OAuth failures can appear as regular HTML with HTTP 200. Detect only
  // explicit unsupported-browser wording, never generic sign-in pages.
  let failureNotified = false;
  child.webContents.on('did-finish-load', () => {
    const url = child.webContents.getURL();
    if (!isSignInLocation(url)) return;
    const inspect = async () => {
      if (failureNotified || child.isDestroyed()) return;
      try {
        const signal = await child.webContents.executeJavaScript(GOOGLE_ERROR_SCAN, true);
        const reason = classifyFailure({url:child.webContents.getURL(), signal});
        if (reason) {failureNotified = true; notifySignInFailure(reason);}
      } catch { /* Google pages may prevent inspection; do not interfere. */ }
    };
    setTimeout(inspect, 750);
    setTimeout(inspect, 2400);
  });
  child.webContents.on('did-fail-load', (_event, code, _description, url, isMainFrame) => {
    if (failureNotified || !isMainFrame) return;
    const reason = classifyFailure({url,code});
    if (reason) {failureNotified = true; notifySignInFailure(reason);}
  });
  child.on('closed', async () => {
    if (loginWindow === child) loginWindow = null;
    try { await session.defaultSession.cookies.flushStore(); } catch {}
    if (win && !win.isDestroyed()) win.webContents.reload();
  });
}
// An always-available sign-in choice. Users see the Chrome/Edge alternative
// *before* attempting Google's embedded browser; no error detection required.
function openGoogleSignIn() {
  clearSignInFailureNotice();
  if (loginWindow && !loginWindow.isDestroyed()) { loginWindow.focus(); return; }
  const child = new BrowserWindow({
    parent: win || undefined, width: 520, height: 740, minWidth: 400, minHeight: 450,
    title: 'Tubeium · Sign in', icon: ICON, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  setupLoginWindow(child);
  child.loadURL('https://www.youtube.com/signin?next=%2F').catch(() => {});
}
async function importExistingLogin() {
  const info = await dialog.showMessageBox(win, {
    type: 'warning', buttons: ['Choose cookies.txt', 'Cancel'], defaultId: 1, cancelId: 1,
    title: 'Import your own YouTube sign-in',
    message: 'Use a cookies.txt you exported yourself from a browser where YouTube is signed in.',
    detail: 'The file contains sensitive account session tokens. Only import your own account, never share or upload the file, and delete the export securely afterwards. Google may reject imported sessions. Nothing is sent to Tubeium servers.',
  });
  if (info.response !== 0) return;
  const picked = await dialog.showOpenDialog(win, {
    title: 'Choose Netscape-format cookies.txt',
    properties: ['openFile'], filters: [{ name: 'Netscape cookies.txt', extensions: ['txt'] }],
  });
  if (picked.canceled || !picked.filePaths[0]) return;
  try {
    const filename = picked.filePaths[0];
    if (fs.statSync(filename).size > MAX_FILE_BYTES) throw new Error('File exceeds the 3 MB size limit');
    const text = fs.readFileSync(filename, 'utf8');
    const result = await importCookies(session.defaultSession.cookies, text);
    const done = await dialog.showMessageBox(win, {
      type: result.added ? 'info' : 'warning', buttons: ['OK'],
      title: 'YouTube sign-in import',
      message: `${result.added} YouTube/Google cookies imported. ${result.failed} were rejected.`,
      detail: result.added ? 'Tubeium will restart automatically to load the imported session. The import does not guarantee that Google will accept the sign-in.' : 'No usable session cookies were imported. Tubeium will stay open.',
      ...(result.added ? {checkboxLabel:'Delete this cookies.txt file now (optional)',checkboxChecked:false} : {}),
    });
    // Never delete a user-selected file unless they explicitly opt in.
    if (result.added > 0 && done.checkboxChecked) {
      try { fs.unlinkSync(filename); } catch (error) { console.warn('Cookie export could not be deleted:', error.message); }
    }
    if (result.added > 0) markImportedSessionForVerification();
    else notifySignInFailure('import-empty');
    restartAfterSignInImport(result.added);
  } catch (error) {
    await dialog.showMessageBox(win, { type: 'error', title: 'Could not import sign-in', message: String(error.message || error) });
  }
}

function browserHelperFolder() {
  return app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'browser-login-once') : path.join(__dirname, 'browser-login-once');
}

// A temporary, local-only browser sign-in bridge. This only affects the
// account flow; the original Tubeium player and all other features are intact.
let browserPairing = null;
let signInRestartPending = false;
// Import means the session was stored locally, not necessarily accepted by Google.
// Flush completes before either import callback reaches this function.
function restartAfterSignInImport(imported) {
  if (!(Number(imported) > 0) || signInRestartPending) return false;
  signInRestartPending = true;
  // Allow the browser helper to receive its HTTP response and show completion.
  setTimeout(() => {
    try {
      if (browserPairing) { browserPairing.close(); browserPairing = null; }
      app.relaunch();
      quitting = true; // Do not minimize to the tray while the app is quitting.
      app.quit();
    } catch (err) {
      signInRestartPending = false;
      console.error('Tubeium could not restart after sign-in import:', err.message);
    }
  }, 1800);
  return true;
}

// Chrome-family browsers do not allow ordinary applications to silently install
// extensions. We take the user to the browser's normal, visible setup page.
function findInstalledBrowser(browser) {
  if (process.platform !== 'win32') return null;
  const folders = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'], 'C:\\Program Files', 'C:\\Program Files (x86)'].filter(Boolean);
  const relative = {
    brave: 'BraveSoftware/Brave-Browser/Application/brave.exe',
    chrome: 'Google/Chrome/Application/chrome.exe',
    edge: 'Microsoft/Edge/Application/msedge.exe',
  }[browser];
  if (!relative) return null;
  const normal = folders.map(folder => path.join(folder,relative)).find(file => fs.existsSync(file));
  if (normal) return normal;
  // Support browsers installed in a nonstandard folder via Windows App Paths.
  const executable = {brave:'brave.exe',chrome:'chrome.exe',edge:'msedge.exe'}[browser];
  for (const hive of ['HKCU','HKLM']) {
    try {
      const result = spawnSync('reg.exe',['query',`${hive}\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${executable}`,'/ve'],
        {encoding:'utf8',timeout:1500,windowsHide:true});
      const match = String(result.stdout||'').match(/REG_SZ\s+([^\r\n]+)/i);
      const candidate=match?.[1]?.trim().replace(/^"|"$/g,'');
      if (candidate && fs.existsSync(candidate) && path.basename(candidate).toLowerCase()===executable) return candidate;
    } catch {/* optional registry lookup */}
  }
  return null;
}
// The browser Windows is really set to use (see default-browser.js). Tubeium
// launches that browser's own program instead of asking Windows to pick one,
// which is how links used to end up in Edge.
const defaultBrowserIo = {
  env: process.env,
  exists: file => { try { return fs.existsSync(file); } catch { return false; } },
  query: (key, valueName) => {
    try {
      return spawnSync('reg.exe', ['query', key, ...(valueName ? ['/v', valueName] : ['/ve'])],
        {encoding:'utf8', timeout:1500, windowsHide:true}).stdout || '';
    } catch { return ''; }
  },
};
function windowsDefaultBrowser() {
  if (process.platform !== 'win32') return null;
  try {
    const selected = resolveDefaultBrowser(defaultBrowserIo);
    if (!selected) return null;
    // Some Brave/Chrome installations register the user's HTTPS choice but not
    // the HKCR open command. Look up that SAME chosen browser's executable;
    // never silently substitute Edge for a Brave (or Chrome) selection.
    if (!selected.exe && ['brave', 'chrome', 'edge'].includes(selected.id)) {
      const exe = findInstalledBrowser(selected.id);
      if (exe) return {...selected, exe, command: `"${exe}" "%1"`};
    }
    return selected;
  } catch { return null; }
}
// The helper extension only runs in Chrome-family browsers. Use the default
// browser when it is one; otherwise another installed one (Edge only as a last resort).
function extensionBrowser() {
  const def = windowsDefaultBrowser();
  if (def && CHROMIUM_BASED.has(def.id) && def.exe) return {id:def.id, label:def.label, exe:def.exe, isDefault:true};
  for (const id of ['brave','chrome','edge']) {
    const exe = findInstalledBrowser(id);
    if (exe) return {id, label:LABELS[id], exe, isDefault:false, defaultLabel:def?.label||''};
  }
  return null;
}
function browserLabelForHelp() {
  const def = windowsDefaultBrowser();
  if (def && CHROMIUM_BASED.has(def.id)) return def.label;
  return extensionBrowser()?.label || 'your browser';
}
function openBrowserExecutable(exe, args) {
  return new Promise(resolve => {
    try {
      const child=spawn(exe,Array.isArray(args)?args:[args],{detached:true,stdio:'ignore',windowsHide:true});
      child.once('error',()=>resolve(false));
      child.once('spawn',()=>{child.unref();resolve(true);});
    } catch {resolve(false);}
  });
}
// The one-time sign-in browser must NOT reuse the user's regular browser profile.
// Both guide actions share this empty profile so Load unpacked + Google sign-in
// happen in the same browser context. A new Tubeium process gets a new profile.
let cleanSignInBrowser = null;
function cleanSignInTarget() {
  if (cleanSignInBrowser) return cleanSignInBrowser;
  const selected = extensionBrowser();
  if (!selected || !CHROMIUM_BASED.has(selected.id) || !selected.exe) return null;
  const profile = createCleanProfile();
  cleanSignInBrowser = { ...selected, profile };
  return cleanSignInBrowser;
}
async function openCleanSignInPage(address) {
  const target = cleanSignInTarget();
  if (!target) return {opened:false, instructions:'Tubeium could not locate a Chromium browser. Set Brave or Chrome as your default browser, then retry.'};
  const url = address === 'extensions' ? EXTENSIONS_URL[target.id] : 'https://www.youtube.com';
  if (!url) return {opened:false, instructions:'This browser cannot load the Tubeium extension.'};
  const args = chromiumProfileArgs(target.profile, url);
  if (!await openBrowserExecutable(target.exe, args)) {
    return {opened:false, instructions:`Could not open a private ${target.label} profile. Your normal browser and accounts were not changed.`};
  }
  const substituted = target.isDefault || !target.defaultLabel ? '' :
    ` Your Windows default (${target.defaultLabel}) does not support this extension, so ${target.label} is being used for both steps.`;
  return {opened:true, browser:target.label,
    instructions: address === 'extensions'
      ? `Opened Extensions in the clean ${target.label} browser session. Enable Developer mode, choose Load unpacked, then select the Tubeium extension folder. Return to the YouTube tab after installing.${substituted}`
      : `Opened YouTube in a clean ${target.label} window that starts signed out. Keep it open and open its Extensions page as shown in step 2, then return to YouTube to sign in and transfer.${substituted}`};
}
async function openBrowserExtensions() { return openCleanSignInPage('extensions'); }
function openPreferredBrowserExtensions() { return openBrowserExtensions(); }
async function openYouTubeInDefaultBrowser() { return openCleanSignInPage('youtube'); }

// ---- One-time pairing code, shown and explained in the Sign-in Help tab ----
const PAIRING_TTL = 20 * 60 * 1000; // Allow time for first-time helper installation.
function copyPairingCode() {
  if (browserPairing) clipboard.writeText(`${browserPairing.port}:${browserPairing.code}`);
}
function sendToHelpTab(channel, payload) {
  if (welcomeView && !welcomeView.webContents.isDestroyed()) welcomeView.webContents.send(channel, payload);
}
// Returns {ok:true} once a fresh code is listening and copied, else {ok:false,error}.
async function ensureBrowserPairing() {
  clearSignInFailureNotice();
  if (browserPairing && Date.now() < browserPairing.expiresAt - 5000) { copyPairingCode(); return {ok:true}; }
  if (browserPairing) { browserPairing.close(); browserPairing = null; }
  try {
    const pairing = await startTransfer({
      ttl: PAIRING_TTL,
      cookieJar: session.defaultSession.cookies,
      onImported: async ({ imported, rejected }) => {
        browserPairing = null;
        if (imported > 0) markImportedSessionForVerification();
        else notifySignInFailure('import-empty');
        // Show the result in the help tab; Tubeium restarts a moment later.
        if (welcomeView) { openWelcomeTab(); sendToHelpTab('welcome-signin-completed', { imported, rejected }); }
        restartAfterSignInImport(imported);
        // An imported session may still be rejected by Google after relaunch.
      },
    });
    pairing.expiresAt = Date.now() + PAIRING_TTL;
    browserPairing = pairing;
    copyPairingCode();
    return {ok:true};
  } catch (error) {
    return {ok:false, error:String(error.message || error)};
  }
}
// Used by the Player menu and the notice on the YouTube page: start a code and
// show the instructions in their own tab (never in a separate window).
async function openBrowserAssistedSignIn() {
  const result = await ensureBrowserPairing();
  if (!result.ok) {
    await dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, {
      type: 'error', title: 'Browser sign-in setup failed', message: result.error,
    });
    return;
  }
  openWelcomeTab();
}

// The notice may only invoke the existing browser-assisted sign-in guide.
ipcMain.on('tubeium-open-browser-signin', event => {
  if (!ytOnly(event)) return;
  void openBrowserAssistedSignIn();
});
ipcMain.on('tubeium-dismiss-signin-notice', event => {
  if (ytOnly(event)) pendingSignInNotice = null;
});

// URLs from the embedded site never silently open external applications when confirmation is enabled.
function openExternalWithConsent(raw) {
  if(!safeExternalUrl(raw)) return false;
  if(settings.confirmExternalLinks){
    const opts={
      type:'question',buttons:['Cancel','Open in browser'],defaultId:0,cancelId:0,
      title:'Open external website?',message:'Leave Tubeium for an external website?',detail:raw.slice(0,450)
    };
    const decision = win && !win.isDestroyed()?dialog.showMessageBoxSync(win,opts):dialog.showMessageBoxSync(opts);
    if(decision!==1) return false;
  }
  shell.openExternal(raw).catch(()=>{});return true;
}
// Electron permissions are not implied by simply being signed in to Google.
function setupWebsitePermissions() {
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback,details)=>{
    callback(websitePermission(permission,details?.requestingUrl || wc?.getURL?.() || '',settings));
  });
  session.defaultSession.setPermissionCheckHandler((_wc,permission,origin,details)=>{
    return websitePermission(permission,details?.requestingUrl || origin || '',settings);
  });
}
// Local-only library, explicitly independent of YouTube's account and cookies.
function openLocalLibrary(){
  if(libraryWindow&&!libraryWindow.isDestroyed()){libraryWindow.show();libraryWindow.focus();return;}
  libraryWindow=new BrowserWindow({width:1090,height:800,minWidth:650,minHeight:530,title:'Tubeium · Local Library',backgroundColor:'#10101a',icon:ICON,autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'library-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  libraryWindow.loadFile(path.join(__dirname,'library.html'));
  libraryWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  libraryWindow.webContents.on('will-navigate',e=>e.preventDefault());
  libraryWindow.on('closed',()=>{libraryWindow=null;});
}
// Offline player is a local, isolated Electron window. Only entries previously
// recorded by Download Studio can become media URLs.
function openOfflinePlayer(jobId,index=0){
  const selected=findOfflineMedia(jobs,jobId,index);
  offlineSelection={...selected,autoplay:!!settings.autoPlayOffline};
  if(offlineWindow && !offlineWindow.isDestroyed()){offlineWindow.show();offlineWindow.focus();offlineWindow.reload();return;}
  offlineWindow=new BrowserWindow({width:1000,height:690,minWidth:500,minHeight:360,
    title:'Tubeium · Offline Player',backgroundColor:'#0b0c13',icon:ICON,autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'offline-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  offlineWindow.loadFile(path.join(__dirname,'offline-player.html'));
  offlineWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  offlineWindow.webContents.on('will-navigate',e=>e.preventDefault());
  offlineWindow.on('closed',()=>{offlineWindow=null;offlineSelection=null;});
}
function offlineOnly(e){return !!offlineWindow&&!offlineWindow.isDestroyed()&&e.sender===offlineWindow.webContents;}
ipcMain.handle('offline-init',e=>{if(!offlineOnly(e)||!offlineSelection)throw new Error('Forbidden');return offlineSelection;});
ipcMain.handle('offline-external',e=>{if(!offlineOnly(e)||!offlineSelection)throw new Error('Forbidden');return shell.openPath(offlineSelection.file);});
function libOnly(e){return !!libraryWindow&&!libraryWindow.isDestroyed()&&e.sender===libraryWindow.webContents;}
const requireLibrary=()=>{if(!libraryStore)throw new Error('Library not ready');return libraryStore;};
ipcMain.handle('library-init',e=>{if(!libOnly(e))throw new Error('Forbidden');return {accent:settings.accentColor,fontPercent:settings.dashboardFontSize,defaultSort:settings.librarySort};});
ipcMain.handle('library-offline-list',e=>{if(!libOnly(e))throw new Error('Forbidden');return jobs.filter(j=>j.status==='completed').flatMap(j=>playableFiles(j).map((file,i)=>({id:j.id,index:i,title:path.basename(file),scope:j.scope})));});
ipcMain.handle('library-offline-open',(e,id,index)=>{if(!libOnly(e))throw new Error('Forbidden');openOfflinePlayer(id,index);return true;});
ipcMain.handle('library-list',(e,filter,query)=>{if(!libOnly(e))throw new Error('Forbidden');return requireLibrary().list(['all','bookmarks','continue'].includes(filter)?filter:'all',query);});
ipcMain.handle('library-open',(e,id)=>{if(!libOnly(e)||!validId(id))throw new Error('Invalid request');showWindow();win.loadURL('https://www.youtube.com/watch?v='+id);return true;});
ipcMain.handle('library-remove',(e,id)=>{if(!libOnly(e))throw new Error('Forbidden');return requireLibrary().remove(id);});
ipcMain.handle('library-clear',(e,mode)=>{if(!libOnly(e)||!['history','all'].includes(mode))throw new Error('Forbidden');return requireLibrary().clear(mode);});
ipcMain.handle('library-settings',e=>{if(!libOnly(e))throw new Error('Forbidden');openSettings();return true;});
ipcMain.handle('library-export',async e=>{
  if(!libOnly(e))throw new Error('Forbidden');
  const result=await dialog.showSaveDialog(libraryWindow,{title:'Export local Tubeium library',defaultPath:path.join(app.getPath('documents'),'tubeium-library.json'),filters:[{name:'JSON',extensions:['json']}]});
  if(result.canceled||!result.filePath)return false;
  fs.writeFileSync(result.filePath,JSON.stringify(requireLibrary().export(),null,2));return true;
});
ipcMain.handle('library-import',async e=>{
  if(!libOnly(e))throw new Error('Forbidden');
  const result=await dialog.showOpenDialog(libraryWindow,{title:'Import local Tubeium library',properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});
  if(result.canceled||!result.filePaths[0])return 0;
  if(fs.statSync(result.filePaths[0]).size>1500000)throw new Error('Library file exceeds 1.5 MB');
  const data=JSON.parse(fs.readFileSync(result.filePaths[0],'utf8'));
  if(data?.type!=='local-library'||!Array.isArray(data.items))throw new Error('Not a Tubeium library export');
  return requireLibrary().import(data);
});

// Local playlists are stored separately from YouTube subscriptions and login data.
function requirePlaylists(){if(!playlistStore)throw new Error('Playlists not ready');return playlistStore;}
ipcMain.handle('library-playlists',e=>{if(!libOnly(e))throw new Error('Forbidden');return requirePlaylists().list();});
ipcMain.handle('library-playlist-create',(e,name)=>{if(!libOnly(e)||typeof name!=='string'||name.length>90)throw new Error('Invalid name');return requirePlaylists().create(name);});
ipcMain.handle('library-playlist-rename',(e,id,name)=>{if(!libOnly(e)||typeof name!=='string'||name.length>90)throw new Error('Invalid name');return requirePlaylists().rename(id,name);});
ipcMain.handle('library-playlist-delete',(e,id)=>{if(!libOnly(e))throw new Error('Forbidden');return requirePlaylists().delete(id);});
ipcMain.handle('library-playlist-add',(e,id,video)=>{if(!libOnly(e))throw new Error('Forbidden');return requirePlaylists().add(id,video);});
ipcMain.handle('library-playlist-remove',(e,id,video)=>{if(!libOnly(e))throw new Error('Forbidden');return requirePlaylists().remove(id,video);});
ipcMain.handle('library-record',(e,record)=>{
 if(!ytOnly(e)||!settings.localLibraryEnabled||!settings.recordWatchProgress)return null;
 if(!validId(record?.id))return null;
 return requireLibrary().record(record);
});
ipcMain.handle('library-bookmark',(e,record)=>{
 if(!ytOnly(e)||!settings.localLibraryEnabled||!validId(record?.id))return null;
 return requireLibrary().bookmark(record);
});
ipcMain.handle('library-position',(e,id)=>{
 if(!ytOnly(e)||!settings.localLibraryEnabled||!validId(id))return null;
 const record=requireLibrary().get(id);
 return record?{position:record.position,duration:record.duration,bookmarked:record.bookmarked}:null;
});
ipcMain.on('open-local-library',e=>{if(ytOnly(e))openLocalLibrary();});
ipcMain.handle('player-screenshot',async(e)=>{
 if(!ytOnly(e)||!settings.showScreenshotButton||!win||win.isDestroyed())throw new Error('Screenshots are disabled');
 const file=await dialog.showSaveDialog(win,{title:'Save Tubeium screenshot',defaultPath:path.join(app.getPath('pictures'),'Tubeium-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png'),filters:[{name:'PNG image',extensions:['png']}]});
 if(file.canceled||!file.filePath)return false;
 const capture=await win.webContents.capturePage();if(capture.isEmpty())throw new Error('Screenshot could not be captured');
 fs.writeFileSync(file.filePath,capture.toPNG());return true;
});
// Community titles are opt-in. Only approved titles are used; failed requests don't replace anything.
const dearrowCache=new Map();
ipcMain.handle('dearrow-title',async(e,id)=>{
 if(!ytOnly(e)||!settings.dearrowTitles||!validId(id))return null;
 const cached=dearrowCache.get(id);if(cached&&Date.now()-cached.at<1800000)return cached.title;
 let title=null;
 try{
   const res=await net.fetch('https://sponsor.ajay.app/api/branding?videoID='+id);
   if(res.ok){const data=await res.json();title=communityTitle(data);}
 }catch{}
 dearrowCache.set(id,{at:Date.now(),title});if(dearrowCache.size>250)dearrowCache.delete(dearrowCache.keys().next().value);
 return title;
});
// ---- Window ----
function createWindow() {
  helpTabsVisible = showHelpTabsPreference();
  tabBarFullscreen = false;
  const st = settings.rememberWindow ? readJson(stateFile(), {}) : {};
  win = new BrowserWindow({
    width: st.width || 1280,
    height: st.height || 800,
    x: st.x,
    y: st.y,
    minWidth: 320,
    minHeight: 180,
    backgroundColor: '#0f0f0f',
    show: !settings.startMinimized,
    icon: ICON,
    title: 'Tubeium',
    fullscreen: !!settings.startFullscreen,
    alwaysOnTop: !!settings.startAlwaysOnTop,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Give the early page filter the current saved preference before YouTube loads.
      additionalArguments: ['--tubeium-ad-block=' + (settings.blockAds ? 'on' : 'off')],
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false, // keeps playback smooth when minimized/hidden
    },
  });
  if (st.maximized) win.maximize();

  // Present as a normal Chrome browser (helps with Google sign-in checks)
  const ua = session.defaultSession.getUserAgent()
    .replace(/\s*Electron\/\S+/, '')
    .replace(/\s*(?:youplus-pc|tubeium)\/\S+/i, '');
  win.webContents.setUserAgent(ua);

  if (!adBlockInstalled) {
    adBlockInstalled = true;
    // Third-party ad domains only. In-video ads are handled inside the page (preload.js).
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: [
        '*://*.doubleclick.net/*', '*://*.googlesyndication.com/*', '*://*.googleadservices.com/*',
        '*://*.googletagservices.com/*', '*://*.2mdn.net/*', '*://pagead2.googlesyndication.com/*',
        '*://*.youtube.com/pagead/*', '*://*.youtube.com/api/stats/ads*', '*://*.google.com/pagead/*',
      ] },
      (details, cb) => cb({ cancel: !!settings.blockAds })
    );
  }

  win.loadURL(startupUrl());
  win.webContents.on('did-finish-load', () => {
    if (!win || win.isDestroyed()) return;
    win.webContents.setZoomFactor(settings.pageZoom / 100);
    if (pendingSignInNotice && /^https:\/\/www\.youtube\.com(?:\/|$)/.test(win.webContents.getURL())) {
      win.webContents.send('tubeium-signin-recovery', pendingSignInNotice);
    }
  });

  // Keep navigation inside YouTube/Google; send everything else to the real browser
  const route = (url) => {
    try {
      const host = new URL(url).hostname;
      if (ALLOWED_HOST.test(host)) return true;
    } catch { /* fall through */ }
    if (settings.externalLinks && /^https?:\/\//i.test(url)) openExternalWithConsent(url);
    return false;
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (safeLoginUrl(url)) {
      // Preserve window.opener and the shared Electron session. Replacing the
      // player navigation used to break Google's multi-step login flows.
      return { action: 'allow', overrideBrowserWindowOptions: {
        width: 520, height: 740, minWidth: 400, minHeight: 450,
        title: 'Tubeium · Sign in', icon: ICON, autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
      } };
    }
    // Preserve original handling of external links.
    if (settings.externalLinks && safeExternalUrl(url)) openExternalWithConsent(url);
    return { action: 'deny' };
  });
  win.webContents.on('did-create-window', setupLoginWindow);
  win.webContents.on('will-navigate', (e, url) => {
    if (!route(url)) e.preventDefault();
  });

  // Remember window size/position
  let timer;
  const saveBounds = () => {
    if (mini || !settings.rememberWindow) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      writeJson(stateFile(), { ...win.getNormalBounds(), maximized: win.isMaximized() });
    }, 400);
  };
  win.on('resize', saveBounds);
  win.on('move', saveBounds);

  // Close button hides to tray so audio keeps playing
  win.on('close', (e) => {
    if (!quitting && settings.closeToTray) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('hide', () => { if (settings.autoPauseOnHide) pausePlayback(); });
  win.on('minimize', () => { if (settings.autoPauseOnHide) pausePlayback(); });
  win.on('blur', () => { if (settings.pauseOnBlur) pausePlayback(); });
  win.on('resize', sizeWelcomeTab);
  win.on('enter-html-full-screen', () => { tabBarFullscreen = true; updateHelpTabsVisibility(); });
  win.on('leave-html-full-screen', () => { tabBarFullscreen = win.isFullScreen(); updateHelpTabsVisibility(); });
  win.on('enter-full-screen', () => { tabBarFullscreen = true; updateHelpTabsVisibility(); });
  win.on('leave-full-screen', () => { tabBarFullscreen = false; updateHelpTabsVisibility(); });
  win.on('closed', () => { closeWelcomeTab(); tabBarView = null; win = null; });
  // Tubeium always opens on YouTube. The Sign-in Help tab sits beside it in the
  // tab strip and only opens when asked (or if the user opted in at launch).
  openTubeiumTabBar();
  if (showWelcomeOnStartup()) openWelcomeTab();
}

// ---- Mini player / always on top ----
function toggleMini() {
  if (!win) return;
  if (welcomeView) showYoutubeTab();
  if (!mini) {
    normalBounds = win.getBounds();
    if (win.isMaximized()) win.unmaximize();
    mini = true;
    const wa = screen.getDisplayMatching(win.getBounds()).workArea;
    const w = settings.miniWidth, h = Math.round(w * 9 / 16 + 30);
    win.setAspectRatio(16 / 9);
    const left = settings.miniCorner?.endsWith('left');
    const top = settings.miniCorner?.startsWith('top');
    win.setBounds({x:left?wa.x+20:wa.x+wa.width-w-20,y:top?wa.y+20:wa.y+wa.height-h-20,width:w,height:h});
    if (process.platform==='win32') win.setOpacity(settings.miniOpacity/100);
    win.setAlwaysOnTop(true, 'floating');
    win.setMenuBarVisibility(false);
  } else {
    mini = false;
    win.setAspectRatio(0);
    if (process.platform==='win32') win.setOpacity(1);
    win.setAlwaysOnTop(false);
    if (normalBounds) win.setBounds(normalBounds);
  }
  if (tabBarView) tabBarView.setVisible(!mini);
  sendState();
  buildMenu();
}

function toggleTop() {
  if (!win) return;
  win.setAlwaysOnTop(!win.isAlwaysOnTop(), 'floating');
  buildMenu();
}

const pausePlayback = () => win && !win.isDestroyed() && win.webContents.executeJavaScript("(()=>{const v=document.querySelector('video');if(v && !v.paused)v.pause();})()").catch(() => {});
const playPause = () => win && win.webContents.executeJavaScript(
  "(()=>{const v=document.querySelector('video');if(v){v.paused?v.play():v.pause();}})()"
);

function showWindow() {
  if (!win) createWindow();
  win.show();
  win.focus();
}

// Release updates are available only after the publisher has configured a
// GitHub Releases feed (resources/app-update.yml). No guessed repository URL.
let updateClient=null;
function releaseFeedConfigured(){return app.isPackaged && fs.existsSync(path.join(process.resourcesPath,'app-update.yml'));}
function getUpdateClient(){
 if(!releaseFeedConfigured())return null;
 if(updateClient)return updateClient;
 try {
  const {autoUpdater}=require('electron-updater');
  autoUpdater.autoDownload=!!settings.autoDownloadUpdates;
  autoUpdater.autoInstallOnAppQuit=false;
  autoUpdater.on('update-available',info=>{
   if(!settings.autoDownloadUpdates)dialog.showMessageBox({type:'info',title:'Tubeium update',message:`Version ${info.version} is available.`,detail:'Use Player → Check App Updates to download when ready.'});
  });
  autoUpdater.on('update-downloaded',async info=>{
   const r=await dialog.showMessageBox({type:'question',buttons:['Later','Install and restart'],defaultId:0,cancelId:0,title:'Tubeium update downloaded',message:`Version ${info.version} is ready to install.`});
   if(r.response===1)autoUpdater.quitAndInstall(false,true);
  });
  autoUpdater.on('error',err=>console.warn('Update error:',err.message));
  updateClient=autoUpdater;
  return autoUpdater;
 }catch(error){console.warn('Updater not available:',error.message);return null;}
}
// This fallback works for unsigned GitHub Release EXEs that intentionally do
// not include app-update.yml. It checks only the official public GitHub API.
async function checkGitHubUpdates(interactive=false){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),9000);
 try{
  const result=await fetchGitHubRelease(net.fetch,app.getVersion(),{signal:controller.signal});
  if(result.status==='available'){
   const choice=await dialog.showMessageBox({
    type:'info',title:'Tubeium update available',
    message:`Tubeium ${result.tag.slice(1)} is available`,
    detail:`Installed: ${result.currentVersion}  ·  Latest: ${result.tag.slice(1)}\\n\\nDownload the installer or portable edition from the official GitHub Releases page. Tubeium will not download or install an executable automatically.`,
    buttons:['Later','View official release'],defaultId:1,cancelId:0
   });
   if(choice.response===1) await shell.openExternal(RELEASES_URL);
  } else if(interactive){
   await dialog.showMessageBox({
    type:'info',title:'Tubeium updates',
    message:result.status==='current'?'Tubeium is up to date':'You are using a newer development build',
    detail:`Installed: ${result.currentVersion}  ·  Latest public release: ${result.tag.slice(1)}`
   });
  }
  return true;
 }catch(error){
  console.warn('GitHub release check:',String(error.message||error));
  if(interactive){
   const choice=await dialog.showMessageBox({
    type:'warning',title:'Could not check for Tubeium updates',
    message:'GitHub releases could not be checked.',
    detail:'Check your connection and try again, or open the official Releases page. No files were changed.',
    buttons:['Close','Open releases'],defaultId:0,cancelId:0
   });
   if(choice.response===1)await shell.openExternal(RELEASES_URL);
  }
  return false;
 } finally {clearTimeout(timeout);}
}
async function checkTubeiumUpdates(interactive=false){
 const client=getUpdateClient();
 if(!client)return checkGitHubUpdates(interactive);
 try{
  client.autoDownload=!!settings.autoDownloadUpdates || interactive;
  const result=await client.checkForUpdates();
  if(interactive && !result?.updateInfo)await dialog.showMessageBox({type:'info',title:'Tubeium updates',message:'Update check completed.'});
  return true;
 }catch(error){
  // Even signed metadata failures should allow checking the public release.
  console.warn('Signed release feed failed:',String(error.message||error));
  return checkGitHubUpdates(interactive);
 }
}
async function checkYouTubeAccount(){
 if(!win||win.isDestroyed())return;
 try {const info=await win.webContents.executeJavaScript(`(()=>({hostname:location.hostname, avatar:!!document.querySelector('ytd-topbar-menu-button-renderer #avatar-btn, ytd-masthead button#avatar-btn, yt-img-shadow#avatar'), login:!!document.querySelector('a[href*="ServiceLogin"]')}))()`);
 const evidence=info.hostname.endsWith('youtube.com') && info.avatar?'Profile avatar detected':'No profile avatar detected';
 await dialog.showMessageBox(win,{type:'info',title:'Tubeium · Sign-in status',message:evidence,detail:'This checks the current page, not Google authentication servers. If signed out, try Player → Use browser extension to sign in… Browser cookie transfer does not guarantee account acceptance.'});
 } catch(error){await dialog.showMessageBox(win,{type:'warning',message:'Could not inspect the current YouTube page.',detail:String(error.message||error)});}
}
async function auditYouTubeUI(){
 if(!win||win.isDestroyed())return;
 try{
  const result=await win.webContents.executeJavaScript(`(()=>{
    const q=s=>!!document.querySelector(s);
    return {site:location.hostname,video:q('video'),youTubeApp:q('ytd-app'),player:q('#movie_player, .html5-video-player'),
      tubeiumSettingsButton:q('#uyp-settings, #uyp-settings-btn, #uyp-gear'),
      tubeiumDownloadButton:q('#uyp-dl'),shortsControls:q('ytd-reel-video-renderer, ytd-shorts'),
      comments:q('ytd-comments, #comments'),navigation:q('ytd-guide-renderer, ytd-mini-guide-renderer')};
  })()`);
  const lines=Object.entries(result).map(([key,value])=>`${key}: ${value}`).join('\n');
  await dialog.showMessageBox(win,{type:'info',title:'Tubeium player compatibility check',message:'Live YouTube element checks',detail:lines+'\n\nMissing selectors may mean this page does not contain that feature; they do not automatically mean the setting is broken.'});
 }catch(error){await dialog.showMessageBox(win,{type:'warning',message:'Could not check the current page.',detail:String(error.message||error)});}
}
async function showSystemDiagnostics(){
 const ff=bundledFfmpeg();const yt=fs.existsSync(path.join(binDir(),ytdlpName()));
 const metrics=app.getAppMetrics();
 const memoryWorkingSetMB=Math.round(metrics.reduce((total,m)=>total+(m.memory?.workingSetSize||0),0)/1024);
 const health={...basicHealth({version:app.getVersion(),settingsCount:Object.keys(settings).length,jobs,libraryCount:0,downloader:yt?'Local downloader present':'Will download on first use',ffmpeg:ff?'Bundled FFmpeg available':'FFmpeg unavailable',updateConfigured:releaseFeedConfigured(),accountEvidence:'Not checked; no cookies inspected'}),electronProcesses:metrics.length,memoryWorkingSetMB};
 const response=await dialog.showMessageBox({type:'info',title:'Tubeium diagnostics',message:'Local application diagnostics',detail:JSON.stringify(health,null,2),buttons:['Close','Save report'],cancelId:0});
 if(response.response===1){const result=await dialog.showSaveDialog({defaultPath:path.join(app.getPath('documents'),'Tubeium-diagnostics.json'),filters:[{name:'JSON',extensions:['json']}]});if(result.filePath)fs.writeFileSync(result.filePath,JSON.stringify(health,null,2));}
}

const TUBEIUM_ACTIONS=new Set(['settings','library','downloads','mini','screenshot','home','subscriptions','history','updates','diagnostics']);
ipcMain.on('tubeium-command',(e,command)=>{
 if(!ytOnly(e)||!TUBEIUM_ACTIONS.has(command))return;
 if(command==='settings')openSettings();
 if(command==='library')openLocalLibrary();
 if(command==='downloads')openDownloadManager();
 if(command==='mini')toggleMini();
 if(command==='home')win.loadURL(START_URL);
 if(command==='subscriptions')win.loadURL(START_PAGES.subscriptions);
 if(command==='history')win.loadURL(START_PAGES.history);
 if(command==='updates')void checkTubeiumUpdates(true);
 if(command==='diagnostics')void showSystemDiagnostics();
 if(command==='screenshot')win.webContents.capturePage().then(async pic=>{
   const result=await dialog.showSaveDialog(win,{title:'Save Tubeium screenshot',defaultPath:path.join(app.getPath('pictures'),'Tubeium-screenshot.png'),filters:[{name:'PNG',extensions:['png']}]});
   if(!result.canceled&&result.filePath)fs.writeFileSync(result.filePath,pic.toPNG());
 }).catch(err=>dialog.showErrorBox('Screenshot failed',err.message));
});

// ---- Menu & tray ----
function buildMenu() {
  const toggle = (key, label) => ({
    label,
    type: 'checkbox',
    checked: !!settings[key],
    click: (mi) => { setSettings({ [key]: mi.checked }); },
  });
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'Player',
      submenu: [
        { label: mini ? 'Exit Mini Player' : 'Mini Player', accelerator: 'CmdOrCtrl+Shift+M', click: toggleMini },
        { label: 'Always on Top', type: 'checkbox', checked: !!(win && win.isAlwaysOnTop()), accelerator: 'CmdOrCtrl+Shift+T', click: toggleTop },
        { label: 'Play / Pause', accelerator: 'CmdOrCtrl+Shift+P', click: playPause },
        { type: 'separator' },
        { label: 'Sign-in help (browser extension)…', click: openWelcomeTab },
        { label: 'Use browser extension to sign in…', click: openBrowserAssistedSignIn },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: openSettings },
        { label: 'Action Search…', accelerator: 'CmdOrCtrl+K', click: () => {if(win&&!win.isDestroyed())win.webContents.send('tubeium-open-palette');} },
        { type: 'separator' },
        { label: 'Download Manager…', accelerator: 'CmdOrCtrl+Shift+D', click: openDownloadManager },
        { label: 'Local Library…', accelerator: 'CmdOrCtrl+Shift+L', click: openLocalLibrary },
        { label: 'Save Screenshot…', accelerator: 'CmdOrCtrl+Shift+S', click: async () => {if(!win||win.isDestroyed())return;try{const dialogResult=await dialog.showSaveDialog(win,{title:'Save screenshot',defaultPath:path.join(app.getPath('pictures'),'Tubeium-screenshot.png'),filters:[{name:'PNG',extensions:['png']}]});if(!dialogResult.canceled&&dialogResult.filePath){const pic=await win.webContents.capturePage();fs.writeFileSync(dialogResult.filePath,pic.toPNG());}}catch(error){dialog.showErrorBox('Screenshot failed',error.message);}} },
        { label: 'Open Downloads Folder', click: () => { fs.mkdirSync(dlDir(), { recursive: true }); shell.openPath(dlDir()); } },
        { label: 'Update Downloader (yt-dlp)', click: updateYtDlp },
        { label: 'Check App Updates…', click: () => checkTubeiumUpdates(true) },
        { label: 'Backups (in Settings)…', click: openSettings },
        { label: 'System Diagnostics…', click: showSystemDiagnostics },
        { label: 'Playback Diagnostics…', click: () => { if (win && !win.isDestroyed()) win.webContents.send('tubeium-toggle-diagnostics'); } },
        { label: 'Check Player Feature Compatibility…', click: auditYouTubeUI },
        { label: 'Check YouTube Sign-in Status…', click: checkYouTubeAccount },
      ],
    },
    {
      label: 'Features',
      submenu: [
        toggle('blockAds', 'Skip YouTube ads (best effort)'),
        toggle('sponsorBlock', 'SponsorBlock (skip sponsor segments)'),
        toggle('hideShorts', 'Hide Shorts'),
        toggle('closeToTray', 'Close button hides to tray'),
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Home', accelerator: 'CmdOrCtrl+H', click: () => win && win.loadURL(START_URL) },
        { label: 'Back', accelerator: 'Alt+Left', click: () => win && win.webContents.goBack() },
        { label: 'Forward', accelerator: 'Alt+Right', click: () => win && win.webContents.goForward() },
        { role: 'reload' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
        { role: 'togglefullscreen' },
        { label: 'Show Sign-in Help tabs', type: 'checkbox', checked: helpTabsVisible,
          accelerator: 'CmdOrCtrl+Shift+G',
          click: item => setHelpTabsVisible(item.checked) },
        ...(settings.showDeveloperTools ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function buildTray() {
  const img = nativeImage.createFromPath(ICON).resize({ width: 18, height: 18 });
  tray = new Tray(img);
  tray.setToolTip('Tubeium');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show / Hide', click: () => (win && win.isVisible() ? win.hide() : showWindow()) },
    { label: 'Play / Pause', click: playPause },
    { label: 'Welcome / Sign-in Help tab…', click: () => {showWindow();openWelcomeTab();} },
    { label: 'Settings…', click: openSettings },
    { label: 'Download Manager…', click: openDownloadManager },
    { label: 'Local Library…', click: openLocalLibrary },
    { label: 'Mini Player', click: () => { showWindow(); toggleMini(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', () => (win && win.isVisible() ? win.focus() : showWindow()));
}

// ---- Download manager and persisted queue ----
const dlDir = () => settings.downloadSubfolder ? path.join(settings.downloadBaseFolder || app.getPath('downloads'), settings.downloadSubfolder) : (settings.downloadBaseFolder || app.getPath('downloads'));
const binDir = () => path.join(app.getPath('userData'), 'bin');
const ytdlpName = () => (process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const queueFile=()=>path.join(app.getPath('userData'),'download-queue.json');
const archiveFile=()=>path.join(app.getPath('userData'),'download-archive.txt');
let jobs=[];
const running=new Map();
let queueTimer=null;
let draining=false;
function sendDownloads(force=false) {
  if (force) { clearTimeout(queueTimer);queueTimer=null;writeJson(queueFile(),{version:1,jobs}); }
  else if (!queueTimer) queueTimer=setTimeout(()=>{queueTimer=null;writeJson(queueFile(),{version:1,jobs});},650);
  if(downloadsWindow&&!downloadsWindow.isDestroyed()) downloadsWindow.webContents.send('downloads-changed',jobs);
}
const jobPublic=()=>jobs.map(j=>({...j,files:[...j.files]}));
function openDownloadManager() {
  if (downloadsWindow && !downloadsWindow.isDestroyed()) {downloadsWindow.show();downloadsWindow.focus();return;}
  downloadsWindow=new BrowserWindow({width:1100,height:780,minWidth:780,minHeight:560,
    title:'Tubeium · Downloads',backgroundColor:'#111119',icon:ICON,autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'downloads-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  downloadsWindow.loadFile(path.join(__dirname,'downloads.html'));
  downloadsWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  downloadsWindow.webContents.on('will-navigate',e=>e.preventDefault());
  downloadsWindow.on('closed',()=>{downloadsWindow=null;});
}
function canRun(cmd,args) {
  return new Promise(resolve=>{
    let done=false;const finish=ok=>{if(!done){done=true;resolve(ok);}};
    try{const p=spawn(cmd,args,{windowsHide:true});p.on('error',()=>finish(false));p.on('exit',c=>finish(c===0));}
    catch{finish(false);}
  });
}
function bundledFfmpeg() {
  try {let p=require('ffmpeg-static'); if(p){p=p.replace('app.asar','app.asar.unpacked');if(fs.existsSync(p))return p;}}catch{}
  return null;
}
// First install is pinned to a known SHA-256; updates are an explicit choice.
const ensureYtDlp = createYtDlpInstaller({ net, binDir, canRun });
async function updateYtDlp() {
  const note=t=>win&&!win.isDestroyed()&&win.webContents.send('toast',t);
  const ask=await dialog.showMessageBox(win,{
    type:'question',buttons:['Install latest','Cancel'],defaultId:1,cancelId:1,
    title:'Update downloader (yt-dlp)',
    message:'Install the newest yt-dlp release?',
    detail:'Tubeium installs a pinned, SHA-256-verified version by default. The newest release is checked against its accompanying checksum file; use this if downloads stopped working.'
  });
  if(ask.response!==0)return;
  try{note('Updating downloader…');await ensureYtDlp(()=>{},{useLatest:true});note('Downloader updated');}
  catch(e){note('Update failed: '+e.message);}
}
function addJob(raw,scope,mode,hints={}) {
  const task=newTask(raw,scope,mode,{...hints,settings});
  if(jobs.length>=200){
    const i=jobs.findIndex(j=>['completed','cancelled'].includes(j.status));
    if(i<0)throw new Error('Queue full. Remove old entries.');
    jobs.splice(i,1);
  }
  jobs.unshift(task);sendDownloads(true);queueDrain();return task;
}
function setJobStatus(job,status,detail) {
  job.status=status;job.detail=detail||status;job.updatedAt=new Date().toISOString();sendDownloads(true);
}
function queueDrain() {
  if(draining)return;
  draining=true;
  try {
    while(jobs.filter(j=>j.status==='running').length<Number(settings.parallelDownloads||1)) {
      const job=jobs.find(j=>j.status==='queued');
      if(!job)break;
      // Mark synchronously before awaiting any fetch or process startup.
      setJobStatus(job,'running','Preparing…');
      void runJob(job);
    }
  }finally{draining=false;}
}
function jobAction(id,action) {
  const j=jobs.find(x=>x.id===id);
  if(!j)throw new Error('Download not found');
  if(action==='pause'){
    if(j.status==='queued')setJobStatus(j,'paused','Paused');
    if(j.status==='running') {setJobStatus(j,'paused','Paused; partial files retained');running.get(id)?.kill();}
    queueDrain();
  }else if(action==='resume'){
    if(['paused','error','cancelled'].includes(j.status)){
      j.error='';setJobStatus(j,'queued','Waiting to resume');queueDrain();
    }
  }else if(action==='cancel') {
    if(j.status==='running')running.get(id)?.kill();
    if(j.status!=='completed')setJobStatus(j,'cancelled','Cancelled; existing files not deleted');
  }else if(action==='remove') {
    if(j.status==='running') throw new Error('Pause or cancel before removing');
    jobs=jobs.filter(x=>x!==j);sendDownloads(true);
  }else if(action==='reveal') {
    const file=j.files.find(x=>typeof x==='string'&&fs.existsSync(x));
    if(file) shell.showItemInFolder(file);
    else shell.openPath(dlDir());
  }else if(action==='open') {
    const file=j.files.find(x=>typeof x==='string'&&fs.existsSync(x));
    if(!file)throw new Error('Saved media not found on disk');
    shell.openPath(file);
  }else throw new Error('Invalid action');
  return jobPublic();
}
function pushFile(job,file) {
  const candidate=file.trim();
  if(!candidate || !path.isAbsolute(candidate) || job.files.includes(candidate) || !fs.existsSync(candidate))return;
  job.files.push(candidate);job.files=job.files.slice(-200);sendDownloads();
}
async function runJob(job) {
  let child=null,err='',stdoutBuf='',stderrBuf='';
  try {
    const bin=await ensureYtDlp(t=>{job.detail=t;sendDownloads();});
    if(job.status!=='running')return;
    const ffmpeg=bundledFfmpeg()||((await canRun('ffmpeg',['-version']))?'ffmpeg':null);
    if(job.status!=='running')return;
    fs.mkdirSync(dlDir(),{recursive:true});
    const args=formatArgs(job,settings,dlDir(),ffmpeg,archiveFile());
    child=spawn(bin,args,{windowsHide:true});
    running.set(job.id,child);
    job.detail='Connecting…';sendDownloads();
    const consumeLine=line=>{
      if(applyVerifiedMetadata(job,line)){job.updatedAt=new Date().toISOString();sendDownloads();return;}
      const pct=/\[download\]\s+(\d+(?:\.\d+)?)%/.exec(line);
      if(pct){job.progress=Math.min(100,Number(pct[1]));
        const details=line.match(/at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
        job.detail=details?`${details[1]} · ETA ${details[2]}`:'Downloading';sendDownloads();
      }
      if(/\[download\] Downloading item \d+ of \d+/.test(line)){job.detail=line.replace(/^.*\[download\]/,'').trim().slice(0,150);sendDownloads();}
      if(/\[(Merger|ExtractAudio|VideoConvertor|EmbedThumbnail|Metadata|Fixup)/.test(line)){job.detail='Processing media…';sendDownloads();}
      if(line && !line.startsWith('['))pushFile(job,line);
    };
    const consume=(str,which)=>{
      if(which==='stdout')stdoutBuf+=str;else stderrBuf+=str;
      let buf=which==='stdout'?stdoutBuf:stderrBuf;const lines=buf.split(/\r?\n/);
      if(which==='stdout')stdoutBuf=lines.pop()||'';else stderrBuf=lines.pop()||'';
      lines.forEach(line=>{
        if(which==='stdout')consumeLine(line.trim());
        else if(/ERROR:/.test(line))err=line.trim().slice(0,600);
      });
    };
    const code=await new Promise((resolve,reject)=>{
      child.stdout.on('data',d=>consume(d.toString(),'stdout'));
      child.stderr.on('data',d=>consume(d.toString(),'stderr'));
      child.on('error',reject);child.on('close',resolve);
    });
    if(stdoutBuf)consumeLine(stdoutBuf.trim());
    if(job.status!=='running')return;
    if(code===0) {job.progress=100;setJobStatus(job,'completed',job.files.length?`Saved ${job.files.length} file(s)`:'Download finished');
      if(settings.openAfterDownload){const file=job.files.find(x=>fs.existsSync(x));if(file)shell.showItemInFolder(file);}
    }else{job.error=err||`yt-dlp exited with code ${code}`;setJobStatus(job,'error','Download failed');}
  } catch(e) {
    if(job.status==='running'){job.error=String(e.message||e).slice(0,600);setJobStatus(job,'error','Download failed');}
  } finally {
    if(child&&running.get(job.id)===child)running.delete(job.id);
    sendDownloads(true);queueDrain();
  }
}
function managerOnly(e){return !!downloadsWindow&&!downloadsWindow.isDestroyed()&&e.sender===downloadsWindow.webContents;}
ipcMain.handle('downloads-init',e=>{if(!managerOnly(e))throw new Error('Forbidden');return{jobs:jobPublic(),folder:dlDir(),accent:settings.accentColor,fontPercent:settings.dashboardFontSize};});
ipcMain.handle('downloads-add',(e,request)=>{
  if(!managerOnly(e))throw new Error('Forbidden');
  return addJob(request?.url,request?.scope,request?.mode);
});
ipcMain.handle('downloads-action',(e,id,action)=>{
  if(!managerOnly(e))throw new Error('Forbidden');return jobAction(id,action);
});
ipcMain.handle('downloads-play-offline',(e,id,index)=>{if(!managerOnly(e))throw new Error('Forbidden');openOfflinePlayer(id,index);return true;});
ipcMain.handle('downloads-health',async e=>{if(!managerOnly(e))throw new Error('Forbidden');
 const local=path.join(binDir(),ytdlpName());
 const bin=fs.existsSync(local)?local:(await canRun('yt-dlp',['--version'])?'yt-dlp':null);
 const ff=bundledFfmpeg()||((await canRun('ffmpeg',['-version']))?'ffmpeg':null);
 return {downloader:bin?'Available':'Not installed — downloads install it when needed',ffmpeg:ff?'Available':'Unavailable — install FFmpeg for merging/conversion',verifiedLocal:fs.existsSync(local)};
});
ipcMain.handle('downloads-open-folder',e=>{if(!managerOnly(e))throw new Error('Forbidden');fs.mkdirSync(dlDir(),{recursive:true});return shell.openPath(dlDir());});
// Dedicated non-destructive help shortcut; YouTube pages only.
ipcMain.on('tubeium-open-signin-help',e=>{
  if(!ytOnly(e))return;
  showWindow();
  openWelcomeTab();
});
ipcMain.on('open-download-manager',e=>{if(ytOnly(e))openDownloadManager();});
ipcMain.handle('download',async(e,request)=>{
  if(!ytOnly(e))return{ok:false,error:'Forbidden'};
  try {const {id,mode,scope}=request||{};const raw=scope==='playlist'?request.url:id;
    const task=addJob(raw,scope==='playlist'?'playlist':'video',mode,
      {title:request?.title,channel:request?.channel});
    return {ok:true,queued:true,id:task.id};
  }catch(err){return{ok:false,error:String(err.message||err)};}
});
// Pause active operations on shutdown; they can be restarted from their .part files.
app.on('before-quit',()=>{
  for(const j of jobs)if(j.status==='running') {j.status='paused';j.detail='Paused on exit';}
  for(const p of running.values())try{p.kill();}catch{}
  sendDownloads(true);
});

// ---- IPC ----
ipcMain.handle('get-state', (e) => { if (!ytOnly(e)) throw new Error('Forbidden'); return payload(); });
ipcMain.handle('get-player-memory', (e) => { if (!ytOnly(e)) throw new Error('Forbidden'); return playerMemory; });
ipcMain.handle('save-player-memory', (e, data) => {
  if (!ytOnly(e) || !data || typeof data !== 'object') return false;
  if (typeof data.speed === 'number' && Number.isFinite(data.speed) && data.speed >= 0.25 && data.speed <= 4) playerMemory.speed = data.speed;
  if (typeof data.volume === 'number' && Number.isFinite(data.volume) && data.volume >= 0 && data.volume <= 100) playerMemory.volume = data.volume;
  if (typeof data.muted === 'boolean') playerMemory.muted = data.muted;
  writeJson(memoryFile(), playerMemory);
  return true;
});

// SponsorBlock lookup runs here (not in the page) to avoid CORS/CSP problems.
// Uses the privacy-friendly hash-prefix endpoint so the full video ID isn't sent.
ipcMain.handle('sb-segments', async (e, videoId) => {
  if (!ytOnly(e)) return [];
  if (!/^[\w-]{11}$/.test(videoId)) return [];
  const prefix = crypto.createHash('sha256').update(videoId).digest('hex').slice(0, 4);
  const cats = encodeURIComponent(JSON.stringify(settings.sbCategories));
  try {
    const res = await net.fetch(`https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${cats}`);
    if (!res.ok) return [];
    const data = await res.json();
    const entry = data.find((v) => v.videoID === videoId);
    if (!entry) return [];
    return entry.segments
      .filter((s) => !s.actionType || s.actionType === 'skip')
      .map((s) => ({ start: s.segment[0], end: s.segment[1], category: s.category }));
  } catch {
    return [];
  }
});


const dislikeCache = new Map();
ipcMain.handle('ryd-votes', async (e, videoId) => {
  if (!ytOnly(e) || !settings.showDislikes || !/^[\w-]{11}$/.test(videoId)) return null;
  const cached = dislikeCache.get(videoId);
  if (cached && Date.now() - cached.when < 3600000) return cached.value;
  try {
    const res = await net.fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`);
    if (!res.ok) return null;
    const result = await res.json();
    if (!Number.isFinite(result.dislikes) || result.dislikes < 0) return null;
    const value = { dislikes: Math.trunc(result.dislikes) };
    dislikeCache.set(videoId, { value, when: Date.now() });
    if (dislikeCache.size > 100) dislikeCache.delete(dislikeCache.keys().next().value);
    return value;
  } catch { return null; }
});
ipcMain.handle('copy-video-text', (e, text) => {
  if (!ytOnly(e) || typeof text !== 'string' || text.length > 2048) return false;
  clipboard.writeText(text);
  return true;
});

// ---- App lifecycle ----
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.on('before-quit', () => { quitting = true; if (browserPairing) browserPairing.close(); });
  app.on('activate', showWindow);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

  app.whenReady().then(async () => {
    migrateUserData(app.getPath('appData'), app.getPath('userData'));
    settings = normalize(readJson(settingsFile(), {}));
    // Legacy uYouPlus download folders must not survive a brand upgrade when
    // we can safely rename them. Never overwrite a user's existing Tubeium dir.
    const downloadBase=settings.downloadBaseFolder||app.getPath('downloads');
    const legacyDownloads=migrateLegacyDownloadFolder({
      fs,base:downloadBase,subfolder:settings.downloadSubfolder,
    });
    if (legacyDownloads.nextSubfolder!==settings.downloadSubfolder){
      settings=normalize({downloadSubfolder:legacyDownloads.nextSubfolder},settings);
      saveSettings();
    }
    if (legacyDownloads.blocked)console.warn('Legacy downloads preserved because migration could not safely rename the old directory.');
    if (settings.autoClearCache) { try { await session.defaultSession.clearCache(); } catch {} }
    playerMemory = { ...playerMemory, ...readJson(memoryFile(), {}) };
    libraryStore = new LibraryStore(path.join(app.getPath('userData'),'local-library.json'));
    playlistStore = new PlaylistStore(path.join(app.getPath('userData'),'local-playlists.json'));
    setupWebsitePermissions();
    jobs=normalizeQueue(readJson(queueFile(),{jobs:[]}));
    if(legacyDownloads.moved){
      jobs=remapDownloadJobPaths(jobs,legacyDownloads.source,legacyDownloads.destination);
    }
    if(!settings.autoRestoreDownloads){for(const job of jobs)if(job.status==='queued')job.status='paused';}
    sendDownloads(true);
    applyLoginSetting();
    createWindow();
    void verifyImportedSessionOnce();
    buildMenu();
    buildTray();
    if(settings.autoCheckUpdates)setTimeout(()=>void checkTubeiumUpdates(false),12000);
  });
}
