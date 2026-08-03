# Roadmap

**This file is the single source of truth for what to build next.** It is machine-readable by convention: work the first unchecked item whose dependencies are all complete.

Status: `[ ]` not started · `[~]` in progress · `[x]` complete

Every PR must update this file in the same commit as the work it completes.

---

## How to pick the next item

1. Read top to bottom.
2. Find the first `[ ]` item whose listed dependencies are all `[x]`.
3. If it's already `[~]`, check for an open PR or branch before starting — someone may be on it.
4. Do **that item only**. One roadmap item per PR.
5. If the item is ambiguous or the spec doesn't settle a design question it raises, **stop and open a question issue or an ADR proposal rather than guessing.** Guessing on a security boundary is worse than a delay.

Do not skip ahead to a later phase because it looks more interesting. Ordering encodes dependency, and Phase 0 in particular is load-bearing for everything above it.

---

## Phase 0 — Foundation

Nothing above this phase is safe to build until the container is trustworthy.

### Build and verification pipeline

- [x] **P0.1 — Deterministic build skeleton**
  *Deps: none*
  `package.json`, `.nvmrc`, and a build script assembling `src/` into a single `build/coldbox.html`. No app features yet — an empty shell is fine.
  **Accept:** two consecutive clean builds produce byte-identical output; `build/coldbox.html.sha256` emitted; `LC_ALL=C TZ=UTC` enforced; no timestamps, machine paths, or unsorted iteration in output.

- [x] **P0.2 — Vendor layout and verification**
  *Deps: P0.1*
  `vendor/` structure, `npm run verify-vendor` re-downloading upstream releases and comparing hashes, `dependencies.md` populated with real versions and hashes for `@noble/*` and `@scure/*`.
  **Accept:** `verify-vendor` passes; a deliberately corrupted vendor file makes it fail; the build refuses to run if verification fails.

- [ ] **P0.3 — Forbidden-construct lint**
  *Deps: P0.1*
  Build-time check rejecting `eval`, `new Function`, `import`, `require`, external URLs, and `localStorage` in secret-handling paths.
  **Accept:** lint runs in the build and fails it; a test fixture containing each construct is rejected.

- [ ] **P0.4 — CSP hash-pinning in the build**
  *Deps: P0.1*
  Compute SHA-256 of each inline script and style block; inject into the respective `script-src`/`style-src` directives.
  **Accept:** built file runs with no CSP violations; altering one byte of the inline script post-build causes the browser to refuse to execute it.

### The two realms

- [ ] **P0.5 — Warm shell skeleton**
  *Deps: P0.4*
  Outer document, CSP per [csp-policy.md](../02-security/csp-policy.md), nav rail and mobile tab bar, routing, dark/light. No features.
  **Accept:** loads from `file://` on the full device matrix; no console errors; responsive from 360 px to desktop.

- [ ] **P0.6 — Cold realm bootstrap**
  *Deps: P0.5*
  `srcdoc` iframe with `sandbox="allow-scripts allow-downloads"` and its own CSP including `connect-src 'none'`.
  **Accept:** iframe instantiates; `fetch`, `XHR`, and `WebSocket` inside it throw; warm shell cannot read its DOM or variables; **app fails closed with an explanation if the iframe cannot be established.**

- [ ] **P0.7 — MessageChannel handshake and schema validator**
  *Deps: P0.6*
  Handshake transferring a port; typed whitelist schema per [architecture.md](../01-spec/architecture.md); global `message` handler ignored after handshake.
  **Accept:** schema rejects unknown types and strips unknown fields; a test asserts **no message type can carry a mnemonic, private key, xprv, passphrase, or secret-compartment plaintext**; messages injected on the global handler post-handshake are discarded and logged.

- [ ] **P0.8 — CSP canary and airgap guard**
  *Deps: P0.7*
  Deliberate policy-violating request as a canary; `navigator.onLine` and `connection` signals; banner states green/amber/red; runtime neutering of network primitives inside the cold realm.
  **Accept:** canary fires correctly in both realms; a build with CSP stripped goes to full lockdown and refuses vault operations; banner reflects actual network state within 5 s.

- [ ] **P0.9 — Capability self-check panel**
  *Deps: P0.8*
  Boot-time detection of `getRandomValues`, `crypto.subtle`, WASM, Workers, camera, and available save paths.
  **Accept:** accurate on every platform in the device matrix; **hard-fails with an explanation if `getRandomValues` is absent**, never substituting `Math.random`.

### Cryptography and vault

- [ ] **P0.10 — Crypto layer**
  *Deps: P0.9*
  Pure-JS `@noble` as the default path; WebCrypto used only after an affirmative known-answer test; Argon2id WASM loading.
  **Accept:** RFC 9106 Argon2 vectors and NIST AES-GCM vectors pass on both paths; **vault details display which KDF is actually active**, so a silent PBKDF2 fallback is impossible.

- [ ] **P0.11 — Vault format v1**
  *Deps: P0.10*
  Serializer and parser per [vault-format.md](../01-spec/vault-format.md): header, AAD, multi-record wrapped-DEK block, two compartments, HKDF subkeys, 64 KiB padding.
  **Accept:** round-trips; tampering with any header byte fails authentication; wrong passphrase and corrupted file are indistinguishable in the error; padding always lands on a 64 KiB boundary; **the secret subkey has no derivation path reachable while online.**

