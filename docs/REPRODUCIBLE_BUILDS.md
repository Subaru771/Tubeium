# Tubeium reproducible dependency builds

Tubeium v1.0.3 has a committed `package-lock.json`; there is no need to generate a new lockfile just to build the current source.

## Build on Windows

1. Install Node.js 24 and npm, and clone the repository.
2. From the repository root, run `npm ci --no-audit --no-fund`.
3. Run `npm run verify:release` and `npm audit --audit-level=high`.
4. Run `npm run build:windows`. The setup EXE and portable EXE appear in `dist/`.

For a double-click local build, run `scripts\BUILD_WINDOWS_EXE.cmd`. `scripts\FAST_BUILD_WINDOWS_EXE.cmd` builds the installer only, `scripts\RUN_WITHOUT_BUILDING.cmd` launches from source, and `scripts\VERIFY_WINDOWS_BUILD.cmd` verifies the resulting executables and writes `dist\SHA256SUMS.txt`.

**Only if deliberately updating dependencies:** Run `scripts\GENERATE_LOCKFILE.cmd` and commit the new lockfile. Do not commit `node_modules/`, cookies, browser profiles or local downloads.

## CI, signing, and limits

- CI uses pinned GitHub Actions, Node 24, `npm ci`, full tests, dependency audit, binary packaging checks, and SHA-256 generation.
- The Windows build workflow produces downloadable unsigned CI artifacts. For a **new** public unsigned release, dispatch `publish-unsigned-beta.yml` from `main` and supply a new `release_tag` matching `package.json`. It checks the remote tag does not already exist and refuses to overwrite an existing release.
- The *signed* release workflow requires `production-release` approval and valid signing credentials and verifies binaries before publishing.
- Neither dependency locking nor a reproducible build alone proves that the app works on a particular Windows machine, that Google accepts sign-in, or that live YouTube behaviors remain compatible.

See [WINDOWS_ACCEPTANCE_TESTS.md](WINDOWS_ACCEPTANCE_TESTS.md).
