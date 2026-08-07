# Glossary

Every term the app uses, in plain English first. This file compiles into the in-app help, so the definition you read here is the definition you'll see when you tap a term.

Most entries below carry three explanations — **plain** (no jargon, analogy first), **working** (correct terms, defined on use), and **technical** (full precision, spec references) — per [SPEC.md §18](../01-spec/SPEC.md). Pick a depth anywhere in the app; it's remembered everywhere, including here.

---

## Seeds and keys

**Seed phrase** (also *recovery phrase*, *mnemonic*)
::: plain
12 or 24 ordinary words that stand in for your wallet's master key. These words *are* your money — anyone who has them can spend everything, and anyone who doesn't can't get it back, no customer support line included.
:::
::: working
12 or 24 words encoding your wallet's master key, standardised as BIP-39. Anyone with them can spend everything; anyone without them can't recover it.
:::
::: technical
A BIP-39 mnemonic encodes 128–256 bits of entropy plus a 4-bit-per-word-count checksum, mapped through a fixed 2048-word list (11 bits/word). The mnemonic plus an optional passphrase is stretched via PBKDF2-HMAC-SHA512 (2048 rounds) into a 512-bit seed, which BIP-32 then treats as its master key material.
:::

**Entropy**
::: plain
Raw randomness. Your seed phrase is a human-readable way of writing down a random number, and how genuinely random that number was determines whether anyone could ever guess it.
:::
::: working
The randomness underlying a seed phrase. 128 bits of entropy gives a 12-word phrase, 256 bits gives 24 words; the checksum in BIP-39 does not add entropy, it only catches transcription errors.
:::
::: technical
Entropy must come from a CSPRNG (`crypto.getRandomValues`, never `Math.random`). BIP-39 appends `ENT/32` checksum bits (SHA-256 of the entropy, truncated) before splitting into 11-bit word groups, so a 128-bit input yields 132 bits → 12 words, and a 256-bit input yields 264 bits → 24 words.
:::

**Passphrase** (also *25th word*, *hidden wallet*)
::: plain
An optional extra secret on top of your seed phrase. Adding one creates a completely separate wallet — change even one character and you get a different wallet: valid, empty, and unrecoverable unless you remember exactly what you typed. It's a second secret, not a backup, and it needs backing up too.
:::
::: working
An optional BIP-39 extension that derives a different master seed from the same mnemonic. Any change to the passphrase string produces a distinct, valid, and otherwise unrelated wallet.
:::
::: technical
The passphrase is UTF-8 NFKD-normalized and used as the PBKDF2-HMAC-SHA512 salt (`"mnemonic" + passphrase`), so it participates in the same 2048-round stretch that produces the 512-bit seed — there is no separate verification step, which is why a wrong passphrase silently opens a different, empty wallet instead of failing.
:::

**Private key**
::: plain
The secret number that lets you spend from one address. Your seed phrase generates these, one after another, as needed.
:::
::: working
The secret scalar that authorises spending from a single address, derived from your seed phrase via a derivation path.
:::
::: technical
For secp256k1 chains, a private key is a 256-bit integer `d` in `[1, n-1]` where `n` is the curve order; BIP-32 derives child private keys via HMAC-SHA512 over the parent key and chain code.
:::

**Public key**
::: plain
Derived from a private key in a one-way street — you can compute the public key from the private one, but never the reverse. Safe to share; used to produce addresses.
:::
::: working
The point on the elliptic curve corresponding to a private key, computed one-way (private → public, never the reverse). Shareable, and used to derive addresses.
:::
::: technical
For secp256k1, the public key is `K = d·G`, where `G` is the curve's base point. Reversing this (recovering `d` from `K`) is the elliptic-curve discrete logarithm problem — believed computationally infeasible with a classical computer at current key sizes.
:::

**Address**
::: plain
Where coins are sent — like an account number. Derived from a public key, and safe to hand out, though handing it out links your transactions together in public.
:::
::: working
An encoding of a public key (or script) that coins are sent to. Different address formats (legacy, SegWit, Taproot) encode this differently but all derive from the same underlying key material.
:::
::: technical
A Bitcoin address is a checksum-protected encoding (Base58Check for legacy/nested-SegWit, Bech32/Bech32m for native SegWit/Taproot) of a hash of the public key or script — e.g. `HASH160(pubkey)` for P2PKH, `SHA256(pubkey)` for P2WPKH's witness program.
:::

