# ADR-0057: Structured public wallet/account/address identity graph

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

The current public model already has Seed, Wallet, Account, Address and Device
records. Address records have labels, notes, tags, account ids, derivation
indices, verification state and balance snapshots.

That is enough to store information, but it still encourages users to put
important identity facts into prose: "this is my exchange deposit address,"
"this address comes from child 3 on device X," or "this is the savings receive
address."

The same problem existed for seeds. Notes should provide human context, not be
the only place to encode relationships Coldbox can know and validate.

## Decision

The v1 public model becomes an identity graph.

### Structured address identity

Address keeps label/tags/optional notes and gains a bounded `purpose` plus a
finite `role`:

- receive;
- change;
- deposit;
- withdrawal/payout;
- donation;
- service/custodial; or
- other.

The exact display copy can be friendlier, but persisted values are finite and
versioned.

An address view resolves, rather than duplicates:

- asset/network from Account/Wallet;
- Wallet and Account identity;
- derivation path/index, or manual/imported origin;
- linked Seed identity through Wallet, including BIP-85 parent/child lineage;
- linked Device records through Wallet/Seed;
- verification state and the xpub/descriptor/public basis it was checked
  against;
- used/reuse state;
- balance snapshot amount/source/age;
- tags and optional notes.

Watch-only, custodial and manually entered addresses are valid without any seed
or device relationship. The UI says that explicitly.

### Notes stay supplemental

A note can say "payroll," "do not reuse after 2026," or other context. It does
not become the canonical store for wallet id, child index, derivation path,
hardware model, verification basis or address role.

### Public QR is bound to structured identity

The existing public floating record menu remains the public address QR/copy
surface. When it shows a QR, the panel also shows the selected record's structured
identity so the user can see exactly which wallet/account/purpose the QR belongs
to.

No public QR gains secret data.

### Public wallet identity export

Applicable Account/Wallet records retain verified key-origin data, xpub and
descriptor. Export is available while every seed remains sealed and includes an
explicit privacy warning: public extended keys/descriptors cannot spend, but can
reveal wallet addresses and transaction history.

Bitcoin descriptor exports include origin fingerprint/path and are tested
against an independent parser.

BIP-329 remains the interoperability format for human labels. It does not replace
the richer native identity graph; native `.cbx` preserves all structured fields.

### Conflict handling

A verified relationship cannot be silently replaced by a new xpub, descriptor,
seed link or address ownership claim. Changes that invalidate prior verification
move the affected records to stale/conflict state until explicitly reconciled.

## Rationale

Users should be able to navigate:

`root seed -> child seed -> wallet -> account -> address -> UTXO/transaction`

and back again without opening a secret and without interpreting free-form text.

Structured links also prepare the same records for later hardware signer
integration: the hardware Device can attach to the Seed/Wallet while every
address automatically inherits that relationship for display.

## Consequences

### Positive

- Address purpose is obvious without reading notes.
- Seed/device/wallet/account/address relationships remain consistent.
- Public QR actions are visibly bound to the exact record selected.
- Watch-only and custodial records fit the same model without fake seed links.
- Labels remain portable through BIP-329 while richer native metadata stays in
  `.cbx`.

### Negative

- Public vault metadata becomes richer and therefore more revealing after the
  public compartment is decrypted.
- Migration and conflict handling become more complex.
- Some current free-form notes may need optional user-assisted promotion into
  structured fields; Coldbox must not guess their meaning automatically.

### Risks

- Overly broad role enums can become misleading; unknown cases must use `other`
  rather than being forced into the wrong category.
- Stale relationship caches could display an old device/seed association.
- Rich public metadata can reveal wallet organization to anyone who can unlock
  the public compartment.

## Alternatives considered

**Keep label + notes only.** Rejected. It cannot enforce or validate relationships.

**Copy seed/device information into each Address record.** Rejected. Duplicated
metadata drifts. Address views resolve relationships by id.

**Require every Address to have a seed.** Rejected. Watch-only, custodial and
manual address records are legitimate.

## References

- [current data model](../../01-spec/data-model.md)
- [ADR-0032](0032-notes-tags-and-concealment.md)
- [ADR-0033](0033-device-registry.md)
- [ADR-0056](0056-seed-lineage-signing-and-secret-qr.md)
- [v1 security/wallet contract](../../01-spec/v1-security-wallet-contract.md)
