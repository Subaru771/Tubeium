'use strict';
const assert=require('node:assert/strict');
const {validateRequest}=require('../scripts/validate-unsigned-release');
assert.deepEqual(validateRequest({version:'1.0.1',tag:'v1.0.1',ref:'refs/heads/main'}),{version:'1.0.1',tag:'v1.0.1'});
assert.deepEqual(validateRequest({version:'1.1.0-beta.2',tag:'v1.1.0-beta.2',ref:'refs/heads/main'}),{version:'1.1.0-beta.2',tag:'v1.1.0-beta.2'});
for (const input of [
  {version:'1.0.1',tag:'v1.0.0',ref:'refs/heads/main'},
  {version:'1.0.1',tag:'v1.0.1',ref:'refs/heads/feature'},
  {version:'1.0.1',tag:'v1.0.1',ref:'refs/tags/v1.0.1'},
  {version:'1.0.1',tag:'1.0.1',ref:'refs/heads/main'},
  {version:'1.0.1',tag:'v1.0.1;echo unsafe',ref:'refs/heads/main'},
  {version:'not-a-version',tag:'vnot-a-version',ref:'refs/heads/main'},
  {version:'1.0.1',tag:undefined,ref:'refs/heads/main'},
]) assert.throws(()=>validateRequest(input));
console.log('PASS: unsigned publishing requires a new matching version tag and main branch');
