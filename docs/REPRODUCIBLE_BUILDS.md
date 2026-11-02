# Tubeium reproducible dependency builds (v4.5.2)

This source archive deliberately **does not pretend to include a resolved dependency lockfile**. The environment that produced the ZIP could not reach the npm registry to generate or audit one. A stub lockfile would give false security.

## One-time first step (on Windows with internet)
1. Run `GENERATE_LOCKFILE.cmd`. It creates `package-lock.json` using npm and verifies the dependency graph.
2. Commit the generated `package-lock.json` alongside `package.json` in your Tubeium GitHub repository. Do not commit `node_modules`, downloads, browser profiles or any cookies.
3. Run `BUILD_WINDOWS_EXE.cmd`. The script will auto-generate the lockfile if missing for personal builds, and subsequently install exact versions with `npm ci`.
4. Review output of `npm run audit:dependencies` (production **and** dev/build dependencies); fix all relevant high/critical advisories before public stable release. Set `TUBEIUM_REQUIRE_CLEAN_AUDIT=1` before the Windows build to require the audit gate locally.

Both GitHub workflows **require** a committed, complete `package-lock.json` and use `npm ci`. The tagged release workflow will refuse to publish until this requirement passes, all source tests pass, the audit is clean, the code signing certificate is valid and the updater metadata is generated. No artifacts are uploaded as a public Release before verification.

## Workflow hardening
- Pinned GitHub Actions checkout/setup-node/upload-artifact to reviewed 40-character commits.
- Uses Node 24 for workflows, with cache disabled on the privileged release job.
- Beta artifacts are explicitly labeled unsigned and cannot be mistaken for signed releases.
- Public releases use the `production-release` environment approval gate (configure required reviewers in GitHub), `TUBEIUM_RELEASE_APPROVED=yes`, and certificate secrets.
- Release job builds locally, validates signatures and hashes, then publishes via GitHub CLI.

## What still requires a real Windows computer
Full install/uninstall, Electron 45 runtime behavior, Google sign-in and persistence, live playback, actual yt-dlp/FFmpeg downloads, controller support and updater cross-version verification.

See `WINDOWS_ACCEPTANCE_TESTS.md` for the manual acceptance procedure.
