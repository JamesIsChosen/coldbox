# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each released version records the SHA-256 of its HTML artifact, so this file doubles as a historical hash record. A hash listed here should match the `.sha256` in the corresponding GitHub release and the CI build attestation.

---

## [Unreleased]

Foundation work in progress. Wallet and vault workflows are not available yet; the P0.10 cryptographic layer is now present behind the cold-realm boundary. See [ROADMAP.md](docs/05-development/ROADMAP.md) for item-level status.

### Added — P0.10 (2026-08-03)

- Vendored `argon2-browser` 1.18.0 with its embedded Argon2id WASM distribution, plus a deterministic build-time bundle of the selected `@noble/ciphers` and `@noble/hashes` modules.
- Pure-JS `@noble` AES-GCM as the default path, WebCrypto AES-GCM gated by an affirmative NIST known-answer test, and RFC 9106 Argon2id boot verification.
- Explicit KDF reporting in the cold realm and warm-shell capability summary; a PBKDF2-HMAC-SHA512 fallback is labelled with its active profile and iteration count whenever Argon2id cannot load.
- Node vector tests, protocol coverage for the cryptographic capability report, deterministic-build coverage, and Chromium/Firefox browser verification of the sealed realm.

### Changed — workflow (2026-08-03)

- **Branch hygiene is automatic.** Reviewers merge with `--delete-branch`; every session's preflight runs `git fetch --prune` and deletes local branches marked `[gone]`. Combined with the repo's *Automatically delete head branches* setting, no periodic manual sweep is ever needed. The only cleanup that still reaches the human is `git worktree remove` after a parallel run, since worktrees live outside the repo

- **Agents now do the git work.** Implementation sessions open their own PR with `gh pr create`; reviewers **merge on PASS**. In the normal case the human runs no commands and pastes one prompt per step
- **`🙋 Action required from you`** block, which appears **first** in any handoff where the human is blocked — a `👤 human-required` item, a missing credential, or a command the agent could not run. Exact commands with real values, plus what stays blocked until they run
- Reviewers do **not** auto-merge items touching the realm boundary, message schema, or vault format (P0.6, P0.7, P0.11) — those hand the merge to the human with the command pre-filled
- Renamed `expectNetworkPrimitiveThrows` → `expectNetworkPrimitiveBlocked`; the assertion checks whether a request was blocked, which for `sendBeacon` means a `false` return or a `connect-src` violation rather than a throw

### Added — process (2026-08-03)

- **Mandatory handoff blocks** closing the copy-paste loop. Every session — implementation, batch, and review — must end with the exact commands to run and the exact prompt for the next agent, **with every placeholder already filled in**. The human copies and pastes; they never memorize a command or search the docs. `AGENTS.md` §6b-handoff, [review-protocol.md](docs/05-development/review-protocol.md), [batch-run.md](docs/05-development/batch-run.md)
- Reviewers hand off too: PASS gives merge commands plus the next-item prompt; FAIL gives the fix prompt and then the re-review prompt. A reviewer never fixes findings itself
- A session ending without a handoff block is a contract violation

- **P0.3a — headless browser harness** roadmap item, and [ADR-0007](docs/05-development/adr/0007-headless-browser-harness.md) justifying Playwright as a dev dependency. Discovered when P0.4's implementation could not verify either of its acceptance criteria: **9 of 19 Phase 0 items have criteria only a browser can satisfy**, which under the binary review protocol stalls a campaign indefinitely. The harness makes 8 of them agent-verifiable
- `🌐` roadmap marker for browser-verifiable criteria, applied to the eight affected items, each naming what the harness covers and what it cannot
- Explicit rule: **an item whose criteria you cannot verify is `[~]`, never `[x]`**
- P0.19 remains `👤 human-required` — Playwright cannot test iOS Safari, and that is the platform most likely to break the two-realm model

### Added — P0.3a (2026-08-02)

- Pinned Playwright 1.62.1 under `devDependencies` with a `test:browser` command that runs the built artifact from `file://` in Chromium and Firefox
- Reusable browser assertions for CSP violations, hash-tampered script rejection, opaque-frame isolation, blocked network primitives, responsive viewports, and visible elements
- Browser fixtures and negative checks proving deliberate CSP violations and byte-tampered inline scripts fail with a non-zero harness result

### Changed — P0.3a review fixes (2026-08-03)

- Per-primitive network assertions now cover throw/reject, asynchronous `EventSource` errors, and `sendBeacon` returning `false`, and exercise all five supported primitives against a real `connect-src 'none'` frame fixture
- Added an untampered hash-pinning control and a byte-for-byte build comparison from a tree without `node_modules`
- Made browser installation explicit with `npx playwright install chromium firefox`; the test command no longer downloads browsers implicitly

### Added — process (2026-08-02)

