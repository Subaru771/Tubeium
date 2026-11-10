# Tubeium v1.0.14 additions

## Open in Tubeium
Use **Player > Register Open in Tubeium links** in the installed Windows app.
In Chrome/Edge/Brave open Extensions > Developer mode > Load unpacked and
select `src/open-in-tubeium-extension` from the source checkout. Right-click a
YouTube link or webpage and select **Open in Tubeium**, or use the extension
toolbar icon. Your browser may ask permission to open the Tubeium app.
Registration is opt-in; portable builds are not automatically registered.
Only explicit HTTPS YouTube URLs are accepted; arbitrary external links,
local files, JavaScript URLs, or credentials are rejected. Alternatively use
**Player > Open YouTube link from clipboard**.

## Sleep timer
**Player > Sleep timer**: 15, 30, 60 minutes, or stop at end of current
video. The timer is managed by Tubeium, not by the YouTube tab's background
timers. End-of-video detection is best effort if YouTube navigates early.

## Transcript search and chapter navigation
Open **Ctrl+K > Search transcript** or **Chapters**. Tubeium reads the
current YouTube page's *visible, rendered* transcript and chapter entries.
Search is local; there is no external transcription server and no account
cookies are inspected. Press **Show transcript on YouTube** or open the
native transcript manually if YouTube has not rendered one. Videos without
captions/chapters and changing YouTube layouts may provide no matches.

## Gesture feedback
A small in-player hint appears for a successful seek, swipe or pinch;
gesture sensitivity is Low, Normal or High, selectable from the Player menu.
These are applied only to touchscreen input.

## Memory monitor
Use **Player > Memory monitor** to capture a baseline, play a video or
minimize Tubeium, then compare. Metrics are app.getAppMetrics working-set
snapshots from Electron processes, not a claim of memory savings.
Same video, quality and process state are required for meaningful comparisons.

## Updates and signing
The signed workflow requires a real code-signing certificate and explicit
approval; no fake signatures. Unsigned builds never auto-execute. The
updater can download the **official GitHub x64 installer**, validate it
against the exact release's SHA256SUMS.txt, then show it in Downloads
for user-controlled installation. Failed or mismatching downloads are
deleted. The signed updater remains gated behind official signed metadata
and certificates. Portable builds use the installer-download path only
when explicitly requested.

## Limitations
All features require Windows acceptance testing. Signing will remain
unavailable until a certificate and repo secrets are configured.
