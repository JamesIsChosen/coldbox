# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each released version records the SHA-256 of its HTML artifact, so this file doubles as a historical hash record. A hash listed here should match the `.sha256` in the corresponding GitHub release and the CI build attestation.

---

## [Unreleased]

Foundation work in progress. Wallet, vault, and cryptographic features are not available yet. See [ROADMAP.md](docs/05-development/ROADMAP.md) for item-level status.

### Added — process (2026-08-02)

- **[review-protocol.md](docs/05-development/review-protocol.md)** — binary PASS/FAIL review contract. No "approve with comments"; **any finding of any severity, including advisory, is a FAIL.** Requires independent verification, a `REVIEW-REPORT.md` artifact opening with a verdict block, and a fresh verdict on re-review rather than an amendment
- `AGENTS.md` §6a: session preflight and postflight checklists, mandatory output verification after every git command, and shell gotchas (PowerShell mangling `@{`, `$?` reporting the wrong command after a pipeline)
- `AGENTS.md` §6b: agents are told upfront how their work will be judged

- **[doc-hygiene.md](docs/05-development/doc-hygiene.md)** — rules preventing documentation decay: one canonical home per fact, review dates and max ages on anything describing the outside world, docs shipping with the code that changes them, no orphan numbers, and automated checks wired into CI at P0.18
- Review dates added to `standards.md`, `api-sources.md`, `crypto-choices.md`, and `supported-chains.md`

### Changed — process

- **Status is single-sourced to the roadmap.** README carries phase descriptions only; item-level status lives in exactly one place so it cannot drift
- Definition of done now includes a clean working tree, exactly one roadmap item per branch, no duplicated facts, updated review dates, and a self-review against the reviewer's checklist
- Documentation staleness is explicitly in scope for review, and therefore a FAIL condition

### Added — P0.1 (2026-08-02)

- Pinned Node.js toolchain and lockfile for the first build step
- Deterministic source assembly into one `build/coldbox.html` file
- SHA-256 sidecar emission and reproducibility tests covering locale, timezone, line endings, and machine-path leakage

### Added — P0.2 (2026-08-02)

- Pinned official npm release tarballs for `@noble/hashes`, `@noble/curves`, `@noble/ciphers`, `@scure/bip32`, `@scure/bip39`, and `@scure/base`
- Offline local artifact verification and explicit online re-download verification against SHA-256 and npm SHA-512 integrity values
- Build fail-closed guard and regression tests for corrupted vendor artifacts

### Added — P0.4 (2026-08-02)

- Build-time SHA-256 hash-pinning for every inline script and style block in the CSP
- CSP policy embedded in the built HTML with deterministic hash injection
- Regression tests for multiple inline blocks and post-build script tampering

### Added — spec v0.4 (2026-08-02)

- **US tax reporting exporter** (SPEC §14.5, roadmap P3.9): Form 8949 CSV per box code, Schedule D summary, ordinary income report, lot audit trail, transfer ledger, 1099-DA reconciliation, safe harbor allocation record, plus TurboTax and TaxAct profiles
- New reference: [us-tax-reporting.md](docs/04-reference/us-tax-reporting.md) with rule citations and a review date

### Changed — spec v0.4

- **Breaking data model change: lot pools are now keyed by `(walletId, asset)`, not asset alone.** Rev. Proc. 2024-28 eliminated universal-wallet basis pooling effective 1 January 2025, so a global pool per asset cannot produce correct US figures
- Cost basis methods narrowed to FIFO and specific identification; HIFO and LIFO reclassified as **selection rules within specific ID** rather than independent methods, carrying the contemporaneous-records burden
- Added `Disposal` and `BasisAllocation` entities; `Lot` gained `walletId` and `carriedFromLotId`

### Added — spec v0.3 (2026-08-02)

- Hardware wallet companion role as the project's primary framing (§14a): device registry, fingerprint and receive-address verification, vendor support matrix, Seed XOR, multisig quorum survivability analysis
- Entropy Health Meter on every secret-creation screen — measures min-entropy rather than Shannon, shows claimed vs measured bits side by side, blocks generation below target, and refuses to give false-precision numbers for human-chosen passphrases
- codex32 (BIP-93) backup format — Shamir shares verifiable by hand with pen and paper
- BIP-329 wallet label import and export for portability with Sparrow, Nunchuk, BitBoxApp, and BTCPay
- Plain-English Help system at three depth levels, single-sourced with `docs/`
- Open source release engineering: reproducible builds, CI attestation, GPG signing, no hosted version
- Multi-currency support via CoinGecko `vs_currency` plus Frankfurter for fiat-to-fiat
- Historical price backfill with three modes, defaulting to manual entry
- Keyfile second factor, off by default
- Vault recovery shares: format reserved in Phase 0, feature shipped in Phase 2
- File hasher with no size ceiling: streaming, single-pass multi-algorithm, recursive folder hashing, interoperable manifests, and backup-media bit-rot verification
- Emerging standards survey with adoption decisions (§19), including an honest quantum readiness position
- Documentation structure and ADR practice

### Removed

- Duress/decoy compartment. Weak deniability against anyone who knows the file format, and it doubles the ways to lose data permanently
- QuickHash binaries (28 MB across three platforms), replaced by the built-in hasher

### Added — spec v0.2 (2026-08-02)

- Two-realm architecture: sandboxed cold realm with `connect-src 'none'` alongside a network-capable warm shell. Resolves the conflict between "tools must work online" and "secrets must never leak"
- Vault compartments — public and secret — so the portfolio works online while seeds stay sealed
- Portfolio manager: transactions, lots, FIFO/LIFO/HIFO/average/spec-ID cost basis, realized and unrealized PnL
- Price aggregation across five browser-callable sources, using median rather than mean
- On-chain balance lookups, opt-in per address, with the privacy cost stated plainly
- Notes and tags across every entity, with public/secret visibility
- Four-level concealment: masking, privacy blur, panic hide, hidden items
- Chain coverage expanded to 35+ with coin types verified against the live SLIP-44 registry

### Added — spec v0.1 (2026-08-02)

- Initial specification: single-file design, airgap enforcement, vault format, module breakdown, threat model, portability contract

---

## Release template

```
## [1.0.0] — YYYY-MM-DD

SHA-256: <hash of coldbox-v1.0.0.html>
Signed by: <GPG key fingerprint>
Reproducible build attestation: <CI run URL>

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
```
