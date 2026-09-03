# Testing

Cryptographic code fails silently. A wrong address looks exactly like a right one until funds are gone. Testing here is about catching quiet wrongness, not just crashes.

---

## Principle: independent vectors

Test vectors must come from an **independent source** — the relevant BIP/SLIP, a reference implementation, or a hardware wallet. "I checked it against my own implementation" is circular and proves nothing.

Required sources:

| Area | Vectors from |
|---|---|
| BIP-32 derivation | BIP-32 test vectors 1–5 |
| BIP-39 mnemonics | BIP-39 vectors (all languages) |
| BIP-49/84/86 | Respective BIPs |
| SLIP-39 | SLIP-39 vectors, incl. groups and passphrase extension |
| codex32 | BIP-93 vectors |
| SLIP-0010 (ed25519) | SLIP-0010 vectors |
| Per-chain addresses | Chain docs, reference libs, or a hardware wallet |
| Argon2id | RFC 9106 vectors |
| AES-GCM | NIST vectors |

---

## Test layers

### 1. Vectors — blocking

Every cryptographic function against official vectors. A failure blocks the build.

### 2. Round-trip

```
seed → mnemonic → seed                    identical
entropy → seed → entropy                  identical
address → decode → encode                 identical
vault → encrypt → decrypt → vault         identical
secret → split → combine (threshold)      identical
labels → BIP-329 export → import          equivalent
```

### 3. Negative

Wrong things must fail, and fail *loudly*:

- Invalid mnemonic checksum → rejected
- Wrong passphrase → authentication failure, no partial output
- Corrupted vault byte → authentication failure
- Tampered header (KDF params) → authentication failure
- Sub-threshold shares → no output, no partial information
- Invalid address checksum → rejected
- Mixed shares from different secrets → clear error identifying inconsistency

### 4. Property-based

- Any valid entropy → valid mnemonic → same entropy
- Any valid path → derivable keys
- Any T-of-N config → any T shares reconstruct, any T−1 reveal nothing
- Vault of any size → round-trips
- Padding always lands on a 64 KiB boundary

### 5. Regression

Every fixed bug gets a test. Particularly: **a vault written by any previous format version must still open.**

P0.11 additionally checks a real v1 round-trip, a zero-secret vault, every header byte as an authentication boundary, generic wrong-passphrase/corruption errors, 64 KiB compartment padding, fail-closed cold-health/CSP gating, canonical airgap mode detection, strict KDF-profile names, the shared crypto-layer profile table, the 64 MiB size refusal, and the absence of P0.13 session/save APIs.

P0.12 additionally runs real Fast, Standard, and Paranoid Argon2id profile round-trips, measures the three profiles sequentially with the same Argon2id call shape as vault derivation, rejects zero-duration measurements, proves concurrent benchmark requests do not overlap profile allocations, warns that Paranoid may fail to allocate on iOS, and verifies in Chromium/Firefox that the benchmark control is cold-only and disables immediately when the shared vault-health predicate fails.

P0.13's historical acceptance additionally verified mode signaling, cold-session zeroization, repeated re-encryption nonce rotation, opaque online secret ciphertext, idle/panic locking, runtime-airgap fail-closed behavior, `.cbx` blob download, manual Base64, and the then-current numbered QR-frame save/export flow. **Current P0.19 behavior is intentionally different under ADR-0026:** numbered/downloadable vault QR export was removed; `.cbx` is the only durable vault format, advanced Base64 is not a save, and animated QR is live device-to-device transfer only. Direct iOS local execution from Files remains a blocked portability target under [ADR-0010](adr/0010-ios-local-html-execution.md); Quick Look is not execution evidence.

P0.14's historical acceptance has functional Node coverage for degrade-silently browser-local save history, historical generational filename parsing, verify-after-save truncation/corruption detection, and rollback comparison. ADR-0026 keeps that compatibility coverage but changes current UX: canonical filenames have no counter, their older-copy signal is timestamp-only/advisory, File System Access is the only verified write path, download is an unverified canonical replacement, and Base64/live QR do not count as saves. Companion source-pattern tests prove the current warm-shell wiring.

