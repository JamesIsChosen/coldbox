# ADR-0018: AGPLv3 rather than MIT, and what §5(d) obliges the app to display

**Status:** Accepted
**Date:** 2026-08-07

## Context

[SPEC.md §20.3](../../01-spec/SPEC.md) recommended MIT, on the reasoning that MIT is the prevailing norm in the wallet ecosystem and imposes the least friction on reuse. That reasoning optimises for adoption. It does not optimise for the property this project actually depends on, which is that **the file a user runs can be traced back to source they can rebuild**.

Three facts about Coldbox make the licence choice load-bearing rather than administrative:

1. **The product is a single distributable file.** A modified `coldbox.html` is indistinguishable from an honest one by inspection — it is one HTML file either way. The whole trust model rests on reproducible builds plus published hashes (§20.1), and that model only helps a user who can obtain the corresponding source.
2. **A modified build is the primary attack.** [architecture.md](../../01-spec/architecture.md#known-weaknesses) already names parent-rendered phishing as the top residual weakness, and its stated mitigation is "a verified build cannot do this; an unverified one can do anything." Under MIT, someone may ship a modified Coldbox that draws a fake passphrase prompt and is under no obligation to release the change.
3. **The one deployment we forbid is the one MIT permits silently.** §20.3 states a hosted copy is not offered, because it would invite people to generate real keys on a page they never verified. MIT permits anyone to host a modified copy with no source obligation.

## Decision

Coldbox is licensed under the **GNU Affero General Public License, version 3 only** (SPDX: `AGPL-3.0-only`), replacing MIT.

"Version 3 only" rather than "or any later version" — an automatic upgrade clause hands a future licence-drafting decision to a third party, which is the same class of trust delegation this project declines everywhere else.

Two consequences follow that are *not* administrative and are recorded here so they are not discovered later:

**A. The app must display Appropriate Legal Notices.** AGPLv3 §0 defines these as a convenient and prominently visible feature showing the copyright notice, the absence of warranty, that recipients may convey the work under this licence, and how to view a copy of it. §5(d) requires an interactive UI to display them. Coldbox has an interactive UI, so this is a build obligation, not a repository one. The provenance panel ([ADR-0015](0015-provenance-build-date-and-self-hash.md)) is the correct home — it already carries the build date, the dependency list, and the CSP allowlist, and it is already the place a suspicious user goes. **This creates roadmap item P0.20**, which also carries the full licence text into the bundle. Until P0.20 ships, no release may be tagged, because a release would be a conveyance without the notices §5(d) requires.

**B. §13 does almost nothing here, and the README must not imply otherwise.** §13's remote-network-interaction clause binds an operator who *modifies* the Program and lets users interact with it *over a network*. Coldbox is designed to be run from `file://` and forbids network access in the realm that matters. So §13 bites only against exactly one actor: someone who takes Coldbox, modifies it, and hosts it as a web app — the scenario §20.3 exists to discourage. That is a real and deliberate effect, but it is narrow, and claiming AGPL "protects users' data" or similar would be marketing rather than fact.

## Rationale

**§5(c) is the clause that matters, not §13.** Any conveyed modified version must be licensed as a whole under the AGPL, with prominent notices stating it was modified and when. That converts "you should be able to rebuild the file you were given" from a project aspiration into a licence condition on anyone who distributes a variant. It aligns the licence with the threat model instead of leaving them pointing in different directions.

**Reuse friction is the intended cost, not an accident.** MIT's advantage is that a wallet vendor can vendor pieces of Coldbox into a closed product. That is precisely the transaction this project has no interest in: the value here is a verifiable artifact, and a closed derivative destroys verifiability while keeping the reputational benefit of the original's design.

**Vendored dependency compatibility was checked, not assumed.** Per [dependencies.md](../dependencies.md): the `@noble`/`@scure` tree is MIT, and MIT is a permissive licence whose terms an AGPL work may incorporate. The vendored fonts are SIL OFL 1.1, which permits bundling and imposes only a reserved-font-name and same-licence condition on the font files themselves; they are aggregated, not relicensed. Playwright (Apache-2.0) is a dev dependency that contributes zero bytes to the build ([ADR-0007](0007-headless-browser-harness.md)) and is therefore never conveyed. No vendored artifact is GPL-incompatible, and nothing in the tree required a §7 additional-permission carve-out.

**Relicensing authority is uncomplicated.** At the time of this decision, all copyright in the repository is held by the single author named in the previous MIT notice. There is no contributor whose consent is required. Recording that here matters because it will stop being true the moment a second contributor merges anything, and a future reader should not have to reconstruct it.

## Consequences

### Positive

- A distributed modified build carries a source obligation, so the reproducible-build trust model has legal backing rather than resting on goodwill.
- Hosting a modified copy — the deployment §20.3 warns against — now triggers §13, which is the one place §13 is useful.
- §11's explicit patent grant is inherited, which MIT lacked. Apache-2.0 was the previously-named alternative purely for that grant; AGPLv3 supplies it without giving up copyleft.

### Negative

- Commercial closed-source reuse becomes impossible. This is intended, but it is a real loss of a real audience.
- AGPL is disallowed by policy at a number of organisations, so some potential contributors are excluded by their employer regardless of their own view.
- §5(d) adds a permanent UI obligation and roughly 34 KB of licence text to a bundle with a stated 3 MB target and 4.5 MB hard cap ([SPEC §3](../../01-spec/SPEC.md)). The cost is real but is well inside budget.

### Risks

- **A release tagged before P0.20 would be non-compliant.** Mitigated by making P0.20 a Phase 0 item and stating the gate in [release-checklist.md](../release-checklist.md) rather than relying on anyone remembering this ADR.
- **AGPL's reputation invites incorrect claims about what it provides.** A reader may assume a network-copyleft licence implies privacy or anti-telemetry guarantees. It implies neither; the no-telemetry claim rests on the CSP allowlist being in the source and there being no analytics code to find (§20.3). The FAQ states the distinction explicitly for this reason.
- **The licence does nothing against the attacker who does not distribute.** Someone who modifies Coldbox and uses it to phish a single victim conveys nothing and owes nothing. Licences do not defend against attackers; verification does. This ADR does not change [threat-model.md](../../02-security/threat-model.md), and no threat row was added, because none is honestly claimable.

## Alternatives considered

**Keep MIT.** Lowest friction, largest reachable audience, and the ecosystem norm. Rejected because it permits exactly the derivative this project's threat model treats as the primary risk — a modified single-file build with no source obligation — while the project simultaneously asks users to trust reproducible builds.

**Apache-2.0.** Adds the patent grant MIT lacks and is more acceptable to corporate legal departments. Rejected for the same reason as MIT: permissive terms place no obligation on a modified redistributed build. AGPLv3 §11 provides the patent grant anyway.

**GPLv3 without the Affero clause.** Covers §5(c), which is the clause doing most of the work here, and avoids AGPL's organisational-policy problem. Rejected narrowly: hosting a modified copy is a specifically named anti-goal in §20.3, and GPLv3 permits it with no source obligation. AGPL closes that one gap at the cost of some contributor reach — a trade worth making for a project whose central claim is verifiability.

**Dual-licence, AGPL plus a commercial exception.** Standard practice for funded projects. Rejected as unimplementable in good faith here: selling exceptions means selling permission to ship an unverifiable derivative, which contradicts the reason for choosing copyleft. It also presumes an entity able to grant and defend exceptions, and [faq.md](../../00-overview/faq.md) states plainly that there isn't one.

## What would change our mind

- A second copyright holder appears and wants different terms; relicensing then requires their consent, and a fork is the honest outcome rather than a quiet change.
- A vendored dependency the project genuinely needs turns out to be AGPL-incompatible and has no substitute. Adding a §7 additional permission would be preferable to abandoning copyleft, and the analysis would go in a new ADR.
- The §5(d) notice obligation proves unimplementable within the bundle budget or the portability contract. Unlikely — it is static text — but if the licence text could not ship, the licence could not honestly be claimed.

## References

- [SPEC.md §20 — Open source and release engineering](../../01-spec/SPEC.md)
- [ADR-0006 — A companion to hardware wallets, not a replacement](0006-companion-not-replacement.md)
- [ADR-0015 — Provenance panel build date and self-hash](0015-provenance-build-date-and-self-hash.md)
- [dependencies.md](../dependencies.md) — vendored artifact licences
- [ROADMAP.md](../ROADMAP.md) — P0.20, the in-app Appropriate Legal Notices item
- GNU Affero General Public License v3.0 — the full text as distributed in [LICENSE](../../../LICENSE)
