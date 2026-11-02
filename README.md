<div align="center">

# Tubeium

**A modern, customizable YouTube desktop client for Windows.**

[Changelog](CHANGELOG.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

</div>

> [!IMPORTANT]
> **Release status:** Source publication and Windows build verification are in progress. **No verified installer is available yet.**

> [!NOTE]
> Tubeium is an independent project. It is not affiliated with, endorsed by or sponsored by Google or YouTube.

## Download

There is no verified public Windows installer yet.

> [!WARNING]
> Do not download executables claiming to be official Tubeium builds from other sources.

## About

Tubeium is an Electron-based desktop project for Windows. The first public source upload is being prepared from the 4.5.10 "AdFix" development snapshot, so the repository reflects work in progress.

## Development

The app is built with Electron and Node.js. Helper scripts in the repository root cover common tasks:

| Script | Purpose |
| --- | --- |
| `RUN_WITHOUT_BUILDING.cmd` | Run the app without building an installer |
| `BUILD_WINDOWS_EXE.cmd` | Build the Windows executable |
| `FAST_BUILD_WINDOWS_EXE.cmd` | Faster build variant |
| `VERIFY_WINDOWS_BUILD.cmd` | Verify a Windows build |
| `GENERATE_LOCKFILE.cmd` | Regenerate `package-lock.json` |

Related project documents:

- [Reproducible builds](REPRODUCIBLE_BUILDS.md)
- [Windows acceptance tests](WINDOWS_ACCEPTANCE_TESTS.md)
- [Release checklist](RELEASE_CHECKLIST.md) and [release gate status](RELEASE_GATE_STATUS.md)
- [Public release notes](PUBLIC_RELEASE_NOTES.md)

## Security and privacy

Please read [SECURITY.md](SECURITY.md) before reporting a potential vulnerability, and [PRIVACY.md](PRIVACY.md) to see how the app handles your data. Never share your account cookies, tokens or session data in issues, screenshots or messages.

## License

The license terms are in the [LICENSE](LICENSE) file. Read them before redistributing or modifying the code. Third-party components keep their own licenses, listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
