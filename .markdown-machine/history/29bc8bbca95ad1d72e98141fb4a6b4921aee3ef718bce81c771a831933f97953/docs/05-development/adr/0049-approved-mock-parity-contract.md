# ADR-0049: Approved mockups are immutable visual acceptance evidence

**Status:** Accepted
**Date:** 2026-08-15

## Context

The Phase UI roadmap described pieces of the August 2026 handoff but did not make
the approved desktop or mobile mockup a repository-owned acceptance input. An
item could therefore satisfy its literal criteria while retaining the legacy
layout with small styling changes. Independent review had no objective basis for
calling that a failure.

The prototypes also contain implementation code, sample values, future-feature
screens and several behaviours superseded by accepted security/product
decisions. Treating their source as an implementation template would import the
wrong authority and could weaken the two-realm model.

## Decision

Keep byte-exact copies of both maintainer-approved handoffs as immutable,
non-build reference artifacts, with hashes and state inventories in a validated
manifest. [ui-parity.md](../../01-spec/ui-parity.md) defines the binding visual
contract, its finite deviation register and the evidence required to close it.

Insert a parity-contract roadmap item before the remaining interface work and a
final parity-certification item before Phase 2 resumes. A later roadmap feature
that activates a manifest-listed screen inherits the contract at its own review.

References are parsed as inert data during normal automation and are never a
product input. The eventual visual harness may render them only in a disposable,
network-blocked browser context.

## Rationale

An immutable artifact plus a zero-unexplained-difference gate turns "work toward
this mock" into a reviewable claim. The explicit register preserves security and
truthfulness without turning every implementation preference into an informal
exception. A rolling obligation covers future screens without shipping fake
controls merely to complete the UI phase.

Keeping the original bytes, rather than a prose summary or author-produced
screenshot, preserves the maintainer's actual approval evidence and allows later
reviewers to reproduce any capture.

## Consequences

### Positive

- Phase UI cannot finish while built surfaces still use the legacy visual shell.
- Desktop and mobile have equal, independently enumerated acceptance weight.
- Future agents can inspect the exact approved evidence without relying on a
  personal Desktop path.
- Known security/product conflicts are visible and finite.

### Negative

- The repository grows by the size of the two prototype snapshots.
- Exact visual comparison adds browser-fixture and state-normalization work to
  UI.11 and later visual feature items.
- A deliberate visual redesign now requires explicit maintainer approval rather
  than an implementation-local choice.

### Risks

- A broad normalizer could hide drift. The contract therefore forbids pixel
  masks, requires exact selector cardinality and ties every normalization to one
  deviation ID.
- Prototype code could be mistaken for product source. The extension, handling
  rule, build-isolation test and prominent warnings make that boundary explicit.

## Alternatives considered

### Leave the mockups outside the repository

Rejected. Paths on one maintainer's machine are not reviewable or durable, and
the roadmap could continue passing without reference evidence.

### Translate the mockups into prose only

Rejected. Prose is useful for behaviour but loses spacing, hierarchy, responsive
composition and the exact visual relationships the approval covers.

### Copy prototype code into the application

Rejected. It would conflate appearance with an unreviewed runtime, violate the
offline/reproducible architecture, and import stale product behaviour.

### Require every future mock screen to work at UI.11

Rejected. That would either pull later cryptographic/portfolio work out of
dependency order or expose non-functional controls. The rolling closure rule is
honest about availability while keeping the visual obligation.

## What would change our mind

A replacement reference system would need to preserve maintainer approval,
state coverage, deterministic offline reproduction, explicit security
deviations and an objective no-unexplained-difference gate at least as well as
this one.

## References

- [Approved UI parity contract](../../01-spec/ui-parity.md)
- [Approved reference package](../ui-reference/README.md)
- [Design system](../../01-spec/design-system.md)
- [ADR-0044](0044-panel-scoped-calm-rule.md)
- [ADR-0045](0045-released-secret-model.md)
- [ADR-0046](0046-vault-name-availability-at-unlock.md)
