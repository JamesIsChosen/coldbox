# Creating your first wallet

Generating a seed phrase whose randomness you can verify.

> **When to use this:** learning, creating a backup seed, or generating a seed to load onto a hardware wallet that supports import. For a device you're setting up fresh, letting the device generate its own seed is usually the better choice — the seed then never exists outside it.

---

## Before you start

**Go offline.** Physically disconnect. The warm-shell status should settle on **No external reachability detected** and the cold-realm status must remain **sealed**. That display is a useful cross-check, not proof that every physical/virtual network path is absent; verify the radios/cable yourself.

The tools work online — the cold realm can't reach a network regardless — but for a seed that will hold real value, an offline machine removes an entire category of risk for zero cost.

**Have ready:** casino-grade dice if you have them (ordinary dice work), pen and paper for the interim, and your permanent backup medium (metal preferred).

---

## 1. Generate entropy

Entropy Lab → choose your source.

| Source | For 128 bits | For 256 bits |
|---|---|---|
| d6 dice, base-6 | 50 rolls | 100 rolls |
| d6 dice, 1–4 discard | 64 rolls | 128 rolls |
| Coin flips | 128 | 256 |
| CSPRNG | instant | instant |

**Use Mixing mode** for anything holding real value.

::: plain
Mixing mode combines your dice rolls with the computer's own randomness before using either. That way, a loaded die alone can't hurt you, and a broken random-number generator alone can't hurt you either — both would have to fail at once, which is a much taller order.
:::
::: working
Mixing mode XORs your recorded entropy with the system CSPRNG's output, then hashes the result. Neither source alone determines the final entropy, so a weighted die *or* a compromised RNG can't compromise the outcome on its own.
:::
::: technical
The combiner computes `SHA-256(user_entropy XOR csprng_output)` (or the equivalent for the chosen bit length): XOR with an independent uniform source is itself uniform regardless of the other input's distribution, and the hash step destroys any residual structure, so security holds unless *both* inputs are simultaneously compromised.
:::

### Watch the Entropy Health Meter

Two numbers, side by side:

- **Claimed** — what your input should yield
- **Measured** — bias-corrected min-entropy actually achieved

::: plain
A gap between the two numbers means your source is leaning one way — like a die that lands on 6 a little too often. Fifty rolls of a die like that would claim about 129 bits of randomness on paper, but actually hand you less.
:::
::: working
A gap between claimed and measured entropy means bias was detected in the source. Fifty rolls of a loaded die claim 129 bits of entropy but deliver fewer, because the bias makes some outcomes predictable.
:::
::: technical
"Claimed" is `rolls × log2(faces)` (or the equivalent for the chosen source); "measured" is bias-corrected min-entropy, `H_∞ = -log2(max probability)` estimated over the recorded sequence, which is always ≤ the claimed figure and equal only for a perfectly uniform source.
:::

| State | Meaning |
|---|---|
| 🔴 Insufficient | Blocked. Keep rolling |
| 🟠 Marginal | Enough rolls, bias detected. Investigate before overriding |
| 🟡 Adequate | ≥128 bits. Fine |
| 🟢 Strong | ≥256 bits |

**Insufficient cannot be overridden.** There's no legitimate reason to generate a seed from too little entropy.

If you see pattern warnings — long runs, sequences, alternation — check your recording. Real dice do produce runs, so it's a prompt to look, not an accusation. See [entropy and strength](../04-reference/entropy-and-strength.md).

---

## 2. Generate the seed

Seed Forge → the entropy carries over. Choose 12 words (128 bits) or 24 (256 bits).

Both are beyond brute force. 24 words is margin against future cryptanalysis, not a fix for a weak 12. Some hardware wallets require 24.

**Record the master fingerprint** — eight hex characters shown alongside. This is how you'll identify the wallet everywhere without revealing anything secret.

---

## 3. A passphrase? Decide now

An optional extra secret creating a completely separate wallet.