- **[review-protocol.md](docs/05-development/review-protocol.md)** — binary PASS/FAIL review contract. No "approve with comments"; **any finding of any severity, including advisory, is a FAIL.** Requires independent verification, a review report opening with a verdict block, and a fresh verdict on re-review rather than an amendment
- `AGENTS.md` §6a: session preflight and postflight checklists, mandatory output verification after every git command, and shell gotchas (PowerShell mangling `@{`, `$?` reporting the wrong command after a pipeline)
- `AGENTS.md` §6b: agents are told upfront how their work will be judged

- **[batch-run.md](docs/05-development/batch-run.md)** — protocol for working several roadmap items unattended: bounded scope, dependency-aware branching (branch from the declared dependency, not the previous item), a self-review gate between items, hard stop conditions, and a handoff note. Batches never merge
- **[packets/](docs/05-development/packets/)** — PR packets and review reports moved to per-item paths. A single rotating `PR-PACKET.md` destroyed the audit trail and caused a merge conflict on every stacked branch
- `👤 human-required` roadmap marker for items needing physical hardware or a human decision; P0.19 (device matrix) flagged
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

### Changed — P0.4 review fixes (2026-08-03)

- Browser harness copies `build/coldbox.html`, flips one byte in its inline script, and verifies `script-src` rejection plus the absence of the skeleton state in Chromium and Firefox; the untampered build is a positive control
- Final-document `__COLDBOX_` placeholder checking now fails the build before any output is created

### Added — P0.6 (2026-08-03)

- Hash-pinned cold-realm `srcdoc` assembly with `sandbox="allow-scripts allow-downloads"` and no `allow-same-origin`
- Cold-realm CSP with `connect-src 'none'`, isolated child styling/script, and a warm-shell policy that permits only the pinned child hashes needed by the inherited `srcdoc` policy
- Chromium and Firefox coverage for per-primitive CSP-correlated throw results, standalone native CSP signals, parent DOM/variable isolation, exact sandbox permissions, and explicit fail-closed behavior for iframe creation or readiness timeout
- The original P0.6 throw contract is enforced; P0.8 remains responsible for the broader five-primitive runtime guard and CSP canary

### Added — P0.7 (2026-08-03)

- MessageChannel port transfer after the payload-free cold bootstrap signal, with terminal handshake state and post-handshake global-message anomaly logging
- Typed warm-to-cold and cold-to-warm protocol whitelist with payload validation, unknown-field stripping, safe public-compartment projections, recognizable secret-content rejection, and aggregate payload limits
- Visible anomaly warnings in both realms, Node handshake-guard mutation tests, and Chromium/Firefox browser-harness assertions for handshake readiness, global-handler discard behavior, and continued cold-realm boundary coverage

### Added — P0.8 (2026-08-03)

- Native CSP canaries in the warm shell and cold realm, with exact `connect-src` violation matching, an inherited-policy-safe cold target, and fail-closed behavior when a policy is missing or modified
- Cold-realm runtime neutering for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `navigator.sendBeacon`, including their prototype owners, with non-configurable, non-writable blockers and typed runtime-violation lockdown
- Checking/green/amber/red airgap banner states driven by `navigator.onLine`, `navigator.connection`, focus, online/offline events, connection changes, and a five-second refresh interval
- Chromium/Firefox browser-harness coverage for offline emulation, warm-only/cold-only/both-policy stripping, exact canary URLs, prototype restoration, and all five runtime network primitives

### Added — P0.9 (2026-08-03)

- Boot-time capability self-check panel covering `crypto.getRandomValues`, `crypto.subtle`, WASM, Workers, camera API availability, and the three documented save-path capabilities
- Hard fail and full lockdown when required `crypto.getRandomValues` is missing in either realm; no `Math.random` substitution is present or permitted
- Capability-specific lint and build regression guard rejects executable `Math.random()` substitutions in the required randomness path
- Warm/cold capability reporting, optional-capability warnings, worker-capability CSP support, and visible save-path availability summary
- Chromium/Firefox browser-harness coverage for normal capability reporting and the missing-randomness refusal path; physical Safari/mobile confirmation remains P0.19

### Added — P0.5 (2026-08-03)

- Responsive warm-shell skeleton with desktop navigation rail, mobile tab bar, overflow menu, hash routing, and dark/light mode
- Public-facing route placeholders for the documented workspace, tools, and reference sections; secret-handling routes remain intentionally unimplemented until the cold realm exists
- Browser-harness coverage for file-based routing, theme switching, desktop/mobile navigation, and 360px horizontal-overflow checks in Chromium and Firefox
- Regression tests for multiple inline blocks and browser verification of one-byte tampering on a copy of the built artifact
- Lint compatibility for the required `wasm-unsafe-eval` directive while rejecting `unsafe-eval`

### Added — P0.3 (2026-08-02)

- Build-integrated forbidden-construct lint for application source: `eval`, `new Function`, `import`, and `require`
- Cold-realm source checks rejecting external URLs and `localStorage`
- Negative fixture tests proving each forbidden construct fails the lint and the build refuses the source

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