P0.15 carries no browser-only (🌐) criteria, so its coverage is entirely functional Node execution against the real `src/cold/vault.js` (via the same `vm.runInNewContext` harness `test/vault.test.js` already uses for every other vault case, not pattern-matched): a keyfile vault unlocks with the exact original passphrase and keyfile; the identical vault fails closed, with the same generic authentication error as a wrong passphrase, when the keyfile is omitted or has a single bit flipped anywhere in it; a vault created without a keyfile round-trips exactly as before (byte-identical 64-byte method-1 record) and is unaffected by an erroneously supplied keyfile at open time; `openSession()`/`save()` preserve a method-2 vault's wrapped-DEK record across a re-save; an empty or oversized keyfile is rejected at creation; and the keyfile hint carries only the filename, never the keyfile's own bytes. `src/cold/main.js`'s keyfile toggle/warning/file-input wiring is additionally proven by a dedicated `verifyKeyfileUiAndRegressions()` case in `scripts/run-browser-harness.js` (`npm run test:browser`, Chromium and Firefox, against the real built `file://` artifact): a fresh load has the toggle unchecked, the keyfile input disabled, and the warning hidden; checking the toggle immediately reveals the warning, whose text plainly states that losing or byte-altering the keyfile causes permanent, unrecoverable loss; the input only becomes usable once the toggle is checked; and a real selected keyfile drives the actual create/unlock path rather than only appearing selected in the DOM. The same case also covers two regressions found in independent review: a stale, superseded `FileReader` completion (forced to resolve after a newer selection via a `FileReader`-wrapping init script) can never overwrite or clear the current selection, proven both in the status text and by the vault it creates only ever unlocking with the actually-committed bytes; and locking a session with a keyfile loaded clears the visible file-input value and status text in step with the zeroed bytes, after which re-selecting the same file registers as a new change and unlocks normally.

---

## Security tests — mandatory

These verify the claims the project makes. If one fails, the central promise is broken.

### Realm boundary

```
✓ Cold realm CSP contains connect-src 'none' at runtime
✓ fetch() inside the cold realm throws
✓ XMLHttpRequest inside the cold realm throws
✓ WebSocket inside the cold realm throws
✓ Warm shell cannot read cold realm DOM
✓ Warm shell cannot read cold realm variables
✓ No message type in the schema carries secret material
✓ Unknown message types are dropped, not forwarded
✓ Global message handler ignored after handshake
✓ App fails closed when the iframe cannot be created
```

### CSP

```
✓ Both policies present and parsed without warnings
✓ Canary fires correctly in both realms
✓ Argon2 WASM loads — proving 'wasm-unsafe-eval' is present
✓ PBKDF2 fallback is NOT silently active
✓ No allowlisted endpoint redirects off-allowlist
✓ Built script hash matches the meta tag
```

The KDF status must remain explicit: a missing `'wasm-unsafe-eval'` causes the Argon2 KAT to fail, and the visible PBKDF2 fallback must never be mistaken for the standard profile.

### Secret handling

```
✓ spellcheck="off" on every secret-bearing field
✓ No secret in localStorage, URL, page title, or session restore
✓ DOM cleared on lock
✓ DOM cleared on panic hide
✓ Clipboard auto-clear fires
✓ Secret compartment not decrypted while online
✓ No code path derives the secret subkey in Warm Mode
```

### Randomness

```
✓ getRandomValues used for all key material
✓ Math.random absent from security paths (static analysis)
✓ Hard failure — not degradation — when getRandomValues is absent
✓ Dice mixing genuinely combines sources
```

---

## v1 security-hardening and Bitcoin-wallet certification

The future v1 requirements are single-sourced in
[v1-security-wallet-contract.md](../01-spec/v1-security-wallet-contract.md)
and the SEC/WAL roadmap items. This section defines how those claims are tested
once implemented; it does not claim the current pre-WAL app can spend.

### Level 3 idle-state invariant

After every secret operation, tests inspect the cold session's owned state and
assert that the public wallet may remain usable while seed/private-key/
BIP-39-passphrase/secret-note plaintext plus DEK/KEK/secret-wrap key/REK are not
retained as session capabilities. Failure, panic, timeout and teardown exercise
the same invariant.

JavaScript zeroization is still best-effort; tests prove application ownership
of references/buffers is dropped, not that a garbage collector or OS never
copied bytes.

### Adversarial parsers

Deterministic seeded fuzz/property tests grow with the roadmap. For v1 they
cover at least vault v2/migration, protocol/public projection, descriptors,
raw Bitcoin transactions, PSBT v0/v2/Taproot fields, node/API wallet responses,
RBF/CPFP relationships and reorg/conflict state.

Required outcomes:

- bounded input size/count/resource use;
- no uncaught parser exception/hang from arbitrary bytes;
- no duplicate/unknown-field confusion;
- no partial authentication/authorization/signing;
- no silent format/sighash/script downgrade;
- mutation of reviewed transaction semantics invalidates approval.

