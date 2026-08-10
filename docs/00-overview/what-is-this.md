# What is this?

A plain-English tour. No prior knowledge assumed.

---

## The one-sentence version

Coldbox is a single web page you keep on a USB stick that helps you create, verify, back up, and keep track of cryptocurrency wallets — without ever sending your secrets anywhere.

## The problem it solves

If you hold crypto in self-custody, you end up juggling a pile of things:

- A **seed phrase** — 12 or 24 words that *are* your money. Lose them, lose everything. Let someone see them, same result.
- One or more **hardware wallets**, each with firmware, PINs, and possibly passphrases.
- **Backups** of those seeds, hopefully in more than one place, hopefully tested.
- **Addresses** you've handed out, and notes about which is which.
- A **portfolio** you'd like to look at without logging into six exchanges.

Most people manage this with a spreadsheet, a browser bookmark folder full of one-off tools, and hope. That's roughly what the folder this project grew out of looked like: fifteen separate HTML files and three platform-specific binaries, each doing one thing.

Coldbox is those fifteen tools in one file, plus the record-keeping layer that ties them together.

---

## What it is not

**It is not a wallet.** It doesn't hold your coins, connect to any blockchain to move them, or sign transactions. It cannot spend your money, which also means an attacker who compromises it cannot directly spend your money either.

**It is not a replacement for a hardware wallet.** It's a companion. Your Ledger, Trezor, or Coldcard holds your keys and signs your transactions. Coldbox checks their work, manages your backups, and remembers everything you can't.

**It is not audited.** No professional security firm has reviewed it. Treat it accordingly.

---

## The clever part, explained simply

There's a tension at the heart of a tool like this.

To show you live prices and balances, it needs internet access. But anything with internet access could, in principle, send your seed phrase somewhere. Most tools resolve this by asking you to trust them.

Coldbox resolves it by splitting itself into two halves that cannot talk to each other freely.

**The outer half** handles prices, balances, and your portfolio. It can reach the internet. It never sees a secret.

**The inner half** runs inside a sealed container — technically a sandboxed iframe with a security policy that removes every method a web page has for making a network request. Not disabled, not discouraged: *absent*. This half handles your seed phrases, private keys, and vault decryption.

The two communicate through a narrow, strictly-typed channel that carries only public information: addresses, labels, balances. There is no message type capable of carrying a seed.

**What this buys you:** you can use the seed generator on an internet-connected laptop, and the seed physically cannot leave the machine. The browser enforces it. You don't have to take anyone's word for it.

Naturally, you should still generate keys for serious money on a machine that's offline anyway. Belt and braces.

---

## What's inside

### 🔒 Vault — your encrypted notebook

Everything you record lives in an encrypted file separate from the app. Protected by a passphrase, scrambled with Argon2id and AES-256 — the same class of protection a good password manager uses.

It has two compartments. The **public** one holds addresses, labels, notes, and portfolio data, and can be opened while external reachability is confirmed. The **secret** one holds seed phrases and private keys, and remains sealed whenever the warm shell confirms reachability or cannot establish a trustworthy offline result. That split is what lets you check your portfolio on a connected laptop without exposing anything that matters. The network-status display is advisory and cannot prove that a physical cable, radio, VPN, or virtual adapter is absent; the cold realm's own no-network boundary is independent of that display.

Storing seed phrases is optional and off by default. The vault is fully useful without a single secret in it.

### 🎲 Entropy Lab — randomness you can check

A seed phrase is only as unguessable as the randomness behind it. This lets you generate that randomness by rolling dice, flipping coins, or shuffling cards — physical processes you can watch — and then *analyzes* them for bias. If your dice are weighted or you unconsciously favour certain numbers, it tells you.

You can also mix physical randomness with the computer's, so that a rigged die or a broken random number generator can't determine the outcome alone.

### 🌱 Seed Forge — making and checking seed phrases

Creates BIP-39 seed phrases (the 12- or 24-word kind) and validates existing ones, catching typos and invalid words. Generate and Validate Existing Phrase each have their own optional passphrase pair, with a check that each pair was typed the same way twice, because a single wrong character silently produces a different, empty, unrecoverable wallet.

