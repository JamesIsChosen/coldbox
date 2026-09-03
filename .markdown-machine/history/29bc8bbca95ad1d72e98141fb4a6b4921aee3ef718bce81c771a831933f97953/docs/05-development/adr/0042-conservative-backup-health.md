# ADR-0042: Conservative Backup Health from public metadata

**Status:** Accepted
**Date:** 2026-08-14

## Context

P2.7 needs to make the public `BackupRecord` schedule useful after P2.6. The
record contains a subject, method, threshold, location, custodian, and
cold-owned verification timestamp, but it does not contain a mapping from
individual share indices to physical placements. A dashboard that converted
those fields into a numeric survivability score could imply that a quorum
survives a fire, theft, lost custodian, or other failure when the data cannot
establish that.

The dashboard also runs in the warm shell, which may be online. It must remain
useful without opening the sealed realm or receiving share material.

## Decision

1. Compute health entirely from visible public BackupRecord metadata in a
   warm-only module. No new message type, secret field, or vault-format field
   is introduced by P2.7.
2. Classify each record as `unverified`, `current`, `overdue`, or `invalid`.
   A current status requires a valid cold-owned `lastVerifiedAt` and a valid
   `verifyEveryDays` interval. Unsupported methods remain incomplete.
3. Group records by public `subjectId` and compare normalized location and
   custodian labels. Repeated labels produce co-location warnings; missing
   labels produce incomplete-placement warnings.
4. Show more than one recorded location as `distributed, threshold-unproven`.
   The dashboard never emits a percentage, survivability score, or
   `thresholdReachable` claim. It explicitly tells the user to map individual
   shares and rehearse recovery outside this assessment.
5. Keep the Backup Lab's cold **Verify shares** action as the only authority
   for updating `lastVerifiedAt`.

## Rationale

The existing public model is sufficient for schedule reminders and useful
metadata hygiene. It is not sufficient for a mathematical or operational
survivability calculation. A conservative warning is safer than a precise
looking score built from missing facts, and avoids expanding the vault schema
before a per-share placement design has its own threat analysis.

Keeping the calculation warm-only preserves the existing two-realm contract:
the dashboard can render while the vault is unlocked without requesting or
handling share words, reconstructed values, seeds, passphrases, or keys.

## Consequences

### Positive

- Unverified and overdue records are actionable without exposing secrets.
- Co-location, missing placement, and unsupported-method risks are visible.
- The UI does not overstate what the public data proves.
- Future per-share placement work has a clear boundary to replace or extend.

### Negative

- A user must perform the final placement and quorum analysis themselves.
- Different locations recorded on separate records still do not prove which
  shares are there.
- Unsupported physical methods need their own verification workflows.

### Risks

- A public location or custodian label may be stale or intentionally vague.
- Normalized text comparison can miss two labels that refer to the same place
  when the user wrote them differently. The warning is advisory and never a
  proof of separation.

## Alternatives considered

### Add `shareCount` and per-share placement fields in P2.7

Rejected for this item. It would change the public schema and require a
separate decision about share indices, group membership, migrations, privacy,
and how a record maps to a cold subject. P2.7 can deliver schedule and metadata
health without silently inventing that model.

### Display a survivability percentage from record count and threshold

Rejected. Record count is not share count, and a threshold does not identify
which physical failures remove which shares. The false precision would be a
security defect.

### Ask the cold realm to calculate placement health

Rejected. Placement fields are public, and the cold realm has no additional
authority about physical locations. Moving the calculation cold would add
complexity without adding evidence or improving the secret boundary.

## What would change our mind

A future per-share placement design with explicit share/group identity,
migration rules, privacy review, and independent survivability vectors could
replace the conservative assessment. It would require a new ADR and updates to
the data model, threat model, and review packet before implementation.

## References

- [Two-realm architecture](../../01-spec/architecture.md)
- [BackupRecord data model](../../01-spec/data-model.md)
- [ADR-0041 — BackupRecord verification boundary](0041-backup-record-verification-boundary.md)
- [Backup Health guide](../../03-guides/backup-health.md)
