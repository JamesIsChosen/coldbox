# Backing up with Seed XOR

Seed XOR is an N-of-N backup: it turns one BIP-39 phrase into several other
BIP-39 phrases, and all of them are required to recover the original. It is
not a threshold backup. The official external reference is Coldcard's
[Seed XOR documentation](https://github.com/Coldcard/firmware/blob/master/docs/seed-xor.md);
the page was reviewed on 2026-08-12.

::: plain
Seed XOR makes 2, 3, or 4 complete seed phrases from one 12-, 18-, or
24-word phrase. Each piece looks like a normal seed, but losing any one piece
makes the original unrecoverable. Keep every piece in a different offline
location.
:::
::: working
The app converts each phrase to its BIP-39 entropy bytes, XORs all the parts,
and checksums every output as a separate BIP-39 phrase. Every part is valid on
its own, but no part is sufficient to recover the original. The selected BIP-39
passphrase is not part of Seed XOR and is never entered here.
:::
::: technical
For each supported phrase, Seed XOR operates on the 128-, 192-, or 256-bit
BIP-39 entropy, not on word text, word indexes, or the 512-bit PBKDF2 seed.
The final part is the XOR of the source entropy and the other parts. In
deterministic mode, each earlier mask is the first entropy-length bytes of
double-SHA-256 over `Batshitoshi `, the source entropy, and the ASCII label
`i of N parts` using zero-based `i`. Random mode hashes CSPRNG bytes the same
way. These choices follow the [Coldcard firmware implementation](https://github.com/Coldcard/firmware/blob/master/shared/xor_seed.py).
:::

## When to use it

Seed XOR is useful when every backup holder or location must contribute to
recovery, while each written piece should remain a normal BIP-39 phrase. It
does not provide the “any 2 of 3” property of [SLIP-39](backup-slip39.md) or
other Shamir schemes.

Use English phrases when interoperability with Coldcard's documented flow is
the goal. Coldbox can encode the same entropy operation with its other
vendored BIP-39 wordlists, but an external wallet must support that wordlist.

## Generate parts

1. Work offline and open **Seed XOR / P2.3** in the sealed realm.
2. Choose the same BIP-39 wordlist and select 2, 3, or 4 parts.
3. Enter the existing phrase in the masked field.
4. Choose **Deterministic** for reproducible Coldcard-compatible masks, or
   **Random masks** when you want fresh CSPRNG-derived masks.
5. Generate the parts, reveal them briefly, and transcribe each onto separate
   offline media.
6. Hide the parts and verify the written copies by entering them again in the
   **Combine existing parts** fields. Do not treat the phrases that were just
   displayed as proof that the transcription is correct.

The app clears the source field, generated output, combine fields, and
combined phrase when the cold session locks or is torn down. It has no copy,
clipboard, download, or storage action for these phrases.

## Recovery and verification

Enter every written part, using the same wordlist and selected part count.
Order does not matter, but every part must be present and must pass its own
BIP-39 checksum. A missing, mistyped, or wrong-length part is rejected rather
than silently producing a candidate phrase.

After combining, reveal the result briefly and compare its words with the
independent backup record. If the original phrase used a BIP-39 passphrase,
keep that passphrase as a separate backup item; Seed XOR does not split or
recover it.

If you have a public BackupRecord, choose **Verify shares** on that record and
type every written part into the sealed realm. P2.6 records a cold-owned
`lastVerifiedAt` only after all parts reconstruct successfully **and** the
combined entropy matches the cold-stored subject named by the record. An
unresolved subject or a valid part set for another subject remains incomplete.
The parts, combined phrase, and any passphrase remain cold-local; the warm
shell receives only the closed success or failure result.

## Important limitations

- All parts are required. There is no threshold, repair, or “one part is
  enough” mode.
- Every part can be imported as a valid BIP-39 wallet, so label and store the
  pieces clearly; a valid piece is not evidence that it is the original.
- A deterministic split is reproducible only when the source phrase, wordlist,
  part count, and algorithm are identical. It is not a substitute for keeping
  the written parts.
- Random mode refuses to run when `crypto.getRandomValues` is unavailable. It
  never substitutes `Math.random`.
- The combined phrase is a secret. Do not photograph, paste, print, sync, or
  enter it on an internet-connected device.

## Related standards and references

- [Backup Health](backup-health.md) — public verification schedules and conservative placement warnings.

- [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) —
  mnemonic entropy and checksums.
- [Coldcard Seed XOR guide](https://github.com/Coldcard/firmware/blob/master/docs/seed-xor.md)
  — interoperability semantics and examples.
- [Coldcard Seed XOR source](https://github.com/Coldcard/firmware/blob/master/shared/xor_seed.py)
  — deterministic and random mask construction.
- [Seed XOR in the glossary](../00-overview/glossary.md) — the canonical
  definition of N-of-N versus threshold recovery.
