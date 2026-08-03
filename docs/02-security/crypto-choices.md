# Cryptographic choices

Every primitive, why it was chosen, and what was rejected.

Parameter recommendations move as attack hardware improves. See the review triggers at the end.

*Last reviewed: 2026-08-02 · Max age: 12 months · See [doc-hygiene.md](../05-development/doc-hygiene.md)*

---

## Summary

| Purpose | Primitive | Parameters |
|---|---|---|
| Password KDF | **Argon2id** | m=64 MiB, t=3, p=1 (default) |
| Password KDF fallback | PBKDF2-HMAC-SHA512 | ≥1,000,000 iterations |
| Vault encryption | **AES-256-GCM** | 96-bit nonce, 128-bit tag, header as AAD |
| Vault encryption alt | XChaCha20-Poly1305 | 192-bit nonce |
| Subkey derivation | HKDF-SHA-512 | Distinct info strings per compartment |
| Hashing | SHA-256 / SHA-512 | |
| Bitcoin-family hashing | SHA-256, RIPEMD-160 | Protocol-mandated |
| EVM hashing | Keccak-256 | Protocol-mandated |
| Curves | secp256k1, ed25519 | Protocol-mandated |
| Randomness | `crypto.getRandomValues` | Required, no fallback |

---

## Argon2id

**Chosen for:** vault passphrase → key.

OWASP's top recommendation since the 2024 Password Storage Cheat Sheet update. Argon2id combines Argon2i's side-channel resistance with Argon2d's GPU resistance — the hybrid is the recommended variant.

The parameter that matters is **memory**. GPU and ASIC attacks succeed by running thousands of parallel guesses; each one needing 64 MiB makes that expensive in a way that iteration count alone does not.

| Profile | Memory | t | p | Rationale |
|---|---|---|---|---|
| Fast | 19 MiB | 2 | 1 | OWASP minimum. Old phones |
| **Standard** | **64 MiB** | **3** | **1** | **OWASP higher-security. ~100 ms on a modern core** |
| Paranoid | 256 MiB | 4 | 1 | Desktop only — may fail to allocate on iOS |

**Rejected:** bcrypt (72-byte input limit, low memory hardness), scrypt (fine, but Argon2id is the current recommendation and won the PHC), plain PBKDF2 (minimal memory hardness — GPU-friendly, which is exactly wrong here).

**PBKDF2-HMAC-SHA512 at ≥1,000,000 iterations** remains as a fallback only where the Argon2 WASM module won't load. It's weaker against parallel hardware and the app labels it as such in the vault details.

---

## AES-256-GCM

**Chosen for:** compartment encryption.

Authenticated encryption — it detects tampering, not just decrypts. Hardware-accelerated where WebCrypto is available. Universally understood, which matters for a format people may need to open in fifteen years.

**Nonce discipline:** fresh CSPRNG nonce per compartment per save. GCM fails catastrophically on nonce reuse, so in Warm Mode the secret compartment is copied byte-for-byte — ciphertext, nonce, and tag together — never re-encrypted.

**AAD:** the full 65-byte header, so KDF parameters, cipher selection, and compartment lengths are all authenticated and cannot be downgraded or confused by editing the file.

**XChaCha20-Poly1305** is the alternative where WebCrypto AES is unavailable. Its 192-bit nonce makes random nonce collision negligible, and pure-JS ChaCha20 is faster than pure-JS AES.

**Why 256-bit:** partly conservatism, partly quantum. Grover's algorithm halves effective symmetric key strength, so AES-256 retains ~128 bits against a quantum adversary. This is why **the vault needs no post-quantum migration** — the symmetric layer is already adequate.

---

## HKDF-SHA-512

**Chosen for:** deriving the public and secret compartment subkeys from the DEK.

Purpose-built for exactly this: turning one key into several domain-separated keys. Distinct info strings (`cbx/public/v1`, `cbx/secret/v1`) ensure the subkeys are cryptographically independent — compromise of one reveals nothing about the other.

**Rejected:** hashing the DEK with a counter. Works, but HKDF is the standard for this and standard beats clever.

---

