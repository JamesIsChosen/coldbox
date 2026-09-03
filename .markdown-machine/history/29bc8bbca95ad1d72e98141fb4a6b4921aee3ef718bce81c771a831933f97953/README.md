# Coldbox

**A single-file, offline-first self-custody security workstation in development. The accepted v1 target includes a complete standalone single-signature Bitcoin wallet while preserving Coldbox's secret-management, backup, recovery, verification, portfolio, and reference capabilities.**

One HTML file. No install, no server, no runtime. Copy it to a USB stick and open it in a supported local-file/browser context on Windows, macOS, Linux, or Android. Direct local execution from iOS Files is a portability target, not a current support claim; see [ADR-0010](docs/05-development/adr/0010-ios-local-html-execution.md).

> ⚠️ **Pre-release · not audited.** Do not use Coldbox to secure real funds yet. See the [roadmap](docs/05-development/ROADMAP.md) for the only authoritative item-level status.

### Product direction vs current build

Coldbox's durable product category is **Self-Custody Security Workstation**. The
roadmap, not marketing copy, determines what the current pre-release build can
actually do. Features owned by unfinished `SEC`, `SEED`, `WAL`, `P3`, `P4`,
`P5`, or later items are future capabilities until their roadmap work is
implemented and independently closed.

The current pre-wallet build still has no Bitcoin transaction construction,
signing, or broadcasting path. That is a **current implementation fact**, not a
permanent product non-goal. The accepted v1 contract adds a standalone Bitcoin
wallet and Coldbox-native Level 3 signing before release.

Coldbox remains free/open-source software. Optional donations or sponsorship may
support continued development, but no security capability is gated by payment,
activation, login, subscription state, advertising, or DRM.

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

## Capabilities and roadmap direction

This inventory spans shipped and accepted planned capabilities. The roadmap is authoritative for current availability.

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

## Standalone by design; hardware-enhanced by choice

Hardware wallets remain valuable independent signing/security boundaries, but
they no longer define what Coldbox is allowed to become.

Today, before the WAL phase lands, Coldbox is primarily the verification,
secret-management, backup, registry, and portfolio foundation described by the
completed roadmap items. It does **not** yet build or sign Bitcoin transactions.

The accepted v1 direction makes Coldbox a complete standalone single-signature
Bitcoin wallet. A user may choose Coldbox-native Level 3 signing without a
hardware wallet. Post-v1 hardware-signer integration adds an optional
higher-assurance path; it does not turn hardware into a prerequisite.

The durable promise is therefore not "Coldbox signs nothing." It is that secret
and signing authority remains deliberately bounded, reviewable, and isolated
from the network-capable warm shell.

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

**[docs/05-development/ROADMAP.md](docs/05-development/ROADMAP.md) is the single source of truth.** Item-level status lives there and nowhere else, so it can't drift out of sync with reality — every PR updates it in the same commit as the work.

| Phase | Contents |
|---|---|
| 0 | Foundation: reproducible builds, two-realm bootstrap, vault format |
| 1 | Core wallet: entropy, seeds, derivation, registry, device verification |
| 2 | Backup: SLIP-39, codex32, Seed XOR, recovery shares |
| 3 | Portfolio and online: prices, balances, cost basis, tax export, BIP-329 labels |
| 4 | Full coverage: remaining chains, recovery, BC-UR, descriptors |
| 5 | Advanced: miniscript, PSBT viewer, silent payments, quantum panel |

Phase 0 is in progress. Nothing here is usable for real funds yet.

---

## License

**GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`) — see [LICENSE](LICENSE).

Fork it, sell it, build on it. The condition is that if you distribute a modified version, you release the source of your modifications under the same licence, so anyone holding your build can rebuild it and check what it does. That is the same property the [reproducible build](docs/02-security/verification.md) exists to give — the licence just makes it binding on whoever ships next. If you do distribute a modified version, please also change the name, so users can tell whose build they are verifying.

Reasoning and rejected alternatives in [ADR-0018](docs/05-development/adr/0018-agplv3-license.md).

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md). Please don't open a public issue for anything that could put someone's funds at risk.

## No warranty

This software is provided as-is, with no warranty of any kind. It has **not been audited**. You are responsible for your own keys. Test any workflow with a throwaway wallet holding nothing before you trust it with anything.
