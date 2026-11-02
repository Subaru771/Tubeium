# Tubeium Windows acceptance tests (must be run on actual Windows 10/11)

Do not use a Google account belonging to someone else and **never upload authentication cookies, temporary pairing codes or logs containing secrets**.

1. Run `GENERATE_LOCKFILE.cmd` and commit `package-lock.json`.
2. Run `BUILD_WINDOWS_EXE.cmd`; verify `dist\Tubeium-4.5.2-Setup-x64.exe` and portable build.
3. Run `VERIFY_WINDOWS_BUILD.cmd` to get SHA-256 checksums.
4. On a clean Windows profile, install the Setup EXE without Node.js; confirm Start Menu and uninstall support.
5. Start Tubeium, confirm the native player and all 201 settings load, and run one 1080p video and one 4K-capable video.
6. Use the browser-assisted Google sign-in with a personal test account; confirm the account avatar. Close and reopen Tubeium, then restart Windows and reconfirm.
7. Pause/resume a download; restart the app during a queued download, verify recovery; test MP4 and audio downloads and offline playback.
8. Check Settings export/import, library backups, restore and playlists on a disposable Windows user profile.
9. Verify that camera/microphone/geolocation permissions are denied when the settings require it; confirm external links ask for permission.
10. Test miniplayer, media keys, PiP, SponsorBlock and controller input; record any failing settings by key.
11. Install 4.5.2 over 4.5.1 without wiping data; test uninstall without deleting user-managed downloads.
12. After publishing a signed test release and subsequent version, test actual update prompt and updater signature verification.

A full Windows acceptance run is mandatory before calling Tubeium production-stable. Static tests and ZIP integrity alone are insufficient.
