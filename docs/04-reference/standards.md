# Standards

Every BIP, SLIP, and other standard Coldbox implements, tracks, or deliberately declines.

Adoption status changes as wallets ship support and proposals activate. Re-check before relying on the "tracked, not implemented" rows.

*Last reviewed: 2026-08-07 · Max age: 12 months · See [doc-hygiene.md](../05-development/doc-hygiene.md)*

---

## Implemented

### Core derivation

| Standard | Title | Use |
|---|---|---|
| [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) | Hierarchical Deterministic Wallets | Foundation of all derivation |
| [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) | Mnemonic code | Seed phrases, all nine wordlists |
| [BIP-43](https://github.com/bitcoin/bips/blob/master/bip-0043.mediawiki) | Purpose field | Path structure |
| [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) | Multi-account hierarchy | Legacy paths |
| [BIP-49](https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki) | Nested SegWit | `3...` addresses |
| [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) | Native SegWit | `bc1q...` addresses |
| [BIP-86](https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki) | Taproot | `bc1p...` addresses |
| [BIP-85](https://github.com/bitcoin/bips/blob/master/bip-0085.mediawiki) | Deterministic entropy | Child seeds from a master |
| [SLIP-44](https://github.com/satoshilabs/slips/blob/master/slip-0044.md) | Coin types | Chain registry |
| [SLIP-0010](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) | Ed25519 derivation | Solana, TON, Aptos, Sui, others |

### Encoding

| Standard | Title | Use |
|---|---|---|
| [BIP-173](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki) | bech32 | SegWit v0 addresses |
| [BIP-350](https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki) | bech32m | Taproot addresses |
| [BIP-21](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki) | Payment URIs | Address QR codes |
| [EIP-55](https://eips.ethereum.org/EIPS/eip-55) | Address checksum | EVM address validation |
| [EIP-681](https://eips.ethereum.org/EIPS/eip-681) | Payment URIs | EVM QR codes |

### Backup

| Standard | Title | Use |
|---|---|---|
| [SLIP-39](https://github.com/satoshilabs/slips/blob/master/slip-0039.md) | Shamir mnemonic shares | Two-level group backup |
| [BIP-93](https://github.com/bitcoin/bips/blob/master/bip-0093.mediawiki) | codex32 | Hand-verifiable shares |
| Shamir39 | Non-standard | Compatibility with existing shares |
| Seed XOR | Coldcard | N-of-N seed splitting |
| SeedQR | SeedSigner | QR seed storage |

### Interop

| Standard | Title | Use |
|---|---|---|
| [BIP-329](https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki) | Wallet labels | Import/export with Sparrow, Nunchuk, BitBox, BTCPay |
| [BIP-380/381](https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki) | Output descriptors | Wallet definitions |
| [BIP-388](https://github.com/bitcoin/bips/blob/master/bip-0388.mediawiki) | Wallet policies | Multisig registration |
| BC-UR (UR2) | Uniform Resources | Animated QR for airgap transfer |
| [NIP-06](https://github.com/nostr-protocol/nips/blob/master/06.md) | Nostr key derivation | `m/44'/1237'` |
| [RFC 9106](https://datatracker.ietf.org/doc/rfc9106/) | Argon2 | Vault KDF |

---

## Tracked, not implemented

| Standard | Status | Position |
|---|---|---|
| [BIP-352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) Silent Payments | Complete, v1.1.0 March 2026. **No wallet has shipped support as of mid-2026** | Phase 5, experimental. Generate and store `sp1` addresses; revisit when wallets ship |
| [BIP-360](https://github.com/bitcoin/bips/pull/1670) P2MR / P2QRH | Merged into bitcoin/bips February 2026. **Not activated** | Readiness panel now, derivation on activation. See below |
| [BIP-327](https://github.com/bitcoin/bips/blob/master/bip-0327.mediawiki) MuSig2 | Standardized; Ledger app 2.4.0 ships it, software keys only for miniscript | Record-keeping only. We don't sign |
| Miniscript | Nunchuk shipped generalized miniscript 2026; Coldcard/Jade/Ledger support native SegWit, Taproot on Coldcard/Ledger/Specter DIY | Phase 5, parse and display only |
| FROST | Active development, not deployed | Watching |
| ERC-4337 | Widely deployed | Registry support Phase 5 — smart account addresses aren't derived conventionally |
| [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) Multi Injected Provider Discovery | Final; implemented by every current EVM wallet extension | **Declined** — [ADR-0020](../05-development/adr/0020-injected-providers-rejected-and-neutered.md). Not a quality judgement on the standard, which cleanly solves the `window.ethereum` contention problem. Provider calls bypass page CSP entirely, and the feature it would have enabled was not worth a carve-out in the design commitments. The event name is still *recognised* — in the cold realm, as an isolation-failure signal ([P0.21](../05-development/ROADMAP.md)) |
| [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) Provider JavaScript API | Final; universal | **Declined**, with EIP-6963. Nothing here calls a provider |

### On BIP-360 and quantum

Worth separating two claims, because the topic attracts more noise than signal.

**The vault is already fine.** AES-256 and Argon2id are symmetric. Grover's algorithm halves effective symmetric key strength, leaving AES-256 with ~128 bits against a quantum adversary. No post-quantum migration of the vault format is needed, and adding one would be theatre.

**On-chain exposure is the real question**, and it concerns ECDSA/Schnorr public keys, which become vulnerable once revealed. An address that has never been spent from has its public key hashed and is far better protected than one that has.

BIP-360 merging in February 2026 means the *documentation* standard is settled — not that activation is near or endorsed. Coldbox ships a readiness panel that inventories your addresses, flags reuse and exposed public keys, and explains the actual risk. Derivation support follows activation.

---

## Deliberately not implemented

| Standard | Why |
|---|---|
| [ERC-7730](https://eips.ethereum.org/EIPS/eip-7730) clear-signing metadata | **Hardware wallets already do this better.** Ledger implements ERC-7730 on-device *and* operates the descriptor registry. Coldbox fetches nothing at build or run time ([CONTRIBUTING.md](../../CONTRIBUTING.md)), so it could only use hand-imported descriptors with provenance it cannot verify — a weaker duplicate of a check the same user already gets downstream, and shipping a weaker duplicate of a security check invites reliance on the weaker one. Full analysis in [ADR-0019](../05-development/adr/0019-no-transaction-workbench.md). **Revisit if on-device support stalls** |
| BIP-38 (encrypted keys) | Superseded; weak KDF by modern standards |
| BIP-70 (payment protocol) | Deprecated, removed from most wallets |
| Electrum seed format | Non-standard, incompatible with BIP-39 |
| Monero seed scheme | Different enough to invite errors. Use the official tools |
| Zcash shielded derivation | Large separate implementation. Transparent only |

---

## Where we deviate

**Nowhere, deliberately.** Where a standard specifies a parameter, we implement the standard even when we'd choose differently.

The clearest example: **BIP-39 uses PBKDF2-HMAC-SHA512 with 2048 iterations** to turn a mnemonic into a seed. That's weak by modern standards. It is not ours to change — any deviation produces a different seed and an unrecoverable wallet. We implement 2048.

Our own choices — Argon2id for the vault, AES-256-GCM, HKDF domain separation — apply only where no standard governs.

---

## Proposing a standard

Open an issue with: a link to the specification, its current status, which wallets have shipped support, what it would enable for users, and implementation cost.

The bar is **shipped adoption**, not specification maturity. BIP-352 is complete and well-designed, and still isn't implemented, because no wallet has shipped support — an address format nothing can spend from would be a liability, not a feature.
