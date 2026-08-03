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

**The reliable answer is a known address.** Any address that wallet has used — a receive address you gave someone, an address from a block explorer, or one recorded in your Registry.

Without one, you can find seeds with valid checksums, but not which is *yours*. Roughly 1 in 16 random 24-word combinations has a valid checksum, so "valid" is a weak filter.

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

**Two missing words:** ~4.2 million combinations. Seconds to minutes. Feasible.

**Three missing:** ~8.6 billion. Hours to days, and **only viable with a known address**. Without one you'd get millions of checksum-valid candidates and no way to choose.

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

Searches run in a Web Worker where available, or chunked on the main thread otherwise, with live progress and cancel. Close the tab and you lose progress — for long searches, leave it running.

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

The [Backup Health dashboard](../04-reference/hardware-wallet-matrix.md) exists to make the annual check something you're reminded about rather than something you intend to do.
