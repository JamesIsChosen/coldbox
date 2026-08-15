# ADR-0045: One released secret per session, and every cold tool is a lens on it

**Status:** Accepted · amends [ADR-0023](0023-entropy-lab-seed-forge-boundary.md) and [ADR-0028](0028-cold-only-bip39-seed-forge.md)
**Date:** 2026-08-14

## Context

`src/cold/index.html` is one document with every sealed-realm tool stacked vertically: Entropy Lab, Entropy Health, Seed Forge, Seed XOR, codex32, Shamir39 and raw SSS, SeedQR Studio, SLIP-39, and BackupRecord verification. Seed Forge has the one seed-entry field; five other tools have duplicate seed/source loaders that must not remain:

| Field | Status |
|---|---|
| `#cold-seed-forge-mnemonic-input` | Seed Forge's single seed-entry surface |
| `#cold-seed-xor-source` | Removed by UI.4 |
| `#cold-codex32-secret-hex` | Removed by UI.4 |
| `#cold-shamir39-source` | Removed by UI.4 |
| `#cold-raw-sss-source` | Removed by UI.4 |
| `#cold-slip39-seed-source` | Removed by UI.4 |

The QR Studio and SLIP-39 source selectors were also non-secret source-loading controls. UI.4 replaces both with focused-source status text so those tools cannot select an unreleased generated or validated result. No recovery, share-combine, passphrase, vault-authentication, note, or entropy input is removed.

Three consequences follow, and the third is the one that matters.

**The same phrase used to be retyped up to six times in one session.** Every retype was a fresh opportunity to mistype a word, and — far worse — a fresh opportunity to paste a seed into the wrong field, including a field outside this document.

**Nothing is grouped.** Tools sit in roadmap-phase order rather than in the order any task needs them, so finding the right one means scrolling a 753-line document.

**Each former phrase field was an independent implementation of the same security-critical behaviour**: masked by default, cleared on teardown, never logged, never persisted. The registry now holds the released secret once, and the remaining secret inputs are declared by their purpose rather than treated as seed loaders.

The existing one-shot hand-off between Entropy Lab and Seed Forge ([ADR-0023](0023-entropy-lab-seed-forge-boundary.md) as amended, implemented per [ADR-0028](0028-cold-only-bip39-seed-forge.md)) already establishes the right shape for two tools. It does not generalise to nine, because it is a direct call between one producer and one consumer rather than a thing a session holds.

## Decision

A secret is entered or generated **once**, and then **released**.

**One entry point for seed material, and it is in the sealed realm.** That is Seed Forge, which both generates a new phrase and validates an existing one. No other tool anywhere accepts a mnemonic or raw master-seed material.

**The warm shell has no secret input of any kind, and gains none here.** An earlier draft of this ADR placed the vault unlock phrase "in the warm realm". That was wrong and contradicted the architecture: the vault passphrase is entered inside the sealed realm (`#cold-vault-passphrase`), `vault.open` carries ciphertext only, and [architecture.md](../../01-spec/architecture.md) states that the warm shell never receives a seed, private key, secret compartment, or vault passphrase. The correction matters beyond tidiness — an ADR that misplaces a passphrase is a document a future implementer could build the wrong boundary from.

The vault passphrase is a *different kind of secret* from a released one: it authenticates a session, it is never a subject of derivation, and it never enters the registry. The distinction is the basis of the invariant below.

**Release publishes to a session-scoped registry inside the cold document.** A released secret is an in-memory record holding the secret material, its derived public master fingerprint, and a user-visible label. It lives in the sealed frame only. It is never serialised, never written to a vault compartment, never logged, and never included in any message to the warm shell — the existing prohibition on secret material crossing the boundary is unchanged and unqualified by this decision.

**Every other cold tool becomes a lens on the focused secret.** Split lab, SeedQR Studio, derivation, addresses, child seeds, verification and share generation read the focused secret from the registry and render from it. Recovery and combine workflows retain their own share-entry inputs because those fields serve reconstruction rather than seed loading.

Precisely: **they lose their seed/source-loading input, and only that.** The five duplicate loaders listed above are removed, leaving Seed Forge's one seed-entry surface. They keep every input that does a different job — share and recovery material being reconstructed, the separate BIP-39 passphrase, vault authentication and re-authentication, secret notes, and physical/manual entropy collection. A recovery tool that could not accept share words would not be a recovery tool. An earlier draft of this ADR said "eleven entry points collapse to one" and that tools "gain no input of their own"; both were over-broad, the number was unsupported, and neither described what this decision actually removes.

**Several secrets may be released; exactly one is focused.** Switching focus re-points every panel. This is what makes a 2-of-3 multisig workable — three fingerprints have to be comparable side by side, not one at a time.