**Fingerprint** (also *XFP*, *master fingerprint*)
::: plain
Eight characters that identify a wallet without revealing anything secret about it. Both your hardware wallet and Coldbox can compute one, so comparing them proves the two hold the same seed — without either one ever showing the seed itself.
:::
::: working
An 8-hex-character identifier derived from a seed's master public key. Comparing fingerprints between a hardware wallet and Coldbox confirms they hold the same seed, safely, since the fingerprint reveals nothing exploitable.
:::
::: technical
Per BIP-32, the master fingerprint is the first 4 bytes of `HASH160(compressed master public key)` = `RIPEMD160(SHA256(K))`, rendered as 8 hex characters. It identifies a specific master key without exposing it, and is used throughout PSBTs and multisig descriptors to reference keys unambiguously.
:::

---

## Derivation

**Derivation path**
::: plain
The recipe that turns one seed into many addresses, written like `m/84'/0'/0'/0/0`. Different recipes give different addresses from the same seed — which is why "my funds are missing" is very often really "my wallet is reading the wrong recipe."
:::
::: working
A sequence of indices (per BIP-32/44/49/84/86) describing how to derive a specific key from a master seed. The same seed at a different path produces an entirely different, unrelated-looking address.
:::
::: technical
Written as `m / purpose' / coin_type' / account' / change / index`, each `/`-separated segment is a 32-bit child-derivation index (apostrophe = hardened, index + 2^31); BIP-32 derives each child via HMAC-SHA512 keyed on the parent chain code.
:::

**BIP-32**
::: plain
The standard that lets one seed produce as many addresses as you'll ever need, instead of needing a separate secret for each one.
:::
::: working
The hierarchical-deterministic (HD) wallet standard: one master seed derives an unlimited tree of child keys, each reproducible from the seed plus its path. Everything else in this section builds on it.
:::
::: technical
BIP-32 derives a child key and 256-bit chain code from a parent via `HMAC-SHA512(chain_code, parent_pubkey_or_privkey ‖ index)`, splitting the 512-bit output into a 256-bit key-tweak and the next chain code. Hardened derivation (index ≥ 2^31) uses the parent private key in the HMAC input, so it cannot be computed from a public key alone.
:::

**BIP-39**
::: plain
The standard that turns random entropy into memorable words, and turns those words back into a seed. It's why seed phrases are made of ordinary words instead of random letters.
:::
::: working
The mnemonic-encoding standard: entropy plus a checksum, mapped to words from a fixed 2048-word list, then stretched into a seed via a passphrase-salted key derivation.
:::
::: technical
See "Seed phrase" above for the exact bit layout and PBKDF2-HMAC-SHA512 stretch; word lists are language-specific but every implementation must agree on the same list for a mnemonic to round-trip correctly.
:::

**BIP-44 / 49 / 84 / 86**
::: plain
Four different conventions for organizing addresses under one seed, each producing a different-looking Bitcoin address. Coldbox needs to know which one your wallet uses, or the addresses won't match.
:::
::: working
Four BIP-32 path conventions, each producing a distinct Bitcoin script/address type from the same seed:

| Standard | Path starts | Address looks like | Called |
|---|---|---|---|
| BIP-44 | `m/44'/0'` | `1...` | Legacy |
| BIP-49 | `m/49'/0'` | `3...` | Nested SegWit |
| BIP-84 | `m/84'/0'` | `bc1q...` | Native SegWit |
| BIP-86 | `m/86'/0'` | `bc1p...` | Taproot |
:::
::: technical
The `purpose'` segment of the derivation path (44, 49, 84, or 86) signals the script type to derive: P2PKH, P2SH-wrapped P2WPKH, native P2WPKH, and P2TR respectively. `coin_type'` (SLIP-44) follows immediately after.
:::

