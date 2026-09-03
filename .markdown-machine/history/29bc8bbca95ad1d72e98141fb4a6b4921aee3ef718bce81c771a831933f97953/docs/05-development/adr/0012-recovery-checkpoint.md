# ADR-0012: Recovery checkpoints are a separate encrypted file, not vault records

**Status:** Accepted
**Date:** 2026-08-06

---

## Context

A recovery search for three missing words in a 24-word phrase runs for hours to days. Today, closing the tab loses all of it. Some form of resumable checkpoint is wanted for searches in the hour-to-week band — below that, restarting is cheaper than the machinery; above it, the search is refused as infeasible anyway.

Two constraints shape the answer.

**The cold realm cannot persist anything.** The sandbox omits `allow-same-origin`, which is what stops the network-capable warm shell reading passphrase entry. The consequence is an opaque origin, and therefore no `localStorage`, no IndexedDB, no Cache API. Whatever a checkpoint is, the cold realm cannot write it to storage itself. Its only outbound routes are `allow-downloads` and a `postMessage` payload to the warm shell.

**A checkpoint is unusually dangerous.** To resume, it must record the known words, which positions are unknown, and the search cursor. For a 24-word phrase missing three, that is 21 correct words plus a precise map of what is missing — a search space of roughly 33 million, which is minutes of work for anyone who obtains it. A checkpoint is materially more dangerous than a stored seed, because it is a near-complete seed annotated with the answer key.

The obvious home is the vault: it already exists, it is already Argon2id-encrypted, and "secrets live in the vault" is a simple rule.

## Decision

**A checkpoint is a separate encrypted file, not a vault record.**

- The cold realm encrypts it and emits ciphertext through `allow-downloads`. Only ciphertext crosses the realm boundary, so the no-secrets-cross rule holds.
- **When a vault is open, the checkpoint key is wrapped under the vault DEK.** No second passphrase for the user to invent, and the checkpoint is useless without the vault — two artifacts required, which is a property worth having.
- **When no vault is open, the user sets a checkpoint passphrase**, at full vault KDF strength. Recovery must not require creating a vault.
- Emitted on demand and periodically, not continuously.
- Treated as top-tier secret material under SPEC §15's display rules, with explicit warning text that it must not be stored anywhere the seed itself would not be.
- The user is prompted to destroy it after a successful recovery.

`vault-format.md` is unchanged by this decision.

## Rationale

### Continuous rewriting fights the vault's own safety machinery

At the time this ADR was accepted, the vault had verify-after-save, user-visible generational filenames, rollback detection via a save counter, and a dirty flag. That historical argument remains valid for why checkpoints are separate files. ADR-0026 later replaced current vault generation filenames with one canonical file, but did not move recovery checkpoints into the vault.

Worse, it puts the vault at risk during the one operation where it matters most. A user running a recovery has already lost a backup; the vault is what records where the others are. Rewriting it continuously, in that moment, to store something temporary is the wrong trade.

### It would require a vault, in the flow least likely to have one

Recovery is the most plausible *first* use of Coldbox. Someone loses a backup, searches for help, and arrives with a damaged phrase and no prior relationship with the tool. Gating resumability behind vault creation, passphrase selection and an Argon2id derivation puts a toll booth in a distress flow.

### The lifetimes do not match

A vault is permanent and accumulates history deliberately. A checkpoint is disposable and should be destroyed on success. Storing one in the other creates a pruning obligation for a format that has none today.

### The instinct behind the vault proposal is still honoured

The concern that motivated it — do not invent a second security model for secret material — is correct. This decision uses the same crypto stack, the same KDF profiles, the same display rules, and keys off the vault whenever one exists. What it declines to share is the *file*, not the security model.

## Consequences

- A new file type and extension to define, plus its own format note. Small, and it does not touch the vault format.
- The user manages another sensitive file, so the warning copy carries real weight and needs the same care as the seed display rules.
- A checkpoint written under a vault DEK is unreadable if that vault is lost. Acceptable: the fallback is restarting the search, which is recoverable.
- Checkpoint resume needs its own harness coverage, including a tampered-checkpoint fixture that must fail closed rather than resume from corrupted state.

## Alternatives rejected

**In the vault.** Rejected for the four reasons above.

**Plaintext checkpoint with a warning.** Not defensible for a file that reduces a seed to a 33-million search. Warnings do not survive contact with a user who is already panicking.

**Cold realm persists it directly.** Impossible — opaque origin, no storage APIs. Not a preference.

**No checkpointing at all.** Defensible, and it remains the behaviour below the threshold. Rejected as a blanket policy because the searches that need it are exactly the ones where a user has already invested hours and a lost tab means starting over.

## What would reverse this

Evidence that users are losing checkpoints and would be safer with them inside the vault after all. Or a vault format change that makes cheap incremental record updates possible without rewriting the file, which would remove the churn objection — though not the requires-a-vault one.
