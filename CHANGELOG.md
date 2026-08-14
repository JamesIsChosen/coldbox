# Changelog
- P0.19 canonical-save/live-transfer redesign: current vaults use one canonical `<name>--<id8>.cbx` with no user-visible save generations; unchanged saved vaults cannot create look-alike copies, public names cannot be reused by another known Vault ID, and historical generation files remain loadable only for compatibility/advisory rollback checks.
- Vault QR is now live Coldbox-to-Coldbox transfer only: no QR download/frame backup exists. The unlocked sender animates encrypted `.cbx` bytes under a random Transfer ID; the receiver verifies SHA-256, still requires the normal passphrase, and starts Not saved until it writes its own canonical `.cbx`. See ADR-0026.

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each released version records the SHA-256 of its HTML artifact, so this file doubles as a historical hash record. A hash listed here should match the `.sha256` in the corresponding GitHub release and the CI build attestation.

---

## [Unreleased]

### Added - P2.7 Backup Health dashboard (2026-08-14)

- Added a warm-only dashboard summary for public BackupRecords: current,
  unverified, overdue, invalid, and unsupported-method states are visible with
  direct links back to Backup Lab.
- Added conservative placement checks for missing metadata and repeated
  location/custodian labels. Different recorded locations are shown as
  distributed but threshold-unproven; the dashboard never claims a numeric
  survivability score or that individual shares survive a physical loss.
- Added deterministic health-engine tests, Chromium/Firefox `file://` coverage,
  the [Backup Health guide](docs/03-guides/backup-health.md), and
  [ADR-0042](docs/05-development/adr/0042-conservative-backup-health.md).

### Added - P2.6 BackupRecords and verify-your-shares (2026-08-13)

- Added public BackupRecord metadata with method, threshold, location,
  custodian, schedule, and cold-owned completion timestamps. Warm edits cannot
  manufacture or clear verification evidence.
- Added cold-only verification for SLIP-39, codex32, Seed XOR, Shamir39, and raw
  SSS. The warm shell receives only a closed result code and, on success, a
  public timestamp; share words and reconstructed secrets never cross the
  realm boundary. SeedQR, metal, paper, and encrypted-file records remain
  explicitly unsupported until their workflows exist.
- Added Chromium and Firefox `file://` coverage for public record creation,
  cold reconstruction, warm-shell isolation, and teardown. See [ADR-0041](docs/05-development/adr/0041-backup-record-verification-boundary.md).
- Hardened the public projection against supported share text in every
  BackupRecord text carrier, including both standard SLIP-39 lengths, and
  rejected impossible `groupThreshold > groups.length` metadata. Added
  independent-vector regression coverage for the boundary.
- Mechanically verified the public SLIP-39 detector against the canonical
  1,024-word list and added the official boundary vector that exposed the prior
  omission; the share remains rejected from every public text carrier in both
  projection directions.
- Bound cold BackupRecord completion to the uniquely resolved cold subject:
  every supported reconstruction candidate must match the subject's stored
  secret before `lastVerifiedAt` can be written, and unresolved or wrong-subject
  records fail closed.

### Added - P2.5 vault recovery shares (2026-08-13)

- Added an offline cold-realm recovery route that generates configured SLIP-39
  shares (2-of-3 by default) for the vault's 32-byte encryption key. The normal passphrase or
  keyfile route remains available; share phrases are never stored in the
  encrypted file and no second share passphrase is used.
- Added a fixed binary method-3 record with exact SLIP-39 metadata binding,
  a v1 recovery marker that makes pre-P2.5 readers reject recovery-enabled
  files, fail-closed malformed/unknown-record parsing, exact threshold-set
  validation, and recovery-share UI teardown/masking. Sessions re-authenticate
  before reissuing shares and do not retain the root DEK or wrapping key. See
  [ADR-0040](docs/05-development/adr/0040-vault-recovery-share-record.md) and
  the [vault-format specification](docs/01-spec/vault-format.md).

### Added - P2.3 Seed XOR (2026-08-12)

- Added a cold-only Seed XOR backup workflow for 12-, 18-, and 24-word BIP-39 phrases, with 2–4 required parts, Coldcard-compatible deterministic masks, CSPRNG-derived random masks, independent checksum validation, masked timed reveals, local combine/recovery, and teardown clearing. Seed XOR is explicitly N-of-N rather than threshold recovery; BIP-39 passphrases remain separate. See [ADR-0039](docs/05-development/adr/0039-seed-xor-cold-only.md) and the [Seed XOR guide](docs/03-guides/backup-seed-xor.md).

### Added - P2.4 Shamir39 and raw SSS (2026-08-12)

- **Cold-only threshold shares.** Shamir39 splits valid BIP-39 phrases into
  mnemonic shares, and raw SSS splits hexadecimal secrets over GF(2^n) with
  the secrets.js-compatible format. Both use only `crypto.getRandomValues`
  and fail closed when secure randomness is unavailable.
- **Masked recovery workflow.** The sealed realm keeps sources, shares, and
  reconstructed candidates out of the warm message channel, masks them by
  default, offers a timed reveal, and clears all inputs and outputs on lock or
  panic teardown. There is no clipboard, storage, download, or print action.
- **Independent compatibility coverage.** Published Ian Coleman Shamir39 and
  secrets.js vectors, malformed-share negatives, deterministic formatting,
  Chromium/Firefox UI isolation, and teardown are covered. See
  [ADR-0038](docs/05-development/adr/0038-shamir39-and-raw-sss-cold-only.md)
  and [the guide](docs/03-guides/backup-shamir.md).
- **Full-uniform coefficient policy.** Nonconstant polynomial coefficients are
  sampled independently from the complete finite field, including zero, to
  preserve Shamir's below-threshold secrecy property. This intentionally does
  not reproduce the pinned generators' nonzero coefficient distribution; the
  share encoding and combine compatibility remain unchanged.
- **Cross-combine regression coverage.** Forced-zero Shamir39 and raw-SSS
  vectors reconstruct with the pinned Ian Coleman and secrets.js combiners,
  and exhaustive GF(8) checks cover one- and two-share below-threshold
  distributions.

### Added - P2.1 SLIP-39 cold backup shares (2026-08-11)

- Added a cold-only SLIP-39 Backup Lab using the standard 1024-word list, secure randomness, 20/33-word phrase-entropy inputs, two-level group thresholds, share passphrase extension, checksum validation, masked 30-second reveal, and local recovery comparison.
- Added official Trezor interoperability vectors for no-sharing, 2-of-3, two-level group, extendable-backup, malformed-share, duplicate-share, and missing-randomness cases. BIP-39 passphrases remain separate backup material.
- Added [ADR-0036](docs/05-development/adr/0036-slip39-cold-vendoring.md) and pinned source provenance for the browser adaptation.

### Fixed - P1.11 independent-review remediation (2026-08-11)

- Warm public registry replacements can no longer elevate an address to `cold-verified` or rewrite authenticated verification evidence; schema-1 public compartments migrate in the cold vault session and persist as schema 2; and Chromium/Firefox coverage locks the stale Registry label to `Cold verification stale`.
- Cold-owned public replacements now compare authenticated address evidence with the next account xpub and force `cold-verified-stale` on xpub changes, even when the warm caller requests `cold-verified`.
- Warm stale-state requests can no longer downgrade an authenticated address or rewrite its timestamp/xpub evidence when the account xpub still matches.

### Fixed - P1.12 independent-review remediation (2026-08-11)

- Address verification now preserves raw candidates, validates Bech32/Bech32m and Base58Check checksums, retains checksum-invalid batch outcomes, and reports full mismatch evidence with a divergence caret.
- Cold verification now derives and verifies both Bitcoin and EVM registry accounts before updating public provenance; different-account results name the account.
- Added focused cold-state coverage and Chromium/Firefox browser coverage for EVM cold verification, account labels, aligned mismatches, raw whitespace, and checksum-invalid batch rows.

### Fixed - P1.13 remediation (2026-08-11)

- Clipboard canary permission/API exceptions are visibly unavailable instead of escaping synchronously; stale enable, retry, disable, and delayed-read callbacks can no longer overwrite newer state.
- Added Chromium/Firefox file:// coverage for the off-by-default, denied/retry, API-absent, and affirmative-change canary UI paths while preserving ordinary address comparison.

### Added - P2.2 codex32 (2026-08-12)

- **Cold-only BIP-93 backup shares.** The sealed realm now encodes direct 16-to-64-byte BIP-32 master seeds, generates threshold shares over GF(32), recovers exact threshold sets, supports the regular and long checksum formats, and fails closed on invalid configuration, missing randomness, or bad checksums.
- **Masked recovery workflow.** Generated and recovered codex32 strings stay masked until a timed reveal; single-character correction is a confirmation-gated suggestion and never auto-applied. Official BIP-93 vectors and Chromium/Firefox `file://` coverage are included. See [ADR-0036](docs/05-development/adr/0037-codex32-cold-hand-verifiable.md).

Foundation work in progress. Full wallet workflows remain ahead; the P0.10 cryptographic layer, P0.11 vault format, P0.12 KDF benchmark, and P0.13 lock/save/load surface are now present behind the cold-realm boundary. See [ROADMAP.md](docs/05-development/ROADMAP.md) for item-level status.

### Added — P1.11 address verification state (2026-08-10)

- **Explicit public address provenance.** Address records now carry `addressOrigin`, `verificationState`, `lastColdVerifiedAt`, and `verifiedAgainstXpub`. Legacy public data migrates to schema 2 with every address explicitly `manual` and `unverified`; verification is never inferred.
- **Staleness is automatic.** Changing an account xpub moves its previously `cold-verified` addresses to `cold-verified-stale` while retaining the evidence that is now stale. The Registry visibly labels never-verified and stale addresses.
### Added — P1.10 QR generation (2026-08-10)

- **Public address QRs.** QR Studio creates local BIP-21 Bitcoin or EIP-681 Ethereum receiving payloads with chain-appropriate optional amount fields (and Bitcoin labels) plus SVG/PNG export. Seed-shaped input is rejected, and the UI keeps the warning that a QR does not prove ownership or correctness.
- **Cold-only SeedQR.** Standard four-digit word-index and Compact raw-entropy QR formats, explicit plaintext acknowledgement, A4/Letter and wallet-sized printable cards, transcription grid, and SVG/PNG export run inside the sealed frame. The guide documents printer, camera, spooler, and photograph retention risks.

### Fixed - P1.10 independent-review remediation (2026-08-10)

- Ethereum EIP-681 amounts are converted from human ETH decimals to integer wei, unsupported Ethereum labels fail closed, and the browser harness now exercises the real warm and cold QR Studio flows in Chromium and Firefox.
- Compact SeedQR defaults to low error correction for the SeedSigner-compatible 21x21/25x25 dimensions; Standard SeedQR rejects non-English wordlists because its numeric indices carry no language identifier.
- Cold print permission is limited to `allow-modals`, wallet-sized print CSS preserves its physical card dimensions, cold exports use short-lived Blob URLs for Firefox sandbox compatibility, and lock teardown resets the QR acknowledgement and controls.

### Added — P1.12 clipboard round-trip verification (2026-08-10)

- **Whole-string address comparison.** Warm round-trip, inbound, and batch checks compare every character, report the first divergence, handle Bech32 case-insensitively, keep Base58 case-sensitive, and report invalid mixed-case EVM checksums separately.
- **Separate authority claim.** The sealed realm now accepts a typed public verification request, re-derives the selected registry address when the current Seed Forge identity is available, updates its verification evidence, and returns enum-only outcomes. Locked vaults return `vault-locked`, never `no-record`.

