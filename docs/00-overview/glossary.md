# Glossary

Every term the app uses, in plain English first. This file compiles into the in-app help, so the definition you read here is the definition you'll see when you tap a term.

---

## Seeds and keys

**Seed phrase** (also *recovery phrase*, *mnemonic*)
12 or 24 ordinary words that encode your wallet's master key. These words *are* your money. Anyone with them can spend everything; anyone without them can't recover it. Standardised as BIP-39.

**Entropy**
Raw randomness. Your seed phrase is a human-readable encoding of a random number, and how genuinely random that number was determines whether anyone can guess it. 128 bits of entropy gives a 12-word phrase, 256 bits gives 24 words.

**Passphrase** (also *25th word*, *hidden wallet*)
An optional extra secret on top of your seed phrase. Adding one creates a completely separate wallet. Change one character and you get a different wallet — valid, empty, and unrecoverable unless you remember exactly what you typed. It's a second secret, not a backup, and it needs backing up too.

**Private key**
The secret number that authorises spending from one address. Your seed phrase generates these.

**Public key**
Derived from a private key, one-way. Can be shared; used to produce addresses.

**Address**
Where coins are sent. Derived from a public key. Safe to publish, though publishing links your transactions together.

**Fingerprint** (also *XFP*, *master fingerprint*)
Eight hex characters identifying a wallet without revealing anything secret. Both your hardware wallet and Coldbox can compute it, so comparing them proves they hold the same seed without either one exposing it. The safe way to label a wallet.

---

## Derivation

**Derivation path**
The recipe turning one seed into many addresses, written like `m/84'/0'/0'/0/0`. Different paths give different addresses from the same seed — which is why "my funds are missing" is usually "my wallet is looking at the wrong path."

**BIP-32**
The standard for deriving many keys from one seed. The foundation everything else builds on.

**BIP-39**
The standard turning random entropy into memorable words, and words back into a seed.

**BIP-44 / 49 / 84 / 86**
Four conventions for how paths are structured, each producing a different Bitcoin address format:

| Standard | Path starts | Address looks like | Called |
|---|---|---|---|
| BIP-44 | `m/44'/0'` | `1...` | Legacy |
| BIP-49 | `m/49'/0'` | `3...` | Nested SegWit |
| BIP-84 | `m/84'/0'` | `bc1q...` | Native SegWit |
| BIP-86 | `m/86'/0'` | `bc1p...` | Taproot |

**Hardened derivation**
A path step marked with `'` (e.g. `44'`). Hardened steps prevent a leaked child key from exposing its siblings or parent. Non-hardened steps allow address generation from a public key alone, which is what makes watch-only wallets possible.

**xpub** (*extended public key*; also ypub, zpub, vpub)
A master public key generating all your receiving addresses without any ability to spend. Safe to give to watch-only software — but it reveals your entire transaction history, forever, to anyone who has it. Treat it as private even though it can't spend.

**Coin type / SLIP-44**
The number identifying a blockchain within a derivation path. Bitcoin is 0, Ethereum is 60, Solana is 501. Registered centrally in SLIP-44.

**BIP-85**
Deriving many child seed phrases from one master seed. One backup can stand behind several wallets — but the master still controls all of them.

---

## Backup

**Shamir Secret Sharing**
Splitting a secret into N pieces where any T of them reconstruct it, and fewer than T reveal *nothing at all*. Not "each piece gives you part of the answer" — below the threshold you learn literally nothing.

**SLIP-39**
Shamir applied to seed phrases, using its own 1024-word list. Supports two-level groups ("either both siblings, or my lawyer plus one sibling"). Supported by Trezor; **not by Ledger or Coldcard**.

**codex32 (BIP-93)**
A Shamir scheme whose checksums can be computed and verified **by hand**, with pen, paper, and printed lookup tables. The only backup format you can fully verify without trusting a computer.

**Seed XOR**
Coldcard's scheme. Splits a seed into N seeds that combine back to the original. Every piece is itself a valid seed, so each can hold a decoy balance. All pieces required — losing one loses everything.

