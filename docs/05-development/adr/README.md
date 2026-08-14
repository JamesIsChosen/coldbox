# Architecture Decision Records

Short documents recording *why* a structural decision was made — what we chose, what else we considered, and what would change our mind.

They exist because six months from now, "why is there an iframe in here?" should be answerable in a paragraph rather than an archaeology project. Code shows what was decided. ADRs show why, and what the alternatives cost.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-two-realm-architecture.md) | Two-realm architecture | Accepted · amended by 0035 |
| [0002](0002-separate-vault-file.md) | Vault data lives in a separate file | Accepted |
| [0003](0003-argon2id-parameters.md) | Argon2id at 64 MiB as the default KDF | Accepted |
| [0004](0004-median-not-mean-prices.md) | Aggregate prices by median, not mean | Accepted |
| [0005](0005-no-duress-compartment.md) | No duress or decoy compartment | Accepted (rejected feature) |
| [0006](0006-companion-not-replacement.md) | A companion to hardware wallets, not a replacement | Accepted |
| [0007](0007-headless-browser-harness.md) | Headless browser harness as a dev dependency | Accepted |
| [0008](0008-csp-blocked-network-signals.md) | CSP-blocked network signals are not a throw contract | Accepted |
| [0009](0009-comic-visual-language.md) | Comic visual language, with security surfaces exempted | Accepted |
| [0010](0010-ios-local-html-execution.md) | iOS local-HTML execution is a portability gate, not a preview-equivalence claim | Accepted |
| [0011](0011-wasm-secp256k1-for-recovery.md) | WASM secp256k1 for the recovery search, with `@noble` as the authority | Accepted |
| [0012](0012-recovery-checkpoint.md) | Recovery checkpoints are a separate encrypted file, not vault records | Accepted |
| [0013](0013-save-integrity-in-warm-shell.md) | Save-integrity bookkeeping lives in the warm shell, not the vault format | Accepted · amended by 0025/0026 |
| [0014](0014-keyfile-unlock-implementation-limits.md) | Keyfile unlock (method 2) implementation limits and record shape | Accepted |
| [0015](0015-provenance-build-date-and-self-hash.md) | Provenance panel build date is the source commit date, and the self-hash is a blank-then-hash self-consistency check | Accepted |
| [0016](0016-help-content-compiler-and-search.md) | Help content is compiled from block-scoped markdown, and search text is derived at runtime, not precomputed | Accepted |
| [0017](0017-ci-workflow-structure.md) | CI workflow structure — two-OS matrix, a separate always-run browser job, and gated release attestation | Accepted |
| [0018](0018-agplv3-license.md) | AGPLv3 rather than MIT, and what §5(d) obliges the app to display | Accepted |
| [0019](0019-no-transaction-workbench.md) | Transaction construction, broadcast relay, and clear signing | Accepted (rejected feature) |
| [0020](0020-injected-providers-rejected-and-neutered.md) | Injected wallet providers — rejected as a feature, neutered as a threat | Accepted |
| [0021](0021-clipboard-address-verification.md) | Clipboard address verification — warm clipboard, cold authority, two separate claims | Accepted |
| [0022](0022-entropy-lab-mixing.md) | Entropy Lab accumulation and mixing — integer accounting, XOR-then-hash | Accepted |
| [0023](0023-entropy-lab-seed-forge-boundary.md) | Entropy Lab's deliverable is raw entropy bytes, not a hand-off to Seed Forge | Accepted |
| [0024](0024-warm-reachability-monitor.md) | Warm-shell active reachability monitoring does not change the cold airgap boundary | Accepted |
| [0025](0025-vault-identity-library-and-save-ux.md) | Vault identity is portable and random; names/library/save UX stay in the warm shell | Accepted · amended by 0026 |
| [0026](0026-canonical-vault-save-and-live-transfer.md) | One canonical vault file; animated QR is live device-to-device transfer only | Accepted |
| [0027](0027-entropy-health-statistical-diagnostics.md) | Entropy Health uses advisory finite-sample statistical diagnostics | Accepted |
| [0028](0028-cold-only-bip39-seed-forge.md) | Cold-only BIP-39 Seed Forge and master fingerprint | Accepted |
| [0029](0029-cold-only-bitcoin-derivation-engine.md) | Cold-only Bitcoin BIP-32 derivation engine and script encodings | Accepted |
| [0030](0030-cold-only-evm-and-arbitrary-path-derivation.md) | Cold-only EVM and generic arbitrary-path derivation | Accepted |
| [0031](0031-public-registry-mutation-boundary.md) | Public registry mutations use a typed warm-to-cold replacement | Accepted |
| [0032](0032-notes-tags-and-concealment.md) | Public notes stay public-only; secret notes stay cold-local; concealment is session-scoped | Accepted |
| [0033](0033-device-registry.md) | Device records are public companion metadata | Accepted |
| [0034](0034-cold-local-verification-workflows.md) | Verification workflows stay cold-local and manual | Accepted |
| [0035](0035-cold-printing-allow-modals.md) | Cold-only printing adds `allow-modals` without weakening the opaque origin | Accepted |
| [0036](0036-slip39-cold-vendoring.md) | Cold-only SLIP-39 uses phrase-entropy shares and a pinned source adaptation | Accepted |
| [0037](0037-codex32-cold-hand-verifiable.md) | Codex32 is an inline BIP-93 adaptation owned by the cold realm | Accepted |
| [0038](0038-shamir39-and-raw-sss-cold-only.md) | Shamir39 and raw SSS are cold-only inline adaptations | Accepted |
| [0039](0039-seed-xor-cold-only.md) | Seed XOR operates on BIP-39 entropy and stays cold-only | Accepted |
| [0040](0040-vault-recovery-share-record.md) | Vault recovery-share method-3 record shape | Accepted |
| [0041](0041-backup-record-verification-boundary.md) | BackupRecord verification metadata is public, but completion authority stays cold-owned | Accepted |
| [0042](0042-conservative-backup-health.md) | Conservative Backup Health from public metadata | Accepted |
| [0043](0043-scoped-mobile-validation-deferral.md) | Scoped mobile-validation deferral for item review | Accepted |

## When to write one

Any decision that is structural, hard to reverse, or likely to be questioned later:

- Changing the realm boundary or message schema
- Changing the vault format
- Changing a cryptographic primitive or its parameters
- Adding or removing a `connect-src` host
- Adopting or rejecting a standard
- **Rejecting** a commonly-requested feature — often the most valuable kind, since otherwise it gets re-proposed indefinitely

Not for routine implementation choices. If reasonable people wouldn't argue about it, it doesn't need an ADR.

## Template

```markdown
# ADR-NNNN: Title

**Status:** Proposed | Accepted | Superseded by ADR-XXXX
**Date:** YYYY-MM-DD

## Context
What problem forced a decision. Include the constraints that made it hard.

## Decision
What we chose. Be specific.

## Rationale
Why. This is the part future readers need.

## Consequences
### Positive
### Negative
### Risks

## Alternatives considered
Each with why it was rejected. Rejected options are as informative as the chosen one.

## What would change our mind
Conditions under which this should be revisited. Prevents ADRs from becoming dogma.

## References
```

## Conventions

- Numbered sequentially, never renumbered.
- Never deleted. A decision that no longer applies is marked superseded, with a link to what replaced it — the history is the value.
- Written when the decision is made, not reconstructed later.
- Short. If it exceeds two pages, it's probably a design document instead.
