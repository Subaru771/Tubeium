'use strict';
const assert=require('node:assert/strict');
const {startTransfer}=require('../src/browser-session-transfer');
const source={domain:'.youtube.com',name:'LOGIN_INFO',value:'synthetic-not-real',secure:true,path:'/',expirationDate:2000000000};
(async()=>{
  let calls=0;
  let signal;
  const wait=new Promise(resolve=>{signal=resolve;});
  const bridge=await startTransfer({
    cookieJar:{set:async()=>{calls++;await wait;},flushStore:async()=>{}},onImported:async()=>{}
  });
  const endpoint=`http://127.0.0.1:${bridge.port}/transfer`;
  const headers={Origin:'chrome-extension://'+'a'.repeat(32),'Content-Type':'application/json',Authorization:`Bearer ${bridge.code}`};
  const req=()=>fetch(endpoint,{method:'POST',headers,body:JSON.stringify({confirmed:true,cookies:[source]})});
  try{
    const first=req();
    for(let i=0;i<200&&!calls;i++) await new Promise(r=>setTimeout(r,3));
    assert.equal(calls,1,'First import must start before race check');
    const concurrent=await req();
    assert.equal(concurrent.status,404,'Second request cannot enter while an import is in progress');
    signal();
    const finished=await first;
    assert.equal(finished.status,200);
    assert.equal(calls,1,'One-time import must only run once');
  }finally{signal();bridge.close();}
  console.log('PASS: session transfer is strictly one-time under concurrent requests');
})().catch(err=>{console.error(err);process.exitCode=1;});
