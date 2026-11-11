# Adaptive touch mode and clean player

- Tubeium is still a **Windows x64 desktop app**, not an Android/iOS app.
- Touch mode activates automatically if Windows/Chromium reports touch hardware (`maxTouchPoints`, `any-pointer: coarse` or `pointer: coarse`) or the user touches the screen with a finger/pen. Switching to mouse input restores the desktop density on hybrid PCs; touching or using the pen returns to touch layout. Responsive compact mode changes with window width.
- Settings, Downloads, Local Library, Sign-in Help, offline playback and the native Tubeium launcher use touch-friendly tap targets and scrollable navigation.
- On a regular desktop YouTube watch page, **Download is the only Tubeium-added action below the player**. Watch Later remains available from video cards and the desktop in-player hover toolbar. Tubeium relies on YouTube's native player controls in ordinary touch mode; the additional Previous/Next/Play/Pause/Watch Later/Tools transport is reserved for the mini-player. Fullscreen deliberately hides all Tubeium-added buttons.
- Download remains one-click; the chevron only opens formats. In fullscreen, the Download button and Tubeium's added control overlays are hidden for a clean native YouTube player; they return when fullscreen ends.
- The other player controls stay available through YouTube's native controls and physical media keys. Tubeium does not replace YouTube's playback engine or emulate mobile.google.com/mobile.youtube.com.
- Touch controls don't intercept YouTube's own native tap, seek, scrolling, or gesture handlers.
- Real Windows tablet/touchscreen, full-screen player, live YouTube navigation and wired/Bluetooth hardware buttons still require on-device testing. Automated source checks do not establish universal device compatibility.

## Phone gestures
- **Double-tap** left/right side of a video: seek back/forward 10 seconds (unless *Disable YouTube double-tap seek* is selected).
- **Horizontal swipe** across a normal video: left = Next, right = Previous, via existing guarded navigation.
- **Vertical swipe** on Shorts: up = Next, down = Previous, using YouTube's available Shorts controls.
- **Pinch with two fingers**: zoom just the video from 1× to 3×; pinch inward to reset. Reset on video navigation.
- **Rotate your Windows tablet**: Tubeium reflows its controls when Windows changes orientation. The OS owns hardware rotation and rotation lock.
Gestures do not intercept YouTube player buttons, timeline, menu controls, mouse drags or keyboard. Device/website acceptance testing is required.

## Memory changes
- Allow Chromium to throttle hidden/minimized YouTube renderers while keeping audio playback and native download jobs independent of the UI timer rate.
- Reclaim the Sign-in Help WebContentsView on returning to YouTube; keep the browser pairing service alive until its own completion.
- Skip repeated video-card DOM scans, profile checks and UI restoration while hidden, restoring when the window becomes visible.
- Check **Tools > System Diagnostics** for Electron process count and memory working-set size. No measured RAM reduction is claimed before comparable Windows testing.
