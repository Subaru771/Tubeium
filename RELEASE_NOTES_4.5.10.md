# Tubeium v4.5.10 — Ad transitions

- Proactively strips known ad placement metadata from YouTube player responses, rather than relying exclusively on skipping an already-loaded ad.
- Removed forced seeking to ad duration, playback speed changes and ad muting that could cause a black/frozen gap or spill into real video playback.
- Safe fallback uses the actual YouTube player skip action and enabled, visible skip buttons; normal video playback is left untouched.
- Preserves the original sign-in, browser profile, welcome tab, 201 settings, and fast Windows builder.

This is a best-effort mitigation for a changing third-party site. Some server-side ads, YouTube experiments and black-screen transitions may persist; live YouTube playback on Windows has not been verified.
