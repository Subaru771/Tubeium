'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {createCleanProfile, chromiumProfileArgs, removeCleanProfile, pruneOldProfiles} = require('../src/clean-signin-browser');
const parent = fs.mkdtempSync(path.join(os.tmpdir(),'tubeium-test-'));
try {
  const profile = createCleanProfile(parent);
  const second = createCleanProfile(parent);
  assert.notEqual(profile,second,'each new sign-in session starts with a blank profile');
  assert.equal(fs.readdirSync(profile).length,0,'new profile must not inherit Google cookies or browser extensions');
  const args=chromiumProfileArgs(profile,'https://www.youtube.com');
  assert.equal(args[0],`--user-data-dir=${profile}`);
  assert(!args.some(a=>a==='--incognito'), 'extensions must remain usable in this temporary profile');
  assert.equal(chromiumProfileArgs(profile,'brave://extensions')[0],args[0]);
  assert.throws(()=>chromiumProfileArgs(profile,'https://accounts.google.com/evil'));
  assert.equal(removeCleanProfile(parent,parent),false,'cannot delete parent directory');
  assert.equal(removeCleanProfile(profile,parent),true);
  assert(fs.existsSync(second));
  pruneOldProfiles(parent,0);
  assert(!fs.existsSync(second));
  console.log('PASS: new isolated profile, matching extension/YouTube profile, no inherited sign-in, restricted cleanup');
} finally { fs.rmSync(parent,{recursive:true,force:true}); }
