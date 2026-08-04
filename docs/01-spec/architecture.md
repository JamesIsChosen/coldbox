# Architecture — the two realms

Detail on the split introduced in [SPEC.md §2](SPEC.md). Decision rationale in [ADR-0001](../05-development/adr/0001-two-realm-architecture.md).

---

## The constraint that forces this design

`Content-Security-Policy: connect-src 'none'` is what makes secret leakage impossible rather than merely unlikely. It removes `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `sendBeacon` at the browser level — not disabled, not monkey-patched, absent.

**CSP can only be tightened at runtime, never relaxed.** A document that declares `connect-src 'none'` can never make a network request. A document that can fetch a price has, by definition, a path out for anything else in its memory.

Both requirements are legitimate. The resolution is two documents.

---

## The split

### Warm shell — outer document

CSP permits `connect-src` to a pinned allowlist of price and blockchain hosts.

Owns: UI chrome and routing, live prices, balance lookups, portfolio engine, public registry views, help content, file hashing of non-secret files.

**Never receives a secret.** No seed, no private key, no decrypted secret compartment, no vault passphrase.

### Cold realm — sandboxed iframe

```html
<iframe sandbox="allow-scripts allow-downloads" srcdoc="…">
```

Its own CSP: `default-src 'none'; connect-src 'none'; script-src 'sha256-…' 'wasm-unsafe-eval'`.

Owns: vault decryption and encryption, passphrase entry, seed generation and validation, all key derivation, SLIP-39 / codex32 / Shamir / Seed XOR, BIP-85, recovery search, secret QR generation.

---

## Why this is a real boundary

**1. The cold realm's CSP is its own document's policy.**
Even if its code were malicious, its `connect-src 'none'` policy blocks network requests. Native browser signals can differ, so the P0.6 bootstrap requires the three documented probes to produce a thrown result while the harness independently verifies the exact `connect-src` policy violation. P0.8 later adds the broader runtime guard for defense in depth.

**2. CSP inheritance works in our favour.**
A `srcdoc` iframe inherits its parent's CSP, and multiple policies combine **restrictively**: a request must satisfy every applicable policy. The cold realm's `connect-src 'none'` applies on top of the warm shell's allowlist, and the intersection is `'none'`. **The child cannot be loosened by the parent.**

**3. `sandbox` without `allow-same-origin` yields an opaque origin.**
The warm shell cannot read the cold realm's DOM, variables, or keystrokes. A passphrase typed into the cold realm is not reachable by the network-capable code around it.

**4. The message schema is a whitelist.**
Only typed, public-safe payloads cross. There is no message type capable of carrying a secret — not disabled, not filtered at runtime, simply not defined.

### What this buys

You can run the BIP-39 generator, the derivation engine, and the SLIP-39 splitter on an internet-connected laptop, and the secrets involved cannot reach the network. That is materially stronger than "we promise we don't upload it," and it's what makes running the tools online safe rather than reckless.

---

## Channel setup

An opaque origin means `postMessage` must use `targetOrigin: '*'`, and the receiver cannot authenticate the sender by origin. So:

1. Warm shell creates the cold realm iframe with `srcdoc`.
2. Cold realm signals readiness on the global `message` handler.
3. Warm shell creates a `MessageChannel` and transfers `port2` in a single handshake message.
4. All subsequent traffic runs over that private port.
5. **Both sides then ignore the global `message` handler entirely.** Anything arriving there after handshake is discarded and logged as anomalous.

This means an injected frame or a hostile opener cannot inject messages after startup — it would need the transferred port, which it never had.

---

## Message schema

Every message: `{ id, type, payload }`. `id` correlates request and response. `type` must match the whitelist. Unknown types are dropped, not forwarded.

### Warm → Cold

| Type | Payload | Notes |
|---|---|---|
| `vault.open` | `{ bytes }` | Ciphertext only. The passphrase is entered inside the cold realm and never crosses |
| `vault.saveRequest` | `{ }` | Cold realm returns ciphertext |
| `vault.lock` | `{ }` | |
| `mode.set` | `{ online: bool }` | Cold realm decides what to permit |
| `derive.request` | `{ accountRef, scriptType, range }` | References a wallet by id; never carries key material |
| `publicData.request` | `{ collections[] }` | Ask for public compartment contents |
| `ui.navigate` | `{ section }` | |

### Cold → Warm

| Type | Payload | Notes |
|---|---|---|
| `ready` | `{ capabilities }` | Handshake |
| `vault.opened` | `{ publicCompartment }` | **Public data only.** Never the secret compartment |
| `vault.bytes` | `{ bytes }` | Encrypted blob for the warm shell to save |
| `derive.result` | `{ addresses[], xpub, fingerprint }` | Public values only |
| `status` | `{ locked, mode, warnings[] }` | |
| `error` | `{ code, message }` | Never includes secret material in the message |

### Schema invariants — enforced by test

1. No Cold → Warm type carries a mnemonic, private key, extended private key, passphrase, or secret-compartment plaintext.
2. Payloads are validated against the schema on receipt. Extra fields are stripped, not passed through.
3. Adding a message type requires review. This is written in [CONTRIBUTING.md](../../CONTRIBUTING.md) because it's the one change that could quietly dismantle the model.

The `publicData.request.collections` allowlist is the public projection of [data-model.md](data-model.md): `seeds`, `wallets`, `accounts`, `addresses`, `notes`, `devices`, `transactions`, `lots`, `disposals`, `basisAllocations`, `prices`, `backups`, `contacts`, and `auditLog`. `settings` is not a vault collection and is rejected rather than silently accepted.

The public projection deliberately contains no free-form text fields. It permits only structurally typed public values: UUIDs, eight-hex-digit fingerprints, validated extended public keys, validated public addresses, and numeric accounting values. Any string-bearing field outside that closed projection, including labels, notes, names, tags, locations, and unknown nested records, is rejected rather than forwarded. Recognizable extended-private-key forms, WIF forms, mnemonic-shaped phrases, and raw 32-byte private-key hex are also rejected. This is the only honest way to enforce the literal no-passphrase/no-secret-plaintext invariant; arbitrary prose cannot be distinguished from a secret by regex. All non-vault messages have a 4 MiB aggregate sanitized-payload limit, and encrypted `vault.open`/`vault.bytes` payloads have a 64 MiB byte limit.

---

## Capability assumptions inside the sandbox

**Assume `crypto.subtle` is absent.** An opaque origin may not qualify as a secure context, so WebCrypto may be undefined. The cold realm **defaults to pure-JS `@noble` implementations** and uses WebCrypto only after an affirmative known-answer test. Pure-JS AES-GCM runs at a few MB/s — irrelevant for vault-sized payloads.

**`crypto.getRandomValues` is required.** Not part of `subtle`, available in opaque origins. If it's missing, the app hard-fails. There is no acceptable fallback, and `Math.random` is never substituted.

**Argon2id is WASM**, unaffected by secure-context status, but needs `'wasm-unsafe-eval'` in the CSP — without it Chrome blocks `WebAssembly.instantiate` and every vault silently drops to the weaker PBKDF2 path.

**Workers are optional.** `blob:` workers are unreliable under `file://` on iOS. Long operations use a worker when available and chunked main-thread execution yielding every ~16 ms when not.

