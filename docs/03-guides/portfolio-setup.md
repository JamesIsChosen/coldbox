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

**Transfers between your own wallets are not disposals.** Moving Bitcoin from an exchange to your Coldcard isn't a sale, produces no gain, and must preserve the original acquisition date and cost basis.

Getting this wrong silently corrupts every gain figure downstream, and it is the most common bug in portfolio software. Coldbox models transfers as movement, not disposal.

### CSV import

Portfolio → Import. Map your columns, review the dry-run preview, then commit. Duplicates are detected by txid.

Import defaults to **manual pricing** — importing 500 rows should not fire 500 dated queries at an API without you deciding to.

---

## 3. Choose a cost basis method

| Method | Effect |
|---|---|
| **FIFO** | Oldest lots sold first. Default; the assumed method in many jurisdictions |
| LIFO | Newest first |
| HIFO | Highest cost first — usually minimises reported gains |
| Average cost | Blended. Required in some jurisdictions |
| Specific ID | You choose per disposal. Most control, most work |

Set globally with per-transaction overrides. **Changing the method recomputes everything and shows the delta**, so you can see what the choice costs before committing.

Your jurisdiction may mandate a method or require consistency once chosen. Ask an accountant.

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

So: **opt-in per address, never automatic, no background sync, default off.** Before the first lookup the app shows exactly what it will send and to whom.

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
