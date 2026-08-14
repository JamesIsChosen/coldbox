# ADR-0046: Vault naming moves into the sealed realm, and the name leaves the filesystem

**Status:** Accepted · amends [ADR-0025](0025-vault-identity-library-and-save-ux.md) §2 and [ADR-0026](0026-canonical-vault-save-and-live-transfer.md) §1
**Date:** 2026-08-14

## Context

[ADR-0025](0025-vault-identity-library-and-save-ux.md) §1 already puts vault creation's unlock phrase, confirmation, KDF profile and keyfile inside the sealed realm. Only the **name** is chosen beforehand, in the warm shell (§2). So a single create action is split across the security boundary for exactly one field, and splitting a create action is the reason people mis-order it.

The obvious fix — move naming into cold — is **structurally impossible as long as the name is filesystem metadata**, and two earlier drafts of this ADR failed to notice that. Independent review caught it twice:

- [ADR-0026](0026-canonical-vault-save-and-live-transfer.md) §1 makes the canonical file `<public-name>--<id8>.cbx`, and the warm shell owns saving and the library. Warm therefore needs the name.
- [architecture.md](../../01-spec/architecture.md) states flatly that **vault names do not cross cold → warm**, because arbitrary prose cannot be distinguished from a secret by regex and a user could type a passphrase into a name field by mistake. ADR-0025 rejected putting the name in a Cold → Warm message for exactly this reason.

A name typed in cold can never reach warm; warm needs the name to name the file. Any design that moves naming into cold while leaving the name in the filename is incoherent, and the first draft of this ADR was such a design. Its second draft compounded the error by introducing a warm → cold name-list message to solve duplicate detection — solving a downstream symptom of a contradiction that was still there.

The contradiction dissolves once the real question is asked: **why is a user-chosen string in the filename at all?**

## Decision

**1. The vault name is entered in the sealed realm at creation** and stored inside the vault's encrypted public compartment, written by cold and authenticated with everything else in it. It is cold-owned. It never crosses to warm, in any message, in any form.

**2. The canonical filename carries no user-chosen text.** It becomes `coldbox--<id8>.cbx`, replacing ADR-0026 §1's `<public-name>--<id8>.cbx`. The `id8` prefix of the authenticated Vault ID remains, and remains advisory until the vault opens and its authenticated ID is checked, exactly as ADR-0026 already requires.

**3. The warm library identifies a vault by `id8` plus an optional device-local nickname.** The nickname is typed in the warm shell, stored in warm-side local state keyed by Vault ID, and is **not** the vault name: it is never sent to cold, never written into the vault, and never appears in a filename. It exists so a picker showing four hex strings is legible.

**4. Renaming is supported on both, and neither is expensive.** The real name is edited in the sealed realm while the vault is unlocked and is re-encrypted with the compartment that a save already rewrites. The device-local nickname is edited in warm at any time, unlocked or not. Neither requires writing a new file, which is a strict improvement on the status quo, where the name *is* the filename and renaming means a new canonical file.

**5. No new message type is introduced, in either direction.** This is the decisive property. Cold needs nothing from warm to name a vault, and warm needs nothing from cold to list one. The second draft's warm → cold name-list message is withdrawn entirely; it existed only to serve a design that could not work.

**6. Duplicate-name refusal is retired rather than violated.** ADR-0026 §37 required that a second vault could not silently reuse an already-known public name, and ADR-0025 §2 carried the same expectation. Neither is enforceable once names are encrypted inside their own vaults, and neither is needed: the requirement existed to prevent look-alike confusion between vaults, and the discriminator visible at selection time is now `id8`, which derives from the authenticated Vault ID rather than from user-chosen text. A confusion attack cannot be mounted with a name nobody can see.

## Rationale

**This is a privacy improvement, not a trade.** Today the vault name is written into a filename, which discloses it to every process and service that can list the directory — cloud sync, backup software, file indexers, anything reading the disk, and anyone glancing at a file manager. [threat-model.md](../../02-security/threat-model.md) already treats this class of metadata as a targeting risk: it records portfolio data as a physical-security risk and backup locations as a burglary map. A vault named `retirement-cold-storage` is the same kind of signal, and it is currently emitted whether or not the user ever opens the file. Moving the name inside the encrypted container removes that disclosure completely.

