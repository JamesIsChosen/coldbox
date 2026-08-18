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

Source assurance and network transport are separate choices. WAL.2 exposes
three transport policies:

1. **Standard network** — ordinary browser networking. Coldbox makes no Tor
   claim and does not imply that Edge, Brave, Chrome, or an ordinarily
   configured Firefox session became a Tor client.
2. **Tor environment** — the user deliberately runs Coldbox inside Tor Browser,
   Tails, or another separately configured Tor-providing environment. A normal
   HTTPS Bitcoin source may therefore traverse Tor, but Coldbox does not
   fingerprint the browser, probe for Tor, or claim that page JavaScript can
   independently prove the transport path.
3. **Tor-enforced onion source** — the selected Bitcoin source is a reviewed,
   CSP-pinned version-3 `.onion` endpoint. If that endpoint cannot be reached,
   wallet synchronization, broadcast, and monitoring fail closed. No clearnet
   alias, public provider, or alternate transport is substituted automatically.

Coldbox never presents a control that claims to *enable Tor* from ordinary
browser JavaScript. Tor transport is supplied by the execution environment.
The app controls policy: whether ordinary networking is acceptable, whether the
user is relying on an external Tor environment, or whether only a pinned onion
source is acceptable.

The finite warm-realm egress policy remains intact. WAL.2 must not add
`*.onion`, `http://*.onion`, `https://*.onion`, or another broad onion wildcard
to `connect-src`. A shipped onion source is pinned by exact reviewed host in
the same provenance/CSP mechanism as other network sources. A user-owned onion
host that is not part of the shipped allowlist requires an explicitly
reproducible custom build that pins that exact host, or a separately reviewed
local transport bridge; convenience does not override the egress boundary.

Direct Bitcoin Core RPC is supported only if WAL.2 proves a browser-safe,
credential-safe path without weakening CSP or the standalone-file model.

Source provenance, observed chain tip, selected source-assurance mode, and
selected transport policy accompany wallet sync state. The UI never collapses
"provider trust", "Tor transport", and "onion endpoint" into one generic
"private" badge.

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
- Tor Browser/Tails or another Tor-providing environment is an additional user
  dependency; Coldbox cannot honestly manufacture that transport in ordinary
  browser JavaScript.
- Exact onion pinning limits turnkey support for arbitrary user-owned onion
  hosts unless the user produces a reproducibly customized build or uses a
  separately reviewed local bridge.
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
- [Tor Project: What is Tor Browser and how does it work?](https://support.torproject.org/tor-browser/getting-started/about-tor-browser/)
- [Tor Project: What are .onion sites and onion services?](https://support.torproject.org/about-tor/onion-services/what-is-a-dot-onion/)