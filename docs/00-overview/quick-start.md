# Quick start

Ten minutes from download to a working vault. Read [what is this?](what-is-this.md) first if you haven't.

> ⚠️ **Pre-release.** No application code exists yet. This describes the intended flow and will be verified against the real thing before 1.0.

---

## 1. Download and verify

Get `coldbox-v1.0.0.html`, `.sha256`, and `.asc` from the GitHub releases page.

```bash
# macOS / Linux
shasum -a 256 coldbox-v1.0.0.html

# Windows PowerShell
Get-FileHash coldbox-v1.0.0.html -Algorithm SHA256
```

Compare against the `.sha256` file. If they differ, **stop** — you don't have the file you think you have.

Verify the signature too if you can. [Full instructions](../02-security/verification.md).

## 2. Choose where to run it

| Situation | Do this |
|---|---|
| Just exploring | Any computer. Don't enter real seeds |
| Real wallets, real money | An offline machine, or Tails from USB |
| Portfolio only | Any computer. Secrets stay sealed automatically |

The app enforces the distinction: when a network connection exists, the secret half of your vault will not decrypt. You don't have to remember to be careful.

## 3. Open it

Double-click on a supported desktop browser. On Android, open from the Files app. Direct local HTML execution from iOS Files is currently a blocked portability target; see [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md).

Check the banner across the top:

- 🟢 **Airgapped** — offline, everything available
- 🟡 **Online — secrets sealed** — tools work, secrets locked
- 🔴 **CSP failure** — something is wrong; don't proceed

Then check the capability panel, which reports what your browser supports. Do not treat an iOS Files Quick Look preview as an application run.

## 4. Create your vault

**Vault → Create new.**

Your passphrase is the only thing standing between an attacker with your vault file and everything in it. Use a Diceware passphrase from the Passphrase Studio — six words is roughly 77 bits, and far easier to remember than random characters.

**Write it down and store it physically, right now.** Until recovery shares ship in Phase 2, it is the only way in.

Pick a KDF profile. **Standard** (64 MiB) suits most machines; use **Fast** if you'll open the vault on an old phone. Benchmark first — a vault you can't open on your phone is a problem worth finding now.

## 5. Save it

Vault → Save. Depending on your device you'll get a file picker, a download, or a base64 export to paste elsewhere.

The app then asks you to **re-open the file you just saved** and confirms it decrypts. Don't skip this. A backup you haven't opened is not a backup.

Keep the app and the vault together on the same USB stick, and keep a second copy somewhere else.

## 6. Record your first wallet

You don't need to create anything new — start by recording what you already have.

**Registry → Add wallet.** Enter a label, the device holding it, and its master fingerprint (your hardware wallet can display this). Add the xpub if you have it, which lets Coldbox derive addresses for verification and balance lookups.

Notice you haven't entered a seed phrase. You don't need to. The registry is fully useful with no secrets at all.

## 7. Verify something

This is the point of the whole tool. **Devices → Verify → Receive address.**

Enter your account's xpub, pick the script type, and generate the first few addresses. Compare against what your hardware wallet displays. If they match, your wallet software is telling you the truth.

If they don't, you may have just caught malware. [Full guide](../03-guides/verify-a-hardware-wallet.md).

## 8. Record a backup

**Backup Lab → Record existing backup.** Where is your metal plate? Who else knows? When did you last confirm it's readable?

The Backup Health dashboard now tracks it and will flag it when verification is overdue.

---

## Where to go next

| I want to... | Guide |
|---|---|
| Create a new wallet properly | [First wallet](../03-guides/first-wallet.md) |
| Split a seed across locations | [SLIP-39](../03-guides/backup-slip39.md) · [codex32](../03-guides/backup-codex32.md) |
| Recover a damaged seed | [Recover a seed](../03-guides/recover-a-seed.md) |
| Track my portfolio | [Portfolio setup](../03-guides/portfolio-setup.md) |
| Go properly offline | [Going airgapped](../03-guides/going-airgapped.md) |
| Plan for my heirs | [Inheritance planning](../03-guides/inheritance-planning.md) |

---

## Three things that lose people money

**Untested backups.** You find out it's wrong when you need it. The app makes you reconstruct from your shares before marking a backup complete — let it.

**Forgotten passphrases.** A BIP-39 passphrase with one character different is a valid, empty, permanently different wallet. Verify the fingerprint before funding it.

**Undocumented derivation paths.** "My coins vanished" is nearly always "my wallet is looking at a different path." Record the path for every wallet.
