# Tubeium Windows acceptance tests

These manual checks must run on actual Windows 10/11, even if automated CI passes. Use a disposable local profile and only your own Google account. **Never upload cookies, session tokens or sensitive logs.**

1. Run `scripts\BUILD_WINDOWS_EXE.cmd` from the cloned repository and confirm `dist\Tubeium-1.0.5-Setup-x64.exe` plus `dist\Tubeium-1.0.5-Portable-x64.exe` are created.
2. Run `scripts\VERIFY_WINDOWS_BUILD.cmd`; verify both files and generated SHA-256 checksums.
3. Install on a clean Windows profile without a separate Node.js installation; verify Start Menu shortcut and clean uninstall.
4. Open Settings; verify themes and all 201 settings load and persist across restarts.
5. Test signed-out YouTube browsing and playback; try both 1080p and 4K-capable content. Check that **Ads & SponsorBlock → Skip YouTube ads** defaults ON on a new profile, stays OFF when explicitly disabled, and doesn't break video playback. Ads may still appear.
6. With your own test account, evaluate optional sign-in help and session persistence; do not assume Google accepts third-party sessions.
7. Queue, pause, resume and retry downloads; test video and audio formats, FFmpeg handling and offline playback.
8. Exercise bookmarks, playlists, progress, library import/export and settings backups.
9. Verify restrictive permissions, external-link prompts, media keys, mini-player, SponsorBlock and gamepad controls where available.
10. Check Windows security alerts, installed and portable startup, crash/restart recovery and update behavior.
11. Test an upgrade from the previous release without losing local settings and library data.

Record the Windows version, test steps, and non-sensitive outcomes. **CI success is not a claim that every live feature was manually validated.**

## Touchscreen and headphone Next

- On a Windows touchscreen or pen device, tap **Next** on a watch page and verify exactly one next video opens. Repeat in a playlist and on Shorts; unavailable/disabled next controls must not navigate elsewhere.
- Use **Tools** to open player controls without a hover gesture. Check opening, using a control, tapping outside to close, scrolling the feed, and navigating to another video. Repeat on a hybrid laptop using a mouse and touch.
- At portrait tablet widths, test Settings navigation and toggles, download queue actions, library playlists, and all launcher-menu entries. Targets should be reachable without horizontal page overflow; launcher menus may scroll vertically.
- While a video is playing, press your wired/Bluetooth headset's Next command (often a double press), the keyboard's media-next key, and Windows media-overlay Next. Verify exactly one next video, including while Tubeium is minimized; then test another media application owns the keys when it is active. Play/pause and seek must continue to follow YouTube's handlers; Previous must use the same navigation as the on-screen button.
- Test headphone disconnection/reconnection and Windows lock-screen media controls. Device gesture mappings depend on the headset and Windows; record the hardware and results. These checks have not been claimed as performed by source or browser tests.

## Complete playback navigation

- Verify Previous, Play/Pause and Next buttons on normal videos, playlists, live pages and Shorts. Playlist/Shorts boundaries must not escape into unrelated history. On normal videos without native Previous, visit several videos and verify Previous/Next across a page reload; visits stay in app memory only.
- Enter/exit YouTube fullscreen, resize to the mini-player, rotate a touchscreen and open/close the on-screen keyboard. Check transport stays reachable, Tools can be opened/closed, and controls do not navigate while ads are showing. Play/Pause remains available.
- Open a completed download from the Library or Download Manager. Confirm the queue follows the displayed completed-download order and each job's file order, without duplicate paths. Use Previous/Next, play/pause, seek and fullscreen with mouse, touch, keyboard and headset.
- Test first/last queue boundaries, remove a not-yet-played file while the player is open, and verify it is skipped. Test a missing/unsupported current file: an error must appear, with another-file and external-player options available.
- Toggle “Play next automatically”, finish a file, and verify advancement only when enabled and a next file exists. Replace the queue by opening another download while a command is pending; old commands must not change the replacement queue.
- Repeat headset play/pause, previous/next and seek while minimized and at the Windows lock screen. Switch active media apps, reconnect wired/Bluetooth headsets and record the OS/headset behavior. This requires physical Windows testing; synthetic Media Session tests do not establish device compatibility.
