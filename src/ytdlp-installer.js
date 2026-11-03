'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { expectedHash, verifyBinary, MAX_BINARY } = require('./downloader-integrity');
const pin = require('./ytdlp-pin');

const RELEASES = 'https://github.com/yt-dlp/yt-dlp/releases/';
function assetName(platform = process.platform) {
  return platform === 'win32' ? 'yt-dlp.exe' : platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp';
}

// The first install uses an app-pinned checksum. "Update Downloader" explicitly
// opts into the latest release, verified against its accompanying manifest.
function createInstaller({ net, binDir, canRun }) {
  const localPath = () => path.join(binDir(), assetName());
  return async function ensureYtDlp(onStatus, {useLatest = false} = {}) {
    const local = localPath();
    if (!useLatest) {
      if (fs.existsSync(local)) return local;
      if (await canRun('yt-dlp', ['--version'])) return 'yt-dlp';
    }
    const asset = assetName();
    let url, hash;
    if (useLatest) {
      onStatus('Downloading latest yt-dlp…');
      const base = RELEASES + 'latest/download/';
      const sums = await net.fetch(base + 'SHA2-256SUMS');
      if (!sums.ok) throw new Error('Could not retrieve yt-dlp checksums (' + sums.status + ')');
      hash = expectedHash(await sums.text(), asset);
      url = base + asset;
    } else {
      hash = pin.sha256[asset];
      if (!hash) throw new Error('No pinned yt-dlp checksum for this platform');
      onStatus('Downloading yt-dlp ' + pin.version + '…');
      url = RELEASES + 'download/' + pin.version + '/' + asset;
    }
    const res = await net.fetch(url);
    if (!res.ok) throw new Error('Could not download yt-dlp (' + res.status + ')');
    const length = Number(res.headers.get('content-length') || 0);
    if (length > MAX_BINARY) throw new Error('Downloader exceeds maximum safe download size');
    const bytes = Buffer.from(await res.arrayBuffer());
    verifyBinary(bytes, hash);
    fs.mkdirSync(binDir(), {recursive:true});
    const staged = local + '.download', backup = local + '.backup';
    try {
      fs.writeFileSync(staged, bytes);
      if (process.platform !== 'win32') fs.chmodSync(staged, 0o755);
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      if (fs.existsSync(local)) fs.renameSync(local, backup);
      fs.renameSync(staged, local);
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
    } catch (error) {
      if (!fs.existsSync(local) && fs.existsSync(backup)) fs.renameSync(backup, local);
      try { if (fs.existsSync(staged)) fs.unlinkSync(staged); } catch {}
      throw error;
    }
    return local;
  };
}
module.exports = { createInstaller, assetName };
