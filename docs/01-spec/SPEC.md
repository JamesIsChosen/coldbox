# Coldbox — Specification v0.5

**A single-file, portable crypto toolkit, wallet registry, and portfolio manager.**
**Secrets are cryptographically incapable of reaching the network. Everything else works online.**

Status: Draft for review. Phase 1 is in progress; Phase 0 device-matrix sign-off remains human-required.
Date: 2026-08-09 · Supersedes v0.4 · *"Coldbox" is a working name — see §22*

---

## 1. What this is

One HTML file you copy to a USB stick, a phone, or a laptop, open in a supported browser/file-launch context, and use with no install, no server, and no runtime. It replaces the ~15 separate tools in this folder, adds an encrypted registry of your wallets and addresses, and adds a portfolio manager with live prices and on-chain balance lookups. Direct local execution from iOS Files is not currently claimed; see [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md).

### 1.1 Design axioms

1. **Runs from one local file on supported platforms.** Open the byte-stable HTML artifact directly in a supported browser/file-launch context, with no build step and no localhost server. Direct local execution from Files on iOS is not currently claimed: Safari is not a documented or demonstrated handler for the Coldbox HTML artifact, and Quick Look is not an equivalent execution context. iOS remains a portability target under [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md).
2. **Secrets cannot leak, by construction.** All secret handling happens inside a sandboxed realm whose Content Security Policy forbids every form of network access. This is a browser-enforced boundary, not a promise.
3. **Online is a supported mode, not a failure state.** Tools work online. Prices and balances require online. Only *secrets* are gated.
4. **The HTML file never changes.** Byte-stable, so its SHA-256 verifies against a published hash forever. Your data lives in a separate encrypted file.
5. **Everything is auditable.** One file, readable source, pinned dependencies with upstream hashes listed in-app.

### 1.2 What it replaces

| Current tool | Absorbed as |
|---|---|
| Ian Coleman BIP39 standalone (0.5.4–0.5.6) | Seed Forge + Derivation Engine |
| Ian Coleman SLIP39 – Mnemonic Shares | Backup Lab → SLIP-39 |
| Ian Coleman Shamir39 – Mnemonic Code Splitter | Backup Lab → Shamir39 |
| Ian Coleman Shamir Secret Sharing Scheme | Backup Lab → Raw SSS |
| Ian Coleman Bitcoin Key Compression Tool | Verify Bench → Key Converter |
| Ian Coleman Entropy Bias | Entropy Lab → Bias Analyzer |
| Ian Coleman Multisig | Derivation Engine → Multisig / descriptors (Phase 4) |
| Ian Coleman BLS / EIP2333 | Derivation Engine → BLS (Phase 4) |
| BIP39 Recoverer standalone | Recovery Assistant |
| Seed Tool (bitcoiner.guide) | Entropy Lab + BIP-85 + SeedQR + airgap guard pattern |
| PassGuardian | Backup Lab → Raw SSS |
| Diceware Passphrase + Wordlist | Passphrase Studio |
| EFF wordlists (large, short 2.0) | Embedded in Passphrase Studio |
| PBKDF2 SHA-512 Online Generator | Verify Bench → KDF Calculator |
| QuickHash GUI (3 platform binaries) | Verify Bench → File Hasher |
| SeedQR PDF templates | QR Studio → printable SeedQR cards |
| BIP39 wordlist PDF | Reference → searchable wordlist |
| bips-master (197 BIPs) | Reference → curated excerpts of the ~10 that matter |
| secrets.js | Vendored into Backup Lab |
| Web3ToolKit URL | Dropped (online-only, out of scope) |
| *(new)* | Portfolio, Prices, Balances, Notes |

### 1.3 Explicit non-goals

- **No transaction building, signing, or broadcasting.** Signing turns a calculator into a target. PSBT *viewing* is a Phase 4 candidate; signing is not.
  **Reaffirmed 2026-08 by [ADR-0019](../05-development/adr/0019-no-transaction-workbench.md)**, which worked up a proposal to permit unsigned construction, opaque relay, and ERC-7730 clear signing — and rejected all three. Read that ADR before re-proposing any of them; the short version is that the three were justifying each other rather than standing on their own, and that hardware wallets already perform clear signing with provenance Coldbox structurally cannot match. Keeping all three prohibited leaves three lines of defence against scope drift toward a hot wallet, rather than one.
- **No Monero.** Different seed scheme entirely (25-word, dual keys). Bolting it on invites subtle, expensive errors.
- **No custodial/exchange API integration.** Read-only exchange keys still get stolen and still leak your entire position. Exchange holdings are manual entries.
- **No tax filing output.** The portfolio computes cost basis and realized gains; it does not produce tax forms and does not give tax advice.
- **Not a hardware wallet replacement — a companion to one.** It holds no keys and signs nothing. See §14a.
- **Not audited.** It will say so, in the app, permanently.
- **No hosted version.** Download and verify, or don't use it. See §20.3.

---

## 2. Architecture: two realms

### 2.1 The problem this solves

You asked for two things that are, in a single document, mutually exclusive. `Content-Security-Policy: connect-src 'none'` is what makes secret leakage impossible — and **CSP can only be tightened at runtime, never relaxed.** A document that forbids all network access can never fetch a price. A document that can fetch prices has, by definition, a path out.

The resolution is not to compromise on either. It is to use two documents.

### 2.2 The split

**Warm shell** — the outer document. CSP permits `connect-src` to a pinned allowlist of price and blockchain API hosts. Contains the UI chrome, live prices, balance lookups, the portfolio engine, and public registry views. **Never receives a secret.**

**Cold realm** — a sandboxed iframe: `<iframe sandbox="allow-scripts allow-downloads allow-modals" srcdoc="…">`, carrying its own CSP with `default-src 'none'; connect-src 'none'`. Contains vault decryption, seeds, private keys, all derivation, SLIP-39/Shamir, BIP-85, recovery search, and future secret QR tooling such as SeedQR. `allow-modals` exists so the cold-only printable SeedQR flow can invoke the browser print dialog; `allow-same-origin` remains absent. Vault live transfer is different: warm renders only already-encrypted `.cbx` bytes under §8.5/ADR-0026.

Why this is strong rather than merely tidy:

- The cold realm's CSP is **its own document's policy**. Even if its code were malicious or compromised, `connect-src 'none'` means there is no `fetch`, no `XHR`, no WebSocket, no image beacon, no navigation-based exfiltration.
- `sandbox` without `allow-same-origin` gives the iframe an **opaque origin**. The warm shell cannot read its DOM, its variables, or its keystrokes. The passphrase you type into the cold realm is not reachable by the network-capable code around it.
- Communication is `postMessage` only, over a **strict whitelist message schema**. Only typed, public-safe payloads cross: addresses, xpubs, fingerprints, labels, public notes. There is no message type that carries a seed, a private key, or a decrypted secret compartment.

**Two implementation details this depends on:**

*CSP inheritance works in our favour.* A `srcdoc` iframe inherits its parent's CSP, and multiple policies combine **restrictively** — a request must satisfy all of them. So the cold realm's own `connect-src 'none'` applies on top of the warm shell's allowlist, and the intersection is `'none'`. The child cannot be loosened by the parent.

*Channel setup must not rely on origin checks.* An opaque origin means `postMessage` must use `targetOrigin: '*'`, and the receiver cannot verify the sender by origin. So at boot the warm shell creates a `MessageChannel` and transfers one port into the cold realm in a single handshake message; all subsequent traffic runs over that private port. Anything arriving on the global `message` handler after handshake is ignored.

*Assume WebCrypto is absent in the cold realm.* An opaque origin may not qualify as a secure context, so `crypto.subtle` may be `undefined` inside the sandbox. The cold realm therefore **defaults to the pure-JS `@noble` implementations** and uses WebCrypto only after affirmatively verifying it works with a known-answer test. Argon2id is WASM and unaffected. Pure-JS AES-GCM runs at a few MB/s, which is irrelevant for vault-sized payloads. `crypto.getRandomValues` is not part of `subtle` and remains available.

**Consequence:** you can use the BIP-39 generator, the derivation engine, and the SLIP-39 splitter on an internet-connected laptop, and the secrets involved still cannot reach the network. That is a materially stronger guarantee than "we promise we don't upload it," and it is what makes your "run the tools online" requirement safe rather than reckless.

### 2.3 Vault compartments

The vault has two independently-encrypted compartments under the same passphrase (two subkeys derived from the DEK via HKDF with distinct info strings):

| Compartment | Contents | Available online? |
|---|---|---|
| **Public** | Wallets, accounts, addresses, labels, tags, public notes, devices, transactions, cost-basis lots, backup *locations* | ✅ Yes |
| **Secret** | Seed phrases, private keys, BIP-39 passphrases, SLIP-39 share material, secret notes | ❌ Never |

Online, the secret compartment's ciphertext is never even passed into the decryption routine. The cold realm refuses, and says why.

This is what makes the portfolio work: your holdings, addresses, and cost basis live in the public compartment, so balances and PnL are fully available on a connected device while every seed stays sealed.

**Setting — `vaultOnlinePolicy`:**

- `public-only` (default) — as above.
- `strict` — the vault will not open at all while a network connection is detected. Choose this if you'd rather your holdings never be decrypted on a connected machine.

### 2.4 Modes

| | Cold Mode (offline) | Warm Mode (online) |
|---|---|---|
| Detection | Warm shell records repeated failure of all active reachability probes | Any probe succeeds, or reachability is checking/unknown |
| Public compartment | ✅ Full read/write | ✅ Read/write (or ❌ under `strict`) |
| Secret compartment | ✅ Full | ❌ Never |
| Tools (entropy, BIP-39, derivation, SLIP-39, recovery) | ✅ | ✅ *(inside the cold realm)* |
| Vault save | ✅ | ⚠️ Public compartment only; re-encrypts secret ciphertext without decrypting it |
| Prices / balances | ❌ Last-known values, shown with age | ✅ when reachable |
| Status | Green **no external reachability detected** + cold realm sealed | Amber **online / checking — secrets sealed** + independent cold-realm state |

Note the vault-save nuance: in Warm Mode the secret compartment is copied through as opaque ciphertext, so you can add a wallet or a transaction online without ever touching your seeds, and without losing them on save.

---

## 3. Portability contract

"Runs from one local file" silently kills several standard web techniques. Each item is a hard constraint for supported execution contexts.

| Constraint | Reason | Consequence |
|---|---|---|
| **No ES modules** | `file://` origins are opaque; module loading fails in Safari and Firefox | Everything ships as classic inline script |
| **No `fetch()` of own resources** | `file://` fetch is blocked in Chrome and Safari | All assets embedded inline or base64 |
| **No service worker** | Requires a secure HTTP origin | Offline comes from the file being local |
| **WebCrypto optional** | `file://` secure-context status varies by browser | Pure-JS fallbacks (`@noble/*`); detect at boot; show which path is active |
| **`crypto.getRandomValues` required** | No safe fallback for randomness exists | Hard-fail with explanation if missing. Never substitute `Math.random`. Dice entropy remains available |
| **Web Workers optional** | `blob:` workers unreliable under `file://` on iOS | Long jobs use a worker when available, else chunked main-thread tasks yielding every ~16 ms |
| **Camera optional** | `getUserMedia` fails on `file://` in Safari | QR *scanning* is a bonus; generation and manual entry always work |
| **Saving needs portable fallbacks** | No single save API works across supported file contexts; blob downloads can be blocked under `file://` | canonical File System Access save → canonical blob-download replacement; encrypted Base64 is an advanced handoff, while animated QR is live device-to-device transfer only (§8.5, ADR-0026) |
| **`localStorage` non-essential** | May be unavailable under `file://` on iOS | Used only for UI prefs and the save counter; degrades silently |
| **Sandboxed iframe must work from `file://`** | The whole security model depends on it | Boot self-check verifies the cold realm instantiated and its CSP is active; **hard-fail with an explanation if not** — no silent fallback to an insecure single-realm mode |
| **Target ≤ 3 MB, hard cap 4.5 MB** | Must open fast on a phone | Drives chain-tier scoping |

**Field test matrix:** Chrome/Edge + Firefox on Windows; Safari + Chrome on macOS; Firefox on Linux; Chrome on Android from Files; Tails/Tor Browser. **iOS local execution remains a blocked portability target under [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md) and is not counted as supported until a documented and security-qualified execution flow exists.** A boot-time capability panel reports what's present whenever Coldbox can actually execute.

---

## 4. Threat model

**Defends against:**

