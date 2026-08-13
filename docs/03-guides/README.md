# Guides

Step-by-step for the flows where mistakes are expensive. These compile into the app's Help section, so what you read here is what you'll see in the app.

## Getting started

| Guide | |
|---|---|
| [Creating your first wallet](first-wallet.md) | Generating a seed whose randomness you can verify |
| [Portfolio setup](portfolio-setup.md) | Holdings, cost basis, prices, and the privacy tradeoffs |

## Verification

| Guide | |
|---|---|
| [Verify a hardware wallet](verify-a-hardware-wallet.md) | **Start here.** The most valuable thing this tool does |
| [Verify an address](verify-an-address.md) | Catching a swap between the copy and the paste — the gap the check above doesn't cover |

## Backup

| Guide | |
|---|---|
| [SLIP-39](backup-slip39.md) | Threshold shares — check device support first |
| [codex32](backup-codex32.md) | Shares verifiable by hand, no computer |
| [Shamir39 and raw SSS](backup-shamir.md) | Non-standard threshold shares for BIP-39 phrases or raw hexadecimal secrets |
| [Seed XOR](backup-seed-xor.md) | Coldcard-compatible N-of-N seed splitting |
| [Recover a damaged seed](recover-a-seed.md) | Missing words, typos, wrong order |

## Planning

| Guide | |
|---|---|
| [Multisig quorum](multisig-quorum.md) | Which key is where, and whether you could still spend |
| [Inheritance planning](inheritance-planning.md) | Making sure it reaches your heirs |
| [Going airgapped](going-airgapped.md) | Setting up a machine that's never online |
| [Using QR Studio](use-qr-studio.md) | Public address QRs and cold-only SeedQR backups |

---

## Writing guides

Guides compile into in-app help, so they use the three-depth structure:

```markdown
::: plain
No jargon. Analogy first.
:::

::: working
Correct terms, defined on use.
:::

::: technical
Full precision, spec references.
:::
```

The user picks a depth in settings; the app shows the matching block. A documented feature missing a depth block is a build warning.

**Style:** second person, active voice. Say what to do, then why. State consequences plainly — these guides cover operations that can lose someone everything, and softening that helps nobody. Where a step is commonly skipped, say that it's commonly skipped.
