# ADR-0025: Vault identity is portable and random; names/library/save UX stay in the warm shell

**Status:** Accepted · save/QR portions amended by [ADR-0026](0026-canonical-vault-save-and-live-transfer.md) · creation-path naming amended by [ADR-0046](0046-vault-name-availability-at-unlock.md)
**Date:** 2026-08-08

> **Title notice, added when [ADR-0046](0046-vault-name-availability-at-unlock.md) was accepted.** The title above is preserved as written, but the word **names** in it no longer holds. Vault naming is cold-owned under ADR-0046: the name is typed inside the sealed realm and stored in the encrypted public compartment. Only *library* and *save UX* still stay in the warm shell. Every clause below that still asserts the warm-owned or filename-visible name model carries an inline amendment, reversal or retirement marker at the clause itself, so a reader who lands mid-document is not misled by a header they may never scroll back to.

## Context

P0.19 Windows testing exposed a coherent vault-UX failure rather than one broken button: creation asked for an unlock phrase only once; the save actions were not discoverable enough for the tester to know a `.cbx` had not yet been written; locking correctly zeroized the cold working bytes, leaving no loaded bytes to unlock; there was no useful vault name; and the one-file picker/global `coldbox-vault-0047.cbx` counter did not scale to several vaults.

The redesign must preserve the existing security boundary: passphrases stay cold, arbitrary free-form Cold → Warm strings stay forbidden, and only encrypted `.cbx` bytes cross for storage.

## Decision

1. **New-vault creation is distinct from unlock.** Creation asks for `new unlock phrase` + `confirm unlock phrase` inside the cold realm and refuses a mismatch. Existing-vault unlock asks once.
2. **Vault name is public warm-shell metadata.** The user chooses it before creation; the UI states that it becomes visible in filenames/library and must not contain secrets. It does not cross cold → warm as free-form text.
   - Warm uses the strict payload-free `vault.create.prepare {}` message only to gate the cold creation UI. The protocol rejects any fields on this message, so neither the name nor any secret/free-form value can hitch a ride across the realm boundary.
   - **Amended by [ADR-0046](0046-vault-name-availability-at-unlock.md):** the name is no longer warm-shell metadata and is no longer chosen before creation. It is entered inside the sealed realm and stored in the encrypted public compartment, and it never appears in a filename or the library. The clause that survives, and is strengthened rather than relaxed, is the last sentence: **it does not cross cold → warm.** Under ADR-0046 nothing on the warm side wants it, so that no longer depends on a filter. `vault.create.prepare {}` stays payload-free and unchanged.
3. Every new vault gets a CSPRNG **UUID Vault ID** generated inside the cold realm and stored as the authenticated public-compartment `id`. The current public projection already permits UUID `id`; no free-form field or new secret-carrying message type is required.
4. **A device/browser fingerprint is not a Vault ID.** One device may hold several vaults, a vault must retain identity when copied to another device, fingerprints are unstable/spoofable, and deriving identity from device characteristics would create unnecessary cross-vault/device linkability.
5. **Amended by ADR-0026:** the Vault ID remains immutable, but current filenames are one canonical `<public-name>--<id8>.cbx` rather than visible generations. Historical generation names remain readable. A different Vault ID cannot claim an already-known public name in the app-visible scope.
   - **Further amended by [ADR-0046](0046-vault-name-availability-at-unlock.md):** the canonical filename carries no public name and becomes `coldbox--<id8>.cbx`. The public-name-reuse clause is retired with ADR-0026 §37 rather than reinterpreted — see that clause for why it is no longer needed. Vault ID immutability and historical-name readability are unchanged.
