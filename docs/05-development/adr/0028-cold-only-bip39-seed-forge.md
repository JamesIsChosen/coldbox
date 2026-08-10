# ADR-0028: Cold-only BIP-39 Seed Forge and master fingerprint

**Status:** Accepted
**Date:** 2026-08-09
**Review date:** 2026-08-10

## Context

P1.3 needs to turn Entropy Lab's selected-size byte result into a BIP-39
mnemonic, validate existing phrases, support the optional BIP-39 passphrase,
and show the public master fingerprint. The two-realm architecture forbids
moving any of those secrets into the warm shell, and the randomness contract
requires generation to remain tied to the existing cold `crypto.getRandomValues`
and Entropy Lab accounting.

The repository already vendors `@scure/bip39`, `@scure/bip32`, `@scure/base`,
and the required `@noble` primitives at pinned versions. The existing bundle
only exposed the AES/KDF subset needed by earlier roadmap items.

## Decision

- Bundle the already-pinned `@scure/bip39` and `@scure/bip32` module graphs,
  their `@scure/base` dependency, and all ten official BIP-39 wordlists inside
  the cold realm. No new runtime artifact or network path is introduced.
- Use Entropy Lab's `mix()` result as the Seed Forge generation input. The
  ordinary Generate action draws the exact additional CSPRNG bytes needed
  through the existing cold `cryptoLayer.randomBytes()` wrapper, adds them to
  the same session, and then calls `mix()`. A failed draw or mix throws and no
  phrase is produced.
- A successful explicit Mix action copies its exact returned bytes into a
  cold-local, one-use pending slot. The adjacent **Use this mix in Seed Forge**
  action consumes that exact copy without drawing or mixing again. Entropy Lab
  input changes, output-size changes, session teardown, and successful
  consumption clear and zero the pending copy; a target mismatch fails closed.
- Do not call the vendored BIP-39 `generateMnemonic()` helper: its internal
  random-byte helper would bypass the application's explicit entropy-session
  accounting. The wrapper calls `entropyToMnemonic()` with the already mixed
  bytes instead.
- Normalize phrase words with NFKD before validation and preserve the Japanese
  canonical ideographic separator for display. The vendored decoder receives
  a canonical ordinary-space copy only for checksum/index decoding because
  its Japanese output and decoder separator differ. Before PBKDF2, the
  reconstructed mnemonic sentence is NFKD-normalized again, so Japanese U+3000
  becomes the ASCII space required by BIP-39's published vector.
- Derive the 64-byte BIP-39 seed with PBKDF2-HMAC-SHA512, 2,048 rounds, using
  NFKD mnemonic text and the `mnemonic` + NFKD passphrase salt. Build the
  BIP-32 master key with `@scure/bip32` and display only its first-four-byte
  HASH160 fingerprint as eight lowercase hexadecimal characters. Keep separate
  derived seed/fingerprint state and separate optional passphrase/confirmation
  pairs for Generate and Validate Existing Phrase. Recompute only the owning
  workflow when its confirmed pair changes, and clear only that workflow on a
  mismatch or invalid phrase; cold session teardown clears both.
- Keep the generated phrase masked by default, require duplicate passphrase
  entries before any seed or fingerprint calculation, auto-remask a revealed
  phrase or raw seed after 30 seconds, and provide no clipboard or storage
  action for raw seed material.
- Do not add a warm-cold message type. The warm shell cannot request, receive,
  or store the mnemonic, passphrase, derived seed, raw mixed bytes, or
  fingerprint in this item.

## Rationale

The vendored `@scure` implementations are the project's selected BIP-39/BIP-32
primitives and are independently checked against the official BIP-39 vector
source in `test/seed-forge.test.js`. Keeping the entropy draw in Entropy Lab
preserves the P1.1 burn-on-use and fail-closed behavior. Keeping derivation
local to the cold document means the fingerprint is available for later
Registry work without weakening the realm boundary.

The wrapper is intentionally small: it supplies the application's entropy and
normalization policy, while the vendored implementation remains responsible for
the 2,048-word checksum coding and secp256k1 master-key construction.

## Consequences

### Positive

- BIP-39 generation, validation, passphrase derivation, the raw 64-byte seed,
  and fingerprint output are available offline inside the sealed realm.
- All supported official wordlists use the same checked path, including
  Japanese NFKD text and separators.
- The generated phrase cannot silently use a second random source outside the
  Entropy Lab accounting, and an explicit Mix result cannot silently be
  replaced by a second mix during the handoff.

### Negative

- Bundling the ten wordlists materially increases the single-file artifact.
- BIP-39's fixed 2,048 PBKDF2 rounds are not tunable by Coldbox.
- The UI does not yet derive first addresses or BIP-85 children; those remain
  later roadmap items.

### Risks

- A mismatch between a user's selected language and an existing phrase can
  make a valid phrase appear invalid; the UI therefore keeps language selection
  explicit and reports per-word status.
- The master fingerprint is a public identifier, not proof that a backup is
  written correctly; users must still restore-test the phrase.

## Alternatives considered

### Use `generateMnemonic()` directly

Rejected. Its internal random-byte helper is not the cold realm's explicit
`cryptoLayer.randomBytes()`/Entropy Lab path, so direct use would make the
generation accounting and review surface ambiguous.

### Derive and fingerprint in the warm shell

Rejected. It would require a message carrying secret material or would expose
the passphrase/derived seed to the warm realm, violating ADR-0001 and the
architecture contract.

### Implement BIP-39 and BIP-32 from scratch

Rejected. The repository already pins the selected implementations and their
source artifacts; duplicating checksum coding, wordlist handling, or elliptic
curve arithmetic would enlarge the cryptographic review surface without a
benefit.

### Use WebCrypto PBKDF2 in the cold iframe

Rejected as the default. The opaque-origin frame may not be a secure context,
and the project's crypto policy requires an affirmative known-answer test before
using WebCrypto. The pure-JS vendored path is deterministic and available in
the existing cold bundle.

## What would change our mind

A future independent audit finding in the pinned `@scure`/`@noble` releases, a
new accepted BIP-39 separator/normalization requirement, or a reviewed change
to the cold entropy contract would justify revisiting this ADR. Address and
BIP-85 derivation should extend the same cold-only boundary rather than bypass
it.

## References

- [BIP-39 specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Trezor/python-mnemonic official test vectors](https://raw.githubusercontent.com/trezor/python-mnemonic/master/vectors.json)
- [ADR-0001: Two-realm architecture](0001-two-realm-architecture.md)
- [ADR-0023: Entropy Lab / Seed Forge boundary](0023-entropy-lab-seed-forge-boundary.md)
- [Crypto choices](../../02-security/crypto-choices.md)
