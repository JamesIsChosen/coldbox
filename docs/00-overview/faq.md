# FAQ

## General

**Is this a wallet?**
No. It doesn't hold coins, connect to blockchains to move them, or sign transactions. It creates and verifies keys, manages backups, and keeps records. Your hardware wallet remains the thing that spends.

**Why one HTML file?**
Because it runs in supported browser/file-launch contexts with no install, it's small enough to audit, it can be copied to a USB stick and opened in ten years without a working package manager, and its integrity can be verified with a single hash. iOS local execution from Files is currently deferred under [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md).

**Why not a desktop app?**
Three separate builds, three signing processes, three sets of platform bugs, and an installer with system access. A single file you can read is a smaller thing to trust.

**Is it safe to use online?**
For the tools, yes — and this is unusual. All secret handling happens inside a sandbox with no network access whatsoever, enforced by the browser. Your vault's secret compartment stays sealed while you're online regardless. For generating keys that will hold serious money, still use an offline machine: it costs you nothing and removes an entire category of risk.

**Has it been audited?**
No. It says so in the app, permanently, and will keep saying so until it isn't true.

---

## Security

**What if someone steals my vault file?**
They get an encrypted blob. Opening it requires your passphrase, and Argon2id makes guessing expensive. A strong passphrase means a stolen vault is a non-event. A weak one means it's a countdown.

**Should I store my seed phrase in the vault?**
Off by default, deliberately. An encrypted file on a general-purpose computer is genuinely weaker than a metal plate in a safe. Our recommendation: use the vault for everything *except* seeds — fingerprints, xpubs, backup locations, and notes are enough to manage a portfolio — and add seeds only where you've decided the convenience is worth it. Never as your only copy.

**What if I forget my vault passphrase?**
Currently, the data is gone. There is no reset, no recovery email, nobody to call. From Phase 2, recovery shares provide a second route in. Until then: write it down and store it physically.

**Can the app phone home?**
The secret half has no network capability at all — CSP `connect-src 'none'` removes the mechanisms. The other half can only reach a fixed list of hosts written in the source, which you can read. There is no analytics code to find.

**What if my computer has malware?**
Then you have a serious problem no browser tool can fix. It could read what's on screen or log your keystrokes. What Coldbox *can* do is catch a specific, common attack: malware that swaps a displayed receive address. Independent derivation exposes that. See [verify a hardware wallet](../03-guides/verify-a-hardware-wallet.md).

**Is my seed safe from quantum computers?**
Your vault encryption is fine — AES-256 is symmetric, and quantum attacks only halve its effective strength, leaving ~128 bits. On-chain exposure is the real question, and it concerns public keys that have been revealed by spending. BIP-360 was merged into the Bitcoin BIPs repository in February 2026, but it is not activated and nothing is imminent. The app includes a readiness panel that inventories your exposure honestly rather than dramatically.

---

## Practical

**Which devices does it work on?**
Windows, macOS, Linux, and Android in supported local-file/browser contexts. Direct local execution from iOS Files is currently a blocked portability target under [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md); Quick Look is only a preview, not a Coldbox execution environment.

**Does it work offline?**
That's the design. Only prices and balance lookups need a connection, and they degrade to last-known values with visible timestamps.

**Can I use it on my phone?**
On supported phone/browser contexts, yes. Saving may use a base64/QR export rather than a file download, and that path is built as a proper feature, not a fallback. iOS local execution from Files is not currently claimed; see [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md).

**How do I move my vault between devices?**
Copy the `.cbx` file. It's encrypted and self-contained. Sync services work but reveal file size and modification times; the file is size-padded to blunt that.

**Can I use it with my existing wallet?**
Yes — that's most of the point. Enter your xpub for watch-only address derivation and balance checking, or your seed (offline) to verify a backup or recover from a damaged one.

**Which hardware wallets does it support?**
All of them, in the sense that it works with standard seeds, paths, and xpubs. There's a device registry and a vendor support matrix covering Ledger, Trezor, Coldcard, BitBox02, Jade, Keystone, SeedSigner, Krux, Passport, and Specter DIY. It doesn't talk to devices over USB — you type or scan the values.

**Can it import from my exchange?**
No. Read-only exchange API keys still get stolen and still leak your full position. Exchange holdings are manual entries or CSV imports.

---

## Backups

**SLIP-39 or codex32?**

| | SLIP-39 | codex32 |
|---|---|---|
| Wallet support | Trezor and some others | Very limited |
| Verify by hand | No | **Yes** |
| Complexity | Moderate | Higher upfront |
| Best for | Distributing a seed you control | Long-term archival you can check without a computer |

If your hardware wallet supports SLIP-39 natively, it's the pragmatic choice. If you want a backup you can verify in twenty years without trusting that any software still runs, codex32 is unique in offering that.

**Should I use a passphrase?**
It's a genuine security upgrade and a genuine risk. It defeats an attacker who finds your seed phrase. It also means one forgotten or mistyped character permanently loses the wallet. If you use one, back it up as carefully as the seed, and verify the fingerprint before funding.

**How many backup copies?**
At least two, in different physical locations, on media that survives fire and water. Metal beats paper. Test them.

**How often should I check my backups?**
Annually is reasonable. The app tracks verification dates and flags overdue ones. It'll also flag if all your shares are in one place, which is a common mistake that defeats the point.

---

## Portfolio

**Where do prices come from?**
CoinGecko, Coinbase, Kraken, CoinPaprika, and DIA, reported as a **median** rather than an average — one stale feed skews a mean badly. Every source is shown individually, with its age.

**Why not CoinMarketCap?**
Their API doesn't support browser calls (no CORS headers), and their own documentation notes that a key embedded in a browser app is stealable. Including it would need a proxy server, which breaks the no-server design.

**Does checking balances hurt my privacy?**
Yes, and this is worth understanding. Querying your addresses tells the API operator that whoever is at your IP address is interested in them — permanently, in their logs. That's a real deanonymization vector for Bitcoin. So it's opt-in per address, never automatic, off by default, and the app supports pointing at your own node. Tor works too.

**Can it do my taxes?**
No. It computes cost basis and realized gains using standard methods, but it doesn't know your jurisdiction, doesn't model local rules, doesn't produce forms, and isn't a substitute for an accountant.

---

## Project

**Who made this?**
An individual, in the open, on GitHub. Not a company. No token, no funding round, no premium tier.

**How do I know the download matches the source?**
Reproducible builds. Anyone can rebuild from source and get byte-identical output, and CI publishes an attestation of the hash for every release. If your build differs from the published file, that's a critical security report.

**Why isn't there a hosted version?**
Because it would invite people to generate real keys on a page they never verified, delivered over a connection they don't control — precisely the failure mode this design exists to prevent. Download, verify, run locally.

**Can I fork it?**
MIT licensed. Fork it, sell it, build on it. If you distribute a modified version, please change the name so users can tell whose build they're verifying.

**How do I report a bug?**
GitHub issues for ordinary bugs. For anything that could put funds at risk, use private vulnerability reporting — see [SECURITY.md](../../SECURITY.md).