**Everything recomputes from the focused secret at render time.** There is no re-derive button and no cached derived panel that can survive a focus change. A panel showing values derived from a secret that is no longer focused is a defect, not a stale view.

**Warm-origin address checks do not consume released-secret state.** The warm Address Check may still compare a pasted candidate with the public registry, but once any secret has been released the cold handler refuses to derive an address or write `verifiedAgainstXpub`/`cold-verified` state from that session-only registry. Before release, it preserves the existing re-derivation from the current Seed Forge result; no duplicate source field remains. This keeps a released-secret derivative out of warm/public persistence, while the dedicated cold verification panel remains a cold-local lens on the focused secret.

**Lifetime is the session, and it ends hard.** The registry is cleared, and its buffers zeroized on the same path the existing teardown uses, by every one of: vault lock, the idle timeout, the panic action, and realm teardown. There is no persistence across a lock and no "keep it loaded for convenience" affordance. The empty registry is a normal destination with a designed empty state, not an error condition.

**A released secret is not a backup.** Release is a session convenience. Nothing about it makes a secret recoverable, and the interface must not imply otherwise — in particular a share set is not a backup until it has been reconstructed, and that wording stays.

## Rationale

The retyping is the vulnerability. Every existing seed field is individually correct; the risk lives in the *count* of them, which is a property no single field's implementation can fix. Reducing six seed-loading entry points to one reduces the attack surface, the misuse surface and the review surface at the same time, and it does so without weakening any existing control or removing any input that serves another purpose.

Consolidating the masked-input contract into one place also makes it auditable. Today, "is every secret field masked by default and cleared on teardown?" is answered by reading six implementations. After this, it is answered by reading one, plus a test asserting the other five do not exist.

Keeping the registry cold-local and session-scoped means the decision adds no new persistence, no new file-format surface, and no new message type. The boundary is untouched: this is a reorganisation of state that already lives inside the sealed frame.

Multiple released secrets are included deliberately rather than deferred. A single-secret model looks simpler and is, but it makes multisig verification — comparing fingerprints across a quorum — into a sequence of load-and-forget steps, which is exactly the workflow in which people mis-record a fingerprint.

## Consequences

- The registry and its switcher are the first thing built. Nothing else in the restructure can be tested without it.
- Removing the five duplicate loaders above re-points the Seed XOR, codex32, Shamir39/raw SSS, SeedQR, and SLIP-39 lenses at the registry, and every test asserting on those element IDs changes with them. The six-group hub is navigation chrome around those existing panels; it adds no new secret boundary or message path.
- **The invariant is a declared registry, not a count.** An earlier draft said "exactly two secret-entry points exist in `src/`". That is simply false and would have failed on the day it was written: the sealed realm legitimately holds around two dozen inputs that accept secret material — vault passphrase and confirmation, keyfile, recovery-share re-authentication, recovery-share entry, concealment re-authentication, secret notes, the separate BIP-39 passphrase fields, and every share-combine field that recovery requires. None of those are seed-loading, and none of them should disappear.

  What the model actually requires is that **exactly one input anywhere accepts seed material** — a BIP-39 mnemonic or raw master-seed bytes — *for the purpose of loading a secret to operate on.* That is expressed as a registry in the test suite: every secret-accepting input in `src/` is declared with a category, and the test asserts three things. That no undeclared secret-accepting input exists, so adding one is a deliberate act with a review trail. That exactly one entry carries the category `seed-entry`. And that no entry changes category without the registry changing with it.

  | Category | Meaning | Count |
  |---|---|---|
  | `seed-entry` | Accepts a mnemonic for Seed Forge's single seed-entry surface | **exactly 1 registry entry** |
  | `seed-validation` | Editable per-word validation mirrors inside Seed Forge; not an additional source loader | unbounded |
  | `vault-auth` | Authenticates a vault session — passphrase and confirmation | unbounded |
  | `keyfile` | Selects the optional vault keyfile | unbounded |
  | `recovery-auth` | Re-authenticates the vault before recovery-share configuration | unbounded |
  | `recovery-share` | Share or recovery material being reconstructed | unbounded |
  | `concealment-auth` | Re-authenticates concealment reveal | unbounded |
  | `secret-note` | User-authored secret content and search text | unbounded |
  | `bip39-passphrase` | The BIP-39 passphrase, a separate secret from the seed | unbounded |
  | `entropy-input` | Physical/manual entropy that feeds a new Seed Forge generation | unbounded |
  | `share-passphrase` | The separate SLIP-39 share passphrase | unbounded |
  | `share-combine` | A codex32 share or correction candidate | unbounded |

  A count was the wrong shape because it conflates "how many places can I type a secret" with "how many places can I load *the* secret". Only the second is what this decision constrains.
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