In the cold realm, the recorded flow is Entropy Lab → Mix → Use this mix in Seed Forge → mnemonic → optional passphrase → raw BIP-39 seed and live fingerprint. The raw seed stays masked unless you explicitly reveal it briefly.

Also does **BIP-85**: deriving many child seed phrases from one master, so a single backup can stand behind several wallets.

### 🧭 Derivation — turning a seed into addresses

One seed phrase generates effectively unlimited addresses across many blockchains, following standard "derivation paths." This shows you exactly which addresses your seed produces, on 35+ chains, plus any path you want to enter by hand.

This is what you use to answer "is this really my address?" — see the verification guide.

### 🔑 Devices — your hardware wallets

A registry of every device you own: model, firmware, purchase source, PIN dates, which seeds it holds, where it lives. Plus the verification workflows that are the real reason this tool exists (below).

### 🧩 Backup Lab — surviving disaster

Splitting a seed into multiple pieces so no single one is enough, and so losing one isn't fatal. Supports several schemes:

- **SLIP-39** — the Trezor standard. Five cards, any three reconstruct. Widely usable but not supported by Ledger or Coldcard.
- **codex32** — shares you can verify *by hand with pen and paper*, no computer needed. Pull one out of a safe in ten years and confirm it's intact without trusting any software still runs.
- **Seed XOR** — Coldcard's scheme. Every piece is itself a valid seed, so each can hold a small decoy balance. All pieces required.

Whichever you choose, the app makes you actually reconstruct the secret from your shares before it will mark the backup as done. Untested backups are the most common way people lose money.

### 📊 Portfolio — what you own and what it did

Records purchases, sales, and transfers, and computes cost basis and profit or loss. Understands that moving coins between your own wallets isn't a sale — an error that quietly corrupts every figure downstream in most trackers. Multi-currency, with live prices averaged across five sources.

### 🔳 QR Studio — codes for addresses and seeds

QR codes for receiving addresses, and **SeedQR** codes that store an entire seed phrase as a QR your hardware wallet can scan. Printable backup cards included.

### 🩺 Recovery — when something's wrong

Missing a word? Suspect a typo? Wrote down 23 of 24 words? This searches the possibilities. It tells you honestly, before starting, how long a search will take — and when the answer is "longer than the universe has left," it says so instead of pretending.

### 🔍 Verify Bench — checking files and keys

Computes file fingerprints, so you can confirm a download wasn't tampered with. Also hashes whole folders, which lets you check that your backup USB sticks haven't silently corrupted over time.

### 📖 Learn — help for everyone

Every feature explained at three levels: plain English, working knowledge, and full technical detail. Pick your level; change it anytime.

---

## The most valuable thing it does

If you only ever use one feature, use this one.

**Independent receive-address verification.**

When you want to receive crypto, your wallet software shows you an address. Malware exists whose entire purpose is to change that address on screen — you copy the attacker's address, send your money there, and it's gone. Your hardware wallet shows the real address on its own screen, which is why you're told to check it. But checking a 42-character string against a small screen is tedious, and people stop doing it.

Coldbox derives the address independently from your account's public key, with no involvement from the software that might be lying to you. If the three sources agree — your wallet, your device screen, and Coldbox — you're fine. If they don't, you've just caught an attack in progress.

The same principle powers the other verification workflows: confirming a device holds the seed you think it does, confirming a metal backup actually works without wiping a device to test it, and confirming a passphrase produces the wallet you expect *before* you send money to it.

---

## Who it's for

- Anyone holding crypto in self-custody who wants their records in one place.
- Anyone with more than one hardware wallet, or a multisig setup.
- Anyone who has ever thought "I should test that backup" and not tested it.
- Anyone planning for what happens to their crypto if they're not around.

## Who it's not for

- Anyone wanting to trade, swap, or spend. It doesn't do that.
- Anyone wanting a single button that fixes everything. Self-custody involves real, irreversible decisions, and this tool's job is to make them clear rather than to hide them.

---

## Next steps

- [Quick start](quick-start.md) — first run
- [Glossary](glossary.md) — any term you didn't recognise above
- [Verify a hardware wallet](../03-guides/verify-a-hardware-wallet.md) — the feature described above
- [FAQ](faq.md)
