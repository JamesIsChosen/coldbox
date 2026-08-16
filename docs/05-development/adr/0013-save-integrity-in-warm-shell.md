# ADR-0013: Save-integrity bookkeeping lives in the warm shell, not the vault format

**Status:** Accepted · amended by [ADR-0025](0025-vault-identity-library-and-save-ux.md) and [ADR-0026](0026-canonical-vault-save-and-live-transfer.md)
**Date:** 2026-08-05

---

## Context

P0.14 needs three things: verify-after-save (re-read a written file and confirm it matches before clearing the unsaved-changes flag), generational filenames, and rollback detection via a save counter. [vault-format.md](../../01-spec/vault-format.md) and [threat-model.md](../../02-security/threat-model.md) already described the target behaviour before this item started; what they did not settle was *where the save counter and its timestamp live*.

Two constraints shape the answer.

**The vault format v1 header has no spare field for this.** `docs/01-spec/vault-format.md`'s compatibility rule is explicit: "Any change to this format requires a test asserting that a vault written by the previous version still opens," and a byte-format version bump is exactly the kind of thing this codebase treats as touching the realm boundary tier — P0.6/P0.7/P0.11 territory, which [review-protocol.md](../review-protocol.md) reserves for human eyes before merge even after an independent PASS.

**Rollback detection is already documented as advisory, not a security guarantee.** The Threat properties table in vault-format.md lists it as "Rollback detected — Save counter, advisory," distinct from the rows above it that are AEAD-backed. A heuristic implementation is not a compromise here; it is what was already promised.

## Decision

**The save counter, its timestamp, and the rollback comparison are warm-shell-only state.** They live in:

- The filename read back via the `File` object's `.name` when a vault is loaded from a file. Before P0.19 this used the browser-global `coldbox-vault-0047.cbx` convention. ADR-0025 briefly replaced new saves with per-vault name + Vault-ID suffix + visible generation filenames; ADR-0026 and ADR-0046 supersede that intermediate UX with one canonical `coldbox--<id8>.cbx` while retaining historical forms for legacy parsing/advisory rollback checks.
- `localStorage`, under a single key, holding the highest counter this browser profile has seen plus its timestamp — non-secret, and already covered by the project's existing "`localStorage` non-essential… degrades silently" rule (SPEC.md).

None of this crosses the realm boundary, changes the vault byte format, or adds a `postMessage` type. `src/save-integrity.js` is pure warm-shell logic with no DOM dependency, assembled into `src/main.js` exactly like `airgap.js`/`capabilities.js`/`protocol.js` already are.

Verify-after-save is a warm-shell byte comparison: the exact bytes the cold realm produced (already-authenticated ciphertext, safe to hold in the warm shell — the same trust level as the existing `vault.bytes`/`vault.open` payloads) are compared against a fresh read-back from disk. Because the two are compared for exact identity, "decrypts and matches" and "is byte-identical to output that is already known to decrypt" are the same guarantee; no second cold-realm round trip, and no new message type, is needed to establish it.

## Rationale

### It matches the documented threat model exactly

Threat-model.md already calls rollback detection advisory. Building it as a filename-plus-localStorage heuristic doesn't under-deliver on a promise — it *is* the promise, stated precisely: an unparseable filename (renamed, foreign, or from a fresh browser profile) degrades silently rather than guessing, and a browser that has never seen a save has nothing to compare against. A cryptographically-authenticated counter (e.g. inside the public compartment) would imply a stronger guarantee than the documented one, and would need its own doc update, ADR, and probably its own review-protocol tier.

### It keeps the two realms doing the two different jobs architecture.md assigns them

The cold realm's job is encryption and secret handling; the warm shell's job is portability, storage, and UX (architecture.md, ADR-0001). A save counter is bookkeeping about *files on the user's device*, which the cold realm cannot even see — it has no persistent storage of its own (opaque origin, no `allow-same-origin`; the same constraint ADR-0012 documents for recovery checkpoints). Routing generation tracking through the cold realm would mean inventing a reason for it to care about local storage it structurally cannot have.

### It avoids the review-protocol human-merge tier for a UX feature