### Differential Bitcoin tests

For every supported spend family, compare Coldbox against independent Bitcoin
implementations/vectors for:

- descriptor-derived scripts/addresses;
- transaction serialization and txid;
- input/output values and fees;
- transaction weight/vsize calculation;
- sighash;
- ECDSA/Schnorr signatures where deterministic comparison is appropriate;
- PSBT parse/update/finalization behavior.

A self-generated Coldbox fixture is regression evidence, not independent
correctness evidence.

### Wallet state-machine tests

Cover:

- address discovery/gap progression;
- UTXO ownership and spendability transitions;
- freeze/reserve/unreserve;
- source staleness/disagreement;
- mempool -> confirmed;
- replacement/conflict/drop;
- reorg rollback;
- exact-byte broadcast identity;
- RBF;
- CPFP;
- stale-vault/pending-spend reconciliation.

### Tor and transport-privacy certification

WAL.2/WAL.10/WAL.15 add transport-policy tests without weakening the cold
network prohibition.

Required cases include:

- an ordinary Edge/Brave/Chrome/Firefox session in `standard` mode makes no Tor
  claim;
- selecting a Tor-related preference in an ordinary browser never changes that
  browser into a Tor client and never produces a false "Tor active" status;
- Tor Browser/Tails can exercise the separately provided Tor environment while
  Coldbox avoids browser fingerprinting/probing as its source of truth;
- a reviewed CSP-pinned v3 `.onion` Bitcoin source succeeds only when the
  execution environment can route it through Tor;
- the same Tor-enforced onion configuration fails closed when Tor is
  unavailable, with captured requests proving no clearnet alias/provider
  fallback for sync, broadcast, or monitoring;
- changing from Tor-enforced onion to standard networking is an explicit visible
  user action, never an automatic retry/downgrade;
- the production warm CSP/provenance inventory contains each shipped onion host
  exactly and contains no `*.onion`/broad onion wildcard;
- cold-realm `connect-src 'none'`, fetch/XHR/WebSocket failure, and provider
  neutering remain unchanged in every transport mode.

### Physical wallet certification

WAL.15 adds safe test-network/regtest end-to-end wallet checks on the supported
execution matrix, including the supported Tor path and a standard-browser
negative/non-claim case. The professional REL.2 audit and REL.4 device/release
gate remain separate. Real-value mainnet spending is never required just to prove
a test.
## Browser harness — automated

The UI.5 shell checkpoint also asserts the ten approved warm/cold navigation
groups, roadmap-labelled unavailable controls, calm realm strips, and the
five-slot mobile rails in `test/ui.5-shared-shell.test.js` before the hosted
browser harness runs.

From P0.3a, Playwright drives headless Chromium and Firefox against the built file over `file://`. This is where every browser-observable acceptance criterion is verified.

```bash
npx playwright install chromium firefox  # once after npm ci
npm run test:browser
```

`npm ci` installs the pinned Playwright package but does not download browser binaries. Install the Chromium and Firefox binaries once with the documented command before running the harness. `npm run test:browser` refuses to download anything and exits non-zero with that command if either binary is missing. The browser binaries are test tooling only and never enter `build/coldbox.html`. The reusable assertions live in `test/browser/harness.js` and cover CSP reports, tampered-script rejection, frame isolation, network primitive failures, visible elements, and viewport sizes.

Covers: CSP enforcement and violation detection, post-build tamper rejection, cold realm instantiation, network primitives throwing inside the sandbox, parent-cannot-read-frame isolation, network/sealed-realm status states, responsive layout, and help rendering.

**What it does not cover: iOS Safari.** WebKit-on-Linux is not Safari-on-iOS, and the differences land precisely where this project is fragile — `file://` secure-context status, opaque-origin `crypto.subtle`, and blob download restrictions. A packet claiming iOS verification on the strength of harness results should be failed. See [ADR-0007](adr/0007-headless-browser-harness.md).

### Approved visual parity

The browser harness also becomes the execution layer for the approved desktop
and mobile comparison at UI.11. The screen inventory, exact-comparison method,
normalization rules and physical-mobile evidence are single-sourced in
[ui-parity.md](../01-spec/ui-parity.md); this document does not restate them.

The CI workflow separately runs **Approved UI reference secret scan** at the
exact checked-out commit. It copies both frozen `*.html.reference` files to a
temporary directory, runs the repository's `Invoke-ColdboxSecretScan`, and
fails unless findings and skipped candidate files are both zero. The immutable
reference directory is never scanned in place or modified by that job.