| Threat | Mitigation |
|---|---|
| Secret exfiltration, accidental or malicious | Cold realm CSP `connect-src 'none'` + opaque origin + whitelist postMessage schema |
| Warm-shell compromise reading secrets | Cross-origin iframe isolation; secrets never enter the warm shell's memory |
| Supply chain | Zero runtime dependencies; all libs vendored, pinned, hashed, listed in-app |
| Theft of the vault file | Argon2id + AES-256-GCM; indistinguishable from random after header; size-padded |
| Shoulder surfing | Masked by default, hold-to-reveal, privacy blur, panic hotkey, idle lock |
| Clipboard scraping | Opt-in per field, auto-clear after 30 s, explicit warning about clipboard managers |
| Browser text exfiltration | `spellcheck="off"` on every secret field — browser spellcheck can transmit typed text to vendor servers |
| Backup single-point-of-failure | Health dashboard flags shares co-located, unverified, or overdue |
| Vault rollback | Monotonic save counter + last-modified shown on unlock |
| Tampered copy of the app | Drag-and-drop self-hash verifier + published SHA-256 + detached GPG signature |
| Address↔IP correlation | Balance lookups are opt-in per address, never automatic, with Tor/VPN guidance (§7.4) |

**Does NOT defend against:**

- A compromised OS, keylogger, or malicious browser extension. Nothing in a browser can.
- Physical coercion.
- JavaScript memory forensics. JS strings are immutable and cannot be wiped; the GC may copy buffers; the OS may swap to disk. Mitigation is partial (§8.6) and the app says so.
- A hostile display: screen recording, cameras, compromised GPU stack.
- Network-level observation of *which* addresses you query (mitigated, not eliminated, by Tor).
- A weak vault passphrase. Argon2id buys time, not immunity.

**Recommended posture (stated in-app):** generate keys on a device that has never been and will never again be online, or boot Tails. Use Warm Mode for portfolio review, not key generation. Keep app and vault on the same removable media. The vault supplements, never replaces, metal backups.

---

## 5. Files and navigation

### 5.1 Files

```
coldbox-v1.0.0.html        ~1.7 MB   the application. Never changes.
coldbox-v1.0.0.html.sha256 ~100 B    published hash
coldbox-v1.0.0.html.asc    ~1 KB     detached GPG signature
my-vault.cbx               variable  your encrypted data
my-vault.cbx.bak           variable  previous generation
```

### 5.2 Sections

Left rail on desktop, bottom tab bar plus overflow on mobile. 🔵 = warm shell · 🔒 = cold realm · ◐ = runs in either, routed by whether the input is secret.

```
🔒 Vault          unlock/lock, save, passphrase, recovery shares, compartments
🔵 Dashboard      portfolio value, allocation, movers, backup health, alerts
🔵 Portfolio      holdings, transactions, lots, realized/unrealized PnL, metrics
🔵 Prices         live aggregate + per-source, watchlist, spread, staleness
🔵 Registry       wallets, accounts, addresses, notes, tags, balances
◐ Devices         hardware wallet registry, verification, firmware, quorums
🔒 Entropy Lab    dice, coins, cards, CSPRNG, mixing, bias analysis
🔒 Seed Forge     BIP-39 generate/validate, passphrase, BIP-85 children
🔒 Derivation     paths, accounts, addresses, xpubs, 40+ chains, custom registry
🔒 Backup Lab     SLIP-39, Shamir39, raw SSS, backup records, health
🔒 QR Studio      address QR, SeedQR, printable cards, scanner
🔒 Recovery       missing word, typo repair, checksum fix, passphrase search
◐ Verify Bench    file hashing, KDF calc, key converter, address validator
◐ Reference       wordlists, BIP excerpts, path cheatsheet, provenance, self-verify
◐ Learn           plain-English help at three depths, guides, glossary, search
```

---

## 6. Offline enforcement and the airgap guard

### 6.1 Cold realm CSP (inside the iframe)

```
default-src 'none'; script-src 'sha256-<hash>' 'wasm-unsafe-eval';
style-src 'sha256-<hash>'; img-src data: blob:; font-src data:;
connect-src 'none'; form-action 'none'; base-uri 'none';
object-src 'none'; frame-src 'none'; worker-src blob:;
```

`'wasm-unsafe-eval'` is required — under strict CSP, Chrome blocks `WebAssembly.instantiate` without it, which would silently kill Argon2id and drop every vault to the weaker PBKDF2 fallback. It permits WASM compilation only; it does **not** re-enable `eval()` or `new Function()`. A build-time lint asserts neither appears in our source.

### 6.2 Warm shell CSP (outer document)

The canonical warm-shell policy, including its complete `connect-src` host allowlist, is maintained in [csp-policy.md](../02-security/csp-policy.md) and injected by the build. It includes `frame-src 'self' blob:` and `worker-src blob:` alongside the hash-pinned script/style sources and fail-closed document directives.

The allowlist is **pinned at build time** and visible in the Reference → Provenance panel. `srcdoc` children inherit the parent policy, so the build also injects the child script/style hashes into the parent policy; see [build.md](../05-development/build.md) and [csp-policy.md](../02-security/csp-policy.md) for the single implementation contract. Redirect behavior and the concrete-host rule belong in that canonical security document rather than in a second copy here.

### 6.3 Runtime neutering and lockout

Inside the cold realm: overwrite `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `navigator.sendBeacon` with throwing stubs on both the exposed objects and their prototype owners, then freeze the replacement properties. Defense in depth behind the CSP, not instead of it.

The warm shell continuously monitors **external reachability**. `navigator.onLine`, `navigator.connection`, `online`/`offline`, focus, and connection-change events are hints and recheck triggers only; they are never the authority. The authority is a small active probe set to two already-allowlisted, unrelated public endpoints. Any successful probe establishes **online** immediately. Coldbox declares **no external reachability detected** only after all probe endpoints fail for consecutive rounds. While checking, stale, contradictory, or unknown, it fails **online-safe** and keeps secrets sealed. Stable state is refreshed on a fixed cadence while the app is open (ADR-0024 target: one primary check every 10 seconds, with immediate event-triggered rechecks and a backup/confirmation sequence after failure). See [ADR-0024](../05-development/adr/0024-warm-reachability-monitor.md).

The CSP canary is separate: it is a deliberately policy-violating request used to prove that the browser is enforcing the cold/warm policies. If the exact expected violation is not observed, the app enters full lockdown and refuses vault operations. A reachability probe succeeding is normal; a CSP canary succeeding is a security failure.

The status surface shows **two independent facts**: (1) warm-shell external reachability — online, no reachability detected, or checking/unknown — and (2) cold-realm isolation — sealed or locked down. It never labels failed probes as proof of a physical airgap. Automatic probes carry no vault/address/asset/user data, but they do expose ordinary connection metadata (IP, time, user agent) to the probe operators; that privacy cost is disclosed in [api-sources.md](../04-reference/api-sources.md).

### 6.4 Self-integrity verification

The app cannot `fetch` its own source under `file://`, so verification is user-initiated. **Reference → Verify This File** offers a drop zone: drag the HTML onto it, and the app hashes the bytes and compares against the value compiled into it, showing the expected hash for independent comparison. Instructions for `sha256sum` / `certutil` / `shasum` and GPG are printed alongside, because verifying a file with itself is circular and the app says so.

---

## 7. Online features

### 7.1 Price aggregation

Sources, all browser-callable:

| Source | Key | Notes |
|---|---|---|
| **CoinGecko** | Free Demo key (`x-cg-demo-api-key`) | Broadest coverage. Free tier ~30 calls/min, 10k/month |
| **Coinbase** | None | `/v2/prices/{pair}/spot`, CORS-enabled |
| **Kraken** | None | `/0/public/Ticker` |
| **CoinPaprika** | None | Broad coverage, keyless |
| **DIA** | None | 3,000+ tokens, keyless, no registration |
| ~~CoinMarketCap~~ | ✋ | **Cannot be included.** CMC does not send CORS headers for browser calls, and their own docs say a browser-embedded key is stealable. Including it would require a proxy server, which breaks the no-server axiom |

**Aggregation uses the median, not the mean.** One stale or broken feed skews a mean badly; the median is robust to it. The UI shows the median as the headline number, each source individually beneath, the spread between high and low, and a per-source staleness age. Divergence above a threshold (default 1%) raises a visible flag rather than silently averaging nonsense. A manual price override exists for illiquid assets no feed covers.

Failure handling: sources are queried in parallel with a timeout; any that fail are marked unavailable rather than retried aggressively. Rate-limit responses are respected with backoff, and the app caches aggressively — it is a portfolio tracker, not a trading terminal.

Prices are cached into the vault's public compartment with timestamps, so Cold Mode shows last-known values clearly labelled with their age.

### 7.1a Multi-currency and FX

Base currency is user-selectable, and most of it comes free: CoinGecko returns prices directly in ~60 fiat currencies via `vs_currency`, so crypto→fiat needs no separate FX hop.

Fiat↔fiat conversion — needed when you bought in one currency and report in another — uses **Frankfurter**: open-source, no API key, no signup, no rate limit, sourced from European Central Bank reference rates covering ~30 major currencies, with historical rates by date. It can also be self-hosted, which fits the `localhost` CSP entries.

Design rules: every stored amount records **the currency it was actually transacted in**, never a pre-converted figure. Conversion happens at display time, so changing your reporting currency never rewrites history or silently corrupts cost basis. Historical FX is fetched at the transaction's date, not today's rate. Where a currency isn't covered by ECB rates, the app says so rather than silently approximating.

### 7.1b Historical price backfill

When you enter a past transaction while online, the app can look up the market price on that date and pre-fill it. This saves substantial tedium on a large back-history.

It is **opt-in and never silent**, because it does have a privacy cost: a backfill query tells an API the date and asset of a transaction you made. Three modes:

| Mode | Behavior |
|---|---|
| **Manual** (default) | You type the price. Nothing is queried. Zero leakage |
| **Ask each time** | The app offers to look it up, showing exactly what it will send, per transaction |
| **Auto** | Backfills on entry while online |

Manual entry is always available in every mode and always overrides a fetched value, with fetched-vs-manual marked per transaction so you can see which figures came from where. Bulk CSV import defaults to Manual — importing 500 rows should not fire 500 dated queries at an API without you deciding to.

### 7.2 Live market view

A watchlist you control: your held assets by default, plus anything you add. Per row: median price, 24h change, per-source breakdown on expand, spread indicator, sparkline (SVG, hand-rolled, ~10 KB). Sort by change, value held, or divergence. Auto-refresh interval configurable and off by default.

### 7.3 Balance lookups

| Chain | Endpoint | Scope |
|---|---|---|
| Bitcoin | mempool.space, blockstream.info (Esplora) | Address and xpub. Keyless |
| EVM chains | Public JSON-RPC (`eth_getBalance`) | Native balance. Tokens need an indexer — v1 is native-only, tokens are manual |
| Solana | Public RPC `getBalance` | Native SOL |
| Cosmos family | Public LCD REST | Native denom |
| Others | Manual entry | — |

**xpub scanning** derives addresses locally in the cold realm, passes only the resulting *public addresses* to the warm shell, and queries them with a configurable gap limit (default 20). The xpub itself is never sent to any server — a distinction most wallet software gets wrong, and one that matters, because handing your xpub to an API hands over your entire transaction history forever.

Balances are stored as snapshots with `asOf` timestamps, never presented as live truth once stale.

### 7.4 The privacy cost, stated plainly

Querying your own addresses against a third-party API links your IP address to those addresses, permanently, in someone else's logs. For Bitcoin especially this is a real deanonymization vector. Mitigations, in order of effectiveness:

1. **Point it at your own node.** The `localhost` CSP entries exist for exactly this.
2. **Use Tor Browser.** The app runs fine in it.
3. **Use a VPN.** Weaker — you're trusting the VPN instead.
4. **Query selectively.** Balance lookup is **opt-in per address, never automatic.** There is no background balance/history sync. You press a button, per address or per account, and the app tells you what it is about to reveal and to whom before it does. The content-free reachability monitor in §6.3 is the only automatic warm-shell network traffic.

This warning appears the first time you use balance lookup, and the setting defaults to off.

---

## 8. The vault

### 8.1 Format: `.cbx`

