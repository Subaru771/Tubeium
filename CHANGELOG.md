# Changelog

## [1.0.5] — 2026-11-03

- Fix a regression that made YouTube ads appear on fresh v1.0.4 installs: ad skipping now defaults to enabled again.
- Pass the user's **saved** ad-skipping preference to the Electron preload before YouTube's own scripts execute, avoiding the initial-off race.
- Preserve explicit OFF choices; the setting remains available in Settings → Ads & SponsorBlock.
- Add tests for the early page filter, both startup preference values, and default settings.

Ad skipping remains best-effort. YouTube can change advertising behavior without notice and some ads may still appear.


## [1.0.4] — 2026-11-03

- Integrated verified downloader changes from the contributed Tubeium ZIP without replacing v1.0.3's discoverable **↑ Show tabs** handle.
- Pin first-install yt-dlp to 2026.10.26, verify its committed SHA-256, and confirm before installing the latest release on request.
- Make experimental ad skipping **off by default** for new profiles, including the early page filter; preserve explicitly saved opt-ins.
- Offer deletion of an imported `cookies.txt` file as an **unchecked, opt-in** choice.
- Discover every `tests/test-*.js` automatically during `npm test`.
- Document practical Windows code-signing options without promising SmartScreen warnings disappear.

This update does not claim that Google authentication or every YouTube video works under all conditions.


## [1.0.3] — 2026-11-03

- Make Sign-in Help tab visibility discoverable: clicking × collapses the bottom strip into a compact **↑ Show tabs** button rather than removing all controls.
- Restore the full tab strip with a single click, without requiring a hidden shortcut or menu knowledge. The choice persists across app restarts.
- Keep the compact restore button outside the YouTube playback layout; preserve View menu / Ctrl+Shift+G as alternatives.
- Add a regression test that simulates tab hiding and restoration.

The v1.0.2 hamburger-menu and existing Sign-in Help functionality remain unchanged. This is an unsigned Windows release.


## [1.0.2] — 2026-11-03

- Fix YouTube's upper-left guide/hamburger when Tubeium's Hide navigation sidebar preference is enabled. Manually clicking the menu temporarily reveals the navigation drawer without changing the saved preference.
- Make the bottom Sign-in Help tab strip optional: hide with ×, restore from the View menu (Ctrl+Shift+G), and persist the choice across launches.
- Add a Show bottom tabs control inside the Help page, preserve full-window playback and fullscreen behavior, and make old/empty tab preference files safe.
- Add regression coverage for hamburger events, saved tab preferences and the restore controls.

**Note:** As with previous versions, automated packaging tests do not guarantee compatibility with future YouTube UI changes or Google sign-in restrictions.


## [1.0.1] — 2026-11-03

Maintenance release of Tubeium for Windows x64.

- Reorganized desktop application source under `src/` and Windows build scripts under `scripts/`.
- Added authentic bundled Settings, Download Manager, and Sign-in Help UI captures to the README.
- Updated security and privacy documentation, release audit, and Windows build guidance.
- Hardened the manual unsigned release workflow to reject an existing version/tag and verify checksums before publication.
- Made a temporary-browser-profile cleanup regression test deterministic on Windows.

**Compatibility:** Keeps existing user settings and profile storage; this release primarily improves packaging, maintainability, and publishing safety. Google's acceptance of third-party sign-in is not guaranteed.

## [1.0.0] — 2026-11-02

First public unsigned Windows x64 release with Setup and Portable executables, SHA-256 checksums, local playlists and downloads, personalization, playback controls, and optional browser-based sign-in assistance.

[1.0.5]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.5
[1.0.4]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.4
[1.0.3]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.3
[1.0.2]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.2
[1.0.1]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.1
[1.0.0]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.0
