# ADR-0043: Scoped mobile-validation deferral for item review

**Status:** Accepted
**Date:** 2026-08-14

## Context

The repository's release device matrix requires physical `file://` execution,
including a mobile browser. P2.7 is a warm-only Backup Health dashboard: it
does not change the cold realm, bootstrap, CSP, storage, protocol, or vault
format, and its browser assertions run against the built artifact in Chromium
and Firefox. The maintainer has deferred physical mobile testing for this
item. A packet that merely says "untested" leaves the review status ambiguous,
while treating responsive emulation as mobile evidence would be false.

## Decision

For P2.7 only, an explicit maintainer decision may mark physical mobile
`file://` validation as **DEFERRED** for the item-level review. The packet,
roadmap note, and review history must name the deferral and link this ADR.

This is an item-review exception, not a device result:

1. `DEFERRED` is never `PASS`, and no responsive viewport result may be
   presented as physical mobile evidence.
2. The exception applies only to this warm-only P2.7 dashboard and does not
   authorize deferral for realm-boundary, CSP, storage, vault-format, or
   device-specific behavior.
3. The release device matrix in [testing.md](../testing.md) remains required,
   and P0.19 remains `[~] human-required` until its own evidence is recorded.
4. A future maintainer may withdraw this exception by updating this ADR and
   the P2.7 roadmap note; a later item needs its own explicit scope decision.

## Rationale

The dashboard's security boundary and behavior are covered by static checks,
Node tests, and the built-artifact Chromium/Firefox harness. Requiring a
physical mobile run before this narrowly scoped item can receive independent
review would hold a non-device-specific feature behind the separately tracked
P0.19 device campaign. Recording the gap as `DEFERRED` preserves honesty while
avoiding an implicit claim that desktop or responsive testing proves mobile
behavior.

## Consequences

### Positive

- P2.7 has an explicit, reviewable policy basis for the maintainer's deferral.
- The packet remains clear that mobile behavior is unverified.
- The release and P0.19 device gates are not weakened.

### Negative

- P2.7 can be independently reviewed without physical mobile evidence.
- Mobile portability debt remains open and must be handled by the device
  campaign or a later maintainer decision.

### Risks

- A future author could copy this exception to a device-sensitive item. The
  item scope, named link, and explicit exclusions are intended to prevent that.

## Alternatives considered

### Perform the physical mobile test now

Rejected for this review cycle because the maintainer explicitly deferred the
test. It remains the preferred way to close the portability debt.

### Treat responsive Playwright viewports as mobile evidence

Rejected. They do not exercise mobile browser `file://` behavior, platform
storage, or the iOS local-execution boundary.

### Remove the mobile requirement globally

Rejected. The release device matrix and P0.19 protect the repository's
cross-browser portability claim and remain mandatory.

## What would change our mind

A physical mobile `file://` result for P2.7 would replace `DEFERRED` with the
recorded device result. Any proposal to reuse or broaden this exception would
require a new explicit ADR decision and review of the affected acceptance
criteria.

## References

- [P2.7 roadmap item](../ROADMAP.md)
- [Manual device matrix](../testing.md)
- [P2.7 PR packet](../packets/p2.7-backup-health-dashboard.md)
- [P0.19 device matrix](../ROADMAP.md)
