# Portfolio setup

Tracking what you own, what you paid, and what it's worth — without handing anyone your keys or your API credentials.

---

## What it does and doesn't

**Does:** records transactions, computes cost basis and realized/unrealized gains, fetches live prices from five sources, looks up on-chain balances on request, handles multiple currencies.

**Doesn't:** connect to exchanges, execute anything, produce tax forms, or fetch anything without you asking.

**Works online.** Portfolio data lives in the vault's public compartment, which decrypts while connected. Your seeds stay sealed regardless.

---

## 1. Add your holdings

Two approaches.

**Track by address (Bitcoin, EVM, Solana).** Add addresses or an xpub to the Registry, and balances can be looked up on chain. Accurate, and requires no manual updating — but see the privacy note below.

**Track by transaction (everything, including exchanges).** Record what you bought and sold. Necessary for cost basis and gains, and the only option for custodial holdings.

Most people use both: addresses for balances, transactions for cost basis.

---

## 2. Record transactions

Portfolio → Transactions → Add.

| Type | Use for |
|---|---|
| `buy` / `sell` | Exchanging fiat for crypto or back |
| `swap` | Crypto for crypto — a disposal of one, acquisition of the other |
| `transfer-in` / `transfer-out` | **Moving between your own wallets** |
| `income` / `staking` / `airdrop` | Received without purchase |
| `fee` | Standalone fees |
| `gift-in` / `gift-out` | |
| `lost` | Written off |

### The one that matters most

::: plain
Moving coins from an exchange to your own hardware wallet isn't selling them — it's just moving them from one pocket to another. It shouldn't create a taxable gain, and the app needs to remember when and how much you originally paid for them, not treat the move as a fresh purchase.
:::
::: working
Transfers between your own wallets are not disposals: no gain is realized, and the original acquisition date and cost basis must carry forward unchanged onto the receiving wallet's lot pool.
:::
::: technical
See "Lot" in the [glossary](../00-overview/glossary.md): a transfer-in/transfer-out pair moves existing lots between per-wallet lot pools without closing them, preserving basis and acquisition date; only an actual disposal (sell, swap, spend) closes a lot and computes gain/loss, per [us-tax-reporting.md](../04-reference/us-tax-reporting.md)'s requirement that transfers "produce no disposal."
:::

Getting this wrong silently corrupts every gain figure downstream, and it is the most common bug in portfolio software. Coldbox models transfers as movement, not disposal.

### CSV import

Portfolio → Import. Map your columns, review the dry-run preview, then commit. Duplicates are detected by txid.

Import defaults to **manual pricing** — importing 500 rows should not fire 500 dated queries at an API without you deciding to.

---

## 3. Choose a cost basis method

**Set per wallet, not globally.** Since 1 January 2025, US rules require cost basis to be tracked per wallet or account — the old "universal" pooling of an asset across all your wallets is no longer permitted. Selling 1 BTC from your Coldcard consumes lots acquired *in that wallet*.

| Method | Effect |
|---|---|
| **FIFO** | Oldest lots first. Default, and what applies if you can't substantiate anything else |
| **Specific ID** | You choose which lots. Most control — and requires contemporaneous records |
| HIFO / LIFO | **Selection rules within specific ID**, not separate methods. Same documentation burden |
| Average cost | For jurisdictions that require it. Not generally available to US filers |

That HIFO/LIFO distinction trips people up. Software offering them as menu items implies a standing election exists; it doesn't. Whenever you use anything other than FIFO, Coldbox writes a lot-level audit trail recording which lots were identified and why — that trail *is* your substantiation.

**Changing a method recomputes everything and shows the delta** before committing.

Your jurisdiction may mandate a method or require consistency once chosen. Ask an accountant.

## 3a. Tax export

Portfolio → Reports → Tax export produces a filing-ready set: Form 8949 CSVs grouped by box code, a Schedule D summary, ordinary income as a separate file (it belongs on a different form), the lot audit trail, a transfer ledger, and a 1099-DA reconciliation. TurboTax and TaxAct profiles are included since those are what most people import.

