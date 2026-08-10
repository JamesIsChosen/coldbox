# ADR-0031: Public registry mutations use a typed warm-to-cold replacement

**Status:** Accepted
**Date:** 2026-08-10

## Context

P1.6 needs durable create, update, and soft-hide operations for public Wallet, Account, and Address records. The warm shell must render and edit those records, but the vault session owns the authenticated encrypted bytes. Sending arbitrary record objects across the private channel would weaken the existing projection and make it easy for a future field to carry secret-shaped text.

## Decision

The warm shell owns a public-only registry store. It mutates a cloned public projection locally, then sends the complete next projection through `publicData.replace`. The protocol validates each registry collection against a closed field schema, rejects secret keys and secret-shaped text, and bounds all accepted strings and collections. The cold session accepts the replacement only while unlocked, requires the authenticated Vault ID to remain unchanged, replaces the padded public plaintext, and replies with the sanitized projection through `publicData.updated`.

Registry IDs are UUIDs generated with `crypto.getRandomValues` in the warm shell. Deletes are represented by `hidden: true`; hard deletion is not part of this item. Account and Address creation/update require an existing Wallet or Account relationship respectively.

## Rationale

The complete-projection acknowledgment makes the warm copy and the cold session's copy converge before the UI calls the change written. Keeping the replacement inside the typed protocol means unknown future text fields fail closed instead of becoming accidental secret carriers. Reusing the vault session's existing padded public plaintext preserves the existing save/authentication path without introducing a second persistence format.

## Consequences

### Positive

- Labels and registry metadata are useful in the warm shell while the secret realm remains opaque.
- A rejected write can restore the warm snapshot without claiming it was durable.
- Vault ID lineage remains authenticated and immutable through public updates.

### Negative

- Each registry mutation sends and re-encrypts the complete public projection, rather than applying a small in-vault patch.
- The warm UI must wait for a typed acknowledgment before treating a mutation as accepted.

### Risks

- The bounded secret-shape detector cannot prove that arbitrary human text is harmless; unknown text fields are therefore rejected rather than guessed safe.
- The collection schema must be extended deliberately when later roadmap items add verification or device fields.

## Alternatives considered

### Send one CRUD command per operation

Rejected for P1.6. It would require a second command schema for every collection and would make it easier for one command to bypass the common public projection validator.

### Keep registry mutations only in warm memory

Rejected. A registry that disappears on lock or reload would contradict the vault data model and the roadmap's durable-record goal.

### Pass the public object through without collection rules

Rejected. Bounded, schema-specific validation is the only honest way to accept useful labels while rejecting arbitrary text that could contain a secret.

## What would change our mind

A later vault format with an independently authenticated, versioned public-record transaction log could replace complete projection replacement if it preserves the same no-secret boundary and deterministic recovery behavior.

## References

- [Architecture message schema](../../01-spec/architecture.md#message-schema)
- [Public data model](../../01-spec/data-model.md)
- [Threat model](../../02-security/threat-model.md)
