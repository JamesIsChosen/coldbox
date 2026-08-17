# ADR-0019: Rejected — transaction construction, broadcast relay, and clear signing

**Status:** Superseded in part for the Bitcoin v1 transaction lifecycle by [ADR-0051](0051-full-bitcoin-wallet-v1.md); retained as the historical rejection and for scopes ADR-0051 does not approve
**Date:** 2026-08-07

## Context

A proposal arrived to extend Coldbox toward the transaction lifecycle:

1. Construct **unsigned** payloads offline, for signing on a hardware wallet.
2. Relay **already-signed** bytes to the network, treating them as opaque.
3. Render contract calldata in human terms via [ERC-7730](../../04-reference/standards.md) clear-signing descriptors.

None of these requires Coldbox to hold a key or produce a signature, so none of them is *obviously* excluded by [ADR-0006](0006-companion-not-replacement.md). But [SPEC.md §1.3](../../01-spec/SPEC.md) states, as an explicit non-goal: *"No transaction building, signing, or broadcasting."*

The proposal was **worked up in full before being rejected** — specifications were drafted, the non-goal was amended, and constraints were designed. It is recorded here at that depth because a shallow "we decided not to" invites the same proposal in six months, and because the reasoning that killed it is not obvious.

## Decision

**All three are rejected. [SPEC.md §1.3](../../01-spec/SPEC.md)'s non-goal stands unamended.**

Coldbox does not construct transactions, does not broadcast them, and does not decode calldata. It remains a verification and record-keeping companion.

## Rationale

### The three do not stand up individually — they were propping each other up

This is what actually decided it, and it was found by reading the two draft ADRs back to back.

The draft argument for unsigned construction leaned on clear signing: constructing payloads is worthwhile *because* it gives ERC-7730 something to describe. The draft argument for clear signing leaned on construction: descriptors are worthwhile *because* Coldbox now holds calldata it assembled.

Each was justified largely by the other. Neither carried its own weight. **Mutual justification between two proposed features is a strong signal that both are unnecessary**, and it is easy to miss when the features are evaluated in separate documents.

### Stripped of that circularity, each does very little

**Unsigned construction** produces a draft the user's wallet would build anyway, for a transaction the hardware wallet screen authorises regardless. It is a redundant preview, not an independent check.

**Clear signing** is the one that collapses hardest on inspection. **Ledger already implements ERC-7730 on-device**, and Ledger operates the descriptor registry. Coldbox — which [CONTRIBUTING.md](../../../CONTRIBUTING.md) forbids from fetching anything at build or run time — could only ever use descriptors the user imported by hand, unverifiable against the registry. So it would be a *weaker copy of a check that already happens downstream in a more trustworthy place*: the device can verify a descriptor's provenance and Coldbox cannot.

**Relay** is the most defensible of the three, since signed bytes cannot be altered in transit without invalidating them. But it required an egress channel Coldbox does not otherwise need — see [ADR-0020](0020-injected-providers-rejected-and-neutered.md) — and users already broadcast successfully today via their wallet, a block explorer, or their own node.

### What construction would have cost

Chain-specific encoding correctness: nonce handling, fee fields, EIP-155 chain binding, ABI encoding. New failure surface with real money downstream, in a project that had deliberately carried none of it, and among the hardest things here to test convincingly — good vectors require independent implementations, and [CONTRIBUTING.md](../../../CONTRIBUTING.md) requires exactly that.

### The failure mode of clear signing is worse than the problem

A hostile, wrong, or merely stale descriptor makes a malicious transaction read as benign. That is worse than raw hex, because hex at least looks like something to be careful about. Constraints were drafted to contain it — always show raw bytes, verify chain/address/selector binding, label provenance, reject partial descriptors — and they were adequate. But they are three independent rules that must all hold, where dropping any one makes the feature net-negative. That is a lot of load-bearing discipline for a feature the device already performs better.

### The line that actually protects the project is scope, not capability