6. Existing v1 vaults remain valid. If no public `id` exists, warm-shell bookkeeping uses the already-public random header KDF salt as a legacy namespace; old `coldbox-vault-0047.cbx` names remain loadable. No byte-layout version bump occurs.
7. **Vault Library access is user-granted.** Chromium may use `showDirectoryPicker()` to enumerate `.cbx` files within an explicitly selected folder; the portable fallback is a multi-file picker. Coldbox never claims it can silently scan the device. The user selects a vault before entering its one unlock phrase.
8. **Save is first-class.** After creation the UI says `UNLOCKED · NOT SAVED` and presents a prominent `Save vault` action. Saving requests only encrypted bytes from cold. **ADR-0026 amendment:** File System Access writes/updates the one canonical file and can become `Saved · verified`; a canonical download is `Saved · unverified`; advanced Base64 and live QR transfer are transports and do not count as saves.
9. Every visible **normal** lock action uses one gate. Warm-shell Lock warns on unsaved or saved-but-unverified state. A truly unsaved vault offers Save first / Lock without saving / Cancel; under ADR-0026, a Saved · unverified unchanged vault cannot create a duplicate save, so that state offers Lock anyway / Cancel and directs the user to reopen the downloaded `.cbx` for verification. The visible cold-realm control sends strict payload-free `vault.lockRequest {}` to warm and therefore cannot bypass that warning. Emergency paths (panic, timeout, network-mode transition, health/isolation failure) remain separate and lock immediately. All lock paths preserve zeroization.

## Rationale

Vault identity and device identity are different concepts. A random vault-scoped UUID is portable, collision-resistant, non-secret, and already representable by the strict public schema. Keeping the human name in the warm shell avoids weakening the no-free-form Cold → Warm invariant.

> **Amended by [ADR-0046](0046-vault-name-availability-at-unlock.md).** The last sentence above states the reasoning as it stood in August 2026 and is preserved for that record, but it is **no longer the live rationale**. The human name is not kept in the warm shell at all: it is typed inside the sealed realm and stored in the encrypted public compartment, and it never crosses cold → warm in any message or any form. The invariant that sentence was protecting is not weakened by that move — it is **strengthened**, because nothing on the warm side wants the name any more, so the invariant stops depending on where the name happens to be kept and becomes trivially true. The first two sentences of this paragraph — vault identity versus device identity, and the UUID's properties — are unchanged and remain live.

The save redesign does not trade away zeroization: warm receives the same authenticated ciphertext it already receives for storage, while cold still destroys passphrase/session keys/plaintext/working bytes on lock. The real defect was discoverability and lifecycle communication.

## Consequences

- Users can manage several named vaults and see which file is active before entering a passphrase. **Amended by [ADR-0046](0046-vault-name-availability-at-unlock.md):** several vaults can still be managed and the active file is still identifiable before unlock, but **not by name**. Pre-unlock the library shows `id8` — derived from the authenticated Vault ID — plus an optional device-local nickname that warm owns outright. The vault's own name is not readable until the vault is open, which is a deliberate reduction in pre-unlock legibility that ADR-0046 accepts and bounds with the nickname.
- Vault names and generated filenames are public metadata; cloud/filesystem observers can see them. **Reversed by [ADR-0046](0046-vault-name-availability-at-unlock.md):** the name moves inside the encrypted container and the filename carries no user-chosen text, so a filesystem observer sees `coldbox--<id8>.cbx` and learns nothing you chose. This is the main user-visible privacy consequence of that ADR, and it inverts this line rather than qualifying it.
- Filename grouping and rollback checks remain advisory until the vault opens and its authenticated ID is known.
- ADR-0013 remains authoritative about warm-shell save-integrity location. ADR-0026 supersedes user-visible generations while retaining per-Vault-ID advisory history and legacy-generation compatibility.
- Historical v1 vaults/files need no migration to open.

## Alternatives considered

**Device fingerprint as Vault ID.** Rejected for collision/linkability/instability/portability reasons above.

**Put the free-form vault name in `vault.opened`.** Rejected because a user could accidentally type a secret into the name; arbitrary prose from cold to warm is intentionally impossible to classify as safe.

**Auto-save immediately on Create.** Rejected as a universal contract because save capability/permissions differ by browser and automatic writes can hide where the only copy went. The UI instead makes the unsaved state impossible to miss and makes Save the next primary action.

**Retain encrypted working bytes through Lock so Unlock can be clicked immediately.** Rejected. It weakens the established teardown/zeroization model and hides the fact that an unsaved vault has no durable copy. Re-load the saved `.cbx` instead.
