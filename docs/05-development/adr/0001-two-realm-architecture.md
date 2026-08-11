# ADR-0001: Two-realm architecture

**Status:** Accepted
**Date:** 2026-08-02
**Supersedes:** the single-document design in spec v0.1

---

## Context

The tool must satisfy two requirements that appear mutually exclusive in a single HTML document.

**Requirement A — secrets must not leak.** The mechanism that makes this a guarantee rather than a promise is `Content-Security-Policy: connect-src 'none'`, which removes `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `sendBeacon` at the browser level. Not disabled — absent.

**Requirement B — the tools must work on an internet-connected device, and the portfolio needs live prices and on-chain balances.**

**CSP can only be tightened at runtime, never relaxed.** A document declaring `connect-src 'none'` can never make a network request. A document that can fetch a price has, by definition, an egress path for anything in its memory.

Both requirements are legitimate. The user explicitly asked for both.

## Decision

Split the application into two documents within one file.

**Warm shell** — the outer document. CSP allows `connect-src` to a pinned allowlist. Owns UI chrome, prices, balances, portfolio, and public registry views. Never receives a secret.

**Cold realm** — a sandboxed iframe (`sandbox="allow-scripts allow-downloads"`, `srcdoc`) with its own CSP setting `connect-src 'none'`. Owns vault crypto, passphrase entry, seeds, private keys, all derivation, and every Shamir scheme. `allow-same-origin` remains absent. The later printing amendment is recorded separately in [ADR-0035](0035-cold-printing-allow-modals.md).

Communication is a `MessageChannel` established at handshake, carrying a strictly-typed whitelist schema with no secret-bearing message type.

## Consequences

### Positive

- Secrets cannot leave the cold realm even if its code is fully compromised. There is no network primitive to abuse.
- `srcdoc` iframes inherit parent CSP and policies combine restrictively, so the child cannot be loosened by the parent.
- No `allow-same-origin` means an opaque origin: the warm shell cannot read the cold realm's DOM or keystrokes. Passphrase entry is protected from network-capable code on the same page.
- **The user can run key tools on a connected laptop safely.** This is the requirement that motivated the whole design.
- The security claim is browser-enforced and independently verifiable, not a policy statement.

### Negative

- Significantly more complex than a single document. Two bootstraps, a message schema, a handshake.
- Every feature must be assigned a realm, and cross-realm features need message types.
- Debugging spans two contexts.
- The cold realm must assume `crypto.subtle` may be absent (opaque origins may not be secure contexts), so pure-JS crypto is the default path.
- If the sandbox can't be established, the app must fail closed — a worse user experience than degrading, and deliberately so.

### Risks

- **Browser variation.** Sandbox and CSP behaviour under `file://` differs. Mitigated by boot-time capability checks and a hard-fail path. Must be verified across the full device matrix.
- **Parent-rendered phishing.** A modified build could draw a fake passphrase prompt outside the sandbox. Mitigated by reproducible builds and hash verification — which is why those are mandatory rather than nice-to-have.
- **Schema erosion.** Someone adds a message type that carries secret material "just for this one feature." Mitigated by making schema changes explicitly review-gated in CONTRIBUTING.md.

## Alternatives considered

**Single document, `connect-src 'none'`, no online features.**
Rejected — fails requirement B. Was the v0.1 design.

**Single document, permissive CSP, runtime discipline.**
Rejected. Reduces the guarantee to "we promise our code doesn't upload it." Any XSS or supply-chain compromise becomes total. The whole point is not asking users to trust a promise.

**Two separate files — a cold app and a warm app.**
Rejected. Breaks the single-file requirement, doubles what users must verify, and creates a data-sync problem between them. It was the honest fallback if the iframe approach hadn't worked.

**Web Worker for secrets instead of an iframe.**
Rejected. Workers inherit the parent's CSP and cannot declare a stricter one. They also can't render UI, so passphrase entry would still happen in the network-capable document — losing the most important protection.

**Server-side proxy for API calls.**
Rejected. Requires a server, breaking the core axiom, and creates a party who sees every query.

## What would change our mind

- If browsers converged on a way to tighten CSP at runtime within one document, the split would become unnecessary.
- If sandbox behaviour under `file://` proves unreliable enough on a major platform that hard-fail locks out a large share of users, the two-file alternative returns.
- If a practical attack demonstrated reading across the sandbox boundary, the entire model would need rethinking.

## References

- [architecture.md](../../01-spec/architecture.md)
- [csp-policy.md](../../02-security/csp-policy.md)
- [SPEC.md §2](../../01-spec/SPEC.md)
