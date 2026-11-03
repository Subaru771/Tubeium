'use strict';
// Offline validation before any unsigned release build or publication.
// GitHub workflow separately checks the remote tag does not already exist.
const assert = require('node:assert/strict');
const path = require('node:path');
function validateRequest({version,tag,ref}) {
  assert(typeof version === 'string' && /^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?$/.test(version),
    'package.json version must be a semantic version');
  assert.equal(ref,'refs/heads/main','Unsigned public releases must be dispatched from main');
  assert.equal(tag,`v${version}`,'Requested tag must exactly match package.json version');
  return {version,tag};
}
if (require.main === module) {
  const {version}=require(path.join(__dirname,'..','package.json'));
  const result=validateRequest({
    version,tag:process.env.TUBEIUM_RELEASE_TAG,ref:process.env.GITHUB_REF
  });
  console.log(`Validated new unsigned release request: ${result.tag}`);
}
module.exports={validateRequest};
