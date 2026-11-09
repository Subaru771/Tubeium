# Tubeium 1.0.9 — Windows acceptance results

Status: **Pending actual Windows execution**. Prepared November 9, 2026 from a Linux environment. No Windows runtime results or Google account sign-in results are claimed.

Published binary build commit: `1095a29a6d8516c03408926b08e00c175b701b47`.
Build run: https://github.com/Subaru771/Tubeium/actions/runs/42584995441

Use [WINDOWS_ACCEPTANCE_TESTS.md](WINDOWS_ACCEPTANCE_TESTS.md) and fill in Windows version, edition (installer/portable), exact EXE SHA-256, tester, date, and observed results. Use a disposable profile and your own consenting test account; keep cookies and credentials private.

| Check | Result | Evidence / issue |
| --- | --- | --- |
| Official EXE checksums | Passed on Linux | Downloaded both official EXEs; `sha256sum --check SHA256SUMS.txt` passed on November 9, 2026. |
| Clean installation, shortcuts, uninstall without Node.js | Pending | |
| Portable startup | Pending | |
| Settings persistence and themes | Pending | |
| Signed-out browsing, 1080p and 4K playback | Pending | |
| Ads preference ON/OFF and SponsorBlock | Pending | |
| Google sign-in and restart persistence | Pending | |
| Video/audio download, pause/resume/retry, FFmpeg | Pending | |
| Offline Play and Show File | Pending | |
| Home/search/recommendations quick actions and hover preview | Pending | |
| Shorts/live download fallback and SPA navigation | Pending | |
| Local Watch Later save/restart/remove; clear passive history | Pending | |
| Library and settings import/export/backup | Pending | |
| External links, permissions, media keys, mini-player, gamepad | Pending | |
| Crash/restart recovery and update check | Pending | |
| Upgrade preserving settings, library, queue and Watch Later | Pending | |
| Windows security alerts and Authenticode status | Pending | Published EXEs are unsigned. |

Signing remains pending a verified publisher identity and compatible signing credentials/provider. The existing production signing workflow is preparation, not proof that published files are signed.

Verified published SHA-256 values:

- Installer: `c3ea0c048bcd3813b62f5086b2b18db624b6bcd6c9cbbe3383f7a30b16401baf`
- Portable: `7b6fa42810272039a764df2dfe203f4d27ea8c3baf3e1c9334442076e26b2e66`

These integrity checks did not execute either EXE.
