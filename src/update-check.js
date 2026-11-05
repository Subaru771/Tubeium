'use strict';
// Only official GitHub releases are accepted. No YouTube account data, cookies,
// custom download URLs, or executable installer downloads pass through this module.
const LATEST_API_URL='https://api.github.com/repos/Subaru771/Tubeium/releases/latest';
const RELEASES_URL='https://github.com/Subaru771/Tubeium/releases/latest';
function parseVersion(value) {
  if (typeof value!=='string') return null;
  const match=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return null;
  const parts=match.slice(1).map(Number);
  if (parts.some(n=>!Number.isSafeInteger(n)||n<0)) return null;
  return parts;
}
function compareVersions(a,b) {
  const aa=parseVersion(a),bb=parseVersion(b);
  if (!aa||!bb) throw new Error('Could not interpret Tubeium version');
  for(let i=0;i<3;i++) if(aa[i]!==bb[i]) return aa[i]>bb[i]?1:-1;
  return 0;
}
function inspectRelease(payload,currentVersion) {
  if(!payload||typeof payload!=='object'||payload.draft===true||payload.prerelease===true) {
    throw new Error('GitHub returned no stable release');
  }
  const tag=payload.tag_name;
  if(typeof tag!=='string'||!/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error('GitHub returned an invalid release version');
  }
  const comparison=compareVersions(tag,currentVersion);
  // Do not open URLs provided in remote release notes; use a hard-coded URL.
  return {
    tag,
    currentVersion,
    status:comparison>0?'available':comparison<0?'ahead':'current',
    url:RELEASES_URL
  };
}
async function fetchLatest(fetchFn,currentVersion,{signal}={}) {
  if(typeof fetchFn!=='function')throw new Error('Update request is unavailable');
  const response=await fetchFn(LATEST_API_URL,{
    method:'GET',
    headers:{Accept:'application/vnd.github+json','User-Agent':'Tubeium-Desktop'},
    signal
  });
  if(!response||!response.ok) {
    if(response?.status===403||response?.status===429)throw new Error('GitHub update service rate limit reached');
    throw new Error('GitHub update service is unavailable');
  }
  const bytes=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(bytes)&&bytes>250000)throw new Error('Unexpected GitHub response size');
  const body=await response.text();
  if(body.length>250000)throw new Error('Unexpected GitHub response size');
  let payload;
  try {payload=JSON.parse(body);}catch{throw new Error('Invalid response from GitHub');}
  return inspectRelease(payload,currentVersion);
}
module.exports={LATEST_API_URL,RELEASES_URL,parseVersion,compareVersions,inspectRelease,fetchLatest};