::: plain
**For:** even someone who finds your seed phrase still can't spend anything, because the real wallet needs the passphrase too — and you can even keep a small decoy amount on the plain seed to make that plausible.

**Against:** one forgotten or mistyped character, and the wallet is gone forever. It's a whole second secret that needs its own backup, and after untested backups, it's the single biggest cause of people permanently losing funds.
:::
::: working
**For:** the passphrase derives a wallet that's inaccessible without it, so a compromised base seed alone doesn't expose the funds — and a small balance can be left on the base (passphrase-less) wallet as a plausible decoy.

**Against:** it's a second secret with no error correction. Any deviation from the exact string produces a different, valid, empty wallet with no warning. It's the second most common cause of permanent loss after untested backups.
:::
::: technical
The passphrase is used verbatim (after UTF-8 NFKD normalization) as PBKDF2-HMAC-SHA512 salt material alongside the mnemonic — see "Passphrase" in the [glossary](../00-overview/glossary.md) — so there is no checksum or verification step analogous to BIP-39's word-list checksum; a one-character deviation silently derives a different, internally-valid seed.
:::

**If you use one:** generate it in Passphrase Studio (six Diceware words minimum), back it up as carefully as the seed but stored *separately*, and **verify the fingerprint** before sending anything.

---

## 4. Write it down

Pen and paper for now. Metal comes next.

- Number every word, `1.` through `12.` or `24.`
- Write clearly. `5`/`S`, `1`/`l`, `0`/`O` cause real losses
- Use the app's large-print mode
- **Never photograph it.** Phone photos sync to cloud backup automatically
- **Never type it into anything else.** Not a password manager, not a note, not a text field "just temporarily"

Then check every word against the numbered list on screen, twice.

---

## 5. Verify before you trust it

Re-enter what you wrote, from your paper, not from the screen. If the checksum fails or the fingerprint differs, you made a transcription error — fix it now.

This takes two minutes and catches the mistake that would otherwise surface in five years when you actually need the backup.

---

## 6. Make it permanent

Paper burns, soaks, and fades.

| Medium | Assessment |
|---|---|
| Stamped steel plates | Best. Fire, water, and time resistant |
| Punched metal washers | Cheap and effective |
| Engraved titanium | Excellent, expensive |
| Paper in a safe | Better than nothing. Not permanent |
| Laminated paper | Traps moisture. Worse than plain paper |

For distributing across locations, see [SLIP-39](backup-slip39.md) or [codex32](backup-codex32.md).

---

## 7. Record it

Registry → Add wallet. Record the label, **fingerprint**, derivation path, script type, whether a passphrase is used, and which device holds it.

Do **not** store the seed itself unless you've decided that's right for this wallet — it's off by default for good reason.

Then Backup Lab → record where your metal backup lives, and set a verification reminder.

---

## 8. Test with a small amount

Before trusting it with anything meaningful:

1. Send a small amount.
2. Confirm it arrives at the address you expected.
3. **Wipe the device and restore from your backup.**
4. Confirm the funds are still visible.
5. Confirm the fingerprint matches.

Step 3 is the one people skip, and it's the one that actually tests the backup. Do it now, with a trivial amount at stake, rather than later with everything at stake.

---

## Common mistakes

| Mistake | Consequence |
|---|---|
| Photographing the seed | Cloud sync uploads it. Assume it's public |
| Typing it into a password manager | Now it's only as safe as that account |
| Not recording the derivation path | Recovery becomes guesswork |
| Not verifying the passphrase | Funds sent to a wallet you can't reproduce |
| Never testing the backup | You find out it's wrong when it's too late |
| One backup, one location | A single fire ends it |
| Telling nobody it exists | Your heirs never find it |

---

## Next

- [Back up with SLIP-39](backup-slip39.md) or [codex32](backup-codex32.md)
- [Verify a hardware wallet](verify-a-hardware-wallet.md)
- [Inheritance planning](inheritance-planning.md)
