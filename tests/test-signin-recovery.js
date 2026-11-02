'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const {GOOGLE_ERROR_SCAN, isSignInLocation, classifyFailure, messageFor} = require('../signin-failure');

// Fail only on explicit login errors, not on a normal login form or redirect.
assert(isSignInLocation('https://accounts.google.com/v3/signin/identifier'));
assert(isSignInLocation('https://www.youtube.com/signin?next=%2F'));
assert(!isSignInLocation('https://accounts.google.com.attacker.invalid/signin'));
assert(!isSignInLocation('http://accounts.google.com/signin'));
assert(!isSignInLocation('https://www.youtube.com/watch?v=123'));
assert.equal(classifyFailure({url:'https://accounts.google.com/signin',signal:'browser-rejected'}),'browser-rejected');
assert.equal(classifyFailure({url:'https://accounts.google.com/signin',code:-105}),'network-error');
assert.equal(classifyFailure({url:'https://accounts.google.com/signin',code:-3}),null);
assert.equal(classifyFailure({url:'https://evil.example/signin',code:-105}),null);
assert.equal(classifyFailure({url:'https://accounts.google.com/signin',signal:null}),null);
assert.match(messageFor('session-unconfirmed'),/could not confirm/);
function scan(text) {return vm.runInNewContext(GOOGLE_ERROR_SCAN,{document:{body:{innerText:text}}});}
assert.equal(scan('Sign in with Google. Email or phone. Forgot email? Next'),null);
assert.equal(scan('This browser or app may not be secure. Try using a different browser.'),'browser-rejected');
assert.equal(scan('This browser is not supported'), 'browser-rejected');
assert.equal(scan('Enter your password'),null);
assert(!GOOGLE_ERROR_SCAN.includes('emailAddress'), 'Error scan must not collect account identifiers');

const main=fs.readFileSync(path.resolve(__dirname,'../main.js'),'utf8');
const preload=fs.readFileSync(path.resolve(__dirname,'../preload.js'),'utf8');
assert.match(main,/child\.webContents\.on\('did-finish-load'/);
assert.match(main,/child\.webContents\.on\('did-fail-load'/);
assert.match(main,/ipcMain\.on\('tubeium-open-browser-signin', event => \{/);
assert.match(main,/if \(!ytOnly\(event\)\) return;/);
assert.match(main,/markImportedSessionForVerification\(\)/);
assert.match(main,/notifySignInFailure\('import-empty'\)/);
assert.match(main,/verifyImportedSessionOnce\(\)/);
assert.match(main,/openBrowserAssistedSignIn\(\)/);
assert.match(preload,/tubeium-signin-recovery/);
assert.match(preload,/role', 'alert'/);

// Render the banner with a minimal DOM double and verify user-driven actions.
const begin=preload.indexOf('function showSignInRecoveryNotice(data) {');
const end=preload.indexOf("ipcRenderer.on('tubeium-signin-recovery'",begin);
assert(begin>0 && end>begin);
const elements=[];
const body={appendChild(e){elements.push(e);}};
const sends=[];
function element(tag){return {tag,style:{},listeners:{},children:[],setAttribute(){},addEventListener(type,handler){this.listeners[type]=handler;},append(...nodes){this.children.push(...nodes);},remove(){this.removed=true;}};}
const context=vm.createContext({
 document:{body,getElementById:()=>elements.find(x=>x.id==='tubeium-signin-recovery'&&!x.removed),createElement:element},
 ipcRenderer:{send:(channel)=>sends.push(channel)},window:{addEventListener(){}},Object
});
vm.runInContext(preload.slice(begin,end),context);
vm.runInContext("showSignInRecoveryNotice({reason:'browser-rejected'})",context);
const notice=elements.at(-1);
assert.equal(notice.id,'tubeium-signin-recovery');
assert.equal(notice.children[1].textContent,'Google blocked sign-in in the built-in browser.');
assert.equal(notice.children[2].textContent,'Sign in using your browser');
notice.children[2].listeners.click();
assert.deepEqual(sends,['tubeium-open-browser-signin']);
assert.equal(notice.removed,true);
vm.runInContext("showSignInRecoveryNotice({reason:'network-error'})",context);
elements.at(-1).children[3].listeners.click();
assert.deepEqual(sends,['tubeium-open-browser-signin','tubeium-dismiss-signin-notice']);
console.log('PASS: explicit Google error detection, recovery banner actions, imported-session checks and restricted IPC');
