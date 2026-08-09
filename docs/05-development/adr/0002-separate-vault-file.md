# ADR-0002: Vault data lives in a separate file

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The app needs persistent storage for wallets, addresses, notes, portfolio data, and optionally seeds. It runs from `file://` with no server. Three options existed.

## Decision

Store data in a **separate encrypted file** (`.cbx`), and keep the application HTML byte-stable forever.

## Rationale

The deciding factor is **verifiability**.

If the HTML never changes, its SHA-256 can be checked against a published hash on every single use, forever. That check is the foundation of every other security property — a tampered build could do anything, including drawing a fake passphrase prompt or silently weakening key generation.

A self-modifying HTML file has a hash that changes on every save, so it can never be verified again after first use. That trades away the most important security control for the convenience of managing one file instead of two.

## Consequences

### Positive

- The app is verifiable on every use, indefinitely.
- Data and code have independent lifecycles — update the app without touching data, back up data without re-verifying the app.
- The vault can be backed up, versioned, and synced independently.
- A separate `.cbx` remains easy to copy and verify without rebuilding the app. Current saves use one canonical file per Vault ID; historical generational files remain readable (ADR-0026).
- A corrupted vault doesn't take the app with it, and vice versa.
- Data survives the app being replaced by something better.

### Negative

- Two files to manage instead of one.
- Users must remember to save — mitigated by loud unsaved-change indicators and a close warning.
- Saving from supported `file://` execution contexts can require three fallback paths (§8.5); direct iOS local-HTML execution from Files is a separate blocked portability target under [ADR-0010](0010-ios-local-html-execution.md).
- Slightly more onboarding friction.

## Alternatives considered

**Embedded in the HTML, self-rewriting.**
Rejected. Truly one file, and users like that. But the hash changes on every save, so integrity verification becomes impossible after first use. A browser crash mid-save could corrupt both data and application together. The convenience isn't worth losing the ability to detect a malicious build.

**Browser storage (IndexedDB / localStorage).**
Rejected. Data becomes invisible and fragile: clearing browser data destroys it, opening the file from a different path may not find it, and it doesn't travel with the USB stick. Wrong for airgapped machines and long-term storage, where the whole point is that the data is a file you can hold and copy.

**No persistence at all.**
Rejected. Record-keeping is a core requirement, and the backup/inheritance features depend on durable state.

## Notes

**Amended by ADR-0026:** durable vault storage has one format (`.cbx`) with two browser-dependent write mechanisms: verified File System Access where available and an explicitly unverified canonical download replacement elsewhere. Encrypted Base64 is an advanced transport handoff, not a save. Vault animated QR is live device-to-device transfer only and is never downloadable backup output. Direct iOS local execution from Files is not implied; see [ADR-0010](0010-ios-local-html-execution.md) and [ADR-0026](0026-canonical-vault-save-and-live-transfer.md).

## References

- [vault-format.md](../../01-spec/vault-format.md)
- [SPEC.md §8](../../01-spec/SPEC.md)
