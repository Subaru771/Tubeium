'use strict';
// Finds the browser Windows is actually set to use and builds a launch command
// for it. Pure functions: the registry reader and file check are injected so the
// logic can be tested on any OS.
//
// Why not just shell.openExternal()? On some Windows setups it ends up in
// Microsoft Edge even when another browser is the default. Reading the default
// browser's own "open" command from the registry and running that is exact.

const LABELS = {
  brave: 'Brave', chrome: 'Chrome', edge: 'Edge', opera: 'Opera', vivaldi: 'Vivaldi',
  chromium: 'Chromium', firefox: 'Firefox', other: 'your default browser',
};
// Browsers that can load the Tubeium helper extension.
const CHROMIUM_BASED = new Set(['brave', 'chrome', 'edge', 'opera', 'vivaldi', 'chromium']);
const EXTENSIONS_URL = {
  brave: 'brave://extensions', chrome: 'chrome://extensions', edge: 'edge://extensions',
  opera: 'opera://extensions', vivaldi: 'vivaldi://extensions', chromium: 'chrome://extensions',
};

// Reads a REG_SZ / REG_EXPAND_SZ value out of `reg query` output.
function parseRegValue(stdout, name) {
  const text = String(stdout || '');
  // The default value's label is localized ("(Default)", "<NO NAME>", ...), so
  // for `reg query /ve` take the only value line there is.
  const pattern = name
    ? new RegExp(`^\\s*${name}\\s+REG_(?:EXPAND_)?SZ\\s+(.+?)\\s*$`, 'im')
    : /REG_(?:EXPAND_)?SZ\s+(.+?)\s*$/im;
  const match = text.match(pattern);
  return ((match && match[1]) || '').trim();
}

function expandEnv(text, env) {
  // Only real variables; %1, %L and %* (URL placeholders) are left alone.
  return String(text).replace(/%([A-Za-z_][A-Za-z0-9_()]*)%/g, (whole, key) => {
    const hit = Object.keys(env || {}).find(k => k.toLowerCase() === key.toLowerCase());
    return hit ? env[hit] : whole;
  });
}

// Splits a Windows command line into arguments, honouring double quotes.
function splitCommand(command) {
  const parts = [];
  let current = '', quoted = false, started = false;
  for (const ch of String(command)) {
    if (ch === '"') { quoted = !quoted; started = true; continue; }
    if (!quoted && /\s/.test(ch)) {
      if (started) { parts.push(current); current = ''; started = false; }
      continue;
    }
    current += ch; started = true;
  }
  if (started) parts.push(current);
  return parts;
}

// Turns a registry "open" command into {exe, args} with the URL filled in.
function buildLaunch(command, url) {
  const parts = splitCommand(command);
  if (!parts.length || !/\.exe$/i.test(parts[0])) return null;
  const [exe, ...rest] = parts;
  let placed = false;
  const args = rest.map(arg => {
    if (!/%(?:1|L|\*)/i.test(arg)) return arg;
    placed = true;
    return arg.replace(/%(?:1|L|\*)/gi, url);
  });
  if (!placed) args.push(url);
  return { exe, args };
}

function classify(...hints) {
  const text = hints.filter(Boolean).join(' ').toLowerCase();
  if (/brave/.test(text)) return 'brave';
  if (/msedge|microsoftedge|msedgehtm/.test(text)) return 'edge';
  if (/vivaldi/.test(text)) return 'vivaldi';
  if (/opera/.test(text)) return 'opera';
  if (/firefox/.test(text)) return 'firefox';
  if (/chromium/.test(text)) return 'chromium';
  if (/chrome/.test(text)) return 'chrome';
  return 'other';
}

// io: { query(key, valueName|null) -> `reg query` stdout, exists(path) -> bool, env }
function resolveDefaultBrowser(io) {
  for (const scheme of ['https', 'http']) {
    const progId = parseRegValue(
      io.query(`HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${scheme}\\UserChoice`, 'ProgId'),
      'ProgId');
    if (!progId) continue;
    const command = expandEnv(parseRegValue(io.query(`HKCR\\${progId}\\shell\\open\\command`, null), null), io.env);
    const launch = command ? buildLaunch(command, 'https://www.youtube.com') : null;
    const id = classify(progId, launch && launch.exe);
    if (launch && io.exists(launch.exe)) return { id, label: LABELS[id], progId, command, exe: launch.exe };
    // Known ProgId but no runnable command (e.g. a Store app): still report who it is.
    return { id, label: LABELS[id], progId, command: '', exe: '' };
  }
  return null;
}

module.exports = {
  LABELS, CHROMIUM_BASED, EXTENSIONS_URL,
  parseRegValue, expandEnv, splitCommand, buildLaunch, classify, resolveDefaultBrowser,
};
