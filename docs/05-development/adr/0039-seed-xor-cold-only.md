# ADR-0039: Seed XOR operates on BIP-39 entropy and stays cold-only

**Status:** Accepted
**Date:** 2026-08-12

## Context

Phase 2 needs a backup format that is interoperable with Coldcard's Seed XOR
workflow. The format looks deceptively simple: a bitwise XOR is easy to code,
but applying it to word text, word indexes, or the derived 512-bit BIP-39 seed
would produce a different and incompatible scheme. The result must also stay
inside Coldbox's opaque cold realm because the input and every output are
wallet secrets.

The external reference was reviewed on 2026-08-12:
[Coldcard's Seed XOR documentation](https://github.com/Coldcard/firmware/blob/master/docs/seed-xor.md)
and its [published firmware implementation](https://github.com/Coldcard/firmware/blob/master/shared/xor_seed.py).

## Decision

Coldbox implements Seed XOR as follows:

- Accept only 12-, 18-, and 24-word BIP-39 phrases, corresponding to 16, 24,
  and 32 entropy bytes. Support for all vendored BIP-39 wordlists uses the
  selected list consistently; English is the documented Coldcard interop
  choice.
- Convert every phrase to its BIP-39 entropy bytes, XOR those bytes, and
  regenerate a normal BIP-39 checksum for every output. Generation supports
  2, 3, or 4 parts, and all parts are required for recovery.
- Match Coldcard deterministic mode exactly: for zero-based part index `i`,
  hash `Batshitoshi ` + source entropy + the ASCII text `i of N parts` with
  SHA-256 twice, then take the entropy-length prefix. The final part is the
  XOR of the source entropy and all earlier masks.
- Match the random construction's shape: draw each mask source from
  `crypto.getRandomValues`, double-hash it, and take the entropy-length
  prefix. Missing randomness is a hard failure.
- Keep all APIs, buffers, inputs, outputs, reveals, and teardown state in the
  cold realm. No message type, warm selector, clipboard operation, download,
  storage record, or passphrase field is added for Seed XOR.

## Rationale

Operating on entropy bytes is the interoperability boundary documented by
Coldcard and lets each output receive an independent BIP-39 checksum. The
N-of-N warning is explicit because an XOR set has no threshold tolerance:
losing one part loses the source. Deterministic mode is useful for checking
compatibility with an existing Coldcard workflow; random mode is useful when
fresh masks are preferred, but both remain inside the same cold-only boundary.

The implementation uses the already pinned noble SHA-256 and BIP-39 vendor
surfaces. It adds no runtime dependency and does not use WebCrypto as a
fallback for the required CSPRNG check.

## Consequences

### Positive

- Coldbox can combine with the official Coldcard example and independent
  Node SHA-256 calculations.
- Every stored piece has the normal BIP-39 shape and checksum.
- The UI makes the all-parts requirement and lack of threshold recovery hard to
  miss, while masking output until an explicit timed reveal.

### Negative

- Seed XOR is strictly N-of-N; it cannot tolerate a lost or damaged part.
- A deterministic split is not secret-independent from its source: anyone who
  knows the source and parameters can reproduce the same parts. Users must
  still protect the original phrase and all generated pieces.
- BIP-39 passphrases are outside the format and require a separate backup.

### Risks

- A future change to the prefix, index encoding, hash count, or entropy length
  would silently break interoperability. The official example and independent
  reference test must remain in the focused suite.
- A future message or persistence feature must not be allowed to carry these
  values across the cold boundary.

## Alternatives considered

### XOR the words or word indexes

Rejected. BIP-39 words are an encoding of entropy plus checksum; XORing the
text or indexes does not match Coldcard and does not produce valid independent
phrases without defining a new format.

### XOR the derived 512-bit BIP-39 seed

Rejected. Coldcard operates on the mnemonic's entropy, and the derived seed
depends on the optional passphrase. Mixing those boundaries would be
incompatible and would make passphrase handling ambiguous.

### Shamir threshold shares

Rejected for this item. Threshold recovery is a different security property
and belongs to SLIP-39, Shamir39, and raw SSS roadmap work.

### Random bytes without the documented double hash

Rejected. The double hash is part of Coldcard's published construction; using
raw mask bytes would create a different format and make the final part's
distribution depend on a new undocumented choice.

## What would change our mind

An updated Coldcard specification that changes the entropy domain, mask
construction, supported lengths, or part count would require new independent
vectors and a replacement ADR or amendment before changing this implementation.

## References

- [Coldcard Seed XOR documentation](https://github.com/Coldcard/firmware/blob/master/docs/seed-xor.md)
- [Coldcard Seed XOR implementation](https://github.com/Coldcard/firmware/blob/master/shared/xor_seed.py)
- [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Seed XOR user guide](../../03-guides/backup-seed-xor.md)
