# Changelog

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

[1.0.1]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.1
[1.0.0]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.0
