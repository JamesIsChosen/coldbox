# ADR-0020: Injected wallet providers — rejected as a feature, neutered as a threat

**Status:** Accepted
**Date:** 2026-08-07

## Context

Browser wallet extensions expose a JavaScript provider object to every page. [EIP-6963](../../04-reference/standards.md) lets each installed wallet announce itself instead of contending for `window.ethereum`, and [EIP-1193](../../04-reference/standards.md) gives them all one `request({ method, params })` interface.

A proposal arrived to use one as an optional watch-only address reader, chain-ID source, and broadcast relay for [ADR-0019](0019-no-transaction-workbench.md)'s pre-signed payloads.

Investigating it surfaced a fact that turned out to matter far more than the feature:

> **`provider.request(...)` is not subject to this page's Content Security Policy.** The page messages the extension; the *extension* makes the network request, from its own context, under its own policy. Nothing appears in `connect-src`. The [CSP canary](../../02-security/csp-policy.md) does not fire. `connect-src 'none'` would not prevent it.

At the time ADR-0020 was accepted, [threat-model.md](../../02-security/threat-model.md) design commitment 4 read: *"No telemetry. The CSP allowlist in source is the complete set of reachable hosts."* ADR-0024 later clarified that fixed content-free warm-shell reachability probes to hosts already in that allowlist are not analytics/telemetry and send no Coldbox state. An injected provider would still make the allowlist claim false because extension-mediated calls are outside page CSP.

And a second fact, which is independent of whether the feature is ever built:

> **Extensions are not reliably excluded from sandboxed `srcdoc` frames.** That is a browser implementation detail, not a guarantee. Nothing currently stops an extension injecting a provider into the cold realm, and **nothing currently notices**.

## Decision

**Two separate decisions, deliberately kept apart because they point in opposite directions.**

### 1. The wallet bridge is rejected

No provider discovery, no watch-only import, no chain detection, no relay. Design commitment 4 stands unamended, with no carve-out.

### 2. Provider presence in the cold realm is treated as an isolation failure

[P0.8](../ROADMAP.md)'s runtime neutering is extended to cover `window.ethereum` and the `eip6963:announceProvider` event alongside the five network primitives — same non-configurable, non-writable installation on both the exposed object and its owning prototype. An announcement or provider object observed inside the cold realm enters **full lockdown**.

This ships regardless of decision 1, as roadmap item **P0.21**. It closes an existing hole rather than enabling anything.

## Rationale

### On rejecting the bridge

**The payoff was asymmetric.** Watch-only import saves typing. Chain detection saves a dropdown. Only relay did real work, and [ADR-0019](0019-no-transaction-workbench.md) rejected relay on its own merits.

**It would have introduced the first carve-out in the design commitments.** Those commitments are valuable precisely because they are unqualified — "the CSP allowlist is the complete set of reachable hosts" is checkable by reading the source, and a reader can verify it in a minute. Once it reads "the complete set of hosts *the application itself* can reach, except when a wallet extension is connected, in which case…", the reader has to hold a second model in their head. **That cost is paid by every future reader of the threat model, not just by users of the feature.**

**It would have created a permanently uncheckable address category.** Watch-only addresses imported from a provider can never be cold-verified, because Coldbox holds no seed for them. The registry would have gained entries that the tool's strongest check ([ADR-0021](0021-clipboard-address-verification.md)) structurally cannot reach — in a tool whose value is that it checks things.

**EIP-6963 announcements are unauthenticated.** Any extension, or any script in the page, can claim any name, `rdns`, and icon. There is no signature. Presenting a wallet picker without lending credibility to unverifiable identity claims is a genuinely hard interface problem, and it would have been solved in service of a feature worth very little.

### On neutering anyway

**The hole exists now.** It does not depend on this proposal, and it will not go away by declining the proposal. A provider injected into the cold realm is an egress channel that `connect-src 'none'` cannot touch, in the realm whose entire purpose is that it has no egress channel.

**It is defence in depth in exactly the shape already used.** [csp-policy.md](../../02-security/csp-policy.md) documents runtime neutering as sitting *behind* the CSP, never instead of it. Providers are the case where there is no CSP in front, which makes the runtime guard more important here than for the five primitives, not less.

