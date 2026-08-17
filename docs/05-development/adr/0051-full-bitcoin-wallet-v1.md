# ADR-0051: Coldbox v1 becomes a full single-signature Bitcoin wallet

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

ADR-0006 permanently rejected signing and ADR-0019 later rejected transaction
construction and broadcast. Those decisions successfully protected scope while
the vault, realm boundary, backup and verification foundations were immature.

The product now has a stronger cold/warm boundary, reproducible build pipeline,
cold derivation, vault storage, backup/recovery systems, and a planned Level 3
secret model. The maintainer has explicitly chosen a different v1 product
direction: Coldbox should be a real Bitcoin wallet, not only a companion or
PSBT signer.

## Decision

For v1, Coldbox implements the complete **single-signature Bitcoin wallet
lifecycle**:

- discover wallet coins and transaction history;
- manage/freeze/label/select UTXOs;
- receive;
- estimate and enforce fees;
- construct authoritative transactions;
- review exact transaction intent;
- Level 3 sign;
- broadcast;
- monitor mempool/confirmation/reorg/conflict state;
- RBF and CPFP;
- bounded PSBT v0/v2 interoperability;
- watch-only operation.

Bitcoin v1 is deliberately narrower than "sign every chain":

- Bitcoin only for spending;
- single-signature spending for v1;
- supported script/signature families are finite and test-vector-backed;
- unsupported/ambiguous spend types fail closed.

Multisig signing and hardware-signer integration are explicit post-v1 work.

This supersedes ADR-0006's permanent no-signing direction and ADR-0019's
Bitcoin construction/broadcast rejection **for the v1 roadmap**. The current
pre-WAL implementation still signs and broadcasts nothing until the new roadmap
items ship.

The rejection of injected EVM wallet providers and arbitrary smart-contract
clear-signing remains intact.

## Rationale

A narrow signer would make users leave Coldbox for coin discovery, selection,
fee decisions and broadcast. Those steps are themselves security-sensitive:
wrong UTXO ownership, malicious change, privacy-damaging coin selection or an
absurd fee can lose value even if the signature primitive is perfect.

Owning the complete Bitcoin lifecycle lets Coldbox apply one coherent policy
from authenticated wallet identity through post-broadcast reconciliation.

Bitcoin-only singlesig keeps the first spending release reviewable. Multisig,
hardware transports and arbitrary smart-contract semantics each introduce
separate trust and interoperability problems and therefore sit beyond v1.

## Consequences

### Positive

- Coldbox becomes a true Bitcoin wallet.
- Watch-only and seed-backed modes share one public wallet engine.
- Coin control, privacy and transaction verification become first-class rather
  than external assumptions.
- The professional v1 audit can examine one complete money-movement path.

### Negative

- The code that can cause financial loss expands substantially.
- Wallet synchronization, reorgs, fee estimation and transaction policy become
  long-lived correctness obligations.
- Signing creates an intentional public output derived using a private key, so
  the old "cold code has no possible egress" claim needs refinement.

### Risks

- Scope creep toward non-Bitcoin signing before the Bitcoin wallet is mature.
- Treating third-party chain data as authoritative.
- Transaction-decoding/UI bugs causing the user to approve something different
  from what is signed.
- Reusing "experimental" as an excuse to ship an incompletely understood spend
  path. Spending features do not ship experimental.

## Alternatives considered

**PSBT signer only.** Rejected by maintainer direction. It leaves most wallet
security decisions to unrelated software.

**Full multi-chain wallet in v1.** Rejected. Smart-contract semantics and
chain-specific transaction rules would make the first audit scope unreasonably
broad.

**Hardware signer required for v1.** Rejected. Coldbox remains a complete
standalone wallet. Hardware signing is an optional post-v1 high-assurance layer.

## What would change our mind

Evidence that the browser execution model cannot safely meet the bounded
transaction/signing requirements on the supported device matrix would force a
scope reduction before release, not a silent weakening of the security claims.

## References

- [v1 security and Bitcoin-wallet contract](../../01-spec/v1-security-wallet-contract.md)
- [ADR-0006](0006-companion-not-replacement.md)
- [ADR-0019](0019-no-transaction-workbench.md)