**Hardened derivation**
::: plain
A path step marked with `'` that acts as a firewall: even if a child key at that step leaks, an attacker still can't work out its siblings or parent.
:::
::: working
A BIP-32 derivation step (index ≥ 2^31, written with `'`) that requires the parent *private* key to compute, unlike non-hardened steps which can be derived from a public key alone — the basis of watch-only wallets.
:::
::: technical
Hardened child derivation feeds the parent private key (not the public key) into `HMAC-SHA512(chain_code, 0x00 ‖ parent_privkey ‖ index)`, breaking the "public-parent-key → public-child-key" property that non-hardened derivation relies on, and thereby containing the blast radius of a single leaked child key + chain code.
:::

**xpub** (*extended public key*; also ypub, zpub, vpub)
::: plain
A master key that can create all your receiving addresses but can't spend anything from them. Safe to give to software that only needs to watch your balance — but it reveals your entire transaction history, so don't post it publicly.
:::
::: working
An extended public key. Combined with a chain code, it derives every non-hardened child public key below its path, generating addresses without ever exposing a private key. Anyone holding it can link all those addresses together, forever.
:::
::: technical
BIP-32 serialized extended public key: 4-byte version, 1-byte depth, 4-byte parent fingerprint, 4-byte child number, 32-byte chain code, 33-byte compressed point, Base58Check-encoded. Non-hardened children derive as `K_i = K_parent + G·HMAC-SHA512(c_parent, K_parent ‖ i)_L`.
:::

**Coin type / SLIP-44**
::: plain
The number that tells a derivation path which blockchain it's for. Bitcoin is 0, Ethereum is 60, Solana is 501.
:::
::: working
The `coin_type'` segment of a BIP-44-family path, registered centrally in the SLIP-44 list so different wallets agree on which chain a given path belongs to.
:::
::: technical
`coin_type'` is a hardened index in `m/purpose'/coin_type'/...`; the registry is a flat, append-only list maintained in the SLIP-44 specification, and reusing an unregistered value risks colliding with a future assignment.
:::

**BIP-85**
::: plain
A way to generate several separate seed phrases from one master seed, so one backup can stand behind more than one wallet — though the master still controls all of them.
:::
::: working
Deterministic entropy derivation: applying a BIP-32 path to a master seed produces child entropy that can itself be turned into an independent BIP-39 mnemonic, SLIP-39 share set, or other application-specific secret.
:::
::: technical
BIP-85 derives at `m/83696968'/{application}'/...`, HMAC-SHA512-derives application-specific entropy from the resulting extended key, and formats it per the target application spec (e.g. `39'` for BIP-39 mnemonics of a given word count and language).
:::

---

## Backup

**Shamir Secret Sharing**
::: plain
A way of splitting a secret into pieces so that some number of them together reconstruct it, but fewer than that reveal *nothing at all* — not "part of the answer," genuinely nothing.
:::
::: working
Splitting a secret into N shares where any T reconstruct it and fewer than T shares carry zero information about it — an information-theoretic guarantee, not just a computational one.
:::
::: technical
Classical Shamir Secret Sharing encodes the secret as the constant term of a degree-(T−1) polynomial over a finite field, distributing shares as `(x_i, f(x_i))` points; any T points uniquely interpolate the polynomial, while T−1 points are consistent with every possible secret.
:::

**SLIP-39**
::: plain
Shamir splitting applied specifically to seed phrases, using its own word list. Supported by Trezor — not by Ledger or Coldcard.
:::
::: working
A SatoshiLabs standard applying Shamir Secret Sharing to seed phrases with a dedicated 1024-word list, supporting two-level groups (e.g. "either both siblings, or my lawyer plus one sibling").
:::
::: technical
SLIP-39 shares encode a group-of-groups threshold scheme (Shamir over GF(256) at both the group and member level) plus a shared master secret encrypted with a passphrase-derived key, checksummed with RS1024; each share is 20 or 33 words depending on secret length.
:::

**codex32 (BIP-93)**
::: plain
A Shamir-style backup whose checksums can be checked **by hand**, with pen, paper, and a printed lookup table — no computer or app required to verify it.
:::
::: working
A Shamir scheme (BIP-93) purpose-built so its BCH-code checksum can be computed and verified by hand, making it the only widely specified backup format fully verifiable without trusting a computer.
:::
::: technical
codex32 shares are 48 data characters in Bech32-style charset encoding a BCH(n,k) code over GF(32), with identifying header characters (threshold, identifier, share index) and a 13-character checksum; official worksheets specify the by-hand polynomial-division procedure.
:::

