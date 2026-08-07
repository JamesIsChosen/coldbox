# ADR-0014: Keyfile unlock (method 2) implementation limits and record shape

**Status:** Accepted
**Date:** 2026-08-06

---

## Context

[vault-format.md](../01-spec/vault-format.md) already fully specifies wrapped-DEK method 2 at the byte level:

> **Method 2** — KEK = Argon2id(passphrase ‖ SHA-512(keyfile), salt, params). Record data holds a keyfile hint (filename only, never contents). One altered byte in the keyfile makes the vault permanently unopenable — stated at setup, in bold.

That settles the cryptographic construction and the wire shape of the record (`1 method id, 1 flags, 2 record length, N method data, 12 nonce, 48 wrapped DEK`, per the existing multi-record design). It does not settle four implementation questions P0.15 needs answered to write code:

1. **Does a keyfile-protected vault also keep a method-1 (passphrase-only) record, or does method 2 replace method 1 entirely?**
2. **What upper bound, if any, applies to keyfile size?**
3. **What upper bound, if any, applies to the keyfile hint (the "filename only" method data)?**
4. **Is an empty (zero-byte) keyfile accepted?**

None of these are settled by vault-format.md, and per [AGENTS.md §4](../../AGENTS.md) and [ROADMAP.md](../ROADMAP.md)'s framing, a vault-format-adjacent question that the spec doesn't settle gets an ADR rather than a guess.

## Decision

**1. Method 2 replaces method 1 for a given vault; the two do not coexist as alternative unlock paths on the same file.** When `vaultLayer.create()` is called with a keyfile, the vault's single wrapped-DEK record is method 2. When called without one, it is method 1, byte-for-byte identical to every vault P0.11–P0.14 already produce. There is no "unlock with either the passphrase alone or the passphrase-plus-keyfile" mode — the roadmap item's acceptance text ("fails with a one-byte-altered keyfile") only makes sense as a hard requirement if the keyfile is not optional once a vault is created with one; a coexisting method-1 fallback would let anyone skip the keyfile and defeat the reason to enable it.

**2. Keyfile size limit: 64 MiB (67,108,864 bytes)**, refused with `Vault serialization failed.` (the same generic serialization failure other create-time input errors already produce, not a distinct size-limit error — see Rationale). This reuses the number vault-format.md already establishes for the whole vault file, rather than inventing a second unrelated constant.

**3. Keyfile hint: up to 255 bytes of UTF-8, silently truncated past that.** The hint is documented as pure display metadata ("filename only, never contents") — it has no cryptographic role, so truncating a long filename costs nothing but the display convenience of the last few characters, and never blocks vault creation the way rejecting it outright would.

**4. An empty (zero-length) keyfile is rejected** with `Vault serialization failed.` at creation. A zero-byte "keyfile" contributes no entropy — `SHA-512(empty)` is a fixed, publicly known 64-byte value — so accepting it would silently produce a vault whose "keyfile requirement" adds no protection at all while still carrying the "one altered byte destroys it forever" warning for a file that was never meaningfully required. Fail closed and refuse it rather than accept a keyfile that doesn't do what its warning claims.

## Rationale

**Why 64 MiB and not a smaller, keyfile-specific number.** Any size limit here is a memory/DoS-shaped implementation ceiling, not a cryptographic one — `SHA-512` accepts arbitrary-length input, and the security property (permanent unopenability on any bit flip) holds at any size. Reusing the existing `MAX_VAULT_BYTES` constant means there is exactly one "how big is too big for this app to hold in memory" number in the codebase to reason about, instead of a second one that could silently drift from the first over time.

**Why a generic `Vault serialization failed.` rather than a distinct keyfile-size error.** vault-format.md's own size-limit design (`Vault exceeds the 64 MiB size limit.`) is deliberately a *distinct, non-authentication* error precisely because file size is already observable before any decryption is attempted — labeling it separately leaks nothing new. A keyfile's size, by contrast, is chosen by the same person who is also entering the passphrase, at creation time, before there is any secret material downstream to protect the boundary of. There is no confidentiality reason to distinguish "keyfile too large" from any other malformed-input rejection at creation, so it stays inside the same generic failure the rest of `createVault()`'s input validation already uses.

**Why truncate the hint instead of refusing a long filename.** The hint is explicitly non-cryptographic per vault-format.md ("filename only, never contents"); refusing vault creation over a long filename would be a usability cost with no corresponding security benefit. 255 bytes comfortably exceeds every common filesystem's own filename limit (255 bytes is itself the POSIX/`ext4`/NTFS practical ceiling), so truncation in practice only ever affects a hint that was already unusually long by any filesystem's own standard.