```
Offset  Size   Field
0       8      Magic "CBXVAULT"
8       2      Format version (uint16 BE)
10      1      KDF id (1=Argon2id, 2=PBKDF2-HMAC-SHA512)
11      4      KDF memory KiB (uint32 BE)
15      4      KDF iterations
19      1      Parallelism
20      1      Cipher id (1=AES-256-GCM, 2=XChaCha20-Poly1305)
21      32     KDF salt
53      4      Wrapped-DEK block length      (uint32 BE; method-3 marker in the high bit)
57      4      Public compartment length L1  (uint32 BE, incl. tag)
61      4      Secret compartment length L2  (uint32 BE, incl. tag)
65      --     ---- header ends; AAD = bytes 0..64 ----
65      W      Wrapped-DEK block (one record per unlock method)
        12/24  Nonce, public compartment
        L1     Public ciphertext + 16-byte tag
        12/24  Nonce, secret compartment
        L2     Secret ciphertext + 16-byte tag
```

Explicit length fields are required — without them the two compartments cannot be parsed apart. The plaintext header (bytes 0–64) is passed as **AAD**; recovery-enabled vaults append their exact method-3 metadata to that AAD. KDF parameters, compartment boundaries, and recovery metadata therefore cannot be tampered with. Everything after the header is indistinguishable from random. See the byte-level [vault-format specification](vault-format.md) for the complete record contract.

**Nonce discipline:** every save generates a fresh random nonce for every compartment it re-encrypts. In Warm Mode the secret compartment is copied through byte-for-byte — ciphertext, nonce, and tag together — so no nonce is ever reused against the same key with different plaintext.

### 8.2 Key hierarchy

A random 256-bit **DEK** is the root. From it, HKDF-SHA-512 derives two subkeys with distinct info strings: `cbx/public/v1` and `cbx/secret/v1`. The DEK itself is wrapped once per **unlock method**:

1. **Passphrase** (required) — Argon2id(passphrase, salt) → KEK → wraps DEK.
2. **Keyfile** (optional) — any file on your USB; its SHA-512 mixes into the KEK. Two-factor: something you know plus something you have.
3. **Recovery shares** (optional) — the DEK split via SLIP-39 into printed shares. A threshold reconstructs the vault without the normal passphrase; shares are an additional route, never a replacement for the normal credential. The fixed method-3 record and no-share-passphrase rule live in the [vault-format specification](vault-format.md).

Changing your passphrase rewraps 32 bytes instead of re-encrypting everything, and multiple unlock paths coexist without duplicating data.

**The wrapped-DEK block is a list of records from format version 1**, each tagged with its method, even when only the passphrase record is present. Recovery-enabled files use the reserved high-bit marker and method-3 record defined in [ADR-0040](../05-development/adr/0040-vault-recovery-share-record.md); older readers reject that marker.

**Remaining responsibility.** Recovery shares are optional. If you do not configure and independently rehearse them, the normal passphrase or keyfile remains the only route into that vault. A vault holding your backup locations still needs a tested, physically stored unlock plan.

### 8.3 Crypto parameters

| Purpose | Primitive | Parameters |
|---|---|---|
| KDF (default) | **Argon2id** | m = 64 MiB, t = 3, p = 1 — OWASP higher-security recommendation |
| KDF (fast) | Argon2id | m = 19 MiB, t = 2, p = 1 — OWASP floor, for old phones |
| KDF (paranoid) | Argon2id | m = 256 MiB, t = 4, p = 1 — **may fail to allocate on iOS**; benchmark first |
| KDF (fallback) | PBKDF2-HMAC-SHA512 | ≥ 1,000,000 iterations, only where Argon2 WASM won't load |
| Encryption | **AES-256-GCM** | 96-bit nonce, 128-bit tag, header as AAD |
| Encryption (alt) | XChaCha20-Poly1305 | 192-bit nonce, where WebCrypto AES is unavailable |
| Subkey derivation | HKDF-SHA-512 | Distinct info strings per compartment |
| Hashing | SHA-256/512 | WebCrypto, `@noble/hashes` fallback |
| Randomness | `crypto.getRandomValues` | Required. No fallback. Ever |

The KDF calculator (§11.2) benchmarks on your slowest device first — a vault you can't open on your phone is a problem worth discovering early.

### 8.4 Payload and padding

Each compartment serializes to JSON, then is **padded to the next 64 KiB boundary with random bytes** so file size doesn't reveal how many wallets you own. Compression is deliberately *not* applied: compressing before encrypting leaks information through ciphertext length.

### 8.5 Vault identity, creation, save and load

A new vault has two identifiers with deliberately different trust/privacy properties:

- **Vault name** — a user-chosen **public** warm-shell label used for the Vault Library and filename. It must never contain secrets.
- **Vault ID** — a random non-secret UUID generated inside the cold realm and stored in the authenticated public compartment. It survives moving the `.cbx` to another device and namespaces save-integrity bookkeeping. It is not a device/browser fingerprint; see [ADR-0025](../05-development/adr/0025-vault-identity-library-and-save-ux.md).

Creation is a distinct flow: choose the public vault name, then enter **new unlock phrase** and **confirm unlock phrase** inside the cold realm. Confirmation exists only for creation; opening an existing vault asks for the phrase once. A mismatch creates nothing and must produce a visible inline mismatch error beside the confirmation input, not only a generic status line. On success the vault is **UNLOCKED · NOT SAVED** until a save path receives encrypted bytes.

Durable vault storage has one format: `.cbx`.

| Path | Where | Mechanism |
|---|---|---|
| **Canonical File System Access save** | Chrome/Edge desktop where exposed | `showSaveFilePicker()` for the first canonical `<name>--<id8>.cbx`; later dirty saves reuse that handle and verify byte-for-byte |
| **Canonical download replacement** | Desktop, most Android, other running contexts with downloads | `<a download>` + `createObjectURL`; Coldbox cannot verify or force filesystem overwrite, so the result is **Saved · unverified** |
| **Encrypted text handoff (advanced)** | Supported running contexts | Base64 textarea / `navigator.share` where available; this is a transport convenience, **not** a canonical save and does not change save status |

**Save vault** is the primary post-create action. An unchanged vault whose canonical save/download has already completed cannot be saved again merely to create another look-alike copy. When later editing makes a vault dirty, a retained File System Access handle updates the same canonical file. Download-only browsers can only create an explicitly unverified replacement because browser-controlled collision/overwrite behavior is outside Coldbox's control.

Loading uses a **Vault Library**. Coldbox cannot silently enumerate the filesystem: the user explicitly grants a folder where `showDirectoryPicker()` is supported or selects multiple `.cbx` files as the portable fallback. Current filenames are `<public-name>--<id8>.cbx`; a different Vault ID cannot reuse a public name already known in the current session, best-effort browser-profile registry, or user-granted library. This is not disk-wide uniqueness. Filename metadata remains advisory until unlock confirms the full authenticated Vault ID. Historical `--0047`/`coldbox-vault-0047.cbx` names remain readable and migrate to the canonical name on a future save.

**Live animated QR is separate from saving.** It appears only for an already-unlocked vault that was loaded from durable `.cbx` storage or has completed a verified canonical save, and only as a device-to-device transfer to a receiver that does not already have that vault in its granted library. No QR file/frame download exists. The sender repeatedly renders encrypted `.cbx` bytes with a random Transfer ID; the receiver collects them by user-initiated camera, verifies the reconstructed SHA-256, then still uses the ordinary `vault.open` path and normal passphrase. The received vault starts **Not saved** until that device writes its canonical `.cbx`. QR receive is progressive enhancement; if the browser lacks camera/QR-decoder support, the UI directs the user to transfer `.cbx` instead. See [ADR-0026](../05-development/adr/0026-canonical-vault-save-and-live-transfer.md).

A normal user-requested lock — including the visible cold-realm **Request lock** control — routes through the warm shell. A truly unsaved vault offers save-first, lock-without-saving, or cancel. A **Saved · unverified** canonical download cannot be duplicated by re-saving the unchanged vault, so its warning instead offers lock-anyway or cancel and directs the user to reopen the downloaded `.cbx` for verification. Panic hide, idle timeout, network-mode changes, and security-health failures lock immediately and never wait for storage. A failed AEAD tag remains "wrong passphrase *or* damaged file" because the two are cryptographically indistinguishable.

### 8.6 Memory hygiene and its limits

Done: secrets in `Uint8Array` rather than `String` where the code path allows; explicit zero-fill after use; DEK dropped on lock; idle auto-lock (default 5 min); optional lock on tab-hide; `Esc Esc` panic hotkey.

Not done, stated plainly in-app: JS strings are immutable and cannot be wiped, the GC may copy buffers anywhere, and the OS may swap memory to disk. On an untrusted OS none of this helps. That's an argument for Tails, not for cleverer JavaScript.

---

## 9. Data model

```
Seed          id, label, fingerprint, wordCount, hasPassphrase, createdAt,
              origin, storedSecret?†, passphraseHint, notes, tags[], hidden
Wallet        id, label, seedId?, type, network, scriptType, primaryPath,
              xpubs[], deviceIds[], status, notes, tags[], hidden
Account       id, walletId, asset, path, xpub, label, notes
Address       id, accountId, index, address, label, isChange, used,
              balanceSnapshot { amount, asOf, source }, notes, tags[], hidden
Device        id, model, serial?, firmware, purchasedFrom, purchasedAt,
              pinChangedAt, passphraseUsed, location, notes
Transaction   id, ts, type, asset, quantity, pricePerUnit, quoteCurrency,
              fee, feeAsset, venue, walletId?, addressId?, txid?,
              lotMethodOverride?, notes, tags[], hidden
Lot           derived: acquisitionTs, asset, qtyRemaining, costBasisPerUnit, sourceTxId
BackupRecord  id, subjectId, method, shareLabel, threshold, groupConfig,
              location, custodian, createdAt, lastVerifiedAt, verifyEveryDays,
              shareMaterial?†, notes
Contact       id, name, role, reachInstructions, notes
Note          id, title, body (markdown), visibility, linkedIds[], tags[], hidden
PriceSnapshot asset, median, sources[{name, price, ts}], spread, ts
AuditEvent    ts, action, entityId, detail   (append-only)
```

† `storedSecret` and `shareMaterial` live in the **secret compartment**; everything else lives in the **public compartment**. That split is what lets the portfolio work online.

---

## 10. Notes, tags, and concealment

### 10.1 Notes

Every entity carries a `notes` markdown field, plus standalone `Note` records that can link to several entities at once. Each note has `visibility: public | secret`, which determines its compartment — so "this account receives withdrawals from Coinbase" stays readable online, while "the passphrase hint is the street we grew up on" does not.

This is built for exactly the cases you described: annotating that a particular BIP-39 seed is your long-term cold hold, or that a specific derivation address is the one you give Coinbase. Notes are searchable, and the search runs in whichever realm owns the data — public notes search in the warm shell, secret notes only in the cold realm.

Tags are free-form and shared across every entity type, so `#longterm`, `#coinbase`, `#taxlot-2024` all filter globally.

### 10.2 Concealment — four levels

**1. Masking (always on).** Secrets render as `••••••` and reveal on press-and-hold or an explicit toggle that auto-re-masks after 30 s. A red border and a "secret visible" indicator appear whenever anything sensitive is on screen.

**2. Privacy blur.** A one-tap toggle that blurs every monetary figure and balance while leaving structure and labels legible. For checking something in public without broadcasting your net worth. Persists across sections; survives reload.

**3. Panic hide.** `Esc Esc` instantly re-masks everything, clears secrets from the DOM, and locks the vault. Optionally switches to a neutral-looking screen.

**4. Hidden items.** Any entity can be flagged `hidden`. Hidden items are excluded from all views, search results, exports, *and portfolio totals* — so the visible view stays internally consistent rather than showing a total that doesn't match its rows. Revealing them requires re-entering the vault passphrase and is session-scoped.

**Not included: a duress/decoy compartment.** Considered and rejected. Its deniability is weak against anyone who knows the file format, and it doubles the ways to permanently lose data.

### 10.3 Label portability — BIP-329

Labels and notes export to and import from **BIP-329**, the wallet label interchange format created by Craig Raw of Sparrow and adopted by Sparrow, Nunchuk, BitBoxApp, and BTCPay Server.

This matters more than it sounds. Labels are the one piece of wallet data that is pure human effort and impossible to regenerate — lose them and you lose every note about which address came from which exchange, which UTXO is which. BIP-329 support means the work you do here isn't trapped here: it moves to Sparrow and back, and it survives this project being abandoned.

Scope: transaction, address, public key, input, output, and xpub labels. Coldbox's richer note fields (markdown bodies, links, visibility) round-trip through the standard's `label` field with graceful degradation, and full fidelity is preserved in native `.cbx` export.

