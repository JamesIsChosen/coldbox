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

P0.11 additionally checks a real v1 round-trip, a zero-secret vault, every header byte as an authentication boundary, generic wrong-passphrase/corruption errors, and 64 KiB compartment padding.

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

## Browser harness — automated

From P0.3a, Playwright drives headless Chromium and Firefox against the built file over `file://`. This is where every browser-observable acceptance criterion is verified.

```bash
npx playwright install chromium firefox  # once after npm ci
npm run test:browser
```

`npm ci` installs the pinned Playwright package but does not download browser binaries. Install the Chromium and Firefox binaries once with the documented command before running the harness. `npm run test:browser` refuses to download anything and exits non-zero with that command if either binary is missing. The browser binaries are test tooling only and never enter `build/coldbox.html`. The reusable assertions live in `test/browser/harness.js` and cover CSP reports, tampered-script rejection, frame isolation, network primitive failures, visible elements, and viewport sizes.

Covers: CSP enforcement and violation detection, post-build tamper rejection, cold realm instantiation, network primitives throwing inside the sandbox, parent-cannot-read-frame isolation, airgap banner states, responsive layout, and help rendering.

**What it does not cover: iOS Safari.** WebKit-on-Linux is not Safari-on-iOS, and the differences land precisely where this project is fragile — `file://` secure-context status, opaque-origin `crypto.subtle`, and blob download restrictions. A packet claiming iOS verification on the strength of harness results should be failed. See [ADR-0007](adr/0007-headless-browser-harness.md).

## Manual device matrix

`file://` behaviour varies enough between browsers that automated testing alone is insufficient. Required before every release.

| Platform | Browser | Must verify |
|---|---|---|
| Windows | Chrome/Edge | Full function, File System Access save |
| Windows | Firefox | Full function, blob download |
| macOS | Safari | Full function, secure-context behaviour |
| macOS | Chrome | Full function |
| Linux | Firefox | Full function |
| **iOS** | **Safari from Files** | **Cold realm instantiates; manual save path; camera unavailable handled** |
| Android | Chrome from Files | Cold realm instantiates; save path |
| Tails | Tor Browser | Full function |

Per platform, confirm:

1. Cold realm instantiates and handshake completes
2. Capability panel accurately reports what's available
3. Vault create → save → reload → open round-trips
4. Argon2 loads (check vault details shows Argon2id, not PBKDF2)
5. At least one save path works
6. Airgap banner reflects actual network state
7. Layout usable at that screen size

**iOS Safari is the highest-risk platform.** Opaque-origin secure-context behaviour, blob download restrictions, and camera access all differ there. Test it first, not last.

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

```bash
npm test                  # all automated
npm run test:vectors
npm run test:security
npm run test:portfolio
npm run test:matrix       # interactive manual prompts
```

## CI

Every PR: full automated suite, `verify-vendor`, forbidden-construct lint, reproducible build check (build twice, compare), bundle size report.

Every tag: the above, plus a build on a second OS with hash comparison, plus publication of the build attestation.

## Coverage expectations

Not a percentage target — coverage percentage is a poor proxy here. Instead:

- **100% of cryptographic functions** have vector tests
- **100% of security claims** in [threat-model.md](../02-security/threat-model.md) have a corresponding test
- **100% of chains** have address vectors — a chain without them is not merged
- Every fixed bug has a regression test