**Threshold**
How many shares are needed. In "3-of-5," the threshold is 3.

**SeedQR**
A QR code containing an entire seed phrase, scannable by SeedSigner, Krux, and Coldcard Q. Fast and accurate compared to typing 24 words, but it's a plain seed in a photographable form — never let a networked camera near one.

---

## Storage and security

**Airgapped**
A device that has never been and will never be connected to any network. The strongest practical protection for key generation.

**Cold storage / hot wallet**
Cold means keys never touch an internet-connected device. Hot means they do. Cold is safer; hot is convenient.

**Hardware wallet**
A dedicated device storing keys and signing transactions internally, so keys never reach your computer even when it's compromised.

**Vault** (in Coldbox)
Your encrypted data file, separate from the app. Holds wallets, addresses, notes, portfolio, and optionally seeds.

**Cold realm / warm shell** (in Coldbox)
The two halves of the app. The cold realm is sealed off from all network access and handles secrets. The warm shell can reach the internet and handles prices and balances. See [architecture](../01-spec/architecture.md).

**Argon2id**
The algorithm converting your passphrase into an encryption key. Deliberately slow and memory-hungry, so guessing attacks are expensive even with specialised hardware.

**AES-256-GCM**
The encryption protecting your vault. Also verifies the data hasn't been tampered with.

**CSP (Content Security Policy)**
A browser mechanism restricting what a page can do. Coldbox uses it to remove network access entirely from the half that handles secrets — the technical foundation of the whole design.

**Hash / checksum**
A fixed-length fingerprint of data. Change one bit and the hash changes completely. Used to verify files haven't been altered.

---

## Portfolio

**Cost basis**
What you paid for an asset, including fees. Needed to calculate profit.

**Lot**
One acquisition of an asset at a particular price and date. Selling means disposing of specific lots, which determines your gain.

**FIFO / LIFO / HIFO**
Rules for which lot you're selling when you sell. First-in-first-out, last-in-first-out, or highest-cost-first. The choice changes your reported gain.

**Realized / unrealized PnL**
Realized is profit or loss you've locked in by selling. Unrealized is on paper, from assets you still hold.

**Gap limit**
When scanning for a wallet's used addresses, how many consecutive empty ones you check before concluding there are no more. Convention is 20.

---

## Bitcoin specifics

**UTXO**
Bitcoin's model: your balance is a set of discrete unspent chunks, not a running total. Spending consumes whole chunks and creates new ones.

**PSBT**
A partially signed Bitcoin transaction — the file format for passing a transaction to a hardware wallet for signing and back. Coldbox can *display* these; it never signs them.

**Descriptor / output descriptor**
A precise text description of what a wallet is: which keys, which script type, which paths. The unambiguous way to record a multisig setup.

**Miniscript**
A way of writing Bitcoin spending conditions — timelocks, multiple signers, fallback paths — that software can analyse safely. Used for inheritance setups like "me now, or my heirs after a year of inactivity."

**Multisig**
Requiring several keys to spend. 2-of-3 means three keys exist and any two can sign. Removes single points of failure — at the cost of more to back up.

**Silent Payments (BIP-352)**
A reusable Bitcoin address (`sp1...`) that can be published without linking your payments on-chain. Specified, but not yet in shipping wallets.

**Taproot**
Bitcoin's newest address type (`bc1p...`), offering better privacy and cheaper complex spending conditions.

---

## Things people get wrong

**"My seed phrase is my password."**
No. A password protects an account someone else controls and can reset. A seed phrase *is* the money. Nobody can reset it.

**"I'll remember my passphrase."**
People don't. A passphrase you can't reproduce exactly is a wallet you can't open.

**"My backup is fine, I wrote it down."**
Until you've reconstructed from it, you don't know that. Untested backups fail at exactly the moment you need them.

**"The addresses match, I checked the first and last few characters."**
Address-swapping malware generates addresses with matching prefixes and suffixes. Check the whole string, or compare fingerprints instead.
