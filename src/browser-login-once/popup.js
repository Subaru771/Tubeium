'use strict';
const byId = id => document.getElementById(id);
const status = (message, error = false) => { byId('status').textContent = message; byId('status').style.color = error ? '#ffc8c8' : '#b5e8c0'; };
byId('send').addEventListener('click', async () => {
  byId('send').disabled = true;
  try {
    // Request optional permissions directly from the click. Awaiting the
    // clipboard first can consume the activation needed by Chrome/Edge.
    const google = byId('google').checked;
    const origins = google ? ['https://*.youtube.com/*', 'https://*.google.com/*'] : ['https://*.youtube.com/*'];
    status('Allow YouTube access if your browser asks…');
    if (!await chrome.permissions.request({origins})) throw new Error('Site permission not approved. Enable the Tubeium helper permission and try again.');
    let input = byId('pair').value.trim();
    if (!input) {
      try { input = (await navigator.clipboard.readText()).trim(); } catch { /* Manual paste stays available. */ }
    }
    const match = input.match(/^([0-9]{2,5}):([a-f0-9]{64})$/i);
    if (!match || Number(match[1]) > 65535 || Number(match[1]) < 1024) {
      status('Could not read the pairing details. Return to Tubeium and click “Copy pairing details again”, then paste them above.', true);
      byId('pair').focus();
      return;
    }
    const [port, code] = [Number(match[1]), match[2]];
    status('Reading the YouTube session from this browser profile…');
    const all = await Promise.all([
      chrome.cookies.getAll({domain: 'youtube.com'}),
      ...(google ? [chrome.cookies.getAll({domain: 'google.com'})] : []),
    ]);
    const googleLoginCookie = /^(?:SID|HSID|SSID|APISID|SAPISID|SIDCC|LSID|__Secure-(?:1P|3P)(?:SID|APISID|SIDCC|SIDTS)|__Secure-ENID)$/i;
    const cookies = all.flat().filter(c => {
      const domain = c.domain.replace(/^\./, '').toLowerCase();
      return !c.partitionKey && (domain === 'youtube.com' || domain.endsWith('.youtube.com') || ((domain === 'google.com' || domain.endsWith('.google.com')) && googleLoginCookie.test(c.name)));
    });
    if (!cookies.length) throw new Error('No YouTube session found in this browser profile. Sign in to YouTube in the same Brave/Chrome/Edge browser profile as the helper.');
    status(`Importing ${cookies.length} session cookies locally…`);
    let reply;
    try {
      reply = await fetch(`http://127.0.0.1:${port}/transfer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${code}`},
        body: JSON.stringify({confirmed: true, cookies}),
        cache: 'no-store', redirect: 'error'
      });
    } catch (error) {
      throw new Error('Cannot connect to Tubeium. Keep the native app open with the sign-in guide showing, and allow local connections to 127.0.0.1.');
    }
    const data = await reply.json();
    if (!reply.ok || !data.ok) throw new Error(data.error || `Local transfer failed (${reply.status})`);
    status(data.imported > 0
      ? `${data.imported} cookies imported. Tubeium will restart automatically. Check your account after it reopens; Google may still reject this session.`
      : 'Tubeium could not import any session cookies. The app will not restart.', data.imported <= 0);
    byId('pair').value = '';
  } catch (e) {
    status(String(e.message || e) + '\nIf you still see this error, report this text without sharing any pairing code or cookies.', true);
  } finally { byId('send').disabled = false; }
});
