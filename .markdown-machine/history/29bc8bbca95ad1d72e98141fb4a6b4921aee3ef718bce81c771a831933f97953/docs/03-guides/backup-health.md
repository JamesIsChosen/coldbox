# Backup Health

The dashboard is a reminder system for public BackupRecord metadata. It helps
you find records that were never reconstructed, have passed their verification
date, or describe a placement that deserves a physical review.

::: plain
Unlock your vault and open **Dashboard**. Read the counts, then open **Backup
Lab** for the record that needs attention. **Current** means Coldbox recently
reconstructed the recorded backup format and matched it to the selected cold
subject. **Unverified** means that check has never succeeded. **Overdue** means
the check's interval has passed.

The dashboard can warn that two records name the same place or custodian, but
it cannot see your share pieces. Treat every warning as a reason to inspect the
physical copies, not as a claim that the dashboard has proved recovery.
:::

::: working
Each public `BackupRecord` carries a method, threshold, subject UUID, location,
custodian, `verifyEveryDays`, and the cold-owned `lastVerifiedAt` timestamp.
The warm dashboard computes its status from those fields only. Select **Verify
shares** in Backup Lab and type a threshold subset from the physical copies to
set a new timestamp; the share text and reconstructed secret remain inside the
sealed realm.

The placement check groups records by subject and normalizes recorded location
and custodian text for comparison. Repeated placement metadata is a warning.
Two or more different recorded locations are shown as **distributed,
threshold-unproven** because the current public model does not say which
individual shares are in which place. A missing location and custodian is
always incomplete placement information.
:::

::: technical
The dashboard is a warm-only projection of `BackupRecord` fields defined in
[data-model.md](../01-spec/data-model.md). `lastVerifiedAt` is writable only by
the cold `backup.verifyResult` path; the dashboard never creates verification
evidence. Supported reconstruction methods are SLIP-39, codex32, Seed XOR,
Shamir39, and raw SSS. SeedQR, metal, paper, and encrypted-file records remain
incomplete until their own verification workflows exist.

Health status is deterministic at a supplied time: a valid timestamp plus
`verifyEveryDays` is **current** before its due instant and **overdue** at or
after it. A future verification timestamp, invalid required metadata, or a due
date outside the JavaScript Date range is **needs review**, not current. The
placement assessment reports duplicate location/custodian labels and whether
locations are recorded across a subject; it deliberately has no percentage,
survivability score, or `thresholdReachable` claim. Such a claim would require
an explicit per-share placement model and a separate design decision. See
[ADR-0041](../05-development/adr/0041-backup-record-verification-boundary.md)
for the verification authority and [ADR-0042](../05-development/adr/0042-conservative-backup-health.md)
for the dashboard boundary.
:::

## Read the alerts

| Alert | What to do |
|---|---|
| Never cold-verified | Reconstruct from the written physical copies in Backup Lab. |
| Overdue verification | Repeat the reconstruction before relying on the backup. |
| Unsupported method | Keep the record incomplete; use the method's external verification process until Coldbox supports it. |
| Missing placement | Record a public location or custodian, without entering share text. |
| Repeated location or custodian | Check that one fire, theft, or unavailable person cannot remove the recovery quorum. |
| Threshold-unproven | Map every individual share to a location yourself. Different records alone do not prove a quorum survives a loss. |

## Maintenance

Run **Verify shares** from the physical copies at the interval you recorded,
and after moving a copy or changing a custodian. Test a different threshold
subset when the format allows it; one successful subset does not prove every
copy is legible or correctly labelled.

Keep the BIP-39 passphrase or other separate recovery material in its own
documented backup plan. A successful share reconstruction does not test a
passphrase, the safety of a location, the availability of a custodian, or the
ability of an heir to follow the recovery instructions.

## Related

- [SLIP-39](backup-slip39.md)
- [codex32](backup-codex32.md)
- [Shamir39 and raw SSS](backup-shamir.md)
- [Seed XOR](backup-seed-xor.md)
- [Inheritance planning](inheritance-planning.md)