---

## 11. Module specifications

### 11.1 Cold realm modules

**Entropy Lab 🎲** — dice (d6, base-6 and 4-outcome-discard mappings), coin flips, playing cards, hex, and CSPRNG. Big touch targets, running bit-count meter, undo. The meter separates **normal output strength** (the selected 128–256-bit result under a sound device CSPRNG) from **independent-source fallback strength** (the conservative physical/manual entropy that remains if the device RNG is completely compromised). Device-RNG-generated dice/coins/cards/hex count as simulation only and add zero independent-source credit. **Mixing**: source material is XORed with fresh CSPRNG output then hashed; partial physical/manual entropy may improve fallback strength, but **full two-source protection** is claimed only when the independent physical/manual contribution itself reaches the selected output size. **Bias Analyzer** (replacing *Entropy Bias.html*): per-symbol frequency, an observed empirical min-entropy estimate, chi-square with p-value, runs test, serial correlation, and deterministic pattern warnings. The analyzer is advisory and never replaces P1.1's integer accounting; exact definitions are in [ADR-0027](../05-development/adr/0027-entropy-health-statistical-diagnostics.md). Produces 128–256 bits of raw entropy, in the same form Seed Forge consumes (P1.3) — see [ADR-0023](../05-development/adr/0023-entropy-lab-seed-forge-boundary.md) for why this is phrased as a cold-local byte contract rather than a hand-off that spans two roadmap items.

**P1.3 Seed Forge contract:** the finished cold-only flow is **Entropy Lab →
Mix → Use this mix in Seed Forge → BIP-39 mnemonic → optional passphrase →
raw BIP-39 seed + live master fingerprint**. A successful Mix action retains
the exact returned bytes in a cold-local one-use slot; the explicit Use action
consumes those bytes without a second mix. Changing Entropy Lab input or the
selected output size invalidates that slot, and a target mismatch fails closed.
The separate Generate action may draw and mix a fresh CSPRNG-backed result
through the same Entropy Lab session.

The mnemonic uses one of the ten vendored official BIP-39 wordlists at 128,
160, 192, 224, or 256 entropy bits. Validation reports word and checksum
status in the cold realm. Generate and Validate Existing Phrase each have a
separate optional passphrase and confirmation pair. A matching edit re-derives
only that workflow's current mnemonic's 64-byte PBKDF2-HMAC-SHA512 seed and
master fingerprint without generating a new mnemonic; a mismatch clears only
that workflow's derived outputs. The raw seed is an advanced cold-only output,
masked by default, revealed only by an explicit timed action, and has no
clipboard or storage action. Japanese U+3000 is retained for canonical
display, then the reconstructed mnemonic sentence is NFKD-normalized before
PBKDF2 so the separator becomes the required ASCII space. xprv/xpub/ypub/zpub,
script/path derivation, and child derivation remain later roadmap scope.

#### 11.1a Entropy Health Meter

A live strength indicator wherever a secret is created — seed phrases, vault passphrases, BIP-39 passphrases, and Diceware output. Present throughout collection, not as a verdict at the end.

**It measures min-entropy, not Shannon entropy.** Shannon entropy describes average information content; **min-entropy describes the probability of the single most likely outcome**, which is what an attacker actually guesses first. For a biased source the two diverge, and only min-entropy answers "how hard is this to guess." Entropy Health shows claimed source-model bits and measured min-entropy; Shannon entropy is explanatory only and is not a displayed diagnostic.

**Two numbers, always shown side by side:**

| | Meaning |
|---|---|
| **Claimed bits** | What the input *should* yield — 50 d6 rolls × log₂6 = 129.2 bits |
| **Measured bits** | Observed empirical min-entropy estimate from the recorded distribution |

A gap between them is the entire point. Fifty rolls of a loaded die claim 129 bits and show a lower observed estimate, and the user needs to see that rather than a green bar. The estimate is finite-sample evidence, not a confidence-bound guarantee; the analyzer's exact formulas and unavailable-test rules are in [ADR-0027](../05-development/adr/0027-entropy-health-statistical-diagnostics.md).

**States:**

| State | Threshold | Behaviour |
|---|---|---|
| 🔴 Insufficient | Measured < selected target | Advisory P1.2 label; Seed Forge still requires the selected fresh CSPRNG target |
| 🟠 Marginal | Measured ≥ selected target and bias detected (χ² p < 0.01) | Advisory P1.2 warning; Seed Forge requires an explicit acknowledgement before generation |
| 🟡 Adequate | Measured ≥ selected target, no chi-square flag, and < 256 bits | Advisory P1.2 label |
| 🟢 Strong | Measured ≥ 256 bits | Advisory P1.2 label |

Targets: 128 bits for a 12-word seed, 256 for 24 words. The thresholds are ordered and non-overlapping: the selected target is evaluated before the 256-bit strong threshold. P1.2 is advisory and does not block Entropy Lab's Mix entropy control. Seed Forge (P1.3) consumes `mix()` output only after the cold realm has enough fresh CSPRNG bytes for the selected target; it fails closed rather than producing a shorter phrase, and requires an explicit acknowledgement when the selected physical/manual source is marginal.

**Live pattern warnings during collection**, not after: unusually long runs of one value, ascending or descending sequences, alternating patterns, and repeated blocks. These catch a stuck die, a misread, and the human tendency to unconsciously "balance" results.

**Honest handling of each source:**

- **Dice, coins, cards** — their source models and claimed bits are exactly computable. The observed diagnostics are evidence about the recording, not proof that the physical source is fair; cards drawn without replacement do not receive iid tests.
- **CSPRNG** — 256 bits by definition. The bar shows full, with a note that it measures the *source*, not the platform RNG's integrity, which cannot be assessed from output.
- **Diceware passphrases** — exact: word count × log₂(wordlist size). 6 EFF Large words = 77.5 bits.
- **Human-chosen passphrases** — **shown as a qualitative range/limitation, never a single number**, with the limitation stated plainly. Entropy estimation for human-chosen text is heuristic; every meter that displays "84 bits" for a typed passphrase is inventing precision it does not have. The vault-creation surface shows `Unknown range — no numeric estimate` and recommends Diceware instead.

The existing vault creation form follows the human-chosen rule live: its creation-only panel says the range is unknown and gives Diceware guidance without assigning a number. That panel is hidden during ordinary unlock. The P1.2 physical-source diagnostics remain in Entropy Lab; neither surface changes P1.1 accounting.

That last distinction matters more than it looks. A false-precision number invites users to trust a weak passphrase because a meter turned green.

**Seed Forge 🌱** — BIP-39 generate (12/15/18/21/24), validate with per-word inline status, NFKD normalization. Separate duplicate-confirmed passphrase pairs for Generate and Validate Existing Phrase, with each workflow's own fingerprint readout, because a typo creates a silently different and unrecoverable wallet. Master fingerprint (first 4 bytes of HASH160 of the master pubkey) displayed everywhere a seed is referenced — this is the safe public identifier the Registry uses, letting you track a wallet without storing its seed. **BIP-85** child mnemonics, WIF, hex, and password derivation. Split view: seed on the left, fingerprint and first addresses on the right, for verifying a hardware wallet without trusting its screen alone.

**Derivation Engine 🧭** — see §12.

**Backup Lab 🧩** — see §13.

**QR Studio 🔳** — address QRs with BIP-21 / EIP-681 URI options; **SeedQR** (SeedSigner format: English BIP-39 word indices as zero-padded 4-digit decimals) and **Compact SeedQR** (raw entropy, binary mode) matching the 21×21/25×25/29×29 templates already in this folder; printable A4/Letter card layouts and wallet-sized 12/24-word templates; grid overlay for hand-transcription to metal; SVG and PNG export. Optional camera scanner (`jsQR`) gated behind an extra confirmation for seed payloads, degrading to "unavailable" where `getUserMedia` doesn't work. Print warnings note that spoolers and printer memory retain documents.

**Recovery Assistant 🩺** — repairs a damaged BIP-39 phrase, a damaged SLIP-39 share, or a codex32 share, and searches for a forgotten passphrase. Full specification in §11.1b.

#### 11.1b Recovery Assistant

Recovery is not primarily a speed problem. A fast search aimed at the wrong derivation path, or checking too few addresses, silently rejects the correct seed and reports failure — while the progress bar looks healthy the whole way. **Aim is specified here before throughput, because a false negative costs the user everything and a slow search only costs them time.**

**The pipeline has two stages, and the ratio between them governs everything.**

| Stage | Work | Cost | Survivors |
|---|---|---|---|
| **1 — screen** | enumerate candidate, BIP-39 checksum | ~1.1 µs | 1 in 16 (12-word), 1 in 256 (24-word) |
| **2 — verify** | seed, derive, compare | 1.5–5.6 ms | the answer, or nothing |

Stage 1 is roughly four thousand times cheaper than stage 2. Every design decision below exists to keep work in stage 1 and to make stage 2 as rare and as cheap as possible.

**Measured primitive costs** (`@noble` 2.2.0, desktop-class CPU; see the P4.3a harness):

| Operation | Cost |
|---|---|
| SHA-256, 32 B (checksum screen) | 1.1 µs |
| PBKDF2-HMAC-SHA512 ×2048, WebCrypto | 870 µs |
| PBKDF2-HMAC-SHA512 ×2048, pure JS | 6,746 µs |
| secp256k1 scalar multiplication | ~200 µs |
| HMAC-SHA512 (BIP-32 step) | 9.2 µs |

**The KDF is not the bottleneck; the curve is.** At one path and twenty addresses a candidate costs 5.56 ms, of which PBKDF2 is 870 µs — 16%. The other 79% is twenty-two scalar multiplications. The crossover is at about three addresses. Any optimisation effort spent on the KDF beyond using WebCrypto is misdirected.

**Per-candidate cost is `PBKDF2 + paths × (account derivation + addresses × 212 µs)`.** Which is why the search sequences paths and deepens address indices rather than multiplying both.

##### Stop conditions

A search needs a way to recognise the answer. In order of preference:

| Evidence | Quality | Notes |
|---|---|---|
| **xpub / master public key** | Best | No address-index guessing. Preferred, and offered first |
| **Known address + generation limit** | Good | Correct only if the address lies within the limit |
| **Imported address database** | Weak | Probabilistic — see below |
| **Checksum validity alone** | Not proof | 1 in 16 of all 12-word phrases passes |

**A checksum-only result is never reported as a recovery.** It is reported as a candidate count with an explanation of why the tool cannot choose between them.

**An address-database hit is never reported as a recovery either.** These structures are probabilistic and produce false positives by construction; a hit means "verify this against a real address or xpub," and the UI says exactly that. Reporting a bloom-filter hit as success would be failing open.

##### Search space and ordering

The space is *candidate × derivation path × script type × address index*. All four vary, and searching them naively multiplies. The engine therefore:

- **Deepens address indices rather than multiplying them.** Account-level xpubs for all surviving candidates are derived and cached, index 0 is checked across every candidate, then index 1, and so on to the limit. Most known addresses sit at a low index, so the typical case costs 1.53 ms per candidate instead of 5.56 ms. The cache is bounded; when candidates exceed the bound the engine falls back to per-candidate derivation and says so in the estimate.
- **Sequences derivation paths rather than searching them together.** Order: BIP-84, BIP-49, BIP-44, BIP-86. Searching all four at once costs 4× for a result usually found in the first pass.
- **Defaults to an address generation limit of 20**, user-adjustable, matching the gap limit in §7.3. This is the single most common cause of a false negative and it is surfaced in the UI, not buried in settings.

##### Error models

Individually specified, and composable — real damage is rarely one clean category:

- **Checksum repair** — enumerate valid final words; enumerate valid substitutes at every position.
- **Missing words** — known or unknown position, one or more.
- **Typo repair** — a declared grammar, not a similarity score: substitution, insertion, deletion, and adjacent transposition, ranked by Levenshtein distance and constrained by BIP-39's unique four-letter prefix. Where the first four characters are legible the word is determined and the position is not searched at all.
- **Ordering** — adjacent swap, arbitrary pair swap, and partial-order search where part of the sequence is known.
- **Passphrase search** — candidate list, or rule-based mutation of a base guess.

**Phased escalation** runs automatically, cheapest first, in the order: one error → two errors including one arbitrary word → three errors → two arbitrary words. Each phase reports its own estimate and the user can stop between phases.

##### Estimates, and the honesty contract

Before any search runs, the app states **both numbers**: combinations to enumerate and candidates to verify. They differ by 16× or 256× and conflating them is the difference between "seconds" and "hours."

