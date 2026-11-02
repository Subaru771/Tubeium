'use strict';
// Dependency lockfile must come from npm, never a fabricated top-level-only manifest.
const fs=require('node:fs'); const path=require('node:path');
function checkLock(pkg, lock, minimumPackages=50){
  if(!lock || lock.lockfileVersion!==3 || !lock.packages || typeof lock.packages!=='object')
    throw new Error('Expected a genuine npm v3 lockfile. Run GENERATE_LOCKFILE.cmd once with internet access.');
  if(lock.name!==pkg.name || lock.version!==pkg.version)
    throw new Error('Lockfile name/version mismatch; regenerate using npm install --package-lock-only.');
  const root=lock.packages[''];
  if(!root || root.name!==pkg.name || root.version!==pkg.version)
    throw new Error('Lockfile root is missing or stale.');
  for(const type of ['dependencies','devDependencies']){
    const requested=pkg[type]||{};
    if(JSON.stringify(Object.entries(root[type]||{}).sort())!==JSON.stringify(Object.entries(requested).sort()))
      throw new Error(`Lockfile ${type} differs from package.json.`);
    for(const [name,requestedVersion] of Object.entries(requested)){
      const dep=lock.packages[`node_modules/${name}`];
      if(!dep || !dep.version || (requestedVersion.match(/^\d+\.\d+\.\d+$/) && dep.version!==requestedVersion))
        throw new Error(`Dependency ${name} is not locked to its required version.`);
    }
  }
  const installed=Object.entries(lock.packages).filter(([name])=>name);
  if(installed.length<minimumPackages) throw new Error(`Incomplete dependency tree: only ${installed.length} packages.`);
  for(const [name,entry] of installed){
    if(entry.resolved && /^https?:/.test(entry.resolved) && !/^(sha512|sha384|sha256|sha1)-/.test(entry.integrity||''))
      throw new Error(`Package ${name} is missing a cryptographic integrity value.`);
    if(entry.resolved && /^http:/.test(entry.resolved)) throw new Error(`Insecure URL for ${name}`);
  }
  return installed.length;
}
function main(){
  const root=path.resolve(__dirname,'..');const pkg=require(path.join(root,'package.json'));
  const lockPath=path.join(root,'package-lock.json');
  if(!fs.existsSync(lockPath))throw new Error('package-lock.json is missing. Run GENERATE_LOCKFILE.cmd, then commit the generated file.');
  const n=checkLock(pkg,JSON.parse(fs.readFileSync(lockPath,'utf8')));
  console.log(`Dependency lock verified: ${n} resolved packages, root and integrity checked.`);
}
if(require.main===module){try{main()}catch(e){console.error('Dependency gate FAILED:',e.message);process.exitCode=1;}}
module.exports={checkLock};
