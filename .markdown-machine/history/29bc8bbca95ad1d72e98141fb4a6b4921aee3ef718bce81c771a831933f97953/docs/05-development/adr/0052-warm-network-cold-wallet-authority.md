# ADR-0052: Warm network worker, cold wallet authority

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

A full wallet needs network data and broadcast, but the cold realm's
`connect-src 'none'` guarantee remains one of Coldbox's strongest boundaries.

Moving Bitcoin networking into the cold realm would make every secret-handling
path network-capable. Moving signing authority into the warm realm would expose
private-key operations to the networked side.

## Decision

The two-realm architecture remains.

**Warm realm: network worker.**

Warm may query approved Bitcoin sources, maintain public wallet synchronization
state, estimate network conditions and broadcast an exact cold-approved
transaction.

**Cold realm: wallet authority.**

Cold owns authenticated wallet identity, recipient/amount confirmation,
spending UTXO validation, coin-control approval, fee arithmetic/policy, change
derivation, transaction construction, final review, Level 3 secret access and
signing.

Warm blockchain data is evidence, not authority.

Cross-realm Bitcoin messages are finite, typed and bounded. Warm cannot send a
free-form "transaction to sign" command that bypasses cold construction. The
cold-to-warm path may carry the explicitly authorized finalized Bitcoin
transaction bytes required for broadcast; it never carries seed/private-key
plaintext.

The normal send-intent and final authorization surfaces live in cold. Warm may
navigate to them and supply bounded public chain evidence.

The strongest private source is a user-owned **browser-compatible** Bitcoin
data service. Direct Bitcoin Core authenticated RPC is not assumed safe or
portable from `file://`; it must be proven before support is claimed. A
self-hosted Esplora/electrs-compatible HTTP service is an acceptable model if
its browser/CORS and CSP behavior satisfy the implementation item.

## Rationale

This retains the simple secret boundary: the side that talks to the internet
does not receive the keys that authorize money movement.

It also prevents a compromised warm component from silently changing the
recipient, change output or fee after the user reaches the cold signing flow.
At worst, malicious chain data should lead to refusal, denial of service,
staleness or visible disagreement rather than arbitrary spend authority.

## Consequences

### Positive

- Cold `connect-src 'none'` remains intact.
- Public/watch-only wallet work stays available without secrets.
- The transaction builder and signer can be audited as one bounded cold core.
- Broadcast remains easy without giving warm private-key capability.

### Negative

- More public wallet state crosses warm->cold for spending.
- The protocol schema becomes larger and must be fuzzed.
- Cold cannot independently prove global chain freshness without an external
  trusted data source, so source assurance must be stated honestly.

### Risks

- A future developer could add a generic warm->cold "sign bytes" escape hatch.
- A future developer could let warm label an output "change" without cold
  derivation.
- Browser-incompatible node integrations could tempt weakening CSP or the
  no-server portability contract.

## Alternatives considered

**Cold realm directly queries Bitcoin nodes.** Rejected. It destroys the
network-free secret realm.

**Warm builds and cold blindly signs PSBT/raw transaction.** Rejected as the
normal path. Imported PSBT remains an interoperability workflow, but must be
fully parsed/reviewed under the same cold spending rules.

**Require a local companion daemon.** Rejected as a v1 requirement. A
user-owned browser-compatible data service may be optional, but the standalone
file continues to operate with approved public sources.

## What would change our mind

A browser standard that securely provides a network-isolated signing worker with
stronger guarantees than the current sandbox could change implementation
details, but the separation of network evidence from signing authority remains.

## References

- [architecture.md](../../01-spec/architecture.md)
- [csp-policy.md](../../02-security/csp-policy.md)
- [v1 security and Bitcoin-wallet contract](../../01-spec/v1-security-wallet-contract.md)