**Why reject rather than accept an empty keyfile.** This is the one place a permissive default would be actively misleading: the UI warns "losing or altering the keyfile means permanent loss," and a zero-byte keyfile satisfies neither the letter (nothing meaningful to lose) nor the spirit (nothing meaningful to alter) of that warning while still displaying it. Fail-closed here costs nothing — a person who genuinely wants "no keyfile" already has that: don't check the box.

## Consequences

### Positive

- No new size constant to keep in sync with `MAX_VAULT_BYTES`; one number, one place, matching [doc-hygiene.md](../doc-hygiene.md) Rule 4 (no orphan numbers).
- `parseWrappedRecords()` in `src/cold/vault.js` needed **no changes at all** — it was already generic over method-data length, because the multi-record design vault-format.md specifies was built for exactly this kind of extension. That is direct evidence the P0.11 design held up.
- A vault written before P0.15 opens unmodified after it: method 1 is untouched, and `unwrapDek()` only ever consults a method-2 record if the vault actually carries one.

### Negative

- The "method 2 replaces method 1" decision means there is currently no way to have a vault that opens with *either* the passphrase alone *or* the passphrase-plus-keyfile — only "requires the keyfile" or "does not use one at all." If a future item wants an optional/either-or keyfile, that is a different feature with different acceptance criteria (arguably weaker, since it would mean losing the keyfile doesn't cause permanent loss, contradicting the required warning), not a variation of this one.
- 64 MiB is large enough that a person could point the keyfile picker at something like a video file. `SHA-512` handles it, and the UI-level FileReader read happens entirely in the cold realm, but a very large keyfile does mean a slower unlock (a full read plus one hash pass) for no security benefit beyond what a much smaller file already provides. Not fixed here; flagged as a UX rough edge, not a security gap.

### Risks

- If a future ADR revisits "method 2 replaces method 1," every place in `src/cold/vault.js` that currently assumes at most one relevant wrapped-DEK record per unlock attempt (`unwrapDek()`'s two independent `hasPassphraseRecord`/`hasKeyfileRecord` branches) will need re-examination, though the code was written to already tolerate multiple simultaneous records without change, per vault-format.md's own multi-record design.

## Alternatives considered

**Let method 1 and method 2 coexist on the same vault (two records, either unlocks it).** Rejected: it would mean the keyfile is advisory rather than required, directly undermining the roadmap acceptance criterion "fails with a one-byte-altered keyfile" — under a coexistence design, a byte-altered keyfile wouldn't matter, because the passphrase-only record would still open the vault. This isn't what "keyfile unlock" as a security feature is supposed to mean.

**No size limit on the keyfile at all.** Rejected: unbounded `FileReader.readAsArrayBuffer()` and `Uint8Array` allocation in response to a file picker is an easy way to let a very large or hostile file exhaust memory in the cold realm's tab, which is exactly the kind of avoidable failure "fail closed" language in AGENTS.md is meant to prevent even outside a strict confidentiality boundary.

**A keyfile-specific distinct error code, mirroring the vault-size-limit error.** Rejected per the Rationale above: the observability argument that justifies a distinct vault-size error doesn't apply here, since there's no downstream secret whose confidentiality depends on distinguishing this failure from any other creation-time input error.

## What would change our mind

If a later phase wants an "either passphrase-only or passphrase-plus-keyfile" vault (e.g. for a shared-custody scenario where the keyfile is a convenience, not a requirement), that is a new, weaker guarantee needing its own roadmap item, its own UI copy (the current warning is only honest under the "keyfile is mandatory once set" model), and a revision of this ADR's first decision.

If keyfile sizes in the tens of megabytes turn out to be common in practice (e.g. people pointing the picker at photos or PDFs as an easy keyfile source) and the single SHA-512 pass becomes a noticeable UX delay, the size ceiling might reasonably drop well below 64 MiB — that would not be a security-motivated change, only a UX one, and could be made without another ADR if it stays a pure implementation-limit adjustment.

## References

- [vault-format.md § Wrapped-DEK block](../01-spec/vault-format.md)
- [vault-format.md § Implementation size limit](../01-spec/vault-format.md)
- [ROADMAP.md — P0.15](../ROADMAP.md)
- [doc-hygiene.md Rule 4 — no orphan numbers](../doc-hygiene.md)
