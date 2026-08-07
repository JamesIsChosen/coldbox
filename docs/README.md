# Documentation

Everything about Coldbox lives here. Guides and the glossary compile into the app's Help system at build time, so there is exactly one copy of every explanation.

---

## Start here

| | |
|---|---|
| [What is this?](00-overview/what-is-this.md) | Plain-English tour of every tool |
| [Quick start](00-overview/quick-start.md) | First run in ten minutes |
| [Glossary](00-overview/glossary.md) | Every term, explained simply |
| [FAQ](00-overview/faq.md) | |

## Specification

| | |
|---|---|
| [SPEC.md](01-spec/SPEC.md) | The full design document |
| [Design system](01-spec/design-system.md) | Visual language, tokens, UI copy contract, accessibility floors |
| [Architecture](01-spec/architecture.md) | Two-realm split, message schema, failure modes |
| [Vault format](01-spec/vault-format.md) | Byte-level `.cbx` specification |
| [Data model](01-spec/data-model.md) | Entities and compartment assignment |
| [Chain registry](01-spec/chain-registry.md) | How chains are defined and validated |
| [Address verification](01-spec/address-verification.md) | The clipboard round-trip check and the two claims it makes |

## Security

| | |
|---|---|
| [Threat model](02-security/threat-model.md) | What's defended, what isn't, and why |
| [Verification](02-security/verification.md) | **Verify your copy before using it** |
| [Crypto choices](02-security/crypto-choices.md) | Every primitive and what was rejected |
| [CSP policy](02-security/csp-policy.md) | Both policies, directive by directive |
| [Audit notes](02-security/audit-notes.md) | Where a reviewer should look first |

## Guides

[Index](03-guides/README.md) — first wallet · verifying hardware wallets · verifying an address · SLIP-39 · codex32 · recovery · multisig · inheritance · airgap · portfolio

## Reference

| | |
|---|---|
| [Supported chains](04-reference/supported-chains.md) | 35+ with full addresses, plus generic derivation |
| [Derivation paths](04-reference/derivation-paths.md) | Including "my coins are missing" diagnosis |
| [Hardware wallet matrix](04-reference/hardware-wallet-matrix.md) | Backup format and feature support by device |
| [Entropy and strength](04-reference/entropy-and-strength.md) | How the health meter works |
| [US tax reporting](04-reference/us-tax-reporting.md) | Form 8949, 1099-DA, per-wallet basis rules |
| [API sources](04-reference/api-sources.md) | Every endpoint and what it learns about you |
| [Standards](04-reference/standards.md) | Every BIP/SLIP implemented, tracked, or declined |

## Development

| | |
|---|---|
| [Handoff blocks](05-development/handoff.md) | **How every session ends.** Copy-paste commands + next prompt |
| [Prompts](05-development/prompts.md) | Cold-start kickoffs for every mode |
| [Roadmap](05-development/ROADMAP.md) | **What to build next, and current status.** Authoritative |
| [PR packet](05-development/pr-packet.md) | The independent-review deliverable |
| [Review protocol](05-development/review-protocol.md) | Binary PASS/FAIL. Any advisory is a FAIL |
| [Browser runner flow](05-development/browser-runner-flow.md) | Safe development/review loop when the agent has no shell |
| [Batch runs](05-development/batch-run.md) | Working several items unattended, safely |
| [Packets](05-development/packets/README.md) | The permanent evidence trail |
| [Doc hygiene](05-development/doc-hygiene.md) | How docs are kept from going stale |
| [Build](05-development/build.md) | Reproducible build instructions |
| [Dependencies](05-development/dependencies.md) | Pinned versions and upstream hashes |
| [Testing](05-development/testing.md) | Vectors, security tests, device matrix |
| [Release checklist](05-development/release-checklist.md) | |
| [ADRs](05-development/adr/README.md) | Why things are built the way they are |

Agents start at [AGENTS.md](../AGENTS.md).

---

## Conventions

**Honesty over reassurance.** Where something doesn't work, or a guarantee doesn't hold, the docs say so. A user who over-trusts the tool is in more danger than one who understands its limits.

**Plain English first.** Technical precision follows; it doesn't lead.

**Consequences stated.** These docs cover operations that can lose someone everything. Steps that are commonly skipped are marked as commonly skipped.

**Single-sourced.** Every fact has exactly one canonical home; everything else links to it. Guides and glossary compile into the app, so changing behaviour means updating the doc in the same PR.

**Dated where reality moves.** Documents describing tax rules, vendor firmware, API terms, or standards adoption carry a review date and a maximum age. Past that age CI warns. See [doc-hygiene.md](05-development/doc-hygiene.md).