### Added — P1.13 clipboard volatility canary (2026-08-10)

- **Explicit opt-in only.** The canary is off by default and is not enabled by paste or by any other verification action. It requests clipboard-read permission only after the user enables it, and provides a retry control when permission is denied or the API is absent.
- **Affirmative change detection.** It establishes a baseline and re-reads after a delay with no user action. A change is reported as observed clipboard volatility, naming clipboard managers, sync tools, and remote-desktop clients before malware; the ordinary address comparison remains available.

### Added — P1.9 verification workflows (2026-08-10)

- **Cold-local hardware-wallet checks.** Verify Bench links the current public identity from Seed Forge and compares an independently entered device fingerprint, receive address, account xpub, or metal-backup fingerprint. The fifth roadmap check, BIP-39 passphrase verification, uses the exact passphrase selected and confirmed in Seed Forge; no duplicate passphrase panel exists. Comparisons validate complete public values; uniform-case Bech32 is accepted while mixed-case Bech32 and invalid checksums fail closed.
- **Protected inputs and explicit limits.** Seed phrases and passphrases stay inside the opaque cold frame, the linked public identity is invalidated when Seed Forge changes or the session tears down, external values are cleared on lock/panic teardown, and no secret enters the message channel. P1.9 has no hardware transport or device-authenticity claim; the manual real-device validation gate remains open. See [ADR-0034](docs/05-development/adr/0034-cold-local-verification-workflows.md).

### Added — P1.8 device registry (2026-08-10)

- **Public device inventory.** The Devices workspace records bounded hardware-wallet metadata, lifecycle status, purchase/tamper/PIN context, public seed fingerprints, location, notes, and a passphrase-use boolean without connecting to or signing with hardware.
- **Typed public persistence.** Device CRUD, search, reversible hiding, secure UUID generation, lock teardown, and invalid-field/secret-shaped rejection use the existing public registry mutation boundary. See [ADR-0033](docs/05-development/adr/0033-device-registry.md).

### Added — P1.7 notes, tags, and concealment (2026-08-10)

- **Public notes and shared tags.** Wallets, accounts, addresses, and standalone public Note records now carry bounded Markdown notes, canonical shared tags, and reversible hidden flags. Search filters the public registry without sending text outside the validated projection.
- **Compartment-aware notes.** The public schema accepts `visibility: public` notes only; secret-note-shaped records are rejected instead of being rendered in the warm shell. Secret notes can be searched inside the cold realm while their title, body, and tags remain encrypted.
- **Concealment controls.** Privacy blur persists locally, Panic hide clears reveal state and locks immediately, and hidden-record reveal requires re-entering the vault phrase inside the cold realm. See [ADR-0032](docs/05-development/adr/0032-notes-tags-and-concealment.md).

### Added — P1.6 registry CRUD (2026-08-10)

- **Warm public registry.** Wallet, account, and address records can be created, edited, and soft-hidden from the warm shell while the vault is unlocked; whole-compartment relationship checks, explicit schema-safe clearing of optional fields, and secure random UUIDs are enforced locally.
- **Cold persistence gate.** Registry changes cross only as the typed `publicData.replace` / `publicData.updated` public-projection messages. The cold session re-encrypts the updated public compartment, preserves the authenticated Vault ID, and never exposes secret-compartment plaintext.
- **Schema and negative coverage.** Collection-specific protocol validation rejects unknown text, secret-shaped values, malformed relationships, and invalid balance timestamps; CRUD, clone isolation, soft-delete, explicit set/clear, persistence, and Chromium/Firefox browser tests are included. See [ADR-0031](docs/05-development/adr/0031-public-registry-mutation-boundary.md).

### Added — P1.5 EVM and arbitrary-path derivation (2026-08-10)

- **Cold-only EVM derivation.** The sealed realm now derives the standard `m/44'/60'/account'/change/index` EVM paths, formats Keccak-256 addresses with EIP-55 checksums, and supports account-level xpub watch-only batches.
- **Generic recovery paths.** Coldbox exposes a strict arbitrary BIP-32 path projection with extended keys, raw keys, and compressed WIF for cold-local recovery tooling, plus non-hardened public derivation from an extended public key.
- **Independent vector coverage.** Official ERC-55 examples and the ethereumjs HD-key fixture cover checksum and EVM derivation behavior; malformed address, depth-3 non-hardened watch-only, account-depth, and batch-limit negatives fail closed. See [ADR-0030](docs/05-development/adr/0030-cold-only-evm-and-arbitrary-path-derivation.md).

### Added — P1.4 Bitcoin derivation engine (2026-08-10)

- **Cold-only BIP-32 derivation.** The sealed realm now derives Bitcoin account paths for P2PKH, P2SH-P2WPKH, P2WPKH, and BIP-86 P2TR on mainnet and testnet, with hardened path parsing, bounded batches, account-level watch-only xpub support, and public-only high-level results.
- **Independent vector coverage.** Official BIP-32/BIP-49/BIP-84/BIP-86 vectors, negative malformed-input fixtures, and an independent Node/OpenSSL secp256k1 public-key check cover the engine. The official BIP-32 `m/0'/1/2'` extended public key is asserted byte-for-byte.
- **Derivation remediation.** Watch-only Bitcoin imports now require a depth-3 hardened account child, and every script family rejects compressed bytes that are not a valid secp256k1 point before constructing an address.
- **Structural boundary.** `@scure/base` encodings and the secp256k1 point API are vendored into the cold realm; no new message type or network capability was added. See [ADR-0029](docs/05-development/adr/0029-cold-only-bitcoin-derivation-engine.md).

### Added / fixed — P1.3 Seed Forge (2026-08-10)

- **Cold-only BIP-39 generation and validation.** Seed Forge supports 12/15/18/21/24 words and all ten vendored official wordlists, validates each word plus the checksum, and keeps the phrase masked until an explicit short reveal.
- **Exact Mix handoff.** A successful Entropy Lab Mix exposes a one-use **Use this mix in Seed Forge** action. The exact mixed bytes are consumed without a second mix, and entropy/target changes clear the pending copy.
- **Live passphrase derivation.** Generate and Validate Existing Phrase each have a separate passphrase/confirmation pair and separate live raw-seed/fingerprint state; a matching change or mismatch affects only its own workflow. Both remain cold-only, masked by default, and clear on teardown. No clipboard or storage action exists.
- **Fail-closed coverage.** Independent official first PBKDF2 vectors for all ten languages, including Japanese final NFKD handling, an independent Node/OpenSSL master-fingerprint reference, malformed-input negatives, and Chromium/Firefox assertions for the exact handoff and dynamic derivation are included. Structural choices are recorded in [ADR-0028](docs/05-development/adr/0028-cold-only-bip39-seed-forge.md).

### Added — P1.2 Entropy Health Meter and Bias Analyzer (2026-08-09)

- **Entropy Health** now shows claimed bits, an observed empirical min-entropy estimate, per-symbol frequencies, and advisory chi-square, runs, lag-one correlation, and pattern diagnostics for physical/manual dice, coin, and hex observations. Device-RNG simulations are explicitly excluded from the analysis.
- **Cards are handled as without-replacement permutations:** their claimed permutation bits and order warnings remain visible, while iid frequency/runs/correlation results are reported as not applicable. Small or malformed samples fail closed rather than producing a misleading pass.
- Statistical definitions and limitations are recorded in [ADR-0027](docs/05-development/adr/0027-entropy-health-statistical-diagnostics.md); P1.1's integer entropy accounting remains the security authority.

### Fixed — P1.2 independent-review remediation (2026-08-09)

- Added creation-only live guidance for human-chosen vault passphrases without inventing a numeric entropy score; ordinary unlock keeps that panel hidden.
- Tightened the runs-test large-sample precondition, corrected repeated-block detection, and made P1.2's advisory state thresholds and future P1.3 generation boundary explicit across the specification and help content.

### Changed — P0.19 device-matrix remediation design (2026-08-08)

- Windows hands-on remediation round 2: make Vault ID immutability across re-saves explicit/enforced, show an inline creation-passphrase mismatch error, update save status to `Saved · verified` / `Saved · unverified`, and route the cold visible lock button through the same warm unsaved/unverified confirmation gate.
- Historical P0.19 candidate: cleared stale manual/QR vault exports when switching identity. ADR-0026 later removed vault QR export entirely; manual Base64 remains an advanced handoff.
- Windows Chrome/Firefox hands-on testing exposed two user-facing blockers before the rest of the physical matrix proceeds: vault creation/save/library state was not understandable enough to complete the required create → save → reload → open flow, and the network banner stayed stale when Ethernet reachability changed because it ultimately trusted `navigator.onLine`.
- [ADR-0024](docs/05-development/adr/0024-warm-reachability-monitor.md) replaces interface-state authority with warm-shell active reachability probes to two already-allowlisted providers, keeps checking/unknown online-safe, separates warm reachability from cold-realm isolation, and explicitly refuses to call probe failure proof of a physical airgap.
- [ADR-0025](docs/05-development/adr/0025-vault-identity-library-and-save-ux.md) defines creation-only phrase confirmation, public vault names, cold-generated portable random Vault IDs (device fingerprints rejected), a user-granted multi-vault library, prominent unsaved/save state, the then-proposed per-vault generational filenames, and zeroization-preserving lock semantics. ADR-0026 supersedes the visible-generation filename portion. Existing v1 `.cbx` bytes remain compatible.
- Runtime remediation now implements that accepted contract on the P0.19 branch: strict payload-free creation gating, creation-only phrase confirmation, cold-generated random Vault UUIDs, named/per-vault save filenames and generation namespaces, the user-granted Vault Library, first-class Save + dirty-lock warning UX, and warm-only active reachability monitoring with deterministic Chromium/Firefox harness fixtures. **P0.19 itself is still not complete** until the maintainer repeats the physical device matrix; the ROADMAP remains authoritative; the cold vault layer now treats validated `mode.set` as the sole network-mode authority and ignores stale `navigator.onLine` hints.
- **FAIL remediation:** a new reachability round invalidates a stale offline result to `unknown` before awaiting probe I/O, sends the online-safe cold mode immediately, and zeroizes any offline secret-capable session during the held-probe interval. Live QR receive now reports the actual camera-plus-QR-decoder capability and disables the scanner with an explicit canonical `.cbx` fallback when that path is unavailable. The dependency inventory now describes ephemeral live `CBX-VT/1` frames rather than the superseded numbered-vault-QR export.

### Added — P1.1 Entropy Lab: dice, coins, cards, hex, CSPRNG, mixing (2026-08-07)

