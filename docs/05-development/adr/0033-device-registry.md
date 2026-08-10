# ADR-0033: Device records are public companion metadata

**Status:** Accepted
**Date:** 2026-08-10

## Context

P1.8 needs a durable place to record the hardware wallets that surround a
Coldbox vault: what each device is, where it is, whether its tamper check and
PIN setup were recorded, which public seed fingerprints it is associated with,
and whether it is in use, retired, lost, destroyed, or in RMA. The companion
must remain useful while the vault is unlocked without becoming a hardware
wallet transport, signing surface, or accidental secret store.

The canonical field set is the public `Device` entity in
[data-model.md](../../01-spec/data-model.md). Its `passphraseUsed` field is a
boolean fact about a device configuration; it is not a passphrase field and
must never carry phrase text.

## Decision

Add `devices` to the closed public registry collection set. Device records use
the bounded fields and lifecycle enum defined by the data model, receive UUIDs
from the existing `crypto.getRandomValues` registry path, and persist through
the existing complete `publicData.replace` / `publicData.updated` mutation
boundary. The warm shell may create, edit, search, and soft-hide these records
only while the vault is unlocked.

The Devices page records public metadata only. It does not connect to a device,
read a device screen, derive a key, sign, import a seed, or accept a mnemonic,
private key, xprv, or passphrase. Seed fingerprints are public identifiers and
are validated as bounded fingerprint strings. Unknown fields and secret-shaped
text fail closed at the protocol boundary.

Hidden device records remain in the public compartment and are excluded from
the default list and search. The existing session-scoped cold re-authentication
flow controls reveal, and locking clears the reveal state and form state.

## Rationale

Device ownership, lifecycle, and backup context are useful public metadata and
belong beside Wallet, Account, and Address records. Keeping the fields closed
and typed makes the boundary auditable: a later developer must deliberately
extend the schema rather than smuggling a new free-form field across realms.
Keeping hardware transport out of this item preserves the companion-not-
replacement decision and leaves verification workflows to P1.9.

## Consequences

### Positive

- Device inventory survives in the authenticated public compartment.
- The UI can track lifecycle and physical location without requiring a device
  connection or exposing secret material.
- The same projection, relationship, soft-hide, secure-randomness, and lock
  teardown rules apply to every public registry collection.

### Negative

- A user must type device metadata; P1.8 does not discover firmware, serial
  numbers, or fingerprints from hardware.
- The public companion cannot prove that a recorded device or fingerprint is
  genuine; P1.9 verification workflows provide the later cold/hardware checks.

### Risks

- Public labels and notes can still be sensitive by human choice. The UI warns
  that device records are public, and the schema rejects secret-shaped text but
  cannot classify arbitrary prose.
- `passphraseUsed` can tell an observer that a device configuration used a
  BIP-39 passphrase, but it contains no phrase or hint. Users should decide
  whether that metadata belongs in their public compartment.

## Alternatives considered

### Store devices in a secret compartment

Rejected. Inventory and lifecycle views are public companion metadata, and
placing them in the secret compartment would make ordinary tracking require
secret unlock while adding no protection for the actual device keys.

### Connect to hardware during device-record editing

Rejected for P1.8. Transport and verification introduce a separate trust and
browser-compatibility surface; the companion must never imply that a recorded
device has been verified merely because it was listed.

### Accept arbitrary custom fields

Rejected. An open text carrier would make the public projection impossible to
audit and could carry secret material across the realm boundary. New fields
must be added to the canonical model and closed protocol schema first.

## What would change our mind

A separately specified, independently tested hardware-transport boundary could
add read-only verification workflows if it preserves the cold-only derivation
and signing exclusions, keeps device records public-only, and proves that no
secret-bearing message is introduced. That decision belongs to the verification
and hardware-wallet roadmap items, not this registry item.

## References

- [Public data model](../../01-spec/data-model.md#device)
- [Two-realm architecture](../../01-spec/architecture.md)
- [Public registry mutation boundary](0031-public-registry-mutation-boundary.md)
- [Companion-not-replacement decision](0006-companion-not-replacement.md)
- [Threat model](../../02-security/threat-model.md)
