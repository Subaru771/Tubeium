'use strict';
const assert = require('node:assert/strict');
const {buildProvenance} = require('../scripts/write-build-provenance');
const input = {version:'1.0.9',commit:'a'.repeat(40),expectedCommit:'a'.repeat(40),repository:'Subaru771/Tubeium',runId:'123'};
assert.deepEqual(buildProvenance(input), {version:'1.0.9',commit:input.commit,repository:input.repository,runUrl:'https://github.com/Subaru771/Tubeium/actions/runs/123'});
for (const changes of [{expectedCommit:'b'.repeat(40)}, {expectedCommit:undefined}, {commit:'main'}, {repository:'https://example.com'}, {runId:'../123'}, {version:'1.09'}]) {
  assert.throws(()=>buildProvenance({...input,...changes}));
}
console.log('PASS: build provenance identifies the exact checkout and rejects mismatched or missing CI identity');
