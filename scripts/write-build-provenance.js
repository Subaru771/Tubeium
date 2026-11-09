'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

function buildProvenance({version, commit, expectedCommit, repository, runId}) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid package version');
  if (!/^[a-f0-9]{40}$/.test(commit) || commit !== expectedCommit)
    throw new Error('Build checkout must match GITHUB_SHA');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^\d+$/.test(runId))
    throw new Error('Invalid GitHub build identity');
  return {version, commit, repository,
    runUrl: `https://github.com/${repository}/actions/runs/${runId}`};
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const provenance = buildProvenance({version: require('../package.json').version, commit,
    expectedCommit: process.env.GITHUB_SHA, repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.GITHUB_RUN_ID});
  fs.mkdirSync(path.join(root, 'dist'), {recursive: true});
  fs.writeFileSync(path.join(root, 'dist/BUILD_PROVENANCE.json'), JSON.stringify(provenance, null, 2)+'\n');
  console.log(`Recorded build commit ${commit}`);
}
module.exports = {buildProvenance};
