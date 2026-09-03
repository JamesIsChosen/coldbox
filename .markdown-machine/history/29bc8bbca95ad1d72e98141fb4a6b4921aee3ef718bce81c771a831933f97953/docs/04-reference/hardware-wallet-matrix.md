# Hardware wallet support matrix

**Dated reference, user-maintained. Not authoritative.**

Vendor firmware changes faster than this file will. It informs; it never gates functionality. Verify against your device's current documentation before relying on any row.

*Last reviewed: 2026-08-02*

---

## Backup format support

| Device | BIP-39 | SLIP-39 | codex32 | Seed XOR | Dice entropy | SeedQR |
|---|---|---|---|---|---|---|
| Ledger | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Trezor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Coldcard | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ (Q) |
| BitBox02 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Blockstream Jade | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Keystone | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| SeedSigner | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Krux | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Foundation Passport | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Specter DIY | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

**The asymmetry that matters:** SLIP-39 is supported by Trezor and almost nothing else. **Ledger and Coldcard do not support it.** If you split a seed with SLIP-39 and your device can't restore from those shares, you have a backup you cannot use. Coldbox warns about this before generation.

Seed XOR is Coldcard's native scheme and is N-of-N only — every piece required, no threshold.

---

## Script and policy support

| Device | Taproot | Miniscript (SegWit) | Miniscript (Taproot) | MuSig2 | Descriptors |
|---|---|---|---|---|---|
| Ledger | ✅ | ✅ | ✅ | ✅ (2.4.0+, software keys) | ✅ |
| Trezor | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| Coldcard | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| BitBox02 | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| Jade | ✅ | ✅ | ❌ | ❌ | ✅ |
| Keystone | ✅ | ⚠️ | ❌ | ❌ | ✅ |
| SeedSigner | ✅ | ❌ | ❌ | ❌ | ✅ |
| Specter DIY | ✅ | ✅ | ✅ | ❌ | ✅ |

⚠️ = partial or version-dependent. Check current firmware.

MuSig2 was standardized recently and shipped in the Ledger Bitcoin app 2.4.0, but miniscript combined with MuSig2 remains software-keys-only for now. Coldbox tracks that a wallet uses it; it doesn't implement signing.

---

## Transaction transport

| Device | USB | microSD | QR | NFC | Bluetooth |
|---|---|---|---|---|---|
| Ledger | ✅ | ❌ | ❌ | ❌ | ✅ (Nano X) |
| Trezor | ✅ | ❌ | ❌ | ❌ | ❌ |
| Coldcard | ✅ (Mk4) | ✅ | ✅ (Q) | ✅ (Mk4) | ❌ |
| BitBox02 | ✅ | ❌ | ❌ | ❌ | ❌ |
| Jade | ✅ | ❌ | ✅ | ❌ | ✅ |
| Keystone | ❌ | ✅ | ✅ | ❌ | ❌ |
| SeedSigner | ❌ | ❌ | ✅ | ❌ | ❌ |
| Krux | ❌ | ✅ | ✅ | ❌ | ❌ |
| Passport | ❌ | ✅ | ✅ | ❌ | ❌ |

Devices with QR-only transport (SeedSigner, Keystone, Passport, Krux) use **BC-UR animated QR** for anything exceeding a single code's capacity. Coldbox generates and reads these.

---

## Default Bitcoin paths

| Device | Default | Notes |
|---|---|---|
| Ledger | `m/84'/0'/0'` | Older accounts may be `m/44'` |
| Trezor | `m/84'/0'/0'` | |
| Coldcard | `m/84'/0'/0'` | |
| BitBox02 | `m/84'/0'/0'` | |
| Jade | `m/84'/0'/0'` | |
| Keystone | `m/84'/0'/0'` | |
| SeedSigner | `m/84'/0'/0'` | |
| Passport | `m/84'/0'/0'` | |

Multisig generally uses `m/48'/0'/0'/2'` for native SegWit.

---

## Verification support

What each device can display, which determines which Coldbox verification workflows work with it.

| Device | Shows XFP | Shows address on device | Exports xpub | Shows path |
|---|---|---|---|---|
| Ledger | ✅ | ✅ | ✅ | ✅ |
| Trezor | ✅ | ✅ | ✅ | ✅ |
| Coldcard | ✅ | ✅ | ✅ | ✅ |
| BitBox02 | ✅ | ✅ | ✅ | ✅ |
| Jade | ✅ | ✅ | ✅ | ✅ |
| Keystone | ✅ | ✅ | ✅ | ✅ |
| SeedSigner | ✅ | ✅ | ✅ | ✅ |
| Passport | ✅ | ✅ | ✅ | ✅ |

Universal support, which is why the verification workflows are device-agnostic. See [verify a hardware wallet](../03-guides/verify-a-hardware-wallet.md).

---

## Choosing a backup format

| Situation | Use |
|---|---|
| Trezor, want distributed backup | **SLIP-39** — native support |
| Ledger or Coldcard, want distributed backup | **codex32** or **raw Shamir on paper** — SLIP-39 won't restore |
| Coldcard, want N-of-N with decoys | **Seed XOR** — native |
| Want to verify by hand in 20 years | **codex32** — the only one that works without a computer |
| Simple, maximum compatibility | **BIP-39 on metal**, duplicated across locations |
| Mixed vendors | **BIP-39 on metal** as the base; the distributed scheme should match whichever device would perform the restore |

That last row is the one people get wrong. Your backup format must be restorable by the device you'll actually use to restore it.

---

## Corrections

This table will drift. If a row is wrong, open a PR with a link to the vendor documentation or release notes. Include the firmware version you verified against, and update the review date.
