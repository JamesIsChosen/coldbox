# ADR-0010: iOS local-HTML execution is a portability gate, not a preview-equivalence claim

**Status:** Accepted
**Date:** 2026-08-04

## Context

Coldbox is designed as one byte-stable HTML file with no installation, build step, localhost server, or runtime dependency. The portability contract named Safari on iOS from Files, and P0.13 originally required its manual save/load path to work there.

That requirement is security-sensitive, not merely presentational. A valid Coldbox run must establish the sandboxed `srcdoc` cold realm, inherited and independent CSP policies, opaque-origin isolation, the private `MessageChannel` handshake, CSP canary and fail-closed checks, the Argon2id/WASM path, and encrypted vault save/load behavior. A visual preview is not evidence of those properties.

On 2026-08-04, a human placed `build/coldbox.html` in Files on an iPhone. Files offered only Quick Look; Safari was not available through Open With or the Share sheet. The device model and iOS build were not recorded, so this is evidence for that device and not a universal claim about every iOS release.

Apple documents Quick Look as a file-preview path and documents app selection only where an eligible application handles the file. No first-party, reproducible contract has been demonstrated that takes an arbitrary local `.html` file from Files into Safari while preserving Coldbox's single-file, offline execution model.

The old roadmap created a dependency deadlock: P0.13 depended on a physical iOS result assigned to P0.19, while P0.19 itself depends on P0.18.

## Decision

Adopt **Choice 3: withdraw/defer the iOS local-execution claim**.

Coldbox does not currently claim that `build/coldbox.html` executes in Safari from iOS Files. iOS local execution remains a portability target until Apple provides a documented path or a later accepted ADR approves a different execution architecture with its security properties demonstrated.

Quick Look is a preview mechanism and is not a Coldbox execution pass. A third-party viewer, localhost/LAN server, renamed file, converted file, or wrapped application is likewise not equivalent by default.

**This accepted ADR and its accompanying roadmap-governance commit explicitly rebaseline the P0.13/P0.19 boundary.** Direct iOS Files-to-Safari execution is no longer a P0.13 acceptance gate. P0.13 must still satisfy its supported-browser save/load, lock, panic, nonce, and online-secret-safety criteria and receive a fresh independent PASS before it can merge. P0.14 remains blocked on P0.13 and is not authorized to start by this decision.

P0.19 records the iOS target separately as `PASS`, `BLOCKED`, or `UNSUPPORTED`, with the exact device and iOS version. P0.19 may complete when every supported execution-matrix platform passes its required checks and the iOS target has an exact recorded status. A `BLOCKED` or `UNSUPPORTED` iOS result remains visible portability debt but does not, by itself, fail P0.19.

## Rationale

The prior wording turned an OS-level file-handler assumption into a product guarantee and made P0.13 depend on evidence assigned to a later human-only milestone. Narrowing the claim preserves the stronger properties: single-file distribution, byte-stable application code, offline operation, and the cold-realm security boundary. It also prevents a preview or newly trusted application from silently entering the security model.

## Consequences

### Positive

- The specification and roadmap no longer claim an unverified iOS capability.
- P0.13 can be reviewed on functionality Coldbox can actually execute and independently test.
- Quick Look and third-party viewers cannot become undocumented security boundaries.
- The project keeps its no-server and no-install constraints rather than weakening them for a portability sentence.
- Future iOS support remains visible and can be added from reproducible evidence.

### Negative

- The broad "runs anywhere" language is narrowed.
- iOS is not currently a supported local-execution platform.
- The device matrix and user-facing guidance must state the limitation.
- iOS portability remains open at P0.19 even though it no longer blocks P0.13.

### Risks

- Users may interpret a deferred iOS target as permanent. The reconsideration condition below and P0.19 status keep the decision visible.

## Alternatives considered

- **Retain Safari-from-Files as a hard P0.13 requirement:** rejected because it creates a circular roadmap dependency and relies on an OS handoff that is not documented or reproducibly demonstrated.
- **Treat Quick Look as equivalent execution:** rejected because preview is not evidence for CSP, opaque-origin isolation, MessageChannel behavior, cryptographic runtime, or vault save/load.
- **Adopt another iOS execution flow:** deferred. Any alternative must independently establish offline operation, byte-stable artifact identity, CSP, cold-realm isolation, MessageChannel behavior, cryptographic runtime, save/load behavior, and its newly trusted components in a separate security-qualified ADR.

## What would change our mind

Revisit this ADR if Apple documents or ships a reproducible Files-to-Safari local-HTML flow, or if the project deliberately chooses another iOS execution architecture and independently verifies its security properties. A future test must record the device model, exact iOS version/build, Files location, acquisition path, launch path, and all applicable P0.19 results.

## References

- [Specification portability contract and save paths](../../01-spec/SPEC.md)
- [P0.13 roadmap item](../ROADMAP.md)
- [P0.19 roadmap item](../ROADMAP.md)
- [Manual device testing](../testing.md)
- [P0.13 packet](../packets/p0.13-lock-save-load.md)
- [Apple Files guide](https://support.apple.com/en-mide/guide/iphone/iphe4bff8827/ios)
- [Apple Quick Look documentation](https://developer.apple.com/documentation/quicklook)
- [Apple document type registration](https://developer.apple.com/documentation/BundleResources/Information-Property-List/CFBundleDocumentTypes)