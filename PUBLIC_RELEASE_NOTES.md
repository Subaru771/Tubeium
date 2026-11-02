# Tubeium public release preparation

This repository is prepared from Tubeium 4.5.10 AdFix source. No public binary release has been verified yet.

## Before publishing binaries
- Generate and commit package-lock.json using `npm install --package-lock-only`.
- Run `npm ci`, `npm test`, and `npm run audit:release`.
- Build and test installer and portable EXE on Windows.
- Verify playback, sign-in, downloads and update behavior.
- The signed release workflow requires signing credentials and release approval.

The project is not affiliated with YouTube or Google.