**The time estimate is a property of the search and the live crypto path, not the search alone.** Per §11.1 and architecture.md, the cold realm defaults to pure-JS `@noble` and uses WebCrypto only after a known-answer test passes — an 7.8× difference on the KDF. The estimate is calibrated from the capability self-check (P0.9) and the Verify Bench KDF benchmark, and the UI names which path is live. An estimate quoted without that qualifier is wrong by up to an order of magnitude.

**Practical budget: roughly 10⁹ combinations of a 24-word phrase per hour, or 10⁸ of a 12-word phrase**, on eight workers at default settings. Past about 10¹¹ the answer is no at any settings.

**When a search is infeasible the app says so with the number and stops.** It does not start a search it cannot finish. Past the feasibility threshold it names the alternative explicitly — btcrecover with GPU acceleration, with the command — in the spirit of [ADR-0006](../05-development/adr/0006-companion-not-replacement.md). Pretending a browser tab competes at 10¹¹ combinations would be a lie told to someone who has already lost something.

##### Checkpointing

Searches in the hour-to-week band are resumable. Below that, restart is cheaper than the machinery; above it, the search is refused anyway.

The cold realm has an opaque origin and **cannot persist anything** — no `localStorage`, no IndexedDB. A checkpoint is therefore an encrypted file emitted through the sandbox's `allow-downloads` capability, on demand and periodically. Format and key handling in [ADR-0012](../05-development/adr/0012-recovery-checkpoint.md).

**A checkpoint is more dangerous than a stored seed.** It contains the known words *and* a map of exactly which are missing — 21 of 24 words plus the answer key reduces the space to about 33 million, which is minutes. It is encrypted at full vault strength, handled as top-tier secret material under §15's display rules, and the UI says plainly that it must not be stored anywhere the seed itself wouldn't be.

##### Coverage

- **All ten BIP-39 wordlists.** Language is detected from the legible words and confirmed by the user; a phrase mixing wordlists is reported as such rather than silently searched in one.
- **SLIP-39 share repair** — damaged or short shares, using the same error models against SLIP-39's own wordlist and checksum.
- **codex32 correction** — the BCH code over GF(32) is error-*correcting*, so a damaged codex32 share is repaired arithmetically rather than searched. This is the only format here where recovery is deterministic, and it is presented that way.
- **Address database import** — optional, user-supplied, never shipped. Constraints in §11.1c.

##### Address database import

For users with no address and no xpub. The database is built externally — it requires a full chain scan, which is not something a single HTML file can or should do — and imported read-only.

- **Format:** btcrecover's address database, produced by its `create-address-db.py`. Adopting an existing format avoids shipping a builder we cannot ship.
- **It must fit in memory.** A probabilistic filter needs random access; a multi-gigabyte file read through `File.slice()` costs milliseconds per lookup against a 1.5 ms candidate budget and would dominate by three orders of magnitude. The app checks the size at import and **refuses with the actual number** rather than degrading into a search that appears to run and cannot finish.
- **Never persisted.** The cold realm cannot persist it in any case; it is re-imported per session and discarded with the realm.
- **Never claims recovery** — see stop conditions above.

Maximum viable size and realistic pruned-database dimensions are unresolved; P4.3d is gated on establishing them, and if a pruned database cannot fit in browser memory the feature is dropped rather than shipped in a form that misleads.

**Passphrase Studio** — Diceware with EFF Large (7776) and EFF Short 2.0 (1296), both embedded from this folder's wordlists. Physical dice or CSPRNG, exact entropy math per word, and options for separators/capitalization/numbers each showing how little entropy they actually add. Direct handoff to the BIP-39 passphrase and vault passphrase fields.

### 11.2 Shared modules (either realm)

**Verify Bench 🔍** — KDF calculator (PBKDF2, Argon2id, scrypt) with a live timing benchmark for calibrating your vault. Key converter (WIF ↔ hex, compressed ↔ uncompressed, extended-key version bytes). Address validator with EIP-55 case-checksum and bech32/bech32m distinction. Constant-time compare utility. Plus the file hasher below.

#### File hasher — replacing QuickHash, without a ceiling

The QuickHash binaries are dropped (28 MB, three platforms, one narrow job). The built-in replacement is designed so that users who want the heavier features aren't pushed back out to a separate app:

- **Streaming, so file size is irrelevant.** Files are read in chunks via `File.slice()`, keeping memory flat whether the input is 10 MB or 500 GB. A large file takes longer; it does not fail.
- **Multiple algorithms in a single pass** — SHA-256, SHA-384, SHA-512, plus legacy SHA-1 and MD5 for compatibility with old checksums. One read of the file produces all of them, rather than re-reading per algorithm.
- **Worker-backed** where Web Workers are available, chunked main-thread with yielding where they aren't. Live progress with throughput and ETA, and cancel.
- **Folder hashing, recursive**, via the File System Access directory picker on Chrome/Edge desktop and `<input webkitdirectory>` elsewhere. Produces a manifest of every file.
- **Interoperable manifests.** Export and import in `sha256sum` format (`<hash>  <path>`) and JSON, so manifests round-trip with `sha256sum`, `certutil`, `shasum`, and QuickHash itself. Nothing you produce here is trapped here.
- **Comparison and verification modes.** Diff two manifests (added / removed / changed), or re-hash a folder against a stored manifest.
- **Expected-hash field** with constant-time compare, for checking a download against a published value.

That verification mode matters more than it first appears given this tool's storage model. Your app, your vault, and your backups live on USB sticks and SD cards — media that suffers silent bit rot. Hashing your backup media to a manifest today and re-verifying it in a year turns "I hope those files are still good" into a definite answer, and the Backup Health dashboard can carry a media-verification due date alongside the share-verification ones.

**Honest performance note, shown in the UI:** WebCrypto hashing runs at roughly a few hundred MB/s; the pure-JS fallback is considerably slower. For multi-terabyte archives or forensic workloads, a native tool is still the right choice — and because manifests are interoperable, the app tells you exactly which native command produces a comparable result rather than pretending the browser is always the answer.

**Reference 📖** — searchable BIP-39 wordlist with index numbers (which matter for SeedQR transcription), SLIP-39 wordlist, derivation path cheatsheet, curated excerpts of BIP-32/39/43/44/49/84/85/86 and SLIP-39/44, provenance panel listing every embedded library with version and upstream hash, the CSP allowlist in full, and the self-verify drop zone.

### 11.3 Warm shell modules

**Dashboard** — total value, 24h change, allocation donut, top movers, backup health summary, stale-price and overdue-verification alerts.

**Portfolio** — see §14.

**Prices** — see §7.1–7.2.

**Registry** — searchable/filterable tables (cards on mobile), per-wallet detail pulling together its seed fingerprint, accounts, addresses, devices, and backups. Balance lookup buttons per address/account. Reports: **Backup Health dashboard**, **inheritance letter** (secret-free, printable), **portfolio sheet**, **address book export** (public only). Per-address verification state is surfaced here, so addresses that have never been re-derived in the cold realm are a visible, actionable list rather than an unstated assumption — see [address-verification.md](address-verification.md).

**Address Check** — the clipboard round-trip comparison, batch verification, and the optional volatility canary. Warm-shell-resident because clipboard APIs are unavailable in an opaque-origin sandboxed frame; it escalates to the cold realm for re-derivation when the vault is unlocked offline. Specification: [address-verification.md](address-verification.md).

---

## 12. Derivation Engine — chain coverage

Built on `@noble/curves`, `@noble/hashes`, `@scure/bip32`, `@scure/bip39`, `@scure/base` — modern, audited, small. A deliberate replacement for the aging `jsbn`/`bitcoinjs`/`sjcl` stack in the Ian Coleman file.

### 12.1 Tier 1 — full address rendering (v1)

Coin types verified against the current SLIP-44 registry (1,464 registered types as of this writing).

| Family | Chains (SLIP-44 coin type) |
|---|---|
| **Bitcoin-like** (secp256k1, base58check/bech32) | BTC 0 · LTC 2 · DOGE 3 · DASH 5 · ZEC 133 (transparent) · BCH 145 (CashAddr) |
| **EVM** (secp256k1, keccak + EIP-55) | ETH 60 · one address covers every EVM chain — Ethereum, Optimism, BSC, Polygon, Base, Arbitrum, Avalanche C 9005, Fantom/Sonic, Berachain 8008, **Monad 268435779**, Blast, Scroll, zkSync, Linea, Mantle, Celo, Gnosis, **Hyperliquid 2457**. Presented as one address with a chain-ID reference list rather than duplicated rows |
| **Cosmos** (secp256k1, bech32, configurable HRP) | ATOM 118 · **Osmosis 10000118** · **Sei 19000118** · **Injective 22000119** · Kava 459 · Secret 529 · Thorchain 931 · Celestia (uses 118) |
| **Ed25519 / SLIP-0010** | SOL 501 · **TON 607** · **Aptos 637** · **Sui 784** · NEAR 397 · ALGO 283 · XLM 148 · HBAR 3030 · MultiversX 508 |
| **Other secp256k1** | TRX 195 · XRP 144 |

Bitcoin gets all four script types: BIP-44 P2PKH `m/44'/0'`, BIP-49 P2SH-P2WPKH `m/49'/0'`, BIP-84 P2WPKH `m/84'/0'`, BIP-86 P2TR `m/86'/0'`, mainnet and testnet/signet.

### 12.2 Tier 2 — Phase 3 additions

Each needs a curve or encoding we don't otherwise carry, so they're grouped and deferred: **Cardano** 1815 (ed25519-bip32, CIP-1852) · **Polkadot** 354 / **Kusama** 434 (sr25519) · **Tezos** 1729 · **Kaspa** 111111 · **Stacks** 5757 · **Filecoin** 461 · **Starknet** 9004 (Stark curve) · **Chia** 8444 (BLS12-381) · Casper 506 · Mina 12586 · Bittensor 1005 · Aleo 683 · Ergo 429 · Nervos 309 · Flow 539 · Radix 1022 · ICP 223 · Arweave 472.

### 12.3 Tier 3 — generic derivation (what "asset agnostic" actually means)

- **Arbitrary path mode:** any BIP-32 path, yielding extended keys, raw private/public keys, and WIF.
- **Custom coin registry:** an in-app editable table defining a coin as `{ name, coinType, curve, addressScheme, versionBytes|hrp, wifVersion }`. Schemes: `base58check`, `bech32`, `bech32m`, `keccak-eip55`, `ed25519-base58`, `raw-hex`. Export/import as JSON, so you can add a chain we never shipped — or share a definition.
- **Unknown coins always produce the correct private and public key** for the path, even with no address formatter. That is the recovery-critical data; the address is presentation.

Common features: account/change/index controls, batch generation (default 20, max 1000), hardened-vs-unhardened explainer, xpub/ypub/zpub/vpub conversion, **watch-only xpub mode**, and one-click "add to Registry". Phase 4: multisig `m/48'/…`, output descriptors, BLS12-381/EIP-2333.

---

## 13. Backup Lab

**SLIP-39** — full two-level group support (`T-of-N` groups with per-group member thresholds), 20-word and 33-word shares, SLIP-39's own 1024-word list, share passphrase extension, full checksum validation, and recovery with clear messages about *which* shares are inconsistent.

Compatibility warning shown **before** generation: SLIP-39 is supported by Trezor and a handful of others; **Ledger and Coldcard do not support it**, and wallet-side signing support for Shamir backups is thin. Excellent for distributed backup of a seed you control; a poor choice if you need broad portability. Single-share SLIP-39 is actively discouraged — it adds complexity without meaningfully improving on BIP-39.

**codex32 (BIP-93)** — *new in v0.3.* A checksummed Shamir scheme for BIP-32 seeds whose defining property is that **every operation can be done by hand**: generating a seed from dice, adding the checksum, producing shares, verifying a share, and recovering the seed, using only pen, paper, and printed lookup tables. It achieves this with a BCH code over GF(32) rather than a SHA-256 checksum, which is both error-*detecting* and error-*correcting*.

Why it earns a place next to SLIP-39: it is the only backup format you can verify without trusting a computer at all. You can pull a share out of a safe in ten years, check the checksum by hand in a few minutes, and know it's intact — without booting a machine, without this app, without trusting that any software still runs. For a backup meant to outlive its tooling, that is a genuinely different security property.

Caveat shown before use: wallet adoption remains limited (a Bitcoin Core import PR exists but is unmerged), so treat codex32 as a *backup* format rather than an interchange format. Coldbox implements generation, share splitting, checksum verification, and recovery, plus printable hand-computation worksheets and lookup tables so you can do it all offline on paper.

