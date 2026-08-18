# ADR-0059: Self-custody workstation product identity and redesign-before-parity gate

**Status:** Accepted — pre-v1 UI change control
**Date:** 2026-08-17

## Context

Coldbox began as an offline crypto toolkit and hardware-wallet companion. That
framing is still embedded in the README, plain-English overview, SPEC and design
copy contract.

The accepted roadmap has outgrown that limitation. Before v1, Coldbox is planned
to add Level 3 secret isolation, structured seed lineage, a complete standalone
single-signature Bitcoin wallet, Coldbox-native signing, PSBT workflows and a
broader relationship model connecting seeds, wallets, accounts, addresses,
devices, backups, recovery and public records.

UI.11 is already in progress against desktop/mobile references designed around
the older tool-first product hierarchy. Completing exact pixel parity first and
then reorganizing the product would certify a shell we already intend to
replace.

The existing parity contract explicitly defines approved mocks as visual
baseline evidence rather than product specification and permits replacement by
maintainer-approved change control.

## Decision

The durable product category is:

> **Coldbox — Self-Custody Security Workstation**

The finished v1 product includes a complete standalone single-signature Bitcoin
wallet while preserving Coldbox's broader secret-management, verification,
backup, recovery, portfolio, record-keeping and reference capabilities.

This does not turn future capability into current capability. Until an owning
roadmap item ships, the interface represents that capability as unavailable.

### UI.11 pauses before more pixel convergence

UI.11 remains `[~]` because its existing parity work and evidence are real
history. New pixel-convergence work pauses behind two inserted items:

- **UI.10a** — replacement product-design/mock approval and repository import;
- **UI.10b** — implementation of the approved self-custody-workstation shell.

The historical UI.11 dependency line remains exactly `UI.8, UI.9, UI.10`.
P2.8's dependency remains exactly `P2.7, UI.11`. The new items are an explicit
maintainer-approved sub-gate, not a rewrite of frozen historical dependency
evidence.

### The design pass owns exact information architecture

This ADR deliberately does **not** freeze exact new navigation labels, ordering,
panel geometry, or mobile composition.

The maintainer-approved replacement desktop/mobile mocks own those design
decisions.

The design must, however, satisfy these product constraints:

- object/workflow-centered navigation rather than tool-first navigation;
- every existing specialist capability remains reachable;
- future wallet/seed/security capabilities can have reference designs without
  being presented as currently shipped;
- the comic visual language, logo, palette, halftone field, hard outlines,
  offset shadows and typography system remain recognizably Coldbox;
- security-sensitive panels remain calm under ADR-0044;
- cold/warm authority boundaries remain explicit and cannot be flattened for
  convenience;
- mobile accessibility/touch/focus requirements remain;
- no generic exchange/trading/dApp dashboard scope is introduced.

Specialist tools such as Entropy Lab, Seed Forge, derivation/share/Codex32/QR/
hash/verification utilities remain valid capabilities. The redesign may move
them into contextual workflows or an Advanced-tools area rather than making
their names the top-level product model.

### Replacement mocks are approved externally before repository authority

Working design handoffs and draft mock artifacts may be created outside the
repository.

They have no authority merely because an agent generated them.

After explicit maintainer approval, UI.10a imports the approved desktop/mobile
artifacts as **new immutable reference files**, records hashes/byte sizes/
viewports/screen inventory/navigation metadata, and updates the harness/manifest
so the new set is current.

The prior approved references remain byte-identical historical evidence. They
are never edited or overwritten.

### Product language

Permanent language such as:

- "toolkit only";
- "not a wallet";
- "holds no keys and signs nothing — ever";
- "hardware-wallet companion, not replacement";

is superseded as future product identity.

Current pre-WAL documentation may still truthfully say that the current build
does not yet construct/sign/broadcast transactions.

The durable hardware position is:

> **Standalone by design; hardware-enhanced by choice.**

Post-v1 hardware signers are optional additional security boundaries, not a
prerequisite for Coldbox.

### Funding model

Coldbox remains free/open-source software under the existing licensing decision.

Development may be donation/sponsorship supported. Funding does not create
security tiers and does not introduce:

- feature paywalls;
- activation;
- account/login requirements;
- advertisements;
- DRM;
- subscription lockouts; or
- monetization prompts in vault creation, secret handling, recovery or signing.

## Rationale

"Toolkit" correctly describes Coldbox's origin but undersells and misorganizes
the accepted finished product. "Bitcoin wallet" alone is also too narrow because
the core differentiator is the lifecycle around ownership: secret identity,
lineage, devices, backups, verification, recovery and records.

"Self-Custody Security Workstation" describes that larger job while allowing the
Bitcoin wallet to be complete rather than artificially dependent on external
hardware.

Pausing parity avoids spending more effort perfecting an information hierarchy
that is already known to be superseded.

## Consequences

### Positive

- The design agent can solve the actual product architecture before engineering
  resumes exact parity.
- The current distinctive Coldbox aesthetic remains a requirement rather than
  being discarded during reorganization.
- Existing specialist capabilities are preserved without forcing them to remain
  the primary navigation model.
- Product copy no longer contradicts the accepted v1 signing/wallet roadmap.
- Donation support remains compatible with offline/open-source security.

### Negative

- UI.11 takes longer because some existing visual convergence will need to be
  redone against replacement references.
- The manifest/harness must eventually retain historical references while
  selecting a new current set.
- Documentation must carefully distinguish future product identity from current
  implementation until WAL/SEED/SEC items land.

### Risks

- The redesign could become a generic dashboard and lose Coldbox's visual
  identity.
- Moving tools contextually could orphan expert workflows.
- Future wallet mock screens could be mistaken for shipped behavior.
- A conceptual navigation group spanning warm/cold records could accidentally
  imply a permission boundary that does not exist.

UI.10a/UI.10b make these explicit acceptance targets.

## Alternatives considered

### Finish existing parity first

Rejected. It would certify the wrong information architecture and immediately
create a second redesign/parity campaign.

### Change only README/marketing wording

Rejected. The problem is the application's mental model, not only its tagline.

### Keep every tool as a top-level destination

Rejected as the default product architecture. Existing tools stay available,
but the primary user model should be their seeds, wallets, devices, backups,
addresses, records and security state.

### Make hardware wallets mandatory

Rejected. Hardware remains valuable optional defense-in-depth, but v1 includes
standalone Coldbox signing.

### Commercial/paywalled product tiers

Rejected for the current project direction. Security functionality remains
available to every user; optional funding is donation/sponsorship based.

## References

- [Design system](../../01-spec/design-system.md)
- [UI parity contract](../../01-spec/ui-parity.md)
- [Future v1 contract](../../01-spec/v1-security-wallet-contract.md)
- [ADR-0009](0009-comic-visual-language.md)
- [ADR-0044](0044-panel-scoped-calm-rule.md)
- [ADR-0049](0049-approved-mock-parity-contract.md)
- [ADR-0051](0051-full-bitcoin-wallet-v1.md)
