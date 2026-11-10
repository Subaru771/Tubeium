# Changelog

## Unreleased

- Add Previous and Play/Pause alongside Next, headphone previous-track handling, disabled-boundary feedback, and bounded app-memory video history that survives page reloads without persisting visits.
- Keep transport and tap-open tools accessible in YouTube fullscreen and mini-player modes, and reposition overlays when the visual viewport changes.
- Add an offline playback queue with Previous/Next, headphone play/pause/seek/navigation, optional automatic advancement, queue position, missing-file skipping, and fullscreen controls. Queue replacement rejects stale renderer commands.

- Add a visible **Next** video button and support headphone/OS next-track commands through Media Session. Normal videos use YouTube's Next control; Shorts use the next-Short control. YouTube still owns Media Session play/pause and seek behavior; Tubeium handles both track directions.
- Improve Windows touchscreen and pen use with 44px tap targets, tap-open player tools, tablet-width Settings/Downloads/Library windows, and a scrollable native launcher menu.
- Physical Windows touch/headphone acceptance checks remain required; automated checks use simulated input.

## [1.0.9] — Unreleased (Tubeium 1.09 source)

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
