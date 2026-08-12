# Backing up with codex32

The only backup format you can fully verify **by hand**, with pen, paper, and printed lookup tables — no computer required.

Defined in [BIP-93](https://github.com/bitcoin/bips/blob/master/bip-0093.mediawiki).

---

## Why it exists

Every other backup format has a hidden dependency: to check that your backup is still good, you need working software.

Pull a SLIP-39 share out of a safe in fifteen years and you must trust that some implementation still exists, still runs on hardware you own, and hasn't been tampered with. Usually fine. Occasionally not.

::: plain
codex32 removes that dependency. Its checksum was deliberately designed to be checkable with pen, paper, and a printed lookup table — no software, no device, no supply chain to trust. And it doesn't just spot a mistake, it can often tell you exactly which character was wrong and fix it.
:::
::: working
codex32's checksum is a BCH code over GF(32), chosen specifically because it's simple enough to compute by hand with lookup tables. Unlike most backup checksums, it corrects single-character errors rather than merely detecting them.
:::
::: technical
See "codex32 (BIP-93)" in the [glossary](../00-overview/glossary.md): each share is 48 Bech32-charset characters encoding a BCH(n,k) code with a 13-character checksum, and the official worksheets specify the by-hand polynomial-division correction procedure.
:::

For a backup meant to outlive its tooling, that's a genuinely different security property.

---

## The tradeoff

| | codex32 | SLIP-39 |
|---|---|---|
| Verify by hand | ✅ | ❌ |
| Error correction | ✅ | Detection only |
| Wallet support | **Very limited** | Trezor and some others |
| Learning curve | Steeper | Moderate |
| Generate by hand | ✅ Entirely | ❌ |

**Wallet adoption is the catch.** A Bitcoin Core import PR exists but is unmerged, and no major hardware wallet reads codex32 directly.

**So treat it as a backup format, not an interchange format.** You recover by reconstructing the seed and entering it as BIP-39. That works — but it means codex32 is for archival durability, not operational convenience.

---

## When to use it

**Good fit:**

- Long-term archival where you want hand-verifiability
- A backup you'll check periodically without booting a computer
- Ledger or Coldcard users who want Shamir splitting (SLIP-39 won't restore on those devices anyway)
- Generating a seed entirely on paper, never touching a computer

**Poor fit:**

- You want quick device restore
- You're on Trezor and SLIP-39's native support is more useful
- You won't invest the time to learn the hand procedure — in which case you're carrying the complexity without the benefit

---

## Generating in the app

**Offline.** Green banner.

1. In the sealed Backup Lab → codex32 panel, enter the direct 16-to-64-byte BIP-32 master seed as hexadecimal. This is not BIP-39 entropy, a mnemonic, or a passphrase.
2. Choose a configuration (2-of-3 is a sensible default) and a four-character identifier.
3. Generate, then reveal the masked shares briefly while writing each one to a separate offline copy.

Shares are 48 characters for a 128-bit seed, using bech32's character set. Each carries an identifier, a share index, and a checksum.

## Generating by hand

The distinctive capability. Backup Lab → codex32 → Print worksheets produces everything you need: lookup tables, a step-by-step worksheet, and a verification sheet.

The procedure — generate entropy with dice, encode it, compute the checksum, derive shares, verify each — takes an hour or two the first time. **No computer is involved at any point**, so no computer can have compromised the result.

This is the strongest key generation available to an ordinary person. It is also genuinely tedious, and worth it only if that property matters to you.

---

## Verify before you trust — mandatory

As with any scheme, the app requires reconstruction from a threshold subset before marking the backup complete. Type the shares from your written copies, not copy-paste.

**Then verify the checksum by hand at least once**, using the printed worksheet. That's the capability you chose this format for — confirm you can actually use it before relying on it.

---

## Periodic verification, the point of all this

Annually, without a computer:

1. Retrieve a share.
2. Take out the printed lookup tables.
3. Compute the checksum by hand — a few minutes once you're practised.
4. Confirm it matches.

You've now verified your backup is intact without trusting any software, any device, or any supply chain. Record the date in the Health dashboard when you're next at a computer.

---

## Recording shares

Alongside each share, physically:

- Share index and threshold
- Creation date
- What it's for — wallet name and fingerprint
- A note that it's useless alone
- **The printed lookup tables and worksheet**

That last item matters. A codex32 share without the tables loses the property you chose it for. Print a set with every share.

---

## Recovering

1. Gather at least T shares.
2. Offline. Backup Lab → codex32 → Recover.
3. Enter each share.
4. Confirm the reconstructed fingerprint matches.
5. Enter the resulting seed into your wallet as BIP-39.

**A share fails validation?** codex32 can suggest a single-character correction. The app identifies the position and keeps the candidate masked; compare it with the paper copy and explicitly confirm before using it. If it cannot identify one unambiguous correction, use a different share if you have one above threshold.

---

## Related

- [BIP-93](https://github.com/bitcoin/bips/blob/master/bip-0093.mediawiki)
- [Hand-computation walkthrough](https://inbitcoinwetrust.substack.com/p/the-ultimate-bitcoin-backup-computing)
- [SLIP-39](backup-slip39.md)
