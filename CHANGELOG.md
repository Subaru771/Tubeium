### v4.5.10 ad-leak fix
- Ad filter now installs synchronously in the page (`contextBridge.executeInMainWorld`) so it beats YouTube's scripts; the async fallback remains.
- Strips ad metadata from `/player`, `/next`, `/get_watch`, `/browse`, `/search` and reel responses, from `JSON.parse` results, and from `ytInitialPlayerResponse` / `ytInitialData`.
- Removes ad items (in-feed, promoted, search, sidebar, brand banners) from feed data, plus extra cosmetic selectors.
- Network blocking extended to `youtube.com/pagead/*`, `/api/stats/ads`, 2mdn, googletagservices.

### v4.5.9 — Simplified extension step (UI-only update)
- Removed the redundant **Open Extensions** button from Sign-in Help.
- Step 2 now tells users how to open their browser's Extensions page manually, then use **Open Extensions Folder**.
- Kept the clean browser profile, sign-in transfer, player, settings and fast-build scripts unchanged.

## v4.5.8 update — Sign-in Help is its own tab, simpler steps, real default browser

- **Instructions open in a tab, not a window.** The separate sign-in guide pop-up is gone. Every sign-in entry point (Player menu, tray, the notice on the YouTube page, the buttons in the tab) now shows the **Sign-in Help** tab next to **YouTube**. Progress and the "restarting" message appear in that tab.
- **Tubeium opens on YouTube.** The Sign-in Help tab no longer opens by itself or covers YouTube. It is opt-in ("Also open this tab when Tubeium starts", off by default); old saved startup settings are ignored. Choosing YouTube never shows the instructions.
- **Opens your real default browser, never Edge by mistake.** Tubeium now reads the default browser from the Windows registry and starts that browser's own program (Brave, Chrome, Edge, Opera, Vivaldi, ...). Before, any default other than Brave/Chrome/Edge could end up in Edge. If the default is Firefox (which cannot run the helper extension), Chrome or Brave is used and the tab says so; Edge is only the last resort.
- **Clearer instructions.** Four numbered steps with plain wording, the browser's name filled in ("Open YouTube in Brave"), a live status line that confirms what each button did, a button that copies the extension folder location for "Load unpacked", and a "Still signed out?" tip.
- Page notice button now reads **Sign in using your browser**.
- New `default-browser.js` with unit tests; tests updated. Cookie transfer, player, Download Studio and the 201 settings are unchanged. Not yet run on real Windows.

# Tubeium v4.5.7 — Default browser & welcome-tab fixes

- **Open Browser** uses the operating system's default browser (Electron `shell.openExternal`) rather than forcing Chrome or Edge. This applies to both the startup tab and sign-in guide.
- **Go to YouTube** now uses an acknowledged action to reliably dismiss the welcome overlay, hide it immediately, detach it, and return focus to the original player.
- **Open Browser** dismisses the welcome overlay after the default browser opens successfully. If launching fails, the tab stays visible and shows an error.
- Browser Extensions still opens a compatible Chrome/Edge extensions page, because the temporary helper is a Chromium extension.
- No modifications to Google cookies, the session transfer logic, the native player, Download Studio, or any of the 201 settings.
- Source tests verify the dismissal lifecycle and default-browser launch. Real Windows execution remains to be verified.

## 4.5.6 — Sign-in instructions simplified

- A single startup guide shows the extension sign-in steps rather than separate Google and browser methods.
- Replaced Chrome/Edge-specific buttons with Open Browser and Open Browser Extensions; added This Extension and Copy Code Again.
- Shows the revised guide once on upgrade even when the prior welcome version was disabled.
- Removed duplicate sign-in menu entries only; player, Download Studio, 201 settings, and Google-session handling remain otherwise unchanged.
- Corrected Windows build and verification scripts to target 4.5.6 filenames.

## v4.5.5
- Added a dedicated automatic in-app Sign-in Help tab with Google/Chrome/Edge choices, YouTube switch, and optional startup opt-out.
- Kept existing authentication, downloads and all 201 settings.

## v4.5.4 — Sign-in options visible before Google login
- Player → Sign in to YouTube now opens a native choice showing the Chrome/Edge alternative before opening Google.
- Player menu always shows a visible helper label and a directly clickable alternative sign-in action.
- No changes to session import, restart, player, settings or downloads.

# Tubeium changelog

## 4.5.3 — Sign-in recovery notification

- Show a dismissible Tubeium banner when Google explicitly rejects the built-in browser or its login page fails to load.
- Provide a direct **Sign in using Chrome / Edge** button that opens the existing one-time transfer guide.
- After a browser-session import and restart, attempt to detect an obviously signed-out YouTube page. If detected, explain the browser-assisted fallback without claiming the imported session succeeded.
- Display a helpful notice when no cookies can be imported. Do not show a warning for ordinary redirects, voluntary cancellation or normal login pages.
- No modifications to the 201 settings, player, Download Studio, or window design outside the recovery notification.

## 4.5.2 — Reproducible-build and release security gates

- Commit-based pinning for GitHub Actions, Node 24 CI environment.
- Lockfile verification and `npm ci` for CI/repeatable local builds.
- Full production + development dependency vulnerability audit in release workflow.
- Upload only after signed installer, portable build, and update metadata validation.
- Added reproducibility instructions, Windows acceptance checklist and release gate tests.
- **No modifications to native player, sign-in, downloads or the 201 settings.**

# Changelog

## v4.5.10
- Early player-response ad metadata filter; no forced ad seek, playback-speed or mute tricks.
- Use native skip fallback to reduce black-screen interruptions.


## v4.5.0

- All previous settings and source-level sign-in helper retained.
- Added 10 validated settings (201 total) and local playlist library.
- Privacy-safe backup/restore; saved content excludes authentication material.
- Optional smart viewing profiles, experimental audio EQ, controller button mappings.
- Miniplayer opacity/corner and local library sorting.
- Ctrl+K command palette; settings sidebar update and backup actions.
- Strengthened main YouTube BrowserWindow options.
- Updated build dependencies to supported Electron 45.2.1, electron-builder 26.18.1 and electron-updater 6.8.12 (Windows runtime behavior unverified).
- Kept the separate installer/portable Windows build process from v4.3.

## v4.3.0

- Initial release-update hooks, source tests, offline playback, diagnostics, verified downloader bootstrap and gamepad controls.
