'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const start = preload.indexOf('function installPageAdFilter() {');
const end = preload.indexOf('// Electron executes this in the page', start);
assert(start !== -1 && end > start, 'Early filtering source must exist');
const functionCode = preload.slice(start, end);
assert(!/currentTime\s*=\s*v\.duration/.test(preload), 'Never seek to end of an ad');
const fallback = preload.slice(preload.indexOf('function initAdBlock() {'), preload.indexOf('// ---- SponsorBlock ----'));
assert(!/\.playbackRate\s*=\s*16/.test(fallback));
assert(!/\.currentTime\s*=/.test(fallback));
assert(/typeof player\?\.skipAd === 'function'/.test(fallback));
assert(/getClientRects\(\)\.length/.test(fallback));

function makePage() {
  const calls=[];
  const window = {
    ytInitialPlayerResponse: undefined,
    fetch: async (url) => {
      calls.push(url);
      if (String(url).includes('/player?')) {
        return new Response(JSON.stringify({
          videoDetails:{title:'Example video'},
          streamingData:{formats:[{itag:18,url:'https://rr1---googlevideo.com/videoplayback'}]},
          adPlacements:[{adPlacementRenderer:{}}],
          playerAds:[{}],
          adSlots:[{}],
          adBreakParams:{key:'value'},
        }),{status:200,headers:{'content-type':'application/json'}});
      }
      if (String(url).includes('/browse')) {
        return new Response(JSON.stringify({contents:[
          {richItemRenderer:{content:{videoRenderer:{videoId:'abc'}}}},
          {richItemRenderer:{content:{adSlotRenderer:{}}}},
          {adSlotRenderer:{}},
          {richItemRenderer:{content:{videoRenderer:{videoId:'def'}}}},
        ]}), {status:200});
      }
      return new Response(JSON.stringify({adPlacements:[{}],results:[]}), {status:200});
    },
  };
  const context = vm.createContext({window, URL, Headers, Response, location: {href:'https://www.youtube.com/watch?v=123'}, console});
  vm.runInContext(functionCode+'\ninstallPageAdFilter();',context);
  return {window,calls,context};
}

(async function() {
  const {window,context} = makePage();
  assert.equal(window.__tubeiumAdFilter.isEnabled(),true);
  window.ytInitialPlayerResponse={videoDetails:{title:'Test'},adPlacements:[{}],playerAds:[{}]};
  assert.equal(window.ytInitialPlayerResponse.adPlacements,undefined);
  assert.equal(window.ytInitialPlayerResponse.playerAds,undefined);
  assert.equal(window.ytInitialPlayerResponse.videoDetails.title,'Test');

  const youtube=await window.fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false');
  const data=await youtube.json();
  for(const f of ['adPlacements','playerAds','adSlots','adBreakParams']) assert.equal(data[f],undefined, f);
  assert.equal(data.videoDetails.title, 'Example video');
  assert.equal(data.streamingData.formats[0].itag,18);

  // Navigation responses lose ad metadata and ad feed items, keeping real content.
  const next = await (await window.fetch('https://www.youtube.com/youtubei/v1/next')).json();
  assert.equal(next.adPlacements,undefined);
  // Unrelated endpoints / media requests must not be rewritten.
  const other = await window.fetch('https://www.youtube.com/youtubei/v1/att/get');
  assert.equal((await other.json()).adPlacements.length,1);
  const browse = await (await window.fetch('https://www.youtube.com/youtubei/v1/browse')).json();
  assert.equal(browse.contents.length,2);
  assert(browse.contents.every(i=>!i.adSlotRenderer && !(i.richItemRenderer&&i.richItemRenderer.content.adSlotRenderer)));
  assert.equal(browse.contents[0].richItemRenderer.content.videoRenderer.videoId,'abc');
  // JSON.parse and initial page data are covered too.
  const parsed = vm.runInContext('JSON.parse(\'{"playerResponse":{"adPlacements":[{}],"videoDetails":{"title":"x"}},"adSlots":[{}]}\')',context);
  assert.equal(parsed.adSlots,undefined);
  assert.equal(parsed.playerResponse.adPlacements,undefined);
  assert.equal(parsed.playerResponse.videoDetails.title,'x');
  window.ytInitialData={contents:[{adSlotRenderer:{}},{richItemRenderer:{content:{videoRenderer:{videoId:'z'}}}}]};
  assert.equal(window.ytInitialData.contents.length,1);
  window.__tubeiumAdFilter.setEnabled(false);
  const off = await window.fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false');
  assert.equal((await off.json()).adPlacements.length,1, 'Setting off must keep ads untouched');
  window.ytInitialPlayerResponse={videoDetails:{title:'Unfiltered'},adPlacements:[{}]};
  assert.equal(window.ytInitialPlayerResponse.adPlacements.length,1);
  window.__tubeiumAdFilter.setEnabled(true);
  window.ytInitialPlayerResponse={adPlacements:[{}],streamingData:{}};
  assert.equal(window.ytInitialPlayerResponse.adPlacements,undefined);
  console.log('PASS: proactive ads metadata filtering, opt-out, and black-screen-safe skip fallback');
})().catch(e=>{console.error(e); process.exitCode=1;});