- [ ] **P0.12 — KDF profiles and benchmark**
  *Deps: P0.11*
  Fast/Standard/Paranoid profiles, stored in the header, with an on-device timing benchmark offered before vault creation.
  **Accept:** all three profiles round-trip; benchmark reports realistic timings; Paranoid warns about iOS allocation failure.

- [ ] **P0.13 — Lock, unlock, save, load**
  *Deps: P0.12*
  Three save paths (File System Access, blob download, manual base64/QR); symmetric load; idle auto-lock; `Esc Esc` panic hide.
  **Accept:** at least one save path works on every device-matrix platform; **the manual base64 path is a complete, usable flow on iOS Safari**, not a stub.

- [ ] **P0.14 — Save integrity**
  *Deps: P0.13*
  Verify-after-save re-opening the written file before clearing the dirty flag; generational filenames; rollback detection via save counter.
  **Accept:** a deliberately truncated save is caught before the dirty flag clears; opening an older vault warns with both dates and counters.

- [ ] **P0.15 — Keyfile unlock**
  *Deps: P0.14*
  Wrapped-DEK method 2. Off by default, with an unmissable warning that a lost or byte-altered keyfile means permanent loss.
  **Accept:** unlocks with the correct keyfile; fails with a one-byte-altered keyfile; passphrase-only vaults are unaffected.

### Trust surface

- [ ] **P0.16 — Provenance panel and self-hash verifier**
  *Deps: P0.15*
  Every embedded library with version and upstream hash; the full CSP allowlist; build date; expected hash; drag-and-drop self-hash drop zone.
  **Accept:** listed hashes match `dependencies.md`; **the drop zone states plainly that self-verification is circular** and points to [verification.md](../02-security/verification.md).

- [ ] **P0.17 — Help framework**
  *Deps: P0.5*
  Three-depth content model; build-time compilation of `docs/00-overview/glossary.md` and `docs/03-guides/`; contextual `?`; inline glossary; offline search.
  **Accept:** all three depths render and switch; a documented feature missing a depth block produces a build warning; search works with no network.

- [ ] **P0.18 — CI**
  *Deps: P0.16, P0.17*
  GitHub Actions: build, test, `verify-vendor`, lint, **double-build hash comparison**, second-OS build comparison, bundle size report, release attestation.
  **Accept:** CI hash matches a local build; a nondeterministic change fails CI.

- [ ] **P0.19 — Device matrix pass**
  *Deps: P0.18*
  Full manual pass per [testing.md](testing.md) across all eight platforms.
  **Accept:** every platform passes the seven per-platform checks; results recorded in the PR packet. **iOS Safari is tested first, not last.**

---

## Phase 1 — Core wallet

*Blocked until Phase 0 is complete.*

- [ ] P1.1 Entropy Lab: dice, coins, cards, CSPRNG, mixing
- [ ] P1.2 Entropy Health Meter and Bias Analyzer
- [ ] P1.3 Seed Forge: BIP-39 generate, validate, passphrase, fingerprint
- [ ] P1.4 Derivation engine: BIP-32 core plus Bitcoin script types
- [ ] P1.5 Derivation: EVM and generic arbitrary-path mode
- [ ] P1.6 Registry CRUD: wallets, accounts, addresses
- [ ] P1.7 Notes, tags, and concealment levels
- [ ] P1.8 Device registry
- [ ] P1.9 Verification workflows: fingerprint, receive address, xpub, backup, passphrase
- [ ] P1.10 QR generation: addresses, SeedQR, Compact SeedQR, printable cards

## Phase 2 — Backup

- [ ] P2.1 SLIP-39 · P2.2 codex32 · P2.3 Seed XOR · P2.4 Shamir39 and raw SSS
- [ ] P2.5 Vault recovery shares · P2.6 BackupRecords and verify-your-shares
- [ ] P2.7 Backup Health dashboard · P2.8 Printable cards and hand-computation worksheets

## Phase 3 — Portfolio and online

- [ ] P3.1 Price aggregation · P3.2 Multi-currency and Frankfurter FX
- [ ] P3.3 Balance lookups · P3.4 Transactions and lots · P3.5 Cost basis engine
- [ ] P3.6 Dashboard and charts · P3.7 CSV import/export · P3.8 BIP-329 labels

## Phase 4 — Full coverage

- [ ] P4.1 Tier 1 remaining chains · P4.2 Custom coin registry · P4.3 Recovery Assistant
- [ ] P4.4 Verify Bench and file hasher · P4.5 Passphrase Studio · P4.6 BIP-85
- [ ] P4.7 Nostr NIP-06 · P4.8 BC-UR animated QR · P4.9 Descriptors and BIP-388 · P4.10 Reference

## Phase 5 — Advanced

- [ ] P5.1 Tier 2 chains · P5.2 Multisig quorum analysis · P5.3 Miniscript read-only
- [ ] P5.4 BLS/EIP-2333 · P5.5 PSBT viewer · P5.6 Silent payments (experimental)
- [ ] P5.7 Quantum readiness panel · P5.8 ERC-4337 records · P5.9 Border Wallets
- [ ] P5.10 Inheritance letter · P5.11 Camera scanner

---

## Changing this file

Adding, reordering, or removing items is a design decision. Small clarifications are fine in any PR. Anything that changes **what gets built or in what order** needs an issue or an ADR first — the ordering is the plan, and quietly rewriting it defeats the point of having one.
