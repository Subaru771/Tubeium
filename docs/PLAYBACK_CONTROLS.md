# Playback controls

The Windows app provides Previous, Play/Pause and Next beside the video actions.
Touchscreens and pens also have a tap-open Tools button. Fullscreen and the
mini-player keep compact transport controls available.

## YouTube

- Previous/Next use YouTube's native controls in playlists and Shorts. Disabled or
  absent controls do not redirect into unrelated history. Navigation is blocked
  during ads; Play/Pause remains available.
- Normal videos can fall back to videos visited in the current app session when
  native Previous is unavailable. Next can return forward through those visits.
  This history is limited to 100 videos, stays in app memory across page reloads,
  and disappears when the app exits. It does not read browser or Google history.
- Headphone and Windows media Previous/Next follow the same behavior as the
  buttons. YouTube retains its own play/pause and seek handlers. Tubeium does not
  register global shortcuts that take media keys away from other apps.

## Offline files

Opening a completed download creates a snapshot queue in the Download Manager's
completed-item order and each item's file order. Duplicate paths are included
once. Opening another download replaces the queue.

Previous/Next, Play/Pause, ten-second seek buttons, and fullscreen work for both
audio and video. Queue position and disabled boundary buttons show where you are.
“Play next automatically” controls advancement when a file ends; the queue stops
at the end and does not wrap. Deleted files are skipped when navigating. An
unsupported or missing current file displays an error; choose another file or
use Open with Windows player.

Headphone/Windows media controls support Previous, Next, Play, Pause, Stop and
seeking. Metadata, playback state and playback position are supplied to Media
Session. Space/K toggles playback, Left/Right seeks, Shift+P/N changes file, and F
switches fullscreen when focus is outside an interactive control.

## Validation

Source regressions and touch-emulated Chromium checks cover these software paths.
Headset gesture mappings, Bluetooth reconnects, lock-screen/minimized behavior,
other-app media ownership and real touchscreen/keyboard interaction require the
physical Windows procedure in [WINDOWS_ACCEPTANCE_TESTS.md](WINDOWS_ACCEPTANCE_TESTS.md).
No claim of universal headset compatibility follows from simulated media actions.
