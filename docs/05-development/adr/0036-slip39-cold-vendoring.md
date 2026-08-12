# ADR-0036: Cold-only SLIP-39 with phrase-entropy shares

**Status:** Accepted
**Date:** 2026-08-11

## Context

SLIP-39 is a secret-bearing backup format and therefore belongs inside the
sealed cold realm. The project must still ship one offline HTML file, with no
runtime dependency fetch and no secret message crossing to the warm shell.
The standard's 20-word and 33-word share sizes correspond to 128-bit and
256-bit master secrets. A BIP-39 passphrase is a separate secret and must not
be silently folded into the share material.

## Decision

Coldbox embeds a browser adaptation of `ilap/slip39-js` v0.1.9 in
`src/cold/slip39.js`, replacing Node crypto with the already-bundled cold-realm
SHA-256, PBKDF2, and `crypto.getRandomValues` primitives. The embedded source
and its 1024-word list are loaded only into the cold iframe.

The Backup Lab splits the entropy represented by the selected BIP-39 phrase,
not the 64-byte PBKDF2-derived BIP-39 seed. The BIP-39 passphrase and the
SLIP-39 share passphrase are separate user-visible inputs and separate backup
responsibilities. Generated shares are masked by default and recovery compares
the reconstructed entropy to the selected phrase locally when available.

## Rationale

This preserves interoperability with the standard's documented 20/33-word
forms while avoiding an accidental claim that a BIP-39 passphrase is included.
Using the existing cold crypto bundle avoids adding a runtime package or a new
network-capable path. Official Trezor vectors, including two-level groups and
the extendable-backup flag, provide independent interoperability evidence.

## Consequences

### Positive

- All SLIP-39 arithmetic, share material, and passphrases remain cold-local.
- The output is compatible with the standard's 1024-word share format.
- The build remains a single deterministic HTML artifact with no new runtime fetch.

### Negative

- Users who use a BIP-39 passphrase must back up that passphrase separately.
- The adapted source requires a focused provenance and vector review whenever
  the upstream implementation changes.

### Risks

- The adapted helper retains local helper prototype methods from its upstream
  implementation; the sealed realm limits their scope, but future refactoring
  should remove that global mutation if it can do so without changing vectors.
- The project has not yet completed the real-device compatibility matrix for
  SLIP-39 hardware support.

## Alternatives considered

### Split the 64-byte derived BIP-39 seed

Rejected for the primary UI because it produces nonstandard longer shares and
silently couples the result to the selected BIP-39 passphrase. It remains
possible through the lower-level API's supported 16–64-byte master-secret
range, but is not the Backup Lab default.

### Add an npm runtime package

Rejected because the offline single-file constraint and the existing cold
crypto bundle make a fetched or separately loaded runtime dependency
unnecessary.

### Implement a new SLIP-39 algorithm from the standard alone

Rejected for this item because a small, reviewable adaptation of a pinned
implementation plus independent official vectors gives a narrower change
surface. The standard remains the interoperability authority.

## What would change our mind

Adopt a different implementation only if it passes the same official vectors,
has stronger provenance, removes the helper's global prototype mutation without
changing behavior, and preserves the cold-only boundary and reproducible
bundle.

## References

- [SLIP-0039 specification](https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
- [ilap/slip39-js v0.1.9 source](https://github.com/ilap/slip39-js/blob/v0.1.9/src/slip39_helper.js)
- [Trezor python-shamir-mnemonic vectors](https://github.com/trezor/python-shamir-mnemonic/blob/master/vectors.json)
