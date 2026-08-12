# Backing up with Shamir39 or raw SSS

Coldbox offers two non-SLIP-39 threshold-share formats for cold-local use:
Shamir39 turns a BIP-39 phrase into mnemonic shares, while raw SSS turns
hexadecimal key material into hexadecimal shares. The Ian Coleman Shamir39
specification and the secrets.js reference behavior were reviewed on
2026-08-12.

::: plain
Choose a threshold, such as 2 of 3 or 3 of 5. Any threshold number of shares
can rebuild the secret; fewer than the threshold reveal nothing useful. Keep
the shares in separate offline places, and keep the original phrase or raw
secret protected too.
:::
::: working
Shamir39 is a non-standard mnemonic format for splitting a valid BIP-39
phrase. Raw SSS is Shamir Secret Sharing over a configurable binary finite
field for hexadecimal data. Neither format is SLIP-39, and neither provides
wallet-device interoperability by itself. A BIP-39 passphrase is a separate
secret and is not included in either share set.
:::
::: technical
The pinned Ian Coleman commit contains two historical artifacts that must not
be conflated: its `specification.md` names the prototype marker `shamir39`,
while its `src/js/shamir39.js` implementation emits `shamir39-p1`. Coldbox
follows that implementation for new output and accepts the legacy marker when
combining. The pinned specification's three-word example is not a valid BIP-39
input for this tool, so the shipped input boundary remains 12, 15, 18, 21, or
24 valid BIP-39 words. Parameter words carry the threshold and share order,
and data words encode the share polynomial over GF(2^11). Raw SSS follows the pinned
[secrets.js share format](https://github.com/grempe/secrets.js/blob/master/README.md):
the leading base-36 field-size digit, hexadecimal share identifier, padded
field data, default 8-bit field, and default 128-bit padding. Both generators
require `crypto.getRandomValues`; there is no `Math.random` fallback.
:::

## Which format should you use?

| Need | Use | Why |
|---|---|---|
| A standard wallet backup with broad documented support | [SLIP-39](backup-slip39.md) | It is the project’s preferred interoperable threshold mnemonic format |
| A BIP-39 phrase split into mnemonic-looking pieces | Shamir39 | It preserves the BIP-39 wordlist choice, but is a non-standard format |
| A raw key, entropy blob, or other hexadecimal secret | Raw SSS | It shares bytes rather than a mnemonic and supports GF(2^n) field sizes |
| A backup you can verify by hand | [codex32](backup-codex32.md) | Its checksum and correction procedure are designed for paper work |

If a hardware wallet must restore the backup directly, check its documented
format support first. Shamir39 and raw SSS normally require reconstructing the
original material in Coldbox and then using the result in the target wallet.

## Generate shares

1. Work offline and open **Backup Shares / P2.4** in the sealed realm.
2. For Shamir39, choose the BIP-39 language, threshold, and total share count,
   then enter a valid BIP-39 phrase. For raw SSS, enter even-length
   hexadecimal data and choose the field size; 8 bits is the compatibility
   default.
3. Generate the shares. The source field is cleared after the attempt.
4. Reveal the generated shares briefly and transcribe each one to a separate
   offline record. Hide them again before moving on.
5. Type the written shares into the matching combine fields and reconstruct a
   candidate. This verifies transcription only when the shares came from your
   physical records, not when you reuse the just-displayed values.

Coldbox has no clipboard, download, print, or storage action for these values.
The share fields, generated arrays, result, and reveal timers are cleared when
the cold session locks or the panic-hide gesture runs.

## Store and distribute shares

- Never put threshold-many shares in one place. That makes a burglary or one
  disaster sufficient to reconstruct the secret.
- Label the threshold and share index, such as “backup fragment 2 of 5,” but
  do not put the wallet name or asset value on the share itself.
- Use durable offline media and protect it from water, fire, and legibility
  loss. A share that cannot be read is a lost share.
- Record custodians and locations separately from the share text. Do not
  photograph, sync, email, or paste a share.
- Keep the BIP-39 passphrase or raw-secret context as a separate backup. A
  reconstructed phrase without its passphrase may open the wrong wallet.

## Recover and verify

1. Gather at least the threshold number of shares from separate locations.
2. Work offline and enter each complete share into the same format’s combine
   fields. Share order does not matter.
3. Reveal the result briefly. For Shamir39, confirm the BIP-39 words and
   checksum and compare an independently recorded fingerprint. For raw SSS,
   compare the complete hexadecimal value with an independent record.
4. If the result is wrong, do not guess or “repair” it. Check the format,
   field size, threshold, share set, and every character on the physical
   records. A wrong share can produce a candidate rather than a helpful error.

Fewer than the threshold number of shares must not be treated as partial
recovery. Reconstructing with a damaged or mixed share set is not evidence
that the output is correct; independent verification is mandatory.

## Important limitations

- Shamir39 is not SLIP-39. It does not promise the same checksum, metadata, or
  wallet compatibility.
- Raw SSS shares do not authenticate their contents. A maliciously changed
  share may cause a wrong candidate; verify the reconstructed value
  independently.
- The threshold property protects the secret below threshold, but it does not
  identify which shares are genuine or preserve the original passphrase.
- Field size limits the maximum share count. Coldbox’s UI exposes up to eight
  shares; the cold API enforces the mathematical field limit.
- Missing `crypto.getRandomValues` is a hard failure. Coldbox never substitutes
  `Math.random` for share generation.

## Related standards and references

- [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) —
  mnemonic entropy and checksum rules.
- [Ian Coleman Shamir39 specification](https://github.com/iancoleman/shamir39/blob/master/specification.md)
  — version marker, parameter words, and data encoding.
- [Ian Coleman Shamir39 reference implementation](https://github.com/iancoleman/shamir39)
  — independent compatibility source.
- [secrets.js README](https://github.com/grempe/secrets.js/blob/master/README.md)
  — raw SSS field, padding, and share-format behavior.
- [secrets.js source](https://github.com/grempe/secrets.js/blob/master/secrets.js)
  — independent compatibility source.
- [SLIP-39 guide](backup-slip39.md) — the preferred interoperable threshold
  mnemonic workflow.