Each step from here is individually defensible — a fee estimator, an address book, a nonce manager, a broadcast button — and together they are a hot wallet. "No signing" would have been the only remaining line, and a single line is a thin defence against a sequence of reasonable-sounding increments.

Keeping the non-goal at "no building, signing, or broadcasting" leaves three lines instead of one.

## Consequences

### Positive

- [SPEC.md §1.3](../../01-spec/SPEC.md) stands unamended, and [threat-model.md](../../02-security/threat-model.md) design commitment 4 keeps no carve-out.
- No chain-specific transaction-encoding correctness burden, and no untrusted-descriptor parser.
- The verification work that *does* strengthen the core claim — [ADR-0021](0021-clipboard-address-verification.md) — is unentangled from any of this and proceeds on its own merits.

### Negative

- A user must leave Coldbox to broadcast. That is the status quo, but it means the final pre-broadcast review happens in software Coldbox does not vouch for. Partly answered by [ADR-0021](0021-clipboard-address-verification.md): the round-trip clipboard check covers the specific step where that software is most likely to betray them.
- Contract interactions remain unreadable in Coldbox. Mitigated by the fact that they are readable on a device that verifies descriptors properly.
- Users doing DeFi from an airgapped setup get nothing here. Real, small, and served by the device screen.

### Risks

- **This will be re-proposed.** It is a reasonable-sounding request and the individual steps look harmless. That is precisely why this ADR records the full worked-up analysis rather than a summary — a future proposer should have to engage with the circularity finding and the Ledger-already-does-it point, not rediscover them.
- **Rejecting on the strength of a competitor's implementation is a dated argument.** If Ledger's on-device ERC-7730 support regresses or stalls, the clear-signing conclusion weakens. Tracked in [standards.md](../../04-reference/standards.md), which carries a review date for exactly this kind of drift.

## Alternatives considered

**Amend the non-goal to permit construction and relay, prohibiting only signing.** This was drafted in full and nearly accepted. The amendment was coherent, and the constraints designed for it were sound. Rejected once the circular justification surfaced: the amendment was buying two features that existed mainly to justify each other, at the cost of a non-goal that had been doing real work.

**Relay only, no construction and no clear signing.** The narrowest useful version, and genuinely defensible — opaque bytes cannot be altered without invalidating them. Rejected because the benefit is convenience only (users broadcast fine today) while the cost is a permanent egress channel, either an injected provider outside the CSP or a hardcoded RPC host inside it. Neither is worth paying for a button.

**Clear signing as a standalone calldata viewer**, decoding hex the user pastes in, with no construction anywhere. Breaks the circularity cleanly and was the most attractive surviving option. Rejected on the Ledger point: an offline import-only decoder with unverifiable provenance is strictly weaker than the on-device check the same user already gets, and shipping a weaker duplicate of a security check invites people to rely on the weaker one.

**Build it and mark it experimental.** Rejected on principle. A tool handling seed phrases does not ship experimental features touching money movement, and "experimental" is a label users ignore.

## What would change our mind

- **The circularity breaking.** If a use case appears for one of these that does not depend on the others existing, that use case deserves its own evaluation on its own terms.
- **Hardware wallets failing to deliver clear signing.** If on-device ERC-7730 support stalls, an offline viewer becomes the only option rather than a weaker duplicate. That is the single most likely reason to revisit.
- **Relay becoming the only viable path** on some chain where users demonstrably cannot broadcast otherwise. Evidence, not speculation.
- Note what would **not** change our mind: user requests for convenience, or another wallet shipping the feature. Neither speaks to whether the capability belongs in a tool whose value is that it does very little, verifiably.

## References

- [SPEC.md §1.3](../../01-spec/SPEC.md) — the non-goal, unamended
- [ADR-0006](0006-companion-not-replacement.md) — companion, not replacement
- [ADR-0020](0020-injected-providers-rejected-and-neutered.md) — the egress channel relay would have required
- [ADR-0021](0021-clipboard-address-verification.md) — the verification work that proceeded instead
- [ERC-7730 in standards.md](../../04-reference/standards.md)
- [threat-model.md](../../02-security/threat-model.md) — design commitments
