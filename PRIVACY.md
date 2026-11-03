# Tubeium privacy information (technical summary — updated 2026-11-03)

Tubeium is an independent, unofficial Windows application that loads YouTube.
It is not affiliated with, sponsored by, or endorsed by Google or YouTube.

## Local data stored by Tubeium
Tubeium stores settings, window preferences, playback preferences, a download
queue, local bookmarks/watch progress and playlists in the application's local
user-data folder. Electron/Chromium stores web data, including cookies and cached
content, in its session storage. An optional legacy-session migration may use
an earlier YouPlus PC session location. Downloaded media are saved in folders
selected by the user.

Tubeium's settings backup exports settings, library information and local
playlists, but deliberately excludes browser cookies, passwords and session
tokens. A diagnostics export is designed to exclude cookies, tokens and video
history; review it before sharing.

## Third-party services
When watching YouTube or signing into Google, your activity and account data
are processed by Google/YouTube under their own policies. Tubeium does not
prevent Google from associating activity with an authenticated account.
Depending on enabled features, Tubeium can contact other services including
SponsorBlock, Return YouTube Dislike, DeArrow and GitHub release endpoints;
requests may reveal your IP address, video identifiers or software version to
those services. Tubeium uses yt-dlp/FFmpeg for media-related features, which
may access the media providers you request. These providers have their own
privacy practices.

## Sign-in and sensitive data
The optional one-time browser sign-in helper can read authentication cookies
from Chrome/Edge with explicit browser permission and send them to a temporary
Tubeium listener bound to 127.0.0.1. These cookies can give access to an account
and should be treated like passwords. Google-cookie access is **off by default**
and may be enabled explicitly if necessary. Tubeium does not upload these cookies
to a Tubeium-operated account server. The transfer bridge uses a time-limited,
one-use pairing credential; the browser helper should be removed afterward.
Google may reject a transferred session. If the user imports a personal `cookies.txt` export, Tubeium offers to delete that selected file **only when the user chooses the unchecked option**.

## Permissions and deletion
Camera/microphone, location and notifications are denied by default except
when users enable the relevant setting. The site may still transmit ordinary
network requests. Tubeium allows users to clear local cache and cookies in
Settings. Clearing cookies signs out the user; it does not delete Google
account history stored on Google's servers. Local bookmarks/playlists and
downloaded files must be removed separately. Uninstalling the app may leave
user-data folders unless the user removes them.

## Telemetry and sharing
The supplied application code does not intentionally implement a Tubeium-owned
analytics or advertising backend. This does **not** mean the embedded YouTube
site or optional third-party integrations are tracking-free. Do not publish
claims that Tubeium provides total anonymity, a zero-data experience or
universal ad blocking. Best-effort ad skipping is on by default for new profiles, can be disabled at any time, respects a saved OFF preference, and may conflict with YouTube terms.

## Privacy questions and ongoing review
For non-sensitive privacy questions, open an issue in this GitHub repository.
**Do not post** cookies, session tokens, login details, personal browsing history
or sensitive diagnostics in issues. A dedicated private privacy contact has not
yet been published; the maintainer should establish one.

This technical summary describes the current open-source implementation, not a
legal certification or proof that every distributed build has been independently
audited. It must be reviewed after material app, integration or data-handling changes.
