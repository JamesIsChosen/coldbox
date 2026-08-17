# ADR-0050: Level 3 secret-record vault and bounded secret operations

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

The current offline session can retain secret working data and ADR-0045's
released-secret registry can hold one or more secret values for the lifetime of
the session. That is incompatible with the maintainer-selected Level 3 goal:
opening the public wallet must not leave plaintext seeds or a universal
secret-decryption capability resident merely for convenience.

A per-record scheme alone is insufficient if the session keeps a root key that
can decrypt every record.

## Decision

SEC.1 introduces `.cbx` format v2 and a strict bounded secret-operation model.

- Sensitive values are separate encrypted records.
- Each sensitive record has a random 256-bit REK.
- Record encryption authenticates vault id, record id, record type and record
  version as AAD.
- The encrypted record envelopes live inside an encrypted/padded outer secret
  store so an observer comparing vault versions does not directly learn which
  inner record changed.
- The public-compartment key may remain resident for normal wallet work.
- DEK, secret-store/wrap keys, target REK and target plaintext are transient.
- A later secret operation reacquires authorization. Method-2 vaults reacquire
  the keyfile rather than retaining it as a universal session secret.
- Recovery shares reconstruct the DEK only for a bounded recovery operation and
  do not become a daily resident signing capability.

The focused-secret UI survives as a sealed-record reference plus public
fingerprint/label. It no longer means that the plaintext secret is resident.

A v1 reader refuses v2. Migration is explicit: the original v1 file remains
untouched until a new v2 file has been written and verify-after-save succeeds.

## Rationale

The useful boundary is not "we encrypted each record." It is "the capability to
decrypt all records is absent when no secret operation is active."

An outer encrypted store preserves more of v1's file-privacy property than a
flat visible array of independently encrypted records, because visible record
ciphertexts would expose record count/type/size and which record changed across
saved versions.

## Consequences

### Positive

- Idle wallet operation has a much smaller memory blast radius.
- Signing can open only the seed it needs and immediately reseal it.
- Secret notes, backup share material and private keys do not need to coexist in
  plaintext.
- The public/watch-only wallet stays usable without secret plaintext.

### Negative

- Secret operations require reauthentication.
- Method-2 users may need to reselect the keyfile for a secret action.
- Format v2 and migration materially increase implementation/test scope.
- JavaScript memory cannot be proven wiped; zeroization remains best-effort.

### Risks

- A broad internal helper could accidentally reintroduce a universal
  secret-decryption capability.
- Secret labels/types placed outside the outer encrypted store could create new
  metadata leakage.
- Migration failure could destroy a user's only copy unless the original is
  preserved until verified completion.

## Alternatives considered

**Keep ADR-0045's session plaintext registry.** Rejected. Convenient, but it is
the exact memory-residency behavior Level 3 is intended to remove.

**Per-record encryption with one resident secret-wrap key.** Rejected. It limits
plaintext exposure but leaves a session-wide capability to decrypt every secret.

**Short secret-auth window.** Not the v1 default. It can be reconsidered only as
an explicitly reduced-hardening mode with a clearly bounded lifetime.

## What would change our mind

A browser platform primitive that provides stronger non-exportable,
user-presence-gated secret capabilities across all supported `file://`
environments could justify a different implementation while keeping the same
Level 3 invariant.

## References

- [v1 security and Bitcoin-wallet contract](../../01-spec/v1-security-wallet-contract.md)
- [vault-format.md](../../01-spec/vault-format.md)
- [ADR-0045](0045-released-secret-model.md)