**Seed XOR**
::: plain
Coldcard's splitting scheme: it breaks a seed into several seeds that combine back into the original. Every piece looks like — and is — a valid seed on its own, so each one can even hold a decoy balance. But every piece is required; lose one and you lose everything.
:::
::: working
An N-of-N secret-splitting scheme where each share is itself a valid, independent-looking BIP-39 mnemonic, and XOR-combining all N shares' entropy reconstructs the original. Unlike Shamir, there is no partial-threshold tolerance.
:::
::: technical
Seed XOR generates N−1 random mnemonics and derives the Nth as the bitwise XOR of their raw entropy against the original secret's entropy, before each is independently checksummed as a standalone BIP-39 mnemonic; reconstruction XORs all N entropies back together.
:::

**Threshold**
::: plain
How many pieces you need before a split backup can be put back together. In "3-of-5," you need 3.
:::
::: working
The minimum number of Shamir shares (T, out of N total) required to reconstruct the original secret.
:::
::: technical
T is the polynomial degree plus one in Shamir's construction (see "Shamir Secret Sharing"); T−1 or fewer shares are information-theoretically indistinguishable from shares of any other secret of the same size.
:::

**SeedQR**
::: plain
A QR code containing your whole seed phrase, scannable by devices like SeedSigner, Krux, and Coldcard Q — much faster and more accurate than typing 24 words by hand. But it's a plaintext seed in photographable form, so never let a networked camera anywhere near one.
:::
::: working
A QR encoding of an entire BIP-39 mnemonic (standard or "compact" numeric-index form), designed for fast, low-error transfer between airgapped devices via camera.
:::
::: technical
Standard SeedQR encodes each word as its zero-padded 4-digit index into the BIP-39 wordlist (numeric mode QR, 4 digits/word); Compact SeedQR instead packs the raw 11-bit indices into a byte-mode QR, trading human-unreadability for a smaller code.
:::

---

## Storage and security

**Airgapped**
::: plain
A device that has never connected, and never will connect, to any network. The strongest practical protection there is for generating and holding keys.
:::
::: working
A device permanently isolated from any network connection (Wi-Fi, Bluetooth, cellular, cable) so that no remote attacker can ever reach it directly.
:::
::: technical
True airgapping removes the network primitives entirely rather than merely disabling them in software; Coldbox's cold realm approximates this inside a browser via `connect-src 'none'` CSP plus a runtime network-primitive guard, verified by the P0.3a browser harness, but a genuinely airgapped physical device remains the stronger guarantee since it has no network stack to misconfigure.
:::

**Cold storage / hot wallet**
::: plain
Cold means your keys never touch a device that's connected to the internet. Hot means they do. Cold is safer; hot is more convenient.
:::
::: working
Cold storage keeps private keys exclusively on offline hardware; a hot wallet keeps them on an internet-connected device, trading safety for convenience.
:::
::: technical
The distinction is about where private-key material is generated and used, not where the software runs: an airgapped signer that only ever exports public data and imports unsigned transactions is cold even if the reviewing/broadcasting machine beside it is hot.
:::

**Hardware wallet**
::: plain
A dedicated little device that stores your keys and signs transactions inside itself, so your keys never touch your computer — even if that computer is already compromised.
:::
::: working
A purpose-built device that generates and stores private keys internally and signs transactions on-device, so the signing key is never exposed to a general-purpose, more attackable computer.
:::
::: technical
Security depends on the device's secure element or MCU isolating key material from any exported interface, and on the user verifying transaction details on the device's own trusted display rather than trusting the connected computer's — exactly the property Coldbox's address- and fingerprint-verification workflows are built to check independently.
:::

**Vault** (in Coldbox)
::: plain
Your encrypted data file — separate from the Coldbox app itself. It holds your wallets, addresses, notes, portfolio, and, if you choose, your seeds.
:::
::: working
The `.cbx` encrypted file that stores Coldbox's data: wallet/address records, notes, portfolio information, and an optional secret compartment for seeds and keys.
:::
::: technical
See [vault-format.md](../01-spec/vault-format.md) for the exact byte layout: a header (KDF parameters, cipher id, compartment lengths) forms the AEAD's associated data, and a multi-record wrapped-DEK block lets several unlock methods (passphrase, keyfile) share one underlying data-encryption key without duplicating the compartments.
:::

