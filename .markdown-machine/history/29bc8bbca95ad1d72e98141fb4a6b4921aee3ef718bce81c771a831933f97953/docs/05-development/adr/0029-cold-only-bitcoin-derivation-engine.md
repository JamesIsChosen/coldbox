# ADR-0029: Cold-only Bitcoin BIP-32 derivation engine and script encodings

**Status:** Accepted
**Date:** 2026-08-10

## Context

P1.3 now produces a raw BIP-39 seed and master fingerprint inside the sealed iframe, but it intentionally does not derive account keys or addresses. The next recovery-critical boundary is Bitcoin derivation: a wrong address is as dangerous as a leaked key, while moving a seed or private key into the warm shell would defeat the two-realm architecture.

The engine must remain offline and deterministic, use only vendored primitives, support the Tier 1 Bitcoin script types already listed in the chain registry, and make watch-only derivation possible without turning an extended public key into a spending capability.

## Decision

Implement a cold-only JavaScript derivation module around the vendored `@scure/bip32`, `@noble/curves/secp256k1`, `@noble/hashes`, and `@scure/base` primitives. The module accepts raw seed bytes only inside the cold realm, validates canonical BIP-32 paths and bounded address batches, and returns public projections for:

- BIP-44 P2PKH (`m/44'`), Base58Check
- BIP-49 P2SH-P2WPKH (`m/49'`), Base58Check
- BIP-84 P2WPKH (`m/84'`), Bech32 v0
- BIP-86 key-path P2TR (`m/86'`), Bech32m v1

It also accepts only depth-3, hardened-account extended public keys using the standard xpub/tpub and SLIP-132 ypub/upub/zpub/vpub version bytes. Only non-hardened children are derived from those keys. Before any script-family address hash, the compressed public key is parsed as a secp256k1 point; syntactically compressed but invalid bytes are rejected. A watch-only result does not claim a master fingerprint that the xpub cannot carry; it reports the account fingerprint separately.

No seed, private key, extended private key, or secret-bearing message is added to the protocol. `connect-src 'none'` and the existing warm/cold boundary remain unchanged.

## Rationale

The selected libraries are already vendored and independently verified, so this keeps curve arithmetic and HD-key serialization reviewable without adding a runtime dependency. Keeping the engine in the cold realm means the warm shell can eventually request only public address material through the already-public derivation protocol shape. BIP-86's even-Y normalization and tagged tweak are implemented explicitly because using a generic P2WPKH hash or a non-normalized key would silently produce a different Taproot address.

## Consequences

### Positive

- Bitcoin address derivation is deterministic, offline, and testable against published vectors.
- Account xpubs can support future watch-only registry and verification workflows without exposing spending material.
- Batch limits and strict path parsing prevent accidental hardened-range or unbounded derivation requests.

### Negative

- Only Bitcoin single-key script types are covered; EVM, arbitrary paths, multisig, descriptors, and other chains remain later roadmap work.
- An xpub alone cannot provide the master fingerprint or recover the omitted hardened path context.
- Taproot support depends on `BigInt` and the platform's secp256k1 point implementation exposed by the vendored library.

### Risks

An address-format or curve mistake can direct funds to an address the user cannot spend from. Independent BIP vectors, Node/OpenSSL public-key checks, strict input validation, and the cold-only boundary are the controls for this risk; the device/browser matrix remains a separate review responsibility.

## Alternatives considered

- **Derive in the warm shell:** rejected because the warm realm is network-capable and must never receive a seed or private key.
- **Use Web Crypto for BIP-32:** rejected because browser Web Crypto does not provide the required deterministic HMAC/curve/address stack consistently across the supported `file://` targets.
- **Write new curve and Base58/Bech32 implementations:** rejected because the already-vendored, reviewable Noble/Scure primitives reduce arithmetic and serialization surface.
- **Return the master fingerprint from an xpub:** rejected because an account xpub does not contain the master public key and claiming one would create a false identity signal.

## What would change our mind

An independent audit finding in the selected vendored primitives, a platform requirement that cannot support `BigInt`/secp256k1 in the cold realm, or a standards change that invalidates the current BIP-44/49/84/86 encodings would require a new ADR or a superseding decision.

## References

- [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) — hierarchical deterministic keys and test vectors
- [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) — legacy path structure
- [BIP-49](https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki) — nested SegWit
- [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) — native SegWit
- [BIP-86](https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki) — key-path Taproot
- [SLIP-132](https://github.com/satoshilabs/slips/blob/master/slip-0132.md) — extended-key version bytes
