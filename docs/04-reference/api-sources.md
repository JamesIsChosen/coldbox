# API sources

Every external endpoint the app can contact. This list *is* the `connect-src` allowlist — the complete set of hosts reachable from the warm shell, pinned at build time and displayed in-app under Reference → Provenance.

**The cold realm contacts nothing.** `connect-src 'none'`. Nothing below applies to it.

---

## Price sources

| Source | Key | Endpoint | Notes |
|---|---|---|---|
| CoinGecko | Free Demo key | `api.coingecko.com` | Broadest coverage. ~30 calls/min, 10k/month. Native `vs_currency` for ~60 fiats |
| Coinbase | None | `api.coinbase.com` | `/v2/prices/{pair}/spot`. CORS-enabled |
| Kraken | None | `api.kraken.com` | `/0/public/Ticker` |
| CoinPaprika | None | `api.coinpaprika.com` | Broad, keyless |
| DIA | None | `api.diadata.org` | 3,000+ tokens, no registration |

Aggregated by **median**, with every source shown individually plus spread and staleness. See [ADR-0004](../05-development/adr/0004-median-not-mean-prices.md).

### CoinMarketCap — cannot be included

Their API sends no CORS headers for browser requests, and CMC's own documentation notes that a key embedded in a browser application is stealable by anyone opening developer tools.

Including it would require a proxy server, which breaks the no-server axiom and would create a party who sees every query. Stated here because users reasonably ask.

---

## Foreign exchange

| Source | Key | Endpoint | Notes |
|---|---|---|---|
| Frankfurter | None | `api.frankfurter.app` | ECB reference rates, ~30 currencies, historical by date, open source, **self-hostable** |

Crypto-to-fiat needs no FX hop — CoinGecko returns prices directly in ~60 currencies. Frankfurter covers fiat-to-fiat, needed when you bought in one currency and report in another.

Rates are ECB reference rates, published once daily. Not suitable for intraday precision, entirely suitable for cost basis.

---

## Balance lookups

| Chain | Source | Key | Notes |
|---|---|---|---|
| Bitcoin | `mempool.space` | None | Esplora API, address and xpub |
| Bitcoin | `blockstream.info` | None | Esplora, fallback |
| EVM | `eth.llamarpc.com`, `rpc.ankr.com` | None | `eth_getBalance`, native only |
| Solana | `api.mainnet-beta.solana.com` | None | `getBalance`, rate-limited |
| Cosmos | `lcd.osmosis.zone` | None | LCD REST |

**Token balances are not supported in v1.** They require per-chain indexers, which means more third parties and more complexity. Tokens are manual entries.

### Self-hosted

`http://localhost:*`, `https://localhost:*`, and `http://127.0.0.1:*` are allowlisted so you can point the app at your own node. This is the only way to look up balances without revealing them to a third party.

Any other self-hosted endpoint requires editing the clearly-marked CSP line in the HTML, which changes the file hash — so you'd verify against your own build. A wildcard `connect-src` would let injected code contact anything, which is exactly what the allowlist prevents.

---

## Privacy — what each query reveals

This deserves a plain statement rather than a footnote.

| Query | What the operator learns |
|---|---|
| Price of BTC | You're interested in BTC. Minimal |
| Balance of address X | **Your IP address is interested in address X.** Permanently, in their logs |
| Balance of an xpub's addresses | The full address set — effectively your whole wallet |
| Historical price on date D | You transacted in that asset around that date |

The second and third are real deanonymization vectors for Bitcoin. Someone correlating IP addresses to on-chain addresses can build a map of who owns what.

**Mitigations, in order of effectiveness:**

1. **Run your own node.** The `localhost` entries exist for this. Complete solution.
2. **Use Tor Browser.** Hides your IP; the query content still reveals interest.
3. **VPN.** Weaker — you've moved trust rather than removed it.
4. **Query selectively.** Which is the default.

**Design decisions that follow:**

- Balance lookup is **opt-in per address**, never automatic.
- There is **no background sync**.
- The default is **off**.
- Before the first lookup, the app shows exactly what it will send and to whom.
- **xpub scanning derives addresses locally** in the cold realm and sends only the resulting addresses. The xpub itself never leaves the device — handing an xpub to an API hands over your entire transaction history forever, and most wallet software gets this wrong.
- Historical price backfill defaults to **manual entry**, so importing 500 transactions doesn't fire 500 dated queries.

---

## Implementation constraints

**CSP re-checks after redirects.** A host that 302s elsewhere gets blocked at the redirect target even if the original is allowlisted. `rest.cosmos.directory` does this. **Every endpoint must be a concrete host**, resolved at build time.

**Timeouts and failures.** Parallel queries with timeouts; failures marked unavailable rather than retried aggressively. Rate limits respected with backoff. Aggressive caching — this is a portfolio tracker, not a trading terminal.

**Cold Mode.** Cached prices are shown with visible age. No silent staleness.

---

## Adding a source

Requires all of:

1. **CORS support** for browser requests, verified — not assumed.
2. **No API key**, or a free key the user supplies themselves. Never an embedded key.
3. **No redirects** off the allowlist.
4. Documented here, including what it learns about the user.
5. Added to the CSP allowlist and the in-app provenance panel.
6. Justified in the PR.

Every added host is a new party who learns something. The bar is deliberately high.
