# ADR-0025: Vault identity is portable and random; names/library/save UX stay in the warm shell

**Status:** Accepted
**Date:** 2026-08-08

## Context

P0.19 Windows testing exposed a coherent vault-UX failure rather than one broken button: creation asked for an unlock phrase only once; the save actions were not discoverable enough for the tester to know a `.cbx` had not yet been written; locking correctly zeroized the cold working bytes, leaving no loaded bytes to unlock; there was no useful vault name; and the one-file picker/global `coldbox-vault-0047.cbx` counter did not scale to several vaults.

The redesign must preserve the existing security boundary: passphrases stay cold, arbitrary free-form Cold → Warm strings stay forbidden, and only encrypted `.cbx` bytes cross for storage.

## Decision

1. **New-vault creation is distinct from unlock.** Creation asks for `new unlock phrase` + `confirm unlock phrase` inside the cold realm and refuses a mismatch. Existing-vault unlock asks once.
2. **Vault name is public warm-shell metadata.** The user chooses it before creation; the UI states that it becomes visible in filenames/library and must not contain secrets. It does not cross cold → warm as free-form text.
3. Every new vault gets a CSPRNG **UUID Vault ID** generated inside the cold realm and stored as the authenticated public-compartment `id`. The current public projection already permits UUID `id`; no free-form field or new secret-carrying message type is required.
4. **A device/browser fingerprint is not a Vault ID.** One device may hold several vaults, a vault must retain identity when copied to another device, fingerprints are unstable/spoofable, and deriving identity from device characteristics would create unnecessary cross-vault/device linkability.
5. Filenames become `<public-name>--<id8>--<generation>.cbx`; generation/high-water bookkeeping remains advisory in the warm shell but is namespaced per full Vault ID. The short suffix is a hint only and must be checked against the authenticated full ID after unlock.
6. Existing v1 vaults remain valid. If no public `id` exists, warm-shell bookkeeping uses the already-public random header KDF salt as a legacy namespace; old `coldbox-vault-0047.cbx` names remain loadable. No byte-layout version bump occurs.
7. **Vault Library access is user-granted.** Chromium may use `showDirectoryPicker()` to enumerate `.cbx` files within an explicitly selected folder; the portable fallback is a multi-file picker. Coldbox never claims it can silently scan the device. The user selects a vault before entering its one unlock phrase.
8. **Save is first-class.** After creation the UI says `UNLOCKED · NOT SAVED` and presents a prominent `Save vault` action. Saving requests only encrypted bytes from cold. File System Access retains verify-after-save; download/manual remain honestly unverified until reopened/verified.
9. Normal warm-shell Lock warns on known unsaved/dirty state and offers Save first / Lock without saving / Cancel. Emergency paths (panic, timeout, network-mode transition, health/isolation failure) lock immediately. A cold-realm emergency lock control may remain, but must state that it does not save. All lock paths preserve zeroization.

## Rationale

Vault identity and device identity are different concepts. A random vault-scoped UUID is portable, collision-resistant, non-secret, and already representable by the strict public schema. Keeping the human name in the warm shell avoids weakening the no-free-form Cold → Warm invariant.

The save redesign does not trade away zeroization: warm receives the same authenticated ciphertext it already receives for storage, while cold still destroys passphrase/session keys/plaintext/working bytes on lock. The real defect was discoverability and lifecycle communication.

## Consequences

- Users can manage several named vaults and see which file is active before entering a passphrase.
- Vault names and generated filenames are public metadata; cloud/filesystem observers can see them.
- Filename grouping and rollback checks remain advisory until the vault opens and its authenticated ID is known.
- ADR-0013 remains authoritative about warm-shell save-integrity location, amended only from one global generation record to per-vault namespaces.
- Historical v1 vaults/files need no migration to open.

## Alternatives considered

**Device fingerprint as Vault ID.** Rejected for collision/linkability/instability/portability reasons above.

**Put the free-form vault name in `vault.opened`.** Rejected because a user could accidentally type a secret into the name; arbitrary prose from cold to warm is intentionally impossible to classify as safe.

**Auto-save immediately on Create.** Rejected as a universal contract because save capability/permissions differ by browser and automatic writes can hide where the only copy went. The UI instead makes the unsaved state impossible to miss and makes Save the next primary action.

**Retain encrypted working bytes through Lock so Unlock can be clicked immediately.** Rejected. It weakens the established teardown/zeroization model and hides the fact that an unsaved vault has no durable copy. Re-load the saved `.cbx` instead.
