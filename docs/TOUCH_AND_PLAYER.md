# Adaptive touch mode and clean player

- Tubeium is still a **Windows x64 desktop app**, not an Android/iOS app.
- Touch mode activates automatically if Windows/Chromium reports touch hardware (`maxTouchPoints`, `any-pointer: coarse` or `pointer: coarse`) or the user touches the screen with a finger/pen. It stays on when a mouse is connected; responsive compact mode changes with window width.
- Settings, Downloads, Local Library, Sign-in Help, offline playback and the native Tubeium launcher use touch-friendly tap targets and scrollable navigation.
- On a regular desktop YouTube watch page, **Download is the only Tubeium-added action below the player**. Watch Later remains available from video cards and the desktop in-player hover toolbar. Previous/Next, Play/Pause, Watch Later and Tools appear in a separate in-player transport when touch mode, fullscreen or mini-player is active.
- Download remains one-click; the chevron only opens formats. In fullscreen the Download button attaches to the fullscreen player and its menu opens below the button.
- The other player controls stay available through YouTube's native controls and physical media keys. Tubeium does not replace YouTube's playback engine or emulate mobile.google.com/mobile.youtube.com.
- Touch controls don't intercept YouTube's own native tap, seek, scrolling, or gesture handlers.
- Real Windows tablet/touchscreen, full-screen player, live YouTube navigation and wired/Bluetooth hardware buttons still require on-device testing. Automated source checks do not establish universal device compatibility.
