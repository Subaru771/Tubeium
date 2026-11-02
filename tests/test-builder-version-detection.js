const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
for (const name of ['BUILD_WINDOWS_EXE.cmd', 'FAST_BUILD_WINDOWS_EXE.cmd', 'VERIFY_WINDOWS_BUILD.cmd', 'CHECK_EXISTING_INSTALLER.cmd']) {
  const content = fs.readFileSync(path.join(root, name), 'utf8');
  assert.match(content, /fast-build-cache\.js version/, name + ': version must come from package.json');
  assert.doesNotMatch(content, /Tubeium-4\.5\.9-(Setup|Portable)-x64\.exe/, name + ': must not require an old EXE');
}
const full = fs.readFileSync(path.join(root, 'BUILD_WINDOWS_EXE.cmd'), 'utf8');
assert.match(full, /if not exist "%TUBEIUM_SETUP%" goto installerretry/);
assert.match(full, /if not exist "%TUBEIUM_PORTABLE%" goto portablefail/);
console.log('PASS: Windows build scripts detect the version dynamically and validate the right executable.');
