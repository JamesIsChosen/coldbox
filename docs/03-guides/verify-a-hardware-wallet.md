# Verify a hardware wallet

**The most valuable thing this tool does.** If you use one feature, use this one.

---

## The attack

You want to receive Bitcoin. Your wallet software displays an address. You copy it, send it to whoever is paying you, and the money arrives — somewhere.

::: plain
There's malware built to do exactly one thing: swap the address on your screen or clipboard for the attacker's own, right before you copy it. You never notice the swap. The payment goes through fine. It just doesn't go to you.

Your hardware wallet shows the real address on its own tiny screen so you can catch this — but comparing 42 random-looking characters against a phone-sized display is tedious, so people stop doing it, or shortcut it by checking just the first few and last few characters. Address-swapping malware is built to defeat exactly that shortcut, by generating a fake address with matching ends.

**The fix:** work out the address yourself, independently, using software that was never anywhere near the app that might be lying to you.
:::
::: working
Address-swapping malware watches the clipboard or display for a cryptocurrency address and substitutes an attacker-controlled one before the user sends. The substitution is invisible in the moment; the transaction itself succeeds normally, just to the wrong recipient.

The hardware wallet's own display exists precisely to defeat this, but character-by-character comparison of a long address is tedious and commonly shortcut to just the visible prefix/suffix — which is exactly what generation of a matching vanity address defeats.

**The defence:** derive the address independently, in software with no code path shared with the potentially-compromised wallet application, and compare the full string.
:::
::: technical
Given an xpub and derivation path, deriving address `i` requires only public-key arithmetic (see "xpub" in the [glossary](../00-overview/glossary.md)) — no private key or network access is needed, which is exactly why Coldbox can perform this check entirely inside the airgapped cold realm. A vanity-address generator brute-forces private keys until it finds one whose derived address matches a chosen prefix and/or suffix; matching even 4+4 characters is computationally cheap, which is why partial-string comparison provides negligible protection.
:::

---

## Verify a receive address

**What you need:** your account xpub, and your hardware wallet.

### 1. Get your xpub

From your wallet software or the device itself. In Sparrow: Settings → the `xpub` field. On Coldcard: Advanced → Export → Generic JSON. On Ledger Live, Trezor Suite, and BitBoxApp it's in account details.

**Note the derivation path alongside it.** An xpub without its path is ambiguous.

### 2. Enter it in Coldbox

Devices → Verify → Receive address. Paste the xpub, select the script type matching your path (`84'` → Native SegWit, `86'` → Taproot), and generate the first few addresses.

### 3. Compare all three

| Source | Where |
|---|---|
| Your wallet software | The receive screen |
| Your hardware wallet | Its own display — press "show address on device" |
| Coldbox | Just derived |

**All three must match, character for character.**

Read the whole string. Malware matches the visually obvious parts. Use Coldbox's large-print mode and compare in chunks.

### 4. Interpret the result

**All three match.** Your software is telling the truth. Use the address.

**Wallet software differs from device and Coldbox.** Your computer is compromised. Do not use the address. Move to a clean machine before doing anything else, and treat that computer as hostile.

**Device differs from Coldbox.** Usually a configuration mismatch — wrong script type or wrong path in Coldbox. Check those first. If they're right and it still differs, stop and investigate before receiving anything.

Once verified, record the address in the Registry with a label. Verifying it again later is then a lookup rather than a repeat of this process.

---

## Verify a device holds the seed you think it does

Useful after restoring from a backup, buying a used device, or when you simply can't remember which seed is on which device.

**Compare master fingerprints.**

::: plain
A fingerprint is eight characters that identify a wallet without giving anything away about it — like comparing serial numbers instead of comparing the actual contents of a safe.
:::
::: working
The master fingerprint is an 8-hex-character identifier derived one-way from the seed's master public key, safe to compare and record even though it reveals nothing exploitable about the underlying seed.
:::
::: technical
See "Fingerprint" in the [glossary](../00-overview/glossary.md) for the exact BIP-32 derivation (`HASH160` of the master public key, first 4 bytes). Coldbox computes this from an entered seed entirely inside the cold realm, so the comparison never requires the seed to leave the airgapped side of the app.
:::

1. Display the fingerprint on your device (often shown as XFP, in advanced or wallet info screens).
2. In Coldbox, **offline**, enter the seed phrase you believe it holds. Seed Forge shows the fingerprint immediately.
3. Compare.

**Match:** the device holds that seed. **Mismatch:** it doesn't — either a different seed, or a passphrase is active.

Neither side revealed the seed. This is why the fingerprint is the identifier used throughout the Registry.

---

## Verify a metal backup works

The failure everyone dreads: you need your backup, and it's wrong. Usually a transcription error made years earlier, never checked.

**You do not need to wipe a device to test this.**

1. Go **offline**. Confirm **No external reachability detected** plus **cold realm sealed**, and independently verify the physical network is disconnected.
2. Seed Forge → enter the seed from your metal plate, exactly as engraved.
3. Check the validation. An invalid checksum means a transcription error, and the Recovery Assistant can often identify which word.
4. Compare the fingerprint to your device's.

**Match:** your backup is correct and will restore. **Mismatch:** your backup is wrong. Fix it now, while you still have the working device.

Record the verification date in the Backup Health dashboard, which will remind you when it's due again.

---

## Verify a passphrase before funding

A BIP-39 passphrase creates an entirely separate wallet. One different character produces a valid, empty, permanently different wallet — and you'd have no way to know until funds vanished into it.

**Always verify before sending anything.**

1. Set the passphrase on your device. Note the resulting fingerprint.
2. Offline in Coldbox, enter the seed and the passphrase. Compare fingerprints.
3. Match: the passphrase is exactly what you think. Fund it.
4. Mismatch: you typed something different somewhere. Find out which before proceeding.

Then send a small test amount first, and confirm it appears where expected.

---

## Verify an xpub

Your desktop wallet holds an xpub that generates every address it will ever show you. If that xpub is wrong, every address is wrong.

Export the xpub from the device directly and compare against what your software holds. Long strings — use Coldbox's constant-time compare rather than reading them.

---

## How often

| Check | When |
|---|---|
| Receive address | **Every time you receive a significant amount** |
| Device fingerprint | After restoring; when buying used; annually |
| Metal backup | Annually, and after any change |
| Passphrase | Before first funding; after any device reset |
| xpub | When setting up new software |

---

## If verification fails

**Stay calm and change nothing.** A mismatch is information, not yet a loss.

1. **Don't move funds** using the suspect setup.
2. **Rule out configuration.** Wrong script type and wrong path account for most mismatches.
3. **Try a different computer.** If the mismatch follows the computer, that computer is the problem. If it follows the device, the device or its seed is.
4. **If your computer is compromised:** stop using it. Move funds from a clean machine, using addresses you've verified on a clean machine.
5. **If your backup is wrong:** you still have the working device. Create a correct backup immediately, verify it, then destroy the incorrect one so it can't confuse anyone later.

The point of verifying regularly is that you find these things while they're still fixable.
