# Changelog

## [1.0.16] — 2026-11-11 (Tubeium 1.16)

- Rebuild touch gesture recognition to follow YouTube's familiar double-tap seeking and deliberate swipe up/down fullscreen controls; prevent unexpected horizontal video navigation.
- On Shorts, let native YouTube swipe navigation run before a guarded Tubeium fallback, reducing duplicate next/previous skips.
- Improve video-only pinch zoom to 1×–2.5× with focal-point positioning and complete reset when leaving the video.
- Stop permanently overlaying the five-button Tubeium transport on normal touchscreen videos; retain it in Mini Player. Fullscreen remains native-only.
- Automatically switch between touch-friendly density after finger/pen input and desktop density after a mouse click on hybrid Windows devices.
- Add Player → Touch gestures → Off / Low / Normal / High, including an explicit native-only option.
- Limit touch-action suppression to the video image when enhanced gestures are enabled, leaving YouTube's buttons, timeline and other controls untouched.
- Expand regression tests for swipe direction, double-tap safety, pinch reset, Shorts fallback, touch-vs-mouse transitions and fullscreen behavior. Physical Windows touch testing remains outstanding.


## [1.0.15] — 2026-11-10 (Tubeium 1.15)

- Hide every Tubeium-added watch-player button in YouTube fullscreen, including the Download action, floating Previous/Play/Next/Watch Later transport, hover Tools and quick navigation.
- Do not inject Tubeium buttons into YouTube's fullscreen element; keep YouTube's original playback controls accessible on desktop and touchscreens.
- Restore Download and touch/desktop controls automatically on leaving fullscreen. Normal watch pages, Shorts and mini-player retain their features.
- Add fullscreen transition and re-render regression checks. Physical Windows fullscreen behavior still requires acceptance testing.

## [1.0.14] — 2026-11-10 (Tubeium 1.14)

- Add animated gesture confirmation and persistent Low/Normal/High swipe sensitivity for touchscreens, while respecting existing mouse, pen and keyboard behavior.
- Add an on-demand memory baseline/compare/export tool using Electron process working-set snapshots; no unmeasured RAM reduction is claimed.
- Add a restricted Tubeium protocol handler, safe YouTube clipboard opening and a minimal Chrome/Edge/Brave context-menu extension (manual browser installation and explicit Windows registration).
- Add main-process 15/30/60-minute sleep timers or stop after current video, with a short-lived guard against immediate YouTube autoplay.
- Add a compact transcript search and chapter navigator using only YouTube-rendered page information, with click-to-seek and limited fallback when transcripts or chapters are unavailable.
- Add explicit official GitHub installer downloads verified against the release's SHA-256 checksum file; never automatically run unsigned binaries.
- Retain the existing certificate/approval-gated signed release workflow. No signatures can be issued without signing credentials.
- Source test suite extended; physical Windows touch, live YouTube, link-extension and memory acceptance tests remain outstanding.

## [1.0.13] — 2026-11-10 (Tubeium 1.13)

- Add touch-only double-tap left/right video seek (10 seconds), swipe left/right for Next/Previous normal videos, swipe up/down for Shorts, and 1–3× two-finger video-only pinch zoom.
- Reflow the on-player controls when Windows changes display orientation; do not override Windows rotation lock or interfere with mouse/keyboard/pen input.
- Re-enable Chromium background throttling, reclaim the unused Sign-in Help renderer without terminating browser pairing, and avoid repetitive DOM/profile polling while hidden.
- Preserve the Tubeium video actions, download manager, offline queue, security protections and all 201 existing preferences.
- Add simulated gesture regressions. Source tests pass; no measured physical-Windows RAM savings or gesture acceptance results are claimed.

## [1.0.12] — 2026-11-10 (Tubeium 1.12)

- Automatically detect touchscreen/pen hardware and switch Tubeium's local windows to larger, responsive controls; hybrid PCs retain touch mode when using a mouse.
- Keep only Download in YouTube's watch action row, while placing Previous/Play/Next, Watch Later and Tools inside the player for touch, fullscreen and mini-player. Watch Later remains in the desktop hover toolbox and on video cards.
- Fix fullscreen Download disappearing, attach it to the fullscreen player and position its format menu below the button.
- Prevent stale/duplicated in-player transport after YouTube SPA action-row replacement.
- Add touch-aware scrollable navigation in Settings, Downloads, Library, offline playback, Sign-in Help and native launcher.
- Add automated regression tests for adaptive detection, tablet layouts, fullscreen fallback and the Download-only metadata action row. Physical Windows touch and live YouTube behavior require acceptance testing.

## [1.0.11] — 2026-11-10 (Tubeium 1.11)