review-protocol.md holds three items to a stricter merge bar because they are the realm boundary, the message schema, or the vault format: P0.6, P0.7, P0.11. A vault-format or protocol-schema change for P0.14 would put a save-counter feature in that tier alongside genuine cryptographic boundary work, for a property that is explicitly advisory. That mismatch between the feature's actual risk and its review weight is worth avoiding on its own.

## Consequences

### Positive

- No vault-format version bump. Every vault written by P0.11–P0.13 keeps opening unmodified.
- No new `postMessage` type, so no new entry in the message-schema whitelist to review for secret-carrying potential.
- Fully unit-testable in Node without a browser — relevant because P0.14 carries no 🌐 acceptance criteria and must be provable without Playwright.

### Negative

- Rollback detection is defeated by a simple rename. This is disclosed in-app (the banner explains the check is advisory) and in docs, not hidden.
- The advisory save history remains per-browser-profile, not per-person or per-device. Under the ADR-0025 amendment each vault has its own high-water record within that browser profile. Opening the same vault from a second browser (or after clearing `localStorage`) resets what "highest seen" means there. This matches how other UI-only `localStorage` state behaves.
- `File.lastModified` (used only as a human-readable date alongside the counter, never as the rollback trigger itself) reflects filesystem mtime, which some sync tools and manual copies do not preserve faithfully. It is disclosed as context, not treated as authoritative.

### Risks

- A future feature (e.g. a Phase 3 multi-device conflict view) might need an *authenticated* save provenance rather than an advisory one. That would require revisiting this decision — see below.

## Alternatives considered

**Embed the counter and timestamp in the public compartment's JSON.** Authenticated by the existing AEAD tag, survives a rename, and was available even for the then-current manual base64/QR path (no filename involved for that historical path either way). Rejected for now: it still requires the cold realm to originate the value (the public compartment is written cold-side), which means either a new field the warm shell has to request via a schema-reviewed round trip, or the cold realm inventing save-counter logic that belongs to warm-shell bookkeeping. It is the natural next step if the "negative" consequences above turn out to matter in practice — see below.

**A vault-format v2 header field.** Rejected as disproportionate: a byte-format change, for a property explicitly documented as advisory, that would also require a v1-still-opens regression test and puts the item in the realm-boundary review tier for no corresponding increase in the guarantee delivered.

**No rollback detection at all, only verify-after-save.** Defensible read of "P0.14 is really about not losing data on write failure." Rejected because the roadmap item's acceptance criteria explicitly include "opening an older vault warns with both dates and counters," and threat-model.md already promises the property.

## What would change our mind

If a later item needs cross-device or cross-browser-profile save provenance (the multi-device conflict case above), or needs the rollback check to survive a rename, the counter and timestamp would need to move into the public compartment — an authenticated, cold-realm-originated value instead of a warm-shell heuristic. That is a schema change to the public compartment's message payload (though still not a vault-format byte-layout change) and would need its own review at the appropriate tier.

**P0.19 intermediate amendment (2026-08-08, superseded in part by ADR-0026 and ADR-0046):** multi-vault library UX made one browser-global counter ambiguous. ADR-0025 kept this ADR's core decision — save-integrity bookkeeping remains warm-shell/advisory and does not enter the byte header — and keyed the high-water record by stable Vault ID (or the documented legacy header-salt namespace). The current name-free filename is `coldbox--<id8>.cbx`.

## References

- [vault-format.md § Save and load](../../01-spec/vault-format.md)
- [threat-model.md § Vault rollback](../../02-security/threat-model.md)
- [ADR-0001](0001-two-realm-architecture.md), [ADR-0012](0012-recovery-checkpoint.md) — related realm-boundary and persistence reasoning
- [review-protocol.md](../review-protocol.md) — the human-merge tier this decision avoids entering


## P0.19 canonical-file amendment (ADR-0026)

The original P0.14 decision and tests used visible generational filenames because that was the roadmap requirement at the time. P0.19 human testing found that presenting one logical vault as many generation files creates dangerous selection ambiguity. ADR-0026/0046 therefore keep this ADR's security boundary — bookkeeping remains warm-side, advisory, and outside the authenticated byte layout — while superseding the **current filename UX**. New files are `coldbox--<id8>.cbx`; historical generation filenames remain parseable for compatibility/numeric rollback warnings. Current canonical files use the per-Vault-ID stored timestamp only as a best-effort older-copy advisory. Encrypted Base64 and live QR transfer do not count as saves.
