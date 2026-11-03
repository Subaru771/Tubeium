# Tubeium v1.0.1 — release checklist

This checklist covers the current open-source Windows x64 release. Automated checks do **not** replace runtime tests on a clean Windows machine.

## Automated release gates

- [x] MIT license and privacy/security notices committed.
- [x] Locked dependencies installed with `npm ci` on Windows CI.
- [x] Unit/regression tests and release audit pass for the v1.0 source layout.
- [x] CI dependency audit covers production and development dependencies.
- [x] Installer and portable executable packaging checked in Windows CI.
- [x] SHA-256 checksums generated and packaged with unsigned build artifacts.
- [x] GitHub Release v1.0.0 previously published as **unsigned** (not represented as a signed release).

## Publishing the next unsigned release safely

1. Bump `package.json` and the committed dependency lock to a **new** semantic version, then merge its CI-passing changes into `main`.
2. In GitHub Actions, manually run **Publish unsigned Windows release** on the **main** branch and enter `v<package-version>`.
3. The workflow refuses a tag/version mismatch and any tag already present on GitHub. Only after tests, dependency audits, both builds and checksums pass can it publish the new tag.
4. The published v1.0.0 release remains untouched. For v1.0.1, use the matching manually dispatched new-release workflow after CI on main is green.

## Publisher verification before any next public release

- [ ] Run the Windows acceptance procedure in [WINDOWS_ACCEPTANCE_TESTS.md](WINDOWS_ACCEPTANCE_TESTS.md).
- [ ] Verify Google sign-in with your own consenting test account; do not upload cookies.
- [ ] Test actual YouTube playback, ads, SponsorBlock, downloads and offline playback.
- [ ] Review third-party rights, YouTube terms, privacy wording and dependencies.
- [ ] If publishing a *signed* release, configure certificate secrets and production environment approval.
- [ ] Check source tag/version and publish matching binaries with fresh checksums.

Build locally with `scripts\BUILD_WINDOWS_EXE.cmd` and verify using `scripts\VERIFY_WINDOWS_BUILD.cmd` from the repository root directory (each script sets its own working directory).