## `crypto.getRandomValues`

**Required. No fallback. Ever.**

The single most important primitive here. Every documented case of predictable-randomness key generation has ended the same way — funds swept by someone scanning for weak keys.

If unavailable, the app **hard-fails with an explanation**. It never substitutes `Math.random`, which is seeded predictably and produces guessable keys.

`getRandomValues` is not part of `crypto.subtle`, so it remains available in opaque origins where WebCrypto may not be.

**Dice entropy** is offered as a genuine alternative — not a fallback, a parallel path with its own bias analysis. Users who don't want to trust the platform RNG can generate entropy physically, and mixing mode combines both so that neither alone determines the result.

---

## `@noble` and `@scure`

**Chosen for:** all curve operations, hashing, and BIP-32/39 implementation.

- Audited, and audit reports are public
- **Zero dependencies** — the entire tree is reviewable
- Small, and written to be readable
- Constant-time where it matters
- Actively maintained by Paul Miller

**Rejected:** `bitcoinjs-lib` (large dependency tree), `elliptic` (has had security issues; large), `sjcl` (aging, largely unmaintained), `jsbn` (ancient). All four appear in the Ian Coleman standalone this project replaces, and moving off them is a deliberate upgrade.

---

## WebCrypto is optional, not assumed

The cold realm runs in a sandboxed iframe with an opaque origin, which may not qualify as a secure context. `crypto.subtle` may be `undefined`.

So the cold realm **defaults to pure-JS `@noble` implementations** and uses WebCrypto only after an affirmative known-answer test. Pure-JS AES-GCM runs at a few MB/s — irrelevant for vault-sized payloads.

Assuming WebCrypto and discovering at runtime that it's missing would mean either a hard failure on a common platform or a silent fallback nobody reviewed.

---

## Protocol-mandated primitives

Not choices — determined by the chains:

| Primitive | Used by |
|---|---|
| secp256k1 | Bitcoin, Ethereum, and most others |
| ed25519 (SLIP-0010) | Solana, TON, Aptos, Sui, NEAR, Algorand, Stellar, Hedera |
| SHA-256 + RIPEMD-160 | Bitcoin addresses (HASH160) |
| Keccak-256 | Ethereum addresses, EIP-55 checksums |
| SHA-512 | BIP-32 child derivation, BIP-39 seed derivation |
| PBKDF2-HMAC-SHA512, 2048 iters | BIP-39 mnemonic → seed. **Fixed by the standard** |

That last one deserves a note: BIP-39's 2048 iterations is weak by modern standards, but it is not ours to change. Any deviation produces a different seed and an unrecoverable wallet. Where the standard specifies a parameter, we implement the standard.

---

## Shamir schemes

| Scheme | Field | Use |
|---|---|---|
| SLIP-39 | GF(256) | Standard mnemonic shares. Trezor-compatible |
| codex32 (BIP-93) | GF(32), BCH checksum | Hand-verifiable shares |
| `secrets.js` | GF(2^n), 3–20 bits | Arbitrary secrets |
| Seed XOR | XOR | Coldcard-compatible, N-of-N only |

**Shamir gives information-theoretic security below the threshold** — fewer than T shares reveal *nothing*, not "less." This is stronger than encryption and worth explaining to users, who often assume each share leaks a proportional amount.

codex32's BCH code over GF(32) is what enables hand computation with printed lookup tables, and it corrects errors rather than merely detecting them.

---

## Not implemented

**Post-quantum key encapsulation (ML-KEM).** Unnecessary — the vault's symmetric encryption is already quantum-adequate. Adding it would be theatre.

**Post-quantum signatures (ML-DSA).** Relevant to BIP-360, which was merged into the BIPs repository in February 2026 but is not activated. Derivation support will follow activation, not precede it.

**Homomorphic or threshold signature schemes.** MuSig2 and FROST are tracked for record-keeping. We don't sign, so we don't implement signing.

---

## Review triggers

Revisit this document when: OWASP updates its KDF guidance, an audit is published for a vendored library, a vendored library has a CVE, BIP-360 activates, or WebCrypto secure-context behaviour changes in a major browser.
