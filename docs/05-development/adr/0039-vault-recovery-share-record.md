# ADR-0039: Vault recovery-share record shape (decision required)

**Status:** Proposed
**Date:** 2026-08-12

## Context

P2.5 adds the Phase 2 vault-recovery route. The existing vault-format
specification reserves wrapped-DEK method 3 and says that the DEK is split
with SLIP-39, that the record stores group configuration and share metadata,
and that it never stores share material. The inheritance guide further says
that recovery shares are a second route: a threshold reconstructs the vault
key without the normal unlock phrase.

That is enough to establish the security goal, but not enough to implement a
wire-compatible method-3 record safely. The current parser accepts a list of
records and the current unlock code knows only methods 1 and 2. A P2.5 change
must settle the record bytes, the relationship between method 3 and the
existing passphrase/keyfile route, and the exact metadata used to reject a
valid but unrelated SLIP-39 set before any DEK is accepted.

This is a vault-format and secret-unlock boundary. Guessing would create a
format that could permanently strand a vault or accept the wrong recovery
material.

## Decision

No implementation decision is accepted by this proposal. P2.5 is blocked
until the maintainer accepts one concrete method-3 wire shape and its
compatibility rules.

## Questions that must be settled

1. **Record encoding.** Should method-specific data be a fixed binary
   structure, or canonical UTF-8 JSON inside the existing `uint16` record
   length? The choice must define a version byte, bounds, endianness, and
   rejection rules for every field.
2. **Unlock-route composition.** Does a recovery-share record coexist with
   method 1 or method 2 as an alternative route, or can it replace the normal
   credential record? The inheritance guide describes it as a second route;
   this must be made normative, including keyfile-enabled vaults.
3. **Binding metadata.** The method-3 record must bind the expected SLIP-39
   identifier, extendable-backup flag, group threshold, and every group
   threshold/count needed to reject a different valid share set. The accepted
   representation and maximum group count must be explicit.
4. **Secret length and passphrase.** The record must bind the 32-byte DEK
   length and state whether a SLIP-39 share passphrase is prohibited, fixed,
   or separately supplied. Silently introducing a second secret would make a
   recovery route unusable for heirs who were not given it.
5. **Compatibility behavior.** The specification must state how an older
   format-v1 reader handles method 3, whether a method-3-only vault is
   permitted, and how malformed/unknown method-3 records fail closed.
6. **Independent vectors.** The implementation needs an official SLIP-39
   vector for the record-binding/recovery path plus a deterministic method-3
   parse/serialize fixture. Round-trip-only tests are not sufficient.

## Recommended direction for review

The narrowest design to review is:

- add method 3 as an additional record alongside exactly one existing
  passphrase or passphrase-plus-keyfile record;
- use a versioned fixed binary method-data structure containing the expected
  32-byte secret length, SLIP-39 identifier, extendable flag, group threshold,
  group count, and bounded group threshold/count pairs;
- generate the external SLIP-39 shares from the DEK with no share-passphrase
  extension, so the printed threshold itself is the recovery authority;
- on recovery, decode all supplied shares, require an exact match with the
  stored public metadata, reconstruct the DEK, and then authenticate the
  public compartment before opening a session;
- keep the existing format version, because method 3 was reserved in v1, but
  specify that unsupported or malformed method-3 records fail closed and are
  never silently ignored when no other route succeeds.

This is a recommendation, not an authorization to implement. In particular,
the binary field layout and the coexistence rule need an explicit maintainer
decision before code or vectors are written.

## Alternatives considered

### Canonical JSON method data

It would be easy to inspect and extend, but it introduces more parser surface,
multiple equivalent encodings unless canonicalization is specified, and a
larger ambiguity around unknown fields. It remains viable only with a strict
canonical serializer and byte-for-byte fixture.

### No binding metadata

Rejected as unsafe. Any valid SLIP-39 set could then be offered to the vault,
and the first set that reconstructed a 32-byte value would be tried against
the public ciphertext. That is an avoidable confusion and recovery-integrity
risk.

### Replace the passphrase record with method 3

Rejected by the current inheritance wording unless the maintainer explicitly
changes the product promise. It removes the normal owner unlock route and
would make loss of the shares a permanent loss even when the passphrase is
known.

### Include share material in the vault record

Rejected by `vault-format.md`. It defeats distributed recovery and would put
the very secret intended for physical separation in the encrypted file's
metadata structure.

## What would change our mind

An accepted amendment to `vault-format.md` or a maintainer decision that
answers all six questions above, with an independent SLIP-39 fixture, would
clear this stop. The P2.5 implementation packet must quote that decision and
test the exact bytes before changing `src/cold/vault.js`.

## References

- [Vault format — wrapped-DEK method 3](../../01-spec/vault-format.md)
- [Data model — BackupRecord](../../01-spec/data-model.md)
- [Inheritance planning — vault recovery shares](../../03-guides/inheritance-planning.md)
- [ADR-0036 — cold-only SLIP-39](0036-slip39-cold-vendoring.md)
- [Batch-run stop conditions](../batch-run.md)
