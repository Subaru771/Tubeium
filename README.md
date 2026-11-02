<div align="center">

# Tubeium

**A customizable YouTube desktop client for Windows.**

[![Latest release](https://img.shields.io/github/v/release/Subaru771/Tubeium?include_prereleases)](https://github.com/Subaru771/Tubeium/releases/latest)
[![Windows build](https://github.com/Subaru771/Tubeium/actions/workflows/build-windows.yml/badge.svg)](https://github.com/Subaru771/Tubeium/actions/workflows/build-windows.yml)

[**Download for Windows**](https://github.com/Subaru771/Tubeium/releases/latest) · [Privacy](PRIVACY.md) · [Security](SECURITY.md)

</div>

> [!NOTE]
> Tubeium is an independent, unofficial application. It is **not affiliated with, endorsed by, or sponsored by YouTube or Google**.

## Download

**Tubeium v1.0.0** is the first public Windows release.

| Download | Best for |
| --- | --- |
| [**Windows installer (.exe)**](https://github.com/Subaru771/Tubeium/releases/download/v1.0.0/Tubeium-1.0.0-Setup-x64.exe) | Normal installation with shortcuts |
| [**Portable Windows (.exe)**](https://github.com/Subaru771/Tubeium/releases/download/v1.0.0/Tubeium-1.0.0-Portable-x64.exe) | Running without the installer |
| [**SHA-256 checksums**](https://github.com/Subaru771/Tubeium/releases/download/v1.0.0/SHA256SUMS.txt) | Verifying downloaded files |

[View the latest release and release notes](https://github.com/Subaru771/Tubeium/releases/latest).

> [!WARNING]
> **Unsigned Windows application:** The current executables are not code-signed. Windows SmartScreen or antivirus software may warn about an unfamiliar publisher. Download only from this repository's official Releases page; verify the checksum if desired. Do not disable security software globally to run Tubeium.

## Features

- **YouTube desktop experience** built with Electron for Windows.
- **Customizable settings** and viewing profiles.
- **Local playlists and library** features.
- **Download queue and offline media playback** tools.
- **Audio presets** and other playback options.
- **Sign-in assistance** with browser-session and cookie-import workflows, subject to YouTube/Google restrictions.
- **Local backup and migration** utilities.

Some features rely on external services or site behavior and may change or stop working. Tubeium does not guarantee Google account sign-in, uninterrupted playback, or downloads from every video.

## Getting started

1. Download the installer or portable EXE above.
2. For the installer, run the downloaded setup and follow the prompts. For portable, launch the EXE directly.
3. Open Tubeium and configure your preferences.

Keep account cookies, session exports, and tokens private. **Never post them in GitHub issues or screenshots.**

## Build from source

Requirements: Windows, Node.js 24, and npm.

```powershell
git clone https://github.com/Subaru771/Tubeium.git
cd Tubeium
npm ci
npm run verify:release
npm run build:windows
```

The resulting Windows installer and portable build are written to `dist/`.

To run the app without packaging:

```powershell
npm start
```

Additional Windows helper scripts include `RUN_WITHOUT_BUILDING.cmd`, `BUILD_WINDOWS_EXE.cmd`, `FAST_BUILD_WINDOWS_EXE.cmd`, and `VERIFY_WINDOWS_BUILD.cmd`.

## Development and releases

The repository runs automated checks and Windows packaging through [GitHub Actions](https://github.com/Subaru771/Tubeium/actions). The current public build is **unsigned**; a separate signed-release workflow requires signing credentials and approval.

See [Reproducible builds](REPRODUCIBLE_BUILDS.md), [Windows acceptance tests](WINDOWS_ACCEPTANCE_TESTS.md), [Release checklist](RELEASE_CHECKLIST.md).

## Privacy, security, and license

- [Privacy policy](PRIVACY.md) — data handling and local storage.
- [Security policy](SECURITY.md) — reporting vulnerabilities.
- [License](LICENSE) — conditions for use, modification, and redistribution.
- [Third-party notices](THIRD_PARTY_NOTICES.md) — third-party licensing.

**Only download official builds from this repository.** If you encounter a bug, open a GitHub issue with reproduction steps and non-sensitive logs.
