const assert = require('node:assert/strict');
const { allowedHost, parseNetscapeCookies, importCookies } = require('../signin-cookies');
const now = Math.floor(Date.now() / 1000);
const sample = [
  '# Netscape HTTP Cookie File',
  `.youtube.com\tTRUE\t/\tTRUE\t${now+50000}\tLOGIN_INFO\tprivate-local-sample`,
  `#HttpOnly_.google.com\tTRUE\t/\tTRUE\t${now+50000}\tSID\ttoken-value`,
  `.othersite.com\tTRUE\t/\tFALSE\t${now+50000}\tSID\tirrelevant`,
  `.google.com.evil.org\tTRUE\t/\tTRUE\t${now+50000}\tSID\tmalicious`,
  `.youtube.com\tTRUE\t/\tTRUE\t${now-1}\tEXPIRED\told`,
].join('\n');
assert(allowedHost('www.youtube.com'));
assert(allowedHost('accounts.google.com'));
assert(!allowedHost('accounts.google.com.evil.org'));
assert(!allowedHost('example.com'));
const parsed = parseNetscapeCookies(sample);
assert.equal(parsed.cookies.length, 2);
assert.equal(parsed.relevantAuth, 2);
assert.equal(parsed.skippedExpired, 1);
assert.equal(parsed.cookies[1].httpOnly, true);
assert.equal(parsed.cookies[1].secure, true);
assert.equal(parsed.cookies[1].domain, '.google.com');
assert.throws(() => parseNetscapeCookies('a'.repeat(3*1024*1024+1)), /oversized/);
assert.throws(() => parseNetscapeCookies('hello'), /No usable/);
(async () => {
  const saved = [];
  const jar = { set: async (c) => { saved.push(c); }, flushStore: async () => { saved.push('flushed'); } };
  const result = await importCookies(jar, sample);
  assert.equal(result.added, 2);
  assert.equal(result.failed, 0);
  assert.equal(saved.length, 3);
  console.log('Sign-in cookie validation tests passed');
})().catch(err => { console.error(err); process.exitCode = 1; });
