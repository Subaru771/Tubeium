# Tubeium Windows acceptance tests

These manual checks must run on actual Windows 10/11, even if automated CI passes. Use a disposable local profile and only your own Google account. **Never upload cookies, session tokens or sensitive logs.**

1. Run `scripts\BUILD_WINDOWS_EXE.cmd` from the cloned repository and confirm `dist\Tubeium-1.0.4-Setup-x64.exe` plus `dist\Tubeium-1.0.4-Portable-x64.exe` are created.
2. Run `scripts\VERIFY_WINDOWS_BUILD.cmd`; verify both files and generated SHA-256 checksums.
3. Install on a clean Windows profile without a separate Node.js installation; verify Start Menu shortcut and clean uninstall.
4. Open Settings; verify themes and all 201 settings load and persist across restarts.
5. Test signed-out YouTube browsing and playback; try both 1080p and 4K-capable content.
6. With your own test account, evaluate optional sign-in help and session persistence; do not assume Google accepts third-party sessions.
7. Queue, pause, resume and retry downloads; test video and audio formats, FFmpeg handling and offline playback.
8. Exercise bookmarks, playlists, progress, library import/export and settings backups.
9. Verify restrictive permissions, external-link prompts, media keys, mini-player, SponsorBlock and gamepad controls where available.
10. Check Windows security alerts, installed and portable startup, crash/restart recovery and update behavior.
11. Test an upgrade from the previous release without losing local settings and library data.

Record the Windows version, test steps, and non-sensitive outcomes. **CI success is not a claim that every live feature was manually validated.**
