# ADR-0045: One released secret per session, and every cold tool is a lens on it

**Status:** Accepted · amends [ADR-0023](0023-entropy-lab-seed-forge-boundary.md) and [ADR-0028](0028-cold-only-bip39-seed-forge.md)
**Date:** 2026-08-14

## Context

`src/cold/index.html` is one document with every sealed-realm tool stacked vertically: Entropy Lab, Entropy Health, Seed Forge, Seed XOR, codex32, Shamir39 and raw SSS, SeedQR Studio, SLIP-39, and BackupRecord verification. Six of those sections open with their own masked phrase or secret field:

| Field | Line (at 94cf73b) |
|---|---|
| `#cold-seed-forge-mnemonic-input` | 306 |
| `#cold-seed-xor-source` | 360 |
| `#cold-codex32-secret-hex` | 388 |
| `#cold-shamir39-source` | 468 |
| `#cold-raw-sss-source` | 505 |
| `#cold-slip39-seed-source` | 580 |

Three consequences follow, and the third is the one that matters.

**The same phrase gets retyped up to six times in one session.** Every retype is a fresh opportunity to mistype a word, and — far worse — a fresh opportunity to paste a seed into the wrong field, including a field outside this document.

**Nothing is grouped.** Tools sit in roadmap-phase order rather than in the order any task needs them, so finding the right one means scrolling a 753-line document.

**Each phrase field is an independent implementation of the same security-critical behaviour**: masked by default, cleared on teardown, never logged, never persisted. Six implementations of one contract is six chances to get it wrong, and the correctness of each is verified separately or not at all.

The existing one-shot hand-off between Entropy Lab and Seed Forge ([ADR-0023](0023-entropy-lab-seed-forge-boundary.md) as amended, implemented per [ADR-0028](0028-cold-only-bip39-seed-forge.md)) already establishes the right shape for two tools. It does not generalise to nine, because it is a direct call between one producer and one consumer rather than a thing a session holds.

## Decision

A secret is entered or generated **once**, and then **released**.

**One entry point per realm.** In the sealed realm that is Seed Forge, which both generates a new phrase and validates an existing one. In the warm realm it is the vault unlock phrase, which is a different secret serving a different purpose and never becomes a released secret. No other tool in either realm has a phrase, mnemonic, or raw-secret input field. This is the negative property the whole decision rests on, and it is stated as a test rather than a convention — see Consequences.

**Release publishes to a session-scoped registry inside the cold document.** A released secret is an in-memory record holding the secret material, its derived public master fingerprint, and a user-visible label. It lives in the sealed frame only. It is never serialised, never written to a vault compartment, never logged, and never included in any message to the warm shell — the existing prohibition on secret material crossing the boundary is unchanged and unqualified by this decision.

**Every other cold tool becomes a lens on the focused secret.** Split lab, SeedQR Studio, derivation, addresses, child seeds, verification and recovery read the focused secret from the registry and render from it. They gain no input of their own. Eleven entry points collapse to one.

**Several secrets may be released; exactly one is focused.** Switching focus re-points every panel. This is what makes a 2-of-3 multisig workable — three fingerprints have to be comparable side by side, not one at a time.

**Everything recomputes from the focused secret at render time.** There is no re-derive button and no cached derived panel that can survive a focus change. A panel showing values derived from a secret that is no longer focused is a defect, not a stale view.

**Lifetime is the session, and it ends hard.** The registry is cleared, and its buffers zeroized on the same path the existing teardown uses, by every one of: vault lock, the idle timeout, the panic action, and realm teardown. There is no persistence across a lock and no "keep it loaded for convenience" affordance. The empty registry is a normal destination with a designed empty state, not an error condition.

**A released secret is not a backup.** Release is a session convenience. Nothing about it makes a secret recoverable, and the interface must not imply otherwise — in particular a share set is not a backup until it has been reconstructed, and that wording stays.

## Rationale

The retyping is the vulnerability. Every existing phrase field is individually correct; the risk lives in the *count* of them, which is a property no single field's implementation can fix. Reducing eleven entry points to one reduces the attack surface, the misuse surface and the review surface at the same time, and it does so without weakening any existing control.

Consolidating the masked-input contract into one place also makes it auditable. Today, "is every secret field masked by default and cleared on teardown?" is answered by reading six implementations. After this, it is answered by reading one, plus a test asserting the other five do not exist.

Keeping the registry cold-local and session-scoped means the decision adds no new persistence, no new file-format surface, and no new message type. The boundary is untouched: this is a reorganisation of state that already lives inside the sealed frame.

Multiple released secrets are included deliberately rather than deferred. A single-secret model looks simpler and is, but it makes multisig verification — comparing fingerprints across a quorum — into a sequence of load-and-forget steps, which is exactly the workflow in which people mis-record a fingerprint.

## Consequences

- The registry and its switcher are the first thing built. Nothing else in the restructure can be tested without it.
- Deleting the six fields above re-points `seed-forge.js`, `seed-xor.js`, `codex32.js`, `shamir.js` and `slip39.js` at the registry, and every test asserting on those element IDs changes with them. This is the largest mechanical cost of the decision and is expected to dominate the diff.
- **A test asserts that exactly two secret-entry points exist in `src/`** — Seed Forge's and the vault unlock phrase. Finding a third means the model was not implemented, and the test says so in those terms. This is the negative acceptance criterion for every screen in the restructure.
- New behavioural coverage is required, none of which the existing suite provides: that releasing updates every dependent view without re-entry; that lock, idle timeout and panic each clear the whole registry; that no send-to path writes secret material to the clipboard; and that concealment reveal does not survive a lock.
- The idle timeout becomes user-visible in a way it was not before, because it now discards work the user can see. The empty state has to explain what happened and what to do, or it reads as a crash.
- Focus is a security-relevant control. Acting on the wrong secret is a realistic failure mode, so the switcher is always visible wherever a lens is rendered, and on mobile it never collapses.
- [ADR-0023](0023-entropy-lab-seed-forge-boundary.md) and [ADR-0028](0028-cold-only-bip39-seed-forge.md) keep their contracts. Entropy Lab still owns the raw-byte deliverable and Seed Forge still owns BIP-39 conversion and the master fingerprint; release is a third step appended after Seed Forge's existing output, not a replacement for either hand-off.

## Alternatives considered

**Leave the fields and add a "paste into all" convenience.** Rejected. It keeps every field, adds a mechanism that touches all of them at once, and makes the wrong-field paste easier rather than impossible.

**One released secret, not several.** Rejected for the multisig reason above. Reconsider only if the switcher proves to be a source of act-on-the-wrong-secret errors in real use, in which case the fix is a stronger focus indicator rather than a smaller registry.

**Persist released secrets in the vault's secret compartment so they survive a lock.** Rejected firmly. It converts a session convenience into a stored-secret feature, expands the vault format, and breaks the property that locking is a complete teardown. Locking must mean locking.

**Let each tool keep an optional field as an override.** Rejected. An optional field is a present field: it can be pasted into, it must be independently verified, and it defeats the test that makes the model checkable. The override case — operating on a secret you have not released — is served by releasing it.

**Keep the secret in a Web Worker or a closure rather than a module-scoped registry.** Not rejected, but out of scope here: this ADR fixes *that* there is one session-scoped holder with a hard teardown, not its implementation shape. Whatever holds it must satisfy the zeroization path the existing teardown already uses.
