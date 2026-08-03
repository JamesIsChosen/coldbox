# ADR-0005: No duress or decoy compartment

**Status:** Accepted (rejected feature)
**Date:** 2026-08-02

---

## Context

A common request for encrypted storage: a second passphrase that opens a decoy vault containing plausible-but-unimportant data. Under coercion, you hand over the decoy passphrase and the attacker believes they have everything.

VeraCrypt hidden volumes are the best-known implementation. It was considered for Coldbox and appeared in early spec drafts as a Phase 4 candidate.

## Decision

**Do not implement it.**

## Rationale

### The deniability doesn't hold against an informed adversary

Plausible deniability requires the attacker to be unable to distinguish "this is the whole vault" from "there's more." That fails when the file format is public, which it necessarily is for open-source software.

An attacker who knows Coldbox supports decoys — and they would, because it's documented and the source is on GitHub — simply doesn't believe you. The feature's existence makes *every* user a candidate for "there's another passphrase," including those who never enabled it. The feature can therefore make the threat model **worse** for people who don't use it.

The scenario it protects against is also one where the attacker can keep applying pressure. "This is the only passphrase" is not more believable because software supports decoys; it's less believable.

### It doubles the ways to lose data

Every additional passphrase is another thing to forget. Every compartment is another thing to fail to back up, another migration path, another state the code must handle correctly. For a tool whose most common real failure mode is **user error resulting in permanent loss**, adding a mechanism that multiplies that risk is a poor trade.

The realistic outcome distribution matters here. Users who forget a decoy structure and lock themselves out will vastly outnumber users saved from coercion.

### It's out of scope anyway

The threat model explicitly excludes physical coercion. Nothing else in the design defends against it, and a single partial defence against an otherwise-excluded threat gives false comfort rather than protection.

## Consequences

### Positive

- Simpler format, simpler code, fewer failure states.
- No false sense of protection against a threat the tool doesn't address.
- Users who need real deniability are pointed toward tools built for it, by people who specialise in it.
- One less thing to get wrong in the vault format.

### Negative

- Users who want it won't find it, and some will be disappointed.
- No in-tool answer to the coercion scenario.

### Mitigation

The documentation is honest about the gap. Users facing genuine coercion risk need a properly designed approach — geographic distribution of shares with custodians in different jurisdictions, timelocked multisig, or legal structures — none of which a decoy passphrase in a browser tool provides.

Notably, **SLIP-39 shares distributed across people and places** offer a stronger real answer: you genuinely cannot produce the funds alone, which is a true statement under coercion rather than a bluff.

## Alternatives considered

**Full hidden-volume style, VeraCrypt-like.** Rejected for the reasons above, plus meaningfully more format complexity.

**A "panic passphrase" that wipes the vault.** Rejected as actively dangerous. Accidental triggering is catastrophic and irreversible, and an attacker who suspects it exists has a strong incentive to image the file before asking for any passphrase — which they would.

**Hidden items with a second passphrase.** A softer version. Partially adopted — `hidden` flags exist (see [SPEC.md §10.2](../../01-spec/SPEC.md)) — but framed honestly as **shoulder-surfing protection, not coercion resistance**, and revealing them requires only the normal vault passphrase. The framing difference is the whole point: it doesn't claim to do something it can't.

## What would change our mind

Little. The core objection — that publicly-documented deniability isn't deniable — is structural rather than an implementation detail. A convincing argument would need to show either that the feature meaningfully helps in a realistic scenario without endangering non-users, or that the data-loss risk is smaller than estimated.

## References

- [threat-model.md](../../02-security/threat-model.md)
- [SPEC.md §10.2](../../01-spec/SPEC.md)
