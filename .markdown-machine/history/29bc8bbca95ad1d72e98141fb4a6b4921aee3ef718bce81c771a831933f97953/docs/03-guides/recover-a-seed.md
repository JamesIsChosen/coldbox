# Recovering a damaged seed

Missing words, typos, wrong order, failing checksums.

**Work offline.** You're about to handle a seed phrase.

---

## First: what's actually wrong?

| Symptom | Likely cause | Go to |
|---|---|---|
| Wallet restores, but empty | **Not a seed problem** — wrong derivation path or passphrase | [Derivation paths](../04-reference/derivation-paths.md) |
| "Invalid recovery phrase" | Checksum failure — a wrong word | [Typos](#typos) |
| A word isn't in the list | Misspelling or misreading | [Typos](#typos) |
| Missing one word | Illegible or lost | [Missing words](#missing-words) |
| Unsure of the order | Unnumbered list | [Wrong order](#wrong-order) |
| Missing several words | Depends how many | [Multiple missing](#multiple-missing) |

**Check the first row before anything else.** A wallet that restores but shows no funds is usually looking at the wrong path — the seed is fine. That's a five-minute fix, not a recovery operation.

---

## The stop condition

Nearly every recovery method produces candidates. You need a way to know which is right.

::: plain
The best answer is your xpub — the wallet's master public key, if you have it written down somewhere. It picks out your exact wallet, with no guessing involved.

Failing that, any address you know that wallet has used works too. You'll also need to tell the app roughly how many addresses the wallet made before that one, since it can only check so far down the list — set that too low and it'll walk right past your correct seed without noticing. The default is 20.

Without either, you can find seeds that *look* valid, but not which one is actually yours — a fair number of random word combinations pass the built-in checksum by pure chance.
:::
::: working
The strongest stop condition is a known xpub, which identifies the wallet outright. Next best is a known address plus a generation-limit (gap limit) setting the app checks up to — set it below the wallet's actual usage and the search silently misses the correct candidate. Without either, checksum validity alone is a weak filter: roughly 1 in 16 random 24-word combinations passes it.
:::
::: technical
See "Gap limit" and "xpub" in the [glossary](../00-overview/glossary.md). BIP-39's checksum is only `ENT/32` bits (4 bits for a 24-word/256-bit phrase), so a random 24-word sequence has roughly a 1-in-16 chance of passing checksum validation purely by coincidence — nowhere near enough to identify a specific wallet without an independent target (xpub or address) to check derived results against.
:::

Have an address ready before you start.

---

## Typos

**Recovery → Typo repair.** Paste what you have; invalid words are highlighted.

BIP-39's design helps here: **the first four letters of every word are unique.** If you can read the first four characters, the word is determined. `abando...` can only be `abandon`.

The app ranks suggestions by edit distance. Commonly confused pairs worth checking by eye: `chief`/`child`, `pistol`/`piston`, `soul`/`sound`, `use`/`used`, `arch`/`arctic`.

If exactly one word is wrong, this usually resolves in seconds.

---

## Checksum failure with all words valid

Every word is in the list, but the phrase is rejected. One word is wrong but happens to be another valid word — or the order is wrong.

**Recovery → Checksum repair** tries each position with every valid substitute and reports candidates with valid checksums. With a known address, it identifies the right one directly.

If the last word is the only problem, it's simpler: the final word encodes the checksum, so only a small set is valid. The app lists them.

---

## Missing words

**One missing word:** 2048 candidates per position. Instant.

- Known position → 2048 to check
- Unknown position → 2048 × word count

Either is trivial. **Recovery → Missing word.**

**Two or three missing words: how long depends on your phrase length**, and the difference is larger than most people expect. A 24-word phrase carries eight checksum bits, so only 1 in 256 combinations is worth testing. A 12-word phrase carries four, so 1 in 16 is — sixteen times more work for the same number of combinations.

| Missing | 24-word | 12-word |
|---|---|---|
| Two | ~4.2 M combinations — seconds | ~4.2 M combinations — **minutes** |
| Three | ~8.6 B — hours, with a known address | ~8.6 B — **days**, and often not worth starting |

Three missing words is **only viable with a known address or xpub**. Without one you'd get millions of checksum-valid candidates and no way to choose between them.

Times assume the search is narrowed — one derivation path, script type set. Leave it searching everything and multiply by about four.

---

## Multiple missing

**Four or more missing words is generally not recoverable.** Four is ~17 trillion combinations; each additional word multiplies by 2048.

The app tells you the number and an honest time estimate **before** starting, rather than spinning indefinitely. If it says the search is infeasible, that's a fact about the mathematics, not a limitation of the tool.

**Before giving up:** check for another copy of the backup, a partial record elsewhere, or a device still holding the seed. If any device still has the wallet loaded and functional, **your priority is moving the funds to a wallet you can back up properly** — not reconstructing the phrase.

---

## Wrong order

Words are correct but the sequence is uncertain.

- **Two adjacent words swapped** — trivial, checked instantly
- **Any two swapped** — 276 combinations for 24 words. Instant
- **Completely unknown order** — 24 factorial is about 6×10²³. Not feasible

If you have a partial ordering — you know the first twelve are right — the app can search only the uncertain portion, which is usually tractable.

---

## Passphrase recovery

You have the seed but not the passphrase.

**Recovery → Passphrase search** accepts a candidate list or generates variations of a base guess: case variants, digit suffixes, common substitutions, spacing differences.

Requires a known address. Success depends entirely on whether the real passphrase resembles your candidates.

**Be realistic.** If you have no idea what the passphrase was, it is not recoverable. That's what the passphrase is designed to guarantee, and it works as intended.

---

## Running a search

The app always shows, before starting: the number of combinations, an estimated time on your hardware, and what the stop condition is.

Searches run in a Web Worker where available, or chunked on the main thread otherwise, with live progress and cancel.

**For long searches, save a checkpoint.** Anything expected to run more than an hour offers an encrypted progress file you can reload later. Guard it like the seed itself — it contains the words you already have plus a map of exactly which ones are missing, which is far more useful to a thief than either piece alone. Delete it once you've recovered.

Without a checkpoint, closing the tab loses your progress.

Speed depends on script type: legacy is fastest, Taproot slowest. If you know the script type, set it and skip the others.

---

## After recovering

1. **Verify** the fingerprint matches your device, or the derived address matches your known one.
2. **Move the funds** to a new wallet with a fresh seed. The recovered seed has been through recovery software and possibly written in several places.
3. **Back up the new wallet properly**, and test the backup.
4. **Record the derivation path** this time.
5. **Set a verification reminder.**

Step 2 is the one people skip. You've just proved your backup process failed. Fix the process, don't just resume with the same setup.

---

## Prevention

Every recovery scenario here is preventable:

- Number the words when you write them
- Verify the backup immediately after creating it
- Verify annually
- Keep two backups in different places
- Record the derivation path and fingerprint
- Use metal, not paper
- Verify a passphrase before funding anything

The [Backup Health dashboard](backup-health.md) can remind you about a public
BackupRecord's annual share-reconstruction check. It does not replace reading
the physical copy, checking a passphrase, or confirming that a location is
reachable.