**Shamir39** — splits a BIP-39 mnemonic into mnemonic shares (Ian Coleman's scheme). Kept for compatibility with shares you may already hold, marked non-standard, with a recommendation to prefer SLIP-39 or codex32 for anything new.

**Raw SSS** — the `secrets.js` implementation from PassGuardian (Shamir over GF(2^n), field size configurable 3–20 bits, default 8), for splitting arbitrary secrets rather than mnemonics. Field/share-count limits shown explicitly, since field size is what caps the maximum share count.

**Practice, built in rather than footnoted:**

- **Verify-your-shares workflow:** a public BackupRecord starts incomplete. From its warm metadata card, the user asks the sealed realm to reconstruct a threshold subset typed from physical copies; only the closed result code and, on success, a public timestamp return to the warm shell. The reconstructed secret never crosses the boundary. Untested backups are the most common cause of loss. See [ADR-0041](../05-development/adr/0041-backup-record-verification-boundary.md).
- **Geographic distribution** prompts and co-location warnings.
- **Verification scheduling** with a due date per BackupRecord.
- **Naive-split warnings:** this folder's "Seed and Pass Phrase Split (Homemade Method)" is documented alongside why splitting 24 words into two halves leaks far more than people expect and badly weakens brute-force resistance.
- **Passphrase-vs-share** guidance: a BIP-39 passphrase is not a backup, it's a second secret that itself needs backing up.

**Printable outputs:** share cards sized to this folder's SeedQR templates, with fold lines, share index, threshold, group, date, and a "do not photograph" warning.

---

## 14. Portfolio manager

### 14.1 Transactions and lots

Transaction types: `buy · sell · swap · transfer-in · transfer-out · fee · income · staking · airdrop · gift-in · gift-out · lost`. Each records timestamp, asset, quantity, price per unit, quote currency, fee and fee asset, venue, optional wallet/address/txid link, notes, and tags.

Transfers between your own wallets are explicitly *not* disposals — the app models them as movement, preserving the original acquisition date and cost basis. Getting this wrong is the single most common error in portfolio trackers, and it silently corrupts every gain figure downstream.

**Lot pools are keyed by `(walletId, asset)`, not by asset alone.** This is a legal requirement, not a preference: [Rev. Proc. 2024-28](https://www.irs.gov/pub/irs-drop/rp-24-28.pdf) eliminated the universal-wallet method effective 1 January 2025, so cost basis methods now apply per wallet or account. Selling 1 BTC from your Coldcard consumes lots acquired *in that wallet*, not the cheapest BTC you happen to hold elsewhere. A tracker with one global pool per asset cannot produce correct figures for 2025 onward regardless of how it formats its output.

**Cost basis methods:** FIFO (default) and specific identification. Selectable per wallet, with per-transaction override.

HIFO and LIFO are offered as **specific-identification selection rules**, not as independent methods — because that is what they are. They carry the full contemporaneous-records burden, and the app says so when you select one rather than implying a standing election exists. Whenever anything other than FIFO is used, the engine writes a lot-level audit trail recording which lots were identified and on what basis; that trail is the substantiation. Average cost is available for jurisdictions that require it, marked as not generally available for US filers.

Changing a method recomputes and shows the delta before committing, so the choice is visible rather than silent.

### 14.2 Metrics

Per asset, per wallet, per chain, per tag, and total:

- Quantity held, average cost per unit, total cost basis
- Market value at median live price, with price age
- **Unrealized PnL** in currency and percent
- **Realized PnL** — per disposal, per period (YTD, last year, all time), with the matched lots shown so you can see *why* a number is what it is
- ROI, total invested, total withdrawn, net cash flow
- **Holding period** per lot, flagged short-term vs long-term at the 1-year boundary
- Fees paid, total and per venue
- Allocation percentages, concentration warnings
- Days held, acquisition date per lot, best and worst performers
- Portfolio value over time (needs historical prices; online only, cached)

### 14.3 Views

Holdings table with expandable per-lot detail. Transaction ledger with filtering by asset, type, venue, wallet, tag, and date range. Allocation donut by asset/chain/wallet. Value-over-time line chart. Realized-gains report by period, exportable as CSV.

### 14.4 Import and export

CSV import with a column-mapping UI and a dry-run preview showing what will be created before anything is written, plus duplicate detection on txid. CSV/JSON export of transactions, lots, and realized gains.

### 14.5 Tax reporting and CSV export

Full detail and rule citations in [us-tax-reporting.md](../04-reference/us-tax-reporting.md).

**Export set:**

| File | Contents |
|---|---|
| `form-8949-<code>.csv` | One per box code, in IRS column order |
| `schedule-d-summary.csv` | Totals per box code and term |
| `income.csv` | Ordinary income events — different form entirely |
| `lot-audit-trail.csv` | Every lot: acquired, disposed, method, wallet, selection basis |
| `transfers.csv` | Inter-wallet movements showing preserved dates and bases |
| `1099-da-reconciliation.csv` | Your records against each broker's form |
| `basis-allocation.csv` | Rev. Proc. 2024-28 safe harbor allocation, if recorded |
| `README.txt` | Method, date range, app version, caveats |

Plus **TurboTax and TaxAct CSV profiles**, since those are what people actually import, and their formats differ from the IRS column order and from each other.

**Form 8949 box codes.** Digital assets got their own checkboxes for tax year 2025 onward — short-term **G/H/I**, long-term **J/K/L**, depending on whether a 1099-DA was received and whether basis was reported on it. Boxes C and F are for other property and must not be used. A separate form page is required per code, so rows are grouped and emitted per code.

**Rows are per disposed lot, not per transaction.** A sale consuming three lots produces three rows, which is what the form requires.

**1099-DA reconciliation matters more than it sounds.** Brokers were not required to report cost basis for 2025 transactions, so the form shows proceeds with basis blank — and if you don't supply basis, the IRS computes gain as 100% of proceeds. The IRS matches 1099-DA against Form 8949 automatically, so the reconciliation report flags proceeds discrepancies, transactions on a broker form but not in your records, and vice versa.

**Wash sales are not applied to crypto** — it's property, not a security, so IRC §1091 doesn't reach it. The rule *does* apply to spot crypto ETFs, which are securities, so ETF-tagged holdings are flagged rather than silently given crypto treatment.

**Missing basis is never defaulted to zero.** A lot without basis is flagged as missing. Zero basis is a real answer with real consequences and must never appear by accident.

### 14.6 Not tax advice

The app computes cost basis and realized gains and formats records for filing. It does not know your circumstances, does not file anything, does not handle DeFi, LP tokens, bridges, or NFTs with any confidence, and is not a substitute for a professional. Tax rules change frequently; the reference doc carries a review date for exactly that reason. Stated in the UI, not buried here.

---

## 14a. Hardware wallet companion

**Positioning.** This tool does not hold your keys and does not sign. Your devices do that. Coldbox is the layer around them: it verifies what they tell you, records what you can't keep in your head, engineers your backups, and plans for the day you're not around. Everything below assumes you own several devices, possibly from different vendors, possibly in a multisig.

### 14a.1 Device registry

The `Device` entity carries vendor, model, serial, current firmware and its install date, purchase date and source, tamper-evidence check on arrival, PIN set and rotation dates, whether a passphrase is used, the seed fingerprints it holds, linked backup records, physical location, lifecycle status (in use / retired / lost / destroyed / RMA'd), and notes.

A device with passphrase wallets holds **multiple distinct wallets**, each with its own master fingerprint. The model reflects that: one device links to many `Wallet` records, each with its own fingerprint, paths, and backup state. Tracking "which passphrase gives which wallet" is exactly the thing people lose.

### 14a.2 Verification workflows — the core value

Everything here answers a question a hardware wallet alone cannot answer, because a compromised computer sits between you and the device.

**Master fingerprint check.** Your device displays an XFP. Coldbox derives the XFP from your seed inside the cold realm. You compare eight hex characters. This confirms the device restored the seed you think it did — *without either side revealing the seed*.

**Receive address verification.** The highest-value check in the whole tool. Address-swapping malware alters the address your computer displays while the device shows the true one. Coldbox independently derives addresses from your xpub and lets you batch-compare against what the device screen shows. If they diverge, something on your machine is lying to you.

**Clipboard round-trip verification.** The check above proves the *displayed* address was right. It says nothing about what arrived in the destination field — a clipboard hijacker rewrites the address between the copy and the paste, every display stays correct, and the funds still leave. So Coldbox compares, character-exact and over the whole string, what you paste back *out of* the destination, and reports the index of the first divergent character.

Two things make this work, and both are commonly got wrong elsewhere: the comparison is never first-four/last-four, because address poisoning exists specifically to defeat end-matching; and a checksum pass is not a verification, because a swapped address is a valid address that passes every checksum. An optional clipboard volatility canary re-reads the clipboard with no user action, making it the one check here that can affirmatively detect a hijacker rather than merely failing to find one. Full specification in [address-verification.md](address-verification.md); rationale in [ADR-0021](../05-development/adr/0021-clipboard-address-verification.md).

**xpub verification.** Confirm the xpub your desktop wallet holds matches what the device actually exports — the root of every address it will ever show you.

**Backup verification without touching the device.** Restore your metal or paper backup into Coldbox offline, derive the fingerprint, compare to the device. You've now proven the backup works without wiping a device to test it, which is how people usually find out their backup was wrong — too late.

**Passphrase verification.** Confirm a passphrase produces the wallet you expect *before* sending funds to it. A single mistyped character creates a valid, empty, permanently different wallet, and this is one of the most common ways people lose money.

### 14a.3 Vendor knowledge base

A dated, user-editable matrix of default derivation paths and backup-format support per device: Ledger, Trezor, Coldcard, BitBox02, Blockstream Jade, Keystone, SeedSigner, Krux, Foundation Passport, Specter DIY.

Columns: BIP-39 · SLIP-39 · codex32 · Seed XOR · dice entropy input · SeedQR · miniscript · MuSig2 · PSBT transport (USB / microSD / QR / NFC) · default paths per script type.

Known asymmetries worth encoding: **Ledger and Coldcard do not support SLIP-39; Trezor does.** Coldcard supports dice entropy and Seed XOR natively. SeedSigner, Krux, and Coldcard Q read SeedQR. Coldcard, Jade, and Ledger support native-segwit miniscript; taproot miniscript is on Coldcard, Ledger, and Specter DIY.

**Honesty constraint:** vendor firmware changes faster than this file will. The matrix is dated, marked as a user-maintained reference rather than authoritative, and never gates functionality — it informs, it doesn't decide.

### 14a.4 Seed XOR

Coldcard's native split: a BIP-39 seed is divided into N BIP-39 seeds that XOR back to the original. Every part is itself a valid seed, so each can carry a small decoy balance. It is **N-of-N only** — there is no threshold, and losing one part loses everything. Coldbox implements split and combine, with that limitation stated up front, since people routinely mistake it for Shamir.

### 14a.5 Airgapped transfer

SeedQR and Compact SeedQR for SeedSigner/Krux/Coldcard Q. **BC-UR (UR2) animated QR** for moving xpubs, descriptors, and PSBTs between devices and software without USB. microSD file workflows. A **PSBT viewer** — decode and display inputs, outputs, change, and fees in plain language so you can see what you're about to sign. It never signs; that's the device's job and keeping it that way is the point.

### 14a.6 Multisig quorum management

Which device holds which key, the quorum config and descriptor, per-key backup status and location, and a **survivability analysis**: if this device dies, or this location burns, can you still spend? Existing tools track multisig wallets; almost none track whether your quorum is still actually reachable. Descriptor and BIP-388 wallet policy import/export for re-registering the wallet on a replacement device.

### 14a.7 Device lifecycle

Per-device setup checklist, tamper check on arrival, firmware update log with reminders, PIN rotation tracking, retirement and wipe procedure, and replacement planning. Feeds the Backup Health dashboard: a device with no verified backup, or firmware three years stale, surfaces as an alert.

---

## 15. UI and interaction

> **[design-system.md](design-system.md) is authoritative for anything a user can see** — tokens, typography, components, the copy contract, and the accessibility floors. It supersedes the visual direction originally given in this section. Rationale in [ADR-0009](../05-development/adr/0009-comic-visual-language.md). The rules below that are *not* purely visual — secret display, mobile, accessibility, onboarding — remain in force.

High-contrast dark by default with a light mode for printing, rendered in the comic visual language: heavy outlines, flat fills, hard offset shadows, halftone field. **Security surfaces take the shell and none of the behaviour** — no tilt, no animation, no stickers — and the display face never carries a seed word, address, key, hash, path, or amount. Data is always monospace. Status colors carry meaning: green = verified / no external reachability detected, amber = online/checking/attention, red = danger/secret-visible or isolation failure, and color is never the only channel.

**Secret display rules, no exceptions:** masked by default; press-and-hold or explicit toggle with 30 s auto-remask; red border and "secret visible" indicator; word-by-word numbered display for mnemonics with a large-print mode for transcription; per-field opt-in copy with a visible 30-second clipboard countdown; no secret ever in the URL, page title, `localStorage`, or session-restore data.

**Mobile:** bottom tab bar, thumb-reachable actions, dice entry as a large numeric pad, tables collapsing to cards, pinch-zoom left enabled — never `user-scalable=no`, which breaks both accessibility and careful transcription.

**Accessibility:** full keyboard navigation, visible focus rings, ARIA labels, ≥ 4.5:1 contrast, no reliance on color alone.

**Onboarding:** a first-run screen stating what the tool is, what it is not, the recommended posture, and the three things most likely to lose your coins — untested backups, forgotten passphrases, and undocumented derivation paths.

---

## 16. Dependencies and bundle budget

Zero runtime dependencies. Everything vendored, pinned, listed in Provenance with upstream release hashes.

| Component | Purpose | Est. size |
|---|---|---|
| `@noble/hashes` | SHA-2/3, HMAC, PBKDF2, RIPEMD-160, keccak | 55 KB |
| `@noble/curves` | secp256k1, ed25519 | 90 KB |
| `@noble/ciphers` | AES-GCM, ChaCha20-Poly1305 fallback | 30 KB |
| `@scure/bip32` + `bip39` + `base` | HD derivation, mnemonics, encodings | 30 KB |
| argon2 WASM | Argon2id | 60 KB (base64) |
| SLIP-39 + `secrets.js` | Shamir schemes | 45 KB |
| QR encoder + `jsQR` | generation + optional scanning | 55 KB |
| Chain address formatters | Tier 1 encodings | 60 KB |
| BIP-39 wordlists (all ten languages) | | 103 KB |
| codex32 + Seed XOR + BIP-329 + BC-UR | new in v0.3 | 45 KB |
| Help content (three depths, guides, glossary) | compiled from `docs/` | ≈ 344 KB (measured; see note below) |
| SLIP-39 wordlist | | 8 KB |
| EFF wordlists | Diceware | 75 KB |
| BIP/SLIP reference excerpts | | 120 KB |
| Portfolio engine + charts | lots, PnL, SVG charts | 60 KB |
| Price/balance adapters | 5 price + 5 chain sources | 35 KB |
| App code + CSS + icons | | 450 KB |
| **Total** | | **≈ 1.9 MB** (revised for the measured help-content figure; every other row remains a pre-implementation estimate) |

Comfortably under budget. The existing Ian Coleman standalone is 4.55 MB by itself.

**Help content row, measured (2026-08-07, full P0.17 backfill):** P0.17's compiled `HELP_CONTENT` (the complete glossary and all nine guides, JSON-embedded per-depth HTML) measures **≈ 344 KB**, not the 180 KB estimated above. Most of the gap is the existing build-time JSON-escaping helper (`jsonScriptLiteral()`, shared with `PROVENANCE_LIBRARIES` and the cold-realm document) expanding every `<`/`>` in the compiled HTML to a 6-character `\uXXXX` escape — an earlier draft also duplicated a full plain-text copy of every depth for search, which alone cost roughly another third; deriving search text from the already-embedded HTML at runtime instead (see [ADR-0016](../05-development/adr/0016-help-content-compiler-and-search.md)) removed that. Flagged here rather than silently reconciled, per doc-hygiene.md rule 4 — this line item, and the total, are updated to the real measured figure rather than the original estimate.

---

## 17. Build phases

| Phase | Contents |
|---|---|
| **0 — Foundation** | Shell, two-realm bootstrap, postMessage schema, CSP + airgap guard, capability self-check, vault format with compartments, **multi-record wrapped-DEK block**, **keyfile unlock**, lock/unlock/save/verify, provenance + self-hash, **reproducible build pipeline + CI attestation**, **Help framework** |
| **1 — Core wallet** | Entropy Lab + **Entropy Health Meter**, Seed Forge, Derivation (Bitcoin + EVM + generic path mode), Registry CRUD, notes and tags, QR generation, **Device registry + fingerprint/address verification workflows** |
| **2 — Backup** | SLIP-39, **codex32**, Shamir39, raw SSS, **Seed XOR**, **vault recovery shares**, BackupRecords, verify-your-shares, health dashboard, printable cards and hand-computation worksheets |
| **3 — Portfolio & online** | Price aggregation, multi-currency + Frankfurter FX, balance lookups, transactions and lots, PnL engine, dashboard, charts, CSV import/export, **BIP-329 label import/export** |
| **4 — Full coverage** | Tier 1 remaining chains, custom coin registry, Recovery Assistant, Verify Bench, Passphrase Studio, BIP-85, **Nostr NIP-06**, **BC-UR animated QR**, **descriptors + BIP-388**, Reference |
| **5 — Advanced** | Tier 2 chains, multisig quorum analysis, miniscript read-only, BLS/EIP-2333, PSBT viewer, silent payments (experimental), quantum readiness panel, ERC-4337 records, Border Wallets, inheritance letter, camera scanner |

Each phase produces a releasable, hash-signed file. You can stop after any phase and have something coherent.

---

## 18. Help and learning system

A first-class feature, not a tooltip layer. The tool spans dice entropy and Shamir thresholds and cost basis; a user should never hit a control they can't understand from inside the app.

### 18.1 Three depth levels

Every explanation exists at three depths, selected by a global preference (changeable anywhere, remembered):

| Level | Voice | Example — *"What is an xpub?"* |
|---|---|---|
| **Plain** | No jargon. Analogy first | "A master key that can create all your receiving addresses but can't spend anything. Safe to give to wallet software that watches your balance — but it reveals your entire transaction history, so don't post it publicly" |
| **Working** | Correct terms, defined on use | "An extended public key. Combined with a chain code it derives every child public key below its path, so it generates addresses without exposing private keys. Anyone holding it can link all your addresses forever" |
| **Technical** | Full precision, spec references | "BIP-32 serialized extended public key: 4-byte version, depth, parent fingerprint, child number, 32-byte chain code, 33-byte compressed point. Non-hardened children derive as K_i = K_par + G·HMAC-SHA512(c_par, K_par ‖ i)_L" |

### 18.2 Delivery

- **`?` on every panel** opens contextual help for that specific screen at your chosen depth.
- **Inline glossary** — jargon carries a dotted underline; tap for a definition without leaving the screen.
- **"Why does this matter?"** on consequential controls — derivation path, script type, share threshold, cost basis method — explaining what goes wrong if you get it wrong.
- **Guided walkthroughs** for the flows where mistakes are expensive: first wallet, first backup, verifying a hardware wallet, recovering a seed, setting up inheritance.
- **Searchable help index**, fully offline. No network, no external docs links that rot.
- **First-run orientation** covering what the tool is, what it isn't, and the three things most likely to lose your coins.

### 18.3 Single-sourced with the repo docs

Help content lives in the repository as markdown (`docs/03-guides/` and `docs/00-overview/glossary.md`) and is **compiled into the HTML at build time**. There is exactly one copy of every explanation. In-app help and the GitHub docs cannot drift apart, and a documentation fix is a one-line change that ships to both.

---

## 19. Emerging standards

Surveyed for v0.3. Adopted where the value is real and the spec is stable; noted where it isn't.

| Standard | Status | Decision |
|---|---|---|
| **BIP-329** wallet labels | Merged; shipped in Sparrow, Nunchuk, BitBoxApp, BTCPay | ✅ **Adopt, Phase 3.** Makes your notes portable and survives this project |
| **codex32 (BIP-93)** | Final BIP; limited wallet adoption | ✅ **Adopt, Phase 2.** The only backup you can verify by hand with no computer |
| **BC-UR / UR2** animated QR | De-facto airgap standard | ✅ **Adopt, Phase 4.** Core to hardware wallet workflows |
| **Output descriptors + BIP-388** wallet policies | Widely supported | ✅ **Adopt, Phase 4.** Needed for multisig re-registration |
| **Miniscript** | Nunchuk shipped generalized miniscript 2026; Coldcard/Jade/Ledger support native segwit, taproot on Coldcard/Ledger/Specter DIY | ✅ **Adopt read-only, Phase 5.** Parse, display, and record timelock inheritance policies. No signing |
| **BIP-352 Silent Payments** | Spec complete, v1.1.0 March 2026 — but no wallet has shipped support as of mid-2026 | ⚠️ **Phase 5, marked experimental.** Generate and store `sp1` addresses; revisit when wallets ship |
| **BIP-360 (P2MR/P2QRH)** post-quantum | Merged into bitcoin/bips Feb 2026; **not activated**, no consensus change | ⚠️ **Explainer now, derivation later.** See §19.1 |
| **MuSig2 (BIP-327)** | Standardized; Ledger app 2.4.0 ships it, but miniscript+MuSig2 is software-keys-only for now | ⚠️ **Record-keeping only.** Track that a wallet uses it; revisit when hardware support matures |
| **FROST** threshold signatures | Active development, not deployed | 👀 Watching |
| **Nostr NIP-06** key derivation | Stable, `m/44'/1237'` | ✅ **Adopt, Phase 4.** Cheap, fits asset-agnostic derivation, npub/nsec encoding |
| **ERC-4337 smart accounts** | Widely deployed | ✅ **Registry support, Phase 5.** A smart account address isn't derived from your key the usual way, so it needs its own record type linking account address to owner key |
| **Border Wallets** entropy grid | Niche but real | ✅ **Phase 5**, Entropy Lab addition |
| **Ecash / Fedimint / Ark / Lightning** | Active | ❌ Out of scope. Different custody model entirely |
| **EIP-6963 / EIP-1193** injected wallet providers | Final; implemented by every current EVM wallet extension | ❌ **Declined** — [ADR-0020](../05-development/adr/0020-injected-providers-rejected-and-neutered.md). Provider calls bypass page CSP entirely, so integrating one would have put the first carve-out into [threat-model.md](../02-security/threat-model.md)'s design commitments in exchange for a feature worth very little. The investigation did produce a real fix, shipped as P0.21: the cold realm now treats provider presence inside itself as an isolation failure |
| **ERC-7730** clear-signing metadata | Draft; Ledger runs a public descriptor registry **and implements it on-device** | ❌ **Declined** — [ADR-0019](../05-development/adr/0019-no-transaction-workbench.md). Coldbox cannot fetch the registry, so it could only use hand-imported descriptors with unverifiable provenance — a weaker duplicate of a check the hardware wallet already performs. Revisit if on-device support stalls |

### 19.1 On quantum, honestly

Two claims worth separating, because the topic attracts more noise than signal.

**Your vault encryption is already fine.** AES-256 and Argon2id are symmetric; Grover's algorithm halves effective key strength, so AES-256 retains ~128 bits against a quantum adversary. That is not a problem, and no post-quantum migration of the vault format is needed.

**Your on-chain coins are a different question.** The exposure is ECDSA/Schnorr public keys, which become vulnerable once revealed. A never-reused address whose pubkey has never been on-chain is hashed and therefore far better protected than one that has spent. BIP-360 merging in February 2026 means the *documentation* standard is settled, not that activation is near or endorsed.

What Coldbox does about it: a **quantum readiness panel** that inventories your addresses, flags reuse and exposed public keys, explains the actual risk without theatre, and — if and when P2MR activates — adds derivation support. What it does not do is imply urgency that doesn't currently exist.

---

## 20. Open source and release engineering

Free and open source, published on GitHub. For a tool that handles seeds, that raises the bar rather than lowering it — "the source is public" only means something if users can prove the file they downloaded came from that source.

### 20.1 Reproducible builds — non-negotiable

The published HTML **must be byte-reproducible from source by anyone**. Concretely:

- A deterministic build script with a pinned toolchain (exact Node version, no floating dependencies), producing identical bytes on any machine.
- No timestamps, no build machine paths, no random ordering, no minifier nondeterminism baked into output.
- Vendored dependencies committed to the repo with upstream release hashes, plus a `verify-vendor` script that re-downloads upstream and confirms byte equality. Nothing is pulled at build time.
- CI builds every tagged release and publishes the resulting SHA-256 as a build attestation. If CI's hash and the maintainer's hash disagree, the release doesn't ship.
- `docs/02-security/verification.md` walks a non-expert through reproducing the build and comparing hashes.

Without this, "open source" is a claim about a repository, not about the file in the user's hands.

### 20.2 Release artifacts

Each GitHub release: the HTML, its `.sha256`, a detached GPG `.asc` signature, the reproducible-build attestation, and a changelog. Signing key fingerprint published in the README and in-app.

### 20.3 Repository hygiene

`SECURITY.md` with a responsible-disclosure path and explicit scope. `LICENSE` — **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`). Copyleft rather than the ecosystem-norm permissive licence, because the central claim of this project is that the file in your hands can be rebuilt from source you can read, and a permissive licence lets a modified single-file build be distributed with no source obligation at all. Reasoning, rejected alternatives, and the vendored-dependency compatibility analysis in [ADR-0018](../05-development/adr/0018-agplv3-license.md). `CONTRIBUTING.md`. Issue and PR templates. A clear no-warranty disclaimer, present in both the repo and the app.

**AGPLv3 §5(d) makes the in-app licence notice a shipping requirement, not a courtesy.** An interactive UI conveying a covered work must display Appropriate Legal Notices — copyright, absence of warranty, the right to convey under the same licence, and how to view the licence text. The provenance panel carries them, and the full licence text ships inside the bundle. No release may be tagged before that lands; see [ROADMAP.md](../05-development/ROADMAP.md) P0.20 and [release-checklist.md](../05-development/release-checklist.md).

**What the AGPL does and does not buy, stated precisely.** §5(c) is the clause doing the work: a distributed modified version must be licensed as a whole under the same terms, with prominent notices that it was modified and when. §13's remote-network-interaction clause binds only someone who modifies Coldbox *and* serves it over a network — the hosted deployment this section warns against, and nothing else, since Coldbox is designed to run from `file://`. The licence is not a privacy control and confers no runtime guarantee whatsoever; the no-telemetry claim below rests on the CSP allowlist and the absence of analytics code, both checkable in the source, and would be equally true under any licence.

**A hosted copy is not offered.** Serving this from GitHub Pages would invite people to generate real keys on a page they didn't verify, delivered over a connection they don't control — the exact failure mode the design exists to prevent. Download, verify, run locally. The README says so in the first screenful.

**No telemetry or analytics, verifiably.** The claim is checkable: the CSP allowlist is in source, the fixed content-free reachability probes are documented in §6.3/API sources, and there is no Coldbox collector or analytics code to find.

---

## 21. Documentation structure

Everything about the project lives in the repo, in one tree, single-sourced with the app's Help system.

```
coldbox/
├─ README.md                 what it is, verify-before-use, quick start
├─ CHANGELOG.md
├─ LICENSE
├─ SECURITY.md               disclosure policy and scope
├─ CONTRIBUTING.md
├─ docs/
│  ├─ 00-overview/
│  │  ├─ what-is-this.md     plain-English tour of every tool
│  │  ├─ quick-start.md
│  │  ├─ glossary.md         ← compiled into in-app help
│  │  └─ faq.md
│  ├─ 01-spec/
│  │  ├─ SPEC.md             this document
│  │  ├─ architecture.md     two-realm detail, message schema
│  │  ├─ vault-format.md     byte-level .cbx
│  │  ├─ data-model.md
│  │  └─ chain-registry.md
│  ├─ 02-security/
│  │  ├─ threat-model.md
│  │  ├─ crypto-choices.md
│  │  ├─ csp-policy.md
│  │  ├─ verification.md     reproduce the build, check the hash
│  │  └─ audit-notes.md
│  ├─ 03-guides/             ← compiled into in-app help
│  │  ├─ first-wallet.md
│  │  ├─ verify-a-hardware-wallet.md
│  │  ├─ backup-slip39.md
│  │  ├─ backup-codex32.md
│  │  ├─ recover-a-seed.md
│  │  ├─ multisig-quorum.md
│  │  ├─ portfolio-setup.md
│  │  ├─ going-airgapped.md
│  │  └─ inheritance-planning.md
│  ├─ 04-reference/
│  │  ├─ supported-chains.md
│  │  ├─ derivation-paths.md
│  │  ├─ hardware-wallet-matrix.md
│  │  ├─ entropy-and-strength.md   how the health meter works
│  │  ├─ api-sources.md
│  │  └─ standards.md        BIP/SLIP index — what we implement and why
│  ├─ 05-development/
│  │  ├─ build.md            reproducible build instructions
│  │  ├─ dependencies.md     pinned versions + upstream hashes
│  │  ├─ testing.md
│  │  ├─ release-checklist.md
│  │  └─ adr/                architecture decision records
│  │     ├─ 0001-two-realm-architecture.md
│  │     ├─ 0002-separate-vault-file.md
│  │     ├─ 0003-argon2id-parameters.md
│  │     ├─ 0004-median-not-mean-prices.md
│  │     ├─ 0005-no-duress-compartment.md
│  │     └─ 0006-companion-not-replacement.md
│  └─ assets/
├─ src/
├─ vendor/                   pinned upstream libs + hashes
├─ build/
└─ test/
```

**Architecture Decision Records** are the piece most projects skip and later regret. Each is a short note: what we decided, what we considered, why we chose this, and what would change our mind. Six months from now, when you or a contributor asks "why is there an iframe in here," ADR-0001 answers it in a paragraph.

---

## 22. Name candidates

"Coldbox" works — plain, descriptive, memorable, no significant collision in the crypto space. Alternatives, with the reasoning that makes each one more than a word:

| Name | Why |
|---|---|
| **Cairn** | A stack of stones left to mark the path for whoever comes after. Backups, inheritance, and continuity in one image. Short, unclaimed, easy to say |
| **Lodestone** | The stone that always points home. Evokes recovery — the thing that gets you back |
| **Redoubt** | A small, self-contained fortification you retreat to. Almost literally the architecture |
| **Flint** | Small, portable, needs no power, works anywhere, and makes fire when you need it |
| **Bedrock** | What everything else rests on. Slightly generic; some minor prior use |
| **Deadbolt** | Unpretentious and obvious. Reads as security without trying |
| **Keystone** | ⚠️ Avoid — it's an existing hardware wallet brand |
| **Codex** | Pairs neatly with codex32; a book of preserved knowledge. A touch generic |

My pick would be **Cairn** — it carries the inheritance and continuity meaning that's genuinely central here, and it's short enough to live comfortably as a GitHub repo name. **Coldbox** remains the safe, self-explanatory choice. Worth a GitHub and trademark search before committing either.

---

## 23. Decisions and remaining questions

### 23.1 Settled

| # | Decision |
|---|---|
| 1 | **`vaultOnlinePolicy` = `public-only`** by default. Portfolio works online, secrets sealed |
| 2 | **All ten BIP-39 languages** embedded (+90 KB) |
| 5 | **Multi-currency**, using CoinGecko's native `vs_currency` plus **Frankfurter** for fiat↔fiat — free, no key, no signup (§7.1a) |
| 6 | **Historical backfill available, manual always possible**, three modes, Manual as default (§7.1b) |
| — | **Entropy Health Meter** on every secret-creation screen, measuring min-entropy with claimed-vs-measured bits shown side by side (§11.1a) |
| 3 | **Keyfile second factor included, off by default.** Warns clearly that a lost or byte-altered keyfile means a permanently unopenable vault |
| 4 | **Vault recovery shares: format reserved in Phase 0, feature shipped in Phase 2.** The wrapped-DEK block supports multiple unlock records from the first release, so adding shares later needs no format bump and no migration. The splitting UI lands with SLIP-39 in Phase 2 |
| 7 | **QuickHash binaries dropped**, replaced by a built-in hasher with no size ceiling: streaming, multi-algorithm single-pass, recursive folder hashing, and interoperable `sha256sum`/JSON manifests with diff and verify modes (§11.2) |
| 8 | **No duress compartment.** Removed |
| — | **Companion to hardware wallets, not a replacement** (§14a) |
| — | **FOSS on GitHub**, AGPL-3.0-only, reproducible builds (§20). Copyleft chosen over the earlier MIT recommendation so a modified single-file build cannot be distributed without its source — [ADR-0018](../05-development/adr/0018-agplv3-license.md) |
| — | **Plain-English Help at three depth levels**, single-sourced with repo docs (§18) |

### 23.2 Still open

**None.** All nine questions from v0.2 are resolved. The spec is ready to build against.

New questions will arise during Phase 0 — particularly around the exact `postMessage` schema and how the cold realm behaves on browsers where the sandbox misbehaves. Those get answered in code and recorded as ADRs rather than held open here.

---

## 24. Reality check

**Storing seed phrases in an encrypted file on a general-purpose computer is genuinely weaker than metal-only storage.** Argon2id with a strong passphrase is a real barrier, but a metal plate in a safe has no software attack surface at all. Hence: `storedSecret` is opt-in per seed and empty by default, and the Registry is fully useful with zero secrets stored.

**A browser is not a hardware wallet, and this tool doesn't pretend to be one.** It holds no keys and signs nothing. Its job is the layer your devices can't do for you: verifying that what your screen shows matches what your device actually holds, engineering backups that survive, tracking which of your devices holds which key, and making sure someone can find all of it when you're not around. For generating keys that will hold meaningful value, a dedicated device or an amnesic OS remains the right answer — and this tool is built to make those devices easier to trust, not to replace them.

**The two-realm split is the load-bearing decision.** It's what lets you run the tools on a connected laptop without that being reckless, and it's why the boot self-check hard-fails rather than silently degrading if the cold realm can't be established. If the sandbox isn't there, the guarantee isn't there, and the app should refuse rather than pretend.

**The thing most likely to lose your coins isn't cryptography, it's process** — an untested backup, a forgotten passphrase, an undocumented derivation path, or heirs who don't know the vault exists. That's why verify-your-shares, the health dashboard, and the inheritance letter are core features rather than extras.

---

## Sources

- [SLIP-0044 registered coin types](https://raw.githubusercontent.com/satoshilabs/slips/master/slip-0044.md) — all coin type numbers verified against the live registry
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — Argon2id parameters
- [CoinGecko API rate limits](https://support.coingecko.com/hc/en-us/articles/4538771776153-What-is-the-rate-limit-for-CoinGecko-API-public-plan) and [Demo key signup](https://support.coingecko.com/hc/en-us/articles/21880397454233-User-Guide-How-to-sign-up-for-CoinGecko-Demo-API-and-generate-an-API-key)
- [CoinMarketCap API FAQ](https://coinmarketcap.com/api/faq/) — confirms no browser CORS support
- [Coinbase CORS documentation](https://docs.cdp.coinbase.com/coinbase-business/api-architecture/cors)
- [Blockstream Esplora API](https://github.com/Blockstream/esplora/blob/master/API.md) — address balance endpoints, keyless
- [Trezor SLIP-39 FAQs](https://trezor.io/guides/backups-recovery/general-standards/slip39-faqs) and [SLIP39 compatibility caveats](https://www.crypto-recovery.ch/en/slip39-7-reasons-shouldnt-use-it/)
- [Trezor coins BIP-44 paths](https://docs.trezor.io/trezor-firmware/misc/coins-bip44-paths.html)
- [BIP-93 codex32](https://github.com/bitcoin/bips/blob/master/bip-0093.mediawiki) and [hand-computation walkthrough](https://inbitcoinwetrust.substack.com/p/the-ultimate-bitcoin-backup-computing)
- [BIP-329 wallet labels](https://github.com/bitcoin/bips/blob/master/bip-0329.mediawiki) · [bip329.org](https://bip329.org/) · [BitBox adoption note](https://blog.bitbox.swiss/en/import-and-export-wallet-labels-with-bip-329/)
- [BIP-352 Silent Payments](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) and [wallet support comparison](https://www.spark.money/tools/bitcoin-silent-payment-wallet-comparison)
- [BIP-360 P2MR pull request](https://github.com/bitcoin/bips/pull/1670) and [post-quantum migration analysis](https://thebitcoinpodcast.com/reports/bitcoin-post-quantum)
- [Nunchuk on generalized miniscript (2026)](https://nunchuk.io/blog/miniscript-programmable-bitcoin) and [MuSig2 in the Ledger Bitcoin app](https://www.ledger.com/blog-musig2-ledger-bitcoin-app)
- [Frankfurter free FX API](https://frankfurter.dev/) — ECB rates, no key, self-hostable