**The alarm must distinguish two different failures.** A network-primitive call inside the cold realm means the CSP has failed. An `eip6963:announceProvider` event means an extension is injecting into a sandboxed opaque-origin frame — an *isolation* failure. Both are lockdown-worthy; they call for different responses from the user, so they get different alarm text.

**Investigating a feature and shipping only its security finding is a good outcome.** The proposal's lasting value is the discovery, not the capability.

## Consequences

### Positive

- Design commitment 4 stays unqualified and checkable by reading the source.
- No `unverifiable` address category; every registry address remains reachable by cold re-derivation.
- The cold realm gains a guard against a class of injection that was previously silent — a net security improvement obtained from a rejected feature.
- No dependency on third-party extension behaviour, which changes without notice and cannot be pinned or hashed the way [dependencies.md](../dependencies.md) requires of everything else.

### Negative

- Watch-only addresses must be entered manually. A real ergonomic cost, and manual entry is itself error-prone — partly answered by [ADR-0021](0021-clipboard-address-verification.md)'s comparison, which catches a mistyped address on the way in.
- Users who wanted one-click import will be disappointed, and will ask again.

### Risks

- **P0.21's lockdown could produce false positives.** If a benign extension announces a provider into the cold realm, Coldbox goes to full lockdown and refuses vault operations. That is the correct fail-closed behaviour and it will occasionally frustrate someone with a wallet extension installed. The alarm text must explain what was detected and that the fix is a clean browser profile — not imply the user has been attacked.
- **Neutering can be incomplete.** Providers can be injected in ways this guard does not anticipate, and a guard that misses is worse than none if it breeds confidence. P0.21's acceptance criteria therefore require a negative test proving the blockers survive attempts to redefine or delete them, and the guarantee is stated as best-effort defence in depth rather than a boundary.
- **This will be re-proposed**, especially as more users hold assets through browser wallets.

## Alternatives considered

**Full bridge as originally proposed** — discovery, watch-only import, chain detection, relay, with six containment rules. Fully drafted. The rules were sound: off by default, never persisted, three-method positive allowlist, untrusted display data, banner state, permanent watch-only marking. Rejected because sound containment of a low-value feature is still complexity, and because the design-commitment carve-out is a cost paid by every reader of the threat model.

**Relay only, no import or detection.** Smallest surface that still does something. Rejected because [ADR-0019](0019-no-transaction-workbench.md) rejected relay independently, leaving nothing to relay.

**A hardcoded RPC host on the CSP allowlist instead of a provider.** Keeps every egress path inside the allowlist, preserving commitment 4 literally. Rejected as worse: a permanent, non-optional egress path in the shipped artifact, forcing users onto a public RPC host chosen by us. A channel the user opts into per session, through infrastructure they already chose, is better privacy — which is an argument *for* the provider approach, and is noted here because it is the strongest thing that can be said for it.

**Neuter providers but say nothing publicly.** Rejected. [csp-policy.md](../../02-security/csp-policy.md) documents the CSP as the mechanism making leakage impossible rather than unlikely; a documented exception to that mechanism belongs in the documentation, and quietly patching it while the docs imply completeness is the kind of gap [doc-hygiene.md](../doc-hygiene.md) exists to prevent.

## What would change our mind

**On the bridge:**

- Browsers bringing extension provider calls under page CSP. Most of the objection disappears, and the channel becomes ordinary allowlisted egress.
- EIP-6963 gaining real authentication, removing the unverifiable-identity problem.
- Evidence that manual watch-only entry is causing real errors that automated import would prevent — note this argues for import specifically, not for relay or chain switching.

**On the neutering:** nothing. It closes a hole with no user-visible cost beyond a lockdown that should not occur on a clean profile. If it proves unimplementable, that is a finding requiring its own ADR, not a reason to skip it.

## References

- [EIP-6963 and EIP-1193 in standards.md](../../04-reference/standards.md)
- [csp-policy.md](../../02-security/csp-policy.md) — why the CSP does not constrain provider calls
- [threat-model.md](../../02-security/threat-model.md) — design commitment 4, unamended
- [ADR-0019](0019-no-transaction-workbench.md) — why there is nothing to relay
- [ADR-0021](0021-clipboard-address-verification.md) — the verification work that proceeded
- [ROADMAP.md](../ROADMAP.md) — P0.21
