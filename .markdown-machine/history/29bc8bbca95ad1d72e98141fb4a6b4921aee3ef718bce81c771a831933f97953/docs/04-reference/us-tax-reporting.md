# US tax reporting

What the exporter produces and why, with the rules it implements.

**Not tax advice.** Coldbox produces records; it does not file, does not know your circumstances, and is not a substitute for a professional. Rules cited here were current as of August 2026 and change frequently — verify before relying on any of it.

*Last reviewed: 2026-08-02*

---

## The rule that shaped the design

**Per-wallet cost basis tracking is mandatory as of 1 January 2025.**

[Rev. Proc. 2024-28](https://www.irs.gov/pub/irs-drop/rp-24-28.pdf) eliminated the "universal wallet" method, under which taxpayers pooled all holdings of an asset across every wallet and exchange into one basis pool. Cost basis methods now apply **per wallet or per account**.

This is not an export-format concern — it's a data model requirement. A tracker with one global lot pool per asset cannot produce correct 2025+ figures no matter how it formats the output. Selling 1 BTC from your Coldcard consumes lots acquired *in that wallet*, not the cheapest BTC you happen to own somewhere else.

Coldbox therefore keys lot pools by `(walletId, asset)`. See [data-model.md](../01-spec/data-model.md).

**Safe harbor:** taxpayers were required to allocate unused basis to specific wallets before 1 January 2025 to qualify for penalty protection under the safe harbor, and **that allocation is irrevocable**. If you made one, record it — the exporter includes an allocation record so your figures can be reconciled against what you filed.

---

## Which methods are actually allowed

| Method | Status |
|---|---|
| **FIFO** | Always available. The default if you cannot substantiate anything else |
| **Specific identification** | Allowed **with adequate contemporaneous records** |
| HIFO / LIFO | **Not independent methods.** They are specific identification with a selection rule, and carry the same documentation burden |

This distinction matters and is widely misunderstood. Portfolio software offering "HIFO" as a menu option implies a standing election exists. It doesn't — HIFO is only defensible if you can show contemporaneous records identifying which units were disposed of.

[Notice 2026-20](https://www.currentfederaltaxdevelopments.com/blog/2026/3/18/extension-of-temporary-relief-for-digital-asset-identification-a-technical-review-of-notice-2026-20) extended transition relief on providing identification instructions *to a broker* through the end of 2026. It did **not** remove the documentation obligation — it relocated it from the broker's records to yours.

So when you select anything other than FIFO, Coldbox writes a lot-level audit trail recording which specific lots were identified, when, and on what basis. That trail is the substantiation.

---

## Form 8949 box codes

Digital assets got their own checkboxes for tax year 2025 onward. Using the old securities boxes is wrong.

| Term | Box | Meaning |
|---|---|---|
| Short | **G** | 1099-DA received, basis **was** reported to the IRS |
| Short | **H** | 1099-DA received, basis **was not** reported |
| Short | **I** | No 1099-DA received |
| Long | **J** | 1099-DA received, basis **was** reported |
| Long | **K** | 1099-DA received, basis **was not** reported |
| Long | **L** | No 1099-DA received |

**Do not use box C or F for digital assets.** Those remain for other property.

A separate Form 8949 page is required per box code, so the exporter groups rows by code and can emit one file per group.

**Short vs long term:** held **more than one year** is long-term. Exactly one year is short-term. Coldbox computes from acquisition date to disposal date and flags lots within 30 days of crossing the boundary, since that's a decision point worth seeing before you sell.

---

## Form 1099-DA

Brokers began reporting 2025 transactions on [Form 1099-DA](https://www.irs.gov/instructions/i1099da), furnished to you and the IRS in 2026.

**Brokers were not required to report cost basis for 2025 transactions.** Your 1099-DA shows proceeds; basis is blank or unreported. You supply it.

The consequence is worth stating plainly: **if you don't supply basis, the IRS computes your gain as 100% of proceeds.** For anyone who bought and held, that overstates the gain by the entire purchase price.

The IRS matches 1099-DA against your Form 8949 automatically. Mismatches generate notices. So the exporter produces a **reconciliation report**: your records against each 1099-DA, per broker, flagging proceeds discrepancies, missing transactions, and transactions you recorded that no broker reported.

---

## Wash sales

**The wash sale rule (IRC §1091) does not apply to cryptocurrency**, because crypto is treated as property rather than a security.

**But it does apply to spot crypto ETFs** — IBIT, FBTC and similar are securities, and the rule applies fully.

Coldbox therefore does not apply wash sale adjustments to crypto positions, and flags any holding tagged as an ETF so you don't assume the same treatment. Legislative proposals to extend §1091 to digital assets have appeared repeatedly; the reference date at the top of this document is there for a reason.

---

## Income versus capital gains

Two different reporting paths, and conflating them is a common error:

| Event | Treatment | Form |
|---|---|---|
| Sell, swap, or spend crypto | Capital gain or loss | **8949 → Schedule D** |
| Mining, staking, airdrops, interest, payment for work | **Ordinary income** at fair market value on receipt | Schedule 1, C, or B |
| Transfer between your own wallets | **Not a taxable event** | None |
| Gift given | Generally not a disposal; may need Form 709 | — |
| Gift received | Not income; basis carries over | — |

Income events also **establish basis** for the asset received, at the FMV recognized. Coldbox creates a lot at that value automatically, so staking rewards later sold have the correct basis rather than zero.

The exporter emits income events as a **separate file** from capital gains, since they belong on different forms.

---

## The transfer trap

**Moving crypto between your own wallets is not a disposal.** It preserves the original acquisition date and cost basis.

This is the single most common bug in portfolio software, and it fails silently — every downstream gain figure is wrong, in a way that looks plausible. It's also more consequential now that basis is tracked per wallet: a transfer must move the **lots themselves**, with their original dates and bases, from the source pool to the destination pool.

Coldbox models transfers as lot movement, and the exporter includes a transfer ledger so a preparer can see that dates and bases were carried rather than reset.

---

## What the exporter produces

| File | Contents |
|---|---|
| `form-8949-<code>.csv` | One per box code, in IRS column order |
| `schedule-d-summary.csv` | Totals per box code and term |
| `income.csv` | Ordinary income events with FMV and source |
| `lot-audit-trail.csv` | Every lot: acquired, disposed, method, wallet, selection basis |
| `transfers.csv` | Inter-wallet movements showing preserved dates and bases |
| `1099-da-reconciliation.csv` | Your records vs each broker's form |
| `basis-allocation.csv` | Rev. Proc. 2024-28 safe harbor allocation, if recorded |
| `README.txt` | Method used, date range, software version, and the caveats |

### Form 8949 columns

| Col | Content |
|---|---|
| (a) | Description — `0.51000000 BTC` |
| (b) | Date acquired (MM/DD/YYYY) |
| (c) | Date sold (MM/DD/YYYY) |
| (d) | Proceeds, USD |
| (e) | Cost or other basis, USD |
| (f) | Adjustment code, if any |
| (g) | Adjustment amount — **negative** for transaction costs |
| (h) | Gain or loss — (d) − (e) + (g) |

Fees reduce proceeds or increase basis as appropriate; the audit trail shows which treatment was applied per transaction.

Rows are one per disposed lot, not one per transaction — a sale consuming three lots produces three rows, which is what the form requires.

### Also exported

**TurboTax and TaxAct CSV profiles**, since those are what most people actually import. Their formats differ from the IRS column order and from each other.

---

## What the exporter will not do

- **Decide your method.** You choose; it applies consistently and documents what it did.
- **Guess missing basis.** A lot without basis is flagged as missing, not defaulted to zero. Zero basis is a real answer with real tax consequences and should never appear by accident.
- **Handle DeFi, LP tokens, wrapped assets, bridges, or NFTs** with any confidence. It records what you tell it. The tax treatment of these is unsettled and frequently disputed — get advice.
- **File anything.**
- **Cover non-US jurisdictions.** The 8949 profile is US-specific; the raw lot export is jurisdiction-neutral and usable anywhere.

---

## Records to keep

The exporter output plus, per the contemporaneous records requirement:

- Trade confirmations and exchange statements
- Wallet addresses and transaction IDs
- Timestamps
- Basis calculations
- Any specific-identification instructions you made
- Your safe harbor allocation, if applicable

Coldbox's audit trail covers the calculation layer. It cannot manufacture confirmations you never kept — which is the argument for recording transactions as they happen rather than reconstructing years later.

---

## Sources

- [Form 8949 (2025)](https://www.irs.gov/pub/irs-pdf/f8949.pdf) and [instructions](https://www.irs.gov/pub/irs-pdf/i8949.pdf)
- [Form 1099-DA instructions (2026)](https://www.irs.gov/instructions/i1099da)
- [Rev. Proc. 2024-28](https://www.irs.gov/pub/irs-drop/rp-24-28.pdf) — per-wallet tracking, safe harbor
- [Notice 2026-20 analysis](https://www.currentfederaltaxdevelopments.com/blog/2026/3/18/extension-of-temporary-relief-for-digital-asset-identification-a-technical-review-of-notice-2026-20) — specific identification relief extended
- [Navigating the Form 1099-DA reporting maze](https://www.thetaxadviser.com/issues/2026/mar/navigating-the-form-1099-da-reporting-maze/) — The Tax Adviser
