# ADR-0035: Cold-only printing adds `allow-modals`

**Status:** Accepted
**Date:** 2026-08-10
**Amends:** [ADR-0001](0001-two-realm-architecture.md) for the current cold-frame permission set

---

## Context

ADR-0001 records the original August 2 two-realm decision: the cold `srcdoc` iframe uses `sandbox="allow-scripts allow-downloads"` and omits `allow-same-origin`, preserving an opaque origin around secret material. That historical record remains unchanged as the rationale for the boundary.

P1.10 adds a cold-only SeedQR card-print workflow. The browser print request is a modal operation, and browsers require the sandboxed document to have the `allow-modals` token for `window.print()` to function. Without it, the product would claim a print action that the sealed frame cannot actually request.

## Decision

Amend the current cold iframe sandbox token set to:

```html
<iframe sandbox="allow-scripts allow-downloads allow-modals" srcdoc="…">
```

Grant `allow-modals` only for the cold-only print workflow. Keep `allow-same-origin` absent, and do not add any other sandbox token. Secret QR bytes remain inside the cold realm; the print action is user-initiated and the UI continues to warn about printer queues, printer memory, photographs, and discarded drafts.

## Rationale

`allow-modals` is the smallest permission that makes the existing print contract truthful. It does not create a same-origin relationship, enable network requests, permit navigation, or add a message path. The cold document still carries `connect-src 'none'`, and the opaque origin still prevents the warm shell from reading its DOM, variables, or keystrokes.

The P1.10 Chromium and Firefox harness stubs `window.print()` inside the cold frame and verifies that the button requests printing. It also asserts the exact three-token sandbox and the continued absence of `allow-same-origin`.

## Consequences

### Positive

- Cold-only SeedQR printing works as claimed in browsers that support the flow.
- The permission change is explicit, minimal, and auditable rather than hidden in implementation code.
- The historical ADR-0001 decision remains an accurate record of the original August 2 boundary.

### Negative

- The sandbox has one additional narrowly scoped capability, so the current token set must be kept synchronized across code, policy, and tests.
- Printing can leave secret copies in printer queues, printer memory, operating-system spoolers, photographs, or discarded drafts; the product cannot erase those copies.

### Risks

- Browser-specific print behavior may still differ under `file://`. The browser harness is evidence of the request and layout behavior, not physical printer retention or mobile-device compatibility.
- A future contributor could mistake `allow-modals` for permission to add broader UI or origin capabilities. The exact-token assertions and this ADR are the guardrails.

## Alternatives considered

### Remove printing from P1.10

Rejected. P1.10 requires printable cards, and removing the action would leave the documented feature incomplete.

### Add `allow-same-origin`

Rejected. It would weaken the opaque-origin boundary that protects secret entry from the warm shell. Printing does not require it.

### Add a broader sandbox permission set

Rejected. No other permission is required by the print request. More tokens would increase the cold realm's capability without evidence of need.

## What would change our mind

If browser behavior makes `allow-modals` insufficient or materially unsafe, the print workflow should fail closed and this amendment should be replaced with a smaller supported mechanism or the print feature should be withdrawn. Any additional sandbox token requires its own security review and ADR amendment.

## References

- [ADR-0001: Two-realm architecture](0001-two-realm-architecture.md)
- [Content Security Policy](../../02-security/csp-policy.md)
- [Two-realm architecture](../../01-spec/architecture.md)
- [P1.10 packet](../packets/p1.10-qr-generation.md)
