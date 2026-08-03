# ADR-0008: Treat CSP network blocking as a browser signal, not a throw contract

**Status:** Accepted  
**Date:** 2026-08-03

## Context

The cold realm's `connect-src 'none'` policy is the security boundary. Browser APIs do not expose one uniform JavaScript failure shape when CSP blocks a request: `fetch()` commonly rejects, while `XMLHttpRequest` and `WebSocket` may dispatch `error` or `close` events. A test or roadmap sentence that requires every primitive to throw would either fail on a conforming browser or tempt an implementation to add runtime monkey patches before the P0.8 defense-in-depth item.

## Decision

P0.6 defines the acceptance behavior as **blocked by the cold CSP**, not as a particular JavaScript exception. The browser harness requires a matching `connect-src` `securitypolicyviolation` for each P0.6 primitive probe, in addition to the primitive's blocked outcome. The probe target may remain unreachable; DNS failure alone cannot satisfy the assertion because the CSP violation is correlated to that individual request.

P0.8 may add runtime neutering, which can produce labelled throws independently of CSP. That later signal is defense in depth and does not replace the P0.6 CSP assertion.

## Rationale

The policy—not an incidental API error shape—is the guarantee. Requiring the violation event keeps the test tied to the security mechanism while remaining valid across Chromium and Firefox.

## Consequences

### Positive

- The roadmap and test speak about the security property that matters.
- Browser-specific error and event behavior is explicit rather than hidden in a permissive test.
- A DNS-only failure cannot make a cold network probe pass.

### Negative

- The harness depends on browser CSP violation events, so it remains a browser test rather than a pure Node test.
- A browser that does not expose the event will fail closed in review until its behavior is understood.

### Risks

- A future primitive-specific probe could accidentally omit the per-request violation requirement. The harness option is explicit and P0.6 calls it for every cold network primitive.

## Alternatives considered

- **Require every API to throw:** rejected because XHR and WebSocket can report CSP blocking through events.
- **Accept any error event or timeout:** rejected because DNS failure and a blackholed endpoint can produce the same result without CSP.
- **Install runtime stubs in P0.6:** rejected because runtime neutering is a separate defense-in-depth item and would obscure whether the CSP itself is active.

## What would change our mind

If the supported browser matrix changes to a platform that lacks reliable `securitypolicyviolation` events, add a platform-specific independent assertion before changing this contract.

## References

- [P0.6 roadmap item](../ROADMAP.md)
- [CSP policy](../../02-security/csp-policy.md)
- [P0.8 runtime airgap guard](../ROADMAP.md)
