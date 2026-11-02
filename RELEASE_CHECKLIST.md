# Tubeium v4.5.2 — release checklist

## Automated checks — packaged in source
- [x] Original Tubeium Electron desktop architecture preserved
- [x] 201 settings retained (schema checked)
- [x] One-time transfer bridge serialized; Google cookie permission defaults off
- [x] Privacy/security/licensing notices added (publisher review still required)
- [x] CI pre-release tests and package audit added
- [x] Release workflow configured to require an explicit approval gate and certificate
- [x] Installer/portable artifact smoke verification steps added to Windows workflow
- [x] Release SHA-256 generation configured

## Reproducible build requirements (new)
- [ ] Generate `package-lock.json` with `GENERATE_LOCKFILE.cmd` and commit it to the project repository (not bundled in this offline-generated ZIP)
- [ ] `npm ci` and full `npm audit --audit-level=high` succeed on Windows / GitHub Actions
- [ ] Windows install/uninstall, native player, authentication, downloads and updater acceptance tests pass

## Must be completed by publisher before a public stable release
- [ ] Choose license (replace provisional all-rights-reserved notice if intended to open-source)
- [ ] Review third-party binary, asset, API and media rights
- [ ] Set up private vulnerability reporting and publish a support/privacy contact
- [ ] Validate privacy policy against final binary and applicable legal requirements
- [ ] Supply a Windows code signing certificate and release approval secret
- [ ] Configure GitHub Releases repository and publish a signed, versioned release
- [ ] Verify installation and uninstall on clean Windows 10 and 11
- [ ] Verify login and persistence using a real consenting Google account
- [ ] Verify full download, pause/resume, yt-dlp/FFmpeg, offline playback and updates
- [ ] Test 201 settings on live YouTube and identify any unsupported controls
- [ ] Evaluate project name/trademark and YouTube platform terms before marketing

**Release state: private beta candidate. DO NOT call this production validated.**
