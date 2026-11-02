'use strict';

// Read user-provided Netscape cookies.txt files. Never retrieve browser profiles,
// cookies, passwords, or tokens automatically.
const ALLOWED_DOMAINS = ['youtube.com', 'google.com'];
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_COOKIES = 1000;

function allowedHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\./, '');
  return ALLOWED_DOMAINS.some(domain => h === domain || h.endsWith('.' + domain));
}

function parseNetscapeCookies(contents, now = Date.now() / 1000) {
  if (typeof contents !== 'string' || Buffer.byteLength(contents, 'utf8') > MAX_FILE_BYTES) {
    throw new Error('Invalid or oversized cookies.txt file');
  }
  const cookies = [];
  let relevantAuth = 0;
  let skippedExpired = 0;
  const lines = contents.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const httpOnly = raw.startsWith('#HttpOnly_');
    if (raw.startsWith('#') && !httpOnly) continue;
    const line = httpOnly ? raw.slice('#HttpOnly_'.length) : raw;
    const fields = line.split('\t');
    if (fields.length < 7) continue;
    const [rawDomain, subdomains, rawPath, secureFlag, expires, name, ...valueParts] = fields;
    const domain = rawDomain.trim().toLowerCase();
    if (!allowedHost(domain)) continue;
    const host = domain.replace(/^\./, '');
    if (!/^[a-z\d.-]+$/.test(host) || host.includes('..') || !name || /[\x00-\x1f\x7f;=]/.test(name)) continue;
    if (cookies.length >= MAX_COOKIES) throw new Error('Too many YouTube/Google cookies in file');
    const path = rawPath.startsWith('/') ? rawPath : '/';
    const secure = secureFlag.toUpperCase() === 'TRUE' || name.startsWith('__Secure-') || name.startsWith('__Host-');
    const isHostOnly = subdomains.toUpperCase() !== 'TRUE' || name.startsWith('__Host-');
    const expiry = Number(expires);
    if (!Number.isFinite(expiry)) continue;
    if (expiry > 0 && expiry <= now) { skippedExpired++; continue; }
    // Chromium enforces __Host- cookies as secure, host-only, path='/'.
    if (name.startsWith('__Host-') && path !== '/') continue;
    const cookie = {
      url: `https://${host}${path}`,
      name,
      value: valueParts.join('\t'),
      path,
      secure,
      httpOnly,
      ...(isHostOnly ? {} : { domain: domain.startsWith('.') ? domain : '.' + domain }),
      ...(expiry > 0 ? { expirationDate: expiry } : {}),
    };
    if (/^(?:__Secure-\d+)?(?:SID|APISID|SAPISID|HSID|SSID)$|^(?:LOGIN_INFO|__Secure-\d+P(?:SID|APISID))$/i.test(name)) relevantAuth++;
    cookies.push(cookie);
  }
  if (!cookies.length) throw new Error('No usable Google or YouTube cookies found in this file. Export a Netscape-format cookies.txt from your own signed-in browser.');
  return { cookies, relevantAuth, skippedExpired };
}

async function importCookies(cookieJar, data) {
  const { cookies, relevantAuth } = parseNetscapeCookies(data);
  let added = 0, failed = 0;
  for (const cookie of cookies) {
    try { await cookieJar.set(cookie); added++; }
    catch { failed++; }
  }
  if (added) await cookieJar.flushStore();
  return { added, failed, relevantAuth, total: cookies.length };
}

module.exports = { allowedHost, parseNetscapeCookies, importCookies, MAX_FILE_BYTES };