**The boundary gets simpler, not more complex.** Both earlier drafts of this ADR added protocol surface — one by moving a name outward, one by moving a list inward. This adds neither. The invariant that names do not cross cold → warm is not merely preserved; it becomes trivially true, because nothing on the warm side ever wants the name.

**The cost is real and it is not attacker-facing.** Before unlock, the warm picker can show only `id8` and file metadata. The failure mode that creates is a user selecting or overwriting the wrong vault — an integrity and availability risk, not a disclosure one. The device-local nickname exists precisely to bound it, and it bounds it without moving a single byte across the boundary.

**Renaming was the unlock.** Considering rename support is what exposed that a name in a filename is a poor place for a mutable label: renaming means writing a new canonical file, which collides with ADR-0026's whole one-vault-one-file premise. Separating the durable name (inside, cold-owned) from the local label (outside, warm-owned) makes both mutable and cheap.

## Consequences

- ADR-0025 §2 is amended: the name is no longer "public warm-shell metadata". It is cold-owned encrypted metadata. Everything else in §2 stands — the name must still not contain secrets, and it still never crosses cold → warm.
- ADR-0026 §1 is amended for the filename form. Historical filenames — `<name>--<id8>--0047.cbx`, `<name>--<id8>.cbx` and `coldbox-vault-0047.cbx` — remain readable, per ADR-0026 §5. **Existing vaults are not rewritten and need no migration to open.**
- The public compartment gains a bounded name field. **Whether that requires a vault-format version bump is not decided here and must not be decided silently**: UI.10 determines it against [vault-format.md](../../01-spec/vault-format.md) and records the answer with its reasoning. A schema addition that changes the format without a version marker would be a defect.
- [threat-model.md](../../02-security/threat-model.md) records the change in what the filesystem discloses, replacing the disclosure the second draft of this ADR described.
- Warm gains device-local nickname state. It is display-only, per-device, and does not travel with a copied `.cbx`. That is a stated limitation, not an oversight: the durable name travels inside the file and is visible once unlocked.
- **UI.10 owns implementation in full** — the sealed create screen, the compartment field and its bounds, the filename change, the warm nickname store, rename on both sides, the format-version determination, and the [architecture.md](../../01-spec/architecture.md) and [vault-format.md](../../01-spec/vault-format.md) updates.
- Pre-unlock legibility is reduced on any device that has not set a nickname. Accepted.

## Alternatives considered

**Move naming to cold and send the name back out under a validator.** Rejected, and it was the first draft of this ADR. It reverses an explicit architecture invariant, and it revives an alternative ADR-0025 already rejected on the grounds that the validator cannot work — arbitrary prose is not distinguishable from a passphrase by pattern matching. That reasoning has not changed.

**Move naming to cold and pass a warm → cold list of names in use for duplicate checking.** Rejected, and it was the second draft. It leaves the outbound problem completely unsolved — warm still cannot name the file — while adding a new inbound message, new validation surface, a new fail-closed path, and a session-scoped disclosure of the user's vault names to the sealed realm. It answered a question that only arose because the design underneath it was broken.

**Leave naming in the warm shell and keep creation split.** Viable, and the honest fallback if the pre-unlock legibility cost proves unacceptable in use. Rejected because it preserves both defects this ADR removes — a create action split across a security boundary for one field, and a user-chosen string permanently disclosed in a filename. Note that it is *not* rejected on the authority of [ADR-0045](0045-released-secret-model.md), which is about seed material and says nothing about vault creation; an earlier draft of this ADR wrongly attributed the decision there.

**Keep the name in the filename but encrypt or hash it.** Rejected as theatre. A hashed filename is unreadable to the user while remaining a stable per-vault identifier to an observer, so it costs all of the legibility and buys almost none of the privacy — `id8` already serves as the stable identifier and is honest about being one.