## Manual device matrix

`file://` behaviour varies enough between browsers that automated testing alone is insufficient. Required before every release.

An item-level review may use a maintainer-approved **DEFERRED** result only
under [ADR-0043](adr/0043-scoped-mobile-validation-deferral.md). That narrow
exception does not change this release requirement, does not establish mobile
support, and does not close the P0.19 device matrix.

| Platform | Browser | Must verify |
|---|---|---|
| Windows | Chrome/Edge | Full function, File System Access save |
| Windows | Firefox | Full function, blob download |
| macOS | Safari | Full function, secure-context behaviour |
| macOS | Chrome | Full function |
| Linux | Firefox | Full function |
| **iOS** | **Local execution target** | **Record PASS, BLOCKED, or UNSUPPORTED with exact device/iOS version; Quick Look is not a Safari execution pass. See [ADR-0010](adr/0010-ios-local-html-execution.md)** |
| Android | Chrome from Files | Cold realm instantiates; save path |
| Tails | Tor Browser | Full function |

Per platform, confirm:

1. Cold realm instantiates and private handshake completes; cold CSP/runtime/provider guards remain healthy
2. Capability panel accurately reports what is available
3. **Two named vaults** can each be created with new-phrase confirmation, visibly enter `UNLOCKED · NOT SAVED`, save, reload through the user-granted Vault Library, be selected unambiguously, and unlock with **one** phrase; locking/teardown zeroizes and an unsaved new vault is never implied durable
4. Argon2 loads (vault details shows Argon2id, not PBKDF2)
5. At least one canonical `.cbx` save path works end-to-end on that platform; File System Access verifies read-back where available, the filename is `coldbox--<id8>.cbx` with no user-chosen text or visible generation, and an unchanged saved vault cannot create another look-alike copy
6. **Live network status:** while Coldbox remains open, remove and restore external reachability. The warm-shell status transitions between online and no-reachability/unknown from active probes (not merely `navigator.onLine`), unknown fails online-safe, and the independent cold-realm status remains sealed. Record that the UI never claims this proves a physical airgap
7. Layout is usable at that screen size, including the Vault Library, create/confirm/save controls, and network/sealed-realm status
8. Where the platform exposes camera QR decode, live vault transfer is tested between two running Coldbox devices: sender must be unlocked from a durable/verified local vault, no QR-download artifact exists, a receiver that already has the vault in its granted library refuses the transfer, and a clean receiver verifies the encrypted transfer then still requires the normal passphrase and starts Not saved. If camera QR decode is unavailable, record **UNAVAILABLE** and confirm the `.cbx` fallback is explicit; do not infer support.

**iOS local execution is the highest-risk portability target.** A Files preview does not establish the sandboxed execution environment. Do not substitute Quick Look, a third-party viewer, localhost, a renamed file, or another execution context for Safari-from-Files without an accepted ADR. See [ADR-0010](adr/0010-ios-local-html-execution.md).

---

## Portfolio correctness

Cost basis bugs are quiet and compounding.

```
✓ Transfer between own wallets is NOT a disposal
✓ Original acquisition date survives a transfer
✓ FIFO/LIFO/HIFO/average/spec-ID each produce known-correct results
✓ Fees included in cost basis
✓ Multi-currency: stored in transacted currency, converted at display
✓ Changing reporting currency does not alter stored data
✓ Historical FX uses the transaction date, not today
✓ Hidden items excluded from totals AND rows consistently
```

That first line is the most common bug in portfolio software and silently corrupts every downstream figure.

---

## Running

Current committed commands:

```bash
npm run verify-vendor
npm run lint
npm run check-docs
npm test
npm run build
npm run test:browser
```

Roadmap items may add dedicated fuzz/security/wallet commands later; when they
do, this section and `package.json` change in the same PR. Documentation must
not advertise a script that does not exist.

## CI

Every PR: full automated suite, `verify-vendor`, forbidden-construct lint, reproducible build check (build twice, compare), bundle size report.

Every tag: the above, plus a build on a second OS with hash comparison, plus publication of the build attestation.

## Coverage expectations

Not a percentage target — coverage percentage is a poor proxy here. Instead:

- **100% of cryptographic functions** have vector tests
- **100% of security claims** in [threat-model.md](../02-security/threat-model.md) have a corresponding test
- **100% of chains** have address vectors — a chain without them is not merged
- Every fixed bug has a regression test
