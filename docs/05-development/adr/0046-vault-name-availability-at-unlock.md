# ADR-0046: Warm supplies the public vault-name list to cold at unlock

**Status:** Accepted · amends [ADR-0025](0025-vault-identity-library-and-save-ux.md)
**Date:** 2026-08-14

## Context

[ADR-0025](0025-vault-identity-library-and-save-ux.md) placed vault naming in the warm shell: the user chooses a public name *before* creation, and the cold realm is gated by the strict payload-free `vault.create.prepare {}` message. ADR-0025 §2 is explicit that the message carries no fields, so that neither the name nor any other free-form value can hitch a ride across the boundary. [ADR-0026](0026-canonical-vault-save-and-live-transfer.md) then required that a different Vault ID cannot claim an already-known public name in the app-visible scope.

The August 2026 design work proposes finishing a job ADR-0025 started. Creation's unlock phrase, confirmation, KDF profile and keyfile are **already** inside the sealed realm (ADR-0025 §1); only the **name** is chosen beforehand, in the warm shell (ADR-0025 §2). So a single create action is split across the security boundary for one field, which is the reason people mis-order it.

This ADR — not [ADR-0045](0045-released-secret-model.md), which is about seed material and says nothing about vault creation — is what decides that the naming step joins the rest of creation in cold.

That creates a problem ADR-0025 did not have to solve. The name is now chosen inside cold, but the set of names already in use is warm-side state, and **cold cannot see it**. Without something, the duplicate-name refusal that ADR-0025 §2 and ADR-0026 require either stops being enforced or gets enforced too late — after the user has entered a phrase, confirmed it, and benchmarked a KDF profile.

Two shapes were available. Warm supplies the list of names in use at unlock, or cold posts a candidate name outward and warm answers taken/free.

## Decision

**Vault naming moves into the sealed realm**, joining the unlock phrase, confirmation, KDF profile and keyfile already there under ADR-0025 §1. Creation becomes one screen on one side of the boundary. This amends ADR-0025 §2's placement of the naming step; everything else in §2 — that the name is public metadata, that it must not contain secrets, and that it never crosses cold → warm as free-form text — stands unchanged.

**To make that safe, warm supplies the list of public vault names in use, to cold, once, as part of the existing unlock/session-start exchange.**

The message is typed and narrow, in the manner [ADR-0031](0031-public-registry-mutation-boundary.md) already established for warm-to-cold public data:

- **Direction is warm → cold only.** No name, and no derivative of one, is ever returned across the boundary. The prohibition ADR-0025 §2 established — no free-form cold → warm text — is untouched, and this decision does not relax it in any way.
- **The payload is a list of strings and nothing else.** It carries no Vault IDs, no file paths, no save state, no counts, no timestamps. A name is public metadata by ADR-0025 §2; it is not, and must never become, a channel for anything else.
- **It is validated on entry to cold like any untrusted input**: type-checked, length-bounded per element, list-length-bounded, rejected wholesale on any malformed element. Cold treats the list as data to compare against, never as markup, and never renders an element as HTML.
- **It is session-scoped and non-authoritative.** Cold holds it only to answer "is this name already taken?" while the create screen is open, discards it on teardown with everything else, and never persists it or writes it into a vault compartment.
- **Warm remains the authority.** Cold's check is a fast local answer that prevents the user wasting a creation flow. It does not replace warm's own refusal at save time, which stays exactly as ADR-0025 and ADR-0026 specify. If the two ever disagree, warm wins and the save is refused.

## Rationale

The two options differ in what cold learns, not in what warm learns — warm learns nothing new either way, and no secret moves in either.

Supplying the list costs cold knowing the user's vault names for the duration of a session. That is a real disclosure and worth stating plainly, but it is a disclosure of data that is already public by ADR-0025 §2: these names appear in filenames on disk, in the vault library, and to anyone who can see the filesystem. Cold learning them adds no exposure that the threat model cares about, because cold is the side that cannot talk to anything.

The ask-and-answer alternative keeps cold ignorant of the library, which is a genuine and attractive property. It was rejected on three counts. It adds a request/response round-trip on the boundary, executed while the user is typing, which is more protocol surface to specify, test and review than a one-shot list. It creates a per-keystroke or per-submit signalling channel from cold to warm — a low-bandwidth one, but the existing invariant is that cold initiates nothing free-form outward, and a stream of candidate names is closer to violating that than a silent inbound list is. And it fails less well: if the answer is slow or lost, the create screen either blocks or proceeds unchecked, whereas a list that failed to arrive is an unambiguous state cold can fail closed on.

Fail-closed behaviour is specified rather than left implicit: if the list is absent or malformed, the cold create screen refuses to proceed with a name and says why. It does not silently skip the check.

## Consequences

- A new typed warm → cold message and its schema entry, with the strict-validation and unknown-field-stripping behaviour the existing protocol already applies. `test/protocol.test.js` gains negative cases: malformed elements, oversized list, wrong types, and the fail-closed path when the list never arrives.
- Cold gains a session-scoped list of public strings. It is included in the teardown that [ADR-0045](0045-released-secret-model.md) specifies, and a test asserts it does not survive a lock.
- [architecture.md](../../01-spec/architecture.md)'s message inventory and [csp-policy.md](../../02-security/csp-policy.md)'s boundary description are updated in the item that implements this, not here.
- ADR-0025 §2's payload-free `vault.create.prepare {}` is superseded for the creation path only: gating the cold creation UI now also delivers the name list. The rest of ADR-0025 — that names are public warm metadata, that the Vault ID is a cold-generated UUID, that no free-form string returns from cold — stands unchanged.
- Duplicate-name refusal becomes visible at the moment of typing rather than at save. This is the user-facing point of the decision and the acceptance criterion for it.
- The disclosure is recorded in [threat-model.md](../../02-security/threat-model.md) under *Not defended* rather than left to be discovered: cold knows the public names of the vaults in the library for the duration of a session.
- **UI.10 owns the implementation of this ADR in full** — the typed message and its schema entry, element and list bounds, fail-closed behaviour on a missing or malformed list, teardown, the negative protocol tests, and the [architecture.md](../../01-spec/architecture.md) message-inventory and [csp-policy.md](../../02-security/csp-policy.md) updates. No part of it is left to be picked up incidentally by another item.

## Alternatives considered

**Cold posts the candidate name out; warm answers taken/free.** Rejected for the round-trip, outbound-signalling and failure-mode reasons above. Reconsider if the name list ever stops being purely public — if it grew IDs, paths or counts, the calculus inverts and the narrow question becomes the safer shape.

**Leave naming in the warm shell and keep creation split.** Rejected by [ADR-0045](0045-released-secret-model.md), which moves creation into cold precisely because splitting it is what causes mis-ordering. Keeping the split to avoid one narrow public message would be trading a real usability defect for a theoretical one.

**Let cold skip the check and rely on warm refusing at save.** Rejected. It is the current behaviour by accident rather than design, and it means a user can complete naming, phrase entry, confirmation and a KDF benchmark before being told the name was never available. Fail-closed on a missing list is the same amount of code and strictly better behaviour.

**Send a set of salted hashes of the names rather than the names.** Rejected as security theatre. The name set is small, low-entropy and user-chosen, so hashes are trivially recoverable by the side that already holds the candidate; it would add a construction to review while disclosing effectively the same information.
