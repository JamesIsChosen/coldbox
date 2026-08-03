# Coldbox

**A single-file, offline-first crypto toolkit, wallet registry, and portfolio manager. A companion to your hardware wallets — not a replacement for them.**

One HTML file. No install, no server, no runtime. Copy it to a USB stick and open it on Windows, macOS, Linux, iOS, or Android.

> ⚠️ **Pre-release.** The deterministic build skeleton is in place, but no wallet, vault, or cryptographic features are available yet. Nothing here should be used to secure real funds.

---

## Verify before you use

This tool handles seed phrases. Do not run a copy you haven't verified.

```bash
# Linux / macOS
shasum -a 256 coldbox-v1.0.0.html

# Windows
certutil -hashfile coldbox-v1.0.0.html SHA256
```

Compare the result against the `.sha256` published with the release, and verify the detached GPG signature. Builds are **reproducible** — you can rebuild the file yourself and confirm you get identical bytes. See [docs/02-security/verification.md](docs/02-security/verification.md).

**There is no hosted version, and there never will be.** Serving this from a website would invite people to generate real keys on a page they didn't verify, over a connection they don't control — the exact failure mode this design exists to prevent.

---

## What it does

| | |
|---|---|
| 🔒 **Vault** | Encrypted store for wallets, addresses, notes, and optionally seeds. Argon2id + AES-256-GCM |
| 🎲 **Entropy Lab** | Dice, coins, cards, and CSPRNG with real bias analysis |
| 🌱 **Seed Forge** | BIP-39 generate and validate, passphrases, BIP-85 child seeds |
| 🧭 **Derivation** | 35+ chains with full addresses, plus arbitrary paths and a custom coin registry |
| 🔑 **Devices** | Hardware wallet registry, firmware tracking, and verification workflows |
| 🧩 **Backup Lab** | SLIP-39, codex32, Seed XOR, Shamir — with a mandatory verify-your-shares step |
| 📊 **Portfolio** | Cost basis, realized and unrealized PnL, multi-currency, live prices |
| 🔳 **QR Studio** | Address QRs, SeedQR, Compact SeedQR, printable backup cards |
| 🩺 **Recovery** | Missing words, typos, checksum repair, passphrase search |
| 🔍 **Verify Bench** | File and folder hashing, KDF calculator, key converter, address validator |
| 📖 **Learn** | Plain-English help for every feature, at three depth levels |

Full detail in [the specification](docs/01-spec/SPEC.md).

---

## The core idea

Two things people usually have to choose between:

1. An **airgapped tool** that can't leak your secrets, but also can't show you a price.
2. A **portfolio tracker** that shows you everything, and could exfiltrate anything.

Coldbox does both by splitting itself in two. All secret handling runs inside a sandboxed iframe whose Content Security Policy sets `connect-src 'none'` — it has no `fetch`, no `XHR`, no WebSocket, no way to reach a network at all. The outer shell, which *can* reach the network for prices and balances, runs on a different origin and cannot read into the sandbox.

The result: you can run the BIP-39 generator on an internet-connected laptop and the seed still cannot leave the machine. That's a browser-enforced guarantee, not a promise in a privacy policy.

See [ADR-0001](docs/05-development/adr/0001-two-realm-architecture.md) for why it's built this way.

---

## A companion, not a replacement

Coldbox holds no keys and signs nothing. Your hardware wallets do that.

What it does is the layer around them — the part a device can't do for you because a possibly-compromised computer sits in between:

- **Verify a receive address** independently from your xpub, catching address-swapping malware.
- **Verify a device holds the seed you think it does**, by comparing fingerprints, without either side revealing the seed.
- **Verify a metal backup works** without wiping a device to test it.
- **Verify a passphrase** produces the wallet you expect *before* you fund it.
- **Track which device holds which key** in a multisig, and whether you could still spend if one died.

---

## Documentation

| Start here | |
|---|---|
| [What is this?](docs/00-overview/what-is-this.md) | Plain-English tour of every tool |
| [Quick start](docs/00-overview/quick-start.md) | First run, in ten minutes |
| [Glossary](docs/00-overview/glossary.md) | Every term, explained simply |
| [FAQ](docs/00-overview/faq.md) | |

| Deeper | |
|---|---|
| [Specification](docs/01-spec/SPEC.md) | The full design document |
| [Architecture](docs/01-spec/architecture.md) | The two-realm split in detail |
| [Threat model](docs/02-security/threat-model.md) | What this defends against, and what it doesn't |
| [Verification](docs/02-security/verification.md) | Reproduce the build, check the hash |
| [Guides](docs/03-guides/) | Step-by-step for the flows that matter |
| [Supported chains](docs/04-reference/supported-chains.md) | |
| [Development](docs/05-development/build.md) | Build it yourself |

---

## Status

| Phase | Contents | Status |
|---|---|---|
| 0 | Foundation: two-realm bootstrap, vault format, reproducible builds | 🚧 P0.1 build skeleton complete |
| 1 | Core wallet: entropy, seeds, derivation, registry, devices | 📋 Specified |
| 2 | Backup: SLIP-39, codex32, Seed XOR, recovery shares | 📋 Specified |
| 3 | Portfolio and online: prices, balances, PnL, BIP-329 labels | 📋 Specified |
| 4 | Full coverage: remaining chains, recovery, BC-UR, descriptors | 📋 Specified |
| 5 | Advanced: miniscript, PSBT viewer, silent payments, quantum panel | 📋 Specified |

---

## License

MIT — see [LICENSE](LICENSE).

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md). Please don't open a public issue for anything that could put someone's funds at risk.

## No warranty

This software is provided as-is, with no warranty of any kind. It has **not been audited**. You are responsible for your own keys. Test any workflow with a throwaway wallet holding nothing before you trust it with anything.
