'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'src', 'browser-login-once', 'popup.js'), 'utf8');

function makePopup(clipboardValue, captureFetch) {
  const controls = {
    pair: {value:'', focus(){this.focused=true;}},
    google: {checked:true},
    status: {textContent:'', style:{}},
    send: {disabled:false,addEventListener(_event,handler){this.click=handler;}},
  };
  const context = vm.createContext({
    document:{getElementById:id=>controls[id]},
    navigator:{clipboard:{readText:async()=>clipboardValue}},
    chrome:{
      permissions:{request:async opts=>opts.origins.length===2},
      cookies:{getAll:async q=>q.domain==='youtube.com'
        ? [{domain:'.youtube.com',name:'LOGIN_INFO',value:'dummy',path:'/'}]
        : [{domain:'.google.com',name:'SID',value:'dummy2',path:'/'}]},
    },
    fetch:async(url,opts)=>{captureFetch(url,opts);return {ok:true,json:async()=>({ok:true,imported:2})};},
  });
  vm.runInContext(code,context);
  return controls;
}
(async()=>{
  const token='a'.repeat(64);
  let transmitted=false;
  let ui=makePopup('51302:'+token,(url,opts)=>{
    assert.equal(url,'http://127.0.0.1:51302/transfer');
    assert.equal(opts.headers.Authorization,'Bearer '+token);
    assert.equal(JSON.parse(opts.body).cookies.length,2);
    transmitted=true;
  });
  await ui.send.click();
  assert(transmitted,'One-click sign in should use clipboard pairing data');
  assert.match(ui.status.textContent,/2 cookies imported/);
  assert.match(ui.status.textContent,/restart automatically/);
  assert.equal(ui.send.disabled,false);
  assert.equal(ui.pair.value,'');

  ui=makePopup('irrelevant clipboard',()=>{throw new Error('Must not transfer without pairing');});
  await ui.send.click();
  assert.match(ui.status.textContent,/Could not read the pairing details/);
  assert.equal(ui.pair.focused,true);

  // The instructions live in the in-app Sign-in Help tab; there is no pop-up guide window.
  const help=fs.readFileSync(path.join(root,'src','welcome.html'),'utf8');
  assert.match(help,/data-action="folder"/);
  assert.match(help,/data-action="open-browser"/);
  assert.doesNotMatch(help,/data-action="extensions"/);
  const main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
  assert.doesNotMatch(main,/signInGuide|openSignInGuide|signin-guide/);
  assert.equal(fs.existsSync(path.join(root,'signin-guide.html')),false);
  assert.match(main,/async function openBrowserAssistedSignIn/);
  console.log('PASS: one-click browser sign-in and simple guide checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
