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
- **Measured** — an observed min-entropy estimate from the outcomes recorded so far

::: plain
A gap between the two numbers means your source is leaning one way — like a die that lands on 6 a little too often. The estimate is a prompt to inspect the recording, not proof that the die or the platform RNG is good or bad.
:::
::: working
A gap between claimed and measured entropy is evidence that the recorded outcomes differ from the source model. Small samples can make the statistical tests unavailable, and a passing test cannot prove a source is fair.
:::
::: technical
The exact claimed-bit and observed-estimate definitions, including the finite-sample limits and unavailable-test rules, are maintained in [entropy and strength](../04-reference/entropy-and-strength.md) and [ADR-0027](../05-development/adr/0027-entropy-health-statistical-diagnostics.md). The analyzer is evidence about physical/manual recordings only; device-RNG simulations are excluded.
:::

| State | Meaning |
|---|---|
| 🔴 Insufficient | Below the selected target. P1.2 advisory; Seed Forge still requires the selected fresh CSPRNG target |
| 🟠 Marginal | Target reached but chi-square flags bias. P1.2 advisory; Seed Forge asks for an explicit acknowledgement |
| 🟡 Adequate | Reaches the selected target without a chi-square flag, below 256 bits |
| 🟢 Strong | ≥256 bits |

These are P1.2 Entropy Lab labels, not a statistical generation gate. For the P1.3 handoff, click **Mix entropy**, then **Use this mix in Seed Forge**; the exact selected-size result is consumed once and is never silently remixed. A later Entropy Lab input or output-size change clears the pending result. Seed Forge asks for an explicit acknowledgement when the selected physical/manual source is marginal, and a shortage of fresh CSPRNG bytes fails closed rather than producing a shorter phrase.

If you see pattern warnings — long runs, sequences, alternation — check your recording. Real dice do produce runs, so it's a prompt to look, not an accusation. See [entropy and strength](../04-reference/entropy-and-strength.md).

---

## 2. Generate the seed

Seed Forge → select **Use this mix in Seed Forge** to consume the recorded Entropy Lab result. Choose 12, 15, 18, 21, or 24 words (128–256 bits), and choose the BIP-39 language. A separate Generate action is available for a fresh CSPRNG-only result.

Both are beyond brute force. 24 words is margin against future cryptanalysis, not a fix for a weak 12. Some hardware wallets require 24.

**Record the master fingerprint** — eight hex characters shown alongside. This is how you'll identify the wallet everywhere without revealing anything secret.

::: plain
Seed Forge keeps the phrase hidden until you reveal it briefly for writing down. It checks an existing phrase word by word, tells you if the checksum is wrong, and shows a short fingerprint so you can recognize the same wallet later. An advanced raw BIP-39 seed is masked by default and has no clipboard or storage action.
:::
::: working
Seed Forge turns the exact Entropy Lab Mix result into a BIP-39 phrase, or validates one you paste into the sealed realm. Generate and Validate Existing Phrase each have their own optional passphrase pair. One character changed creates a different wallet, so that workflow's raw seed and fingerprint are withheld until its two entries match; once they match, only that workflow recalculates for its current phrase.
:::
::: technical
Generation uses the vendored BIP-39 wordlists with NFKD normalization. Each workflow's optional passphrase is NFKD-normalized as PBKDF2-HMAC-SHA512 salt material with 2,048 rounds; its raw 64-byte BIP-39 seed and master fingerprint are recalculated on confirmed changes to that workflow's pair only. Japanese's U+3000 display separator is NFKD-normalized in the final PBKDF2 mnemonic text. These values stay inside the cold iframe.
:::

### Release it for the cold-only tools

After checking your written phrase, choose **Release ... secret to switcher** in Seed Forge. Give it a label if you will load more than one. The switcher shows the label and public master fingerprint, and the focused fingerprint is repeated on the split, backup-share, SeedQR, and verification panels before you act.

::: plain
Release is a short-term handoff inside the sealed part of Coldbox. It saves you from typing the same phrase into every offline tool. It is not a backup, and it disappears when you lock, go idle, use panic hide, close the sealed realm, or choose **Clear released secrets**.
:::
::: working
You can release several Seed Forge results. Exactly one is focused; choose **Focus this secret** to change which phrase the cold-only tools use. Check the fingerprint beside the action before splitting shares or making a plaintext SeedQR. **Ctrl+Alt+Shift+L** clears the released-secret list immediately.
:::
::: technical
The registry is an in-memory cold-realm session object defined by [ADR-0045](../05-development/adr/0045-released-secret-model.md). It is never written to a vault, browser storage, or a message to the warm shell; its retained byte buffers are zeroized on the documented teardown paths. A focus change clears dependent derived outputs so a prior secret cannot remain displayed as if it were current.
:::

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

