# ADR-0054: Level 3 signing lifecycle and the signature-exfiltration boundary

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

Signing changes Coldbox's threat model.

Before signing exists, no output intentionally produced from a private key must
leave the cold realm. Once a Bitcoin wallet signs, valid signatures and final
transactions are intentionally public.

Correct signatures do not disclose the private key. A malicious signing
implementation, however, can potentially abuse nonce/signature choices as a
covert channel. The warm and cold realms of the same modified artifact are not
independent parties for preventing that class of malicious-build attack.

## Decision

v1 signing is a bounded Level 3 operation:

1. final transaction review succeeds;
2. exact approval digest is fixed;
3. user reauthenticates;
4. only the selected seed record is decrypted;
5. only required child private keys are derived;
6. the accepted standard signing algorithm is executed;
7. each produced signature is independently verified against the exact
   transaction/key before release;
8. child keys, seed plaintext, REK, DEK/KEK and secret wrapping material are
   dropped/zero-filled where the runtime permits.

The wallet does not retain a general signing key merely because it is open.

Standard deterministic/auxiliary nonce rules are followed exactly for the
supported ECDSA/Schnorr paths, with independent vectors and differential tests.

The v1 threat model explicitly does **not** claim that these measures prove a
maliciously modified signer cannot encode information into otherwise valid
signatures.

That residual is mitigated at v1 by reproducible-build verification, pinned
dependencies, a small signer TCB, independent tests and the professional audit.

An independent hardware signer/secure element and supported anti-exfiltration
protocols are post-v1 higher-assurance work under ADR-0051. Coldbox never claims
that its encrypted vault is equivalent to a secure element against host-memory
or physical-chip attacks.

## Rationale

Pretending that `connect-src 'none'` also blocks information deliberately
encoded in a valid signature would make the threat model false.

The right response is to minimize key lifetime, bind signatures to reviewed
transactions, verify the signatures, protect release provenance, and state the
remaining malicious-build risk precisely.

## Consequences

### Positive

- Signing does not turn an unlocked public session into a long-lived hot key.
- Faulty signatures are caught before broadcast.
- The security claim remains honest.
- Post-v1 hardware signing has a clear reason to exist: independent physical key
  isolation/display and potentially stronger anti-exfiltration.

### Negative

- Per-spend reauthentication costs convenience.
- JavaScript cannot guarantee complete memory erasure.
- Standalone v1 cannot offer secure-element-equivalent host-compromise
  resistance.

### Risks

- A future "remember authorization" feature could quietly recreate a resident
  signing capability.
- A malicious build remains the hardest signing-specific exfiltration case.
- Hardware integration could create new transport trust if implemented
  carelessly post-v1.

## Alternatives considered

**Claim deterministic signatures solve malicious-signer exfiltration.**
Rejected. A malicious implementation can deviate from the intended algorithm.

**Require a second hardware device for v1.** Rejected. Coldbox remains a
standalone v1 wallet; hardware is an optional post-v1 assurance layer.

**Return signing material to warm for finalization.** Rejected. Warm receives
only public finalized/signature material under finite protocol types.

## What would change our mind

A browser-available, independently controlled signing primitive with
non-exportable keys and user-presence guarantees across the supported device
matrix could strengthen standalone signing. It would still require its own ADR.

## References

- [ADR-0050](0050-level-3-secret-record-vault.md)
- [ADR-0051](0051-full-bitcoin-wallet-v1.md)
- [BIP-340 Schnorr](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [BIP-341 Taproot](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki)