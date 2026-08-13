# ADR-0040: Vault recovery-share record shape

**Status:** Accepted
**Date:** 2026-08-13

## Context

P2.5 adds a second way to unlock a vault: a threshold of externally printed
SLIP-39 shares reconstructs the 32-byte vault DEK. The existing v1 format
already reserves wrapped-DEK method 3, but a reservation is not a wire
contract. The record must be deterministic to parse, must not store share
material, and must not let an unrelated but valid SLIP-39 set be mistaken for
the vault's recovery set.

Pre-P2.5 readers also need an unmistakable compatibility boundary. A reader
that does not know method 3 must refuse a recovery-enabled file instead of
silently ignoring the new record and opening only through the old credential.

## Decision

### Record and header

Recovery remains format version 1. A recovery-enabled header sets the high bit
of the uint32 field at offset 53. The other 31 bits contain the actual wrapped
record-block length. The high bit is a marker, not part of the length. It is
safe because v1 implementations already reject a wrapped block over 65535
bytes; a pre-P2.5 reader therefore refuses the marked file before it can
ignore method 3.

The wrapped block contains exactly one normal credential record and exactly
one method-3 record. The normal record is either method 1 (passphrase) or
method 2 (passphrase plus keyfile), so recovery is an additional route and
never replaces the owner's normal unlock route. A method-3-only block is
invalid.

Method 3 uses the existing per-record grammar:

```
1    Method id                 3
1    Flags                     0
2    Record length             uint16 BE; method data + 60
N    Method data               fixed binary structure below
12   Reserved nonce            all zero
48   Reserved wrapped DEK     all zero
```

The method data is versioned and has no padding or alternate encoding:

```
Offset  Size  Field
0       1     Method-data version                  1
1       1     DEK length                           32
2       2     SLIP-39 identifier                   uint16 BE, 0..32767
4       1     Extendable-backup flag                0 or 1
5       1     Iteration exponent                    0..15
6       1     Group threshold                       1..group count
7       1     Group count                           1..16
8       1     Member threshold for group 0          1..member count
9       1     Member count for group 0              1..16
...     2     One threshold/count pair per group
```

The method-data length is exactly `8 + (2 * group count)`. Each member
threshold is no greater than its member count; the pinned SLIP-39 generator's
additional rule that a one-share threshold cannot advertise multiple members
also applies. The record stores these public parameters only; it never stores
a mnemonic or other share material.

There is no SLIP-39 share passphrase. P2.5 always generates and recovers with
the empty SLIP-39 passphrase. Adding a second human secret would make an
otherwise complete printed recovery set unusable for an heir who was not
given that extra secret.

### Binding and recovery

For a normal record, compartment AES-GCM uses header bytes 0..64 as AAD. For
a recovery-enabled vault, it uses `header bytes 0..64 || exact method-3
method data` as AAD for both public and secret compartments. This binds the
record bytes to the authenticated vault ciphertext without putting share
material in the file.

On recovery, the cold realm decodes every supplied share and requires an exact
match for identifier, extendable flag, iteration exponent, group threshold,
group count, each group's member threshold/count, and each member index's
valid range. Duplicate member indices, malformed shares, and a non-empty
share passphrase all fail closed. Only then does SLIP-39 reconstruct the DEK;
the public compartment's AES-GCM tag remains the final authentication check.

Recovery shares are accepted only for an offline cold session. The normal
passphrase/keyfile route remains available online for public-only opening.
The DEK is retained only inside an offline cold session long enough to issue a
new share set and save the updated encrypted vault. Reissuing an existing set
requires an explicit replacement choice; the old set stops matching once the
new metadata is saved.

### Compatibility and rejection

The parser rejects unknown method ids, non-zero flags, malformed method data,
duplicate normal or recovery records, a missing/extra recovery marker, a
non-zero method-3 reserved tail, a method-3-only block, and all recovery
attempts that fail metadata or AEAD authentication. A reader that does not
implement this decision is not a compatible recovery reader and must refuse
the marked file.

## Alternatives considered

### Canonical JSON method data

Rejected. It adds equivalent-encoding and unknown-field parser surface to a
security boundary where the field set is small and fixed.

### No metadata binding

Rejected. A valid share set from another vault could otherwise be offered to
the parser, and a tampered metadata record would not be authenticated by the
compartment ciphertext.

### Method 3 replacing the normal record

Rejected. It removes the owner's normal unlock route and makes loss of the
external shares unnecessarily fatal.

### Share material in the vault

Rejected by the vault format and inheritance design. The share set is meant to
be distributed separately from the encrypted file.

## Consequences

The existing v1 vault reader remains unchanged for ordinary files. Recovery
files use the reserved header marker and the reserved method-3 record shape,
so future readers can reject them cleanly if they do not support this ADR.
The cold realm must carry the exact SLIP-39 implementation already pinned by
[ADR-0036](0036-slip39-cold-vendoring.md), and tests must include both an
independent Trezor vector and a byte-exact method-data fixture.

## References

- [Vault format](../../01-spec/vault-format.md)
- [Inheritance planning](../../03-guides/inheritance-planning.md)
- [ADR-0036: cold-only SLIP-39](0036-slip39-cold-vendoring.md)
