# ADR-0032: Notes stay in their declared compartment and concealment is session-scoped

**Status:** Accepted  
**Date:** 2026-08-10

## Context

P1.7 adds human-authored notes, shared tags, and the four concealment levels
described by SPEC §10. Public notes are useful to the warm shell, but secret
notes must remain in the cold realm. Hidden public records are still public
metadata; they are a shoulder-surfing control, not a second encrypted
compartment or a duress feature.

## Decision

The public protocol accepts only `visibility: public` Note records. Their title,
bounded Markdown body, linked UUIDs, canonical tags, and hidden flag pass through
the same collection-specific public projection validator as registry records.
Secret notes are rejected at that boundary and have no warm-shell rendering
path.

The warm shell stores privacy-blur preference locally and applies it only to
display metadata. Panic hide clears reveal markers, hides the app, and locks the
cold session. Hidden records remain excluded from lists and search by default.
The user can request a session-scoped reveal, but the vault phrase is entered
again inside the cold realm; the warm shell receives only a boolean
`concealment.revealed` result. Locking or panic hide clears that session flag.

## Rationale

Compartment assignment is a data-security property, not a label. Treating a
secret note as merely a hidden public note would make the online public-only
mode decrypt or display data that SPEC explicitly says must remain sealed.
Re-authentication in the cold realm preserves the boundary while still making
mistakenly hidden records recoverable.

## Consequences

### Positive

- Public notes and tags are searchable offline without exposing secret text.
- Secret notes are searchable by title, body, and tag only inside the cold-local editor.
- Hidden records are recoverable without hard deletion and cannot appear by
  accident in the normal registry view.
- Privacy blur survives reload, while panic and lock clear session reveals.

### Negative

- Secret-note authoring is available only in the cold-local note editor, not in
  the warm Registry form.
- Revealing hidden public records requires a second phrase entry in the cold
  frame, even though the records themselves are not secret.

### Risks

- A public note can still be sensitive by human choice; the UI warns that public
  notes remain in the public compartment, and secret-shaped content is rejected
  by the protocol rather than guessed safe.
- Privacy blur is shoulder-surfing friction, not protection against a hostile
  operating system, browser extension, or screen capture.

## Alternatives considered

### Treat all notes as public

Rejected. SPEC explicitly distinguishes public and secret note visibility.

### Send the re-entered phrase to the warm shell for verification

Rejected. That would violate the two-realm contract for a convenience feature.

### Use a second decoy or duress compartment

Rejected by [ADR-0005](0005-no-duress-compartment.md).

## What would change our mind

A future cold-local note editor can extend this decision if it keeps secret-note
plaintext entirely inside the cold session and adds independent persistence
tests for old vaults.

## References

- [SPEC §10](../../01-spec/SPEC.md#10-notes-tags-and-concealment)
- [Public data model](../../01-spec/data-model.md#entities)
- [Architecture message schema](../../01-spec/architecture.md#message-schema)
- [Threat model](../../02-security/threat-model.md)
