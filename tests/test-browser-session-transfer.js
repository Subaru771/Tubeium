'use strict';
const assert = require('node:assert/strict');
const { validateCookies, startTransfer } = require('../src/browser-session-transfer');
const example = [
  { domain: '.youtube.com', name: 'LOGIN_INFO', value: 'dummy-test-only', secure: true, httpOnly: true, path: '/', hostOnly: false, expirationDate: 2000000000 },
  { domain: '.google.com', name: 'SID', value: 'test-only', secure: true, path: '/', hostOnly: false, expirationDate: 2000000000 },
  { domain: 'google.com.evil.example', name: 'SID', value: 'reject', path: '/' },
  { domain: '.google.com', name: 'NONAUTH', value: 'reject', path: '/' },
  { domain: '.youtube.com', name: '__Host-SID', value: 'reject', secure: false, path: '/wrong' },
];
assert.equal(validateCookies(example).length, 2);
assert.throws(() => validateCookies(Array.from({length: 500}, () => example[0])), /count/);
(async () => {
  const saved = [];
  let flushCount = 0;
  let completed = 0;
  const bridge = await startTransfer({
    cookieJar: { set: async c => saved.push(c), flushStore: async () => { flushCount++; } },
    onImported: async () => { completed++; },
  });
  const url = `http://127.0.0.1:${bridge.port}/transfer`;
  const origin = 'chrome-extension://' + 'a'.repeat(32);
  try {
    let res = await fetch(url, {method: 'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${bridge.code}`}, body: JSON.stringify({confirmed:true,cookies:example})});
    assert.equal(res.status, 403, 'A website must not be able to send cookies to the bridge');
    res = await fetch(url, {method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
    assert.equal(res.status, 204, 'Extension preflight must succeed');
    assert.equal(res.headers.get('access-control-allow-origin'), origin);
    res = await fetch(url, {method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Authorization':'Bearer '+ '0'.repeat(64)},body:JSON.stringify({confirmed:true,cookies:example})});
    assert.equal(res.status,401);
    res = await fetch(url, {method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Authorization':`Bearer ${bridge.code}`},body:JSON.stringify({confirmed:true,cookies:example})});
    assert.equal(res.status,200);
    const json = await res.json();
    assert.equal(json.imported,2);
    assert.equal(saved.length,2);
    assert.equal(flushCount,1);
    // onImported is a callback after reply; event loop may not run it before fetch resolves.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(completed,1);
    assert.equal(bridge.code.length,64);
    assert(!JSON.stringify(json).includes('test-only'));
    console.log('Browser-to-app one-time sign-in validation passed');
  } finally { bridge.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