**Cold realm / warm shell** (in Coldbox)
::: plain
The two halves Coldbox is built from. The cold realm is sealed off from every network and does the secret-handling work. The warm shell can reach the internet and handles things like prices and balances — it never sees a secret.
:::
::: working
Coldbox's two-realm architecture: an outer warm shell that can reach the network for public data, and an inner cold realm — a sandboxed iframe with its own CSP — that alone can touch secret material and cannot reach any network.
:::
::: technical
The cold realm is a `sandbox="allow-scripts allow-downloads"` iframe loaded via `srcdoc`, enforcing its own `connect-src 'none'` CSP and a runtime neutering of `fetch`/`XHR`/`WebSocket`/`EventSource`/`WebRTC`. The realms communicate only via a `MessageChannel` handshake against a typed schema that structurally cannot carry a mnemonic, private key, xprv, passphrase, or secret-compartment plaintext. See [architecture.md](../01-spec/architecture.md).
:::

**Argon2id**
::: plain
The algorithm that turns your passphrase into the actual encryption key. It's deliberately slow and memory-hungry, so that guessing passphrases stays expensive even with specialized cracking hardware.
:::
::: working
The key-derivation function (KDF) protecting your vault's passphrase, chosen specifically because it resists both GPU/ASIC parallel guessing (via memory hardness) and side-channel timing attacks (via its hybrid data-independent/data-dependent design).
:::
::: technical
Argon2id is run with parameters selectable via Fast/Standard/Paranoid profiles, stored in the vault header (KDF id 1); see [crypto-choices.md](../02-security/crypto-choices.md) for the exact memory/iteration/parallelism values and rationale. Coldbox displays which KDF is actually active so a silent fallback to a weaker one (e.g. PBKDF2) can never happen invisibly.
:::

**AES-256-GCM**
::: plain
The encryption that protects your vault's contents. It doesn't just hide the data — it also proves the data hasn't been tampered with.
:::
::: working
The authenticated encryption cipher (AEAD) used for both vault compartments: 256-bit keys, and a 16-byte authentication tag that makes any tampering detectable rather than silently accepted.
:::
::: technical
Vault format v1 uses AES-256-GCM with a fresh 96-bit nonce per save and the header bytes as additional authenticated data (AAD), so header tampering breaks decryption of the compartments even though the header itself isn't encrypted; see [vault-format.md](../01-spec/vault-format.md).
:::

**CSP (Content Security Policy)**
::: plain
A browser mechanism that restricts what a web page is allowed to do. Coldbox uses it to remove network access entirely from the half of the app that handles secrets — the technical foundation the whole design rests on.
:::
::: working
A browser-enforced allowlist mechanism, declared via a `<meta>` tag or header, restricting script sources, style sources, network destinations, and more. Coldbox's cold realm sets `connect-src 'none'`, which the browser enforces even if the page's own JavaScript is compromised.
:::
::: technical
Both realms' CSPs are hash-pinned at build time: SHA-256 hashes of every inline `<script>`/`<style>` block are computed and injected into `script-src`/`style-src`, so a single byte of post-build tampering causes the browser to refuse to execute the altered block. See [csp-policy.md](../02-security/csp-policy.md).
:::

**Hash / checksum**
::: plain
A fixed-length fingerprint computed from a file's contents. Change even one bit of the file and the fingerprint comes out completely different — which is what makes it useful for checking a file hasn't been altered.
:::
::: working
A deterministic, fixed-length digest of arbitrary data, used to detect tampering or corruption: if two hashes match, the underlying bytes are (for a cryptographic hash) overwhelmingly likely to be identical.
:::
::: technical
Coldbox uses SHA-256 throughout: for the shipped `coldbox.html.sha256` sidecar, for per-inline-block CSP hash-pinning, and for the in-app self-hash drop zone — which explicitly discloses that comparing a running build's own compiled hash against itself is circular, and points to [verification.md](../02-security/verification.md) for an independent check.
:::

