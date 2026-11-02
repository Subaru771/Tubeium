<div align="center">

# Tubeium

### Your YouTube experience. Your desktop. Your way.

A customizable, unofficial YouTube client built for **Windows**.

[![Release](https://img.shields.io/github/v/release/Subaru771/Tubeium?label=latest%20release)](https://github.com/Subaru771/Tubeium/releases/latest)
[![Windows CI](https://github.com/Subaru771/Tubeium/actions/workflows/build-windows.yml/badge.svg)](https://github.com/Subaru771/Tubeium/actions/workflows/build-windows.yml)
[![License](https://img.shields.io/github/license/Subaru771/Tubeium)](LICENSE)

**[Download Tubeium](https://github.com/Subaru771/Tubeium/releases/latest)** · [Features](#what-you-can-do) · [Build from source](#build-from-source) · [Report an issue](https://github.com/Subaru771/Tubeium/issues)

</div>

---

## A desktop-first way to watch

Tubeium brings YouTube into a dedicated Windows app, with a customizable interface and tools for organizing your viewing experience. Keep playlists and viewing profiles locally, manage downloads, and tailor playback without juggling browser tabs.

> [!IMPORTANT]
> Tubeium is an **independent, unofficial** project and is not affiliated with, endorsed by, or sponsored by YouTube or Google. Features that depend on YouTube or Google may change without notice.

## Download

**Latest stable release: v1.0.0** · Windows x64

| Edition | Download | Choose this if… |
| --- | --- | --- |
| **Installer** | [Tubeium-1.0.0-Setup-x64.exe](https://github.com/Subaru771/Tubeium/releases/download/v1.0.0/Tubeium-1.0.0-Setup-x64.exe) | You want a standard Windows installation |
| **Portable** | [Tubeium-1.0.0-Portable-x64.exe](https://github.com/Subaru771/Tubeium/releases/download/v1.0.0/Tubeium-1.0.0-Portable-x64.exe) | You prefer to launch an EXE without installing |
| **Checksums** | [SHA256SUMS.txt](https://github.com/Subaru771/Tubeium/releases/download/v1.0.0/SHA256SUMS.txt) | You want to verify your download |

[**See the full release**](https://github.com/Subaru771/Tubeium/releases/tag/v1.0.0)

> [!WARNING]
> **Unsigned app:** Tubeium v1.0.0 is not code-signed. Windows SmartScreen may warn about an unknown publisher. Get the EXE only from the official GitHub Releases page, and verify its SHA-256 checksum if desired. Do not disable Windows security protections globally.

## What you can do

| Experience | Capabilities |
| --- | --- |
| **Make it yours** | Customizable settings, viewing profiles, and audio presets |
| **Stay organized** | Local library, playlists, bookmarks, and playback progress tools |
| **Manage media** | Download queue and offline media playback |
| **Move between setups** | Local backups and migration tools |
| **Use a dedicated desktop app** | Native Windows window and navigation controls |
| **Get sign-in help** | Browser-based sign-in assistance and session-import options |

**A note on sign-in and downloads:** Google may restrict embedded or third-party sign-in methods, and YouTube changes can affect playback or downloading. These features are best-effort, not guaranteed.

## Get started

1. Choose the **Installer** or **Portable** download above.
2. Run the downloaded EXE.
3. Open Tubeium, explore the settings, and personalize your experience.

For sign-in help, use the guidance provided inside Tubeium. Never share account cookies, session files, or tokens in an issue, screenshot, or public discussion.

## Build from source

**Requirements:** Windows, Node.js 24, npm, and Git.

```powershell
git clone https://github.com/Subaru771/Tubeium.git
cd Tubeium
npm ci
npm run verify:release
npm run build:windows
```

The packaged installer and portable EXE are generated in `dist/`.

To run Tubeium directly from source:

```powershell
npm start
```

Windows helper scripts are also included for local building and verification.

## Contributing and support

Found a bug or have an idea? [Open an issue](https://github.com/Subaru771/Tubeium/issues) with the steps to reproduce it, your Windows version, and any relevant **non-sensitive** logs. Please check existing issues first.

Automated tests and Windows builds run through [GitHub Actions](https://github.com/Subaru771/Tubeium/actions). See the [release checklist](RELEASE_CHECKLIST.md) and [reproducible-build notes](REPRODUCIBLE_BUILDS.md) for technical details.

## Project information

[Privacy](PRIVACY.md) · [Security](SECURITY.md) · [License](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)

<div align="center">

**Built for people who want more control over their desktop viewing experience.**

[Download](https://github.com/Subaru771/Tubeium/releases/latest) · [Source code](https://github.com/Subaru771/Tubeium) · [Issues](https://github.com/Subaru771/Tubeium/issues)

</div>
