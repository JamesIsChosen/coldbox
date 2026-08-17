# ADR-0055: Bitcoin chain-state trust, privacy, and local spend conflicts

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

A browser wallet needs external facts: transactions, UTXOs, chain tip,
mempool state, fees and confirmation changes.

Public APIs can be stale, unavailable, contradictory or malicious. Querying
multiple providers improves cross-checking but worsens privacy by revealing the
same wallet interest to more operators. A `file://` application also cannot
assume that authenticated Bitcoin Core RPC is directly browser/CORS safe.

## Decision

Coldbox exposes explicit Bitcoin source-assurance modes.

1. **User-owned browser-compatible source** — preferred High Assurance path,
   such as a self-hosted Esplora/electrs-compatible HTTP service configured for
   browser access.
2. **Cross-checked public sources** — stronger disagreement detection, with a
   clear privacy cost.
3. **Single public source** — usable, but labeled as provider-trusted chain
   state rather than independently verified truth.

Direct Bitcoin Core RPC is supported only if WAL.2 proves a browser-safe,
credential-safe path without weakening CSP or the standalone-file model.

Source provenance and observed chain tip accompany wallet sync state.

For spending:

- cold verifies wallet ownership and exact previous-output data it can validate;
- contradictory material source data causes spending to fail closed until
  resolved;
- public source claims never decide recipient/change/fee policy;
- pending locally signed spends reserve their inputs;
- dropped/replaced/conflicted/reorg states follow explicit transitions rather
  than silently restoring spendability;
- rollback claims distinguish local advisory history from externally anchored
  freshness.

Privacy is a first-class control. Automatic synchronization does not hand an
xpub to a third party merely for convenience. Public address/script queries are
derived locally, and the UI explains what each source learns.

## Rationale

A full wallet cannot eliminate external chain trust without becoming a full
node/SPV implementation. It can, however, keep that trust from becoming spend
authority.

Separating source modes lets users choose privacy/integrity tradeoffs knowingly.
A user-owned HTTP indexer fits the browser transport model better than assuming
raw node RPC is safe from a local HTML origin.

## Consequences

### Positive

- Source disagreement becomes visible and actionable.
- A malicious provider should cause denial/staleness rather than arbitrary
  signing authority.
- High Assurance users can keep wallet queries on infrastructure they own.
- Privacy costs of cross-checking are explicit.

### Negative

- Public-provider mode still leaks wallet-query interest.
- Running a private browser-compatible source is extra operational work.
- Network truth cannot be proven from warm data alone.

### Risks

- Overstating "own node" while actually trusting a remote indexer.
- Silently querying multiple providers and multiplying privacy exposure.
- Reorg/conflict bugs incorrectly releasing reserved UTXOs.

## Alternatives considered

**Always query every provider.** Rejected. Integrity improves at the direct cost
of privacy.

**Trust one public explorer as canonical.** Rejected as a security claim.
Allowed only as an explicitly provider-trusted operating mode.

**Cold runs its own network/SPV client.** Rejected for v1 because it would put
network capability in the secret realm or add a large new consensus/networking
TCB.

## What would change our mind

A future light-client design that can verify sufficient Bitcoin chain state in
a separate non-secret component without weakening portability may deserve its
own phase/ADR.

## References

- [api-sources.md](../../04-reference/api-sources.md)
- [ADR-0052](0052-warm-network-cold-wallet-authority.md)
- [v1 security and Bitcoin-wallet contract](../../01-spec/v1-security-wallet-contract.md)