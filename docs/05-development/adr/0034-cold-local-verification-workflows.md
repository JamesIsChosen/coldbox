# ADR-0034: Verification workflows stay cold-local and manual

**Status:** Accepted
**Date:** 2026-08-10

## Context

P1.9 adds the five verification workflows named by the roadmap: device
fingerprint, receive address, account xpub, metal backup, and BIP-39
passphrase. The companion is intentionally not a hardware-wallet replacement
and has no approved hardware transport or signing surface. A workflow that
sent a seed phrase or passphrase to the warm shell would violate the central
realm-boundary invariant, while a workflow that claimed device authenticity
from a manual comparison would overstate what the evidence proves.

## Decision

Implement P1.9 as a cold-local Verification Bench. The sealed frame accepts
the seed phrase, optional BIP-39 passphrase, account xpub, and manually read
device comparison value. It reuses the existing cold-only Seed Forge and
Bitcoin derivation APIs. The result stays in the cold frame and contains only
public values plus a `match`, `mismatch`, or fail-closed error state; no new
message type is added.

Secret-bearing fields are cleared after every attempt and by the existing
lock, idle, panic-hide, and cold-health teardown path. Fingerprints compare
normalized eight-character hexadecimal values. Receive addresses normalize
only Bech32 case; Base58 addresses and extended keys remain exact. The UI
requires the user to compare the complete displayed public value and states
that P1.9 has no hardware connection or authenticity claim.

## Rationale

Keeping all inputs and verdicts in the opaque frame is the smallest design
that preserves the existing message-schema guarantee: the warm realm never
sees a mnemonic, private key, xprv, passphrase, or secret-compartment
plaintext. It also permits backup and passphrase checks before a vault is
opened. Manual device entry is honest about the current scope and leaves the
physical device-screen check visible to the user instead of hiding it behind
a false integration claim.

## Consequences

### Positive

- Seed phrases and passphrases have no warm-shell or channel path.
- The five workflows share tested, cold-only BIP-39/BIP-32 primitives.
- Full public comparisons are visible and auditable in the sealed workspace.
- A lock or panic teardown clears verification inputs as well as vault state.

### Negative

- The user must read values from the device and type them manually.
- P1.9 cannot detect a compromised hardware-wallet display or prove device
  authenticity.
- P1.12 remains responsible for the later registry-linked address-verdict
  state and clipboard round trip.

### Risks

- A user can still choose the wrong network, script type, account, or path.
  The workflow labels those choices and the guide requires a complete manual
  comparison, but real-device validation remains an open human gate.
- The JavaScript UI is not a hardware transport. Adding one would require a
  separate threat-model and architecture decision, not an extension of P1.9.

## Alternatives considered

### Send secret inputs through the warm/cold message channel

Rejected. The architecture explicitly forbids secret-bearing message
payloads, and an opaque-origin iframe does not make an unsafe schema safe.

### Add WebHID, WebUSB, or vendor transport in P1.9

Rejected. It expands the attack surface and would turn a companion verifier
into a device-control surface without an independent threat model, device
matrix, or approval of supported vendors.

### Compare only address prefixes and suffixes

Rejected. Vanity-address generation makes partial comparison a weak check;
P1.9 compares the complete public value and leaves checksum-aware clipboard
round trips to P1.12.

## What would change our mind

A separately reviewed hardware-transport proposal with a device support
matrix, explicit origin and permission handling, independent test fixtures,
and a revised threat model could add a transport later. It would not weaken
the rule that seed phrases, private keys, passphrases, and decrypted secret
compartment data never leave the cold realm.

## References

- [architecture.md](../../01-spec/architecture.md) — two-realm message and
  secret-boundary contract
- [address-verification.md](../../01-spec/address-verification.md) — later
  registry-linked address verification split
- [verify-a-hardware-wallet.md](../../03-guides/verify-a-hardware-wallet.md) —
  user workflow and physical-device limits
- [ADR-0028](0028-cold-only-bip39-seed-forge.md) — cold-only BIP-39 boundary
- [ADR-0029](0029-cold-only-bitcoin-derivation-engine.md) — cold-only Bitcoin
  derivation boundary
