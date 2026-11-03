# Code signing Tubeium on Windows

The current public Windows installers are **unsigned**. A valid signature gives
Windows a verifiable publisher identity and improves distribution security.
**No certificate type, including EV, guarantees removal of Microsoft SmartScreen
warnings**; reputation and Windows policy also affect the result.

## Options to evaluate

- **SignPath Foundation:** May offer no-cost signing for eligible open-source
  projects. Approval and provider integration are separate tasks. It is not
  compatible with the existing certificate-based workflow without adaptation.
- **Microsoft Trusted Signing / Azure:** Hosted signing where available, subject
  to eligibility, identity verification, pricing, and provider/CI integration.
- **Commercial OV/EV:** Often requires hardware-token or HSM-backed keys.
  Confirm supported CI integration before purchasing; a downloadable .pfx
  must not be assumed.

## Existing release workflow

The signed workflow in `.github/workflows/release-windows.yml` is gated by
a production environment and expects `TUBEIUM_RELEASE_APPROVED=yes`,
`TUBEIUM_CSC_LINK`, and `TUBEIUM_CSC_KEY_PASSWORD` secrets. These only work
with a signing method supported by the current electron-builder setup.

After arranging signing, verify the Authenticode signature of **both** EXEs,
set the correct electron-builder `publisherName`, test signed update metadata
and upgrade behavior on a clean Windows profile, and retain SHA-256 checksums.
Keep private keys and credentials out of source code, logs, and release assets.

The workflow and this guide do **not** mean Tubeium is already signed.