---

## Portfolio

**Cost basis**
::: plain
What you actually paid for something, fees included. You need this number to work out whether you made or lost money when you eventually sell.
:::
::: working
The total amount paid to acquire an asset, including fees, used to calculate gain or loss on disposal.
:::
::: technical
Basis is tracked per lot, not per wallet or per asset in aggregate; see [us-tax-reporting.md](../04-reference/us-tax-reporting.md) — missing basis must be flagged, never defaulted to zero, since that would silently understate a gain.
:::

**Lot**
::: plain
One single purchase of an asset, at its own price and date. When you sell, you're always selling specific lots — which ones you pick changes how much gain or loss gets reported.
:::
::: working
A discrete acquisition of an asset at a specific price and date; disposals consume specific lots (per FIFO, LIFO, HIFO, or specific identification), each with its own basis.
:::
::: technical
Coldbox tracks lot pools **per wallet**, with a full lot-level audit trail per disposal, feeding the Form 8949-style reporting engine; see [us-tax-reporting.md](../04-reference/us-tax-reporting.md).
:::

**FIFO / LIFO / HIFO**
::: plain
Three different rules for deciding which purchase you're "selling" first when you sell part of a holding. First-in-first-out, last-in-first-out, or highest-cost-first — and the rule you pick changes the profit you report.
:::
::: working
Lot-selection methods for disposals: First-In-First-Out, Last-In-First-Out, or Highest-In-First-Out (sell the highest-cost lot first, typically minimizing near-term reported gain).
:::
::: technical
Alongside these, specific identification (choosing exact lots per disposal) is supported with a lot-level audit trail; the chosen method must be applied consistently and is recorded per the reporting engine's requirements in [us-tax-reporting.md](../04-reference/us-tax-reporting.md).
:::

**Realized / unrealized PnL**
::: plain
Realized profit or loss is money you've actually locked in by selling. Unrealized is just on paper — from things you still hold and haven't sold yet.
:::
::: working
Realized PnL comes from completed disposals; unrealized PnL is the paper gain or loss on positions still held, marked to current price.
:::
::: technical
Only realized disposals are tax-relevant events in the reporting engine; unrealized PnL is a dashboard/valuation figure only and never feeds a Form 8949-style row.
:::

**Gap limit**
::: plain
When scanning for a wallet's used addresses, this is how many empty addresses in a row you check before deciding there probably aren't any more. The usual convention is 20.
:::
::: working
The number of consecutive unused addresses checked during address-discovery scans before assuming no further used addresses exist at that path branch; conventionally 20.
:::
::: technical
A gap-limit scan that stops too early produces a false negative — funds exist beyond the scanned range but are reported as absent. Coldbox's recovery/discovery tooling surfaces the generation limit explicitly and reproduces the exact out-of-limit case as a documented, non-silent failure mode.
:::

---

## Bitcoin specifics

**UTXO**
::: plain
Bitcoin's accounting model: your balance isn't one running total, it's a pile of separate chunks. Spending means using up whole chunks and creating new ones as change.
:::
::: working
Unspent Transaction Output — Bitcoin's ledger unit. A wallet's balance is the sum of UTXOs it can spend; a transaction consumes existing UTXOs entirely and creates new ones.
:::
::: technical
Each UTXO is an `(txid, vout)` pair plus a locking script (scriptPubKey) and value; a transaction is valid only if its inputs' unlocking scripts satisfy their referenced UTXOs' locking scripts and the value in does not exceed the value out plus fee.
:::

**PSBT**
::: plain
A file format for handing an unsigned Bitcoin transaction to a hardware wallet for signing, and getting it back. Coldbox can show you what's inside one of these — it never signs them itself.
:::
::: working
Partially Signed Bitcoin Transaction (BIP-174/370): a standard container for passing transaction data between wallets and signers across multiple signing rounds, e.g. in multisig.
:::
::: technical
A PSBT is a sequence of key-value TLV maps (global, per-input, per-output) carrying the unsigned transaction plus enough context (UTXO data, derivation paths, partial signatures) for any compliant signer to validate and sign without further out-of-band information. Coldbox's role is strictly read-only display.
:::

