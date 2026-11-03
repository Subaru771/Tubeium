'use strict';
const crypto = require('node:crypto');
const MAX_BINARY = 125 * 1024 * 1024;
function expectedHash(manifest, asset) {
  if(typeof manifest!=='string' || manifest.length>300000 || !/^[a-zA-Z0-9_.-]+$/.test(asset)) throw new Error('Invalid checksum manifest');
  const entry=manifest.split(/\r?\n/).map(line => /^(?<hash>[a-fA-F0-9]{64})\s+\*?(?<name>[^\s]+)$/.exec(line)).find(m=>m && m.groups.name===asset);
  if(!entry) throw new Error('Downloader checksum unavailable; refusing unverified binary');
  return entry.groups.hash.toLowerCase();
}
function verifyBinary(binary, hash) {
  if(!Buffer.isBuffer(binary)||!binary.length||binary.length>MAX_BINARY)throw new Error('Invalid downloader binary size');
  const digest=crypto.createHash('sha256').update(binary).digest('hex');
  if(!/^[0-9a-f]{64}$/.test(hash) || !crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(hash)))throw new Error('Downloader integrity check failed');
  return true;
}
module.exports={expectedHash,verifyBinary,MAX_BINARY};
