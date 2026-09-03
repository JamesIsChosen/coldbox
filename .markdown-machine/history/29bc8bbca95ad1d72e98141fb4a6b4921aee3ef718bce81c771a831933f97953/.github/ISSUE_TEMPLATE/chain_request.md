---
name: Chain support request
about: Request full address support for a blockchain
title: 'Add support for '
labels: chain
---

> **Note:** every chain already works at Tier 3 — any BIP-32 path produces correct private and public keys. This request is for *formatted address rendering*.

## Chain

- Name:
- Symbol:
- SLIP-44 coin type: <!-- from the official registry — do not invent one -->
- Curve: secp256k1 / ed25519 / other
- Address encoding:
- Default derivation path:

## Test vectors — required

**A chain without test vectors will not be merged.** Silently producing a wrong address is worse than not supporting the chain, because there's no way for the user to notice until funds are gone.

Provide at least three, from an independent implementation — the chain's own documentation, a reference library, or a hardware wallet.

| Seed (mnemonic) | Path | Expected address |
|---|---|---|
| | | |
| | | |
| | | |

**Source of these vectors:**

<!-- Link to the documentation, library, or device you verified against -->

## Encoding detail

Version bytes, HRP, checksum algorithm, or anything non-obvious:

## Why

Roughly how many users would benefit, and whether existing tools cover it.