- **`src/cold/entropy-lab.js`** (new cold-realm module, wired into the build via a new `entropy-lab.js` component/`__COLDBOX_ENTROPY_LAB_LAYER__` token in `scripts/build.js`): collects entropy from dice (base-6, kept in an exact `BigInt` accumulator; and a 4-outcome discard mapping that keeps rolls 1-4 as exactly 2 unbiased bits and rerolls 5-6), coin flips (1 bit), playing cards drawn without replacement (factorial-number-system accumulator, ~225 bits for a full 52-card deck), and typed hex digits (4 bits each). A running "guaranteed bits" meter is a conservative floor — `bitLength(possibility-space-size) - 1` — computed entirely in integer/`BigInt` arithmetic, never a float, so the security gate can't be tipped by rounding. Per-operation undo, including for a rejected (5/6) discard roll.
- **Mixing**: `SHA-256(counter ‖ (manualEntropyBytes XOR csprngBytes))`, expanded block-by-block for the five BIP-39 `ENT` sizes (128/160/192/224/256 bits) — the literal "XOR-then-hash" construction `docs/04-reference/entropy-and-strength.md` and `docs/03-guides/first-wallet.md` already documented ahead of this implementation. Fails closed (throws, produces nothing) if fewer guaranteed bits are collected than the requested output, or fewer CSPRNG bytes are available than needed to XOR against the manual entropy — never silently pads, truncates, or reuses CSPRNG bytes. Design and the rejected HKDF alternative are recorded in [ADR-0022](docs/05-development/adr/0022-entropy-lab-mixing.md).
- **UI**: a new `#cold-entropy-lab` section in `src/cold/index.html` (dice/coin/card/hex/CSPRNG controls, an undo button, a live bit-count meter, an output-size selector, and a masked-until-mixed hex output), wired in `src/cold/main.js` gated on the same crypto self-test readiness flag that gates vault creation — no dependency on the warm-cold message handshake, since this feature never crosses the realm boundary. CSS in `src/cold/styles.css` follows the existing KDF-benchmark/vault-controls pattern: solid (non-opacity) disabled fills, `:focus-visible` rings, and a ≥44×44px touch-target floor on every button, since every control here represents a physical die/coin/card input.
- **`docs/02-security/threat-model.md`** gains a "Defended" entry, "A single rigged or backdoored entropy source," linking to the ADR and to entropy-and-strength.md's accounting rather than duplicating it.
- **Seed Forge (P1.3) does not exist yet.** The mixed output is displayed inside the sealed realm with an explicit note that it is not carried anywhere; it is not written to the vault, not sent across the message channel, and not persisted.
- **`test/entropy-lab.test.js`** (12 tests): the mixing construction is checked against an independent reimplementation using Node's built-in (OpenSSL-backed) `crypto` module rather than the vendored `@noble/hashes` implementation the production code calls, since this is a bespoke construction with no published BIP/SLIP/RFC vector to test against. Also covers the discard-mapping's exact 2-bit output and 5/6 rejection, the base-6 and card `BigInt` accumulators' conservative bit accounting, per-source undo (including a rejected roll), and fail-closed behaviour on insufficient guaranteed bits, a short CSPRNG buffer, and out-of-range/malformed inputs.
- **Bundle size delta:** a clean build of `main` (via `git archive`, offline `npm ci`) produces `build/coldbox.html` at 1,094,338 bytes; this branch's build is 1,128,409 bytes, **+34,071 bytes (≈+33.3 KB)**. New total ≈1.08 MB, inside [SPEC §3](docs/01-spec/SPEC.md)'s budget.
- Roadmap item recorded as `[~]` — the marker is the independent reviewer's to flip.
- **Remediation round 1:** an independent review returned FAIL (11 findings). Fixed: the mixing formula dropped an extraneous 4-byte counter that didn't match the documented `SHA-256(manual XOR csprng)` formula (F5); `mix()` now supports a CSPRNG-only path with no manual entropy recorded, matching entropy-and-strength.md's "256 bits by definition" (F1); CSPRNG bytes are consumed ("burned") on use so a second `mix()` call can't silently reuse them (F6); card draws support starting a new shuffle once a 52-card pool is exhausted, compounding entropy across shuffles rather than resetting (F7), matching the documented "2 shuffles" path to 256 bits; the card-selector UI is rebuilt from session state on every change instead of tracked incrementally, fixing an undo/DOM desync (F3); a displayed mix result is now cleared on any further input or target-size change (F4); an ASCII diagram was added to entropy-and-strength.md's mixing section (F8). Not fixed: the "...to Seed Forge" acceptance criterion remains unmet, since Seed Forge is a separate, not-yet-built roadmap item (F2); browser verification remains impossible in this authoring sandbox (F9). See `docs/05-development/packets/p1.1-entropy-lab.review.md` and `p1.1-entropy-lab.md`'s §13 for the full record.
- **Remediation round 2:** a second independent review returned FAIL (5 findings). Fixed: an undo of an earlier CSPRNG draw could resurrect bytes a later `mix()` call had already spent, because `mix()` shortened `session.csprngBytes` directly while an older `addCsprngBytes` undo closure held a stale pre-mix array reference — replaced with a monotonic `session.csprngConsumed` byte offset that only ever advances, so undo can only ever truncate the array (never regrow spent bytes back into view); the meter, CSPRNG status, and undo/mix button state now refresh immediately after a successful mix instead of only on the next unrelated action, via a `preserveOutput` option on the shared control-refresh function so the refresh doesn't also wipe the result it just displayed. Routed to the maintainer as decisions rather than code fixes: the "outputs ... to Seed Forge" wording is revised in SPEC.md §11.1 to describe Entropy Lab's own deliverable rather than a completed hand-off to a not-yet-built item, recorded in [ADR-0023](docs/05-development/adr/0023-entropy-lab-seed-forge-boundary.md); the maintainer began manual browser verification in place of the still-unavailable Playwright binaries.
- **UX overhaul (hands-on manual testing):** manual browser testing surfaced that typing a long digit sequence into the single-character dice input and clicking "Add roll" silently did nothing — the meter read 0 bits with no error. Dice and hex inputs now accept bulk paste/typed sequences (each valid character becomes its own roll/nibble; invalid characters are reported, not silently dropped). The card `<select>` + "Add card" button is replaced with a 52-button grid showing every card at once (drawn cards stay visible but disabled) plus a running log of cards drawn. Each source (dice, coin, cards, hex, CSPRNG) gained its own independent "Reset" button — requiring `entropy-lab.js`'s previously-shared `exactBits` array to split into `coinBits`/`discardDiceBits`/`hexBits`, and history entries to carry a `{kind, undo}` tag so `reset*()` can purge only that source's undo entries (`purgeHistoryKind`), preventing the same undo-resurrection bug class the round-2 CSPRNG fix addressed, now proven by 7 new regression tests. Each source also gained a "Generate random" control (configurable count) that fills it in via CSPRNG rejection sampling (`drawUniformInt`, unbiased, never `Math.random`) so any combination of sources — including a single source alone — is easy to use. The guaranteed-bits meter is now `position: sticky` so it stays visible while scrolling the fieldsets below it, instead of requiring a scroll to the bottom of the section. Dice, coin, and hex fieldsets each also gained a log line showing the actual values collected so far (not just a count) — reconstructed for display from `diceDigits`/`discardDiceBits`/`coinBits`/`hexBits` in `src/cold/main.js` — matching the cards log that already showed drawn cards.
- **Remediation round 3 (maintainer security/UX review):** the Generate conveniences are now labeled **"Generate with device RNG"** and carry `device-rng` provenance through `entropy-lab.js`; simulated dice/coins/cards/hex receive zero independent-source credit. The sticky meter now separates **normal output strength**, **independent physical/manual entropy**, and **independent-source fallback strength**; partial real manual entropy improves only the fallback figure, while **full two-source protection** appears only when conservative independent credit reaches the selected target. The mixed path consumes at least the selected output length in fresh CSPRNG bytes (right-padding shorter source serialization only for the XOR), so a 256-bit normal output never silently relies on only a short CSPRNG slice. Exact-bit serialization is restored with a chronological `{kind, bits, provenance}` event ledger, and logs group values as `Physical/manual` versus `Device RNG`. Card-grid and count-input overrides are restored to the 44×44 touch-target floor; unit and browser-harness coverage exercise provenance, partial/full fallback states, target changes, Undo/Reset, generated-only CSPRNG security, CSPRNG burn, successful mixing, post-mix refresh, and touch targets.

### Added — P0.21 cold-realm injected-provider neutering (2026-08-07)

