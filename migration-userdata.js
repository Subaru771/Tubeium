'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Copy ONLY application preferences and task history from the old product name.
// Leave the previous app and profile untouched; do not overwrite new files.
const LEGACY_DIR = 'YouPlus PC';
const PORTABLE_FILES = Object.freeze([
  'settings.json',
  'download-queue.json',
  'download-archive.txt',
  'playback-memory.json',
  'window-state.json',
]);
function migrateUserData(appDataDir, destination) {
  const source = path.join(appDataDir, LEGACY_DIR);
  if (path.resolve(source).toLowerCase() === path.resolve(destination).toLowerCase()) return [];
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) return [];
  const copied = [];
  for (const name of PORTABLE_FILES) {
    const input = path.join(source, name);
    const output = path.join(destination, name);
    try {
      if (!fs.statSync(input).isFile()) continue;
      fs.mkdirSync(destination, { recursive: true });
      fs.copyFileSync(input, output, fs.constants.COPYFILE_EXCL);
      copied.push(name);
    } catch (error) {
      // Missing files and existing destination files are normal; fail softly for other issues.
      if (!['ENOENT', 'EEXIST'].includes(error.code)) console.warn('Could not migrate', name, error.message);
    }
  }
  return copied;
}
module.exports = { migrateUserData, PORTABLE_FILES };
