# Verify a hardware wallet

**The most valuable thing this tool does.** If you use one feature, use this one.

---

## The attack

You want to receive Bitcoin. Your wallet software displays an address. You copy it, send it to whoever is paying you, and the money arrives — somewhere.

Address-swapping malware exists for exactly this. It watches for an address on your screen or clipboard and substitutes the attacker's. You never see the substitution. The transaction succeeds. The coins are simply not yours.

Your hardware wallet shows the true address on its own screen, which is why you're told to check it. But comparing 42 characters against a small display is tedious, and people stop doing it — or check the first four and last four characters, which malware defeats by generating an address with matching ends.

**The defence:** derive the address independently, in software that has no connection to the wallet application that might be lying.

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

**Compare master fingerprints** — eight hex characters, derived from the seed but revealing nothing about it.

1. Display the fingerprint on your device (often shown as XFP, in advanced or wallet info screens).
2. In Coldbox, **offline**, enter the seed phrase you believe it holds. Seed Forge shows the fingerprint immediately.
3. Compare.

**Match:** the device holds that seed. **Mismatch:** it doesn't — either a different seed, or a passphrase is active.

Neither side revealed the seed. This is why the fingerprint is the identifier used throughout the Registry.

---

## Verify a metal backup works

The failure everyone dreads: you need your backup, and it's wrong. Usually a transcription error made years earlier, never checked.

**You do not need to wipe a device to test this.**

1. Go **offline**. Airgap banner green.
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
