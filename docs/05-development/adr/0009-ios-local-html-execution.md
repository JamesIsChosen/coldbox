# ADR-0009: iOS local-HTML execution is a portability gate, not a preview-equivalence claim

**Status:** Accepted
**Date:** 2026-08-04

## Context

Coldbox is designed as one byte-stable HTML file with no installation, build step, localhost server, or runtime dependency. The portability contract named Safari on iOS from Files, and P0.13 required its manual save/load path to work there.

That requirement is security-sensitive, not merely presentational. A valid Coldbox run must establish the sandboxed `srcdoc` cold realm, inherited and independent CSP policies, opaque-origin isolation, the private `MessageChannel` handshake, CSP canary and fail-closed checks, the Argon2id/WASM path, and encrypted vault save/load behavior. A visual preview is not evidence of those properties.

On 2026-08-04, a human placed `build/coldbox.html` in Files on an iPhone. Files offered only Quick Look; Safari was not available through Open With or the Share sheet. The device model and iOS build were not recorded, so this is evidence for that device and not a universal claim about every iOS release.

Apple documents Quick Look as a file-preview path and documents app selection only where an eligible application handles the file. No first-party, reproducible contract has been demonstrated that takes an arbitrary local `.html` file from Files into Safari while preserving Coldbox's single-file, offline execution model.

There is also a roadmap dependency conflict: P0.13 is the dependency of P0.14, while the physical matrix is P0.19 and P0.19 depends on P0.18. The specification must not hide that deadlock by treating Quick Look as execution or by silently advancing the roadmap.

## Decision

Adopt **Choice 3: withdraw/defer the iOS local-execution claim**.

Coldbox does not currently claim that `build/coldbox.html` executes in Safari from iOS Files. iOS local execution remains a blocked portability target until Apple provides a documented path or a later accepted ADR approves a different execution architecture with its security properties demonstrated.

Quick Look is a preview mechanism and is not a Coldbox execution pass. A third-party viewer, localhost/LAN server, renamed file, converted file, or wrapped application is likewise not equivalent by default.

P0.13 remains `[~]`. This ADR does not rebaseline the P0.13 -> P0.14 dependency chain or authorize P0.14 to start; that is a separate roadmap-owner decision.

P0.19 records the iOS target separately as `PASS`, `BLOCKED`, or `UNSUPPORTED`, with the exact device and iOS version. A `BLOCKED` or `UNSUPPORTED` result does not by itself mark P0.19 complete.

## Rationale

The prior wording turned an OS-level file-handler assumption into a product guarantee. Narrowing the claim preserves the stronger properties: single-file distribution, byte-stable application code, offline operation, and the cold-realm security boundary. It also prevents a preview or newly trusted application from silently entering the security model.

## Consequences

### Positive

- The specification no longer claims an unverified iOS capability.
- Quick Look and third-party viewers cannot become undocumented security boundaries.
- The project keeps its no-server and no-install constraints rather than weakening them for a portability sentence.
- Future iOS support can be added from reproducible evidence.

### Negative

- The broad "runs anywhere" language is narrowed.
- iOS is not currently a supported local-execution platform.
- The device matrix and user-facing guidance must state the limitation.
- The roadmap dependency chain needs an explicit decision before implementation resumes beyond P0.13.

### Risks

- Users may interpret a deferred iOS target as permanent. The reconsideration condition below and P0.19 status keep the decision visible.

## Alternatives considered

- **Retain Safari-from-Files as a hard requirement:** rejected for the current roadmap because the project would remain blocked by an OS handoff that is not documented or reproducibly demonstrated. It remains available if direct iOS Safari execution is declared non-negotiable.
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
