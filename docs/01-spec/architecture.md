# Architecture — the two realms

Detail on the split introduced in [SPEC.md §2](SPEC.md). Original decision rationale is in [ADR-0001](../05-development/adr/0001-two-realm-architecture.md); the later cold-printing permission amendment is in [ADR-0035](../05-development/adr/0035-cold-printing-allow-modals.md).
---

## The constraint that forces this design

`Content-Security-Policy: connect-src 'none'` is what makes secret leakage impossible rather than merely unlikely. It removes `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `sendBeacon` at the browser level — not disabled, not monkey-patched, absent.

**CSP can only be tightened at runtime, never relaxed.** A document that declares `connect-src 'none'` can never make a network request. A document that can fetch a price has, by definition, a path out for anything else in its memory.

Both requirements are legitimate. The resolution is two documents.

---

## The split

### Warm shell — outer document

CSP permits `connect-src` to a pinned allowlist of price and blockchain hosts.

Owns: UI chrome and routing, **active external-reachability monitoring**, live prices, balance lookups, portfolio engine, public registry views, Vault Library/file handles and public filenames, canonical save/update orchestration, live encrypted vault-transfer QR rendering/camera collection, help content, file hashing of non-secret files. The live-transfer scanner handles only encrypted `.cbx` bytes and public transfer metadata.

**Never receives a secret.** No seed, no private key, no decrypted secret compartment, no vault passphrase.

### Cold realm — sandboxed iframe

```html
<iframe sandbox="allow-scripts allow-downloads allow-modals" srcdoc="…">
```

Its own CSP: `default-src 'none'; connect-src 'none'; script-src 'sha256-…' 'wasm-unsafe-eval'`.

Owns: vault decryption and encryption, passphrase entry, seed generation and validation, all key derivation, SLIP-39 / codex32 / Shamir / Seed XOR, BIP-85, recovery search, secret QR generation.

---

## Why this is a real boundary

**1. The cold realm's CSP is its own document's policy.**
Even if its code were malicious, its `connect-src 'none'` policy blocks network requests. Native browser signals can differ, so the P0.6 bootstrap requires the three documented probes to produce a thrown result while the harness independently verifies the exact `connect-src` policy violation. P0.8 later adds the broader runtime guard for defense in depth.

**2. CSP inheritance works in our favour.**
A `srcdoc` iframe inherits its parent's CSP, and multiple policies combine **restrictively**: a request must satisfy every applicable policy. The cold realm's `connect-src 'none'` applies on top of the warm shell's allowlist, and the intersection is `'none'`. **The child cannot be loosened by the parent.**

`allow-modals` is granted only so the cold-only print workflow can request the browser print dialog for SeedQR cards.

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
| `vault.create.prepare` | `{}` | Strict payload-free gate: warm has a non-secret public vault name ready; the name itself never crosses into cold |
| `vault.saveRequest` | `{ }` | Cold realm returns ciphertext |
| `vault.lock` | `{ }` | |
| `panic.hide` | `{ }` | Locks the cold session and asks the warm shell to conceal the app |
| `mode.set` | `{ online: bool }` | Conservative warm-shell reachability classification. `true` means reachable **or checking/unknown**; `false` is sent only after the active offline threshold is met |
| `derive.request` | `{ accountRef, scriptType, range }` | References a wallet by id; never carries key material |
| `publicData.request` | `{ collections[] }` | Ask for public compartment contents |
| `publicData.replace` | `{ publicCompartment }` | Replace only the schema-validated public projection after a warm registry mutation; the authenticated Vault ID must remain unchanged |
| `concealment.reveal` | `{}` | Ask the cold realm to show its re-authentication control; no phrase crosses the channel |
| `ui.navigate` | `{ section }` | |
| `address.verifyRequest` | `{ addressId, accountRef, index, candidate }` | `candidate` is a **validated public address string**, which the existing projection already permits. Asks the cold realm to re-derive and compare |
| `backup.verifyRequest` | `{ backupId }` | References a public BackupRecord. Share words and reconstructed bytes are entered and processed only inside the cold realm |

### Cold → Warm

| Type | Payload | Notes |
|---|---|---|
| `ready` | `{ capabilities }` | Handshake |
| `vault.opened` | `{ publicCompartment }` | **Public data only.** Never the secret compartment |
| `vault.lockRequest` | `{}` | Cold UI requests the normal warm-shell lock gate; carries no secret or free-form data |
| `vault.bytes` | `{ bytes }` | Encrypted blob for the warm shell to save |
| `derive.result` | `{ addresses[], xpub, fingerprint }` | Public values only |
| `publicData.updated` | `{ publicCompartment }` | Acknowledges a successful public registry replacement; schema-validated public records only |
| `concealment.revealed` | `{ revealed: bool }` | Reports only whether the cold realm re-authenticated the session; no phrase or note body crosses |
| `secretData.updated` | `{ dirty: true }` | Signals that cold-local secret notes changed; carries no secret plaintext |
| `vault.dirty` | `{ dirty: true }` | Signals that cold-local recovery-share settings changed; carries no share material or secret plaintext |
| `status` | `{ locked, mode, warnings[] }` | |
| `address.verifyResult` | `{ addressId, outcome, divergenceIndex, verificationState, verifiedAt, xpubFingerprint }` | `outcome` and `verificationState` are **enum codes, never prose** — see below. `divergenceIndex` is an integer |
| `backup.verifyResult` | `{ backupId, outcome, verifiedAt? }` | `outcome` is one of `verified`, `invalid`, `unsupported`, `no-record`, or `vault-locked`; only `verified` carries a canonical public timestamp |
| `error` | `{ code, message }` | Never includes secret material in the message |
| `panic.hide` | `{ }` | Cold realm requests the same concealment after `Esc Esc` inside the frame |

### Schema invariants — enforced by test

1. No Cold → Warm type carries a mnemonic, private key, extended private key, passphrase, share words, reconstructed bytes, or secret-compartment plaintext.
2. Payloads are validated against the schema on receipt. Extra fields are stripped, not passed through.
3. Backup verification returns only a closed outcome code and, on success, a canonical timestamp. It never returns a candidate secret or an explanation string.
4. Public BackupRecord text fields use the share-material guard defined in [ADR-0041](../05-development/adr/0041-backup-record-verification-boundary.md); supported SLIP-39, codex32, Shamir39, raw SSS, and mnemonic-shaped share text is rejected before either projection is accepted.
5. Adding a message type requires review. This is written in [CONTRIBUTING.md](../../CONTRIBUTING.md) because it's the one change that could quietly dismantle the model.

The `publicData.request.collections` allowlist is the public projection of [data-model.md](data-model.md): `seeds`, `wallets`, `accounts`, `addresses`, `notes`, `devices`, `transactions`, `lots`, `disposals`, `basisAllocations`, `prices`, `backups`, `contacts`, and `auditLog`. `settings` is not a vault collection and is rejected rather than silently accepted.

### Why the verification result carries enum codes rather than a message

`address.verifyResult` reports `outcome` as one of a closed set — `match`, `mismatch`, `unrecognised-format`, `checksum-invalid`, `no-record`, `different-account`, `vault-locked` — and never a human-readable explanation. The warm shell maps the code to display text on its own side.

`backup.verifyResult` follows the same rule. `verified` means the selected cold reconstruction workflow accepted the supplied threshold set; `invalid`, `unsupported`, `no-record`, and `vault-locked` leave the BackupRecord incomplete. The timestamp is generated inside the cold realm and is the only completion evidence returned to the warm register.

This is not a style preference. The schema invariant below permits only structurally typed public values precisely because **arbitrary prose cannot be distinguished from a secret by inspection**. A `reason` string on a Cold → Warm message would be exactly the free-form text field the projection exists to exclude, and it would be an unusually attractive one, since it originates in the realm that holds the secrets. The same reasoning already governs `error`, whose `message` is constrained for the same purpose.

`different-account` deserves its own code rather than being folded into `match`: an address that matches a record in a *different* account than expected is a real and confusing situation, and collapsing it into a plain match would hide it.

The public projection deliberately contains no unbounded free-form text fields. Registry records use a closed, collection-specific schema: bounded labels, paths, notes, tags, and status metadata are accepted only after secret-shaped content and unknown text fields are rejected; UUIDs, fingerprints, extended public keys, addresses, numbers, booleans, and balance timestamps use typed validators. The new Vault ID uses the existing UUID-safe `publicCompartment.id` field. **Vault names do not cross cold → warm**: they are explicit public warm-shell/filename metadata, because arbitrary names could contain a passphrase or other secret if a user typed one by mistake. Recognizable extended-private-key forms, WIF forms, mnemonic-shaped phrases, and raw 32-byte private-key hex are also rejected. This is the only honest way to enforce the literal no-passphrase/no-secret-plaintext invariant; arbitrary prose cannot be distinguished from a secret by regex. All non-vault messages have a 4 MiB aggregate sanitized-payload limit, and encrypted `vault.open`/`vault.bytes` payloads have a 64 MiB byte limit. `publicData.replace` is the only write path: it is accepted on the private channel only while a cold session is unlocked, and the cold session rejects a Vault ID change before re-encrypting the public plaintext.

BackupRecord labels, locations, custodians, and notes are still public metadata, not share storage. Their shared validator additionally rejects recognizable supported share encodings, including both standard SLIP-39 lengths; this is a conservative boundary filter, not cold checksum validation. `groupConfig` is also schema-validated as realizable: an explicit group threshold cannot exceed the number of configured groups.

`publicData.replace` remains a warm-origin write even while the vault is unlocked. Its address provenance fields are reconciled against the cold session's existing authenticated projection: a warm replacement may carry forward an existing `cold-verified` or `cold-verified-stale` record, and may record the xpub-change staleness transition, but it cannot elevate an unverified, unverifiable, or stale record to `cold-verified`, or rewrite the timestamp/xpub evidence. Only a future cold-owned re-derivation transition may create a new `cold-verified` state.

BackupRecord completion follows the same ownership rule. A warm registry mutation may create or edit public metadata, but it cannot set or clear `lastVerifiedAt`. The cold session preserves an authenticated completion timestamp when the record's subject, method, threshold, and group configuration are unchanged; changing those identity fields clears the timestamp. A successful `backup.verifyRequest` reconstructs the selected supported format inside the cold realm, updates that cold-owned public field, and returns only the result code and timestamp.

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

| | Cold Mode | Warm Mode / online-safe |
|---|---|---|
| Trigger | All warm-shell reachability probes fail for consecutive rounds | Any probe succeeds, or status is checking/unknown/stale |
| Public compartment | Read/write | Read/write (or sealed under `strict`) |
| Secret compartment | Available | **Never decrypted** |
| Tools | All | All — inside the cold realm |
| Vault save | Full offline | Public re-encrypted; secret nonce and ciphertext copied as opaque bytes |

The **warm shell**, not the cold realm, owns active reachability monitoring. Browser interface signals (`navigator.onLine`, `navigator.connection`, `online`/`offline`, focus/change events) trigger checks but are not trusted as the verdict. Small content-free fetches to two already-allowlisted providers establish real outbound reachability: any success flips to online immediately; only consecutive all-endpoint failures permit `mode.set { online:false }`. Checking, stale, contradictory, timeout, and monitor errors are all online-safe. See [ADR-0024](../05-development/adr/0024-warm-reachability-monitor.md).

The cold realm never probes. Its `connect-src 'none'`, runtime network-primitive/provider neutering, and private channel remain unchanged. After the typed `mode.set` message is validated on the private channel, cold main records that Boolean on its document root; the vault layer consumes **only that recorded value** as its network-mode authority and does not consult `navigator.onLine`, `navigator.connection`, or the cold airgap snapshot independently. Missing or invalid recorded state is `unknown` and remains online-safe/fail-closed. P0.13's conservative mode rule therefore still holds: an online-safe unlock never derives `cbx/secret/v1`; a full unlock is available only after warm reports the offline threshold. A transition back to online immediately clears the active cold session.

**Reachability is not physical-airgap proof.** A firewall can block the chosen probe hosts while another route exists; a captive portal or virtual adapter can confuse browser signals. The UI says **no external reachability detected**, never "physical airgap confirmed." The cold CSP is the secret-exfiltration guarantee; a physically disconnected/amnesic machine is the stronger environmental posture.

---

## Known weaknesses

**Parent-rendered phishing.** The warm shell renders the cold realm, so a modified build could draw a fake passphrase prompt outside the sandbox. Mitigated by the distinctive cold-realm border and by documenting that passphrase entry always occurs inside it — but ultimately this is why reproducible builds and hash verification matter. A verified build cannot do this; an unverified one can do anything.

**Shared rendering surface.** Both realms draw to the same screen. A compromised warm shell can't read the cold realm's memory, but it controls surrounding layout. It cannot read what you type into the sandbox.

**Nothing survives OS compromise.** A keylogger reads keystrokes before any of this applies.
