# Backing up with SLIP-39

Splitting a seed into shares where any threshold reconstructs it, and fewer than that reveal **nothing**.

---

## Before you start: will your device restore it?

| Device | SLIP-39 |
|---|---|
| Trezor | ✅ Native |
| **Ledger** | ❌ |
| **Coldcard** | ❌ |
| BitBox02 | ❌ |
| Jade, Keystone, SeedSigner, Krux, Passport | ❌ |

**If your device can't restore SLIP-39, these shares cannot recover your wallet on it.** You'd need to reconstruct the original BIP-39 seed in software first — which works, but means your recovery depends on software being available and trustworthy at that moment.

If you're not on Trezor, consider [codex32](backup-codex32.md) or plain metal backups with geographic distribution instead.

---

## How it works

Shamir Secret Sharing splits a secret into N shares with a threshold T.

::: plain
Any **T** shares put back together give you the exact original secret. Any **T−1** — one short of the threshold — give you **nothing at all**. Not a portion, not a hint, not "almost." Two shares of a 3-of-5 split don't get an attacker 40% of the way there. They get nowhere, same as zero shares.
:::
::: working
Any T shares reconstruct the secret exactly; any T−1 shares are information-theoretically independent of it — the guarantee holds regardless of computing power, not just against today's hardware.
:::
::: technical
See "Shamir Secret Sharing" in the [glossary](../00-overview/glossary.md): the secret is the constant term of a degree-(T−1) polynomial over a finite field, and T−1 points are consistent with *every* possible value of that constant term, so no information leaks below threshold.
:::

That second property surprises people.

---

## Choosing a configuration

| Config | Survives | Compromised by | Good for |
|---|---|---|---|
| 2-of-3 | 1 loss | 2 shares | Most people |
| 3-of-5 | 2 losses | 3 shares | More redundancy |
| 2-of-2 | nothing | 2 shares | Don't. No redundancy |
| 1-of-N | N−1 losses | **any 1 share** | Duplication, not splitting |

**2-of-3 is the sensible default.** You can lose any one share and still recover; someone finding any one share gets nothing.

**Single-share SLIP-39 is actively discouraged** — it adds complexity without improving on BIP-39.

### Two-level groups

SLIP-39 supports groups, letting you express conditions like "either both my siblings, or my lawyer plus one sibling."

```
Group threshold: 2 of 3 groups

Group 1 — Family      2 of 3 shares
Group 2 — Lawyer      1 of 1 share
Group 3 — Safe deposit 1 of 1 share
```

Powerful, and easy to overcomplicate. If you can't explain your configuration from memory, it's too complex — and your heirs certainly won't manage it.

---

## Generating

**Go offline.** Green banner.

1. Backup Lab → SLIP-39 → enter your seed phrase.
2. Choose your configuration.
3. Optionally set a share passphrase — a second secret, needing its own backup.
4. Generate.

Each share is 20 words (128-bit seed) or 33 words (256-bit), from SLIP-39's own 1024-word list. **These are not BIP-39 words** and are not interchangeable.

---

## Verify before you trust — mandatory

The app will not let you mark the backup complete until you reconstruct the seed from a threshold subset.

1. Set the generated shares aside.
2. Recovery → SLIP-39 → enter exactly T shares, typed from your written copies.
3. Confirm the reconstructed seed's fingerprint matches the original.

**Type them from your physical copies, not copy-paste.** The point is to verify what you wrote down, not what the app already knows. This step is where transcription errors surface — which is the whole reason it exists.

Test a different subset too. Shares 1+2 working doesn't prove 1+3 does.

---

## Recording shares

Each share needs, physically alongside it:

- Share index (1 of 5)
- Group, if used
- Threshold (needs 3 of 5)
- Creation date
- **What it's for** — "Bitcoin wallet, Trezor, fingerprint A1B2C3D4"
- A note that it's useless alone
- "Do not photograph"

Print from Backup Lab, sized to the SeedQR card templates. Then transfer to metal for anything long-term.

**Do not label them "Bitcoin backup."** That makes each one a theft target. "Document fragment 3 of 5" attracts less attention.

---

## Distribution

The whole point is that shares live in different places.

| Location | Notes |
|---|---|
| Home safe | Convenient. Fire risk |
| Bank safe deposit | Secure. Access limits, and jurisdiction matters |
| Trusted person | Choose carefully. Explain what it is and isn't |
| Work / second property | Reasonable if secure |
| Buried | Metal only. People forget where |

**Rules:**

1. Never store threshold-many shares in one place. Two of three in the same house is a house fire away from total loss, and a burglary away from total compromise.
2. Consider jurisdictions if that matters to you.
3. Tell holders what they have — not what it protects. "Keep this sealed, give it to my executor" is enough.
4. Record locations and custodians in the Registry so the Health dashboard can flag co-location.

---

## Recovering

1. Gather at least T shares.
2. Offline. Backup Lab → SLIP-39 → Recover.
3. Enter each share completely.
4. The app reconstructs the seed and shows the fingerprint. Confirm it's the one you expect.
5. Restore into your device.

**If a share won't validate:** SLIP-39 has checksums, so the app can usually tell you which word is wrong. Typos are far more common than damaged shares.

**If you're short of the threshold:** there is no partial recovery. Below T, the mathematics gives nothing. This is the property that makes shares safe to distribute, and it has no exceptions.

---

## Maintenance

**Annually:** confirm each share is where it should be, still legible, and the holder still has it. The Health dashboard tracks due dates.

**Every few years:** actually reconstruct from a threshold subset. Confirming a share exists is not confirming it's correct.

**Regenerate when:** a share is lost or compromised, a custodian relationship changes, or your configuration no longer fits your life. Regenerating produces an entirely new share set — destroy the old ones, or you'll have two valid sets in circulation and no idea which is which.

---

## Common mistakes

| Mistake | Consequence |
|---|---|
| Shares for a Ledger or Coldcard | Cannot restore on the device |
| All shares in one place | Defeats the purpose entirely |
| Never testing recovery | Discover the error when it's fatal |
| Not labelling threshold | Heirs don't know how many they need |
| Mixing share sets after regenerating | Neither set reconstructs |
| Telling holders it's Bitcoin | Each share becomes a target |
| Nobody knows the shares exist | Funds die with you |

---

## Related

- [codex32](backup-codex32.md) — verifiable by hand
- [Inheritance planning](inheritance-planning.md)
- [Hardware wallet matrix](../04-reference/hardware-wallet-matrix.md)
