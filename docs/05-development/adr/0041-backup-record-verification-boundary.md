# ADR-0041: BackupRecord verification stays cold-owned

**Status:** Accepted
**Date:** 2026-08-13

## Context

P2.6 adds the first public `BackupRecord` workflow. The record needs a useful
location, custodian, schedule, and completion date, but the share words and any
reconstructed secret must remain inside the sealed realm. A warm-only completion
flag would let the network-capable shell manufacture evidence that the physical
backup had been tested.

The existing public-registry channel is intentionally typed and does not carry
secret material. The earlier backup ADRs also leave share generation and
reconstruction cold-local. P2.6 must connect those workflows to a public record
without turning the record into a secret transport or a second vault format.

## Decision

1. `BackupRecord` metadata is public. `subjectId`, method, label, threshold,
   group configuration, locations, custodians, dates, schedule, notes, and
   concealment state use the public registry schema. `shareMaterial` remains a
   future secret-compartment field and is not implemented by P2.6.
2. The warm shell may create and edit all public fields except
   `lastVerifiedAt`. It may not set, clear, or forge that field.
3. The only verification request is warm → cold
   `backup.verifyRequest { backupId }`. The cold realm reads the matching public
   record from the authenticated session and asks the user to type shares into
   the cold frame.
4. The only completion response is cold → warm
   `backup.verifyResult { backupId, outcome, verifiedAt? }`. `outcome` is a
   closed enum: `verified`, `invalid`, `unsupported`, `no-record`, or
   `vault-locked`. Only `verified` may include a canonical ISO timestamp.
5. On a successful supported reconstruction, the cold session writes
   `lastVerifiedAt` into its own authenticated public compartment before
   sending the result. The warm registry applies the validated timestamp to its
   view and a normal vault save makes it durable.
6. A warm public replacement preserves an existing timestamp only when the
   record's subject, method, threshold, and group configuration are unchanged.
   Changing any of those identity fields clears the timestamp in the cold
   session. The completion is therefore evidence for a specific backup
   configuration, not for a label or location record in the abstract.

The first implementation supports cold reconstruction for SLIP-39, codex32,
Seed XOR, Shamir39, and raw SSS. SeedQR, metal, paper, and encrypted-file
records return `unsupported` until their record-specific verification workflows
exist. For mnemonic formats, the user selects the BIP-39 language in the cold
frame because the current public record model has no language field. A
successful reconstruction proves that the supplied threshold set passes the
format's parser/checksum or mathematical reconstruction; it does not prove a
separate BIP-39 passphrase or the safety of the physical storage location.

## Rationale

The request identifies only a public record, so no share text can cross the
realm boundary. A closed result enum avoids using cold-origin prose as an
unbounded message field. Keeping the timestamp update in the cold session
matches the existing cold-owned address verification rule and prevents a warm
caller from turning an unverified record into a completed one.

Preserving the timestamp across unrelated public edits avoids forcing a user to
retest a backup merely because its location note changed. Clearing it when the
backup identity changes prevents an old successful test from being attached to a
new share set or threshold.

## Consequences

### Positive

- Public backup health and scheduling can work without decrypting secret data.
- The warm shell never receives share words, reconstructed bytes, or a secret
  comparison candidate.
- Completion evidence is authenticated by the cold session and is easy to
  inspect as a typed message.

### Negative

- A successful verification requires an unlocked cold session and a normal save
  to make the public timestamp durable.
- Unsupported physical formats remain incomplete until their own workflow is
  implemented.
- The user must choose the mnemonic language during verification.

### Risks

- A mathematically valid reconstruction can still represent the wrong wallet if
  the physical shares belong to another record; the public subject metadata and
  separate fingerprint/device checks remain the user's responsibility.
- JavaScript strings and DOM controls cannot promise perfect zeroization; the
  cold workflow clears inputs and byte buffers on completion and teardown but
  does not claim OS-level erasure.

## Alternatives considered

### Let the warm shell set `lastVerifiedAt`

Rejected. It would make the completion claim forgeable by any warm-side bug or
injection and would contradict the existing cold-owned verification model.

### Return the reconstructed secret for warm comparison

Rejected. It would cross the central security boundary and is unnecessary for
format-level reconstruction checks.

### Store share text in `BackupRecord`

Rejected. Public storage would leak the backup, while secret-compartment
storage requires a separate encrypted record design and threat analysis. That is
outside P2.6.

### Add a free-form cold result message

Rejected. Arbitrary cold-origin prose cannot be distinguished from accidental
secret disclosure by the protocol sanitizer. The warm shell maps enum outcomes
to user-facing copy.

## What would change our mind

Add a new ADR before changing this boundary if a future format requires a secret
comparison oracle, a stored encrypted share record, a persisted language field,
or a different definition of “verified.” The change would need new independent
vectors, a message-schema review, and a threat-model update.

## References

- [Architecture — the two realms](../../01-spec/architecture.md)
- [Data model](../../01-spec/data-model.md)
- [ADR-0036 — SLIP-39 cold vendoring](0036-slip39-cold-vendoring.md)
- [ADR-0037 — codex32 cold hand-verifiable shares](0037-codex32-cold-hand-verifiable.md)
- [ADR-0038 — Shamir39 and raw SSS cold-only](0038-shamir39-and-raw-sss-cold-only.md)
- [ADR-0039 — Seed XOR cold-only](0039-seed-xor-cold-only.md)