- Add Previous and Play/Pause alongside Next, headphone previous-track handling, disabled-boundary feedback, and bounded app-memory video history that survives page reloads without persisting visits.
- Keep transport and tap-open tools accessible in YouTube fullscreen and mini-player modes, and reposition overlays when the visual viewport changes.
- Add an offline playback queue with Previous/Next, headphone play/pause/seek/navigation, optional automatic advancement, queue position, missing-file skipping, and fullscreen controls. Queue replacement rejects stale renderer commands.

- Add a visible **Next** video button and support headphone/OS next-track commands through Media Session. Normal videos use YouTube's Next control; Shorts use the next-Short control. YouTube still owns Media Session play/pause and seek behavior; Tubeium handles both track directions.
- Improve Windows touchscreen and pen use with 44px tap targets, tap-open player tools, tablet-width Settings/Downloads/Library windows, and a scrollable native launcher menu.
- Physical Windows touch/headphone acceptance checks remain required; automated checks use simulated input.

## [1.0.9] — 2026-11-09 (Tubeium 1.09)

- **Home and player quick actions:** one-click Download and **◷ Watch Later** directly on supported video thumbnails (Home, search and recommendations) and in the video action area. Thumbnail actions are hover/focus accessible and do not navigate the page. Duplicate quick downloads are suppressed per card.
- **Local Watch Later:** add to Tubeium's persistent offline-capable Library list without a Google login. A new Watch Later library tab and an entry in the single Tubeium menu make saved videos easy to find. Original bookmarks, local playback history, and existing saved data remain intact. Clearly labeled local-only; it does not silently modify YouTube's account Watch Later.

- **Download Manager rebuilt:** eliminate the oversized hero and decorative Download Studio layout. Add a compact link field, scope/format selectors, queue filters, and stable title-first cards with requested/selected quality, progress, speed/ETA, and Pause/Resume/Retry/Play/Folder actions.
- **Download title and quality from the start:** every new task snapshots the selected quality and format immediately. Direct video clicks supply the current YouTube title; pasted public URLs receive a fast anonymous title/creator lookup. yt-dlp prints verified title and selected resolution before transfer, updating the queue without losing focus or opening the manager automatically. Existing queued jobs and download files are preserved.

- **Decluttered Settings:** replace the Studio dashboard, presets, favorites cards and 15-category navigation with six focused everyday categories, compact two-column groups, one search field and a small overflow menu for maintenance. Advanced is always the last sidebar tab and organizes remaining options into seven topic filters, with no repeated everyday settings. All 201 underlying settings and existing saved values remain supported.
- **Reliable downloads on all video layouts:** Download queues one video; the chevron opens options without opening Manager. The watch action follows visible metadata on standard videos; an always-visible fallback appears near the active player on Shorts, live videos, or layouts without a usable actions row. Recreate the button if YouTube detaches it during SPA navigation.
- **Unified Tubeium launcher:** replace the duplicate left floating Settings button and the two bottom-right pills with one compact native menu for Settings, Download Manager and optional Sign-in Help. The Help tab remains available on request but no extra sign-in prompt overlays the page. Downloads sit in the current video's action row, with an in-player fallback. Retired the legacy bottom-left download placement.
- **Contextual controls:** the player toolbar now follows the actual player and appears on hover or keyboard focus rather than covering suggested videos. The Download Manager remains available in Settings, the single Tubeium menu, and Download's options menu.
- **Preserved functionality:** retain all 201 saved settings, existing favorites data (without a default Favorites dashboard), sign-in assistance, local library, download queue, diagnostics, 4K resolution badge and the sidebar width resizer. The redundant lower actions resizer is retired from the new interface.
- **Regression coverage:** exercise Download/More/Manager clicks and independent visibility settings; test missing/hidden action rows, Shorts/live fallbacks, SPA reattachment and the six everyday categories, permanent Advanced tab, seven organized topics, and access to all 201 underlying options.

**Verification:** GitHub Actions runners are working again. The full source regression suite and integrity checks passed for the new consolidated UI. A fresh Windows installer build and live YouTube/Google sign-in tests are still required for this revision.

## [1.0.8] — 2026-11-08 (Tubeium 1.08)

- **Control Room redesign:** Rebuilt the Settings layout and visual system with a modern dashboard, responsive light/dark themes, category navigation, preset cards, global search, revised control rows, and a redesigned quick actions panel.
- **One-click video download:** The main Download video button now queues the video immediately. An adjacent chevron opens choices for audio, thumbnails, and playlists without extra clicks.
- **Safe folder renaming:** Replaces legacy uYouPlus download subfolder names with Tubeium. When the old directory exists and the new one does not, rename the folder without overwriting files; remap download history paths after successful migration. User-selected unrelated folders remain unchanged.
- **Open downloads folder:** A dedicated Settings sidebar shortcut opens the destination directly.
- **Preserve behavior:** Existing 201 settings, Favorites, playback diagnostics, the two independent sidebar resizers, update checks, and Electron sandbox remain intact. New regression tests cover migration and the redesigned interface.