**Descriptor / output descriptor**
::: plain
A precise, unambiguous piece of text describing exactly what a wallet is: which keys, what type of addresses, and what paths. It's the clearest way to write down a multisig setup so it isn't misconfigured later.
:::
::: working
A compact text format (per Bitcoin Core's descriptor language and BIP-388 wallet policies) describing a script template, its keys (often as xpubs with origin info), and derivation paths, so a wallet can be reconstructed exactly.
:::
::: technical
E.g. `wsh(sortedmulti(2,[fp1/84'/0'/0']xpub.../0/*,[fp2/...]xpub.../0/*))` fully specifies a 2-of-2 native-SegWit multisig, including key origin fingerprints — the exact information needed for re-registration with a hardware wallet after a reset.
:::

**Miniscript**
::: plain
A way of writing down Bitcoin spending rules — like timelocks, multiple required signers, or fallback conditions — so that software can check them are safe automatically, instead of by hand. Used for setups like "me now, or my heirs after a year with no activity from me."
:::
::: working
A structured subset of Bitcoin Script with a formal semantics, enabling automated analysis (satisfiability, malleability, spending-cost estimation) of otherwise hand-written scripts.
:::
::: technical
Coldbox's support is read-only (Phase 5): parsing and displaying miniscript expressions and their timelock/threshold structure, without any signing capability — consistent with the project's permanent non-goal of holding spending authority.
:::

**Multisig**
::: plain
Requiring more than one key to authorize a spend. "2-of-3" means three keys exist, and any two of them together can sign. It removes any single point of failure — at the cost of needing more to back up.
:::
::: working
A script requiring M-of-N signatures to spend, distributing trust and removing any single key as a single point of failure, at the cost of additional keys/devices to manage and back up.
:::
::: technical
Represented on-chain as either legacy `multisig` script, P2SH/P2WSH-wrapped `multisig`, or a `sortedmulti()`/`multi()` descriptor for Taproot-era setups; Coldbox's Phase 5 quorum analysis checks whether a stated quorum could still spend given the recorded device inventory.
:::

**Silent Payments (BIP-352)**
::: plain
A type of Bitcoin address that can be posted publicly without letting anyone link the payments sent to it together on the blockchain. Specified, but not yet supported by shipping wallets as of this writing.
:::
::: working
A reusable Bitcoin address format (`sp1...`) using ECDH between sender and recipient keys to generate a unique, unlinkable receiving address per payment, without requiring on-chain address reuse or an interactive handshake.
:::
::: technical
Per BIP-352, the sender computes a shared secret via ECDH against the recipient's published scan/spend public keys and tweaks the recipient's spend key per-output; Coldbox's Phase 5 support is marked experimental and limited to generating and recording `sp1` addresses pending broader wallet adoption.
:::

**Taproot**
::: plain
Bitcoin's newest type of address (`bc1p...`), offering better privacy and cheaper handling of complex spending conditions than older formats.
:::
::: working
The P2TR output type (BIP-340/341/342), combining a single Schnorr-signature key path with an optional script-path fallback tree, such that a cooperative spend looks identical to a simple single-sig spend on-chain.
:::
::: technical
A Taproot output commits to `Q = P + H(P‖merkle_root)·G`, where `P` is the internal key and `merkle_root` commits to a Merkle tree of alternative spending scripts (tapleaves); the key-path spend reveals only a single Schnorr signature under `Q`, regardless of how complex the script-path alternatives are.
:::

---

## Things people get wrong

These aren't glossary terms so much as corrections worth stating plainly — the same warning at every depth, since the point is the correction itself, not the vocabulary.

**"My seed phrase is my password."**
No. A password protects an account someone else controls and can reset. A seed phrase *is* the money. Nobody can reset it.

**"I'll remember my passphrase."**
People don't. A passphrase you can't reproduce exactly is a wallet you can't open.

**"My backup is fine, I wrote it down."**
Until you've reconstructed from it, you don't know that. Untested backups fail at exactly the moment you need them.

**"The addresses match, I checked the first and last few characters."**
Address-swapping malware generates addresses with matching prefixes and suffixes. Check the whole string, or compare fingerprints instead.
