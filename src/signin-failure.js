'use strict';

// Only inspect generic authentication error wording. Never inspect, store,
// transmit, or log emails, passwords, cookies or form values.
const BROWSER_REJECTION_MESSAGES = Object.freeze([
  'this browser or app may not be secure',
  'this browser is not supported',
  'this browser or app is not secure',
  'try using a different browser',
  'sign in with a supported browser',
  "you can't sign in from this app",
  'you cannot sign in from this app',
  'access blocked: this app',
  "couldn't sign you in. this browser",
]);

function isSignInLocation(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host === 'accounts.google.com' ||
      (host === 'www.youtube.com' && /^\/(?:signin|account)/i.test(url.pathname));
  } catch { return false; }
}

// Page-side script returns ONLY a fixed enum, never page text or user data.
const GOOGLE_ERROR_SCAN = `(() => {
  const text = String(document.body?.innerText || '').slice(0, 12000)
    .toLowerCase().replace(/\\s+/g, ' ');
  const markers = ${JSON.stringify(BROWSER_REJECTION_MESSAGES)};
  return markers.some(marker => text.includes(marker)) ? 'browser-rejected' : null;
})()`;

function classifyFailure({ url, signal, code } = {}) {
  if (!isSignInLocation(url)) return null;
  if (signal === 'browser-rejected') return 'browser-rejected';
  // Chromium ERR_ABORTED (-3) is normal during OAuth redirects, not a failure.
  if (typeof code === 'number' && code < 0 && code !== -3) return 'network-error';
  return null;
}

const MESSAGES = Object.freeze({
  'browser-rejected': 'Google did not accept sign-in inside Tubeium.',
  'network-error': 'The Google sign-in page could not load.',
  'import-empty': 'No usable session was imported into Tubeium.',
  'session-unconfirmed': 'Tubeium could not confirm that YouTube accepted the imported session.',
});

function messageFor(reason) { return MESSAGES[reason] || MESSAGES['session-unconfirmed']; }
module.exports = { BROWSER_REJECTION_MESSAGES, GOOGLE_ERROR_SCAN, isSignInLocation, classifyFailure, messageFor };