Two things worth knowing before you rely on it:

**Your 1099-DA probably has no cost basis.** Brokers weren't required to report it for 2025 transactions. If you don't supply basis, the IRS computes your gain as 100% of proceeds — which for anyone who bought and held overstates the gain by the entire purchase price. The reconciliation report exists to catch mismatches before the IRS's automated matching does.

**Missing basis is flagged, never defaulted to zero.** Zero basis is a real answer with real consequences and should never appear by accident.

Full rules and citations: [us-tax-reporting.md](../04-reference/us-tax-reporting.md).

---

## 4. Set your currency

Settings → Base currency.

Crypto-to-fiat comes free — CoinGecko returns prices in ~60 currencies directly. Fiat-to-fiat uses Frankfurter, which is free, keyless, and sourced from ECB reference rates.

**Every transaction stores the currency it was actually transacted in.** Conversion happens at display time, so changing your reporting currency never rewrites history or corrupts cost basis. Historical FX uses the transaction's date, not today's rate.

---

## 5. Historical price backfill

Entering years of transactions is tedious if you look up every price by hand.

| Mode | Behaviour |
|---|---|
| **Manual** *(default)* | You type the price. Nothing queried. Zero leakage |
| Ask each time | Offers to look it up, showing what it will send |
| Auto | Backfills on entry while online |

Manual entry always works and always overrides a fetched value. Each transaction is marked `manual` or `fetched` so you can see where every figure came from.

**The privacy cost:** a backfill query tells an API the date and asset of a transaction you made. Individually trivial; across a full history it sketches your trading activity. Hence manual as the default.

---

## 6. Balance lookups — read this first

Querying an address tells the API operator that **your IP address is interested in that address**. Permanently, in their logs. For Bitcoin this is a real deanonymization vector.

So: **balance/history lookup is opt-in per address, never automatic, with no background balance sync and default off.** The separate content-free reachability monitor does not include an address, asset, balance, Vault ID/name, or user input. Before the first balance lookup the app shows exactly what it will send and to whom.

**Mitigations, best first:**

1. **Your own node.** Settings → Endpoints → point at `localhost`. Complete solution.
2. **Tor Browser.** Hides your IP; the query still reveals interest.
3. **VPN.** You've moved trust, not removed it.
4. **Query selectively.** Check a few addresses rather than sweeping everything.

**xpub scanning** derives addresses locally in the cold realm and sends only the resulting addresses — your xpub never leaves the device. Handing an xpub to an API hands over your entire transaction history forever, and most wallet software does exactly that.

---

## 7. Prices

Five sources: CoinGecko, Coinbase, Kraken, CoinPaprika, DIA.

Reported as a **median**, not an average — one stale feed skews a mean badly. Every source is shown individually with its age, along with the spread. Divergence above 1% raises a flag rather than being quietly averaged away.

CoinMarketCap can't be included: no CORS headers for browser calls, and their own docs note an embedded key is stealable. It would need a proxy server.

Offline, cached prices show with visible age.

---

## Metrics

Per asset, wallet, chain, tag, and total:

- Quantity, average cost, total cost basis
- Market value with price age
- Unrealized PnL, currency and percent
- Realized PnL by period, **with the matched lots shown** so you can see why a number is what it is
- ROI, total invested, total withdrawn, net flow
- Holding period per lot, flagged short vs long term at one year
- Fees by venue
- Allocation and concentration warnings
- Value over time (online; needs historical prices)

Hidden items are excluded from totals **and** rows, so the visible view is always internally consistent.

---

## Not tax advice

The app computes cost basis and realized gains using standard methods. It doesn't know your jurisdiction, doesn't model local rules, doesn't produce forms, and isn't a substitute for a professional.

What it does give you is **clean records with dates, amounts, currencies, and matched lots** — which is what makes an accountant's job cheap rather than expensive.

Export realized gains as CSV from Portfolio → Reports.

---

## Related

- [API sources](../04-reference/api-sources.md) — every endpoint and what it learns
- [ADR-0004](../05-development/adr/0004-median-not-mean-prices.md) — why median
