# ADR-0036: Codex32 is an inline BIP-93 adaptation owned by the cold realm

**Status:** Accepted
**Date:** 2026-08-12

## Context

P2.2 adds codex32 backup generation and recovery. Codex32 carries a BIP-32 master seed directly, supports threshold shares over GF(32), and uses a hand-verifiable BCH checksum. The seed and every share are secret material under the two-realm architecture; the warm shell must not receive them.

The repository's runtime-dependency contract also forbids fetching a library at build or run time. A separate package would add another provenance and vendoring surface for a small standard-defined primitive.

## Decision

Implement the BIP-93 checksum, bit conversion, GF(32) arithmetic, Lagrange interpolation, direct-secret encoding, threshold generation, recovery, and bounded single-character correction in `src/cold/codex32.js`. Assemble it as an ordered inline component of the cold `srcdoc`; do not expose an API on the warm shell and do not add a runtime package.

Use `crypto.getRandomValues` only for random polynomial coefficients and fail closed when it is unavailable. Generate shares as polynomials anchored at the secret coordinate `s`, so interpolation at `s` recovers the supplied master seed. The UI masks generated and recovered strings by default, uses timed reveal actions, clears them on cold-session teardown, and requires explicit confirmation before loading a correction candidate.

## Rationale

The official BIP-93 vectors provide an independent interoperability authority for checksum, long-string, interpolation, and recovery behavior. Keeping the adaptation small and inline makes the build auditable and preserves the no-runtime-dependency and single-file contracts. Keeping all values inside the cold realm preserves the architecture's central invariant.

The UI accepts a direct 16-to-64-byte BIP-32 master seed in hexadecimal. It does not pretend that codex32 input is BIP-39 entropy and does not add a passphrase transformation.

## Consequences

### Positive

- The artifact remains offline-first and dependency-free at runtime.
- BIP-93 shares can be checked and recovered inside the existing cold boundary.
- Official vectors, negative cases, browser masking, and teardown behavior are testable in the repository.

### Negative

- The implementation must remain synchronized with the draft BIP-93 standard and its constants.
- The P2.2 correction helper intentionally handles one bounded character substitution; it does not claim to implement the standard's full multi-error correction search.
- A direct master seed is not a BIP-39 mnemonic or passphrase and cannot be restored by treating the codex32 text as words.

### Risks

The highest-risk code is the field interpolation and share-generation anchor at `s`; an indexing error can produce valid-looking checksummed shares that recover the wrong seed. Official vectors cover interpolation, and generated round-trip tests cover the anchor for 16-, 32-, and 64-byte inputs. Physical paper transcription, worksheet use, and mobile/local-file execution remain outside automated browser coverage.

## Alternatives considered

### Add a third-party codex32 package

Rejected for P2.2. It would enlarge the vendoring and provenance surface for a compact standard-defined primitive and would still need an independent cold-only integration and audit.

### Implement codex32 in the warm shell and pass only results across

Rejected. Shares and reconstructed seeds are secret material; an API-shaped result would still create an avoidable boundary risk and contradict the architecture.

### Treat codex32 as BIP-39 entropy

Rejected by BIP-93. Codex32 encodes the direct BIP-32 master seed; adding a BIP-39 checksum or passphrase transformation would change the wallet secret and break interoperability.

### Automatically apply error-correction candidates

Rejected. The BIP-93 guidance requires user confirmation before proceeding with a corrected value, and the paper copy is the authority for a transcription decision.

## What would change our mind

Adopt a vendored implementation only if it has a stable, independently auditable release with byte-pinned provenance and a demonstrable interoperability or maintenance benefit. Expand correction only with independent vectors and a bounded, fail-closed algorithm. Any change to the cold/warm API requires a separate architecture review.

## References

- [BIP-93 codex32 specification and test vectors](https://github.com/bitcoin/bips/blob/master/bip-0093.mediawiki)
- [Two-realm architecture](../../01-spec/architecture.md)
- [Codex32 user guide](../../03-guides/backup-codex32.md)
- [P2.2 packet](../packets/p2.2-codex32.md)