- **`src/airgap.js` gains `neuterProviders()`**, extending P0.8's runtime network-primitive neutering to the two observable surfaces of an injected wallet provider: `window.ethereum` (blocked with a non-configurable, non-enumerable accessor installed on both the object and its property owner) and the `eip6963:announceProvider` event (a capture-phase listener that reports and stops propagation). Neither surface is reachable through page CSP (`connect-src 'none'` does not apply to provider calls), so this closes a hole [ADR-0020](docs/05-development/adr/0020-injected-providers-rejected-and-neutered.md) identified but did not itself close.
- **An observed provider enters full lockdown**, exactly like a network-primitive violation: `data-airgap-state="red"`, `data-lockdown-state="full"`, `data-vault-operations="refused"`, gated into `vaultHealthReady()` (`src/cold/vault.js`). The alarm text opens with "Cold realm isolation failure" and explicitly states this is not a network-policy violation, per the roadmap's requirement that the two be distinguishable.
- **The capability travels to the warm shell** via a new `providerNeutering` field in the `ready` handshake message (`src/protocol.js`, `src/main.js`) and a new `provider-isolation-violation` warning code with its own warm-side copy.
- **`test/airgap.test.js` gained 6 tests**, including a negative test proving the blockers survive an attempted redefine/delete, and detection of a dispatched `eip6963:announceProvider` fixture. `test/vault.test.js` updated its default/failure fixtures for the new gate attribute.
- **`scripts/run-browser-harness.js` gained `verifyProviderNeutering()`**, run in both Chromium and Firefox per the roadmap's 🌐 marker, immediately after the existing prototype-restoration/network-primitive checks: negative redefine/delete survival, a live `window.ethereum` assignment triggering full lockdown with isolation-specific text on both the cold-frame and warm-shell sides, an unrelated-event non-trigger, and a dispatched `eip6963:announceProvider` fixture. Could not be run in this authoring sandbox (no outbound network access to download Playwright's browser binaries — the same limitation prior packets, e.g. P0.18's and P0.20's, disclosed); verified only by `node --check`, `npm run lint`, and manual tracing against the element IDs and message-passing code it exercises.
- **Bundle size delta recorded against [SPEC §3](docs/01-spec/SPEC.md)'s budget:** `build/coldbox.html` grows from 1,080,408 bytes (a clean build of `main` immediately before this branch) to 1,089,324 bytes, **+8,916 bytes (≈+8.7 KB)**. New total is ≈ 1.04 MB, well inside budget.
- Roadmap item recorded as `[~]` — the marker is the independent reviewer's to flip.
- **Remediation round:** an independent review returned FAIL (F1, blocking): a provider already present at `window.ethereum` before the guard installed was silently overwritten with no isolation violation reported, letting cold bootstrap potentially reach `ready` instead of full lockdown. Fixed by inspecting the existing property descriptor before installing (reading only a data descriptor's `value`, never invoking a getter or any provider method) and routing a preexisting provider through the same isolation-violation path as a post-install assignment attempt. New unit regression proves detection never calls into the provider object; new browser-harness fixture establishes provider presence before cold bootstrap runs and asserts full lockdown rather than readiness. See `docs/05-development/packets/p0.21-injected-provider-neutering.review.md` and the roadmap's remediation note.

### Added — P0.20 in-app Appropriate Legal Notices (AGPLv3 §5(d)) (2026-08-07)

- **The Provenance panel gains a "Legal notices" section** (Reference → Provenance) displaying the Appropriate Legal Notices AGPLv3 §0 defines and §5(d) requires an interactive UI to display: the copyright notice (`Copyright (C) 2026 James Kent`), the absence-of-warranty statement, that recipients may convey the work under this same licence, and the licence stated by its SPDX identifier, `AGPL-3.0-only` (matching `package.json`'s `license` field, asserted by test). All reachable from the app's own UI, offline, without leaving the file — no link out.
- **The full `LICENSE` text is embedded in the bundle** (`scripts/build.js`'s new `readLicenseText()`, reading the repository's raw `LICENSE` bytes with no normalization) and shown in place inside a `<details>` disclosure — a URL was rejected outright, per the roadmap item, since it would be unreachable in the airgapped case the app is designed for and would itself be an outbound reference the cold realm's `connect-src 'none'` and the project's no-network-fetch constraint forbid. Populated into the DOM on load, not on first expand, so it's reachable by assistive tech and the browser harness without requiring a click first.
- **Byte-identity is a Node test, not an assertion:** `test/legal-notices.test.js` compares the embedded text against the repository's own `LICENSE` file byte-for-byte (`Buffer` comparison, not string `===`), so the two cannot silently drift. Negative tests cover a build against a deliberately modified `LICENSE` (proves the comparison is meaningful, not vacuous), a missing placeholder (build refuses closed), and a duplicated placeholder (build refuses closed).
- **`scripts/run-browser-harness.js` gains `verifyLegalNotices()`**, run in both Chromium and Firefox per the roadmap's 🌐 marker: drives a real page with `page.context().setOffline(true)`, navigates to Reference → Provenance, and confirms the copyright/no-warranty/convey/SPDX text and the full licence text are all visible — including via the `<details>` disclosure actually being opened by a simulated click, not just present in markup. Could not be run in this authoring sandbox (no outbound network access to download Playwright's browser binaries — the same limitation prior packets, e.g. P0.18's, disclosed); verified statically only.
- **Bundle size delta recorded against [SPEC §3](docs/01-spec/SPEC.md)'s budget (target ≤ 3 MB, hard cap 4.5 MB):** `build/coldbox.html` grows from 1,040,057 bytes (a clean build of `main` immediately before this branch) to 1,080,408 bytes, **+40,351 bytes (≈ +39.4 KB)** — the embedded licence text and its JSON-escaping overhead (≈37.7 KB) plus the new three-depth glossary entry backing the panel's contextual help (≈1.7 KB), in line with [ADR-0018](docs/05-development/adr/0018-agplv3-license.md)'s ≈34 KB estimate for the licence text itself. New total is ≈ 1.03 MB, well inside budget. (Corrected during P0.20 review remediation: the original figure of 1,040,074 bytes was measured with `git archive main | tar -x`, which drops `.git` and so falls back to the "unknown (no git commit metadata available)" build-date string instead of a real one — a 17-byte artifact of the measurement method, not of `main` itself. A `git worktree` checkout, which keeps `.git`, gives the corrected number and reproduces byte-for-byte.)
- **The release gate already existed in [release-checklist.md](docs/05-development/release-checklist.md)** (added alongside the relicensing commit below) — no further change needed there; this item is what makes that checkbox satisfiable.
- New glossary entry **"Appropriate Legal Notices"** at three depths, in `docs/00-overview/glossary.md`'s "App features (in Coldbox)" category, linked from the panel's ADR reference; `npm run build` continues to emit zero help-content warnings.
- **Assumption recorded:** the copyright notice's holder and year (`James Kent`, `2026`) mirror the project's former MIT `LICENSE` notice and [ADR-0018](docs/05-development/adr/0018-agplv3-license.md)'s statement that all copyright is currently held by a single author — no other canonical statement of this fact exists in the repository today, so this PR introduces it. See the PR packet's Assumptions section.
- **Independent review of PR #31 returned FAIL (1 blocking finding, 2 advisory, all remediated in this branch before re-review):**
  - **F1 (blocking):** `scripts/run-browser-harness.js`'s `verifyHelpFramework()` still hardcoded an assertion that exactly five contextual-help buttons survive app initialization, but P0.20 added a sixth (`glossary:appropriate-legal-notices`). The real harness failed with `found 6` before Firefox ever ran. Fixed by bumping the assertion to 6 and adding the new mapping to `contextualHelpMappings`, exercised the same way as the other five. Could not be confirmed with a real `npm run test:browser` pass in the remediation sandbox either — Chromium's download is blocked by the sandbox's network allowlist (redirects to `storage.googleapis.com`), and Firefox downloads but cannot launch (missing system libraries, no root to install them) — verified instead by tracing `helpDomId()` and the compiled build output by hand. See the packet's §13 for the exact commands and error text.
  - **F2 (advisory):** `test/build.test.js`'s `stripEmbeddedLicenseText()` removed the whole embedded licence assignment from the `NO_MACHINE_PATHS` leak scan before it ran, so a machine-specific path introduced via `LICENSE` itself was never checked — byte-identity to `LICENSE` proves the build matches its input, not that the input is path-free. Fixed by scanning the licence text's real, unescaped bytes independently before the existing whole-document scan runs. Added a negative regression reproducing the reviewer's exact attack (a machine path appended to a disposable `LICENSE`) and asserting it is caught.
  - **F3 (advisory):** the recorded bundle-size baseline (1,040,074 bytes) was 17 bytes off the reproducible figure (1,040,057 bytes) — traced to the original measurement method (`git archive main | tar -x`, which drops `.git`, causing `build.js`'s git-derived build date to fall back to a differently-sized placeholder string). Corrected throughout this file, `ROADMAP.md`, and the PR packet to the actual reproducible delta, **+40,351 bytes**.
- Roadmap item remains `[~]` — the marker is the independent reviewer's to flip.

### Added — address verification, and three rejected features (2026-08-07)

Design-only. **No `src/`, `scripts/`, or `vendor/` file changed**, so no behaviour ships with this. Four proposals were evaluated; one was accepted, three were rejected, and the rejections produced one security fix.

**Accepted — clipboard round-trip address verification.** [ADR-0021](docs/05-development/adr/0021-clipboard-address-verification.md), specified in [address-verification.md](docs/01-spec/address-verification.md), roadmap items **P1.11–P1.13**, user guide [verify-an-address.md](docs/03-guides/verify-an-address.md).

- Closes a gap the existing three-way check does not cover. Verifying the address Coldbox *displays* proves nothing about what reached the destination field — a clipboard hijacker rewrites it in transit, every display stays correct, and the funds still leave. So the user pastes back what actually landed, and Coldbox compares character-exact over the whole string, reporting the index of the first divergent character.
- **Full-string comparison is the point, not a detail.** Address poisoning generates addresses matching a target's first and last four characters, so the `0x71C7…976F` display most wallets show is precisely the check that attack defeats.
- Split across realms by *question*, not by realm: the warm shell owns clipboard I/O (`navigator.clipboard.readText()` is effectively unavailable in an opaque-origin sandboxed frame under `file://`, and a check that degrades to retyping 42 characters is a check users skip), while the cold realm owns re-derivation from the seed. **Two claims, never merged into one green tick** — per-address `verificationState` in [data-model.md](docs/01-spec/data-model.md) means a warm-only verdict states its own limits inline, every time.
- Optional clipboard volatility canary: an unprompted re-read detecting a change with no user action. The only *affirmative* signal in the feature — everything else reports absence of evidence. Opt-in, off by default, and on permission denial the paste comparison still works while the UI states the canary is unavailable rather than silently presenting the weaker check's result.
- New cross-realm message types `address.verifyRequest`/`address.verifyResult` in [architecture.md](docs/01-spec/architecture.md), carrying **enum codes rather than prose** — a `reason` string would be exactly the free-form text field the public projection exists to exclude, and an unusually attractive one since it originates in the realm holding the secrets.

**Rejected — transaction construction, broadcast relay, and ERC-7730 clear signing.** [ADR-0019](docs/05-development/adr/0019-no-transaction-workbench.md). [SPEC §1.3](docs/01-spec/SPEC.md)'s non-goal stands **unamended**.

- The proposal was worked up in full — specs drafted, the non-goal amended, constraints designed — before being rejected, and the ADR records it at that depth so it is not re-proposed shallowly.
- **What decided it:** reading the two draft ADRs back to back showed they were justifying each other. Construction was argued for *because* it gave clear signing something to describe; clear signing was argued for *because* construction produced calldata. Neither carried its own weight. Mutual justification between two proposed features is a strong signal both are unnecessary, and it is easy to miss when they are evaluated in separate documents.
- Stripped of that, clear signing collapses hardest: **Ledger already implements ERC-7730 on-device and operates the descriptor registry**, while Coldbox fetches nothing at build or run time — so it could only use hand-imported descriptors with unverifiable provenance. A weaker duplicate of a check the same user already gets downstream, and shipping a weaker duplicate of a security check invites reliance on the weaker one.
- Also avoided: chain-specific encoding correctness (nonces, fee fields, EIP-155 binding, ABI encoding) with real money downstream, in a project that had deliberately carried none of it.

**Rejected as a feature, kept as a threat — injected wallet providers (EIP-6963 / EIP-1193).** [ADR-0020](docs/05-development/adr/0020-injected-providers-rejected-and-neutered.md).

- The finding that drove it: **`provider.request(...)` is not subject to page CSP.** The page messages the extension, which makes the request from its own context — nothing appears in `connect-src`, and the CSP canary does not fire. Integrating one would have made [threat-model.md](docs/02-security/threat-model.md) design commitment 4 false as written.
- **The feature was rejected rather than the commitment amended**, so commitment 4 stands unqualified. These commitments are valuable because they are checkable by reading the source; a carve-out is a cost paid by every future reader, not only by users of the feature. It would also have created a permanently `unverifiable` address category — registry entries the tool's strongest check structurally cannot reach.
- **The investigation's durable finding ships as roadmap item P0.21**, independent of the rejected feature: extensions are not reliably excluded from sandboxed `srcdoc` frames — a browser implementation detail, not a guarantee — so **today nothing stops an extension injecting a provider into the cold realm and nothing notices**. P0.21 extends P0.8's runtime neutering to `window.ethereum` and `eip6963:announceProvider`, treating presence as an *isolation* failure distinct from a *policy* failure, with different alarm text because the two call for different user responses. This guard matters more than the existing five, not less, since those sit behind a CSP that already blocks them.
- New design commitment 6 in [threat-model.md](docs/02-security/threat-model.md) restates the build/sign/broadcast prohibition in security terms, so a regression is judged there as well as in the spec.

**Docs:** [standards.md](docs/04-reference/standards.md) records EIP-6963/EIP-1193 as declined and ERC-7730 under "deliberately not implemented" with the revisit condition (on-device support stalling), review date advanced to 2026-08-07. [csp-policy.md](docs/02-security/csp-policy.md) gains a gotcha for the CSP exception. ROADMAP gains a "Considered and rejected" section so neither proposal returns silently. Five new glossary entries at three depths, and `npm run build` emits zero help-content warnings.

### Changed — relicensed MIT → AGPL-3.0-only (2026-08-07)

- **`LICENSE` replaced with the GNU Affero General Public License v3.0.** `package.json`'s `license` field is now the SPDX identifier `AGPL-3.0-only` — "only", not "or-later": an automatic upgrade clause would delegate a future licence-drafting decision to a third party, which this project declines to do anywhere else.
- **Why, in one line:** the project's central claim is that the single file in a user's hands can be rebuilt from source they can read, and MIT permits a modified single-file build to be distributed with no source obligation at all — which is the same modified-build scenario [architecture.md](docs/01-spec/architecture.md) already names as the top residual weakness. AGPLv3 §5(c) makes the source obligation binding on whoever ships a variant. Full reasoning, the rejected alternatives (keep MIT, Apache-2.0, plain GPLv3, dual-licence with a paid exception), and the relicensing-authority record are in **[ADR-0018](docs/05-development/adr/0018-agplv3-license.md)**.
- **This creates a new shipping obligation, recorded as roadmap item P0.20.** AGPLv3 §5(d) requires an interactive UI to display Appropriate Legal Notices, and Coldbox has one. The provenance panel becomes their home and the full licence text ships inside the bundle, viewable offline — a URL would be unreachable in exactly the airgapped case the app exists for. **No release may be tagged until P0.20 ships**, because tagging is a conveyance; the gate is now a checklist item in [release-checklist.md](docs/05-development/release-checklist.md) rather than a fact somebody has to remember from an ADR.
- **P0.20 is placed before P0.19 in the roadmap, out of numeric order, on purpose.** Its dependency is P0.16, and P0.19 is `👤 human-required` — an agent that reaches P0.19 must stop, so anything listed after it would never be picked up. The roadmap's ordering encodes dependency, not numbering; the item says so in place.
- **Vendored dependency compatibility was checked rather than assumed:** `@noble`/`@scure` are MIT and may be incorporated into an AGPL work; the vendored fonts are SIL OFL 1.1 and are aggregated, not relicensed; Playwright (Apache-2.0) is dev-only and contributes zero bytes to the build ([ADR-0007](docs/05-development/adr/0007-headless-browser-harness.md)), so it is never conveyed. Nothing in the tree needed a §7 additional-permission carve-out.
- **What this does not do, stated because AGPL invites the opposite assumption:** §13's remote-network-interaction clause binds only someone who modifies Coldbox *and* serves it over a network — narrow by design, since Coldbox runs from `file://`. The licence confers no runtime guarantee and is not a privacy control. The no-telemetry claim continues to rest on the CSP allowlist and the absence of analytics code, both checkable in the source, and would hold under any licence. No row was added to [threat-model.md](docs/02-security/threat-model.md), because no new threat is honestly defended by a licence.
- Prose updated where it stated the old licence: `README.md`, `CONTRIBUTING.md` (contributors keep their copyright; there is no CLA, and the practical consequence — a future relicense would need their consent — is now stated), [faq.md](docs/00-overview/faq.md) (including a new entry answering "does the AGPL protect my privacy?" with "no"), and [SPEC.md](docs/01-spec/SPEC.md) §20.3 and §23.1, which had recommended MIT and are now superseded by ADR-0018.
- **No `src/`, `scripts/`, or `vendor/` file changed**, so `build/coldbox.html` is byte-identical and its embedded build date does not move — the build date is derived from `git log -1 -- src scripts vendor` ([ADR-0015](docs/05-development/adr/0015-provenance-build-date-and-self-hash.md)). The in-app licence notice is P0.20's work, not this change's.

### Added — P0.18 CI (2026-08-07)

- New `.github/workflows/ci.yml`: a `build` job matrixed across `ubuntu-latest` and `windows-latest`, each leg running `npm run verify-vendor` (the one networked step, re-downloading every vendored release from the real npm registry), `npm run lint`, `npm run check-docs`, `npm test`, then building twice in the same checkout and diffing the two `coldbox.html.sha256` files (the "a nondeterministic change fails CI" acceptance criterion). A `compare-hashes` job downloads both OS legs' hash sidecars and fails if they differ (the "second-OS build comparison" criterion). A per-OS bundle size report is appended to the job's step summary. An always-run `browser-tests` job installs Playwright's browsers and runs `npm run test:browser` — GitHub-hosted runners have outbound network access, unlike the offline dev sandbox every prior packet in this project notes cannot download Playwright's binaries. A tag/release-gated `attestation` job uses `actions/attest-build-provenance` against `build/coldbox.html`.
- `scripts/check-docs.js` gained an eighth check — `TODO`/`TBD` in user-facing docs (`docs/00-overview/glossary.md`, `docs/03-guides/`), WARN severity, matching `doc-hygiene.md`'s "Automated checks" table entry that the other seven checks (all already implemented, predating this item's own work in this branch's history) had not yet covered. Three new negative-fixture tests added to `test/check-docs.test.js`, alongside the existing coverage for the other seven checks (broken links fail, missing review dates fail, stale review dates warn, unknown roadmap IDs fail, `dependencies.md`/`vendor-manifest.json` mismatches fail, missing help-content depth blocks fail).
- **[ADR-0017](docs/05-development/adr/0017-ci-workflow-structure.md):** records why the workflow is one file with four jobs rather than one job doing everything — cross-OS comparison needs its own job because a matrix leg can't see another leg's filesystem, `browser-tests` is unconditional rather than path-filtered (a per-job path filter needs either a workflow-level trigger that would also skip doc-hygiene checks, or a new third-party Action dependency this item doesn't justify adding yet), and why attestation is gated to tags/releases and its actual success is unverified pending repository secrets only the human can configure.
- **What is not verified from this authoring session:** GitHub Actions itself cannot be executed here. Every equivalent local command passes (see the PR packet for exact output: `npm test` 149/149, `npm run lint`, `npm run verify-vendor --offline`, `npm run check-docs`, two local builds producing an identical hash), and the workflow YAML parses cleanly with the expected trigger/job structure, but the real GitHub Actions run — including the cross-OS comparison, the browser-tests job on a real hosted runner, and the attestation step — has not been observed. `npm run verify-vendor` without `--offline` also could not be exercised in this session; the authoring sandbox has no outbound network access at all.
- **Independent review of PR #30 returned FAIL (1 blocking finding, 2 advisory, all remediated in this branch before re-review):**
  - **F1 (blocking):** every build-producing job used `actions/checkout`'s bare defaults, which on `pull_request` events check out GitHub's synthetic merge commit at `fetch-depth: 1` (shallow), not the real PR head SHA with full history. Since `build.js` derives its embedded build date from `git log -1 -- src scripts vendor`, the shallow synthetic checkout produced a build byte-different from a full-history local build of the same commit — the reviewer's real hosted-CI artifact hash (`e6b94f7...`) did not match two independent fresh full-history local clones' hash (`8891368...`), violating the roadmap's "CI hash matches a local build" acceptance criterion. Fixed by adding explicit `ref: ${{ github.event.pull_request.head.sha || github.sha }}` and `fetch-depth: 0` to every `actions/checkout` step in `ci.yml` (`build`, `browser-tests`, and `attestation` jobs).
  - **F2 (advisory):** `checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, `download-artifact@v4`, and `attest-build-provenance@v1` all emitted GitHub's Node-20-deprecation warning. Bumped to the current Node-24-runtime majors, confirmed via each action's GitHub Releases API at the time of this fix: `checkout@v7`, `setup-node@v6`, `upload-artifact@v7`, `download-artifact@v8`, `attest-build-provenance@v4`. No input/output names used by this workflow changed across those major bumps (confirmed against each action's README at the pinned tag); a reviewer should re-check these are still current at merge time, since action releases move.
  - **F3 (advisory):** the packet's local double-build hash was computed before `scripts/check-docs.js` existed in history, so it didn't reflect the tip it claimed to describe. Packet regenerated against the actual current tip — see its "Remediation of review FAIL" section for the reproduced hash and the disclosure that a sandbox-vs-CI hash mismatch is now an *expected*, disclosed consequence of the sandbox's Node version and lack of live CI, not evidence of nondeterminism.
- Roadmap item set to `[~]`, never `[x]` — the marker is the independent reviewer's to flip.

### Fixed — P0.18 CI, R4 remediation (2026-08-07)

- **Independent review of PR #30 returned FAIL a fourth time** (1 blocking verification gate, 1 advisory) at tip `27fc07d` — the strongest candidate yet: every explicit roadmap acceptance criterion was independently confirmed green (hosted Windows 149/149, both hosted builds identical twice over, `compare-hashes` success, real Ubuntu/Windows CI artifacts matching multiple fresh full-history local builds at `e05e68b8...`), and R3-F1 was confirmed closed.
  - **R4-F1 (blocking verification gate):** the exact-head hosted `Browser harness (Chromium + Firefox)` job was red — Chromium completed the full harness, but the Firefox process crashed mid-harness inside `verifyMissingRandomnessLockdown` (`Target crashed`) after completing most of the same suite. No R3→R4 change touched any browser/runtime/harness source (this round's prior changes were a `scripts/build.js` comment and docs only), and the reviewer's own exact-tip local browser harness run passed completely — consistent with hosted-runner/browser-process instability rather than a reproducible product regression, but per the reviewer's own instruction this is not assumed: no source change is made for this finding, and a fresh real hosted Actions run against the next commit is required to confirm Chromium and Firefox both complete. If the crash reproduces, that becomes new information requiring actual investigation rather than another rerun-and-hope.
  - **R4-F2 (advisory):** the packet had disclosed that its most recent hash (`438a28e8...`) was provisional, but never went back and recorded the exact final-tip value the reviewer had since established beyond ambiguity (`e05e68b8...`, matching real Ubuntu CI, real Windows CI, and multiple fresh local builds). Added packet §16 with a consolidated final-evidence table for tip `27fc07d`; this is a documentation-only addition and does not change the build hash it records, since `docs/` is outside `readBuildCommitDate()`'s source paths (`src`, `scripts`, `vendor`).
- Roadmap's P0.18 marker remains `[~]` — untouched, never the author's to flip.
- **What remains unverified:** a fresh real hosted Actions run against this round's actual committed tip, confirming both Chromium and Firefox complete the browser harness cleanly. This sandbox cannot trigger GitHub Actions.

### Fixed — P0.18 CI, R3 remediation (2026-08-07)

- **Independent review of PR #30 returned FAIL a third time** (zero blocking, two advisory) at tip `106ed85`, even though the actual roadmap acceptance criteria were independently confirmed green on a real hosted GitHub Actions run: both OS legs of `build`, `compare-hashes`, the browser harness, and the documentation/fail-closed checks all passed. Per this project's binary review protocol, the two advisory findings still block merge.
  - **R3-F1 (advisory):** the R2 remediation's comments in `scripts/build.js` and its packet text (§14) overclaimed `writeFileAtomic()`'s guarantee — stating it makes the build "correct under concurrent invocation, regardless of what triggers the concurrency," which reads as safety under multiple concurrent *writers*, not just a reader racing one writer. The reviewer reproduced a real Windows `EPERM: operation not permitted, rename` from six concurrent real build processes racing the same shared path. Chose not to build untested multi-writer retry/backoff logic (this project's real usage — `--test-concurrency=1` in `npm test`, single-process normal builds — never triggers concurrent writers, and `build.js` isn't structured to make that path unit-testable without a larger refactor beyond this item's scope); instead narrowed the code comment above `writeFileAtomic()` in `scripts/build.js` to state precisely what's guaranteed (atomic visibility to a reader under a single writer) and what isn't (multi-writer safety), naming the reviewer's reproduced Windows failure as the concrete limit. No executable behavior changed — `writeFileAtomic()` already failed closed (throws on a `renameSync` failure) both before and after this fix.
  - **R3-F2 (advisory):** the packet's cited build hash (`8891368...`) had gone stale relative to this round's tip. Regenerated from this round's actual working tree (`438a28e83f3467ddd4d54628cfb35c4412cb21c8a43703a8d4185cfe7ae8264e`, reproduced twice); flagged explicitly as provisional, since `readBuildCommitDate()` derives the embedded build date from `git log HEAD`, and this authoring sandbox cannot commit — so the true final hash will shift again the moment the human's commits for this round land, even though no application logic changed.
- Roadmap's P0.18 entry gets one additional sentence recording the R3 FAIL and this round's remediation, consistent with how R1/R2 were recorded; the `[~]` marker is untouched (never the author's to flip).
- **What remains unverified:** identical to R2 — a fresh hosted-Windows `npm test` run and full `compare-hashes` pass against this round's actual committed tip, plus (new this round) the true final build hash once that tip actually exists. This sandbox cannot trigger GitHub Actions or write git history.

### Fixed — P0.18 CI, R2 remediation (2026-08-07)

- **Independent review of PR #30 returned FAIL a second time** (1 blocking, 2 advisory), at tip `57ebcc4`, this time from a real hosted GitHub Actions run rather than static inspection: `build (ubuntu-latest)` passed and its hash matched an independent full-history local build, but `build (windows-latest)` failed inside `npm test` (148/149) on `test/help-content.test.js`'s single-JSON-statement assertion, skipping the `compare-hashes` job entirely.
  - **R2-F1 (blocking):** root-caused to a genuine test-suite race condition, not the line-ending theory first suspected. `test/build.test.js`, `test/help-content.test.js`, and `test/provenance.test.js` each spawn their own `node scripts/build.js` against the same shared real-tree path (`build/coldbox.html`), and Node's test runner ran test files concurrently by default (`"test": "node --test"`, no concurrency flag); `writeBuild()`'s plain `fs.writeFileSync` could leave a reader observing a file truncated mid-write by a concurrent build. Reproduced directly by hammering concurrent builds-and-reads against one checkout (malformed reads on ~2% of polls); the CRLF hypothesis was separately reproduced and ruled out — a CRLF-converted tree fails at `scripts/lint.js`'s own CRLF check with a different, clear error, never reaching HELP_CONTENT parsing. Fixed by (1) making `writeBuild()` write atomically — a process-unique temp file plus `fs.renameSync` into place, so a reader only ever sees a complete file — and (2) serializing test-file execution (`"test": "node --test --test-concurrency=1"`) so the underlying cross-file race can't occur at all. Re-reproduced the original stress harness against the fix: zero truncated/malformed reads across repeated runs on two different filesystems. Full local suite re-verified at 149/149, double-build hash unchanged (`8891368...`, matching both R1's figure and the reviewer's own independently-reproduced hash) — the fix changes write/read timing only, never build output.
  - **R2-F2 (advisory):** `actions/setup-node@v6` (pinned during R1) had gone stale relative to `v7.0.0`. Bumped all three `setup-node` steps to `@v7`; confirmed this workflow's only input (`node-version-file`) is unaffected by v7's one documented breaking change (a `NODE_AUTH_TOKEN` fallback removal this workflow never used). The other four pinned Actions (`checkout@v7`, `upload-artifact@v7`, `download-artifact@v8`, `attest-build-provenance@v4`) were rechecked and confirmed still current at major-version granularity.
  - **R2-F3 (advisory):** the live PR #30 body and `ROADMAP.md`'s P0.18 prose had drifted out of sync with the actual (two-round) review history, and `ROADMAP.md` still cited the pre-R1 `attest-build-provenance@v1` pin. `ROADMAP.md`'s P0.18 entry corrected and given an "Independent review history" narrative paragraph (matching P0.17's established convention); this packet's §14 documents the R2 remediation in full; this changelog entry added. The live PR body cannot be edited from this authoring sandbox (no `gh`/push access) — flagged as a required manual step (`gh pr edit 30 --body-file docs/05-development/packets/p0.18-ci.md`) for the human to run after pushing.
- **What remains unverified:** a fresh hosted-Windows `npm test` run and the resulting `compare-hashes` pass against this remediated tip. This sandbox cannot trigger GitHub Actions; the R2-F1 fix is verified by local reproduction of the original race and confirmation the same reproduction no longer produces corruption against the fix, not by an observed hosted-Windows pass. A fresh real CI run is required before the next independent review can confirm this closed.

### Added — P0.17 help framework (2026-08-07, remediated after independent review)

- New build-time compiler, `scripts/help-content.js`, parsing a `::: plain` / `::: working` / `::: technical` markdown block convention (already documented in `docs/03-guides/README.md`, previously unimplemented) and compiling `docs/00-overview/glossary.md` and `docs/03-guides/*.md` into a three-depth content model embedded in the build as `HELP_CONTENT`. A guide or glossary term with no depth blocks — or an incomplete group — produces a non-fatal build warning naming the gap, per this item's acceptance criterion; an unterminated or duplicated `:::` block fails the build closed with a non-zero exit.
- New in-app **Learn** page: a depth switcher (remembered via `localStorage`, an explicitly permitted UI preference, never a secret path), an offline substring search built from the compiled content at first use (no network call), the full glossary and guide text rendered at the chosen depth, and inline tap-to-define glossary terms inside guide bodies.
- **Contextual `?` help** added to five existing panels (sealed-realm status, airgap banner, capability self-check, vault status, provenance panel), each linking to a specific compiled glossary entry — all five resolve to real content.
- **`docs/00-overview/glossary.md` fully backfilled to three depths — all 51 entries** (corrected count; an earlier draft of this entry and the packet said 46, which was stale — see F4 below), including the four "Things people get wrong" corrections (initially left single-depth as a judgment call, then wrapped too since it cost little and closes the gap entirely) and five new entries backing previously-undocumented P0.1–P0.16 in-app copy: capability self-check, KDF profiles (Fast/Standard/Paranoid), save integrity, keyfile unlock, and the provenance panel itself.
- **All nine `docs/03-guides/` files gained three-depth content** on their key explanatory passages (first-wallet, verify-a-hardware-wallet, backup-slip39, backup-codex32, going-airgapped, inheritance-planning, multisig-quorum, portfolio-setup, recover-a-seed). `npm run build` now reports **zero** help-content warnings — the P0.1–P0.16 backfill obligation recorded on this roadmap item is met.
- New `test/help-content.test.js` (21 tests): the parser/renderer in isolation (shared-vs-group parsing, missing/partial-depth warnings, unterminated/duplicate-block failures, markdown-to-HTML escaping and rendering), end-to-end checks that the real `docs/` tree compiles and reaches the built artifact byte-for-byte, a regression guard that the real tree builds with zero warnings, and the missing-depth-warning mechanism itself re-tested against a synthetic fixture (since the real tree no longer has a naturally-occurring gap to test against).
- `scripts/run-browser-harness.js` gained `verifyHelpFramework` (depth switching with real content-change assertions, persistence across reload, offline search with a network-request tripwire, contextual-help navigation, a genuine fail-closed fallback case against a synthetic nonexistent topic, inline glossary tap-to-define).
- **Bundle impact:** the compiled help content adds ≈ 344 KB to `build/coldbox.html` (total ≈ 1.01 MB) — over the 180 KB estimate in `SPEC.md`'s bundle table, now corrected there to the measured figure. Most of the weight is the existing `jsonScriptLiteral()` helper's `<`/`>`/`&` → `\uXXXX` escaping (shared with `PROVENANCE_LIBRARIES` and the cold-realm document, not new to this item); an earlier draft also duplicated a full plain-text copy of every depth into a separate search-index field, and deriving search text from the already-embedded HTML at runtime instead (ADR-0016) cut roughly a third off that draft's weight. The remaining overage is flagged as a real, unresolved finding for a follow-up item — see the packet's "what to scrutinise."
- **Independent review of PR #29 returned FAIL (4 findings, all remediated in this branch before merge):**
  - **F1 (blocking):** `verifyDevOnlyDependency()`'s dependency-free build fixture didn't copy `docs/`, so `npm run test:browser` exited before ever reaching `verifyHelpFramework()` in Chromium or Firefox — the browser harness never actually ran the P0.17 acceptance checks. Fixed by copying `docs/` into the fixture, matching the same fix pattern already used for `.git` (P0.16 F4). The independent reviewer separately confirmed, with real network access, that Chromium and Firefox both install and launch cleanly in this repository — the failure was this fixture gap, not an environment limitation.
  - **F2 (advisory):** the "no machine paths" build-output regression test excluded any `letter:\` followed by `u`+4 hex digits, which would miss a real path like `C:\u1234\repo\file.js`. Fixed by naming the exact three escape sequences `jsonScriptLiteral()` emits (`\u003c`, `\u003e`, `\u0026`) instead, with an adversarial test added.
  - **F3 (advisory):** the packet's verification evidence (Node version, build hash, test count) did not reproduce. See the packet for corrected, reproduced figures.
  - **F4 (advisory):** this changelog entry, ROADMAP.md, and the packet described the glossary as 46 entries; the real compiled corpus has 51. Corrected throughout.
- **A second independent review round returned FAIL again (3 findings, 2 blocking):** the F1 fix above turned out to be incomplete — three other temporary build-root fixtures in `scripts/run-browser-harness.js` still omitted `docs/`, so `npm run test:browser` still failed before reaching `verifyHelpFramework()`. Fixed by introducing one shared `copyBuildInputsInto()` helper used by all four fixtures, so the build-input list can't drift out of sync at some call sites again. More significantly, the reviewer's own real-Chromium probe caught a genuine shipped defect: 3 of the 5 contextual `?` buttons (cold-realm status, airgap banner, vault status) were nested inside `<h2>` titles whose entire `.textContent` gets rewritten on every state change, silently deleting the button — only 2 of 5 survived real app initialization. Fixed by giving each affected title a dedicated child `<span>` for its dynamic text, leaving the button as an untouched sibling; `verifyHelpFramework()` now asserts all 5 buttons survive a fully-settled app and exercises all 5 mappings. The packet was regenerated a second time against the tip including both fixes, since the version reviewed at this round still carried stale pre-fix evidence (that round's own F3).
- **`npm run test:browser` passed cleanly end to end for the first time in this branch's history**, run directly by the maintainer with real network access and the repository-pinned Node `24.16.0` (the authoring sandbox throughout this item's development could never download Playwright's binaries). The first attempt ran through 38 checks — including everything the second review round's fixture fix touched — before finding one more real bug: `verifyHelpFramework()`'s locator for the "Seed phrase" glossary entry matched 9 elements instead of 1, since that phrase is legitimately cross-referenced in 8 other entries' compiled prose. Not a product defect; fixed by targeting the compiler's own deterministic element id instead of a substring match. The very next run passed cleanly in both Chromium and Firefox.

### Added — P0.16 provenance panel and self-hash verifier (2026-08-06)

- **Reference → Provenance** now lists every embedded third-party library (name, version, upstream SHA-256, upstream release URL), generated at build time directly from `vendor/vendor-manifest.json` — the same manifest `npm run verify-vendor` checks against real upstream bytes — so the panel and `dependencies.md` cannot drift apart.
- **Build date** shown is the source commit's date (`git log -1 --format=%cI`), not a wall-clock build timestamp; a literal build-time timestamp would make two builds of the same source produce different bytes, which breaks the reproducible-build guarantee. Falls back to a labeled "unknown" (not a build failure) when git metadata is unavailable.
- **CSP allowlist for both realms**, read live from the warm shell's own `<meta http-equiv="Content-Security-Policy">` tag and from the embedded cold-realm `srcdoc` document, rather than a second transcribed copy that could go stale.
- **Self-hash drop zone.** The build embeds a `coldbox-expected-hash` meta tag whose value is the SHA-256 of the assembled document with that same tag blanked to 64 zero characters — the only way to reference a document's own hash inside itself without infinite regress. The drop zone reproduces the identical blank-then-hash procedure over a dropped file's bytes (via `crypto.subtle`, entirely in the warm shell — this is public file hashing, not a secret operation) and compares the result. The panel states plainly, before any check runs, that this is a circular self-consistency check that a malicious build could always pass, and points to `docs/02-security/verification.md` for the command-line hash, GPG signature, and reproduce-the-build checks that an attacker cannot forge.
- New `test/provenance.test.js` (11 tests): manifest/panel parity, build-date determinism and its git-unavailable fallback, the blank-then-hash mechanism including a single-tampered-byte detection case, and static markup checks. `scripts/run-browser-harness.js` gained `verifyProvenancePanel`, covering the rendered library list, CSP text, and the drop zone's match/mismatch/error states via Playwright's `setInputFiles` file-upload emulation, per this item's 🌐 marker.
- **Known limitation, disclosed in the PR packet:** `npm run test:browser` could not be executed in the authoring session because outbound Playwright browser-binary downloads were blocked by that sandbox's network allowlist. The browser-harness function is written and reviewed but its actual pass/fail in Chromium and Firefox is unverified pending a session with working network access; the roadmap item is left at `[~]` accordingly.

### Fixed — P0.16 provenance panel review remediation (2026-08-06)

Independent review ([p0.16-provenance-panel.review.md](docs/05-development/packets/p0.16-provenance-panel.review.md)) returned FAIL with 4 blocking and 2 advisory findings. All addressed on this branch:

- **F1 (blocking).** The compiled expected hash now renders visibly in the Reference → Provenance → "Verify this file" panel (`#provenance-expected-hash`), labeled explicitly as distinct from `coldbox.html.sha256`. Previously it existed only in a hidden `<meta>` tag.
- **F2 (blocking).** The self-hash drop-zone comparison previously blanked the dropped file's own expected-hash field before hashing, so a byte flip confined to that field was invisible and reported `Match`. The comparison now also requires the dropped file's own declared expected-hash value to equal the running copy's, so corruption inside the hash field fails closed too.
- **F3 (blocking).** `verifyProvenancePanel` in `scripts/run-browser-harness.js` gained assertions for F1's visible value and F2's hash-field-tamper case. Chromium/Firefox execution was blocked in every sandboxed authoring session — `cdn.playwright.dev` is outside the reachable network allowlist there. Run for real, twice, on a machine with working network access, and found two genuine pre-existing fixture bugs, neither a regression in shipped bytes:
  1. `verifyDevOnlyDependency` copies `scripts`/`src`/`vendor` into a `.git`-free temp directory to prove the build needs no `devDependencies` (in particular, no Playwright at runtime), then asserts the result is byte-identical to the real build. That assertion predates P0.16 and implicitly assumed the build needs nothing outside `node_modules`; once the build date started reading `git log`, a `.git`-free copy legitimately produces a different (fallback "unknown") date than a real checkout, which still has its `.git`. Fixed by copying `.git` into the fixture too. Added an equivalent Playwright-free regression test, `test/build.test.js`'s "a build with node_modules absent but .git present matches the real build byte-for-byte", so this property is now covered by plain `npm test`.
  2. `stripWarmCsp` (used by `verifyCspStrippedLockdown`) scans the whole built document for `<meta http-equiv="Content-Security-Policy" ...>` text and asserts exactly one match. P0.16's `extractCspFromMarkup()` in `src/main.js` has its own regex literal containing that same tag-shaped text, which ends up embedded verbatim in the built document's inline `<script>` block — so the document-wide scan found two "meta tags": the one real tag and the JS source code describing a tag. Fixed by scoping the search to before the first `<script>` tag (the document head), where the one real tag lives and no inline script body can appear.

  Both fixes are test-only; confirmed with real `git`/`node` in the authoring session, without Playwright, that neither changes `coldbox.html`'s hash beyond the expected build-date advance from `scripts/` being one of the paths that legitimately feeds the embedded build date (see ADR-0015's amendment) — i.e. each fix commit moves the date forward by design, same as any other commit touching `scripts/`, `src/`, or `vendor/`, and produces byte-identical output across two locales/timezones at each step.

  **F3 is now closed.** A third real-network `npm run test:browser` run, at author tip `5693e40`, printed `Browser harness passed in Chromium and Firefox.` — every assertion passed in both engines, including `verifyProvenancePanel`'s F1 (visible expected hash) and F2 (hash-field-tamper reported as mismatch) checks, which had never executed against a real browser before this run. The independent reviewer separately reran the full harness at the actual final reviewed tip with the same result (see the packet's R3-F1 correction). This closes the roadmap item's 🌐 acceptance criterion. Roadmap stays `[~]` — flipping it to `[x]` remains the independent reviewer's call.
- **F4 (blocking).** The embedded build date was derived from literal `HEAD`, so committing a governance-only change (a PR packet) moved `HEAD` and therefore changed the product's own bytes and hash — the packet could never truthfully describe the tip it shipped on. Fixed: the build date now comes from the most recent commit touching `src/`, `scripts/`, or `vendor/`, so a docs-only commit no longer changes it. Documented as a dated amendment to [ADR-0015](docs/05-development/adr/0015-provenance-build-date-and-self-hash.md). Verified: the same tip builds byte-identical `coldbox.html` from two different checkout paths under different locale/timezone.
- **F5 (advisory, required).** `docs/02-security/verification.md` incorrectly claimed the GPG signing-key fingerprint is shown in the app's provenance panel — corrected to state plainly it isn't, and why. `docs/05-development/build.md`'s "What the build does" sequence now describes the provenance build-date/expected-hash injection steps. The three-depth `docs/03-guides/` help-content gap for this feature, previously only asserted in the PR packet, is now formally recorded in [ROADMAP.md](docs/05-development/ROADMAP.md): P0.17's help-content compiler doesn't exist yet, so no feature shipped before it has three-depth guide content, and P0.17 now carries an explicit backfill obligation.
- **F6 (advisory, required).** The PR packet is regenerated with exact-tip evidence: accurate test-file list, the real full `npm test` count, `dependencies.md`'s actual bundle budget quote ("Target ≤ 3 MB, hard cap 4.5 MB"), and the expected-hash/UI claim corrected to match what F1 actually ships.

Roadmap item stays `[~]` — the marker is the independent reviewer's to flip, not the author's.

### Fixed — P0.16 fresh re-review R2-F1 (2026-08-07)

A fresh independent re-review of the F1–F6 remediation confirmed every functional and browser-level acceptance criterion (including a full `npm run test:browser` PASS in Chromium and Firefox) but returned FAIL on one remaining finding:

- **R2-F1 (blocking).** The F4 governance-only-commit test in `test/provenance.test.js` created a synthetic commit with `GIT_COMMITTER_DATE: '2020-01-01T00:00:00Z'`, then asserted the build embedded the hardcoded string `'2020-01-01T00:00:00+00:00'`. Both strings name the same UTC instant, but different `git` versions render `git log --format=%cI`'s strict-ISO UTC offset differently for it (`Z` vs `+00:00`) depending on how the commit date was supplied — so the test's pass/fail depended on the reviewing machine's git version, not on the actual property under test (that a governance-only commit doesn't move the embedded build date). Confirmed this was a test-fixture defect, not a product regression: independent product-level F4 checks (two-checkout-path/timezone/locale build reproducibility, product-source-tip hash matching the exact reviewed tip) all passed in the same review. Fixed by capturing git's own answer for the synthetic product commit immediately after creating it (`git log -1 --format=%cI HEAD`), then comparing the build's embedded date against that captured value instead of a hand-typed string — representation-independent by construction, since both sides go through the identical `git log --format=%cI` command. This is a `test/`-only change; it does not touch `src/`, `scripts/`, or `vendor/`, so it does not advance the embedded build date or change `coldbox.html`'s bytes at all (confirmed: hash unchanged at `d20cc46a97adcddf9a99dbad7101ea98df0355a42b1e0959530fe9cf77b6ba73`).

Roadmap item stays `[~]`.

### Fixed — P0.16 fresh re-review R3-F1 (2026-08-07)

A second fresh independent re-review confirmed R2-F1 fixed and every mandatory gate and functional/browser acceptance criterion independently passing (pinned Node 24.16.0; `npm test` 111/111; full Chromium/Firefox `npm run test:browser` PASS; online vendor verification; deliberate-corruption negative tests; cross-path/timezone/locale reproducibility), but returned FAIL on one governance/evidence finding against the PR packet itself, not the implementation:

- **R3-F1 (blocking).** Three stale-evidence defects in `docs/05-development/packets/p0.16-provenance-panel.md`, all corrected in place: (1) the packet claimed **110/110** was "the true, complete `npm test` count," but the mandatory bare `npm test` command auto-discovers a 111th file, `test/browser/harness.js` — a helper module with no `test(...)` calls of its own that Node's default test-file glob still picks up and reports as one passing pseudo-test; the packet's four hand-listed `node --test` invocations never included it. Corrected to 111/111 with a fifth invocation explicitly accounting for it. (2) The packet described a real-browser pass as occurring "on the exact final tip (`5693e40`)" — `5693e40` was an earlier author tip, since superseded by the R2-F1 fix and this packet's own regeneration commits; it was never re-described as non-final. Corrected to name `5693e40` as the author tip where that specific run occurred, while noting the independent reviewer separately reran the full harness at the actual final tip with the same result. (3) The live PR #28 body was one packet revision behind the committed packet. Synced after this commit. No product, runtime, or test-assertion code changed — this is a documentation-accuracy correction only, and `coldbox.html`'s hash is unchanged (still `d20cc46a97adcddf9a99dbad7101ea98df0355a42b1e0959530fe9cf77b6ba73`).

Roadmap item stays `[~]`.

### Added — P0.15 keyfile unlock (2026-08-06)

- **Wrapped-DEK method 2 (passphrase + keyfile).** `src/cold/vault.js` can now wrap the vault DEK under `Argon2id(passphrase || SHA-512(keyfile), salt, params)`, per [vault-format.md](docs/01-spec/vault-format.md)'s existing method-2 specification. A vault created with a keyfile carries a method-2 record in place of the method-1 record — the keyfile is required, not an optional alternative, so losing it or altering a single byte makes the vault permanently unopenable. This is stated in bold in the cold-realm UI before the keyfile toggle can be used, and the toggle is **off by default**.
- **Fails closed on a one-byte-altered keyfile**, with an error indistinguishable from a wrong passphrase (`Vault authentication failed.` in both cases — no detail about which credential or byte was wrong).
- **Passphrase-only vaults are unaffected.** No wire-format or behavior change for any vault created without a keyfile; `unwrapDek()` only ever consults a method-2 record when the vault actually carries one, and only if a keyfile was supplied at open time.
- New cold-realm UI: a keyfile toggle (unchecked by default), an unmissable red warning that appears the moment it's checked, and a file input whose bytes are read via `FileReader` and never leave the sealed cold-realm document — no message type carries keyfile bytes, and they are never logged.
- Implementation limits (64 MiB keyfile size ceiling, 255-byte hint cap, empty-keyfile rejection) recorded in [ADR-0014](docs/05-development/adr/0014-keyfile-unlock-implementation-limits.md).

### Added — P0.14 save integrity (2026-08-06)

- **Verify-after-save.** The File System Access save path re-reads the file it just wrote and confirms the bytes are byte-identical before clearing the unsaved-changes flag; a truncated or corrupted read-back leaves the vault marked dirty and says so instead of silently reporting success.
- **Historical P0.14 dirty-flag behavior (later amended by P0.19/ADR-0026).** A vault created fresh inside the cold realm started with unsaved changes; opening an existing file did not. At that stage only a verified save cleared the flag, while blob download and the then-current manual base64/QR handoff could not be read back. Current save-state and QR-transfer semantics are defined by ADR-0026.
- **Generational filenames and rollback detection.** Saves are named `coldbox-vault-0047.cbx`; the highest generation this browser has seen is tracked in `localStorage` (non-secret, degrades silently) and compared against a loaded file's filename. Opening a file that parses to an older generation shows a warning with both dates and counters. This is advisory, not cryptographic — a renamed or foreign file simply cannot be checked, and the check never guesses.
- New `src/save-integrity.js`, assembled into the warm shell the same way as `airgap.js`/`capabilities.js`/`protocol.js`. Pure logic, no DOM dependency, no vault-format change, no new `postMessage` type — see [ADR-0013](docs/05-development/adr/0013-save-integrity-in-warm-shell.md) for why it lives here.

### Changed — review closeout ownership (2026-08-06)

- **Root cause fixed for governance-only pull requests.** [review-protocol.md](docs/05-development/review-protocol.md) told the reviewer to *write* a `.review.md` report but never to commit it to the branch under review, and no document assigned the `[~]` → `[x]` roadmap transition to anyone. Both artifacts therefore had no home once `--delete-branch` ran, producing rescue branches for review reports and a follow-up PR whose entire diff was one character.
- The reviewer now owns a **closeout commit** — report plus roadmap marker — pushed to the item branch before the merge. Authors set `[~]` and never `[x]`, because marking your own item complete asserts an independent verification that has not happened.
- **Pull requests that only move governance are prohibited.** A missed marker or report folds into the next PR to touch the repository. Browser-based sessions that cannot push to the branch under review hand the closeout to the next session via the handoff block rather than opening a PR.
- Aligned across [AGENTS.md](AGENTS.md), [ROADMAP.md](docs/05-development/ROADMAP.md), [review-protocol.md](docs/05-development/review-protocol.md), [handoff.md](docs/05-development/handoff.md), and [packets/README.md](docs/05-development/packets/README.md).

### Added — Recovery Assistant specification (2026-08-06)

- **SPEC §11.1b** replaces the single-paragraph Recovery Assistant sketch with a full specification: two-stage screen/verify pipeline, measured primitive costs, tiered stop conditions, search-space ordering, a declared typo grammar, phased escalation, and the estimate-and-refuse contract.
- Records the measured finding that **elliptic curve arithmetic, not the KDF, dominates recovery cost** — 79% against 16% at default settings — which inverts the assumption the previous text implied.
- Requires both operation counts (combinations enumerated, candidates verified) to be shown, and the time estimate to name which crypto path is live, since the pure-JS and WebCrypto paths differ by 7.8×.
- **[ADR-0011](docs/05-development/adr/0011-wasm-secp256k1-for-recovery.md):** WASM secp256k1 for the search path only, with `@noble` re-deriving every hit before display. `'wasm-unsafe-eval'` was already mandatory in the cold realm for Argon2id, so this adds no CSP concession.
- **[ADR-0012](docs/05-development/adr/0012-recovery-checkpoint.md):** checkpoints are a separate encrypted file rather than vault records — the cold realm's opaque origin cannot persist anything, and continuous vault rewriting would fight verify-after-save, generational filenames, and rollback detection.
- **P4.3 split into P4.3a–P4.3e** in the roadmap; the original single line materially understated the work. P4.3d is explicitly gated on unresolved size research and may be dropped.
- [recover-a-seed.md](docs/03-guides/recover-a-seed.md) corrected: the previous timing estimates conflated 12- and 24-word phrases and were optimistic by roughly an order of magnitude for 12-word, because a 12-word checksum filters 1 in 16 where a 24-word filters 1 in 256. Adds the xpub stop condition and the address generation limit.

### Added — P0.13 (2026-08-03)

- Cold-realm vault session controls for create, unlock, lock, five-minute idle auto-lock, `Esc Esc` panic concealment, and fail-closed runtime health handling; any cold airgap/capability/crypto failure or save-time health rejection closes and zeroizes the active session before locked status is exposed. The warm shell never receives the unlock phrase or decrypted secret compartment.
- **Historical P0.13 behavior (superseded for vault QR by P0.19/ADR-0026):** File System Access save/load when available with normative `.cbx` filenames, portable blob download, and a first-class manual base64/share flow that at the time included numbered multi-part QR frames, local QR rendering, and ordered reassembly. Current vault QR is live device-to-device transfer only and is not a save/export artifact.
- Cold session saves now re-encrypt public data with a fresh nonce every time, re-encrypt the secret compartment offline, and preserve the encrypted secret compartment opaquely online without deriving its key.
- Explicit mode signaling: online unlock uses a public-only opener that never derives the secret subkey; full compartment unlock is available only after the warm shell reports offline.
- Chromium/Firefox browser coverage for blob and manual round-trips, panic hide, and the existing cold boundary. Direct iOS local execution from Files is a blocked portability target under ADR-0010.

### Changed — portability decision (2026-08-04)

- **ADR-0010 accepted Choice 3:** Coldbox no longer claims that an arbitrary local `coldbox.html` file executes in Safari from iOS Files. Quick Look, third-party viewers, localhost, renamed files, and wrapped formats are not equivalent execution evidence.
- The authoritative roadmap/ADR re-baseline landed on `main`: direct iOS Files-to-Safari execution is a separately recorded P0.19 portability target, not a P0.13 acceptance gate. PR #21 subsequently received an independent PASS and merged; current item-level status is canonical in [ROADMAP.md](docs/05-development/ROADMAP.md). The security model and single-file/no-server constraints are unchanged.

### Added — P0.12 (2026-08-03)

- Cold-only KDF profile benchmark for Fast, Standard, and Paranoid, with sequential positive timings, shared vault-health gating, and an explicit iOS allocation warning for the 256 MiB profile; literal placement before creation is verified with the dependent P0.13 workflow.
- Real Argon2id round-trips for all three stored header profiles, likely-iOS Paranoid skip coverage, and browser verification that the benchmark offer remains inside the sealed realm.

### Added — browser runner workflow (2026-08-05)
- Browser-only development/review runners now require explicit repository/branch/HEAD state, persist per-step exit codes and preflight untracked paths, preserve recovery tags without overwriting them, and emit scanner-gated evidence bundles.
- Secret scanning uses the vendored English BIP-39 wordlist, handles CRLF and large text inputs, records skipped binary paths, and emits only a content-free diagnostic manifest plus scan report when a finding is detected.

### Added — P0.10 (2026-08-03)

- Vendored `argon2-browser` 1.18.0 with its embedded Argon2id WASM distribution, plus a deterministic build-time bundle of the selected `@noble/ciphers` and `@noble/hashes` modules.
- Pure-JS `@noble` AES-GCM as the default path, WebCrypto AES-GCM gated by an affirmative NIST known-answer test, and RFC 9106 Argon2id boot verification.
- Explicit KDF reporting in the cold realm and warm-shell capability summary; a PBKDF2-HMAC-SHA512 fallback is labelled with its active profile and iteration count whenever Argon2id cannot load.
- Node vector tests, protocol coverage for the cryptographic capability report, deterministic-build coverage, and Chromium/Firefox browser verification of the sealed realm.

### Added — P0.11 (2026-08-03)

- Vault format v1 serializer/parser in the cold realm: authenticated header, multi-record wrapped-DEK structure, AES-GCM public/secret compartments, HKDF domain separation, and 64 KiB random padding.
- Real P0.10-backed round-trip coverage, all-65-header-byte tamper coverage, indistinguishable authentication failures, zero-secret compartments, and a warm/cold vault API boundary check.
- Independent-review remediation makes the vault API fail closed on cold-health/CSP failure, consumes the shared airgap network snapshot, rejects unknown KDF profile names, uses the crypto layer as the single KDF-profile source, documents a distinct 64 MiB size refusal, and removes the premature P0.13 session/save primitive from P0.11.

### Added — review audit trail (2026-08-04)

- **Three independent review reports recovered and committed.** The reviews of P0.6, P0.7 and P0.8 were written, stashed, and never landed. All three are FAIL, together carrying 27 findings of which 8 are blocking, against the cold realm bootstrap, the message handshake, and the CSP canary. Remediation had happened without them visible in the tree.
- **Every one of the 27 findings dispositioned** against current `main`, with evidence, in a "Disposition of findings" section appended to each report. Reviewer text and verdicts are unmodified. Result: **25 Resolved, 2 open — both environmental** (upstream `verify-vendor` needs registry access; verification ran on Node 22 against a pinned 24.16.0).
- **One live defect surfaced.** `docs/05-development/adr/README.md` links to ADR-0008, which `c6d6cc2` deleted from `main` when the literal CSP throw contract replaced it. The file survives only on the unmerged `p0.13-lock-save-load` branch, so the two branches disagree about whether ADR-0008 exists. Recorded, not patched — withdrawing or reinstating an ADR is a structural decision.
- **P0.3a and P0.4 reviews** each contain two stacked reviews, an original FAIL and a later PASS re-review. A navigation banner now says so at the top; neither verdict was altered.
- **Independent review coverage is now tracked** in [packets/README.md](docs/05-development/packets/README.md). It records that **P0.5 and P0.9 have never been independently reviewed** — the `BATCH-2026-08-03.md` claim of a P0.5 independent PASS has no artifact behind it, and P0.9's reviewer-reserved path briefly held a self-review instead.

### Added — design system (2026-08-04)

- **Comic visual language** across the warm shell: heavy outlines, flat saturated fills, hard offset shadows, halftone dot field, comic display lettering. Recorded in [ADR-0009](docs/05-development/adr/0009-comic-visual-language.md); the full contract is [docs/01-spec/design-system.md](docs/01-spec/design-system.md), which is now authoritative for anything a user can see and supersedes the visual direction in SPEC §15.
- **The calm rule.** Security surfaces — realm status, airgap banner, capability self-check, the entire sealed realm, and everything Phase 1+ adds to the secret-handling routes — take the comic shell and none of the comic behaviour: no tilt, no animation, no stickers. The line is *reporting live boundary state* versus *explaining the design*. The display face is barred from seed words, addresses, keys, hashes, paths, and amounts, which stay monospace.
- **Yellow app bar** across every route: knocked-out cyan wordmark, rotated pink status badge reading `Pre-release · Not audited`, and quick links. The mockup's `LOCK ALL` is deliberately absent — there is no lock to engage until P0.13, and a prominent red control that does nothing is worse than no control. The theme toggle moved here from the content bar; its `id` is unchanged, so `main.js` binds as before.
- **3D card stage** on the dashboard: three comic-paper panels in perspective with pointer-tilt and scroll parallax, driven by two CSS custom properties from `startStageMotion()` in `src/main.js`. It renders no live data and exposes no controls. Below `62rem` the cards stack with no 3D; `prefers-reduced-motion` suppresses the listeners entirely.
- **Vendored display typefaces.** `@fontsource/bangers@5.3.0` and `@fontsource/comic-neue@5.3.0` (both SIL OFL 1.1) committed as pinned npm tarballs with SHA-256 and integrity in `vendor-manifest.json`, added to `requiredPackages`, and inlined as base64 `data:` URIs by the new `scripts/font-bundle.js` at the `__COLDBOX_FONT_FACES__` build token. Nothing is fetched at build or run time; a corrupted or unmanifested font tarball fails the build like any other vendored artifact. Cost ≈ 83 KB.
- Dashboard copy now states plainly that Coldbox is a toolkit that holds no keys and signs nothing, and the design system carries a say/never-say table so the "not a wallet" boundary is reviewable rather than a matter of taste.
- `scripts/crypto-bundle.js` and `scripts/font-bundle.js` are both covered by the lint tooling-syntax check; `crypto-bundle.js` had been missing from that list.
- Verified against the built artifact: two clean builds byte-identical across path, locale, and timezone; 49/49 node tests including the contrast floor; `npm run test:browser` green in Chromium and Firefox over `file://`. Real-hardware rendering — mobile in particular — remains untested; see [the packet](docs/05-development/packets/ui-comic-design-system.md) §7.

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
- Entropy Health Meter on every secret-creation screen — measures min-entropy rather than Shannon, shows claimed vs measured bits side by side, reserves below-target generation blocking for the future Seed Forge boundary, and refuses to give false-precision numbers for human-chosen passphrases
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