**If you use one:** generate it in Passphrase Studio (six Diceware words minimum), back it up as carefully as the seed but stored *separately*, and **verify the fingerprint** before sending anything. The vault-creation form repeats the human-chosen guidance live as an unknown range rather than inventing a numeric score; ordinary unlock does not show creation guidance.

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

Open the vault, then choose Registry. Create a wallet record and record the label, **fingerprint**, derivation path, script type, and network. Add an account under that wallet, then add the receiving addresses you want to keep visible. These are public records, so never put a seed phrase, passphrase, or private key in a label or note.

::: plain
The Registry is your address book. Unlock the vault, add a wallet, then add its account and receiving addresses. The labels help you recognise the record later; they are not a place for secrets.
:::

::: working
Registry records are public vault metadata. A Wallet links to Accounts, and an Account links to Addresses. Coldbox generates record IDs with secure randomness, keeps hidden records for history, and marks the vault unsaved until you save the encrypted file.
:::

::: technical
P1.6 persists Wallet, Account, and Address CRUD through the typed `publicData.replace` / `publicData.updated` channel pair. The protocol applies collection-specific schemas, bounds text, rejects secret-shaped values, and the cold session refuses a public replacement that changes the authenticated Vault ID. See [architecture.md](../01-spec/architecture.md) and [ADR-0031](../05-development/adr/0031-public-registry-mutation-boundary.md).
:::

P1.7 adds public Markdown notes and shared tags to those records. The Registry
form says **public note** deliberately: a note marked `secret` belongs in the
sealed realm and is rejected by the public projection rather than being hidden
with CSS. Hidden records are soft-hidden from lists, search, and future totals;
revealing them for the current session asks you to re-enter the vault phrase in
the sealed realm. Privacy blur is a screen-privacy aid, not a cryptographic
boundary, and Panic hide still locks the vault immediately.

::: plain
Add a note when a label is not enough. Public notes stay visible with your
wallet records; tags help you find related records. If a note would reveal a
passphrase hint or another secret, keep it in the sealed realm instead.
:::

::: working
Tags are shared across wallets, accounts, addresses, and notes. Search the
Registry to filter them. Hiding a record is reversible, but it keeps the record
out of the normal view until you re-enter the vault phrase inside the sealed
realm for this session.
:::

::: technical
The public protocol accepts bounded `visibility: public` Note records only.
`concealment.reveal` carries an empty request; the cold realm re-authenticates
against the encrypted session and returns only `concealment.revealed { revealed
}`. See [ADR-0032](../05-development/adr/0032-notes-tags-and-concealment.md).
:::

P1.8 adds a Devices page for the hardware wallets and backup context around
your public registry. It is an inventory and reminder surface, not a hardware
connection: Coldbox does not read, unlock, derive from, or sign with a device
from this page. Everything recorded there is public vault metadata.

::: plain
Use Devices to record the vendor, model, firmware, location, lifecycle status,
and public seed fingerprints associated with a hardware wallet. You can hide a
retired or sensitive-to-display record and reveal it again for the current
unlocked session. Never type a seed phrase, passphrase, private key, or xprv
into a device record.
:::

::: working
Device records are stored in the public compartment and are edited only while
the vault is unlocked. The form includes tamper-check notes, PIN dates,
purchase context, optional seed fingerprints, a boolean that records whether a
BIP-39 passphrase wallet is used, physical location, notes, and one of the
documented lifecycle states. That boolean is only yes/no metadata; it is not a
place to enter the passphrase.
:::

::: technical
The closed `devices` collection uses the canonical fields and enum in
[data-model.md](../01-spec/data-model.md). Writes use the typed
`publicData.replace` / `publicData.updated` projection boundary; UUIDs use the
existing CSPRNG-backed Registry path; unknown fields, invalid ISO dates,
invalid fingerprints, invalid lifecycle states, and secret-shaped text are
rejected. See [ADR-0033](../05-development/adr/0033-device-registry.md).
:::

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
