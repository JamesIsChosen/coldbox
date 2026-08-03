# Inheritance planning

Making sure your crypto reaches your heirs instead of being lost forever.

---

## The problem

Self-custody removes the intermediary who would otherwise handle this. There is no bank to call, no account to claim, no process for a grieving family to follow. If nobody can find and use your keys, the funds simply stop existing for any practical purpose.

The failure is usually not exotic. It's ordinary:

- Nobody knew crypto existed
- They knew, but not where the backup was
- They found the backup and didn't know what to do with it
- They found the seed and not the passphrase
- Everything was there and nobody understood derivation paths
- The backup was wrong, and had never been tested

Every one of these is preventable with an afternoon's work.

---

## The tension

Two requirements pulling opposite ways:

**Security** wants no single person able to take your funds while you're alive.
**Inheritance** wants your heirs able to access them without you.

Anything satisfying only the first fails your family. Anything satisfying only the second is a standing risk. The good approaches satisfy both by **separating knowledge from capability**.

---

## Layer 1 — The letter of instruction

The single highest-value thing you can do, and it contains **no secrets at all**.

Generate it: Registry → Reports → Inheritance letter.

It records:

- That crypto assets exist, and roughly what
- Where backups are physically located
- Who holds shares, and their contact details
- Which devices exist and where
- Derivation paths and fingerprints
- What to do first, in plain language
- Who to contact for help

**Because it contains no secrets, you can store it openly** — with your will, with your lawyer, in a home safe, given to your executor.

This alone converts "we found some strange metal plates and a USB stick" into "there are instructions."

Update it annually. The app flags it when stale.

---

## Layer 2 — Vault recovery shares

*Available from Phase 2.*

Your vault holds the records: which wallet is which, where every backup is, which passphrase belongs to which device, your notes.

Currently the passphrase is the only way in. Recovery shares add a second route: the vault key is split via SLIP-39 into printed cards, and any threshold reconstructs it **without the passphrase**.

**A 2-of-3 example:**

| Share | Holder |
|---|---|
| 1 | Your lawyer, with your will |
| 2 | Your spouse or eldest child |
| 3 | Bank safe deposit box |

No single holder can open it alone. Any two can. Your lawyer plus one family member is a natural quorum after a death, and a difficult one to assemble casually while you're alive.

---

## Layer 3 — Seed backup distribution

The vault tells them where things are. The seed backups are the things themselves.

Applying [SLIP-39](backup-slip39.md) or [codex32](backup-codex32.md) to the seeds themselves gives the same property: distributed, no single point of compromise, recoverable by a quorum.

**Keep the quorums distinct.** If the same two people hold both the vault threshold and the seed threshold, you've built one quorum wearing two hats.

---

## Layer 4 — Timelocks

*Phase 5, and worth understanding now.*

Miniscript lets you encode conditions directly into the Bitcoin spending policy. A common inheritance pattern:

```
Me, any time
  OR
My heirs, after 1 year of no activity from me
```

You spend normally, which resets the timer. If you stop — because you died — the heir path becomes spendable after the delay.

**Advantages:** enforced by Bitcoin itself, no trusted third party, no reliance on anyone following instructions.

**Costs:** more complex, needs wallet support (Nunchuk shipped generalized miniscript in 2026; Coldcard, Jade, and Ledger support native SegWit miniscript), and you must actually move funds periodically or the heir path activates while you're alive.

Coldbox can parse and display these policies and record them. It does not construct or sign transactions.

---

## Choosing custodians

| Candidate | Consider |
|---|---|
| Spouse/partner | Usually first. Will they outlive you? |
| Adult children | Good if capable. Consider relationships between them |
| Sibling | Good geographic separation |
| Lawyer | Professional, neutral, likely to be findable. Fees apply |
| Close friend | Depends entirely on the friend |
| Bank safe deposit | No human judgement, but access after death can be slow |

**Practical rules:**

1. **Geographic separation.** Custodians in the same house share a fire.
2. **Generational spread.** All custodians your age may all predecease your heirs.
3. **Tell them what they hold** — not what it protects. "Keep this sealed; give it to my executor" is enough, and keeps them safe.
4. **Give them the letter's location**, not the letter's contents.
5. **Review annually.** Relationships change.

---

## The rehearsal

The step almost nobody takes, and the one that actually tests the plan.

**Walk a trusted heir through recovery while you're alive**, using a wallet holding a trivial amount.

1. Give them only what they'd have if you died.
2. Watch them attempt recovery. **Don't help.**
3. Note every point where they get stuck.
4. Fix your documentation at those points.
5. Repeat until they can do it unassisted.

This will reveal that your instructions are less clear than you believed. Everyone's are. Better to learn it now.

---

## Practical and legal

**Your will.** Crypto is property. Reference its existence and point to your instruction letter, but **never put a seed phrase in a will** — wills become public record in many jurisdictions.

**Your executor.** Should know crypto exists and that specialised instructions exist. They don't need to understand it, only to know who does.

**Taxes.** Cost basis and acquisition dates matter to your estate. The portfolio's records are directly useful here, and are far easier to maintain now than to reconstruct later.

*Not legal or tax advice. Jurisdictions differ substantially. Talk to a professional who has handled digital assets — and be aware that many haven't.*

---

## Checklist

- [ ] Instruction letter written, no secrets, stored where it'll be found
- [ ] Letter reviewed within the last year
- [ ] Backups tested within the last year
- [ ] At least two people know crypto exists
- [ ] Custodians know what they hold and what to do
- [ ] Shares geographically separated
- [ ] Vault recovery shares distributed *(Phase 2)*
- [ ] Passphrases documented and separately backed up
- [ ] Derivation paths recorded for every wallet
- [ ] Devices catalogued with locations
- [ ] Will references the plan without containing secrets
- [ ] **Rehearsal completed with a real heir**

The Backup Health dashboard tracks most of this and flags what's overdue.

---

## Related

- [SLIP-39](backup-slip39.md) · [codex32](backup-codex32.md)
- [Multisig quorum](multisig-quorum.md)