---

## Failure modes

| Failure | Response |
|---|---|
| Cold realm iframe won't instantiate | **Hard fail.** Explain, refuse to open a vault. No single-realm fallback |
| Handshake times out | Hard fail with diagnostics |
| CSP canary fails (the exact policy violation is not observed) | Full lockdown, refuse vault operations |
| CSP canary passes (the exact policy violation is observed) | Continue only after the matching cold capability and private handshake pass |
| Cold runtime network guard cannot be installed | Full lockdown, refuse vault operations |
| Cold runtime network violation is reported | Full lockdown, refuse vault operations and surface the airgap warning |
| `getRandomValues` missing | Hard fail; dice entropy still available for offline use |
| `crypto.subtle` missing | Silent, expected. Use pure-JS, report in capability panel |
| Workers unavailable | Silent. Chunked main-thread |
| Message on global handler post-handshake | Discard, log, surface a visible warning |

**The governing principle is fail closed.** If the guarantee cannot be established, the app refuses to handle secrets rather than proceeding without it. A tool that silently degrades from "cannot leak" to "probably won't leak" is worse than one that stops, because the user's behaviour doesn't change to match.

---

## Mode determination

| | Cold Mode | Warm Mode |
|---|---|---|
| Trigger | No network detected | Network detected |
| Public compartment | Read/write | Read/write (or sealed under `strict`) |
| Secret compartment | Available | **Never decrypted** |
| Tools | All | All — inside the cold realm |
| Vault save | Full | Public re-encrypted; secret copied as opaque ciphertext |

Detection uses `navigator.onLine`, `navigator.connection`, and the CSP canary.

**`navigator.onLine` is not reliable** — it reports whether a network interface exists, not whether the internet is reachable. It catches Wi-Fi-left-on; a blackholed link can read as offline. Mode detection is a convenience feature. The actual guarantee is the cold realm's CSP, which does not depend on detection being correct.

---

## Known weaknesses

**Parent-rendered phishing.** The warm shell renders the cold realm, so a modified build could draw a fake passphrase prompt outside the sandbox. Mitigated by the distinctive cold-realm border and by documenting that passphrase entry always occurs inside it — but ultimately this is why reproducible builds and hash verification matter. A verified build cannot do this; an unverified one can do anything.

**Shared rendering surface.** Both realms draw to the same screen. A compromised warm shell can't read the cold realm's memory, but it controls surrounding layout. It cannot read what you type into the sandbox.

**Nothing survives OS compromise.** A keylogger reads keystrokes before any of this applies.