**Limits:** If both legacy and Tubeium folders exist, Tubeium does not automatically merge or delete either one. Live YouTube playback and sign-in still require testing on Windows; the app remains unsigned.


## [1.0.7] — 2026-11-08 (Tubeium 1.07)

- **Settings Favorites:** pin up to 24 existing preferences via an accessible star, access them from the new Favorites category or Overview, and preserve them in a separate validated local user-data file without duplicating settings.
- **Playback Diagnostics:** new Stats button in the floating player toolbar and Player menu entry. See the decoded resolution, estimated rendered FPS, dropped-frame counts and percentage, buffered seconds, and playback state. Copy a report without account credentials. Read-only diagnostics cannot guarantee why a source lacks 4K.
- Include the earlier v1.0.7 development improvements to both independent Settings sidebar dividers, smaller quick-action icons, official GitHub release checks for unsigned builds, and a verified stream-resolution badge up to 4K.
- Preserve the original 201 validated preferences, the YouTube preload sandbox, and the existing Google sign-in / local library data.
- Add automated regression checks for favorites, diagnostics, resizing, update checks, and playback-quality labeling.

**Limitations:** YouTube ad skipping remains best-effort. Google sign-in and any live video playback regressions require manual verification on Windows; automated packaging does not establish those behaviors.



- Show **current playback resolution up to 4K** on the existing floating Quality toolbar button. The indicator reads the decoded video stream (not the preferred setting), updates if adaptive streaming changes resolution, and opens YouTube’s native Quality menu.
- Clarify that 2160p / 4K is a best-effort playback preference and appears only when the video and playback environment support it.


- Make **Check for updates** work with unsigned GitHub releases: compare installed version to the latest official release and offer an external download link; retain the signed updater when configured.
- Enable the same GitHub release check on launch when requested in Settings; never silently download unsigned installers.
- Reduce the icon size and vertical bulk of the six quick-action buttons in the lower Settings sidebar.

- Add a draggable **horizontal splitter** between Settings categories and the lower left quick-actions section (Live customization, player/download/library/backup buttons). The previous drag handle adjusted only sidebar width.
- Remember quick-actions height separately from sidebar width. Keep both lists independently scrollable and accessible by keyboard, with double-click to reset.


- Fix a real-world Windows regression: the resize grip could move independently of the navigation panel. The grip now belongs to the flex layout and resizes the *actual* sidebar.
- Prevent selecting text during a drag, track pointer movement across the whole Settings window, and safely cancel incomplete drags.

- Make the Settings sidebar width adjustable by dragging its right edge (205–480px, constrained to keep the content readable).
- Restore the chosen width when Settings reopens, without changing the 201 existing app preferences.
- Support keyboard resizing with Left/Right arrows, Shift for larger steps, Home/End, and double-click to reset to the original 249px.
- Keep a subtle, visible resize handle and respect narrow-window layouts, light/dark themes, and reduced-motion preferences.
- Add automated tests for pointer dragging, persistence, keyboard accessibility, reset, and window resizing.

All enhancements in this section are included in **Tubeium 1.07** (`v1.0.7`).


## [1.0.6] — 2026-11-03 (Tubeium 1.06)

- **Critical repair:** remove an unsupported local-module import from Electron 45's sandboxed YouTube preload. That import could abort the entire preload, disabling the floating Settings control, player-response ad filtering, ad-skip fallback, and other YouTube enhancements.
- Preserve Electron's sandbox and add a regression test executing the preload with Electron-only module access.
- Modernize Tubeium's bottom navigation with a compact brand mark, improved contrast, clearer active tabs and a highlighted Settings button.
- Keep **Settings and Show tabs accessible together**, even when the bottom navigation is collapsed; update native navigation tests.

- Replace the small floating gear with a labeled **⚙ Settings** shortcut that is keyboard accessible.
- Move the shortcut above Tubeium's native bottom tab strip, which previously could obscure it.
- Add **⚙ Settings** to the bottom tab navigation, including when Sign-in Help is open.
- Retain Ctrl+, access, fullscreen behavior, floating-button preference, tab collapse, and existing sign-in flows.
- Validate the new tab-strip Settings IPC against the trusted local view and add regression coverage.

This update is distributed as **Tubeium 1.06** (technical version **v1.0.6**); the earlier v1.0.2 release tag remains unchanged. Ad skipping is still best-effort, and live sign-in behavior depends on Google.


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

[1.0.6]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.6
[1.0.5]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.5
[1.0.4]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.4
[1.0.3]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.3
[1.0.2]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.2
[1.0.1]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.1
[1.0.0]: https://github.com/Subaru771/Tubeium/releases/tag/v1.0.0
