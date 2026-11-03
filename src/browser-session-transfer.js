'use strict';
// One-time, explicit browser-to-local-Electron session import. No persistent
// browser extension, remote service, credential collection or profile scraping.
const http = require('node:http');
const crypto = require('node:crypto');

const MAX_BYTES = 400 * 1024;
const MAX_COOKIES = 400;
const LIFETIME_MS = 10 * 60 * 1000;
const VALID_HOST = /^(?:[a-z0-9-]+\.)*(?:youtube\.com|google\.com)$/i;
const ALLOWED_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
const TOKEN_RE = /^[a-f0-9]{64}$/i;
// Only authentication-related Google cookies, not unrelated Gmail/Search data.
const GOOGLE_LOGIN_COOKIE = /^(?:SID|HSID|SSID|APISID|SAPISID|SIDCC|LSID|__Secure-(?:1P|3P)(?:SID|APISID|SIDCC|SIDTS)|__Secure-ENID)$/i;

function validateCookies(items, now = Date.now()/1000) {
  if (!Array.isArray(items) || items.length > MAX_COOKIES) throw new Error('Invalid cookie count');
  const result = [];
  const seen = new Set();
  for (const src of items) {
    if (!src || typeof src !== 'object') continue;
    const domain = String(src.domain || '').toLowerCase();
    const hostname = domain.replace(/^\./, '');
    if (!VALID_HOST.test(hostname)) continue;
    if ((hostname === 'google.com' || hostname.endsWith('.google.com')) && !GOOGLE_LOGIN_COOKIE.test(src.name)) continue;
    // HTTPS-only; never accept data for unrelated websites.
    if (typeof src.name !== 'string' || !/^[^\x00-\x20\x7f;=]{1,200}$/.test(src.name)) continue;
    if (typeof src.value !== 'string' || src.value.length > 8192) continue;
    if (src.partitionKey) continue; // Do not flatten Chrome's partitioned cookies.
    const cookiePath = typeof src.path === 'string' && src.path.startsWith('/') && !/\r|\n/.test(src.path) ? src.path : '/';
    const hostOnly = src.hostOnly === true || src.name.startsWith('__Host-') || !domain.startsWith('.');
    if (src.name.startsWith('__Host-') && (cookiePath !== '/' || !src.secure)) continue;
    if (src.name.startsWith('__Secure-') && !src.secure) continue;
    const expirationDate = Number(src.expirationDate);
    if (src.expirationDate !== undefined && (!Number.isFinite(expirationDate) || expirationDate <= now)) continue;
    const key = `${domain}\0${cookiePath}\0${src.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const mapped = {
      url: `https://${hostname}${cookiePath}`,
      name: src.name, value: src.value, path: cookiePath,
      secure: !!src.secure || src.name.startsWith('__Host-'),
      httpOnly: !!src.httpOnly,
      ...(hostOnly ? {} : { domain }),
      ...(src.expirationDate !== undefined && !src.session ? { expirationDate } : {}),
    };
    if (['no_restriction', 'lax', 'strict'].includes(src.sameSite)) mapped.sameSite = src.sameSite;
    result.push(mapped);
  }
  return result;
}

async function installBrowserCookies(cookieJar, input) {
  const items = validateCookies(input);
  if (!items.length) throw new Error('No eligible YouTube/Google cookies were transferred');
  let imported = 0, rejected = 0;
  for (const entry of items) {
    try { await cookieJar.set(entry); imported++; } catch { rejected++; }
  }
  if (imported) await cookieJar.flushStore();
  return { imported, rejected }; // Never return cookie values to the browser.
}

function startTransfer({ cookieJar, onImported, ttl = LIFETIME_MS, createServer = http.createServer }) {
  const token = crypto.randomBytes(32).toString('hex');
  let finished = false;
  let processing = false;
  let timer;
  let server;
  const close = () => {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    if (server?.listening) server.close();
  };
  const listener = async (req, res) => {
    const origin = req.headers.origin || '';
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (ALLOWED_ORIGIN.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    const reply = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(obj));
    };
    if (!ALLOWED_ORIGIN.test(origin)) return reply(403, { error: 'Browser extension origin required' });
    if (req.method === 'OPTIONS') return reply(204, {});
    if (finished || processing || req.method !== 'POST' || req.url !== '/transfer') return reply(404, { error: 'Transfer unavailable' });
    const provided = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!TOKEN_RE.test(provided) || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(token))) return reply(401, { error: 'Incorrect pairing code' });
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'JSON required' });
    let payload = '';
    try {
      for await (const chunk of req) {
        payload += chunk.toString('utf8');
        if (Buffer.byteLength(payload, 'utf8') > MAX_BYTES) return reply(413, { error: 'Transfer too large' });
      }
      const body = JSON.parse(payload);
      if (body.confirmed !== true || !Array.isArray(body.cookies)) return reply(422, { error: 'Explicit confirmation required' });
      // Lock before the first async cookie write so parallel requests cannot reuse a pairing code.
      if (processing || finished) return reply(409, { error: 'Transfer already in progress' });
      processing = true;
      const result = await installBrowserCookies(cookieJar, body.cookies);
      // Consume the one-time token only after valid request and import.
      reply(200, { ok: true, ...result });
      close();
      try { await onImported(result); } catch {} // Don't expose application errors to the extension.
    } catch (err) {
      // Unlock only on failure; the one-time pairing can then be retried.
      processing = false;
      reply(422, { error: String(err.message || err).slice(0, 200) });
    }
  };
  server = createServer(listener);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      timer = setTimeout(close, ttl);
      if (timer.unref) timer.unref();
      resolve({ port: address.port, code: token, close });
    });
  });
}

module.exports = { validateCookies, installBrowserCookies, startTransfer };
