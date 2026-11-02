'use strict';
// A separate, empty browser profile for one browser-assisted sign-in flow.
// Never access or copy the user's normal Brave/Chrome/Edge profile.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PREFIX = 'tubeium-signin-';
function pruneOldProfiles(tempRoot = os.tmpdir(), maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  // Old temporary profiles can contain signed-in cookies. Only examine our own
  // named directories in the system temp folder, never a normal browser profile.
  try {
    for (const item of fs.readdirSync(tempRoot)) {
      if (!item.startsWith(PREFIX)) continue;
      const candidate = path.join(tempRoot, item);
      try {
        const stat = fs.lstatSync(candidate);
        if (stat.isDirectory() && !stat.isSymbolicLink() && Date.now() - stat.mtimeMs > maxAgeMs)
          removeCleanProfile(candidate, tempRoot);
      } catch { /* Ignore inaccessible or in-use profile. */ }
    }
  } catch { /* No access to system temp; still allow signing in. */ }
}
function createCleanProfile(tempRoot = os.tmpdir()) {
  pruneOldProfiles(tempRoot);
  const directory = fs.mkdtempSync(path.join(tempRoot, PREFIX));
  return directory;
}
function chromiumProfileArgs(profileDir, url) {
  if (typeof profileDir !== 'string' || !path.isAbsolute(profileDir)) throw new Error('Invalid isolated browser profile');
  if (!/^(https:\/\/www\.youtube\.com\/?|(?:brave|chrome|edge|opera|vivaldi):\/\/extensions)$/.test(url)) {
    throw new Error('Unsupported browser sign-in address');
  }
  return [`--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check', url];
}
// Only clean up profiles we explicitly created, and do not touch the user's real profile.
function removeCleanProfile(directory, tempRoot = os.tmpdir()) {
  const base = path.resolve(tempRoot);
  if (typeof directory !== 'string' || path.dirname(path.resolve(directory)) !== base ||
      !path.basename(directory).startsWith(PREFIX)) return false;
  try { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }); return true; }
  catch { return false; } // Running browsers may have Windows-locked files.
}
module.exports = { createCleanProfile, chromiumProfileArgs, removeCleanProfile, pruneOldProfiles };
