# Audit notes

**This software has not been audited.** No professional security firm has reviewed it. It says so in the app, permanently, and will keep saying so until it isn't true.

This document exists to make an eventual audit cheaper and more useful, and to give independent reviewers a map in the meantime.

---

## Where to look first

Ordered by consequence, not by size.

### 1. The realm boundary — highest severity

**Files:** cold realm bootstrap, message handler, schema validator.

The central claim of the project is that secrets cannot leave the cold realm. Anything that falsifies it is critical.

Check:
- Does the cold realm's CSP actually contain `connect-src 'none'`, at runtime, in a shipped build?
- Is `allow-same-origin` genuinely absent from the sandbox attribute?
- Is the handshake `MessageChannel` established before any data flows, and is the global `message` handler ignored afterwards?
- Can any defined message type carry secret material, directly or by reference?
- Does schema validation strip unknown fields rather than pass them through?
- Does the app fail closed if the cold realm can't be established?

### 2. Vault cryptography

**Files:** vault serializer, KDF wrapper, compartment encryption.

Check:
- Fresh nonce for every compartment on every save
- Secret compartment copied byte-for-byte in Warm Mode, never re-encrypted
- Full header in AAD; KDF parameters unmanipulable
- HKDF info strings genuinely distinct
- Padding applied before encryption; no compression anywhere
- Secret subkey unreachable while online — verify there is no code path, not just no UI
- Failed authentication reported without distinguishing wrong-passphrase from damaged-file

### 3. Derivation correctness

**Files:** derivation engine, address formatters, coin registry.

A wrong address is as damaging as a leaked key, and quieter.

Check:
- Test vectors from independent implementations for every chain
- Hardened vs non-hardened handled correctly at every level
- Checksums: EIP-55, bech32 vs bech32m, CashAddr, base58check versions
- BIP-39 normalization: NFKD, whitespace, case
- BIP-39 PBKDF2 uses exactly 2048 iterations — deviation produces a different, unrecoverable wallet

### 4. Secret handling in the DOM

Check:
- `spellcheck="off"` on every secret field, without exception
- No secret reachable in `localStorage`, URL, page title, or session restore
- DOM cleared on lock and on panic hide
- Clipboard auto-clear actually fires

### 5. Randomness

Check:
- `crypto.getRandomValues` used for all key material
- No `Math.random` anywhere in a security-relevant path
- Hard failure — not degradation — when `getRandomValues` is unavailable
- Dice entropy mixing genuinely combines sources rather than letting one dominate

### 6. Shamir implementations

Check against official test vectors: SLIP-39 (including two-level groups and the passphrase extension), codex32 BCH checksum and error correction, Seed XOR round-trip.

Confirm the verify-your-shares workflow cannot be bypassed to mark a backup complete.

---

## Assumptions a reviewer should challenge

1. `srcdoc` iframes inherit parent CSP, and policies combine restrictively. *Verify empirically per browser.*
2. `sandbox` without `allow-same-origin` prevents the parent reading iframe internals. *Verify.*
3. `'wasm-unsafe-eval'` permits WASM without enabling `eval`. *Verify.*
4. Padding to 64 KiB adequately obscures vault contents. *Consider whether bucket boundaries leak.*
5. Median-of-five price aggregation resists a single hostile source. *Consider a majority-compromise scenario.*
6. Argon2id at 64 MiB is adequate for a file an attacker may hold indefinitely. *Consider revising upward as hardware improves.*

---

## Known limitations — not findings

Documented in [threat-model.md](threat-model.md). Not bugs:

- JS memory cannot be reliably wiped
- Nothing survives OS compromise or a malicious extension
- Physical airgap cannot be proved from browser APIs. `navigator.onLine` is only a trigger/hint; the warm shell adds active reachability probes, but even repeated probe failure means only "no external reachability detected." The cold CSP/runtime isolation remains the secret-boundary guarantee
- Balance lookups leak address interest to the queried API by design, mitigated and opt-in
- A weak passphrase defeats the vault
- The in-app self-hash verifier is circular and labelled as such

---

## Scope and timing for the paid v1 audit

The professional audit is a **v1 release-candidate gate**, not an early design
review and not a post-release courtesy. It occurs only after the complete
single-signature Bitcoin wallet and SEC hardening are implemented, and before
the public `v1.0.0` tag. See
[v1-security-wallet-contract.md](../01-spec/v1-security-wallet-contract.md)
and REL.1–REL.4 in the roadmap.

Priority order if the budget is limited:

| Priority | Scope | Rationale |
|---|---|---|
| 1 | Realm boundary and message schema, including the finalized-transaction output | The central secret/network boundary |
| 2 | Level 3 vault v2, migration, KDF and recovery | Protects secrets at rest and bounds key residency |
| 3 | Bitcoin wallet identity, descriptors, UTXO ownership and chain-state trust | Defines what the wallet believes it can spend |
| 4 | Transaction parser/builder, fee/coin selection and exact review binding | A valid signature on the wrong transaction still loses funds |
| 5 | ECDSA/Schnorr signing, sighash and signature-exfiltration boundary | Direct money-movement authority |
| 6 | PSBT, RBF, CPFP, pending/conflict/reorg state | Complex transaction lifecycle |
| 7 | Derivation and backup/recovery schemes | Silent wrongness or recovery failure loses funds |
| 8 | DOM/TCB secret handling | Common implementation escape/injection surface |
| 9 | Fuzz/property/differential tests and resource bounds | Exercises malformed/adversarial inputs |
| 10 | Build/release reproducibility and supply chain | Establishes that users receive the reviewed code |

The auditor receives: this document,
[v1-security-wallet-contract.md](../01-spec/v1-security-wallet-contract.md),
[architecture.md](../01-spec/architecture.md),
[vault-format.md](../01-spec/vault-format.md),
[crypto-choices.md](crypto-choices.md), the transaction/signing ADRs, the
exact release-candidate commit/artifact/hash, fuzz/differential evidence, and
the preserved review history.

**No unresolved audit finding of any severity ships in v1.** If evidence causes
the auditor to withdraw/reclassify something as not a finding, preserve that
disposition; otherwise remediate and regression-test it.

---

## Independent review

Not an audit, but valuable and free:

- Reproduce a build and confirm the hash matches
- Diff a vendored library against its upstream release
- Run official test vectors against the derivation engine
- Attempt to get any secret across the realm boundary
- Read the CSP in a shipped build and confirm it matches what's documented here

Findings via [SECURITY.md](../../SECURITY.md). Anything demonstrating a secret crossing the boundary is critical.

---

## Audit history

| Date | Auditor | Scope | Report |
|---|---|---|---|
| — | None yet | — | — |

The planned first professional entry is REL.2 and must name the exact audited
release-candidate commit. Until that row contains a real audit, Coldbox remains
truthfully unaudited.
