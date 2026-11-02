'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const match = main.match(/^function restartAfterSignInImport\(imported\) \{[\s\S]*?^\}/m);
assert(match, 'Restart function must exist in main.js');
const snippet = match[0];
let timers = [];
let relaunches = 0;
let quits = 0;
let closeCalls = 0;
const ctx = vm.createContext({
  signInRestartPending: false,
  quitting: false,
  browserPairing: { close(){ closeCalls++; } },
  app: { relaunch(){ relaunches++; }, quit(){ quits++; } },
  setTimeout(callback, delay){ timers.push({callback, delay}); },
  console,
  Number,
});
vm.runInContext(snippet, ctx);
assert.equal(ctx.restartAfterSignInImport(0), false);
assert.equal(timers.length, 0, 'No restart for empty import');
assert.equal(ctx.restartAfterSignInImport(3), true);
assert.equal(ctx.restartAfterSignInImport(2), false, 'Duplicate success must not restart twice');
assert.equal(timers.length, 1);
assert(timers[0].delay >= 1000, 'Give the extension time to display the response');
timers[0].callback();
assert.equal(relaunches, 1);
assert.equal(quits, 1);
assert.equal(closeCalls, 1);
assert.equal(ctx.quitting, true, 'Do not minimize to tray on restart');
assert(main.includes('restartAfterSignInImport(result.added)'), 'Netscape cookie import should restart');
assert(main.includes('restartAfterSignInImport(imported)'), 'Browser assisted import should restart');
const helper = fs.readFileSync(path.join(__dirname, '..', 'browser-login-once', 'popup.js'), 'utf8');
const permissionAt = helper.indexOf('await chrome.permissions.request');
const clipboardAt = helper.indexOf('await navigator.clipboard.readText');
assert(permissionAt > 0 && clipboardAt > permissionAt, 'Browser permissions must be requested before clipboard awaits');
console.log('PASS: restart after successful import, no restart for empty/duplicate transfers and browser permission ordering');
