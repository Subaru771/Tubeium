# Tubeium security policy

## Reporting a vulnerability
Do **not** post authentication cookies, pairing credentials, passwords, local
browser profiles, session tokens or exploit details in a public issue.

If this repository's GitHub Security tab offers **private vulnerability reporting**,
use that channel. If it is unavailable, open a public issue requesting a safe
private reporting method **without** disclosing the vulnerability or any secret.
A dedicated private security contact is not currently published; the maintainer
should configure one before promoting the project more widely.

## Security boundaries
- Tubeium runs YouTube content in an Electron BrowserWindow with Node integration
  disabled, context isolation enabled and sandboxing enabled.
- Local application windows restrict navigation and IPC sources.
- Website permissions are denied by default except for explicit user settings.
- The optional Chrome/Edge session helper reads sensitive cookies **only after**
  user-granted permissions and sends them to a localhost listener using a
  high-entropy, time-limited pairing credential. Never share pairing codes.
- The local bridge rejects ordinary web origins, invalid destinations,
  oversized payloads and repeated/concurrent transfers.
- Backups omit credentials. Imported files have validation and size limits.

## Known limitations
- Google can reject transferred sessions; successful cookie import does not
  certify account sign-in.
- Unsigned Windows executables can produce SmartScreen warnings and cannot
  be represented as publisher-verified.
- Embedded YouTube content and external integrations remain third-party
  services. A successful source test does not substitute for penetration testing.
- Downloaded content and third-party binaries require separate trust review.

## Recommended publisher release process
Run automated tests, audit dependencies, verify the Windows installer on a clean
machine, supply a trusted code-signing certificate, sign and checksum release
artifacts, and test updates. Avoid posting signing certificates or credentials
in the source repository.
