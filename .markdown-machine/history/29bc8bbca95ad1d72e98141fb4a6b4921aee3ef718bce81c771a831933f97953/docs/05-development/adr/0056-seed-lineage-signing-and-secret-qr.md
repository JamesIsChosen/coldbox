# ADR-0056: Seed lineage, signing authority and sealed SeedQR handoff

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

Coldbox already has public Seed metadata, secret Seed material, a Device registry,
public/secret Notes, Standard/Compact SeedQR generation in the cold realm, and
Level 3 as the accepted future secret-storage model.

Users may also organize secrets as a deterministic hierarchy: one high-authority
BIP-39 root plus passphrase derives BIP-85 child mnemonics that are assigned to
different wallets/devices. The root itself may hold no funds. The useful
questions are not only "what is the phrase?" but "what is this seed for, which
parent created it, where is it loaded, what public wallet proves its identity,
and how may Coldbox use it?"

A parent xpub cannot reproduce a BIP-85 child because BIP-85 uses fully hardened
BIP-32 private derivation and transforms the derived private key into application
entropy.

Stateless and temporary hardware signers also make a secret QR a legitimate
operational handoff. Coldbox already generates SeedQR in its cold frame. The
missing piece is connecting that capability directly to a selected persisted
root/child identity without weakening the warm/cold boundary.

## Decision

A pre-wallet SEED phase makes BIP-85 parent/child lineage first-class.

A Seed has a role of independent, BIP-85 root or BIP-85 child. A child stores
the parent Seed id and exact BIP-85 application recipe/index needed to reproduce
it. The relationship is authenticated metadata; it is not inferred from labels.

### Signing authority

Each child explicitly selects one mode:

1. **external-only** — no child mnemonic is retained by Coldbox.
2. **stored-child** — the child mnemonic/passphrase is its own Level 3 secret
   record with its own REK.
3. **derive-from-root** — no child secret is persisted, but Coldbox may perform
   one explicitly authorized signing operation by opening the root just in time.

Root-derived signing is:

`exact transaction review -> user approval -> fresh root authorization -> derive selected child -> verify registered child public identity -> derive spend keys -> sign -> self-verify -> wipe`

It is higher-authority than stored-child signing and the UI says so. No root,
child mnemonic, xprv, sibling derivation or reusable signing capability survives
success, failure, panic or timeout.

### Existing child attachment

An existing child already loaded into another device can be registered without
importing its mnemonic. Coldbox opens the root for a bounded verification,
derives the exact recipe/index, derives public identity, compares fingerprint
plus stronger xpub/descriptor/address evidence, records the relationship, then
wipes the transient child.

A 32-bit master fingerprint is an identification aid, not sole cryptographic
proof.

### Seed notes

`Seed.notes` becomes explicitly **public identification context**. It is
supplemental prose, not the place to encode parent ids, indices, device
relationships or signing policy.

Sensitive passphrase/recovery clues use linked secret Note records. The future
schema removes or reclassifies the older public `passphraseHint` concept so the
UI does not encourage secret hints in metadata meant to remain readable while a
seed is sealed.

### Sealed SeedQR quick action

Any eligible stored root or child can display Standard SeedQR or Compact SeedQR
after fresh secret authorization. A derive-from-root child can display its QR
only after the root is freshly authorized, the exact child is derived and its
registered identity is verified. External-only children without an authorized
root path cannot produce secret QR material.

The UI deliberately **looks like** the established floating record menu, but
does not reuse the warm implementation. The complete action lives inside the
cold realm. No mnemonic, entropy, QR payload, QR pixels or equivalent secret
representation crosses the MessageChannel.

The action defaults to ephemeral display, with explicit plaintext-secret
acknowledgement. Existing cold-local download/print may remain secondary actions
with retention warnings. Closing, timeout, subject switch, lock, panic and realm
teardown clear QR state and transient secret buffers.

UI.6 historically forbids secret QR from the public floating component. That
remains correct. SEED.3 adds a **cold-local counterpart with the same visual
language**, not a warm exception.

A SeedQR contains the BIP-39 mnemonic/entropy only. It does not contain the
BIP-39 passphrase. Passphrase-protected records must say "mnemonic only;
passphrase not included" before reveal. Coldbox does not invent a combined
mnemonic+passphrase QR format.

Root QR reveal has a stronger warning because possession of the root plus its
passphrase can recreate all deterministic children.

## Rationale

This supports deterministic recovery, Coldbox-native signing and stateless
hardware workflows without making the root a permanent session capability.

Reusing the existing SeedQR format and cold renderer avoids inventing another
secret transport. Reusing only the **visual pattern** of the public floating menu
keeps UX consistent without violating the realm boundary.

## Consequences

### Positive

- Root and child identities remain understandable while sealed.
- Users can choose the blast-radius/signing tradeoff per child.
- Stateless/temporary signers can load a selected child directly from Coldbox
  without requiring a permanent paper SeedQR.
- Existing child wallets can be tracked without importing their mnemonic.
- Root/child QR and root-derived signing share the same bounded authorization and
  teardown discipline.

### Negative

- Showing a SeedQR on a general-purpose computer exposes the seed to that
  computer's display stack while visible.
- Root-derived signing and root QR have a larger one-operation blast radius than
  stored-child operations.
- The sealed realm needs a separate floating-action implementation rather than
  reusing the warm component.

### Risks

- Screen capture, cameras or a compromised OS can copy a displayed SeedQR.
- A user may believe a SeedQR includes their BIP-39 passphrase when it does not.
- Wrong-child selection could load a valid but unintended seed.
- A teardown bug could leave derived root/child material resident longer than
  intended.

The product warns honestly about these limits and tests subject binding,
passphrase omission and teardown.

## Alternatives considered

**Send the secret QR to the warm floating-menu component.** Rejected. That
destroys the central realm boundary.

**Require permanent paper/metal SeedQR only.** Rejected. Stateless device users
may reasonably prefer a bounded cold display from an already encrypted vault.

**Include the BIP-39 passphrase in the same QR.** Rejected for the v1 baseline.
SeedQR does not define that payload and device interoperability is not assumed.

**Prohibit root-derived signing/QR.** Rejected. Users may deliberately choose
that recovery-centric model, provided the higher authority is explicit and
bounded.

## References

- [ADR-0032](0032-notes-tags-and-concealment.md)
- [ADR-0045](0045-released-secret-model.md)
- [ADR-0050](0050-level-3-secret-record-vault.md)
- [ADR-0054](0054-signing-lifecycle-and-exfiltration-boundary.md)
- [P1.10 QR packet](../packets/p1.10-qr-generation.md)
- [v1 security/wallet contract](../../01-spec/v1-security-wallet-contract.md)
