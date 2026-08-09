# ADR-0026: One canonical vault file; animated QR is live device-to-device transfer only

**Status:** Accepted
**Date:** 2026-08-08

## Context

P0.19 hands-on testing showed that the earlier per-vault *visible generation* design solved rollback bookkeeping at the cost of a confusing storage model: one logical vault could accumulate several similarly named `.cbx` files, and a user could reasonably be unsure which copy was the current vault. The same testing also exposed a conceptual problem in the P0.13 numbered-QR save/export flow. A normal encrypted vault can require well over one hundred QR frames; treating those frames as user-managed export artifacts is not a usable backup workflow.

The redesign must keep the existing two-realm security boundary, P0.14 verify-after-save behavior, format-v1 compatibility, and honest browser portability constraints.

## Decision

1. **One Vault ID has one canonical local filename.** Current Coldbox names it `<public-name>--<id8>.cbx`. No current filename carries a user-visible save-generation suffix.
2. **An unchanged saved vault cannot be saved again as another look-alike copy.** Save is actionable only when the active vault has unsaved state. After a download-only save becomes **Saved · unverified**, normal Lock offers Lock anyway / Cancel rather than a misleading Save-first action; verification happens by reopening the downloaded canonical `.cbx`. When future editing makes an already-saved vault dirty, a retained File System Access handle updates the same canonical file and verifies it byte-for-byte. Browsers limited to downloads can only start an explicitly **unverified canonical replacement**; Coldbox cannot promise that the browser overwrote an existing filesystem file.
3. **Public vault names are unique within what Coldbox can actually know.** A different Vault ID cannot claim a name already owned in the current session, the best-effort browser-profile name registry, or the currently user-granted Vault Library. This is not a claim of disk-wide uniqueness: a local HTML app cannot silently enumerate the filesystem.
4. **Vault ID remains the authority.** The cold-generated authenticated UUID is immutable. The public name and `id8` filename suffix are convenience metadata and are checked against the authenticated ID after unlock.
5. **P0.14 history becomes internal/advisory for current files.** Existing browser-local per-Vault-ID high-water bookkeeping remains so Coldbox can give a best-effort timestamp rollback warning. Historical generational filenames (`<name>--<id8>--0047.cbx` and `coldbox-vault-0047.cbx`) remain readable and retain their numeric rollback checks, but new saves migrate to the canonical filename rather than creating another generation file.
6. **Animated vault QR is live transport, never storage.** There is no Download QR, Save QR Frames, animated-image backup, or QR-image import path for vaults. `.cbx` is the canonical durable storage/backup format.
7. **Sender requires an already-unlocked, durably backed named vault.** The vault must have been loaded from a durable `.cbx` or completed a verified canonical File System Access save; live QR cannot be the sender's first/only persistence path. Warm requests a fresh encrypted `.cbx` representation from cold and displays only those encrypted bytes as a repeating QR stream. No passphrase, seed, plaintext secret compartment, or unlock authority is encoded.
8. **Receiver is another running Coldbox device that does not already have this vault in its currently granted library.** After the manifest/payload is verified, a matching local Vault-ID hint is refused and the user is directed to the local `.cbx`; Coldbox is honest that it cannot discover ungranted files elsewhere on disk. Camera permission is requested only after the user chooses **Receive from another device**. The warm shell collects encrypted frames; after reconstruction, the ordinary `vault.open` path is used, so the receiver must still enter the vault's normal unlock phrase. A received vault is **Not saved** on that device until the user saves its canonical `.cbx`.
9. **Each live transfer has an ephemeral Transfer ID and final SHA-256.** `CBX-VT/1` frames carry a random non-secret 128-bit Transfer ID. Frames may repeat or arrive out of order; frames from another Transfer ID are rejected. Reassembled encrypted bytes are accepted only after the complete SHA-256 matches the manifest. The announced Vault ID is checked again against the authenticated Vault ID after unlock.
10. **QR receive is progressive enhancement.** Current receive uses a user-initiated camera plus feature-detected browser QR decoding. If the running browser does not expose the required camera/decoder capability, Coldbox says so and directs the user to transfer the canonical `.cbx` instead. P0.19 must record real-device support honestly rather than infer it.
11. **Live transfer is ephemeral.** Lock, panic hide, or security teardown clears the sender animation. Cancelling receive stops camera tracks and discards incomplete frames. No QR payload is persisted by Coldbox.

## Rationale

A vault is one logical object. Its durable representation should therefore look like one file, not a folder of generations. The authenticated UUID already provides stable identity; exposing revision counters in filenames adds cognitive load without adding cryptographic rollback protection.

QR is valuable when it does what files cannot: move encrypted bytes directly between two isolated devices without removable media or a network. Turning 100+ QR frames into downloadable images merely wraps a perfectly good `.cbx` file in a larger, harder-to-parse container. Keeping QR live avoids a second backup format and its parser/UX burden.

## Consequences

### Positive

- The Vault Library presents one canonical file per logical vault.
- A second vault cannot silently reuse an already-known public name.
- Historical `.cbx` files remain loadable.
- `.cbx` remains the only durable vault format; QR transfer has one clear purpose.
- Filming the live QR yields encrypted vault material comparable to copying the `.cbx`, not the passphrase or plaintext vault.
- Receiving a transfer does not bypass normal unlock authentication.

### Negative / limits

- Browser-profile name uniqueness is best effort and cannot discover an unseen duplicate elsewhere on disk.
- Download-only browsers cannot guarantee in-place replacement or verify what the browser wrote. The UI must remain explicit about this limitation.
- `BarcodeDetector`/camera support is not uniform, so live receive may be unavailable on a platform even when `.cbx` file transfer works.
- Sequential `CBX-VT/1` framing can require many observations. A future fountain-code transport may improve scan efficiency without changing the `.cbx` storage model.
- Timestamp rollback hints for current canonical files are weaker than an authenticated monotonic counter. They are advisory only.

## Alternatives considered

**Keep visible per-vault generation files.** Rejected after human testing: technically coherent, but it makes one vault look like many vaults and creates avoidable selection mistakes.

**Forbid all future re-save/update operations.** Rejected. Once editing exists, a changed vault must be persistable. The correct rule is one canonical destination per identity, not “a vault may only ever be written once.”

**Download one animated PNG/GIF/APNG containing all QR frames.** Rejected. The same-device restore case would require Coldbox to decode an animation and hundreds of QR images merely to reconstruct bytes that could have been stored directly as `.cbx`, adding parser attack surface with no backup benefit.

**Download every QR frame.** Rejected as unusable at realistic frame counts.

**Transfer the unlocked state/passphrase.** Rejected. It would turn the QR into credential material. The receiver always performs its own normal unlock.

## What would change our mind

- A portable browser API that safely and consistently supports a better live QR decoder may replace `BarcodeDetector` without changing the transfer/security semantics.
- A reviewed fountain/erasure-coded framing scheme may supersede sequential `CBX-VT/1` if real-device testing shows capture time or missed frames are unacceptable.
- A future authenticated rollback design may replace timestamp/high-water advisory bookkeeping, but it must be separately reviewed because it changes what is authenticated and/or the vault format.

## References

- [ADR-0013 — Save integrity in warm shell](0013-save-integrity-in-warm-shell.md)
- [ADR-0025 — Vault identity/library/save UX](0025-vault-identity-library-and-save-ux.md)
- [Vault format](../../01-spec/vault-format.md)
- [Architecture](../../01-spec/architecture.md)
- [P0.19 packet](../packets/p0.19-device-matrix.md)
